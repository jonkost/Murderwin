// A1 (11 Nov 2026): the brain follows the blackout's marks on its own clock: the music
// stops at the press, the Blackout scene, the hall bulb and the strings go dark at the
// dark mark, and everything comes back at the power's mark. A2: the night's sounds.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { planScenes, emptySceneState, sceneProblems } from '../lib/scenes.js'
import { plan, blackoutStageOf, blackoutMarkTimes, phaseOf, hallColour } from '../lib/cues.js'
import { stringsWanted, OFF, DECOR } from '../lib/strings.js'

const SHEET = JSON.parse(readFileSync(new URL('../scenes.json', import.meta.url), 'utf8'))
const PRESS = 1_000_000
const marks = (test = false) => ({ pressAt: new Date(PRESS), darkAt: new Date(PRESS + 2000), powerAt: new Date(PRESS + 7000), test })
const words = actions => actions.map(a => a.type === 'scene' ? `scene ${a.name}` : a.type === 'projector' ? `projector ${a.do}` : a.do === 'pause' ? (a.again ? 'stop again' : 'stop') : `play ${a.playlist}`)

test('the stages on the brain\'s clock, and the phase they make', () => {
  const n = { act: 1, beat: 'rules', phase: 'act', blackout: marks(true) }
  assert.equal(blackoutStageOf(n, PRESS - 1), null)
  assert.equal(blackoutStageOf(n, PRESS), 'press')
  assert.equal(blackoutStageOf(n, PRESS + 2000), 'dark')
  assert.equal(blackoutStageOf(n, PRESS + 7000), null)
  assert.equal(phaseOf(n, PRESS + 1000), 'act')
  assert.equal(phaseOf(n, PRESS + 3000), 'blackout', 'the test has no phase: the marks make the dark')
  assert.equal(phaseOf(n, PRESS + 8000), 'act')
  assert.deepEqual(blackoutMarkTimes(n), { pressAt: PRESS, darkAt: PRESS + 2000, powerAt: PRESS + 7000 })
  assert.equal(blackoutMarkTimes({ act: 1 }), null)
  assert.equal(hallColour({ night: n, cues: { hall: 'green' } }, PRESS + 3000), 'off')
  assert.equal(hallColour({ night: n, cues: { hall: 'green' } }, PRESS + 8000), 'green')
})

test('the Blackout test, step by step: lit and jazz, the press stops the music, the dark (scene, projector, hall), the power brings it all back', () => {
  let s = emptySceneState()
  const lit = { night: { act: 1, beat: 'arrive', phase: 'act' }, cues: { hall: 'green' } }
  let r = planScenes(s, lit, PRESS - 5000, SHEET); s = r.state
  assert.deepEqual(words(r.actions), ['play jazz', 'scene Murderwin Default', 'projector on'])
  const pressed = { ...lit, night: { ...lit.night, blackout: marks(true) } }
  r = planScenes(s, pressed, PRESS + 20, SHEET); s = r.state
  assert.deepEqual(words(r.actions), ['stop'], 'Press: the music stops at once, nothing else yet')
  r = planScenes(s, pressed, PRESS + 1000, SHEET); s = r.state
  assert.deepEqual(words(r.actions), [], 'nothing new before the dark')
  r = planScenes(s, pressed, PRESS + 2005, SHEET); s = r.state
  assert.deepEqual(words(r.actions), ['stop again', 'scene Murderwin Blackout', 'projector off'], 'Dark: the stop once more, every light off')
  r = planScenes(s, pressed, PRESS + 7005, SHEET); s = r.state
  assert.deepEqual(words(r.actions), ['play jazz', 'scene Murderwin Default', 'projector on'], 'Power: back as it was')
  // the hall bulb, through the cue planner
  let h = { hall: null, sound: null }
  const step = (docs, now) => { const p = plan(h, docs, now); h = p.state; return p.actions.filter(a => a.type === 'hall').map(a => a.colour) }
  assert.deepEqual(step(pressed, PRESS + 20), ['green'])
  assert.deepEqual(step(pressed, PRESS + 2005), ['off'])
  assert.deepEqual(step(pressed, PRESS + 7005), ['green'])
})

test('the real blackout: silent from the press through the dark and the role cards; the jazz when Act 2\'s first beat turns to act', () => {
  let s = emptySceneState()
  const step = (night, now) => { const r = planScenes(s, { night, cues: { hall: 'green' } }, now, SHEET); s = r.state; return words(r.actions) }
  step({ act: 1, beat: 'ready', phase: 'act' }, PRESS - 5000)
  assert.deepEqual(step({ act: 1, beat: 'ready', phase: 'act', blackout: marks() }, PRESS + 10), ['stop'])
  assert.deepEqual(step({ act: 1, beat: 'ready', phase: 'blackout', blackout: marks() }, PRESS + 2010), ['stop again', 'scene Murderwin Blackout', 'projector off'])
  assert.deepEqual(step({ act: 2, beat: 'orient', phase: 'prompt', blackout: null }, PRESS + 7010), ['stop again', 'scene Murderwin Default', 'projector on'], 'no jazz through the role cards')
  assert.deepEqual(step({ act: 2, beat: 'orient', phase: 'act' }, PRESS + 30_000), ['play jazz'])
  assert.deepEqual(sceneProblems(SHEET), [])
})

test('the strings go off in the dark, by the marks or the phase, and back after', () => {
  const salem = { state: 'idle' }
  const n = { act: 1, phase: 'act', blackout: marks(true) }
  assert.equal(stringsWanted(salem, n, PRESS + 1000), DECOR)
  assert.equal(stringsWanted(salem, n, PRESS + 2000), OFF)
  assert.equal(stringsWanted(salem, n, PRESS + 7000), DECOR)
  assert.equal(stringsWanted(salem, { act: 1, phase: 'blackout' }, 0), OFF)
  assert.equal(stringsWanted(salem, null, 0), DECOR)
  const relay = readFileSync(new URL('../cues.mjs', import.meta.url), 'utf8')
  assert.ok(relay.includes('strings.update(stringsWanted(salem, docs.night, now))'))
  assert.ok(relay.includes("off: stringShortcutName('off')"))
  // (and since 12 Nov 2026 at the moments Jon's two blackout Shortcuts are due: test/blackout-shortcuts.test.mjs)
  assert.ok(relay.includes('for (const at of [m.darkAt, m.powerAt, due.darkAt, due.afterAt]) if (at && at > now) marksTimers.push(setTimeout(apply, at - now + 5))'), 'the brain plans again at the dark and at the power')
})
