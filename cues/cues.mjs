// The cue relay. Runs on the game-server Mac (the M3 Air, "the brain") all
// night. It reads the public night state that any phone may read, and does
// a handful of dumb things: sets the bulb outside the bedroom green, off,
// red or green, runs the music (a setting per moment, stopped for the rules,
// the news, the blackout and Sir Irwin, the birthday song for Cake!), speaks
// the recorded bulletin, recalls Hue scenes by name, switches the projector's
// plug through Apple Home, and mirrors Salem's game colour on the Orangerie
// string lights. It never calls a Cloud Function, never reads anything
// sealed, and never knows what a cue means.
// docs/cues-relay.md. Brought to Jon's cue list on 25 Oct 2026.
//
// Since 11 Nov 2026 the room screens and the phones play every cue's sound
// themselves (the chimes, the stings, the scream, bulletin 2's sounder), so the
// brain plays no cue sound: it only speaks bulletin 2's recordings, a moment
// after the sounder. The sheet's
// "cueSounds" says which road is on (lib/scenes.js brainPlaysId).
//
//   npm start                 the real bridge, speakers, Music, projector and strings (cues/.env)
//   npm start -- --lights     list the bridge's lights and their ids, then quit
//   npm start -- --scenes     list the bridge's scenes and check the six Murderwin ones, then quit
//   npm start -- --scene "Murderwin Default"   recall one scene, then quit
//   npm start -- --check-music      play each playlist and the cake's song a few seconds, duck, stop, then quit
//   npm start -- --speakers         list the AirPlay speakers Music sees and say whether the cake's song is in the library; plays nothing, then quit
//   npm start -- --check-shortcuts  say which of the Shortcuts the brain runs are not on this Mac; runs none of them, then quit
//   npm start -- --check-strings    string lights red, green, then decor, then quit
//   npm start -- --check-projector  the projector's plug off, then on, then quit
//   npm run fake              no hardware: prints what it would do
//     keys in fake mode: r → hall red, g → hall green, o → hall off, s → the next sound in the catalogue,
//     c → Cake!, n → the next moment of a pretend night (lib/demo.js)
//   npm run fake -- --offline   the same with no Firebase at all (keys only)
//   npm run demo              a pretend night, start to finish, no Firebase, no hardware; then quits
//   npm start -- --demo       the same pretend night on the real lights, speakers, Music and projector
//                             (no Firebase): every move the brain makes, in about two minutes
//
// The music, Hue scenes and projector for each moment are the safe file
// cues/scenes.json.
//
// It refuses to start while a REQUIRED sound (lib/cues.js REQUIRED_SOUND_IDS:
// the chime and the blackout) has no file under media/. A chime with no file
// of its own plays the chime's file; a sting with none is silent, and the
// start-up line says how many; scripts/make-placeholder-sounds.mjs makes a
// stand-in tone for each until the real recordings are in.
//
// The W-O-O-F News recordings arrive as codes on a night with a station key
// saved: STATION_KEY in cues/.env (the same key the host saves for the study
// station) lets the relay map each code back to its file. The window prints
// counts only, never a sound id, a recording's name or a file name: it sits
// in view all night.

import { readFileSync, existsSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawn } from 'node:child_process'
import { initializeApp } from 'firebase/app'
import { getAuth, signInAnonymously } from 'firebase/auth'
import { getFirestore, doc, onSnapshot, setDoc, serverTimestamp } from 'firebase/firestore'
import { blackoutShortcutsOf, blackoutShortcutCheck, blackoutShortcutTimes, stepBlackoutShortcuts, NO_PRESS } from './lib/blackoutShortcuts.js'
import { plan, parseEnv, bridgeHostProblem, presenceRow, PRESENCE_MS, SOUND_IDS, CLIP_IDS, soundFileReport, soundFilesLines, recordingFiles, clipReader, playLine, blackoutMarkTimes, stamp } from './lib/cues.js'
import { createPlayer } from './lib/player.js'
import { connectAuthEmulator } from 'firebase/auth'
import { connectFirestoreEmulator } from 'firebase/firestore'
import { Hue, sameSceneName } from './lib/hue.js'
import { planScenes, emptySceneState, sceneProblems, sceneNames, playlistNamesOf, ducksFor, unduckDelayMs, afterCake, brainPlaysId, cueSoundsRoad } from './lib/scenes.js'
import { createMusic, followTrack } from './lib/music.js'
import { createShortcutMusic, shortcutsFor } from './lib/shortcutMusic.js'
import { StringLights, ShortcutLights, TwoWayLights, shortcutColours, STRING_SHORTCUTS, createStringsMirror, stringsColour, stringsWanted, nextChangeAt, salemToMirror, DEFAULT_STRING_COLOURS, createProjectorSwitch, projectorShortcutNames, listShortcuts, shortcutsNeeded, shortcutCheck, createShortcutRunner } from './lib/strings.js'
import { demoNight } from './lib/demo.js'
import { autoDriver } from './lib/fillins.js' // a practice night's fill-in players (A4): their clock starts with the night

const here = dirname(fileURLToPath(import.meta.url))
const args = process.argv.slice(2)
const has = flag => args.includes(flag)
const DEMO = has('--demo')
const FAKE = has('--fake')
const OFFLINE = has('--offline') || DEMO
const LIST = has('--lights')
const SCENES = has('--scenes')
const ONE_SCENE = args.indexOf('--scene') >= 0 ? String(args[args.indexOf('--scene') + 1] ?? '') : null
const CHECK_MUSIC = has('--check-music')
const SPEAKERS = has('--speakers')
const CHECK_SHORTCUTS = has('--check-shortcuts')
const CHECK_STRINGS = has('--check-strings')
const CHECK_PROJECTOR = has('--check-projector')
const TOOL = LIST || SCENES || ONE_SCENE !== null || CHECK_MUSIC || CHECK_SHORTCUTS || SPEAKERS || CHECK_STRINGS || CHECK_PROJECTOR
const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a)
const sleep = ms => new Promise(r => setTimeout(r, ms))

