import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { planScenes, emptySceneState, targetFor, momentOf, doorOpen, drawingRunning, sceneProblems, sceneNames, ducksFor, unduckDelayMs, DUCK_TAIL_MS, DRAWING_RUNNING } from '../lib/scenes.js'
import { plan, SOUND_IDS, SOUND_STALE_MS } from '../lib/cues.js'
import { demoNight } from '../lib/demo.js'

const SHEET = JSON.parse(readFileSync(new URL('../scenes.json', import.meta.url), 'utf8'))
const night = (act, beat, phase = 'act') => ({ act, beat, phase })

// What the planner does at each moment, as short words: "play arrival",
// "stop", "scene Murderwin Arrival".
function words(actions) {
  return actions.map(a => a.type === 'scene' ? `scene ${a.name}` : a.do === 'pause' ? 'stop' : `play ${a.playlist}`)
}

// Walk a list of [docs, expected] through the planner, keeping its state,
// as the relay does; `now` moves on a second a step.
function walk(steps, { cfg = SHEET, start = emptySceneState(), t0 = 1_000_000 } = {}) {
  let s = start
  let now = t0
  for (const [label, docs, want] of steps) {
    const r = planScenes(s, docs, now, cfg)
    assert.deepEqual(words(r.actions), want, label)
    s = r.state
    now += 1000
  }
  return s
}

test('scenes.json is sound: no problems, the three playlists and the four scenes named exactly as the handoff has them', () => {
  assert.deepEqual(sceneProblems(SHEET), [])
  assert.deepEqual(Object.values(SHEET.playlists).map(p => p.name), ['Murderwin · Arrival', 'Murderwin · Investigation', 'Murderwin · Supper'])
  assert.deepEqual(sceneNames(SHEET).sort(), ['Murderwin Arrival', 'Murderwin Blackout', 'Murderwin Lights Out', 'Murderwin Reveal'])
  assert.ok(SOUND_IDS.includes(SHEET.offForTheNight.sound))
  for (const a of ['1', '2', '3', '4', '5', '6', '7']) assert.ok(SHEET.acts[a], `act ${a} has a music and a scene`)
})

test('the cue sheet (handoff 23 Oct, 2d), moment by moment, on the beat keys of the rebuilt night', () => {
  const red = { hall: 'red' }
  walk([
    ['the lobby: nothing yet', { night: { act: 0, beat: null, phase: 'lobby' } }, []],
    ['start the night: Arrival, and the Arrival scene', { night: night(1, 'arrive'), cues: red }, ['play arrival', 'scene Murderwin Arrival']],
    ['Act 1 goes on: no change', { night: night(1, 'meet'), cues: red }, []],
    ['', { night: night(1, 'introduce'), cues: red }, []],
    ['', { night: night(1, 'ready'), cues: red }, []],
    ['the blackout: the music stops, every Hue light off', { night: night(1, 'ready', 'blackout'), cues: red }, ['stop', 'scene Murderwin Blackout']],
    ['the power returns: Investigation, Lights Out', { night: night(2, 'orient', 'prompt'), cues: red }, ['play investigation', 'scene Murderwin Lights Out']],
    ['Act 2 orient: no change', { night: night(2, 'orient'), cues: red }, []],
    ['the news flash: no change (the chime ducks it)', { night: night(2, 'news'), cues: red }, []],
    ['', { night: night(2, 'peek'), cues: red }, []],
    ['the cat visits: no change', { night: night(2, 'cat'), cues: red }, []],
    ['supper is served: the Supper playlist', { night: night(2, 'supper'), cues: red }, ['play supper']],
    ['Act 3: still Supper', { night: night(3, 'down'), cues: red }, []],
    ['bulletin 2: no change (the sounder ducks it)', { night: night(3, 'bulletin'), cues: red }, []],
    ['the two-minute warning: still at supper', { night: night(4, 'warn'), cues: red }, []],
    ['Start Act 4: Investigation', { night: night(4, 'groups'), cues: red }, ['play investigation']],
    ['each round change: no change', { night: night(4, 'round1'), cues: red }, []],
    ['', { night: night(4, 'round2'), cues: red }, []],
    ['', { night: night(4, 'round3'), cues: red }, []],
    ['', { night: night(4, 'round4'), cues: red }, []],
    ['', { night: night(4, 'round5'), cues: red }, []],
    ['Act 5: Arrival, and the Arrival scene', { night: night(5, 'roam'), cues: red }, ['play arrival', 'scene Murderwin Arrival']],
    ['Sir Irwin speaks: no change (the chime ducks it)', { night: night(5, 'irwin'), cues: red }, []],
    ['Act 6 opens: Investigation, Lights Out', { night: night(6, 'games'), cues: red }, ['play investigation', 'scene Murderwin Lights Out']],
    ['the drawing beat, before the slides: no change', { night: night(6, 'drawing'), cues: red, relay: { state: 'idle', doorOpen: false } }, []],
    ['the drawing starts: the music stops', { night: night(6, 'drawing'), cues: red, relay: { state: 'intro', doorOpen: false } }, ['stop']],
    ['the drawing goes on: still stopped', { night: night(6, 'drawing'), cues: red, relay: { state: 'walk' } }, []],
    ['', { night: night(6, 'drawing'), cues: red, relay: { state: 'turn' } }, []],
    ['', { night: night(6, 'drawing'), cues: red, relay: { state: 'vote' } }, []],
    ['', { night: night(6, 'drawing'), cues: red, relay: { state: 'lockout' } }, []],
    ['the door opens: Investigation resumes', { night: night(6, 'drawing'), cues: { hall: 'green' }, relay: { state: 'done', doorOpen: true } }, ['play investigation']],
    ['the door beat: no change', { night: night(6, 'door'), cues: { hall: 'green' }, relay: { state: 'done', doorOpen: true } }, []],
    ['', { night: night(6, 'eliminate'), cues: { hall: 'green' }, relay: { state: 'done', doorOpen: true } }, []],
    ['the ballot: no change', { night: night(7, 'ballot'), cues: { hall: 'green' } }, []],
    ['the reveal: the music off for the night, the Reveal scene', { night: night(7, 'reveal'), cues: { hall: 'green' }, sounds: { current: { id: 'sting-reveal', at: 1 } } }, ['stop', 'scene Murderwin Reveal']],
    ['everyone\'s result: off, no change', { night: night(7, 'result'), cues: { hall: 'green' }, sounds: { current: { id: 'sting-result', at: 2 } } }, []],
  ])
})

