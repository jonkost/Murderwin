import { ms } from './night.js'
import { troubleLine } from './trouble.js'

// The pages the workshop's Game test tab opens (24 Oct 2026), so a game can
// be tried before the night without a night:
//   ?practice=salem             Get Off My Lawn! on any phone
//   ?kiosk=orangerie&practice=1 Salem's board for the Get Off My Lawn! practice (31 Oct 2026)
//   ?preview=questions&set=…    one of the workshop's Parlour Game sets, as a phone shows it
// (Miss Boo LaRue's Arcade practises on its own page, ?kiosk=boo&play=1.)
// Salem's practice follows its own record in public_state (game_test_salem),
// written only by the gameTest function. It never reads or
// writes a night, never pays anyone, and never writes presence (its clock
// asks the gameTest function instead). Pure (no React, no Firebase) so
// play/test can run it.

export const PRACTICE_DOCS = { salem: 'public_state/game_test_salem' }

// Which practice page the address asks for: 'salem' (the phones),
// 'orangerie-wall' (?kiosk=orangerie&practice=1,
// Salem's board on the brain's browser, 31 Oct 2026), or null for none.
export function practiceParam(search) {
  try {
    const p = new URLSearchParams(search ?? window.location.search)
    const v = p.get('practice')
    if (!v) return null
    const kiosk = p.get('kiosk')
    if (kiosk) return kiosk === 'orangerie' ? 'orangerie-wall' : null
    return v === 'salem' ? v : null
  } catch { return null }
}

// ---------------------------------------------------------------------------
// The first name a practice phone joins under: asked once, kept in this
// browser. Any storage may be missing or refuse (a private window).

export const NAME_KEY = 'practice-name'
export function cleanName(name) {
  return String(name ?? '').replace(/\s+/g, ' ').trim().slice(0, 30)
}
export function savedName(storage) {
  try { return cleanName((storage ?? globalThis.localStorage)?.getItem(NAME_KEY)) } catch { return '' }
}
export function saveName(name, storage) {
  try { (storage ?? globalThis.localStorage)?.setItem(NAME_KEY, cleanName(name)) } catch { /* the name lasts this visit only */ }
}

// ---------------------------------------------------------------------------
// Get Off My Lawn! practice: public_state/game_test_salem
//   { runId, state: idle | playing | passed | done, round (1..3), attempt,
//     startsAt, cleanAt, flips, slips, lastSlip, players: { [uid]: { name, at } } }
// The practice's idle names the round Ready will play; passed is all three
// done; done is closed from the workshop. The phone plays the record with the
// same component as the night (screens/Act4.jsx SalemRounds), so it is
// turned into the night's shape: intro (round 1 to come), passed (a round
// passed, the next to come), playing, cleared.

const SALEM_ROUNDS = 3 // functions/lib/act4.js SALEM_ROUNDS

export function practicePlayers(doc) {
  return Object.entries(doc?.players ?? {})
    .filter(([, p]) => p && typeof p.name === 'string' && p.name.trim())
    .sort((a, b) => ms(a[1].at) - ms(b[1].at))
    .map(([uid, p]) => ({ uid, name: cleanName(p.name) }))
}

export function salemPractice(doc, uid = null) {
  const players = practicePlayers(doc)
  const joined = !!(uid && doc?.players?.[uid])
  const runId = doc?.runId ?? null
  if (!doc || !doc.state) return { status: 'none', runId, players, joined: false, game: null }
  if (doc.state === 'done') return { status: 'closed', runId, players, joined, game: null }
  const round = Math.min(SALEM_ROUNDS, Math.max(1, Math.round(Number(doc.round) || 1)))
  const state = doc.state === 'playing' ? 'playing' : doc.state === 'passed' ? 'cleared' : round > 1 ? 'passed' : 'intro'
  const game = {
    state, round, attempt: Number(doc.attempt) || 0,
    flips: Array.isArray(doc.flips) ? doc.flips : [],
    startsAt: doc.startsAt ?? null, cleanAt: doc.cleanAt ?? null,
    slips: Number(doc.slips) || 0, lastSlip: doc.lastSlip === 'red' || doc.lastSlip === 'green' ? doc.lastSlip : null,
    // the limits and the slips a round allows, so the practice shows and keeps the night's countdown (A9, 12 Nov 2026)
    roundEndsAt: doc.roundEndsAt ?? null, gameEndsAt: doc.gameEndsAt ?? null,
    maxSlips: Number(doc.maxSlips) || null, letThrough: doc.letThrough === true,
  }
  return { status: 'open', runId, players, joined, game }
}

// A plain line for each slip, under the game on the practice page.
export const SLIP_LINES = {
  green: 'Someone moved. From the top!', // A9, 12 Nov 2026: the night's one restart line
  red: 'Someone froze. From the top!',
  other: 'Someone slipped. From the top!',
}
export function slipLine(colour) {
  return SLIP_LINES[colour] ?? SLIP_LINES.other
}