function loadEnv() {
  const p = join(here, '.env')
  return existsSync(p) ? parseEnv(readFileSync(p, 'utf8')) : {}
}
const env = { ...loadEnv(), ...process.env }
const MEDIA_DIR = resolve(here, env.MEDIA_DIR || '../media')
const offSwitch = v => String(v ?? '').trim().toLowerCase() === 'off'
const onSwitch = v => String(v ?? '').trim().toLowerCase() === 'on'

// The sound files (25 Oct 2026, cueSounds): the relay quits only when a
// required sound (the chime, the blackout) has no file; in fake mode it
// carries on. The counts are printed (never which ones). A chime with no file
// of its own plays the one chime; a sting with none is silent at its moment.
// The recordings are counted too, and may be missing: a missing one is
// skipped and the screen shows the words.
const soundReport = soundFileReport(MEDIA_DIR, existsSync)
if (soundReport.required.length && !TOOL) {
  for (const line of soundFilesLines(soundReport)) console.log(`${line} in ${MEDIA_DIR}`)
  console.log('run `node scripts/make-placeholder-sounds.mjs` for stand-in tones, or drop the recordings in (media/README.md)')
  if (!FAKE) process.exit(2)
}
const readClip = clipReader(env.STATION_KEY)

// The cue sheet for music, Hue scenes and the projector. A broken file never
// stops the relay: the hall light and the sounds carry on, music, scenes and
// the projector are off.
function loadSheet() {
  try {
    const cfg = JSON.parse(readFileSync(join(here, 'scenes.json'), 'utf8'))
    const problems = sceneProblems(cfg)
    if (!problems.length) return cfg
    log(`cues/scenes.json has ${problems.length} problem${problems.length === 1 ? '' : 's'} (first: ${problems[0]}); music, Hue scenes and the projector are off until it is fixed`)
  } catch (e) {
    log(`cues/scenes.json ${e instanceof SyntaxError ? 'is not valid JSON' : 'could not be read'}; music, Hue scenes and the projector are off until it is fixed`)
  }
  return null
}
const sheet = loadSheet()

// Same public web config as the phones (play/src/firebase.js).
const firebaseConfig = {
  apiKey: 'AIzaSyBmb8V5vrj1Qt5l2m8Ook24vHWUfLiXGbA',
  authDomain: 'murderwin-at-sirwin-manor.firebaseapp.com',
  projectId: 'murderwin-at-sirwin-manor',
  storageBucket: 'murderwin-at-sirwin-manor.firebasestorage.app',
  messagingSenderId: '155269832197',
  appId: '1:155269832197:web:09f0ff7a92255b97b4466c',
}
if (env.MURDERWIN_EMULATOR === '1') firebaseConfig.projectId = env.MURDERWIN_PROJECT_ID || 'demo-murderwin'

// ---- the things it can do ----------------------------------------------------
let hue = null
if (!FAKE) {
  const problem = bridgeHostProblem(env.HUE_BRIDGE_HOST)
  if (problem) log(`${problem} (cues/.env): the hall light and the Hue scenes are off duty; the TV announces the door anyway`)
  else {
    try { hue = new Hue({ host: env.HUE_BRIDGE_HOST, key: env.HUE_APP_KEY, log }) } catch (e) { log(e.message, 'the hall light and the Hue scenes are off duty; the TV announces the door anyway') }
  }
}

// The string lights: paired straight to their Nanoleaf controller, through
// Apple Home with three Shortcuts on this Mac (STRINGS_SHORTCUTS=on,
// lib/strings.js), or both (31 Oct 2026): the pairing first, and the
// Shortcuts from the first time it fails.
let stringLights = null
let stringColours = sheet?.strings ?? DEFAULT_STRING_COLOURS
const stringsByShortcuts = !FAKE && onSwitch(env.STRINGS_SHORTCUTS)
const stringsPaired = !FAKE && !!(env.NANOLEAF_STRINGS_HOST && env.NANOLEAF_STRINGS_TOKEN)
// a Shortcut renamed on the Mac is named in cues/.env, never in the code
const stringShortcutName = c => String(env[`STRINGS_SHORTCUT_${c.toUpperCase()}`] ?? '').trim() || STRING_SHORTCUTS[c]
const stringShortcutNames = { red: stringShortcutName('red'), green: stringShortcutName('green'), decor: stringShortcutName('decor'), off: stringShortcutName('off') }
stringColours = { ...stringColours, off: { off: true } } // the blackout (A1): their own address turns them off; on the Shortcut road, the Off Murderwin Strings Shortcut
if (stringsByShortcuts) stringColours = shortcutColours(stringShortcutNames, stringColours)
if (stringsPaired || stringsByShortcuts) {
  const direct = stringsPaired ? new StringLights({ host: env.NANOLEAF_STRINGS_HOST.trim(), token: env.NANOLEAF_STRINGS_TOKEN.trim() }) : null
  const shortcuts = stringsByShortcuts ? new ShortcutLights({ log }) : null
  stringLights = direct && shortcuts ? new TwoWayLights({ direct, shortcuts, log }) : direct ?? shortcuts
}
const stringsHow = FAKE ? 'fake' : !stringLights ? 'not set up' : stringsPaired && stringsByShortcuts ? 'on, paired, the Shortcuts behind it' : stringsByShortcuts ? 'on, through Apple Home' : 'on, paired'

