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
  await ref.update({ act, beat, beatAt: FieldValue.serverTimestamp(), phase, pausedFrom: null })
  if (act >= 1) await deal.ensureHallRed(db, nightId, now) // the hall light is red from the start of the night
  if (!run || !spec?.action) return { ok: true, act, beat }
  if (spec.action === 'relay:start') {
    const r = await relay.start(db, { nightId, now })
    return { ok: true, act, beat, ...r }
  }
  const r = await deal.runAction(db, nightId, act, beat, spec.action, { now })
  return { ok: true, act, beat, ...r }
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
      return relay.start(db, { nightId, now })
    case 'relay-reset':
      return relay.reset(db, { nightId })
    case 'relay-advance':
      return advanceRelay(db, { nightId, now })
    case 'groups':
      // the standalone Host button: the same dealer path as the Act 3 beat, so the hidden roles stay apart
      return deal.dealGroups(db, nightId, n.act || 3, 'groups')
    case 'station-key':
      return station.setStationKey(db, arg)
    case 'dry-run':
      return discard.markDryRun(db, { nightId })
    case 'settle-now':
      // a dry run may close a window early; the party never does (CLIENT RULES)
      if (n.dryRun !== true) throw new NightError('invalid', 'Only a dry run night may close a window early.')
      return deal.settleWindow(db, nightId, { now, force: true })
    case 'discard-night':
      return discard.discardNight(db, { nightId })
    default:
      return night.hostCommand(db, { nightId, command, arg })
  }
}

// The relay's clock, plus what happens the moment the drawing is done: the
// trace lands behind the bedroom door and the hall light goes green.
export async function advanceRelay(db, { nightId, now = Date.now() } = {}) {
  const r = await relay.advance(db, { nightId, now })
  if (r?.moved && r.state === 'done') {
    try { await deal.revealTrace(db, nightId, { now }) } catch (e) { r.trace = e?.code ?? 'failed' }
  }
  return r
}

// The study station says a group is done: the clue is dealt (station.js),
// and in Act 4 the whole house rotates, exactly as the host's Next would.
export async function studyFinished(db, { nightId, payload = {}, now = Date.now() } = {}) {
  const r = await station.stationCommand(db, { nightId, station: 'study', command: 'finished', payload })
  if (r.repeated) return r
  const snap = await db.doc(`nights/${nightId}`).get()
  const n = snap.exists ? snap.data() : null
  if (!n || n.act !== 4 || n.phase !== 'act') return { ...r, rotated: false, reason: 'not-act-4' }
  const spec = deal.beatSpec(4, n.beat)
  const to = nextOf(4, n.beat)
  if (spec?.action !== 'rotate' || !to || to.act !== 4) return { ...r, rotated: false, reason: 'not-a-rotate-beat' }
  if (n.window && !n.window.settled) {
    if (now < deal.ms(n.window.closesAt)) return { ...r, rotated: false, reason: 'window-open' }
    await deal.settleWindow(db, nightId, { now })
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
