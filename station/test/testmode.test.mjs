import { test } from 'node:test'
import assert from 'node:assert/strict'
import { FakeWall, FakeDeck } from '../lib/fakes.js'
import { createRunner } from '../lib/runner.js'
import { createTestMode, HEARTBEAT_MS } from '../lib/testmode.js'
import { createTeacher, touchMapFile } from '../lib/teach.js'

// The study test (the workshop's Study test page) against fakes: a fake
// queue doc, a fake status call, fake walls and deck, and a clock the test
// turns by hand. No hardware, no Firestore, no server.

const PANELS = [11, 12, 13, 14, 15, 16, 17]
const settle = async () => { for (let i = 0; i < 5; i++) await new Promise(r => setImmediate(r)) }
const at = (t) => ({ toMillis: () => t })

// A clock with timers the test runs by hand.
function fakeClock() {
  const clock = { t: 1_000_000, timers: [] }
  clock.now = () => clock.t
  clock.setTimer = (fn, ms) => { const t = { at: clock.t + ms, fn }; clock.timers.push(t); return t }
  clock.advance = async (ms) => {
    const until = clock.t + ms
    for (;;) {
      await settle()
      const due = clock.timers.filter(t => t.at <= until).sort((a, b) => a.at - b.at)[0]
      if (!due) break
      clock.timers.splice(clock.timers.indexOf(due), 1)
      clock.t = Math.max(clock.t, due.at)
      due.fn()
    }
    clock.t = until
    await settle()
  }
  return clock
}

// The station as station.mjs wires it, with every outside thing faked. The
// live runner is following night n1, with `group` due at the study (none
// unless given: a test only runs with the study free). `queue` is what the
// queue doc already holds when the station starts. `sleep` stands in for the
// test mode's sleeps (at once unless given).
function rig({ elementsOk = true, linesOk = true, queue = null, group = null, sleep = () => Promise.resolve() } = {}) {
  const clock = fakeClock()
  const elements = new FakeWall({ name: 'elements', panelIds: PANELS, log: () => {} })
  const lines = new FakeWall({ name: 'lines', panelIds: [21, 22, 23, 24, 25, 26, 27], log: () => {} })
  const deck = new FakeDeck({ log: () => {} })
  const layout = PANELS.map((id, i) => ({ id, x: i * 100, y: 0 }))
  const server = []   // every call the live runner made
  const callStation = async (args) => { server.push(args); return { data: { ok: true, serverTime: clock.t } } }
  const sends = []
  const answer = { fn: async () => ({ data: { ok: true } }) }
  const send = (status) => { sends.push(status); return answer.fn(status) }
  const doc = { data: queue, listeners: new Set() }
  const watch = (path, onData) => { assert.equal(path, 'public_state/study_test'); doc.listeners.add(onData); onData(doc.data); return () => doc.listeners.delete(onData) }
  const deliver = (data) => { doc.data = data; for (const fn of doc.listeners) fn(data) }
  const push = (command, name = null, when = clock.t) => {
    const seq = (doc.data?.seq ?? 0) + 1
    deliver({ seq, queue: [...(doc.data?.queue ?? []), { seq, command, name, at: at(when) }].slice(-30), updatedAt: at(when) })
  }
  // every practice runner made, each with its own record of server calls
  const practice = []
  const makeRunner = (opts) => {
    const calls = []
    const r = createRunner({ ...opts, callStation: async (a) => { calls.push(a); return opts.callStation(a) } })
    r.calls = calls
    practice.push(r)
    return r
  }
  const saved = []
  const logs = []
  const testMode = createTestMode({
    elements, lines, deck, elementsOk, linesOk, panelIds: PANELS, layout, deckKind: 'keyboard',
    live: () => runner, send, watch, saveTouchMap: (t) => saved.push(t), makeRunner,
    log: (...a) => logs.push(a.join(' ')), sleep, now: clock.now, setTimer: clock.setTimer,
  })
  const runner = createRunner({
    elements: testMode.shield(elements), lines: testMode.shield(lines), deck: testMode.shield(deck),
    elementsOk, linesOk, panelIds: PANELS, layout, callStation, stationKey: 'k',
    sleep: () => Promise.resolve(), now: clock.now, restMs: 20_000,
  })
  elements.listenTouch((id, gesture, tapId) => testMode.touch(id, gesture, tapId))
  deck.onKey((name) => testMode.key(name))
  runner.night('n1')
  if (group) runner.due(group)
  runner.drain()
  testMode.start()
  const tapPanel = (id) => elements.touch(PANELS.indexOf(id) + 1)
  return { clock, elements, lines, deck, server, sends, answer, deliver, push, practice, saved, logs, testMode, runner, tapPanel }
}

