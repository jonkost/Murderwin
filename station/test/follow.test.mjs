import { test } from 'node:test'
import assert from 'node:assert/strict'
import { FakeWall, FakeDeck } from '../lib/fakes.js'
import { createRunner } from '../lib/runner.js'
import { createFollower } from '../lib/follow.js'
import { DEFAULT_SETTINGS } from '../lib/study.js'

// The station against a fake server with a fake snapshot stream: the server
// owns which group is due, the station never writes it back, and the
// station follows the live night. No hardware, no Firestore, no clue.

const PANELS = [11, 12, 13, 14, 15, 16, 17]

// A stand-in for Firestore: docs by path, listeners by path, and a server
// that answers stationCommand the way functions/lib/station.js does, with
// deal.rotate's one job (moving the pointer) folded in.
function fakeServer({ studyOrder = ['g1', 'g2', 'g3'] } = {}) {
  const docs = new Map()
  const listeners = new Map()
  const finished = new Set()
  const sent = []
  const write = (path, data) => {
    docs.set(path, { ...(docs.get(path) ?? {}), ...data })
    for (const fn of listeners.get(path) ?? []) fn(docs.get(path))
  }
  const watch = (path, onData) => {
    const set = listeners.get(path) ?? new Set()
    set.add(onData); listeners.set(path, set)
    onData(docs.get(path) ?? null)
    return () => set.delete(onData)
  }
  const callStation = async (args) => {
    sent.push(args)
    if (args.command === 'finished') {
      const g = args.payload.groupId
      if (finished.has(g)) return { data: { ok: true, repeated: true, groupId: g, serverTime: Date.now() } }
      finished.add(g)
      // the rotation moves the pointer to the next group in the order (the station's report never does);
      // the answer carries a stale nextGroup on purpose: the station must not use it
      const next = studyOrder[studyOrder.indexOf(g) + 1] ?? null
      write(`nights/${args.nightId}/public/study`, { state: 'idle', groupId: next })
      return { data: { ok: true, dealt: 2, nextGroup: 'stale', groupId: g, serverTime: Date.now() } }
    }
    return { data: { ok: true, serverTime: Date.now() } }
  }
  const count = (path) => (listeners.get(path)?.size ?? 0)
  return { docs, write, watch, callStation, sent, finished, count }
}

function station(server, { gate = {} } = {}) {
  const elements = new FakeWall({ name: 'elements', panelIds: PANELS, log: () => {} })
  const lines = new FakeWall({ name: 'lines', panelIds: [21, 22, 23, 24, 25, 26, 27], log: () => {} })
  const deck = new FakeDeck({ log: () => {} })
  const runner = createRunner({
    elements, lines, deck, panelIds: PANELS, layout: PANELS.map((id, i) => ({ id, x: i * 100, y: 0 })),
    callStation: server.callStation, stationKey: 'k', restMs: 20_000,
    sleep: (ms) => (gate[ms] ? gate[ms] : Promise.resolve()),
  })
  const follower = createFollower({ runner, watch: server.watch })
  return { runner, follower, elements, deck }
}
async function flush(runner) {
  let q
  do { q = runner.settled(); await q } while (q !== runner.settled())
}
async function reproduce(runner) {
  await flush(runner)
  assert.equal(runner.machine.state, 'reproducing')
  const snap = runner.machine.snapshot
  for (const p of runner.machine.patterns[snap.round][snap.pattern]) runner.touch(p)
  await flush(runner)
}
async function enter(runner, pair) {
  runner.key(pair.colour); runner.key(String(pair.number)); runner.key('submit')
  await flush(runner)
}
// Play a whole game through to the last pair. The finish is queued, not flushed.
async function solve(runner) {
  runner.touch(PANELS[0])
  for (let round = 0; round < 3; round++) {
    for (let pat = 0; pat < 3; pat++) await reproduce(runner)
    if (round < 2) await enter(runner, runner.machine.code[round])
  }
  const last = runner.machine.code[2]
  runner.key(last.colour); runner.key(String(last.number)); runner.key('submit')
  assert.equal(runner.machine.state, 'done')
  await new Promise(r => setTimeout(r, 0))
}
const defer = () => { let resolve; const p = new Promise(r => { resolve = r }); p.resolve = resolve; return p }

