// The look's plain parts: who is on each room's splash, each picture's own
// edges, a game card's three steps, the Rules tab's cards, sample states for
// the look book, and where the twinkles, paw prints and confetti go. No React,
// no Firebase, so play/test can read it.
//
// THE LOOK IS THE ONE JON APPROVED on 12 Nov 2026 ("yes this is great"): the
// nine screens kept, exactly as drawn, in docs/look-approved.html (handoff
// 12 Nov 2026, job 2). His word on words, the same day: "Anywhere there is
// random text that is not mission critical lose it. The game needs to allow
// things to be focused in." So a screen here is a title, one line at most and
// one button: no tips, no flavor lines, no act names, no labels that only
// name the card.

// The household's full pictures (play/public/household/full/). The same lists
// as lib/rooms.js CAT_PICTURES (a test keeps them equal); the fifth Boo's name
// starts with a space. Jon, 12 Nov: "Make sure to use the cat art I have
// made." Every cat on every screen is one of these, never a drawn stand-in.
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

// Each picture cut to its own edges: the smallest box that holds everything
// in it that is not see-through, as [left, top, width, height] in fractions of
// the file, and the box's own shape (width over height). Measured from the
// files (a test measures nothing: if a picture is swapped, measure it again;
// a file not listed here shows whole). The faces are play/public/household/faces/.
export const TRIMS = {
  ' Boo 5.png': [0.0833, 0.0267, 0.86, 0.9473, 0.9078],
  'Boo 1.png': [0.2047, 0.0167, 0.5907, 0.9673, 0.6106],
  'Boo 2.png': [0.0867, 0.0927, 0.8687, 0.878, 0.9894],
  'Boo 3.png': [0.0227, 0.138, 0.9547, 0.7247, 1.3174],
  'Boo 4.png': [0.0087, 0.1013, 0.9833, 0.8587, 1.1452],
  'Granola 1.png': [0.2247, 0.0147, 0.5373, 0.9513, 0.5648],
  'Granola 2.png': [0.0413, 0.1267, 0.942, 0.5867, 1.6057],
  'Granola 3.png': [0.0067, 0.1273, 0.9747, 0.738, 1.3207],
  'Granola 4.png': [0.0853, 0.01, 0.7287, 0.9127, 0.7984],
  'Irwin 1.png': [0.0713, 0.0193, 0.776, 0.8993, 0.8629],
  'Irwin 2.png': [0.2513, 0.014, 0.5113, 0.9833, 0.52],
  'Irwin 3.png': [0.084, 0.0113, 0.916, 0.9793, 0.9353],
  'Irwin 4.png': [0.236, 0.0193, 0.6987, 0.8807, 0.7933],
  'Irwin 5.png': [0.388, 0.0347, 0.448, 0.94, 0.4766],
  'Salem 1.png': [0.06, 0.078, 0.9153, 0.858, 1.0668],
  'Salem 2.png': [0.238, 0.068, 0.4693, 0.9007, 0.5211],
  'Salem 3.png': [0.1607, 0.0367, 0.778, 0.9167, 0.8487],
  'Salem 4.png': [0.0367, 0.2033, 0.9573, 0.674, 1.4204],
  'Salem 5.png': [0.114, 0.04, 0.7233, 0.9347, 0.7739],
  'Salem 6.png': [0.3627, 0.026, 0.574, 0.974, 0.5893],
  'Zimmy 1.png': [0.024, 0.0567, 0.9553, 0.894, 1.0686],
  'Zimmy 2.png': [0.0827, 0.0107, 0.9053, 0.8847, 1.0234],
  'Zimmy 3.png': [0.0113, 0.0713, 0.948, 0.7347, 1.2904],
  'Zimmy 4.png': [0.0273, 0.2713, 0.94, 0.5427, 1.7322],
  'Zimmy 5.png': [0.084, 0.0167, 0.8533, 0.9713, 0.8785],
  'Boo Face.png': [0.0907, 0.0127, 0.8, 0.976, 0.8197],
  'Granola Face.png': [0, 0.0793, 0.94, 0.8907, 1.0554],
  'Irwin Face.png': [0.068, 0.0327, 0.9093, 0.9633, 0.9439],
  'Salem Face.png': [0.0887, 0.0453, 0.856, 0.9107, 0.94],
  'Zimmy Face.png': [0, 0.014, 0.9893, 0.9367, 1.0562],
}
const WHOLE = [0, 0, 1, 1, 1]
export function trimOf(file) {
  return TRIMS[file] ?? WHOLE
}
// How an <img> sits inside a box of the trim's own shape, so only the cat shows.
export function trimStyle(file) {
  const [x, y, w, h] = trimOf(file)
  return { width: `${+(100 / w).toFixed(3)}%`, left: `${+(-100 * x / w).toFixed(3)}%`, top: `${+(-100 * y / h).toFixed(3)}%` }
}
// A portrait cut to the head, for a square box: the <img>'s width, left and
// top in hundredths of the box. Measured from the files (play/public/portraits/):
// the head is the top band of the figure. A portrait not listed shows from the top.
export const HEADS = {
  arms: [166.7, -40.1, 0], barnes: [166.7, -52.7, -16], devine: [251, -65.7, -6.2], fume: [166.7, -28.7, -7.1],
  ledger: [225.6, -63.7, 0], leech: [166.7, -27.9, 0], mourningstone: [166.7, -34.6, -29.9], 'prof-jonathan': [258.6, -81.9, -12.5],
  'prof-susan': [166.7, -34.1, -9.4], rye: [196.8, -51.5, -19.4], shushwell: [166.7, -44.3, -5], steeps: [222, -51.5, -5.5],
  vayne: [166.7, -36.1, -6.4], white: [172.7, -37.3, -3],
}
export function headStyle(id) {
  const [w, l, t] = HEADS[id] ?? [200, -50, -3]
  return { width: `${w}%`, left: `${l}%`, top: `${t}%` }
}
export const FACES = { granolia: 'Granola Face.png', boo: 'Boo Face.png', zimothy: 'Zimmy Face.png', salem: 'Salem Face.png', irwin: 'Irwin Face.png' }
// The four cats a guest meets, in the order their faces sit on a small win.
export const CATS = ['granolia', 'boo', 'zimothy', 'salem']

