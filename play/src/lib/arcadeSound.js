// Miss Boo LaRue's Arcade: the sounds (docs/boo-arcade.md, 28 Oct 2026).
// Short effects made on the spot from sine notes and a little noise, with
// the envelope of the kiosk's own chime (screens/Kiosk.jsx chime()) and the
// record scratch of Boo's catwalk (screens/Rooms.jsx scratch()). No sound
// files: the house's recordings live only on the brain.
//
// sfx(ctx, name) plays one through the AudioContext the page passes
// (wakeAudio() in screens/Kiosk.jsx). It never makes a context of its own,
// so the screen's one wake-up tap unlocks every sound. No context, one the
// browser has not let run yet, or a name it does not know: it does nothing.
// It never throws. Every effect is over in under a second. A win or a loss
// waits for the sound still playing to end.

// The names, as lib/arcade.js puts them in `events` (§8).
export const SOUNDS = Object.freeze(['coin', 'tick', 'go', 'point', 'gold', 'miss', 'knock', 'bite', 'win', 'lose', 'clue', 'chime', 'back'])

// How loud a note gets: a little under the kiosk chime's 0.3, since a game
// makes a lot of them. The round's chime is the house's own, at its 0.3.
const PEAK = 0.25
const PEAKS = { chime: 0.3 }

// Each effect as notes: [frequency, seconds until the next note, seconds it rings].
const FIGURES = {
  coin: [[988, 0.06, 0.1], [1319, 0.06, 0.3]], // a game picked: two quick blips going up
  tick: [[660, 0, 0.18]], // each beat of 3, 2, 1
  go: [[880, 0.12, 0.2], [1100, 0, 0.35]], // play starts
  point: [[880, 0, 0.08]],
  gold: [[880, 0.07, 0.12], [1175, 0.07, 0.12], [1568, 0, 0.3]],
  miss: [[330, 0.14, 0.25], [262, 0, 0.3]], // the kiosk chime's 'wrong'
  bite: [[440, 0.1, 0.18], [220, 0, 0.3]],
  win: [[784, 0.13, 0.25], [1046, 0.13, 0.25], [1318, 0.13, 0.25], [1568, 0, 0.45]], // the brain's sting-result, quicker
  lose: [[392, 0.18, 0.3], [330, 0.18, 0.3], [262, 0, 0.45]], // the brain's sting-door, quicker
  clue: [[660, 0.18, 0.35], [880, 0.18, 0.35], [1100, 0, 0.35]], // the kiosk chime's 'right'
  chime: [[1568, 0.08, 0.12], [1175, 0.08, 0.12], [1568, 0.08, 0.12], [1175, 0, 0.3]], // the house's chime-phone, 80/80/80/300 ms
  back: [[523, 0, 0.2]],
}

// When the sounds now playing on each context end. A win or a loss starts
// then: the engine hands over a bite and the lose tune, or the last fish or
// knock and the win tune, in one go, and played at once they would clash.
// Every other sound starts at once.
const ends = new WeakMap()

export function sfx(ctx, name) {
  try {
    if (!ctx || ctx.state !== 'running' || !SOUNDS.includes(name)) return false
    const now = ctx.currentTime + 0.01
    const t = name === 'win' || name === 'lose' ? Math.max(now, ends.get(ctx) ?? now) : now
    let end = t
    if (name === 'knock') end = knock(ctx, t)
    else {
      let at = t
      for (const [hz, next, ring] of FIGURES[name]) {
        tone(ctx, hz, at, ring, PEAKS[name] ?? PEAK)
        end = Math.max(end, at + ring)
        at += next
      }
    }
    ends.set(ctx, Math.max(ends.get(ctx) ?? end, end))
    return true
  } catch { return false }
}

// One note with the kiosk chime's envelope: up in 20 ms (quicker for a short
// blip), then fading away over `ring` seconds.
function tone(ctx, hz, t, ring, peak) {
  const o = ctx.createOscillator(), g = ctx.createGain()
  o.type = 'sine'; o.frequency.value = hz
  g.gain.value = 0.0001
  g.gain.setValueAtTime(0.0001, t)
  g.gain.exponentialRampToValueAtTime(peak, t + Math.min(0.02, ring / 4))
  g.gain.exponentialRampToValueAtTime(0.0001, t + ring)
  o.connect(g); g.connect(ctx.destination)
  o.start(t); o.stop(t + ring + 0.05)
}

// Knock It Off the Table: the thing scraping off the edge (the catwalk's
// record scratch, noise swept from 2400 down to 300 Hz over 0.35 s) and the
// thud as it lands (the catwalk's kick, 140 down to 42 Hz). Returns when both
// are over.
const SCRAPE = 0.35
function knock(ctx, t) {
  const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain()
  s.buffer = noise(ctx)
  f.type = 'bandpass'; f.Q.value = 6
  f.frequency.setValueAtTime(2400, t)
  f.frequency.exponentialRampToValueAtTime(300, t + SCRAPE)
  g.gain.setValueAtTime(0.8, t) // noise through a narrow filter is quiet: it needs more than a note
  g.gain.exponentialRampToValueAtTime(0.001, t + SCRAPE)
  s.connect(f).connect(g).connect(ctx.destination); s.start(t); s.stop(t + SCRAPE)

  const at = t + 0.28
  const o = ctx.createOscillator(), h = ctx.createGain()
  o.frequency.setValueAtTime(140, at)
  o.frequency.exponentialRampToValueAtTime(42, at + 0.14)
  h.gain.setValueAtTime(0.35, at)
  h.gain.exponentialRampToValueAtTime(0.001, at + 0.3)
  o.connect(h).connect(ctx.destination); o.start(at); o.stop(at + 0.32)
  return Math.max(t + SCRAPE, at + 0.3)
}
// The noise for the scrape, made once for each context.
const noises = new WeakMap()
function noise(ctx) {
  let buf = noises.get(ctx)
  if (!buf) {
    buf = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * SCRAPE), ctx.sampleRate)
    buf.getChannelData(0).forEach((_, i, d) => { d[i] = Math.random() * 2 - 1 })
    noises.set(ctx, buf)
  }
  return buf
}
