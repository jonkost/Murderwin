// Miss Boo LaRue's Arcade (28 Oct 2026, docs/boo-arcade.md): the pure engine.
// Five small games on the Stream Deck + XL (36 keys, six dials and a touch
// strip), the practice visit (two tokens each, a clue after each player's
// second game, a trio's third player gets Boo's line, the winner, free play,
// the chime), the face every key shows, the strip, and the words on the
// screen. screens/Arcade.jsx runs it; lib/arcadeArt.js draws the faces.
//
// Pure: no React, no DOM, no Firebase, no clock of its own and no
// Math.random. Every function is handed `now` (milliseconds from one steady
// clock: the page uses performance.now()) and returns a NEW object; nothing
// handed in is ever changed. All chance comes from a seeded generator kept in
// the state, so one seed and the same presses play the same game, and a page
// that slept catches up timer by timer. State is plain JSON. It reads no
// night and nothing sealed: the clue is the house's rehearsal stand-in.
// play/test/arcade.test.mjs runs it.
//
// Jon's notes of 29 Oct 2026 remade the games: the Stream Deck is the game and
// the Mac's screen shows the game's news; one click of a dial is one key,
// every click; every success is a green tick on its key ("Like a check if you
// get the mouse") and every strike a red cross, counted in three boxes on the
// strip. His later notes that day: Boo herself chases her tail over the whole
// board, its end and its middle in her way, walls and her friends coming out
// as it quickens, so a held arrow key no longer wins it; more mice up at once;
// the decoys are Sir Irwin and his friends, not pets; no device's name in the
// words on the screen; and Back leaves a visit or a game at any moment
// (arcadeBack).

// ---- the speeds and the times: starting points, for Jon's notes to tune ----

// Every game
export const HIT_MS = 350                // a success's green tick stays on its key this long
export const MISS_MS = 600               // a strike's red cross stays on its key this long
export const STRIKES_OUT = 3             // three strikes and you're out, in the three games that count them
export const STRIKE_WORDS_MS = 1500      // a strike's words stay on the strip this long (Jon, 29 Oct 2026)
export const DIAL_MAX_KEYS = 6           // one report from a dial moves at most this many keys, so a glitch never throws anything across the board
// Boo Chasing Her Tail: Boo herself (the outside two dials) chases her tail's
// white tip over the whole board (Jon, 29 Oct 2026: "Make it run over the
// entire board", "As time goes on it goes fast and add obsticals")
export const TAIL_STEP_MS = 650          // the tail moves one key this often at first,
export const TAIL_STEP_END_MS = 300      // this often by the end
export const TAIL_TURN_ONE_IN = 4       // about one step in four it turns, when it can
export const TAIL_FLEE_KEYS = 3          // with Boo this close to any key of it (along the rows and columns), it runs from her
export const TAIL_AWAY_KEYS = 4          // a caught tail comes back with every key at least this far from her
export const TAIL_BLOCKS_FROM_MS = 15000 // the walls and her friends come out from 15 seconds in,
export const TAIL_BLOCKS_EVERY_MS = 15000 // one more every 15 seconds,
export const TAIL_BLOCKS_MAX = 6         // six at most, and they stay put
export const TAIL_POINTS = 2             // a catch
// The Lazy Pointer: lead the red dot to the sparkles; Boo naps, wakes and stalks it
export const POINTER_STEP_MS = 800       // awake, Boo steps towards the dot this often at first,
export const POINTER_STEP_END_MS = 420   // this often by the end
export const POINTER_NAP_MS = 3500       // she naps this long (and up to half as long again),
export const POINTER_WAKE_KEYS = 1       // wakes sooner when the dot comes this close (keys along a row or a column),
export const POINTER_BORED_KEYS = 4      // and a dot this far away two steps running bores her back to sleep
export const POINTER_SPARKLE_MS = 1400   // a new sparkle this often,
export const POINTER_SPARKLES = 2        // at most this many at once,
export const POINTER_SPARKLE_UP_MS = 6000 // each for this long
export const POINTER_POINTS = 3          // a sparkle
export const POINTER_LAST_POINTS = 20    // for lasting to the end
// Whack-a-Mouse (Jon, 29 Oct 2026: "speed up more. Allow for more at once")
export const MICE_SPAWN_MIN_MS = 120     // a new one comes a mouse's time up shared among as many as may be up, never sooner than this
export const MICE_REFILL_MS = 150        // a tapped mouse's place is taken again this soon,
export const MICE_REFILL_MORE_MS = 300   // or up to this much later
export const MICE_UP_MS = 1300           // a mouse stays up this long at first,
export const MICE_UP_END_MS = 800        // this long by the end
export const MICE_GOLD_UP_MS = 900       // a gold one this long at first,
export const MICE_GOLD_UP_END_MS = 600   // this long by the end
export const MICE_AT_ONCE = 2            // up at once: two at first,
export const MICE_MORE_EVERY_MS = 20000  // one more every 20 seconds,
export const MICE_AT_ONCE_MAX = 6        // up to six
export const MICE_POINTS = 1
export const MICE_GOLD_POINTS = 3
export const MICE_PETS_FROM_MS = 5000    // Sir Irwin and his friends pop up too from 5 seconds in:
export const MICE_PET_ONE_IN = 4         // one in four that pop up is a friend, not a mouse
export const MICE_PETS_OUT = STRIKES_OUT // tap three friends and you're out (Jon, 29 Oct 2026)
export const MICE_REST_MS = 500          // a key a mouse has just left stays empty this long, so a late tap meant for it never meets a friend
export const MICE_LATE_MS = 150          // a tap this soon after a mouse hid still gets it: the deck shows every change a moment late
// Knock It Off the Table: four tables, things sliding along them one key a
// beat, the key at each table's end knocks them off (Jon, 29 Oct 2026:
// "linear", "button press only", "a few tables")
export const KNOCK_BEAT_MS = 500         // everything moves one key along this often at first,
export const KNOCK_BEAT_END_MS = 260     // this often by the end
export const KNOCK_EVERY_BEATS = 4       // a new thing every fourth beat at first,
export const KNOCK_EVERY_BEATS_END = 2   // every other beat by the end
export const KNOCK_PER_TABLE = 2         // at most two on a table,
export const KNOCK_APART = 3             // at least three keys apart
export const KNOCK_LATE_MS = 150         // a thing on the end can still be knocked this long after the beat it leaves on,
export const KNOCK_EARLY_MS = 120        // and a press this soon before it gets there knocks it as it comes
export const KNOCK_GONE_MS = 300         // a press on an end this soon after its thing got away is forgiven: the strike was its getting away
export const KNOCK_POINTS = 1
// Yarn Catch (Jon, 29 Oct 2026: "use the touch strip for left and right controls")
export const YARN_STEP_MS = 650          // a ball drops one row this often at first,
export const YARN_STEP_END_MS = 400      // this often by the end
export const YARN_SPAWN_MS = 1600        // a new ball this often at first,
export const YARN_SPAWN_END_MS = 1000    // this often by the end
export const YARN_FALLING = 3            // at most this many falling at once
export const YARN_LAND_MS = 200          // a ball on the bottom row waits this long for the basket, then it is missed
export const YARN_POINTS = 1
export const YARN_GOLD_POINTS = 3
// the mice and the yarn
export const GOLD_ONE_IN = 10            // one in ten is gold
// the visit's moments
export const READY_MS = 15000            // the how-to-play screen starts the count by itself after this
export const COUNT_MS = 3000             // 3, 2, 1
export const RESULT_MS = 5000
export const PICK_MS = 250               // a game picked on the menu: its key shows the green tick this long
export const CLUE_MIN_MS = 3000          // a press moves the clue on only after this,
export const CLUE_MAX_MS = 60000         // and it moves on by itself after this
export const WINNER_MS = 10000
export const WINNER_MIN_MS = 3000
export const FAREWELL_MS = 8000
export const MARQUEE_STEP_MS = 250       // the top row's lit paws move one key in towards the middle this often (Jon, 29 Oct 2026: flashing like an arcade game)
export const TIME_LIGHTS = 8             // a game's time on the strip: eight lights, one going out every eighth of it

// ---- the deck ----

export const ARCADE_NAME = "Miss Boo LaRue's Arcade"
export const COLS = 9, ROWS = 4, KEY_COUNT = 36, DIALS = 6
export const keyAt = (row, col) => row * COLS + col
export const rowOf = i => Math.floor(i / COLS)
export const colOf = i => i % COLS
export const LEFT_DIAL = 0               // the outside dials: the games are played on these two
export const RIGHT_DIAL = DIALS - 1
export const MENU_KEYS = [11, 12, 13, 14, 15] // the second row: two blank, five games, two blank
export const BACK_KEY = 27 // keyAt(3, 0): Back, on the ready screen only
const TOKEN_KEYS = [keyAt(2, 3), keyAt(2, 5)] // the player's two tokens, on the menu
const MIDDLE_KEY = keyAt(1, 4) // the count, OK, and Boo
export const STRIP_WIDTH = 1200 // the touch strip, in its own pixels: a tap's x runs 0 to 1199, left to right
const ALL_KEYS = Array.from({ length: KEY_COUNT }, (_, i) => i)
const ALL_COLUMNS = Array.from({ length: COLS }, (_, c) => c)

// Knock It Off the Table: a table along each row; the last key of each is its end.
export const TABLE_ENDS = [8, 17, 26, 35]

// ---- the visit ----

export const TOKENS = 2
export const MAX_PLAYERS = 3
export const ROUND_MS = 600000 // the practice round, ten minutes like an Act 4 round
export const FREE_GAME_MS = 120000
export const GAME_MS = 120000 // a visit's game for one or two players,
export const TRIO_GAME_MS = 80000 // and for three, so six games fit the round
// A visit's game that would run into the chime is cut short, so its clue still comes first:
export const CLUE_KEEP_MS = 15000 // after its points, this long is kept for the clue before the chime,
export const CUT_MIN_MS = 30000 // but no game is cut shorter than this
export function gameLengthMs(players) {
  const n = Array.isArray(players) ? players.length : Number(players) || 0
  return n >= 3 ? TRIO_GAME_MS : GAME_MS
}

// ---- the words ----

