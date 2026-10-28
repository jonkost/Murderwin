import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { planScenes, emptySceneState, targetFor, momentOf, doorOpen, drawingRunning, sceneProblems, sceneNames, playlistNamesOf, ducksFor, unduckDelayMs, DUCK_TAIL_MS, DRAWING_RUNNING, afterCake, studyWants, speakerWants, cutTriggered } from '../lib/scenes.js'
import { plan, SOUND_IDS, SOUND_STALE_MS } from '../lib/cues.js'
import { demoNight } from '../lib/demo.js'

const SHEET = JSON.parse(readFileSync(new URL('../scenes.json', import.meta.url), 'utf8'))
const night = (act, beat, phase = 'act') => ({ act, beat, phase })

// What the planner does at each moment, as short words: "play jazz",
// "stop", "scene Murderwin Default", "projector on", "cake".
function words(actions) {
  return actions.map(a =>
    a.type === 'scene' ? `scene ${a.name}`
      : a.type === 'projector' ? `projector ${a.do}`
        : a.type === 'cake' ? 'cake'
          : a.type === 'speaker' ? `speaker ${a.name} ${a.do}`
          : a.do === 'pause' ? 'stop' : `play ${a.playlist}`)
}

// Walk a list of [label, docs, expected] through the planner, keeping its
// state, as the relay does; `now` moves on a second a step.
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

test('scenes.json is sound: no problems, the five playlist settings on three Music playlists, the six scenes and the song, named exactly as the cue list has them', () => {
  assert.deepEqual(sceneProblems(SHEET), [])
  assert.deepEqual(Object.keys(SHEET.playlists), ['jazz', 'jazzLow', 'intense35', 'intense60', 'credits'])
  assert.deepEqual(playlistNamesOf(SHEET), ['Murderwin · Jazz', 'Murderwin · Intense', 'Murderwin · Credits'])
  assert.deepEqual(Object.values(SHEET.playlists).map(p => p.volume), [55, 30, 35, 60, 35])
  assert.deepEqual(sceneNames(SHEET).sort(), ['Murderwin Blackout', 'Murderwin Candles', 'Murderwin Default', 'Murderwin Dimmed', 'Murderwin Drawing', 'Murderwin Study Dim'])
  assert.deepEqual(SHEET.cake, { song: 'Happy Birthday for Dogs', volume: 60, hue: 'Murderwin Candles', seconds: 75 })
  assert.deepEqual(SHEET.cut, { acts: [7], beats: ['reveal'], trigger: 'clips' })
  assert.deepEqual(SHEET.study, { acts: [4], playing: 'Murderwin Study Dim', idle: 'Murderwin Default', states: ['playing', 'reproducing', 'entering'] })
  assert.equal(SHEET.offForTheNight, undefined, 'offForTheNight is gone: the cut replaces it')
  for (const a of ['1', '2', '3', '4', '5', '6', '7']) assert.ok(SHEET.acts[a], `act ${a} has its settings`)
  for (const l of [SHEET.phases.blackout, SHEET.phases.prompt, ...Object.values(SHEET.acts)]) assert.ok(['on', 'off'].includes(l.projector), 'every act and phase says where the projector stands')
})

