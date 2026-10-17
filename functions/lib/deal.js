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
//    brush-offs, pools, the push and pull questions, station text.
//  - CASE: who did it, who died, the motive, the kernels, the documents.
//    Read ONLY from cases/{nightId} (Admin SDK). Never logged, never returned
//    to a caller, never written anywhere a client can read except the one
//    phone it is dealt to, as its own card.
// Until the case generator exists, a night with no case gets a THROWAWAY
// rehearsal case with placeholder text in brackets. It is created fresh for
// every night and discarded with it. Nothing in it is ever printed.

import { randomInt } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { dirname, join as joinPath } from 'node:path'
import { fileURLToPath } from 'node:url'
import { FieldValue } from 'firebase-admin/firestore'
import { MOTIVES, NightError, readArea, characterById } from './night.js'
import { makeRotation, rotationPath } from './station.js'

const here = dirname(fileURLToPath(import.meta.url))
export const NIGHT = JSON.parse(readFileSync(joinPath(here, '..', 'seed', 'night.json'), 'utf8'))
export const STATIONS = NIGHT.stations
export const WINDOWS = NIGHT.windows

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
  puzzle: { title: 'A small puzzle', text: 'Do this one together.' },
  checkin: { title: 'Check-in', text: 'Sit down together. Read your clues out to each other. Cross off motives.' },
}

