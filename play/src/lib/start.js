// The big Start the night button and what follows it (Jon, 12 Nov 2026).
// Pure, so play/test can run it under node --test.
//
// The phone picks when the intro goes and the server keeps it
// (nights/{id}.introAt, functions/lib/run.js startEvening): the real night at
// half past four, a run-through five minutes after the tap, which is time to
// send each screen its page. Every room screen counts down to it on the
// server's clock, and the server moves the night on its own at that moment.
import { SETUP_ROOMS, SECOND_DISPLAY, SECOND_DISPLAY_ROOMS } from './setup.js'

export const INTRO_TIME = { hour: 16, minute: 30 }   // the real night: 4:30 pm, the phone's own time zone
export const RUN_THROUGH_MS = 5 * 60_000             // a run-through: this long after the tap

// When the intro goes, in ms, or null when the real night is started after half past four (Next runs it then).
export function introAtFor({ real = false, now = Date.now() } = {}) {
  if (!real) return now + RUN_THROUGH_MS
  const d = new Date(now)
  d.setHours(INTRO_TIME.hour, INTRO_TIME.minute, 0, 0)
  return d.getTime() > now ? d.getTime() : null
}

// Fill-in players (the polish pass, job A4, 11 Nov 2026): on a practice night
// the Start card can seat 0 to 8 players with no phone, who play along on
// their own (functions/lib/fillins.js). Never on the real night: the row is
// not shown with the box ticked or from the party day on, the number is not
// sent, and the server seats nobody on a real night whatever it is sent.
export const MAX_FILL_INS = 8
// The party day, the same moment the server holds (functions/lib/morning.js PARTY_DAY; a test keeps them equal).
export const PARTY_DAY = Date.parse('2026-11-15T12:00:00Z')
// The party day itself: from the moment the server takes the real box (PARTY_DAY) through
// that night's small hours. On it a practice start asks first, and a practice night that is
// on says so in red on the Host tab (12 Nov 2026: with the box forgotten, the party would
// run on the practice case, the practice bags and the practice pictures, and look the same).
export const PARTY_DAY_MS = 20 * 60 * 60_000
export function onPartyDay(now = Date.now()) {
  return now >= PARTY_DAY && now < PARTY_DAY + PARTY_DAY_MS
}
export const PRACTICE_ASK = 'Today is the party. This starts a practice night, not the real night. Start a practice night anyway? To start the real night, press Cancel and tick This is the real night.'
export const PRACTICE_NOTE = 'A practice night, not the party. For the party, tick This is the real night.'
// A host phone on a live night starts another: the same question the workshop's button asks.
export const REPLACE_ASK = 'Start a new night? The night that is on now ends for every phone and screen.'
export function fillInCount(n) {
  const k = Math.floor(Number(n))
  return Number.isFinite(k) ? Math.max(0, Math.min(MAX_FILL_INS, k)) : 0
}
// Does the Start card show the Fill-in players row? A practice night before the party day, and nothing else.
export function fillInsOffered({ real = false, now = Date.now() } = {}) {
  return !real && now < PARTY_DAY
}
// What the Start button adds to its call: { fillIns } on a practice night that asked for some, nothing otherwise.
export function fillInArg({ real = false, fillIns = 0, now = Date.now() } = {}) {
  const n = fillInCount(fillIns)
  return fillInsOffered({ real, now }) && n > 0 ? { fillIns: n } : {}
}
// The line under the button, for a practice night with fill-ins.
export function fillInWords(n) {
  const k = fillInCount(n)
  if (!k) return ''
  return k === 1 ? '1 fill-in player joins with no phone.' : `${k} fill-in players join with no phone.`
}

const millis = t => (t?.toMillis ? t.toMillis() : Number(t) || 0)

// What is left before the intro, in ms, or null when nothing is counting:
// only at Arrivals, only while the night is playing, only with a time set.
export function countdownLeft(night, now) {
  if (!night || night.phase !== 'act' || night.act !== 1 || night.beat !== 'arrive') return null
  const at = millis(night.introAt)
  if (!at) return null
  // the host came back to Arrivals after the time had passed: nothing counts, nothing fires (run.js introDue)
  if (millis(night.beatAt) >= at) return null
  return Math.max(0, at - now)
}

// 5400000 -> "1:30:00", 299000 -> "4:59", 0 -> "0:00"
export function countdownText(ms) {
  const s = Math.max(0, Math.ceil(ms / 1000))
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60
  const two = n => String(n).padStart(2, '0')
  return h ? `${h}:${two(m)}:${two(sec)}` : `${m}:${two(sec)}`
}

// "4:30 pm", in the time zone of the phone that reads it
export function clockWords(at) {
  const d = new Date(millis(at))
  const h = d.getHours(), m = d.getMinutes()
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h < 12 ? 'am' : 'pm'}`
}

// Each room screen's own page, for the Host tab's Send buttons: the address
// to share (AirDrop) and the heartbeat that says the screen is up.
export function screenLinks(playUrl) {
  const base = String(playUrl ?? '').split('?')[0]
  return SETUP_ROOMS.map(r => ({ key: r.key, room: r.room, machine: r.machine, when: r.when, url: `${base}?kiosk=${r.kiosk}`, presenceKey: `kiosk-${r.kiosk}` }))
}
// The page for a Mac's second display: sent like the rest, with no dot (it is not one of the night's machines).
export function secondDisplayLink(playUrl) {
  const base = String(playUrl ?? '').split('?')[0]
  return { key: SECOND_DISPLAY.key, room: SECOND_DISPLAY.room, machine: SECOND_DISPLAY.machine, url: `${base}?kiosk=${SECOND_DISPLAY.kiosk}`, presenceKey: null }
}
// The two Macs' own screens, then the one for any other second screen: all three play the screen saver since the
// evening of 12 Nov 2026, and are named for it (lib/setup.js).
export function secondDisplayLinks(playUrl) {
  const base = String(playUrl ?? '').split('?')[0]
  return [...SECOND_DISPLAY_ROOMS.map(r => ({ key: r.key, room: r.room, machine: r.machine, url: `${base}?kiosk=${r.kiosk}&${r.query}`, presenceKey: null })), secondDisplayLink(playUrl)]
}

// The intro video on the Parlour TV at The house rules, from the moment the
// beat began. A screen that reloads later joins it part-way; long after, it
// shows the join code again. `seconds` is the film's length once known.
export const INTRO_VIDEO = 'video/sirwin-intro.mp4'
export const INTRO_LATE_MS = 20 * 60_000
export function introPlaying(night, now) {
  if (!night || night.act !== 1 || night.beat !== 'rules') return null
  const at = millis(night.beatAt)
  if (!at) return null
  const since = now - at
  if (since < 0 || since > INTRO_LATE_MS) return null
  return { startedAt: at, offset: since / 1000 }
}
