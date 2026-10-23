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
//
// A clip id names its family and level (bulletin2-food-3), so on a night
// with a station key saved it never goes on a public doc as it is: the sounds
// doc carries clipCode(key, id) instead, a code no phone can work back
// without the key. The cue relay holds the same key (cues/.env STATION_KEY),
// works out the code of every clip it knows and maps it back to its file.

import { readFileSync } from 'node:fs'
import { createHash, createHmac } from 'node:crypto'
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

// A recording's code: the first 16 hex characters of HMAC-SHA256(key, clip id).
// The cue relay computes the same (cues/lib/cues.js clipCode); a test checks they agree.
export function clipCode(key, clipId) {
  return createHmac('sha256', String(key)).update(String(clipId)).digest('hex').slice(0, 16)
}

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

// The closing bulletin: each recorded part, which card follows it, and how
// long it runs (holdMs, Jon's timing; this default for a part with none).
export const CLOSING_HOLD_MS = 3_000
export function closingParts() {
  return NEWS.closing.parts.map(p => ({ clip: p.clip, who: p.who, text: p.text, card: p.card ?? null, holdMs: Number(p.holdMs) >= 0 ? Number(p.holdMs) : CLOSING_HOLD_MS }))
}

// One reveal press's share of the closing bulletin: the parts from the last
// card up to this stage's card (the Victim's takes the rest, the sign-off and
// the studio's close), and the lead-in: how long the parts before its card
// run, so the TV can hold the card until they have been said.
// Murderer: the studio, then Mic's first line; Motive: his second; Victim:
// his third, then his sign-off and the studio's close under the cards.
export const CLOSING_CARDS = { murderer: 'murderer', motive: 'motive', victim: 'ghost' }
export function closingStage(stage) {
  const parts = closingParts()
  const order = Object.keys(CLOSING_CARDS)
  const cardIndex = s => parts.findIndex(p => p.card === CLOSING_CARDS[s])
  const i = order.indexOf(stage)
  if (i < 0 || cardIndex(stage) < 0) return { parts: [], leadMs: 0 }
  const from = i === 0 ? 0 : cardIndex(order[i - 1]) + 1
  const to = i === order.length - 1 ? parts.length : cardIndex(stage) + 1
  const mine = parts.slice(from, to)
  const leadMs = parts.slice(from, cardIndex(stage) + 1).reduce((sum, p) => sum + p.holdMs, 0)
  return { parts: mine, leadMs }
}
