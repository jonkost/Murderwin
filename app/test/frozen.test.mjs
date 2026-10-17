import { test } from 'node:test'
import assert from 'node:assert/strict'
import { frozenState, freezePatch, unfreezePatch, FROZEN_BANNER, FROZEN_CHIP } from '../src/lib/frozen.js'

// The editors read this one helper: when meta/game.frozenAt is present they
// render read-only with the banner; without it they are as before.

test('meta/game.frozenAt present: read-only with the banner; absent or cleared: editable, no banner', () => {
  const on = frozenState({ frozenAt: 1_700_000_000_000 })
  assert.equal(on.frozen, true)
  assert.equal(on.readOnly, true)
  assert.equal(on.banner, FROZEN_BANNER)
  assert.equal(on.since.getTime(), 1_700_000_000_000)
  assert.ok(FROZEN_BANNER.includes('Frozen for the party') && FROZEN_CHIP === 'Frozen for the party')
  assert.ok(!FROZEN_BANNER.includes('—'))
  // a Firestore timestamp or a Date works too
  assert.equal(frozenState({ frozenAt: { toMillis: () => 5 } }).frozen, true)
  assert.equal(frozenState({ frozenAt: new Date(5) }).frozen, true)
  for (const game of [{}, null, undefined, { frozenAt: null }, { frozenAt: 0 }]) {
    const off = frozenState(game)
    assert.equal(off.frozen, false)
    assert.equal(off.readOnly, false)
    assert.equal(off.banner, null)
    assert.equal(off.since, null)
  }
  assert.deepEqual(freezePatch(42), { frozenAt: 42 })
  assert.deepEqual(unfreezePatch(), { frozenAt: null })
  assert.equal(frozenState({ ...{ party_night: true }, ...freezePatch(7) }).frozen, true)
  assert.equal(frozenState({ ...freezePatch(7), ...unfreezePatch() }).frozen, false)
})
