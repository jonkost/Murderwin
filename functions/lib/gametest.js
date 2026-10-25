// The Game test (the workshop's Game test tab): Jon tries the Act 4 and
// Act 6 games before the night, from his phone, with no terminal. Two
// practices and a test night, all through one callable, `gameTest`
// (functions/index.js). The practice docs are written here and only here,
// with the Admin SDK:
//
//   public_state/game_test_salem   Get Off My Lawn!, on any phones that join
//     { runId, state: idle | playing | passed | done, round (1..3), attempt,
//       startsAt, cleanAt, flips: [{ at, colour }], slips, lastSlip,
//       players: { [uid]: { name, at } }, updatedAt }
//     idle     waiting for Ready (the practice is open, or a round was passed)
//     playing  a round is on: the flips are the real game's (act4.salemFlips)
//     passed   all three rounds passed: the practice is over (the real game's 'cleared')
//     done     Jon pressed Stop
//     attempt never goes back to 0, not even when the practice is opened
//     again: a phone that stayed on the page counts its reports by attempt.
//   public_state/game_test_boo     Boo's Catwalk, on the wall and the phones
//     { runId, state: idle | playing | done, startsAt,
//       poses: [{ stopAt, holdUntil, judgedAt, strutAt, poseAt, judgeUntil, line }] x 3,
//       endsAt, updatedAt }
//     stopAt   the music stops: STRIKE A POSE (the real show's poseAt)
//     holdUntil  HOLD IT until then
//     judgedAt   Boo's verdict shows until then (the real show's judgeUntil)
//     The show is laid out by the real game's own act4.booShow, so the
//     timing is the real one, and each pose also carries the real show's
//     field names: the phones and the wall read it with the same booMoment.
//
//   salem-open, salem-stop, boo-start, boo-stop   the admin only
//   salem-join { name }, clock                    any signed-in phone
//   salem-ready, salem-slip { attempt, colour },
//   salem-passed { attempt }                      a phone that joined
//   night-start { replace }, night-act { act }, night-beat { beat },
//   night-parlour                                 the admin only, a test night only
//
// clock answers the server's time, so a practice page sets its clock without
// writing presence/{uid}: that row is the browser's, shared by its tabs, and
// a room screen's calls are let in by it (access.js mayTouchNight).
//
// SEAL RULE: a practice never reads or writes nights/*, cases/* or sealed/*:
// it never deals, never writes the clue ledger and never pays anyone. Boo's
// verdicts come from the workshop's own copy (safe_content/ui_copy). A test
// night is always a rehearsal (createNight with forceRehearsal), and every
// night-* command is refused while the party box is ticked or while the live
// night is the party night or a dry run, so a test can never move a night
// that reads the sealed lists. The buttons move only a night this tab
// started (its doc carries gameTest: true): a rehearsal started from a phone,
// with guests on it, is left alone, and night-start asks before ending one.
// public_state is readable by any signed-in client: nothing sealed goes in
// it. Every answer is ok flags and a runId (clock adds the server's time).

import { randomInt, randomBytes } from 'node:crypto'
import { FieldValue } from 'firebase-admin/firestore'
import { NightError, createNight, readArea } from './night.js'
import { labelled, ms } from './deal.js'
import { SALEM_LEAD_MS, SALEM_CLEAN_MS, SALEM_ROUNDS, salemFlips, booShow } from './act4.js'
import { hostCommand } from './run.js'

export const SALEM_DOC = 'public_state/game_test_salem'
export const BOO_DOC = 'public_state/game_test_boo'
export const PLAYERS_MAX = 12
export const NAME_MAX = 30
// A phone that joined longer ago than this is left off when the practice is
// opened again, so last week's names drop off, and it no longer counts
// toward the twelve. Joining never drops anyone: a phone still on the page
// would lose its place with nothing on its screen to say so.
export const PLAYER_KEEP_MS = 3 * 60 * 60_000
// Boo's practice show starts this long after Start the show is pressed.
export const BOO_LEAD_MS = 3_000
export const TEST_NIGHT_LABEL = 'Game test'

export const ADMIN_COMMANDS = ['salem-open', 'salem-stop', 'boo-start', 'boo-stop', 'night-start', 'night-act', 'night-beat', 'night-parlour']
export const PLAYER_COMMANDS = ['salem-join', 'salem-ready', 'salem-slip', 'salem-passed', 'clock']
export const COMMANDS = [...ADMIN_COMMANDS, ...PLAYER_COMMANDS]
// The test night's buttons, and the host command each one is (run.js).
export const NIGHT_COMMANDS = { 'night-act': 'act', 'night-beat': 'beat', 'night-parlour': 'light-up' }

