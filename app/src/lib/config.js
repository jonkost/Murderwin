// Where the workshop points. The live party project is the default, so a
// build with no settings is exactly today's game. Settings come from Vite's
// env (VITE_*), on the command line or in a gitignored app/.env file:
//
//   VITE_EMULATOR=1            talk to the local emulators (npm run emulate at the root)
//   VITE_EMULATOR_HOST=...     the Mac's LAN address, so a real phone can test against them
//   VITE_FIREBASE_PROJECT_ID   another Firebase project (the "dev" alias in .firebaserc).
//                              Needs that project's own web settings too, all three:
//                              VITE_FIREBASE_API_KEY, VITE_FIREBASE_APP_ID and
//                              VITE_FIREBASE_MESSAGING_SENDER_ID. Without them the build
//                              refuses to start rather than sign phones in to the live party.
//   VITE_PLAY_URL              what the square code at the door opens
//
// The emulators run under a demo project: fully offline, no credentials,
// and the Firebase tools refuse to point a demo project at the real one.
// Nothing here is secret: the web config is public by design.

const flag = v => v === '1' || v === 'true'

export const EMULATOR_PORTS = { auth: 9099, firestore: 8080, functions: 5001, hosting: 5000, storage: 9199 }
export const LIVE_PROJECT_ID = 'murderwin-at-sirwin-manor'
export const REGION = 'us-central1'

// The live project's web settings. Firebase Auth finds the project from the
// API key, not from projectId, so these must never stand in for another
// project's: a build pointed elsewhere with these keys would sign every phone
// in to the live party.
const LIVE = {
  apiKey: 'AIzaSyBmb8V5vrj1Qt5l2m8Ook24vHWUfLiXGbA',
  messagingSenderId: '155269832197',
  appId: '1:155269832197:web:09f0ff7a92255b97b4466c',
}
const OTHER_PROJECT_NEEDS = ['VITE_FIREBASE_API_KEY', 'VITE_FIREBASE_APP_ID', 'VITE_FIREBASE_MESSAGING_SENDER_ID']

// Pure: the settings for one env. Throws in plain words when a build points
// at another real project without that project's own keys.
export function configFor(env = {}) {
  const emulator = flag(env.VITE_EMULATOR)
  const emulatorHost = env.VITE_EMULATOR_HOST || '127.0.0.1'
  const projectId = env.VITE_FIREBASE_PROJECT_ID || (emulator ? 'demo-murderwin' : LIVE_PROJECT_ID)
  const live = projectId === LIVE_PROJECT_ID
  if (!live && !emulator) {
    const missing = OTHER_PROJECT_NEEDS.filter(k => !env[k])
    if (missing.length) {
      throw new Error(
        `This build points at the Firebase project "${projectId}" but is missing ${missing.join(', ')}. ` +
        'Every Firebase project has its own web settings (Project settings, Your apps, SDK setup). ' +
        'Set all of VITE_FIREBASE_PROJECT_ID, VITE_FIREBASE_API_KEY, VITE_FIREBASE_APP_ID and ' +
        'VITE_FIREBASE_MESSAGING_SENDER_ID for that project, or unset VITE_FIREBASE_PROJECT_ID to build for the live party.')
    }
  }
  const firebaseConfig = {
    apiKey: env.VITE_FIREBASE_API_KEY || (live ? LIVE.apiKey : 'demo-key'),
    authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || `${projectId}.firebaseapp.com`,
    projectId,
    storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || `${projectId}.firebasestorage.app`,
    messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || (live ? LIVE.messagingSenderId : '0'),
    appId: env.VITE_FIREBASE_APP_ID || (live ? LIVE.appId : `1:0:web:${projectId}`),
  }
  const playUrl = env.VITE_PLAY_URL
    || (emulator ? `http://${emulatorHost}:${EMULATOR_PORTS.hosting}/play/` : `https://${LIVE_PROJECT_ID}.web.app/play/`)
  return { EMULATOR: emulator, EMULATOR_HOST: emulatorHost, PROJECT_ID: projectId, firebaseConfig, PLAY_URL: playUrl }
}

const picked = configFor(import.meta.env ?? {})
export const EMULATOR = picked.EMULATOR
export const EMULATOR_HOST = picked.EMULATOR_HOST
export const PROJECT_ID = picked.PROJECT_ID
export const firebaseConfig = picked.firebaseConfig
// The address on the square code at the door.
export const PLAY_URL = picked.PLAY_URL
