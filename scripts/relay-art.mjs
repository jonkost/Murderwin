// The Relay Drawing's picture maker, the plain-code half (handoff 11 Nov
// 2026, job A7, steps 5 and 6). generate-relay-pictures.mjs asks the Claude
// API for whole pictures; everything after the model's reply is here:
//
//   cutPicture   one picture on one canvas  ->  the squares the game draws
//   codeChecks   the judge in code: in the canvas, copyable squares, names
//   renderPng    the squares drawn back to a PNG in memory, for the eye judge
//   answerMatches  the loose match of the eye judge's answer to the name
//
// The canvas: a picture for a size × size grid is designed on one canvas
// from 0 to `size` across (x, to the right) and down (y), one unit a square.
// A1 is the square from (0, 0) to (1, 1). Strokes on the canvas use the
// game's own four kinds (functions/lib/relay-gen.js), in canvas units:
//   { kind: 'line',   from: [x, y], to: [x, y] }
//   { kind: 'arc',    from: [x, y], to: [x, y], bulge }  (a curve; it peaks bulge × the chord off it)
//   { kind: 'circle', at: [x, y], r }
//   { kind: 'dot',    at: [x, y] }
// The cutter splits every stroke where it crosses a square's edge, and gives
// each square its pieces in that square's own 0..1, the form the game draws
// (play/src/lib/draw.jsx `Stroke`). Both squares either side of an edge get
// the same point on it, so the strokes always meet.
//
// SEAL RULE. Nothing in this module prints, logs or writes a file. The PNG
// lives in memory only, and goes to the eye judge and nowhere else.

import { deflateSync } from 'node:zlib'
import { cellLabel } from '../functions/lib/relay-gen.js'
import { ROUND_SIZES, ROUND_CAPS, DISQUALIFIED, NEVER_WORDS, namesAny } from '../functions/lib/relay-bank.js'

// The most strokes one square may hold: what a person copies by hand in a
// fifteen-second turn from the room's words. The bank's check (relay-bank.js
// checkPicture) holds every square to the same.
export { STROKES_PER_SQUARE } from '../functions/lib/relay-bank.js'
import { STROKES_PER_SQUARE } from '../functions/lib/relay-bank.js'

// The fewest drawn squares a round's picture may have: a picture with too
// many empty squares is mostly nothing on the paper.
export const MIN_SQUARES = { 1: 6, 2: 8, 3: 10 }

const EPS = 1e-9
const round2 = v => Math.round(v * 100) / 100
const isNum = v => typeof v === 'number' && Number.isFinite(v)
const isPt = p => Array.isArray(p) && p.length === 2 && p.every(isNum)

// ---- a stroke as a curve --------------------------------------------------

// The arc's control point, exactly as the game draws it (draw.jsx arcPath).
function arcControl(from, to, bulge) {
  const [x1, y1] = from, [x2, y2] = to
  const dx = x2 - x1, dy = y2 - y1
  const len = Math.hypot(dx, dy) || 1
  const mx = (x1 + x2) / 2, my = (y1 + y2) / 2
  return [mx + (-dy / len) * bulge * len * 2, my + (dx / len) * bulge * len * 2]
}

// A point on a stroke at t in 0..1 (not for dots).
export function pointAt(s, t) {
  if (s.kind === 'line') return [s.from[0] + (s.to[0] - s.from[0]) * t, s.from[1] + (s.to[1] - s.from[1]) * t]
  if (s.kind === 'arc') {
    const c = arcControl(s.from, s.to, s.bulge), u = 1 - t
    return [u * u * s.from[0] + 2 * u * t * c[0] + t * t * s.to[0], u * u * s.from[1] + 2 * u * t * c[1] + t * t * s.to[1]]
  }
  const a = t * 2 * Math.PI
  return [s.at[0] + s.r * Math.cos(a), s.at[1] + s.r * Math.sin(a)]
}

// Is a stroke well formed (on the canvas's own terms, before the cut)?
function wellFormed(s) {
  if (s?.kind === 'line') return isPt(s.from) && isPt(s.to) && Math.hypot(s.to[0] - s.from[0], s.to[1] - s.from[1]) > 0.1
  if (s?.kind === 'arc') return isPt(s.from) && isPt(s.to) && isNum(s.bulge) && Math.abs(s.bulge) <= 0.6 && Math.hypot(s.to[0] - s.from[0], s.to[1] - s.from[1]) > 0.1
  if (s?.kind === 'circle') return isPt(s.at) && isNum(s.r) && s.r >= 0.2
  if (s?.kind === 'dot') return isPt(s.at)
  return false
}

