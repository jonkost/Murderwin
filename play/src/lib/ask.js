// A question before a press that would undo part of a live night (12 Nov
// 2026, the review before the party): "are you sure", from the browser's own
// confirm. One rule on top of it: a button must never go dead. A browser
// inside another app can swallow the dialog and answer "no" at once, with
// nothing shown. Nobody can answer a real dialog in a twentieth of a second,
// so an instant "no" is taken as no dialog at all, and the press goes
// through, exactly as it did before the questions were added. The same if
// the browser has no confirm, or it throws.
//
// Pure but for the two things it is handed, so play/test can run it.
export const INSTANT_MS = 50

export function askFirst(question, { confirm = (q) => window.confirm(q), now = () => Date.now() } = {}) {
  const asked = now()
  let yes
  try { yes = confirm(question) } catch { return true }
  if (yes) return true
  return now() - asked < INSTANT_MS
}