// Each room screen's splash: who is on it (handoff 11 Nov 2026, B2) and the
// room's name. Nothing else is written on it but the cat's own name.
export const SPLASHES = {
  living: { who: 'irwin', name: 'The Parlour' },
  study: { who: 'granolia', name: 'The Study' },
  library: { who: 'zimothy', name: 'The Library' },
  orangerie: { who: 'salem', name: 'The Orangerie' },
  entryway: { who: 'boo', name: 'The Entryway' },
  bedroom: { who: 'irwin', name: 'The Bedroom' },
}
export const SPLASH_ROOMS = Object.keys(SPLASHES)

// What of the look is switched on for the night's own screens. Jon said yes
// to the drawings on 12 Nov 2026, and that is the yes (handoff 12 Nov, job 2):
// the look is on. A part that is not listed is off, and a screen opened with
// &<part>=1 in its address shows it anyway, for trying it on the real machine.
export const LOOK = { splash: true, game: true, now: true, vote: true, wins: true, rules: true }
export function lookOn(part, search = typeof window === 'undefined' ? '' : window.location.search) {
  return LOOK[part] === true || new URLSearchParams(search).has(part)
}
// A room screen's idle name (lib/rooms.js LOOP_OF: the name of its loop file) -> its splash.
export const SPLASH_OF = { living: 'living', study: 'study', memory: 'library', boo: 'entryway', bedroom: 'bedroom', orangerie: 'orangerie' }
// The cat's picture moves on every few minutes, so a screen changes through
// the night and a reload shows the same one.
export const SPLASH_TURN_MS = 4 * 60_000
export function splashNow(now = Date.now()) {
  return { turn: Math.floor(now / SPLASH_TURN_MS) }
}

// A game's card: its three steps, as numbered cards (the game's name comes
// from seed/game-names.json). Step 1 is always the room's code.
export const GAME_STEPS = {
  study: ['Scan Granolia’s code.', 'Watch the wall.', 'Touch the same lights.'],
  library: ['Scan Zimothy’s code.', 'Flip two cards.', 'Match every pair.'],
  orangerie: ['Scan Salem’s code.', 'Red means shake.', 'Green means freeze.'],
  entryway: ['Scan Boo’s code.', 'Play five little games.', 'Take turns.'],
}

// The Rules tab as cards to swipe: one idea a card, a picture on each. The
// first is the whole game in three lines. (As built on 11 Nov; the 12 Nov
// handoff leaves it alone.)
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

// The Now tab, one card: where to go, and the one button. Sample states for
// the look book; the night's own come from lib/now.js.
export const NOW_STATES = {
  room: { chip: 'A room in Act 4', who: 'salem', n: 2, lead: 'Go to the Orangerie', button: 'Scan Salem’s code', icon: 'scan' },
  cat: { chip: 'A cat calls you', who: 'granolia', n: 1, lead: 'Go to the Study', button: 'Scan Granolia’s code', icon: 'scan', quiet: 'Not yet' },
  quiet: { chip: 'Nothing to do', who: 'irwin', n: 1, lead: 'Talk to people' },
}

