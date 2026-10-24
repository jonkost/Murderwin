// The blind bag packer. Reads the bag items Jon bought (the workshop's list,
// safe_content/bag_items), decides which items go in which numbered bag under
// the bag rules, and writes the packing to sealed/bags. Only the Steward's
// view ever shows it; Jenna packs the bags to it.
//
// SEAL RULE: stdout gets COUNTS AND PASS/FAIL ONLY. Never an item, never a
// clue word, never a bag's contents. Errors are redacted.
//
//   node pack-bags.mjs            pack from Firestore, write sealed/bags
//   node pack-bags.mjs --repack   replace a packing that is already there
//   node pack-bags.mjs --dry      pack the seed's item list in memory, write nothing
//   --seed N                      a fixed random seed (tests and dry runs)
//
// THE BAG RULES (docs/handoff-2026-10-23.md §15.3, Jon's final items, 24 Oct 2026):
//   Ten bags, 4 or 5 items each, from the stock Jon bought (an item line's
//   stock is how many he has; a line may go in several bags while stock lasts).
//   One food per bag, as a pair: two single candies (kind "food, two singles",
//   two of the stock) or one pack, tube or zip bag ("food, one pack", one of it).
//   At least one touch item per bag. Extras (anything that is not food,
//   a second touch item included) fill the bag to 4 or 5. Never one line twice
//   in a bag.
//   A clue word counts once per bag, whatever its sense. A word is a CLUE word
//   for a bag when it sits in 2 or 3 bags, never 1 (and never 4 or more, which
//   would point at too many).
//   Every bag needs at least 2 clue words. Aim for 3, so clues still work when
//   two bags sit out on the night; fall back to 2 only if 3 cannot be found.
//
// THE SEALED SHAPE. sealed/bags = {
//   bags:        { "1": [itemId, ...], ... "10": [...] }   4 or 5 workshop item ids per bag
//   doubles:     { "n": [itemId] }        the food packed as two singles in that bag
//   words:       { "n": { word: [sense] } }  every clue word in the bag, with the senses it has there
//   properties:  { word: [n, ...] }       which bags carry each word (any count)
//   counts:      { bags, items, words, clueMin, threePlus, pool }
//   aimed:       3 | 2                    what the packing reached for every bag
//   packedAt:    Date, packedBy: 'packer' | 'steward', poolHash, rules: 'final-2026-10-24'
// }
// Item ids are the workshop's own; the Steward's view joins them back to the
// lines in safe_content/bag_items. The game reads only `words` and
// `properties` (the bag clues, functions/lib/bagclues.js) and the bag count.

import { randomInt } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { adminDb, memoryDb, say, printFatal, redactedError, sha12, LINE_MAX } from './lib.mjs'

const here = dirname(fileURLToPath(import.meta.url))
export const SEED_FILE = JSON.parse(readFileSync(join(here, '..', 'seed', 'bag-items.json'), 'utf8'))

export const SENSES = ['sight', 'sound', 'smell', 'touch', 'taste']
export const BAGS = 10
export const SIZES = [4, 5]
export const AIM = 3
export const FLOOR = 2
export const ATTEMPTS = 40
export const RULES = 'final-2026-10-24'
// The fourteen clue words and the words that are never clues (section 15.2).
export const CLUE_WORDS = SEED_FILE.words.map(w => w.word)
export const NEVER_WORDS = SEED_FILE.never.words
export const KINDS = { 'food, two singles': 'pair', 'food, one pack': 'pack', touch: 'touch', extra: 'extra' }

