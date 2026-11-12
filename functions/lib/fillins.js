// Fill-in players (the polish pass, job A4, 11 Nov 2026). Jon, after the
// 11 Nov practice: "I would like additional characters to play with us, but
// not have devices... let's just add 6 other people... fill and substitute,
// that are playing along with us."
//
// A fill-in is a seat with no phone: a name from the list below, a character
// from the deck, a bag number and, at the blackout, any role by the same deal
// as everyone. The Start card on Jon's phone asks for 0 to 8 of them on a
// practice night (run.js startEvening), and seatFillIns makes the seats.
//
// PRACTICE NIGHTS ONLY. Nothing in this file acts unless the night is a
// practice (nights/{id}.forceRehearsal === true) and the party day has not
// come (morning.js PARTY_DAY). The file is loaded only when a night asks for
// fill-ins (a dynamic import in run.js and index.js), so the party night
// never runs a line of it. The gates that keep a fill-in from ever holding
// the night up live in lib/seats.js.
//
// SEAL RULE: nothing here reads sealed/* or cases/*, and nothing here returns
// or logs anything a seat was dealt. Results are counts and keys.

import { FieldValue } from 'firebase-admin/firestore'
import { NightError, nameKey, seatFillIn, MOTIVES } from './night.js'
import { PARTY_DAY } from './morning.js'
import { fillInUid, fillInKeys, isFillIn, isFillInUid } from './seats.js'
import { seededUnit } from './case.js'
import { ms } from './deal.js'
import { act4Path, LOCK_MS } from './act4.js'
import * as run from './run.js'

// The fill-ins' names (Jon's six, 11 Nov 2026; seven and eight are the default
// built, his to change). A count of N seats the first N, skipping a name a
// real guest or a host already has.
export const FILL_IN_NAMES = ['Mabel', 'Gus', 'Dot', 'Walt', 'Pearl', 'Otis', 'Hazel', 'Ned']
export const MAX_FILL_INS = FILL_IN_NAMES.length

// What the Start card sent, as a count from 0 to 8. Anything else is 0.
export function fillInCount(n) {
  const k = Math.floor(Number(n))
  return Number.isFinite(k) ? Math.max(0, Math.min(MAX_FILL_INS, k)) : 0
}

// Counts only, and quiet under node:test.
const quietLog = line => { if (!process.env.NODE_TEST_CONTEXT) console.log(line) }

// Seat the fill-ins, once. Called by the big Start button's command after
// Arrivals has opened, so they are on the roster before the first guest taps
// a name. Safe to call again: a name already seated is not seated twice, and
// a second call only ever tops the seats up to `count`.
// Returns { ok, seated, why? }: `seated` is how many fill-in seats the night
// has now; `why` says why nobody was seated ('real-night', 'party-day').
export async function seatFillIns(db, nightId, count, { now = Date.now(), log = quietLog } = {}) {
  const want = fillInCount(count)
  if (!want) return { ok: true, seated: 0 }
  if (now >= PARTY_DAY) return { ok: true, seated: 0, why: 'party-day' }
  const ref = db.doc(`nights/${nightId}`)
  const snap = await ref.get()
  if (!snap.exists) throw new NightError('no-night', 'No such night.')
  const night = snap.data()
  // the real night never has one: this is the gate, and night.seatFillIn holds the same one again
  if (night.forceRehearsal !== true) return { ok: true, seated: 0, why: 'real-night' }
  const hostKeys = new Set(Object.values(night.hosts ?? {}).map(h => h.key))
  let seated = fillInKeys(night.roster).length
  for (let i = 0; i < FILL_IN_NAMES.length && seated < want; i++) {
    const name = FILL_IN_NAMES[i]
    const key = nameKey(name)
    if (hostKeys.has(key)) continue
    const entry = ((await ref.get()).data()?.roster ?? {})[key]
    if (entry) continue // a real guest of that name, or a fill-in already seated (counted above)
    try {
      await seatFillIn(db, { uid: fillInUid(nightId, i), nightId, name })
      seated++
    } catch (e) {
      if (e instanceof NightError && e.code === 'full') break // every character is spoken for: seat who fits
      throw e
    }
  }
  if (seated) await ref.update({ fillIns: seated })
  log(`fill-ins ${JSON.stringify({ nightId, asked: want, seated })}`)
  return { ok: true, seated }
}

// How many fill-in seats a night has now (a seat a real phone took over is a real one).
export function fillInSeats(night) { return Object.values(night?.roster ?? {}).filter(isFillIn).length }

