import { test } from 'node:test'
import assert from 'node:assert/strict'
import { FakeFirestore } from './fake-firestore.mjs'
import { createNight, join } from '../lib/night.js'
import { hostCommand, studyFinished } from '../lib/run.js'
import { stationCommand, reassignStudy, rotationPath, studyPath } from '../lib/station.js'
import { makeRooms, act4PrivatePath } from '../lib/act4.js'

const makeRotation = (db, { nightId }) => makeRooms(db, nightId)
import { NIGHT, beatsOf, ms } from '../lib/deal.js'

// The study in Act 4: the host's reassign, the groups made once, and the
// host's small buttons. Since 23 Oct 2026 the rounds are on the server's
// clock (act4.js), so the study no longer moves the house. Throwaway nights
// only; the rehearsal case the dealer makes is never printed.

async function party(n = 10) {
  const db = new FakeFirestore()
  db.store.set('meta/game', { host_jonathan: 'Jon', host_susan: 'Susan' })
  const { nightId } = await createNight(db)
  const names = ['Jon', 'Susan', 'Jessa', 'Jacob', 'Stanley', 'Jeanette', 'Matthew', 'Marie', 'René', 'Guest'].slice(0, n)
  const uids = {}
  for (const name of names) { const uid = `u-${name.toLowerCase()}`; await join(db, { uid, nightId, name }); uids[name.toLowerCase()] = uid }
  return { db, nightId, uids, names }
}
const night = (db, id) => db.store.get(`nights/${id}`)
const cards = (db, uid, kind) => (db.store.get(`sessions/${uid}`).cards ?? []).filter(c => !kind || c.kind === kind)
  // the study's own pay-out (the memory match pays a clue card too)
  .filter(c => kind !== 'clue' || c.id.endsWith('study-clue'))
const heartbeat = (db, nightId, now) => db.store.set(studyPath(nightId), { ...(db.store.get(studyPath(nightId)) ?? {}), updatedAt: new Date(now) })
const members = (db, nightId, gid) => db.store.get(rotationPath(nightId)).groups.find(g => g.id === gid).members.map(m => m.key)
// guest key → uid, as the dealer keeps it (a name with an accent gets a plain key)
const uidOf = (db, nightId, k) => db.store.get(`nights/${nightId}/private/deck`).uids[k]

// Act 4 straight away: Start Act 4, the group cards, the first round with the station alive.
async function intoAct4(db, nightId, t, { alive = true } = {}) {
  await hostCommand(db, { nightId, command: 'act', arg: 3, now: t.now })
  await hostCommand(db, { nightId, command: 'start-act4', now: t.now })
  await hostCommand(db, { nightId, command: 'next', now: t.now }) // the group cards
  if (alive) heartbeat(db, nightId, t.now)
  await hostCommand(db, { nightId, command: 'next', now: t.now }) // round 1
  assert.equal(night(db, nightId).beat, 'round1')
}

test('reassign: before the pay-out the host names the group in the study; the station\'s finish pays them; afterwards it is refused', async () => {
  const { db, nightId, uids } = await party(8)
  await makeRotation(db, { nightId })
  const rot = db.store.get(rotationPath(nightId))
  const [g1, g2, g3] = rot.order
  await db.doc(studyPath(nightId)).set({ groupId: g1 }, { merge: true }) // the round points the study at g1
  // the pointer is at g1; the host says g3 walked in
  const r = await reassignStudy(db, { nightId, groupId: g3 })
  assert.equal(r.groupId, g3)
  assert.equal(r.from, g1)
  assert.equal(db.store.get(studyPath(nightId)).groupId, g3)
  assert.equal(db.store.get(studyPath(nightId)).reassignedFrom, g1)
  // the station still reports the group it was first told about
  const fin = await stationCommand(db, { nightId, command: 'finished', payload: { groupId: g1, outcome: 'solved', seconds: 240, pairs: 3 } })
  assert.equal(fin.groupId, g3)
  assert.equal(fin.reassigned, true)
  const after = db.store.get(rotationPath(nightId))
  assert.ok(after.finished[g3])
  assert.ok(!after.finished[g1], 'the group that was due is not marked paid')
  for (const k of members(db, nightId, g3)) assert.equal(cards(db, uidOf(db, nightId, k), 'clue').length, 1, 'the picked group holds the clue')
  for (const k of members(db, nightId, g1)) assert.equal(cards(db, uidOf(db, nightId, k), 'clue').length, 0)
  assert.equal(db.store.get(studyPath(nightId)).reassignedFrom, null)
  // after the pay-out: refused, and a paid group can never be the target
  await assert.rejects(reassignStudy(db, { nightId, groupId: g2 }), /already been paid/)
  await assert.rejects(reassignStudy(db, { nightId, groupId: g3 }), /already been paid/)
  await assert.rejects(reassignStudy(db, { nightId, groupId: 'nope' }), /No such group/)
})

