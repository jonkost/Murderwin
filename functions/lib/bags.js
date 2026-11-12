// The packing, as the game reads it on the night. The bags station of Act 4
// is gone (handoff 23 Oct 2026): the cats' bag clues (bagclues.js) read each
// bag's clue words from here instead.
//
// WHICH PACKING A NIGHT READS is decided in one place, packingFor, below
// (handoff 11 Nov 2026, job A3):
//   the party night      the sealed packing (sealed/bags, written blind by
//                        scripts/pack-bags.mjs; Jenna packs the real bags to it)
//   a practice night     its own practice packing, made in memory from the
//                        item list Jon bought (packing.js). Never sealed/bags.
//
// SEAL RULE: sealed/bags is read here with the Admin SDK and nothing from it
// leaves this file except to the bag clue engine. Never logged. The practice
// packing is not sealed content (it is dealt from safe content and a practice
// night's own throwaway case, and says nothing about the party's packing),
// but it is never logged or written anywhere either: it lives in memory.

import { createHash } from 'node:crypto'
import { bagSeed, clueLists, seedItems, poolFromItems, packBags, seededRng } from './packing.js'

// The packing, or null when there is none (or it is in a shape from before
// the final items, with no per-bag words).
export async function readPacking(db) {
  const snap = await db.doc('sealed/bags').get()
  const d = snap.exists ? snap.data() : null
  return d && d.words && typeof d.words === 'object' ? d : null
}

// A practice packing, from a key: ten bags of the seed's items under the bag
// rules, in the shape the bag clue engine reads, { words: { bag: { word:
// [sense] } } }. The same key packs the same way every time, on any machine,
// so two function instances agree without writing anything down. A few tries
// at most (each about a twentieth of a second); null when the seed's item
// list is missing or no try keeps the rules, and then a cat's bag line names
// no word. It never throws.
export const PRACTICE_ATTEMPTS = 8
export function packPractice(key, seed = bagSeed()) {
  try {
    const pool = poolFromItems(seedItems(seed), clueLists(seed))
    if (!key || !pool.length) return null
    const start = createHash('sha256').update(`practice-packing\u0000${key}`).digest().readUInt32BE(0)
    const r = packBags(pool, { rng: seededRng(start), attempts: PRACTICE_ATTEMPTS })
    return r.check.ok ? { words: r.check.words } : null
  } catch { return null }
}

// The practice packing for a practice night's case, worked out once per case
// in each function instance (the last few are remembered) and keyed on the
// case's own secret salt, which a replay by seed word deals again. Not worked
// out at the blackout: the first cat scan asks for it.
const REMEMBERED = 4
const remembered = new Map()
export function practicePacking(c) {
  const key = typeof c?.screenSalt === 'string' && c.screenSalt ? c.screenSalt : null
  if (!key) return null
  if (remembered.has(key)) return remembered.get(key)
  const packing = packPractice(key)
  remembered.set(key, packing)
  if (remembered.size > REMEMBERED) remembered.delete(remembered.keys().next().value)
  return packing
}

// The packing a case's bag clues are filled from. The one place that decides.
//   The party night: the case says rehearsal === false, exactly that. Only
//     then is sealed/bags read.
//   Every other night (a practice night, a Game test night, a case with no
//     flag at all): never sealed/bags. Its own practice packing.
export async function packingFor(db, c) {
  if (c?.rehearsal === false) return readPacking(db)
  return practicePacking(c)
}
