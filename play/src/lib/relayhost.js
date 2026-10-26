// The host's controls for the drawing (Act 6), as pure rules (25 Oct 2026,
// Jon's cue list, cue 17). No React, no Firebase, so node --test can read
// them and the screen (HostRelayPanel in screens/Host.jsx, rendered on the
// host's drawing screen by screens/Relay.jsx) stays thin.

// Which control the host's phone shows for the drawing's state:
//   'paper'  At the paper, while a drawer walks to the paper (the walk is a
//            limit of twenty seconds; the button ends it the moment they are
//            there, so the square shows at once)
//   'guess'  the four names, A to D, while the room guesses, and still while
//            it sits out a wrong pick (the buttons are disabled in lockout)
//   null     nothing, in any other state (the slides, a turn, the door, idle)
export function hostRelayControl(relay) {
  const s = relay?.state
  if (s === 'walk') return 'paper'
  if (s === 'vote' || s === 'lockout') return 'guess'
  return null
}

// What the host's phone says after a tapped guess, from the server's reply.
// A right guess on the last grid opens the door; any other right guess calls
// the next player. Nothing here can name a picture: the server only says
// right or wrong, the same as the TV.
export function guessReply(r = {}) {
  if (!r.right) return 'Not that one. It is crossed off.'
  return r.state === 'done' ? 'Right. The door is open.' : 'Right. The next player is called.'
}

// What the host's phone says after At the paper. The walk is ended either
// way; the square shows now unless the night was paused between the two
// server writes (then the clock answered 'paused', and the square comes with
// the resume).
export function paperReply(r = {}) {
  return r.state === 'turn' ? 'The square is on the screen.' : 'The walk is ended. The square shows when the night resumes.'
}
