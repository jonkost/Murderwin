// The case for one night: what cases/{nightId} holds, and how it is built
// from one sealed motive set at the Act 1 blackout. Pure functions over
// plain objects; the Firestore side (reading sealed/*, writing the case)
// lives in deal.js (buildCaseForNight), so this file has no database.
//
// SEAL RULE. Everything that passes through here is sealed once it is
// real: kernels, documents, the study clue, the echo fragment, the roles.
// Nothing in this file prints, logs or returns content to a caller other
// than the dealer. Errors carry reason codes, never text.
//
// CASE_SHAPE: the contract every consumer reads (the dealer, the windows
// engine, the room screens, the finale, the safeguards). cases/{nightId} =
// {
//   rehearsal: boolean          true when the night runs on bracketed stand-ins
//   createdAt: Date
//   roles: { guestKey: 'detective' | 'murderer' | 'ghost' }
//   murderer: guestKey | null
//   ghost: guestKey | null
//   motive: n                   seed/motives.json number, 1..19
//   victimCharacterId: id | null
//   dialSign: { ghost: +1, murderer: -1 }   FIXED and opposed, never random:
//                               the Ghost pushes the dial up (clearer), the
//                               Murderer pushes it down. The Act 7 graph
//                               labels its sides on this.
//   dialMap: { ghost: +1, murderer: -1 }    how a hidden role's points map to
//                               the dial; the windows engine may refine it.
//   dial: 0                     running total, sealed until Act 7
//   dialLog: []                 every push: { act, role, delta, at }
//   kernels: { irwin: string[], granolia: string[], boo: string[],
//              zimothy: string[], salem: string[] }   Salem's are his warped
//                               texts (the sealed {text, anchor} is split)
//   variant: { cat: index }     ONE variant per cat per case, so two guests
//                               who compare notes heard the same words
//   salemAnchors: string[]      the anchor noun of each Salem variant
//   salemTruthIndex: index      which Irwin kernel is Salem's true line (the
//                               40 percent branch)
//   documents: [{ template, bigWord, text, annotation }]   [0] is the safe's
//                               pay-out; the template is drawn once per case
//   studyClue: { text }         what the study pays every phone in the group
//   echo: { fragment }          what fills the news frame's gap
//   irwin: { lines: string[] }  Sir Irwin's three short lines (Act 5)
//   pools: { room, time, duration, count, place, crowd }   ONE value each,
//                               fixed for the whole night, so Irwin never
//                               contradicts himself between two listeners
//   granoliaSlot: { key, value } | null   the one blank Granolia gets wrong,
//                               the same blank and the same wrong value for
//                               every listener
//   parlourPlan: { seed, acts: { '2': [{ setId, atMs, listeners: [{ cat, size, fits, lean }] x3 }] x4, '4', '6' },
//                  leans }      the night's twelve Parlour Games (parlour.js
//                               planParlour): which set, when, which cat is
//                               secretly listening to each question and which
//                               answer it leans toward; `leans` is the lean
//                               table as Jenna left it at the deal. Every
//                               phone gets the same set at the same moment.
//   screenSalt: hex string      a secret the room screens seed their picks on
//                               (the bulletin's strikes, the news frame), so
//                               nothing public can replay them from the night id
//   exposure: {}                the exposure safeguard's record: { murderer?: { hushedAt, act },
//                               ghost?: { hushedAt, act } } (ledger.js noteExposure; the Hush)
//   dealtClues: []              the ledger of what went to whom (safeguards): entries
//                               { kind: 'document' | 'study' | 'echo', act, beat, key?, groupId?, at },
//                               never a word of content (ledger.js noteDealt)
//   spills?: n                  only after Spill the Beans (safeguards.js): how many times the
//                               story was re-rolled. rerollCase below keeps the keys above.
// }
// The rehearsal case has exactly the same keys, with bracketed stand-ins in
// every text field, so every consumer has one code path.

import { randomInt, createHash } from 'node:crypto'
import { MOTIVES } from './night.js'
import { STUDY_PLACEHOLDER } from './station.js'
import { newSeed, planParlour } from './parlour.js'

export const CAT_KEYS = ['irwin', 'granolia', 'boo', 'zimothy', 'salem']
export const TRUTH_CATS = ['irwin', 'boo', 'zimothy']
export const POOL_KEYS = ['ROOM', 'TIME', 'DURATION', 'COUNT', 'PLACE', 'CROWD']
export const DIAL_SIGN = Object.freeze({ ghost: 1, murderer: -1 })
export const SALEM_WARP_SHARE = 0.6

