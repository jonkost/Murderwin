// The relay drawing game: the grids are composed on the spot from a random
// seed. Nobody draws them — not Jon, not Susan, not the Steward — which is
// the only way the host gets to play this one (docs/relay-drawing-game.md §6).
//
// A grid is a square of cells. Each drawn cell holds one or two strokes in
// cell-local coordinates (0..1 across, 0..1 down). Strokes:
//   { kind: 'line',   from: [x, y], to: [x, y] }
//   { kind: 'arc',    from: [x, y], to: [x, y], bulge: ±0.25..0.5 }  (quadratic curve)
//   { kind: 'circle', at: [x, y], r }
//   { kind: 'dot',    at: [x, y] }
// Endpoints sit on a 3×3 anchor lattice (0, 0.5, 1) so the room can describe
// them: "top left corner", "middle of the right side", "the centre".
//
// Pure: no I/O, no Date, no Math.random. Everything comes from the seed.

// --- a small seeded PRNG (mulberry32) -----------------------------------
export function rng(seed) {
  let a = seed >>> 0
  const next = () => {
    a = (a + 0x6D2B79F5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  return {
    next,
    int: (n) => Math.floor(next() * n),
    pick: (list) => list[Math.floor(next() * list.length)],
    chance: (p) => next() < p,
    shuffle: (list) => {
      const a2 = [...list]
      for (let i = a2.length - 1; i > 0; i--) {
        const j = Math.floor(next() * (i + 1))
        ;[a2[i], a2[j]] = [a2[j], a2[i]]
      }
      return a2
    },
  }
}

export const COLS = 'ABCDEFG'
export function cellLabel(r, c) { return `${COLS[c]}${r + 1}` }

// The most drawn cells (turns) each grid may have, so the three grids fit
// the drawing's time budget (relay.js MAX_TURNS): 9 + 11 + 12 = 32 turns.
export const CELL_CAPS = [9, 11, 12]
export const MAX_CELLS = CELL_CAPS.reduce((a, b) => a + b, 0)

// --- strokes -------------------------------------------------------------
const P = (x, y) => [x, y]
// Points on each side of a cell, named by side. Corners belong to two sides.
const SIDE_POINTS = {
  top: [P(0, 0), P(0.5, 0), P(1, 0)],
  bottom: [P(0, 1), P(0.5, 1), P(1, 1)],
  left: [P(0, 0), P(0, 0.5), P(0, 1)],
  right: [P(1, 0), P(1, 0.5), P(1, 1)],
}
const CENTRE = P(0.5, 0.5)
const OPPOSITE = { top: 'bottom', bottom: 'top', left: 'right', right: 'left' }
// Which side of the neighbouring cell a point on this side maps to.
function mirrorAcross(side, [x, y]) {
  if (side === 'right') return P(0, y)
  if (side === 'left') return P(1, y)
  if (side === 'bottom') return P(x, 0)
  return P(x, 1)
}

function samePoint(a, b) { return Math.abs(a[0] - b[0]) < 1e-6 && Math.abs(a[1] - b[1]) < 1e-6 }
function dist(a, b) { return Math.hypot(a[0] - b[0], a[1] - b[1]) }
function onSameEdge(a, b) {
  return (a[0] === 0 && b[0] === 0) || (a[0] === 1 && b[0] === 1) || (a[1] === 0 && b[1] === 0) || (a[1] === 1 && b[1] === 1)
}

// A line or arc between two anchors, never along a cell edge, never tiny.
function segment(r, from, to, style) {
  if (samePoint(from, to) || onSameEdge(from, to) || dist(from, to) < 0.5) return null
  const kind = style ?? (r.chance(0.5) ? 'line' : 'arc')
  if (kind === 'line') return { kind: 'line', from, to }
  const bulge = (r.chance(0.5) ? 1 : -1) * (0.25 + r.next() * 0.25)
  return { kind: 'arc', from, to, bulge: round(bulge) }
}
function round(v) { return Math.round(v * 100) / 100 }

// --- grid helpers --------------------------------------------------------
export function emptyGrid(size) {
  const cells = {}
  for (let rr = 0; rr < size; rr++) for (let cc = 0; cc < size; cc++) cells[cellLabel(rr, cc)] = []
  return { size, cells }
}
function add(grid, rr, cc, stroke) {
  if (!stroke) return false
  const key = cellLabel(rr, cc)
  if (!grid.cells[key] || grid.cells[key].length >= 2) return false
  grid.cells[key].push(stroke)
  return true
}
export function drawnCells(grid) {
  return Object.keys(grid.cells).filter(k => grid.cells[k].length > 0)
}

// --- the ring: a closed shape that walks round the border of a span -----
// Enter each border cell through the edge shared with the previous one,
// leave through the edge shared with the next, at a random point on it.
// Lines and arcs chosen at random. The result is a closed blob: a shape.
function ringPath(size, top, left, span) {
  const cells = []
  for (let c = 0; c < span; c++) cells.push([top, left + c])
  for (let r2 = 1; r2 < span; r2++) cells.push([top + r2, left + span - 1])
  for (let c = span - 2; c >= 0; c--) cells.push([top + span - 1, left + c])
  for (let r2 = span - 2; r2 >= 1; r2--) cells.push([top + r2, left])
  return cells
}
function sideBetween([r1, c1], [r2, c2]) {
  if (r2 === r1 && c2 === c1 + 1) return 'right'
  if (r2 === r1 && c2 === c1 - 1) return 'left'
  if (c2 === c1 && r2 === r1 + 1) return 'bottom'
  return 'top'
}
function drawRing(r, grid, top, left, span, style) {
  const path = ringPath(grid.size, top, left, span)
  const n = path.length
  // choose an exit point on each shared edge, then draw inside each cell
  const exits = path.map((cell, i) => {
    const side = sideBetween(cell, path[(i + 1) % n])
    const pts = SIDE_POINTS[side]
    // corners are shared with the cell after next; keep exits off the corners
    // most of the time so the shape reads as rounded rather than boxy
    const pt = r.chance(0.7) ? pts[1] : r.pick(pts)
    return { side, pt }
  })
  for (let i = 0; i < n; i++) {
    const [rr, cc] = path[i]
    const prev = exits[(i + n - 1) % n]
    const entry = mirrorAcross(prev.side, prev.pt)
    const exit = exits[i].pt
    let s = segment(r, entry, exit, style)
    if (!s) {
      // entry and exit coincide or sit on one edge (a corner cut): go via the centre
      add(grid, rr, cc, segment(r, entry, CENTRE, 'line'))
      s = segment(r, CENTRE, exit, 'line')
    }
    if (!add(grid, rr, cc, s)) return false
  }
  return true
}

// Something small inside a cell: a dot, a circle, or a short line.
function feature(r, kind) {
  const k = kind ?? r.pick(['dot', 'circle', 'line', 'arc'])
  if (k === 'dot') return { kind: 'dot', at: CENTRE }
  if (k === 'circle') return { kind: 'circle', at: CENTRE, r: 0.3 }
  const a = r.pick([P(0, 0), P(0.5, 0), P(1, 0), P(0, 0.5), P(1, 0.5), P(0, 1), P(0.5, 1), P(1, 1)])
  const b = r.pick([CENTRE, P(1 - a[0], 1 - a[1])])
  return segment(r, a, b, k) ?? { kind: 'dot', at: CENTRE }
}

// --- grid 1: a shape, every cell drawn -----------------------------------
export function makeShape(r, size = 3) {
  for (let attempt = 0; attempt < 20; attempt++) {
    const grid = emptyGrid(size)
    const style = r.pick([null, null, 'line', 'arc'])
    if (!drawRing(r, grid, 0, 0, size, style)) continue
    // the inside gets a feature so every cell is drawn
    for (let rr = 1; rr < size - 1; rr++) for (let cc = 1; cc < size - 1; cc++) add(grid, rr, cc, feature(r))
    if (drawnCells(grid).length === size * size) return grid
  }
  throw new Error('shape generation failed')
}

// --- grid 2: a shape plus an abstract extra ------------------------------
export function makeMerged(r, size = 4, opts = {}) {
  const span = 3
  const cap = opts.cap ?? CELL_CAPS[1]
  const top = opts.top ?? r.int(size - span + 1)
  const left = opts.left ?? r.int(size - span + 1)
  for (let attempt = 0; attempt < 20; attempt++) {
    const grid = emptyGrid(size)
    if (!drawRing(r, grid, top, left, span, r.pick([null, 'line', 'arc']))) continue
    if (r.chance(0.6)) add(grid, top + 1, left + 1, feature(r))
    // the extra: dots, rays or rings in the cells outside the shape, within
    // the cap and leaving room for two dots of noise
    const outside = []
    for (let rr = 0; rr < size; rr++) for (let cc = 0; cc < size; cc++) {
      const inside = rr >= top && rr < top + span && cc >= left && cc < left + span
      if (!inside) outside.push([rr, cc])
    }
    const overlay = opts.overlay ?? r.pick(['dots', 'rays', 'rings', 'mixed'])
    const room = cap - drawnCells(grid).length
    const want = overlay === 'dots' ? room : room - 2
    const chosen = r.shuffle(outside).slice(0, Math.max(0, Math.min(outside.length, want, 2 + r.int(2))))
    let dots = 0
    for (const [rr, cc] of chosen) {
      let s
      if (overlay === 'dots' || (overlay === 'mixed' && r.chance(0.4))) { s = { kind: 'dot', at: CENTRE }; dots++ }
      else if (overlay === 'rings') s = { kind: 'circle', at: CENTRE, r: 0.3 }
      else s = feature(r, r.pick(['line', 'arc']))
      add(grid, rr, cc, s)
    }
    // two dots in grid 2, as noise, wherever there is room under the cap
    const empties = r.shuffle(Object.keys(grid.cells).filter(k => grid.cells[k].length === 0))
    while (dots < 2 && empties.length && drawnCells(grid).length < cap) { grid.cells[empties.pop()].push({ kind: 'dot', at: CENTRE }); dots++ }
    const drawn = drawnCells(grid).length
    if (drawn >= 10 && drawn <= cap && dots >= 2) return { grid, top, left, overlay }
  }
  throw new Error('merged generation failed')
}

// --- grid 3: an abstract pattern with mirror symmetry --------------------
function mirrorStroke(s) {
  const m = ([x, y]) => P(round(1 - x), y)
  if (s.kind === 'dot') return { kind: 'dot', at: m(s.at) }
  if (s.kind === 'circle') return { kind: 'circle', at: m(s.at), r: s.r }
  if (s.kind === 'line') return { kind: 'line', from: m(s.from), to: m(s.to) }
  return { kind: 'arc', from: m(s.from), to: m(s.to), bulge: -s.bulge }
}
export function makePattern(r, size = 5, { cap = CELL_CAPS[2] } = {}) {
  const mid = Math.floor(size / 2)
  for (let attempt = 0; attempt < 40; attempt++) {
    const grid = emptyGrid(size)
    const target = cap - 3 // drawn cells before dots (one short when a mirrored pair lands last), then dots up to the cap
    // left half, including the centre column
    const candidates = []
    for (let rr = 0; rr < size; rr++) for (let cc = 0; cc <= mid; cc++) candidates.push([rr, cc])
    const chosen = r.shuffle(candidates)
    let drawn = 0
    for (const [rr, cc] of chosen) {
      if (drawn >= target) break
      const s = feature(r, r.pick(['line', 'arc', 'circle', 'line']))
      if (cc === mid) {
        // the centre column mirrors onto itself: use symmetric strokes only
        const sym = r.pick([
          [{ kind: 'line', from: P(0.5, 0), to: P(0.5, 1) }],
          [{ kind: 'circle', at: CENTRE, r: 0.3 }],
          [{ kind: 'line', from: P(0, 0.5), to: P(1, 0.5) }],
          [{ kind: 'arc', from: P(0, 0.5), to: P(1, 0.5), bulge: 0.4 }],
          [{ kind: 'arc', from: P(0, 0.5), to: P(1, 0.5), bulge: -0.4 }],
          [{ kind: 'line', from: P(0, 0), to: P(0.5, 1) }, { kind: 'line', from: P(0.5, 1), to: P(1, 0) }],
          [{ kind: 'line', from: P(0, 1), to: P(0.5, 0) }, { kind: 'line', from: P(0.5, 0), to: P(1, 1) }],
        ])
        if (grid.cells[cellLabel(rr, cc)].length === 0) { for (const st of sym) add(grid, rr, cc, st); drawn++ }
        continue
      }
      if (add(grid, rr, cc, s)) {
        add(grid, rr, size - 1 - cc, mirrorStroke(s))
        drawn += 2
      }
    }
    // up to three dots as noise, never past the cap
    const empties = r.shuffle(Object.keys(grid.cells).filter(k => grid.cells[k].length === 0))
    let dots = 0
    while (dots < 3 && empties.length && drawnCells(grid).length < cap) {
      grid.cells[empties.pop()].push({ kind: 'dot', at: CENTRE })
      dots++
    }
    const count = drawnCells(grid).length
    if (count < cap - 1 || count > cap || dots < 1) continue
    if (sameGrid(grid, rotateGrid(grid))) continue // a quarter turn must change it
    return grid
  }
  throw new Error('pattern generation failed')
}

// --- comparing and transforming grids ------------------------------------
function strokeKey(s) {
  if (s.kind === 'dot') return `d${s.at}`
  if (s.kind === 'circle') return `c${s.at}:${s.r}`
  const [a, b] = [s.from, s.to].sort((p, q) => (p[0] - q[0]) || (p[1] - q[1]))
  const bulge = s.kind === 'arc' ? (s.from === a ? s.bulge : -s.bulge) : 0
  return `${s.kind}${a}-${b}:${round(bulge)}`
}
export function gridKey(grid) {
  return Object.keys(grid.cells).sort().map(k => `${k}=${grid.cells[k].map(strokeKey).sort().join('|')}`).join(';')
}
export function sameGrid(a, b) { return gridKey(a) === gridKey(b) }
// How many cells differ between two grids of the same size.
export function cellDifference(a, b) {
  let n = 0
  for (const k of Object.keys(a.cells)) {
    if ((a.cells[k].map(strokeKey).sort().join('|')) !== (b.cells[k] ?? []).map(strokeKey).sort().join('|')) n++
  }
  return n
}
// A quarter turn clockwise: cell (r, c) → (c, size-1-r); point (x, y) → (1-y, x).
export function rotateGrid(grid) {
  const out = emptyGrid(grid.size)
  const rot = ([x, y]) => P(round(1 - y), round(x))
  for (let rr = 0; rr < grid.size; rr++) for (let cc = 0; cc < grid.size; cc++) {
    const to = cellLabel(cc, grid.size - 1 - rr)
    out.cells[to] = grid.cells[cellLabel(rr, cc)].map(s => {
      if (s.kind === 'dot') return { kind: 'dot', at: rot(s.at) }
      if (s.kind === 'circle') return { kind: 'circle', at: rot(s.at), r: s.r }
      if (s.kind === 'line') return { kind: 'line', from: rot(s.from), to: rot(s.to) }
      return { kind: 'arc', from: rot(s.from), to: rot(s.to), bulge: s.bulge }
    })
  }
  return out
}
// Move one stroke: change the endpoints of one line or arc.
function nudgeOne(r, grid) {
  const keys = r.shuffle(Object.keys(grid.cells).filter(k => grid.cells[k].some(s => s.kind === 'line' || s.kind === 'arc')))
  for (const k of keys) {
    const idx = grid.cells[k].findIndex(s => s.kind === 'line' || s.kind === 'arc')
    const old = grid.cells[k][idx]
    for (let t = 0; t < 10; t++) {
      const a = r.pick([P(0, 0), P(0.5, 0), P(1, 0), P(0, 0.5), P(1, 0.5), P(0, 1), P(0.5, 1), P(1, 1), CENTRE])
      const b = r.pick([P(0, 0), P(0.5, 0), P(1, 0), P(0, 0.5), P(1, 0.5), P(0, 1), P(0.5, 1), P(1, 1), CENTRE])
      const s = segment(r, a, b, old.kind)
      if (s && strokeKey(s) !== strokeKey(old)) {
        const out = clone(grid)
        out.cells[k][idx] = s
        return out
      }
    }
  }
  return null
}
function clone(grid) { return { size: grid.size, cells: structuredClone(grid.cells) } }

// --- the whole set: three grids, each with four options -------------------
// Option 0..3 are shuffled; `answer` is the index of the real one.
export function generateSet(seed) {
  const r = rng(seed)
  const out = []

  // Grid 1: four clearly different shapes.
  {
    const real = makeShape(r, 3)
    const decoys = []
    let guard = 0
    while (decoys.length < 3 && guard++ < 200) {
      const d = makeShape(r, 3)
      if (cellDifference(d, real) >= 5 && decoys.every(x => cellDifference(x, d) >= 5)) decoys.push(d)
    }
    if (decoys.length < 3) throw new Error('grid 1 decoys')
    out.push(withOptions(r, 1, real, decoys))
  }

  // Grid 2: one decoy shares the shape and differs in the extra.
  {
    const m = makeMerged(r, 4)
    const decoys = []
    let guard = 0
    while (decoys.length < 1 && guard++ < 200) {
      const twin = makeMerged(r, 4, { top: m.top, left: m.left, overlay: m.overlay === 'dots' ? 'rays' : 'dots' })
      const diff = cellDifference(twin.grid, m.grid)
      if (diff >= 3 && diff <= 9) decoys.push(twin.grid)
    }
    guard = 0
    while (decoys.length < 3 && guard++ < 200) {
      const other = makeMerged(r, 4)
      if (cellDifference(other.grid, m.grid) >= 6 && decoys.every(x => cellDifference(x, other.grid) >= 4)) decoys.push(other.grid)
    }
    if (decoys.length < 3) throw new Error('grid 2 decoys')
    out.push(withOptions(r, 2, m.grid, decoys))
  }

  // Grid 3: the rotated copy, one stroke moved, and one other pattern. A
  // pattern that cannot be nudged (or matched) is thrown away for a fresh one,
  // so a seed never fails on the night.
  {
    let real = null, rotated = null, nudged = null, other = null
    for (let attempt = 0; attempt < 20 && !(nudged && other); attempt++) {
      real = makePattern(r, 5)
      rotated = rotateGrid(real)
      nudged = null; other = null
      let guard = 0
      while (!nudged && guard++ < 50) nudged = nudgeOne(r, real)
      guard = 0
      while (!other && guard++ < 50) {
        const p = makePattern(r, 5)
        if (cellDifference(p, real) >= 8) other = p
      }
    }
    if (!nudged) throw new Error('grid 3 nudge')
    if (!other) throw new Error('grid 3 other')
    out.push(withOptions(r, 3, real, [rotated, nudged, other]))
  }
  return { seed, grids: out }
}

function withOptions(r, number, real, decoys) {
  const options = r.shuffle([{ grid: real, real: true }, ...decoys.map(grid => ({ grid, real: false }))])
  const answer = options.findIndex(o => o.real)
  return {
    number,
    size: real.size,
    cells: real.cells,
    order: r.shuffle(drawnCells(real)), // the shuffled turn order of drawn cells
    options: options.map(o => o.grid.cells),
    answer,
  }
}

// --- checks, for tests and for the generator's own sanity -----------------
export function checkGrid(grid) {
  const problems = []
  for (const [k, strokes] of Object.entries(grid.cells)) {
    if (strokes.length > 2) problems.push(`${k}: ${strokes.length} strokes`)
    for (const s of strokes) {
      if (s.kind === 'line' || s.kind === 'arc') {
        if (onSameEdge(s.from, s.to)) problems.push(`${k}: stroke along an edge`)
        if (dist(s.from, s.to) < 0.5) problems.push(`${k}: stroke too small`)
      }
    }
  }
  return problems
}