// The slips between two readings of the record, oldest first: none on the
// first reading or a new practice (only what happens while the page is open
// is listed; the count of the round's slips shows anyway). Ready starts a
// round with no slips, so only a restart of the same round counts.
export function slipsSince(prev, next) {
  if (!prev || !next || next.state !== 'playing') return []
  if ((prev.runId ?? null) !== (next.runId ?? null)) return []
  if ((Number(next.attempt) || 0) <= (Number(prev.attempt) || 0)) return []
  const was = Number(prev.round) === Number(next.round) ? Number(prev.slips) || 0 : 0
  const n = Math.max(0, (Number(next.slips) || 0) - was)
  const round = Math.min(SALEM_ROUNDS, Math.max(1, Math.round(Number(next.round) || 1)))
  return Array.from({ length: n }, (_, i) => {
    const colour = i === n - 1 ? next.lastSlip ?? null : null
    return { round, colour, line: slipLine(colour) }
  })
}

// ---------------------------------------------------------------------------
// The practice pages' clock. A practice never writes presence/{uid}: that
// row is the whole browser's, shared by its tabs, and a room screen's calls
// are let in by it (functions/lib/access.js mayTouchNight), so a practice tab
// left open beside the Parlour TV page would take the TV's place. Instead the
// page asks the gameTest function the time ('clock'), and keeps the reading
// with the shortest round trip (the first call may wake the function, and a
// slow answer says less about when the server read its clock).

export const CLOCK_KEEP_MS = 10 * 60_000
export function clockSample(t0, t1, serverNow) {
  const at = Number(serverNow)
  if (!Number.isFinite(at) || !(t1 >= t0)) return null
  return { skew: at - (t0 + t1) / 2, rtt: t1 - t0, at: t1 }
}
export function keepSample(prev, next) {
  if (!next) return prev ?? null
  if (!prev || next.at - prev.at > CLOCK_KEEP_MS || next.rtt <= prev.rtt) return next
  return prev
}

// What a practice phone says when a call fails. A server sentence (the
// practice is full, closed, not joined) is shown without the HTTP status the
// Firebase library puts after it; the bare codes it gives for a weak signal
// or a function that did not answer never reach the screen (lib/trouble.js,
// the same rule as the night's screens, 29 Oct 2026).
export const NO_ANSWER = 'The house did not answer. Check your signal and try again.'
export function practiceError(e) {
  return troubleLine(e, NO_ANSWER)
}


// ---------------------------------------------------------------------------
// One of the workshop's Parlour Game sets, as a phone shows it:
// ?preview=questions&set=<base64url of JSON { title, questions: [{ q, a, b }] x 3 }>.
// The phone's shape is the night's (functions/lib/deal.js stripValues): three
// questions, two choices each, no numbers. Anything else in the set is left
// out, so nothing but the words could ever show.

const MAX_SET = 8000
const clip = (s, n) => String(s ?? '').replace(/\s+/g, ' ').trim().slice(0, n)

export function decodeSet(param) {
  if (typeof param !== 'string' || !param.trim() || param.length > MAX_SET) return { set: null, problem: 'unreadable' }
  let data
  try {
    // a '+' that came through the address unescaped arrives as a space
    let b = param.trim().replace(/ /g, '+').replace(/-/g, '+').replace(/_/g, '/').replace(/=+$/, '')
    while (b.length % 4) b += '='
    const bin = atob(b)
    let text
    try { text = new TextDecoder('utf-8', { fatal: true }).decode(Uint8Array.from(bin, c => c.charCodeAt(0))) } catch { text = bin }
    data = JSON.parse(text)
  } catch { return { set: null, problem: 'unreadable' } }
  if (!data || typeof data !== 'object') return { set: null, problem: 'unreadable' }
  const list = Array.isArray(data.questions) ? data.questions : Array.isArray(data.beats) ? data.beats : null
  if (!list) return { set: null, problem: 'unreadable' }
  const beats = list.map(x => ({ q: clip(x?.q, 300), a: clip(x?.a, 120), b: clip(x?.b, 120) }))
  const title = clip(data.title, 80)
  if (beats.length !== 3 || !beats.every(x => x.q && x.a && x.b)) return { set: null, title, problem: 'not-ready' }
  return { set: { title, beats: beats.map(x => ({ q: x.q, choices: [{ k: 'a', text: x.a }, { k: 'b', text: x.b }] })) }, title, problem: null }
}

// What the preview shows: the set from the address, or the sample set with a
// line that says why. No set in the address: the sample, with no line.
export const SET_NOTES = {
  shown: title => `This is how a phone shows ${title ? `“${title}”` : 'this set'}. Nothing is sent.`,
  'not-ready': 'This set is not ready yet: a Parlour Game needs three questions, each with two answers. Here is the sample set instead.',
  unreadable: 'This set could not be read. Here is the sample set instead.',
}
export function setFromAddress(search, sample) {
  let param = null
  try { param = new URLSearchParams(search ?? window.location.search).get('set') } catch { param = null }
  if (param == null) return { beats: sample, title: null, note: null, sample: true }
  const r = decodeSet(param)
  if (!r.set) return { beats: sample, title: r.title || null, note: SET_NOTES[r.problem] ?? SET_NOTES.unreadable, sample: true }
  return { beats: r.set.beats, title: r.set.title || null, note: SET_NOTES.shown(r.set.title), sample: false }
}

// The other way round (for the tests; the workshop makes its own addresses).
export function encodeSet(set) {
  const bytes = new TextEncoder().encode(JSON.stringify(set))
  let bin = ''
  for (const b of bytes) bin += String.fromCharCode(b)
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}
