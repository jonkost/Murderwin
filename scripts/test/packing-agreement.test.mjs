import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import * as blind from '../pack-bags.mjs'
import * as practice from '../../functions/lib/packing.js'

// Two packers, one set of rules. scripts/pack-bags.mjs is the blind packer
// that writes the party's packing (sealed/bags). functions/lib/packing.js is
// a copy of its pure core, so a practice night can pack ten practice bags in
// memory without reading that packing (handoff 11 Nov 2026, job A3; Cloud
// Functions deploy only functions/, so the code has to live there too).
// This test keeps them the same: change one, change both.
//
// SEAL. Every packing made here is of the seed's item list (safe content Jon
// wrote), from a fixed seed number, and is thrown away with the process. None
// is printed: the assertions are true or false, with the seed number.

const SEED = JSON.parse(readFileSync(new URL('../../seed/bag-items.json', import.meta.url), 'utf8'))
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b)
// a pool with its word sets as sorted lists, so two pools can be compared
const plain = pool => pool.map(it => ({ ...it, words: Object.fromEntries(Object.entries(it.words).map(([w, s]) => [w, [...s].sort()])) }))

test('the two packers read the seed list the same way: the same items, kinds, stock and words', () => {
  const lists = practice.clueLists(SEED)
  assert.ok(same(lists.clue, blind.CLUE_WORDS) && same(lists.never, blind.NEVER_WORDS), 'the fourteen clue words and the never-words')
  assert.ok(same(practice.seedItems(SEED), blind.seedItems()), 'the seed\'s lines as items')
  assert.ok(same(plain(practice.poolFromItems(practice.seedItems(SEED), lists)), plain(blind.poolFromItems(blind.seedItems()))), 'the pool')
  for (const text of [...SEED.items, 'Tin of Altoids — smell: minty; sound: rattles', 'Just an item', '']) assert.ok(same(practice.parseBagLine(text), blind.parseBagLine(text)), 'one line, parsed')
  for (const k of ['SENSES', 'BAGS', 'SIZES', 'AIM', 'FLOOR', 'ATTEMPTS', 'KINDS']) assert.ok(same(practice[k], blind[k]), `${k} is the same in both`)
})

test('the same seed packs the same way in both packers, for seeds 1 to 20, and both checkers agree on it', () => {
  const lists = practice.clueLists(SEED)
  const pool = { mine: practice.poolFromItems(practice.seedItems(SEED), lists), theirs: blind.poolFromItems(blind.seedItems()) }
  for (let seed = 1; seed <= 20; seed++) {
    const a = practice.packBags(pool.mine, { rng: practice.seededRng(seed) })
    const b = blind.packBags(pool.theirs, { rng: blind.seededRng(seed) })
    assert.ok(same([a.bags, a.doubles, a.words, a.tries, a.aimed], [b.bags, b.doubles, b.words, b.tries, b.aimed]), `seed ${seed}: the same bags, the same words, in the same number of tries`)
    assert.ok(same(a.check, b.check) && a.check.ok === true, `seed ${seed}: the same verdict, and it passes`)
    // each packer's checker passes the other's packing
    assert.ok(practice.checkPacking(b, pool.mine).ok && blind.checkPacking(a, pool.theirs).ok, `seed ${seed}: each checks the other's`)
    assert.ok(same(practice.propertyMap(a.words), blind.propertyMap(b.words)), `seed ${seed}: which bags carry each word`)
    for (const n of Object.keys(a.words)) assert.ok(same(practice.clueWordsOf(a.words, n), blind.clueWordsOf(b.words, n)), `seed ${seed}: bag ${n}'s clue words`)
  }
  // with fewer tries allowed, as a practice night packs: still the same
  for (let seed = 21; seed <= 26; seed++) {
    const a = practice.packBags(pool.mine, { rng: practice.seededRng(seed), attempts: 8 })
    const b = blind.packBags(pool.theirs, { rng: blind.seededRng(seed), attempts: 8 })
    assert.ok(same([a.bags, a.words, a.check.ok], [b.bags, b.words, b.check.ok]), `seed ${seed}, eight tries: the same`)
  }
})

test('the rules in both files are the same text, rule for rule', () => {
  // the functions that make and check a packing, compared as source: a change to one file that is not made
  // in the other fails here even when the twenty seeds above happen to agree
  const src = { blind: readFileSync(new URL('../pack-bags.mjs', import.meta.url), 'utf8'), practice: readFileSync(new URL('../../functions/lib/packing.js', import.meta.url), 'utf8') }
  const body = (text, name) => {
    const at = text.indexOf(`function ${name}(`)
    assert.ok(at >= 0, `${name} is in both files`)
    const end = text.indexOf('\n}\n', at)
    return text.slice(at, end)
  }
  for (const name of ['parseBagLine', 'seededRng', 'shuffled', 'wordCounts', 'score', 'pickBest', 'attempt', 'wordsIn', 'quality', 'bagOk', 'improve', 'finish', 'propertyMap', 'clueWordsOf', 'checkPacking', 'packBags']) {
    assert.ok(body(src.blind, name) === body(src.practice, name), `${name} reads the same in scripts/pack-bags.mjs and functions/lib/packing.js`)
  }
})
