// The card at the top of every list, in plain words: what the list is,
// where a guest meets it on the night, what goes in each box, and one
// finished example in the shape of the boxes. Safe content throughout.
// No em dashes anywhere in here: Jon and Jenna read every word.

const CAT_EXAMPLES = {
  openers: {
    irwin: 'Oh! You came to talk to ME. Okay. Okay okay okay. Here is what I know.',
    boo: 'Closer. I won’t say it loudly.',
    granolia: 'Oh, a question. I have the book for this. *snrk.* Somewhere.',
    zimothy: 'I’ll be brief. Brevity is free.',
    salem: 'Hmph. You want to know what happened. I’ll tell you what happened.',
  },
  closers: {
    irwin: 'That is everything. I feel much lighter.',
    boo: 'That’s all you get.',
    granolia: 'Or was it the other way round. *snrk.* No. No, I had it right.',
    zimothy: 'That concludes the free portion.',
    salem: 'Mark it down. I’m not saying it twice.',
  },
  refusals: {
    boo: '(She waits, visibly, for you to become more interesting.)',
    granolia: 'Not now, dear, I am in the middle of a chapter. *snrk.* Come back when I have found my place.',
    zimothy: 'You are not a client. Clients have paperwork. You have a face.',
    salem: 'Go and do something useful. Then we’ll talk.',
  },
  smalltalk: {
    irwin: 'Somebody dropped a biscuit in 1898. I am still looking.',
    boo: 'The chandelier is doing its best. One admires effort.',
    granolia: 'The library has a draught. I have measured it. *snrk.* Twice.',
    zimothy: 'The clock in the hall runs four minutes slow. It is billed at full rate.',
    salem: 'The sun rises in the west here. Manor’s built peculiar. I’ve checked.',
  },
  status_lines: {
    irwin: ['IN', 'Sir Irwin adores you. He adores everyone. This is not a judgement, it is a fact of the house.'],
    boo: ['LOCKED', 'Boo remembers everyone who has ever wasted her evening. You are in danger of joining that list.'],
    granolia: ['IN', 'Granolia has decided you are a reader. She will tell you things, in roughly the right order.'],
    zimothy: ['WARMING', 'Zimothy has opened a preliminary file on you. It is thin, but it exists.'],
    salem: ['LOCKED', 'Salem has not seen you lift anything heavier than a glass. He is waiting.'],
  },
}

const CAT_NOTES = {
  openers: {
    irwin: 'Irwin is the dog: delighted, honest, cannot help telling you. Any greeting he gives should sound like a tail wagging.',
    boo: 'Boo is guarded, not snobbish. Short lines. She decides about you while she talks.',
    granolia: 'Granolia is the study nerd: bookish, forgetful, snorts (*snrk.*). She wants to help and mislays the details.',
    zimothy: 'Zimothy counts everything, including his words. Dry, precise, money in every sentence.',
    salem: 'Salem is the gruff groundskeeper. Mutters, certain he is right, suspicious of anyone who has not worked today.',
  },
}
CAT_NOTES.closers = CAT_NOTES.openers
CAT_NOTES.refusals = CAT_NOTES.openers
CAT_NOTES.smalltalk = CAT_NOTES.openers
CAT_NOTES.status_lines = {
  irwin: 'His affection is always full, so only an In line can ever show. One adoring line is all he needs.',
  boo: 'LOCKED is old burns behind society polish. WARMING is her noticing you. IN is the polish dropping.',
  granolia: 'Her warmth cannot be bought. She warms fastest to readers and learners. Even LOCKED stays kind.',
  zimothy: 'Standing is an account. LOCKED is no file. WARMING is credit cautiously extended. IN is full client privileges.',
  salem: 'He rates your work, not your charm. LOCKED means he has not seen you lift anything yet.',
}

const POOL_EXAMPLES = {
  room: 'the scullery', time: 'just past breakfast', duration: 'all afternoon', count: 'three times', place: 'the milliner’s', crowd: 'the whole household',
}
const POOL_NOTES = {
  room: 'Finish this: “a figure was heard in ___ at teatime”. A room in the house or on the grounds, small letters, starting with “the”, no full stop.',
  time: 'Finish this: “was seen in the hall at ___”. A time of day in words, small letters, never a date or a weekday.',
  duration: 'Finish this: “it went on for ___”. A span of time in words. Suspiciously precise and madly long both play.',
  count: 'Answer this: “how many times?” Just the tally, in words: “three times”, “a dozen”, “more often than was decent”.',
  place: 'Finish this: “the same tale was heard at ___ in town”. A shop or spot in town, never a room of the house. Start with “the” so it stays lowercase; a name inside keeps its capitals (“the shop by St Mary’s”).',
  crowd: 'It has to read both ways: “witnessed by ___” and “___ looked on”. People in general, never a guest, a cat or a name.',
}

