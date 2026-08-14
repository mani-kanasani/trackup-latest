// The proof self-interview.
//
// Every method pack leans hardest on proof, and the most common reason a vault
// is empty is not that the person has no results. It is that they cannot see the
// ones they have: they live and breathe their own accomplishments daily, so
// those stop registering as accomplishments at all.
//
// An empty state saying "add a case study" does nothing about that, because the
// person reading it has already concluded they have none. Seven specific
// questions, asked one at a time, are the documented fix — most people say no to
// the first three and yes to something they had never thought to count.
//
// Nobody is meant to leave with zero. The last screen is the fallback: run the
// method in your own business and claim the measured delta.

export interface InterviewQuestion {
  id: string;
  /** Asked in the user's terms, not ours. */
  question: string;
  /** Why this one catches people out. Shown under the question. */
  because: string;
  /** Seeds the title so the add form opens with something in it. */
  titleHint: string;
  /**
   * True when the answer names an organisation, so it can seed `client_name`.
   *
   * False for the questions about your own results and your own recognition:
   * there is no client there, and putting "a newsletter I grew to 12,000
   * readers" in the client field would push it into copy as though there were.
   */
  namesAClient: boolean;
}

/**
 * Asked in this order deliberately. It widens: from work you were paid for, out
 * to who those people served, out again to results you got for yourself, and
 * finally to association and recognition that carry weight without revenue.
 */
export const INTERVIEW: InterviewQuestion[] = [
  {
    id: 'employers',
    question: 'What companies have you worked for directly, including any 9-to-5, consulting or freelance work?',
    because: 'Work you were paid for counts, whether or not it was under your own name.',
    titleHint: 'Work for',
    namesAClient: true,
  },
  {
    id: 'theirClients',
    question: 'Who did those companies serve, and what did they reliably deliver for them?',
    because: 'A result you contributed to is claimable if you say plainly what your part was.',
    titleHint: 'Delivered for',
    namesAClient: true,
  },
  {
    id: 'revenue',
    question: 'How much revenue did any of those businesses make, and if you do not know, could you find out?',
    because: 'A dollar figure outranks a percentage, and old invoices or a former colleague often have it.',
    titleHint: 'Revenue result at',
    namesAClient: true,
  },
  {
    id: 'notable',
    question: 'Have you ever advised, consulted for, or served a company or person who was doing very well?',
    because: 'Association is worth naming even with no number attached to it.',
    titleHint: 'Worked with',
    namesAClient: true,
  },
  {
    id: 'ownResults',
    question: 'What have you achieved for yourself? A business, an audience, a friend’s company you helped.',
    because: 'Your own numbers are proof. They are usually the ones people discount fastest.',
    titleHint: 'Built',
    namesAClient: false,
  },
  {
    id: 'industries',
    question: 'Have you worked in any industry, or alongside any brand or person, that people would recognise?',
    because: 'Recognition does the same job as a metric when the reader already trusts the name.',
    titleHint: 'Experience in',
    namesAClient: true,
  },
  {
    id: 'recognition',
    question: 'Any awards, recognition, publications, conferences or talks?',
    because: 'Third-party recognition is the one kind of proof you never have to argue for.',
    titleHint: 'Recognised for',
    namesAClient: false,
  },
];

/**
 * What to capture before writing anything.
 *
 * Gathering these first is what stops a case study becoming a paragraph of
 * adjectives, and each maps onto a field in the vault.
 */
export const CAPTURE_FIELDS = [
  'The company or person you worked with',
  'What you can honestly claim involvement in',
  'The result, with a number if one exists',
  'When it happened',
  'Anything that makes it land harder',
];

/**
 * The specificity hierarchy, strongest first.
 *
 * Percentages sit below dollar figures on purpose: "grew it 30%" could mean from
 * a dollar to a dollar thirty, and a reader who has been sold to before knows it.
 */
export const SPECIFICITY = [
  'A dollar figure',
  'A percentage, but only with the starting number beside it',
  'An association or a recognisable name',
  'A general claim, which is the weakest thing you can write',
];

/** Shown when someone answers no to all seven. Nobody should leave with nothing. */
export const FALLBACK = {
  heading: 'Then build the first one this month',
  body:
    'Run your own offer on your own business and measure what changes. A result you produced ' +
    'deliberately and measured honestly is a real case study, and it is the one every operator ' +
    'with no history starts from. Your first case studies do not need to be impressive. They need to exist.',
  warning:
    'Do not invent one. Fabricated claims surface eventually and cost more than having none. ' +
    'A conservative estimate you can defend is fine; a number you cannot source is not.',
};

/** Seeds the add form so the question that surfaced the memory is still visible. */
export const draftFromAnswer = (q: InterviewQuestion, answer: string): Record<string, string> => {
  const seed: Record<string, string> = {
    title: `${q.titleHint} ${answer.trim()}`.trim().slice(0, 120),
  };
  if (q.namesAClient) seed.client_name = answer.trim().slice(0, 120);
  return seed;
};
