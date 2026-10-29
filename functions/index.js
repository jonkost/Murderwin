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
import { onSchedule } from 'firebase-functions/v2/scheduler'
import { initializeApp } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import * as night from './lib/night.js'
import * as run from './lib/run.js'
import * as station from './lib/station.js'
import * as windows from './lib/windows.js'
import { mayTouchNight } from './lib/access.js'
import { stewardRequest } from './lib/steward.js'
import { studyTestRequest } from './lib/studytest.js'
import { gameTestRequest } from './lib/gametest.js'
import { sealedCounts as countSealed } from './lib/counts.js'
import { morningOp } from './lib/morning.js'
import { savePose, fromPoseCamera } from './lib/pose.js'

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
  'permission-denied': 'permission-denied',
  'no-doc': 'not-found',
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

// Act 2, Lights Out: the guest scans the code in a cat's room (the play URL
// with ?meet=<cat>), taps Done when they have read the cat, or Not yet, call
// me later. Only the guest the line called may meet that cat (lib/deal.js).
// In Act 4 the same codes mark a group's arrival in a game room (lib/act4.js).
export const meetCat = onCall({ cors: true }, wrap(async req => {
  const uid = requireUid(req)
  const { nightId, cat } = req.data ?? {}
  return run.player.meetCat(db, { uid, nightId, cat })
}))

export const leaveCat = onCall({ cors: true }, wrap(async req => {
  const uid = requireUid(req)
  const { nightId } = req.data ?? {}
  return run.player.leaveCat(db, { uid, nightId })
}))

export const notYet = onCall({ cors: true }, wrap(async req => {
  const uid = requireUid(req)
  const { nightId } = req.data ?? {}
  return run.player.notYet(db, { uid, nightId })
}))

// Act 4: Locked in, on the group card.
export const lockIn = onCall({ cors: true }, wrap(async req => {
  const uid = requireUid(req)
  const { nightId } = req.data ?? {}
  return run.player.lockIn(db, { uid, nightId })
}))

// A room screen (its presence heartbeat), a phone at the party or a host.
async function atTheParty(req, nightId) {
  const uid = requireUid(req)
  if (!nightId) throw new HttpsError('invalid-argument', 'Which night?')
  const allowed = await mayTouchNight(db, { uid, nightId, isAdmin: ADMIN_UIDS.includes(uid) })
  if (!allowed) throw new HttpsError('permission-denied', 'This screen is not at the party.')
  return uid
}

// Act 4, the Library: one of the memory match's three boards is clear on the
// iPad (?kiosk=memory). The server checks the pairs against the board; the
// third pays the group (lib/act4.js memoryStep). `by`: who found each pair,
// by place, for Zimothy's just-for-fun winner (28 Oct 2026).
export const memoryStep = onCall({ cors: true }, wrap(async req => {
  const { nightId, boardId, step, pairs, by } = req.data ?? {}
  await atTheParty(req, nightId)
  return run.player.memoryStep(db, { nightId, boardId, step, pairs, by })
}))

// Act 4, the Orangerie: Salem's Motion Game, from the group's phones.
export const salemReady = onCall({ cors: true }, wrap(async req => {
  const uid = requireUid(req)
  const { nightId } = req.data ?? {}
  return run.player.salemReady(db, { uid, nightId })
}))
export const salemSlip = onCall({ cors: true }, wrap(async req => {
  const uid = requireUid(req)
  const { nightId, attempt, colour } = req.data ?? {}
  return run.player.salemSlip(db, { uid, nightId, attempt, colour })
}))
export const salemPassed = onCall({ cors: true }, wrap(async req => {
  const uid = requireUid(req)
  const { nightId, attempt, felt } = req.data ?? {}
  return run.player.salemPassed(db, { uid, nightId, attempt, felt: felt === true })
}))

// Act 4, the Entryway: the iPad Pro facing the catwalk (?kiosk=pose) sends
// its photo of the group's last pose, for the end credits (lib/pose.js).
export const posePhoto = onCall({ cors: true }, wrap(async req => {
  const uid = requireUid(req)
  const { nightId, groupId, image } = req.data ?? {}
  if (!nightId) throw new HttpsError('invalid-argument', 'Which night?')
  if (!(await fromPoseCamera(db, { uid, nightId, isAdmin: ADMIN_UIDS.includes(uid) }))) throw new HttpsError('permission-denied', 'Only Boo’s camera sends the photos.')
  return savePose(db, { nightId, groupId, image })
}))

// Act 4, the Entryway: Boo's show is over (the wall, ?kiosk=boo, or a phone).
export const booDone = onCall({ cors: true }, wrap(async req => {
  const { nightId } = req.data ?? {}
  await atTheParty(req, nightId)
  return run.player.booDone(db, { nightId })
}))

