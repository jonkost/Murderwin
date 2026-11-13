#!/usr/bin/env node
// npm run media: where every media file goes, and which are in.
//
// It looks in the four folders the night reads and says, for each, what is
// there, what is missing and what has a name the game will not find (a typo).
// With --live it also asks the site whether each file that deploys is online.
//
//   npm run media
//   npm run media -- --live
//
// Not sealed, and safe to print: the names are the open banks' own (the nine
// cue sounds, every line of the W-O-O-F News Recording Script, the loops).
// Which line a night plays is the night's pick, and nothing here knows it.
// The brain's own window still prints counts only, because it is in view
// while a night runs; this is run before one.

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, join, resolve, extname, basename } from 'node:path'
import { fileURLToPath } from 'node:url'
import { SOUND_IDS, REQUIRED_SOUND_IDS, CHIME_FALLBACK, CLIP_IDS, SOUND_EXTENSIONS } from '../cues/lib/cues.js'
import { RULES_FILES, RULES_DIR, LENGTHS_JSON } from './rules-film.mjs'
import { isStandIn, WEB_SOUND_DIR } from './web-sounds.mjs'
import { VOICE_DIR } from './irwin-voice.mjs'
import { PET_VOICE_DIR, PET_VOICE_SITE, onSiteWords } from './pet-voices.mjs'
import { allPetLines } from './pet-lines.mjs'
import { petVoiceId, speakable, PET_VOICE_EXT } from '../play/src/lib/petvoice.js'

const here = dirname(fileURLToPath(import.meta.url))
const root = join(here, '..')
export const SITE = 'https://murderwin-at-sirwin-manor.web.app/play/'

export const LOOPS = ['living', 'study', 'memory', 'bedroom', 'boo']
export const OPTIONAL_LOOPS = ['orangerie']
export const LOOP_MAX_BYTES = 30 * 1024 * 1024
// The two bulletins the Parlour TV plays as video: every clip that is not bulletin 2's.
export const VIDEO_CLIPS = CLIP_IDS.filter(id => !id.startsWith('bulletin2-'))
export const BULLETIN2_CLIPS = CLIP_IDS.filter(id => id.startsWith('bulletin2-'))
// The closing bulletin's own clips for a night (11 Nov 2026): one for every
// character as the Murderer and as the Ghost, one for every motive, and the
// static cut. All of them, always: which exist says nothing about a night.
const NEWS = JSON.parse(readFileSync(join(root, 'seed', 'woof-news.json'), 'utf8'))
const FILM = NEWS.closing.video ?? {}
const filmIds = k => Object.keys(FILM[k]?.ms ?? {}).map(id => `${FILM[k].prefix}${id}`)
export const MURDERER_CLIPS = filmIds('murderer')
export const GHOST_CLIPS = filmIds('ghost')
export const MOTIVE_CLIPS = filmIds('motive')
export const CUT_CLIPS = FILM.cut?.clip ? [FILM.cut.clip] : []
// The intro video: the Parlour TV plays it by itself at The house rules (since 12 Nov 2026).
export const EXTRA_VIDEOS = ['sirwin-intro']

