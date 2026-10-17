// The windows engine: the clock that settles every window on time, the
// clarity dial, which Parlour Game set each phone is dealt, the parity of
// the three role cards, and the exposure record.
//
// A window is the minute (or two) when every phone lights up at once. The
// dealer (deal.js) opens them and settles them; this file decides WHEN they
// settle with nobody pressing anything (tick), WHICH set each phone gets
// (pickSets), and what a hidden role's answers do to the dial (pushDial).
//
// SEAL RULE. The case (cases/{nightId}) is read here only to pick sets and
// to move the dial. Nothing here returns content, prints content, or writes
// the case's secrets anywhere a client can read. Results are counts, keys
// and ok flags. The dial and its log are sealed until the Act 7 graph.

import { NightError, readArea } from './night.js'
import { settleWindow, ms, beatsOf } from './deal.js'
import { tickStudy } from './station.js'
import { DIAL_SIGN, WINDOW_SLOTS } from './case.js'

// A phone that taps inside the grace after closesAt is still heard; after
// that the server's default has fired and the tap is a late one.
export const GRACE_MS = 5000
// The three role cards may differ in length by this much (word counts).
export const PARITY_TOLERANCE = 0.2
// The detectives' set is chosen within this much of the hidden roles' sets.
export const SET_TOLERANCE = 0.15
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

// How long a Parlour Game set reads: every question and every choice.
export function setLength(beats) {
  return (Array.isArray(beats) ? beats : []).reduce((n, b) => n + wordCount(b?.q) + ['a', 'b', 'c', 'd'].reduce((m, k) => m + wordCount(b?.[k]), 0), 0)
}

// ---------------------------------------------------------------------------
// Which set each phone is dealt.

// The four windows of the night, as the case names them (case.js
// WINDOW_SLOTS): act2, act4a, act4b, act6. Act 4 has two: the first up to
// and at the beat 'questions1', the second after it. A window the host opens
// by hand in another act has no slot and the hidden roles draw at random.
export function slotFor(act, beat = null) {
  const a = Number(act)
  if (a === 2) return 'act2'
  if (a === 6) return 'act6'
  if (a === 4) {
    const keys = beatsOf(4).map(b => b.key)
    const i = keys.indexOf(beat)
    const first = keys.indexOf('questions1')
    return first >= 0 && i > first ? 'act4b' : 'act4a'
  }
  return null
}

function near(a, b) { return Math.abs(a - b) <= SET_TOLERANCE * Math.max(a, b, 1) }
function apart(a, b) { return Math.abs(a - b) / Math.max(a, b, 1) }

// One set for every detective, and the case's set for each hidden role.
// The detectives' set is drawn among the sets that read about as long as
// the hidden roles' sets, so nobody's screen is fuller than the next; when
// no set is that close to both, the closest ones. Returns indices into the
// bank, never the sets themselves.
export function pickSets({ bank, c = null, act = null, beat = null, pick = n => Math.floor(Math.random() * n) } = {}) {
  const n = Array.isArray(bank) ? bank.length : 0
  if (!n) throw new NightError('invalid', 'There are no Parlour Games to deal.')
  const slot = slotFor(act, beat)
  const sets = {}
  for (const role of HIDDEN_ROLES) {
    const i = slot ? c?.hiddenSets?.[role]?.[slot] : undefined
    sets[role] = Number.isInteger(i) ? ((i % n) + n) % n : pick(n)
  }
  const lengths = bank.map(setLength)
  const targets = HIDDEN_ROLES.map(r => lengths[sets[r]])
  let candidates = lengths.map((len, i) => i).filter(i => targets.every(t => near(lengths[i], t)))
  if (!candidates.length) {
    const worst = i => Math.max(...targets.map(t => apart(lengths[i], t)))
    const best = Math.min(...lengths.map((len, i) => worst(i)))
    candidates = lengths.map((len, i) => i).filter(i => worst(i) === best)
  }
  sets.detective = candidates[pick(candidates.length)]
  return sets
}

export function setFor(sets, role) {
  return Number.isInteger(sets?.[role]) ? sets[role] : sets.detective
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
    const hushed = Boolean(cur.exposure?.[role])
    const delta = hushed ? 0 : sign * (Number(total) || 0)
    const log = Array.isArray(cur.dialLog) ? cur.dialLog : []
    const entry = { act: act ?? null, role, delta, at: new Date(now) }
    if (hushed) entry.hushed = true
    tx.update(caseRef, { dial: (cur.dial ?? 0) + delta, dialLog: [...log, entry] })
    return { delta, hushed }
  })
}

// The exposure record: a silent tap that a hidden role has been seen. From
// then on that role's answers move no dial. Nothing is shown to any phone
// until Act 7; the finale and the safeguards read cases/{id}.exposure.
export async function noteExposure(db, nightId, role, { now = Date.now() } = {}) {
  if (!HIDDEN_ROLES.includes(role)) throw new NightError('invalid', 'Say which: murderer or ghost.')
  const caseRef = db.doc(`cases/${nightId}`)
  const snap = await caseRef.get()
  if (!snap.exists || !snap.data().roles) throw new NightError('invalid', 'No case yet. Press Power returns first.')
  if (snap.data().exposure?.[role]) return { ok: true, role, already: true }
  await caseRef.update({ [`exposure.${role}`]: { at: new Date(now) } })
  return { ok: true, role }
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
// its grace is settled (defaults for every phone that did not answer), and
// a study slot that has run out ends (station.tickStudy). A paused night is
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
  return { ok: true, settled, windowSettled, study: { ticked: Boolean(study?.ticked), reason: study?.reason ?? null } }
}
