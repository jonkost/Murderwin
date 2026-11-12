// The permissions screen at sign-in (docs/handoff-2026-10-23.md §9.10): one
// Allow button, then a check beside each line. Motion, for Salem's Motion
// Game in Act 4; sound, so the phone's own chime can play; and the screen
// kept awake. No notifications, ever, and no camera (guests scan the room
// codes with the phone's own camera). An iPhone may ask again after a reload,
// so the You tab keeps a quiet Allow again link.
//
// Each ask returns 'ok', 'denied' or 'none' (this phone cannot). Nothing here
// throws: a phone that says no still plays the whole game (a phone with no
// motion never slips in Salem's game; the room still hears the chime from
// every other phone and room screen).
//
// Sound (11 Nov 2026): the phone's sound is the page's one AudioContext, the
// house's sound kit's (lib/soundkit.js), woken here and again by the first
// tap after any reload (lib/cueSounds.js installUnlock). With it on, the
// phone plays every cue the night calls (lib/useCueSounds.js), and an iPhone
// plays them with its ring switch on silent.

import { play as playSound } from './soundkit.js'
import { wakeSound } from './cueSounds.js'

export const PERMISSION_LINES = [
  { key: 'motion', text: 'Motion: one game asks you to shake your phone.' },
  { key: 'sound', text: 'Sound: so the chimes can play.' },
  { key: 'awake', text: 'Keep the screen awake.' },
]

// iOS asks for motion from a tap (DeviceMotionEvent.requestPermission);
// everything else simply has it, or has no sensor at all.
export async function askMotion(w = globalThis.window) {
  const D = w?.DeviceMotionEvent
  if (!D) return 'none'
  if (typeof D.requestPermission === 'function') {
    try { return (await D.requestPermission()) === 'granted' ? 'ok' : 'denied' } catch { return 'denied' }
  }
  return 'ok'
}

// One tap unlocks sound for the page: the kit's one AudioContext, woken.
export function unlockSound(w = globalThis.window) {
  return wakeSound(w).catch(() => 'denied')
}

// The house's chime on the phone itself, once sound is unlocked: for the
// moments the phone calls its guest (iPhones cannot vibrate from a web page).
// Three warm notes from the kit, more than twice as loud as the two beeps
// this was until 11 Nov 2026 ("It was hard to hear the chimes").
export function chime() {
  return playSound('chime')
}

// The screen kept awake (the Screen Wake Lock API). The browser lets go of
// the lock when the page is hidden, so it is asked for again on coming back.
let lock = null
let watching = false
export async function keepAwake(w = globalThis.window, d = globalThis.document) {
  const wl = w?.navigator?.wakeLock
  if (!wl?.request) return 'none'
  const take = async () => {
    try { lock = await wl.request('screen'); return 'ok' } catch { return 'denied' }
  }
  if (!watching && d?.addEventListener) {
    watching = true
    d.addEventListener('visibilitychange', () => { if (d.visibilityState === 'visible' && (!lock || lock.released)) take() })
  }
  return take()
}

// All three, from the one Allow tap. The sound is asked for first, in the
// tap itself: a browser lets a page wake its sound only inside a tap, and an
// iPhone's motion question can keep the guest longer than a tap lasts.
export async function allowAll(w = globalThis.window, d = globalThis.document) {
  const waking = unlockSound(w)
  const motion = await askMotion(w)
  const sound = await waking
  const awake = await keepAwake(w, d)
  return { motion, sound, awake }
}
