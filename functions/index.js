// Cloud Functions for the game night. Players call `join`; the host (Jon,
// signed in with Google on the workshop) calls `hostCommand`.
// SEAL RULE: nothing here touches sealed/* or cases/* yet. When the case
// generator lands it will live beside this file and keep the same rule:
// assemble player payloads server-side, return only what that player may see.

import { setGlobalOptions } from 'firebase-functions/v2'
import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { initializeApp } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import * as night from './lib/night.js'

setGlobalOptions({ region: 'us-central1', maxInstances: 10 })
initializeApp()
const db = getFirestore()

// Keep in step with isAdmin() in firestore.rules.
const ADMIN_UIDS = ['JYSmPSQfdMen0leIDYmqUa32Prt1']

const CODE_MAP = {
  unauthenticated: 'unauthenticated',
  invalid: 'invalid-argument',
  'no-night': 'not-found',
  'no-guest': 'not-found',
  closed: 'failed-precondition',
  full: 'resource-exhausted',
  'already-joined': 'already-exists',
}

function wrap(handler) {
  return async req => {
    try {
      return await handler(req)
    } catch (e) {
      if (e instanceof HttpsError) throw e
      if (e instanceof night.NightError) throw new HttpsError(CODE_MAP[e.code] ?? 'failed-precondition', e.message)
      console.error('unexpected', e?.name, e?.code, String(e?.message ?? '').length)
      throw new HttpsError('internal', 'Something broke on the Manor side. Try again.')
    }
  }
}

function requireUid(req) {
  if (!req.auth?.uid) throw new HttpsError('unauthenticated', 'Sign in first.')
  return req.auth.uid
}

function requireAdmin(req) {
  const uid = requireUid(req)
  if (!ADMIN_UIDS.includes(uid)) throw new HttpsError('permission-denied', 'Not on the staff list.')
  return uid
}

export const join = onCall({ cors: true }, wrap(async req => {
  const uid = requireUid(req)
  const { nightId, guestKey } = req.data ?? {}
  return night.join(db, { uid, nightId, guestKey })
}))

export const hostCommand = onCall({ cors: true }, wrap(async req => {
  requireAdmin(req)
  const { nightId, command, arg } = req.data ?? {}
  return night.hostCommand(db, { nightId, command, arg })
}))
