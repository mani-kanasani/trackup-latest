// AUTO-GENERATED from packs.source.json by scripts/genPacks.mjs. Do not edit by hand.
//
// a three-touch cold email sequence to a stranger, plus the replies that follow it
//
// Every law carries the source it came from. Where a source is one operator's
// account of their own results rather than a measurement, selfReported is true
// and the UI shows it as a claim.

import type { MethodPack } from '../types';
import { UNIVERSAL_BANNED } from '../validate';

export const coldEmailPack: MethodPack = {
  id: "coldEmail",
  version: "1.1.0",
  label: "a three-touch cold email sequence to a stranger, plus the replies that follow it",

  thesis: "Cold email reaches people who have never heard of you, in a medium built for one person writing to one other person. Its job is to earn a one-word reply, not to sell and not to book. It is the last link in a chain whose earlier links are sending infrastructure, the list, and the strength of the offer, which means excellent copy on a wide list or a weak offer still fails, while adequate copy on a narrow list with a strong offer works. Everything about the writing follows from that: plain enough for a fifteen-year-old, short enough to be read in a glance, led by their situation rather than your credentials, and carrying nothing a spam filter can hold against you, so no links, no images, no attachments, no formatting. It is not a newsletter, an ad, a landing page or a pitch deck, and it is not where a meeting gets booked. The meeting is asked for in the first human reply, after someone has shown interest. Before any of it is worth writing, the channel has to fit the offer at all.",

  primeDirective: "Earn a reply that costs the reader one word. Every line either helps earn that reply or comes out, and no ask inside a cold email may cost the reader time, a click, or a decision.",

  laws: [
  {
    id: "earn-a-reply-not-a-meeting",
    rule: "Ask for a reply, never for a meeting, a demo, or a click.",
    because: "A cold ask has to be answerable in one word and cost the reader nothing; a call request asks a stranger to spend time before you have given them anything.",
    source: {
      "label": "Cold Email Lab §3 — the CTA rule",
      "claim": "A cold CTA must be answerable in one word, cost the reader nothing, and offer something rather than request time; meeting asks, demo asks and link clicks are all named as bad CTAs.",
      "selfReported": false
    },
  },
  {
    id: "offer-something-do-not-request",
    rule: "Make the ask give something away, permission to send an example, a list, a short walkthrough, instead of requesting time.",
    because: "The more free-sounding and valuable the ask, the better the response; an offer to send something free is claimed to beat a call request every single time.",
    source: {
      "label": "Cold Email Lab §3 — the CTA rule",
      "claim": "An offer to send a free example outperforms a call request 'every single time'; the shortest possible permission ask is the strongest. He also states that strengthening the offer outperforms strengthening the words, and that a free or performance-based ask is the largest single lift available.",
      "selfReported": true
    },
  },
  {
    id: "zero-links",
    rule: "Put no links, images, HTML or attachments in any message sent before they have replied; a plain-text opt-out is the only permitted extra element.",
    because: "Links and images cost deliverability, and deliverability is the one variable a cold campaign cannot afford to spend.",
    source: {
      "label": "Cold Email Lab §5 — where a link first appears",
      "claim": "Links and images hurt deliverability very substantially; no links, no images, nothing fancy, in any email of the sequence, and the only permitted extra element is a plain-text opt-out mechanism. Independently corroborated by a second course's send settings: no HTML, no links in the body, no images.",
      "selfReported": true
    },
  },
  {
    id: "open-on-them",
    rule: "Open with one specific, true, verifiable observation about them.",
    because: "It proves a human researched this recipient rather than blasting a list, which is the whole job of the first line.",
    source: {
      "label": "Cold Email Lab §3 — the callout hook",
      "claim": "The callout hook is one specific, true, verifiable observation about them, their business or their situation, and its job is to prove the email was not blasted.",
      "selfReported": false
    },
  },
  {
    id: "one-human-to-one-person",
    rule: "Write in first person, in the shape 'I help [narrow niche] [specific outcome]', use 'you' more often than 'I', and put their situation before your credentials.",
    because: "An abstract corporate subject attached to an unfalsifiable claim reads like an infomercial, and a credentials-first opening makes the email about the sender, in a medium that is one-to-one correspondence.",
    source: {
      "label": "Cold Email Lab §2 — copy principles",
      "claim": "Write first person, always, in the shape 'I help [niche] do [outcome]'; third-person company boilerplate reads like an infomercial. Use 'you' more than 'I' and lead with their problem or situation, letting credibility arrive later; you do have to talk about yourself, it just cannot all be about you.",
      "selfReported": false
    },
  },
  {
    id: "substantiate-or-concede",
    rule: "Attach one concrete substantiating fact to every claim. Where you have no client result, substitute an honest alternative, niche expertise, years in the work, or a result you got for yourself, rather than asserting one you cannot support.",
    because: "Everyone can assert; few can substantiate. A value proposition with no credibility element gives no reason to believe.",
    source: {
      "label": "Cold Email Lab §3 — social proof and credibility",
      "claim": "A value prop with no credibility element gives no reason to believe; one concrete substantiating result where you have one, and where you have none, substitute honest alternatives such as years of experience, niche expertise or personal results. He flags that specific results claims may be non-compliant under FTC-type rules depending on jurisdiction.",
      "selfReported": false
    },
  },
  {
    id: "cut-to-the-bone",
    rule: "Cut until only a callout, a value proposition and an ask survive; drop the credibility line first when compressing.",
    because: "A workable cold email survives compression to roughly three lines, and a five- or ten-sentence email gets glanced at and discarded.",
    source: {
      "label": "Cold Email Lab §3 — the minimum-viable email",
      "claim": "As short as possible while still communicating value, 50 words instead of 100 where you can; a workable email compresses to about three lines and credibility is the droppable component.",
      "selfReported": true
    },
  },
  {
    id: "plain-subject-lines",
    rule: "Write subject lines under three words, lowercase and plain, with no punctuation tricks, and stop optimizing them.",
    because: "Testing across hundreds of lines produced negligible difference, so subject-line effort is where testing budget goes to die.",
    source: {
      "label": "Cold Email Lab §4 — subject line strategy",
      "claim": "Dozens, probably hundreds of subject lines tested and the difference was negligible; use either a fragment of the observation or a bare label.",
      "selfReported": true
    },
  },
  {
    id: "three-touches-max",
    rule: "Send at most three cold emails to a stranger, spaced two to seven days apart, and fewer on a very large market.",
    because: "Interest is front-loaded into the first email; later sends increasingly hit dead inboxes, raise spam complaints and degrade the sending domain itself.",
    source: {
      "label": "Cold Email Lab §6 — sequence length and diminishing returns",
      "claim": "Three emails maximum in most cases, spaced two to seven days; the fourth touch is effectively worthless, and one email to 10,000 people substantially outperforms ten emails to 1,000.",
      "selfReported": true
    },
  },
  {
    id: "vary-the-ask",
    rule: "Change the ask at every touch: a different asset at the second, a bare status check or a redirect at the last.",
    because: "A repeated ask reads as a repeat; a different asset makes the second touch land as new information rather than a nag.",
    source: {
      "label": "Cold Email Lab §5 — CTA variation across the sequence",
      "claim": "Vary the CTA across the sequence rather than repeating it: permission-to-send at the first touch, a different permission-to-send at the second, a bare status check at the last. There is no perfect formula.",
      "selfReported": false
    },
  },
  {
    id: "last-touch-redirect",
    rule: "Make the final touch deliberately very short, shorter than every earlier touch, and prefer asking who else should be handling this over asking again for their attention.",
    because: "A redirect is short and easy to answer, which is the reason given for preferring it over a status bump.",
    source: {
      "label": "Cold Email Lab §5 — the third email",
      "claim": "The third email is a deliberate pattern interrupt, very short; the preferred form is a referral redirect asking who else at the organization to speak to, and the stated reason for the preference is that these work because they are short and to the point.",
      "selfReported": true
    },
  },
  {
    id: "reply-then-ask",
    rule: "In the first reply after interest, answer their question, say why a call helps them, then pitch three specific slots in their own time zone.",
    because: "The single biggest beginner mistake is answering the question and never asking for the call; a bare 'when are you free?' or a naked calendar link is where most bookings are lost.",
    source: {
      "label": "Cold Email Lab §7 — the three-step reply framework",
      "claim": "Answer what they asked, position the call as useful to them, then pitch three to four specific slots in the prospect's time zone with the calendar link only as an 'if easier' fallback.",
      "selfReported": true
    },
  },
  {
    id: "deliver-what-you-promised",
    rule: "Send whatever you offered before you ask for anything else.",
    because: "Promising a resource and then swapping it for a call ask is bait and switch, and it is tied directly to a poor booking rate.",
    source: {
      "label": "Cold Email Lab §7 — reply handling failures",
      "claim": "Bait and switch, promising a resource in the email and swapping it for a call ask when they say yes, is named as a cause of poor booking rates.",
      "selfReported": true
    },
  },
  {
    id: "stop-on-reply",
    rule: "Stop the cold sequence the instant anyone replies; a human answers from that point, and any further chase runs as a separate thread.",
    because: "An automated send landing on top of a live conversation destroys everything the earlier emails built.",
    source: {
      "label": "Delivered outbound sequence — pause on reply",
      "claim": "Any reply pauses the sequence immediately; no further automated send goes to that address, including the final touch, and a human takes the conversation from that point.",
      "selfReported": false
    },
  },
  {
    id: "carry-a-compliant-opt-out",
    rule: "Carry a clear opt-out in the footer of every send; it need not be a link, and what the footer must contain differs by jurisdiction, so check yours before sending.",
    because: "It is the one legally required element of a commercial email, and the no-links rule is exactly what makes senders leave it out.",
    source: {
      "label": "Cold Email Lab §5 — the permitted extra element",
      "claim": "The only permitted extra element alongside the plain-text body is an opt-out mechanism, required for compliance; he notes it need not be an unsubscribe link, only a clear way to opt out, and tells you to check your own jurisdiction.",
      "selfReported": false
    },
  },
  {
    id: "know-when-the-channel-is-wrong",
    rule: "Stop rather than optimize when the addressable market is too small to sustain volume, when you cannot close cold traffic, or when a stated send volume has produced nothing at acceptable bounce and warm-up scores.",
    because: "These are named as reasons the channel may not work at all rather than parameters to tune, and named verticals were ground for months before the fix turned out to be changing the market.",
    source: {
      "label": "Cold Email Lab §11 — the fit scorecard and the two disqualifiers",
      "claim": "Four factors trade off rather than gate: an expensive offer or high lifetime value, a large addressable market, B2B, and low competition. Two named disqualifiers sit apart from them, too small a total addressable market and an inability to close cold traffic, both stated as reasons the channel may not work for you at all. He names software dev agencies, IT service providers and expensive enterprise products as verticals to stop optimizing against rather than grind.",
      "selfReported": true
    },
  },
  {
    id: "two-versions-of-email-one",
    rule: "Write the opening email in at least two versions and run them against each other.",
    because: "Copy improves by comparison rather than conviction, and the source treats more than one variant of email one as mandatory before launch.",
    source: {
      "label": "Cold Email Lab §9 — split testing",
      "claim": "Build at least three variations of email one before launching; more than one variant is mandatory and fifty is unnecessary. Roughly 2,000 to 3,000 prospects per variation for a usable sample, and do not split test at all if the list is too small to support it.",
      "selfReported": true
    },
  },
  {
    id: "rest-the-list-and-return",
    rule: "Treat a finished list as a resting list: re-contact the same names in a fresh short campaign every two to three months rather than extending the thread.",
    because: "A three-touch cap only survives a finite prospect pool if the pool renews, and a timing objection calls for re-sequencing later rather than more sends now.",
    source: {
      "label": "Cold Email Lab §5 — timing objections and market refresh",
      "claim": "If timing was the obstacle, do not extend the thread; re-sequence the same people later in a fresh one-to-three-email campaign. The general market-refresh cadence is given as every two to three months, and treating markets as renewable is what makes the short-sequence rule affordable.",
      "selfReported": true
    },
  },
  ],

  banned: [
    ...UNIVERSAL_BANNED,
  {
    id: "caught-my-eye",
    label: "\"caught my eye\" opener",
    pattern: new RegExp("\\bcaught my eye\\b", "i"),
    because: "Named banned opener. It signals a template, and it describes the sender's experience rather than a verifiable fact about the recipient.",
    level: "hard",
  },
  {
    id: "came-across-your-site",
    label: "\"came across / stumbled on your website\" opener",
    pattern: new RegExp("\\b(?:came across|stumbled (?:up)?on|was browsing) your (?:site|website|profile|page|company|firm|business)\\b", "i"),
    because: "Named banned opener. Browsing a website is not an observation; the callout hook has to be something only real research produces.",
    level: "hard",
  },
  {
    id: "hope-you-are-well",
    label: "\"hope you are well\" / \"hope this finds you\" filler",
    pattern: new RegExp("\\bhope (?:you(?:['’]re| are)? (?:well|doing well)|this (?:email |message )?finds you)", "i"),
    because: "Named banned opener. It spends the first line, which is the only line most recipients read, on nothing.",
    level: "hard",
  },
  {
    id: "quick-question-opener",
    label: "\"quick question\" as an opener or subject line",
    pattern: new RegExp("(?:^|\\n)\\s*(?:subject:\\s*)?quick question\\b", "i"),
    because: "Named banned opener. It is a curiosity trick the reader has seen a thousand times, and it carries no information about them.",
    level: "hard",
  },
  {
    id: "design-compliment",
    label: "compliment on their logo, branding or web design",
    pattern: new RegExp("\\b(?:love|like|admire) (?:your|the) (?:new |fresh )?(?:logo|branding|web ?site design|web design)\\b", "i"),
    because: "Named banned opener. It tells the recipient a stranger judged their marketing, and it is the observation you write when you found nothing real.",
    level: "hard",
  },
  {
    id: "availability-punt",
    label: "an availability question instead of concrete slots",
    pattern: new RegExp("\\b(?:when\\s+(?:are|would)\\s+you\\s+(?:be\\s+)?(?:free|available)|let\\s+me\\s+know\\s+(?:a\\s+(?:good\\s+)?time|what\\s+works|(?:your|what\\s+your)\\s+availability)|what(?:['’]s|\\s+is)\\s+your\\s+availability|what\\s+does\\s+your\\s+(?:calendar|schedule)\\s+look\\s+like)\\b", "i"),
    because: "Pushing the scheduling work onto the prospect is named as where most bookings are lost; pitch three specific slots in their time zone instead.",
    level: "hard",
  },
  {
    id: "click-here",
    label: "a click instruction before they have replied",
    pattern: new RegExp("\\bclick (?:here|the link|below)\\b", "i"),
    because: "A request to click is a named bad CTA and a deliverability cost; no message sent before they have replied carries a link at all. Links are permitted only inside a live conversation, after a reply.",
    level: "hard",
  },
  {
    id: "book-a-demo",
    label: "a meeting, call or demo booking ask",
    pattern: new RegExp("\\b(?:book|schedule|set\\s+up|hop\\s+on|jump\\s+on|grab|find)\\s+(?:a|some|\\d+)\\s*(?:quick\\s+|short\\s+|discovery\\s+|sales\\s+|intro\\s+)?(?:demo|call|chat|sync|time|minutes|meeting)\\b", "i"),
    because: "Meeting, call and demo asks are named bad CTAs: they request time from someone who has been given nothing yet. Inside a cold email body none of these phrasings has an innocent reading.",
    level: "hard",
  },
  {
    id: "corporate-boilerplate",
    label: "third-person or superlative company boilerplate",
    pattern: new RegExp("\\b(?:we(?:['’]re|\\s+are)|is)\\s+(?:an?|the)?\\s*(?:leading|premier|full[-\\s]service|top[-\\s]rated|world[-\\s]class|award[-\\s]winning|industry[-\\s]leading)\\b", "i"),
    because: "An abstract corporate subject plus an unfalsifiable claim reads like an infomercial; cold email is one human writing to one person. The third-person form is the one the law names, so the pattern has to see it.",
    level: "hard",
  },
  {
    id: "html-markup",
    label: "HTML markup in a plain-text email",
    pattern: new RegExp("</?(?:img|a|table|tr|td|div|br|p|span|strong|b|i|u|em|ul|ol|li|h[1-6]|font|style|center|body)(?:\\s[^<>]{0,200})?/?>|&nbsp;", "i"),
    because: "Plain text only. HTML, images and remote-loading elements are deliverability costs the channel cannot absorb. Requiring a well-formed tag keeps the pattern off ordinary prose comparisons.",
    level: "hard",
  },
  {
    id: "fabricated-re-subject",
    label: "fabricated \"re:\" on a fresh send",
    pattern: new RegExp("(?:^|\\n)\\s*(?:subject:\\s*)?re\\s*:", "i"),
    because: "Faking a prior thread is a trick a careful reader will check, and everything after they catch it is dead. Follow-ups thread as genuine replies instead. The subject is often validated as a bare field, so the 'subject:' prefix has to be optional.",
    level: "hard",
  },
  ],

  structure: [
  {
    key: "preflight",
    label: "Preflight — does this channel fit this offer",
    group: "Before you send",
    purpose: "Decide whether cold email is the right channel for this offer at all, before any of it is written.",
    constraints: [
      "Score four factors that trade off rather than gate: an expensive offer or high lifetime value, a large addressable market, B2B, and low competition in the target market",
      "Stop if the addressable market is too small to sustain volume; a small market is named as a reason the channel may not work at all, not a parameter to tune",
      "Stop if you cannot close cold traffic; these prospects have never heard of you, and weak cold-sales skill sinks the channel regardless of campaign metrics",
      "Treat a lifetime value under roughly $10,000, or a budget under roughly $500 a month, as a reason to reconsider the channel rather than to write harder",
      "Confirm one true, specific reason for reaching out exists for every name on the list; a demographic slice you have nothing to say about is not a segment",
      "Spend effort on the list and the offer before the copy: infrastructure is first and copy is last in every version of the priority order the source gives",
      "Write the stopping rule down before launch: a stated send volume that produces nothing, at acceptable bounce and warm-up scores, means changing the market rather than the copy"
    ],
  },
  {
    key: "openingEmail",
    label: "Email 1 — the pitch",
    group: "The sequence",
    purpose: "Earn a one-word reply from a stranger by proving the email was written for them and asking for something that costs them nothing.",
    day: 0,
    maxChars: 450,
    constraints: [
      "Subject line under three words, lowercase, plain: either a fragment of the observation or a bare label naming who they are or what this is about",
      "First line is one specific, true observation about them, verifiable in ninety seconds",
      "Value proposition in first person, in the shape 'I help [narrow niche] [specific outcome]'",
      "One substantiating fact, or an honest alternative where you have no client result yet",
      "Close on a single permission ask answerable in one word",
      "Zero links, zero images, zero attachments, zero formatting, and no tracking pixel",
      "Footer carries a plain-text opt-out and, on US commercial email, a postal address; both sit in the footer, never in the body",
      "Produce at least two versions of this email to run against each other, identical in observation line and differing only in the value proposition, the credibility line or the ask",
      "More instances of 'you' than of 'I'",
      "Plain English a fifteen-year-old could follow"
    ],
  },
  {
    key: "angleShift",
    label: "Email 2 — the same offer, a second angle",
    group: "The sequence",
    purpose: "Restate the same offer from a different angle so it reads as new information rather than a repeat of email one.",
    day: 4,
    maxChars: 350,
    constraints: [
      "Reference the earlier email in one clause; never re-pitch from scratch",
      "Keep the value proposition and the credibility line; change the angle, not the offer",
      "Ask permission to send a different asset from the one offered in email 1",
      "Shorter than email 1",
      "Send as a genuine reply in the same thread",
      "Zero links, zero images, zero attachments"
    ],
  },
  {
    key: "patternInterrupt",
    label: "Email 3 — the redirect",
    group: "The sequence",
    purpose: "Close the loop in the fewest possible words by asking who else should be handling this, rather than asking again for their attention.",
    day: 9,
    maxChars: 320,
    constraints: [
      "Deliberately very short, shorter than every earlier touch",
      "Prefer a referral redirect over a status bump",
      "Grant explicit permission to decline",
      "No new argument, no new proof, no offer, no link",
      "This is the last automated send to this address"
    ],
  },
  {
    key: "answerTheQuestion",
    label: "Reply, part 1 — answer what they asked",
    group: "If they are interested",
    purpose: "Answer the exact question the prospect asked, before anything else happens in the message.",
    maxChars: 320,
    constraints: [
      "Ships as the first section of one sent reply, concatenated with 'Reply, part 2' and 'Reply, part 3'; this ceiling governs the section, and the assembled reply should stay under about 900 characters",
      "One or two plain sentences",
      "If they asked price, give a real range and name what moves it",
      "Never defer the answer to a call",
      "No pitching, no new claims",
      "Sent by hand, within the hour if you can sustain it"
    ],
  },
  {
    key: "positionTheCall",
    label: "Reply, part 2 — why a call helps them",
    group: "If they are interested",
    purpose: "Give one reason a conversation is useful to the prospect in their own situation, framed as their benefit rather than as a sales meeting.",
    maxChars: 200,
    constraints: [
      "Ships as the second section of the same sent reply, between 'Reply, part 1' and 'Reply, part 3'",
      "One sentence",
      "Frame it as walking them through how this would work for them specifically",
      "Never the words 'sales call', 'demo' or 'discovery call'"
    ],
  },
  {
    key: "offerTimes",
    label: "Reply, part 3 — three specific slots",
    group: "If they are interested",
    purpose: "Make booking cost the prospect one word by naming concrete times in their time zone.",
    maxChars: 400,
    constraints: [
      "Ships as the closing section of the same sent reply, after 'Reply, part 1' and 'Reply, part 2'",
      "Three specific slots, in the prospect's time zone, never yours",
      "Calendar link only after the slots, as an 'if easier' fallback; this is a reply inside a live conversation, so the pre-reply link ban does not apply here",
      "Close by asking them to confirm one",
      "Never a bare availability question"
    ],
  },
  {
    key: "deferralReply",
    label: "Reply to a 'not now'",
    group: "Other replies",
    purpose: "Convert an open-ended deferral into a dated single return.",
    maxChars: 400,
    constraints: [
      "Ask for a month, then confirm you will come back then, once",
      "Leave the promised free asset available in the meantime",
      "Never argue against the deferral",
      "Calendar the return and honor the 'once'; coming back twice makes the promise worthless",
      "Where timing was the whole obstacle, plan the return as a fresh short campaign rather than an extension of this thread"
    ],
  },
  {
    key: "redirectReply",
    label: "Reply to a wrong-person response",
    group: "Other replies",
    purpose: "Turn a wrong-person reply into a named referral you can open with.",
    maxChars: 260,
    constraints: [
      "One or two sentences",
      "Ask who to speak to, and whether you may mention they pointed you there",
      "Never forward the original thread",
      "Start the named person at email 1 with a fresh observation of their own"
    ],
  },
  {
    key: "optOutReply",
    label: "Reply to a hostile response",
    group: "Other replies",
    purpose: "Remove a hostile responder in one line, without defending anything.",
    maxChars: 120,
    constraints: [
      "One sentence, then stop",
      "Never defend, never explain, never counter-offer",
      "Suppress the address across every mailbox and domain",
      "Suppress the rest of that organization too; one annoyed reply becomes a whole company's blacklist"
    ],
  },
  {
    key: "chaseStatusCheck",
    label: "Chase 1 — the permission-to-decline check",
    group: "If interest goes quiet",
    purpose: "Re-open an interested lead who never booked, by making a decline as easy to send as a yes.",
    maxChars: 280,
    constraints: [
      "Two lines maximum",
      "Explicitly grant permission to decline; that is what makes it answerable",
      "Send roughly two days after the conversation went quiet",
      "Only ever sent to someone who already replied, never to a cold address"
    ],
  },
  {
    key: "chaseBookingNudge",
    label: "Chase 2 — the booking nudge",
    group: "If interest goes quiet",
    purpose: "Give an interested lead one frictionless way to book, and then stop chasing by email.",
    maxChars: 200,
    constraints: [
      "The booking link is essentially the entire content; this runs after a reply, inside a live conversation, so the pre-reply link ban does not apply",
      "Roughly two days after the status check",
      "This ends the automated chase; further follow-up moves to phone or a connection request with a one-line note referencing the email",
      "Never drop a positive reply after a single unanswered attempt"
    ],
  },
  ],

  evidence: [
    {
      "label": "Cold Email Lab, opening claims — operator scale",
      "claim": "Upwards of 10,000,000 cold emails sent across close to four years, currently over 1,000,000 per month on behalf of roughly 30 clients, with close to 4,000 sales meetings booked to date.",
      "selfReported": true
    },
    {
      "label": "Cold Email Lab §1 — where copy sits in the stack",
      "claim": "He states the priority order twice in consecutive sentences and the two differ: first 'infrastructure, then list, then copy', then 'infrastructure, list, offer, and then copy'. He does not resolve whether offer sits third or above the whole stack. What is constant across both statements is that infrastructure is first and copy is last, so effort past the point where copy clears the bar has better homes.",
      "selfReported": true
    },
    {
      "label": "Cold Email Lab §8 — reply-rate benchmark",
      "claim": "Reply rate at or above 1 percent of emails sent is the target; 0.9 percent is close enough, and 0.5 percent or below indicates a deliverability problem rather than a copy problem. No 25 percent reply figure appears anywhere in the source and none should be attributed.",
      "selfReported": true
    },
    {
      "label": "Cold Email Lab §8 — the denominator rule",
      "claim": "Reply rate is total replies divided by total emails sent, never a share of leads contacted. A live campaign showing roughly 300 replies on about 29,000 sends is 1.1 percent, while the sending tool displayed 3 percent because it divided by leads across three sequence steps. Out-of-office replies are included in the calculation.",
      "selfReported": true
    },
    {
      "label": "Cold Email Lab §8 — positive reply benchmark",
      "claim": "Positive replies should exceed 5 percent of replies; the observed customer spread is 5 to 15 percent, averaging about 10 percent. Below 5 percent, investigate list quality first (named most common), then the offer (named the big lever), then the script (named as rarely the main driver if you followed best practices), and consider that the market itself may be structurally poor — he names software dev agencies, IT service providers and expensive enterprise products as verticals to abandon rather than grind.",
      "selfReported": true
    },
    {
      "label": "Cold Email Lab §7 — booking benchmark",
      "claim": "Roughly 20 to 30 percent of positive replies become meetings; relentless multichannel follow-up is claimed to lift this materially, though two lessons give ranges (30 to 50 percent, and 20 to 30 percent) that do not reconcile.",
      "selfReported": true
    },
    {
      "label": "Cold Email Lab §8 — north star",
      "claim": "Roughly 3,000 emails sent per booked meeting; about one positive reply per 700 sends; roughly one in five repliers books. Best observed customer cases book off as few as 300 sends, others need 5,000 or more.",
      "selfReported": true
    },
    {
      "label": "Cold Email Lab §8 — significance threshold",
      "claim": "Do not diagnose a campaign before 3,000 emails have been sent, ideally 5,000 to 10,000; a low reply rate on a small send is usually just insufficient send.",
      "selfReported": true
    },
    {
      "label": "Cold Email Lab §4 — subject line testing",
      "claim": "Dozens, probably hundreds of subject lines tested, with negligible difference in outcome; subject-line obsession appears on the list of things that do not drive results.",
      "selfReported": true
    },
    {
      "label": "Cold Email Lab §9 — split-test sample floor",
      "claim": "At least three variations of email one before launch, at roughly 2,000 to 3,000 prospects per variation, which puts a three-variant test at 6,000 or more people in the campaign. Do not split test at all if the list is too small to support it; he skipped testing on his own demonstrated campaign for exactly that reason.",
      "selfReported": true
    },
    {
      "label": "Cold Email Lab §6 — demonstrated campaign",
      "claim": "3,000 emails sent over three days in a hyper-specific niche produced 8 leads and 4 booked calls. This is a lead-and-call count, not a reply rate.",
      "selfReported": true
    },
    {
      "label": "Cold Email Lab §12 — segmentation",
      "claim": "Some customers get two to five times better responses purely from segmenting, and segmenting has rarely if ever made results worse. The figure is unevidenced within the lesson itself.",
      "selfReported": true
    },
    {
      "label": "Cold Email Lab §8 — bounce and list quality",
      "claim": "Bounce rate under 3 percent is healthy, above 5 percent needs immediate action. Open 20 random sites from the list: if more than 20 percent are not genuine targets, replace the list before changing anything else.",
      "selfReported": true
    },
    {
      "label": "Cold Email Lab §11 — channel-fit floors",
      "claim": "An ideal minimum lifetime value of about $10,000, worked as roughly $2,000 a month retained for about five months, and a budget floor of about $500 a month, which he says buys roughly 1,000 sends a day. Below $500 he says any marketing will be hard. The four fit factors are additive rather than pass/fail: failing all of them is what actually kills the channel.",
      "selfReported": true
    },
    {
      "label": "30-Day First-Client Playbook — personalization uplift",
      "claim": "Reply rates moved from about 2 percent to 5 to 10 percent or more with a personalized opening line, with a best campaign around 20 percent and an average uplift of about 2.5x.",
      "selfReported": true
    },
    {
      "label": "30-Day First-Client Playbook — offer wrappers",
      "claim": "A risk-reversed offer is claimed to lift reply rate up to 10x versus none. Two worked examples: a free 500-word blog post across roughly 20,000 emails at about 8 percent reply rate, and an outcome guarantee at a best reply rate of 7 percent across a few hundred emails.",
      "selfReported": true
    },
    {
      "label": "30-Day First-Client Playbook — reply speed",
      "claim": "A five-minute reply is claimed to convert around 400 percent higher, and the notification path is built six days before launch so the first send can be answered that fast.",
      "selfReported": true
    },
    {
      "label": "Maker School six-month arc — reply-rate floor",
      "claim": "Five real campaigns ran at 4.8, 6.0, 6.1, 6.3 and 11.6 percent, and 4 to 5 percent is stated as sufficient: below the floor fix the message, at or above it the constraint is volume rather than copy.",
      "selfReported": true
    },
    {
      "label": "Maker School six-month arc — the incumbent and challenger ladder",
      "claim": "Six live sequences are cut to one winner, and one fresh challenger is written the next day, giving a permanent one-incumbent, one-challenger ladder so the campaign cannot plateau on a sequence nobody revisits. The losing sequence in each niche is turned off rather than left running.",
      "selfReported": true
    }
  ],

  knownTensions: [
    {
      "tension": "Sequence length. The primary cold email source caps a cold sequence at three emails and argues the fourth touch is worthless, while a delivered five-touch sequence built for a small, high-value market runs two touches past that cap and justifies it on the grounds that the prospect pool is finite and each name is worth a five-figure engagement.",
      "resolution": "Default to three. Where the pool is genuinely small, the source's own answer is not more touches but a resting list: re-sequence the same names in a fresh short campaign every two to three months, which multiplies a fixed universe several times over without adding exposures per prospect. Go to four or five only after that option has been taken and is still not enough, and record it as a deliberate departure rather than as method. The same source names a small market as a reason not to use the channel at all, so depth-instead-of-breadth is a wager, not an application of the doctrine."
    },
    {
      "tension": "Subject lines. One source says under three words, plain, no tricks, and stop optimizing. Another says do whatever it takes to get the email opened, even if it is hacky, because plausible deniability is your friend, and supplies '[firstName], question' as the template.",
      "resolution": "Plain wins, on the stronger evidence: hundreds of tested lines with negligible difference means a hacky line buys nothing and costs credibility with a careful reader. Never fabricate a 're:' in either direction."
    },
    {
      "tension": "Personalization. One source says relevance is manufactured upstream in list construction and that no AI or personalization hack rescues a wide list. Another reports reply rates moving from about 2 percent to 5 to 10 percent by generating an opening line per prospect, an average uplift of about 2.5x.",
      "resolution": "Both are true of different things. Build the list so that one specific true sentence exists for every name, then write that sentence. A generated icebreaker sitting on top of a wide, unsegmented list is exactly the case the first source rejects, and exactly the case the second source's uplift figure was not measured on."
    },
    {
      "tension": "Reply speed. One source says respond within the hour and shows a week-old interested reply as the counter-example. Another builds infrastructure for a five-minute reply and claims roughly 400 percent higher conversion at that speed. A delivered plan commits to two hours because the sender is in a different hemisphere from the buyer.",
      "resolution": "Commit to the fastest window you can actually sustain and then keep it. A kept two-hour commitment beats a broken one-hour commitment, and both beat an inbox nobody is watching."
    },
    {
      "tension": "Reply-rate benchmarks. One source sets the floor at 1 percent and calls 0.5 percent a deliverability failure. Another treats 4 to 5 percent as sufficient and shows campaigns at 4.8 to 11.6 percent.",
      "resolution": "They are different denominators, not different standards. The 1 percent floor is replies divided by emails sent; the 4 to 5 percent figures read as replies per prospect contacted, which is roughly the number of touches larger. Convert to sends before comparing anything, and expect your sending tool to report the inflated version."
    },
    {
      "tension": "Email length. The primary source wants 50 words over 100 and treats five to ten sentences as fatal. A delivered sequence written for a skeptical, long-tenured buyer runs every touch between 129 and 207 words, on the argument that the credibility purchase cannot be made in fifty words.",
      "resolution": "Do not concede and do not assume. The pack's ceilings are set at the doctrine, roughly 450 characters for email one, so a long version is a deliberate override rather than something the validator quietly permits. Write the short version and the long version of the first email and run them against each other; the compression must keep the observation line and the single hardest credibility clause and drop everything else. Whichever wins, the length is then defended by evidence rather than by argument."
    },
    {
      "tension": "Testing discipline against sample size. The doctrine says write at least two versions of email one and race them, and the source's own floor is roughly 2,000 to 3,000 prospects per variation. Most users of this pack will have a list an order of magnitude smaller than that.",
      "resolution": "Below a few thousand prospects per variation you are reading qualitative signal, not statistics. Still write two versions, because the alternative is a sequence nobody ever revisits, but do not declare a winner off a few hundred sends, do not diagnose anything before 3,000 sends, and where the list is genuinely too small to support a test the source says run one version and skip the test rather than pretend."
    },
    {
      "tension": "Stopping on reply versus chasing an interested lead. One rule states absolutely that any reply pauses everything and no automated send ever goes to that address again. The other prescribes an automated two-step chase fired at leads who replied but never booked. Those cannot both stand as written.",
      "resolution": "Split the two systems, and let the split also carry the link ban. The cold sequence stops permanently on any reply, and no message sent before a reply carries a link. A separate interested-lead chase, tagged and tracked apart from the campaign, is permitted, always with the first response sent by hand, and a booking link is legitimate there because it sits inside a live conversation. Never run both against the same thread."
    }
  ],
};