test('the cue sheet (Jon\'s cue list, 25 Oct 2026), moment by moment, on the beat keys of the night', () => {
  const red = { hall: 'red' }
  const green = { hall: 'green' }
  walk([
    ['the lobby: nothing yet', { night: { act: 0, beat: null, phase: 'lobby' } }, []],
    ['cue 1, the welcome: the jazz, Default, the projector on', { night: night(1, 'arrive'), cues: { hall: 'green' } }, ['play jazz', 'scene Murderwin Default', 'projector on']],
    ['Act 1 goes on: no change', { night: night(1, 'meet'), cues: { hall: 'green' } }, []],
    ['cue 2, the house rules: the music stops, the lights dim', { night: night(1, 'rules'), cues: { hall: 'green' } }, ['stop', 'scene Murderwin Dimmed']],
    ['the sound test rings in the rules: no change here', { night: night(1, 'rules'), cues: { hall: 'green' }, sounds: { current: { id: 'chime-phone', at: 1 } } }, []],
    ['cue 3, characters and bags: the jazz and Default again', { night: night(1, 'introduce'), cues: { hall: 'green' } }, ['play jazz', 'scene Murderwin Default']],
    ['', { night: night(1, 'ready'), cues: { hall: 'green' } }, []],
    ['cue 4, the blackout: the music stops, every light off, the projector off', { night: night(1, 'ready', 'blackout'), cues: { hall: 'green' }, sounds: { current: { id: 'blackout', at: 2 } } }, ['stop', 'scene Murderwin Blackout', 'projector off']],
    ['cue 5, the power returns: the jazz, Default, the projector on', { night: night(2, 'orient', 'prompt'), cues: red }, ['play jazz', 'scene Murderwin Default', 'projector on']],
    ['Act 2 orient: no change', { night: night(2, 'orient'), cues: red }, []],
    ['cue 6, bulletin 1 on the TV: the music cuts, the lights dim', { night: night(2, 'news'), cues: red, sounds: { current: { id: 'chime-news', at: 3, video: true } } }, ['stop', 'scene Murderwin Dimmed']],
    ['cue 7, to the investigation: the jazz returns, Default', { night: night(2, 'peek'), cues: red }, ['play jazz', 'scene Murderwin Default']],
    ['the cat visits: no change', { night: night(2, 'cat'), cues: red }, []],
    ['cue 8, supper is served: no change (the chime ducks it)', { night: night(2, 'supper'), cues: red, sounds: { current: { id: 'chime-phone', at: 4 } } }, []],
    ['Act 3, phones down: no change', { night: night(3, 'down'), cues: red }, []],
    ['cue 9, bulletin 2 on the HomePods: no change (the sounder ducks it)', { night: night(3, 'bulletin'), cues: red, sounds: { current: { id: 'sounder-bulletin', at: 5 } } }, []],
    ['cue 10, dinner wrap-up: no change', { night: night(3, 'wrap'), cues: red }, []],
    ['the two-minute warning: the Parlour HomePod leaves the house music for Boo (Jon, 27 Oct 2026)', { night: night(4, 'warn'), cues: red }, ['speaker Living Room off']],
    ['cue 11, Start Act 4: no change (one playlist for the whole house, roomMusic default)', { night: night(4, 'groups'), cues: red }, []],
    ['each round change: no change', { night: night(4, 'round1'), cues: red, study: { state: 'idle' } }, []],
    ['a group at the study wall: the study dims', { night: night(4, 'round1'), cues: red, study: { state: 'playing' } }, ['scene Murderwin Study Dim']],
    ['they go on reproducing: no change', { night: night(4, 'round1'), cues: red, study: { state: 'reproducing' } }, []],
    ['they enter the code: no change', { night: night(4, 'round1'), cues: red, study: { state: 'entering' } }, []],
    ['they are done: the lamp back (Default)', { night: night(4, 'round1'), cues: red, study: { state: 'done' } }, ['scene Murderwin Default']],
    ['the round changes: no change', { night: night(4, 'round2'), cues: red, study: { state: 'idle' } }, []],
    ['the next group plays', { night: night(4, 'round2'), cues: red, study: { state: 'playing' } }, ['scene Murderwin Study Dim']],
    ['', { night: night(4, 'round3'), cues: red, study: { state: 'idle' } }, ['scene Murderwin Default']],
    ['', { night: night(4, 'round4'), cues: red, study: { state: 'idle' } }, []],
    ['', { night: night(4, 'round5'), cues: red, study: { state: 'idle' } }, []],
    ['cue 12, dessert: the Parlour HomePod back in the house music (the chime ducks it)', { night: night(5, 'roam'), cues: red, sounds: { current: { id: 'chime-phone', at: 6 } } }, ['speaker Living Room on']],
    ['cue 13, Cake!: the song and the candles', { night: night(5, 'roam'), cues: { hall: 'red', cake: { at: 1_000_000 + 30_000 } }, sounds: { current: { id: 'chime-phone', at: 6 } } }, ['cake', 'scene Murderwin Candles']],
    ['the same press again: nothing', { night: night(5, 'roam'), cues: { hall: 'red', cake: { at: 1_000_000 + 30_000 } } }, []],
    ['cue 14, Sir Irwin speaks: no change (the chime ducks it)', { night: night(5, 'irwin'), cues: red, sounds: { current: { id: 'chime-irwin', at: 7 } } }, []],
    ['update your motives: no change', { night: night(5, 'update'), cues: red }, []],
    ['cue 15, Act 6 opens: no change (the chime ducks it)', { night: night(6, 'games'), cues: red, sounds: { current: { id: 'chime-phone', at: 8 } } }, []],
    ['cue 16, the drawing intro: the jazz lowers, the lights dim, the projector off', { night: night(6, 'drawing'), cues: red, relay: { state: 'idle', doorOpen: false } }, ['play jazzLow', 'scene Murderwin Dimmed', 'projector off']],
    ['cue 17, the drawing starts: intense at 35, the Drawing scene', { night: night(6, 'drawing'), cues: red, relay: { state: 'intro', doorOpen: false } }, ['play intense35', 'scene Murderwin Drawing']],
    ['the drawing goes on: no change', { night: night(6, 'drawing'), cues: red, relay: { state: 'walk' } }, []],
    ['', { night: night(6, 'drawing'), cues: red, relay: { state: 'turn' } }, []],
    ['', { night: night(6, 'drawing'), cues: red, relay: { state: 'vote' } }, []],
    ['', { night: night(6, 'drawing'), cues: red, relay: { state: 'lockout' } }, []],
    ['cue 18, the door opens: intense up to 60, still dim (the hall bulb turns green)', { night: night(6, 'drawing'), cues: green, relay: { state: 'done', doorOpen: true }, sounds: { current: { id: 'sting-door', at: 9 } } }, ['play intense60']],
    ['the door beat: no change', { night: night(6, 'door'), cues: green, relay: { state: 'done', doorOpen: true } }, []],
    ['the deduction round: no change', { night: night(6, 'eliminate'), cues: green, relay: { state: 'done', doorOpen: true } }, []],
    ['cue 19, the ballot: still intense at 60, back to Default, the projector on', { night: night(7, 'ballot'), cues: green }, ['scene Murderwin Default', 'projector on']],
    ['cue 20, the tally: dim for the Parlour display, the music continues', { night: night(7, 'reveal'), cues: green, sounds: { current: { id: 'sting-reveal', at: 10 } } }, ['scene Murderwin Dimmed']],
    ['cue 21, the first Name press: the newscast on the TV, the music cuts', { night: night(7, 'reveal'), cues: green, sounds: { current: { id: null, at: 11, clips: ['x'], video: true } } }, ['stop']],
    ['the next name: still off', { night: night(7, 'reveal'), cues: green, sounds: { current: { id: null, at: 12, clips: ['y'], video: true } } }, []],
    ['cue 22, everyone\'s result: the credits roll at 35, Default', { night: night(7, 'result'), cues: green, sounds: { current: { id: 'sting-result', at: 13 } } }, ['play credits', 'scene Murderwin Default']],
    ['cue 23, The End: the music off, the lights left, the projector off', { night: night(7, 'end'), cues: green }, ['stop', 'projector off']],
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
    ['Act 6', { night: night(6, 'games') }, ['play jazz', 'scene Murderwin Default', 'projector on']],
    ['the drawing', { night: night(6, 'drawing'), relay: { state: 'turn' } }, ['play intense35', 'scene Murderwin Drawing', 'projector off']],
    ['the hall turns green first: the unlock', { night: night(6, 'drawing'), relay: { state: 'turn' }, cues: { hall: 'green' } }, ['play intense60']],
  ])
})

