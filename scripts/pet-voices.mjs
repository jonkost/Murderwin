#!/usr/bin/env node
// The pets' voices (12 Nov 2026, Jon: "Can we get voices reading for the
// pets", then, on hearing this Mac's own voices: "I need better voices. not
// robotic at all."). For every line a pet can say (scripts/pet-lines.mjs lists
// them all, from the open banks) this makes one small sound file in that
// pet's own voice: pet-voices/<pet>-<key>.mp3 (MP3s, so any player opens them). The phones and the Parlour TV
// play the file that belongs to the words they show (play/src/lib/petvoice.js
// works the name out from the words), once the files are on the site.
//
// The voices are natural ones: a voice model that is already on this Mac
// (Kokoro, through the mlx-audio package; scripts/pet-voices-kokoro.py talks
// to it). It is free, nothing is downloaded and nothing leaves the Mac. The
// Mac's own `say` voices are not used any more: they are the robotic ones.
//
//   npm run pet-voices                 make what is missing, count
//   npm run pet-voices -- --dry        count only: what would be made
//   npm run pet-voices -- --only boo   one pet
//   npm run pet-voices -- --no-workshop  the game's own words for Sir Irwin only
//   npm run pet-voices -- --on         put every pet's voice into the site's folder
//   npm run pet-voices -- --on irwin   only Sir Irwin's (any of the five names)
//   npm run pet-voices -- --off        take them all out of the site's folder
//
// THE VOICES ARE OFF UNTIL JON SAYS YES. The files are made into pet-voices/,
// which is not part of the site, so no publish can ship them by accident.
// --on copies them into play/public/voice/pets/, where the next publish
// picks them up; --off empties that folder again. With none on the site no
// pet speaks and no Hear button shows.
//
// This command is silent: the model writes files and plays nothing. The
// voices are in seed/pet-voices.json (one a pet: its voice, pace and pitch,
// where wanted lower and accent, and a few respelled words). A pet whose
// voice, pace, pitch, lower or accent changed there, or a line whose
// respelling changed, is made again.
//
// Every file named <pet>-<key>.mp3 in pet-voices/ is this command's own. The
// list pet-voices/.made.json says how each was made; a file that is not in
// the list (a run was stopped half way) is simply made again. If the voices
// are on the site's folder, run --on again after any change, then publish.
//
// Nothing sealed is read or made: every line here is from an open bank, and
// which ones a night deals is the night's secret. For Sir Irwin's dessert
// speech it reads the workshop's own words (the openers, closers and UI
// lists: safe content), so the voice says what the screen will show. It
// prints counts and names of pets and voices, never a line.
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync, rmSync, readdirSync, statSync, copyFileSync, renameSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { tmpdir, homedir } from 'node:os'
import { fileURLToPath } from 'node:url'
import { spawn } from 'node:child_process'
import { PETS, PET_VOICE_EXT, petVoiceId, speakable } from '../play/src/lib/petvoice.js'
import { allPetLines } from './pet-lines.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const root = join(here, '..')
export const PET_VOICE_DIR = join(root, 'pet-voices')                         // where they are made and kept: not part of the site
export const PET_VOICE_SITE = join(root, 'play', 'public', 'voice', 'pets')   // where the site finds them, once Jon says yes
export const CAST_JSON = join(root, 'seed', 'pet-voices.json')
export const MARKER = '.made.json'
export const LOCK = '.making'                                                 // holds the number of the run that is making them now
// Accents the talker can give a voice (scripts/pet-voices-kokoro.py ACCENTS: the same names, a test holds
// them together). Only the name is kept beside each made file, so a changed table gets a new name.
export const ACCENTS = ['aussie', 'aussie-light', 'pip-light', 'pip-fuller']
export const ENGINE = 'kokoro'                                                // the natural voice model; a file made any other way is an old robotic one
const TALKER = join(here, 'pet-voices-kokoro.py')
const MODEL_FOLDER = 'models--mlx-community--Kokoro-82M-bf16'
const WORKERS = 6
const TMP_PREFIX = 'pet-voices-run-'                                          // a run's working folder in the Mac's temporary folder
const PART = `.part${PET_VOICE_EXT}`                                          // a file still being written: never under its final name
const TALKERS = 2                                                             // the model runs twice side by side, half the lines each

