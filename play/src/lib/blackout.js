// The blackout's marks on a phone or a room screen (handoff 11 Nov 2026, A1:
// "everything has to go black"). The server writes nights/{id}.blackout =
// { pressAt, darkAt, powerAt, test } at the press (functions/lib/blackout.js);
// every page goes dark at darkAt on its own server clock and comes back at
// powerAt by itself, so they all cut together. The phase flip at the dark is
// the backstop. The Blackout test has the marks and no phase at all, so it
// can never leave a night in the dark. The dark is five seconds at most and
// the power returns on its own (the client rule).
//
// No React here, so play/test can run it; lib/useBlackout.js wakes the page
// at each mark.

export function ms(t) {
  if (!t) return 0
  if (typeof t.toMillis === 'function') return t.toMillis()
  if (t instanceof Date) return t.getTime()
  if (typeof t.seconds === 'number') return t.seconds * 1000 + Math.floor((t.nanoseconds ?? 0) / 1e6)
  return Number(t) || 0
}

// 'press', 'dark' or null at `now` (the server's clock). The same rule as the server's and the brain's.
export function blackoutStage(mark, now) {
  if (!mark) return null
  const press = ms(mark.pressAt)
  const dark = ms(mark.darkAt)
  const power = ms(mark.powerAt)
  if (!dark || !power || now < press) return null
  if (now < dark) return 'press'
  if (now < power) return 'dark'
  return null
}

// Is this night in the dark by its marks right now?
export function inBlackout(night, now) {
  return blackoutStage(night?.blackout, now) === 'dark'
}

// Should the page show the blackout itself (the flash and the squeeze), not
// just a dark screen? The marks' dark, or the phase (a page that missed the
// marks, a reload in the dark). The prompt and the pause are dark without it.
export function blackoutHit(night, now) {
  if (!night) return false
  return inBlackout(night, now) || night.phase === 'blackout' || (night.phase === 'paused' && night.pausedFrom === 'blackout')
}

// The times a page must look again (the dark and the power), in the future only.
export function markTimes(night, now) {
  const b = night?.blackout
  if (!b) return []
  return [ms(b.darkAt), ms(b.powerAt)].filter(t => t > now)
}
