// A9 (12 Nov 2026), Get Off My Lawn!: "Done when no group can spend more
// than eight minutes in the game." The server's own clock rules (act4.js,
// lib/salemlimits.js), played against the worst group there is, with the
// phones' own rule for when to say a round is done (play/src/lib/salem.js).
// Every case is a throwaway night in a fake Firestore. Nothing is printed.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { FakeFirestore } from './fake-firestore.mjs'
import { createNight, join, PAUSE_SHIFTED } from '../lib/night.js'
import { hostCommand, player } from '../lib/run.js'
import { ms } from '../lib/deal.js'
import { readRotation, salemPath, SALEM_MAX_SLIPS, SALEM_ROUNDS, SALEM_CLEAN_MS } from '../lib/act4.js'
import { SALEM_ROUND_MAX_MS, SALEM_GAME_MAX_MS, readyLimits, roundOver, gameOver } from '../lib/salemlimits.js'
import { gameTestRequest, SALEM_DOC } from '../lib/gametest.js'
import * as phone from '../../play/src/lib/salem.js'

const NAMES = ['Jon', 'Jessa', 'Jacob', 'Marie', 'Pat', 'Sam', 'Lee', 'Ana']

async function night(now) {
  const db = new FakeFirestore()
  db.store.set('meta/game', { host_jonathan: 'Jon', host_susan: 'Susan' })
  const { nightId } = await createNight(db)
  for (const name of NAMES) await join(db, { uid: `u-${name.toLowerCase()}`, nightId, name })
  const host = (command, arg) => hostCommand(db, { nightId, command, arg, now })
  await host('act', 3); await host('start-act4'); await host('next'); await host('next')
  const rot = await readRotation(db, nightId)
  let r = 1
  while (!db.store.get(salemPath(nightId)).groupId && r < rot.rounds) { await host('next'); r++ }
  const doc = () => db.store.get(salemPath(nightId))
  const g = rot.groups.find(x => x.id === doc().groupId)
  const uidOf = key => db.store.get(`nights/${nightId}/private/deck`).uids[key]
  const uids = g.members.map(m => uidOf(m.key))
  return { db, nightId, doc, uids, g }
}

test('the limits: two and a half minutes a round, eight for the game, mirrored on the phones', () => {
  assert.equal(SALEM_ROUND_MAX_MS, 150_000)
  assert.equal(SALEM_GAME_MAX_MS, 8 * 60_000)
  assert.equal(phone.SALEM_MAX_SLIPS, SALEM_MAX_SLIPS)
  assert.equal(phone.SALEM_ROUNDS, SALEM_ROUNDS)
  const f = readyLimits({}, 1000, 5)
  assert.equal(ms(f.roundEndsAt), 1000 + 150_000)
  assert.equal(ms(f.gameEndsAt), 1000 + 8 * 60_000)
  assert.equal(f.letThrough, false)
  const late = readyLimits({ gameEndsAt: new Date(60_000) }, 1000, 5)
  assert.equal(ms(late.roundEndsAt), 60_000, 'a round never runs past the game')
  assert.equal(roundOver({}, 1e12), false, 'an older record has no limit')
  assert.equal(gameOver({ gameEndsAt: new Date(5) }, 5), true)
  assert.deepEqual(PAUSE_SHIFTED['public/salem'], ['roundEndsAt', 'gameEndsAt', 'startsAt', 'cleanAt'], 'a pause moves both limits, and the round under way (review-1112-pause.test.mjs)')
})

