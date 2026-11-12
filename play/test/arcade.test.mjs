import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'
import {
  ARCADE_NAME, COLS, ROWS, KEY_COUNT, DIALS, keyAt, rowOf, colOf, LEFT_DIAL, RIGHT_DIAL, MENU_KEYS, BACK_KEY, EXIT_DIAL, SCORE_KEYS, STRIP_WIDTH,
  TABLE_ENDS, TABLE_WAYS, tableEndCol, tableStartCol,
  TOKENS, MAX_PLAYERS, CLUE_AFTER_GAMES, ROUND_MS, FREE_GAME_MS, GAME_MS, CLUE_KEEP_MS, CUT_MIN_MS,
  STAND_IN_CLUE, CLUE_NOTE, CLUE_WAIT, THIRD_LINE, FAREWELL_LINE, BOO_LINES, arcadeClueText, arcadeRoundEnds,
  GAMES, KNOCK_OBJECTS, PETS, FRIEND_NAMES, TAIL_FRIENDS, FUR_PAIRS, MENU_FACES, GAME_FACES, FACE_IDS, SOUND_NAMES, BOO_PICTURES, nextRand, hashOf, MARK_LABELS,
  newGame, stepGame, inputGame, gameFaces, newArcade, arcadeStep, arcadeInput, arcadeChime, arcadeBack, arcadeExit, arcadeView, arcadeSample,
  HIT_MS, MISS_MS, STRIKES_OUT, STRIKE_WORDS_MS, DIAL_MAX_KEYS,
  TAIL_STEP_MS, TAIL_STEP_END_MS, TAIL_TURN_ONE_IN, TAIL_FLEE_KEYS, TAIL_AWAY_KEYS, TAIL_LENGTH, TAIL_GROWS_AT, TAIL_LENGTH_MAX,
  TAIL_BLOCKS_FROM_MS, TAIL_BLOCKS_EVERY_MS, TAIL_BLOCKS_MAX, TAIL_POINTS,
  TAIL_TREAT_FROM_MS, TAIL_TREAT_EVERY_MS, TAIL_TREAT_UP_MS, TAIL_TREAT_POINTS, TAIL_HAZARD_FROM_MS, TAIL_HAZARD_EVERY_MS, TAIL_HAZARD_UP_MS, TAIL_HAZARDS_MAX, TAIL_FREEZE_MS,
  POINTER_STEP_MS, POINTER_STEP_END_MS, POINTER_NAP_MS, POINTER_WAKE_KEYS, POINTER_BORED_KEYS, POINTER_BORED_STEPS,
  POINTER_SPARKLE_MS, POINTER_SPARKLES, POINTER_SPARKLE_UP_MS, POINTER_NEAR_ONE_IN, POINTER_POINTS, POINTER_MISS_POINTS, POINTER_LAST_POINTS,
  POINTER_BLOCKS_FROM_MS, POINTER_BLOCKS_EVERY_MS, POINTER_BLOCKS_MAX,
  MICE_SPAWN_MIN_MS, MICE_REFILL_MS, MICE_REFILL_MORE_MS, MICE_UP_MS, MICE_UP_END_MS, MICE_GOLD_UP_MS, MICE_GOLD_UP_END_MS,
  MICE_AT_ONCE, MICE_MORE_EVERY_MS, MICE_AT_ONCE_MAX, MICE_POINTS, MICE_GOLD_POINTS,
  MICE_PETS_FROM_MS, MICE_PET_ONE_IN, MICE_PETS_OUT, MICE_REST_MS, MICE_LATE_MS,
  KNOCK_BEAT_MS, KNOCK_BEAT_END_MS, KNOCK_TOP_AT, KNOCK_EVERY_BEATS, KNOCK_EVERY_BEATS_END, KNOCK_PER_TABLE, KNOCK_APART,
  KNOCK_LATE_MS, KNOCK_EARLY_MS, KNOCK_GONE_MS, KNOCK_POINTS, KNOCK_FRIENDS_FROM_MS, KNOCK_FRIEND_ONE_IN,
  YARN_STEP_MS, YARN_STEP_END_MS, YARN_SPAWN_MS, YARN_SPAWN_END_MS, YARN_FALLING, YARN_LAND_MS, YARN_POINTS, YARN_GOLD_POINTS, GOLD_ONE_IN,
  YARN_MISSES_OUT, YARN_FRIENDS_FROM_MS, YARN_FRIEND_ONE_IN, marksOutOf, COLUMN_X,
  READY_MS, COUNT_MS, RESULT_MS, PICK_MS, CLUE_MIN_MS, CLUE_MAX_MS, WINNER_MIN_MS, FAREWELL_MS, MARQUEE_STEP_MS,
} from '../src/lib/arcade.js'

// Miss Boo LaRue's Arcade (28 Oct 2026; its five games remade on 29 Oct 2026
// after Jon's notes): the pure engine (lib/arcade.js). G54 the menu and the
// five games, G55 the practice visit, G56 the words, L09 the page reads no
// night and keeps nothing. Throwaway games made here; nothing read from a
// night, nothing printed.

const src = p => readFileSync(new URL(p, import.meta.url), 'utf8')
// Freeze a state all the way down: an engine that changed what it was handed would throw.
function frozen(x) {
  if (x && typeof x === 'object' && !Object.isFrozen(x)) { for (const v of Object.values(x)) frozen(v); Object.freeze(x) }
  return x
}
const key = index => ({ kind: 'key', index })
const turn = (dial, amount) => ({ kind: 'turn', dial, amount })
const press = (dial = 0) => ({ kind: 'press', dial })
const tap = x => ({ kind: 'strip', x }) // a tap on the touch strip
const swipe = (from, to) => ({ kind: 'swipe', from, to })
const arrow = dir => ({ kind: 'arrow', dir }) // the keyboard's arrow keys
const step = (g, t) => stepGame(frozen(g), t)
const input = (g, ev, t) => inputGame(frozen(g), ev, t)
const aStep = (a, t) => arcadeStep(frozen(a), t)
const aIn = (a, ev, t) => arcadeInput(frozen(a), ev, t)
const json = x => JSON.parse(JSON.stringify(x))
const without = (x, ...keys) => { const c = { ...x }; for (const k of keys) delete c[k]; return c }
const uniq = list => [...new Set(list)]
const near = (a, b, eps = 1e-6) => Math.abs(a - b) <= eps
const ALL_KEYS = Array.from({ length: KEY_COUNT }, (_, i) => i)
const MIDDLE = keyAt(1, 4) // the count's number, OK, and Boo
const END = COLS - 1 // the last column: each of Knock It Off the Table's four tables ends there
const TICK = 16 // the page's loop (screens/Arcade.jsx TICK_MS; L09 checks they match)
const menuKey = id => MENU_KEYS[GAMES.findIndex(g => g.id === id)]
const rowFaces = (faces, r) => faces.slice(keyAt(r, 0), keyAt(r, 0) + COLS)
const listed = names => names.length === 1 ? names[0] : `${names.slice(0, -1).join(', ')} and ${names.at(-1)}`
const pts = n => `${n} ${n === 1 ? 'point' : 'points'}`
const apart = (a, b) => Math.abs(rowOf(a) - rowOf(b)) + Math.abs(colOf(a) - colOf(b)) // keys along the rows and columns
// The keys beside a key along its row and its column, and the key straight on from `to` coming from `from` (null past the edge).
const besideOf = k => [[-1, 0], [1, 0], [0, -1], [0, 1]].map(([dr, dc]) => [rowOf(k) + dr, colOf(k) + dc])
  .filter(([r, c]) => r >= 0 && r < ROWS && c >= 0 && c < COLS).map(([r, c]) => keyAt(r, c))
const aheadOf = (from, to) => {
  const r = 2 * rowOf(to) - rowOf(from), c = 2 * colOf(to) - colOf(from)
  return r >= 0 && r < ROWS && c >= 0 && c < COLS ? keyAt(r, c) : null
}
const nearestOf = (keys, k) => Math.min(...keys.map(x => apart(x, k)))
// The words a strike says for each of Sir Irwin and his friends (Jon, 29 Oct 2026), exactly.
const STRUCK = { boo: "That's Miss Boo.", granola: "That's Granolia.", irwin: "That's the birthday boy.", salem: "That's Salem.", zimmy: "That's Zimothy Clawford, Esq." }
// A starting point that moves to an end point over a two-minute game started at 0, as the engine's speeds do.
const over2min = (from, to, t) => from + (to - from) * Math.min(1, Math.max(0, t / 120000))
const NO_DIALS = ['', '', '', '', '', '']
// The strike boxes as the strip and the screen show them, with their word (30 Oct 2026).
const marksOf = (id, used) => ({ of: marksOutOf(id), used, label: MARK_LABELS[id] })
// The dial labels with Exit over the dial that leaves the game, while it counts down or runs (30 Oct 2026).
const withExit = d => d.map((x, i) => (i === EXIT_DIAL ? 'Exit' : x))
const SAMPLES = ['home', 'menu', 'play', 'clue', 'third', 'winner', 'farewell']

// Yarn Catch's basket, played well since 30 Oct 2026: a tap on the strip under the lowest ball's
// column (the strip is the rail), never under a friend about to land or waiting on the floor, and
// out from under one. A tap event, or null to stay.
// A turn of the left dial that takes the basket from `from` to `col` the short way round (31 Oct 2026: the dial, no tap).
const colTap = (col, from = 4) => { let d = ((col - from) % COLS + COLS) % COLS; if (d > COLS / 2) d -= COLS; return turn(LEFT_DIAL, d) }
const ALL_COLUMNS = Array.from({ length: COLS }, (_, c) => c)
function yarnChase(g) {
  const danger = col => g.balls.some(b => b.friend && b.col === col && b.row >= 2)
  const balls = g.balls.filter(b => !b.friend)
  const low = balls.reduce((a, b) => (!a || b.row > a.row ? b : a), null)
  let col = low && !danger(low.col) ? low.col : g.basket
  if (danger(col)) col = ALL_COLUMNS.filter(c => !danger(c)).sort((a, b) => Math.abs(a - g.basket) - Math.abs(b - g.basket))[0] ?? col
  return col === g.basket ? null : colTap(col, g.basket)
}
// Random presses, turns, taps, swipes, arrows and junk through a whole game, at the page's ticks.
function randomGame(id, seed, lengthMs = 30000) {
  let g = newGame(id, { seed, lengthMs, now: 0 })
  let rs = seed
  const roll = () => { const r = nextRand(rs); rs = r.rs; return r.v }
  const faces = new Set(), sounds = new Set()
  const junk = [null, { kind: 'up' }, key(KEY_COUNT), key(-1), key(2.5), arrow('sideways'), turn(DIALS, 1), turn(0, 0), { kind: 'turn', dial: 0, amount: 'x' }]
  for (let t = 0; t <= lengthMs + 1000; t += TICK) {
    if (roll() < 0.3) {
      const r = roll()
      const sign = roll() < 0.5 ? -1 : 1
      const ev = r < 0.3 ? key(Math.floor(roll() * KEY_COUNT))
        : r < 0.4 ? key(TABLE_ENDS[Math.floor(roll() * TABLE_ENDS.length)])
          : r < 0.65 ? turn(Math.floor(roll() * DIALS), sign * (1 + Math.floor(roll() * 4)))
            : r < 0.72 ? press(Math.floor(roll() * DIALS))
              : r < 0.82 ? tap(roll() * STRIP_WIDTH)
                : r < 0.87 ? swipe(roll() * STRIP_WIDTH, roll() * STRIP_WIDTH)
                  : r < 0.97 ? arrow(['left', 'right', 'up', 'down'][Math.floor(roll() * 4)])
                    : junk[Math.floor(roll() * junk.length)]
      g = input(g, ev, t)
      g.events.forEach(e => sounds.add(e))
    }
    g = step(g, t)
    g.events.forEach(e => sounds.add(e))
    const f = gameFaces(g, t)
    assert.equal(f.length, KEY_COUNT)
    f.forEach(x => faces.add(x))
  }
  return { g, faces, sounds }
}

// A free arcade with the game `id` just started: picked at 0, pressed once the pick's tick is over.
function started(id, { seed = 6, players = null } = {}) {
  let a = newArcade(players ? { mode: 'visit', players, seed, now: 0 } : { mode: 'free', seed, now: 0 })
  a = aIn(a, key(menuKey(id)), 0)
  a = aIn(a, press(0), PICK_MS)
  const t = PICK_MS + COUNT_MS
  a = aStep(a, t)
  assert.equal(a.stage, 'play')
  return [a, t]
}

// Pick a game, start it, and let it run (pressing what `during` presses, every
// `every` ms) until it is over: the arcade is then on the result.
function playGame(a, t, id, during, every = 250) {
  a = aIn(a, key(menuKey(id)), t)
  assert.equal(a.stage, 'ready')
  t += PICK_MS
  a = aIn(a, press(1), t)
  assert.equal(a.stage, 'count')
  t += COUNT_MS
  a = aStep(a, t)
  assert.equal(a.stage, 'play')
  while (a.stage === 'play') {
    t += every
    a = aStep(a, t)
    if (during && a.stage === 'play') a = during(a, t)
  }
  assert.equal(a.stage, 'result')
  return [a, t]
}
// Knock off everything on the end of a table.
function knocker(a, t) {
  if (a.game.id !== 'knock') return a
  for (const x of a.game.things.filter(y => y.col === tableEndCol(y.row) && !y.friend)) if (a.stage === 'play') a = aIn(a, key(TABLE_ENDS[x.row]), t)
  return a
}
// Strike on purpose: tap Sir Irwin or a friend, or press the end of the first table with nothing coming.
function striker(a, t) {
  const g = a.game
  if (g.id === 'mice' && g.pets.length) return aIn(a, key(g.pets[0].key), t)
  if (g.id === 'knock' && !g.things.some(x => x.row === 0 && x.col >= END - 1)) return aIn(a, key(TABLE_ENDS[0]), t) // the first table runs to the right
  return a
}

// The Lazy Pointer, played well: before a tick, the dial turns that leave the
// dot farthest from Boo (by keys, then by the nearer of row and column), twice.
const POINTER_MOVES = [turn(LEFT_DIAL, 1), turn(LEFT_DIAL, -1), turn(RIGHT_DIAL, 1), turn(RIGHT_DIAL, -1)]
function flee(g, t) {
  const far = k => 100 * apart(k, g.boo) + Math.min(Math.abs(rowOf(k) - rowOf(g.boo)), Math.abs(colOf(k) - colOf(g.boo)))
  for (let n = 0; n < 2; n++) {
    let best = g
    for (const ev of POINTER_MOVES) { const h = inputGame(g, ev, t); if (far(h.dot) > far(best.dot)) best = h }
    g = best
  }
  return g
}
// And led to the nearest sparkle whenever Boo is three keys away or more.
function lure(g, t) {
  const target = g.sparkles.map(s => s.key).sort((a, b) => apart(a, g.dot) - apart(b, g.dot))[0]
  if (target != null && apart(g.dot, g.boo) >= 3) {
    let best = g
    for (const ev of POINTER_MOVES) { const h = inputGame(g, ev, t); if (apart(h.dot, target) < apart(best.dot, target) && apart(h.dot, g.boo) >= 2) best = h }
    if (best !== g) return best
  }
  return flee(g, t)
}
// A two-minute Lazy Pointer played by `play` every sixth tick.
function playPointer(seed, play) {
  let g = newGame('pointer', { seed, lengthMs: 120000, now: 0 })
  for (let t = 0; t <= 120000 && !g.over; t += TICK) { g = stepGame(g, t); if (!g.over && t % (6 * TICK) === 0) g = play(g, t) }
  return g
}

// A whole visit to its free play: each turn picks the next game in `picks`.
// `look(a, t)` sees every moment on the way.
// Since 30 Oct 2026 a player has one round of each game: each turn picks the first of `picks` the
// player has not played yet, else the first unplayed game in the menu's order.
const nextPick = (a, picks) => {
  const p = a.players[a.turn]
  const unplayed = id => !p.games.some(x => x.game === id)
  return picks.find(unplayed) ?? GAMES.map(g => g.id).find(unplayed)
}
function runVisit(names, picks, { seed = 21, during, look = () => {}, roundMs = 3600000 } = {}) {
  let a = newArcade({ mode: 'visit', players: names, seed, now: 0, roundMs })
  let t = 0
  look(a, t)
  for (let guard = 0; guard < 20000 && !(a.stage === 'home' && a.free); guard++) {
    if (a.stage === 'menu') {
      a = aIn(a, key(menuKey(nextPick(a, picks))), t); look(a, t)
      t += PICK_MS
      a = aIn(a, press(1), t); look(a, t)
    } else if (['clue', 'third', 'winner'].includes(a.stage)) {
      t += a.stage === 'winner' ? WINNER_MIN_MS : CLUE_MIN_MS
      a = aStep(a, t); look(a, t)
      a = aIn(a, a.stage === 'winner' ? tap(600) : key(0), t); look(a, t) // the winner's page goes on at a tap on the strip (1 Nov 2026)
    } else {
      t += 250
      a = aStep(a, t)
      if (during && a.stage === 'play') a = during(a, t)
      look(a, t)
    }
  }
  assert.ok(a.stage === 'home' && a.free, 'the visit reached its free play')
  return [a, t]
}

// A visit on the fifteen-minute round at a steady pace: `menuMs` to pick a game,
// `readyMs` on how to play, `clueMs` on a clue or Boo's line, and nobody
// touches a game. It notes when each player's clue (or a trio's third line)
// came, and for each game when it started, how long it ran, what the screen
// said its length was before it started, and its time as it started.
function pacedVisit(names, picks, { menuMs, readyMs, clueMs }) {
  let a = newArcade({ mode: 'visit', players: names, seed: 31, now: 0 })
  const came = [], games = []
  // never past the chime, so the visit stops on the farewell
  const go = (t, ev) => ev ? aIn(a, ev, Math.min(t, a.roundEndsAt)) : aStep(a, Math.min(t, a.roundEndsAt))
  for (let guard = 0; guard < 300 && a.stage !== 'farewell' && !(a.stage === 'home' && a.free); guard++) {
    const at = a.stageAt
    switch (a.stage) {
      case 'menu': a = go(at + menuMs, key(menuKey(nextPick(a, picks)))); break
      case 'ready': {
        const t = at + readyMs
        const said = arcadeView(a, t).screen.timeLeftMs
        a = go(t, press(0))
        if (a.stage === 'count') games.push({ said, counting: arcadeView(a, t).screen.timeLeftMs })
        break
      }
      case 'count': a = go(at + COUNT_MS); break
      case 'play': {
        Object.assign(games.at(-1), { start: a.game.startedAt, length: a.game.endsAt - a.game.startedAt, left: arcadeView(a, a.game.startedAt).screen.timeLeftMs, gamesLeft: a.players.reduce((n, p) => n + p.tokens, 0) + 1, cluesLeft: a.players.filter(p => !p.reached).length })
        a = go(a.game.endsAt)
        break
      }
      case 'result': a = go(at + RESULT_MS); break
      case 'clue': case 'third': came[a.turn] = { stage: a.stage, at }; a = go(at + clueMs, press(0)); break
      case 'winner': a = go(at + WINNER_MIN_MS, tap(600)); break
      default: assert.fail(`no step for ${a.stage}`)
    }
  }
  return { a, came, games }
}
// The pace of a group that takes its time, at the slow end of ordinary, and slower.
const ORDINARY = { menuMs: 12000, readyMs: 14000, clueMs: 30000 }
const SLOW = { menuMs: 20000, readyMs: 14000, clueMs: 60000 }

// The arcade on a game's result, for any finished game.
const onResult = (g, extra = {}) => ({ ...newArcade({ mode: 'free', seed: 3, now: 0 }), stage: 'result', stageAt: g.endedAt, pick: g.id, game: g, played: 1, ...extra })

// Every way a game ends, played here: the clock run out with points and with
// none, Boo catching the dot three times, three friends, three misses.
function endings() {
  const tail = newGame('tail', { seed: 7, lengthMs: 120000, now: 0 })
  const tailPoints = stepGame(inputGame({ ...tail, boo: keyAt(1, 2), tail: [keyAt(1, 5), keyAt(1, 4), keyAt(1, 3)] }, turn(LEFT_DIAL, 1), 300), 120000)
  const tailNone = stepGame(tail, 120000)
  const pointerOut = stepGame(newGame('pointer', { seed: 1, lengthMs: 120000, now: 0 }), 120000)
  const pointerLasted = playPointer(1, flee)
  let miceOut = newGame('mice', { seed: 21, lengthMs: 120000, now: 0 }) // every friend that comes is tapped
  for (let t = 0; !miceOut.over; t += TICK) {
    miceOut = stepGame(miceOut, t)
    for (const m of miceOut.mice) miceOut = inputGame(miceOut, key(m.key), t)
    if (miceOut.pets.length) miceOut = inputGame(miceOut, key(miceOut.pets[0].key), t)
  }
  const miceNone = stepGame(newGame('mice', { seed: 1, lengthMs: 120000, now: 0 }), 120000)
  const knockOut = stepGame(newGame('knock', { seed: 1, lengthMs: 120000, now: 0 }), 120000) // nobody presses: three get away
  let yarnPoints = newGame('yarn', { seed: 4, lengthMs: 120000, now: 0 }) // the basket goes under the lowest ball, never a friend
  for (let t = 0; t <= 120000; t += TICK) {
    yarnPoints = stepGame(yarnPoints, t)
    const ev = t % (3 * TICK) === 0 ? yarnChase(yarnPoints) : null
    if (ev) yarnPoints = inputGame(yarnPoints, ev, t)
  }
  return { tailPoints, tailNone, pointerOut, pointerLasted, miceOut, miceNone, knockOut, yarnPoints }
}

// Every word a view puts on the strip or the screen.
function shownWords(v) {
  const s = v.screen
  return [v.strip.left, v.strip.centre, v.strip.right, ...v.strip.dials, s.title, s.plain, s.boo, s.game?.name, s.game?.how, s.game?.rule, s.tally?.label, s.said,
    s.clue, s.note, s.third, s.farewell, ...s.pending, ...(s.winner?.names ?? []), s.player, ...s.players.map(p => p.name), ...s.facts.flatMap(f => [f.label, f.value])]
    .filter(x => typeof x === 'string' && x)
}

// ---- G54: the menu and the five games ----------------------------------------

test('G54 the menu: the five games on the second row with two blank keys each side, in order; nothing else on it does anything', () => {
  assert.deepEqual(MENU_KEYS, [11, 12, 13, 14, 15])
  assert.deepEqual(MENU_KEYS.map(rowOf), [1, 1, 1, 1, 1])
  assert.deepEqual(MENU_KEYS.map(colOf), [2, 3, 4, 5, 6])
  assert.deepEqual(GAMES.map(g => g.id), ['tail', 'pointer', 'mice', 'knock', 'yarn'])
  assert.deepEqual(GAMES.map(g => g.name), ['Boo Chasing Her Tail', 'The Lazy Pointer', 'Whack-a-Mouse', 'Knock It Off the Table', 'Yarn Catch'])
  assert.deepEqual([COLS, ROWS, KEY_COUNT, DIALS], [9, 4, 36, 6], 'the Stream Deck + XL: 36 keys in 9 columns by 4 rows, six dials')
  assert.equal(BACK_KEY, keyAt(3, 0))
  assert.equal(STRIP_WIDTH, 1200)
  assert.equal(ARCADE_NAME, "Miss Boo LaRue's Arcade")
  assert.equal(MAX_PLAYERS, 3)
  for (const g of GAMES) assert.equal(g.dials.length, DIALS)

  const home = arcadeView(newArcade({ mode: 'free', seed: 1, now: 0 }), 0)
  assert.deepEqual(rowFaces(home.faces, 0), ['paw', 'paw-lit', 'paw', 'paw', 'boo', 'paw', 'paw', 'paw-lit', 'paw'])
  assert.deepEqual(rowFaces(home.faces, 1), ['blank', 'blank', 'menu:tail', 'menu:pointer', 'menu:mice', 'menu:knock', 'menu:yarn', 'blank', 'blank'])
  assert.deepEqual(rowFaces(home.faces, 2), Array(COLS).fill('blank'))
  assert.deepEqual(rowFaces(home.faces, 3), Array(COLS).fill('blank'))
  assert.deepEqual(home.strip, { left: 'Free play', centre: 'Press a game', right: '', score: null, marks: null, clock: null, zones: null, basket: null, dials: NO_DIALS })

  // a visit's menu: the player's five tokens on the third row, one under each game (30 Oct 2026)
  const a = newArcade({ mode: 'visit', players: ['Jessa', 'Mari'], seed: 1, now: 0 })
  const v = arcadeView(a, 0)
  assert.deepEqual(rowFaces(v.faces, 2), ['blank', 'blank', 'coin', 'coin', 'coin', 'coin', 'coin', 'blank', 'blank'])
  assert.deepEqual(v.strip, { left: 'Press a game', centre: "Jessa's turn", right: 'Tokens: 5', score: null, marks: null, clock: null, zones: null, basket: null, dials: NO_DIALS }, 'whose turn big in the middle (31 Oct 2026)')
  // any other key, a dial, the strip, an arrow or nonsense does nothing, and makes no sound
  for (const ev of [key(0), key(10), key(16), key(BACK_KEY), key(KEY_COUNT), turn(0, 1), turn(5, -3), press(3), tap(600), swipe(100, 900), arrow('left'), arrow('up'), { kind: 'up' }, null]) {
    const b = aIn(a, ev, 100)
    assert.equal(b.stage, 'menu')
    assert.deepEqual(b.events, [])
  }
  // each game key opens that game, with a coin
  GAMES.forEach((g, i) => {
    const b = aIn(a, key(MENU_KEYS[i]), 100)
    assert.equal(b.stage, 'ready')
    assert.equal(b.pick, g.id)
    assert.deepEqual(b.events, ['coin'])
    assert.equal(b.players[0].tokens, TOKENS, 'picking spends nothing yet')
  })
})

test('G54 a game picked on the menu shows the green tick on its key for PICK_MS, and a press meanwhile does nothing, so a double tap never skips the how-to; then the deck shows the game\'s own starting board, with Back', () => {
  assert.ok(PICK_MS >= 150 && PICK_MS <= 500, 'long enough to see, short enough not to wait on')
  const a = newArcade({ mode: 'visit', players: ['Jessa', 'Mari'], seed: 1, now: 0 })
  const T = 1000
  for (const g of GAMES) {
    const k = menuKey(g.id)
    const r = aIn(a, key(k), T)
    assert.equal(r.stage, 'ready')
    assert.equal(r.pickedKey, k)
    // the menu as it was, its key green
    for (const t of [T, T + PICK_MS - 1]) {
      const f = arcadeView(r, t).faces
      assert.equal(f[k], 'hit', `${g.id} at ${t}`)
      assert.deepEqual(f.slice(COLS).map((x, i) => (i + COLS === k ? `menu:${g.id}` : x)), arcadeView(a, t).faces.slice(COLS), 'the rest of the menu, its tokens too')
    }
    // a second tap on its key, a press, any key, Back, the strip: nothing, and no sound
    for (const ev of [key(k), press(0), key(5), key(BACK_KEY), tap(300), turn(0, 1)]) {
      const d = aIn(r, ev, T + PICK_MS - 1)
      assert.equal(d.stage, 'ready', `${g.id}: ${JSON.stringify(ev)}`)
      assert.deepEqual(d.events, [])
      assert.equal(d.players[0].tokens, TOKENS)
    }
    // then the game's starting board, made from the game's own seed, with Back on its key
    const board = arcadeView(r, T + PICK_MS).faces
    const fitted = r.game.endsAt - r.game.startedAt // a visit's game is cut to fit the round (30 Oct 2026)
    assert.ok(fitted >= CUT_MIN_MS && fitted <= GAME_MS)
    assert.deepEqual(r.game, newGame(g.id, { seed: hashOf(`${a.seed}:${a.played}`), lengthMs: fitted, now: T }))
    assert.deepEqual(board, gameFaces(r.game, T + PICK_MS).map((x, i) => (i === BACK_KEY ? 'back' : x)))
    assert.ok(!board.includes('hit') && !board.some(x => x.startsWith('menu:')), 'no menu now')
    // and a press starts the count
    assert.equal(aIn(r, press(0), T + PICK_MS).stage, 'count')
  }
})

test('G54 the top row flashes like an arcade game (Jon, 29 Oct 2026): cat paws for the stars, one in three lit, the lights running in towards Boo in the middle, and the winner\'s row too', () => {
  const row = faces => rowFaces(faces, 0).map(f => ({ paw: '.', 'paw-lit': 'L', boo: 'B' })[f] ?? '?').join('')
  // the stage's own clock: a step every MARQUEE_STEP_MS, each one key further in, then round again
  const home = newArcade({ mode: 'free', seed: 1, now: 1000 })
  const at = n => row(arcadeView(home, 1000 + n * MARQUEE_STEP_MS).faces)
  assert.deepEqual([0, 1, 2, 3].map(at), ['.L..B..L.', '..L.B.L..', 'L..LBL..L', '.L..B..L.'])
  assert.equal(row(arcadeView(home, 1000 + MARQUEE_STEP_MS - 1).faces), at(0), 'still within the first step')
  assert.equal(row(arcadeView(home, 999).faces), at(0), 'a moment before the stage began is its first step')
  for (let n = 0; n < 30; n++) {
    const r = at(n)
    assert.equal(r, [...r].reverse().join(''), 'the two sides mirror each other')
    assert.equal(r, at(n + 3), 'round again every third step')
    assert.equal(r[4], 'B', "Boo's face stays in the middle")
    assert.ok(r.includes('L'), 'always some lit')
  }
  for (let c = 0; c < COLS; c++) {
    if (c === 4) continue
    assert.equal([0, 1, 2].filter(n => at(n)[c] === 'L').length, 1, `key ${c} is lit one step in three`)
  }
  assert.ok(MARQUEE_STEP_MS >= 150 && MARQUEE_STEP_MS <= 500 && MARQUEE_STEP_MS > 4 * TICK, 'quick enough to flash, slow enough that the page\'s 16 ms loop shows every step')
  // nothing else on the menu moves
  const still = f => f.slice(COLS)
  assert.deepEqual(still(arcadeView(home, 1000).faces), still(arcadeView(home, 1000 + MARQUEE_STEP_MS).faces))
  // a visit's menu starts its lights when it opens
  const v = newArcade({ mode: 'visit', players: ['Jessa', 'Mari'], seed: 1, now: 5000 })
  assert.equal(row(arcadeView(v, 5000).faces), '.L..B..L.')
  // the winner: nine paws (Boo is on the middle key below), the same lights
  const w = arcadeSample('winner', 0)
  const wRow = n => row(arcadeView(w, w.stageAt + n * MARQUEE_STEP_MS).faces)
  assert.deepEqual([0, 1, 2].map(wRow), ['.L..L..L.', '..L...L..', 'L..L.L..L'])
  assert.deepEqual(SCORE_KEYS.map(k => arcadeView(w, w.stageAt).faces[k]), ['num:1', 'num:2', 'off'], 'a key a player for their scores (31 Oct 2026), a pair here')
  for (const f of ['paw', 'paw-lit']) assert.ok(MENU_FACES.includes(f))
  assert.ok(!FACE_IDS.includes('star'), 'no stars now')
})

test('G54 every face a game shows is one the art knows and one its game makes ready beforehand, always 36 of them, and every sound is a known one', () => {
  assert.equal(new Set(FACE_IDS).size, FACE_IDS.length, 'no face listed twice')
  assert.equal(new Set(SOUND_NAMES).size, SOUND_NAMES.length)
  assert.deepEqual(Object.keys(GAME_FACES), GAMES.map(g => g.id))
  assert.deepEqual([...FACE_IDS].sort(), uniq([...MENU_FACES, ...Object.values(GAME_FACES).flat()]).sort(), 'every face is the menu\'s or a game\'s')
  for (const { id } of GAMES) {
    assert.ok(MENU_FACES.includes(`menu:${id}`))
    for (const f of ['back', 'num:1', 'num:2', 'num:3']) assert.ok(GAME_FACES[id].includes(f), `${id}'s how-to and count show ${f}`)
  }
  for (const o of KNOCK_OBJECTS) for (const f of ['table', 'edge']) assert.ok(GAME_FACES.knock.includes(`${f}:${o}`))
  for (const p of PETS) for (const f of ['pet', 'oops']) assert.ok(GAME_FACES.mice.includes(`${f}:${p}`))
  for (const p of FUR_PAIRS) assert.ok(GAME_FACES.tail.includes(`tail-fur:${p}`))
  for (const way of ['up', 'down', 'left', 'right']) for (const f of ['tail-tip', 'tail-end']) assert.ok(GAME_FACES.tail.includes(`${f}:${way}`))
  for (const { id } of GAMES) {
    for (let seed = 1; seed <= 8; seed++) {
      const { g, faces, sounds } = randomGame(id, seed)
      for (const f of faces) assert.ok(GAME_FACES[id].includes(f), `${id} showed ${f}`)
      for (const s of sounds) assert.ok(SOUND_NAMES.includes(s), `${id} made ${s}`)
      assert.equal(g.over, true, 'every game ends')
      assert.ok(['lose', 'time'].includes(g.outcome), g.outcome)
    }
  }
  // through a whole visit and a free game of each: on the menu and the moments
  // the menu's faces, and from the how-to to the result the game's own
  const look = (a, t) => {
    const v = arcadeView(a, t)
    assert.equal(v.faces.length, KEY_COUNT)
    const own = a.game && ['ready', 'count', 'play', 'result'].includes(a.stage) && !(a.stage === 'ready' && t - a.stageAt < PICK_MS)
    for (const f of v.faces) assert.ok((own ? GAME_FACES[a.game.id] : MENU_FACES).includes(f), `${a.stage}: ${f}`)
    for (const e of a.events) assert.ok(SOUND_NAMES.includes(e), e)
  }
  runVisit(['Margaret', 'Tom', 'Ellie'], ['tail', 'pointer', 'mice', 'knock', 'yarn', 'mice'], { look, during: striker })
  for (const { id } of GAMES) {
    let f = newArcade({ mode: 'free', seed: 5, now: 0 })
    let t
    ;[f, t] = playGame(f, 0, id, (a, u) => { look(a, u); return a })
    look(f, t)
  }
})

