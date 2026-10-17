// Cloud Functions for the game night. Players call `join`; a host phone
// (a session marked host) or the admin calls `hostCommand`. Nothing on the
// night needs a Google sign-in.
// SEAL RULE: this file never reads sealed/* or cases/* itself. The dealer
// (lib/deal.js) reads cases/{nightId} with the Admin SDK to assemble each
// phone's own cards, and writes them only into that phone's session doc.
// Every callable here returns counts, keys and ok flags: never content.
// The terminal host (host.mjs) and the fake players (scripts/fake-players.mjs)
// go through the same lib/ code paths, so what they can do, a phone can do.

import { setGlobalOptions } from 'firebase-functions/v2'
import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { initializeApp } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import * as night from './lib/night.js'
import * as run from './lib/run.js'
import * as station from './lib/station.js'
import { mayTouchNight } from './lib/access.js'

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
  'window-open': 'failed-precondition',
  running: 'failed-precondition',
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

export const join = onCall({ cors: true }, wrap(async req => {
  const uid = requireUid(req)
  const { nightId, name } = req.data ?? {}
  return night.join(db, { uid, nightId, name })
}))

export const hostCommand = onCall({ cors: true }, wrap(async req => {
  const uid = requireUid(req)
  const { nightId, command, arg } = req.data ?? {}
  const allowed = await night.canHost(db, { uid, isAdmin: ADMIN_UIDS.includes(uid), nightId, command })
  if (!allowed) throw new HttpsError('permission-denied', 'Only a host can do that.')
  // Every host button goes through run.js, so the beat path and the buttons agree.
  return run.hostCommand(db, { nightId, command, arg })
}))

// ---- what a player's phone may send back. Each one checks the caller holds
// an active session for that night; none of them returns content.

export const answer = onCall({ cors: true }, wrap(async req => {
  const uid = requireUid(req)
  const { nightId, windowId, picks } = req.data ?? {}
  return run.player.answer(db, { uid, nightId, windowId, picks })
}))

export const solve = onCall({ cors: true }, wrap(async req => {
  const uid = requireUid(req)
  const { nightId, cardId, entry } = req.data ?? {}
  return run.player.solve(db, { uid, nightId, cardId, entry })
}))

export const ballot = onCall({ cors: true }, wrap(async req => {
  const uid = requireUid(req)
  const { nightId, murderer, motive, victim } = req.data ?? {}
  return run.player.ballot(db, { uid, nightId, murderer, motive, victim })
}))

export const eliminate = onCall({ cors: true }, wrap(async req => {
  const uid = requireUid(req)
  const { nightId, target } = req.data ?? {}
  return run.player.eliminate(db, { uid, nightId, target })
}))

// The study station on the M1 Air. Signed in anonymously like a phone, it
// presents the host-set key. It sends counts and words; the clue is dealt here.
export const stationCommand = onCall({ cors: true }, wrap(async req => {
  const uid = requireUid(req)
  const { nightId, key, station: which, command, payload } = req.data ?? {}
  const allowed = await station.stationAllowed(db, { key, isAdmin: ADMIN_UIDS.includes(uid) })
  if (!allowed) throw new HttpsError('permission-denied', 'That is not the station key.')
  // "finished" also deals the clue and rotates the house (run.js); the rest is state.
  if (command === 'finished') return run.studyFinished(db, { nightId, payload })
  return station.stationCommand(db, { nightId, station: which, command, payload })
}))

// The relay drawing's clock. A phone at the party, a host or a room screen
// (a kiosk with its presence heartbeat for that night) may nudge it; it only
// moves when a deadline on the server's clock has passed, once.
export const relayAdvance = onCall({ cors: true }, wrap(async req => {
  const uid = requireUid(req)
  const { nightId } = req.data ?? {}
  if (!nightId) throw new HttpsError('invalid-argument', 'Which night?')
  const allowed = await mayTouchNight(db, { uid, nightId, isAdmin: ADMIN_UIDS.includes(uid) })
  if (!allowed) throw new HttpsError('permission-denied', 'This phone is not at the party.')
  return run.player.relayAdvance(db, { nightId })
}))

// One phone's pick during a vote.
export const relayVote = onCall({ cors: true }, wrap(async req => {
  const uid = requireUid(req)
  const { nightId, pick } = req.data ?? {}
  return run.player.relayVote(db, { nightId, uid, pick })
}))
