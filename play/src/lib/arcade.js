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

// ---- the speeds and the times: starting points, for Jon's notes to tune ----

// Boo Chasing Her Tail
export const TAIL_STEP_MS = 700          // she moves one key this often at first,
export const TAIL_STEP_FASTER_MS = 40    // this much quicker for every fish,
export const TAIL_STEP_MIN_MS = 450      // and never quicker than this
export const TAIL_TURNS_AHEAD = 2        // turns kept for her next steps (a quick up-then-left)
export const TAIL_FISH = 5               // this many fish wins
export const TAIL_FISH_POINTS = 10
export const TAIL_WIN_POINTS = 20        // for the last fish, and
export const TAIL_TIME_POINT_MS = 5000   // 1 more for every whole 5 seconds left
// The Lazy Pointer
export const POINTER_STEP_MS = 1000      // Boo steps towards the dot this often at first,
export const POINTER_STEP_FASTER_MS = 100 // this much quicker
export const POINTER_FASTER_EVERY_MS = 15000 // every 15 seconds,
export const POINTER_STEP_MIN_MS = 450   // and never quicker than this
export const POINTER_REST_EVERY = 6      // she sits out every sixth beat: she is lazy
export const POINTER_POINT_MS = 2000     // 1 point for every 2 whole seconds
export const POINTER_LAST_POINTS = 20    // for lasting to the end
// Whack-a-Mouse
export const MICE_SPAWN_MS = 1200        // a new mouse this often at first,
export const MICE_SPAWN_END_MS = 700     // this often by the end
export const MICE_UP_MS = 1600           // a mouse stays up this long at first,
export const MICE_UP_END_MS = 1250       // this long by the end
export const MICE_GOLD_UP_MS = 1200      // a gold one all game: always under a plain one's time
export const MICE_TWO_FROM_MS = 30000    // two at once from 30 seconds in
export const MICE_BONK_MS = 300
export const MICE_POINTS = 1
export const MICE_GOLD_POINTS = 3
export const MICE_PETS_FROM_MS = 5000    // the pets pop up too from 5 seconds in:
export const MICE_PET_ONE_IN = 4         // one in four that pop up is a pet, not a mouse
export const MICE_PETS_OUT = 3           // tap three pets and you're out (Jon, 29 Oct 2026)
export const MICE_OOPS_MS = 600          // a tapped pet shows on red this long
export const MICE_REST_MS = 500          // a key a mouse has just left stays empty this long, so a late tap meant for it never meets a pet
// Knock It Off the Table
export const KNOCK_STEP_MS = 350         // one key along the table this often at first,
export const KNOCK_STEP_FASTER_MS = 20   // this much quicker for every knock,
export const KNOCK_STEP_MIN_MS = 200     // and never quicker than this
export const KNOCK_DWELL_STEPS = 2       // steps it sits on the edge: the window to knock it off
export const KNOCK_FALL_MS = 120         // one row down this often
export const KNOCK_CRASH_MS = 500
export const KNOCK_SWIPE_MS = 300
export const KNOCK_REST_MS = 400         // after a miss Boo's paw rests this long (a press while it rests misses again)
export const KNOCK_POINTS = 10
// Yarn Catch
export const YARN_STEP_MS = 650          // a ball drops one row this often at first,
export const YARN_STEP_END_MS = 400      // this often by the end
export const YARN_SPAWN_MS = 1600        // a new ball this often at first,
export const YARN_SPAWN_END_MS = 1000    // this often by the end
export const YARN_FALLING = 3            // at most this many falling at once
export const YARN_FLASH_MS = 300
export const YARN_POINTS = 1
export const YARN_GOLD_POINTS = 3
// the mice and the yarn
export const GOLD_ONE_IN = 10            // one in ten is gold
export const DIAL_MAX_KEYS = 3           // a fast spin moves at most three keys a report
// the visit's moments
export const READY_MS = 15000            // the how-to-play screen starts the count by itself after this
export const COUNT_MS = 3000             // 3, 2, 1
export const RESULT_MS = 5000
export const STRIKE_WORDS_MS = 1500      // a strike's words stay on the strip this long (Jon, 29 Oct 2026), mice tapped meanwhile or not; only a knock ends them sooner
export const CLUE_MIN_MS = 3000          // a press moves the clue on only after this,
export const CLUE_MAX_MS = 60000         // and it moves on by itself after this
export const WINNER_MS = 10000
export const WINNER_MIN_MS = 3000
export const FAREWELL_MS = 8000
export const MARQUEE_STEP_MS = 250       // the top row's lit paws move one key in towards the middle this often (Jon, 29 Oct 2026: flashing like an arcade game)

// ---- the deck ----