// Everything the runners queued has run, and everything that queued meanwhile.
async function flush(r) {
  for (let i = 0; i < 50; i++) {
    const queues = [r.runner, ...r.practice].map(x => x.settled())
    await Promise.all(queues)
    await settle()
    if ([r.runner, ...r.practice].every((x, j) => x.settled() === queues[j])) return
  }
}

test('commands already in the queue when the station starts are never replayed', async () => {
  const old = { seq: 3, queue: [{ seq: 1, command: 'flash' }, { seq: 2, command: 'practice' }, { seq: 3, command: 'teach' }].map(e => ({ ...e, name: null, at: at(1_000_000) })) }
  const r = rig({ queue: old })
  await flush(r)
  assert.equal(r.elements.flashes, 0, 'no flash')
  assert.equal(r.practice.length, 0, 'no practice round')
  assert.equal(r.testMode.mode, 'idle')
  assert.equal(r.testMode.status.seenSeq, 3, 'the queue is marked read')
  r.push('flash')
  await flush(r)
  assert.equal(r.elements.flashes, 1, 'a new command after the start is carried out')
  assert.equal(r.lines.flashes, 1)
  assert.equal(r.testMode.status.seenSeq, 4)
  assert.equal(r.testMode.status.message, 'Both walls flashed.')
  await r.clock.advance(3000)
  assert.equal(r.testMode.mode, 'idle', 'the flash is over')
})

test('commands run in the order of their numbers; old ones are skipped; none runs twice', async () => {
  const r = rig()
  await flush(r)
  const t = r.clock.t
  // one snapshot with four new commands out of order, one of them pressed three minutes ago
  const snapshot = {
    seq: 4,
    queue: [
      { seq: 3, command: 'stop', name: null, at: at(t) },
      { seq: 1, command: 'flash', name: null, at: at(t - 3 * 60_000) },
      { seq: 4, command: 'key', name: 'red', at: at(t) },
      { seq: 2, command: 'practice', name: null, at: at(t) },
    ],
  }
  r.deliver(snapshot)
  await flush(r)
  assert.equal(r.elements.flashes, 0, 'the old flash is skipped')
  assert.equal(r.practice.length, 1, 'the practice round started (2)')
  assert.equal(r.testMode.mode, 'idle', 'then stopped (3)')
  assert.match(r.testMode.status.message, /No practice round is going/, 'so the key (4) found nothing to press')
  assert.equal(r.testMode.status.seenSeq, 4)
  assert.ok(r.logs.some(l => l.includes('skipped 1 command')))
  r.deliver(snapshot)
  await flush(r)
  assert.equal(r.practice.length, 1, 'the same snapshot again changes nothing')
})

