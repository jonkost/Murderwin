import { test } from 'node:test'
import assert from 'node:assert/strict'
import { FACE_IDS, SOUND_NAMES } from '../src/lib/arcade.js'
import { ART_FACES, FACE_SIZE, faceCanvas } from '../src/lib/arcadeArt.js'
import { SOUNDS, sfx } from '../src/lib/arcadeSound.js'

// Miss Boo LaRue's Arcade (28 Oct 2026): the pictures and the sounds
// (lib/arcadeArt.js, lib/arcadeSound.js), in node. A pretend canvas, picture
// and AudioContext stand in for the browser's and write down what is drawn
// and played. G54, with the games' own checks in arcade.test.mjs.
// Nothing read from a night, nothing printed.

// Puts pretend browser things on globalThis for one test, and always takes them off again.
async function withBrowser(things, run) {
  const before = Object.keys(things).map(name => [name, Object.getOwnPropertyDescriptor(globalThis, name)])
  Object.assign(globalThis, things)
  try {
    return await run()
  } finally {
    for (const [name, had] of before) {
      if (had) Object.defineProperty(globalThis, name, had)
      else delete globalThis[name]
    }
  }
}

// ---- the pictures ------------------------------------------------------------

// A pretend canvas. Its pen takes any call and writes its name down, measures
// every word small, and keeps what fillText was asked to write.
const written = []
class FakeCanvas {
  constructor(width, height) {
    this.width = width; this.height = height; this.calls = []
    const calls = this.calls, kept = {}, gradient = { addColorStop() {} }
    this.pen = new Proxy(kept, {
      get(_, name) {
        if (typeof name === 'symbol' || name in kept) return kept[name]
        if (name === 'measureText') return () => ({ width: 10, actualBoundingBoxAscent: 5, actualBoundingBoxDescent: 5, actualBoundingBoxLeft: 5, actualBoundingBoxRight: 5 })
        if (name === 'createRadialGradient' || name === 'createLinearGradient') return () => gradient
        if (name === 'getImageData') return (x, y, w, h) => ({ data: new Uint8ClampedArray(w * h * 4) })
        return (...args) => { calls.push(name); if (name === 'fillText') written.push(args[0]) }
      },
      set(_, name, value) { kept[name] = value; return true },
    })
  }
  getContext() { return this.pen }
}

test('G54 every face a game can show is drawn, and none is the art\'s "?" for a face it has no drawing for', async () => {
  // the engine's faces, and the art's own list, which it makes from its drawing tables
  const ids = [...new Set([...FACE_IDS, ...ART_FACES])]
  await withBrowser({ OffscreenCanvas: FakeCanvas }, () => {
    for (const id of ids) {
      written.length = 0
      assert.ok(faceCanvas(id, FACE_SIZE) instanceof FakeCanvas, `${id} is drawn on a canvas`)
      assert.ok(!written.includes('?'), `${id} has a drawing`)
      for (const s of written) assert.ok(typeof s === 'string' && s.length > 0, `${id} writes only real words and pictures`)
    }
    // a face the art does not know is the "?", so the check above would see one
    written.length = 0
    assert.ok(faceCanvas('no-such-face', FACE_SIZE) instanceof FakeCanvas)
    assert.ok(written.includes('?'), 'an unknown face is the "?"')
  })
})

// ---- the sounds --------------------------------------------------------------

// A pretend AudioContext, running. It writes down every node it makes, when
// each note starts and stops, and when each change to a gain or a pitch is due.
function fakeAudio() {
  const made = []
  const param = () => {
    const p = { value: 0, changes: [] }
    for (const how of ['setValueAtTime', 'linearRampToValueAtTime', 'exponentialRampToValueAtTime', 'setTargetAtTime']) {
      p[how] = (value, at) => { p.changes.push(at); return p }
    }
    return p
  }
  const node = kind => {
    const n = {
      kind, frequency: param(), gain: param(), Q: param(), outs: [], started: null, stopped: null,
      connect(to) { n.outs.push(to); return to }, disconnect() {},
      start(at = 0) { n.started = at }, stop(at = 0) { n.stopped = at },
    }
    made.push(n)
    return n
  }
  return {
    state: 'running', currentTime: 0, sampleRate: 48000, destination: { kind: 'speakers' }, made,
    createOscillator: () => node('note'), createBufferSource: () => node('note'),
    createGain: () => node('gain'), createBiquadFilter: () => node('filter'),
    createBuffer: (channels, length) => { const data = new Float32Array(length); return { getChannelData: () => data } },
  }
}
// What one sfx call made: when its first note starts, and when its last has
// faded out (its gain's last change; the oscillator stops a moment later, silent).
function play(ctx, name) {
  const from = ctx.made.length
  const played = sfx(ctx, name)
  const made = ctx.made.slice(from)
  const notes = made.filter(n => n.kind === 'note')
  return {
    played, made, notes,
    starts: Math.min(...notes.map(n => n.started)),
    ends: Math.max(...made.filter(n => n.kind === 'gain').flatMap(n => n.gain.changes)),
  }
}

