// The cue relay. Runs on the game-server Mac (the M3 Air, "the brain") all
// night. It reads the public night state that any phone may read, and does
// a handful of dumb things: sets the bulb outside the bedroom green, off,
// red or green, plays a sound file named after whatever event id arrives,
// runs Apple Music (a playlist per moment, quiet under every cue, cut for the
// newscast, the birthday song for Cake!), recalls Hue scenes by name,
// switches the projector's plug through Apple Home, and mirrors Salem's game
// colour on the Orangerie string lights. It never calls a Cloud Function,
// never reads anything sealed, and never knows what a cue means.
// docs/cues-relay.md. Brought to Jon's cue list on 25 Oct 2026.
//
//   npm start                 the real bridge, speakers, Music, projector and strings (cues/.env)
//   npm start -- --lights     list the bridge's lights and their ids, then quit
//   npm start -- --scenes     list the bridge's scenes and check the six Murderwin ones, then quit
//   npm start -- --scene "Murderwin Default"   recall one scene, then quit
//   npm start -- --check-music      play each playlist and the cake's song a few seconds, duck, stop, then quit
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
import { plan, parseEnv, bridgeHostProblem, presenceRow, PRESENCE_MS, SOUND_IDS, CLIP_IDS, soundFileReport, soundFilesLines, recordingFiles, clipReader, playLine } from './lib/cues.js'
import { createPlayer } from './lib/player.js'
import { connectAuthEmulator } from 'firebase/auth'
import { connectFirestoreEmulator } from 'firebase/firestore'
import { Hue, sameSceneName } from './lib/hue.js'
import { planScenes, emptySceneState, sceneProblems, sceneNames, playlistNamesOf, ducksFor, unduckDelayMs, afterCake } from './lib/scenes.js'
import { createMusic, followTrack } from './lib/music.js'
import { StringLights, ShortcutLights, shortcutColours, STRING_SHORTCUTS, createStringsMirror, stringsColour, nextChangeAt, DEFAULT_STRING_COLOURS, createProjectorSwitch, projectorShortcutNames } from './lib/strings.js'
import { demoNight } from './lib/demo.js'

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
const CHECK_STRINGS = has('--check-strings')
const CHECK_PROJECTOR = has('--check-projector')
const TOOL = LIST || SCENES || ONE_SCENE !== null || CHECK_MUSIC || CHECK_STRINGS || CHECK_PROJECTOR
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

// The string lights: paired straight to their Nanoleaf controller, or through
// Apple Home with three Shortcuts on this Mac (STRINGS_SHORTCUTS=on, lib/strings.js).
let stringLights = null
let stringColours = sheet?.strings ?? DEFAULT_STRING_COLOURS
const stringsByShortcuts = !FAKE && onSwitch(env.STRINGS_SHORTCUTS)
if (!FAKE && env.NANOLEAF_STRINGS_HOST && env.NANOLEAF_STRINGS_TOKEN) {
  stringLights = new StringLights({ host: env.NANOLEAF_STRINGS_HOST.trim(), token: env.NANOLEAF_STRINGS_TOKEN.trim() })
} else if (stringsByShortcuts) {
  stringLights = new ShortcutLights()
  // a Shortcut renamed on the Mac is named here, never in the code
  const named = c => String(env[`STRINGS_SHORTCUT_${c.toUpperCase()}`] ?? '').trim() || STRING_SHORTCUTS[c]
  stringColours = shortcutColours({ red: named('red'), green: named('green'), decor: named('decor') })
}

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
const music = sheet && !offSwitch(env.MUSIC) ? createMusic({ fake: FAKE, log, whisper: sheet.whisper }) : null
if (sheet && !music) log('[music] off (MUSIC=off in cues/.env): run the Music app by hand')

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
let unduckTimer = null
function cueStarts() {
  clearTimeout(unduckTimer); unduckTimer = null
  music?.duck()
}
function cueEnds(action, startedAt) {
  clearTimeout(unduckTimer)
  unduckTimer = setTimeout(() => { unduckTimer = null; music?.unduck() }, unduckDelayMs(action, startedAt, Date.now(), sheet))
}