test('G54 one click of a dial is one key, every click (Jon, 29 Oct 2026): a report of several clicks moves that many keys, one at a time, six at most, and an edge or a block stops the rest; only the outside two dials play, and only in the three games that use them', () => {
  assert.deepEqual([LEFT_DIAL, RIGHT_DIAL], [0, DIALS - 1])
  assert.equal(DIAL_MAX_KEYS, 6)
  const at = 100 // before anything is due in either game
  // The Lazy Pointer: the left dial along the row (clockwise is right), the right dial up (clockwise) and down
  const pointer = { ...newGame('pointer', { seed: 3, lengthMs: 120000, now: 0 }), dot: keyAt(2, 0), boo: keyAt(0, END) }
  for (const [n, col] of [[1, 1], [3, 3], [6, 6], [7, 6], [40, 6], [0.5, 1], [0.25, 1], [2.5, 3]]) {
    assert.equal(input(pointer, turn(LEFT_DIAL, n), at).dot, keyAt(2, col), `the left dial by ${n}: ${col} keys`)
  }
  assert.equal(input({ ...pointer, dot: keyAt(2, 5) }, turn(LEFT_DIAL, -2), at).dot, keyAt(2, 3), 'a report of -2 moves 2 back')
  assert.equal(input({ ...pointer, dot: keyAt(2, 7) }, turn(LEFT_DIAL, -40), at).dot, keyAt(2, 1), 'at most six back')
  assert.equal(input(pointer, turn(RIGHT_DIAL, 2), at).dot, keyAt(0, 0), 'clockwise is up')
  assert.equal(input({ ...pointer, dot: keyAt(0, 0) }, turn(RIGHT_DIAL, -3), at).dot, keyAt(3, 0), 'anticlockwise down')
  // the edge stops the rest of a turn, and so does Boo: the dot stops beside her
  assert.equal(input({ ...pointer, dot: keyAt(2, 6) }, turn(LEFT_DIAL, 5), at).dot, keyAt(2, END), 'the edge')
  assert.equal(input({ ...pointer, dot: keyAt(1, 0) }, turn(RIGHT_DIAL, 4), at).dot, keyAt(0, 0))
  assert.equal(input({ ...pointer, boo: keyAt(2, 4) }, turn(LEFT_DIAL, 6), at).dot, keyAt(2, 3), 'Boo')
  // a sparkle passed over on the way is grabbed, and the dot goes on
  const sparkled = input({ ...pointer, sparkles: [{ key: keyAt(2, 2), until: 5000 }] }, turn(LEFT_DIAL, 4), at)
  assert.equal(sparkled.dot, keyAt(2, 4))
  assert.equal(sparkled.sparkled, 1)
  assert.equal(sparkled.score, POINTER_POINTS)
  assert.deepEqual(sparkled.sparkles, [])
  assert.equal(gameFaces(sparkled, at)[keyAt(2, 2)], 'hit')
  // the dot passing beside her wakes her, though it goes on past
  const by = input({ ...pointer, boo: keyAt(1, 3) }, turn(LEFT_DIAL, 5), at)
  assert.equal(by.dot, keyAt(2, 5))
  assert.equal(by.awake, true)
  // one report is the same as its clicks one by one
  for (const n of [2, 3, 5, -2, -4]) {
    const from = { ...pointer, dot: keyAt(1, 4), boo: keyAt(3, 0) }
    const one = Array.from({ length: Math.abs(n) }).reduce(g => input(g, turn(LEFT_DIAL, Math.sign(n)), at), from)
    assert.equal(input(from, turn(LEFT_DIAL, n), at).dot, one.dot, `a report of ${n}`)
  }

  // Boo Chasing Her Tail: the same for Boo herself; the edge, a wall, a friend and the rest of her tail stop the rest, and a catch ends it
  const tail = { ...newGame('tail', { seed: 7, lengthMs: 120000, now: 0 }), boo: keyAt(0, 0), tail: [keyAt(3, 8), keyAt(3, 7), keyAt(3, 6)], blocks: [] }
  assert.equal(input(tail, turn(LEFT_DIAL, 3), at).boo, keyAt(0, 3), 'a report of 3 moves 3 keys')
  assert.equal(input({ ...tail, boo: keyAt(0, 5) }, turn(LEFT_DIAL, -2), at).boo, keyAt(0, 3), 'a report of -2 moves 2 back')
  assert.equal(input(tail, turn(LEFT_DIAL, 40), at).boo, keyAt(0, DIAL_MAX_KEYS), 'a report of 40 moves at most 6')
  const round = input(tail, turn(RIGHT_DIAL, -40), at)
  assert.equal(round.boo, keyAt(2, 0), 'six keys down: to the edge, in again at the top (30 Oct 2026) and on, with no pause (31 Oct)')
  assert.equal(round.frozenUntil, 0)
  assert.equal(input({ ...tail, blocks: [{ key: keyAt(0, 4), friend: null }] }, turn(LEFT_DIAL, 6), at).boo, keyAt(0, 3), 'a wall stops the rest')
  assert.equal(input({ ...tail, blocks: [{ key: keyAt(2, 0), friend: 'salem' }] }, turn(RIGHT_DIAL, -3), at).boo, keyAt(1, 0), 'a friend stops the rest')
  const fur = { ...tail, boo: keyAt(2, 4), tail: [keyAt(1, 7), keyAt(2, 7), keyAt(3, 7)] }
  assert.equal(input(fur, turn(LEFT_DIAL, 5), at).boo, keyAt(2, 6), 'the middle of her tail stops the rest')
  assert.deepEqual(input(fur, turn(LEFT_DIAL, 5), at).events, [], 'and nothing else happens')
  const caught = input({ ...fur, boo: keyAt(3, 2) }, turn(LEFT_DIAL, 6), at)
  assert.equal(caught.catches, 1, 'the tip, on the way: caught')
  assert.equal(caught.boo, keyAt(3, 7), 'and the catch ends the turn')
  // the four dials between them do nothing in any game, and in the other three games no dial does anything
  for (const { id } of GAMES) {
    const g0 = newGame(id, { seed: 5, lengthMs: 120000, now: 0 })
    const idle = id === 'tail' || id === 'pointer' ? [1, 2, 3, 4] : id === 'yarn' ? [1, 2, 3, 4, 5] : [0, 1, 2, 3, 4, 5] // Yarn Catch's basket is on the left dial since 31 Oct 2026
    for (const d of idle) for (const n of [1, -1, 5]) assert.deepEqual(input(g0, turn(d, n), at), step(g0, at), `${id}: dial ${d} by ${n}`)
    for (let d = 0; d < DIALS; d++) assert.deepEqual(input(g0, press(d), at), step(g0, at), `${id}: pressing dial ${d} does nothing`)
  }
  // a turn of nothing is no turn
  for (const n of [0, NaN, Infinity, -Infinity, 'x']) {
    assert.deepEqual(input(tail, turn(LEFT_DIAL, n), at), step(tail, at), `a turn of ${n}`)
    assert.deepEqual(input(pointer, turn(RIGHT_DIAL, n), at), step(pointer, at), `a turn of ${n}`)
  }
  // the arrow keys and a tap on the strip stay one key each
  assert.equal(input(tail, arrow('right'), at).boo, keyAt(0, 1))
  assert.equal(input(pointer, arrow('right'), at).dot, keyAt(2, 1))
  const yarn = newGame('yarn', { seed: 9, lengthMs: 120000, now: 0 })
  assert.equal(input(yarn, turn(LEFT_DIAL, 3), at).basket, yarn.basket + 3, 'the left dial, a column a click (31 Oct 2026)')
  assert.equal(input(yarn, turn(LEFT_DIAL, -40), at).basket, (yarn.basket - DIAL_MAX_KEYS + COLS) % COLS, 'six at most, round the edge')
  assert.equal(input(yarn, arrow('left'), at).basket, yarn.basket - 1)
  // the labels on the strip say so: only the outside two, and only where they play
  assert.deepEqual(Object.fromEntries(GAMES.map(g => [g.id, g.dials.map(l => l !== '')])), {
    tail: [true, false, false, false, false, true],
    pointer: [true, false, false, false, false, true],
    mice: Array(DIALS).fill(false),
    knock: Array(DIALS).fill(false),
    yarn: [true, false, false, false, false, false],
  })
})

test('G54 green for every success and red for every strike (Jon, 29 Oct 2026: "Like a check if you get the mouse"): the green tick on the key for HIT_MS, a red face for MISS_MS, then the board again', () => {
  assert.ok(HIT_MS >= 200 && HIT_MS <= 600, 'a moment')
  assert.ok(MISS_MS >= HIT_MS && MISS_MS <= 1000, 'a moment, a little longer')
  const T = 5000
  // each: what happened, the game just after, its time, the key, the face, how long, the face after, the sound
  const tail = { ...newGame('tail', { seed: 7, lengthMs: 120000, now: 0 }), at: T, nextAt: T + 600, boo: keyAt(1, 2), tail: [keyAt(1, 5), keyAt(1, 4), keyAt(1, 3)] }
  const pointer = { ...newGame('pointer', { seed: 3, lengthMs: 120000, now: 0 }), at: T, wakeAt: T + 3000, nextSparkleAt: T + 3000 }
  const mice = { ...newGame('mice', { seed: 11, lengthMs: 120000, now: 0 }), at: T, nextSpawnAt: T + 3000 }
  const knock = { ...newGame('knock', { seed: 5, lengthMs: 120000, now: 0 }), at: T, beats: 3, nextAt: T + 300 }
  const yarn = { ...newGame('yarn', { seed: 9, lengthMs: 120000, now: 0 }), at: T, nextSpawnAt: T + 3000 }
  const cases = [
    ['a tail tip caught', input(tail, turn(LEFT_DIAL, 1), T), T, keyAt(1, 3), 'hit', HIT_MS, 'tail-boo', 'point'],
    ['a sparkle grabbed', input({ ...pointer, sparkles: [{ key: keyAt(1, 2), until: T + 2000 }] }, turn(LEFT_DIAL, 1), T), T, keyAt(1, 2), 'hit', HIT_MS, 'dot', 'point'],
    ['the dot caught', step({ ...pointer, at: T - 1, awake: true, nextAt: T, boo: keyAt(1, 2) }, T), T, keyAt(1, 1), 'caught', MISS_MS, 'boo-nap', 'bite'],
    ['a mouse bonked', input({ ...mice, mice: [{ key: 7, gold: false, downAt: T + 800 }] }, key(7), T), T, 7, 'hit', HIT_MS, 'blank', 'point'],
    ['a gold mouse bonked', input({ ...mice, mice: [{ key: 7, gold: true, downAt: T + 800 }] }, key(7), T), T, 7, 'hit', HIT_MS, 'blank', 'gold'],
    ['a friend tapped', input({ ...mice, pets: [{ key: 8, pet: 'salem', downAt: T + 800 }] }, key(8), T), T, 8, 'oops:salem', MISS_MS, 'blank', 'miss'],
    ['a thing knocked off', input({ ...knock, things: [{ row: 0, col: END, obj: 'vase', goneAt: null }] }, key(TABLE_ENDS[0]), T), T, TABLE_ENDS[0], 'hit', HIT_MS, 'edge', 'knock'],
    ['an end pressed too soon', input(knock, key(TABLE_ENDS[1]), T), T, TABLE_ENDS[1], 'miss', MISS_MS, 'edge-left', 'miss'],
    ['a thing got away', step({ ...knock, things: [{ row: 2, col: END, obj: 'cake', goneAt: T + 100 }] }, T + 100), T + 100, TABLE_ENDS[2], 'miss', MISS_MS, 'edge', 'miss'],
    ['a ball of yarn caught', step({ ...yarn, balls: [{ col: 4, row: 2, gold: false, nextAt: T + 100, missAt: null }] }, T + 100), T + 100, keyAt(3, 4), 'basket-catch', HIT_MS, 'basket', 'point'],
    ['a ball of yarn missed', step({ ...yarn, balls: [{ col: 6, row: 3, gold: false, nextAt: T, missAt: T + 100 }] }, T + 100), T + 100, keyAt(3, 6), 'yarn-miss', MISS_MS, 'blank', 'miss'],
  ]
  for (const [what, g, at, k, face, ms, after, sound] of cases) {
    assert.deepEqual(g.events, [sound], `${what}: its sound`)
    assert.equal(gameFaces(g, at)[k], face, `${what}: ${face}`)
    assert.equal(gameFaces(g, at + ms - 1)[k], face, `${what}: still ${face}`)
    assert.equal(gameFaces(g, at + ms)[k], after, `${what}: then ${after}`)
    assert.ok(GAME_FACES[g.id].includes(face))
  }
  // the green tick is the face of every success in the four games that put it on a key
  for (const id of ['tail', 'pointer', 'mice', 'knock']) assert.ok(GAME_FACES[id].includes('hit'))
})

test('G54 three strikes and you\'re out, in the three games that count them (Jon, 29 Oct 2026: "like 3 strikes"): the rule before it starts, the strike\'s words on the touch strip for a moment in place of the points, three boxes on the strip and the screen, and the third ends the game with its points kept', () => {
  assert.equal(STRIKES_OUT, 5, 'five since 31 Oct 2026: every game with strikes has five')
  assert.equal(MICE_PETS_OUT, STRIKES_OUT)
  assert.ok(STRIKE_WORDS_MS >= 1000 && STRIKE_WORDS_MS <= 3000, 'long enough to read, and gone again')
  const view = (a, t) => arcadeView(a, t)
  const RULES = { tail: '', pointer: "Caught five times and you're out.", mice: "Tap five friends and you're out.", knock: "Five misses and you're out.", yarn: "Five misses and you're out." }
  // the rule on the ready strip and the count's, and on the screen; then three empty boxes in its place
  for (const { id, name, rule } of GAMES) {
    assert.equal(rule ?? '', RULES[id])
    const ready = aIn(newArcade({ mode: 'free', seed: 6, now: 0 }), key(menuKey(id)), 0)
    assert.equal(view(ready, PICK_MS).strip.right, RULES[id], `${id}: ready`)
    assert.equal(view(ready, PICK_MS).screen.game.rule, RULES[id] || null)
    assert.equal(view(aIn(ready, press(0), PICK_MS), PICK_MS + 1500).strip.right, id === 'yarn' ? '' : RULES[id], `${id}: the count`) // Yarn Catch's strip has only its basket (1 Nov 2026)
    const [a, t] = started(id)
    const v = view(a, t)
    assert.deepEqual(v.strip.marks, RULES[id] && id !== 'yarn' ? marksOf(id, 0) : null, `${id}: the boxes`)
    assert.deepEqual(v.screen.marks, RULES[id] ? marksOf(id, 0) : null, `${id}: the boxes on the screen`)
    assert.equal(v.strip.right, '', 'the rule goes as the game starts')
    assert.equal(v.strip.left, id === 'tail' ? name : '', 'the boxes on the left, in the name\'s place')
  }
  const visit = aIn(newArcade({ mode: 'visit', players: ['Jessa'], seed: 6, now: 0 }), key(menuKey('mice')), 0)
  assert.equal(view(visit, PICK_MS).strip.right, "Tap five friends and you're out.", 'on a visit too')

  // the words, then the points again
  // `pressed`: the strike was the press at t; otherwise a timer that came due in the tick that ended at t
  const struck = (a, t, n, words, pressed = true) => {
    const at = a.game.said.until - STRIKE_WORDS_MS // the moment of the strike
    if (pressed) assert.equal(at, t, 'the words from the press')
    else assert.ok(at <= t && at > t - TICK, 'the words from the moment it happened, in the last tick')
    const v = view(a, t)
    assert.equal(v.strip.centre, `Strike ${n}! ${words}`)
    assert.equal(v.strip.score, null, 'in place of the points')
    assert.deepEqual(v.strip.marks, marksOf(a.game.id, n))
    assert.deepEqual(v.screen.marks, marksOf(a.game.id, n))
    assert.equal(v.screen.said, `Strike ${n}! ${words}`)
    assert.equal(view(a, at + STRIKE_WORDS_MS - 1).strip.centre, `Strike ${n}! ${words}`)
    const later = aStep(a, at + STRIKE_WORDS_MS)
    const w = view(later, at + STRIKE_WORDS_MS)
    if (later.stage === 'play' && !/^A sparkle faded\.|^Strike \d/.test(w.strip.centre)) { // unless a sparkle faded or another strike came meanwhile
      assert.equal(w.strip.centre, '', 'then the points again')
      assert.equal(w.strip.score, later.game.score)
      assert.equal(w.screen.said, null)
    }
  }

  // Whack-a-Mouse: Sir Irwin or a friend tapped, named on the strip
  let [a, t] = started('mice')
  let who = null
  const tapPet = () => {
    while (!a.game.pets.length) { t += TICK; a = aStep(a, t) }
    who = a.game.pets[0].pet
    a = aIn(a, key(a.game.pets[0].key), t)
  }
  tapPet()
  struck(a, t, 1, STRUCK[who])
  // a mouse tapped while the words show: its point counts, and the words stay their time
  const g = a.game
  const words1 = `Strike 1! ${STRUCK[who]}`
  const empty = ALL_KEYS.find(k => ![...g.mice, ...g.pets, ...g.flashes, ...g.rests].some(x => x.key === k))
  const bonked = aIn({ ...a, game: { ...g, mice: [...g.mice, { key: empty, gold: false, downAt: t + 1000 }] } }, key(empty), t + 100)
  assert.equal(bonked.game.score, g.score + MICE_POINTS)
  assert.equal(view(bonked, t + 100).strip.centre, words1)
  assert.equal(view(bonked, t + STRIKE_WORDS_MS - 1).strip.centre, words1)
  assert.equal(view(aStep(bonked, t + STRIKE_WORDS_MS), t + STRIKE_WORDS_MS).strip.score, aStep(bonked, t + STRIKE_WORDS_MS).game.score)
  for (let n = 2; n < STRIKES_OUT; n++) { tapPet(); struck(a, t, n, STRUCK[who]) }
  tapPet() // the fifth (31 Oct 2026)
  assert.equal(a.stage, 'result')
  assert.deepEqual(view(a, t).strip, { left: 'Whack-a-Mouse', centre: 'You tapped five friends.', right: pts(a.game.score), score: null, marks: null, clock: null, zones: null, basket: null, dials: NO_DIALS })
  assert.deepEqual(view(a, t).screen.marks, marksOf('mice', STRIKES_OUT), 'the screen shows the five on the result')
  assert.equal(view(a, t).screen.result.outcome, 'lose')

  // The Lazy Pointer, left alone: Boo catches the dot, each catch's words; five catches end it (31 Oct 2026), or the clock does first
  ;[a, t] = started('pointer')
  let n = 0
  while (a.stage === 'play') {
    const before = a.game.strikes
    t += TICK
    a = aStep(a, t)
    if (a.stage === 'play' && a.game.strikes > before) { n += 1; struck(a, t, n, 'Boo caught it.', false) }
  }
  assert.ok(n >= 2)
  if (a.game.outcome === 'lose') { assert.equal(n, STRIKES_OUT - 1); assert.equal(view(a, t).strip.centre, 'Boo caught the dot five times.') }
  else assert.equal(view(a, t).strip.centre, "Time's up.")

  // Knock It Off the Table: an end pressed too soon, then a thing left to get away, then out
  ;[a, t] = started('knock')
  t += 10
  a = aIn(a, key(TABLE_ENDS[2]), t)
  struck(a, t, 1, 'Too soon.')
  while (a.game.strikes < 2) { t += TICK; a = aStep(a, t) }
  struck(a, t, 2, 'It got away.', false)
  // the rest: ends with nothing coming (never the one whose thing just got away: a press there a moment late is forgiven); the fifth ends it (31 Oct 2026)
  const emptyEnd = () => {
    const away = a.game.gotAway.map(x => TABLE_ENDS[x.row])
    return TABLE_ENDS.find(k => !away.includes(k) && !a.game.things.some(x => TABLE_ENDS[x.row] === k && Math.abs(x.col - tableEndCol(x.row)) <= 1))
  }
  assert.equal(a.game.gotAway.length, 1)
  for (let n = 3; n < STRIKES_OUT; n++) { a = aIn(a, key(emptyEnd()), (t += 10)); struck(a, t, n, 'Too soon.') }
  a = aIn(a, key(emptyEnd()), t + 10)
  assert.equal(a.stage, 'result')
  assert.equal(view(a, t + 10).strip.centre, 'Five misses.')
  assert.equal(a.game.score, 0)

  // the clock runs out while a strike's words show: the result's strip says how it ended, not the strike
  ;[a, t] = started('mice')
  const ends = a.game.endsAt
  a = aStep(a, ends - 1000)
  const pet = ALL_KEYS.find(k => ![...a.game.mice, ...a.game.pets, ...a.game.flashes, ...a.game.rests].some(x => x.key === k))
  a = aIn({ ...a, game: { ...a.game, pets: [...a.game.pets, { key: pet, pet: 'irwin', downAt: ends - 500 }] } }, key(pet), ends - 1000)
  assert.equal(view(a, ends - 1000).strip.centre, `Strike ${a.game.petTaps}! That's the birthday boy.`)
  const out = aStep(a, ends + 10)
  assert.equal(out.stage, 'result')
  assert.ok(ends + 10 < ends - 1000 + STRIKE_WORDS_MS, 'its words not yet gone')
  assert.equal(view(out, ends + 10).strip.centre, "Time's up.")
  assert.equal(view(out, ends + 10).screen.said, null)

  // the one game with no strikes (Yarn Catch counts five misses since 30 Oct 2026) has no boxes, on the strip or the screen
  for (const id of ['tail']) {
    const [b, u] = started(id)
    assert.equal(view(b, u).strip.marks, null)
    assert.equal(view(b, u).screen.marks, null)
  }
})

// Boo Chasing Her Tail, the tests' own helpers. A tail is three to five keys, each beside the next
// and none twice, its end first: in a row or round corners.
const tailShaped = tail => tail.length >= TAIL_LENGTH && tail.length <= TAIL_LENGTH_MAX && new Set(tail).size === tail.length && tail.every((k, i) => i === 0 || apart(tail[i - 1], k) === 1)
const blockKeys = g => g.blocks.map(b => b.key)
const itemKeys = g => [...g.hazards.map(h => h.key), ...(g.treat ? [g.treat.key] : [])] // the cucumbers and the fish out now
const tipOf = g => g.tail[g.tail.length - 1]
// How far Boo is from a key the short way round: she wraps at the edges (30 Oct 2026), so her reach does too.
const reach = (k, boo) => { const dr = Math.abs(rowOf(k) - rowOf(boo)), dc = Math.abs(colOf(k) - colOf(boo)); return Math.min(dr, ROWS - dr) + Math.min(dc, COLS - dc) }
const nearestReach = (keys, boo) => Math.min(...keys.map(k => reach(k, boo)))
// Every way a whole tail can lie, by the rule: three free keys (not Boo, not a wall or a friend)
// in a row or round a corner, with a free key straight on from its end.
function tailPlacesOf(g) {
  const free = k => k != null && k !== g.boo && !blockKeys(g).includes(k) && !g.hazards.some(h => h.key === k)
  const places = []
  for (const mid of ALL_KEYS.filter(free)) {
    const by = besideOf(mid).filter(free)
    for (const end of by) for (const tip of by) if (end !== tip && free(aheadOf(mid, end))) places.push([end, mid, tip])
  }
  return places
}
// With walls and friends on `keys`, by the rule: every other key has two ways out (the board's
// edge counts as a wall), and all of them are joined together.
function roomyOf(keys) {
  const shut = new Set(keys)
  const open = ALL_KEYS.filter(k => !shut.has(k))
  if (open.some(k => besideOf(k).filter(n => !shut.has(n)).length < 2)) return false
  const reached = new Set([open[0]])
  for (const k of reached) for (const n of besideOf(k)) if (!shut.has(n)) reached.add(n)
  return reached.size === open.length
}
// A player who chases the white tip: one key along a shortest way to it, round the walls, her
// friends and the rest of her tail (an arrow key; none when there is no way). Boo and the tip are
// never on one key; were they, the walk back from the tip to her would never end and would hang
// the whole run, so it fails here instead.
function chaseMove(g) {
  const tip = tipOf(g)
  assert.notEqual(tip, g.boo, 'Boo and the tip of her tail are never on one key')
  const shut = new Set([...g.tail.slice(0, -1), ...blockKeys(g), ...g.hazards.map(h => h.key)])
  const from = new Map([[g.boo, null]])
  for (const k of from.keys()) for (const n of besideOf(k)) if (!shut.has(n) && !from.has(n)) from.set(n, k)
  if (!from.has(tip)) return null
  let k = tip
  while (from.get(k) !== g.boo) k = from.get(k)
  return arrow(colOf(k) > colOf(g.boo) ? 'right' : colOf(k) < colOf(g.boo) ? 'left' : rowOf(k) > rowOf(g.boo) ? 'down' : 'up')
}
// A move one key towards `key`, round the walls, her friends, the cucumbers and the rest of her tail (or none).
function toKey(g, key) {
  if (key === g.boo) return null
  const shut = new Set([...g.tail.slice(0, -1), ...blockKeys(g), ...g.hazards.filter(h => h.key !== key).map(h => h.key)])
  const from = new Map([[g.boo, null]])
  for (const k of from.keys()) for (const n of besideOf(k)) if (!shut.has(n) && !from.has(n)) from.set(n, k)
  if (!from.has(key)) return null
  let k = key
  while (from.get(k) !== g.boo) k = from.get(k)
  return arrow(colOf(k) > colOf(g.boo) ? 'right' : colOf(k) < colOf(g.boo) ? 'left' : rowOf(k) > rowOf(g.boo) ? 'down' : 'up')
}
// A game's strike boxes as the strip would show them (null for a game with no strikes).
const strikesOfView = g => (g.id === 'mice' ? { of: STRIKES_OUT, used: g.petTaps } : g.id === 'pointer' || g.id === 'knock' ? { of: STRIKES_OUT, used: g.strikes } : null)
// A whole Boo Chasing Her Tail at the page's ticks, `play(g, t)` asked for a move (or none)
// every `every` ms; `look(before, after, t, how)` sees every change, 'input' or 'step'.
function playTail(seed, play, { every = 64, look = () => {}, lengthMs = 120000 } = {}) {
  let g = newGame('tail', { seed, lengthMs, now: 0 })
  let next = 0
  for (let t = TICK; t <= lengthMs + TICK && !g.over; t += TICK) {
    for (; next <= t && !g.over; next += every) {
      const ev = play(g, next)
      if (ev) { const h = inputGame(g, ev, next); look(g, h, next, 'input'); g = h }
    }
    const h = stepGame(g, t)
    look(g, h, t, 'step')
    g = h
  }
  return g
}
// Jon's exploit (29 Oct 2026: "I can just hold an arrow button and it circles and win"): an arrow
// key held down, repeating every 50 ms, through a whole game.
const held = (dir, seed) => playTail(seed, () => arrow(dir), { every: 50 })

test('G54 Boo Chasing Her Tail (Jon, 29 Oct 2026: "Make it run over the entire board", "make the paws boos face"): the whole board her rug, Boo herself on the left, her tail of three keys in the right half heading away from her, every key of it four or more from her; the left dial moves her left and right, the right dial up and down (clockwise is up), an arrow one key', () => {
  const g0 = newGame('tail', { seed: 7, lengthMs: 120000, now: 0 })
  assert.equal(g0.boo, keyAt(2, 1))
  assert.deepEqual(g0.blocks, [])
  assert.equal(g0.catches, 0)
  assert.ok(tailShaped(g0.tail))
  // the board: her rug on every key but Boo's and her tail's three
  const f0 = gameFaces(g0, 0)
  assert.equal(f0[g0.boo], 'tail-boo')
  assert.equal(f0.filter(f => f === 'rug').length, KEY_COUNT - 4)
  for (const f of ['ring', 'tail-paw', 'boo']) assert.ok(!GAME_FACES.tail.includes(f), `no ${f} now`)
  for (const f of ['rug', 'tail-boo', 'wall']) assert.ok(GAME_FACES.tail.includes(f))
  // its pieces point along it: the end to its middle, the middle both ways, the tip away from the middle
  const way = (a, b) => ({ [-COLS]: 'up', [COLS]: 'down', [-1]: 'left', [1]: 'right' })[b - a]
  for (let seed = 1; seed <= 60; seed++) {
    const g = newGame('tail', { seed, lengthMs: 120000, now: 0 })
    const [end, mid, tip] = g.tail
    const f = gameFaces(g, 0)
    assert.equal(f[end], `tail-end:${way(end, mid)}`)
    assert.equal(f[mid], `tail-fur:${[way(mid, tip), way(mid, end)].sort().join('-')}`)
    assert.equal(f[tip], `tail-tip:${way(mid, tip)}`)
    for (const x of [f[end], f[mid], f[tip]]) assert.ok(GAME_FACES.tail.includes(x), x)
  }
  // where it starts, seed by seed: whole, in the right half, four or more from her, heading away, with a free key ahead
  const starts = new Set()
  for (let seed = 1; seed <= 100; seed++) {
    const g = newGame('tail', { seed, lengthMs: 120000, now: 0 })
    assert.ok(tailShaped(g.tail), `seed ${seed}`)
    for (const k of g.tail) {
      assert.ok(colOf(k) >= 5, `seed ${seed}: in the right half`)
      assert.ok(apart(k, g.boo) >= TAIL_AWAY_KEYS, `seed ${seed}: four or more from her`)
    }
    const ahead = aheadOf(g.tail[1], g.tail[0])
    assert.ok(ahead != null && !g.tail.includes(ahead), `seed ${seed}: a free key ahead of its end`)
    assert.ok(apart(ahead, g.boo) > apart(g.tail[0], g.boo), `seed ${seed}: heading away from her`)
    starts.add(g.tail.join())
  }
  assert.ok(starts.size > 10, `${starts.size} starts: one seed to the next, somewhere of its own`)

  // one key a click: the left dial and the left and right arrows along her row, the right dial and the up and down arrows up and down
  const at = 100 // before anything is due
  for (const [ev, to] of [[turn(LEFT_DIAL, 1), keyAt(2, 2)], [turn(LEFT_DIAL, -1), keyAt(2, 0)], [turn(RIGHT_DIAL, 1), keyAt(1, 1)], [turn(RIGHT_DIAL, -1), keyAt(3, 1)],
    [arrow('right'), keyAt(2, 2)], [arrow('left'), keyAt(2, 0)], [arrow('up'), keyAt(1, 1)], [arrow('down'), keyAt(3, 1)]]) {
    const h = input(g0, ev, at)
    assert.equal(h.boo, to, JSON.stringify(ev))
    assert.deepEqual(h.events, [], 'a move makes no sound')
    assert.equal(gameFaces(h, at)[to], 'tail-boo')
    assert.equal(gameFaces(h, at)[keyAt(2, 1)], 'rug', 'and she is gone from where she was')
  }
  assert.equal([1, 2, 3].reduce(g => input(g, arrow('right'), at), g0).boo, keyAt(2, 4), 'key by key')
  // the inside dials, a press, a key, the strip: nothing
  for (const ev of [turn(1, 1), turn(2, -1), turn(3, 5), turn(4, -2), press(0), press(5), key(keyAt(2, 2)), key(g0.tail[2]), tap(100), tap(1100), swipe(100, 1100)]) {
    assert.deepEqual(input(g0, ev, at), step(g0, at), JSON.stringify(ev))
  }
  // the words: the dials' labels as The Lazy Pointer's, and Jon's how to play
  const info = GAMES.find(g => g.id === 'tail')
  assert.deepEqual(info.dials, GAMES.find(g => g.id === 'pointer').dials)
  assert.equal(info.how, 'The left dial moves Boo left and right, the right dial up and down. Catch the white tip of her tail. The rest of her tail, the walls and her friends block her way. Eat the fish; mind the cucumbers.')
  assert.equal(info.boo, 'That tail mocks me, darling.')
  assert.equal(info.counts, 'Tail tips caught')
  assert.equal(info.rule, undefined, 'no strikes')
})

test('G54 Boo Chasing Her Tail (Jon, 29 Oct 2026: "dont let players hit it from the front. It blocks them."): the board\'s edge, a wall, a friend and the tail\'s end and middle stop Boo where she is, and nothing else happens; its white tip is caught from behind or from the side: 2 points, the point sound, Boo on its key under the green tick, and the tail whips away, every key of it four or more from her, its next step a whole step later', () => {
  const T = 5000
  const board = (boo, tail, blocks = []) => ({ ...newGame('tail', { seed: 7, lengthMs: 120000, now: 0 }), at: T - 100, nextAt: T + 400, boo, tail, blocks })
  // a tail heading right along the second row, and one with its tip round the corner, below its middle
  const straight = [keyAt(1, 6), keyAt(1, 5), keyAt(1, 4)]
  const corner = [keyAt(1, 6), keyAt(1, 5), keyAt(2, 5)]
  const out = [{ key: keyAt(3, 3), friend: null }, { key: keyAt(0, 2), friend: 'zimmy' }]
  // the edges: off one side, in at the other (Jon, 30 Oct 2026: Pac-Man style), with no pause (31 Oct)
  for (const [boo, ev, to] of [[keyAt(0, 0), arrow('left'), keyAt(0, END)], [keyAt(0, 0), arrow('up'), keyAt(3, 0)], [keyAt(3, END), turn(LEFT_DIAL, 1), keyAt(3, 0)], [keyAt(3, END), turn(RIGHT_DIAL, -1), keyAt(0, END)]]) {
    const g = board(boo, straight, out)
    const h = input(g, ev, T)
    assert.equal(h.boo, to, `${JSON.stringify(ev)} from ${boo}: in at the other side`)
    assert.equal(h.frozenUntil, 0, 'no pause (31 Oct 2026)')
    assert.deepEqual(without(h, 'boo'), without(step(g, T), 'boo'), 'and nothing else happens')
    assert.notEqual(input(h, ev, T + 1).boo, to, 'and straight on')
  }
  for (const [boo, tail, ev, why] of [
    [keyAt(1, 7), straight, arrow('left'), 'its end, head on'], [keyAt(0, 6), straight, arrow('down'), 'its end, from above'],
    [keyAt(2, 6), straight, turn(RIGHT_DIAL, 1), 'its end, from below'], [keyAt(0, 5), straight, turn(RIGHT_DIAL, -1), 'its middle'],
    [keyAt(2, 5), straight, arrow('up'), 'its middle, from below'], [keyAt(1, 4), corner, arrow('right'), 'its middle, round the corner'],
    [keyAt(1, 7), corner, turn(LEFT_DIAL, -1), 'its end, round the corner'],
    [keyAt(3, 2), straight, arrow('right'), 'a wall'], [keyAt(1, 2), straight, arrow('up'), 'a friend'], [keyAt(0, 3), straight, turn(LEFT_DIAL, -1), 'a friend'],
  ]) {
    const g = board(boo, tail, out)
    const h = input(g, ev, T)
    assert.deepEqual(h, step(g, T), `${why}: she stays where she is, and nothing else happens`)
    assert.equal(h.boo, boo)
    assert.equal(gameFaces(h, T)[boo], 'tail-boo')
  }
  // the white tip, from behind or from the side
  for (const [boo, tail, ev, how] of [
    [keyAt(1, 3), straight, arrow('right'), 'from behind'], [keyAt(1, 3), straight, turn(LEFT_DIAL, 1), 'from behind, by the dial'],
    [keyAt(0, 4), straight, turn(RIGHT_DIAL, -1), 'from above'], [keyAt(2, 4), straight, arrow('up'), 'from below'],
    [keyAt(3, 5), corner, turn(RIGHT_DIAL, 1), 'from behind, round the corner'], [keyAt(2, 4), corner, arrow('right'), 'from the side'],
    [keyAt(2, 6), corner, turn(LEFT_DIAL, -1), 'from the other side'],
  ]) {
    const g = board(boo, tail, out)
    const c = input(g, ev, T)
    const tip = tail.at(-1)
    assert.equal(c.boo, tip, `${how}: Boo on the tip's key`)
    assert.equal(c.catches, 1)
    assert.equal(c.score, TAIL_POINTS)
    assert.deepEqual(c.events, ['point'])
    assert.equal(gameFaces(c, T)[tip], 'hit', 'the green tick on her key')
    assert.equal(gameFaces(c, T + HIT_MS - 1)[tip], 'hit')
    assert.equal(gameFaces(c, T + HIT_MS)[tip], 'tail-boo')
    // the tail whips away: whole, somewhere else, every key four or more from her, a free key ahead of its end
    assert.ok(tailShaped(c.tail) && c.tail.length === tail.length)
    for (const k of c.tail) {
      assert.ok(reach(k, c.boo) >= TAIL_AWAY_KEYS, `${how}: ${k} far from her, the short way round`)
      assert.ok(!blockKeys(c).includes(k))
    }
    const ahead = aheadOf(c.tail[1], c.tail[0])
    assert.ok(ahead != null && ahead !== c.boo && !blockKeys(c).includes(ahead), 'a free key ahead of its end')
    // its next step a whole step later
    assert.ok(near(c.nextAt - T, over2min(TAIL_STEP_MS, TAIL_STEP_END_MS, T)))
    assert.deepEqual(step(c, c.nextAt - 1).tail, c.tail, 'and not before')
    assert.notDeepEqual(step(c, c.nextAt).tail, c.tail)
    assert.deepEqual(json(c), c, 'still plain JSON')
  }
  // where it comes back is picked by chance
  const backs = new Set(Array.from({ length: 30 }, (_, i) => input({ ...board(keyAt(1, 3), straight), rs: i + 1 }, arrow('right'), T).tail.join()))
  assert.ok(backs.size > 10, `${backs.size} places`)
  // no strikes: it ends on its time, a good end, with the win sound
  const c = input(board(keyAt(1, 3), straight), arrow('right'), T)
  const end = step(c, 120000)
  assert.equal(end.outcome, 'time')
  assert.equal(end.endedAt, 120000)
  assert.equal(end.score, TAIL_POINTS)
  assert.deepEqual(end.events, ['win'])
  const left = step(newGame('tail', { seed: 7, lengthMs: 120000, now: 0 }), 120000)
  assert.equal(left.outcome, 'time')
  assert.equal(left.score, 0)
})

test('G54 Boo Chasing Her Tail: her tail runs about the whole board by itself, one key a step, its end first and its middle and tip after it, never onto Boo, a wall, a friend or itself; mostly straight on, turning about one step in four; with Boo close it runs to the key furthest from her, never into a dead end when it has another way; with nowhere to go it waits', () => {
  let could = 0, turned = 0, fled = 0, steps = 0, grew = 0, slipped = 0
  const visited = new Set()
  const moves = [arrow('left'), arrow('right'), arrow('up'), arrow('down'), turn(LEFT_DIAL, 2), turn(LEFT_DIAL, -3), turn(RIGHT_DIAL, 1), turn(RIGHT_DIAL, -2)]
  for (let seed = 1; seed <= 30; seed++) {
    let rs = seed * 7919
    const roll = () => { const r = nextRand(rs); rs = r.rs; return r.v }
    const look = (prev, g) => {
      // every moment: the tail whole, nothing under it, Boo on a key of her own
      assert.ok(tailShaped(g.tail))
      for (const k of g.tail) {
        assert.ok(!blockKeys(g).includes(k), 'never on a wall or a friend')
        assert.ok(!g.hazards.some(h => h.key === k), 'never on a cucumber')
        assert.notEqual(k, g.boo, 'never on Boo')
        visited.add(k)
      }
      assert.ok(!blockKeys(g).includes(g.boo))
      assert.equal(g.catches - prev.catches <= 1, true)
      if (g.catches !== prev.catches || g.tail.join() === prev.tail.join()) return
      // a step: its end one key on, onto a free key, and the rest after it (or, growing, staying put)
      steps += 1
      const [end, mid] = prev.tail
      const to = g.tail[0]
      // boxed in by itself, the walls and the cucumbers, with Boo not beside its end: it slipped away whole (30 Oct 2026)
      const shutIn = k => k === g.boo || prev.tail.includes(k) || blockKeys(g).includes(k) || g.hazards.some(h => h.key === k)
      if (besideOf(end).every(shutIn) && !besideOf(end).includes(g.boo)) { slipped += 1; assert.ok(tailShaped(g.tail), 'slipped away whole'); return }
      if (g.tail.length > prev.tail.length) { grew += 1; assert.deepEqual(g.tail.slice(1), prev.tail, 'a key longer: the rest stays put') }
      else assert.deepEqual(g.tail.slice(1), prev.tail.slice(0, -1), 'the rest follows its end')
      assert.equal(apart(to, end), 1, 'one key a step, never off the board')
      assert.ok(!prev.tail.includes(to) && to !== prev.boo && to !== g.boo && !blockKeys(g).includes(to) && !g.hazards.some(h => h.key === to), 'onto a free key (over a fish is fine)')
      if (g.blocks.length !== prev.blocks.length || g.boo !== prev.boo || g.hazards.length !== prev.hazards.length) return // a wall, a friend, a cucumber or Boo moved in the same moment
      // the ways it had, by the rules
      const body = prev.tail.slice(0, -1)
      const shutTo = k => k === g.boo || blockKeys(g).includes(k) || g.hazards.some(h => h.key === k)
      const free = besideOf(end).filter(k => !prev.tail.includes(k) && !shutTo(k))
      const onward = k => besideOf(k).filter(n => n !== end && !body.includes(n) && !shutTo(n)).length
      const open = free.filter(k => onward(k) > 0)
      if (open.length) assert.ok(onward(to) > 0, 'never into a dead end when it has another way')
      const ways = open.length ? open : free
      const ahead = aheadOf(mid, end)
      if (nearestReach(prev.tail, g.boo) <= TAIL_FLEE_KEYS) {
        fled += 1
        assert.equal(reach(to, g.boo), Math.max(...ways.map(k => reach(k, g.boo))), 'Boo close: to the key furthest from her, the short way round')
      } else if (ways.includes(ahead) && ways.some(k => k !== ahead)) {
        could += 1
        if (to !== ahead) turned += 1
      }
    }
    const g = playTail(seed, () => (roll() < 0.3 ? moves[Math.floor(roll() * moves.length)] : null), { every: 100, look })
    assert.equal(g.outcome, 'time')
  }
  assert.equal(visited.size, KEY_COUNT, 'it runs over the whole board')
  assert.ok(steps > 5000 && fled > 200 && could > 1000, `${steps} steps, ${fled} running from her, ${could} free to turn`)
  assert.ok(slipped < steps / 50, `${slipped} slips away, boxed in: rare`)
  assert.equal(grew, 0, 'it never grows (31 Oct 2026)')
  assert.equal(TAIL_TURN_ONE_IN, 4)
  assert.ok(Math.abs(turned / could - 1 / TAIL_TURN_ONE_IN) < 0.04, `turned ${turned} of ${could} times it could`)

  const T = 5000
  const board = (boo, tail, blocks = []) => ({ ...newGame('tail', { seed: 7, lengthMs: 120000, now: 0 }), at: T - 1, nextAt: T, boo, tail, blocks })
  // Boo close and in front: it turns away from her, to the more open side
  assert.equal(TAIL_FLEE_KEYS, 3)
  assert.deepEqual(step(board(keyAt(1, 6), [keyAt(1, 4), keyAt(1, 3), keyAt(1, 2)]), T).tail, [keyAt(2, 4), keyAt(1, 4), keyAt(1, 3)])
  // Boo close behind it, on its row: off her row, up or down (30 Oct 2026: she sweeps a row when she wraps), away from her
  assert.ok([keyAt(1, 4), keyAt(3, 4)].includes(step(board(keyAt(2, 1), [keyAt(2, 4), keyAt(2, 3), keyAt(2, 2)]), T).tail[0]))
  // Boo close behind it, off its row: straight on, away from her
  assert.equal(step(board(keyAt(3, 1), [keyAt(2, 4), keyAt(2, 3), keyAt(2, 2)]), T).tail[0], keyAt(2, 5))
  // not into the corner, where Boo would shut it in: the other way
  assert.deepEqual(step(board(keyAt(1, 0), [keyAt(0, 1), keyAt(0, 2), keyAt(0, 3)]), T).tail[0], keyAt(1, 1))
  // nowhere to go: it waits a step, then goes on once she moves
  const stuck = board(keyAt(0, 1), [keyAt(0, 0), keyAt(1, 0), keyAt(2, 0)])
  const waited = step(stuck, T)
  assert.deepEqual(waited.tail, stuck.tail, 'Boo in its way: it waits')
  assert.ok(near(waited.nextAt - T, over2min(TAIL_STEP_MS, TAIL_STEP_END_MS, T)), 'and tries again a step later')
  assert.deepEqual(waited.events, [])
  const went = step(input(waited, arrow('right'), T + 10), waited.nextAt)
  assert.deepEqual(went.tail, [keyAt(0, 1), keyAt(0, 0), keyAt(1, 0)], 'she moves away: it goes on')
  // boxed in without her (coiled into the corner against a wall, 30 Oct 2026): it slips away whole, somewhere else, no points
  const coiled = board(keyAt(2, 6), [keyAt(0, 1), keyAt(1, 1), keyAt(1, 0), keyAt(0, 0)], [{ key: keyAt(0, 2), friend: null }])
  const slip = step(coiled, T)
  assert.ok(tailShaped(slip.tail), 'whole')
  assert.notDeepEqual(slip.tail, coiled.tail, 'somewhere else')
  assert.equal(slip.score, 0)
  assert.deepEqual(slip.events, [])
  assert.ok(nearestReach(slip.tail, slip.boo) >= 2)
  // a wall or a friend in front: round it
  const walled = step(board(keyAt(3, 0), [keyAt(0, 4), keyAt(0, 3), keyAt(0, 2)], [{ key: keyAt(0, 5), friend: null }]), T)
  assert.equal(walled.tail[0], keyAt(1, 4))
})

