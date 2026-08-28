// Starter lists: getting a member from zero prospects to a real list.
//
// A member with nothing to write to cannot hit any number, however motivated,
// and from the outside that failure is indistinguishable from laziness. This is
// the fix for it.
//
// WHAT THIS DELIBERATELY IS NOT: a bundled list of contacts.
//
// Shipping plausible-looking names, companies and email addresses into a tool
// whose whole purpose is sending messages to strangers is dangerous in a way
// that is easy to miss. Any address that looks real may belong to somebody, and
// a beginner will not check before sending. Inventing a person's employer and
// job title and then writing to them is worse than sending nothing.
//
// So each vertical ships the thing a member actually lacks, which is not names
// but knowing where to look and what to type. The template rows use example.com,
// reserved by RFC 2606 precisely so that test data can never reach a real
// inbox, and are labelled so nobody mistakes them for prospects.

export interface StarterVertical {
  id: string;
  label: string;
  /** Who is accountable for the number in this vertical. */
  buyer: string;
  /** Public places a list can be built from, named plainly. */
  sources: string[];
  /** Copy-ready search strings. The stall is not effort, it is what to type. */
  searches: string[];
  /** What to capture per row, beyond the two required fields. */
  capture: string;
  /** A true, checkable observation angle for the opener. */
  angle: string;
}

/**
 * Header row shared by every template.
 *
 * Matches IMPORT_FIELDS so guessMapping resolves it without the member having
 * to map anything by hand.
 */
export const TEMPLATE_HEADER =
  'Name,LinkedIn URL,Job title,Company,Industry,Company website,Email,Services you could offer';

/**
 * Two rows on example.com, which cannot resolve to a real mailbox.
 *
 * They exist to show the shape and to prove the importer works before a member
 * pastes fifty real rows and discovers their columns were in the wrong order.
 */
export const templateRows = (v: StarterVertical): string =>
  [
    `EXAMPLE ROW - delete me,https://www.linkedin.com/in/example-one,${v.buyer},Example ${v.label} One,${v.label},https://example.com,first@example.com,${v.angle}`,
    `EXAMPLE ROW - delete me,https://www.linkedin.com/in/example-two,${v.buyer},Example ${v.label} Two,${v.label},https://example.org,second@example.org,${v.angle}`,
  ].join('\n');

export const templateCsv = (v: StarterVertical): string =>
  `${TEMPLATE_HEADER}\n${templateRows(v)}`;

export const STARTER_VERTICALS: StarterVertical[] = [
  {
    id: 'accounting',
    label: 'Accounting and bookkeeping firms',
    buyer: 'Managing partner',
    sources: [
      'Your national or state accountancy body’s public member directory',
      'Google Maps, which lists the firm, its site and often its owner',
      'LinkedIn people search, filtered to the title and a single city',
      'Local chamber of commerce member lists',
    ],
    searches: [
      'site:linkedin.com/in "managing partner" (CPA OR "chartered accountant") "<your city>"',
      'Google Maps: accounting firm "<your city>"',
      '"bookkeeping services" "<your city>" -indeed.com -glassdoor.com',
    ],
    capture: 'Firm name, the partner’s name, the site, and one thing the site says they specialise in.',
    angle: 'What their site says they do beyond tax filing, and what that implies about their intake',
  },
  {
    id: 'legal',
    label: 'Small law firms',
    buyer: 'Managing partner',
    sources: [
      'Your bar association’s public "find a lawyer" directory',
      'Google Maps by practice area and city',
      'Avvo, Justia or the equivalent public listing where you are',
    ],
    searches: [
      'site:linkedin.com/in ("managing partner" OR "founding attorney") "<practice area>" "<your city>"',
      'Google Maps: "<practice area>" attorney "<your city>"',
      '"<practice area> lawyer" "<your city>" "free consultation"',
    ],
    capture: 'Firm, partner, practice area, and whether the site offers a free consultation.',
    angle: 'How a new enquiry reaches them after hours, which is visible from the site itself',
  },
  {
    id: 'homeservices',
    label: 'Home services (HVAC, plumbing, roofing)',
    buyer: 'Owner or operations manager',
    sources: [
      'Google Maps, which is where these businesses actually live',
      'Your national trade body’s contractor finder',
      'Local review sites and community recommendation groups',
    ],
    searches: [
      'Google Maps: HVAC contractor "<your city>"',
      'Google Maps: emergency plumber "<your city>"',
      'site:linkedin.com/in ("owner" OR "operations manager") (HVAC OR plumbing OR roofing) "<your city>"',
    ],
    capture: 'Business, owner, phone, whether they advertise 24/7, and their review count.',
    angle: 'Whether an out-of-hours call is answered by a person, a machine, or nothing at all',
  },
  {
    id: 'dental',
    label: 'Dental and medical practices',
    buyer: 'Practice owner or practice manager',
    sources: [
      'Your national dental or medical council’s public register',
      'Google Maps by suburb',
      'Insurance provider "find a provider" directories',
    ],
    searches: [
      'Google Maps: dental practice "<your city>"',
      'site:linkedin.com/in "practice manager" (dental OR dentistry) "<your city>"',
      '"<your city>" dentist "new patients"',
    ],
    capture: 'Practice, owner or manager, whether they take new patients, and how booking works.',
    angle: 'How a new patient books, and what happens to the enquiry that arrives at 9pm',
  },
  {
    id: 'ecommerce',
    label: 'Ecommerce and DTC brands',
    buyer: 'Founder or head of ecommerce',
    sources: [
      'Public Shopify and BigCommerce store directories',
      'Marketplace seller listings in your category',
      'LinkedIn people search on founder titles within a niche',
    ],
    searches: [
      'site:linkedin.com/in ("founder" OR "head of ecommerce") "<product category>"',
      '"powered by Shopify" "<product category>"',
      'site:myshopify.com "<product category>"',
    ],
    capture: 'Brand, founder, platform, and one thing about how they handle support or returns.',
    angle: 'What happens between an abandoned cart and a follow-up, which their own flow reveals',
  },
  {
    id: 'agencies',
    label: 'Agencies and professional services',
    buyer: 'Founder or managing director',
    sources: [
      'Clutch, DesignRush or an equivalent public agency directory',
      'LinkedIn company search filtered by size and location',
      'Conference and meetup sponsor lists in your city',
    ],
    searches: [
      'site:linkedin.com/in ("founder" OR "managing director") agency "<your city>"',
      'site:clutch.co "<service>" "<your city>"',
      '"<service> agency" "<your city>" -jobs -careers',
    ],
    capture: 'Agency, founder, headcount band, and the service they lead with.',
    angle: 'How they handle inbound enquiries while the team is billing on client work',
  },
];

export const findVertical = (id: string): StarterVertical | undefined =>
  STARTER_VERTICALS.find((v) => v.id === id);