// The practice clue: the house's rehearsal stand-in, word for word
// (functions/lib/bagclues.js bagStandIn('boo', 4); a test keeps them equal).
// On the night (card 515) each player's own bag clue about the Ghost shows
// here instead.
export const STAND_IN_CLUE = "[Boo's bag clue about the Ghost appears here]"
export const CLUE_NOTE = 'Practice: on the night, your own clue about the Ghost shows here.'
// Jon's words (28 Oct 2026), exactly.
export const THIRD_LINE = "Didn't I give you enough? Now be off! I'm done playing games."
export const FAREWELL_LINE = 'Be on your way.'

// Boo's lines, by moment: arch and bored, "darling"; when she is pleased the
// alley cat slips through. Never a number, a rule or a word about the case,
// never her hint ladder, her Parlour Game lines or the Catwalk's verdicts,
// and no cat sounds (docs/cat-info.md). What to do is always a plain line.
export const BOO_LINES = {
  home: 'Darling. Pick a game. Try to keep up.',
  menu: [
    "Your turn, darling. Don't bore me.",
    "Well? I haven't got all night. I have, actually.",
    'Chin up. Pick something.',
    "Quickly now. I'm not getting any younger.",
  ],
  freePlay: "Play on, darlings. I'll pretend not to look.",
  freePlayOne: "Play on, darling. I'll pretend not to look.",
  win: ['Ha! Oh, that was good. I mean, adequate.', "Well, well. Somebody's been practising."],
  caught: 'Mine. Obviously.',
  pets: 'Hands off my friends, darling. Out you go.',
  lose: 'Tragic. Truly. Next.',
  time: 'Time, darling. Everything ends.',
  clue: 'You amused me. Here.',
  third: THIRD_LINE,
  winner: "The winner. I suppose I'll allow it.",
  tie: 'A tie. How terribly dull.',
  farewell: FAREWELL_LINE,
}

// The five games, in menu order (keys 11 to 15). `how` is the plain line
// (one or two short sentences), `boo` her line while it runs, `dials` the
// six labels along the bottom of the strip (only the outside two are ever
// used), `rule`, for a game that counts strikes, what the strip says before
// it starts, and `counts`, what the screen calls the game's own tally.
const ACROSS = '◀ ▶', UP_DOWN = '▼ ▲', NO_DIALS = ['', '', '', '', '', '']
export const GAMES = [
  {
    id: 'tail', name: 'Boo Chasing Her Tail', short: 'Tail',
    how: 'The left dial moves Boo left and right, the right dial up and down. Catch the white tip of her tail. The rest of her tail, the walls and her friends block her way.',
    boo: 'That tail mocks me, darling.',
    dials: [ACROSS, '', '', '', '', UP_DOWN],
    counts: 'Tail tips caught',
  },
  {
    id: 'pointer', name: 'The Lazy Pointer', short: 'Pointer',
    how: 'The left dial moves the red dot left and right, the right dial up and down. Grab the sparkles, and keep the dot away from Boo.',
    rule: "Caught three times and you're out.",
    boo: 'That little red dot. I will have it.',
    dials: [ACROSS, '', '', '', '', UP_DOWN],
    counts: 'Sparkles grabbed',
  },
  {
    id: 'mice', name: 'Whack-a-Mouse', short: 'Mice',
    how: "Tap a mouse before it hides; gold ones are worth more. Leave Sir Irwin and his friends alone: tap three and you're out.",
    rule: "Tap three friends and you're out.",
    boo: 'Mice. In my house. Unthinkable.',
    dials: NO_DIALS,
    counts: 'Mice bonked',
  },
  {
    id: 'knock', name: 'Knock It Off the Table', short: 'Knock',
    how: 'Things slide along four tables. Press the key at the end of a table as something reaches it, and knock it off.',
    rule: "Three misses and you're out.",
    boo: "It was in my way. They're all in my way.",
    dials: NO_DIALS,
    counts: 'Knocked off',
  },
  {
    id: 'yarn', name: 'Yarn Catch', short: 'Yarn',
    how: 'Tap the left or the right of the touch strip to slide the basket under the falling yarn. Gold yarn is worth more.',
    boo: "Catch it, darling. I don't fetch.",
    dials: NO_DIALS,
    counts: 'Yarn caught',
  },
]
const GAME = Object.fromEntries(GAMES.map(g => [g.id, g]))

// The things on Boo's tables, in the order they come.
export const KNOCK_OBJECTS = ['vase', 'teacup', 'teapot', 'candle', 'picture', 'clock', 'plant', 'cake']

// Whack-a-Mouse's decoys: Sir Irwin, the birthday boy, and his friends, Boo
// too (Jon, 29 Oct 2026: not pets, "they have these personas of friends to the
// family and the birthday boy"). Each is its own face picture
// (lib/arcadeArt.js PET_FILES); the ids stay as they were.
export const PETS = ['boo', 'granola', 'irwin', 'salem', 'zimmy']
// What a strike calls each of them (Jon, 29 Oct 2026). The old family
// solicitor's name is never shortened.
export const FRIEND_NAMES = { boo: 'Miss Boo', granola: 'Granolia', irwin: 'the birthday boy', salem: 'Salem', zimmy: 'Zimothy Clawford, Esq.' }
// The friends who come out in Boo Chasing Her Tail: never Boo herself.
export const TAIL_FRIENDS = PETS.filter(p => p !== 'boo')

// The way the pieces of Boo's tail point, on their keys; and the two sides of
// a key her tail runs between (sorted, joined), straight across or round a corner.
const WAYS = ['up', 'down', 'left', 'right']
export const FUR_PAIRS = ['left-right', 'down-up', 'down-left', 'down-right', 'left-up', 'right-up']

// Every face a key can show (the art draws each one), and the ones each game
// shows: the page has the deck make each game's pictures ready before it
// starts, so no key waits on one in play.
export const MENU_FACES = ['off', 'blank', 'paw', 'paw-lit', 'boo', 'back', 'ok', 'coin', 'coin-spent', 'num:1', 'num:2', 'num:3', 'hit', ...GAMES.map(g => `menu:${g.id}`)]
export const GAME_FACES = {
  tail: ['rug', 'tail-boo', 'wall', ...TAIL_FRIENDS.map(p => `pet:${p}`), ...FUR_PAIRS.map(p => `tail-fur:${p}`), ...WAYS.map(w => `tail-end:${w}`), ...WAYS.map(w => `tail-tip:${w}`), 'hit', 'back', 'num:1', 'num:2', 'num:3'],
  pointer: ['blank', 'dot', 'sparkle', 'chaser', 'boo-nap', 'boo-alert', 'caught', 'hit', 'back', 'num:1', 'num:2', 'num:3'],
  mice: ['blank', 'mouse', 'mouse-gold', ...PETS.map(p => `pet:${p}`), ...PETS.map(p => `oops:${p}`), 'hit', 'back', 'num:1', 'num:2', 'num:3'],
  knock: ['cloth', 'edge', ...KNOCK_OBJECTS.map(o => `table:${o}`), ...KNOCK_OBJECTS.map(o => `edge:${o}`), 'hit', 'miss', 'back', 'num:1', 'num:2', 'num:3'],
  yarn: ['blank', 'yarn', 'yarn-gold', 'basket', 'basket-catch', 'yarn-miss', 'back', 'num:1', 'num:2', 'num:3'],
}
export const FACE_IDS = [...new Set([...MENU_FACES, ...Object.values(GAME_FACES).flat()])]

// Every sound the engine asks for (lib/arcadeSound.js plays them).
export const SOUND_NAMES = ['coin', 'tick', 'go', 'point', 'gold', 'miss', 'knock', 'bite', 'win', 'lose', 'clue', 'chime', 'back']

// Boo's pictures in play/public/household/full/ (the fifth's name starts with a space).
export const BOO_PICTURES = ['Boo 1.png', 'Boo 2.png', 'Boo 3.png', 'Boo 4.png', ' Boo 5.png']

// ---- chance ----

// One step of mulberry32: a number in [0, 1) and the generator's next state.
export function nextRand(rs) {
  const a = ((rs >>> 0) + 0x6D2B79F5) >>> 0
  let t = Math.imul(a ^ (a >>> 15), a | 1)
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
  return { v: ((t ^ (t >>> 14)) >>> 0) / 4294967296, rs: a }
}

// A small, stable string hash (FNV-1a), for seeds and for picking lines.
export function hashOf(s) {
  const str = String(s ?? '')
  let h = 0x811c9dc5
  for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 0x01000193) >>> 0
  return h >>> 0
}
const seedOf = x => typeof x === 'number' && Number.isFinite(x) ? Math.floor(x) >>> 0 : hashOf(x)

// ---- the helpers every game shares ----

// A deep copy of plain JSON: each call works on its own copy and returns it.
const copy = x => Array.isArray(x) ? x.map(copy)
  : x && typeof x === 'object' ? Object.fromEntries(Object.entries(x).map(([k, v]) => [k, copy(v)])) : x
const uniq = list => [...new Set(list)]
function rand(s) { const r = nextRand(s.rs); s.rs = r.rs; return r.v } // s is this call's own copy
const pick = (s, list) => list[Math.floor(rand(s) * list.length)]
const isGold = s => rand(s) < 1 / GOLD_ONE_IN
const lerp = (from, to, f) => from + (to - from) * Math.min(1, Math.max(0, f))
const along = (s, t) => (t - s.startedAt) / (s.endsAt - s.startedAt) // 0 at the start, 1 at the end
const apart = (a, b) => Math.abs(rowOf(a) - rowOf(b)) + Math.abs(colOf(a) - colOf(b)) // keys along the rows and columns

// A key's green tick (a success) or red cross (a strike), for a moment: drawn
// over whatever the game has on that key until it ends.
function flash(s, key, face, t, ms) {
  s.flashes = [...s.flashes.filter(f => f.until > t && f.key !== key), { key, face, until: t + ms }]
}
function flashFaces(s, f, now) { for (const x of s.flashes) if (x.until > now) f[x.key] = x.face }
const tidyFlashes = s => { s.flashes = s.flashes.filter(f => f.until > s.at) }

// The board: a row and a column on it, the keys beside a key along its row and
// its column (two to four), and the key straight on from `to`, going the way
// from `from` to `to` (null past the edge).
const onBoard = (r, c) => r >= 0 && r < ROWS && c >= 0 && c < COLS
const besideOf = k => [[-1, 0], [1, 0], [0, -1], [0, 1]]
  .filter(([dr, dc]) => onBoard(rowOf(k) + dr, colOf(k) + dc)).map(([dr, dc]) => keyAt(rowOf(k) + dr, colOf(k) + dc))
