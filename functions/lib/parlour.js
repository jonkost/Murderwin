// The Parlour Games (docs/parlour-games.md): twelve a night in Acts 2, 4 and
// 6, at times nobody knows, drawn from the workshop's bank. The twelve are one
// budget for the night (Jon, 22 Oct): five planned in Act 2, five in Act 4,
// two in Act 6 (it opens on the drawing), and a game an act runs out of time
// for carries into the next act (windows.startParlour). Whatever Act 6 cannot
// fit is not played.
// Pure functions over plain objects, so the plan for a night is the same
// every time for the same seed.
//
// What the case deal decides, from the case's own seed (planParlour):
//  - which twelve sets, how many per act, in what order (no set twice a night)
//  - when each one pops up, as an offset from the start of its act
//  - for every question, which cat is secretly listening (never Irwin), how
//    much it cares (half a stop or a full stop), and which answer it leans
//    toward: its fitting answer three times in four, the other one otherwise
//
// The fitting answer comes from the lean table (sealed/parlour_leans), which
// Jenna fills in from the Steward page. Jon never sees it, so it is sealed
// like a kernel: it is copied into cases/{nightId} at the deal and read from
// there. A question with no lean yet gets a fitting answer from the seed.
//
// SEAL RULE. The plan and the leans live only in cases/{nightId}. Nothing
// here prints, logs or returns them to a caller other than the dealer.

import { createHash } from 'node:crypto'

export const PARLOUR_ACTS = [2, 4, 6]
export const LISTENERS = ['granolia', 'boo', 'zimothy', 'salem'] // never Irwin
export const ANSWERS = ['a', 'b'] // exactly two answers to every question
export const LEAN_FITS = 0.75 // a cat leans toward its fitting answer 3 times in 4
export const SIZES = [0.5, 1] // cares a little: half a stop; a lot: a full stop
export const QUESTIONS = 3
export const AFFECTION_MIN = 1
export const AFFECTION_MAX = 5
// The defaults when seed/night.json has no parlour block (Jon may change them there).
// Acts in `atStart` play their games back to back at the start, startGapSec
// apart, instead of at random times (Act 6, before the drawing; 22 Oct).
export const DEFAULT_CONFIG = Object.freeze({ counts: { 2: 5, 4: 5, 6: 2 }, minGapMin: 4, edgeMin: 2, actMinutes: { 2: 30, 4: 60, 6: 30 }, atStart: [6], startGapSec: 90 })

// ---------------------------------------------------------------------------
// The seed. One string per case; everything below draws from it in order.

export function newSeed(rng) {
  return Array.from({ length: 4 }, () => rng(65536).toString(16).padStart(4, '0')).join('')
}

// A stream of numbers in [0, 1) from a seed and a label: the same seed and
// label always give the same stream.
export function stream(seed, label = '') {
  let i = 0
  const unit = () => {
    const h = createHash('sha256').update(`${seed}\u0000${label}\u0000${i++}`).digest()
    return h.readUInt32BE(0) / 0x100000000
  }
  return { unit, pick: n => Math.min(n - 1, Math.floor(unit() * n)) }
}

export function unitOf(seed, ...parts) {
  return stream(seed, parts.map(String).join('\u0000')).unit()
}

function shuffle(list, pick) {
  const a = [...list]
  for (let i = a.length - 1; i > 0; i--) { const j = pick(i + 1); [a[i], a[j]] = [a[j], a[i]] }
  return a
}

