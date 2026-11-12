// A8 (12 Nov 2026): Check the map, on the workshop's Study test page. The
// wall lights one panel, the page draws the hexagon the station thinks it
// is; three Yeses settle it, a No walks every panel and Jon taps each on the
// drawing.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { FakeWall, FakeDeck } from '../lib/fakes.js'
import { createRunner } from '../lib/runner.js'
import { createTestMode } from '../lib/testmode.js'
import { CHECK_HEXES } from '../lib/hexmap.js'

const PANELS = [11, 12, 13, 14, 15, 16, 17, 18, 19, 20]
const FIT = [9, 8, 7, 6, 5, 4, 3, 2, 1, 0] // a stand-in map, panel i is hexagon FIT[i]

function rig({ group = null } = {}) {
  let t = 5_000_000
  const now = () => t
  const elements = new FakeWall({ name: 'elements', panelIds: PANELS, log: () => {} })
  const lines = new FakeWall({ name: 'lines', panelIds: [21, 22, 23], log: () => {} })
  const deck = new FakeDeck({ log: () => {} })
  const layout = PANELS.map((id, i) => ({ id, x: i * 100, y: 0 }))
  const doc = { data: null, listeners: new Set() }
  const watch = (path, fn) => { doc.listeners.add(fn); fn(doc.data); return () => {} }
  const push = (command, name = null) => {
    const seq = (doc.data?.seq ?? 0) + 1
    doc.data = { seq, queue: [...(doc.data?.queue ?? []), { seq, command, name, at: new Date(t) }] }
    for (const fn of doc.listeners) fn(doc.data)
  }
  const saved = []
  let runner = null
  const testMode = createTestMode({
    elements, lines, deck, panelIds: PANELS, layout, live: () => runner,
    send: async () => ({ data: { ok: true } }), watch, saveHexMap: (h) => saved.push(h),
    sleep: () => Promise.resolve(), now, setTimer: (fn) => { fn(); return 1 },
  })
  runner = createRunner({
    elements: testMode.shield(elements), lines: testMode.shield(lines), deck: testMode.shield(deck),
    panelIds: PANELS, layout, hexes: FIT, callStation: async () => ({ data: { ok: true } }),
    sleep: () => Promise.resolve(), now, restMs: 0,
  })
  runner.night('n1')
  if (group) runner.due(group, null, t + 900_000)
  runner.drain()
  testMode.start()
  const lit = () => PANELS.filter(id => (elements.frames.at(-1)?.[id] ?? [0])[0] === 255)
  return { elements, runner, testMode, push, saved, lit }
}
const settle = () => new Promise(r => setImmediate(r))

test('three Yeses: the first, a middle and the last hexagon, each lit on the wall as drawn', async () => {
  const r = rig()
  r.push('match')
  await settle()
  for (let step = 1; step <= 3; step++) {
    const m = r.testMode.status.match
    assert.equal(r.testMode.mode, 'match')
    assert.deepEqual({ kind: m.kind, step: m.step, of: m.of }, { kind: 'check', step, of: 3 })
    assert.equal(m.hex, CHECK_HEXES[step - 1], 'the drawing lights this hexagon')
    assert.deepEqual(r.lit(), [PANELS[FIT.indexOf(m.hex)]], 'the wall lights the panel the map says is that hexagon, and only it')
    r.push('yes')
    await settle()
  }
  assert.equal(r.testMode.mode, 'idle')
  assert.deepEqual(r.testMode.status.match, { kind: 'check', step: 3, of: 3, hex: null, done: true, ok: true })
  assert.match(r.testMode.status.message, /All three match/)
  assert.equal(r.saved.length, 0, 'nothing to save')
})

test('a No walks every panel; the taps on the drawing become the map, saved, and checked again', async () => {
  const r = rig()
  r.push('match')
  r.push('no')
  await settle()
  const want = [3, 1, 4, 0, 5, 9, 2, 6, 8, 7]
  for (let i = 0; i < PANELS.length; i++) {
    const m = r.testMode.status.match
    assert.deepEqual({ kind: m.kind, step: m.step, of: m.of, hex: m.hex }, { kind: 'remap', step: i + 1, of: 10, hex: null })
    assert.deepEqual(r.lit(), [PANELS[i]], 'one panel at a time, in the station\'s order')
    r.push('hex', String(want[i]))
    await settle()
  }
  assert.deepEqual(r.saved, [want])
  assert.deepEqual(r.runner.hexes, want, 'the screen uses it at once')
  assert.equal(r.testMode.status.match.kind, 'check', 'and the three checks run again')
  assert.deepEqual(r.lit(), [PANELS[want.indexOf(CHECK_HEXES[0])]])
})

test('a hexagon picked twice keeps nothing', async () => {
  const r = rig()
  r.push('match')
  r.push('no')
  for (let i = 0; i < PANELS.length; i++) r.push('hex', '0')
  await settle()
  assert.equal(r.saved.length, 0)
  assert.deepEqual(r.runner.hexes, FIT)
  assert.equal(r.testMode.mode, 'idle')
  assert.match(r.testMode.status.message, /same hexagon/)
})

test('never while a group is due at the study; touches during the check play nothing', async () => {
  const busy = rig({ group: 'g1' })
  busy.push('match')
  await settle()
  assert.equal(busy.testMode.mode, 'idle')
  assert.match(busy.testMode.status.message, /group is due/)
  const r = rig()
  r.push('match')
  await settle()
  r.elements.touch(1)
  assert.equal(r.runner.machine.state, 'idle')
  r.push('stop')
  await settle()
  assert.equal(r.testMode.mode, 'idle')
  assert.equal(r.testMode.status.match, null)
})