test('a reassigned finish pays the group the host named, never moves the house, and the Host commands reach the same code', async () => {
  const { db, nightId } = await party(8)
  const t = { now: 9_000_000 }
  await intoAct4(db, nightId, t)
  const due = db.store.get(studyPath(nightId)).groupId ?? db.store.get(rotationPath(nightId)).order[0]
  await db.doc(studyPath(nightId)).set({ groupId: due }, { merge: true })
  const other = db.store.get(rotationPath(nightId)).order.find(g => g !== due)
  const re = await hostCommand(db, { nightId, command: 'study-reassign', arg: other, now: t.now })
  assert.equal(re.groupId, other)
  heartbeat(db, nightId, t.now)
  const r = await studyFinished(db, { nightId, payload: { groupId: due, outcome: 'solved' }, now: t.now })
  assert.equal(r.groupId, other)
  assert.equal(r.rotated, false, 'the rounds are on the clock: a finish never moves the house')
  assert.equal(night(db, nightId).beat, 'round1')
  assert.ok(db.store.get(act4PrivatePath(nightId)).paid[`${other}-study`], 'the group the host named is paid the room')
  assert.equal(db.store.get(studyPath(nightId)).reassignedFrom, null)
  // the host pays the group due without waiting for the station
  await db.doc(studyPath(nightId)).set({ groupId: due }, { merge: true })
  const f = await hostCommand(db, { nightId, command: 'study-finish', now: t.now })
  assert.equal(f.groupId, due)
  assert.equal(db.store.get(rotationPath(nightId)).finished[due].outcome, 'absent')
})

test('groups are set once made: the Host button answers already unless forced', async () => {
  const { db, nightId, uids } = await party(6)
  const t = { now: 10_000_000 }
  await intoAct4(db, nightId, t)
  const before = db.store.get(rotationPath(nightId))
  const groupsBefore = Object.fromEntries(Object.values(uids).map(u => [u, db.store.get(`sessions/${u}`).group]))
  const r = await hostCommand(db, { nightId, command: 'groups', now: t.now })
  assert.equal(r.already, true)
  assert.deepEqual(db.store.get(rotationPath(nightId)), before, 'the groups and their walk are untouched')
  // the same mis-step through the beats: Back into the group cards, then Next again
  await hostCommand(db, { nightId, command: 'back', now: t.now })
  assert.equal(night(db, nightId).beat, 'groups')
  await hostCommand(db, { nightId, command: 'next', now: t.now })
  assert.equal(night(db, nightId).beat, 'round1')
  assert.deepEqual(db.store.get(rotationPath(nightId)), before, 'the beat re-run keeps the groups too')
  for (const u of Object.values(uids)) assert.equal(db.store.get(`sessions/${u}`).group, groupsBefore[u], 'every phone keeps its group')
  const forced = await hostCommand(db, { nightId, command: 'groups', arg: 'force', now: t.now })
  assert.equal(forced.ok, true)
  assert.equal(forced.already, undefined)
})

test('the hall light by hand, and the answered count on an open window names nobody', async () => {
  const { db, nightId, uids } = await party(4)
  const t = { now: 11_000_000 }
  await hostCommand(db, { nightId, command: 'act', arg: 2, now: t.now })
  const r = await hostCommand(db, { nightId, command: 'hall', arg: 'green', now: t.now })
  assert.equal(r.hall, 'green')
  assert.equal(db.store.get(`nights/${nightId}/public/cues`).hall, 'green')
  await assert.rejects(hostCommand(db, { nightId, command: 'hall', arg: 'blue', now: t.now }), /red or green/)
  await hostCommand(db, { nightId, command: 'light-up', now: t.now })
  const w = night(db, nightId).window
  assert.equal(w.answered ?? 0, 0)
  const { player } = await import('../lib/run.js')
  const uid = uids.jessa
  const set = db.store.get(`sessions/${uid}`).windows[w.id]
  await player.answer(db, { nightId, uid, windowId: w.id, picks: set.beats.map(b => b.choices[0].k), now: t.now })
  assert.equal(night(db, nightId).window.answered, 1)
  assert.ok(!JSON.stringify(night(db, nightId).window).includes('jessa'), 'a count, never who')
})