// ---- the pure parts (scripts/test/pet-voices.test.mjs) ----

// The voices the model has: the names of the files in its voices folder.
export function modelVoices(files) {
  const end = '.safetensors'
  return (files ?? []).filter(f => f.endsWith(end)).map(f => f.slice(0, -end.length)).sort()
}

// The voice each pet gets, its pace (1 is the voice's own), its pitch (1 is
// the voice's own; above 1 is younger and smaller, below 1 bigger and
// deeper) and, for a voice that is to be "low but like a child", how far its
// note is brought down afterwards with its size kept (lower: 1 is not at
// all, 0.7 is about six notes down), and an accent the model has no voice
// for (accent: "aussie" or "aussie-light", or "pip-light" or "pip-fuller"
// for an English boy of about 1900; the talker moves each word's
// vowels): its own from the cast when the model on this Mac has it, else
// nothing. A pet with no natural voice stays silent:
// there is no robotic stand-in.
export function castFor(file, have = []) {
  const out = {}
  for (const who of PETS) {
    const want = file?.cast?.[who] ?? {}
    // a voice may be a blend of two, "ff_siwis,af_bella": then the model must have each
    const parts = String(want.voice ?? '').split(',').map(v => v.trim()).filter(Boolean)
    const here = parts.length > 0 && parts.every(v => have.includes(v))
    out[who] = { voice: here ? parts.join(',') : null, speed: Number(want.speed) || 1, pitch: Number(want.pitch) || 1, lower: Number(want.lower) || 1, accent: ACCENTS.includes(want.accent) ? want.accent : null, asked: want.voice ?? null }
  }
  return out
}

// The words as the voice is given them. A few words are spelled the way they
// sound (seed/pet-voices.json saidAs; saidFor picks the table for a voice),
// because the voice would read them wrongly: "Hmph" letter by letter, for one. Whole words only, and a capital
// stays a capital. The card's words never change: only what the voice is told.
export function forVoice(spoken, saidAs = {}) {
  let out = String(spoken ?? '')
  for (const [from, to] of Object.entries(saidAs ?? {})) {
    if (!from || !to) continue
    const word = new RegExp(`(?<![A-Za-z'])${from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![A-Za-z'])`, 'gi')
    out = out.replace(word, hit => (hit[0] === hit[0].toLowerCase() ? to[0].toLowerCase() : to[0].toUpperCase()) + to.slice(1))
  }
  return out
}

// The respellings for one voice: the ones for every voice, and on top the
// ones for its accent. (A British voice knows "chocolatey"; an American one
// reads it with a long a unless it is spelled "chocolaty".) Voices whose
// name starts with b are British, as in scripts/pet-voices-kokoro.py.
export function saidFor(saidAs = {}, voice = '', accent = null) {
  const british = String(voice ?? '').startsWith('b') || ACCENTS.includes(accent) // every accent is built on the British reading
  return { ...(saidAs?.all ?? {}), ...((british ? saidAs?.british : saidAs?.american) ?? {}) }
}

// What to do with one line's file.
//   'silent'  the pet says nothing on this line (the house describes the cat)
//   'keep'    there, and the list says it was made from these words, in this voice, at this pace and pitch,
//             with this lower and this accent
//   'make'    not there yet, not in the list (a run was stopped half way), or made from other words,
//             another voice, pace, pitch, lower or accent, or the old robotic way
//   'mute'    the model on this Mac has no voice for the pet
export function decide({ spoken, exists, made = null, voice = null, speed = null, pitch = 1, lower = 1, accent = null }) {
  if (!spoken) return 'silent'
  if (!voice) return exists ? 'keep' : 'mute'
  if (exists && made && made.by === ENGINE && made.spoken === spoken && made.voice === voice && made.speed === speed && (made.pitch ?? 1) === pitch && (made.lower ?? 1) === lower && (made.accent ?? null) === accent) return 'keep'
  return 'make'
}

