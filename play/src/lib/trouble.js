// The line a screen shows when a call to the Manor fails (Jon, 29 Oct 2026:
// no programming words on any screen a guest sees). Pure (no React, no
// Firebase) so play/test can run it.
//
// The Firebase library hands back a refusal as the server's own sentence with
// the HTTP status after it ("Not yet. Wait in the Parlour; your phone will call
// you. [400]"), and a dropped connection, a call that ran out of time or a
// function that broke as a bare code ("internal [0]", "deadline-exceeded",
// "INTERNAL [500]"). The server's sentence shows without its bracket; anything
// else becomes the screen's own plain words.

export const DID_NOT_ANSWER = 'The Manor did not answer. Try again.'

// The codes the server's own sentences come with (functions/index.js CODE_MAP
// and its HttpsErrors). Not 'internal': a function that broke only says to try
// again, and the screen's own words say that better. Not 'unauthenticated'
// either: its only words are "Sign in first.", and a guest never signs in.
// The phone does that by itself, so a call that went out before it had (a
// pass that could not be renewed after supper, say) is one to try again.
export const SAID_BY_SERVER = new Set(['permission-denied', 'failed-precondition', 'not-found', 'resource-exhausted', 'invalid-argument', 'already-exists'])

// The message without the " [400]" the library puts after it.
export function withoutStatus(message) {
  return String(message ?? '').trim().replace(/\s*\[\d+\]$/, '').trim()
}

// A sentence: more than one word, and it ends as a sentence ends. A code is
// not one, and nor are the library's own words for a refused call ("Bad
// Request", "Permission Denied").
export function isSentence(text) {
  return /\s/.test(text) && /[.!?]['"’”)]?$/.test(text)
}

// The server's own sentence, or `fallback` (the screen's own words).
export function troubleLine(e, fallback = DID_NOT_ANSWER) {
  const code = String(e?.code ?? '').replace(/^functions\//, '')
  const text = withoutStatus(e?.message)
  return SAID_BY_SERVER.has(code) && isSentence(text) ? text : fallback
}