test('a practice round plays through to the end and never calls the server', { timeout: 5000 }, async () => {
  const r = rig()
  await flush(r)
  const before = r.server.length
  r.push('practice')
  await flush(r)
  assert.equal(r.testMode.mode, 'practice')
  assert.equal(r.testMode.status.practice.state, 'idle')
  const p = r.practice[0]
  r.tapPanel(PANELS[0])
  await flush(r)
  assert.equal(p.machine.state, 'reproducing', 'the wall played the first pattern')
  assert.equal(r.runner.machine.state, 'idle', 'the live game never saw the touch')
  for (let round = 0; round < 3; round++) {
    for (let pat = 0; pat < 3; pat++) {
      const s = r.testMode.status.practice
      assert.equal(s.round, round + 1); assert.equal(s.rounds, 3); assert.equal(s.pattern, pat + 1); assert.equal(s.patterns, 3)
      for (const id of p.machine.patterns[round][pat]) r.tapPanel(id)
      await flush(r)
    }
    assert.equal(r.testMode.status.practice.state, 'entering')
    assert.equal(r.testMode.status.practice.shown, null, 'the Lines are up: they show it, the page does not')
    const pair = p.machine.code[round]
    if (round === 1) {
      // the button box works too
      r.deck.press(pair.colour); r.deck.press(String(pair.number))
      await flush(r)
      assert.deepEqual(r.testMode.status.practice.entry, { colour: pair.colour, number: String(pair.number) })
      r.deck.press('submit')
    } else {
      r.push('key', pair.colour); r.push('key', String(pair.number)); r.push('key', 'submit')
    }
    await flush(r)
  }
  const s = r.testMode.status
  assert.equal(s.mode, 'idle', 'after the rest the test is over')
  assert.equal(s.practice.state, 'done', 'the outcome stays for Jon to read')
  assert.equal(s.practice.outcome, 'solved')
  assert.equal(s.practice.pairs, 3)
  assert.match(s.message, /all 3 pairs were right/)
  assert.equal(p.calls.length, 0, 'the practice runner never called its server')
  assert.equal(r.server.length, before, 'and the live server heard nothing either')
  assert.equal(r.runner.machine.state, 'idle', 'the live game was never started')
  assert.deepEqual(Object.keys(s.practice).sort(), ['entry', 'misses', 'outcome', 'pairs', 'pattern', 'patterns', 'round', 'rounds', 'shown', 'state'], 'counts and words: no code, no pattern')
  assert.ok(Object.values(s.practice).every(v => !Array.isArray(v)))
})

// A sleep the test lets go of by hand, for the practice round's rest (5 s).
function heldRest() {
  const held = []
  const sleep = (ms) => (ms === 5000 ? new Promise(r => held.push(r)) : Promise.resolve())
  return { sleep, release: () => held.splice(0).forEach(go => go()), get count() { return held.length } }
}

// Plays a practice round up to the colour and number of `upTo` rounds (0-based), entering the pairs before it.
async function playTo(r, p, upTo) {
  r.tapPanel(PANELS[0])
  await flush(r)
  for (let round = 0; round <= upTo; round++) {
    for (let pat = 0; pat < 3; pat++) { for (const id of p.machine.patterns[round][pat]) r.tapPanel(id); await flush(r) }
    if (round < upTo) { const pair = p.machine.code[round]; r.deck.press(pair.colour); r.deck.press(String(pair.number)); r.deck.press('submit'); await flush(r) }
  }
}

test('a practice round: the page sees it done while the walls rest, then the test is over', { timeout: 5000 }, async () => {
  const hold = heldRest()
  const r = rig({ sleep: hold.sleep })
  await flush(r)
  r.push('practice')
  await flush(r)
  const p = r.practice[0]
  await playTo(r, p, 2)
  assert.equal(r.testMode.status.practice.state, 'entering')
  const pair = p.machine.code[2]
  r.deck.press(pair.colour); r.deck.press(String(pair.number)); r.deck.press('submit')
  await settle() // not flush: the round's rest is held
  assert.equal(hold.count, 1, 'the walls are resting')
  let s = r.testMode.status
  assert.equal(s.mode, 'practice', 'still the practice round during the rest')
  assert.equal(s.practice.state, 'done')
  assert.equal(s.practice.outcome, 'solved')
  assert.equal(s.practice.pairs, 3)
  assert.match(s.message, /^Solved/)
  hold.release()
  await flush(r)
  s = r.testMode.status
  assert.equal(s.mode, 'idle')
  assert.equal(s.practice.state, 'done', 'the outcome stays for Jon to read')
  assert.match(s.message, /all 3 pairs were right/)
})

