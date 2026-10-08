import { initializeApp } from 'firebase/app'
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth'
import { initializeFirestore, persistentLocalCache } from 'firebase/firestore'
import { getFunctions, httpsCallable } from 'firebase/functions'

// Public web client config — safe to commit (same project as the workshop).
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
// Persistent cache: a reloaded phone paints from what it last saw, then
// catches up to the server silently (Canon: locked phone, dropped connection
// and late arrival all recover the same way).
export const db = initializeFirestore(app, { localCache: persistentLocalCache() })
export const functions = getFunctions(app, 'us-central1')
export const callJoin = httpsCallable(functions, 'join')
// The host's buttons. The function checks the caller's session is marked host.
export const callHost = httpsCallable(functions, 'hostCommand')

export { signInAnonymously, onAuthStateChanged }
