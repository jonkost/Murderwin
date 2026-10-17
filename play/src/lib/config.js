// Where the phone client points. The live party project is the default, so a
// build with no settings is exactly today's game. Settings come from Vite's
// env (VITE_*), on the command line or in a gitignored play/.env file:
//
//   VITE_EMULATOR=1            talk to the local emulators (npm run emulate at the root)
//   VITE_EMULATOR_HOST=...     the Mac's LAN address, so a real phone can test against them
//   VITE_FIREBASE_PROJECT_ID   another Firebase project (the "dev" alias in .firebaserc)
//   VITE_PLAY_URL              what the square code at the door opens
//
// Nothing here is secret: the web config is public by design.

const env = import.meta.env ?? {}
const flag = v => v === '1' || v === 'true'

export const EMULATOR = flag(env.VITE_EMULATOR)
export const EMULATOR_HOST = env.VITE_EMULATOR_HOST || '127.0.0.1'
export const EMULATOR_PORTS = { auth: 9099, firestore: 8080, functions: 5001, hosting: 5000, storage: 9199 }

// The emulators run under a demo project: fully offline, no credentials,
// and the Firebase tools refuse to point a demo project at the real one.
export const LIVE_PROJECT_ID = 'murderwin-at-sirwin-manor'
export const PROJECT_ID = env.VITE_FIREBASE_PROJECT_ID || (EMULATOR ? 'demo-murderwin' : LIVE_PROJECT_ID)

export const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY || 'AIzaSyBmb8V5vrj1Qt5l2m8Ook24vHWUfLiXGbA',
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || `${PROJECT_ID}.firebaseapp.com`,
  projectId: PROJECT_ID,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || `${PROJECT_ID}.firebasestorage.app`,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || '155269832197',
  appId: env.VITE_FIREBASE_APP_ID || '1:155269832197:web:09f0ff7a92255b97b4466c',
}

export const REGION = 'us-central1'

// The address on the square code at the door.
export const PLAY_URL = env.VITE_PLAY_URL
  || (EMULATOR ? `http://${EMULATOR_HOST}:${EMULATOR_PORTS.hosting}/play/` : `https://${LIVE_PROJECT_ID}.web.app/play/`)