// The projector's plug, through Apple Home with two Shortcuts on this Mac
// (PROJECTOR_SHORTCUTS=on, lib/strings.js). Off or unset: it only says what it would do.
const projectorOn = !FAKE && onSwitch(env.PROJECTOR_SHORTCUTS)
const projector = createProjectorSwitch({ enabled: projectorOn, names: projectorShortcutNames(env), log, fake: FAKE })

if (LIST) {
  if (!hue) { console.log('fill HUE_BRIDGE_HOST and HUE_APP_KEY in cues/.env first'); process.exit(2) }
  const lights = await hue.lights()
  for (const l of lights) console.log(`${l.id}  ${l.name}`)
  process.exit(0)
}
if (SCENES) {
  if (!hue) { console.log('fill HUE_BRIDGE_HOST and HUE_APP_KEY in cues/.env first'); process.exit(2) }
  const [scenes, places] = await Promise.all([hue.scenes(), hue.places()])
  scenes.sort((a, b) => a.name.localeCompare(b.name))
  for (const s of scenes) console.log(`${s.name}   (${places.get(s.group) || 'room unknown'})`)
  console.log(`\n${scenes.length} scenes on the bridge. The ones cues/scenes.json uses:`)
  for (const name of sceneNames(sheet).sort()) {
    const n = scenes.filter(s => sameSceneName(s.name, name)).length
    console.log(`  ${n ? 'found  ' : 'MISSING'}  ${name}${n > 1 ? `  (${n} scenes by that name, recalled together)` : ''}`)
  }
  process.exit(0)
}
if (ONE_SCENE !== null) {
  if (!hue) { console.log('fill HUE_BRIDGE_HOST and HUE_APP_KEY in cues/.env first'); process.exit(2) }
  const n = await hue.recallScene(ONE_SCENE)
  console.log(n ? `recalled ${n} scene${n === 1 ? '' : 's'} called "${ONE_SCENE}"` : `no scene called "${ONE_SCENE}" on the bridge (npm start -- --scenes lists them)`)
  process.exit(n ? 0 : 1)
}
// Every Shortcut the brain runs tonight, by name, from the roads cues/.env
// switches on (11 Nov 2026): the music's (cues/scenes.json musicShortcuts),
// the string lights' three and the projector's two. Checked against this
// Mac's own list when the relay starts, which only reads: no Shortcut runs.
const shortcutNames = shortcutsNeeded({
  music: sheet && onSwitch(env.MUSIC_SHORTCUTS) ? sheet.musicShortcuts : null,
  strings: onSwitch(env.STRINGS_SHORTCUTS) ? stringShortcutNames : null,
  projector: onSwitch(env.PROJECTOR_SHORTCUTS) ? projectorShortcutNames(env) : null,
})
// Can the brain stop the music? null: the question does not arise (the music
// is not on the Shortcut road); false: the stop's Shortcut is not on this Mac.
// The heartbeat carries it to the Host tab, which says so in plain words.
let canStop = null
// Jon's two Shortcuts for the blackout (12 Nov 2026, lib/blackoutShortcuts.js): named on the sheet
// (cues/scenes.json blackout.shortcut and blackout.afterShortcut), run on the blackout's marks. `blackoutCfg`
// is the pair as this Mac spells them; one that is not on this Mac is not run.
const blackoutSheet = blackoutShortcutsOf(offSwitch(env.BLACKOUT_SHORTCUTS) ? null : sheet) // BLACKOUT_SHORTCUTS=off in cues/.env leaves them out
let blackoutCfg = blackoutSheet
async function checkShortcuts({ quiet = false } = {}) {
  const blackoutNamed = !!(blackoutSheet.dark || blackoutSheet.after)
  if (!shortcutNames.length && !blackoutNamed) { if (!quiet) log('Shortcuts: none to check (MUSIC_SHORTCUTS, STRINGS_SHORTCUTS and PROJECTOR_SHORTCUTS are all off in cues/.env)'); return null }
  let have
  try { have = await listShortcuts() } catch (e) {
    if (!quiet) log(`Shortcuts: this Mac's list could not be read (${e.message}), so the names the brain runs were not checked`)
    return null
  }
  if (blackoutNamed) {
    const b = blackoutShortcutCheck(blackoutSheet, have)
    blackoutCfg = { dark: b.dark, after: b.after }
    if (!quiet) for (const line of b.lines) log(line)
  }
  if (!shortcutNames.length) return { missing: [], lines: [], stop: 'none' }
  // with Jon's Blackout Shortcut on this Mac the string lights go dark with the rest of the house (his scene has
  // them in it), so their own Off Shortcut is not needed and its absence is not worth a line
  const needed = blackoutCfg.dark ? shortcutNames.filter(s => !(s.tag === 'strings' && s.key === 'off')) : shortcutNames
  const r = shortcutCheck(needed, have)
  const was = canStop
  canStop = sheet && onSwitch(env.MUSIC_SHORTCUTS) ? r.stop === 'ok' : null
  if (!quiet) for (const line of r.lines) log(line)
  else if (was === false && canStop === true) log('[music] the Shortcut that stops the music is on this Mac now: the brain can stop the music')
  return r
}
if (CHECK_SHORTCUTS) {
  const r = await checkShortcuts()
  process.exit(r && !r.missing.length ? 0 : 1)
}
if (SPEAKERS) {
  const m = createMusic({ fake: FAKE, log })
  const list = await m.speakers().catch(e => { log(`[music] ${e.message}`); return [] })
  for (const sp of list) console.log(`${sp.on ? '[x]' : '[ ]'} ${sp.name}   (${sp.kind})`)
  const pods = list.filter(sp => /homepod/i.test(sp.kind)).length
  console.log(`\n${list.length} speaker${list.length === 1 ? '' : 's'} in the Music app's AirPlay list, ${pods} of them HomePod${pods === 1 ? '' : 's'}. The cake's song plays on ${Array.isArray(sheet?.cake?.speakers) ? 'the ones named in cues/scenes.json cake.speakers' : sheet?.cake?.speakers === 'mac' ? 'this Mac' : 'every HomePod'}.`)
  if (Array.isArray(sheet?.cake?.speakers)) for (const want of sheet.cake.speakers) if (!list.some(sp => sp.name === want)) console.log(`"${want}" is not in the list: put the right name in cues/scenes.json, cake.speakers`)
  if (sheet?.cake) {
    const has = await m.hasTrack(sheet.cake.song)
    console.log(has === true ? 'The cake\'s song is in the Music library.' : has === false ? `NO SONG called "${sheet.cake.song}" in the Music library: add it on this Mac, or Cake! plays nothing.` : 'The Music app could not be asked whether the cake\'s song is in its library.')
  }
  process.exit(0)
}
if (CHECK_MUSIC && onSwitch(env.MUSIC_SHORTCUTS)) {
  // the Shortcut road: each setting's Shortcut(s) in the sheet's order, then the stop
  if (!sheet) { console.log('cues/scenes.json needs fixing first'); process.exit(2) }
  const m = createShortcutMusic({ names: sheet.musicShortcuts, fallback: offSwitch(env.MUSIC) ? null : createMusic({ fake: FAKE, log }), log, fake: FAKE })
  const keys = Object.keys(sheet.musicShortcuts ?? {}).filter(k => k !== 'off' && sheet.playlists?.[k])
  for (const key of keys) {
    log(`now ${key} (${shortcutsFor(sheet.musicShortcuts, key).join(', then ')}), for six seconds`)
    await m.play({ playlist: key, ...sheet.playlists[key] })
    await sleep(6000)
  }
  if (sheet.cake) {
    log('now the song for the cake, from the Music app, for six seconds')
    const r = await m.playTrack({ name: sheet.cake.song, volume: sheet.cake.volume })
    if (r === 'playing') await sleep(6000)
  }
  log('now the stop')
  await m.pause()
  await m.idle()
  log(`done: if you heard all ${keys.length} settings on the HomePods${sheet.cake ? ', then the song' : ''}, and then silence, the music is ready through Apple Home`)
  process.exit(0)
}
if (CHECK_MUSIC) {
  if (!sheet) { console.log('cues/scenes.json needs fixing first'); process.exit(2) }
  const m = createMusic({ fake: FAKE, log, whisper: sheet.whisper })
  // each playlist once (two short names may share one), at its first volume
  for (const name of playlistNamesOf(sheet)) {
    const p = Object.values(sheet.playlists).find(x => x.name === name)
    log(`now ${name}, for six seconds`)
    await m.play(p)
    await sleep(6000)
  }
  log('down to a whisper, as under a cue, for three seconds')
  await m.duck(); await sleep(3000)
  log('and back up')
  await m.unduck(); await sleep(2000)
  if (sheet.cake) {
    log('now the song for the cake, for six seconds')
    const r = await m.playTrack({ name: sheet.cake.song, volume: sheet.cake.volume })
    if (r === 'playing') await sleep(6000)
  }
  await m.pause()
  log(`done: if you heard all ${playlistNamesOf(sheet).length} playlists, the dip${sheet.cake ? ' and the song' : ''}, the music is ready`)
  process.exit(0)
}
if (CHECK_STRINGS) {
  if (!stringLights) { console.log('fill NANOLEAF_STRINGS_HOST and NANOLEAF_STRINGS_TOKEN in cues/.env, or set STRINGS_SHORTCUTS=on and make the three Shortcuts, first'); process.exit(2) }
  for (const c of ['red', 'green', 'decor']) {
    try { await stringLights.show(stringColours[c]); log(`[strings] ${c}`) } catch (e) { log(`[strings] ${c}: no answer (${e.message}); the phones carry the colour`); process.exit(1) }
    await sleep(2000)
  }
  log('done: if the strings went red, green, then warm, they are ready')
  // a Shortcut whose Home scene has a straggler runs on for about a minute before it reports (lib/strings.js)
  if (stringLights.running?.()) {
    log(`[strings] ${stringLights.running()} Shortcut${stringLights.running() === 1 ? ' is' : 's are'} still running: waiting for the report, up to a minute and a half`)
    await stringLights.idle()
    log('[strings] the Shortcuts have finished')
  }
  process.exit(0)
}
if (CHECK_PROJECTOR) {
  if (!projectorOn && !FAKE) { console.log('set PROJECTOR_SHORTCUTS=on in cues/.env and make the two Shortcuts (Projector Murderwin On, Projector Murderwin Off) first'); process.exit(2) }
  await projector.set('off'); await sleep(5000)
  await projector.set('on'); await projector.idle()
  log('done: if the projector\'s plug went off and came back on, it is ready (the projector itself takes a moment to warm up)')
  process.exit(0)
}

