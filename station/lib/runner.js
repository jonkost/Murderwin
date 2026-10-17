// The study station's runner: carries out the machine's effects (lib/study.js)
// on the two walls, the button box and the server, one after another. The
// devices, the server call and the clock are handed in, so the tests drive
// the real runner with fakes and no hardware (station.mjs hands in the real
// ones). It never handles a clue.

import { createStudy, settingsFrom } from './study.js'
import { COLOUR_RGB, countSegments } from './nanoleaf.js'

const DIM = [40, 40, 40], LIT = [255, 255, 255], OFF = [0, 0, 0]
function allPanels(wall, rgb) { return Object.fromEntries(wall.panels.map(p => [p.id, rgb])) }
const defaultSleep = (ms) => new Promise(r => setTimeout(r, ms))

export const REST_MS = 20_000 // the walls rest after a group finishes, then the next group is greeted

export function createRunner({
  elements, lines, deck, elementsOk = true, linesOk = true, panelIds, layout,
  callStation, stationKey = '', log = () => {}, sleep = defaultSleep, restMs = REST_MS, now = Date.now,
} = {}) {
  let nightId = null
  let groupId = null              // the group the server says is due; the server owns this
  let settings = {}               // from public/study.settings when the night carries any
  let skew = 0
  const serverNow = () => now() + skew
  const fresh = () => createStudy({ panelIds, groupId, settings })
  let machine = fresh()
  let granolia = null
  let pendingFinished = null
  let pausedAt = null             // the moment the host paused the night (server clock), while it is paused

  // ---- the effect queue: one effect at a time, never waited on from inside an effect
  let queue = Promise.resolve()
  const run = (fn) => { queue = queue.then(fn).catch(e => log('effect failed:', e?.message ?? e)) }
  function drain() {
    for (const e of machine.drain()) run(() => apply(e))
  }
  // for the tests: everything queued so far has been carried out
  const settled = () => queue

  async function safe(wall, ok, fn) {
    if (!ok) return
    try { await fn() } catch (e) { log(`${wall.name}: ${e?.message ?? e}`) }
  }

  function call(command, payload) {
    return callStation({ nightId, key: stationKey, station: 'study', command, payload })
  }

  function sendState(extra = {}) {
    if (!nightId) return
    const snap = machine.snapshot
    const payload = {
      ...snap, layout, elementsOk, linesOk, granolia, ...extra,
      fallbackPattern: !elementsOk && (snap.state === 'playing' || snap.state === 'reproducing') ? currentPatternIndexes() : null,
    }
    call('state', payload)
      .then(r => { if (r?.data?.serverTime) skew = r.data.serverTime - now() })
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
        // with the wall down the pattern plays on the screen instead: same timing, no frames to send
        await sleep(500)
        for (const id of e.panels) {
          await safe(elements, elementsOk, () => elements.frame({ ...allPanels(elements, DIM), [id]: LIT }, 1))
          await sleep(e.onMs)
          await safe(elements, elementsOk, () => elements.frame(allPanels(elements, DIM), 1))
          await sleep(e.gapMs)
        }
        machine.played(serverNow())
        drain()
        return
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
      case 'granolia': granolia = e.hint ? { ...e, at: serverNow() } : null; return
      case 'screen': return sendState()
      case 'server.finished': {
        log(`group ${e.groupId ?? '?'} finished: ${e.outcome}, ${e.pairs} pairs, ${e.seconds}s`)
        const payload = { groupId: e.groupId, outcome: e.outcome, seconds: e.seconds, pairs: e.pairs }
        if (nightId) {
          // the answer says only that it landed; which group is due next comes
          // from the public/study snapshot (the server's rotation owns it)
          try { await call('finished', payload) } catch (err) { log('finished not sent (will retry):', err?.message ?? err); pendingFinished = e }
        }
        // the walls rest, then the station is re-armed for whichever group the latest snapshot says
        await sleep(restMs)
        granolia = null
        machine = fresh()
        drain()
        return
      }
      default: return
    }
  }

  return {
    get machine() { return machine },
    get groupId() { return groupId },
    get granolia() { return granolia },
    serverNow,
    drain,
    settled,
    sendState,

    // a panel was touched (gestures 0 and 1 are taps; swipes are the app's business)
    touch(panelId, gesture = 0) {
      if (gesture !== 0 && gesture !== 1) return
      if (pausedAt != null) return                // the house is paused: the wall waits with it
      machine.touch(panelId, serverNow())
      drain()
    },
    // a button-box key; with the Elements down the number keys stand in for panels 1–6
    key(name) {
      if (pausedAt != null) return
      if (!elementsOk && /^[1-6]$/.test(name) && machine.state !== 'entering') machine.touch(Number(name), serverNow())
      else machine.key(name, serverNow())
      drain()
    },
    // The host paused or resumed the night (nights/{id}.phase, through the
    // follower). While paused the clock stands still and the wall ignores
    // touches; on resume the game's start moves on by the length of the
    // pause, so the group gets its whole fifteen minutes, and the kiosk's
    // clock is told. `at` is the server's moment of the change.
    paused(flag, at = serverNow()) {
      if (flag) {
        if (pausedAt == null) { pausedAt = at; log('paused') }
        return
      }
      if (pausedAt == null) return
      const length = Math.max(0, at - pausedAt)
      pausedAt = null
      log(`resumed after ${Math.round(length / 1000)}s`)
      machine.shift(length) // its screen effect carries the moved start to the kiosk
      drain()
    },
    get isPaused() { return pausedAt != null },
    // once a second: the cap, the warning, and any "finished" the server missed
    tick() {
      if (pausedAt == null) { machine.tick(serverNow()); drain() }
      if (pendingFinished && nightId) {
        const e = pendingFinished; pendingFinished = null
        call('finished', { groupId: e.groupId, outcome: e.outcome, seconds: e.seconds, pairs: e.pairs })
          .catch(() => { pendingFinished = e })
      }
    },
    // the live night changed: whatever was running belonged to the old night,
    // so the machine goes back to idle and waits for the new night's snapshot
    night(id) {
      if (id === nightId) return
      nightId = id
      groupId = null
      settings = {}
      granolia = null
      pendingFinished = null
      pausedAt = null
      machine = fresh()
      log('night:', nightId ?? 'none')
      drain()
      sendState()
    },
    // the server says which group is due (and may send settings). Always
    // remembered; the machine is rebuilt for them when it is idle, and after
    // the rest that follows a finish (a running game is never cut short).
    due(next, nextSettings = null) {
      next = next ?? null
      const s = settingsFrom(nextSettings)
      const settingsChanged = JSON.stringify(s) !== JSON.stringify(settings)
      if (settingsChanged) { settings = s; log('settings:', Object.keys(s).length ? Object.keys(s).join(' ') : 'defaults') }
      if (next === groupId && !settingsChanged) return
      if (next !== groupId) { groupId = next; log('next group:', groupId ?? 'none') }
      if (machine.state === 'idle') { machine = fresh(); drain() }
    },
    get settings() { return settings },
    // the host's reset key in fake mode
    reset() {
      machine = fresh(); granolia = null; drain()
    },
  }
}
