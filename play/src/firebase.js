import { initializeApp } from 'firebase/app'
import { getAuth, signInAnonymously, onAuthStateChanged, connectAuthEmulator } from 'firebase/auth'
import { initializeFirestore, persistentLocalCache, memoryLocalCache, connectFirestoreEmulator } from 'firebase/firestore'
import { getFunctions, httpsCallable, connectFunctionsEmulator } from 'firebase/functions'
import { firebaseConfig, EMULATOR, EMULATOR_HOST, EMULATOR_PORTS, REGION } from './lib/config'

// Public web client config (lib/config.js): the live project unless the build
// was told VITE_EMULATOR=1, in which case everything below talks to the local
// emulators and the party database is never touched.

export const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
// Persistent cache: a reloaded phone paints from what it last saw, then
// catches up to the server silently (Canon: locked phone, dropped connection
// and late arrival all recover the same way).
// A room screen (?kiosk=, ?setup, ?practice=) keeps nothing on the machine
// (A9, 12 Nov 2026): the brain's Chrome also has the workshop open, whose
// cache is shared between tabs, and two kinds of cache on one site can leave
// a page that stops hearing the house (the Orangerie's stuck page, 11 Nov).
// A screen is always on and always online, so it loses nothing by it.
const ROOM_SCREEN = /[?&](kiosk|setup|practice)=/.test(globalThis.location?.search ?? '')
export const db = initializeFirestore(app, { localCache: ROOM_SCREEN ? memoryLocalCache() : persistentLocalCache() })
export const functions = getFunctions(app, REGION)

if (EMULATOR) {
  connectAuthEmulator(auth, `http://${EMULATOR_HOST}:${EMULATOR_PORTS.auth}`, { disableWarnings: true })
  connectFirestoreEmulator(db, EMULATOR_HOST, EMULATOR_PORTS.firestore)
  connectFunctionsEmulator(functions, EMULATOR_HOST, EMULATOR_PORTS.functions)
}

export const callJoin = httpsCallable(functions, 'join')
// The host's buttons. The function checks the caller's session is marked host.
export const callHost = httpsCallable(functions, 'hostCommand')
// The relay drawing (Act 6): nudge the clock, cast a pick.
export const callRelayAdvance = httpsCallable(functions, 'relayAdvance')
// the countdown reached the intro's time (functions/lib/run.js introDue)
export const callIntroDue = httpsCallable(functions, 'introDue')
export const callRelayVote = httpsCallable(functions, 'relayVote')
export const callRelayGuess = httpsCallable(functions, 'relayGuess')
// The study station's calls (station/station.mjs uses the same name).
export const callStation = httpsCallable(functions, 'stationCommand')
// What a phone sends back during the night: a question set's picks and the
// Act 7 vote. Neither returns content.
export const callAnswer = httpsCallable(functions, 'answer')
export const callBallot = httpsCallable(functions, 'ballot')
// Act 2: the code in a cat's room (?meet=<cat>), Done, and Not yet, call me later.
// In Act 4 the same code marks the group's arrival in a game room.
export const callMeet = httpsCallable(functions, 'meetCat')
export const callLeave = httpsCallable(functions, 'leaveCat')
export const callNotYet = httpsCallable(functions, 'notYet')
// Act 4: Locked in; the iPad's memory match boards (?kiosk=memory); Salem's
// Motion Game; the arcade on Boo's Mac (?kiosk=boo): each counted round's
// score, and the clue moment (5 Nov 2026, card 515).
export const callLockIn = httpsCallable(functions, 'lockIn')
// A board the house has not answered in 15 seconds counts as not heard, so the
// iPad sends it again (card 527) rather than waiting out the usual 70; a repeat
// is safe (lib/rooms.js sendUntilHeard).
export const callMemoryStep = httpsCallable(functions, 'memoryStep', { timeout: 15_000 })
export const callSalemReady = httpsCallable(functions, 'salemReady')
export const callSalemSlip = httpsCallable(functions, 'salemSlip')
export const callSalemPassed = httpsCallable(functions, 'salemPassed')
export const callArcadeScore = httpsCallable(functions, 'arcadeScore')
export const callArcadeClue = httpsCallable(functions, 'arcadeClue')
// The workshop's Game test tab: a practice of Get Off My Lawn! on its own
// record (public_state/game_test_salem), never a night's.
// { command: 'salem-join' | 'salem-ready' | 'salem-slip' | 'salem-passed', ... }
export const callGameTest = httpsCallable(functions, 'gameTest')

export { signInAnonymously, onAuthStateChanged }
