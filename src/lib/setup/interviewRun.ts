// Whether the proof interview has been through to the end.
//
// Held locally, like everything else about this member's setup. It exists for
// one reason: so the completeness meter can stop asking. Someone who answered no
// to all seven questions has given their answer, and a suggestion that reappears
// on every visit is the nag this whole feature is meant to remove.
//
// Deliberately not a database column. It is a fact about a person's use of one
// screen, not about their pipeline, and it is not worth a migration or a row.

const KEY = 'ember.proofInterviewDone';

export const loadInterviewDone = (): boolean => {
  try {
    return localStorage.getItem(KEY) === '1';
  } catch {
    // Private mode. Showing the suggestion again is the safe failure: it is a
    // suggestion, and the alternative is hiding it from someone who never ran it.
    return false;
  }
};

export const markInterviewDone = (): void => {
  try {
    localStorage.setItem(KEY, '1');
  } catch {
    /* Best effort. */
  }
};
