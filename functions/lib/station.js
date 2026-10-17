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
    if (!together || apart.length < 2 || keys.length < 4) return groups // under four people there is only one way to group
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
  // no updatedAt here: that stamp means "the station itself reported in"
  await db.doc(studyPath(nightId)).set({ state: 'idle', groupId: studyOrder[0] }, { merge: true })
  return { ok: true, groups: groups.length, trios: groups.filter(g => g.members.length === 3).length }
}

// The clue the study pays out: one card, the same for every phone in the
// group. The text comes from the case when the generator has written one
// (cases/{nightId}.studyClue.text, read here with the Admin SDK and written
// only into each member's own session); in rehearsal it is a bracketed
// placeholder. The station never sees it either way.
export const STUDY_PLACEHOLDER = '(Rehearsal. The study pays its clue out to every phone in the group here, when the three jewels are lit or the fifteen minutes are up.)'

export function studyClueCard(c, act, beat) {
  // reads cases.studyClue only; the bracketed text appears only when the case is a rehearsal
  const real = c?.studyClue?.text
  const has = typeof real === 'string' && real.trim().length > 0
  return {
    id: `${act}-${beat}-study-clue`, act, beat, kind: 'clue', title: 'From the study',
    text: has ? real : STUDY_PLACEHOLDER,
    placeholder: !has || !!c?.rehearsal,
  }
}

// Add one card to a phone, once (the same rule as the dealer's).
async function dealOnce(db, uid, card) {
  const ref = db.doc(`sessions/${uid}`)
  const snap = await ref.get()
  if (!snap.exists) return false
  const cards = snap.data().cards ?? []
  if (cards.some(x => x.id === card.id)) return false
  await ref.update({ cards: [...cards, { ...card, at: new Date() }] })
  return true
}

// Has the study station reported in lately? (Within two minutes.)
export async function stationAlive(db, nightId, now = Date.now()) {
  const snap = await db.doc(studyPath(nightId)).get()
  if (!snap.exists) return false
  const at = snap.data().updatedAt
  const t = at?.toMillis?.() ?? (at instanceof Date ? at.getTime() : 0)
  return !!t && Math.abs(now - t) < 120_000
}

export async function dealStudy(db, { nightId, groupId, outcome }) {
  const [rotSnap, deckSnap, nightSnap, caseSnap] = await Promise.all([
    db.doc(rotationPath(nightId)).get(), db.doc(`nights/${nightId}/private/deck`).get(),
    db.doc(`nights/${nightId}`).get(), db.doc(`cases/${nightId}`).get(),
  ])
  const group = (rotSnap.data()?.groups ?? []).find(g => g.id === groupId)
  if (!group) throw new NightError('invalid', 'No such group.')
  const uids = deckSnap.data()?.uids ?? {}
  const night = nightSnap.exists ? nightSnap.data() : {}
  const c = caseSnap.exists ? caseSnap.data() : null
  let dealt = 0
  for (const m of group.members) {
    const uid = uids[m.key]
    if (!uid) continue
    const ref = db.doc(`sessions/${uid}`)
    const s = (await ref.get()).data()
    if (!s) continue
    // the study station card this phone was dealt says which act and beat it was
    const stationCard = (s.cards ?? []).filter(x => x.kind === 'station' && x.station === 'study').at(-1)
    const act = stationCard?.act ?? night.act ?? 4
    const beat = stationCard?.beat ?? night.beat ?? 'station'
    await ref.set({ dealt: { study: { at: FieldValue.serverTimestamp(), outcome, groupId } } }, { merge: true })
    if (await dealOnce(db, uid, studyClueCard(c, act, beat))) dealt++
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

// A group is done with the study, whether the station said so (solved or
// capped) or the house moved on without them (absent: the dealer pays them
// at the next rotation). The clue is dealt and the order moves on, once per
// group.
export async function finishStudy(db, { nightId, groupId, outcome = 'solved', seconds = null, pairs = null, reportedIn = false }) {
  if (!groupId) throw new NightError('invalid', 'Which group?')
  const now = FieldValue.serverTimestamp()
  const rotRef = db.doc(rotationPath(nightId))
  const rotSnap = await rotRef.get()
  if (!rotSnap.exists) throw new NightError('invalid', 'No groups yet. Make the groups on the Host tab first.')
  const rot = rotSnap.data()
  if (rot.finished?.[groupId]) return { ok: true, repeated: true }
  const dealt = await dealStudy(db, { nightId, groupId, outcome })
  const idx = rot.studyOrder.indexOf(groupId)
  const current = Math.max(rot.current ?? 0, idx + 1)
  const nextGroup = rot.studyOrder[current] ?? null
  await rotRef.update({
    [`finished.${groupId}`]: { outcome, seconds, pairs, at: now },
    current, rotatedAt: now,
  })
  // the station's own report points the study at the next group; an absent pay-out leaves the
  // study doc alone (the rotation sets it, and a game may be running in there)
  if (reportedIn) await db.doc(studyPath(nightId)).set({ state: 'idle', groupId: nextGroup, lastOutcome: outcome, updatedAt: now }, { merge: true })
  return { ok: true, dealt, nextGroup }
}

export async function stationCommand(db, { nightId, station = 'study', command, payload = {} } = {}) {
  if (station !== 'study') throw new NightError('invalid', 'Unknown station.')
  if (!nightId) throw new NightError('invalid', 'Which night?')
  const now = FieldValue.serverTimestamp()
  switch (command) {
    case 'state': {
      // Counts, words and the wall's layout. Whatever the station sends is
      // public to the phones, so the station never sends a clue. Which group
      // is due is the server's to say (the rotation and `finished` own it),
      // so the station's copy of it is dropped too.
      const clean = { ...payload }
      delete clean.clue
      delete clean.groupId
      await db.doc(studyPath(nightId)).set({ ...clean, updatedAt: now }, { merge: true })
      return { ok: true, serverTime: Date.now() }
    }
    case 'finished': {
      const { groupId, outcome = 'solved', seconds = null, pairs = null } = payload
      const r = await finishStudy(db, { nightId, groupId, outcome, seconds, pairs, reportedIn: true })
      return { ...r, serverTime: Date.now() }
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
