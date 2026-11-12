import { test } from 'node:test'
import assert from 'node:assert/strict'
import { FakeFirestore } from './fake-firestore.mjs'
import { createNight, join, nameKey } from '../lib/night.js'
import { hostCommand, player } from '../lib/run.js'
import { ms } from '../lib/deal.js'
import { GRACE_MS, parlourPath, dueSlot } from '../lib/windows.js'
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
