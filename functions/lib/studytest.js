// The Study test: Jon tries the Act 4 light game on the real walls from his
// phone, with no terminal. The workshop's Study test page queues a command
// (flash the walls, teach the taps, play a practice round, stop, press a
// button-box key); the study station (station/ on the M1 Air) watches the
// queue, carries it out in its test mode, and reports back how the walls
// are. Both docs are written here and only here, with the Admin SDK:
//
//   public_state/study_test          the queue, workshop -> station
//     { seq, queue: [{ seq, command, name, at }], updatedAt }
//     seq goes up by one per command, from 1; the newest 30 are kept,
//     oldest first. The station skips anything older than two minutes.
//   public_state/study_test_status   the report, station -> workshop
//     { mode, message, walls, deck, teach, practice, lastTap, seenSeq,
//       stationAt, updatedAt }
//
// One callable, `studyTest` (functions/index.js):
//   status   the station, with its key word (the same key as stationCommand)
//   flash, teach, practice, stop, key { name }   the admin only
//
// SEAL RULE: nothing here reads sealed/*, cases/* or nights/*, and nothing
// here touches a night, the rotation or a clue. A practice round is made up
// on the station and means nothing. public_state is readable by any
// signed-in client, so the report is whitelisted field by field: the
// station's words, counts and the practice round's state, never a pattern.
// Every answer is an ok flag and a seq.

import { FieldValue } from 'firebase-admin/firestore'
import { NightError } from './night.js'
import { stationAllowed } from './station.js'

export const QUEUE_DOC = 'public_state/study_test'
export const STATUS_DOC = 'public_state/study_test_status'
export const QUEUE_KEEP = 30

export const COMMANDS = ['flash', 'teach', 'practice', 'stop', 'key']
// The button box's keys, as the station's runner names them (station/lib/streamdeck.js).
export const KEY_NAMES = ['red', 'yellow', 'green', 'blue', 'pink', 'white', '1', '2', '3', '4', '5', '6', 'undo', 'submit']
export const MODES = ['idle', 'flash', 'teach', 'practice']
export const DECKS = ['stream-deck', 'keyboard']
export const TEXT_MAX = 200

const COUNT_MAX = 999                     // panels, rounds, misses: never near this
const BIG_MAX = Number.MAX_SAFE_INTEGER   // clocks in milliseconds, and seq

// ---- the report's cleaners. Anything not listed is dropped; arrays are
// never taken; a wrong type falls back to a safe default.

const isObj = v => !!v && typeof v === 'object' && !Array.isArray(v)

function int(v, { min = 0, max = COUNT_MAX } = {}) {
  const n = typeof v === 'string' && v.trim() === '' ? NaN : Number(v)
  if (typeof v === 'boolean' || !Number.isFinite(n)) return min
  return Math.min(max, Math.max(min, Math.trunc(n)))
}

function text(v) {
  if (typeof v === 'string') return v.slice(0, TEXT_MAX)
  if (typeof v === 'number' && Number.isFinite(v)) return String(v)
  return ''
}

// A string or null: the entry so far, the outcome.
function textOrNull(v) {
  if (v === null || v === undefined) return null
  if (typeof v !== 'string' && !(typeof v === 'number' && Number.isFinite(v))) return null
  return text(v)
}

function walls(v) {
  const e = isObj(v) && isObj(v.elements) ? v.elements : {}
  const l = isObj(v) && isObj(v.lines) ? v.lines : {}
  return {
    elements: { ok: e.ok === true, panels: int(e.panels), lights: int(e.lights), taught: int(e.taught) },
    lines: { ok: l.ok === true, bars: int(l.bars) },
  }
}

function teach(v) {
  if (!isObj(v)) return null
  return { step: int(v.step, { min: 1 }), of: int(v.of) }
}

