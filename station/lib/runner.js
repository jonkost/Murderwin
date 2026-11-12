// The study station's runner: carries out the machine's effects (lib/study.js)
// on the two walls, the button box and the server, one after another. The
// devices, the server call and the clock are handed in, so the tests drive
// the real runner with fakes and no hardware (station.mjs hands in the real
// ones). It never handles a clue. The study test (lib/testmode.js) makes a
// practice runner the same way and never gives it a night, so it never calls
// the server; onScreen hands it each screen the machine shows.

import { createStudy, settingsFrom } from './study.js'
import { COLOUR_RGB, countSegments, chainHalves } from './nanoleaf.js'

// the walls at rest, between groups (the study test rests them the same way)
export const ELEMENTS_REST = [40, 40, 40], LINES_REST = [20, 10, 30]
// The walls while the room waits for its group (A8, 12 Nov 2026; Jon: "it
// needs to be lit until the game starts"): a soft white on the hexagons and a
// warm white on the bars, breathing between the two numbers when the
// controller takes a looping frame, still at the brighter one when it does
// not. The first touch drops them to the game's dim (ELEMENTS_REST), which the
// patterns need for their contrast, so that stays as it was.
export const ELEMENTS_WAIT = [150, 150, 150], ELEMENTS_WAIT_LOW = [70, 70, 70]
export const LINES_WAIT = [200, 140, 70], LINES_WAIT_LOW = [90, 60, 30]
export const BREATHE_TENTHS = 25 // each way, in tenths of a second
const DIM = ELEMENTS_REST, LIT = [255, 255, 255], OFF = [0, 0, 0], GREEN = [0, 255, 0], RED = [255, 0, 0]
export const DECK_BRIGHTNESS = 90 // the deck's backlight when the power returns (A1)
export const COUNTDOWN_MS = 500   // each step of the Lines' green 3, 2, 1
// a report the server answered with a refusal (a group it does not know, say), not a dropped line
const refused = (err) => /invalid|permission|not-found|failed-precondition/.test(String(err?.code ?? ''))
function allPanels(wall, rgb) { return Object.fromEntries(wall.panels.map(p => [p.id, rgb])) }
const defaultSleep = (ms) => new Promise(r => setTimeout(r, ms))

export const REST_MS = 20_000 // the walls rest after a group finishes, then the next group is greeted