// Built-in push and pull sets, used only when the workshop bank is empty.
// Silly, light, about nothing. Points are kept on the server; no phone sees them.
export const REHEARSAL_SETS = [
  [
    { q: 'Ice in orange juice?', n: 2, a: 'Always', av: 2, b: 'Never', bv: -1 },
    { q: 'A hat indoors is', n: 2, a: 'Fine', av: 1, b: 'A crime', bv: -2 },
    { q: 'The best stair is', n: 2, a: 'The top one', av: 1, b: 'The bottom one', bv: 1 },
  ],
  [
    { q: 'Soup is a drink', n: 2, a: 'Yes', av: -2, b: 'No', bv: 2 },
    { q: 'Pick a sock', n: 3, a: 'Left', av: 1, b: 'Right', bv: -1, c: 'Neither', cv: 0 },
    { q: 'A pigeon with a tiny hat', n: 2, a: 'Trust it', av: 2, b: 'Do not', bv: -2 },
  ],
  [
    { q: 'Would you rather hum or whistle for a week', n: 2, a: 'Hum', av: -1, b: 'Whistle', bv: 1 },
    { q: 'Bread, buttered', n: 2, a: 'Edge to edge', av: 2, b: 'A dab', bv: -1 },
    { q: 'The moon is', n: 2, a: 'Too close', av: 0, b: 'Too far', bv: 1 },
  ],
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
// The case. Read from cases/{nightId}; a night without one (no generator yet)
// gets a throwaway rehearsal case so every screen can be walked through.

export async function readCase(db, nightId) {
  const snap = await db.doc(`cases/${nightId}`).get()
  return snap.exists ? snap.data() : null
}

export async function ensureCase(db, nightId, { pick = pickInt } = {}) {
  const existing = await readCase(db, nightId)
  if (existing?.roles) return existing
  const { list } = await guests(db, nightId)
  const keys = shuffled(list.map(g => g.key), pick)
  const roles = {}
  for (const k of keys) roles[k] = 'detective'
  const murderer = keys[0] ?? null
  const ghost = keys[1] ?? null
  if (murderer) roles[murderer] = 'murderer'
  if (ghost) roles[ghost] = 'ghost'
  const motive = MOTIVES[pick(MOTIVES.length)].n
  const c = {
    rehearsal: true, createdAt: new Date(),
    roles, murderer, ghost, motive,
    victimCharacterId: ghost ? list.find(g => g.key === ghost)?.characterId ?? null : null,
    // how each hidden role's points move the dial this night, decided here, never shown
    dialSign: { murderer: pick(2) ? 1 : -1, ghost: pick(2) ? 1 : -1 },
    dial: 0,
  }
  await db.doc(`cases/${nightId}`).set(c)
  await db.doc(`nights/${nightId}`).update({ rehearsal: true })
  return c
}

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

// Fill [ROOM], [TIME] and the rest from the pools. Granolia misremembers:
// exactly one filled blank is swapped for another item from the same pool.
export function fillPools(kernel, pools, { garble = false, pick = pickInt } = {}) {
  const used = []
  let text = kernel.replace(/\[(ROOM|TIME|DURATION|COUNT|PLACE|CROWD)\]/g, (_, k) => {
    const list = pools[k.toLowerCase()] ?? []
    const v = choice(list, pick) ?? `[${k.toLowerCase()}]`
    used.push({ k, v })
    return v
  })
  if (garble && used.length) {
    const slot = used[pick(used.length)]
    const others = (pools[slot.k.toLowerCase()] ?? []).filter(x => x !== slot.v)
    const swap = choice(others, pick)
    if (swap) text = text.replace(slot.v, swap)
  }
  return text
}

function firstSentence(text) {
  const m = /^(.+?[.!?])(\s|$)/s.exec(text.trim())
  return m ? m[1] : text
}

export function assembleTestimony({ cat, outcome, opener, closer, refusal, kernel }) {
  if (outcome === 'deflect') return { cat, outcome, lines: [refusal] }
  const middle = outcome === 'partial' ? firstSentence(kernel) : kernel
  return { cat, outcome, lines: [opener, middle, closer].filter(Boolean) }
}

async function voicePools(db) {
  const [openers, closers, refusals, poolItems] = await Promise.all([
    readArea(db, 'openers'), readArea(db, 'closers'), readArea(db, 'refusals'), readArea(db, 'pools'),
  ])
  const by = (items, cat) => items.filter(i => i.cat === cat).map(i => i.text)
  const pools = {}
  for (const k of POOL_KEYS) pools[k.toLowerCase()] = poolItems.filter(i => i.pool === k.toLowerCase()).map(i => i.text)
  return { openers: c => by(openers, c), closers: c => by(closers, c), refusals: c => by(refusals, c), pools }
}

// The middle of a testimony. From the case when the generator has written one;
// a bracketed placeholder in rehearsal. Never addressed to anyone.
function kernelFor(c, cat, codes) {
  const real = c?.kernels?.[cat]
  if (Array.isArray(real) && real.length) return choice(real)
  const numbers = codes ? ` The numbers that matter are ${codes.join(', ')}.` : ''
  return `(Rehearsal. Here ${CAT_NAMES[cat]} says something true about what happened in [ROOM] at [TIME], in two or three sentences, with one detail only this cat would notice.${numbers})`
}

const DEFAULT_VOICE = {
  opener: { irwin: 'Oh! You came to talk to me.', granolia: 'Sit, sit. You will not believe.', boo: 'Fine. Once.', zimothy: 'I will be brief. Brevity is free.', salem: 'Finally. Someone with sense.' },
  closer: { irwin: 'That is everything. I am a good boy.', granolia: 'That is how I remember it, anyway.', boo: 'That is all.', zimothy: 'That concludes my statement.', salem: 'You are welcome.' },
  refusal: { irwin: '', granolia: 'Not now, dear. I have lost my thread.', boo: 'No.', zimothy: 'My time is billable. Yours is not.', salem: 'I do not talk to people who stand like that.' },
}

export async function testimonyCard(db, { c, cat, level, act, beat, id, room, codes, voice }) {
  const v = voice ?? await voicePools(db)
  const pick = (list, fallback) => choice(list) ?? fallback
  const outcome = affectionOutcome(cat, level)
  const rawKernel = kernelFor(c, cat, codes)
  const kernel = fillPools(rawKernel, v.pools, { garble: cat === 'granolia' })
  const t = assembleTestimony({
    cat, outcome,
    opener: pick(v.openers(cat), DEFAULT_VOICE.opener[cat]),
    closer: pick(v.closers(cat), DEFAULT_VOICE.closer[cat]),
    refusal: pick(v.refusals(cat), DEFAULT_VOICE.refusal[cat]),
    kernel,
  })
  return { id, act, beat, kind: 'testimony', cat, catName: CAT_NAMES[cat], room, outcome, lines: t.lines, placeholder: !c?.kernels }
}

// ---------------------------------------------------------------------------
// Act 2: go to a cat. One cat per guest, spread across the five; Granolia is
// always in the study; the other rooms are drawn fresh each night.

export async function dealEncounter(db, nightId, act, beat) {
  const c = await ensureCase(db, nightId)
  const { list } = await guests(db, nightId)
  const voice = await voicePools(db)
  const rooms = shuffled(ROOMS.filter(r => r !== 'the study'))
  const catRoom = { granolia: 'the study' }
  for (const cat of CAT_KEYS.filter(k => k !== 'granolia')) catRoom[cat] = rooms.pop() ?? 'the parlour'
  let cats = shuffled(CAT_KEYS)
  let dealt = 0
  const codesByUid = {}
  for (const g of shuffled(list)) {
    if (!cats.length) cats = shuffled(CAT_KEYS)
    const cat = cats.pop()
    const sessionSnap = await db.doc(`sessions/${g.uid}`).get()
    const level = sessionSnap.data()?.affection?.[cat] ?? 3
    const codes = [pickInt(90) + 10, pickInt(90) + 10, pickInt(90) + 10]
    codesByUid[g.uid] = codes
    const room = catRoom[cat]
    const go = { id: `${act}-${beat}-go`, act, beat, kind: 'go', room, cat, catName: CAT_NAMES[cat], text: `Go to ${room}. ${CAT_NAMES[cat]} is waiting for you there.` }
    const t = await testimonyCard(db, { c, cat, level, act, beat, id: `${act}-${beat}-testimony`, room, codes, voice })
    if (await dealCard(db, g.uid, go)) dealt++
    await dealCard(db, g.uid, t)
  }
  // the safe's answers live where no phone can read them
  await db.doc(`nights/${nightId}/private/puzzles`).set({ safe: codesByUid }, { merge: true })
  return { dealt }
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

// A document, overlaid live on one of the seven stationery designs.
export async function documentCard(db, { c, act, beat, id }) {
  const templates = (await readArea(db, 'templates')).map(i => i.text)
  const real = c?.documents
  const doc = Array.isArray(real) && real.length ? choice(real) : null
  return {
    id, act, beat, kind: 'document',
    template: doc?.template ?? choice(templates) ?? 'Receipt',
    bigWord: doc?.bigWord ?? 'REHEARSAL',
    text: doc?.text ?? '(Rehearsal. The document for this motive goes here: forty to sixty words of a receipt, a telegram or a notice, with one word printed large and one handwritten note in the margin.)',
    annotation: doc?.annotation ?? '(a handwritten note)',
    placeholder: !doc,
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
  const answer = puzzles.safe?.[uid]
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
  await sessionRef.update({ [`solved.${cardId}`]: true, [`tries.${cardId}`]: tries })
  await dealCard(db, uid, { ...doc, ...(right ? {} : { gaveWay: true }) })
  return { ok: true, right, gaveWay: !right, tries }
}

// ---------------------------------------------------------------------------
// Windows: every phone at once. The night doc carries the window; each phone's
// session carries its own set (no numbers); the numbers stay in private/.

async function questionBank(db) {
  const items = await readArea(db, 'scenarios')
  const sets = items.map(i => i.beats).filter(b => Array.isArray(b) && b.length === 3 && b.every(x => x.q && x.a && x.b))
  return sets.length ? sets : REHEARSAL_SETS
}

function stripValues(beats) {
  return beats.map(b => {
    const n = Math.max(2, Math.min(4, Number(b.n) || 2))
    const keys = ['a', 'b', 'c', 'd'].slice(0, n).filter(k => b[k])
    return { q: b.q, choices: keys.map(k => ({ k, text: b[k] })) }
  })
}
function valuesOf(beats) {
  return beats.map(b => Object.fromEntries(['a', 'b', 'c', 'd'].filter(k => b[k]).map(k => [k, Number(b[`${k}v`]) || 0])))
}

export async function openWindow(db, nightId, kind, { now = Date.now(), beat = null, act = null } = {}) {
  const spec = WINDOWS[kind]
  if (!spec) throw new NightError('invalid', `No such window: ${kind}`)
  const { night, list } = await guests(db, nightId)
  if (night.window && !night.window.settled) await settleWindow(db, nightId, { now, force: true })
  const id = `${kind}-${now}`
  const window = { id, kind, title: spec.title, opensAt: at(now, 0), closesAt: at(now, spec.ms), settled: false, act, beat }
  const priv = {}
  if (kind === 'questions') {
    const bank = await questionBank(db)
    const cats = CAT_KEYS.filter(k => k !== 'irwin')
    for (const g of list) {
      const set = choice(bank)
      const cat = choice(cats)
      priv[g.key] = { cat, values: valuesOf(set) }
      await db.doc(`sessions/${g.uid}`).update({ [`windows.${id}`]: { kind, cat, catName: CAT_NAMES[cat], beats: stripValues(set) } })
    }
  } else {
    for (const g of list) await db.doc(`sessions/${g.uid}`).update({ [`windows.${id}`]: { kind } })
  }
  await db.doc(`nights/${nightId}/private/windows`).set({ [id]: priv }, { merge: true })
  await db.doc(`nights/${nightId}`).update({ window, ...(kind === 'eliminate' ? { eliminations: {} } : {}) })
  return { ok: true, id, phones: list.length }
}

// Points land. Every phone's total nudges one cat by one step, so the Cats
// tab behaves the same whatever the role (Jon, 16 Oct 2026: no slider for
// the dial; it is revealed at the end). A hidden role's total ALSO moves the
// clarity dial by that night's sign. Nothing is returned.
async function applyPoints(db, nightId, key, windowId, picks, c) {
  const privSnap = await db.doc(`nights/${nightId}/private/windows`).get()
  const w = privSnap.exists ? privSnap.data()[windowId]?.[key] : null
  if (!w) return
  const total = picks.reduce((sum, k, i) => sum + (w.values[i]?.[k] ?? 0), 0)
  const deck = (await db.doc(`nights/${nightId}/private/deck`).get()).data() ?? {}
  const uid = deck.uids?.[key]
  if (uid) {
    const sref = db.doc(`sessions/${uid}`)
    const level = (await sref.get()).data()?.affection?.[w.cat] ?? 3
    const next = Math.max(1, Math.min(5, level + Math.sign(total)))
    if (next !== level) await sref.update({ [`affection.${w.cat}`]: next })
  }
  const role = roleOf(c, key)
  if (role !== 'detective') {
    const sign = c?.dialSign?.[role] ?? 1
    const cur = (await db.doc(`cases/${nightId}`).get()).data()?.dial ?? 0
    await db.doc(`cases/${nightId}`).update({ dial: cur + sign * total })
  }
}

function validPicks(set, picks) {
  if (!Array.isArray(picks) || picks.length !== 3) return false
  return set.beats.every((b, i) => b.choices.some(ch => ch.k === picks[i]))
}
function randomPicks(set) { return set.beats.map(b => choice(b.choices).k) }

export async function answer(db, { nightId, uid, windowId, picks, now = Date.now() }) {
  if (!uid) throw new NightError('unauthenticated', 'Sign in first.')
  const sessionRef = db.doc(`sessions/${uid}`)
  const s = (await sessionRef.get()).data()
  if (!s || s.nightId !== nightId || s.status !== 'active') throw new NightError('no-guest', 'This phone is not at the party.')
  const night = (await db.doc(`nights/${nightId}`).get()).data()
  const w = night?.window
  if (!w || w.id !== windowId || w.kind !== 'questions') throw new NightError('closed', 'Nothing to answer right now.')
  if (now > ms(w.closesAt) + 5000 || w.settled) throw new NightError('closed', 'That window has closed.')
  if (s.answers?.[windowId]) return { ok: true, already: true }
  const set = s.windows?.[windowId]
  if (!set || !validPicks(set, picks)) throw new NightError('invalid', 'Pick one answer to each question.')
  await sessionRef.update({ [`answers.${windowId}`]: { picks, at: new Date(), defaulted: false } })
  const c = await readCase(db, nightId)
  await applyPoints(db, nightId, s.guestKey, windowId, picks, c)
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
      const set = s.windows?.[w.id]
      if (!set || s.answers?.[w.id]) continue
      const picks = randomPicks(set)
      await ref.update({ [`answers.${w.id}`]: { picks, at: new Date(), defaulted: true } })
      await applyPoints(db, nightId, g.key, w.id, picks, c)
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

export async function dealGroups(db, nightId, act, beat) {
  const c = await ensureCase(db, nightId)
  const apart = [c.murderer, c.ghost].filter(Boolean)
  const made = await makeRotation(db, { nightId, apart })
  const rotation = await readRotation(db, nightId)
  const { list } = await guests(db, nightId)
  await db.doc(`nights/${nightId}`).update({ rotation: -1 })
  const byKey = Object.fromEntries(list.map(g => [g.key, g]))
  let dealt = 0
  for (const grp of rotation?.groups ?? []) {
    const members = grp.members.map(m => ({ key: m.key, name: m.name, characterName: characterById(byKey[m.key]?.characterId)?.name ?? '' }))
    for (const m of grp.members) {
      const g = byKey[m.key]
      if (!g) continue
      await db.doc(`sessions/${g.uid}`).update({ group: grp.id })
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

async function stationCard(db, { c, station, act, beat, gid, members, levels, voice, pick = pickInt }) {
  const base = STATION_TEXT[station.key]
  const id = `${act}-${beat}-${station.key}`
  const card = { id, act, beat, kind: 'station', station: station.key, title: base.title, text: base.text }
  if (station.key === 'cat') {
    const cat = choice(CAT_KEYS, pick)
    const avg = Math.round(members.reduce((s, m) => s + (levels[m]?.[cat] ?? 3), 0) / Math.max(1, members.length))
    const t = await testimonyCard(db, { c, cat, level: avg, act, beat, id: `${id}-testimony`, room: null, voice })
    return { ...card, cat, catName: CAT_NAMES[cat], text: `Find ${CAT_NAMES[cat]}. The cat talks to all of you at once.`, testimony: t }
  }
  if (station.key === 'bags') {
    // a bag item is saved as "Item — sense: property" (the workshop's bag codec)
    const items = await readArea(db, 'bag_items')
    const props = items.map(i => {
      const dash = i.text.indexOf('—'); if (dash < 0) return ''
      const rest = i.text.slice(dash + 1); const colon = rest.indexOf(':')
      return colon >= 0 ? rest.slice(colon + 1).trim() : ''
    }).filter(Boolean)
    const property = choice(props, pick) ?? '(rehearsal: a property, like minty or rough)'
    return { ...card, property, text: `Something ${property} is in two or three of the bags in this house. Ask people to open theirs. Narrow it down; nobody is accused here.` }
  }
  if (station.key === 'study') {
    return { ...card, payout: { id: `${id}-clue`, act, beat, kind: 'clue', title: 'From the study', text: c?.kernels ? '' : '(Rehearsal. The study pays its clue out to every phone in the group here, when the three jewels are lit or the fifteen minutes are up.)', placeholder: !c?.kernels } }
  }
  if (station.key === 'puzzle') {
    const symbols = shuffled(['circle', 'square', 'triangle', 'star', 'moon', 'cross'], pick).slice(0, 4)
    return { ...card, sequence: symbols, text: 'Watch the four shapes, then tap them back in the same order. Do it together; argue if you must.' }
  }
  return card
}

export async function rotate(db, nightId, act, beat) {
  let rot = await readRotation(db, nightId)
  if (!rot) { await dealGroups(db, nightId, act, 'groups'); rot = await readRotation(db, nightId) }
  const { night, list } = await guests(db, nightId)
  const c = await ensureCase(db, nightId)
  const r = (night.rotation ?? -1) + 1
  if (r >= STATIONS.length) return { ok: true, rotation: night.rotation, done: true }
  const voice = await voicePools(db)
  const byKey = Object.fromEntries(list.map(g => [g.key, g]))
  const levels = {}
  for (const g of list) levels[g.key] = (await db.doc(`sessions/${g.uid}`).get()).data()?.affection ?? {}
  let dealt = 0
  for (const grp of rot.groups ?? []) {
    const station = stationFor(rot, grp.id, r)
    const members = grp.members.map(m => m.key)
    const card = await stationCard(db, { c, station, act, beat, gid: grp.id, members, levels, voice })
    for (const k of members) {
      const g = byKey[k]
      if (!g) continue
      if (await dealCard(db, g.uid, card)) dealt++
      // the study is not built yet: in rehearsal its pay-out lands with the card
      if (card.payout && c?.rehearsal) await dealCard(db, g.uid, card.payout)
    }
  }
  await db.doc(`nights/${nightId}`).update({ rotation: r })
  return { ok: true, rotation: r, dealt }
}

// ---------------------------------------------------------------------------
// Act 7: the reveal and each phone's own result.

export async function reveal(db, nightId) {
  const c = await ensureCase(db, nightId)
  const { night } = await guests(db, nightId)
  const roster = night.roster ?? {}
  const person = key => key && roster[key] ? { key, name: roster[key].name, characterName: characterById(roster[key].characterId)?.name ?? '' } : null
  const motive = MOTIVES.find(m => m.n === c.motive) ?? null
  const r = { murderer: person(c.murderer), motive, victim: person(c.ghost), rehearsal: !!c.rehearsal, at: new Date() }
  await db.doc(`nights/${nightId}`).update({ reveal: r })
  return { ok: true }
}

export async function results(db, nightId, act, beat) {
  const { night, list } = await guests(db, nightId)
  if (!night.reveal) { await reveal(db, nightId); return results(db, nightId, act, beat) }
  const r = night.reveal
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
      const { list } = await guests(db, nightId)
      const ui = labelled(await readArea(db, 'ui_copy'))
      const over = ui[`NOTICE ${arg.toUpperCase()}`] ? { text: ui[`NOTICE ${arg.toUpperCase()}`] } : {}
      let dealt = 0
      for (const g of list) if (await dealCard(db, g.uid, noticeCard(arg, act, beat, over))) dealt++
      return { ok: true, dealt }
    }
    case 'deal':
      if (arg === 'encounter') return dealEncounter(db, nightId, act, beat)
      if (arg === 'puzzle') return dealPuzzle(db, nightId, act, beat)
      throw new NightError('invalid', `Unknown deal: ${arg}`)
    case 'window':
      return openWindow(db, nightId, arg, { now, act, beat })
    case 'groups':
      return dealGroups(db, nightId, act, beat)
    case 'rotate':
      return rotate(db, nightId, act, beat)
    case 'relay':
      return { ok: true, relay: arg } // started by night.js, which owns the relay module
    case 'reveal': {
      const { list } = await guests(db, nightId)
      await reveal(db, nightId)
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
  const c = await ensureCase(db, nightId)
  const { list } = await guests(db, nightId)
  const written = labelled(await readArea(db, 'role_cards'))
  let dealt = 0
  for (const g of list) {
    const role = roleOf(c, g.key).toUpperCase()
    const text = written[role] ?? ROLE_CARDS[role] ?? ROLE_CARDS.DETECTIVE
    const card = { id: '2-power-role', act: 2, beat: 'orient', kind: 'role', text }
    if (await dealCard(db, g.uid, card)) dealt++
  }
  return { ok: true, dealt }
}
