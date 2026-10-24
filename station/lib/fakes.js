// Stand-ins for the walls and the button box, for `npm run fake` and tests.
// The fake wall prints what it would light; the terminal's keys stand in for
// touches and button presses (see station.mjs for the key map).

export class FakeWall {
  constructor({ name, panelIds, log = console.log }) {
    this.name = name
    this.panels = panelIds.map((id, i) => ({ id, x: i * 100, y: 0 }))
    this.log = log
    this.frames = []
    this.flashes = 0
    this.touchMap = new Map()
    this.touchListener = null
  }
  async loadLayout() { return this.panels }
  async on() {}
  async brightness() {}
  async identify() { this.flashes += 1; this.log(`[${this.name}] flash`) }
  setTouchMap(touches = {}) { this.touchMap = new Map(Object.entries(touches).map(([k, v]) => [Number(k), Number(v)])) }
  async frame(frame) {
    this.frames.push(frame)
    const lit = this.panels.filter(p => (frame[p.id] ?? [0, 0, 0]).some(v => v > 60)).map(p => this.panels.indexOf(p) + 1)
    this.log(`[${this.name}] ${lit.length ? 'lit ' + lit.join(' ') : 'dark'}`)
  }
  listenTouch(fn) { this.touchListener = fn; return () => { this.touchListener = null } }
  // tests and the terminal poke this; a fake wall taps by the panel's own id
  touch(index) { const id = this.panels[index - 1]?.id; this.touchListener?.(id, 0, id) }
}

export class FakeDeck {
  constructor({ log = console.log } = {}) { this.log = log; this.listeners = []; this.lit = false; this.paints = [] }
  async paint(lit) { this.lit = lit; this.paints.push(lit); this.log(`[deck] ${lit ? 'keys lit' : 'keys dark'}`) }
  async shiver() { this.log('[deck] shiver') }
  onKey(fn) { this.listeners.push(fn) }
  press(name) { this.listeners.forEach(fn => fn(name)) }
  async close() {}
}
