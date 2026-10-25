// The pose photo (card 450, handoff 23 Oct 2026 §9.7): in Act 4 the iPad Pro
// stands in the Entryway facing the catwalk (/play/?kiosk=pose) and takes
// one photo of each group's last pose for Boo's Catwalk. The photo is a
// souvenir, not a clue: it shows in the end credits after the reveal. It is
// safe content (nobody's role, nothing sealed), kept with the night's public
// docs at nights/{id}/public/pose-<group>, and goes when a rehearsal is
// discarded with the rest of its night.
//
// The kiosk sends the photo as a small JPEG (a data URL, the page shrinks it
// first). The server keeps it only while Boo's show for that group is on or
// just over, so a stray upload can never stand in for another group's.

import { NightError } from './night.js'
import { rotationPath } from './station.js'

// Boo's show (act4.js booPath), named here so the finale can read the photos
// without loading act4.js, which loads the finale itself.
const booPath = nightId => `nights/${nightId}/public/boo`

export const POSE_MAX_CHARS = 900_000 // about 650 KB of JPEG: far under a Firestore doc's 1 MB
const PREFIX = 'data:image/jpeg;base64,'
export function posePath(nightId, gid) { return `nights/${nightId}/public/pose-${gid}` }

export function validPhoto(image) {
  if (typeof image !== 'string' || !image.startsWith(PREFIX)) return false
  if (image.length > POSE_MAX_CHARS || image.length < PREFIX.length + 100) return false
  return /^[A-Za-z0-9+/]+={0,2}$/.test(image.slice(PREFIX.length))
}

// The group's names, as the credits show them under the photo.
function namesOf(rot, gid) {
  const g = (rot?.groups ?? []).find(x => x.id === gid)
  return (g?.members ?? []).map(m => m.name).filter(Boolean)
}

export async function savePose(db, { nightId, groupId, image, now = Date.now() } = {}) {
  if (!nightId || typeof groupId !== 'string' || !/^g\d{1,2}$/.test(groupId)) throw new NightError('invalid', 'Which group?')
  if (!validPhoto(image)) throw new NightError('invalid', 'That photo did not come through. The next pose will try again.')
  const boo = (await db.doc(booPath(nightId)).get()).data()
  if (!boo || boo.groupId !== groupId || !['show', 'done'].includes(boo.state)) throw new NightError('closed', 'Boo is not judging that group just now.')
  const rot = (await db.doc(rotationPath(nightId)).get()).data()
  await db.doc(posePath(nightId, groupId)).set({ groupId, image, names: namesOf(rot, groupId), at: new Date(now) })
  return { ok: true }
}

// The groups that have a photo, in group order, for the end credits. Names only; the
// TV reads each photo from its own doc.
export async function posesFor(db, nightId, rot) {
  const out = []
  for (const g of rot?.groups ?? []) {
    const snap = await db.doc(posePath(nightId, g.id)).get()
    if (snap.exists) out.push({ groupId: g.id, names: namesOf(rot, g.id) })
  }
  return out
}