test('G54 Boo Chasing Her Tail: it quickens along the game (Jon, 29 Oct 2026: "As time goes on it goes fast"; 30 Oct: "The tail speeds up as the game goes on"), a step every 0.65 seconds at first and every 0.22 seconds by the end', () => {
  assert.deepEqual([TAIL_STEP_MS, TAIL_STEP_END_MS], [650, 220])
  for (const seed of [1, 2, 3]) {
    const gaps = []
    playTail(seed, () => null, { look: (prev, g) => { if (g.nextAt !== prev.nextAt) gaps.push([prev.nextAt, g.nextAt - prev.nextAt]) } })
    assert.ok(gaps.length > 200, `${gaps.length} steps`)
    for (const [at, ms] of gaps) assert.ok(near(ms, over2min(TAIL_STEP_MS, TAIL_STEP_END_MS, at)), `a step of ${ms} at ${at}`)
    assert.ok(gaps[0][1] > TAIL_STEP_MS - 5 && gaps.at(-1)[1] < TAIL_STEP_END_MS + 5)
  }
  // a game of another length quickens over its own time
  const short = newGame('tail', { seed: 4, lengthMs: 80000, now: 1000 })
  const s = step({ ...short, nextAt: 41000, at: 40999, nextBlockAt: null }, 41000)
  assert.ok(near(s.nextAt - 41000, TAIL_STEP_MS + (TAIL_STEP_END_MS - TAIL_STEP_MS) * (40000 / 80000)))
})

test('G54 Boo Chasing Her Tail (Jon, 29 Oct 2026: "add obsticals like maybe walls and other pets"): from fifteen seconds in, one more every fifteen seconds, six at most, a wall and one of her friends in turn, a wall first, never Boo herself and each friend once before any comes twice; each on a free key two or more from Boo and every key of her tail; with each, every other key still has two ways out and all of them stay joined; none comes when no key will do, and it tries again at the next; they stay put to the end', () => {
  assert.deepEqual([TAIL_BLOCKS_FROM_MS, TAIL_BLOCKS_EVERY_MS, TAIL_BLOCKS_MAX], [15000, 15000, 6])
  assert.deepEqual(TAIL_FRIENDS, ['granola', 'irwin', 'salem', 'zimmy'], 'her four friends, never Boo')
  for (const f of TAIL_FRIENDS) assert.ok(GAME_FACES.tail.includes(`pet:${f}`), `Whack-a-Mouse's face for ${f}`)
  assert.ok(!GAME_FACES.tail.includes('pet:boo'))
  // whole games, the tail chased: they come on time, a wall and a friend in turn, and stay put
  const met = new Set()
  for (let seed = 1; seed <= 30; seed++) {
    const came = []
    const look = (prev, g) => {
      assert.deepEqual(g.blocks.slice(0, prev.blocks.length), prev.blocks, 'they stay put')
      for (const b of g.blocks.slice(prev.blocks.length)) {
        came.push({ ...b, at: prev.nextBlockAt })
        assert.ok(prev.nextBlockAt <= g.at, 'at its time')
        assert.ok(roomyOf(blockKeys(g)), 'every other key still has two ways out, and all are joined')
      }
    }
    const g = playTail(seed, chaseMove, { every: 150, look })
    assert.deepEqual(came.map(b => b.at), [15000, 30000, 45000, 60000, 75000, 90000], `seed ${seed}: from fifteen seconds in, one every fifteen, six at most`)
    assert.deepEqual(came.map(b => b.friend === null), [true, false, true, false, true, false], 'a wall, then a friend, in turn')
    const friends = came.filter(b => b.friend).map(b => b.friend)
    assert.equal(new Set(friends).size, friends.length, 'each once before any comes twice')
    for (const f of friends) { assert.ok(TAIL_FRIENDS.includes(f), f); met.add(f) }
    for (const b of g.blocks) assert.equal(gameFaces(g, g.at)[b.key], b.friend ? `pet:${b.friend}` : 'wall')
    assert.equal(g.nextBlockAt, null, 'and no more')
    assert.ok(g.catches > 20, `seed ${seed}: ${g.catches} caught round them`)
  }
  assert.deepEqual([...met].sort(), [...TAIL_FRIENDS].sort(), 'all four come out, game by game')

  // where one comes: a free key two or more from Boo and every key of her tail, where nothing is shut in; picked by chance
  const spots = new Set()
  let all = 0
  for (let seed = 1; seed <= 40; seed++) {
    const g0 = newGame('tail', { seed, lengthMs: 120000, now: 0 })
    let g = { ...g0, nextAt: 500000, boo: ALL_KEYS.filter(k => !g0.tail.includes(k))[(seed * 7) % (KEY_COUNT - 3)] } // the tail holds still
    for (let n = 1; n <= TAIL_BLOCKS_MAX; n++) {
      const before = g
      // the fish and the cucumbers out at that moment take their keys first, and a wall may not leave a dead end with the cucumbers out or once they are gone
      const just = step(g, n * TAIL_BLOCKS_EVERY_MS - 1)
      const cucumbers = just.hazards.map(h => h.key)
      const could = ALL_KEYS.filter(k => !blockKeys(g).includes(k) && !itemKeys(just).includes(k) && reach(k, g.boo) >= 2 && nearestOf(g.tail, k) >= 2 && roomyOf([...blockKeys(g), k]) && roomyOf([...blockKeys(g), ...cucumbers, k]))
      g = step(g, n * TAIL_BLOCKS_EVERY_MS)
      if (!could.length) { assert.deepEqual(g.blocks, before.blocks, `seed ${seed}: no key will do, so none comes`); continue }
      assert.equal(g.blocks.length, before.blocks.length + 1, `seed ${seed}: the ${n}th comes`)
      const b = g.blocks.at(-1)
      assert.ok(could.includes(b.key), 'on a free key two or more from Boo (the short way round) and every key of her tail, clear of the fish and the cucumbers, where nothing is shut in')
      assert.ok(roomyOf(blockKeys(g)))
      spots.add(b.key)
    }
    assert.equal(g.nextBlockAt, g.blocks.length < TAIL_BLOCKS_MAX ? 105000 : null)
    if (g.blocks.length === TAIL_BLOCKS_MAX) { all += 1; assert.deepEqual(step(g, 119000).blocks, g.blocks, 'six at most') }
  }
  assert.ok(all > 30, `all six came in ${all} of 40`)
  assert.ok(spots.size > 20, `${spots.size} keys`)
  // each friend once before any comes twice: with two out, the next is one of the other two
  for (let seed = 1; seed <= 20; seed++) {
    const g0 = newGame('tail', { seed, lengthMs: 120000, now: 0 })
    const blocks = [{ key: keyAt(0, 0), friend: null }, { key: keyAt(3, 0), friend: 'granola' }, { key: keyAt(0, 4), friend: null }, { key: keyAt(3, 4), friend: 'irwin' }, { key: keyAt(1, 2), friend: null }]
    const g = step({ ...g0, at: 75000 - 1, nextAt: 500000, blocks, nextBlockAt: 75000 }, 75000)
    assert.equal(g.blocks.length, 6)
    assert.ok(['salem', 'zimmy'].includes(g.blocks[5].friend), g.blocks[5].friend)
  }
  // no key will do on this board (B Boo, T her tail, # walls and friends): none comes, and it tries again at the next
  //   ...#..#..
  //   .#.......
  //   .##.TTT..
  //   ........B
  const shut = [keyAt(1, 1), keyAt(2, 2), keyAt(0, 6), keyAt(2, 1), keyAt(0, 3)].map((key, i) => ({ key, friend: i % 2 ? ['granola', 'salem'][i >> 1] : null }))
  const none = { ...newGame('tail', { seed: 3, lengthMs: 120000, now: 0 }), at: 30000 - 1, nextAt: 500000, nextTreatAt: null, nextHazardAt: null, boo: keyAt(3, END), tail: [keyAt(2, 4), keyAt(2, 5), keyAt(2, 6)], blocks: shut, nextBlockAt: 30000 }
  const tried = step(none, 30000)
  assert.deepEqual(tried.blocks, shut, 'none comes')
  assert.equal(tried.nextBlockAt, 45000, 'it tries again at the next')
  const next = step({ ...tried, boo: keyAt(0, 0) }, 45000)
  assert.equal(next.blocks.length, 6, 'and with Boo elsewhere one comes')
  assert.ok(['irwin', 'zimmy'].includes(next.blocks[5].friend))
})

test('G54 Boo Chasing Her Tail: after a catch the tail comes back whole on free keys, every key of it four or more from Boo whenever the board has room for it, and as far as it can be when not; a player who chases the tip catches it again and again', () => {
  let catches = 0, roomless = 0
  for (let seed = 1; seed <= 20; seed++) {
    const look = (prev, g) => {
      if (g.catches === prev.catches) return
      catches += 1
      // the places it could have come back to, on the board as it was, and the farthest any is from her
      const could = tailPlacesOf(g)
      const far = Math.max(...could.map(p => nearestReach(p, g.boo)))
      if (far < TAIL_AWAY_KEYS) roomless += 1
      assert.ok(could.some(p => p.join() === g.tail.slice(-3).join()), 'its last three keys whole, on free keys, with a free key ahead of them')
      assert.ok(nearestReach(g.tail.slice(-3), g.boo) >= Math.min(TAIL_AWAY_KEYS, far), `those three ${Math.min(TAIL_AWAY_KEYS, far)} or more from her, the short way round`)
      assert.ok(nearestReach(g.tail, g.boo) >= Math.min(TAIL_AWAY_KEYS, far) - (g.tail.length - 3), 'and the rest, grown on from its end, as far as the free keys allow')
      assert.ok(tailShaped(g.tail) && !g.tail.some(k => blockKeys(g).includes(k) || g.hazards.some(h => h.key === k)))
    }
    const g = playTail(seed, chaseMove, { every: 100, look })
    assert.ok(g.catches > 40, `seed ${seed}: ${g.catches} caught`)
  }
  assert.ok(catches > 800, `${catches} catches`)
  assert.ok(roomless < catches / 20, `${roomless} catches with no room four keys off`)
})

test('G54 Boo Chasing Her Tail: Jon\'s exploit stays gone (29 Oct 2026: "I can just hold an arrow button and it circles and win"): the page takes a key held down as one press, like one click of a dial, so nothing sweeps her round; were the engine fed an arrow every 50 ms it would catch about half of what chasing the tip does, whichever arrow', () => {
  const page = uncommented(src('../src/screens/Arcade.jsx'))
  assert.match(page, /if \(e\.repeat\) return\s*if \(ARROW_KEYS\[e\.key\]\) ev = \{ kind: 'arrow', dir: ARROW_KEYS\[e\.key\] \}/, 'a repeat is dropped before the arrows (31 Oct 2026)')
  for (const dir of ['left', 'right', 'up', 'down']) {
    let most = 0, sum = 0
    for (let seed = 1; seed <= 40; seed++) {
      const g = held(dir, seed)
      assert.equal(g.outcome, 'time')
      most = Math.max(most, g.catches)
      sum += g.catches
    }
    assert.ok(most <= 75 && sum / 40 <= 26, `${dir} fed every 50 ms: at most ${most} caught, ${(sum / 40).toFixed(1)} on average`)
  }
})

test('G54 Boo Chasing Her Tail replays exactly: one seed and the same moves are the same game, the walls and friends too', () => {
  const moves = [arrow('left'), arrow('right'), arrow('up'), arrow('down'), turn(LEFT_DIAL, 3), turn(RIGHT_DIAL, -2)]
  const run = seed => {
    let rs = seed
    const roll = () => { const r = nextRand(rs); rs = r.rs; return r.v }
    return playTail(seed, g => (roll() < 0.5 ? chaseMove(g) : roll() < 0.3 ? moves[Math.floor(roll() * moves.length)] : null), { every: 80 })
  }
  for (const seed of [3, 4, 5]) {
    const a = run(seed), b = run(seed)
    assert.deepEqual(a, b, `seed ${seed}`)
    assert.ok(a.catches > 10 && a.blocks.length === TAIL_BLOCKS_MAX)
  }
  assert.notDeepEqual(run(3).tail, run(4).tail, 'another seed, another game')
})

test('G54 Boo Chasing Her Tail stays three keys long (Jon, 31 Oct 2026: the growing tail read as the fish\'s doing; the code can still grow it by TAIL_GROWS_AT): three keys all game, back three after a catch; its two keys behind the tip block her and only its tip is caught; drawn as an end, a middle and a tip', () => {
  assert.deepEqual([TAIL_LENGTH, TAIL_GROWS_AT, TAIL_LENGTH_MAX], [3, [], 3], 'it does not grow (31 Oct 2026)')
  for (const seed of [1, 2, 3, 4]) {
    const g = playTail(seed, chaseMove, { every: 100, look: (prev, h) => assert.equal(h.tail.length, 3, `seed ${seed}: three keys`) })
    assert.ok(g.catches > 30, `seed ${seed}: caught ${g.catches} times`)
  }
  // a longer tail handed in (an older game) comes back three after a catch, and the keys behind the tip block her
  const T = 70000
  const five = [keyAt(1, 2), keyAt(1, 3), keyAt(1, 4), keyAt(1, 5), keyAt(1, 6)]
  const board = boo => ({ ...newGame('tail', { seed: 7, lengthMs: 120000, now: 0 }), at: T - 100, nextAt: T + 400, boo, tail: five })
  for (const k of five.slice(0, -1)) assert.equal(input(board(keyAt(0, colOf(k))), arrow('down'), T).boo, keyAt(0, colOf(k)), `key ${k} of it blocks her`)
  const c = input(board(keyAt(0, 6)), arrow('down'), T)
  assert.equal(c.catches, 1)
  assert.equal(c.tail.length, 3, 'back three long')
  assert.ok(tailShaped(c.tail))
  // drawn: an end, the middle pieces and a tip
  const f = gameFaces(board(keyAt(3, 0)), T)
  assert.equal(f[five[0]], 'tail-end:right')
  for (const k of five.slice(1, -1)) assert.equal(f[k], 'tail-fur:left-right')
  assert.equal(f[five[4]], 'tail-tip:right')
})

test('G54 Boo Chasing Her Tail: the fish (Jon, 30 Oct 2026: "Bonus rewards: other things to catch while chasing the tail"): one at a time from ten seconds in, on a free key two or more from her and her tail, up for six seconds, the next nine seconds after it went; Boo onto it eats it for 3 points with the gold sound and the tick, and the tail steps over it', () => {
  assert.deepEqual([TAIL_TREAT_FROM_MS, TAIL_TREAT_EVERY_MS, TAIL_TREAT_UP_MS, TAIL_TREAT_POINTS], [10000, 9000, 6000, 3])
  let came = 0, eaten = 0
  for (let seed = 1; seed <= 20; seed++) {
    let last = null
    const look = (prev, g, t) => {
      if (g.treat && !prev.treat) {
        came += 1
        const k = g.treat.key
        assert.ok(t >= TAIL_TREAT_FROM_MS, 'from ten seconds in')
        assert.ok(!blockKeys(g).includes(k) && !g.hazards.some(h => h.key === k) && k !== g.boo, 'on a free key (the tail may have stepped on since)')
        assert.ok(reach(k, prev.boo) >= 2, 'two or more from where she was')
        assert.equal(g.treat.until - g.at <= TAIL_TREAT_UP_MS && g.treat.until - g.at > TAIL_TREAT_UP_MS - 200, true)
        if (last != null) assert.ok(g.at - last >= TAIL_TREAT_EVERY_MS - 100, `nine seconds after the last went (${g.at - last})`)
        const face = gameFaces(g, g.at)[k]
        assert.ok(face === 'treat' || face.startsWith('tail-'), `drawn, unless the tail stepped over it the same moment (${face})`)
      }
      if (prev.treat && !g.treat) {
        last = g.at
        if (g.treats > prev.treats) {
          eaten += 1
          assert.equal(g.boo, prev.treat.key, 'she is on its key')
          assert.equal(g.score - prev.score, TAIL_TREAT_POINTS + (g.catches > prev.catches ? TAIL_POINTS : 0), 'its points (and the tip\'s, when the fish was under it)')
          assert.ok(g.events.includes('gold'))
          assert.equal(gameFaces(g, g.at)[g.boo], 'hit')
        } else assert.ok(g.at >= prev.treat.until, 'it went in its time, uneaten')
      }
    }
    // a player who goes for the fish when there is one, else chases the tip
    const g = playTail(seed, h => (h.treat ? toKey(h, h.treat.key) : chaseMove(h)), { every: 100, look })
    assert.ok(g.treats >= 5, `seed ${seed}: ${g.treats} fish eaten`)
    assert.equal(g.score, g.catches * TAIL_POINTS + g.treats * TAIL_TREAT_POINTS)
  }
  assert.ok(came >= 100 && eaten >= 100, `${came} fish, ${eaten} eaten`)
  // left alone, each goes in its time and the next comes nine seconds after
  const alone = []
  playTail(3, () => null, { look: (prev, g) => { if (g.treat && !prev.treat) alone.push(g.at) } })
  assert.ok(alone.length >= 7)
  for (let i = 1; i < alone.length; i++) assert.ok(near(alone[i] - alone[i - 1], TAIL_TREAT_UP_MS + TAIL_TREAT_EVERY_MS, TICK), `${alone[i] - alone[i - 1]} between`)
  // where one comes, exactly: a free key two or more from her (the short way round) and from every key of her tail, by chance
  const spots = new Set()
  for (let seed = 1; seed <= 40; seed++) {
    const g0 = newGame('tail', { seed, lengthMs: 120000, now: 0 })
    const g = { ...g0, at: 9999, nextAt: 500000, nextBlockAt: null, nextHazardAt: null, boo: ALL_KEYS.filter(k => !g0.tail.includes(k))[(seed * 5) % 33] }
    const could = ALL_KEYS.filter(k => k !== g.boo && !g.tail.includes(k) && reach(k, g.boo) >= 2 && nearestOf(g.tail, k) >= 2)
    const h = step(g, TAIL_TREAT_FROM_MS)
    assert.ok(h.treat && could.includes(h.treat.key), `seed ${seed}: on a key that will do`)
    assert.equal(h.treat.until, TAIL_TREAT_FROM_MS + TAIL_TREAT_UP_MS)
    assert.equal(h.nextTreatAt, null)
    spots.add(h.treat.key)
  }
  assert.ok(spots.size > 15, `${spots.size} keys`)
  // the tail may run over a fish: it stays, under it, and shows again when the tail has passed
  const T = 5000
  const over = { ...newGame('tail', { seed: 7, lengthMs: 120000, now: 0 }), at: T - 1, nextAt: T, boo: keyAt(3, 0), tail: [keyAt(0, 4), keyAt(0, 3), keyAt(0, 2)], treat: { key: keyAt(0, 5), until: T + 5000 }, nextTreatAt: null, blocks: [{ key: keyAt(1, 4), friend: null }] }
  const stepped = step(over, T)
  assert.equal(stepped.tail[0], keyAt(0, 5), 'straight on, over the fish')
  assert.deepEqual(stepped.treat, over.treat)
  assert.equal(gameFaces(stepped, T)[keyAt(0, 5)], 'tail-end:left', 'the tail over it')
})

test('G54 Boo Chasing Her Tail: the cucumbers (Jon, 30 Oct 2026: "Hazards: things to avoid, which slow Boo down"): from twenty seconds in, one more every twelve seconds while fewer than two are out, each for nine seconds, on a free key two or more from her and her tail where nothing is shut in; Boo onto one: it is gone, she stands frozen with her "!" for a second and a half, the strip says so, no points lost and no strike; the tail never steps onto one', () => {
  assert.deepEqual([TAIL_HAZARD_FROM_MS, TAIL_HAZARD_EVERY_MS, TAIL_HAZARD_UP_MS, TAIL_HAZARDS_MAX, TAIL_FREEZE_MS], [20000, 12000, 9000, 2, 1500])
  let came = 0, eeks = 0
  for (let seed = 1; seed <= 20; seed++) {
    const look = (prev, g, t) => {
      for (const h of g.hazards.filter(x => !prev.hazards.some(y => y.key === x.key && y.until === x.until))) {
        came += 1
        assert.ok(t >= TAIL_HAZARD_FROM_MS, 'from twenty seconds in')
        assert.ok(prev.hazards.length < TAIL_HAZARDS_MAX, 'two at most')
        assert.ok(!prev.tail.includes(h.key) && !blockKeys(prev).includes(h.key) && h.key !== prev.boo && prev.treat?.key !== h.key, 'on a free key')
        assert.ok(reach(h.key, prev.boo) >= 2 && nearestOf(prev.tail, h.key) >= 2, 'two or more from her and her tail')
        assert.ok(roomyOf([...blockKeys(g), ...g.hazards.map(x => x.key)]), 'nothing shut in')
        assert.equal(gameFaces(g, g.at)[h.key], 'cucumber')
      }
      assert.ok(g.hazards.length <= TAIL_HAZARDS_MAX)
      if (g.eeks > prev.eeks) {
        eeks += 1
        const k = g.boo
        assert.ok(prev.hazards.some(h => h.key === k) && !g.hazards.some(h => h.key === k), 'she is on it, and it is gone')
        assert.equal(g.score, prev.score, 'no points lost')
        assert.equal(g.frozenUntil, g.at + TAIL_FREEZE_MS)
        assert.ok(g.events.includes('miss'))
        assert.equal(gameFaces(g, g.at)[k], 'boo-alert', 'her "!"')
        assert.equal(gameFaces(g, g.at + TAIL_FREEZE_MS)[k], 'tail-boo')
        assert.deepEqual(g.said, { words: 'Eek! A cucumber.', until: g.at + STRIKE_WORDS_MS })
        // frozen: a move does nothing until then
        const dirs = ['left', 'right', 'up', 'down']
        assert.ok(dirs.every(d => input(g, arrow(d), g.at + TAIL_FREEZE_MS - 1).boo === k), 'frozen')
        assert.ok(dirs.some(d => input(g, arrow(d), g.at + TAIL_FREEZE_MS).boo !== k), 'then free')
      }
      for (const k of g.tail) assert.ok(!g.hazards.some(h => h.key === k), 'the tail never steps onto one')
    }
    // a player who walks into cucumbers on purpose, else chases the tip
    const g = playTail(seed, h => (h.hazards.length && h.at >= h.frozenUntil ? toKey(h, h.hazards[0].key) : chaseMove(h)), { every: 100, look })
    assert.ok(g.eeks >= 3, `seed ${seed}: ${g.eeks} cucumbers stepped on`)
    assert.equal(strikesOfView(g), null, 'no strikes in this game')
  }
  assert.ok(came >= 100 && eeks >= 60, `${came} cucumbers, ${eeks} stepped on`)
  // left alone: the first at twenty seconds, the second at thirty-two, each gone nine seconds after it came
  const times = []
  playTail(2, () => null, { look: (prev, g) => { for (const h of g.hazards) if (!prev.hazards.some(y => y.key === h.key && y.until === h.until)) times.push([g.at, h.until - g.at]) } })
  assert.deepEqual(times.slice(0, 2).map(([t]) => t), [20000, 32000])
  assert.ok(times.every(([, up]) => near(up, TAIL_HAZARD_UP_MS)))
  assert.ok(times.length >= 8)
})

test('G54 The Lazy Pointer: the left dial moves the red dot left and right, the right dial up and down (clockwise is up), one key a click; the edges stop it, and it never moves onto Boo', () => {
  const g0 = newGame('pointer', { seed: 3, lengthMs: 120000, now: 0 })
  assert.equal(g0.dot, keyAt(1, 1))
  assert.equal(g0.boo, keyAt(2, 7))
  assert.equal(g0.awake, false, 'she starts asleep')
  const f0 = gameFaces(g0, 0)
  assert.equal(f0[keyAt(1, 1)], 'dot')
  assert.equal(f0[keyAt(2, 7)], 'boo-nap')
  assert.equal(f0.filter(f => f === 'blank').length, KEY_COUNT - 2)
  const at = 100 // before anything is due: the first sparkle comes at 600 ms
  const dotAfter = (g, ...evs) => evs.reduce((h, ev) => input(h, ev, at), g).dot
  assert.equal(dotAfter(g0, turn(LEFT_DIAL, 1)), keyAt(1, 2))
  assert.equal(dotAfter(g0, turn(LEFT_DIAL, -1)), keyAt(1, 0))
  assert.equal(dotAfter(g0, turn(RIGHT_DIAL, 1)), keyAt(0, 1), 'clockwise is up')
  assert.equal(dotAfter(g0, turn(RIGHT_DIAL, -1)), keyAt(2, 1))
  assert.equal(dotAfter(g0, arrow('right')), keyAt(1, 2))
  assert.equal(dotAfter(g0, arrow('left')), keyAt(1, 0))
  assert.equal(dotAfter(g0, arrow('up')), keyAt(0, 1))
  assert.equal(dotAfter(g0, arrow('down')), keyAt(2, 1))
  assert.equal(dotAfter(g0, turn(LEFT_DIAL, 1), turn(LEFT_DIAL, 1), turn(RIGHT_DIAL, -1)), keyAt(2, 3), 'click by click')
  // a key, a press, the inside dials, the strip: nothing
  for (const ev of [key(keyAt(1, 2)), press(0), press(5), turn(1, 1), turn(4, -1), tap(900), swipe(0, 1199)]) assert.deepEqual(input(g0, ev, at), step(g0, at), JSON.stringify(ev))
  // the edges stop it
  const corner = { ...g0, dot: keyAt(0, 0) }
  for (const ev of [turn(LEFT_DIAL, -1), turn(RIGHT_DIAL, 1), arrow('left'), arrow('up')]) assert.equal(dotAfter(corner, ev), keyAt(0, 0), JSON.stringify(ev))
  const other = { ...g0, dot: keyAt(3, END), boo: keyAt(0, 0) }
  for (const ev of [turn(LEFT_DIAL, 1), turn(RIGHT_DIAL, -1), arrow('right'), arrow('down')]) assert.equal(dotAfter(other, ev), keyAt(3, END), JSON.stringify(ev))
  // all the way across: one key a click, then the edge
  assert.equal(dotAfter(g0, ...Array(12).fill(turn(LEFT_DIAL, 1))), keyAt(1, END))
  // never onto Boo, asleep or awake: it stops beside her
  for (const awake of [false, true]) {
    const by = { ...g0, awake, nextAt: awake ? 5000 : null }
    assert.equal(dotAfter({ ...by, dot: keyAt(2, 6) }, turn(LEFT_DIAL, 1)), keyAt(2, 6), `beside her, ${awake ? 'awake' : 'asleep'}`)
    assert.equal(dotAfter({ ...by, dot: keyAt(1, 7) }, turn(RIGHT_DIAL, -1)), keyAt(1, 7))
    assert.equal(dotAfter({ ...by, dot: keyAt(3, 7) }, arrow('up')), keyAt(3, 7))
  }
})

test('G54 The Lazy Pointer: Boo naps; she wakes when her nap ends or the dot comes beside her, and is alert until her first step; awake, she stalks the dot one key a step along a row or a column, quicker as the game goes on (Jon, 30 Oct 2026: "Boo is faster"); a dot far away three steps running bores her back to sleep', () => {
  const g0 = newGame('pointer', { seed: 3, lengthMs: 120000, now: 0 })
  // naps of POINTER_NAP_MS to half as long again, one seed to the next
  const naps = Array.from({ length: 60 }, (_, i) => newGame('pointer', { seed: i + 1, now: 0 }).wakeAt)
  for (const n of naps) assert.ok(n >= POINTER_NAP_MS && n <= POINTER_NAP_MS * 1.5, `a nap of ${n}`)
  assert.ok(new Set(naps).size > 50)
  // her nap ends: awake, the ! until her first step, then the chaser
  assert.equal(gameFaces(step(g0, g0.wakeAt - 1), g0.wakeAt - 1)[g0.boo], 'boo-nap')
  let g = step(g0, g0.wakeAt)
  assert.equal(g.awake, true)
  assert.equal(g.boo, keyAt(2, 7), 'awake, not yet moved')
  const first = g.nextAt
  assert.ok(near(first - g0.wakeAt, over2min(POINTER_STEP_MS, POINTER_STEP_END_MS, g0.wakeAt)), 'her first step a step later')
  for (const t of [g0.wakeAt, first - 1]) assert.equal(gameFaces(g, t)[g.boo], 'boo-alert')
  g = step(g, first)
  assert.equal(g.boo, keyAt(2, 6), 'one key, along the row: the longer way to the dot')
  assert.equal(gameFaces(g, first)[g.boo], 'chaser')
  // the dot POINTER_BORED_KEYS or more away for POINTER_BORED_STEPS steps running: back to sleep (three since 30 Oct 2026: she keeps after it longer)
  assert.deepEqual([POINTER_BORED_KEYS, POINTER_BORED_STEPS], [5, 3])
  assert.ok(apart(g.boo, g.dot) >= POINTER_BORED_KEYS)
  g = step(g, g.nextAt)
  assert.equal(g.boo, keyAt(2, 5))
  assert.equal(g.awake, true, 'two far steps: still after it')
  let far = { ...g0, at: 999, awake: true, nextAt: 1000, alertUntil: 0, nextSparkleAt: 100000, nextBlockAt: null, boo: keyAt(2, 8), dot: keyAt(1, 0) }
  for (const [n, to] of [[1, keyAt(2, 7)], [2, keyAt(2, 6)]]) { far = step(far, far.nextAt); assert.equal(far.boo, to); assert.equal(far.awake, true, `step ${n}: still after it`) }
  far = step(far, far.nextAt)
  assert.equal(far.boo, keyAt(2, 5))
  assert.equal(far.awake, false, 'the third far step: bored')
  assert.equal(gameFaces(far, far.at)[far.boo], 'boo-nap')
  assert.ok(far.wakeAt - far.at >= POINTER_NAP_MS && far.wakeAt - far.at <= POINTER_NAP_MS * 1.5)
  g = far

  // the dot beside her wakes her at once (POINTER_WAKE_KEYS: one key along a row or a column)
  assert.equal(POINTER_WAKE_KEYS, 1)
  const woke = input({ ...g0, dot: keyAt(2, 5) }, turn(LEFT_DIAL, 1), 300)
  assert.equal(woke.dot, keyAt(2, 6))
  assert.equal(woke.awake, true)
  assert.equal(gameFaces(woke, 300)[woke.boo], 'boo-alert')
  assert.ok(near(woke.nextAt - 300, over2min(POINTER_STEP_MS, POINTER_STEP_END_MS, 300)))
  assert.equal(input({ ...g0, dot: keyAt(1, 6) }, turn(RIGHT_DIAL, -1), 300).awake, true, 'from above')
  // diagonally beside her is two keys away: she sleeps on
  assert.equal(input({ ...g0, dot: keyAt(1, 5) }, turn(LEFT_DIAL, 1), 300).awake, false)

  // awake, a step quicker as the game goes on; and close by (under POINTER_BORED_KEYS) she never tires
  for (const T of [1000, 60000, 110000]) {
    const s = step({ ...g0, at: T - 1, awake: true, nextAt: T, nextSparkleAt: T + 10000, boo: keyAt(0, 0), dot: keyAt(1, 2) }, T)
    assert.equal(s.boo, keyAt(0, 1), 'the longer way first: along the row')
    assert.equal(s.awake, true)
    assert.ok(near(s.nextAt - T, over2min(POINTER_STEP_MS, POINTER_STEP_END_MS, T)), `her step at ${T}`)
  }
  // left alone, every move she makes is one key along a row or a column, the longer way, and only awake
  for (const seed of [1, 2, 3, 4]) {
    let s = newGame('pointer', { seed, lengthMs: 120000, now: 0 })
    let prev = s, moves = 0
    for (let t = 0; t <= 120000 && !s.over; t += TICK) {
      s = stepGame(s, t)
      if (s.boo !== prev.boo) {
        moves += 1
        assert.equal(apart(s.boo, prev.boo), 1, 'one key')
        assert.ok(prev.awake, 'never in her sleep')
        const dr = Math.abs(rowOf(prev.dot) - rowOf(prev.boo)), dc = Math.abs(colOf(prev.dot) - colOf(prev.boo))
        if (!prev.blocks.length) { // with walls out (30 Oct 2026) she goes round them, the shortest way
          if (dc > dr) assert.equal(rowOf(s.boo), rowOf(prev.boo), 'along the row')
          if (dr > dc) assert.equal(colOf(s.boo), colOf(prev.boo), 'down the column')
        }
        assert.ok(!prev.blocks.some(b => b.key === s.boo), 'never onto a wall')
      }
      prev = s
    }
    assert.ok(moves > 10, `${moves} moves`)
  }
})

test('G54 The Lazy Pointer: when Boo lands on the dot it is a strike, the red face on her key, the dot jumps to the free key farthest from her and she naps; the third strike ends the game, points kept', () => {
  const g0 = newGame('pointer', { seed: 3, lengthMs: 120000, now: 0 })
  const T = 20000
  const ready = { ...g0, at: T - 1, awake: true, nextAt: T, alertUntil: 0, nextSparkleAt: T + 10000, boo: keyAt(1, 2), dot: keyAt(1, 1), score: 6, sparkled: 2 }
  const g = step(ready, T)
  assert.equal(g.strikes, 1)
  assert.deepEqual(g.events, ['bite'])
  assert.equal(g.over, false)
  assert.equal(g.boo, keyAt(1, 1), 'she landed on it')
  assert.equal(g.dot, keyAt(3, END), 'the free key farthest from her')
  assert.equal(apart(g.dot, g.boo), Math.max(...ALL_KEYS.map(k => apart(k, g.boo))))
  assert.equal(g.awake, false, 'and she naps')
  assert.ok(g.wakeAt - T >= POINTER_NAP_MS && g.wakeAt - T <= POINTER_NAP_MS * 1.5)
  assert.equal(g.score, 6, 'no points lost')
  assert.deepEqual(g.said, { words: 'Strike 1! Boo caught it.', until: T + STRIKE_WORDS_MS })
  assert.equal(gameFaces(g, T)[keyAt(1, 1)], 'caught')
  assert.equal(gameFaces(g, T)[keyAt(3, END)], 'dot')
  assert.equal(gameFaces(g, T + MISS_MS - 1)[keyAt(1, 1)], 'caught')
  assert.equal(gameFaces(g, T + MISS_MS)[keyAt(1, 1)], 'boo-nap')
  // a sparkle on the farthest key: the dot goes to the farthest one that is free
  const sparkled = step({ ...ready, sparkles: [{ key: keyAt(3, END), until: T + 3000 }] }, T)
  assert.notEqual(sparkled.dot, keyAt(3, END))
  assert.equal(apart(sparkled.dot, keyAt(1, 1)), apart(keyAt(3, END), keyAt(1, 1)) - 1)
  assert.equal(sparkled.sparkles.length, 1, 'the sparkle stays')
  // the second
  const second = step({ ...ready, strikes: 1 }, T)
  assert.equal(second.strikes, 2)
  assert.equal(second.said.words, 'Strike 2! Boo caught it.')
  // the fifth (31 Oct 2026): the game ends at that moment, lost, the points kept and no bonus for lasting
  const third = step({ ...ready, strikes: STRIKES_OUT - 1 }, T + 5000)
  assert.equal(third.over, true)
  assert.equal(third.outcome, 'lose')
  assert.equal(third.endedAt, T)
  assert.equal(third.score, 6)
  assert.deepEqual(third.events, ['bite', 'lose'])
  assert.equal(gameFaces(third, T)[keyAt(1, 1)], 'caught', 'the last board shows the catch')
  assert.deepEqual(json(third), third)
  // left alone, she always gets there in the end
  for (let seed = 1; seed <= 30; seed++) assert.equal(step(newGame('pointer', { seed, lengthMs: 120000, now: 0 }), 120000).outcome, 'lose', `seed ${seed}`)
})