test('half an entry says what to do; Stop just after a shiver still leaves the keys dark', { timeout: 5000 }, async () => {
  const r = rig()
  await flush(r)
  r.push('practice')
  await flush(r)
  const p = r.practice[0]
  await playTo(r, p, 0)
  r.push('key', 'red')
  await flush(r)
  // the real Stream Deck's shiver paints the keys itself, past the hold
  let open
  const gate = new Promise(go => { open = go })
  r.deck.shiver = async () => { await gate; await r.deck.paint(true) }
  r.push('key', 'submit')
  await settle()
  assert.equal(r.testMode.status.message, 'Pick a colour and a number, then Submit.')
  r.push('stop')
  await settle()
  assert.equal(r.testMode.mode, 'idle')
  open()
  await flush(r)
  assert.equal(r.deck.lit, false, 'the keys rest after the shiver is done')
  assert.deepEqual(r.elements.frames.at(-1)[PANELS[0]], [40, 40, 40], 'and so do the walls')
})

test('with the Lines down the page is told what they would show, and only then', { timeout: 5000 }, async () => {
  const r = rig({ linesOk: false })
  await flush(r)
  r.push('practice')
  await flush(r)
  const p = r.practice[0]
  r.tapPanel(PANELS[0])
  await flush(r)
  assert.equal(r.testMode.status.practice.shown, null, 'nothing while the pattern plays')
  for (let pat = 0; pat < 3; pat++) {
    for (const id of p.machine.patterns[0][pat]) r.tapPanel(id)
    await flush(r)
  }
  assert.deepEqual(r.testMode.status.practice.shown, p.machine.code[0])
  r.push('key', p.machine.code[0].colour); r.push('key', String(p.machine.code[0].number)); r.push('key', 'submit')
  await flush(r)
  assert.equal(r.testMode.status.practice.round, 2)
  assert.equal(r.testMode.status.practice.shown, null, 'gone once the pair is in')
})

test('practice, teach and flash are refused while a real group plays', { timeout: 5000 }, async () => {
  const r = rig({ group: 'g1' })
  await flush(r)
  r.tapPanel(PANELS[0]) // no test running: the live game takes the touch
  await flush(r)
  assert.equal(r.runner.machine.state, 'reproducing')
  r.tapPanel(r.runner.machine.patterns[0][0][0])
  await flush(r)
  assert.equal(r.testMode.status.lastTap, null, 'a group\'s taps (their pattern, and the touch that began it) never reach the status')
  const frames = r.elements.frames.length
  r.push('practice')
  assert.equal(r.practice.length, 0)
  assert.match(r.testMode.status.message, /group is playing/)
  r.push('teach')
  assert.equal(r.testMode.status.teach, null)
  assert.match(r.testMode.status.message, /group is playing/)
  r.push('flash')
  await flush(r)
  assert.equal(r.elements.flashes, 0)
  assert.equal(r.testMode.mode, 'idle')
  assert.equal(r.elements.frames.length, frames, 'nothing touched the walls')
  r.push('key', 'red')
  await flush(r)
  assert.match(r.testMode.status.message, /No practice round is going/, 'the answer pad never reaches the live game')
})

