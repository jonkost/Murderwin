import { test, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { FakeFirestore } from './fake-firestore.mjs'
import {
  stewardRequest, stewardOp, isSteward, emailHash, fieldAllowed, stewardHash, RULES_STEWARD_HASH, OPS, VALUE_MAX,
} from '../lib/steward.js'
import { NightError } from '../lib/night.js'

// SEAL. Every "sealed" string in this file is synthetic: bracketed, built
// from a counter, tied to no motive, gone when the process ends. Console
// output is captured for the whole file and checked at the end of every
// test: no synthetic string may ever appear in a log line.

const sha = s => createHash('sha256').update(s).digest('hex').slice(0, 8)
const JON_UID = 'JYSmPSQfdMen0leIDYmqUa32Prt1'
const STEWARD_EMAIL = 'steward-test@example.test'      // a stand-in address; the hash below is of this one
const HASH = emailHash(STEWARD_EMAIL)

const captured = []
const real = {}
beforeEach(() => {
  captured.length = 0
  for (const k of ['log', 'info', 'warn', 'error', 'debug']) { real[k] = console[k]; console[k] = (...a) => captured.push(a.map(String).join(' ')) }
})
afterEach(() => {
  for (const k of Object.keys(real)) console[k] = real[k]
  const text = captured.join('\n')
  for (const s of synthetic) assert.ok(!text.includes(s), `console carried a synthetic string of length ${s.length} (hash ${sha(s)})`)
  assert.ok(!/Synthetic/i.test(text), 'console carried synthetic content')
})

// ---- a throwaway sealed set -----------------------------------------------
const synthetic = []
function keep(s) { synthetic.push(s); return s }
function syntheticDoc(n) {
  const line = who => keep(`(Synthetic ${n} ${who}: a lantern stood in [ROOM] at [TIME].)`)
  const paper = m => keep(`(Synthetic ${n} paper ${m}: ${Array.from({ length: 42 }, (_, i) => `w${i}`).join(' ')}.)`)
  return {
    kernels: {
      irwin: [1, 2, 3].map(i => line(`irwin ${i}`)),
      boo: [1, 2, 3].map(i => line(`boo ${i}`)),
      granolia: [1, 2, 3].map(i => line(`granolia ${i}`)),
      zimothy: [1, 2, 3].map(i => line(`zimothy ${i}`)),
      salem: [1, 2, 3].map(i => ({ text: keep(`(Synthetic ${n} salem ${i}: the lantern stood far from [ROOM].)`), anchor: 'lantern' })),
    },
    documents: [1, 2, 3].map(m => ({ text: paper(m), emphasis: 'LANTERN', annotation: keep(`(Synthetic ${n} note ${m})`) })),
    fragments: [1, 2, 3].map(m => keep(`(Synthetic ${n} fragment ${m})`)),
    studyClue: [1, 2, 3].map(m => keep(`(Synthetic ${n} study ${m}: ${Array.from({ length: 22 }, (_, i) => `s${i}`).join(' ')}.)`)),
    irwin: [1, 2, 3].map(m => keep(`(Synthetic ${n} dog ${m}.)`)),
    generatedAt: new Date(1000),
  }
}
function sealedDb({ count = 3 } = {}) {
  const db = new FakeFirestore()
  const codes = {}
  for (let i = 1; i <= count; i++) {
    const code = `TST${String(i).padStart(2, '0')}`
    codes[code] = i
    db.store.set(`sealed/${code}`, syntheticDoc(i))
  }
  db.store.set('sealed/manifest', { codes, generatedAt: new Date(1000) })
  return db
}
const asSteward = (data) => ({ auth: { uid: 'steward-uid', token: { email: STEWARD_EMAIL, email_verified: true } }, data })
const quiet = { hash: HASH, log: (...a) => console.log(...a) }

async function refused(p, code) {
  await assert.rejects(p, e => {
    assert.ok(e instanceof NightError, 'a NightError, so index.js maps it to an HttpsError')
    assert.equal(e.code, code)
    assert.ok(!('body' in e) && !('data' in e), 'no body on a refusal')
    return true
  })
}

test('the gate: Jon\'s admin UID, an unverified email and a stranger are refused; the Steward\'s hash opens it', async () => {
  const db = sealedDb()
  await refused(stewardRequest(db, { auth: { uid: JON_UID, token: { email: 'jon@example.test', email_verified: true } }, data: { op: 'whoami' } }, quiet), 'permission-denied')
  await refused(stewardRequest(db, { auth: { uid: 'x', token: { email: STEWARD_EMAIL, email_verified: false } }, data: { op: 'whoami' } }, quiet), 'permission-denied')
  await refused(stewardRequest(db, { auth: { uid: 'x', token: { email: 'other@example.test', email_verified: true } }, data: { op: 'whoami' } }, quiet), 'permission-denied')
  await refused(stewardRequest(db, { auth: null, data: { op: 'whoami' } }, quiet), 'unauthenticated')
  // a refusal never touches the database
  assert.equal(captured.length, 0, 'nothing logged for a refusal')
  const ok = await stewardRequest(db, asSteward({ op: 'whoami' }), quiet)
  assert.deepEqual(ok, { ok: true })
  // the gate by itself
  assert.equal(isSteward({ email: ' Steward-Test@Example.test ', email_verified: true }, { hash: HASH }), true, 'case and spaces do not matter')
  assert.equal(isSteward({ email: STEWARD_EMAIL, email_verified: true }, { hash: '' }), false, 'an empty hash opens nothing')
  assert.equal(isSteward({ email: STEWARD_EMAIL, email_verified: true }, { hash: 'not-a-hash' }), false)
  assert.equal(isSteward(null, { hash: HASH }), false)
  assert.equal(isSteward({ uid: JON_UID }, { hash: HASH }), false)
  // the hash is the one in firestore.rules; the env override counts on the emulator only
  assert.equal(stewardHash({}), RULES_STEWARD_HASH)
  assert.equal(stewardHash({ STEWARD_EMAIL_HASH: HASH }), RULES_STEWARD_HASH, 'a deployed function ignores the override')
  assert.equal(stewardHash({ STEWARD_EMAIL_HASH: HASH, FUNCTIONS_EMULATOR: 'false' }), RULES_STEWARD_HASH)
  assert.equal(stewardHash({ STEWARD_EMAIL_HASH: 'junk', FUNCTIONS_EMULATOR: 'true' }), RULES_STEWARD_HASH)
  assert.equal(stewardHash({ STEWARD_EMAIL_HASH: HASH.toUpperCase(), FUNCTIONS_EMULATOR: 'true' }), HASH, 'the emulator takes a stand-in')
  // the same through the real process env
  const saved = { hash: process.env.STEWARD_EMAIL_HASH, emu: process.env.FUNCTIONS_EMULATOR }
  delete process.env.FUNCTIONS_EMULATOR
  process.env.STEWARD_EMAIL_HASH = HASH
  assert.equal(stewardHash(), RULES_STEWARD_HASH)
  await refused(stewardRequest(db, asSteward({ op: 'whoami' }), { log: quiet.log }), 'permission-denied')
  process.env.FUNCTIONS_EMULATOR = 'true'
  assert.equal(stewardHash(), HASH)
  assert.deepEqual(await stewardRequest(db, asSteward({ op: 'whoami' }), { log: quiet.log }), { ok: true })
  if (saved.hash === undefined) delete process.env.STEWARD_EMAIL_HASH; else process.env.STEWARD_EMAIL_HASH = saved.hash
  if (saved.emu === undefined) delete process.env.FUNCTIONS_EMULATOR; else process.env.FUNCTIONS_EMULATOR = saved.emu
})

test('list: the codes with edited ticks, never the motive; read: one set with the motive it serves', async () => {
  const db = sealedDb()
  const list = await stewardRequest(db, asSteward({ op: 'list' }), quiet)
  assert.equal(list.generated, true)
  assert.equal(list.bags, false)
  assert.deepEqual(list.codes.map(c => c.code), ['TST01', 'TST02', 'TST03'])
  for (const row of list.codes) {
    assert.deepEqual(Object.keys(row).sort(), ['code', 'complete', 'edited', 'editedAt', 'review', 'version'])
    assert.equal(row.edited, false)
    assert.equal(row.complete, true)
    assert.ok(!('motive' in row) && !('n' in row))
  }
  const read = await stewardRequest(db, asSteward({ op: 'read', code: 'TST02' }), quiet)
  assert.equal(read.code, 'TST02')
  assert.equal(read.motive.n, 2)
  assert.equal(typeof read.motive.rhyme, 'string')
  assert.equal(read.content.kernels.boo.length, 3)
  assert.equal(read.content.kernels.salem[0].anchor, 'lantern')
  assert.equal(read.original, null)
  assert.equal(read.version, 0)
  assert.equal(read.shape.ok, true)
  await refused(stewardRequest(db, asSteward({ op: 'read', code: 'NOPE1' }), quiet), 'no-doc')
  await refused(stewardRequest(db, asSteward({ op: 'read', code: 'manifest' }), quiet), 'invalid')
  await refused(stewardRequest(db, asSteward({ op: 'read', code: '../x' }), quiet), 'invalid')
  await refused(stewardRequest(db, asSteward({ op: 'nope' }), quiet), 'invalid')
  // the log carries the op and the code only
  assert.ok(captured.every(l => /^steward (list|read|nope|whoami) (-|[A-Z0-9]+)$/.test(l) || l === ''), captured.join(' | '))
  assert.ok(captured.some(l => l === 'steward read TST02'))
})

test('write: one field; version bumps, the generated copy is kept under original once, the edited text is what the dealer would read', async () => {
  const db = sealedDb()
  const v1 = keep('(Synthetic edit one: a lantern stood in [ROOM] at [TIME], and the clock had stopped.)')
  const r1 = await stewardRequest(db, asSteward({ op: 'write', code: 'TST01', field: 'kernels.boo.1', value: v1 }), { ...quiet, now: new Date(5000) })
  assert.deepEqual({ ok: r1.ok, code: r1.code, field: r1.field, version: r1.version, shape: r1.shape.ok }, { ok: true, code: 'TST01', field: 'kernels.boo.1', version: 1, shape: true })
  assert.ok(!JSON.stringify(r1).includes('Synthetic'), 'a write returns no content')
  const d1 = db.store.get('sealed/TST01')
  assert.equal(d1.kernels.boo[1], v1)
  assert.equal(d1.editedBy, 'steward')
  assert.equal(d1.editedAt.getTime(), 5000)
  assert.equal(d1.version, 1)
  assert.equal(d1.original.kernels.boo[1], syntheticDoc(1).kernels.boo[1], 'the generated copy is kept')
  assert.equal(d1.kernels.boo[0], syntheticDoc(1).kernels.boo[0], 'the other variants are untouched')
  assert.deepEqual(d1.generatedAt, new Date(1000))
  // a second edit bumps again and leaves original alone
  const v2 = keep('(Synthetic edit two: the anchor word changed.)')
  const r2 = await stewardRequest(db, asSteward({ op: 'write', code: 'TST01', field: 'kernels.salem.2.text', value: v2 }), { ...quiet, now: new Date(6000) })
  assert.equal(r2.version, 2)
  const d2 = db.store.get('sealed/TST01')
  assert.equal(d2.kernels.salem[2].text, v2)
  assert.equal(d2.kernels.salem[2].anchor, 'lantern')
  assert.equal(d2.original.kernels.boo[1], syntheticDoc(1).kernels.boo[1], 'original is written once')
  assert.equal(d2.original.kernels.salem[2].text, syntheticDoc(1).kernels.salem[2].text)
  // documents, fragments, study, irwin
  for (const field of ['documents.0.text', 'documents.2.emphasis', 'documents.1.annotation', 'fragments.2', 'studyClue.0', 'irwin.1']) {
    const r = await stewardRequest(db, asSteward({ op: 'write', code: 'TST01', field, value: keep(`(Synthetic ${field})`) }), quiet)
    assert.equal(r.ok, true)
  }
  assert.equal(db.store.get('sealed/TST01').version, 8)
  assert.equal(db.store.get('sealed/TST01').documents[0].text, '(Synthetic documents.0.text)')
  // the shape check comes back with reason codes, never text
  const r3 = await stewardRequest(db, asSteward({ op: 'write', code: 'TST01', field: 'kernels.boo.0', value: keep('(Synthetic with a [Room] blank)') }), quiet)
  assert.equal(r3.shape.ok, false)
  assert.deepEqual(r3.shape.fails, ['kernels:boo:token'])
  // list shows the tick
  const list = await stewardRequest(db, asSteward({ op: 'list' }), quiet)
  assert.deepEqual(list.codes.map(c => [c.code, c.edited, c.version]), [['TST01', true, 9], ['TST02', false, 0], ['TST03', false, 0]])
  const read = await stewardRequest(db, asSteward({ op: 'read', code: 'TST01' }), quiet)
  assert.equal(read.original.kernels.boo[1], syntheticDoc(1).kernels.boo[1])
  assert.equal(read.editedBy, 'steward')
  assert.equal(read.version, 9)
})

test('write refuses: a field off the list, an index past the three variants, an empty or oversized value, a missing set', async () => {
  const db = sealedDb()
  for (const field of ['generatedAt', 'original.kernels.boo.0', 'kernels.boo', 'kernels.boo.3', 'kernels.salem.0', 'kernels.salem.0.extra', 'documents.3.text', 'documents.0.template', 'version', 'editedAt', '__proto__.x', 'kernels.cat.0']) {
    const bad = fieldAllowed(field) ? 'invalid' : 'invalid'
    await refused(stewardRequest(db, asSteward({ op: 'write', code: 'TST01', field, value: keep('(Synthetic refused)') }), quiet), bad)
  }
  await refused(stewardRequest(db, asSteward({ op: 'write', code: 'TST01', field: 'irwin.0', value: '   ' }), quiet), 'invalid')
  await refused(stewardRequest(db, asSteward({ op: 'write', code: 'TST01', field: 'irwin.0', value: 42 }), quiet), 'invalid')
  await refused(stewardRequest(db, asSteward({ op: 'write', code: 'TST01', field: 'irwin.0', value: 'x'.repeat(VALUE_MAX + 1) }), quiet), 'invalid')
  await refused(stewardRequest(db, asSteward({ op: 'write', code: 'TST09', field: 'irwin.0', value: keep('(Synthetic refused)') }), quiet), 'no-doc')
  const d = db.store.get('sealed/TST01')
  assert.equal(d.version, undefined)
  assert.equal(d.editedAt, undefined)
  assert.equal(d.original, undefined)
  assert.deepEqual(d.kernels, syntheticDoc(1).kernels, 'nothing changed')
  assert.ok(OPS.includes('write') && OPS.includes('bags'))
})

test('mark: Jenna\'s two words per set, without touching the content or the version', async () => {
  const db = sealedDb()
  const r = await stewardRequest(db, asSteward({ op: 'mark', code: 'TST03', review: 'more' }), { ...quiet, now: new Date(7000) })
  assert.deepEqual(r, { ok: true, code: 'TST03', review: 'more' })
  const d = db.store.get('sealed/TST03')
  assert.equal(d.review, 'more')
  assert.equal(d.reviewedAt.getTime(), 7000)
  assert.equal(d.version, undefined)
  assert.equal(d.editedAt, undefined)
  await stewardRequest(db, asSteward({ op: 'mark', code: 'TST03', review: 'done' }), quiet)
  const list = await stewardRequest(db, asSteward({ op: 'list' }), quiet)
  assert.deepEqual(list.codes.map(c => c.review), ['', '', 'done'])
  await refused(stewardRequest(db, asSteward({ op: 'mark', code: 'TST03', review: 'maybe' }), quiet), 'invalid')
  await refused(stewardRequest(db, asSteward({ op: 'mark', code: 'TST08', review: 'done' }), quiet), 'no-doc')
})

test('bags: the packing by bag number, items named from the workshop lines, doubles marked; nothing when unpacked', async () => {
  const db = sealedDb()
  const none = await stewardRequest(db, asSteward({ op: 'bags' }), quiet)
  assert.deepEqual(none, { ok: true, packed: false, bags: [] })
  db.store.set('safe_content/bag_items', { items: [
    { id: 'i1', text: keep('(Synthetic item one) — smell: synthetic-a'), order: 0 },
    { id: 'i2', text: keep('(Synthetic item two) — taste: synthetic-b'), order: 1 },
    { id: 'i3', text: keep('(Synthetic item three) — touch: synthetic-c'), order: 2 },
    { id: 'gone', text: 'deleted', order: 3, deleted: true },
  ] })
  db.store.set('sealed/bags', {
    bags: { 2: ['i3', 'gone'], 1: ['i1', 'i2'] },
    doubles: { 1: ['i2'] },
    properties: { 'synthetic-a': [1, 2], 'synthetic-b': [1, 3] },
    stackedPairs: [['synthetic-a', 'synthetic-b']],
    counts: { bags: 2, items: 4 },
    packedAt: new Date(9000), packedBy: 'packer', poolHash: 'abc',
  })
  const r = await stewardRequest(db, asSteward({ op: 'bags' }), quiet)
  assert.equal(r.packed, true)
  assert.equal(r.packedAt, 9000)
  assert.equal(r.packedBy, 'packer')
  assert.equal(r.stackedPairs, 1)
  assert.deepEqual(r.bags.map(b => b.n), [1, 2], 'sorted by bag number')
  assert.deepEqual(r.bags[0].items, [{ id: 'i1', text: '(Synthetic item one) — smell: synthetic-a', twice: false }, { id: 'i2', text: '(Synthetic item two) — taste: synthetic-b', twice: true }])
  assert.equal(r.bags[1].items[1].text, '(a line that is no longer in the workshop)')
  assert.deepEqual(Object.keys(r.properties), ['synthetic-a', 'synthetic-b'])
  const list = await stewardRequest(db, asSteward({ op: 'list' }), quiet)
  assert.equal(list.bags, true)
})

test('stewardOp with no manifest: list is empty and says so; the default log goes through console with op and code only', async () => {
  const db = new FakeFirestore()
  const list = await stewardOp(db, { op: 'list' })
  assert.deepEqual(list, { ok: true, generated: false, generatedAt: null, codes: [], bags: false })
  assert.deepEqual(captured, ['steward list -'])
})
