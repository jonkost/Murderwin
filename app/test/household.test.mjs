import { test } from 'node:test'
import assert from 'node:assert/strict'
import { rankFor, irwinLine, IRWIN, RANKS, TOP_RANK } from '../src/lib/household.js'

test('ranks climb with lines and never skip', () => {
  assert.equal(rankFor(0).name, 'Boots')
  assert.equal(rankFor(9).name, 'Boots')
  assert.equal(rankFor(10).name, 'Scullery')
  assert.equal(rankFor(94).name, 'Cook')
  assert.equal(rankFor(94).next.name, 'Housekeeper')
  assert.equal(rankFor(999).name, 'Butler')
  assert.equal(rankFor(999).next, null)
  assert.equal(rankFor(3, true).name, TOP_RANK)
  assert.ok(RANKS.every((r, i) => i === 0 || r.at > RANKS[i - 1].at))
})

test('Irwin says the first true thing, save failures first', () => {
  assert.equal(irwinLine({ saveFailed: true, today: 5 }), IRWIN.saveFailed)
  assert.equal(irwinLine({ allFull: true }), IRWIN.allFull)
  assert.equal(irwinLine({ listJustFull: true, today: 1 }), IRWIN.listFull)
  assert.equal(irwinLine({ newRank: true, today: 1 }), IRWIN.newRank)
  assert.equal(irwinLine({ today: 3 }), IRWIN.threeToday)
  assert.equal(irwinLine({ today: 1 }), IRWIN.firstToday)
  assert.equal(irwinLine({ today: 0 }), IRWIN.nothingToday)
  assert.equal(irwinLine({ today: 0, everWritten: false }), IRWIN.hello)
  for (const line of Object.values(IRWIN)) assert.ok(!line.includes('—'), 'no long dashes')
})
