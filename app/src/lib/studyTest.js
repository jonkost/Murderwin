// The Study test page, the pure part: how the study station's status reads
// in plain words, and the names the answer pad sends. No Firebase here, so
// node can test it. The callable and the status read live in studyTestApi.js.
//
// The status (public_state/study_test_status, written by the studyTest
// function for the station) is counts, states and the last tap. It never
// holds a round's code or a pattern; the one answer it may carry is the
// colour and count the colour bars would show, and only while they are down.

// The station counts as connected when it reported in this recently. It
// sends a heartbeat every 20 seconds, so two missed beats still count.
export const CONNECTED_MS = 45_000

// The answer pad: the button box's own keys (station/lib/streamdeck.js), in
// the same colours, so the pad and the box look alike.
export const COLOURS = [
  { key: 'red', label: 'Red', rgb: [191, 25, 37] },
  { key: 'yellow', label: 'Yellow', rgb: [230, 190, 40], dark: true },
  { key: 'green', label: 'Green', rgb: [20, 140, 60] },
  { key: 'blue', label: 'Blue', rgb: [20, 70, 200] },
  { key: 'pink', label: 'Pink', rgb: [220, 60, 150] },
  { key: 'white', label: 'White', rgb: [235, 230, 215], dark: true },
]
export const NUMBERS = ['1', '2', '3', '4', '5', '6']
export const KEY_NAMES = [...COLOURS.map(c => c.key), ...NUMBERS, 'undo', 'submit']

// A Firestore Timestamp, a Date, or plain milliseconds, as milliseconds.
export function millisOf(ts) {
  if (ts == null) return null
  if (typeof ts === 'number') return Number.isFinite(ts) ? ts : null
  if (typeof ts.toMillis === 'function') return ts.toMillis()
  if (ts instanceof Date) return ts.getTime()
  if (typeof ts.seconds === 'number') return ts.seconds * 1000 + Math.round((ts.nanoseconds ?? 0) / 1e6)
  return null
}

// Is the station there? `ago` is how long since it last reported, or null
// when it never has.
export function connection(status, now = Date.now()) {
  const at = millisOf(status?.updatedAt)
  if (at === null) return { connected: false, ago: null }
  const ago = Math.max(0, now - at)
  return { connected: ago <= CONNECTED_MS, ago }
}

export function agoWords(ms) {
  if (ms == null) return ''
  const s = Math.round(ms / 1000)
  if (s < 10) return 'just now'
  if (s < 60) return `${s} seconds ago`
  const m = Math.round(s / 60)
  if (m < 60) return m === 1 ? '1 minute ago' : `${m} minutes ago`
  const h = Math.round(m / 60)
  if (h < 48) return h === 1 ? '1 hour ago' : `${h} hours ago`
  return 'more than a day ago'
}

// How long ago the last tap was, on the station's own clock (the tap and
// stationAt both come from it), plus how long the status has been here.
export function tapAgo(status, now = Date.now()) {
  const at = status?.lastTap?.at
  const sent = status?.stationAt
  const here = millisOf(status?.updatedAt)
  if (typeof at !== 'number' || typeof sent !== 'number' || here === null) return null
  return Math.max(0, sent - at) + Math.max(0, now - here)
}

// The walls and the button box, one plain line each.
export function wallLines(status) {
  const el = status?.walls?.elements
  const ln = status?.walls?.lines
  const lines = []
  if (el?.ok) lines.push(`White hexagons: ${el.panels} found. Taps taught: ${el.taught ?? 0} of ${el.panels}.`)
  else lines.push('The white hexagons are not answering. Check the wall is switched on and on the same wifi as the study Mac.')
  if (ln?.ok) lines.push(`Colour bars: ${ln.bars} found.`)
  else lines.push('The colour bars are not answering. A practice round still works: this page shows what they would show.')
  if (status?.deck === 'stream-deck') lines.push('Button box: the Stream Deck is plugged in.')
  else lines.push('Button box: not found. The study Mac\'s keyboard stands in, and so does the answer pad on this page.')
  return lines
}

export function tapLine(lastTap) {
  if (!lastTap) return 'No tap yet. Touch a hexagon and it shows here.'
  if (lastTap.known && lastTap.panel) return `You tapped hexagon ${lastTap.panel}.`
  return 'The station does not know that tap yet. Teach the taps.'
}

export function teachLine(teach) {
  if (!teach) return ''
  return `Hexagon ${teach.step} of ${teach.of} is lit. Tap it.`
}

const PRACTICE_STATE = {
  idle: 'Touch any hexagon to begin.',
  playing: 'Watch the wall.',
  reproducing: 'Your turn: touch it back.',
  entering: 'Enter the colour and the number.',
}

// The practice round's state in words; once it is done, how it ended.
export function practiceLine(practice) {
  if (!practice) return ''
  if (practice.state === 'done') return outcomeLine(practice)
  return PRACTICE_STATE[practice.state] ?? 'The practice round is starting.'
}

export function outcomeLine(practice) {
  const o = practice?.outcome
  if (o === 'solved') return `Done. Solved: all ${practice.rounds} pairs entered.`
  if (o === 'capped') return 'Done. The time ran out before the last pair.'
  if (o === 'stopped') return 'Stopped before the end.'
  return o ? `Done (${o}).` : 'Done.'
}

// "Round 2 of 3, pattern 1 of 3." Not shown once the round is done.
export function roundLine(practice) {
  if (!practice || practice.state === 'done') return ''
  return `Round ${practice.round} of ${practice.rounds}, pattern ${practice.pattern} of ${practice.patterns}.`
}

export function pairsLine(practice) {
  if (!practice) return ''
  return `Pairs entered: ${practice.pairs ?? 0} of ${practice.rounds}.`
}

export function entryLine(practice) {
  const e = practice?.entry ?? {}
  return `Colour: ${e.colour ?? 'not yet'}. Number: ${e.number ?? 'not yet'}.`
}

// Only while the colour bars are down: what they would be showing.
export function shownLine(practice) {
  const s = practice?.shown
  if (!s?.colour) return null
  return `The colour bars are down. They would show: ${s.colour} ${s.number}.`
}

// The page's one line about what the station is doing now.
export function modeLine(status) {
  switch (status?.mode) {
    case 'flash': return 'The walls are flashing.'
    case 'teach': return teachLine(status.teach) || 'Teaching the taps.'
    case 'practice': return 'A practice round is running.'
    default: return 'Resting. Pick something to try.'
  }
}

// A sent button the station has not picked up yet. A station that is off
// skips everything pressed before it starts, so then the button is lost.
export const NOT_KEPT = 'Start the station first. A button tapped while it is off is not kept.'
export function sentLine(sentSeq, status, connected = true) {
  if (!sentSeq) return null
  if ((status?.seenSeq ?? 0) >= sentSeq) return null
  return connected ? 'Sent. Waiting for the station to pick it up.' : NOT_KEPT
}

// The station's key word, checked as the server checks it (functions/lib/station.js).
export function keyWordProblem(word) {
  return String(word ?? '').trim().length < 4 ? 'A key word needs at least four characters.' : null
}

// A failed call, in words Jon can act on.
export function callError(e) {
  const code = String(e?.code ?? '').replace(/^functions\//, '')
  if (code === 'unavailable' || code === 'deadline-exceeded') return 'That did not get through. Check your signal, then try again.'
  if (code === 'not-found' || code === 'internal') return 'That did not get through. If it keeps failing, the studyTest function is not deployed yet: tell Claude Code.'
  if (code === 'unauthenticated') return 'You are signed out. Reload and sign in again.'
  return e?.message || 'That did not go through. Try again.'
}
