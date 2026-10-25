import { test, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { FakeFirestore } from './fake-firestore.mjs'
import { createNight, join, NightError } from '../lib/night.js'
import { hostCommand } from '../lib/run.js'
import { morningOp, morningStatus, PARTY_DAY, MORNING_DOC, SECRET_DOCS, archivePath, WHY } from '../lib/morning.js'

// The morning after (card 196). SEAL: every secret in this file is a
// synthetic stand-in, bracketed, made here and dropped with the fake
// database. Before the party nothing may come out: no status, refusal or
// log line may carry any of them. Console output is captured and checked.

const captured = []
const real = {}
beforeEach(() => {
  captured.length = 0
  for (const k of ['log', 'info', 'warn', 'error', 'debug']) { real[k] = console[k]; console[k] = (...a) => captured.push(a.map(String).join(' ')) }
})
afterEach(() => {
  for (const k of Object.keys(real)) console[k] = real[k]
  const text = captured.join('\n')
  for (const s of SYNTH) assert.ok(!text.includes(s), `a log line carried a synthetic string of length ${s.length}`)
  assert.ok(!/murderer|ghost|motive|rhyme/i.test(text), 'no role or motive in any log line')
})

const SYNTH = ['(Synthetic thimble)', '(Synthetic pebble)', '(Synthetic sketch)', '(Synthetic lean set)']
const AFTER = PARTY_DAY + 9 * 3_600_000
const BEFORE = PARTY_DAY - 20 * 86_400_000
const GUESTS = ['Jon', 'Susan', 'Jessa', 'Jacob', 'Marie']

// A night played to its end: made with the box ticked (or not), the case dealt at the
// power, and the reveal's last name out (or not). The secrets are bracketed stand-ins.
async function playedNight({ db = new FakeFirestore(), party = true, revealed = true, dryRun = false, gameTest = false } = {}) {
  db.store.set('meta/game', { host_jonathan: 'Jon', host_susan: 'Susan', ...(party ? { party_night: true } : {}) })
  db.store.set('safe_content/bag_items', { items: [{ id: 'i1', text: `${SYNTH[0]} — touch: soft · keepsake` }, { id: 'i2', text: `${SYNTH[1]} — touch: hard · keepsake` }] })
  db.store.set('sealed/bags', { bags: { 1: ['i1', 'i2'], 2: ['i2'] }, doubles: { 2: ['i2'] }, words: {}, properties: {} })
  db.store.set('sealed/parlour_leans', { sets: { [SYNTH[3]]: { 0: { boo: 'a' } } } })
  db.store.set('sealed/relay_pictures', { pictures: [{ round: 1, name: SYNTH[2] }] })
  const { nightId } = await createNight(db, dryRun || gameTest ? { forceRehearsal: !party, dryRun, gameTest } : {})
  for (const name of GUESTS) await join(db, { uid: `u-${name.toLowerCase()}`, nightId, name })
  for (let i = 0; i < 4; i++) await hostCommand(db, { nightId, command: 'next', now: 2_000_000 })
  await hostCommand(db, { nightId, command: 'blackout' })
  await hostCommand(db, { nightId, command: 'power', now: 2_000_000 })
  db.store.set(`nights/${nightId}/private/relay`, { grids: [{ number: 0, named: true, options: [{ name: 'practice' }], answer: 0 }, { number: 1, named: true, options: [{ name: 'x' }, { name: SYNTH[2] }], answer: 1 }, { number: 2, named: false, options: [] }] })
  db.store.set(`nights/${nightId}/public/finale`, { stage: revealed ? 'victim' : 'motive' })
  return { db, nightId }
}

async function refused(p, code) {
  await assert.rejects(p, e => { assert.ok(e instanceof NightError); assert.equal(e.code, code); return true })
}
const noSynth = (value, what) => { const t = JSON.stringify(value); for (const s of SYNTH) assert.ok(!t.includes(s), `${what} carried a synthetic string`) }

test('before the party day nothing opens, even with a revealed party night and OPEN typed', async () => {
  const { db } = await playedNight()
  const st = await morningStatus(db, { now: BEFORE })
  assert.deepEqual(st, { ok: true, opened: false, ready: false, why: WHY.before })
  await refused(morningOp(db, { op: 'open', confirm: 'OPEN' }, { now: BEFORE, log: () => {} }), 'closed')
  await refused(morningOp(db, { op: 'read' }, { now: BEFORE, log: () => {} }), 'closed')
  await refused(morningOp(db, { op: 'secrets', choice: 'clear' }, { now: BEFORE, log: () => {} }), 'closed')
  assert.equal(db.store.get(MORNING_DOC), undefined)
  assert.ok(![...db.store.keys()].some(k => k.startsWith('archive/')), 'no archive made')
  for (const p of SECRET_DOCS) assert.ok(db.store.get(p), 'every secret still in place')
})

test('only a party night whose reveal has played to the end opens: not a rehearsal, a dry run, a Game test night, or a reveal half done', async () => {
  for (const opts of [{ party: false }, { party: true, revealed: false }, { party: false, dryRun: true }, { party: false, gameTest: true }]) {
    const { db } = await playedNight(opts)
    if (opts.dryRun) db.store.forEach((v, k) => { if (/^nights\/[^/]+$/.test(k)) v.forceRehearsal = false })
    const st = await morningStatus(db, { now: AFTER })
    assert.equal(st.ready, false, `ready for ${JSON.stringify(opts)}`)
    assert.equal(st.why, WHY.noParty)
    await refused(morningOp(db, { op: 'open', confirm: 'OPEN' }, { now: AFTER, log: () => {} }), 'closed')
  }
})

test('the word must be OPEN', async () => {
  const { db } = await playedNight()
  for (const confirm of ['', 'yes', 'open it', null]) await refused(morningOp(db, { op: 'open', confirm }, { now: AFTER, log: () => {} }), 'invalid')
  assert.equal(db.store.get(MORNING_DOC), undefined)
})

test('the status says yes or no and why, never a word of the case', async () => {
  const { db } = await playedNight()
  const st = await morningStatus(db, { now: AFTER })
  assert.equal(st.ready, true)
  assert.equal(st.opened, false)
  noSynth(st, 'the status')
  assert.deepEqual(Object.keys(st).sort(), ['label', 'ok', 'opened', 'ready', 'why'])
})

test('open: the party night is archived whole and nothing is moved; read shows the case in plain sections', async () => {
  const { db, nightId } = await playedNight()
  const lines = []
  const log = (...a) => lines.push(a.join(' '))
  const r = await morningOp(db, { op: 'open', confirm: ' open ' }, { now: AFTER, log })
  assert.ok(r.ok && r.parts > 5)
  noSynth(r, 'the open result')
  const index = db.store.get(archivePath(nightId))
  for (const part of ['case', 'night', 'private-deck', 'private-relay', 'public-finale', 'session-jessa', 'sealed-bags', 'sealed-parlour_leans', 'sealed-relay_pictures']) assert.ok(index.parts.includes(part), `the archive holds ${part}`)
  for (const p of SECRET_DOCS) assert.ok(db.store.get(p), 'opening moves nothing')
  assert.ok(db.store.get(`cases/${nightId}`), 'the case stays where it was')
  // opening twice changes nothing
  assert.deepEqual(await morningOp(db, { op: 'open', confirm: 'OPEN' }, { now: AFTER + 1, log }), { ok: true, already: true })

  const { view, secrets } = await morningOp(db, { op: 'read' }, { now: AFTER, log })
  assert.equal(secrets, null)
  const c = db.store.get(`cases/${nightId}`)
  const roster = db.store.get(`nights/${nightId}`).roster
  assert.equal(view.answer.murderer.name, roster[c.murderer].name)
  assert.equal(view.answer.victim.name, roster[c.ghost].name)
  assert.equal(view.answer.motive.n, c.motive)
  assert.equal(view.rehearsal, false)
  assert.equal(view.people.length, GUESTS.length)
  assert.equal(view.people.filter(p => p.role === 'The Murderer').length, 1)
  assert.ok(view.people.every(p => Array.isArray(p.ruledOut)))
  assert.deepEqual(view.bags.list, [{ n: 1, items: [SYNTH[0], SYNTH[1]] }, { n: 2, items: [`2 ${SYNTH[1]}`] }])
  assert.deepEqual(view.drawing, [{ round: 1, picture: SYNTH[2] }, { round: 2, picture: 'a made-up picture (the bank had none)' }])
  assert.ok(view.dial.level >= 1 && view.dial.level <= 5)
  assert.ok(lines.every(l => /^morningAfter (open|read) \{"parts":\d+\}$/.test(l)), 'the log carries the op and a count only')
})

test('keep leaves the secrets sealed; clear removes them only once the archive holds a copy', async () => {
  const kept = await playedNight()
  await refused(morningOp(kept.db, { op: 'secrets', choice: 'keep' }, { now: AFTER, log: () => {} }), 'closed')
  await morningOp(kept.db, { op: 'open', confirm: 'OPEN' }, { now: AFTER, log: () => {} })
  assert.deepEqual(await morningOp(kept.db, { op: 'secrets', choice: 'keep' }, { now: AFTER, log: () => {} }), { ok: true, secrets: 'kept', cleared: 0 })
  for (const p of SECRET_DOCS) assert.ok(kept.db.store.get(p))
  await refused(morningOp(kept.db, { op: 'secrets', choice: 'burn' }, { now: AFTER, log: () => {} }), 'invalid')

  const { db, nightId } = await playedNight()
  await morningOp(db, { op: 'open', confirm: 'OPEN' }, { now: AFTER, log: () => {} })
  const r = await morningOp(db, { op: 'secrets', choice: 'clear' }, { now: AFTER, log: () => {} })
  assert.deepEqual(r, { ok: true, secrets: 'cleared', cleared: 3 })
  for (const p of SECRET_DOCS) {
    assert.equal(db.store.get(p), undefined, 'cleared from sealed/*')
    assert.ok(db.store.get(`archive/${nightId}/parts/${p.replace('/', '-')}`), 'and kept in the archive')
  }
  assert.equal(db.store.get(MORNING_DOC).secrets, 'cleared')
  assert.equal((await morningStatus(db, { now: AFTER })).secrets, 'cleared')
})