// On a quarter-square point: every coordinate the designer gives is a
// multiple of 0.25 (a radius too), so the room can say it.
const onQuarter = v => Math.abs(v * 4 - Math.round(v * 4)) < 1e-6
function quarterPoints(s) {
  if (s.kind === 'line' || s.kind === 'arc') return [...s.from, ...s.to].every(onQuarter)
  if (s.kind === 'circle') return [...s.at, s.r].every(onQuarter)
  return s.at.every(onQuarter)
}

// Every part of a stroke inside the canvas, the curve's belly included.
function insideCanvas(s, size) {
  const ok = ([x, y]) => x >= -EPS && y >= -EPS && x <= size + EPS && y <= size + EPS
  if (s.kind === 'dot') return ok(s.at)
  for (let i = 0; i <= 64; i++) if (!ok(pointAt(s, i / 64))) return false
  return true
}

// ---- the cutter -----------------------------------------------------------

// Where a curve crosses the grid's lines x = k and y = k, as values of t.
function crossings(s, size) {
  const N = 512
  const ts = []
  const pts = Array.from({ length: N + 1 }, (_, i) => pointAt(s, i / N))
  for (let axis = 0; axis < 2; axis++) {
    for (let k = 1; k < size; k++) {
      const f = p => p[axis] - k
      // a sign change between two samples off the line is a crossing; a run
      // along the line itself (all zero) or a touch is not
      let last = -1
      for (let i = 0; i <= N; i++) {
        const v = f(pts[i])
        if (Math.abs(v) < 1e-7) continue
        if (last >= 0 && Math.sign(v) !== Math.sign(f(pts[last]))) {
          const a = f(pts[last])
          let lo = last / N, hi = i / N
          for (let n = 0; n < 60; n++) {
            const mid = (lo + hi) / 2, m = f(pointAt(s, mid))
            if (Math.abs(m) < 1e-12) { lo = hi = mid; break }
            if (Math.sign(m) === Math.sign(a)) lo = mid; else hi = mid
          }
          ts.push((lo + hi) / 2)
        }
        last = i
      }
    }
  }
  return ts.sort((a, b) => a - b).filter((t, i, all) => t > 1e-7 && t < 1 - 1e-7 && (i === 0 || t - all[i - 1] > 1e-7))
}

// Snap a canvas point onto a grid line when it sits on one, so both squares
// either side of the edge get the very same point.
const snap = v => (Math.abs(v - Math.round(v)) < 1e-6 ? Math.round(v) : v)
const snapPt = p => [snap(p[0]), snap(p[1])]

// One piece of a curve, from t0 to t1, inside one square: a line when it is
// nearly straight, else an arc whose belly matches the piece's (split in two
// if it bends more than the game's arc can).
function pieceStrokes(s, t0, t1, depth = 0) {
  const a = snapPt(pointAt(s, t0)), b = snapPt(pointAt(s, t1))
  const dx = b[0] - a[0], dy = b[1] - a[1]
  const chord = Math.hypot(dx, dy)
  if (chord < 1e-6) return []
  // the signed farthest point of the piece from its chord (left of the chord is +)
  let dev = 0
  for (let i = 1; i < 32; i++) {
    const p = pointAt(s, t0 + (t1 - t0) * (i / 32))
    const d = ((p[0] - a[0]) * -dy + (p[1] - a[1]) * dx) / chord
    if (Math.abs(d) > Math.abs(dev)) dev = d
  }
  if (Math.abs(dev) < 0.02) return [{ kind: 'line', from: a, to: b }]
  const bulge = dev / chord
  if (Math.abs(bulge) > 0.55 && depth < 4) {
    const tm = (t0 + t1) / 2
    return [...pieceStrokes(s, t0, tm, depth + 1), ...pieceStrokes(s, tm, t1, depth + 1)]
  }
  return [{ kind: 'arc', from: a, to: b, bulge }]
}

// The square a canvas point is in (a point on an edge goes to the square
// right of it or below it, inside the canvas).
function squareOf([x, y], size) {
  const c = Math.min(size - 1, Math.max(0, Math.floor(x + 1e-7)))
  const r = Math.min(size - 1, Math.max(0, Math.floor(y + 1e-7)))
  return [r, c]
}

// A canvas stroke to a square's own 0..1.
function toLocal(st, r, c) {
  const loc = ([x, y]) => [Math.min(1, Math.max(0, round2(x - c))), Math.min(1, Math.max(0, round2(y - r)))]
  if (st.kind === 'line') return { kind: 'line', from: loc(st.from), to: loc(st.to) }
  if (st.kind === 'arc') return { kind: 'arc', from: loc(st.from), to: loc(st.to), bulge: round2(st.bulge) }
  if (st.kind === 'circle') return { kind: 'circle', at: loc(st.at), r: round2(st.r) }
  return { kind: 'dot', at: loc(st.at) }
}

