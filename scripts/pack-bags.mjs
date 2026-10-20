// The blind bag packer. Reads the bag item pool Jon and Susan wrote in the
// workshop (safe_content/bag_items), decides which items go in which
// numbered bag under the bag rules, and writes the packing to sealed/bags.
// Only the Steward's view ever shows it; Jenna packs the bags to it.
//
// SEAL RULE: stdout gets COUNTS AND PASS/FAIL ONLY. Never an item, never a
// property word, never a bag's contents. Errors are redacted.
//
//   node pack-bags.mjs            pack from Firestore, write sealed/bags
//   node pack-bags.mjs --repack   replace a packing that is already there
//   node pack-bags.mjs --dry      pack a synthetic pool in memory, write nothing
//   --seed N                      a fixed random seed (tests and dry runs)
//
// THE BAG RULES (docs/bag-items-for-claude-code.md, chats/docs/sirwin-manor-bag-system.md):
//   10 bags, 6 items each, 60 items packed, from a pool Jon buys whole.
//   Each bag: one item for each of the five senses, plus one spare of any sense.
//   Every property that gets used lands in 2 or 3 bags. Never 1.
//   Every bag has at least 2 clueable properties.
//   Prefer not to put two items with the same property in one bag.
//   The second copy of a taste item goes in the same bag as the first.
//   Stacked clues: pairs of properties whose holders overlap in exactly one
//   bag; the generator must never deal one player both halves. Count only.
//
// THE SEALED SHAPE. sealed/bags = {
//   bags:         { "1": [itemId, ...], ... "10": [...] }   six workshop item ids per bag
//   doubles:      { "n": [itemId] }        the taste items to pack twice in that bag
//   properties:   { property: [n, ...] }   which bags carry each property (2 or 3)
//   stackedPairs: [{ a: property, b: property }]   the pairs the generator keeps apart
//                 (objects, not pairs: Firestore refuses arrays nested in arrays)
//   counts:       { bags, items, properties, stackedPairs }
//   packedAt:     Date, packedBy: 'packer' | 'steward', poolHash
// }
// Item ids are the workshop's own; the Steward's view joins them back to the
// lines in safe_content/bag_items, so this doc never carries an item name.

import { randomInt } from 'node:crypto'
import { adminDb, memoryDb, say, printFatal, redactedError, sha12, LINE_MAX } from './lib.mjs'

export const SENSES = ['sight', 'sound', 'smell', 'touch', 'taste']
export const BAGS = 10
export const PER_BAG = 6
export const ATTEMPTS = 600

// "Item — sense: property; sense: property" -> { item, props: [{ sense, property }] }.
// The first property is the item's own sense; any after it count for the
// packing too. A line that does not fit is null (the workshop lint already
// says so to Jon).
export function parseBagLine(text) {
  const t = String(text ?? '')
  const dash = t.indexOf('—')
  if (dash < 0) return null
  const item = t.slice(0, dash).trim()
  const props = []
  for (const part of t.slice(dash + 1).split(';')) {
    const c = part.indexOf(':')
    if (c < 0) continue
    const sense = part.slice(0, c).trim().toLowerCase()
    const property = part.slice(c + 1).trim().toLowerCase().replace(/\s+/g, ' ')
    if (SENSES.includes(sense) && property) props.push({ sense, property })
  }
  if (!item || !props.length) return null
  return { item, props }
}

export function poolFromItems(items) {
  const out = []
  for (const it of items) {
    const p = parseBagLine(it.text)
    if (p) out.push({ id: it.id, ...p })
  }
  return out
}

