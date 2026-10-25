import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { runCaseGroup, runLeakGroup, GROUPS } from '../checks.mjs'
import { seededRng } from '../pack-bags.mjs'

const { caseChecks, packingChecks, sealedShape } = await import('../../functions/lib/checks.js')
const { rehearsalCase } = await import('../../functions/lib/case.js')
const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..')

test('npm run checks: the case group passes on stand-in cases and names every check it ran', () => {
  const r = runCaseGroup({ count: 50 })
  assert.equal(r.passed, r.total)
  assert.deepEqual(r.failed, [])
  for (const id of ['G32', 'G33', 'G34', 'G39', 'G41', 'G45', 'G46', 'G47', 'G49', 'G50', 'G51', 'L08']) assert.ok(r.ids.includes(id), id)
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

test('npm run checks: the case group also runs the new case checks and the two fairness checks', () => {
  const r = runCaseGroup({ count: 30 })
  assert.equal(r.passed, r.total)
  for (const id of ['G01', 'G03', 'G04', 'G05', 'G06', 'G09', 'G17', 'G19', 'G20', 'G21', 'G23', 'G53']) assert.ok(r.ids.includes(id), id)
})

test('L01 no tracked JSON is shaped like sealed content: a dealt case, kernels, a code-to-motive map or a lean table is caught, and the repo has none', () => {
  // stand-ins in each sealed shape, made here and thrown away
  const roster = ['a', 'b', 'c', 'd'].map((key, i) => ({ key, name: key, characterId: ['white', 'arms', 'rye', 'ledger'][i] }))
  const dealt = JSON.parse(JSON.stringify(rehearsalCase({ roster, rng: seededRng(3) })))
  assert.equal(sealedShape(dealt), true, 'L01 a dealt case is caught')
  assert.equal(sealedShape({ cases: { n1: dealt } }), true, 'L01 a dealt case inside another doc is caught')
  assert.equal(sealedShape({ motive: 4, kernels: ['(a stand-in kernel)'] }), true, 'L01 kernels holding text are caught')
  assert.equal(sealedShape({ manifest: { x7f2: 3, k9q1: 11, p0z8: 19, m2n4: 1, r5t6: { motive: 8 } } }), true, 'L01 a code-to-motive map is caught')
  assert.equal(sealedShape({ sets: { s1: { 0: { granolia: 'a', boo: 'b', zimothy: 'a', salem: 'b' } } } }), true, 'L01 a lean table is caught')
  // open shapes are not: the seed lists, empty kernels, a settings doc
  const read = p => JSON.parse(readFileSync(join(root, p), 'utf8'))
  for (const p of ['seed/motives.json', 'seed/families.json', 'seed/night.json', 'seed/cat-lines.json', 'seed/woof-news.json', 'seed/characters.json', 'seed/bag-items.json', 'package.json']) assert.equal(sealedShape(read(p)), false, `L01 ${p} is open`)
  assert.equal(sealedShape({ kernels: [] }), false)
  assert.equal(sealedShape({ counts: { 2: 5, 4: 5, 6: 2 } }), false)
  // and the leak group scans every tracked JSON with it
  const r = runLeakGroup()
  assert.equal(r.passed, r.total)
  assert.ok(r.total >= 5, 'L08, L01 on the files, the history and the JSON, and L06')
})