export const ARCADE_NAME = "Miss Boo LaRue's Arcade"
export const COLS = 9, ROWS = 4, KEY_COUNT = 36, DIALS = 6
export const keyAt = (row, col) => row * COLS + col
export const rowOf = i => Math.floor(i / COLS)
export const colOf = i => i % COLS
export const LEFT_DIALS = [0, 1, 2]   // left and right (clockwise = right)
export const RIGHT_DIALS = [3, 4, 5]  // up and down (clockwise = up), like an Etch A Sketch
export const MENU_KEYS = [11, 12, 13, 14, 15] // the second row: two blank, five games, two blank
export const BACK_KEY = 27 // keyAt(3, 0): Back, on the ready screen only
const TOKEN_KEYS = [keyAt(2, 3), keyAt(2, 5)] // the player's two tokens, on the menu
const MIDDLE_KEY = keyAt(1, 4) // the count, OK, and Boo
// The touch strip is 1200 wide; the dials sit under it at x 60, 276 ... 1140,
// and a tap counts as the press of the nearest one.
const STRIP_DIAL_X = 60, STRIP_DIAL_GAP = 216
const ALL_KEYS = Array.from({ length: KEY_COUNT }, (_, i) => i)
const ALL_COLUMNS = Array.from({ length: COLS }, (_, c) => c)

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
// If the arcade goes on the night (the card entrywayGame), each player's own
// bag clue about the Ghost shows here instead.
export const STAND_IN_CLUE = "[Boo's bag clue about the Ghost appears here]"
export const CLUE_NOTE = 'Practice: if the arcade goes on the night, your own clue about the Ghost shows here.'
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
  bite: "That's mine, darling. Hands off.",
  caught: 'Mine. Obviously.',
  pets: 'Not the household, darling. Out you go.',
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
// six labels along the bottom of the strip, and `rule`, for the game that
// counts strikes, what the strip says before it starts.
const ACROSS = '◀ ▶', UP_DOWN = '▼ ▲'
export const GAMES = [
  {
    id: 'tail', name: 'Boo Chasing Her Tail', short: 'Tail',
    how: "Turn a left dial to steer Boo left or right, a right dial to steer her up or down. Lead her to the fish, and don't let her bite her own tail.",
    boo: 'Round and round. Story of my life.',
    dials: [ACROSS, ACROSS, ACROSS, UP_DOWN, UP_DOWN, UP_DOWN],
  },
  {
    id: 'pointer', name: 'The Lazy Pointer', short: 'Pointer',
    how: 'Turn a left dial to move the red dot left or right, a right dial to move it up or down. Keep it away from Boo.',
    boo: 'That little red dot. I will have it.',
    dials: [ACROSS, ACROSS, ACROSS, UP_DOWN, UP_DOWN, UP_DOWN],
  },
  {
    id: 'mice', name: 'Whack-a-Mouse', short: 'Mice',
    how: "Tap a mouse before it hides; gold ones are worth more. Leave the pets alone: tap three and you're out.",
    rule: "Three pets and you're out.",
    boo: 'Mice. In my house. Unthinkable.',
    dials: ['', '', '', '', '', ''],
  },
  {
    id: 'knock', name: 'Knock It Off the Table', short: 'Knock',
    how: 'When something reaches the edge of the table, press any dial to knock it off.',
    boo: "It was in my way. They're all in my way.",
    dials: ['Press', 'Press', 'Press', 'Press', 'Press', 'Press'],
  },
  {
    id: 'yarn', name: 'Yarn Catch', short: 'Yarn',
    how: 'Turn any dial to slide the basket under the falling yarn. Gold yarn is worth more.',
    boo: "Catch it, darling. I don't fetch.",
    dials: [ACROSS, ACROSS, ACROSS, ACROSS, ACROSS, ACROSS],
  },
]
const GAME = Object.fromEntries(GAMES.map(g => [g.id, g]))

// The things on Boo's table, in the order they come.
export const KNOCK_OBJECTS = ['vase', 'teacup', 'teapot', 'candle', 'picture', 'glass', 'plant', 'cake']

// Whack-a-Mouse's decoys: all the household's pets, Boo too (Jon, 29 Oct
// 2026). Each is its own face picture (lib/arcadeArt.js PET_FILES).
export const PETS = ['boo', 'granola', 'irwin', 'salem', 'zimmy']

// Every face a key can show (the art draws each one).
export const FACE_IDS = [
  'off', 'blank', 'paw', 'paw-lit', 'boo', 'back', 'ok', 'coin', 'coin-spent', 'num:1', 'num:2', 'num:3',
  ...GAMES.map(g => `menu:${g.id}`),
  'tail-head', 'tail-body', 'tail-tip', 'fish', 'bite',
  'dot', 'chaser', 'caught',
  'mouse', 'mouse-gold', 'bonk', ...PETS.map(p => `pet:${p}`), ...PETS.map(p => `oops:${p}`),
  'table', 'edge', 'below', 'crash', 'swipe',
  ...KNOCK_OBJECTS.map(o => `table:${o}`), ...KNOCK_OBJECTS.map(o => `edge:${o}`), ...KNOCK_OBJECTS.map(o => `fall:${o}`),
  'yarn', 'yarn-gold', 'basket', 'basket-catch', 'yarn-miss',
]

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
const keysOf = amount => Math.min(DIAL_MAX_KEYS, Math.max(1, Math.round(Math.abs(amount))))

