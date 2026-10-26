import { ms } from './night.js'

// The pages the workshop's Game test tab opens (24 Oct 2026), so a game can
// be tried before the night without a night:
//   ?practice=salem             Get Off My Lawn! on any phone
//   ?practice=boo               Boo's Catwalk on the phones
//   ?kiosk=boo&practice=1       the same show on the wall
//   ?preview=questions&set=…    one of the workshop's Parlour Game sets, as a phone shows it
// A practice follows its own record in public_state (game_test_salem,
// game_test_boo), written only by the gameTest function. It never reads or
// writes a night, never pays anyone, and never writes presence (its clock
// asks the gameTest function instead). Pure (no React, no Firebase) so
// play/test can run it.

export const PRACTICE_DOCS = { salem: 'public_state/game_test_salem', boo: 'public_state/game_test_boo' }

// Which practice page the address asks for: 'salem', 'boo' (the phones),
// 'boo-wall' (?kiosk=boo&practice=1), or null for none.
export function practiceParam(search) {
  try {
    const p = new URLSearchParams(search ?? window.location.search)
    const v = p.get('practice')
    if (!v) return null
    const kiosk = p.get('kiosk')
    if (kiosk) return kiosk === 'boo' ? 'boo-wall' : kiosk === 'pose' ? 'pose-wall' : null
    return v === 'salem' || v === 'boo' ? v : null
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
  }
  return { status: 'open', runId, players, joined, game }
}

// A plain line for each slip, under the game on the practice page.
export const SLIP_LINES = {
  green: 'Someone moved on green. The round starts again.',
  red: 'Someone stopped shaking on red. The round starts again.',
  other: 'Someone slipped. The round starts again.',
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
// practice is full, closed, not joined) is shown as it is; the bare codes
// the Firebase library gives for a weak signal or a function that did not
// answer never reach the screen.
export const NO_ANSWER = 'The house did not answer. Check your signal and try again.'
const SAID_BY_SERVER = new Set(['permission-denied', 'failed-precondition', 'not-found', 'resource-exhausted', 'invalid-argument', 'already-exists', 'unauthenticated'])
export function practiceError(e) {
  const code = String(e?.code ?? '').replace(/^functions\//, '')
  const message = String(e?.message ?? '').trim()
  const sentence = message.includes(' ') && message !== code
  if (SAID_BY_SERVER.has(code) && sentence) return message
  return NO_ANSWER
}

// ---------------------------------------------------------------------------
// Boo's Catwalk practice: public_state/game_test_boo
//   { runId, state: idle | playing | done, startsAt, poses: [{ stopAt, holdUntil, judgedAt }] x 3, endsAt }
// The wall and the phones play it with the night's components (Rooms.jsx
// BooRunway, Act4.jsx BooMoments), which read the night's shape: poses of
// { strutAt, poseAt, holdUntil, judgeUntil, line }. A practice record does not
// carry Boo's lines, so each pose takes one of her own, picked from the
// practice's id: the wall and every phone pick the same one.

// The night's numbers and words (functions/lib/act4.js; play/test checks they match).
export const BOO_INTRO_MS = 9_000
export const BOO_STRUT_MS = [7_000, 12_000]
export const BOO_JUDGE_MS = 6_000
export const BOO_JUDGING = [
  'Dreadful. I loved it.',
  'Bold. Wrong, but bold.',
  "I've seen worse. Last Tuesday.",
  'Somebody get these people a drink so I can knock it off a table.',
  'Fine. Fine! You may stay.',
  "I'm telling everyone about this. Everyone.",
]

function hashOf(s) {
  let h = 0
  for (const c of String(s ?? '')) h = (Math.imul(h, 31) + c.charCodeAt(0)) >>> 0
  return h
}
export function booPracticeLine(runId, i) {
  return BOO_JUDGING[(hashOf(runId) + i) % BOO_JUDGING.length]
}

// { status: none | idle | show, show }: `show` in the night's shape, ready for
// booMoment. A practice laid out like the night's show (Boo's welcome before
// the first strut) keeps its welcome; one that starts straight on the strut
// has none. A verdict always gets its time on the wall.
export function booPractice(doc) {
  const runId = doc?.runId ?? null
  if (!doc || !doc.state) return { status: 'none', runId, show: null }
  const start = ms(doc.startsAt)
  if (!start || doc.state === 'idle' || !Array.isArray(doc.poses) || !doc.poses.length) return { status: 'idle', runId, show: null }
  let end = start
  const poses = []
  doc.poses.forEach((p, i) => {
    const poseAt = ms(p?.stopAt ?? p?.poseAt)
    const holdUntil = ms(p?.holdUntil)
    if (!poseAt || !holdUntil || holdUntil < poseAt) return
    let judgeUntil = ms(p?.judgedAt ?? p?.judgeUntil)
    if (!(judgeUntil > holdUntil)) judgeUntil = holdUntil + BOO_JUDGE_MS
    let strutAt = p?.strutAt ? ms(p.strutAt) : end
    if (!p?.strutAt && poses.length === 0 && poseAt - start >= BOO_INTRO_MS + BOO_STRUT_MS[0]) strutAt = start + BOO_INTRO_MS
    poses.push({ strutAt, poseAt, holdUntil, judgeUntil, line: typeof p?.line === 'string' && p.line ? p.line : booPracticeLine(runId, i) })
    end = judgeUntil
  })
  if (!poses.length) return { status: 'idle', runId, show: null }
  const show = { groupId: 'practice', state: doc.state === 'done' ? 'done' : 'show', startsAt: start, poses, endsAt: Math.max(ms(doc.endsAt), end) }
  return { status: 'show', runId, show }
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
