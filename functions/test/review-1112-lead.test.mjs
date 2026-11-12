// The check of the review's server fixes (12 Nov 2026): two small things the
// checkers found in them, fixed by the lead.
//   1. A pause in the blackout's two-second lead no longer stopped the scream
//      (it is written at the press now, so every page already had it): the
//      pause itself calls it off, at once, and takes the marks off.
//   2. On a practice night with fill-in players, Jon's own Next into a round
//      took no claim, so a clock landing while the round was still being
//      entered started it a second time (a second chime). Next takes the claim.
// Every night here is a throwaway rehearsal in a fake Firestore. Assertions
// are about keys, counts and flags, never about what a seat was dealt.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { FakeFirestore } from './fake-firestore.mjs'
import { createNight, join, nameKey } from '../lib/night.js'
import { hostCommand, player, clockTick, MOVE_CLAIM_MS, POWER_BACKSTOP_MS } from '../lib/run.js'
import { pressBlackout } from '../lib/blackout.js'
import * as screen from '../lib/screen.js'
import { tickParlour, parlourPath } from '../lib/windows.js'
import { isFillInUid } from '../lib/seats.js'
import { act4Path, act4PrivatePath } from '../lib/act4.js'
import { BLACKOUT_LEAD_MS, BLACKOUT_POWER_MS } from '../lib/blackout.js'
import { ms } from '../lib/deal.js'

const T0 = Date.parse('2026-11-12T23:00:00Z')
const nightOf = (db, id) => db.store.get(`nights/${id}`)
const host = (db, nightId, command, arg, now = T0) => hostCommand(db, { nightId, command, arg, now })
const soundOf = (db, id) => db.store.get(`nights/${id}/public/sounds`)?.current ?? null

// Act 1, at the beat the Blackout ends, with a clock the test moves itself.
async function beforeTheDark() {
  const db = new FakeFirestore()
  db.store.set('meta/game', { host_jonathan: 'Jon', host_susan: 'Susan' })
  const { nightId } = await createNight(db)
  for (const name of ['Jon', 'Susan', 'Mabel']) await join(db, { uid: `u-${name.toLowerCase()}`, nightId, name })
  const P = 9_000_000
  for (let i = 0; i < 5; i++) await host(db, nightId, 'next', undefined, P)
  const t = { now: P }
  return { db, nightId, P, clock: () => t.now, sleep: async waitMs => { t.now += waitMs } }
}

test('a pause in the blackout\'s lead calls the scream off at once, before any page starts it, and takes the marks off', async () => {
  const { db, nightId, P, sleep, clock } = await beforeTheDark()
  assert.equal(nightOf(db, nightId).act, 1)
  let seen = null
  const r = await hostCommand(db, { nightId, command: 'blackout', now: P, clock, sleep: async waitMs => {
    if (!seen) {
      // the press is made: the scream is in every page's hand, stamped for the dark mark
      const held = soundOf(db, nightId)
      assert.equal(held.id, 'blackout'); assert.equal(held.ahead, true); assert.equal(ms(held.at), P + BLACKOUT_LEAD_MS)
      assert.ok(nightOf(db, nightId).blackout, 'the marks are on')
      // half a second into the lead, Jon pauses
      await host(db, nightId, 'pause', undefined, P + 500)
      seen = { sound: soundOf(db, nightId), marks: nightOf(db, nightId).blackout, phase: nightOf(db, nightId).phase }
    }
    await sleep(waitMs)
  } })
  assert.equal(seen.sound.id, null, 'no sound is named any more')
  assert.equal(seen.sound.calledOff, true)
  assert.equal(seen.marks, null, 'the marks are off, so no screen goes dark at the mark')
  assert.equal(seen.phase, 'paused')
  assert.ok(P + 500 < P + BLACKOUT_LEAD_MS - 250, 'all of it before the pages arm the scream, a quarter second ahead of the mark')
  // the Blackout command wakes at its dark mark and finds nothing to do
  assert.deepEqual(r, { ok: true, powerReturned: false, dark: false })
  assert.equal(nightOf(db, nightId).phase, 'paused')
  assert.equal(nightOf(db, nightId).act, 1)
  assert.equal(db.store.get(`cases/${nightId}`), undefined, 'no case was dealt')
  assert.equal(soundOf(db, nightId).id, null)
})

