// The big Start button in the workshop (Jon, 12 Nov 2026: "in the workshop...
// give me the big button there"). The same start as the phone's
// (play/src/lib/start.js, functions/lib/run.js startEvening): a run-through
// unless the box is ticked, the intro at half past four on the real night
// and five minutes after the tap on a run-through. Pure, so app/test can run
// it; a test holds its numbers to the phone's.
export const INTRO_TIME = { hour: 16, minute: 30 }
export const RUN_THROUGH_MS = 5 * 60_000

export function introAtFor({ real = false, now = Date.now() } = {}) {
  if (!real) return now + RUN_THROUGH_MS
  const d = new Date(now)
  d.setHours(INTRO_TIME.hour, INTRO_TIME.minute, 0, 0)
  return d.getTime() > now ? d.getTime() : null
}

export function clockWords(at) {
  const d = new Date(at)
  const h = d.getHours(), m = d.getMinutes()
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h < 12 ? 'am' : 'pm'}`
}

// What the button and the line under it say.
export function startWords({ real = false, now = Date.now() } = {}) {
  const at = introAtFor({ real, now })
  return {
    button: real ? 'Start the REAL night' : 'Start a run-through',
    note: real
      ? at ? `The party, with the real secrets. The intro goes at ${clockWords(at)} on its own.` : 'The party, with the real secrets. It is past half past four, so Next on your phone starts the intro.'
      : 'A practice: nothing real is used. The intro goes five minutes after you start, or sooner with Next on your phone.',
  }
}

// The night that is on now, in one line. `live` is { nightId, night } from the workshop's watcher (gameTestApi).
export function liveLine(live) {
  if (!live) return 'Looking for the night…'
  const n = live.night
  if (!live.nightId || !n) return 'No night is on.'
  const kind = n.dryRun ? 'a dry run' : n.forceRehearsal === false ? 'the REAL night' : n.gameTest ? 'a test night' : 'a run-through'
  const where = Number(n.act) > 0 ? `Act ${n.act}` : 'at the doors'
  return `On now: ${String(n.label ?? '').trim() || 'a night with no name'}, ${kind}, ${where}.`
}

export const REPLACE_ASK = 'Start a new night? The night that is on now ends for every phone and screen.'
export const AFTER_START = 'Started. Now on your phone: open the game, tap your name, and on the Host tab send each screen its page.'
