// The Parlour Games (docs/parlour-games.md): twelve a night, four each in
// Acts 2, 4 and 6, at times nobody knows, drawn from the workshop's bank.
// Pure functions over plain objects, so the plan for a night is the same
// every time for the same seed.
//
// What the case deal decides, from the case's own seed (planParlour):
//  - which twelve sets, four per act, in what order (no set twice a night)
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
export const DEFAULT_CONFIG = Object.freeze({ perAct: 4, minGapMin: 4, edgeMin: 2, actMinutes: { 2: 30, 4: 60, 6: 30 } })

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
  const actMinutes = {}
  for (const act of PARLOUR_ACTS) actMinutes[act] = num(c.actMinutes?.[act], DEFAULT_CONFIG.actMinutes[act])
  return {
    perAct: Math.max(0, Math.round(num(c.perAct, DEFAULT_CONFIG.perAct))),
    minGapMin: num(c.minGapMin, DEFAULT_CONFIG.minGapMin),
    edgeMin: num(c.edgeMin, DEFAULT_CONFIG.edgeMin),
    actMinutes,
  }
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
//   { seed, acts: { '2': [{ setId, atMs, listeners: [{ cat, size, fits, lean }] x3 }] x perAct, '4': …, '6': … } }
export function planParlour({ seed, bankIds, config, leans = null }) {
  const cfg = configOf(config)
  const { unit, pick } = stream(seed, 'plan')
  const setIds = pickSetIds(bankIds, cfg.perAct * PARLOUR_ACTS.length, pick)
  const acts = {}
  PARLOUR_ACTS.forEach((act, a) => {
    const times = rollTimes(unit, { minutes: cfg.actMinutes[act], count: cfg.perAct, gapMin: cfg.minGapMin, edgeMin: cfg.edgeMin })
    acts[act] = times.map((atMs, slot) => {
      const setId = setIds[a * cfg.perAct + slot] ?? null
      const listeners = Array.from({ length: QUESTIONS }, (_, q) => rollListener(unit, pick, { leans, seed, setId, q }))
      return { setId, atMs, listeners }
    })
  })
  return { seed, acts }
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

// The patch for one guest: only the cats that changed. Irwin never moves.
export function applyMoves(affection, moves) {
  const patch = {}
  for (const [cat, d] of Object.entries(moves ?? {})) {
    if (!LISTENERS.includes(cat) || !d) continue
    const was = clampAffection(affection?.[cat] ?? 3)
    const next = clampAffection(was + d)
    if (next !== was) patch[cat] = next
  }
  return patch
}

// ---------------------------------------------------------------------------
// The awards at the reveal (draft titles, Jon may rewrite). They compare the
// guests with each other only, from their own answers: never the cats' leans.
// Answers picked for a phone when its window closed do not count. A tie shows
// everyone tied, but an award everybody would win is not given.
//   answersByKey: { guestKey: { windowId: { picks: ['a','b','a'], defaulted } } }
export const AWARD_TITLES = Object.freeze({
  rebel: 'Biggest Rebel',
  crowd: 'Crowd Pleaser',
  kindred: 'Kindred Spirits',
  rivals: 'Sworn Rivals',
})

export function parlourAwards(answersByKey) {
  const keys = Object.keys(answersByKey ?? {}).sort()
  const real = {}
  for (const k of keys) {
    real[k] = {}
    for (const [wid, a] of Object.entries(answersByKey[k] ?? {})) {
      if (a && !a.defaulted && Array.isArray(a.picks)) real[k][wid] = a.picks
    }
  }
  // every question anyone answered, and how the room split on it
  const tally = {}
  for (const k of keys) for (const [wid, picks] of Object.entries(real[k])) {
    picks.forEach((p, q) => { const id = `${wid}#${q}`; (tally[id] ??= {})[p] = (tally[id][p] ?? 0) + 1 })
  }
  const side = { rebel: {}, crowd: {} }
  for (const k of keys) {
    side.rebel[k] = 0; side.crowd[k] = 0
    for (const [wid, picks] of Object.entries(real[k])) picks.forEach((p, q) => {
      const t = tally[`${wid}#${q}`]
      const mine = t[p] ?? 0
      const theirs = Object.entries(t).filter(([x]) => x !== p).reduce((n, [, c]) => n + c, 0)
      if (mine < theirs) side.rebel[k]++
      if (mine > theirs) side.crowd[k]++
    })
  }
  // a tie shows everyone tied; an award that would go to everybody goes to nobody
  const playing = keys.filter(k => Object.keys(real[k]).length)
  const top = (scores) => {
    const best = Math.max(0, ...Object.values(scores))
    const won = best > 0 ? Object.keys(scores).filter(k => scores[k] === best) : []
    return won.length < playing.length ? won : []
  }
  const pairs = []
  for (let i = 0; i < keys.length; i++) for (let j = i + 1; j < keys.length; j++) {
    const a = real[keys[i]], b = real[keys[j]]
    let same = 0, shared = 0
    for (const [wid, picks] of Object.entries(a)) {
      const other = b[wid]
      if (!other) continue
      picks.forEach((p, q) => { if (other[q] != null) { shared++; if (other[q] === p) same++ } })
    }
    if (shared) pairs.push({ pair: [keys[i], keys[j]], match: same / shared })
  }
  const bestMatch = pairs.length ? Math.max(...pairs.map(p => p.match)) : null
  const worstMatch = pairs.length ? Math.min(...pairs.map(p => p.match)) : null
  const pairsAt = (m) => { const won = pairs.filter(p => p.match === m); return won.length < pairs.length ? won.map(p => p.pair) : [] }
  return {
    rebel: top(side.rebel),
    crowd: top(side.crowd),
    kindred: pairs.length && bestMatch > 0 ? pairsAt(bestMatch) : [],
    rivals: pairs.length && worstMatch < 1 ? pairsAt(worstMatch) : [],
  }
}
