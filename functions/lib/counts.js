// The Home rows (card 343): how far the three blind-made secrets have got,
// as numbers only, for Jon's workshop Home. The packing list made or not
// (sealed/bags), the cats' leans as questions with a lean for every
// listening cat (sealed/parlour_leans against the workshop bank), and the
// drawing pictures as good ones of nine (sealed/relay_pictures, three a
// round).
//
// SEAL RULE. This reads three sealed docs with the Admin SDK and returns
// counts and one yes or no. Never an item, a bag's contents, which answer a
// cat leans toward, which question is missing a lean, a picture's name or
// its strokes. Nothing is logged but the op. The callable is the admin's
// only (functions/index.js `sealedCounts`).

import { readArea } from './night.js'
import { LISTENERS, ANSWERS, QUESTIONS } from './parlour.js'
import { BANK_DOC, ROUND_SIZES, PER_ROUND, checkPicture } from './relay-bank.js'

export const LEANS_DOC = 'sealed/parlour_leans' // the same doc steward.js and deal.js read
export const PICTURES_OF = Object.keys(ROUND_SIZES).length * PER_ROUND // nine

// The packing: made or not, and how many bags it packed.
export function packingCount(packing) {
  const numbers = Object.keys(packing?.bags ?? {}).filter(n => Array.isArray(packing.bags[n]) && packing.bags[n].length)
  return { made: numbers.length > 0, bags: numbers.length }
}

// The leans: a question counts once every listening cat has a lean for it.
// `sets` are the workshop bank's sets with three questions each.
export function leanCount(table, sets = []) {
  let questions = 0
  for (const s of sets) for (let q = 0; q < QUESTIONS; q++) {
    if (LISTENERS.every(cat => ANSWERS.includes(table?.[s.id]?.[q]?.[cat]))) questions++
  }
  return { questions, of: sets.length * QUESTIONS }
}

// The drawing pictures: good ones per round (the generator's own checks),
// at most three a round count, of nine.
export function pictureCount(bank) {
  const pictures = Array.isArray(bank?.pictures) ? bank.pictures : []
  let made = 0
  for (const round of Object.keys(ROUND_SIZES).map(Number)) {
    const good = pictures.filter(p => Number(p?.round) === round && !checkPicture(p, round).length).length
    made += Math.min(PER_ROUND, good)
  }
  return { made, of: PICTURES_OF }
}

export async function sealedCounts(db, { log = (...a) => console.log(...a) } = {}) {
  log('sealedCounts')
  const [bags, leans, pictures, items] = await Promise.all([
    db.doc('sealed/bags').get(), db.doc(LEANS_DOC).get(), db.doc(BANK_DOC).get(), readArea(db, 'scenarios'),
  ])
  const sets = items.filter(i => Array.isArray(i.beats) && i.beats.length === QUESTIONS).map(i => ({ id: String(i.id) }))
  return {
    ok: true,
    packing: packingCount(bags.exists ? bags.data() : null),
    leans: leanCount(leans.exists ? (leans.data().sets ?? {}) : {}, sets),
    pictures: pictureCount(pictures.exists ? pictures.data() : null),
  }
}
