import { test } from 'node:test'
import assert from 'node:assert/strict'
import { memoryDb } from '../lib.mjs'
import { runRelayPictures, toBankPicture, systemPrompt, PER_ROUND } from '../generate-relay-pictures.mjs'
import { BANK_DOC, ROUND_SIZES, checkPicture, NEVER_WORDS } from '../../functions/lib/relay-bank.js'

// SEAL. The "model" is a function that draws bracketed throwaway pictures by
// a fixed rule, and nothing reads or writes real Firestore. Every printed
// line is captured and checked for content.

const synthetic = (round, n, { bad = false } = {}) => Array.from({ length: n }, (_, i) => ({
  name: `(Synthetic sketch ${round}.${i})`,
  decoys: ['(Synthetic other a)', '(Synthetic other b)', bad ? '(Synthetic other b)' : '(Synthetic other c)'],
  cells: Array.from({ length: ROUND_SIZES[round] }, (_, k) => ({ label: `${'ABCDE'[k]}1`, strokes: [{ kind: 'line', from: [0, 0], to: [1, 1] }] })),
}))
async function run(db, opts = {}) {
  const lines = []
  let id = 0
  const r = await runRelayPictures(db, { generate: (round, n) => synthetic(round, n), log: l => lines.push(String(l)), now: () => new Date(1000), newId: () => `p${id++}`, ...opts })
  for (const l of lines) assert.ok(!/Synthetic|line|stroke|"name"/i.test(l), `a printed line carried content: length ${l.length}`)
  return { r, lines }
}

test('tops every round up to its count of good pictures, straight into the sealed bank; prints counts only', async () => {
  const db = memoryDb({})
  const { r, lines } = await run(db)
  assert.equal(r.added, 3 * PER_ROUND)
  const bank = db.store.get(BANK_DOC).pictures
  for (const round of [1, 2, 3]) assert.equal(bank.filter(p => p.round === round && !checkPicture(p, round).length).length, PER_ROUND)
  assert.equal(lines.at(-1), 'PASS')
})

test('a picture already there (Jenna\'s, or an earlier run) is never touched; a bad one from the model is dropped and counted; a dry run calls nothing', async () => {
  const mine = toBankPicture(synthetic(1, 1)[0], 1, 'jenna')
  const db = memoryDb({ [BANK_DOC]: { pictures: [mine], editedBy: 'steward' } })
  let asked = []
  const { r } = await run(db, { generate: (round, n) => { asked.push([round, n]); return round === 2 ? synthetic(2, n, { bad: true }) : synthetic(round, n) } })
  const bank = db.store.get(BANK_DOC)
  assert.deepEqual(bank.pictures[0], mine, 'kept as it was')
  assert.equal(bank.editedBy, 'steward')
  assert.deepEqual(asked.map(a => a[0]), [1, 2, 3])
  assert.equal(r.dropped > 0, true)
  assert.equal(r.short, PER_ROUND, 'round 2 is still short')
  const dry = await run(memoryDb({}), { dry: true, generate: () => { throw new Error('called') } })
  assert.equal(dry.r.added, 0)
})

test('the brief rules out the style samples, a star, every trace and every motive-card object, and names the grid', () => {
  for (const round of [1, 2, 3]) {
    const p = systemPrompt(round)
    assert.match(p, new RegExp(`${ROUND_SIZES[round]} by ${ROUND_SIZES[round]}`))
    assert.match(p, /Never a smiley face, a house, a diamond pattern, a star or a teapot/)
    for (const w of NEVER_WORDS) assert.ok(p.includes(w), `the brief names ${w}`)
    assert.ok(!/\("A [a-z]+"\)/.test(p), 'the brief gives no example picture Jon could guess')
  }
})

test('a picture already in the bank that fails today\'s never-list is kept but not counted, and its round is topped up; counts only', async () => {
  const old = toBankPicture({ ...synthetic(1, 1)[0], decoys: ['(Synthetic other a)', '(Synthetic other b)', 'A star'] }, 1, 'old')
  assert.ok(checkPicture(old, 1).includes('disqualified'))
  const db = memoryDb({ [BANK_DOC]: { pictures: [old] } })
  const { r, lines } = await run(db)
  assert.equal(r.added, 3 * PER_ROUND, 'round 1 is topped up as if the old picture were not there')
  assert.deepEqual(db.store.get(BANK_DOC).pictures[0], old, 'kept as it was')
  assert.ok(lines.some(l => /^round 1: 0 good pictures, 1 that fail the checks \(kept, never used\), 3 to make$/.test(l)))
})