test('teaching: each hexagon in turn, taps go to the teacher only, the map is saved and used at once', { timeout: 5000 }, async () => {
  const r = rig()
  await flush(r)
  r.push('teach')
  await flush(r)
  assert.equal(r.testMode.mode, 'teach')
  assert.deepEqual(r.testMode.status.teach, { step: 1, of: 7 })
  assert.equal(r.testMode.status.message, 'Hexagon 1 of 7 is lit. Tap it.')
  assert.deepEqual(r.elements.frames.at(-1)[PANELS[0]], [255, 255, 255], 'the first hexagon is lit')
  // the wall taps by ids it never lists in its layout
  const tap = (tapId) => r.elements.touchListener(tapId, 0, tapId)
  tap(901)
  await flush(r)
  assert.deepEqual(r.testMode.status.teach, { step: 2, of: 7 })
  assert.deepEqual(r.testMode.status.lastTap, { panel: 1, known: true, at: r.clock.t }, 'the tap test names the hexagon just taught')
  // a re-arm from the server while a hexagon is lit does not dim it
  const lit = r.elements.frames.at(-1)
  r.runner.reset()
  await flush(r)
  assert.equal(r.elements.frames.at(-1), lit, 'the live runner is held back while teaching')
  tap(901) // a slip: that tap is hexagon 1's
  await flush(r)
  assert.deepEqual(r.testMode.status.teach, { step: 2, of: 7 })
  assert.match(r.testMode.status.message, /^That tap is already taught as hexagon 1\. If you tapped a wrong one earlier, tap Stop, then Teach the taps again\. Hexagon 2 of 7 is lit\. Tap it\.$/, 'the slip names the hexagon and the way out')
  r.tapPanel(PANELS[0]) // even a tap the live game would know goes to the teacher
  await flush(r)
  assert.equal(r.runner.machine.state, 'idle', 'the live game never saw a touch')
  assert.deepEqual(r.testMode.status.teach, { step: 3, of: 7 })
  for (let i = 3; i <= 7; i++) { tap(900 + i); await flush(r) }
  assert.equal(r.testMode.mode, 'idle')
  assert.equal(r.testMode.status.teach, null)
  assert.equal(r.testMode.status.message, 'Taught all 7 hexagons.')
  const want = { 901: 11, [PANELS[0]]: 12, 903: 13, 904: 14, 905: 15, 906: 16, 907: 17 }
  assert.equal(r.saved.length, 1)
  assert.deepEqual(r.saved[0], want, 'saved')
  assert.equal(r.elements.touchMap.get(905), 15, 'and the wall uses it at once')
  assert.deepEqual(r.elements.frames.at(-1)[PANELS[3]], [40, 40, 40], 'the walls are back at rest')
  r.tapPanel(PANELS[1])
  await flush(r)
  assert.equal(r.runner.machine.state, 'reproducing', 'with the test over the live game has the wall again')
})

test('stop ends a teach part way, and nothing of it is kept', { timeout: 5000 }, async () => {
  const r = rig()
  await flush(r)
  r.push('teach')
  await flush(r)
  r.elements.touchListener(901, 0, 901)
  await flush(r)
  r.push('stop')
  await flush(r)
  assert.equal(r.testMode.mode, 'idle')
  assert.equal(r.testMode.status.teach, null)
  assert.equal(r.testMode.status.message, 'Stopped. The walls are resting.')
  assert.equal(r.saved.length, 0)
  assert.equal(r.elements.touchMap.size, 0)
})

test('stop ends a practice round: the walls rest and its runner can no longer reach them', { timeout: 5000 }, async () => {
  const r = rig()
  await flush(r)
  r.push('practice')
  await flush(r)
  r.tapPanel(PANELS[0])
  await flush(r)
  const p = r.practice[0]
  r.push('stop')
  await flush(r)
  assert.equal(r.testMode.mode, 'idle')
  assert.equal(r.testMode.status.practice, null)
  assert.deepEqual(r.elements.frames.at(-1)[PANELS[0]], [40, 40, 40])
  assert.equal(r.deck.lit, false)
  const frames = r.elements.frames.length
  for (const id of p.machine.patterns[0][0]) p.touch(id) // a straggler from the old round
  await flush(r)
  assert.equal(r.elements.frames.length, frames, 'the stopped round is mute')
  r.deck.press('red')
  r.tapPanel(PANELS[2])
  await flush(r)
  assert.equal(r.runner.machine.state, 'reproducing', 'taps go back to the live game')
})

test('teach and practice wait for each other; teach and practice need the white wall', async () => {
  const r = rig()
  await flush(r)
  r.push('practice')
  r.push('teach')
  assert.equal(r.testMode.mode, 'practice')
  assert.match(r.testMode.status.message, /Stop the practice round first/)
  r.push('flash')
  assert.match(r.testMode.status.message, /Stop the test first/)
  const down = rig({ elementsOk: false })
  await flush(down)
  down.push('teach')
  assert.equal(down.testMode.mode, 'idle')
  assert.match(down.testMode.status.message, /white hexagons were not answering/)
  down.push('practice')
  assert.equal(down.practice.length, 0)
})

