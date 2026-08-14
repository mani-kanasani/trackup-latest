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
  `This is my first project on this platform, so instead of a client list here is the thing itself: I mapped your intake flow and built the routing step. Two minutes, no commitment.

Your brief says leads sit unanswered overnight. The routing rule below fires the moment a form lands, so the 11pm ones get an answer before you open your laptop.

Tell me where the logic is wrong and I will redo it.`,
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
const hardFP = falsePositives.filter((f) => f.level === 'hard');
const softFP = falsePositives.filter((f) => f.level === 'soft');
console.log(`HARD false positives on good copy: ${hardFP.length}  (must be 0)`);
for (const f of hardFP) {
  console.log(`  BLOCKS GOOD COPY  ${f.pack}/${f.id} matched ${JSON.stringify(f.matched)} — ${f.label}`);
}
console.log(`soft nudges on good copy: ${softFP.length}  (expected; these ask a human to check something a regex cannot)`);
for (const f of softFP) {
  console.log(`  nudge  ${f.pack}/${f.id} matched ${JSON.stringify(f.matched)}`);
}


// A pattern containing a raw control character compiles happily and then never
// matches anything. That is worse than a broken pattern, because every check
// passes. `` written into a JSON string becomes a real backspace (0x08), so
// this is an easy mistake to make and an invisible one to live with.
let controlChars = 0;
for (const pack of packs) {
  for (const b of pack.banned) {
    const bad = [...b.patternSource].filter((c) => c.charCodeAt(0) < 32);
    if (bad.length) {
      controlChars++;
      console.log(
        `CONTROL CHAR  ${pack.id}/${b.id}  contains ${bad.map((c) => '0x' + c.charCodeAt(0).toString(16)).join(', ')} — did you mean \b?`,
      );
    }
  }
}
console.log(`patterns containing raw control characters: ${controlChars}`);

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

process.exit(failures > 0 || controlChars > 0 || falsePositives.some((f) => f.level === 'hard') ? 1 : 0);
