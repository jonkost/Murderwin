// Nanoleaf Open API v1 over plain HTTP, port 16021. One controller, one
// token. Works for the Elements (white panels, touch) and the Lines (colour
// bars, no touch). The layout read, the frames and the flash were tried on
// both real walls on 24 Oct 2026; touch is still to try (only a swipe has
// come through so far). docs/study-light-game.md, technical.
//
// Pairing (once per controller): hold the controller's power button for
// 5–7 seconds until the LED flashes, then within 30 seconds:
//   curl -X POST http://<ip>:16021/api/v1/new      → { "auth_token": "…" }
// The token does not expire. Put it in station/.env (never committed).

export class Nanoleaf {
  constructor({ host, token, name = 'nanoleaf', fetchImpl = globalThis.fetch, log = () => {}, touchMap = {} } = {}) {
    if (!host || !token) throw new Error(`${name}: host and token are required`)
    this.base = `http://${host}:16021/api/v1/${token}`
    this.name = name
    this.fetch = fetchImpl
    this.log = log
    this.panels = []        // [{ id, x, y, pieces }] the game's panels, sorted left to right, top to bottom
    this.pieces = []        // every piece id the controller lights, in frame order
    this.panelOf = new Map() // piece id → the id of the panel it belongs to
    this.lastError = null
    this.strayTouches = new Set()
    // touch id → panel id, taught on the real wall (lib/teach.js): the
    // Elements name a tapped hexagon by an id their layout never lists
    this.touchMap = new Map()
    this.setTouchMap(touchMap)
  }

  // A newly taught map takes over at once, with no restart (the study test).
  setTouchMap(touches = {}) {
    this.touchMap = new Map(Object.entries(touches ?? {}).map(([k, v]) => [Number(k), Number(v)]))
  }

  // The panel a piece belongs to (a touch may name any piece of it, or the
  // id the wall taps by, once taught).
  unitOf(pieceId) { return this.panelOf.get(pieceId) ?? this.touchMap.get(pieceId) ?? pieceId }

  // How many of the game's panels a tap can reach through the taught map.
  get taughtPanels() {
    const ids = new Set(this.panels.map(p => p.id))
    return new Set([...this.touchMap.values()].filter(id => ids.has(id))).size
  }

  async call(path, { method = 'GET', body } = {}) {
    const res = await this.fetch(`${this.base}${path}`, {
      method, headers: body ? { 'Content-Type': 'application/json' } : {},
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(4000),
    })
    if (!res.ok && res.status !== 204) throw new Error(`${this.name}: ${method} ${path} → ${res.status}`)
    if (res.status === 204) return null
    const text = await res.text()
    return text ? JSON.parse(text) : null
  }

  // Read the panel layout so nobody hand-types it, and gather its pieces into
  // the panels the game plays with (groupLayout below).
  async loadLayout() {
    const layout = await this.call('/panelLayout/layout')
    const { panels, pieces } = groupLayout(layout)
    this.panels = panels
    this.pieces = pieces
    this.panelOf = new Map(panels.flatMap(p => p.pieces.map(id => [id, p.id])))
    return this.panels
  }

  async on(value = true) { return this.call('/state', { method: 'PUT', body: { on: { value } } }) }
  // The controller flashes every panel once, then goes back to what it showed (the study test's Flash the walls).
  async identify() { return this.call('/identify', { method: 'PUT' }) }
  async brightness(value, duration = 0) { return this.call('/state', { method: 'PUT', body: { brightness: { value, duration } } }) }

  // Light each panel its own colour at once: a static frame.
  // frame = { [panelId]: [r, g, b] }. Every piece of a panel takes its
  // colour; panels not named, and pieces in no panel (the Lines connectors),
  // go dark.
  // Elements are white-only: they render RGB as a white brightness, so a
  // "lit" Elements panel is [255,255,255] and a dim one [40,40,40].
  async frame(frame, transition = 1) {
    const ids = this.pieces.length ? this.pieces : this.panels.map(p => p.id)
    const parts = [String(ids.length)]
    for (const id of ids) {
      const [r, g, b] = frame[this.unitOf(id)] ?? [0, 0, 0]
      parts.push(`${id} 1 ${r} ${g} ${b} 0 ${transition}`)
    }
    return this.call('/effects', {
      method: 'PUT',
      body: { write: { command: 'display', animType: 'static', animData: parts.join(' '), loop: false, palette: [] } },
    })
  }

