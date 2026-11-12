#!/usr/bin/env node
// npm run web-sounds: the nine cue sounds from media/ (the brain's copies, one
// second of silence first) made into the site's copies in play/public/sound/,
// for the room screens and the phones to play themselves (handoff 11 Nov 2026,
// A2 layer 1: "the screens and phones are speakers").
//
// Each copy: the silence in front cut off, made loud (loudness to -14 LUFS,
// peaks under -1 dB), an mp3. `npm run media-import` runs this too.
//
// Left out, on purpose:
//   - every W-O-O-F News recording (bulletin2-*, newsflash-*, woof-close-*):
//     those stay on the brain, which speaks them under codes (the seal);
//   - a stand-in tone (a file scripts/make-placeholder-sounds.mjs wrote): the
//     screens' own fuller sound made in code (play/src/lib/cueSounds.js
//     CUE_FIGURES) is better than a thin tone, so no copy is made, and an old
//     copy made from a stand-in is removed.
// play/public/sound/* is not kept in git (like the videos): a publish from the
// main folder on the brain carries them.
//
// Plays nothing: ffmpeg only reads and writes files.

import { existsSync, readdirSync, readFileSync, statSync, mkdirSync, renameSync, unlinkSync } from 'node:fs'
import { dirname, join, extname, basename } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'
import { SOUND_IDS, CLIP_IDS } from '../cues/lib/cues.js'
import { samplesFor, wavBytes } from './make-placeholder-sounds.mjs'
import { mediaDir } from './media-check.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const root = join(here, '..')
export const WEB_SOUND_DIR = join(root, 'play', 'public', 'sound')
export const SOURCE_ENDINGS = ['wav', 'm4a', 'mp3', 'aiff']

// The ffmpeg filter for one copy: the silence in front off, then loud.
export const WEB_FILTER = 'silenceremove=start_periods=1:start_duration=0:start_threshold=-50dB,loudnorm=I=-14:TP=-1:LRA=11'
export const WEB_ARGS = ['-af', WEB_FILTER, '-ar', '44100', '-c:a', 'libmp3lame', '-b:a', '192k']

// Is this file a stand-in tone, byte for byte?
export function isStandIn(id, bytes) {
  if (!bytes) return false
  const tone = wavBytes(samplesFor(id))
  return bytes.length === tone.length && Buffer.compare(Buffer.from(bytes), tone) === 0
}

// What to do with media/'s files: { make: [{ id, file }], standIns: [id], missing: [id] }.
// Only the nine cue ids; never a recording. Pure (given the file list and a reader), so a test can check it.
export function webSoundPlan(files = [], read = () => null) {
  const make = []
  const standIns = []
  const missing = []
  for (const id of SOUND_IDS) {
    if (CLIP_IDS.includes(id)) continue
    const file = SOURCE_ENDINGS.map(e => `${id}.${e}`).find(f => files.includes(f))
    if (!file) { missing.push(id); continue }
    if (file.endsWith('.wav') && isStandIn(id, read(file))) { standIns.push(id); continue }
    make.push({ id, file })
  }
  return { make, standIns, missing }
}

export function writeWebSounds({ media, out = WEB_SOUND_DIR, log = console.log } = {}) {
  if (!media || !existsSync(media)) { log('Web sounds: no media folder, so none made.'); return { made: 0, kept: 0, failed: [] } }
  mkdirSync(out, { recursive: true })
  const files = readdirSync(media)
  const plan = webSoundPlan(files, f => readFileSync(join(media, f)))
  const count = { made: 0, kept: 0, failed: [] }
  for (const id of plan.standIns) {
    const old = join(out, `${id}.mp3`)
    if (existsSync(old)) unlinkSync(old)
  }
  for (const { id, file } of plan.make) {
    const src = join(media, file)
    const dest = join(out, `${id}.mp3`)
    if (existsSync(dest) && statSync(dest).mtimeMs >= statSync(src).mtimeMs) { count.kept++; continue }
    const tmp = `${dest}.tmp${extname(dest)}`
    const r = spawnSync('ffmpeg', ['-nostdin', '-v', 'error', '-y', '-i', src, ...WEB_ARGS, tmp], { stdio: ['ignore', 'ignore', 'pipe'] })
    if (r.status === 0) { renameSync(tmp, dest); count.made++ } else count.failed.push(basename(file))
  }
  log(`Web sounds (play/public/sound/): ${count.made} made, ${count.kept} up to date${plan.standIns.length ? `, ${plan.standIns.length} stand-in tones left out (the screens make a fuller sound for those)` : ''}${plan.missing.length ? `, ${plan.missing.length} with no file in media/` : ''}.`)
  if (count.failed.length) log(`COULD NOT BE MADE: ${count.failed.join(', ')}`)
  return count
}

function main() {
  if (spawnSync('ffmpeg', ['-version'], { stdio: 'ignore' }).status !== 0) { console.log('ffmpeg is not installed. Run: brew install ffmpeg'); process.exit(1) }
  const envPath = join(root, 'cues', '.env')
  const media = mediaDir(existsSync(envPath) ? readFileSync(envPath, 'utf8') : '')
  const r = writeWebSounds({ media })
  process.exit(r.failed.length ? 1 : 0)
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main()