// A deck or on-screen event, checked and made plain. A strip tap counts as a
// press of the dial below it, everywhere.
function plainEvent(ev) {
  if (!ev || typeof ev !== 'object') return null
  const inRange = (x, top) => Number.isInteger(x) && x >= 0 && x < top
  switch (ev.kind) {
    case 'key': return inRange(ev.index, KEY_COUNT) ? { kind: 'key', index: ev.index } : null
    case 'press': return { kind: 'press', dial: inRange(ev.dial, DIALS) ? ev.dial : 0 }
    case 'strip': return { kind: 'press', dial: Math.min(DIALS - 1, Math.max(0, Math.round(((Number(ev.x) || 0) - STRIP_DIAL_X) / STRIP_DIAL_GAP))) }
    case 'turn': {
      const amount = Number(ev.amount)
      return inRange(ev.dial, DIALS) && Number.isFinite(amount) && amount !== 0 ? { kind: 'turn', dial: ev.dial, amount } : null
    }
    default: return null
  }
}

// ---- 1. Boo Chasing Her Tail: Boo's face is the head, the tail follows ----

const STEPS = { left: [0, -1], right: [0, 1], up: [-1, 0], down: [1, 0] }
const BACKWARDS = { left: 'right', right: 'left', up: 'down', down: 'up' }
const wrapped = (key, dir) => keyAt((rowOf(key) + STEPS[dir][0] + ROWS) % ROWS, (colOf(key) + STEPS[dir][1] + COLS) % COLS)
const tailStepMs = eaten => Math.max(TAIL_STEP_MIN_MS, TAIL_STEP_MS - TAIL_STEP_FASTER_MS * eaten)
// A fish on a free key, never right in front of her head.
function newFish(s, avoid = []) {
  const ahead = wrapped(s.body[0], s.queue[0] ?? s.dir)
  const free = ALL_KEYS.filter(k => !s.body.includes(k) && k !== ahead && !avoid.includes(k))
  return free.length ? pick(s, free) : null
}

const tail = {
  start(s) {
    s.body = [keyAt(1, 2), keyAt(1, 1), keyAt(1, 0)] // her head, then her tail two long behind it
    s.dir = 'right'
    s.queue = []
    s.eaten = 0
    s.bit = false
    s.nextAt = s.startedAt + tailStepMs(0)
    s.fish = newFish(s, [BACK_KEY]) // the first fish never hides under Back on the ready screen
  },
  due: s => s.nextAt,
  fire(s, t) {
    if (s.queue.length) s.dir = s.queue.shift()
    const next = wrapped(s.body[0], s.dir) // the edges wrap round
    if (next === s.fish) {
      s.body.unshift(next)
      s.eaten += 1
      s.score += TAIL_FISH_POINTS
      s.events.push('point')
      if (s.eaten >= TAIL_FISH) {
        s.fish = null
        s.score += TAIL_WIN_POINTS + Math.floor((s.endsAt - t) / TAIL_TIME_POINT_MS)
        return finish(s, 'win', t)
      }
      s.fish = newFish(s)
    } else {
      // the tip moves on as she does, so only the rest of her can be bitten
      const bites = s.body.slice(0, -1).includes(next)
      s.body = [next, ...s.body.slice(0, -1)]
      if (bites) {
        s.bit = true
        s.events.push('bite')
        return finish(s, 'lose', t)
      }
    }
    s.nextAt = t + tailStepMs(s.eaten)
  },
  input(s, e) {
    if (e.kind !== 'turn') return
    const want = LEFT_DIALS.includes(e.dial) ? (e.amount > 0 ? 'right' : 'left') : (e.amount > 0 ? 'up' : 'down')
    const last = s.queue.length ? s.queue[s.queue.length - 1] : s.dir
    // the same way changes nothing, and straight back into her neck is ignored
    if (want === last || want === BACKWARDS[last] || s.queue.length >= TAIL_TURNS_AHEAD) return
    s.queue.push(want)
  },
  faces(s, f) {
    if (s.fish != null) f[s.fish] = 'fish'
    // tip first, so her head is drawn last (on a bite it sits on her tail)
    for (let i = s.body.length - 1; i >= 0; i--) {
      f[s.body[i]] = i === 0 ? (s.bit ? 'bite' : 'tail-head') : i === s.body.length - 1 ? 'tail-tip' : 'tail-body'
    }
  },
}

