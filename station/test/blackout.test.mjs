// A1 (11 Nov 2026): the Study goes dark with the house. Between the blackout's dark and
// power marks (or while the phase is the blackout) both walls and the deck go dark, the
// deck's backlight to nothing, and no touch or key starts anything; at the power they rest.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { FakeWall, FakeDeck } from '../lib/fakes.js'
import { createRunner, DECK_BRIGHTNESS } from '../lib/runner.js'
import { createFollower, darkNow, blackoutStage } from '../lib/follow.js'

const PANELS = [11, 12, 13, 14, 15, 16, 17]
const P = 1_000_000

function rig(clock) {
  const elements = new FakeWall({ name: 'elements', panelIds: PANELS, log: () => {} })
  const lines = new FakeWall({ name: 'lines', panelIds: [21, 22, 23], log: () => {} })
  const deck = new FakeDeck({ log: () => {} })
  deck.levels = []
  deck.brightness = async v => { deck.levels.push(v) }
  const runner = createRunner({
    elements, lines, deck, panelIds: PANELS, layout: PANELS.map((id, i) => ({ id, x: i * 100, y: 0 })),
    callStation: async () => ({ data: { ok: true } }), stationKey: 'k', sleep: () => Promise.resolve(), now: () => clock.t,
  })
  const docs = new Map()
  const listeners = new Map()
  const watch = (path, fn) => { listeners.set(path, fn); fn(docs.get(path) ?? null); return () => listeners.delete(path) }
  const write = (path, data) => { docs.set(path, data); listeners.get(path)?.(data) }
  const timers = []
  const follower = createFollower({ runner, watch, setTimer: (fn, ms) => { timers.push({ fn, at: clock.t + ms }); return timers.length }, clearTimer: () => {} })
  const advance = to => { clock.t = to; for (const t of timers.filter(x => !x.done && x.at <= to)) { t.done = true; t.fn() } }
  return { runner, follower, elements, lines, deck, write, advance }
}
const allDark = frame => Object.values(frame).every(rgb => rgb.every(v => v === 0))
const tick = () => new Promise(r => setTimeout(r, 0))

test('the stages and the dark, by the marks or the phase', () => {
  const m = { pressAt: P, darkAt: P + 2000, powerAt: P + 7000 }
  assert.equal(blackoutStage(m, P + 100), 'press')
  assert.equal(darkNow({ phase: 'act', blackout: m }, P + 100), false)
  assert.equal(darkNow({ phase: 'act', blackout: m }, P + 2000), true)
  assert.equal(darkNow({ phase: 'act', blackout: m }, P + 7000), false)
  assert.equal(darkNow({ phase: 'blackout' }, 0), true)
  assert.equal(darkNow({ phase: 'paused', pausedFrom: 'blackout' }, 0), true)
  assert.equal(darkNow(null, 0), false)
})

test('the Blackout test on the Study: lit at the press, dark at the mark (walls, keys, backlight), touches ignored, back at the power', async () => {
  const clock = { t: P - 10_000 }
  const s = rig(clock)
  s.follower.start()
  s.write('public_state/active', { nightId: 'n1' })
  s.write('nights/n1', { act: 1, phase: 'act' })
  await tick()
  s.write('nights/n1', { act: 1, phase: 'act', blackout: { pressAt: P, darkAt: P + 2000, powerAt: P + 7000, test: true } })
  s.advance(P + 100)
  assert.equal(s.runner.isDark, false, 'the press: the Study waits for the dark')
  s.advance(P + 2001)
  await tick()
  assert.equal(s.runner.isDark, true)
  assert.ok(allDark(s.elements.frames.at(-1)) && allDark(s.lines.frames.at(-1)), 'both walls dark')
  assert.equal(s.deck.paints.at(-1), false, 'the keys dark')
  assert.deepEqual(s.deck.levels, [0], 'the backlight to nothing')
  s.runner.touch(PANELS[0])
  s.runner.key('submit')
  assert.equal(s.runner.machine.state, 'idle', 'a hand on the wall in the dark starts nothing')
  s.advance(P + 7001)
  await tick()
  assert.equal(s.runner.isDark, false, 'the power is back on its own')
  assert.ok(!allDark(s.elements.frames.at(-1)), 'the hexagons at rest again')
  assert.deepEqual(s.deck.levels, [0, DECK_BRIGHTNESS])
  // a touch counts again; on a live night it starts a game only for a group that is due (A8), so one is
  s.runner.touch(PANELS[0])
  assert.equal(s.runner.machine.state, 'idle', 'nobody is due in Act 1, so the wall rests: the Study’s own rule, not the dark')
  s.runner.due('g1', null, P + 15 * 60_000)
  s.runner.touch(PANELS[0])
  assert.notEqual(s.runner.machine.state, 'idle', 'and a touch starts a game again')
})

test('the real blackout\'s phase darkens the Study too, and a new night lets go of the dark', async () => {
  const clock = { t: P }
  const s = rig(clock)
  s.follower.start()
  s.write('public_state/active', { nightId: 'n1' })
  s.write('nights/n1', { act: 1, phase: 'blackout' })
  assert.equal(s.runner.isDark, true)
  s.write('public_state/active', { nightId: 'n2' })
  assert.equal(s.runner.isDark, false)
})
