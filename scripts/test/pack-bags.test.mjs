import { test } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { memoryDb } from '../lib.mjs'
import {
  parseBagLine, poolFromItems, packBags, checkPacking, propertyMap, stackedPairs, seededRng, syntheticPool, runPack, sealedDoc, SENSES, BAGS, PER_BAG,
} from '../pack-bags.mjs'

// SEAL. Every packing made here is thrown away with the process. The real
// item pool (seed/bag-items.json) is safe content Jon wrote; the packing of
// it is made in memory and never printed, logged or filed. Assertions are
// on counts and rules only.

const here = dirname(fileURLToPath(import.meta.url))

function capture(fn) {
  const lines = []
  const real = console.log
  console.log = (...a) => lines.push(a.join(' '))
  return Promise.resolve().then(fn).finally(() => { console.log = real }).then(r => ({ r, lines }))
}

test('a bag line parses to its item and every property; the first property is the item\'s sense', () => {
  assert.deepEqual(parseBagLine('Tin of Altoids — smell: minty; sound: rattles'), { item: 'Tin of Altoids', props: [{ sense: 'smell', property: 'minty' }, { sense: 'sound', property: 'rattles' }] })
  assert.deepEqual(parseBagLine('Glass marble — Touch: Cold and  smooth'), { item: 'Glass marble', props: [{ sense: 'touch', property: 'cold and smooth' }] })
  assert.equal(parseBagLine('Just an item'), null)
  assert.equal(parseBagLine('Thing — smell'), null)
  assert.equal(parseBagLine('Thing — colour: red'), null, 'not one of the five senses')
  const pool = poolFromItems([{ id: 'a', text: 'A — smell: x' }, { id: 'b', text: 'broken' }, { id: 'c', text: 'C — taste: y; sight: z' }])
  assert.deepEqual(pool.map(p => p.id), ['a', 'c'])
})

// Can a pool possibly fill every bag's sense slot? Ten usable items per sense
// (in groups of two or more sharing a property) and sixty in all.
function thin(pool) {
  const cap = Object.fromEntries(SENSES.map(s => [s, 0]))
  for (const s of SENSES) {
    const by = {}
    for (const it of pool.filter(x => x.props[0].sense === s)) (by[it.props[0].property] ??= []).push(it)
    cap[s] = Object.values(by).filter(g => g.length >= 2).reduce((n, g) => n + Math.min(3, g.length), 0)
  }
  return SENSES.some(s => cap[s] < BAGS) || Object.values(cap).reduce((a, b) => a + b, 0) < BAGS * PER_BAG
}

test('two hundred seeded pools: every rule holds on a PASS, and a FAIL says which rule', () => {
  let passes = 0, thinFails = 0, knots = 0
  for (let seed = 1; seed <= 200; seed++) {
    const rng = seededRng(seed * 7919)
    const pool = poolFromItems(syntheticPool({ perSense: 5 + rng(5), each: 2 + rng(2), extras: rng(5), seed }))
    const r = packBags(pool, { rng: seededRng(seed) })
    if (!r.check.ok) {
      assert.ok(r.check.fails.length > 0, 'a FAIL names a rule')
      if (thin(pool)) thinFails++; else knots++
      continue
    }
    passes++
    // an independent re-check agrees
    const again = checkPacking(r, pool)
    assert.equal(again.ok, true, `seed ${seed}: ${again.fails.join(',')}`)
    // the rules, spelled out
    assert.equal(Object.keys(r.bags).length, BAGS)
    const byId = Object.fromEntries(pool.map(it => [it.id, it]))
    const all = new Set()
    for (const [n, ids] of Object.entries(r.bags)) {
      assert.equal(ids.length, PER_BAG, `bag ${n} has six`)
      for (const id of ids) { assert.ok(!all.has(id), 'no item in two bags'); all.add(id) }
      const senses = ids.map(id => byId[id].props[0].sense)
      for (const s of SENSES) assert.ok(senses.includes(s), `bag ${n} has a ${s} item`)
      const props = ids.flatMap(id => byId[id].props.map(p => p.property))
      assert.ok(new Set(props).size >= 2, `bag ${n} has two clueable properties`)
      assert.equal(new Set(props).size, props.length, `bag ${n} never doubles a property`)
      const taste = ids.filter(id => byId[id].props[0].sense === 'taste')
      assert.deepEqual([...(r.doubles[n] ?? [])].sort(), [...taste].sort(), `bag ${n}: taste items are packed twice`)
    }
    for (const [, bags] of Object.entries(propertyMap(r, pool))) assert.ok(bags.length === 2 || bags.length === 3, 'every property in two or three bags')
    for (const [a, b] of r.check.stacked) {
      const shared = r.check.properties[a].filter(n => r.check.properties[b].includes(n))
      assert.equal(shared.length, 1, 'a stacked pair shares exactly one bag')
    }
  }
  assert.ok(passes >= 100, `most pools pack (${passes} of 200)`)
  assert.ok(thinFails + knots + passes === 200)
  assert.ok(knots <= 3, `a pool with enough items almost always packs (${knots} did not)`)
})

