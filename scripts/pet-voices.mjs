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
// voices are in seed/pet-voices.json (one a pet, and how fast). A pet whose
// voice or pace changed there has its files made again.
//
// A file this command did not make is never touched (the marker,
// pet-voices/.made.json, says which ones it made), so a recording of Jon's
// own, saved under the same name, wins and stays.
//
// Nothing sealed is read or made: every line here is from an open bank, and
// which ones a night deals is the night's secret. For Sir Irwin's dessert
// speech it reads the workshop's own words (the openers, closers and UI
// lists: safe content), so the voice says what the screen will show. It
// prints counts and names of pets and voices, never a line.
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync, rmSync, readdirSync, statSync, copyFileSync } from 'node:fs'
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
export const ENGINE = 'kokoro'                                                // the natural voice model; a file made any other way is an old robotic one
const TALKER = join(here, 'pet-voices-kokoro.py')
const MODEL_FOLDER = 'models--mlx-community--Kokoro-82M-bf16'
const WORKERS = 6

// ---- the pure parts (scripts/test/pet-voices.test.mjs) ----

// The voices the model has: the names of the files in its voices folder.
export function modelVoices(files) {
  const end = '.safetensors'
  return (files ?? []).filter(f => f.endsWith(end)).map(f => f.slice(0, -end.length)).sort()
}

// The voice each pet gets, its pace (1 is the voice's own) and its pitch (1
// is the voice's own; above 1 is younger and smaller, below 1 bigger and
// deeper): its own from the cast when the model on this Mac has it, else
// nothing. A pet with no natural voice stays silent:
// there is no robotic stand-in.
export function castFor(file, have = []) {
  const out = {}
  for (const who of PETS) {
    const want = file?.cast?.[who] ?? {}
    out[who] = { voice: have.includes(want.voice) ? want.voice : null, speed: Number(want.speed) || 1, pitch: Number(want.pitch) || 1, asked: want.voice ?? null }
  }
  return out
}

// The words as the voice is given them. A few words are spelled the way they
// sound (seed/pet-voices.json saidAs), because the voice would read them
// wrongly: "Hmph" letter by letter, for one. Whole words only, and a capital
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

// What to do with one line's file.
//   'silent'  the pet says nothing on this line (the house describes the cat)
//   'own'     a file is there that this command did not make: Jon's. Never touched.
//   'keep'    made by this command, from these words, in this voice, at this pace and pitch
//   'make'    not there yet, or made from other words, another voice or the old robotic way
//   'mute'    the model on this Mac has no voice for the pet
export function decide({ spoken, exists, made = null, voice = null, speed = null, pitch = 1 }) {
  if (!spoken) return 'silent'
  if (exists && !made) return 'own'
  if (!voice) return exists ? 'keep' : 'mute'
  if (exists && made.by === ENGINE && made.spoken === spoken && made.voice === voice && made.speed === speed && (made.pitch ?? 1) === pitch) return 'keep'
  return 'make'
}

// Every line with its file's name and what is to be done about it.
export function plan(lines, { cast, marker = {}, present = new Set(), only = null, saidAs = {} } = {}) {
  return lines.filter(l => !only || l.who === only).map(l => {
    const id = petVoiceId(l.who, l.text)
    const spoken = forVoice(speakable(l.text, l.who), saidAs)
    const c = cast[l.who] ?? {}
    return { who: l.who, id, spoken, voice: c.voice ?? null, speed: c.speed ?? null, pitch: c.pitch ?? 1, what: decide({ spoken, exists: present.has(id), made: marker[id] ?? null, voice: c.voice ?? null, speed: c.speed ?? null, pitch: c.pitch ?? 1 }) }
  })
}

// The files this command made the old way (this Mac's own robotic voices,
// before 12 Nov's "not robotic at all"): they go, whatever else happens.
export function robotic(marker) {
  return Object.keys(marker).filter(id => marker[id]?.by !== ENGINE)
}

// Which files go into the site's folder for these pets: every made file whose
// name starts with one of their names. `have` is the store's file names.
export function forSite(have, pets = PETS) {
  const wanted = pets.filter(p => PETS.includes(p))
  return have.filter(f => f.endsWith(PET_VOICE_EXT) && wanted.some(p => f.startsWith(`${p}-`))).sort()
}

