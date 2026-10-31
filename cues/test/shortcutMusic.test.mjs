import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createShortcutMusic, shortcutsFor, musicShortcutProblems, SEQUENCE_WAIT_MS } from '../lib/shortcutMusic.js'
import { createShortcutRunner } from '../lib/strings.js'
import { sceneProblems, planScenes, emptySceneState } from '../lib/scenes.js'

// The music through Apple Home (31 Oct 2026, Jon's formal rundown): one
// Shortcut per music setting, run by the brain in place of the Music app.

const SHEET = JSON.parse(readFileSync(new URL('../scenes.json', import.meta.url), 'utf8'))
const settle = () => new Promise(r => setImmediate(r))

test('the sheet names the seven Shortcuts from the rundown, by the playlist keys, and the stop; Act 4 runs the house jazz first, then the two rooms', () => {
  assert.deepEqual(SHEET.musicShortcuts, {
    jazz: 'Default Jazz',
    jazzLow: 'Default Jazz 20%',
    act4: ['Default Jazz', 'Lightbulb Moment Music', 'Get Off My Grass Game Music'],
    intense35: 'Intense Music 35%',
    intense60: 'Intense Music 60%',
    credits: 'Credit Roll Music',
    off: 'Stop Music',
  })
  assert.deepEqual(sceneProblems(SHEET), [])
  assert.equal(SHEET.acts['4'].music, 'act4', 'Act 4 is its own setting (cue 11: the Study and the Orangerie play their own music)')
  assert.deepEqual(SHEET.playlists.act4, { name: 'Murderwin · Jazz', volume: 55 }, 'on the Music app road it is the jazz')
  assert.equal(SHEET.playlists.jazzLow.volume, 20, 'the rundown\'s 20%')
  assert.deepEqual(shortcutsFor(SHEET.musicShortcuts, 'act4'), ['Default Jazz', 'Lightbulb Moment Music', 'Get Off My Grass Game Music'])
  assert.deepEqual(shortcutsFor(SHEET.musicShortcuts, 'jazz'), ['Default Jazz'])
  assert.deepEqual(shortcutsFor(SHEET.musicShortcuts, 'nope'), [])
  assert.deepEqual(shortcutsFor(null, 'jazz'), [])
  // every key the sheet's moments use has a Shortcut
  const used = new Set()
  const add = l => { if (typeof l?.music === 'string' && l.music !== 'off') used.add(l.music) }
  for (const p of Object.values(SHEET.phases)) add(p)
  for (const a of Object.values(SHEET.acts)) { add(a); for (const b of Object.values(a.beats ?? {})) add(b) }
  add(SHEET.drawing); add(SHEET.drawing.unlocked)
  for (const k of used) assert.ok(shortcutsFor(SHEET.musicShortcuts, k).length, `${k} has a Shortcut`)
  // the problems, in plain words
  assert.deepEqual(musicShortcutProblems({ playlists: SHEET.playlists, musicShortcuts: { jazz: 'Default Jazz', nope: 'X', off: [] } }), ['musicShortcuts.nope is not a playlist key or "off"', 'musicShortcuts.off is not a Shortcut name or a list of them'])
  assert.deepEqual(musicShortcutProblems({ playlists: SHEET.playlists, musicShortcuts: ['x'] }), ['musicShortcuts is not an object of playlist keys'])
  assert.deepEqual(musicShortcutProblems({ playlists: SHEET.playlists }), [], 'no table: the Music app road, nothing to check')
})