  // Touch events: the server-sent events stream, id 4 = touch.
  // Each event: { gesture: 0 single tap | 1 double tap | 2 swipe up …, panelId }.
  // Calls onTouch(panelId, gesture, tapId): the panel the tap names, and the
  // id the wall itself sent (what lib/teach.js learns). Reconnects on its
  // own. Returns a stop().
  listenTouch(onTouch) {
    let stopped = false
    let controller = null
    const loop = async () => {
      while (!stopped) {
        controller = new AbortController()
        try {
          const res = await this.fetch(`${this.base}/events?id=4`, { signal: controller.signal })
          if (!res.ok || !res.body) throw new Error(`${this.name}: events → ${res.status}`)
          const reader = res.body.getReader()
          const decoder = new TextDecoder()
          let buf = ''
          while (!stopped) {
            const { value, done } = await reader.read()
            if (done) break
            buf += decoder.decode(value, { stream: true })
            let idx
            while ((idx = buf.indexOf('\n\n')) >= 0) {
              const chunk = buf.slice(0, idx); buf = buf.slice(idx + 2)
              const data = chunk.split('\n').filter(l => l.startsWith('data:')).map(l => l.slice(5).trim()).join('')
              if (!data) continue
              try {
                const parsed = JSON.parse(data)
                for (const ev of parsed.events ?? []) {
                  const id = this.unitOf(ev.panelId)
                  // a tap on a piece the layout never named: said once per piece, for the hardware evening
                  if ((ev.gesture === 0 || ev.gesture === 1) && !this.panels.some(p => p.id === id) && !this.strayTouches.has(ev.panelId)) {
                    this.strayTouches.add(ev.panelId)
                    this.log(`${this.name}: a tap on piece ${ev.panelId}, which is in no panel of the layout (teach the taps: the workshop's Study test page, or npm run teach-touch)`)
                  }
                  onTouch(id, ev.gesture, ev.panelId)
                }
              } catch { /* a partial line; wait for more */ }
            }
          }
        } catch (e) {
          this.lastError = e
          this.log(`${this.name}: touch stream dropped (${e?.name ?? 'error'}); reconnecting`)
        }
        if (!stopped) await new Promise(r => setTimeout(r, 1500))
      }
    }
    loop()
    return () => { stopped = true; controller?.abort() }
  }
}

// ---- from the controller's pieces to the game's panels ----------------------
// The controller lists every piece it can light, and on the real walls
// (24 Oct 2026) those are not the panels a player sees: the Elements report
// each hexagon as its six corner lights (shapeType 15), and the Lines report
// each bar as its two halves (shapeType 18) plus the connectors between bars
// (16), the controller cap (19) and the power connector (20). groupLayout
// gathers them: one panel per hexagon, one per bar, every other kind of piece
// its own panel, the Lines' joints in no panel. A panel's id is the smallest
// id among its pieces; its position is the middle of its pieces.
const CONTROLLER = 12, ELEMENTS_CORNER = 15, LINES_HALF = 18
const LINES_JOINTS = new Set([16, 19, 20])

