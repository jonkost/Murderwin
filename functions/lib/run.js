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
import * as windows from './windows.js'
import * as screen from './screen.js'
import * as finale from './finale.js'
import * as safeguards from './safeguards.js'
import * as act4 from './act4.js'
import { recordArcadeScore } from './arcade.js'
import { PARTY_DAY } from './morning.js'
import { isFillInUid } from './seats.js'
import { goodNight } from './closing.js'
import * as flow from './flow.js'
import { setIpad } from './ipad.js'
import { BLACKOUT_LEAD_MS, BLACKOUT_POWER_MS, pressBlackout, clearBlackout, blackoutRunning } from './blackout.js'

// Is the press that is running a Blackout test?
async function testRunning(db, nightId, now) {
  const b = (await db.doc(`nights/${nightId}`).get()).data()?.blackout
  return b?.test === true && blackoutRunning(b, now)
}

const { NightError } = night
const ACT_KEYS = Object.keys(deal.NIGHT.acts).map(Number)
// The host commands a pause holds back (everything that moves the night or lights the phones;
// At the paper moves the drawing's clock, so it waits too).
export const PAUSE_HELD = new Set(['next', 'back', 'beat', 'act', 'light-up', 'power', 'blackout', 'blackout-test', 'supper', 'start-act4', 'at-the-paper'])
// The blackout lasts five seconds, then the power comes back on its own (Jon's
// cue list, cue 4, 25 Oct 2026: blackoutAuto). Since 11 Nov 2026 (A1) a lead
// comes first: the press stops the music, the dark lands BLACKOUT_LEAD_MS
// later (lib/blackout.js). The waits are on the server, inside the Blackout
// command, so no phone counts them; the tests pass their own sleep.
export { BLACKOUT_LEAD_MS, BLACKOUT_POWER_MS }
const realSleep = ms => new Promise(resolve => setTimeout(resolve, ms))

// The Blackout's waits run to its marks (review 12 Nov 2026): `until(t)` sleeps for the time left until t on
// the clock, never a fixed length, so the reads and writes before it do not stretch the lead or the dark. On
// the server the clock is the real one; a test's own sleep (and a `clock` it may pass) is a clock that starts
// at the press and moves only when it sleeps, so a test can see each wait's length.
export function blackoutClock(start, sleep = realSleep, clock = null) {
  let virtual = start
  const now = clock ?? (sleep === realSleep ? () => Date.now() : () => virtual)
  const until = async t => {
    const left = Math.max(0, t - now())
    virtual += left
    if (left > 0) await sleep(left)
  }
  until.now = now
  return until
}
// The six Hue scenes Jon makes in the Hue app (his cue list, 25 Oct 2026;
// cues/scenes.json names the same six); the brain recalls one by name when
// the host asks (public/cues.scene).
export const SCENES = ['Murderwin Default', 'Murderwin Dimmed', 'Murderwin Blackout', 'Murderwin Drawing', 'Murderwin Candles', 'Murderwin Study Dim']
export const MUSIC_COMMANDS = ['play', 'pause', 'next']

export function firstBeat(act) { return deal.beatsOf(act)[0]?.key ?? null }

// Where "Next" goes from (act, beat): the next beat, or the first beat of the
// next act. Act 1 ends in the blackout, which is the host's own button, and
// Act 7 ends at its last beat, The End (25 Oct 2026, the cue list).
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
    await flow.closeParlour(db, nightId, { now }) // every Parlour Game still unplayed is dropped for good (A5)
  }
  // The End (the 'end' action, deal.end) sets nights/{id}.over; any other beat takes it off again, so a Back
  // from The End or an act jump in a rehearsal opens the night back up (25 Oct 2026, the cue list)
  const leavingEnd = spec?.action === 'end' ? {} : { over: FieldValue.delete(), overAt: FieldValue.delete(), goodNight: FieldValue.delete(), goodNightAt: FieldValue.delete() }
  await ref.update({ act, beat, beatAt: FieldValue.serverTimestamp(), phase, pausedFrom: null, ...leavingEnd })
  // the hall bulb: green for the welcome from Act 1's first beat, red from the power's return (powerReturns
  // writes it); here only when nothing has set it yet (cue list 25 Oct 2026)
  if (act >= 1) await deal.ensureHall(db, nightId, act === 1 ? 'green' : 'red', now)
  const sched = run ? await windows.startParlour(db, nightId, act, { now }) : null // Acts 2, 4 and 6: the act's Parlour Games, once per act
  await screen.onBeat(db, nightId, { act, beat, spec, phase, now, run }) // the room screens and the beat's sound (screen.js)
  // Act 6 plays its games at the start (22 Oct): the first opens now, not at the next minute's tick; after the
  // beat's screen is up, so the screen the night just left never holds it back (A5)
  if (sched?.count && !sched.already && windows.playsAtStart(act)) await windows.tickParlour(db, nightId, now)
  if (run) await onSolving(db, nightId, act, beat, now) // the Act 2 rooms and the Act 4 memory match close out on time
  if (!run || !spec?.action) return { ok: true, act, beat }
  if (spec.action === 'relay:start') return { ok: true, act, beat, ...started }
  if (spec.action === 'arm:bulletin') return { ok: true, act, beat, ...(await screen.armBulletin(db, nightId, { now })) } // plays itself 3 to 5 minutes later
  // Act 4 (act4.js): the warning, the group cards, then a round per beat on the clock
  if (spec.action === 'act4:warn') return { ok: true, act, beat, ...(await act4.warn(db, nightId, act, beat, { now })) }
  if (spec.action === 'act4:groups') return { ok: true, act, beat, ...(await act4.dealGroupCards(db, nightId, act, beat, { now })) }
  if (spec.action === 'act4:round') return { ok: true, act, beat, ...(await act4.startRound(db, nightId, roundOf(beat), { now })) }
  const r = await deal.runAction(db, nightId, act, beat, spec.action, { now })
  // the door, the talk after it and the vote all lean on the trace: make sure it is there if the drawing is done
  if (['notice:door', 'notice:talk', 'window:ballot'].includes(spec.action)) await ensureTrace(db, nightId, now)
  return { ok: true, act, beat, ...r }
}