// ---------------------------------------------------------------------------
// Playing them. A fill-in does what a guest with a phone would, after a
// human pause: taps Locked in a few seconds after its group card, answers
// every Parlour Game in 5 to 20 seconds (the ones on every phone in Acts 2
// and 6, and the ones that wait on the phone in Act 4), and votes within 20
// seconds. Every move goes through run.player, the same calls a phone makes,
// so a fill-in can do nothing a phone cannot.
//
// stepFillIns is one pass: it makes every move whose pause has run out, and
// nothing else. It keeps no state of its own. Whether a move is due is worked
// out from the night's own clocks (when the window opened, when the group
// cards went out) and a pause that is fixed for the seat and the moment, so
// any caller, however often, gets the same answer, and a move already made is
// never made twice. Three clocks call it: the driver on the brain every two
// seconds (the `fillIns` callable, index.js; npm run fill-ins), and, if
// nobody started that, the Host tab's own tick and the server's minute tick
// (run.js 'tick'), so the fill-ins still play, only slower.
//
// What a fill-in never does: visit a cat (it is not in the line, seats.js),
// play a room's game (its group is paid at the chime), draw (never called),
// or close a notice (a phone-only tap that nothing waits for).

// How long a fill-in waits before each kind of move, in ms: [shortest, longest].
export const PAUSES = { lock: [3_000, 10_000], answer: [5_000, 20_000], vote: [5_000, 20_000] }
export function pauseMs(nightId, key, kind, tag = '') {
  const [lo, hi] = PAUSES[kind]
  return Math.round(lo + (hi - lo) * seededUnit('fill-in-pause', nightId, key, kind, tag))
}
// A fill-in's choice among n things: fixed for the seat and the question, so
// two callers in the same second send the same answer.
function choose(n, nightId, key, ...tag) {
  return Math.min(n - 1, Math.floor(seededUnit('fill-in-pick', nightId, key, ...tag) * n))
}
function picksFor(nightId, key, windowId, set) {
  return (set?.beats ?? []).map((b, i) => (b.choices ?? [])[choose((b.choices ?? []).length, nightId, key, windowId, i)]?.k)
}
// The vote: a name, a motive and another name, at random. (`ghost` rides
// along with `victim`, the same pick, for whichever the ballot reads.)
function ballotFor(nightId, key, night) {
  const keys = Object.keys(night.roster ?? {}).sort()
  const murderer = keys[choose(keys.length, nightId, key, 'vote', 'murderer')]
  const rest = keys.filter(k => k !== murderer)
  const pool = rest.length ? rest : keys
  const victim = pool[choose(pool.length, nightId, key, 'vote', 'victim')]
  const motive = MOTIVES[choose(MOTIVES.length, nightId, key, 'vote', 'motive')].n
  return { murderer, motive, victim, ghost: victim }
}

// One pass. Returns counts and keys only: { ok, on, why?, act, seats, did,
// locked, answered, voted, clock? }. `on` is false, with a reason, on any
// night the fill-ins do not play: the party day, the real night, no fill-ins.
export async function stepFillIns(db, nightId, { now = Date.now() } = {}) {
  const off = why => ({ ok: true, on: false, why, did: 0 })
  if (now >= PARTY_DAY) return off('party-day')
  const snap = await db.doc(`nights/${nightId}`).get()
  if (!snap.exists) return off('no-night')
  const night = snap.data()
  if (night.forceRehearsal !== true) return off('real-night')
  const keys = fillInKeys(night.roster)
  if (!night.fillIns || !keys.length) return off('no-fill-ins')
  const base = { ok: true, on: true, act: night.act ?? 0, seats: keys.length }
  if (night.over === true) return { ...base, did: 0, why: 'over' }
  // the doors, the dark, the role cards, a pause: nobody moves, as no phone would
  if (night.phase !== 'act') return { ...base, did: 0, why: 'held' }

  const win = night.window
  const w = win && !win.settled && (win.kind === 'questions' || win.kind === 'ballot') && now <= ms(win.closesAt) ? win : null
  const act4 = night.act === 4 ? (await db.doc(act4Path(nightId)).get()).data() ?? null : null
  if (!w && !act4) return { ...base, did: 0 }
  const uids = (await db.doc(`nights/${nightId}/private/deck`).get()).data()?.uids ?? {}
  // only a seat that is still a fill-in's: flagged on the roster and held by its made-up uid
  const seats = keys.map(key => ({ key, uid: uids[key] })).filter(s => isFillInUid(s.uid))
  const moves = { locked: 0, answered: 0, voted: 0 }
  // a move the night refuses (the window just closed, the round just moved on) is no move, never an error
  const attempt = async (kind, call) => {
    try { const r = await call(); if (r?.ok && !r.already && !r.late) moves[kind]++ } catch (e) { if (!(e instanceof NightError)) throw e }
  }

  // Act 4, the group cards: Locked in
  if (act4?.phase === 'groups') {
    const cardsAt = ms(act4.lockEndsAt) - LOCK_MS
    for (const s of seats) {
      if (act4.locked?.[s.key] || now < cardsAt + pauseMs(nightId, s.key, 'lock')) continue
      await attempt('locked', () => run.player.lockIn(db, { nightId, uid: s.uid, now }))
    }
  }

  // The Parlour Games and the vote. The sessions are read only when a move could be due.
  if ((w && now >= ms(w.opensAt) + PAUSES.answer[0]) || act4) {
    const held = await Promise.all(seats.map(async seat => ({ ...seat, s: (await db.doc(`sessions/${seat.uid}`).get()).data() ?? null })))
    for (const { key, uid, s } of held) {
      if (!s || s.status !== 'active' || s.nightId !== nightId || s.guestKey !== key) continue
      // a Parlour Game on every phone at once (Acts 2 and 6)
      if (w?.kind === 'questions' && s.windows?.[w.id] && !s.answers?.[w.id] && now >= ms(w.opensAt) + pauseMs(nightId, key, 'answer', w.id)) {
        await attempt('answered', () => run.player.answer(db, { nightId, uid, windowId: w.id, picks: picksFor(nightId, key, w.id, s.windows[w.id]), now }))
      }
      // the vote
      if (w?.kind === 'ballot' && !s.ballot && now >= ms(w.opensAt) + pauseMs(nightId, key, 'vote', w.id)) {
        await attempt('voted', () => run.player.ballot(db, { nightId, uid, ...ballotFor(nightId, key, night), now }))
      }
      // Act 4: a Parlour Game that waits on the phone, played when the guest is free
      if (act4) {
        for (const [id, game] of Object.entries(s.windows ?? {})) {
          if (!game?.waiting || s.answers?.[id] || now < ms(game.opensAt) + pauseMs(nightId, key, 'answer', id)) continue
          await attempt('answered', () => run.player.answer(db, { nightId, uid, windowId: id, picks: picksFor(nightId, key, id, game), now }))
        }
      }
    }
  }

  // Act 4's clock, at every pass: the rounds begin the moment the real players are locked in, and a round
  // ends soon after their own group has finished its room (act4.due), not at the next minute's tick
  const clock = act4 ? (await run.clockTick(db, nightId, now)).moved : null
  return { ...base, did: moves.locked + moves.answered + moves.voted, ...moves, ...(clock ? { clock } : {}) }
}

