// Replay a night by its seed (card 324, docs/test-plan.md G22). Every
// rehearsal is dealt from a seed word: one Jon typed on the Game night page
// (meta/game.replay_seed, used once), or a fresh one. The same word deals the
// same night again: the characters and bag numbers (for the same guests
// joining in the same order), the affection rolls, the roles, the motive, the
// families each guest's cats rule out, the cats' lines, the Parlour Game
// times and sets, the Act 2 queue, the Act 4 groups and rooms, the memory
// boards, the drawing's pictures and order, the trace look-alikes, and the
// answer picked for a phone that did not answer. Not the clock: Salem's
// colours and Boo's poses keep their own timing.
//
// The party night is never seeded: its deal keeps crypto randomness
// (CLAUDE.md, the case deal), and the Game night page greys the Replay box
// out while "This is the party night" is ticked. A dry run on the party's
// sealed lists is not a rehearsal either, so it has no seed.
//
// The seed lives in nights/{id}/private/deck (no client reads it). Jon sees
// a rehearsal's word on the Game night page (meta/replay, written when the
// night is made), so a run that went wrong can be played again. A
// rehearsal's case is a throwaway: knowing its word gives nothing about the
// party.

import { createHash, randomInt } from 'node:crypto'

// Friendly words for a fresh seed: easy to read off a screen and type.
export const SEED_WORDS = [
  'tulip', 'acorn', 'badger', 'candle', 'damson', 'ember', 'fennel', 'gable', 'heron', 'ivy',
  'juniper', 'kettle', 'lantern', 'maple', 'nutmeg', 'otter', 'pepper', 'quill', 'raven', 'saffron',
  'thistle', 'umber', 'velvet', 'walnut', 'yarrow', 'zinnia', 'biscuit', 'clover', 'dormouse', 'fable',
]

// A seed word as typed: lower case, letters, numbers and dashes, at most 40.
// Anything else is dropped; an empty result means "no seed".
export function cleanSeed(text) {
  return String(text ?? '').trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').replace(/-+/g, '-').replace(/^-|-$/g, '').slice(0, 40)
}

// A fresh word, like "tulip-4471", from crypto randomness.
export function newSeedWord(pick = randomInt) {
  return `${SEED_WORDS[pick(SEED_WORDS.length)]}-${1000 + pick(9000)}`
}

// The pick a seed gives for one purpose: `pick(n)` is an integer in [0, n),
// the same sequence every time for the same seed and purpose. Each purpose
// ("case", "affection", a guest's key...) has its own stream, so adding a
// guest or a beat never shifts another stream.
export function seededPick(seed, ...purpose) {
  const base = [String(seed), ...purpose.map(String)].join('\u0000')
  let i = 0
  return n => {
    const k = Math.floor(Number(n))
    if (!(k > 0)) return 0
    const h = createHash('sha256').update(`${base}\u0000${i++}`).digest()
    return Math.floor((h.readUInt32BE(0) / 0x100000000) * k)
  }
}

// The night's seed, or null (the party, a dry run, or a night made before seeds).
export async function nightSeed(db, nightId) {
  if (!nightId) return null
  const snap = await db.doc(`nights/${nightId}/private/deck`).get()
  const seed = snap.exists ? snap.data()?.seed : null
  return typeof seed === 'string' && seed ? seed : null
}

// The pick a night's random choice should use: the seed's stream for this
// purpose on a seeded night, crypto randomness otherwise.
export function pickFor(seed, ...purpose) {
  return seed ? seededPick(seed, ...purpose) : randomInt
}

export async function nightPick(db, nightId, ...purpose) {
  return pickFor(await nightSeed(db, nightId), ...purpose)
}

// The record Jon reads on the Game night page (meta/replay): the last few
// rehearsals and their words. Newest first, at most five.
export const REPLAY_DOC = 'meta/replay'
export const REPLAY_KEEP = 5
export function replayRecord(prev, entry) {
  const recent = [entry, ...(Array.isArray(prev?.recent) ? prev.recent : []).filter(r => r?.nightId !== entry.nightId)].slice(0, REPLAY_KEEP)
  return { last: entry, recent }
}
