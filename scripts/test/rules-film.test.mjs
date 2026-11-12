import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, writeFileSync, mkdirSync, utimesSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { RULES_FILES, CUTS, cutPoint, findRecordings } from '../rules-film.mjs'

// The rules film's importer (handoff 11 Nov 2026, A14): pure parts only. Nothing here runs ffmpeg or plays a sound.

test('the importer knows the 28 recordings by the manifest’s names', () => {
  assert.equal(RULES_FILES.length, 28)
  assert.equal(RULES_FILES[0], 'rules-01-cover')
  assert.equal(RULES_FILES[27], 'rules-28-good-luck')
  assert.equal(new Set(RULES_FILES).size, 28)
  const root = JSON.parse(readFileSync(new URL('../../package.json', import.meta.url), 'utf8'))
  assert.equal(root.scripts['rules-film'], 'node scripts/rules-film.mjs')
})

test('rule 25 is stopped at the pause before the deduction round, and left whole when a retake has no pause there', () => {
  const cut = CUTS['rules-25-act6-the-final-hour']
  assert.ok(cut && cut.at > 30 && cut.at < 40)
  // the pauses measured in Jon's take of 11 Nov 2026
  const pauses = [[29.28, 29.93], [31.91, 32.14], [32.65, 33.30], [33.40, 33.73], [35.68, 36.71], [38.05, 38.32], [38.82, 39.33], [40.74, 41.39], [44.41, 45.20]].map(([start, end]) => ({ start, end }))
  assert.equal(cutPoint(pauses, cut), 35.98, 'a little into the long pause after "with the Murderer’s trace inside."')
  // a short breath near the time is not a sentence's end
  assert.equal(cutPoint([{ start: 35.7, end: 35.95 }], cut), null)
  // a retake whose pauses are somewhere else: nothing is cut by guesswork
  assert.equal(cutPoint([{ start: 20, end: 21 }, { start: 44, end: 45 }], cut), null)
  assert.equal(cutPoint([], cut), null)
  // a recording with no cut is never touched
  assert.equal(cutPoint(pauses, undefined), null)
  assert.deepEqual(Object.keys(CUTS), ['rules-25-act6-the-final-hour'], 'only the one sentence is cut')
})

test('recordings are found by name in a folder, two levels down, the newest take winning', () => {
  const dir = mkdtempSync(join(tmpdir(), 'rules-film-'))
  mkdirSync(join(dir, 'FINAL EXPORTS', 'old'), { recursive: true })
  const a = join(dir, 'FINAL EXPORTS', 'rules-01-cover.wav')
  const b = join(dir, 'FINAL EXPORTS', 'old', 'rules-01-cover.m4a')
  const c = join(dir, 'rules-28-good-luck.mp3')
  for (const f of [a, b, c, join(dir, 'rules-99-not-a-slide.wav'), join(dir, 'rules-02-tonight.txt'), join(dir, 'bulletin2-opening.wav')]) writeFileSync(f, 'x')
  utimesSync(b, new Date(1_700_000_000_000), new Date(1_700_000_000_000)) // the older take
  const found = findRecordings(dir)
  assert.deepEqual(Object.keys(found).sort(), ['rules-01-cover', 'rules-28-good-luck'])
  assert.equal(found['rules-01-cover'], a, 'the newer file')
  assert.equal(found['rules-28-good-luck'], c)
})