// The whole canvas picture -> { A1: [strokes], ... }, only drawn squares.
// A circle wholly inside one square stays a circle; anything else is cut at
// the squares' edges. Pieces too small to draw (a corner grazed) are left out.
export function cutPicture(strokes, size) {
  const cells = {}
  const put = (r, c, st) => { (cells[cellLabel(r, c)] ??= []).push(toLocal(st, r, c)) }
  for (const s of strokes ?? []) {
    if (s.kind === 'dot') { const [r, c] = squareOf(s.at, size); put(r, c, s); continue }
    if (s.kind === 'circle') {
      const [r, c] = squareOf(s.at, size)
      if (s.at[0] - s.r >= c - EPS && s.at[0] + s.r <= c + 1 + EPS && s.at[1] - s.r >= r - EPS && s.at[1] + s.r <= r + 1 + EPS && s.r <= 0.5) { put(r, c, s); continue }
    }
    const ts = [0, ...crossings(s, size), 1]
    for (let i = 0; i < ts.length - 1; i++) {
      const t0 = ts[i], t1 = ts[i + 1]
      const [r, c] = squareOf(pointAt(s, (t0 + t1) / 2), size)
      for (const piece of pieceStrokes(s, t0, t1)) {
        const len = Math.hypot(piece.to[0] - piece.from[0], piece.to[1] - piece.from[1])
        if (len < 0.06) continue
        put(r, c, piece)
      }
    }
  }
  return cells
}

// ---- the judge in code ----------------------------------------------------

// Why a designed picture is refused before the eye judge sees it, or [] when
// it passes. Reasons are generic (they name a check, never the picture).
// `design` = { name, decoys, synonyms, strokes } on the canvas; `cells` is its cut.
// `never` is extra words no name may say (the practice bank's names, for the party).
export function codeChecks(design, cells, round, { never = [] } = {}) {
  const bad = []
  const size = ROUND_SIZES[round]
  const strokes = Array.isArray(design?.strokes) ? design.strokes : []
  if (!strokes.length || strokes.some(s => !wellFormed(s))) bad.push('shape')
  else {
    if (strokes.some(s => !quarterPoints(s))) bad.push('grid')
    if (strokes.some(s => !insideCanvas(s, size))) bad.push('canvas')
  }
  const name = String(design?.name ?? '').trim()
  const decoys = Array.isArray(design?.decoys) ? design.decoys.map(d => String(d ?? '').trim()) : []
  const names = [name, ...decoys].map(n => normalise(n))
  if (!name || decoys.length !== 3 || names.some(n => !n) || new Set(names).size !== 4) bad.push('names')
  if ([name, ...decoys].some(n => namesAny(n.toLowerCase(), [...DISQUALIFIED, ...NEVER_WORDS]))) bad.push('never')
  const extra = never.map(w => normalise(w)).filter(Boolean)
  if (extra.length && [name, ...(design?.synonyms ?? [])].some(n => { const m = normalise(n); return extra.some(w => w === m || contains(m, w) || contains(w, m)) })) bad.push('burned')
  const drawn = Object.values(cells ?? {}).filter(s => s.length)
  if (drawn.length < MIN_SQUARES[round]) bad.push('empty')
  if (drawn.length > ROUND_CAPS[round]) bad.push('squares')
  if (drawn.some(s => s.length > STROKES_PER_SQUARE)) bad.push('busy')
  return [...new Set(bad)]
}

// ---- loose matching of a name -------------------------------------------

