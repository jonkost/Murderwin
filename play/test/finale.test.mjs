import { test } from 'node:test'
import assert from 'node:assert/strict'
import { finaleStage, elapsed, namesReady, secondsUntilNames, shownStats, shownAchievements, releasedNames, achievementsOf, EPILOGUE_AFTER_MS } from '../src/lib/finale.js'

// Pure helpers for the living room screen in Act 7. Sample docs are shaped
// as the server writes them; no names in them are anything but samples.

const at = 1_000_000
const doc = (extra = {}) => ({
  at: new Date(at), stage: 'stats',
  schedule: { stats: 0, awards: 34_000, graph: 50_000, names: 80_000 },
  stats: [{ label: 'A', value: '1', showAt: 0 }, { label: 'B', value: '2', showAt: 4_000 }, { label: 'C', value: '3', showAt: 8_000 }],
  achievements: [{ name: 'X', title: 'T', line: 'l', showAt: 34_000 }],
  names: {}, epilogue: null, victimAt: null, holdAt: null, held: 0,
  ...extra,
})

test('the clock runs the stats, the achievements and the graph; a name shows only when the host has released it', () => {
  const f = doc()
  assert.equal(finaleStage(f, at), 'stats')
  assert.equal(finaleStage(f, at + 33_999), 'stats')
  assert.equal(finaleStage(f, at + 34_000), 'awards')
  assert.equal(finaleStage(f, at + 50_000), 'graph')
  assert.equal(finaleStage(f, at + 500_000), 'graph', 'the screen waits on the graph for the host, however long')
  assert.equal(namesReady(f, at + 79_999), false)
  assert.equal(namesReady(f, at + 80_000), true)
  assert.equal(secondsUntilNames(f, at + 70_000), 10)
  assert.equal(secondsUntilNames(f, at + 90_000), 0)
  // no achievements: the awards segment is skipped
  assert.equal(finaleStage(doc({ achievements: [] }), at + 40_000), 'stats')
  // the host's press wins over the clock
  assert.equal(finaleStage(doc({ stage: 'murderer', names: { murderer: { name: 'J' } } }), at + 90_000), 'murderer')
  assert.equal(finaleStage(doc({ stage: 'motive' }), at + 90_000), 'motive')
  const victim = doc({ stage: 'victim', epilogue: 'And so.', victimAt: new Date(at + 100_000) })
  assert.equal(finaleStage(victim, at + 100_000 + EPILOGUE_AFTER_MS - 1), 'victim')
  assert.equal(finaleStage(victim, at + 100_000 + EPILOGUE_AFTER_MS), 'done')
  assert.equal(finaleStage(doc({ stage: 'victim', epilogue: null, victimAt: new Date(at) }), at + 500_000), 'victim', 'no story, no done screen')
  assert.deepEqual(releasedNames(doc()), [])
  assert.deepEqual(releasedNames(doc({ stage: 'motive' })), ['murderer', 'motive'])
  assert.deepEqual(releasedNames(doc({ stage: 'victim' })), ['murderer', 'motive', 'victim'])
  assert.equal(finaleStage(null, at), 'stats')
})

test('the reel shows each line at its moment; a hold freezes the clock where it stood', () => {
  const f = doc()
  assert.deepEqual(shownStats(f, at + 3_999).map(s => s.label), ['A'])
  assert.deepEqual(shownStats(f, at + 8_000).map(s => s.label), ['A', 'B', 'C'])
  assert.deepEqual(shownAchievements(f, at + 33_000), [])
  assert.equal(shownAchievements(f, at + 34_000).length, 1)
  const held = doc({ holdAt: new Date(at + 5_000) })
  assert.equal(elapsed(held, at + 60_000), 5_000)
  assert.equal(finaleStage(held, at + 60_000), 'stats')
  assert.deepEqual(shownStats(held, at + 60_000).map(s => s.label), ['A', 'B'])
  assert.equal(namesReady(held, at + 90_000), false)
  // held after the Victim: the story waits too
  const heldVictim = doc({ stage: 'victim', epilogue: 'And so.', victimAt: new Date(at + 100_000), holdAt: new Date(at + 101_000) })
  assert.equal(finaleStage(heldVictim, at + 200_000), 'victim')
})

test('achievementsOf reads the workshop list as Title: line, numbered as the host taps them', () => {
  const content = { achievements: [{ text: 'Clean Plate Club: nothing left.' }, { text: 'No colon here' }, { text: '  ' }, { text: 'Two: parts: kept' }] }
  assert.deepEqual(achievementsOf(content), [
    { n: 1, title: 'Clean Plate Club', line: 'nothing left.' },
    { n: 2, title: 'No colon here', line: '' },
    { n: 4, title: 'Two', line: 'parts: kept' },
  ])
  assert.deepEqual(achievementsOf(null), [])
  assert.deepEqual(achievementsOf({ achievements: { items: [{ text: 'A: b' }] } }), [{ n: 1, title: 'A', line: 'b' }])
})