// Act 4's round beats: round1 … round5.
export function roundOf(beat) { const m = /^round(\d+)$/.exec(String(beat ?? '')); return m ? Number(m[1]) : 0 }

// How the case gets solved (docs/solving-the-case.md): the last beat of Act 2,
// supper (or any jump past it), leaves every guest's unvisited cats as a note
// and sends everyone to supper; Act 5 pays every Act 4 room any group was not
// paid for, and gives every waiting Parlour Game nobody played a random
// answer. All idempotent.
async function onSolving(db, nightId, act, beat, now) {
  const last2 = deal.beatsOf(2).at(-1)?.key
  if (act > 2 || (act === 2 && beat === last2)) await deal.flushLights(db, nightId, { now })
  if (act >= 5) {
    await act4.flush(db, nightId, { now })
    await deal.settleWaiting(db, nightId, { now })
  }
}

// ---- the big Start the night button (Jon, 12 Nov 2026) --------------------------
// "I will have a big start night button on my phone... Jazz music until 4:30,
// a count down on all screens before that. 4:30 intro goes. I just need a
// check box for it to trigger the real night, otherwise it defaults to a
// runthrough and I can advance in my web app if needed."
//
// One call makes the night and opens Act 1's Arrivals at once, so the jazz,
// the hall bulb and the join code are up from the tap. nights/{id}.introAt
// (ms) is when the intro goes: every room screen counts down to it, and at
// that moment the night moves to The house rules on its own (introDue: the
// first screen to reach zero asks, the minute's tick is the fallback), where
// the music stops, the lights dim and the Parlour TV plays the intro video.
// Next goes sooner. A real night reads the sealed lists, so the tick box is
// refused before the party day; a run-through is a rehearsal like any other.
export const INTRO_MAX_MS = 12 * 60 * 60_000
export const INTRO_EARLY_MS = 1_500 // a screen's clock may run this far ahead of the server's
export const REAL_NIGHT_MESSAGE = 'The real night can only be started on the party day, Sunday 15 November. Untick the box for a run-through.'

// Fill-in players (the polish pass, job A4, 11 Nov 2026; lib/fillins.js): a
// practice night may ask for 0 to 8 seats with no phone, and they are seated
// here, once Arrivals is open, before any guest taps a name. With the
// real-night box ticked a number is refused, before anything is made (the
// phone never sends one then: lib/start.js fillInArg). The fill-in code is
// loaded only when a practice asks for it.
export const FILL_INS_REAL_MESSAGE = 'Fill-in players are for practice nights only. Untick the box, or set Fill-in players to 0.'
export async function startEvening(db, { real = false, introAt = null, fillIns = 0, now = Date.now() } = {}) {
  if (real && now < PARTY_DAY) throw new NightError('closed', REAL_NIGHT_MESSAGE)
  if (real && Number(fillIns) > 0) throw new NightError('invalid', FILL_INS_REAL_MESSAGE)
  const made = await night.createNight(db, { forceRehearsal: !real })
  const at = Math.round(Number(introAt))
  const when = Number.isFinite(at) && at > now && at - now <= INTRO_MAX_MS ? at : null
  await db.doc(`nights/${made.nightId}`).update({ introAt: when })
  await enterBeat(db, made.nightId, 1, 'arrive', { now })
  const seated = !real && Number(fillIns) > 0 ? await seatFillIns(db, made.nightId, fillIns, now) : 0
  return { ...made, ok: true, act: 1, beat: 'arrive', real, introAt: when, ...(seated ? { fillIns: seated } : {}) }
}

// The night is made and live by now, so a seat that could not be made never fails the start:
// the Host tab's list shows who is seated.
async function seatFillIns(db, nightId, count, now) {
  try {
    const fillins = await import('./fillins.js')
    return (await fillins.seatFillIns(db, nightId, count, { now })).seated ?? 0
  } catch (e) {
    console.error('fill-ins not seated', e?.code ?? e?.name ?? 'error')
    return 0
  }
}

// One pass of the fill-ins' moves from the tick (fillins.js stepFillIns): how many it made. A pass that
// fails never fails the tick, which has the night's own clocks to keep.
async function stepFillIns(db, nightId, now) {
  try {
    const fillins = await import('./fillins.js')
    return (await fillins.stepFillIns(db, nightId, { now })).did ?? 0
  } catch (e) {
    console.error('fill-ins not stepped', e?.code ?? e?.name ?? 'error')
    return 0
  }
}

