import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, writeFileSync, mkdirSync, utimesSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { RULES_FILES, CUTS, cutPoint, findRecordings, findDeckPdf, slidePictures } from '../rules-film.mjs'
import { rulesLines, standIns, madeLines, report } from '../media-check.mjs'

// The rules film's importer (handoff 11 Nov 2026, A14): pure parts only. Nothing here runs ffmpeg or plays a sound.

test('the importer knows the 28 recordings by the manifest’s names', () => {
  assert.equal(RULES_FILES.length, 28)
  assert.equal(RULES_FILES[0], 'rules-01-cover')
  assert.equal(RULES_FILES[27], 'rules-28-good-luck')
  assert.equal(new Set(RULES_FILES).size, 28)
  const root = JSON.parse(readFileSync(new URL('../../package.json', import.meta.url), 'utf8'))
  assert.equal(root.scripts['rules-film'], 'node scripts/rules-film.mjs')
})

test('nothing of Jon’s is cut (12 Nov 2026: "Do not change the rule cards!"); the cut machinery still works if he ever asks', () => {
  assert.deepEqual(CUTS, {}, 'every recording plays whole')
  // how a cut would be placed: at the long pause nearest the written time (the pauses of Jon's rule 25, 11 Nov 2026)
  const cut = { at: 35.68, near: 1.2, why: 'a test' }
  const pauses = [[29.28, 29.93], [31.91, 32.14], [32.65, 33.30], [33.40, 33.73], [35.68, 36.71], [38.05, 38.32], [38.82, 39.33], [40.74, 41.39], [44.41, 45.20]].map(([start, end]) => ({ start, end }))
  assert.equal(cutPoint(pauses, cut), 35.98)
  // a short breath near the time is not a sentence's end
  assert.equal(cutPoint([{ start: 35.7, end: 35.95 }], cut), null)
  // a retake whose pauses are somewhere else: nothing is cut by guesswork
  assert.equal(cutPoint([{ start: 20, end: 21 }, { start: 44, end: 45 }], cut), null)
  assert.equal(cutPoint([], cut), null)
  // a recording with no cut is never touched
  assert.equal(cutPoint(pauses, undefined), null)
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

// Handoff 12 Nov 2026, job 1: the film's pictures are Jon's own 28 slides. The importer looks for his deck as a
// PDF beside his recordings, and the media check says which set the film shows.
test('Jon’s deck is looked for as a PDF in the folder or the one above it, and his slide pictures are counted', () => {
  const dir = mkdtempSync(join(tmpdir(), 'rules-deck-'))
  mkdirSync(join(dir, 'FINAL EXPORTS'))
  assert.equal(findDeckPdf(join(dir, 'FINAL EXPORTS')), null, 'no deck: nothing is guessed')
  const old = join(dir, 'The Rules old.pdf')
  const deck = join(dir, 'Sirwin Manor The Rules.pdf')
  for (const f of [old, deck, join(dir, 'Intro and Rules Script.pdf'), join(dir, 'Run sheet.pdf')]) writeFileSync(f, 'x')
  utimesSync(old, new Date(1_700_000_000_000), new Date(1_700_000_000_000))
  assert.equal(findDeckPdf(join(dir, 'FINAL EXPORTS')), deck, 'the newest PDF of the rules, never the script')
  const pics = mkdtempSync(join(tmpdir(), 'rules-pics-'))
  assert.equal(slidePictures(pics), 0)
  for (const f of RULES_FILES.slice(0, 27)) writeFileSync(join(pics, `${f}.jpg`), 'x')
  assert.equal(slidePictures(pics), 27)
  writeFileSync(join(pics, `${RULES_FILES[27]}.jpg`), 'x')
  assert.equal(slidePictures(pics), 28)
})

test('npm run media says whether the film shows Jon’s own slides or the drawn ones', () => {
  const voices = RULES_FILES.map(f => `${f}.m4a`)
  const pictures = RULES_FILES.map(f => `${f}.jpg`)
  const all = rulesLines({ dir: '/r', files: [...voices, ...pictures, 'README.md'], own: true }).join('\n')
  assert.ok(all.includes('Your recordings: 28 of 28 in.'))
  assert.ok(all.includes('Your own slides: 28 of 28 in. The film shows your own slides.'))
  const some = rulesLines({ dir: '/r', files: [...voices.slice(0, 20), ...pictures.slice(0, 5)], own: false }).join('\n')
  assert.ok(some.includes('Your recordings: 20 of 28 in. A slide with no recording shows in silence.'))
  assert.ok(some.includes('Your own slides: 5 of 28 in. The film shows drawn slides until all 28 are in.'))
  // the pictures were copied in by hand and the film was never told
  assert.ok(rulesLines({ dir: '/r', files: [...voices, ...pictures], own: false }).join('\n').includes('Run npm run rules-film again.'))
  assert.ok(rulesLines({ dir: '/r', files: null }).join('\n').includes('does not exist yet'))
})

// Handoff 11 Nov 2026, Media: "npm run media counts the stand-in tones as in. Make it say stand-in."
test('npm run media names the stand-in tones, Sir Irwin’s voice and the loud cue sounds, and no screen shows a crest any more', async () => {
  const { samplesFor, wavBytes } = await import('../make-placeholder-sounds.mjs').catch(() => ({}))
  // a file that is not a stand-in tone is never called one, whatever its name
  assert.deepEqual(standIns(['blackout.wav', 'chime-phone.wav'], () => Buffer.from('not a tone')), [])
  assert.deepEqual(standIns(null, () => null), [])
  assert.deepEqual(standIns(['chime-phone.wav'], () => { throw new Error('unreadable') }), [], 'a file that cannot be read is left alone')
  if (samplesFor && wavBytes) assert.deepEqual(standIns(['chime-phone.wav', 'blackout.wav'], f => (f === 'chime-phone.wav' ? wavBytes(samplesFor('chime-phone')) : Buffer.from('his own scream'))), ['chime-phone'])
  const made = madeLines({ voice: { files: ['irwin-slide-1.m4a', 'irwin-door.m4a', 'README.md', '.made.json'] }, web: { files: ['blackout.mp3', 'README.md'] } }).join('\n')
  assert.ok(made.includes('Sir Irwin\'s voice for the drawing (npm run irwin-voice): 2 of 8 in. A slide with no voice turns in silence, on time.'))
  assert.ok(made.includes('(npm run web-sounds): 1 in.'))
  const all = report({ media: { dir: '/m', files: [] }, video: { dir: '/v', files: [] }, loops: { dir: '/l', files: [] }, household: { file: '/s.jpg', there: true }, standIn: ['chime-news'], voice: { files: [] }, web: { files: [] } }).join('\n')
  assert.ok(all.includes('Still stand-in tones, not real sounds: chime-news.'))
  assert.ok(all.includes('a screen with no loop shows its room\'s splash, with its cat') && !/crest/.test(all), 'no screen shows a crest any more')
  assert.ok(all.includes('6. Sydney\'s photo (the dedication in the credits)') && all.includes('PANIC to stop it all') && !/Credits\)/.test(all), 'the night ends on jazz: no credits playlist')
})
