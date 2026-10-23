// The dealer: everything a phone is handed during the night, beat by beat.
// Pure logic over a Firestore `db`, shared by the Cloud Functions and the tests.
//
// The night is a list of beats (seed/night.json). The host presses one button
// ("Next"); the server moves the beat and runs that beat's action here:
// deal a card to every phone, open a window on every phone at once, make the
// Act 4 groups, rotate them, start the drawing, reveal, score.
//
// SEAL RULE. Two kinds of content pass through here:
//  - SAFE: notices, role cards (all three are safe copy), openers, closers,
//    brush-offs, pools, the Parlour Games bank, station text.
//  - CASE: who did it, who died, the motive, the kernels, the documents.
//    Read ONLY from cases/{nightId} (Admin SDK). Never logged, never returned
//    to a caller, never written anywhere a client can read except the one
//    phone it is dealt to, as its own card.
// The case is built at the Act 1 blackout (buildCaseForNight, below): from
// one sealed motive set when the night is the party, or a THROWAWAY
// rehearsal case with placeholder text in brackets otherwise. Both have the
// shape in case.js. The rehearsal case is created fresh for every night and
// discarded with it. Nothing in either is ever printed.

import { randomInt } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { dirname, join as joinPath } from 'node:path'
import { fileURLToPath } from 'node:url'
import { FieldValue } from 'firebase-admin/firestore'
import { MOTIVES, NightError, readArea, characterById, CHARACTERS } from './night.js'
import { makeRotation, rotationPath, studyPath, studyClueCard, studyReveal, stationAlive, finishStudy, ABSENT_SLOT_MS } from './station.js'
import { buildCase, rehearsalCase, checkSealed, seededUnit, SALEM_WARP_SHARE } from './case.js'
import { bagsClue, bagsText } from './bags.js'
import { pushDial, parityCheck, fillerLine, GRACE_MS } from './windows.js'
import { configOf, catMoves, applyMoves, stopOf, extraListeners } from './parlour.js'
import { LEANS_DOC } from './steward.js'
import { hintFamilyFor, hintCatFor, memoryPick } from './families.js'
import * as finale from './finale.js'
import { noteDealt, isHushed, spotlightLines } from './ledger.js' // the safeguards' records (never content)
import { traceOf, pickPartner, workReveal, shownReveal } from './traces.js'

const here = dirname(fileURLToPath(import.meta.url))
export const NIGHT = JSON.parse(readFileSync(joinPath(here, '..', 'seed', 'night.json'), 'utf8'))
export const STATIONS = NIGHT.stations
export const WINDOWS = NIGHT.windows
export const PARLOUR = configOf(NIGHT.parlour)

export const CAT_KEYS = ['irwin', 'granolia', 'boo', 'zimothy', 'salem']
export const CAT_NAMES = {
  irwin: 'Sir Irwin', granolia: 'Granolia Lickspittle', boo: 'Miss Boo LaRue',
  zimothy: 'Zimothy Clawford, Esq.', salem: 'Salem Crookshank',
}
// The house, as the phones name the rooms. Granolia is always in the study.
export const ROOMS = ['the parlour', 'the dining hall', 'the study', 'the vestibule', 'the scullery', 'the grounds']
export const POOL_KEYS = ['ROOM', 'TIME', 'DURATION', 'COUNT', 'PLACE', 'CROWD']

// ---------------------------------------------------------------------------
// Safe default copy. Jon may see and change all of it (workshop lists win).

export const ROLE_CARDS = {
  MURDERER: 'The Manor has lost someone tonight, and it was your doing. Why, you could not say. Walk, talk, and play on. Name the other two before they name you.',
  GHOST: 'The Manor has lost you tonight. Nobody has noticed, not even you, until now. Walk, talk, and play on. Name the other two before the night is out.',
  DETECTIVE: 'The Manor has lost someone tonight. Nobody has noticed, and nobody knows why. Walk, talk, and play on. Name all three before the night is out.',
}

export const NOTICES = {
  meet: { title: 'The household', text: 'Five of them live here: four cats and the birthday boy. Open the Cats tab and see how each one stands with you tonight.', button: 'I have met them' },
  introduce: { title: 'Say who you are', text: 'Out loud, to the room: your name and your profession. Nothing else. Then tap.', button: 'I have said it' },
  ready: { title: 'Settle in', text: 'The evening is about to turn. Keep your phone on you.', button: 'Ready' },
  orient: { title: 'Where things are', text: 'Your Reticule is the row of tabs at the bottom. Clues is where everything you are told will collect. Motives is the list of nineteen; cross off as you go. The cats are in Cats. The rules are in Rules.', button: 'Got it' },
  news: { title: 'Eyes up', text: 'Something is on the big screen. Watch it. Your phone will tell you where to go when it is over.', button: 'I watched it' },
  checkin: { title: 'Check-in', text: 'Read your clues once more. Cross off any motive you are sure of. Then go in to dinner.', button: 'Done' },
  down: { title: 'Dinner', text: 'Phones down and charging. The radio is on. Listen for the crackle.', button: 'Phone is down' },
  bulletin: { title: 'The bulletin', text: 'Did you hear it? Talk it over at the table. Cross off what you can.', button: 'Heard it' },
  roam: { title: 'Cake', text: 'Cake in hand, go where you like. The bags may be talked about now, out loud, in any detail you can manage.', button: 'Cake acquired' },
  irwin: { title: 'The chime', text: 'Sir Irwin has something to say. He will say it on the living room screen and nowhere else. Go.', button: 'On my way' },
  door: { title: 'The door is open', text: 'The light in the hall is green. The bedroom screen is showing what was left behind. Go and look, then come back to the living room.', button: 'I have seen it' },
  eyes: { title: 'Eyes on the screen', text: 'The truth is about to be read out. Watch the living room screen.', button: 'Watching' },
}

export const STATION_TEXT = {
  study: { title: 'The study', text: 'Go up to the study. Touch any panel to begin. Granolia is in there somewhere; she helps. Fifteen minutes, then out, whatever happened.' },
  cat: { title: 'A cat', text: 'Find the cat named on your phone. It will talk to the group together.' },
  bags: { title: 'The bags', text: 'Your phone names a property. Two or three bags in the house have it. Ask people to open theirs.' },
  puzzle: { title: 'The memory match', text: 'Go to the iPad. Turn two cards at a time and find the six pairs together. Clear the board and one motive comes off your list.' },
  checkin: { title: 'Check-in', text: 'Sit down together. Read your clues out to each other. Cross off motives.' },
}

// Built-in Parlour Game sets, used only when the workshop bank is empty.
// Silly, light, about nothing. Points are kept on the server; no phone sees them.
export const REHEARSAL_SETS = [
  { id: 'rehearsal-1', beats: [
    { q: 'Ice in orange juice?', n: 2, a: 'Always', av: 2, b: 'Never', bv: -1 },
    { q: 'A hat indoors is', n: 2, a: 'Fine', av: 1, b: 'A crime', bv: -2 },
    { q: 'The best stair is', n: 2, a: 'The top one', av: 1, b: 'The bottom one', bv: 1 },
  ] },
  { id: 'rehearsal-2', beats: [
    { q: 'Soup is a drink', n: 2, a: 'Yes', av: -2, b: 'No', bv: 2 },
    { q: 'Pick a sock', n: 2, a: 'Left', av: 1, b: 'Right', bv: -1 },
    { q: 'A pigeon with a tiny hat', n: 2, a: 'Trust it', av: 2, b: 'Do not', bv: -2 },
  ] },
  { id: 'rehearsal-3', beats: [
    { q: 'Would you rather hum or whistle for a week', n: 2, a: 'Hum', av: -1, b: 'Whistle', bv: 1 },
    { q: 'Bread, buttered', n: 2, a: 'Edge to edge', av: 2, b: 'A dab', bv: -1 },
    { q: 'The moon is', n: 2, a: 'Too close', av: 0, b: 'Too far', bv: 1 },
  ] },
]

// ---------------------------------------------------------------------------
// Small helpers

function pickInt(n) { return randomInt(n) }
function shuffled(list, pick = pickInt) {
  const a = [...list]
  for (let i = a.length - 1; i > 0; i--) { const j = pick(i + 1); [a[i], a[j]] = [a[j], a[i]] }
  return a
}
function choice(list, pick = pickInt) { return list.length ? list[pick(list.length)] : undefined }
function at(now, delta) { return new Date(now + delta) }
export function ms(t) {
  if (!t) return 0
  if (typeof t.toMillis === 'function') return t.toMillis()
  if (t instanceof Date) return t.getTime()
  return Number(t) || 0
}

export function beatsOf(act) { return NIGHT.acts[String(act)]?.beats ?? [] }
export function beatSpec(act, key) { return beatsOf(act).find(b => b.key === key) ?? null }

