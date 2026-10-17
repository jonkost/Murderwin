import { test } from 'node:test'
import assert from 'node:assert/strict'
import { FakeFirestore } from './fake-firestore.mjs'
import { createNight, join } from '../lib/night.js'
import { hostCommand, studyFinished } from '../lib/run.js'
import { stationCommand, reassignStudy, tickStudy, makeRotation, rotationPath, studyPath, ABSENT_SLOT_MS, STATION_QUIET_MS } from '../lib/station.js'
import { NIGHT, beatsOf, ms } from '../lib/deal.js'

// The study as the clock of Act 4, with and without a station in the room.
// Throwaway nights only; the rehearsal case the dealer makes is never printed.

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
const heartbeat = (db, nightId, now) => db.store.set(studyPath(nightId), { ...(db.store.get(studyPath(nightId)) ?? {}), updatedAt: new Date(now) })
const members = (db, nightId, gid) => db.store.get(rotationPath(nightId)).groups.find(g => g.id === gid).members.map(m => m.key)
// guest key → uid, as the dealer keeps it (a name with an accent gets a plain key)
const uidOf = (db, nightId, k) => db.store.get(`nights/${nightId}/private/deck`).uids[k]

// Act 4 straight away: the act button builds the case, the groups and the first rotation.
async function intoAct4(db, nightId, t, { alive = true } = {}) {
  await hostCommand(db, { nightId, command: 'act', arg: 2, now: t.now })
  await hostCommand(db, { nightId, command: 'groups', now: t.now })
  if (alive) heartbeat(db, nightId, t.now)
  await hostCommand(db, { nightId, command: 'act', arg: 4, now: t.now })
  assert.equal(night(db, nightId).beat, 'station1')
  assert.equal(night(db, nightId).rotation, 0)
}

test('the study is the clock at every slot: five groups, five finishes, five rotations, two Parlour Games, no Next', async () => {
  const { db, nightId, uids } = await party(10)
  const t = { now: 5_000_000 }
  await intoAct4(db, nightId, t)
  const rot = db.store.get(rotationPath(nightId))
  assert.equal(rot.studyOrder.length, 5)
  let windows = 0
  const beatsSeen = ['station1']
  for (let r = 0; r < 5; r++) {
    heartbeat(db, nightId, t.now)
    const gid = rot.studyOrder[r]
    assert.equal(db.store.get(studyPath(nightId)).groupId, gid, `rotation ${r}: the study points at the group due`)
    const res = await studyFinished(db, { nightId, payload: { groupId: gid, outcome: r % 2 ? 'capped' : 'solved', seconds: 200 + r, pairs: 3 }, now: t.now })
    assert.ok(!res.repeated)
    for (const k of members(db, nightId, gid)) assert.equal(cards(db, uidOf(db, nightId, k), 'clue').length, 1, 'the group holds its clue, once')
    if (r < 4) {
      assert.equal(res.rotated, true, `finish ${r} moved the house`)
      assert.equal(night(db, nightId).rotation, r + 1)
      if (res.window) {
        windows++
        const w = night(db, nightId).window
        assert.equal(w.kind, 'questions')
        assert.equal(w.settled, false)
        t.now = ms(w.closesAt) + 1 // the next study takes longer than a Parlour Game
      }
      beatsSeen.push(night(db, nightId).beat)
    } else {
      assert.equal(res.rotated, false, 'the fifth station is the last: Act 5 is the host\'s to call')
    }
    t.now += 60_000
  }
  assert.equal(windows, 2, 'exactly two Parlour Games, one after station2 and one after station4')
  assert.deepEqual(beatsSeen, ['station1', 'station2', 'station3', 'station4', 'station5'])
  assert.equal(Object.keys(db.store.get(rotationPath(nightId)).finished).length, 5, 'every group was paid by its own finish')
  for (const uid of Object.values(uids)) {
    assert.equal(cards(db, uid, 'station').length, 5, 'every phone visited five stations')
    assert.equal(cards(db, uid, 'clue').length, 1)
  }
})