// The hall bulb: red, green, or off in the blackout (25 Oct 2026).
let wantHall = null
async function setHall(colour) {
  // The End, or no night at all: let go. The bulb stays as it is and nothing is re-sent.
  if (colour === 'free') { if (wantHall) log('[hall] let go: the bulb is yours again'); wantHall = null; return }
  wantHall = colour
  if (FAKE || !hue) { log(`[hall] would turn ${colour}`); return }
  if (!env.HUE_HALL_LIGHT_ID) { log('[hall] no HUE_HALL_LIGHT_ID set'); return }
  try { await hue.setLight(env.HUE_HALL_LIGHT_ID, colour); log(`[hall] ${colour}`) } catch (e) { log(`[hall] ${colour} failed (${e.message}); retrying`) }
}
// keep trying until the bulb agrees (off is re-sent like any colour)
setInterval(() => { if (wantHall && !FAKE && hue) setHall(wantHall) }, 5000)

// One id, then its recordings one after the other (a W-O-O-F News bulletin).
// A newer cue stops the file that is playing before it starts, so two never
// talk over each other (lib/player.js). One count-only line per cue.
const player = createPlayer({ mediaDir: MEDIA_DIR, exists: existsSync, spawn, log, fake: FAKE })

// Apple Music (lib/music.js): MUSIC=off in cues/.env leaves it all to Jon.
// MUSIC_SHORTCUTS=on (31 Oct 2026, the formal rundown): the music runs
// through Apple Home instead, one Shortcut per setting (lib/shortcutMusic.js,
// the names in cues/scenes.json musicShortcuts); the Music app then plays
// only the cake's song.
const musicApp = sheet && !offSwitch(env.MUSIC) ? createMusic({ fake: FAKE, log, whisper: sheet.whisper }) : null
const musicByShortcuts = !!sheet && onSwitch(env.MUSIC_SHORTCUTS)
const music = musicByShortcuts ? createShortcutMusic({ names: sheet.musicShortcuts, fallback: musicApp, log, fake: FAKE }) : musicApp
if (sheet && !music) log('[music] off (MUSIC=off in cues/.env): run the Music app by hand')
if (musicByShortcuts && !shortcutsFor(sheet.musicShortcuts, 'off').length) log('[music] THE BRAIN CANNOT STOP THE MUSIC: no Shortcut is named to stop it (cues/scenes.json musicShortcuts.off). The HomePods play on through the rules, the news and the blackout until you stop them')

