import { test, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { FakeFirestore } from './fake-firestore.mjs'
import { createNight, join } from '../lib/night.js'
import { hostCommand } from '../lib/run.js'
import { dealEncounter, lightsPath } from '../lib/deal.js'
import { makeRooms, readRotation } from '../lib/act4.js'
import { start as startRelay, relayPaths } from '../lib/relay.js'
import { rehearsalCase } from '../lib/case.js'
import { seededPick, pickFor, cleanSeed, newSeedWord, replayRecord, REPLAY_DOC, REPLAY_KEEP, SEED_WORDS } from '../lib/seed.js'

// Replay a night by its seed (card 324, docs/test-plan.md G22). Every case
// here is a rehearsal's throwaway, dealt in a fake Firestore and dropped with
// it. Assertions compare two deals with each other and never print either:
// a failure says which part differed, never what it holds.

const captured = []
const real = {}
beforeEach(() => {
  captured.length = 0
  for (const k of ['log', 'info', 'warn', 'error', 'debug']) { real[k] = console[k]; console[k] = (...a) => captured.push(a.map(String).join(' ')) }
})
afterEach(() => {
  for (const k of Object.keys(real)) console[k] = real[k]
  assert.ok(!captured.some(l => /murderer|ghost|motive/i.test(l)), 'no role or motive in any log line')
})

const same = (a, b, what) => assert.ok(JSON.stringify(a) === JSON.stringify(b), `${what} differed between two deals of one seed`)
const GUESTS = ['Jon', 'Susan', 'Jessa', 'Jacob', 'Marie', 'Pat', 'Sam']

// One rehearsal from a seed: the guests join in order, the host runs Act 1 to the power, and the
// Act 2 line, the Act 4 groups and the drawing are made. Returns what a replay must repeat.
async function replay(seed, { meta = {}, guests = GUESTS } = {}) {
  const db = new FakeFirestore()
  db.store.set('meta/game', { host_jonathan: 'Jon', host_susan: 'Susan', ...meta })
  const { nightId } = await createNight(db, seed ? { seed } : {})
  for (const name of guests) await join(db, { uid: `u-${name.toLowerCase()}-${Math.random()}`, nightId, name })
  const now = 2_000_000
  for (let i = 0; i < 4; i++) await hostCommand(db, { nightId, command: 'next', now })
  await hostCommand(db, { nightId, command: 'blackout' })
  await hostCommand(db, { nightId, command: 'power', now })
  await dealEncounter(db, nightId, 2, 'cat', { now })
  await makeRooms(db, nightId)
  await startRelay(db, { nightId, now })
  const night = db.store.get(`nights/${nightId}`)
  const deck = db.store.get(`nights/${nightId}/private/deck`)
  const c = db.store.get(`cases/${nightId}`)
  const sessions = Object.fromEntries(Object.entries(deck.uids).map(([k, uid]) => [k, db.store.get(`sessions/${uid}`)]))
  const { createdAt, ...kase } = c
  const lights = db.store.get(lightsPath(nightId))
  const rot = await readRotation(db, nightId)
  const relay = db.store.get(relayPaths(nightId).priv)
  return {
    db, nightId, deck,
    characters: Object.fromEntries(Object.entries(night.roster).map(([k, r]) => [k, r.characterId])),
    bags: Object.fromEntries(Object.entries(night.roster).map(([k, r]) => [k, r.bag])),
    affection: Object.fromEntries(Object.entries(sessions).map(([k, s]) => [k, s.affection])),
    kase,
    waves: Object.fromEntries(Object.entries(lights.guests).map(([k, g]) => [k, g.route])),
    groups: rot.groups.map(g => g.members.map(m => m.key)), rooms: [rot.order, rot.rooms],
    relay: { seed: relay.seed, order: relay.order, grids: relay.grids.map(g => g.order) },
  }
}

test('the seed pick: the same seed and purpose give the same numbers, in range; another purpose its own', () => {
  const a = seededPick('tulip-4471', 'case'), b = seededPick('tulip-4471', 'case'), c = seededPick('tulip-4471', 'affection', 'jessa')
  const xs = Array.from({ length: 200 }, (_, i) => a(1 + (i % 19)))
  assert.deepEqual(Array.from({ length: 200 }, (_, i) => b(1 + (i % 19))), xs)
  assert.ok(xs.every((x, i) => Number.isInteger(x) && x >= 0 && x < 1 + (i % 19)))
  assert.notDeepEqual(Array.from({ length: 200 }, (_, i) => c(1 + (i % 19))), xs)
  assert.equal(a(0), 0)
  // spread: a hundred draws of 1 in 4 land on all four
  const d = seededPick('acorn-1000', 'spread')
  assert.equal(new Set(Array.from({ length: 100 }, () => d(4))).size, 4)
  // no seed: crypto randomness
  assert.equal(pickFor(null, 'case').name, 'randomInt')
})

test('a seed word is cleaned as typed, and a fresh one reads like tulip-4471', () => {
  assert.equal(cleanSeed('  Tulip 4471 '), 'tulip-4471')
  assert.equal(cleanSeed('tulip—4471!'), 'tulip4471')
  assert.equal(cleanSeed(''), '')
  assert.equal(cleanSeed(null), '')
  assert.equal(cleanSeed('x'.repeat(60)).length, 40)
  for (let i = 0; i < 50; i++) assert.match(newSeedWord(), /^[a-z]+-\d{4}$/)
  assert.ok(SEED_WORDS.every(w => /^[a-z]+$/.test(w)))
})

test('G22 the same seed always deals the exact same case', () => {
  const roster = GUESTS.map((name, i) => ({ key: name.toLowerCase(), name, characterId: ['prof-jonathan', 'prof-susan', 'rye', 'leech', 'devine', 'barnes', 'steeps'][i] }))
  for (const seed of ['tulip-4471', 'acorn-1000', 'raven-9999']) {
    const one = rehearsalCase({ roster, rng: seededPick(seed, 'case'), now: 1 })
    const two = rehearsalCase({ roster, rng: seededPick(seed, 'case'), now: 1 })
    same(one, two, `the case from ${seed}`)
  }
  const a = rehearsalCase({ roster, rng: seededPick('tulip-4471', 'case'), now: 1 })
  const b = rehearsalCase({ roster, rng: seededPick('tulip-4472', 'case'), now: 1 })
  assert.ok(JSON.stringify(a) !== JSON.stringify(b), 'another seed deals another case')
})

test('G22 a rehearsal replayed by its seed deals the same night: characters, bags, affection, case, Act 2 line, Act 4 groups, drawing', async () => {
  const one = await replay('tulip-4471')
  const two = await replay('tulip-4471')
  assert.equal(one.deck.seed, 'tulip-4471')
  same(one.characters, two.characters, 'the characters')
  same(one.bags, two.bags, 'the bag numbers')
  same(one.affection, two.affection, 'the affection rolls')
  same(one.kase, two.kase, 'the case (roles, motive, families, cat lines, Parlour Games)')
  same(one.waves, two.waves, 'the Act 2 line')
  same(one.groups, two.groups, 'the Act 4 groups')
  same(one.rooms, two.rooms, 'the Act 4 walk round the rooms')
  same(one.relay, two.relay, 'the drawing')
  // and another word deals another night
  const three = await replay('acorn-1000')
  assert.ok(JSON.stringify(three.kase) !== JSON.stringify(one.kase), 'another word, another case')
})

test('the roles and the case follow the names, not the order they joined in', async () => {
  const one = await replay('heron-2024')
  const two = await replay('heron-2024', { guests: ['Jon', 'Susan', 'Jessa', 'Jacob', 'Marie', 'Sam', 'Pat'] })
  same(one.kase.roles, two.kase.roles, 'the roles')
  same(one.kase.motive, two.kase.motive, 'the motive')
  same(one.kase.parlourPlan, two.kase.parlourPlan, 'the Parlour Games')
})

test('the Replay box: the typed word is used once, by the next night started from a phone, and the page is told', async () => {
  const one = await replay(null, { meta: { replay_seed: ' Tulip 4471 ' } })
  assert.equal(one.deck.seed, 'tulip-4471')
  assert.equal(one.db.store.get('meta/game').replay_seed, undefined, 'the box empties once used')
  const rec = one.db.store.get(REPLAY_DOC)
  assert.equal(rec.last.seed, 'tulip-4471')
  assert.equal(rec.last.nightId, one.nightId)
  assert.equal(rec.last.replayed, true)
  // the same word typed again replays it
  const two = await replay(null, { meta: { replay_seed: 'tulip-4471' } })
  same(one.kase, two.kase, 'the case replayed from the box')
  // no word typed: a fresh one, recorded for next time
  const fresh = await replay(null)
  assert.match(fresh.deck.seed, /^[a-z]+-\d{4}$/)
  assert.equal(fresh.db.store.get(REPLAY_DOC).last.replayed, false)
})

test('the party night is never seeded, whatever is in the box', async () => {
  const db = new FakeFirestore()
  db.store.set('meta/game', { host_jonathan: 'Jon', host_susan: 'Susan', party_night: true, replay_seed: 'tulip-4471' })
  const { nightId } = await createNight(db)
  assert.equal(db.store.get(`nights/${nightId}/private/deck`).seed, undefined)
  assert.equal(db.store.get(REPLAY_DOC), undefined, 'nothing recorded for the party')
  assert.equal(db.store.get('meta/game').replay_seed, 'tulip-4471', 'the box is left alone')
  // a dry run on the party's lists is not a rehearsal either
  const dry = await createNight(db, { forceRehearsal: false, dryRun: true, seed: 'tulip-4471' })
  assert.equal(db.store.get(`nights/${dry.nightId}/private/deck`).seed, undefined)
})

test('a dry run never takes the typed word either', async () => {
  const db = new FakeFirestore()
  db.store.set('meta/game', { host_jonathan: 'Jon', host_susan: 'Susan', replay_seed: 'tulip-4471' })
  const { nightId } = await createNight(db, { forceRehearsal: true, dryRun: true })
  assert.notEqual(db.store.get(`nights/${nightId}/private/deck`).seed, 'tulip-4471')
  assert.equal(db.store.get('meta/game').replay_seed, 'tulip-4471', 'still waiting for the next night from a phone')
})

test('a Game test night never takes the typed word', async () => {
  const db = new FakeFirestore()
  db.store.set('meta/game', { host_jonathan: 'Jon', host_susan: 'Susan', replay_seed: 'tulip-4471' })
  const { nightId } = await createNight(db, { forceRehearsal: true, gameTest: true })
  assert.notEqual(db.store.get(`nights/${nightId}/private/deck`).seed, 'tulip-4471')
  assert.equal(db.store.get('meta/game').replay_seed, 'tulip-4471', 'still waiting for the next night from a phone')
})

test('the Game night page keeps the last five rehearsals, newest first', () => {
  let rec = null
  for (let i = 1; i <= 7; i++) rec = replayRecord(rec, { seed: `w-${i}`, nightId: `n${i}` })
  assert.equal(rec.recent.length, REPLAY_KEEP)
  assert.deepEqual(rec.recent.map(r => r.seed), ['w-7', 'w-6', 'w-5', 'w-4', 'w-3'])
  assert.equal(rec.last.seed, 'w-7')
})
