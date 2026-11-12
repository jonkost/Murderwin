// A7 step 3: npm run irwin-voice, its pure parts, and the rule that a file
// it did not make is never overwritten. Nothing here plays a sound: the one
// command the run below starts is `say -v '?'`, which only lists voices.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, writeFileSync, readFileSync, existsSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { parseVoices, pickVoice, decide, lengthsFile, linesOf, spokenText, makeVoice, MARKER } from '../irwin-voice.mjs'

const LISTING = [
  'Albert              en_US    # Hello! My name is Albert.',
  'Alice               it_IT    # Ciao! Mi chiamo Alice.',
  'Daniel              en_GB    # Hello! My name is Daniel.',
  'Eddy (English (US)) en_US    # Hello! My name is Eddy.',
  'Samantha            en_US    # Hello! My name is Samantha.',
].join('\n')

test('A7 the voices: parsed from say -v ?, Premium first, then Enhanced, then a good standard one', () => {
  const voices = parseVoices(LISTING)
  assert.deepEqual(voices.map(v => v.name), ['Albert', 'Alice', 'Daniel', 'Eddy (English (US))', 'Samantha'])
  assert.equal(pickVoice(voices), 'Eddy (English (US))')
  const better = parseVoices(`${LISTING}\nAva (Enhanced)      en_US    # Hello!\nJamie (Premium)     en_GB    # Hello!\nZoe (Premium)       en_US    # Hello!`)
  assert.equal(pickVoice(better), 'Zoe (Premium)', 'a Premium voice, American first')
  assert.equal(pickVoice(parseVoices(`${LISTING}\nAva (Enhanced)      en_US    # Hello!`)), 'Ava (Enhanced)')
  assert.equal(pickVoice(voices, 'samantha'), 'Samantha', 'one asked for by name')
  assert.equal(pickVoice(voices, 'Nobody'), null)
  assert.equal(pickVoice(parseVoices('Alice               it_IT    # Ciao!')), null, 'no English voice, no voice')
})

test('A7 never overwrite a file the command did not make', () => {
  const words = 'abc'
  // Jon's own .m4a: no marker, or a marker for a different file
  assert.equal(decide({ m4a: { hash: 'jon', mtime: 5 }, made: null, words }), 'own')
  assert.equal(decide({ m4a: { hash: 'jon', mtime: 5 }, made: { hash: 'ours', from: 'say', words }, words }), 'own')
  assert.equal(decide({ m4a: { hash: 'jon', mtime: 5 }, made: null, recording: { mtime: 9 }, words: 'new' }), 'own', 'not even for a newer recording or new words')
  // its own files
  assert.equal(decide({ m4a: null, words }), 'say')
  assert.equal(decide({ m4a: { hash: 'h', mtime: 5 }, made: { hash: 'h', from: 'say', words }, words }), 'keep')
  assert.equal(decide({ m4a: { hash: 'h', mtime: 5 }, made: { hash: 'h', from: 'say', words }, words: 'changed' }), 'say', 'the words changed: made again')
  // a recording of Jon's dropped in as .wav
  assert.equal(decide({ m4a: null, recording: { mtime: 1 }, words }), 'convert')
  assert.equal(decide({ m4a: { hash: 'h', mtime: 5 }, made: { hash: 'h', from: 'say', words }, recording: { mtime: 1 }, words }), 'convert', 'his recording beats the made voice')
  assert.equal(decide({ m4a: { hash: 'h', mtime: 5 }, made: { hash: 'h', from: 'recording', words }, recording: { mtime: 1 }, words: 'changed' }), 'keep', 'his converted recording is kept, whatever the words')
  assert.equal(decide({ m4a: { hash: 'h', mtime: 5 }, made: { hash: 'h', from: 'recording', words }, recording: { mtime: 9 }, words }), 'convert', 'a newer take is converted again')
})

test('A7 the lengths file: one row a line that has a file, with the words key it was made from', () => {
  const file = lengthsFile('Eddy (English (US))', [
    { id: 'irwin-slide-1', seconds: 10.333, words: 'k1', by: 'say' },
    { id: 'irwin-slide-2', seconds: 0, words: 'k2', by: 'say' },
    { id: 'irwin-door', seconds: 9.4, words: 'k3', by: 'recording' },
  ])
  assert.deepEqual(file, { voice: 'Eddy (English (US))', lines: { 'irwin-slide-1': { seconds: 10.33, words: 'k1', by: 'say' }, 'irwin-door': { seconds: 9.4, words: 'k3', by: 'recording' } } })
})

test('A7 the words said are the words shown, with a shouted word in plain letters', () => {
  assert.equal(spokenText('Only THEN does the screen show it. Small, medium, BIG. I'), 'Only then does the screen show it. Small, medium, big. I')
  assert.deepEqual(linesOf({ slides: [{ id: 'a', text: 'x' }], door: { id: 'd', text: 'y' } }).map(l => l.id), ['a', 'd'])
})

test('A7 a run over a folder of Jon\'s own files keeps every one of them, byte for byte', () => {
  const dir = mkdtempSync(join(tmpdir(), 'irwin-voice-test-'))
  const voiceDir = join(dir, 'voice')
  mkdirSync(voiceDir)
  const linesJson = join(dir, 'lines.json')
  const lengthsJson = join(dir, 'lengths.json')
  writeFileSync(linesJson, JSON.stringify({ slides: [{ id: 'irwin-slide-1', text: 'Hi.' }, { id: 'irwin-slide-2', text: 'Two.' }], door: { id: 'irwin-door', text: 'Door.' } }))
  for (const id of ['irwin-slide-1', 'irwin-slide-2', 'irwin-door']) writeFileSync(join(voiceDir, `${id}.m4a`), `jon's own ${id}`)
  const out = []
  const r = makeVoice({ dir: voiceDir, linesJson, lengthsJson, log: l => out.push(l) })
  assert.deepEqual(r.rows.map(x => x.what), ['own', 'own', 'own'])
  for (const id of ['irwin-slide-1', 'irwin-slide-2', 'irwin-door']) assert.equal(readFileSync(join(voiceDir, `${id}.m4a`), 'utf8'), `jon's own ${id}`)
  assert.ok(existsSync(join(voiceDir, MARKER)))
  assert.deepEqual(JSON.parse(readFileSync(join(voiceDir, MARKER), 'utf8')), {}, 'none of them is marked as made by the command')
  assert.ok(existsSync(lengthsJson), 'the lengths are written')
  assert.ok(out.some(l => /lines have a voice/.test(l)))
})