test('the drawing changes the music only in Act 6: a drawing state left over elsewhere changes nothing', () => {
  walk([
    ['Act 5 with an old drawing state', { night: night(5, 'roam'), relay: { state: 'walk' } }, ['play jazz', 'scene Murderwin Default', 'projector on']],
    ['Act 5 with an old open door', { night: night(5, 'irwin'), relay: { state: 'done', doorOpen: true } }, []],
  ])
  assert.deepEqual(targetFor({ night: night(6, 'drawing', 'blackout'), relay: { state: 'walk' } }, SHEET), { music: 'off', hue: 'Murderwin Blackout', projector: 'off' }, 'the blackout wins anyway')
})

test('a relay started mid-night puts the music, the lights and the projector right once, then waits for the next change', () => {
  const docs = { night: night(3, 'bulletin') }
  const first = planScenes(emptySceneState(), docs, 5000, SHEET)
  assert.deepEqual(words(first.actions), ['play jazz', 'scene Murderwin Default', 'projector on'])
  assert.deepEqual(planScenes(first.state, docs, 6000, SHEET).actions, [], 'the same docs again: nothing')
  assert.deepEqual(planScenes(first.state, { night: night(3, 'down') }, 7000, SHEET).actions, [], 'a beat with the same answer: nothing')
  // started after the first Name press: the cut is already on
  const late = planScenes(emptySceneState(), { night: night(7, 'reveal'), sounds: { current: { id: null, at: 1, clips: ['x'] } } }, 8000, SHEET)
  assert.deepEqual(words(late.actions), ['stop', 'scene Murderwin Dimmed', 'projector on'], 'the newscast has begun: the music stays off')
  assert.equal(late.state.cut, '7/reveal')
  // started during the drawing: the intense music, the Drawing scene, the projector off
  const mid = planScenes(emptySceneState(), { night: night(6, 'drawing'), relay: { state: 'turn' } }, 9000, SHEET)
  assert.deepEqual(words(mid.actions), ['play intense35', 'scene Murderwin Drawing', 'projector off'])
})