// "LABEL: text" lines from a workshop list.
function labelled(items) {
  const out = {}
  for (const it of items) {
    const m = /^([A-Z][A-Z0-9 '&/]*):\s*(.+)$/s.exec(it.text.trim())
    if (m) out[m[1].trim()] = m[2].trim()
  }
  return out
}

// Everyone at the party: roster key → { name, characterId, uid }.
async function guests(db, nightId) {
  const [nightSnap, deckSnap] = await Promise.all([db.doc(`nights/${nightId}`).get(), db.doc(`nights/${nightId}/private/deck`).get()])
  if (!nightSnap.exists) throw new NightError('no-night', 'No such night.')
  const night = nightSnap.data()
  const uids = deckSnap.exists ? (deckSnap.data().uids ?? {}) : {}
  const list = Object.entries(night.roster ?? {}).map(([key, r]) => ({ key, ...r, uid: uids[key] ?? null })).filter(g => g.uid)
  return { night, list }
}

// Add one card to a phone, once. Cards carry an id; dealing the same id twice
// is a no-op, so "Next" pressed twice never doubles a card.
async function dealCard(db, uid, card) {
  const ref = db.doc(`sessions/${uid}`)
  const snap = await ref.get()
  if (!snap.exists) return false
  const cards = snap.data().cards ?? []
  if (cards.some(c => c.id === card.id)) return false
  await ref.update({ cards: [...cards, { ...card, at: new Date() }] })
  return true
}

export function noticeCard(key, act, beat, overrides = {}) {
  const n = { ...(NOTICES[key] ?? { title: key, text: '', button: 'Done' }), ...overrides }
  return { id: `${act}-${beat}-${key}`, act, beat, kind: 'notice', key, title: n.title, text: n.text, button: n.button }
}

// ---------------------------------------------------------------------------
// The case. Read from cases/{nightId}. Built once, at the Act 1 blackout
// (the host's Power returns), by buildCaseForNight; never replaced once it
// has roles, so a second press, a jump or a late call all find the same case.

export async function readCase(db, nightId) {
  const snap = await db.doc(`cases/${nightId}`).get()
  return snap.exists ? snap.data() : null
}

export const MAX_CODE_TRIES = 5

// The decision for the night, blind:
//  - nights/{id}.forceRehearsal is true (the default when a night is made;
//    the workshop's Game night page has one checkbox, "This is the party
//    night", that makes it false), or there is no sealed manifest: write
//    the rehearsal case and nights/{id}.rehearsal = true (and, on a party
//    night with no manifest or no codes, caseWarning 'no-sealed-content').
//  - otherwise draw one code with crypto randomness, read sealed/{code},
//    run the structural check (case.js checkSealed); on a failure draw
//    another, up to five, and only then fall back to rehearsal with
//    nights/{id}.caseWarning = 'rehearsal-fallback'.
// Also the cast-lock check: every in-play trace needs an in-play look-alike,
// else caseWarning 'trace-partner'. Logs counts only.
// Counts only, and quiet under node:test unless a test passes its own `log`.
const defaultLog = line => { if (!process.env.NODE_TEST_CONTEXT) console.log(line) }

export async function buildCaseForNight(db, nightId, { pick = pickInt, now = Date.now(), log = defaultLog } = {}) {
  const existing = await readCase(db, nightId)
  if (existing?.roles) return existing
  const { night, list } = await guests(db, nightId)
  const [templates, poolItems, bank] = await Promise.all([readArea(db, 'templates'), readArea(db, 'pools'), questionBank(db)])
  const pools = {}
  for (const k of POOL_KEYS) pools[k.toLowerCase()] = poolItems.filter(i => i.pool === k.toLowerCase()).map(i => i.text)
  const forceRehearsal = night.forceRehearsal !== false
  // the cats' leans are sealed (Jenna's lean table): read only for the party, never for a rehearsal
  const leans = forceRehearsal ? null : await parlourLeans(db)
  const parlour = { bankIds: bank.map(b => b.id), leans, config: PARLOUR }
  const common = { nightId, roster: list, templates, pools, rng: pick, parlour, now }

  const warnings = []
  let c = null
  let tried = 0
  const manifestSnap = forceRehearsal ? null : await db.doc('sealed/manifest').get()
  const codes = manifestSnap?.exists ? Object.keys(manifestSnap.data().codes ?? {}) : []
  if (!forceRehearsal && codes.length) {
    const order = shuffled(codes, pick).slice(0, MAX_CODE_TRIES)
    for (const code of order) {
      tried++
      const snap = await db.doc(`sealed/${code}`).get()
      const sealedDoc = snap.exists ? snap.data() : null
      if (!sealedDoc || !checkSealed(sealedDoc).ok) continue
      try {
        c = buildCase({ ...common, sealedDoc, motiveN: manifestSnap.data().codes[code] })
        break
      } catch (e) {
        if (e?.code !== 'sealed-shape') throw new NightError('invalid', 'The case could not be built.')
      }
    }
    if (!c) warnings.push('rehearsal-fallback')
  } else if (!forceRehearsal) {
    // the party night with nothing sealed to draw from (the generator was never run, or ran
    // against the other project): the Host tab must say so, or the night looks fine until a cat speaks
    warnings.push('no-sealed-content')
  }
  if (!c) c = rehearsalCase(common)

  // cast lock: every trace at the party needs a look-alike at the party
  const inPlay = [...new Set(list.map(g => traceOf(g.characterId)?.trace).filter(Boolean))]
  if (inPlay.length >= 2 && inPlay.some(tr => !pickPartner(tr, inPlay, { pick }))) warnings.push('trace-partner')

  await db.doc(`cases/${nightId}`).set(c)
  await db.doc(`nights/${nightId}`).update({ rehearsal: c.rehearsal, caseWarning: warnings.length ? warnings.join(',') : null })
  const kernelCount = CAT_KEYS.reduce((n, cat) => n + (c.kernels[cat]?.length ?? 0), 0)
  log(`case ${JSON.stringify({ nightId, kernelCount, docCount: c.documents.length, rehearsal: c.rehearsal, triedCodes: tried })}`)
  return c
}

// The older name, kept for every caller that needs a case before the host
// has pressed Power returns (a rehearsal jump, a test). Same rules.
export const ensureCase = buildCaseForNight

export function roleOf(c, key) { return c?.roles?.[key] ?? 'detective' }

// ---------------------------------------------------------------------------
// Testimony. OPENER (safe) + KERNEL (case) + CLOSER (safe), gated by affection.

// Pass comfortably → full; narrowly → partial; fail → a brush-off, no penalty.
// Irwin never fails. Boo says nothing under 4 and everything at 4 or more.
export function affectionOutcome(cat, level, pick = pickInt) {
  if (cat === 'irwin') return 'full'
  if (cat === 'boo') return level >= 4 ? 'full' : 'deflect'
  const roll = pick(5) + 1 // 1..5
  if (level > roll) return 'full'
  if (level === roll) return 'partial'
  return 'deflect'
}

// Fill [ROOM], [TIME] and the rest. Pure when the case carries its pools
// (one value per key, fixed for the night): every blank gets the case's
// value, and Granolia's one wrong blank is exactly `slot` ({ key, value }),
// the same for every listener. It rolls from lists only when the case has
// no pools (an old case doc, or the unit test), swapping one blank at random
// for Granolia.
export function fillPools(kernel, pools, { garble = false, pick = pickInt, slot = null } = {}) {
  const fixed = pools && POOL_KEYS.some(k => typeof pools[k.toLowerCase()] === 'string')
  if (fixed) {
    let swapped = false
    return kernel.replace(/\[(ROOM|TIME|DURATION|COUNT|PLACE|CROWD)\]/g, (_, k) => {
      const key = k.toLowerCase()
      if (garble && slot && slot.key === key && !swapped) { swapped = true; return slot.value }
      return typeof pools[key] === 'string' ? pools[key] : `[${key}]`
    })
  }
  const used = []
  let text = kernel.replace(/\[(ROOM|TIME|DURATION|COUNT|PLACE|CROWD)\]/g, (_, k) => {
    const list = pools?.[k.toLowerCase()] ?? []
    const v = choice(list, pick) ?? `[${k.toLowerCase()}]`
    used.push({ k, v })
    return v
  })
  if (garble && used.length) {
    const s = used[pick(used.length)]
    const others = (pools?.[s.k.toLowerCase()] ?? []).filter(x => x !== s.v)
    const swap = choice(others, pick)
    if (swap) text = text.replace(s.v, swap)
  }
  return text
}

function firstSentence(text) {
  const m = /^(.+?[.!?])(\s|$)/s.exec(text.trim())
  return m ? m[1] : text
}

// The safe's three numbers ride on the testimony in a safe sentence, never
// inside the kernel: ui_copy "NUMBERS: ..." with [A] [B] [C] slots.
export const DEFAULT_NUMBERS_LINE = 'If it matters, the numbers were [A], [B] and [C].'
export const DEFAULT_SCRAP = { title: 'A scrap of paper', text: 'The cat would not talk, but left a scrap of paper behind. On it, in a careful paw: [A], [B] and [C].', button: 'Keep it' }
export function numbersSentence(codes, line = DEFAULT_NUMBERS_LINE) {
  if (!Array.isArray(codes) || codes.length !== 3) return ''
  return line.replace('[A]', String(codes[0])).replace('[B]', String(codes[1])).replace('[C]', String(codes[2]))
}

export function assembleTestimony({ cat, outcome, opener, closer, refusal, kernel, numbers = '' }) {
  if (outcome === 'deflect') return { cat, outcome, lines: [refusal] }
  const middle = outcome === 'partial' ? firstSentence(kernel) : kernel
  return { cat, outcome, lines: [opener, middle, numbers, closer].filter(Boolean) }
}

async function voicePools(db) {
  const [openers, closers, refusals, poolItems, uiItems] = await Promise.all([
    readArea(db, 'openers'), readArea(db, 'closers'), readArea(db, 'refusals'), readArea(db, 'pools'), readArea(db, 'ui_copy'),
  ])
  const by = (items, cat) => items.filter(i => i.cat === cat).map(i => i.text)
  const pools = {}
  for (const k of POOL_KEYS) pools[k.toLowerCase()] = poolItems.filter(i => i.pool === k.toLowerCase()).map(i => i.text)
  const ui = labelled(uiItems)
  const numbersLine = ui.NUMBERS && ui.NUMBERS.includes('[A]') ? ui.NUMBERS : DEFAULT_NUMBERS_LINE
  const scrap = ui['NOTICE SCRAP'] && ui['NOTICE SCRAP'].includes('[A]') ? { text: ui['NOTICE SCRAP'] } : {}
  return { openers: c => by(openers, c), closers: c => by(closers, c), refusals: c => by(refusals, c), pools, numbersLine, scrap }
}

// The middle of a testimony: the case's kernel for this cat, at the one
// variant the case fixed for the night (so two guests compare identical
// wording). Salem inverts about 60 percent of the time: a roll seeded on
// (nightId, guestKey) picks his warped variant or the true line (Irwin's
// kernel at salemTruthIndex), and the same guest always gets the same
// branch. Never addressed to anyone. A case doc with no kernels (an old
// night) gets the bracketed stand-in.
export function kernelFor(c, cat, { nightId = '', guestKey = '' } = {}) {
  const list = c?.kernels?.[cat]
  if (!Array.isArray(list) || !list.length) {
    return { text: `(Rehearsal. Here ${CAT_NAMES[cat]} says something true about what happened in [ROOM] at [TIME], in two or three sentences, with one detail only this cat would notice.)`, warped: false }
  }
  const i = Math.min(list.length - 1, Math.max(0, Number(c.variant?.[cat]) || 0))
  const pickText = k => (typeof k === 'string' ? k : k?.text ?? '')
  if (cat === 'salem') {
    const truth = c.kernels?.irwin
    const warped = seededUnit(nightId, guestKey, 'salem') < SALEM_WARP_SHARE
    if (!warped && Array.isArray(truth) && truth.length) {
      const t = Math.min(truth.length - 1, Math.max(0, Number(c.salemTruthIndex) || 0))
      return { text: pickText(truth[t]), warped: false }
    }
    return { text: pickText(list[i]), warped: true }
  }
  return { text: pickText(list[i]), warped: false }
}

const DEFAULT_VOICE = {
  opener: { irwin: 'Oh! You came to talk to me.', granolia: 'Sit, sit. You will not believe.', boo: 'Fine. Once.', zimothy: 'I will be brief. Brevity is free.', salem: 'Finally. Someone with sense.' },
  closer: { irwin: 'That is everything. I am a good boy.', granolia: 'That is how I remember it, anyway.', boo: 'That is all.', zimothy: 'That concludes my statement.', salem: 'You are welcome.' },
  refusal: { irwin: '', granolia: 'Not now, dear. I have lost my thread.', boo: 'No.', zimothy: 'My time is billable. Yours is not.', salem: 'I do not talk to people who stand like that.' },
}

// One cat's card for one listener (a guest in Act 2, a group in Act 4).
// `codes` are the safe's three numbers, carried in a safe sentence for a
// full or partial answer; `roll` lets a test fix the affection outcome.
export async function testimonyCard(db, { c, cat, level, act, beat, id, room, codes = null, voice, nightId = '', guestKey = '', roll = pickInt }) {
  const v = voice ?? await voicePools(db)
  const pick = (list, fallback) => choice(list) ?? fallback
  const outcome = affectionOutcome(cat, level, roll)
  const raw = kernelFor(c, cat, { nightId, guestKey })
  const kernel = fillPools(raw.text, c?.pools ?? v.pools, { garble: cat === 'granolia', slot: c?.granoliaSlot ?? null })
  const t = assembleTestimony({
    cat, outcome,
    opener: pick(v.openers(cat), DEFAULT_VOICE.opener[cat]),
    closer: pick(v.closers(cat), DEFAULT_VOICE.closer[cat]),
    refusal: pick(v.refusals(cat), DEFAULT_VOICE.refusal[cat]),
    kernel,
    numbers: numbersSentence(codes, v.numbersLine),
  })
  return { id, act, beat, kind: 'testimony', cat, catName: CAT_NAMES[cat], room, outcome, lines: t.lines, placeholder: !!c?.rehearsal }
}

// When a cat will not talk, the numbers still reach the phone: a second card.
export function scrapCard(act, beat, codes, over = {}) {
  const s = { ...DEFAULT_SCRAP, ...over }
  return { id: `${act}-${beat}-scrap`, act, beat, kind: 'notice', key: 'scrap', title: s.title, text: numbersSentence(codes, s.text), button: s.button }
}

// ---------------------------------------------------------------------------
// Act 2, Lights Out: the phones run the room rotation (docs/solving-the-case.md,
// decided 21 Oct 2026, updated 22 Oct). Four cats wait in four rooms
// (seed/night.json solving.catRooms: Granolia in the Study, Salem in the
// Orangerie, Zimothy in the Library, Boo in the Entryway; never Irwin, never
// the living room). Every guest visits all four cats, one at a time, in a
// route the deal staggers so up to four guests are out at once. Only one of
// the four, picked at the deal (cases/{id}.solving.hintCats), gives the real
// hint; the other three only greet in character. Only one guest is at a cat
// at a time, so nobody overhears a private hint: everyone else waits in the
// living room. A guest scans the code in the room (the play URL with
// ?meet=<cat>), the cat greets them on their phone, they tap done, and they
// join the next cat's line.
//
// Every guest always has a next step on the phone (sessions/{uid}.lights):
//   wait  stay in the living room; the phone will send you
//   go    go to <room>; <cat> is waiting; scan the code there
//   with  the cat is talking to you; tap when you have heard it
//   done  all four cats seen; back to the living room (at the chime: supper)
// A guest who never turns up (goMinutes) or never taps done (withMinutes) is
// moved on by the tick, and gets the greeting on the phone anyway: delay,
// never destroy. The end of the act hands every guest who has not yet met
// their hint cat that greeting the same way (flushLights).
//
// The line itself is server-only: nights/{id}/private/lights
//   { act, beat, cats: { cat: { queue: [guestKey], at: guestKey | null, since } },
//     guests: { guestKey: { route: [cat] x4, leg, cat, met: [cat], step, since, supper? } } }
// Every move goes through one transaction, so two guests are never at a cat at once (F20).

export const CAT_ROOMS = NIGHT.solving?.catRooms ?? { granolia: 'the Study', salem: 'the Orangerie', zimothy: 'the Library', boo: 'the Entryway' }
export const LIGHTS_CATS = Object.keys(CAT_ROOMS)
export const GO_MS = (Number(NIGHT.solving?.goMinutes) || 4) * 60_000
export const WITH_MS = (Number(NIGHT.solving?.withMinutes) || 5) * 60_000
export const LIGHTS_STEPS = ['wait', 'go', 'with', 'done']
export function lightsPath(nightId) { return `nights/${nightId}/private/lights` }
const CAT_THEM = { granolia: 'her', boo: 'her', salem: 'him', zimothy: 'him' }

// What each step says on the phone. Open copy (docs/handoff-2026-10-22.md
// §6b); the workshop's ui_copy lines LIGHTS WAIT, LIGHTS GO, LIGHTS NEXT,
// LIGHTS WITH, LIGHTS DONE and LIGHTS SUPPER win ([CAT], [ROOM] and [THEM]
// filled in). NEXT is GO for every cat after the first.
export const LIGHTS_TEXT = {
  wait: { title: 'Stay in the living room', text: "Make yourself at home in the living room. You'll be called soon." },
  go: { title: 'Go to [ROOM]', text: "[CAT] is waiting for you in [ROOM]. Go alone, and don't keep [THEM] waiting. Find the QR code in the room and scan it to say hello." },
  next: { title: 'Go to [ROOM]', text: "Time's up. [CAT] is expecting you in [ROOM]. Find the QR code in the room and scan it to say hello." },
  with: { title: '[CAT] is talking to you', text: 'Read what the cat says. It is for you alone. Tap when you have heard it.' },
  done: { title: 'Back to the living room', text: 'You have seen all four cats. Tell nobody what you heard. The chime will call everyone to supper in the Orangerie.' },
  supper: { title: 'Supper is served', text: "That's the chime! Supper is served in the Orangerie." },
}

// What the three cats that do not give this guest a hint say instead. Open
// copy (handoff §6b); the workshop's ui_copy lines GREET <CAT> win.
export const GREETING_ONLY = {
  salem: "Off my lawn. Oh, it's you. Fine. Nothing to report, and I'd report it backwards anyway.",
  zimothy: "Ah, a visitor. My consultation fee is one compliment. I've nothing for you today, but I've billed you all the same.",
  boo: "Darling. Love the outfit. Don't ask me anything, I'm off duty.",
  granolia: 'Oh! Hi! Hi. Hello. I had something to tell you, and now it\'s gone. Want to sit with me anyway?',
}

// The private hint on a cat's greeting: rules out one wrong family of
// motives (families.js). The lines are an open bank (the Cat Hint Lines
// doc); which one plays is the case's. Until the bank is in, the card
// carries this marked stand-in, which names no family.
export const HINT_PLACEHOLDER = '(Not written yet. Here the cat privately rules out one family of motives.)'
export function hintLine(c, family) {
  return { text: HINT_PLACEHOLDER, placeholder: true, ...(family ? {} : { none: true }) }
}

// Every guest's route: all four cats, staggered round the room so the first
// wave goes to four different cats, and each cat's line starts with the
// guests who see it first. Random order, from the pick.
export function planWaves(keys, pick = pickInt) {
  const cats = shuffled(LIGHTS_CATS, pick)
  const queues = Object.fromEntries(LIGHTS_CATS.map(cat => [cat, []]))
  const routes = {}
  shuffled(keys, pick).forEach((k, i) => {
    const route = cats.map((_, j) => cats[(i + j) % cats.length])
    routes[k] = route
    queues[route[0]].push(k)
  })
  return { routes, queues }
}

// The step a phone shows, with its words filled in.
export function lightsCard(step, cat, ui = {}, { leg = 0, supper = false } = {}) {
  const variant = step === 'done' && supper ? 'supper' : step === 'go' && leg > 0 ? 'next' : step
  const base = LIGHTS_TEXT[variant] ?? LIGHTS_TEXT.wait
  const label = `LIGHTS ${variant.toUpperCase()}`
  const fill = t => String(t).replace(/\[CAT\]/g, CAT_NAMES[cat] ?? 'A cat').replace(/\[ROOM\]/g, CAT_ROOMS[cat] ?? 'the room').replace(/\[THEM\]/g, CAT_THEM[cat] ?? 'them')
  return { step, cat: cat ?? null, catName: CAT_NAMES[cat] ?? null, room: CAT_ROOMS[cat] ?? null, title: fill(base.title), text: fill(ui[label] ?? base.text) }
}

// The next guest in a cat's line, if the cat is free. Mutates the state.
function sendNext(state, cat, now) {
  const line = state.cats[cat]
  if (!line || line.at) return null
  const k = line.queue.shift()
  if (!k) return null
  line.at = k
  line.since = now
  state.guests[k] = { ...state.guests[k], cat, step: 'go', since: now }
  return k
}

// A guest has finished with their cat (heard it, or was moved on): the cat
// is free, and the guest joins the next cat on their route, or is done.
// Mutates the state; returns the guests whose step changed.
function finishLeg(state, k, now) {
  const me = state.guests[k]
  const was = me.cat
  me.met = [...new Set([...(me.met ?? []), was])]
  if (state.cats[was]?.at === k) state.cats[was].at = null
  const route = me.route ?? [was]
  me.since = now
  if ((me.leg ?? 0) + 1 < route.length) {
    me.leg = (me.leg ?? 0) + 1
    me.cat = route[me.leg]
    me.step = 'wait'
    state.cats[me.cat].queue.push(k)
  } else {
    me.step = 'done'
  }
  const changed = [k]
  for (const cat of new Set([was, me.cat])) { const next = sendNext(state, cat, now); if (next) changed.push(next) }
  return changed
}

// One move on the line, in a transaction. `fn(state)` mutates and returns
// { changed: [guestKey], greet: [{ key, cat }], ...extra }. Phones and cards follow after.
async function moveLights(db, nightId, fn) {
  const ref = db.doc(lightsPath(nightId))
  return db.runTransaction(async tx => {
    const snap = await tx.get(ref)
    if (!snap.exists) return { none: true, changed: [], greet: [] }
    const state = snap.data()
    const out = fn(state) ?? {}
    if (out.changed?.length || out.greet?.length) tx.set(ref, state)
    return { changed: [], greet: [], ...out, state }
  })
}

// After a move: every phone whose step changed is told, and every guest due
// a greeting gets it (once: the card ids are fixed).
async function followLights(db, nightId, r, { now = Date.now() } = {}) {
  if (r.none || (!r.changed.length && !r.greet.length)) return { greeted: 0 }
  const { list } = await guests(db, nightId)
  const byKey = Object.fromEntries(list.map(g => [g.key, g]))
  const ui = labelled(await readArea(db, 'ui_copy'))
  const c = r.greet.length ? await readCase(db, nightId) : null
  const voice = r.greet.length ? await voicePools(db) : null
  let greeted = 0
  for (const { key, cat } of r.greet) {
    const g = byKey[key]
    if (g && await greetGuest(db, nightId, { c, g, cat, act: r.state.act, beat: r.state.beat, voice, ui })) greeted++
  }
  for (const k of new Set([...r.changed, ...r.greet.map(x => x.key)])) {
    const g = byKey[k]
    const st = r.state.guests[k]
    if (!g || !st) continue
    await db.doc(`sessions/${g.uid}`).update({ lights: { ...lightsCard(st.step, st.cat, ui, { leg: st.leg ?? 0, supper: !!st.supper }), at: new Date(now) } })
  }
  return { greeted }
}

// A cat's greeting for one guest. From the guest's hint cat: the testimony
// (gated by affection, the safe's numbers in it), the private hint, and a
// scrap of paper with the numbers when the cat would not talk. From the
// other three: one greeting line in character, no hint.
async function greetGuest(db, nightId, { c, g, cat, act, beat, voice, ui = {} }) {
  if (!cat) return false
  const sessionSnap = await db.doc(`sessions/${g.uid}`).get()
  if (!sessionSnap.exists) return false
  let hintCat = c?.solving?.hintCats?.[g.key] ?? null
  if (!hintCat && c?.solving) {
    // a guest the case does not know yet (a late joiner): fixed by the case, written into it
    hintCat = hintCatFor(c.solving, g.key)
    await db.doc(`cases/${nightId}`).update({ [`solving.hintCats.${g.key}`]: hintCat })
    c.solving.hintCats = { ...(c.solving.hintCats ?? {}), [g.key]: hintCat }
  }
  if (cat !== hintCat) {
    const line = ui[`GREET ${cat.toUpperCase()}`] ?? GREETING_ONLY[cat]
    return dealCard(db, g.uid, { id: `${act}-${beat}-greet-${cat}`, act, beat, kind: 'testimony', cat, catName: CAT_NAMES[cat], room: CAT_ROOMS[cat], outcome: 'greet', lines: [line] })
  }
  const level = stopOf(sessionSnap.data()?.affection?.[cat] ?? 3)
  const puzzles = (await db.doc(`nights/${nightId}/private/puzzles`).get()).data() ?? {}
  const codes = puzzles.safe?.[g.key] ?? null
  let family = c?.solving?.hints?.[g.key] ?? null
  if (!family && c?.solving) {
    // a guest the case does not know yet (a late joiner): the least-held wrong family, written into the case
    family = hintFamilyFor(c.solving, g.key)
    if (family) { await db.doc(`cases/${nightId}`).update({ [`solving.hints.${g.key}`]: family }); c.solving.hints = { ...(c.solving.hints ?? {}), [g.key]: family } }
  }
  const t = await testimonyCard(db, { c, cat, level, act, beat, id: `${act}-${beat}-testimony`, room: CAT_ROOMS[cat], codes, voice, nightId, guestKey: g.key })
  const dealt = await dealCard(db, g.uid, { ...t, hint: hintLine(c, family) })
  // a brush-off still leaves the numbers behind, so the safe is always solvable
  if (t.outcome === 'deflect' && codes) await dealCard(db, g.uid, scrapCard(act, beat, codes, voice.scrap))
  if (dealt && family) await noteDealt(db, nightId, { kind: 'hint', act, beat, key: g.key }) // the ledger: a hint is out (safeguards)
  return dealt
}

// The beat: the line is made and the first wave sent. Run twice, it changes nothing.
export async function dealEncounter(db, nightId, act, beat, { now = Date.now(), pick = pickInt } = {}) {
  await ensureCase(db, nightId)
  const ref = db.doc(lightsPath(nightId))
  if ((await ref.get()).exists) return { ok: true, already: true }
  const { list } = await guests(db, nightId)
  const { routes, queues } = planWaves(list.map(g => g.key), pick)
  const codesByGuest = {} // by roster key, so the numbers follow a guest to a replacement phone
  for (const g of list) codesByGuest[g.key] = [pick(90) + 10, pick(90) + 10, pick(90) + 10]
  // the safe's answers live where no phone can read them, keyed by guest
  await db.doc(`nights/${nightId}/private/puzzles`).set({ safe: codesByGuest }, { merge: true })
  const state = {
    act, beat, startedAt: new Date(now),
    cats: Object.fromEntries(LIGHTS_CATS.map(cat => [cat, { queue: queues[cat], at: null, since: null }])),
    guests: Object.fromEntries(list.map(g => [g.key, { route: routes[g.key], leg: 0, cat: routes[g.key][0], met: [], step: 'wait', since: now }])),
  }
  for (const cat of LIGHTS_CATS) sendNext(state, cat, now)
  await ref.set(state)
  await followLights(db, nightId, { state, changed: list.map(g => g.key), greet: [] }, { now })
  return { ok: true, dealt: list.length, sent: LIGHTS_CATS.filter(cat => state.cats[cat].at).length }
}

// A guest scans the code in a cat's room (or taps "I'm here" when the phone
// cannot scan). Only the guest the line sent may meet that cat; anyone else
// is told kindly where they should be, and nothing changes.
export async function meetCat(db, { nightId, uid, cat, now = Date.now() }) {
  if (!uid) throw new NightError('unauthenticated', 'Sign in first.')
  if (!LIGHTS_CATS.includes(cat)) throw new NightError('invalid', 'That code is not one of the cats.')
  const s = (await db.doc(`sessions/${uid}`).get()).data()
  if (!s || s.nightId !== nightId || s.status !== 'active') throw new NightError('no-guest', 'This phone is not at the party.')
  const key = s.guestKey
  const r = await moveLights(db, nightId, state => {
    const me = state.guests[key]
    if (!me) return { refused: 'unknown' }
    if (me.step === 'done' || (me.step === 'with' && me.cat === cat) || (me.met ?? []).includes(cat)) return { already: true }
    if (me.cat !== cat) return { refused: me.step === 'go' ? 'wrong' : 'wait', mine: me.cat }
    if (me.step !== 'go' || state.cats[cat]?.at !== key) return { refused: 'wait' }
    me.step = 'with'
    me.since = now
    state.cats[cat].since = now
    return { changed: [key], greet: [{ key, cat }] }
  })
  if (r.none) throw new NightError('closed', 'The cats are not receiving anyone just now.')
  if (r.refused === 'wrong') throw new NightError('invalid', `Not this room. ${CAT_NAMES[r.mine]} is waiting for you in ${CAT_ROOMS[r.mine]}.`)
  if (r.refused === 'wait') throw new NightError('invalid', 'Not yet. Wait in the living room; your phone will send you.')
  if (r.refused) throw new NightError('invalid', 'Wait in the living room; your phone will send you.')
  if (r.already) return { ok: true, already: true }
  await followLights(db, nightId, r, { now })
  return { ok: true }
}

// "I have heard it": the cat is free for the next guest, and this guest
// joins the next cat's line (or is done after the fourth).
export async function leaveCat(db, { nightId, uid, now = Date.now() }) {
  if (!uid) throw new NightError('unauthenticated', 'Sign in first.')
  const s = (await db.doc(`sessions/${uid}`).get()).data()
  if (!s || s.nightId !== nightId || s.status !== 'active') throw new NightError('no-guest', 'This phone is not at the party.')
  const key = s.guestKey
  const r = await moveLights(db, nightId, state => {
    const me = state.guests[key]
    if (!me || me.step !== 'with') return { already: true }
    return { changed: finishLeg(state, key, now) }
  })
  if (r.none || r.already) return { ok: true, already: true }
  await followLights(db, nightId, r, { now })
  return { ok: true }
}

// The clock (windows.tick, once a minute): a guest who never turned up, or
// never tapped done, is greeted anyway and moved on to their next cat; a
// guest who joined after the line was made gets a route starting at the
// shortest line; every free cat sends its next.
export async function tickLights(db, nightId, now = Date.now()) {
  if (!(await db.doc(lightsPath(nightId)).get()).exists) return { ok: true, moved: 0 }
  const { list } = await guests(db, nightId)
  const keys = list.map(g => g.key)
  const r = await moveLights(db, nightId, state => {
    const changed = []
    const greet = []
    const load = cat => state.cats[cat].queue.length + (state.cats[cat].at ? 1 : 0)
    for (const k of keys) {
      if (state.guests[k]) continue
      const first = [...LIGHTS_CATS].sort((a, b) => load(a) - load(b))[0]
      const i = LIGHTS_CATS.indexOf(first)
      const route = LIGHTS_CATS.map((_, j) => LIGHTS_CATS[(i + j) % LIGHTS_CATS.length])
      state.guests[k] = { route, leg: 0, cat: first, met: [], step: 'wait', since: now }
      state.cats[first].queue.push(k)
      changed.push(k)
    }
    for (const cat of LIGHTS_CATS) {
      const line = state.cats[cat]
      const k = line.at
      const me = k ? state.guests[k] : null
      if (me && ((me.step === 'go' && now - ms(line.since) >= GO_MS) || (me.step === 'with' && now - ms(line.since) >= WITH_MS))) {
        if (me.step === 'go') greet.push({ key: k, cat })
        changed.push(...finishLeg(state, k, now))
      }
      const next = sendNext(state, cat, now)
      if (next) changed.push(next)
    }
    return { changed, greet }
  })
  if (r.none) return { ok: true, moved: 0 }
  await followLights(db, nightId, r, { now })
  return { ok: true, moved: new Set(r.changed).size }
}

// The end of the act: every guest who has not yet met their hint cat gets
// that greeting on the phone, and everyone goes to supper. Safe to call again.
export async function flushLights(db, nightId, { now = Date.now() } = {}) {
  const c = await readCase(db, nightId)
  const r = await moveLights(db, nightId, state => {
    const changed = []
    const greet = []
    for (const [k, me] of Object.entries(state.guests)) {
      if (me.supper) continue
      const hintCat = c?.solving ? hintCatFor(c.solving, k) : me.cat
      const met = new Set([...(me.met ?? []), ...(me.step === 'with' ? [me.cat] : [])])
      if (!met.has(hintCat)) greet.push({ key: k, cat: hintCat })
      me.met = [...met]
      me.step = 'done'
      me.supper = true
      me.since = now
      changed.push(k)
    }
    for (const cat of LIGHTS_CATS) { state.cats[cat].at = null; state.cats[cat].queue = [] }
    return { changed, greet }
  })
  if (r.none) return { ok: true, flushed: 0 }
  await followLights(db, nightId, r, { now })
  return { ok: true, flushed: r.changed.length }
}

// Act 2: the safe. Three numbers the cat gave you open it; the pay-out is a document.
export async function dealPuzzle(db, nightId, act, beat) {
  const { list } = await guests(db, nightId)
  let dealt = 0
  for (const g of list) {
    const card = {
      id: `${act}-${beat}-safe`, act, beat, kind: 'puzzle', puzzle: 'safe', slots: 3,
      title: 'The safe', text: 'Three numbers open it. A cat gave them to you, in among everything else. Enter them in the order they were said.',
    }
    if (await dealCard(db, g.uid, card)) dealt++
  }
  return { dealt }
}

// A document, overlaid live on one of the seven stationery designs: the
// case's documents[0], the safe's pay-out. Rehearsal text only when the
// case is a rehearsal.
export async function documentCard(db, { c, act, beat, id }) {
  const doc = Array.isArray(c?.documents) && c.documents.length ? c.documents[0] : null
  return {
    id, act, beat, kind: 'document',
    template: doc?.template ?? 'Receipt',
    bigWord: doc?.bigWord ?? 'REHEARSAL',
    text: doc?.text ?? '(Rehearsal. The document for this motive goes here: forty to sixty words of a receipt, a telegram or a notice, with one word printed large and one handwritten note in the margin.)',
    annotation: doc?.annotation ?? '(a handwritten note)',
    placeholder: !doc || !!c?.rehearsal,
  }
}

export async function solve(db, { nightId, uid, cardId, entry }) {
  if (!uid) throw new NightError('unauthenticated', 'Sign in first.')
  const sessionRef = db.doc(`sessions/${uid}`)
  const snap = await sessionRef.get()
  const s = snap.exists ? snap.data() : null
  if (!s || s.nightId !== nightId || s.status !== 'active') throw new NightError('no-guest', 'This phone is not at the party.')
  const card = (s.cards ?? []).find(x => x.id === cardId && x.kind === 'puzzle')
  if (!card) throw new NightError('invalid', 'No such puzzle on this phone.')
  if (s.solved?.[cardId]) return { ok: true, right: true, already: true }
  const puzzles = (await db.doc(`nights/${nightId}/private/puzzles`).get()).data() ?? {}
  const answer = puzzles.safe?.[s.guestKey]
  const given = (Array.isArray(entry) ? entry : []).map(Number)
  const right = Array.isArray(answer) && answer.length === given.length && answer.every((n, i) => n === given[i])
  const tries = (s.tries?.[cardId] ?? 0) + 1
  // A wrong trust call costs time, never the game: the third miss gives way.
  if (!right && tries < 3) {
    await sessionRef.update({ [`tries.${cardId}`]: tries })
    return { ok: true, right: false, tries }
  }
  const c = await readCase(db, nightId)
  const doc = await documentCard(db, { c, act: card.act, beat: card.beat, id: `${cardId}-payout` })
  await sessionRef.update({ [`solved.${cardId}`]: true, [`tries.${cardId}`]: tries, [`solvedAt.${cardId}`]: new Date(), ...(right ? {} : { [`gaveWay.${cardId}`]: true }) })
  await dealCard(db, uid, { ...doc, ...(right ? {} : { gaveWay: true }) })
  await noteDealt(db, nightId, { kind: 'document', act: card.act, beat: card.beat, key: s.guestKey }) // the ledger: a document is out (safeguards)
  return { ok: true, right, gaveWay: !right, tries }
}

// ---------------------------------------------------------------------------
// Windows: every phone at once. The night doc carries the window; each phone's
// session carries the set (no numbers, no cat); the numbers stay in private/
// and the cats' leans in the case.

// The workshop bank: sets of three questions with exactly two answers each.
// A question written with a third or fourth choice is dealt with its first two.
async function questionBank(db) {
  const items = await readArea(db, 'scenarios')
  const sets = items
    .filter(i => Array.isArray(i.beats) && i.beats.length === 3 && i.beats.every(x => x?.q && x?.a && x?.b))
    .map(i => ({ id: String(i.id), beats: i.beats }))
  return sets.length ? sets : REHEARSAL_SETS
}

// The lean table (sealed/parlour_leans), as Jenna left it: { setId: { q: { cat: 'a' | 'b' } } }.
async function parlourLeans(db) {
  const snap = await db.doc(LEANS_DOC).get()
  return snap.exists ? (snap.data().sets ?? {}) : {}
}

function stripValues(beats) {
  return beats.map(b => ({ q: b.q, choices: ['a', 'b'].map(k => ({ k, text: b[k] })) }))
}
function valuesOf(beats) {
  return beats.map(b => Object.fromEntries(['a', 'b'].map(k => [k, Number(b[`${k}v`]) || 0])))
}

// Which planned Parlour Game a window's beat names: p0, p1, … within the act,
// or p2-3 for game 3 of Act 2 carried into a later act (windows.slotBeat).
// Null for the host's own button.
export function slotOf(act, beat) {
  const m = /^p(?:(\d+)-)?(\d+)$/.exec(String(beat ?? ''))
  return m ? { act: Number(m[1] ?? act), slot: Number(m[2]) } : null
}
export function plannedSlot(c, act, beat) {
  const at = slotOf(act, beat)
  return at ? c?.parlourPlan?.acts?.[at.act]?.[at.slot] ?? null : null
}

// The cats listening to each question of a window: the plan's, or for a
// window the plan does not know, rolled from the case's seed and the window.
function listenersFor(c, w) {
  if (Array.isArray(w?.listeners)) return w.listeners
  const plan = c?.parlourPlan
  return extraListeners({ seed: plan?.seed ?? 'none', windowId: w?.id ?? '', setId: w?.setId ?? null, leans: plan?.leans ?? null })
}

// A window a beat opens is keyed by its act and beat, so re-running the beat
// (the beat list, or Back then Next) or the tick asking twice finds the
// window it already opened and leaves it be: no second set lands on any
// phone and the hidden roles' points reach the dial once per window. The
// host's own "light-up" button passes no beat and is a fresh window every time.
export async function openWindow(db, nightId, kind, { now = Date.now(), beat = null, act = null } = {}) {
  const spec = WINDOWS[kind]
  if (!spec) throw new NightError('invalid', `No such window: ${kind}`)
  const { night, list } = await guests(db, nightId)
  const id = beat ? `${kind}-${act}-${beat}` : `${kind}-${now}`
  const privSnap = await db.doc(`nights/${nightId}/private/windows`).get()
  if (beat && (night.window?.id === id || (privSnap.exists && privSnap.data()[id]))) return { ok: true, id, phones: list.length, already: true }
  if (night.window && !night.window.settled) await settleWindow(db, nightId, { now, force: true })
  const window = { id, kind, title: spec.title, opensAt: at(now, 0), closesAt: at(now, spec.ms), settled: false, act, beat }
  let priv = {}
  if (kind === 'questions') {
    // one set for the whole room: the plan's for this slot, or for the host's own button
    // a set not yet used tonight (any set, once the bank has gone round)
    const bank = await questionBank(db)
    const c = await readCase(db, nightId)
    const planned = plannedSlot(c, act, beat)
    const used = new Set(Object.values(privSnap.exists ? privSnap.data() : {}).map(v => v?.setId).filter(Boolean))
    const fresh = bank.filter(b => !used.has(b.id))
    const set = bank.find(b => b.id === planned?.setId) ?? choice(fresh.length ? fresh : bank)
    const at = planned ? slotOf(act, beat) : null
    priv = { setId: set.id, values: valuesOf(set.beats), slot: at?.slot ?? null, planAct: at?.act ?? null }
    for (const g of list) await db.doc(`sessions/${g.uid}`).update({ [`windows.${id}`]: { kind, beats: stripValues(set.beats) } })
  } else {
    for (const g of list) await db.doc(`sessions/${g.uid}`).update({ [`windows.${id}`]: { kind } })
  }
  await db.doc(`nights/${nightId}/private/windows`).set({ [id]: priv }, { merge: true })
  await db.doc(`nights/${nightId}`).update({ window, ...(kind === 'eliminate' ? { eliminations: {} } : {}) })
  return { ok: true, id, phones: list.length }
}

// Answers land (docs/parlour-games.md). Each question has one cat secretly
// listening. A Detective's answer warms it when it matches the cat's lean
// and cools it when it does not, by half a stop or a full stop. The
// Murderer's and the Ghost's sliders move just the same, with a coin flip in
// place of the answer, so no slider is a tell; their points ALSO move the
// clarity dial by that night's map. Nothing is returned.
async function applyPoints(db, nightId, key, windowId, picks, c, act = null) {
  const privSnap = await db.doc(`nights/${nightId}/private/windows`).get()
  const w = privSnap.exists ? privSnap.data()[windowId] : null
  if (!w?.values) return
  const role = roleOf(c, key)
  const hidden = role === 'murderer' || role === 'ghost'
  const planned = Number.isInteger(w.slot) ? c?.parlourPlan?.acts?.[w.planAct ?? act]?.[w.slot] : null
  const listeners = listenersFor(c, { id: windowId, setId: w.setId, listeners: planned?.setId === w.setId ? planned.listeners : null })
  const moves = catMoves({ listeners, picks, hidden, seed: c?.parlourPlan?.seed ?? 'none', windowId, key })
  const deck = (await db.doc(`nights/${nightId}/private/deck`).get()).data() ?? {}
  const uid = deck.uids?.[key]
  if (uid) {
    const sref = db.doc(`sessions/${uid}`)
    const s = (await sref.get()).data() ?? {}
    const patch = applyMoves(s.affection ?? {}, moves, { salemFriend: !!s.salemFriend })
    if (Object.keys(patch).length) await sref.update(Object.fromEntries(Object.entries(patch).map(([cat, v]) => [`affection.${cat}`, v])))
  }
  // a hidden role's points also move the dial, through the case's map, in one transaction (windows.js);
  // every push is kept, by act and role, for the tug-of-war graph in Act 7; sealed until then
  const total = picks.reduce((sum, k, i) => sum + (w.values[i]?.[k] ?? 0), 0)
  await pushDial(db, nightId, { c, role, total, act })
}

// "Salem petted" (the host's phone): the real Salem chose this guest. Their
// Salem goes to 5 and stays there, and a card says so. Never for the two
// hosts (handoff 22 Oct §6 and §9). Open copy; the workshop's ui_copy line
// SALEM FRIEND wins.
export const SALEM_FRIEND = {
  title: 'True Friend of the Groundskeeper',
  text: "Well, I'll be. Salem has chosen you. He likes the cut of your jib. You've earned his rarest honor: True Friend of the Groundskeeper. From now on, he'll tell it to you straight. Don't let it go to your head. And stay off the lawn.",
  button: 'Keep it',
}
export async function salemPetted(db, nightId, { arg, now = Date.now() } = {}) {
  const key = String(arg ?? '').trim()
  const deck = (await db.doc(`nights/${nightId}/private/deck`).get()).data() ?? {}
  const uid = deck.uids?.[key]
  if (!uid) throw new NightError('no-guest', 'Pick a guest who is at the party.')
  const ref = db.doc(`sessions/${uid}`)
  const s = (await ref.get()).data()
  if (!s) throw new NightError('no-guest', 'Pick a guest who is at the party.')
  if (s.host) throw new NightError('invalid', 'Not for the two hosts.')
  if (s.salemFriend) return { ok: true, already: true }
  const ui = labelled(await readArea(db, 'ui_copy'))
  const cards = s.cards ?? []
  await ref.update({
    'affection.salem': 5, salemFriend: true,
    cards: [...cards, { id: 'salem-friend', act: null, beat: null, kind: 'notice', key: 'salem-friend', title: SALEM_FRIEND.title, text: ui['SALEM FRIEND'] ?? SALEM_FRIEND.text, button: SALEM_FRIEND.button, at: new Date(now) }],
  })
  return { ok: true }
}

function validPicks(set, picks) {
  if (!Array.isArray(picks) || picks.length !== 3) return false
  return set.beats.every((b, i) => b.choices.some(ch => ch.k === picks[i]))
}
function randomPicks(set) { return set.beats.map(b => choice(b.choices).k) }

export async function answer(db, { nightId, uid, windowId, picks, now = Date.now() }) {
  if (!uid) throw new NightError('unauthenticated', 'Sign in first.')
  const sessionRef = db.doc(`sessions/${uid}`)
  // One transaction: the answer is written only if nobody (this phone again,
  // or the settle that gives late phones a random pick) got there first.
  const got = await db.runTransaction(async tx => {
    const [sessionSnap, nightSnap] = await Promise.all([tx.get(sessionRef), tx.get(db.doc(`nights/${nightId}`))])
    const s = sessionSnap.data()
    if (!s || s.nightId !== nightId || s.status !== 'active') throw new NightError('no-guest', 'This phone is not at the party.')
    const night = nightSnap.data()
    const w = night?.window
    if (s.answers?.[windowId] && !s.answers[windowId].defaulted) return { already: true }
    // a tap after the close and its grace, or after the settle picked for this phone, is a late one:
    // it changes nothing and is thanked like any other, so the phone shows no pattern (windows.js)
    if (!w || w.id !== windowId || w.kind !== 'questions') {
      if (s.windows?.[windowId]) return { late: true }
      throw new NightError('closed', 'Nothing to answer right now.')
    }
    if (now > ms(w.closesAt) + GRACE_MS || w.settled || s.answers?.[windowId]) return { late: true }
    const set = s.windows?.[windowId]
    if (!set || !validPicks(set, picks)) throw new NightError('invalid', 'Pick one answer to each question.')
    tx.update(sessionRef, { [`answers.${windowId}`]: { picks, at: new Date(), defaulted: false } })
    tx.update(db.doc(`nights/${nightId}`), { 'window.answered': (w.answered ?? 0) + 1 }) // a count only, never who
    return { key: s.guestKey, act: w.act ?? night.act ?? null }
  })
  if (got.already) return { ok: true, already: true }
  if (got.late) return { ok: true, late: true }
  const c = await readCase(db, nightId)
  await applyPoints(db, nightId, got.key, windowId, picks, c, got.act)
  return { ok: true }
}

export async function castBallot(db, { nightId, uid, murderer, motive, victim, now = Date.now() }) {
  if (!uid) throw new NightError('unauthenticated', 'Sign in first.')
  const sessionRef = db.doc(`sessions/${uid}`)
  const s = (await sessionRef.get()).data()
  if (!s || s.nightId !== nightId || s.status !== 'active') throw new NightError('no-guest', 'This phone is not at the party.')
  const night = (await db.doc(`nights/${nightId}`).get()).data()
  const w = night?.window
  if (!w || w.kind !== 'ballot' || w.settled) throw new NightError('closed', 'The ballot is not open.')
  if (now > ms(w.closesAt) + 5000) throw new NightError('closed', 'The two minutes are up.')
  const roster = night.roster ?? {}
  if (!roster[murderer] || !roster[victim]) throw new NightError('invalid', 'Pick people who are at the party.')
  if (!MOTIVES.some(m => m.n === Number(motive))) throw new NightError('invalid', 'Pick a motive from the list.')
  await sessionRef.update({ ballot: { murderer, motive: Number(motive), victim, at: new Date(), defaulted: false } })
  return { ok: true }
}

export async function eliminate(db, { nightId, uid, target, now = Date.now() }) {
  if (!uid) throw new NightError('unauthenticated', 'Sign in first.')
  const s = (await db.doc(`sessions/${uid}`).get()).data()
  if (!s || s.nightId !== nightId || s.status !== 'active') throw new NightError('no-guest', 'This phone is not at the party.')
  const nightRef = db.doc(`nights/${nightId}`)
  const night = (await nightRef.get()).data()
  const w = night?.window
  if (!w || w.kind !== 'eliminate' || w.settled) throw new NightError('closed', 'The deduction round is not open.')
  if (now > ms(w.closesAt) + 5000) throw new NightError('closed', 'The round has closed.')
  const ok = target && ((target.kind === 'person' && night.roster?.[target.key]) || (target.kind === 'motive' && MOTIVES.some(m => m.n === Number(target.n))))
  if (!ok) throw new NightError('invalid', 'Pick a person or a motive.')
  const clean = target.kind === 'person' ? { kind: 'person', key: target.key } : { kind: 'motive', n: Number(target.n) }
  await nightRef.update({ [`eliminations.${s.guestKey}`]: { ...clean, name: s.guestName, at: new Date() } })
  return { ok: true }
}

// When the window has passed, phones that chose nothing get a random choice,
// so a no-show is never a pattern. Refuses to run early unless forced.
export async function settleWindow(db, nightId, { now = Date.now(), force = false } = {}) {
  const nightRef = db.doc(`nights/${nightId}`)
  const { night, list } = await guests(db, nightId)
  const w = night.window
  if (!w || w.settled) return { ok: true, settled: 0 }
  // a paused night is never due: the clocks stand still until the host resumes
  if (!force && night.phase === 'paused') throw new NightError('window-open', 'The night is paused. Resume first.')
  if (!force && now < ms(w.closesAt)) {
    throw new NightError('window-open', `The phones are still choosing. ${Math.ceil((ms(w.closesAt) - now) / 1000)} seconds left.`)
  }
  const c = await readCase(db, nightId)
  let settled = 0
  for (const g of list) {
    const ref = db.doc(`sessions/${g.uid}`)
    const s = (await ref.get()).data()
    if (!s) continue
    if (w.kind === 'questions') {
      // the random pick is written only if the phone has not answered by then (a late tap in the
      // grace period races this loop); the points land once either way
      const picks = await db.runTransaction(async tx => {
        const cur = (await tx.get(ref)).data()
        const set = cur?.windows?.[w.id]
        if (!set || cur.answers?.[w.id]) return null
        const p = randomPicks(set)
        tx.update(ref, { [`answers.${w.id}`]: { picks: p, at: new Date(), defaulted: true } })
        return p
      })
      if (!picks) continue
      await applyPoints(db, nightId, g.key, w.id, picks, c, w.act ?? night.act ?? null)
      settled++
    } else if (w.kind === 'ballot') {
      if (s.ballot && !s.ballot.defaulted) continue
      const keys = Object.keys(night.roster ?? {})
      await ref.update({ ballot: { murderer: choice(keys), motive: choice(MOTIVES).n, victim: choice(keys), at: new Date(), defaulted: true } })
      settled++
    } else if (w.kind === 'eliminate') {
      if (night.eliminations?.[g.key]) continue
      const keys = Object.keys(night.roster ?? {})
      const target = pickInt(2) ? { kind: 'person', key: choice(keys) } : { kind: 'motive', n: choice(MOTIVES).n }
      await nightRef.update({ [`eliminations.${g.key}`]: { ...target, name: g.name, defaulted: true, at: new Date() } })
      settled++
    }
  }
  await nightRef.update({ 'window.settled': true })
  return { ok: true, settled }
}

// ---------------------------------------------------------------------------
// Act 4: groups and the five stations.

// The groups themselves come from station.js (makeRotation): pairs, one trio
// when the count is odd, and the study order. The case says who must be kept
// apart (the Ghost and the Murderer); nobody is told, nobody can tell.
// The rotation doc (nights/{id}/public/rotation) is the one source of truth:
//   groups[i] = { id, members[{key,name}] }, studyOrder[] = group ids.
// A group at study position p is in the study at rotation p, and at station
// (r - p) mod 5 at rotation r, so the study is the clock for everyone.

async function readRotation(db, nightId) {
  const snap = await db.doc(rotationPath(nightId)).get()
  return snap.exists ? snap.data() : null
}

export function stationFor(rotation, groupId, r) {
  const p = Math.max(0, (rotation?.studyOrder ?? []).indexOf(groupId))
  return STATIONS[((r - p) % STATIONS.length + STATIONS.length) % STATIONS.length]
}

export async function dealGroups(db, nightId, act, beat, { force = false } = {}) {
  const c = await ensureCase(db, nightId)
  // Once the house has started rotating the groups are set: remaking them
  // would scramble who is where, point the study at a fresh first group and
  // throw away the pay-out ledger. A re-run of the beat (Back, then Next)
  // or a mis-tap on the Host button leaves everything as it is; only the
  // host's explicit "force" makes new ones.
  const standing = await readRotation(db, nightId)
  const { night: n0 } = await guests(db, nightId)
  if (standing && (n0.rotation ?? -1) >= 0 && !force) {
    return { ok: true, already: true, reason: 'Groups are set', groups: standing.groups?.length ?? 0, trios: (standing.groups ?? []).filter(g => g.members.length === 3).length }
  }
  const apart = [c.murderer, c.ghost].filter(Boolean)
  const made = await makeRotation(db, { nightId, apart })
  const rotation = await readRotation(db, nightId)
  const { list } = await guests(db, nightId)
  await db.doc(`nights/${nightId}`).update({ rotation: -1 })
  const byKey = Object.fromEntries(list.map(g => [g.key, g]))
  let dealt = 0
  for (const grp of rotation?.groups ?? []) {
    const members = grp.members.map(m => ({ key: m.key, name: m.name, characterName: characterById(byKey[m.key]?.characterId)?.name ?? '' }))
    const groupAffection = await groupAffectionOf(db, grp.members.map(m => byKey[m.key]?.uid).filter(Boolean))
    for (const m of grp.members) {
      const g = byKey[m.key]
      if (!g) continue
      // where the whole group stands with each cat: the Cats tab's second marker in Act 4 (never a number on screen)
      await db.doc(`sessions/${g.uid}`).update({ group: grp.id, groupAffection })
      const others = members.filter(x => x.key !== m.key)
      const card = {
        id: `${act}-${beat}-group`, act, beat, kind: 'group', group: grp.id, members,
        title: others.length ? `You are with ${others.map(x => x.name).join(' and ')}` : 'You are on your own this act',
        text: 'Stay together. What you learn, you learn as a group; share it inside the group and nowhere else. Your phones will say where to go first.',
      }
      if (await dealCard(db, g.uid, card)) dealt++
    }
  }
  return { ok: true, groups: made.groups, trios: made.trios, dealt }
}

// The rounded average of a group's affection to each cat, 1 to 5.
async function groupAffectionOf(db, uids) {
  const levels = []
  for (const uid of uids) levels.push((await db.doc(`sessions/${uid}`).get()).data()?.affection ?? {})
  const out = {}
  for (const cat of CAT_KEYS) {
    const vals = levels.map(l => l[cat]).filter(v => typeof v === 'number')
    out[cat] = vals.length ? Math.max(1, Math.min(5, Math.round(vals.reduce((a, b) => a + b, 0) / vals.length))) : 3
  }
  return out
}

// `over` is the workshop's station_text list ("STUDY: ...", "CAT: ..." with
// [CAT], "BAGS: ..." with [PROPERTY] and [COUNT], "PUZZLE: ...", "CHECKIN: ...");
// a line that is written replaces the default sentence, the title stays.
async function stationCard(db, { c, station, act, beat, gid, members, levels, voice, nightId = '', pick = pickInt, over = {}, roster = {} }) {
  const base = STATION_TEXT[station.key]
  const id = `${act}-${beat}-${station.key}`
  const written = over[station.key.toUpperCase()]
  const card = { id, act, beat, kind: 'station', station: station.key, title: base.title, text: written || base.text }
  if (station.key === 'cat') {
    const cat = choice(CAT_KEYS, pick)
    const avg = Math.round(members.reduce((s, m) => s + (levels[m]?.[cat] ?? 3), 0) / Math.max(1, members.length))
    const t = await testimonyCard(db, { c, cat, level: avg, act, beat, id: `${id}-testimony`, room: null, voice, nightId, guestKey: gid })
    const catText = written ? written.replace(/\[CAT\]/g, CAT_NAMES[cat]) : `Find ${CAT_NAMES[cat]}. The cat talks to all of you at once.`
    return { ...card, cat, catName: CAT_NAMES[cat], text: catText, testimony: t }
  }
  if (station.key === 'bags') {
    // from the packing (sealed/bags) on the night: a property in two or three
    // bags, one of them the murderer's or the victim's; a random bag item's
    // property in a rehearsal (bags.js). Never a bag number.
    const clue = await bagsClue(db, { c, roster, pick })
    return { ...card, property: clue.property, count: clue.count, placeholder: clue.placeholder, text: bagsText(clue.property, clue.count, written) }
  }
  if (station.key === 'study') {
    // the clue itself is dealt by the station's "finished" call (station.js dealStudy), never carried here
    return { ...card, payoutId: `${id}-clue` }
  }
  if (station.key === 'puzzle') {
    // the memory match: the board is on the iPad (public/memory), never on the phones
    return { ...card, title: 'The memory match' }
  }
  return card
}

// ---------------------------------------------------------------------------
// Act 4: the memory match (docs/solving-the-case.md, decided 21 Oct 2026).
// The small puzzle station, on the iPad (?kiosk=memory): twelve cards face
// down, six pairs of traces, only traces of characters at the party, no
// names, shuffled fresh for each group. The group turns two at a time; when
// the board is clear the iPad says so (memoryCleared) and the server crosses
// one wrong motive off that group's list: a card on each member's phone
// (families.memoryPick: never the real motive, one they might still have).
// A group whose turn passes without clearing it is paid all the same at the
// next rotation, and any group still unpaid at Act 5 (flushMemory): delay,
// never destroy.
//
// nights/{id}/public/memory  { groupId, boardId, cards: [trace x12], cleared, at }
//   Public: any phone may read it. It carries traces only, never a name, a
//   role or which motive was crossed off. The pay-out lives in
//   cases/{id}.solving.memory and on the group's own phones.

export const MEMORY_PAIRS = 6
export function memoryPath(nightId) { return `nights/${nightId}/public/memory` }

// Twelve cards from the traces at the party: six different ones when there
// are six at the party, else the ones there are, round again.
export function memoryBoard(roster, pick = pickInt) {
  const inPlay = shuffled([...new Set(Object.values(roster ?? {}).map(r => traceOf(r?.characterId)?.trace).filter(Boolean))], pick)
  if (!inPlay.length) return []
  const faces = Array.from({ length: MEMORY_PAIRS }, (_, i) => inPlay[i % inPlay.length])
  return shuffled([...faces, ...faces], pick)
}

// The rotation's puzzle station for a group at rotation r.
function atPuzzle(rot, gid, r) { return r >= 0 && stationFor(rot, gid, r)?.key === 'puzzle' }

// A fresh board for the group now at the puzzle station.
async function setMemoryBoard(db, nightId, { rot, r, roster, now = Date.now(), pick = pickInt }) {
  const grp = (rot?.groups ?? []).find(g => atPuzzle(rot, g.id, r))
  if (!grp) { await db.doc(memoryPath(nightId)).set({ groupId: null, boardId: null, cards: [], cleared: false, at: new Date(now) }); return null }
  const boardId = `${grp.id}-${r}`
  const snap = await db.doc(memoryPath(nightId)).get()
  if (snap.exists && snap.data().boardId === boardId) return boardId
  await db.doc(memoryPath(nightId)).set({ groupId: grp.id, boardId, cards: memoryBoard(roster, pick), cleared: false, at: new Date(now) })
  return boardId
}

// One group's pay-out, once: the motive is picked and written into the case
// in one transaction (so two groups never get the same one by racing), then
// the card lands on every member's phone.
export async function payMemory(db, nightId, groupId, { outcome = 'cleared', now = Date.now() } = {}) {
  const rot = await readRotation(db, nightId)
  const grp = (rot?.groups ?? []).find(g => g.id === groupId)
  if (!grp) throw new NightError('invalid', 'No such group.')
  const members = grp.members.map(m => m.key)
  const ref = db.doc(`cases/${nightId}`)
  const got = await db.runTransaction(async tx => {
    const snap = await tx.get(ref)
    const c = snap.exists ? snap.data() : null
    if (!c?.solving) return null
    const had = c.solving.memory?.[groupId]
    if (had) return { n: Number(had), already: true }
    const n = memoryPick(c, { groupId, members, seed: c.screenSalt ?? nightId })
    tx.update(ref, { [`solving.memory.${groupId}`]: n })
    return { n, already: false }
  })
  if (!got) return { ok: true, paid: 0 }
  const m = MOTIVES.find(x => x.n === got.n)
  const night = (await db.doc(`nights/${nightId}`).get()).data() ?? {}
  const { list } = await guests(db, nightId)
  const byKey = Object.fromEntries(list.map(g => [g.key, g]))
  const card = {
    id: `4-memory-${groupId}`, act: 4, beat: night.act === 4 ? night.beat : 'memory', kind: 'clue', title: 'From the memory match',
    text: `Not this one: number ${got.n}, “${m?.rhyme ?? ''}”. Cross it off.`, cross: got.n,
  }
  let dealt = 0
  for (const k of members) if (byKey[k] && await dealCard(db, byKey[k].uid, card)) dealt++
  if (!got.already) await noteDealt(db, nightId, { kind: 'memory', act: 4, beat: card.beat, groupId }) // the ledger (safeguards)
  return { ok: true, paid: dealt, outcome, already: got.already }
}

// The iPad: the board is clear. `pairs` are the six pairs of card positions
// it matched; each pair must show the same trace and every card must be in one.
export async function memoryCleared(db, { nightId, boardId, pairs, now = Date.now() }) {
  const ref = db.doc(memoryPath(nightId))
  const snap = await ref.get()
  const board = snap.exists ? snap.data() : null
  if (!board?.boardId || board.boardId !== boardId) throw new NightError('closed', 'That board is not the one on the table.')
  if (board.cleared) return { ok: true, already: true }
  const cards = board.cards ?? []
  const flat = (Array.isArray(pairs) ? pairs : []).flat().map(Number)
  const whole = Array.isArray(pairs) && pairs.length === cards.length / 2 && new Set(flat).size === cards.length && flat.every(i => i >= 0 && i < cards.length)
  if (!whole || !pairs.every(([a, b]) => cards[a] === cards[b])) throw new NightError('invalid', 'Those pairs do not match.')
  await ref.update({ cleared: true, clearedAt: new Date(now) })
  const r = await payMemory(db, nightId, board.groupId, { outcome: 'cleared', now })
  return { ok: true, paid: r.paid }
}

// Act 5 (and any jump past Act 4): every group still unpaid is paid now.
export async function flushMemory(db, nightId, { now = Date.now() } = {}) {
  const rot = await readRotation(db, nightId)
  if (!rot?.groups?.length) return { ok: true, paid: 0 }
  const c = await readCase(db, nightId)
  if (!c?.solving) return { ok: true, paid: 0 }
  let paid = 0
  for (const g of rot.groups) if (!c.solving.memory?.[g.id]) { await payMemory(db, nightId, g.id, { outcome: 'absent', now }); paid++ }
  return { ok: true, paid }
}

export async function rotate(db, nightId, act, beat, { now = Date.now() } = {}) {
  let rot = await readRotation(db, nightId)
  if (!rot) { await dealGroups(db, nightId, act, 'groups'); rot = await readRotation(db, nightId) }
  const { night, list } = await guests(db, nightId)
  const c = await ensureCase(db, nightId)
  const r = (night.rotation ?? -1) + 1
  if (r >= STATIONS.length) return { ok: true, rotation: night.rotation, done: true }
  const voice = await voicePools(db)
  const over = labelled(await readArea(db, 'station_text'))
  const byKey = Object.fromEntries(list.map(g => [g.key, g]))
  const levels = {}
  for (const g of list) levels[g.key] = (await db.doc(`sessions/${g.uid}`).get()).data()?.affection ?? {}
  // With no station running (a rehearsal on phones alone) the study's clue
  // lands with the card; with the station alive it is earned in the room.
  const alive = await stationAlive(db, nightId, now)
  const studySnap = await db.doc(studyPath(nightId)).get()
  const study = studySnap.data() ?? {}
  const running = ['playing', 'reproducing', 'entering'].includes(study.state)
  // Delay, never destroy: every group whose turn in the study has passed
  // leaves with the clue whatever happened there (the station died, nobody
  // touched a panel), unless the station is alive and still running their game.
  let paid = 0
  for (let p = 0; p < r; p++) {
    const gid = rot.studyOrder?.[p]
    if (!gid || rot.finished?.[gid]) continue
    if (alive && running && study.groupId === gid) continue
    await finishStudy(db, { nightId, groupId: gid, outcome: 'absent' })
    paid++
  }
  if (paid) rot = await readRotation(db, nightId)
  // the memory match: the group whose turn there has just passed is paid if the board beat them
  for (const grp of rot.groups ?? []) if (atPuzzle(rot, grp.id, r - 1)) await payMemory(db, nightId, grp.id, { outcome: 'absent', now })
  await setMemoryBoard(db, nightId, { rot, r, roster: night.roster ?? {}, now })
  let dealt = 0
  const cluesOut = [] // groups whose study clue landed here (the safeguards' ledger, below)
  for (const grp of rot.groups ?? []) {
    const station = stationFor(rot, grp.id, r)
    const members = grp.members.map(m => m.key)
    const card = await stationCard(db, { c, station, act, beat, gid: grp.id, members, levels, voice, nightId, over, roster: night.roster ?? {} })
    // no station: the study's pay-out lands with the card, worked out once for the group
    const reveal = station.key === 'study' && !alive ? await studyReveal(db, { c, roster: night.roster ?? {} }) : null
    for (const k of members) {
      const g = byKey[k]
      if (!g) continue
      if (await dealCard(db, g.uid, card)) dealt++
      if (station.key === 'study' && !alive && await dealCard(db, g.uid, studyClueCard(c, act, beat, reveal))) cluesOut.push(grp.id)
    }
  }
  for (const gid of [...new Set(cluesOut)]) await noteDealt(db, nightId, { kind: 'study', act, beat, groupId: gid })
  // the study is the clock: tell the station which group is due, unless a game is running
  const due = rot.studyOrder?.[r] ?? null
  if (!running) {
    const state = alive ? (study.state === 'done' ? 'idle' : (study.state ?? 'idle')) : 'absent'
    // with no station the slot is a fixed twelve minutes (station.tickStudy ends it); a host's reassign is spent
    await db.doc(studyPath(nightId)).set({ groupId: due, state, reassignedFrom: null, slotEndsAt: alive ? null : new Date(now + ABSENT_SLOT_MS) }, { merge: true })
  }
  await db.doc(`nights/${nightId}`).update({ rotation: r })
  return { ok: true, rotation: r, dealt }
}

// ---------------------------------------------------------------------------
// Act 7: the reveal and each phone's own result.

export async function reveal(db, nightId, { now = Date.now() } = {}) {
  const c = await ensureCase(db, nightId)
  return finale.reveal(db, nightId, c, { now })
}

// The finale on the living room screen lives in finale.js (18 Oct 2026):
// the answer goes to private/reveal, the reel to public/finale, and a name
// reaches the public doc only when the host presses reveal-stage.
export const { finaleDoc, FINALE_SCHEDULE } = finale

// ---------------------------------------------------------------------------
// Act 6: the trace behind the bedroom door, at the level the dial reached.
// Written when the relay drawing is done. Everything here is the murderer's
// trace and, at level 3, one look-alike; never a person's name, never a role.

// The ladder, the look-alike buckets and the context lines live in traces.js,
// shared with the study's pay-out in Act 4 (the Ghost's trace).
export { TRACE_STEP, traceLevel, TRACE_BUCKETS, TRACE_CONTEXT, traceOf, pickPartner } from './traces.js'

export async function revealTrace(db, nightId, { now = Date.now(), force = false } = {}) {
  const ref = db.doc(`nights/${nightId}/public/trace`)
  const existing = await ref.get()
  if (existing.exists && !force) return { ok: true, already: true }
  const c = await ensureCase(db, nightId)
  const { night } = await guests(db, nightId)
  const roster = night.roster ?? {}
  const murdererChar = traceOf(roster[c.murderer]?.characterId)
  if (!murdererChar) throw new NightError('invalid', 'The case has no murderer at the party.')
  const inPlay = Object.values(roster).map(r => traceOf(r.characterId)?.trace).filter(Boolean)
  const victimTrace = traceOf(roster[c.ghost]?.characterId)?.trace ?? null
  // the look-alike is never the Ghost's own trace: the study shows that one (G36)
  const { level, partner } = workReveal({ owner: murdererChar, inPlay, exclude: [victimTrace].filter(Boolean), dial: c.dial })
  const base = { level, placeholder: !!c.rehearsal, at: new Date(now) }
  const full = {
    ...base, trace: murdererChar.trace,
    label: level === 5 ? murdererChar.traceLabel : null,
    partner: level === 3 ? partner : null,
  }
  // Any phone can read public/*, so the public doc carries only what the
  // level allows the room to see (traces.shownReveal).
  const shown = { ...base, ...shownReveal({ level, trace: full.trace, label: full.label, partner }) }
  const batch = db.batch()
  batch.set(db.doc(`nights/${nightId}/private/trace`), full)
  batch.set(ref, shown)
  batch.set(db.doc(`nights/${nightId}/public/cues`), { hall: 'green', changedAt: new Date(now) }, { merge: true })
  await batch.commit()
  return { ok: true, level }
}

// The hall light is red from the moment the night begins.
export async function ensureHallRed(db, nightId, now = Date.now()) {
  const ref = db.doc(`nights/${nightId}/public/cues`)
  const snap = await ref.get()
  if (snap.exists && snap.data().hall) return false
  await ref.set({ hall: 'red', changedAt: new Date(now) }, { merge: true })
  return true
}

export async function results(db, nightId, act, beat) {
  const { night, list } = await guests(db, nightId)
  // the screen must have named all three (finale.js): results never run early
  await finale.requireNamed(db, nightId)
  const r = (await db.doc(finale.revealPath(nightId)).get()).data()
  const tally = { murderer: 0, motive: 0, victim: 0, of: 0 }
  for (const g of list) {
    const ref = db.doc(`sessions/${g.uid}`)
    const s = (await ref.get()).data()
    const b = s?.ballot
    if (!b) continue
    const result = {
      murderer: b.murderer === r.murderer?.key, motive: b.motive === r.motive?.n, victim: b.victim === r.victim?.key,
      picks: { murderer: night.roster?.[b.murderer]?.name ?? '', motive: MOTIVES.find(m => m.n === b.motive)?.rhyme ?? '', victim: night.roster?.[b.victim]?.name ?? '' },
      defaulted: !!b.defaulted,
    }
    tally.of++
    for (const k of ['murderer', 'motive', 'victim']) if (result[k]) tally[k]++
    await ref.update({ result })
    await dealCard(db, g.uid, { id: `${act}-${beat}-result`, act, beat, kind: 'result', ...result })
  }
  await db.doc(`nights/${nightId}`).update({ tally })
  return { ok: true, ...tally }
}

// ---------------------------------------------------------------------------
// One beat's action, run when the host moves onto it.

export async function runAction(db, nightId, act, beat, action, { now = Date.now() } = {}) {
  if (!action) return { ok: true }
  const [verb, arg] = action.split(':')
  switch (verb) {
    case 'notice': {
      if (arg === 'news') await noteDealt(db, nightId, { kind: 'echo', act, beat }) // the ledger: the echo is on the screen (safeguards)
      const { list } = await guests(db, nightId)
      const ui = labelled(await readArea(db, 'ui_copy'))
      const over = ui[`NOTICE ${arg.toUpperCase()}`] ? { text: ui[`NOTICE ${arg.toUpperCase()}`] } : {}
      let dealt = 0
      for (const g of list) if (await dealCard(db, g.uid, noticeCard(arg, act, beat, over))) dealt++
      return { ok: true, dealt }
    }
    case 'deal':
      if (arg === 'encounter') return dealEncounter(db, nightId, act, beat, { now })
      if (arg === 'puzzle') return dealPuzzle(db, nightId, act, beat)
      throw new NightError('invalid', `Unknown deal: ${arg}`)
    case 'window':
      return openWindow(db, nightId, arg, { now, act, beat })
    case 'groups':
      return dealGroups(db, nightId, act, beat)
    case 'rotate':
      return rotate(db, nightId, act, beat, { now })
    case 'relay':
      return { ok: true, relay: arg } // started by night.js, which owns the relay module
    case 'reveal': {
      const { list } = await guests(db, nightId)
      await reveal(db, nightId, { now })
      for (const g of list) await dealCard(db, g.uid, noticeCard('eyes', act, beat))
      return { ok: true }
    }
    case 'results':
      return results(db, nightId, act, beat)
    default:
      throw new NightError('invalid', `Unknown action: ${action}`)
  }
}

// The power returns: roles land. Every phone gets its role card (safe copy)
// and the same orientation card. Structurally identical on every phone.
export async function dealRoles(db, nightId) {
  await ensureCase(db, nightId)
  const { list } = await guests(db, nightId)
  const written = await roleCardsFor(db)
  let dealt = 0
  for (const g of list) {
    const r = await dealRoleTo(db, nightId, g.uid, { written })
    dealt += r.dealt
  }
  return { ok: true, dealt }
}

// The three role cards as dealt: the workshop's lines over the defaults, then
// the parity check (windows.js): a card much shorter than the others is padded
// with the workshop's FILLER line, so how long a phone is read says nothing.
// Logs a count, never a card.
export async function roleCardsFor(db, { log = defaultLog } = {}) {
  const written = labelled(await readArea(db, 'role_cards'))
  const base = { MURDERER: ROLE_CARDS.MURDERER, GHOST: ROLE_CARDS.GHOST, DETECTIVE: ROLE_CARDS.DETECTIVE, ...written }
  const r = parityCheck(base, { filler: await fillerLine(db) })
  if (r.padded) log(`role cards ${JSON.stringify({ padded: r.padded, within: r.within })}`)
  return r.cards
}

export const ROLE_CARD_ID = '2-power-role'

// The role card's text (safe copy): the workshop's line for that role, else
// the default. Shared with safeguards.js, which replaces cards after a spill.
export async function roleCardTexts(db) { return labelled(await readArea(db, 'role_cards')) }
export function roleCardText(role, written = {}) {
  const r = String(role ?? 'detective').toUpperCase()
  return written?.[r] ?? ROLE_CARDS[r] ?? ROLE_CARDS.DETECTIVE
}

// One phone's role card, from the case as it stands. Used by dealRoles for
// everyone at the power beat, and by join() for a guest who arrives after it
// (17 Oct 2026): a late joiner is written into the case as a detective, never
// promoted, and gets the same card id as everyone else. Before the case has
// roles (Act 1, or no case yet) this deals nothing and makes no case.
export async function dealRoleTo(db, nightId, uid, { written = null } = {}) {
  const c = await readCase(db, nightId)
  if (!c?.roles) return { ok: true, dealt: 0 }
  const sessionSnap = await db.doc(`sessions/${uid}`).get()
  const s = sessionSnap.exists ? sessionSnap.data() : null
  if (!s || s.nightId !== nightId || !s.guestKey) return { ok: true, dealt: 0 }
  if (!c.roles[s.guestKey]) {
    await db.doc(`cases/${nightId}`).update({ [`roles.${s.guestKey}`]: 'detective' })
    c.roles[s.guestKey] = 'detective'
  }
  const cards = written ?? await roleCardsFor(db)
  const role = roleOf(c, s.guestKey).toUpperCase()
  const text = cards[role] ?? ROLE_CARDS[role] ?? ROLE_CARDS.DETECTIVE
  const card = { id: ROLE_CARD_ID, act: 2, beat: 'orient', kind: 'role', text }
  const dealt = await dealCard(db, uid, card)
  return { ok: true, dealt: dealt ? 1 : 0 }
}