test('a pause at any other time calls nothing off', async () => {
  const { db, nightId, P } = await beforeTheDark()
  const before = JSON.stringify(soundOf(db, nightId))
  await host(db, nightId, 'pause', undefined, P + 1000)
  assert.equal(JSON.stringify(soundOf(db, nightId)), before, 'the sounds record is as it was')
  await host(db, nightId, 'resume', undefined, P + 2000)
  assert.equal(nightOf(db, nightId).phase, 'act')
})

// The final check of 12 Nov 2026: a night paused in the dark stayed dark for good. Every phone is black in the
// dark, the two hosts' too, so nothing could press Resume, and the power's return needs the blackout phase.
test('a Pause in the dark is refused, by the marks and by the phase, and the power comes back by itself', async () => {
  const { db, nightId, P, sleep, clock } = await beforeTheDark()
  const tried = []
  const r = await hostCommand(db, { nightId, command: 'blackout', now: P, clock, sleep: async waitMs => {
    await sleep(waitMs)
    const n = nightOf(db, nightId)
    // the first wait ends at the dark mark, before the phase is written: the marks already say dark
    if (tried.length === 0) {
      assert.equal(n.phase, 'act'); assert.equal(clock(), P + BLACKOUT_LEAD_MS)
      await assert.rejects(host(db, nightId, 'pause', undefined, clock() + 50), /The power comes back in a few seconds/)
      tried.push('marks')
    } else if (tried.length === 1) {
      tried.push('skip')
    }
  } })
  assert.deepEqual(tried, ['marks', 'skip'])
  assert.deepEqual(r, { ok: true, powerReturned: true }, 'the blackout ran whole: the dark, then the power')
  assert.equal(nightOf(db, nightId).phase, 'prompt'); assert.equal(nightOf(db, nightId).act, 2)
  assert.ok(db.store.get(`cases/${nightId}`), 'the case was dealt, once')
})

test('a Pause that reaches the house just after the dark was written is refused on the phase, whatever its own clock says', async () => {
  const { db, nightId, P, sleep, clock } = await beforeTheDark()
  let refused = false
  const r = await hostCommand(db, { nightId, command: 'blackout', now: P, clock, sleep: async waitMs => {
    // the second wait: the dark is written, five seconds to the power
    if (nightOf(db, nightId).phase === 'blackout' && !refused) {
      // a phone whose press was stamped in the lead (its clock a little behind) but lands now
      await assert.rejects(host(db, nightId, 'pause', undefined, P + BLACKOUT_LEAD_MS - 200), /The power comes back in a few seconds/)
      assert.equal(soundOf(db, nightId).id, 'blackout', 'the scream is not called off: the dark has come')
      assert.ok(nightOf(db, nightId).blackout, 'and the marks stay on')
      refused = true
    }
    await sleep(waitMs)
  } })
  assert.equal(refused, true)
  assert.deepEqual(r, { ok: true, powerReturned: true })
  assert.equal(nightOf(db, nightId).phase, 'prompt')
  // after the power the pause works, and Resume brings the role cards back
  await host(db, nightId, 'pause', undefined, P + 60_000)
  assert.equal(nightOf(db, nightId).pausedFrom, 'prompt')
  await host(db, nightId, 'resume', undefined, P + 70_000)
  assert.equal(nightOf(db, nightId).phase, 'prompt')
})

test('a Pause and a Resume inside the lead end that press: no dark with no scream; the next Blackout runs whole', async () => {
  const { db, nightId, P, sleep, clock } = await beforeTheDark()
  let done = false
  const r = await hostCommand(db, { nightId, command: 'blackout', now: P, clock, sleep: async waitMs => {
    if (!done) {
      await host(db, nightId, 'pause', undefined, P + 500)   // by mistake
      await host(db, nightId, 'resume', undefined, P + 1500) // and straight back
      done = true
      assert.equal(nightOf(db, nightId).phase, 'act')
      assert.equal(nightOf(db, nightId).blackout, null, 'the pause took the marks off')
      assert.equal(soundOf(db, nightId).calledOff, true)
    }
    await sleep(waitMs)
  } })
  assert.deepEqual(r, { ok: true, powerReturned: false, dark: false }, 'that press is over: no half blackout')
  assert.equal(nightOf(db, nightId).phase, 'act'); assert.equal(nightOf(db, nightId).act, 1)
  assert.equal(db.store.get(`cases/${nightId}`), undefined, 'nothing dealt')
  // Jon presses Blackout again: the whole thing, once
  const t = { now: P + 20_000 }
  const again = await hostCommand(db, { nightId, command: 'blackout', now: P + 20_000, clock: () => t.now, sleep: async waitMs => { t.now += waitMs } })
  assert.deepEqual(again, { ok: true, powerReturned: true })
  assert.equal(nightOf(db, nightId).phase, 'prompt'); assert.equal(nightOf(db, nightId).act, 2)
  assert.ok(db.store.get(`cases/${nightId}`))
  assert.equal(soundOf(db, nightId).id, 'blackout', 'with its scream')
})