// What is on the site's folder now, in plain words: 'none', 'all five pets', or the pets by name.
export function onSiteWords(siteFiles, storeFiles) {
  const on = PETS.filter(p => siteFiles.some(f => f.startsWith(`${p}-`) && f.endsWith(PET_VOICE_EXT)))
  if (!on.length) return 'none (the voices are off)'
  const whole = on.every(p => forSite(siteFiles, [p]).length === forSite(storeFiles, [p]).length)
  const names = on.length === PETS.length ? 'all five pets' : on.join(', ')
  return whole ? names : `${names} (not every file: run --on again)`
}

// Files this command made for lines nobody can say any more (words changed
// in a bank): safe to take away, since the marker says they are its own.
export function stale(marker, rows) {
  const wanted = new Set(rows.map(r => r.id))
  return Object.keys(marker).filter(id => !wanted.has(id))
}

// Counts for the report: { who: { make, keep, own, silent, mute } }.
export function tally(rows) {
  const out = {}
  for (const r of rows) { out[r.who] ??= { make: 0, keep: 0, own: 0, silent: 0, mute: 0 }; out[r.who][r.what]++ }
  return out
}

// ---- the Mac's parts ----

const list = dir => { try { return readdirSync(dir) } catch { return [] } }

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

// The model says every line in one go, each into its own file in `dir`. It
// plays nothing and downloads nothing. Resolves to why it could not, or null.
function sayAll(rows, dir, log) {
  const jobs = rows.map(r => ({ id: r.id, voice: r.voice, speed: r.speed, pitch: r.pitch, text: r.spoken, out: join(dir, `${r.id}.wav`) }))
  const jobsPath = join(dir, 'jobs.json')
  writeFileSync(jobsPath, JSON.stringify(jobs))
  return new Promise(resolve => {
    const p = spawn(process.env.PET_VOICE_PYTHON || 'python3', [TALKER, jobsPath], { stdio: ['ignore', 'pipe', 'ignore'] })
    let buf = '', last = ''
    p.stdout.on('data', d => {
      buf += d
      for (let i = buf.indexOf('\n'); i >= 0; i = buf.indexOf('\n')) {
        const line = buf.slice(0, i).trim()
        buf = buf.slice(i + 1)
        const step = /^PROGRESS (\d+) of (\d+)$/.exec(line)
        if (step && Number(step[1]) % 100 === 0) log(`  ${step[1]} of ${step[2]} said`)
        if (/^(DONE|NO-MODEL)\b/.test(line)) last = line
      }
    })
    p.on('error', () => resolve('python3 was not found'))
    p.on('close', () => resolve(last.startsWith('NO-MODEL') ? 'the voice model is not on this Mac' : last.startsWith('DONE') ? null : 'the voice model stopped early'))
  })
}

// Trim the quiet at each end, even the loudness, and write a small MP3.
async function tidyOne(row, from, dir) {
  const wav = join(from, `${row.id}.wav`)
  const out = join(dir, `${row.id}${PET_VOICE_EXT}`)
  if (!existsSync(wav)) return false
  const trim = 'silenceremove=start_periods=1:start_threshold=-50dB:start_silence=0.05'
  const filters = [trim, 'areverse', trim, 'areverse', 'loudnorm=I=-16:TP=-1.5:LRA=11']
  const made = await run('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-i', wav, '-af', filters.join(','), '-ac', '1', '-ar', '44100', '-c:a', 'libmp3lame', '-b:a', '64k', out])
  return made.ok && existsSync(out) && statSync(out).size > 1000
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
async function workshopWords(log) {
  const key = join(root, 'scripts', 'service-account.json')
  if (!existsSync(key)) { log('Sir Irwin: the game\'s own words (no way into the workshop from here).'); return {} }
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
    return {}
  }
}

