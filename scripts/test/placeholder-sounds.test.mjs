import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, existsSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { makePlaceholders, samplesFor, wavBytes, FIGURES, RATE, PAD_SECONDS } from '../make-placeholder-sounds.mjs'
import { SOUND_IDS, missingSoundFiles } from '../../cues/lib/cues.js'

test('one file per id, each a WAV with a second of silence in front, and nothing missing afterwards', () => {
  const dir = mkdtempSync(join(tmpdir(), 'murderwin-sounds-'))
  try {
    const r = makePlaceholders({ dir })
    assert.deepEqual(r, { written: SOUND_IDS.length, kept: 0, total: SOUND_IDS.length })
    assert.deepEqual(missingSoundFiles(dir, existsSync), [])
    for (const id of SOUND_IDS) {
      const bytes = readFileSync(join(dir, `${id}.wav`))
      assert.equal(bytes.toString('ascii', 0, 4), 'RIFF')
      assert.equal(bytes.toString('ascii', 8, 12), 'WAVE')
      assert.equal(bytes.readUInt32LE(24), RATE)
      // the pad: every sample in the first second is silence
      const pad = RATE * PAD_SECONDS
      for (let i = 0; i < pad; i++) assert.equal(bytes.readInt16LE(44 + i * 2), 0)
      // and then there is sound
      let loud = 0
      const n = (bytes.length - 44) / 2
      for (let i = pad; i < Math.min(n, pad + RATE); i++) if (Math.abs(bytes.readInt16LE(44 + i * 2)) > 1000) loud++
      assert.ok(loud > 100, `${id} has a tone after the pad`)
    }
    // a second run keeps what is there; --force rewrites
    assert.deepEqual(makePlaceholders({ dir }), { written: 0, kept: SOUND_IDS.length, total: SOUND_IDS.length })
    assert.equal(makePlaceholders({ dir, force: true }).written, SOUND_IDS.length)
  } finally { rmSync(dir, { recursive: true, force: true }) }
})

test('every id has its own figure, and the figures differ', () => {
  for (const id of SOUND_IDS) assert.ok(FIGURES[id], `${id} has a figure`)
  const seen = new Set(Object.values(FIGURES).map(f => JSON.stringify(f)))
  assert.equal(seen.size, SOUND_IDS.length)
  assert.ok(wavBytes(samplesFor('power')).length > 44 + RATE * 2)
})

test('chime-phone, the tenth sound, has its own short stand-in: under a second after the pad', () => {
  assert.equal(SOUND_IDS.length, 10)
  assert.ok(SOUND_IDS.includes('chime-phone'))
  const figure = FIGURES['chime-phone']
  assert.ok(figure, 'a figure of its own')
  const seconds = figure.reduce((s, [, d]) => s + d, 0)
  assert.ok(seconds > 0.2 && seconds < 1, 'short: a chime, not a tune')
  for (const [id, f] of Object.entries(FIGURES)) if (id !== 'chime-phone') assert.notDeepEqual(f, figure, `not the same as ${id}`)
  const samples = samplesFor('chime-phone')
  assert.equal(samples.length, Math.round(RATE * (PAD_SECONDS + seconds + 0.2)))
})

test('the script prints counts and PASS only', () => {
  const dir = mkdtempSync(join(tmpdir(), 'murderwin-sounds-'))
  try {
    const r = spawnSync(process.execPath, [fileURLToPath(new URL('../make-placeholder-sounds.mjs', import.meta.url)), '--dir', dir], { encoding: 'utf8' })
    assert.equal(r.status, 0, r.stderr)
    const lines = r.stdout.trim().split('\n')
    assert.equal(lines.length, 2)
    assert.match(lines[0], /^Placeholder sounds: \d+ written, \d+ already had a file, \d+ in the catalogue/)
    assert.equal(lines[1], 'PASS')
  } finally { rmSync(dir, { recursive: true, force: true }) }
})
