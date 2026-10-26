// The room screens and the sounds: what the living room TV (and the iPad)
// shows at the beats that say "look at the screen", and which sound file
// the cue relay plays. One public doc each:
//
//   nights/{id}/public/screen  { kind, title, lines[], at, holdMs, rehearsal, act, beat, captions, struck, parked, choices, mood, prompts, video }
//     kind: idle | black | news | bulletin | irwin | board | door | trace | prompts | title
//     prompts: Sir Irwin's sharing prompts (bagclues.js), one at a time on the TV:
//       { lines[], order[], startedAt, everyMs }, open lines, so the order says nothing
//     video: true when the Parlour TV plays the bulletin as video (meta/game.bulletinVideo); the TV
//       finds each part's file in the open bank by its words, so no recording is named here
//   nights/{id}/public/sounds  { current: { id, at, clips? } }   clips: recorded W-O-O-F News lines, played after the id (news.js),
//     as codes on a night with a station key saved (news.clipCode), never as names
//
// Any phone may read both, so NOTHING here carries a role, the dial, the
// motive number, who died, or anything that ties a clue to a motive.
// The only case fields read are dial (to pick a band, never written),
// motive (to keep it IN Sir Irwin's Act 5 options, which are the clue
// itself; never written as a key), screenSalt (the secret Irwin's options
// and the bulletin's timing are seeded on, never written), solving (Sir
// Irwin's motive clue, families.js) and rehearsal. The W-O-O-F News bulletins read solving.newsOut and
// solving.family (news.js) and write nothing to the case. checkScreen refuses a doc with a
// forbidden key before it is written, and the tests walk a whole night to
// prove it.
//
// SEAL RULE: nothing here prints, logs or returns content. Results are ok
// flags, kinds and counts.

import { readFileSync } from 'node:fs'
import { dirname, join as joinPath } from 'node:path'
import { fileURLToPath } from 'node:url'
import { MOTIVES, CHARACTERS, NightError, readArea } from './night.js'
import { irwinOptions, irwinCount } from './families.js'
import { bulletin1, bulletin2, bulletin2Delay, CLIP_IDS, clipCode } from './news.js'
import { PROMPTS, PROMPT_EVERY_MS, promptOrder } from './bagclues.js'

const here = dirname(fileURLToPath(import.meta.url))
const NIGHT = JSON.parse(readFileSync(joinPath(here, '..', 'seed', 'night.json'), 'utf8'))

export const SCREEN_KINDS = ['idle', 'black', 'news', 'bulletin', 'irwin', 'board', 'door', 'trace', 'prompts', 'title']

// The sound catalogue. A file in media/ per id (media/README.md); the cue
// relay (cues/lib/cues.js) carries the same list and refuses an id outside it.
export const SOUND_IDS = ['chime-news', 'sounder-bulletin', 'chime-irwin', 'sting-solved', 'sting-door', 'sting-reveal', 'sting-result', 'blackout', 'chime-phone']

// Keys a public screen doc may never carry, at any depth.
export const FORBIDDEN_SCREEN_KEYS = [
  'roles', 'role', 'dial', 'dialSign', 'dialMap', 'dialLog', 'motive', 'murderer', 'ghost', 'victim', 'victimCharacterId',
  'hiddenSets', 'exposure', 'dealtClues', 'defaulted', 'tier', 'band', 'level', 'screenSalt',
  'solving', 'family', 'families', 'newsOut', 'hints',
]

export const DOOR_HOLD_MS = 10_000
export const MAX_IRWIN_WORDS = 12

