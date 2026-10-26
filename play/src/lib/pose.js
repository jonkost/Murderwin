import { booMoment, ms } from './night.js'

// The pose camera (card 450, ?kiosk=pose): Jenna's iPad Pro in the Entryway
// faces the catwalk and takes one photo of each group's last pose, for the
// end credits (functions/lib/pose.js keeps it). Pure, so play/test can run it.

export const SHOT_AFTER_MS = 1500 // into the last HOLD IT: everyone has found their pose
export const POSE_MAX_CHARS = 900_000 // the server's cap (functions/lib/pose.js)

// The show's key when the photo is due now: Boo's last pose, held for a
// moment. Null at any other time. A show is one key, so it is taken once.
export function poseShotKey(doc, now, afterMs = SHOT_AFTER_MS) {
  const poses = Array.isArray(doc?.poses) ? doc.poses : []
  const last = poses[poses.length - 1]
  if (!last || !doc?.startsAt) return null
  const m = booMoment(doc, now)
  if (m.part !== 'pose' || m.pose !== poses.length) return null
  if (now < ms(last.poseAt) + afterMs) return null
  return `${doc.groupId ?? doc.runId ?? 'practice'}-${ms(doc.startsAt)}`
}

// What the camera screen says over the picture, by Boo's moment.
export function poseCaption(doc, now) {
  const m = booMoment(doc, now)
  if (m.part === 'idle') return { big: '', small: 'The next group will be along.' }
  if (m.part === 'intro') return { big: '', small: 'Watch the wall.' }
  if (m.part === 'strut') return { big: '', small: 'Strut!' }
  if (m.part === 'pose') return { big: 'STRIKE A POSE', small: `HOLD IT · ${m.hold}` }
  if (m.part === 'judge') return { big: '', small: m.line ?? '' }
  return { big: '', small: 'That’s the show.' }
}

// The JPEG qualities to try, best first, until the photo fits under the cap.
export const QUALITIES = [0.72, 0.55, 0.4]
export function fits(dataUrl) { return typeof dataUrl === 'string' && dataUrl.length <= POSE_MAX_CHARS }