// The intro's time: Arrivals becomes The house rules, once. Never while the
// night is paused or dark, never from any other beat, and never when the host
// came back to Arrivals after the time had passed (Back stays where it is put).
export async function introDue(db, { nightId, now = Date.now() } = {}) {
  if (!nightId) throw new NightError('invalid', 'Which night?')
  const snap = await db.doc(`nights/${nightId}`).get()
  const n = snap.exists ? snap.data() : null
  if (!n || n.phase !== 'act' || n.act !== 1 || n.beat !== 'arrive') return { ok: true, moved: false }
  const at = deal.ms(n.introAt)
  if (!at || now < at - INTRO_EARLY_MS) return { ok: true, moved: false }
  if (deal.ms(n.beatAt) >= at) return { ok: true, moved: false }
  await enterBeat(db, nightId, 1, 'rules', { now })
  return { ok: true, moved: true }
}


// The clock for Acts 2 and 4 (the minute tick, and the Host tab's own while
// those acts run): the supper chime once every guest has seen all four cats
// (F24), and Act 4's warning, lock-in and rounds.
export async function clockTick(db, nightId, now = Date.now(), { allSeen = false } = {}) {
  const n = (await db.doc(`nights/${nightId}`).get()).data()
  if (!n || n.phase !== 'act') return { moved: null }
  // the intro's time has come and no screen said so (introDue below): the minute's tick is the fallback
  if (n.act === 1 && n.beat === 'arrive' && (await introDue(db, { nightId, now })).moved) return { moved: 'rules' }
  if (n.act === 2 && n.beat === 'cat' && allSeen) {
    await enterBeat(db, nightId, 2, 'supper', { now })
    return { moved: 'supper' }
  }
  // Act 6's games beat: once its last game has closed, the drawing starts by itself (A5). Once only
  if (await flow.claimGamesDone(db, nightId, n, { now })) {
    try { await enterBeat(db, nightId, 6, 'drawing', { now }); return { moved: 'drawing' } } catch (e) { return { moved: null, held: e?.code ?? 'failed' } }
  }
  if (n.act === 4) {
    const due = await act4.due(db, nightId, now)
    // a practice night with fill-in players: one clock takes each move (claimMove, below); any other night, as ever.
    // The claim is named for where the move goes (round2, finish): each is made once a night, and a clock that read
    // the night after another moved its beat, but before the round's own record caught up, finds the claim taken.
    // A beat written whose round never started (a throw between the two) is started again by the next clock once the
    // claim has run out (review 12 Nov 2026): only a beat whose Act 4 record has caught up is left alone.
    if (due && n.fillIns && n.forceRehearsal === true && ((n.beat === due && await act4Entered(db, nightId, due)) || !(await claimMove(db, nightId, due, now)))) return { moved: null }
    if (due === 'finish') { await act4.finishRounds(db, nightId, { now }); return { moved: 'finish' } }
    if (due && deal.beatSpec(4, due)) { await enterBeat(db, nightId, 4, due, { now }); return { moved: due } }
  }
  return { moved: null }
}

// A practice night with fill-in players has a fast clock of its own beside
// the Host tab's and the minute's (fillins.js stepFillIns, every two seconds
// from the brain), so two clocks can reach the same Act 4 move in the same
// second, and each would ring its chime. On such a night a clock takes the
// move first, in a transaction, and a clock that finds it taken in the last
// fifteen seconds leaves it alone. (If the one that took it failed, the next
// clock after that takes it again.) Never asked on any other night.
export const MOVE_CLAIM_MS = 15_000
// Has Act 4's public record caught up with the beat (the group cards dealt, the round begun)?
async function act4Entered(db, nightId, beat) {
  const pub = (await db.doc(act4.act4Path(nightId)).get()).data() ?? {}
  if (pub.phase === 'done') return true
  if (beat === 'groups') return !!pub.phase && pub.phase !== 'warn'
  const round = roundOf(beat)
  return !round || (pub.phase === 'rounds' && Number(pub.round) >= round)
}
async function claimMove(db, nightId, key, now) {
  const ref = db.doc(act4.act4PrivatePath(nightId))
  return db.runTransaction(async tx => {
    const snap = await tx.get(ref)
    const at = deal.ms(snap.data()?.moves?.[key])
    if (at && Math.abs(now - at) < MOVE_CLAIM_MS) return false
    if (snap.exists) tx.update(ref, { [`moves.${key}`]: new Date(now) })
    else tx.set(ref, { paid: {}, arrived: {}, moves: { [key]: new Date(now) } })
    return true
  })
}