// What the colour bars would show, sent only while the Lines wall is down.
function shown(v) {
  if (!isObj(v) || typeof v.colour !== 'string' || !v.colour) return null
  const number = typeof v.number === 'number' ? int(v.number) : text(v.number)
  return { colour: text(v.colour), number }
}

// `linesDown` is the same report saying, in so many words, that the colour
// bars are down (walls.lines.ok === false): the answer they would show is
// kept only then, and only while a pair is being entered, whatever the
// station sent.
function practice(v, linesDown) {
  if (!isObj(v)) return null
  const entry = isObj(v.entry) ? v.entry : {}
  const state = text(v.state)
  return {
    state,
    round: int(v.round, { min: 1 }), rounds: int(v.rounds),
    pattern: int(v.pattern, { min: 1 }), patterns: int(v.patterns),
    pairs: int(v.pairs),
    entry: { colour: textOrNull(entry.colour), number: textOrNull(entry.number) },
    misses: int(v.misses),
    outcome: textOrNull(v.outcome),
    shown: linesDown && state === 'entering' ? shown(v.shown) : null,
  }
}

function lastTap(v) {
  if (!isObj(v)) return null
  return {
    panel: v.panel === null || v.panel === undefined ? null : int(v.panel, { min: 1 }),
    known: v.known === true,
    at: int(v.at, { max: BIG_MAX }),
  }
}

export function cleanStatus(raw) {
  const s = isObj(raw) ? raw : {}
  const linesDown = isObj(s.walls) && isObj(s.walls.lines) && s.walls.lines.ok === false
  return {
    mode: MODES.includes(s.mode) ? s.mode : 'idle',
    message: text(s.message),
    walls: walls(s.walls),
    deck: DECKS.includes(s.deck) ? s.deck : 'keyboard',
    teach: teach(s.teach),
    practice: practice(s.practice, linesDown),
    lastTap: lastTap(s.lastTap),
    seenSeq: int(s.seenSeq, { max: BIG_MAX }),
    stationAt: int(s.stationAt, { max: BIG_MAX }),
  }
}

// The station's report. A set, not a merge: what the station no longer
// says is gone.
export async function saveStatus(db, status) {
  await db.doc(STATUS_DOC).set({ ...cleanStatus(status), updatedAt: FieldValue.serverTimestamp() })
  return { ok: true }
}

// One command onto the queue, in a transaction so two taps at once both
// land, each with its own seq. A server timestamp cannot sit inside an
// array, so each entry carries the server's clock as a Date.
export async function queueCommand(db, { command, name = null, now = Date.now() } = {}) {
  const ref = db.doc(QUEUE_DOC)
  return db.runTransaction(async tx => {
    const snap = await tx.get(ref)
    const d = snap.exists ? snap.data() : {}
    const seq = (Number.isInteger(d.seq) && d.seq > 0 ? d.seq : 0) + 1
    const old = Array.isArray(d.queue) ? d.queue.filter(isObj) : []
    const queue = [...old, { seq, command, name, at: new Date(now) }].slice(-QUEUE_KEEP)
    tx.set(ref, { seq, queue, updatedAt: FieldValue.serverTimestamp() })
    return { ok: true, seq }
  })
}

// The callable's whole job. The command is checked first, then who is
// asking, then the key's name.
export async function studyTestRequest(db, { command, name, key, status, isAdmin = false, now = Date.now() } = {}) {
  if (command === 'status') {
    if (!(await stationAllowed(db, { key, isAdmin }))) throw new NightError('permission-denied', 'That is not the station key.')
    return saveStatus(db, status)
  }
  if (!COMMANDS.includes(command)) throw new NightError('invalid', 'The study test does not know that command.')
  if (!isAdmin) throw new NightError('permission-denied', 'Only the workshop can do that.')
  if (command === 'key' && !KEY_NAMES.includes(name)) throw new NightError('invalid', 'That is not a key on the button box.')
  return queueCommand(db, { command, name: command === 'key' ? name : null, now })
}
