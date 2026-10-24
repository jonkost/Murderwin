import { test } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { memoryDb } from '../lib.mjs'
import {
  parseBagLine, poolFromItems, packBags, checkPacking, propertyMap, clueWordsOf, seededRng, seedItems, runPack, sealedDoc,
  BAGS, SIZES, AIM, CLUE_WORDS, NEVER_WORDS, SEED_FILE,
} from '../pack-bags.mjs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

// SEAL. Every packing made here is thrown away with the process. The item
// list (seed/bag-items.json) is safe content Jon wrote; a packing of it is
// made in memory and never printed, logged or filed. Assertions are on counts
// and rules only.

const here = dirname(fileURLToPath(import.meta.url))

function capture(fn) {
  const lines = []
  const real = console.log
  console.log = (...a) => lines.push(a.join(' '))
  return Promise.resolve().then(fn).finally(() => { console.log = real }).then(r => ({ r, lines }))
}

const ITEM_NAMES = SEED_FILE.items.map(t => t.split('—')[0].trim())
const leaks = text => ITEM_NAMES.some(n => text.includes(n)) || CLUE_WORDS.some(w => new RegExp(`\\b${w}\\b`, 'i').test(text))

test('a bag line parses to its item, its words, its kind, stock, looks-like note and tag', () => {
  const y = parseBagLine('Yellow ball — touch: pointy; touch: bumpy · touch · stock 1 · looks like: small spikes · tag: fun')
  assert.deepEqual(y.props, [{ sense: 'touch', property: 'pointy' }, { sense: 'touch', property: 'bumpy' }])
  assert.equal(y.item, 'Yellow ball')
  assert.equal(y.kind, 'touch')
  assert.equal(y.stock, 1)
  assert.equal(y.looks, 'small spikes')
  assert.equal(y.tag, 'fun')
  const k = parseBagLine("Hershey's Kisses — smell: chocolatey; taste: chocolatey · food, two singles · stock 50 · looks like: silver foil · tag: no-no")
  assert.equal(k.kind, 'pair')
  assert.equal(k.units, 2, 'two singles take two of the stock')
  const o = parseBagLine('Orange ball — no clue words · touch · stock 1 · looks like: smooth with dents · tag: fun')
  assert.deepEqual(o.props, [])
  assert.equal(parseBagLine('Tin of Altoids — smell: minty; sound: rattles'), null, 'a September line has no kind: not one of the items Jon bought')
  assert.equal(parseBagLine('Just an item'), null)
})

test('the seed list: every line parses, the fourteen words and only those, never a never-word', () => {
  const pool = poolFromItems(seedItems())
  assert.equal(pool.length, SEED_FILE.items.length)
  assert.equal(CLUE_WORDS.length, 14)
  const used = new Set(pool.flatMap(it => it.props.map(p => p.property)))
  for (const w of used) assert.ok(CLUE_WORDS.includes(w), `a word on a line is one of the fourteen (${used.size} used)`)
  for (const w of CLUE_WORDS) assert.ok(used.has(w), 'every one of the fourteen is on some line')
  for (const w of NEVER_WORDS) assert.ok(!used.has(w))
  // a word counts once per bag, whatever its sense: minty tea and minty candy are both "minty"
  const tea = pool.find(it => it.item === 'Peppermint tea bags')
  assert.deepEqual(Object.keys(tea.words), ['minty'])
  assert.deepEqual([...tea.words.minty].sort(), ['smell', 'taste'])
  const kinds = new Set(pool.map(it => it.kind))
  assert.deepEqual([...kinds].sort(), ['extra', 'pack', 'pair', 'touch'])
  assert.equal(pool.filter(it => /ball$/.test(it.item)).length, 6, 'each ball is its own line')
})

test('the real list packs under every rule on sixty seeds, every bag reaching 3 clue words, nothing printed', async () => {
  const pool = poolFromItems(seedItems())
  const byId = Object.fromEntries(pool.map(it => [it.id, it]))
  const { lines } = await capture(() => {
    let three = 0
    for (let seed = 1; seed <= 60; seed++) {
      const r = packBags(pool, { rng: seededRng(seed) })
      assert.equal(r.check.ok, true, `seed ${seed}: ${r.check.fails.join(',')}`)
      // an independent re-check agrees
      assert.equal(checkPacking(r, pool, { aim: 2 }).ok, true)
      assert.equal(Object.keys(r.bags).length, BAGS)
      const used = {}
      for (const [n, ids] of Object.entries(r.bags)) {
        assert.ok(SIZES.includes(ids.length), `bag ${n} holds 4 or 5`)
        assert.equal(new Set(ids).size, ids.length, 'never one line twice in a bag')
        const items = ids.map(id => byId[id])
        assert.equal(items.filter(it => it.kind === 'pair' || it.kind === 'pack').length, 1, 'one food')
        assert.ok(items.some(it => it.kind === 'touch'), 'a touch item')
        const pairs = items.filter(it => it.kind === 'pair').map(it => it.id)
        assert.deepEqual([...(r.doubles[n] ?? [])].sort(), pairs.sort(), 'two singles are written out as a pair')
        for (const it of items) used[it.id] = (used[it.id] ?? 0) + it.units
        assert.ok(clueWordsOf(r.words, n).length >= 2, 'at least 2 clue words in every bag')
      }
      for (const [id, n] of Object.entries(used)) assert.ok(n <= byId[id].stock, 'never more than Jon bought')
      // every clue word sits in 2 or 3 bags; a word in 1 or 4+ is never a clue
      const props = propertyMap(r.words)
      for (const n of Object.keys(r.bags)) for (const w of clueWordsOf(r.words, n)) assert.ok([2, 3].includes(props[w].length))
      if (r.aimed === AIM) three++
      const doc = sealedDoc(r, pool)
      assert.equal(doc.counts.bags, 10)
      assert.equal(doc.packedBy, 'packer')
      assert.ok(doc.counts.items >= 40 && doc.counts.items <= 50)
    }
    assert.ok(three >= 50, `most packings reach 3 clue words in every bag (${three} of 60)`)
  })
  assert.equal(lines.length, 0)
})