test('the door counts as open when the hall is green, even before the relay doc says so', () => {
  assert.equal(doorOpen({ cues: { hall: 'green' } }), true)
  assert.equal(doorOpen({ relay: { doorOpen: true } }), true)
  assert.equal(doorOpen({ cues: { hall: 'red' }, relay: { doorOpen: false } }), false)
  assert.equal(drawingRunning({ relay: { state: 'vote' }, cues: { hall: 'green' } }), false)
  for (const s of DRAWING_RUNNING) assert.equal(drawingRunning({ relay: { state: s } }), true, s)
  for (const s of ['idle', 'done', undefined]) assert.equal(drawingRunning({ relay: { state: s } }), false, String(s))
  walk([
    ['Act 6', { night: night(6, 'games') }, ['play investigation', 'scene Murderwin Lights Out']],
    ['the drawing', { night: night(6, 'drawing'), relay: { state: 'turn' } }, ['stop']],
    ['the hall turns green first', { night: night(6, 'drawing'), relay: { state: 'turn' }, cues: { hall: 'green' } }, ['play investigation']],
  ])
})

test('the drawing stops the music only in Act 6: a drawing state left over elsewhere changes nothing', () => {
  walk([
    ['Act 5 with an old drawing state', { night: night(5, 'roam'), relay: { state: 'walk' } }, ['play arrival', 'scene Murderwin Arrival']],
  ])
  assert.equal(targetFor({ night: night(6, 'drawing', 'blackout'), relay: { state: 'walk' } }, SHEET).music, 'off', 'the blackout wins anyway')
})

test('a relay started mid-night puts the music and the lights right once, then waits for the next change', () => {
  const docs = { night: night(3, 'bulletin') }
  const first = planScenes(emptySceneState(), docs, 5000, SHEET)
  assert.deepEqual(words(first.actions), ['play supper', 'scene Murderwin Lights Out'])
  assert.deepEqual(planScenes(first.state, docs, 6000, SHEET).actions, [], 'the same docs again: nothing')
  assert.deepEqual(planScenes(first.state, { night: night(3, 'down') }, 7000, SHEET).actions, [], 'a beat with the same answer: nothing')
})

