// The five-level trace reveal, shared by the two places a trace is shown:
// the bedroom door in Act 6 (the Murderer's trace, deal.revealTrace) and the
// study's pay-out in Act 4 (the Ghost's trace, station.dealStudy; decided
// 21 Oct 2026, docs/solving-the-case.md). Same ladder, same art, same words.
//
//   1 black and white, hazy · 2 colour, less hazy · 3 two similar options ·
//   4 just the picture · 5 the picture and its name        (Jon, 22 Oct 2026)
//
// A trace is a drawing of an object. Nothing here ever names the person it
// belongs to: no character name, no guest name, no role.
//
// The second option at level 3 is never the other hidden role's trace, so
// one reveal never spoils the other: the bedroom never offers the Ghost's
// trace, the study never offers the Murderer's (the doc's default, G36).
//
// SEAL RULE: which trace belongs to whom is a case fact. Callers write the
// full reveal only to private/* or to the phones of the group that earned it.

import { randomInt } from 'node:crypto'
import { CHARACTERS, readArea } from './night.js'

function shuffled(list, pick = randomInt) {
  const a = [...list]
  for (let i = a.length - 1; i > 0; i--) { const j = pick(i + 1); [a[i], a[j]] = [a[j], a[i]] }
  return a
}
function choice(list, pick = randomInt) { return list.length ? list[pick(list.length)] : undefined }

export const TRACE_STEP = 4 // dial points per rung of the ladder
export function traceLevel(dial) {
  const d = Number(dial) || 0
  const rungs = Math.sign(d) * Math.round(Math.abs(d) / TRACE_STEP) // symmetric: -2 and +2 are one rung each way
  return Math.max(1, Math.min(5, 3 + rungs))
}

// Visually confusable traces (the current fourteen, seed/characters.json).
// Every trace sits in at least two buckets; the two Professors (elbow-patch,
// white-sand) share none, so a level-3 pair can never narrow to them.
export const TRACE_BUCKETS = {
  'pale-powder': ['flour', 'white-sand', 'petals', 'candle-wax'],
  scattered: ['seeds', 'petals', 'coins', 'shattered-vial', 'glasses', 'flour', 'white-sand'],
  'wet-stain': ['ink', 'iodine', 'coffee', 'candle-wax'],
  glass: ['shattered-vial', 'glasses', 'candle-wax', 'coins'],
  pressed: ['boot-print', 'coffee', 'elbow-patch', 'picture'],
  dark: ['ink', 'iodine', 'boot-print', 'seeds', 'coffee'],
  'paper-cloth': ['picture', 'elbow-patch', 'glasses'],
}
const PROFESSOR_TRACES = new Set(['elbow-patch', 'white-sand'])

// One line of context per trace. Safe copy: it names the object, never the
// owner. NOT ON ANY SCREEN since Jon's ladder of 22 Oct 2026 (level 5 is the
// picture and its name, nothing more); kept, with traceContext below and the
// workshop's trace_lines list, so the line can come back if Jon wants it.
export const TRACE_CONTEXT = {
  ink: 'a splash of ink, still wet, beside the writing desk',
  'boot-print': 'a muddy boot print, pointing away from the door',
  flour: 'a dusting of flour along the sideboard',
  coins: 'a scatter of coins, dropped and not picked up',
  petals: 'a trail of petals from the vase to the door',
  seeds: 'seeds, spilled from a pocket and trodden in',
  'shattered-vial': 'a shattered vial, its contents long gone',
  'candle-wax': 'a drip of candle wax, set hard on the floor',
  coffee: 'a coffee ring on the polished wood',
  picture: 'a small picture, face down, its frame cracked',
  glasses: 'a pair of glasses, one lens cracked',
  iodine: 'an iodine stain, brown and spreading',
  'elbow-patch': 'a leather elbow patch, torn clean off',
  'white-sand': 'a sprinkling of white sand on the rug',
}

export function traceOf(characterId) {
  return CHARACTERS.find(ch => ch.id === characterId) ?? null
}

// A second real trace that could be mistaken for `trace`, from a character at
// the party, never one in `exclude`, Professors only when nobody else fits.
export function pickPartner(trace, inPlayTraces, { exclude = [], pick = randomInt } = {}) {
  const buckets = shuffled(Object.values(TRACE_BUCKETS).filter(b => b.includes(trace)), pick)
  const candidates = (list) => list.filter(t => t !== trace && inPlayTraces.includes(t) && !exclude.includes(t))
  for (const bucket of buckets) {
    const all = candidates(bucket)
    if (!all.length) continue
    const plain = all.filter(t => !PROFESSOR_TRACES.has(t))
    return choice(plain.length ? plain : all, pick)
  }
  return null
}

// "LABEL: text" lines from a workshop list.
function labelled(items) {
  const out = {}
  for (const it of items ?? []) {
    const m = /^([A-Z][A-Z0-9 '&/]*):\s*(.+)$/s.exec(String(it?.text ?? '').trim())
    if (m) out[m[1].trim()] = m[2].trim()
  }
  return out
}

// The line for a trace (not shown; see TRACE_CONTEXT): the workshop's trace_lines (a label has no
// hyphen, the label codec: TRACE BOOT PRINT), else the default above.
export async function traceContext(db, trace) {
  const lines = labelled(await readArea(db, 'trace_lines'))
  return lines[`TRACE ${trace.toUpperCase().replace(/-/g, ' ')}`] ?? lines[`TRACE ${trace.toUpperCase()}`] ?? TRACE_CONTEXT[trace] ?? null
}

// One reveal, worked out in full: the level the dial allows, and at level 3
// a look-alike from the party that is not in `exclude`. With nobody to be
// confused with, the two options collapse to the one clear picture (level 4).
export function workReveal({ owner, inPlay = [], exclude = [], dial = 0, pick = randomInt }) {
  let level = traceLevel(dial)
  let partner = null
  if (level === 3) {
    partner = pickPartner(owner.trace, inPlay, { exclude, pick })
    if (!partner) level = 4
  }
  return { level, partner }
}

// What the reveal shows at its level, and nothing more: the picture at levels
// 1, 2 and 4 (the screen greys and blurs it at 1, blurs it a little at 2),
// two pictures in no particular order at level 3, the name only at level 5.
// Never a person.
export function shownReveal({ level, trace, label, partner, pick = randomInt }) {
  if (level === 3) return { level, images: shuffled([trace, partner], pick) }
  return { level, trace, label: level === 5 ? label : null }
}