export function configOf(raw) {
  const c = raw && typeof raw === 'object' ? raw : {}
  const num = (v, d) => (Number.isFinite(Number(v)) && Number(v) >= 0 ? Number(v) : d)
  const actMinutes = {}, counts = {}
  for (const act of PARLOUR_ACTS) {
    actMinutes[act] = num(c.actMinutes?.[act], DEFAULT_CONFIG.actMinutes[act])
    counts[act] = Math.max(0, Math.round(num(c.counts?.[act], DEFAULT_CONFIG.counts[act])))
  }
  return {
    counts,
    total: PARLOUR_ACTS.reduce((n, act) => n + counts[act], 0),
    minGapMin: num(c.minGapMin, DEFAULT_CONFIG.minGapMin),
    edgeMin: num(c.edgeMin, DEFAULT_CONFIG.edgeMin),
    actMinutes,
    atStart: (Array.isArray(c.atStart) ? c.atStart : DEFAULT_CONFIG.atStart).map(Number).filter(a => PARLOUR_ACTS.includes(a)),
    startGapSec: num(c.startGapSec, DEFAULT_CONFIG.startGapSec),
  }
}

// An act that plays its games at the start: 0, then one gap apart.
export function startTimes(count, cfg) {
  return Array.from({ length: Math.max(0, count) }, (_, i) => i * cfg.startGapSec * 1000)
}
export function gapMsFor(act, config) {
  const cfg = configOf(config)
  return cfg.atStart.includes(Number(act)) ? cfg.startGapSec * 1000 : cfg.minGapMin * 60_000
}

// ---------------------------------------------------------------------------
// When. `count` offsets (ms from the start of the act), in order, at least
// `gapMin` apart, none in the first or last `edgeMin` minutes. An act too
// short for the gap gets the widest even spacing that fits.

export function rollTimes(unit, { minutes, count, gapMin, edgeMin }) {
  if (count <= 0) return []
  const length = minutes * 60_000
  const edge = Math.min(edgeMin * 60_000, length / 2)
  const room = Math.max(0, length - 2 * edge)
  const gap = count > 1 ? Math.min(gapMin * 60_000, room / (count - 1)) : 0
  const slack = Math.max(0, room - gap * (count - 1))
  const draws = Array.from({ length: count }, () => unit() * slack).sort((x, y) => x - y)
  return draws.map((d, i) => Math.round((edge + d + i * gap) / 1000) * 1000)
}

// ---------------------------------------------------------------------------
// Which sets. Twelve different ones when the bank has twelve; a smaller bank
// (a rehearsal) goes round again, never the same set twice in a row.

export function pickSetIds(bankIds, total, pick) {
  const ids = [...new Set((bankIds ?? []).filter(Boolean))]
  if (!ids.length || total <= 0) return []
  const out = []
  while (out.length < total) {
    let round = shuffle(ids, pick)
    if (out.length && round.length > 1 && round[0] === out[out.length - 1]) round = [...round.slice(1), round[0]]
    out.push(...round)
  }
  return out.slice(0, total)
}

// The fitting answer a cat has for one question: the lean table's, or the
// seed's when Jenna has not filled it in yet.
export function fittingAnswer(leans, seed, setId, q, cat) {
  const v = leans?.[setId]?.[q]?.[cat] ?? leans?.[setId]?.[String(q)]?.[cat]
  if (ANSWERS.includes(v)) return v
  return unitOf(seed, 'fit', setId, q, cat) < 0.5 ? 'a' : 'b'
}

export function otherAnswer(k) { return k === 'a' ? 'b' : 'a' }

// One question's listener: the cat, how much it cares, and which answer it
// leans toward tonight.
export function rollListener(unit, pick, { leans, seed, setId, q }) {
  const cat = LISTENERS[pick(LISTENERS.length)]
  const size = SIZES[pick(SIZES.length)]
  const fits = unit() < LEAN_FITS
  const fit = fittingAnswer(leans, seed, setId, q, cat)
  return { cat, size, fits, lean: fits ? fit : otherAnswer(fit) }
}

