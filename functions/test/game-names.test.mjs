import { test } from 'node:test'
import assert from 'node:assert/strict'
import { GAME_NAMES } from '../lib/night.js'
import { ROOMS } from '../lib/act4.js'
import { IRWIN_SLIDES } from '../lib/relay.js'

// The five game names and hooks, exactly as docs/handoff-2026-10-23.md §16.1
// has them: the apostrophes, the exclamation mark, Sir Irwin in full.
const NAMES = {
  study: ["Granolia's Lightbulb Moment", "She knows how to turn on the lights. It's on the tip of her tongue."],
  library: ['In Duplicate', 'Sir Irwin scattered his files. Match every copy. He bills by the pair.'],
  orangerie: ['Get Off My Lawn!', 'Red means go. Green means freeze. Yes, backwards.'],
  entryway: ["Boo's Catwalk", "When the music stops, strike a pose. She's always judging."],
  drawing: ['Sir Irwin Needs a Hand', 'Three drawings open the door. He only has paws.'],
}

test('the game names: five, each name and hook exactly as Jon wrote them; the deduction round has none', () => {
  assert.deepEqual(Object.keys(GAME_NAMES).sort(), Object.keys(NAMES).sort())
  for (const [id, [name, hook]] of Object.entries(NAMES)) {
    assert.equal(GAME_NAMES[id].name, name, id)
    assert.equal(GAME_NAMES[id].hook, hook, id)
  }
})

test('the game names: each Act 4 room\'s direction card and the drawing\'s first slide carry the name and the hook', () => {
  for (const id of ['study', 'library', 'orangerie', 'entryway']) assert.deepEqual([ROOMS[id].title, ROOMS[id].hook], NAMES[id])
  assert.deepEqual([IRWIN_SLIDES[0].title, IRWIN_SLIDES[0].hook], NAMES.drawing)
})
