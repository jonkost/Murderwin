// Running the night: the host's "Next" button and everything it sets off.
// Composes night.js (the night, joining, the base act controls), deal.js
// (cards, windows, groups, results) and relay.js (the Act 6 drawing).
// Cloud Functions and the tests call hostCommand here; the base commands
// fall through to night.js unchanged.
//
// SEAL RULE: nothing here returns content. Results are counts and keys.

import { FieldValue } from 'firebase-admin/firestore'
import * as night from './night.js'
import * as deal from './deal.js'
import * as relay from './relay.js'
import * as station from './station.js'
import * as discard from './discard.js'

const { NightError } = night
const ACT_KEYS = Object.keys(deal.NIGHT.acts).map(Number)

export function firstBeat(act) { return deal.beatsOf(act)[0]?.key ?? null }

// Where "Next" goes from (act, beat): the next beat, or the first beat of the
// next act. Act 1 ends in the blackout, which is the host's own button.
export function nextOf(act, beatKey) {
  const beats = deal.beatsOf(act)
  const i = beats.findIndex(b => b.key === beatKey)
  if (i >= 0 && i + 1 < beats.length) return { act, beat: beats[i + 1].key }
  if (act === 1) return null
  if (act >= 7) return null
  if (act === 0) return { act: 1, beat: firstBeat(1) }
  return { act: act + 1, beat: firstBeat(act + 1) }
}
export function prevOf(act, beatKey) {
  const beats = deal.beatsOf(act)
  const i = beats.findIndex(b => b.key === beatKey)
  if (i > 0) return { act, beat: beats[i - 1].key }
  if (act > 1 && act !== 2) { const prev = deal.beatsOf(act - 1); return { act: act - 1, beat: prev[prev.length - 1]?.key ?? null } }
  return null
}

async function enterBeat(db, nightId, act, beat, { now = Date.now(), run = true, phase = 'act' } = {}) {
  const ref = db.doc(`nights/${nightId}`)
  const spec = deal.beatSpec(act, beat)
  let started = {}
  if (run && spec?.action === 'relay:start') {
    // the drawing starts before the beat moves, so a failed start leaves Next on this beat to try again;
    // the beat never forces, so a drawing already running (or done) is kept, never wiped
    started = await relay.start(db, { nightId, now })
  }
  await ref.update({ act, beat, beatAt: FieldValue.serverTimestamp(), phase, pausedFrom: null })
  if (act >= 1) await deal.ensureHallRed(db, nightId, now) // the hall light is red from the start of the night
  if (!run || !spec?.action) return { ok: true, act, beat }
  if (spec.action === 'relay:start') return { ok: true, act, beat, ...started }
  const r = await deal.runAction(db, nightId, act, beat, spec.action, { now })
  // the door and the ballot both lean on the trace: make sure it is there if the drawing is done
  if (spec.action === 'notice:door' || spec.action === 'window:ballot') await ensureTrace(db, nightId, now)
  return { ok: true, act, beat, ...r }
}

// Once the drawing is done, the trace must be behind the door and the hall
// light green. revealTrace is idempotent, so every caller may ask again.
async function ensureTrace(db, nightId, now) {
  if (await relay.state(db, nightId) !== 'done') return null
  try { return await deal.revealTrace(db, nightId, { now }) } catch (e) { return { trace: e?.code ?? 'failed' } }
}

// Leaving the drawing beat while the drawing is running would pull every
// phone off it; the host's button refuses, the same way an open window does.
async function refuseIfDrawing(db, nightId, n) {
  if (deal.beatSpec(n.act, n.beat)?.action !== 'relay:start') return
  if (relay.RUNNING.includes(await relay.state(db, nightId))) throw new NightError('running', 'The drawing is still running.')
}

// A window that has run its course is settled before anything else moves.
async function settleIfDue(db, nightId, now) {
  const n = (await db.doc(`nights/${nightId}`).get()).data()
  if (n?.window && !n.window.settled) await deal.settleWindow(db, nightId, { now })
}

