// The review of 12 Nov 2026: in a pause the Orangerie's string lights went on
// flipping red and green over the phones' pause card. They now hold the colour
// the round stopped on, like the Orangerie's board; Resume starts the round
// again from its count (functions/lib/salemlimits.js resumedRound).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { stringsWanted, DECOR } from '../lib/strings.js'

test('in a pause the strings hold the colour the round stopped on', () => {
  const T = 1_000_000
  const salem = { state: 'playing', flips: [{ at: new Date(T), colour: 'red' }, { at: new Date(T + 4000), colour: 'green' }, { at: new Date(T + 9000), colour: 'red' }] }
  const playing = { act: 4, phase: 'act' }
  assert.equal(stringsWanted(salem, playing, T + 1000), 'red')
  assert.equal(stringsWanted(salem, playing, T + 5000), 'green')
  // paused one second in, on red: red for as long as the pause lasts, whatever the list says next
  const paused = { act: 4, phase: 'paused', pausedFrom: 'act', pausedAt: new Date(T + 1000) }
  for (const later of [T + 1500, T + 5000, T + 10_000, T + 600_000]) assert.equal(stringsWanted(salem, paused, later), 'red')
  // a pause with no round under way: the decor colour, as ever
  assert.equal(stringsWanted({ state: 'passed', flips: [] }, paused, T + 5000), DECOR)
  assert.equal(stringsWanted(null, paused, T + 5000), DECOR)
  // a pause record with no time (an older night): the live clock, as before
  assert.equal(stringsWanted(salem, { act: 4, phase: 'paused' }, T + 5000), 'green')
})