test('G54 The Lazy Pointer: sparkles come one at a time, at most two at once, each for a while, never on the dot or Boo; leading the dot onto one scores with a green tick; lasting to the end adds POINTER_LAST_POINTS, and it can be done', () => {
  let nearBoo = 0, all = 0
  for (const seed of [4, 5, 6]) {
    let g = newGame('pointer', { seed, lengthMs: 120000, now: 0 })
    const born = []
    let prev = g
    for (let t = 0; t <= 120000 && !g.over; t += TICK) {
      g = stepGame(g, t)
      assert.ok(g.sparkles.length <= POINTER_SPARKLES, 'at most two at once')
      for (const s of g.sparkles) {
        if (prev.sparkles.some(p => p.key === s.key && p.until === s.until)) continue
        const at = s.until - POINTER_SPARKLE_UP_MS
        assert.ok(at > prev.at && at <= t, 'each up POINTER_SPARKLE_UP_MS from when it came')
        const then = stepGame(prev, at) // the board as it came
        assert.ok(then.sparkles.some(p => p.key === s.key && p.until === s.until))
        assert.notEqual(s.key, then.dot, 'not on the dot')
        assert.notEqual(s.key, then.boo, 'not on Boo')
        all += 1
        if (apart(s.key, then.boo) <= 2) nearBoo += 1
        born.push(at)
      }
      for (const p of prev.sparkles) if (!g.sparkles.some(s => s.key === p.key && s.until === p.until)) assert.ok(p.until <= t, 'gone only when its time is up')
      prev = g
    }
    assert.equal(born[0], 600, 'the first a moment after the start')
    for (let i = 1; i < born.length; i++) assert.ok(born[i] - born[i - 1] >= POINTER_SPARKLE_MS - 1e-9, 'never two at once')
    assert.ok(born.length > 10, `${born.length} sparkles`)
  }
  assert.ok(nearBoo / all > 0.25 && nearBoo / all < 0.75, `some near her, to tempt: ${nearBoo} of ${all}`)

  // grabbing one: the points, the point sound, the green tick over the dot for a moment
  const g0 = { ...newGame('pointer', { seed: 3, lengthMs: 120000, now: 0 }), wakeAt: 100000, nextSparkleAt: 100000 }
  const one = { ...g0, sparkles: [{ key: keyAt(1, 2), until: 5000 }] }
  assert.equal(gameFaces(one, 300)[keyAt(1, 2)], 'sparkle')
  const got = input(one, turn(LEFT_DIAL, 1), 300)
  assert.equal(got.dot, keyAt(1, 2))
  assert.equal(got.score, POINTER_POINTS)
  assert.equal(got.sparkled, 1)
  assert.deepEqual(got.events, ['point'])
  assert.deepEqual(got.sparkles, [])
  assert.equal(gameFaces(got, 300)[keyAt(1, 2)], 'hit')
  assert.equal(gameFaces(got, 300 + HIT_MS)[keyAt(1, 2)], 'dot')
  // one that has faded is not there to grab
  assert.equal(input(one, turn(LEFT_DIAL, 1), 5000).score, 0)

  // lasting to the end: POINTER_LAST_POINTS more, and the win sound
  const end = step({ ...g0, score: 9, wakeAt: 130000 }, 120000) // she sleeps past the end
  assert.equal(end.outcome, 'time')
  assert.equal(end.endedAt, 120000)
  assert.equal(end.strikes, 0)
  assert.equal(end.score, 9 + POINTER_LAST_POINTS - end.penalty, 'less what the faded sparkles cost (30 Oct 2026)')
  assert.ok(end.missed > 0 && end.penalty === Math.min(9, end.missed * POINTER_MISS_POINTS), `${end.missed} faded, ${end.penalty} lost`)
  assert.deepEqual(end.events, ['miss', 'win'])
  // and it can be done: a dot kept away from her lasts the two minutes, and one led to the sparkles too
  for (const seed of [1, 2]) {
    const kept = playPointer(seed, flee)
    assert.equal(kept.outcome, 'time', `seed ${seed}`)
    assert.equal(kept.strikes, 0)
    assert.equal(kept.score, kept.sparkled * POINTER_POINTS + POINTER_LAST_POINTS - kept.penalty)
    const led = playPointer(seed, lure)
    assert.equal(led.outcome, 'time')
    assert.ok(led.sparkled > 20, `${led.sparkled} sparkles grabbed`)
  }
})

test('G54 The Lazy Pointer, more of a challenge (Jon, 30 Oct 2026): walls from twenty seconds in, one more every fifteen, five at most, each on a free key two or more from the dot and from Boo, clear of the sparkles, nothing shut in; the dot stops at a wall and Boo goes round them the shortest way, never onto one; one sparkle in two comes near her; a sparkle that fades ungrabbed costs 2 points, never below nought, with the miss sound, a crossed-out sparkle for a moment and the strip\'s words, and is not a strike', () => {
  assert.deepEqual([POINTER_BLOCKS_FROM_MS, POINTER_BLOCKS_EVERY_MS, POINTER_BLOCKS_MAX, POINTER_NEAR_ONE_IN, POINTER_MISS_POINTS], [20000, 15000, 5, 2, 2])
  assert.deepEqual([POINTER_STEP_MS, POINTER_STEP_END_MS], [600, 300], 'Boo is faster')
  // the walls, game by game, the dot kept away from her
  for (const seed of [1, 2, 3, 4, 5]) {
    let g = newGame('pointer', { seed, lengthMs: 120000, now: 0 })
    const came = []
    let prev = g
    for (let t = 0; t <= 120000 && !g.over; t += TICK) {
      g = stepGame(g, t)
      if (!g.over && t % (6 * TICK) === 0) g = flee(g, t)
      for (const b of g.blocks.slice(prev.blocks.length)) {
        came.push(t)
        assert.ok(apart(b.key, prev.dot) >= 2 && apart(b.key, prev.boo) >= 2, 'two or more from the dot and from Boo')
        assert.ok(!prev.sparkles.some(x => x.key === b.key), 'clear of the sparkles')
        assert.ok(roomyOf(g.blocks.map(x => x.key)), 'nothing shut in')
        assert.equal(gameFaces(g, t)[b.key], 'wall')
      }
      assert.deepEqual(g.blocks.slice(0, prev.blocks.length), prev.blocks, 'they stay put')
      assert.ok(!g.blocks.some(b => b.key === g.boo || b.key === g.dot), 'neither on a wall')
      for (const x of g.sparkles) assert.ok(!g.blocks.some(b => b.key === x.key), 'no sparkle on a wall')
      prev = g
    }
    assert.ok(came.length === POINTER_BLOCKS_MAX && came.every((at, i) => near(at, POINTER_BLOCKS_FROM_MS + i * POINTER_BLOCKS_EVERY_MS, TICK)), `seed ${seed}: at ${came}`)
    assert.equal(g.outcome, 'time', `seed ${seed}: kept away from her to the end`)
  }
  // the dot stops at a wall, and the rest of the turn
  const g0 = { ...newGame('pointer', { seed: 3, lengthMs: 120000, now: 0 }), wakeAt: 100000, nextSparkleAt: 100000, nextBlockAt: null, blocks: [{ key: keyAt(1, 3) }] }
  assert.equal(input(g0, turn(LEFT_DIAL, 4), 300).dot, keyAt(1, 2))
  assert.equal(input(g0, arrow('right'), 300).dot, keyAt(1, 2))
  assert.deepEqual(input({ ...g0, dot: keyAt(1, 2) }, arrow('right'), 300), step({ ...g0, dot: keyAt(1, 2) }, 300), 'nothing else happens')
  // Boo goes round a wall between her and the dot, the shortest way, one key a step, and never onto it
  const T = 1000
  const walled = { ...g0, at: T - 1, awake: true, nextAt: T, alertUntil: 0, boo: keyAt(1, 5), dot: keyAt(1, 1), blocks: [{ key: keyAt(1, 4) }, { key: keyAt(0, 4) }] }
  const s1 = step(walled, T)
  assert.equal(s1.boo, keyAt(2, 5), 'down, round the wall')
  const s2 = step(s1, s1.nextAt)
  assert.equal(s2.boo, keyAt(2, 4))
  // walled off from it altogether: she gives up and naps
  const shut = { ...walled, boo: keyAt(0, 8), blocks: [{ key: keyAt(0, 7) }, { key: keyAt(1, 8) }] }
  const gave = step(shut, T)
  assert.equal(gave.boo, keyAt(0, 8))
  assert.equal(gave.awake, false)
  // a sparkle fading: 2 off, the miss sound, the crossed-out sparkle, the words; never below nought; not a strike
  const one = { ...g0, blocks: [], score: 5, sparkles: [{ key: keyAt(2, 2), until: 5000 }] }
  const faded = step(one, 5000)
  assert.deepEqual([faded.score, faded.missed, faded.penalty, faded.strikes, faded.sparkles], [3, 1, 2, 0, []])
  assert.deepEqual(faded.events, ['miss'])
  assert.deepEqual(faded.said, { words: 'A sparkle faded. -2', until: 5000 + STRIKE_WORDS_MS })
  assert.equal(gameFaces(faded, 5000)[keyAt(2, 2)], 'sparkle-miss')
  assert.equal(gameFaces(faded, 5000 + MISS_MS)[keyAt(2, 2)], 'blank')
  const broke = step({ ...one, score: 1 }, 5000)
  assert.deepEqual([broke.score, broke.penalty], [0, 1], 'only what there is to lose')
  const none = step({ ...one, score: 0 }, 5000)
  assert.deepEqual([none.score, none.penalty, none.missed], [0, 0, 1])
  assert.equal(none.said.words, 'A sparkle faded. No points to lose.')
  // on the strip and the screen while the words show: the words in the points' place, the boxes unchanged
  const [a, ta] = started('pointer')
  const withOne = { ...a, game: { ...a.game, score: 6, sparkles: [{ key: keyAt(3, 0), until: ta + 1000 }], nextSparkleAt: ta + 100000, wakeAt: ta + 100000 } }
  const after = aStep(withOne, ta + 1000)
  const v = arcadeView(after, ta + 1000)
  assert.equal(v.strip.centre, 'A sparkle faded. -2')
  assert.equal(v.strip.score, null)
  assert.deepEqual(v.strip.marks, marksOf('pointer', 0), 'not a strike')
  assert.equal(v.screen.said, 'A sparkle faded. -2')
  assert.equal(arcadeView(after, ta + 1000 + STRIKE_WORDS_MS).strip.score, 4)
  // the page pops it as -2
  const page = src('../src/screens/Arcade.jsx')
  assert.match(page, /if \(gain < 0\) return \{ text: String\(gain\), kind: 'strike' \}/)
})

test('G54 Whack-a-Mouse: tap a mouse before it hides for a point (gold for more) and a green tick; an empty key does nothing; a tapped mouse\'s place is taken again soon; a tap a moment after a mouse hid still gets it', () => {
  const g0 = newGame('mice', { seed: 11, lengthMs: 120000, now: 0 })
  assert.deepEqual(gameFaces(g0, 0), Array(KEY_COUNT).fill('blank'))
  const g = step(g0, 0)
  assert.equal(g.mice.length, 1, 'the first mouse comes at once')
  const m = g.mice[0]
  assert.equal(m.downAt, m.gold ? MICE_GOLD_UP_MS : MICE_UP_MS)
  assert.equal(gameFaces(g, 0)[m.key], m.gold ? 'mouse-gold' : 'mouse')
  // an empty key does nothing at all
  assert.deepEqual(input(g, key(ALL_KEYS.find(k => k !== m.key)), 100), step(g, 100))
  // the mouse: a point (three for gold), its sound, the green tick for a moment
  const h = input(g, key(m.key), 100)
  assert.equal(h.score, m.gold ? MICE_GOLD_POINTS : MICE_POINTS)
  assert.equal(h.bonked, 1)
  assert.deepEqual(h.events, [m.gold ? 'gold' : 'point'])
  assert.deepEqual(h.mice, [])
  assert.equal(gameFaces(h, 100)[m.key], 'hit')
  assert.equal(gameFaces(h, 100 + HIT_MS)[m.key], 'blank')
  assert.deepEqual(input(h, key(m.key), 150).events, [], 'a bonked mouse is gone')
  // its place is taken again soon
  assert.ok(h.nextSpawnAt >= 100 + MICE_REFILL_MS && h.nextSpawnAt <= 100 + MICE_REFILL_MS + MICE_REFILL_MORE_MS, `the next at ${h.nextSpawnAt}`)
  const refilled = step(h, h.nextSpawnAt)
  assert.equal(refilled.mice.length + refilled.pets.length, 1)
  assert.notEqual([...refilled.mice, ...refilled.pets][0].key, m.key, 'somewhere else: its own key rests')
  // a gold mouse: three points, the gold sound
  const gold = { ...g, mice: [{ key: 5, gold: true, downAt: 1000 }] }
  assert.equal(gameFaces(gold, 200)[5], 'mouse-gold')
  assert.equal(input(gold, key(5), 200).score, MICE_GOLD_POINTS)
  assert.deepEqual(input(gold, key(5), 200).events, ['gold'])
  assert.ok(MICE_GOLD_UP_MS < MICE_UP_MS && MICE_GOLD_UP_END_MS < MICE_UP_END_MS, 'a gold mouse hides sooner, all game')

  // a tap a moment after a mouse hid still gets it: the deck shows every change a moment late
  const T = 1000
  const up = { ...g, at: T - 100, mice: [{ key: 7, gold: false, downAt: T }], nextSpawnAt: 100000 }
  const hid = step(up, T)
  assert.deepEqual(hid.mice, [])
  assert.equal(gameFaces(hid, T)[7], 'blank')
  const late = input(hid, key(7), T + MICE_LATE_MS - 1)
  assert.equal(late.score, g.score + MICE_POINTS)
  assert.deepEqual(late.events, ['point'])
  assert.equal(gameFaces(late, T + MICE_LATE_MS - 1)[7], 'hit')
  assert.deepEqual(input(late, key(7), T + MICE_LATE_MS - 1).events, [], 'once only')
  assert.deepEqual(input(hid, key(7), T + MICE_LATE_MS).events, [], 'and not after MICE_LATE_MS')
  assert.equal(input(step({ ...up, mice: [{ key: 7, gold: true, downAt: T }] }, T), key(7), T + 50).score, g.score + MICE_GOLD_POINTS, 'a gold one keeps its gold')
  assert.equal(input(up, key(7), T + 100).score, g.score + MICE_POINTS, 'even when the page slept through its hiding')

  // the mice come quicker and hide sooner as the game goes on: the next one comes a mouse's time up
  // shared among as many as may be up now, never sooner than MICE_SPAWN_MIN_MS
  const cap = t => Math.min(MICE_AT_ONCE_MAX, MICE_AT_ONCE + Math.floor(t / MICE_MORE_EVERY_MS))
  for (const t of [0, 19999, 20000, 30000, 60000, 80000, 119000]) {
    const s = step({ ...g0, at: t - 1, nextSpawnAt: t }, t)
    assert.ok(near(s.nextSpawnAt - t, Math.max(MICE_SPAWN_MIN_MS, over2min(MICE_UP_MS, MICE_UP_END_MS, t) / cap(t))), `a new one every ${s.nextSpawnAt - t} ms at ${t}`)
    for (const x of [...s.mice, ...s.pets]) {
      const gold = s.mice.includes(x) && x.gold
      assert.ok(near(x.downAt - t, gold ? over2min(MICE_GOLD_UP_MS, MICE_GOLD_UP_END_MS, t) : over2min(MICE_UP_MS, MICE_UP_END_MS, t)), `up for ${x.downAt - t} ms at ${t}`)
    }
  }
  assert.ok(MICE_UP_END_MS < MICE_UP_MS)
  assert.equal(MICE_SPAWN_MIN_MS, 120)
  // about one in ten is gold
  let golds = 0, all = 0
  for (const seed of [11, 12, 13]) {
    let s = newGame('mice', { seed, lengthMs: 120000, now: 0 })
    const met = new Set()
    for (let t = 0; t <= 120000; t += TICK) {
      s = stepGame(s, t)
      for (const x of s.mice) if (!met.has(`${x.key}@${x.downAt}`)) { met.add(`${x.key}@${x.downAt}`); all += 1; if (x.gold) golds += 1 }
    }
    assert.equal(s.outcome, 'time')
    assert.equal(s.score, 0, 'mice left alone cost nothing')
  }
  assert.ok(Math.abs(golds / all - 1 / GOLD_ONE_IN) < 0.05, `${golds} gold of ${all}`)
})

test('G54 Whack-a-Mouse lets more up at once as it goes (Jon, 29 Oct 2026: "Allow for more at once"; 30 Oct: "More mice up at once toward the end"): two at first, one more every 15 seconds up to eight, friends counted too; never more, never two on a key', () => {
  const cap = t => Math.min(MICE_AT_ONCE_MAX, MICE_AT_ONCE + Math.floor(t / MICE_MORE_EVERY_MS))
  assert.deepEqual([MICE_AT_ONCE, MICE_MORE_EVERY_MS, MICE_AT_ONCE_MAX], [2, 15000, 8])
  assert.deepEqual([0, 14999, 15000, 29999, 30000, 45000, 60000, 75000, 90000, 119999].map(cap), [2, 2, 3, 3, 4, 5, 6, 7, 8, 8])
  // with n up and one due: one more comes only while fewer than the cap are up, a friend as good as a mouse
  const g0 = newGame('mice', { seed: 21, lengthMs: 120000, now: 0 })
  for (const t of [1000, 14999, 15000, 45000, 89999, 90000, 110000]) {
    for (let n = 0; n <= MICE_AT_ONCE_MAX; n++) {
      const mice = Array.from({ length: Math.ceil(n / 2) }, (_, i) => ({ key: i, gold: false, downAt: t + 5000 }))
      const pets = Array.from({ length: Math.floor(n / 2) }, (_, i) => ({ key: 20 + i, pet: PETS[i], downAt: t + 5000 }))
      const s = step({ ...g0, at: t - 1, mice, pets, nextSpawnAt: t }, t)
      assert.equal(s.mice.length + s.pets.length, n < cap(t) ? n + 1 : n, `${n} up at ${t}`)
      assert.ok(s.nextSpawnAt > t, 'the next one due later')
    }
  }
  // in play, every mouse tapped as soon as it shows: never more up than the cap, never two on a key
  for (const seed of [21, 22, 23]) {
    let s = newGame('mice', { seed, lengthMs: 120000, now: 0 })
    for (let t = 0; t <= 120000 && !s.over; t += TICK) {
      s = stepGame(s, t)
      const up = [...s.mice, ...s.pets]
      assert.ok(up.length <= cap(t), `${up.length} up at ${t}`)
      assert.equal(new Set(up.map(x => x.key)).size, up.length, 'one to a key')
      for (const x of s.mice) s = inputGame(s, key(x.key), t)
    }
    assert.equal(s.outcome, 'time')
    assert.ok(s.bonked > 350, `${s.bonked} bonked`) // about 420 a game, tapping every mouse as soon as it shows (29 Oct 2026)
  }
})

test('G54 Whack-a-Mouse: as many as MICE_AT_ONCE_MAX can be up at once by the end, as its cap allows', () => {
  let most = 0
  for (let seed = 1; seed <= 20; seed++) {
    let s = newGame('mice', { seed, lengthMs: 120000, now: 0 })
    for (let t = 0; t <= 120000; t += TICK) {
      s = stepGame(s, t)
      if (t >= 90000) most = Math.max(most, s.mice.length + s.pets.length)
    }
  }
  assert.equal(most, MICE_AT_ONCE_MAX, `at most ${most} up at once in the last 30 seconds`)
})