test('a paused night counts as the phase it was paused from; no night, or no sheet, does nothing', () => {
  assert.deepEqual(momentOf({ act: 1, beat: 'ready', phase: 'paused', pausedFrom: 'blackout' }), { act: 1, beat: 'ready', phase: 'blackout' })
  assert.deepEqual(momentOf({ act: 2, beat: 'cat', phase: 'paused' }), { act: 2, beat: 'cat', phase: 'act' })
  assert.equal(momentOf(null), null)
  walk([
    ['the blackout', { night: night(1, 'ready', 'blackout') }, ['stop', 'scene Murderwin Blackout', 'projector off']],
    ['paused in the dark: no change', { night: { act: 1, beat: 'ready', phase: 'paused', pausedFrom: 'blackout' } }, []],
    ['resumed: no change', { night: night(1, 'ready', 'blackout') }, []],
  ])
  assert.deepEqual(planScenes(emptySceneState(), {}, 1, SHEET).actions, [])
  assert.deepEqual(planScenes(emptySceneState(), { night: night(1, 'arrive') }, 1, null).actions, [], 'a broken scenes.json: music, scenes and projector off')
  assert.deepEqual(targetFor({}, SHEET), { music: null, hue: null, projector: null })
})

test('the cut: the music goes at the first Name press and stays off for the reveal beat, even if the host steps back; the next beat\'s music applies when the beat changes', () => {
  const newscast = { current: { id: null, at: 1, clips: ['x'], video: true } }
  assert.equal(cutTriggered({ sounds: newscast }, SHEET), true)
  assert.equal(cutTriggered({ sounds: { current: { id: 'sting-reveal', at: 1 } } }, SHEET), false, 'the reveal sting is not the newscast')
  assert.equal(cutTriggered({ sounds: { current: { id: null, at: 1, clips: [] } } }, SHEET), false)
  assert.equal(cutTriggered({}, SHEET), false)
  const s = walk([
    ['the ballot', { night: night(7, 'ballot') }, ['play intense60', 'scene Murderwin Default', 'projector on']],
    ['the reveal: the music carries on, dim', { night: night(7, 'reveal'), sounds: { current: { id: 'sting-reveal', at: 1 } } }, ['scene Murderwin Dimmed']],
    ['the first name: cut', { night: night(7, 'reveal'), sounds: newscast }, ['stop']],
    ['the reveal sting again by some chance: still off', { night: night(7, 'reveal'), sounds: { current: { id: 'sting-reveal', at: 2 } } }, []],
    ['everyone\'s result: the credits', { night: night(7, 'result'), sounds: { current: { id: 'sting-result', at: 3 } } }, ['play credits', 'scene Murderwin Default']],
    ['Back to the reveal: the newscast is the last sound, so the music is cut again', { night: night(7, 'reveal'), sounds: { current: { id: null, at: 4, clips: ['z'] } } }, ['stop', 'scene Murderwin Dimmed']],
    ['Back to the ballot: intense again (the cut is for the reveal beat only)', { night: night(7, 'ballot'), sounds: { current: { id: null, at: 4, clips: ['z'] } } }, ['play intense60', 'scene Murderwin Default']],
  ])
  assert.equal(s.cut, null)
  walk([['a rehearsal jumps back to Act 1: the jazz again (the lights are on Default already)', { night: night(1, 'arrive'), sounds: newscast }, ['play jazz']]], { start: s })
  // the cut is for its act and beat only: the same sound elsewhere changes nothing
  assert.deepEqual(words(planScenes(emptySceneState(), { night: night(6, 'door'), sounds: newscast }, 1, SHEET).actions), ['play intense60', 'scene Murderwin Drawing', 'projector off'])
})