// Cake! (25 Oct 2026, cue 13): the one song from the Music library on every
// HomePod, then, when it ends (or after the sheet's `seconds` if Music
// cannot be read), the sheet's music and scene come back. A second press
// while the song plays starts it again and forgets the first.
let cakeSeq = 0
async function serveCake(a) {
  const mine = ++cakeSeq
  let started = 'missing'
  if (music) started = await music.playTrack({ name: a.song, volume: a.volume })
  else log('[cake] MUSIC=off in cues/.env: play the song in the Music app by hand')
  if (FAKE) { log('[cake] (fake) the song plays for two seconds here'); await sleep(2000) }
  else await followTrack({ name: a.song, seconds: a.seconds, started, nowPlaying: () => (music ? music.nowPlaying() : Promise.resolve(null)), log })
  if (mine !== cakeSeq) return
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

let stringsTimer = null
function mirrorStrings() {
  const now = Date.now()
  strings.update(stringsColour(docs.salem, now))
  const next = nextChangeAt(docs.salem, now)
  clearTimeout(stringsTimer)
  stringsTimer = next ? setTimeout(mirrorStrings, next - now) : null
}
setInterval(mirrorStrings, 100)

function apply() {
  const now = Date.now()
  const { actions, state: next } = plan(state, docs, now, { readClip })
  state = next
  const scene = planScenes(sceneState, docs, now, sheet)
  sceneState = scene.state
  for (const a of scene.actions) {
    if (a.type === 'music' && music) { if (a.do === 'play') music.play(a); else music.pause() }
    if (a.type === 'scene' && scenesOn) recallScene(a.name)
    if (a.type === 'projector') projector.set(a.do)
    if (a.type === 'cake') serveCake(a)
  }
  for (const a of actions) {
    if (a.type === 'hall') setHall(a.colour)
    if (a.type === 'sound') {
      // every cue brings the music back when it ends, even one with nothing
      // to play here: it may have cut off a cue that had ducked it
      const startedAt = Date.now()
      if (ducksFor(a)) cueStarts()
      player.play(a.id, a.clips ?? [], { unknown: a.unknown ?? 0, onTv: a.onTv ?? 0, onDone: () => cueEnds(a, startedAt) })
    }
    if (a.type === 'video') log(playLine({ onTv: a.count }))
    if (a.type === 'refused') log(`[sound] refused ${a.count} id outside the catalogue`)
  }
  mirrorStrings()
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

// The night doc (act, beat, phase) and five public docs, all readable by any phone.
function watchNight(id) {
  for (const stop of stops) stop()
  stops = []
  docs = {}
  if (!id) return
  stops.push(onSnapshot(doc(db, `nights/${id}`), snap => { docs = { ...docs, night: snap.data() ?? null }; apply() }, e => log(`night: ${e.message}`)))
  for (const name of ['cues', 'relay', 'sounds', 'salem', 'study']) {
    stops.push(onSnapshot(doc(db, `nights/${id}/public/${name}`), snap => { docs = { ...docs, [name]: snap.data() ?? null }; apply() }, e => log(`${name}: ${e.message}`)))
  }
}

if (!OFFLINE) {
  onSnapshot(doc(db, 'public_state/active'), snap => {
    const id = snap.data()?.nightId ?? null
    if (id === nightId) return
    nightId = id
    log('night:', nightId ?? 'none')
    state = { hall: null, sound: null }
    sceneState = emptySceneState()
    watchNight(nightId)
    heartbeat()
  })
  setInterval(heartbeat, PRESENCE_MS)
}

// ---- the heartbeat: a presence row once a minute, so the Host tab's house
// panel shows this relay alive (guest key 'cues'). Nothing else is written.
async function heartbeat() {
  const uid = auth?.currentUser?.uid
  if (!uid) return
  try { await setDoc(doc(db, 'presence', uid), { ...presenceRow(nightId), at: serverTimestamp() }) } catch (e) { log('presence:', e.message) }
}

let fakeSound = 0
if (FAKE && process.stdin.isTTY) {
  process.stdin.setRawMode(true); process.stdin.resume(); process.stdin.setEncoding('utf8')
  process.stdin.on('data', ch => {
    if (ch === '\u0003') process.exit(0)
    if (ch === 'r') { docs = { ...docs, night: { ...docs.night, phase: 'act' }, cues: { ...docs.cues, hall: 'red' } }; apply() }
    if (ch === 'g') { docs = { ...docs, night: { ...docs.night, phase: 'act' }, cues: { ...docs.cues, hall: 'green' } }; apply() }
    if (ch === 'o') { docs = { ...docs, night: { ...docs.night, phase: 'blackout' } }; apply() }
    if (ch === 's') { docs = { ...docs, sounds: { current: { id: SOUND_IDS[fakeSound++ % SOUND_IDS.length], at: Date.now() } } }; apply() }
    if (ch === 'c') { docs = { ...docs, cues: { ...docs.cues, cake: { at: Date.now() } } }; apply() }
    if (ch === 'n') stepDemo()
  })
  log('fake mode: r hall red · g hall green · o hall off (the blackout) · s the next sound in the catalogue · c Cake! · n the next moment of a pretend night')
}
log('cue relay up', FAKE ? '(fake)' : '', OFFLINE ? '(offline: no Firebase)' : '', `media: ${MEDIA_DIR}`)
for (const line of soundFilesLines(soundReport)) log(`sounds: ${line}`)
log(`recordings: ${recordingFiles(MEDIA_DIR, existsSync)} of ${CLIP_IDS.length} have a file; ${String(env.STATION_KEY ?? '').trim().length >= 4 ? 'STATION_KEY set, coded recordings will play' : 'no STATION_KEY in cues/.env, so only a night with no station key saved plays them'}`)
log(`music: ${music ? 'on' : 'off'} · Hue scenes: ${scenesOn ? 'on' : 'off'} · projector: ${FAKE ? 'fake' : projectorOn ? 'on, through Apple Home' : 'not set up'} · string lights: ${FAKE ? 'fake' : stringLights ? (stringsByShortcuts && !env.NANOLEAF_STRINGS_TOKEN ? 'on, through Apple Home' : 'on') : 'not set up'}`)
