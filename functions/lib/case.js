// The case for one night: what cases/{nightId} holds, and how it is dealt
// at the Act 1 blackout. Pure functions over plain objects; the Firestore
// side (the roster, the bank, the cats' leans, writing the case) lives in
// deal.js (buildCaseForNight), so this file has no database.
//
// SEAL RULE. A party case is sealed: the roles, the motive, the victim, the
// families each guest is told about, the leans the Parlour Games copy in.
// Nothing in this file prints, logs or returns content to a caller other
// than the dealer.
//
// CASE_SHAPE: the contract every consumer reads (the dealer, the windows
// engine, the room screens, the finale, the safeguards). cases/{nightId} =
// {
//   rehearsal: boolean          true on a rehearsal night (the leans, the bags
//                               clue's packing and the drawing pictures are never
//                               read; createNight still reads the bag count)
//   createdAt: Date
//   roles: { guestKey: 'detective' | 'murderer' | 'ghost' }
//   murderer: guestKey | null
//   ghost: guestKey | null
//   motive: n                   seed/motives.json number, 1..19, drawn at the deal
//   victimCharacterId: id | null
//   dialSign: { ghost: +1, murderer: -1 }   FIXED and opposed, never random:
//                               the Ghost pushes the dial up (clearer), the
//                               Murderer pushes it down. The Act 7 graph
//                               labels its sides on this.
//   dialMap: { ghost: +1, murderer: -1 }    how a hidden role's points map to
//                               the dial; the windows engine may refine it.
//   dial: 0                     running total, sealed until Act 7
//   dialLog: []                 every push: { act, role, delta, at }
//   parlourPlan: { seed, acts: { '2': [{ setId, atMs, listeners: [{ cat, size, fits, lean }] x3 }] x5, '4', '6' },
//                  leans }      the night's twelve Parlour Games (parlour.js
//                               planParlour): which set, when, which cat is
//                               secretly listening to each question and which
//                               answer it leans toward; `leans` is the lean
//                               table as Jenna left it at the deal. Every
//                               phone gets the same set at the same moment.
//   screenSalt: hex string      a secret the room screens and the phones' picks
//                               are seeded on (the bulletins, Sir Irwin's options,
//                               the cats' lines, the Free time tips), so nothing
//                               public can replay them from the night id
//   exposure: {}                the exposure safeguard's record: { murderer?: { hushedAt, act },
//                               ghost?: { hushedAt, act } } (ledger.js noteExposure; the Hush)
//   solving: { family, newsOut, hints, memory, struck }   how the motive narrows
//                               (families.js, docs/solving-the-case.md): the real
//                               family, the families the Act 2 news flash rules out,
//                               the one each guest's cat rules out, what the Act 4
//                               memory match crossed off per group, what the bulletin struck
//   dealtClues: []              the ledger of what went to whom (safeguards): entries
//                               { kind: 'study' | 'echo' | 'hint' | 'memory', act, beat, key?, groupId?, at },
//                               never a word of content (ledger.js noteDealt)
//   spills?: n                  only after Spill the Beans (safeguards.js): how many times the
//                               story was re-rolled. rerollCase below keeps the keys above.
// }
// The party case (buildCase) and the rehearsal case (rehearsalCase) have
// exactly the same keys and differ only in the flag, so every consumer has
// one code path.

import { randomInt, createHash } from 'node:crypto'
import { MOTIVES } from './night.js'
import { newSeed, planParlour } from './parlour.js'
import { solvingPlan } from './families.js'

export const DIAL_SIGN = Object.freeze({ ghost: 1, murderer: -1 })

// ---------------------------------------------------------------------------
// Small helpers. `rng(n)` returns an integer in [0, n).

function shuffled(list, rng) {
  const a = [...list]
  for (let i = a.length - 1; i > 0; i--) { const j = rng(i + 1); [a[i], a[j]] = [a[j], a[i]] }
  return a
}
function choice(list, rng) { return list.length ? list[rng(list.length)] : undefined }

// A number in [0, 1) that is always the same for the same parts. Used for
// the per-group picks that must not change when a card is re-dealt (the
// Free time tip). Never used for anything a guest could predict.
export function seededUnit(...parts) {
  const h = createHash('sha256').update(parts.map(String).join('\u0000')).digest()
  return h.readUInt32BE(0) / 0x100000000
}

// ---------------------------------------------------------------------------
// Pieces of a case.

export function pickRoles(keys, rng) {
  const order = shuffled(keys, rng)
  const roles = {}
  for (const k of order) roles[k] = 'detective'
  const murderer = order[0] ?? null
  const ghost = order[1] ?? null
  if (murderer) roles[murderer] = 'murderer'
  if (ghost) roles[ghost] = 'ghost'
  return { roles, murderer, ghost }
}

// The night's Parlour Games, from a seed of the case's own (parlour.js).
// The lean table rides along, so a window the plan does not know (the host's
// Light up button) can still find a cat's fitting answer.
export function parlourPlanFor(rng, { bankIds = [], leans = null, config = null } = {}) {
  const seed = newSeed(rng)
  return { ...planParlour({ seed, bankIds, config, leans }), leans: leans ?? {} }
}