test('a Blackout test\'s dark refuses a Pause too, and the test still ends by itself', async () => {
  const { db, nightId, P, sleep, clock } = await beforeTheDark()
  db.store.set(`nights/${nightId}`, { ...nightOf(db, nightId), forceRehearsal: true })
  let tried = false
  const r = await hostCommand(db, { nightId, command: 'blackout-test', now: P, clock, sleep: async waitMs => {
    await sleep(waitMs)
    if (!tried && clock() >= P + BLACKOUT_LEAD_MS && clock() < P + BLACKOUT_LEAD_MS + BLACKOUT_POWER_MS) {
      await assert.rejects(host(db, nightId, 'pause', undefined, clock() + 100), /The power comes back in a few seconds/)
      tried = true
    }
  } })
  assert.equal(tried, true)
  assert.deepEqual(r, { ok: true, test: true })
  assert.equal(nightOf(db, nightId).phase, 'act'); assert.equal(nightOf(db, nightId).blackout, null)
})

// The last look of 12 Nov 2026: Pause, Resume and Blackout again, all inside the first press's two-second lead.
// The first press, waking at its old dark mark, used to call off whatever scream was on the record: the new one.
test('an old press that was paused never calls off a newer press\'s scream', async () => {
  const { db, nightId, P, sleep, clock } = await beforeTheDark()
  let second = null
  const r = await hostCommand(db, { nightId, command: 'blackout', now: P, clock, sleep: async waitMs => {
    if (!second) {
      await host(db, nightId, 'pause', undefined, P + 300)
      await host(db, nightId, 'resume', undefined, P + 600)
      // the second press, as the Blackout command makes it: new marks, and its own scream stamped for its own dark
      second = await pressBlackout(db, nightId, { now: P + 900 })
      await screen.play(db, nightId, 'blackout', { now: second.darkAt.getTime(), ahead: true })
    }
    await sleep(waitMs)
  } })
  assert.deepEqual(r, { ok: true, powerReturned: false, dark: false }, 'the first press is over')
  const cur = soundOf(db, nightId)
  assert.equal(cur.id, 'blackout', 'the second press\'s scream is still in hand')
  assert.equal(cur.ahead, true)
  assert.equal(ms(cur.at), second.darkAt.getTime())
  assert.equal(ms(nightOf(db, nightId).blackout.pressAt), P + 900, 'and its marks are still on')
  // the pure rule: a call-off names the stamp it means
  assert.deepEqual(await screen.callOff(db, nightId, 'blackout', { now: P + 2000, at: P + 2000 }), { ok: true, calledOff: false })
  assert.deepEqual(await screen.callOff(db, nightId, 'blackout', { now: P + 2000, at: second.darkAt.getTime() }), { ok: true, calledOff: true })
})

// The last look of 12 Nov 2026: if the Blackout's own command died in the dark, nothing ever returned the power,
// and every phone is black in the dark. The minute's tick is the backstop.
test('the power always comes back: a Blackout command that dies in the dark is finished by the tick, once', async () => {
  const { db, nightId, P, sleep, clock } = await beforeTheDark()
  await assert.rejects(hostCommand(db, { nightId, command: 'blackout', now: P, clock, sleep: async waitMs => {
    await sleep(waitMs)
    if (nightOf(db, nightId).phase === 'blackout') throw new Error('the instance was cut')
  } }), /instance was cut/)
  const n = nightOf(db, nightId)
  assert.equal(n.phase, 'blackout'); assert.equal(n.act, 1)
  const powerAt = ms(n.blackout.powerAt)
  assert.equal(powerAt, P + BLACKOUT_LEAD_MS + BLACKOUT_POWER_MS)
  assert.equal(db.store.get(`cases/${nightId}`), undefined)
  // a tick inside the dark, and one just after the power's mark, leave the command to do its own work
  for (const at of [powerAt - 1000, powerAt + 1000, powerAt + POWER_BACKSTOP_MS]) {
    await host(db, nightId, 'tick', undefined, at)
    assert.equal(nightOf(db, nightId).phase, 'blackout')
  }
  // the next one returns the power: Act 2, the role cards, the case dealt
  const back = await host(db, nightId, 'tick', undefined, powerAt + POWER_BACKSTOP_MS + 1)
  assert.deepEqual(back, { ok: true, power: 'returned' })
  assert.equal(nightOf(db, nightId).phase, 'prompt'); assert.equal(nightOf(db, nightId).act, 2)
  assert.equal(nightOf(db, nightId).blackout, null)
  assert.ok(db.store.get(`cases/${nightId}`), 'the case is dealt')
  const roles = Object.values(db.store.get(`nights/${nightId}/private/deck`).uids).map(uid => (db.store.get(`sessions/${uid}`).cards ?? []).filter(c => c.kind === 'role').length)
  assert.ok(roles.length >= 3 && roles.every(k => k === 1), 'one role card a seat')
  // and never twice: later ticks are ordinary ticks
  const again = await host(db, nightId, 'tick', undefined, powerAt + POWER_BACKSTOP_MS + 60_000)
  assert.notEqual(again.power, 'returned')
  assert.equal(nightOf(db, nightId).act, 2)
})