test('with two bags sitting out, almost every bag keeps 2 clue words among the bags in play', () => {
  const pool = poolFromItems(seedItems())
  let kept = 0, of = 0
  for (let seed = 1; seed <= 20; seed++) {
    const r = packBags(pool, { rng: seededRng(seed) })
    for (let k = 0; k < 10; k++) {
      const rng = seededRng(seed * 100 + k)
      const all = Array.from({ length: 10 }, (_, i) => i + 1)
      for (let i = all.length - 1; i > 0; i--) { const j = rng(i + 1); [all[i], all[j]] = [all[j], all[i]] }
      const inPlay = all.slice(0, 8)
      for (const n of inPlay) { of++; if (clueWordsOf(r.words, n, { inPlay }).length >= 2) kept++ }
    }
  }
  assert.ok(kept / of >= 0.95, `${kept} of ${of}`)
})

test('the check names the rule a bad packing breaks, never an item or a word', () => {
  const pool = poolFromItems(seedItems())
  const r = packBags(pool, { rng: seededRng(3) })
  const bad = structuredClone({ bags: r.bags, doubles: r.doubles })
  bad.bags['1'] = bad.bags['1'].slice(0, 3)
  const c = checkPacking(bad, pool)
  assert.equal(c.ok, false)
  assert.ok(c.fails.includes('bag-1:size'))
  assert.ok(!leaks(c.fails.join(' ')))
})

test('runPack prints counts only, writes sealed/bags, and refuses to overwrite without --repack', async () => {
  const db = memoryDb({ 'safe_content/bag_items': { items: seedItems() } })
  const first = await capture(() => runPack(db, { rng: seededRng(5), now: new Date(1000) }))
  assert.equal(first.r.pass, true)
  assert.equal(first.lines.at(-1), 'PASS')
  const text = first.lines.join('\n')
  assert.ok(!leaks(text), 'no item or word in the output')
  assert.ok(first.lines.some(l => /bags with 3 or more clue words: \d+ of 10/.test(l)))
  for (const l of first.lines) assert.ok(l.length <= 80)
  const doc = db.store.get('sealed/bags')
  assert.ok(doc && doc.packedAt && doc.bags && doc.words && doc.properties)
  assert.equal(doc.counts.bags, 10)
  assert.equal(doc.rules, 'final-2026-10-24')
  const before = JSON.stringify(doc)
  const second = await capture(() => runPack(db, { rng: seededRng(6), now: new Date(2000) }))
  assert.equal(second.r.skipped, true)
  assert.equal(JSON.stringify(db.store.get('sealed/bags')), before)
  assert.ok(second.lines.some(l => l.includes('already packed')))
  db.store.set('sealed/bags', { ...db.store.get('sealed/bags'), packedBy: 'steward' })
  const third = await capture(() => runPack(db, { rng: seededRng(6), now: new Date(3000) }))
  assert.equal(third.r.skipped, true)
  assert.ok(third.lines.some(l => l.includes('by the Steward')))
  const fourth = await capture(() => runPack(db, { rng: seededRng(6), now: new Date(4000), repack: true }))
  assert.equal(fourth.r.skipped, false)
  assert.equal(fourth.r.pass, true)
  assert.equal(db.store.get('sealed/bags').packedAt.getTime(), 4000)
  assert.ok(!leaks(fourth.lines.join('\n')))
})

test('the September lines alone pack nothing: they are not the items Jon bought', async () => {
  const db = memoryDb({ 'safe_content/bag_items': { items: [{ id: 'a', text: 'Tin of Altoids — smell: minty; sound: rattles' }] } })
  const { r, lines } = await capture(() => runPack(db, { rng: seededRng(1) }))
  assert.equal(r.pass, false)
  assert.ok(lines.some(l => l.startsWith('FAIL')))
  assert.equal(db.store.has('sealed/bags'), false)
})

test('node pack-bags.mjs --dry --seed 1 passes on the seed list, short lines, no content, nothing kept', () => {
  const out = execFileSync(process.execPath, [join(here, '..', 'pack-bags.mjs'), '--dry', '--seed', '1'], { encoding: 'utf8', cwd: join(here, '..') })
  const lines = out.trimEnd().split('\n')
  assert.equal(lines.at(-1), 'PASS')
  for (const l of lines) assert.ok(l.length <= 80, `line of ${l.length} chars`)
  assert.ok(!leaks(out), 'no item or word')
  assert.ok(!/sealed\/bags written/.test(out), 'nothing claims to be written')
})
