#!/usr/bin/env node
// Stand-in sounds: one short tone per id in the catalogue, so the whole
// AirPlay chain (the cue relay, afplay, the speaker group) can be tested
// before Jon records anything. Each file starts with one second of silence
// (the pad rule: AirPlay takes a moment to spin up and would eat the start),
// then a different little figure per id, so you can tell them apart by ear.
//
//   node scripts/make-placeholder-sounds.mjs            writes media/<id>.wav for every id with no file
//   node scripts/make-placeholder-sounds.mjs --force    rewrites the stand-ins even where a file exists
//   node scripts/make-placeholder-sounds.mjs --dir X    another folder
//
// Prints counts only. Replace a stand-in by dropping a real recording with
// the same id (any of .m4a .mp3 .wav .aiff) into media/ and deleting the .wav.

import { mkdirSync, writeFileSync, existsSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { SOUND_IDS, soundCandidates } from '../cues/lib/cues.js'

const here = dirname(fileURLToPath(import.meta.url))
const args = process.argv.slice(2)
const FORCE = args.includes('--force')
const dirArg = args.indexOf('--dir')
const DIR = resolve(here, dirArg >= 0 ? args[dirArg + 1] : '../media')

export const RATE = 22050
export const PAD_SECONDS = 1

// A different figure per id: notes (Hz) and the length of each, in seconds.
export const FIGURES = {
  'chime-news': [[880, 0.18], [1174, 0.18], [1318, 0.4]],
  'sounder-bulletin': [[523, 0.25], [523, 0.25], [523, 0.25], [659, 0.6]],
  'chime-irwin': [[1046, 0.12], [1318, 0.12], [1568, 0.12], [2093, 0.5]],
  'sting-solved': [[659, 0.15], [784, 0.15], [1046, 0.5]],
  'sting-door': [[392, 0.3], [330, 0.3], [262, 0.7]],
  'sting-reveal': [[440, 0.2], [440, 0.2], [440, 0.2], [349, 0.9]],
  'sting-result': [[784, 0.15], [1046, 0.15], [1318, 0.15], [1568, 0.45]],
  blackout: [[220, 0.8], [165, 1.0]],
  power: [[165, 0.3], [220, 0.3], [330, 0.3], [440, 0.6]],
}

// Mono 16-bit PCM samples for one figure, padded with silence in front.
export function samplesFor(id, { rate = RATE, pad = PAD_SECONDS } = {}) {
  const figure = FIGURES[id] ?? [[440, 0.4]]
  const total = Math.round(rate * (pad + figure.reduce((s, [, d]) => s + d, 0) + 0.2))
  const out = new Int16Array(total)
  let i = Math.round(rate * pad)
  for (const [hz, dur] of figure) {
    const n = Math.round(rate * dur)
    for (let k = 0; k < n && i < total; k++, i++) {
      const t = k / rate
      const env = Math.min(1, k / (rate * 0.01)) * Math.min(1, (n - k) / (rate * 0.06)) // a soft start and a soft end
      out[i] = Math.round(Math.sin(2 * Math.PI * hz * t) * 0.35 * env * 32767)
    }
  }
  return out
}

export function wavBytes(samples, rate = RATE) {
  const data = Buffer.from(samples.buffer, samples.byteOffset, samples.byteLength)
  const header = Buffer.alloc(44)
  header.write('RIFF', 0); header.writeUInt32LE(36 + data.length, 4); header.write('WAVE', 8)
  header.write('fmt ', 12); header.writeUInt32LE(16, 16); header.writeUInt16LE(1, 20); header.writeUInt16LE(1, 22)
  header.writeUInt32LE(rate, 24); header.writeUInt32LE(rate * 2, 28); header.writeUInt16LE(2, 32); header.writeUInt16LE(16, 34)
  header.write('data', 36); header.writeUInt32LE(data.length, 40)
  return Buffer.concat([header, data])
}

export function makePlaceholders({ dir, force = false, exists = existsSync, write = writeFileSync, mkdir = mkdirSync } = {}) {
  mkdir(dir, { recursive: true })
  let written = 0, kept = 0
  for (const id of SOUND_IDS) {
    const have = soundCandidates(dir, id).find(f => exists(f))
    if (have && !force) { kept++; continue }
    write(join(dir, `${id}.wav`), wavBytes(samplesFor(id)))
    written++
  }
  return { written, kept, total: SOUND_IDS.length }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const r = makePlaceholders({ dir: DIR, force: FORCE })
  console.log(`Placeholder sounds: ${r.written} written, ${r.kept} already had a file, ${r.total} in the catalogue, folder ${DIR}`)
  console.log(r.written + r.kept === r.total ? 'PASS' : 'FAIL')
}
