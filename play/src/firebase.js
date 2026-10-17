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
// The study station's calls (station/station.mjs uses the same name).
export const callStation = httpsCallable(functions, 'stationCommand')
// What a phone sends back during the night: a question set's picks, the safe's
// numbers, the Act 7 ballot, the Act 6 elimination. None of them returns content.
export const callAnswer = httpsCallable(functions, 'answer')
export const callSolve = httpsCallable(functions, 'solve')
export const callBallot = httpsCallable(functions, 'ballot')
export const callEliminate = httpsCallable(functions, 'eliminate')

export { signInAnonymously, onAuthStateChanged }
