#!/usr/bin/env node
// npm run media-import: Jon's one folder of exports, sorted into the game.
//
//   npm run media-import                      (the folder media-in/ in the repo)
//   npm run media-import -- "/path/to/folder"
//
// Jon, 11 Nov 2026: "I would like to just put the folder in the repo and you
// move it and see if anything is missing." The originals are never changed or
// moved: every file is copied, and remade only when the original is newer.
//
//   *.mp4, *.mov                 → play/public/video/<name>.mp4, 1080p for the house wifi
//   woof-close-name-<id>.*       → woof-close-murderer-<id>.mp4 and woof-close-ghost-<id>.mp4:
//                                  the still card (play/public/reveal/) with the clip's own sound
//   bulletin2-*.wav, newsflash-*.wav, woof-close-*.wav, the nine cue sounds
//                                → media/ on the brain, one second of silence first
//   living|study|memory|bedroom|boo|orangerie.mp4|mov → play/public/loops/
//   Irwin portrait.png           → play/public/Irwin Framed.png
//   sydney.jpg                   → play/public/household/sydney.jpg
//   anything else                → listed, and left where it is
//
// Then it runs the media check. Not sealed: the names are the open banks' own.
// Needs ffmpeg (brew install ffmpeg).

import { existsSync, readdirSync, statSync, mkdirSync, copyFileSync, renameSync, readFileSync } from 'node:fs'
import { dirname, join, resolve, extname, basename } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFileSync, spawnSync } from 'node:child_process'
import { SOUND_IDS, CLIP_IDS } from '../cues/lib/cues.js'
import { LOOPS, OPTIONAL_LOOPS, mediaDir } from './media-check.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const root = join(here, '..')
const VIDEO = join(root, 'play', 'public', 'video')
const LOOPS_DIR = join(root, 'play', 'public', 'loops')
const REVEAL = join(root, 'play', 'public', 'reveal')
const NAME = 'woof-close-name-'
const RENAME = { Sirwin_Intro: 'sirwin-intro' } // Jon's own name for the intro video

// What one file is, by its name. Pure, so a test can check it.
//   { kind: 'name', id } | { kind: 'video', id } | { kind: 'loop', id } | { kind: 'sound', id }
//   | { kind: 'portrait' } | { kind: 'sydney' } | { kind: 'skip', why } | { kind: 'other' }
export function sortOf(file) {
  const ext = extname(file).slice(1).toLowerCase()
  const stem = basename(file, extname(file))
  if (file.startsWith('.')) return { kind: 'skip', why: 'hidden' }
  if (/^irwin portrait$/i.test(stem) && ext === 'png') return { kind: 'portrait' }
  if (/^sydney$/i.test(stem) && ['jpg', 'jpeg'].includes(ext)) return { kind: 'sydney' }
  if (['mp4', 'mov', 'm4v'].includes(ext)) {
    const id = RENAME[stem] ?? stem.replace(/_\d+$/, '') // newsflash-bathroom_1: a second export of the same clip
    if ([...LOOPS, ...OPTIONAL_LOOPS].includes(id)) return { kind: 'loop', id }
    if (id.startsWith(NAME)) return { kind: 'name', id: id.slice(NAME.length) }
    if (/^[A-Za-z0-9-]+$/.test(id)) return { kind: 'video', id }
    return { kind: 'other' }
  }
  if (['wav', 'm4a', 'mp3', 'aiff'].includes(ext) && [...SOUND_IDS, ...CLIP_IDS].includes(stem)) return { kind: 'sound', id: stem, ext }
  return { kind: 'other' }
}

// Two exports of one clip (newsflash-bathroom.mp4 and newsflash-bathroom_1.mp4): keep the longer.
export function pickLongest(entries) {
  const best = new Map()
  for (const e of entries) {
    const k = `${e.kind}:${e.id}`
    if (!best.has(k) || e.seconds > best.get(k).seconds) best.set(k, e)
  }
  return [...best.values()]
}

const seconds = f => {
  try { return parseFloat(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f]).toString()) || 0 } catch { return 0 }
}
const stale = (src, out) => !existsSync(out) || statSync(out).mtimeMs < statSync(src).mtimeMs
function ffmpeg(args, out) {
  const tmp = `${out}.tmp${extname(out)}`
  const r = spawnSync('ffmpeg', ['-nostdin', '-v', 'error', '-y', ...args, tmp], { stdio: ['ignore', 'ignore', 'pipe'] })
  if (r.status !== 0) return false
  renameSync(tmp, out)
  return true
}
const WEB = ['-c:v', 'libx264', '-preset', 'medium', '-profile:v', 'high', '-c:a', 'aac', '-b:a', '160k', '-ar', '48000', '-ac', '2', '-movflags', '+faststart']

