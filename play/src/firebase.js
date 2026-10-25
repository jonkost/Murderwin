import { initializeApp } from 'firebase/app'
import { getAuth, signInAnonymously, onAuthStateChanged, connectAuthEmulator } from 'firebase/auth'
import { initializeFirestore, persistentLocalCache, connectFirestoreEmulator } from 'firebase/firestore'
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
export const db = initializeFirestore(app, { localCache: persistentLocalCache() })
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
export const callRelayVote = httpsCallable(functions, 'relayVote')
export const callRelayGuess = httpsCallable(functions, 'relayGuess')
// The study station's calls (station/station.mjs uses the same name).
export const callStation = httpsCallable(functions, 'stationCommand')
// What a phone sends back during the night: a question set's picks, the Act 7
// ballot, the Act 6 elimination. None of them returns content.
export const callAnswer = httpsCallable(functions, 'answer')
export const callBallot = httpsCallable(functions, 'ballot')
export const callEliminate = httpsCallable(functions, 'eliminate')
// Act 2: the code in a cat's room (?meet=<cat>), Done, and Not yet, call me later.
// In Act 4 the same code marks the group's arrival in a game room.
export const callMeet = httpsCallable(functions, 'meetCat')
export const callLeave = httpsCallable(functions, 'leaveCat')
export const callNotYet = httpsCallable(functions, 'notYet')
// Act 4: Locked in; the iPad's memory match boards (?kiosk=memory); Salem's
// Motion Game; Boo's show over (?kiosk=boo or a phone).
export const callLockIn = httpsCallable(functions, 'lockIn')
export const callMemoryStep = httpsCallable(functions, 'memoryStep')
export const callSalemReady = httpsCallable(functions, 'salemReady')
export const callSalemSlip = httpsCallable(functions, 'salemSlip')
export const callSalemPassed = httpsCallable(functions, 'salemPassed')
export const callBooDone = httpsCallable(functions, 'booDone')
// The workshop's Game test tab: a practice of Get Off My Lawn! or Boo's
// Catwalk on its own record (public_state/game_test_*), never a night's.
// { command: 'salem-join' | 'salem-ready' | 'salem-slip' | 'salem-passed', ... }
export const callGameTest = httpsCallable(functions, 'gameTest')

export { signInAnonymously, onAuthStateChanged }
