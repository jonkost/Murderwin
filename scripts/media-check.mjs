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
// On the site for the Parlour TV's second tab; the game does not play it.
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

const ls = dir => (existsSync(dir) ? readdirSync(dir).filter(f => { try { return statSync(join(dir, f)).isFile() } catch { return false } }) : null)

export function report({ media, video, loops, household, sizes = {} }) {
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
      { title: 'The intro video (for the second tab; the game does not play it)', ids: EXTRA_VIDEOS, need: 'Fine: play it from your own file.' },
    ],
    then: 'npm run deploy:site, then tick The bulletins are videos on the workshop\'s Game night page.',
  }))
  out.push(...folderLines({
    title: '3. The loops (every idle screen)',
    where: loops.dir,
    files: loops.files,
    endings: ['mp4'],
    groups: [
      { title: 'The five loops', ids: LOOPS, need: 'A screen with no loop shows its crest.' },
      { title: 'The Orangerie loop (optional)', ids: OPTIONAL_LOOPS, need: 'Fine: the crest shows.' },
    ],
    then: 'npm run deploy:site.',
  }))
  const big = Object.entries(sizes).filter(([, b]) => b > LOOP_MAX_BYTES).map(([f]) => f)
  if (big.length) out.push(`  Over 30 MB (slow to start on the house wifi): ${big.join(', ')}`)
  out.push('', '4. Sydney\'s photo (the end credits)', `  File: ${household.file}`, `  ${household.there ? 'In.' : 'Not in. His card shows his name only.'}`, '  Then: npm run deploy:site.')
  out.push('', '5. Not files in this folder', '  The music: three playlists in the Music app on the brain (Murderwin · Jazz, Intense, Credits) and the song Happy Birthday for Dogs.', '  The intro video and the rules deck: a second browser tab on the Parlour TV\'s Mac. The game does not play them.')
  return out
}

// Which deployed files the site has. A missing file answers with a web page, not a video.
async function liveLines({ video, loops, household }) {
  const want = [
    ...(video.files ?? []).filter(f => f.endsWith('.mp4')).map(f => `video/${f}`),
    ...(loops.files ?? []).filter(f => f.endsWith('.mp4')).map(f => `loops/${f}`),
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
  }
  const sizes = Object.fromEntries((state.loops.files ?? []).map(f => [f, statSync(join(lDir, f)).size]))
  for (const line of report({ ...state, sizes })) console.log(line)
  if (process.argv.includes('--live')) for (const line of await liveLines(state)) console.log(line)
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch(e => { console.log(`Stopped: ${e?.message ?? 'an error'}`); process.exit(1) })
}