// The vote, the moment only fill-ins are left to lock in (run.js calls this
// after each real player's ballot): every fill-in still to vote casts its
// own, at once, through the same call a phone makes, and the last of them
// closes the vote. So the vote closes on the real players' own last tap with
// every seat counted, even with nothing running the fill-ins (the brain
// off). Does nothing while a real player is still choosing, on the real
// night, or from the party day on. Returns counts only.
export async function voteNow(db, nightId, { now = Date.now() } = {}) {
  if (now >= PARTY_DAY) return { ok: true, voted: 0 }
  const night = (await db.doc(`nights/${nightId}`).get()).data()
  if (!night || night.forceRehearsal !== true || !night.fillIns) return { ok: true, voted: 0 }
  const w = night.window
  if (!w || w.kind !== 'ballot' || w.settled) return { ok: true, voted: 0 }
  const uids = (await db.doc(`nights/${nightId}/private/deck`).get()).data()?.uids ?? {}
  const seats = fillInKeys(night.roster).map(key => ({ key, uid: uids[key] })).filter(s => isFillInUid(s.uid))
  const left = []
  for (const seat of seats) {
    const s = (await db.doc(`sessions/${seat.uid}`).get()).data()
    if (s?.status === 'active' && s.windows?.[w.id] && !s.ballot) left.push(seat)
  }
  // a real player is still choosing: the fill-ins keep to their own pauses
  if (!left.length || (w.answered ?? 0) + left.length < Number(w.of)) return { ok: true, voted: 0 }
  let voted = 0
  for (const { key, uid } of left) {
    try {
      const r = await run.player.ballot(db, { nightId, uid, ...ballotFor(nightId, key, night), now })
      if (r?.ok && !r.already) voted++
    } catch (e) { if (!(e instanceof NightError)) throw e }
  }
  return { ok: true, voted }
}

// The live night's pass, for the `fillIns` callable: finds the night that is
// on, steps it, and leaves a heartbeat (presence/fillins-<nightId>, at most
// every thirty seconds) so the Host tab can say the fill-ins are playing
// along. Returns what stepFillIns returns; never content.
export const FILL_IN_PRESENCE = 'fill-ins'
export const HEARTBEAT_EVERY_MS = 30_000
const lastBeat = new Map() // nightId → when this server instance last wrote the heartbeat
export async function stepLiveFillIns(db, { now = Date.now() } = {}) {
  if (now >= PARTY_DAY) return { ok: true, on: false, why: 'party-day', did: 0 }
  const active = await db.doc('public_state/active').get()
  const nightId = active.exists ? active.data().nightId ?? null : null
  if (!nightId) return { ok: true, on: false, why: 'no-night', did: 0 }
  const r = await stepFillIns(db, nightId, { now })
  if (r.on && Math.abs(now - (lastBeat.get(nightId) ?? 0)) >= HEARTBEAT_EVERY_MS) {
    lastBeat.set(nightId, now)
    try { await db.doc(`presence/fillins-${nightId}`).set({ nightId, guestKey: FILL_IN_PRESENCE, at: FieldValue.serverTimestamp() }) } catch { /* a missed heartbeat is a late line on the Host tab, nothing more */ }
  }
  return r
}