// Every line with its file's name and what is to be done about it.
export function plan(lines, { cast, marker = {}, present = new Set(), only = null, saidAs = {} } = {}) {
  return lines.filter(l => !only || l.who === only).map(l => {
    const id = petVoiceId(l.who, l.text)
    const c = cast[l.who] ?? {}
    const spoken = forVoice(speakable(l.text, l.who), saidFor(saidAs, c.voice, c.accent))
    return { who: l.who, id, spoken, voice: c.voice ?? null, speed: c.speed ?? null, pitch: c.pitch ?? 1, lower: c.lower ?? 1, accent: c.accent ?? null, what: decide({ spoken, exists: present.has(id), made: marker[id] ?? null, voice: c.voice ?? null, speed: c.speed ?? null, pitch: c.pitch ?? 1, lower: c.lower ?? 1, accent: c.accent ?? null }) }
  })
}

// The files this command made the old way (this Mac's own robotic voices,
// before 12 Nov's "not robotic at all"): they go, whatever else happens.
export function robotic(marker) {
  return Object.keys(marker).filter(id => marker[id]?.by !== ENGINE)
}

// Which files go into the site's folder for these pets: every made file whose
// name starts with one of their names. `have` is the store's file names.
// Nothing else goes: not a file still being written, not a sample, not the list.
export function forSite(have, pets = PETS) {
  const wanted = pets.filter(p => PETS.includes(p))
  if (!wanted.length) return []
  const line = new RegExp(`^(${wanted.join('|')})-[0-9a-z]+\\${PET_VOICE_EXT}$`)
  return (have ?? []).filter(f => line.test(f)).sort()
}

// What is on the site's folder now, in plain words: 'none', 'all five pets', or the pets by name.
// `older`: some file there is not the same as the kept one (a voice was changed since --on).
export function onSiteWords(siteFiles, storeFiles, { older = false } = {}) {
  const on = PETS.filter(p => forSite(siteFiles, [p]).length > 0)
  if (!on.length) return 'none (the voices are off)'
  const whole = on.every(p => forSite(siteFiles, [p]).length === forSite(storeFiles, [p]).length)
  const names = on.length === PETS.length ? 'all five pets' : on.join(', ')
  if (!whole) return `${names} (not every file: run --on again)`
  return older ? `${names} (older than the kept ones: run --on again)` : names
}

// Files this command made for lines nobody can say any more (words changed
// in a bank): safe to take away, since the marker says they are its own.
export function stale(marker, rows) {
  const wanted = new Set(rows.map(r => r.id))
  return Object.keys(marker).filter(id => !wanted.has(id))
}

// Is another run making the voices now? (Two at once would each save the
// list of what it made over the other's, and write the same files.)
// `lockText` is what the lock file holds; `alive` says whether a run with
// that number is still going.
export function busyWith(lockText, alive, me) {
  const other = Number(String(lockText ?? '').trim())
  return Number.isInteger(other) && other > 0 && other !== me && alive(other) ? other : null
}

// Counts for the report: { who: { make, keep, silent, mute } }.
export function tally(rows) {
  const out = {}
  for (const r of rows) { out[r.who] ??= { make: 0, keep: 0, silent: 0, mute: 0 }; out[r.who][r.what]++ }
  return out
}

