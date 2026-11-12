// A7 (handoff 11 Nov 2026): Sir Irwin Needs a Hand on the screens. His voice
// on the Parlour TV, the wins and misses, and the words at a turn. Throwaway
// relay shapes with no pictures in them; nothing here is a night.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { voiceUrl, voiceFrom } from '../src/lib/irwinvoice.js'
import { pictureNamed } from '../src/lib/relayhost.js'
import { slideAt } from '../src/lib/screen.js'

const sourceOf = (name) => readFileSync(fileURLToPath(new URL(`../src/screens/${name}`, import.meta.url)), 'utf8')

test('A7 the voice files: play/public/voice/<id>.m4a under the site', () => {
  assert.equal(voiceUrl('irwin-slide-3'), '/play/voice/irwin-slide-3.m4a')
  assert.equal(voiceUrl('irwin-door', '/'), '/voice/irwin-door.m4a')
  assert.equal(voiceUrl(null), null)
})

test('A7 where the voice starts: from the top, part-way for a screen that joins late, never after its end', () => {
  assert.equal(voiceFrom(0, 9_000), 0)
  assert.equal(voiceFrom(300, 9_000), 0)
  assert.equal(voiceFrom(4_250, 9_000), 4.25)
  assert.equal(voiceFrom(8_900, 9_000), null, 'nothing left to say')
  assert.equal(voiceFrom(9_500, 9_000), null, 'in the second after it')
  assert.equal(voiceFrom(0, 0), null, 'no recording: silent')
})

test('A7 the slides turn on the server\'s clock, voiced or not, and say how far into a slide the clock is', () => {
  const slides = [{ ms: 5_000, voice: 'irwin-slide-1', voiceMs: 4_000 }, { ms: 9_000, voice: null }, { ms: 3_000, voice: 'irwin-slide-3', voiceMs: 2_000 }]
  const relay = { slides, introEndsAt: 100_000 } // started at 83 000
  assert.deepEqual(slideAt(relay, 83_000), { index: 0, slide: slides[0], count: 3, into: 0 })
  assert.deepEqual(slideAt(relay, 90_500), { index: 1, slide: slides[1], count: 3, into: 2_500 })
  assert.equal(slideAt(relay, 97_500).index, 2)
  assert.equal(slideAt(relay, 97_500).into, 500)
})

test('A7 the TV plays the voice the server names, and its time is never the sound\'s', () => {
  const kiosk = sourceOf('Kiosk.jsx')
  assert.match(kiosk, /\{s\?\.voice && !captionsOnly && <IrwinVoice key=\{`\$\{ms\(relay\.startedAt\)\}:\$\{index\}`\} id=\{s\.voice\} voiceMs=\{s\.voiceMs\} into=\{into\} \/>\}/)
  assert.match(kiosk, /\{slide\.voice && <IrwinVoice key=\{`door:/)
  const voice = sourceOf('IrwinVoice.jsx')
  assert.match(voice, /if \(p\?\.catch\) p\.catch\(\(\) => \{\}\)/, 'a refused play is let go')
  assert.ok(!/setTimeout|onEnded|advance/.test(voice), 'the sound moves nothing on')
  assert.match(voice, /get\('mute'\) === '1'/, '&mute=1 keeps it silent')
})

test('A7 a picture named is a big win on the TV and a medium one on the phones; a wrong pick buzzes', () => {
  const kiosk = sourceOf('Kiosk.jsx')
  assert.match(kiosk, /if \(relay\.state === 'walk' && relay\.lastResult === 'right'\) celebrate\('big'\)/)
  assert.match(kiosk, /else if \(relay\.state === 'done'\) celebrate\('big'\)/)
  assert.match(kiosk, /else if \(wrongPick\(lastCrossed\.current, relay\)\) celebrate\('miss'/)
  const relay = sourceOf('Relay.jsx')
  assert.match(relay, /if \(pictureNamed\(seenGrid\.current, relay\)\) celebrate\('medium'\)/)
  assert.match(relay, /watchedLastGuess = false; celebrate\('medium'\)/, 'the third picture, on the door card')
  assert.match(relay, /playSound\('buzz'\)/)
})

test('A7 pictureNamed: only for a phone that watched the guess, once the next walk starts after a right pick', () => {
  assert.equal(pictureNamed(1, { state: 'walk', lastResult: 'right', grid: 2 }), true)
  assert.equal(pictureNamed(0, { state: 'walk', lastResult: 'right', grid: 2 }), false, 'a phone that opened on the walk')
  assert.equal(pictureNamed(2, { state: 'walk', lastResult: 'right', grid: 2 }), false, 'the same grid: a walk between turns')
  assert.equal(pictureNamed(1, { state: 'vote', lastResult: 'wrong', grid: 1 }), false)
})

test('A7 the words at a turn: the person at the paper now, and the drawer\'s own phone', () => {
  const relay = sourceOf('Relay.jsx')
  assert.match(relay, /\{relay\.drawerName \?\? 'Someone'\} is drawing\.<br \/>Describe this square!/)
  assert.match(relay, /<p className="moment-text">Draw what they say!<\/p>/)
  assert.ok(!/Tell \{relay\.drawerName\} how/.test(relay))
})
