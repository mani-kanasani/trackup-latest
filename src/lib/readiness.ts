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
}

/** Created by the migrations, in the order a person would notice them missing. */
const REQUIRED_TABLES = [
  'users', 'jobs', 'leads', 'case_studies', 'prospects',
  'vertical_briefs', 'industry_evidence',
] as const;

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
const REQUIRED_COLUMNS: { table: string; column: string; feature: string }[] = [
  { table: 'leads', column: 'qualification', feature: 'the qualification screen' },
  { table: 'leads', column: 'status_changed_at', feature: 'cadence timing' },
  { table: 'jobs', column: 'proposal_path', feature: 'reopening proposal PDFs after their link expires' },
  { table: 'leads', column: 'generation_meta', feature: 'knowing which proof and tier produced a message' },
  { table: 'leads', column: 'deal_value', feature: 'closing a lead and reporting a rate' },
  { table: 'prospects', column: 'opted_out', feature: 'honouring cold email opt-outs' },
  // NOT NULL in the schema, which is what stops a borrowed figure being stored
  // with nobody to attribute it to. Worth naming: without it the attribution
  // check has nothing to enforce against and copy passes clean while uncited.
  { table: 'industry_evidence', column: 'source_name', feature: 'the borrowed-figure attribution check' },
];

/** Deployed by `npm run setup`, or pasted from the wizard. */
const REQUIRED_FUNCTIONS = [
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

  for (const table of REQUIRED_TABLES) {
    try {
      const res = await withTimeout(
        `${base(config)}/rest/v1/${table}?select=*&limit=0`,
        { headers: { apikey: config.anonKey.trim() } },
      );
      // PostgREST answers 404 (PGRST205) when the relation does not exist, and
      // 401/403 when it exists but the anon role cannot touch it.
      if (res.status === 404) missing.push(table);
      else if (res.status === 401 || res.status === 403) blocked.push(table);
    } catch {
      missing.push(table);
    }
  }

  if (missing.length) {
    return {
      id: 'tables',
      label: 'Database tables',
      status: 'fail',
      detail: `${missing.length} of ${REQUIRED_TABLES.length} missing: ${missing.join(', ')}.`,
      fix: 'The SQL has not run, or ran only partly. Re-run every migration below in the SQL editor, in filename order, and read the result of each one before moving on.',
    };
  }
  if (blocked.length) {
    return {
      id: 'tables',
      label: 'Database tables',
      status: 'fail',
      detail: `Present but not readable: ${blocked.join(', ')}.`,
      fix: 'The tables exist but their row-level security policies did not apply. Re-run the migrations that create the policies, the CREATE POLICY statements are idempotent.',
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

  for (const { table, column, feature } of REQUIRED_COLUMNS) {
    try {
      const res = await withTimeout(
        `${base(config)}/rest/v1/${table}?select=${column}&limit=0`,
        { headers: { apikey: config.anonKey.trim() } },
      );
      if (res.status === 400) stale.push(`${table}.${column} (${feature})`);
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
      detail: `${stale.length} later migration${stale.length === 1 ? '' : 's'} not applied: ${stale.join('; ')}.`,
      fix: 'The tables exist but the newer migrations did not run. Work through the SQL below from the top, every migration is idempotent, so re-running the ones that already applied is harmless.',
    };
  }
  return { id: 'columns', label: 'Schema up to date', status: 'ok', detail: 'All migrations applied.' };
};

/**
 * Is each function deployed?
 *
 * Deployment is the only question here, and ANY HTTP response answers it. The
 * functions now require a signed-in user, and this runs before anyone has
 * signed in, so a 401 is the expected healthy answer — it proves the function
 * ran far enough to reject the caller. Only a transport failure means the
 * function is not there.
 */
const checkFunctions = async (config: SupabaseConfig): Promise<Check> => {
  const missing: string[] = [];

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
      if (res.status === 404) missing.push(name);
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
      fix: 'Deploy them with `npm run setup`, which handles this for you, or paste each source below into a new function in the dashboard. If you paste them by hand you MUST then turn OFF "Verify JWT" in every function, or Supabase rejects each call before the function runs.',
    };
  }
  return {
    id: 'functions',
    label: 'Edge functions',
    status: 'ok',
    detail: `All ${REQUIRED_FUNCTIONS.length} deployed and responding.`,
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