test('a paused night counts as the phase it was paused from; no night, or no sheet, does nothing', () => {
  assert.deepEqual(momentOf({ act: 1, beat: 'ready', phase: 'paused', pausedFrom: 'blackout' }), { act: 1, beat: 'ready', phase: 'blackout' })
  assert.deepEqual(momentOf({ act: 2, beat: 'cat', phase: 'paused' }), { act: 2, beat: 'cat', phase: 'act' })
  assert.equal(momentOf(null), null)
  walk([
    ['the blackout', { night: night(1, 'ready', 'blackout') }, ['stop', 'scene Murderwin Blackout']],
    ['paused in the dark: no change', { night: { act: 1, beat: 'ready', phase: 'paused', pausedFrom: 'blackout' } }, []],
    ['resumed: no change', { night: night(1, 'ready', 'blackout') }, []],
  ])
  assert.deepEqual(planScenes(emptySceneState(), {}, 1, SHEET).actions, [])
  assert.deepEqual(planScenes(emptySceneState(), { night: night(1, 'arrive') }, 1, null).actions, [], 'a broken scenes.json: music and scenes off')
  assert.deepEqual(targetFor({}, SHEET), { music: null, hue: null })
})

test('after the reveal sting the music stays off through Act 7 even if the host steps back, and comes back if the night goes back before Act 7', () => {
  const s = walk([
    ['the ballot', { night: night(7, 'ballot') }, ['play investigation', 'scene Murderwin Lights Out']],
    ['the reveal', { night: night(7, 'reveal'), sounds: { current: { id: 'sting-reveal', at: 1 } } }, ['stop', 'scene Murderwin Reveal']],
    ['Back to the ballot by mistake: the music stays off', { night: night(7, 'ballot'), sounds: { current: { id: 'sting-reveal', at: 1 } } }, ['scene Murderwin Lights Out']],
    ['a later sound in Act 7 keeps it off', { night: night(7, 'ballot'), sounds: { current: { id: null, at: 3, clips: ['x'] } } }, []],
  ])
  assert.equal(s.over, true)
  walk([['a rehearsal jumps back to Act 1: Arrival again', { night: night(1, 'arrive'), sounds: { current: { id: 'sting-reveal', at: 1 } } }, ['play arrival', 'scene Murderwin Arrival']]], { start: s })
})

test('the host\'s music buttons: play, pause, next, each once per press, and never an old press', () => {
  const t = 2_000_000
  const base = { night: night(2, 'cat') }
  let r = planScenes(emptySceneState(), base, t, SHEET)
  assert.deepEqual(words(r.actions), ['play investigation', 'scene Murderwin Lights Out'])
  const press = (command, at, now = at) => {
    r = planScenes(r.state, { ...base, cues: { music: { command, at } } }, now, SHEET)
    return words(r.actions)
  }
  assert.deepEqual(press('pause', t + 10), ['stop'])
  assert.deepEqual(press('pause', t + 10), [], 'the same press again: nothing')
  assert.deepEqual(press('play', t + 20), ['play investigation'], 'play carries on with the playlist that was on')
  assert.deepEqual(press('next', t + 30), ['play supper'], 'next: the next of the three')
  assert.deepEqual(press('next', t + 40), ['play arrival'], 'and round again')
  assert.deepEqual(press('next', t + 50), ['play investigation'])
  assert.deepEqual(press('pause', t + 60 - SOUND_STALE_MS, t + 60), [], 'a press older than the stale window is remembered, not obeyed')
  assert.deepEqual(press('shuffle', t + 70), [], 'an unknown command does nothing')
  // the host's choice holds until the sheet next changes
  r = planScenes(r.state, { night: night(2, 'supper') }, t + 80, SHEET)
  assert.deepEqual(words(r.actions), ['play supper'], 'the sheet changes: its music again')
  // a first press with nothing played yet starts the sheet's playlist, or the first
  const fresh = planScenes(emptySceneState(), { night: night(7, 'reveal'), cues: { music: { command: 'next', at: t } } }, t, SHEET)
  assert.deepEqual(words(fresh.actions), ['stop', 'scene Murderwin Reveal', 'play arrival'], 'the host may play music after the reveal')
})

