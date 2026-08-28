// Does this Supabase project actually have Ember installed in it?
//
// The old check fetched `/auth/v1/settings` and called it connected. That
// endpoint is served by the platform and answers 200 on a project where no SQL
// has ever run and no function has ever been deployed — so it proved the URL and
// key were real and nothing else.
//
// What that cost: a half-finished install looked like a finished one. Signup
// appeared to work, the app opened on an empty dashboard, and the first honest
// signal was a raw Postgres error inside a modal several screens later. Someone
// installing this on their own project has no way to tell a missing table from a
// bad paste from an RLS problem.
//
// So each check here answers a question the installer can act on, and every
// failure carries the specific fix rather than a status code.

import type { SupabaseConfig } from './supabaseConfig';

export type CheckStatus = 'ok' | 'fail' | 'warn';

export interface Check {
  id: string;
  label: string;
  status: CheckStatus;
  /** What was actually observed. */
  detail: string;
  /** What to do about it. Present whenever status is not ok. */
  fix?: string;
  /**
   * The migration files that would fix this, in run order.
   *
   * The difference between "re-run the SQL" and one file to copy. Somebody
   * who has never opened Supabase cannot map a column name onto one of
   * eighteen blocks, so the check does that mapping instead of describing it.
   */
  migrations?: string[];
  /** The functions that need redeploying, or their setting changing. */
  functions?: string[];
}

/**
 * Created by the migrations, in the order a person would notice them missing.
 *
 * Each carries the file that creates it, so a missing table names one file to
 * run rather than a directory to work through.
 */
export const REQUIRED_TABLES: { table: string; migration: string }[] = [
  { table: 'users', migration: '20251007175759_create_initial_schema.sql' },
  { table: 'jobs', migration: '20251007175759_create_initial_schema.sql' },
  { table: 'leads', migration: '20260605000000_create_leads.sql' },
  { table: 'case_studies', migration: '20260813130000_create_case_studies.sql' },
  { table: 'prospects', migration: '20260814180000_create_prospects.sql' },
  { table: 'vertical_briefs', migration: '20260818120000_create_vertical_briefs.sql' },
  { table: 'industry_evidence', migration: '20260818120000_create_vertical_briefs.sql' },
];

/**
 * One column from each of the later migrations.
 *
 * Checking only that the tables exist would pass an install that ran the first
 * few migrations and stopped — which is the most likely partial failure, because
 * they are pasted in order and a person stops at the first one that errors. The
 * tables would all be there and three features would be quietly missing.
 *
 * PostgREST answers 400 for a column that does not exist, which is distinct from
 * the 404 it gives for a missing table.
 */
export const REQUIRED_COLUMNS: { table: string; column: string; feature: string; migration: string }[] = [
  { table: 'leads', column: 'qualification', feature: 'the qualification screen', migration: '20260814120000_add_lead_qualification.sql' },
  { table: 'leads', column: 'status_changed_at', feature: 'cadence timing', migration: '20260814130000_sent_steps_timestamps.sql' },
  { table: 'jobs', column: 'proposal_path', feature: 'reopening proposal PDFs after their link expires', migration: '20260814140000_store_proposal_path.sql' },
  { table: 'leads', column: 'generation_meta', feature: 'knowing which proof and tier produced a message', migration: '20260814160000_generation_meta.sql' },
  { table: 'leads', column: 'deal_value', feature: 'closing a lead and reporting a rate', migration: '20260814150000_terminal_lead_states.sql' },
  { table: 'prospects', column: 'opted_out', feature: 'honouring cold email opt-outs', migration: '20260814180000_create_prospects.sql' },
  // NOT NULL in the schema, which is what stops a borrowed figure being stored
  // with nobody to attribute it to. Worth naming: without it the attribution
  // check has nothing to enforce against and copy passes clean while uncited.
  { table: 'industry_evidence', column: 'source_name', feature: 'the borrowed-figure attribution check', migration: '20260818120000_create_vertical_briefs.sql' },
  /*
    The receipt's numbers, and the reason an EXISTING install has to re-run the
    SQL rather than assume it is finished.

    Without applied_at the Upwork count is silently zero on every receipt: the
    query succeeds, the column is absent, and the member files a day that says
    they sent nothing on a channel they worked all morning. A wrong number that
    looks right is worse than a missing screen, so this is checked rather than
    left to be discovered.
  */
  { table: 'jobs', column: 'applied_at', feature: "the daily receipt's Upwork count", migration: '20260828120000_activity_timestamps.sql' },
  { table: 'leads', column: 'replied_at', feature: 'reply dates that survive a later status change', migration: '20260828120000_activity_timestamps.sql' },
  { table: 'prospects', column: 'call_booked_at', feature: 'call dates on the daily receipt', migration: '20260828120000_activity_timestamps.sql' },
];