test('the dim study: the playing scene when a group is at the wall in Act 4, the idle scene when it leaves, nothing before the first group, and the lamp back if Act 4 ends mid-game', () => {
  assert.equal(studyWants({ night: night(4, 'round1'), study: { state: 'playing' } }, SHEET), 'playing')
  assert.equal(studyWants({ night: night(4, 'round1'), study: { state: 'done' } }, SHEET), 'idle')
  assert.equal(studyWants({ night: night(2, 'cat'), study: { state: 'playing' } }, SHEET), 'idle', 'not in Act 4')
  assert.equal(studyWants({ night: night(4, 'round1', 'blackout'), study: { state: 'playing' } }, SHEET), 'idle', 'never in the dark')
  assert.equal(studyWants({ night: night(4, 'round1') }, SHEET), 'idle', 'no study doc yet')
  walk([
    ['Act 4 starts, nobody at the wall', { night: night(4, 'groups') }, ['play jazz', 'scene Murderwin Default', 'projector on', 'speaker Living Room off']],
    ['the study doc says idle: nothing', { night: night(4, 'round1'), study: { state: 'idle' } }, []],
    ['a group plays', { night: night(4, 'round1'), study: { state: 'playing' } }, ['scene Murderwin Study Dim']],
    ['the same state again: nothing', { night: night(4, 'round1'), study: { state: 'playing' } }, []],
    ['Act 5 arrives while they are still at it: the lamp back with the act', { night: night(5, 'roam'), study: { state: 'playing' } }, ['scene Murderwin Default', 'speaker Living Room on']],
    ['and no more while the study doc says playing outside Act 4', { night: night(5, 'irwin'), study: { state: 'playing' } }, []],
  ])
})