// Act 4's Next: a round beyond the night's last (four groups or fewer have
// four rounds) goes on to Act 5 instead.
async function skipEmptyRound(db, nightId, to, now = Date.now()) {
  if (to?.act !== 4 || !roundOf(to.beat)) return to
  const rot = await act4.readRotation(db, nightId)
  if (rot?.rounds && roundOf(to.beat) > rot.rounds) {
    await act4.finishRounds(db, nightId, { now })
    return { act: 5, beat: firstBeat(5) }
  }
  return to
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

// The power returns (cue 5): Act 2 in the prompt phase, the latest workshop
// lines, the case dealt blind once, a role card on every phone, the hall bulb
// red, Act 2's Parlour Games laid out, the first beat with its notice, and the
// TV kept dark through the prompt. Run by the Blackout five seconds after the
// dark, or by Power returns by hand. One runner only: the two could land
// together (the Blackout's own return and a Power returns typed on the brain
// in the same second), so the night is moved out of the dark in a
// transaction, and whoever finds it already out answers { already: true } and
// changes nothing. So the case is never dealt twice, whatever the timing.
async function powerReturns(db, nightId, { now = Date.now() } = {}) {
  const ref = db.doc(`nights/${nightId}`)
  const claimed = await db.runTransaction(async tx => {
    const n = (await tx.get(ref)).data()
    if (n?.phase !== 'blackout') return false
    // the same write as night.hostCommand 'power' (the role-dealing act jump still uses that one)
    const stamp = FieldValue.serverTimestamp()
    tx.update(ref, { act: 2, phase: 'prompt', phaseAt: stamp, actStartedAt: stamp, pausedFrom: null, blackout: null })
    return true
  })
  if (!claimed) return { ok: true, already: true }
  await night.publishContent(db, nightId)
  await deal.buildCaseForNight(db, nightId, { now }) // the case for the night, blind, once
  await deal.dealRoles(db, nightId)
  await deal.setHall(db, nightId, 'red', now) // red from here until the drawing is done (cue 5)
  await windows.startParlour(db, nightId, 2, { now }) // Act 2 begins: its Parlour Games
  await ref.update({ beat: firstBeat(2), beatAt: FieldValue.serverTimestamp() })
  await deal.runAction(db, nightId, 2, firstBeat(2), deal.beatSpec(2, firstBeat(2))?.action, { now })
  await screen.onPhase(db, nightId, 'power', { now }) // the TV stays dark through the prompt; no sound (cueSounds)
  return { ok: true }
}

export async function hostCommand(db, { nightId, command, arg, now = Date.now(), sleep = realSleep, clock = null } = {}) {
  // the phone's big Start the night button sends { real, introAt } (12 Nov 2026), and on a practice night
  // { fillIns } too (A4, 11 Nov 2026); a plain create is a night at the doors
  if (command === 'create' && arg && typeof arg === 'object') return startEvening(db, { real: arg.real === true, introAt: arg.introAt, fillIns: arg.fillIns, now })
  if (command === 'create') return night.hostCommand(db, { nightId, command, arg })
  if (!nightId) throw new NightError('invalid', 'Which night?')
  const ref = db.doc(`nights/${nightId}`)
  const snap = await ref.get()
  if (!snap.exists) throw new NightError('no-night', 'No such night.')
  const n = snap.data()

  // A paused night stands still: nothing that moves the beat, the act or the
  // phones runs until the host resumes, so no clock is quietly un-paused
  // without being shifted (resume is what moves them).
  if (n.phase === 'paused' && PAUSE_HELD.has(command)) throw new NightError('invalid', 'The night is paused. Resume first.')

  switch (command) {
    case 'next': {
      // the Host tab sends the act and beat it is showing (review 12 Nov 2026): a Next pressed as a clock moved
      // the night on moves nothing, so a group is never sent past a room it never played. No `from`, as ever.
      if (arg && typeof arg === 'object' && typeof arg.from === 'string' && arg.from !== `${n.act ?? 0}/${n.beat ?? ''}`) return { ok: true, moved: null, stale: true }
      if (n.phase === 'blackout') throw new NightError('invalid', 'Press Power returns first.')
      await refuseIfDrawing(db, nightId, n)
      await settleIfDue(db, nightId, now)
      const to = await skipEmptyRound(db, nightId, nextOf(n.act, n.beat), now)
      if (!to) throw new NightError('invalid', n.act === 1 ? 'That is the end of Act 1. Press Blackout.' : 'That is the end of the night.')
      if (deal.beatSpec(to.act, to.beat)?.action === 'results') await finale.requireNamed(db, nightId) // the screen names all three first
      // Act 1 begins: copy the latest workshop lines (rules, bios, cat cards) to the phones first
      if (n.act === 0) await night.publishContent(db, nightId)
      return enterBeat(db, nightId, to.act, to.beat, { now })
    }
    case 'back': {
      const to = prevOf(n.act, n.beat)
      if (!to) throw new NightError('invalid', 'Nothing before this.')
      if (deal.beatSpec(n.act, n.beat)?.action === 'reveal') await finale.unreveal(db, nightId) // the screen forgets; nothing was named early
      return enterBeat(db, nightId, to.act, to.beat, { now, run: false })
    }
    case 'beat': {
      // jump to a named beat of the current act and run it (re-running is harmless: cards deal once)
      const spec = deal.beatSpec(n.act, arg)
      if (!spec) throw new NightError('invalid', 'No such beat in this act.')
      if (arg !== n.beat) await refuseIfDrawing(db, nightId, n)
      if (spec.action === 'results') await finale.requireNamed(db, nightId)
      await settleIfDue(db, nightId, now)
      return enterBeat(db, nightId, n.act, arg, { now })
    }
    case 'act': {
      const act = Number(arg)
      if (!ACT_KEYS.includes(act)) throw new NightError('invalid', 'Acts run 1 to 7.')
      await settleIfDue(db, nightId, now)
      await night.publishContent(db, nightId) // the latest workshop lines, every time an act is chosen
      // Act 2 begins with the power returning. Jumping to Act 2 or past it
      // before the roles are out (a phone died mid-blackout, a rehearsal
      // shortcut) does what Power returns does first: the case is built,
      // blind, once, and every phone gets its role card and shows it before
      // the act starts. A night whose roles are already out jumps straight.
      const rolesOut = !!(await deal.readCase(db, nightId))?.roles
      if (act >= 2 && !rolesOut) {
        await night.hostCommand(db, { nightId, command: 'power' })
        await deal.buildCaseForNight(db, nightId, { now }) // the case for the night, blind, once
        await deal.dealRoles(db, nightId)
        await deal.setHall(db, nightId, 'red', now) // the hall bulb red from the power's return, as the power sequence does
        return enterBeat(db, nightId, act, firstBeat(act), { now, phase: 'prompt' })
      }
      if (act < 7) await finale.unreveal(db, nightId) // a jump back from the reveal forgets it
      await ref.update({ actStartedAt: FieldValue.serverTimestamp() })
      return enterBeat(db, nightId, act, firstBeat(act), { now })
    }
    case 'blackout': {
      // Act 1 ends in the dark (cue 4): every phone and screen goes black with the blackout sound. Five
      // seconds later, on the server's clock, the power comes back on its own (cue 5, blackoutAuto,
      // 25 Oct 2026): the same sequence as Power returns, timed five seconds after the press. A night
      // paused or moved during those seconds is left as it is; Power returns by hand does it when the
      // host is ready. Act 1 only: since the return moves the night to Act 2 on its own, a press in
      // any other act is refused (the act buttons move the night), and a second press in the dark
      // changes nothing.
      // Since 11 Nov 2026 (A1, lib/blackout.js) three marks: the press writes them and the brain stops
      // the music; the dark lands BLACKOUT_LEAD_MS later (the phase, the TV and the scream, every
      // device cutting on its own clock at the mark); the power five seconds after the dark.
      if (n.phase === 'blackout') return { ok: true, already: true }
      if (n.act !== 1) throw new NightError('invalid', 'The blackout ends Act 1. To move the night, press an act.')
      const marks = await pressBlackout(db, nightId, { now })
      // a Blackout test still running refuses the real one (no case is dealt over a test), and the reply says so
      // (review 12 Nov 2026), so the Host tab can say to press again in a few seconds
      if (!marks) return { ok: true, already: await testRunning(db, nightId, now) ? 'test' : true }
      const darkAt = marks.darkAt.getTime()
      const powerAt = marks.powerAt.getTime()
      // review 12 Nov 2026 ("those cues need to get tight as hell"): the scream is written at the press, stamped
      // for the dark mark, so every page has it in hand and starts it on the mark; each wait runs to its mark
      // (the time left, never a fixed length), so the reads and writes on the way do not stretch the dark
      const until = blackoutClock(now, sleep, clock)
      await screen.play(db, nightId, 'blackout', { now: darkAt, ahead: true })
      await until(darkAt)
      // paused or moved during the lead: no dark at all, the marks come off and the scream is called off
      const still = (await ref.get()).data()
      if (still?.phase === 'paused' || still?.act !== 1) { await clearBlackout(db, nightId, marks); await screen.callOff(db, nightId, 'blackout', { now: until.now() }); return { ok: true, powerReturned: false, dark: false } }
      await night.hostCommand(db, { nightId, command: 'blackout', arg, now: darkAt })
      await screen.onPhase(db, nightId, 'blackout', { now: darkAt, sound: false })
      await until(powerAt)
      // if the night was paused, moved, or brought back by hand during the wait, this press returns nothing
      const r = await powerReturns(db, nightId, { now: powerAt })
      return { ok: true, powerReturned: !r.already }
    }
    case 'blackout-test': {
      // The Blackout test (A1, practice nights only): the same three marks, and only them. No phase,
      // act, beat, screen or case is touched: each device goes dark at the mark on its own clock and
      // comes back at the power's mark by itself. The scream plays from the sounds doc at the dark.
      if (!(n.forceRehearsal || n.rehearsal)) throw new NightError('invalid', 'The Blackout test is for a practice night only.')
      if (n.phase === 'blackout') return { ok: true, already: true }
      const marks = await pressBlackout(db, nightId, { now, test: true })
      if (!marks) return { ok: true, already: true }
      const darkAt = marks.darkAt.getTime()
      const until = blackoutClock(now, sleep, clock)
      await screen.play(db, nightId, 'blackout', { now: darkAt, ahead: true }) // in hand at the press, played at the dark (review 12 Nov)
      await until(darkAt)
      await until(marks.powerAt.getTime())
      await clearBlackout(db, nightId, marks)
      return { ok: true, test: true }
    }
    case 'power': {
      // Power returns by hand: what the Blackout does on its own after five seconds. Once the power is
      // back (the night has left the blackout) a press changes nothing, so one after the automatic
      // return, or a second press, is harmless.
      if (n.phase !== 'blackout') return { ok: true, already: true }
      return powerReturns(db, nightId, { now })
    }
    case 'light-up':
      // Every phone lights up with three questions, any time in Acts 2, 4 and 6. In Act 4 the
      // game waits on each phone until the guest is free (handoff 23 Oct §3).
      if (![2, 4, 6].includes(n.act)) throw new NightError('invalid', 'The phones light up in Acts 2, 4 and 6.')
      // only in the games' own beats, and never over a bulletin, Sir Irwin, the drawing or anything after it (A5)
      if (await flow.parlourHold(db, nightId, n, now)) throw new NightError('invalid', flow.NOT_NOW)
      if (n.act === 6) throw new NightError('invalid', flow.ACT6_OWN) // its own two, by themselves, and no more
      if (n.act === 4) return deal.dealWaitingGame(db, nightId, { now, act: 4 })
      await settleIfDue(db, nightId, now)
      return deal.openWindow(db, nightId, 'questions', { now, act: n.act }) // no beat: a fresh window every press
    case 'supper': {
      // Supper's ready (Act 2): the cat queue closes, every phone goes to supper, the cats a guest
      // never reached leave their lines as a note (F24)
      if (n.act !== 2) throw new NightError('invalid', "Supper's ready is for Act 2.")
      if (n.beat === 'supper') return { ok: true, already: true }
      await settleIfDue(db, nightId, now)
      return enterBeat(db, nightId, 2, 'supper', { now })
    }
    case 'start-act4': {
      // Start Act 4 (end of supper): the two-minute warning, then the groups and the rounds on the clock
      if (n.act === 4) return { ok: true, already: true }
      if (n.act !== 3) throw new NightError('invalid', 'Start Act 4 comes at the end of supper, in Act 3.')
      await settleIfDue(db, nightId, now)
      await night.publishContent(db, nightId)
      return enterBeat(db, nightId, 4, firstBeat(4), { now })
    }
    case 'scene': {
      // the house: one of the six Hue scenes, by hand (the brain recalls it; cues/)
      const name = SCENES.find(x => x.toLowerCase() === String(arg ?? '').trim().toLowerCase())
      if (!name) throw new NightError('invalid', 'Pick one of the six scenes.')
      await db.doc(`nights/${nightId}/public/cues`).set({ scene: { name, at: new Date(now) } }, { merge: true })
      return { ok: true, scene: name }
    }
    case 'music': {
      // the brain's music by hand: play, pause, or the next playlist (cues/)
      if (!MUSIC_COMMANDS.includes(arg)) throw new NightError('invalid', 'Play, pause or next.')
      await db.doc(`nights/${nightId}/public/cues`).set({ music: { command: arg, at: new Date(now) } }, { merge: true })
      return { ok: true, music: arg }
    }
    case 'sound-test': {
      // Sound test (cue 2, 25 Oct 2026): a cue's sound on every room screen and phone, so the room hears
      // them work. With no arg the chime; with a cue id (the Host tab's list, 11 Nov 2026), that cue
      // once. Nothing else moves.
      const id = arg ? String(arg) : 'chime-phone'
      if (!screen.SOUND_IDS.includes(id)) throw new NightError('invalid', 'No such sound.')
      return screen.play(db, nightId, id, { now })
    }
    case 'cake': {
      // Cake! (cue 13, 25 Oct 2026): a fresh stamp on public/cues.cake, which the brain plays Happy
      // Birthday for Dogs from and recalls the candles scene (cues/); the Parlour TV shows the
      // birthday card until the next beat's screen. Shown in Act 5. The one screen it never
      // replaces is Sir Irwin's countdown (kind 'irwin'): his motive cards are part of the clue
      // path, so a press during "Sir Irwin speaks" plays the song and leaves his screen alone
      // (card: false in the reply, so the Host tab says so).
      await db.doc(`nights/${nightId}/public/cues`).set({ cake: { at: new Date(now) } }, { merge: true })
      const current = await screen.readScreen(db, nightId)
      const card = current?.kind !== 'irwin'
      if (card) await screen.birthday(db, nightId, { now })
      return { ok: true, cake: true, card }
    }
    case 'at-the-paper': {
      // At the paper (cue 17, 25 Oct 2026): the drawer is at the paper, so the walk ends now and the
      // square shows at once. Refused unless someone is walking (relay.atThePaper), and while paused.
      await relay.atThePaper(db, { nightId, now })
      const r = await advanceRelay(db, { nightId, now })
      return { ok: true, atPaper: true, state: r.state }
    }
    case 'settle':
      return deal.settleWindow(db, nightId, { now })
    case 'relay-start':
      // a drawing under way is kept unless the host said "restart" (the Host tab asks first)
    {
      const r = await relay.start(db, { nightId, now, force: arg === 'force' })
      await flow.closeParlour(db, nightId, { now }) // the drawing has started: no Parlour Game after it (A5)
      return r
    }
    case 'relay-reset':
      return relay.reset(db, { nightId, now })
    case 'relay-advance':
      return advanceRelay(db, { nightId, now })
    case 'groups':
      // the Act 4 groups (act4.makeRooms), so the hidden roles stay apart; once made they are kept,
      // since remaking them would scramble the rooms, unless the host says force
      return act4.makeRooms(db, nightId, { force: arg === 'force' })
    case 'station-key':
      return station.setStationKey(db, arg)
    case 'study-tick':
      // the clock for a study with no station: ends a slot that has run out, once
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
    case 'tick': {
      // the once-a-minute clock (the schedule in index.js, the Host tab while Acts 2 and 4 run):
      // settles a window past its close and its grace, moves the Act 2 line on, pops up a Parlour
      // Game that is due, then the supper chime and Act 4's rounds (clockTick); a paused night is left alone
      const r = await windows.tick(db, nightId, now)
      if (r.skipped) return r
      const clock = await clockTick(db, nightId, now, { allSeen: !!r.lights?.allSeen })
      // a practice night's fill-in players (A4, 11 Nov 2026): this tick moves any whose pause has run out, so they
      // still play when nothing else is running them. Asked only on a night that has them; a count comes back.
      const fill = n.fillIns && n.forceRehearsal === true ? { fillIns: await stepFillIns(db, nightId, now) } : {}
      return { ...r, clock: clock.moved, ...fill }
    }
    case 'note-exposure':
      // the older name for the Hush: the same record, through the same path (safeguards.js, ledger.js)
      return safeguards.hush(db, { nightId, role: arg, now })
    case 'reveal-stage':
      // Act 7: one more name onto the living room screen, Murderer, then Motive, then Victim
      return finale.stage(db, nightId, { now })
    case 'finale-hold':
      return finale.hold(db, nightId, { now })
    case 'finale-go':
      return finale.go(db, nightId, { now })
    case 'award':
      // an achievement from the workshop list onto a guest's phone (guestKey:n), through Act 5
      return finale.award(db, nightId, { arg, now })
    case 'fetch-champion': {
      // the first guest the real Sir Irwin brings a toy to: once, an achievement in the end credits
      const key = String(arg ?? '').trim()
      if (!n.roster?.[key]) throw new NightError('no-guest', 'Pick a guest who is at the party.')
      if (n.fetchChampion) return { ok: true, already: true }
      await ref.update({ fetchChampion: key })
      return { ok: true }
    }
    case 'salem-petted':
      // the real Salem chose a guest: their Salem goes to 5 (never the hosts)
      return deal.salemPetted(db, nightId, { arg, now })
    case 'dry-run':
      return discard.markDryRun(db, { nightId })
    case 'settle-now':
      // a dry run may close a window early; the party never does (CLIENT RULES)
      if (n.dryRun !== true) throw new NightError('invalid', 'Only a dry run night may close a window early.')
      return deal.settleWindow(db, nightId, { now, force: true })
    case 'discard-night':
      return discard.discardNight(db, { nightId })
    case 'tv-trace':
      // the living room TV shows the trace after the door (the bedroom screen's fallback); 'off' takes it down
      return screen.tvTrace(db, nightId, arg !== 'off', { now })
    case 'ipad':
      return setIpad(db, nightId, arg, { now }) // the Host tab's row The iPad shows (ipad.js)
    case 'spill':
      // Spill the Beans: the engine decides silently (safeguards.js); { did: false } carries no reason
      return safeguards.spill(db, { nightId, now })
    case 'good-night':
      // after The End, the host's phone closes the night (closing.js); the house stays on The End, jazz and Default
      return goodNight(db, nightId, { now })
    case 'hush':
      // the Hush: that role's answers move no dial from now on; no phone changes
      return safeguards.hush(db, { nightId, role: arg, now })
    default: {
      // pause, resume (every deadline shifts by the pause length: night.PAUSE_SHIFTED lists the fields), handover, and the base commands
      const r = await night.hostCommand(db, { nightId, command, arg, now })
      // the room screens follow (screen.js); a second Pause or Resume that changed nothing moves no screen either
      if (['pause', 'resume'].includes(command) && !r?.already) await screen.onPhase(db, nightId, command, { now })
      return r
    }
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

// The room's guess, tapped by the host on their phone (or on the main computer,
// the fallback), plus the same moment as above: a right guess on the last
// picture opens the door and lands the trace.
export async function guessRelay(db, { nightId, pick, now = Date.now() } = {}) {
  const r = await relay.guess(db, { nightId, pick, now })
  if (r?.state === 'done') {
    const t = await ensureTrace(db, nightId, now)
    if (t?.trace) r.trace = t.trace
  }
  return r
}

// The study station says a group is done (solved, or its own cap): the trace
// is dealt (station.js) and Granolia's bag hint with it (act4.payRoom). The
// rounds are on the clock now (23 Oct 2026), so a finish never moves the house.
export async function studyFinished(db, { nightId, payload = {}, now = Date.now() } = {}) {
  const r = await station.stationCommand(db, { nightId, station: 'study', command: 'finished', payload })
  if (r.repeated) return r
  if (payload.outcome === 'solved') await screen.play(db, nightId, 'sting-solved', { now }) // the house hears the study solved
  const gid = r.groupId ?? payload.groupId
  if (gid) await act4.payRoom(db, nightId, gid, 'study', { outcome: payload.outcome === 'solved' ? 'done' : 'capped', now })
  return { ...r, rotated: false }
}

// A code on a room's wall (?meet=<cat>): in Act 2 the guest is with that cat;
// in Act 4 the group has arrived in that room, and Salem's game and Boo's
// arcade visit start for it.
async function meetCat(db, args) {
  const n = (await db.doc(`nights/${args.nightId}`).get()).data()
  if (n?.act !== 4) return deal.meetCat(db, args)
  const r = await act4.scanRoom(db, args)
  if (r.room === 'orangerie') await act4.salemArrive(db, args.nightId, r.groupId, { now: args.now ?? Date.now() })
  if (r.room === 'entryway') await act4.booArrive(db, args.nightId, r.groupId, { now: args.now ?? Date.now() })
  return { ok: true, room: r.room }
}

// After a guest's step in the Act 2 line: the supper chime once everyone has seen all four (F24).
async function afterLights(db, nightId, r, now = Date.now()) {
  if (r?.allSeen) await clockTick(db, nightId, now, { allSeen: true })
  return r
}

// A window closed because the last seat dealt it answered (handoff 11 Nov 2026,
// A6: "When anything is entered by the last person, automatically continue").
// A seat that joined after the window opened still gets its random pick. This
// runs inside the last seat's own call, so it never throws: that seat's answer
// is in, whatever happens here, and the minute's tick and the host's Next are
// the fallback.
async function afterAllIn(db, nightId) {
  try {
    await deal.fillDefaults(db, nightId)
  } catch (e) {
    console.error('after the last answer', e?.code ?? e?.name ?? 'error')
  }
}

// A practice night with fill-in players (A4, 11 Nov 2026): when a real
// player's Lock in leaves only fill-ins still to vote, they vote at once
// (fillins.js voteNow), so the vote closes on the real players' own last tap,
// with every seat counted, whether or not anything is running the fill-ins.
// Asked only on a practice night that has them; never throws, since that
// player's ballot is in whatever happens here.
async function fillInsVoteNow(db, nightId, uid, now) {
  try {
    if (isFillInUid(uid)) return
    const n = (await db.doc(`nights/${nightId}`).get()).data()
    if (!n?.fillIns || n.forceRehearsal !== true) return
    const fillins = await import('./fillins.js')
    await fillins.voteNow(db, nightId, { now })
  } catch (e) {
    console.error('fill-ins not voted', e?.code ?? e?.name ?? 'error')
  }
}

// A Parlour Game closed on its last answer (review 12 Nov 2026, A6 step 6): the
// seats that joined late get their pick, then the night carries on at once: in
// Act 6 the second game opens (windows.tickParlour) and after it the drawing
// starts (clockTick). Never throws: the answer is in, and the minute's tick and
// the host's Next are the fallback.
async function afterGameIn(db, nightId, now) {
  await afterAllIn(db, nightId)
  try {
    await windows.tickParlour(db, nightId, now)
    await clockTick(db, nightId, now)
  } catch (e) {
    console.error('after the last answer', e?.code ?? e?.name ?? 'error')
  }
}

// The same for a Parlour Game as fillInsVoteNow is for the vote: when a real
// phone's answer leaves only fill-ins to answer, they answer at once.
async function fillInsAnswerNow(db, nightId, uid, now) {
  try {
    if (isFillInUid(uid)) return
    const n = (await db.doc(`nights/${nightId}`).get()).data()
    if (!n?.fillIns || n.forceRehearsal !== true) return
    const fillins = await import('./fillins.js')
    await fillins.answerNow(db, nightId, { now })
  } catch (e) {
    console.error('fill-ins not answered', e?.code ?? e?.name ?? 'error')
  }
}

// What a player phone may call, besides join.
export const player = {
  // a Parlour Game: the reply is { ok }, { ok, already } or { ok, late }, whoever answered last
  answer: async (db, args) => {
    const { closed, ...reply } = await deal.answer(db, args)
    const now = args.now ?? Date.now()
    if (closed) await afterGameIn(db, args.nightId, now)
    else if (!reply.already && !reply.late) await fillInsAnswerNow(db, args.nightId, args.uid, now)
    return reply
  },
  // the vote: the reply is { ok } or { ok, already }, whoever locked in last
  ballot: async (db, args) => {
    const { closed, ...reply } = await deal.castBallot(db, args)
    if (closed) await afterAllIn(db, args.nightId)
    else if (!reply.already) await fillInsVoteNow(db, args.nightId, args.uid, args.now ?? Date.now())
    return reply
  },
  relayVote: (db, args) => relay.vote(db, args),
  relayGuess: (db, args) => guessRelay(db, args),
  relayAdvance: (db, args) => advanceRelay(db, args),
  // Act 2: a guest scans the code in a cat's room, taps Done when they have read it, or asks to be called later;
  // in Act 4 the same codes mark a group's arrival in a room
  meetCat: async (db, args) => (await meetCat(db, args).then(r => afterLights(db, args.nightId, r, args.now))),
  leaveCat: async (db, args) => afterLights(db, args.nightId, await deal.leaveCat(db, args), args.now),
  notYet: (db, args) => deal.notYet(db, args),
  // Act 4: Locked in; the iPad's boards; Salem's game; the arcade's clue moment (the Mac, 5 Nov 2026)
  lockIn: async (db, args) => { const r = await act4.lockIn(db, args); await clockTick(db, args.nightId, args.now ?? Date.now()); return r },
  memoryStep: (db, args) => act4.memoryStep(db, args),
  salemReady: (db, args) => act4.salemReady(db, args),
  salemSlip: (db, args) => act4.salemSlip(db, args),
  salemPassed: (db, args) => act4.salemPassed(db, args),
  arcadeClue: (db, args) => act4.arcadeClue(db, args),
  // Act 4, the Entryway: a round of one of Miss Boo LaRue's five games, from the arcade's Mac (30 Oct 2026)
  arcadeScore: (db, args) => recordArcadeScore(db, args),
}
