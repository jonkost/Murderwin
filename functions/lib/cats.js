// The cats' hint lines (docs/handoff-2026-10-22.md §6): which line a cat
// says at an affection level, filled with which wrong family or motives, and
// what it rules out. Pure. The words are an open bank (seed/cat-lines.json,
// the "Cat Hint Lines" doc); the pick is the case's. Every cat only ever
// rules out WRONG answers: the real family and the real motive are never
// named, and Salem's backwards line points AT a wrong answer.
//
//   Act 2  a guest's one real hint: the wrong family the case gave them
//          (solving.hints), at their own affection.
//   Act 4  a group at a cat: finer clues, on the group's average affection.
//          Motives come from inside the real family first (where the group
//          must still be looking), a family is one the group may still have.
//
// hintLine() returns { text, families, motives }: `families` and `motives`
// are what a guest who reads the line rightly may cross off (Salem at 4, a
// coin flip, counts as nothing, since nobody can tell which way he went).
// The solver (families.remainingMotives) reads them from solving.ruled.
//
// SEAL RULE: nothing here prints or logs.

import { readFileSync } from 'node:fs'
import { dirname, join as joinPath } from 'node:path'
import { fileURLToPath } from 'node:url'
import { FAMILIES, familyOf, motivesOf, unit } from './families.js'

const here = dirname(fileURLToPath(import.meta.url))
export const CAT_LINES = JSON.parse(readFileSync(joinPath(here, '..', 'seed', 'cat-lines.json'), 'utf8')) // copied from ../seed by `npm run seed`
export const HINT_CATS = ['salem', 'zimothy', 'boo', 'granolia']

export function motiveName(n) {
  return CAT_LINES.motiveNames[String(n)] ?? `motive ${n}`
}
const cap = t => (t ? t[0].toUpperCase() + t.slice(1) : t)
// "a", "a and b", "a, b and c"
export function listOf(names) {
  if (names.length <= 1) return names.join('')
  return `${names.slice(0, -1).join(', ')} and ${names.at(-1)}`
}
function seeded(list, seed, ...tag) {
  return list.map(x => ({ x, r: unit(seed, ...tag, x) })).sort((a, b) => a.r - b.r).map(o => o.x)
}
const level = l => Math.min(5, Math.max(1, Math.round(Number(l) || 3)))
// Put a value in a slot. A value that already ends in '.', '?' or '!' (some
// of Granolia's half-names do) takes the place of the full stop after the
// slot, so a line never reads "Not cheese.." or "reply some?.".
export function fillSlot(tpl, slot, value) {
  const v = String(value ?? '')
  return /[.?!]$/.test(v) ? tpl.replace(`${slot}.`, v).replace(slot, v) : tpl.replace(slot, v)
}

// What this line names, before the words: the family and the motives.
//   family   the wrong family the line is about
//   pool     wrong motives to name one or two of, best first
//   bonus    wrong motives outside the family, best first
function targets(c, { act, family, seed, exclude = [] }) {
  const real = Number(c?.motive)
  const realFamily = familyOf(real)
  const out = new Set(exclude.map(Number))
  if (act === 4) {
    // finer clues: inside the real family first, then the family the line names
    const mates = seededOrder(motivesOf(realFamily).filter(n => n !== real && !out.has(n)), seed, 'mates')
    const inFam = seededOrder(motivesOf(family).filter(n => n !== real), seed, 'fam')
    return { family, pool: [...mates, ...inFam.filter(n => !mates.includes(n))], bonus: mates }
  }
  const inFam = seededOrder(motivesOf(family).filter(n => n !== real), seed, 'fam')
  const bonus = seededOrder(motivesOf(realFamily).filter(n => n !== real && !out.has(n)), seed, 'bonus')
  const others = seededOrder(FAMILIES.flatMap(f => f.motives).filter(n => n !== real && familyOf(n) !== family && familyOf(n) !== realFamily), seed, 'other')
  return { family, pool: inFam, bonus: [...bonus, ...others] }
}
function seededOrder(list, seed, tag) { return seeded(list, seed, tag) }