// The folder the brain plays from: MEDIA_DIR in cues/.env, else media/.
export function mediaDir(envText = '') {
  const m = /^MEDIA_DIR=(.*)$/m.exec(envText)
  const v = m ? m[1].trim().replace(/^['"]|['"]$/g, '') : ''
  return resolve(join(root, 'cues'), v || '../media')
}

// name → the file found for it, by the endings allowed.
export function found(files, id, endings) {
  for (const ext of endings) {
    const hit = files.find(f => f === `${id}.${ext}`)
    if (hit) return hit
  }
  return null
}

// Files in a folder that no wanted name matches (a typo, or an old file).
export function strays(files, ids, endings) {
  const ok = new Set(ids)
  return files.filter(f => {
    if (f.startsWith('.') || f === 'README.md') return false
    const ext = extname(f).slice(1)
    return !(endings.includes(ext) && ok.has(basename(f, `.${ext}`)))
  })
}

// One folder's lines. `groups` is [{ title, ids, need }] where need says what
// a missing one costs.
export function folderLines({ title, where, files, endings, groups, then }) {
  const out = ['', title, `  Folder: ${where}`]
  if (files === null) out.push('  The folder does not exist yet. Make it, and drop the files in.')
  const list = files ?? []
  for (const g of groups) {
    const have = g.ids.filter(id => found(list, id, endings))
    const miss = g.ids.filter(id => !found(list, id, endings))
    out.push(`  ${g.title}: ${have.length} of ${g.ids.length} in.${miss.length ? ` ${g.need}` : ''}`)
    if (miss.length) out.push(`    Missing: ${miss.map(id => `${id}.${endings[0]}`).join(', ')}`)
  }
  const odd = strays(list, groups.flatMap(g => g.ids), endings)
  if (odd.length) out.push(`  Not read by the game (check the spelling, or an old file): ${odd.join(', ')}`)
  if (then) out.push(`  Then: ${then}`)
  return out
}

// The rules film: Jon's 28 recordings and his own 28 slides as pictures, both made by npm run rules-film.
// `own` is what the film goes by (rules-film.json `pictures`): it shows his slides only when all 28 were in.
export function rulesLines({ dir, files, own = false }) {
  const out = ['', '4. The rules film (the Parlour TV plays it by itself, after the intro video)', `  Folder: ${dir}`]
  if (!files) return [...out, '  This folder does not exist yet.']
  const n = RULES_FILES.length
  const voices = RULES_FILES.filter(f => files.includes(`${f}.m4a`)).length
  const slides = RULES_FILES.filter(f => files.includes(`${f}.jpg`)).length
  out.push(`  Your recordings: ${voices} of ${n} in.${voices < n ? ' A slide with no recording shows in silence.' : ''}`)
  if (slides === n && own) out.push(`  Your own slides: ${slides} of ${n} in. The film shows your own slides.`)
  else if (slides === n) out.push(`  Your own slides: ${slides} of ${n} in, but the film has not been told. Run npm run rules-film again.`)
  else out.push(`  Your own slides: ${slides} of ${n} in. The film shows drawn slides until all ${n} are in.`)
  out.push('  Then: npm run deploy:site. To make them again: npm run rules-film -- "<your exports folder>".')
  return out
}

const ls = dir => (existsSync(dir) ? readdirSync(dir).filter(f => { try { return statSync(join(dir, f)).isFile() } catch { return false } }) : null)

// Which of the cue sounds in the media folder are still the stand-in tones (scripts/web-sounds.mjs isStandIn):
// the brain counts them as in, but they are two-second tones, and since 12 Nov 2026 the screens and phones
// make a fuller sound of their own for those. `bytesOf(file)` reads one file, or null.
export function standIns(files, bytesOf) {
  return SOUND_IDS.filter(id => {
    const f = found(files ?? [], id, SOUND_EXTENSIONS)
    if (!f) return false
    try { const b = bytesOf(f); return !!b && isStandIn(id, b) } catch { return false }
  })
}
// The pets' voices: how many of the lines a pet can say (the game's own words; the workshop's own for Sir
// Irwin are on top of these) have their file made, in pet-voices/, and which pets' files are in the site's
// folder, where the next publish would pick them up (none until Jon says yes).
export function petVoiceCount(dir = PET_VOICE_DIR, site = PET_VOICE_SITE) {
  const ls2 = d => { try { return readdirSync(d) } catch { return [] } }
  const files = ls2(dir)
  const present = new Set(files.filter(f => f.endsWith(PET_VOICE_EXT)).map(f => f.slice(0, -PET_VOICE_EXT.length)))
  const wanted = allPetLines().filter(l => speakable(l.text, l.who)).map(l => petVoiceId(l.who, l.text))
  return { have: wanted.filter(id => present.has(id)).length, of: wanted.length, onSite: onSiteWords(ls2(site), files) }
}

// Sir Irwin's voice for the drawing's slides, and the loud copies of Jon's own cue sounds: both made by a
// command, both not in git, both shipped with the site.
export function madeLines({ voice, web, pets = null }) {
  const out = ['', '5. Made on this Mac, and shipped with the site']
  const voices = (voice?.files ?? []).filter(f => /^irwin-(slide-\d|door)\.m4a$/.test(f)).length
  out.push(`  Sir Irwin's voice for the drawing (npm run irwin-voice): ${voices} of 8 in.${voices < 8 ? ' A slide with no voice turns in silence, on time.' : ''}`)
  // the pets' voices (12 Nov 2026): a file for every line a pet can say; a line with none is shown and not said
  if (pets) out.push(`  The pets' voices, a file for every line a pet can say (npm run pet-voices): ${pets.have} of ${pets.of} made, and kept off the site.${pets.have < pets.of ? ' A line with no file is shown and not said.' : ''} In the site's folder for the next publish: ${pets.onSite ?? 'none (the voices are off)'}.`)
  const webs = (web?.files ?? []).filter(f => /\.mp3$/.test(f)).length
  out.push(`  Your own cue sounds, made loud for the screens and phones (npm run web-sounds): ${webs} in. Every other cue is the house's own sound, made by the screens.`)
  out.push('  Then: npm run deploy:site.')
  return out
}

export function report({ media, video, loops, household, rules = null, sizes = {}, standIn = [], voice = null, web = null, pets = null }) {
  const out = ['Where the media goes, and what is in.']
  out.push(...folderLines({
    title: '1. The sounds and the news recordings (the brain plays them)',
    where: media.dir,
    files: media.files,
    endings: SOUND_EXTENSIONS,
    groups: [
      { title: 'Required sounds', ids: REQUIRED_SOUND_IDS, need: 'The brain will not start without these.' },
      { title: 'Other chimes', ids: Object.keys(CHIME_FALLBACK), need: 'Fine: the one chime plays in their place.' },
      { title: 'Stings', ids: SOUND_IDS.filter(id => !REQUIRED_SOUND_IDS.includes(id) && !CHIME_FALLBACK[id]), need: 'Fine: those moments are silent.' },
      { title: 'Bulletin 1 recordings (the fallback when it is not video)', ids: VIDEO_CLIPS.filter(id => id.startsWith('newsflash-')), need: 'Skipped; the words still show on the TV.' },
      { title: 'Bulletin 2 recordings (supper, sound only)', ids: BULLETIN2_CLIPS, need: 'A missing line is skipped; its words still show on the iPad.' },
      { title: 'Closing bulletin recordings (the fallback when it is not video)', ids: VIDEO_CLIPS.filter(id => id.startsWith('woof-close-')), need: 'Skipped; the words still show on the TV.' },
    ],
    then: 'nothing to deploy. Restart the brain so it counts them. One second of silence at the start of each.',
  }))
  if (standIn.length) out.push(`  Still stand-in tones, not real sounds: ${standIn.join(', ')}. Fine: the screens and phones make a fuller sound of their own for these.`)
  out.push(...folderLines({
    title: '2. The bulletin videos (the Parlour TV plays them)',
    where: video.dir,
    files: video.files,
    endings: ['mp4'],
    groups: [
      { title: 'Bulletin 1', ids: VIDEO_CLIPS.filter(id => id.startsWith('newsflash-')), need: 'With the videos box ticked, a missing part shows its words only.' },
      { title: 'The closing bulletin', ids: VIDEO_CLIPS.filter(id => id.startsWith('woof-close-')), need: 'With the videos box ticked, a missing part shows its words only.' },
      { title: 'The Murderer name cards (one a character)', ids: MURDERER_CLIPS, need: 'A missing one is skipped: the name card shows without Mic saying it.' },
      { title: 'The Ghost name cards (one a character)', ids: GHOST_CLIPS, need: 'A missing one is skipped: the name card shows without Mic saying it.' },
      { title: 'The motives (one a motive)', ids: MOTIVE_CLIPS, need: 'A missing one is skipped: the motive card shows without Mic saying it.' },
      { title: 'The static cut', ids: CUT_CLIPS, need: 'Fine: the motive card cuts in without it.' },
      { title: 'The intro video (the Parlour TV plays it at The house rules)', ids: EXTRA_VIDEOS, need: 'Without it the join code stays up and no intro plays.' },
    ],
    then: 'npm run deploy:site. They play by themselves; the box Show the words instead on the workshop\'s Game night page turns them off.',
  }))
  out.push(...folderLines({
    title: '3. The loops (every idle screen)',
    where: loops.dir,
    files: loops.files,
    endings: ['mp4'],
    groups: [
      { title: 'The five loops', ids: LOOPS, need: 'Fine: a screen with no loop plays the screen saver, the five faces crossing the screen.' },
      { title: 'The Orangerie loop (optional)', ids: OPTIONAL_LOOPS, need: 'Fine: the screen saver plays.' },
    ],
    then: 'npm run deploy:site.',
  }))
  const big = Object.entries(sizes).filter(([, b]) => b > LOOP_MAX_BYTES).map(([f]) => f)
  if (big.length) out.push(`  Over 30 MB (slow to start on the house wifi): ${big.join(', ')}`)
  if (rules) out.push(...rulesLines(rules))
  if (voice || web) out.push(...madeLines({ voice, web, pets }))
  out.push('', '6. Sydney\'s photo (the dedication in the credits)', `  File: ${household.file}`, `  ${household.there ? 'In.' : 'Not in. The dedication shows its words with no photo.'}`, '  Then: npm run deploy:site.')
  out.push('', '7. Not files in this folder', '  The music: your music Shortcuts on the brain (Default Jazz, Default Jazz 20%, Intense Music 35% and 60%, the two game musics, and AudioPanic to stop it all) and the song Happy Birthday for Dogs.', '  Nothing else: the Parlour TV plays the intro and the rules film by itself.')
  return out
}

// Which deployed files the site has. A missing file answers with a web page, not a video.
async function liveLines({ video, loops, household, rules, voice, web }) {
  const want = [
    ...(video.files ?? []).filter(f => f.endsWith('.mp4')).map(f => `video/${f}`),
    ...(loops.files ?? []).filter(f => f.endsWith('.mp4')).map(f => `loops/${f}`),
    ...(rules?.files ?? []).filter(f => /^rules-\d\d-.*\.(m4a|jpg)$/.test(f)).map(f => `rules/${f}`),
    ...(voice?.files ?? []).filter(f => f.endsWith('.m4a')).map(f => `voice/${f}`),
    ...(web?.files ?? []).filter(f => f.endsWith('.mp3')).map(f => `sound/${f}`),
    ...(household.there ? ['household/sydney.jpg'] : []),
  ]
  if (!want.length) return ['', 'On the site: nothing to look for yet.']
  const off = []
  for (const path of want) {
    try {
      const r = await fetch(SITE + path.split('/').map(encodeURIComponent).join('/'), { method: 'HEAD' })
      if (!r.ok || /text\/html/.test(r.headers.get('content-type') ?? '')) off.push(path)
    } catch { off.push(path) }
  }
  return ['', off.length ? `On the site: ${want.length - off.length} of ${want.length} are online. Not yet deployed: ${off.join(', ')}` : `On the site: all ${want.length} are online.`]
}

// Has the film been told Jon's own slides are in? (rules-film.json, written by npm run rules-film)
function ownSlides() {
  try { return JSON.parse(readFileSync(LENGTHS_JSON, 'utf8')).pictures === true } catch { return false }
}

async function main() {
  const envPath = join(root, 'cues', '.env')
  const mDir = mediaDir(existsSync(envPath) ? readFileSync(envPath, 'utf8') : '')
  const vDir = join(root, 'play', 'public', 'video')
  const lDir = join(root, 'play', 'public', 'loops')
  const syd = join(root, 'play', 'public', 'household', 'sydney.jpg')
  const state = {
    media: { dir: mDir, files: ls(mDir) },
    video: { dir: vDir, files: ls(vDir) },
    loops: { dir: lDir, files: ls(lDir) },
    household: { file: syd, there: existsSync(syd) },
    rules: { dir: RULES_DIR, files: ls(RULES_DIR), own: ownSlides() },
    voice: { dir: VOICE_DIR, files: ls(VOICE_DIR) },
    pets: petVoiceCount(),
    web: { dir: WEB_SOUND_DIR, files: ls(WEB_SOUND_DIR) },
  }
  state.standIn = standIns(state.media.files, f => readFileSync(join(mDir, f)))
  const sizes = Object.fromEntries((state.loops.files ?? []).map(f => [f, statSync(join(lDir, f)).size]))
  for (const line of report({ ...state, sizes })) console.log(line)
  if (process.argv.includes('--live')) for (const line of await liveLines(state)) console.log(line)
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch(e => { console.log(`Stopped: ${e?.message ?? 'an error'}`); process.exit(1) })
}
