// The rules film's recordings (handoff 11 Nov 2026, A14): Jon's 28 narration
// files, one a slide (docs/rules-voiceover-manifest.md), made ready for the
// Parlour TV.
//
//   npm run rules-film -- "/path/to/FINAL EXPORTS"
//
// For each of the 28 names it finds the file in that folder (.wav, .m4a, .mp3
// or .aif), trims the quiet at each end, evens the loudness (so no slide is
// quieter than the last), and writes play/public/rules/<name>.m4a. It measures
// each one and the intro video and writes play/src/lib/rules-film.json, the
// lengths the film's clock runs on. The originals are never touched. Nothing
// is played: ffmpeg reads and writes files.
//
// Every recording plays whole (Jon, 12 Nov 2026: "Do not change the rule
// cards!" ... "The 28 slides and VO."). On 11 Nov the film stopped rule 25
// early, at the pause before its last two sentences; that cut is gone. The
// machinery for a cut stays (CUTS, cutPoint), empty, in case Jon ever asks
// for one.
//
// THE PICTURES ARE JON'S OWN SLIDES (12 Nov 2026: "Do not change the rule
// cards!"). Each recording plays over the slide he made for it, as a picture:
// play/public/rules/<name>.jpg, 1920 by 1080, not in git. They come from his
// rules deck. If the folder (or the one above it) holds the deck as a PDF with
// exactly 28 pages, each page becomes its slide's picture (pdftoppm). On 12
// Nov the PDF in his exports folder was an older copy with 27 pages, so the
// pictures were drawn from the deck's own 28 slide files instead, exactly as
// written. Never reword, restyle or reorder them. The lengths file says
// whether all 28 pictures are in (`pictures`); until they are, the film falls
// back to the slides drawn in code.
//
// It prints names, lengths and counts. Nothing here is sealed.
import { existsSync, mkdirSync, readdirSync, statSync, writeFileSync, readFileSync } from 'node:fs'
import { join, dirname, basename, extname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'
import { RULES_SLIDES } from '../play/src/lib/rulesfilm.js'

const here = dirname(fileURLToPath(import.meta.url))
const root = join(here, '..')
export const RULES_DIR = join(root, 'play', 'public', 'rules')
export const LENGTHS_JSON = join(root, 'play', 'src', 'lib', 'rules-film.json')
const INTRO = join(root, 'play', 'public', 'video', 'sirwin-intro.mp4')
const KINDS = ['.wav', '.m4a', '.mp3', '.aif', '.aiff']

// Where a recording is stopped early: seconds into the ORIGINAL file, at the
// start of the pause before the cut sentence; `near` is how far the pause may
// have moved in a retake before the script stops trusting it. Empty: nothing
// of Jon's is cut (12 Nov 2026).
export const CUTS = {}

export const RULES_FILES = RULES_SLIDES.map(s => s.file)

// Every file under `folder`, two levels deep, by its name without the ending.
export function findRecordings(folder, names = RULES_FILES) {
  const found = {}
  const walk = (dir, depth) => {
    let entries = []
    try { entries = readdirSync(dir, { withFileTypes: true }) } catch { return }
    for (const e of entries) {
      const p = join(dir, e.name)
      if (e.isDirectory()) { if (depth < 2 && !e.name.startsWith('.')) walk(p, depth + 1); continue }
      const ext = extname(e.name).toLowerCase()
      const name = basename(e.name, extname(e.name))
      if (!KINDS.includes(ext) || !names.includes(name)) continue
      // two copies of one name: the newest wins (a retake replaces the file with the same name)
      if (!found[name] || statSync(p).mtimeMs > statSync(found[name]).mtimeMs) found[name] = p
    }
  }
  walk(folder, 0)
  return found
}

function run(bin, args) {
  const r = spawnSync(bin, args, { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 })
  return { ok: r.status === 0, out: `${r.stdout ?? ''}${r.stderr ?? ''}` }
}
export function secondsOf(file) {
  const r = run('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file])
  return r.ok ? Number(r.out.trim()) || 0 : 0
}
// The pauses in a recording: [{ start, end }], in seconds.
export function pausesOf(file) {
  const r = run('ffmpeg', ['-hide_banner', '-nostats', '-i', file, '-af', 'silencedetect=noise=-38dB:d=0.22', '-f', 'null', '-'])
  const starts = [...r.out.matchAll(/silence_start: ([\d.]+)/g)].map(m => Number(m[1]))
  const ends = [...r.out.matchAll(/silence_end: ([\d.]+)/g)].map(m => Number(m[1]))
  return starts.map((start, i) => ({ start, end: ends[i] ?? start }))
}
// Where to stop a recording that has a cut: the start of the pause nearest the
// written time, a little into it, or null when no pause is near (a retake).
export function cutPoint(pauses, cut) {
  if (!cut) return null
  const near = pauses.filter(p => Math.abs(p.start - cut.at) <= cut.near && p.end - p.start >= 0.5)
  if (!near.length) return null
  const best = near.reduce((a, b) => (Math.abs(a.start - cut.at) <= Math.abs(b.start - cut.at) ? a : b))
  return +(best.start + 0.3).toFixed(2)
}

// Trim the quiet at each end, stop early where asked, even the loudness, and write a small file a browser plays.
function convert(src, out, stopAt) {
  const trim = 'silenceremove=start_periods=1:start_threshold=-50dB:start_silence=0.08'
  const filters = [...(stopAt ? [`atrim=end=${stopAt}`] : []), trim, 'areverse', trim, 'areverse', 'loudnorm=I=-16:TP=-1.5:LRA=11']
  const args = ['-hide_banner', '-loglevel', 'error', '-y', '-i', src, '-af', filters.join(','), '-ac', '1', '-ar', '48000', '-c:a', 'aac', '-b:a', '128k', '-movflags', '+faststart', out]
  return run('ffmpeg', args)
}

// The deck as a PDF, in the folder or the one above it: the newest whose name speaks of rules.
export function findDeckPdf(folder) {
  const found = []
  for (const dir of [folder, join(folder, '..')]) {
    let names = []
    try { names = readdirSync(dir) } catch { continue }
    for (const n of names) if (/\.pdf$/i.test(n) && /rule/i.test(n) && !/script/i.test(n)) found.push(join(dir, n))
  }
  return found.sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs)[0] ?? null
}
export function pdfPages(file) {
  const r = run('pdfinfo', [file])
  return r.ok ? Number(/Pages:\s+(\d+)/.exec(r.out)?.[1]) || 0 : 0
}
// Each page of a 28-page deck becomes its slide's picture. Returns how many were written.
function slidesFromPdf(pdf, dir) {
  let made = 0
  RULES_FILES.forEach((name, i) => {
    const base = join(dir, name)
    const r = run('pdftoppm', ['-f', String(i + 1), '-l', String(i + 1), '-singlefile', '-jpeg', '-jpegopt', 'quality=90', '-scale-to-x', '1920', '-scale-to-y', '1080', pdf, base])
    if (r.ok && existsSync(`${base}.jpg`)) made += 1
  })
  return made
}
// How many of the 28 slide pictures are in.
export function slidePictures(dir = RULES_DIR) {
  return RULES_FILES.filter(name => existsSync(join(dir, `${name}.jpg`))).length
}

export function importRules(folder, { dir = RULES_DIR, json = LENGTHS_JSON, log = console.log } = {}) {
  if (!existsSync(folder)) throw new Error(`No folder at ${folder}`)
  mkdirSync(dir, { recursive: true })
  const found = findRecordings(folder)
  const lengths = { intro: 0, slides: {} }
  const missing = []
  const notes = []
  for (const name of RULES_FILES) {
    const src = found[name]
    if (!src) { missing.push(name); continue }
    let stopAt = null
    if (CUTS[name]) {
      stopAt = cutPoint(pausesOf(src), CUTS[name])
      notes.push(stopAt
        ? `${name}: stopped at ${stopAt} s of ${secondsOf(src).toFixed(1)} s (${CUTS[name].why})`
        : `${name}: NO PAUSE FOUND near ${CUTS[name].at} s, left whole. It still speaks of ${CUTS[name].why}. Tell Jon.`)
    }
    const out = join(dir, `${name}.m4a`)
    const r = convert(src, out, stopAt)
    if (!r.ok) { notes.push(`${name}: could not be converted`); missing.push(name); continue }
    lengths.slides[name] = +secondsOf(out).toFixed(2)
  }
  lengths.intro = existsSync(INTRO) ? +secondsOf(INTRO).toFixed(2) : 0
  // keep the lengths of recordings that are already in when this run was given a folder without them
  let before = {}
  try { before = JSON.parse(readFileSync(json, 'utf8')) } catch { /* the first run */ }
  for (const name of RULES_FILES) {
    if (lengths.slides[name] == null && existsSync(join(dir, `${name}.m4a`)) && before?.slides?.[name]) lengths.slides[name] = before.slides[name]
  }
  if (!lengths.intro && before?.intro) lengths.intro = before.intro
  // Jon's own slides: from the deck's PDF when it has all 28 pages, else whatever pictures are already in
  const pdf = findDeckPdf(folder)
  const pages = pdf ? pdfPages(pdf) : 0
  if (pdf && pages === RULES_FILES.length) notes.push(`slides: ${slidesFromPdf(pdf, dir)} of ${RULES_FILES.length} drawn from ${basename(pdf)}`)
  else if (pdf) notes.push(`slides: ${basename(pdf)} has ${pages} pages, not ${RULES_FILES.length}, so it was not used (an older copy of the deck?)`)
  const pictures = slidePictures(dir)
  lengths.pictures = pictures === RULES_FILES.length
  writeFileSync(json, `${JSON.stringify(lengths, null, 2)}\n`)
  const total = Object.values(lengths.slides).reduce((a, b) => a + b, 0)
  log(`The rules film: ${Object.keys(lengths.slides).length} of ${RULES_FILES.length} recordings in, ${Math.round(total)} seconds of voice.`)
  log(`The intro video: ${lengths.intro ? `${lengths.intro} seconds` : 'not in play/public/video (the film still plays, after 112 seconds)'}.`)
  log(lengths.pictures ? `The slides: Jon's own, ${pictures} of ${RULES_FILES.length} pictures in.` : `The slides: ${pictures} of ${RULES_FILES.length} of Jon's own are in, so the film shows the slides drawn in code until all are.`)
  for (const n of notes) log(`  ${n}`)
  if (missing.length) log(`  Missing (each plays as a silent slide): ${missing.join(', ')}`)
  log('Then: npm run deploy:site from this folder (the recordings are not in git).')
  return { lengths, missing, notes }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const folder = process.argv[2]
  if (!folder) { console.error('Say which folder holds the recordings:  npm run rules-film -- "/path/to/FINAL EXPORTS"'); process.exit(2) }
  try { importRules(folder) } catch (e) { console.error(e.message); process.exit(1) }
}