function aheadOf(from, to) {
  const r = 2 * rowOf(to) - rowOf(from), c = 2 * colOf(to) - colOf(from)
  return onBoard(r, c) ? keyAt(r, c) : null
}
// How near the nearest of `keys` is to `k`, along the rows and columns.
const nearest = (keys, k) => Math.min(...keys.map(x => apart(x, k)))

// One click of a dial is one key, every click (Jon, 29 Oct 2026). The deck
// reports a brisk turn as several clicks at once (a signed count), so a turn
// moves that many keys, one at a time, the game checking each key on the way,
// and never more than DIAL_MAX_KEYS for one report; an arrow key is one key.
// An event's way along a row (dc: -1 left, 1 right) or up and down a column
// (dr: -1 up, 1 down) and how many keys: the left dial or the left and right
// arrows along a row, the right dial (clockwise is up) or the up and down
// arrows up and down. Null for anything else.
function movesOf(e) {
  if (e.kind === 'arrow') return { dc: { left: -1, right: 1 }[e.dir] ?? 0, dr: { up: -1, down: 1 }[e.dir] ?? 0, keys: 1 }
  if (e.kind !== 'turn' || (e.dial !== LEFT_DIAL && e.dial !== RIGHT_DIAL)) return null
  const way = Math.sign(e.amount), keys = Math.min(DIAL_MAX_KEYS, Math.max(1, Math.round(Math.abs(e.amount))))
  return e.dial === LEFT_DIAL ? { dc: way, dr: 0, keys } : { dc: 0, dr: -way, keys }
}

// A deck or on-screen event, checked and made plain.
function plainEvent(ev) {
  if (!ev || typeof ev !== 'object') return null
  const inRange = (x, top) => Number.isInteger(x) && x >= 0 && x < top
  const onStrip = x => Math.min(STRIP_WIDTH - 1, Math.max(0, Number(x) || 0))
  switch (ev.kind) {
    case 'key': return inRange(ev.index, KEY_COUNT) ? { kind: 'key', index: ev.index } : null
    case 'press': return { kind: 'press', dial: inRange(ev.dial, DIALS) ? ev.dial : 0 }
    case 'strip': return { kind: 'strip', x: onStrip(ev.x) }
    case 'swipe': {
      const from = onStrip(ev.from), to = onStrip(ev.to)
      return from === to ? { kind: 'strip', x: from } : { kind: 'swipe', from, to }
    }
    case 'arrow': return WAYS.includes(ev.dir) ? { kind: 'arrow', dir: ev.dir } : null
    case 'turn': {
      const amount = Number(ev.amount)
      return inRange(ev.dial, DIALS) && Number.isFinite(amount) && amount !== 0 ? { kind: 'turn', dial: ev.dial, amount } : null
    }
    default: return null
  }
}

// ---- 1. Boo Chasing Her Tail: Boo chases her own tail's white tip over the whole board ----

// The whole board is her rug, and Boo herself is on it (Jon, 29 Oct 2026:
// "make the paws boos face"). Her tail (s.tail: its end, its middle and its
// white tip) runs about the board by itself, end first, so the tip trails at
// the back: she can catch it from behind or from the side, never head on, as
// its end and its middle are in her way ("dont let players hit it from the
// front. It blocks them."). Walls and her friends come out as the game goes
// on (s.blocks), and stay put; none ever shuts a key in or leaves a dead end.
const tailStepMs = (s, t) => lerp(TAIL_STEP_MS, TAIL_STEP_END_MS, along(s, t))
const blocked = (s, k) => s.blocks.some(b => b.key === k) // a wall or a friend is on it
// A key the tail can step onto: not Boo, not a wall or a friend, not its own.
const tailFree = (s, k) => k !== s.boo && !s.tail.includes(k) && !blocked(s, k)
// The way from one key to its neighbour, as the tail's pieces point.
function wayOf(from, to) {
  const dr = rowOf(to) - rowOf(from), dc = colOf(to) - colOf(from)
  return Math.abs(dc) >= Math.abs(dr) ? (dc > 0 ? 'right' : 'left') : (dr > 0 ? 'down' : 'up')
}

const tail = {
  start(s) {
    layTail(s, s.startedAt)
    s.catches = 0
    s.flashes = []
  },
  due: s => Math.min(s.nextAt, s.nextBlockAt ?? Infinity),
  fire(s, t) {
    // a wall or a friend comes out (first), then the tail steps
    if (s.nextBlockAt != null && s.nextBlockAt <= t) return placeBlock(s, t)
    stepTail(s)
    s.nextAt = t + tailStepMs(s, t)
  },
  input(s, e, t) {
    const m = movesOf(e)
    // key by key: the board's edge, a wall, a friend and the rest of her tail
    // stop her where she is, and the rest of the turn; nothing else happens
    for (let n = 0; m && n < m.keys; n++) {
      const r = rowOf(s.boo) + m.dr, c = colOf(s.boo) + m.dc
      if (!onBoard(r, c)) return
      const to = keyAt(r, c)
      if (to === s.tail[2]) return caughtTail(s, to, t) // the white tip: caught, and that ends the turn
      if (s.tail.includes(to) || blocked(s, to)) return
      s.boo = to
    }
  },
  tidy: tidyFlashes,
  faces(s, f, now) {
    for (const k of ALL_KEYS) f[k] = 'rug'
    for (const b of s.blocks) f[b.key] = b.friend ? `pet:${b.friend}` : 'wall'
    // her tail: its end (pointing the way its middle lies), its middle (straight or round a corner) and its tip
    const [end, mid, tip] = s.tail
    f[end] = `tail-end:${wayOf(end, mid)}`
    f[mid] = `tail-fur:${[wayOf(mid, tip), wayOf(mid, end)].sort().join('-')}`
    f[tip] = `tail-tip:${wayOf(mid, tip)}`
    f[s.boo] = 'tail-boo'
    flashFaces(s, f, now)
  },
}
// Her board laid out from `t`: Boo on the left, no walls or friends yet, and
// her tail in the right half heading away from her; its first step a step
// after `t`, the first wall TAIL_BLOCKS_FROM_MS after. A new game is laid out
// so, and so is one an older copy of this engine began (mended).
function layTail(s, t) {
  s.boo = keyAt(2, 1) // Boo herself, on the left
  s.blocks = [] // { key, friend }: a wall (friend null) or one of her friends, in the order they came
  s.tail = []
  // her tail in the right half, heading away from her
  whipTail(s, place => place.every(k => colOf(k) >= COLS / 2) && apart(aheadOf(place[1], place[0]), s.boo) > apart(place[0], s.boo))
  s.nextAt = t + tailStepMs(s, t)
  s.nextBlockAt = t + TAIL_BLOCKS_FROM_MS // null once they are all out
}
// The tail's step: its end onto a free key beside it, its middle and tip
// after it. Mostly straight on, now and then a turn; never into a dead end
// when it has another way; and with Boo close it runs from her. With nowhere
// to go (Boo in its way) it waits.
function stepTail(s) {
  const [end, mid] = s.tail
  const free = besideOf(end).filter(k => tailFree(s, k))
  if (!free.length) return
  // the ways on from a key once the end is there (the tip will have moved on)
  const onward = k => besideOf(k).filter(n => n !== end && n !== s.boo && !blocked(s, n)).length
  const open = free.filter(k => onward(k) > 0)
  const ways = open.length ? open : free
  const ahead = aheadOf(mid, end)
  let to
  if (nearest(s.tail, s.boo) <= TAIL_FLEE_KEYS) {
    // she is close: the key furthest from her, the most open of those, straight on if it is one
    const rank = k => apart(k, s.boo) * 4 + onward(k)
    const best = Math.max(...ways.map(rank))
    const top = ways.filter(k => rank(k) === best)
    to = top.includes(ahead) ? ahead : pick(s, top)
  } else {
    const turns = ways.filter(k => k !== ahead)
    to = ways.includes(ahead) && !(turns.length && rand(s) < 1 / TAIL_TURN_ONE_IN) ? ahead : pick(s, turns)
  }
  s.tail = [to, end, mid]
}
// Every way the whole tail can lie, its end first: three free keys in a row or
// round a corner, with a free key straight on from its end to go to.
function tailPlaces(s) {
  const free = k => k != null && k !== s.boo && !blocked(s, k)
  const places = []
  for (const mid of ALL_KEYS.filter(free)) {
    const by = besideOf(mid).filter(free)
    for (const end of by) for (const tip of by) if (end !== tip && free(aheadOf(mid, end))) places.push([end, mid, tip])
  }
  return places
}
// The tail comes back whole somewhere else, by chance, and so it starts:
// every key of it at least TAIL_AWAY_KEYS from Boo, or as far as any place
// can be. `fits` narrows the places it may come.
function whipTail(s, fits = () => true) {
  const places = tailPlaces(s).filter(fits)
  if (!places.length) return // never, on a board this size
  const far = Math.min(TAIL_AWAY_KEYS, Math.max(...places.map(p => nearest(p, s.boo))))
  s.tail = pick(s, places.filter(p => nearest(p, s.boo) >= far))
}
// A catch: Boo on the tip's key, its green tick there, and the tail whips away
// to come back whole somewhere else, its next step a whole step later.
function caughtTail(s, key, t) {
  s.boo = key
  s.catches += 1
  s.score += TAIL_POINTS
  s.events.push('point')
  flash(s, key, 'hit', t, HIT_MS)
  whipTail(s)
  s.nextAt = t + tailStepMs(s, t)
}
// A wall or a friend comes out, in turn, a wall first: on a free key at least
// two keys from Boo and from every key of her tail, where it shuts nothing in
// and leaves no dead end, picked by chance. If no key will do, none comes
// this time: it tries again at the next.
function placeBlock(s, t) {
  const spots = ALL_KEYS.filter(k => !blocked(s, k) && apart(k, s.boo) >= 2 && nearest(s.tail, k) >= 2 && roomy([...s.blocks.map(b => b.key), k]))
  if (spots.length) {
    const friend = s.blocks.length % 2 === 1 ? nextFriend(s) : null
    s.blocks.push({ key: pick(s, spots), friend })
  }
  s.nextBlockAt = s.blocks.length < TAIL_BLOCKS_MAX ? t + TAIL_BLOCKS_EVERY_MS : null
}
// One of her friends: each comes once before any comes twice.
function nextFriend(s) {
  const out = f => s.blocks.filter(b => b.friend === f).length
  const fewest = Math.min(...TAIL_FRIENDS.map(out))
  return pick(s, TAIL_FRIENDS.filter(f => out(f) === fewest))
}
// With walls and friends on `keys`: every other key still has two ways out
// (the board's edge counts as a wall), and they are all joined together.
function roomy(keys) {
  const shut = new Set(keys)
  const open = ALL_KEYS.filter(k => !shut.has(k))
  if (open.some(k => besideOf(k).filter(n => !shut.has(n)).length < 2)) return false
  const reached = new Set([open[0]])
  for (const k of reached) for (const n of besideOf(k)) if (!shut.has(n)) reached.add(n)
  return reached.size === open.length
}