// Hue scenes by name: HUE_SCENES=off in cues/.env leaves them to the Hue app.
const scenesOn = !!sheet && !offSwitch(env.HUE_SCENES) && (FAKE || !!hue)
if (sheet && !scenesOn && (FAKE || hue)) log('[lights] Hue scenes off (HUE_SCENES=off in cues/.env): tap them in the Hue app')
let sceneSeq = 0
async function recallScene(name, attempt = 1) {
  const mine = attempt === 1 ? ++sceneSeq : sceneSeq
  if (FAKE) { log(`[lights] would recall ${name}`); return }
  try {
    const n = await hue.recallScene(name)
    log(n ? `[lights] ${name}` : `[lights] no scene called "${name}" on the bridge (npm start -- --scenes lists them)`)
  } catch (e) {
    if (attempt === 1) {
      log(`[lights] ${name} failed (${e.message}); trying once more`)
      setTimeout(() => { if (mine === sceneSeq) recallScene(name, 2) }, 3000)
    } else log(`[lights] ${name} failed again (${e.message}); tap the scene in the Hue app`)
  }
}

// Music goes quiet while a cue plays and comes back after (lib/scenes.js
// unduckDelayMs: a short tail, or the video hold for a bulletin on the TV).
// On the Shortcut road the HomePods play their own stream, so only a cue the
// brain speaks (recordings: bulletin 2) turns it down, through the sheet's
// "duck" Shortcut; a plain cue leaves it be (lib/shortcutMusic.js).
let unduckTimer = null
function cueStarts(action) {
  clearTimeout(unduckTimer); unduckTimer = null
  music?.duck({ speech: (action?.clips?.length ?? 0) > 0 })
}
function cueEnds(action, startedAt, elsewhere = false) {
  clearTimeout(unduckTimer)
  unduckTimer = setTimeout(() => { unduckTimer = null; music?.unduck() }, unduckDelayMs(action, startedAt, Date.now(), sheet, { elsewhere }))
}

