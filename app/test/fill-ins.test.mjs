import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { MAX_FILL_INS, PARTY_DAY, fillInArg, fillInsOffered } from '../src/lib/startNight.js'
import * as phone from '../../play/src/lib/start.js'

// Fill-in players on the workshop's Start button (A4, 11 Nov 2026): the same rule as the phone's card.
const src = p => readFileSync(new URL(`../src/${p}`, import.meta.url), 'utf8')
const before = Date.parse('2026-11-12T23:00:00Z')

test('the workshop offers 0 to 8 fill-in players on a practice night only, exactly as the phone does', () => {
  assert.equal(MAX_FILL_INS, phone.MAX_FILL_INS)
  assert.equal(PARTY_DAY, phone.PARTY_DAY)
  for (const real of [true, false]) for (const now of [before, PARTY_DAY - 1, PARTY_DAY]) {
    assert.equal(fillInsOffered({ real, now }), phone.fillInsOffered({ real, now }))
    for (const fillIns of [0, 1, 6, 8, 12, -1, 'x']) assert.deepEqual(fillInArg({ real, fillIns, now }), phone.fillInArg({ real, fillIns, now }), `${real} ${now} ${fillIns}`)
  }
  assert.deepEqual(fillInArg({ real: true, fillIns: 6, now: before }), {}, 'never sent with the box ticked')
  const card = src('components/StartNight.jsx')
  assert.ok(card.includes('{fillInsOffered({ real }) && (') && card.includes('Fill-in players'), 'the row, practice only')
  assert.ok(card.includes('await startNight({ real, fillIns })'))
  assert.ok(src('lib/startNightApi.js').includes('...fillInArg({ real, fillIns })'), 'the number goes with the call')
})
