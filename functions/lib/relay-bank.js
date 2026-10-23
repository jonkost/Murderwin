// The Relay Drawing's pictures (docs/handoff-2026-10-22.md §7, the Claude Doc
// "The Relay Drawing · How to Play"): a practice smiley, then three rounds,
// 3 × 3, 4 × 4 and 5 × 5.
//
// The practice smiley is public (everyone sees it explained first). The three
// real pictures are SEALED: a bank Jon never sees, at sealed/relay_pictures,
// written by scripts/generate-relay-pictures.mjs (blind, counts only) or by
// Jenna. The drawing reads it on the party night only; a rehearsal, or a bank
// with no good picture for a round, uses the random stand-in grids
// (relay-gen.js) for that round instead.
//
// sealed/relay_pictures = { pictures: [{ id, round: 1|2|3, name, decoys: [3 names], cells: { A1: [stroke] } }] }
// Strokes are relay-gen.js's: line, arc, circle, dot, in cell-local 0..1.
// The smiley, the house and the diamond pattern are the style samples, and a
// star was Jon's example of the art: none may ever be a real picture. Nor may
// anything on the never-list (a trace, or an object on a motive card), by its
// name or any of its three wrong names.
//
// SEAL RULE: nothing here prints or logs. Checks return counts and reasons
// that name no picture.

import { createHash } from 'node:crypto'
import { cellLabel } from './relay-gen.js'

export const BANK_DOC = 'sealed/relay_pictures'
export const ROUND_SIZES = { 1: 3, 2: 4, 3: 5 }
// the most drawn squares a round may have, so the night's turns fit the drawing's time
export const ROUND_CAPS = { 1: 9, 2: 11, 3: 13 }
// The style samples, the star Jon wrote as the example of the art, and the
// teapot the generator's brief once gave as its example name: pictures Jon
// could guess (Rule 1). The brief now gives no example picture at all.
export const DISQUALIFIED = ['smiley', 'smile', 'house', 'diamond', 'star', 'teapot']
// Things that are clues elsewhere in the game, so a picture of one would read
// as a clue in Act 6: the drawn traces, and the objects on the motive cards
// (docs/handoff-2026-10-22.md §3). The generator's brief names them too.
export const TRACE_WORDS = ['ink', 'boot', 'flour', 'coin', 'petal', 'flower', 'seed', 'vial', 'bottle', 'candle', 'wax', 'coffee', 'cup', 'mug', 'picture', 'frame', 'glasses', 'spectacles', 'iodine', 'elbow patch', 'sand']
export const MOTIVE_WORDS = ['pie', 'pizza', 'snack', 'car', 'game controller', 'ring', 'tissue', 'toilet', 'toilet roll', 'cheese', 'shirt', 'speaker', 'phone', 'plate', 'charger', 'plug', 'cord', 'crown', 'book', 'door', 'shopping cart', 'envelope', 'cake']
export const NEVER_WORDS = [...TRACE_WORDS, ...MOTIVE_WORDS]
const KINDS = ['line', 'arc', 'circle', 'dot']

// Does a name say one of these words? A whole word, or its plural, anywhere in
// the name; a word of four letters or more also inside a longer word
// ("sunglasses", "doorknob", "starfish"); a three-letter word also at the end
// of one ("teacup", "racecar"). Strict on purpose: a picture that matches is
// dropped and counted, and the generator makes another.
export function namesAny(name, list) {
  const n = String(name ?? '').toLowerCase()
  return list.some(w => {
    const esc = w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    if (w.length >= 4) return n.includes(w)
    return new RegExp(`${esc}(s|es)?\\b`).test(n)
  })
}

const arc = (from, to, bulge) => ({ kind: 'arc', from, to, bulge })
// The practice round: the whole face fills the 3 × 3 grid, square by square
// as the How to Play page describes it. No single square gives it away.
export const PRACTICE = {
  name: 'A smiley face',
  decoys: ['A sun', 'A clock', 'A cookie'],
  cells: {
    A1: [arc([0.5, 1], [1, 0.5], -0.25)],
    B1: [arc([0, 0.5], [1, 0.5], -0.3)],
    C1: [arc([0, 0.5], [0.5, 1], -0.25)],
    A2: [arc([0.5, 0], [0.5, 1], 0.1), { kind: 'dot', at: [0.8, 0.4] }],
    B2: [arc([0.2, 0.6], [0.8, 0.6], 0.4)],
    C2: [arc([0.5, 0], [0.5, 1], -0.1), { kind: 'dot', at: [0.2, 0.4] }],
    A3: [arc([0.5, 0], [1, 0.5], 0.25)],
    B3: [arc([0, 0.5], [1, 0.5], 0.3)],
    C3: [arc([0, 0.5], [0.5, 0], 0.25)],
  },
}