// Cake! (25 Oct 2026, cue 13; 11 Nov 2026: "on all HomePods", and "I was
// still hearing music"). In order: the music stops, and the stop is waited
// for, so the song is the only thing playing; then the song, by its own
// Shortcut when the sheet names one (musicShortcuts.cake), else from the
// Music library through every HomePod the Music app can see (cake.speakers);
// when it ends (or after the sheet's `seconds` if it cannot be followed) the
// Music app lets go of the HomePods, and the sheet's music and scene come
// back. A second press while the song plays starts it again and forgets the
// first. The host's own stop during the song (Silence) ends it for good: the
// lights come back, the music stays off. A song that is not in the library
// is found out before anything is stopped: the music plays on, the candles
// only.
let cakeSeq = 0
let cakeQuiet = 0 // the press whose song the host stopped by hand: its music does not come back
async function serveCake(a) {
  const mine = ++cakeSeq
  const seconds = Math.max(0, Number(a.seconds) || 0)
  const lightsBack = () => { sceneState = { ...sceneState, hue: null }; apply() }
  if (!music) {
    log('[cake] MUSIC=off in cues/.env: play the song in the Music app by hand')
    await sleep(FAKE ? 2000 : seconds * 1000)
    if (mine === cakeSeq) lightsBack()
    return
  }
  const ownShortcut = musicByShortcuts && shortcutsFor(sheet.musicShortcuts, 'cake').length > 0
  if (!ownShortcut && (await music.hasTrack?.(a.song)) === false) {
    log(`[cake] NO SONG called "${a.song}" in the Music library: the music plays on, the candles only. Add the song on this Mac (docs/cues-relay.md)`)
    await sleep(FAKE ? 2000 : seconds * 1000)
    if (mine === cakeSeq) lightsBack()
    return
  }
  // the music first, and wait for the stop: the song must be the only thing playing
  await music.pause()
  if (mine !== cakeSeq) return
  let started = 'missing'
  let byShortcut = false
  let onPods = false
  if (ownShortcut && (await music.playCake()) === 'playing') { byShortcut = true; started = 'playing' }
  else {
    if (a.speakers !== 'mac' && music.toHomePods) onPods = (await music.toHomePods({ names: Array.isArray(a.speakers) ? a.speakers : [], volume: a.volume })) === 'set'
    started = await music.playTrack({ name: a.song, volume: a.volume })
  }
  if (started !== 'playing') {
    // nothing is playing, so the room must not sit in silence for the song's length
    if (onPods) await music.releaseSpeakers()
    if (mine !== cakeSeq) return
    log('[cake] the song did not start: the music comes back now, the candles stay for the song\'s length')
    sceneState = { ...sceneState, music: null }
    apply()
    await sleep(seconds * 1000)
    if (mine === cakeSeq) lightsBack()
    return
  }
  if (FAKE) { log('[cake] (fake) the song plays for two seconds here'); await sleep(2000) }
  else if (byShortcut) await sleep(seconds * 1000) // a Home scene's song cannot be followed: the sheet's seconds
  else await followTrack({ name: a.song, seconds, started, nowPlaying: () => music.nowPlaying(), log })
  if (mine !== cakeSeq) return // a newer press has the song now, and the speakers with it
  if (onPods) await music.releaseSpeakers()
  if (mine !== cakeSeq) return
  if (cakeQuiet === mine) { log('[cake] the song was stopped by hand: the lights come back, the music stays off'); lightsBack(); return }
  log('[cake] the song is over: back to the sheet')
  sceneState = afterCake(sceneState)
  apply()
}

// The Orangerie string lights mirror Salem's game (lib/strings.js): woken
// at each flip's own timestamp, and checked ten times a second as well.
const strings = createStringsMirror({ lights: stringLights, colours: stringColours, log, fake: FAKE })
if (!FAKE && !stringLights) log('[strings] not set up in cues/.env: the phones carry Salem\'s colour')

// ---- the night's state ---------------------------------------------------------
let nightId = null
let docs = {}
let state = { hall: null, sound: null }
let sceneState = emptySceneState()
let stops = []

// The Game test tab's Get Off My Lawn! practice, watched all the time (it
// needs no night), so the strings follow it too (lib/strings.js salemToMirror).
let practiceSalem = null

let stringsTimer = null
function mirrorStrings() {
  const now = Date.now()
  const salem = salemToMirror(docs.salem, practiceSalem)
  strings.update(stringsWanted(salem, docs.night, now))
  const next = nextChangeAt(salem, now)
  clearTimeout(stringsTimer)
  stringsTimer = next ? setTimeout(mirrorStrings, next - now) : null
}
setInterval(mirrorStrings, 100)

// The blackout's marks (A1, 11 Nov 2026): the press arrives as a write to the
// night (the music stops at once); the dark and the power are times on it, so
// the brain plans again at each one on its own clock: the Blackout scene, the
// hall bulb and the strings off at the dark mark, all back at the power's.
let marksKey = null
let marksTimers = []
function scheduleMarks() {
  const m = blackoutMarkTimes(docs.night)
  const key = m ? `${m.pressAt}` : null
  if (key === marksKey) return
  marksKey = key
  for (const t of marksTimers) clearTimeout(t)
  marksTimers = []
  if (!m) return
  const now = Date.now()
  // ...and at the moments Jon's two blackout Shortcuts are due (a little before the dark, and at the power's return)
  const due = blackoutShortcutTimes(m, blackoutCfg)
  for (const at of [m.darkAt, m.powerAt, due.darkAt, due.afterAt]) if (at && at > now) marksTimers.push(setTimeout(apply, at - now + 5))
}

// Jon's two Shortcuts for the blackout (12 Nov 2026: "Please use these if it helps make the blackout hit
// hard"; lib/blackoutShortcuts.js says when each runs). "Blackout" is his Home scene with every light in the
// house off, started a little before the dark mark so it lands on it; "AfterBlackOut" brings the house back
// as the power returns. One runner for the two, so the after one always replaces a dark one still waiting on
// Apple Home, and the house is never left dark. A few seconds after the house is back the string lights are
// sent their colour again: his scene has them in it, at full.
const blackoutRunner = createShortcutRunner({ tag: 'blackout', log })
const STRINGS_AGAIN_MS = 4000
let blackoutState = NO_PRESS
function stepBlackout(now) {
  const r = stepBlackoutShortcuts(blackoutState, { marks: blackoutMarkTimes(docs.night), now, cfg: blackoutCfg })
  blackoutState = r.state
  for (const { which, name } of r.run) {
    if (FAKE) log(`[blackout] would run the Shortcut "${name}" (${which === 'dark' ? 'every light in the house off' : 'the house back'})`)
    else {
      log(`[blackout] ${name}`)
      blackoutRunner.fire(name).catch(e => log(`[blackout] the ${name} Shortcut did not run: ${e?.message ?? 'no reason'}`))
    }
    if (which === 'after') setTimeout(() => { strings.forget(); mirrorStrings() }, STRINGS_AGAIN_MS)
  }
}