test('the real pool from seed/bag-items.json packs under every rule, on twenty seeds, with nothing printed', async () => {
  const lines = JSON.parse(readFileSync(join(here, '..', '..', 'seed', 'bag-items.json'), 'utf8')).items
  assert.equal(lines.length, 108)
  const pool = poolFromItems(lines.map((text, i) => ({ id: `line${i}`, text })))
  assert.equal(pool.length, 108, 'every line parses')
  const { lines: out } = await capture(() => {
    for (let seed = 1; seed <= 20; seed++) {
      const r = packBags(pool, { rng: seededRng(seed) })
      assert.equal(r.check.ok, true, `seed ${seed}: ${r.check.fails.join(',')}`)
      assert.equal(r.check.samePropertyInBag, 0)
      const doc = sealedDoc(r, pool)
      assert.equal(doc.counts.items, 60)
      assert.equal(doc.counts.pool, 108)
      assert.ok(doc.counts.stackedPairs > 0)
      assert.equal(doc.packedBy, 'packer')
    }
  })
  assert.equal(out.length, 0)
})

test('runPack prints counts only, writes sealed/bags, and refuses to overwrite without --repack', async () => {
  const items = syntheticPool({ seed: 5 })
  const db = memoryDb({ 'safe_content/bag_items': { items } })
  const first = await capture(() => runPack(db, { rng: seededRng(5), now: new Date(1000) }))
  assert.equal(first.r.pass, true)
  assert.equal(first.lines.at(-1), 'PASS')
  const text = first.lines.join('\n')
  assert.ok(!/Synthetic|property \d/.test(text), 'no item or property in the output')
  for (const l of first.lines) assert.ok(l.length <= 80)
  const doc = db.store.get('sealed/bags')
  assert.ok(doc && doc.packedAt && doc.bags && doc.properties && Array.isArray(doc.stackedPairs))
  assert.equal(doc.counts.items, 60)
  assert.equal(doc.counts.bags, 10)
  const before = JSON.stringify(doc)
  // a second run leaves the doc exactly as it was
  const second = await capture(() => runPack(db, { rng: seededRng(6), now: new Date(2000) }))
  assert.equal(second.r.skipped, true)
  assert.equal(JSON.stringify(db.store.get('sealed/bags')), before)
  assert.ok(second.lines.some(l => l.includes('already packed')))
  assert.ok(!/Synthetic|property \d/.test(second.lines.join('\n')))
  // the Steward's own packing is kept too
  db.store.set('sealed/bags', { ...db.store.get('sealed/bags'), packedBy: 'steward' })
  const third = await capture(() => runPack(db, { rng: seededRng(6), now: new Date(3000) }))
  assert.equal(third.r.skipped, true)
  assert.ok(third.lines.some(l => l.includes('by the Steward')))
  // --repack replaces it
  const fourth = await capture(() => runPack(db, { rng: seededRng(6), now: new Date(4000), repack: true }))
  assert.equal(fourth.r.skipped, false)
  assert.equal(fourth.r.pass, true)
  assert.equal(db.store.get('sealed/bags').packedAt.getTime(), 4000)
  assert.equal(db.store.get('sealed/bags').packedBy, 'packer')
})

test('a pool too thin to pack reports FAIL and writes nothing', async () => {
  const items = syntheticPool({ perSense: 2, each: 2, extras: 0, seed: 9 })
  const db = memoryDb({ 'safe_content/bag_items': { items } })
  const { r, lines } = await capture(() => runPack(db, { rng: seededRng(1) }))
  assert.equal(r.pass, false)
  assert.ok(lines.some(l => l.startsWith('FAIL')))
  assert.equal(db.store.has('sealed/bags'), false)
  assert.ok(!/Synthetic|property \d/.test(lines.join('\n')))
})

test('stacked pairs: properties whose bags overlap in exactly one', () => {
  const pairs = stackedPairs({ a: [1, 2], b: [2, 3], c: [1, 2], d: [4, 5] })
  assert.deepEqual(pairs, [['a', 'b'], ['b', 'c']])
})

test('node pack-bags.mjs --dry --seed 1 passes on a synthetic pool, short lines, no content, nothing kept', () => {
  const out = execFileSync(process.execPath, [join(here, '..', 'pack-bags.mjs'), '--dry', '--seed', '1'], { encoding: 'utf8', cwd: join(here, '..') })
  const lines = out.trimEnd().split('\n')
  assert.equal(lines.at(-1), 'PASS')
  for (const l of lines) assert.ok(l.length <= 80, `line of ${l.length} chars`)
  assert.ok(!/Synthetic|property \d|sealed\/bags written/.test(out), 'no content, and nothing claims to be written')
})