/** Deployed by `npm run setup`, or pasted from the wizard. */
export const REQUIRED_FUNCTIONS = [
  'generate-proposal', 'generate-outreach', 'list-models', 'extract-brief',
] as const;

const TIMEOUT_MS = 12_000;

const withTimeout = async (input: string, init: RequestInit): Promise<Response> => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
};

const base = (config: SupabaseConfig) => config.url.trim().replace(/\/+$/, '');

const checkConnection = async (config: SupabaseConfig): Promise<Check> => {
  try {
    const res = await withTimeout(`${base(config)}/auth/v1/settings`, {
      headers: { apikey: config.anonKey.trim() },
    });
    if (res.ok) return { id: 'connection', label: 'Project reachable', status: 'ok', detail: 'Connected.' };
    if (res.status === 401) {
      return {
        id: 'connection',
        label: 'Project reachable',
        status: 'fail',
        detail: 'The project answered, but rejected that key.',
        fix: 'Copy the publishable key from Project Settings → API Keys. It is not the service_role key, and not the JWT secret.',
      };
    }
    return {
      id: 'connection',
      label: 'Project reachable',
      status: 'fail',
      detail: `The project answered with status ${res.status}.`,
      fix: 'Check the project URL. It should look like https://abcdefgh.supabase.co with no trailing path.',
    };
  } catch {
    return {
      id: 'connection',
      label: 'Project reachable',
      status: 'fail',
      detail: 'Could not reach that URL at all.',
      fix: 'Check the URL for typos, and that the project has finished provisioning and is not paused.',
    };
  }
};

/**
 * Reads zero rows from a table.
 *
 * `limit=0` is deliberate: it distinguishes "the table is not there" from "the
 * table is there and empty", which is the whole question, without reading any of
 * the installer's data.
 */
const checkTables = async (config: SupabaseConfig): Promise<Check> => {
  const missing: string[] = [];
  const blocked: string[] = [];
  const files = new Set<string>();

  for (const { table, migration } of REQUIRED_TABLES) {
    try {
      const res = await withTimeout(
        `${base(config)}/rest/v1/${table}?select=*&limit=0`,
        { headers: { apikey: config.anonKey.trim() } },
      );
      // PostgREST answers 404 (PGRST205) when the relation does not exist, and
      // 401/403 when it exists but the anon role cannot touch it.
      if (res.status === 404) { missing.push(table); files.add(migration); }
      else if (res.status === 401 || res.status === 403) { blocked.push(table); files.add(migration); }
    } catch {
      missing.push(table);
      files.add(migration);
    }
  }

  if (missing.length) {
    return {
      id: 'tables',
      label: 'Database tables',
      status: 'fail',
      detail: `${missing.length} of ${REQUIRED_TABLES.length} missing: ${missing.join(', ')}.`,
      fix:
        files.size === 1
          ? 'One file creates all of these. Copy it below, paste it into the SQL editor and press Run.'
          : 'Copy each file below into the SQL editor in the order shown and press Run on each. They are idempotent, so anything already applied is harmless to run again.',
      migrations: [...files],
    };
  }
  if (blocked.length) {
    return {
      id: 'tables',
      label: 'Database tables',
      status: 'fail',
      detail: `Present but not readable: ${blocked.join(', ')}.`,
      fix: 'The tables exist but their row-level security policies did not apply. Re-run the files below, the policy statements in them are idempotent.',
      migrations: [...files],
    };
  }
  return {
    id: 'tables',
    label: 'Database tables',
    status: 'ok',
    detail: `All ${REQUIRED_TABLES.length} present and readable.`,
  };
};

/** Are the LATER migrations applied, not just the first few? */
const checkColumns = async (config: SupabaseConfig): Promise<Check> => {
  const stale: string[] = [];
  const files = new Set<string>();

  for (const { table, column, feature, migration } of REQUIRED_COLUMNS) {
    try {
      const res = await withTimeout(
        `${base(config)}/rest/v1/${table}?select=${column}&limit=0`,
        { headers: { apikey: config.anonKey.trim() } },
      );
      if (res.status === 400) {
        stale.push(`${table}.${column} (${feature})`);
        files.add(migration);
      }
    } catch {
      // A transport failure here is not evidence about the schema. The table
      // check has already established the project answers, so stay quiet rather
      // than reporting a migration as missing on the strength of a dropped
      // connection.
    }
  }

  if (stale.length) {
    return {
      id: 'columns',
      label: 'Schema up to date',
      status: 'fail',
      detail: `${stale.length} column${stale.length === 1 ? '' : 's'} missing: ${stale.join('; ')}.`,
      fix:
        files.size === 1
          ? 'One migration adds all of these and it has not run. Copy it below and press Run in the SQL editor.'
          : `${files.size} migrations have not run. Copy each below in the order shown and press Run. They are idempotent.`,
      migrations: [...files],
    };
  }
  return { id: 'columns', label: 'Schema up to date', status: 'ok', detail: 'All migrations applied.' };
};