// ---- 2. The Lazy Pointer: the red dot, the sparkles, and Boo after the dot ----

const pointerStepMs = (s, t) => lerp(POINTER_STEP_MS, POINTER_STEP_END_MS, along(s, t))
const napMs = s => POINTER_NAP_MS * (1 + rand(s) / 2)
// Boo's step towards the dot: along a row or down a column, never both at
// once, the longer way first (so the dot can slip past her).
function stalk(s) {
  const dr = rowOf(s.dot) - rowOf(s.boo), dc = colOf(s.dot) - colOf(s.boo)
  const across = Math.abs(dc) > Math.abs(dr) || (Math.abs(dc) === Math.abs(dr) && rand(s) < 0.5)
  return across ? keyAt(rowOf(s.boo), colOf(s.boo) + Math.sign(dc)) : keyAt(rowOf(s.boo) + Math.sign(dr), colOf(s.boo))
}

const pointer = {
  start(s) {
    s.dot = keyAt(1, 1)
    s.boo = keyAt(2, 7)
    s.awake = false
    s.wakeAt = s.startedAt + napMs(s) // the end of her nap
    s.nextAt = null // her next step, while she is awake
    s.alertUntil = 0 // she has just woken: the ! until her first step
    s.far = 0 // her steps in a row with the dot far away
    s.sparkles = [] // { key, until }
    s.nextSparkleAt = s.startedAt + 600
    s.strikes = 0
    s.sparkled = 0
    s.flashes = []
  },
  due: s => Math.min(s.awake ? s.nextAt : s.wakeAt, s.nextSparkleAt, ...s.sparkles.map(x => x.until)),
  fire(s, t) {
    // a sparkle fades (first), then Boo wakes or steps, then a new sparkle comes
    if (s.sparkles.some(x => x.until <= t)) { s.sparkles = s.sparkles.filter(x => x.until > t); return }
    if (!s.awake && s.wakeAt <= t) return wake(s, t)
    if (s.awake && s.nextAt <= t) {
      s.boo = stalk(s)
      if (s.boo === s.dot) return pounced(s, t)
      s.far = apart(s.boo, s.dot) >= POINTER_BORED_KEYS ? s.far + 1 : 0
      if (s.far >= 2) return nap(s, t) // bored: back to sleep
      s.nextAt = t + pointerStepMs(s, t)
      return
    }
    if (s.nextSparkleAt > t) return
    if (s.sparkles.length < POINTER_SPARKLES) {
      const free = ALL_KEYS.filter(k => k !== s.dot && k !== s.boo && !s.sparkles.some(x => x.key === k))
      // one in three comes near her: the dot has to go close to get it
      const near = rand(s) < 1 / 3 ? free.filter(k => apart(k, s.boo) <= 2) : []
      const list = near.length ? near : free
      if (list.length) s.sparkles.push({ key: pick(s, list), until: t + POINTER_SPARKLE_UP_MS })
    }
    s.nextSparkleAt = t + POINTER_SPARKLE_MS
  },
  input(s, e, t) {
    const m = movesOf(e)
    // key by key: a sparkle on the way is grabbed, and the dot coming beside Boo wakes her
    for (let n = 0; m && n < m.keys; n++) {
      const r = rowOf(s.dot) + m.dr, c = colOf(s.dot) + m.dc
      if (!onBoard(r, c)) return // the edges stop it, and the rest of the turn
      const to = keyAt(r, c)
      if (to === s.boo) return // and it stops beside her
      s.dot = to
      const got = s.sparkles.find(x => x.key === to)
      if (got) {
        s.sparkles = s.sparkles.filter(x => x !== got)
        s.sparkled += 1
        s.score += POINTER_POINTS
        s.events.push('point')
        flash(s, to, 'hit', t, HIT_MS)
      }
      if (!s.awake && apart(s.dot, s.boo) <= POINTER_WAKE_KEYS) wake(s, t)
    }
  },
  timeUp(s) { s.score += POINTER_LAST_POINTS },
  tidy: tidyFlashes,
  faces(s, f, now) {
    for (const x of s.sparkles) f[x.key] = 'sparkle'
    f[s.dot] = 'dot'
    f[s.boo] = !s.awake ? 'boo-nap' : now < s.alertUntil ? 'boo-alert' : 'chaser'
    flashFaces(s, f, now)
  },
}
function wake(s, t) {
  s.awake = true
  s.far = 0
  s.nextAt = t + pointerStepMs(s, t)
  s.alertUntil = s.nextAt
}
function nap(s, t) {
  s.awake = false
  s.nextAt = null
  s.wakeAt = t + napMs(s)
}
// She has the dot: a strike, the red cross on her, and the dot starts again
// on the free key furthest from her while she naps.
function pounced(s, t) {
  s.strikes += 1
  s.events.push('bite')
  flash(s, s.boo, 'caught', t, MISS_MS)
  if (s.strikes >= STRIKES_OUT) return finish(s, 'lose', t)
  s.said = { words: `Strike ${s.strikes}! Boo caught it.`, until: t + STRIKE_WORDS_MS }
  const free = ALL_KEYS.filter(k => k !== s.boo && !s.sparkles.some(x => x.key === k))
  s.dot = free.reduce((best, k) => (apart(k, s.boo) > apart(best, s.boo) ? k : best), free[0])
  nap(s, t)
}

// ---- 3. Whack-a-Mouse ----

// Sir Irwin and his friends pop up among the mice from 5 seconds in. Each is
// up as long as a plain mouse; tapping one scores nothing, and the third ends
// the game. A mouse that hides, or an empty key, never counts against anyone,
// and a key a mouse has just left (hidden or tapped) rests a moment, so a late
// tap meant for that mouse never meets a friend; a tap just after it hid still
// gets it. A new one comes as often as a mouse's time up shared among as many
// as may be up now, so more are up as the game goes on (Jon, 29 Oct 2026:
// "speed up more. Allow for more at once").
const miceAtOnce = (s, t) => Math.min(MICE_AT_ONCE_MAX, MICE_AT_ONCE + Math.floor((t - s.startedAt) / MICE_MORE_EVERY_MS))
const mice = {
  start(s) {
    s.mice = [] // { key, gold, downAt }
    s.pets = [] // { key, pet, downAt }: Sir Irwin or a friend
    s.rests = [] // { key, until, late, gold }: a key a mouse has just left (late: until when a tap still gets the one that hid)
    s.flashes = []
    s.petTaps = 0
    s.bonked = 0
    s.golds = 0 // gold ones bonked
    s.nextSpawnAt = s.startedAt
  },
  due: s => Math.min(s.nextSpawnAt, ...s.mice.map(m => m.downAt), ...s.pets.map(p => p.downAt)),
  fire(s, t) {
    // a mouse or a friend ducks (before any new one comes at the same moment)
    if ([...s.mice, ...s.pets].some(m => m.downAt <= t)) {
      const hid = s.mice.filter(m => m.downAt <= t).map(m => ({ key: m.key, until: t + MICE_REST_MS, late: t + MICE_LATE_MS, gold: m.gold }))
      s.rests = [...s.rests.filter(r => r.until > t), ...hid]
      s.mice = s.mice.filter(m => m.downAt > t)
      s.pets = s.pets.filter(p => p.downAt > t)
      return
    }
    if (s.nextSpawnAt > t) return
    if (s.mice.length + s.pets.length < miceAtOnce(s, t)) {
      const busy = new Set([...s.mice, ...s.pets, ...s.flashes.filter(x => x.until > t), ...s.rests.filter(r => r.until > t)].map(x => x.key))
      const free = ALL_KEYS.filter(k => !busy.has(k))
      if (free.length) {
        const key = pick(s, free)
        const f = along(s, t)
        const up = lerp(MICE_UP_MS, MICE_UP_END_MS, f)
        if (t - s.startedAt >= MICE_PETS_FROM_MS && rand(s) < 1 / MICE_PET_ONE_IN) {
          s.pets.push({ key, pet: pick(s, PETS), downAt: t + up })
        } else {
          const gold = isGold(s)
          s.mice.push({ key, gold, downAt: t + (gold ? lerp(MICE_GOLD_UP_MS, MICE_GOLD_UP_END_MS, f) : up) })
        }
      }
    }
    s.nextSpawnAt = t + Math.max(MICE_SPAWN_MIN_MS, lerp(MICE_UP_MS, MICE_UP_END_MS, along(s, t)) / miceAtOnce(s, t))
  },
  input(s, e, t) {
    if (e.kind !== 'key') return
    const p = s.pets.find(x => x.key === e.index)
    if (p) {
      s.pets = s.pets.filter(x => x !== p)
      s.petTaps += 1
      flash(s, p.key, `oops:${p.pet}`, t, MISS_MS)
      if (s.petTaps >= MICE_PETS_OUT) return finish(s, 'lose', t)
      s.events.push('miss')
      // who it was, by name (Zimothy's "Esq." ends the sentence by itself)
      const name = FRIEND_NAMES[p.pet]
      s.said = { words: `Strike ${s.petTaps}! That's ${name}${name.endsWith('.') ? '' : '.'}`, until: t + STRIKE_WORDS_MS }
      return
    }
    let m = s.mice.find(x => x.key === e.index)
    if (m) s.mice = s.mice.filter(x => x !== m)
    else {
      m = s.rests.find(r => r.key === e.index && r.late > t) // it hid a moment ago: the deck may still show it
      if (!m) return // an empty key does nothing
    }
    s.bonked += 1
    if (m.gold) s.golds += 1
    s.score += m.gold ? MICE_GOLD_POINTS : MICE_POINTS
    s.events.push(m.gold ? 'gold' : 'point')
    flash(s, m.key, 'hit', t, HIT_MS)
    s.rests = [...s.rests.filter(r => r.until > t && r.key !== m.key), { key: m.key, until: t + MICE_REST_MS, late: 0, gold: false }]
    // a mouse's place is taken again soon after a tap
    s.nextSpawnAt = Math.min(s.nextSpawnAt, t + MICE_REFILL_MS + rand(s) * MICE_REFILL_MORE_MS)
  },
  tidy(s) {
    tidyFlashes(s)
    s.rests = s.rests.filter(r => r.until > s.at)
  },
  faces(s, f, now) {
    for (const m of s.mice) f[m.key] = m.gold ? 'mouse-gold' : 'mouse'
    for (const p of s.pets) f[p.key] = `pet:${p.pet}`
    flashFaces(s, f, now)
  },
}

