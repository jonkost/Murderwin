// The cue relay. Runs on the game-server Mac (the M3 Air, "the brain") all
// night. It reads the public night state that any phone may read, and does
// two dumb things: sets the bulb outside the bedroom red or green, and plays
// a sound file named after whatever event id arrives. It never calls a Cloud
// Function, never reads anything sealed, and never knows what a cue means.
// docs/cues-relay.md.
//
//   npm start            the real bridge and speaker (cues/.env)
//   npm start -- --lights   list the bridge's lights and their ids, then quit
//   npm run fake         no hardware: prints what it would do
//     keys in fake mode: r → hall red, g → hall green, s → a test sound id

import { readFileSync, existsSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawn } from 'node:child_process'
import { initializeApp } from 'firebase/app'
import { getAuth, signInAnonymously } from 'firebase/auth'
import { getFirestore, doc, onSnapshot, setDoc, serverTimestamp } from 'firebase/firestore'
import { plan, soundCandidates, parseEnv, bridgeHostProblem, presenceRow, PRESENCE_MS } from './lib/cues.js'
import { connectAuthEmulator } from 'firebase/auth'
import { connectFirestoreEmulator } from 'firebase/firestore'
import { Hue } from './lib/hue.js'

const here = dirname(fileURLToPath(import.meta.url))
const FAKE = process.argv.includes('--fake')
const LIST = process.argv.includes('--lights')
const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a)

function loadEnv() {
  const p = join(here, '.env')
  return existsSync(p) ? parseEnv(readFileSync(p, 'utf8')) : {}
}
const env = { ...loadEnv(), ...process.env }
const MEDIA_DIR = resolve(here, env.MEDIA_DIR || '../media')

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

// ---- the two things it can do --------------------------------------------
let hue = null
if (!FAKE) {
  const problem = bridgeHostProblem(env.HUE_BRIDGE_HOST)
  if (problem) log(`${problem} (cues/.env) — the hall light is off duty; the TV announces the door anyway`)
  else {
    try { hue = new Hue({ host: env.HUE_BRIDGE_HOST, key: env.HUE_APP_KEY, log }) } catch (e) { log(e.message, '— the hall light is off duty; the TV announces the door anyway') }
  }
}
if (LIST) {
  if (!hue) { console.log('fill HUE_BRIDGE_HOST and HUE_APP_KEY in cues/.env first'); process.exit(2) }
  const lights = await hue.lights()
  for (const l of lights) console.log(`${l.id}  ${l.name}`)
  process.exit(0)
}

let wantHall = null
async function setHall(colour) {
  wantHall = colour
  if (FAKE || !hue) { log(`[hall] would turn ${colour}`); return }
  if (!env.HUE_HALL_LIGHT_ID) { log('[hall] no HUE_HALL_LIGHT_ID set'); return }
  try { await hue.setLight(env.HUE_HALL_LIGHT_ID, colour); log(`[hall] ${colour}`) } catch (e) { log(`[hall] ${colour} failed (${e.message}); retrying`) }
}
// keep trying until the bulb agrees
setInterval(() => { if (wantHall && !FAKE && hue) setHall(wantHall) }, 5000)

function playSound(id) {
  const file = soundCandidates(MEDIA_DIR, id).find(f => existsSync(f))
  if (!file) { log(`[sound] no file for ${id}`); return }
  if (FAKE) { log(`[sound] would play ${file}`); return }
  const p = spawn('afplay', [file], { stdio: 'ignore' })
  p.on('error', e => log(`[sound] ${id} failed: ${e.message}`))
  log(`[sound] ${id}`)
}

// ---- watching the night ------------------------------------------------------
const app = initializeApp(firebaseConfig)
const auth = getAuth(app)
const db = getFirestore(app)
// Dev split: MURDERWIN_EMULATOR=1 points this at the local emulators (npm run emulate at the repo root), never the party database.
if (env.MURDERWIN_EMULATOR === '1') {
  const host = env.MURDERWIN_EMULATOR_HOST || '127.0.0.1'
  connectAuthEmulator(auth, `http://${host}:9099`, { disableWarnings: true })
  connectFirestoreEmulator(db, host, 8080)
  log('emulator mode:', host)
}
await signInAnonymously(auth)

let nightId = null
let docs = {}
let state = { hall: null, sound: null }
let stops = []

function apply() {
  const { actions, state: next } = plan(state, docs, Date.now())
  state = next
  for (const a of actions) {
    if (a.type === 'hall') setHall(a.colour)
    if (a.type === 'sound') playSound(a.id)
  }
}

function watchNight(id) {
  for (const stop of stops) stop()
  stops = []
  docs = {}
  if (!id) return
  for (const name of ['cues', 'relay', 'sounds']) {
    stops.push(onSnapshot(doc(db, `nights/${id}/public/${name}`), snap => { docs = { ...docs, [name]: snap.data() ?? null }; apply() }, e => log(`${name}: ${e.message}`)))
  }
}

onSnapshot(doc(db, 'public_state/active'), snap => {
  const id = snap.data()?.nightId ?? null
  if (id === nightId) return
  nightId = id
  log('night:', nightId ?? 'none')
  state = { hall: null, sound: null }
  watchNight(nightId)
  heartbeat()
})

// ---- the heartbeat: a presence row once a minute, so the Host tab's house
// panel shows this relay alive (guest key 'cues'). Nothing else is written.
async function heartbeat() {
  const uid = auth.currentUser?.uid
  if (!uid) return
  try { await setDoc(doc(db, 'presence', uid), { ...presenceRow(nightId), at: serverTimestamp() }) } catch (e) { log('presence:', e.message) }
}
setInterval(heartbeat, PRESENCE_MS)

if (FAKE && process.stdin.isTTY) {
  process.stdin.setRawMode(true); process.stdin.resume(); process.stdin.setEncoding('utf8')
  process.stdin.on('data', ch => {
    if (ch === '\u0003') process.exit(0)
    if (ch === 'r') { docs = { ...docs, cues: { hall: 'red' } }; apply() }
    if (ch === 'g') { docs = { ...docs, cues: { hall: 'green' } }; apply() }
    if (ch === 's') { docs = { ...docs, sounds: { current: { id: 'TEST', at: Date.now() } } }; apply() }
  })
  log('fake mode: r hall red · g hall green · s test sound')
}
log('cue relay up', FAKE ? '(fake)' : '', `media: ${MEDIA_DIR}`)
