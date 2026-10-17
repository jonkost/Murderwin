// The Parlour Game's last screen, and what the server's reply to an answer
// means for it. Pure module (no React, no Firebase) so it can be tested with
// node --test.
//
// Every answer ends on the same screen. An answer that arrived in time, one
// that arrived after the close (the server had already picked for this
// phone), and one sent twice all read the same: "Thanks". So a phone that
// was slow, or asleep, shows no pattern to anyone looking over a shoulder,
// and nobody is ever told "Try again" for something that cannot be retried.

export const THANKS = {
  title: 'Thanks',
  text: 'Your answers are in. Keep your phone on you.',
  button: 'Done',
}

// What the Parlour Game screen does with the server's reply.
//   'thanks'  show the Thanks screen (ok, late, or already answered)
//   'retry'   the Manor did not hear it: let the phone try again
export function answerOutcome(result) {
  const r = result?.data ?? result
  if (r && r.ok === true) return 'thanks'
  return 'retry'
}

// The error a phone shows when the Manor did not hear it. Codes the server
// sends for a window that is gone ('failed-precondition' from a 'closed'
// NightError) are not retried either: the phone says thanks and rests.
export function outcomeForError(err) {
  const code = String(err?.code ?? '')
  if (code.endsWith('failed-precondition')) return 'thanks'
  return 'retry'
}
