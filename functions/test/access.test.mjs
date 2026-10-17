import { test } from 'node:test'
import assert from 'node:assert/strict'
import { FakeFirestore } from './fake-firestore.mjs'
import { createNight, join } from '../lib/night.js'
import { mayTouchNight } from '../lib/access.js'

test('relayAdvance membership: a phone at the party, a kiosk with a heartbeat or the admin; nobody else', async () => {
  const db = new FakeFirestore()
  db.store.set('meta/game', {})
  const { nightId } = await createNight(db)
  await join(db, { uid: 'u-guest', nightId, name: 'Guest' })
  db.store.set('presence/kiosk-living', { nightId, guestKey: 'kiosk-living', at: new Date() })
  db.store.set('presence/pretender', { nightId, guestKey: 'guest', at: new Date() })
  db.store.set('presence/kiosk-elsewhere', { nightId: 'another', guestKey: 'kiosk-bedroom', at: new Date() })
  db.store.set('sessions/u-old', { nightId, guestKey: 'old', status: 'superseded' })

  assert.equal(await mayTouchNight(db, { uid: 'u-guest', nightId }), true, 'a phone at the party')
  assert.equal(await mayTouchNight(db, { uid: 'u-guest', nightId: 'another' }), false, 'but not for another night')
  assert.equal(await mayTouchNight(db, { uid: 'kiosk-living', nightId }), true, 'a room screen with its heartbeat')
  assert.equal(await mayTouchNight(db, { uid: 'kiosk-elsewhere', nightId }), false, 'a kiosk heartbeat for another night')
  assert.equal(await mayTouchNight(db, { uid: 'pretender', nightId }), false, 'a presence row that is not a kiosk and has no session')
  assert.equal(await mayTouchNight(db, { uid: 'u-old', nightId }), false, 'a superseded phone')
  assert.equal(await mayTouchNight(db, { uid: 'nobody', nightId }), false, 'no session, no presence')
  assert.equal(await mayTouchNight(db, { uid: null, nightId }), false)
  assert.equal(await mayTouchNight(db, { uid: 'nobody', nightId, isAdmin: true }), true)
})
