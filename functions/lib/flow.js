// The flow of the night: nothing out of order (A5, handoff 11 Nov 2026).
//
// Jon, 11 Nov: "The parlour games were all out of order. I was getting them
// after the final trace reveal." This file is the one rule for when a Parlour
// Game may open, and the two moments that close the night's games for good:
//   1. A game opens only in its own beats (seed/night.json parlour.beats):
//      Act 2's cat visits, Act 4's rounds (where it waits on the phone), and
//      Act 6's games. One that falls due in any other beat waits.
//   2. Act 6 plays its own two and no more (windows.startParlour carries
//      nothing into it).
//   3. When the drawing starts every game still unplayed is dropped for good
//      (closeParlour): no window, no points.
//   4. No game opens while the night is not in play, a W-O-O-F News bulletin
//      is playing, Sir Irwin's screen is up, or the drawing, the door, the
//      talk, the vote, the reveal or the credits are on (holdReason).
//   5. Act 6's games beat goes on to the drawing by itself once its last game
//      has closed (claimGamesDone, run.js clockTick).
// windows.tickParlour and the host's Parlour Game now button both ask here.
//
// SEAL RULE: nothing here reads a case or a set. It reads the night, the
// relay's state, the screen's kind and the schedule's counts.

import { NIGHT, ms } from './deal.js'
import { RUNNING, relayPaths } from './relay.js'
import { screenPath } from './screen.js'

// read when asked, never at load: deal.js and windows.js import each other, and this file sits between them
const DEFAULT_BEATS = { 2: ['cat'], 4: ['round1', 'round2', 'round3', 'round4', 'round5'], 6: ['games'] }
const beatsOf = () => NIGHT.parlour?.beats ?? DEFAULT_BEATS
const scheduleOf = nightId => `nights/${nightId}/private/parlour` // windows.parlourPath (no import: windows.js imports this file)

// A bulletin counts as playing for this long after it went up on the Parlour TV
// (bulletin 2 can play itself in the first minutes of Act 4: screen.tickBulletin).
export const BULLETIN_HOLD_MS = 3 * 60_000
// The Parlour TV's screens that hold every game back: Sir Irwin, and everything after the drawing.
export const HOLD_SCREENS = { irwin: 'irwin', door: 'door', trace: 'door', talk: 'talk', vote: 'vote' }

// Is (act, beat) one of the Parlour Games' own beats?
export function parlourBeat(act, beat) {
  return (beatsOf()[String(act)] ?? []).includes(String(beat ?? ''))
}

// Has the drawing started? Running, or done with the door open: from then on no game opens again.
export function drawingStarted(relay) {
  return !!relay && (RUNNING.includes(relay.state) || relay.state === 'done')
}

// Why a Parlour Game may not open now, or null when it may. Pure, for the tick, the button and the tests.
export function holdReason({ night, relay = null, screen = null, now = Date.now() } = {}) {
  if (!night) return 'no-night'
  if (night.phase !== 'act') return 'phase'
  if (night.over === true) return 'over'
  if (!parlourBeat(night.act, night.beat)) return 'beat'
  if (drawingStarted(relay)) return 'drawing'
  const kind = screen?.kind
  if ((kind === 'news' || kind === 'bulletin') && now < ms(screen.at) + BULLETIN_HOLD_MS) return 'bulletin'
  if (HOLD_SCREENS[kind]) return HOLD_SCREENS[kind]
  return null
}

// The same, reading the relay and the screen for the night given.
export async function parlourHold(db, nightId, night, now = Date.now()) {
  const [relay, screen] = await Promise.all([db.doc(relayPaths(nightId).pub).get(), db.doc(screenPath(nightId)).get()])
  return holdReason({ night, relay: relay.exists ? relay.data() : null, screen: screen.exists ? screen.data() : null, now })
}

// The host's button refuses with one plain line.
export const NOT_NOW = 'Not now. A Parlour Game opens in the cat visits, the Act 4 rounds and the two games of Act 6.'
export const ACT6_OWN = 'Act 6 plays its own two games by itself, then the drawing starts.'

// The schedule is closed: nothing in it opens again (the drawing has started, or Act 6's games are done).
export function isClosed(sched) { return !!sched?.closed }

// Has every game in the schedule been opened?
export function allFired(sched) {
  const count = Number(sched?.count) || 0
  return count > 0 && Array.from({ length: count }, (_, i) => i).every(i => sched.fired?.[i])
}

// How many games in the schedule never opened.
export function unplayed(sched) {
  const count = Number(sched?.count) || 0
  return Array.from({ length: count }, (_, i) => i).filter(i => !sched?.fired?.[i]).length
}

// The drawing starts: every game still unplayed is dropped for good. Once; safe to call again.
export async function closeParlour(db, nightId, { now = Date.now() } = {}) {
  const ref = db.doc(scheduleOf(nightId))
  return db.runTransaction(async tx => {
    const snap = await tx.get(ref)
    if (!snap.exists) return { ok: true, dropped: 0 }
    const sched = snap.data()
    if (sched.closed) return { ok: true, dropped: 0, already: true }
    tx.update(ref, { closed: true, closedAt: new Date(now) })
    return { ok: true, dropped: unplayed(sched) }
  })
}

// Act 6's games beat, its last game closed: claim the move to the drawing, once. The schedule is
// closed in the same write, so a Back to the games beat stays where it is put.
export async function claimGamesDone(db, nightId, night, { now = Date.now() } = {}) {
  if (!night || night.phase !== 'act' || Number(night.act) !== 6 || night.beat !== 'games') return false
  if (night.window && !night.window.settled) return false
  const ref = db.doc(scheduleOf(nightId))
  return db.runTransaction(async tx => {
    const snap = await tx.get(ref)
    const sched = snap.exists ? snap.data() : null
    if (!sched || Number(sched.act) !== 6 || sched.closed || !allFired(sched)) return false
    tx.update(ref, { closed: true, closedAt: new Date(now), auto: true })
    return true
  })
}
