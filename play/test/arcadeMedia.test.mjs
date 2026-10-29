import { test } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { inflateSync } from 'node:zlib'
import { FACE_IDS, PETS, SOUND_NAMES, colOf, gameFaces, newGame, rowOf, stepGame } from '../src/lib/arcade.js'
import { ART_FACES, COIN_BOX, COIN_FILE, FACE_SIZE, PET_BOXES, PET_FILES, faceCanvas, faceSolid } from '../src/lib/arcadeArt.js'
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

// A pretend canvas. Its pen takes any call and writes its name down (`calls`),
// and with it its arguments and the pen's settings at the time (`log`);
// measures every word small, unless a test gives it a ruler; keeps what
// fillText was asked to write and the glow behind it, each shape filled with
// the glow behind it, and each gradient's colours; and puts its settings back
// on restore(), as a browser's does.
const written = []
const glows = [] // each fillText's words, with the shadowColor and shadowBlur behind them
const fills = [] // each fill() of a shape: its fillStyle, shadowColor and shadowBlur
const SMALL = () => 10
let ruler = SMALL // how wide the pen measures words: (words, font) => pixels
class FakeCanvas {
  constructor(width, height) {
    this.width = width; this.height = height; this.calls = []; this.log = []
    const calls = this.calls, log = this.log, kept = {}, saved = []
    this.pen = new Proxy(kept, {
      get(_, name) {
        if (typeof name === 'symbol' || name in kept) return kept[name]
        if (name === 'measureText') return s => ({ width: ruler(String(s), kept.font), actualBoundingBoxAscent: 5, actualBoundingBoxDescent: 5, actualBoundingBoxLeft: 5, actualBoundingBoxRight: 5 })
        if (name === 'createRadialGradient' || name === 'createLinearGradient') return () => ({ colours: [], addColorStop(at, colour) { this.colours.push(colour) } })
        if (name === 'getImageData') return (x, y, w, h) => ({ data: new Uint8ClampedArray(w * h * 4) })
        return (...args) => {
          calls.push(name)
          const { font, textAlign, fillStyle, strokeStyle, lineWidth, globalAlpha = 1, shadowColor, shadowBlur } = kept
          log.push({ name, args, font, textAlign, fillStyle, strokeStyle, lineWidth, alpha: globalAlpha, shadowColor, shadowBlur })
          if (name === 'save') saved.push({ ...kept })
          if (name === 'restore' && saved.length) { const was = saved.pop(); for (const k of Object.keys(kept)) delete kept[k]; Object.assign(kept, was) }
          if (name === 'fillText') { written.push(args[0]); glows.push([args[0], kept.shadowColor, kept.shadowBlur]) }
          if (name === 'fill') fills.push([kept.fillStyle, kept.shadowColor, kept.shadowBlur])
        }
      },
      set(_, name, value) { kept[name] = value; return true },
    })
  }
  getContext() { return this.pen }
}

// What the pen did to paint a face: everything after faceCanvas scales it to
// the face's 72 units (before that, only the black under it all).
const painted = canvas => canvas.log.slice(canvas.log.findIndex(op => op.name === 'setTransform') + 1)
// What the pen drew last over a point of a face, in the face's 72 units: a
// stroke covers the points within half its width of its lines (each moveTo to
// lineTo since its beginPath), a fillRect or a drawImage its rectangle, and
// any other fill the box round its path. Null where nothing was drawn.
function topAt(canvas, x, y) {
  const drawn = []
  let lines = [], box = [], at = null
  const grow = (...xy) => { for (let i = 0; i < xy.length; i += 2) box.push([xy[i], xy[i + 1]]) }
  for (const op of painted(canvas)) {
    const a = op.args
    if (op.name === 'beginPath') { lines = []; box = []; at = null }
    else if (op.name === 'moveTo') { at = a; grow(...a) }
    else if (op.name === 'lineTo') { if (at) lines.push([...at, ...a]); at = a; grow(...a) }
    else if (op.name === 'arc') grow(a[0] - a[2], a[1] - a[2], a[0] + a[2], a[1] + a[2])
    else if (op.name === 'ellipse') grow(a[0] - a[2], a[1] - a[3], a[0] + a[2], a[1] + a[3])
    else if (op.name === 'roundRect' || op.name === 'rect') grow(a[0], a[1], a[0] + a[2], a[1] + a[3])
    else if (op.name === 'bezierCurveTo') grow(...a)
    else if (['fill', 'stroke', 'fillRect', 'drawImage', 'fillText'].includes(op.name)) drawn.push({ op, lines, box: [...box] })
  }
  const toLine = ([x0, y0, x1, y1]) => {
    const dx = x1 - x0, dy = y1 - y0, t = dx || dy ? Math.max(0, Math.min(1, ((x - x0) * dx + (y - y0) * dy) / (dx * dx + dy * dy))) : 0
    return Math.hypot(x - x0 - t * dx, y - y0 - t * dy)
  }
  const inside = (l, t, w, h) => x >= l && x <= l + w && y >= t && y <= t + h
  for (const { op, lines, box } of drawn.reverse()) {
    const a = op.args
    if (op.name === 'stroke' && lines.some(l => toLine(l) <= op.lineWidth / 2)) return op
    if (op.name === 'fillRect' && inside(...a)) return op
    if (op.name === 'drawImage' && inside(...a.slice(1))) return op
    if (op.name === 'fill' && box.length) {
      const xs = box.map(p => p[0]), ys = box.map(p => p[1])
      if (inside(Math.min(...xs), Math.min(...ys), Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys))) return op
    }
  }
  return null
}

