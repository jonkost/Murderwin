import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync, mkdtempSync, mkdirSync, copyFileSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'
import { FakeFirestore } from './fake-firestore.mjs'
import { packPractice, practicePacking, packingFor, readPacking, PRACTICE_ATTEMPTS } from '../lib/bags.js'
import { bagSeed, clueLists, seedItems, poolFromItems, packBags, checkPacking, seededRng, BAGS } from '../lib/packing.js'
import { clueWords, wordBags, bagPlan, bagLine, BAG_CATS, SENSES } from '../lib/bagclues.js'
import { caseChecks, standInRoster } from '../lib/checks.js'
import { rehearsalCase, buildCase } from '../lib/case.js'
import { seededPick } from '../lib/seed.js'

// The practice packing (docs/handoff-2026-11-11-polish.md, job A3): a practice
// night's cats name real clue words from ten practice bags packed in memory
// from the item list Jon bought (seed/bag-items.json, safe content). It is
// never the party's packing, and sealed/bags is never read for it.
//
// Nothing here is sealed. Still, nothing is printed: counts, true or false.

const SEED = JSON.parse(readFileSync(new URL('../../seed/bag-items.json', import.meta.url), 'utf8'))
const CLUE_WORDS = SEED.words.map(w => w.word)
const keyOf = n => `practice-key-${n}`
// two packings compared as true or false, so a failure never prints one
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b)

test('the seed file is beside the functions, and is the one Jon wrote', () => {
  assert.deepEqual(bagSeed(), SEED, 'functions/seed/bag-items.json is a copy of seed/bag-items.json (npm run seed)')
  assert.equal(CLUE_WORDS.length, 14)
  assert.equal(SEED.items.length, 24)
  const pool = poolFromItems(seedItems(), clueLists())
  assert.equal(pool.length, 24, 'every line is one of the items Jon bought')
})

