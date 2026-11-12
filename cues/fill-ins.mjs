// The fill-in players' clock. Runs on the brain during a practice night that
// was started with Fill-in players on the Start card (the polish pass, job
// A4, 11 Nov 2026). Every two seconds it asks the house to make whatever
// moves the fill-ins are due: a tap of Locked in, a Parlour Game's answers,
// the vote, each after its own human pause. The house makes the moves
// (functions/lib/fillins.js); this only keeps time.
//
//   npm run fill-ins        from the repo's root, or `npm run fill-ins` in cues/
//
// Start it any time, before or after the night: it waits for a practice
// night with fill-in players and plays whichever is on. Leave the window
// open; Ctrl-C stops it. Without it the night still runs and the fill-ins
// still answer, only later (the house's own once-a-minute clock moves them).
//
// It is blind and harmless by design: it signs in like any phone, calls one
// function that takes nothing and answers with counts, reads no document,
// holds no key, and prints counts and fixed words only. It never plays on the
// real night: it will not start on the party day or after, and it stops the
// moment the house says the night that is on is the real one.
//
// MURDERWIN_EMULATOR=1 points it at the local emulators (npm run emulate at
// the repo's root) and never at the party database.

import { initializeApp } from 'firebase/app'
import { getAuth, signInAnonymously, connectAuthEmulator } from 'firebase/auth'
import { getFunctions, httpsCallable, connectFunctionsEmulator } from 'firebase/functions'
import { drive, PARTY_DAY, WORDS } from './lib/fillins.js'

const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a)
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))

if (Date.now() >= PARTY_DAY) {
  log(WORDS.partyDay)
  process.exit(0)
}

// Same public web config as the phones (play/src/lib/config.js) and the cue relay (cues.mjs).
const firebaseConfig = {
  apiKey: 'AIzaSyBmb8V5vrj1Qt5l2m8Ook24vHWUfLiXGbA',
  authDomain: 'murderwin-at-sirwin-manor.firebaseapp.com',
  projectId: 'murderwin-at-sirwin-manor',
  storageBucket: 'murderwin-at-sirwin-manor.firebasestorage.app',
  messagingSenderId: '155269832197',
  appId: '1:155269832197:web:09f0ff7a92255b97b4466c',
}
const EMULATOR = process.env.MURDERWIN_EMULATOR === '1'
if (EMULATOR) firebaseConfig.projectId = process.env.MURDERWIN_PROJECT_ID || 'demo-murderwin'

const app = initializeApp(firebaseConfig)
const auth = getAuth(app)
const fns = getFunctions(app, 'us-central1')
if (EMULATOR) {
  const host = process.env.MURDERWIN_EMULATOR_HOST || '127.0.0.1'
  connectAuthEmulator(auth, `http://${host}:9099`, { disableWarnings: true })
  connectFunctionsEmulator(fns, host, 5001)
  log('emulator mode:', host)
}
const callFillIns = httpsCallable(fns, 'fillIns', { timeout: 20_000 })

log('The fill-in players\' clock is up. Ctrl-C stops it.')
await drive({
  // signed in once, and again if the sign-in ever lapses; the call takes nothing and answers with counts
  call: async () => { if (!auth.currentUser) await signInAnonymously(auth); return (await callFillIns({})).data },
  sleep,
  say: log,
})
process.exit(0)