export function groupLayout(layout) {
  const side = layout?.sideLength > 0 ? layout.sideLength : 100
  const pieces = (layout?.positionData ?? [])
    .filter(p => p.shapeType !== CONTROLLER)
    .map(p => ({ id: p.panelId, x: p.x, y: p.y, o: p.o ?? 0, shape: p.shapeType }))
  const groups = [
    ...hexagonsFromCorners(pieces.filter(p => p.shape === ELEMENTS_CORNER), side),
    ...barsFromHalves(pieces.filter(p => p.shape === LINES_HALF), side),
    ...pieces.filter(p => p.shape !== ELEMENTS_CORNER && p.shape !== LINES_HALF && !LINES_JOINTS.has(p.shape)).map(p => [p]),
  ]
  const panels = groups
    .map(g => ({
      id: Math.min(...g.map(p => p.id)),
      x: Math.round(g.reduce((s, p) => s + p.x, 0) / g.length),
      y: Math.round(g.reduce((s, p) => s + p.y, 0) / g.length),
      shape: g[0].shape,
      pieces: g.map(p => p.id).sort((a, b) => a - b),
    }))
    .sort((a, b) => (b.y - a.y) || (a.x - b.x))
  const grouped = new Set(panels.flatMap(p => p.pieces))
  return { panels, pieces: [...panels.flatMap(p => p.pieces), ...pieces.filter(p => !grouped.has(p.id)).map(p => p.id)] }
}

// A corner light sits at the hexagon's middle plus a fixed distance in the
// direction its orientation names (o, in degrees, taken modulo 360). That
// distance, and which way y runs, are not in the layout, so both are
// searched: the pair that gathers the most corners into sixes wins. A
// corner that will not gather stays a panel on its own.
export function hexagonsFromCorners(corners, side) {
  if (!corners.length) return []
  const tolerance = side * 0.25
  let best = null
  for (const ySign of [1, -1]) {
    for (let step = 25; step <= 150; step++) {
      const reach = side * step / 100
      const groups = gather(corners.map(c => {
        const a = (c.o % 360) * Math.PI / 180
        return { piece: c, x: c.x - reach * Math.cos(a), y: c.y - ySign * reach * Math.sin(a) }
      }), tolerance)
      const score = groups.filter(g => g.length === 6).length * 1000 - groups.length
      if (!best || score > best.score) best = { score, groups }
    }
  }
  return best.groups.map(g => g.map(m => m.piece))
}

// The two halves of a bar share an orientation (o modulo 180) and sit half a
// bar apart. The closest such pairs are matched first, so two bars meeting
// end to end in a straight line, whose inner halves are a little further
// apart than a bar's own, are never crossed. A half with no partner stays a
// panel on its own.
export function barsFromHalves(halves, side) {
  const pairs = []
  for (let i = 0; i < halves.length; i++) {
    for (let j = i + 1; j < halves.length; j++) {
      const a = halves[i], b = halves[j]
      if (a.o % 180 !== b.o % 180) continue
      const d = Math.hypot(a.x - b.x, a.y - b.y)
      if (d >= side * 0.35 && d <= side * 0.65) pairs.push({ i, j, d })
    }
  }
  pairs.sort((p, q) => p.d - q.d)
  const taken = new Set(), bars = []
  for (const { i, j } of pairs) {
    if (taken.has(i) || taken.has(j)) continue
    taken.add(i); taken.add(j)
    bars.push([halves[i], halves[j]])
  }
  halves.forEach((h, i) => { if (!taken.has(i)) bars.push([h]) })
  return bars
}

// Points within `tolerance` of a group's middle join it.
function gather(points, tolerance) {
  const groups = []
  for (const p of points) {
    const g = groups.find(g => Math.hypot(g.x - p.x, g.y - p.y) <= tolerance)
    if (g) { g.members.push(p); g.x += (p.x - g.x) / g.members.length; g.y += (p.y - g.y) / g.members.length }
    else groups.push({ x: p.x, y: p.y, members: [p] })
  }
  return groups.map(g => g.members)
}

export const COLOUR_RGB = {
  red: [255, 0, 0], yellow: [255, 190, 0], green: [0, 200, 40],
  blue: [0, 60, 255], pink: [255, 0, 140], white: [255, 255, 255],
}

// Which Lines bars to light to show a count: every other bar from one end
// when there are enough (so the dark gaps make them countable), otherwise
// side by side from the end.
export function countSegments(segmentIds, n) {
  if (segmentIds.length >= 2 * n - 1) return segmentIds.filter((_, i) => i % 2 === 0).slice(0, n)
  return segmentIds.slice(0, n)
}
