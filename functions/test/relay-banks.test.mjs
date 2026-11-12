import { test } from 'node:test'
import assert from 'node:assert/strict'
import { FakeFirestore } from './fake-firestore.mjs'
import { createNight, join } from '../lib/night.js'
import { start, relayPaths } from '../lib/relay.js'
import { BANK_DOC, PRACTICE_BANK_DOC, bankDocFor, checkPicture, STROKES_PER_SQUARE } from '../lib/relay-bank.js'
import { pictureChecks } from '../lib/checks.js'

// Two banks (handoff 11 Nov 2026, job A7, step 7): a practice night draws from
// sealed/relay_pictures_practice and never reads sealed/relay_pictures; the
// party night the other way round. A bank short of good pictures falls back
// to the stand-in grids, as before.
// SEAL: every picture here is a throwaway typed in this file.

const square = (n, tag) => Object.fromEntries(Array.from({ length: n }, (_, i) => [`${'ABCDE'[i]}1`, [{ kind: 'line', from: [0, 0.5], to: [1, 0.5] }]]))
const bankOf = tag => ({ pictures: [1, 2, 3].map(round => ({
  id: `${tag}-${round}`, round, name: `Zorp ${tag} ${round}`, decoys: ['Quib a', 'Quib b', 'Quib c'], cells: square([0, 3, 4, 5][round], tag),
})) })

async function nightWith({ party }) {
  const db = new FakeFirestore()
  db.store.set('meta/game', { host_jonathan: 'Jon', host_susan: 'Susan' })
  const { nightId } = await createNight(db)
  for (const name of ['Jon', 'Susan', 'Jessa']) await join(db, { uid: `u-${name.toLowerCase()}`, nightId, name })
  db.store.set(`cases/${nightId}`, { rehearsal: !party })
  return { db, nightId }
}
function sealedReads(db) {
  const paths = []
  const get = db._get.bind(db)
  db._get = path => { if (String(path).startsWith('sealed')) paths.push(path); return get(path) }
  const collection = db.collection.bind(db)
  db.collection = name => { if (String(name).startsWith('sealed')) paths.push(`scan ${name}`); return collection(name) }
  return paths
}

test('the bank a night reads, by its party flag', () => {
  assert.equal(bankDocFor({ party: true }), BANK_DOC)
  assert.equal(bankDocFor({ party: false }), PRACTICE_BANK_DOC)
  assert.equal(bankDocFor(), PRACTICE_BANK_DOC, 'anything but the party night is a practice')
  assert.equal(PRACTICE_BANK_DOC, 'sealed/relay_pictures_practice')
  assert.equal(STROKES_PER_SQUARE, 3)
})

test('a practice night draws from the practice bank and reads nothing else under sealed/', async () => {
  const { db, nightId } = await nightWith({ party: false })
  db.store.set(BANK_DOC, bankOf('party'))
  db.store.set(PRACTICE_BANK_DOC, bankOf('practice'))
  const reads = sealedReads(db)
  await start(db, { nightId, now: 1_000, seed: 5 })
  assert.deepEqual(reads, [PRACTICE_BANK_DOC], 'one read under sealed/: the practice bank')
  const d = db.store.get(relayPaths(nightId).priv)
  assert.equal(d.fromBank, 3)
  assert.ok(d.grids.every(g => g.named && g.options.some(o => /practice/.test(o.name))), 'its pictures are the practice ones')
  assert.ok(d.grids.every(g => g.options.every(o => !/party/.test(o.name ?? ''))))
})

test('the party night draws from the party bank and never reads the practice bank', async () => {
  const { db, nightId } = await nightWith({ party: true })
  db.store.set(BANK_DOC, bankOf('party'))
  db.store.set(PRACTICE_BANK_DOC, bankOf('practice'))
  const reads = sealedReads(db)
  await start(db, { nightId, now: 1_000, seed: 5 })
  assert.deepEqual(reads, [BANK_DOC])
  const d = db.store.get(relayPaths(nightId).priv)
  assert.equal(d.fromBank, 3)
  assert.ok(d.grids.every(g => g.options.some(o => /party/.test(o.name))))
})

test('a practice night with no practice bank uses the stand-in grids, even when the party bank is full', async () => {
  const { db, nightId } = await nightWith({ party: false })
  db.store.set(BANK_DOC, bankOf('party'))
  const reads = sealedReads(db)
  await start(db, { nightId, now: 1_000, seed: 5 })
  assert.deepEqual(reads, [PRACTICE_BANK_DOC])
  const d = db.store.get(relayPaths(nightId).priv)
  assert.equal(d.fromBank, 0)
  assert.ok(d.grids.every(g => g.named === false))
})

test('a bank short of a good picture for a round falls back to that round\'s stand-in', async () => {
  const { db, nightId } = await nightWith({ party: false })
  const bank = bankOf('practice')
  bank.pictures[1].cells = { A1: Array(STROKES_PER_SQUARE + 1).fill({ kind: 'dot', at: [0.5, 0.5] }) } // too busy, too few squares
  assert.ok(checkPicture(bank.pictures[1], 2).length)
  db.store.set(PRACTICE_BANK_DOC, bank)
  await start(db, { nightId, now: 1_000, seed: 5 })
  const d = db.store.get(relayPaths(nightId).priv)
  assert.equal(d.fromBank, 2)
  assert.deepEqual(d.grids.map(g => g.named), [true, false, true])
})

test('RP1 checks both banks, and that no party picture has a practice picture\'s name; counts only', () => {
  const full = pictureChecks(bankOf('party'), bankOf('practice'))
  assert.deepEqual(full, [{ id: 'RP1', pass: true, count: 6, of: 6 }])
  assert.deepEqual(pictureChecks(bankOf('party'), null), [{ id: 'RP1', pass: false, count: 3, of: 6 }])
  assert.deepEqual(pictureChecks(null, null), [{ id: 'RP1', pass: false, count: 0, of: 6 }])
  const same = bankOf('practice')
  const shared = pictureChecks(same, bankOf('practice'))
  assert.deepEqual(shared, [{ id: 'RP1', pass: false, count: 6, of: 6 }], 'a shared name fails it')
  for (const r of [full, shared].flat()) assert.deepEqual(Object.keys(r).sort(), ['count', 'id', 'of', 'pass'])
})