// The worst group: slow to tap Ready (`readyAfter`), and it slips on every
// attempt just before its thirty clean seconds (`slipAt` before the mark).
// Its phones say "passed" the moment play/src/lib/salem.js says it is due,
// checking every `step` ms, as SalemRounds does ten times a second.
async function worst({ readyAfter, slipAt = 300, step = 100 }) {
  const t0 = 2_000_000
  const n = await night(t0)
  const [a, b] = n.uids
  await player.meetCat(n.db, { nightId: n.nightId, uid: a, cat: 'salem', now: t0 })
  assert.equal(n.doc().state, 'intro')
  let t = t0
  let changedAt = t0
  let last = null
  let readies = 0
  while (t <= t0 + 20 * 60_000) {
    const d = n.doc()
    const key = `${d.state}-${d.attempt}-${d.round}`
    if (key !== last) { last = key; changedAt = t }
    if (d.state === 'cleared') return { ...n, clearedAt: t, start: t0, readies }
    const due = phone.salemPassDue(d, t)
    if (due) await player.salemPassed(n.db, { nightId: n.nightId, uid: b, attempt: d.attempt, now: t })
    else if ((d.state === 'intro' || d.state === 'passed') && t - changedAt >= readyAfter) { await player.salemReady(n.db, { nightId: n.nightId, uid: a, now: t }); readies++ }
    else if (d.state === 'playing' && t >= ms(d.startsAt) && t >= ms(d.cleanAt) - slipAt) await player.salemSlip(n.db, { nightId: n.nightId, uid: a, attempt: d.attempt, colour: 'green', now: t })
    t += step
  }
  return { ...n, clearedAt: null, start: t0, readies }
}

test('no group spends more than eight minutes in the game, however slow or slippy (on the server\'s clock)', async () => {
  for (const readyAfter of [0, 20_000, 90_000, 10 * 60_000]) {
    const r = await worst({ readyAfter })
    assert.ok(r.clearedAt, `cleared (Ready after ${readyAfter / 1000}s)`)
    assert.ok(r.clearedAt - r.start <= SALEM_GAME_MAX_MS + 100, `in ${(r.clearedAt - r.start) / 1000}s with Ready after ${readyAfter / 1000}s`)
    assert.equal(r.doc().state, 'cleared')
    for (const m of r.g.members) {
      const cards = r.db.store.get(`sessions/${r.db.store.get(`nights/${r.nightId}/private/deck`).uids[m.key]}`).cards ?? []
      assert.ok(cards.find(c => c.kind === 'clue' && c.room === 'orangerie'), 'Salem pays, as for a clean pass')
    }
  }
})

test('a round passes by itself at two and a half minutes, even before its fifth slip', async () => {
  const t0 = 3_000_000
  const n = await night(t0)
  const [a, b] = n.uids
  await player.meetCat(n.db, { nightId: n.nightId, uid: a, cat: 'salem', now: t0 })
  await player.salemReady(n.db, { nightId: n.nightId, uid: a, now: t0 })
  const d = n.doc()
  assert.equal(ms(d.roundEndsAt), t0 + SALEM_ROUND_MAX_MS)
  assert.equal(d.maxSlips, SALEM_MAX_SLIPS)
  assert.equal(d.letThrough, false)
  await assert.rejects(player.salemPassed(n.db, { nightId: n.nightId, uid: b, attempt: d.attempt, now: t0 + 10_000 }), /Not yet/)
  // four slips, each just short of the clean mark: the round's clean mark is now past its limit
  for (let k = 0; k < SALEM_MAX_SLIPS - 1; k++) await player.salemSlip(n.db, { nightId: n.nightId, uid: a, attempt: n.doc().attempt, now: ms(n.doc().startsAt) + 29_000 })
  assert.equal(n.doc().state, 'playing')
  assert.ok(ms(n.doc().cleanAt) > t0 + SALEM_ROUND_MAX_MS)
  await assert.rejects(player.salemPassed(n.db, { nightId: n.nightId, uid: b, attempt: n.doc().attempt, now: t0 + SALEM_ROUND_MAX_MS - 1 }), /Not yet/)
  await player.salemPassed(n.db, { nightId: n.nightId, uid: b, attempt: n.doc().attempt, now: t0 + SALEM_ROUND_MAX_MS })
  assert.equal(n.doc().state, 'passed')
  assert.equal(n.doc().letThrough, true)
  await player.salemReady(n.db, { nightId: n.nightId, uid: a, now: t0 + SALEM_ROUND_MAX_MS + 5000 })
  assert.equal(n.doc().letThrough, false, 'a fresh round starts with a clean slate')
  assert.equal(n.doc().round, 2)
  // a slip after the round's limit passes it
  const d2 = n.doc()
  await player.salemSlip(n.db, { nightId: n.nightId, uid: a, attempt: d2.attempt, now: ms(d2.roundEndsAt) + 1 })
  assert.equal(n.doc().state, 'passed')
})

