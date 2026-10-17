// Discarding a rehearsal night: everything the night wrote, gone, so a dry
// run never leaves a throwaway case behind (CLAUDE.md, enforcement 7).
//
// Deletes cases/{nightId}, nights/{nightId} with its public and private
// subcollections, every session, presence row and note branch for that night,
// and clears public_state/active if it pointed here.
//
// It REFUSES when the case is real: cases.rehearsal === false and the night is
// not marked dryRun. A real night's case is never deleted by a button.
//
// SEAL RULE: this file reads cases/{nightId} only to check `rehearsal`; it
// returns counts and never anything from the case.

import { FieldValue } from 'firebase-admin/firestore'
import { NightError } from './night.js'

const BATCH = 400

async function deleteRefs(db, refs) {
  let n = 0
  for (let i = 0; i < refs.length; i += BATCH) {
    const batch = db.batch()
    for (const ref of refs.slice(i, i + BATCH)) { batch.delete(ref); n++ }
    await batch.commit()
  }
  return n
}

async function docsWhere(db, collection, field, value) {
  const snap = await db.collection(collection).where(field, '==', value).get()
  return snap.docs ?? []
}

// May this night be discarded? The rule, in one place, so the Host tab, the
// terminal and the fake players all get the same answer.
export function discardable({ night, c }) {
  if (!night) return { ok: true, reason: 'no-night' }
  if (night.dryRun === true) return { ok: true, reason: 'dry-run' }
  if (!c) return { ok: true, reason: 'no-case' }
  if (c.rehearsal === false) return { ok: false, reason: 'real-case' }
  return { ok: true, reason: 'rehearsal' }
}

export async function discardNight(db, { nightId } = {}) {
  if (!nightId) throw new NightError('invalid', 'Which night?')
  const nightRef = db.doc(`nights/${nightId}`)
  const caseRef = db.doc(`cases/${nightId}`)
  const [nightSnap, caseSnap] = await Promise.all([nightRef.get(), caseRef.get()])
  const night = nightSnap.exists ? nightSnap.data() : null
  const c = caseSnap.exists ? caseSnap.data() : null
  const verdict = discardable({ night, c })
  if (!verdict.ok) throw new NightError('invalid', 'This night has a real case. It is not a rehearsal, so it cannot be discarded.')

  const counts = { case: 0, night: 0, subdocs: 0, sessions: 0, presence: 0, notes: 0, active: 0 }

  // the people: every session that ever belonged to this night, active or superseded
  const sessions = await docsWhere(db, 'sessions', 'nightId', nightId)
  const uids = new Set(sessions.map(s => s.id))
  const deckSnap = await db.doc(`nights/${nightId}/private/deck`).get()
  for (const uid of Object.values(deckSnap.exists ? (deckSnap.data().uids ?? {}) : {})) if (uid) uids.add(uid)

  // their notes for this night: a per-night branch is dropped, a note doc
  // stamped with this night is deleted, anything else is left alone
  const noteRefs = []
  for (const uid of uids) {
    const ref = db.doc(`notes/${uid}`)
    const snap = await ref.get()
    if (!snap.exists) continue
    const n = snap.data()
    if (n.nightId === nightId) { noteRefs.push(ref); continue }
    if (n.nights && typeof n.nights === 'object' && nightId in n.nights) {
      await ref.update({ [`nights.${nightId}`]: FieldValue.delete() })
      counts.notes++
    }
  }
  counts.notes += await deleteRefs(db, noteRefs)

  counts.sessions = await deleteRefs(db, sessions.map(s => s.ref))
  const presence = await docsWhere(db, 'presence', 'nightId', nightId)
  counts.presence = await deleteRefs(db, presence.map(p => p.ref))

  // the night itself: subcollections first, then the doc, then the case
  const subRefs = []
  for (const sub of ['public', 'private']) subRefs.push(...await db.collection(`nights/${nightId}/${sub}`).listDocuments())
  counts.subdocs = await deleteRefs(db, subRefs)
  if (nightSnap.exists) counts.night = await deleteRefs(db, [nightRef])
  if (caseSnap.exists) counts.case = await deleteRefs(db, [caseRef])

  const activeRef = db.doc('public_state/active')
  const active = await activeRef.get()
  if (active.exists && active.data().nightId === nightId) {
    await activeRef.set({ nightId: null, since: FieldValue.serverTimestamp() })
    counts.active = 1
  }
  return { ok: true, discarded: nightId, ...counts }
}

// A night the host declares a dry run: the fake players, a rehearsal with
// real-looking secrets, anything that must be thrown away afterwards.
export async function markDryRun(db, { nightId } = {}) {
  if (!nightId) throw new NightError('invalid', 'Which night?')
  const ref = db.doc(`nights/${nightId}`)
  const snap = await ref.get()
  if (!snap.exists) throw new NightError('no-night', 'No such night.')
  await ref.update({ dryRun: true })
  return { ok: true, dryRun: true }
}