// Safe defaults, used only when the workshop list is empty.
export const DEFAULT_IRWIN = { opener: 'Oh! Everyone is here. I have something to say.', closer: 'That is everything. I am a good boy.' }
// Bulletin 1's lines are the open W-O-O-F News bank (seed/woof-news.json).
// This stand-in shows only for a case with no family to cross off, such as a
// rehearsal.
export const NEWS_FLASH_PLACEHOLDER = '(Here the news flash crosses off one family of motives for everyone.)'
// On a rehearsal night every sealed slot is a bracketed stand-in (Jon, 23 Oct 2026).
export const NEWS_STAND_IN = "[W-O-O-F News crosses off one family of motives here]"
export const BULLETIN2_STAND_IN = level => `[W-O-O-F News hints at the real family here, plainness ${level} of 5]`
export const IRWIN_STAND_IN = count => `[Sir Irwin's ${count} motive card${count === 1 ? '' : 's'} appear here]`
// The Act 4 title card on the Parlour TV (§9.5).
export const ACT4_TITLE = { title: 'Act 4 · Behind Closed Doors', line: 'Look at your phone and find your group.' }
// Sir Irwin's countdown (Act 5): how sure he sounds, by how many cards he
// shows. Open copy, from docs/handoff-2026-10-22.md §5; the workshop's
// ui_copy IRWIN FIVE to IRWIN ONE lines win.
export const IRWIN_OPTION_LINES = {
  5: "I sniffed the whole house! Twice! It's one of these five. Is that too many? Can I still have a treat?",
  4: "I sniffed really, really hard, and it's one of these four! Keep sniffing with me!",
  3: "Ooh! It's one of these three! My tail is wagging, so I'm pretty sure!",
  2: "It's one of these two! I'm sure! Well, mostly sure! Okay, very sure!",
  1: "It's THIS one! I sniffed it out all by myself! Who's a good boy? Me!",
}

export function screenPath(nightId) { return `nights/${nightId}/public/screen` }
export function soundsPath(nightId) { return `nights/${nightId}/public/sounds` }

// ---------------------------------------------------------------------------
// Small helpers

function msOf(t) {
  if (!t) return 0
  if (typeof t.toMillis === 'function') return t.toMillis()
  if (t instanceof Date) return t.getTime()
  return Number(t) || 0
}

// What the screens seed their picks on: the case's secret salt. The night
// id is public (every phone has it) and this repo is public to Jon, so a
// pick seeded on the night id could be replayed from outside; the salt
// never leaves the case. A case from before the salt falls back to the
// night id.
export function screenSeed(c, nightId) {
  return typeof c?.screenSalt === 'string' && c.screenSalt ? c.screenSalt : String(nightId ?? '')
}

