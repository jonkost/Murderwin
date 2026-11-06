import { ms } from './night.js'

// The pose camera (card 450, ?kiosk=pose): Jenna's iPad Pro in the Entryway
// faces the group at Miss Boo LaRue's Arcade and takes one photo of each
// group at the deck, a minute into its visit, for the end credits
// (functions/lib/pose.js keeps it). Until 5 Nov 2026 it was Boo's Catwalk's
// last pose. Pure, so play/test can run it.

export const SHOT_AFTER_MS = 60_000 // into the visit: everyone is at the deck by then
export const POSE_MAX_CHARS = 900_000 // the server's cap (functions/lib/pose.js)

// The visit's key when the photo is due now: a minute into the group's
// visit, once. Null before then, between groups, and for no record.
export function poseShotKey(doc, now, afterMs = SHOT_AFTER_MS) {
  if (doc?.state !== 'visit' || !doc.groupId) return null
  const start = ms(doc.startsAt)
  if (!start || now < start + afterMs) return null
  return `${doc.groupId}-${start}`
}

// What the camera screen says over the picture: a count in the last five
// seconds before the photo, then that it is taken.
export function poseCaption(doc, now, afterMs = SHOT_AFTER_MS) {
  if (doc?.state !== 'visit' || !doc.groupId || !ms(doc.startsAt)) return { big: null, small: 'The next group will be along.' }
  const left = ms(doc.startsAt) + afterMs - now
  if (left > 5000) return { big: null, small: 'Boo’s camera. One photo of the group, for the end credits.' }
  if (left > 0) return { big: String(Math.ceil(left / 1000)), small: 'Smile!' }
  return { big: null, small: 'Play on.' }
}

// The JPEG qualities to try, best first, until the photo fits the cap.
export const QUALITIES = [0.72, 0.55, 0.4]
export function fits(dataUrl) { return typeof dataUrl === 'string' && dataUrl.length <= POSE_MAX_CHARS }
