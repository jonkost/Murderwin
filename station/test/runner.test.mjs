import { test } from 'node:test'
import assert from 'node:assert/strict'
import { keyImage } from '../lib/streamdeck.js'
import { countSegments, Nanoleaf } from '../lib/nanoleaf.js'
import { FakeWall, FakeDeck } from '../lib/fakes.js'

test('key images: the right size, a solid blank, text on the lit keys', () => {
  const size = 72
  const blank = keyImage('blank', size)
  assert.equal(blank.length, size * size * 3)
  assert.ok(blank.every(v => v === 0), 'blank stays black')
  const red = keyImage('red', size)
  const fillCount = [...Array(size * size)].filter((_, i) => red[i * 3] === 191 && red[i * 3 + 1] === 25).length
  assert.ok(fillCount > size * size * 0.6, 'mostly the key colour')
  assert.ok(fillCount < size * size, 'some pixels are the label')
  const dark = keyImage('submit', size, { lit: false })
  assert.ok(dark.every(v => v === 0), 'an unlit key is dark')
  for (const n of ['1', '2', '3', '4', '5', '6', 'undo', 'submit', 'yellow', 'green', 'blue', 'pink', 'white']) {
    assert.equal(keyImage(n, size).length, size * size * 3)
  }
})

test('countSegments: gaps between the lit bars when there is room, else side by side', () => {
  const eleven = Array.from({ length: 11 }, (_, i) => 100 + i)
  assert.deepEqual(countSegments(eleven, 6), [100, 102, 104, 106, 108, 110])
  assert.deepEqual(countSegments(eleven, 3), [100, 102, 104])
  const nine = eleven.slice(0, 9)
  assert.deepEqual(countSegments(nine, 6), [100, 101, 102, 103, 104, 105])
  assert.deepEqual(countSegments(nine, 5), [100, 102, 104, 106, 108])
})

test('Nanoleaf: layout leaves the controller out and sorts top-left first; frames name every panel', async () => {
  const calls = []
  const fetchImpl = async (url, opts = {}) => {
    calls.push({ url, opts })
    if (url.endsWith('/panelLayout/layout')) {
      return { ok: true, status: 200, text: async () => JSON.stringify({ positionData: [
        { panelId: 3, x: 200, y: 0, shapeType: 14 }, { panelId: 1, x: 0, y: 100, shapeType: 14 },
        { panelId: 9, x: 100, y: 100, shapeType: 12 }, { panelId: 2, x: 100, y: 0, shapeType: 14 },
      ] }) }
    }
    return { ok: true, status: 204, text: async () => '' }
  }
  const wall = new Nanoleaf({ host: '10.0.0.5', token: 'tok', fetchImpl })
  const panels = await wall.loadLayout()
  assert.deepEqual(panels.map(p => p.id), [1, 2, 3])
  await wall.frame({ 2: [255, 255, 255] })
  const body = JSON.parse(calls.at(-1).opts.body)
  assert.equal(body.write.command, 'display')
  assert.equal(body.write.animData, '3 1 1 0 0 0 0 1 2 1 255 255 255 0 1 3 1 0 0 0 0 1')
  assert.ok(calls.at(-1).url.endsWith('/api/v1/tok/effects'))
})

test('fakes: the wall reports what it lit and the deck relays presses', async () => {
  const lines = []
  const wall = new FakeWall({ name: 'w', panelIds: [5, 6, 7], log: (l) => lines.push(l) })
  await wall.frame({ 6: [255, 255, 255] })
  assert.equal(lines.at(-1), '[w] lit 2')
  let touched = null
  wall.listenTouch((id) => { touched = id })
  wall.touch(3)
  assert.equal(touched, 7)
  const deck = new FakeDeck({ log: () => {} })
  const presses = []
  deck.onKey((n) => presses.push(n))
  deck.press('submit')
  assert.deepEqual(presses, ['submit'])
})
