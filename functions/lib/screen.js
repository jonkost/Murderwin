// The room screens and the sounds: what the living room TV (and the iPad)
// shows at the beats that say "look at the screen", and which sound file
// the cue relay plays. One public doc each:
//
//   nights/{id}/public/screen  { kind, title, lines[], at, holdMs, rehearsal, act, beat, captions, struck, parked, choices, mood }
//     kind: idle | black | news | bulletin | irwin | board | door | trace
//   nights/{id}/public/sounds  { current: { id, at } }
//
// Any phone may read both, so NOTHING here carries a role, the dial, the
// motive number, who died, or anything that joins a fragment to a motive.
// The only case fields read are echo.fragment, irwin.lines, dial (to pick a
// band, never written), motive (to keep it OUT of the strike list and IN Sir
// Irwin's Act 5 options, which are the clue itself; never written as a key), screenSalt (the secret the strikes and the frame pick are
// seeded on, never written), solving (Sir Irwin's motive clue, families.js)
// and rehearsal. The one case write is solving.struck: which motives the
// bulletin struck, kept for the memory match and Sir Irwin. checkScreen refuses a doc with a
// forbidden key before it is written, and the tests walk a whole night to
// prove it.
//
// SEAL RULE: nothing here prints, logs or returns content. Results are ok
// flags, kinds and counts.

import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { dirname, join as joinPath } from 'node:path'
import { fileURLToPath } from 'node:url'
import { MOTIVES, CHARACTERS, NightError, readArea } from './night.js'
import { irwinOptions, irwinCount } from './families.js'

const here = dirname(fileURLToPath(import.meta.url))
const NIGHT = JSON.parse(readFileSync(joinPath(here, '..', 'seed', 'night.json'), 'utf8'))

export const SCREEN_KINDS = ['idle', 'black', 'news', 'bulletin', 'irwin', 'board', 'door', 'trace']

// The sound catalogue. A file in media/ per id (media/README.md); the cue
// relay (cues/lib/cues.js) carries the same list and refuses an id outside it.
export const SOUND_IDS = ['chime-news', 'sounder-bulletin', 'chime-irwin', 'sting-solved', 'sting-door', 'sting-reveal', 'sting-result', 'blackout', 'power']

// Keys a public screen doc may never carry, at any depth.
export const FORBIDDEN_SCREEN_KEYS = [
  'roles', 'role', 'dial', 'dialSign', 'dialMap', 'dialLog', 'motive', 'murderer', 'ghost', 'victim', 'victimCharacterId',
  'fragment', 'echo', 'kernels', 'documents', 'hiddenSets', 'studyClue', 'salemTruthIndex', 'granoliaSlot', 'variant',
  'pools', 'exposure', 'dealtClues', 'defaulted', 'tier', 'band', 'level', 'screenSalt',
  'solving', 'family', 'families', 'newsOut', 'hints',
]

export const DOOR_HOLD_MS = 10_000
export const MAX_IRWIN_WORDS = 12

// Safe defaults, used only when the workshop list is empty.
export const DEFAULT_FRAME = { before: '...and the late edition carries one further line:', after: '. The household declined to comment...' }
export const DEFAULT_IRWIN = { opener: 'Oh! Everyone is here. I have something to say.', closer: 'That is everything. I am a good boy.' }
export const REHEARSAL_FRAGMENT = '(Rehearsal. The news fragment for this motive fills the gap here.)'
export const REHEARSAL_IRWIN = '(Rehearsal. Irwin line.)'
export const STRIKE_LINE = 'The constable has ruled out number [N], "[RHYME]".'
// The Act 2 news flash's voiceover rules out a wrong family or two of motives
// for everyone (docs/solving-the-case.md). Its wording is sealed and NOT
// WRITTEN YET (Jenna's job); until it is, the screen carries this marked
// stand-in, which names no family.
export const NEWS_FLASH_PLACEHOLDER = '(Not written yet. Here the news flash rules out one family of motives for everyone.)'
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

