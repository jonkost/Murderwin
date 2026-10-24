// The study station. Runs on the M1 MacBook Air in the study all night.
// Owns the two Nanoleaf walls and the Stream Deck, runs the light game
// (lib/study.js through lib/runner.js), and tells the server where the group
// is up to. It never handles a clue: when a group finishes it says "group G
// is done" and the server deals the clue to their phones. docs/study-light-game.md.
// The workshop's Study test page drives it from a phone too (lib/testmode.js):
// a flash, teaching the taps, and a practice round that never reaches a night.
//
//   npm start          the real walls and deck (station/.env)
//   npm run fake       no hardware: the terminal stands in
//     keys  q w e r t y u i o p → touch panels 1–10
//           R Y G B P W        → colour keys     1–6 → number keys
//           -  → undo           Enter → submit    x → reset the station

import { readFileSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { initializeApp } from 'firebase/app'
import { getAuth, signInAnonymously } from 'firebase/auth'
import { getFirestore, doc, onSnapshot } from 'firebase/firestore'
import { getFunctions, httpsCallable } from 'firebase/functions'
import { createRunner } from './lib/runner.js'
import { createFollower } from './lib/follow.js'
import { createTestMode, HEARTBEAT_MS } from './lib/testmode.js'
import { writeTouchMap } from './lib/teach.js'
import { Nanoleaf } from './lib/nanoleaf.js'
import { connectAuthEmulator } from 'firebase/auth'
import { connectFirestoreEmulator } from 'firebase/firestore'
import { connectFunctionsEmulator } from 'firebase/functions'
import { openDeck } from './lib/streamdeck.js'
import { FakeWall, FakeDeck } from './lib/fakes.js'

const here = dirname(fileURLToPath(import.meta.url))
const FAKE = process.argv.includes('--fake')
const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a)

