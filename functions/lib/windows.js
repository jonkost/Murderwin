// The windows engine: the clock that settles every window on time and pops
// up the Parlour Games, the clarity dial, and the parity of the three role
// cards.
//
// A window is the minute (or two) when every phone lights up at once. The
// dealer (deal.js) opens them and settles them; this file decides WHEN they
// open and settle with nobody pressing anything (tick, startParlour), and
// what a hidden role's answers do to the dial (pushDial). The exposure record (the Hush) lives in ledger.js: one writer,
// one reader, one shape.
//
// SEAL RULE. The case (cases/{nightId}) is read here only for the Parlour
// Games' times and to move the dial. Nothing here returns content, prints content, or writes
// the case's secrets anywhere a client can read. Results are counts, keys
// and ok flags. The dial and its log are sealed until the Act 7 graph.

import { NightError, readArea } from './night.js'
import { settleWindow, openWindow, ms, PARLOUR } from './deal.js'
import { tickStudy } from './station.js'
import { DIAL_SIGN } from './case.js'
import { RUNNING } from './relay.js'
import { PARLOUR_ACTS } from './parlour.js'
import { isHushed } from './ledger.js'

// A phone that taps inside the grace after closesAt is still heard; after
// that the server's default has fired and the tap is a late one.
export const GRACE_MS = 5000
// The three role cards may differ in length by this much (word counts).
export const PARITY_TOLERANCE = 0.2
export const HIDDEN_ROLES = ['murderer', 'ghost']
// Padding for a short role card, when the workshop has no 'FILLER:' line.
export const DEFAULT_FILLER = 'Keep this to yourself, and keep your phone on you.'
export const MAX_PADS = 30

// ---------------------------------------------------------------------------
// Words. The same rule as the workshop's app/src/lib/scenarios.js wordCount,
// so what the workshop shows and what the server measures agree.

export function wordCount(text) {
  return String(text ?? '').trim().split(/\s+/).filter(Boolean).length
}

// ---------------------------------------------------------------------------
// When the Parlour Games pop up (docs/parlour-games.md). Four in each of
// Acts 2, 4 and 6, at offsets from the start of the act that the case's plan
// rolled from its seed. The schedule for the act in progress lives in
// nights/{id}/private/parlour, which no client can read, so no phone and no
// host page knows when the next one is coming:
//   { act, startedAt, count, due0..dueN: Date, fired: { i: true }, lastAt }
// The tick opens a game once it is due, never while another window is open
// or the drawing is running, and never closer than the gap to the last one.
// A game the act ends before is not played.

export const parlourPath = (nightId) => `nights/${nightId}/private/parlour`
export const MAX_PARLOUR_SLOTS = 8 // the due fields a pause shifts (night.js PAUSE_SHIFTED)

// The act has begun: lay out its games. Once per act; a second call keeps
// the schedule (and what already fired) as it is.
export async function startParlour(db, nightId, act, { now = Date.now() } = {}) {
  if (!PARLOUR_ACTS.includes(Number(act))) return { ok: true, skipped: 'not-a-parlour-act' }
  const ref = db.doc(parlourPath(nightId))
  const snap = await ref.get()
  if (snap.exists && snap.data().act === Number(act)) return { ok: true, already: true }
  const caseSnap = await db.doc(`cases/${nightId}`).get()
  const plan = caseSnap.exists ? (caseSnap.data().parlourPlan?.acts?.[act] ?? []) : []
  const slots = plan.slice(0, MAX_PARLOUR_SLOTS)
  const doc = { act: Number(act), startedAt: new Date(now), count: slots.length, fired: {}, lastAt: null }
  slots.forEach((p, i) => { doc[`due${i}`] = new Date(now + (Number(p.atMs) || 0)) })
  await ref.set(doc)
  return { ok: true, count: slots.length }
}

// Which game, if any, is due now. Pure, for the tick and the tests.
export function dueSlot(sched, { now, gapMs = PARLOUR.minGapMin * 60_000 } = {}) {
  if (!sched) return null
  for (let i = 0; i < (sched.count ?? 0); i++) {
    if (sched.fired?.[i]) continue
    if (now < ms(sched[`due${i}`])) return null
    if (sched.lastAt && now < ms(sched.lastAt) + gapMs) return null
    return i
  }
  return null
}

export async function tickParlour(db, nightId, now) {
  const night = (await db.doc(`nights/${nightId}`).get()).data()
  if (!night || night.phase !== 'act' || !PARLOUR_ACTS.includes(Number(night.act))) return { opened: false }
  if (night.window && !night.window.settled) return { opened: false, reason: 'window-open' }
  const relay = (await db.doc(`nights/${nightId}/public/relay`).get()).data()
  if (relay && RUNNING.includes(relay.state)) return { opened: false, reason: 'drawing' }
  const ref = db.doc(parlourPath(nightId))
  // claim the slot in one transaction, so two ticks in the same second open it once
  const slot = await db.runTransaction(async tx => {
    const snap = await tx.get(ref)
    const sched = snap.exists ? snap.data() : null
    if (!sched || sched.act !== Number(night.act)) return null
    const i = dueSlot(sched, { now })
    if (i === null) return null
    tx.update(ref, { [`fired.${i}`]: true, lastAt: new Date(now) })
    return i
  })
  if (slot === null) return { opened: false }
  const r = await openWindow(db, nightId, 'questions', { now, act: Number(night.act), beat: `p${slot}` })
  return { opened: true, slot, phones: r.phones ?? 0 }
}

