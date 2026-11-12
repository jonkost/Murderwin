import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createShortcutMusic, shortcutsFor, musicShortcutProblems, SEQUENCE_WAIT_MS, STOP_RETRY_MS, STOP_TRIES, SPECIAL_KEYS } from '../lib/shortcutMusic.js'
import { createShortcutRunner, RETRY_IN_PROGRESS_MS } from '../lib/strings.js'
import { sceneProblems, planScenes, emptySceneState } from '../lib/scenes.js'

// The music through Apple Home (31 Oct 2026, Jon's formal rundown): one
// Shortcut per music setting, run by the brain in place of the Music app.

const SHEET = JSON.parse(readFileSync(new URL('../scenes.json', import.meta.url), 'utf8'))
const settle = () => new Promise(r => setImmediate(r))

test('the sheet names the six music Shortcuts from the rundown, by the playlist keys, the stop, and the dip under a recording; Act 4 runs the house jazz first, then the two rooms', () => {
  assert.deepEqual(SHEET.musicShortcuts, {
    jazz: 'Default Jazz',
    jazzLow: 'Default Jazz 20%',
    act4: ['Default Jazz', 'Lightbulb Moment Music', 'Get Off My Grass Game Music'],
    intense35: 'Intense Music 35%',
    intense60: 'Intense Music 60%',
    off: 'AudioPanic',
    duck: 'AudioPanic',
  }, 'the Credit Roll Music Shortcut is off the sheet since 11 Nov 2026: the night ends on the jazz')
  // 12 Nov 2026: under the supper bulletin the jazz stops and comes back. The 20% Shortcut cannot be the dip: it plays the
  // same Home scene as the jazz and then sets this Mac's own volume, so it turned down the bulletin and not the HomePods
  assert.equal(SHEET.musicShortcuts.duck, SHEET.musicShortcuts.off, 'the dip under a recording is the stop')
  assert.ok(!/%/.test(SHEET.musicShortcuts.duck), 'never a Shortcut that sets this Mac\'s volume')
  assert.deepEqual(SPECIAL_KEYS, ['off', 'duck', 'cake'], 'the three keys that are not playlist settings')
  assert.deepEqual(musicShortcutProblems({ playlists: SHEET.playlists, musicShortcuts: { off: 'AudioPanic', duck: 'Default Jazz 20%', cake: 'Birthday Song' } }), [], 'the stop, the dip and a cake Shortcut need no playlist of their own')
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

test('play runs the setting\'s Shortcut(s) in order; pause runs the stop and pauses the Music app too; a plain cue\'s duck and unduck do nothing', async () => {
  const ran = []
  const logs = []
  const runner = createShortcutRunner({ tag: 'music', run: async name => { ran.push(name) }, wait: async () => {}, log: l => logs.push(l) })
  const app = { paused: 0, play: async () => { throw new Error('the Music app should not play') }, pause: async () => { app.paused++ }, playTrack: async () => 'playing', nowPlaying: async () => ({ playing: true }), speakers: async () => [{ name: 'Living Room', on: true }], hasTrack: async () => true, toHomePods: async () => 'set', releaseSpeakers: async () => 'released' }
  const m = createShortcutMusic({ names: SHEET.musicShortcuts, runner, fallback: app, log: l => logs.push(l) })
  assert.equal(m.stopped(), null, 'no stop sent yet')
  await m.play({ playlist: 'jazz', name: 'Murderwin · Jazz', volume: 55 })
  await m.play({ playlist: 'act4', name: 'Murderwin · Jazz', volume: 55 })
  assert.deepEqual(ran, ['Default Jazz', 'Default Jazz', 'Lightbulb Moment Music', 'Get Off My Grass Game Music'])
  assert.deepEqual(logs, ['[music] Default Jazz', '[music] Default Jazz, then Lightbulb Moment Music, then Get Off My Grass Game Music'])
  await m.duck(); await m.unduck()
  assert.equal(ran.length, 4, 'a chime or a sting: nothing more ran (the HomePods play their own stream)')
  assert.equal(m.speaker, undefined, 'no HomePod is lent any more (11 Nov 2026)')
  await m.pause()
  assert.equal(ran.at(-1), 'AudioPanic', 'the stop is the Shortcut the sheet names: all four HomePods')
  assert.equal(logs.at(-1), '[music] off', 'it ran, so it may say so')
  assert.equal(m.stopped(), true)
  assert.equal(app.paused, 1, 'the Music app paused too, in case the cake song was on')
  assert.equal(await m.playTrack({ name: 'Happy Birthday for Dogs', volume: 60 }), 'playing', 'the cake song is the Music app\'s')
  assert.deepEqual(await m.nowPlaying(), { playing: true })
  assert.equal((await m.speakers())[0].name, 'Living Room')
  assert.equal(await m.hasTrack('x'), true)
  assert.equal(await m.toHomePods({}), 'set')
  assert.equal(await m.releaseSpeakers(), 'released')
  assert.equal(m.road, 'shortcuts')
  await m.idle()
})

// ---- 11 Nov 2026: the stop is honest ----
// The sheet named PANIC as the stop. No Shortcut by that name was on the brain, so every "music off"
// of the evening failed inside a tenth of a second, and the window printed "[music] off" each time.
// (Since 12 Nov 2026 the sheet names AudioPanic, the Shortcut Jon made that day: it runs his Home scene PANIC.)

// A runner whose Shortcuts behave as told: `fate(name, n)` is called for try n of that name and may throw.
function runnerWith(fate, logs) {
  const tried = []
  const runner = createShortcutRunner({
    tag: 'music',
    run: async name => { tried.push(name); await fate(name, tried.filter(x => x === name).length) },
    wait: () => new Promise(() => {}), // the head start never passes: a failure here is the early, real kind
    log: l => logs.push(l),
  })
  return { runner, tried }
}
const notFound = name => { throw new Error(`shortcut ${name}: Couldn’t find shortcut`) }

test('a stop Shortcut that is not on this Mac: never "off", a line in capitals every time, one more try three seconds later and no more', async () => {
  const logs = []
  const { runner, tried } = runnerWith((name) => { if (name === 'AudioPanic') notFound(name) }, logs)
  const waits = []
  const app = { paused: 0, pause: async () => { app.paused++ } }
  const m = createShortcutMusic({ names: SHEET.musicShortcuts, runner, fallback: app, log: l => logs.push(l), wait: ms => new Promise(r => waits.push({ ms, r })) })
  await m.play({ playlist: 'jazz' })
  await m.pause()
  assert.ok(!logs.includes('[music] off'), 'it did not happen, so it is not said')
  assert.equal(logs.at(-1), '[music] THE MUSIC WAS NOT STOPPED: the AudioPanic Shortcut did not run (Couldn’t find shortcut). Trying once more in 3 seconds')
  assert.equal(m.stopped(), false)
  assert.equal(app.paused, 1, 'the Music app is still paused, in case the cake song was on')
  assert.equal(STOP_RETRY_MS, 3000)
  assert.equal(STOP_TRIES, 2)
  assert.deepEqual(waits.map(w => w.ms), [STOP_RETRY_MS])
  waits[0].r()
  await settle(); await settle(); await m.idle()
  assert.deepEqual(tried.filter(n => n === 'AudioPanic').length, 2, 'the second try')
  assert.match(logs.at(-1), /^\[music\] THE MUSIC WAS NOT STOPPED: the AudioPanic Shortcut did not run \(Couldn’t find shortcut\)\. The HomePods play on: stop them in the Home app, and make that Shortcut on this Mac, named exactly that/)
  assert.equal(waits.length, 1, 'and no third')
  // the next stop says it all again: this is never a line said once and then swallowed
  await m.pause()
  assert.equal(logs.filter(l => l.includes('THE MUSIC WAS NOT STOPPED')).length, 3)
  assert.ok(!logs.includes('[music] off'))
})

test('the second try at a stop is dropped the moment a newer play, stop or cake song has come: it can never kill music that has just come back', async () => {
  for (const newer of ['play', 'pause', 'playTrack', 'playCake']) {
    const logs = []
    const { runner, tried } = runnerWith((name, n) => { if (name === 'AudioPanic' && n === 1) throw new Error('shortcut AudioPanic: Action set execution failed.') }, logs)
    const waits = []
    const app = { pause: async () => {}, playTrack: async () => 'playing' }
    const m = createShortcutMusic({ names: { ...SHEET.musicShortcuts, cake: 'Birthday Song' }, runner, fallback: app, log: l => logs.push(l), wait: ms => new Promise(r => waits.push({ ms, r })) })
    await m.pause()
    assert.equal(waits.length, 1, 'a second try is waiting')
    if (newer === 'play') await m.play({ playlist: 'jazz' })
    if (newer === 'pause') await m.pause()
    if (newer === 'playTrack') await m.playTrack({ name: 'x', volume: 60 })
    if (newer === 'playCake') await m.playCake()
    const before = tried.filter(n => n === 'AudioPanic').length
    waits[0].r()
    await settle(); await settle(); await m.idle()
    assert.equal(tried.filter(n => n === 'AudioPanic').length, before, `${newer}: the old stop's second try never ran`)
  }
})

// ---- 12 Nov 2026: the stop is a real Shortcut now (AudioPanic, the one Jon made), sent at the press, the dark and the power ----
// Apple Home refuses a Shortcut whose Home scene is still being carried out from its last run. A stop asked
// again waited on that, every second and a half for up to thirty seconds, and the music's queue waited behind
// it: the jazz after a Blackout test, or Act 2's, would have come back late, just after one more stop.

// A runner on which the stop's Home scene is busy until free(): the first run of the stop starts and stays under
// way; every later run of it is refused "in progress" while it is. A head start passes on the next turn of the
// loop (a refusal comes at once, so it is the early kind); each wait between two tries is let go by hand (gates).
function busyStop(logs) {
  const tried = []
  const gates = []
  let busy = false
  let end = null
  const runner = createShortcutRunner({
    tag: 'music',
    run: name => {
      tried.push(name)
      if (name !== 'AudioPanic') return Promise.resolve()
      if (busy) return Promise.reject(new Error('shortcut AudioPanic: Action set execution in progress.'))
      busy = true
      return new Promise(r => { end = () => { busy = false; r() } })
    },
    wait: ms => (ms === RETRY_IN_PROGRESS_MS ? new Promise(r => gates.push(r)) : new Promise(r => setImmediate(r))),
    log: l => logs.push(l),
  })
  return { runner, tried, gates, free: () => end?.() }
}

test('a stop Apple Home will not take yet gives way to a newer word: music that comes back never waits behind it, a newer stop takes its place, and the newest stop keeps asking', async () => {
  // the music comes back while the dark's stop is still waiting (the Blackout test's power, or Act 2)
  {
    const logs = []
    const { runner, tried, gates } = busyStop(logs)
    const m = createShortcutMusic({ names: SHEET.musicShortcuts, runner, log: l => logs.push(l) })
    await m.pause() // the press: the stop starts, and its Home scene stays under way
    assert.equal(logs.at(-1), '[music] off')
    m.pause() // the dark: asked again, refused, waiting to ask once more
    await settle(); await settle()
    assert.equal(gates.length, 1, 'the second stop is waiting on Apple Home')
    m.play({ playlist: 'jazz' })
    gates[0]()
    await settle(); await settle(); await settle()
    assert.deepEqual(tried, ['AudioPanic', 'AudioPanic', 'Default Jazz'], 'the old stop was not asked a third time, and the jazz ran at once')
    assert.equal(logs.at(-1), '[music] Default Jazz')
    assert.equal(gates.length, 1, 'nothing is still waiting')
    assert.ok(!logs.some(l => /NOT STOPPED|MAY NOT/.test(l)), 'nothing in capitals: the first stop ran')
    assert.equal(m.stopped(), true)
  }
  // a newer stop (the power's) takes the place of the one still waiting (the dark's): one more run, not two
  {
    const logs = []
    const { runner, tried, gates, free } = busyStop(logs)
    const m = createShortcutMusic({ names: SHEET.musicShortcuts, runner, log: l => logs.push(l) })
    await m.pause()
    m.pause()
    await settle(); await settle()
    m.pause()
    free() // the first run's Home scene is done
    gates[0]()
    await settle(); await settle(); await settle()
    assert.deepEqual(tried, ['AudioPanic', 'AudioPanic', 'AudioPanic'], 'the dark\'s stop gave way and the power\'s ran in its place, once')
    assert.equal(logs.filter(l => l === '[music] off').length, 2, 'the press\'s and the power\'s')
    assert.equal(gates.length, 1, 'nothing is still waiting')
    assert.equal(m.stopped(), true)
  }
  // with no newer word the stop keeps asking until Apple Home takes it: it is never dropped for being refused
  {
    const logs = []
    const { runner, tried, gates, free } = busyStop(logs)
    const m = createShortcutMusic({ names: SHEET.musicShortcuts, runner, log: l => logs.push(l) })
    await m.pause()
    const again = m.pause()
    await settle(); await settle()
    gates[0]() // still busy: asked again, refused again
    await settle(); await settle()
    assert.equal(gates.length, 2)
    free()
    gates[1]()
    await again
    assert.deepEqual(tried, ['AudioPanic', 'AudioPanic', 'AudioPanic', 'AudioPanic'])
    assert.equal(logs.filter(l => l === '[music] off').length, 2)
    assert.equal(m.stopped(), true)
  }
})

test('a stop that failed for a passing reason runs on its second try, and only then says off', async () => {
  const logs = []
  const { runner, tried } = runnerWith((name, n) => { if (name === 'AudioPanic' && n === 1) throw new Error('shortcut AudioPanic: Action set execution failed.') }, logs)
  const waits = []
  const m = createShortcutMusic({ names: SHEET.musicShortcuts, runner, log: l => logs.push(l), wait: ms => new Promise(r => waits.push({ ms, r })) })
  await m.pause()
  assert.equal(m.stopped(), false)
  assert.ok(!logs.includes('[music] off'))
  waits[0].r()
  await settle(); await settle(); await m.idle()
  assert.deepEqual(tried, ['AudioPanic', 'AudioPanic'])
  assert.equal(logs.at(-1), '[music] off')
  assert.equal(m.stopped(), true)
})

test('no stop named on the sheet: said in capitals at every stop, and the Music app is still paused', async () => {
  const logs = []
  const { runner, tried } = runnerWith(() => {}, logs)
  const app = { paused: 0, pause: async () => { app.paused++ } }
  const m = createShortcutMusic({ names: { jazz: 'Default Jazz' }, runner, fallback: app, log: l => logs.push(l) })
  await m.pause(); await m.pause()
  assert.equal(logs.filter(l => l.startsWith('[music] THE MUSIC WAS NOT STOPPED: no Shortcut is named to stop it')).length, 2)
  assert.deepEqual(tried, [])
  assert.equal(app.paused, 2)
  assert.equal(m.stopped(), false)
})

test('a stop whose Home scene only partly ran says a HomePod may still be playing, and is no longer counted as a stop that worked', async () => {
  const logs = []
  let fail
  const runner = createShortcutRunner({ tag: 'music', run: () => new Promise((_, r) => { fail = r }), wait: async () => {}, log: l => logs.push(l) })
  const m = createShortcutMusic({ names: SHEET.musicShortcuts, runner, log: l => logs.push(l) })
  await m.pause()
  assert.equal(logs.at(-1), '[music] off', 'the Shortcut started, so the stop was sent')
  assert.equal(m.stopped(), true)
  fail(Object.assign(new Error('shortcut AudioPanic: Action set execution partially succeeded.'), { partial: true, took: 61_000 }))
  await m.idle(); await settle()
  assert.match(logs.at(-1), /^\[music\] THE STOP MAY NOT HAVE REACHED EVERY HOMEPOD: the AudioPanic Shortcut ran for 61 s and then said "partially succeeded"/)
  assert.match(logs.at(-1), /Listen for a HomePod still playing/)
  assert.ok(!logs.at(-1).includes('it did its job'), 'never the string lights\' "it did its job": for a stop that is not good enough')
  assert.equal(m.stopped(), false)
  // any other late failure
  const logs2 = []
  let fail2
  const m2 = createShortcutMusic({ names: SHEET.musicShortcuts, runner: createShortcutRunner({ tag: 'music', run: () => new Promise((_, r) => { fail2 = r }), wait: async () => {}, log: l => logs2.push(l) }), log: l => logs2.push(l) })
  await m2.pause()
  fail2(Object.assign(new Error('shortcut AudioPanic: it did not finish'), { partial: false, took: 90_000 }))
  await m2.idle(); await settle()
  assert.equal(logs2.at(-1), '[music] THE STOP MAY NOT HAVE REACHED EVERY HOMEPOD: the AudioPanic Shortcut did not finish after 90 s (it did not finish)')
})

test('under a recording the brain speaks, the music goes down by the sheet\'s duck Shortcut and the setting that was on comes back after; a plain cue, or silence, does nothing', async () => {
  const ran = []
  const logs = []
  const runner = createShortcutRunner({ tag: 'music', run: async name => { ran.push(name) }, wait: async () => {}, log: l => logs.push(l) })
  const m = createShortcutMusic({ names: SHEET.musicShortcuts, runner, log: l => logs.push(l) })
  await m.duck({ speech: true })
  assert.deepEqual(ran, [], 'nothing is playing yet: a dip would start the jazz')
  await m.play({ playlist: 'jazz' })
  await m.duck({ speech: false }); await m.unduck()
  assert.deepEqual(ran, ['Default Jazz'], 'a chime leaves the music be')
  await m.duck({ speech: true }); await m.duck({ speech: true })
  assert.deepEqual(ran, ['Default Jazz', 'AudioPanic'], 'down once')
  assert.equal(logs.at(-1), '[music] down, under the recording')
  await m.unduck(); await m.unduck()
  assert.deepEqual(ran, ['Default Jazz', 'AudioPanic', 'Default Jazz'], 'and back once')
  // in Act 4 the three rooms' music comes back
  await m.play({ playlist: 'act4' })
  ran.length = 0
  await m.duck({ speech: true }); await m.unduck()
  assert.deepEqual(ran, ['AudioPanic', 'Default Jazz', 'Lightbulb Moment Music', 'Get Off My Grass Game Music'])
  // the sheet stops the music while the recording plays: the stop is the newer word, nothing comes back
  await m.play({ playlist: 'jazz' })
  ran.length = 0
  await m.duck({ speech: true })
  await m.pause()
  await m.unduck()
  assert.deepEqual(ran, ['AudioPanic', 'AudioPanic'], 'the dip, then the stop')
  await m.duck({ speech: true })
  assert.deepEqual(ran, ['AudioPanic', 'AudioPanic'], 'silence stays silence')
  // the sheet changes the music while the recording plays: that setting stays, at its own level
  await m.play({ playlist: 'jazz' })
  await m.duck({ speech: true })
  await m.play({ playlist: 'intense60' })
  ran.length = 0
  await m.unduck()
  assert.deepEqual(ran, [])
  // no duck named: nothing, as before
  const plain = createShortcutMusic({ names: { jazz: 'Default Jazz', off: 'AudioPanic' }, runner })
  await plain.play({ playlist: 'jazz' })
  ran.length = 0
  await plain.duck({ speech: true }); await plain.unduck()
  assert.deepEqual(ran, [])
  // a duck Shortcut that did not run brings nothing back, and says so once
  const logs3 = []
  const { runner: flaky, tried } = runnerWith((name) => { if (name === 'AudioPanic') notFound(name) }, logs3)
  const m3 = createShortcutMusic({ names: SHEET.musicShortcuts, runner: flaky, log: l => logs3.push(l) })
  await m3.play({ playlist: 'jazz' })
  await m3.duck({ speech: true }); await m3.unduck()
  assert.deepEqual(tried, ['Default Jazz', 'AudioPanic'], 'the jazz was not started a second time')
  assert.ok(logs3.some(l => l.includes('the music stays as loud as it was under the recording')))
  assert.ok(!logs3.includes('[music] down, under the recording'))
})

// 12 Nov 2026: the dip under the supper bulletin is the stop itself. A recording that ends at once (its files
// missing, or a chime cutting it off) brings the setting back within seconds; the jazz must not start while the
// stop is still on its way to the HomePods, or the stop could have the last word and supper would sit in silence.
test('the dip lands before the setting can come back: the jazz waits for the stop to finish, or eight seconds at most', async () => {
  for (const how of ['the stop lands', 'the stop never says it has landed']) {
    const ran = []
    let land = null
    const runner = createShortcutRunner({
      tag: 'music',
      run: name => { ran.push(name); return name === 'AudioPanic' ? new Promise(r => { land = r }) : Promise.resolve() },
      wait: async () => {}, // the head start passes at once: the stop has started and is still under way
      log: () => {},
    })
    const waits = []
    const m = createShortcutMusic({ names: SHEET.musicShortcuts, runner, wait: ms => new Promise(r => waits.push({ ms, r })) })
    await m.play({ playlist: 'jazz' })
    m.duck({ speech: true }) // the bulletin starts...
    m.unduck() // ...and ends at once
    await settle(); await settle()
    assert.deepEqual(ran, ['Default Jazz', 'AudioPanic'], `${how}: the jazz waits while the stop is on its way`)
    assert.deepEqual(waits.map(w => w.ms), [SEQUENCE_WAIT_MS], 'for the stop, or eight seconds at most')
    if (how === 'the stop lands') land()
    else waits[0].r()
    await settle(); await settle()
    assert.deepEqual(ran, ['Default Jazz', 'AudioPanic', 'Default Jazz'], `${how}: and then it comes back, once`)
  }
})

test('the cake\'s song by its own Shortcut when the sheet names one; none named, or one that did not run, hands the song to the Music app', async () => {
  const ran = []
  const logs = []
  const runner = createShortcutRunner({ tag: 'music', run: async name => { ran.push(name) }, wait: async () => {}, log: l => logs.push(l) })
  const none = createShortcutMusic({ names: SHEET.musicShortcuts, runner, log: l => logs.push(l) })
  assert.equal(await none.playCake(), null, 'the sheet names no cake Shortcut today')
  assert.deepEqual(ran, [])
  const m = createShortcutMusic({ names: { ...SHEET.musicShortcuts, cake: 'Birthday Song' }, runner, log: l => logs.push(l) })
  assert.equal(await m.playCake(), 'playing')
  assert.deepEqual(ran, ['Birthday Song'])
  assert.equal(logs.at(-1), '[cake] Birthday Song')
  const logs2 = []
  const { runner: missing } = runnerWith(notFound, logs2)
  const m2 = createShortcutMusic({ names: { cake: 'Birthday Song' }, runner: missing, log: l => logs2.push(l) })
  assert.equal(await m2.playCake(), null)
  assert.match(logs2.at(-1), /^\[cake\] the Birthday Song Shortcut did not run \(Couldn’t find shortcut\): the Music app plays the song instead$/)
})

test('a setting with no Shortcut falls back to the Music app with one line; a music Shortcut not on this Mac is one line; no stop named is said at every stop', async () => {
  const logs = []
  const ran = []
  // the head start never passes here, so a failing run is the real, early kind (a missing Shortcut reports in 70 ms)
  const runner = createShortcutRunner({ tag: 'music', run: async name => { if (name === 'Intense Music 35%') throw new Error('shortcut Intense Music 35%: Couldn’t find shortcut'); ran.push(name) }, wait: () => new Promise(() => {}), log: l => logs.push(l) })
  const played = []
  const app = { play: async a => { played.push(a.playlist) }, pause: async () => {} }
  const m = createShortcutMusic({ names: { jazz: 'Default Jazz', intense35: 'Intense Music 35%' }, runner, fallback: app, log: l => logs.push(l) })
  await m.play({ playlist: 'intense60', name: 'Murderwin · Intense', volume: 60 })
  await m.play({ playlist: 'intense60', name: 'Murderwin · Intense', volume: 60 })
  assert.deepEqual(played, ['intense60', 'intense60'], 'the Music app plays it, every time')
  assert.equal(logs.filter(l => l.includes('no Shortcut named for "intense60"')).length, 1, 'said once')
  await m.play({ playlist: 'intense35', name: 'Murderwin · Intense', volume: 35 })
  await m.play({ playlist: 'intense35', name: 'Murderwin · Intense', volume: 35 })
  assert.equal(logs.filter(l => /the Intense Music 35% Shortcut did not run/.test(l)).length, 1, 'a missing music Shortcut, said once')
  await m.pause(); await m.pause()
  assert.equal(logs.filter(l => l.includes('THE MUSIC WAS NOT STOPPED: no Shortcut is named to stop it')).length, 2, 'a stop that cannot happen is said every time (11 Nov 2026)')
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
  assert.deepEqual(logs, ['[music] would run the Default Jazz Shortcut', '[music] would run the Lightbulb Moment Music Shortcut', '[music] would run the Get Off My Grass Game Music Shortcut', '[music] would run the AudioPanic Shortcut'])
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