test('G54 Whack-a-Mouse\'s friends (Jon, 29 Oct 2026: "I want a better name than pets"): from five seconds in about one in four that pop up is Sir Irwin or a friend, all five of them, each up as long as a plain mouse; one tapped scores nothing and is a strike on red, named on the strip; the third ends the game, points kept', () => {
  // Jon's rule (29 Oct 2026), and the how-to-play line that says it
  assert.equal(MICE_PETS_OUT, 5)
  assert.match(GAMES.find(g => g.id === 'mice').how, /Leave Sir Irwin and his friends alone: tap five and you're out\.$/)
  assert.deepEqual([...PETS].sort(), ['boo', 'granola', 'irwin', 'salem', 'zimmy'])

  // left alone: none in the first five seconds, then about one in four, each up as long as a plain mouse
  // would be at that moment (worked back from when it hides); and one left alone never counts
  const bornOf = (downAt, from, to) => (downAt - from) / (1 + (to - from) / 120000)
  let pets = 0, all = 0
  const met = new Set()
  for (const seed of [21, 22, 23, 24]) {
    let s = newGame('mice', { seed, lengthMs: 120000, now: 0 })
    const seen = new Set()
    for (let t = 0; t <= 120000; t += TICK) {
      s = stepGame(s, t)
      for (const x of [...s.mice, ...s.pets]) {
        const pet = s.pets.includes(x)
        const id = `${pet ? 'pet' : 'mouse'}${x.key}@${x.downAt}`
        if (seen.has(id)) continue
        seen.add(id)
        all += 1
        const born = pet || !x.gold ? bornOf(x.downAt, MICE_UP_MS, MICE_UP_END_MS) : bornOf(x.downAt, MICE_GOLD_UP_MS, MICE_GOLD_UP_END_MS)
        assert.ok(born <= t + 1e-6 && born > t - TICK - 1e-6, `${pet ? 'a friend' : 'a mouse'} up its time, from ${born} (seen at ${t})`)
        if (!pet) continue
        pets += 1
        met.add(x.pet)
        assert.ok(born >= MICE_PETS_FROM_MS - 1e-6, `no friend before five seconds: ${born}`)
      }
    }
    assert.equal(s.outcome, 'time')
    assert.equal(s.petTaps, 0, 'a friend left alone never counts')
  }
  assert.ok(Math.abs(pets / all - 1 / MICE_PET_ONE_IN) < 0.06, `${pets} friends of ${all}`)
  assert.deepEqual([...met].sort(), [...PETS].sort(), 'all five come')

  // a tap on one: nothing scored, a strike, its name on the strip, it on red for a moment, and its key empty
  let g = newGame('mice', { seed: 21, lengthMs: 120000, now: 0 })
  let t = 0
  while (!g.pets.length) { t += TICK; g = step(g, t) }
  const p = g.pets[0]
  const h = input(g, key(p.key), t)
  assert.equal(h.score, g.score, 'a friend scores nothing')
  assert.equal(h.petTaps, 1)
  assert.deepEqual(h.events, ['miss'])
  assert.deepEqual(h.pets, [])
  assert.equal(h.over, false)
  assert.deepEqual(h.said, { words: `Strike 1! ${STRUCK[p.pet]}`, until: t + STRIKE_WORDS_MS })
  assert.deepEqual(json(h), h, 'still plain JSON')
  assert.equal(gameFaces(g, t)[p.key], `pet:${p.pet}`)
  assert.equal(gameFaces(h, t)[p.key], `oops:${p.pet}`)
  assert.equal(gameFaces(h, t + MISS_MS - 1)[p.key], `oops:${p.pet}`)
  assert.equal(gameFaces(h, t + MISS_MS)[p.key], 'blank')
  assert.deepEqual(input(h, key(p.key), t + 10).events, [], 'a tapped friend\'s key is empty')
  // nothing pops up on its key while it is red
  let r = h
  for (let u = t; u < t + MISS_MS; u += 10) {
    r = step(r, u)
    assert.ok(![...r.mice, ...r.pets].some(x => x.key === p.key), `nothing on the red key at ${u}`)
  }

  // the third ends the game at once: a loss, with the points scored so far and no miss sound on top
  const third = input({ ...g, score: 7, petTaps: MICE_PETS_OUT - 1 }, key(p.key), t)
  assert.equal(third.over, true)
  assert.equal(third.outcome, 'lose')
  assert.equal(third.endedAt, t)
  assert.equal(third.score, 7)
  assert.deepEqual(third.events, ['lose'])
  assert.equal(gameFaces(third, t)[p.key], `oops:${p.pet}`, 'the last board shows the friend it ended on')
  assert.equal(step(third, t + 5000).over, true)
  assert.deepEqual(json(third), third)
})

test('G54 Whack-a-Mouse names who was tapped (Jon, 29 Oct 2026: "they have these personas of friends to the family and the birthday boy"): Miss Boo, Granolia, the birthday boy, Salem or Zimothy Clawford, Esq., on the strip, with one full stop', () => {
  assert.deepEqual(FRIEND_NAMES, { boo: 'Miss Boo', granola: 'Granolia', irwin: 'the birthday boy', salem: 'Salem', zimmy: 'Zimothy Clawford, Esq.' })
  assert.deepEqual(Object.keys(FRIEND_NAMES).sort(), [...PETS].sort(), 'a name for each of the five')
  const T = 10000
  const g0 = { ...newGame('mice', { seed: 21, lengthMs: 120000, now: 0 }), at: T - 1, mice: [], pets: [], nextSpawnAt: 100000 }
  for (const pet of PETS) {
    const first = input({ ...g0, pets: [{ key: 4, pet, downAt: T + 1000 }] }, key(4), T)
    assert.deepEqual(first.said, { words: `Strike 1! ${STRUCK[pet]}`, until: T + STRIKE_WORDS_MS })
    const second = input({ ...first, pets: [{ key: 9, pet, downAt: T + 1000 }] }, key(9), T + 100)
    assert.equal(second.said.words, `Strike 2! ${STRUCK[pet]}`)
    assert.ok(second.said.words.endsWith('.') && !second.said.words.endsWith('..'), 'one full stop')
  }
})

test('G54 Whack-a-Mouse is fair: a key a mouse has just left rests a moment, and a tapped friend\'s key stays red and empty, so a late tap never meets a friend', () => {
  // every key but K busy, so whatever comes up can only come up on K
  const K = keyAt(2, 4), T = 10000
  const g0 = newGame('mice', { seed: 21, lengthMs: 120000, now: 0 })
  const busy = ALL_KEYS.filter(k => k !== K).map(k => ({ key: k, until: 100000, late: 0, gold: false }))
  const board = extra => ({ ...g0, at: T - 1000, mice: [], pets: [], rests: busy, flashes: [], nextSpawnAt: 100000, ...extra })
  // what comes up when one is due at `t`
  const comesUp = (g, t) => { const s = step({ ...g, nextSpawnAt: t }, t); return [...s.mice, ...s.pets].map(x => x.key) }
  assert.deepEqual(comesUp(board(), T), [K], 'K is free')

  // a mouse that hides: its key rests, then is free again
  const hid = step(board({ mice: [{ key: K, gold: false, downAt: T }] }), T)
  assert.deepEqual(hid.mice, [])
  assert.deepEqual(comesUp(hid, T), [], 'nothing comes up where it hid, the same moment')
  assert.deepEqual(comesUp(hid, T + MICE_REST_MS - 1), [], 'nor while its key rests')
  assert.deepEqual(comesUp(hid, T + MICE_REST_MS), [K], 'then the key is free')
  assert.ok(MICE_REST_MS > MICE_LATE_MS, 'it rests past the late tap\'s moment')
  // a mouse tapped: the same
  const hit = input(board({ mice: [{ key: K, gold: false, downAt: T + 1000 }] }), key(K), T)
  assert.deepEqual(hit.events, ['point'])
  assert.deepEqual(comesUp(hit, T + MICE_REST_MS - 1), [])
  assert.deepEqual(comesUp(hit, T + MICE_REST_MS), [K])
  // a friend tapped: its key is red, and empty, all the time it is red
  const oops = input(board({ pets: [{ key: K, pet: 'zimmy', downAt: T + 1000 }] }), key(K), T)
  for (let u = T; u < T + MISS_MS; u += 25) assert.equal(gameFaces(oops, u)[K], 'oops:zimmy', `red at ${u}`)
  assert.equal(gameFaces(oops, T + MISS_MS)[K], 'blank')
  assert.deepEqual(comesUp(oops, T + MISS_MS - 1), [])
  assert.deepEqual(comesUp(oops, T + MISS_MS), [K])
  // a key a friend has just left is free at once (a friend leaves no rest): what comes up there may be a mouse or another friend
  const petHid = step(board({ pets: [{ key: K, pet: 'salem', downAt: T }] }), T)
  assert.deepEqual(comesUp(petHid, T), [K])
  // the late tap meant for a mouse that hid lands on its rested key: never a friend there to meet it
  for (let u = T; u < T + MICE_LATE_MS; u += 10) assert.deepEqual(input(hid, key(K), u).events, ['point'], `a late tap at ${u}`)
})

test('G54 Knock It Off the Table (Jon, 29 Oct 2026: "linear", "a few tables"; 30 Oct: "Use the whole screen"): four tables, one a row, the first and third running to the right and the second and fourth to the left; everything slides one key along each beat and never jumps; at most two on a table, at least three keys apart; the beat quickens, to top speed as the game ends (Jon, 1 Nov 2026: "The knock off is hard"), and new things come more often', () => {
  assert.deepEqual(TABLE_WAYS, [1, -1, 1, -1])
  assert.deepEqual(TABLE_ENDS, [keyAt(0, END), keyAt(1, 0), keyAt(2, END), keyAt(3, 0)])
  assert.deepEqual([0, 1, 2, 3].map(tableEndCol), [END, 0, END, 0])
  assert.deepEqual([0, 1, 2, 3].map(tableStartCol), [0, END, 0, END])
  assert.deepEqual([KNOCK_PER_TABLE, KNOCK_APART], [2, 3])
  assert.deepEqual([KNOCK_BEAT_MS, KNOCK_BEAT_END_MS, KNOCK_TOP_AT, KNOCK_EVERY_BEATS, KNOCK_EVERY_BEATS_END], [500, 300, 1, 3, 1], 'slower at the start since 31 Oct 2026, its top speed slower and only at the end since 1 Nov 2026')
  const g0 = newGame('knock', { seed: 5, lengthMs: 120000, now: 0 })
  const f0 = gameFaces(g0, 0)
  for (let r = 0; r < ROWS; r++) assert.deepEqual(rowFaces(f0, r), TABLE_WAYS[r] > 0 ? [...Array(END).fill('cloth'), 'edge'] : ['edge-left', ...Array(END).fill('cloth')], `table ${r + 1}`)
  // the first beat brings the first thing, at the start of a table
  assert.equal(g0.nextAt, KNOCK_BEAT_MS)
  let g = step(g0, KNOCK_BEAT_MS - 1)
  assert.deepEqual(g.things, [])
  g = step(g, KNOCK_BEAT_MS)
  assert.equal(g.things.length, 1)
  const first = g.things[0]
  const way = TABLE_WAYS[first.row], start = tableStartCol(first.row)
  assert.equal(first.col, start)
  assert.equal(first.obj, KNOCK_OBJECTS[0])
  assert.equal(gameFaces(g, g.at)[keyAt(first.row, start)], `table:${first.obj}`)
  // beat by beat, one key along its table's way, on the beat and not before
  for (let n = 1; n <= END; n++) {
    const col = start + n * way
    const beat = g.nextAt
    assert.equal(step(g, beat - 1).things.find(x => x.obj === first.obj).col, col - way, 'not before its beat')
    g = step(g, beat)
    const x = g.things.find(y => y.obj === first.obj)
    assert.equal(x.col, col)
    assert.equal(x.row, first.row)
    assert.equal(gameFaces(g, beat)[keyAt(first.row, col)], `${n === END ? (way > 0 ? 'edge' : 'edge-left') : 'table'}:${first.obj}`)
    assert.equal(gameFaces(g, beat)[keyAt(first.row, col - way)], 'cloth', 'and gone from the key before')
  }
  // the things come in KNOCK_OBJECTS's order
  assert.deepEqual(g.things.filter(x => !x.friend).map(x => x.obj), KNOCK_OBJECTS.slice(0, g.things.filter(x => !x.friend).length))

  // whole games, everything on an end knocked off as it comes (never a friend)
  const beatAt = at => KNOCK_BEAT_MS + (KNOCK_BEAT_END_MS - KNOCK_BEAT_MS) * Math.min(1, at / (120000 * KNOCK_TOP_AT))
  for (const seed of [1, 2, 3]) {
    let s = newGame('knock', { seed, lengthMs: 120000, now: 0 })
    let prev = s
    const rows = new Set(), beats = [], made = []
    const nameOf = x => x.obj ?? `friend:${x.friend}:${x.row}`
    for (let t = 0; t <= 120000 && !s.over; t += TICK) {
      s = stepGame(s, t)
      const objs = s.things.filter(x => !x.friend).map(x => x.obj)
      assert.equal(new Set(objs).size, objs.length, 'each thing on the tables is its own')
      for (const x of s.things) {
        rows.add(x.row)
        const was = prev.things.find(y => y.row === x.row && nameOf(y) === nameOf(x) && Math.abs(y.col - x.col) <= 1)
        if (!was) { assert.equal(x.col, tableStartCol(x.row), 'a new thing starts at the start of its table'); continue }
        assert.equal(x.row, was.row, 'it stays on its table')
        assert.ok(x.col === was.col || x.col === was.col + TABLE_WAYS[x.row], `one key at a time its table's way, never a jump: ${was.col} to ${x.col}`)
        if (x.col !== was.col) assert.equal(s.beats, prev.beats + 1, 'and only on a beat')
      }
      for (let r = 0; r < ROWS; r++) {
        const on = s.things.filter(x => x.row === r).map(x => x.col).sort((a, b) => a - b)
        assert.ok(on.length <= KNOCK_PER_TABLE, `at most two on table ${r + 1}`)
        const moving = s.things.filter(x => x.row === r && x.goneAt == null).map(x => x.col).sort((a, b) => a - b) // one sitting on its end its last beat may be closer
        for (let i = 1; i < moving.length; i++) assert.ok(moving[i] - moving[i - 1] >= KNOCK_APART, `three keys apart: ${moving}`)
      }
      if (s.beats > prev.beats) {
        assert.equal(s.beats, prev.beats + 1, 'one beat at a time')
        beats.push([prev.nextAt, s.nextAt - prev.nextAt])
        made.push([prev.nextAt, s.things.length - prev.things.length + (prev.things.length - s.things.filter(x => prev.things.some(y => y.row === x.row && nameOf(y) === nameOf(x))).length)])
      }
      for (const x of s.things.filter(y => y.col === tableEndCol(y.row) && !y.friend)) s = inputGame(s, key(TABLE_ENDS[x.row]), t)
      prev = s
    }
    assert.equal(s.outcome, 'time', 'nothing got away')
    assert.equal(s.strikes, 0)
    assert.equal(s.score, s.knocked * KNOCK_POINTS)
    assert.deepEqual([...rows].sort(), [0, 1, 2, 3], 'all four tables')
    // the beat quickens from KNOCK_BEAT_MS to KNOCK_BEAT_END_MS, top speed at the end
    for (const [at, ms] of beats) assert.ok(near(ms, beatAt(at)), `a beat of ${ms} at ${at}`)
    assert.ok(beats[0][1] > KNOCK_BEAT_MS - 5 && beats.at(-1)[1] < KNOCK_BEAT_END_MS + 5)
    // a new thing about every third beat at first, nearly every beat by the end (as the room on the tables allows)
    const rate = list => list.reduce((n, [, x]) => n + x, 0) / list.length
    assert.ok(Math.abs(rate(made.filter(([at]) => at < 30000)) - 1 / KNOCK_EVERY_BEATS) < 0.06, `${rate(made.filter(([at]) => at < 30000))} a beat at first`)
    assert.ok(rate(made.filter(([at]) => at >= 90000)) > 0.7, `${rate(made.filter(([at]) => at >= 90000))} a beat by the end`)
  }
})

test('G54 Knock It Off the Table (Jon, 29 Oct 2026: "button press only"): only the key at the end of a table knocks; a press a moment early knocks the thing about to arrive; a thing on the end can be knocked until a moment after the beat it leaves on, then it got away; an empty end is a strike; dials and the strip do nothing', () => {
  const g0 = newGame('knock', { seed: 5, lengthMs: 120000, now: 0 })
  const T = 10000
  const board = things => ({ ...g0, at: T - 1000, beats: 4, things, nextAt: T }) // the beat at T brings nothing new (every third beat)
  // with a thing on the end of the second table: every other key, the dials, the strip, the arrows and the presses do nothing
  const one = board([{ row: 1, col: 0, obj: 'vase', friend: null, goneAt: null }]) // the second table ends at the left
  for (const ev of [...ALL_KEYS.filter(k => !TABLE_ENDS.includes(k)).map(key), turn(LEFT_DIAL, 1), turn(RIGHT_DIAL, -1), turn(2, 3), press(0), press(5), tap(1100), tap(0), swipe(0, 1199), arrow('right'), arrow('down')]) {
    assert.deepEqual(input(one, ev, T - 500), step(one, T - 500), JSON.stringify(ev))
  }
  // its end key: knocked off, a point, the knock, the green tick on the end
  const k = input(one, key(TABLE_ENDS[1]), T - 500)
  assert.deepEqual(k.events, ['knock'])
  assert.equal(k.score, KNOCK_POINTS)
  assert.equal(k.knocked, 1)
  assert.deepEqual(k.things, [])
  assert.equal(k.strikes, 0)
  assert.equal(gameFaces(k, T - 500)[TABLE_ENDS[1]], 'hit')
  assert.equal(gameFaces(k, T - 500 + HIT_MS)[TABLE_ENDS[1]], 'edge-left')
  // another table's end: nothing there, a strike, and the vase stays
  const wrong = input(one, key(TABLE_ENDS[0]), T - 500)
  assert.equal(wrong.strikes, 1)
  assert.equal(wrong.things.length, 1)

  // a moment early (KNOCK_EARLY_MS before the beat it arrives on): the thing about to arrive
  const coming = board([{ row: 2, col: END - 1, obj: 'teapot', friend: null, goneAt: null }])
  for (const t of [T - KNOCK_EARLY_MS, T - 1]) {
    const e = input(coming, key(TABLE_ENDS[2]), t)
    assert.deepEqual(e.events, ['knock'], `a press at ${t}`)
    assert.equal(e.knocked, 1)
  }
  const soon = input(coming, key(TABLE_ENDS[2]), T - KNOCK_EARLY_MS - 1)
  assert.deepEqual(soon.events, ['miss'], 'any sooner is too soon')
  assert.equal(soon.strikes, 1)
  assert.deepEqual(soon.said, { words: 'Strike 1! Too soon.', until: T - KNOCK_EARLY_MS - 1 + STRIKE_WORDS_MS })
  assert.equal(step(soon, T).things[0].col, END, 'and it still comes')

  // on the end: from its arrival to KNOCK_LATE_MS after the next beat, when it would leave
  const arrived = board([{ row: 3, col: 0, obj: 'cake', friend: null, goneAt: null }]) // the fourth table ends at the left
  const sat = step(arrived, T)
  assert.equal(sat.things[0].col, 0, 'it stays on the end a beat')
  assert.equal(sat.things[0].goneAt, T + KNOCK_LATE_MS)
  for (const t of [T - 400, T, T + KNOCK_LATE_MS - 1]) assert.deepEqual(input(t < T ? arrived : sat, key(TABLE_ENDS[3]), t).events, ['knock'], `a press at ${t}`)
  // then it got away: a strike, its words, the red cross on its end
  const away = step(sat, T + KNOCK_LATE_MS)
  assert.deepEqual(away.things, [])
  assert.equal(away.strikes, 1)
  assert.deepEqual(away.events, ['miss'])
  assert.deepEqual(away.said, { words: 'Strike 1! It got away.', until: T + KNOCK_LATE_MS + STRIKE_WORDS_MS })
  assert.equal(gameFaces(away, T + KNOCK_LATE_MS)[TABLE_ENDS[3]], 'miss')
  assert.equal(rowFaces(gameFaces(away, T + KNOCK_LATE_MS), 3).filter(f => f === 'miss').length, 1, 'the cross on the end key only (31 Oct 2026)')
  assert.equal(gameFaces(away, T + KNOCK_LATE_MS + MISS_MS)[TABLE_ENDS[3]], 'edge-left')
  assert.equal(away.score, 0)

  // an empty end: a strike, "Too soon.", the red cross on it
  const empty = input(g0, key(TABLE_ENDS[0]), 100)
  assert.equal(empty.strikes, 1)
  assert.deepEqual(empty.events, ['miss'])
  assert.deepEqual(empty.said, { words: 'Strike 1! Too soon.', until: 100 + STRIKE_WORDS_MS })
  assert.equal(gameFaces(empty, 100)[TABLE_ENDS[0]], 'miss')
  assert.equal(gameFaces(empty, 100 + MISS_MS)[TABLE_ENDS[0]], 'edge')
  const again = input(empty, key(TABLE_ENDS[0]), 200)
  assert.equal(again.strikes, 2, 'and again while the cross shows')
  assert.equal(again.said.words, 'Strike 2! Too soon.')
  // the third strike ends it: a loss, the points kept, no miss sound on top
  const third = input({ ...one, strikes: STRIKES_OUT - 1, score: 4, knocked: 4 }, key(TABLE_ENDS[0]), T - 500)
  assert.equal(third.over, true)
  assert.equal(third.outcome, 'lose')
  assert.equal(third.endedAt, T - 500)
  assert.equal(third.score, 4)
  assert.deepEqual(third.events, ['lose'])
  assert.equal(gameFaces(third, T - 500)[TABLE_ENDS[0]], 'miss', 'the last board shows the miss')
  // left alone, three get away
  const alone = step(g0, 120000)
  assert.equal(alone.outcome, 'lose')
  assert.equal(alone.strikes, STRIKES_OUT)
})

test('G54 Knock It Off the Table: a press a moment after a thing got away costs that one strike, not a second one worded "Too soon."; forgiven for KNOCK_GONE_MS, once, on its own table\'s end only', () => {
  assert.equal(KNOCK_GONE_MS, 300)
  const g0 = newGame('knock', { seed: 5, lengthMs: 120000, now: 0 })
  const T = 10000
  const sat = step({ ...g0, at: T - 1000, beats: 4, things: [{ row: 3, col: 0, obj: 'cake', friend: null, goneAt: null }], nextAt: T }, T)
  const goneAt = sat.things[0].goneAt
  const late = input(sat, key(TABLE_ENDS[3]), goneAt + 10)
  assert.equal(late.strikes, 1, 'one strike: it got away')
  assert.equal(late.said?.words, 'Strike 1! It got away.')
  // from the moment it got away until KNOCK_GONE_MS after: the getting away's strike and its sound, and nothing more
  for (const at of [goneAt, goneAt + 150, goneAt + KNOCK_GONE_MS - 1]) {
    const p = input(sat, key(TABLE_ENDS[3]), at)
    assert.equal(p.strikes, 1, `a press ${at - goneAt} ms after`)
    assert.deepEqual(p.events, ['miss'])
    assert.equal(p.said.words, 'Strike 1! It got away.')
  }
  // once for each thing: a second press is a strike of its own
  const twice = input(late, key(TABLE_ENDS[3]), goneAt + 20)
  assert.equal(twice.strikes, 2)
  assert.deepEqual(twice.events, ['miss'])
  assert.equal(twice.said.words, 'Strike 2! Too soon.')
  // not from KNOCK_GONE_MS on, and not on another table's end
  const gone = step(sat, goneAt)
  assert.equal(input(gone, key(TABLE_ENDS[3]), goneAt + KNOCK_GONE_MS).strikes, 2, 'too late to be forgiven')
  assert.equal(input(gone, key(TABLE_ENDS[0]), goneAt + 10).strikes, 2, "another table's end is a strike")
  assert.equal(input(gone, key(TABLE_ENDS[0]), goneAt + 10).said.words, 'Strike 2! Too soon.')
  assert.deepEqual(json(late), late, 'still plain JSON')
  // and the next thing on that table still knocks off as ever
  const next = input({ ...late, things: [{ row: 3, col: 0, obj: 'vase', friend: null, goneAt: null }] }, key(TABLE_ENDS[3]), goneAt + 30)
  assert.deepEqual(next.events, ['knock'])
  assert.equal(next.strikes, 1)
})

test('G54 Knock It Off the Table: a thing that comes onto a table\'s end shows over the green tick or the red cross still on it, so it is never hidden', () => {
  const g0 = newGame('knock', { seed: 5, lengthMs: 120000, now: 0 })
  const T = 10000
  // a vase coming onto the third table's end at the beat, T + 200
  const coming = { ...g0, at: T - 1000, beats: 4, nextAt: T + 200, things: [{ row: 2, col: END - 1, obj: 'vase', friend: null, goneAt: null }] }
  // a cake on that end gets away at T + 100: the red cross is still on the end when the vase comes
  const missed = step({ ...coming, things: [{ row: 2, col: END, obj: 'cake', friend: null, goneAt: T + 100 }, ...coming.things] }, T + 200)
  assert.equal(missed.strikes, 1)
  assert.ok(missed.flashes.some(f => f.key === TABLE_ENDS[2] && f.face === 'miss' && f.until > T + 200), 'the cross is still there')
  assert.equal(gameFaces(missed, T + 200)[TABLE_ENDS[2]], 'edge:vase')
  // a cake knocked off at T: the green tick is still on the end when the vase comes
  const hit = input({ ...coming, things: [{ row: 2, col: END, obj: 'cake', friend: null, goneAt: null }, ...coming.things] }, key(TABLE_ENDS[2]), T)
  const knocked = step(hit, T + 200)
  assert.equal(knocked.knocked, 1)
  assert.ok(knocked.flashes.some(f => f.key === TABLE_ENDS[2] && f.face === 'hit' && f.until > T + 200), 'the tick is still there')
  assert.equal(gameFaces(knocked, T + 200)[TABLE_ENDS[2]], 'edge:vase')
  // with nothing on it, the end shows its tick or its cross
  assert.equal(gameFaces(hit, T + 100)[TABLE_ENDS[2]], 'hit')
  assert.equal(gameFaces(step({ ...coming, things: [{ row: 2, col: END, obj: 'cake', friend: null, goneAt: T + 100 }] }, T + 200), T + 200)[TABLE_ENDS[2]], 'miss')
  // and a thing further along the table shows over a flash as well
  const along = { ...g0, at: T - 1, nextAt: T + 400, things: [{ row: 1, col: 3, obj: 'clock', friend: null, goneAt: null }], flashes: [{ key: keyAt(1, 3), face: 'miss', until: T + 300 }] }
  assert.equal(gameFaces(along, T)[keyAt(1, 3)], 'table:clock')
})

test('G54 Knock It Off the Table (Jon, 30 Oct 2026): Sir Irwin and his friends sit on the tables from ten seconds in, about one in four of what comes on; one knocked off is a strike that says who, their face under the cross on the end, and one that reaches the end just goes, no strike; the window (wider again since 1 Nov 2026); every miss turns the whole table red; the boxes say Misses on the strip and the screen', () => {
  assert.deepEqual([KNOCK_FRIENDS_FROM_MS, KNOCK_FRIEND_ONE_IN, KNOCK_LATE_MS, KNOCK_EARLY_MS], [10000, 4, 200, 120])
  assert.equal(MARK_LABELS.knock, 'Misses')
  // whole games: friends come after ten seconds, about one in four, each of the five; left alone they go at the end with no strike
  let friends = 0, things = 0
  const met = new Set()
  for (let seed = 1; seed <= 12; seed++) {
    let g = newGame('knock', { seed, lengthMs: 120000, now: 0 })
    let prev = g
    for (let t = 0; t <= 120000 && !g.over; t += TICK) {
      g = stepGame(g, t)
      for (const x of g.things) {
        if (prev.things.some(y => y.row === x.row && y.col === x.col && y.friend === x.friend && y.obj === x.obj) || x.col !== tableStartCol(x.row)) continue
        things += 1
        if (x.friend) { friends += 1; met.add(x.friend); assert.ok(t >= KNOCK_FRIENDS_FROM_MS, 'from ten seconds in'); assert.equal(x.obj, null) }
        else assert.ok(KNOCK_OBJECTS.includes(x.obj))
      }
      // a friend that went from the end cost nothing
      for (const y of prev.things.filter(y => y.friend && y.goneAt != null && y.goneAt <= t)) if (!g.things.includes(y)) assert.equal(g.strikes, prev.strikes, 'a friend that goes is no strike')
      // every thing on the tables is drawn where it is, friends on the cloth or an end
      const f = gameFaces(g, t)
      for (const x of g.things) {
        const where = x.col !== tableEndCol(x.row) ? 'table' : TABLE_WAYS[x.row] > 0 ? 'edge' : 'edge-left'
        assert.equal(f[keyAt(x.row, x.col)], x.friend ? `${where}-pet:${x.friend}` : `${where}:${x.obj}`)
      }
      for (const x of g.things.filter(y => y.col === tableEndCol(y.row) && !y.friend)) g = inputGame(g, key(TABLE_ENDS[x.row]), t)
      prev = g
    }
    assert.equal(g.outcome, 'time', `seed ${seed}: the friends left alone, nothing got away`)
    assert.equal(g.strikes, 0)
  }
  assert.ok(Math.abs(friends / things - 1 / KNOCK_FRIEND_ONE_IN) < 0.05, `${friends} friends of ${things}`)
  assert.deepEqual([...met].sort(), [...PETS].sort(), 'all five come')
  // a friend knocked off: a strike that says who, the friend's face under the cross on the end, the whole table red, no points
  const g0 = newGame('knock', { seed: 5, lengthMs: 120000, now: 0 })
  const T = 20000
  const board = things => ({ ...g0, at: T - 1000, beats: 4, things, nextAt: T })
  for (const [row, pet] of [[0, 'irwin'], [1, 'zimmy'], [3, 'granola']]) {
    const g = board([{ row, col: tableEndCol(row), obj: null, friend: pet, goneAt: null }])
    const k = input(g, key(TABLE_ENDS[row]), T - 500)
    assert.deepEqual([k.strikes, k.friendsOff, k.knocked, k.score, k.things], [1, 1, 0, 0, []], pet)
    assert.deepEqual(k.events, ['miss'])
    assert.equal(k.said.words, `Strike 1! ${STRUCK[pet]}`)
    const f = gameFaces(k, T - 500)
    assert.equal(f[TABLE_ENDS[row]], `oops:${pet}`, 'the friend under the cross on the end')
    assert.ok(rowFaces(f, row).every((x, c) => (keyAt(row, c) === TABLE_ENDS[row] ? x === `oops:${pet}` : x === 'cloth')), 'the rest of the table as it was (31 Oct 2026)')
    assert.equal(gameFaces(k, T - 500 + MISS_MS)[TABLE_ENDS[row]], TABLE_WAYS[row] > 0 ? 'edge' : 'edge-left')
    // a moment early knocks the friend coming too
    const coming = board([{ row, col: tableEndCol(row) - TABLE_WAYS[row], obj: null, friend: pet, goneAt: null }])
    assert.equal(input(coming, key(TABLE_ENDS[row]), T - KNOCK_EARLY_MS).strikes, 1)
  }
  // a friend on the end a beat, then gone, quietly
  const sat = step(board([{ row: 2, col: END, obj: null, friend: 'salem', goneAt: null }]), T)
  assert.equal(sat.things[0].goneAt, T + KNOCK_LATE_MS)
  const went = step(sat, T + KNOCK_LATE_MS)
  assert.deepEqual([went.things.filter(x => x.friend), went.strikes, went.events, went.gotAway], [[], 0, [], []])
  // the third friend knocked off ends it like any third miss
  const third = input({ ...board([{ row: 0, col: END, obj: null, friend: 'boo', goneAt: null }]), strikes: STRIKES_OUT - 1, score: 5 }, key(TABLE_ENDS[0]), T - 500)
  assert.deepEqual([third.over, third.outcome, third.score], [true, 'lose', 5])
  // a plain miss: the cross on that table's end key, nothing else touched
  const empty = input(g0, key(TABLE_ENDS[1]), 100)
  const fe = gameFaces(empty, 100)
  assert.equal(fe[TABLE_ENDS[1]], 'miss')
  assert.equal(fe.filter(x => x === 'miss').length, 1)
  // the boxes are labelled Misses on the strip and the screen; Strikes in the other two games
  const [a, ta] = started('knock')
  const v = arcadeView(a, ta)
  assert.deepEqual(v.strip.marks, marksOf('knock', 0))
  assert.deepEqual(v.screen.marks, marksOf('knock', 0))
  assert.deepEqual(MARK_LABELS, { pointer: 'Strikes', mice: 'Strikes', knock: 'Misses', yarn: 'Misses' })
  const page = src('../src/screens/Arcade.jsx')
  assert.match(page, /<span className="arcade-strikes-label">\{label\}<\/span>/)
  assert.match(page, /\{screen\.marks\.label \|\| 'Strikes'\}: \{screen\.marks\.used\} of \{screen\.marks\.of\}/)
  // and the how-to says to leave the friends
  assert.equal(GAMES.find(g => g.id === 'knock').how, 'Things slide along four tables, two one way and two the other. Press the key at the end of a table as something reaches it, and knock it off. Leave Sir Irwin and his friends on the table.')
})

test('G54 Yarn Catch (Jon, 29 Oct 2026: "it is skipping a row"): every ball drops exactly one row a step and shows on every row, the bottom one too, where it waits a moment for the basket before it is missed', () => {
  const g0 = newGame('yarn', { seed: 9, lengthMs: 120000, now: 0 })
  assert.equal(g0.basket, 4)
  const f0 = gameFaces(g0, 0)
  assert.equal(f0[keyAt(3, 4)], 'basket')
  assert.equal(f0.filter(f => f === 'blank').length, KEY_COUNT - 1)
  // the first ball comes at once, on the top row
  const g = step(g0, 0)
  assert.equal(g.balls.length, 1)
  assert.equal(g.balls[0].row, 0)
  assert.equal(gameFaces(g, 0)[keyAt(0, g.balls[0].col)], g.balls[0].gold ? 'yarn-gold' : 'yarn')
  assert.ok(near(g.balls[0].nextAt, YARN_STEP_MS))

  // a ball over the seventh column, the basket under the fifth: row by row
  const T = 10000
  let s = { ...g0, at: T, nextSpawnAt: 100000, balls: [{ col: 6, row: 0, gold: false, nextAt: T + 100, missAt: null }] }
  let at = T + 100
  for (let row = 1; row < ROWS; row++) {
    assert.equal(step(s, at - 1).balls[0].row, row - 1, 'not before its step')
    s = step(s, at)
    assert.equal(s.balls[0].row, row, `one row down: row ${row + 1}`)
    const f = gameFaces(s, at)
    assert.equal(f[keyAt(row, 6)], 'yarn', 'it shows there')
    assert.equal(f.filter(x => x === 'yarn').length, 1, 'and nowhere else')
    if (row < ROWS - 1) {
      assert.ok(near(s.balls[0].nextAt - at, over2min(YARN_STEP_MS, YARN_STEP_END_MS, at)))
      at = s.balls[0].nextAt
    }
  }
  // on the bottom row beside the basket, it waits YARN_LAND_MS
  assert.equal(s.balls[0].missAt, at + YARN_LAND_MS)
  assert.equal(step(s, at + YARN_LAND_MS - 1).balls.length, 1)
  const missed = step(s, at + YARN_LAND_MS)
  assert.deepEqual(missed.balls, [])
  assert.equal(missed.dropped, 1)
  assert.equal(missed.score, 0)
  assert.deepEqual(missed.events, ['miss'])
  assert.equal(gameFaces(missed, at + YARN_LAND_MS)[keyAt(3, 6)], 'yarn-miss')
  assert.equal(gameFaces(missed, at + YARN_LAND_MS + MISS_MS)[keyAt(3, 6)], 'blank')
  // the basket slid under it in time: caught
  const saved = input(s, colTap(6), at + 100) // slid under it (30 Oct 2026: the strip is the rail)
  assert.equal(saved.basket, 6)
  assert.equal(saved.caught, 1)
  assert.equal(saved.score, YARN_POINTS)
  assert.deepEqual(saved.events, ['point'])
  assert.deepEqual(saved.balls, [])
  assert.equal(gameFaces(saved, at + 100)[keyAt(3, 6)], 'basket-catch')
  // a ball landing in the basket is caught as it lands; gold is worth more
  const over = { ...g0, at: T, nextSpawnAt: 100000, balls: [{ col: 4, row: 2, gold: true, nextAt: T + 100, missAt: null }] }
  const caught = step(over, T + 100)
  assert.equal(caught.score, YARN_GOLD_POINTS)
  assert.deepEqual(caught.events, ['gold'])
  assert.deepEqual(caught.balls, [])
  assert.equal(gameFaces(caught, T + 100)[keyAt(3, 4)], 'basket-catch')
  assert.equal(gameFaces(caught, T + 100 + HIT_MS)[keyAt(3, 4)], 'basket')
  // three falling and no more, each in a column of its own
  const three = { ...g0, at: T, balls: [0, 1, 2].map(col => ({ col, row: 0, gold: col === 1, nextAt: T + 5000, missAt: null })), nextSpawnAt: T + 100 }
  const f = gameFaces(three, T)
  assert.deepEqual([f[0], f[1], f[2]], ['yarn', 'yarn-gold', 'yarn'])
  assert.equal(step(three, T + 100).balls.length, YARN_FALLING, 'no fourth ball')

  // whole games: every ball is seen on row after row from the top, none skipped. One ball to a
  // column, so a column names its ball while it falls. With the basket left in the middle (even
  // seeds), a ball over it is caught as it lands, so it is seen on the top three rows; every other
  // ball is seen on all four and missed from the bottom row, and the fifth miss ends the game
  // (30 Oct 2026). With the basket chasing (odd seeds), nearly every ball is caught and the game
  // runs its time; a friend on the way down is dodged, and one on the floor is seen on all four rows.
  for (const seed of [1, 2, 3, 4]) {
    let y = newGame('yarn', { seed, lengthMs: 120000, now: 0 })
    const falling = new Map() // a column: the rows its ball has been seen on
    const gone = [] // each ball gone before the end: its column and the rows it was seen on
    for (let t = 0; t <= 120000 && !y.over; t += TICK) {
      y = stepGame(y, t)
      assert.ok(y.balls.length <= YARN_FALLING)
      assert.equal(new Set(y.balls.map(b => b.col)).size, y.balls.length, 'one ball to a column')
      for (const [col, seen] of falling) {
        const b = y.balls.find(x => x.col === col)
        if (!b || b.row < seen.rows.at(-1)) { if (!y.over) gone.push({ col, rows: seen.rows.join(''), friend: seen.friend }); falling.delete(col) }
      }
      for (const b of y.balls) {
        const seen = falling.get(b.col)
        if (!seen) { assert.equal(b.row, 0, 'a new ball starts on the top row'); falling.set(b.col, { rows: [0], friend: b.friend }) }
        else if (seen.rows.at(-1) !== b.row) { assert.equal(b.row, seen.rows.at(-1) + 1, 'one row a step, never two'); seen.rows.push(b.row) }
        assert.match(gameFaces(y, t)[keyAt(b.row, b.col)], b.friend ? /^pet:/ : /^yarn/, 'it shows where it is')
      }
      if (seed % 2 && t % (3 * TICK) === 0) { const ev = yarnChase(y); if (ev) y = inputGame(y, ev, t) }
    }
    const balls = gone.filter(b => !b.friend)
    for (const b of gone) assert.ok(['012', '0123'].includes(b.rows), `a ball in column ${b.col + 1} was seen on rows ${b.rows}`)
    if (seed % 2 === 0) {
      assert.equal(y.outcome, 'lose', 'the basket left in the middle: five balls fall')
      assert.equal(y.strikes, YARN_MISSES_OUT)
      assert.equal(y.basket, 4)
      for (const b of balls) assert.equal(b.rows, b.col === 4 ? '012' : '0123', `column ${b.col + 1}`)
      assert.equal(y.caught, balls.filter(b => b.col === 4).length, 'the ones over the basket caught')
      assert.equal(y.dropped, balls.filter(b => b.col !== 4).length + 1, 'the rest missed (the fifth ended the game before it was written down)')
    } else {
      assert.equal(y.outcome, 'time')
      assert.ok(gone.length > 50, `${gone.length} balls`)
      assert.ok(y.caught > 50 && y.caught > 10 * y.dropped, `a basket that chases catches nearly all: ${y.caught} caught, ${y.dropped} missed`)
      for (const b of gone.filter(b => b.friend)) assert.equal(b.rows, '0123', 'a friend dodged falls all the way')
    }
  }
})

test('G54 Yarn Catch (Jon, 31 Oct 2026: "I do want the swipe", "go back to the dial left and right"; 1 Nov 2026: "swipe fully across the entire touch strip"): the left dial moves the basket a column a click, off one edge and in at the other, the arrows too; a slide along the strip puts it in the column over where the finger lifted, so a slide all the way across takes it from one side to the other, never round the edge; a tap, the right dial and the keys do nothing', () => {
  const g0 = newGame('yarn', { seed: 9, lengthMs: 120000, now: 0 })
  const at = 100
  const moved = ev => input(g0, ev, at).basket
  // the dial
  assert.equal(moved(turn(LEFT_DIAL, 1)), 5)
  assert.equal(moved(turn(LEFT_DIAL, -1)), 3)
  assert.equal(moved(turn(LEFT_DIAL, 4)), 8)
  assert.equal(moved(turn(LEFT_DIAL, 5)), 0, 'round the right edge')
  assert.equal(moved(turn(LEFT_DIAL, -5)), 8, 'round the left edge')
  assert.equal(moved(turn(LEFT_DIAL, 40)), (4 + DIAL_MAX_KEYS) % COLS, 'six keys at most for one report')
  // a slide: the column over where the finger lifted, wherever the basket was and wherever the slide began
  for (let basket = 0; basket < COLS; basket++) {
    const from = { ...g0, basket }
    const slid = ev => input(from, ev, at).basket
    assert.equal(slid(swipe(0, STRIP_WIDTH - 1)), END, 'all the way across to the right: the far right, not round the edge')
    assert.equal(slid(swipe(STRIP_WIDTH - 1, 0)), 0, 'all the way across to the left: the far left')
    for (let c = 0; c < COLS; c++) {
      assert.equal(slid(swipe(c < 4 ? 1100 : 100, COLUMN_X[c])), c, `lifted under the key in column ${c}`)
      if (c > 0) assert.equal(slid(swipe(600, COLUMN_X[c - 1] + 1 + (COLUMN_X[c] - COLUMN_X[c - 1]) / 2)), c, 'past the middle of the gap, the nearer key')
    }
  }
  assert.equal(moved(swipe(600, 640)), 4, 'a short slide stays where the finger is')
  // the arrows wrap too
  assert.equal(moved(arrow('left')), 3)
  assert.equal(moved(arrow('right')), 5)
  assert.equal(input({ ...g0, basket: 0 }, arrow('left'), at).basket, END)
  assert.equal(input({ ...g0, basket: END }, arrow('right'), at).basket, 0)
  assert.equal(gameFaces(input({ ...g0, basket: 0 }, arrow('left'), at), at)[keyAt(3, END)], 'basket')
  assert.deepEqual(input(g0, turn(LEFT_DIAL, 2), at).events, [], 'a move makes no sound')
  // a tap, a slide that goes nowhere, the up and down arrows, the right dial and the dials between, a press, any key: nothing
  const nothing = [tap(0), tap(600), tap(1199), swipe(700, 700), arrow('up'), arrow('down'), press(0), press(5), key(keyAt(3, 3)), key(keyAt(3, 5)), key(0), key(keyAt(3, 4))]
  assert.deepEqual(input(g0, swipe(0, COLUMN_X[4]), at).events, [], 'a slide to where the basket is: nothing')
  for (let d = 1; d < DIALS; d++) nothing.push(turn(d, 1), turn(d, -1))
  for (const ev of nothing) assert.deepEqual(input(g0, ev, at), step(g0, at), JSON.stringify(ev))
  // the strip: the basket where it is, under its key, as it moves
  const [a, ta] = started('yarn')
  assert.equal(arcadeView(a, ta).strip.basket, COLUMN_X[4])
  assert.equal(arcadeView(a, ta).strip.zones, null)
  const b = aIn(a, swipe(100, 1100), ta + 10)
  assert.equal(arcadeView(b, ta + 10).strip.basket, COLUMN_X[7])
  assert.equal(arcadeView(b, ta + 10).faces[keyAt(3, 7)], 'basket', 'the key and the strip agree')
  assert.equal(arcadeView(aIn(b, turn(LEFT_DIAL, -2), ta + 20), ta + 20).strip.basket, COLUMN_X[5], 'and with the dial')
  // five misses end it; the how-to says how it is played
  assert.equal(YARN_MISSES_OUT, 5)
  assert.equal(GAMES.find(g => g.id === 'yarn').rule, "Five misses and you're out.")
  assert.equal(GAMES.find(g => g.id === 'yarn').how, 'Slide a finger along the touch strip and lift it under the falling yarn: the basket goes there. The left dial moves it too. Gold yarn is worth more. Never catch Sir Irwin or his friends.')
  assert.equal(step(g0, 120000).outcome, 'lose', 'left alone, five balls fall')
  assert.equal(step(g0, 120000).strikes, 5)
})

test('G54 Yarn Catch (Jon, 30 Oct 2026): a ball on the floor is a miss, the fifth ends the round with the points kept; from ten seconds in about one in four of what falls is Sir Irwin or a friend, all five of them, drawn falling; a friend into the basket is a miss that says who, their face under the cross on the basket; a friend on the floor is nothing; the boxes say Misses, five of them', () => {
  assert.deepEqual([YARN_FRIENDS_FROM_MS, YARN_FRIEND_ONE_IN, YARN_MISSES_OUT, MARK_LABELS.yarn, marksOutOf('yarn'), marksOutOf('knock')], [10000, 4, 5, 'Misses', 5, STRIKES_OUT])
  const g0 = newGame('yarn', { seed: 9, lengthMs: 120000, now: 0 })
  const T = 10000
  // a miss: the words, the count, the miss sound
  const one = { ...g0, at: T, nextSpawnAt: 100000, balls: [{ col: 6, row: 3, gold: false, friend: null, nextAt: T, missAt: T + 100 }] }
  const missed = step(one, T + 100)
  assert.deepEqual([missed.strikes, missed.dropped, missed.events], [1, 1, ['miss']])
  assert.deepEqual(missed.said, { words: 'Miss 1! It fell.', until: T + 100 + STRIKE_WORDS_MS })
  // the fifth ends it, points kept, no bonus
  const fifth = step({ ...one, strikes: 4, dropped: 4, score: 7 }, T + 100)
  assert.deepEqual([fifth.over, fifth.outcome, fifth.endedAt, fifth.score, fifth.events], [true, 'lose', T + 100, 7, ['lose']])
  // a friend falling: drawn as their face on the way down
  const friend = { ...g0, at: T, nextSpawnAt: 100000, balls: [{ col: 2, row: 1, gold: false, friend: 'zimmy', nextAt: T + 100, missAt: null }] }
  assert.equal(gameFaces(friend, T)[keyAt(1, 2)], 'pet:zimmy')
  // into the basket: a miss that says who, the face under the cross on the basket, no points
  const under = { ...friend, basket: 2, score: 3 }
  const caught = step(under, T + 100)
  assert.equal(caught.balls.length, 1, 'still on the way: row 3 next')
  const landed = step(caught, caught.balls[0].nextAt)
  assert.deepEqual([landed.strikes, landed.friendsCaught, landed.caught, landed.score, landed.balls], [1, 1, 0, 3, []])
  assert.deepEqual(landed.events, ['miss'])
  assert.equal(landed.said.words, "Miss 1! That's Zimothy Clawford, Esq.")
  assert.equal(gameFaces(landed, landed.at)[keyAt(3, 2)], 'oops:zimmy')
  assert.equal(gameFaces(landed, landed.at + MISS_MS)[keyAt(3, 2)], 'basket')
  // the basket slid under a friend waiting on the floor: the same
  const waiting = { ...g0, at: T, nextSpawnAt: 100000, balls: [{ col: 6, row: 3, gold: false, friend: 'irwin', nextAt: T, missAt: T + 150 }] }
  const slid = input(waiting, colTap(6), T + 50)
  assert.deepEqual([slid.strikes, slid.friendsCaught, slid.said.words], [1, 1, "Miss 1! That's the birthday boy."])
  // a friend on the floor: gone, and nothing
  const floor = step(waiting, T + 150)
  assert.deepEqual([floor.strikes, floor.dropped, floor.balls, floor.events, floor.said], [0, 0, [], [], null])
  assert.equal(gameFaces(floor, T + 150)[keyAt(3, 6)], 'blank', 'no cross for a friend on the floor')
  // whole games: friends from ten seconds in, about one in four, all five; a basket that chases the balls and dodges the friends lasts
  let friends = 0, all = 0
  const met = new Set()
  for (const seed of [1, 2, 3, 4, 5, 6]) {
    let y = newGame('yarn', { seed, lengthMs: 120000, now: 0 })
    let prev = y
    for (let t = 0; t <= 120000 && !y.over; t += TICK) {
      y = stepGame(y, t)
      for (const b of y.balls) {
        if (prev.balls.some(p => p.col === b.col && p.friend === b.friend && p.row <= b.row)) continue
        all += 1
        if (b.friend) { friends += 1; met.add(b.friend); assert.ok(t >= YARN_FRIENDS_FROM_MS); assert.equal(b.gold, false) }
      }
      const ev = t % (3 * TICK) === 0 ? yarnChase(y) : null
      if (ev) y = inputGame(y, ev, t)
      prev = y
    }
    assert.equal(y.outcome, 'time', `seed ${seed}: lasted (${y.strikes} misses)`)
    assert.ok(y.caught > 40 && y.friendsCaught <= 1, `seed ${seed}: ${y.caught} caught, ${y.friendsCaught} friends`)
  }
  assert.ok(Math.abs(friends / all - 1 / YARN_FRIEND_ONE_IN) < 0.06, `${friends} friends of ${all}`)
  assert.deepEqual([...met].sort(), [...PETS].sort())
  // on the screen: five boxes, Misses (the strip has only the basket, 1 Nov 2026)
  const [a, ta] = started('yarn')
  assert.equal(arcadeView(a, ta).strip.marks, null)
  assert.deepEqual(arcadeView(a, ta).screen.marks, { of: 5, used: 0, label: 'Misses' })
})

test('G54 the touch strip while a game plays (Jon, 29 Oct 2026): its points big in the middle, the strike boxes in the games that count strikes, the time as a bar counting down with the time under it (31 Oct 2026), the outside dials\' labels', () => {
  const KEYS = ['left', 'centre', 'right', 'score', 'marks', 'clock', 'zones', 'basket', 'dials']
  for (const { id, name, dials, rule } of GAMES) {
    // ready and the count
    const ready = aIn(newArcade({ mode: 'free', seed: 6, now: 0 }), key(menuKey(id)), 0)
    const r = arcadeView(ready, PICK_MS).strip
    const c = arcadeView(aIn(ready, press(0), PICK_MS), PICK_MS).strip
    const zones = null // every strip's zones are null: Yarn Catch's rail went on 31 Oct 2026
    assert.deepEqual(r, { left: name, centre: 'Press any key to start', right: rule ?? '', score: null, marks: null, clock: null, zones, basket: null, dials })
    // the game
    const [a, t] = started(id)
    const g = a.game
    const L = g.endsAt - g.startedAt
    const s = arcadeView(a, t).strip
    assert.deepEqual(Object.keys(s), KEYS)
    if (id === 'yarn') {
      // only the basket, from the count on, the dial labels kept for the deck drawn on the screen (Jon, 1 Nov 2026: "only the basket emoji")
      const basket = { left: '', centre: '', right: '', score: null, marks: null, clock: null, zones, basket: COLUMN_X[g.basket], dials: withExit(dials) }
      assert.deepEqual(c, basket, 'the count')
      assert.deepEqual(s, basket, 'the game')
      assert.deepEqual(arcadeView(a, g.startedAt + 30000).strip, basket, 'the same strip however the game goes: nothing there to change but the basket')
      continue
    }
    assert.deepEqual(c, { ...r, centre: '3', dials: withExit(dials) }, 'the count: Exit over its dial')
    assert.deepEqual(s, { left: rule ? '' : name, centre: '', right: '', score: 0, marks: rule ? marksOf(id, 0) : null, clock: { left: L, length: L }, zones, basket: null, dials: withExit(dials) })
    // the bar counts down in whole seconds (31 Oct 2026)
    for (const n of [1, 7, 30]) {
      assert.deepEqual(arcadeView(a, g.startedAt + n * 1000 - 1).strip.clock, { left: L - (n - 1) * 1000, length: L }, `${id}: before second ${n} goes`)
      assert.deepEqual(arcadeView(a, g.startedAt + n * 1000).strip.clock, { left: L - n * 1000, length: L }, `${id}: second ${n} gone`)
    }
    assert.deepEqual(arcadeView(a, g.endsAt - 1).strip.clock, { left: 1000, length: L }, 'the last second to the end')
  }
  // a point shows at once, big in the middle
  let [m, t] = started('mice')
  while (!m.game.mice.length) { t += TICK; m = aStep(m, t) }
  m = aIn(m, key(m.game.mice[0].key), t)
  assert.equal(arcadeView(m, t).strip.score, m.game.score)
  assert.ok(m.game.score > 0)
  // left alone, a game's strip changes only as its clock does: once a second
  let [a, u] = started('tail')
  const strips = new Set()
  const L0 = a.game.endsAt - a.game.startedAt
  while (a.stage === 'play') { strips.add(JSON.stringify(arcadeView(a, u).strip)); u += 100; a = aStep(a, u) }
  assert.equal(strips.size, L0 / 1000)
  // every strip the arcade shows has the same parts
  const look = (x, w) => assert.deepEqual(Object.keys(arcadeView(x, w).strip), KEYS, x.stage)
  runVisit(['Jessa', 'Mari'], ['yarn', 'pointer'], { look })
  for (const name of SAMPLES) look(arcadeSample(name, 0), 0)
})

test('G54 every game is the same game for the same seed, ends at its time unless it ended sooner, and then stands still', () => {
  for (const { id } of GAMES) {
    assert.deepEqual(randomGame(id, 42).g, randomGame(id, 42).g, `${id} replays exactly`)
    for (const length of [FREE_GAME_MS, 45000]) {
      const g = step(newGame(id, { seed: 8, lengthMs: length, now: 1000 }), 1000 + length)
      assert.equal(g.over, true)
      assert.ok(g.endedAt <= 1000 + length)
      if (g.outcome === 'time') assert.equal(g.endedAt, 1000 + length)
      assert.equal(g.endsAt, 1000 + length)
      // a finished game stands still and takes nothing
      const later = step(g, 1000 + length + 60000)
      assert.deepEqual(without(later, 'events'), without(g, 'events'))
      assert.deepEqual(later.events, [])
      for (const ev of [key(TABLE_ENDS[0]), key(13), turn(0, 1), tap(100), arrow('left')]) {
        const h = input(g, ev, 1000 + length + 100)
        assert.deepEqual(without(h, 'events'), without(g, 'events'), `${id}: ${JSON.stringify(ev)} after the end`)
        assert.deepEqual(h.events, [])
      }
    }
  }
  // another seed, another game
  assert.ok(new Set(Array.from({ length: 20 }, (_, i) => step(newGame('mice', { seed: i + 1, now: 0 }), 0).mice[0].key)).size > 5, 'the first mouse')
  assert.ok(new Set(Array.from({ length: 20 }, (_, i) => step(newGame('yarn', { seed: i + 1, now: 0 }), 0).balls[0].col)).size > 3, 'the first ball')
  assert.ok(new Set(Array.from({ length: 20 }, (_, i) => newGame('pointer', { seed: i + 1, now: 0 }).wakeAt)).size > 15, 'Boo\'s first nap')
  assert.equal(newGame('mice', { now: 0 }).endsAt, FREE_GAME_MS)
  assert.throws(() => newGame('cushions', { now: 0 }))
  // the seeded generator and the hash are steady
  assert.deepEqual(nextRand(1), nextRand(1))
  assert.ok(nextRand(1).v >= 0 && nextRand(1).v < 1)
  assert.equal(hashOf('Boo'), hashOf('Boo'))
  assert.notEqual(hashOf('Boo'), hashOf('boo'))
})

test('G54 a page that sleeps (Jon, 29 Oct 2026: "All the games are not reacting in time"): ten seconds at once plays out exactly as the page\'s 16 ms ticks would, presses and turns at the same moments included, and a game that ended in the sleep ended at its own moment', () => {
  // presses, turns, taps, swipes and arrows, at moments of their own
  const script = seed => {
    let rs = seed * 7919 + 1
    const roll = () => { const r = nextRand(rs); rs = r.rs; return r.v }
    const evs = []
    for (let t = 37; t < 10000; t += 37 + Math.floor(roll() * 200)) {
      const r = roll()
      evs.push([t, r < 0.3 ? key(Math.floor(roll() * KEY_COUNT))
        : r < 0.45 ? key(TABLE_ENDS[Math.floor(roll() * TABLE_ENDS.length)])
          : r < 0.7 ? turn(roll() < 0.5 ? LEFT_DIAL : RIGHT_DIAL, roll() < 0.5 ? -1 : 2)
            : r < 0.8 ? arrow(['left', 'right', 'up', 'down'][Math.floor(roll() * 4)])
              : r < 0.9 ? tap(Math.floor(roll() * STRIP_WIDTH)) : swipe(Math.floor(roll() * STRIP_WIDTH), Math.floor(roll() * STRIP_WIDTH))])
    }
    return evs
  }
  for (const { id } of GAMES) {
    for (const seed of [1, 2, 3]) {
      const g = newGame(id, { seed, lengthMs: 120000, now: 0 })
      // left alone
      let ticked = g
      for (let t = TICK; t <= 10000; t += TICK) ticked = stepGame(ticked, t)
      assert.deepEqual(without(step(g, 10000), 'events'), without(ticked, 'events'), `${id} seed ${seed}, left alone`)
      // played: the same events at the same moments, with the page ticking between them or asleep
      const evs = script(seed)
      let a = g, i = 0
      for (let t = TICK; t <= 10000; t += TICK) {
        while (i < evs.length && evs[i][0] <= t) { a = inputGame(a, evs[i][1], evs[i][0]); i += 1 }
        a = stepGame(a, t)
      }
      let b = g
      for (const [t, ev] of evs) b = input(b, ev, t)
      b = step(b, 10000)
      assert.deepEqual(without(b, 'events'), without(a, 'events'), `${id} seed ${seed}, played`)
    }
  }
  // the dot caught three times in a sleep: the game ended at the third catch, not at the wake
  const g = newGame('pointer', { seed: 1, lengthMs: 120000, now: 0 })
  let ticked = g
  for (let t = TICK; !ticked.over; t += TICK) ticked = stepGame(ticked, t)
  const slept = step(g, 119000)
  assert.equal(slept.outcome, 'lose')
  assert.equal(slept.endedAt, ticked.endedAt)
  assert.ok(slept.endedAt < 119000)
  assert.deepEqual(slept.events, ['miss', 'bite', 'lose'], 'sparkles faded (30 Oct 2026), and the bites')
  // a yarn ball caught in a sleep, the basket waiting under its column
  const y0 = newGame('yarn', { seed: 4, lengthMs: 120000, now: 0 })
  const first = step(y0, 0).balls[0]
  const y = step({ ...y0, basket: first.col }, 10000)
  assert.ok(y.caught >= 1, 'the first ball was caught')
  let yt = { ...y0, basket: first.col }
  for (let t = 0; t <= 10000; t += TICK) yt = stepGame(yt, t)
  assert.deepEqual(without(y, 'events'), without(yt, 'events'))
  // a knock after a sleep lands on the board as it is now
  const kn = newGame('knock', { seed: 1, lengthMs: 120000, now: 0 })
  let kt = kn, when = 0
  while (!kt.things.some(x => x.col === END)) { when += TICK; kt = stepGame(kt, when) } // the first thing on an end
  const thing = kt.things.find(x => x.col === END)
  const knocked = input(kn, key(TABLE_ENDS[thing.row]), when) // the page asleep until then
  assert.deepEqual(knocked.events, ['knock'])
  assert.equal(knocked.knocked, 1)
  assert.deepEqual(without(knocked, 'events'), without(input(kt, key(TABLE_ENDS[thing.row]), when), 'events'))
})

test('G54 pure: nothing handed in is ever changed, and every state is plain JSON', () => {
  // every helper above freezes what it hands the engine: a change would have thrown
  for (const { id } of GAMES) {
    const { g } = randomGame(id, 5)
    assert.deepEqual(json(g), g, `${id} is plain JSON`)
  }
  const states = []
  runVisit(['Margaret', 'Tom', 'Ellie'], ['tail', 'pointer', 'mice', 'knock', 'yarn'], { look: a => states.push(a), during: striker })
  for (const a of states) assert.deepEqual(json(a), a)
})

test('G54 a game begun by an older copy of the engine plays on (the page keeps its game across a hot reload on the dev server): it is drawn, sent Back and stepped without throwing; Boo Chasing Her Tail\'s old ring becomes her board laid out afresh, its catches, points and time kept; the Knock\'s pardons and the gold counts start empty and work from then on', () => {
  // each game as the engine before the 29 Oct 2026 remake left it: the tail on the old ring, no pardons, no gold counts
  const OLD = {
    tail: g => ({ ...without(g, 'boo', 'blocks', 'tail', 'nextBlockAt'), paw: 4, tip: 15, side: 1, way: 1, catches: 3, score: 3 * TAIL_POINTS }),
    knock: g => without(g, 'gotAway'),
    mice: g => without(g, 'golds'),
    yarn: g => without(g, 'golds'),
  }
  // a free arcade with the game `id` three seconds in, in its old shape
  const aged = id => {
    const [a, t] = started(id)
    const g = step(a.game, t + 3000)
    return [frozen({ ...a, game: OLD[id](g) }), g.at]
  }
  for (const id of Object.keys(OLD)) {
    const [a, t] = aged(id)
    for (const f of arcadeView(a, t).faces) assert.ok(GAME_FACES[id].includes(f), `${id}: ${f}`)
    const back = arcadeBack(a, t + 10)
    assert.deepEqual([back.stage, back.events], ['home', ['back']], `${id}: Back leaves it`)
    assert.deepEqual(Object.keys(aStep(a, t + TICK).game).sort(), Object.keys(newGame(id, { seed: 1 })).sort(), `${id}: in this engine's shape after a tick`)
  }

  // Boo Chasing Her Tail: her board laid out afresh, drawn before the page's next tick as that tick leaves it
  const [ta, tt] = aged('tail')
  const tg = aStep(ta, tt + TICK).game
  assert.equal(tg.boo, keyAt(2, 1))
  assert.deepEqual(tg.blocks, [])
  assert.ok(tailShaped(tg.tail) && nearestOf(tg.tail, tg.boo) >= TAIL_AWAY_KEYS)
  assert.deepEqual([tg.catches, tg.score, tg.startedAt, tg.endsAt], [3, 3 * TAIL_POINTS, ta.game.startedAt, ta.game.endsAt], 'its catches, points and time kept')
  assert.equal(tg.nextBlockAt, tt + TAIL_BLOCKS_FROM_MS)
  assert.deepEqual(arcadeView(ta, tt).faces, gameFaces(tg, tt + TICK))
  // and it plays on: a player who chases the tip catches more, round the walls and friends, counted in the fun facts
  let b = ta, u = tt
  while (b.stage === 'play') {
    u += 100
    b = aStep(b, u)
    const ev = b.stage === 'play' && chaseMove(b.game)
    if (ev) b = aIn(b, ev, u)
  }
  assert.equal(b.stage, 'result')
  assert.ok(b.game.catches > 20 && b.game.blocks.length > 0, `${b.game.catches} caught, ${b.game.blocks.length} walls and friends`)
  assert.equal(b.stats.tails, b.game.catches)
  // on the how-to screen too: the old board is drawn, and the game that starts is this engine's
  const r0 = aIn(newArcade({ mode: 'free', seed: 6, now: 0 }), key(menuKey('tail')), 0)
  const r = frozen({ ...r0, game: OLD.tail(r0.game) })
  for (const f of arcadeView(r, PICK_MS).faces) assert.ok(GAME_FACES.tail.includes(f), f)
  const go = aStep(aIn(r, press(0), PICK_MS), PICK_MS + COUNT_MS)
  assert.equal(go.stage, 'play')
  assert.ok(tailShaped(go.game.tail))

  // Knock It Off the Table: nobody presses; a press on the end of the first thing to get away, a moment after, is forgiven
  let [k, kt] = aged('knock')
  while (k.game.strikes === 0) { kt += TICK; k = aStep(k, kt) }
  const forgiven = aIn(k, key(TABLE_ENDS[k.game.gotAway[0].row]), kt + 10)
  assert.equal(forgiven.game.strikes, 1)
  assert.ok(!forgiven.events.includes('miss'))

  // Whack-a-Mouse and Yarn Catch: every gold one from then on is counted, in the game and in the fun facts
  for (const id of ['mice', 'yarn']) {
    let [c, ct] = aged(id)
    while (c.stage === 'play') {
      ct += TICK
      c = aStep(c, ct)
      if (c.stage !== 'play') break
      const g = c.game
      if (id === 'mice') for (const m of g.mice) c = aIn(c, key(m.key), ct)
      const ev = id === 'yarn' ? yarnChase(g) : null
      if (ev) c = aIn(c, ev, ct)
    }
    assert.equal(c.stage, 'result')
    assert.ok(c.game.golds > 0, `${id}: ${c.game.golds} gold`)
    assert.equal(c.stats.gold, c.game.golds)
    assert.ok(Object.values(without(c.stats, 'best')).every(Number.isFinite), 'the fun facts are numbers')
    assert.ok(arcadeView(c, ct).screen.facts.some(f => f.label === 'Gold ones caught' && f.value === String(c.game.golds)))
  }
})

// ---- G55: the practice visit --------------------------------------------------

test('G55 a visit of two (one round of each game a player since 30 Oct 2026): turns go round, five tokens each, one a game, spent as each count starts; a game played is marked done on the menu and cannot be picked again; a clue after each second game; then the rest of the games; every token spent, the winner, then free play; every counted game is written down for the night', () => {
  assert.equal(TOKENS, GAMES.length, 'a token a game')
  assert.equal(CLUE_AFTER_GAMES, TOKENS, 'the clue once all five are played (31 Oct 2026)')
  let a = newArcade({ mode: 'visit', players: ['Jessa', 'Mari'], seed: 4, now: 0, roundMs: 3600000 })
  assert.equal(a.stage, 'menu')
  assert.equal(a.turn, 0)
  assert.equal(a.free, false)
  assert.deepEqual(a.players.map(p => [p.name, p.tokens, p.games.length]), [['Jessa', 5, 0], ['Mari', 5, 0]])
  assert.deepEqual(a.records, [])
  let t = 0
  // Jessa knocks things off for points
  ;[a, t] = playGame(a, t, 'knock', knocker)
  assert.equal(a.players[0].tokens, 4)
  assert.equal(a.players[0].games.length, 1)
  assert.ok(a.players[0].games[0].score > 0)
  assert.equal(a.players[0].games[0].game, 'knock')
  assert.deepEqual(a.records, [{ player: 0, name: 'Jessa', game: 'knock', score: a.players[0].games[0].score, outcome: a.game.outcome, at: a.stageAt }], 'written down as it ended')
  let v = arcadeView(a, t)
  assert.equal(v.screen.result.score, a.players[0].games[0].score)
  assert.equal(v.screen.player, 'Jessa')
  assert.equal(aIn(a, key(13), t).stage, 'result', 'the result takes no presses')
  t = a.stageAt + RESULT_MS
  a = aStep(a, t)
  assert.equal(a.stage, 'menu')
  assert.equal(a.turn, 1, "Mari's turn")
  assert.deepEqual(a.players[1].games, [])
  // Mari, then Jessa again: Jessa's knock is done on her menu and does nothing when pressed
  ;[a, t] = playGame(a, t, 'knock')
  a = aStep(a, (t = a.stageAt + RESULT_MS))
  assert.equal(a.turn, 0)
  v = arcadeView(a, t)
  assert.equal(v.faces[menuKey('knock')], 'menu-done:knock')
  assert.deepEqual(rowFaces(v.faces, 2), ['blank', 'blank', 'coin', 'coin', 'coin', 'coin-spent', 'coin', 'blank', 'blank'], 'the coin under the game she has played is spent (Jon, 1 Nov 2026)')
  assert.equal(v.screen.plain, "Jessa's turn: press a game you have not played yet.")
  assert.deepEqual(v.screen.players[0].played, ['knock'])
  const refused = aIn(a, key(menuKey('knock')), t + 10)
  assert.deepEqual([refused.stage, refused.events], ['menu', []], 'one round of each: her round of it is played')
  ;[a, t] = playGame(a, t, 'mice')
  assert.equal(a.players[0].tokens, 3)
  a = aStep(a, (t = a.stageAt + RESULT_MS))
  assert.equal(a.stage, 'menu', 'no clue yet: it comes once all five are played (31 Oct 2026)')
  assert.equal(a.turn, 1)
  // on round the group until each has one game left
  const turns = [0, 1, 0]
  while (a.players.some(p => p.tokens > 1)) {
    turns.push(a.turn)
    const p = a.players[a.turn]
    ;[a, t] = playGame(a, t, GAMES.map(g => g.id).find(id => !p.games.some(x => x.game === id)))
    a = aStep(a, (t = a.stageAt + RESULT_MS))
    assert.equal(a.stage, 'menu', 'on round the group')
  }
  assert.deepEqual(turns, [0, 1, 0, 1, 0, 1, 0, 1])
  assert.deepEqual(a.players.map(p => p.tokens), [1, 1])
  // Jessa's fifth game: her clue
  assert.equal(a.turn, 0)
  ;[a, t] = playGame(a, t, GAMES.map(g => g.id).find(id => !a.players[0].games.some(x => x.game === id)))
  a = aStep(a, (t = a.stageAt + RESULT_MS))
  assert.equal(a.stage, 'clue', 'after her fifth game')
  assert.deepEqual(a.events, ['clue'])
  v = arcadeView(a, t)
  assert.equal(v.screen.player, 'Jessa')
  assert.equal(v.screen.clue, STAND_IN_CLUE)
  assert.equal(v.screen.note, CLUE_NOTE)
  assert.equal(v.screen.third, null)
  assert.equal(v.screen.plain, 'Jessa, this is your clue. Read it, then press any key.')
  assert.equal(v.strip.left, 'Jessa')
  assert.equal(v.strip.centre, 'Your clue is on the screen')
  assert.equal(v.faces[MIDDLE], 'ok')
  assert.equal(v.faces.filter(f => f !== 'off').length, 1)
  assert.equal(a.players[0].reached, true)
  // a press counts only after three seconds
  assert.equal(aIn(a, key(5), t + CLUE_MIN_MS - 1).stage, 'clue')
  a = aIn(a, press(3), t + CLUE_MIN_MS)
  t += CLUE_MIN_MS
  assert.equal(a.stage, 'menu')
  assert.equal(a.turn, 1)
  // Mari's fifth game, her clue, then the winner
  ;[a, t] = playGame(a, t, GAMES.map(g => g.id).find(id => !a.players[1].games.some(x => x.game === id)))
  a = aStep(a, (t = a.stageAt + RESULT_MS))
  assert.equal(a.stage, 'clue')
  assert.equal(arcadeView(a, t).screen.player, 'Mari')
  a = aIn(a, tap(40), (t += CLUE_MIN_MS))
  assert.deepEqual(a.players.map(p => [p.tokens, p.games.length, p.reached]), [[0, 5, true], [0, 5, true]])
  for (const p of a.players) assert.deepEqual(p.games.map(x => x.game).sort(), GAMES.map(g => g.id).sort(), 'one round of each')
  assert.equal(a.records.length, 10, 'ten games written down')
  assert.deepEqual(a.records.map(r => [r.player, r.game, r.score]), a.players.flatMap((p, i) => p.games.map(x => [i, x.game, x.score])).sort((x, y) => a.records.findIndex(r => r.player === x[0] && r.game === x[1]) - a.records.findIndex(r => r.player === y[0] && r.game === y[1])))
  // every token spent: the winner
  assert.equal(a.stage, 'winner')
  assert.ok(a.events.includes('win'))
  v = arcadeView(a, t)
  const jessa = a.players[0].games.reduce((s, x) => s + x.score, 0), mari = a.players[1].games.reduce((s, x) => s + x.score, 0)
  const best = Math.max(jessa, mari)
  assert.deepEqual(v.screen.winner, { names: a.players.filter((p, i) => [jessa, mari][i] === best).map(p => p.name), total: best })
  assert.equal(v.screen.boo, v.screen.winner.names.length > 1 ? BOO_LINES.tie : BOO_LINES.winner)
  assert.equal(v.screen.picture, ' Boo 5.png')
  assert.deepEqual(v.screen.players.map(p => [p.name, p.tokens, p.scores.length]), [['Jessa', 0, 5], ['Mari', 0, 5]])
  // a player's key puts their five scores up (31 Oct 2026: no running math under the players)
  assert.equal(v.screen.scores, null)
  assert.equal(v.strip.left, 'Scores: press 1, 2')
  assert.equal(v.strip.right, 'Tap here for free play', 'the way on, on the strip itself (Jon, 1 Nov 2026)')
  assert.deepEqual(SCORE_KEYS.map(k => v.faces[k]), ['num:1', 'num:2', 'off'])
  const shown = aIn(a, key(SCORE_KEYS[1]), t + 1000)
  assert.deepEqual([shown.stage, shown.showing, shown.stageAt], ['winner', 1, t])
  const sv = arcadeView(shown, t + 1000).screen.scores
  assert.equal(sv.name, 'Mari')
  assert.deepEqual(sv.games.map(g => [g.game, g.score]), a.players[1].games.map(x => [x.game, x.score]))
  assert.equal(sv.games[0].name, GAMES.find(g => g.id === sv.games[0].game).name)
  assert.equal(sv.total, mari)
  // only a touch on the strip goes on (Jon, 1 Nov 2026: "put the tap for freeplay on the touch strip"): every other press leaves the scores up, a key with no player behind it too
  for (const ev of [key(0), key(SCORE_KEYS[2]), key(35), press(0), press(5), turn(LEFT_DIAL, 1), arrow('left')]) {
    assert.equal(aIn(shown, ev, t + 60000).stage, 'winner', JSON.stringify(ev))
    assert.equal(aIn(shown, ev, t + 60000).showing, 1, 'the scores stay up')
  }
  // and the page stays until then: nothing moves it on by itself, however long the scores are read
  assert.equal(aStep(shown, t + 600000).stage, 'winner')
  assert.equal(aIn(a, tap(600), t + WINNER_MIN_MS - 1).stage, 'winner', 'a tap as the page comes up does nothing')
  assert.equal(aIn(shown, tap(1190), t + WINNER_MIN_MS).stage, 'home', 'a tap anywhere on the strip, however soon after a player\'s key')
  assert.equal(aIn(a, swipe(300, 340), t + WINNER_MIN_MS).stage, 'home', 'a tap that wandered is reported as a slide: the same')
  // the chime still ends it
  assert.equal(arcadeChime(frozen(shown), t + 5000).stage, 'farewell')
  a = aIn(a, tap(600), (t += WINNER_MIN_MS))
  assert.equal(a.stage, 'home')
  assert.equal(a.free, true)
  assert.equal(a.mode, 'visit')
  v = arcadeView(a, t)
  assert.equal(v.screen.plain, 'Free play until the chime. Nothing counts now. Listen out for it.')
  assert.equal(v.screen.boo, BOO_LINES.freePlay)
  assert.ok(v.screen.clockMs > 0)
  assert.equal(a.records.length, 10, 'free play writes nothing down')
})

test('G55 a trio: round the group five times, the third player gets Boo\'s line instead of a clue after their fifth game', () => {
  const seen = []
  const [a] = runVisit(['Margaret', 'Tom', 'Ellie'], ['knock', 'mice', 'yarn'], { look: (x, t) => seen.push([x, t]) })
  const turns = seen.filter(([x]) => x.stage === 'count' && x.events.includes('tick') && x.beats === 1).map(([x]) => x.turn)
  assert.deepEqual(turns, [0, 1, 2, 0, 1, 2, 0, 1, 2, 0, 1, 2, 0, 1, 2], 'round the group, five each')
  const games = seen.filter(([x]) => x.stage === 'play').map(([x]) => x.game.endsAt - x.game.startedAt)
  assert.ok(games.length && games.every(ms => ms >= CUT_MIN_MS && ms <= GAME_MS), 'each game cut to fit what is left of the round')
  const clues = seen.filter(([x]) => x.stage === 'clue').map(([x]) => x.turn)
  assert.deepEqual(uniq(clues), [0, 1])
  const third = seen.find(([x]) => x.stage === 'third')
  assert.ok(third)
  assert.equal(third[0].turn, 2)
  assert.equal(third[0].players[2].games.length, CLUE_AFTER_GAMES, 'after their fifth game')
  assert.ok(!third[0].events.includes('clue'))
  const v = arcadeView(third[0], third[1])
  assert.equal(v.screen.third, THIRD_LINE)
  assert.equal(v.screen.boo, THIRD_LINE)
  assert.equal(v.screen.clue, null)
  assert.equal(v.screen.picture, 'Boo 3.png')
  assert.equal(v.screen.plain, 'Ellie, Boo has no clue for you. Press any key.')
  assert.equal(v.strip.centre, 'Ellie')
  assert.equal(v.faces[MIDDLE], 'ok')
  assert.ok(seen.some(([x]) => x.stage === 'winner'))
  assert.deepEqual(a.players.map(p => p.games.length), [5, 5, 5])
  assert.ok(a.players.every(p => p.reached && p.tokens === 0))
  assert.equal(a.records.length, 15)
})

test('G55 the winner names everyone who tied', () => {
  const seen = []
  runVisit(['Jessa', 'Mari'], ['knock'], { look: (x, t) => seen.push([x, t]) }) // nobody presses: the same nothing for both, so the same points
  const [a, t] = seen.find(([x]) => x.stage === 'winner')
  const v = arcadeView(a, t)
  const same = a.players[0].games.reduce((n, x) => n + x.score, 0)
  assert.equal(a.players[1].games.reduce((n, x) => n + x.score, 0), same)
  assert.deepEqual(v.screen.winner, { names: ['Jessa', 'Mari'], total: same })
  assert.equal(v.screen.plain, `A tie: Jessa and Mari, ${same} each.`)
  assert.equal(v.screen.boo, BOO_LINES.tie)
  assert.equal(v.strip.centre, 'Most points: Jessa and Mari')
  assert.equal(v.screen.picture, ' Boo 5.png')
  assert.deepEqual(rowFaces(v.faces, 0), ['paw', 'paw-lit', 'paw', 'paw', 'paw-lit', 'paw', 'paw', 'paw-lit', 'paw'], 'nine paws, three lit as the winner begins')
  assert.deepEqual(SCORE_KEYS.map(k => v.faces[k]), ['num:1', 'num:2', 'off'], 'a key a player, for their scores')
  // three ways
  const trio = { ...a, players: ['Margaret', 'Tom', 'Ellie'].map(name => ({ name, tokens: 0, reached: true, games: [{ game: 'mice', score: 7 }, { game: 'yarn', score: 3 }] })) }
  assert.equal(arcadeView(trio, t).screen.plain, 'A tie: Margaret, Tom and Ellie, 10 each.')
})

test('G55 a visit of one: five games, the clue after the second, no winner, then free play', () => {
  const seen = []
  const [a] = runVisit(['Jessa'], ['yarn', 'tail'], { look: (x, t) => seen.push([x, t]) })
  assert.deepEqual(a.players.map(p => p.games.map(x => x.game)), [['yarn', 'tail', 'pointer', 'mice', 'knock']], 'one round of each, the two asked for first')
  assert.ok(seen.some(([x]) => x.stage === 'clue'))
  assert.ok(!seen.some(([x]) => x.stage === 'winner'), 'no winner for one')
  assert.equal(arcadeView(a, 0).screen.boo, BOO_LINES.freePlayOne)
})

test('G55 free play after the visit records nothing, and the round clock keeps running to the chime', () => {
  let [a, t] = runVisit(['Jessa', 'Mari'], ['mice'])
  const players = json(a.players)
  const clock = arcadeView(a, t).screen.clockMs
  ;[a, t] = playGame(a, t, 'knock', knocker)
  assert.equal(a.game.endsAt - a.game.startedAt, FREE_GAME_MS)
  assert.ok(a.game.score > 0)
  assert.equal(arcadeView(a, t).screen.player, null, 'nobody\'s turn in free play')
  a = aStep(a, (t = a.stageAt + RESULT_MS))
  assert.equal(a.stage, 'home')
  assert.equal(a.free, true)
  assert.deepEqual(a.players, players, 'nothing recorded, no token spent')
  assert.ok(arcadeView(a, t).screen.clockMs < clock)
  // the chime still comes at the round's end
  a = aStep(a, a.roundEndsAt)
  assert.equal(a.stage, 'farewell')
  assert.deepEqual(a.events, ['chime'])
  assert.deepEqual(arcadeView(a, a.stageAt).screen.pending, [])
  // and plain free play: home, ready, count, play, result, home, nothing kept
  let f = newArcade({ mode: 'free', seed: 2, now: 0 })
  ;[f, t] = playGame(f, 0, 'yarn')
  f = aStep(f, f.stageAt + RESULT_MS)
  assert.equal(f.stage, 'home')
  assert.equal(f.mode, 'free')
  assert.deepEqual(f.players, [])
  assert.equal(arcadeView(f, t).screen.clockMs, null)
  assert.equal(arcadeView(f, t).screen.boo, BOO_LINES.home)
})

test('G55 ready: Back spends nothing, any other key, dial, tap or arrow starts the count, it starts by itself after fifteen seconds, and the game that starts is the board the deck showed', () => {
  const a = aIn(newArcade({ mode: 'visit', players: ['Jessa', 'Mari'], seed: 6, now: 0 }), key(menuKey('tail')), 100)
  const T = 100 + PICK_MS
  const v = arcadeView(a, T)
  assert.equal(v.faces[BACK_KEY], 'back')
  assert.equal(v.faces.filter(f => f === 'tail-boo').length, 1, 'the deck shows the starting board')
  assert.equal(v.faces[keyAt(2, 1)], 'tail-boo')
  assert.equal(v.screen.game.name, 'Boo Chasing Her Tail')
  assert.equal(v.screen.game.how, GAMES[0].how)
  assert.equal(v.screen.plain, 'Press any key or dial to start, or press Back to choose again.')
  assert.equal(v.screen.picture, 'Boo 2.png')
  assert.equal(v.strip.left, 'Boo Chasing Her Tail')
  assert.equal(v.strip.centre, 'Press any key to start')
  assert.deepEqual(v.strip.dials, GAMES[0].dials)
  assert.ok(v.screen.timeLeftMs >= CUT_MIN_MS && v.screen.timeLeftMs <= GAME_MS, 'the length it gets, cut to fit the round')
  // Back: the menu again, the token kept
  const back = aIn(a, key(BACK_KEY), T)
  assert.equal(back.stage, 'menu')
  assert.deepEqual(back.events, ['back'])
  assert.equal(back.players[0].tokens, TOKENS)
  assert.equal(back.turn, 0, 'still Jessa\'s turn')
  const freeBack = aIn(aIn(newArcade({ mode: 'free', seed: 6, now: 0 }), key(menuKey('mice')), 0), key(BACK_KEY), PICK_MS)
  assert.equal(freeBack.stage, 'home')
  // anything else starts the count, and spends the token
  for (const ev of [key(0), key(35), key(menuKey('tail')), press(5), turn(2, -1), turn(LEFT_DIAL, 1), tap(10), swipe(10, 900), arrow('down')]) {
    const c = aIn(a, ev, T)
    assert.equal(c.stage, 'count', JSON.stringify(ev))
    assert.deepEqual(c.events, ['tick'])
    assert.equal(c.players[0].tokens, TOKENS - 1, 'the token is spent as the count starts')
  }
  // nonsense does nothing
  for (const ev of [null, { kind: 'up' }, key(KEY_COUNT), arrow('sideways'), turn(0, 0)]) {
    const c = aIn(a, ev, T)
    assert.equal(c.stage, 'ready')
    assert.deepEqual(c.events, [])
  }
  // by itself
  assert.equal(aStep(a, 100 + READY_MS - 1).stage, 'ready')
  const own = aStep(a, 100 + READY_MS)
  assert.equal(own.stage, 'count')
  assert.equal(own.stageAt, 100 + READY_MS)
  // the game that starts is the board the deck showed: the same seed, so the same start
  for (const { id } of GAMES) {
    const r = aIn(newArcade({ mode: 'visit', players: ['Jessa', 'Mari'], seed: 6, now: 0 }), key(menuKey(id)), 100)
    const seed = hashOf(`${r.seed}:${r.played}`)
    assert.deepEqual(r.game, newGame(id, { seed, lengthMs: r.game.endsAt - r.game.startedAt, now: 100 }))
    assert.ok(r.game.endsAt - r.game.startedAt >= CUT_MIN_MS && r.game.endsAt - r.game.startedAt <= GAME_MS, 'cut to fit the round (30 Oct 2026)')
    const start = 100 + READY_MS + COUNT_MS
    const played = aStep(aStep(r, 100 + READY_MS), start)
    assert.equal(played.stage, 'play')
    const fit = played.game.endsAt - start // its length, cut to fit the round as it starts (a touch shorter than the how-to screen's)
    assert.deepEqual(played.game, stepGame(newGame(id, { seed, lengthMs: fit, now: start }), start))
    assert.deepEqual(gameFaces(newGame(id, { seed, lengthMs: fit, now: start }), start).map((f, i) => (i === BACK_KEY ? 'back' : f)), arcadeView(r, T).faces, id)
    assert.equal(played.played, 1)
  }
})

test('G55 the count: three, two, one a second apart with a tick each, on the middle key over the game\'s own board; then go and the game', () => {
  let a = aIn(aIn(newArcade({ mode: 'free', seed: 6, now: 0 }), key(menuKey('mice')), 0), press(0), 1000)
  const at = t => arcadeView(a, t)
  assert.equal(at(1000).faces[MIDDLE], 'num:3')
  assert.equal(at(1000).strip.centre, '3')
  assert.equal(at(1000).screen.count, 3)
  assert.deepEqual(at(1000).faces.filter(f => f !== 'blank'), ['num:3'], 'Whack-a-Mouse\'s board starts empty')
  const heard = []
  for (let t = 1000 + TICK; t <= 4000 + TICK; t += TICK) {
    a = aStep(a, t)
    heard.push(...a.events.map(e => `${t}:${e}`))
  }
  assert.deepEqual(heard.slice(0, 3).map(h => h.split(':')[1]), ['tick', 'tick', 'go'])
  a = aIn(aIn(newArcade({ mode: 'free', seed: 6, now: 0 }), key(menuKey('mice')), 0), press(0), 1000)
  assert.deepEqual(aStep(a, 2000).events, ['tick'])
  assert.equal(at(2000).faces[MIDDLE], 'num:2')
  assert.equal(at(1999).faces[MIDDLE], 'num:3')
  assert.equal(at(3000).faces[MIDDLE], 'num:1')
  assert.deepEqual(aStep(aStep(a, 2000), 3000).events, ['tick'])
  const go = aStep(a, 4000)
  assert.equal(go.stage, 'play')
  assert.ok(go.events.includes('go'))
  assert.equal(go.game.startedAt, 1000 + COUNT_MS)
  assert.equal(go.game.mice.length, 1, 'the first mouse is up as it starts')
  // a press in play goes to the game
  const bonk = aIn(go, key(go.game.mice[0].key), 4100)
  assert.equal(bonk.stage, 'play')
  assert.ok(bonk.game.score > 0)
  // the count takes no presses
  assert.equal(aIn(a, key(5), 1500).stage, 'count')
  assert.deepEqual(aIn(a, press(0), 1500).events, [])
  // every game's count: its number on the middle key, over its own board
  for (const { id } of GAMES) {
    const c = aIn(aIn(newArcade({ mode: 'free', seed: 6, now: 0 }), key(menuKey(id)), 0), press(0), PICK_MS)
    const board = gameFaces(c.game, PICK_MS)
    for (const [dt, n] of [[0, 3], [999, 3], [1000, 2], [2000, 1], [2999, 1]]) {
      assert.deepEqual(arcadeView(c, PICK_MS + dt).faces, board.map((x, i) => (i === MIDDLE ? `num:${n}` : x)), `${id} at ${dt}`)
    }
  }
})

test('G55 a clue stays at least three seconds and moves on by itself after a minute', () => {
  const a = arcadeSample('clue', 0)
  const fresh = { ...a, stageAt: 0 }
  assert.equal(aIn(fresh, key(0), CLUE_MIN_MS - 1).stage, 'clue')
  assert.equal(aIn(fresh, turn(0, 1), CLUE_MIN_MS + 10).stage, 'clue', 'a turn is not a press')
  assert.equal(aIn(fresh, arrow('left'), CLUE_MIN_MS + 10).stage, 'clue', 'nor an arrow')
  assert.equal(aIn(fresh, key(0), CLUE_MIN_MS).stage, 'menu')
  assert.equal(aIn(fresh, tap(900), CLUE_MIN_MS).stage, 'menu', 'a tap on the strip is a press')
  assert.equal(aStep(fresh, CLUE_MAX_MS - 1).stage, 'clue')
  const moved = aStep(fresh, CLUE_MAX_MS)
  assert.equal(moved.stage, 'menu')
  assert.equal(moved.turn, 1, "then Mari's turn")
})

test('G55 names are cleaned: trimmed, spaces closed up, thirty characters at most, a blank one numbered, three at most', () => {
  const a = newArcade({ mode: 'visit', players: ['  Jon   Kost ', '', 'x'.repeat(40), 'Fourth'], seed: 1, now: 0 })
  assert.deepEqual(a.players.map(p => p.name), ['Jon Kost', 'Player 2', 'x'.repeat(30)])
  assert.equal(newArcade({ mode: 'visit', players: [], now: 0 }).players[0].name, 'Player 1')
  assert.equal(newArcade({ mode: 'visit', players: [{ name: 'Ellie' }], now: 0 }).players[0].name, 'Ellie')
  assert.equal(newArcade({ mode: 'visit', players: ['A', 'B'], now: 500, roundMs: 1000 }).roundEndsAt, 1500)
  assert.equal(newArcade({ mode: 'visit', players: ['A', 'B'], now: 0 }).roundEndsAt, ROUND_MS)
  const free = newArcade({ mode: 'free', players: ['Ignored'], now: 0 })
  assert.deepEqual(free.players, [])
  assert.equal(free.roundEndsAt, null)
})

test('G55 a visit\'s game is forty seconds, the same for everyone (30 Oct 2026: five games each, and a score means the same wherever it was made); one that would run into the chime is cut short so its clue comes first, never under thirty seconds; free play\'s two minutes are never cut; a brisk pair plays all ten games and a brisk trio most of its fifteen', () => {
  assert.deepEqual([GAME_MS, FREE_GAME_MS, CUT_MIN_MS, CLUE_KEEP_MS, ROUND_MS], [50000, 120000, 30000, 15000, 900000], 'fifty seconds a game in a fifteen-minute round (31 Oct 2026)')
  // the rule: the full length while it fits before its points and the clue's fifteen seconds, a second less for every second later
  const lengthFrom = (a, start, id = 'mice') => {
    const g = aStep(aIn(aIn(a, key(menuKey(id)), start - COUNT_MS - PICK_MS), press(0), start - COUNT_MS), start).game
    return g.endsAt - g.startedAt
  }
  const two = newArcade({ mode: 'visit', players: ['Ann', 'Bob'], seed: 3, now: 0 })
  const latest = ROUND_MS - GAME_MS - RESULT_MS - CLUE_KEEP_MS // the last start that still gets the forty seconds
  assert.equal(lengthFrom(two, PICK_MS + COUNT_MS), GAME_MS, 'plenty of time: the forty seconds')
  assert.equal(lengthFrom(two, latest), GAME_MS)
  assert.equal(lengthFrom(two, latest + 1000), GAME_MS - 1000)
  const three = newArcade({ mode: 'visit', players: ['Ann', 'Bob', 'Cat'], seed: 3, now: 0 })
  assert.equal(lengthFrom(three, PICK_MS + COUNT_MS), GAME_MS, 'the same for a trio')
  assert.equal(lengthFrom(three, latest + 5000), GAME_MS - 5000)
  // never under thirty seconds, even when that runs into the chime
  assert.equal(lengthFrom(two, ROUND_MS - 40000), CUT_MIN_MS)
  assert.equal(lengthFrom(two, ROUND_MS - 10000), CUT_MIN_MS)
  // free play is never cut: plain free play, and a visit's free play after its last game
  assert.equal(lengthFrom(newArcade({ mode: 'free', seed: 3, now: 0 }), ROUND_MS - 10000), FREE_GAME_MS)
  assert.equal(lengthFrom({ ...two, free: true, stage: 'home' }, ROUND_MS - 20000), FREE_GAME_MS)

  // paced visits: the screen says the length each game really gets, before it starts
  const check = visit => { for (const g of visit.games) assert.ok([g.said, g.counting, g.left].every(x => Math.abs(x - g.length) < 1000), `the screen said so: ${[g.said, g.counting, g.left]} for ${g.length}`) }
  // a brisk pair plays all ten, every game its forty seconds, both clues, the winner and free play before the chime
  const BRISK = { menuMs: 4000, readyMs: 5000, clueMs: 15000 }
  const brisk = pacedVisit(['Ann', 'Bob'], ['mice'], BRISK)
  check(brisk)
  assert.equal(brisk.games.length, 10, 'all ten')
  assert.ok(brisk.games.every(g => near(g.length, GAME_MS)))
  assert.deepEqual(brisk.came.map(c => c.stage), ['clue', 'clue'])
  assert.ok(brisk.a.stage === 'home' && brisk.a.free, 'to the winner and free play before the chime')
  // a brisk trio plays most of its fifteen, its last cut short, every clue and the third's line
  const trio = pacedVisit(['Ann', 'Bob', 'Cat'], ['mice'], BRISK)
  check(trio)
  assert.ok(trio.games.length >= 12 && trio.games.length <= 15, `a brisk trio plays all or nearly all of its fifteen in the fifteen minutes: ${trio.games.length}`)
  assert.deepEqual(trio.came.map(c => c.stage), ['clue', 'clue', 'third'])
  assert.ok(trio.a.stage === 'farewell' ? trio.a.pending.length === 0 : trio.a.stage === 'home' && trio.a.free, 'to the chime with nobody caught short, or through the winner to free play')
  // at an ordinary pace: fewer games, both clues still before the chime, the last game cut short
  const pair = pacedVisit(['Ann', 'Bob'], ['mice'], ORDINARY)
  check(pair)
  assert.ok(pair.games.length >= 8 && pair.games.length <= 10, `${pair.games.length} games at an ordinary pace in the fifteen minutes`)
  assert.deepEqual(pair.came.map(c => c.stage), ['clue', 'clue'], 'both clues, after all five games each')
  assert.ok(pair.came.every(c => c.at <= ROUND_MS - CLUE_KEEP_MS), 'each with time to read it')
  assert.ok(pair.games.every(g => g.length <= GAME_MS && g.length >= CUT_MIN_MS))
  assert.ok(pair.a.stage === 'farewell' ? pair.a.pending.length === 0 : pair.a.stage === 'home' && pair.a.free, 'the chime caught nobody short')
  // a slow pair: still both clues
  const slow = pacedVisit(['Ann', 'Bob'], ['mice'], SLOW)
  check(slow)
  assert.deepEqual(slow.came.map(c => c.stage), ['clue', 'clue'])
  assert.ok(slow.a.stage === 'farewell' || (slow.a.stage === 'home' && slow.a.free), 'the chime, or through to free play')
})

test('G55 the chime names who it caught short: a clue owed to the first two, Boo\'s line to a trio\'s third player, told apart by place', () => {
  // a crawling trio: the chime comes before the third player's line (and maybe a clue)
  const CRAWL = { menuMs: 90000, readyMs: 14000, clueMs: 60000 }
  const trio = pacedVisit(['Margaret', 'Tom', 'Ellie'], ['mice'], CRAWL)
  let v = arcadeView(trio.a, trio.a.stageAt).screen
  assert.equal(v.stage, 'farewell')
  const owed = trio.a.players.filter(p => !p.reached).map(p => p.name)
  assert.ok(owed.includes('Ellie'), `the chime caught the third player short: ${owed}`)
  assert.deepEqual(v.pending, owed)
  assert.equal(v.plain, [owed.length > 1 ? `Out of time before their clue: ${listed(owed.slice(0, -1))}.` : '', "Out of time before Boo's line: Ellie."].filter(Boolean).join(' '))
  // a crawling pair: the chime comes before either clue (they come after all five games, 31 Oct 2026)
  const pair = pacedVisit(['Jessa', 'Mari'], ['mice'], CRAWL)
  v = arcadeView(pair.a, pair.a.stageAt).screen
  assert.equal(v.stage, 'farewell')
  assert.deepEqual(v.pending, ['Jessa', 'Mari'])
  assert.equal(v.plain, 'Out of time before their clue: Jessa and Mari.')
  // both at once: those owed a clue first
  const start = newArcade({ mode: 'visit', players: ['Margaret', 'Tom', 'Ellie'], seed: 1, now: 0 })
  assert.equal(arcadeView(arcadeChime(start, 10), 10).screen.plain, "Out of time before their clue: Margaret and Tom. Out of time before Boo's line: Ellie.")
  // by place, never by name: two guests can share one
  const sams = newArcade({ mode: 'visit', players: ['Sam', 'Jo', 'Sam'], seed: 1, now: 0 })
  const caught = reached => arcadeView(arcadeChime({ ...sams, players: sams.players.map((p, i) => ({ ...p, reached: reached[i] })) }, 10), 10).screen
  assert.equal(caught([true, true, false]).plain, "Out of time before Boo's line: Sam.")
  assert.equal(caught([false, true, true]).plain, 'Out of time before their clue: Sam.')
  assert.deepEqual(caught([false, true, false]).pending, ['Sam', 'Sam'])
  assert.equal(caught([false, true, false]).plain, "Out of time before their clue: Sam. Out of time before Boo's line: Sam.")
  // a pair has no third player
  const two = newArcade({ mode: 'visit', players: ['Jessa', 'Mari'], seed: 1, now: 0 })
  assert.equal(arcadeView(arcadeChime(two, 10), 10).screen.plain, 'Out of time before their clue: Jessa and Mari.')
})

test('G55 the chime ends everything, from every stage: Be on your way., then free play', () => {
  const moments = new Map()
  const keep = (a, t) => { const name = `${a.stage}${a.free ? ' (free play)' : ''}`; if (!moments.has(name)) moments.set(name, [a, t]) }
  let [a, t] = runVisit(['Margaret', 'Tom', 'Ellie'], ['knock', 'tail'], { look: keep })
  // and a game in the visit's free play, and plain free play
  a = aIn(a, key(menuKey('mice')), t); keep(a, t)
  a = aIn(a, press(0), (t += PICK_MS)); keep(a, t)
  a = aStep(a, (t += COUNT_MS)); keep(a, t)
  a = aStep(a, a.game.endsAt); keep(a, a.game.endsAt)
  keep(newArcade({ mode: 'free', seed: 3, now: 0 }), 0)
  for (const stage of ['menu', 'ready', 'count', 'play', 'result', 'clue', 'third', 'winner', 'home (free play)', 'ready (free play)', 'count (free play)', 'play (free play)', 'result (free play)', 'home']) {
    assert.ok(moments.has(stage), `reached ${stage}`)
  }
  for (const [name, [m, at]] of moments) {
    const c = arcadeChime(frozen(m), at + 1)
    assert.equal(c.stage, 'farewell', name)
    assert.deepEqual(c.events, ['chime'], name)
    assert.equal(c.game, null)
    const v = arcadeView(c, at + 1)
    assert.equal(v.screen.farewell, FAREWELL_LINE)
    assert.equal(v.screen.boo, FAREWELL_LINE)
    assert.equal(v.strip.centre, FAREWELL_LINE)
    assert.equal(v.screen.picture, 'Boo 3.png')
    assert.deepEqual(v.faces.filter(f => f !== 'off'), ['boo'])
    assert.equal(v.faces[MIDDLE], 'boo')
    const left = m.players.filter(p => !p.reached).map(p => p.name)
    assert.deepEqual(v.screen.pending, left, name)
    // those owed a clue, then a trio's third player (by place), owed Boo's line
    const lineOwed = m.players.length === 3 && !m.players[2].reached
    const clueOwed = lineOwed ? left.slice(0, -1) : left
    assert.equal(v.screen.plain, [
      clueOwed.length ? `Out of time before their clue: ${listed(clueOwed)}.` : '',
      lineOwed ? `Out of time before Boo's line: ${m.players[2].name}.` : '',
    ].filter(Boolean).join(' '), name)
    if (m.mode === 'visit') assert.equal(v.screen.clockMs, 0, 'the round is over')
    // ringing again does nothing more; the farewell lasts its time, then a fresh free play
    const again = arcadeChime(frozen(c), at + 2)
    assert.equal(again.stage, 'farewell')
    assert.deepEqual(again.events, [])
    assert.equal(aIn(c, key(13), at + 100).stage, 'farewell', 'the farewell takes no presses')
    assert.equal(aStep(c, at + FAREWELL_MS).stage, 'farewell')
    const after = aStep(c, at + 1 + FAREWELL_MS)
    assert.equal(after.stage, 'home', name)
    assert.equal(after.mode, 'free')
    assert.equal(after.free, false)
    assert.deepEqual(after.players, [])
    assert.equal(after.roundEndsAt, null)
    assert.equal(arcadeView(after, at + 1 + FAREWELL_MS).screen.boo, BOO_LINES.home)
    // the round's own clock rings the same chime when it runs out
    if (m.mode === 'visit') {
      const timed = aStep({ ...m, roundEndsAt: at + 100 }, at + 100)
      assert.equal(timed.stage, 'farewell', name)
      assert.ok(timed.events.includes('chime'))
      assert.equal(timed.stageAt, at + 100)
    }
  }
  // the clue's player is not left out; the others are named, the trio's third apart
  const [clue, ct] = moments.get('clue')
  const caught = arcadeView(arcadeChime(clue, ct + 1), ct + 1).screen
  assert.deepEqual(caught.pending, ['Tom', 'Ellie'])
  assert.equal(caught.plain, "Out of time before their clue: Tom. Out of time before Boo's line: Ellie.")
  const [menu, mt] = moments.get('menu')
  assert.equal(arcadeView(arcadeChime(menu, mt + 1), mt + 1).screen.plain, "Out of time before their clue: Margaret and Tom. Out of time before Boo's line: Ellie.")
  // a page asleep through the whole round wakes on the farewell, or after it, on free play
  const idle = newArcade({ mode: 'visit', players: ['Jessa', 'Mari'], seed: 1, now: 0 })
  const woke = aStep(idle, ROUND_MS + 1000)
  assert.equal(woke.stage, 'farewell')
  assert.deepEqual(arcadeView(woke, ROUND_MS + 1000).screen.pending, ['Jessa', 'Mari'])
  const later = aStep(idle, ROUND_MS + FAREWELL_MS + 60000)
  assert.equal(later.stage, 'home')
  assert.equal(later.mode, 'free')
  assert.deepEqual(later.events, ['chime'])
})

test('G55 Back (Jon, 29 Oct 2026: "on the pratice page I need a back button. Im stuck and cant get back."): a visit ends at once from any moment, its free play and its farewell too, with no chime and no farewell, for a fresh free play on its menu with the fun facts kept', () => {
  // every moment of a visit, as the chime test reaches them, and its farewell
  const moments = new Map()
  const keep = (a, t) => { const name = `${a.stage}${a.free ? ' (free play)' : ''}`; if (a.mode === 'visit' && !moments.has(name)) moments.set(name, [a, t]) }
  let [a, t] = runVisit(['Margaret', 'Tom', 'Ellie'], ['knock', 'tail'], { look: keep })
  a = aIn(a, key(menuKey('mice')), t); keep(a, t)
  a = aIn(a, press(0), (t += PICK_MS)); keep(a, t)
  a = aStep(a, (t += COUNT_MS)); keep(a, t)
  a = aStep(a, a.game.endsAt); keep(a, a.game.endsAt)
  keep(arcadeChime(a, a.stageAt + 1), a.stageAt + 1) // the farewell, rung in its free play
  const [first, ft] = moments.get('menu')
  keep(arcadeChime(first, ft + 1), ft + 1) // and rung on its first menu
  for (const stage of ['menu', 'ready', 'count', 'play', 'result', 'clue', 'third', 'winner', 'home (free play)', 'ready (free play)', 'count (free play)', 'play (free play)', 'result (free play)', 'farewell', 'farewell (free play)']) {
    assert.ok(moments.has(stage), `reached ${stage}`)
  }
  for (const [name, [m, at]] of moments) {
    const b = arcadeBack(frozen(m), at)
    assert.deepEqual([b.mode, b.stage, b.stageAt, b.free], ['free', 'home', at, false], name)
    assert.deepEqual(b.players, [])
    assert.equal(b.roundEndsAt, null)
    assert.equal(b.game, null)
    assert.equal(b.pick, null)
    assert.deepEqual(b.events, ['back'], `${name}: no chime`)
    assert.deepEqual(b.stats, m.stats, `${name}: the fun facts kept`)
    const v = arcadeView(b, at)
    assert.equal(v.screen.plain, 'Press a game. Just for fun.')
    assert.equal(v.screen.boo, BOO_LINES.home)
    assert.notEqual(v.screen.farewell, FAREWELL_LINE, 'no farewell')
    assert.equal(v.screen.clockMs, null)
    assert.deepEqual(json(b), b, 'plain JSON')
    // free play from then on: no round, so no chime ever comes
    const later = aStep(b, at + 2 * ROUND_MS)
    assert.equal(later.stage, 'home')
    assert.deepEqual(later.events, [])
  }
  // a visit's game left in play is not counted; one at its result already was
  const [inPlay, pt] = moments.get('play')
  assert.equal(arcadeBack(inPlay, pt).stats.games, inPlay.stats.games)
  // it catches up to now first: a round that ran out while the page slept rang its chime, then Back left the farewell
  const [menu, mt] = moments.get('menu')
  const slept = arcadeBack(frozen({ ...menu, roundEndsAt: mt + 100 }), mt + 200)
  assert.deepEqual([slept.mode, slept.stage], ['free', 'home'])
  assert.deepEqual(slept.events, ['chime', 'back'])
})

test('G55 Back in free play: a game is left for the menu from its how-to, its count, its play and its result, and one left before its result is not counted; on the menu it does nothing; it never throws', () => {
  const f0 = newArcade({ mode: 'free', seed: 4, now: 0 })
  const ready = aIn(f0, key(menuKey('mice')), 100)
  const count = aIn(ready, press(0), 100 + PICK_MS)
  const play = aStep(count, 100 + PICK_MS + COUNT_MS)
  assert.deepEqual([ready.stage, count.stage, play.stage], ['ready', 'count', 'play'])
  // a few mice bonked, so a game left in play has something it would have counted
  let busy = play, bt = play.stageAt
  for (; bt < play.stageAt + 20000; bt += 50) { busy = aStep(busy, bt); for (const m of busy.game.mice) busy = aIn(busy, key(m.key), bt) }
  assert.ok(busy.game.bonked > 5)
  const result = aStep(play, play.game.endsAt)
  assert.equal(result.stage, 'result')
  assert.equal(result.stats.games, 1, 'counted at its result')
  for (const [name, x, at] of [['ready', ready, 100 + PICK_MS], ['count', count, count.stageAt + 10], ['play', play, play.stageAt + 10], ['play, mice bonked', busy, bt], ['result', result, result.stageAt + 10]]) {
    const b = arcadeBack(frozen(x), at)
    assert.deepEqual([b.mode, b.stage, b.stageAt, b.game, b.pick], ['free', 'home', at, null, null], name)
    assert.deepEqual(b.events, ['back'], name)
    assert.deepEqual(b.stats, x.stats, `${name}: nothing added to the fun facts`)
    assert.equal(b.seed, x.seed, 'the same arcade')
    const v = arcadeView(b, at)
    assert.equal(v.screen.plain, 'Press a game. Just for fun.')
    assert.deepEqual(v.screen.facts, arcadeView(x, at).screen.facts)
    // and the menu works again
    assert.equal(aIn(b, key(menuKey('yarn')), at + 10).stage, 'ready')
  }
  assert.deepEqual(arcadeBack(busy, bt).stats, f0.stats, 'a game left before its result is not counted')
  // a game that reached its result while the page slept was counted, and Back leaves its result
  const woke = arcadeBack(frozen(play), play.game.endsAt + 10)
  assert.equal(woke.stage, 'home')
  assert.equal(woke.stats.games, 1)
  assert.ok(woke.events.includes('back'))
  // on free play's menu: nothing at all
  for (const at of [0, 500, 90000]) {
    assert.deepEqual(arcadeBack(frozen(f0), at), aStep(f0, at))
    assert.deepEqual(arcadeBack(f0, at).events, [])
  }
  // never throws, on every sample and on a fresh arcade of either kind
  for (const name of SAMPLES) {
    const s = arcadeSample(name, 1000)
    const b = arcadeBack(frozen(s), 1000)
    assert.deepEqual([b.mode, b.stage], ['free', 'home'], name)
    assert.ok(arcadeView(b, 1000), name)
  }
  for (const fresh of [newArcade(), newArcade({ mode: 'visit' }), newArcade({ mode: 'visit', players: ['Jessa', 'Mari', 'Tom'], seed: 3, now: 50 })]) {
    const b = arcadeBack(frozen(fresh), 100)
    assert.deepEqual([b.mode, b.stage], ['free', 'home'])
  }
})

test('G55 a page that sleeps through stages catches up exactly: a minute and more at once is the page\'s 16 ms ticks', () => {
  let a = newArcade({ mode: 'visit', players: ['Jessa', 'Mari'], seed: 9, now: 0 })
  a = aIn(a, key(menuKey('pointer')), 0)
  a = aIn(a, press(0), PICK_MS)
  // from the count's start: two more ticks, go, and a Lazy Pointer nobody plays, in which Boo catches the dot three times
  const jumped = aStep(a, 130000)
  let ticked = a
  const heard = []
  for (let t = PICK_MS + TICK; t <= 130000; t += TICK) { ticked = arcadeStep(ticked, t); heard.push(...ticked.events) }
  assert.deepEqual(without(jumped, 'events'), without(ticked, 'events'))
  assert.deepEqual(jumped.events, uniq(heard))
  assert.deepEqual(jumped.events, ['tick', 'go', 'miss', 'bite', ticked.players[0].games[0].score ? 'win' : 'lose'], 'out, or lasted (five catches since 31 Oct 2026)')
  assert.equal(jumped.players[0].games[0].game, 'pointer')
  // and on through the result to Mari's turn, either way
  assert.equal(jumped.stage, 'menu')
  assert.equal(jumped.turn, 1)
  // each game, ten seconds into play
  for (const { id } of GAMES) {
    let b = aIn(aIn(newArcade({ mode: 'free', seed: 12, now: 0 }), key(menuKey(id)), 0), press(0), PICK_MS)
    b = aStep(b, PICK_MS + COUNT_MS)
    let tb = b
    for (let t = PICK_MS + COUNT_MS + TICK; t <= PICK_MS + COUNT_MS + 10000; t += TICK) tb = arcadeStep(tb, t)
    assert.deepEqual(without(aStep(b, PICK_MS + COUNT_MS + 10000), 'events'), without(arcadeStep(tb, PICK_MS + COUNT_MS + 10000), 'events'), id)
  }
})

test('G55 the fun facts (Jon, 29 Oct 2026: "game info, maybe points, silly things"): counted across games while the page is open, only the ones that happened, the best game too; a game the chime cuts short is not counted; kept through the farewell', () => {
  let a = newArcade({ mode: 'free', seed: 8, now: 0 })
  assert.deepEqual(arcadeView(a, 0).screen.facts, [], 'nothing yet')
  // Whack-a-Mouse: every mouse tapped, and two friends
  let pets = 0, t
  ;[a, t] = playGame(a, 0, 'mice', (x, u) => {
    for (const m of x.game.mice) if (x.stage === 'play') x = aIn(x, key(m.key), u)
    if (pets < 2 && x.stage === 'play' && x.game.pets.length) { x = aIn(x, key(x.game.pets[0].key), u); pets += 1 }
    return x
  }, 100)
  const mice = a.game
  assert.equal(mice.outcome, 'time')
  assert.ok(mice.bonked > 50)
  assert.ok(mice.golds > 0, 'some of them gold')
  assert.deepEqual(arcadeView(a, t).screen.facts, [
    { label: 'Games played', value: '1' },
    { label: 'Mice bonked', value: String(mice.bonked) },
    { label: 'Friends tapped by mistake', value: '2' },
    { label: 'Gold ones caught', value: String(mice.golds) },
    { label: 'Best game', value: `${pts(mice.score)}, Whack-a-Mouse` },
  ])
  // The Lazy Pointer, left alone: Boo's catches counted; the best game stays
  a = aStep(a, (t = a.stageAt + RESULT_MS))
  ;[a, t] = playGame(a, t, 'pointer')
  const caughtDot = a.game.strikes
  assert.ok(caughtDot > 0 && a.game.score < mice.score)
  assert.deepEqual(arcadeView(a, t).screen.facts.map(f => [f.label, f.value]), [
    ['Games played', '2'], ['Mice bonked', String(mice.bonked)], ['Friends tapped by mistake', '2'], ['Times Boo caught the dot', String(caughtDot)], ['Gold ones caught', String(mice.golds)],
    ['Best game', `${pts(mice.score)}, Whack-a-Mouse`],
  ])
  // each of the others, its own fact; a better game takes the best
  a = aStep(a, (t = a.stageAt + RESULT_MS))
  const finished = (x, u, game) => aStep({ ...x, stage: 'play', stageAt: u, pick: game.id, game }, game.endsAt)
  const short = (id, more) => ({ ...newGame(id, { seed: 1, lengthMs: 1000, now: t }), ...more })
  a = finished(a, t, short('tail', { catches: 4, score: 4 * TAIL_POINTS }))
  a = aStep(a, (t = a.stageAt + RESULT_MS))
  a = finished(a, t, short('knock', { knocked: 9, score: 9 }))
  a = aStep(a, (t = a.stageAt + RESULT_MS))
  a = finished(a, t, short('yarn', { caught: 5, score: 7 }))
  a = aStep(a, (t = a.stageAt + RESULT_MS))
  const grabbed = Math.ceil((mice.score + 1) / POINTER_POINTS) // enough sparkles to beat the mice
  a = finished(a, t, short('pointer', { sparkled: grabbed, score: grabbed * POINTER_POINTS, wakeAt: t + 5000, nextSparkleAt: t + 5000 }))
  const facts = arcadeView(a, a.stageAt).screen.facts
  assert.deepEqual(facts.map(f => [f.label, f.value]), [
    ['Games played', '6'], ['Mice bonked', String(mice.bonked)], ['Friends tapped by mistake', '2'], ['Tail tips caught', '4'], ['Sparkles grabbed', String(grabbed)],
    ['Times Boo caught the dot', '5'], ['Things knocked off the tables', '9'], ['Balls of yarn caught', '5'], ['Gold ones caught', String(mice.golds)],
    ['Best game', `${pts(grabbed * POINTER_POINTS + POINTER_LAST_POINTS)}, The Lazy Pointer`],
  ])
  // kept only in the arcade: a fresh one has none
  assert.deepEqual(arcadeView(newArcade({ mode: 'free', seed: 8, now: 0 }), 0).screen.facts, [])
  // a visit: a game cut short by the chime is not counted, and the facts are kept through the farewell
  let v = newArcade({ mode: 'visit', players: ['Jessa', 'Mari'], seed: 2, now: 0 })
  ;[v, t] = playGame(v, 0, 'knock')
  v = aStep(v, (t = v.stageAt + RESULT_MS))
  const before = arcadeView(v, t).screen.facts
  assert.deepEqual(before.map(f => f.label), ['Games played'], 'three got away: nothing else happened')
  v = aIn(v, key(menuKey('tail')), t)
  v = aIn(v, press(0), (t += PICK_MS))
  v = aStep(v, (t += COUNT_MS + 5000))
  v = arcadeChime(frozen({ ...v, game: { ...v.game, catches: 3, score: 6 } }), t)
  assert.equal(v.stage, 'farewell')
  assert.deepEqual(arcadeView(v, t).screen.facts, before, 'the game the chime cut is not counted')
  const fresh = aStep(v, t + FAREWELL_MS)
  assert.equal(fresh.stage, 'home')
  assert.equal(fresh.mode, 'free')
  assert.deepEqual(arcadeView(fresh, t + FAREWELL_MS).screen.facts, before, 'kept through the farewell')
})

test('G55 the gold ones are counted (29 Oct 2026): every gold mouse tapped, a late tap on one too, and every gold ball of yarn caught, summed across games as Gold ones caught, listed after the yarn and only once there is one', () => {
  const T = 1000
  // Whack-a-Mouse: a gold mouse tapped, and one tapped a moment after it hid; a plain one is not gold
  const m0 = { ...newGame('mice', { seed: 11, lengthMs: 120000, now: 0 }), at: T - 1, nextSpawnAt: 100000 }
  assert.equal(m0.golds, 0)
  const tapped = input({ ...m0, mice: [{ key: 5, gold: true, downAt: T + 500 }, { key: 6, gold: false, downAt: T + 500 }] }, key(5), T)
  assert.equal(tapped.golds, 1)
  assert.equal(input(tapped, key(6), T + 10).golds, 1, 'a plain one is not gold')
  const hid = step({ ...m0, mice: [{ key: 7, gold: true, downAt: T }] }, T)
  assert.equal(input(hid, key(7), T + MICE_LATE_MS - 1).golds, 1, 'a late tap on a gold one counts')
  assert.equal(input(hid, key(7), T + MICE_LATE_MS).golds, 0, 'too late, nothing')
  // Yarn Catch: a gold ball into the basket, and one caught just in time on the bottom row; one missed is not counted
  const y0 = { ...newGame('yarn', { seed: 9, lengthMs: 120000, now: 0 }), at: T - 1, nextSpawnAt: 100000 }
  assert.equal(y0.golds, 0)
  const into = step({ ...y0, balls: [{ col: 4, row: ROWS - 2, gold: true, nextAt: T, missAt: null }] }, T)
  assert.deepEqual([into.caught, into.golds], [1, 1])
  assert.deepEqual(step({ ...y0, balls: [{ col: 4, row: ROWS - 2, gold: false, nextAt: T, missAt: null }] }, T).golds, 0, 'a plain ball is not gold')
  const waits = step({ ...y0, balls: [{ col: 5, row: ROWS - 2, gold: true, nextAt: T, missAt: null }] }, T)
  assert.equal(input(waits, arrow('right'), T + 10).golds, 1, 'caught just in time')
  const missed = step(waits, T + YARN_LAND_MS)
  assert.deepEqual([missed.dropped, missed.golds], [1, 0], 'missed, not counted')
  // summed across games, after the balls of yarn and before the best game
  const finished = (x, u, game) => aStep({ ...x, stage: 'play', stageAt: u, pick: game.id, game }, game.endsAt)
  const short = (id, u, more) => ({ ...newGame(id, { seed: 1, lengthMs: 1000, now: u }), ...more })
  let a = newArcade({ mode: 'free', seed: 8, now: 0 })
  a = finished(a, 0, short('mice', 0, { bonked: 6, golds: 2, score: 10 }))
  assert.equal(a.stats.gold, 2)
  assert.deepEqual(arcadeView(a, a.stageAt).screen.facts.map(f => [f.label, f.value]), [
    ['Games played', '1'], ['Mice bonked', '6'], ['Gold ones caught', '2'], ['Best game', '10 points, Whack-a-Mouse'],
  ])
  let t = a.stageAt + RESULT_MS
  a = finished(aStep(a, t), t, short('yarn', t, { caught: 5, golds: 3, score: 11 }))
  assert.equal(a.stats.gold, 5)
  assert.deepEqual(arcadeView(a, a.stageAt).screen.facts.map(f => [f.label, f.value]), [
    ['Games played', '2'], ['Mice bonked', '6'], ['Balls of yarn caught', '5'], ['Gold ones caught', '5'], ['Best game', '11 points, Yarn Catch'],
  ])
  // none gold, no line
  const plain = finished(newArcade({ mode: 'free', seed: 8, now: 0 }), 0, short('yarn', 0, { caught: 4, score: 4 }))
  assert.equal(plain.stats.gold, 0)
  assert.ok(!arcadeView(plain, plain.stageAt).screen.facts.some(f => f.label === 'Gold ones caught'))
})

test('G55 the Preview\'s samples: each is the moment its name says', () => {
  const now = 50000
  const view = name => arcadeView(arcadeSample(name, now), now)
  let v = view('home')
  assert.equal(v.screen.stage, 'home')
  assert.equal(v.screen.mode, 'free')
  assert.equal(v.screen.clockMs, null)
  v = view('menu')
  assert.equal(v.screen.stage, 'menu')
  assert.equal(v.screen.player, 'Mari')
  assert.equal(v.strip.centre, "Mari's turn")
  assert.deepEqual(rowFaces(v.faces, 2), ['blank', 'blank', 'coin', 'coin', 'coin-spent', 'coin', 'coin', 'blank', 'blank'], 'the coin under the game she has played is spent (1 Nov 2026)')
  assert.equal(v.faces[menuKey('mice')], 'menu-done:mice')
  assert.deepEqual(v.screen.players.map(p => [p.name, p.tokens, p.now]), [['Jessa', 3, false], ['Mari', 4, true]])
  v = view('play')
  assert.equal(v.screen.stage, 'play')
  assert.equal(v.screen.game.id, 'tail')
  assert.equal(v.faces.filter(f => f === 'tail-boo').length, 1)
  for (const part of ['tail-tip:', 'tail-fur:', 'tail-end:']) assert.equal(v.faces.filter(f => f.startsWith(part)).length, 1, `one ${part}`)
  assert.equal(v.faces[keyAt(2, 3)], 'tail-boo')
  assert.equal(v.faces[keyAt(1, 2)], 'wall', 'a wall out')
  assert.equal(v.faces[keyAt(3, 5)], 'pet:irwin', 'and a friend')
  assert.equal(v.faces.filter(f => f === 'rug').length, KEY_COUNT - 8, 'her rug on every other key (a fish and a cucumber out too)')
  assert.equal(v.screen.score, 4 * TAIL_POINTS + TAIL_TREAT_POINTS, 'four tail tips and a fish')
  assert.deepEqual(v.screen.tally, { label: 'Tail tips caught', value: 4 })
  assert.equal(v.screen.timeLeftMs, 59000, 'about a minute left')
  assert.deepEqual(v.strip.clock, { left: 59000, length: FREE_GAME_MS }, 'about a minute left on the bar')
  assert.equal(v.strip.score, 4 * TAIL_POINTS + TAIL_TREAT_POINTS)
  v = view('clue')
  assert.equal(v.screen.stage, 'clue')
  assert.deepEqual(v.screen.players.map(p => p.tokens), [0, 1], 'after her fifth game, so the sample shows what the Game test tab calls it (1 Nov 2026)')
  assert.equal(v.screen.player, 'Jessa')
  assert.equal(v.screen.clue, STAND_IN_CLUE)
  assert.equal(v.screen.players.length, 2)
  v = view('third')
  assert.equal(v.screen.stage, 'third')
  assert.deepEqual(v.screen.players.map(p => p.tokens), [0, 0, 0], 'after their fifth game')
  assert.equal(v.screen.player, 'Ellie')
  assert.equal(v.screen.players.length, 3)
  assert.equal(v.screen.third, THIRD_LINE)
  v = view('winner')
  assert.deepEqual(v.screen.winner, { names: ['Jessa'], total: 156 }, 'five games each (30 Oct 2026)')
  v = view('farewell')
  assert.equal(v.screen.stage, 'farewell')
  assert.equal(v.screen.farewell, FAREWELL_LINE)
  assert.deepEqual(v.screen.pending, [])
  assert.equal(v.screen.plain, '')
  assert.equal(v.screen.clockMs, 0)
  assert.equal(arcadeSample('anything else', now).stage, 'home')
  for (const name of SAMPLES) {
    const a = arcadeSample(name, now)
    assert.deepEqual(json(a), a, `${name} is plain JSON`)
    assert.deepEqual(arcadeSample(name, now), a, `${name} is the same each time`)
    for (const f of arcadeView(a, now).faces) assert.ok(FACE_IDS.includes(f))
    aStep(a, now + 1000) // and runs on like any other moment
  }
})

// ---- G56: the words ------------------------------------------------------------

test('G56 the practice page\'s clue is a note in brackets of the arcade\'s own; no night ever deals one (a practice night deals Boo\'s real line since 11 Nov 2026)', () => {
  assert.equal(STAND_IN_CLUE, "[Boo's bag clue about the Ghost appears here]")
  // the house's own stand-in is gone: on a night, a practice night too, the Mac shows what the arcadeClue
  // callable sends, and the server has no line in square brackets left to send
  const bag = src('../../functions/lib/bagclues.js')
  assert.ok(!bag.includes('bagStandIn') && !bag.includes('appears here'), 'no stand-in in the bag clue engine')
  for (const file of ['deal.js', 'act4.js', 'station.js', 'screen.js']) assert.ok(!/appears? here\]|StandIn|STAND_IN/.test(src(`../../functions/lib/${file}`)), `${file} deals no stand-in`)
  // and the page shows its note only with no night behind it (the practice page, the workshop's preview)
  assert.ok(src('../src/lib/arcade.js').includes("clue: a.stage !== 'clue' ? null : a.night ? a.clues?.[a.turn] ?? CLUE_WAIT : STAND_IN_CLUE,"))
})