test('Cake!: once per press while fresh, the song and the candles; after the song the sheet\'s music and scene come back', () => {
  const t = 4_000_000
  let r = planScenes(emptySceneState(), { night: night(5, 'roam') }, t, SHEET)
  assert.deepEqual(words(r.actions), ['play jazz', 'scene Murderwin Default', 'projector on'])
  r = planScenes(r.state, { night: night(5, 'roam'), cues: { cake: { at: t + 10 } } }, t + 10, SHEET)
  assert.deepEqual(r.actions, [
    { type: 'cake', song: 'Happy Birthday for Dogs', volume: 60, seconds: 75, why: 'host' },
    { type: 'scene', name: 'Murderwin Candles', why: 'cake' },
  ])
  assert.equal(r.state.cakeCmd, `cake@${t + 10}`)
  assert.deepEqual(planScenes(r.state, { night: night(5, 'roam'), cues: { cake: { at: t + 10 } } }, t + 11, SHEET).actions, [], 'the same press: nothing')
  // the song ends: the brain forgets the music and the scene, and the sheet puts them back
  const back = planScenes(afterCake(r.state), { night: night(5, 'roam'), cues: { cake: { at: t + 10 } } }, t + 80_000, SHEET)
  assert.deepEqual(words(back.actions), ['play jazz', 'scene Murderwin Default'])
  assert.equal(back.state.cakeCmd, `cake@${t + 10}`, 'the press is still remembered')
  // Next during the song changes nothing in Act 5; a second press starts it again
  const again = planScenes(r.state, { night: night(5, 'irwin'), cues: { cake: { at: t + 20 } } }, t + 20, SHEET)
  assert.deepEqual(words(again.actions), ['cake', 'scene Murderwin Candles'])
  // a relay started long after the press does not replay it; a Firestore Timestamp works
  assert.deepEqual(planScenes(emptySceneState(), { night: night(5, 'roam'), cues: { cake: { at: { toMillis: () => t } } } }, t + SOUND_STALE_MS + 1, SHEET).actions.filter(a => a.type === 'cake'), [])
  assert.equal(planScenes(emptySceneState(), { night: night(5, 'roam'), cues: { cake: { at: { toMillis: () => t } } } }, t + 5, SHEET).actions.filter(a => a.type === 'cake').length, 1)
})

test('the host\'s music buttons: play, pause, next, each once per press, and never an old press', () => {
  const t = 2_000_000
  const base = { night: night(2, 'cat') }
  let r = planScenes(emptySceneState(), base, t, SHEET)
  assert.deepEqual(words(r.actions), ['play jazz', 'scene Murderwin Default', 'projector on'])
  const press = (command, at, now = at) => {
    r = planScenes(r.state, { ...base, cues: { music: { command, at } } }, now, SHEET)
    return words(r.actions)
  }
  assert.deepEqual(press('pause', t + 10), ['stop'])
  assert.deepEqual(press('pause', t + 10), [], 'the same press again: nothing')
  assert.deepEqual(press('play', t + 20), ['play jazz'], 'play carries on with the playlist that was on')
  assert.deepEqual(press('next', t + 30), ['play jazzLow'], 'next: the next of the five settings')
  assert.deepEqual(press('next', t + 40), ['play intense35'])
  assert.deepEqual(press('next', t + 50), ['play intense60'])
  assert.deepEqual(press('next', t + 60), ['play credits'])
  assert.deepEqual(press('next', t + 70), ['play jazz'], 'and round again')
  assert.deepEqual(press('pause', t + 80 - SOUND_STALE_MS, t + 80), [], 'a press older than the stale window is remembered, not obeyed')
  assert.deepEqual(press('shuffle', t + 90), [], 'an unknown command does nothing')
  // the host's choice holds until the sheet next changes
  r = planScenes(r.state, { night: night(2, 'news') }, t + 100, SHEET)
  assert.deepEqual(words(r.actions), ['stop', 'scene Murderwin Dimmed'], 'the sheet changes: its music again')
  // a first press with nothing played yet starts the sheet's playlist, or the first
  const fresh = planScenes(emptySceneState(), { night: night(7, 'end'), cues: { music: { command: 'next', at: t } } }, t, SHEET)
  assert.deepEqual(words(fresh.actions), ['stop', 'projector off', 'play jazz'], 'the host may play music after The End')
})