test('a Blackout that runs whole is never touched by the tick', async () => {
  const { db, nightId, P, sleep, clock } = await beforeTheDark()
  let ticked = 0
  const r = await hostCommand(db, { nightId, command: 'blackout', now: P, clock, sleep: async waitMs => {
    await sleep(waitMs)
    if (nightOf(db, nightId).phase === 'blackout') { const t = await host(db, nightId, 'tick', undefined, clock()); assert.notEqual(t.power, 'returned'); ticked++ }
  } })
  assert.ok(ticked >= 1)
  assert.deepEqual(r, { ok: true, powerReturned: true }, 'the command returned the power itself')
})

// The final check of 12 Nov 2026: after a game's last answer, a clock could open the next game before the
// answering call gave the late seats their random picks, so every seat got a random pick for the NEW game.
test('Act 6: a clock that opens game two right after game one\'s last answer leaves game two to be played', async () => {
  const db = new FakeFirestore()
  db.store.set('meta/game', { host_jonathan: 'Jon', host_susan: 'Susan' })
  const started = await hostCommand(db, { command: 'create', arg: { real: false, introAt: T0 + 5 * 60_000, fillIns: 6 }, now: T0 })
  const nightId = started.nightId
  const uids = []
  for (const name of ['Jon', 'Sue']) { const uid = `u-${nameKey(name)}`; await join(db, { uid, nightId, name }); uids.push(uid) }
  await host(db, nightId, 'act', 2)
  await host(db, nightId, 'act', 6)
  const first = nightOf(db, nightId).window
  assert.equal(first.beat, 'p0')
  const sessionOf = uid => db.store.get(`sessions/${uid}`)
  const picksOf = (uid, id) => sessionOf(uid).windows[id].beats.map(b => b.choices[0].k)
  await player.answer(db, { nightId, uid: uids[0], windowId: first.id, picks: picksOf(uids[0], first.id), now: T0 + 10_000 })
  // the last real answer: the moment its own transaction has closed game one, a tick lands and opens game two
  let landed = null
  const orig = db.runTransaction.bind(db)
  db.runTransaction = async fn => {
    const r = await orig(fn)
    const w = nightOf(db, nightId).window
    if (!landed && w?.id === first.id && w.settled === true && w.allIn === true) { landed = 'opening'; landed = await tickParlour(db, nightId, T0 + 10_500) }
    return r
  }
  await player.answer(db, { nightId, uid: uids[1], windowId: first.id, picks: picksOf(uids[1], first.id), now: T0 + 10_400 })
  db.runTransaction = orig
  assert.equal(landed?.opened, true, 'the tick opened game two first')
  const second = nightOf(db, nightId).window
  assert.equal(second.beat, 'p1')
  assert.equal(second.settled, false, 'game two is open')
  const all = Object.values(db.store.get(`nights/${nightId}/private/deck`).uids)
  for (const uid of all) assert.equal(sessionOf(uid).answers?.[second.id], undefined, 'nobody was picked for: game two waits to be played')
  assert.equal(all.filter(isFillInUid).length, 6)
  assert.equal(nightOf(db, nightId).beat, 'games')
  // and it is played: the two real answers close it, and the drawing follows
  for (const [i, uid] of uids.entries()) await player.answer(db, { nightId, uid, windowId: second.id, picks: picksOf(uid, second.id), now: T0 + 20_000 + i })
  for (const uid of uids) assert.equal(sessionOf(uid).answers[second.id].defaulted, false)
  assert.equal(`${nightOf(db, nightId).act}/${nightOf(db, nightId).beat}`, '6/drawing')
  assert.equal(db.store.get(parlourPath(nightId)).closed, true)
})