test('group 1 finishes, the server writes group 2, the re-armed station greets group 2 and its finish is not a repeat', { timeout: 5000 }, async () => {
  const server = fakeServer()
  server.write('public_state/active', { nightId: 'n1' })
  server.write('nights/n1/public/study', { state: 'idle', groupId: 'g1' })
  const rest = defer()
  const { runner, follower } = station(server, { gate: { 20_000: rest } })
  follower.start()
  await flush(runner)
  assert.equal(runner.groupId, 'g1')
  assert.equal(runner.machine.snapshot.groupId, 'g1')
  await solve(runner)
  const first = server.sent.filter(a => a.command === 'finished')
  assert.equal(first.length, 1)
  assert.equal(first[0].payload.groupId, 'g1')
  // the server has moved the pointer while the walls rest; the stale nextGroup in the answer is ignored
  assert.equal(server.docs.get('nights/n1/public/study').groupId, 'g2')
  assert.equal(runner.groupId, 'g2')
  assert.equal(runner.machine.state, 'done', 'the celebration is not cut short')
  rest.resolve()
  await flush(runner)
  assert.equal(runner.machine.state, 'idle')
  assert.equal(runner.machine.snapshot.groupId, 'g2', 'greets group 2, never the stale answer or the finished group')
  // every heartbeat the station sends names the group but the server drops it; no state write carries 'absent'
  const states = server.sent.filter(a => a.command === 'state')
  assert.ok(states.length > 0)
  assert.ok(states.every(a => ['idle', 'playing', 'reproducing', 'entering', 'done'].includes(a.payload.state)))
  // group 2 plays and finishes: the server pays them (not a repeat) and points at group 3
  const rest2 = defer()
  runner.due('g2') // the same snapshot again changes nothing
  await solve(runner)
  const fin = server.sent.filter(a => a.command === 'finished')
  assert.equal(fin.length, 2)
  assert.equal(fin[1].payload.groupId, 'g2')
  assert.ok(server.finished.has('g2'), 'paid, not repeated')
  assert.equal(server.docs.get('nights/n1/public/study').groupId, 'g3')
  rest2.resolve()
  await flush(runner)
  assert.equal(runner.machine.snapshot.groupId, 'g3')
})

test('the station follows the live night: the old study listener is detached, the machine resets, the new night\'s group is adopted', { timeout: 5000 }, async () => {
  const server = fakeServer()
  server.write('public_state/active', { nightId: 'n1' })
  server.write('nights/n1/public/study', { state: 'idle', groupId: 'g1' })
  server.write('nights/n2/public/study', { state: 'idle', groupId: 'g7' })
  const { runner, follower } = station(server)
  follower.start()
  await flush(runner)
  assert.equal(follower.nightId, 'n1')
  assert.equal(follower.studyListeners, 1)
  assert.equal(server.count('nights/n1/public/study'), 1)
  // a game is under way for group 1 when the host starts a new night
  runner.touch(PANELS[0])
  await flush(runner)
  assert.equal(runner.machine.state, 'reproducing')
  server.write('public_state/active', { nightId: 'n2' })
  await flush(runner)
  assert.equal(follower.nightId, 'n2')
  assert.equal(follower.studyListeners, 1, 'one study listener, never two')
  assert.equal(server.count('nights/n1/public/study'), 0, 'the first night is no longer watched')
  assert.equal(server.count('nights/n2/public/study'), 1)
  assert.equal(runner.machine.state, 'idle', 'the old game is dropped')
  assert.equal(runner.groupId, 'g7')
  assert.equal(runner.machine.snapshot.groupId, 'g7')
  // a change on the old night's doc no longer reaches the station
  server.write('nights/n1/public/study', { groupId: 'g2' })
  assert.equal(runner.groupId, 'g7')
  // no live night at all: the station idles with no group
  server.write('public_state/active', { nightId: null })
  await flush(runner)
  assert.equal(follower.studyListeners, 0)
  assert.equal(runner.groupId, null)
  follower.stop()
})

test('settings ride on the study doc: the station takes sane ones and keeps the defaults otherwise', { timeout: 5000 }, async () => {
  const server = fakeServer()
  server.write('public_state/active', { nightId: 'n1' })
  server.write('nights/n1/public/study', { state: 'idle', groupId: 'g1', settings: { capMs: 10 * 60_000, rounds: [{ lengths: [3, 3, 4], onMs: 900, gapMs: 300 }, { lengths: [4, 4, 5], onMs: 700, gapMs: 250 }, { lengths: [5, 5, 6], onMs: 500, gapMs: 200 }], nonsense: 1 } })
  const { runner, follower } = station(server)
  follower.start()
  await flush(runner)
  assert.equal(runner.machine.settings.capMs, 10 * 60_000)
  assert.deepEqual(runner.machine.settings.rounds[2].lengths, [5, 5, 6])
  assert.equal(runner.machine.settings.warnMs, DEFAULT_SETTINGS.warnMs)
  assert.ok(!('nonsense' in runner.machine.settings))
  // bad settings are ignored, and a change while idle rebuilds the machine with the defaults
  server.write('nights/n1/public/study', { settings: { capMs: 5, rounds: [{ lengths: [1, 1, 1] }] } })
  await flush(runner)
  assert.equal(runner.machine.settings.capMs, DEFAULT_SETTINGS.capMs)
  assert.deepEqual(runner.machine.settings.rounds, DEFAULT_SETTINGS.rounds)
})