test('the host\'s scene button: recalled once per press while fresh; the sheet does not undo it until the sheet changes', () => {
  const t = 3_000_000
  let r = planScenes(emptySceneState(), { night: night(2, 'cat') }, t, SHEET)
  r = planScenes(r.state, { night: night(2, 'cat'), cues: { scene: { name: ' Murderwin Dimmed ', at: t + 1 } } }, t + 1, SHEET)
  assert.deepEqual(r.actions, [{ type: 'scene', name: 'Murderwin Dimmed', why: 'host' }])
  r = planScenes(r.state, { night: night(2, 'cat'), cues: { scene: { name: 'Murderwin Dimmed', at: t + 1 } } }, t + 2, SHEET)
  assert.deepEqual(r.actions, [], 'the same press: nothing')
  r = planScenes(r.state, { night: night(2, 'supper'), cues: { scene: { name: 'Murderwin Dimmed', at: t + 1 } } }, t + 3, SHEET)
  assert.deepEqual(words(r.actions), [], 'the next beat with the same answer: the host\'s scene stays')
  r = planScenes(r.state, { night: night(6, 'drawing'), relay: { state: 'intro' }, cues: { scene: { name: 'Murderwin Dimmed', at: t + 1 } } }, t + 4, SHEET)
  assert.deepEqual(words(r.actions), ['play intense35', 'scene Murderwin Drawing', 'projector off'], 'the sheet changes: its scene again')
  const old = planScenes(emptySceneState(), { cues: { scene: { name: 'Murderwin Candles', at: t } } }, t + SOUND_STALE_MS + 1, SHEET)
  assert.deepEqual(old.actions, [], 'a relay started after the press does not replay it')
  for (const name of ['', '   ', 42, 'x'.repeat(65)]) {
    assert.deepEqual(planScenes(emptySceneState(), { cues: { scene: { name, at: t } } }, t, SHEET).actions, [], `refused: ${String(name).length} chars`)
  }
})

test('a broken scenes.json is named in plain words, never with a sound id', () => {
  const broken = structuredClone(SHEET)
  broken.playlists.credits.volume = 140
  broken.acts['3'].music = 'disco'
  broken.acts['2'].beats.news.hue = ''
  broken.acts['1'].projector = 'maybe'
  broken.whisper = -1
  broken.phases.dusk = { music: 'off' }
  broken.cut.trigger = 'nope'
  broken.cut.beats = 'reveal'
  broken.study.playing = ''
  broken.study.states = []
  broken.cake.volume = 'loud'
  broken.cake.seconds = 0
  broken.drawing.acts = 'six'
  broken.offForTheNight = { sound: 'x', acts: [7] }
  delete broken.strings.decor
  const p = sceneProblems(broken)
  for (const want of ['playlists.credits.volume', 'acts.3.music', 'acts.2.beats.news.hue', 'acts.1.projector', 'whisper', 'phases.dusk is not a phase', 'cut.trigger', 'cut.beats', 'study.playing', 'study.states', 'cake.volume', 'cake.seconds', 'drawing.acts', 'offForTheNight is gone', 'strings.decor is missing']) {
    assert.ok(p.some(x => x.includes(want)), want)
  }
  for (const line of p) for (const id of SOUND_IDS) assert.ok(!line.includes(id), 'no sound id in a problem')
  assert.deepEqual(sceneProblems(null), ['it is not a JSON object'])
  assert.ok(sceneProblems({}).includes('playlists is missing'))
  // the optional parts may be left out altogether
  const bare = structuredClone(SHEET)
  delete bare.cut; delete bare.study; delete bare.cake; delete bare.drawing
  assert.deepEqual(sceneProblems(bare), [])
  assert.deepEqual(planScenes(emptySceneState(), { night: night(5, 'roam'), cues: { cake: { at: 1 } }, study: { state: 'playing' } }, 1, bare).actions.filter(a => a.type === 'cake'), [], 'no cake on the sheet: the button does nothing here')
})

