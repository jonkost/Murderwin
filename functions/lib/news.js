// W-O-O-F News (docs/handoff-2026-10-22.md §4 and §7b): the three bulletins.
// Pure: which lines play and which recordings go with them. The words are an
// open bank (seed/woof-news.json, the "W-O-O-F News Recording Script" doc);
// only which line plays is the case's, and that is decided here from the
// case at the moment the bulletin plays, never earlier on a public doc.
//
//  Bulletin 1  Act 2, lights out. Always clarity level 3: the opening, the
//              line for the one wrong family the news crosses off, the sign-off.
//  Bulletin 2  Act 3, near the end of supper. Jon arms it; it plays 3 to 5
//              minutes later. The opening, the REAL family's line at the
//              clarity dial's level (1 very obscure, 5 plain), the sign-off.
//  Closing     Act 7, the reveal. Generic recorded parts; the game cuts the
//              Murderer, Motive and Ghost cards in between them.
//
// Every recording is a clip id, the file name Jon saves it under in media/ on
// the brain. A clip with no file is skipped by the relay; the words are on
// the screen as captions either way.

import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { dirname, join as joinPath } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
export const NEWS = JSON.parse(readFileSync(joinPath(here, '..', 'seed', 'woof-news.json'), 'utf8')) // copied from ../seed by `npm run seed`

const part = p => ({ text: p.text, clip: p.clip })

// Every recording the bulletins can ask for, for the relay's missing-file
// count and the stand-in maker.
export const CLIP_IDS = [
  NEWS.bulletin1.opening.clip, ...Object.values(NEWS.bulletin1.families).map(f => f.clip), NEWS.bulletin1.signoff.clip,
  NEWS.bulletin2.opening.clip, ...Object.values(NEWS.bulletin2.families).flat().map(f => f.clip), NEWS.bulletin2.signoff.clip,
  ...NEWS.closing.parts.map(p => p.clip),
]

// Bulletin 1: the family the case's news crosses off (families.solvingPlan newsOut).
export function bulletin1(c) {
  const family = c?.solving?.newsOut?.[0] ?? null
  const line = family ? NEWS.bulletin1.families[family] : null
  const parts = [NEWS.bulletin1.opening, ...(line ? [line] : []), NEWS.bulletin1.signoff].map(part)
  return { lines: parts.map(p => p.text), clips: parts.map(p => p.clip), placeholder: !line }
}

// Bulletin 2: the real family's line at the dial's band, 1 to 5.
export function bulletin2(c, band = 3) {
  const family = c?.solving?.family ?? null
  const level = Math.min(5, Math.max(1, Math.round(Number(band) || 3)))
  const line = family ? NEWS.bulletin2.families[family]?.[level - 1] : null
  const parts = [NEWS.bulletin2.opening, ...(line ? [line] : []), NEWS.bulletin2.signoff].map(part)
  return { lines: parts.map(p => p.text), clips: parts.map(p => p.clip), level, placeholder: !line }
}

// When an armed bulletin 2 plays: 3 to 5 minutes after it was armed, seeded
// on the case's secret so a second arm agrees with the first.
export const BULLETIN2_MIN_MS = 3 * 60_000
export const BULLETIN2_MAX_MS = 5 * 60_000
export function bulletin2Delay(seed) {
  const h = createHash('sha256').update(`${seed}\u0000bulletin2`).digest()
  return BULLETIN2_MIN_MS + Math.floor((h.readUInt32BE(0) / 0x100000000) * (BULLETIN2_MAX_MS - BULLETIN2_MIN_MS + 1))
}

// The closing bulletin: each recorded part, and which card follows it.
export function closingParts() {
  return NEWS.closing.parts.map(p => ({ clip: p.clip, who: p.who, text: p.text, card: p.card ?? null }))
}
