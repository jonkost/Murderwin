// The walls' layouts as the real controllers reported them on 24 Oct 2026
// (test/fixtures), gathered into the panels the game plays with.

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { groupLayout, hexagonsFromCorners, Nanoleaf } from '../lib/nanoleaf.js'

const fixture = (name) => JSON.parse(readFileSync(new URL(`./fixtures/${name}-layout.json`, import.meta.url), 'utf8'))
const ELEMENTS = fixture('elements')
const LINES = fixture('lines')

function wallFor(layout) {
  const calls = []
  const fetchImpl = async (url, opts = {}) => {
    calls.push({ url, opts })
    if (url.endsWith('/panelLayout/layout')) return { ok: true, status: 200, text: async () => JSON.stringify(layout) }
    return { ok: true, status: 204, text: async () => '' }
  }
  const logs = []
  const wall = new Nanoleaf({ host: '10.0.0.5', token: 'tok', fetchImpl, log: (l) => logs.push(l) })
  return { wall, calls, logs }
}
// animData "n id 1 r g b w t ..." → { id: [r, g, b] }
function written(call) {
  const parts = JSON.parse(call.opts.body).write.animData.split(' ').map(Number)
  const out = {}
  for (let i = 1; i < parts.length; i += 7) out[parts[i]] = parts.slice(i + 2, i + 5)
  return out
}

test('the real Elements wall: sixty corners gather into ten hexagons of six', () => {
  const { panels, pieces } = groupLayout(ELEMENTS)
  assert.equal(panels.length, 10)
  assert.ok(panels.every(p => p.pieces.length === 6))
  const corners = ELEMENTS.positionData.filter(p => p.shapeType === 15).map(p => p.panelId).sort((a, b) => a - b)
  assert.deepEqual([...panels.flatMap(p => p.pieces)].sort((a, b) => a - b), corners, 'every corner in exactly one hexagon')
  assert.equal(pieces.length, 60, 'the controller is not a piece')
  // each hexagon's corners all sit within one corner-distance of its middle
  for (const p of panels) {
    for (const id of p.pieces) {
      const c = ELEMENTS.positionData.find(q => q.panelId === id)
      assert.ok(Math.hypot(c.x - p.x, c.y - p.y) < ELEMENTS.sideLength, `corner ${id} is near its hexagon's middle`)
    }
  }
})

test('the Elements gather the same way with y running the other way up', () => {
  const corners = ELEMENTS.positionData.filter(p => p.shapeType === 15).map(p => ({ id: p.panelId, x: p.x, y: -p.y, o: p.o }))
  const groups = hexagonsFromCorners(corners, ELEMENTS.sideLength)
  assert.equal(groups.length, 10)
  assert.ok(groups.every(g => g.length === 6))
})

test('the real Lines wall: twenty-four halves pair into twelve bars, the joints in no panel', () => {
  const { panels, pieces } = groupLayout(LINES)
  assert.equal(panels.length, 12)
  assert.ok(panels.every(p => p.pieces.length === 2))
  const halves = LINES.positionData.filter(p => p.shapeType === 18)
  for (const p of panels) {
    const [a, b] = p.pieces.map(id => halves.find(h => h.panelId === id))
    assert.equal(a.o % 180, b.o % 180, 'both halves of a bar point the same way')
  }
  // two bars end to end in a straight line (x 377): each keeps its own halves
  const bar = (id) => panels.find(p => p.pieces.includes(id)).pieces
  assert.deepEqual(bar(3787), [3787, 40458])
  assert.deepEqual(bar(26662), [26662, 63719])
  const joints = LINES.positionData.filter(p => [16, 19, 20].includes(p.shapeType)).map(p => p.panelId)
  assert.ok(joints.every(id => !panels.some(p => p.pieces.includes(id))), 'connectors and caps are not panels')
  assert.equal(pieces.length, 38, 'the frame still writes every piece, joints dark')
})

test('a frame lights a whole hexagon, and a tap on any corner names its hexagon', async () => {
  const { wall, calls, logs } = wallFor(ELEMENTS)
  const panels = await wall.loadLayout()
  const hex = panels[3]
  await wall.frame({ [hex.id]: [255, 255, 255] })
  const out = written(calls.at(-1))
  assert.equal(Object.keys(out).length, 60, 'every corner is written')
  for (const [id, rgb] of Object.entries(out)) {
    assert.deepEqual(rgb, hex.pieces.includes(Number(id)) ? [255, 255, 255] : [0, 0, 0])
  }
  for (const corner of hex.pieces) assert.equal(wall.unitOf(corner), hex.id)

  // the touch stream: a tap on a corner, then a tap on a piece no panel holds
  const events = [{ gesture: 0, panelId: hex.pieces.at(-1) }, { gesture: 0, panelId: 999 }, { gesture: 0, panelId: 999 }]
  const body = new ReadableStream({ start(c) { c.enqueue(new TextEncoder().encode(`id: 4\ndata: ${JSON.stringify({ events })}\n\n`)) } })
  wall.fetch = async () => ({ ok: true, status: 200, body })
  const touched = []
  const stop = wall.listenTouch((id, gesture) => touched.push([id, gesture]))
  await new Promise(r => setTimeout(r, 20))
  stop()
  assert.deepEqual(touched, [[hex.id, 0], [999, 0], [999, 0]])
  assert.equal(logs.filter(l => l.includes('piece 999')).length, 1, 'a stray piece is said once')
})

