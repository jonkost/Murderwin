import { test } from 'node:test'
import assert from 'node:assert/strict'
import { FakeFirestore } from './fake-firestore.mjs'
import { hostCommand, introDue, clockTick, startEvening, REAL_NIGHT_MESSAGE, INTRO_MAX_MS } from '../lib/run.js'
import { PARTY_DAY } from '../lib/morning.js'
import { ms } from '../lib/deal.js'

// The big Start the night button (12 Nov 2026): one call makes the night and
// opens Arrivals, the intro goes at its time on the server's clock, and the
// real night is refused before the party day.
const T0 = Date.parse('2026-11-12T20:00:00Z')
const nightOf = async (db, id) => (await db.doc(`nights/${id}`).get()).data()

test('Start a run-through: a rehearsal, straight into Arrivals, the intro time kept', async () => {
  const db = new FakeFirestore()
  const r = await hostCommand(db, { command: 'create', arg: { real: false, introAt: T0 + 5 * 60_000 }, now: T0 })
  assert.equal(r.ok, true)
  const n = await nightOf(db, r.nightId)
  assert.equal(n.forceRehearsal, true, 'a run-through reads nothing sealed')
  assert.deepEqual([n.act, n.beat, n.phase], [1, 'arrive', 'act'], 'Arrivals from the tap: the jazz, the bulb and the join code are up')
  assert.equal(n.joinOpen, true)
  assert.equal(ms(n.introAt), T0 + 5 * 60_000)
  assert.equal((await db.doc('public_state/active').get()).data().nightId, r.nightId, 'it is the live night')
})

test('the real night is refused before the party day, and is the party on it', async () => {
  const db = new FakeFirestore()
  await assert.rejects(() => startEvening(db, { real: true, introAt: T0 + 60_000, now: T0 }), e => e.message === REAL_NIGHT_MESSAGE)
  assert.equal((await db.doc('public_state/active').get()).exists, false, 'nothing was made')
  const day = PARTY_DAY + 3 * 60 * 60_000
  const r = await startEvening(db, { real: true, introAt: day + 90 * 60_000, now: day })
  const n = await nightOf(db, r.nightId)
  assert.equal(n.forceRehearsal, false, 'the party night')
  assert.equal(ms(n.introAt), day + 90 * 60_000)
})

test('a time that is past, far off or not a number means no countdown; a plain create is still a night at the doors', async () => {
  const db = new FakeFirestore()
  for (const introAt of [T0 - 1, T0 + INTRO_MAX_MS + 1, null, 'soon']) {
    const r = await startEvening(db, { introAt, now: T0 })
    assert.equal((await nightOf(db, r.nightId)).introAt, null, String(introAt))
  }
  const plain = await hostCommand(db, { command: 'create', arg: 'A label', now: T0 })
  const n = await nightOf(db, plain.nightId)
  assert.deepEqual([n.act, n.phase, n.label], [0, 'lobby', 'A label'])
})

test('the intro goes at its time, once: not early, not in a pause, not from another beat, not after a Back', async () => {
  const db = new FakeFirestore()
  const at = T0 + 5 * 60_000
  const { nightId } = await startEvening(db, { introAt: at, now: T0 })
  const ref = db.doc(`nights/${nightId}`)
  await ref.update({ beatAt: T0 }) // the fake's server time is the test's own
  assert.equal((await introDue(db, { nightId, now: at - 10_000 })).moved, false, 'not early')
  await ref.update({ phase: 'paused' })
  assert.equal((await introDue(db, { nightId, now: at })).moved, false, 'a paused night stands still')
  assert.equal((await clockTick(db, nightId, at)).moved, null)
  await ref.update({ phase: 'act' })
  assert.equal((await introDue(db, { nightId, now: at - 1000 })).moved, true, 'a screen a second ahead of the server is let in')
  assert.equal((await nightOf(db, nightId)).beat, 'rules', 'The house rules')
  assert.equal((await introDue(db, { nightId, now: at + 1000 })).moved, false, 'once')
  // the host presses Back after the time: Arrivals stays
  await hostCommand(db, { nightId, command: 'back', now: at + 60_000 })
  await ref.update({ beatAt: at + 60_000 })
  assert.equal((await nightOf(db, nightId)).beat, 'arrive')
  assert.equal((await introDue(db, { nightId, now: at + 120_000 })).moved, false, 'Back stays where it is put')
  assert.equal((await clockTick(db, nightId, at + 120_000)).moved, null)
})

test('the minute\'s tick is the fallback when no screen asked', async () => {
  const db = new FakeFirestore()
  const at = T0 + 5 * 60_000
  const { nightId } = await startEvening(db, { introAt: at, now: T0 })
  await db.doc(`nights/${nightId}`).update({ beatAt: T0 })
  assert.equal((await clockTick(db, nightId, at - 60_000)).moved, null)
  assert.equal((await clockTick(db, nightId, at + 20_000)).moved, 'rules')
  assert.equal((await nightOf(db, nightId)).beat, 'rules')
})