// One cat's line. `family` is a wrong family (Act 2: the guest's hint
// family; Act 4: one the group may still have). `seed` makes the choices
// (which motives, Salem's coin) the same every time for the same guest.
export function hintLine(c, { cat, level: raw, act = 2, family, seed = '', exclude = [] } = {}) {
  const l = level(raw)
  const real = Number(c?.motive)
  if (!HINT_CATS.includes(cat) || !family || family === familyOf(real)) return { text: null, families: [], motives: [] }
  const t = targets(c, { act, family, seed, exclude })
  const name = n => motiveName(n)
  if (cat === 'salem') {
    const straight = l === 5 || (l === 4 && unit(seed, 'salem-coin') < 0.5)
    const decodable = l !== 4
    if (act === 4) {
      const n = t.pool[0]
      const pair = n ? CAT_LINES.salem.act4[String(n)] : null
      if (!pair) return { text: null, families: [], motives: [] }
      return { text: straight ? pair.wasnt : pair.was, families: [], motives: decodable ? [n] : [], straight }
    }
    const pair = CAT_LINES.salem.act2[family]
    return { text: straight ? pair.wasnt : pair.was, families: decodable ? [family] : [], motives: [], straight }
  }
  if (cat === 'zimothy') {
    const tpl = CAT_LINES.zimothy.levels[String(l)]
    if (l <= 2) { const n = t.pool[0]; return { text: tpl.replace('[MOTIVE]', n === undefined ? '' : (tpl.startsWith('[MOTIVE]') ? cap(name(n)) : name(n))), families: [], motives: n === undefined ? [] : [n] } }
    if (l === 3) { const ns = t.pool.slice(0, 2); return { text: tpl.replace('[MOTIVES]', listOf(ns.map(name))), families: [], motives: ns } }
    const whole = motivesOf(family).filter(n => n !== real)
    if (l === 4) return { text: tpl.replace('[MOTIVES]', listOf(whole.map(name))), families: [family], motives: [] }
    const b = t.bonus.find(n => familyOf(n) !== family)
    return { text: tpl.replace('[MOTIVES]', listOf(whole.map(name))).replace('[BONUS]', b === undefined ? '' : name(b)), families: [family], motives: b === undefined ? [] : [b] }
  }
  if (cat === 'boo') {
    if (l <= 2) return { text: CAT_LINES.boo.levels[String(l)], families: [], motives: [] }
    if (l === 3) { const n = t.pool[0]; return { text: CAT_LINES.boo.levels['3'].replace('[MOTIVE]', cap(name(n))), families: [], motives: [n] } }
    if (l === 4) return { text: CAT_LINES.boo.family4[family], families: [family], motives: [] }
    const b = t.bonus.find(n => familyOf(n) !== family)
    return { text: CAT_LINES.boo.family5[family].replace('[BONUS]', name(b)), families: [family], motives: b === undefined ? [] : [b] }
  }
  // granolia
  const tpl = CAT_LINES.granolia.levels[String(l)]
  if (l === 1) return { text: tpl, families: [], motives: [] }
  if (l === 2) { const n = t.pool[0]; return { text: fillSlot(tpl, '[HALF]', CAT_LINES.granolia.half[String(n)] ?? name(n)), families: [], motives: [n] } }
  if (l === 3) { const n = t.pool[0]; return { text: tpl.replace('[MOTIVE]', name(n)), families: [], motives: [n] } }
  if (l === 4) { const [a, b] = t.pool; return { text: tpl.replace('[MOTIVE]', name(a)).replace('[MOTIVE2]', name(b ?? a)), families: [], motives: [a, b].filter(x => x !== undefined) } }
  const whole = motivesOf(family).filter(n => n !== real)
  return { text: tpl.replace('[MOTIVES]', listOf(whole.map(name))), families: [family], motives: [] }
}

// The wrong family an Act 4 group's cat talks about: one none of them has
// had ruled out yet (the news, any member's hint), else any wrong family.
export function groupFamily(c, { members = [], seed = '' } = {}) {
  const s = c?.solving ?? {}
  const realFamily = familyOf(Number(c?.motive))
  const out = new Set([...(s.newsOut ?? []), ...members.map(k => s.hints?.[k]).filter(Boolean)])
  const wrong = FAMILIES.map(f => f.key).filter(k => k !== realFamily)
  const fresh = wrong.filter(k => !out.has(k))
  return seeded(fresh.length ? fresh : wrong, seed, 'group-family')[0]
}