test('a frame lights a whole bar and leaves the joints dark', async () => {
  const { wall, calls } = wallFor(LINES)
  const panels = await wall.loadLayout()
  const lit = Object.fromEntries(panels.map(p => [p.id, [255, 0, 0]]))
  await wall.frame(lit)
  const out = written(calls.at(-1))
  const halves = new Set(LINES.positionData.filter(p => p.shapeType === 18).map(p => p.panelId))
  for (const [id, rgb] of Object.entries(out)) assert.deepEqual(rgb, halves.has(Number(id)) ? [255, 0, 0] : [0, 0, 0])
})

test('a taught tap id names its hexagon; untaught ones pass through', async () => {
  const { wall } = wallFor(ELEMENTS)
  const panels = await wallFor(ELEMENTS).wall.loadLayout()
  const taught = new Nanoleaf({ host: '10.0.0.5', token: 'tok', fetchImpl: wall.fetch, touchMap: { 58415: panels[2].id, 12345: 777 } })
  await taught.loadLayout()
  assert.equal(taught.unitOf(58415), panels[2].id)
  assert.equal(taught.unitOf(4242), 4242)
  assert.equal(taught.taughtPanels, 1, 'a map entry for a panel the layout lacks does not count')
})

test('a fast touch counts at once, once, and the stream\'s late copy is dropped', async () => {
  const { TapMerger, readTouchPacket } = await import('../lib/nanoleaf.js')
  let t = 0
  const m = new TapMerger(() => t)
  // what the real wall sent on 28 Oct: a hover nearby, then down, holds and up
  assert.equal(m.fast(7, 0), false, 'a hover is no tap')
  assert.equal(m.fast(9, 1), true, 'down counts at once')
  for (t = 140; t <= 700; t += 140) assert.equal(m.fast(9, 2), false, 'a held finger counts once')
  t = 1120; assert.equal(m.fast(9, 3), false, 'its up, 0.4 s after the last hold, is no second tap')
  t = 1130; assert.equal(m.slow(9, 0), false, 'the stream\'s copy, about 1.1 s late, is dropped')
  t = 5000; assert.equal(m.slow(9, 0), true, 'a tap the fast road missed still counts')
  assert.equal(m.slow(9, 2), true, 'swipes pass')
  t = 6000; assert.equal(m.fast(9, 3), true, 'an up with no down before it counts')
  t = 6030; assert.equal(m.fast(9, 3), false, 'and its echo does not')
  t = 7000; assert.equal(m.fast(9, 1), true, 'a new touch counts')
  t = 9000; assert.equal(m.fast(9, 1), true, 'a finger lost without an up does not block the next touch')
  const pkt = Buffer.from([0, 2, 0x4d, 0x98, 0x31, 0xff, 0xff, 0x6e, 0x9c, 0x00, 0xff, 0xff])
  assert.deepEqual(readTouchPacket(pkt), [{ id: 19864, type: 3 }, { id: 28316, type: 0 }])
  assert.deepEqual(readTouchPacket(Buffer.from([0, 3, 1])), [])
})

test('a Lines count lights one half of each bar, and lit halves never touch', async () => {
  const { chainHalves } = await import('../lib/nanoleaf.js')
  const { panels } = groupLayout(LINES)
  const pos = new Map(LINES.positionData.map(p => [p.panelId, p]))
  const chain = chainHalves(panels, pos)
  assert.equal(chain.length, 12)
  assert.equal(new Set(chain.map(c => c.id)).size, 12, 'every bar once')
  for (const c of chain) assert.ok(panels.find(p => p.id === c.id).pieces.includes(c.half), 'the half is that bar\'s')
  const d = (a, b) => Math.hypot(pos.get(a).x - pos.get(b).x, pos.get(a).y - pos.get(b).y)
  const inBar = Math.max(...panels.map(p => d(p.pieces[0], p.pieces[1])))
  for (const a of chain) for (const b of chain) if (a !== b) assert.ok(d(a.half, b.half) > inBar * 1.2, 'a dark half between any two lit ones')
  // along the chain, each next bar is the nearest one left
  for (let i = 1; i < chain.length; i++) {
    const c = pos.get(chain[i].half), p = pos.get(chain[i - 1].half)
    assert.ok(Math.hypot(c.x - p.x, c.y - p.y) < 2 * LINES.sideLength, 'neighbours along the zigzag')
  }
})
