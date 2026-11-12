// The review of 12 Nov 2026, S7: after the blackout (or a Blackout test) the Study's walls come back to the
// soft waiting glow a new machine gives, not the dim rest that looked like a wall left off until Act 4.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { FakeWall, FakeDeck } from '../lib/fakes.js'
import { createRunner, ELEMENTS_WAIT, LINES_WAIT, ELEMENTS_REST, LINES_REST } from '../lib/runner.js'

const PANELS = [11, 12, 13, 14, 15, 16, 17]
const tick = () => new Promise(r => setTimeout(r, 0))
const every = (frame, rgb) => Object.values(frame).every(v => v.every((x, i) => x === rgb[i]))

function rig() {
  const elements = new FakeWall({ name: 'elements', panelIds: PANELS, log: () => {} })
  const lines = new FakeWall({ name: 'lines', panelIds: [21, 22, 23], log: () => {} })
  const deck = new FakeDeck({ log: () => {} })
  deck.brightness = async () => {}
  const runner = createRunner({
    elements, lines, deck, panelIds: PANELS, layout: PANELS.map((id, i) => ({ id, x: i * 100, y: 0 })),
    callStation: async () => ({ data: { ok: true } }), stationKey: 'k', sleep: () => Promise.resolve(), now: () => 1_000_000,
  })
  return { runner, elements, lines }
}

test('S7 the power back with nobody playing: both walls in the waiting glow, as glow() gives', async () => {
  const s = rig()
  assert.equal(s.runner.machine.state, 'idle')
  s.runner.dark(true)
  await tick()
  s.runner.dark(false)
  await tick()
  assert.ok(every(s.elements.frames.at(-1), ELEMENTS_WAIT), 'the hexagons in the waiting glow')
  assert.ok(every(s.lines.frames.at(-1), LINES_WAIT), 'the bars in the waiting glow')
  assert.ok(!every(s.elements.frames.at(-1), ELEMENTS_REST) && !every(s.lines.frames.at(-1), LINES_REST), 'not the dim rest')
  // the same look glow() gives
  const s2 = rig()
  s2.runner.glow()
  await s2.runner.settled()
  await tick()
  assert.deepEqual(s2.elements.frames.at(-1), s.elements.frames.at(-1))
  assert.deepEqual(s2.lines.frames.at(-1), s.lines.frames.at(-1))
})

test('S7 the power back in the middle of a game: the walls rest, the game\'s own look comes next', async () => {
  const s = rig()
  s.runner.touch(PANELS[0]) // no night: a touch starts a game for anyone
  assert.notEqual(s.runner.machine.state, 'idle')
  s.runner.dark(true)
  await tick()
  s.runner.dark(false)
  await tick()
  assert.ok(every(s.elements.frames.at(-1), ELEMENTS_REST), 'a game under way keeps the rest it always had')
})