test('with autoAfterStudy off a finish moves one beat only, and the host\'s Next does the rest', async () => {
  const beats = beatsOf(4)
  const q1 = beats.find(b => b.key === 'questions1')
  const was = q1.autoAfterStudy
  q1.autoAfterStudy = false
  try {
    const { db, nightId } = await party(6)
    const t = { now: 6_000_000 }
    await intoAct4(db, nightId, t)
    const rot = db.store.get(rotationPath(nightId))
    heartbeat(db, nightId, t.now)
    await studyFinished(db, { nightId, payload: { groupId: rot.studyOrder[0] }, now: t.now })
    assert.equal(night(db, nightId).beat, 'station2')
    heartbeat(db, nightId, t.now)
    const r = await studyFinished(db, { nightId, payload: { groupId: rot.studyOrder[1] }, now: t.now })
    assert.equal(r.rotated, true)
    assert.equal(r.window, undefined)
    assert.equal(night(db, nightId).beat, 'questions1', 'the old behaviour: the window opens and the house waits for Next')
    assert.equal(night(db, nightId).rotation, 1)
    t.now = ms(night(db, nightId).window.closesAt) + 1
    await hostCommand(db, { nightId, command: 'next', now: t.now })
    assert.equal(night(db, nightId).beat, 'station3')
    assert.equal(night(db, nightId).rotation, 2)
  } finally {
    q1.autoAfterStudy = was
  }
  assert.equal(NIGHT.acts['4'].beats.find(b => b.key === 'questions1').autoAfterStudy, true, 'the seed ships with the flag on')
})

test('no station: the rotation writes a twelve-minute slot, and tickStudy ends it once with outcome absent', async () => {
  const { db, nightId, uids } = await party(6)
  const t = { now: 7_000_000 }
  await intoAct4(db, nightId, t, { alive: false })
  const rot = db.store.get(rotationPath(nightId))
  const first = rot.studyOrder[0]
  const study = db.store.get(studyPath(nightId))
  assert.equal(study.state, 'absent')
  assert.equal(study.groupId, first)
  assert.equal(ms(study.slotEndsAt), t.now + ABSENT_SLOT_MS)
  for (const k of members(db, nightId, first)) assert.equal(cards(db, uidOf(db, nightId, k), 'clue').length, 1, 'with no station the clue rides with the station card')
  const tick = (now) => hostCommand(db, { nightId, command: 'study-tick', now })
  // five minutes in: nothing
  let r = await tick(t.now + 5 * 60_000)
  assert.equal(r.ticked, false)
  assert.equal(r.reason, 'slot-open')
  assert.equal(night(db, nightId).rotation, 0)
  // twelve minutes in: the group is paid as absent and the house rotates
  t.now += ABSENT_SLOT_MS
  r = await tick(t.now)
  assert.equal(r.ticked, true)
  assert.equal(r.rotated, true)
  assert.equal(db.store.get(rotationPath(nightId)).finished[first].outcome, 'absent')
  assert.equal(night(db, nightId).rotation, 1)
  assert.equal(night(db, nightId).beat, 'station2')
  for (const k of members(db, nightId, first)) assert.equal(cards(db, uidOf(db, nightId, k), 'clue').length, 1, 'still one clue card')
  // the next slot is written for the next group; a second tick right away does nothing
  const next = db.store.get(studyPath(nightId))
  assert.equal(next.groupId, rot.studyOrder[1])
  assert.equal(next.state, 'absent')
  assert.equal(ms(next.slotEndsAt), t.now + ABSENT_SLOT_MS)
  r = await tick(t.now + 1000)
  assert.equal(r.ticked, false)
  assert.equal(Object.keys(db.store.get(rotationPath(nightId)).finished).length, 1, 'exactly once across two ticks')
  // a station that comes back stops the clock
  heartbeat(db, nightId, t.now + ABSENT_SLOT_MS)
  r = await tick(t.now + ABSENT_SLOT_MS)
  assert.equal(r.ticked, false)
  assert.equal(r.reason, 'station-alive')
  assert.equal(night(db, nightId).rotation, 1)
})

