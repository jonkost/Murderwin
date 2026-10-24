import { test } from 'node:test'
import assert from 'node:assert/strict'
import { healthView, ALL_CLEAR } from '../src/lib/health.js'

test('Health: one line per group, in order, with the count', () => {
  const v = healthView({
    at: new Date('2026-10-24T15:00:00Z'), cases: 1000, ok: true,
    groups: [
      { name: 'Leak checks', passed: 4, total: 4, failed: [] },
      { name: 'Case generator', passed: 10040, total: 10040, failed: [] },
      { name: 'Dry run', passed: 1, total: 1, failed: [] },
    ],
  })
  assert.deepEqual(v.groups.map(g => g.name), ['Case generator', 'Dry run', 'Leak checks'])
  assert.equal(v.groups[0].line, 'Case generator · 10,040 of 10,040 passed')
  assert.equal(v.allClear, true)
  assert.ok(v.when)
  assert.equal(ALL_CLEAR, 'All clear. The game is ready.')
})

test('Health: a red cross shows the ID, the name and the case, nothing else', () => {
  const v = healthView({ at: Date.now(), groups: [{ name: 'Case generator', passed: 9, total: 10, failed: [{ id: 'G49', name: 'Salem', seed: 'case 28', extra: 'never shown' }] }] })
  assert.equal(v.allClear, false)
  assert.equal(v.groups[0].ok, false)
  assert.deepEqual(v.groups[0].failed, [{ id: 'G49', name: 'Salem', seed: 'case 28' }])
})

test('Health: no record yet', () => {
  assert.equal(healthView(null).empty, true)
  assert.equal(healthView(null).allClear, false)
})
