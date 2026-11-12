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

import { NightError, nameKey, seatFillIn } from './night.js'
import { PARTY_DAY } from './morning.js'
import { fillInUid, fillInKeys, isFillIn } from './seats.js'

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
