import { test } from 'node:test'
import assert from 'node:assert/strict'
import { FakeFirestore } from './fake-firestore.mjs'
import { createNight, join, nameKey } from '../lib/night.js'
import { hostCommand, player, clockTick, MOVE_CLAIM_MS } from '../lib/run.js'
import { act4Path, act4PrivatePath } from '../lib/act4.js'
import { BLACKOUT_LEAD_MS, BLACKOUT_POWER_MS } from '../lib/blackout.js'
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
  const sched = { act: 6, count: 2, due0: new Date(0), due1: new Date(90_000), fired: { 0: true }, lastAt: new Date(0) }
  assert.equal(dueSlot(sched, { now: 10_000, gapMs: 90_000 }), null, 'the plain rule waits for the gap')
  assert.equal(dueSlot(sched, { now: 10_000, gapMs: 90_000, backToBack: true, closedBeat: 'p0' }), 1)
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

// ---- S5: the blackout's waits run to its marks; the scream is in hand at the press ----------------

// A party in Act 1's last beat, on a clock that moves only when the test says: every write takes `lag` ms.
async function inTheDark({ lag = 300 } = {}) {
  const db = new FakeFirestore()
  db.store.set('meta/game', { host_jonathan: 'Jon', host_susan: 'Susan' })
  const { nightId } = await createNight(db)
  for (const name of ['Jon', 'Susan', 'Mabel']) await join(db, { uid: `u-${name.toLowerCase()}`, nightId, name })
  const P = 9_000_000
  for (let i = 0; i < 5; i++) await host(db, nightId, 'next', undefined, P)
  const t = { now: P }
  const events = []
  for (const m of ['_set', '_update']) {
    const real = db[m].bind(db)
    db[m] = (path, data, ...rest) => {
      t.now += lag
      const r = real(path, data, ...rest)
      if (path === `nights/${nightId}/public/sounds`) events.push({ what: 'sound', at: t.now, id: db.store.get(path)?.current?.id, stamp: ms(db.store.get(path)?.current?.at), ahead: db.store.get(path)?.current?.ahead === true })
      if (path === `nights/${nightId}`) { const ph = db.store.get(path)?.phase; if (events.at(-1)?.phase !== ph) events.push({ what: 'phase', at: t.now, phase: ph }) }
      return r
    }
  }
  const sleeps = []
  const sleep = async waitMs => { sleeps.push(waitMs); t.now += waitMs }
  return { db, nightId, P, t, events, sleeps, sleep, clock: () => t.now }
}

test('S5 the real Blackout: the scream written at the press for the dark mark; each wait runs to its mark, so the dark is five seconds, not six', async () => {
  const { db, nightId, P, events, sleeps, sleep, clock } = await inTheDark()
  const r = await hostCommand(db, { nightId, command: 'blackout', now: P, sleep, clock })
  assert.deepEqual(r, { ok: true, powerReturned: true })
  const darkAt = P + BLACKOUT_LEAD_MS
  const powerAt = darkAt + BLACKOUT_POWER_MS
  const scream = events.find(e => e.what === 'sound')
  const dark = events.find(e => e.what === 'phase' && e.phase === 'blackout')
  const power = events.find(e => e.what === 'phase' && e.phase === 'prompt')
  assert.ok(scream.at < darkAt, 'the scream is in hand before the dark')
  assert.deepEqual([scream.id, scream.stamp, scream.ahead], ['blackout', darkAt, true], 'stamped for the dark mark, ahead')
  assert.equal(events.filter(e => e.what === 'sound').length, 1, 'written once: the dark does not write it again')
  assert.ok(dark.at >= darkAt && dark.at <= darkAt + 300, `the dark's write lands one write after its mark (${dark.at - darkAt} ms)`)
  assert.ok(power.at >= powerAt && power.at <= powerAt + 300, `the power's write lands one write after its mark (${power.at - powerAt} ms), not the reads and writes of the dark on top`)
  assert.ok(sleeps[0] < BLACKOUT_LEAD_MS && sleeps[1] < BLACKOUT_POWER_MS, 'each wait is the time left, not a fixed length')
})

test('S5 the Blackout test: the scream at the press for the dark, the marks off at the power\'s mark', async () => {
  const { db, nightId, P, t, events, sleep, clock } = await inTheDark()
  db.store.set(`nights/${nightId}`, { ...nightOf(db, nightId), forceRehearsal: true })
  await hostCommand(db, { nightId, command: 'blackout-test', now: P, sleep, clock })
  const scream = events.find(e => e.what === 'sound')
  assert.ok(scream.at < P + BLACKOUT_LEAD_MS)
  assert.deepEqual([scream.stamp, scream.ahead], [P + BLACKOUT_LEAD_MS, true])
  assert.ok(t.now >= P + BLACKOUT_LEAD_MS + BLACKOUT_POWER_MS && t.now <= P + BLACKOUT_LEAD_MS + BLACKOUT_POWER_MS + 600)
  assert.equal(nightOf(db, nightId).blackout, null)
})

test('S5 a pause in the lead calls the scream off: no dark, and the doc names no sound', async () => {
  const { db, nightId, P, sleep, clock } = await inTheDark({ lag: 0 })
  const r = await hostCommand(db, { nightId, command: 'blackout', now: P, clock, sleep: async waitMs => { await sleep(waitMs); if (nightOf(db, nightId).phase === 'act') await host(db, nightId, 'pause', undefined, P + 500) } })
  assert.deepEqual(r, { ok: true, powerReturned: false, dark: false })
  const cur = db.store.get(`nights/${nightId}/public/sounds`).current
  assert.equal(cur.id, null)
  assert.equal(cur.calledOff, true)
})

// ---- S6: a real Blackout pressed while a Blackout test runs ---------------------------

test('S6 a real Blackout during a Blackout test is refused, deals nothing, and says a test is running; after it, it works', async () => {
  const { db, nightId, P, sleep, clock } = await inTheDark({ lag: 0 })
  db.store.set(`nights/${nightId}`, { ...nightOf(db, nightId), forceRehearsal: true })
  let during = null
  await hostCommand(db, { nightId, command: 'blackout-test', now: P, clock, sleep: async waitMs => {
    await sleep(waitMs)
    if (!during) during = await hostCommand(db, { nightId, command: 'blackout', now: clock(), sleep: () => { throw new Error('never waits') } })
  } })
  assert.deepEqual(during, { ok: true, already: 'test' })
  assert.equal(db.store.get(`cases/${nightId}`), undefined, 'no case dealt over a test')
  assert.equal(nightOf(db, nightId).act, 1)
  // a second real press while a real one runs still answers plainly
  const r = await hostCommand(db, { nightId, command: 'blackout', now: P + 30_000, sleep: async () => {
    const again = await hostCommand(db, { nightId, command: 'blackout', now: P + 30_500, sleep: () => { throw new Error('never waits') } })
    assert.equal(again.already, true)
  } })
  assert.deepEqual(r, { ok: true, powerReturned: true })
  assert.equal(nightOf(db, nightId).act, 2)
})

test('S2 a Next with no `from` (the workshop, the brain, the fake players) moves as it always has', async () => {
  const { db, nightId } = await intoRounds()
  const r = await host(db, nightId, 'next', undefined, T0 + 1_000)
  assert.equal(r.beat, 'round2')
  assert.equal(nightOf(db, nightId).beat, 'round2')
})