// ---- 4. Knock It Off the Table: four tables, each row one, its last key the end ----

const END = COLS - 1
const knockBeatMs = (s, t) => lerp(KNOCK_BEAT_MS, KNOCK_BEAT_END_MS, along(s, t))
const knockEvery = (s, t) => Math.round(lerp(KNOCK_EVERY_BEATS, KNOCK_EVERY_BEATS_END, along(s, t)))

const knock = {
  start(s) {
    s.things = [] // { row, col, obj, goneAt }: goneAt, once it has sat on the end its beat
    s.beats = 0
    s.made = 0 // things put on the tables so far: they come in KNOCK_OBJECTS's order
    s.knocked = 0
    s.strikes = 0
    s.flashes = []
    s.gotAway = [] // { row, until }: a table whose thing got away a moment ago (a press on its end until then is forgiven, once)
    s.nextAt = s.startedAt + knockBeatMs(s, s.startedAt)
  },
  due: s => Math.min(s.nextAt, ...s.things.filter(x => x.goneAt != null).map(x => x.goneAt)),
  fire(s, t) {
    // a thing left on the end past its beat gets away (first)
    const gone = s.things.find(x => x.goneAt != null && x.goneAt <= t)
    if (gone) {
      s.things = s.things.filter(x => x !== gone)
      s.gotAway = [...s.gotAway.filter(x => x.until > t), { row: gone.row, until: t + KNOCK_GONE_MS }]
      return knockStrike(s, t, keyAt(gone.row, END), 'It got away.')
    }
    if (s.nextAt > t) return
    // the beat: everything moves one key along; a thing on the end stays a moment more
    s.beats += 1
    for (const x of s.things) {
      if (x.col < END) x.col += 1
      else if (x.goneAt == null) x.goneAt = t + KNOCK_LATE_MS
    }
    // and now and then a new one, at the start of a table with room on it
    if ((s.beats - 1) % knockEvery(s, t) === 0) {
      const room = [0, 1, 2, 3].filter(row => {
        const on = s.things.filter(x => x.row === row)
        return on.length < KNOCK_PER_TABLE && on.every(x => x.col >= KNOCK_APART)
      })
      if (room.length) {
        s.things.push({ row: pick(s, room), col: 0, obj: KNOCK_OBJECTS[s.made % KNOCK_OBJECTS.length], goneAt: null })
        s.made += 1
      }
    }
    s.nextAt = t + knockBeatMs(s, t)
  },
  input(s, e, t) {
    if (e.kind !== 'key') return // the keys only: no dial, no strip
    const row = TABLE_ENDS.indexOf(e.index)
    if (row < 0) return // only the end of a table knocks
    let x = s.things.find(y => y.row === row && y.col === END)
    if (!x && s.nextAt - t <= KNOCK_EARLY_MS) x = s.things.find(y => y.row === row && y.col === END - 1) // just a moment early
    if (!x) {
      // a moment too late for a thing that got away: its getting away was the strike, so this press is forgiven, once
      const late = s.gotAway.find(y => y.row === row && y.until > t)
      if (late) { s.gotAway = s.gotAway.filter(y => y !== late); return }
      return knockStrike(s, t, e.index, 'Too soon.')
    }
    s.things = s.things.filter(y => y !== x)
    s.knocked += 1
    s.score += KNOCK_POINTS
    s.events.push('knock')
    flash(s, e.index, 'hit', t, HIT_MS)
  },
  tidy(s) {
    tidyFlashes(s)
    s.gotAway = s.gotAway.filter(x => x.until > s.at)
  },
  faces(s, f, now) {
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < END; c++) f[keyAt(r, c)] = 'cloth'
      f[keyAt(r, END)] = 'edge'
    }
    // the flashes, then the things over them: a thing coming to an end is never hidden under a tick or a cross
    flashFaces(s, f, now)
    for (const x of s.things) f[keyAt(x.row, x.col)] = `${x.col === END ? 'edge' : 'table'}:${x.obj}`
  },
}
function knockStrike(s, t, key, words) {
  s.strikes += 1
  flash(s, key, 'miss', t, MISS_MS)
  if (s.strikes >= STRIKES_OUT) return finish(s, 'lose', t)
  s.events.push('miss')
  s.said = { words: `Strike ${s.strikes}! ${words}`, until: t + STRIKE_WORDS_MS }
}

// ---- 5. Yarn Catch: balls of yarn drop down the columns into Boo's basket ----

const yarnStepMs = (s, t) => lerp(YARN_STEP_MS, YARN_STEP_END_MS, along(s, t))

const yarn = {
  start(s) {
    s.basket = 4 // its column, on the bottom row: keyAt(3, 4)
    s.balls = [] // { col, row, gold, nextAt, missAt }: missAt, once it waits on the bottom row
    s.flashes = []
    s.catchUntil = 0 // the basket shows green until then
    s.caught = 0
    s.golds = 0 // gold ones caught
    s.dropped = 0
    s.nextSpawnAt = s.startedAt
  },
  due: s => Math.min(s.nextSpawnAt, ...s.balls.map(b => b.missAt ?? b.nextAt)),
  fire(s, t) {
    // a ball drops a row, or is missed (before any new one comes at the same moment)
    const ball = s.balls.find(b => (b.missAt ?? b.nextAt) <= t)
    if (ball) {
      if (ball.missAt != null) {
        s.balls = s.balls.filter(b => b !== ball)
        s.dropped += 1
        s.events.push('miss')
        flash(s, keyAt(ROWS - 1, ball.col), 'yarn-miss', t, MISS_MS)
        return
      }
      ball.row += 1
      if (ball.row < ROWS - 1) { ball.nextAt = t + yarnStepMs(s, t); return }
      // the bottom row: into the basket, or it waits there a moment for it
      if (ball.col === s.basket) return caughtYarn(s, ball, t)
      ball.missAt = t + YARN_LAND_MS
      return
    }
    if (s.nextSpawnAt > t) return
    if (s.balls.length < YARN_FALLING) {
      const used = new Set(s.balls.map(b => b.col))
      const free = ALL_COLUMNS.filter(c => !used.has(c))
      if (free.length) {
        const col = pick(s, free)
        const gold = isGold(s)
        s.balls.push({ col, row: 0, gold, nextAt: t + yarnStepMs(s, t), missAt: null })
      }
    }
    s.nextSpawnAt = t + lerp(YARN_SPAWN_MS, YARN_SPAWN_END_MS, along(s, t))
  },
  input(s, e, t) {
    // the touch strip: a tap on its left half moves the basket one key left, on its right half one right
    const dc = e.kind === 'strip' ? (e.x < STRIP_WIDTH / 2 ? -1 : 1)
      : e.kind === 'swipe' ? Math.sign(e.to - e.from)
        : e.kind === 'arrow' ? ({ left: -1, right: 1 }[e.dir] ?? 0) : 0
    if (!dc) return
    const c = s.basket + dc
    if (c < 0 || c >= COLS) return // the edges stop it
    s.basket = c
    const waiting = s.balls.find(b => b.missAt != null && b.col === c)
    if (waiting) caughtYarn(s, waiting, t) // just in time
  },
  tidy: tidyFlashes,
  faces(s, f, now) {
    for (const b of s.balls) f[keyAt(b.row, b.col)] = b.gold ? 'yarn-gold' : 'yarn'
    flashFaces(s, f, now)
    f[keyAt(ROWS - 1, s.basket)] = now < s.catchUntil ? 'basket-catch' : 'basket'
  },
}
function caughtYarn(s, ball, t) {
  s.balls = s.balls.filter(b => b !== ball)
  s.caught += 1
  if (ball.gold) s.golds += 1
  s.score += ball.gold ? YARN_GOLD_POINTS : YARN_POINTS
  s.events.push(ball.gold ? 'gold' : 'point')
  s.catchUntil = t + HIT_MS
}

const RULES = { tail, pointer, mice, knock, yarn }

// What a game has counted so far, for the screen: its own tally and its strikes.
const tallyCount = g => ({ tail: g.catches, pointer: g.sparkled, mice: g.bonked, knock: g.knocked, yarn: g.caught })[g.id] ?? 0
const strikesOf = g => g.id === 'mice' ? g.petTaps : g.id === 'pointer' || g.id === 'knock' ? g.strikes : null

// ---- one game ----

// The game ends: a win, a loss, or its time. Running out the clock is a good
// end in every game, so it plays the win sound.
function finish(s, outcome, t) {
  s.over = true
  s.outcome = outcome
  s.endedAt = t
  s.at = t
  s.events.push(outcome === 'lose' ? 'lose' : 'win')
}

// Run every timer that falls due up to `now`, earliest first, one at a time,
// so a page that slept for seconds misses no catch, no step and no knock.
function advance(s, now) {
  if (s.over) return
  const rules = RULES[s.id]
  const until = Math.min(now, s.endsAt)
  for (let n = 0; n < 100000 && !s.over; n++) {
    const t = rules.due(s)
    if (!(t <= until) || t >= s.endsAt) break
    rules.fire(s, t)
    if (!s.over) s.at = Math.max(s.at, t)
  }
  if (!s.over && now >= s.endsAt) {
    s.at = s.endsAt
    rules.timeUp?.(s)
    finish(s, 'time', s.endsAt)
  }
  if (!s.over) s.at = Math.max(s.at, until)
  rules.tidy?.(s)
}

