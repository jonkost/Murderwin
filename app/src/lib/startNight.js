// The big Start button in the workshop (Jon, 12 Nov 2026: "in the workshop...
// give me the big button there"). The same start as the phone's
// (play/src/lib/start.js, functions/lib/run.js startEvening): a run-through
// unless the box is ticked, the intro at half past four on the real night
// and five minutes after the tap on a run-through. Pure, so app/test can run
// it; a test holds its numbers to the phone's.
export const INTRO_TIME = { hour: 16, minute: 30 }
export const RUN_THROUGH_MS = 5 * 60_000

export function introAtFor({ real = false, now = Date.now() } = {}) {
  if (!real) return now + RUN_THROUGH_MS
  const d = new Date(now)
  d.setHours(INTRO_TIME.hour, INTRO_TIME.minute, 0, 0)
  return d.getTime() > now ? d.getTime() : null
}

export function clockWords(at) {
  const d = new Date(at)
  const h = d.getHours(), m = d.getMinutes()
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h < 12 ? 'am' : 'pm'}`
}

// What the button and the line under it say.
export function startWords({ real = false, now = Date.now() } = {}) {
  const at = introAtFor({ real, now })
  return {
    button: 'Start the night',
    note: real
      ? at ? `The real night. The intro plays at ${clockWords(at)}.` : 'The real night. Press Next on your phone to play the intro.'
      : 'A practice night. The intro plays in five minutes.',
  }
}

// Fill-in players (A4, 11 Nov 2026): a practice night may seat 0 to 8 players
// with no phone. The same rule as the phone's (play/src/lib/start.js): never
// with the real-night box ticked, never from the party day on; the server
// refuses a number on the real night too (functions/lib/run.js).
export const MAX_FILL_INS = 8
export const PARTY_DAY = Date.parse('2026-11-15T12:00:00Z')
export function fillInsOffered({ real = false, now = Date.now() } = {}) { return !real && now < PARTY_DAY }
export function fillInArg({ real = false, fillIns = 0, now = Date.now() } = {}) {
  const n = Math.max(0, Math.min(MAX_FILL_INS, Math.floor(Number(fillIns)) || 0))
  return fillInsOffered({ real, now }) && n > 0 ? { fillIns: n } : {}
}

// The night that is on now, in one line. `live` is { nightId, night } from the workshop's watcher (gameTestApi).
export function liveLine(live) {
  if (!live) return 'Looking for the night…'
  const n = live.night
  if (!live.nightId || !n) return 'No night is on.'
  const kind = n.dryRun ? 'a dry run' : n.forceRehearsal === false ? 'the real night' : 'a practice night'
  const where = Number(n.act) > 0 ? `Act ${n.act}` : 'at the doors'
  return `On now: ${String(n.label ?? '').trim() || 'a night with no name'}, ${kind}, ${where}.`
}

export const REPLACE_ASK = 'Start a new night? The night that is on now ends for every phone and screen.'
export const AFTER_START = 'Started. Send each screen its page, below. On your phone, tap your name to run the night.'

// Each room screen's page, to send to its machine (AirDrop from the share
// sheet), right under the Start button so no phone has to join first. The
// same rooms as the phone's Host tab (play/src/lib/setup.js; a test holds
// the two lists together).
export const SCREENS = [
  { kiosk: 'living', room: 'The Parlour TV', machine: 'Jon’s work MacBook Pro, on the TV' },
  { kiosk: 'study', room: 'The Study', machine: 'M1 MacBook Air, by the walls' },
  { kiosk: 'boo', room: 'The Entryway: Boo’s arcade', machine: 'Susan’s work MacBook Pro, in Chrome, with the big Stream Deck' },
  { kiosk: 'orangerie', room: 'The Orangerie', machine: 'Jon’s M3 MacBook Air (the brain), facing the table' },
  { kiosk: 'ipad', room: 'The iPad', machine: 'Jon’s iPad Pro, carried room to room' },
  { kiosk: 'decor', room: 'The screen saver: any other second screen', machine: 'Any Mac with two screens: its other screen' },
]
export function screenUrl(playUrl, kiosk) {
  return `${String(playUrl ?? '').split('?')[0]}?kiosk=${kiosk}`
}