// The screens' secret: 128 bits from the case's rng, as hex. Never leaves
// cases/{nightId} (screen.js refuses a public doc that carries it).
export function screenSalt(rng) {
  return Array.from({ length: 8 }, () => rng(65536).toString(16).padStart(4, '0')).join('')
}

// ---------------------------------------------------------------------------
// The case itself. The motive is drawn here, with the deal's own randomness
// (crypto by default), from the nineteen; nothing sealed goes in. The party
// case and the rehearsal case are dealt the same way and differ only in the
// flag, which says whether the night's sealed leans, packing and pictures
// are read (deal.js buildCaseForNight, bags.js, relay.js).

function dealCase({ roster, rng = randomInt, parlour = {}, now, rehearsal }) {
  const list = Array.isArray(roster) ? roster : Object.entries(roster ?? {}).map(([key, r]) => ({ key, ...r }))
  const { roles, murderer, ghost } = pickRoles(list.map(g => g.key), rng)
  const motive = MOTIVES[rng(MOTIVES.length)].n
  return {
    rehearsal, createdAt: new Date(now ?? Date.now()),
    roles, murderer, ghost,
    motive, victimCharacterId: ghost ? list.find(g => g.key === ghost)?.characterId ?? null : null,
    dialSign: { ...DIAL_SIGN }, dialMap: { ...DIAL_SIGN }, dial: 0, dialLog: [],
    parlourPlan: parlourPlanFor(rng, parlour), screenSalt: screenSalt(rng),
    solving: solvingPlan({ motive, keys: list.map(g => g.key), rng }), exposure: {}, dealtClues: [],
  }
}

// The party case.
export function buildCase({ roster, rng = randomInt, parlour = {}, now } = {}) {
  return dealCase({ roster, rng, parlour, now, rehearsal: false })
}

// The rehearsal case: the same keys, thrown away with its night.
export function rehearsalCase({ roster, rng = randomInt, parlour = {}, now } = {}) {
  return dealCase({ roster, rng, parlour, now, rehearsal: true })
}

// The keys every case carries, for the tests and for anyone building against the shape.
export const CASE_KEYS = Object.keys(rehearsalCase({ roster: [], rng: () => 0 })).sort()

// ---------------------------------------------------------------------------
// Spill the Beans (safeguards.js): the story is re-rolled, the people are not.
// `prev` is the case as it stands, `fresh` a case just dealt the same way
// (buildCase or rehearsalCase). The result keeps the Murderer, every guest's
// character and the night's Parlour Games; it takes a new motive (never the
// one before) and its own solving plan (families.js); it picks a new Ghost
// (never the Murderer, never the old Ghost when a third guest exists) and
// starts the dial again. Pure: no database, nothing printed.

export function nextMotive(current, rng = randomInt) {
  const others = MOTIVES.map(m => m.n).filter(n => n !== Number(current))
  return others.length ? choice(others, rng) : Number(current)
}

export function rerollCase({ prev, fresh, roster = [], rng = randomInt } = {}) {
  const list = Array.isArray(roster) ? roster : Object.entries(roster ?? {}).map(([key, r]) => ({ key, ...r }))
  const keys = [...new Set([...Object.keys(prev?.roles ?? {}), ...list.map(g => g.key)])]
  const murderer = prev?.murderer && keys.includes(prev.murderer) ? prev.murderer : (keys[0] ?? null)
  const ghostPool = keys.filter(k => k !== murderer && k !== prev?.ghost)
  const ghost = ghostPool.length ? choice(ghostPool, rng) : (keys.find(k => k !== murderer) ?? null)
  const roles = {}
  for (const k of keys) roles[k] = 'detective'
  if (murderer) roles[murderer] = 'murderer'
  if (ghost) roles[ghost] = 'ghost'
  const motive = Number(fresh.motive) !== Number(prev?.motive) ? Number(fresh.motive) : nextMotive(prev?.motive, rng)
  return {
    ...fresh,
    createdAt: prev?.createdAt ?? fresh.createdAt,
    roles, murderer, ghost, motive,
    victimCharacterId: ghost ? list.find(g => g.key === ghost)?.characterId ?? null : null,
    dialSign: { ...(prev?.dialSign ?? DIAL_SIGN) }, dialMap: { ...(prev?.dialMap ?? DIAL_SIGN) }, dial: 0, dialLog: [],
    parlourPlan: prev?.parlourPlan ?? fresh.parlourPlan,
    screenSalt: prev?.screenSalt ?? fresh.screenSalt,
    // the new motive's own plan (the family changes with it), for every guest the night knows
    solving: solvingPlan({ motive, keys, rng }),
    exposure: {},
    dealtClues: Array.isArray(prev?.dealtClues) ? prev.dealtClues : [],
    spills: (prev?.spills ?? 0) + 1,
  }
}
