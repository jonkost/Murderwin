// The study's two walls as they hang (Jon's photos, 28 Oct 2026), for the
// drawing on the study's rules card. Read once from the controllers' own
// layouts (ten hexagons, twelve bars) and levelled to match the photos.
// Plain numbers, no React, so play/test can check them.

// The Elements wall: ten flat-topped hexagons, centres 100 apart.
export const HEX_CENTRES = [
  [0, 50.2], [86.5, 100.3], [173.9, 50.2], [260.4, 0], [260.4, 100.3],
  [347.7, 150.5], [434.2, 100.3], [521.6, 150.5], [608.1, 100.3], [695.5, 50.2],
]
// The Lines wall: twelve bars, left to right, each [from, to], 100 long.
export const LINE_BARS = [
  [[0, 91.7], [98.9, 90.7]], [[108.1, 96], [157.8, 182.8]], [[164.2, 182.7], [213.8, 96.7]],
  [[219.9, 86.1], [269.6, 0.1]], [[275.2, 0], [325.6, 85.7]], [[331.5, 96.1], [381.1, 182.9]],
  [[387, 193.4], [437.4, 279]], [[443, 278.9], [492.7, 192.9]], [[498.8, 182.3], [548.4, 96.3]],
  [[554.8, 96.2], [604.5, 183]], [[610.3, 182.6], [660, 96.6]], [[669.5, 91.7], [768.4, 90.7]],
]

// A flat-topped hexagon's corners around a centre, `r` from it.
export function hexPoints([cx, cy], r) {
  return [0, 60, 120, 180, 240, 300]
    .map(d => [cx + r * Math.cos(d * Math.PI / 180), cy + r * Math.sin(d * Math.PI / 180)])
    .map(([x, y]) => `${Math.round(x * 10) / 10},${Math.round(y * 10) / 10}`).join(' ')
}

// Which drawn hexagon each of the station's panels is (A8, 12 Nov 2026):
// `layout` is the station's [{ id, x, y }] in the controller's units (y up),
// the same order as the hint's panel numbers. The station sends its own map
// (public/study.hexes, set on the Study test page or worked out the same
// way); this is the same fit, for a station that sends none. It turns the
// controller's shape onto HEX_CENTRES (no mirror) and returns, for each
// panel, its HEX_CENTRES index, or null when the shape does not fit one to
// one. A copy of station/lib/hexmap.js fitHexes (a station test keeps them equal).
export function hexOf(layout, centres = HEX_CENTRES) {
  if (!Array.isArray(layout) || layout.length !== centres.length) return null
  const pts = layout.map(p => [Number(p?.x), -Number(p?.y)])
  if (pts.some(([x, y]) => !Number.isFinite(x) || !Number.isFinite(y))) return null
  let near = Infinity
  for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < pts.length; j++) near = Math.min(near, Math.hypot(pts[i][0] - pts[j][0], pts[i][1] - pts[j][1]))
  if (!(near > 0)) return null
  const mid = list => [list.reduce((s, p) => s + p[0], 0) / list.length, list.reduce((s, p) => s + p[1], 0) / list.length]
  const [hx, hy] = mid(centres)
  const [px, py] = mid(pts)
  const scale = 100 / near
  let best = null
  for (let deg = 0; deg < 360; deg++) {
    const a = deg * Math.PI / 180, c = Math.cos(a), s = Math.sin(a)
    const pick = pts.map(([x, y]) => {
      const dx = (x - px) * scale, dy = (y - py) * scale
      const mx = dx * c - dy * s + hx, my = dx * s + dy * c + hy
      let k = -1, d = Infinity
      centres.forEach(([cx, cy], i) => { const e = Math.hypot(cx - mx, cy - my); if (e < d) { d = e; k = i } })
      return { k, d }
    })
    if (new Set(pick.map(p => p.k)).size !== centres.length) continue
    const worst = Math.max(...pick.map(p => p.d))
    if (worst > 15) continue
    if (!best || worst < best.worst) best = { worst, map: pick.map(p => p.k) }
  }
  return best ? best.map : null
}

// The map to draw with: the station's own when it is one hexagon each, else the fit.
export function hexesFor(study) {
  const h = study?.hexes
  if (Array.isArray(h) && h.length === HEX_CENTRES.length && h.every(n => Number.isInteger(n) && n >= 0 && n < HEX_CENTRES.length) && new Set(h).size === h.length) return h
  return hexOf(study?.layout)
}