function apply() {
  const now = Date.now()
  scheduleMarks()
  stepBlackout(now)
  const { actions, state: next } = plan(state, docs, now, { readClip })
  state = next
  const scene = planScenes(sceneState, docs, now, sheet)
  sceneState = scene.state
  for (const a of scene.actions) {
    if (a.type === 'music' && a.do === 'pause' && a.why === 'host') cakeQuiet = cakeSeq // the host's own stop ends a cake song for good
    if (a.type === 'music' && music) { if (a.do === 'play') music.play(a); else music.pause() }
    if (a.type === 'scene' && scenesOn) recallScene(a.name)
    if (a.type === 'projector') projector.set(a.do)
    if (a.type === 'cake') serveCake(a)
  }
  for (const a of actions) {
    if (a.type === 'hall') setHall(a.colour)
    // stamped ahead (the scream, written at the Blackout's press; review 12 Nov 2026): played at its moment, if the
    // doc still names it then (a pause in the lead calls it off)
    if (a.type === 'sound' && a.waitMs > 0) setTimeout(() => { if (stamp(docs.sounds?.current?.at) === a.at) playSound(a) }, a.waitMs)
    else if (a.type === 'sound') playSound(a)
    if (a.type === 'video') log(playLine({ onTv: a.count }))
    if (a.type === 'refused') log(`[sound] refused ${a.count} id outside the catalogue`)
  }
  mirrorStrings()
}

function playSound(a) {
  // every cue brings the music back when it ends, even one with nothing
  // to play here: it may have cut off a cue that had ducked it.
  // The cue's own sound plays here only when the brain speaks after it,
  // or the sheet says "brain" (lib/scenes.js brainPlaysId): the room
  // screens and the phones play it themselves, and twice would be an echo.
  const startedAt = Date.now()
  const here = brainPlaysId(a, sheet)
  const elsewhere = !!a.id && !here
  if (ducksFor(a)) cueStarts(a)
  player.play(here ? a.id : null, a.clips ?? [], { unknown: a.unknown ?? 0, onTv: a.onTv ?? 0, elsewhere, onDone: () => cueEnds(a, startedAt, elsewhere) })
}

// ---- a pretend night, for fake mode with no Firebase ---------------------------
const demo = demoNight()
let demoStep = 0
function stepDemo() {
  const step = demo[demoStep++ % demo.length]
  log(`[demo] ${step.say}`)
  docs = { ...docs, ...step.patch(Date.now()) }
  apply()
  return step
}
if (DEMO) {
  log(`a pretend night, start to finish: no Firebase, ${FAKE ? 'no hardware' : 'the real lights, speakers, Music and projector'}`)
  const pace = Number(env.DEMO_STEP_MS) || (FAKE ? 300 : 3000)
  for (let i = 0; i < demo.length; i++) await sleep(stepDemo().wait ?? pace)
  await music?.idle()
  await projector.idle()
  await sleep(1000)
  log('the pretend night is over')
  process.exit(0)
}

// ---- watching the night ------------------------------------------------------
let auth = null
let db = null
if (!OFFLINE) {
  const app = initializeApp(firebaseConfig)
  auth = getAuth(app)
  db = getFirestore(app)
  // Dev split: MURDERWIN_EMULATOR=1 points this at the local emulators (npm run emulate at the repo root), never the party database.
  if (env.MURDERWIN_EMULATOR === '1') {
    const host = env.MURDERWIN_EMULATOR_HOST || '127.0.0.1'
    connectAuthEmulator(auth, `http://${host}:9099`, { disableWarnings: true })
    connectFirestoreEmulator(db, host, 8080)
    log('emulator mode:', host)
  }
  await signInAnonymously(auth)
}
// The fill-in players' clock (A4, 11 Nov 2026; lib/fillins.js): one call that takes nothing and answers with counts.
const fillIns = db ? autoDriver({ call: await fillInsCall(), sleep, say: log }) : null
async function fillInsCall() {
  const { getFunctions, httpsCallable, connectFunctionsEmulator } = await import('firebase/functions')
  const fns = getFunctions(auth.app, 'us-central1')
  if (env.MURDERWIN_EMULATOR === '1') connectFunctionsEmulator(fns, env.MURDERWIN_EMULATOR_HOST || '127.0.0.1', 5001)
  const call = httpsCallable(fns, 'fillIns', { timeout: 20_000 })
  return async () => { if (!auth.currentUser) await signInAnonymously(auth); return (await call({})).data }
}

// The night doc (act, beat, phase) and five public docs, all readable by any phone.
function watchNight(id) {
  for (const stop of stops) stop()
  stops = []
  docs = {}
  if (!id) { fillIns?.see(null); return }
  stops.push(onSnapshot(doc(db, `nights/${id}`), snap => { docs = { ...docs, night: snap.data() ?? null }; apply(); fillIns?.see(docs.night) }, e => log(`night: ${e.message}`)))
  for (const name of ['cues', 'relay', 'sounds', 'salem', 'study']) {
    stops.push(onSnapshot(doc(db, `nights/${id}/public/${name}`), snap => { docs = { ...docs, [name]: snap.data() ?? null }; apply() }, e => log(`${name}: ${e.message}`)))
  }
}