// The little wins, for the look book's sound check: when each one plays (the
// handoff's table, B4).
export const WINS = [
  { level: 'small', name: 'A small win', when: 'A clue saved, a motive crossed off, a right pick.' },
  { level: 'medium', name: 'A win', when: 'A round cleared, a Parlour Game done, Locked in.' },
  { level: 'big', name: 'A big win', when: 'A room solved, a picture named, the door opens.' },
  { level: 'miss', name: 'Not quite', when: 'A miss. A soft buzz and a shake.' },
]

// ---- glitz: twinkles, paw prints, confetti ------------------------------------
// Places are in hundredths of the screen (x of its width, y of its height), so
// one list is right on a TV, an iPad and a phone. Each list is the approved
// drawing's own, measured from docs/look-approved.html.

// [x, y, size (hundredths of the screen's width), delay in seconds, tone]
export const TWINKLES = {
  splash: [[56.6, 13.3, 2.2, 0, 'brass'], [93.4, 14.4, 1.7, 0.7, 'paper'], [94.1, 59.7, 2, 1.3, 'brass'], [55.9, 67.2, 1.6, 0.4, 'paper']],
  win: [[15.9, 34.7, 2.7, 0, 'brass'], [7.5, 45.8, 1.7, 0.5, 'paper'], [79.1, 61.1, 2.3, 0.9, 'brass'], [54.7, 13.3, 1.6, 0.3, 'paper'], [78.9, 15, 2, 1.1, 'brass'], [47.7, 65.3, 1.9, 0.7, 'paper']],
  phone: [[7.7, 17.8, 6.7, 0, 'brass'], [86.7, 14.2, 5.1, 0.5, 'paper'], [5.6, 44.1, 4.6, 0.9, 'paper'], [48.7, 9.2, 5.6, 0.3, 'brass'], [88.7, 55.7, 5.6, 1.1, 'brass']],
}

// A big win's paw prints: where each comes to rest, how big, which way it
// leans, its tone, and how far off it starts (they fly out from the middle).
// [x, y, size, lean in degrees, tone, from x, from y]
export const WIN_PAWS = [
  [11.7, 13.3, 4.4, -24, 'brass', 36.1, 32.8], [25.8, 7.8, 3.4, 12, 'paper', 22.5, 39.2], [44.2, 6.9, 3.1, -8, 'red', 4.2, 40.3],
  [64.8, 7.5, 3.8, 18, 'paper', -16.7, 39.2], [89.8, 55.6, 4.4, 30, 'brass', -42, -9.4], [85.2, 77.8, 3.4, -16, 'red', -36.9, -30.8],
  [72.7, 81.9, 4.1, 22, 'brass', -24.7, -35.6], [56.3, 84.7, 3.1, -10, 'paper', -7.8, -37.5], [40.6, 83.3, 3.8, 14, 'brass', 7.5, -36.7],
  [28.9, 81.9, 3.4, -28, 'paper', 19.4, -35],
]

// Confetti that falls across the whole screen, behind the words: paw prints
// and little paper strips, evenly spread, each at its own pace. The same
// shower every time (no dice), so a picture of the screen is the screen.
const TONES = ['brass', 'red', 'paper']
export function confetti(tall = false) {
  const paws = tall ? 7 : 12
  const strips = tall ? 6 : 8
  const out = []
  for (let i = 0; i < paws; i++) {
    out.push({ kind: 'paw', x: +(4.7 + i * (tall ? 14.2 : 8.07)).toFixed(2), size: (tall ? [5.6, 6.7, 4.6, 6.2, 5.1, 6.7, 5.1] : [2, 2.5, 1.7, 2.3, 1.9, 2.7, 1.9, 2.2, 1.7, 2.3, 2, 2.5])[i], tone: TONES[i % 3],
      ms: [7500, 6200, 8400, 6800, 7900, 6500, 8800, 7200, 6400, 8100, 6900, 7700][i], delay: -[1000, 3400, 5200, 400, 4100, 2600, 6300, 2100, 4800, 900, 5600, 3000][i] })
  }
  for (let i = 0; i < strips; i++) {
    out.push({ kind: 'strip', x: +((tall ? 13.3 : 8.75) + i * (tall ? 14.6 : 11.6)).toFixed(2), size: tall ? 2.1 : 0.8, tone: TONES[(i + 1) % 3],
      ms: [5600, 6600, 5900, 7100, 6100, 5400, 6800, 5800][i], delay: -[2200, 4400, 700, 5000, 3100, 1600, 4200, 300][i] })
  }
  return out
}

// Is this the look book? /play/?look=1. Never linked from a guest's screen.
export function lookParam(search = typeof window === 'undefined' ? '' : window.location.search) {
  return new URLSearchParams(search).has('look')
}
