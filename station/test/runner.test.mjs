import { test } from 'node:test'
import assert from 'node:assert/strict'
import { keyImage } from '../lib/streamdeck.js'
import { countSegments, Nanoleaf } from '../lib/nanoleaf.js'
import { FakeWall, FakeDeck } from '../lib/fakes.js'
import { createRunner } from '../lib/runner.js'
import { STOP_EARLY_MS } from '../lib/study.js'

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

// ---- a pause: the fifteen-minute clock stands still with the rest of the house

// A station on a clock the test turns by hand; the server answers with the same clock, so skew is zero.
function stationOnClock({ sleep = () => Promise.resolve(), failFinished = 0 } = {}) {
  const clock = { t: 1_000_000 }
  const elements = new FakeWall({ name: 'elements', panelIds: PANELS, log: () => {} })
  const lines = new FakeWall({ name: 'lines', panelIds: [21, 22, 23, 24, 25, 26, 27], log: () => {} })
  const deck = new FakeDeck({ log: () => {} })
  const sent = []
  const callStation = async (args) => {
    sent.push(args)
    if (args.command === 'finished' && failFinished-- > 0) throw new Error('internal')
    return { data: { ok: true, serverTime: clock.t } }
  }
  const runner = createRunner({
    elements, lines, deck, panelIds: PANELS, layout: PANELS.map((id, i) => ({ id, x: i * 100, y: 0 })),
    callStation, stationKey: 'k', restMs: 20_000, sleep, now: () => clock.t,
  })
  runner.night('n1')
  runner.due('g1')
  return { runner, clock, sent }
}

