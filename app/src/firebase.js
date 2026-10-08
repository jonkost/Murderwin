import { initializeApp } from 'firebase/app'
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth'
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore'
import { getStorage } from 'firebase/storage'
import { getFunctions, httpsCallable } from 'firebase/functions'

// Public web client config — safe to commit.
const firebaseConfig = {
  apiKey: 'AIzaSyBmb8V5vrj1Qt5l2m8Ook24vHWUfLiXGbA',
  authDomain: 'murderwin-at-sirwin-manor.firebaseapp.com',
  projectId: 'murderwin-at-sirwin-manor',
  storageBucket: 'murderwin-at-sirwin-manor.firebasestorage.app',
  messagingSenderId: '155269832197',
  appId: '1:155269832197:web:09f0ff7a92255b97b4466c',
}

export const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
// Persistent local cache: edits queue in IndexedDB and survive tab closes,
// so writing on a train with bad signal is safe (the spec's offline queue).
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
})
export const storage = getStorage(app)
// The host's buttons on the Game night page. The function checks the caller
// is on the staff list; it never returns anything sealed.
export const functions = getFunctions(app, 'us-central1')
export const hostCommand = httpsCallable(functions, 'hostCommand')

export function signIn() {
  return signInWithPopup(auth, new GoogleAuthProvider())
}

export function signOutUser() {
  return signOut(auth)
}
