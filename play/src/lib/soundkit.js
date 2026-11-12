// The house's small sounds, made in code (handoff 11 Nov 2026: A2 layer 1,
// step 4, and B4). One kit for the phones and the room screens, for the little
// moments: a ding, a sparkle, a chime, a fanfare, a soft buzz, a tick, a wax
// seal's thunk, a pencil's scratch. Fuller than the two beeps before it, and
// much louder: every voice goes through one limiter, so loud never crackles.
//
// No files, nothing fetched, nothing sealed. A sound is a short list of
// voices (SOUNDS, below): plain data, so play/test can read it.
//
//   unlock()            from a tap: wakes the page's sound (and, on an iPhone,
//                       lets it play with the ring switch on silent)
//   play('ding')        true when it was started
//   soundMs('fanfare')  how long a sound lasts
//
// A voice: { w: wave, f: hertz, to: hertz it slides to, t: start (s),
// d: length (s), g: peak loudness, a: attack (s), lp: low-pass (Hz) }, or a
// puff of noise: { n: 1, t, d, g, bp: band-pass (Hz), lp }.

const bell = (f, t, d, g) => [
  { w: 'sine', f, t, d, g },
  { w: 'sine', f: f * 2, t, d: d * 0.5, g: g * 0.34 },
  { w: 'sine', f: f * 3.01, t, d: d * 0.28, g: g * 0.14 },
]
const brass = (f, t, d, g) => [
  { w: 'sawtooth', f, t, d, g, a: 0.03, lp: 2400 },
  { w: 'triangle', f: f / 2, t, d, g: g * 0.55, a: 0.03 },
]

export const SOUNDS = {
  // a clear single bell: a right pick, a clue saved
  ding: bell(1318.5, 0, 0.75, 0.6),
  // five quick rising notes and a bell on top: a small win
  sparkle: [
    ...[1568, 2093, 2637, 3136].map((f, i) => ({ w: 'triangle', f, t: i * 0.055, d: 0.17, g: 0.3 })),
    ...bell(2093, 0.22, 0.6, 0.5),
  ],
  // three warm notes, the house's "look at your phone"
  chime: [...bell(784, 0, 0.9, 0.55), ...bell(659.3, 0.3, 0.9, 0.55), ...bell(523.3, 0.6, 1.2, 0.6)],
  // a wax seal coming down, then two notes: locked in, a round cleared
  seal: [
    { w: 'sine', f: 150, to: 45, t: 0, d: 0.24, g: 1 },
    { n: 1, t: 0, d: 0.07, g: 0.6, lp: 900 },
    ...bell(880, 0.16, 0.5, 0.42),
    ...bell(1174.7, 0.32, 0.8, 0.5),
  ],
  // the thunk alone
  stamp: [
    { w: 'sine', f: 150, to: 45, t: 0, d: 0.24, g: 1 },
    { n: 1, t: 0, d: 0.07, g: 0.6, lp: 900 },
  ],
  // three rising notes and a held chord: a room solved, the door, three out of three
  fanfare: [
    ...brass(523.3, 0, 0.17, 0.4), ...brass(659.3, 0.14, 0.17, 0.4), ...brass(784, 0.28, 0.17, 0.42),
    ...brass(523.3, 0.44, 1.2, 0.24), ...brass(659.3, 0.44, 1.2, 0.24), ...brass(784, 0.44, 1.2, 0.24), ...brass(1046.5, 0.44, 1.2, 0.3),
    ...bell(2093, 0.44, 1.0, 0.22),
  ],
  // not quite: low, short and soft. Never a scolding.
  buzz: [
    { w: 'square', f: 123, t: 0, d: 0.2, g: 0.2, a: 0.01, lp: 700 },
    { w: 'square', f: 130, t: 0, d: 0.2, g: 0.16, a: 0.01, lp: 700 },
  ],
  // one tick of a clock's last ten seconds
  tick: [
    { w: 'sine', f: 1250, to: 820, t: 0, d: 0.06, g: 0.5, a: 0.002 },
    { n: 1, t: 0, d: 0.02, g: 0.25, bp: 3000 },
  ],
  // a pencil through a motive
  scratch: [
    { n: 1, t: 0, d: 0.13, g: 0.4, bp: 3600 },
    { n: 1, t: 0.11, d: 0.17, g: 0.34, bp: 2900 },
  ],
}

