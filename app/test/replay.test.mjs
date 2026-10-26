import { test } from 'node:test'
import assert from 'node:assert/strict'
import { replayView, cleanSeed } from '../src/lib/replay.js'

// The Replay box on the Game night page (card 324).

test('the box says what the next night will be dealt from', () => {
  assert.match(replayView({ game: {} }).status, /fresh word/)
  const v = replayView({ game: { replay_seed: ' Tulip 4471' } })
  assert.equal(v.waiting, 'tulip-4471')
  assert.match(v.status, /tulip-4471/)
})

test('greyed out on the party night, whatever is typed', () => {
  const v = replayView({ game: { party_night: true, replay_seed: 'tulip-4471' } })
  assert.equal(v.party, true)
  assert.equal(v.waiting, '')
  assert.match(v.status, /never replayed/)
})

test('the last rehearsals, newest first as the server keeps them, each with its word', () => {
  const at = new Date('2026-10-25T14:00:00Z')
  const v = replayView({ replay: { recent: [{ seed: 'tulip-4471', label: 'Practice run', replayed: true, at }, { seed: 'acorn-1000', label: 'Night of Sun Oct 25 2026', gameTest: true, at }, { label: 'no word' }] } })
  assert.deepEqual(v.recent.map(r => [r.seed, r.note]), [['tulip-4471', 'a replay'], ['acorn-1000', 'a Game test night']])
  assert.equal(v.recent[0].at, at.getTime())
  assert.deepEqual(v.recent.map(r => r.label), ['Practice run', ''], 'the default label is only the date again')
})

test('the word is cleaned the way the server cleans it', () => {
  assert.equal(cleanSeed('  Raven  9999 '), 'raven-9999')
  assert.equal(cleanSeed('a!b?c'), 'abc')
})

test('the page and the server clean a word alike', async () => {
  const server = await import('../../functions/lib/seed.js')
  for (const w of ['Tulip 4471', '  raven--9999 ', 'Ünïcode', 'a b c', '', 'x'.repeat(50), 'heron_2024']) assert.equal(cleanSeed(w), server.cleanSeed(w), `a word of length ${w.length}`)
})
