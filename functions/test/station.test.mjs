import { test } from 'node:test'
import assert from 'node:assert/strict'
import { FakeFirestore } from './fake-firestore.mjs'
import { createNight, join } from '../lib/night.js'
import { makeGroups, makeRotation, stationCommand, stationAllowed, setStationKey, rotationPath, studyPath } from '../lib/station.js'

async function party(n) {
  const db = new FakeFirestore()
  db.store.set('meta/game', { host_jonathan: 'Jon', host_susan: 'Susan' })
  const { nightId } = await createNight(db)
  const names = ['Jon', 'Susan', 'Jessa', 'Jacob', 'Stanley', 'Jeanette', 'Matthew', 'Marie', 'René', 'Guest'].slice(0, n)
  for (const name of names) await join(db, { uid: `u-${name.toLowerCase()}`, nightId, name })
  return { db, nightId, names }
}

test('makeGroups: pairs, one trio when odd, and the hidden roles are kept apart', () => {
  const keys = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i']
  for (let t = 0; t < 100; t++) {
    const groups = makeGroups(keys, { apart: ['a', 'b'] })
    assert.equal(groups.flat().length, 9)
    assert.equal(groups.length, 4)
    assert.equal(groups.filter(g => g.length === 3).length, 1)
    assert.ok(!groups.some(g => g.includes('a') && g.includes('b')))
  }
  const even = makeGroups(['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'])
  assert.equal(even.length, 4)
  assert.ok(even.every(g => g.length === 2))
  assert.throws(() => makeGroups(['a']), e => e.code === 'invalid')
})

test('makeRotation writes groups with names, a study order, and points the study at the first group', async () => {
  const { db, nightId } = await party(9)
  const r = await makeRotation(db, { nightId })
  assert.equal(r.groups, 4)
  assert.equal(r.trios, 1)
  const rot = db.store.get(rotationPath(nightId))
  assert.equal(rot.studyOrder.length, 4)
  assert.deepEqual([...rot.studyOrder].sort(), rot.groups.map(g => g.id).sort())
  assert.ok(rot.groups.every(g => g.members.every(m => m.name && m.key)))
  assert.equal(rot.current, 0)
  assert.equal(db.store.get(studyPath(nightId)).groupId, rot.studyOrder[0])
})

test('the station key: refused without one, allowed with the host-set key or the admin', async () => {
  const { db } = await party(2)
  assert.equal(await stationAllowed(db, { key: 'anything' }), false)
  await assert.rejects(setStationKey(db, 'abc'), e => e.code === 'invalid')
  await setStationKey(db, ' study-2026 ')
  assert.equal(await stationAllowed(db, { key: 'study-2026' }), true)
  assert.equal(await stationAllowed(db, { key: 'wrong' }), false)
  assert.equal(await stationAllowed(db, { key: null, isAdmin: true }), true)
})

test('state: counts and words land on the public study doc; a clue field is dropped', async () => {
  const { db, nightId } = await party(4)
  await makeRotation(db, { nightId })
  const due = db.store.get(studyPath(nightId)).groupId
  const r = await stationCommand(db, { nightId, command: 'state', payload: { state: 'playing', round: 1, pairsLocked: 0, clue: 'never', groupId: 'stale' } })
  assert.ok(r.serverTime > 0)
  const s = db.store.get(studyPath(nightId))
  assert.equal(s.state, 'playing')
  assert.equal(s.round, 1)
  assert.ok(!('clue' in s))
  assert.equal(s.groupId, due, 'the station cannot move the pointer at the next group')
})

test('finished: deals to every phone in the group, advances the study order, and repeats harmlessly', async () => {
  const { db, nightId } = await party(5)
  await makeRotation(db, { nightId })
  const rot = db.store.get(rotationPath(nightId))
  const first = rot.studyOrder[0]
  const group = rot.groups.find(g => g.id === first)
  const r = await stationCommand(db, { nightId, command: 'finished', payload: { groupId: first, outcome: 'solved', seconds: 301, pairs: 3 } })
  assert.equal(r.dealt, group.members.length)
  assert.equal(r.nextGroup, rot.studyOrder[1])
  for (const m of group.members) {
    const s = db.store.get(`sessions/u-${m.key}`)
    assert.equal(s.dealt.study.outcome, 'solved')
    assert.equal(s.dealt.study.groupId, first)
  }
  const after = db.store.get(rotationPath(nightId))
  assert.equal(after.current, 1)
  assert.equal(after.finished[first].seconds, 301)
  assert.equal(db.store.get(studyPath(nightId)).groupId, rot.studyOrder[1])
  assert.equal(db.store.get(studyPath(nightId)).state, 'idle')
  const again = await stationCommand(db, { nightId, command: 'finished', payload: { groupId: first } })
  assert.equal(again.repeated, true)
  assert.equal(db.store.get(rotationPath(nightId)).current, 1)
  // the last group finishing leaves no next group
  for (const id of rot.studyOrder.slice(1)) await stationCommand(db, { nightId, command: 'finished', payload: { groupId: id, outcome: 'capped' } })
  assert.equal(db.store.get(studyPath(nightId)).groupId, null)
  assert.equal(db.store.get(rotationPath(nightId)).current, rot.studyOrder.length)
})

test('finished before the groups exist is refused in words', async () => {
  const { db, nightId } = await party(3)
  await assert.rejects(stationCommand(db, { nightId, command: 'finished', payload: { groupId: 'g1' } }), e => e.code === 'invalid')
  await assert.rejects(stationCommand(db, { nightId, command: 'nonsense' }), e => e.code === 'invalid')
})