function main() {
  const src = resolve(process.argv[2] ?? join(root, 'media-in'))
  if (!existsSync(src)) { console.log(`No folder at ${src}. Put your exports in a folder called media-in in the repo, or give the folder's path.`); process.exit(1) }
  if (spawnSync('ffmpeg', ['-version'], { stdio: 'ignore' }).status !== 0) { console.log('ffmpeg is not installed. Run: brew install ffmpeg'); process.exit(1) }
  const envPath = join(root, 'cues', '.env')
  const MEDIA = mediaDir(existsSync(envPath) ? readFileSync(envPath, 'utf8') : '')
  for (const d of [VIDEO, LOOPS_DIR, MEDIA]) mkdirSync(d, { recursive: true })

  const files = readdirSync(src).filter(f => statSync(join(src, f)).isFile())
  const sorted = files.map(f => ({ file: f, path: join(src, f), ...sortOf(f) }))
  const timed = sorted.filter(e => ['video', 'name', 'loop'].includes(e.kind)).map(e => ({ ...e, seconds: seconds(e.path) }))
  const keep = pickLongest(timed)
  const dropped = timed.filter(e => !keep.includes(e)).map(e => e.file)
  const count = { made: 0, kept: 0, failed: [] }
  const run = (ok, name) => { if (ok === null) count.kept++; else if (ok) count.made++; else count.failed.push(name) }

  console.log(`Sorting ${files.length} files from ${src}. The originals stay where they are.`)
  for (const e of keep) {
    if (e.kind === 'video') {
      const out = join(VIDEO, `${e.id}.mp4`)
      run(stale(e.path, out) ? ffmpeg(['-i', e.path, '-map', '0:v:0', '-map', '0:a:0?', '-vf', 'scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2,fps=30,format=yuv420p', '-crf', '21', ...WEB], out) : null, e.file)
    } else if (e.kind === 'loop') {
      const out = join(LOOPS_DIR, `${e.id}.mp4`)
      run(stale(e.path, out) ? ffmpeg(['-i', e.path, '-map', '0:v:0', '-an', '-vf', 'scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2,fps=30,format=yuv420p', '-c:v', 'libx264', '-preset', 'medium', '-crf', '24', '-movflags', '+faststart'], out) : null, e.file)
    } else if (e.kind === 'name') {
      for (const role of ['murderer', 'ghost']) {
        const still = join(REVEAL, role, `${e.id}.jpg`)
        const out = join(VIDEO, `woof-close-${role}-${e.id}.mp4`)
        if (!existsSync(still)) { count.failed.push(`${e.file} (no still card at play/public/reveal/${role}/${e.id}.jpg)`); continue }
        run(stale(e.path, out) || stale(still, out) ? ffmpeg(['-loop', '1', '-framerate', '30', '-i', still, '-i', e.path, '-map', '0:v', '-map', '1:a:0', '-t', String(e.seconds), '-vf', 'scale=1920:1080,format=yuv420p', '-crf', '20', '-tune', 'stillimage', ...WEB], out) : null, e.file)
      }
    }
  }
  for (const e of sorted) {
    if (e.kind === 'sound') {
      const out = join(MEDIA, `${e.id}.wav`)
      run(stale(e.path, out) ? ffmpeg(['-i', e.path, '-af', 'adelay=1000:all=1', '-c:a', 'pcm_s16le'], out) : null, e.file)
    } else if (e.kind === 'portrait') {
      const out = join(root, 'play', 'public', 'Irwin Framed.png')
      if (stale(e.path, out)) { copyFileSync(e.path, out); count.made++ } else count.kept++
    } else if (e.kind === 'sydney') {
      const out = join(root, 'play', 'public', 'household', 'sydney.jpg')
      if (stale(e.path, out)) { copyFileSync(e.path, out); count.made++ } else count.kept++
    }
  }
  const other = sorted.filter(e => e.kind === 'other').map(e => e.file)
  console.log(`Made or replaced: ${count.made}. Already up to date: ${count.kept}.`)
  if (dropped.length) console.log(`Two exports of the same clip, the shorter left out: ${dropped.join(', ')}`)
  if (count.failed.length) console.log(`COULD NOT BE MADE: ${count.failed.join(', ')}`)
  if (other.length) console.log(`Not the game's (left where they are): ${other.length} files, for example ${other.slice(0, 3).join(', ')}`)
  console.log('')
  spawnSync(process.execPath, [join(here, 'media-check.mjs')], { stdio: 'inherit' })
  console.log('\nIf a closing clip changed length, tell Claude Code: the lengths in seed/woof-news.json are set by hand from the files.')
  process.exit(count.failed.length ? 1 : 0)
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main()