test('G54 every sound the engine asks for plays: its notes start, stop and reach the speakers; an unknown name, no context or a sleeping one plays nothing', () => {
  const ctx = fakeAudio()
  for (const name of new Set([...SOUNDS, ...SOUND_NAMES])) {
    const p = play(ctx, name)
    assert.equal(p.played, true, `${name} plays`)
    assert.ok(p.notes.length > 0, `${name} has notes`)
    for (const n of p.notes) {
      assert.ok(Number.isFinite(n.started) && n.started >= ctx.currentTime, `${name}: each note starts`)
      assert.ok(Number.isFinite(n.stopped) && n.stopped > n.started, `${name}: and stops`)
    }
    assert.ok(p.made.some(n => n.outs.includes(ctx.destination)), `${name} reaches the speakers`)
  }
  const unknown = play(ctx, 'no-such-sound')
  assert.equal(unknown.played, false)
  assert.equal(unknown.made.length, 0, 'and makes nothing')
  assert.equal(sfx(null, 'coin'), false)
  assert.equal(sfx({ ...fakeAudio(), state: 'suspended' }, 'coin'), false)
})

test('G54 a bite plays before the lose tune, and the last fish or the last knock before the win tune, never on top of it', () => {
  const ctx = fakeAudio()
  for (const [first, ending] of [['bite', 'lose'], ['point', 'win'], ['knock', 'win']]) {
    ctx.currentTime += 10 // long after the pair before
    const a = play(ctx, first), b = play(ctx, ending) // one engine call: the same moment
    assert.ok(a.played && b.played)
    assert.ok(b.starts >= a.ends - 1e-9, `the ${ending} tune starts once the ${first} has faded out`)
    assert.ok(b.starts <= a.ends + 1e-9, `and straight after it, after the ${first}`)
  }
  // a tune with nothing before it starts at once, and every other sound starts at once, whatever is playing
  ctx.currentTime += 10
  assert.ok(Math.abs(play(ctx, 'lose').starts - (ctx.currentTime + 0.01)) < 1e-9, 'a tune on its own')
  ctx.currentTime += 10
  play(ctx, 'point')
  assert.ok(Math.abs(play(ctx, 'gold').starts - (ctx.currentTime + 0.01)) < 1e-9, 'a gold catch during a point')
})

// ---- Boo's face picture --------------------------------------------------------

// A pretend picture that loads when the test says so. Its decode() waits for
// the page to draw a frame, as a browser's does, and a page opened behind
// another tab draws none until it is shown.
const pictures = []
class FakeImage {
  constructor() {
    this.naturalWidth = 0; this.naturalHeight = 0
    this.frame = new Promise(drawn => { this.drawFrame = drawn })
    pictures.push(this)
  }
  decode() { return this.frame }
  arrive() { this.naturalWidth = this.naturalHeight = 1500; this.onload?.() }
}
// Boo on a face: her picture, or the stand-in cat's head.
const booOn = canvas => (canvas.calls.includes('drawImage') ? 'picture' : canvas.calls.includes('ellipse') ? 'stand-in' : 'neither')
const BOO_KEYS = ['boo', 'tail-head', 'bite', 'chaser', 'caught']
const settled = () => new Promise(done => setImmediate(done)) // every promise that can move on has

test('G54 Boo\'s face picture: in time, it is on every Boo key, even on a page opened behind another tab; after loadArt\'s wait it is never used, and the stand-in stays all session', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] })
  await withBrowser({ OffscreenCanvas: FakeCanvas, Image: FakeImage }, async () => {
    // in time: the picture loads at once, and the page has drawn no frame
    const inTime = await import('../src/lib/arcadeArt.js?boo-in-time')
    const asked = inTime.loadArt()
    pictures.at(-1).arrive()
    await settled()
    t.mock.timers.runAll() // the wait runs out, so a test that fails cannot hang
    assert.equal(await asked, true)
    for (const id of BOO_KEYS) assert.equal(booOn(inTime.faceCanvas(id, FACE_SIZE)), 'picture', id)

    // too late: the wait runs out (six seconds on the page), then the picture loads and the page draws a frame
    const late = await import('../src/lib/arcadeArt.js?boo-late')
    const waited = late.loadArt()
    t.mock.timers.runAll()
    assert.equal(await waited, false)
    assert.equal(booOn(late.faceCanvas('boo', FACE_SIZE)), 'stand-in')
    pictures.at(-1).arrive()
    pictures.at(-1).drawFrame()
    await settled()
    for (const id of BOO_KEYS) assert.equal(booOn(late.faceCanvas(id, FACE_SIZE * 2)), 'stand-in', `${id}, drawn after the picture came`)
    assert.equal(await late.loadArt(), false)
  })
})
