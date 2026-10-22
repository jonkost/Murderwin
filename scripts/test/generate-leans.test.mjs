import { test } from 'node:test'
import assert from 'node:assert/strict'
import { memoryDb } from '../lib.mjs'
import { runLeans, blanksOf, userPrompt, LEANS_DOC, LISTENERS } from '../generate-leans.mjs'

// SEAL. The bank here is bracketed throwaway text, the "model" is a function
// that answers by a fixed rule, and nothing reads or writes Firestore. Every
// line the run prints is captured and checked for content.

const beats = n => [0, 1, 2].map(i => ({ q: `(Synthetic question ${n}.${i})`, n: 2, a: '(Synthetic first)', av: 1, b: '(Synthetic second)', bv: -1 }))
function seeded(leans = null) {
  const docs = {
    'safe_content/scenarios': { items: [
      { id: 's1', order: 0, text: '(Synthetic question 1.0)', beats: beats(1) },
      { id: 's2', order: 1, text: '(Synthetic question 2.0)', beats: beats(2) },
      { id: 's3', order: 2, text: '(gone)', deleted: true, beats: beats(3) },
    ] },
  }
  if (leans) docs[LEANS_DOC] = leans
  return memoryDb(docs)
}
const fake = blanks => blanks.map((x, i) => ({ ref: x.ref, granolia: 'a', boo: 'b', zimothy: i % 2 ? 'a' : 'b', salem: 'a' }))
async function run(db, opts = {}) {
  const lines = []
  const r = await runLeans(db, { generate: fake, log: l => lines.push(String(l)), now: () => new Date(1000), ...opts })
  for (const l of lines) assert.ok(!/Synthetic|granolia|boo|zimothy|salem|"a"|"b"/i.test(l), `a printed line carried content: length ${l.length}`)
  return { r, lines }
}

test('fills every blank lean for every question in the list, a or b for each of the four cats, never Irwin; prints counts only', async () => {
  const db = seeded()
  const { r, lines } = await run(db)
  assert.equal(r.filled, 2 * 3 * 4)
  const t = db.store.get(LEANS_DOC).sets
  assert.deepEqual(Object.keys(t).sort(), ['s1', 's2'], 'a deleted set gets nothing')
  for (const id of ['s1', 's2']) for (const q of [0, 1, 2]) {
    assert.deepEqual(Object.keys(t[id][q]).sort(), [...LISTENERS].sort())
    for (const c of LISTENERS) assert.ok(['a', 'b'].includes(t[id][q][c]))
  }
  assert.equal(lines.at(-1), 'PASS')
})

test('a lean already there (Jenna\'s, or an earlier run) is never overwritten; only the blanks are asked for', async () => {
  const db = seeded({ sets: { s1: { 0: { boo: 'a', salem: 'b' } } }, editedAt: new Date(5), editedBy: 'steward' })
  let asked = null
  const { r } = await run(db, { generate: blanks => { asked = blanks; return fake(blanks) } })
  assert.equal(r.filled, 24 - 2)
  const t = db.store.get(LEANS_DOC)
  assert.equal(t.sets.s1[0].boo, 'a', 'kept, though the model would have said b')
  assert.equal(t.sets.s1[0].salem, 'b')
  assert.equal(t.editedBy, 'steward', 'the Steward\'s marks on the doc stay')
  assert.deepEqual(asked.find(x => x.setId === 's1' && x.q === 0).cats.sort(), ['granolia', 'zimothy'])
  // a second run has nothing left to do and calls nothing
  const again = await run(db, { generate: () => { throw new Error('called') } })
  assert.equal(again.r.filled, 0)
})

test('the questions go out under opaque references, shuffled; a dry run calls and writes nothing; a missing answer stays blank and fails', async () => {
  const blanks = blanksOf(seeded().store.get('safe_content/scenarios').items.filter(i => !i.deleted), {})
  assert.deepEqual(blanks.map(x => x.ref), blanks.map((_, i) => `Q${i + 1}`))
  assert.ok(!/s1|s2/.test(userPrompt(blanks)), 'no set ids in the prompt')
  const db = seeded()
  const dry = await run(db, { dry: true, generate: () => { throw new Error('called') } })
  assert.equal(dry.r.blank, 24)
  assert.equal(db.store.get(LEANS_DOC), undefined)
  const half = await run(db, { generate: b => fake(b).slice(1) })
  assert.equal(half.r.blank, 4)
  assert.match(half.lines.at(-1), /^FAIL/)
})