export async function hostCommand(db, { nightId, command, arg, now = Date.now() } = {}) {
  if (command === 'create') return night.hostCommand(db, { nightId, command, arg })
  if (!nightId) throw new NightError('invalid', 'Which night?')
  const ref = db.doc(`nights/${nightId}`)
  const snap = await ref.get()
  if (!snap.exists) throw new NightError('no-night', 'No such night.')
  const n = snap.data()

  switch (command) {
    case 'next': {
      if (n.phase === 'blackout') throw new NightError('invalid', 'Press Power returns first.')
      await refuseIfDrawing(db, nightId, n)
      await settleIfDue(db, nightId, now)
      const to = nextOf(n.act, n.beat)
      if (!to) throw new NightError('invalid', n.act === 1 ? 'That is the end of Act 1. Press Blackout.' : 'That is the end of the night.')
      // Act 1 begins: copy the latest workshop lines (rules, bios, cat cards) to the phones first
      if (n.act === 0) await night.publishContent(db, nightId)
      return enterBeat(db, nightId, to.act, to.beat, { now })
    }
    case 'back': {
      const to = prevOf(n.act, n.beat)
      if (!to) throw new NightError('invalid', 'Nothing before this.')
      return enterBeat(db, nightId, to.act, to.beat, { now, run: false })
    }
    case 'beat': {
      // jump to a named beat of the current act and run it (re-running is harmless: cards deal once)
      const spec = deal.beatSpec(n.act, arg)
      if (!spec) throw new NightError('invalid', 'No such beat in this act.')
      if (arg !== n.beat) await refuseIfDrawing(db, nightId, n)
      await settleIfDue(db, nightId, now)
      return enterBeat(db, nightId, n.act, arg, { now })
    }
    case 'act': {
      const act = Number(arg)
      if (!ACT_KEYS.includes(act)) throw new NightError('invalid', 'Acts run 1 to 7.')
      await settleIfDue(db, nightId, now)
      await night.publishContent(db, nightId) // the latest workshop lines, every time an act is chosen
      if (act === 2 && n.act < 2) {
        // Act 2 begins with the power returning; jumping straight there deals the roles too
        await night.hostCommand(db, { nightId, command: 'power' })
        await deal.buildCaseForNight(db, nightId, { now }) // the case for the night, blind, once
        await deal.dealRoles(db, nightId)
        return enterBeat(db, nightId, 2, firstBeat(2), { now, phase: 'prompt' })
      }
      await ref.update({ actStartedAt: FieldValue.serverTimestamp() })
      return enterBeat(db, nightId, act, firstBeat(act), { now })
    }
    case 'power': {
      // The lights come back: roles land on every phone, held fifteen seconds.
      await night.publishContent(db, nightId)
      const r = await night.hostCommand(db, { nightId, command: 'power' })
      await deal.buildCaseForNight(db, nightId, { now }) // the case for the night, blind, once
      await deal.dealRoles(db, nightId)
      await ref.update({ beat: firstBeat(2), beatAt: FieldValue.serverTimestamp() })
      await deal.runAction(db, nightId, 2, firstBeat(2), deal.beatSpec(2, firstBeat(2))?.action, { now })
      return r
    }
    case 'light-up':
      // Every phone lights up with three questions, any time in Acts 2, 4 and 6.
      if (![2, 4, 6].includes(n.act)) throw new NightError('invalid', 'The phones light up in Acts 2, 4 and 6.')
      await settleIfDue(db, nightId, now)
      return deal.openWindow(db, nightId, 'questions', { now, act: n.act, beat: n.beat })
    case 'settle':
      return deal.settleWindow(db, nightId, { now })
    case 'relay-start':
      // a drawing under way is kept unless the host said "restart" (the Host tab asks first)
      return relay.start(db, { nightId, now, force: arg === 'force' })
    case 'relay-reset':
      return relay.reset(db, { nightId, now })
    case 'relay-advance':
      return advanceRelay(db, { nightId, now })
    case 'groups':
      // the standalone Host button: the same dealer path as the Act 3 beat, so the hidden roles stay apart;
      // once the house has started rotating the groups are set, and remaking them would scramble Act 4
      if ((n.rotation ?? -1) >= 0 && arg !== 'force') return { ok: true, already: true, reason: 'Groups are set' }
      return deal.dealGroups(db, nightId, n.act || 3, 'groups')
    case 'station-key':
      return station.setStationKey(db, arg)
    case 'study-tick':
      // the clock for a study with no station: ends a twelve-minute slot that has run out, once
      return station.tickStudy(db, nightId, now, { finished: payload => studyFinished(db, { nightId, payload, now }) })
    case 'study-finish': {
      // the host moves the house on without waiting for the study (the group is paid, outcome 'absent')
      const studySnap = await db.doc(station.studyPath(nightId)).get()
      const groupId = arg || studySnap.data()?.groupId || null
      if (!groupId) throw new NightError('invalid', 'No group is in the study.')
      return studyFinished(db, { nightId, payload: { groupId, outcome: 'absent' }, now })
    }
    case 'study-reassign':
      // "this group is in the study": the pointer moves, and the next finish pays the group named
      return station.reassignStudy(db, { nightId, groupId: arg })
    case 'hall': {
      // the hall light by hand (the cue relay follows public/cues)
      if (!['red', 'green'].includes(arg)) throw new NightError('invalid', 'The hall light is red or green.')
      await db.doc(`nights/${nightId}/public/cues`).set({ hall: arg, changedAt: new Date(now), byHand: true }, { merge: true })
      return { ok: true, hall: arg }
    }
    case 'dry-run':
      return discard.markDryRun(db, { nightId })
    case 'settle-now':
      // a dry run may close a window early; the party never does (CLIENT RULES)
      if (n.dryRun !== true) throw new NightError('invalid', 'Only a dry run night may close a window early.')
      return deal.settleWindow(db, nightId, { now, force: true })
    case 'discard-night':
      return discard.discardNight(db, { nightId })
    default:
      // pause, resume (every deadline shifts by the pause length: night.PAUSE_SHIFTED lists the fields), handover, and the base commands
      return night.hostCommand(db, { nightId, command, arg, now })
  }
}