test('G56 Jon\'s two lines, word for word, where he wants them', () => {
  assert.equal(THIRD_LINE, "Didn't I give you enough? Now be off! I'm done playing games.")
  assert.equal(FAREWELL_LINE, 'Be on your way.')
  assert.equal(BOO_LINES.third, THIRD_LINE)
  assert.equal(BOO_LINES.farewell, FAREWELL_LINE)
  const third = arcadeView(arcadeSample('third', 0), 0)
  assert.equal(third.screen.boo, THIRD_LINE)
  const bye = arcadeView(arcadeSample('farewell', 0), 0)
  assert.equal(bye.screen.boo, FAREWELL_LINE)
  assert.equal(bye.strip.centre, FAREWELL_LINE)
})

test('G56 no em dash in the arcade\'s files, and straight apostrophes in the engine', () => {
  const files = ['../src/lib/arcade.js', '../src/screens/Arcade.jsx', '../src/lib/arcadeArt.js', '../src/lib/arcadeDeck.js', '../src/lib/arcadeSound.js']
  const here = files.filter(f => existsSync(new URL(f, import.meta.url)))
  assert.ok(here.includes('../src/lib/arcade.js'))
  for (const f of here) assert.ok(!src(f).includes('\u2014'), `no em dash in ${f}`)
  const engine = src('../src/lib/arcade.js')
  assert.ok(!engine.includes('\u2019') && !engine.includes('\u2018'), 'straight apostrophes')
})