const LEADS = ['it is', 'its', 'it s', 'this is', 'that is', 'a drawing of', 'drawing of', 'a picture of', 'picture of', 'a sketch of', 'sketch of', 'an image of', 'image of', 'looks like', 'it looks like']
// lower case, no punctuation, no article, no "a drawing of", each word singular
export function normalise(text) {
  let t = String(text ?? '').toLowerCase().replace(/[’']/g, '').replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim()
  let again = true
  while (again) {
    again = false
    for (const lead of LEADS) if (t.startsWith(lead + ' ')) { t = t.slice(lead.length + 1); again = true }
    for (const art of ['a ', 'an ', 'the ', 'some ']) if (t.startsWith(art)) { t = t.slice(art.length); again = true }
  }
  return t.split(' ').filter(Boolean).map(singular).join(' ')
}
function singular(w) {
  if (w.length > 4 && w.endsWith('ies')) return w.slice(0, -3) + 'y'
  if (w.length > 4 && /(ches|shes|xes|sses)$/.test(w)) return w.slice(0, -2)
  if (w.length > 3 && w.endsWith('s') && !w.endsWith('ss')) return w.slice(0, -1)
  return w
}
// does `whole` hold `part` as whole words?
function contains(whole, part) {
  if (!whole || !part) return false
  return ` ${whole} `.includes(` ${part} `)
}

// Does the eye judge's answer name the picture? The answer matches the name
// or one of the designer's close synonyms: equal once normalised, or one
// holds the other as whole words ("a red kite" holds "kite").
export function answerMatches(answer, name, synonyms = []) {
  const a = normalise(answer)
  if (!a) return false
  return [name, ...synonyms].map(normalise).filter(Boolean).some(n => a === n || contains(a, n) || contains(n, a))
}

// The two-of-three rule: answers come one at a time from `ask(i)`; keep the
// picture when two of three match. Stops early once the result is settled
// (two matches, or two misses), which gives the same verdict as asking all
// three. Returns { keep, asked }.
export async function eyeVerdict(ask, name, synonyms, { times = 3, need = 2 } = {}) {
  let yes = 0, no = 0, asked = 0
  for (let i = 0; i < times; i++) {
    let answer = ''
    try { answer = await ask(i) } catch { answer = '' }
    asked++
    if (answerMatches(answer, name, synonyms)) yes++; else no++
    if (yes >= need) return { keep: true, asked }
    if (no > times - need) return { keep: false, asked }
  }
  return { keep: yes >= need, asked }
}

// ---- the rasterizer -------------------------------------------------------

export const PX = 100 // one square, in pixels
const MARGIN = 20

// The squares drawn back as one picture, as the game's four options are drawn
// (draw.jsx Figure: no grid lines, thick dark lines on white), into a
// grayscale bitmap. Returns { width, height, pixels } (0 ink, 255 paper).
export function rasterize(cells, size, { width: lw = 9 } = {}) {
  const W = size * PX + 2 * MARGIN
  const pixels = new Uint8Array(W * W).fill(255)
  const disc = (cx, cy, rad) => {
    const x0 = Math.max(0, Math.floor(cx - rad)), x1 = Math.min(W - 1, Math.ceil(cx + rad))
    const y0 = Math.max(0, Math.floor(cy - rad)), y1 = Math.min(W - 1, Math.ceil(cy + rad))
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if ((x - cx) ** 2 + (y - cy) ** 2 <= rad * rad) pixels[y * W + x] = 0
  }
  for (const [label, strokes] of Object.entries(cells ?? {})) {
    const c = label.charCodeAt(0) - 65, r = Number(label.slice(1)) - 1
    const ox = MARGIN + c * PX, oy = MARGIN + r * PX
    for (const s of strokes) {
      if (s.kind === 'dot') { disc(ox + s.at[0] * PX, oy + s.at[1] * PX, lw * 1.2); continue }
      const steps = 200
      for (let i = 0; i <= steps; i++) {
        const [x, y] = pointAt(s, i / steps)
        // the game clips each square's line art to its square
        const px = Math.min(Math.max(x, 0), 1), py = Math.min(Math.max(y, 0), 1)
        if (Math.abs(px - x) > 1e-6 || Math.abs(py - y) > 1e-6) continue
        disc(ox + x * PX, oy + y * PX, lw / 2)
      }
    }
  }
  return { width: W, height: W, pixels }
}

// ---- PNG, by hand (node:zlib only) ---------------------------------------

const CRC_TABLE = (() => {
  const t = new Uint32Array(256)
  for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0 }
  return t
})()
function crc32(buf) {
  let c = 0xFFFFFFFF
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xFF] ^ (c >>> 8)
  return (c ^ 0xFFFFFFFF) >>> 0
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length)
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td))
  return Buffer.concat([len, td, crc])
}
// A grayscale bitmap -> PNG bytes (8-bit gray, no filter).
export function encodePng({ width, height, pixels }) {
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0); ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8; ihdr[9] = 0; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0
  const raw = Buffer.alloc((width + 1) * height)
  for (let y = 0; y < height; y++) {
    raw[y * (width + 1)] = 0
    Buffer.from(pixels.buffer, pixels.byteOffset + y * width, width).copy(raw, y * (width + 1) + 1)
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]),
    chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0)),
  ])
}

export function renderPng(cells, size) {
  return encodePng(rasterize(cells, size))
}
