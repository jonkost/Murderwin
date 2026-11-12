// The review of 12 Nov 2026, S5: the blackout's scream is written at the press, stamped ahead for the dark
// mark. On the "brain" road the brain must wait for that moment too, never play it at the press.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { plan } from '../lib/cues.js'

const NOW = 1_800_000_000_000
const night = { phase: 'act', act: 1 }

test('S5 a cue stamped ahead is planned with the wait to its moment; an ordinary cue plays at once', () => {
  const ahead = plan({}, { night, sounds: { current: { id: 'blackout', at: new Date(NOW + 2000), ahead: true } } }, NOW)
  const a = ahead.actions.find(x => x.type === 'sound')
  assert.equal(a.id, 'blackout')
  assert.equal(a.waitMs, 2000)
  assert.equal(a.at, NOW + 2000)
  const plain = plan({}, { night, sounds: { current: { id: 'blackout', at: new Date(NOW) } } }, NOW).actions.find(x => x.type === 'sound')
  assert.equal(plain.waitMs, undefined)
  // the moment come: at once
  const due = plan({}, { night, sounds: { current: { id: 'blackout', at: new Date(NOW), ahead: true } } }, NOW).actions.find(x => x.type === 'sound')
  assert.equal(due.waitMs, undefined)
})

test('S5 the brain plays a cue stamped ahead at its moment, and only if the doc still names it then', () => {
  const src = readFileSync(new URL('../cues.mjs', import.meta.url), 'utf8')
  assert.ok(src.includes("if (a.type === 'sound' && a.waitMs > 0) setTimeout(() => { if (stamp(docs.sounds?.current?.at) === a.at) playSound(a) }, a.waitMs)"))
})
