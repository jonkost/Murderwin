// How the case gets solved (docs/solving-the-case.md, decided 21 Oct 2026):
// the five motive families and the pure rules that narrow nineteen motives
// to one across the night. No database here; the dealer (deal.js), the room
// screens (screen.js) and the case builder (case.js) call these.
//
//  Act 2  W-O-O-F News bulletin 1 rules out exactly one wrong family for
//         everyone; each guest is given two of the other wrong families, and
//         the four cats they visit privately name only those two (or the one
//         the news took), at each cat's rung (handoff 23 Oct §10.4), so no
//         guest alone can name the real family before supper (G45).
//  Act 4  Zimothy's memory match and Boo's catwalk each cross one wrong
//         motive off a group's list.
//  Act 5  Sir Irwin's countdown: five motive cards at dial 1 down to one at
//         dial 5; the real one is always among them (22 Oct 2026).
//
// SEAL RULE. Which family is real, which families a guest is told about,
// what the memory match crossed off and what Irwin names are all case
// facts: they live in cases/{nightId}.solving (Admin SDK only) and reach a
// phone or a screen only as the clue itself. Nothing here prints or logs.
// Family names never reach a player: no card, screen or doc carries one.
//
// cases/{nightId}.solving = {
//   family: key               the real motive's family
//   newsOut: [key]            the wrong families the Act 2 news flash rules out
//   hints: { guestKey: [key, key] }  the two wrong families a guest's four cats may name (Act 2)
//   memory: { groupId: n }    the motive the memory match crossed off for a group (Act 4)
//   boo: { groupId: n }       the motive Boo's catwalk crossed off for a group (Act 4)
//   struck: [n]               the motives the Act 3 bulletin struck (screen.js)
// }

import { readFileSync } from 'node:fs'
import { dirname, join as joinPath } from 'node:path'
import { fileURLToPath } from 'node:url'
import { randomInt, createHash } from 'node:crypto'

const here = dirname(fileURLToPath(import.meta.url))
const seedDir = joinPath(here, '..', 'seed') // copied from ../seed by `npm run seed`
export const FAMILIES = JSON.parse(readFileSync(joinPath(seedDir, 'families.json'), 'utf8')).families
const NIGHT = JSON.parse(readFileSync(joinPath(seedDir, 'night.json'), 'utf8'))
export const SOLVING = NIGHT.solving ?? {}
export const ALL_MOTIVES = FAMILIES.flatMap(f => f.motives).sort((a, b) => a - b)

// How many wrong families W-O-O-F News bulletin 1 rules out: exactly one
// (settled 22 Oct 2026, docs/handoff-2026-10-22.md §3).
export function newsCount() {
  return 1
}

function shuffled(list, rng) {
  const a = [...list]
  for (let i = a.length - 1; i > 0; i--) { const j = rng(i + 1); [a[i], a[j]] = [a[j], a[i]] }
  return a
}

// A number in [0, 1) that is always the same for the same parts.
export function unit(...parts) {
  const h = createHash('sha256').update(parts.map(String).join('\u0000')).digest()
  return h.readUInt32BE(0) / 0x100000000
}
// The list in a fixed order that only the seed decides.
function seededOrder(list, seed, ...tag) {
  return list.map(x => ({ x, r: unit(seed, ...tag, x) })).sort((a, b) => a.r - b.r).map(o => o.x)
}

export function familyOf(n) {
  return FAMILIES.find(f => f.motives.includes(Number(n)))?.key ?? null
}
export function motivesOf(key) {
  return FAMILIES.find(f => f.key === key)?.motives ?? []
}
// The other motives in the same family as n.
export function familyMates(n) {
  return motivesOf(familyOf(n)).filter(m => m !== Number(n))
}

// ---------------------------------------------------------------------------
// The case's plan, dealt with the case: the real family, the news flash's
// family, and two wrong families per guest. The three wrong families the
// news did not take make three pairs; the pairs go round the room in turn,
// so every wrong family reaches someone once there are three guests. Never
// the real family.

