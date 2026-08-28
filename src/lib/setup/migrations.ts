// The migrations, as data, so a failing check can hand over the exact one.
//
// The wizard used to concatenate all eighteen into a single block and, when
// anything was missing, tell the member to "re-run every migration in order and
// read the result of each one". That is a correct instruction and a useless one:
// somebody who has never opened Supabase cannot tell which of eighteen SQL
// blocks corresponds to the column named in the error, so the honest response is
// to paste the lot again and hope.
//
// Naming the file that provides the missing thing turns that into one copy and
// one Run.

const modules = import.meta.glob('../../../supabase/migrations/*.sql', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

export interface Migration {
  /** The bare filename, which is what the checks refer to. */
  name: string;
  sql: string;
}

/**
 * In filename order, which is the order they must run in.
 *
 * The timestamps are the ordering, and sorting the full paths sorts the
 * filenames because the directory prefix is identical for all of them.
 */
export const MIGRATIONS: Migration[] = Object.keys(modules)
  .sort()
  .map((path) => ({ name: path.split('/').pop() ?? path, sql: modules[path] }));

/** Everything, for the first install where nothing has run yet. */
export const ALL_SQL = MIGRATIONS.map((m) => m.sql).join('\n\n');

export const migrationByName = (name: string): Migration | undefined =>
  MIGRATIONS.find((m) => m.name === name);

/**
 * The named migrations, in run order, deduplicated.
 *
 * A failing check names a set of files and several columns often come from one
 * of them; running it twice is harmless but reading it twice is confusing.
 */
export const migrationsNamed = (names: string[]): Migration[] =>
  MIGRATIONS.filter((m) => names.includes(m.name));