test('the test steps aside when a group comes due, and a practice round nobody touches ends by itself', async () => {
  const r = rig()
  await flush(r)
  r.push('practice')
  await flush(r)
  r.runner.due('g2') // the server's rotation names the next group
  r.testMode.tick()
  assert.equal(r.testMode.mode, 'idle')
  assert.match(r.testMode.status.message, /group is due/)
  r.runner.due(null) // the round is over: nobody is due at the study
  r.push('practice')
  await flush(r)
  assert.equal(r.testMode.mode, 'practice')
  r.clock.t += 10 * 60_000
  r.testMode.tick()
  assert.equal(r.testMode.mode, 'idle')
  assert.match(r.testMode.status.message, /nobody touched the wall for ten minutes/)
})

test('lastTap: every tap, known or not; a swipe is not a tap, and the page is told so', async () => {
  const r = rig()
  await flush(r)
  assert.equal(r.testMode.status.lastTap, null)
  r.elements.touch(3)
  assert.deepEqual(r.testMode.status.lastTap, { panel: 3, known: true, at: r.clock.t })
  r.clock.t += 1000
  r.elements.touchListener(999, 0, 999)
  assert.deepEqual(r.testMode.status.lastTap, { panel: null, known: false, at: r.clock.t })
  r.clock.t += 1000
  r.elements.touchListener(PANELS[0], 2, PANELS[0])
  assert.equal(r.testMode.status.lastTap.panel, null, 'a swipe leaves the last tap alone')
  assert.match(r.testMode.status.message, /felt a swipe, not a tap/)
  await flush(r)
  // the first tap began a round on the live wall that nobody was due for: a practice round puts it to rest
  assert.notEqual(r.runner.machine.state, 'idle')
  r.push('practice')
  await flush(r)
  assert.equal(r.testMode.mode, 'practice')
  assert.equal(r.runner.machine.state, 'idle', 'the stray round was put back to rest')
  r.tapPanel(PANELS[4])
  assert.equal(r.testMode.status.lastTap.panel, 5, 'in a practice round too')
  r.push('stop')
  await flush(r)
  r.push('teach')
  await flush(r)
  r.clock.t += 3000
  r.elements.touchListener(950, 3, 950)
  assert.equal(r.testMode.status.teach.step, 1, 'a swipe teaches nothing')
  assert.match(r.testMode.status.message, /felt a swipe/, 'and says so while teaching too')
  r.elements.touchListener(950, 0, 950)
  await flush(r)
  assert.equal(r.testMode.status.message, 'Hexagon 2 of 7 is lit. Tap it.')
  r.elements.touchListener(951, 4, 951)
  assert.equal(r.testMode.status.message, 'Hexagon 2 of 7 is lit. Tap it.', 'a second swipe soon after is not said again')
  r.clock.t += 3000
  r.elements.touchListener(951, 4, 951)
  assert.match(r.testMode.status.message, /felt a swipe/)
})

test('the study must be free: no group due, none playing; between groups is not free', async () => {
  const r = rig({ group: 'g1' }) // Act 4: the wall is idle, group g1 is walking in
  await flush(r)
  assert.equal(r.runner.machine.state, 'idle')
  r.push('teach')
  assert.equal(r.testMode.mode, 'idle')
  assert.equal(r.testMode.status.teach, null)
  assert.equal(r.testMode.status.message, 'A group is due at the study. Wait until Act 4 is over, then try again.')
  r.push('practice')
  assert.equal(r.practice.length, 0)
  assert.match(r.testMode.status.message, /group is due/)
  await flush(r)
  r.tapPanel(PANELS[0]) // g1 arrives and begins: their game, untouched
  await flush(r)
  assert.equal(r.runner.machine.state, 'reproducing')
  assert.equal(r.testMode.status.lastTap, null, 'their taps stay theirs')
  assert.equal(r.saved.length, 0, 'nothing taught from their taps')
})

