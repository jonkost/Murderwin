// The study station. Runs on the M1 MacBook Air in the study all night.
// Owns the two Nanoleaf walls and the Stream Deck, runs the light game
// (lib/study.js), and tells the server where the group is up to. It never
// handles a clue: when a group finishes it says "group G is done" and the
// server deals the clue to their phones. docs/study-light-game.md.
//
//   npm start          the real walls and deck (station/.env)
//   npm run fake       no hardware: the terminal stands in
//     keys  q w e r t y u i o  → touch panels 1–9
//           R Y G B P W        → colour keys     1–6 → number keys
//           -  → undo           Enter → submit    x → reset the station

import { readFileSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { initializeApp } from 'firebase/app'
import { getAuth, signInAnonymously } from 'firebase/auth'
import { getFirestore, doc, onSnapshot } from 'firebase/firestore'
import { getFunctions, httpsCallable } from 'firebase/functions'
import { createStudy, COLOURS } from './lib/study.js'
import { Nanoleaf, COLOUR_RGB, countSegments } from './lib/nanoleaf.js'
import { openDeck } from './lib/streamdeck.js'
import { FakeWall, FakeDeck } from './lib/fakes.js'

const here = dirname(fileURLToPath(import.meta.url))
const FAKE = process.argv.includes('--fake')
const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a)

