import { test } from 'node:test'
import assert from 'node:assert/strict'
import { FakeFirestore } from './fake-firestore.mjs'
import { hostCommand } from '../lib/run.js'
import { IPAD_PICKS } from '../lib/ipad.js'

// The Host tab's row The iPad shows (handoff 11 Nov 2026, A10): the host
// command `ipad` writes the pick and the act it was made in onto the public
// cues doc, which the iPad's page reads; junk is refused; a pause holds it not.
const T0 = Date.parse('2026-11-12T20:00:00Z')

async function nightAt(db, fields) {
  const r = await hostCommand(db, { command: 'create', arg: { real: false, introAt: T0 + 5 * 60_000 }, now: T0 })
  await db.doc(`nights/${r.nightId}`).set(fields, { merge: true })
  return r.nightId
}

test('the ipad command: each pick lands on the cues doc with its act, at once', async () => {
  const db = new FakeFirestore()
  const nightId = await nightAt(db, { act: 3, beat: 'down' })
  for (const show of IPAD_PICKS) {
    const r = await hostCommand(db, { nightId, command: 'ipad', arg: show, now: T0 + 1000 })
    assert.deepEqual(r, { ok: true, ipad: show })
    const cues = (await db.doc(`nights/${nightId}/public/cues`).get()).data()
    assert.equal(cues.ipad.show, show)
    assert.equal(cues.ipad.act, 3, 'the pick holds through the act it was made in')
  }
  // no arg is Auto
  await hostCommand(db, { nightId, command: 'ipad', now: T0 + 2000 })
  assert.equal((await db.doc(`nights/${nightId}/public/cues`).get()).data().ipad.show, 'auto')
})

test('the ipad command refuses a screen it does not know, and works in a pause', async () => {
  const db = new FakeFirestore()
  const nightId = await nightAt(db, { act: 4, beat: 'round1', phase: 'paused' })
  await assert.rejects(() => hostCommand(db, { nightId, command: 'ipad', arg: 'living', now: T0 }), /The iPad can show/)
  await assert.rejects(() => hostCommand(db, { nightId, command: 'ipad', arg: 'splash', now: T0 }), /The iPad can show/)
  const r = await hostCommand(db, { nightId, command: 'ipad', arg: 'memory', now: T0 })
  assert.equal(r.ipad, 'memory', 'a pause never holds the iPad’s switch')
})
