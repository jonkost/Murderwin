import { test } from 'node:test'
import assert from 'node:assert/strict'
import { memoryDb, syntheticSealed, syntheticSealedSet, readMotives } from '../lib.mjs'
import { runGenerate, ARCHIVE } from '../generate-sealed.mjs'
import { validateAll } from '../validate-sealed.mjs'

// SEAL. Every "sealed" set here is synthetic, made in memory from a word,
// tied to no motive, and gone when the process ends. No API call is made:
// `generate` is a synthetic maker. Nothing reads or writes Firestore.
// Every line the run prints is captured and checked for content.

const motives = readMotives()
const NO_CONTENT = /Synthetic|lantern|\[ROOM\]|regen|edited by jenna/i

function capture(fn) {
  const lines = []
  return Promise.resolve().then(() => fn(l => lines.push(String(l)))).then(r => ({ r, lines }))
}

// A set that reads as freshly generated: a different word from the seeded one.
const fresh = motive => syntheticSealed('regen', motive.n)

// A db with nineteen synthetic sets, one of them edited by the Steward.
function seeded({ editedCode = 'DRY05' } = {}) {
  const docs = syntheticSealedSet(19)
  const d = docs[`sealed/${editedCode}`]
  const original = { kernels: structuredClone(d.kernels), documents: d.documents, fragments: d.fragments, studyClue: d.studyClue, irwin: d.irwin }
  d.kernels.boo[1] = '(Synthetic: edited by jenna, a lantern stood in [ROOM] at [TIME].)'
  d.original = original
  d.editedAt = new Date(5000)
  d.editedBy = 'steward'
  d.version = 3
  d.review = 'done'
  return memoryDb(docs)
}
const sealedKeys = db => [...db.store.keys()].filter(k => k.startsWith('sealed/'))

test('a plain run keeps the edited set, regenerates the other eighteen, keeps every code, and prints counts only', async () => {
  const db = seeded()
  const before = JSON.stringify(db.store.get('sealed/DRY05'))
  const manifestBefore = db.store.get('sealed/manifest').codes
  let calls = 0
  const { r, lines } = await capture(log => runGenerate(db, { generate: m => { calls++; return fresh(m) }, motives, now: () => new Date(9000), log }))
  assert.deepEqual(r, { kept: 1, generated: 18, archived: 0, codes: 19 })
  assert.equal(calls, 18)
  assert.ok(lines.includes('kept 1, generated 18'), lines.join('\n'))
  assert.equal(JSON.stringify(db.store.get('sealed/DRY05')), before, 'the edited set is exactly as it was')
  for (let i = 1; i <= 19; i++) {
    const code = `DRY${String(i).padStart(2, '0')}`
    const d = db.store.get(`sealed/${code}`)
    if (code === 'DRY05') continue
    assert.ok(d.fragments[0].includes('regen'), `${code} was regenerated`)
    assert.equal(d.editedAt, undefined)
    assert.equal(d.original, undefined)
    assert.equal(d.generatedAt.getTime(), 9000)
  }
  assert.deepEqual(db.store.get('sealed/manifest').codes, manifestBefore, 'the manifest keeps the same codes')
  assert.equal(db.store.get('sealed/manifest').generatedAt.getTime(), 9000)
  assert.equal(sealedKeys(db).filter(k => k.startsWith(ARCHIVE)).length, 0, 'nothing archived on a plain run')
  // stdout: counts, codes and hashes only, every line short
  for (const l of lines) { assert.ok(!NO_CONTENT.test(l), `content in: ${l.length} chars`); assert.ok(l.length <= 80) }
  assert.ok(lines.some(l => l === 'code DRY05: kept (edited by the Steward)'))
  assert.ok(lines.some(l => /^code DRY06: 15 kernels, 3 docs, 3 fragments, 3 study, 3 irwin$/.test(l)))
  assert.ok(lines.at(-1).startsWith('manifest written (19 codes). run hash '))
  // the validator treats the edited set like the rest and counts it
  const report = await validateAll(db)
  assert.equal(report.pass, true)
  assert.equal(report.complete, 19)
  assert.equal(report.edited, 1)
  assert.equal(report.reviewed, 1)
})

