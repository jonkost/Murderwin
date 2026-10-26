import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { motivePictureUrl, MOTIVE_COUNT } from '../src/lib/motives.js'
import motivesSeed from '../../seed/motives.json' with { type: 'json' }

// The motive cards' pictures (card 308): one file a motive, by its number.

const src = rel => readFileSync(new URL(rel, import.meta.url), 'utf8')

test('every motive has a picture slot, motives/1.png to 19.png, under the page base', () => {
  assert.equal(motivesSeed.motives.length, MOTIVE_COUNT)
  for (const m of motivesSeed.motives) assert.equal(motivePictureUrl(m.n, '/play/'), `/play/motives/${m.n}.png`)
  assert.equal(motivePictureUrl('7'), '/motives/7.png', 'a number as text is the same motive')
})

test('anything that is not a motive has no picture', () => {
  for (const n of [0, 20, -1, 2.5, null, undefined, 'pie', NaN]) assert.equal(motivePictureUrl(n), null)
})

test('the countdown and the reveal show the picture beside the rhyme, and the rhyme alone when it is missing', () => {
  const kiosk = src('../src/screens/Kiosk.jsx')
  assert.match(kiosk, /<MotivePicture n=\{c\.n\}/, "Sir Irwin's countdown has the slot")
  assert.match(kiosk, /<MotivePicture n=\{names\.motive\?\.n\}/, "the reveal's motive card has the slot")
  // a missing picture renders nothing, so the rhyme beside it stands alone
  assert.match(kiosk, /if \(!src \|\| broken\) return null/)
  assert.match(kiosk, /onError=\{\(\) => setBroken\(true\)\}/)
})
