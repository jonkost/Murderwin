// A8 (12 Nov 2026), the Study: lit until the first touch, a game only on a
// group's turn, Granolia's map sent with the state.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { Nanoleaf } from '../lib/nanoleaf.js'
import { FakeWall, FakeDeck } from '../lib/fakes.js'
import { createRunner, ELEMENTS_REST, ELEMENTS_WAIT, LINES_WAIT, ELEMENTS_WAIT_LOW } from '../lib/runner.js'

const PANELS = [11, 12, 13, 14, 15, 16, 17]

function station({ callStation = null, breathes = true } = {}) {
  const elements = new FakeWall({ name: 'elements', panelIds: PANELS, log: () => {} })
  const lines = new FakeWall({ name: 'lines', panelIds: [21, 22, 23, 24, 25], log: () => {} })
  if (!breathes) { elements.breathe = async () => { throw new Error('no custom effects') } }
  const deck = new FakeDeck({ log: () => {} })
  const calls = []
  let t = 1_000_000
  const runner = createRunner({
    elements, lines, deck, panelIds: PANELS, layout: PANELS.map((id, i) => ({ id, x: i * 100, y: 0 })),
    hexes: [6, 5, 4, 3, 2, 1, 0],
    callStation: callStation ?? (async (a) => { calls.push(a); return { data: { ok: true, serverTime: t } } }),
    sleep: () => Promise.resolve(), now: () => t, restMs: 0,
  })
  const tick = (ms) => { t += ms; runner.tick() }
  return { elements, lines, deck, runner, calls, tick, now: () => t }
}
const settle = async (r) => { for (let i = 0; i < 20; i++) { await r.runner.settled(); await new Promise(res => setImmediate(res)) } }
const all = (rgb) => Object.fromEntries(PANELS.map(id => [id, rgb]))

test('the walls glow while the room waits, and breathe when the wall takes it', async () => {
  const r = station()
  r.runner.drain()
  await settle(r)
  assert.deepEqual(r.elements.frames.at(-1), all(ELEMENTS_WAIT), 'the hexagons are lit, not the game\'s dim')
  assert.ok(ELEMENTS_WAIT[0] > ELEMENTS_REST[0])
  assert.equal(r.elements.breaths.length, 1)
  assert.deepEqual(r.elements.breaths[0].low, all(ELEMENTS_WAIT_LOW))
  assert.deepEqual(r.lines.frames.at(-1)[21], LINES_WAIT, 'the bars a warm white')
})

test('a wall that will not breathe glows still', async () => {
  const r = station({ breathes: false })
  r.runner.drain()
  await settle(r)
  assert.deepEqual(r.elements.frames.at(-1), all(ELEMENTS_WAIT))
})

test('on a live night the wall starts only on a group\'s turn, and only once for it', async () => {
  const r = station()
  r.runner.night('n1')
  await settle(r)
  r.runner.touch(PANELS[0])
  await settle(r)
  assert.equal(r.runner.machine.state, 'idle', 'nobody due: a touch on the way past starts nothing')
  r.runner.key('submit')
  assert.equal(r.runner.closed, true)
  r.runner.due('g1', null, r.now() + 15 * 60_000)
  assert.equal(r.runner.closed, false)
  await settle(r)
  const before = r.elements.frames.length
  r.runner.touch(PANELS[0])
  await settle(r)
  assert.notEqual(r.runner.machine.state, 'idle', 'the group due starts it')
  assert.deepEqual(r.elements.frames[before], all(ELEMENTS_REST), 'the first touch drops the hexagons to the game\'s dim at once')
  r.runner.machine.stop(r.now())
  r.runner.drain()
  await settle(r)
  const fin = r.calls.filter(c => c.command === 'finished')
  assert.equal(fin.length, 1)
  assert.equal(fin[0].payload.groupId, 'g1')
  assert.equal(r.runner.machine.state, 'idle')
  assert.deepEqual(r.elements.frames.at(-1), all(ELEMENTS_WAIT), 'lit again for whoever comes next')
  r.runner.touch(PANELS[1])
  await settle(r)
  assert.equal(r.runner.machine.state, 'idle', 'the group that has played cannot start a second game')
  r.runner.due('g2', null, r.now() + 30 * 60_000)
  r.runner.touch(PANELS[1])
  await settle(r)
  assert.notEqual(r.runner.machine.state, 'idle', 'the next group can')
})

test('with no night (fake mode, the study test) the wall plays for anyone, as before', async () => {
  const r = station()
  r.runner.touch(PANELS[0])
  await settle(r)
  assert.notEqual(r.runner.machine.state, 'idle')
})

test('a report the server refuses is not sent again every second', async () => {
  let n = 0
  const r = station({
    callStation: async (a) => {
      if (a.command === 'finished') { n++; const e = new Error('Which group?'); e.code = 'functions/invalid-argument'; throw e }
      return { data: { ok: true } }
    },
  })
  r.runner.night('n1')
  r.runner.due('g1', null, r.now() + 15 * 60_000)
  r.runner.touch(PANELS[0])
  await settle(r)
  r.runner.machine.stop(r.now())
  r.runner.drain()
  await settle(r)
  for (let i = 0; i < 5; i++) r.tick(1000)
  await settle(r)
  assert.equal(n, 1)
})

test('the state carries the map from panels to drawn hexagons, and a new map goes at once', async () => {
  const states = []
  const r = station({ callStation: async (a) => { if (a.command === 'state') states.push(a.payload); return { data: { ok: true } } } })
  r.runner.night('n1')
  await settle(r)
  assert.deepEqual(states.at(-1).hexes, [6, 5, 4, 3, 2, 1, 0])
  r.runner.setHexes([0, 1, 2, 3, 4, 5, 6])
  assert.deepEqual(states.at(-1).hexes, [0, 1, 2, 3, 4, 5, 6])
})

test('Nanoleaf.breathe: one looping frame, two steps a piece', async () => {
  const calls = []
  const fetchImpl = async (url, opts = {}) => { calls.push({ url, opts }); return { ok: true, status: 204, text: async () => '' } }
  const wall = new Nanoleaf({ host: '10.0.0.5', token: 'tok', fetchImpl })
  wall.panels = [{ id: 1 }, { id: 2 }]
  await wall.breathe({ 1: [10, 10, 10], 2: [20, 20, 20] }, { 1: [100, 100, 100], 2: [200, 200, 200] }, 25)
  const body = JSON.parse(calls.at(-1).opts.body)
  assert.equal(body.write.animType, 'custom')
  assert.equal(body.write.loop, true)
  assert.equal(body.write.animData, '2 1 2 100 100 100 0 25 10 10 10 0 25 2 2 200 200 200 0 25 20 20 20 0 25')
})