// The party box decides whether the next night is the party, so the words
// never just say untick it: a box left unticked makes the party a rehearsal.
export const PARTY_BOX_MESSAGE = 'The party box is ticked, so testing is off. To test before the party starts, untick it on the Game night page, then tick it again before you start the party night.'
export const PARTY_NIGHT_MESSAGE = 'The live night is the party night (or a dry run). Testing would change it.'
export const REHEARSAL_MESSAGE = 'The live night is a rehearsal started from a phone, not a test night. Run it from the Host tab on your phone.'
export const REPLACE_MESSAGE = 'A rehearsal started from a phone is the live night. A test night would end it for everyone, so the Game test tab asks first: tap Start a test night instead.'
export const ACT4_MESSAGE = 'Act 4 needs at least two phones in the test night, because it plays in groups. Join on a second phone, then try again.'

const isObj = v => !!v && typeof v === 'object' && !Array.isArray(v)
const newRunId = () => randomBytes(6).toString('hex')
const count = v => (Number.isInteger(v) && v > 0 ? v : 0)

// ---------------------------------------------------------------------------
// Get Off My Lawn! practice. The same rules as the real game (act4.js
// salemReady, salemSlip, salemPassed), on the practice doc instead of a
// night's, for whoever joined instead of a group.

// Only well-formed players; with `now`, only those who joined within
// PLAYER_KEEP_MS of it.
function players(list, now = null) {
  const out = {}
  if (!isObj(list)) return out
  for (const [uid, p] of Object.entries(list)) {
    if (isObj(p) && typeof p.name === 'string' && (now === null || ms(p.at) >= now - PLAYER_KEEP_MS)) out[uid] = { name: p.name, at: p.at }
  }
  return out
}
const recentPlayers = (list, now) => players(list, now)

function salemBlank({ runId, players = {}, attempt = 0 }) {
  return { runId, state: 'idle', round: 1, attempt, startsAt: null, cleanAt: null, flips: [], slips: 0, lastSlip: null, players }
}

export function cleanName(name) {
  if (typeof name !== 'string') return ''
  return name.replace(/\s+/g, ' ').trim().slice(0, NAME_MAX).trim()
}

// The practice must be open and this phone must have joined it.
function joinedPractice(d, uid) {
  if (!d) throw new NightError('closed', 'The practice is not open. Open it on the Game test tab.')
  if (!isObj(d.players) || !isObj(d.players[uid])) throw new NightError('no-guest', 'Type your first name to join the practice first.')
  return d
}

// Open the practice (again): round 1, waiting for Ready, a new runId. The
// phones that joined in the last few hours stay joined.
export async function salemOpen(db, { now = Date.now() } = {}) {
  const ref = db.doc(SALEM_DOC)
  return db.runTransaction(async tx => {
    const d = (await tx.get(ref)).data()
    const runId = newRunId()
    tx.set(ref, { ...salemBlank({ runId, players: recentPlayers(d?.players, now), attempt: count(d?.attempt) }), updatedAt: FieldValue.serverTimestamp() })
    return { ok: true, runId }
  })
}

export async function salemStop(db) {
  const ref = db.doc(SALEM_DOC)
  return db.runTransaction(async tx => {
    const snap = await tx.get(ref)
    if (!snap.exists) {
      const runId = newRunId()
      tx.set(ref, { ...salemBlank({ runId }), state: 'done', updatedAt: FieldValue.serverTimestamp() })
      return { ok: true, runId }
    }
    tx.update(ref, { state: 'done', flips: [], updatedAt: FieldValue.serverTimestamp() })
    return { ok: true, runId: snap.data().runId ?? null }
  })
}

// A phone joins with a first name. A phone that opens the page before Jon
// opens the practice starts it waiting, at round 1. Only the phones of the
// last few hours count toward the twelve; nobody is dropped here (only
// salem-open drops the old ones, with a new runId every phone sees).
export async function salemJoin(db, { uid, name, now = Date.now() } = {}) {
  const clean = cleanName(name)
  if (!clean) throw new NightError('invalid', 'Type your first name.')
  const ref = db.doc(SALEM_DOC)
  return db.runTransaction(async tx => {
    const d = (await tx.get(ref)).data()
    const all = players(d?.players)
    const recent = recentPlayers(all, now)
    if (!recent[uid] && Object.keys(recent).length >= PLAYERS_MAX) {
      throw new NightError('full', `${PLAYERS_MAX} phones have joined already. That is the most for a practice.`)
    }
    all[uid] = { name: clean, at: new Date(now) }
    if (!d) {
      const runId = newRunId()
      tx.set(ref, { ...salemBlank({ runId, players: all }), updatedAt: FieldValue.serverTimestamp() })
      return { ok: true, runId }
    }
    tx.update(ref, { players: all, updatedAt: FieldValue.serverTimestamp() })
    return { ok: true, runId: d.runId ?? null }
  })
}

