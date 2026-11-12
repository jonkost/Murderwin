// Celebrate every win (handoff 11 Nov 2026, B4; Jon: "celebrate a small
// victory... even the small wins"). One call for the phones and the room
// screens alike:
//
//   celebrate('small')    a sparkle and a ding, half a second
//                         a clue saved, a motive crossed off, a cat visited, a right pick
//   celebrate('medium')   a wax seal stamps down, a chime, the room's cat hops, one second
//                         a round cleared, a Parlour Game done, Locked in
//   celebrate('big')      a burst of paw prints, a fanfare, two to three seconds
//                         a room solved, a picture named, the door opens, three out of three
//   celebrate('miss')     a soft buzz and a shake. A miss, never a scolding.
//
// What is drawn is a short-lived layer of small pieces (look/look.css, the
// `lk-fx` rules) over `root`, around the point `at`. The pieces are worked out
// here as plain data (pieces, below), so play/test can read them. Every level
// also tells the window (`celebrate`, { level }), which is how a room's cat
// knows to hop. Nothing here reads a night.
import { play } from './soundkit.js'

export const LEVELS = {
  small: { ms: 700, sound: 'sparkle', hop: false },
  medium: { ms: 1300, sound: 'seal', hop: true },
  big: { ms: 2800, sound: 'fanfare', hop: true },
  miss: { ms: 450, sound: 'buzz', hop: false },
}

// A small, fixed generator: the same burst every time for the same seed.
function dice(seed) {
  let s = (Math.abs(Math.floor(seed)) % 2147483646) + 1
  return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646 }
}

// The pieces of one celebration: { kind, dx, dy (in em, from the point), rot
// (deg), delay (ms), size (em), tone }. Sparkles ring the point; paw prints
// and flecks fly out from it; the seal comes straight down on it.
export function pieces(level, seed = 1) {
  const r = dice(seed + level.length * 97)
  const out = []
  const ring = (kind, n, near, far, sizes, tones, spread = 0) => {
    for (let i = 0; i < n; i++) {
      const angle = (i / n) * Math.PI * 2 + (r() - 0.5) * 0.7
      const reach = near + r() * (far - near)
      out.push({
        kind,
        dx: +(Math.cos(angle) * reach).toFixed(2),
        dy: +(Math.sin(angle) * reach * 0.82).toFixed(2),
        rot: Math.round((r() - 0.5) * 80),
        delay: Math.round(r() * spread),
        size: +(sizes[0] + r() * (sizes[1] - sizes[0])).toFixed(2),
        tone: tones[i % tones.length],
      })
    }
  }
  if (level === 'small') ring('sparkle', 9, 1.6, 3.4, [0.5, 1.1], ['brass', 'paper', 'brass'], 120)
  if (level === 'medium') {
    out.push({ kind: 'seal', dx: 0, dy: 0, rot: -8, delay: 0, size: 5, tone: 'red' })
    ring('sparkle', 8, 3.2, 4.6, [0.5, 0.9], ['brass', 'paper'], 90)
  }
  if (level === 'big') {
    ring('paw', 16, 3.5, 9.5, [1.1, 2.1], ['paper', 'brass', 'red', 'paper'], 260)
    ring('fleck', 18, 2.5, 10.5, [0.25, 0.5], ['brass', 'paper', 'red'], 320)
    ring('sparkle', 8, 2, 5, [0.6, 1.2], ['brass', 'paper'], 200)
  }
  return out
}

const PAW = '<svg viewBox="0 0 64 64" aria-hidden="true"><ellipse cx="32" cy="43" rx="15" ry="12"/><ellipse cx="11" cy="27" rx="6" ry="8" transform="rotate(-20 11 27)"/><ellipse cx="24.5" cy="15" rx="6" ry="8.5" transform="rotate(-6 24.5 15)"/><ellipse cx="39.5" cy="15" rx="6" ry="8.5" transform="rotate(6 39.5 15)"/><ellipse cx="53" cy="27" rx="6" ry="8" transform="rotate(20 53 27)"/></svg>'

let count = 0

// Play one. `root` is the box the pieces are drawn over (the page by default);
// `at` is an element or { x, y } in the root's own pixels (its middle by
// default). `quiet` draws without the sound. Returns the level's length in
// milliseconds, or 0 when there is no such level.
export function celebrate(level, { root = null, at = null, quiet = false, base = '/play/' } = {}) {
  const spec = LEVELS[level]
  if (!spec) return 0
  if (!quiet) play(spec.sound)
  const doc = globalThis.document
  if (!doc) return spec.ms
  try { globalThis.window?.dispatchEvent(new CustomEvent('celebrate', { detail: { level, hop: spec.hop } })) } catch { /* an old browser: the cat stays put */ }
  const host = root ?? doc.body
  if (level === 'miss') {
    const el = at instanceof Element ? at : host
    el.classList.remove('lk-shake')
    void el.offsetWidth // so a second miss shakes again
    el.classList.add('lk-shake')
    setTimeout(() => el.classList.remove('lk-shake'), spec.ms)
    return spec.ms
  }
  const box = host.getBoundingClientRect()
  let x = box.width / 2
  let y = box.height / 2
  if (at instanceof Element) {
    const b = at.getBoundingClientRect()
    x = b.left - box.left + b.width / 2
    y = b.top - box.top + b.height / 2
  } else if (at && Number.isFinite(at.x) && Number.isFinite(at.y)) { x = at.x; y = at.y }
  const layer = doc.createElement('div')
  layer.className = `lk-fx lk-fx-${level}${host === doc.body ? ' lk-fx-page' : ''}`
  layer.setAttribute('aria-hidden', 'true')
  // the pieces are sized from the box they play over, so a phone card and a TV both look right
  const em = Math.max(12, Math.min(44, Math.min(box.width, box.height || box.width) / 16))
  layer.style.fontSize = `${em}px`
  layer.style.setProperty('--x', `${x}px`)
  layer.style.setProperty('--y', `${y}px`)
  for (const p of pieces(level, ++count)) {
    const el = doc.createElement(p.kind === 'seal' ? 'img' : 'i')
    el.className = `lk-piece lk-${p.kind} lk-tone-${p.tone}`
    if (p.kind === 'seal') { el.src = `${base}brand/seal.png`; el.alt = '' }
    if (p.kind === 'paw') el.innerHTML = PAW
    el.style.setProperty('--dx', `${p.dx}em`)
    el.style.setProperty('--dy', `${p.dy}em`)
    el.style.setProperty('--rot', `${p.rot}deg`)
    el.style.setProperty('--delay', `${p.delay}ms`)
    el.style.setProperty('--size', `${p.size}em`)
    layer.appendChild(el)
  }
  if (level === 'big') { const flash = doc.createElement('b'); flash.className = 'lk-flash'; layer.appendChild(flash) }
  host.appendChild(layer)
  setTimeout(() => layer.remove(), spec.ms + 400)
  return spec.ms
}
