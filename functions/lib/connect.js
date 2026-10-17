// Opening a Firestore for a terminal script: the local emulator, or the live
// project through a service-account key. Lives in functions/ so the script
// and the night logic (night.js, run.js) share ONE copy of firebase-admin:
// a FieldValue from one copy is not recognised by a Firestore from another.
//
//   openDb({ emulator: true })               FIRESTORE_EMULATOR_HOST, demo project, no key
//   openDb({ live: true })                   GOOGLE_APPLICATION_CREDENTIALS must point at a key
//
// SEAL RULE: this file opens a connection and nothing else. It never reads.

import { initializeApp, applicationDefault, getApps } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

export const LIVE_PROJECT_ID = 'murderwin-at-sirwin-manor'
export const DEMO_PROJECT_ID = 'demo-murderwin'

export function openDb({ emulator = false, live = false, host = process.env.MURDERWIN_EMULATOR_HOST || '127.0.0.1', projectId = process.env.MURDERWIN_PROJECT_ID } = {}) {
  if (emulator === live) throw new Error('openDb: say which, the emulator or the live project')
  if (!getApps().length) {
    if (emulator) {
      process.env.FIRESTORE_EMULATOR_HOST ??= `${host}:8080`
      initializeApp({ projectId: projectId || DEMO_PROJECT_ID })
    } else {
      if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
        throw new Error('Set GOOGLE_APPLICATION_CREDENTIALS to a service-account key first (see the note at the top of functions/host.mjs).')
      }
      initializeApp({ credential: applicationDefault(), projectId: projectId || LIVE_PROJECT_ID })
    }
  }
  return getFirestore()
}
