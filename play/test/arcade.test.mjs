import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'
import {
  ARCADE_NAME, COLS, ROWS, KEY_COUNT, DIALS, keyAt, rowOf, colOf, LEFT_DIALS, RIGHT_DIALS, MENU_KEYS, BACK_KEY,
  TOKENS, ROUND_MS, FREE_GAME_MS, GAME_MS, TRIO_GAME_MS, CLUE_KEEP_MS, CUT_MIN_MS, gameLengthMs,
  STAND_IN_CLUE, CLUE_NOTE, THIRD_LINE, FAREWELL_LINE, BOO_LINES,
  GAMES, KNOCK_OBJECTS, PETS, FACE_IDS, SOUND_NAMES, BOO_PICTURES, nextRand, hashOf,
  newGame, stepGame, inputGame, gameFaces, newArcade, arcadeStep, arcadeInput, arcadeChime, arcadeView, arcadeSample,
  TAIL_STEP_MS, TAIL_STEP_FASTER_MS, TAIL_FISH, TAIL_FISH_POINTS, TAIL_WIN_POINTS, TAIL_TIME_POINT_MS,
  POINTER_STEP_MS, POINTER_STEP_FASTER_MS, POINTER_POINT_MS, POINTER_LAST_POINTS,
  MICE_UP_MS, MICE_UP_END_MS, MICE_GOLD_UP_MS, MICE_TWO_FROM_MS, MICE_BONK_MS, MICE_GOLD_POINTS,
  MICE_PETS_FROM_MS, MICE_PET_ONE_IN, MICE_PETS_OUT, MICE_OOPS_MS, MICE_REST_MS, STRIKE_WORDS_MS,
  KNOCK_STEP_MS, KNOCK_STEP_FASTER_MS, KNOCK_STEP_MIN_MS, KNOCK_DWELL_STEPS, KNOCK_FALL_MS, KNOCK_CRASH_MS, KNOCK_SWIPE_MS, KNOCK_REST_MS, KNOCK_POINTS,
  YARN_FLASH_MS, YARN_FALLING, YARN_POINTS, YARN_GOLD_POINTS,
  READY_MS, COUNT_MS, RESULT_MS, CLUE_MIN_MS, CLUE_MAX_MS, WINNER_MS, WINNER_MIN_MS, FAREWELL_MS,
} from '../src/lib/arcade.js'

// Miss Boo LaRue's Arcade (28 Oct 2026): the pure engine (lib/arcade.js).
// G54 the menu and the five games, G55 the practice visit, G56 the words.
// Throwaway games made here; nothing read from a night, nothing printed.

const src = p => readFileSync(new URL(p, import.meta.url), 'utf8')
// Freeze a state all the way down: an engine that changed what it was handed would throw.
function frozen(x) {
  if (x && typeof x === 'object' && !Object.isFrozen(x)) { for (const v of Object.values(x)) frozen(v); Object.freeze(x) }
  return x
}
const key = index => ({ kind: 'key', index })
const turn = (dial, amount) => ({ kind: 'turn', dial, amount })
const press = (dial = 0) => ({ kind: 'press', dial })
const step = (g, t) => stepGame(frozen(g), t)
const input = (g, ev, t) => inputGame(frozen(g), ev, t)
const aStep = (a, t) => arcadeStep(frozen(a), t)
const aIn = (a, ev, t) => arcadeInput(frozen(a), ev, t)
const json = x => JSON.parse(JSON.stringify(x))
const without = (x, ...keys) => { const c = { ...x }; for (const k of keys) delete c[k]; return c }
const uniq = list => [...new Set(list)]
const ALL_KEYS = Array.from({ length: KEY_COUNT }, (_, i) => i)
const menuKey = id => MENU_KEYS[GAMES.findIndex(g => g.id === id)]
const rowFaces = (faces, r) => faces.slice(keyAt(r, 0), keyAt(r, 0) + COLS)
const listed = names => names.length === 1 ? names[0] : `${names.slice(0, -1).join(', ')} and ${names.at(-1)}`