// ---- settings ----------------------------------------------------------
// KEY=value lines; a trailing space or a pair of quotes around the value is forgiven.
function loadEnv() {
  const p = join(here, '.env')
  if (!existsSync(p)) return {}
  const out = {}
  for (const line of readFileSync(p, 'utf8').split('\n')) {
    const m = /^\s*([A-Z_]+)\s*=\s*(.*)$/.exec(line)
    if (m && !line.trim().startsWith('#')) out[m[1]] = m[2].trim().replace(/^(["'])(.*)\1$/, '$2')
  }
  return out
}
const env = { ...loadEnv(), ...process.env }
const STATION_KEY = env.STATION_KEY ?? ''

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

// ---- devices -------------------------------------------------------------
// Which hexagon each tap names, taught once on the real wall (the workshop's
// Study test page, or npm run teach-touch).
function loadTouchMap() {
  const p = join(here, 'touch-map.json')
  if (!existsSync(p)) return {}
  try { return JSON.parse(readFileSync(p, 'utf8')).touches ?? {} } catch (e) { log('touch-map.json unreadable:', e.message); return {} }
}

async function openWalls() {
  if (FAKE) {
    return {
      elements: new FakeWall({ name: 'elements', panelIds: [11, 12, 13, 14, 15, 16, 17, 18, 19], log }),
      lines: new FakeWall({ name: 'lines', panelIds: [21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31], log }),
    }
  }
  const elements = new Nanoleaf({ host: env.NANOLEAF_ELEMENTS_HOST, token: env.NANOLEAF_ELEMENTS_TOKEN, name: 'elements', log, touchMap: loadTouchMap() })
  const lines = new Nanoleaf({ host: env.NANOLEAF_LINES_HOST, token: env.NANOLEAF_LINES_TOKEN, name: 'lines', log })
  return { elements, lines }
}

// ---- main ----------------------------------------------------------------
const app = initializeApp(firebaseConfig)
const auth = getAuth(app)
const db = getFirestore(app)
const fns = getFunctions(app, 'us-central1')
const callStation = httpsCallable(fns, 'stationCommand')
const callStudyTest = httpsCallable(fns, 'studyTest')
// Dev split: MURDERWIN_EMULATOR=1 points this at the local emulators (npm run emulate at the repo root), never the party database.
if (env.MURDERWIN_EMULATOR === '1') {
  const host = env.MURDERWIN_EMULATOR_HOST || '127.0.0.1'
  connectAuthEmulator(auth, `http://${host}:9099`, { disableWarnings: true })
  connectFirestoreEmulator(db, host, 8080)
  connectFunctionsEmulator(fns, host, 5001)
  log('emulator mode:', host)
}

const { elements, lines } = await openWalls()
let elementsOk = true, linesOk = true
try { await elements.loadLayout(); await elements.on(true) } catch (e) { elementsOk = false; log('elements: cannot reach the wall;', e.message) }
try { await lines.loadLayout(); await lines.on(true) } catch (e) { linesOk = false; log('lines: cannot reach the wall;', e.message) }
log(`elements: ${elements.panels.length} panels (${elements.pieces?.length ?? elements.panels.length} lights, taps taught for ${elements.taughtPanels ?? elements.panels.length})${elementsOk ? '' : ' (DOWN, fallback: numbers on the button box)'}; lines: ${lines.panels.length} bars (${lines.pieces?.length ?? lines.panels.length} pieces)${linesOk ? '' : ' (DOWN, fallback: on screen)'}`)

const realDeck = FAKE ? null : await openDeck({ log })
const deck = realDeck ?? new FakeDeck({ log })

// With the Elements down, the button box's number keys stand in for the
// first six panels, so the game stays the same game.
const panelIds = elementsOk ? elements.panels.map(p => p.id) : [1, 2, 3, 4, 5, 6]
const layout = elementsOk
  ? elements.panels.map(p => ({ id: p.id, x: p.x, y: p.y }))
  : panelIds.map((id, i) => ({ id, x: i * 100, y: 0 }))

const watchDoc = (path, onData) => onSnapshot(doc(db, ...path.split('/')), (snap) => onData(snap.data() ?? null), (e) => log(`${path}: ${e.message}`))

// The study test (the workshop's Study test page). Taps and keys pass
// through it: to the live runner as before, unless a test is running.
const testMode = createTestMode({
  elements, lines, deck, elementsOk, linesOk, panelIds, layout,
  deckKind: realDeck ? 'stream-deck' : 'keyboard',
  live: () => runner,
  send: (status) => callStudyTest({ command: 'status', key: STATION_KEY, status }),
  watch: watchDoc,
  saveTouchMap: (touches) => writeTouchMap(join(here, 'touch-map.json'), touches),
  log,
})

const runner = createRunner({
  elements: testMode.shield(elements), lines: testMode.shield(lines), deck: testMode.shield(deck),
  elementsOk, linesOk, panelIds, layout, callStation, stationKey: STATION_KEY, log,
})

// ---- inputs ----------------------------------------------------------------
elements.listenTouch((panelId, gesture, tapId) => testMode.touch(panelId, gesture, tapId))
deck.onKey((name) => testMode.key(name))

// ---- the clock, and which night and group are live --------------------------
setInterval(() => { runner.tick(); testMode.tick() }, 1000)
setInterval(() => runner.sendState(), 30_000)   // a heartbeat, so the kiosk knows the station is alive
setInterval(() => testMode.heartbeat(), HEARTBEAT_MS) // and the workshop's Study test page

await signInAnonymously(auth)
// Which night is live, and which group is due in it (the server's rotation
// owns that; this station only reads it). Settings ride on the same doc.
const follower = createFollower({ runner, log, watch: watchDoc })
follower.start()
testMode.start()

// ---- the terminal stands in for the hardware in fake mode, and for the
// button box whenever no Stream Deck is plugged in (a test round on the walls
// from any Mac). The panel keys touch the game's panels in the kiosk map's
// order, so a wall whose taps do not come through can still be played.
if ((FAKE || !realDeck) && process.stdin.isTTY) {
  process.stdin.setRawMode(true)
  process.stdin.resume()
  process.stdin.setEncoding('utf8')
  const panelKeys = 'qwertyuiop'
  const colourKeys = { R: 'red', Y: 'yellow', G: 'green', B: 'blue', P: 'pink', W: 'white' }
  process.stdin.on('data', (ch) => {
    if (ch === '\u0003') process.exit(0)
    if (panelKeys.includes(ch)) { const id = panelIds[panelKeys.indexOf(ch)]; if (id != null) testMode.touch(id, 0) }
    else if (colourKeys[ch]) deck.press(colourKeys[ch])
    else if (/^[1-6]$/.test(ch)) deck.press(ch)
    else if (ch === '-') deck.press('undo')
    else if (ch === '\r' || ch === '\n') deck.press('submit')
    else if (ch === 'x') runner.reset()
  })
  log(`${FAKE ? 'fake mode' : 'no Stream Deck, the keyboard stands in'}: q–p touch panels 1–${Math.min(panelKeys.length, panelIds.length)} · R Y G B P W colours · 1–6 numbers · - undo · Enter submit · x reset`)
}
runner.drain()
log('study station up', FAKE ? '(fake walls)' : '')