// ---- 2. The Lazy Pointer: your red dot, Boo's black block after it ----

const pointerStepMs = since => Math.max(POINTER_STEP_MIN_MS, POINTER_STEP_MS - POINTER_STEP_FASTER_MS * Math.floor(since / POINTER_FASTER_EVERY_MS))
// One step towards a key, diagonals allowed.
function towards(from, to) {
  return keyAt(rowOf(from) + Math.sign(rowOf(to) - rowOf(from)), colOf(from) + Math.sign(colOf(to) - colOf(from)))
}

const pointer = {
  start(s) {
    s.dot = keyAt(1, 1)
    s.boo = keyAt(2, 7)
    s.beats = 0
    s.caught = false
    s.nextAt = s.startedAt + pointerStepMs(0)
  },
  due: s => s.nextAt,
  fire(s, t) {
    s.beats += 1
    if (s.beats % POINTER_REST_EVERY !== 0) {
      s.boo = towards(s.boo, s.dot)
      if (s.boo === s.dot) {
        s.caught = true
        s.score = Math.floor((t - s.startedAt) / POINTER_POINT_MS)
        return finish(s, 'lose', t)
      }
    }
    s.nextAt = t + pointerStepMs(t - s.startedAt)
  },
  input(s, e) {
    if (e.kind !== 'turn') return
    const [dr, dc] = LEFT_DIALS.includes(e.dial) ? [0, Math.sign(e.amount)] : [-Math.sign(e.amount), 0]
    for (let n = keysOf(e.amount); n > 0; n--) {
      const r = rowOf(s.dot) + dr, c = colOf(s.dot) + dc
      if (r < 0 || r >= ROWS || c < 0 || c >= COLS) break // the edges stop it
      if (keyAt(r, c) === s.boo) break // and it stops beside her
      s.dot = keyAt(r, c)
    }
  },
  settle(s) { if (!s.over) s.score = Math.floor((s.at - s.startedAt) / POINTER_POINT_MS) },
  timeUp(s) { s.score = Math.floor((s.endsAt - s.startedAt) / POINTER_POINT_MS) + POINTER_LAST_POINTS },
  faces(s, f) {
    if (s.caught) { f[s.boo] = 'caught'; return }
    f[s.dot] = 'dot'
    f[s.boo] = 'chaser'
  },
}

// ---- 3. Whack-a-Mouse ----

// The pets pop up among the mice from 5 seconds in. A pet is up as long as a
// plain mouse; tapping one scores nothing, and the third ends the game. A
// mouse that hides, or an empty key, never counts against anyone, and a key a
// mouse has just left (hidden or tapped) rests a moment, so a late tap meant
// for that mouse never meets a pet.
const mice = {
  start(s) {
    s.mice = [] // { key, gold, downAt }
    s.pets = [] // { key, pet, downAt }
    s.bonks = [] // { key, until }
    s.oops = [] // { key, pet, until }: a pet just tapped
    s.rests = [] // { key, until }: a key a mouse has just left
    s.petTaps = 0
    s.nextSpawnAt = s.startedAt
  },
  due: s => Math.min(s.nextSpawnAt, ...s.mice.map(m => m.downAt), ...s.pets.map(p => p.downAt)),
  fire(s, t) {
    // a mouse or a pet ducks (before any new one comes at the same moment)
    if ([...s.mice, ...s.pets].some(m => m.downAt <= t)) {
      const left = s.mice.filter(m => m.downAt <= t).map(m => ({ key: m.key, until: t + MICE_REST_MS }))
      s.rests = [...s.rests.filter(r => r.until > t), ...left]
      s.mice = s.mice.filter(m => m.downAt > t)
      s.pets = s.pets.filter(p => p.downAt > t)
      return
    }
    const room = (t - s.startedAt >= MICE_TWO_FROM_MS ? 2 : 1) - s.mice.length - s.pets.length
    if (room > 0) {
      const flashing = [...s.bonks, ...s.oops, ...s.rests].filter(b => b.until > t)
      const busy = new Set([...s.mice, ...s.pets, ...flashing].map(x => x.key))
      const free = ALL_KEYS.filter(k => !busy.has(k))
      if (free.length) {
        const key = pick(s, free)
        const up = lerp(MICE_UP_MS, MICE_UP_END_MS, along(s, t))
        if (t - s.startedAt >= MICE_PETS_FROM_MS && rand(s) < 1 / MICE_PET_ONE_IN) {
          s.pets.push({ key, pet: pick(s, PETS), downAt: t + up })
        } else {
          const gold = isGold(s)
          s.mice.push({ key, gold, downAt: t + (gold ? MICE_GOLD_UP_MS : up) })
        }
      }
    }
    s.nextSpawnAt = t + lerp(MICE_SPAWN_MS, MICE_SPAWN_END_MS, along(s, t))
  },
  input(s, e, t) {
    if (e.kind !== 'key') return
    const p = s.pets.find(x => x.key === e.index)
    if (p) {
      s.pets = s.pets.filter(x => x !== p)
      s.petTaps += 1
      s.oops = [...s.oops.filter(o => o.until > t), { key: p.key, pet: p.pet, until: t + MICE_OOPS_MS }]
      if (s.petTaps >= MICE_PETS_OUT) return finish(s, 'lose', t)
      s.events.push('miss')
      s.said = { words: `Strike ${s.petTaps}! That's a pet.`, until: t + STRIKE_WORDS_MS }
      return
    }
    const m = s.mice.find(x => x.key === e.index)
    if (!m) return // an empty key does nothing
    s.mice = s.mice.filter(x => x !== m)
    s.score += m.gold ? MICE_GOLD_POINTS : MICE_POINTS
    s.events.push(m.gold ? 'gold' : 'point')
    s.bonks = [...s.bonks.filter(b => b.until > t), { key: m.key, until: t + MICE_BONK_MS }]
    s.rests = [...s.rests.filter(r => r.until > t), { key: m.key, until: t + MICE_REST_MS }]
    // a strike's words stay up their whole time: the screen shows the points meanwhile
  },
  tidy(s) {
    s.bonks = s.bonks.filter(b => b.until > s.at)
    s.oops = s.oops.filter(o => o.until > s.at)
    s.rests = s.rests.filter(r => r.until > s.at)
  },
  faces(s, f, now) {
    for (const b of s.bonks) if (b.until > now) f[b.key] = 'bonk'
    for (const o of s.oops) if (o.until > now) f[o.key] = `oops:${o.pet}`
    for (const m of s.mice) f[m.key] = m.gold ? 'mouse-gold' : 'mouse'
    for (const p of s.pets) f[p.key] = `pet:${p.pet}`
  },
}

