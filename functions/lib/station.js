// The study station's side of the server, and the Act 4 rotation.
// docs/study-light-game.md §5 and the technical section.
//
// The station (station/station.mjs on the M1 Air) signs in anonymously like
// a phone and calls `stationCommand` with a key the host set. It sends counts
// and words — never a clue. When a group finishes, THIS file deals the clue:
// the station only says "group G is done".
//
// SEAL RULE: nothing here reads sealed/* or cases/* yet. `dealStudy` is the
// one hook that will, once the case generator exists; it is written so the
// payload goes straight into each member's session doc and nowhere else.

import { randomInt } from 'node:crypto'
import { FieldValue } from 'firebase-admin/firestore'
import { NightError } from './night.js'

export function rotationPath(nightId) { return `nights/${nightId}/public/rotation` }
export function studyPath(nightId) { return `nights/${nightId}/public/study` }

function shuffled(list, pickInt = randomInt) {
  const a = [...list]
  for (let i = a.length - 1; i > 0; i--) { const j = pickInt(i + 1); [a[i], a[j]] = [a[j], a[i]] }
  return a
}

// Groups of two, trios where the headcount is odd (a trio is legal, not an
// error). The Ghost and the Murderer are never in the same group: `apart`
// lists guest keys that must be split, supplied by the case once it exists.
export function makeGroups(keys, { apart = [], pickInt = randomInt } = {}) {
  if (keys.length < 2) throw new NightError('invalid', 'Groups need at least two people.')
  for (let attempt = 0; attempt < 50; attempt++) {
    const order = shuffled(keys, pickInt)
    const groups = []
    let i = 0
    const count = Math.floor(order.length / 2)
    const trios = order.length - count * 2 // 0 or 1
    for (let g = 0; g < count; g++) {
      const size = g === 0 && trios ? 3 : 2
      groups.push(order.slice(i, i + size)); i += size
    }
    const together = groups.some(g => apart.filter(k => g.includes(k)).length >= 2)
    if (!together || apart.length < 2) return groups
  }
  throw new NightError('invalid', 'Could not split the hidden roles apart.')
}

// Host button: make the Act 4 groups and the study order.
export async function makeRotation(db, { nightId, apart = [], pickInt = randomInt } = {}) {
  const snap = await db.doc(`nights/${nightId}`).get()
  if (!snap.exists) throw new NightError('no-night', 'No such night.')
  const roster = snap.data().roster ?? {}
  const keys = Object.keys(roster)
  const groups = makeGroups(keys, { apart, pickInt }).map((members, i) => ({
    id: `g${i + 1}`,
    members: members.map(k => ({ key: k, name: roster[k].name })),
  }))
  const studyOrder = shuffled(groups.map(g => g.id), pickInt)
  await db.doc(rotationPath(nightId)).set({
    groups, studyOrder, current: 0, finished: {}, madeAt: FieldValue.serverTimestamp(), rotatedAt: null,
  })
  await db.doc(studyPath(nightId)).set({ state: 'idle', groupId: studyOrder[0], updatedAt: FieldValue.serverTimestamp() }, { merge: true })
  return { ok: true, groups: groups.length, trios: groups.filter(g => g.members.length === 3).length }
}

// The clue the study pays out. Until the case generator exists this writes
// the fact of the pay-out and nothing else; the generator will fill `clue`
// from sealed content server-side, per member, never through the station.
export async function dealStudy(db, { nightId, groupId, outcome }) {
  const [rotSnap, deckSnap] = await Promise.all([db.doc(rotationPath(nightId)).get(), db.doc(`nights/${nightId}/private/deck`).get()])
  const group = (rotSnap.data()?.groups ?? []).find(g => g.id === groupId)
  if (!group) throw new NightError('invalid', 'No such group.')
  const uids = deckSnap.data()?.uids ?? {}
  let dealt = 0
  for (const m of group.members) {
    const uid = uids[m.key]
    if (!uid) continue
    await db.doc(`sessions/${uid}`).set({
      dealt: { study: { at: FieldValue.serverTimestamp(), outcome, groupId } },
    }, { merge: true })
    dealt++
  }
  return dealt
}

// Is this caller the station? The key the host typed, or the admin.
export async function stationAllowed(db, { key, isAdmin = false } = {}) {
  if (isAdmin) return true
  const snap = await db.doc('meta/game').get()
  const want = String(snap.exists ? snap.data().station_key ?? '' : '').trim()
  return !!want && want.length >= 4 && String(key ?? '').trim() === want
}

export async function stationCommand(db, { nightId, station = 'study', command, payload = {} } = {}) {
  if (station !== 'study') throw new NightError('invalid', 'Unknown station.')
  if (!nightId) throw new NightError('invalid', 'Which night?')
  const now = FieldValue.serverTimestamp()
  switch (command) {
    case 'state': {
      // Counts, words and the wall's layout. Whatever the station sends is
      // public to the phones, so the station never sends a clue.
      const clean = { ...payload }
      delete clean.clue
      await db.doc(studyPath(nightId)).set({ ...clean, updatedAt: now }, { merge: true })
      return { ok: true, serverTime: Date.now() }
    }
    case 'finished': {
      const { groupId, outcome = 'solved', seconds = null, pairs = null } = payload
      if (!groupId) throw new NightError('invalid', 'Which group?')
      const rotRef = db.doc(rotationPath(nightId))
      const rotSnap = await rotRef.get()
      if (!rotSnap.exists) throw new NightError('invalid', 'No groups yet. Make the groups on the Host tab first.')
      const rot = rotSnap.data()
      if (rot.finished?.[groupId]) return { ok: true, repeated: true, serverTime: Date.now() }
      const dealt = await dealStudy(db, { nightId, groupId, outcome })
      const idx = rot.studyOrder.indexOf(groupId)
      const current = Math.max(rot.current ?? 0, idx + 1)
      const nextGroup = rot.studyOrder[current] ?? null
      await rotRef.update({
        [`finished.${groupId}`]: { outcome, seconds, pairs, at: now },
        current, rotatedAt: now,
      })
      await db.doc(studyPath(nightId)).set({ state: 'idle', groupId: nextGroup, lastOutcome: outcome, updatedAt: now }, { merge: true })
      return { ok: true, dealt, nextGroup, serverTime: Date.now() }
    }
    case 'ping':
      return { ok: true, serverTime: Date.now() }
    default:
      throw new NightError('invalid', `Unknown station command: ${command}`)
  }
}

// Host button: set the key the station must present.
export async function setStationKey(db, key) {
  const clean = String(key ?? '').trim()
  if (clean.length < 4) throw new NightError('invalid', 'A station key needs at least four characters.')
  await db.doc('meta/game').set({ station_key: clean }, { merge: true })
  return { ok: true }
}
