import { test } from 'node:test'
import assert from 'node:assert/strict'
import { FakeFirestore } from './fake-firestore.mjs'
import { createNight, join, nameKey } from '../lib/night.js'
import { hostCommand, player, clockTick, MOVE_CLAIM_MS } from '../lib/run.js'
import { act4Path, act4PrivatePath } from '../lib/act4.js'
import { ms } from '../lib/deal.js'
import { GRACE_MS, parlourPath, dueSlot, tickParlour } from '../lib/windows.js'
import { closeParlour } from '../lib/flow.js'
import { relayPaths } from '../lib/relay.js'
import { isFillInUid } from '../lib/seats.js'

// The review of 12 Nov 2026 (the morning before the practice night). Every
// night here is a throwaway rehearsal in a fake Firestore. Assertions are about
// keys, counts and flags, never about what a seat was dealt.

const T0 = Date.parse('2026-11-12T23:00:00Z') // the practice evening: before the party day
const nightOf = (db, id) => db.store.get(`nights/${id}`)
const sessionOf = (db, uid) => db.store.get(`sessions/${uid}`)
const host = (db, nightId, command, arg, now = T0) => hostCommand(db, { nightId, command, arg, now })
const fillUids = (db, nightId) => Object.values(db.store.get(`nights/${nightId}/private/deck`).uids).filter(isFillInUid)
// one answer to each question: the first choice (the test's own; a fill-in's picks are its own seeded ones)
const picksOf = (db, uid, id) => sessionOf(db, uid).windows[id].beats.map(b => b.choices[0].k)

// A practice night from the big Start button: two real phones and six fill-ins, nothing running the fill-ins.
async function practice({ fillIns = 6, real = ['Jon', 'Sue'] } = {}) {
  const db = new FakeFirestore()
  db.store.set('meta/game', { host_jonathan: 'Jon', host_susan: 'Susan' })
  const started = await hostCommand(db, { command: 'create', arg: { real: false, introAt: T0 + 5 * 60_000, fillIns }, now: T0 })
  const uids = []
  for (const name of real) { const uid = `u-${nameKey(name)}`; await join(db, { uid, nightId: started.nightId, name }); uids.push(uid) }
  return { db, nightId: started.nightId, uids }
}

// ---- S1: a Parlour Game closes on the last answer ----------------------------------

test('S1 a Parlour Game in Act 2 closes on the second real answer: the six fill-ins answer at once, with no driver', async () => {
  const { db, nightId, uids } = await practice()
  await host(db, nightId, 'act', 2)
  await host(db, nightId, 'beat', 'cat')
  const T1 = T0 + 60_000
  await host(db, nightId, 'light-up', undefined, T1)
  const w = nightOf(db, nightId).window
  assert.equal(w.of, 8, 'eight seats dealt the game')
  const r1 = await player.answer(db, { nightId, uid: uids[0], windowId: w.id, picks: picksOf(db, uids[0], w.id), now: T1 + 5_000 })
  assert.deepEqual(r1, { ok: true })
  assert.equal(nightOf(db, nightId).window.settled, false, 'one real phone still to answer: the game stays open')
  for (const uid of fillUids(db, nightId)) assert.equal(sessionOf(db, uid).answers?.[w.id], undefined, 'the fill-ins wait while a real phone is choosing')
  const r2 = await player.answer(db, { nightId, uid: uids[1], windowId: w.id, picks: picksOf(db, uids[1], w.id), now: T1 + 9_000 })
  assert.deepEqual(r2, { ok: true }, 'the phone hears nothing about the close')
  const after = nightOf(db, nightId).window
  assert.equal(after.settled, true, 'closed on the second real answer, well before its minute')
  assert.equal(after.allIn, true)
  assert.equal(after.answered, 8)
  for (const uid of fillUids(db, nightId)) {
    const a = sessionOf(db, uid).answers[w.id]
    assert.equal(a.defaulted, false, 'each fill-in answered for itself')
    assert.ok(a.picks.length === 3 && a.picks.every(p => p === 'a' || p === 'b'))
  }
})

test('S1 a real seat that never answers still gets the one-minute clock and its random default', async () => {
  const { db, nightId, uids } = await practice()
  await host(db, nightId, 'act', 2)
  await host(db, nightId, 'beat', 'cat')
  const T1 = T0 + 60_000
  await host(db, nightId, 'light-up', undefined, T1)
  const w = nightOf(db, nightId).window
  await player.answer(db, { nightId, uid: uids[0], windowId: w.id, picks: picksOf(db, uids[0], w.id), now: T1 + 5_000 })
  assert.equal(nightOf(db, nightId).window.settled, false)
  const early = await host(db, nightId, 'tick', undefined, ms(w.closesAt) + GRACE_MS - 1)
  assert.equal(early.windowSettled, false, 'not before its minute and the grace')
  const tick = await host(db, nightId, 'tick', undefined, ms(w.closesAt) + GRACE_MS)
  assert.equal(tick.windowSettled, true)
  assert.equal(nightOf(db, nightId).window.settled, true)
  assert.equal(sessionOf(db, uids[1]).answers[w.id].defaulted, true, 'the silent phone got the random pick')
  assert.equal(sessionOf(db, uids[0]).answers[w.id].defaulted, false)
})

