// AUTO-GENERATED from packs.source.json by scripts/genPacks.mjs. Do not edit by hand.
//
// a LinkedIn connection request plus a short DM sequence with reply branches
//
// Every law carries the source it came from. Where a source is one operator's
// account of their own results rather than a measurement, selfReported is true
// and the UI shows it as a claim.

import type { MethodPack } from '../types';
import { UNIVERSAL_BANNED } from '../validate';

export const linkedinPack: MethodPack = {
  id: "linkedin",
  version: "1.1.0",
  label: "a LinkedIn connection request plus a short DM sequence with reply branches",

  thesis: "LinkedIn outreach is one person writing to one named person in a channel where the reader can see exactly who you are, check what you claim, and recognise instantly whether the same message went to four hundred other people. That makes it the wrong channel for volume and the right channel for precision: a connection request plus at most three short messages, each of which has to survive being read on a phone by someone who owes you nothing. It is not email in a different wrapper — there is no subject line to hide behind, the note is capped at a couple of sentences, a rejected request is a door that stays shut, and the account carrying all of it is your identity rather than a replaceable sending domain. This pack governs one job only: earning a first reply from a stranger, and handing the conversation to a human the moment one arrives. It is not for nurturing warm contacts, not for posting content, and not for anything after the reply — those are different activities with different rules, and applying cold-sequence doctrine to a live conversation is how good conversations get killed.",

  primeDirective: "Every message before a reply exists to earn a reply. If a line asks the reader for time, attention or a click they have not yet agreed to give, cut it.",

  laws: [
  {
    id: "replyNotMeeting",
    rule: "Ask for a reply, never a meeting, before they have engaged. Every cold touch ends on a question answerable in one word at no cost to them.",
    because: "A cold call ask makes the reader pay with time before you have given them a reason to spend it. A reply costs one sentence, so it is the only ask a stranger can say yes to cheaply, and it is what makes silence informative rather than ambiguous.",
    source: {
      "label": "Cold Email Lab — email anatomy, the CTA rule",
      "claim": "A cold CTA must be answerable in one word, cost the reader nothing, and offer something rather than request time; a meeting request, a demo request and a link click are named as the three bad CTAs.",
      "selfReported": false
    },
  },
  {
    id: "firstTouchNeverPitches",
    rule: "Put no offer, mechanism, pricing, call ask or link in the connection note or the first message, and close that message on a question that sorts intent rather than requests time.",
    because: "The first touch has one job and adding a second one costs it the first; a pitch in the opening move tells the reader the research was a pretext. A closing question with a costless exit gets no answer, while a genuine either/or about how their business actually works is easy to answer and tells you whether to continue.",
    source: {
      "label": "Practitioner sequence (unsent draft), touch 1",
      "claim": "Touch 1 carries zero offer, zero mechanism, zero call ask and zero link, and closes on a true intent-sorting binary with no costless exit: both answers keep the conversation alive, and one of them is a qualified lead the moment it arrives. This is a design specification in a private plan document that has never been sent and has no campaign data behind it.",
      "selfReported": true
    },
  },
  {
    id: "observationLine",
    rule: "Open with one specific, true fact about this person or their business that only real research produces and that could be checked in ninety seconds.",
    because: "This line is the entire proof that a human wrote the message. If it could be sent unchanged to any other prospect, everything after it reads as broadcast.",
    source: {
      "label": "Practitioner sequence (unsent draft), the observation line",
      "claim": "The observation line carries more weight than every other line combined; it must be something only real research produces, verifiable in ninety seconds, and about them. This is an assertion in a private plan document that has never been sent and has no campaign data behind it.",
      "selfReported": true
    },
  },
  {
    id: "leadWithRecognisedPain",
    rule: "Lead with a problem the reader would recognise as their own sentence, in language they would use about their own business.",
    because: "Pain stated in the reader's own language reads as understanding and becomes their statement rather than your assertion, which is what buys permission to push.",
    source: {
      "label": "Acquisition Playbook §8 (LRP)",
      "claim": "Mirroring the pain back in the buyer's own words proves you heard it and makes the pain their statement rather than your assertion. Note the source describes this inside a live discovery conversation, not a cold first touch; applying it to cold copy is a transfer across contexts.",
      "selfReported": true
    },
  },
  {
    id: "neverFabricateFamiliarity",
    rule: "Never claim they told you, said or mentioned something they did not.",
    because: "Fabricated familiarity is checkable, and it ends the conversation the moment it is checked. This is pack doctrine and carries no citation: the sources govern what to say, not whether it is true.",
    source: {
      "label": "Pack doctrine (no source)",
      "claim": "No source in the six documents addresses truthfulness in a cold touch. This rule is the pack's own and deliberately does not borrow another law's citation.",
      "selfReported": false
    },
  },
  {
    id: "youOverI",
    rule: "Use \"you\" more than \"I\". Put the reader's situation before anything about you.",
    because: "Credentials-first openings make the message about the sender, and the reader has no reason yet to care about the sender.",
    source: {
      "label": "Cold Email Lab — copy principles",
      "claim": "Use \"you\" more than \"I\"; credentials-first openings make the email about the sender, so callout and value proposition come first and credibility after.",
      "selfReported": false
    },
  },
  {
    id: "shortestVersion",
    rule: "Cut to the shortest version that still carries the observation, the point and the ask. Prefer fifty words to a hundred.",
    because: "These are read on a phone by someone with no obligation to finish. Length past the point is the most common reason a good message is never read.",
    source: {
      "label": "Cold Email Lab — copy principles",
      "claim": "As short as possible while still communicating value — 50 words instead of 100 if you can; a five- or ten-sentence email gets glanced at and discarded, or not read at all.",
      "selfReported": true
    },
  },
  {
    id: "giveOutright",
    rule: "Where you can give something outright — an example, a short list, a teardown — give it unasked and unconditioned rather than dangling it in exchange for a call.",
    because: "A free thing handed over demonstrates accuracy instead of claiming it, and it costs the reader nothing to accept. Making it conditional converts a gift into a trade, which is the move they have seen a thousand times.",
    source: {
      "label": "Cold Email Lab — the offer-strength ladder",
      "claim": "Strengthening the offer outperforms strengthening the words; if you can make it free or performance-based, do it. The more free-sounding and valuable the ask, the better the response — an offer to send a free example is claimed to outperform a call request \"every single time\".",
      "selfReported": true
    },
  },
  {
    id: "oneMatchedProof",
    rule: "Use proof from a business the reader would recognise as like theirs; in-niche proof is described as roughly twice as effective as out-of-niche.",
    because: "A result the reader can map onto their own scale beats a larger result they cannot.",
    source: {
      "label": "Six-Month Arc M2",
      "claim": "In-niche proof is described as roughly twice as effective as out-of-niche proof.",
      "selfReported": true
    },
  },
  {
    id: "proofFallbackLadder",
    rule: "With no in-niche result, step down the ladder rather than inventing one: an out-of-domain result with revenue, then an impressive association without revenue, then something you implemented in your own business and measured. Never fabricate.",
    because: "Having no case studies is usually familiarity blindness rather than absence of accomplishment, so mine your own documentation before you conclude you have nothing. A weaker true proof still gives the reader something to check; a fabricated one surfaces eventually and costs more than it bought.",
    source: {
      "label": "Maker School M1 §5.5 (case-study construction)",
      "claim": "Four-tier fallback: in-domain with revenue outcomes, out-of-domain with revenue outcomes, impressive associations without revenue, then implement a supplied template in your own business and claim the measured delta. Mine documentation for numbers rather than estimating from memory; avoid fabricating claims, though conservative estimates grounded in reality are acceptable.",
      "selfReported": false
    },
  },
  {
    id: "substantiateOrCut",
    rule: "Attach a number, a named outcome or a concrete detail to every claim you make about yourself. If you cannot, delete the claim.",
    because: "Anyone can assert. A claim without something behind it gives the reader no reason to believe and costs you the credibility the observation line just bought.",
    source: {
      "label": "Cold Email Lab — copy principles",
      "claim": "Everyone can make a claim; not everyone can substantiate one. A value proposition with no credibility element gives no reason to believe.",
      "selfReported": false
    },
  },
  {
    id: "noLinkBeforeReply",
    rule: "Send no link in the connection note or in any message before the reader has replied.",
    because: "A link is an ask dressed as a convenience, and in a social channel it is the single clearest signal that the message is promotion rather than correspondence.",
    source: {
      "label": "Pack doctrine (no source)",
      "claim": "No source restricts links in a DM. The cited community material describes the public post that precedes a DM, and the Cold Email Lab bars links on deliverability grounds, which has no LinkedIn equivalent. This rule is the pack's own, kept on promotion-signalling grounds, and deliberately does not borrow either citation.",
      "selfReported": false
    },
  },
  {
    id: "noHedging",
    rule: "Write from a position of strength. No apology for the message, no disclaimer about your experience, no asking permission before the ask.",
    because: "Every hedge is another invitation to defer. Naming your own inexperience unprompted hands the reader a reason to stop reading that they had not thought of.",
    source: {
      "label": "Maker School M1 §5.1 (application do-nots)",
      "claim": "Never say \"I just started\", \"I'm in school\" or \"I have no idea how to do this\".",
      "selfReported": false
    },
  },
  {
    id: "replyStopsEverything",
    rule: "Any reply stops the sequence immediately. No further scheduled message goes to that person, and a human writes the next one by hand.",
    because: "A scheduled message arriving on top of a live conversation destroys everything the earlier messages built, and readers can tell when they are talking to automation.",
    source: {
      "label": "Practitioner sequence (unsent draft), reply handling",
      "claim": "Any reply pauses the sequence immediately; no further automated send goes to that address, ever, and a human takes the conversation from that point. This is a design rule in a private plan document that has never been sent and has no campaign data behind it.",
      "selfReported": true
    },
  },
  {
    id: "answerThenAsk",
    rule: "In the first human reply, answer what they actually asked before anything else, then ask for the next step in the same message: three specific slots in their time zone, an offer to work from their calendar, and the link last. Never ask when they are free.",
    because: "Answering and stopping is the most common way an interested lead dies, and most people will never ask to book, so the initiative has to be yours. Asking for availability creates a second reply-wait, and the opportunity cools inside it.",
    source: {
      "label": "Cold Email Lab — the three-step reply framework",
      "claim": "Answer the question they actually asked, position the call as useful to them, then pitch three to four specific time slots in the prospect's own time zone with the calendar link only as an \"if easier\" fallback. The single biggest beginner mistake, named as such, is answering the question and never asking for the call.",
      "selfReported": true
    },
  },
  {
    id: "stopAtThree",
    rule: "Stop at three DMs after the connection request. Spend the effort of a fourth on a new prospect instead.",
    because: "Interest is front-loaded into the first message; later touches mostly reach people who already decided, while complaints and blocks accumulate against your account. Count the connection request as a touch: three DMs after it is four cold touches, one past the cited cap of three. That is a deliberate departure, taken because LinkedIn's pool per operator is small and each prospect carries more research — not an application of the doctrine, and never taken past four.",
    source: {
      "label": "Cold Email Lab — sequence length and diminishing returns",
      "claim": "Three cold touches maximum to a stranger. Interest is front-loaded into email one; by emails three and four you are mostly reaching uninterested people, the fourth touch is effectively worthless, and complaints damage the sending asset. Reallocate volume from follow-ups to fresh prospects.",
      "selfReported": true
    },
  },
  {
    id: "lastTouchRedirects",
    rule: "Make the last message a redirect ask: if it is not you, who is it.",
    because: "A redirect is easier to answer than another request for their own attention, and it often produces the right person.",
    source: {
      "label": "Cold Email Lab — sequence length and diminishing returns",
      "claim": "The final follow-up is a deliberately short pattern interrupt; the stated preference is a referral redirect asking whether someone else at the organisation is the right person, because it is short and to the point.",
      "selfReported": true
    },
  },
  {
    id: "invitationCeiling",
    rule: "Hold weekly connection requests well below the platform's invitation cap, watch the acceptance rate, and withdraw invitations still pending after three weeks. Check the current cap before you scale.",
    because: "A burned email domain is replaceable — delete it, buy a new one, warm up, relaunch. A restricted LinkedIn account is not: it carries your identity, your history and the profile this pack assumes the reader will check. A low acceptance rate and a large pile of pending invitations are the two signals that produce a restriction, and a restriction costs the whole channel.",
    source: {
      "label": "LinkedIn platform limits, checked August 2026",
      "claim": "LinkedIn enforces a weekly invitation cap — widely reported at roughly 100 invitations per week for standard accounts — and restricts accounts with persistently low acceptance rates or large volumes of unanswered pending invitations. These figures are platform policy rather than a measured result, and they move; verify against LinkedIn's current documentation before writing volume plans to them.",
      "selfReported": false
    },
  },
  ],

  banned: [
    ...UNIVERSAL_BANNED,
  {
    id: "openerCliche",
    label: "Cold-open cliché",
    pattern: new RegExp("\\b(?:caught\\s+my\\s+eye|came\\s+across\\s+your\\s+(?:profile|page|website|site|company|firm|business|post)|stumbled\\s+(?:up)?on\\s+your|hope\\s+(?:you(?:['’]re|\\s+are)?\\s+(?:well|doing\\s+well)|this\\s+(?:email\\s+|message\\s+|note\\s+)?finds\\s+you))", "i"),
    because: "These openers are named as banned because every one of them can be sent unchanged to any stranger, which is the opposite of what the first line has to prove. The apostrophe class covers the typographic U+2019 that LinkedIn's composer produces, so \"hope you’re well\" does not slip past.",
    level: "hard",
  },
  {
    id: "brandingCompliment",
    label: "Compliment on their logo, branding or web design",
    pattern: new RegExp("\\b(?:i\\s+(?:love|really\\s+like)|love|really\\s+like|admire|nice|great)\\s+(?:your|the)\\s+(?:new\\s+)?(?:logo|branding|web\\s?site\\s+design|web\\s+design)\\b|\\byour\\s+(?:web\\s?site|site|branding|logo)\\s+(?:looks|is)\\s+(?:great|amazing|awesome|beautiful|stunning|fantastic|really\\s+nice)\\b", "i"),
    because: "A compliment about their marketing tells the reader a stranger sat and judged their marketing. The possessive is required and bare \"website\" is excluded, so comparatives and traffic observations — \"like the website export\", \"great website traffic\" — are not blocked; those are exactly the specific observations the observation line asks for.",
    level: "hard",
  },
  {
    id: "selfDeprecation",
    label: "Hedge or apology about yourself",
    pattern: new RegExp("\\b(?:(?:sorry|apologies)\\s+(?:to|for)\\s+(?:the\\s+)?(?:bother|interrupt|cold|random|unsolicited|intrusion)|i\\s+just\\s+started\\s+(?:out|freelancing|my\\s+(?:business|agency|career))|i(?:['’]m|\\s+am)\\s+(?:still\\s+)?(?:new\\s+to\\s+this|just\\s+starting\\s+out)|i\\s+know\\s+you(?:['’]re|\\s+are)\\s+(?:really\\s+)?busy)", "i"),
    because: "Naming your own weakness unprompted hands the reader a reason to stop that they had not thought of. The source names 'I just started' and 'I'm in school' directly; the other hedges here are the same move.",
    level: "hard",
  },
  {
    id: "availabilityAsk",
    label: "Asking for their availability instead of proposing times",
    pattern: new RegExp("\\b(?:when\\s+(?:are|would)\\s+you\\s+(?:be\\s+)?(?:free|available)|let\\s+me\\s+know\\s+(?:a\\s+time|when\\s+you(?:['’]re|\\s+are)\\s+free|what\\s+works)|what\\s+does\\s+your\\s+(?:calendar|schedule)\\s+look\\s+like)\\b", "i"),
    because: "Asking for availability creates a second reply-wait, which is named as where most bookings are lost. Propose three specific slots instead. The apostrophe class covers the typographic U+2019.",
    level: "hard",
  },
  {
    id: "corporateBoilerplate",
    label: "Unfalsifiable corporate boilerplate",
    pattern: new RegExp("\\b(?:cutting[\\s-]edge|state[\\s-]of[\\s-]the[\\s-]art|best[\\s-]in[\\s-]class|world[\\s-]class|industry[\\s-]leading|next-gen(?:eration)?|next\\s+gen\\b|turnkey|game[\\s-]?chang\\w+|revolutioni[sz]\\w*|innovative\\s+solutions)\\b", "i"),
    because: "An abstract subject plus an unfalsifiable claim is what makes a message read as an advertisement rather than as correspondence. Suffixes are allowed so \"revolutionizing\" and \"game changers\" fail alongside their base forms; unhyphenated \"next generation\" is left alone because it is ordinary English.",
    level: "hard",
  },
  {
    id: "hypePromise",
    label: "Hype promise with nothing behind it",
    pattern: new RegExp("\\b(skyrocket|explode your \\w+|guaranteed results|no[ -]brainer)\\b", "i"),
    because: "Every claim needs a number, a named outcome or a concrete detail behind it. These phrases assert an outcome that cannot be substantiated.",
    level: "hard",
  },
  {
    id: "unfilledMergeField",
    label: "Unfilled merge field or placeholder",
    pattern: new RegExp("\\{\\{[^}]*\\}\\}|\\*\\|[A-Za-z_]{2,20}\\|\\*|\\{(?:first ?name|last ?name|full ?name|company ?name|company|name|city|state|country|title|industry|role|website|domain|position)\\}|%(?:first ?name|last ?name|full ?name|company ?name|company|name|city|state|country|title|industry|role|website|domain|position)%|<<(?:first ?name|last ?name|full ?name|company ?name|company|name|city|state|country|title|industry|role|website|domain|position)>>|\\[(?:first ?name|last ?name|full ?name|company ?name|company|name|city|state|country|title|industry|role|website|domain|position)\\]", "i"),
    because: "A visible placeholder proves the message was machine-assembled and never read, which is the exact impression the whole sequence exists to avoid. All five prevalent dialects are covered — double brace, single brace, percent, Mailchimp pipe and angle bracket — and every single-delimiter branch is bound to a known field name so braces in pasted code or notes cannot match.",
    level: "hard",
  },
  {
    id: "followUpFiller",
    label: "Content-free follow-up",
    pattern: new RegExp("\\b(just (following up|checking in|wanted to (follow up|check in))|circling back|bumping this|touching base)\\b", "i"),
    because: "A follow-up that carries nothing new spends a touch and adds nothing. Send an insight, an example or a small win instead of a nudge.",
    level: "hard",
  },
  {
    id: "genericMeetingName",
    label: "Meeting named after the format instead of the value",
    pattern: new RegExp("\\b(?:quick\\s+(?:chat|call|sync)|discovery\\s+call|catch[\\s-]up\\s+call|let(?:['’]s|s)\\s+connect)\\b", "i"),
    because: "Naming the meeting after its format announces a pitch and adds friction with nothing in return. Name it after what the reader takes away. The apostrophe class covers the typographic U+2019, so \"let’s connect\" does not slip past.",
    level: "hard",
  },
  {
    id: "fabricatedFamiliarity",
    label: "Claiming they said something they did not",
    pattern: new RegExp("\\b(as you (mentioned|said|told me)|like you (mentioned|said)|you told me|you mentioned that)\\b", "i"),
    because: "In a cold touch this is a checkable falsehood and it ends the conversation when checked. Legitimate in a reply branch where they genuinely did say it, which is why this warns rather than blocks.",
    level: "soft",
  },
  {
    id: "linkBeforeReply",
    label: "Link in the message",
    pattern: new RegExp("https?://\\S+|\\bwww\\.[a-z0-9-]+\\.[a-z]{2,}", "i"),
    because: "No link belongs in any touch before the reader has replied. This pattern is scoped to the pre-reply steps only — connectionNote, openerDm, proofDm and closeFileDm. The validator must skip it on offerTimes, chaseBookingNudge and the other reply branches, where the link is mandated by the step's own constraints; until the schema carries step scoping on a pattern, treat a hit on those steps as noise rather than a finding.",
    level: "soft",
  },
  ],

  structure: [
  {
    key: "connectionNote",
    label: "Connection request note",
    group: "The sequence",
    purpose: "Get the request accepted by someone who can see at a glance that it is not a broadcast.",
    day: 0,
    maxChars: 200,
    constraints: [
      "One sentence carrying the specific observation, and nothing else.",
      "No offer, no service description, no question, no link.",
      "Never explain that you would like to connect or grow your network.",
      "200 characters is the free-account allowance; Premium accounts get 300. Write to 200 unless you have confirmed the higher cap on this account, and re-check the cap before relying on it.",
      "If the observation cannot survive the character limit, send the invite with no note rather than truncating it into a generic line.",
      "Withdraw invitations still pending after three weeks. A large pending pile plus a low acceptance rate is what puts an account under restriction."
    ],
  },
  {
    key: "openerDm",
    label: "First DM, sent after the request is accepted",
    group: "The sequence",
    purpose: "Earn a reply and nothing else.",
    day: 1,
    maxChars: 600,
    constraints: [
      "Open on the verified observation, in the first line, before anything about you.",
      "Name one problem in language the reader would use about their own business.",
      "No offer, no mechanism, no pricing, no proof point, no link, no call ask.",
      "Close on one intent-sorting question answerable in a word or a sentence.",
      "Under 100 words."
    ],
  },
  {
    key: "proofDm",
    label: "Second DM",
    group: "The sequence",
    purpose: "Give the reader one reason to believe you specifically, matched to their situation.",
    day: 4,
    maxChars: 700,
    constraints: [
      "Reference the first message in one clause; do not restate it.",
      "Exactly one proof point, from a business the reader would recognise as like theirs. The one-proof limit is an editorial constraint of this pack, not a sourced law — the citation supports only the matching requirement.",
      "State the result as a number or a named outcome.",
      "With no in-niche result, step down the ladder — an out-of-domain result with revenue, then an impressive association without revenue, then a result you produced and measured in your own business. Name the next rung down rather than leaving the section empty.",
      "Close with an offer to send something concrete and free, phrased so that \"yes\" is the whole reply.",
      "Different ask from the first message, so it reads as new information rather than a repeat.",
      "No link. No call ask."
    ],
  },
  {
    key: "closeFileDm",
    label: "Third DM, closing the file",
    group: "The sequence",
    purpose: "Convert silence into a dated answer or a redirect.",
    day: 9,
    maxChars: 500,
    constraints: [
      "Ask who the right person is if it is not them. This redirect is the sourced element of the message.",
      "Frame it as closing the file and say plainly that this is the last message. Pack doctrine, not sourced — the cited material prescribes only a short pattern interrupt.",
      "Offer two or three face-saving exits, each answerable in one word. Pack doctrine, carried over from the practitioner sequence's final touch.",
      "Promise one return at a named time, and keep it to once.",
      "No new pitch, no link, no guilt."
    ],
  },
  {
    key: "answerTheQuestion",
    label: "Reply branch, interested: answer what they asked",
    group: "If they are interested",
    purpose: "Answer the question they actually asked, before anything else.",
    maxChars: 400,
    constraints: [
      "One or two plain sentences, and nothing attached to them.",
      "If they asked price, give a range and say what moves it. Never defer price to a call.",
      "Skip only if there was no question.",
      "Written and sent by a human."
    ],
  },
  {
    key: "positionTheCall",
    label: "Reply branch, interested: position the next conversation",
    group: "If they are interested",
    purpose: "Make the next conversation sound useful to them rather than like a sales meeting.",
    maxChars: 250,
    constraints: [
      "One line on what they walk away with.",
      "Name the meeting after that take-away, never after its format.",
      "Do not restate the offer or re-argue the value."
    ],
  },
  {
    key: "offerTimes",
    label: "Reply branch, interested: propose the times",
    group: "If they are interested",
    purpose: "Make it possible to book without a second exchange.",
    maxChars: 300,
    constraints: [
      "Propose three specific slots in their time zone.",
      "Offer to work from their calendar if none of them fit.",
      "Put the booking link last, as the fallback rather than the ask.",
      "Never ask when they are free.",
      "This is a reply-branch step, so the link belongs here; a pre-reply link warning fired on this step is noise."
    ],
  },
  {
    key: "replyNotNow",
    label: "Reply branch: not now",
    group: "Other replies",
    purpose: "Convert a deferral into a dated return.",
    constraints: [
      "Accept the deferral in one sentence, without argument.",
      "Get a month or a date and confirm you will come back then, once.",
      "Leave something behind that costs them nothing to accept.",
      "No second ask in this message."
    ],
  },
  {
    key: "replyWrongPerson",
    label: "Reply branch: wrong person",
    group: "Other replies",
    purpose: "Take the referral and exit clean.",
    maxChars: 300,
    constraints: [
      "Thank them in one line and ask who the right person is.",
      "Ask whether you may say they pointed you there.",
      "Never forward or quote the original thread to the new person.",
      "Start the referred person at the connection note with a fresh observation of their own."
    ],
  },
  {
    key: "replyHostile",
    label: "Reply branch: hostile",
    group: "Other replies",
    purpose: "Remove them and stop.",
    maxChars: 160,
    constraints: [
      "One line confirming removal.",
      "No defence, no explanation, no counter-offer.",
      "Suppress the person permanently, and everyone else at that company."
    ],
  },
  {
    key: "chaseStatusCheck",
    label: "Chase after interest that went quiet: status check",
    group: "If interest goes quiet",
    purpose: "Ask a stalled but genuinely interested person where things stand, in a way that is answerable.",
    maxChars: 300,
    constraints: [
      "Send two days after the unanswered reply.",
      "Two lines, and explicitly grant permission to decline — that is what makes it answerable and therefore what makes it work.",
      "A human sends this one.",
      "Re-enter at the stage the person previously reached; never drag them back to the start of the sequence.",
      "Everything stops the moment they answer."
    ],
  },
  {
    key: "chaseBookingNudge",
    label: "Chase after interest that went quiet: booking nudge",
    group: "If interest goes quiet",
    purpose: "Give a still-warm lead the single easiest way to book.",
    maxChars: 160,
    constraints: [
      "Send two days after the status check.",
      "The entire content is the booking link.",
      "Stop here. Never chase past this message, and never drop a positive reply after a single unanswered attempt.",
      "If both go unanswered, file the person for a dated reactivation sweep rather than restarting the cold sequence — reviving someone who already engaged costs nothing to attempt.",
      "This is a reply-branch step, so the link belongs here; a pre-reply link warning fired on this step is noise."
    ],
  },
  ],

  evidence: [
    {
      "label": "Cold Email Lab, volume and outcomes",
      "claim": "Upwards of 10,000,000 cold emails sent over close to four years, over 1,000,000 per month currently on behalf of roughly 30 clients, and close to 4,000 sales meetings booked to date.",
      "selfReported": true
    },
    {
      "label": "Cold Email Lab — metrics and benchmarks",
      "claim": "Reply rate benchmark of 1% of emails sent; positive replies 5-15% of replies, averaging around 10%; booking rate 20-30% of positives; a north star of roughly 3,000 emails sent per booked meeting.",
      "selfReported": true
    },
    {
      "label": "Cold Email Lab — sequence length and diminishing returns",
      "claim": "One email to 10,000 people substantially outperforms ten emails to 1,000 people; the fourth touch is effectively worthless while spam complaints and reputation damage accumulate.",
      "selfReported": true
    },
    {
      "label": "Cold Email Lab — multichannel follow-up",
      "claim": "A LinkedIn connection request with a short note referencing the earlier message is recommended specifically because it proves a human is on the other end and takes two seconds; relentless multichannel follow-up is claimed to move booking rate from a ~20% baseline to 30-50%. The two ranges he gives across lessons do not reconcile.",
      "selfReported": true
    },
    {
      "label": "Cold Email Lab — segmentation",
      "claim": "Some customers get two to five times better responses purely from segmenting; he goes to pull up campaigns to evidence this and does not, so the figure is unevidenced within the lesson.",
      "selfReported": true
    },
    {
      "label": "Six-Month Arc M2, in-niche proof",
      "claim": "In-niche proof is described as roughly twice as effective as out-of-niche proof.",
      "selfReported": true
    },
    {
      "label": "Six-Month Arc M4, reply-rate floor",
      "claim": "Five supplied campaigns ran at 4.8%, 6.0%, 6.1%, 6.3% and 11.6% reply rate, with 4-5% declared sufficient on the reasoning that one reply per twenty messages simply means sending twenty times the volume.",
      "selfReported": true
    },
    {
      "label": "Six-Month Arc M6 §4d, follow-up economics",
      "claim": "Past clients reactivate at 10-15% of the old base per quarter at $0 acquisition cost, against 5-15% of budget for new acquisition; re-enter people at the stage they previously reached rather than dragging everyone back to the start.",
      "selfReported": true
    },
    {
      "label": "Six-Month Arc M6 §3, pipeline dwell",
      "claim": "A deal sitting in Proposal Sent for more than 72 hours without follow-up has a much higher chance of dying. The figure is scoped to that stage, not to deals generally.",
      "selfReported": true
    },
    {
      "label": "Maker School M1, reply speed",
      "claim": "Instant replies are claimed to convert at around the 400% mark higher, and the reply-notification path is built six days before launch so a five-minute reply is possible from the first send.",
      "selfReported": true
    },
    {
      "label": "Practitioner sequence (unsent draft), the observation line",
      "claim": "The observation line carries more weight than every other line combined; the most common and most expensive failure mode is replies near zero with healthy deliverability, which traces to a generic opener. The document is a private plan that has never been sent, and its targets come from general cold-email norms rather than from campaign data.",
      "selfReported": true
    },
    {
      "label": "LinkedIn platform invitation limits, checked August 2026",
      "claim": "LinkedIn enforces a weekly invitation cap — widely reported at roughly 100 invitations per week for standard accounts — and restricts accounts with persistently low acceptance rates or large volumes of unanswered pending invitations. Platform policy rather than a measured result, and it moves; verify before writing volume plans to it.",
      "selfReported": false
    }
  ],

  knownTensions: [
    {
      "tension": "Note or no note on the connection request. The invitation note is capped at 200 characters on free accounts and 300 on Premium — roughly one to two sentences — and the cap has moved before, so verify it on the account you are actually sending from. A note lets the observation line do its work before the reader ever decides whether to accept, and the sources are unanimous that the specific observation is the highest-value element available. But a note also lets a busy reader classify the request as sales and decline it, where a blank invite is often accepted on profile alone and preserves the observation for the first DM, where there is room to use it properly.",
      "resolution": "Write to 200 characters unless you have confirmed 300 on this account. Send the note only when the observation survives that limit intact and is genuinely specific — a fact about their business that took real research. Send the invite blank when the best you have would be truncated into a generic line, and spend the observation in the first DM instead. Never split an observation across the note and the first message; a compressed version in the note makes the full version read as a repeat."
    },
    {
      "tension": "Three cold messages versus five. The course doctrine caps cold outreach at three messages on the argument that interest is front-loaded and later touches accumulate complaints while returns fall. The worked practitioner sequence runs five touches and defends it on the grounds that a high-value, finite prospect pool justifies depth per prospect over breadth.",
      "resolution": "This pack takes three DMs after the connection request. Counting the request as a touch, that is four cold touches — one past the cited cap, and it is labelled here as a departure rather than an application. The reasons: LinkedIn's pool per operator is small, the reader can see every prior message in one scroll, and the cost of a block is permanent where a burned sending domain is replaceable. Never take it past four, and never add a fifth on the argument that the sequence permits it."
    },
    {
      "tension": "How many times to propose. The Cold Email Lab prescribes three to four specific slots in the prospect's own time zone with the calendar link as an \"if easier\" fallback. The six-month arc's meeting-rate lever prescribes two proposed times plus an explicit offer to work from their calendar. The sources genuinely disagree, and each pack previously resolved it silently and differently, so a user running email and LinkedIn side by side got two numbers from one app for one behaviour, attributed to nobody.",
      "resolution": "Three, everywhere — this pack, the email pack and the marketplace pack — with the arc's offer to work from their calendar carried alongside it and the link last. Three sits inside the Lab's stated band and one above the arc's, and the arc's real mechanism is the calendar offer rather than the count. Where you deviate, deviate consistently across channels rather than per pack."
    },
    {
      "tension": "Position of strength versus honesty about being early. One source instructs writing with no hedging and names \"I just started\" as a line never to use. Another instructs transparency about being early on the grounds that it removes the credibility gap instead of pretending past it, and converts inexperience from a liability into a reason to help you.",
      "resolution": "Never volunteer inexperience unprompted in a cold touch — it answers a question the reader has not asked. When they ask directly, answer in one forward-facing line with the offer attached rather than an apology. Transparency is a reply-branch move, not an opener."
    },
    {
      "tension": "Give something away versus give away your work. The strongest documented lever is an offer that is free or risk-reversed, handed over unconditionally. But an unconditional giveaway is also a full discount, and one source names discounting as a mistake because it concedes the value figure you just walked them through was inflated.",
      "resolution": "Give away something that is cheap for you to produce and expensive for them to obtain — a short list, one worked example, a teardown of something already public. Never give away the deliverable itself. If getting a lot of yeses would put you out of business, the giveaway is the wrong size."
    },
    {
      "tension": "Personalisation in the copy versus relevance in the list. The observation line is the highest-value element in any message, and hand-writing it is what makes the first touch work. But the course position is that relevance is manufactured upstream in list construction and that no personalisation technique rescues a badly built list.",
      "resolution": "Both, in order. Build the list around a reason for reaching out that will actually appear in the copy — a hiring signal, a new location, a published position — so the observation line has something true to draw on before you sit down to write it. Hand-write the line anyway. When observation lines start feeling forced, the list is the thing to fix, not the sentence."
    },
    {
      "tension": "Reply within the hour versus reply well. One source sets the standard at within the hour and another at five minutes, both on the argument that speed to lead dominates. Neither is achievable for an operator in a different time zone from their market, and a missed promise is worse than a slower one.",
      "resolution": "State a window you will actually hold and hold it. A kept two-hour commitment beats a broken one-hour commitment. What is not negotiable: the first reply is written by a human, and no reply goes unanswered past one business day in the reader's calendar."
    }
  ],
};