/**
 * Telling our own 401 from the platform's.
 *
 * Both arrive as 401 and they mean opposite things. Every function here
 * answers an unauthenticated call itself, with `{ error: "Sign in before..." }`
 * — which is the HEALTHY answer, and proves the request reached our code. When
 * "Verify JWT" is left on, the platform rejects the request before the function
 * runs and answers in its own shape: `code`/`message`/`msg`, never `error`.
 *
 * This is the single most common way an install fails, the wizard warns about
 * it twice in red, and until now the check could not see it: a 401 was counted
 * as healthy and the member was told all four functions were fine while every
 * generation failed.
 */
export const rejectedByPlatform = (body: unknown): boolean => {
  if (!body || typeof body !== 'object') return false;
  const b = body as Record<string, unknown>;
  if (typeof b.error === 'string') return false;
  return typeof b.message === 'string' || typeof b.msg === 'string' || 'code' in b;
};

/**
 * Is each function deployed, and can a request actually reach it?
 *
 * Deployment is answered by any HTTP response at all; only a transport failure
 * or a 404 means the function is not there. Reachability is a second question,
 * answered by reading the body of a 401 — see above.
 */
const checkFunctions = async (config: SupabaseConfig): Promise<Check> => {
  const missing: string[] = [];
  const gated: string[] = [];

  for (const name of REQUIRED_FUNCTIONS) {
    try {
      const res = await withTimeout(`${base(config)}/functions/v1/${name}`, {
        method: 'POST',
        headers: {
          apikey: config.anonKey.trim(),
          Authorization: `Bearer ${config.anonKey.trim()}`,
          'Content-Type': 'application/json',
        },
        body: '{}',
      });
      if (res.status === 404) {
        missing.push(name);
        continue;
      }
      if (res.status === 401) {
        const body = await res.json().catch(() => null);
        if (rejectedByPlatform(body)) gated.push(name);
      }
    } catch {
      missing.push(name);
    }
  }

  if (missing.length) {
    return {
      id: 'functions',
      label: 'Edge functions',
      status: 'fail',
      detail: `${missing.length} of ${REQUIRED_FUNCTIONS.length} not deployed: ${missing.join(', ')}.`,
      fix: 'Deploy them with `npm run setup`, which does this for you, or create each one in the dashboard and paste its source over the hello-world index.ts. Then turn OFF "Verify JWT" on each.',
      functions: missing,
    };
  }

  if (gated.length) {
    return {
      id: 'functions',
      label: 'Edge functions',
      status: 'fail',
      detail:
        `Deployed, but Supabase rejected the call before ${gated.length === 1 ? gated[0] : `${gated.length} of them`} ran: ` +
        `${gated.join(', ')}.`,
      fix:
        'That is the "Verify JWT" setting, and it is on. Open each function above, go to its settings and turn Verify JWT OFF. ' +
        'Nothing is left unprotected: each function checks the signed-in user itself, which is why this shows up as a 401 either way.',
      functions: gated,
    };
  }

  return {
    id: 'functions',
    label: 'Edge functions',
    status: 'ok',
    detail: `All ${REQUIRED_FUNCTIONS.length} deployed, and requests are reaching them.`,
  };
};

/**
 * Runs every check against the supplied credentials.
 *
 * Sequential rather than parallel: four failing probes against a wrong URL each
 * wait out the timeout, and a wall of simultaneous errors is harder to read than
 * one that stops at the first thing that is actually wrong.
 */
export const runReadinessChecks = async (config: SupabaseConfig): Promise<Check[]> => {
  const connection = await checkConnection(config);
  if (connection.status === 'fail') {
    // Nothing downstream can be judged, and reporting it as failing would be
    // guessing. Say so rather than inventing two more red rows.
    return [
      connection,
      { id: 'tables', label: 'Database tables', status: 'warn', detail: 'Not checked, no connection yet.' },
      { id: 'columns', label: 'Schema up to date', status: 'warn', detail: 'Not checked, no connection yet.' },
      { id: 'functions', label: 'Edge functions', status: 'warn', detail: 'Not checked, no connection yet.' },
    ];
  }

  const tables = await checkTables(config);
  // Asking about columns on tables that are not there would report every later
  // migration as missing, burying the one fact that matters.
  const columns =
    tables.status === 'ok'
      ? await checkColumns(config)
      : {
          id: 'columns',
          label: 'Schema up to date',
          status: 'warn' as const,
          detail: 'Not checked, the tables have to exist first.',
        };

  return [connection, tables, columns, await checkFunctions(config)];
};

export const isReady = (checks: Check[]): boolean =>
  checks.length > 0 && checks.every((c) => c.status === 'ok');

export const canConnect = (checks: Check[]): boolean =>
  checks.find((c) => c.id === 'connection')?.status === 'ok';
