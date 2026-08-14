// Compiles every banned pattern and runs it against realistic GOOD outreach copy.
// A pattern that fires here would block a user from shipping work that is fine,
// which is worse than a pattern that occasionally misses.
//
//   node scripts/checkPatterns.mjs

import { readFileSync } from 'node:fs';

const packs = JSON.parse(readFileSync(new URL('../src/lib/method/packs.source.json', import.meta.url), 'utf8'));

// Deliberately written to obey the doctrine: specific opener, one proof, a
// one-word ask, no links, no hedging, no em dashes.
const GOOD = [
  `Sarah,

Your team page lists four estimators and no one on business development. Thirty-one years in Dayton and still owner led.

Most firms your size grow on referrals until the calendar runs out. January through April every hour belongs to client work, and the weeks left over fill with everything else.

When you want a particular kind of client, does one come along through the network, or do you go find them?

Ben`,
  `Marcus,

You added outsourced CFO work to the services list this year. That is a different business from tax.

We built a system for a firm in a similar spot that surfaced 14 funded prospects in its first two weeks, every one inside their target band.

Want me to send the list for your metro? No call, just the names.

Ben`,
  `Hi Priya, came across Latham Engineering while looking at firms growing past referrals without hiring a full time rainmaker. Curious how you win new work outside word of mouth today. Open to swap notes.`,
  `I read your brief twice. You are not asking for a scraper, you are asking for the part after the scrape: something that decides which of those rows is worth a human minute.

I built exactly that for a recruiting firm last year. It cut their list review from a full day to about ten minutes.

I have attached a two minute walkthrough of how I would approach yours. If the direction is wrong, tell me and I will redo it.`,
  `Understood, and thanks for saying so rather than leaving it. If the timing changes after busy season, I am here. Either way, good luck with the year.`,
];

let compiled = 0;
let failures = 0;
const falsePositives = [];

for (const pack of packs) {
  for (const b of pack.banned) {
    let re;
    try {
      re = new RegExp(b.patternSource, b.patternFlags || '');
      compiled++;
    } catch (err) {
      failures++;
      console.log(`COMPILE FAIL  ${pack.id}/${b.id}  ${err.message}`);
      continue;
    }
    for (const sample of GOOD) {
      const m = sample.match(re);
      if (m) {
        falsePositives.push({
          pack: pack.id,
          id: b.id,
          level: b.level,
          matched: m[0],
          label: b.label,
        });
        break;
      }
    }
  }
}

console.log(`compiled ${compiled} patterns, ${failures} compile failures`);
console.log(`false positives on good copy: ${falsePositives.length}`);
for (const f of falsePositives) {
  console.log(`  [${f.level}] ${f.pack}/${f.id} matched ${JSON.stringify(f.matched)} — ${f.label}`);
}

// Sanity check the other direction: patterns must actually catch bad copy.
const BAD = `Hi there — I hope this email finds you well. Just checking in! I'm not pitching, but our company provides innovative solutions that leverage synergies. Book a demo here: https://example.com 🚀`;
let caught = 0;
for (const pack of packs) {
  for (const b of pack.banned) {
    try {
      if (new RegExp(b.patternSource, b.patternFlags || '').test(BAD)) caught++;
    } catch {
      /* already reported */
    }
  }
}
console.log(`patterns firing on a deliberately bad sample: ${caught}`);

process.exit(failures > 0 || falsePositives.some((f) => f.level === 'hard') ? 1 : 0);
