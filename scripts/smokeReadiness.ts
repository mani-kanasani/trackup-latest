// The install preflight.
//
//   npm run readiness:test
//
// The point of this one is that the checks make CLAIMS about the repository:
// that `jobs.applied_at` comes from `20260828120000_activity_timestamps.sql`,
// that `industry_evidence` is created by the vertical-briefs migration. Those
// claims are what a member is told to act on, and nothing else would notice if
// one drifted — a renamed file or a column moved between migrations would leave
// the preflight confidently naming a file that does not add the thing it says.
//
// So every mapping is verified against the SQL on disk rather than reviewed.
//
// The other half is the 401. Every function answers an unauthenticated call
// itself, which is HEALTHY; the platform answers one too, in its own shape, when
// "Verify JWT" is left on, which is the most common way an install fails. The
// two look identical from the status code alone.

import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { REQUIRED_TABLES, REQUIRED_COLUMNS, REQUIRED_FUNCTIONS, rejectedByPlatform, isReady } from '../src/lib/readiness';

let failures = 0;
const check = (name: string, cond: boolean, detail = '') => {
  console.log(`${cond ? 'ok  ' : 'FAIL'}  ${name}${detail ? `  ${detail}` : ''}`);
  if (!cond) failures++;
};

const DIR = join(process.cwd(), 'supabase', 'migrations');
const files = readdirSync(DIR).filter((f) => f.endsWith('.sql')).sort();
const sqlOf = (name: string) => readFileSync(join(DIR, name), 'utf8');

check('the migrations directory is where the checks think it is', files.length > 0, `${files.length} files`);

/* ---- every named file exists ---------------------------------------------- */

const named = new Set([
  ...REQUIRED_TABLES.map((t) => t.migration),
  ...REQUIRED_COLUMNS.map((c) => c.migration),
]);
for (const name of named) {
  check(`${name} exists`, files.includes(name));
}

/* ---- and actually contains what it is credited with ----------------------- */

for (const { table, migration } of REQUIRED_TABLES) {
  const sql = sqlOf(migration);
  const creates = new RegExp(`CREATE TABLE (IF NOT EXISTS )?(public\\.)?${table}\\b`, 'i').test(sql);
  check(`${migration} really creates ${table}`, creates);
}

for (const { table, column, migration } of REQUIRED_COLUMNS) {
  const sql = sqlOf(migration);
  // Either added to an existing table, or declared in the CREATE TABLE that
  // this same migration introduces.
  const added = new RegExp(`ADD COLUMN (IF NOT EXISTS )?${column}\\b`, 'i').test(sql);
  const declared = new RegExp(`^\\s+${column}\\s+\\w`, 'im').test(sql);
  check(`${migration} really provides ${table}.${column}`, added || declared);
}

/* ---- the earliest file that could provide it ------------------------------ */
//
// Several columns appear in more than one migration, because a later CREATE
// TABLE declares a column of the same name on a different table. The check must
// name the file that introduces it, not a later one that happens to mention it,
// or a member is sent to run a migration that does nothing for their problem.

for (const { column, migration } of REQUIRED_COLUMNS) {
  const earlier = files.filter(
    (f) => f < migration && new RegExp(`ADD COLUMN (IF NOT EXISTS )?${column}\\b`, 'i').test(sqlOf(f)),
  );
  check(`nothing before ${migration} already added ${column}`, earlier.length === 0, earlier.join(', '));
}

/* ---- every migration is safe to re-run ------------------------------------ */
//
// The fix text tells members these files are idempotent and that re-running an
// applied one is harmless. That is a promise made to somebody who has just been
// told to paste SQL into a production database, so it is checked rather than
// asserted.
//
// There are two legitimate ways to guard a statement here and the first version
// of this check only knew one of them, so it failed a migration that is
// perfectly idempotent. `IF NOT EXISTS` is the terse form; a `DO $$` block that
// interrogates `information_schema` first is the older one, and is what an enum
// column needs. A check that only recognises the style you happened to write is
// a check that gets deleted the first time it cries wolf.

interface Block { start: number; end: number; text: string }

const doBlocks = (sql: string): Block[] => {
  const out: Block[] = [];
  const re = /DO \$\$[\s\S]*?END \$\$;/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(sql)) !== null) out.push({ start: m.index, end: m.index + m[0].length, text: m[0] });
  return out;
};

/** Every occurrence of `statement` sits inside a DO block that first checks `guard`. */
const allGuarded = (sql: string, statement: RegExp, guard: RegExp): string[] => {
  const blocks = doBlocks(sql);
  const unguarded: string[] = [];
  const re = new RegExp(statement.source, `${statement.flags.replace(/g/g, '')}g`);
  let m: RegExpExecArray | null;
  while ((m = re.exec(sql)) !== null) {
    const at = m.index;
    const enclosing = blocks.find((b) => at >= b.start && at < b.end);
    if (!enclosing || !guard.test(enclosing.text)) unguarded.push(m[0].trim());
  }
  return unguarded;
};

