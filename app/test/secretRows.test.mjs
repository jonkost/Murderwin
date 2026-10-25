import { test } from 'node:test'
import assert from 'node:assert/strict'
import { secretRows } from '../src/lib/secretRows.js'

// The Home rows (card 343): numbers in, plain rows out. Nothing but the
// counts the server sent can reach the page.

test('three rows: the packing made or not, the leans and the pictures as N of M', () => {
  const rows = secretRows({ ok: true, packing: { made: true, bags: 10 }, leans: { questions: 12, of: 51 }, pictures: { made: 9, of: 9 } })
  assert.deepEqual(rows.map(r => [r.key, r.value, r.done]), [
    ['packing', 'Made · 10 bags', true],
    ['leans', '12 of 51 questions', false],
    ['pictures', '9 of 9', true],
  ])
})

test('nothing made yet, or no answer from the server', () => {
  const rows = secretRows({ ok: true, packing: { made: false, bags: 0 }, leans: { questions: 0, of: 0 }, pictures: { made: 0, of: 9 } })
  assert.deepEqual(rows.map(r => [r.value, r.done]), [['Not made yet', false], ['0 of 0 questions', false], ['0 of 9', false]])
  assert.deepEqual(secretRows(null), [])
  assert.deepEqual(secretRows({ ok: false }), [])
})