// What was asked for on the command line. `wrong` lists what was not
// understood: then nothing is done (a mistyped pet's name after --on must
// never mean "every pet").
export function readArgs(args = []) {
  const at = args.indexOf('--only')
  const one = at >= 0 ? args[at + 1] ?? '' : null
  const onAt = args.indexOf('--on')
  const named = onAt >= 0 ? args.slice(onAt + 1).filter(a => !a.startsWith('--')) : []
  return {
    dry: args.includes('--dry'),
    workshop: !args.includes('--no-workshop'),
    off: args.includes('--off'),
    on: onAt >= 0,
    only: one && PETS.includes(one) ? one : null,
    pets: named.length ? named.filter(a => PETS.includes(a)) : PETS,
    wrong: [...(at >= 0 && !PETS.includes(one) ? [`--only ${one || '(no name)'}`] : []), ...named.filter(a => !PETS.includes(a))],
  }
}

// ---- the Mac's parts ----

const list = dir => { try { return readdirSync(dir) } catch { return [] } }
const voiceFiles = dir => list(dir).filter(f => f.endsWith(PET_VOICE_EXT) && !f.endsWith(PART))
const alive = pid => { try { process.kill(pid, 0); return true } catch { return false } }

// The number of another run that is making the voices now, or null.
function otherRun(dir) {
  let text = ''
  try { text = readFileSync(join(dir, LOCK), 'utf8') } catch { /* nobody is making them */ }
  return busyWith(text, alive, process.pid)
}

// Is any voice file in the site's folder not the same as the kept one? (By size: a voice that changed is a file that changed.)
function siteOlder(site, store) {
  return voiceFiles(site).some(f => { try { return statSync(join(site, f)).size !== statSync(join(store, f)).size } catch { return true } })
}

// The voices of the model on this Mac (none when the model is not here).
function voicesOnThisMac() {
  const hub = process.env.HF_HUB_CACHE || join(process.env.HF_HOME || join(homedir(), '.cache', 'huggingface'), 'hub')
  const snapshots = join(hub, MODEL_FOLDER, 'snapshots')
  return [...new Set(list(snapshots).flatMap(s => modelVoices(list(join(snapshots, s, 'voices')))))]
}

const run = (bin, args) => new Promise(resolve => {
  const p = spawn(bin, args, { stdio: ['ignore', 'ignore', 'pipe'] })
  let err = ''
  p.stderr.on('data', d => { err += d })
  p.on('error', () => resolve({ ok: false, err: 'not found' }))
  p.on('close', code => resolve({ ok: code === 0, err }))
})

// The model says every line, each into its own file in `dir`: two copies of
// it side by side, half the lines each. It plays nothing and downloads
// nothing. Resolves to why it could not, or null.
function sayAll(rows, dir, log) {
  const chunks = Array.from({ length: Math.min(TALKERS, rows.length) }, () => [])
  rows.forEach((r, i) => chunks[i % chunks.length].push(r))
  const done = chunks.map(() => 0)
  let told = 0
  const one = (chunk, k) => new Promise(resolve => {
    const jobs = chunk.map(r => ({ id: r.id, voice: r.voice, speed: r.speed, pitch: r.pitch, accent: r.accent, text: r.spoken, out: join(dir, `${r.id}.wav`) }))
    const jobsPath = join(dir, `jobs-${k}.json`)
    writeFileSync(jobsPath, JSON.stringify(jobs))
    const p = spawn(process.env.PET_VOICE_PYTHON || 'python3', [TALKER, jobsPath], { stdio: ['ignore', 'pipe', 'ignore'] })
    let buf = '', last = ''
    p.stdout.on('data', d => {
      buf += d
      for (let i = buf.indexOf('\n'); i >= 0; i = buf.indexOf('\n')) {
        const line = buf.slice(0, i).trim()
        buf = buf.slice(i + 1)
        const step = /^PROGRESS (\d+) of (\d+)$/.exec(line)
        if (step) {
          done[k] = Number(step[1])
          const hundreds = Math.floor(done.reduce((a, b) => a + b, 0) / 100)
          if (hundreds > told) { told = hundreds; log(`  ${hundreds * 100} of ${rows.length} said`) }
        }
        if (/^(DONE|NO-MODEL)\b/.test(line)) last = line
      }
    })
    p.on('error', () => resolve('python3 was not found'))
    p.on('close', () => resolve(last.startsWith('NO-MODEL') ? 'the voice model is not on this Mac' : last.startsWith('DONE') ? null : 'the voice model stopped early'))
  })
  return Promise.all(chunks.map(one)).then(whys => whys.find(Boolean) ?? null)
}