test('G56 every word the arcade can show passes F09 and names no device, the result names how each game ended, and Boo\'s lines carry no number, no rule, no case word and no echo', () => {
  const phone = src('./phone.test.mjs')
  const m = /^const WAITING = (\/.+\/[a-z]*)$/m.exec(phone)
  assert.ok(m, 'F09\'s check is where it was')
  const WAITING = new Function(`return ${m[1]}`)()
  assert.ok(WAITING.test('Waiting for the other players...'), 'the check bites')

  // every moment: samples, whole visits of one, two and three, free play, every strike and every way a game ends, the chime with names left out
  const views = []
  const look = (a, t) => views.push(arcadeView(a, t))
  for (const name of SAMPLES) look(arcadeSample(name, 1000), 1000)
  runVisit(['Jessa'], ['yarn', 'pointer'], { look })
  runVisit(['Jessa', 'Mari'], ['knock', 'tail'], { look, during: knocker })
  runVisit(['Margaret', 'Tom', 'Ellie'], ['mice', 'knock', 'tail', 'pointer', 'yarn'], { look })
  runVisit(['Jessa', 'Mari'], ['mice', 'knock'], { look, during: striker })
  for (const { id } of GAMES) {
    let f = newArcade({ mode: 'free', seed: 5, now: 0 })
    look(f, 0)
    let t
    ;[f, t] = playGame(f, 0, id)
    look(f, t)
  }
  // every way a game ends, on free play's result and on a visit's
  const ends = endings()
  const order = ['tailPoints', 'tailNone', 'pointerOut', 'pointerLasted', 'miceOut', 'miceNone', 'knockOut', 'yarnPoints']
  const results = order.map(k => ends[k])
  assert.deepEqual(results.map(g => g.outcome), ['time', 'time', 'lose', 'time', 'lose', 'time', 'lose', 'time'])
  assert.deepEqual(results.map(g => g.score > 0), [true, false, false, true, true, false, false, true])
  const visit = arcadeSample('clue', 0)
  for (const g of results) {
    look(onResult(g), g.endedAt)
    look(onResult(g, { mode: 'visit', players: visit.players, turn: 0, roundEndsAt: g.endedAt + 60000 }), g.endedAt)
  }
  const shownOn = results.map(g => arcadeView(onResult(g), g.endedAt))
  const how = ["Time's up.", "Time's up.", 'Boo caught the dot five times.', "Time's up.", 'You tapped five friends.', "Time's up.", 'Five misses.', "Time's up."]
  // the result's strip: the game, how it ended, the points
  assert.deepEqual(shownOn.map(v => v.strip.centre), how)
  assert.deepEqual(shownOn.map(v => v.strip.left), results.map(g => GAMES.find(x => x.id === g.id).name))
  assert.deepEqual(shownOn.map(v => v.strip.right), results.map(g => pts(g.score)))
  // the screen: the same words, then the points; on a visit the player's name
  assert.deepEqual(shownOn.map(v => v.screen.plain), results.map((g, i) => `${how[i]} ${pts(g.score)}.`))
  assert.equal(arcadeView(onResult(ends.pointerOut, { mode: 'visit', players: visit.players, turn: 0 }), ends.pointerOut.endedAt).screen.plain, 'Boo caught the dot five times. Jessa: 0 points.')
  // the clock run out with points pleases her; with none, or a loss, does not
  const pleased = v => BOO_LINES.win.includes(v.screen.boo)
  assert.deepEqual(shownOn.map(pleased), [true, false, false, true, false, false, false, true])
  assert.deepEqual(shownOn.map(v => v.screen.boo).filter((b, i) => !pleased(shownOn[i])), [BOO_LINES.time, BOO_LINES.caught, BOO_LINES.pets, BOO_LINES.time, BOO_LINES.lose])
  assert.deepEqual(shownOn.map(v => v.screen.picture), [' Boo 5.png', 'Boo 4.png', 'Boo 3.png', ' Boo 5.png', 'Boo 3.png', 'Boo 4.png', 'Boo 3.png', ' Boo 5.png'])
  look(arcadeChime(arcadeSample('menu', 0), 10), 10) // Mari is left out
  const trio = newArcade({ mode: 'visit', players: ['Margaret', 'Tom', 'Ellie'], seed: 1, now: 0 })
  look(arcadeChime(trio, 10), 10) // all three
  look(arcadeChime({ ...trio, players: trio.players.map((p, i) => ({ ...p, reached: i < 2 })) }, 10), 10) // only the third

  // the words
  const words = new Set([ARCADE_NAME, STAND_IN_CLUE, CLUE_NOTE, THIRD_LINE, FAREWELL_LINE, ...Object.values(BOO_LINES).flat(),
    ...GAMES.flatMap(g => [g.name, g.short, g.how, g.boo, g.counts, ...(g.rule ? [g.rule] : []), ...g.dials])])
  for (const v of views) for (const w of shownWords(v)) words.add(w)
  assert.ok(words.size > 80, `${words.size} lines`)
  for (const w of words) {
    assert.ok(!WAITING.test(w), `F09: ${w}`)
    assert.ok(!w.includes('\u2014'), `no em dash: ${w}`)
  }
  const shown = new Set(views.flatMap(shownWords)) // what a view showed, not the lists above
  for (const w of ['Strike 1! Too soon.', 'Strike 2! Too soon.', 'Strike 1! It got away.', 'Strike 2! It got away.',
    'Strike 1! Boo caught it.', 'Strike 2! Boo caught it.', "Caught five times and you're out.", "Tap five friends and you're out.", "Five misses and you're out.",
    'You tapped five friends.', 'Boo caught the dot five times.', 'Five misses.', "Time's up.", 'Games played', 'Best game']) {
    assert.ok(shown.has(w), `shown: ${w}`)
  }
  // a friend tapped is named (Jon, 29 Oct 2026: not "a pet")
  const named = [...shown].filter(w => /^Strike \d! That's /.test(w))
  assert.ok(named.some(w => w.startsWith('Strike 1! ')) && named.some(w => w.startsWith('Strike 2! ')), 'a friend named on the strip')
  for (const w of named) assert.ok(Object.values(STRUCK).includes(w.replace(/^Strike \d! /, '')), w)
  assert.ok(![...words].some(w => /\bpets?\b/i.test(w)), 'never "pet" in the words')
  // no device's name in front of the guests (Jon, 29 Oct 2026: "make sure there is no programing things like connect stream deck and such visible to the players")
  for (const w of words) assert.ok(!/stream ?deck|elgato|\bmac(book)?\b|chrome|safari|browser|\busb\b|connect|plug/i.test(w), `no device's name: ${w}`)
  assert.equal(arcadeView(newArcade({ mode: 'free', seed: 1, now: 0 }), 0).screen.plain, 'Press a game. Just for fun.')
  assert.equal(arcadeView(arcadeSample('menu', 0), 0).screen.plain, "Mari's turn: press a game you have not played yet.")
  assert.ok([...shown].some(w => /^Out of time before their clue: [A-Z]/.test(w)), 'the chime names who it caught short')
  assert.ok(shown.has("Out of time before their clue: Margaret and Tom. Out of time before Boo's line: Ellie."))
  assert.ok(shown.has("Out of time before Boo's line: Ellie."))
  assert.ok(views.some(v => v.screen.stage === 'third') && views.some(v => v.screen.stage === 'winner') && views.some(v => v.screen.stage === 'farewell'))

  // Boo's own lines
  const boo = new Set([...Object.values(BOO_LINES).flat(), ...GAMES.map(g => g.boo), ...views.map(v => v.screen.boo)])
  const echoes = [src('../../functions/lib/hosts.js'), src('../../functions/lib/act4.js'), src('../../seed/cat-lines.json'), src('../src/lib/gametest.js')]
  for (const line of boo) {
    assert.ok(line && !/\d/.test(line), `no number in Boo's line: ${line}`)
    assert.ok(!/\b(motives?|famil(y|ies)|rooms?|bags?|senses?|objects?|ghost|murder\w*|clues?|points?|score|dial|key|press|strikes?)\b/i.test(line), `no rule or case word: ${line}`)
    assert.ok(!/\b(meow|miaow|mew|purr\w*|hiss\w*)\b/i.test(line), `no cat sound: ${line}`)
    assert.ok(!line.includes('Ew. Do I know you?'))
    if (line === THIRD_LINE) continue // Jon's words for a trio's third player: the house deals the same line to their phone (functions/lib/act4.js ARCADE_THIRD_LINE, 5 Nov 2026)
    for (const text of echoes) assert.ok(!text.includes(line), `not an echo of another Boo line: ${line}`)
  }
  assert.ok(boo.has(THIRD_LINE) && boo.has(FAREWELL_LINE))
  // the pictures she is shown in are the house's own
  for (const p of BOO_PICTURES) assert.ok(existsSync(new URL(`../public/household/full/${p}`, import.meta.url)), p)
  for (const v of views) assert.ok(BOO_PICTURES.includes(v.screen.picture), v.screen.picture)
})

test('G56 pure: the engine imports nothing and touches no browser, no clock and no Math.random', () => {
  const code = src('../src/lib/arcade.js').replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`])\/\/.*$/gm, '$1')
  assert.ok(!/^\s*import\b/m.test(code), 'no imports at all: no React, no Firebase')
  assert.ok(!/\bimport\s*\(/.test(code))
  for (const word of ['react', 'firebase', 'window', 'document', 'navigator', 'performance', 'Date.now', 'new Date', 'Math.random', 'localStorage', 'setTimeout', 'setInterval', 'import.meta', 'require(']) {
    assert.ok(!code.includes(word), `the engine never uses ${word}`)
  }
})

// ---- the page (screens/Arcade.jsx), its routing and its samples ----------------

// The module names a file imports, its comments set aside.
const uncommented = text => text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`])\/\/.*$/gm, '$1')
function importsOf(code) {
  return [
    ...[...code.matchAll(/\bfrom\s*['"]([^'"]+)['"]/g)].map(m => m[1]),
    ...[...code.matchAll(/^\s*import\s*['"]([^'"]+)['"]/gm)].map(m => m[1]),
    ...[...code.matchAll(/\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g)].map(m => m[1]),
  ]
}
const ARCADE_FILES = ['../src/screens/Arcade.jsx', '../src/lib/arcade.js', '../src/lib/arcadeArt.js', '../src/lib/arcadeDeck.js', '../src/lib/arcadeSound.js']

