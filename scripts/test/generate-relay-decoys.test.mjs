import test from 'node:test'
import assert from 'node:assert/strict'
import { parseDrawings, drawDecoys, runRelayDecoys, shapeOk } from '../generate-relay-decoys.mjs'
import { PRACTICE, gridOf, hasDecoyDrawings, goodCells } from '../../functions/lib/relay-bank.js'
import { cutPicture } from '../relay-art.mjs'

// a made-up drawing: a box with a cross, on a 3 by 3 canvas
const STROKES = [
  { kind: 'line', from: [0.5, 0.5], to: [2.5, 0.5] }, { kind: 'line', from: [2.5, 0.5], to: [2.5, 2.5] },
  { kind: 'line', from: [2.5, 2.5], to: [0.5, 2.5] }, { kind: 'line', from: [0.5, 2.5], to: [0.5, 0.5] },
  { kind: 'line', from: [0.5, 0.5], to: [2.5, 2.5] },
]
const reply = () => JSON.stringify({ drawings: [{ strokes: STROKES }, { strokes: STROKES }, { strokes: STROKES }] })
const picture = () => ({ id: 'p1', round: 1, name: PRACTICE.name, decoys: [...PRACTICE.decoys], cells: PRACTICE.cells })
const newStats = () => ({ calls: 0, failedCalls: 0, misshapen: 0, eyeAsks: 0, seen: 0, unsure: 0, notes: [] })

function fakeDb(pictures) {
  const state = { pictures }
  const ref = { get: async () => ({ exists: true, data: () => state }) }
  return {
    state,
    doc: () => ref,
    runTransaction: async fn => fn({ get: async () => ({ data: () => state }), update: (_r, patch) => Object.assign(state, patch) }),
  }
}

test('a reply is three drawings in order, a bad one null, and an error carries no reply text', () => {
  assert.equal(parseDrawings(reply()).length, 3)
  assert.equal(parseDrawings('{"drawings":[{"strokes":"no"}]}')[0], null)
  assert.throws(() => parseDrawings('SECRET WORDS'), e => !/SECRET/.test(e.message))
})

test('a drawing is checked for its shape: off the canvas is thrown away', () => {
  assert.ok(shapeOk(STROKES, cutPicture(STROKES, 3), 1))
  const off = [{ kind: 'line', from: [0.5, 0.5], to: [9, 0.5] }, ...STROKES]
  assert.equal(shapeOk(off, cutPicture(off, 3), 1), false)
})

test('three wrong names drawn: the eye judge names them, or the shape alone keeps them', async () => {
  const p = picture()
  const stats = newStats()
  const named = await drawDecoys(p, { draw: async () => reply(), ask: async (_png, _round, _i) => 'A sun', stats })
  assert.equal(named.length, 3)
  assert.ok(named.every(c => goodCells(c, 3)))
  // the judge agrees only for the first name: the other two are kept on shape, after every try
  assert.equal(stats.calls, 3)
  assert.equal(stats.seen, 1)
  assert.equal(stats.unsure, 2)
  // a wrong name that never gets a well-shaped drawing: the picture keeps its names alone
  const none = await drawDecoys(p, { draw: async () => '{"drawings":[{"strokes":[]},{"strokes":[]},{"strokes":[]}]}', ask: async () => '', stats: newStats() })
  assert.equal(none, null)
})

test('a run adds decoyCells and changes nothing else; the grid then carries a drawing with every name', async () => {
  const db = fakeDb([picture()])
  const before = JSON.stringify({ ...db.state.pictures[0] })
  const lines = []
  const r = await runRelayDecoys(db, { bank: 'practice', draw: async () => reply(), ask: async () => 'nothing', log: l => lines.push(l) })
  assert.deepEqual({ drawn: r.drawn, left: r.left, written: r.written }, { drawn: 1, left: 0, written: true })
  const after = db.state.pictures[0]
  const { decoyCells, ...rest } = after
  assert.equal(JSON.stringify(rest), before, 'the picture itself is untouched')
  assert.ok(hasDecoyDrawings(after, 3))
  const g = gridOf(after, 3, 1, 'seed')
  assert.ok(g.options.every(o => o.name && o.cells), 'a drawing with every name')
  assert.deepEqual(g.options[g.answer].cells, g.cells, 'the right name carries the picture itself')
  // without the drawings: names alone, as before
  assert.ok(gridOf(picture(), 3, 1, 'seed').options.every(o => o.name && !o.cells))
  // counts only: no name of the picture or of a wrong name in anything said
  for (const l of lines) for (const n of [PRACTICE.name, ...PRACTICE.decoys]) assert.ok(!l.includes(n), 'never a name')
  // a second run has nothing to draw; a dry run writes nothing
  const again = await runRelayDecoys(db, { bank: 'practice', draw: async () => { throw new Error('not called') }, ask: async () => '', log: () => {} })
  assert.equal(again.drawn, 0)
  const dry = fakeDb([picture()])
  await runRelayDecoys(dry, { bank: 'practice', dry: true, draw: async () => reply(), ask: async () => '', log: () => {} })
  assert.equal(dry.state.pictures[0].decoyCells, undefined)
})