// The study station on the M1 Air. Signed in anonymously like a phone, it
// presents the host-set key. It sends counts and words; the clue is dealt here.
export const stationCommand = onCall({ cors: true }, wrap(async req => {
  const uid = requireUid(req)
  const { nightId, key, station: which, command, payload } = req.data ?? {}
  const allowed = await station.stationAllowed(db, { key, isAdmin: ADMIN_UIDS.includes(uid) })
  if (!allowed) throw new HttpsError('permission-denied', 'That is not the station key.')
  // "finished" also deals the trace and Granolia's bag hint (run.js); the rest is state.
  if (command === 'finished') return run.studyFinished(db, { nightId, payload })
  return station.stationCommand(db, { nightId, station: which, command, payload })
}))

// The Study test (the workshop's Study test page and the study station's
// test mode, lib/studytest.js): the station reports with its key word; the
// workshop's commands are the admin's only.
export const studyTest = onCall({ cors: true }, wrap(async req => {
  const uid = requireUid(req)
  const { command, name, key, status } = req.data ?? {}
  return studyTestRequest(db, { command, name, key, status, isAdmin: ADMIN_UIDS.includes(uid) })
}))

// The Game test (the workshop's Game test tab, lib/gametest.js): the
// practices of Get Off My Lawn! and Boo's Catwalk, on their own docs and
// never a night's, and a test night that is always a rehearsal. Opening,
// stopping and the test night are the admin's only; any signed-in phone may
// join the Salem practice and play it.
export const gameTest = onCall({ cors: true }, wrap(async req => {
  const uid = requireUid(req)
  const { command, name, attempt, colour, act, beat, replace } = req.data ?? {}
  return gameTestRequest(db, { command, uid, isAdmin: ADMIN_UIDS.includes(uid), name, attempt, colour, act, beat, replace: replace === true })
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

// The phones no longer vote (22 Oct): kept so an old phone gets a kind answer.
export const relayVote = onCall({ cors: true }, wrap(async req => {
  requireUid(req)
  return run.player.relayVote(db, {})
}))

// The room's guess, tapped by the host on their phone (25 Oct 2026) or on the
// main computer (the living room kiosk, the fallback). Any screen or phone at
// the party may send it, the same as the clock.
export const relayGuess = onCall({ cors: true }, wrap(async req => {
  const uid = requireUid(req)
  const { nightId, pick } = req.data ?? {}
  if (!nightId) throw new HttpsError('invalid-argument', 'Which night?')
  const allowed = await mayTouchNight(db, { uid, nightId, isAdmin: ADMIN_UIDS.includes(uid) })
  if (!allowed) throw new HttpsError('permission-denied', 'This screen is not at the party.')
  return run.player.relayGuess(db, { nightId, pick })
}))

// The clock. Once a minute, for the live night: a window that has run out
// is settled (defaults for the phones that did not answer), the Act 2 line
// moves on, the supper chime and Act 4's rounds come on time, with no host
// pressing anything. The same path as
// the host command `tick` (lib/windows.js). Logs counts only.
export const tick = onSchedule({ schedule: 'every 1 minutes', region: 'us-central1' }, async () => {
  const nightId = await windows.activeNightId(db)
  if (!nightId) return
  try {
    const r = await run.hostCommand(db, { nightId, command: 'tick' })
    console.log('tick', JSON.stringify({ settled: r.settled, windowSettled: r.windowSettled, study: r.study?.reason ?? null, skipped: r.skipped ?? null }))
  } catch (e) {
    console.error('tick failed', e?.code ?? e?.name ?? 'error')
  }
})

// The Home rows (lib/counts.js): how far the packing list, the cats' leans
// and the drawing pictures have got, as numbers only, never a word of them.
// The admin's only.
export const sealedCounts = onCall({ cors: true }, wrap(async req => {
  const uid = requireUid(req)
  if (!ADMIN_UIDS.includes(uid)) throw new HttpsError('permission-denied', 'Only Jon can do that.')
  return countSealed(db)
}))

// The morning after (lib/morning.js): once the party night's reveal has
// played, on or after the party day, the case that ran opens to Jon and is
// archived; then he keeps or clears the secrets. Jon's account only. Before
// that it answers no, with a plain reason, and nothing else.
export const morningAfter = onCall({ cors: true }, wrap(async req => {
  const uid = requireUid(req)
  if (!ADMIN_UIDS.includes(uid)) throw new HttpsError('permission-denied', 'Only Jon can do that.')
  return morningOp(db, req.data ?? {})
}))

// The Steward's door (lib/steward.js). Jenna reads the packing list and
// reads and edits the cats' leans here, and only here: the gate is the
// SHA-256 of a verified Google email, never a UID, so Jon's admin account is
// refused with the rest. The result carries sealed content to that one
// screen; the log carries the op only.
export const steward = onCall({ cors: true }, wrap(async req => {
  requireUid(req)
  return stewardRequest(db, req)
}))
