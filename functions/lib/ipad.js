// The Host tab's row "The iPad shows" (handoff 11 Nov 2026, A10): one tap
// switches the iPad's one page (?kiosk=ipad) at once. The pick lands on the
// public cues doc, which the iPad's page already reads, as
// `ipad: { show, act, at }`; it holds through the act it was made in, and
// Auto (or the next act) clears it (play/src/lib/ipad.js says what Auto
// shows). The brain reads the same doc field by field, so this field moves
// nothing there. Nothing here is sealed: it names a screen, never content.
import { NightError } from './night.js'

export const IPAD_PICKS = ['auto', 'code', 'captions', 'memory', 'bedroom']

export async function setIpad(db, nightId, arg, { now = Date.now() } = {}) {
  const show = String(arg ?? 'auto').trim().toLowerCase() || 'auto'
  if (!IPAD_PICKS.includes(show)) throw new NightError('invalid', 'The iPad can show Auto, code, captions, memory or bedroom.')
  const snap = await db.doc(`nights/${nightId}`).get()
  const act = snap.exists ? Number(snap.data().act) || 0 : 0
  await db.doc(`nights/${nightId}/public/cues`).set({ ipad: { show, act, at: new Date(now) } }, { merge: true })
  return { ok: true, ipad: show }
}
