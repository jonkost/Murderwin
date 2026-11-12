// Which drawn hexagon each panel of the Elements wall is (A8, 12 Nov 2026;
// Jon: Granolia's hint "was reversed... backwards to the actual design").
// The Study's screen draws the wall with the same ten hexagons as its rules
// card (play/src/lib/walls.js HEX_CENTRES, the wall as it hangs, from Jon's
// photos). The controller's own layout is the same shape turned half way
// round, so its raw positions cannot be drawn as they come. This file says,
// for each of the station's panels in its own order, which of the ten drawn
// hexagons it is.
//
// The map is worked out from the layout (fitHexes: the best turn of the
// controller's shape onto the drawing, no mirror) and can be set by hand on
// the workshop's Study test page (testmode.js, Check the map), which saves it
// beside the taught taps on the Mac that runs the station (hex-map.json, not
// in the repo). A saved map wins when it names every panel once.
//
// Plain numbers, no I/O except the two small file helpers at the end.
import { readFileSync, writeFileSync, existsSync } from 'node:fs'

// A copy of play/src/lib/walls.js HEX_CENTRES (station/test/hexmap.test.mjs keeps them equal).
export const HEX_CENTRES = [
  [0, 50.2], [86.5, 100.3], [173.9, 50.2], [260.4, 0], [260.4, 100.3],
  [347.7, 150.5], [434.2, 100.3], [521.6, 150.5], [608.1, 100.3], [695.5, 50.2],
]

// The three hexagons the Check the map steps light: the first on the left,
// one in the middle, the last on the right (by HEX_CENTRES order, left to right).
export const CHECK_HEXES = [0, 5, 9]

const FIT_LIMIT = 15 // a panel more than this far from its hexagon (in drawing units, centres 100 apart) is no fit

// layout: [{ id, x, y }] in the controller's units (y up). Returns an array,
// one entry per panel in the layout's order, of the HEX_CENTRES index it is,
// or null when the shape does not fit the drawing one to one.
export function fitHexes(layout, centres = HEX_CENTRES) {
  if (!Array.isArray(layout) || layout.length !== centres.length) return null
  const pts = layout.map(p => [Number(p?.x), -Number(p?.y)]) // as WallMap drew them: y down
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
    const moved = pts.map(([x, y]) => {
      const dx = (x - px) * scale, dy = (y - py) * scale
      return [dx * c - dy * s + hx, dx * s + dy * c + hy]
    })
    const pick = moved.map(([x, y]) => {
      let k = -1, d = Infinity
      centres.forEach(([cx, cy], i) => { const e = Math.hypot(cx - x, cy - y); if (e < d) { d = e; k = i } })
      return { k, d }
    })
    if (new Set(pick.map(p => p.k)).size !== centres.length) continue
    const worst = Math.max(...pick.map(p => p.d))
    if (worst > FIT_LIMIT) continue
    if (!best || worst < best.worst) best = { worst, map: pick.map(p => p.k) }
  }
  return best ? best.map : null
}

// One hexagon each: every entry an index of the drawing, none twice.
export function isHexMap(hexes, count = HEX_CENTRES.length) {
  return Array.isArray(hexes) && hexes.length === count &&
    hexes.every(h => Number.isInteger(h) && h >= 0 && h < count) && new Set(hexes).size === count
}

// The map the station uses: the saved one ({ panelId: hex }) when it names
// every panel of this layout once, else the fit, else null (the screen then
// draws the old circles).
export function resolveHexes(layout, saved = null) {
  if (saved && typeof saved === 'object' && Array.isArray(layout)) {
    const hexes = layout.map(p => Number(saved[p.id]))
    if (isHexMap(hexes)) return hexes
  }
  return fitHexes(layout)
}

// hex-map.json, beside touch-map.json on the Mac that runs the station.
export function readHexMap(path) {
  if (!existsSync(path)) return null
  try { return JSON.parse(readFileSync(path, 'utf8')).hexes ?? null } catch { return null }
}
export function writeHexMap(path, layout, hexes, at = new Date()) {
  const byPanel = Object.fromEntries(layout.map((p, i) => [p.id, hexes[i]]))
  writeFileSync(path, JSON.stringify({
    note: 'Which drawn hexagon each panel of the Elements wall is (0 is the one furthest left), set on the workshop\'s Study test page, Check the map. Panel id → hexagon. Delete this file to go back to the built-in map.',
    savedAt: at.toISOString(),
    hexes: byPanel,
  }, null, 2) + '\n')
}