// ---- 4. Knock It Off the Table: the top row is the table, key 8 its edge ----

const EDGE = COLS - 1 // the last place on the table
const EDGE_KEY = keyAt(0, EDGE)
const WATCH_KEY = keyAt(1, 7) // Boo watches from here
const knockStepMs = knocked => Math.max(KNOCK_STEP_MIN_MS, KNOCK_STEP_MS - KNOCK_STEP_FASTER_MS * knocked)

const knock = {
  start(s) {
    s.obj = 0 // which thing is on the table (KNOCK_OBJECTS)
    s.pos = 0 // its place along the top row, 0 to 8 (8 is the edge)
    s.phase = 'right' // sliding to the edge, on the 'edge', sliding back 'left', or the last one's 'fall'
    s.knocked = 0
    s.knockedAt = null
    s.fallObj = null
    s.swipeUntil = 0
    s.restUntil = 0
    s.nextAt = s.startedAt + knockStepMs(0)
  },
  due: s => s.nextAt,
  fire(s, t) {
    const step = knockStepMs(s.knocked)
    if (s.phase === 'right') {
      s.pos += 1
      if (s.pos >= EDGE) { s.pos = EDGE; s.phase = 'edge'; s.nextAt = t + KNOCK_DWELL_STEPS * step }
      else s.nextAt = t + step
    } else if (s.phase === 'edge') {
      s.pos = EDGE - 1 // back it goes, twice as fast
      s.phase = 'left'
      s.nextAt = t + step / 2
    } else if (s.phase === 'left') {
      s.pos -= 1
      if (s.pos <= 0) { s.pos = 0; s.phase = 'right'; s.nextAt = t + step }
      else s.nextAt = t + step / 2
    } else {
      // the fall and the crash are over: the next thing starts at the far end
      s.obj = s.knocked
      s.pos = 0
      s.phase = 'right'
      s.nextAt = t + step
    }
  },
  input(s, e, t) {
    const press = e.kind === 'press' || (e.kind === 'key' && e.index === EDGE_KEY)
    // while the last one falls, a press does nothing
    if (!press || s.phase === 'fall') return
    if (s.phase === 'edge' && t >= s.restUntil) {
      s.knocked += 1
      s.score += KNOCK_POINTS
      s.events.push('knock')
      s.said = null // the points again
      s.phase = 'fall'
      s.knockedAt = t
      s.fallObj = s.obj
      if (s.knocked >= KNOCK_OBJECTS.length) return finish(s, 'win', t)
      s.nextAt = t + 2 * KNOCK_FALL_MS + KNOCK_CRASH_MS
    } else {
      // too soon, or while the paw rests: a miss, and the rest starts again
      // from here, so presses closer together than the rest knock nothing off
      // (a steady press slower than that still can: docs/boo-arcade.md §8)
      s.events.push('miss')
      s.said = { words: s.phase === 'left' ? 'Too late!' : 'Too soon!', until: t + STRIKE_WORDS_MS }
      s.swipeUntil = t + KNOCK_SWIPE_MS
      s.restUntil = t + KNOCK_REST_MS
    }
  },
  faces(s, f, now) {
    for (let k = COLS; k < KEY_COUNT; k++) f[k] = 'below'
    for (let c = 0; c < EDGE; c++) f[keyAt(0, c)] = 'table'
    f[EDGE_KEY] = 'edge'
    f[WATCH_KEY] = 'boo'
    const thing = KNOCK_OBJECTS[s.obj]
    if (s.phase === 'edge') f[EDGE_KEY] = `edge:${thing}`
    else if (s.phase !== 'fall' && thing) f[keyAt(0, s.pos)] = `table:${thing}`
    if (s.knockedAt != null) {
      // down column 8 one row at a time, then the crash on the bottom key
      const dt = now - s.knockedAt, fell = KNOCK_OBJECTS[s.fallObj]
      if (dt >= 0 && dt < KNOCK_FALL_MS) f[keyAt(1, EDGE)] = `fall:${fell}`
      else if (dt >= KNOCK_FALL_MS && dt < 2 * KNOCK_FALL_MS) f[keyAt(2, EDGE)] = `fall:${fell}`
      else if (dt >= 2 * KNOCK_FALL_MS && dt < 2 * KNOCK_FALL_MS + KNOCK_CRASH_MS) f[keyAt(3, EDGE)] = 'crash'
    }
    if (now < s.swipeUntil) f[EDGE_KEY] = 'swipe'
  },
}