// A practice night from the big Start button: two real phones and six fill-ins, into Act 4's first round.
async function intoRounds() {
  const db = new FakeFirestore()
  db.store.set('meta/game', { host_jonathan: 'Jon', host_susan: 'Susan' })
  const started = await hostCommand(db, { command: 'create', arg: { real: false, introAt: T0 + 5 * 60_000, fillIns: 6 }, now: T0 })
  const nightId = started.nightId
  const uids = []
  for (const name of ['Jon', 'Sue']) { const uid = `u-${nameKey(name)}`; await join(db, { uid, nightId, name }); uids.push(uid) }
  await host(db, nightId, 'act', 3)
  await host(db, nightId, 'start-act4')
  await host(db, nightId, 'next') // the group cards
  for (const uid of uids) await player.lockIn(db, { nightId, uid, now: T0 })
  return { db, nightId }
}

// Jon's Next from round 1 into round 2, with a clock landing (or not) the moment the beat is written.
async function nextIntoRound2({ withClock }) {
  const { db, nightId } = await intoRounds()
  const pub = () => db.store.get(act4Path(nightId))
  assert.deepEqual([pub().phase, pub().round], ['rounds', 1])
  const at = ms(pub().roundEndsAt) + 1_000 // round 1 has run out
  let landing = null
  let sounds = 0
  let starts = 0
  for (const m of ['_set', '_update']) {
    const real = db[m].bind(db)
    db[m] = (path, data, ...rest) => {
      const r = real(path, data, ...rest)
      if (path === `nights/${nightId}/public/sounds`) sounds++
      if (path === act4Path(nightId) && data?.roundStartsAt) starts++
      if (withClock && path === `nights/${nightId}` && data?.beat === 'round2' && !landing) landing = clockTick(db, nightId, at + 200)
      return r
    }
  }
  const r = await host(db, nightId, 'next', { from: '4/round1' }, at)
  const landed = landing ? await landing : null
  return { db, nightId, at, r, landed, sounds, starts, pub, claim: db.store.get(act4PrivatePath(nightId))?.moves?.round2 }
}

test('on a fill-in night Jon\'s Next into a round takes the round\'s claim, so a clock landing while it is entered starts nothing twice', async () => {
  const alone = await nextIntoRound2({ withClock: false })
  assert.equal(alone.r.beat, 'round2')
  assert.equal(alone.starts, 1)
  assert.equal(ms(alone.claim), alone.at, 'Next took the claim for round 2')

  const raced = await nextIntoRound2({ withClock: true })
  assert.equal(raced.r.beat, 'round2', 'Jon\'s Next went ahead')
  assert.deepEqual(raced.landed, { moved: null }, 'the clock that landed as the beat was written left the round alone')
  assert.equal(raced.starts, 1, 'the round started once')
  assert.equal(raced.sounds, alone.sounds, 'and it rang as often as with no clock at all')
  assert.deepEqual([raced.pub().phase, raced.pub().round], ['rounds', 2])
  // later clocks find the round entered and do nothing; the claim never holds the next round back
  assert.deepEqual(await clockTick(raced.db, raced.nightId, raced.at + MOVE_CLAIM_MS + 1_000), { moved: null })
  assert.equal(raced.pub().round, 2)
})

test('the party night takes no claims: a Next into a round writes none', async () => {
  const db = new FakeFirestore()
  db.store.set('meta/game', { host_jonathan: 'Jon', host_susan: 'Susan' })
  const { nightId } = await createNight(db)
  const uids = []
  for (const name of ['Jon', 'Jessa', 'Jacob', 'Marie', 'Pat', 'Sam']) { const uid = `u-${nameKey(name)}`; await join(db, { uid, nightId, name }); uids.push(uid) }
  await host(db, nightId, 'act', 3)
  await host(db, nightId, 'start-act4')
  await host(db, nightId, 'next')
  for (const uid of uids) await player.lockIn(db, { nightId, uid, now: T0 })
  assert.equal(nightOf(db, nightId).beat, 'round1')
  assert.ok(!nightOf(db, nightId).fillIns)
  const r = await host(db, nightId, 'next', { from: '4/round1' }, T0 + 1_000)
  assert.equal(r.beat, 'round2')
  assert.equal(db.store.get(act4PrivatePath(nightId))?.moves, undefined, 'no claim on a night with no fill-in players')
})