export function createRunner({
  elements, lines, deck, elementsOk = true, linesOk = true, panelIds, layout,
  callStation, stationKey = '', log = () => {}, sleep = defaultSleep, restMs = REST_MS, now = Date.now,
  onScreen = () => {}, hexes = null,
} = {}) {
  let nightId = null
  let groupId = null              // the group the server says is due; the server owns this
  let settings = {}               // from public/study.settings when the night carries any
  let slotEndsAt = 0              // the round's end (public/study.slotEndsAt, server clock), 0 with no round
  let slotAtPause = 0             // slotEndsAt when the host paused, to move it only once on resume
  let skew = 0
  const serverNow = () => now() + skew
  const fresh = () => createStudy({ panelIds, groupId, settings })
  let machine = fresh()
  let granolia = null
  let pendingFinished = null
  let pausedAt = null             // the moment the host paused the night (server clock), while it is paused
  let finishedFor = null          // the group this station last reported finished: its turn is over here
  let hexMap = hexes              // which drawn hexagon each panel is (lib/hexmap.js), for Granolia's hint
  let darkOn = false              // the blackout (A1): walls and deck dark, every touch ignored

  // ---- the effect queue: one effect at a time, never waited on from inside an effect
  let queue = Promise.resolve()
  const run = (fn) => { queue = queue.then(fn).catch(e => log('effect failed:', e?.message ?? e)) }
  function drain() {
    for (const e of machine.drain()) run(() => apply(e))
  }
  // for the tests: everything queued so far has been carried out
  const settled = () => queue

  // The Lines light one half of each of the first n bars along the zigzag, so
  // lit halves never touch (Jon, 28 Oct 2026). A wall that gives no piece
  // positions (a fake) lights whole bars, spaced, as before.
  function linesCount(n, rgb, transition = 1) {
    const chain = lines.piecePos && lines.framePieces ? chainHalves(lines.panels, lines.piecePos) : []
    if (chain.length >= n) return lines.framePieces(Object.fromEntries(chain.slice(0, n).map(c => [c.half, rgb])), transition)
    const frame = allPanels(lines, OFF)
    for (const id of countSegments(lines.panels.map(p => p.id), n)) frame[id] = rgb
    return lines.frame(frame, transition)
  }
  const linesRed = () => safe(lines, linesOk, async () => { await lines.frame(allPanels(lines, RED), 1); await sleep(450) })

  // the waiting look: breathing when the wall takes it, else still
  function waitLook(wall, ok, hi, lo) {
    return safe(wall, ok, async () => {
      if (typeof wall.breathe === 'function') {
        try { await wall.breathe(allPanels(wall, lo), allPanels(wall, hi), BREATHE_TENTHS); return } catch (e) { log(`${wall.name}: no breathing (${e?.message ?? e}), a still glow instead`) }
      }
      await wall.frame(allPanels(wall, hi), 10)
    })
  }

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
      ...snap, layout, hexes: hexMap, elementsOk, linesOk, granolia, ...extra,
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
      case 'elements.rest': return e.waiting ? waitLook(elements, elementsOk, ELEMENTS_WAIT, ELEMENTS_WAIT_LOW) : safe(elements, elementsOk, () => elements.frame(allPanels(elements, DIM), e.transition ?? 10))
      // a wrong touch: the hexagons go dark and the Lines flash red once, together
      case 'elements.dim': return Promise.all([
        safe(elements, elementsOk, async () => { await elements.frame(allPanels(elements, OFF), 2); await sleep(300); await elements.frame(allPanels(elements, DIM), 3) }),
        linesRed().then(() => safe(lines, linesOk, () => lines.frame(allPanels(lines, OFF), 1))),
      ])
      case 'elements.pulse': return safe(elements, elementsOk, async () => { await elements.frame({ ...allPanels(elements, DIM), [e.panel]: LIT }, 1); await sleep(160); await elements.frame(allPanels(elements, DIM), 2) })
      case 'elements.ripple':
      case 'elements.celebrate': return safe(elements, elementsOk, async () => { await elements.frame(allPanels(elements, LIT), 2); await sleep(e.type === 'elements.celebrate' ? 1200 : 300); await elements.frame(allPanels(elements, DIM), 5) })
      case 'elements.replay': return
      case 'elements.play': {
        // with the wall down the pattern plays on the screen instead: same timing, no frames to send.
        // The Lines' countdown is the lead-in; without the Lines, a short pause.
        if (!linesOk) await sleep(500)
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
      case 'lines.rest': return e.waiting ? waitLook(lines, linesOk, LINES_WAIT, LINES_WAIT_LOW) : safe(lines, linesOk, () => lines.frame(allPanels(lines, LINES_REST), 10))
      case 'lines.show': return safe(lines, linesOk, () => linesCount(e.number, COLOUR_RGB[e.colour], 3))
      // green 3, 2, 1, then dark while the hexagons play
      case 'lines.countdown': return safe(lines, linesOk, async () => {
        for (const n of [3, 2, 1]) { await linesCount(n, GREEN, 1); await sleep(COUNTDOWN_MS) }
        await lines.frame(allPanels(lines, OFF), 1)
      })
      // a wrong pair: one red flash, then the pair again
      case 'lines.wrong': return linesRed().then(() => safe(lines, linesOk, () => linesCount(e.show.number, COLOUR_RGB[e.show.colour], 1)))
      case 'lines.celebrate': return safe(lines, linesOk, async () => { await lines.frame(allPanels(lines, LIT), 2); await sleep(1200); await lines.frame(allPanels(lines, LINES_REST), 8) })
      case 'deck.on': return deck.paint(true)
      case 'deck.off': return deck.paint(false)
      case 'deck.shiver': return deck.shiver()
      case 'deck.flash': return deck.flash?.(e.ok)
      case 'wait': return sleep(e.ms)
      case 'granolia': granolia = e.hint ? { ...e, at: serverNow() } : null; return
      case 'screen': { const { type, ...shown } = e; onScreen(shown); return sendState() }
      case 'server.finished': {
        log(`group ${e.groupId ?? '?'} finished: ${e.outcome}, ${e.pairs} pairs, ${e.seconds}s`)
        const payload = { groupId: e.groupId, outcome: e.outcome, seconds: e.seconds, pairs: e.pairs }
        if (e.groupId != null) finishedFor = e.groupId
        // a game with no group is nobody's to report: the server would only refuse it (A8, 12 Nov 2026)
        if (nightId && e.groupId != null) {
          // the answer says only that it landed; which group is due next comes
          // from the public/study snapshot (the server's rotation owns it)
          try { await call('finished', payload) } catch (err) {
            // a report the server refused as wrong is never sent again; one that did not get there is
            if (refused(err)) log('finished refused:', err?.message ?? err)
            else { log('finished not sent (will retry):', err?.message ?? err); pendingFinished = e }
          }
        }
        // the finished screen now, while the walls rest: its own screen effect
        // only comes after the rest, with the next machine in place. The study
        // test's practice round takes it through onScreen, a night through
        // the state. It goes after the report, so "something has been sent to
        // your phones" is true when it shows, but it does not hold on a report
        // that failed: that one goes again from tick, the cards come a moment
        // behind the words, and the chime pays the group anyway.
        onScreen({ ...machine.snapshot })
        sendState()
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

  // A8 (12 Nov 2026): on a live night the wall starts a game only on a
  // group's turn. With no group due (Act 2's code scans at the wall, the
  // other acts, between rounds) or for a group that has already played here,
  // a touch on the resting wall does nothing, so nobody dims the study by
  // accident. Without a night (fake mode, the study test's practice runner)
  // it plays for anyone, as before.
  const closed = () => nightId != null && machine.state === 'idle' && (groupId == null || finishedFor === groupId)

  return {
    get machine() { return machine },
    get hexes() { return hexMap },
    // a map set on the Study test page takes over at once, and the screen hears of it
    setHexes(next) { hexMap = next ?? null; sendState() },
    // the walls back to the waiting look after a test, when nobody is playing
    glow() {
      if (machine.state !== 'idle') return
      run(() => apply({ type: 'elements.rest', waiting: true }))
      run(() => apply({ type: 'lines.rest', waiting: true }))
    },
    get closed() { return closed() },
    get groupId() { return groupId },
    get granolia() { return granolia },
    serverNow,
    drain,
    settled,
    sendState,

    // a panel was touched (gestures 0 and 1 are taps; swipes are the app's business)
    touch(panelId, gesture = 0) {
      if (gesture !== 0 && gesture !== 1) return
      if (darkOn) return                           // the blackout: a hand on the wall must not light it
      if (pausedAt != null) return                // the house is paused: the wall waits with it
      if (closed()) return                         // not this group's turn: the wall stays lit and waits
      machine.touch(panelId, serverNow())
      drain()
    },
    // a button-box key; with the Elements down the number keys stand in for panels 1–6
    key(name) {
      if (darkOn || pausedAt != null) return
      if (closed()) return
      if (!elementsOk && /^[1-6]$/.test(name) && machine.state !== 'entering') machine.touch(Number(name), serverNow())
      else machine.key(name, serverNow())
      drain()
    },
    // The host paused or resumed the night (nights/{id}.phase, through the
    // follower). While paused the clock stands still and the wall ignores
    // touches; on resume the game's start moves on by the length of the
    // pause, so the group gets its whole fifteen minutes, and the kiosk's
    // clock is told. The round's end moves by the same length: the server
    // writes that too (PAUSE_SHIFTED), and its write may land either side of
    // this one, so it moves here only if it has not moved yet. `at` is the
    // server's moment of the change.
    paused(flag, at = serverNow()) {
      if (flag) {
        if (pausedAt == null) { pausedAt = at; slotAtPause = slotEndsAt; log('paused') }
        return
      }
      if (pausedAt == null) return
      const length = Math.max(0, at - pausedAt)
      pausedAt = null
      log(`resumed after ${Math.round(length / 1000)}s`)
      if (slotEndsAt && slotEndsAt === slotAtPause) slotEndsAt += length
      machine.shift(length) // its screen effect carries the moved start to the kiosk
      drain()
    },
    get isPaused() { return pausedAt != null },
    // The blackout (A1, 11 Nov 2026; lib/follow.js): both walls and the deck go dark at the dark mark,
    // the deck's backlight to nothing, and every touch and key is ignored; at the power the walls rest
    // again and the deck is as the game left it. Straight to the devices, not through the queue, so the
    // dark lands at the mark even with an effect running.
    dark(flag) {
      flag = !!flag
      if (flag === darkOn) return
      darkOn = flag
      log(flag ? 'blackout: dark' : 'blackout: the power is back')
      if (flag) {
        safe(elements, elementsOk, () => elements.frame(allPanels(elements, OFF), 0))
        safe(lines, linesOk, () => lines.frame(allPanels(lines, OFF), 0))
        Promise.resolve(deck?.paint?.(false)).then(() => deck?.brightness?.(0)).catch(() => {})
        return
      }
      if (machine.state === 'idle') {
        // nobody playing: the same soft breathing glow a new machine and glow() give (review 12 Nov 2026), not
        // the dim rest, which until Act 4 looked like a wall left off
        waitLook(elements, elementsOk, ELEMENTS_WAIT, ELEMENTS_WAIT_LOW)
        waitLook(lines, linesOk, LINES_WAIT, LINES_WAIT_LOW)
      } else {
        safe(elements, elementsOk, () => elements.frame(allPanels(elements, DIM), 3))
        safe(lines, linesOk, () => lines.frame(allPanels(lines, LINES_REST), 3))
      }
      Promise.resolve(deck?.brightness?.(DECK_BRIGHTNESS)).then(() => deck?.paint?.(machine.state !== 'idle')).catch(() => {})
    },
    get isDark() { return darkOn },
    // once a second: the cap, the warning, and any "finished" the server missed
    tick() {
      if (pausedAt == null) { machine.tick(serverNow(), slotEndsAt); drain() }
      if (pendingFinished && nightId) {
        const e = pendingFinished; pendingFinished = null
        call('finished', { groupId: e.groupId, outcome: e.outcome, seconds: e.seconds, pairs: e.pairs })
          .catch((err) => { if (!refused(err)) pendingFinished = e })
      }
    },
    // the live night changed: whatever was running belonged to the old night,
    // so the machine goes back to idle and waits for the new night's snapshot
    night(id) {
      if (id === nightId) return
      nightId = id
      groupId = null
      settings = {}
      slotEndsAt = 0
      granolia = null
      pendingFinished = null
      pausedAt = null
      finishedFor = null
      machine = fresh()
      log('night:', nightId ?? 'none')
      drain()
      sendState()
    },
    // the server says which group is due and when the round ends (and may
    // send settings). Always remembered; the machine is rebuilt for them when
    // it is idle, and after the rest that follows a finish. A running game
    // goes on through a swap of groups (the host's "this group is in the
    // study" keeps the round's end) and through a resume (that keeps the
    // group), but when both change at once the round has moved on, by the
    // chime or by the host's Next, and the game stops there (1 Nov 2026).
    due(next, nextSettings = null, nextSlot = 0) {
      next = next ?? null
      const movedOn = next !== groupId && nextSlot !== slotEndsAt
      slotEndsAt = nextSlot
      const s = settingsFrom(nextSettings)
      const settingsChanged = JSON.stringify(s) !== JSON.stringify(settings)
      if (settingsChanged) { settings = s; log('settings:', Object.keys(s).length ? Object.keys(s).join(' ') : 'defaults') }
      if (next === groupId && !settingsChanged) return
      if (next !== groupId) { groupId = next; log('next group:', groupId ?? 'none') }
      if (machine.state === 'idle') { machine = fresh(); drain() }
      else if (movedOn) { machine.stop(serverNow()); drain() }
    },
    get settings() { return settings },
    // the host's reset key in fake mode
    reset() {
      machine = fresh(); granolia = null; drain()
    },
  }
}
