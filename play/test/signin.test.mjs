// The page's anonymous sign-in (14 Nov 2026, the deep scan): a first sign-in that fails is tried again until it
// lands, one try at a time; a saved sign-in never tries; nothing runs after the page goes. Stand-ins only.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { keepSignedIn, SIGN_IN_RETRY_MS } from '../src/lib/signin.js'

// a stand-in for Firebase Auth: sign-ins answer when the test says, in the order asked
function standIn({ saved = null } = {}) {
  const auth = { currentUser: saved }
  let listener = null
  const pending = []
  let inFlight = 0
  let maxInFlight = 0
  let tries = 0
  const timers = []
  const fake = {
    auth,
    onAuthStateChanged: (_a, fn) => { listener = fn; queueMicrotask(() => fn(auth.currentUser)); return () => { listener = null } },
    signInAnonymously: () => {
      tries++
      inFlight++
      maxInFlight = Math.max(maxInFlight, inFlight)
      return new Promise((resolve, reject) => pending.push({ resolve, reject }))
    },
    timers: {
      setTimeout: (fn, ms) => { const t = { fn, ms, live: true }; timers.push(t); return t },
      clearTimeout: t => { if (t) t.live = false },
    },
    fail: () => { const p = pending.shift(); inFlight--; p.reject(new Error('network')) },
    land: uid => { const p = pending.shift(); inFlight--; auth.currentUser = { uid }; p.resolve({ user: auth.currentUser }); listener?.(auth.currentUser) },
    fireTimers: () => { for (const t of timers.splice(0)) if (t.live) t.fn() },
    liveTimers: () => timers.filter(t => t.live).length,
    get tries() { return tries },
    get maxInFlight() { return maxInFlight },
  }
  return fake
}
const settle = () => new Promise(r => setTimeout(r, 0))

test('a first sign-in that fails twice, then lands: one uid, one try at a time, none after', async () => {
  const f = standIn()
  const users = []
  const errors = []
  const stop = keepSignedIn({ ...f, onUser: u => users.push(u.uid), onError: e => errors.push(e.message), timers: f.timers })
  await settle()
  assert.equal(f.tries, 1)
  f.fail(); await settle()
  assert.equal(errors.length, 1, 'the page is told, so it says it is reconnecting')
  assert.equal(f.liveTimers(), 1)
  f.fireTimers(); await settle()
  assert.equal(f.tries, 2)
  f.fail(); await settle()
  f.fireTimers(); await settle()
  assert.equal(f.tries, 3)
  f.land('u1'); await settle()
  assert.deepEqual(users, ['u1'])
  assert.equal(f.maxInFlight, 1, 'never two at once')
  f.fireTimers(); await settle()
  assert.equal(f.tries, 3, 'nothing more once it has landed')
  stop()
})

test('a saved sign-in never tries; the retry is three seconds; nothing runs after the page goes', async () => {
  const saved = standIn({ saved: { uid: 'kept' } })
  const users = []
  const stop1 = keepSignedIn({ ...saved, onUser: u => users.push(u.uid), onError: () => {}, timers: saved.timers })
  await settle()
  assert.equal(saved.tries, 0)
  assert.deepEqual(users, ['kept'])
  stop1()

  assert.equal(SIGN_IN_RETRY_MS, 3_000)
  const f = standIn()
  const stop = keepSignedIn({ ...f, onUser: () => {}, onError: () => {}, timers: f.timers })
  await settle()
  f.fail(); await settle()
  assert.equal(f.liveTimers(), 1)
  stop()
  assert.equal(f.liveTimers(), 0, 'the page went: no more tries')
  f.fireTimers(); await settle()
  assert.equal(f.tries, 1)
})

// A browser's setTimeout and clearTimeout refuse to be called as a method of another object; Node's do not.
// So this stands in for a browser's, and the page's sign-in is run with no timers passed, as hooks.js runs it
// (14 Nov 2026, the deep scan's review: the first version threw on every phone and never tried again).
test('with no timers passed, a failed first sign-in is tried again under a browser\'s strict timers', async () => {
  const real = { set: globalThis.setTimeout, clear: globalThis.clearTimeout }
  const strict = fn => function (...a) {
    if (this !== undefined && this !== globalThis) throw new TypeError('Illegal invocation')
    return fn(...a)
  }
  const thrown = []
  const onRejected = e => thrown.push(e?.message)
  process.on('unhandledRejection', onRejected)
  globalThis.setTimeout = strict(real.set)
  globalThis.clearTimeout = strict(real.clear)
  try {
    const f = standIn()
    const users = []
    const stop = keepSignedIn({ auth: f.auth, onAuthStateChanged: f.onAuthStateChanged, signInAnonymously: f.signInAnonymously, onUser: u => users.push(u.uid), onError: () => {}, retryMs: 5 })
    await settle()
    assert.equal(f.tries, 1)
    f.fail()
    await new Promise(r => real.set(r, 60))
    assert.equal(f.tries, 2, 'tried again by itself')
    f.land('u1'); await settle()
    assert.deepEqual(users, ['u1'])
    stop()
  } finally {
    globalThis.setTimeout = real.set
    globalThis.clearTimeout = real.clear
    process.off('unhandledRejection', onRejected)
  }
  assert.deepEqual(thrown, [], 'no timer refused')
  const src = readFileSync(new URL('../src/lib/signin.js', import.meta.url), 'utf8')
  assert.ok(!/timers = \{ setTimeout, clearTimeout \}/.test(src), 'never the bare browser timers as a default')
})

test('the hook uses it, for every page that signs in', () => {
  const hooks = readFileSync(new URL('../src/lib/hooks.js', import.meta.url), 'utf8')
  assert.ok(hooks.includes("import { keepSignedIn } from './signin'"))
  assert.ok(hooks.includes('useEffect(() => keepSignedIn({'))
  assert.ok(!hooks.includes('.catch(error => setState({ uid: null, error }))'), 'never the one-try sign-in again')
})
