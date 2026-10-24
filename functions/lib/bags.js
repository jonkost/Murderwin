// The packing, as the game reads it on the night (sealed/bags, written blind
// by scripts/pack-bags.mjs). The bags station of Act 4 is gone (handoff 23 Oct
// 2026): the cats' bag clues (bagclues.js) read each bag's clue words from
// here instead, on the party night only.
//
// SEAL RULE: sealed/bags is read here with the Admin SDK and nothing from it
// leaves this function except to the bag clue engine. Never logged.

// The packing, or null when there is none (or it is in a shape from before
// the final items, with no per-bag words).
export async function readPacking(db) {
  const snap = await db.doc('sealed/bags').get()
  const d = snap.exists ? snap.data() : null
  return d && d.words && typeof d.words === 'object' ? d : null
}