// ---- 5. Yarn Catch: balls of yarn drop down the columns into Boo's basket ----

const yarnStepMs = (s, t) => lerp(YARN_STEP_MS, YARN_STEP_END_MS, along(s, t))

const yarn = {
  start(s) {
    s.basket = 4 // its column, on the bottom row: keyAt(3, 4)
    s.balls = [] // { col, row, gold, nextAt }
    s.misses = [] // { key, until }
    s.catchUntil = 0
    s.nextSpawnAt = s.startedAt
  },
  due: s => Math.min(s.nextSpawnAt, ...s.balls.map(b => b.nextAt)),
  fire(s, t) {
    // a ball drops a row (before any new one comes at the same moment)
    const ball = s.balls.find(b => b.nextAt <= t)
    if (ball) {
      ball.row += 1
      if (ball.row < ROWS - 1) { ball.nextAt = t + yarnStepMs(s, t); return }
      // the bottom row: in the basket, or gone
      s.balls = s.balls.filter(b => b !== ball)
      if (ball.col === s.basket) {
        s.score += ball.gold ? YARN_GOLD_POINTS : YARN_POINTS
        s.events.push(ball.gold ? 'gold' : 'point')
        s.catchUntil = t + YARN_FLASH_MS
      } else {
        s.misses = [...s.misses.filter(m => m.until > t), { key: keyAt(ROWS - 1, ball.col), until: t + YARN_FLASH_MS }]
      }
      return
    }
    if (s.balls.length < YARN_FALLING) {
      const used = new Set(s.balls.map(b => b.col))
      const free = ALL_COLUMNS.filter(c => !used.has(c))
      if (free.length) {
        const col = pick(s, free)
        const gold = isGold(s)
        s.balls.push({ col, row: 0, gold, nextAt: t + yarnStepMs(s, t) })
      }
    }
    s.nextSpawnAt = t + lerp(YARN_SPAWN_MS, YARN_SPAWN_END_MS, along(s, t))
  },
  input(s, e) {
    if (e.kind !== 'turn') return // any dial: anticlockwise left, clockwise right
    const dc = Math.sign(e.amount)
    for (let n = keysOf(e.amount); n > 0; n--) {
      const c = s.basket + dc
      if (c < 0 || c >= COLS) break // the edges stop it
      s.basket = c
    }
  },
  tidy(s) { s.misses = s.misses.filter(m => m.until > s.at) },
  faces(s, f, now) {
    for (const b of s.balls) f[keyAt(b.row, b.col)] = b.gold ? 'yarn-gold' : 'yarn'
    for (const m of s.misses) if (m.until > now) f[m.key] = 'yarn-miss'
    f[keyAt(ROWS - 1, s.basket)] = now < s.catchUntil ? 'basket-catch' : 'basket'
  },
}

const RULES = { tail, pointer, mice, knock, yarn }

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
// so a page that slept for seconds misses no bite, no catch and no knock.
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
  rules.settle?.(s)
  rules.tidy?.(s)
}

