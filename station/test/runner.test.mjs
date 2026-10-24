import { test } from 'node:test'
import assert from 'node:assert/strict'
import { keyImage } from '../lib/streamdeck.js'
import { countSegments, Nanoleaf } from '../lib/nanoleaf.js'
import { FakeWall, FakeDeck } from '../lib/fakes.js'
import { createRunner } from '../lib/runner.js'

test('key images: the right size, a solid blank, text on the lit keys', () => {
  const size = 72
  const blank = keyImage('blank', size)
  assert.equal(blank.length, size * size * 3)
  assert.ok(blank.every(v => v === 0), 'blank stays black')
  const red = keyImage('red', size)
  const fillCount = [...Array(size * size)].filter((_, i) => red[i * 3] === 191 && red[i * 3 + 1] === 25).length
  assert.ok(fillCount > size * size * 0.6, 'mostly the key colour')
  assert.ok(fillCount < size * size, 'some pixels are the label')
  const dark = keyImage('submit', size, { lit: false })
  assert.ok(dark.every(v => v === 0), 'an unlit key is dark')
  for (const n of ['1', '2', '3', '4', '5', '6', 'undo', 'submit', 'yellow', 'green', 'blue', 'pink', 'white']) {
    assert.equal(keyImage(n, size).length, size * size * 3)
  }
})

test('countSegments: gaps between the lit bars when there is room, else side by side', () => {
  const eleven = Array.from({ length: 11 }, (_, i) => 100 + i)
  assert.deepEqual(countSegments(eleven, 6), [100, 102, 104, 106, 108, 110])
  assert.deepEqual(countSegments(eleven, 3), [100, 102, 104])
  const nine = eleven.slice(0, 9)
  assert.deepEqual(countSegments(nine, 6), [100, 101, 102, 103, 104, 105])
  assert.deepEqual(countSegments(nine, 5), [100, 102, 104, 106, 108])
})

test('Nanoleaf: layout leaves the controller out and sorts top-left first; frames name every panel', async () => {
  const calls = []
  const fetchImpl = async (url, opts = {}) => {
    calls.push({ url, opts })
    if (url.endsWith('/panelLayout/layout')) {
      return { ok: true, status: 200, text: async () => JSON.stringify({ positionData: [
        { panelId: 3, x: 200, y: 0, shapeType: 14 }, { panelId: 1, x: 0, y: 100, shapeType: 14 },
        { panelId: 9, x: 100, y: 100, shapeType: 12 }, { panelId: 2, x: 100, y: 0, shapeType: 14 },
      ] }) }
    }
    return { ok: true, status: 204, text: async () => '' }
  }
  const wall = new Nanoleaf({ host: '10.0.0.5', token: 'tok', fetchImpl })
  const panels = await wall.loadLayout()
  assert.deepEqual(panels.map(p => p.id), [1, 2, 3])
  await wall.frame({ 2: [255, 255, 255] })
  const body = JSON.parse(calls.at(-1).opts.body)
  assert.equal(body.write.command, 'display')
  assert.equal(body.write.animData, '3 1 1 0 0 0 0 1 2 1 255 255 255 0 1 3 1 0 0 0 0 1')
  assert.ok(calls.at(-1).url.endsWith('/api/v1/tok/effects'))
})

test('fakes: the wall reports what it lit and the deck relays presses', async () => {
  const lines = []
  const wall = new FakeWall({ name: 'w', panelIds: [5, 6, 7], log: (l) => lines.push(l) })
  await wall.frame({ 6: [255, 255, 255] })
  assert.equal(lines.at(-1), '[w] lit 2')
  let touched = null
  wall.listenTouch((id) => { touched = id })
  wall.touch(3)
  assert.equal(touched, 7)
  const deck = new FakeDeck({ log: () => {} })
  const presses = []
  deck.onKey((n) => presses.push(n))
  deck.press('submit')
  assert.deepEqual(presses, ['submit'])
})

// ---- the runner, with fakes for the walls, the deck and the server ---------

const PANELS = [11, 12, 13, 14, 15, 16, 17]