// "LABEL: text" lines from a workshop list (the dealer has the same rule).
export function labelled(items) {
  const out = {}
  for (const it of items ?? []) {
    const text = typeof it === 'string' ? it : it?.text
    const m = /^([A-Z][A-Z0-9 '&/]*):\s*(.+)$/s.exec(String(text ?? '').trim())
    if (m) out[m[1].trim()] = m[2].trim()
  }
  return out
}

// The dial's band, the same ladder as the trace behind the door
// (deal.traceLevel: four points a rung, symmetric, 1 to 5). Kept here so
// this file needs nothing from the dealer. A test checks the two agree.
export const DIAL_STEP = 4
export function dialBand(dial) {
  const d = Number(dial) || 0
  const rungs = Math.sign(d) * Math.round(Math.abs(d) / DIAL_STEP)
  return Math.max(1, Math.min(5, 3 + rungs))
}

// ---------------------------------------------------------------------------
// Act 5: Sir Irwin on the living room screen (docs/handoff-2026-10-22.md §5):
// his opener, the countdown line, the motive cards and his closer. Nothing
// sealed. His opener and closer are the workshop's Irwin lines in the
// openers and closers lists, and go through the dog filter: twelve words at
// most, and no name of anyone at the party or in the cast.

export function dogFilter(text, names = [], { maxWords = MAX_IRWIN_WORDS } = {}) {
  let t = String(text ?? '').replace(/\s+/g, ' ').trim()
  const parts = new Set()
  for (const n of names) {
    const full = String(n ?? '').trim()
    if (!full) continue
    parts.add(full)
    for (const p of full.split(/\s+/)) if (p.replace(/[^A-Za-z]/g, '').length >= 3) parts.add(p)
  }
  for (const p of [...parts].sort((a, b) => b.length - a.length)) {
    const re = new RegExp(`(^|[^A-Za-z])${p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?=$|[^A-Za-z])`, 'gi')
    t = t.replace(re, '$1someone')
  }
  const words = t.split(' ').filter(Boolean)
  if (words.length > maxWords) t = `${words.slice(0, maxWords).join(' ').replace(/[,;:]$/, '')}.`
  return t
}

export function castNames(roster = {}) {
  const names = []
  for (const r of Object.values(roster ?? {})) if (r?.name) names.push(r.name)
  for (const ch of CHARACTERS) names.push(ch.name)
  return names
}

export function irwinLines({ opener, closer, names = [], optionLine = null } = {}) {
  const said = [opener || DEFAULT_IRWIN.opener, closer || DEFAULT_IRWIN.closer].map(l => dogFilter(l, names)).filter(Boolean)
  // the countdown line is open copy (handoff §5): kept whole, only names filtered
  if (optionLine) said.splice(said.length - 1, 0, dogFilter(optionLine, names, { maxWords: Infinity }))
  return said
}

// Sir Irwin's motive clue: the motives he names, in number order, with their
// rhymes (public from Act 1), and the line that says how sure he is. The
// real motive is always among them (families.irwinOptions). His picture is
// one of his five moods, by the dial's band (the same five as the trace
// reveal's ladder): `mood` 1 to 5.
export function irwinMotiveClue(c, { seed = '', ui = {} } = {}) {
  const band = dialBand(c?.dial)
  const ns = irwinOptions(c, { band, seed })
  const count = irwinCount(band)
  const label = { 5: 'IRWIN FIVE', 4: 'IRWIN FOUR', 3: 'IRWIN THREE', 2: 'IRWIN TWO', 1: 'IRWIN ONE' }[count]
  return {
    choices: ns.map(n => ({ n, rhyme: MOTIVES.find(m => m.n === n)?.rhyme ?? '' })),
    optionLine: ns.length ? ui[label] || IRWIN_OPTION_LINES[count] : null,
    mood: band,
  }
}

// ---------------------------------------------------------------------------
// The doc itself, and the check every write goes through.

export function checkScreen(doc, path = '') {
  const bad = []
  const walk = (v, p) => {
    if (Array.isArray(v)) { v.forEach((x, i) => walk(x, `${p}[${i}]`)); return }
    if (v && typeof v === 'object' && !(v instanceof Date) && typeof v.toMillis !== 'function') {
      for (const [k, x] of Object.entries(v)) {
        if (FORBIDDEN_SCREEN_KEYS.includes(k)) bad.push(`${p}.${k}`)
        walk(x, `${p}.${k}`)
      }
    }
  }
  walk(doc, path || 'screen')
  if (!SCREEN_KINDS.includes(doc?.kind)) bad.push('screen.kind')
  return { ok: bad.length === 0, bad }
}

export function screenDoc(kind, { title = '', lines = [], now = Date.now(), holdMs = 0, rehearsal = false, act = null, beat = null, captions = null, struck = null, parked = null, choices = null, mood = null, prompts = null, video = null } = {}) {
  const doc = { kind, title, lines, at: new Date(now), holdMs, rehearsal: !!rehearsal, act, beat, captions }
  if (struck) doc.struck = struck
  if (parked) doc.parked = parked
  if (choices) doc.choices = choices
  if (mood) doc.mood = mood
  if (prompts) doc.prompts = prompts
  if (video) doc.video = video
  return doc
}

// Does the Parlour TV play bulletin 1 and the closing bulletin as video?
// Decided 23 Oct 2026 (Jon): yes, once the videos exist. Until Jon ticks the
// box on the Game night page (meta/game.bulletinVideo, after the files are in
// play/public/video and deployed), the brain plays the recordings with the
// words on the screen, as before: the handoff's fallback, so a night before
// the videos are made never goes silent.
export async function bulletinVideo(db) {
  const snap = await db.doc('meta/game').get()
  return snap.exists && snap.data().bulletinVideo === true
}

// Sir Irwin's prompts on the TV: a running order from the case's salt, kept
// going across beats (a new round in Act 4 does not start them again), so
// none repeats until all have shown.
export function promptsFor(prev, { seed = '', now = Date.now() } = {}) {
  if (prev?.kind === 'prompts' && prev.prompts?.startedAt) return prev.prompts
  return { lines: PROMPTS, order: promptOrder(seed), startedAt: new Date(now), everyMs: PROMPT_EVERY_MS }
}

export async function readScreen(db, nightId) {
  const snap = await db.doc(screenPath(nightId)).get()
  return snap.exists ? snap.data() : null
}

export async function writeScreen(db, nightId, doc) {
  const check = checkScreen(doc)
  if (!check.ok) { const e = new NightError('invalid', 'That screen carries something it must not.'); e.bad = check.bad.length; throw e }
  await db.doc(screenPath(nightId)).set(doc)
  return { ok: true, kind: doc.kind }
}

// The key the recordings are coded with: the study station key the host
// saves (station.setStationKey, meta/game.station_key; the cue relay has the
// same in cues/.env STATION_KEY). None saved (a rehearsal): null, and the
// clip ids go out as they are.
export async function recordingKey(db) {
  const snap = await db.doc('meta/game').get()
  const key = String(snap.exists ? snap.data().station_key ?? '' : '').trim()
  return key.length >= 4 ? key : null
}

// The sound writer. One id at a time; the relay plays whichever arrives,
// then the recorded clips after it, in order (a W-O-O-F News bulletin). With
// a key saved the clips go out as codes (news.clipCode), so the public doc
// never names a family or a level.
// `video`: the Parlour TV plays these recordings as video with its own sound,
// so the brain plays the id and skips the clips (cues/, handoff §2b.7).
export async function play(db, nightId, id, { now = Date.now(), clips = null, video = false } = {}) {
  const list = (clips ?? []).filter(x => CLIP_IDS.includes(x))
  // id null: recorded lines only (the closing bulletin between the reveal's cards)
  if (id === null ? !list.length : !SOUND_IDS.includes(id)) throw new NightError('invalid', 'No such sound.')
  const key = list.length ? await recordingKey(db) : null
  const sent = key ? list.map(x => clipCode(key, x)) : list
  await db.doc(soundsPath(nightId)).set({ current: { id, at: new Date(now), ...(sent.length ? { clips: sent } : {}), ...(video && sent.length ? { video: true } : {}) } })
  return { ok: true, sound: id }
}

export async function currentSound(db, nightId) {
  const snap = await db.doc(soundsPath(nightId)).get()
  return snap.exists ? snap.data().current ?? null : null
}

// ---------------------------------------------------------------------------
// What the beats read: the case (the Admin SDK's copy) and the workshop lines.

async function caseOf(db, nightId) {
  const snap = await db.doc(`cases/${nightId}`).get()
  return snap.exists ? snap.data() : null
}

// The night's published copy of a list (it honours the freeze) over the live workshop list.
async function linesOf(db, nightId, area) {
  const snap = await db.doc(`nights/${nightId}/public/content`).get()
  const published = snap.exists ? snap.data()?.[area] : null
  if (Array.isArray(published) && published.length) return published
  return readArea(db, area)
}

async function irwinVoice(db) {
  const [openers, closers] = await Promise.all([readArea(db, 'openers'), readArea(db, 'closers')])
  const first = items => items.find(i => i.cat === 'irwin')?.text ?? null
  return { opener: first(openers), closer: first(closers) }
}

// Captions: the last news, bulletin or Irwin lines, kept on the doc through
// dinner so the iPad (?kiosk=ipad) can leave them up while the TV moves on.
function carriedCaptions(prev, act) {
  if (!prev?.captions || !(act <= 3)) return null
  return prev.captions
}

// ---------------------------------------------------------------------------
// The hooks run.js calls.

// A beat moved (run.enterBeat): write the screen the beat names, carry the
// captions, then the beat's sound. `run` is false on the host's Back.
export async function onBeat(db, nightId, { act, beat, spec = null, phase = 'act', now = Date.now(), run = true } = {}) {
  const prev = await readScreen(db, nightId)
  const kind = phase === 'prompt' || phase === 'blackout' ? 'black' : (SCREEN_KINDS.includes(spec?.screen) ? spec.screen : 'idle')
  const nightSnap = await db.doc(`nights/${nightId}`).get()
  const night = nightSnap.exists ? nightSnap.data() : {}
  const base = { now, act, beat, captions: carriedCaptions(prev, act) }
  let doc
  let clips = null
  let video = false
  if (kind === 'news' || kind === 'bulletin' || kind === 'irwin') {
    const c = await caseOf(db, nightId)
    const rehearsal = c?.rehearsal !== false
    const seed = screenSeed(c, nightId) // the case's secret, never the public night id
    if (kind === 'news') {
      // W-O-O-F News bulletin 1: one wrong family crossed off for everyone (news.js); on a
      // rehearsal the family's line is a bracketed stand-in. As video on the Parlour TV (23 Oct).
      const b = bulletin1(c)
      // a rehearsal plays the opening and the sign-off only: the family's recording is a sealed slot too
      clips = rehearsal && !b.placeholder ? [b.clips[0], ...b.clips.slice(2)] : b.clips
      video = await bulletinVideo(db)
      const lines = rehearsal && !b.placeholder ? [b.lines[0], NEWS_STAND_IN, ...b.lines.slice(2)] : b.placeholder ? [...b.lines.slice(0, 1), NEWS_FLASH_PLACEHOLDER, ...b.lines.slice(1)] : b.lines
      // `video: true` only: the TV works out each part's file from the open bank by its words, so no
      // recording's name ever goes on a public doc (a clip id names a family; news.js)
      doc = screenDoc('news', { ...base, title: 'W-O-O-F News', lines, rehearsal, captions: { kind, lines, at: new Date(now) }, video: video ? true : null })
    } else if (kind === 'bulletin') {
      const b = bulletin2(c, dialBand(c?.dial))
      clips = rehearsal && !b.placeholder ? [b.clips[0], ...b.clips.slice(2)] : b.clips
      const lines = rehearsal && !b.placeholder ? [b.lines[0], BULLETIN2_STAND_IN(b.level), ...b.lines.slice(2)] : b.lines
      doc = screenDoc('bulletin', { ...base, title: 'W-O-O-F News', lines, rehearsal, captions: { kind, lines, at: new Date(now) } })
    } else {
      const voice = await irwinVoice(db)
      const clue = irwinMotiveClue(c, { seed, ui: labelled(await linesOf(db, nightId, 'ui_copy')) })
      const lines = irwinLines({ ...voice, names: castNames(night.roster), optionLine: clue.optionLine })
      // on a rehearsal the cards are one bracketed stand-in that says how many would show
      const choices = rehearsal && clue.choices.length ? [{ n: 0, rhyme: IRWIN_STAND_IN(clue.choices.length) }] : clue.choices
      const said = [...lines.slice(0, -1), ...choices.map(x => (x.n ? `${x.n}. ${x.rhyme}` : x.rhyme)), ...lines.slice(-1)]
      doc = screenDoc('irwin', { ...base, title: 'Sir Irwin', lines, choices, mood: clue.mood, rehearsal, captions: { kind, lines: said, at: new Date(now) } })
      if (run) await db.doc(`nights/${nightId}/private/dialClues`).set({ irwin: clue.mood }, { merge: true }) // for the end credits
    }
  } else if (kind === 'prompts') {
    // Sir Irwin's sharing prompts (Act 2's cat visits, Act 4's rounds): one at a time, the TV turns them
    const c = await caseOf(db, nightId)
    doc = screenDoc('prompts', { ...base, title: 'Sir Irwin has ideas', lines: [], rehearsal: !!night.rehearsal, prompts: promptsFor(prev, { seed: screenSeed(c, nightId), now }) })
  } else if (kind === 'title') {
    // the Act 4 title card: silent, jazz from the HomePods
    doc = screenDoc('title', { ...base, title: ACT4_TITLE.title, lines: [ACT4_TITLE.line], rehearsal: !!night.rehearsal })
  } else if (kind === 'door') {
    doc = screenDoc('door', { ...base, title: 'The door is open', lines: ['The light outside the bedroom is green. Go and see.'], holdMs: DOOR_HOLD_MS, rehearsal: !!night.rehearsal })
  } else if (kind === 'board') {
    doc = screenDoc('board', { ...base, title: 'The deduction round', lines: ['Each of you has struck one thing out. Here is the board.'], rehearsal: !!night.rehearsal })
  } else if (kind === 'black') {
    doc = screenDoc('black', { ...base, title: '', lines: [], captions: null })
  } else {
    doc = screenDoc('idle', { ...base, title: NIGHT.acts[String(act)]?.name ?? 'Sirwin Manor', lines: [], rehearsal: !!night.rehearsal })
  }
  const r = await writeScreen(db, nightId, doc)
  let sound = null
  if (run && spec?.sound && SOUND_IDS.includes(spec.sound)) {
    const cur = await currentSound(db, nightId)
    if (!(spec.soundOnce && cur?.id === spec.sound)) { await play(db, nightId, spec.sound, { now, clips, video }); sound = spec.sound }
  }
  return { ...r, sound }
}

// ---------------------------------------------------------------------------
// Bulletin 2 (Act 3): Jon arms it near the end of supper; it plays on its
// own 3 to 5 minutes later (the minute tick), on the HomePod with captions
// on the iPad. The arm writes only a private schedule; the Host tab hears
// "Armed", never the line. nights/{id}/private/bulletin { armedAt, dueAt, played }
export function bulletinPath(nightId) { return `nights/${nightId}/private/bulletin` }

export async function armBulletin(db, nightId, { now = Date.now() } = {}) {
  const ref = db.doc(bulletinPath(nightId))
  const prev = (await ref.get()).data()
  if (prev?.armedAt) return { ok: true, armed: true, already: true }
  const c = await caseOf(db, nightId)
  await ref.set({ armedAt: new Date(now), dueAt: new Date(now + bulletin2Delay(screenSeed(c, nightId))), played: false })
  return { ok: true, armed: true }
}

// The tick: an armed bulletin that is due plays once, whatever beat the night is on.
export async function tickBulletin(db, nightId, now = Date.now()) {
  const ref = db.doc(bulletinPath(nightId))
  const due = await db.runTransaction(async tx => {
    const s = (await tx.get(ref)).data()
    if (!s?.armedAt || s.played || now < msOf(s.dueAt)) return false
    tx.update(ref, { played: true, playedAt: new Date(now) })
    return true
  })
  if (!due) return { played: false }
  const nightSnap = await db.doc(`nights/${nightId}`).get()
  const night = nightSnap.exists ? nightSnap.data() : {}
  const r = await onBeat(db, nightId, { act: night.act ?? 3, beat: night.beat ?? null, spec: { screen: 'bulletin', sound: 'sounder-bulletin' }, now })
  // the level it played at stays with the private schedule, for the solver checks and the end credits
  await ref.update({ level: dialBand((await caseOf(db, nightId))?.dial) })
  return { played: true, sound: r.sound }
}

// The near-black "One moment" card the pause puts up.
export function isPauseCard(doc) {
  return doc?.kind === 'black' && Boolean(doc.title)
}

// The host's phase buttons: the room screens follow. The blackout has its
// sound; the power's return has none since 25 Oct 2026 (cueSounds: the music
// coming back is the cue, and the TV stays dark through the prompt); a pause
// parks the screen under a near-black "One moment" and the resume brings it
// back. A second pause on top of the first changes nothing (the parked
// screen is kept), and a resume with nothing parked puts up the beat's idle
// screen rather than leaving "One moment" on the TV.
export async function onPhase(db, nightId, command, { now = Date.now() } = {}) {
  if (command === 'blackout') {
    await writeScreen(db, nightId, screenDoc('black', { now, title: '' }))
    await play(db, nightId, 'blackout', { now })
    return { ok: true, kind: 'black', sound: 'blackout' }
  }
  if (command === 'power') {
    await writeScreen(db, nightId, screenDoc('black', { now, title: '', act: 2 }))
    return { ok: true, kind: 'black', sound: null }
  }
  if (command === 'pause') {
    const prev = await readScreen(db, nightId)
    if (isPauseCard(prev)) return { ok: true, kind: 'black', already: true } // already parked: never park the card over itself
    const parked = prev ? { ...prev, parked: null } : null
    await writeScreen(db, nightId, screenDoc('black', { now, title: 'One moment', act: prev?.act ?? null, beat: prev?.beat ?? null, captions: prev?.captions ?? null, parked }))
    return { ok: true, kind: 'black' }
  }
  if (command === 'resume') {
    const prev = await readScreen(db, nightId)
    if (prev?.parked) { await writeScreen(db, nightId, { ...prev.parked, parked: null }); return { ok: true, kind: prev.parked.kind } }
    if (isPauseCard(prev)) {
      // nothing was parked (a pause before any screen): the beat's own screen, dark through the blackout and the prompt
      const nightSnap = await db.doc(`nights/${nightId}`).get()
      const night = nightSnap.exists ? nightSnap.data() : {}
      const act = prev.act ?? night.act ?? null
      const beat = prev.beat ?? night.beat ?? null
      const dark = night.phase === 'blackout' || night.phase === 'prompt'
      const doc = dark
        ? screenDoc('black', { now, title: '', act, beat, captions: null })
        : screenDoc('idle', { now, act, beat, title: NIGHT.acts[String(act)]?.name ?? 'Sirwin Manor', lines: [], rehearsal: !!night.rehearsal, captions: prev.captions ?? null })
      await writeScreen(db, nightId, doc)
      return { ok: true, kind: doc.kind }
    }
    return { ok: true, kind: prev?.kind ?? null }
  }
  return { ok: true }
}

// Has the night reached the Act 6 door beat (or gone past it)? The trace
// may go on the TV only from there, so it is never up before the door opens.
export function doorReached(night) {
  const act = Number(night?.act) || 0
  if (act > 6) return true
  if (act !== 6) return false
  const beats = NIGHT.acts['6']?.beats ?? []
  const door = beats.findIndex(b => b.action === 'notice:door')
  const here = beats.findIndex(b => b.key === night?.beat)
  return door >= 0 && here >= door
}

// The host's "Show the trace on the TV" (hostCommand tv-trace): the living
// room screen shows the trace after the door's hold, for a night where the
// bedroom screen has died. Refused before the door beat; off again with the
// arg 'off' at any time.
export async function tvTrace(db, nightId, on, { now = Date.now() } = {}) {
  if (on) {
    const snap = await db.doc(`nights/${nightId}`).get()
    if (!doorReached(snap.exists ? snap.data() : null)) throw new NightError('invalid', 'The trace goes on the TV once the door is open. Press Next to the door first.')
  }
  await db.doc(`nights/${nightId}/public/cues`).set({ tvTrace: !!on, tvTraceAt: new Date(now) }, { merge: true })
  return { ok: true, tvTrace: !!on }
}

// The relay rules on the TV and the phones: three lines, from the workshop's
// RELAY RULES line (split on | or on sentences) or these. The drawer's phone
// never shows the square, and the room guesses on the main screen (handoff §7).
export const DEFAULT_RELAY_RULES = [
  'Sir Irwin calls a name. That person walks to the paper in the Library before the square shows.',
  'Everyone else describes the square on the TV. Words only, no pointing. Ten seconds a turn.',
  'When the grid is full, agree on the picture and tap it on the main screen.',
]
export function relayRules(uiText) {
  const t = String(uiText ?? '').trim()
  if (!t) return DEFAULT_RELAY_RULES
  const parts = (t.includes('|') ? t.split('|') : t.split(/(?<=[.!?])\s+/)).map(s => s.trim()).filter(Boolean)
  return parts.length ? parts.slice(0, 3) : DEFAULT_RELAY_RULES
}

export { msOf }
