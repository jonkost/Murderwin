// Nanoleaf Open API v1 over plain HTTP, port 16021. One controller, one
// token. Works for the Elements (white panels, touch) and the Lines (colour
// bars, no touch). Verified on paper against the API docs; every call here
// is one to try on the real wall first (docs/study-light-game.md, technical).
//
// Pairing (once per controller): hold the controller's power button for
// 5–7 seconds until the LED flashes, then within 30 seconds:
//   curl -X POST http://<ip>:16021/api/v1/new      → { "auth_token": "…" }
// The token does not expire. Put it in station/.env (never committed).

export class Nanoleaf {
  constructor({ host, token, name = 'nanoleaf', fetchImpl = globalThis.fetch, log = () => {} } = {}) {
    if (!host || !token) throw new Error(`${name}: host and token are required`)
    this.base = `http://${host}:16021/api/v1/${token}`
    this.name = name
    this.fetch = fetchImpl
    this.log = log
    this.panels = []        // [{ id, x, y }] from the layout, sorted left to right, top to bottom
    this.lastError = null
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

  // Read the panel layout so nobody hand-types it. The controller itself
  // (shapeType 12 on Elements) is left out: it has no light.
  async loadLayout() {
    const layout = await this.call('/panelLayout/layout')
    const data = layout?.positionData ?? []
    this.panels = data
      .filter(p => p.shapeType !== 12)
      .map(p => ({ id: p.panelId, x: p.x, y: p.y, shape: p.shapeType }))
      .sort((a, b) => (b.y - a.y) || (a.x - b.x))
    return this.panels
  }

  async on(value = true) { return this.call('/state', { method: 'PUT', body: { on: { value } } }) }
  async brightness(value, duration = 0) { return this.call('/state', { method: 'PUT', body: { brightness: { value, duration } } }) }

  // Light each panel its own colour at once: a static frame.
  // frame = { [panelId]: [r, g, b] }. Panels not named go dark.
  // Elements are white-only: they render RGB as a white brightness, so a
  // "lit" Elements panel is [255,255,255] and a dim one [40,40,40].
  async frame(frame, transition = 1) {
    const ids = this.panels.map(p => p.id)
    const parts = [String(ids.length)]
    for (const id of ids) {
      const [r, g, b] = frame[id] ?? [0, 0, 0]
      parts.push(`${id} 1 ${r} ${g} ${b} 0 ${transition}`)
    }
    return this.call('/effects', {
      method: 'PUT',
      body: { write: { command: 'display', animType: 'static', animData: parts.join(' '), loop: false, palette: [] } },
    })
  }

  // Touch events: the server-sent events stream, id 4 = touch.
  // Each event: { gesture: 0 single tap | 1 double tap | 2 swipe up …, panelId }.
  // Calls onTouch(panelId, gesture). Reconnects on its own. Returns a stop().
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
                for (const ev of parsed.events ?? []) onTouch(ev.panelId, ev.gesture)
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
