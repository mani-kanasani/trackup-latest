// localStorage keys are part of the product's contract with an existing user.
//
// The app was called TrackUp before it became Ember, so two keys shipped under a
// `trackup.` namespace. Renaming them without a migration would silently log
// people out of their Supabase project and wipe the AI key they pasted in, which
// is the worst possible upgrade experience for a bring-your-own-key app.

/**
 * Reads `key`, falling back to `legacyKey` and moving the value across on first
 * read. Safe in private mode and over quota, where writes throw.
 */
export const readMigrating = (key: string, legacyKey: string): string | null => {
  try {
    const current = localStorage.getItem(key);
    if (current !== null) return current;

    const legacy = localStorage.getItem(legacyKey);
    if (legacy === null) return null;

    try {
      localStorage.setItem(key, legacy);
      localStorage.removeItem(legacyKey);
    } catch {
      // Migration is best-effort. Returning the legacy value still works.
    }
    return legacy;
  } catch {
    return null;
  }
};