// Safe defaults for the six pools (seed/safe-content.json), used only when the
// workshop list is empty. The workshop's lines win.
export const DEFAULT_POOLS = {
  room: ['the study', 'the parlour', 'the scullery', 'the dining hall', 'the vestibule', 'the grounds'],
  time: ['just past breakfast', 'midmorning', 'teatime', 'dusk', 'after midnight', 'an ungodly hour'],
  duration: ['a full minute', 'ten minutes', 'an hour', 'all afternoon', 'four days', 'three weeks'],
  count: ['twice', 'three times', 'seven', 'eleven', 'a dozen', 'more than I could count'],
  place: ['the market', 'the chapel', 'the bank', "the milliner's", 'the club', 'the Grand'],
  crowd: ['the whole household', 'several guests', 'the staff', 'everyone, simply everyone', 'one unlucky soul'],
}

export const CASE_WARNINGS = ['rehearsal-fallback', 'no-sealed-content', 'trace-partner']

// ---------------------------------------------------------------------------
// Small helpers. `rng(n)` returns an integer in [0, n).

function shuffled(list, rng) {
  const a = [...list]
  for (let i = a.length - 1; i > 0; i--) { const j = rng(i + 1); [a[i], a[j]] = [a[j], a[i]] }
  return a
}
function choice(list, rng) { return list.length ? list[rng(list.length)] : undefined }
const str = x => typeof x === 'string' && x.trim().length > 0

// The pool tokens a kernel carries, as a multiset ['ROOM', 'ROOM', 'TIME'].
export function poolTokens(text) {
  return (String(text ?? '').match(/\[([A-Z]+)\]/g) ?? []).map(t => t.slice(1, -1)).filter(k => POOL_KEYS.includes(k))
}
// Any bracketed token that is not exactly a canonical pool token.
export function unknownTokens(text) {
  return (String(text ?? '').match(/\[[A-Za-z_ ]+\]/g) ?? []).filter(t => !POOL_KEYS.includes(t.slice(1, -1)))
}
function sameMultiset(a, b) {
  if (a.length !== b.length) return false
  const sa = [...a].sort(), sb = [...b].sort()
  return sa.every((x, i) => x === sb[i])
}

// A number in [0, 1) that is always the same for the same parts. Used for
// the per-guest decisions that must not change when a card is re-dealt
// (Salem's 60 percent). Never used for anything a guest could predict.
export function seededUnit(...parts) {
  const h = createHash('sha256').update(parts.map(String).join('\u0000')).digest()
  return h.readUInt32BE(0) / 0x100000000
}

export function salemText(k) { return typeof k === 'string' ? k : k?.text ?? '' }

// ---------------------------------------------------------------------------
// The structural check on one sealed motive set. Reason codes only.