test('a practice packing: ten bags, only the fourteen clue words, at least two clue words a bag, the same key the same packing', () => {
  const seen = new Set()
  for (let n = 1; n <= 12; n++) {
    const p = packPractice(keyOf(n))
    assert.ok(p, `key ${n} packs`)
    assert.deepEqual(Object.keys(p), ['words'], 'only what the bag clue engine reads: no item, no bag list')
    const bags = Object.keys(p.words).map(Number).sort((a, b) => a - b)
    assert.deepEqual(bags, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
    for (const b of bags) {
      const words = Object.keys(p.words[String(b)])
      assert.ok(words.every(w => CLUE_WORDS.includes(w)), `key ${n} bag ${b}: only clue words`)
      assert.ok(Object.values(p.words[String(b)]).every(s => Array.isArray(s) && s.length && s.every(x => SENSES.includes(x))), 'each with its senses')
      assert.ok(clueWords(p, b, bags).length >= 2, `key ${n} bag ${b}: at least two words that sit in two or three bags (G43)`)
    }
    assert.ok(same(packPractice(keyOf(n)), p), `key ${n}: the same packing again`)
    seen.add(JSON.stringify(p))
  }
  assert.ok(seen.size >= 11, 'another key, another packing')
})

test('the packer keeps every bag rule on the seed list, and a practice packing takes a try or two', () => {
  const pool = poolFromItems(seedItems(), clueLists())
  for (let seed = 1; seed <= 6; seed++) {
    const r = packBags(pool, { rng: seededRng(seed), attempts: PRACTICE_ATTEMPTS })
    assert.equal(r.check.ok, true, `seed ${seed}: ${r.check.fails.length} rules broken`)
    assert.ok(r.tries <= PRACTICE_ATTEMPTS)
    assert.equal(checkPacking(r, pool, { bags: BAGS }).ok, true, 'checked again, on its own')
    assert.equal(Object.keys(r.bags).length, 10)
    for (const ids of Object.values(r.bags)) assert.ok([4, 5].includes(ids.length))
  }
})

test('no seed file, a broken one, an empty key: no practice packing, and never a throw', () => {
  // (true or false only: a packing is never printed, not even a throwaway one)
  const broken = [null, {}, { words: [], items: [] }, { words: 'x', items: 7 }, { items: SEED.items }, { words: SEED.words, never: SEED.never, items: ['not an item line'] }]
  for (const [i, seed] of broken.entries()) assert.ok(packPractice('a-key', seed) === null, `seed file ${i}: no packing`)
  assert.ok(packPractice('', SEED) === null && packPractice(null, SEED) === null, 'no key, no packing')
  assert.ok(packPractice('a-key', SEED) !== null, 'the real list packs')
  assert.ok(practicePacking(null) === null && practicePacking({}) === null && practicePacking({ screenSalt: '' }) === null, 'no case, or a case with no salt: no packing')
  // and with no packing every cat still says a line of its own (bagclues.bagLine)
  for (const cat of BAG_CATS) assert.ok(bagLine(bagPlan(null, { bag: 1, inPlay: [1, 2] }), { cat, act: 2, rung: 5 }).text.length > 10)
})

test('with the item list not copied beside the functions, the two files still load and there is simply no practice packing', () => {
  // a copy of the two files in a folder with no seed folder next to it, loaded in its own process: what a
  // deploy without the copy would run. Nothing may throw when the files load or when a packing is asked for.
  const dir = mkdtempSync(join(tmpdir(), 'murderwin-packing-'))
  try {
    mkdirSync(join(dir, 'lib'))
    for (const f of ['packing.js', 'bags.js']) copyFileSync(new URL(`../lib/${f}`, import.meta.url), join(dir, 'lib', f))
    writeFileSync(join(dir, 'package.json'), '{ "type": "module" }')
    const script = [
      "const bags = await import('./lib/bags.js')",
      "const packing = await import('./lib/packing.js')",
      "const out = [packing.bagSeed() === null, bags.practicePacking({ screenSalt: 'abc' }) === null, bags.packPractice('abc') === null, (await bags.packingFor(null, { rehearsal: true, screenSalt: 'abc' })) === null]",
      "console.log(JSON.stringify(out))",
    ].join('\n')
    const r = spawnSync(process.execPath, ['--input-type=module', '-e', script], { cwd: dir, encoding: 'utf8' })
    assert.equal(r.status, 0, `it loads and runs (${r.stderr.split('\n')[0]})`)
    assert.deepEqual(JSON.parse(r.stdout.trim()), [true, true, true, true], 'no seed file: no packing, and no throw')
  } finally { rmSync(dir, { recursive: true, force: true }) }
})

test('packingFor decides in one place: the sealed packing only for a party case, the practice packing for every other, and a practice never reads sealed/bags', async () => {
  const db = new FakeFirestore()
  const sealed = { words: { 1: { '(synthetic)': ['touch'] }, 2: { '(synthetic)': ['touch'] } }, properties: { '(synthetic)': [1, 2] } }
  db.store.set('sealed/bags', sealed)
  const reads = []
  const get = db._get.bind(db)
  db._get = path => { reads.push(path); return get(path) }
  const roster = standInRoster(8, seededPick('packing-test', 'roster'))

  // the party night: the case says rehearsal === false, exactly that
  const party = buildCase({ roster, rng: seededPick('packing-test', 'party') })
  assert.equal(party.rehearsal, false)
  assert.ok(same(await packingFor(db, party), sealed), 'the party night reads the sealed packing')
  assert.deepEqual(reads, ['sealed/bags'])
  assert.ok(same(await readPacking(db), sealed))

  // a practice night: its own packing, from its own salt, and nothing read
  reads.length = 0
  const practice = rehearsalCase({ roster, rng: seededPick('packing-test', 'practice') })
  const p = await packingFor(db, practice)
  assert.ok(p && Object.keys(p.words).length === 10 && !JSON.stringify(p).includes('synthetic'), 'ten practice bags, nothing of the sealed packing')
  assert.ok(await packingFor(db, practice) === p, 'worked out once a case: the same object again')
  assert.ok(same(p, packPractice(practice.screenSalt)), 'keyed on the case\'s own salt')
  // anything that is not exactly a party case never reaches sealed/bags: a flag missing, a truthy flag, no case
  for (const c of [{ ...practice, rehearsal: undefined }, { ...practice, rehearsal: null }, { ...practice, rehearsal: 0 }, { ...practice, rehearsal: 'false' }, { screenSalt: 'x' }, {}, null, undefined]) {
    const got = await packingFor(db, c)
    assert.ok(got === null || !JSON.stringify(got).includes('synthetic'))
  }
  assert.deepEqual(reads, [], 'a practice night never reads sealed/bags')
})

test('G09, G39, G41, G46 and G49 hold on practice packings: 60 stand-in cases, each with the packing dealt from its own salt', () => {
  const tally = {}
  let named = 0, lines = 0
  for (let i = 1; i <= 60; i++) {
    const seed = `practice-${i}`
    const roster = standInRoster(4 + seededPick(seed, 'size')(9), seededPick(seed, 'roster'))
    const rng = seededPick(seed, 'case')
    const c = rehearsalCase({ roster, rng })
    const packing = packPractice(c.screenSalt)
    assert.ok(packing, `case ${i} has a practice packing`)
    for (const r of caseChecks(c, { roster, packing, rng })) { (tally[r.id] ??= [0, 0])[1]++; if (r.pass) tally[r.id][0]++ }
    // and the lines a guest would be dealt name real clue words, each in two or three of the bags in play
    const inPlay = [...new Set(roster.map(g => Number(g.bag)))]
    const at = wordBags(packing, inPlay)
    const bag = roster.find(g => g.key === c.murderer).bag
    for (const g of roster) {
      const plan = bagPlan(packing, { bag, inPlay, seed: `${c.screenSalt}\u0000bag\u0000${g.key}` })
      for (const cat of BAG_CATS) {
        const line = bagLine(plan, { cat, act: 2, rung: 1 + rng(5), seed: `${c.screenSalt}\u0000bag\u0000${g.key}\u0000${cat}` })
        lines++
        assert.ok(line.text && !/___|\[|\]/.test(line.text), 'no blank and no bracket')
        if (!line.word) continue
        named++
        assert.ok(CLUE_WORDS.includes(line.word) && [2, 3].includes(at[line.word]?.length ?? 0), 'a clue word, in two or three bags in play')
        assert.equal(!!packing.words[String(bag)][line.word], line.right, 'right means it is in the bag')
      }
    }
  }
  for (const id of ['G09', 'G39', 'G41', 'G46', 'G49']) assert.deepEqual(tally[id], [60, 60], `${id} on every case`)
  for (const [id, [pass, of]] of Object.entries(tally)) assert.equal(pass, of, `${id}: ${pass} of ${of}`)
  assert.ok(named > lines / 4, `the practice lines name clue words (${named} of ${lines})`)
})

test('every seed file the functions read is copied before a deploy, and by the fake night', () => {
  const lib = new URL('../lib/', import.meta.url)
  const wanted = new Set()
  for (const f of readdirSync(lib).filter(n => n.endsWith('.js'))) {
    for (const m of readFileSync(new URL(f, lib), 'utf8').matchAll(/(?:'seed', |seedDir, )'([a-z-]+\.json)'/g)) wanted.add(m[1])
  }
  assert.ok(wanted.has('bag-items.json') && wanted.has('night.json') && wanted.size >= 9, `the files the library reads (${wanted.size})`)
  const copy = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')).scripts.seed
  const fake = readFileSync(new URL('../../scripts/fake-players.mjs', import.meta.url), 'utf8')
  const list = /for \(const f of \[([^\]]+)\]\) \{\s*const from = join\(root, 'seed', f\)/.exec(fake)?.[1] ?? ''
  for (const name of wanted) {
    assert.ok(copy.includes(`../seed/${name} `), `npm run seed copies ${name} (firebase.json runs it before a deploy)`)
    assert.ok(list.includes(`'${name}'`), `the fake night copies ${name}`)
  }
  const firebase = JSON.parse(readFileSync(new URL('../../firebase.json', import.meta.url), 'utf8'))
  assert.ok(JSON.stringify(firebase.functions).includes('npm --prefix functions run seed'), 'the deploy copies the seed files first')
})