test('S1 Act 6: both games answered on the real phones go on to the drawing with no clock', async () => {
  const { db, nightId, uids } = await practice()
  await host(db, nightId, 'act', 2) // the roles out first (a jump past the dark shows the role cards)
  await host(db, nightId, 'act', 6)
  const n0 = nightOf(db, nightId)
  assert.equal(`${n0.act}/${n0.beat}`, '6/games')
  const first = n0.window
  assert.equal(first?.kind, 'questions', 'the first game opens with the act')
  for (const [i, uid] of uids.entries()) await player.answer(db, { nightId, uid, windowId: first.id, picks: picksOf(db, uid, first.id), now: T0 + 10_000 + i })
  const n1 = nightOf(db, nightId)
  assert.notEqual(n1.window.id, first.id, 'the second game opened the moment the first closed, not ninety seconds on')
  assert.equal(n1.window.settled, false)
  assert.equal(n1.beat, 'games')
  const second = n1.window
  for (const [i, uid] of uids.entries()) await player.answer(db, { nightId, uid, windowId: second.id, picks: picksOf(db, uid, second.id), now: T0 + 20_000 + i })
  const n2 = nightOf(db, nightId)
  assert.equal(n2.window.id, second.id)
  assert.equal(n2.window.settled, true)
  assert.equal(`${n2.act}/${n2.beat}`, '6/drawing', 'the drawing starts by itself on the last answer')
  assert.equal(db.store.get(parlourPath(nightId)).closed, true, 'and no game opens after it')
})

test('S1 the party night (no fill-ins) closes on the last real answer too', async () => {
  const db = new FakeFirestore()
  db.store.set('meta/game', { host_jonathan: 'Jon', host_susan: 'Susan' })
  const { nightId } = await createNight(db)
  const uids = []
  for (const name of ['Jon', 'Susan', 'Mabel']) { const uid = `u-${name.toLowerCase()}`; await join(db, { uid, nightId, name }); uids.push(uid) }
  await host(db, nightId, 'act', 2)
  await host(db, nightId, 'beat', 'cat')
  await host(db, nightId, 'light-up', undefined, T0 + 60_000)
  const w = nightOf(db, nightId).window
  assert.equal(w.of, 3)
  for (const [i, uid] of uids.entries()) {
    assert.equal(nightOf(db, nightId).window.settled, false, 'open while a phone is still choosing')
    await player.answer(db, { nightId, uid, windowId: w.id, picks: picksOf(db, uid, w.id), now: T0 + 61_000 + i })
  }
  assert.equal(nightOf(db, nightId).window.settled, true)
  for (const uid of uids) assert.equal(sessionOf(db, uid).answers[w.id].defaulted, false)
})

test('S1 dueSlot back to back: the second game is due once the first has fired, whatever its time; never the first early', () => {
  const sched = { count: 2, due0: new Date(0), due1: new Date(90_000), fired: { 0: true }, lastAt: new Date(0) }
  assert.equal(dueSlot(sched, { now: 10_000, gapMs: 90_000 }), null, 'the plain rule waits for the gap')
  assert.equal(dueSlot(sched, { now: 10_000, gapMs: 90_000, backToBack: true }), 1)
  assert.equal(dueSlot({ count: 2, due0: new Date(5_000), due1: new Date(90_000), fired: {} }, { now: 1_000, backToBack: true }), null)
  assert.equal(dueSlot({ ...sched, fired: { 0: true, 1: true } }, { now: 10_000, backToBack: true }), null)
})

// ---- S2: a Next pressed as the clock moved the night on moves nothing -------------

// A practice night in Act 4's first round, the real players locked in (their lock-in starts the round).
async function intoRounds() {
  const p = await practice()
  await host(p.db, p.nightId, 'act', 3)
  await host(p.db, p.nightId, 'start-act4')
  await host(p.db, p.nightId, 'next') // the group cards
  for (const uid of p.uids) await player.lockIn(p.db, { nightId: p.nightId, uid, now: T0 })
  return p
}

test('S2 the Host tab\'s Next names the beat it is showing: stale, it moves nothing and says so; current, it moves one', async () => {
  const { db, nightId } = await intoRounds()
  assert.equal(nightOf(db, nightId).beat, 'round1')
  // the clock had already moved the night from the group cards to round 1 when Jon pressed Next on the group cards
  const stale = await host(db, nightId, 'next', { from: '4/groups' }, T0 + 1_000)
  assert.deepEqual(stale, { ok: true, moved: null, stale: true })
  assert.equal(nightOf(db, nightId).beat, 'round1', 'not sent past a room it never played')
  const r = await host(db, nightId, 'next', { from: '4/round1' }, T0 + 2_000)
  assert.equal(r.beat, 'round2')
  assert.equal(nightOf(db, nightId).beat, 'round2')
})