// A station with no hardware: the sleeps are instant unless `gate` names one
// to hold (the rest after a finish), and the server is a stub that records
// what it was sent and answers like the real function.
function station({ elementsOk = true, nextGroup = 'g2', gate = {} } = {}) {
  const elements = new FakeWall({ name: 'elements', panelIds: PANELS, log: () => {} })
  const lines = new FakeWall({ name: 'lines', panelIds: [21, 22, 23, 24, 25, 26, 27], log: () => {} })
  const deck = new FakeDeck({ log: () => {} })
  const sent = []
  const callStation = async (args) => {
    sent.push(args)
    if (args.command === 'finished') return { data: { ok: true, dealt: 2, nextGroup, serverTime: Date.now() } }
    return { data: { ok: true, serverTime: Date.now() } }
  }
  const panelIds = elementsOk ? PANELS : [1, 2, 3, 4, 5, 6]
  const runner = createRunner({
    elements, lines, deck, elementsOk, panelIds, layout: panelIds.map((id, i) => ({ id, x: i * 100, y: 0 })),
    callStation, stationKey: 'k', restMs: 20_000,
    sleep: (ms) => (gate[ms] ? gate[ms] : Promise.resolve()),
  })
  runner.night('n1')
  runner.due('g1')
  return { runner, elements, lines, deck, sent }
}
// Everything queued so far, and everything that queued while waiting, has run.
async function flush(runner) {
  let q
  do { q = runner.settled(); await q } while (q !== runner.settled())
}
async function reproduce(runner) {
  await flush(runner)
  assert.equal(runner.machine.state, 'reproducing', 'the wall has finished playing, now the group')
  const snap = runner.machine.snapshot
  for (const p of runner.machine.patterns[snap.round][snap.pattern]) runner.touch(p)
  await flush(runner)
}
async function enter(runner, pair) {
  runner.key(pair.colour); runner.key(String(pair.number)); runner.key('submit')
  await flush(runner)
}
const defer = () => { let resolve; const p = new Promise(r => { resolve = r }); p.resolve = resolve; return p }

test('the runner plays every pattern, not only the first: a correct answer brings the next one', { timeout: 5000 }, async () => {
  const { runner, elements } = station()
  await flush(runner)
  runner.touch(PANELS[0])
  await reproduce(runner)
  assert.equal(runner.machine.snapshot.pattern, 1)
  assert.equal(runner.machine.state, 'reproducing', 'pattern 2 played and is waiting on the group')
  await reproduce(runner)
  await reproduce(runner)
  assert.equal(runner.machine.state, 'entering', 'three patterns clear: the Lines answer')
  const lit = elements.frames.filter(f => Object.values(f).some(v => v[0] === 255)).length
  assert.ok(lit >= 3 + 4 + 5, 'every panel of every pattern lit the wall')
})

test('after a finish the station waits for whichever group the server says is next', { timeout: 5000 }, async () => {
  const rest = defer()
  const { runner, sent } = station({ nextGroup: 'g2', gate: { 20_000: rest } })
  await flush(runner)
  runner.touch(PANELS[0])
  for (let round = 0; round < 3; round++) {
    for (let pat = 0; pat < 3; pat++) await reproduce(runner)
    if (round < 2) await enter(runner, runner.machine.code[round])
  }
  // the last pair: the walls then rest behind the gate, so no flush here
  const last = runner.machine.code[2]
  runner.key(last.colour); runner.key(String(last.number)); runner.key('submit')
  assert.equal(runner.machine.state, 'done')
  await new Promise(r => setTimeout(r, 0))
  const finished = sent.filter(a => a.command === 'finished')
  assert.equal(finished.length, 1)
  assert.equal(finished[0].payload.groupId, 'g1')
  assert.equal(finished[0].payload.outcome, 'solved')
  // the server's snapshot names the next group while the walls are still resting
  runner.due('g2')
  assert.equal(runner.machine.state, 'done', 'a resting station is not rebuilt mid-rest')
  rest.resolve()
  await flush(runner)
  assert.equal(runner.machine.state, 'idle')
  assert.equal(runner.groupId, 'g2')
  assert.equal(runner.machine.snapshot.groupId, 'g2', 'the next group, never the one just paid')
  // the next group's finish names them
  runner.touch(PANELS[1])
  for (let round = 0; round < 3; round++) {
    for (let pat = 0; pat < 3; pat++) await reproduce(runner)
    if (round < 2) await enter(runner, runner.machine.code[round])
  }
  const last2 = runner.machine.code[2]
  runner.key(last2.colour); runner.key(String(last2.number)); runner.key('submit')
  await new Promise(r => setTimeout(r, 0))
  assert.equal(sent.filter(a => a.command === 'finished').at(-1).payload.groupId, 'g2')
})

test("Granolia's word about a wrong pair is spent once the pair is right", { timeout: 5000 }, async () => {
  const { runner } = station()
  await flush(runner)
  runner.touch(PANELS[0])
  for (let pat = 0; pat < 3; pat++) await reproduce(runner)
  const want = runner.machine.code[0]
  const otherColour = ['red', 'yellow', 'green', 'blue', 'pink', 'white'].find(c => c !== want.colour)
  await enter(runner, { colour: otherColour, number: want.number })
  assert.equal(runner.granolia?.hint, 'half')
  await enter(runner, want)
  assert.equal(runner.granolia, null, 'round 2 starts with nothing to say')
  assert.equal(runner.machine.snapshot.round, 1)
})

