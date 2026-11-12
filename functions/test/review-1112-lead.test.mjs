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
import { hostCommand, player, clockTick, MOVE_CLAIM_MS } from '../lib/run.js'
import { act4Path, act4PrivatePath } from '../lib/act4.js'
import { BLACKOUT_LEAD_MS } from '../lib/blackout.js'
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
  // and a pause once the dark has come leaves the scream alone: it has played
  const t = { now: P + 3000 }
  let inDark = null
  await hostCommand(db, { nightId, command: 'blackout', now: P + 3000, clock: () => t.now, sleep: async waitMs => {
    t.now += waitMs
    if (!inDark && nightOf(db, nightId).phase === 'blackout') {
      await host(db, nightId, 'pause', undefined, t.now + 100)
      inDark = soundOf(db, nightId)
    }
  } })
  if (inDark) assert.notEqual(inDark.calledOff, true, 'a pause in the dark calls nothing off')
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