test('play runs the setting\'s Shortcut(s) in order; pause runs the stop and pauses the Music app too; duck, unduck and the speaker do nothing', async () => {
  const ran = []
  const logs = []
  const runner = createShortcutRunner({ tag: 'music', run: async name => { ran.push(name) }, wait: async () => {}, log: l => logs.push(l) })
  const app = { paused: 0, play: async () => { throw new Error('the Music app should not play') }, pause: async () => { app.paused++ }, playTrack: async () => 'playing', nowPlaying: async () => ({ playing: true }), speakers: async () => [{ name: 'Living Room', on: true }] }
  const m = createShortcutMusic({ names: SHEET.musicShortcuts, runner, fallback: app, log: l => logs.push(l) })
  await m.play({ playlist: 'jazz', name: 'Murderwin · Jazz', volume: 55 })
  await m.play({ playlist: 'act4', name: 'Murderwin · Jazz', volume: 55 })
  assert.deepEqual(ran, ['Default Jazz', 'Default Jazz', 'Lightbulb Moment Music', 'Get Off My Grass Game Music'])
  assert.deepEqual(logs, ['[music] Default Jazz', '[music] Default Jazz, then Lightbulb Moment Music, then Get Off My Grass Game Music'])
  await m.duck(); await m.unduck(); await m.speaker({ name: 'Living Room', on: false })
  assert.equal(ran.length, 4, 'nothing more ran')
  await m.pause()
  assert.equal(ran.at(-1), 'Stop Music')
  assert.equal(app.paused, 1, 'the Music app paused too, in case the cake song was on')
  assert.equal(await m.playTrack({ name: 'Happy Birthday for Dogs', volume: 60 }), 'playing', 'the cake song is the Music app\'s')
  assert.deepEqual(await m.nowPlaying(), { playing: true })
  assert.equal((await m.speakers())[0].name, 'Living Room')
  assert.equal(m.road, 'shortcuts')
  await m.idle()
})

test('a setting with no Shortcut falls back to the Music app with one line; a Shortcut not on this Mac is one line; no stop named is one line', async () => {
  const logs = []
  const ran = []
  // the head start never passes here, so a failing run is the real, early kind (a missing Shortcut reports in 70 ms)
  const runner = createShortcutRunner({ tag: 'music', run: async name => { if (name === 'Credit Roll Music') throw new Error('shortcut Credit Roll Music: Couldn’t find shortcut'); ran.push(name) }, wait: () => new Promise(() => {}), log: l => logs.push(l) })
  const played = []
  const app = { play: async a => { played.push(a.playlist) }, pause: async () => {} }
  const m = createShortcutMusic({ names: { jazz: 'Default Jazz', credits: 'Credit Roll Music' }, runner, fallback: app, log: l => logs.push(l) })
  await m.play({ playlist: 'intense60', name: 'Murderwin · Intense', volume: 60 })
  await m.play({ playlist: 'intense60', name: 'Murderwin · Intense', volume: 60 })
  assert.deepEqual(played, ['intense60', 'intense60'], 'the Music app plays it, every time')
  assert.equal(logs.filter(l => l.includes('no Shortcut named for "intense60"')).length, 1, 'said once')
  await m.play({ playlist: 'credits', name: 'Murderwin · Credits', volume: 35 })
  await m.play({ playlist: 'credits', name: 'Murderwin · Credits', volume: 35 })
  assert.equal(logs.filter(l => /the Credit Roll Music Shortcut did not run/.test(l)).length, 1, 'a missing Shortcut, said once')
  await m.pause(); await m.pause()
  assert.equal(logs.filter(l => l.includes('no Shortcut named to stop the music')).length, 1)
  assert.deepEqual(ran, [], 'nothing ran')
  // with no Music app either: nothing plays, one line
  const none = createShortcutMusic({ names: {}, runner, log: l => logs.push(l) })
  await none.play({ playlist: 'jazz' })
  assert.ok(logs.at(-1).includes('and no Music app: nothing plays'))
  assert.equal(await none.playTrack({}), 'missing')
  assert.equal(await none.nowPlaying(), null)
})

test('fake mode runs nothing and says what it would run', async () => {
  const logs = []
  const m = createShortcutMusic({ names: SHEET.musicShortcuts, runner: createShortcutRunner({ run: async () => { throw new Error('must not run') } }), log: l => logs.push(l), fake: true })
  await m.play({ playlist: 'act4' })
  await m.pause()
  assert.deepEqual(logs, ['[music] would run the Default Jazz Shortcut', '[music] would run the Lightbulb Moment Music Shortcut', '[music] would run the Get Off My Grass Game Music Shortcut', '[music] would run the Stop Music Shortcut'])
})