test('with the Elements down the wall is left alone and the screen gets the pattern while it plays', { timeout: 5000 }, async () => {
  const { runner, elements, sent } = station({ elementsOk: false })
  await flush(runner)
  runner.key('1') // a number key stands in for a panel: the game begins
  await flush(runner)
  assert.equal(elements.frames.length, 0, 'no frames to a wall that is down')
  const playing = sent.filter(a => a.command === 'state' && a.payload.state === 'playing')
  assert.ok(playing.length >= 1)
  assert.ok(Array.isArray(playing[0].payload.fallbackPattern) && playing[0].payload.fallbackPattern.length === 3, 'the screen knows the pattern as it plays')
  assert.equal(runner.machine.state, 'reproducing')
  const pattern = runner.machine.patterns[0][0]
  for (const p of pattern) runner.key(String(p))
  await flush(runner)
  assert.equal(runner.machine.snapshot.pattern, 1, 'the number keys reproduce it')
})

// ---- a pause: the ten-minute clock stands still with the rest of the house

// A station on a clock the test turns by hand; the server answers with the same clock, so skew is zero.
function stationOnClock() {
  const clock = { t: 1_000_000 }
  const elements = new FakeWall({ name: 'elements', panelIds: PANELS, log: () => {} })
  const lines = new FakeWall({ name: 'lines', panelIds: [21, 22, 23, 24, 25, 26, 27], log: () => {} })
  const deck = new FakeDeck({ log: () => {} })
  const sent = []
  const callStation = async (args) => { sent.push(args); return { data: { ok: true, serverTime: clock.t } } }
  const runner = createRunner({
    elements, lines, deck, panelIds: PANELS, layout: PANELS.map((id, i) => ({ id, x: i * 100, y: 0 })),
    callStation, stationKey: 'k', restMs: 20_000, sleep: () => Promise.resolve(), now: () => clock.t,
  })
  runner.night('n1')
  runner.due('g1')
  return { runner, clock, sent }
}

test('the host pauses the night: the cap waits out the pause and the group gets its whole ten minutes', { timeout: 5000 }, async () => {
  const { runner, clock, sent } = stationOnClock()
  await flush(runner)
  const cap = runner.machine.settings.capMs
  runner.touch(PANELS[0])
  await flush(runner)
  assert.equal(runner.machine.state, 'reproducing')
  const startedAt = runner.machine.snapshot.startedAt
  assert.equal(startedAt, clock.t)
  // seven minutes in, the host pauses for six
  clock.t += 7 * 60_000
  runner.tick(); await flush(runner)
  assert.equal(runner.machine.state, 'reproducing')
  runner.paused(true, clock.t)
  assert.equal(runner.isPaused, true)
  const patternBefore = runner.machine.snapshot.pattern
  runner.touch(runner.machine.patterns[0][0][0]) // a touch during the pause does nothing
  await flush(runner)
  assert.equal(runner.machine.snapshot.pattern, patternBefore)
  clock.t += 6 * 60_000
  runner.tick(); await flush(runner)
  assert.equal(runner.machine.state, 'reproducing', 'thirteen minutes on the wall clock, but only seven of them count')
  assert.equal(runner.machine.snapshot.outcome, null, 'not capped during the pause')
  // the host resumes: the clock picks up at seven minutes
  runner.paused(false, clock.t)
  await flush(runner)
  assert.equal(runner.isPaused, false)
  assert.equal(runner.machine.snapshot.startedAt, startedAt + 6 * 60_000, 'the start moved on by the length of the pause')
  const lastState = sent.filter(a => a.command === 'state').at(-1)
  assert.equal(lastState.payload.startedAt, startedAt + 6 * 60_000, 'the kiosk clock is told')
  clock.t = startedAt + 6 * 60_000 + cap - 1
  runner.tick(); await flush(runner)
  assert.equal(runner.machine.state, 'reproducing', 'one second short of the cap')
  clock.t += 1
  runner.tick()
  assert.equal(runner.machine.state, 'done')
  assert.equal(runner.machine.snapshot.outcome, 'capped')
  await flush(runner) // the walls rest (instantly here) and the station re-arms
  assert.equal(runner.machine.state, 'idle')
  const fin = sent.filter(a => a.command === 'finished').at(-1)
  assert.equal(fin.payload.outcome, 'capped')
  assert.equal(fin.payload.seconds, cap / 1000, 'the seconds reported leave the pause out')
  // a pause with no game running, and a resume twice, change nothing
  runner.paused(true, clock.t); runner.paused(false, clock.t + 5000); runner.paused(false, clock.t + 9000)
  assert.equal(runner.isPaused, false)
})