const CARDS = {
  bios: {
    what: 'The fourteen people a guest can become tonight. Each one is a card.',
    where: 'Dealt at random when a guest taps their name at the door in Act 1. It stays on their phone under You through all seven acts.',
    howTo: 'Pick who, then write a line or two about how they behave. The fourteen names and jobs are fixed, because the game deals them and the cats judge the job. No costume: dealt at the door, nobody dresses up.',
    example: [
      { field: 'Who', text: 'Dorothy Rye' },
      { field: 'Who they are', text: 'Up since four. Has opinions about everyone else’s bread, and shares them.' },
    ],
    emptyState: 'Nothing yet. Pick a name and write who they are. Keep them clean on paper: no secrets, grudges or alibis, because anyone may be dealt the murderer or the victim.',
    doneLine: 'Fourteen characters, named and ready. The Manor can seat them all.',
  },
  npc_cards: {
    what: 'A short introduction to each of the four cats and to Sir Irwin.',
    where: 'Act 1, on the Cats tab of every phone, before anyone walks into a room and finds one of the five waiting.',
    howTo: 'Pick who, then two or three sentences about them, ending with where they keep themselves. The name and title are filled in for you.',
    example: [
      { field: 'Who', text: 'boo' },
      { field: 'About them', text: 'Arrived for a party some years back and has seen no reason to declare it over. She will learn your name before you learn hers. Found wherever the light is best.' },
    ],
    emptyState: 'No introductions yet. Five to write: Sir Irwin and the four cats.',
    doneLine: 'The household is introduced. Nobody will walk into a room unwarned.',
  },
  openers: {
    what: 'The first thing a cat says when a guest comes to talk to it. Pure personality, no facts.',
    where: 'The top line of every cat visit: Act 2, alone, and Act 4, in pairs. Sir Irwin speaks once more at cake in Act 5, on the living room TV.',
    howTo: 'One or two short sentences in this cat’s voice, as if a guest just sat down. It must work in front of any secret, so it cannot mention anything that happened.',
    example: [{ field: 'The greeting', text: CAT_EXAMPLES.openers.irwin }],
    emptyState: 'Nothing yet. Say hello the way this cat would, in a sentence or two.',
    doneLine: 'Every cat knows how to start. Eight ways each.',
  },
  closers: {
    what: 'The last thing a cat says after it has told what it knows.',
    where: 'The bottom line of every cat visit in Acts 2 and 4, right after the secret middle lands, and after Sir Irwin’s speech at cake in Act 5.',
    howTo: 'One short sentence that reacts to “what I just said” without knowing what it was. Say “that” or “it”, never what it was about.',
    example: [{ field: 'The sign-off', text: CAT_EXAMPLES.closers.irwin }],
    emptyState: 'Nothing yet. Finish the speech the way this cat would: short, in character, adding nothing.',
    doneLine: 'Every cat knows how to leave a room. Mostly before you do.',
  },
  refusals: {
    what: 'What a cat says when it will not talk to this guest yet.',
    where: 'Acts 2 and 4, when a guest tries a cat that does not like them enough. Their whole screen is this one line, so it has to be worth reading.',
    howTo: 'One or two sentences, funny, in character, giving nothing away. A stage direction in brackets can be the whole line.',
    example: [{ field: 'The brush-off', text: CAT_EXAMPLES.refusals.boo }],
    emptyState: 'Nothing yet. How does this cat say no? Make it sting a little and reveal nothing.',
    doneLine: 'Every cat can say no beautifully. The guests will survive it.',
  },
  smalltalk: {
    what: 'A line a cat mutters on a room screen, beside the real lines. Never about the case.',
    where: 'All night, as a passing line on a guest’s phone when nothing else is happening, and on the room screens where everyone reads the same thing.',
    howTo: 'Up to 25 words about the house, the grounds, the weather, the other cats or chores. Nothing that could pass for evidence.',
    example: [{ field: 'The line', text: CAT_EXAMPLES.smalltalk.salem }],
    emptyState: 'Nothing yet. What would this cat grumble about on an ordinary Tuesday, with nobody listening?',
    doneLine: 'The rooms hum with chatter. None of it useful, all of it true to form.',
  },
  status_lines: {
    what: 'How a cat feels about a guest right now, in words. The phone never shows a number.',
    where: 'All night on the Cats tab: under each cat’s name, one of these lines, chosen by how the cat stands with that guest.',
    howTo: 'Pick the standing (locked, warming or in), then one sentence to the guest in the manor’s narrator voice: never the cat speaking, never a number.',
    example: [
      { field: 'Standing', text: CAT_EXAMPLES.status_lines.zimothy[0] },
      { field: 'The line', text: CAT_EXAMPLES.status_lines.zimothy[1] },
    ],
    emptyState: 'Nothing yet. Three lines per cat: locked out, warming up, and in.',
    doneLine: 'Every guest will know where they stand. The cats, as ever, decline to explain.',
  },
  trailoffs: {
    what: 'A small aside where Granolia loses her thread mid-speech.',
    where: 'Acts 2 and 4, dropped between two sentences of Granolia’s testimony.',
    howTo: 'Up to 15 words, starting with a dash or dots, with her snort (*snrk.*) once. Rarely needed now.',
    example: [{ field: 'The aside', text: '… that’s how I remember it, anyway. *snrk.* Mostly.' }],
    emptyState: 'Rarely needed. Granolia misremembers now instead of trailing off.',
    doneLine: 'Granolia has lost her thread eight ways. She is pleased with all of them.',
  },
  rules_text: {
    what: 'The rulebook, one section at a time. The only place the night is ever explained.',
    where: 'All night on the Rules tab of every phone, and Jon reads the highlights aloud in Act 1 before the blackout.',
    howTo: 'A heading in capitals (four words at most), then one to three sentences any guest follows in one read. One idea per section.',
    example: [
      { field: 'Heading', text: 'YOUR PHONE' },
      { field: 'What it says', text: 'It is your notebook, your map, and your memory tonight. Keep it on you. If the screen goes dark, just tap: the Manor holds your place.' },
    ],
    emptyState: 'No rules yet. Start with how to win: name the Murderer, the Motive and the Victim.',
    doneLine: 'The rules are posted in the hall. Nobody will read them, and everybody will obey.',
  },
  ui_copy: {
    what: 'The phone’s own words, when no character is speaking.',
    where: 'Whenever the phone itself has to speak: scanning in at the door, no signal, paused, the ballot in Act 7. Often read by someone stressed and alone.',
    howTo: 'Pick which screen, then the line. Fifteen screens, each with a plain default already; yours replaces it. Twenty words at most, never blaming the guest. “Nothing is lost” is the house style.',
    example: [
      { field: 'Which screen', text: 'OFFLINE' },
      { field: 'The line', text: 'The Manor cannot hear your phone. Stay where you are: it will reconnect on its own. Nothing is lost.' },
    ],
    emptyState: 'Nothing yet. Start with the door: what a guest reads the moment they scan in.',
    doneLine: 'Every door in the house has its little sign. Even the ones that stick.',
  },
  act_scripts: {
    what: 'One sentence per act saying where to be and what to do. The act’s name (Behind Closed Doors, The Final Hour) is fixed and already on every phone.',
    where: 'The top of every phone the moment an act begins, under the act’s name.',
    howTo: 'Two short sentences at most: where to be (everyone together, scattered alone, in pairs), then what to do. Plain words an eleven-year-old gets in one pass.',
    example: [
      { field: 'Which line', text: 'OBJECTIVE' },
      { field: 'The words', text: 'Find your partner and choose a room together. Anything the household kept quiet earlier comes back tonight: ask again.' },
    ],
    emptyState: 'Nothing for this act yet. Where should everyone be, and what should they do?',
    doneLine: 'Seven acts, seven sentences, and the curtain knows exactly when to rise.',
  },
  scenarios: {
    what: 'Silly three-question dilemmas. Every guest answers one at the same moment, on identical screens.',
    where: 'Acts 2, 4 and 6: every phone in the house lights up at once with three questions in a row. For a Detective the answers move how the cats feel about them. For the Murderer and the Ghost, the same kind of set moves how clear the clues come out, and nobody can tell which two phones those are.',
    howTo: 'Question 1, its two choices, and points for each. Then question 2 and question 3 the same way. Whatever a guest picks, the next question is the same. The eight totals add themselves up underneath.',
    example: [
      { field: 'Question 1', text: 'Do you care which way your toilet paper sits?' },
      { field: 'Choices', text: 'Yes (+5) or No (0)' },
      { field: 'Question 2', text: 'Which way?' },
      { field: 'Choices', text: 'Over (+5) or Under (-1)' },
      { field: 'Question 3', text: 'Do you fix it when you see it wrong?' },
      { field: 'Choices', text: 'Yes (-1) or No (-1)' },
    ],
    emptyState: 'No questions yet. Ask something nobody can answer well: ice in orange juice, socks in bed, which way the toilet paper sits.',
    doneLine: 'The house is full of very strong opinions about very small things. Just as it should be.',
  },
  role_cards: {
    what: 'The card each phone shows in the blackout: Murderer, Ghost or Detective. What each role does is said aloud in the Act 1 welcome, so the card only has to say which one you are.',
    where: 'The dark room at the end of Act 1, when every phone buzzes at once and the roles land. The only moment all night a screen says who you are.',
    howTo: 'Pick the card, then the words. The three cards must be the same length and shape, so a lit screen gives nothing away from across the room. Nobody learns the motive here, not even the Murderer, and the cards say so. The shared “power is back” message lives in the phone’s own lines.',
    example: [
      { field: 'Which card', text: 'GHOST' },
      { field: 'The card', text: 'The Manor has lost you tonight. No one knows, and no one knows why, not even you. Walk, talk, and play on.' },
    ],
    emptyState: 'Nothing yet. Three cards to write, matched word for word in length.',
    doneLine: 'Three cards, matched to the word. In the dark, every face glows the same.',
  },
  filler: {
    what: 'The old way of keeping ordinary phones busy while two guests chose an event. Retired.',
    where: 'Nowhere now. The Parlour Games do this job, on every phone at once.',
    howTo: 'Leave this list alone. Write questions instead.',
    example: [],
    emptyState: 'Retired. Write Parlour Games instead.',
    doneLine: 'Retired with honours.',
  },
  event_cards: {
    what: 'Notes about events. The real event words are written blind by Claude.',
    where: 'Nowhere on a guest’s screen. Notes only.',
    howTo: 'A note to yourself, if you must.',
    example: [],
    emptyState: 'Notes only. Nothing here reaches a phone.',
    doneLine: 'Noted.',
  },
  lore: {
    what: 'Short paragraphs of house history: the Sirwin family, how each animal came to the manor.',
    where: 'Quoted on the Rules tab and the room screens whenever the house talks about itself. A curious guest can read it all.',
    howTo: 'A title in capitals, then one short paragraph. Say full names, not “he” or “she”, so any sentence can stand alone on a screen.',
    example: [
      { field: 'Title', text: 'THE FAMILY' },
      { field: 'The paragraph', text: 'Papa Sirwin inherited everything, including his opinions. Mama Sirwin governs the Manor, the calendar, and Papa.' },
    ],
    emptyState: 'Nothing yet. Four paragraphs: the family, the cats’ arrivals, the victim nobody can name, Sir Irwin’s entry in the register.',
    doneLine: 'The family history is bound and shelved. Nobody disputes it, which is how you know it is true.',
  },
  pools: {
    what: 'Short phrases that fill the blanks in a cat’s secret middle: a room, a time, how long, how often, a place in town, who was watching.',
    where: 'Acts 2 and 4, inside a cat’s testimony on a guest’s phone: “a figure was heard in [ROOM] at [TIME]”. The game picks which phrase lands where.',
    howTo: 'A few words, lowercase, no full stop. It drops straight into the middle of a sentence, so read it aloud with “in”, “at” or “for” in front.',
    example: [{ field: 'A short phrase', text: POOL_EXAMPLES.room }],
    emptyState: 'Nothing yet. Ten short phrases, lowercase, that could fill this blank in any story.',
    doneLine: 'The blanks are stocked. The cats can be vague in ten different ways.',
  },
  echo_frames: {
    what: 'A news bulletin with one gap. The secret part drops into the gap on the night.',
    where: 'Acts 2 and 4: a chime, then this line on a room screen with the secret fragment in the gap. Everyone in the room reads it.',
    howTo: 'The words before the gap, starting with three dots, then the words after the gap, ending with three dots. The gap is drawn for you between the two boxes.',
    example: [
      { field: 'Before the gap', text: '...the morning post brings word of' },
      { field: 'After the gap', text: ', which the household calls exaggerated and the post calls Tuesday...' },
    ],
    emptyState: 'No frames yet. Think of a radio announcer who has only heard half the story.',
    doneLine: 'This station has eight bulletins ready and no idea what any of them say.',
  },
  templates: {
    what: 'The seven blank documents (a receipt, a telegram, a page from a catalogue) that secret text is printed onto live.',
    where: 'Acts 2 and 4: when a guest solves a puzzle, the payout is one of these documents on their phone, with the secret words on it.',
    howTo: 'Tick a design when it is drawn, keep notes, and attach a reference picture. Design the paper, never the message.',
    example: [{ field: 'Design', text: 'TELEGRAM: office banner across the head, delivery stamps upper corner, gummed message strip at center.' }],
    emptyState: 'Seven designs to make.',
    doneLine: 'Seven papers, blank as a butler’s face, ready to be printed upon.',
  },
  epilogue_frames: {
    what: 'The closing story, read aloud, with blanks for the names.',
    where: 'Act 7, on the living room screen, after the Murderer, the Motive and the Victim have been revealed in that order.',
    howTo: 'A paragraph with [MURDERER], [VICTIM] and [MOTIVE_RHYME] where the names go. Written to be read on a big screen across a room: short lines.',
    example: [{ field: 'The paragraph', text: 'And so it was [MURDERER]. Not for money, not for love, for this: [MOTIVE_RHYME]. The household nodded as one, and [VICTIM] was remembered fondly, by most.' }],
    emptyState: 'Nothing yet. Two endings to write, with the names left blank.',
    doneLine: 'The last page is written. The spoons, as ever, remain uncounted.',
  },
  bag_items: {
    what: 'Every ordinary object that could go in a numbered bag, with the one sense it stands out to.',
    where: 'In the numbered bags handed out at the door in Act 1 and carried all night; later, clues point at how something in one smells, sounds or feels, never at the thing itself.',
    howTo: 'The item, then which sense notices it, then what that sense notices in a word or two. Think in pairs: two things that seem the same by that sense.',
    example: [
      { field: 'The item', text: 'Mint tea bag' },
      { field: 'Which sense', text: 'smell' },
      { field: 'What it notices', text: 'minty' },
    ],
    emptyState: 'No items yet. Walk round the kitchen with a notebook.',
    doneLine: 'Sixty odds and ends, bagged by someone who is not you. The Manor thanks you for not peeking.',
  },
  ops_docs: {
    what: 'Your own pack for running the night: the welcome speech, the cue sheet, the fix-it sheet.',
    where: 'Never on a guest’s screen. On your phone or printed, for you and Susan.',
    howTo: 'A title in capitals, then the whole document.',
    example: [
      { field: 'Title', text: 'WELCOME SPEECH' },
      { field: 'The note', text: 'Good evening, and welcome to Sirwin Manor. Phones out, please; the house will be speaking to you through them.' },
    ],
    emptyState: 'No notes yet. Start with the welcome speech.',
    doneLine: 'The host’s pockets are full of useful paper. The host is still allowed to play.',
  },
  art_assets: {
    what: 'Every picture the night needs, with a done tick.',
    where: 'Screens, portraits, the big TV and the invitation.',
    howTo: 'Name the picture, upload it when it exists, tick it when it is ready.',
    example: [],
    emptyState: 'Name a picture you still need.',
    doneLine: 'Every picture is in. The manor looks like itself.',
  },
  av_assets: {
    what: 'Every sound the night needs, with a done tick. Atmosphere only, never a voice.',
    where: 'The speakers: chimes, crackle, thunder, the blackout sting.',
    howTo: 'Name the sound, upload it when it exists, tick it when it is ready.',
    example: [],
    emptyState: 'Name a sound you still need.',
    doneLine: 'Every sound is in. Close your eyes and you are there.',
  },
}

// The card for a list, specialised to the tab you are on (one cat, one blank).
export function cardFor(area, tab) {
  const base = CARDS[area]
  if (!base) return null
  if (tab && CAT_EXAMPLES[area]?.[tab] !== undefined) {
    const ex = CAT_EXAMPLES[area][tab]
    const example = Array.isArray(ex)
      ? [{ field: 'Standing', text: ex[0] }, { field: 'The line', text: ex[1] }]
      : [{ field: base.example[0]?.field ?? 'The line', text: ex }]
    return { ...base, example, note: CAT_NOTES[area]?.[tab] ?? null }
  }
  if (area === 'pools' && tab && POOL_EXAMPLES[tab]) {
    return { ...base, example: [{ field: 'A short phrase', text: POOL_EXAMPLES[tab] }], note: POOL_NOTES[tab] ?? null }
  }
  return { ...base, note: null }
}

export const ALL_CARDS = CARDS