export function newGame(id, { seed, lengthMs, now = 0 } = {}) {
  const rules = RULES[id]
  if (!rules) throw new Error(`No such game: ${id}`)
  const length = Number(lengthMs) > 0 ? Number(lengthMs) : FREE_GAME_MS
  // `said`: a strike's words for the strip, until a time
  const s = { id, startedAt: now, endsAt: now + length, at: now, score: 0, over: false, outcome: null, endedAt: null, events: [], said: null, rs: seedOf(seed) }
  rules.start(s)
  return s
}

// A game begun by an older copy of this engine. The page keeps its game across
// a hot reload on the dev server, so one can meet this copy mid-game: what this
// copy added is filled in, so it plays on and is drawn rather than throwing.
// Boo Chasing Her Tail's board is laid out afresh (the old ring has no place
// on it), its points and its time kept; the Knock's pardons and the gold counts
// start empty. `g` itself when nothing is missing, else a mended copy.
function mended(g) {
  const missing = g.id === 'tail' ? !Array.isArray(g.tail)
    : g.id === 'knock' ? !Array.isArray(g.gotAway)
      : g.id === 'mice' || g.id === 'yarn' ? !Number.isFinite(g.golds) : false
  if (!missing) return g
  const s = copy(g)
  if (s.id === 'tail') {
    for (const k of ['paw', 'tip', 'side', 'way']) delete s[k] // the ring's
    layTail(s, s.at)
  } else if (s.id === 'knock') s.gotAway = []
  else s.golds = 0
  return s
}

export function stepGame(g, now) {
  const s = copy(mended(g))
  s.events = []
  advance(s, now)
  s.events = uniq(s.events)
  return s
}

// An event at `now`: the game first catches up to `now`, then takes it.
export function inputGame(g, ev, now) {
  const s = copy(mended(g))
  s.events = []
  advance(s, now)
  const e = plainEvent(ev)
  if (e && !s.over) RULES[s.id].input(s, e, Math.max(now, s.at))
  s.events = uniq(s.events)
  return s
}

// The 36 keys' faces at `now` (a flash lasts its time even on a finished game).
export function gameFaces(g, now = g?.at ?? 0) {
  const f = new Array(KEY_COUNT).fill('blank')
  const rules = g && RULES[g.id]
  if (rules) rules.faces(mended(g), f, now)
  return f
}

// ---- the whole page: the menu, a practice visit, free play, the chime ----

// Stages: 'home' (free play's menu), 'menu' (a visit: the player whose turn
// it is picks), 'ready', 'count', 'play', 'result', 'clue', 'third',
// 'winner', 'farewell'.
const BEAT_MS = COUNT_MS / 3
const TURN_STAGES = ['menu', 'ready', 'count', 'play', 'result', 'clue', 'third']
const PLAYING = ['ready', 'count', 'play', 'result']
const counted = s => s.mode === 'visit' && !s.free // a visit's games, before its free play
const gameSeed = s => hashOf(`${s.seed}:${s.played}`)
// How long a game that starts at `t` runs. In a visit, one that would run into
// the chime is cut short (CLUE_KEEP_MS, CUT_MIN_MS); free play is never cut.
function lengthFor(s, t) {
  if (!counted(s)) return FREE_GAME_MS
  const full = gameLengthMs(s.players.length)
  if (s.roundEndsAt == null) return full
  return Math.min(full, Math.max(CUT_MIN_MS, s.roundEndsAt - t - RESULT_MS - CLUE_KEEP_MS))
}
// The game `id` as it starts at `t`: the ready screen's board and the game itself are both made here.
const gameAt = (s, id, t) => ({ ...newGame(id, { seed: gameSeed(s), lengthMs: lengthFor(s, t), now: t }), events: [] })
const totalOf = p => p.games.reduce((sum, x) => sum + x.score, 0)
// The first name, as the practice pages clean it (lib/gametest.js cleanName).
const cleanName = name => String(name ?? '').replace(/\s+/g, ' ').trim().slice(0, 30).trim()

// The page's own fun facts, for the screen: kept only in the arcade's state,
// so a reload forgets them (the page keeps nothing).
const NO_STATS = { games: 0, mice: 0, gold: 0, pets: 0, tails: 0, sparkles: 0, pounces: 0, knocked: 0, yarn: 0, best: null }

export function newArcade({ mode = 'free', players = [], seed, now = 0, roundMs = ROUND_MS } = {}) {
  const visit = mode === 'visit'
  const names = visit ? (Array.isArray(players) && players.length ? players : ['']).slice(0, MAX_PLAYERS) : []
  return {
    mode: visit ? 'visit' : 'free',
    free: false,
    seed: seedOf(seed ?? now),
    stage: visit ? 'menu' : 'home',
    stageAt: now,
    players: names.map((p, i) => ({
      name: cleanName(typeof p === 'string' ? p : p?.name) || `Player ${i + 1}`,
      tokens: TOKENS,
      games: [], // { game, score }
      reached: false, // has seen their clue, or the third's line
    })),
    turn: 0,
    roundEndsAt: visit ? now + (Number(roundMs) > 0 ? Number(roundMs) : ROUND_MS) : null,
    pick: null,
    pickedKey: null, // the menu key just pressed, green for PICK_MS
    game: null,
    played: 0, // games begun on this arcade: each one's seed comes from it
    beats: 0,
    pending: [], // at the chime: who it caught short, in turn order
    thirdPending: false, // and whether a trio's third player is among them (last), owed Boo's line
    stats: { ...NO_STATS },
    events: [],
  }
}

function enter(s, stage, t) { s.stage = stage; s.stageAt = t }
function toHome(s, t) { s.pick = null; s.game = null; enter(s, 'home', t) }
function toFreePlay(s, t) { s.free = true; toHome(s, t) }
function toMenu(s, t, turn) { s.turn = turn; s.pick = null; s.game = null; enter(s, 'menu', t) }
// The next player round the group who still has a token.
function nextTurn(s) {
  const n = s.players.length
  for (let k = 1; k <= n; k++) if (s.players[(s.turn + k) % n].tokens > 0) return (s.turn + k) % n
  return s.turn
}
function toReady(s, id, t, key) {
  s.pick = id
  s.pickedKey = key
  // the deck shows the game's starting board: the same seed and length rule the game will get
  s.game = gameAt(s, id, t)
  enter(s, 'ready', t)
  s.events.push('coin')
}
function toCount(s, t) {
  if (counted(s)) { const p = s.players[s.turn]; p.tokens = Math.max(0, p.tokens - 1) } // the token is spent here
  enter(s, 'count', t)
  s.beats = 1
  s.events.push('tick')
}
function toPlay(s, t) {
  s.game = gameAt(s, s.pick, t)
  s.played += 1
  enter(s, 'play', t)
  s.events.push('go')
}
function toResult(s, t) {
  const g = s.game
  if (counted(s)) s.players[s.turn].games.push({ game: g.id, score: g.score })
  const st = s.stats
  st.games += 1
  if (g.id === 'mice') { st.mice += g.bonked; st.pets += g.petTaps; st.gold += g.golds }
  if (g.id === 'tail') st.tails += g.catches
  if (g.id === 'pointer') { st.sparkles += g.sparkled; st.pounces += g.strikes }
  if (g.id === 'knock') st.knocked += g.knocked
  if (g.id === 'yarn') { st.yarn += g.caught; st.gold += g.golds }
  if (!st.best || g.score > st.best.score) st.best = { score: g.score, game: g.id }
  enter(s, 'result', t)
}
function afterResult(s, t) {
  if (!counted(s)) return toHome(s, t)
  const p = s.players[s.turn]
  if (p.tokens > 0) return toMenu(s, t, nextTurn(s))
  // their second game: a clue for the first two, Boo's line for a trio's third
  p.reached = true
  if (s.turn < 2) { enter(s, 'clue', t); s.events.push('clue') }
  else enter(s, 'third', t)
}
function afterClue(s, t) {
  if (s.players.some(p => p.tokens > 0)) return toMenu(s, t, nextTurn(s))
  if (s.players.length > 1) { enter(s, 'winner', t); s.events.push('win') }
  else toFreePlay(s, t) // one player: no winner to name
}
// The chime: whatever is happening stops.
function ring(s, t) {
  s.pending = s.players.filter(p => !p.reached).map(p => p.name)
  // a trio's third player gets Boo's line, not a clue: told apart by place, never by name (two guests can share one)
  s.thirdPending = s.players.length === 3 && !s.players[2].reached
  if (s.mode === 'visit') s.roundEndsAt = t
  s.pick = null
  s.game = null
  enter(s, 'farewell', t)
  s.events.push('chime')
}
// A fresh free-play arcade in this one's place, its seed made from this
// one's and `why` (the events made so far, and the fun facts, stay).
function afresh(s, t, why) {
  const { events, stats } = s
  const fresh = newArcade({ mode: 'free', seed: hashOf(`${s.seed}:${why}`), now: t })
  for (const k of Object.keys(s)) delete s[k]
  Object.assign(s, fresh, { events, stats })
}
// After the farewell: a fresh free play.
const afterFarewell = (s, t) => afresh(s, t, 'farewell')

// One stage change due by `limit`, if there is one (true when it happened).
function moveOn(s, limit) {
  switch (s.stage) {
    case 'ready':
      if (s.stageAt + READY_MS > limit) return false
      toCount(s, s.stageAt + READY_MS)
      return true
    case 'count': {
      if (s.beats < 3) {
        const t = s.stageAt + s.beats * BEAT_MS
        if (t > limit) return false
        s.beats += 1
        s.events.push('tick')
        return true
      }
      if (s.stageAt + COUNT_MS > limit) return false
      toPlay(s, s.stageAt + COUNT_MS)
      return true
    }
    case 'play': {
      const g = stepGame(s.game, limit)
      s.events.push(...g.events)
      s.game = { ...g, events: [] }
      if (!g.over) return false
      toResult(s, g.endedAt)
      return true
    }
    case 'result':
      if (s.stageAt + RESULT_MS > limit) return false
      afterResult(s, s.stageAt + RESULT_MS)
      return true
    case 'clue': case 'third':
      if (s.stageAt + CLUE_MAX_MS > limit) return false
      afterClue(s, s.stageAt + CLUE_MAX_MS)
      return true
    case 'winner':
      if (s.stageAt + WINNER_MS > limit) return false
      toFreePlay(s, s.stageAt + WINNER_MS)
      return true
    case 'farewell':
      if (s.stageAt + FAREWELL_MS > limit) return false
      afterFarewell(s, s.stageAt + FAREWELL_MS)
      return true
    default:
      return false
  }
}

