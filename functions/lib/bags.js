// The packing, as the game reads it on the night (sealed/bags, written blind
// by scripts/pack-bags.mjs). The bags station of Act 4 is gone (handoff 23 Oct
// 2026): the cats' bag clues (bagclues.js) read each bag's clue words from
// here instead, on the party night only.
//
// SEAL RULE: sealed/bags is read here with the Admin SDK and nothing from it
// leaves this function except to the bag clue engine. Never logged.
//
// WHICH PACKING A NIGHT READS is decided in one place, packingFor, below
// (handoff 11 Nov 2026, job A3): the party night reads the sealed packing; a
// practice night never does.

// The packing, or null when there is none (or it is in a shape from before
// the final items, with no per-bag words).
export async function readPacking(db) {
  const snap = await db.doc('sealed/bags').get()
  const d = snap.exists ? snap.data() : null
  return d && d.words && typeof d.words === 'object' ? d : null
}

// The packing a case's bag clues are filled from. The one place that decides.
//   The party night: the case says rehearsal === false, exactly that. Only
//     then is sealed/bags read.
//   Every other night (a practice night, a Game test night, a case with no
//     flag at all): never sealed/bags. None yet, so a cat's bag line is its
//     own words with no clue word in it (bagclues.bagLine).
export async function packingFor(db, c) {
  if (c?.rehearsal === false) return readPacking(db)
  return null
}
