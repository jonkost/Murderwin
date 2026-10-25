import { test } from 'node:test'
import assert from 'node:assert/strict'
import { runCaseGroup, runLeakGroup, GROUPS, standInCase, caseSeed } from '../checks.mjs'
import { seededRng } from '../pack-bags.mjs'

const { caseChecks, packingChecks } = await import('../../functions/lib/checks.js')
const { rehearsalCase } = await import('../../functions/lib/case.js')

test('npm run checks: the case group passes on stand-in cases and names every check it ran', () => {
  const r = runCaseGroup({ count: 50 })
  assert.equal(r.passed, r.total)
  assert.deepEqual(r.failed, [])
  for (const id of ['G32', 'G33', 'G34', 'G39', 'G41', 'G45', 'G46', 'G47', 'G49', 'G50', 'G51', 'L08']) assert.ok(r.ids.includes(id), id)
})

test('G22 npm run checks names each case by a seed word, and that word deals the same case again', () => {
  assert.equal(caseSeed(28), 'check-28')
  const packings = [{ bags: {}, words: {} }, { bags: {}, words: {} }]
  const one = standInCase('check-28', packings)
  const two = standInCase('check-28', packings)
  const { createdAt: a, ...first } = one.c
  const { createdAt: b, ...again } = two.c
  assert.ok(JSON.stringify(first) === JSON.stringify(again), 'the same word dealt a different case')
  assert.ok(JSON.stringify(one.roster) === JSON.stringify(two.roster), 'the same word dealt a different roster')
  const r = runCaseGroup({ seeds: ['check-28'] })
  assert.equal(r.passed, r.total)
  assert.ok(r.ids.includes('G50'), 'a replayed case runs the board checks too')
})

test('npm run checks: the leak group passes on this repo', () => {
  const r = runLeakGroup()
  assert.equal(r.passed, r.total)
  assert.ok(r.total >= 4)
  assert.deepEqual(GROUPS.map(g => g.name), ['Case generator', 'Dry run', 'Leak checks'])
})

test('the checks can fail: a guest told the real family fails G33', () => {
  const rng = seededRng(5)
  const roster = ['a', 'b', 'c', 'd', 'e'].map((key, i) => ({ key, name: key, characterId: ['professor-plum', 'professor-pecan', 'chef', 'nurse', 'banker'][i], bag: i + 1 }))
  const c = rehearsalCase({ roster, rng })
  c.solving.hints[roster[2].key] = [c.solving.family, c.solving.hints[roster[2].key][1]]
  const g33 = caseChecks(c, { roster, rng }).find(r => r.id === 'G33')
  assert.equal(g33.pass, false)
})

test('the checks can fail: a bag of six fails PK1; no packing fails all three', () => {
  const bags = Object.fromEntries(Array.from({ length: 10 }, (_, i) => [i + 1, ['a', 'b', 'c', 'd']]))
  bags[3] = ['a', 'b', 'c', 'd', 'e', 'f']
  assert.equal(packingChecks({ bags, words: {} }, { rng: seededRng(1) }).find(r => r.id === 'PK1').pass, false)
  assert.ok(packingChecks(null, { rng: seededRng(1) }).every(r => !r.pass))
})