test('tickStudy with a live heartbeat does nothing; a station that died mid-act is timed from the beat', async () => {
  const { db, nightId } = await party(6)
  const t = { now: 8_000_000 }
  await intoAct4(db, nightId, t)
  const study = db.store.get(studyPath(nightId))
  assert.equal(study.state, 'idle')
  assert.equal(study.slotEndsAt, null, 'a live station gets no slot')
  db.store.set(`nights/${nightId}`, { ...night(db, nightId), beatAt: new Date(t.now) })
  let r = await tickStudy(db, nightId, t.now + 60_000)
  assert.equal(r.ticked, false)
  assert.equal(r.reason, 'station-alive')
  // the station goes quiet: twelve minutes from the beat, the slot ends
  r = await tickStudy(db, nightId, t.now + ABSENT_SLOT_MS - 1)
  assert.equal(r.reason, 'slot-open')
  r = await hostCommand(db, { nightId, command: 'study-tick', now: t.now + ABSENT_SLOT_MS })
  assert.equal(r.ticked, true)
  assert.equal(night(db, nightId).rotation, 1)
  assert.ok(STATION_QUIET_MS < ABSENT_SLOT_MS)
})

test('reassign: before the pay-out the host names the group in the study; the station\'s finish pays them; afterwards it is refused', async () => {
  const { db, nightId, uids } = await party(8)
  await makeRotation(db, { nightId })
  const rot = db.store.get(rotationPath(nightId))
  const [g1, g2, g3] = rot.studyOrder
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
  assert.equal(after.current, 1, 'the slot that was due is spent, no more')
  assert.equal(db.store.get(studyPath(nightId)).reassignedFrom, null)
  // after the pay-out: refused, and a paid group can never be the target
  await assert.rejects(reassignStudy(db, { nightId, groupId: g2 }), /already been paid/)
  await assert.rejects(reassignStudy(db, { nightId, groupId: g3 }), /already been paid/)
  await assert.rejects(reassignStudy(db, { nightId, groupId: 'nope' }), /No such group/)
})

test('a reassigned finish still rotates the house, and the Host commands reach the same code', async () => {
  const { db, nightId } = await party(8)
  const t = { now: 9_000_000 }
  await intoAct4(db, nightId, t)
  const rot = db.store.get(rotationPath(nightId))
  const [g1, , g3] = rot.studyOrder
  const re = await hostCommand(db, { nightId, command: 'study-reassign', arg: g3, now: t.now })
  assert.equal(re.groupId, g3)
  heartbeat(db, nightId, t.now)
  const r = await studyFinished(db, { nightId, payload: { groupId: g1, outcome: 'solved' }, now: t.now })
  assert.equal(r.groupId, g3)
  assert.equal(r.rotated, true)
  assert.equal(night(db, nightId).rotation, 1)
  assert.equal(db.store.get(studyPath(nightId)).groupId, rot.studyOrder[1], 'the rotation points the study at the next slot')
  assert.equal(db.store.get(studyPath(nightId)).reassignedFrom, null)
  // the host moves the house on without waiting: the group due is paid as absent
  heartbeat(db, nightId, t.now)
  const f = await hostCommand(db, { nightId, command: 'study-finish', now: t.now })
  assert.equal(f.groupId, rot.studyOrder[1])
  assert.equal(f.rotated, true)
  assert.equal(db.store.get(rotationPath(nightId)).finished[rot.studyOrder[1]].outcome, 'absent')
  assert.equal(night(db, nightId).rotation, 2)
})

test('groups are set once the house rotates: the Host button answers already unless forced', async () => {
  const { db, nightId } = await party(6)
  const t = { now: 10_000_000 }
  await intoAct4(db, nightId, t)
  const before = db.store.get(rotationPath(nightId))
  const r = await hostCommand(db, { nightId, command: 'groups', now: t.now })
  assert.equal(r.already, true)
  assert.deepEqual(db.store.get(rotationPath(nightId)).studyOrder, before.studyOrder)
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
