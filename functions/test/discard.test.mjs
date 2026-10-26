import { test } from 'node:test'
import assert from 'node:assert/strict'
import { FakeFirestore } from './fake-firestore.mjs'
import { createNight, join, canHost } from '../lib/night.js'
import { hostCommand } from '../lib/run.js'
import { discardNight, discardable, markDryRun } from '../lib/discard.js'

// A throwaway night with four phones, walked to Act 2 so a rehearsal case,
// cards, a window and presence rows all exist. Nothing here is a real case.
async function rehearsed() {
  const db = new FakeFirestore()
  db.store.set('meta/game', { host_jonathan: 'Jon', host_susan: 'Susan' })
  const { nightId } = await createNight(db)
  const uids = ['uid-jon', 'uid-jessa', 'uid-jacob', 'uid-marie']
  const names = ['Jon', 'Jessa', 'Jacob', 'Marie']
  for (let i = 0; i < uids.length; i++) await join(db, { uid: uids[i], nightId, name: names[i] })
  await hostCommand(db, { nightId, command: 'act', arg: 2 })
  await hostCommand(db, { nightId, command: 'beat', arg: 'cat' })
  await hostCommand(db, { nightId, command: 'light-up' })
  for (const uid of uids) {
    db.store.set(`presence/${uid}`, { nightId, guestKey: uid.slice(4), at: new Date() })
    // the real shape (byNight, 17 Oct), with the Notes box's text in the branch (25 Oct)
    db.store.set(`notes/${uid}`, { crossed: { 3: true }, byNight: { [nightId]: { seen: { welcome: true }, crossed: { 5: true }, text: '[a guest\'s scribbles]' }, 'other-night': { seen: {}, text: '[kept]' } } })
  }
  db.store.set('presence/kiosk-1', { nightId, guestKey: 'kiosk-living', at: new Date() })
  db.store.set('presence/elsewhere', { nightId: 'another', guestKey: 'x', at: new Date() })
  db.store.set('sessions/old-phone', { nightId, guestKey: 'jessa', status: 'superseded' })
  db.store.set('sessions/stranger', { nightId: 'another', guestKey: 'z', status: 'active' })
  return { db, nightId, uids }
}

const under = (db, prefix) => [...db.store.keys()].filter(k => k.startsWith(prefix))

test('discard-night removes the case, the night and its subcollections, sessions, presence and note branches, and nothing else', async () => {
  const { db, nightId, uids } = await rehearsed()
  assert.ok(db.store.has(`cases/${nightId}`), 'a rehearsal case exists before')
  assert.ok(db.store.get(`nights/${nightId}/private/windows`), 'a window doc exists before')
  const r = await hostCommand(db, { nightId, command: 'discard-night' })
  assert.equal(r.ok, true)
  assert.equal(r.case, 1)
  assert.equal(r.night, 1)
  assert.ok(r.subdocs >= 4, `public and private docs gone (${r.subdocs})`)
  assert.equal(r.sessions, 5, 'four phones and the superseded one')
  assert.equal(r.presence, 5, 'four phones and the kiosk')
  assert.equal(r.notes, 4)
  assert.equal(r.active, 1)
  assert.equal(under(db, `cases/${nightId}`).length, 0)
  assert.equal(under(db, `nights/${nightId}`).length, 0)
  for (const uid of uids) {
    assert.ok(!db.store.has(`sessions/${uid}`))
    assert.ok(!db.store.has(`presence/${uid}`))
    const n = db.store.get(`notes/${uid}`)
    assert.ok(n, 'the note doc stays')
    assert.equal(n.byNight[nightId], undefined, 'this night\'s branch is gone, the Notes text and the crossings-off with it')
    assert.ok(n.byNight['other-night'], 'another night\'s branch stays')
    assert.equal(n.byNight['other-night'].text, '[kept]', 'and its Notes text with it')
    assert.deepEqual(n.crossed, { 3: true }, 'un-scoped scribbles are left alone')
  }
  assert.ok(db.store.has('sessions/stranger'), 'another night\'s session stays')
  assert.ok(db.store.has('presence/elsewhere'), 'another night\'s presence stays')
  assert.equal(db.store.get('public_state/active').nightId, null)
  assert.ok(db.store.has('meta/game'), 'the workshop settings stay')
})

test('discard refuses a real case unless the night is a dry run', async () => {
  const { db, nightId } = await rehearsed()
  db.store.set(`cases/${nightId}`, { ...db.store.get(`cases/${nightId}`), rehearsal: false })
  await assert.rejects(() => discardNight(db, { nightId }), /real case/)
  assert.ok(db.store.has(`cases/${nightId}`), 'nothing was deleted')
  assert.ok(db.store.has(`nights/${nightId}`))
  await hostCommand(db, { nightId, command: 'dry-run' })
  assert.equal(db.store.get(`nights/${nightId}`).dryRun, true)
  const r = await discardNight(db, { nightId })
  assert.equal(r.case, 1)
  assert.ok(!db.store.has(`cases/${nightId}`))
})

test('discardable: the rule in one place', () => {
  assert.equal(discardable({ night: null, c: null }).ok, true)
  assert.equal(discardable({ night: { dryRun: true }, c: { rehearsal: false } }).ok, true)
  assert.equal(discardable({ night: {}, c: null }).ok, true)
  assert.equal(discardable({ night: {}, c: { rehearsal: true } }).ok, true)
  assert.equal(discardable({ night: {}, c: { rehearsal: false } }).ok, false)
  assert.equal(discardable({ night: { dryRun: false }, c: { rehearsal: false } }).reason, 'real-case')
})

test('a night with no case yet discards cleanly; a missing night is refused in words', async () => {
  const db = new FakeFirestore()
  db.store.set('meta/game', {})
  const { nightId } = await createNight(db)
  await join(db, { uid: 'u1', nightId, name: 'Someone' })
  const r = await discardNight(db, { nightId })
  assert.equal(r.case, 0)
  assert.equal(r.night, 1)
  assert.equal(r.sessions, 1)
  await assert.rejects(() => hostCommand(db, { nightId, command: 'discard-night' }), /No such night/)
  await assert.rejects(() => markDryRun(db, { nightId: 'nope' }), /No such night/)
})

test('only a host of that night or the admin may discard it; a stranger is refused', async () => {
  const { db, nightId } = await rehearsed()
  assert.equal(await canHost(db, { uid: 'uid-jon', nightId, command: 'discard-night' }), true)
  assert.equal(await canHost(db, { uid: 'uid-jessa', nightId, command: 'discard-night' }), false, 'a guest')
  assert.equal(await canHost(db, { uid: 'nobody', nightId, command: 'discard-night' }), false, 'no session at all')
  assert.equal(await canHost(db, { uid: 'nobody', isAdmin: true, nightId, command: 'discard-night' }), true)
})

test('settle-now closes a window early on a dry run night only', async () => {
  const { db, nightId, uids } = await rehearsed()
  const w = db.store.get(`nights/${nightId}`).window
  assert.equal(w.kind, 'questions')
  await assert.rejects(() => hostCommand(db, { nightId, command: 'settle-now', now: 0 }), /dry run/)
  await assert.rejects(() => hostCommand(db, { nightId, command: 'settle', now: 0 }), /still choosing/)
  await hostCommand(db, { nightId, command: 'dry-run' })
  const r = await hostCommand(db, { nightId, command: 'settle-now', now: 0 })
  assert.equal(r.settled, uids.length)
  assert.equal(db.store.get(`nights/${nightId}`).window.settled, true)
})
