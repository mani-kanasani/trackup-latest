// AUTO-GENERATED from packs.source.json by scripts/genPacks.mjs. Do not edit by hand.
//
// an Upwork / freelance-marketplace proposal — cover letter plus its supporting assets
//
// Every law carries the source it came from. Where a source is one operator's
// account of their own results rather than a measurement, selfReported is true
// and the UI shows it as a claim.

import type { MethodPack } from '../types';
import { UNIVERSAL_BANNED } from '../validate';

export const upworkPack: MethodPack = {
  id: "upwork",
  version: "1.1.0",
  label: "an Upwork / freelance-marketplace proposal — cover letter plus its supporting assets",

  thesis: "A marketplace proposal is a comparison document, not a pitch. The buyer has already decided the work is worth doing and has already decided a contractor is the answer — they posted the job and are now reading a stack of applications to settle one question: who do I pick? That single fact deletes most of what outreach copy normally does. There is no problem to establish, no category to explain, no permission to earn, no interruption to apologise for. What remains is differentiation under a truncated preview, against applicants who all claim the same competence, for a reader who is shortlisting rather than deliberating. This is also not a cold channel: asking for a call here is correct, where in cold email the same ask would be premature. And it is not free — every application costs connects and a hard fifteen-minute ceiling, so which jobs you decline is as much a part of the method as what you write. It also does not end when you press send: the buyer who replies is the most valuable reader you will get in this channel, and the method has to keep working after they do. What this channel is not: a place to introduce yourself, to educate the buyer about why the category matters, to advertise your tools, or to compete on price.",

  primeDirective: "The buyer is choosing between applicants, not deciding whether to act — so every sentence must do work that no other applicant's sentence is doing. When two rules here conflict, keep the one that makes the proposal harder to confuse with the rest of the stack.",

  laws: [
  {
    id: "only-job-is-standing-out",
    rule: "Write to be picked, not to be understood. Assume the reader already wants the work done and is comparing applicants; cut every line that explains why the problem matters or that a solution exists.",
    because: "Marketplace leads are the only leads that arrive problem-aware and solution-aware, so two of the three selling jobs are already done and spending words on them marks you as not understanding the room.",
    source: {
      "label": "30-Day First-Client Playbook §2 — the buying ladder",
      "claim": "The marketplace delivers only top-rung leads: problem-aware AND solution-aware, choosing a provider. That collapses marketplace strategy to one problem — standing out.",
      "selfReported": true
    },
  },
  {
    id: "first-line-names-their-job",
    rule: "Spend the first sentence on their project, in their own words. Never open with your name, your title, your years of experience, or a salutation.",
    because: "Only a short preview is visible before the fold — roughly the first 150 characters on Upwork, different elsewhere — and that preview is what decides whether the rest is read at all.",
    source: {
      "label": "30-Day First-Client Playbook §5.1 — the application artifact pair (figure as of the source's 2025-era material)",
      "claim": "CV text, only the first ~150 characters visible: confident opening naming their thing, then the recorded video link, then one heavyweight social-proof line. One marketplace's fold at one moment — verify the current preview length on whichever marketplace you are applying to.",
      "selfReported": true
    },
  },
  {
    id: "give-something-away",
    rule: "Never submit a proposal without something they keep whether or not they hire you — a recorded walkthrough, a partial build, a mapped process, a checklist.",
    because: "A giveaway is the only element in a proposal that survives losing the job, and a free or money-back component is claimed to lift reply rate by up to 10x versus none.",
    source: {
      "label": "30-Day First-Client Playbook §5.1 do-not list, with §5.5 offers",
      "claim": "Do not send an application without something you're giving away; an offer with a free or money-back component is claimed to lift reply rate up to 10x versus none. The two worked examples attached to that claim ran at ~8% and 7% reply rates, neither measured against a no-offer control.",
      "selfReported": true
    },
  },
  {
    id: "build-part-of-it-live",
    rule: "Devote the middle of the proposal to doing one specific piece of the work they described, and show it on screen — a page of copy, a mockup, a mapped flow, a cut scene, a working fragment.",
    because: "Every other applicant is describing capability; an applicant who has already started is in a different category and is no longer being compared on claims.",
    source: {
      "label": "30-Day First-Client Playbook §5.1 — the four-beat video, beat 3",
      "claim": "Solve or build part of their flow live, hyper-specifically, for a minute or two.",
      "selfReported": false
    },
  },
  {
    id: "lead-with-their-outcome",
    rule: "Name the outcome they get and the one thing that visibly changes. Mention your tools once, late, and only to satisfy a technical reader.",
    because: "The buyer wants the headache gone, not a particular pill; the architecture section persuades nobody and exists only to clear a technical reviewer.",
    source: {
      "label": "Acquisition playbook §12 / §19 — sell the outcome first",
      "claim": "Sell the outcome first, the architecture second — the observed proposal leads with productivity outcomes and reaches the technology stack several sections later; the stack section exists to satisfy the technical reviewer, not to persuade the buyer.",
      "selfReported": true
    },
  },
  {
    id: "proof-is-one-line-with-a-number",
    rule: "State proof as 'I did [accomplishment] for [company type] by [implementation]'. Reach for a dollar figure first, a percentage second, a named association third; a claim with none of the three does not go in.",
    because: "It is a preference order, not a floor — a percentage hides its base, so a dollar figure reads as a fact where 'grew it 30%' reads as evasion — but the source explicitly says not to stall on the number, and an operator whose real proof is an association still has something to say.",
    source: {
      "label": "30-Day First-Client Playbook §5.5 — case-study format and specificity hierarchy",
      "claim": "Write in the format 'I did [accomplishment] for [company type] by [implementation details]'; dollar figures > percentages > associations > vague claims. Specific results or metrics 'if possible — dollar figures best, but don't get hung up here.'",
      "selfReported": false
    },
  },
  {
    id: "nearest-proof-first",
    rule: "Lead with the case nearest their industry. If nothing is in-niche, name the closest adjacent one and add one clause saying why it transfers.",
    because: "In-niche proof is described as roughly twice as effective as out-of-niche proof, and an unexplained out-of-niche case reads as padding.",
    source: {
      "label": "Maker School M2 — specialised marketplace profile",
      "claim": "In-niche proof is described as roughly twice as effective as out-of-niche proof.",
      "selfReported": true
    },
  },
  {
    id: "never-fabricate",
    rule: "Never invent a metric. Conservative estimates grounded in real documentation are acceptable; unverifiable claims are not.",
    because: "Fabricated claims surface eventually and damage a reputation irreparably, and on a platform with public work history the surface area is larger than elsewhere.",
    source: {
      "label": "30-Day First-Client Playbook §5.5 — mine documentation for numbers",
      "claim": "Avoid fabricating claims — they tend to surface eventually and can damage your reputation irreparably. However, conservative estimates grounded in reality are acceptable.",
      "selfReported": false
    },
  },
  {
    id: "never-disqualify-yourself",
    rule: "Never volunteer inexperience, availability anxiety, or a discount. If the buyer asks directly, answer in one forward-facing line with the offer attached — then move on.",
    because: "Volunteering it hands a shortlisting reader a reason to move on and is named on the do-not list as a defect rather than as honesty; being asked is a different situation, and the same source's own application artifact names zero reviews directly and reframes that as honesty.",
    source: {
      "label": "30-Day First-Client Playbook §5.1 — do-not list and the application artifact",
      "claim": "Do not say 'I just started' / 'I'm in school' / 'I have no idea how to do this.' In the same section, the CV text names zero reviews directly and reframes them as honesty, and [EXPERIENCED VARIANT] notes exist because the beginner and proven cases diverge.",
      "selfReported": false
    },
  },
  {
    id: "price-last",
    rule: "Never state a number before the outcome, the solution and the full component inventory — setup, hosting, testing and QA, optimisation, what you need from them, documentation and training, handover, maintenance if in scope.",
    because: "A price stated cold is compared to nothing; a price stated after the outcome and the inventory is compared to both.",
    source: {
      "label": "Acquisition playbook §7.7 — never present price first (with 30-Day First-Client Playbook §5.5 — the six-section proposal order)",
      "claim": "§7.7: the order is transformation → solution and full component inventory → price; components to name before the number are setup, hosting, testing/QA, optimisation, client involvement (access, data, feedback), documentation/enablement/training, and maintenance if in scope — price stated cold is compared to nothing. §5.5 supplies the ordering: Title page, Problem, Solution, Scope of Work, Timeline, Pricing last, with the observation that newbies put price first and then try to justify it.",
      "selfReported": true
    },
  },
  {
    id: "price-from-their-arithmetic",
    rule: "Build the price from figures the buyer supplied. Where the work recurs and the post gives volumes, show (time before − time after) × frequency × their loaded hourly cost. Where it does not, price against what their current alternative costs them and say which alternative you mean.",
    because: "When the client supplies every input the conclusion is their arithmetic rather than your assertion, which is what makes the number hard to dispute later — and where the inputs do not exist, a comparison they can check beats a saving you invented.",
    source: {
      "label": "Acquisition playbook §6.1 / §6.3 — the Process Identification Worksheet",
      "claim": "Five answers — frequency, time per execution, people involved, hourly labour cost, error rate and cost — serve as the foundation of the ROI calculation; time saved = (manual − automated) × frequency, then converted to money twice.",
      "selfReported": true
    },
  },
  {
    id: "scope-not-price",
    rule: "When the budget sits under your number, remove scope or phase the project, and ask which capabilities they want dropped. Never lower the rate.",
    because: "Discounting concedes that the value figure you just walked them through was inflated; cutting scope holds value-per-dollar constant and keeps the anchor for the next phase.",
    source: {
      "label": "Practitioner objection record — scope before price",
      "claim": "'Can you do it for less?' is answered with 'Which features would you like to remove?' — nobody removes features. Never lower the price; change scope, terms or timeline, in that order.",
      "selfReported": true
    },
  },
  {
    id: "qualify-before-you-write",
    rule: "Before writing a word, check the buyer — prior hires, average rating, money actually paid out, post recency, requirements you can meet — and note the budget band and whether it can carry your number. Once replies are arriving and you want fewer, better bids, add the tighter filters: payment verified, a posted budget that can carry your price, fewer than ten applicants. If it fails, skip the job.",
    because: "Every application costs connects and the fifteen-minute ceiling, so a proposal into an unverified or already-crowded post is a paid lottery ticket; freed time is meant to go into vetting, and the tighter filters are for once you want fewer, better-qualified bids rather than for the cold start.",
    source: {
      "label": "Maker School M2 — the quota drop is a quality instruction (with 30-Day First-Client Playbook §5.1 — optional tighter filters)",
      "claim": "M2: every time an application quota falls, the attached instruction is to spend the freed time vetting — client hire history, average rating, total money paid out, post recency, requirement fit; fewer applications are expected to travel further. §5.1 adds an optional refinement, explicitly framed as being for once you want fewer, better-qualified bids and drawn from the source's own case-study library rather than the module: client in the US, budget posted at $3,500, payment method verified, fewer than 10 proposals.",
      "selfReported": true
    },
  },
  {
    id: "two-of-four-or-decline",
    rule: "Only pitch work that clears at least two of four tests — repetitive, time-consuming, error-prone, scalable. Score the work the post actually describes. If it clears none, do not apply.",
    because: "Starting in the wrong place means the buyer sees the return slowly or not at all, concludes the whole category was oversold, and there is no second engagement; what you agree to take on is a commercial decision, not a technical one.",
    source: {
      "label": "Acquisition playbook §4.1 — the four pillars",
      "claim": "A process must clear at least two of four — repetitive, time-consuming, error-prone, scalable — or it isn't worth automating yet. This doubles as a reason to decline a deal.",
      "selfReported": true
    },
  },
  {
    id: "assume-the-work-and-name-times",
    rule: "Close by assuming the engagement and proposing specific times in their timezone. Never close by asking whether they are interested or whether they would like to hear more.",
    because: "A close that ends on a booked date converts; a close that ends on verbal enthusiasm gives the reader another decision to defer.",
    source: {
      "label": "Acquisition playbook §8 — S.A.R.B.",
      "claim": "Summarize, Ask, Recommend a scoped next step, Book — the rule is that the close ends on a booked date, not on verbal agreement.",
      "selfReported": true
    },
  },
  {
    id: "reply-in-five-minutes",
    rule: "Apply while the post is still fresh, and answer anything the buyer sends within five minutes during working hours — within one business day at the absolute outside. Build the notification path before you apply.",
    because: "Instant replies are claimed to convert at around 400% higher, and a buyer who is actively shortlisting will have moved on before a next-day answer arrives.",
    source: {
      "label": "30-Day First-Client Playbook §3 — daily standing habits, with the reply-speed conversion claim",
      "claim": "Check and respond to inbound within 24 hours, replying to interested parties within 5 minutes. The reply-speed claim in the same source is that instant replies convert at 'around the 400% mark' higher; the notification path is built six days before launch so the five-minute reply is achievable from the first send.",
      "selfReported": true
    },
  },
  {
    id: "sweep-unanswered-proposals",
    rule: "Sweep unanswered proposals once a week and re-enter at the stage the person already reached, not at the beginning. Never drop a buyer who replied positively after a single unanswered message.",
    because: "A proposal left untouched decays fast — a deal sitting more than 72 hours without follow-up is described as much likelier to die — and reviving something that already engaged costs nothing, where a fresh application costs connects and the fifteen-minute ceiling.",
    source: {
      "label": "Maker School M4 — the optimisation diagnostic, pipeline and follow-up",
      "claim": "A deal in Proposal Sent for more than 72 hours without follow-up has a much higher chance of dying. Standing reactivation sweeps run on a calendar date — unanswered proposals after a week — and re-enter at the stage the person previously reached rather than dragging everyone back to a call, which is what keeps the sweep economical at volume.",
      "selfReported": true
    },
  },
  {
    id: "keep-payment-on-platform",
    rule: "Never put a payment link, invoice, off-platform contract, or outside contact channel into a marketplace proposal. If you attach a document, have it reference payment on the platform.",
    because: "An off-platform proposal with payment functionality risks the account being banned, and this overrides the usual advice to bundle proposal, agreement and invoice into one signable document.",
    source: {
      "label": "30-Day First-Client Playbook §5.5 — marketplace exception",
      "claim": "Do NOT send an off-platform proposal with payment functionality to a marketplace client; it risks getting the account banned. Deliver it in a message instead, and if sending a file make sure it references payment on the marketplace.",
      "selfReported": false
    },
  },
  ],

  banned: [
    ...UNIVERSAL_BANNED,
  {
    id: "selfDisqualification",
    label: "Self-disqualifying admission",
    pattern: new RegExp("\\bI(?:['’]m|\\s+am)\\s+(?:new\\s+to|just\\s+starting|a\\s+beginner|still\\s+learning)\\b|\\bI(?:['’]m|\\s+am)\\s+relatively\\s+new\\b|\\bI\\s+just\\s+started\\s+(?:out\\b|freelancing\\b|on\\s+(?:Upwork|this\\s+platform)\\b|my\\s+(?:business|agency|career)\\b)|\\bI\\s+have\\s+(?:no|very\\s+little|not\\s+much)\\s+experience\\b|\\bI\\s+(?:don['’]t|do\\s+not)\\s+have\\s+(?:much|any)\\s+experience\\b|\\bthis\\s+is\\s+my\\s+first\\s+(?:project|job|gig|client)\\b", "i"),
    because: "Volunteering inexperience hands a shortlisting reader a reason to move on; the source names it directly on the do-not list. The bare phrase 'I just started' is bound to an object so a recency claim about the work — 'I just started a near-identical build last week' — is not caught by a rule aimed at 'I just started out'.",
    level: "hard",
  },
  {
    id: "genericOpener",
    label: "Interchangeable opening line",
    pattern: new RegExp("caught\\s+my\\s+eye|came\\s+across\\s+your\\s+(?:website|site|profile|page|company|firm|business|job\\s+post(?:ing)?|listing|ad)|I\\s+was\\s+browsing\\s+your|hope\\s+(?:you(?:['’]re|\\s+are)\\s+well|this\\s+(?:email\\s+)?finds\\s+you\\s+well)", "i"),
    because: "These phrases appear in most applications, so they carry zero differentiating information while consuming the only characters visible before the fold. The noun set matches the cold-email sibling so the same opener is not blocked in one channel and waved through in another.",
    level: "hard",
  },
  {
    id: "perfectFitClaim",
    label: "Asserting the buyer's own conclusion",
    pattern: new RegExp("\\bI(?:['’]m|\\s+am)\\s+(?:the\\s+)?(?:perfect|ideal|best)\\s+(?:fit|candidate|person|choice)\\b|\\bI(?:['’]m|\\s+am)\\s+(?:the\\s+)?right\\s+fit\\b(?!\\s+for\\s+the\\s+\\w)", "i"),
    because: "The buyer's entire job is deciding who fits; stating the conclusion for them replaces the evidence that would have produced it. 'Right' is confined to the bare idiom 'right fit', because 'I am the right person for the ledger half' with a named, bounded scope is an honest concession rather than an unfounded self-assessment.",
    level: "hard",
  },
  {
    id: "designCompliment",
    label: "Compliment on their branding or site",
    pattern: new RegExp("\\b(?:love|really\\s+like|admire)\\s+your\\s+(?:website|logo|branding|design|site)\\b|\\byour\\s+(?:website|logo|branding)\\s+(?:looks|is)\\s+(?:great|amazing|beautiful|stunning|impressive)\\b", "i"),
    because: "It tells the reader a stranger judged their marketing, and it is a compliment any applicant could pay without reading the job post.",
    level: "hard",
  },
  {
    id: "priceBegging",
    label: "Competing on price or need",
    pattern: new RegExp("\\bplease\\s+give\\s+me\\s+a\\s+chance\\b|\\bI\\s+really\\s+need\\s+th(?:is|e)\\s+(?:job|work|project)\\b|\\bI\\s+(?:can|will|am\\s+happy\\s+to)\\s+(?:offer|give|do)\\b[^.]{0,40}\\b(?:lowest|cheapest)\\s+(?:price|rate|bid)\\b|\\bcheapest\\s+rate\\b|\\bI\\s+can\\s+do\\s+it\\s+cheaper\\b", "i"),
    because: "Discounting concedes the value argument, and pleading moves the decision from who is best to who is most desperate. The phrase is bound to a first-person offer so that refusing to be the cheapest bid — the scope-not-price law said out loud — is not blocked by the ban against competing on price.",
    level: "hard",
  },
  {
    id: "guaranteedReturn",
    label: "Promised multiple or guaranteed rate of return",
    pattern: new RegExp("\\bguarantee(?:d|s)?\\s+(?:you\\s+)?(?:a\\s+)?(?:\\d+\\s*x\\b|\\d+\\s*%\\s+(?:ROI\\b|return|uplift|growth|increase)|ROI\\b|return\\s+on\\s+investment\\b)|\\b\\d+x\\s+(?:your\\s+)?(?:ROI|return)\\b", "i"),
    because: "The 10x rule is a sales anchor, not an observed outcome — the same source's own deals compute at roughly 2.3x to 5x — so a promised multiple or rate of return is a claim you cannot defend. It covers multiples and rates only: guaranteeing the work itself, or offering money back, is the risk-reversed offer this pack instructs you to make.",
    level: "hard",
  },
  {
    id: "offPlatformPayment",
    label: "Off-platform payment solicitation",
    pattern: new RegExp("\\b(?:pay(?:ment)?s?\\s+(?:me\\s+)?(?:via|through|by|on)\\s+(?:PayPal|Venmo|Zelle|wire|bank\\s+transfer)|send\\s+(?:the\\s+)?(?:payment|money|funds)\\s+(?:via|through|to)\\s+me|pay\\s+me\\s+directly|(?:take|move|handle)\\s+(?:this|it|payment)\\s+off[-\\s]platform)\\b", "i"),
    because: "Payment functionality outside the marketplace risks the account being banned, and the source is explicit that the platform is strictest on the first engagement. It matches solicitations, not nouns: payment vendors are integration targets on a large share of marketplace jobs, and the pack's own diagnosis step orders the writer to reuse the buyer's nouns for the tools involved.",
    level: "hard",
  },
  {
    id: "offPlatformContact",
    label: "Off-platform contact solicitation",
    pattern: new RegExp("\\b(?:add|message|contact|reach|ping|DM|find)\\s+me\\s+(?:on|at|via|through)\\s+(?:WhatsApp|Telegram|Skype|Signal)\\b|\\bmy\\s+(?:WhatsApp|Telegram|Skype)\\s+(?:is\\b|handle|number|ID\\b|username)|\\bemail\\s+me\\s+at\\b|\\breach\\s+me\\s+(?:at|on)\\s+\\S+@", "i"),
    because: "Soliciting contact off the platform carries the same account risk as off-platform payment, though a buyer may legitimately name a messaging tool first and wiring those tools is routine scope — so this matches the solicitation frame rather than the vendor name, and warns rather than blocks.",
    level: "soft",
  },
  {
    id: "effortAsArgument",
    label: "Effort offered in place of outcome",
    pattern: new RegExp("\\bhard[-\\s]?working\\b|\\bdedicated\\s+professional\\b|\\bwork\\s+(?:very\\s+)?hard\\s+for\\s+you\\b|\\b100\\s*%\\s+(?:dedication|commitment)\\b", "i"),
    because: "Effort is the argument every applicant makes and the one the buyer cannot verify; price and selection follow outcomes, not inputs.",
    level: "soft",
  },
  {
    id: "formalSalutation",
    label: "Generic salutation in the visible preview",
    pattern: new RegExp("^\\s*(?:Dear\\s+(?:Sir|Madam|Sirs?|Sir\\s+or\\s+Madam|Hiring\\s+(?:Manager|Team)|Client|Team|Employer)|Respected\\s+(?:Sir|Madam)|To\\s+whom\\s+it\\s+may\\s+concern|Greetings\\s+of\\s+the\\s+day)", "im"),
    because: "It spends part of the short visible preview proving only that you do not know who they are. A salutation is a style choice rather than a defect, so this warns; the coverage is what matters, since the mass-application variants are the recognisable ones.",
    level: "soft",
  },
  ],

  structure: [
  {
    key: "hook",
    label: "Opening line",
    purpose: "Survive the truncated preview and prove in one sentence that the post was actually read.",
    maxChars: 150,
    constraints: [
      "Name their project or the work they described, in their words, inside the first ten words.",
      "No greeting, no salutation, no self-introduction, no company name of your own.",
      "No compliment about their business, website or branding.",
      "One sentence.",
      "150 characters is the Upwork default for the visible preview; check what the marketplace you are on actually truncates at and write to that number instead."
    ],
  },
  {
    key: "diagnosis",
    label: "Their problem, played back",
    purpose: "Restate the problem in their own language and add the one thing the post did not say.",
    maxChars: 500,
    constraints: [
      "Reuse their nouns for the work, the tools and the roles involved.",
      "Add exactly one observation they did not make — a failure mode, a hidden handoff, a downstream cost.",
      "Ask at most one question, and only where the answer is needed to price the work.",
      "Describe none of your services in this section."
    ],
  },
  {
    key: "demonstration",
    label: "The part you already did",
    purpose: "Convert a claim of capability into an artifact the buyer can look at.",
    maxChars: 700,
    constraints: [
      "Describe one specific piece of the work they described that you have already done — a page of copy, a mockup, a mapped flow, a cut scene, a working fragment.",
      "Link to it as a streamed link, never as a downloadable file or a drive attachment.",
      "Keep any recording under five minutes.",
      "If it is a prototype or a rough, state plainly which parts are placeholder and which are real."
    ],
  },
  {
    key: "proof",
    label: "Proof line",
    purpose: "Establish that you have done this before, without turning the letter into a résumé.",
    maxChars: 300,
    constraints: [
      "Format: I did [accomplishment] for [company type] by [implementation detail].",
      "Lead with the case nearest their industry; if none is in-niche, name the adjacent one and add one clause on why it transfers.",
      "Reach for a dollar figure first, a percentage second, a named association third — in that order of preference, not as a floor.",
      "If you have no revenue figures at all, work down the fallback: in-domain with revenue, out-of-domain with revenue, an impressive association without revenue, or a template you implemented in your own business with the measured delta.",
      "One heavyweight social-proof line in the cover letter; anything further belongs in the walkthrough."
    ],
  },
  {
    key: "roiFrame",
    label: "The value case — arithmetic where the post supplies numbers",
    purpose: "Make the price a consequence of the buyer's own situation rather than of your effort.",
    maxChars: 500,
    constraints: [
      "If the post supplies volumes, frequencies or throughput, show the subtraction and the multiplication using only their figures, and state the saving monthly and annually.",
      "If it does not, skip the arithmetic entirely and frame value as the outcome set against what their current alternative costs them — the agency quote, the in-house hire, the hours the owner is spending now.",
      "Where the work recurs and the figures are missing, ask for frequency, time per run and people involved rather than asserting a saving.",
      "Promise no multiple, no percentage return and no guarantee of a rate."
    ],
  },
  {
    key: "scopeAndPrice",
    label: "Scope, non-scope, price",
    purpose: "Define done, define not-done, and place the number after both.",
    maxChars: 900,
    constraints: [
      "List in-scope items as testable capabilities, not as activities.",
      "Put an explicit out-of-scope line directly beside the in-scope list.",
      "Name every component before the number: setup, hosting, testing and QA, optimisation, what you need from them (access, data, feedback), documentation and training, handover, maintenance if in scope.",
      "State the price once, after the inventory, as a non-round figure — never $50, $100 or $2,000.",
      "Offer a phased or reduced-scope version instead of a lower price.",
      "No payment link, invoice, or off-platform contract."
    ],
  },
  {
    key: "close",
    label: "Close",
    purpose: "End on a booked next step, assumed rather than requested.",
    maxChars: 250,
    constraints: [
      "Propose two or three specific times in their timezone.",
      "Phrase it as the work proceeding; do not ask whether they are interested.",
      "No second ask of any kind."
    ],
  },
  {
    key: "giveawayAsset",
    label: "The giveaway (supporting asset)",
    purpose: "Specify the thing they keep whether or not they hire you.",
    constraints: [
      "It must be usable without you present.",
      "It must be reusable across applications, or producible inside the fifteen-minute ceiling.",
      "It must not contain the paid scope — it is a sample of judgement, not a free build of the deliverable.",
      "Name it in one line inside the cover letter, saying what it contains."
    ],
  },
  {
    key: "videoWalkthrough",
    label: "Recorded walkthrough (supporting asset)",
    purpose: "Give the buyer four minutes of you, in the order that survives a shortlist.",
    constraints: [
      "Four beats in order: name their project over a screen share; proof in one sentence; do or build part of the work they described on screen; assume the win and name times.",
      "Under five minutes.",
      "Share as a streamed link on a recording platform; never a downloadable file or a drive link.",
      "Do not re-record for small mistakes."
    ],
  },
  {
    key: "replyInterested",
    label: "Reply — interested, or asking price",
    purpose: "Answer what they actually asked, then put specific times on the table.",
    maxChars: 600,
    constraints: [
      "Answer the question they asked in one or two plain sentences; if it was price, give a range and name what moves it — deferring price to a call reads as having something to hide.",
      "Say in one sentence why a call helps them, framed as walking through how this would work in their situation.",
      "Offer two or three specific slots in their timezone, with a booking link only as an 'if easier' fallback — never a bare link and never 'when are you free?'.",
      "Write and send this one by hand; automation starts only after it.",
      "If it goes quiet, chase twice inside the platform: at two days a short status check that explicitly grants permission to decline, at four days a single message whose entire content is the booking link."
    ],
  },
  {
    key: "replyNotNow",
    label: "Reply — not now",
    purpose: "Convert a vague deferral into a dated one.",
    maxChars: 400,
    constraints: [
      "Get a specific week or month, and say you will come back then, once.",
      "Calendar it and come back exactly once — returning twice makes the promise worthless.",
      "Leave the giveaway with them regardless of the date.",
      "No pitch, no counter-offer, no second ask."
    ],
  },
  {
    key: "replyWrongFit",
    label: "Reply — wrong fit, wrong person, or lost",
    purpose: "Exit clean and take the one thing the exchange can still produce.",
    maxChars: 350,
    constraints: [
      "If it is the wrong person, ask who the right one is and whether you may say they pointed you there.",
      "If they hired someone else, thank them in one line and ask what the winning application had.",
      "Never argue, never re-pitch, never defend the price.",
      "Start any referred person fresh with their own opening line; never forward the original thread."
    ],
  },
  ],

  evidence: [
    {
      "label": "30-Day First-Client Playbook §2 — the buying ladder",
      "claim": "Marketplace leads are the only top-rung leads — problem-aware and solution-aware, already choosing a provider — which collapses the channel to one problem: standing out.",
      "selfReported": true
    },
    {
      "label": "30-Day First-Client Playbook §5.1 — funnel diagnostic",
      "claim": "If roughly 85% of sent proposals are viewed but only about 5% open a conversation, the cover letter is the problem, not the volume.",
      "selfReported": true
    },
    {
      "label": "30-Day First-Client Playbook §5.1 — view-to-reply estimate",
      "claim": "More than 50% of application views produce a reply — stated explicitly as the source's estimate, with no hard statistics behind it.",
      "selfReported": true
    },
    {
      "label": "30-Day First-Client Playbook §5.1 — cold-start expectation",
      "claim": "You may not get a single hit from 30, 40, or 50 proposals sent.",
      "selfReported": true
    },
    {
      "label": "30-Day First-Client Playbook §5.1 — application economics (as stated in the source's 2025-era material)",
      "claim": "Connects run about $0.15 each at 10–15 per project, so an application costs roughly $1.50–$2.00 against a typical $500–$5,000 deal, on a stated 10% platform fee. One marketplace's pricing observed at one moment, not a measurement — the flat 10% fee in particular no longer describes Upwork's schedule. Verify current connect pricing and fees before using these numbers.",
      "selfReported": true
    },
    {
      "label": "30-Day First-Client Playbook §5.1 — visible characters (as stated in the source's 2025-era material)",
      "claim": "About the first 150 characters of a cover letter are visible before the fold, and about 100 characters of a profile. This is one marketplace's UI at one moment — Freelancer, Contra and Fiverr truncate differently, and the source itself substitutes a different platform for under-18 operators. Treat 150 as a per-marketplace default and check the live value.",
      "selfReported": true
    },
    {
      "label": "30-Day First-Client Playbook §5.1 — time ceiling",
      "claim": "Hard ceiling of about 15 minutes per application including the first; if the job is unfamiliar, spend the first ~10 minutes on AI triage rather than skipping it.",
      "selfReported": false
    },
    {
      "label": "30-Day First-Client Playbook §5.1 — recording rule (vendor tiers as stated in 2025-era material)",
      "claim": "Record on a link-sharing platform, not a file-based system: downloadable anonymous ~200MB video files add a lot of friction to the client experience. The free-tier ceiling of 5 minutes on the source's named platform is described as almost always sufficient — free-tier limits change; verify.",
      "selfReported": true
    },
    {
      "label": "30-Day First-Client Playbook §5.1 — optional tighter filters",
      "claim": "An optional refinement, framed by the source as being for once you want fewer, better-qualified bids rather than for the cold start, and drawn from its case-study library rather than the module: client in the US, budget posted at $3,500, payment method verified, fewer than 10 proposals.",
      "selfReported": true
    },
    {
      "label": "30-Day First-Client Playbook §5.1 — one heavyweight proof line",
      "claim": "The application's CV text carries a confident opening naming their thing, the recorded video link, one heavyweight social-proof line, and a short 'about me'. Zero reviews are named directly and reframed as honesty.",
      "selfReported": false
    },
    {
      "label": "30-Day First-Client Playbook §5.1 — non-round rate",
      "claim": "Use a non-round rate such as $63.46 rather than $50 or $100; over $50,000 in earnings is attributed to this, as an attribution rather than a measurement.",
      "selfReported": true
    },
    {
      "label": "30-Day First-Client Playbook §5.5 — offers",
      "claim": "A risk-reversed offer is claimed to lift reply rate by up to 10x versus none; the canonical example ran about 20,000 emails at roughly 8% reply, and the second at 7%. Neither is a comparison against a no-offer control.",
      "selfReported": true
    },
    {
      "label": "30-Day First-Client Playbook §5.5 — specificity hierarchy and the four-tier fallback",
      "claim": "Dollar figures beat percentages beat associations beat vague claims, because 'scaled a business by 30%' could mean scaling it from $1 to $1.30 — but metrics are wanted 'if possible… don't get hung up here'. The fallback runs: in-domain with revenue outcomes; out-of-domain with revenue outcomes; impressive associations without revenue; or implement a supplied template in your own business and claim the measured delta.",
      "selfReported": false
    },
    {
      "label": "30-Day First-Client Playbook §5.5 — marketplace exception",
      "claim": "Do not send an off-platform proposal with payment functionality to a marketplace client; it risks an account ban. Deliver it in a message and reference payment on the platform.",
      "selfReported": false
    },
    {
      "label": "Maker School M2 — quota drop as a quality instruction",
      "claim": "Every application-quota cut carries an instruction to spend the freed time vetting: client hire history, average rating, total money paid out, post recency, requirement fit.",
      "selfReported": false
    },
    {
      "label": "Maker School M2 — in-niche proof",
      "claim": "In-niche proof is described as roughly twice as effective as out-of-niche proof.",
      "selfReported": true
    },
    {
      "label": "Maker School M2 — marketplace acquisition cost (as stated in 2025-era material)",
      "claim": "A $2,000 marketplace deal costs about $20 in connects, ~$80 of selling time and ~$200 in platform fees — roughly 15% of project value spent before work starts. Built on the same volatile connect pricing and fee schedule; recompute against current rates.",
      "selfReported": true
    },
    {
      "label": "Maker School M4 — pipeline staleness",
      "claim": "A deal sitting in Proposal Sent for more than 72 hours without follow-up has a much higher chance of dying; the daily pipeline check runs backwards from Closed Won and asks only what the smallest action is that moves each deal forward.",
      "selfReported": true
    },
    {
      "label": "Maker School M4 — reactivation sweeps",
      "claim": "Standing reactivation sweeps run on a calendar date — past clients monthly or quarterly, unanswered proposals after a week — and re-enter at the stage the person previously reached rather than dragging everyone back to a call, which is what keeps the sweep economical at around 200 leads a month.",
      "selfReported": true
    },
    {
      "label": "Cold-email course — the three-step reply framework",
      "claim": "Answer the question they actually asked; position the call as useful to them rather than as a sales meeting; pitch three to four specific slots in their timezone with the calendar link only as an 'if easier' fallback. The single biggest named beginner mistake is answering the question and never asking for the call; replying 'when are you free?' or with a bare link is where most bookings are lost.",
      "selfReported": true
    },
    {
      "label": "Cold-email course — the two-step chase, plus the delivered reply-handling doctrine",
      "claim": "Tag everyone who replied but has not booked; two days later send a short status check whose distinguishing feature is that it grants explicit permission to decline; two days after that send a single nudge whose entire content is the booking link. The first response is always manual. A positive reply is never dropped after one unanswered attempt. Reply branches are handled as interested (price answered in one line, then slots), not now (get a date, return once), wrong person (take the referral, never forward the thread) and hostile (one line, then remove).",
      "selfReported": true
    },
    {
      "label": "Acquisition playbook §4.1 — the four pillars",
      "claim": "A candidate process must clear at least two of repetitive, time-consuming, error-prone and scalable, or it is not worth automating yet; the threshold doubles as a reason to decline.",
      "selfReported": true
    },
    {
      "label": "Acquisition playbook §6.1 and §6.3 — the ROI worksheet",
      "claim": "Frequency, time per execution, people involved, hourly labour cost and error cost are the five inputs; time saved = (manual − automated) × frequency, then converted to money twice — as cost reduction and as revenue from freed hours.",
      "selfReported": true
    },
    {
      "label": "Acquisition playbook §7.7 — never present price first",
      "claim": "The order is transformation → solution and full component inventory → price. Components to name before the number: setup, hosting, testing/QA, optimisation, client involvement (access, data, feedback), documentation/enablement/training, and maintenance if in scope. Price stated cold is compared to nothing; price stated after the outcome and the inventory is compared to both.",
      "selfReported": true
    },
    {
      "label": "Acquisition playbook §7.2 — the 10x rule against observed deals",
      "claim": "The stated rule is a visible 10x return within twelve months, but the multiples computed on his own deals run about 2.3x to 5x, with a single example at 12x.",
      "selfReported": true
    },
    {
      "label": "Acquisition playbook §7.5 — close-rate diagnostic",
      "claim": "If more than 50% of people say yes, the price is probably too low.",
      "selfReported": true
    },
    {
      "label": "Acquisition playbook §7.6 — objection handling",
      "claim": "Adjust the scope, never the price: reduce complexity, remove a non-essential feature, or phase the project, because discounting concedes the value figure was inflated.",
      "selfReported": true
    },
    {
      "label": "Practitioner deal record — prototype-first close",
      "claim": "A verbal yes landed at minute 19 of a demo call, before any pricing existed; the operator's own summary was that the proposal did not sell him, the prototype did.",
      "selfReported": true
    },
    {
      "label": "Practitioner deal record — close speed",
      "claim": "Never ask permission to send the link — every question is another chance to sleep on it. Closes on record at 60 seconds, 12 minutes, 17 minutes and 36 minutes.",
      "selfReported": true
    }
  ],

  knownTensions: [
    {
      "tension": "Cold-email doctrine names a hard call ask a bad CTA and prefers the shortest permission ask; this pack tells you to close on named times.",
      "resolution": "The rules differ because the rungs differ. A cold recipient has not agreed that the problem is worth solving, so a call ask is premature. A marketplace buyer posted the job and is shortlisting, so the call is the next step they already intend to take. Keep the direct ask here; do not carry it into cold email."
    },
    {
      "tension": "The channel rewards volume — ten applications a day at fifteen minutes each — while also demanding vetting, a live-built demonstration and a bespoke giveaway per job.",
      "resolution": "Volume days and selection days are different days. Early on, quota is the point: the reps are the product and the ceiling protects them. Once replies start arriving, the quota halves and the freed hours go into vetting and into deeper demonstrations on fewer, better jobs. Never let the ceiling break; make the components reusable instead."
    },
    {
      "tension": "Give something away for free, but never discount — a free build is a 100% discount that the sources never frame as one.",
      "resolution": "The giveaway is paid for in proof, not in cash, so it must be bounded: reusable across applications or producible inside the fifteen-minute ceiling, and never a slice of the paid scope. The moment the giveaway is the deliverable, it is a discount and the never-discount rule applies."
    },
    {
      "tension": "The stated pricing rule promises the buyer a 10x return, while the same operator's own computed deals land at roughly 2.3x to 5x.",
      "resolution": "Use the arithmetic to justify the price and let the multiple be whatever the buyer's own numbers produce. State the saving; never state a promised multiple. Treat 10x as an internal sanity check on whether a price is defensible, not as a claim that goes into copy."
    },
    {
      "tension": "Everywhere else the method says bundle proposal, agreement and invoice into one signable, payable document — six post-call steps down to two. On a marketplace that same move risks an account ban.",
      "resolution": "The marketplace exception wins inside this channel. Deliver the proposal as a message, a link or plain text, keep payment on the platform, and only reach for the bundled document on follow-up work that has legitimately moved off-platform."
    },
    {
      "tension": "The beginner instruction is to mention case studies almost as an afterthought; an operator with real in-niche proof is told the opposite.",
      "resolution": "Downplaying exists to stop a zero-proof operator overselling thin claims. If the user has an in-niche case with a dollar figure, promote it to the proof line and let it carry weight. If their proof is adjacent or thin, keep it to one line and let the demonstration do the work instead."
    },
    {
      "tension": "Write from a position of strength and never disqualify yourself, while the same source's own application artifact names zero reviews directly and reframes that as honesty.",
      "resolution": "Never volunteer it unprompted — no 'I just started', no 'I'm still learning', no apology for a thin history. When the buyer asks directly, answer in one forward-facing line with the offer attached: what you have done, what you will do here, and what they keep if it does not work out. Being asked is a different situation from confessing, and the direct answer beats the evasion because the buyer can already see the review count."
    },
    {
      "tension": "Two of the most-endorsed qualification filters disagree: one screens purely on the buyer's sales economics, the other requires that the buyer already be spending on the category.",
      "resolution": "On a marketplace the disagreement mostly dissolves — posting the job is itself evidence of category appetite, so screen on economics: verified payment, money actually paid out, deal size that can carry your price, and a decision-maker who can say yes."
    },
    {
      "tension": "The pack must generalise across marketplaces and trades, while its richest figures — connect pricing, platform fees, the 150-character fold — come from one platform at one moment.",
      "resolution": "Treat every vendor figure as a default with an as-of date, not as a constant. The doctrine (apply cheaply, write to the fold, price after the inventory) travels; the numbers do not. Check the live value of anything you are about to hard-code, and where the work has no throughput to measure, use the alternative value frame rather than manufacturing arithmetic to fit the shape."
    }
  ],
};