test('the status: at most one call every 400 ms, a heartbeat, and a refused key word said once', async () => {
  const r = rig()
  await r.clock.advance(0)
  assert.equal(r.sends.length, 1, 'sent once the station starts')
  assert.equal(r.sends[0].mode, 'idle')
  assert.deepEqual(r.sends[0].walls, { elements: { ok: true, panels: 7, lights: 7, taught: 7 }, lines: { ok: true, bars: 7 } })
  assert.equal(r.sends[0].deck, 'keyboard')
  for (let i = 1; i <= 5; i++) r.elements.touch(i)
  await r.clock.advance(399)
  assert.equal(r.sends.length, 1, 'a burst waits out the 400 ms')
  await r.clock.advance(1)
  assert.equal(r.sends.length, 2, 'then goes as one call')
  assert.equal(r.sends[1].lastTap.panel, 5, 'with the latest tap')
  await r.clock.advance(5000)
  assert.equal(r.sends.length, 2, 'nothing changed, nothing sent')
  r.testMode.heartbeat()
  await r.clock.advance(0)
  assert.equal(r.sends.length, 3, 'the heartbeat sends anyway')
  assert.equal(r.sends[2].stationAt, r.clock.t)

  // a wrong key word: said once, and tried again on the heartbeat only
  r.answer.fn = async () => { throw Object.assign(new Error('That is not the station key.'), { code: 'functions/permission-denied' }) }
  r.elements.touch(1)
  await r.clock.advance(400)
  assert.equal(r.sends.length, 4)
  r.elements.touch(2); r.elements.touch(3)
  await r.clock.advance(2000)
  assert.equal(r.sends.length, 4, 'changes do not hammer a server that said no')
  r.testMode.heartbeat()
  await r.clock.advance(0)
  assert.equal(r.sends.length, 5)
  assert.equal(r.logs.filter(l => l.includes('Save the study key word (Host tab, The study, or the workshop Study test page)')).length, 1, 'said once')
  r.answer.fn = async () => ({ data: { ok: true } })
  r.testMode.heartbeat()
  await r.clock.advance(HEARTBEAT_MS)
  assert.equal(r.sends.length, 6)
  r.elements.touch(4)
  await r.clock.advance(400)
  assert.equal(r.sends.length, 7, 'back to sending on every change')

  // no network (or no function yet): said once, then tried at most every five seconds
  r.answer.fn = async () => { throw Object.assign(new Error('internal'), { code: 'functions/internal' }) }
  r.elements.touch(5)
  await r.clock.advance(400)
  assert.equal(r.sends.length, 8)
  r.elements.touch(6)
  await r.clock.advance(4000)
  assert.equal(r.sends.length, 8, 'not on every tap')
  await r.clock.advance(1000)
  assert.equal(r.sends.length, 9)
  assert.equal(r.logs.filter(l => l.includes('status not sent')).length, 1)
})

test('the teacher on its own: a stop part way keeps nothing; the file says what it holds', async () => {
  const wall = new FakeWall({ name: 'elements', panelIds: [1, 2, 3], log: () => {} })
  const steps = []
  const teacher = createTeacher({ wall, sleep: () => Promise.resolve(), onStep: (s) => steps.push(s) })
  const done = teacher.run()
  await settle()
  assert.equal(teacher.tap(50), 1)
  await settle()
  assert.equal(teacher.tap(50), 1, 'a slip names the hexagon it was taught for')
  teacher.stop()
  assert.equal(await done, null)
  assert.deepEqual(steps, [{ step: 1, of: 3 }, { step: 2, of: 3 }])
  const file = touchMapFile({ 50: 1 }, new Date('2026-10-24T12:00:00Z'))
  assert.deepEqual(Object.keys(file), ['note', 'taughtAt', 'touches'])
  assert.equal(file.taughtAt, '2026-10-24T12:00:00.000Z')
})
