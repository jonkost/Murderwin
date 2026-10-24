// The permissions screen at sign-in (docs/handoff-2026-10-23.md §9.10): one
// Allow button, then a check beside each line. Motion, for Salem's Motion
// Game in Act 4; sound, so the phone's own chime can play; and the screen
// kept awake. No notifications, ever, and no camera (guests scan the room
// codes with the phone's own camera). An iPhone may ask again after a reload,
// so the You tab keeps a quiet Allow again link.
//
// Each ask returns 'ok', 'denied' or 'none' (this phone cannot). Nothing here
// throws: a phone that says no still plays the whole game (a phone with no
// motion never slips in Salem's game; the room still hears the brain's chime).

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

// One tap unlocks sound for the page: a silent moment through an AudioContext.
let audio = null
export async function unlockSound(w = globalThis.window) {
  const AC = w?.AudioContext || w?.webkitAudioContext
  if (!AC) return 'none'
  try {
    audio = audio ?? new AC()
    if (audio.state === 'suspended') await audio.resume()
    const buf = audio.createBuffer(1, 1, 22050)
    const src = audio.createBufferSource()
    src.buffer = buf
    src.connect(audio.destination)
    src.start(0)
    return audio.state === 'running' ? 'ok' : 'denied'
  } catch { return 'denied' }
}

// A short two-note chime on the phone itself, once sound is unlocked: for the
// moments the phone calls its guest (iPhones cannot vibrate from a web page).
export function chime() {
  if (!audio || audio.state !== 'running') return false
  try {
    const t = audio.currentTime
    for (const [i, f] of [[0, 880], [1, 1175]]) {
      const o = audio.createOscillator()
      const g = audio.createGain()
      o.frequency.value = f
      g.gain.setValueAtTime(0.0001, t + i * 0.18)
      g.gain.exponentialRampToValueAtTime(0.25, t + i * 0.18 + 0.02)
      g.gain.exponentialRampToValueAtTime(0.0001, t + i * 0.18 + 0.35)
      o.connect(g).connect(audio.destination)
      o.start(t + i * 0.18)
      o.stop(t + i * 0.18 + 0.4)
    }
    return true
  } catch { return false }
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

// All three, from the one Allow tap.
export async function allowAll(w = globalThis.window, d = globalThis.document) {
  const motion = await askMotion(w)
  const sound = await unlockSound(w)
  const awake = await keepAwake(w, d)
  return { motion, sound, awake }
}