if (!OFFLINE) {
  onSnapshot(doc(db, 'public_state/game_test_salem'), snap => { practiceSalem = snap.data() ?? null; mirrorStrings() }, e => log(`salem practice: ${e.message}`))
  onSnapshot(doc(db, 'public_state/active'), snap => {
    const id = snap.data()?.nightId ?? null
    if (id === nightId) return
    nightId = id
    log('night:', nightId ?? 'none')
    state = { hall: null, sound: null }
    sceneState = emptySceneState()
    if (!nightId) setHall('free')
    watchNight(nightId)
    heartbeat()
  })
  // once a minute; while the stop's Shortcut is missing, look again first, so
  // the Host tab's line goes within a minute of the Shortcut being made
  setInterval(async () => { if (canStop === false) await checkShortcuts({ quiet: true }); heartbeat() }, PRESENCE_MS)
}

// ---- the heartbeat: a presence row once a minute, so the Host tab's house
// panel shows this relay alive (guest key 'cues'), with the one yes-or-no the
// rules allow: can the brain stop the music (lib/cues.js presenceRow)?
// Nothing else is written. If the house's rules are older than this relay
// and refuse the yes-or-no, the row goes without it rather than not at all.
let plainRow = false
async function heartbeat() {
  const uid = auth?.currentUser?.uid
  if (!uid) return
  const row = presenceRow(nightId, plainRow ? {} : { canStop })
  try { await setDoc(doc(db, 'presence', uid), { ...row, at: serverTimestamp() }) } catch (e) {
    if (!plainRow && 'sound' in row && e?.code === 'permission-denied') {
      plainRow = true
      log('presence: the house\'s rules are older than this relay, so the Host tab cannot be told whether the music can be stopped; the heartbeat carries on without it')
      return heartbeat()
    }
    log('presence:', e.message)
  }
}

let fakeSound = 0
if (FAKE && process.stdin.isTTY) {
  process.stdin.setRawMode(true); process.stdin.resume(); process.stdin.setEncoding('utf8')
  process.stdin.on('data', ch => {
    if (ch === '\u0003') process.exit(0)
    if (ch === 'r') { docs = { ...docs, night: { ...docs.night, phase: 'act' }, cues: { ...docs.cues, hall: 'red' } }; apply() }
    if (ch === 'g') { docs = { ...docs, night: { ...docs.night, phase: 'act' }, cues: { ...docs.cues, hall: 'green' } }; apply() }
    if (ch === 'o') { docs = { ...docs, night: { ...docs.night, phase: 'blackout' } }; apply() }
    if (ch === 'b') {
      // a Blackout press with its three marks, as the server writes them (the dark leadMs on, the power five
      // seconds after that); the marks come off as the power returns. For reading the timeline in this window.
      const t = Date.now()
      const lead = Number(sheet?.blackout?.leadMs) >= 0 ? Number(sheet.blackout.leadMs) : 2000
      docs = { ...docs, night: { act: 1, beat: 'ready', phase: 'act', ...docs.night, blackout: { pressAt: t, darkAt: t + lead, powerAt: t + lead + 5000 } } }
      apply()
      setTimeout(() => { docs = { ...docs, night: { ...docs.night, blackout: null } }; apply() }, lead + 5300)
    }
    if (ch === 's') { docs = { ...docs, sounds: { current: { id: SOUND_IDS[fakeSound++ % SOUND_IDS.length], at: Date.now() } } }; apply() }
    if (ch === 'c') { docs = { ...docs, cues: { ...docs.cues, cake: { at: Date.now() } } }; apply() }
    if (ch === 'n') stepDemo()
  })
  log('fake mode: r hall red · g hall green · o hall off (the blackout) · b the Blackout press with its marks · s the next sound in the catalogue · c Cake! · n the next moment of a pretend night')
}
log('cue relay up', FAKE ? '(fake)' : '', OFFLINE ? '(offline: no Firebase)' : '', `media: ${MEDIA_DIR}`)
for (const line of soundFilesLines(soundReport)) log(`sounds: ${line}`)
log(`recordings: ${recordingFiles(MEDIA_DIR, existsSync)} of ${CLIP_IDS.length} have a file; ${String(env.STATION_KEY ?? '').trim().length >= 4 ? 'STATION_KEY set, coded recordings will play' : 'no STATION_KEY in cues/.env, so only a night with no station key saved plays them'}`)
log(`music: ${musicByShortcuts ? 'on, through Apple Home' : music ? 'on' : 'off'} · Hue scenes: ${scenesOn ? 'on' : 'off'} · projector: ${FAKE ? 'fake' : projectorOn ? 'on, through Apple Home' : 'not set up'} · string lights: ${stringsHow}`)
log(cueSoundsRoad(sheet) === 'brain'
  ? 'cue sounds: this Mac plays every chime, sting and the scream as well as the screens and phones (cues/scenes.json cueSounds is "brain": expect an echo)'
  : 'cue sounds: the room screens and the phones play the chimes, the stings and the scream; this Mac speaks bulletin 2 only')
// Which of the Shortcuts the brain runs are not on this Mac (it only reads the
// list). Then, with the music through the Music app and a cake on the sheet:
// is the song there? Both before the guests come, not at the moment itself.
if (shortcutNames.length || blackoutSheet.dark || blackoutSheet.after) { await checkShortcuts(); heartbeat() }
if (!FAKE && sheet?.cake && musicApp && !(musicByShortcuts && shortcutsFor(sheet.musicShortcuts, 'cake').length)) {
  musicApp.hasTrack(sheet.cake.song).then(has => {
    if (has === false) log(`[cake] NO SONG called "${sheet.cake.song}" in the Music library on this Mac: Cake! will light the candles and play nothing. Add the song (docs/cues-relay.md)`)
    else if (has === true) log('[cake] the song is in the Music library')
  })
}
