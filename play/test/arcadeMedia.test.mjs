import { test } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { inflateSync } from 'node:zlib'
import { FACE_IDS, PETS, SOUND_NAMES } from '../src/lib/arcade.js'
import { ART_FACES, FACE_SIZE, PET_BOXES, PET_FILES, faceCanvas } from '../src/lib/arcadeArt.js'
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
// every word small, keeps what fillText was asked to write and the glow behind
// it, and puts its settings back on restore(), as a browser's does.
const written = []
const glows = [] // each fillText's words, with the shadowColor and shadowBlur behind them
class FakeCanvas {
  constructor(width, height) {
    this.width = width; this.height = height; this.calls = []
    const calls = this.calls, kept = {}, saved = [], gradient = { addColorStop() {} }
    this.pen = new Proxy(kept, {
      get(_, name) {
        if (typeof name === 'symbol' || name in kept) return kept[name]
        if (name === 'measureText') return () => ({ width: 10, actualBoundingBoxAscent: 5, actualBoundingBoxDescent: 5, actualBoundingBoxLeft: 5, actualBoundingBoxRight: 5 })
        if (name === 'createRadialGradient' || name === 'createLinearGradient') return () => gradient
        if (name === 'getImageData') return (x, y, w, h) => ({ data: new Uint8ClampedArray(w * h * 4) })
        return (...args) => {
          calls.push(name)
          if (name === 'save') saved.push({ ...kept })
          if (name === 'restore' && saved.length) { const was = saved.pop(); for (const k of Object.keys(kept)) delete kept[k]; Object.assign(kept, was) }
          if (name === 'fillText') { written.push(args[0]); glows.push([args[0], kept.shadowColor, kept.shadowBlur]) }
        }
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

test('G54 the Tail key on the menu is a black cat (Jon, 29 Oct 2026); the treat in the game is still a fish', async () => {
  const CAT = '\u{1F408}\u200D\u2B1B', FISH = '\u{1F41F}'
  await withBrowser({ OffscreenCanvas: FakeCanvas }, () => {
    // drawn fresh, at a size no other test has drawn
    const drawn = id => { written.length = 0; glows.length = 0; faceCanvas(id, FACE_SIZE + 1); return [...written] }
    const tail = drawn('menu:tail')
    assert.ok(tail.includes(CAT), 'a black cat')
    assert.ok(tail.includes('Tail'), 'over its name')
    assert.ok(!tail.includes(FISH), 'no fish on the menu')
    // so it shows on the dark blue: drawn twice in a parchment glow, and its name plain
    const cats = glows.filter(([w]) => w === CAT)
    assert.equal(cats.length, 2, 'drawn twice')
    for (const [, colour, blur] of cats) assert.ok(colour === 'rgba(241, 232, 214, 0.9)' && blur > 0, `in the glow: ${colour} ${blur}`)
    assert.ok(glows.filter(([w]) => w === 'Tail').every(([, colour]) => !colour), 'its name has no glow')
    assert.ok(drawn('fish').includes(FISH), 'the fish in the game')
    for (const id of ['menu:pointer', 'menu:mice', 'menu:knock', 'menu:yarn']) assert.ok(!drawn(id).includes(CAT), `no cat on ${id}`)
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
// The newest pretend picture asked for this file (each loadArt asks for all five faces).
const pictureOf = file => pictures.findLast(p => decodeURIComponent(String(p.src ?? '')).endsWith(`/household/faces/${file}`))

test('G54 Boo\'s face picture: in time, it is on every Boo key, even on a page opened behind another tab; after loadArt\'s wait it is never used, and the stand-in stays all session', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] })
  await withBrowser({ OffscreenCanvas: FakeCanvas, Image: FakeImage }, async () => {
    // in time: the picture loads at once, and the page has drawn no frame
    const inTime = await import('../src/lib/arcadeArt.js?boo-in-time')
    const asked = inTime.loadArt()
    pictureOf('Boo Face.png').arrive()
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
    pictureOf('Boo Face.png').arrive()
    pictureOf('Boo Face.png').drawFrame()
    await settled()
    for (const id of BOO_KEYS) assert.equal(booOn(late.faceCanvas(id, FACE_SIZE * 2)), 'stand-in', `${id}, drawn after the picture came`)
    assert.equal(await late.loadArt(), false)
  })
})

// A pet on a face: its picture, or its stand-in (Boo's cat's head, a picture emoji for the rest).
const petOn = canvas => (canvas.calls.includes('drawImage') ? 'picture' : canvas.calls.some(c => c === 'ellipse' || c === 'fillText') ? 'stand-in' : 'neither')

test('G54 Whack-a-Mouse\'s pets: each is the house\'s own face picture, up and tapped, once it is in; one that comes after loadArt\'s wait keeps its stand-in', async t => {
  // the five pets, each with its picture in household/faces/
  assert.deepEqual(Object.keys(PET_FILES).sort(), [...PETS].sort())
  for (const file of Object.values(PET_FILES)) assert.ok(existsSync(new URL(`../public/household/faces/${file}`, import.meta.url)), file)

  t.mock.timers.enable({ apis: ['setTimeout'] })
  await withBrowser({ OffscreenCanvas: FakeCanvas, Image: FakeImage }, async () => {
    // in time: every pet, up and tapped, is its picture
    const inTime = await import('../src/lib/arcadeArt.js?pets-in-time')
    const asked = inTime.loadArt()
    for (const file of Object.values(PET_FILES)) pictureOf(file).arrive()
    await settled()
    t.mock.timers.runAll()
    assert.equal(await asked, true)
    for (const pet of PETS) for (const kind of ['pet', 'oops']) assert.equal(petOn(inTime.faceCanvas(`${kind}:${pet}`, FACE_SIZE)), 'picture', `${kind}:${pet}`)

    // each pet's picture too late, in turn: it keeps its stand-in all session (a whole dog for
    // Sir Irwin, as a dog's face looks too like a mouse's; a cat for the cats), the others have
    // their pictures. Boo's late picture is the test above.
    const STAND_IN = { irwin: '\u{1F415}', granola: '\u{1F431}', salem: '\u{1F431}', zimmy: '\u{1F431}' }
    for (const slow of PETS.filter(p => p !== 'boo')) {
      const late = await import(`../src/lib/arcadeArt.js?pets-late-${slow}`)
      const waited = late.loadArt()
      for (const [pet, file] of Object.entries(PET_FILES)) if (pet !== slow) pictureOf(file).arrive()
      await settled()
      t.mock.timers.runAll()
      assert.equal(await waited, true)
      pictureOf(PET_FILES[slow]).arrive()
      await settled()
      for (const kind of ['pet', 'oops']) {
        written.length = 0
        assert.equal(petOn(late.faceCanvas(`${kind}:${slow}`, FACE_SIZE * 2)), 'stand-in', `${kind}:${slow}`)
        assert.ok(written.includes(STAND_IN[slow]), `${kind}:${slow} is ${STAND_IN[slow]} meanwhile`)
        for (const pet of PETS.filter(p => p !== slow)) assert.equal(petOn(late.faceCanvas(`${kind}:${pet}`, FACE_SIZE * 2)), 'picture', `${kind}:${pet}`)
      }
    }
  })
})

test('G54 Boo\'s face picture is asked for first and the other four after it, and the page asks for her screen pictures only once the faces are in, so nothing holds them up', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] })
  await withBrowser({ OffscreenCanvas: FakeCanvas, Image: FakeImage }, async () => {
    const art = await import('../src/lib/arcadeArt.js?first')
    const asked = art.loadArt()
    for (const [pet, file] of Object.entries(PET_FILES)) assert.equal(pictureOf(file).fetchPriority, pet === 'boo' ? 'high' : 'low', file)
    t.mock.timers.runAll() // nothing arrives: the wait runs out
    assert.equal(await asked, false)
  })
  const page = readFileSync(new URL('../src/screens/Arcade.jsx', import.meta.url), 'utf8')
  assert.match(page, /loadArt\(\)\.then\(\(\) => \{[^}]*for \(const name of BOO_PICTURES\) \{ const img = new Image\(\); img\.src = booUrl\(name\) \}\s*\}\)/, 'inside loadArt().then')
  assert.equal(page.match(/of BOO_PICTURES/g)?.length, 1, 'and nowhere else')
})