// ---- settings ----------------------------------------------------------
function loadEnv() {
  const p = join(here, '.env')
  if (!existsSync(p)) return {}
  const out = {}
  for (const line of readFileSync(p, 'utf8').split('\n')) {
    const m = /^\s*([A-Z_]+)\s*=\s*(.*)\s*$/.exec(line)
    if (m && !line.trim().startsWith('#')) out[m[1]] = m[2]
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

// ---- devices -------------------------------------------------------------
async function openWalls() {
  if (FAKE) {
    return {
      elements: new FakeWall({ name: 'elements', panelIds: [11, 12, 13, 14, 15, 16, 17, 18, 19], log }),
      lines: new FakeWall({ name: 'lines', panelIds: [21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31], log }),
    }
  }
  const elements = new Nanoleaf({ host: env.NANOLEAF_ELEMENTS_HOST, token: env.NANOLEAF_ELEMENTS_TOKEN, name: 'elements', log })
  const lines = new Nanoleaf({ host: env.NANOLEAF_LINES_HOST, token: env.NANOLEAF_LINES_TOKEN, name: 'lines', log })
  return { elements, lines }
}

const sleep = (ms) => new Promise(r => setTimeout(r, ms))
const DIM = [40, 40, 40], LIT = [255, 255, 255], OFF = [0, 0, 0]
function allPanels(wall, rgb) { return Object.fromEntries(wall.panels.map(p => [p.id, rgb])) }

// ---- main ----------------------------------------------------------------
const app = initializeApp(firebaseConfig)
const auth = getAuth(app)
const db = getFirestore(app)
const fns = getFunctions(app, 'us-central1')
const callStation = httpsCallable(fns, 'stationCommand')

const { elements, lines } = await openWalls()
let elementsOk = true, linesOk = true
try { await elements.loadLayout(); await elements.on(true) } catch (e) { elementsOk = false; log('elements: cannot reach the wall;', e.message) }
try { await lines.loadLayout(); await lines.on(true) } catch (e) { linesOk = false; log('lines: cannot reach the wall;', e.message) }
log(`elements: ${elements.panels.length} panels${elementsOk ? '' : ' (DOWN, fallback: numbers on the button box)'}; lines: ${lines.panels.length} bars${linesOk ? '' : ' (DOWN, fallback: on screen)'}`)

const deck = FAKE ? new FakeDeck({ log }) : (await openDeck({ log })) ?? new FakeDeck({ log })

// With the Elements down, the button box's number keys stand in for the
// first six panels, so the game stays the same game.
const panelIds = elementsOk ? elements.panels.map(p => p.id) : [1, 2, 3, 4, 5, 6]
const layout = elementsOk
  ? elements.panels.map(p => ({ id: p.id, x: p.x, y: p.y }))
  : panelIds.map((id, i) => ({ id, x: i * 100, y: 0 }))

let nightId = null
let groupId = null
let skew = 0
const serverNow = () => Date.now() + skew
let machine = createStudy({ panelIds, groupId })
let granolia = null

// ---- effects ------------------------------------------------------------
let queue = Promise.resolve()
const run = (fn) => { queue = queue.then(fn).catch(e => log('effect failed:', e?.message ?? e)); return queue }

async function safe(wall, flag, fn) {
  try { await fn() } catch (e) { log(`${wall.name}: ${e?.message ?? e}`) }
}

function sendState(extra = {}) {
  if (!nightId) return
  const snap = machine.snapshot
  const payload = {
    ...snap, layout, elementsOk, linesOk, granolia, ...extra,
    fallbackPattern: !elementsOk && (snap.state === 'playing' || snap.state === 'reproducing') ? currentPatternIndexes() : null,
  }
  callStation({ nightId, key: STATION_KEY, station: 'study', command: 'state', payload })
    .then(r => { if (r.data?.serverTime) skew = r.data.serverTime - Date.now() })
    .catch(e => log('state not sent:', e?.message ?? e))
}
function currentPatternIndexes() {
  const p = machine.patterns?.[machine.snapshot.round]?.[machine.snapshot.pattern] ?? []
  return p.map(id => panelIds.indexOf(id) + 1)
}

async function apply(e) {
  switch (e.type) {
    case 'elements.rest': return safe(elements, elementsOk, () => elements.frame(allPanels(elements, DIM), 10))
    case 'elements.dim': return safe(elements, elementsOk, async () => { await elements.frame(allPanels(elements, OFF), 2); await sleep(500); await elements.frame(allPanels(elements, DIM), 3) })
    case 'elements.pulse': return safe(elements, elementsOk, async () => { await elements.frame({ ...allPanels(elements, DIM), [e.panel]: LIT }, 1); await sleep(160); await elements.frame(allPanels(elements, DIM), 2) })
    case 'elements.ripple':
    case 'elements.celebrate': return safe(elements, elementsOk, async () => { await elements.frame(allPanels(elements, LIT), 2); await sleep(e.type === 'elements.celebrate' ? 1200 : 400); await elements.frame(allPanels(elements, DIM), 5) })
    case 'elements.replay': return sleep(400)
    case 'elements.play': {
      await sleep(500)
      for (const id of e.panels) {
        await safe(elements, elementsOk, () => elements.frame({ ...allPanels(elements, DIM), [id]: LIT }, 1))
        await sleep(e.onMs)
        await safe(elements, elementsOk, () => elements.frame(allPanels(elements, DIM), 1))
        await sleep(e.gapMs)
      }
      machine.played(serverNow())
      return drain()
    }
    case 'lines.rest': return safe(lines, linesOk, () => lines.frame(allPanels(lines, [20, 10, 30]), 10))
    case 'lines.show': {
      const ids = countSegments(lines.panels.map(p => p.id), e.number)
      const frame = allPanels(lines, OFF)
      for (const id of ids) frame[id] = COLOUR_RGB[e.colour]
      return safe(lines, linesOk, () => lines.frame(frame, 3))
    }
    case 'lines.celebrate': return safe(lines, linesOk, async () => { await lines.frame(allPanels(lines, LIT), 2); await sleep(1200); await lines.frame(allPanels(lines, [20, 10, 30]), 8) })
    case 'deck.on': return deck.paint(true)
    case 'deck.off': return deck.paint(false)
    case 'deck.shiver': return deck.shiver()
    case 'wait': return sleep(e.ms)
    case 'granolia': granolia = { ...e, at: serverNow() }; return
    case 'screen': return sendState()
    case 'server.finished': {
      log(`group ${e.groupId ?? '?'} finished: ${e.outcome}, ${e.pairs} pairs, ${e.seconds}s`)
      if (!nightId) return
      try {
        await callStation({ nightId, key: STATION_KEY, station: 'study', command: 'finished', payload: { groupId: e.groupId, outcome: e.outcome, seconds: e.seconds, pairs: e.pairs } })
      } catch (err) { log('finished not sent (will retry):', err?.message ?? err); pendingFinished = e }
      // the walls rest, then the station is ready for the next group
      await sleep(20_000)
      granolia = null
      machine = createStudy({ panelIds, groupId })
      return drain()
    }
    default: return
  }
}
let pendingFinished = null
function drain() {
  const fx = machine.drain()
  for (const e of fx) run(() => apply(e))
  return queue
}

// ---- inputs ----------------------------------------------------------------
elements.listenTouch((panelId, gesture) => {
  if (gesture !== 0 && gesture !== 1) return   // taps only; swipes are the app's business
  machine.touch(panelId, serverNow())
  drain()
})
deck.onKey((name) => {
  if (!elementsOk && /^[1-6]$/.test(name) && machine.state !== 'entering') {
    machine.touch(Number(name), serverNow())   // fallback: numbers are panels
  } else {
    machine.key(name, serverNow())
  }
  drain()
})

// ---- the clock, retries, and which group is due ---------------------------
setInterval(() => {
  machine.tick(serverNow())
  drain()
  if (pendingFinished && nightId) {
    const e = pendingFinished; pendingFinished = null
    callStation({ nightId, key: STATION_KEY, station: 'study', command: 'finished', payload: { groupId: e.groupId, outcome: e.outcome, seconds: e.seconds, pairs: e.pairs } })
      .catch(() => { pendingFinished = e })
  }
}, 1000)
setInterval(() => sendState(), 30_000)   // a heartbeat, so the kiosk knows the station is alive

await signInAnonymously(auth)
onSnapshot(doc(db, 'public_state/active'), (snap) => {
  const id = snap.data()?.nightId ?? null
  if (id !== nightId) { nightId = id; log('night:', nightId ?? 'none'); sendState() }
})
let stopRotation = null
setInterval(() => {
  if (!nightId || stopRotation) return
  const id = nightId
  stopRotation = onSnapshot(doc(db, `nights/${id}/public/study`), (snap) => {
    const next = snap.data()?.groupId ?? null
    if (next !== groupId && machine.state === 'idle') {
      groupId = next
      machine = createStudy({ panelIds, groupId })
      log('next group:', groupId ?? 'none')
      drain()
    }
  })
}, 2000)

// ---- the terminal stands in for the hardware in fake mode ----------------
if (FAKE && process.stdin.isTTY) {
  process.stdin.setRawMode(true)
  process.stdin.resume()
  process.stdin.setEncoding('utf8')
  const panelKeys = 'qwertyuio'
  const colourKeys = { R: 'red', Y: 'yellow', G: 'green', B: 'blue', P: 'pink', W: 'white' }
  process.stdin.on('data', (ch) => {
    if (ch === '\u0003') process.exit(0)
    if (panelKeys.includes(ch)) elements.touch(panelKeys.indexOf(ch) + 1)
    else if (colourKeys[ch]) deck.press(colourKeys[ch])
    else if (/^[1-6]$/.test(ch)) deck.press(ch)
    else if (ch === '-') deck.press('undo')
    else if (ch === '\r' || ch === '\n') deck.press('submit')
    else if (ch === 'x') { machine = createStudy({ panelIds, groupId }); granolia = null; drain() }
  })
  log('fake mode: q–o touch panels 1–9 · R Y G B P W colours · 1–6 numbers · - undo · Enter submit · x reset')
}
drain()
log('study station up', FAKE ? '(fake walls)' : '')
