import { test } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  memoryDb, syntheticSealed, syntheticSealedSet, dogFilterOk, characterNameWords, readSafeInputs, inputStanza, stanzaCounts,
  say, printReport, LINE_MAX, SEALED_FIELDS, rhymeWords,
} from '../lib.mjs'
import { validateAll } from '../validate-sealed.mjs'
import { CodeContent, userPrompt } from '../generate-sealed.mjs'

// SEAL. Everything "sealed" in this file is synthetic, made in memory from a
// word, tied to no motive, and gone when the process ends. Nothing here
// reads or writes Firestore: memoryDb stands in, and --dry never connects.

const here = dirname(fileURLToPath(import.meta.url))

function capture(fn) {
  const lines = []
  const real = console.log
  console.log = (...a) => lines.push(a.join(' '))
  try { fn() } finally { console.log = real }
  return lines
}

test('a synthetic set of nineteen passes the validator with the new counts, and nothing persists', async () => {
  const db = memoryDb(syntheticSealedSet(19))
  const report = await validateAll(db)
  assert.equal(report.pass, true)
  assert.equal(report.codes, 19)
  assert.equal(report.complete, 19)
  assert.equal(report.studyClueFails, 0)
  assert.equal(report.irwinFails, 0)
  assert.equal(report.banned, 0)
  assert.equal(report.granoliaFails, 0)
  assert.equal(report.salemFails, 0)
  assert.ok([...db.store.keys()].some(k => k.startsWith('validation_reports/')), 'the report is written back')
  for (const f of SEALED_FIELDS) assert.ok(f in syntheticSealed('x'), `synthetic set carries ${f}`)
})

test('the new fields are checked by form: a long Irwin line, a named guest, a token in a study line', async () => {
  const docs = syntheticSealedSet(19)
  const d = docs['sealed/DRY01']
  d.irwin[0] = '(Synthetic one two three four five six seven eight nine ten eleven twelve thirteen)'
  d.irwin[1] = '(Synthetic line that names Prudence by accident)'
  d.studyClue[0] = d.studyClue[0].replace('s1', '[ROOM]')
  d.studyClue[1] = '(Synthetic too short)'
  const report = await validateAll(memoryDb(docs))
  assert.equal(report.pass, false)
  assert.equal(report.irwinFails, 2)
  assert.equal(report.studyClueFails, 2)
  assert.equal(report.complete, 19, 'complete counts fields, not their quality')
  // dog filter on its own
  const names = characterNameWords()
  assert.ok(names.has('prudence') && names.has('ledger') && !names.has('prof'))
  assert.equal(dogFilterOk('(Synthetic: something true, in twelve words or fewer, about a thing.)', names), true)
  assert.equal(dogFilterOk('(Synthetic: a line for you.)', names), false)
  assert.equal(dogFilterOk('(Synthetic: a line about [ROOM].)', names), false)
  assert.equal(dogFilterOk('', names), false)
})

test('an incomplete set (no studyClue, no irwin) is not complete', async () => {
  const docs = syntheticSealedSet(19)
  delete docs['sealed/DRY02'].studyClue
  delete docs['sealed/DRY03'].irwin
  const report = await validateAll(memoryDb(docs))
  assert.equal(report.complete, 17)
  assert.equal(report.pass, false)
})

test('the generator reads the safe inputs as a stanza and never prints them; its schema carries the new fields', async () => {
  const db = memoryDb({
    'safe_content/pools': { items: [
      { id: 'a', text: '(synthetic room one)', pool: 'room', order: 0 }, { id: 'b', text: '(synthetic room two)', pool: 'room', order: 1 },
      { id: 'c', text: '(synthetic time one)', pool: 'time', order: 0 }, { id: 'd', text: 'gone', pool: 'time', order: 1, deleted: true },
    ] },
    'safe_content/openers': { items: [{ id: 'o', text: '(synthetic opener)', cat: 'irwin', order: 0 }] },
    'safe_content/closers': { items: [{ id: 'c', text: '(synthetic closer)', cat: 'salem', order: 0 }] },
  })
  const inputs = await readSafeInputs(db)
  assert.deepEqual(inputs.pools.room, ['(synthetic room one)', '(synthetic room two)'])
  assert.deepEqual(inputs.pools.time, ['(synthetic time one)'])
  assert.deepEqual(stanzaCounts(inputs), { poolValues: 3, voiceLines: 2 })
  const stanza = inputStanza(inputs)
  assert.ok(stanza.includes('[ROOM]') && stanza.includes('(synthetic room one)') && stanza.includes('(synthetic closer)'))
  assert.equal(inputStanza({}), '', 'an empty workshop adds nothing')
  const prompt = userPrompt({ n: 1, rhyme: 'The last of the pie, gone in the blink of an eye' }, { stanza, names: ['prudence'] })
  assert.ok(prompt.includes('prudence') && prompt.includes(stanza))
  for (const w of rhymeWords('The last of the pie, gone in the blink of an eye')) assert.ok(prompt.includes(w))
  const parsed = CodeContent.safeParse(syntheticSealed('x'))
  assert.equal(parsed.success, true)
  const missing = CodeContent.safeParse({ ...syntheticSealed('x'), irwin: undefined })
  assert.equal(parsed.success && !missing.success, true)
})

test('say wraps every line to eighty characters and printReport prints counts only', () => {
  const lines = capture(() => { say('x'.repeat(50) + ' ' + 'y'.repeat(50)); printReport({ codes: 19, pass: true, nested: { a: 1 } }) })
  assert.ok(lines.every(l => l.length <= LINE_MAX), 'no line longer than 80')
  assert.equal(lines.length, 5)
  assert.ok(lines.includes('codes: 19') && lines.includes('pass: true') && lines.includes('nested: {"a":1}'))
})

test('node validate-sealed.mjs --dry reports pass on a synthetic in-memory set, short lines, no content', () => {
  const out = execFileSync(process.execPath, [join(here, '..', 'validate-sealed.mjs'), '--dry'], { encoding: 'utf8', cwd: join(here, '..') })
  const lines = out.trimEnd().split('\n')
  assert.equal(lines.at(-1), 'PASS')
  assert.ok(lines.includes('codes: 19') && lines.includes('complete: 19') && lines.includes('studyClueFails: 0') && lines.includes('irwinFails: 0'))
  for (const l of lines) assert.ok(l.length <= 80, `line of ${l.length} chars`)
  assert.ok(!/Synthetic|lantern|\[ROOM\]/.test(out), 'no content in the output')
})
