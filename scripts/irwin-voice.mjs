// Sir Irwin's voice for the drawing's slides (handoff 11 Nov 2026, A7 step 3;
// Jon: "Can I get a voiceover made for those slides?").
//
//   npm run irwin-voice                 make the eight files, measure them
//   npm run irwin-voice -- --voice "Samantha"   with this voice instead
//
// It reads Sir Irwin's words from seed/irwin-lines.json (the same list the
// Parlour TV shows, so the voice and the screen cannot drift apart) and, for
// each line, makes play/public/voice/<id>.m4a with the best English voice
// this Mac has (`say -v <voice> -o <file>`: writing to a file plays nothing),
// evens the loudness, measures it, and writes the lengths to
// seed/irwin-voice.json, which IS in git: the server's clock runs on it.
//
// Jon's own recordings win, always. A file in play/public/voice/ that this
// command did not make (its marker, play/public/voice/.made.json, says which
// ones it made) is never overwritten: it is measured and kept. A recording
// dropped in as <id>.wav, .mp3, .aif or .aiff becomes the .m4a (loudness
// evened) and from then on counts as his. A line whose words changed is made
// again, unless it is his.
//
// Nothing is played, nothing is sealed. It prints names, the voice and lengths.
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync, rmSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'
import { wordsKey } from '../functions/lib/slide-voice.js'

const here = dirname(fileURLToPath(import.meta.url))
const root = join(here, '..')
export const VOICE_DIR = join(root, 'play', 'public', 'voice')
export const LINES_JSON = join(root, 'seed', 'irwin-lines.json')
export const LENGTHS_JSON = join(root, 'seed', 'irwin-voice.json')
export const MARKER = '.made.json'
const RECORDING_KINDS = ['.wav', '.mp3', '.aif', '.aiff']
const RATE = 185 // words a minute: a bright, brisk dog

// ---- the pure parts (scripts/test/irwin-voice.test.mjs) ----

// Every line, in order: the seven slides, then the door.
export function linesOf(file) {
  return [...(file?.slides ?? []), ...(file?.door ? [file.door] : [])].filter(l => l?.id && l?.text)
}

// `say -v '?'`: one voice a line, "Name   en_US   # Hello! My name is Name."
export function parseVoices(listing) {
  return String(listing ?? '').split('\n').map(line => {
    const m = /^(.+?)\s+([a-z]{2,3}_[A-Za-z0-9]+)\s+#/.exec(line)
    return m ? { name: m[1].trim(), locale: m[2] } : null
  }).filter(Boolean)
}

// The voices for a bright, friendly Sir Irwin when no Premium or Enhanced one is installed, best first.
export const GOOD_STANDARD = ['Eddy (English (US))', 'Reed (English (US))', 'Samantha', 'Daniel', 'Karen', 'Moira', 'Tessa', 'Alex']
const ENGLISH = ['en_US', 'en_GB', 'en_AU', 'en_IE', 'en_CA', 'en_NZ', 'en_ZA', 'en_IN']
// The best English voice: Premium, then Enhanced (American first), then a good standard one.
export function pickVoice(voices, asked = null) {
  if (asked) return voices.find(v => v.name.toLowerCase() === String(asked).toLowerCase())?.name ?? null
  const english = voices.filter(v => ENGLISH.includes(v.locale))
  const rank = v => ENGLISH.indexOf(v.locale)
  for (const tier of [/\(Premium\)/i, /\(Enhanced\)/i]) {
    const found = english.filter(v => tier.test(v.name)).sort((a, b) => rank(a) - rank(b))
    if (found.length) return found[0].name
  }
  for (const name of GOOD_STANDARD) if (english.some(v => v.name === name)) return name
  return english[0]?.name ?? null
}

// What `say` is given: the words on the screen, with a shouted word (THEN, BIG) in plain letters so it is
// said, not spelled.
export function spokenText(text) {
  return String(text ?? '').replace(/\b[A-Z]{2,}\b/g, w => w.toLowerCase())
}

// What to do with one line's file:
//   'own'      the .m4a is there and this command did not make it: Jon's. Keep it, measure it.
//   'convert'  a recording of Jon's (.wav and the rest) is newer than the .m4a, or there is no .m4a yet
//   'say'      no file yet, or one this command made from words that have since changed
//   'keep'     one this command made from these very words
// m4a: { hash, mtime } or null; made: the marker's row for it or null; recording: { mtime } or null.
export function decide({ m4a = null, made = null, recording = null, words }) {
  const ours = !!(m4a && made && made.hash === m4a.hash)
  if (m4a && !ours) return 'own' // never overwrite what this command did not make
  if (recording && (!m4a || recording.mtime > m4a.mtime || made?.from === 'say')) return 'convert'
  if (!m4a) return 'say'
  if (made.from === 'say' && made.words !== words) return 'say'
  return 'keep'
}

// The lengths file: { voice, lines: { id: { seconds, words, by } } }, only for lines with a file.
export function lengthsFile(voice, rows) {
  const lines = {}
  for (const r of rows) if (r.seconds > 0) lines[r.id] = { seconds: +r.seconds.toFixed(2), words: r.words, by: r.by }
  return { voice: voice ?? null, lines }
}

// ---- the Mac's parts ----