export function newGame(id, { seed, lengthMs, now = 0 } = {}) {
  const rules = RULES[id]
  if (!rules) throw new Error(`No such game: ${id}`)
  const length = Number(lengthMs) > 0 ? Number(lengthMs) : FREE_GAME_MS
  // `said`: a strike's words for the strip, until a time (Whack-a-Mouse's pets, Knock It Off's misses)
  const s = { id, startedAt: now, endsAt: now + length, at: now, score: 0, over: false, outcome: null, endedAt: null, events: [], said: null, rs: seedOf(seed) }
  rules.start(s)
  return s
}

export function stepGame(g, now) {
  const s = copy(g)
  s.events = []
  advance(s, now)
  s.events = uniq(s.events)
  return s
}

// An event at `now`: the game first catches up to `now`, then takes it.
export function inputGame(g, ev, now) {
  const s = copy(g)
  s.events = []
  advance(s, now)
  const e = plainEvent(ev)
  if (e && !s.over) {
    const rules = RULES[s.id]
    rules.input(s, e, Math.max(now, s.at))
    rules.settle?.(s)
  }
  s.events = uniq(s.events)
  return s
}

// The 36 keys' faces at `now` (a flash lasts its time even on a finished game).
export function gameFaces(g, now = g?.at ?? 0) {
  const f = new Array(KEY_COUNT).fill('blank')
  const rules = g && RULES[g.id]
  if (rules) rules.faces(g, f, now)
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
    game: null,
    played: 0, // games begun on this arcade: each one's seed comes from it
    beats: 0,
    pending: [], // at the chime: who it caught short, in turn order
    thirdPending: false, // and whether a trio's third player is among them (last), owed Boo's line
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
function toReady(s, id, t) {
  s.pick = id
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
  if (counted(s)) s.players[s.turn].games.push({ game: s.game.id, score: s.game.score })
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
// After the farewell: a fresh free-play arcade (the events made so far stay).
function afterFarewell(s, t) {
  const events = s.events
  const fresh = newArcade({ mode: 'free', seed: hashOf(`${s.seed}:farewell`), now: t })
  for (const k of Object.keys(s)) delete s[k]
  Object.assign(s, fresh, { events })
}

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
  const pressed = e.kind === 'key' || e.kind === 'press'
  switch (s.stage) {
    case 'home': case 'menu': {
      const i = e.kind === 'key' ? MENU_KEYS.indexOf(e.index) : -1
      if (i >= 0) toReady(s, GAMES[i].id, t) // any other key or dial: nothing
      return
    }
    case 'ready':
      if (e.kind === 'key' && e.index === BACK_KEY) {
        s.events.push('back') // no token spent
        return counted(s) ? toMenu(s, t, s.turn) : toHome(s, t)
      }
      return toCount(s, t) // any other key, any dial press or turn
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

// ---- what the deck, the strip and the screen show ----

const wholeMs = ms => Math.max(0, Math.ceil(ms / 1000)) * 1000 // shown in whole seconds
function clockText(ms) {
  const sec = Math.max(0, Math.ceil(ms / 1000))
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`
}
const pointsOf = n => `${n} ${n === 1 ? 'point' : 'points'}`
// Whack-a-Mouse's count of pets tapped, on the strip and beside the deck.
const tallyOf = g => g?.id === 'mice' ? `Pets tapped: ${g.petTaps ?? 0} of ${MICE_PETS_OUT}` : null
// A strike's words, while they last: in place of the points on the strip (Jon,
// 29 Oct 2026: every strike says so on the touch strip). Its game's rule, for
// a game that counts strikes, on the strip before it starts.
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
  if (a.stage === 'menu') {
    const left = a.players[a.turn]?.tokens ?? 0
    TOKEN_KEYS.forEach((k, i) => { f[k] = i < TOKENS - left ? 'coin-spent' : 'coin' })
  }
  return f
}

function facesOf(a, now) {
  if (a.stage === 'home' || a.stage === 'menu') return menuFaces(a, now)
  if (a.stage === 'ready' && a.game) { const f = gameFaces(a.game, now); f[BACK_KEY] = 'back'; return f }
  if ((a.stage === 'play' || a.stage === 'result') && a.game) return gameFaces(a.game, now) // the result: the last board
  const f = new Array(KEY_COUNT).fill('off')
  if (a.stage === 'count') f[MIDDLE_KEY] = `num:${countOf(a, now)}`
  else if (a.stage === 'clue' || a.stage === 'third') f[MIDDLE_KEY] = 'ok' // press anything to go on
  else if (a.stage === 'winner') { marquee(f, a, now); f[MIDDLE_KEY] = 'boo' }
  else if (a.stage === 'farewell') f[MIDDLE_KEY] = 'boo'
  return f
}

const NO_DIALS = ['', '', '', '', '', '']
function stripOf(a, now) {
  const g = PLAYING.includes(a.stage) ? a.game : null
  const name = g ? GAME[g.id]?.name ?? '' : ''
  const dials = g ? GAME[g.id]?.dials ?? NO_DIALS : NO_DIALS
  const who = a.players[a.turn]?.name ?? ''
  const line = (left, centre, right = '', bar = null, labels = NO_DIALS) => ({ left, centre, right, bar, dials: [...labels] })
  switch (a.stage) {
    case 'home': return line('Free play', 'Press a game')
    case 'menu': return line(`${who}'s turn`, 'Press a game', `Tokens: ${a.players[a.turn]?.tokens ?? 0}`)
    case 'ready': return line(name, 'Press any key to start', ruleOf(g), null, dials)
    case 'count': return line(name, String(countOf(a, now)), ruleOf(g), null, dials)
    case 'play': {
      if (!g) return line('', '')
      const left = Math.max(0, g.endsAt - now)
      const bar = Math.min(1, Math.ceil(left / 1000) / Math.max(1, Math.round((g.endsAt - g.startedAt) / 1000)))
      return line(tallyOf(g) ?? name, saidOf(g, now) ?? pointsOf(g.score), clockText(left), bar, dials)
    }
    case 'result': return g ? line(name, outcomeOf(g), pointsOf(g.score)) : line('', '')
    case 'clue': return line(who, 'Your clue is on the screen')
    case 'third': return line('', who)
    case 'winner': return line('', `Most points: ${andList(winnerOf(a).names)}`)
    case 'farewell': return line('', FAREWELL_LINE)
    default: return line('', '')
  }
}

const WIN_WORDS = { tail: 'Boo is full.', knock: 'Everything is off the table.' }
const LOSE_WORDS = { tail: 'Boo bit her own tail.', pointer: 'Boo caught the red dot.', mice: 'You tapped three pets.' }
const LOSE_LINES = { tail: BOO_LINES.bite, pointer: BOO_LINES.caught, mice: BOO_LINES.pets }
// How a game ended, in a few words: on the result's strip and its screen.
const outcomeOf = g => g.outcome === 'win' ? WIN_WORDS[g.id] ?? 'Well played.' : g.outcome === 'lose' ? LOSE_WORDS[g.id] ?? 'Game over.' : "Time's up."
function resultLine(a) {
  const g = a.game
  const who = counted(a) && a.players[a.turn] ? `${a.players[a.turn].name}: ` : ''
  return `${outcomeOf(g)} ${who}${pointsOf(g.score)}.`
}

function plainOf(a, info, yours, winner) {
  switch (a.stage) {
    case 'home': return a.free ? 'Free play until the chime. Nothing counts now.' : 'Press a game on the Stream Deck. Just for fun.'
    case 'menu': return `${yours?.name ?? ''}'s turn: press a game on the Stream Deck.`
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
      if (g?.outcome === 'win') return BOO_LINES.win[hashOf(`${a.seed}:win:${a.played}`) % BOO_LINES.win.length]
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
    case 'result': return a.game?.outcome === 'win' ? ' Boo 5.png' : a.game?.outcome === 'lose' ? 'Boo 3.png' : 'Boo 4.png'
    case 'clue': return 'Boo 4.png'
    case 'third': return 'Boo 3.png'
    case 'winner': return ' Boo 5.png'
    case 'farewell': return 'Boo 3.png'
    default: return 'Boo 1.png'
  }
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
  return {
    title: ARCADE_NAME,
    mode: a.mode,
    free: !!a.free,
    stage: a.stage,
    game: info ? { id: info.id, name: info.name, how: info.how } : null,
    plain: plainOf(a, info, yours, winner),
    boo: booOf(a, info, winner),
    picture: pictureOf(a),
    score: g ? g.score : null,
    tally: a.stage === 'play' ? tallyOf(g) : null, // Whack-a-Mouse's pets tapped, beside the points
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
// turn; 'play' Boo Chasing Her Tail with a tail of four, two fish eaten and
// about a minute left; 'clue' a pair, the first player's clue; 'third' a
// trio's third player; 'winner' a pair; 'farewell' a pair, nobody left out.
export function arcadeSample(name, now = 0) {
  switch (name) {
    case 'menu': return sampleVisit(PAIR, [[['knock', 30], ['tail', 34]], [['mice', 23]]], 'menu', 1, now, 3000, 330000)
    case 'play': {
      const a = newArcade({ mode: 'free', seed: SAMPLE_SEED, now: now - 70000 })
      const g = newGame('tail', { seed: SAMPLE_SEED, lengthMs: FREE_GAME_MS, now: now - 61000 })
      const game = {
        ...g,
        body: [keyAt(2, 5), keyAt(2, 4), keyAt(2, 3), keyAt(1, 3), keyAt(1, 2)],
        dir: 'right', queue: [], fish: keyAt(1, 7), eaten: 2, score: 2 * TAIL_FISH_POINTS,
        nextAt: now + 300, at: now,
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
