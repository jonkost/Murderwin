import { test } from 'node:test'
import assert from 'node:assert/strict'
import { FakeFirestore } from './fake-firestore.mjs'
import { hostCommand, PAUSE_HELD } from '../lib/run.js'
import { WIFI_WELCOME_PICKS } from '../lib/wifiwelcome.js'

// The Host tab's Hide the welcome (15 Nov 2026, Jon: "can I have the ability to advance it from the host panel"):
// the host command `wifi-welcome` writes `wifiWelcome: { hidden, at }` on the night doc, which every room screen
// reads; show brings it back; anything else is refused; it moves no beat or act, and a pause does not hold it.
const T0 = Date.parse('2026-11-15T21:00:00Z')

async function arrivals(db) {
  const r = await hostCommand(db, { command: 'create', arg: { real: false, introAt: T0 + 20 * 60_000 }, now: T0 })
  return r.nightId
}

test('wifi-welcome: hide and show land on the night doc, and nothing else moves', async () => {
  const db = new FakeFirestore()
  const nightId = await arrivals(db)
  const before = (await db.doc(`nights/${nightId}`).get()).data()
  assert.equal(before.beat, 'arrive')
  assert.equal(before.wifiWelcome, undefined, 'a new night shows the welcome: no field until the host presses')

  const hid = await hostCommand(db, { nightId, command: 'wifi-welcome', arg: 'hide', now: T0 + 1000 })
  assert.deepEqual(hid, { ok: true, hidden: true })
  let n = (await db.doc(`nights/${nightId}`).get()).data()
  assert.equal(n.wifiWelcome.hidden, true)
  assert.equal(new Date(n.wifiWelcome.at).getTime(), T0 + 1000)
  assert.equal(n.act, 1)
  assert.equal(n.beat, 'arrive', 'hiding the welcome never moves the night')
  assert.equal(n.phase, 'act')
  assert.equal(n.introAt, before.introAt, 'nor the intro')

  const shown = await hostCommand(db, { nightId, command: 'wifi-welcome', arg: 'show', now: T0 + 2000 })
  assert.deepEqual(shown, { ok: true, hidden: false })
  n = (await db.doc(`nights/${nightId}`).get()).data()
  assert.equal(n.wifiWelcome.hidden, false)
  assert.equal(n.beat, 'arrive')
})

test('wifi-welcome: a hide holds through the intro and a Back one to Arrivals, until Show the welcome', async () => {
  // as the guide says (the review, 15 Nov): Back one for a late guest brings the welcome back only if it was not hidden
  const db = new FakeFirestore()
  const nightId = await arrivals(db)
  await hostCommand(db, { nightId, command: 'wifi-welcome', arg: 'hide', now: T0 + 1000 })
  await hostCommand(db, { nightId, command: 'next', now: T0 + 2000 })
  let n = (await db.doc(`nights/${nightId}`).get()).data()
  assert.equal(n.beat, 'rules', 'the intro')
  await hostCommand(db, { nightId, command: 'back', now: T0 + 3000 })
  n = (await db.doc(`nights/${nightId}`).get()).data()
  assert.equal(n.beat, 'arrive', 'held at Arrivals for a late guest')
  assert.equal(n.wifiWelcome.hidden, true, 'still hidden: the Host tab says so and offers Show the welcome')
  await hostCommand(db, { nightId, command: 'wifi-welcome', arg: 'show', now: T0 + 4000 })
  assert.equal((await db.doc(`nights/${nightId}`).get()).data().wifiWelcome.hidden, false)
})

test('wifi-welcome: only hide or show, and a pause does not hold it', async () => {
  const db = new FakeFirestore()
  const nightId = await arrivals(db)
  assert.deepEqual(WIFI_WELCOME_PICKS, ['hide', 'show'])
  for (const arg of [undefined, '', 'off', 'living', { hidden: true }]) {
    await assert.rejects(() => hostCommand(db, { nightId, command: 'wifi-welcome', arg, now: T0 }), /hide or show/)
  }
  assert.equal((await db.doc(`nights/${nightId}`).get()).data().wifiWelcome, undefined, 'a refused press writes nothing')
  // the same words in any case, as the Host tab sends them
  assert.equal((await hostCommand(db, { nightId, command: 'wifi-welcome', arg: ' HIDE ', now: T0 })).hidden, true)

  assert.equal(PAUSE_HELD.has('wifi-welcome'), false)
  await db.doc(`nights/${nightId}`).set({ phase: 'paused' }, { merge: true })
  const r = await hostCommand(db, { nightId, command: 'wifi-welcome', arg: 'show', now: T0 + 5000 })
  assert.equal(r.hidden, false, 'a pause never holds the welcome’s switch')
})