test('L09 the arcade reads no night and shows nothing sealed: no Firebase, no hooks, no callable, the stand-in its only clue, and its own route before the practices and the room screens', () => {
  for (const f of ARCADE_FILES) {
    assert.ok(existsSync(new URL(f, import.meta.url)), f)
    const code = uncommented(src(f))
    for (const m of importsOf(code)) assert.ok(!/firebase|(^|\/)hooks$/.test(m), `${f} imports ${m}`)
    assert.ok(!/\bhttpsCallable\b|\bcall[A-Z]\w*\s*\(/.test(code), `${f} calls no callable`)
    assert.ok(!/\b(useDoc|useAuthUid|useServerClock|getFirestore|onSnapshot|signInAnonymously)\b/.test(code), `${f} reads no night and signs in nowhere`)
    assert.ok(!/nights\/|cases\/|sealed\/|archive\/|presence/.test(code), `${f} names no night, case, sealed record or presence row`)
    assert.ok(!/seed\/|bag-lines|bagclues|cat-lines|woof-news/.test(code), `${f} reads no clue bank`)
  }
  // the engine and the three browser libraries import exactly these, and the import( calls are counted, so no spelling slips past
  for (const [f, list, calls] of [['../src/lib/arcade.js', [], 0], ['../src/lib/arcadeArt.js', [], 0], ['../src/lib/arcadeSound.js', [], 0],
    ['../src/lib/arcadeDeck.js', ['@elgato-stream-deck/webhid'], 1]]) {
    const code = uncommented(src(f))
    assert.deepEqual([...new Set(importsOf(code))].sort(), list, `${f} imports only ${list.join(', ') || 'nothing'}`)
    assert.equal((code.match(/\bimport\s*\(/g) ?? []).length, calls, `${f}: ${calls} import( calls`)
  }
  // the page imports only the arcade's own files and three small things of the house's
  const page = uncommented(src('../src/screens/Arcade.jsx'))
  assert.deepEqual([...new Set(importsOf(page))].sort(),
    ['../lib/arcade', '../lib/arcadeArt', '../lib/arcadeDeck', '../lib/arcadeSound', './Kiosk', './Moments', './Spoken', 'react'])
  assert.equal((page.match(/\bimport\s*\(/g) ?? []).length, 0, 'the page lazy-loads nothing, in any spelling')
  assert.match(page, /import \{ wakeAudio, Wake \} from '\.\/Kiosk'/, 'from the room screens, only the wake corner and its AudioContext')
  assert.match(page, /import \{ RehearsalBand \} from '\.\/Moments'/)
  assert.ok(!/<Kiosk\b|<Bell\b|<StaleDot\b/.test(page), 'never a room screen, its bell or its dot')
  // the only clue it can show is the engine's, and the engine's only clue is the stand-in
  assert.ok(page.includes('{screen.clue}'), 'the clue on the screen is the engine\'s')
  assert.ok(!/\[[^\]\n]*\bappears here\b|['"`]\[[^\]'"`]*\s[^\]'"`]*\]/.test(page), 'no square-bracket line of the page\'s own')
  assert.ok(!page.includes(STAND_IN_CLUE), 'the stand-in is not copied into the page')
  for (const name of SAMPLES) {
    const { screen } = arcadeView(arcadeSample(name, 0), 0)
    assert.ok(screen.clue === null || screen.clue === STAND_IN_CLUE, `${name}: ${screen.clue}`)
  }
  assert.equal(arcadeView(arcadeSample('clue', 0), 0).screen.clue, STAND_IN_CLUE)
  // ?kiosk=boo&play=1 is the arcade, ahead of the practice show (?kiosk=boo&practice=1) and Boo's wall (?kiosk=boo)
  const main = src('../src/main.jsx')
  assert.match(main, /import BooArcade from '\.\/screens\/Arcade'/)
  assert.match(main, /const arcade = kiosk === 'boo' && new URLSearchParams\(window\.location\.search\)\.get\('play'\) === '1'/)
  assert.match(main, / : arcade \? <BooArcade \/> : Practicing \? <Practicing \/> : kiosk \? <Kiosk which=\{kiosk\} \/> : <App \/>/)
})

test('L09 the page: one 16 ms loop, stopped when it goes; the deck only through lib/arcadeDeck.js, its painter handed every view and the faces to make ready; the arrow keys and the mouse wheel play; the Scoreboard while the Stream Deck is connected; the sounds only through sfx on the kiosk\'s AudioContext; the PRACTICE band only in a visit; nothing kept', () => {
  const page = uncommented(src('../src/screens/Arcade.jsx'))
  // the loop
  assert.match(page, /^const TICK_MS = 16\s*$/m)
  assert.equal(Number(/^const TICK_MS = (\d+)\s*$/m.exec(page)[1]), TICK, 'the tests step at the page\'s pace')
  assert.match(page, /setInterval\(\(\) => tickRef\.current\(\), TICK_MS\)/, 'the loop runs at TICK_MS')
  assert.equal((page.match(/setInterval\(/g) ?? []).length, 1, 'one loop')
  assert.match(page, /return \(\) => clearInterval\(id\)/, 'and it stops when the page goes')
  // the deck, opened only by lib/arcadeDeck.js
  assert.ok(!/navigator\.hid|requestDevice|openDevice|@elgato/.test(page), 'the deck is opened only by lib/arcadeDeck.js')
  assert.match(page, /function connect\(\) \{\s*const asking = chooseDeck\(\{ steal: true \}\)/, 'Connect asks the browser first, inside the click, and takes the deck from another arcade tab')
  assert.match(page, /reopenDeck\(\{ steal: true \}\)\.then\(d => \{/, 'the open on load takes the deck from another arcade tab')
  assert.match(page, /onPlug: \(\) => reopenDeck\(\)\.then\(d => \{ if \(cancelled\) return; if \(d\) attach\(d\); else setProblem\(p => deckProblem\(\) \?\? p\) \}\)/,
    'a replug asks only if the deck is free, and says why it could not')
  // the painter: every view, the keys a press changed first, and every face made ready once the art is in
  assert.match(page, /const urgent = pressed \? changed\(viewRef\.current\?\.faces, v\.faces\) : null/)
  assert.match(page, /heldRef\.current\?\.painter\.paint\(v\.faces, v\.strip, \{ urgent \}\)/, 'each view, the pressed keys first')
  assert.match(page, /const WARM_FACES = \[\.\.\.new Set\(\[\.\.\.MENU_FACES, \.\.\.FACE_IDS\]\)\]/)
  assert.equal((page.match(/painter\.warm\(WARM_FACES\)/g) ?? []).length, 2, 'when the art comes in, and when a deck connects')
  // &strip=whole sends the touch strip whole every time
  assert.match(page, /function wholeStrip\(\) \{\s*try \{ return new URLSearchParams\(window\.location\.search\)\.get\('strip'\) === 'whole' \} catch \{ return false \}\s*\}/)
  assert.match(page, /deckPainter\(d, ART, \{ onLost: error => lost\(d, error\), wholeStrip: wholeStrip\(\) \}\)/)
  // the keyboard's arrows play, as the engine's arrow events
  const arrows = /const ARROW_KEYS = (\{[^}]*\})/.exec(page)
  assert.ok(arrows, 'the arrow keys')
  assert.deepEqual(new Function(`return ${arrows[1]}`)(), { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down' })
  assert.match(page, /if \(ARROW_KEYS\[e\.key\]\) ev = \{ kind: 'arrow', dir: ARROW_KEYS\[e\.key\] \}/)
  const tail = newGame('tail', { seed: 1, now: 0 })
  for (const dir of ['left', 'right', 'up', 'down']) assert.notEqual(inputGame(tail, arrow(dir), 10).boo, tail.boo, `the engine takes the arrow ${dir}`)
  // the mouse wheel over a drawn dial turns it, one click a turn, heard on the page's middle (always there)
  assert.match(page, /<main\b[^>]*\bref=\{mainRef\}/)
  assert.match(page, /const box = mainRef\.current\s*if \(!live \|\| !box\) return/)
  assert.match(page, /box\.addEventListener\('wheel', onWheel, \{ passive: false \}\)/)
  assert.match(page, /return \(\) => box\.removeEventListener\('wheel', onWheel\)/)
  assert.match(page, /inputRef\.current\(\{ kind: 'turn', dial, amount: dir \}\)/)
  assert.match(page, /\{ kind: 'turn', dial: d, amount: -1 \}/, 'a drawn dial\'s arrows turn it one click')
  assert.match(page, /\{ kind: 'turn', dial: d, amount: 1 \}/)
  // the drawn strip says what the real one says, as the finger lifts: a tap where it touched, or a slide from there to where it lifted
  assert.match(page, /return r\.width > 0 \? \(e\.clientX - r\.left\) \/ r\.width \* STRIP_W : 0/)
  assert.match(page, /onInput\(Math\.abs\(to - from\) < SLIDE_MIN \? \{ kind: 'strip', x: from \} : \{ kind: 'swipe', from, to \}\)/)
  assert.match(page, /const slide = useRef\(null\)/, 'kept across a drawing of the deck')
  assert.ok(!/onPointerMove/.test(page), 'nothing while it slides: the deck says nothing until it lifts')
  // the winner's page goes on at a tap on the strip, so the space bar is one
  // the space bar and Enter tap the strip at the winner only for the drawn deck, and the digits are the score keys there (1 Nov 2026)
  assert.match(page, /arcadeRef\.current\?\.stage !== 'winner' \? \{ kind: 'press', dial: 0 \} : heldRef\.current \? null : STRIP_TAP/)
  assert.match(page, /\(arcadeRef\.current\?\.stage === 'winner' \? SCORE_KEYS : MENU_KEYS\)\[Number\(e\.key\) - 1\]/)
  assert.match(page, /if \(index != null\) ev = \{ kind: 'key', index \}/, 'a digit with no key behind it does nothing')
  // with the Stream Deck connected the screen is a scoreboard; without it, the deck is drawn there to play on
  assert.match(page, /const onDeck = deck === 'connected'/)
  assert.match(page, /\{onDeck \? screen \? <Scoreboard screen=\{screen\} pops=\{pops\} art=\{artReady\} \/>/)
  assert.match(page, /: <Deck view=\{view\} art=\{artReady\} onInput=\{live \? input : null\} \/>/)
  for (const part of ['screen.score', 'screen.timeLeftMs', 'screen.tally.value', 'screen.tally.label', 'screen.said', 'screen.facts']) assert.ok(page.includes(part), `the scoreboard shows ${part}`)
  // the sounds
  assert.ok(!/AudioContext/.test(page), 'no AudioContext of its own')
  assert.match(page, /const ctx = wakeAudio\(\)\s*for \(const name of events\) sfx\(ctx, name\)/)
  assert.match(page, /<RehearsalBand on=\{live && visit && !night\} label="PRACTICE" \/>/) // on the night the kiosk's own band shows (5 Nov 2026)
  assert.match(page, /\{live && !night \? <Wake \/> : null\}/, 'the wake corner, never on a sample, and on the night the kiosk keeps it (5 Nov 2026)')
  assert.ok(!/localStorage|sessionStorage|indexedDB|fetch\(/.test(page), 'it keeps nothing and sends nothing')
  for (const words of Object.values({
    tab: 'The Stream Deck went to another arcade tab. Press Connect to bring it back here.',
    busy: 'The Stream Deck is busy: quit the Stream Deck app, then press Connect again.',
    gone: 'The Stream Deck was unplugged. Plug it back in.',
    other: "The Stream Deck didn't answer. Press Connect again.",
  })) assert.ok(page.includes(words), words)
  for (const words of ['Connect the Stream Deck', 'To play on the Stream Deck, open this page in Google Chrome.', 'Ring the chime', "Try a group's visit"]) {
    assert.ok(page.includes(words), words)
  }
  // no setup words in front of the players once the deck is connected (Jon, 29 Oct 2026)
  assert.ok(!page.includes('Stream Deck + XL: connected.'), 'the footer says nothing about a connected deck')
})

test('G54 the art lists every face the engine shows, and the sounds every name it asks for', async () => {
  const { knowsFace, FACE_SIZE, STRIP_W, STRIP_H } = await import('../src/lib/arcadeArt.js')
  const { SOUNDS } = await import('../src/lib/arcadeSound.js')
  for (const f of FACE_IDS) assert.ok(knowsFace(f), `the art draws ${f}`)
  for (const s of SOUND_NAMES) assert.ok(SOUNDS.includes(s), `a sound for ${s}`)
  assert.deepEqual([FACE_SIZE, STRIP_W, STRIP_H], [112, 1200, 100], 'the + XL\'s key and strip')
  assert.equal(STRIP_WIDTH, STRIP_W, 'the engine\'s strip is the art\'s')
})

test('G56 no em dash in the page or its three browser libraries', () => {
  for (const f of ['../src/screens/Arcade.jsx', '../src/lib/arcadeArt.js', '../src/lib/arcadeDeck.js', '../src/lib/arcadeSound.js']) {
    assert.ok(existsSync(new URL(f, import.meta.url)), f)
    assert.ok(!src(f).includes('\u2014'), `no em dash in ${f}`)
  }
})

test('the Preview has the arcade\'s five samples, each a frozen moment the engine names', () => {
  const preview = src('../src/Preview.jsx')
  assert.match(preview, /import BooArcade from '\.\/screens\/Arcade'/)
  const PREVIEWS = { 'kiosk-arcade': 'home', 'kiosk-arcade-play': 'play', 'kiosk-arcade-clue': 'clue', 'kiosk-arcade-third': 'third', 'kiosk-arcade-farewell': 'farewell' }
  for (const [name, sample] of Object.entries(PREVIEWS)) {
    assert.ok(preview.includes(`'${name}': () => <BooArcade sample="${sample}" />`), name)
    assert.equal(arcadeView(arcadeSample(sample, 0), 0).screen.stage, sample, `${name} is the ${sample} moment`)
  }
  // a sample has no loop, input, deck, sound, form or band: every one of them waits on `live`
  const page = uncommented(src('../src/screens/Arcade.jsx'))
  assert.match(page, /^\s*const live = !sample\s*$/m)
  assert.equal((page.match(/if \(!live\) return/g) ?? []).length, 4, 'the loop, the sound, the keyboard and the title')
  assert.equal((page.match(/if \(!live \|\| !a\) return/g) ?? []).length, 4, 'a press, the chime, Back and Leave this game')
  assert.match(page, /if \(!live \|\| !box\) return/, 'the mouse wheel')
  assert.match(page, /if \(!live \|\| !deckSupported\(\)\) return/, 'the deck')
  assert.match(page, /inert=\{sample \? true : undefined\}/, 'nothing on a sample answers a click')
  assert.match(page, /onInput=\{live \? input : null\}/, 'the drawn deck answers nothing on a sample')
})

test('G54 Back at the top of the page (Jon, 29 Oct 2026: "on the pratice page I need a back button. Im stuck and cant get back."): a visit ends for free play, a free-play result goes back to the games; and Leave this game beside it (Jon, 30 Oct 2026: an exit in every game), from the how-to to the play in a visit too, like Escape and the Exit dial', () => {
  const page = uncommented(src('../src/screens/Arcade.jsx'))
  assert.match(page, /\barcadeBack\b[^;]*\} from '\.\.\/lib\/arcade'/, 'the engine\'s Back')
  assert.match(page, /\barcadeExit\b[^;]*\} from '\.\.\/lib\/arcade'/, 'the engine\'s Exit')
  assert.match(page, /function leave\(\) \{\s*const a = arcadeRef\.current\s*if \(!live \|\| !a\) return\s*const now = performance\.now\(\)\s*move\(arcadeBack\(a, now\), now\)\s*\}/)
  assert.match(page, /function exit\(\) \{\s*const a = arcadeRef\.current\s*if \(!live \|\| !a\) return\s*const now = performance\.now\(\)\s*move\(arcadeExit\(a, now\), now\)\s*\}/)
  assert.match(page, /leaveRef\.current = leave/)
  assert.match(page, /exitRef\.current = exit/)
  const exitable = /const EXITABLE = (\[[^\]]*\])/.exec(page)
  assert.ok(exitable, 'the stages a game can be left from')
  assert.deepEqual(JSON.parse(exitable[1].replace(/'/g, '"')), ['ready', 'count', 'play'])
  assert.match(page, /const exiting = live && !setup && screen && EXITABLE\.includes\(stage\) \? 'Leave this game' : null/)
  assert.match(page, /const leaving = !live \|\| night \|\| setup \|\| !screen \? null : visit \? 'Back to free play' : stage === 'result' \? 'Back to the games' : null/)
  assert.match(page, /\{exiting \? <button type="button" className="arcade-back" onMouseDown=\{noFocus\} onClick=\{exit\}>\{exiting\}<\/button> : null\}/)
  assert.match(page, /\{leaving \? <button type="button" className="arcade-back" onMouseDown=\{noFocus\} onClick=\{leave\}>\{leaving\}<\/button> : null\}/)
  // Escape: Back on the how-to, Leave this game while a game counts down or runs (in a visit too), Back to the games on a free-play result
  assert.match(page, /if \(a\?\.stage === 'ready'\) ev = \{ kind: 'key', index: BACK_KEY \}\s*else if \(EXITABLE\.includes\(a\?\.stage\)\) \{ e\.preventDefault\(\); exitRef\.current\(\); return \}\s*else if \(a\?\.mode === 'free' && a\?\.stage === 'result'\) \{ e\.preventDefault\(\); leaveRef\.current\(\); return \}/)
  // the drawn deck's Exit dial: lit and named while the strip labels it
  assert.match(page, /labels\[d\] === 'Press' \|\| labels\[d\] === 'Exit' \? ' lit' : ''/)
  assert.match(page, /aria-label=\{labels\[d\] === 'Exit' \? 'Exit: leave this game' : `Press dial \$\{d \+ 1\}`\}/)
  // the page offers Back to the games where the engine leaves a free-play game, and Back to free play in a visit
  const ready = aIn(newArcade({ mode: 'free', seed: 6, now: 0 }), key(menuKey('mice')), 0)
  const count = aIn(ready, press(0), PICK_MS)
  const [play, tp] = started('mice')
  const [result, tr] = playGame(newArcade({ mode: 'free', seed: 6, now: 0 }), 0, 'mice', null)
  for (const [a, at] of [[ready, 1], [count, PICK_MS + 1], [play, tp], [result, tr]]) {
    const b = arcadeBack(a, at)
    assert.deepEqual([b.mode, b.stage, b.events], ['free', 'home', ['back']], `free play's ${a.stage}: back to the games`)
  }
  const home = newArcade({ mode: 'free', seed: 6, now: 0 })
  assert.deepEqual(arcadeBack(home, 10).events, [], 'on the menu there is nothing to go back to')
  const [visit, tv] = started('mice', { players: ['Ann', 'Bo'] })
  const left = arcadeBack(visit, tv)
  assert.deepEqual([left.mode, left.stage, left.events], ['free', 'home', ['back']], 'a visit: free play at once, no chime, no farewell')
})

test('G55 Leave this game, Escape and the Exit dial (Jon, 30 Oct 2026: "An exit button in every game, to go back", "A game left unfinished doesn\'t count"): from the how-to, the count or the play, in a visit the token comes back and the same player picks again, nothing is counted or recorded; from the result it only moves on; on the menu, a clue, the winner and the farewell nothing happens; every game, free play too', () => {
  for (const { id, dials } of GAMES) {
    const [play, tp] = started(id, { players: ['Ann', 'Bo'], seed: 11 })
    const before = play.players[0]
    assert.equal(before.tokens, TOKENS - 1, 'the token was spent as the count started')
    // the Exit dial, in play
    const x = aIn(play, press(EXIT_DIAL), tp + 500)
    assert.deepEqual([x.stage, x.turn, x.game, x.pick, x.events], ['menu', 0, null, null, ['back']], `${id}: back on the menu, the same player`)
    assert.equal(x.players[0].tokens, TOKENS, `${id}: the token is back`)
    assert.deepEqual(x.players[0].games, [], `${id}: nothing recorded`)
    assert.deepEqual(x.stats, play.stats, `${id}: nothing in the fun facts`)
    assert.equal(arcadeView(x, tp + 500).screen.plain, "Ann's turn: press a game you have not played yet.")
    // the button, in play and in the count, is the same
    assert.deepEqual(without(arcadeExit(frozen(play), tp + 500), 'events'), without(x, 'events'), `${id}: Leave this game is the Exit dial`)
    const count = aIn(aIn(newArcade({ mode: 'visit', players: ['Ann', 'Bo'], seed: 11, now: 0 }), key(menuKey(id)), 0), press(0), PICK_MS)
    assert.equal(count.stage, 'count')
    for (const leave of [a => arcadeExit(frozen(a), PICK_MS + 1000), a => aIn(a, press(EXIT_DIAL), PICK_MS + 1000)]) {
      const c = leave(count)
      assert.deepEqual([c.stage, c.players[0].tokens, c.players[0].games.length, c.events.includes('back')], ['menu', TOKENS, 0, true], `${id}: left from the count`)
    }
    // the how-to: like Back, nothing was spent
    const ready = aIn(newArcade({ mode: 'visit', players: ['Ann', 'Bo'], seed: 11, now: 0 }), key(menuKey(id)), 0)
    for (const leave of [a => arcadeExit(frozen(a), PICK_MS + 10), a => aIn(a, press(EXIT_DIAL), PICK_MS + 10)]) {
      const r = leave(ready)
      assert.deepEqual([r.stage, r.players[0].tokens, r.events], ['menu', TOKENS, ['back']], `${id}: left from the how-to`)
    }
    assert.equal(aIn(ready, press(EXIT_DIAL), PICK_MS - 1).stage, 'ready', 'not during the picked key\'s tick')
    // the strip names it only while the game counts down or runs
    assert.equal(arcadeView(ready, PICK_MS).strip.dials[EXIT_DIAL], dials[EXIT_DIAL], `${id}: no Exit on the how-to`)
    assert.equal(arcadeView(count, PICK_MS + 10).strip.dials[EXIT_DIAL], 'Exit', `${id}: Exit on the count`)
    assert.equal(arcadeView(play, tp).strip.dials[EXIT_DIAL], 'Exit', `${id}: Exit in play`)
    // the other dials pressed in do nothing to the game in play
    for (let d = 0; d < DIALS; d++) if (d !== EXIT_DIAL) assert.equal(aIn(play, press(d), tp + 500).stage, 'play', `${id}: dial ${d + 1}`)
    // free play: back to the games, nothing counted
    const [free, tf] = started(id, { seed: 12 })
    const f = aIn(free, press(EXIT_DIAL), tf + 500)
    assert.deepEqual([f.mode, f.stage, f.events, f.stats.games], ['free', 'home', ['back'], 0], `${id}: free play`)
    assert.deepEqual(without(arcadeExit(frozen(free), tf + 500), 'events'), without(f, 'events'))
  }
  // from the result: the game is over and counted, and Exit only moves on
  let [a, t] = playGame(newArcade({ mode: 'visit', players: ['Ann', 'Bo'], seed: 11, now: 0, roundMs: 3600000 }), 0, 'knock', knocker)
  assert.equal(a.stage, 'result')
  const moved = arcadeExit(frozen(a), t + 100)
  assert.deepEqual([moved.stage, moved.turn, moved.players[0].games.length, moved.players[0].tokens, moved.events], ['menu', 1, 1, TOKENS - 1, [], ], 'the result moves on to the next turn, the game kept')
  assert.equal(aIn(a, press(EXIT_DIAL), t + 100).stage, 'result', 'the result takes no presses')
  // nowhere else
  const home = newArcade({ mode: 'visit', players: ['Ann', 'Bo'], seed: 11, now: 0 })
  for (const [name, x, at] of [['menu', home, 10], ['clue', arcadeSample('clue', 1000), 1000], ['third', arcadeSample('third', 1000), 1000], ['winner', arcadeSample('winner', 1000), 1000], ['farewell', arcadeSample('farewell', 1000), 1000], ['home', arcadeSample('home', 1000), 1000]]) {
    assert.deepEqual(arcadeExit(frozen(x), at), aStep(x, at), name)
    assert.deepEqual(arcadeExit(x, at).events, [], name)
  }
})

test('G54 the page with the Stream Deck connected: the moment\'s Start, Back and OK only on the deck drawn on the screen, and each pop keeps its spot', () => {
  const page = uncommented(src('../src/screens/Arcade.jsx'))
  assert.match(page, /const go = live && !onDeck \? \(\) => input\(stage === 'winner' \? STRIP_TAP : \{ kind: 'press', dial: 0 \}\) : null/, 'the winner\'s OK is a tap on the strip, the page\'s one way on')
  assert.match(page, /const back = live && !onDeck \? \(\) => input\(\{ kind: 'key', index: BACK_KEY \}\) : null/)
  assert.match(page, /\{ \.\.\.pop, id, slot: id % POPS_KEPT \}/)
  assert.match(page, /className=\{`arcade-pop \$\{p\.kind\} slot-\$\{p\.slot\}`\}/)
  const css = src('../src/styles.css')
  assert.ok(!/\.arcade-pop:nth-child/.test(css), 'a pop is placed by its own slot, not by its place in the list, which moves as old ones go')
  // the four spots, in the order pops take them (ids 1, 2, 3, 4, then round again), each well clear of the one before
  const spot = k => Number(new RegExp(`\\.arcade-pop\\.slot-${k} \\{ left: (\\d+)%; \\}`).exec(css)?.[1])
  const order = [1, 2, 3, 0].map(spot)
  assert.ok(order.every(x => x >= 20 && x <= 80), `every spot on the board: ${order}`)
  order.forEach((x, i) => assert.ok(Math.abs(x - order[(i + 1) % 4]) >= 16, `pops one after another land apart: ${order}`))
  assert.ok(!page.includes('on the Stream Deck</p>'), 'the scoreboard names no device')
})

// The text of the function or arrow whose head is `head`, to its closing brace.
const bodyOf = (text, head) => {
  const at = text.indexOf(head)
  assert.ok(at >= 0, head)
  const open = text.indexOf('{', at + head.length - 1)
  let depth = 0
  for (let j = open; j < text.length; j++) {
    if (text[j] === '{') depth++
    else if (text[j] === '}' && --depth === 0) return text.slice(at, j + 1)
  }
  assert.fail(`${head}: no closing brace`)
}

test('G54 the page starts every arcade and every deck with no old pops, and the first click on the page reaches its button', () => {
  const page = uncommented(src('../src/screens/Arcade.jsx'))
  // a new arcade (a visit begun, free play, the visit's form) and the deck coming or going: the pops start afresh,
  // so pops kept from before never all play again at once when the scoreboard comes
  for (const head of ['function begin(', 'function freePlay(', 'function practice(', 'const lost = (d, error) => {', 'const attach = d => {', 'onUnplug: () => {']) {
    assert.match(bodyOf(page, head), /setPops\(\[\]\)/, `${head} clears the pops`)
  }
  // the first press wakes the sound at once, but the footer keeps the Wake corner's room until the click is over:
  // made smaller at the press, it would move Connect or Try a group's visit out from under the pointer
  assert.match(page, /const wake = e => \{ heardRef\.current = true; wakeAudio\(\); if \(e\.type !== 'pointerdown'\) setHeard\(true\) \}/)
  assert.match(page, /for \(const type of \['pointerdown', 'click', 'keydown'\]\) window\.addEventListener\(type, wake, true\)/)
  assert.match(page, /<footer className=\{`arcade-foot\$\{live && !heard && !night \? ' waking' : ''\}`\}>/)
})

// ---- the night's visit (card 515, 5 Nov 2026) ----

test('G55 on the night: the clue is the house\'s, shown once it comes, the chime follows the house\'s clock, and the free play after the farewell is still the night\'s', () => {
  const a = { ...arcadeSample('clue', 0), night: true, clues: {} }
  let v = arcadeView(a, 0).screen
  assert.equal(v.clue, CLUE_WAIT, 'until the house answers, Boo asks for a moment')
  assert.equal(v.note, null, 'no word of practice in front of the guests')
  const told = arcadeClueText(a, 0, 'Something about the one who screamed.')
  assert.equal(arcadeView(told, 0).screen.clue, 'Something about the one who screamed.')
  assert.equal(arcadeView(told, 0).screen.note, null)
  assert.equal(arcadeView(arcadeClueText(told, 0, null), 0).screen.clue, CLUE_WAIT, 'cleared, it waits again')
  assert.deepEqual(a.clues, {}, 'the one handed in is untouched')
  // in practice the stand-in and its note, as before
  const p = arcadeView(arcadeSample('clue', 0), 0).screen
  assert.equal(p.clue, STAND_IN_CLUE)
  assert.equal(p.note, CLUE_NOTE)
  // a night's visit: the house's clock sets the chime, and a pause can move it
  const n = newArcade({ mode: 'visit', players: ['Jon', 'Susan'], seed: 7, now: 0, roundMs: 300_000, night: true })
  assert.equal(n.night, true)
  assert.equal(n.roundEndsAt, 300_000)
  const later = arcadeRoundEnds(n, 420_000)
  assert.equal(later.roundEndsAt, 420_000)
  assert.equal(n.roundEndsAt, 300_000, 'the one handed in is untouched')
  assert.equal(arcadeStep(later, 300_001).stage, 'menu', 'no chime at the old end')
  const rung = arcadeStep(later, 420_000)
  assert.equal(rung.stage, 'farewell')
  assert.equal(arcadeRoundEnds(rung, 500_000).roundEndsAt, rung.roundEndsAt, 'once the chime has rung, nothing moves it')
  const after = arcadeStep(rung, 420_000 + FAREWELL_MS)
  assert.equal(after.stage, 'home')
  assert.equal(after.mode, 'free')
  assert.equal(after.night, true, 'the free play after the farewell is still the night\'s: no practice words')
  assert.equal(arcadeRoundEnds(after, 900_000).roundEndsAt, after.roundEndsAt, 'free play after the farewell has no chime to move')
  assert.equal(newArcade({ mode: 'free', seed: 1, now: 0 }).night, false)
})

test('G55 the visit\'s free play keeps the house\'s chime (6 Nov 2026): a pause moves the round\'s end there too, and Next rings it at once, so no game is left running for the next group', () => {
  let [a, t] = runVisit(['Jessa', 'Mari'], ['mice'])
  assert.ok(a.free && a.stage === 'home', 'through the winner to free play')
  const moved = arcadeRoundEnds(a, a.roundEndsAt + 60_000)
  assert.equal(moved.roundEndsAt, a.roundEndsAt + 60_000, 'the pause moved the chime')
  assert.equal(arcadeStep(moved, a.roundEndsAt + 1).stage, 'home', 'no chime at the old end')
  assert.equal(arcadeStep(moved, moved.roundEndsAt).stage, 'farewell', 'the chime at the new end')
  ;[a, t] = playGame(a, t, 'knock', knocker)
  assert.equal(a.stage, 'result')
  const rung = arcadeChime(a, t + 10)
  assert.equal(rung.stage, 'farewell', 'Next rings the chime in the middle of a free-play game')
  assert.deepEqual(rung.events, ['chime'])
  assert.deepEqual(rung.pending, [])
  const after = arcadeStep(rung, t + 10 + FAREWELL_MS)
  assert.equal(after.mode, 'free')
  assert.equal(after.stage, 'home')
})