// The relay's clock, plus what happens the moment the drawing is done: the
// trace lands behind the bedroom door and the hall light goes green.
// Every nudge after the drawing is done asks again, so a reveal that failed
// once (a dropped write, a function cut short) is retried by the next nudge.
export async function advanceRelay(db, { nightId, now = Date.now() } = {}) {
  const r = await relay.advance(db, { nightId, now })
  if (r?.state === 'done') {
    const t = await ensureTrace(db, nightId, now)
    if (t?.trace) r.trace = t.trace
  }
  return r
}

// The study station says a group is done: the clue is dealt (station.js),
// and in Act 4 the whole house rotates, exactly as the host's Next would.
// When the next beat is a Parlour Game marked autoAfterStudy (seed/night.json),
// the same call opens that window AND moves on to the following station, so
// one study finish always moves every group: the study is the clock at every
// slot and the host never needs Next between finishes. With the flag off the
// finish moves one beat only, and Next does the rest.
export async function studyFinished(db, { nightId, payload = {}, now = Date.now() } = {}) {
  const r = await station.stationCommand(db, { nightId, station: 'study', command: 'finished', payload })
  if (r.repeated) return r
  const snap = await db.doc(`nights/${nightId}`).get()
  const n = snap.exists ? snap.data() : null
  if (!n || n.act !== 4 || n.phase !== 'act') return { ...r, rotated: false, reason: 'not-act-4' }
  const spec = deal.beatSpec(4, n.beat)
  const to = nextOf(4, n.beat)
  if (spec?.action !== 'rotate' || !to || to.act !== 4) return { ...r, rotated: false, reason: 'not-a-rotate-beat' }
  // a finish from an earlier rotation (the host already moved the house on) must not move it again;
  // a finish the host redirected to another group counts for the slot that was due
  const rot = (await db.doc(`nights/${nightId}/public/rotation`).get()).data()
  if (!r.reassigned && (rot?.studyOrder ?? []).indexOf(r.groupId ?? payload.groupId) !== (n.rotation ?? -1)) return { ...r, rotated: false, reason: 'already-rotated' }
  if (n.window && !n.window.settled) {
    if (now < deal.ms(n.window.closesAt)) return { ...r, rotated: false, reason: 'window-open' }
    await deal.settleWindow(db, nightId, { now })
  }
  const toSpec = deal.beatSpec(to.act, to.beat)
  if (toSpec?.action === 'window:questions' && toSpec.autoAfterStudy) {
    const after = nextOf(to.act, to.beat)
    if (after && after.act === 4 && deal.beatSpec(after.act, after.beat)?.action === 'rotate') {
      const lit = await enterBeat(db, nightId, to.act, to.beat, { now })
      const moved = await enterBeat(db, nightId, after.act, after.beat, { now })
      return { ...r, rotated: true, beat: moved.beat, window: lit.beat, phones: lit.phones ?? null }
    }
  }
  const moved = await enterBeat(db, nightId, to.act, to.beat, { now })
  return { ...r, rotated: true, beat: moved.beat }
}

// What a player phone may call, besides join.
export const player = {
  answer: (db, args) => deal.answer(db, args),
  solve: (db, args) => deal.solve(db, args),
  ballot: (db, args) => deal.castBallot(db, args),
  eliminate: (db, args) => deal.eliminate(db, args),
  relayVote: (db, args) => relay.vote(db, args),
  relayAdvance: (db, args) => advanceRelay(db, args),
}
