// The host's controls for the drawing (Act 6), as pure rules (25 Oct 2026,
// Jon's cue list, cue 17), and the room's guess as every screen reads it
// (11 Nov 2026). No React, no Firebase, so node --test can read them and the
// screens (HostRelayPanel in screens/Host.jsx, rendered on the host's drawing
// screen by screens/Relay.jsx; Guess in screens/Kiosk.jsx) stay thin.

// The room is guessing while the drawing's state is one of these. `vote` is
// the guess. `lockout` was the ten-second wait after a wrong pick; Jon took
// the wait out on 11 Nov 2026 ("let's lose that"), and today's server never
// writes it. The word stays here only as an old name for the guess, so a
// phone or the TV on new pages with an older server behind them stays on the
// drawing through that server's wait. Take it out after the party.
export const GUESSING = ['vote', 'lockout']
export function isGuessing(relay) {
  return GUESSING.includes(relay?.state)
}
// An older server's wait: its guess is closed for ten seconds, so the names
// are dimmed until it opens again. Never true with today's server.
export function guessWaiting(relay) {
  return relay?.state === 'lockout'
}

// Which control the host's phone shows for the drawing's state:
//   'paper'  At the paper, while a drawer walks to the paper (the walk is a
//            limit of twenty seconds; the button ends it the moment they are
//            there, so the square shows at once)
//   'guess'  the four names, A to D, while the room guesses; a wrong pick is
//            crossed off and the rest stay live (no wait, 11 Nov 2026)
//   null     nothing, in any other state (the slides, a turn, the door, idle)
export function hostRelayControl(relay) {
  const s = relay?.state
  if (s === 'walk') return 'paper'
  if (isGuessing(relay)) return 'guess'
  return null
}

// The words at the guess: on a guest's phone, a host's phone and the Parlour
// TV. After a wrong pick every one of them says the same thing, until the
// room gets it right.
const GUESS_WORDS = {
  guest: 'Look at the paper. Tell the host your guess.',
  host: 'Look at the paper. Tap the room’s guess.',
  tv: 'What is the picture? Agree, then tell the host.',
}
export function guessLine(relay, who = 'guest') {
  if (guessWaiting(relay)) return 'Not that one.'
  if (relay?.lastResult === 'wrong') return 'Not that one. Guess again.'
  return GUESS_WORDS[who] ?? GUESS_WORDS.guest
}

// Was a pick just crossed off? True when the crossed list is longer than this
// screen last saw it (`seen`) and the last result was wrong: the moment for
// the TV's buzz and the phones' short buzz. A screen that opens on a list
// already crossed passes that length as `seen`, so it stays quiet.
export function wrongPick(seen, relay) {
  if (!isGuessing(relay) || relay.lastResult !== 'wrong') return false
  return (relay.crossed?.length ?? 0) > (Number(seen) || 0)
}

// What the host's phone says after a tapped guess, from the server's reply.
// A right guess on the last grid opens the door; any other right guess calls
// the next player. Nothing here can name a picture: the server only says
// right or wrong, the same as the TV.
export function guessReply(r = {}) {
  if (!r.right) return 'Not that one. Guess again.'
  return r.state === 'done' ? 'Right. The door is open.' : 'Right. The next player is called.'
}

// What the host's phone says after At the paper. The walk is ended either
// way; the square shows now unless the night was paused between the two
// server writes (then the clock answered 'paused', and the square comes with
// the resume).
export function paperReply(r = {}) {
  return r.state === 'turn' ? 'The square is on the screen.' : 'The walk is ended. The square shows when the night resumes.'
}
