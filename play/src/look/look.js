// The look's plain parts (handoff 11 Nov 2026, B1): who is on each room's
// splash and what it says, the short lines of a game's rules card, the Rules
// tab's cards, the Now tab's states for the look book, and where a marquee's
// bulbs go. No React, no Firebase, so play/test can read it.
//
// Every line here is sample copy for the look book, written to the pass's
// word rule (two short sentences a screen, plain American English). The
// night's own words are settled in B2 and B3, once Jon has said yes.

// The household's full pictures (play/public/household/full/). The same lists
// as lib/rooms.js CAT_PICTURES (a test keeps them equal); the fifth Boo's name
// starts with a space.
export const PICTURES = {
  irwin: ['Irwin 1.png', 'Irwin 2.png', 'Irwin 3.png', 'Irwin 4.png', 'Irwin 5.png'],
  granolia: ['Granola 1.png', 'Granola 2.png', 'Granola 3.png', 'Granola 4.png'],
  zimothy: ['Zimmy 1.png', 'Zimmy 2.png', 'Zimmy 3.png', 'Zimmy 4.png', 'Zimmy 5.png'],
  salem: ['Salem 1.png', 'Salem 2.png', 'Salem 3.png', 'Salem 4.png', 'Salem 5.png', 'Salem 6.png'],
  boo: ['Boo 1.png', 'Boo 2.png', 'Boo 3.png', 'Boo 4.png', ' Boo 5.png'],
}
// One of somebody's pictures, by a turn that moves on through the night.
export function pictureFor(who, n = 0) {
  const files = PICTURES[who] ?? []
  if (!files.length) return null
  const k = Math.abs(Math.floor(Number(n) || 0))
  return files[k % files.length]
}

// Each room screen's splash: who is on it (the handoff's table, B2), the
// room's name, one inviting line. `left` puts the cat on the left.
export const SPLASHES = {
  living: { who: 'irwin', name: 'The Parlour', line: 'Sir Irwin is so glad you came.' },
  study: { who: 'granolia', name: 'The Study', line: 'Granolia had a thought. It will come back.', left: true },
  library: { who: 'zimothy', name: 'The Library', line: 'Zimothy bills by the minute. Come in anyway.' },
  orangerie: { who: 'salem', name: 'The Orangerie', line: 'Salem is watching his lawn. And you.', left: true },
  entryway: { who: 'boo', name: 'The Entryway', line: 'Miss Boo LaRue is judging. Kindly.' },
  bedroom: { who: 'irwin', name: 'The Bedroom', line: 'Sir Irwin is waiting at the door.', left: true },
}
export const SPLASH_ROOMS = Object.keys(SPLASHES)

// What of the look is switched on for the night's own screens. Nothing rolls
// out until Jon has said yes in the look book (handoff 11 Nov 2026, B1), one
// number at a time: `splash` is number 1, every idle room screen (B2).
// A room screen opened with &splash=1 in its address shows it anyway, for
// trying it on the real machine before it is switched on.
export const LOOK = { splash: false }
export function lookOn(part, search = typeof window === 'undefined' ? '' : window.location.search) {
  return LOOK[part] === true || new URLSearchParams(search).has(part)
}
// A room screen's idle name (lib/rooms.js LOOP_OF: the name of its loop file) -> its splash.
export const SPLASH_OF = { living: 'living', study: 'study', memory: 'library', boo: 'entryway', bedroom: 'bedroom', orangerie: 'orangerie' }
// The cat's picture moves on every few minutes, so a screen changes through
// the night and a reload shows the same one; the tip changes every minute.
export const SPLASH_TURN_MS = 4 * 60_000
export const TIP_MS = 60_000
export function splashNow(now = Date.now()) {
  return { turn: Math.floor(now / SPLASH_TURN_MS), tip: HOUSE_TIPS[Math.floor(now / TIP_MS) % HOUSE_TIPS.length] }
}

// The house's tips, one fading in on an idle screen once a minute. The same
// five as the server's FREE_TIME_TIPS (functions/lib/deal.js; a test keeps
// them equal).
export const HOUSE_TIPS = [
  'Have you crossed off everything you know?',
  'Compare what the cats told you. Do they agree?',
  'Remember, Salem usually has it backwards.',
  'Look at the portraits. Every character carries a trace.',
  'Only tell your group. The walls have ears. And whiskers.',
]