// The whole night's plan. `leans` is the lean table as Jenna left it.
//   { seed, acts: { '2': [{ setId, atMs, listeners: [{ cat, size, fits, lean }] x3 }] x counts[2], '4': …, '6': … } }
export function planParlour({ seed, bankIds, config, leans = null }) {
  const cfg = configOf(config)
  const { unit, pick } = stream(seed, 'plan')
  const setIds = pickSetIds(bankIds, cfg.total, pick)
  const acts = {}
  let next = 0
  PARLOUR_ACTS.forEach(act => {
    const rolled = rollTimes(unit, { minutes: cfg.actMinutes[act], count: cfg.counts[act], gapMin: cfg.minGapMin, edgeMin: cfg.edgeMin })
    const times = cfg.atStart.includes(act) ? startTimes(cfg.counts[act], cfg) : rolled
    acts[act] = times.map((atMs, slot) => {
      const setId = setIds[next++] ?? null
      const listeners = Array.from({ length: QUESTIONS }, (_, q) => rollListener(unit, pick, { leans, seed, setId, q }))
      return { setId, atMs, listeners }
    })
  })
  return { seed, acts }
}

// Times for an act that has games carried in from the act before: the
// carried ones and the act's own, laid out afresh over the act, from the
// seed, so a re-read agrees.
export function carriedTimes({ seed, act, count, config }) {
  const cfg = configOf(config)
  if (cfg.atStart.includes(Number(act))) return startTimes(count, cfg)
  return rollTimes(stream(seed, `carry\u0000${act}\u0000${count}`).unit, { minutes: cfg.actMinutes[act], count, gapMin: cfg.minGapMin, edgeMin: cfg.edgeMin })
}

// The listeners for a window the plan does not know (the host's own Light up
// button): rolled from the seed and the window id, so a re-read agrees.
export function extraListeners({ seed, windowId, setId, leans = null }) {
  const { unit, pick } = stream(seed, `extra\u0000${windowId}`)
  return Array.from({ length: QUESTIONS }, (_, q) => rollListener(unit, pick, { leans, seed, setId, q }))
}

// ---------------------------------------------------------------------------
// What an answer does to the cats.

// A Detective: each question's cat warms by its size when the answer matches
// its lean, and cools by it when it does not.
// The Murderer and the Ghost: the same cat and the same size, and a coin
// flip (from the seed, per guest, per question) decides warm or cool.
export function catMoves({ listeners, picks, hidden = false, seed = '', windowId = '', key = '' }) {
  const moves = {}
  ;(listeners ?? []).forEach((l, q) => {
    if (!l || !LISTENERS.includes(l.cat)) return
    const warm = hidden ? unitOf(seed, 'coin', windowId, q, key) < 0.5 : picks?.[q] === l.lean
    moves[l.cat] = (moves[l.cat] ?? 0) + (warm ? l.size : -l.size)
  })
  return moves
}

export function clampAffection(v) {
  const n = Number(v)
  if (!Number.isFinite(n)) return 3
  return Math.max(AFFECTION_MIN, Math.min(AFFECTION_MAX, Math.round(n * 2) / 2))
}

// Affection is kept in half steps; everything a guest sees or a cat acts on
// is the nearest stop.
export function stopOf(v) {
  return Math.max(AFFECTION_MIN, Math.min(AFFECTION_MAX, Math.round(clampAffection(v))))
}

// Salem's ceiling through the Parlour Games: 4, unless the guest petted the
// real Salem (the host's "Salem petted" button, deal.salemPetted).
export const SALEM_PARLOUR_MAX = 4

// The patch for one guest: only the cats that changed. Irwin never moves.
export function applyMoves(affection, moves, { salemFriend = false } = {}) {
  const patch = {}
  for (const [cat, d] of Object.entries(moves ?? {})) {
    if (!LISTENERS.includes(cat) || !d) continue
    const was = clampAffection(affection?.[cat] ?? 3)
    const top = cat === 'salem' && !salemFriend ? Math.max(was, SALEM_PARLOUR_MAX) : AFFECTION_MAX
    const next = Math.min(top, clampAffection(was + d))
    if (next !== was) patch[cat] = next
  }
  return patch
}
