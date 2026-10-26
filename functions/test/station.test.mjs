import { test } from 'node:test'
import assert from 'node:assert/strict'
import { FakeFirestore } from './fake-firestore.mjs'
import { createNight, join } from '../lib/night.js'
import { makeGroups, stationCommand, stationAllowed, setStationKey, rotationPath, studyPath } from '../lib/station.js'
import { makeRooms } from '../lib/act4.js'

const makeRotation = (db, { nightId }) => makeRooms(db, nightId)

async function party(n) {
  const db = new FakeFirestore()
  db.store.set('meta/game', { host_jonathan: 'Jon', host_susan: 'Susan' })
  const { nightId } = await createNight(db)
  const names = ['Jon', 'Susan', 'Jessa', 'Jacob', 'Stanley', 'Jeanette', 'Matthew', 'Marie', 'René', 'Guest'].slice(0, n)
  for (const name of names) await join(db, { uid: `u-${name.toLowerCase()}`, nightId, name })
  return { db, nightId, names }
}

test('G20 and G21 makeGroups: pairs and trios, at most five groups, spread evenly, and the hidden roles are kept apart', () => {
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
  for (const n of [10, 11, 12, 13, 15]) {
    const big = makeGroups(Array.from({ length: n }, (_, i) => `k${i}`))
    assert.equal(big.length, 5, `${n} guests: five groups at most (four rooms and the Parlour)`)
    assert.ok(big.every(g => g.length === Math.floor(n / 5) || g.length === Math.ceil(n / 5)), `${n} guests: spread evenly`)
  }
  assert.throws(() => makeGroups(['a']), e => e.code === 'invalid')
})

test('the Act 4 rooms: groups with names and portraits, the walk round the rooms, and who is due in the study each round', async () => {
  const { db, nightId } = await party(9)
  const r = await makeRotation(db, { nightId })
  assert.equal(r.groups, 4)
  assert.equal(r.trios, 1)
  assert.equal(r.rounds, 4)
  const rot = db.store.get(rotationPath(nightId))
  assert.equal(rot.studyOrder.length, 4)
  assert.deepEqual([...rot.studyOrder].filter(Boolean).sort(), rot.groups.map(g => g.id).sort(), 'with four groups each one is due in the study once')
  assert.ok(rot.groups.every(g => g.members.every(m => m.name && m.key && m.characterId)))
  assert.equal((await makeRotation(db, { nightId })).already, true, 'made once')
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
  await db.doc(studyPath(nightId)).set({ groupId: 'g1' }, { merge: true })
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
  const due = rot.studyOrder.filter(Boolean)
  const first = due[0]
  const group = rot.groups.find(g => g.id === first)
  const r = await stationCommand(db, { nightId, command: 'finished', payload: { groupId: first, outcome: 'solved', seconds: 301, pairs: 3 } })
  assert.equal(r.dealt, group.members.length)
  for (const m of group.members) {
    const s = db.store.get(`sessions/u-${m.key}`)
    assert.equal(s.dealt.study.outcome, 'solved')
    assert.equal(s.dealt.study.groupId, first)
  }
  const after = db.store.get(rotationPath(nightId))
  assert.equal(after.finished[first].seconds, 301)
  // the pointer at the group due is the round's to move (act4.startRound), never the station's report
  assert.equal(db.store.get(studyPath(nightId)).state, 'idle')
  const again = await stationCommand(db, { nightId, command: 'finished', payload: { groupId: first } })
  assert.equal(again.repeated, true)
  for (const id of due.slice(1)) await stationCommand(db, { nightId, command: 'finished', payload: { groupId: id, outcome: 'capped' } })
  assert.equal(Object.keys(db.store.get(rotationPath(nightId)).finished).length, due.length)
})

test('state: only the words the study knows; the server\'s own fields never come from the station', async () => {
  const { db, nightId } = await party(4)
  await makeRotation(db, { nightId })
  await assert.rejects(stationCommand(db, { nightId, command: 'state', payload: { state: 'absent' } }), e => e.code === 'invalid')
  await assert.rejects(stationCommand(db, { nightId, command: 'state', payload: { state: 'winning' } }), e => e.code === 'invalid')
  await stationCommand(db, { nightId, command: 'state', payload: { state: 'entering', slotEndsAt: 5, reassignedFrom: 'g9', settings: { capMs: 1 } } })
  const s = db.store.get(studyPath(nightId))
  assert.equal(s.state, 'entering')
  assert.ok(!('slotEndsAt' in s) && !('reassignedFrom' in s) && !('settings' in s))
})

test('finished before the groups exist is refused in words', async () => {
  const { db, nightId } = await party(3)
  await assert.rejects(stationCommand(db, { nightId, command: 'finished', payload: { groupId: 'g1' } }), e => e.code === 'invalid')
  await assert.rejects(stationCommand(db, { nightId, command: 'nonsense' }), e => e.code === 'invalid')
})