test('the phones\' view: the round, the clean seconds counting down, the slips left, the one line on a restart', () => {
  const t = 10_000_000
  const doc = { state: 'playing', round: 2, attempt: 3, startsAt: new Date(t), cleanAt: new Date(t + SALEM_CLEAN_MS), slips: 2, maxSlips: 5, lastSlip: 'green' }
  const before = phone.salemView(doc, t - 1500)
  assert.equal(before.count, 2)
  assert.equal(before.cleanLeft, 30)
  assert.equal(before.restart, 'Someone moved. From the top!')
  assert.equal(phone.SALEM_WORDS.round(before.round), 'Round 2 of 3')
  assert.equal(phone.SALEM_WORDS.slipsLeft(before.slipsLeft), '3 slips left')
  const mid = phone.salemView(doc, t + 12_400)
  assert.equal(mid.cleanLeft, 18)
  assert.equal(mid.restart, null)
  assert.equal(phone.salemView({ ...doc, maxSlips: undefined }, t).slipsLeft, null, 'an older record shows no slips line')
  assert.equal(phone.salemView({ ...doc, lastSlip: 'red' }, t - 100).restart, 'Someone froze. From the top!')
  assert.equal(phone.salemPassDue(doc, t + 1000), null)
  assert.equal(phone.salemPassDue(doc, t + SALEM_CLEAN_MS), 'clean')
  assert.equal(phone.salemPassDue({ ...doc, roundEndsAt: new Date(t + 5000) }, t + 5000), 'round')
  assert.equal(phone.salemPassDue({ ...doc, state: 'passed', gameEndsAt: new Date(t) }, t), 'game')
  assert.equal(phone.salemPassDue({ ...doc, state: 'cleared', gameEndsAt: new Date(t) }, t), null)
})

test('the Game test tab\'s practice cannot trap a player either: the fifth slip, the round\'s limit, the game\'s', async () => {
  const db = new FakeFirestore()
  const call = (command, extra = {}) => gameTestRequest(db, { command, ...extra })
  let t = 4_000_000
  await call('salem-open', { isAdmin: true, now: t })
  await call('salem-join', { uid: 'p1', name: 'Pat', now: t })
  const d = () => db.store.get(SALEM_DOC)
  // round 1: five slips pass it
  await call('salem-ready', { uid: 'p1', now: t })
  assert.equal(d().maxSlips, SALEM_MAX_SLIPS)
  for (let k = 1; k <= SALEM_MAX_SLIPS; k++) {
    t = ms(d().startsAt) + 1000
    await call('salem-slip', { uid: 'p1', attempt: d().attempt, colour: 'red', now: t })
  }
  assert.equal(d().state, 'idle')
  assert.equal(d().round, 2, 'on to round 2')
  // round 2: the round's limit passes it
  await call('salem-ready', { uid: 'p1', now: t })
  t = ms(d().roundEndsAt)
  await call('salem-passed', { uid: 'p1', attempt: d().attempt, now: t })
  assert.equal(d().round, 3)
  // the game's limit: from the first Ready, eight minutes
  const end = ms(d().gameEndsAt)
  assert.ok(end > t)
  await call('salem-passed', { uid: 'p1', attempt: d().attempt, now: end })
  assert.equal(d().state, 'passed', 'the practice is over')
})