for (const name of files) {
  const sql = sqlOf(name);
  const problems = [
    ...allGuarded(sql, /CREATE TABLE (?!IF NOT EXISTS)\S*/i, /information_schema/i),
    ...allGuarded(sql, /ADD COLUMN (?!IF NOT EXISTS)\S*/i, /information_schema/i),
    ...allGuarded(sql, /CREATE TYPE \S*/i, /duplicate_object|IF NOT EXISTS/i),
  ];
  check(`${name} can be run twice`, problems.length === 0, problems.join(' | '));
}

/* ---- and the guard above can actually fail -------------------------------- */
//
// Every migration passing is only good news if a bad one would not. A check
// that cannot fail reads exactly like a check that passed, which is how a dead
// regex once drove a false-positive count to zero and looked like success.

const BAD = [
  'CREATE TABLE widgets (id uuid);',
  'ALTER TABLE jobs ADD COLUMN sneaky text;',
  "CREATE TYPE mood AS ENUM ('ok');",
].join('\n');

check(
  'an unguarded CREATE TABLE is caught',
  allGuarded(BAD, /CREATE TABLE (?!IF NOT EXISTS)\S*/i, /information_schema/i).length === 1,
);
check(
  'an unguarded ADD COLUMN is caught',
  allGuarded(BAD, /ADD COLUMN (?!IF NOT EXISTS)\S*/i, /information_schema/i).length === 1,
);
check(
  'an unguarded CREATE TYPE is caught',
  allGuarded(BAD, /CREATE TYPE \S*/i, /duplicate_object|IF NOT EXISTS/i).length === 1,
);

// And the two legitimate idioms are both recognised, which is the mistake the
// first version of this check made.
const TERSE = "ALTER TABLE jobs ADD COLUMN IF NOT EXISTS fine text;";
check(
  'IF NOT EXISTS counts as guarded',
  allGuarded(TERSE, /ADD COLUMN (?!IF NOT EXISTS)\S*/i, /information_schema/i).length === 0,
);
const BLOCK = [
  'DO $$',
  'BEGIN',
  '  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE column_name = \'fine\') THEN',
  '    ALTER TABLE jobs ADD COLUMN fine text;',
  '  END IF;',
  'END $$;',
].join('\n');
check(
  'an information_schema guard counts too',
  allGuarded(BLOCK, /ADD COLUMN (?!IF NOT EXISTS)\S*/i, /information_schema/i).length === 0,
);

/* ---- our 401 versus the platform's ---------------------------------------- */

check(
  'our own rejection is not read as a platform block',
  !rejectedByPlatform({ error: 'Sign in before generating outreach.' }),
);
check(
  'the same for every other function',
  [
    'Sign in before generating a proposal.',
    'Sign in to list models.',
    'Sign in to build a brief.',
  ].every((m) => !rejectedByPlatform({ error: m })),
);
check("a missing authorization header IS the platform", rejectedByPlatform({ code: 401, message: 'Missing authorization header' }));
check('so is an invalid JWT', rejectedByPlatform({ msg: 'Invalid JWT' }));
check('and a bare code', rejectedByPlatform({ code: 401 }));
check('an empty body claims nothing', !rejectedByPlatform(null) && !rejectedByPlatform(undefined));
check('nor does a string body', !rejectedByPlatform('unauthorized'));
check('an error field wins even beside a message', !rejectedByPlatform({ error: 'Sign in.', message: 'x' }));

/* ---- there are four functions, and the wizard says four ------------------- */

check('four functions are required', REQUIRED_FUNCTIONS.length === 4, `${REQUIRED_FUNCTIONS.length}`);
const wizard = readFileSync(join(process.cwd(), 'src', 'components', 'Setup', 'SupabaseSetup.tsx'), 'utf8');
for (const fn of REQUIRED_FUNCTIONS) {
  check(`the wizard hands over ${fn}`, wizard.includes(fn));
}

/* ---- readiness is all-or-nothing ------------------------------------------ */

const okCheck = (id: string) => ({ id, label: id, status: 'ok' as const, detail: '' });
check('all green is ready', isReady([okCheck('a'), okCheck('b')]));
check('a warn is not ready', !isReady([okCheck('a'), { id: 'b', label: 'b', status: 'warn', detail: '' }]));
check('a fail is not ready', !isReady([okCheck('a'), { id: 'b', label: 'b', status: 'fail', detail: '' }]));
check('nothing checked is not ready', !isReady([]));

console.log(failures ? `\n${failures} FAILURES\n` : '\nall checks passed\n');
process.exit(failures ? 1 : 0);