test('the host\'s scene button: recalled once per press while fresh; the sheet does not undo it until the sheet changes', () => {
  const t = 3_000_000
  let r = planScenes(emptySceneState(), { night: night(2, 'cat') }, t, SHEET)
  r = planScenes(r.state, { night: night(2, 'cat'), cues: { scene: { name: ' Murderwin Arrival ', at: t + 1 } } }, t + 1, SHEET)
  assert.deepEqual(r.actions, [{ type: 'scene', name: 'Murderwin Arrival', why: 'host' }])
  r = planScenes(r.state, { night: night(2, 'cat'), cues: { scene: { name: 'Murderwin Arrival', at: t + 1 } } }, t + 2, SHEET)
  assert.deepEqual(r.actions, [], 'the same press: nothing')
  r = planScenes(r.state, { night: night(2, 'supper'), cues: { scene: { name: 'Murderwin Arrival', at: t + 1 } } }, t + 3, SHEET)
  assert.deepEqual(words(r.actions), ['play supper'], 'the next beat with the same scene: the host\'s scene stays')
  r = planScenes(r.state, { night: night(5, 'roam'), cues: { scene: { name: 'Murderwin Arrival', at: t + 1 } } }, t + 4, SHEET)
  assert.deepEqual(words(r.actions), ['play arrival', 'scene Murderwin Arrival'], 'the sheet changes: its scene again')
  const old = planScenes(emptySceneState(), { cues: { scene: { name: 'Murderwin Reveal', at: t } } }, t + SOUND_STALE_MS + 1, SHEET)
  assert.deepEqual(old.actions, [], 'a relay started after the press does not replay it')
  for (const name of ['', '   ', 42, 'x'.repeat(65)]) {
    assert.deepEqual(planScenes(emptySceneState(), { cues: { scene: { name, at: t } } }, t, SHEET).actions, [], `refused: ${String(name).length} chars`)
  }
})

test('a broken scenes.json is named in plain words, never with a sound id', () => {
  const broken = structuredClone(SHEET)
  broken.playlists.supper.volume = 140
  broken.acts['3'].music = 'disco'
  broken.acts['2'].beats.supper.hue = ''
  broken.whisper = -1
  broken.phases.dusk = { music: 'off' }
  broken.offForTheNight.sound = 'nope'
  delete broken.strings.decor
  const p = sceneProblems(broken)
  for (const want of ['playlists.supper.volume', 'acts.3.music', 'acts.2.beats.supper.hue', 'whisper', 'phases.dusk is not a phase', 'offForTheNight.sound', 'strings.decor is missing']) {
    assert.ok(p.some(x => x.includes(want)), want)
  }
  for (const line of p) for (const id of SOUND_IDS) assert.ok(!line.includes(id), 'no sound id in a problem')
  assert.deepEqual(sceneProblems(null), ['it is not a JSON object'])
  assert.ok(sceneProblems({}).includes('playlists is missing'))
})

test('the music ducks under anything that makes a sound here, and stays down for a bulletin the TV plays as video', () => {
  assert.equal(ducksFor({ type: 'sound', id: 'chime-phone' }), true)
  assert.equal(ducksFor({ type: 'sound', id: null, clips: ['woof-close-field-out'] }), true)
  assert.equal(ducksFor({ type: 'sound', id: null, clips: [] }), false, 'nothing to play: no dip')
  assert.equal(ducksFor({ type: 'video', count: 3 }), false, 'the TV plays it: no dip here')
  assert.equal(ducksFor({ type: 'refused', count: 1 }), false)
  assert.equal(unduckDelayMs({ type: 'sound', id: 'chime-phone' }, 0, 5000, SHEET), DUCK_TAIL_MS)
  const hold = SHEET.videoHoldSeconds * 1000
  assert.equal(unduckDelayMs({ type: 'sound', id: 'chime-news', video: true }, 1000, 4000, SHEET), hold - 3000, 'until the video has had time to play')
  assert.equal(unduckDelayMs({ type: 'sound', id: 'chime-news', video: true }, 0, hold + 10, SHEET), DUCK_TAIL_MS)
})

test('the pretend night (npm run demo) walks the whole sheet: every scene, every playlist, the drawing stop, the door, the reveal', () => {
  let cueState = { hall: null, sound: null }
  let sceneState = emptySceneState()
  let docs = {}
  const seen = []
  let now = 10_000_000
  for (const step of demoNight()) {
    docs = { ...docs, ...step.patch(now) }
    const c = plan(cueState, docs, now)
    cueState = c.state
    const s = planScenes(sceneState, docs, now, SHEET)
    sceneState = s.state
    seen.push(...words(s.actions), ...c.actions.map(a => a.type === 'sound' && a.video ? 'video chime' : a.type))
    now += 500
  }
  for (const name of sceneNames(SHEET)) assert.ok(seen.includes(`scene ${name}`), name)
  for (const k of Object.keys(SHEET.playlists)) assert.ok(seen.includes(`play ${k}`), k)
  assert.ok(seen.filter(x => x === 'stop').length >= 3, 'the blackout, the drawing, the reveal')
  assert.ok(seen.includes('video chime') && seen.includes('video'), 'both kinds of video cue')
  assert.ok(seen.includes('hall'))
  // the demo names no family
  const text = JSON.stringify(demoNight().map(s => s.patch(1)))
  for (const f of ['food', 'bathroom', 'screens', 'out-and-about', 'personal']) assert.ok(!text.includes(f), f)
})