// A number in [0, 1) that is the same for the same parts: the bulletin's
// strikes must not change when the host presses the beat twice.
function unit(...parts) {
  const h = createHash('sha256').update(parts.map(String).join('\u0000')).digest()
  return h.readUInt32BE(0) / 0x100000000
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
// How many motives the bulletin strikes: none when the Murderer has the
// upper hand, one at neutral, two when the Ghost has it.
export function strikeCount(dial) {
  const band = dialBand(dial)
  return band <= 2 ? 0 : band === 3 ? 1 : 2
}
// Which of Sir Irwin's three lines: least telling at the low bands, most at the high.
export function irwinTier(dial) {
  const band = dialBand(dial)
  return band <= 2 ? 0 : band === 3 ? 1 : 2
}

// ---------------------------------------------------------------------------
// The echo: one safe frame with a ███ gap, filled with the case's fragment.

export function parseFrame(item) {
  if (!item) return null
  if (typeof item === 'object' && (item.before || item.after) && !item.text) return { before: String(item.before ?? '').trim(), after: String(item.after ?? '').trim() }
  const text = String(typeof item === 'string' ? item : item.text ?? '')
  if (!text.includes('███')) return null
  const [before, ...rest] = text.split('███')
  return { before: before.trim(), after: rest.join('███').trim() }
}

export function frameList(items) {
  return (items ?? []).map(parseFrame).filter(Boolean)
}

// Pick one frame (seeded on the night so a re-run shows the same one) and
// fill its gap. Returns lines, never the fragment on its own.
export function echoLines(c, frames, { seed = '' } = {}) {
  const list = frameList(frames)
  const frame = list.length ? list[Math.floor(unit(seed, 'frame') * list.length)] : DEFAULT_FRAME
  const fragment = typeof c?.echo?.fragment === 'string' && c.echo.fragment.trim() ? c.echo.fragment.trim() : REHEARSAL_FRAGMENT
  const joinBefore = frame.before && !/[\s(]$/.test(frame.before) ? `${frame.before} ` : frame.before
  const joinAfter = frame.after && !/^[\s.,;:!?)]/.test(frame.after) ? ` ${frame.after}` : frame.after
  return [`${joinBefore}${fragment}${joinAfter}`.replace(/\s+/g, ' ').trim()]
}

// ---------------------------------------------------------------------------
// Act 3: the bulletin. The echo again, plus up to two motives the constable
// has ruled out, never the active one, seeded on the case's secret. Every
// motive is ranked by the seed and its own number alone (never by its place
// in a list the active motive was taken out of), so the ranking says
// nothing about which motive is missing.

export function struckMotives(c, { seed = '', motives = MOTIVES } = {}) {
  const count = strikeCount(c?.dial)
  if (!count) return []
  const others = motives.filter(m => m.n !== Number(c?.motive))
  const order = others.map(m => ({ m, r: unit(seed, 'strike', m.n) })).sort((a, b) => a.r - b.r).map(x => x.m)
  return order.slice(0, count).map(m => ({ n: m.n, rhyme: m.rhyme }))
}

export function bulletinLines(c, frames, { seed = '', motives = MOTIVES, strikeLine = STRIKE_LINE } = {}) {
  const struck = struckMotives(c, { seed, motives })
  const lines = [...echoLines(c, frames, { seed }), ...struck.map(s => strikeLine.replace('[N]', String(s.n)).replace('[RHYME]', s.rhyme))]
  return { lines, struck }
}

// ---------------------------------------------------------------------------
// Act 5: Sir Irwin on the living room screen. Opener + one sealed line +
// closer, put through the dog filter: twelve words at most, and no name of
// anyone at the party or in the cast.

export function dogFilter(text, names = []) {
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
  if (words.length > MAX_IRWIN_WORDS) t = `${words.slice(0, MAX_IRWIN_WORDS).join(' ').replace(/[,;:]$/, '')}.`
  return t
}

export function castNames(roster = {}) {
  const names = []
  for (const r of Object.values(roster ?? {})) if (r?.name) names.push(r.name)
  for (const ch of CHARACTERS) names.push(ch.name)
  return names
}

export function irwinLines(c, { opener, closer, names = [], optionLine = null } = {}) {
  const list = Array.isArray(c?.irwin?.lines) ? c.irwin.lines.filter(l => typeof l === 'string' && l.trim()) : []
  const tier = Math.min(list.length - 1, irwinTier(c?.dial))
  const middle = list.length ? list[Math.max(0, tier)] : REHEARSAL_IRWIN
  const lines = [opener || DEFAULT_IRWIN.opener, middle]
  if (optionLine) lines.push(optionLine)
  lines.push(closer || DEFAULT_IRWIN.closer)
  return lines.map(l => dogFilter(l, names)).filter(Boolean)
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

export function screenDoc(kind, { title = '', lines = [], now = Date.now(), holdMs = 0, rehearsal = false, act = null, beat = null, captions = null, struck = null, parked = null, choices = null, mood = null } = {}) {
  const doc = { kind, title, lines, at: new Date(now), holdMs, rehearsal: !!rehearsal, act, beat, captions }
  if (struck) doc.struck = struck
  if (parked) doc.parked = parked
  if (choices) doc.choices = choices
  if (mood) doc.mood = mood
  return doc
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

// The sound writer. One id at a time; the relay plays whichever arrives.
export async function play(db, nightId, id, { now = Date.now() } = {}) {
  if (!SOUND_IDS.includes(id)) throw new NightError('invalid', 'No such sound.')
  await db.doc(soundsPath(nightId)).set({ current: { id, at: new Date(now) } }, { merge: true })
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
  if (kind === 'news' || kind === 'bulletin' || kind === 'irwin') {
    const c = await caseOf(db, nightId)
    const rehearsal = c?.rehearsal !== false
    const seed = screenSeed(c, nightId) // the case's secret, never the public night id
    if (kind === 'news') {
      // the echo, then the news flash's voiceover: a family or two ruled out for everyone (families.js)
      const lines = [...echoLines(c, await linesOf(db, nightId, 'echo_frames'), { seed }), NEWS_FLASH_PLACEHOLDER]
      doc = screenDoc('news', { ...base, title: 'News', lines, rehearsal, captions: { kind, lines, at: new Date(now) } })
    } else if (kind === 'bulletin') {
      const ui = labelled(await linesOf(db, nightId, 'ui_copy'))
      const strikeLine = ui['STRIKE LINE']?.includes('[RHYME]') ? ui['STRIKE LINE'] : STRIKE_LINE
      const { lines, struck } = bulletinLines(c, await linesOf(db, nightId, 'echo_frames'), { seed, strikeLine })
      // what the bulletin struck is kept with the case, for the memory match and Sir Irwin (families.js)
      if (c?.solving) await db.doc(`cases/${nightId}`).update({ 'solving.struck': struck.map(x => x.n) })
      doc = screenDoc('bulletin', { ...base, title: 'The bulletin', lines, struck, rehearsal, captions: { kind, lines, at: new Date(now) } })
    } else {
      const voice = await irwinVoice(db)
      const clue = irwinMotiveClue(c, { seed, ui: labelled(await linesOf(db, nightId, 'ui_copy')) })
      const lines = irwinLines(c, { ...voice, names: castNames(night.roster), optionLine: clue.optionLine })
      const said = [...lines.slice(0, -1), ...clue.choices.map(x => `${x.n}. ${x.rhyme}`), ...lines.slice(-1)]
      doc = screenDoc('irwin', { ...base, title: 'Sir Irwin', lines, choices: clue.choices, mood: clue.mood, rehearsal, captions: { kind, lines: said, at: new Date(now) } })
    }
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
    if (!(spec.soundOnce && cur?.id === spec.sound)) { await play(db, nightId, spec.sound, { now }); sound = spec.sound }
  }
  return { ...r, sound }
}

// The near-black "One moment" card the pause puts up.
export function isPauseCard(doc) {
  return doc?.kind === 'black' && Boolean(doc.title)
}

// The host's phase buttons: the room screens follow. Blackout and the
// power each have a sound; a pause parks the screen under a near-black
// "One moment" and the resume brings it back. A second pause on top of the
// first changes nothing (the parked screen is kept), and a resume with
// nothing parked puts up the beat's idle screen rather than leaving "One
// moment" on the TV.
export async function onPhase(db, nightId, command, { now = Date.now() } = {}) {
  if (command === 'blackout') {
    await writeScreen(db, nightId, screenDoc('black', { now, title: '' }))
    await play(db, nightId, 'blackout', { now })
    return { ok: true, kind: 'black', sound: 'blackout' }
  }
  if (command === 'power') {
    await writeScreen(db, nightId, screenDoc('black', { now, title: '', act: 2 }))
    await play(db, nightId, 'power', { now })
    return { ok: true, kind: 'black', sound: 'power' }
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
// RELAY RULES line (split on | or on sentences) or these.
export const DEFAULT_RELAY_RULES = [
  'One of you draws what your phone shows, without looking at the paper.',
  'Everyone else shouts directions. Ten seconds, then the next person walks up.',
  'When the grid is full, vote on your phone for the picture it makes.',
]
export function relayRules(uiText) {
  const t = String(uiText ?? '').trim()
  if (!t) return DEFAULT_RELAY_RULES
  const parts = (t.includes('|') ? t.split('|') : t.split(/(?<=[.!?])\s+/)).map(s => s.trim()).filter(Boolean)
  return parts.length ? parts.slice(0, 3) : DEFAULT_RELAY_RULES
}

export { msOf }
