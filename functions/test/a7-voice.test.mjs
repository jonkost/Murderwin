// A7 step 3 (handoff 11 Nov 2026): Sir Irwin's voice for the drawing's
// slides. The words and the voice come from one list; a slide with a
// recording stays up for it plus one second; with no recording, the old
// timing and no voice.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { IRWIN_LINES, VOICE_LENGTHS, VOICE_PAD_MS, lineTiming, voiceSeconds, wordsKey, slideMs, voiceIds } from '../lib/slide-voice.js'
import { IRWIN_SLIDES, IRWIN_DOOR_SLIDE, INTRO_MS, start, relayPaths } from '../lib/relay.js'
import { FakeFirestore } from './fake-firestore.mjs'
import { createNight, join } from '../lib/night.js'

const root = new URL('../../', import.meta.url)
const seedLines = JSON.parse(readFileSync(new URL('seed/irwin-lines.json', root), 'utf8'))

test('A7 the words on the slides and the words of the voice are one list (seed/irwin-lines.json)', () => {
  assert.deepEqual(voiceIds(), ['irwin-slide-1', 'irwin-slide-2', 'irwin-slide-3', 'irwin-slide-4', 'irwin-slide-5', 'irwin-slide-6', 'irwin-slide-7', 'irwin-door'])
  assert.deepEqual(IRWIN_LINES, seedLines, 'the server reads the same file the voice is made from')
  assert.deepEqual(IRWIN_SLIDES.map(s => s.text), seedLines.slides.map(l => l.text), 'each slide shows its line')
  assert.deepEqual(IRWIN_SLIDES.map(s => s.id), seedLines.slides.map(l => l.id))
  assert.equal(IRWIN_DOOR_SLIDE.text, seedLines.door.text)
  assert.equal(IRWIN_DOOR_SLIDE.id, 'irwin-door')
  // relay.js holds no words of its own any more
  const src = readFileSync(new URL('../lib/relay.js', import.meta.url), 'utf8')
  assert.ok(!/It's me, Sir Irwin|Pawsome!/.test(src), 'no slide words written twice')
})

test('A7 a line with a recording stays up for the recording plus one second, and names its file', () => {
  const line = { id: 'irwin-slide-6', text: 'Three grids, each bigger than the last. Small, medium, BIG.' }
  const lengths = { lines: { 'irwin-slide-6': { seconds: 4.62, words: wordsKey(line.text), by: 'say' } } }
  assert.deepEqual(lineTiming(line, lengths), { ms: 4_620 + VOICE_PAD_MS, voice: 'irwin-slide-6', voiceMs: 4_620 })
  assert.equal(VOICE_PAD_MS, 1_000)
})

test('A7 no recording: today\'s timing, silent', () => {
  const line = { id: 'irwin-slide-6', text: 'Three grids, each bigger than the last. Small, medium, BIG.' }
  for (const lengths of [{}, { lines: {} }, { lines: { 'irwin-slide-6': { seconds: 0, words: wordsKey(line.text) } } }, null]) {
    assert.deepEqual(lineTiming(line, lengths), { ms: slideMs(line.text), voice: null, voiceMs: 0 })
  }
  assert.equal(slideMs(line.text), 5_000 + 400 * 10, 'five seconds and 0.4 a word, as before')
})

test('A7 a recording made from other words is not used: the TV never says what the screen does not show', () => {
  const line = { id: 'irwin-slide-2', text: 'The words as they are now.' }
  const lengths = { lines: { 'irwin-slide-2': { seconds: 9, words: wordsKey('The words as they were.'), by: 'say' } } }
  assert.equal(voiceSeconds(line, lengths), 0)
  assert.equal(lineTiming(line, lengths).voice, null)
  assert.equal(wordsKey(' The  words as they are now. '), wordsKey(line.text), 'spaces do not count')
})

test('A7 the slides as built follow the lengths file in git, line by line', () => {
  for (const s of IRWIN_SLIDES) {
    const row = VOICE_LENGTHS.lines?.[s.id]
    if (row && row.words === wordsKey(s.text) && row.seconds > 0) assert.deepEqual([s.voice, s.ms], [s.id, Math.round(row.seconds * 1000) + 1_000], s.id)
    else assert.deepEqual([s.voice, s.ms], [null, slideMs(s.text)], s.id)
  }
  assert.equal(INTRO_MS, IRWIN_SLIDES.reduce((a, s) => a + s.ms, 0))
})

test('A7 the drawing writes each slide\'s time and voice to the public doc, and the slides end on the server\'s clock', async () => {
  const db = new FakeFirestore()
  db.store.set('meta/game', { host_jonathan: 'Jon', host_susan: 'Susan' })
  const { nightId } = await createNight(db)
  for (const name of ['Jon', 'Jessa', 'Jacob']) await join(db, { nightId, uid: `u-${name.toLowerCase()}`, name })
  const now = 10_000_000
  await start(db, { nightId, now, seed: 7 })
  const p = db.store.get(relayPaths(nightId).pub)
  assert.equal(p.state, 'intro')
  assert.deepEqual(p.slides.map(s => [s.id, s.ms, s.voice ?? null]), IRWIN_SLIDES.map(s => [s.id, s.ms, s.voice ?? null]))
  assert.equal(+p.introEndsAt, now + INTRO_MS)
})