export function checkSealed(doc) {
  const fails = []
  const kernels = doc?.kernels ?? {}
  for (const cat of CAT_KEYS) {
    const list = kernels[cat]
    if (!Array.isArray(list) || !list.length) { fails.push(`kernels:${cat}`); continue }
    for (const k of list) {
      const text = cat === 'salem' ? salemText(k) : k
      if (!str(text)) fails.push(`kernels:${cat}:empty`)
      else if (unknownTokens(text).length) fails.push(`kernels:${cat}:token`)
    }
  }
  const docs = Array.isArray(doc?.documents) ? doc.documents : []
  if (docs.length < 2) fails.push('documents')
  for (const d of docs) {
    if (!str(d?.text) || !str(d?.annotation) || !(str(d?.bigWord) || str(d?.emphasis))) fails.push('documents:field')
  }
  const fragments = Array.isArray(doc?.fragments) ? doc.fragments.filter(str) : []
  if (!fragments.length) fails.push('fragments')
  const study = Array.isArray(doc?.studyClue) ? doc.studyClue.filter(str) : []
  if (!study.length && docs.length < 2) fails.push('studyClue')
  if (Array.isArray(doc?.irwin) && doc.irwin.some(l => !str(l))) fails.push('irwin')
  // Granolia: every variant carries the same token multiset as some truthful kernel
  if (Array.isArray(kernels.granolia) && kernels.granolia.length) {
    const truth = TRUTH_CATS.flatMap(c => (Array.isArray(kernels[c]) ? kernels[c] : []).map(poolTokens))
    for (const g of kernels.granolia) {
      const t = poolTokens(g)
      if (!t.length || !truth.some(x => sameMultiset(x, t))) { fails.push('granolia'); break }
    }
  }
  return { ok: fails.length === 0, fails }
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

// One value per pool, for the whole night.
export function fixedPools(lists, rng) {
  const pools = {}
  for (const k of POOL_KEYS) {
    const key = k.toLowerCase()
    const list = Array.isArray(lists?.[key]) && lists[key].length ? lists[key] : DEFAULT_POOLS[key]
    pools[key] = choice(list, rng)
  }
  return pools
}

// The one blank Granolia gets wrong: a key her chosen kernel carries, and a
// different value from the same pool. Null when her kernel has no blanks.
export function granoliaSlot(kernelText, pools, lists, rng) {
  const keys = [...new Set(poolTokens(kernelText))].map(k => k.toLowerCase())
  if (!keys.length) return null
  const key = choice(keys, rng)
  const list = Array.isArray(lists?.[key]) && lists[key].length ? lists[key] : DEFAULT_POOLS[key]
  const others = list.filter(v => v !== pools[key])
  return { key, value: choice(others.length ? others : list, rng) }
}

// The night's Parlour Games, from a seed of the case's own (parlour.js).
// The lean table rides along, so a window the plan does not know (the host's
// Light up button) can still find a cat's fitting answer.
export function parlourPlanFor(rng, { bankIds = [], leans = null, config = null } = {}) {
  const seed = newSeed(rng)
  return { ...planParlour({ seed, bankIds, config, leans }), leans: leans ?? {} }
}

// Workshop template lines are "Name — brief". The name is what the phone prints.
export function templateNames(items) {
  return (items ?? []).map(i => (typeof i === 'string' ? i : i?.text ?? '')).map(t => t.split(/\s[—–-]\s/)[0].trim()).filter(Boolean)
}

// The screens' secret: 128 bits from the case's rng, as hex. Never leaves
// cases/{nightId} (screen.js refuses a public doc that carries it).
export function screenSalt(rng) {
  return Array.from({ length: 8 }, () => rng(65536).toString(16).padStart(4, '0')).join('')
}

function common({ nightId, roster, rng, now, templates, poolLists, parlour }) {
  const list = Array.isArray(roster) ? roster : Object.entries(roster ?? {}).map(([key, r]) => ({ key, ...r }))
  const { roles, murderer, ghost } = pickRoles(list.map(g => g.key), rng)
  const names = templateNames(templates)
  return {
    list, roles, murderer, ghost,
    victimCharacterId: ghost ? list.find(g => g.key === ghost)?.characterId ?? null : null,
    template: choice(names, rng) ?? 'Receipt',
    pools: fixedPools(poolLists, rng),
    parlourPlan: parlourPlanFor(rng, parlour),
    screenSalt: screenSalt(rng),
    createdAt: new Date(now ?? Date.now()),
    nightId,
  }
}

// ---------------------------------------------------------------------------
// The real case, from one sealed motive set.

export function buildCase({ nightId, roster, sealedDoc, motiveN, templates = [], pools = {}, rng = randomInt, parlour = {}, now } = {}) {
  const check = checkSealed(sealedDoc)
  if (!check.ok) { const e = new Error('sealed set failed its structural check'); e.code = 'sealed-shape'; e.fails = check.fails; throw e }
  const base = common({ nightId, roster, rng, now, templates, poolLists: pools, parlour })
  const variant = {}
  const kernels = {}
  for (const cat of CAT_KEYS) {
    const list = sealedDoc.kernels[cat]
    variant[cat] = rng(list.length)
    kernels[cat] = cat === 'salem' ? list.map(salemText) : [...list]
  }
  const salemAnchors = sealedDoc.kernels.salem.map(k => (typeof k === 'object' ? k.anchor ?? '' : ''))
  const docs = shuffled(sealedDoc.documents, rng).map(d => ({
    template: base.template, bigWord: str(d.bigWord) ? d.bigWord : d.emphasis, text: d.text, annotation: d.annotation,
  }))
  const studyList = Array.isArray(sealedDoc.studyClue) ? sealedDoc.studyClue.filter(str) : []
  const studyClue = { text: studyList.length ? choice(studyList, rng) : docs[1].text }
  const fragments = sealedDoc.fragments.filter(str)
  const irwinLines = Array.isArray(sealedDoc.irwin) && sealedDoc.irwin.length ? [...sealedDoc.irwin] : fragments.slice(0, 3)
  return {
    rehearsal: false, createdAt: base.createdAt,
    roles: base.roles, murderer: base.murderer, ghost: base.ghost,
    motive: Number(motiveN), victimCharacterId: base.victimCharacterId,
    dialSign: { ...DIAL_SIGN }, dialMap: { ...DIAL_SIGN }, dial: 0, dialLog: [],
    kernels, variant, salemAnchors, salemTruthIndex: variant.irwin,
    documents: docs, studyClue, echo: { fragment: choice(fragments, rng) }, irwin: { lines: irwinLines },
    pools: base.pools,
    granoliaSlot: granoliaSlot(kernels.granolia[variant.granolia], base.pools, pools, rng),
    parlourPlan: base.parlourPlan, screenSalt: base.screenSalt, exposure: {}, dealtClues: [],
  }
}

// ---------------------------------------------------------------------------
// The rehearsal case: identical keys, bracketed stand-ins in every text field.
// Nothing in it is a secret, and nothing in it is ever printed either, so
// the two paths stay indistinguishable to the tooling.

const CAT_NAMES = {
  irwin: 'Sir Irwin', granolia: 'Granolia Lickspittle', boo: 'Miss Boo LaRue',
  zimothy: 'Zimothy Clawford, Esq.', salem: 'Salem Crookshank',
}

export function rehearsalCase({ nightId, roster, templates = [], pools = {}, rng = randomInt, parlour = {}, now } = {}) {
  const base = common({ nightId, roster, rng, now, templates, poolLists: pools, parlour })
  const kernels = {}
  const variant = {}
  for (const cat of CAT_KEYS) {
    kernels[cat] = [`(Rehearsal. Here ${CAT_NAMES[cat]} says something true about what happened in [ROOM] at [TIME], in two or three sentences, with one detail only this cat would notice.)`]
    variant[cat] = 0
  }
  kernels.salem = ['(Rehearsal. Here Salem Crookshank gets what happened in [ROOM] at [TIME] confidently wrong, with one true object in it.)']
  const docText = n => `(Rehearsal document ${n}. The document for this motive goes here: forty to sixty words of a receipt, a telegram or a notice, with one word printed large and one handwritten note in the margin.)`
  const documents = [1, 2].map(n => ({ template: base.template, bigWord: 'REHEARSAL', text: docText(n), annotation: '(a handwritten note)' }))
  return {
    rehearsal: true, createdAt: base.createdAt,
    roles: base.roles, murderer: base.murderer, ghost: base.ghost,
    motive: MOTIVES[rng(MOTIVES.length)].n, victimCharacterId: base.victimCharacterId,
    dialSign: { ...DIAL_SIGN }, dialMap: { ...DIAL_SIGN }, dial: 0, dialLog: [],
    kernels, variant, salemAnchors: ['(rehearsal)'], salemTruthIndex: 0,
    documents, studyClue: { text: STUDY_PLACEHOLDER },
    echo: { fragment: '(Rehearsal. The news fragment for this motive fills the gap here.)' },
    irwin: { lines: ['(Rehearsal. Irwin line one.)', '(Rehearsal. Irwin line two.)', '(Rehearsal. Irwin line three.)'] },
    pools: base.pools,
    granoliaSlot: granoliaSlot(kernels.granolia[0], base.pools, pools, rng),
    parlourPlan: base.parlourPlan, screenSalt: base.screenSalt, exposure: {}, dealtClues: [],
  }
}

// The keys every case carries, for the tests and for anyone building against the shape.
export const CASE_KEYS = Object.keys(rehearsalCase({ nightId: 'shape', roster: [], rng: () => 0 })).sort()

// ---------------------------------------------------------------------------
// Spill the Beans (safeguards.js): the story is re-rolled, the people are not.
// `prev` is the case as it stands, `fresh` a case just built from another
// sealed set (buildCase) or a fresh rehearsal (rehearsalCase). The result
// keeps the Murderer, every guest's character, the night's fixed pools, the
// stationery template and the night's Parlour Games; it takes the new motive and
// everything that hangs off it; it picks a new Ghost (never the Murderer,
// never the old Ghost when a third guest exists) and starts the dial again.
// Pure: no database, nothing printed.

export function nextMotive(current, rng = randomInt) {
  const others = MOTIVES.map(m => m.n).filter(n => n !== Number(current))
  return others.length ? choice(others, rng) : Number(current)
}

export function rerollCase({ prev, fresh, roster = [], poolLists = {}, rng = randomInt } = {}) {
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
  const template = prev?.documents?.[0]?.template ?? fresh.documents?.[0]?.template ?? 'Receipt'
  const pools = prev?.pools ?? fresh.pools
  const granoliaKernel = fresh.kernels?.granolia?.[fresh.variant?.granolia ?? 0] ?? ''
  return {
    ...fresh,
    createdAt: prev?.createdAt ?? fresh.createdAt,
    roles, murderer, ghost, motive,
    victimCharacterId: ghost ? list.find(g => g.key === ghost)?.characterId ?? null : null,
    dialSign: { ...(prev?.dialSign ?? DIAL_SIGN) }, dialMap: { ...(prev?.dialMap ?? DIAL_SIGN) }, dial: 0, dialLog: [],
    documents: (fresh.documents ?? []).map(d => ({ ...d, template })),
    pools,
    granoliaSlot: granoliaSlot(granoliaKernel, pools, poolLists, rng),
    parlourPlan: prev?.parlourPlan ?? fresh.parlourPlan,
    screenSalt: prev?.screenSalt ?? fresh.screenSalt,
    exposure: {},
    dealtClues: Array.isArray(prev?.dealtClues) ? prev.dealtClues : [],
    spills: (prev?.spills ?? 0) + 1,
  }
}