// How long a sound lasts, in milliseconds (its last voice's end).
export function soundMs(name) {
  const voices = SOUNDS[name] ?? []
  return Math.round(1000 * voices.reduce((end, v) => Math.max(end, v.t + v.d), 0))
}

let ctx = null
let out = null
let noise = null

function context(w = globalThis.window) {
  if (ctx) return ctx
  const AC = w?.AudioContext || w?.webkitAudioContext
  if (!AC) return null
  try {
    ctx = new AC()
    // one limiter for everything: full volume without the crackle
    const limiter = ctx.createDynamicsCompressor()
    limiter.threshold.value = -9
    limiter.knee.value = 6
    limiter.ratio.value = 8
    limiter.attack.value = 0.003
    limiter.release.value = 0.2
    out = ctx.createGain()
    out.gain.value = 1
    out.connect(limiter).connect(ctx.destination)
  } catch { ctx = null; out = null }
  return ctx
}

// From a tap. Wakes the page's sound; 'ok', 'denied' or 'none' (no sound on
// this device), like lib/permissions.js. Only Safari has audioSession: with
// it set to playback, an iPhone on silent still plays the house's chimes.
export async function unlock(w = globalThis.window) {
  const c = context(w)
  if (!c) return 'none'
  try { if (w?.navigator?.audioSession) w.navigator.audioSession.type = 'playback' } catch { /* not this browser */ }
  try {
    if (c.state === 'suspended') await c.resume()
    return c.state === 'running' ? 'ok' : 'denied'
  } catch { return 'denied' }
}

export function soundReady() { return Boolean(ctx && ctx.state === 'running') }

function noiseBuffer(c) {
  if (noise && noise.sampleRate === c.sampleRate) return noise
  noise = c.createBuffer(1, c.sampleRate, c.sampleRate)
  const data = noise.getChannelData(0)
  // a fixed little generator, so the puff is the same every time
  let s = 22222
  for (let i = 0; i < data.length; i++) { s = (s * 16807) % 2147483647; data[i] = (s / 2147483647) * 2 - 1 }
  return noise
}

// Start a sound now. `volume` is 0 to 1. Nothing here throws: a page with no
// sound, or one nobody has tapped, simply stays quiet and says false.
export function play(name, { volume = 1 } = {}) {
  const voices = SOUNDS[name]
  if (!voices || !ctx || !out) return false
  if (ctx.state !== 'running') { ctx.resume?.().catch?.(() => {}); return false }
  try {
    const t0 = ctx.currentTime + 0.01
    for (const v of voices) {
      const start = t0 + v.t
      const end = start + v.d
      const g = ctx.createGain()
      const peak = Math.max(0.0001, Math.min(1, v.g * volume))
      g.gain.setValueAtTime(0.0001, start)
      g.gain.exponentialRampToValueAtTime(peak, start + (v.a ?? 0.005))
      g.gain.exponentialRampToValueAtTime(0.0001, end)
      let src
      if (v.n) {
        src = ctx.createBufferSource()
        src.buffer = noiseBuffer(ctx)
        src.loop = true
      } else {
        src = ctx.createOscillator()
        src.type = v.w ?? 'sine'
        src.frequency.setValueAtTime(v.f, start)
        if (v.to) src.frequency.exponentialRampToValueAtTime(v.to, end)
      }
      let node = src
      if (v.bp) { const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = v.bp; f.Q.value = 1.2; node.connect(f); node = f }
      if (v.lp) { const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = v.lp; node.connect(f); node = f }
      node.connect(g).connect(out)
      src.start(start)
      src.stop(end + 0.03)
    }
    return true
  } catch { return false }
}