// Trim the quiet at each end, even the loudness, and write a small MP3. It is
// written beside its place and moved in only when it is whole, so a half
// written file is never under a line's name.
async function tidyOne(row, from, dir) {
  const wav = join(from, `${row.id}.wav`)
  const part = join(dir, `${row.id}${PART}`)
  const out = join(dir, `${row.id}${PET_VOICE_EXT}`)
  if (!existsSync(wav)) return false
  // "low but like a child": the note is brought down and the voice's size kept (Rubber Band, a tool that is
  // already on this Mac; with it missing, the line is not made rather than made wrong)
  let from44 = wav
  if (row.lower && row.lower !== 1) {
    const even = join(from, `${row.id}.44.wav`)
    const low = join(from, `${row.id}.low.wav`)
    const a = await run('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-i', wav, '-ac', '1', '-ar', '44100', even])
    const b = a.ok ? await run('rubberband', ['-q', '-3', '-F', '-f', String(row.lower), even, low]) : a
    if (!b.ok || !existsSync(low)) return false
    from44 = low
  }
  const trim = 'silenceremove=start_periods=1:start_threshold=-50dB:start_silence=0.05'
  const filters = [trim, 'areverse', trim, 'areverse', 'loudnorm=I=-16:TP=-1.5:LRA=11']
  const made = await run('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-i', from44, '-af', filters.join(','), '-ac', '1', '-ar', '44100', '-c:a', 'libmp3lame', '-b:a', '64k', '-f', 'mp3', part])
  const ok = made.ok && existsSync(part) && statSync(part).size > 1000
  try { if (ok) renameSync(part, out); else rmSync(part, { force: true }) } catch { return false }
  return ok
}

async function pool(items, worker, size = WORKERS) {
  let next = 0
  const results = new Array(items.length)
  await Promise.all(Array.from({ length: Math.min(size, items.length) }, async () => {
    while (next < items.length) { const i = next++; results[i] = await worker(items[i], i) }
  }))
  return results
}

// The workshop's own words for Sir Irwin's dessert speech, when it has any
// (safe content; the same lists the server reads at dessert, functions/lib/screen.js).
// null when they could not be read: then no file is cleared away as out of date.
async function workshopWords(log) {
  const key = join(root, 'scripts', 'service-account.json')
  if (!existsSync(key)) { log('Sir Irwin: the game\'s own words (no way into the workshop from here).'); return null }
  try {
    process.env.GOOGLE_APPLICATION_CREDENTIALS ??= key
    const { openDb } = await import('../functions/lib/connect.js')
    const { readArea } = await import('../functions/lib/night.js')
    const { labelled } = await import('../functions/lib/screen.js')
    const db = openDb({ live: true })
    const [openers, closers, ui] = await Promise.all([readArea(db, 'openers'), readArea(db, 'closers'), readArea(db, 'ui_copy')])
    const first = items => items.find(i => i.cat === 'irwin')?.text ?? null
    const words = { opener: first(openers), closer: first(closers), ui: labelled(ui) }
    const own = ['IRWIN FIVE', 'IRWIN FOUR', 'IRWIN THREE', 'IRWIN TWO', 'IRWIN ONE'].filter(k => words.ui[k]).length
    log(`Sir Irwin: the workshop's own opener ${words.opener ? 'yes' : 'no'}, closer ${words.closer ? 'yes' : 'no'}, ${own} of 5 counting lines.`)
    return words
  } catch (e) {
    log(`Sir Irwin: the game's own words (the workshop could not be read: ${e?.code ?? e?.name ?? 'error'}).`)
    return null
  }
}