// Every stage change due up to `now`, in order; in a visit the chime comes at
// roundEndsAt, after whatever fell due before it.
function catchUp(s, now) {
  for (let n = 0; n < 10000; n++) {
    const chimeAt = s.mode === 'visit' && s.roundEndsAt != null && s.stage !== 'farewell' ? s.roundEndsAt : Infinity
    if (moveOn(s, Math.min(now, chimeAt))) continue
    if (now >= chimeAt) { ring(s, chimeAt); continue }
    return
  }
}

export function arcadeStep(a, now) {
  const s = copy(a)
  s.events = []
  catchUp(s, now)
  s.events = uniq(s.events)
  return s
}

// A deck or on-screen event at `now`, routed by the stage.
export function arcadeInput(a, ev, now) {
  const s = copy(a)
  s.events = []
  catchUp(s, now)
  const e = plainEvent(ev)
  if (e) take(s, e, now)
  s.events = uniq(s.events)
  return s
}

function take(s, e, t) {
  const pressed = e.kind === 'key' || e.kind === 'press' || e.kind === 'strip'
  switch (s.stage) {
    case 'home': case 'menu': {
      const i = e.kind === 'key' ? MENU_KEYS.indexOf(e.index) : -1
      if (i >= 0) toReady(s, GAMES[i].id, t, e.index) // any other key, dial or tap: nothing
      return
    }
    case 'ready':
      if (t - s.stageAt < PICK_MS) return // the picked key's tick: a double tap does not skip the how-to
      if (e.kind === 'key' && e.index === BACK_KEY) {
        s.events.push('back') // no token spent
        return counted(s) ? toMenu(s, t, s.turn) : toHome(s, t)
      }
      return toCount(s, t) // any other key, dial, tap or arrow
    case 'play': {
      const g = inputGame(s.game, e, t)
      s.events.push(...g.events)
      s.game = { ...g, events: [] }
      if (g.over) toResult(s, g.endedAt)
      return
    }
    case 'clue': case 'third':
      if (pressed && t - s.stageAt >= CLUE_MIN_MS) afterClue(s, t)
      return
    case 'winner':
      if (pressed && t - s.stageAt >= WINNER_MIN_MS) toFreePlay(s, t)
      return
    default:
      return // the count, the result and the farewell take no presses
  }
}

// The Ring the chime button: the round ends now.
export function arcadeChime(a, now) {
  const s = copy(a)
  s.events = []
  catchUp(s, now)
  if (s.stage !== 'farewell') ring(s, now)
  s.events = uniq(s.events)
  return s
}

// Back, the practice page's button (Jon, 29 Oct 2026: "on the pratice page I
// need a back button. Im stuck and cant get back."). A visit ends at once,
// whatever its moment, its free play and its farewell too, with no chime and
// no farewell: a fresh free play on its menu, the fun facts kept. In free
// play a game is left for the menu (one left before its result is not
// counted). On free play's menu it does nothing.
export function arcadeBack(a, now) {
  const s = copy(a)
  s.events = []
  catchUp(s, now)
  if (s.mode === 'visit') {
    afresh(s, now, 'back')
    s.events.push('back')
  } else if (PLAYING.includes(s.stage)) {
    toHome(s, now)
    s.events.push('back')
  }
  s.events = uniq(s.events)
  return s
}

// ---- what the deck, the strip and the screen show ----

const wholeMs = ms => Math.max(0, Math.ceil(ms / 1000)) * 1000 // shown in whole seconds
const pointsOf = n => `${n} ${n === 1 ? 'point' : 'points'}`
// A strike's words, while they last: in the middle of the strip, in place of
// the points (Jon, 29 Oct 2026: every strike says so on the touch strip). Its
// game's rule, for a game that counts strikes, on the strip before it starts.
const saidOf = (g, now) => g?.said && now < g.said.until ? g.said.words : null
const ruleOf = g => (g && GAME[g.id]?.rule) || ''
function andList(names) {
  const list = names.filter(Boolean)
  return list.length <= 1 ? (list[0] ?? '') : `${list.slice(0, -1).join(', ')} and ${list[list.length - 1]}`
}
function countOf(a, now) { return Math.min(3, Math.max(1, 3 - Math.floor((now - a.stageAt) / BEAT_MS))) }
function winnerOf(a) {
  const totals = a.players.map(totalOf)
  const best = Math.max(0, ...totals)
  return { names: a.players.filter((p, i) => totals[i] === best).map(p => p.name), total: best }
}
// A game's time as the strip's lights: all eight lit at the start, one going
// out every eighth of the game (so the strip changes only eight times a game).
function lightsOf(g, now) {
  const length = Math.max(1, g.endsAt - g.startedAt)
  const left = Math.max(0, g.endsAt - Math.max(now, g.startedAt))
  return Math.min(TIME_LIGHTS, Math.ceil(left / length * TIME_LIGHTS))
}

// The top row's lights at `now`, the stage's own: each paw lit one step in
// three, so the lit ones run one key in towards the middle every step.
function marquee(f, a, now) {
  const step = Math.max(0, Math.floor((now - a.stageAt) / MARQUEE_STEP_MS))
  for (let c = 0; c < COLS; c++) f[keyAt(0, c)] = (Math.abs(c - 4) + step) % 3 === 0 ? 'paw-lit' : 'paw'
}

function menuFaces(a, now) {
  const f = new Array(KEY_COUNT).fill('blank')
  marquee(f, a, now)
  f[keyAt(0, 4)] = 'boo'
  GAMES.forEach((g, i) => { f[MENU_KEYS[i]] = `menu:${g.id}` })
  if (a.stage === 'menu' || (a.stage === 'ready' && counted(a))) {
    const left = a.players[a.turn]?.tokens ?? 0
    TOKEN_KEYS.forEach((k, i) => { f[k] = i < TOKENS - left ? 'coin-spent' : 'coin' })
  }
  return f
}

function facesOf(a, now) {
  if (a.stage === 'home' || a.stage === 'menu') return menuFaces(a, now)
  if (a.stage === 'ready' && a.game) {
    // the game just picked: its key green a moment, on the menu
    if (now - a.stageAt < PICK_MS && a.pickedKey != null) { const f = menuFaces(a, now); f[a.pickedKey] = 'hit'; return f }
    const f = gameFaces(a.game, now)
    f[BACK_KEY] = 'back'
    return f
  }
  // the count shows its number on the game's own board, so the game starts with no key to change
  if (a.stage === 'count' && a.game) { const f = gameFaces(a.game, now); f[MIDDLE_KEY] = `num:${countOf(a, now)}`; return f }
  if ((a.stage === 'play' || a.stage === 'result') && a.game) return gameFaces(a.game, now) // the result: the last board
  const f = new Array(KEY_COUNT).fill('off')
  if (a.stage === 'clue' || a.stage === 'third') f[MIDDLE_KEY] = 'ok' // press anything to go on
  else if (a.stage === 'winner') { marquee(f, a, now); f[MIDDLE_KEY] = 'boo' }
  else if (a.stage === 'farewell') f[MIDDLE_KEY] = 'boo'
  return f
}

// The touch strip. Words on the left, in the middle and on the right; in a
// game, its points big in the middle (`score`), the three strike boxes on the
// left (`marks`), its time as lights on the right (`lights`); for Yarn Catch
// its two halves are the basket's left and right (`zones`); the dial labels
// along the bottom.
function stripOf(a, now) {
  const g = PLAYING.includes(a.stage) ? a.game : null
  const info = g ? GAME[g.id] : null
  const name = info?.name ?? ''
  const dials = info?.dials ?? NO_DIALS
  const zones = g?.id === 'yarn'
  const who = a.players[a.turn]?.name ?? ''
  const line = (left, centre, right = '', more = {}) => ({ left, centre, right, score: null, marks: null, lights: null, zones: false, dials: [...NO_DIALS], ...more })
  switch (a.stage) {
    case 'home': return line('Free play', 'Press a game')
    case 'menu': return line(`${who}'s turn`, 'Press a game', `Tokens: ${a.players[a.turn]?.tokens ?? 0}`)
    case 'ready': return zones ? line('', 'Press any key to start', '', { zones }) : line(name, 'Press any key to start', ruleOf(g), { dials: [...dials] })
    case 'count': return zones ? line('', String(countOf(a, now)), '', { zones }) : line(name, String(countOf(a, now)), ruleOf(g), { dials: [...dials] })
    case 'play': {
      if (!g) return line('', '')
      const strikes = strikesOf(g)
      const marks = strikes == null ? null : { of: STRIKES_OUT, used: strikes }
      const said = saidOf(g, now)
      if (zones) return line('', said ?? '', '', { score: said ? null : g.score, zones })
      return line(marks ? '' : name, said ?? '', '', { score: said ? null : g.score, marks, lights: { of: TIME_LIGHTS, lit: lightsOf(g, now) }, dials: [...dials] })
    }
    case 'result': return g ? line(name, outcomeOf(g), pointsOf(g.score)) : line('', '')
    case 'clue': return line(who, 'Your clue is on the screen')
    case 'third': return line('', who)
    case 'winner': return line('', `Most points: ${andList(winnerOf(a).names)}`)
    case 'farewell': return line('', FAREWELL_LINE)
    default: return line('', '')
  }
}

const LOSE_WORDS = { pointer: 'Boo caught the dot three times.', mice: 'You tapped three friends.', knock: 'Three misses.' }
const LOSE_LINES = { pointer: BOO_LINES.caught, mice: BOO_LINES.pets }
// How a game ended, in a few words: on the result's strip and its screen.
const outcomeOf = g => g.outcome === 'lose' ? LOSE_WORDS[g.id] ?? 'Game over.' : g.outcome === 'win' ? 'Well played.' : "Time's up."
// A game played to its end with points to show pleases her.
const pleased = g => g.outcome === 'win' || (g.outcome === 'time' && g.score > 0)
function resultLine(a) {
  const g = a.game
  const who = counted(a) && a.players[a.turn] ? `${a.players[a.turn].name}: ` : ''
  return `${outcomeOf(g)} ${who}${pointsOf(g.score)}.`
}