// A game's rules card: two short lines of how to play (the game's name and
// hook come from seed/game-names.json).
export const GAME_HOW = {
  study: ['Watch the wall.', 'Touch the same lights, in the same order.'],
  library: ['Flip two cards.', 'Match every pair to tidy his files.'],
  orangerie: ['Red light: shake your phone.', 'Green light: freeze.'],
  entryway: ['Five little games, one coin each.', 'Take turns. Make her smile.'],
}

// The Rules tab as cards to swipe: one idea a card, a picture on each. The
// first is the whole game in three lines.
export const RULE_CARDS = [
  { title: 'The whole game', who: 'irwin', n: 0, three: ['Who did it?', 'Why?', 'Who is the Ghost?'] },
  { title: 'Three roles', who: 'boo', n: 2, body: 'Detectives, one Murderer, one Ghost. Everybody wins the same way: name all three.' },
  { title: 'The Ghost', who: 'granolia', n: 1, body: 'One of us died tonight, and nobody noticed. The Ghost never says so.' },
  { title: 'Trust the dog', who: 'irwin', n: 4, body: 'Sir Irwin never lies. If a cat disagrees with him, Irwin is right.' },
  { title: 'The cats', who: 'salem', n: 1, body: 'The more a cat likes you, the more it tells you. Salem usually has it backwards.' },
  { title: 'The motives', who: 'zimothy', n: 0, body: 'Nineteen motives, and one is true. Tap one to cross it off.' },
  { title: 'Your bag', who: 'boo', n: 0, body: 'A bag clue points at a person. Ask before you touch a bag that is not yours.' },
  { title: 'The chime', who: 'granolia', n: 3, body: 'Hear the chime? Look at your phone.' },
  { title: 'Say it out loud', who: 'salem', n: 3, body: 'Nothing travels from phone to phone. Talk, argue, bluff.' },
]

// The Now tab, one big card: three states for the look book.
export const NOW_STATES = {
  cat: { chip: 'A cat calls you', who: 'granolia', n: 1, label: 'Right now', lead: 'Granolia will see you.', sub: 'Go to the Study and scan her code.', button: 'Scan her code', quiet: 'Not yet. Call me later.' },
  room: { chip: 'A room in Act 4', who: 'zimothy', n: 2, label: 'Round 2', lead: 'Go to the Library.', sub: 'In Duplicate, with Zimothy.', button: 'We are here' },
  clock: { chip: 'The last ten seconds', who: 'boo', n: 3, label: 'Parlour Game', lead: 'Ice in orange juice?', sub: 'Pick one. There are no wrong answers.', clock: '7', button: 'Always' },
  quiet: { chip: 'Nothing to do', who: 'irwin', n: 1, label: 'Right now', lead: 'Talk to people.', sub: 'The game will find you.' },
}

// A win, small and big: when each one plays (the handoff's table, B4).
export const WINS = [
  { level: 'small', name: 'A small win', when: 'A clue saved, a motive crossed off, a cat visited, a right pick.' },
  { level: 'medium', name: 'A win', when: 'A round cleared, a Parlour Game done, Locked in.' },
  { level: 'big', name: 'A big win', when: 'A room solved, a picture named, the door opens, three out of three.' },
  { level: 'miss', name: 'Not quite', when: 'A miss. A soft buzz and a shake. Never a scolding.' },
]

// Where a marquee's bulbs sit round a box w wide and h high (any unit): even
// steps along each edge, clockwise from the top left, as percentages of the
// box, so the chase runs round it. About one bulb every `gap` units, and a
// number that divides by three, so the three sets take even turns.
export function bulbSpots(w, h, gap = null) {
  if (!(w > 0) || !(h > 0)) return []
  const step = gap ?? Math.max(16, Math.min(46, h * 0.19))
  const nx = Math.max(3, Math.round(w / step))
  let ny = Math.max(2, Math.round(h / step))
  while ((2 * (nx + ny)) % 3 !== 0) ny += 1
  const spots = []
  const pct = v => +(v * 100).toFixed(3)
  for (let i = 0; i < nx; i++) spots.push({ x: pct(i / nx), y: 0 })
  for (let j = 0; j < ny; j++) spots.push({ x: 100, y: pct(j / ny) })
  for (let i = 0; i < nx; i++) spots.push({ x: pct(1 - i / nx), y: 100 })
  for (let j = 0; j < ny; j++) spots.push({ x: 0, y: pct(1 - j / ny) })
  return spots
}

// Is this the look book? /play/?look=1. Never linked from a guest's screen.
export function lookParam(search = typeof window === 'undefined' ? '' : window.location.search) {
  return new URLSearchParams(search).has('look')
}
