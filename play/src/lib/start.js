// The big Start the night button and what follows it (Jon, 12 Nov 2026).
// Pure, so play/test can run it under node --test.
//
// The phone picks when the intro goes and the server keeps it
// (nights/{id}.introAt, functions/lib/run.js startEvening): the real night at
// half past four, a run-through five minutes after the tap, which is time to
// send each screen its page. Every room screen counts down to it on the
// server's clock, and the server moves the night on its own at that moment.
import { SETUP_ROOMS } from './setup.js'

export const INTRO_TIME = { hour: 16, minute: 30 }   // the real night: 4:30 pm, the phone's own time zone
export const RUN_THROUGH_MS = 5 * 60_000             // a run-through: this long after the tap

// When the intro goes, in ms, or null when the real night is started after half past four (Next runs it then).
export function introAtFor({ real = false, now = Date.now() } = {}) {
  if (!real) return now + RUN_THROUGH_MS
  const d = new Date(now)
  d.setHours(INTRO_TIME.hour, INTRO_TIME.minute, 0, 0)
  return d.getTime() > now ? d.getTime() : null
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
