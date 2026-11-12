// Get Off My Lawn!'s time limits (A9, 12 Nov 2026; Jon: "Get Off My Lawn
// needs time limits, because if you're not doing well, you get stuck"). The
// night's game (act4.js) and the Game test tab's practice (gametest.js) both
// use these, so neither can trap a group:
//
//   a round passes by itself two and a half minutes after its Ready
//     (roundEndsAt), as well as on its fifth slip (act4.js SALEM_MAX_SLIPS);
//   the whole game is over eight minutes after the group scans in (on the
//     night, act4.js salemArrive; in the practice, the first Ready)
//     (gameEndsAt): Salem lets the group through and pays as if they had
//     cleared it.
//
// The phones read the same fields (play/src/lib/salem.js) and say "passed"
// when either mark comes; the server checks the marks on its own clock.
// Pure: no I/O. Only times and counts, nothing sealed (L07).

export const SALEM_ROUND_MAX_MS = 150_000
export const SALEM_GAME_MAX_MS = 8 * 60_000

export function msOf(t) {
  if (!t) return 0
  if (typeof t.toMillis === 'function') return t.toMillis()
  if (t instanceof Date) return t.getTime()
  return Number(t) || 0
}

// The fields a Ready writes: the round's end (never past the game's), the
// game's end (from the first Ready only), the slips a round allows, and a
// fresh let-through flag.
export function readyLimits(doc, now, maxSlips) {
  const gameEndsAt = msOf(doc?.gameEndsAt) || now + SALEM_GAME_MAX_MS
  const roundEndsAt = Math.min(now + SALEM_ROUND_MAX_MS, gameEndsAt)
  return { roundEndsAt: new Date(roundEndsAt), gameEndsAt: new Date(gameEndsAt), maxSlips, letThrough: false }
}

// After a pause (the review of 12 Nov 2026): a round that was under way starts
// again from its three-second count, as a new attempt with the same colours
// re-timed from the new start, so its thirty clean seconds are whole again and
// nobody slips in the instant play comes back (a phone that sat still through
// the pause would slip on red at once, and one picked up on green would too).
// It is not a slip: the round's slips stand, and its limits have already moved
// on by the pause (night.js PAUSE_SHIFTED). Null when no round is under way.
// `lead` is act4.js SALEM_LEAD_MS (a test holds the two together).
export const SALEM_RESUME_LEAD_MS = 3_000
export function resumedRound(doc, now, lead = SALEM_RESUME_LEAD_MS) {
  if (doc?.state !== 'playing' || !msOf(doc.startsAt)) return null
  const startsAt = now + lead
  const move = startsAt - msOf(doc.startsAt)
  const clean = msOf(doc.cleanAt) ? msOf(doc.cleanAt) + move : startsAt + 30_000
  return {
    attempt: (Number(doc.attempt) || 0) + 1,
    flips: (Array.isArray(doc.flips) ? doc.flips : []).map(f => ({ ...f, at: new Date(msOf(f.at) + move) })),
    startsAt: new Date(startsAt),
    cleanAt: new Date(clean),
    lastSlip: null,
    at: new Date(now),
  }
}

// Has the round's limit come (a record with no limit never has)?
export const roundOver = (doc, now) => !!msOf(doc?.roundEndsAt) && now >= msOf(doc.roundEndsAt)
// Has the game's limit come?
export const gameOver = (doc, now) => !!msOf(doc?.gameEndsAt) && now >= msOf(doc.gameEndsAt)