// One workshop line:
//   "Item — sense: word; sense: word · kind · stock N · looks like: note · tag: tag"
// -> { item, props: [{ sense, property }], kind, units, stock, looks, tag }.
// "no clue words" in the words place means an item with none (the orange
// ball). A line in the old one-property format, or with no kind, is null: it
// is not one of the items Jon bought.
export function parseBagLine(text) {
  const t = String(text ?? '')
  const dash = t.indexOf('—')
  if (dash < 0) return null
  const item = t.slice(0, dash).trim()
  const [wordsPart, ...tail] = t.slice(dash + 1).split('·').map(s => s.trim())
  const props = []
  if (!/^no clue words?$/i.test(wordsPart)) {
    for (const part of wordsPart.split(';')) {
      const c = part.indexOf(':')
      if (c < 0) continue
      const sense = part.slice(0, c).trim().toLowerCase()
      const property = part.slice(c + 1).trim().toLowerCase().replace(/\s+/g, ' ')
      if (SENSES.includes(sense) && property) props.push({ sense, property })
    }
  }
  let kind = null, stock = null, looks = '', tag = ''
  for (const seg of tail) {
    const low = seg.toLowerCase()
    if (KINDS[low]) kind = KINDS[low]
    else if (/^stock\s+\d+/.test(low)) stock = Number(/\d+/.exec(low)[0])
    else if (low.startsWith('looks like:')) looks = seg.slice(seg.indexOf(':') + 1).trim()
    else if (low.startsWith('tag:')) tag = seg.slice(seg.indexOf(':') + 1).trim().toLowerCase()
  }
  if (!item || !kind) return null
  return { item, props, kind, units: kind === 'pair' ? 2 : 1, stock: Number.isFinite(stock) && stock > 0 ? stock : 1, looks, tag }
}

// The words an item adds to a bag, each once, with its senses.
export function wordsOf(it) {
  const out = {}
  for (const p of it.props ?? []) {
    if (!CLUE_WORDS.includes(p.property) || NEVER_WORDS.includes(p.property)) continue
    ;(out[p.property] ??= new Set()).add(p.sense)
  }
  return out
}