// A colour's red, green and blue, from '#rgb' or '#rrggbb'; and how light it
// looks (its relative luminance: 0 is black, 1 white).
const rgbOf = hex => {
  const h = String(hex).slice(1)
  return (h.length === 3 ? [...h].map(c => c + c) : [h.slice(0, 2), h.slice(2, 4), h.slice(4, 6)]).map(c => parseInt(c, 16))
}
const linear = v => (v / 255 <= 0.04045 ? v / 255 / 12.92 : ((v / 255 + 0.055) / 1.055) ** 2.4)
const lightOf = hex => { const [r, g, b] = rgbOf(hex).map(linear); return 0.2126 * r + 0.7152 * g + 0.0722 * b }

// A key of Boo's tail, from what the pen did: the discs of its black fur (one
// shape) and of its white puff (the tip's), each [x, y, radius] in the key's 72 units.
function tailDrawn(canvas) {
  const shapes = []
  let discs = []
  for (const op of painted(canvas)) {
    if (op.name === 'beginPath') discs = []
    else if (op.name === 'arc') discs.push(op.args.slice(0, 3))
    else if (op.name === 'fill') shapes.push([op.fillStyle, discs])
  }
  const of = colour => shapes.find(([fill]) => fill === colour)?.[1] ?? []
  return { fur: of('#111114'), puff: of('#fff') }
}
// Each side of a key: its middle, a unit in from the edge, and the way along it.
const EDGES = { left: [1, 36, 0, 1], right: [71, 36, 0, 1], up: [36, 1, 1, 0], down: [36, 71, 1, 0] }
const BACK = { left: 'right', right: 'left', up: 'down', down: 'up' }
const covers = (discs, x, y) => discs.some(([cx, cy, r]) => Math.hypot(x - cx, y - cy) <= r)
// The sides the fur runs out through (it covers the side's middle), in EDGES' order.
const sidesOf = fur => Object.keys(EDGES).filter(side => covers(fur, EDGES[side][0], EDGES[side][1]))
// Where it runs out through a side, the fur is a band at least 24 of the 72
// units across, on the side's middle, so it meets the next key's fur.
const meets = (fur, side) => { const [x, y, ax, ay] = EDGES[side]; return [-12, 0, 12].every(d => covers(fur, x + d * ax, y + d * ay)) }
// The way the white puff lies from the key's middle (its discs' middle at least
// 8 units out that way, and on the line), or null.
function puffWay(puff) {
  if (!puff.length) return null
  const x = puff.reduce((n, [cx]) => n + cx, 0) / puff.length - 36, y = puff.reduce((n, [, cy]) => n + cy, 0) / puff.length - 36
  const out = { left: [-1, 0], right: [1, 0], up: [0, -1], down: [0, 1] }
  return Object.keys(out).find(way => { const [dx, dy] = out[way]; return x * dx + y * dy >= 8 && Math.abs(x * dy - y * dx) <= 1 }) ?? null
}

// The faces Boo Chasing Her Tail's board shows since Jon's note of 29 Oct 2026,
// the strikes, and the tokens, named here as well as in the engine's list.
const WAYS = ['up', 'down', 'left', 'right']
const FUR = ['left-right', 'down-up', 'down-left', 'down-right', 'left-up', 'right-up']
const FRIENDS = ['granola', 'irwin', 'salem', 'zimmy']
const TAIL_BOARD = ['rug', 'tail-boo', 'wall', ...FRIENDS.map(p => `pet:${p}`),
  ...WAYS.flatMap(w => [`tail-end:${w}`, `tail-tip:${w}`]), ...FUR.map(p => `tail-fur:${p}`), 'hit']