// "Ready" (any phone that joined): the round starts three seconds on.
export async function salemReady(db, { uid, now = Date.now(), pick = randomInt } = {}) {
  const ref = db.doc(SALEM_DOC)
  return db.runTransaction(async tx => {
    const d = joinedPractice((await tx.get(ref)).data(), uid)
    if (d.state === 'done') throw new NightError('closed', 'The practice has stopped. Open it again on the Game test tab.')
    if (d.state !== 'idle') return { ok: true, already: true }
    const round = Math.min(SALEM_ROUNDS, Math.max(1, count(d.round)))
    const startsAt = now + SALEM_LEAD_MS
    tx.update(ref, {
      state: 'playing', round, attempt: count(d.attempt) + 1, flips: salemFlips(round, startsAt, pick),
      startsAt: new Date(startsAt), cleanAt: new Date(startsAt + SALEM_CLEAN_MS), slips: 0, lastSlip: null,
      updatedAt: FieldValue.serverTimestamp(),
    })
    return { ok: true }
  })
}

// A phone slipped: the round starts again for everyone (a stale attempt, a
// second phone's slip of the same moment, changes nothing).
export async function salemSlip(db, { uid, attempt, colour = null, now = Date.now(), pick = randomInt } = {}) {
  const ref = db.doc(SALEM_DOC)
  return db.runTransaction(async tx => {
    const d = joinedPractice((await tx.get(ref)).data(), uid)
    if (d.state !== 'playing' || Number(attempt) !== d.attempt) return { ok: true, already: true }
    if (now < ms(d.startsAt)) return { ok: true, already: true }
    const startsAt = now + SALEM_LEAD_MS
    tx.update(ref, {
      attempt: d.attempt + 1, flips: salemFlips(d.round, startsAt, pick), startsAt: new Date(startsAt), cleanAt: new Date(startsAt + SALEM_CLEAN_MS),
      slips: count(d.slips) + 1, lastSlip: colour === 'red' || colour === 'green' ? colour : null,
      updatedAt: FieldValue.serverTimestamp(),
    })
    return { ok: true, restarted: true }
  })
}

// Thirty seconds clean (any phone that joined, once the server's clock is
// past the clean mark): the next round waits for Ready, or after the third
// the practice is passed. Nothing is paid.
export async function salemPassed(db, { uid, attempt, now = Date.now() } = {}) {
  const ref = db.doc(SALEM_DOC)
  return db.runTransaction(async tx => {
    const d = joinedPractice((await tx.get(ref)).data(), uid)
    if (d.state !== 'playing' || Number(attempt) !== d.attempt) return { ok: true, already: true }
    if (now < ms(d.cleanAt)) throw new NightError('invalid', 'Not yet. Keep going.')
    const cleared = d.round >= SALEM_ROUNDS
    tx.update(ref, {
      state: cleared ? 'passed' : 'idle', round: cleared ? d.round : count(d.round) + 1, flips: [],
      updatedAt: FieldValue.serverTimestamp(),
    })
    return { ok: true, cleared }
  })
}

// ---------------------------------------------------------------------------
// Boo's Catwalk practice: the real show's timing and Boo's verdicts (the
// workshop's BOO JUDGE lines when Jon has written them), laid out from three
// seconds after the press. Nothing is paid; no booDone is ever called for it.

export function booPractice(startsAt, show) {
  return {
    state: 'playing',
    startsAt: new Date(startsAt),
    poses: show.poses.map(p => ({
      stopAt: p.poseAt, holdUntil: p.holdUntil, judgedAt: p.judgeUntil,
      strutAt: p.strutAt, poseAt: p.poseAt, judgeUntil: p.judgeUntil, line: p.line,
    })),
    endsAt: show.endsAt,
  }
}

export async function booStart(db, { now = Date.now(), pick = randomInt } = {}) {
  const startsAt = now + BOO_LEAD_MS
  const show = booShow(startsAt, pick, labelled(await readArea(db, 'ui_copy')))
  const runId = newRunId()
  await db.doc(BOO_DOC).set({ runId, ...booPractice(startsAt, show), updatedAt: FieldValue.serverTimestamp() })
  return { ok: true, runId }
}