export async function makePetVoices({ dir = PET_VOICE_DIR, dry = false, only = null, workshop = true, log = console.log } = {}) {
  const castFile = JSON.parse(readFileSync(CAST_JSON, 'utf8'))
  const have = voicesOnThisMac()
  if (!have.length) log('The natural voice model is not on this Mac, so no voice can be made here.')
  const cast = castFor(castFile, have)
  const lines = allPetLines({ workshop: workshop ? await workshopWords(log) : {} })
  mkdirSync(dir, { recursive: true })
  const markerPath = join(dir, MARKER)
  let marker = {}
  try { marker = JSON.parse(readFileSync(markerPath, 'utf8')) } catch { /* the first run */ }
  // the old robotic files go first, whatever else this run does
  const old = dry ? [] : robotic(marker)
  for (const id of old) { for (const end of [PET_VOICE_EXT, '.m4a']) { try { rmSync(join(dir, `${id}${end}`), { force: true }) } catch { /* gone */ } } delete marker[id] }
  if (old.length) { writeFileSync(markerPath, `${JSON.stringify(marker)}\n`); log(`  ${old.length} files in the old robotic voices taken away.`) }
  const present = new Set(list(dir).filter(f => f.endsWith(PET_VOICE_EXT)).map(f => f.slice(0, -PET_VOICE_EXT.length)))
  const rows = plan(lines, { cast, marker, present, only, saidAs: castFile.saidAs })
  for (const who of PETS) {
    if (only && who !== only) continue
    const c = cast[who]
    log(`${who}: ${c.voice ? `${c.voice}, pace ${c.speed}, pitch ${c.pitch}` : `no voice (${c.asked ?? 'none named'} is not in the model on this Mac)`}`)
  }
  const todo = rows.filter(r => r.what === 'make')
  if (dry) {
    for (const [who, t] of Object.entries(tally(rows))) log(`  ${who}: ${t.make} to make, ${t.keep} kept, ${t.own} your own, ${t.silent} with nothing to say${t.mute ? `, ${t.mute} with no voice` : ''}`)
    log(`${todo.length} of ${rows.length} lines would be made. Nothing was made.`)
    return { rows, made: 0, failed: 0 }
  }
  let failed = 0
  if (todo.length) {
    const tmp = mkdtempSync(join(tmpdir(), 'pet-voices-'))
    try {
      const why = await sayAll(todo, tmp, log)
      if (why) log(`  The voices could not all be made: ${why}.`)
      await pool(todo, async row => {
        const ok = await tidyOne(row, tmp, dir)
        if (ok) marker[row.id] = { spoken: row.spoken, voice: row.voice, speed: row.speed, pitch: row.pitch, by: ENGINE }
        else failed++
      })
    } finally {
      try { rmSync(tmp, { recursive: true, force: true }) } catch { /* gone */ }
    }
  }
  // files of its own for lines nobody can say any more (never on a run that left some lines out on purpose:
  // one pet only, or the game's own words only for Sir Irwin)
  let cleared = 0
  if (!only && workshop) for (const id of stale(marker, rows)) { try { rmSync(join(dir, `${id}${PET_VOICE_EXT}`), { force: true }) } catch { /* gone */ } delete marker[id]; cleared++ }
  writeFileSync(markerPath, `${JSON.stringify(marker)}\n`)
  const after = new Set(list(dir).filter(f => f.endsWith(PET_VOICE_EXT)).map(f => f.slice(0, -PET_VOICE_EXT.length)))
  for (const [who, t] of Object.entries(tally(rows))) {
    const withVoice = rows.filter(r => r.who === who && r.spoken && after.has(r.id)).length
    const toSay = rows.filter(r => r.who === who && r.spoken).length
    log(`  ${who}: ${withVoice} of ${toSay} lines have a voice (${t.make} made now, ${t.keep} kept, ${t.own} your own; ${t.silent} with nothing to say)`)
  }
  if (cleared) log(`  ${cleared} old files of its own taken away (their words are gone from the banks).`)
  if (failed) log(`  ${failed} could not be made. Run it again.`)
  log(`On the site's folder now: ${onSiteWords(list(PET_VOICE_SITE), list(dir))}. To put them on: npm run pet-voices -- --on (only on Jon's word).`)
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
  const args = process.argv.slice(2)
  const at = args.indexOf('--only')
  const only = at >= 0 ? args[at + 1] : null
  if (only && !PETS.includes(only)) { console.log(`--only takes one of: ${PETS.join(', ')}.`); process.exit(2) }
  if (args.includes('--off')) { setSite({ on: false }); process.exit(0) }
  if (args.includes('--on')) {
    const named = args.slice(args.indexOf('--on') + 1).filter(a => PETS.includes(a))
    setSite({ on: true, pets: named.length ? named : PETS })
    process.exit(0)
  }
  makePetVoices({ dry: args.includes('--dry'), only, workshop: !args.includes('--no-workshop') })
    .then(r => process.exit(r.failed ? 1 : 0))
    .catch(e => { console.log(`FAIL: ${e?.name ?? 'Error'} (${String(e?.message ?? '').slice(0, 120)})`); process.exit(1) })
}