test('the music ducks under anything that makes a sound here; the video hold is 0 on the sheet (the sheet stops the music for the news itself)', () => {
  assert.equal(ducksFor({ type: 'sound', id: 'chime-phone' }), true)
  assert.equal(ducksFor({ type: 'sound', id: null, clips: ['woof-close-field-out'] }), true)
  assert.equal(ducksFor({ type: 'sound', id: null, clips: [] }), false, 'nothing to play: no dip')
  assert.equal(ducksFor({ type: 'video', count: 3 }), false, 'the TV plays it: no dip here')
  assert.equal(ducksFor({ type: 'refused', count: 1 }), false)
  assert.equal(unduckDelayMs({ type: 'sound', id: 'chime-phone' }, 0, 5000, SHEET), DUCK_TAIL_MS)
  assert.equal(SHEET.videoHoldSeconds, 0)
  assert.equal(unduckDelayMs({ type: 'sound', id: 'chime-news', video: true }, 1000, 4000, SHEET), DUCK_TAIL_MS, 'no hold: the news beat has the music off anyway')
  const held = { ...SHEET, videoHoldSeconds: 90 }
  assert.equal(unduckDelayMs({ type: 'sound', id: 'chime-news', video: true }, 1000, 4000, held), 90_000 - 3000, 'a hold on the sheet still works')
})

test('the pretend night (npm run demo) walks the whole sheet: every scene, every playlist setting, the projector both ways, the hall off, the cake, the cut', () => {
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
    seen.push(...words(s.actions), ...c.actions.map(a => a.type === 'hall' ? `hall ${a.colour}` : a.type === 'sound' && a.video ? 'video chime' : a.type))
    now += 500
  }
  for (const name of sceneNames(SHEET)) assert.ok(seen.includes(`scene ${name}`), name)
  for (const k of Object.keys(SHEET.playlists)) assert.ok(seen.includes(`play ${k}`), k)
  assert.ok(seen.filter(x => x === 'stop').length >= 5, 'the rules, the blackout, the news, the host, the cut, The End')
  assert.ok(seen.includes('video chime') && seen.includes('video'), 'both kinds of video cue')
  for (const h of ['hall green', 'hall off', 'hall red']) assert.ok(seen.includes(h), h)
  assert.ok(seen.includes('projector on') && seen.includes('projector off'))
  assert.ok(seen.includes('cake'))
  // the demo names no family
  const text = JSON.stringify(demoNight().map(s => s.patch(1)))
  for (const f of ['food', 'bathroom', 'screens', 'out-and-about', 'personal']) assert.ok(!text.includes(f), f)
})

test('Boo\'s speaker (Jon, 27 Oct 2026): the Parlour HomePod leaves the house music in Act 4 and comes back after; nothing before her act; the sheet checks its name', () => {
  assert.deepEqual(SHEET.boo, { acts: [4], speaker: 'Living Room' })
  assert.equal(speakerWants({ night: night(4, 'round1') }, SHEET), 'lent')
  assert.equal(speakerWants({ night: night(3, 'supper') }, SHEET), 'house')
  assert.equal(speakerWants({ night: night(4, 'round1', 'blackout') }, SHEET), 'house', 'never in the dark')
  assert.equal(speakerWants({ night: night(4, 'round1') }, { ...SHEET, boo: undefined }), null, 'no boo on the sheet: nothing')
  walk([
    ['a relay started in Act 3: nothing for the speaker', { night: night(3, 'supper') }, ['play jazz', 'scene Murderwin Default', 'projector on']],
    ['Act 4: out', { night: night(4, 'warn') }, ['speaker Living Room off']],
    ['the rounds: nothing more', { night: night(4, 'round3') }, []],
    ['a pause in Act 4: still out', { night: { act: 4, beat: 'round3', phase: 'paused', pausedFrom: 'act' } }, []],
    ['Act 5: back in', { night: night(5, 'roam') }, ['speaker Living Room on']],
    ['Act 6: nothing more', { night: night(6, 'parlour') }, []],
  ])
  assert.ok(sceneProblems({ ...SHEET, boo: { acts: [4], speaker: '' } }).includes('boo.speaker is not a speaker name'))
  assert.ok(sceneProblems({ ...SHEET, boo: { acts: [9], speaker: 'x' } }).includes('boo.acts is not a list of acts'))
})