test('the planner asks for act4 on entering Act 4 and jazz again for dessert, so the rooms\' music comes and goes with the act', () => {
  const night = (act, beat) => ({ night: { act, beat, phase: 'act' }, relay: null, cues: null, study: null })
  let s = emptySceneState()
  let r = planScenes(s, night(3, 'down'), 1000, SHEET); s = r.state
  assert.equal(r.actions.find(a => a.type === 'music')?.playlist, 'jazz')
  r = planScenes(s, night(4, 'groups'), 1500, SHEET); s = r.state
  assert.equal(r.actions.filter(a => a.type === 'music').length, 0, 'the warning and the groups keep the jazz')
  r = planScenes(s, night(4, 'round1'), 2000, SHEET); s = r.state
  assert.equal(r.actions.find(a => a.type === 'music')?.playlist, 'act4', 'the first round: the house jazz, the Study and the Orangerie')
  r = planScenes(s, night(4, 'round2'), 3000, SHEET); s = r.state
  assert.equal(r.actions.filter(a => a.type === 'music').length, 0, 'the same through the rounds')
  r = planScenes(s, night(5, 'roam'), 4000, SHEET); s = r.state
  assert.equal(r.actions.find(a => a.type === 'music')?.playlist, 'jazz', 'dessert: the default jazz back everywhere')
})

test('the relay: MUSIC_SHORTCUTS=on puts the music on the Shortcut road with the Music app behind it for the cake, and --check-music walks the Shortcuts', () => {
  const src = readFileSync(new URL('../cues.mjs', import.meta.url), 'utf8')
  assert.ok(src.includes("const musicByShortcuts = !!sheet && onSwitch(env.MUSIC_SHORTCUTS)"))
  assert.ok(src.includes("createShortcutMusic({ names: sheet.musicShortcuts, fallback: musicApp, log, fake: FAKE })"))
  assert.ok(src.includes("if (CHECK_MUSIC && onSwitch(env.MUSIC_SHORTCUTS)) {"))
  assert.ok(src.includes("musicByShortcuts ? 'on, through Apple Home'"), 'the start-up line says so')
  const env = readFileSync(new URL('../.env.example', import.meta.url), 'utf8')
  assert.ok(env.includes('MUSIC_SHORTCUTS='))
})

test('a setting of several Shortcuts lets each finish before the next, or waits SEQUENCE_WAIT_MS: the rooms never cut the house jazz off mid-change', async () => {
  assert.ok(SEQUENCE_WAIT_MS >= 5000 && SEQUENCE_WAIT_MS <= 15_000)
  const ran = []
  const finish = []
  const runner = createShortcutRunner({ tag: 'music', run: name => { ran.push(name); return new Promise(r => { finish.push(r) }) }, wait: async () => {} })
  const waits = []
  const m = createShortcutMusic({ names: SHEET.musicShortcuts, runner, wait: ms => new Promise(r => { waits.push({ ms, r }) }) })
  const playing = m.play({ playlist: 'act4' })
  await settle(); await settle()
  assert.deepEqual(ran, ['Default Jazz'], 'the jazz first, and nothing more until it finishes')
  finish[0]()
  await settle(); await settle(); await settle()
  assert.deepEqual(ran, ['Default Jazz', 'Lightbulb Moment Music'], 'the Study once the jazz is done')
  assert.equal(waits.at(-1).ms, SEQUENCE_WAIT_MS)
  waits.at(-1).r() // the Study's run drags on: the wait passes instead
  await settle(); await settle(); await settle()
  assert.deepEqual(ran, ['Default Jazz', 'Lightbulb Moment Music', 'Get Off My Grass Game Music'])
  finish[1](); finish[2]()
  await playing
  await m.idle()
})