test('S3 a round whose beat was written but never started is started by the next clock, once, after the claim runs out', async () => {
  const { db, nightId } = await intoRounds()
  const pub = () => db.store.get(act4Path(nightId))
  assert.deepEqual([pub().phase, pub().round], ['rounds', 1])
  // round 1 has run out; a clock took the move to round 2, wrote the beat, and then failed before the round began
  const at = ms(pub().roundEndsAt) + 1_000
  db.store.set(`nights/${nightId}`, { ...nightOf(db, nightId), beat: 'round2' })
  const priv = db.store.get(act4PrivatePath(nightId)) ?? { paid: {}, arrived: {} }
  db.store.set(act4PrivatePath(nightId), { ...priv, moves: { ...(priv.moves ?? {}), round2: new Date(at) } })
  assert.deepEqual(await clockTick(db, nightId, at + 5_000), { moved: null }, 'inside the claim: the clock that took it may still be at work')
  assert.equal(pub().round, 1)
  const r = await clockTick(db, nightId, at + MOVE_CLAIM_MS + 1_000)
  assert.equal(r.moved, 'round2', 'the round is started, not left for fifteen minutes')
  assert.deepEqual([pub().phase, pub().round], ['rounds', 2])
  const started = ms(pub().roundStartsAt)
  assert.deepEqual(await clockTick(db, nightId, at + 2 * MOVE_CLAIM_MS + 2_000), { moved: null }, 'and only once')
  assert.equal(ms(pub().roundStartsAt), started)
  assert.equal(nightOf(db, nightId).beat, 'round2')
})

// ---- S4: a game claimed just as Next left its beat never lands -----------------------

// Runs `then` right after the next transaction the code makes (the slot's claim), as a Next landing between the two.
function afterNextTransaction(db, then) {
  const orig = db.runTransaction.bind(db)
  db.runTransaction = async fn => { db.runTransaction = orig; const r = await orig(fn); await then(); return r }
}

test('S4 a Parlour Game claimed as Next left the cat visits is sent back, not opened over supper, and opens in its beat later', async () => {
  const { db, nightId } = await practice()
  await host(db, nightId, 'act', 2)
  await host(db, nightId, 'beat', 'cat')
  const sched = () => db.store.get(parlourPath(nightId))
  const due = ms(sched().due0)
  afterNextTransaction(db, () => db.store.set(`nights/${nightId}`, { ...nightOf(db, nightId), beat: 'supper' }))
  const r = await tickParlour(db, nightId, due)
  assert.equal(r.opened, false)
  assert.ok(!nightOf(db, nightId).window, 'no game over supper')
  assert.ok(!sched().fired?.[0], 'the slot is sent back, not spent')
  // back in its own beat it opens
  db.store.set(`nights/${nightId}`, { ...nightOf(db, nightId), beat: 'cat' })
  const again = await tickParlour(db, nightId, due + 1_000)
  assert.equal(again.opened, true)
  assert.equal(nightOf(db, nightId).window.id, 'questions-2-p0')
})

test('S4 a Parlour Game claimed as the drawing started is dropped for good', async () => {
  const { db, nightId, uids } = await practice()
  await host(db, nightId, 'act', 2)
  await host(db, nightId, 'act', 6)
  const first = nightOf(db, nightId).window
  for (const [i, uid] of uids.entries()) await player.answer(db, { nightId, uid, windowId: first.id, picks: picksOf(db, uid, first.id), now: T0 + 1_000 + i })
  // the second opened at once (S1); close it on its clock as if nobody had answered, then put the slot back to replay the race
  const sched = () => db.store.get(parlourPath(nightId))
  db.store.set(parlourPath(nightId), { ...sched(), fired: { 0: true }, closed: false })
  db.store.set(`nights/${nightId}`, { ...nightOf(db, nightId), beat: 'games', window: { ...first, settled: true, allIn: true } })
  afterNextTransaction(db, async () => { db.store.set(relayPaths(nightId).pub, { state: 'intro' }); await closeParlour(db, nightId, { now: T0 + 5_000 }) })
  const r = await tickParlour(db, nightId, T0 + 5_000)
  assert.equal(r.opened, false)
  assert.equal(r.reason, 'drawing')
  assert.equal(nightOf(db, nightId).window.id, first.id, 'nothing opens over the drawing')
  assert.equal((await tickParlour(db, nightId, T0 + 600_000)).opened, false, 'and never after it')
})

test('S2 a Next with no `from` (the workshop, the brain, the fake players) moves as it always has', async () => {
  const { db, nightId } = await intoRounds()
  const r = await host(db, nightId, 'next', undefined, T0 + 1_000)
  assert.equal(r.beat, 'round2')
  assert.equal(nightOf(db, nightId).beat, 'round2')
})