// A small seeded generator for tests and dry runs; the real run uses crypto.
export function seededRng(seed) {
  let a = (Number(seed) >>> 0) || 1
  return (n) => {
    a = (a + 0x6D2B79F5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    const unit = ((t ^ (t >>> 14)) >>> 0) / 4294967296
    return Math.floor(unit * n)
  }
}
const cryptoRng = (n) => randomInt(n)

function shuffled(list, rng) {
  const a = [...list]
  for (let i = a.length - 1; i > 0; i--) { const j = rng(i + 1); [a[i], a[j]] = [a[j], a[i]] }
  return a
}

// One attempt at a packing. Returns { bags, doubles } or null when it could
// not place everything under the rules.
function attempt(pool, rng, { bags = BAGS, perBag = PER_BAG } = {}) {
  const bySense = Object.fromEntries(SENSES.map(s => [s, []]))
  for (const it of pool) bySense[it.props[0].sense].push(it)
  // groups: items of one sense sharing a primary property, two or more of them
  const groupsOf = (sense) => {
    const by = {}
    for (const it of bySense[sense]) (by[it.props[0].property] ??= []).push(it)
    return Object.values(by).filter(g => g.length >= 2)
  }
  const groups = Object.fromEntries(SENSES.map(s => [s, groupsOf(s)]))
  const capacity = Object.fromEntries(SENSES.map(s => [s, groups[s].reduce((n, g) => n + Math.min(3, g.length), 0)]))
  const target = Object.fromEntries(SENSES.map(s => [s, bags]))
  if (SENSES.some(s => capacity[s] < bags)) return null
  // the spares: one per bag, spread over the senses that have room
  for (let i = 0; i < bags * (perBag - SENSES.length); i++) {
    const room = SENSES.filter(s => capacity[s] > target[s])
    if (!room.length) return null
    target[room[rng(room.length)]]++
  }
  // pick property groups of two or three per sense until the target is met
  const chosen = Object.fromEntries(SENSES.map(s => [s, []]))
  for (const s of SENSES) {
    let left = target[s]
    for (const g of shuffled(groups[s], rng)) {
      if (left === 0) break
      let size = Math.min(3, g.length, left)
      if (left - size === 1) size -= 1
      if (size < 2) continue
      chosen[s].push(shuffled(g, rng).slice(0, size))
      left -= size
    }
    if (left !== 0) return null
  }
  // place: each sense's slot in every bag, then the spares
  const contents = Object.fromEntries(Array.from({ length: bags }, (_, i) => [i + 1, []]))
  const propsIn = Object.fromEntries(Array.from({ length: bags }, (_, i) => [i + 1, new Set()]))
  const place = (n, it) => { contents[n].push(it); for (const p of it.props) propsIn[n].add(p.property) }
  // every bag gets one item of each sense, in a bag that holds none of the
  // item's properties yet (its second property counts too); the rest of a
  // sense's items are the spares
  const numbers = Object.keys(contents).map(Number)
  const fits = (n, it) => !it.props.some(p => propsIn[n].has(p.property))
  const spares = []
  for (const s of SENSES) {
    const items = shuffled(chosen[s].flat(), rng)
    const free = new Set(numbers)
    let placed = 0
    for (const it of items) {
      if (placed === bags) { spares.push(it); continue }
      const open = [...free].filter(n => fits(n, it))
      if (!open.length) return null
      const n = open[rng(open.length)]
      place(n, it); free.delete(n); placed++
    }
    if (placed !== bags) return null
  }
  for (const it of shuffled(spares, rng)) {
    const open = numbers.filter(n => contents[n].length < perBag && fits(n, it))
    if (!open.length) return null
    place(open[rng(open.length)], it)
  }
  const out = {}
  const doubles = {}
  for (const n of Object.keys(contents)) {
    out[n] = contents[n].map(it => it.id)
    const taste = contents[n].filter(it => it.props[0].sense === 'taste').map(it => it.id)
    if (taste.length) doubles[n] = taste
  }
  return { bags: out, doubles }
}

// Which bags carry each property, from a packing and the pool.
export function propertyMap(packing, pool) {
  const byId = Object.fromEntries(pool.map(it => [it.id, it]))
  const props = {}
  for (const [n, ids] of Object.entries(packing.bags ?? {})) {
    for (const id of ids) for (const p of byId[id]?.props ?? []) (props[p.property] ??= new Set()).add(Number(n))
  }
  return Object.fromEntries(Object.entries(props).map(([k, v]) => [k, [...v].sort((a, b) => a - b)]))
}

export function stackedPairs(properties) {
  const names = Object.keys(properties).sort()
  const pairs = []
  for (let i = 0; i < names.length; i++) {
    for (let j = i + 1; j < names.length; j++) {
      const a = new Set(properties[names[i]])
      const shared = properties[names[j]].filter(n => a.has(n)).length
      if (shared === 1) pairs.push([names[i], names[j]])
    }
  }
  return pairs
}

// Every rule, checked independently of how the packing was made. Reason
// codes only: never an item, never a property.
export function checkPacking(packing, pool, { bags = BAGS, perBag = PER_BAG } = {}) {
  const fails = []
  const byId = Object.fromEntries(pool.map(it => [it.id, it]))
  const numbers = Object.keys(packing?.bags ?? {}).map(Number).sort((a, b) => a - b)
  if (numbers.length !== bags || numbers.some((n, i) => n !== i + 1)) fails.push('bag-count')
  const seen = new Set()
  let samePropertyInBag = 0
  for (const n of numbers) {
    const ids = packing.bags[n]
    if (ids.length !== perBag) fails.push(`bag-${n}:size`)
    const items = ids.map(id => byId[id]).filter(Boolean)
    if (items.length !== ids.length) fails.push(`bag-${n}:unknown-item`)
    for (const id of ids) { if (seen.has(id)) fails.push(`bag-${n}:repeat`); seen.add(id) }
    const senses = new Set(items.map(it => it.props[0].sense))
    if (SENSES.some(s => !senses.has(s))) fails.push(`bag-${n}:sense`)
    const props = items.flatMap(it => it.props.map(p => p.property))
    if (new Set(props).size < 2) fails.push(`bag-${n}:clueable`)
    samePropertyInBag += props.length - new Set(props).size
    const taste = items.filter(it => it.props[0].sense === 'taste').map(it => it.id)
    const doubled = packing.doubles?.[n] ?? []
    if (taste.some(id => !doubled.includes(id))) fails.push(`bag-${n}:taste-double`)
  }
  const properties = propertyMap(packing, pool)
  for (const [, list] of Object.entries(properties)) if (list.length < 2 || list.length > 3) { fails.push('property-count'); break }
  return { ok: fails.length === 0, fails, properties, samePropertyInBag, stacked: stackedPairs(properties) }
}

// Pack a pool. Tries until a packing passes every rule; the result says so.
export function packBags(pool, { rng = cryptoRng, attempts = ATTEMPTS, bags = BAGS, perBag = PER_BAG } = {}) {
  let last = null
  for (let i = 0; i < attempts; i++) {
    const p = attempt(pool, rng, { bags, perBag })
    if (!p) continue
    const check = checkPacking(p, pool, { bags, perBag })
    last = { ...p, check, tries: i + 1 }
    if (check.ok) return last
  }
  return last ?? { bags: {}, doubles: {}, check: { ok: false, fails: ['no-packing'], properties: {}, stacked: [], samePropertyInBag: 0 }, tries: attempts }
}

export function sealedDoc(result, pool, { now = new Date() } = {}) {
  return {
    bags: result.bags,
    doubles: result.doubles,
    properties: result.check.properties,
    stackedPairs: result.check.stacked.map(([a, b]) => ({ a, b })),
    counts: {
      bags: Object.keys(result.bags).length,
      items: Object.values(result.bags).reduce((n, l) => n + l.length, 0),
      properties: Object.keys(result.check.properties).length,
      stackedPairs: result.check.stacked.length,
      pool: pool.length,
    },
    packedAt: now,
    packedBy: 'packer',
    poolHash: sha12(pool.map(it => it.id).sort()),
  }
}

async function readPool(db) {
  const snap = await db.collection('safe_content').doc('bag_items').get()
  const raw = snap.exists ? snap.data()?.items : []
  const items = Array.isArray(raw) ? raw : Array.isArray(raw?.items) ? raw.items : []
  const live = items.filter(i => !i.deleted && typeof i.text === 'string' && i.text.trim()).sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
  return { live: live.length, pool: poolFromItems(live) }
}

// The whole run against a db (the Admin SDK or memoryDb). Prints counts only.
export async function runPack(db, { repack = false, rng = cryptoRng, now = new Date(), log = say, dry = false } = {}) {
  const ref = db.collection('sealed').doc('bags')
  const existing = await ref.get()
  const prior = existing.exists ? existing.data() : null
  if (prior && (prior.packedAt || prior.packedBy === 'steward') && !repack) {
    log(`sealed/bags is already packed${prior.packedBy === 'steward' ? ' (by the Steward)' : ''}; run with --repack to replace it`)
    return { skipped: true, pass: true }
  }
  const { live, pool } = await readPool(db)
  log(`bag items read: ${live} lines, ${pool.length} usable`)
  const result = packBags(pool, { rng })
  const c = result.check
  log(`bags: ${Object.keys(result.bags).length}, items packed: ${Object.values(result.bags).reduce((n, l) => n + l.length, 0)}`)
  log(`properties in play: ${Object.keys(c.properties).length}, stacked pairs: ${c.stacked.length}`)
  log(`same property twice in a bag: ${c.samePropertyInBag}, attempts: ${result.tries}`)
  if (!c.ok) {
    log(`rules broken: ${c.fails.length} (${[...new Set(c.fails.map(f => f.replace(/^bag-\d+:/, 'bag:')))].join(', ')})`)
    log('FAIL: nothing written. Add items to the thin senses and run again')
    return { skipped: false, pass: false, fails: c.fails }
  }
  await ref.set(sealedDoc(result, pool, { now }))
  log(dry ? 'a packing was made in memory and thrown away' : `sealed/bags written${prior ? ' (replaced the previous packing)' : ''}`)
  log('PASS')
  return { skipped: false, pass: true }
}

// A synthetic pool, bracketed and tied to nothing, for --dry and the tests.
export function syntheticPool({ perSense = 7, each = 3, extras = 2, seed = 1 } = {}) {
  const rng = seededRng(seed)
  const items = []
  let n = 0
  for (const s of SENSES) {
    for (let p = 1; p <= perSense; p++) {
      const count = Math.max(1, Math.min(4, each + rng(3) - 1))
      for (let i = 0; i < count; i++) items.push({ id: `syn${++n}`, text: `(Synthetic item ${n}) — ${s}: (${s} property ${p})` })
    }
  }
  for (let e = 0; e < extras; e++) {
    const a = SENSES[rng(SENSES.length)], b = SENSES[rng(SENSES.length)]
    if (a !== b) items.push({ id: `syn${++n}`, text: `(Synthetic item ${n}) — ${a}: (${a} property 1); ${b}: (${b} property 2)` })
  }
  return items
}

function argOf(flag) {
  const i = process.argv.indexOf(flag)
  return i >= 0 ? process.argv[i + 1] : null
}

async function main() {
  const dry = process.argv.includes('--dry')
  const repack = process.argv.includes('--repack')
  const seed = argOf('--seed')
  const rng = seed ? seededRng(seed) : cryptoRng
  const db = dry ? memoryDb({ 'safe_content/bag_items': { items: syntheticPool({ seed: Number(seed) || 1 }) } }) : adminDb()
  say(dry ? 'packing a synthetic pool in memory (nothing is written)' : 'packing the bag items from the workshop')
  let r
  try { r = await runPack(db, { repack, rng, dry }) } catch (e) { throw redactedError('packing', e) }
  process.exit(r.pass ? 0 : 1)
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].split('/').pop())) {
  main().catch(e => { printFatal(e); process.exit(1) })
}

export { LINE_MAX }