const inUnit = p => Array.isArray(p) && p.length === 2 && p.every(v => typeof v === 'number' && v >= 0 && v <= 1)

// Why a picture cannot be used for a round, or [] when it can. Reasons are
// generic: never the picture's name or a stroke.
export function checkPicture(p, round) {
  const bad = []
  const size = ROUND_SIZES[round]
  if (!size) return ['round']
  if (typeof p?.name !== 'string' || !p.name.trim()) bad.push('name')
  const names = [p?.name, ...(Array.isArray(p?.decoys) ? p.decoys : [])].map(x => String(x ?? '').trim().toLowerCase())
  if (!Array.isArray(p?.decoys) || p.decoys.length !== 3 || new Set(names).size !== 4 || names.some(n => !n)) bad.push('decoys')
  // the answer and all three wrong names: a clue word anywhere among the four could read as a clue
  if (names.some(n => namesAny(n, DISQUALIFIED))) bad.push('disqualified')
  if (names.some(n => namesAny(n, NEVER_WORDS))) bad.push('never')
  const labels = new Set(Array.from({ length: size * size }, (_, i) => cellLabel(Math.floor(i / size), i % size)))
  const cells = p?.cells && typeof p.cells === 'object' ? p.cells : {}
  const drawn = Object.entries(cells).filter(([, s]) => Array.isArray(s) && s.length)
  if (drawn.length < size || drawn.length > ROUND_CAPS[round]) bad.push('squares')
  for (const [label, strokes] of drawn) {
    if (!labels.has(label)) { bad.push('label'); continue }
    if (strokes.length > 2) bad.push('strokes')
    for (const s of strokes) {
      if (!KINDS.includes(s?.kind)) { bad.push('kind'); continue }
      if (s.kind === 'line' || s.kind === 'arc') { if (!inUnit(s.from) || !inUnit(s.to)) bad.push('bounds') }
      else if (!inUnit(s.at)) bad.push('bounds')
      if (s.kind === 'arc' && !(typeof s.bulge === 'number' && Math.abs(s.bulge) <= 0.6)) bad.push('bulge')
      if (s.kind === 'circle' && !(typeof s.r === 'number' && s.r > 0 && s.r <= 0.5)) bad.push('radius')
    }
  }
  return [...new Set(bad)]
}

function unit(...parts) {
  const h = createHash('sha256').update(parts.map(String).join('\u0000')).digest()
  return h.readUInt32BE(0) / 0x100000000
}
function shuffle(list, seed, tag) {
  return list.map((x, i) => ({ x, r: unit(seed, tag, i) })).sort((a, b) => a.r - b.r).map(o => o.x)
}

// A grid the drawing can play, from a picture: the drawn squares in a
// shuffled order, and four named options with the answer's place.
export function gridOf(p, size, number, seed) {
  const cells = Object.fromEntries(Object.entries(p.cells).filter(([, s]) => Array.isArray(s) && s.length))
  const options = shuffle([p.name, ...p.decoys], seed, `options-${number}`)
  return {
    number, size, cells,
    order: shuffle(Object.keys(cells).sort(), seed, `order-${number}`),
    options: options.map(name => ({ name })),
    answer: options.indexOf(p.name),
    named: true,
  }
}

// The night's four grids: the practice smiley, then one bank picture per
// round when the bank has a good one, else the stand-in grid for that round.
// Returns { grids, fromBank } where fromBank counts the rounds the bank filled.
export function relayGrids({ bank = null, standIn, seed }) {
  const grids = [gridOf(PRACTICE, 3, 0, seed)]
  let fromBank = 0
  for (const round of [1, 2, 3]) {
    const good = (bank?.pictures ?? []).filter(p => Number(p?.round) === round && !checkPicture(p, round).length)
    if (good.length) {
      const pick = good[Math.floor(unit(seed, 'bank', round) * good.length)]
      grids.push(gridOf(pick, ROUND_SIZES[round], round, seed))
      fromBank++
    } else {
      const g = standIn.grids[round - 1]
      grids.push({ ...g, number: round, options: g.options.map(cells => ({ cells, size: g.size })), named: false })
    }
  }
  return { grids, fromBank }
}