export const HINT_CATS = Object.keys(SOLVING.catRooms ?? { granolia: 1, salem: 1, zimothy: 1, boo: 1 })
// How many wrong families one guest's four cats may name (G45: with the news,
// at least two families always stand for any one guest after Act 2).
export const HINTS_PER_GUEST = 2

// Every pair of the families, in order.
function pairsOf(list) {
  const out = []
  for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) out.push([list[i], list[j]])
  return out
}

export function solvingPlan({ motive, keys = [], rng = randomInt, config = SOLVING } = {}) {
  const family = familyOf(motive)
  const wrong = shuffled(FAMILIES.map(f => f.key).filter(k => k !== family), rng)
  const newsOut = wrong.slice(0, newsCount(config))
  const rest = wrong.slice(newsOut.length)
  const pairs = rest.length > HINTS_PER_GUEST ? shuffled(pairsOf(rest), rng) : [rest]
  const hints = {}
  shuffled(keys, rng).forEach((k, i) => { if (rest.length) hints[k] = [...pairs[i % pairs.length]] })
  return { family, newsOut, hints, memory: {}, boo: {}, struck: [] }
}

// A guest's wrong families as a list (a case from before 24 Oct held one).
export function hintsOf(solving, key) {
  const h = solving?.hints?.[key]
  return Array.isArray(h) ? h : h ? [h] : []
}
// Every family any guest's hints may name.
export function allHintFamilies(solving) {
  return [...new Set(Object.keys(solving?.hints ?? {}).flatMap(k => hintsOf(solving, k)))]
}

// The two families a guest who has none yet is given (a late joiner): the
// pair, among the wrong families the news did not take, that the fewest
// guests hold.
export function hintFamiliesFor(solving, key) {
  if (hintsOf(solving, key).length) return hintsOf(solving, key)
  const rest = FAMILIES.map(f => f.key).filter(k => k !== solving?.family && !(solving?.newsOut ?? []).includes(k))
  if (!rest.length) return []
  const held = Object.keys(solving?.hints ?? {}).flatMap(k => hintsOf(solving, k))
  const count = f => held.filter(x => x === f).length
  return [...rest].sort((a, b) => count(a) - count(b) || a.localeCompare(b)).slice(0, HINTS_PER_GUEST)
}

// Which of a guest's two families a cat's line is about: the cats share them
// out, seeded on the guest, so both are used across the four.
export function familyForCat(families, { cat, seed = '' } = {}) {
  if (!families?.length) return null
  if (families.length === 1) return families[0]
  const order = HINT_CATS.map(c => ({ c, r: unit(seed, 'cat-family', c) })).sort((a, b) => a.r - b.r).map(x => x.c)
  return families[order.indexOf(cat) % families.length] ?? families[0]
}

// ---------------------------------------------------------------------------
// Act 4's cross-offs: Zimothy's memory match and Boo's catwalk each take one
// wrong motive off a group's list (tag 'memory' or 'boo'), never the same one
// for two groups, never the real one (G51).
// It is one the group might still have: not in a family the news or a
// member's hint ruled out, not struck by the bulletin, not crossed off for
// another group already. Inside the real family first (where the group must
// still be looking), then anywhere they might still look, then any wrong one.
// Never the real motive. Seeded on the case, so a second call picks the same.

export function memoryPick(c, { groupId = '', members = [], seed = '', tag = 'memory' } = {}) {
  const s = c?.solving ?? {}
  const real = Number(c?.motive)
  const out = new Set([...(s.newsOut ?? []), ...members.flatMap(k => hintsOf(s, k))])
  // never one already crossed off for any group, by the match or by Boo
  const crossed = new Set([...Object.values(s.memory ?? {}), ...Object.values(s.boo ?? {})].map(Number))
  const struck = new Set((s.struck ?? []).map(Number))
  const wrong = ALL_MOTIVES.filter(n => n !== real)
  const mightHave = wrong.filter(n => !out.has(familyOf(n)) && !struck.has(n) && !crossed.has(n))
  const inFamily = mightHave.filter(n => familyOf(n) === s.family)
  const fresh = wrong.filter(n => !crossed.has(n))
  const pool = inFamily.length ? inFamily : mightHave.length ? mightHave : fresh.length ? fresh : wrong
  return seededOrder(pool, seed, tag, groupId)[0]
}