// Random presses and turns through a whole game, at 50 ms ticks.
function randomGame(id, seed, lengthMs = 30000) {
  let g = newGame(id, { seed, lengthMs, now: 0 })
  let rs = seed
  const roll = () => { const r = nextRand(rs); rs = r.rs; return r.v }
  const faces = new Set(), sounds = new Set()
  for (let t = 0; t <= lengthMs + 1000; t += 50) {
    if (roll() < 0.35) {
      const r = roll()
      const sign = roll() < 0.5 ? -1 : 1
      const ev = r < 0.4 ? key(Math.floor(roll() * KEY_COUNT))
        : r < 0.8 ? turn(Math.floor(roll() * DIALS), sign * (1 + Math.floor(roll() * 4)))
          : r < 0.95 ? press(Math.floor(roll() * DIALS)) : { kind: 'strip', x: roll() * 1200 }
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

// Pick a game, start it, and let it run (pressing what `during` presses) until
// it is over: the arcade is then on the result.
function playGame(a, t, id, during) {
  a = aIn(a, key(menuKey(id)), t)
  assert.equal(a.stage, 'ready')
  a = aIn(a, press(2), t)
  assert.equal(a.stage, 'count')
  t += COUNT_MS
  a = aStep(a, t)
  assert.equal(a.stage, 'play')
  while (a.stage === 'play') {
    t += 250
    a = aStep(a, t)
    if (during && a.stage === 'play') a = during(a, t)
  }
  assert.equal(a.stage, 'result')
  return [a, t]
}
// Knock everything that reaches the edge.
const knocker = (a, t) => a.game.phase === 'edge' ? aIn(a, press(0), t) : a

// A whole visit to its free play: each turn picks the next game in `picks`.
// `look(a, t)` sees every moment on the way.
function runVisit(names, picks, { seed = 21, during, look = () => {}, roundMs = 3600000 } = {}) {
  let a = newArcade({ mode: 'visit', players: names, seed, now: 0, roundMs })
  let t = 0, n = 0
  look(a, t)
  for (let guard = 0; guard < 20000 && !(a.stage === 'home' && a.free); guard++) {
    if (a.stage === 'menu') {
      a = aIn(a, key(menuKey(picks[n++ % picks.length])), t); look(a, t)
      a = aIn(a, press(2), t); look(a, t)
    } else if (['clue', 'third', 'winner'].includes(a.stage)) {
      t += a.stage === 'winner' ? WINNER_MIN_MS : CLUE_MIN_MS
      a = aStep(a, t); look(a, t)
      a = aIn(a, key(13), t); look(a, t)
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

// A visit on the ten-minute round at a steady pace: `menuMs` to pick a game,
// `readyMs` on how to play, `clueMs` on a clue or Boo's line, and nobody
// touches a game. It notes when each player's clue (or a trio's third line)
// came, and for each game when it started, how long it ran, what the screen
// said its length was before it started, and its clock on the strip.
function pacedVisit(names, picks, { menuMs, readyMs, clueMs }) {
  let a = newArcade({ mode: 'visit', players: names, seed: 31, now: 0 })
  let n = 0
  const came = [], games = []
  // never past the chime, so the visit stops on the farewell
  const go = (t, ev) => ev ? aIn(a, ev, Math.min(t, a.roundEndsAt)) : aStep(a, Math.min(t, a.roundEndsAt))
  for (let guard = 0; guard < 100 && a.stage !== 'farewell' && !(a.stage === 'home' && a.free); guard++) {
    const at = a.stageAt
    switch (a.stage) {
      case 'menu': a = go(at + menuMs, key(menuKey(picks[n++ % picks.length]))); break
      case 'ready': {
        const t = at + readyMs
        const said = arcadeView(a, t).screen.timeLeftMs
        a = go(t, press(0))
        if (a.stage === 'count') games.push({ said, counting: arcadeView(a, t).screen.timeLeftMs })
        break
      }
      case 'count': a = go(at + COUNT_MS); break
      case 'play': {
        Object.assign(games.at(-1), { start: a.game.startedAt, length: a.game.endsAt - a.game.startedAt, clock: arcadeView(a, a.game.startedAt).strip.right })
        a = go(a.game.endsAt)
        break
      }
      case 'result': a = go(at + RESULT_MS); break
      case 'clue': case 'third': came[a.turn] = { stage: a.stage, at }; a = go(at + clueMs, press(0)); break
      case 'winner': a = go(at + WINNER_MIN_MS, press(0)); break
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

// Every word a view puts on the strip or the screen.
function shownWords(v) {
  const s = v.screen
  return [v.strip.left, v.strip.centre, v.strip.right, ...v.strip.dials, s.title, s.plain, s.boo, s.game?.name, s.game?.how, s.tally,
    s.clue, s.note, s.third, s.farewell, ...s.pending, ...(s.winner?.names ?? []), s.player, ...s.players.map(p => p.name)]
    .filter(x => typeof x === 'string' && x)
}

// ---- G54: the menu and the five games ----------------------------------------

test('G54 the menu: the five games on the second row with two blank keys each side, in order; nothing else on it does anything', () => {
  assert.deepEqual(MENU_KEYS, [11, 12, 13, 14, 15])
  assert.deepEqual(MENU_KEYS.map(rowOf), [1, 1, 1, 1, 1])
  assert.deepEqual(MENU_KEYS.map(colOf), [2, 3, 4, 5, 6])
  assert.deepEqual(GAMES.map(g => g.id), ['tail', 'pointer', 'mice', 'knock', 'yarn'])
  assert.deepEqual(GAMES.map(g => g.name), ['Boo Chasing Her Tail', 'The Lazy Pointer', 'Whack-a-Mouse', 'Knock It Off the Table', 'Yarn Catch'])
  assert.equal(KEY_COUNT, COLS * ROWS)
  assert.equal(BACK_KEY, keyAt(3, 0))
  assert.deepEqual([...LEFT_DIALS, ...RIGHT_DIALS], [0, 1, 2, 3, 4, 5])
  assert.equal(ARCADE_NAME, "Miss Boo LaRue's Arcade")
  for (const g of GAMES) assert.equal(g.dials.length, DIALS)

  const home = arcadeView(newArcade({ mode: 'free', seed: 1, now: 0 }), 0)
  assert.deepEqual(rowFaces(home.faces, 0), ['star', 'star', 'star', 'star', 'boo', 'star', 'star', 'star', 'star'])
  assert.deepEqual(rowFaces(home.faces, 1), ['blank', 'blank', 'menu:tail', 'menu:pointer', 'menu:mice', 'menu:knock', 'menu:yarn', 'blank', 'blank'])
  assert.deepEqual(rowFaces(home.faces, 2), Array(COLS).fill('blank'))
  assert.deepEqual(rowFaces(home.faces, 3), Array(COLS).fill('blank'))
  assert.deepEqual(home.strip, { left: 'Free play', centre: 'Press a game', right: '', bar: null, dials: ['', '', '', '', '', ''] })

  // a visit's menu: the player's two tokens on the third row
  const a = newArcade({ mode: 'visit', players: ['Jessa', 'Mari'], seed: 1, now: 0 })
  const v = arcadeView(a, 0)
  assert.equal(v.faces[keyAt(2, 3)], 'coin')
  assert.equal(v.faces[keyAt(2, 5)], 'coin')
  assert.equal(v.strip.left, "Jessa's turn")
  assert.equal(v.strip.right, 'Tokens: 2')
  // any other key or a dial does nothing, and makes no sound
  for (const ev of [key(0), key(10), key(16), key(BACK_KEY), turn(0, 1), press(3), { kind: 'strip', x: 600 }, { kind: 'up' }, null]) {
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

test('G54 every face a game shows is one the art knows, always 36 of them, and every sound is a known one', () => {
  assert.equal(new Set(FACE_IDS).size, FACE_IDS.length, 'no face listed twice')
  assert.equal(new Set(SOUND_NAMES).size, SOUND_NAMES.length)
  for (const o of KNOCK_OBJECTS) for (const f of ['table', 'edge', 'fall']) assert.ok(FACE_IDS.includes(`${f}:${o}`))
  for (const { id } of GAMES) {
    assert.ok(FACE_IDS.includes(`menu:${id}`))
    for (let seed = 1; seed <= 10; seed++) {
      const { g, faces, sounds } = randomGame(id, seed)
      for (const f of faces) assert.ok(FACE_IDS.includes(f), `${id} showed ${f}`)
      for (const s of sounds) assert.ok(SOUND_NAMES.includes(s), `${id} made ${s}`)
      assert.equal(g.over, true, 'every game ends')
      assert.ok(['win', 'lose', 'time'].includes(g.outcome))
    }
  }
})

test('G54 Boo Chasing Her Tail: she wraps round the edges, grows on a fish, ignores a turn back into her neck, wins at five fish and loses on a bite', () => {
  const g0 = newGame('tail', { seed: 7, lengthMs: 120000, now: 0 })
  assert.deepEqual(g0.body, [keyAt(1, 2), keyAt(1, 1), keyAt(1, 0)], 'her head, and her tail two long behind it')
  assert.equal(g0.dir, 'right')
  // every seed: the first fish is on a free key, not right in front of her and not under Back;
  // and when she eats one, the next is on a free key and not right in front of her either
  for (let seed = 1; seed <= 300; seed++) {
    const s0 = newGame('tail', { seed, lengthMs: 120000, now: 0 })
    assert.ok(Number.isInteger(s0.fish) && ![...s0.body, keyAt(1, 3), BACK_KEY].includes(s0.fish), `seed ${seed}: the first fish`)
    const ate = step({ ...s0, fish: keyAt(1, 3) }, TAIL_STEP_MS)
    assert.ok(ate.body[0] === keyAt(1, 3) && ate.body.length === 4, `seed ${seed}: she ate the planted fish`)
    assert.ok(Number.isInteger(ate.fish) && !ate.body.includes(ate.fish) && ate.fish !== keyAt(1, 4), `seed ${seed}: the next fish`)
  }
  const f0 = gameFaces(g0, 0)
  assert.equal(f0[keyAt(1, 2)], 'tail-head')
  assert.equal(f0[keyAt(1, 1)], 'tail-body')
  assert.equal(f0[keyAt(1, 0)], 'tail-tip')
  assert.equal(f0[g0.fish], 'fish')
  const away = { ...g0, fish: keyAt(3, 8) } // the fish out of her way

  // the edges wrap: right off the end of row 1 and back in on its left, up off the top and in at the bottom
  let g = step(away, 7 * TAIL_STEP_MS)
  assert.equal(g.body[0], keyAt(1, 0))
  g = input(g, turn(3, 1), 7 * TAIL_STEP_MS + 10) // a right dial clockwise: up
  g = step(g, 9 * TAIL_STEP_MS)
  assert.equal(g.body[0], keyAt(3, 0))
  assert.equal(g.body.length, 3)

  // a fish right ahead: one longer, ten points, the point sound, and a little quicker
  g = step({ ...g0, fish: keyAt(1, 3) }, TAIL_STEP_MS)
  assert.equal(g.body[0], keyAt(1, 3))
  assert.equal(g.body.length, 4)
  assert.equal(g.score, TAIL_FISH_POINTS)
  assert.deepEqual(g.events, ['point'])
  assert.equal(g.nextAt, 2 * TAIL_STEP_MS - TAIL_STEP_FASTER_MS)

  // straight back into her neck is ignored, the same way changes nothing, two turns wait their go, a third is dropped
  g = input(away, turn(0, -1), 10)
  assert.deepEqual(g.queue, [])
  g = input(g, turn(1, 2), 20)
  assert.deepEqual(g.queue, [])
  g = input(g, turn(4, 1), 30) // up
  g = input(g, turn(5, -1), 40) // down, straight back from up: ignored
  g = input(g, turn(2, -1), 50) // left, after up: kept
  g = input(g, turn(3, -1), 60) // a third: dropped
  assert.deepEqual(g.queue, ['up', 'left'])
  g = step(g, 2 * TAIL_STEP_MS)
  assert.equal(g.body[0], keyAt(0, 1), 'up, then left: the quick turn works')

  // a bite: up, left, then down into her own tail
  g = { ...away, body: [keyAt(1, 4), keyAt(1, 3), keyAt(1, 2), keyAt(1, 1), keyAt(1, 0)] }
  g = input(g, turn(3, 1), 10)
  g = input(g, turn(0, -1), 20)
  g = step(g, 2 * TAIL_STEP_MS)
  assert.equal(g.over, false)
  g = input(g, turn(3, -1), 2 * TAIL_STEP_MS + 10)
  g = step(g, 3 * TAIL_STEP_MS)
  assert.equal(g.over, true)
  assert.equal(g.outcome, 'lose')
  assert.equal(g.endedAt, 3 * TAIL_STEP_MS)
  assert.deepEqual(g.events, ['bite', 'lose'])
  assert.equal(g.body[0], keyAt(1, 3))
  assert.equal(gameFaces(g, g.endedAt)[keyAt(1, 3)], 'bite', 'the head key shows the bite')
  const later = step(g, 100000)
  assert.deepEqual(without(later, 'events'), without(g, 'events'), 'a finished game stands still')
  assert.deepEqual(later.events, [])

  // the fifth fish wins: twenty more, and a point for every whole five seconds left
  g = step({ ...g0, eaten: TAIL_FISH - 1, score: (TAIL_FISH - 1) * TAIL_FISH_POINTS, fish: keyAt(1, 3) }, TAIL_STEP_MS)
  assert.equal(g.outcome, 'win')
  assert.deepEqual(g.events, ['point', 'win'])
  assert.equal(g.score, TAIL_FISH * TAIL_FISH_POINTS + TAIL_WIN_POINTS + Math.floor((120000 - TAIL_STEP_MS) / TAIL_TIME_POINT_MS))
  assert.equal(g.fish, null)

  // left alone with no fish in her way, she runs to the end of her time
  g = step(away, 120000)
  assert.equal(g.outcome, 'time')
  assert.equal(g.endedAt, 120000)
  assert.equal(g.score, 0)
})

// Keep the dot away from Boo: before each beat, the best of the dial moves, three times over.
function flee(g, t) {
  const far = k => 10 * Math.max(Math.abs(rowOf(k) - rowOf(g.boo)), Math.abs(colOf(k) - colOf(g.boo))) + Math.abs(rowOf(k) - rowOf(g.boo)) + Math.abs(colOf(k) - colOf(g.boo))
  for (let round = 0; round < 3; round++) {
    let best = g
    for (const ev of [turn(0, 3), turn(0, -3), turn(3, 3), turn(3, -3), turn(0, 1), turn(0, -1), turn(3, 1), turn(3, -1)]) {
      const h = inputGame(g, ev, t)
      if (far(h.dot) > far(best.dot)) best = h
    }
    g = best
  }
  return g
}

test('G54 The Lazy Pointer: the dials move the dot, the edges stop it, it never lands on Boo, she catches a dot that sits still, and lasting to the end pays', () => {
  const g0 = newGame('pointer', { seed: 3, lengthMs: 120000, now: 0 })
  assert.equal(g0.dot, keyAt(1, 1))
  assert.equal(g0.boo, keyAt(2, 7))
  const f0 = gameFaces(g0, 0)
  assert.equal(f0[keyAt(1, 1)], 'dot')
  assert.equal(f0[keyAt(2, 7)], 'chaser')
  // a left dial: left and right by the turn's value, three keys a report at most
  let g = input(g0, turn(0, 1), 10)
  assert.equal(g.dot, keyAt(1, 2))
  g = input(g, turn(1, 7), 20)
  assert.equal(g.dot, keyAt(1, 5), 'a fast spin moves three keys, no more')
  // a right dial: clockwise up, anticlockwise down
  g = input(g, turn(4, 1), 30)
  assert.equal(g.dot, keyAt(0, 5))
  g = input(g, turn(5, -2), 40)
  assert.equal(g.dot, keyAt(2, 5))
  // the edges stop it
  g = input(g0, turn(0, -3), 10)
  assert.equal(g.dot, keyAt(1, 0))
  g = input(g, turn(3, 3), 20)
  assert.equal(g.dot, keyAt(0, 0))
  // it stops beside Boo, never on her
  g = input({ ...g0, dot: keyAt(2, 4) }, turn(0, 3), 10)
  assert.equal(g.dot, keyAt(2, 6))

  // left alone, she comes: one key a beat, diagonals allowed, sitting out every sixth beat
  g = g0
  const path = []
  for (let beat = 1; beat <= 7; beat++) { g = step(g, beat * POINTER_STEP_MS); path.push(g.boo) }
  assert.deepEqual(path, [keyAt(1, 6), keyAt(1, 5), keyAt(1, 4), keyAt(1, 3), keyAt(1, 2), keyAt(1, 2), keyAt(1, 1)])
  assert.equal(g.over, true)
  assert.equal(g.outcome, 'lose')
  assert.deepEqual(g.events, ['lose'])
  assert.equal(g.score, Math.floor(7 * POINTER_STEP_MS / POINTER_POINT_MS))
  assert.equal(gameFaces(g, g.endedAt)[keyAt(1, 1)], 'caught')

  // a point for every two whole seconds, and she quickens every fifteen
  const far = { ...g0, boo: keyAt(3, 8), dot: keyAt(0, 0) }
  assert.equal(step(far, 4999).score, 2)
  g = step({ ...far, nextAt: 15000 }, 15000)
  assert.equal(g.nextAt, 15000 + POINTER_STEP_MS - POINTER_STEP_FASTER_MS)
  // lasting to the end: twenty more, and the win sound
  g = step({ ...far, nextAt: 119900 }, 120000)
  assert.equal(g.outcome, 'time')
  assert.equal(g.score, 120000 / POINTER_POINT_MS + POINTER_LAST_POINTS)
  assert.deepEqual(g.events, ['win'])

  // and it can be done: a dot kept moving lasts the whole two minutes
  for (const seed of [1, 2]) {
    g = newGame('pointer', { seed, lengthMs: 120000, now: 0 })
    for (let t = 0; t <= 120000 && !g.over; t += 100) g = stepGame(flee(g, t), t)
    assert.equal(g.outcome, 'time')
    assert.equal(g.score, 120000 / POINTER_POINT_MS + POINTER_LAST_POINTS)
  }
})

test('G54 Whack-a-Mouse: points only for a mouse, gold is worth three, one at a time until thirty seconds in, then up to two', () => {
  const g0 = newGame('mice', { seed: 11, lengthMs: 120000, now: 0 })
  assert.deepEqual(gameFaces(g0, 0), Array(KEY_COUNT).fill('blank'))
  const g = step(g0, 0)
  assert.equal(g.mice.length, 1, 'the first mouse comes at once')
  const m = g.mice[0]
  // an empty key does nothing at all
  let h = input(g, key(ALL_KEYS.find(k => k !== m.key)), 100)
  assert.equal(h.score, 0)
  assert.deepEqual(h.events, [])
  assert.equal(h.mice.length, 1)
  // the mouse: a point (three for gold), and the bonk for a moment
  h = input(g, key(m.key), 100)
  assert.equal(h.score, m.gold ? MICE_GOLD_POINTS : 1)
  assert.deepEqual(h.events, [m.gold ? 'gold' : 'point'])
  assert.equal(h.mice.length, 0)
  assert.equal(gameFaces(h, 100)[m.key], 'bonk')
  assert.equal(gameFaces(h, 100 + MICE_BONK_MS)[m.key], 'blank')
  assert.deepEqual(input(h, key(m.key), 150).events, [], 'a bonked key is empty')
  // a gold mouse
  const gold = { ...g, mice: [{ key: 5, gold: true, downAt: 1000 }] }
  assert.equal(gameFaces(gold, 200)[5], 'mouse-gold')
  h = input(gold, key(5), 200)
  assert.equal(h.score, MICE_GOLD_POINTS)
  assert.deepEqual(h.events, ['gold'])
  assert.ok(MICE_GOLD_UP_MS < Math.min(MICE_UP_MS, MICE_UP_END_MS), 'a gold mouse hides sooner than a plain one, all game')

  // left alone they duck; never two before thirty seconds, two at once after; about one in ten is gold
  let most = 0, mostLate = 0, seen = 0, golds = 0
  for (const seed of [11, 12, 13]) {
    let s = newGame('mice', { seed, lengthMs: 120000, now: 0 })
    const met = new Set()
    for (let t = 0; t <= 120000; t += 50) {
      s = stepGame(s, t)
      if (t < MICE_TWO_FROM_MS) most = Math.max(most, s.mice.length)
      else mostLate = Math.max(mostLate, s.mice.length)
      for (const x of s.mice) {
        assert.ok(x.downAt > t, 'a mouse past its time has ducked')
        const id = `${x.key}@${x.downAt}`
        if (!met.has(id)) { met.add(id); seen += 1; if (x.gold) golds += 1 }
      }
    }
    assert.equal(s.outcome, 'time')
    assert.equal(s.score, 0)
  }
  assert.equal(most, 1)
  assert.equal(mostLate, 2)
  assert.ok(seen > 200 && golds / seen > 0.03 && golds / seen < 0.2, `${golds} gold of ${seen}`)
})

test('G54 Whack-a-Mouse\'s pets: from five seconds in, about one in four that pop up is a pet, all five in turn; a pet scores nothing and shows on red; the third tapped ends the game, points kept', () => {
  // Jon's rule (29 Oct 2026), and the how-to-play line that says it
  assert.equal(MICE_PETS_OUT, 3)
  assert.match(GAMES.find(g => g.id === 'mice').how, /Leave the pets alone: tap three and you're out\.$/)
  assert.deepEqual([...PETS].sort(), ['boo', 'granola', 'irwin', 'salem', 'zimmy'])

  // left alone: none in the first five seconds, then about one in four, up as long as a plain mouse;
  // never more up at once than the mice alone may be, never two on a key, and one left alone never counts
  let pets = 0, all = 0
  const met = new Set()
  for (const seed of [21, 22, 23, 24]) {
    let s = newGame('mice', { seed, lengthMs: 120000, now: 0 })
    const seen = new Set()
    for (let t = 0; t <= 120000; t += 50) {
      s = stepGame(s, t)
      const up = [...s.mice, ...s.pets]
      assert.ok(up.length <= (t < MICE_TWO_FROM_MS ? 1 : 2), `at most ${t < MICE_TWO_FROM_MS ? 'one' : 'two'} up at ${t}`)
      assert.equal(new Set(up.map(x => x.key)).size, up.length, 'one thing to a key')
      for (const x of up) {
        const pet = s.pets.includes(x)
        const id = `${pet ? 'pet' : 'mouse'}${x.key}@${x.downAt}`
        if (seen.has(id)) continue
        seen.add(id)
        all += 1
        if (!pet) continue
        pets += 1
        met.add(x.pet)
        assert.ok(t >= MICE_PETS_FROM_MS, `no pet before five seconds: ${t}`)
        assert.ok(x.downAt - t <= MICE_UP_MS && x.downAt - t > MICE_UP_END_MS - 50, 'up as long as a plain mouse')
      }
    }
    assert.equal(s.outcome, 'time')
    assert.equal(s.petTaps, 0, 'a pet left alone never counts')
  }
  assert.ok(Math.abs(pets / all - 1 / MICE_PET_ONE_IN) < 0.08, `${pets} pets of ${all}`)
  assert.deepEqual([...met].sort(), [...PETS].sort(), 'all five pets come')

  // a tap on a pet: nothing scored, a miss, the pet on red for a moment, and its key empty
  let g = newGame('mice', { seed: 21, lengthMs: 120000, now: 0 })
  let t = 0
  while (!g.pets.length) { t += 50; g = step(g, t) }
  const p = g.pets[0]
  const h = input(g, key(p.key), t)
  assert.equal(h.score, g.score, 'a pet scores nothing')
  assert.equal(h.petTaps, 1)
  assert.deepEqual(h.events, ['miss'])
  assert.equal(h.pets.length, 0)
  assert.equal(h.over, false)
  assert.deepEqual(json(h), h, 'still plain JSON')
  assert.equal(gameFaces(g, t)[p.key], `pet:${p.pet}`)
  assert.equal(gameFaces(h, t)[p.key], `oops:${p.pet}`)
  assert.equal(gameFaces(h, t + MICE_OOPS_MS)[p.key], 'blank')
  assert.deepEqual(input(h, key(p.key), t + 10).events, [], 'a tapped pet\'s key is empty')
  // nothing pops up on its key while it is red
  let r = h
  for (let u = t; u < t + MICE_OOPS_MS; u += 10) {
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
  assert.equal(gameFaces(third, t)[p.key], `oops:${p.pet}`, 'the last board shows the pet it ended on')
  assert.equal(step(third, t + 5000).over, true)
  assert.deepEqual(json(third), third)

  // on the strip and beside the points, in Whack-a-Mouse only: the pets tapped so far
  let a = aIn(aIn(newArcade({ mode: 'free', seed: 6, now: 0 }), key(menuKey('mice')), 0), press(0), 0)
  assert.equal(arcadeView(a, 0).screen.tally, null, 'not on the count')
  t = COUNT_MS
  a = aStep(a, t)
  assert.equal(a.stage, 'play')
  assert.equal(arcadeView(a, t).strip.left, 'Pets tapped: 0 of 3')
  assert.equal(arcadeView(a, t).screen.tally, 'Pets tapped: 0 of 3')
  for (let n = 1; a.stage === 'play'; t += 50) {
    a = aStep(a, t)
    if (a.stage !== 'play' || !a.game.pets.length) continue
    a = aIn(a, key(a.game.pets[0].key), t)
    if (n < MICE_PETS_OUT) {
      assert.equal(arcadeView(a, t).screen.tally, `Pets tapped: ${n} of 3`)
      assert.equal(arcadeView(a, t).strip.left, `Pets tapped: ${n} of 3`)
    }
    n += 1
  }
  assert.equal(a.stage, 'result')
  const out = arcadeView(a, t).screen
  assert.equal(out.plain, `You tapped three pets. ${a.game.score} ${a.game.score === 1 ? 'point' : 'points'}.`)
  assert.equal(out.boo, BOO_LINES.pets)
  assert.equal(out.picture, 'Boo 3.png')
  assert.equal(out.tally, null)
  // the other games keep their name on the strip and have no count
  let y = aStep(aIn(aIn(newArcade({ mode: 'free', seed: 6, now: 0 }), key(menuKey('yarn')), 0), press(0), 0), COUNT_MS)
  assert.equal(y.stage, 'play')
  assert.equal(arcadeView(y, COUNT_MS).strip.left, 'Yarn Catch')
  assert.equal(arcadeView(y, COUNT_MS).screen.tally, null)
})

test('G54 Whack-a-Mouse is fair: a key a mouse has just left rests a moment, and a tapped pet\'s key stays red and empty, so a late tap never meets a pet; a pet is up as long as a mouse', () => {
  // every key but K busy, so whatever comes up can only come up on K
  const K = keyAt(2, 4), T = 10000
  const g0 = newGame('mice', { seed: 21, lengthMs: 120000, now: 0 })
  const busy = ALL_KEYS.filter(k => k !== K).map(k => ({ key: k, until: 100000 }))
  const board = extra => ({ ...g0, at: T - 1000, mice: [], pets: [], bonks: busy, oops: [], rests: [], nextSpawnAt: 100000, ...extra })
  // what comes up when one is due at `t`
  const comesUp = (g, t) => { const s = step({ ...g, nextSpawnAt: t }, t); return [...s.mice, ...s.pets].map(x => x.key) }

  // a mouse that hides: its key rests, then is free again
  const hid = step(board({ mice: [{ key: K, gold: false, downAt: T }] }), T)
  assert.deepEqual(hid.mice, [])
  assert.deepEqual(comesUp(hid, T), [], 'nothing comes up where it hid, the same moment')
  assert.deepEqual(comesUp(hid, T + MICE_REST_MS - 1), [], 'nor while its key rests')
  assert.deepEqual(comesUp(hid, T + MICE_REST_MS), [K], 'then the key is free')
  // a mouse tapped: the same
  const hit = input(board({ mice: [{ key: K, gold: false, downAt: T + 1000 }] }), key(K), T)
  assert.deepEqual(hit.events, ['point'])
  assert.deepEqual(comesUp(hit, T + MICE_REST_MS - 1), [])
  assert.deepEqual(comesUp(hit, T + MICE_REST_MS), [K])
  // a pet tapped: its key is red, and empty, all the time it is red
  const oops = input(board({ pets: [{ key: K, pet: 'zimmy', downAt: T + 1000 }] }), key(K), T)
  for (let u = T; u < T + MICE_OOPS_MS; u += 25) assert.equal(gameFaces(oops, u)[K], 'oops:zimmy', `red at ${u}`)
  assert.equal(gameFaces(oops, T + MICE_OOPS_MS)[K], 'blank')
  assert.deepEqual(comesUp(oops, T + MICE_OOPS_MS - 1), [])
  assert.deepEqual(comesUp(oops, T + MICE_OOPS_MS), [K])
  // a key a pet has just left is free at once (a pet leaves no rest): what comes up there may be a mouse or another pet
  const petHid = step(board({ pets: [{ key: K, pet: 'salem', downAt: T }] }), T)
  assert.deepEqual(comesUp(petHid, T), [K])

  // a pet is up as long as a plain mouse would be, the moment it comes up
  const plainUp = t => MICE_UP_MS + (MICE_UP_END_MS - MICE_UP_MS) * t / 120000
  let s = newGame('mice', { seed: 22, lengthMs: 120000, now: 0 })
  const seen = new Set()
  for (let t = 0; t <= 120000; t += 10) {
    s = stepGame(s, t)
    for (const p of s.pets) {
      if (seen.has(`${p.key}@${p.downAt}`)) continue
      seen.add(`${p.key}@${p.downAt}`)
      const up = p.downAt - t // it came up in the last 10 ms
      assert.ok(up > plainUp(t) - 11 && up < plainUp(t) + 1, `a pet up ${up} ms at ${t}, a mouse ${plainUp(t)}`)
    }
  }
  assert.ok(seen.size > 20, `${seen.size} pets`)
})

test('G54 every strike says so on the touch strip (Jon, 29 Oct 2026): a pet tapped, a press too soon or too late, for a moment in place of the points; the rule before Whack-a-Mouse starts', () => {
  assert.ok(STRIKE_WORDS_MS >= 1000 && STRIKE_WORDS_MS <= 3000, 'long enough to read, and gone again')
  const pts = n => `${n} ${n === 1 ? 'point' : 'points'}`
  const strip = (a, t) => arcadeView(a, t).strip
  const started = id => aStep(aIn(aIn(newArcade({ mode: 'free', seed: 6, now: 0 }), key(menuKey(id)), 0), press(0), 0), COUNT_MS)

  // the rule on the ready strip and the count's, for the one game that counts strikes; then the clock
  for (const { id } of GAMES) {
    const rule = id === 'mice' ? "Three pets and you're out." : ''
    const ready = aIn(newArcade({ mode: 'free', seed: 6, now: 0 }), key(menuKey(id)), 0)
    assert.equal(strip(ready, 0).right, rule, `${id}: ready`)
    assert.equal(strip(aIn(ready, press(0), 0), 1500).right, rule, `${id}: the count`)
    assert.equal(strip(started(id), COUNT_MS).right, '2:00', `${id}: then the clock`)
  }
  const visit = aIn(newArcade({ mode: 'visit', players: ['Jessa'], seed: 6, now: 0 }), key(menuKey('mice')), 0)
  assert.equal(strip(visit, 0).right, "Three pets and you're out.", 'on a visit too')

  // Whack-a-Mouse: a pet tapped says its strike, then the points again
  let a = started('mice'), t = COUNT_MS
  const tapPet = () => {
    while (!a.game.pets.length) { t += 50; a = aStep(a, t) }
    a = aIn(a, key(a.game.pets[0].key), t)
  }
  tapPet()
  assert.equal(strip(a, t).centre, "Strike 1! That's a pet.")
  assert.equal(strip(a, t).left, 'Pets tapped: 1 of 3')
  assert.equal(strip(a, t + STRIKE_WORDS_MS - 1).centre, "Strike 1! That's a pet.")
  const later = aStep(a, t + STRIKE_WORDS_MS)
  assert.equal(strip(later, t + STRIKE_WORDS_MS).centre, pts(later.game.score), 'then the points again')
  // a mouse tapped while they show: they stay their whole time, then the points, that mouse's included
  const g = a.game
  const empty = ALL_KEYS.find(k => ![...g.mice, ...g.pets, ...g.oops, ...g.bonks, ...g.rests].some(x => x.key === k))
  const bonked = aIn({ ...a, game: { ...g, mice: [...g.mice, { key: empty, gold: false, downAt: t + 1000 }] } }, key(empty), t + 100)
  assert.equal(bonked.game.score, g.score + 1)
  assert.equal(strip(bonked, t + 100).centre, "Strike 1! That's a pet.")
  assert.equal(strip(bonked, t + STRIKE_WORDS_MS - 1).centre, "Strike 1! That's a pet.")
  assert.equal(strip(aStep(bonked, t + STRIKE_WORDS_MS), t + STRIKE_WORDS_MS).centre, pts(g.score + 1))
  tapPet()
  assert.equal(strip(a, t).centre, "Strike 2! That's a pet.")
  assert.equal(strip(a, t).left, 'Pets tapped: 2 of 3')
  // the third, while the second's words still show: the result, which says how it ended
  while (!a.game.pets.length) { t += 50; a = aStep(a, t) }
  assert.equal(strip(a, t).centre, "Strike 2! That's a pet.", 'the second strike still shows')
  tapPet()
  assert.equal(a.stage, 'result')
  assert.deepEqual(strip(a, t), { left: 'Whack-a-Mouse', centre: 'You tapped three pets.', right: pts(a.game.score), bar: null, dials: ['', '', '', '', '', ''] })

  // Knock It Off the Table: a press too soon or too late says so, and a knock is the points again
  let k = started('knock')
  t = COUNT_MS + 100
  k = aIn(k, press(3), t)
  assert.equal(strip(k, t).centre, 'Too soon!', 'on its way to the edge')
  assert.equal(strip(k, t + STRIKE_WORDS_MS - 1).centre, 'Too soon!')
  assert.equal(strip(aStep(k, t + STRIKE_WORDS_MS), t + STRIKE_WORDS_MS).centre, '0 points')
  // just before the edge, and on the edge while the paw still rests: too soon; once it has rested, knocked off
  let before = k
  while (k.game.phase !== 'edge') { before = k; t += 10; k = aStep(k, t) }
  const arrived = t
  let m = aIn(before, press(0), arrived - 10)
  assert.equal(strip(m, arrived - 10).centre, 'Too soon!')
  m = aIn(m, press(0), arrived + 10)
  assert.equal(m.game.phase, 'edge')
  assert.equal(strip(m, arrived + 10).centre, 'Too soon!', 'the paw is resting')
  assert.equal(strip(m, arrived - 10 + STRIKE_WORDS_MS).centre, 'Too soon!', 'its own words, not the press before')
  m = aIn(m, press(0), arrived + 10 + KNOCK_REST_MS)
  assert.equal(m.game.knocked, 1)
  assert.equal(strip(m, arrived + 10 + KNOCK_REST_MS).centre, pts(KNOCK_POINTS), 'knocked off: the points at once')
  // left on the edge until it goes back: too late
  while (k.game.phase === 'edge') { t += 10; k = aStep(k, t) }
  assert.equal(k.game.phase, 'left')
  k = aIn(k, press(0), t)
  assert.equal(strip(k, t).centre, 'Too late!')
  k = aIn(k, press(0), t + 100)
  assert.equal(k.game.phase, 'left')
  assert.equal(strip(k, t + 100).centre, 'Too late!', 'and while the paw rests on its way back')
  // the time runs out while a miss's words show: the result's strip says how it ended, not the miss
  let late = started('knock'), u = late.game.endsAt - 1400
  late = aStep(late, u)
  while (late.game.phase === 'edge') { u += 10; late = aStep(late, u) }
  late = aIn(late, press(0), u)
  assert.ok(['Too soon!', 'Too late!'].includes(strip(late, u).centre))
  const over = aStep(late, late.game.endsAt + 10)
  assert.equal(over.stage, 'result')
  assert.ok(over.game.endsAt + 10 < u + STRIKE_WORDS_MS, 'its words not yet gone')
  assert.equal(strip(over, over.game.endsAt + 10).centre, "Time's up.")
  // a press while the last one falls says nothing
  const falling = aIn(m, press(0), arrived + 20 + KNOCK_REST_MS)
  assert.equal(falling.game.phase, 'fall')
  assert.equal(strip(falling, arrived + 20 + KNOCK_REST_MS).centre, pts(KNOCK_POINTS))
})

test('G54 Knock It Off the Table: a press scores only on the edge, a miss rests the paw, and knocking all eight off wins', () => {
  const g0 = newGame('knock', { seed: 5, lengthMs: 120000, now: 0 })
  const f0 = gameFaces(g0, 0)
  assert.deepEqual(rowFaces(f0, 0), ['table:vase', 'table', 'table', 'table', 'table', 'table', 'table', 'table', 'edge'])
  assert.equal(f0[keyAt(1, 7)], 'boo')
  assert.deepEqual(f0.slice(COLS).filter(x => x !== 'below'), ['boo'])
  // it slides right one key a step, then sits on the edge for two steps
  assert.equal(step(g0, KNOCK_STEP_MS).pos, 1)
  const arrive = 8 * KNOCK_STEP_MS
  let g = step(g0, arrive - 1)
  assert.equal(g.pos, 7)
  g = step(g, arrive)
  assert.equal(g.phase, 'edge')
  assert.equal(gameFaces(g, arrive)[keyAt(0, 8)], 'edge:vase')
  const leave = arrive + KNOCK_DWELL_STEPS * KNOCK_STEP_MS
  assert.equal(step(g, leave - 1).phase, 'edge')
  let h = step(g, leave)
  assert.equal(h.pos, 7, 'then back it goes')
  assert.equal(step(h, leave + KNOCK_STEP_MS / 2).pos, 6, 'twice as fast')
  h = step(h, leave + 7 * KNOCK_STEP_MS / 2)
  assert.equal(h.pos, 0)
  assert.equal(step(h, leave + 7 * KNOCK_STEP_MS / 2 + KNOCK_STEP_MS).pos, 1, 'and comes again')

  // too soon: a miss, the swipe on the edge key, and the paw rests a moment
  let m = input(g0, press(2), 1000)
  assert.deepEqual(m.events, ['miss'])
  assert.equal(m.score, 0)
  assert.equal(gameFaces(m, 1000)[keyAt(0, 8)], 'swipe')
  assert.equal(gameFaces(m, 1000 + KNOCK_SWIPE_MS)[keyAt(0, 8)], 'edge')
  // a press while it rests misses again, heard and seen, and the rest starts again from it
  const resting = 1000 + KNOCK_REST_MS - 1
  m = input(m, press(0), resting)
  assert.deepEqual(m.events, ['miss'], 'the paw is resting: another miss')
  assert.equal(gameFaces(m, resting)[keyAt(0, 8)], 'swipe')
  assert.equal(m.restUntil, resting + KNOCK_REST_MS)
  // the rest is shorter than the shortest time on the edge (the cake's)
  const cakeStep = Math.max(KNOCK_STEP_MIN_MS, KNOCK_STEP_MS - KNOCK_STEP_FASTER_MS * (KNOCK_OBJECTS.length - 1))
  assert.ok(KNOCK_REST_MS < KNOCK_DWELL_STEPS * cakeStep)
  // a press a little early, then one on the edge once the paw has rested: knocked off
  let early = input(g0, press(0), arrive - 200)
  assert.deepEqual(early.events, ['miss'])
  early = input(early, press(0), arrive + 250)
  assert.deepEqual(early.events, ['knock'])
  assert.equal(early.score, KNOCK_POINTS)
  // pressing faster than the rest through a whole pass knocks nothing off: every press is a miss
  let spam = g0
  for (let t = 0; t <= leave + 7 * KNOCK_STEP_MS / 2; t += 150) {
    spam = input(spam, press(0), t)
    assert.deepEqual(spam.events, ['miss'], `a press at ${t}`)
  }
  assert.ok(spam.knocked === 0 && spam.score === 0)
  // a single press on the edge knocks it off, anywhere from its arrival to its last moment there
  for (const t of [arrive, leave - 1]) assert.deepEqual(input(g, press(0), t).events, ['knock'], `a press at ${t}`)

  // on the edge: knocked off for ten; it falls down the last column and crashes, then the next one comes
  const at = arrive + 100
  let k = input(g, press(4), at)
  assert.deepEqual(k.events, ['knock'])
  assert.equal(k.score, KNOCK_POINTS)
  assert.equal(gameFaces(k, at)[keyAt(1, 8)], 'fall:vase')
  assert.equal(gameFaces(k, at + KNOCK_FALL_MS)[keyAt(2, 8)], 'fall:vase')
  assert.equal(gameFaces(k, at + 2 * KNOCK_FALL_MS)[keyAt(3, 8)], 'crash')
  assert.equal(gameFaces(k, at + 2 * KNOCK_FALL_MS + KNOCK_CRASH_MS)[keyAt(3, 8)], 'below')
  assert.deepEqual(input(k, press(0), at + 50).events, [], 'a press while it falls does nothing')
  k = step(k, at + 2 * KNOCK_FALL_MS + KNOCK_CRASH_MS)
  assert.equal(gameFaces(k, k.at)[0], 'table:teacup')
  // the edge key and the strip are presses too; any other key is not
  assert.deepEqual(input(g, key(keyAt(0, 8)), arrive + 10).events, ['knock'])
  assert.deepEqual(input(g, { kind: 'strip', x: 1150 }, arrive + 10).events, ['knock'])
  assert.deepEqual(input(g, key(7), arrive + 10).events, [])
  assert.deepEqual(input(g, turn(0, 1), arrive + 10).events, [])

  // all eight off wins
  let w = g0
  for (let t = 0; t < 120000 && !w.over; t += 10) {
    w = stepGame(w, t)
    if (w.phase === 'edge') w = inputGame(w, press(0), t)
  }
  assert.equal(w.outcome, 'win')
  assert.deepEqual(w.events, ['knock', 'win'])
  assert.equal(w.knocked, KNOCK_OBJECTS.length)
  assert.equal(w.score, KNOCK_OBJECTS.length * KNOCK_POINTS)
  assert.equal(gameFaces(w, w.endedAt)[keyAt(1, 8)], 'fall:cake', 'the last one still falls on the finished board')
  assert.deepEqual(rowFaces(gameFaces(w, w.endedAt), 0), [...Array(8).fill('table'), 'edge'], 'the table is bare')
})

test('G54 Yarn Catch: any dial moves the basket, the edges stop it, and only a ball landing in its column is caught', () => {
  const g0 = newGame('yarn', { seed: 9, lengthMs: 120000, now: 0 })
  assert.equal(g0.basket, 4)
  assert.equal(gameFaces(g0, 0)[keyAt(3, 4)], 'basket')
  for (let d = 0; d < DIALS; d++) {
    assert.equal(input(g0, turn(d, 1), 10).basket, 5, `dial ${d} clockwise: right`)
    assert.equal(input(g0, turn(d, -1), 10).basket, 3, `dial ${d} anticlockwise: left`)
  }
  assert.equal(input(g0, turn(2, 9), 10).basket, 7, 'three keys a report at most')
  assert.equal(input(input(g0, turn(0, -3), 10), turn(0, -3), 20).basket, 0, 'the left edge stops it')
  assert.equal(input(input(g0, turn(5, 3), 10), turn(5, 3), 20).basket, 8, 'the right edge stops it')
  assert.deepEqual(input(g0, press(1), 10).basket, 4, 'a press does nothing')

  // a ball one row above the basket is caught when it lands
  const ball = col => ({ col, row: 2, gold: false, nextAt: 1000 })
  let c = step({ ...g0, balls: [ball(4)], nextSpawnAt: 5000 }, 1000)
  assert.equal(c.score, YARN_POINTS)
  assert.deepEqual(c.events, ['point'])
  assert.equal(c.balls.length, 0)
  assert.equal(gameFaces(c, 1000)[keyAt(3, 4)], 'basket-catch')
  assert.equal(gameFaces(c, 1000 + YARN_FLASH_MS)[keyAt(3, 4)], 'basket')
  c = step({ ...g0, balls: [{ ...ball(4), gold: true }], nextSpawnAt: 5000 }, 1000)
  assert.equal(c.score, YARN_GOLD_POINTS)
  assert.deepEqual(c.events, ['gold'])
  // anywhere else: gone, the miss shown there a moment, no sound, no points
  c = step({ ...g0, balls: [ball(6)], nextSpawnAt: 5000 }, 1000)
  assert.equal(c.score, 0)
  assert.deepEqual(c.events, [])
  assert.equal(c.balls.length, 0)
  assert.equal(gameFaces(c, 1000)[keyAt(3, 6)], 'yarn-miss')
  assert.equal(gameFaces(c, 1000 + YARN_FLASH_MS)[keyAt(3, 6)], 'blank')
  // a falling ball shows on the rows above; three falling and no more
  const three = { ...g0, balls: [0, 1, 2].map(col => ({ col, row: 0, gold: col === 1, nextAt: 9000 })), nextSpawnAt: 1000 }
  const f = gameFaces(three, 500)
  assert.deepEqual([f[0], f[1], f[2]], ['yarn', 'yarn-gold', 'yarn'])
  assert.equal(step(three, 1000).balls.length, YARN_FALLING, 'no fourth ball')
  let g = g0, most = 0
  for (let t = 0; t <= 120000; t += 50) {
    g = stepGame(g, t)
    most = Math.max(most, g.balls.length)
    for (const b of g.balls) assert.ok(b.row < ROWS - 1, 'a ball on the bottom row is caught or gone')
  }
  assert.ok(most >= 1 && most <= YARN_FALLING)
  assert.equal(g.outcome, 'time')
})

test('G54 every game is the same game for the same seed, and ends at its time', () => {
  for (const { id } of GAMES) {
    assert.deepEqual(randomGame(id, 42).g, randomGame(id, 42).g, `${id} replays exactly`)
    for (const length of [FREE_GAME_MS, gameLengthMs(3)]) {
      const g = step(newGame(id, { seed: 8, lengthMs: length, now: 1000 }), 1000 + length)
      assert.equal(g.over, true)
      assert.ok(g.endedAt <= 1000 + length)
      if (g.outcome === 'time') assert.equal(g.endedAt, 1000 + length)
      assert.equal(g.endsAt, 1000 + length)
    }
  }
  const fish = new Set(Array.from({ length: 20 }, (_, i) => newGame('tail', { seed: i + 1, now: 0 }).fish))
  assert.ok(fish.size > 3, 'another seed, another fish')
  assert.equal(gameLengthMs(1), 120000)
  assert.equal(gameLengthMs(2), 120000)
  assert.equal(gameLengthMs(3), 80000)
  assert.equal(gameLengthMs(['a', 'b', 'c']), 80000)
  assert.equal(newGame('mice', { now: 0 }).endsAt, FREE_GAME_MS)
  assert.throws(() => newGame('cushions', { now: 0 }))
  // the seeded generator and the hash are steady
  assert.deepEqual(nextRand(1), nextRand(1))
  assert.ok(nextRand(1).v >= 0 && nextRand(1).v < 1)
  assert.equal(hashOf('Boo'), hashOf('Boo'))
  assert.notEqual(hashOf('Boo'), hashOf('boo'))
})

test('G54 a page that sleeps: ten seconds at once plays out exactly as fifty-millisecond ticks would, and misses no bite, catch or knock', () => {
  const ticks = (g, to) => { for (let t = g.at + 50; t <= to; t += 50) g = stepGame(g, t); return g }
  for (const { id } of GAMES) {
    for (const seed of [1, 2, 3]) {
      const g = newGame(id, { seed, lengthMs: 120000, now: 0 })
      assert.deepEqual(without(step(g, 10000), 'events'), without(ticks(g, 10000), 'events'), `${id} seed ${seed}`)
    }
  }
  // the bite: turns made, then nobody steps for ten seconds
  let g = { ...newGame('tail', { seed: 1, lengthMs: 120000, now: 0 }), fish: keyAt(3, 8), body: [keyAt(1, 4), keyAt(1, 3), keyAt(1, 2), keyAt(1, 1), keyAt(1, 0)] }
  g = input(input(g, turn(3, 1), 10), turn(0, -1), 20)
  g = step(g, 2 * TAIL_STEP_MS)
  g = input(g, turn(3, -1), 2 * TAIL_STEP_MS + 10)
  const bitten = step(g, 2 * TAIL_STEP_MS + 10000)
  assert.equal(bitten.outcome, 'lose')
  assert.equal(bitten.endedAt, 3 * TAIL_STEP_MS, 'at the moment of the bite, not at the end of the sleep')
  assert.deepEqual(without(bitten, 'events'), without(ticks(g, 2 * TAIL_STEP_MS + 10000), 'events'))
  // the catch: Boo reaches a dot nobody moves
  const caught = step(newGame('pointer', { seed: 1, lengthMs: 120000, now: 0 }), 10000)
  assert.equal(caught.outcome, 'lose')
  assert.equal(caught.endedAt, 7 * POINTER_STEP_MS)
  assert.deepEqual(caught.events, ['lose'])
  // the yarn: the basket under the first ball's column catches it in the sleep
  const y0 = newGame('yarn', { seed: 4, lengthMs: 120000, now: 0 })
  const first = step(y0, 0).balls[0]
  const y = step({ ...y0, basket: first.col }, 10000)
  assert.ok(y.score >= 1, 'the first ball was caught')
  assert.deepEqual(without(y, 'events'), without(ticks({ ...y0, basket: first.col }, 10000), 'events'))
  // the knock: a press after the sleep lands on the board as it is now
  const kn = newGame('knock', { seed: 1, lengthMs: 120000, now: 0 })
  const late = input(kn, press(0), 8 * KNOCK_STEP_MS + 10) // first catch up to the edge, then knock
  assert.deepEqual(late.events, ['knock'])
})

test('G54 pure: nothing handed in is ever changed, and every state is plain JSON', () => {
  // every helper above freezes what it hands the engine: a change would have thrown
  for (const { id } of GAMES) {
    const { g } = randomGame(id, 5)
    assert.deepEqual(json(g), g, `${id} is plain JSON`)
  }
  const states = []
  runVisit(['Margaret', 'Tom', 'Ellie'], ['tail', 'pointer', 'mice', 'knock', 'yarn'], { look: a => states.push(a) })
  for (const a of states) assert.deepEqual(json(a), a)
})

// ---- G55: the practice visit --------------------------------------------------

test('G55 a visit of two: turns go round, two tokens each spent as each count starts, a clue after each second game, then the winner, then free play', () => {
  let a = newArcade({ mode: 'visit', players: ['Jessa', 'Mari'], seed: 4, now: 0, roundMs: 3600000 })
  assert.equal(a.stage, 'menu')
  assert.equal(a.turn, 0)
  assert.equal(a.free, false)
  assert.deepEqual(a.players.map(p => [p.name, p.tokens, p.games.length]), [['Jessa', 2, 0], ['Mari', 2, 0]])
  let t = 0
  // Jessa knocks things off for points
  ;[a, t] = playGame(a, t, 'knock', knocker)
  assert.equal(a.players[0].tokens, 1)
  assert.equal(a.players[0].games.length, 1)
  assert.ok(a.players[0].games[0].score > 0)
  assert.equal(a.players[0].games[0].game, 'knock')
  let v = arcadeView(a, t)
  assert.equal(v.screen.result.score, a.players[0].games[0].score)
  assert.equal(v.screen.player, 'Jessa')
  assert.deepEqual(aIn(a, key(13), t).stage, 'result', 'the result takes no presses')
  t = a.stageAt + RESULT_MS
  a = aStep(a, t)
  assert.equal(a.stage, 'menu')
  assert.equal(a.turn, 1, "Mari's turn")
  // Mari, then Jessa again
  ;[a, t] = playGame(a, t, 'knock')
  a = aStep(a, (t = a.stageAt + RESULT_MS))
  assert.equal(a.turn, 0)
  ;[a, t] = playGame(a, t, 'mice')
  assert.equal(a.players[0].tokens, 0)
  a = aStep(a, (t = a.stageAt + RESULT_MS))
  assert.equal(a.stage, 'clue')
  assert.deepEqual(a.events, ['clue'])
  v = arcadeView(a, t)
  assert.equal(v.screen.player, 'Jessa')
  assert.equal(v.screen.clue, STAND_IN_CLUE)
  assert.equal(v.screen.note, CLUE_NOTE)
  assert.equal(v.screen.third, null)
  assert.equal(v.screen.plain, 'Jessa, this is your clue. Read it, then press any key.')
  assert.equal(v.faces[keyAt(1, 4)], 'ok')
  assert.equal(v.faces.filter(f => f !== 'off').length, 1)
  assert.equal(a.players[0].reached, true)
  // a press counts only after three seconds
  assert.equal(aIn(a, key(5), t + CLUE_MIN_MS - 1).stage, 'clue')
  a = aIn(a, press(3), t + CLUE_MIN_MS)
  t += CLUE_MIN_MS
  assert.equal(a.stage, 'menu')
  assert.equal(a.turn, 1)
  // Mari's second game, her clue, and then the winner
  ;[a, t] = playGame(a, t, 'knock')
  a = aStep(a, (t = a.stageAt + RESULT_MS))
  assert.equal(a.stage, 'clue')
  assert.equal(arcadeView(a, t).screen.player, 'Mari')
  a = aIn(a, { kind: 'strip', x: 40 }, (t += CLUE_MIN_MS))
  assert.equal(a.stage, 'winner')
  assert.ok(a.events.includes('win'))
  v = arcadeView(a, t)
  const jessa = a.players[0].games.reduce((s, x) => s + x.score, 0)
  assert.deepEqual(v.screen.winner, { names: ['Jessa'], total: jessa })
  assert.equal(v.screen.plain, `Most points: Jessa, ${jessa}.`)
  assert.equal(v.screen.boo, BOO_LINES.winner)
  assert.equal(v.strip.centre, 'Most points: Jessa')
  assert.deepEqual(v.screen.players.map(p => [p.name, p.tokens, p.scores.length]), [['Jessa', 0, 2], ['Mari', 0, 2]])
  assert.equal(aIn(a, key(0), t + WINNER_MIN_MS - 1).stage, 'winner')
  a = aIn(a, key(0), (t += WINNER_MIN_MS))
  assert.equal(a.stage, 'home')
  assert.equal(a.free, true)
  assert.equal(a.mode, 'visit')
  v = arcadeView(a, t)
  assert.equal(v.screen.plain, 'Free play until the chime. Nothing counts now.')
  assert.equal(v.screen.boo, BOO_LINES.freePlay)
  assert.ok(v.screen.clockMs > 0)
  // the winner moves on by itself too
  const w = runVisit(['Jessa', 'Mari'], ['mice'], { look: () => {} })[0]
  assert.equal(w.free, true)
})

test('G55 a trio: the games are shorter, and the third player gets Boo\'s line instead of a clue', () => {
  const seen = []
  const [a] = runVisit(['Margaret', 'Tom', 'Ellie'], ['knock', 'mice', 'yarn'], { look: (x, t) => seen.push([x, t]) })
  const turns = seen.filter(([x]) => x.stage === 'count' && x.events.includes('tick') && x.beats === 1).map(([x]) => x.turn)
  assert.deepEqual(turns, [0, 1, 2, 0, 1, 2], 'round the group, two each')
  const games = seen.filter(([x]) => x.stage === 'play').map(([x]) => x.game.endsAt - x.game.startedAt)
  assert.ok(games.every(ms => ms === gameLengthMs(3)), 'eighty seconds a game for a trio')
  const clues = seen.filter(([x]) => x.stage === 'clue').map(([x]) => x.turn)
  assert.deepEqual(uniq(clues), [0, 1])
  const third = seen.find(([x]) => x.stage === 'third')
  assert.ok(third)
  assert.equal(third[0].turn, 2)
  assert.ok(!third[0].events.includes('clue'))
  const v = arcadeView(third[0], third[1])
  assert.equal(v.screen.third, THIRD_LINE)
  assert.equal(v.screen.boo, THIRD_LINE)
  assert.equal(v.screen.clue, null)
  assert.equal(v.screen.picture, 'Boo 3.png')
  assert.equal(v.screen.plain, 'Ellie, Boo has no clue for you. Press any key.')
  assert.equal(v.strip.centre, 'Ellie')
  assert.equal(v.faces[keyAt(1, 4)], 'ok')
  assert.ok(seen.some(([x]) => x.stage === 'winner'))
  assert.deepEqual(a.players.map(p => p.games.length), [2, 2, 2])
  assert.ok(a.players.every(p => p.reached && p.tokens === 0))
})

test('G55 the winner names everyone who tied', () => {
  const seen = []
  runVisit(['Jessa', 'Mari'], ['knock'], { look: (x, t) => seen.push([x, t]) }) // nobody presses: nought each
  const [a, t] = seen.find(([x]) => x.stage === 'winner')
  const v = arcadeView(a, t)
  assert.deepEqual(v.screen.winner, { names: ['Jessa', 'Mari'], total: 0 })
  assert.equal(v.screen.plain, 'A tie: Jessa and Mari, 0 each.')
  assert.equal(v.screen.boo, BOO_LINES.tie)
  assert.equal(v.strip.centre, 'Most points: Jessa and Mari')
  assert.equal(v.screen.picture, ' Boo 5.png')
  assert.deepEqual(rowFaces(v.faces, 0), Array(COLS).fill('star'))
  assert.equal(v.faces[keyAt(1, 4)], 'boo')
  // three ways
  const trio = { ...a, players: ['Margaret', 'Tom', 'Ellie'].map(name => ({ name, tokens: 0, reached: true, games: [{ game: 'mice', score: 7 }, { game: 'yarn', score: 3 }] })) }
  assert.equal(arcadeView(trio, t).screen.plain, 'A tie: Margaret, Tom and Ellie, 10 each.')
})

test('G55 a visit of one: two games, the clue, no winner, then free play', () => {
  const seen = []
  const [a] = runVisit(['Jessa'], ['yarn', 'tail'], { look: (x, t) => seen.push([x, t]) })
  assert.deepEqual(a.players.map(p => p.games.map(x => x.game)), [['yarn', 'tail']])
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
})

test('G55 ready: Back spends nothing, any other key or a dial starts the count, and it starts by itself after fifteen seconds', () => {
  const a = aIn(newArcade({ mode: 'visit', players: ['Jessa', 'Mari'], seed: 6, now: 0 }), key(menuKey('tail')), 100)
  const v = arcadeView(a, 100)
  assert.equal(v.faces[BACK_KEY], 'back')
  assert.equal(v.faces.filter(f => f === 'tail-head').length, 1, 'the deck shows the starting board')
  assert.equal(v.screen.game.name, 'Boo Chasing Her Tail')
  assert.equal(v.screen.game.how, GAMES[0].how)
  assert.equal(v.strip.left, 'Boo Chasing Her Tail')
  assert.equal(v.strip.centre, 'Press any key to start')
  assert.deepEqual(v.strip.dials, GAMES[0].dials)
  // Back: the menu again, the token kept
  const back = aIn(a, key(BACK_KEY), 200)
  assert.equal(back.stage, 'menu')
  assert.deepEqual(back.events, ['back'])
  assert.equal(back.players[0].tokens, TOKENS)
  const freeBack = aIn(aIn(newArcade({ mode: 'free', seed: 6, now: 0 }), key(menuKey('mice')), 0), key(BACK_KEY), 10)
  assert.equal(freeBack.stage, 'home')
  // anything else starts the count
  for (const ev of [key(0), key(35), press(5), turn(2, -1), { kind: 'strip', x: 10 }]) {
    const c = aIn(a, ev, 200)
    assert.equal(c.stage, 'count')
    assert.deepEqual(c.events, ['tick'])
    assert.equal(c.players[0].tokens, TOKENS - 1, 'the token is spent as the count starts')
  }
  // by itself
  assert.equal(aStep(a, 100 + READY_MS - 1).stage, 'ready')
  const own = aStep(a, 100 + READY_MS)
  assert.equal(own.stage, 'count')
  assert.equal(own.stageAt, 100 + READY_MS)
  // the game that starts is the board the deck showed
  const played = aStep(own, 100 + READY_MS + COUNT_MS)
  assert.deepEqual(played.game.body, a.game.body)
  assert.equal(played.game.fish, a.game.fish)
})

test('G55 the count: three, two, one a second apart with a tick each, then go and the game', () => {
  let a = aIn(aIn(newArcade({ mode: 'free', seed: 6, now: 0 }), key(menuKey('mice')), 0), press(0), 1000)
  const at = t => arcadeView(a, t)
  assert.equal(at(1000).faces[keyAt(1, 4)], 'num:3')
  assert.equal(at(1000).strip.centre, '3')
  assert.equal(at(1000).screen.count, 3)
  assert.deepEqual(at(1000).faces.filter(f => f !== 'off'), ['num:3'])
  const heard = []
  for (let t = 1050; t <= 4000; t += 50) {
    a = aStep(a, t)
    heard.push(...a.events.map(e => `${t}:${e}`))
    if (t === 2000) assert.equal(at(t).faces[keyAt(1, 4)], 'num:2')
    if (t === 3000) assert.equal(at(t).faces[keyAt(1, 4)], 'num:1')
  }
  assert.deepEqual(heard.slice(0, 3), ['2000:tick', '3000:tick', '4000:go'])
  assert.equal(a.stage, 'play')
  assert.equal(a.game.startedAt, 1000 + COUNT_MS)
  assert.ok(a.game.mice.length === 1, 'the first mouse is up as it starts')
  assert.equal(arcadeView(aIn(a, key(0), 1500), 1500).screen.stage, 'play', 'inputs in play go to the game')
})

test('G55 a clue stays at least three seconds and moves on by itself after a minute', () => {
  const a = arcadeSample('clue', 0)
  const fresh = { ...a, stageAt: 0 }
  assert.equal(aIn(fresh, key(0), CLUE_MIN_MS - 1).stage, 'clue')
  assert.equal(aIn(fresh, turn(0, 1), CLUE_MIN_MS + 10).stage, 'clue', 'a turn is not a press')
  assert.equal(aIn(fresh, key(0), CLUE_MIN_MS).stage, 'menu')
  assert.equal(aStep(fresh, CLUE_MAX_MS - 1).stage, 'clue')
  const moved = aStep(fresh, CLUE_MAX_MS)
  assert.equal(moved.stage, 'menu')
  assert.equal(moved.turn, 1, "then Mari's turn")
  assert.equal(aStep({ ...arcadeSample('winner', 0), stageAt: 0 }, WINNER_MS).stage, 'home')
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

test('G55 a visit\'s game that would run into the chime is cut short so its clue comes first: two minutes while it fits, never under thirty seconds, free play never cut', () => {
  // the rule: the full length while it fits before its points and the clue's fifteen seconds, a second less for every second later
  const lengthFrom = (a, start) => {
    const g = aStep(aIn(aIn(a, key(menuKey('mice')), start - COUNT_MS), press(0), start - COUNT_MS), start).game
    return g.endsAt - g.startedAt
  }
  const two = newArcade({ mode: 'visit', players: ['Ann', 'Bob'], seed: 3, now: 0 })
  const latest = ROUND_MS - GAME_MS - RESULT_MS - CLUE_KEEP_MS // the last start that still gets two minutes
  assert.equal(lengthFrom(two, COUNT_MS), GAME_MS, 'plenty of time: the full two minutes')
  assert.equal(lengthFrom(two, latest), GAME_MS)
  assert.equal(lengthFrom(two, latest + 1000), GAME_MS - 1000)
  const three = newArcade({ mode: 'visit', players: ['Ann', 'Bob', 'Cat'], seed: 3, now: 0 })
  assert.equal(lengthFrom(three, ROUND_MS - TRIO_GAME_MS - RESULT_MS - CLUE_KEEP_MS), TRIO_GAME_MS)
  assert.equal(lengthFrom(three, ROUND_MS - 60000), 60000 - RESULT_MS - CLUE_KEEP_MS)
  // never under thirty seconds, even when that runs into the chime
  assert.equal(lengthFrom(two, ROUND_MS - 40000), CUT_MIN_MS)
  assert.equal(lengthFrom(two, ROUND_MS - 10000), CUT_MIN_MS)
  // free play is never cut: plain free play, and a visit's free play after its last game
  assert.equal(lengthFrom(newArcade({ mode: 'free', seed: 3, now: 0 }), ROUND_MS - 10000), FREE_GAME_MS)
  assert.equal(lengthFrom({ ...two, free: true, stage: 'home' }, ROUND_MS - 20000), FREE_GAME_MS)

  // a pair at an ordinary pace, all four games ones that run their full time (Whack-a-Mouse and Yarn Catch):
  // three games of two minutes, the last cut short, and the second player's clue before the chime
  const pair = pacedVisit(['Ann', 'Bob'], ['mice', 'mice', 'yarn', 'yarn'], ORDINARY)
  assert.deepEqual(pair.came.map(c => c.stage), ['clue', 'clue'])
  assert.deepEqual(pair.games.slice(0, 3).map(g => g.length), [GAME_MS, GAME_MS, GAME_MS])
  const last = pair.games[3]
  assert.ok(last.start + GAME_MS > ROUND_MS, 'at two minutes the last game would run into the chime')
  assert.equal(last.length, ROUND_MS - last.start - RESULT_MS - CLUE_KEEP_MS)
  assert.equal(last.clock, '0:59', 'it starts at 8:41, so its clock starts at 0:59')
  assert.equal(pair.came[1].at, ROUND_MS - CLUE_KEEP_MS, "Bob's clue comes fifteen seconds before the chime")
  assert.equal(pair.a.stage, 'farewell')
  assert.deepEqual(pair.a.pending, [], 'the chime caught nobody short')
  // before each game started, the screen said the length it really got
  for (const g of pair.games) assert.deepEqual([g.said, g.counting], [g.length, g.length])

  // a trio at the same pace: both clues before the chime (the second player's last game cut short)
  const trio = pacedVisit(['Ann', 'Bob', 'Cat'], ['mice', 'mice', 'mice', 'yarn', 'yarn', 'yarn'], ORDINARY)
  assert.deepEqual(trio.came.slice(0, 2).map(c => c.stage), ['clue', 'clue'])
  assert.ok(trio.came.slice(0, 2).every(c => c.at <= ROUND_MS - CLUE_KEEP_MS), 'each with time to read it')
  assert.deepEqual(trio.games.slice(0, 4).map(g => g.length), Array(4).fill(TRIO_GAME_MS))
  assert.ok(trio.games[4].length < TRIO_GAME_MS)
  for (const g of trio.games) assert.deepEqual([g.said, g.counting], [g.length, g.length])

  // a slow pair: the last game still gets its thirty seconds, and runs into the chime
  const slow = pacedVisit(['Ann', 'Bob'], ['mice', 'mice', 'yarn', 'yarn'], SLOW)
  assert.equal(slow.games[3].length, CUT_MIN_MS)
  assert.ok(slow.games[3].start + CUT_MIN_MS > ROUND_MS)
  assert.equal(slow.a.stage, 'farewell')
})

test('G55 the chime names who it caught short: a clue owed to the first two, Boo\'s line to a trio\'s third player, told apart by place', () => {
  // a trio at an ordinary pace: the chime comes while the second player reads their clue
  const trio = pacedVisit(['Margaret', 'Tom', 'Ellie'], ['mice', 'mice', 'mice', 'yarn', 'yarn', 'yarn'], ORDINARY)
  let v = arcadeView(trio.a, trio.a.stageAt).screen
  assert.equal(v.stage, 'farewell')
  assert.deepEqual(v.pending, ['Ellie'])
  assert.equal(v.plain, "Out of time before Boo's line: Ellie.")
  // a slow pair: the chime comes in the second player's last game
  const pair = pacedVisit(['Jessa', 'Mari'], ['mice', 'mice', 'yarn', 'yarn'], SLOW)
  v = arcadeView(pair.a, pair.a.stageAt).screen
  assert.equal(v.stage, 'farewell')
  assert.deepEqual(v.pending, ['Mari'])
  assert.equal(v.plain, 'Out of time before their clue: Mari.')
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
  a = aIn(a, press(0), t); keep(a, t)
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
    assert.equal(v.faces[keyAt(1, 4)], 'boo')
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

test('G55 a page that sleeps through stages catches up exactly: ten seconds at once is fifty-millisecond ticks', () => {
  let a = newArcade({ mode: 'visit', players: ['Jessa', 'Mari'], seed: 9, now: 0 })
  a = aIn(a, key(menuKey('pointer')), 0)
  a = aIn(a, press(0), 0)
  // from the count's start: two more ticks, go, and seven seconds of play in which Boo catches the dot
  const jumped = aStep(a, 10000)
  let ticked = a
  const heard = []
  for (let t = 50; t <= 10000; t += 50) { ticked = arcadeStep(ticked, t); heard.push(...ticked.events) }
  assert.deepEqual(without(jumped, 'events'), without(ticked, 'events'))
  assert.deepEqual(jumped.events, uniq(heard))
  assert.deepEqual(jumped.events, ['tick', 'go', 'lose'])
  assert.equal(jumped.stage, 'result')
  assert.deepEqual(jumped.players[0].games, [{ game: 'pointer', score: 3 }])
  // and on through the result to Mari's turn, either way
  const on = aStep(jumped, 25000)
  let on2 = ticked
  for (let t = 10050; t <= 25000; t += 50) on2 = arcadeStep(on2, t)
  assert.deepEqual(without(on, 'events'), without(on2, 'events'))
  assert.equal(on.stage, 'menu')
  assert.equal(on.turn, 1)
  // each game, ten seconds into play
  for (const { id } of GAMES) {
    let b = aIn(aIn(newArcade({ mode: 'free', seed: 12, now: 0 }), key(menuKey(id)), 0), press(0), 0)
    b = aStep(b, COUNT_MS)
    let tb = b
    for (let t = COUNT_MS + 50; t <= COUNT_MS + 10000; t += 50) tb = arcadeStep(tb, t)
    assert.deepEqual(without(aStep(b, COUNT_MS + 10000), 'events'), without(tb, 'events'), id)
  }
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
  assert.equal(v.strip.left, "Mari's turn")
  assert.equal(v.faces[keyAt(2, 3)], 'coin-spent')
  assert.equal(v.faces[keyAt(2, 5)], 'coin')
  assert.deepEqual(v.screen.players.map(p => [p.name, p.tokens, p.now]), [['Jessa', 0, false], ['Mari', 1, true]])
  v = view('play')
  assert.equal(v.screen.stage, 'play')
  assert.equal(v.screen.game.id, 'tail')
  assert.equal(v.faces.filter(f => f === 'tail-head').length, 1)
  assert.equal(v.faces.filter(f => f === 'tail-body' || f === 'tail-tip').length, 4, 'a tail of four')
  assert.equal(v.faces.filter(f => f === 'fish').length, 1)
  assert.equal(v.screen.score, 2 * TAIL_FISH_POINTS, 'two fish eaten')
  assert.ok(v.screen.timeLeftMs >= 55000 && v.screen.timeLeftMs <= 65000, 'about a minute left')
  assert.equal(v.strip.right, '0:59')
  v = view('clue')
  assert.equal(v.screen.stage, 'clue')
  assert.equal(v.screen.player, 'Jessa')
  assert.equal(v.screen.clue, STAND_IN_CLUE)
  assert.equal(v.screen.players.length, 2)
  v = view('third')
  assert.equal(v.screen.stage, 'third')
  assert.equal(v.screen.player, 'Ellie')
  assert.equal(v.screen.players.length, 3)
  assert.equal(v.screen.third, THIRD_LINE)
  v = view('winner')
  assert.deepEqual(v.screen.winner, { names: ['Mari'], total: 85 })
  v = view('farewell')
  assert.equal(v.screen.stage, 'farewell')
  assert.equal(v.screen.farewell, FAREWELL_LINE)
  assert.deepEqual(v.screen.pending, [])
  assert.equal(v.screen.plain, '')
  assert.equal(v.screen.clockMs, 0)
  assert.equal(arcadeSample('anything else', now).stage, 'home')
  for (const name of ['home', 'menu', 'play', 'clue', 'third', 'winner', 'farewell']) {
    const a = arcadeSample(name, now)
    assert.deepEqual(json(a), a, `${name} is plain JSON`)
    assert.deepEqual(arcadeSample(name, now), a, `${name} is the same each time`)
    for (const f of arcadeView(a, now).faces) assert.ok(FACE_IDS.includes(f))
    aStep(a, now + 1000) // and runs on like any other moment
  }
})

// ---- G56: the words ------------------------------------------------------------

test('G56 the practice clue is the house\'s rehearsal stand-in, word for word (functions/lib/bagclues.js)', () => {
  const bag = src('../../functions/lib/bagclues.js')
  const short = /export const CAT_SHORT = (\{[^}]*\})/.exec(bag)
  const fn = /export function bagStandIn\(cat, act = 2\) \{\s*return (`[^`]*`)/.exec(bag)
  assert.ok(short && fn, 'bagStandIn and CAT_SHORT are where they were')
  const bagStandIn = new Function('CAT_SHORT', 'cat', 'act', `return ${fn[1]}`)
  assert.equal(STAND_IN_CLUE, bagStandIn(new Function(`return ${short[1]}`)(), 'boo', 4))
  assert.equal(STAND_IN_CLUE, "[Boo's bag clue about the Ghost appears here]")
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

test('G56 every word the arcade can show passes F09, and Boo\'s lines carry no number, no rule, no case word and no echo', () => {
  const phone = src('./phone.test.mjs')
  const m = /^const WAITING = (\/.+\/[a-z]*)$/m.exec(phone)
  assert.ok(m, 'F09\'s check is where it was')
  const WAITING = new Function(`return ${m[1]}`)()
  assert.ok(WAITING.test('Waiting for the other players...'), 'the check bites')

  // every moment: samples, whole visits of one, two and three, free play, every way a game ends, the chime with names left out
  const views = []
  const look = (a, t) => views.push(arcadeView(a, t))
  for (const name of ['home', 'menu', 'play', 'clue', 'third', 'winner', 'farewell']) look(arcadeSample(name, 1000), 1000)
  runVisit(['Jessa'], ['yarn', 'pointer'], { look })
  runVisit(['Jessa', 'Mari'], ['knock', 'tail'], { look, during: knocker })
  runVisit(['Margaret', 'Tom', 'Ellie'], ['mice', 'knock', 'tail', 'pointer', 'yarn'], { look })
  // every strike's words: pets tapped in Whack-a-Mouse, presses too soon and too late in Knock It Off the Table
  const striker = (a, t) => a.game.id === 'mice' ? (a.game.pets.length ? aIn(a, key(a.game.pets[0].key), t) : a)
    : a.game.id === 'knock' && a.game.phase !== 'edge' ? aIn(a, press(0), t) : a
  runVisit(['Jessa', 'Mari'], ['mice', 'knock'], { look, during: striker })
  for (const { id } of GAMES) {
    let f = newArcade({ mode: 'free', seed: 5, now: 0 })
    look(f, 0)
    let t
    ;[f, t] = playGame(f, 0, id)
    look(f, t)
  }
  // every way a game ends, on a visit's result and on free play's
  const tail = newGame('tail', { seed: 7, lengthMs: 120000, now: 0 })
  let bite = { ...tail, fish: keyAt(3, 8), body: [keyAt(1, 4), keyAt(1, 3), keyAt(1, 2), keyAt(1, 1), keyAt(1, 0)] }
  bite = stepGame(inputGame(stepGame(inputGame(inputGame(bite, turn(3, 1), 10), turn(0, -1), 20), 1400), turn(3, -1), 1410), 2100)
  const fishWin = stepGame({ ...tail, eaten: TAIL_FISH - 1, fish: keyAt(1, 3) }, TAIL_STEP_MS)
  const caught = stepGame(newGame('pointer', { seed: 1, now: 0 }), 10000)
  let knocked = newGame('knock', { seed: 1, now: 0 })
  for (let t = 0; !knocked.over; t += 10) { knocked = stepGame(knocked, t); if (knocked.phase === 'edge') knocked = inputGame(knocked, press(0), t) }
  const timeUp = stepGame(newGame('mice', { seed: 1, now: 0 }), FREE_GAME_MS)
  let petsOut = newGame('mice', { seed: 21, now: 0 }) // every pet that comes is tapped
  for (let t = 0; !petsOut.over; t += 50) {
    petsOut = stepGame(petsOut, t)
    if (petsOut.pets.length) petsOut = inputGame(petsOut, key(petsOut.pets[0].key), t)
  }
  const results = [bite, fishWin, caught, knocked, timeUp, petsOut]
  assert.deepEqual(results.map(g => g.outcome), ['lose', 'win', 'lose', 'win', 'time', 'lose'])
  const visit = arcadeSample('clue', 0)
  for (const g of results) {
    look(onResult(g), g.endedAt)
    look(onResult(g, { mode: 'visit', players: visit.players, turn: 0, roundEndsAt: g.endedAt + 60000 }), g.endedAt)
  }
  const resultLines = results.map(g => arcadeView(onResult(g), g.endedAt).screen)
  assert.deepEqual(resultLines.map(s => s.boo), [BOO_LINES.bite, resultLines[1].boo, BOO_LINES.caught, resultLines[3].boo, BOO_LINES.time, BOO_LINES.pets])
  assert.ok(BOO_LINES.win.includes(resultLines[1].boo) && BOO_LINES.win.includes(resultLines[3].boo))
  assert.deepEqual(resultLines.map(s => s.picture), ['Boo 3.png', ' Boo 5.png', 'Boo 3.png', ' Boo 5.png', 'Boo 4.png', 'Boo 3.png'])
  assert.equal(resultLines[5].plain, `You tapped three pets. ${petsOut.score} ${petsOut.score === 1 ? 'point' : 'points'}.`)
  assert.equal(resultLines[0].plain, `Boo bit her own tail. ${bite.score} points.`)
  assert.equal(resultLines[4].plain, "Time's up. 0 points.")
  // the result's strip: the game, how it ended, the points
  const resultStrips = results.map(g => arcadeView(onResult(g), g.endedAt).strip)
  assert.deepEqual(resultStrips.map(s => s.centre), ['Boo bit her own tail.', 'Boo is full.', 'Boo caught the red dot.', 'Everything is off the table.', "Time's up.", 'You tapped three pets.'])
  assert.deepEqual(resultStrips.map(s => s.left), results.map(g => GAMES.find(x => x.id === g.id).name))
  assert.deepEqual(resultStrips.map(s => s.right), results.map(g => `${g.score} ${g.score === 1 ? 'point' : 'points'}`))
  assert.equal(arcadeView(onResult(caught, { mode: 'visit', players: visit.players, turn: 0 }), caught.endedAt).screen.plain, 'Boo caught the red dot. Jessa: 3 points.')
  look(arcadeChime(arcadeSample('menu', 0), 10), 10) // Mari is left out
  const trio = newArcade({ mode: 'visit', players: ['Margaret', 'Tom', 'Ellie'], seed: 1, now: 0 })
  look(arcadeChime(trio, 10), 10) // all three
  look(arcadeChime({ ...trio, players: trio.players.map((p, i) => ({ ...p, reached: i < 2 })) }, 10), 10) // only the third

  // the words
  const words = new Set([ARCADE_NAME, STAND_IN_CLUE, CLUE_NOTE, THIRD_LINE, FAREWELL_LINE, ...Object.values(BOO_LINES).flat(),
    ...GAMES.flatMap(g => [g.name, g.short, g.how, g.boo, ...(g.rule ? [g.rule] : []), ...g.dials])])
  for (const v of views) for (const w of shownWords(v)) words.add(w)
  assert.ok(words.size > 60, `${words.size} lines`)
  for (const w of words) {
    assert.ok(!WAITING.test(w), `F09: ${w}`)
    assert.ok(!w.includes('\u2014'), `no em dash: ${w}`)
  }
  const shown = new Set(views.flatMap(shownWords)) // what a view showed, not the lists above
  for (const w of ["Strike 1! That's a pet.", "Strike 2! That's a pet.", 'Too soon!', 'Too late!', "Three pets and you're out.", 'You tapped three pets.']) assert.ok(shown.has(w), `shown: ${w}`)
  assert.ok(shown.has('Out of time before their clue: Mari.'))
  assert.ok(shown.has("Out of time before their clue: Margaret and Tom. Out of time before Boo's line: Ellie."))
  assert.ok(shown.has("Out of time before Boo's line: Ellie."))
  assert.ok(views.some(v => v.screen.stage === 'third') && views.some(v => v.screen.stage === 'winner') && views.some(v => v.screen.stage === 'farewell'))

  // Boo's own lines
  const boo = new Set([...Object.values(BOO_LINES).flat(), ...GAMES.map(g => g.boo), ...views.map(v => v.screen.boo)])
  const echoes = [src('../../functions/lib/hosts.js'), src('../../functions/lib/act4.js'), src('../../seed/cat-lines.json'), src('../src/lib/gametest.js')]
  for (const line of boo) {
    assert.ok(line && !/\d/.test(line), `no number in Boo's line: ${line}`)
    assert.ok(!/\b(motives?|famil(y|ies)|rooms?|bags?|senses?|objects?|ghost|murder\w*|clues?|points?|score|dial|key|press)\b/i.test(line), `no rule or case word: ${line}`)
    assert.ok(!/\b(meow|miaow|mew|purr\w*|hiss\w*)\b/i.test(line), `no cat sound: ${line}`)
    assert.ok(!line.includes('Ew. Do I know you?'))
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
  for (const name of ['home', 'menu', 'play', 'clue', 'third', 'winner', 'farewell']) {
    const { screen } = arcadeView(arcadeSample(name, 0), 0)
    assert.ok(screen.clue === null || screen.clue === STAND_IN_CLUE, `${name}: ${screen.clue}`)
  }
  assert.equal(arcadeView(arcadeSample('clue', 0), 0).screen.clue, STAND_IN_CLUE)
  // ?kiosk=boo&play=1 is the arcade, ahead of the practice show (?kiosk=boo&practice=1) and Boo's wall (?kiosk=boo)
  const main = src('../src/main.jsx')
  assert.match(main, /import BooArcade from '\.\/screens\/Arcade'/)
  assert.match(main, /const arcade = kiosk === 'boo' && new URLSearchParams\(window\.location\.search\)\.get\('play'\) === '1'/)
  assert.match(main, / : arcade \? <BooArcade \/> : Practising \? <Practising \/> : kiosk \? <Kiosk which=\{kiosk\} \/> : <App \/>/)
})

test('L09 the page: one 50 ms loop, the deck only through lib/arcadeDeck.js, the sounds only through sfx on the kiosk\'s AudioContext, the PRACTICE band only in a visit', () => {
  const page = uncommented(src('../src/screens/Arcade.jsx'))
  assert.match(page, /^const TICK_MS = 50\s*$/m)
  assert.match(page, /setInterval\(\(\) => tickRef\.current\(\), TICK_MS\)/, 'the loop runs at TICK_MS')
  assert.equal((page.match(/setInterval\(/g) ?? []).length, 1, 'one loop')
  assert.match(page, /return \(\) => clearInterval\(id\)/, 'and it stops when the page goes')
  assert.ok(!/navigator\.hid|requestDevice|openDevice|@elgato/.test(page), 'the deck is opened only by lib/arcadeDeck.js')
  assert.match(page, /function connect\(\) \{\s*const asking = chooseDeck\(\{ steal: true \}\)/, 'Connect asks the browser first, inside the click, and takes the deck from another arcade tab')
  assert.match(page, /reopenDeck\(\{ steal: true \}\)\.then\(d => \{/, 'the open on load takes the deck from another arcade tab')
  assert.match(page, /onPlug: \(\) => reopenDeck\(\)\.then\(d => \{ if \(cancelled\) return; if \(d\) attach\(d\); else setProblem\(p => deckProblem\(\) \?\? p\) \}\)/,
    'a replug asks only if the deck is free, and says why it could not')
  assert.ok(!/AudioContext/.test(page), 'no AudioContext of its own')
  assert.match(page, /const ctx = wakeAudio\(\)\s*for \(const name of events\) sfx\(ctx, name\)/)
  assert.match(page, /<RehearsalBand on=\{live && visit\} label="PRACTICE" \/>/)
  assert.match(page, /\{live \? <Wake \/> : null\}/, 'the wake corner, never on a sample')
  assert.ok(!/localStorage|sessionStorage|indexedDB|fetch\(/.test(page), 'it keeps nothing and sends nothing')
  for (const words of Object.values({
    tab: 'The Stream Deck went to another arcade tab. Press Connect to bring it back here.',
    busy: 'The Stream Deck is busy: quit the Stream Deck app, then press Connect again.',
    gone: 'The Stream Deck was unplugged. Plug it back in.',
    other: "The Stream Deck didn't answer. Press Connect again.",
  })) assert.ok(page.includes(words), words)
  for (const words of ['Connect the Stream Deck', 'Stream Deck + XL: connected.', 'To play on the Stream Deck, open this page in Google Chrome.', 'Ring the chime', "Practise a group's visit"]) {
    assert.ok(page.includes(words), words)
  }
})

test('G54 the art lists every face the engine shows, and the sounds every name it asks for', async () => {
  const { knowsFace, FACE_SIZE, STRIP_W, STRIP_H } = await import('../src/lib/arcadeArt.js')
  const { SOUNDS } = await import('../src/lib/arcadeSound.js')
  for (const f of FACE_IDS) assert.ok(knowsFace(f), `the art draws ${f}`)
  for (const s of SOUND_NAMES) assert.ok(SOUNDS.includes(s), `a sound for ${s}`)
  assert.deepEqual([FACE_SIZE, STRIP_W, STRIP_H], [112, 1200, 100], 'the + XL\'s key and strip')
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
  const SAMPLES = { 'kiosk-arcade': 'home', 'kiosk-arcade-play': 'play', 'kiosk-arcade-clue': 'clue', 'kiosk-arcade-third': 'third', 'kiosk-arcade-farewell': 'farewell' }
  for (const [name, sample] of Object.entries(SAMPLES)) {
    assert.ok(preview.includes(`'${name}': () => <BooArcade sample="${sample}" />`), name)
    assert.equal(arcadeView(arcadeSample(sample, 0), 0).screen.stage, sample, `${name} is the ${sample} moment`)
  }
  // a sample has no loop, input, deck, sound, form or band: every one of them waits on `live`
  const page = uncommented(src('../src/screens/Arcade.jsx'))
  assert.match(page, /^\s*const live = !sample\s*$/m)
  assert.equal((page.match(/if \(!live\) return/g) ?? []).length, 4, 'the loop, the sound, the keyboard and the title')
  assert.match(page, /if \(!live \|\| !box\) return/, 'the mouse wheel')
  assert.match(page, /if \(!live \|\| !deckSupported\(\)\) return/, 'the deck')
  assert.match(page, /inert=\{sample \? true : undefined\}/, 'nothing on a sample answers a click')
})