test('the host pauses the night: the cap waits out the pause and the group gets its whole fifteen minutes', { timeout: 5000 }, async () => {
  const { runner, clock, sent } = stationOnClock()
  await flush(runner)
  const cap = runner.machine.settings.capMs
  runner.touch(PANELS[0])
  await flush(runner)
  assert.equal(runner.machine.state, 'reproducing')
  const startedAt = runner.machine.snapshot.startedAt
  assert.equal(startedAt, clock.t)
  // seven minutes in, the host pauses for nine
  clock.t += 7 * 60_000
  runner.tick(); await flush(runner)
  assert.equal(runner.machine.state, 'reproducing')
  runner.paused(true, clock.t)
  assert.equal(runner.isPaused, true)
  const patternBefore = runner.machine.snapshot.pattern
  runner.touch(runner.machine.patterns[0][0][0]) // a touch during the pause does nothing
  await flush(runner)
  assert.equal(runner.machine.snapshot.pattern, patternBefore)
  clock.t += 9 * 60_000
  runner.tick(); await flush(runner)
  assert.equal(runner.machine.state, 'reproducing', 'sixteen minutes on the wall clock, but only seven of them count')
  assert.equal(runner.machine.snapshot.outcome, null, 'not capped during the pause')
  // the host resumes: the clock picks up at seven minutes
  runner.paused(false, clock.t)
  await flush(runner)
  assert.equal(runner.isPaused, false)
  assert.equal(runner.machine.snapshot.startedAt, startedAt + 9 * 60_000, 'the start moved on by the length of the pause')
  const lastState = sent.filter(a => a.command === 'state').at(-1)
  assert.equal(lastState.payload.startedAt, startedAt + 9 * 60_000, 'the kiosk clock is told')
  clock.t = startedAt + 9 * 60_000 + cap - 1
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

// ---- the round's end: the game stops with the round, never past it (Jon, 1 Nov 2026)

// A game under way for g1: the chime, the walk upstairs, the first touch.
async function gameInRound(options) {
  const s = stationOnClock(options)
  const slot = s.clock.t + 15 * 60_000
  s.runner.due('g1', null, slot)
  await flush(s.runner)
  s.clock.t += 90_000
  s.runner.touch(PANELS[0])
  await flush(s.runner)
  assert.equal(s.runner.machine.state, 'reproducing')
  return { ...s, slot }
}
const finishedSent = sent => sent.filter(a => a.command === 'finished')

test('the game stops just before the round\'s end, not fifteen minutes from a late first touch, and the wall is ready for the next group', { timeout: 5000 }, async () => {
  const { runner, clock, sent, slot } = await gameInRound()
  clock.t = slot - STOP_EARLY_MS - 1
  runner.tick(); await flush(runner)
  assert.equal(runner.machine.state, 'reproducing', 'one moment short of the stop')
  clock.t = slot - STOP_EARLY_MS
  runner.tick()
  assert.equal(runner.machine.state, 'done')
  assert.equal(runner.machine.snapshot.outcome, 'capped')
  await flush(runner) // the walls rest (instantly here) and the station re-arms
  assert.equal(finishedSent(sent).length, 1)
  assert.equal(finishedSent(sent)[0].payload.groupId, 'g1')
  assert.equal(finishedSent(sent)[0].payload.outcome, 'capped')
  assert.equal(finishedSent(sent)[0].payload.seconds, 13.5 * 60 - 5)
  assert.equal(runner.machine.state, 'idle')
  // the chime lands a moment later: the next group finds the wall waiting for them, and is not stopped
  runner.due('g2', null, slot + 15 * 60_000)
  await flush(runner)
  assert.equal(runner.machine.state, 'idle')
  assert.equal(runner.machine.snapshot.groupId, 'g2')
  runner.touch(PANELS[0])
  await flush(runner)
  assert.equal(runner.machine.state, 'reproducing', 'the next group\'s game starts at their first touch')
  assert.equal(finishedSent(sent).length, 1)
})

test('the stop leaves the report time to beat the chime: the walls take well under the five seconds, with room for the corner\'s flash and the network', { timeout: 5000 }, async () => {
  const slept = []
  const { runner, clock, slot } = await gameInRound({ sleep: ms => { slept.push(ms); return Promise.resolve() } })
  slept.length = 0
  clock.t = slot - STOP_EARLY_MS
  runner.tick(); await flush(runner)
  const walls = slept.filter(ms => ms !== 20_000).reduce((sum, ms) => sum + ms, 0) // all but the rest, which comes after the report
  assert.ok(walls > 0, 'the walls do take a moment')
  const FLASH_MS = 900, NETWORK_MS = 1500 // a solve's last pair flashes the corner first (lib/streamdeck.js)
  assert.ok(walls + FLASH_MS + NETWORK_MS <= STOP_EARLY_MS, `the walls take ${walls} ms`)
})

test('the finished page goes up after the report and holds through the rest: the group reads how it went, not the rules card', { timeout: 5000 }, async () => {
  const { runner, clock, sent, slot } = await gameInRound()
  clock.t = slot - STOP_EARLY_MS
  runner.tick(); await flush(runner)
  const report = sent.findIndex(a => a.command === 'finished')
  assert.ok(report >= 0)
  const after = sent.slice(report + 1).filter(a => a.command === 'state')
  assert.equal(after[0].payload.state, 'done', 'the page says something has been sent to the phones, so it follows the report')
  assert.equal(after[0].payload.outcome, 'capped')
  assert.equal(after[0].payload.revealed.length, 3, 'with the pairs not found')
  assert.equal(after.at(-1).payload.state, 'idle', 'and the rest ends with the wall ready')
})

test('a report that fails does not hold the finished page: done goes out anyway, and the report goes again on the next tick, once', { timeout: 5000 }, async () => {
  const { runner, clock, sent, slot } = await gameInRound({ failFinished: 1 })
  clock.t = slot - STOP_EARLY_MS
  runner.tick(); await flush(runner)
  assert.equal(finishedSent(sent).length, 1)
  const report = sent.findIndex(a => a.command === 'finished')
  assert.equal(sent.slice(report + 1).find(a => a.command === 'state').payload.state, 'done', 'the game does not stay on the screen for a report that failed')
  runner.tick(); await flush(runner)
  assert.equal(finishedSent(sent).length, 2, 'sent again')
  assert.deepEqual(finishedSent(sent)[1].payload, finishedSent(sent)[0].payload)
  runner.tick(); await flush(runner)
  assert.equal(finishedSent(sent).length, 2, 'and once it has landed, that is the end of it')
})

test('the round moves on while a game runs (the chime, or the host\'s Next): the game stops there and then, and reports once', { timeout: 5000 }, async () => {
  const { runner, clock, sent, slot } = await gameInRound()
  clock.t = slot - 5 * 60_000
  runner.tick(); await flush(runner)
  runner.due('g2', null, clock.t + 15 * 60_000)
  assert.equal(runner.machine.state, 'done', 'stopped on the new round, not at the old round\'s end')
  await flush(runner)
  assert.equal(finishedSent(sent).length, 1)
  assert.equal(finishedSent(sent)[0].payload.groupId, 'g1', 'the group that played, never the group due next')
  assert.equal(finishedSent(sent)[0].payload.outcome, 'capped')
  assert.equal(runner.machine.state, 'idle')
  assert.equal(runner.machine.snapshot.groupId, 'g2')
})

test('the last round ends with a game running: the server writes no group and no round, and the game stops', { timeout: 5000 }, async () => {
  const { runner, sent } = await gameInRound()
  runner.due(null, null, 0)
  assert.equal(runner.machine.state, 'done')
  await flush(runner)
  assert.equal(finishedSent(sent).at(-1).payload.groupId, 'g1')
  assert.equal(runner.machine.snapshot.groupId, null)
})

test('the host\'s "this group is in the study" and a resume each leave a running game alone', { timeout: 5000 }, async () => {
  const { runner, slot } = await gameInRound()
  runner.due('g2', null, slot) // the swap: another group, the same round
  assert.equal(runner.machine.state, 'reproducing', 'the group changed but the round did not')
  assert.equal(runner.groupId, 'g2')
  runner.due('g2', null, slot + 60_000) // a resume: the same group, the round's end moved
  assert.equal(runner.machine.state, 'reproducing', 'the round\'s end moved but the group did not')
})

test('a pause that runs past the round\'s end: the end moves with the pause, once, whichever write lands first', { timeout: 5000 }, async () => {
  for (const first of ['night', 'study']) {
    const { runner, clock, sent, slot } = await gameInRound()
    clock.t = slot - 60_000
    runner.tick(); await flush(runner)
    runner.paused(true, clock.t)
    clock.t += 5 * 60_000 // past the old end
    runner.tick(); await flush(runner)
    assert.equal(runner.machine.state, 'reproducing', 'nothing stops during a pause')
    const moved = slot + 5 * 60_000
    if (first === 'study') runner.due('g1', null, moved)
    runner.paused(false, clock.t)
    runner.tick(); await flush(runner)
    assert.equal(runner.machine.state, 'reproducing', `${first} first: the old end does not stop the game`)
    if (first === 'night') runner.due('g1', null, moved)
    clock.t = moved - STOP_EARLY_MS - 1
    runner.tick(); await flush(runner)
    assert.equal(runner.machine.state, 'reproducing', `${first} first: the group gets every minute back`)
    clock.t = moved - STOP_EARLY_MS
    runner.tick()
    assert.equal(runner.machine.state, 'done', `${first} first: the end moved by the pause, not twice`)
    await flush(runner)
    assert.equal(finishedSent(sent).at(-1).payload.outcome, 'capped')
  }
})

test('a new night forgets the old night\'s round', { timeout: 5000 }, async () => {
  const { runner, clock, slot } = await gameInRound()
  runner.night('n2')
  runner.due('g1')
  await flush(runner)
  clock.t = slot + 60_000
  runner.touch(PANELS[0])
  await flush(runner)
  runner.tick(); await flush(runner)
  assert.equal(runner.machine.state, 'reproducing', 'the old round\'s end does not stop a game on the new night')
})
