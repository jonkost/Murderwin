// The page's anonymous sign-in (14 Nov 2026, the deep scan). A first sign-in that fails (a blink of the wifi at
// the door) used to leave the phone on "Reconnecting on its own" for good: Firebase never asks again by itself.
// Now it is tried again every three seconds until it lands, one try at a time (two at once would make two uids).
// A page that already has its saved sign-in never tries at all. Pure, so play/test can drive it with stand-ins;
// lib/hooks.js useAuthUid passes the real Firebase calls.
export const SIGN_IN_RETRY_MS = 3_000

// The page's own timers, each called as a plain function. A browser refuses its setTimeout called as a method
// of another object ("Illegal invocation" in Chrome, "Can only call Window.setTimeout on instances of Window" on
// every iPhone), so the bare { setTimeout, clearTimeout } never retried on a phone (the deep scan's review,
// 14 Nov 2026). Node does not mind, which is why only play/test/signin.test.mjs's browser-like check finds it.
const PAGE_TIMERS = {
  setTimeout: (fn, ms) => setTimeout(fn, ms),
  clearTimeout: id => clearTimeout(id),
}

export function keepSignedIn({ auth, onAuthStateChanged, signInAnonymously, onUser, onError, retryMs = SIGN_IN_RETRY_MS, timers = PAGE_TIMERS }) {
  let stopped = false
  let trying = false
  let timer = null
  const clear = () => {
    if (timer != null) timers.clearTimeout(timer)
    timer = null
  }
  const signIn = () => {
    clear()
    if (stopped || trying || auth.currentUser) return
    trying = true
    signInAnonymously(auth).then(() => { trying = false }, error => {
      trying = false
      if (stopped || auth.currentUser) return
      onError(error)
      timer = timers.setTimeout(signIn, retryMs)
    })
  }
  const unwatch = onAuthStateChanged(auth, user => {
    if (user) {
      clear()
      onUser(user)
    } else signIn()
  })
  return () => {
    stopped = true
    clear()
    unwatch()
  }
}
