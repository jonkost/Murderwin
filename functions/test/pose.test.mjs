import { test } from 'node:test'
import assert from 'node:assert/strict'
import { FakeFirestore } from './fake-firestore.mjs'
import { NightError } from '../lib/night.js'
import { savePose, posesFor, validPhoto, posePath, fromPoseCamera, POSE_MAX_CHARS } from '../lib/pose.js'
import { finaleDoc } from '../lib/finale.js'

// The pose photo (card 450): the Entryway iPad's photo of each group's last
// pose, for the end credits. A photo is a souvenir, never a clue; nothing
// here is sealed. The "photos" are a few bytes of base64, not pictures.

const PHOTO = `data:image/jpeg;base64,${'A'.repeat(400)}`
const N = 'n1'

function world({ booGroup = 'g2', state = 'show' } = {}) {
  const db = new FakeFirestore()
  db.store.set(`nights/${N}`, { nightId: N, roster: {} })
  db.store.set(`nights/${N}/private/deck`, { uids: {} })
  db.store.set(`nights/${N}/public/rotation`, { groups: [
    { id: 'g1', members: [{ key: 'jon', name: 'Jon' }, { key: 'jessa', name: 'Jessa' }] },
    { id: 'g2', members: [{ key: 'pat', name: 'Pat' }, { key: 'lee', name: 'Lee' }, { key: 'ana', name: 'Ana' }] },
  ] })
  db.store.set(`nights/${N}/public/boo`, { groupId: booGroup, state })
  return db
}
async function refused(p, code) {
  await assert.rejects(p, e => { assert.ok(e instanceof NightError); assert.equal(e.code, code); return true })
}

test('a photo is a small JPEG as a data URL, and nothing else', () => {
  assert.equal(validPhoto(PHOTO), true)
  for (const bad of [null, '', 'data:image/png;base64,AAAA', `data:image/jpeg;base64,${'A'.repeat(50)}`, `data:image/jpeg;base64,${'A'.repeat(300)}<script>`, `data:image/jpeg;base64,${'A'.repeat(POSE_MAX_CHARS)}`]) {
    assert.equal(validPhoto(bad), false)
  }
})

test('the photo is kept for the group Boo is judging, with the group\'s names', async () => {
  const db = world()
  assert.deepEqual(await savePose(db, { nightId: N, groupId: 'g2', image: PHOTO, now: 5 }), { ok: true })
  const doc = db.store.get(posePath(N, 'g2'))
  assert.equal(doc.image, PHOTO)
  assert.deepEqual(doc.names, ['Pat', 'Lee', 'Ana'])
  // the last pose again (a second shot) replaces it
  await savePose(db, { nightId: N, groupId: 'g2', image: PHOTO.replace(/A$/, 'B'), now: 6 })
  assert.ok(db.store.get(posePath(N, 'g2')).image.endsWith('B'))
})

test('never for another group, an idle runway, a bad photo or a strange group id', async () => {
  await refused(savePose(world(), { nightId: N, groupId: 'g1', image: PHOTO }), 'closed')
  await refused(savePose(world({ state: 'idle' }), { nightId: N, groupId: 'g2', image: PHOTO }), 'closed')
  await refused(savePose(world(), { nightId: N, groupId: 'g2', image: 'nope' }), 'invalid')
  await refused(savePose(world(), { nightId: N, groupId: '../boo', image: PHOTO }), 'invalid')
  const db = world({ state: 'done' })
  await savePose(db, { nightId: N, groupId: 'g2', image: PHOTO })
  assert.ok(db.store.get(posePath(N, 'g2')), 'just after the show is still the show')
})

test('the end credits list the groups that have a photo, with their names, never the photo itself', async () => {
  const db = world()
  await savePose(db, { nightId: N, groupId: 'g2', image: PHOTO })
  const rot = db.store.get(`nights/${N}/public/rotation`)
  assert.deepEqual(await posesFor(db, N, rot), [{ groupId: 'g2', names: ['Pat', 'Lee', 'Ana'] }])
  const f = await finaleDoc(db, N, { dialLog: [], rehearsal: true }, 1_000)
  assert.deepEqual(f.credits.poses, [{ groupId: 'g2', names: ['Pat', 'Lee', 'Ana'] }])
  assert.ok(!JSON.stringify(f).includes(PHOTO), 'the finale doc carries no photo: the TV reads each from its own doc')
  assert.deepEqual((await finaleDoc(world(), N, { dialLog: [], rehearsal: true }, 1_000)).credits.poses, [], 'no photos, no section')
})

test('only Boo’s camera sends a photo: its own presence row for this night, or the admin', async () => {
  const db = world()
  db.store.set('presence/cam', { nightId: N, guestKey: 'kiosk-pose' })
  db.store.set('presence/wall', { nightId: N, guestKey: 'kiosk-boo' })
  db.store.set('presence/old', { nightId: 'n0', guestKey: 'kiosk-pose' })
  db.store.set('sessions/phone', { nightId: N, status: 'active' })
  assert.equal(await fromPoseCamera(db, { uid: 'cam', nightId: N }), true)
  for (const uid of ['wall', 'old', 'phone', 'nobody', null]) assert.equal(await fromPoseCamera(db, { uid, nightId: N }), false, String(uid))
  assert.equal(await fromPoseCamera(db, { uid: 'x', nightId: N, isAdmin: true }), true)
})