export async function makePetVoices({ dir = PET_VOICE_DIR, dry = false, only = null, workshop = true, log = console.log } = {}) {
  const castFile = JSON.parse(readFileSync(CAST_JSON, 'utf8'))
  const have = voicesOnThisMac()
  if (!have.length) log('The natural voice model is not on this Mac, so no voice can be made here.')
  const cast = castFor(castFile, have)
  const words = workshop ? await workshopWords(log) : null // null: not read (not asked for, or it could not be)
  const lines = allPetLines({ workshop: words ?? {} })
  mkdirSync(dir, { recursive: true })
  const markerPath = join(dir, MARKER)
  // one run at a time
  if (!dry && otherRun(dir)) {
    log('Another run is making the voices right now. Wait for it to finish, then run this again.')
    return { rows: [], made: 0, failed: 0, busy: true }
  }
  const lockPath = join(dir, LOCK)
  if (!dry) writeFileSync(lockPath, `${process.pid}\n`)
  try {
    // files for lines nobody can say any more are cleared only on a run that looked at every line:
    // every pet, and the workshop's own words for Sir Irwin read
    return await makeThem({ dir, dry, only, canClear: !only && words !== null, log, castFile, cast, lines, markerPath })
  } finally {
    if (!dry) { try { rmSync(lockPath, { force: true }) } catch { /* gone */ } }
  }
}

async function makeThem({ dir, dry, only, canClear, log, castFile, cast, lines, markerPath }) {
  let marker = {}
  try { marker = JSON.parse(readFileSync(markerPath, 'utf8')) } catch { /* the first run */ }
  // what a stopped run left behind: files still being written, and its working folder
  if (!dry) {
    for (const f of list(dir)) if (f.endsWith(PART)) { try { rmSync(join(dir, f), { force: true }) } catch { /* gone */ } }
    for (const d of list(tmpdir())) if (d.startsWith(TMP_PREFIX)) { try { rmSync(join(tmpdir(), d), { recursive: true, force: true }) } catch { /* gone */ } }
  }
  // the old robotic files go first, whatever else this run does
  const old = dry ? [] : robotic(marker)
  for (const id of old) { for (const end of [PET_VOICE_EXT, '.m4a']) { try { rmSync(join(dir, `${id}${end}`), { force: true }) } catch { /* gone */ } } delete marker[id] }
  if (old.length) { writeFileSync(markerPath, `${JSON.stringify(marker)}\n`); log(`  ${old.length} files in the old robotic voices taken away.`) }
  const present = new Set(voiceFiles(dir).map(f => f.slice(0, -PET_VOICE_EXT.length)))
  const rows = plan(lines, { cast, marker, present, only, saidAs: castFile.saidAs })
  for (const who of PETS) {
    if (only && who !== only) continue
    const c = cast[who]
    const wanted = castFile.cast?.[who]?.accent
    if (wanted && !c.accent) log(`${who}: the accent "${wanted}" is not one the talker knows, so none is used.`)
    log(`${who}: ${c.voice ? `${c.voice}, pace ${c.speed}, pitch ${c.pitch}${c.lower !== 1 ? `, note lowered to ${c.lower}` : ''}${c.accent ? `, accent ${c.accent}` : ''}` : `no voice (${c.asked ?? 'none named'} is not in the model on this Mac)`}`)
  }
  const todo = rows.filter(r => r.what === 'make')
  if (dry) {
    for (const [who, t] of Object.entries(tally(rows))) log(`  ${who}: ${t.make} to make, ${t.keep} kept, ${t.silent} with nothing to say${t.mute ? `, ${t.mute} with no voice` : ''}`)
    log(`${todo.length} of ${rows.length} lines would be made. Nothing was made.`)
    return { rows, made: 0, failed: 0 }
  }
  let failed = 0
  if (todo.length) {
    const tmp = mkdtempSync(join(tmpdir(), TMP_PREFIX))
    try {
      const why = await sayAll(todo, tmp, log)
      if (why) log(`  The voices could not all be made: ${why}.`)
      let saved = 0
      await pool(todo, async row => {
        const ok = await tidyOne(row, tmp, dir)
        if (ok) marker[row.id] = { spoken: row.spoken, voice: row.voice, speed: row.speed, pitch: row.pitch, lower: row.lower, accent: row.accent, by: ENGINE }
        else failed++
        // saved as it goes, so a run that is stopped has little to make again
        if (ok && ++saved % 25 === 0) writeFileSync(markerPath, `${JSON.stringify(marker)}\n`)
      })
    } finally {
      try { rmSync(tmp, { recursive: true, force: true }) } catch { /* gone */ }
    }
  }
  // files for lines nobody can say any more (never on a run that did not look at every line: one pet only,
  // the game's own words only for Sir Irwin, or the workshop could not be read)
  let cleared = 0
  if (canClear) for (const id of stale(marker, rows)) { try { rmSync(join(dir, `${id}${PET_VOICE_EXT}`), { force: true }) } catch { /* gone */ } delete marker[id]; cleared++ }
  writeFileSync(markerPath, `${JSON.stringify(marker)}\n`)
  const after = new Set(voiceFiles(dir).map(f => f.slice(0, -PET_VOICE_EXT.length)))
  for (const [who, t] of Object.entries(tally(rows))) {
    const withVoice = rows.filter(r => r.who === who && r.spoken && after.has(r.id)).length
    const toSay = rows.filter(r => r.who === who && r.spoken).length
    log(`  ${who}: ${withVoice} of ${toSay} lines have a voice (${t.make} made now, ${t.keep} kept; ${t.silent} with nothing to say)`)
  }
  if (cleared) log(`  ${cleared} old files taken away (their words are gone from the banks).`)
  if (failed) log(`  ${failed} could not be made. Run it again.`)
  const onSite = onSiteWords(list(PET_VOICE_SITE), list(dir), { older: siteOlder(PET_VOICE_SITE, dir) })
  log(`On the site's folder now: ${onSite}. To put them on: npm run pet-voices -- --on (only on Jon's word).`)
  return { rows, made: todo.length - failed, failed }
}