const STRIKES = ['miss', 'caught', ...['boo', ...FRIENDS].map(p => `oops:${p}`)]

test('G54 every face a game can show is drawn, and none is the art\'s "?" for a face it has no drawing for', async () => {
  // the engine's faces, the art's own list, which it makes from its drawing
  // tables, and the faces named above
  const ids = [...new Set([...FACE_IDS, ...ART_FACES, ...TAIL_BOARD, ...STRIKES, 'coin', 'coin-spent'])]
  for (const id of [...TAIL_BOARD, ...STRIKES]) assert.ok(ART_FACES.includes(id), `the art lists ${id}`)
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

test('G54 the menu\'s keys (Jon, 29 Oct 2026): each game\'s picture on a parchment plate over its name in gold; the Tail key a black cat, the Knock key Boo\'s paws; the vase stays on the table', async () => {
  const CAT = '\u{1F408}‍⬛', PAWS = '\u{1F43E}', VASE = '\u{1F3FA}', CLOCK = '\u{1F570}\u{FE0F}'
  await withBrowser({ OffscreenCanvas: FakeCanvas }, () => {
    // each draw at a size of its own, so faceCanvas never hands back a face it drew already (that writes nothing)
    let size = FACE_SIZE + 1
    const drawn = id => { written.length = 0; glows.length = 0; fills.length = 0; faceCanvas(id, size++); return [...written] }
    const tail = drawn('menu:tail')
    assert.ok(tail.includes(CAT) && tail.includes('Tail'), 'a black cat over its name')
    // the plate: a parchment disc under the picture, so the black cat shows on the black key; no glow round the cat
    assert.ok(fills.some(([fill]) => fill === '#F1E8D6'), 'a parchment plate')
    assert.ok(glows.every(([, colour]) => !colour), 'no glow on the Tail key')
    const knock = drawn('menu:knock')
    assert.ok(knock.includes(PAWS) && knock.includes('Knock'), 'the paws over its name')
    assert.ok(!knock.includes(VASE), 'no vase on the menu')
    for (const id of ['menu:pointer', 'menu:mice', 'menu:knock', 'menu:yarn']) assert.ok(!drawn(id).includes(CAT), `no cat on ${id}`)
    for (const id of ['menu:tail', 'menu:pointer', 'menu:mice', 'menu:yarn']) assert.ok(!drawn(id).includes(PAWS), `no paws on ${id}`)
    assert.ok(drawn('table:vase').includes(VASE), 'the vase on the table')
    assert.ok(drawn('edge:clock').includes(CLOCK), 'the clock on the end of the table')
    // the old faces are gone: the fish, the swipe, the crash
    for (const id of ['fish', 'swipe', 'crash', 'bite', 'tail-head', 'tail-body', 'table', 'below']) assert.ok(!ART_FACES.includes(id), `no ${id} now`)
  })
})

test('G54 every success is the green tick and every strike the red cross (Jon, 29 Oct 2026: "green for all sucessful input")', async () => {
  await withBrowser({ OffscreenCanvas: FakeCanvas }, () => {
    let size = FACE_SIZE + 40
    const drawn = id => faceCanvas(id, size++)
    const hit = drawn('hit')
    assert.equal(hit.pen.fillStyle, '#33bd66', 'on green')
    assert.ok(hit.calls.includes('stroke'), 'the tick is drawn')
    assert.equal(hit.pen.strokeStyle, '#111114', 'a black tick')
    const miss = drawn('miss')
    assert.equal(miss.pen.fillStyle, '#bf1925', 'on the house red')
    assert.ok(miss.calls.includes('stroke'), 'the cross is drawn')
    assert.equal(miss.pen.strokeStyle, '#F1E8D6', 'a parchment cross')
  })
})

test('G54 every strike is a big red cross, the face faint under it: a miss at the tables, Boo catching the dot, and every friend tapped', async () => {
  await withBrowser({ OffscreenCanvas: FakeCanvas }, () => {
    let size = FACE_SIZE + 60
    for (const id of STRIKES) {
      const key = faceCanvas(id, size++) // no pictures loaded: Boo's cat's head and the friends' stand-ins
      const ops = painted(key)
      const ground = ops.find(op => op.name === 'fillRect')
      assert.equal(ground.fillStyle, '#bf1925', `${id}: on the house red`)
      assert.deepEqual(ground.args, [0, 0, 72, 72], `${id}: all over`)
      // a point on either line of the cross, out to its ends, is the cross's
      // colour: parchment, over everything else on the key
      const cross = ops.filter(op => op.name === 'stroke').at(-1)
      assert.equal(cross.strokeStyle, '#F1E8D6', `${id}: a parchment cross`)
      assert.ok(cross.lineWidth >= 7, `${id}: a thick one`)
      for (const [x, y] of [[36, 36], [20, 20], [28, 28], [44, 44], [52, 52], [52, 20], [44, 28], [28, 44], [20, 52]]) {
        assert.equal(topAt(key, x, y), cross, `${id}: (${x}, ${y}) is on the cross`)
      }
      // edged in a darker red, so it stays clear over a face; off it, the key
      const edge = ops.filter(op => op.name === 'stroke').at(-2)
      assert.ok(edge.strokeStyle !== '#F1E8D6' && edge.lineWidth > cross.lineWidth, `${id}: edged`)
      assert.ok(![cross, edge].includes(topAt(key, 36, 12)), `${id}: off the cross`)
      // the face: there (not on a plain miss), and faint
      const under = ops.slice(ops.indexOf(ground) + 1, ops.indexOf(edge)).filter(op => ['fill', 'stroke', 'drawImage', 'fillText'].includes(op.name))
      if (id === 'miss') assert.equal(under.length, 0, 'a miss is over nothing')
      else {
        assert.ok(under.length > 0, `${id}: the face is drawn`)
        for (const op of under) assert.ok(op.alpha >= 0.25 && op.alpha <= 0.5, `${id}: faintly`)
      }
      assert.ok([edge, cross].every(op => op.alpha === 1), `${id}: the cross at full strength`)
    }
  })
})

test('G54 Boo Chasing Her Tail on the whole board (Jon, 29 Oct 2026): a claret floor, her black tail lying on it in a gold glow with its white tip, stone walls lighter than the floor and darker than Boo\'s gold, and her friends in the dark', async () => {
  // the ring and her paw are gone
  for (const id of ['ring', 'tail-paw']) assert.ok(!ART_FACES.includes(id), `no ${id} now`)
  assert.equal(faceSolid('ring'), null)
  // the floor is one flat claret, so the deck paints it as a colour, not a picture
  assert.deepEqual([...faceSolid('rug')], [89, 47, 50])
  const CLARET = '#592F32', INK = '#111114'
  await withBrowser({ OffscreenCanvas: FakeCanvas }, () => {
    let size = FACE_SIZE + 80
    // every key of the tail is that claret all over, so it lies on the floor
    // next to anything; on it the black fur, one shape in a gold glow; and at
    // the tip, and only there, a white puff over the fur
    for (const id of TAIL_BOARD.filter(f => /^tail-(end|fur|tip):/.test(f))) {
      const ops = painted(faceCanvas(id, size++))
      assert.equal(ops[0].name, 'fillRect', id)
      assert.equal(ops[0].fillStyle, CLARET, `${id}: on the rug`)
      assert.deepEqual(ops[0].args, [0, 0, 72, 72], `${id}: all over`)
      const fur = ops.filter(op => op.name === 'fill' && op.fillStyle === INK)
      assert.equal(fur.length, 1, `${id}: the fur is one shape`)
      assert.ok(fur[0].shadowColor && fur[0].shadowBlur > 0, `${id}: in a glow`)
      const white = ops.filter(op => op.name === 'fill' && op.fillStyle === '#fff')
      assert.equal(white.length, id.startsWith('tail-tip:') ? 1 : 0, `${id}: white at the tip only`)
      if (white.length) assert.ok(ops.indexOf(white[0]) > ops.indexOf(fur[0]) && !white[0].shadowColor, `${id}: the white over the fur`)
    }
    // a wall: rows of stone bricks, each lit from above, in darker mortar; no
    // picture, no words. Lighter than the rug, so it stands out from the floor,
    // but at most half as light as Boo's gold at its brightest, so she is still
    // the brightest key on the board: in dim light the eye finds that first
    const [boo] = painted(faceCanvas('tail-boo', size++))
    assert.ok(boo.fillStyle.colours.includes('#fff6c4'), 'Boo is on gold')
    const wall = painted(faceCanvas('wall', size++))
    const bricks = wall.filter(op => op.name === 'fillRect').slice(1)
    assert.ok(bricks.length >= 6, 'bricks')
    const stone = bricks.map(op => op.fillStyle?.colours ?? [])
    assert.ok(stone.every(([top, foot]) => lightOf(top) > lightOf(foot)), 'lit from above')
    assert.ok(typeof wall[0].fillStyle === 'string' && wall[0].fillStyle !== CLARET, 'in mortar, not on the rug')
    assert.ok(stone.every(([, foot]) => lightOf(foot) > 2 * lightOf(wall[0].fillStyle)), 'the mortar darker than the bricks')
    assert.ok(stone.every(([, foot]) => lightOf(foot) >= 2 * lightOf(CLARET)), 'lighter than the rug')
    assert.ok(stone.every(([top]) => lightOf(top) <= lightOf('#fff6c4') / 2), 'at most half as light as Boo\'s gold')
    assert.ok(!wall.some(op => op.name === 'drawImage' || op.name === 'fillText'), 'a wall is only bricks')
    // her friends sit in the spotlight's dark, never on gold: Boo is the only gold key
    for (const pet of FRIENDS) {
      const [ground] = painted(faceCanvas(`pet:${pet}`, size++))
      assert.ok(!ground.fillStyle.colours.includes('#fff6c4'), `pet:${pet} is not gold`)
    }
  })
})

test('G54 a face of one flat colour is that colour on the Mac\'s screen too: the deck paints it from faceSolid, the screen draws it (faceCanvas), so Boo\'s rug is the same claret on both', async () => {
  const solid = [...new Set([...FACE_IDS, ...ART_FACES])].filter(id => faceSolid(id))
  for (const id of ['off', 'blank', 'rug']) assert.ok(solid.includes(id), id)
  await withBrowser({ OffscreenCanvas: FakeCanvas }, () => {
    let size = FACE_SIZE + 100
    for (const id of solid) {
      const drawn = painted(faceCanvas(id, size++)).filter(op => ['fill', 'fillRect', 'stroke', 'drawImage', 'fillText'].includes(op.name))
      assert.equal(drawn.length, 1, `${id}: one colour`)
      assert.deepEqual(drawn[0].args, [0, 0, 72, 72], `${id}: all over`)
      assert.deepEqual(rgbOf(drawn[0].fillStyle), [...faceSolid(id)], `${id}: the deck's colour`)
    }
  })
})

test('G54 each key of her tail lies the way the engine names it (lib/arcade.js tail.faces): the end\'s fur comes in from the side its middle key is on and stops in the middle; the middle\'s runs between its two sides, straight or round the corner; the tip\'s comes in from its middle key\'s side, its white puff out the other way; a band a third of the key across wherever it meets the next key', async () => {
  await withBrowser({ OffscreenCanvas: FakeCanvas }, () => {
    let size = FACE_SIZE + 120
    for (const way of WAYS) {
      const end = tailDrawn(faceCanvas(`tail-end:${way}`, size++))
      assert.deepEqual(sidesOf(end.fur), [way], `tail-end:${way}: in from the ${way} only`)
      assert.ok(covers(end.fur, 36, 36), `tail-end:${way}: to the middle of its key`)
      assert.equal(end.puff.length, 0, `tail-end:${way}: no puff`)
      const tip = tailDrawn(faceCanvas(`tail-tip:${way}`, size++))
      assert.deepEqual(sidesOf(tip.fur), [BACK[way]], `tail-tip:${way}: in from the ${BACK[way]} only`)
      assert.equal(puffWay(tip.puff), way, `tail-tip:${way}: its white puff out to the ${way}`)
      for (const [id, fur] of [[`tail-end:${way}`, end.fur], [`tail-tip:${way}`, tip.fur]]) {
        for (const side of sidesOf(fur)) assert.ok(meets(fur, side), `${id}: a thick band where it meets the next key`)
      }
    }
    for (const pair of FUR) {
      const { fur, puff } = tailDrawn(faceCanvas(`tail-fur:${pair}`, size++))
      assert.deepEqual(sidesOf(fur), Object.keys(EDGES).filter(side => pair.split('-').includes(side)), `tail-fur:${pair}: out through its two sides only`)
      for (const side of sidesOf(fur)) assert.ok(meets(fur, side), `tail-fur:${pair}: a thick band where it meets the next key`)
      assert.equal(puff.length, 0, `tail-fur:${pair}: no puff`)
    }
  })
})

test('G54 her tail joins up wherever the engine lays it: on every board of a dozen games, each of its keys\' fur runs out through the sides the rest of the tail is on, and the tip\'s white puff points away from it', async () => {
  // the way from a key to the one beside it (null for one that is not beside it)
  const way = (a, b) => {
    const dr = rowOf(b) - rowOf(a), dc = colOf(b) - colOf(a)
    return Math.abs(dr) + Math.abs(dc) !== 1 ? null : dc ? (dc > 0 ? 'right' : 'left') : dr > 0 ? 'down' : 'up'
  }
  await withBrowser({ OffscreenCanvas: FakeCanvas }, () => {
    const drawn = new Map() // each piece of the tail, drawn once
    const piece = id => { if (!drawn.has(id)) drawn.set(id, tailDrawn(faceCanvas(id, FACE_SIZE + 140 + drawn.size))); return drawn.get(id) }
    const places = new Set()
    for (let seed = 1; seed <= 12; seed++) {
      let g = newGame('tail', { seed, lengthMs: 60000, now: 0 })
      for (let t = 0; t <= 60000; t += 100) {
        g = stepGame(g, t)
        const f = gameFaces(g, t)
        const [end, mid, tip] = ['end', 'fur', 'tip'].map(part => f.findIndex(x => x.startsWith(`tail-${part}:`)))
        if ([end, mid, tip].includes(-1)) continue // a tick on a key of it
        places.add(`${end} ${mid} ${tip}`)
        const toEnd = way(mid, end), toTip = way(mid, tip)
        assert.ok(way(end, mid) && toEnd && toTip, `seed ${seed}: its keys side by side`)
        assert.deepEqual(sidesOf(piece(f[end]).fur), [way(end, mid)], `${f[end]} towards ${f[mid]}`)
        assert.deepEqual(sidesOf(piece(f[mid]).fur), Object.keys(EDGES).filter(side => side === toEnd || side === toTip), f[mid])
        assert.deepEqual(sidesOf(piece(f[tip]).fur), [way(tip, mid)], `${f[tip]} towards ${f[mid]}`)
        assert.equal(puffWay(piece(f[tip]).puff), toTip, `${f[tip]}: its white puff away from the rest of the tail`)
      }
    }
    assert.ok(places.size >= 100, `${places.size} places on the board`)
  })
})

test('G54 the top row\'s paws (Jon, 29 Oct 2026: in place of the stars): drawn, no words, a lit paw glows and an unlit one does not', async () => {
  assert.ok(!ART_FACES.includes('star'), 'no stars now')
  await withBrowser({ OffscreenCanvas: FakeCanvas }, () => {
    const drawn = id => { written.length = 0; fills.length = 0; faceCanvas(id, FACE_SIZE + 2); return { words: [...written], fills: [...fills] } }
    const off = drawn('paw'), on = drawn('paw-lit')
    for (const [name, paw] of [['paw', off], ['paw-lit', on]]) {
      assert.deepEqual(paw.words, [], `${name}: a drawing, no words or emoji`)
      assert.equal(paw.fills.length, 1, `${name}: the paw is one shape`)
    }
    const [unlitFill, unlitGlow] = off.fills[0], [, litGlow, litBlur] = on.fills[0]
    assert.equal(typeof unlitFill, 'string', 'an unlit paw is one flat colour')
    assert.ok(!unlitGlow, 'an unlit paw has no glow')
    assert.ok(litGlow && litBlur > 0, 'a lit paw glows')
  })
})

test('G54 a strike\'s words name a friend in full, and the longest, "Strike 2! That\'s Zimothy Clawford, Esq.", fits whole on the strip in play, clear of the strike boxes and the time lights', async () => {
  const LONGEST = "Strike 2! That's Zimothy Clawford, Esq."
  // a ruler a little wider than the widest of the strip's serifs (Georgia, at
  // 600: about half the type's size a letter)
  const px = font => Number(/([\d.]+)px/.exec(font)?.[1])
  ruler = (s, font) => Array.from(s).length * 0.53 * px(font)
  try {
    await withBrowser({ OffscreenCanvas: FakeCanvas }, async () => {
      const art = await import('../src/lib/arcadeArt.js?strike-words') // its own strips, measured with this ruler
      const NONE = ['', '', '', '', '', ''], POINTER = ['◀ ▶', '', '', '', '', '▼ ▲']
      // Whack-a-Mouse's strip has no dial labels; the same words with them, too
      for (const dials of [NONE, POINTER]) {
        const strip = art.stripCanvas({ left: '', centre: LONGEST, right: '', score: null, marks: { of: 3, used: 2 }, lights: { of: 8, lit: 5 }, zones: false, dials })
        const said = strip.log.find(op => op.name === 'fillText' && String(op.args[0]).startsWith('Strike'))
        assert.equal(said.args[0], LONGEST, 'the whole line, never cut short')
        assert.equal(said.textAlign, 'center')
        assert.ok(px(said.font) >= 26, `big enough to read (${px(said.font).toFixed(1)} pixels)`)
        const half = ruler(LONGEST, said.font) / 2, x = said.args[1]
        const boxes = strip.log.filter(op => op.name === 'roundRect'), lights = strip.log.filter(op => op.name === 'arc')
        assert.equal(boxes.length, 3, 'the three strike boxes')
        assert.equal(lights.length, 8, 'the eight time lights')
        const boxesEnd = Math.max(...boxes.map(op => op.args[0] + op.args[2]))
        const lightsStart = Math.min(...lights.map(op => op.args[0] - op.args[2]))
        assert.ok(x - half - boxesEnd >= 24, `clear of the strike boxes (${(x - half - boxesEnd).toFixed(1)} pixels)`)
        assert.ok(lightsStart - (x + half) >= 24, `clear of the time lights and their glow (${(lightsStart - x - half).toFixed(1)} pixels)`)
      }
    })
  } finally {
    ruler = SMALL
  }
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

test('G54 a bite plays before the lose tune, and the last point or the last knock before the win tune, never on top of it', () => {
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
const BOO_KEYS = ['boo', 'tail-boo', 'chaser', 'caught', 'boo-nap', 'boo-alert']
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

test('G54 Boo herself, the player\'s piece on her tail\'s board (Jon, 29 Oct 2026): her face picture big and bright on gold, glowing, in a gold frame', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] })
  await withBrowser({ OffscreenCanvas: FakeCanvas, Image: FakeImage }, async () => {
    const art = await import('../src/lib/arcadeArt.js?tail-boo')
    const asked = art.loadArt()
    pictureOf('Boo Face.png').arrive()
    await settled()
    t.mock.timers.runAll()
    assert.equal(await asked, true)
    for (const size of [FACE_SIZE, FACE_SIZE * 2]) {
      const ops = painted(art.faceCanvas('tail-boo', size))
      assert.equal(ops[0].name, 'fillRect')
      assert.deepEqual(ops[0].args, [0, 0, 72, 72], 'gold all over')
      assert.equal(ops[0].fillStyle.colours[0], '#fff6c4', 'brightest in the middle')
      // her face: at least 58 of the key's 72 units from the tips of her ears to her chin (the sticker is 97.5% of its picture)
      const face = ops.find(op => op.name === 'drawImage')
      assert.ok(face.args[4] * 0.975 >= 58, 'big')
      assert.ok(face.shadowColor && face.shadowBlur > 0, 'glowing')
      // and round her, a frame: a gold rim, the outermost line
      const rims = ops.filter(op => op.name === 'stroke')
      assert.ok(rims.length && rims.at(-1).strokeStyle?.colours?.includes('#fff6c4'), 'a gold rim')
      assert.ok(ops.indexOf(rims.at(-1)) > ops.indexOf(face), 'over the edge of the picture')
    }
  })
})

// A friend on a face: its picture, or its stand-in (Boo's cat's head, a picture emoji for the rest).
const petOn = canvas => (canvas.calls.includes('drawImage') ? 'picture' : canvas.calls.some(c => c === 'ellipse' || c === 'fillText') ? 'stand-in' : 'neither')

test('G54 Boo\'s friends, in Whack-a-Mouse and in her tail\'s way: each is the house\'s own face picture, up and tapped, once it is in; one that comes after loadArt\'s wait keeps its stand-in', async t => {
  // the five of the household, Boo too, each with its picture in household/faces/
  assert.deepEqual(Object.keys(PET_FILES).sort(), [...PETS].sort())
  for (const file of Object.values(PET_FILES)) assert.ok(existsSync(new URL(`../public/household/faces/${file}`, import.meta.url)), file)

  t.mock.timers.enable({ apis: ['setTimeout'] })
  await withBrowser({ OffscreenCanvas: FakeCanvas, Image: FakeImage }, async () => {
    // in time: every friend, up and tapped, is its picture
    const inTime = await import('../src/lib/arcadeArt.js?pets-in-time')
    const asked = inTime.loadArt()
    for (const file of Object.values(PET_FILES)) pictureOf(file).arrive()
    await settled()
    t.mock.timers.runAll()
    assert.equal(await asked, true)
    for (const pet of PETS) for (const kind of ['pet', 'oops']) assert.equal(petOn(inTime.faceCanvas(`${kind}:${pet}`, FACE_SIZE)), 'picture', `${kind}:${pet}`)

    // each friend's picture too late, in turn: it keeps its stand-in all session (a whole dog for
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
  // each time the art settles the screen draws its keys again, so a hot reload's
  // new art module (no pictures at first) never leaves the drawn cat on Boo's key
  assert.match(page, /loadArt\(\)\.then\(\(\) => \{[^}]*setArtReady\(n => n \+ 1\)/, 'a count, so every settle redraws')
})

test('G54 Boo\'s coin (Jon, 29 Oct 2026): a token left is his picture of her gold coin once it is in, the drawn coin before and after a late one; a spent token an empty ring; the screen\'s tokens are the same coin', async t => {
  assert.ok(existsSync(new URL(`../public/household/faces/${COIN_FILE}`, import.meta.url)), COIN_FILE)
  const coinOn = canvas => (canvas.calls.includes('drawImage') ? 'picture' : canvas.calls.includes('arc') ? 'drawn' : 'neither')
  t.mock.timers.enable({ apis: ['setTimeout'] })
  await withBrowser({ OffscreenCanvas: FakeCanvas, Image: FakeImage }, async () => {
    // in time: the coin is the picture, asked for after Boo's face, never before it
    const inTime = await import('../src/lib/arcadeArt.js?coin-in-time')
    const asked = inTime.loadArt()
    assert.equal(pictureOf(COIN_FILE).fetchPriority, 'low')
    for (const file of [...Object.values(PET_FILES), COIN_FILE]) pictureOf(file).arrive()
    await settled()
    t.mock.timers.runAll()
    assert.equal(await asked, true)
    assert.equal(coinOn(inTime.faceCanvas('coin', FACE_SIZE)), 'picture')
    assert.equal(coinOn(inTime.faceCanvas('coin-spent', FACE_SIZE)), 'drawn', 'a spent token: the empty ring, no picture')
    assert.ok(!inTime.faceCanvas('coin-spent', FACE_SIZE).calls.includes('drawImage'))
    // bigger (Jon, 29 Oct 2026: "They need to be bigger"): the coin itself,
    // fitted by COIN_BOX, 62 to 68 of the key's 72 units across (52 before),
    // and all of it on the key
    const [left, top, right, bottom] = COIN_BOX
    const [, x, y, d] = painted(inTime.faceCanvas('coin', FACE_SIZE)).find(op => op.name === 'drawImage').args
    const across = d * Math.max(right - left, bottom - top)
    assert.ok(across >= 62 && across <= 68, `the coin is ${across.toFixed(1)} units across`)
    assert.ok(x + d * left >= 0 && y + d * top >= 0 && x + d * right <= 72 && y + d * bottom <= 72, 'all of it on the key')
    // a spent token: the empty ring, as big as the coin was
    const spent = painted(inTime.faceCanvas('coin-spent', FACE_SIZE))
    const [ringX, ringY, ringR] = spent.find(op => op.name === 'arc').args
    const ringW = spent.find(op => op.name === 'stroke').lineWidth
    assert.deepEqual([ringX, ringY], [36, 36], 'in the middle')
    assert.ok(Math.abs(ringR + ringW / 2 - across / 2) <= 1.5, 'its outside where the coin\'s edge was')

    // too late: the drawn coin, all session
    const late = await import('../src/lib/arcadeArt.js?coin-late')
    const waited = late.loadArt()
    for (const file of Object.values(PET_FILES)) pictureOf(file).arrive()
    await settled()
    t.mock.timers.runAll()
    assert.equal(await waited, true)
    pictureOf(COIN_FILE).arrive()
    await settled()
    assert.equal(coinOn(late.faceCanvas('coin', FACE_SIZE * 2)), 'drawn')
    // the drawn coin is as big as the picture's, within a hair
    const [, , drawnR] = painted(late.faceCanvas('coin', FACE_SIZE * 2)).find(op => op.name === 'arc').args
    assert.ok(drawnR >= 29 && drawnR <= 34, `the drawn coin is ${2 * drawnR} units across`)
  })
  // the screen's list of players: a token left is the same picture, a spent one the empty ring
  const page = readFileSync(new URL('../src/screens/Arcade.jsx', import.meta.url), 'utf8')
  assert.match(page, /<img key=\{k\} className="arcade-token coin" src=\{coinUrl\(\)\}/)
  assert.match(page, /<span key=\{k\} className="arcade-token spent" \/>/)
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

test('G54 each friend is fitted by where it really sits in its face picture: a new picture fails here until its box is measured again (household/README.md)', () => {
  for (const pet of PETS) {
    const box = stickerBox(new URL(`../public/household/faces/${PET_FILES[pet]}`, import.meta.url))
    PET_BOXES[pet].forEach((v, i) => assert.ok(Math.abs(v - box[i]) <= 0.002, `${pet}'s ${['left', 'top', 'right', 'bottom'][i]}: the picture says ${box[i].toFixed(3)}, PET_BOXES ${v}`))
  }
})

test('G54 Boo\'s coin is fitted by where the coin really sits in its picture: a new picture fails here until COIN_BOX is measured again', () => {
  const box = stickerBox(new URL(`../public/household/faces/${COIN_FILE}`, import.meta.url))
  COIN_BOX.forEach((v, i) => assert.ok(Math.abs(v - box[i]) <= 0.002, `the coin's ${['left', 'top', 'right', 'bottom'][i]}: the picture says ${box[i].toFixed(3)}, COIN_BOX ${v}`))
})
