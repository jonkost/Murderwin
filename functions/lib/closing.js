// The close of the night (handoff 11 Nov 2026, C1): the credits' last places
// and the host's Good night.
//
// The credits end: the roll (the awards, the numbers, the room's split, Thank
// you, then Special thanks when Jon has sent his lines), the Dedication (one
// card, eight seconds, play/src/lib/finale.js), then Sir Irwin's last card.
// The words live in seed/credits.json, safe content: an empty specialThanks
// list shows nothing and takes no time.
//
// Good night: after The End (nights/{id}.over, deal.end) the host's phone
// marks the night over for good (nights/{id}.goodNight). Nothing else moves:
// the beat stays on The End, every screen keeps showing The End, the brain
// keeps the jazz and the Default lights (cues/scenes.json, Act 7's end beat).
// A second press changes nothing. A Back from The End takes it off again
// (run.js enterBeat), with the over flag.
//
// SEAL RULE: nothing here reads a case or returns content.

import { readFileSync } from 'node:fs'
import { dirname, join as joinPath } from 'node:path'
import { fileURLToPath } from 'node:url'
import { NightError } from './night.js'

const here = dirname(fileURLToPath(import.meta.url))
const CREDITS = JSON.parse(readFileSync(joinPath(here, '..', 'seed', 'credits.json'), 'utf8')) // copied from ../seed by `npm run seed`

const clean = (s) => String(s ?? '').trim()
export const SPECIAL_THANKS = Object.freeze((Array.isArray(CREDITS.specialThanks) ? CREDITS.specialThanks : []).map(clean).filter(Boolean))
export const DEDICATION = Object.freeze({
  line: clean(CREDITS.dedication?.line),
  photo: clean(CREDITS.dedication?.photo) || null,
})

export async function goodNight(db, nightId, { now = Date.now() } = {}) {
  const ref = db.doc(`nights/${nightId}`)
  const snap = await ref.get()
  if (!snap.exists) throw new NightError('no-night', 'No such night.')
  const n = snap.data()
  if (n.over !== true) throw new NightError('invalid', 'Good night comes after The End. Press Next for The End first.')
  if (n.goodNight === true) return { ok: true, goodNight: true, already: true }
  await ref.update({ goodNight: true, goodNightAt: new Date(now) })
  return { ok: true, goodNight: true }
}