// Put the chosen pets' voices into the site's folder, or take them all out.
// Only ever copies and deletes the pets' sound files in play/public/voice/pets/.
export function setSite({ on = false, pets = PETS, store = PET_VOICE_DIR, site = PET_VOICE_SITE, log = console.log } = {}) {
  mkdirSync(site, { recursive: true })
  for (const f of list(site)) if (f.endsWith(PET_VOICE_EXT) || f.endsWith('.m4a')) rmSync(join(site, f), { force: true })
  if (!on) { log('The voices are off: none in the site\'s folder. No pet speaks and no Hear button shows.'); return { copied: 0 } }
  const files = forSite(list(store), pets)
  for (const f of files) copyFileSync(join(store, f), join(site, f))
  log(`In the site's folder: ${onSiteWords(list(site), list(store))}, ${files.length} files. They go out with the next publish of the site.`)
  return { copied: files.length }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const asked = readArgs(process.argv.slice(2))
  if (asked.wrong.length) { console.log(`Not understood: ${asked.wrong.join(', ')}. The pets are: ${PETS.join(', ')}. Nothing was done.`); process.exit(2) }
  if (asked.off) { setSite({ on: false }); process.exit(0) }
  if (asked.on) {
    if (otherRun(PET_VOICE_DIR)) { console.log('A run is making the voices right now. Wait for it to finish, then run this again. Nothing was copied.'); process.exit(2) }
    setSite({ on: true, pets: asked.pets })
    process.exit(0)
  }
  makePetVoices({ dry: asked.dry, only: asked.only, workshop: asked.workshop })
    .then(r => process.exit(r.failed ? 1 : 0))
    .catch(e => { console.log(`FAIL: ${e?.name ?? 'Error'} (${String(e?.message ?? '').slice(0, 120)})`); process.exit(1) })
}