// ---------------------------------------------------------------------------
// Sir Irwin's countdown (Act 5, docs/handoff-2026-10-22.md §5). By the
// clarity dial's band (1 to 5): five motive cards at 1, four at 2, three at
// 3, two at 4, one at 5. The real motive is always one of them. The filler
// comes from the real family first (the ones the room has already crossed
// off, by the memory match or the bulletin, before the rest), then from the
// families already ruled out (the news flash, then the guests' hints), so
// the room can name the motive by the end of Act 5. Returned in number
// order, so the order says nothing.

export function irwinCount(band) {
  const b = Math.min(5, Math.max(1, Math.round(Number(band) || 3)))
  return 6 - b
}

export function irwinOptions(c, { band = 3, seed = '' } = {}) {
  const real = Number(c?.motive)
  if (!ALL_MOTIVES.includes(real)) return []
  const want = irwinCount(band) - 1
  const s = c?.solving ?? {}
  const gone = new Set([...Object.values(s.memory ?? {}), ...Object.values(s.boo ?? {}), ...(s.struck ?? [])].map(Number))
  const mates = seededOrder(familyMates(real), seed, 'irwin')
  const ruledOut = [...new Set([...(s.newsOut ?? []), ...allHintFamilies(s)])]
    .flatMap(k => seededOrder(motivesOf(k), seed, 'irwin', k))
  const order = [...mates.filter(n => gone.has(n)), ...mates.filter(n => !gone.has(n)), ...ruledOut]
  return [real, ...order.slice(0, want)].sort((a, b) => a - b)
}

// ---------------------------------------------------------------------------
// The solver (G32): what the whole room can still believe once it has shared
// every structured clue up to the end of Act 5. The words of a cat's line
// are never read here; only what each clue rules out.

// Bulletin 2 (Act 3) names the real family at the dial's level; the solver
// counts it as read from level 3 up (BULLETIN_READ_FROM), and as no help below.
export const BULLETIN_READ_FROM = 3

export function remainingMotives({ newsOut = [], hintFamilies = [], hintMotives = [], struck = [], crossed = [], family = null, irwin = null } = {}) {
  const out = new Set([...newsOut, ...hintFamilies])
  const gone = new Set([...struck, ...crossed, ...hintMotives].map(Number))
  let left = ALL_MOTIVES.filter(n => !out.has(familyOf(n)) && !gone.has(n))
  if (family) left = left.filter(n => familyOf(n) === family)
  if (Array.isArray(irwin) && irwin.length) left = left.filter(n => irwin.map(Number).includes(n))
  return left
}

// Every structured clue a case dealt, for the solver. `ruled` is what each
// real cat line actually ruled out (cats.js), when the night recorded it: a
// low-affection cat may rule out one motive of a family, or nothing. Without
// it, every guest's hint family counts as ruled out whole. `bulletinBand` is
// the dial's band when bulletin 2 played.
export function roomClues(c, { irwin = null, bulletinBand = null } = {}) {
  const s = c?.solving ?? {}
  const ruled = s.ruled ? Object.values(s.ruled) : null
  return {
    newsOut: s.newsOut ?? [],
    hintFamilies: ruled ? [...new Set(ruled.flatMap(r => r.families ?? []))] : allHintFamilies(s),
    hintMotives: ruled ? [...new Set(ruled.flatMap(r => r.motives ?? []))] : [],
    struck: s.struck ?? [],
    crossed: [...Object.values(s.memory ?? {}), ...Object.values(s.boo ?? {})],
    family: bulletinBand != null && bulletinBand >= BULLETIN_READ_FROM ? s.family ?? null : null,
    irwin,
  }
}