test('a set Jenna marked done (or needs more) but did not edit is kept on a plain run, counted, and archived before --regenerate-all or --force-code replaces it', async () => {
  const db = seeded()
  // DRY09 read and marked done, DRY12 marked needs more: no editedAt on either
  for (const [code, review] of [['DRY09', 'done'], ['DRY12', 'more']]) {
    const d = db.store.get(`sealed/${code}`)
    d.review = review
    d.reviewedAt = new Date(7000)
  }
  const nine = JSON.stringify(db.store.get('sealed/DRY09')), twelve = JSON.stringify(db.store.get('sealed/DRY12'))
  const plain = await capture(log => runGenerate(db, { generate: fresh, motives, now: () => new Date(9000), log }))
  assert.deepEqual(plain.r, { kept: 3, generated: 16, archived: 0, codes: 19 })
  assert.equal(JSON.stringify(db.store.get('sealed/DRY09')), nine, 'the set marked done is exactly as it was')
  assert.equal(JSON.stringify(db.store.get('sealed/DRY12')), twelve, 'the set marked needs more is exactly as it was')
  assert.ok(plain.lines.includes('kept 3, generated 16'))
  assert.ok(plain.lines.includes("3 of the kept sets are the Steward's (edited or reviewed)"), plain.lines.join('\n'))
  assert.ok(plain.lines.some(l => l === 'code DRY09: kept (reviewed by the Steward)'))
  assert.ok(plain.lines.some(l => l === 'code DRY12: kept (reviewed by the Steward)'))
  assert.ok(plain.lines.some(l => l === 'code DRY05: kept (edited by the Steward)'))
  // --force-code on the reviewed set: archived first, the review carried into the archive
  const forced = await capture(log => runGenerate(db, { generate: fresh, motives, forceCode: 'DRY09', now: () => new Date(11000), log }))
  assert.deepEqual(forced.r, { kept: 18, generated: 1, archived: 1, codes: 19 })
  const a = db.store.get(`${ARCHIVE}/DRY09-11000`)
  assert.equal(a.review, 'done'); assert.equal(a.reviewedAt.getTime(), 7000); assert.equal(a.code, 'DRY09')
  assert.equal(db.store.get('sealed/DRY09').review, undefined, 'the fresh set carries no review mark')
  // --regenerate-all: the edited set and the remaining reviewed set are both archived
  const all = await capture(log => runGenerate(db, { generate: fresh, motives, regenerateAll: true, now: () => new Date(13000), log }))
  assert.deepEqual(all.r, { kept: 0, generated: 19, archived: 2, codes: 19 })
  assert.ok(db.store.has(`${ARCHIVE}/DRY05-13000`) && db.store.has(`${ARCHIVE}/DRY12-13000`))
  assert.ok(!all.lines.some(l => /Steward's/.test(l)), 'no kept line when nothing was kept')
  for (const l of [...plain.lines, ...forced.lines, ...all.lines]) { assert.ok(!NO_CONTENT.test(l), `content in: ${l.length} chars`); assert.ok(l.length <= 80) }
})

test('--regenerate-all archives the edited set under sealed/_archive first, then replaces all nineteen', async () => {
  const db = seeded()
  const edited = structuredClone(db.store.get('sealed/DRY05'))
  const { r, lines } = await capture(log => runGenerate(db, { generate: fresh, motives, regenerateAll: true, now: () => new Date(12000), log }))
  assert.deepEqual(r, { kept: 0, generated: 19, archived: 1, codes: 19 })
  assert.ok(lines.includes('kept 0, generated 19, archived 1'))
  const archives = sealedKeys(db).filter(k => k.startsWith(`${ARCHIVE}/`))
  assert.deepEqual(archives, [`${ARCHIVE}/DRY05-12000`])
  const a = db.store.get(archives[0])
  assert.equal(a.kernels.boo[1], edited.kernels.boo[1], 'the archive holds the edited text')
  assert.equal(a.code, 'DRY05')
  assert.equal(a.version, 3)
  assert.equal(a.archivedAt.getTime(), 12000)
  assert.deepEqual(a.original, edited.original)
  const d = db.store.get('sealed/DRY05')
  assert.ok(d.fragments[0].includes('regen'), 'DRY05 was replaced')
  assert.equal(d.editedAt, undefined)
  assert.equal(d.review, undefined)
  for (const l of lines) assert.ok(!NO_CONTENT.test(l))
  assert.equal(Object.keys(db.store.get('sealed/manifest').codes).length, 19)
})

test('--force-code replaces that one set (archived first when edited) and keeps every other set as it is', async () => {
  const db = seeded()
  const untouched = JSON.stringify([...db.store.entries()].filter(([k]) => k.startsWith('sealed/DRY') && k !== 'sealed/DRY05'))
  const one = await capture(log => runGenerate(db, { generate: fresh, motives, forceCode: 'DRY05', now: () => new Date(15000), log }))
  assert.deepEqual(one.r, { kept: 18, generated: 1, archived: 1, codes: 19 })
  assert.ok(one.lines.includes('kept 18, generated 1, archived 1'))
  assert.ok(db.store.has(`${ARCHIVE}/DRY05-15000`))
  assert.ok(db.store.get('sealed/DRY05').fragments[0].includes('regen'))
  assert.equal(JSON.stringify([...db.store.entries()].filter(([k]) => k.startsWith('sealed/DRY') && k !== 'sealed/DRY05')), untouched, 'the other eighteen are byte for byte the same')
  // an unedited set is forced without an archive
  const two = await capture(log => runGenerate(db, { generate: fresh, motives, forceCode: 'DRY07', now: () => new Date(16000), log }))
  assert.deepEqual(two.r, { kept: 18, generated: 1, archived: 0, codes: 19 })
  assert.equal(sealedKeys(db).filter(k => k.startsWith(`${ARCHIVE}/`)).length, 1)
  await assert.rejects(runGenerate(db, { generate: fresh, motives, forceCode: 'NOPE9', log: () => {} }), /no set has that code/)
  await assert.rejects(runGenerate(db, { generate: fresh, motives, forceCode: 'bad code', log: () => {} }), /takes one code/)
  for (const l of [...one.lines, ...two.lines]) assert.ok(!NO_CONTENT.test(l))
})

test('a first run on an empty database makes nineteen fresh codes; a second plain run keeps those codes', async () => {
  const db = memoryDb({})
  const first = await capture(log => runGenerate(db, { generate: fresh, motives, log }))
  assert.deepEqual(first.r, { kept: 0, generated: 19, archived: 0, codes: 19 })
  const codes = db.store.get('sealed/manifest').codes
  assert.equal(Object.keys(codes).length, 19)
  assert.deepEqual([...new Set(Object.values(codes))].sort((a, b) => a - b), motives.map(m => m.n).sort((a, b) => a - b), 'every motive has exactly one code')
  for (const code of Object.keys(codes)) { assert.match(code, /^[A-Z0-9]{5}$/); assert.ok(db.store.has(`sealed/${code}`)) }
  assert.ok(first.lines.includes('kept 0, generated 19'))
  const second = await capture(log => runGenerate(db, { generate: fresh, motives, log }))
  assert.deepEqual(second.r, { kept: 0, generated: 19, archived: 0, codes: 19 })
  assert.deepEqual(db.store.get('sealed/manifest').codes, codes, 'the codes do not change between runs')
  assert.ok(!sealedKeys(db).some(k => k.startsWith(`${ARCHIVE}/`)))
  // a set missing from the database but present in the manifest is simply written
  db.store.delete(`sealed/${Object.keys(codes)[3]}`)
  const third = await capture(log => runGenerate(db, { generate: fresh, motives, log }))
  assert.deepEqual(third.r, { kept: 0, generated: 19, archived: 0, codes: 19 })
  for (const l of [...first.lines, ...second.lines, ...third.lines]) assert.ok(!NO_CONTENT.test(l) && l.length <= 80)
})

test('a generate that fails three times stops the run with a redacted error, after the edited set was already kept', async () => {
  const db = seeded()
  let n = 0
  const boom = () => { n++; throw new Error('(Synthetic failure that must never print)') }
  await assert.rejects(runGenerate(db, { generate: boom, motives, log: () => {} }), e => e.sealSafe === true && !e.message.includes('Synthetic'))
  assert.equal(n, 3)
  assert.equal(db.store.get('sealed/DRY05').version, 3, 'the edited set is untouched')
})
