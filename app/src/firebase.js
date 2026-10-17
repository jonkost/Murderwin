import { initializeApp } from 'firebase/app'
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, connectAuthEmulator } from 'firebase/auth'
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager, connectFirestoreEmulator } from 'firebase/firestore'
import { getStorage, connectStorageEmulator } from 'firebase/storage'
import { firebaseConfig, EMULATOR, EMULATOR_HOST, EMULATOR_PORTS } from './lib/config'

// Public web client config (lib/config.js): the live project unless the build
// was told VITE_EMULATOR=1, in which case everything below talks to the local
// emulators and the party database is never touched.

export const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
// Persistent local cache: edits queue in IndexedDB and survive tab closes,
// so writing on a train with bad signal is safe (the spec's offline queue).
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
})
export const storage = getStorage(app)

if (EMULATOR) {
  connectAuthEmulator(auth, `http://${EMULATOR_HOST}:${EMULATOR_PORTS.auth}`, { disableWarnings: true })
  connectFirestoreEmulator(db, EMULATOR_HOST, EMULATOR_PORTS.firestore)
  connectStorageEmulator(storage, EMULATOR_HOST, EMULATOR_PORTS.storage)
}

export function signIn() {
  return signInWithPopup(auth, new GoogleAuthProvider())
}

export function signOutUser() {
  return signOut(auth)
}