function plainOf(a, info, yours, winner) {
  switch (a.stage) {
    // no device's name in front of the guests (Jon, 29 Oct 2026)
    case 'home': return a.free ? 'Free play until the chime. Nothing counts now.' : 'Press a game. Just for fun.'
    case 'menu': return `${yours?.name ?? ''}'s turn: press a game.`
    case 'ready': return 'Press any key or dial to start, or press Back to choose again.'
    case 'count': case 'play': return info?.how ?? ''
    case 'result': return a.game ? resultLine(a) : ''
    case 'clue': return `${yours?.name ?? ''}, this is your clue. Read it, then press any key.`
    case 'third': return `${yours?.name ?? ''}, Boo has no clue for you. Press any key.`
    case 'winner':
      return winner.names.length > 1 ? `A tie: ${andList(winner.names)}, ${winner.total} each.` : `Most points: ${winner.names[0] ?? ''}, ${winner.total}.`
    case 'farewell': {
      // those owed a clue, then a trio's third player, owed Boo's line
      const clue = a.thirdPending ? a.pending.slice(0, -1) : a.pending
      return [
        clue.length ? `Out of time before their clue: ${andList(clue)}.` : '',
        a.thirdPending ? `Out of time before Boo's line: ${a.pending[a.pending.length - 1]}.` : '',
      ].filter(Boolean).join(' ')
    }
    default: return ''
  }
}

function booOf(a, info, winner) {
  switch (a.stage) {
    case 'home': return !a.free ? BOO_LINES.home : a.players.length === 1 ? BOO_LINES.freePlayOne : BOO_LINES.freePlay
    case 'menu': return BOO_LINES.menu[hashOf(`${a.seed}:menu:${a.played}`) % BOO_LINES.menu.length]
    case 'ready': case 'count': case 'play': return info?.boo ?? BOO_LINES.home
    case 'result': {
      const g = a.game
      if (g && pleased(g)) return BOO_LINES.win[hashOf(`${a.seed}:win:${a.played}`) % BOO_LINES.win.length]
      if (g?.outcome === 'lose') return LOSE_LINES[g.id] ?? BOO_LINES.lose
      return BOO_LINES.time
    }
    case 'clue': return BOO_LINES.clue
    case 'third': return BOO_LINES.third
    case 'winner': return winner.names.length > 1 ? BOO_LINES.tie : BOO_LINES.winner
    case 'farewell': return BOO_LINES.farewell
    default: return BOO_LINES.home
  }
}

function pictureOf(a) {
  switch (a.stage) {
    case 'ready': case 'count': case 'play': return 'Boo 2.png'
    case 'result': return a.game && pleased(a.game) ? ' Boo 5.png' : a.game?.outcome === 'lose' ? 'Boo 3.png' : 'Boo 4.png'
    case 'clue': return 'Boo 4.png'
    case 'third': return 'Boo 3.png'
    case 'winner': return ' Boo 5.png'
    case 'farewell': return 'Boo 3.png'
    default: return 'Boo 1.png'
  }
}

// The fun facts so far, as the screen lists them: only the ones that have happened.
const GAME_NAMES = Object.fromEntries(GAMES.map(g => [g.id, g.name]))
function factsOf(st) {
  return [
    ['Games played', st.games],
    ['Mice bonked', st.mice],
    ['Friends tapped by mistake', st.pets],
    ['Tail tips caught', st.tails],
    ['Sparkles grabbed', st.sparkles],
    ['Times Boo caught the dot', st.pounces],
    ['Things knocked off the tables', st.knocked],
    ['Balls of yarn caught', st.yarn],
    ['Gold ones caught', st.gold], // gold mice and gold yarn
  ].filter(([, n]) => n > 0).map(([label, n]) => ({ label, value: String(n) }))
    .concat(st.best && st.best.score > 0 ? [{ label: 'Best game', value: `${pointsOf(st.best.score)}, ${GAME_NAMES[st.best.game]}` }] : [])
}

function screenOf(a, now) {
  const g = PLAYING.includes(a.stage) ? a.game : null
  const info = g ? GAME[g.id] ?? null : null
  const yours = counted(a) && TURN_STAGES.includes(a.stage) ? a.players[a.turn] ?? null : null
  const winner = a.stage === 'winner' ? winnerOf(a) : null
  // before a game starts, the length it gets if it starts now (a visit's last games can be cut short)
  const left = !g ? null
    : a.stage === 'play' ? g.endsAt - now
      : a.stage === 'result' ? g.endsAt - (g.endedAt ?? g.endsAt)
        : lengthFor(a, (a.stage === 'count' ? a.stageAt : now) + COUNT_MS)
  const strikes = g && (a.stage === 'play' || a.stage === 'result') ? strikesOf(g) : null
  return {
    title: ARCADE_NAME,
    mode: a.mode,
    free: !!a.free,
    stage: a.stage,
    game: info ? { id: info.id, name: info.name, how: info.how, rule: info.rule ?? null } : null,
    plain: plainOf(a, info, yours, winner),
    boo: booOf(a, info, winner),
    picture: pictureOf(a),
    score: g ? g.score : null,
    // the game's own tally ("Mice bonked: 12") and its strikes, while it plays and on its result
    tally: g && (a.stage === 'play' || a.stage === 'result') ? { label: info.counts, value: tallyCount(g) } : null,
    marks: strikes == null ? null : { of: STRIKES_OUT, used: strikes },
    said: a.stage === 'play' ? saidOf(g, now) : null,
    timeLeftMs: left == null ? null : wholeMs(left),
    clockMs: a.mode === 'visit' && a.roundEndsAt != null ? wholeMs(a.roundEndsAt - now) : null,
    count: a.stage === 'count' ? countOf(a, now) : null,
    player: yours ? yours.name : null,
    players: a.players.map((p, i) => ({
      name: p.name, tokens: p.tokens, scores: p.games.map(x => x.score), total: totalOf(p), now: !!yours && i === a.turn,
    })),
    result: a.stage === 'result' && g ? { score: g.score, outcome: g.outcome } : null,
    clue: a.stage === 'clue' ? STAND_IN_CLUE : null,
    note: a.stage === 'clue' ? CLUE_NOTE : null, // the dim line under the clue
    third: a.stage === 'third' ? THIRD_LINE : null,
    winner,
    pending: a.stage === 'farewell' ? [...a.pending] : [],
    farewell: a.stage === 'farewell' ? FAREWELL_LINE : null,
    facts: factsOf(a.stats ?? NO_STATS),
  }
}

// Everything shown at `now`. `sig` changes whenever anything shown changes
// (the clocks in whole seconds), so the page re-renders only then.
export function arcadeView(a, now) {
  const faces = facesOf(a, now)
  const strip = stripOf(a, now)
  const screen = screenOf(a, now)
  return { faces, strip, screen, sig: JSON.stringify([faces, strip, screen]) }
}

// ---- the Preview's samples: an arcade frozen at one moment ----

const SAMPLE_SEED = 1115
const PAIR = ['Jessa', 'Mari']
const TRIO = ['Margaret', 'Tom', 'Ellie']
const PAIR_DONE = [[['tail', 34], ['knock', 40]], [['mice', 23], ['pointer', 62]]]

// A visit at a moment: each player's games so far ([game, score] pairs), the
// stage and whose turn, how long ago the stage began and the round time left.
function sampleVisit(names, games, stage, turn, now, ago, left) {
  const a = newArcade({ mode: 'visit', players: names, seed: SAMPLE_SEED, now: now - (ROUND_MS - left) })
  const players = a.players.map((p, i) => ({
    ...p,
    tokens: TOKENS - games[i].length,
    games: games[i].map(([game, score]) => ({ game, score })),
    reached: games[i].length === TOKENS,
  }))
  return { ...a, players, stage, stageAt: now - ago, turn, played: games.flat().length }
}

// 'home' free play's menu; 'menu' a visit of two, the second player's (last)
// turn; 'play' Boo Chasing Her Tail, four tips caught, about a minute left,
// a wall and a friend out; 'clue' a pair, the first player's clue; 'third' a
// trio's third player; 'winner' a pair; 'farewell' a pair, nobody left out.
export function arcadeSample(name, now = 0) {
  switch (name) {
    case 'menu': return sampleVisit(PAIR, [[['knock', 30], ['tail', 34]], [['mice', 23]]], 'menu', 1, now, 3000, 330000)
    case 'play': {
      const a = newArcade({ mode: 'free', seed: SAMPLE_SEED, now: now - 70000 })
      const g = newGame('tail', { seed: SAMPLE_SEED, lengthMs: FREE_GAME_MS, now: now - 61000 })
      const game = {
        ...g,
        boo: keyAt(2, 3),
        tail: [keyAt(1, 7), keyAt(1, 6), keyAt(2, 6)], // heading right, its tip round the corner below
        blocks: [{ key: keyAt(1, 2), friend: null }, { key: keyAt(3, 5), friend: 'irwin' }],
        catches: 4, score: 4 * TAIL_POINTS, nextAt: now + 300, nextBlockAt: now + 14000, at: now,
      }
      return { ...a, stage: 'play', stageAt: g.startedAt, pick: 'tail', game, played: 1 }
    }
    case 'clue': return sampleVisit(PAIR, [[['tail', 34], ['knock', 40]], [['mice', 23]]], 'clue', 0, now, 4000, 300000)
    case 'third':
      return sampleVisit(TRIO, [[['yarn', 9], ['pointer', 52]], [['mice', 27], ['knock', 30]], [['tail', 21], ['yarn', 12]]], 'third', 2, now, 4000, 50000)
    case 'winner': return sampleVisit(PAIR, PAIR_DONE, 'winner', 1, now, 2000, 140000)
    case 'farewell': {
      const a = sampleVisit(PAIR, PAIR_DONE, 'farewell', 1, now, 2000, 0)
      return { ...a, free: true, roundEndsAt: a.stageAt, pending: [] }
    }
    default: return newArcade({ mode: 'free', seed: SAMPLE_SEED, now: now - 2000 })
  }
}
