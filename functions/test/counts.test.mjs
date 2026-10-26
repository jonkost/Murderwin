import { test } from 'node:test'
import assert from 'node:assert/strict'
import { FakeFirestore } from './fake-firestore.mjs'
import { sealedCounts, packingCount, leanCount, pictureCount, PICTURES_OF } from '../lib/counts.js'
import { PRACTICE } from '../lib/relay-bank.js'

// The Home rows (card 343). SEAL: every sealed string here is synthetic,
// bracketed and thrown away with the process. The result and the log must
// carry numbers and one yes or no, never any of these strings.

const SYNTH = ['(Synthetic item a)', '(Synthetic item b)', '(Synthetic sketch)', '(Synthetic decoy 1)', '(Synthetic decoy 2)', '(Synthetic decoy 3)']
const cats = ['granolia', 'boo', 'zimothy', 'salem']

// A good picture for a round: the practice smiley's shape, renamed, and its squares filled to the round's least.
function picture(round, name = SYNTH[2]) {
  const size = { 1: 3, 2: 4, 3: 5 }[round]
  const cells = {}
  for (let i = 0; i < size; i++) cells[`${'ABCDE'[i]}${i + 1}`] = [{ kind: 'dot', at: [0.5, 0.5], r: 0.2 }]
  return { id: `p${round}-${Math.random()}`, round, name, decoys: SYNTH.slice(3), cells }
}

function world({ packed = true, leans = true, pictures = 0 } = {}) {
  const db = new FakeFirestore()
  db.store.set('safe_content/scenarios', { items: [
    { id: 's1', text: 'one', beats: [0, 1, 2].map(q => ({ q: `q${q}`, a: 'x', b: 'y' })) },
    { id: 's2', text: 'two', beats: [0, 1, 2].map(q => ({ q: `q${q}`, a: 'x', b: 'y' })) },
    { id: 'gone', text: 'old', deleted: true, beats: [0, 1, 2].map(q => ({ q: `q${q}`, a: 'x', b: 'y' })) },
  ] })
  if (packed) db.store.set('sealed/bags', { bags: { 1: ['a', 'b', 'c', 'd'], 2: ['e', 'f', 'g', 'h'] }, words: { a: SYNTH[0] }, properties: { [SYNTH[1]]: [1, 2] } })
  if (leans) db.store.set('sealed/parlour_leans', { sets: {
    s1: { 0: Object.fromEntries(cats.map(c => [c, 'a'])), 1: Object.fromEntries(cats.map(c => [c, 'b'])), 2: { granolia: 'a' } },
    s2: { 0: Object.fromEntries(cats.map(c => [c, 'a'])) },
  } })
  if (pictures) {
    const list = []
    for (let i = 0; i < pictures; i++) list.push(picture(1 + (i % 3)))
    db.store.set('sealed/relay_pictures', { pictures: list })
  }
  return db
}

test('the Home rows: the packing made, three of six questions with every lean, the good pictures of nine', async () => {
  const lines = []
  const r = await sealedCounts(world({ pictures: 5 }), { log: (...a) => lines.push(a.join(' ')) })
  assert.deepEqual(r, { ok: true, packing: { made: true, bags: 2 }, leans: { questions: 3, of: 6 }, pictures: { made: 5, of: 9 } })
  assert.deepEqual(lines, ['sealedCounts'], 'the log carries the op only')
  const text = JSON.stringify(r)
  for (const s of SYNTH) assert.ok(!text.includes(s), `the result carried a synthetic string of length ${s.length}`)
  assert.ok(Object.values(r).every(v => typeof v === 'boolean' || Object.values(v).every(x => typeof x === 'number' || typeof x === 'boolean')), 'numbers and yes or no only')
})

test('nothing made yet reads as nothing, never an error', async () => {
  const r = await sealedCounts(world({ packed: false, leans: false }), { log: () => {} })
  assert.deepEqual(r, { ok: true, packing: { made: false, bags: 0 }, leans: { questions: 0, of: 6 }, pictures: { made: 0, of: 9 } })
})

test('at most three good pictures a round count, and a bad one never does', () => {
  assert.equal(PICTURES_OF, 9)
  const many = Array.from({ length: 12 }, (_, i) => picture(1 + (i % 3)))
  assert.deepEqual(pictureCount({ pictures: many }), { made: 9, of: 9 })
  const bad = [{ ...picture(1), name: PRACTICE.name }, { ...picture(2), decoys: [] }, picture(3)]
  assert.deepEqual(pictureCount({ pictures: bad }), { made: 1, of: 9 }, 'a style sample and a picture with no wrong names are not good ones')
  assert.deepEqual(pictureCount(null), { made: 0, of: 9 })
})

test('a lean counts only as a or b, and a question only with all four cats', () => {
  const table = { s1: { 0: { granolia: 'a', boo: 'b', zimothy: 'a', salem: 'c' } } }
  assert.deepEqual(leanCount(table, [{ id: 's1' }]), { questions: 0, of: 3 })
  assert.deepEqual(packingCount({ bags: { 1: [] } }), { made: false, bags: 0 })
})
