import { test } from 'node:test'
import assert from 'node:assert/strict'
import { houseView, studyNames, QUIET_MS, MACHINES } from '../src/lib/house.js'

// The Host tab's house panel, as a pure view over the public docs. Fixtures
// are throwaway shapes, never content.

const stamp = (t) => ({ toMillis: () => t })
const NOW = 10_000_000
const NIGHT = { act: 4, beat: 'station2', roster: { jon: { name: 'Jon' }, jessa: { name: 'Jessa' }, jacob: { name: 'Jacob' }, mari: { name: 'Mari' } } }
const ROTATION = {
  groups: [
    { id: 'g1', members: [{ key: 'jon', name: 'Jon', characterName: 'Professor Jonathan' }, { key: 'jessa', name: 'Jessa', characterName: 'Dorothy Rye' }] },
    { id: 'g2', members: [{ key: 'jacob', name: 'Jacob' }, { key: 'mari', name: 'Mari', characterName: 'Ignatius Fume' }] },
  ],
  studyOrder: ['g2', 'g1'], finished: {},
}

test('the study greets by character name, falling back to the guest name', () => {
  assert.equal(studyNames(ROTATION.groups[0]), 'Professor Jonathan, Dorothy Rye')
  assert.equal(studyNames(ROTATION.groups[1]), 'Jacob, Ignatius Fume')
  assert.equal(studyNames(null), null)
})

test('station and machine dots: alive within two minutes, quiet after, with how long', () => {
  const presence = { 'kiosk-living': NOW - 30_000, 'kiosk-bedroom': NOW - 3 * 60_000, cues: NOW - 59_000 }
  const v = houseView({ night: NIGHT, study: { state: 'idle', groupId: 'g2', updatedAt: stamp(NOW - 45_000) }, rotation: ROTATION, presence, now: NOW })
  assert.equal(v.station.alive, true)
  assert.equal(v.station.quietFor, '0:45')
  const by = Object.fromEntries(v.machines.map(m => [m.key, m.alive]))
  assert.deepEqual(by, { 'kiosk-living': true, 'kiosk-ipad': false, 'kiosk-bedroom': false, 'kiosk-study': false, cues: true })
  assert.equal(v.machines.length, MACHINES.length)
  const quiet = houseView({ night: NIGHT, study: { state: 'idle', groupId: 'g2', updatedAt: stamp(NOW - QUIET_MS - 1000) }, rotation: ROTATION, now: NOW })
  assert.equal(quiet.station.alive, false)
  assert.equal(quiet.station.quietFor, '2:01')
  assert.equal(houseView({ night: NIGHT, now: NOW }).station.quietFor, null, 'never heard from: no "since"')
})

test('the group due, its clock from the station\'s startedAt, and the twelve-minute slot when there is no station', () => {
  const running = houseView({ night: NIGHT, study: { state: 'reproducing', groupId: 'g2', startedAt: NOW - 4 * 60_000, updatedAt: stamp(NOW) }, rotation: ROTATION, now: NOW })
  assert.equal(running.study.names, 'Jacob, Ignatius Fume')
  assert.equal(running.study.running, true)
  assert.equal(running.study.clockLeft, '11:00')
  assert.equal(running.study.paid, false)
  const absent = houseView({ night: NIGHT, study: { state: 'absent', groupId: 'g1', slotEndsAt: stamp(NOW + 90_000) }, rotation: ROTATION, now: NOW })
  assert.equal(absent.study.clockLeft, '1:30')
  assert.equal(absent.station.alive, false)
  const idle = houseView({ night: NIGHT, study: { state: 'idle', groupId: 'g1' }, rotation: ROTATION, now: NOW })
  assert.equal(idle.study.clockLeft, null)
  assert.equal(houseView({ night: NIGHT, study: { state: 'idle', groupId: null }, rotation: ROTATION, now: NOW }).study, null)
})

test('the picker offers only unpaid groups that are not already due, and closes once the group due is paid', () => {
  const v = houseView({ night: NIGHT, study: { state: 'idle', groupId: 'g2' }, rotation: ROTATION, now: NOW })
  assert.deepEqual(v.groups.map(g => [g.id, g.due, g.paid]), [['g1', false, false], ['g2', true, false]])
  assert.equal(v.canReassign, true)
  const paid = houseView({ night: NIGHT, study: { state: 'idle', groupId: 'g2' }, rotation: { ...ROTATION, finished: { g2: { outcome: 'solved' } } }, now: NOW })
  assert.equal(paid.study.paid, true)
  assert.equal(paid.canReassign, false)
  const last = houseView({ night: NIGHT, study: { state: 'idle', groupId: 'g1' }, rotation: { ...ROTATION, finished: { g2: {} } }, now: NOW })
  assert.equal(last.canReassign, false, 'nobody else to name')
})

test('while a window is open the panel shows a count of answers and no per-guest liveness', () => {
  const open = { ...NIGHT, window: { id: 'q', kind: 'questions', opensAt: stamp(NOW - 10_000), closesAt: stamp(NOW + 50_000), settled: false, answered: 3 } }
  const presence = { jon: NOW, jessa: NOW, 'kiosk-living': NOW, cues: NOW }
  const v = houseView({ night: open, study: { state: 'idle', groupId: 'g2', updatedAt: stamp(NOW) }, rotation: ROTATION, presence, now: NOW })
  assert.equal(v.windowOpen, true)
  assert.equal(v.showGuests, false)
  assert.deepEqual(v.answered, { n: 3, of: 4 })
  assert.ok(!JSON.stringify(v).includes('"jon"'), 'no guest key appears anywhere in the view')
  // the machines are not guests: their dots stay
  assert.equal(v.machines.find(m => m.key === 'kiosk-living').alive, true)
  // closed by time, or settled: the dots come back
  const over = houseView({ night: open, now: NOW + 60_000 })
  assert.equal(over.showGuests, true)
  assert.equal(over.answered, null)
  const settled = houseView({ night: { ...open, window: { ...open.window, settled: true } }, now: NOW })
  assert.equal(settled.showGuests, true)
})

test('the iPad has its own row: an awake iPad never shows the living room TV as alive', () => {
  // the living room MacBook dies during Act 6 (it is the relay clock); the
  // wandering iPad is still awake. Its heartbeat is kiosk-ipad, so the TV's
  // dot goes quiet and the host can see it is gone.
  const presence = { 'kiosk-ipad': NOW, 'kiosk-living': NOW - 3 * 60_000 }
  const v = houseView({ night: NIGHT, study: null, rotation: ROTATION, presence, now: NOW })
  const by = Object.fromEntries(v.machines.map(m => [m.key, m.alive]))
  assert.equal(by['kiosk-ipad'], true)
  assert.equal(by['kiosk-living'], false)
  assert.ok(MACHINES.some(m => m.key === 'kiosk-ipad' && m.label), 'the iPad is a row of its own')
  assert.equal(new Set(MACHINES.map(m => m.key)).size, MACHINES.length, 'every machine key is unique')
})