function run(bin, args) {
  const r = spawnSync(bin, args, { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 })
  return { ok: r.status === 0, out: `${r.stdout ?? ''}${r.stderr ?? ''}` }
}
const has = bin => run('which', [bin]).ok
const hashOf = file => createHash('sha1').update(readFileSync(file)).digest('hex')
export function secondsOf(file) {
  if (has('ffprobe')) {
    const r = run('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file])
    if (r.ok) return Number(r.out.trim()) || 0
  }
  const r = run('afinfo', [file]) // macOS's own, when there is no ffmpeg
  return r.ok ? Number(/estimated duration: ([\d.]+)/.exec(r.out)?.[1]) || 0 : 0
}
// Trim the quiet at each end, even the loudness, and write a small file a browser plays.
function toM4a(src, out) {
  if (has('ffmpeg')) {
    const trim = 'silenceremove=start_periods=1:start_threshold=-50dB:start_silence=0.05'
    const filters = [trim, 'areverse', trim, 'areverse', 'loudnorm=I=-16:TP=-1.5:LRA=11']
    return run('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-i', src, '-af', filters.join(','), '-ac', '1', '-ar', '48000', '-c:a', 'aac', '-b:a', '128k', '-movflags', '+faststart', out])
  }
  return run('afconvert', ['-f', 'm4af', '-d', 'aac', src, out]) // no ffmpeg: converted, loudness as said
}
function recordingOf(dir, id) {
  for (const ext of RECORDING_KINDS) {
    const p = join(dir, `${id}${ext}`)
    if (existsSync(p)) return { path: p, mtime: statSync(p).mtimeMs }
  }
  return null
}

export function makeVoice({ dir = VOICE_DIR, linesJson = LINES_JSON, lengthsJson = LENGTHS_JSON, asked = null, log = console.log } = {}) {
  const lines = linesOf(JSON.parse(readFileSync(linesJson, 'utf8')))
  const ids = lines.map(l => l.id)
  mkdirSync(dir, { recursive: true })
  const markerPath = join(dir, MARKER)
  let marker = {}
  try { marker = JSON.parse(readFileSync(markerPath, 'utf8')) } catch { /* the first run */ }
  const voice = pickVoice(parseVoices(run('say', ['-v', '?']).out), asked) // lists the voices; plays nothing
  if (asked && !voice) throw new Error(`No voice called "${asked}" on this Mac (say -v '?' lists them).`)
  const rows = []
  const notes = []
  for (const id of ids) {
    const line = lines.find(l => l.id === id)
    const words = wordsKey(line.text)
    const out = join(dir, `${id}.m4a`)
    const m4a = existsSync(out) ? { hash: hashOf(out), mtime: statSync(out).mtimeMs } : null
    const recording = recordingOf(dir, id)
    const what = decide({ m4a, made: marker[id] ?? null, recording, words })
    let by = marker[id]?.from === 'say' ? 'say' : 'recording'
    if (what === 'own') { by = 'recording'; delete marker[id] }
    if (what === 'convert') {
      if (!toM4a(recording.path, out).ok) { notes.push(`${id}: the recording could not be converted`); continue }
      by = 'recording'
      marker[id] = { hash: hashOf(out), from: 'recording', words }
    }
    if (what === 'say') {
      if (!voice) { notes.push(`${id}: no English voice on this Mac, so it stays silent`); continue }
      const tmp = join(tmpdir(), `irwin-voice-${process.pid}-${id}.aiff`)
      const said = run('say', ['-v', voice, '-r', String(RATE), '-o', tmp, spokenText(line.text)]) // -o: to a file, never aloud
      const made = said.ok && existsSync(tmp) && toM4a(tmp, out).ok
      try { rmSync(tmp, { force: true }) } catch { /* gone */ }
      if (!made) { notes.push(`${id}: could not be made`); continue }
      by = 'say'
      marker[id] = { hash: hashOf(out), from: 'say', words }
    }
    if (what === 'keep' && marker[id]) marker[id] = { ...marker[id], words: marker[id].from === 'recording' ? words : marker[id].words }
    rows.push({ id, seconds: existsSync(out) ? secondsOf(out) : 0, words, by, what })
  }
  writeFileSync(markerPath, `${JSON.stringify(marker, null, 2)}\n`)
  const file = lengthsFile(voice, rows)
  writeFileSync(lengthsJson, `${JSON.stringify(file, null, 2)}\n`)
  log(`Sir Irwin's voice: ${voice ?? 'none found'}.`)
  for (const r of rows) log(`  ${r.id}: ${r.seconds.toFixed(1)} s, ${r.by === 'say' ? 'made by this Mac' : "Jon's recording"}${r.what === 'keep' || r.what === 'own' ? ' (kept)' : ''}`)
  for (const n of notes) log(`  ${n}`)
  log(`${Object.keys(file.lines).length} of ${ids.length} lines have a voice. Then: npm --prefix functions run seed, and a full deploy (the server's clock reads the lengths; the files are not in git).`)
  return { voice, rows, notes, file }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const i = process.argv.indexOf('--voice')
  const asked = i > 0 ? process.argv[i + 1] : null
  try { makeVoice({ asked }) } catch (e) { console.error(e.message); process.exit(1) }
}