// ---------------------------------------------------------------------------
// The dial. A hidden role's total, through the case's map, in one
// transaction, so the Ghost's and the Murderer's answers in the same second
// both land. An exposed role still answers and still moves a cat (the
// placebo), but its push is logged as 0 and marked hushed.

export async function pushDial(db, nightId, { c = null, role, total, act = null, now = Date.now() } = {}) {
  if (!HIDDEN_ROLES.includes(role)) return null
  const caseRef = db.doc(`cases/${nightId}`)
  return db.runTransaction(async tx => {
    const snap = await tx.get(caseRef)
    if (!snap.exists) return null
    const cur = snap.data()
    const sign = Number(cur.dialMap?.[role] ?? cur.dialSign?.[role] ?? c?.dialMap?.[role] ?? DIAL_SIGN[role] ?? 0)
    const hushed = isHushed(cur, role) // the one reader of the exposure record (ledger.js)
    const delta = hushed ? 0 : sign * (Number(total) || 0)
    const log = Array.isArray(cur.dialLog) ? cur.dialLog : []
    const entry = { act: act ?? null, role, delta, at: new Date(now) }
    if (hushed) entry.hushed = true
    tx.update(caseRef, { dial: (cur.dial ?? 0) + delta, dialLog: [...log, entry] })
    return { delta, hushed }
  })
}

// ---------------------------------------------------------------------------
// Role-card parity. The three cards must read about as long as each other,
// so the time a phone is held says nothing. A short card is padded with a
// filler line rather than refused: the night must go on.

export function parityCheck(cards, { filler = DEFAULT_FILLER, tolerance = PARITY_TOLERANCE } = {}) {
  const out = { ...cards }
  const keys = Object.keys(out).filter(k => typeof out[k] === 'string')
  const counts = () => Object.fromEntries(keys.map(k => [k, wordCount(out[k])]))
  const spreadOf = cs => { const v = Object.values(cs); const max = Math.max(...v); return max ? (max - Math.min(...v)) / max : 0 }
  const before = spreadOf(counts())
  let padded = 0
  const pad = String(filler ?? '').trim() || DEFAULT_FILLER
  for (let i = 0; i < MAX_PADS; i++) {
    const cs = counts()
    const max = Math.max(...Object.values(cs))
    const short = keys.filter(k => cs[k] < Math.ceil(max * (1 - tolerance)))
    if (!short.length) break
    const k = short.sort((a, b) => cs[a] - cs[b])[0]
    out[k] = `${out[k].trim()} ${pad}`
    padded++
  }
  return { ok: before <= tolerance, cards: out, padded, spread: spreadOf(counts()), within: spreadOf(counts()) <= tolerance }
}

// The workshop's filler line (ui_copy 'FILLER: ...'), or the default.
export async function fillerLine(db) {
  const items = await readArea(db, 'ui_copy')
  const it = items.find(i => /^FILLER:/i.test(i.text.trim()))
  const line = it ? it.text.trim().replace(/^FILLER:\s*/i, '').trim() : ''
  return line || DEFAULT_FILLER
}

// ---------------------------------------------------------------------------
// The tick. Once a minute, for the live night: a window past its close and
// its grace is settled (defaults for every phone that did not answer), a
// study slot that has run out ends (station.tickStudy), and a Parlour Game
// that is due pops up on every phone. A paused night is
// left alone. Safe to call as often as you like: each thing happens once.

export async function activeNightId(db) {
  const snap = await db.doc('public_state/active').get()
  return snap.exists ? snap.data().nightId ?? null : null
}

export async function tick(db, nightId, now = Date.now(), { finished = null } = {}) {
  const snap = await db.doc(`nights/${nightId}`).get()
  if (!snap.exists) return { ok: true, skipped: 'no-night', settled: 0 }
  const night = snap.data()
  if (night.phase === 'paused') return { ok: true, skipped: 'paused', settled: 0 }
  let settled = 0
  let windowSettled = false
  const w = night.window
  if (w && !w.settled && now >= ms(w.closesAt) + GRACE_MS) {
    const r = await settleWindow(db, nightId, { now })
    settled = r.settled ?? 0
    windowSettled = true
  }
  const study = await tickStudy(db, nightId, now, { finished })
  const parlour = await tickParlour(db, nightId, now)
  return { ok: true, settled, windowSettled, study: { ticked: Boolean(study?.ticked), reason: study?.reason ?? null }, parlour: { opened: parlour.opened, slot: parlour.slot ?? null } }
}