export function poolFromItems(items) {
  const out = []
  for (const it of items) {
    const p = parseBagLine(it.text)
    if (p) out.push({ id: it.id, ...p, words: wordsOf(p) })
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

// How many bags each word is in, for a packing in progress.
function wordCounts(bagWords) {
  const n = {}
  for (const words of Object.values(bagWords)) for (const w of Object.keys(words)) n[w] = (n[w] ?? 0) + 1
  return n
}

// What putting `it` into a bag would do to the clue words: a word in 0 or 1
// bags gains (it moves toward 2), a word at 2 is fine (3), a word at 3 or more
// is pushed past being a clue for every bag that has it.
function score(it, words, counts) {
  let s = 0
  for (const w of Object.keys(it.words)) {
    if (words[w]) continue // counts once per bag
    const c = counts[w] ?? 0
    s += c <= 1 ? 3 : c === 2 ? 1 : -4
  }
  return s
}

// Pick from the candidates, leaning toward the best scores, never always the same.
function pickBest(cands, rng, scoreOf) {
  if (!cands.length) return null
  const scored = shuffled(cands, rng).map(c => ({ c, s: scoreOf(c) }))
  const top = Math.max(...scored.map(x => x.s))
  const from = rng(4) === 0 ? scored : scored.filter(x => x.s >= top - 1)
  return from[rng(from.length)].c
}

// One attempt at a packing. Returns { bags, doubles, words } or null.
function attempt(pool, rng, { bags = BAGS } = {}) {
  const left = Object.fromEntries(pool.map(it => [it.id, it.stock]))
  const numbers = Array.from({ length: bags }, (_, i) => i + 1)
  const contents = Object.fromEntries(numbers.map(n => [n, []]))
  const bagWords = Object.fromEntries(numbers.map(n => [n, {}]))
  const size = Object.fromEntries(numbers.map(n => [n, SIZES[rng(SIZES.length)]]))
  const put = (n, it) => {
    contents[n].push(it)
    left[it.id] -= it.units
    for (const [w, senses] of Object.entries(it.words)) {
      const have = (bagWords[n][w] ??= new Set())
      for (const s of senses) have.add(s)
    }
  }
  const fill = (n, kinds) => {
    const counts = wordCounts(bagWords)
    const cands = pool.filter(it => kinds.includes(it.kind) && left[it.id] >= it.units && !contents[n].some(x => x.id === it.id))
    const it = pickBest(cands, rng, c => score(c, bagWords[n], counts))
    if (!it) return false
    put(n, it)
    return true
  }
  // round by round, every bag in a fresh order: the food, a touch item, then extras
  for (const n of shuffled(numbers, rng)) if (!fill(n, ['pair', 'pack'])) return null
  for (const n of shuffled(numbers, rng)) if (!fill(n, ['touch'])) return null
  for (let slot = 2; slot < Math.max(...SIZES); slot++) {
    for (const n of shuffled(numbers, rng)) {
      if (contents[n].length >= size[n]) continue
      if (!fill(n, ['touch', 'extra'])) return null
    }
  }
  return contents
}

// The words in each bag, from its items.
function wordsIn(contents) {
  const words = {}
  for (const [n, items] of Object.entries(contents)) {
    words[n] = {}
    for (const it of items) for (const [w, s] of Object.entries(it.words)) words[n][w] = [...new Set([...(words[n][w] ?? []), ...s])].sort()
  }
  return words
}

// How good a packing is: every bag's clue words, counted up to the aim, first;
// then all the clue words, so a tie goes to the packing with spares.
function quality(contents) {
  const words = wordsIn(contents)
  let capped = 0, total = 0
  for (const n of Object.keys(contents)) {
    const c = clueWordsOf(words, n).length
    capped += Math.min(c, AIM)
    total += c
  }
  return capped * 100 + total
}

// Does a bag still keep the rules? One food, a touch item, 4 or 5 items, no line twice.
function bagOk(items) {
  if (!SIZES.includes(items.length)) return false
  if (items.filter(it => it.kind === 'pair' || it.kind === 'pack').length !== 1) return false
  if (!items.some(it => it.kind === 'touch')) return false
  return new Set(items.map(it => it.id)).size === items.length
}

// Small changes that keep every rule, kept when they do not make the packing
// worse (and now and then when they do, to climb out of a dead end): put a
// different line in one place, swap two items between bags, or add or take
// out an extra. Stops early once every bag has the aim.
function improve(contents, pool, rng, { steps = 4000 } = {}) {
  const numbers = Object.keys(contents).map(Number)
  const used = () => {
    const u = {}
    for (const items of Object.values(contents)) for (const it of items) u[it.id] = (u[it.id] ?? 0) + it.units
    return u
  }
  const target = numbers.length * AIM * 100
  let q = quality(contents)
  for (let step = 0; step < steps && q < target; step++) {
    const n = numbers[rng(numbers.length)]
    const before = contents[n].slice()
    const move = rng(3)
    let other = null, otherBefore = null
    if (move === 0) {
      // a different line in one place, of a kind the bag can take there
      const i = rng(contents[n].length)
      const was = contents[n][i]
      const kinds = was.kind === 'pair' || was.kind === 'pack' ? ['pair', 'pack'] : ['touch', 'extra']
      const u = used()
      const cands = pool.filter(it => kinds.includes(it.kind) && it.id !== was.id && (u[it.id] ?? 0) + it.units <= it.stock)
      if (!cands.length) continue
      contents[n][i] = cands[rng(cands.length)]
    } else if (move === 1) {
      // swap one item with one in another bag
      other = numbers[rng(numbers.length)]
      if (other === n) continue
      otherBefore = contents[other].slice()
      const i = rng(contents[n].length), j = rng(contents[other].length)
      ;[contents[n][i], contents[other][j]] = [contents[other][j], contents[n][i]]
    } else {
      // add an extra to a bag of 4, or take one out of a bag of 5
      if (contents[n].length === 4) {
        const u = used()
        const cands = pool.filter(it => (it.kind === 'extra' || it.kind === 'touch') && (u[it.id] ?? 0) + it.units <= it.stock)
        if (!cands.length) continue
        contents[n].push(cands[rng(cands.length)])
      } else {
        contents[n].splice(rng(contents[n].length), 1)
      }
    }
    const ok = bagOk(contents[n]) && (other === null || bagOk(contents[other]))
    const next = ok ? quality(contents) : -1
    if (ok && (next >= q || rng(50) === 0)) { q = next; continue }
    contents[n] = before
    if (other !== null) contents[other] = otherBefore
  }
  return contents
}

function finish(contents) {
  const out = {}, doubles = {}
  for (const [n, items] of Object.entries(contents)) {
    out[n] = items.map(it => it.id)
    const pairs = items.filter(it => it.kind === 'pair').map(it => it.id)
    if (pairs.length) doubles[n] = pairs
  }
  return { bags: out, doubles, words: wordsIn(contents) }
}

// Which bags carry each word, from the per-bag words.
export function propertyMap(words) {
  const props = {}
  for (const [n, ws] of Object.entries(words ?? {})) for (const w of Object.keys(ws)) (props[w] ??= []).push(Number(n))
  return Object.fromEntries(Object.entries(props).map(([k, v]) => [k, [...new Set(v)].sort((a, b) => a - b)]))
}

// A bag's clue words: its words that sit in 2 or 3 of `inPlay` (all bags by default).
export function clueWordsOf(words, n, { inPlay = null } = {}) {
  const props = propertyMap(words)
  const live = inPlay ? new Set(inPlay.map(Number)) : null
  return Object.keys(words?.[n] ?? {}).filter(w => {
    const at = (props[w] ?? []).filter(b => !live || live.has(b))
    return at.length === 2 || at.length === 3
  }).sort()
}

// Every rule, checked independently of how the packing was made. Reason
// codes only: never an item, never a word. `aim` is 2 or 3 clue words a bag.
export function checkPacking(packing, pool, { bags = BAGS, aim = FLOOR } = {}) {
  const fails = []
  const byId = Object.fromEntries(pool.map(it => [it.id, it]))
  const numbers = Object.keys(packing?.bags ?? {}).map(Number).sort((a, b) => a - b)
  if (numbers.length !== bags || numbers.some((n, i) => n !== i + 1)) fails.push('bag-count')
  const used = {}
  let clueMin = Infinity, threePlus = 0
  // the words as the items say, so a packing that lies about them fails here
  const words = {}
  for (const n of numbers) {
    const ids = packing.bags[n] ?? []
    if (!SIZES.includes(ids.length)) fails.push(`bag-${n}:size`)
    const items = ids.map(id => byId[id]).filter(Boolean)
    if (items.length !== ids.length) fails.push(`bag-${n}:unknown-item`)
    if (new Set(ids).size !== ids.length) fails.push(`bag-${n}:repeat`)
    const food = items.filter(it => it.kind === 'pair' || it.kind === 'pack')
    if (food.length !== 1) fails.push(`bag-${n}:food`)
    if (!items.some(it => it.kind === 'touch')) fails.push(`bag-${n}:touch`)
    const pairs = items.filter(it => it.kind === 'pair').map(it => it.id).sort()
    if (JSON.stringify(pairs) !== JSON.stringify([...(packing.doubles?.[n] ?? [])].sort())) fails.push(`bag-${n}:pair`)
    for (const it of items) used[it.id] = (used[it.id] ?? 0) + it.units
    words[n] = {}
    for (const it of items) for (const [w, s] of Object.entries(it.words)) words[n][w] = [...new Set([...(words[n][w] ?? []), ...s])].sort()
  }
  for (const [id, n] of Object.entries(used)) if (n > (byId[id]?.stock ?? 0)) { fails.push('stock'); break }
  const properties = propertyMap(words)
  for (const n of numbers) {
    const clues = clueWordsOf(words, n).length
    clueMin = Math.min(clueMin, clues)
    if (clues >= AIM) threePlus++
    if (clues < aim) fails.push(`bag-${n}:clue-words`)
  }
  return { ok: fails.length === 0, fails, properties, words, clueMin: Number.isFinite(clueMin) ? clueMin : 0, threePlus }
}

// Pack a pool. Tries for 3 clue words in every bag; if no attempt reaches it,
// the best packing that gives every bag 2. The result says which.
export function packBags(pool, { rng = cryptoRng, attempts = ATTEMPTS, bags = BAGS, steps = 4000 } = {}) {
  let best = null
  for (let i = 0; i < attempts; i++) {
    const contents = attempt(pool, rng, { bags })
    if (!contents) continue
    const p = finish(improve(contents, pool, rng, { steps }))
    const check = checkPacking(p, pool, { bags, aim: FLOOR })
    if (!check.ok) continue
    const r = { ...p, check, tries: i + 1, aimed: check.clueMin >= AIM ? AIM : FLOOR }
    if (r.aimed === AIM) return r
    if (!best || check.threePlus > best.check.threePlus) best = r
  }
  if (best) return best
  return { bags: {}, doubles: {}, words: {}, check: { ok: false, fails: ['no-packing'], properties: {}, words: {}, clueMin: 0, threePlus: 0 }, tries: attempts, aimed: 0 }
}

export function sealedDoc(result, pool, { now = new Date() } = {}) {
  return {
    bags: result.bags,
    doubles: result.doubles,
    words: result.check.words,
    properties: result.check.properties,
    counts: {
      bags: Object.keys(result.bags).length,
      items: Object.values(result.bags).reduce((n, l) => n + l.length, 0),
      words: Object.keys(result.check.properties).length,
      clueMin: result.check.clueMin,
      threePlus: result.check.threePlus,
      pool: pool.length,
    },
    aimed: result.aimed,
    rules: RULES,
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
  log(`bag items read: ${live} lines, ${pool.length} in the final format`)
  const result = packBags(pool, { rng })
  const c = result.check
  if (!c.ok) {
    log(`rules broken: ${c.fails.length} (${[...new Set(c.fails.map(f => f.replace(/^bag-\d+:/, 'bag:')))].join(', ')})`)
    log('FAIL: nothing written. Tell Claude Code; the packer could not fit the rules')
    return { skipped: false, pass: false, fails: c.fails }
  }
  log(`bags packed: ${Object.keys(result.bags).length}, items in them: ${Object.values(result.bags).reduce((n, l) => n + l.length, 0)}`)
  log('every rule passed: one food, a touch item, 4 or 5 items, stock kept')
  log(`bags with 3 or more clue words: ${c.threePlus} of ${Object.keys(result.bags).length}`)
  log(c.clueMin >= AIM ? 'every bag reached 3 clue words' : `every bag has at least ${c.clueMin} clue words (3 could not be found)`)
  await ref.set(sealedDoc(result, pool, { now }))
  log(dry ? 'a packing was made in memory and thrown away' : `sealed/bags written${prior ? ' (replaced the previous packing)' : ''}`)
  log('PASS')
  return { skipped: false, pass: true, aimed: result.aimed }
}

// The seed's own lines as workshop items, for --dry and the tests.
export function seedItems() {
  return SEED_FILE.items.map((text, i) => ({ id: `seed${i + 1}`, text, deleted: false, order: i }))
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
  const db = dry ? memoryDb({ 'safe_content/bag_items': { items: seedItems() } }) : adminDb()
  say(dry ? 'packing the seed list in memory (nothing is written)' : 'packing the bag items from the workshop')
  let r
  try { r = await runPack(db, { repack, rng, dry }) } catch (e) { throw redactedError('packing', e) }
  process.exit(r.pass ? 0 : 1)
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].split('/').pop())) {
  main().catch(e => { printFatal(e); process.exit(1) })
}

export { LINE_MAX }