// Where a face picture is more than faintly there (alpha over 100), as shares
// of the picture: left, top, right, bottom. Reads an 8-bit RGBA PNG, row by row.
function stickerBox(url) {
  const png = readFileSync(url)
  const width = png.readUInt32BE(16), height = png.readUInt32BE(20)
  assert.ok(png[24] === 8 && png[25] === 6 && png[28] === 0, 'an 8-bit RGBA picture, not interlaced')
  const idat = []
  for (let at = 8; at < png.length;) {
    const len = png.readUInt32BE(at), type = png.toString('latin1', at + 4, at + 8)
    if (type === 'IDAT') idat.push(png.subarray(at + 8, at + 8 + len))
    if (type === 'IEND') break
    at += 12 + len
  }
  const raw = inflateSync(Buffer.concat(idat))
  const stride = width * 4
  let prev = new Uint8Array(stride), cur = new Uint8Array(stride)
  let l = width, t = height, r = -1, b = -1
  for (let y = 0; y < height; y++) {
    const at = y * (stride + 1), filter = raw[at]
    for (let i = 0; i < stride; i++) {
      const a = i >= 4 ? cur[i - 4] : 0, up = prev[i], c = i >= 4 ? prev[i - 4] : 0
      let v = raw[at + 1 + i]
      if (filter === 1) v += a
      else if (filter === 2) v += up
      else if (filter === 3) v += (a + up) >> 1
      else if (filter === 4) { const p = a + up - c, pa = Math.abs(p - a), pb = Math.abs(p - up), pc = Math.abs(p - c); v += pa <= pb && pa <= pc ? a : pb <= pc ? up : c }
      cur[i] = v & 255
    }
    for (let x = 0; x < width; x++) if (cur[x * 4 + 3] > 100) { if (x < l) l = x; if (x > r) r = x; if (y < t) t = y; if (y > b) b = y }
    const was = prev; prev = cur; cur = was
  }
  return [l / width, t / height, (r + 1) / width, (b + 1) / height]
}

test('G54 each pet is fitted by where it really sits in its face picture: a new picture fails here until its box is measured again (household/README.md)', () => {
  for (const pet of PETS) {
    const box = stickerBox(new URL(`../public/household/faces/${PET_FILES[pet]}`, import.meta.url))
    PET_BOXES[pet].forEach((v, i) => assert.ok(Math.abs(v - box[i]) <= 0.002, `${pet}'s ${['left', 'top', 'right', 'bottom'][i]}: the picture says ${box[i].toFixed(3)}, PET_BOXES ${v}`))
  }
})
