// Get Off My Lawn! at a glance (A9, 12 Nov 2026; Jon: "It also needs a
// countdown as far as how well you have to do, or a little bit more
// communication"). One view of public/salem (or the practice's record in the
// night's shape) for the phones and the Orangerie's screen alike: the round,
// the thirty clean seconds counting down, the slips left, and whether the
// round has just started over. Every number is from the record's own server
// times and the caller's serverNow(), never a timer of the phone's own.
// Plain JavaScript, so play/test (and the server's test of the eight
// minutes) can read it.

export const SALEM_ROUNDS = 3            // functions/lib/act4.js SALEM_ROUNDS
export const SALEM_MAX_SLIPS = 5         // functions/lib/act4.js SALEM_MAX_SLIPS (a test keeps them equal)

export const SALEM_WORDS = {
  round: (n, of = SALEM_ROUNDS) => `Round ${n} of ${of}`,
  slipsLeft: n => (n === 1 ? '1 slip left' : `${n} slips left`),
  restartGreen: 'Someone moved. From the top!',
  restartRed: 'Someone froze. From the top!',
}

export function msOf(t) {
  if (!t) return 0
  if (typeof t.toMillis === 'function') return t.toMillis()
  if (t instanceof Date) return t.getTime()
  return Number(t) || 0
}

export function salemView(doc, now) {
  const state = doc?.state ?? null
  const playing = state === 'playing'
  const startsAt = msOf(doc?.startsAt)
  const cleanAt = msOf(doc?.cleanAt)
  const started = playing && now >= startsAt
  const round = Math.min(SALEM_ROUNDS, Math.max(1, Math.round(Number(doc?.round) || 1)))
  const slips = Math.max(0, Number(doc?.slips) || 0)
  const maxSlips = Number(doc?.maxSlips) || null // an older record has none: no slips line
  return {
    state, playing, started, round, rounds: SALEM_ROUNDS,
    // the three-second lead before a round (or a restart)
    count: playing && !started ? Math.max(1, Math.ceil((startsAt - now) / 1000)) : null,
    // the clean seconds still to go: 30 through the lead, then down to 0
    cleanLeft: playing && cleanAt ? Math.max(0, Math.ceil((cleanAt - Math.max(now, startsAt)) / 1000)) : null,
    slipsLeft: maxSlips ? Math.max(0, maxSlips - slips) : null,
    restart: playing && !started && slips > 0 ? (doc?.lastSlip === 'red' ? SALEM_WORDS.restartRed : SALEM_WORDS.restartGreen) : null,
  }
}

// Should a phone tell the server the round (or the game) is done? Thirty
// seconds clean, or the round's two and a half minutes up, while a round
// plays; the game's eight minutes up, whenever the group is in the game.
export function salemPassDue(doc, now) {
  const state = doc?.state
  const gameEnds = msOf(doc?.gameEndsAt)
  if (gameEnds && now >= gameEnds && (state === 'intro' || state === 'playing' || state === 'passed')) return 'game'
  if (state !== 'playing') return null
  if (msOf(doc?.cleanAt) && now >= msOf(doc.cleanAt)) return 'clean'
  const roundEnds = msOf(doc?.roundEndsAt)
  if (roundEnds && now >= roundEnds) return 'round'
  return null
}