export async function booStop(db) {
  const ref = db.doc(BOO_DOC)
  const snap = await ref.get()
  if (!snap.exists) {
    const runId = newRunId()
    await ref.set({ runId, state: 'done', startsAt: null, poses: [], endsAt: null, updatedAt: FieldValue.serverTimestamp() })
    return { ok: true, runId }
  }
  await ref.update({ state: 'done', updatedAt: FieldValue.serverTimestamp() })
  return { ok: true, runId: snap.data().runId ?? null }
}

// ---------------------------------------------------------------------------
// The test night. A party night is a night whose forceRehearsal is false (the
// dealer's own rule, deal.js); a dry run carries dryRun. Either one, or the
// party box, refuses every button here. A test night is one this tab
// started: createNight wrote gameTest: true on it. Any other rehearsal (one
// started from a phone, the weekend practice game, a tech run) has guests on
// it, so the buttons never move it. Returns { nightId, night }, or null.

export async function liveNight(db) {
  const game = await db.doc('meta/game').get()
  if (game.exists && game.data().party_night === true) throw new NightError('permission-denied', PARTY_BOX_MESSAGE)
  const active = await db.doc('public_state/active').get()
  const nightId = active.exists ? active.data().nightId ?? null : null
  if (!nightId) return null
  const snap = await db.doc(`nights/${nightId}`).get()
  if (!snap.exists) return null
  const night = snap.data()
  if (night.forceRehearsal === false || night.dryRun === true) throw new NightError('permission-denied', PARTY_NIGHT_MESSAGE)
  return { nightId, night }
}
export const isTestNight = n => n?.gameTest === true && n?.forceRehearsal === true && n?.dryRun !== true

// Always a rehearsal, whatever the party box says (and the box is checked
// first), and marked as this tab's. A rehearsal from a phone is ended only
// when the page asked Jon first and sends replace.
export async function nightStart(db, { replace = false } = {}) {
  const live = await liveNight(db)
  if (live && !isTestNight(live.night) && replace !== true) throw new NightError('running', REPLACE_MESSAGE)
  await createNight(db, { label: TEST_NIGHT_LABEL, forceRehearsal: true, gameTest: true })
  return { ok: true }
}

// The act a command would land the night in.
function targetAct(command, arg, night) {
  if (command === 'night-act') return Number(arg)
  if (command === 'night-beat') return Number(night.act ?? 0)
  return null
}

// Go to an act, a beat, or a Parlour Game now: the Host tab's own commands,
// on the test night only. Act 4 makes groups of two or three, so with fewer
// than two phones it is refused before anything moves.
export async function nightCommand(db, { command, arg, now = Date.now() } = {}) {
  const live = await liveNight(db)
  if (!live) throw new NightError('no-night', 'No test night is running. Start a test night first.')
  if (!isTestNight(live.night)) throw new NightError('permission-denied', REHEARSAL_MESSAGE)
  const roster = isObj(live.night.roster) ? Object.keys(live.night.roster).length : 0
  if (targetAct(command, arg, live.night) === 4 && roster < 2) throw new NightError('invalid', ACT4_MESSAGE)
  await hostCommand(db, { nightId: live.nightId, command: NIGHT_COMMANDS[command], arg, now })
  return { ok: true }
}

// ---------------------------------------------------------------------------
// The callable's whole job. The command is checked first, then who is
// asking. `isAdmin` comes from the caller's uid (index.js), never the request.
export async function gameTestRequest(db, { command, uid = null, isAdmin = false, name, attempt, colour, act, beat, replace = false, now = Date.now(), pick = randomInt } = {}) {
  if (!COMMANDS.includes(command)) throw new NightError('invalid', 'The game test does not know that command.')
  if (ADMIN_COMMANDS.includes(command) && !isAdmin) throw new NightError('permission-denied', 'Only the workshop can do that.')
  if (PLAYER_COMMANDS.includes(command) && !uid) throw new NightError('unauthenticated', 'Sign in first.')
  switch (command) {
    case 'salem-open': return salemOpen(db, { now })
    case 'salem-stop': return salemStop(db)
    case 'salem-join': return salemJoin(db, { uid, name, now })
    case 'salem-ready': return salemReady(db, { uid, now, pick })
    case 'salem-slip': return salemSlip(db, { uid, attempt, colour, now, pick })
    case 'salem-passed': return salemPassed(db, { uid, attempt, now })
    case 'boo-start': return booStart(db, { now, pick })
    case 'boo-stop': return booStop(db)
    case 'clock': return { ok: true, now }
    case 'night-start': return nightStart(db, { replace: replace === true })
    case 'night-act': return nightCommand(db, { command, arg: act, now })
    case 'night-beat': return nightCommand(db, { command, arg: beat, now })
    case 'night-parlour': return nightCommand(db, { command, now })
  }
}
