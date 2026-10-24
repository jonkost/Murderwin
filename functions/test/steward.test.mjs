import { test, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { FakeFirestore } from './fake-firestore.mjs'
import { stewardRequest, stewardOp, isSteward, emailHash, stewardHash, RULES_STEWARD_HASH, OPS } from '../lib/steward.js'
import { NightError } from '../lib/night.js'

// SEAL. Every sealed string in this file (the packing's item lines, the
// lean table) is synthetic: bracketed, tied to nothing, gone when the
// process ends. Console output is captured for the whole file and checked
// at the end of every test: no synthetic string may ever appear in a log line.

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

const synthetic = []
function keep(s) { synthetic.push(s); return s }
// Every doc path the database is asked for from here on (reads only).
function watchReads(db) {
  const paths = []
  const get = db._get.bind(db)
  db._get = path => { paths.push(path); return get(path) }
  return paths
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
  const db = new FakeFirestore()
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

test('the ops are whoami, bags, leans, lean and checks; the old secrets ops are refused and nothing reads a sealed motive set', async () => {
  assert.deepEqual(OPS, ['whoami', 'bags', 'leans', 'lean', 'checks'])
  const db = new FakeFirestore()
  db.store.set('sealed/manifest', { codes: { TST01: 1 } })
  db.store.set('sealed/TST01', { review: '' })
  const reads = watchReads(db)
  for (const op of ['list', 'read', 'write', 'mark', 'nope']) await refused(stewardRequest(db, asSteward({ op, code: 'TST01', field: 'x', value: 'y', review: 'done' }), quiet), 'invalid')
  for (const op of ['whoami', 'bags', 'leans', 'checks']) await stewardRequest(db, asSteward({ op }), quiet)
  assert.ok(!reads.some(p => p === 'sealed/manifest' || p === 'sealed/TST01'), 'never sealed/manifest, never a sealed motive set')
  assert.deepEqual(db.store.get('sealed/TST01'), { review: '' }, 'nothing written')
  // the log carries the op only
  assert.deepEqual(captured, ['steward whoami', 'steward bags', 'steward leans', 'steward checks'])
})

test('bags: the packing by bag number, each item by name and looks-like note, a pair written out; nothing when unpacked', async () => {
  const db = new FakeFirestore()
  const none = await stewardRequest(db, asSteward({ op: 'bags' }), quiet)
  assert.deepEqual(none, { ok: true, packed: false, bags: [] })
  db.store.set('safe_content/bag_items', { items: [
    { id: 'i1', text: keep('(Synthetic item one) — smell: synthetic-a · extra · stock 2 · looks like: (synthetic look)'), order: 0 },
    { id: 'i2', text: keep('(Synthetic item two) — taste: synthetic-b · food, two singles · stock 4 · looks like: (synthetic wrapper)'), order: 1 },
    { id: 'i3', text: keep('(Synthetic item three) — no clue words · touch · stock 1'), order: 2 },
    { id: 'gone', text: 'deleted', order: 3, deleted: true },
  ] })
  db.store.set('sealed/bags', {
    bags: { 2: ['i3', 'gone'], 1: ['i1', 'i2'] },
    doubles: { 1: ['i2'] },
    properties: { 'synthetic-a': [1, 2], 'synthetic-b': [1, 3] },
    counts: { bags: 2, items: 4 },
    packedAt: new Date(9000), packedBy: 'packer', poolHash: 'abc',
  })
  const r = await stewardRequest(db, asSteward({ op: 'bags' }), quiet)
  assert.equal(r.packed, true)
  assert.equal(r.packedAt, 9000)
  assert.equal(r.packedBy, 'packer')
  assert.deepEqual(r.bags.map(b => b.n), [1, 2], 'sorted by bag number')
  assert.deepEqual(r.bags[0].items.map(i => [i.name, i.looks, i.words, i.twice]), [
    ['(Synthetic item one)', '(synthetic look)', 'smell: synthetic-a', false],
    ['2 (Synthetic item two)', '(synthetic wrapper)', 'taste: synthetic-b', true],
  ])
  assert.equal(r.bags[1].items[0].words, '', 'no clue words reads as none')
  assert.equal(r.bags[1].items[1].name, '(a line that is no longer in the workshop)')
  assert.deepEqual(Object.keys(r.properties), ['synthetic-a', 'synthetic-b'])
})

test('checks: IDs, names, pass or fix needed and counts on the real docs; never a word of what it read', async () => {
  const db = new FakeFirestore()
  const empty = await stewardRequest(db, asSteward({ op: 'checks' }), quiet)
  assert.equal(empty.allPass, false)
  assert.deepEqual(empty.results.map(r => r.id), ['PK1', 'G43', 'PK2', 'LN1', 'RP1'])
  assert.ok(empty.results.every(r => r.pass === false && typeof r.name === 'string'))
  // ten bags of four, three words each, every word in three bags: a sound packing
  const word = k => keep(`synthetic-w${k % 10}`)
  const bags = {}, words = {}
  for (let n = 1; n <= 10; n++) {
    bags[n] = [1, 2, 3, 4].map(i => keep(`syn-${n}-${i}`))
    words[n] = Object.fromEntries([n, n + 1, n + 2].map(k => [word(k), ['smell']]))
  }
  db.store.set('sealed/bags', { bags, doubles: { 1: [bags[1][0]] }, words })
  db.store.set('safe_content/scenarios', { items: [{ id: 's1', text: 'set', beats: [0, 1, 2].map(q => ({ q: keep(`(Synthetic q${q})`), a: 'x', b: 'y' })) }] })
  db.store.set('sealed/parlour_leans', { sets: { s1: Object.fromEntries([0, 1, 2].map(q => [q, { granolia: 'a', boo: 'b', zimothy: 'a', salem: 'b' }])) } })
  const r = await stewardRequest(db, asSteward({ op: 'checks' }), quiet)
  const by = Object.fromEntries(r.results.map(x => [x.id, x]))
  assert.equal(by.PK1.pass, true)
  assert.equal(by.G43.pass, true)
  assert.deepEqual([by.LN1.pass, by.LN1.count, by.LN1.of], [true, 12, 12])
  assert.equal(by.RP1.pass, false, 'no picture bank yet')
  const sent = JSON.stringify(r)
  for (const x of synthetic) assert.ok(!sent.includes(x), 'nothing it read comes back')
})

test('stewardOp: the default log goes through console with the op only', async () => {
  const db = new FakeFirestore()
  assert.deepEqual(await stewardOp(db, { op: 'whoami', code: 'TST01' }), { ok: true })
  assert.deepEqual(captured, ['steward whoami'])
})

test('leans and lean: the Parlour Games lean table beside its bank; one cat, one question at a time; cleared is gone; refused off the shape', async () => {
  const db = new FakeFirestore()
  db.store.set('safe_content/scenarios', { items: [
    { id: 'set-1', order: 0, text: '(x)', beats: [0, 1, 2].map(i => ({ q: `(Question ${i})`, n: 2, a: '(One)', av: 1, b: '(Two)', bv: -1 })) },
    { id: 'set-2', order: 1, text: '(gone)', deleted: true, beats: [0, 1, 2].map(i => ({ q: `(Old ${i})`, n: 2, a: '(One)', av: 1, b: '(Two)', bv: -1 })) },
  ] })
  let r = await stewardOp(db, { op: 'leans' })
  assert.deepEqual(r.sets.map(s => s.id), ['set-1'], 'a deleted set is not on the table')
  assert.equal(r.filled, 0); assert.equal(r.of, 12)
  assert.deepEqual(r.sets[0].questions[0].leans, { granolia: '', boo: '', zimothy: '', salem: '' }, 'never Irwin')
  await stewardOp(db, { op: 'lean', setId: 'set-1', q: 0, cat: 'boo', value: 'b' }, { now: new Date(5000) })
  await stewardOp(db, { op: 'lean', setId: 'set-1', q: 2, cat: 'salem', value: 'a' })
  r = await stewardOp(db, { op: 'leans' })
  assert.equal(r.sets[0].questions[0].leans.boo, 'b')
  assert.equal(r.sets[0].questions[2].leans.salem, 'a')
  assert.equal(r.filled, 2)
  assert.equal(db.store.get('sealed/parlour_leans').sets['set-1'][0].boo, 'b', 'the doc the dealer reads at the case deal')
  await stewardOp(db, { op: 'lean', setId: 'set-1', q: 0, cat: 'boo', value: '' })
  assert.equal(db.store.get('sealed/parlour_leans').sets['set-1'][0].boo, undefined, 'cleared is gone')
  for (const bad of [
    { setId: 'nope', q: 0, cat: 'boo', value: 'a' }, { setId: 'set-1', q: 3, cat: 'boo', value: 'a' },
    { setId: 'set-1', q: 0, cat: 'irwin', value: 'a' }, { setId: 'set-1', q: 0, cat: 'boo', value: 'c' },
    { setId: '../x', q: 0, cat: 'boo', value: 'a' },
  ]) await assert.rejects(() => stewardOp(db, { op: 'lean', ...bad }), NightError)
  // Jon's admin account is refused like anyone else's
  await assert.rejects(() => stewardRequest(db, { auth: { uid: JON_UID, token: { email: 'jon@example.test', email_verified: true } }, data: { op: 'leans' } }, { hash: HASH }), /Not for you/)
})
