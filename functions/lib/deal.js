// The dealer: everything a phone is handed during the night, beat by beat.
// Pure logic over a Firestore `db`, shared by the Cloud Functions and the tests.
//
// The night is a list of beats (seed/night.json). The host presses one button
// ("Next"); the server moves the beat and runs that beat's action here:
// deal a card to every phone, open a window on every phone at once, make the
// Act 4 groups, rotate them, start the drawing, reveal, score.
//
// SEAL RULE. Two kinds of content pass through here:
//  - SAFE: notices, role cards (all three are safe copy), the cats' greetings
//    and hint lines, the Parlour Games bank, station text.
//  - CASE: who did it, who died, the motive, which family each guest's cat
//    rules out, the cats' leans. Read ONLY from cases/{nightId} (Admin SDK).
//    Never logged, never returned to a caller, never written anywhere a
//    client can read except the one phone it is dealt to, as its own card.
// The case is dealt at the Act 1 blackout (buildCaseForNight, below): the
// party case when the night is the party, a THROWAWAY rehearsal case
// otherwise. Both have the shape in case.js. The rehearsal case is created
// fresh for every night and discarded with it. Nothing in either is ever
// printed.

import { randomInt } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { dirname, join as joinPath } from 'node:path'
import { fileURLToPath } from 'node:url'
import { MOTIVES, NightError, readArea, characterById, CHARACTERS } from './night.js'
import { traceStandIn } from './station.js'
import { buildCase, rehearsalCase } from './case.js'
import { readPacking } from './bags.js'
import { bagPlan, bagLine, bagStandIn, CAT_SHORT } from './bagclues.js'
import { pushDial, parityCheck, fillerLine, GRACE_MS } from './windows.js'
import { configOf, catMoves, applyMoves, stopOf, extraListeners } from './parlour.js'
import { LEANS_DOC } from './steward.js'
import { hintsOf, hintFamiliesFor, familyForCat, memoryPick } from './families.js'
import { hintLine as catHintLine, HINT_CATS } from './cats.js'
import { hostLine, booLine, irwinTraceLine } from './hosts.js'
import * as finale from './finale.js'
import { noteDealt, isHushed, spotlightLines } from './ledger.js' // the safeguards' records (never content)
import { traceOf, pickPartner, workReveal, shownReveal } from './traces.js'
import { nightSeed, pickFor } from './seed.js'

const here = dirname(fileURLToPath(import.meta.url))
export const NIGHT = JSON.parse(readFileSync(joinPath(here, '..', 'seed', 'night.json'), 'utf8'))
export const WINDOWS = NIGHT.windows
export const PARLOUR = configOf(NIGHT.parlour)

export const CAT_KEYS = ['irwin', 'granolia', 'boo', 'zimothy', 'salem']
export const CAT_NAMES = {
  irwin: 'Sir Irwin', granolia: 'Granolia Lickspittle', boo: 'Miss Boo LaRue',
  zimothy: 'Zimothy Clawford, Esq.', salem: 'Salem Crooknog',
}

// ---------------------------------------------------------------------------
// Safe default copy. Jon may see and change all of it (workshop lists win).

export const ROLE_CARDS = {
  MURDERER: 'The Manor has lost someone tonight, and it was your doing. Why, you could not say. Walk, talk, and play on. Name the other two before they name you.',
  GHOST: 'The Manor has lost you tonight. Nobody has noticed, not even you, until now. Walk, talk, and play on. Name the other two before the night is out.',
  DETECTIVE: 'The Manor has lost someone tonight. Nobody has noticed, and nobody knows why. Walk, talk, and play on. Name all three before the night is out.',
}

export const NOTICES = {
  meet: { title: 'The household', text: 'Four cats and the birthday boy live here. See how each stands with you in the Cats tab.', button: 'I have met them' },
  introduce: { title: 'Say who you are', text: 'Out loud: your name and your profession. Nothing else.', button: 'I have said it' },
  ready: { title: 'Settle in', text: 'Keep your phone on you.', button: 'Ready' },
  orient: { title: 'Where things are', text: 'The tabs at the bottom. Clues collects what you are told. Notes is yours alone. Motives: cross off as you go.', button: 'Got it' },
  news: { title: 'Eyes up', text: 'W-O-O-F News is on the Parlour TV. Watch it.', button: 'I watched it' },
  // after the news (handoff 23 Oct §9.4): a quiet look in your own bag, shown to nobody
  peek: { title: 'Your bag', text: 'Take a quiet look in your own bag. Show nobody yet.', button: 'I have looked' },
  checkin: { title: 'Check-in', text: 'Read your clues. Cross off what you can. Then in to supper.', button: 'Done' },
  // supper (cue 8, 25 Oct 2026): the phone stays in the Parlour, charging
  down: { title: 'Supper', text: 'Supper is in the Orangerie. Leave your phone charging in the Parlour. Bring your bag: the table may share.', button: 'Phone is down' },
  bulletin: { title: 'The bulletin', text: 'Talk it over. Cross off what you can.', button: 'Heard it' },
  // the dinner wrap-up (cue 10, 25 Oct 2026): the first of the two motive prompts
  motives: { title: 'Your motives', text: 'Open the Motives tab. Cross off every motive ruled out so far.', button: 'Will do' },
  roam: { title: 'Cake', text: 'Go where you like. Talk about the bags now, out loud, in any detail.', button: 'Cake acquired' },
  irwin: { title: 'The chime', text: 'Sir Irwin has something to say, on the Parlour TV. Go to the Parlour.', button: 'On my way' },
  // after Sir Irwin (cue 14, 25 Oct 2026): the second motive prompt
  update: { title: 'Your motives', text: 'You heard Sir Irwin. Update your Motives tab.', button: 'Will do' },
  // Act 6 opens (cue 15, 25 Oct 2026): the break line before the two games
  break: { title: 'The Final Hour', text: 'Two Parlour Games, then the final event. Stretch your legs.', button: 'Noted' },
  door: { title: 'The door is open', text: 'The hall light is green. See what the bedroom shows, then back to the Parlour.', button: 'I have seen it' },
  eyes: { title: 'Eyes on the screen', text: 'Watch the Parlour TV.', button: 'Watching' },
}

// A picture above a notice's words on the phone, by key (play/src/screens/Cards.jsx
// draws it): the Happy Birthday Irwin graphic on the cake notice (cue 12, 25 Oct 2026).
export const NOTICE_IMAGES = { roam: 'birthday' }

// The Parlour tips (§9.5, as built and kept): a group waiting in the Parlour
// in Act 4 gets one under its direction (act4.parlourTip).
export const FREE_TIME_TIPS = [
  'Have you crossed off everything you know?',
  'Compare what the cats told you. Do they agree?',
  'Remember, Salem usually has it backwards.',
  'Look at the portraits. Every character carries a trace.',
  'Only tell your group. The walls have ears. And whiskers.',
]

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
export function labelled(items) {
  const out = {}
  for (const it of items) {
    const m = /^([A-Z][A-Z0-9 '&/]*):\s*(.+)$/s.exec(it.text.trim())
    if (m) out[m[1].trim()] = m[2].trim()
  }
  return out
}

// Everyone at the party: roster key → { name, characterId, uid }.
export async function guests(db, nightId) {
  const [nightSnap, deckSnap] = await Promise.all([db.doc(`nights/${nightId}`).get(), db.doc(`nights/${nightId}/private/deck`).get()])
  if (!nightSnap.exists) throw new NightError('no-night', 'No such night.')
  const night = nightSnap.data()
  const uids = deckSnap.exists ? (deckSnap.data().uids ?? {}) : {}
  const list = Object.entries(night.roster ?? {}).map(([key, r]) => ({ key, ...r, uid: uids[key] ?? null })).filter(g => g.uid)
  return { night, list }
}

// Add one card to a phone, once. Cards carry an id; dealing the same id twice
// is a no-op, so "Next" pressed twice never doubles a card.
export async function dealCard(db, uid, card) {
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
  const card = { id: `${act}-${beat}-${key}`, act, beat, kind: 'notice', key, title: n.title, text: n.text, button: n.button }
  if (NOTICE_IMAGES[key]) card.image = NOTICE_IMAGES[key]
  return card
}

// ---------------------------------------------------------------------------
// The case. Read from cases/{nightId}. Built once, at the Act 1 blackout
// (the host's Power returns), by buildCaseForNight; never replaced once it
// has roles, so a second press, a jump or a late call all find the same case.

export async function readCase(db, nightId) {
  const snap = await db.doc(`cases/${nightId}`).get()
  return snap.exists ? snap.data() : null
}

// Which case the night gets: nights/{id}.forceRehearsal is true
// (the default when a night is made; the workshop's Game night page has one
// checkbox, "This is the party night", that makes it false) for a rehearsal
// case, false for the party case (case.js). Only the party reads the cats'
// leans (sealed/parlour_leans). Either way nights/{id}.rehearsal says which.
// Also the cast-lock check: every in-play trace needs an in-play look-alike,
// else caseWarning 'trace-partner'.
// Counts only, and quiet under node:test unless a test passes its own `log`.
const defaultLog = line => { if (!process.env.NODE_TEST_CONTEXT) console.log(line) }

export async function buildCaseForNight(db, nightId, { pick = null, now = Date.now(), log = defaultLog } = {}) {
  const existing = await readCase(db, nightId)
  if (existing?.roles) return existing
  const { night, list: joined } = await guests(db, nightId)
  // a rehearsal's seed deals the same case again (seed.js); the party has none
  const seed = await nightSeed(db, nightId)
  if (!pick) pick = pickFor(seed, 'case')
  const list = seed ? byKey(joined) : joined
  const bank = await questionBank(db)
  const forceRehearsal = night.forceRehearsal !== false
  // the cats' leans are sealed (Jenna's lean table): read only for the party, never for a rehearsal
  const leans = forceRehearsal ? null : await parlourLeans(db)
  const parlour = { bankIds: bank.map(b => b.id), leans, config: PARLOUR }
  const common = { roster: list, rng: pick, parlour, now }
  const c = forceRehearsal ? rehearsalCase(common) : buildCase(common)

  // cast lock: every trace at the party needs a look-alike at the party
  const warnings = []
  const inPlay = [...new Set(list.map(g => traceOf(g.characterId)?.trace).filter(Boolean))]
  if (inPlay.length >= 2 && inPlay.some(tr => !pickPartner(tr, inPlay, { pick }))) warnings.push('trace-partner')

  await db.doc(`cases/${nightId}`).set(c)
  await db.doc(`nights/${nightId}`).update({ rehearsal: c.rehearsal, caseWarning: warnings.length ? warnings.join(',') : null })
  log(`case ${JSON.stringify({ nightId, rehearsal: c.rehearsal })}`)
  return c
}

// The older name, kept for every caller that needs a case before the host
// has pressed Power returns (a rehearsal jump, a test). Same rules.
export const ensureCase = buildCaseForNight

export function roleOf(c, key) { return c?.roles?.[key] ?? 'detective' }

// ---------------------------------------------------------------------------
// Act 2, Lights Out (docs/handoff-2026-10-23.md §3, Jon's final plan, 23 Oct
// 2026). Four cats wait in four rooms (seed/night.json solving.catRooms:
// Granolia in the Study, Salem in the Orangerie, Zimothy in the Library, Boo
// in the Entryway; never Irwin, never the Parlour). Every guest visits all
// four, one guest at a cat at a time, and EVERY cat gives that guest two
// things, both at the rung its affection for the guest sets at the moment of
// the scan: a motive hint (cats.js, about one of the guest's two wrong
// families) and a bag clue about the Murderer (bagclues.js). Both land on the
// phone's Clues tab. Everyone else waits in the Parlour, where Sir Irwin's
// sharing prompts run on the TV.
//
// The line is a queue, not a schedule. "Not yet, call me later" (every phone
// has the same button) puts a guest back in the queue with no penalty, and a
// cat with nobody ready in its own line calls whoever has waited longest and
// still has to see it (F23), so no cat sits idle while someone is ready.
//
// Every guest always has a next step on the phone (sessions/{uid}.lights):
//   wait  stay in the Parlour; the phone will call you ('later' after Not yet)
//   go    your turn: <cat> is waiting in <room> (On my way / Not yet)
//   with  the cat is talking to you; tap Done when you have read it
//   done  all four cats seen; the chime calls everyone to supper
// A guest who never turns up (goMinutes) or never taps Done (withMinutes) is
// moved on by the tick and gets that cat's lines on the phone anyway: delay,
// never destroy. Supper (the supper beat, run.js) comes when every guest is
// done, or when Jon presses Supper's ready; then each cat a guest has not
// seen leaves its lines as a note on the phone (flushLights).
//
// The line itself is server-only: nights/{id}/private/lights
//   { act, beat, cats: { cat: { queue: [guestKey], at: guestKey | null, since } },
//     guests: { guestKey: { route: [cat] x4, cat, met: [cat], step, since, movedOn?, later?, laterUntil?, supper? } } }
// Every move goes through one transaction, so two guests are never at a cat at once (F20).

export const CAT_ROOMS = NIGHT.solving?.catRooms ?? { granolia: 'the Study', salem: 'the Orangerie', zimothy: 'the Library', boo: 'the Entryway' }
export const LIGHTS_CATS = Object.keys(CAT_ROOMS)
export const GO_MS = (Number(NIGHT.solving?.goMinutes) || 4) * 60_000
export const WITH_MS = (Number(NIGHT.solving?.withMinutes) || 5) * 60_000
// After "Not yet, call me later", the guest is not called again for this long.
export const LATER_MS = (Number(NIGHT.solving?.laterMinutes) || 2) * 60_000
export const LIGHTS_STEPS = ['wait', 'go', 'with', 'done']
export function lightsPath(nightId) { return `nights/${nightId}/private/lights` }
const CAT_THEM = { granolia: 'her', boo: 'her', salem: 'him', zimothy: 'him' }

// What each step says on the phone. Open copy (docs/handoff-2026-10-23.md
// §9.4); the workshop's ui_copy lines LIGHTS WAIT, LIGHTS LATER, LIGHTS GO,
// LIGHTS NEXT, LIGHTS WITH, LIGHTS DONE and LIGHTS SUPPER win ([CAT], [ROOM]
// and [THEM] filled in). NEXT is GO after the tick moved the guest on.
export const LIGHTS_TEXT = {
  wait: { title: 'In the Parlour', text: 'Wait in the Parlour. You\'ll be called.' },
  later: { title: 'Back in the queue', text: 'We\'ll call you again.' },
  go: { title: 'Your turn', text: '[CAT] is waiting in [ROOM]. Go alone.' },
  next: { title: 'Your turn', text: 'Time\'s up. [CAT] is waiting in [ROOM].' },
  with: { title: '[CAT] is talking to you', text: 'For you alone. Tap Done when you have read it.' },
  done: { title: 'Back to the Parlour', text: 'All four cats seen. Tell nobody what you heard. The chime calls everyone to supper.' },
  supper: { title: 'Supper is served', text: 'Supper is served in the Orangerie.' },
}
// After "On my way" (the phone's own step, no server call), and the cards' footer.
export const ARRIVE_TEXT = 'Scan the code in the room.'
export const SAVED_TEXT = 'Saved to your Clues.'
// The note at supper for a guest with cats still unvisited (Jon called supper early).
export const SUPPER_NOTE = { title: "Supper's ready!", text: "The cats you haven't met left you a note:", button: 'Read them' }

// The motive hint and the bag clue on a cat's card. A case with no family for
// the guest (or a cat with no line) carries this marked stand-in, which names
// nothing. On a rehearsal night every sealed slot shows a bracketed stand-in
// saying what would show there (Jon, 23 Oct 2026), never a filled line.
export const HINT_PLACEHOLDER = '(Here the cat would rule something out.)'
export function hintStandIn(cat) { return `[${CAT_SHORT[cat] ?? 'The cat'}'s motive hint appears here]` }
export function hintLine(c, family, { cat = null, level = 3, act = 2, seed = '', exclude = [], bonusFamilies = null } = {}) {
  const line = family && cat ? catHintLine(c, { cat, level, act, family, seed, exclude, bonusFamilies }) : null
  if (!line?.text) return { hint: { text: HINT_PLACEHOLDER, placeholder: true, none: true }, ruled: null }
  if (c?.rehearsal) return { hint: { text: hintStandIn(cat), placeholder: true }, ruled: { families: line.families, motives: line.motives } }
  return { hint: { text: line.text, placeholder: false }, ruled: { families: line.families, motives: line.motives } }
}

// A cat's card: the cat's name and room, its motive hint, its bag clue, and
// the footer. Kind 'testimony', so the phone's cat card and the Clues tab read
// it as they always have. `note` marks a card left at supper for a cat the
// guest never reached.
export function catHintCard({ id, act, beat, cat, hint, bag = null, note = false }) {
  return { id, act, beat, kind: 'testimony', cat, catName: CAT_NAMES[cat], room: CAT_ROOMS[cat], lines: [], hint, ...(bag ? { bag } : {}), ...(note ? { note: true } : {}), saved: SAVED_TEXT, placeholder: !!hint?.placeholder }
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
export function lightsCard(step, cat, ui = {}, { movedOn = false, supper = false, later = false } = {}) {
  const variant = step === 'done' && supper ? 'supper' : step === 'go' && movedOn ? 'next' : step === 'wait' && later ? 'later' : step
  const base = LIGHTS_TEXT[variant] ?? LIGHTS_TEXT.wait
  const label = `LIGHTS ${variant.toUpperCase()}`
  const fill = t => String(t).replace(/\[CAT\]/g, CAT_NAMES[cat] ?? 'A cat').replace(/\[ROOM\]/g, CAT_ROOMS[cat] ?? 'the room').replace(/\[THEM\]/g, CAT_THEM[cat] ?? 'them')
  return { step, variant, cat: cat ?? null, catName: CAT_NAMES[cat] ?? null, room: CAT_ROOMS[cat] ?? null, title: fill(base.title), text: fill(ui[label] ?? base.text), ...(step === 'go' ? { arrive: ui['LIGHTS ARRIVE'] ?? ARRIVE_TEXT } : {}) }
}

// Is a guest waiting and ready to be called (not asked for later)?
function readyToCall(me, now) {
  return !!me && me.step === 'wait' && !(ms(me.laterUntil) > now)
}

// The next guest for a cat, if the cat is free: the first ready guest in its
// own line, else whoever has waited longest anywhere and still has this cat
// to see (F23: no cat idle while someone is ready). Mutates the state.
function sendNext(state, cat, now) {
  const line = state.cats[cat]
  if (!line || line.at) return null
  let k = line.queue.find(x => readyToCall(state.guests[x], now))
  if (!k) {
    const waiting = Object.entries(state.guests)
      .filter(([, g]) => readyToCall(g, now) && g.cat !== cat && !(g.met ?? []).includes(cat))
      .sort((a, b) => ms(a[1].since) - ms(b[1].since))
    k = waiting[0]?.[0] ?? null
    if (k) { const was = state.guests[k].cat; if (state.cats[was]) state.cats[was].queue = state.cats[was].queue.filter(x => x !== k) }
  }
  if (!k) return null
  line.queue = line.queue.filter(x => x !== k)
  line.at = k
  line.since = now
  state.guests[k] = { ...state.guests[k], cat, step: 'go', since: now, later: false, laterUntil: null }
  return k
}

// Every free cat calls its next guest. Returns the guests called.
function sendAll(state, now) {
  const out = []
  for (const cat of LIGHTS_CATS) { const k = sendNext(state, cat, now); if (k) out.push(k) }
  return out
}

// The cats a guest still has to see, in their route's order.
function catsLeft(me) {
  const met = new Set(me.met ?? [])
  const route = [...(me.route ?? []), ...LIGHTS_CATS]
  return [...new Set(route)].filter(c => LIGHTS_CATS.includes(c) && !met.has(c))
}

// A guest has finished with their cat (read it, or was moved on): the cat is
// free, and the guest joins the next cat's line, or is done. Mutates the
// state; returns the guests whose step changed.
function finishLeg(state, k, now, { movedOn = false } = {}) {
  const me = state.guests[k]
  const was = me.cat
  me.met = [...new Set([...(me.met ?? []), was])]
  if (state.cats[was]?.at === k) state.cats[was].at = null
  me.since = now
  me.movedOn = movedOn
  const left = catsLeft(me)
  if (left.length) {
    me.cat = left[0]
    me.step = 'wait'
    state.cats[me.cat].queue.push(k)
  } else {
    me.step = 'done'
  }
  return [k, ...sendAll(state, now)]
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

// The Host tab's Act 2 line ("Cat visits: N of M guests have seen all four"):
// on the public night doc as lightsProgress { done, total }. Counts only,
// never which cat, which guest or which hint.
export function lightsProgressOf(state) {
  const all = Object.values(state?.guests ?? {})
  return { done: all.filter(g => g?.step === 'done').length, total: all.length }
}
// Has every guest seen all four cats? (The supper chime waits for this, F24.)
export function allSeen(state) {
  const p = lightsProgressOf(state)
  return p.total > 0 && p.done === p.total
}

// What the cats' bag clues read on the night: the packing, only on the party
// (a rehearsal never reads it), and the bags the guests at the party hold.
async function bagContext(db, c, roster) {
  const packing = c && !c.rehearsal ? await readPacking(db) : null
  const inPlay = [...new Set(Object.values(roster ?? {}).map(r => Number(r?.bag)).filter(Number.isFinite))]
  return { packing, inPlay }
}

// After a move: every phone whose step changed is told, every guest due a
// cat's lines gets them (once: the card ids are fixed), and the host's count
// moves. Returns whether every guest has now seen all four (run.js calls supper).
async function followLights(db, nightId, r, { now = Date.now() } = {}) {
  if (r.none || (!r.changed.length && !r.greet.length)) return { greeted: 0, allSeen: false }
  await db.doc(`nights/${nightId}`).update({ lightsProgress: lightsProgressOf(r.state) })
  const { night, list } = await guests(db, nightId)
  const byKey = Object.fromEntries(list.map(g => [g.key, g]))
  const ui = labelled(await readArea(db, 'ui_copy'))
  const c = r.greet.length ? await readCase(db, nightId) : null
  const bags = r.greet.length ? await bagContext(db, c, night.roster) : null
  let greeted = 0
  for (const { key, cat, note } of r.greet) {
    const g = byKey[key]
    if (g && await greetGuest(db, nightId, { c, g, cat, act: r.state.act, beat: r.state.beat, bags, roster: night.roster ?? {}, note })) greeted++
  }
  for (const k of new Set([...r.changed, ...r.greet.map(x => x.key)])) {
    const g = byKey[k]
    const st = r.state.guests[k]
    if (!g || !st) continue
    await db.doc(`sessions/${g.uid}`).update({ lights: { ...lightsCard(st.step, st.cat, ui, { movedOn: !!st.movedOn, supper: !!st.supper, later: !!st.later }), at: new Date(now) } })
  }
  return { greeted, allSeen: allSeen(r.state) }
}

// One cat's lines for one guest, at the guest's affection with that cat right
// now: the motive hint (one of the guest's two wrong families, cats.js) and
// the bag clue about the Murderer (bagclues.js). Written onto the guest's
// phone as one card; what the lines named goes into the case for the checks.
async function greetGuest(db, nightId, { c, g, cat, act, beat, bags = null, roster = {}, note = false }) {
  if (!cat || !LIGHTS_CATS.includes(cat)) return false
  const sessionSnap = await db.doc(`sessions/${g.uid}`).get()
  if (!sessionSnap.exists) return false
  const level = stopOf(sessionSnap.data()?.affection?.[cat] ?? 3)
  const salt = c?.screenSalt ?? nightId
  let families = c?.solving ? hintsOf(c.solving, g.key) : []
  if (!families.length && c?.solving) {
    // a guest the case does not know yet (a late joiner): the pair the fewest hold, written into the case
    families = hintFamiliesFor(c.solving, g.key)
    if (families.length) { await db.doc(`cases/${nightId}`).update({ [`solving.hints.${g.key}`]: families }); c.solving.hints = { ...(c.solving.hints ?? {}), [g.key]: families } }
  }
  const family = familyForCat(families, { cat, seed: `${salt}\u0000${g.key}` })
  const { hint, ruled } = hintLine(c, family, { cat, level, act: 2, seed: `${salt}\u0000${g.key}\u0000${cat}`, bonusFamilies: [...families, ...(c?.solving?.newsOut ?? [])] })
  // the bag clue: from the packing on the party night, a stand-in on a rehearsal
  let bag
  let fill = null
  if (!c || c.rehearsal) bag = { text: bagStandIn(cat, 2), placeholder: true }
  else {
    const plan = bagPlan(bags?.packing, { bag: roster?.[c.murderer]?.bag, inPlay: bags?.inPlay ?? [], seed: `${salt}\u0000bag\u0000${g.key}` })
    fill = bagLine(plan, { cat, act: 2, rung: level, seed: `${salt}\u0000bag\u0000${g.key}\u0000${cat}` })
    bag = { text: fill.text, placeholder: false }
  }
  const dealt = await dealCard(db, g.uid, catHintCard({ id: `${act}-${beat}-cat-${cat}`, act, beat, cat, hint, bag, note }))
  if (!dealt) return false
  const patch = {}
  // what the line rules out, for the solver checks (families.roomClues); case only, never a phone
  if (ruled && c?.solving) patch[`solving.ruled.${g.key}-${cat}`] = ruled
  // what the bag clue named, for the bag checks (G39, G41, G44, G46, G49); case only
  if (fill) patch[`bagClues.act2.${g.key}.${cat}`] = { rung: level, word: fill.word ?? null, sense: fill.sense ?? null, right: fill.right ?? null }
  if (Object.keys(patch).length) await db.doc(`cases/${nightId}`).update(patch)
  if (family) await noteDealt(db, nightId, { kind: 'hint', act, beat, key: g.key }) // the ledger: a hint is out (safeguards)
  return true
}

// The beat: the line is made and the first wave sent. Run twice, it changes nothing.
export async function dealEncounter(db, nightId, act, beat, { now = Date.now(), pick = null } = {}) {
  await ensureCase(db, nightId)
  const ref = db.doc(lightsPath(nightId))
  if ((await ref.get()).exists) return { ok: true, already: true }
  const { list } = await guests(db, nightId)
  const seed = await nightSeed(db, nightId)
  const { routes, queues } = planWaves((seed ? byKey(list) : list).map(g => g.key), pick ?? pickFor(seed, 'waves'))
  const state = {
    act, beat, startedAt: new Date(now),
    cats: Object.fromEntries(LIGHTS_CATS.map(cat => [cat, { queue: queues[cat], at: null, since: null }])),
    guests: Object.fromEntries(list.map(g => [g.key, { route: routes[g.key], cat: routes[g.key][0], met: [], step: 'wait', since: now }])),
  }
  sendAll(state, now)
  await ref.set(state)
  await followLights(db, nightId, { state, changed: list.map(g => g.key), greet: [] }, { now })
  return { ok: true, dealt: list.length, sent: LIGHTS_CATS.filter(cat => state.cats[cat].at).length }
}

// A guest scans the code in a cat's room (or taps "I'm here" when the phone
// cannot scan). Only the guest the line called may meet that cat; anyone else
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
  if (r.refused === 'wait') throw new NightError('invalid', 'Not yet. Wait in the Parlour; your phone will call you.')
  if (r.refused) throw new NightError('invalid', 'Wait in the Parlour; your phone will call you.')
  if (r.already) return { ok: true, already: true }
  const f = await followLights(db, nightId, r, { now })
  return { ok: true, allSeen: f.allSeen }
}

// "Done": the cat is free for the next guest, and this guest joins the next
// cat's line (or is done after the fourth).
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
  const f = await followLights(db, nightId, r, { now })
  return { ok: true, allSeen: f.allSeen }
}

// "Not yet, call me later" (F22): the same button on every phone, no penalty.
// The cat is free for someone else; the guest goes back in the queue, the next
// cat on their list first and this one at the end of it, and is not called
// again for LATER_MS. A tap when the phone is not calling them changes nothing.
export async function notYet(db, { nightId, uid, now = Date.now() }) {
  if (!uid) throw new NightError('unauthenticated', 'Sign in first.')
  const s = (await db.doc(`sessions/${uid}`).get()).data()
  if (!s || s.nightId !== nightId || s.status !== 'active') throw new NightError('no-guest', 'This phone is not at the party.')
  const key = s.guestKey
  const r = await moveLights(db, nightId, state => {
    const me = state.guests[key]
    if (!me || me.step !== 'go') return { already: true }
    const cat = me.cat
    if (state.cats[cat]?.at === key) state.cats[cat].at = null
    const left = catsLeft(me)
    const order = [...left.filter(c => c !== cat), cat]
    me.route = [...(me.met ?? []), ...order]
    me.cat = order[0]
    me.step = 'wait'
    me.later = true
    me.laterUntil = new Date(now + LATER_MS)
    me.movedOn = false
    me.since = now
    state.cats[me.cat].queue.push(key)
    return { changed: [key, ...sendAll(state, now)] }
  })
  if (r.none || r.already) return { ok: true, already: true }
  await followLights(db, nightId, r, { now })
  return { ok: true }
}

// The clock (the tick, once a minute, and the Host tab while Act 2 runs): a
// guest who never turned up, or never tapped Done, gets that cat's lines and
// is moved on; a guest who joined after the line was made gets a route
// starting at the shortest line; every free cat calls its next.
export async function tickLights(db, nightId, now = Date.now()) {
  if (!(await db.doc(lightsPath(nightId)).get()).exists) return { ok: true, moved: 0, allSeen: false }
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
      state.guests[k] = { route, cat: first, met: [], step: 'wait', since: now }
      state.cats[first].queue.push(k)
      changed.push(k)
    }
    for (const cat of LIGHTS_CATS) {
      const line = state.cats[cat]
      const k = line.at
      const me = k ? state.guests[k] : null
      if (me && ((me.step === 'go' && now - ms(line.since) >= GO_MS) || (me.step === 'with' && now - ms(line.since) >= WITH_MS))) {
        if (me.step === 'go') greet.push({ key: k, cat })
        changed.push(...finishLeg(state, k, now, { movedOn: true }))
      }
    }
    changed.push(...sendAll(state, now))
    return { changed, greet }
  })
  if (r.none) return { ok: true, moved: 0, allSeen: false }
  const f = await followLights(db, nightId, r, { now })
  return { ok: true, moved: new Set(r.changed).size, allSeen: f.allSeen || allSeen(r.state) }
}

// Supper (F24): every guest who has a cat still unvisited gets that cat's
// lines on the phone, under one note ("Supper's ready! The cats you haven't
// met left you a note:"), and every phone says supper is served. Safe to
// call again: cards deal once.
export async function flushLights(db, nightId, { now = Date.now() } = {}) {
  const r = await moveLights(db, nightId, state => {
    const changed = []
    const greet = []
    for (const [k, me] of Object.entries(state.guests)) {
      if (me.supper) continue
      const met = new Set([...(me.met ?? []), ...(me.step === 'with' ? [me.cat] : [])])
      for (const cat of LIGHTS_CATS) if (!met.has(cat)) greet.push({ key: k, cat, note: true })
      me.met = [...LIGHTS_CATS]
      me.step = 'done'
      me.supper = true
      me.since = now
      changed.push(k)
    }
    for (const cat of LIGHTS_CATS) { state.cats[cat].at = null; state.cats[cat].queue = [] }
    return { changed, greet }
  })
  if (r.none) return { ok: true, flushed: 0, notes: 0 }
  // the note first, then the cats' cards under it
  const noted = [...new Set(r.greet.map(x => x.key))]
  if (noted.length) {
    const { list } = await guests(db, nightId)
    const ui = labelled(await readArea(db, 'ui_copy'))
    for (const g of list.filter(x => noted.includes(x.key))) {
      await dealCard(db, g.uid, { id: `${r.state.act}-supper-note`, act: r.state.act, beat: 'supper', kind: 'notice', key: 'supper-note', title: SUPPER_NOTE.title, text: ui['SUPPER NOTE'] ?? SUPPER_NOTE.text, button: SUPPER_NOTE.button })
    }
  }
  await followLights(db, nightId, r, { now })
  return { ok: true, flushed: r.changed.length, notes: r.greet.length }
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
  // the host's line on every phone alike (hosts.js): Boo for the Parlour Games, Salem for the final picks
  const hostUi = (kind === 'questions' || kind === 'ballot') ? labelled(await readArea(db, 'ui_copy')) : {}
  if (kind === 'questions') window.host = { cat: 'boo', line: booLine(id, hostUi) }
  if (kind === 'ballot') window.host = { cat: 'salem', line: hostLine('salem', hostUi) }
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
    for (const g of list) await db.doc(`sessions/${g.uid}`).update({ [`windows.${id}`]: { kind, beats: stripValues(set.beats), opensAt: window.opensAt } })
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
function randomPicks(set, pick = pickInt) { return set.beats.map(b => choice(b.choices, pick).k) }
// A seeded rehearsal (seed.js) takes its guests in name order, so the same
// word deals the same night whatever order they joined in.
function byKey(list) { return [...list].sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0)) }

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
    // an Act 4 game waiting on the phone: played when the guest is free, until Act 4's end settles it
    const mine = s.windows?.[windowId]
    if (mine?.waiting) {
      if (s.answers?.[windowId]) return { late: true }
      if (!validPicks(mine, picks)) throw new NightError('invalid', 'Pick one answer to each question.')
      tx.update(sessionRef, { [`answers.${windowId}`]: { picks, at: new Date(), defaulted: false } })
      return { key: s.guestKey, act: 4 }
    }
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
  // a seeded rehearsal picks the same answer for the same silent phone (seed.js)
  const seed = await nightSeed(db, nightId)
  let settled = 0
  for (const g of list) {
    const ref = db.doc(`sessions/${g.uid}`)
    const s = (await ref.get()).data()
    if (!s) continue
    const pick = pickFor(seed, 'default', w.id, g.key)
    if (w.kind === 'questions') {
      // the random pick is written only if the phone has not answered by then (a late tap in the
      // grace period races this loop); the points land once either way
      const picks = await db.runTransaction(async tx => {
        const cur = (await tx.get(ref)).data()
        const set = cur?.windows?.[w.id]
        if (!set || cur.answers?.[w.id]) return null
        const p = randomPicks(set, pick)
        tx.update(ref, { [`answers.${w.id}`]: { picks: p, at: new Date(), defaulted: true } })
        return p
      })
      if (!picks) continue
      await applyPoints(db, nightId, g.key, w.id, picks, c, w.act ?? night.act ?? null)
      settled++
    } else if (w.kind === 'ballot') {
      if (s.ballot && !s.ballot.defaulted) continue
      const keys = Object.keys(night.roster ?? {})
      await ref.update({ ballot: { murderer: choice(keys, pick), motive: choice(MOTIVES, pick).n, victim: choice(keys, pick), at: new Date(), defaulted: true } })
      settled++
    } else if (w.kind === 'eliminate') {
      if (night.eliminations?.[g.key]) continue
      const keys = Object.keys(night.roster ?? {})
      const target = pick(2) ? { kind: 'person', key: choice(keys, pick) } : { kind: 'motive', n: choice(MOTIVES, pick).n }
      await nightRef.update({ [`eliminations.${g.key}`]: { ...target, name: g.name, defaulted: true, at: new Date() } })
      settled++
    }
  }
  await nightRef.update({ 'window.settled': true })
  return { ok: true, settled }
}

// ---------------------------------------------------------------------------
// Act 4's Parlour Games wait on the phone (handoff 23 Oct 2026 §3). Each guest
// still gets five, but they never pop up together: at each planned time a
// game is dealt to every phone as waiting, and the phone shows "A Parlour Game
// is waiting" whenever the guest is not in a game room. The guest plays it
// when free; the answer moves the cats and, for the hidden roles, the dial
// exactly as a window's would (applyPoints). Any left unplayed when Act 4
// ends get a random answer, no penalty (settleWaiting). The rooms themselves
// live in act4.js.

export async function dealWaitingGame(db, nightId, { now = Date.now(), act = 4, beat = null } = {}) {
  const id = beat ? `questions-${act}-${beat}` : `questions-${act}-${now}`
  const privRef = db.doc(`nights/${nightId}/private/windows`)
  const privSnap = await privRef.get()
  if (beat && privSnap.exists && privSnap.data()[id]) return { ok: true, id, already: true }
  const { list } = await guests(db, nightId)
  const bank = await questionBank(db)
  const c = await readCase(db, nightId)
  const planned = plannedSlot(c, act, beat)
  const used = new Set(Object.values(privSnap.exists ? privSnap.data() : {}).map(v => v?.setId).filter(Boolean))
  const fresh = bank.filter(b => !used.has(b.id))
  const set = bank.find(b => b.id === planned?.setId) ?? choice(fresh.length ? fresh : bank)
  const at = planned ? slotOf(act, beat) : null
  await privRef.set({ [id]: { setId: set.id, values: valuesOf(set.beats), slot: at?.slot ?? null, planAct: at?.act ?? null, waiting: true } }, { merge: true })
  const host = { cat: 'boo', line: booLine(id, labelled(await readArea(db, 'ui_copy'))) }
  for (const g of list) await db.doc(`sessions/${g.uid}`).update({ [`windows.${id}`]: { kind: 'questions', beats: stripValues(set.beats), opensAt: new Date(now), waiting: true, title: WINDOWS.questions.title, host } })
  return { ok: true, id, phones: list.length, waiting: true }
}

// Act 4 is over: every waiting game a phone never played gets a random
// answer, so a no-show is never a pattern. Safe to call again.
export async function settleWaiting(db, nightId, { now = Date.now() } = {}) {
  const { list } = await guests(db, nightId)
  const c = await readCase(db, nightId)
  const seed = await nightSeed(db, nightId)
  let settled = 0
  for (const g of list) {
    const ref = db.doc(`sessions/${g.uid}`)
    const s = (await ref.get()).data()
    for (const [id, w] of Object.entries(s?.windows ?? {})) {
      if (!w?.waiting || s.answers?.[id]) continue
      const picks = await db.runTransaction(async tx => {
        const cur = (await tx.get(ref)).data()
        const set = cur?.windows?.[id]
        if (!set || cur.answers?.[id]) return null
        const p = randomPicks(set, pickFor(seed, 'default', id, g.key))
        tx.update(ref, { [`answers.${id}`]: { picks: p, at: new Date(now), defaulted: true } })
        return p
      })
      if (!picks) continue
      await applyPoints(db, nightId, g.key, id, picks, c, 4)
      settled++
    }
  }
  return { ok: true, settled }
}

// ---------------------------------------------------------------------------
// Act 7: the reveal and each phone's own result.

export async function reveal(db, nightId, { now = Date.now() } = {}) {
  const c = await ensureCase(db, nightId)
  return finale.reveal(db, nightId, c, { now, pick: await nightPickOf(db, nightId, 'finale') })
}
async function nightPickOf(db, nightId, ...purpose) { return pickFor(await nightSeed(db, nightId), ...purpose) }

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
  const { level, partner } = workReveal({ owner: murdererChar, inPlay, exclude: [victimTrace].filter(Boolean), dial: c.dial, pick: await nightPickOf(db, nightId, 'trace') })
  const base = { level, placeholder: !!c.rehearsal, at: new Date(now), irwinLine: irwinTraceLine(level, labelled(await readArea(db, 'ui_copy'))) } // Irwin hosts the reveal (hosts.js); the workshop's HOST IRWIN TRACE lines win
  const full = {
    ...base, trace: murdererChar.trace,
    label: level === 5 ? murdererChar.traceLabel : null,
    partner: level === 3 ? partner : null,
  }
  // Any phone can read public/*, so the public doc carries only what the
  // level allows the room to see (traces.shownReveal). On a rehearsal night
  // the slot is a bracketed stand-in at that level, never the picture (Jon, 23 Oct 2026).
  const shown = c.rehearsal ? { ...base, standIn: traceStandIn('Murderer', level) } : { ...base, ...shownReveal({ level, trace: full.trace, label: full.label, partner }) }
  const batch = db.batch()
  batch.set(db.doc(`nights/${nightId}/private/trace`), full)
  batch.set(ref, shown)
  batch.set(db.doc(`nights/${nightId}/public/cues`), { hall: 'green', changedAt: new Date(now) }, { merge: true })
  await batch.commit()
  return { ok: true, level }
}

// The hall bulb outside the bedroom (public/cues.hall, read by the brain).
// Jon's cue list (25 Oct 2026): green for the welcome from the first beat of
// Act 1 (cue 1), off during the blackout (the brain reads the phase), red from
// the power's return (cue 5) until the drawing is done, when revealTrace turns
// it green (cue 18). ensureHall writes only when nothing has set the bulb yet
// (every beat asks); setHall writes whatever the moment says (the power's
// return, the role-dealing act jump).
export const HALL_COLOURS = ['red', 'green']
export async function ensureHall(db, nightId, colour, now = Date.now()) {
  if (!HALL_COLOURS.includes(colour)) throw new NightError('invalid', 'The hall light is red or green.')
  const ref = db.doc(`nights/${nightId}/public/cues`)
  const snap = await ref.get()
  if (snap.exists && snap.data().hall) return false
  await ref.set({ hall: colour, changedAt: new Date(now) }, { merge: true })
  return true
}
export async function setHall(db, nightId, colour, now = Date.now()) {
  if (!HALL_COLOURS.includes(colour)) throw new NightError('invalid', 'The hall light is red or green.')
  await db.doc(`nights/${nightId}/public/cues`).set({ hall: colour, changedAt: new Date(now) }, { merge: true })
  return { ok: true, hall: colour }
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

// The End (cue 23, 25 Oct 2026): the night is over, for good. nights/{id}.over
// tells every phone to open up with everything readable (the result stays on
// Now) and every room screen and the brain to go dark. Written once; a second
// visit to the beat changes nothing. The host's Back or an act jump takes the
// flag off again (run.enterBeat), so a rehearsal can walk the end twice.
export async function end(db, nightId, { now = Date.now() } = {}) {
  const ref = db.doc(`nights/${nightId}`)
  const snap = await ref.get()
  if (!snap.exists) throw new NightError('no-night', 'No such night.')
  if (snap.data().over === true) return { ok: true, over: true, already: true }
  await ref.update({ over: true, overAt: new Date(now) })
  return { ok: true, over: true }
}

// ---------------------------------------------------------------------------
// One beat's action, run when the host moves onto it.

export async function runAction(db, nightId, act, beat, action, { now = Date.now() } = {}) {
  if (!action) return { ok: true }
  const [verb, arg] = action.split(':')
  switch (verb) {
    case 'notice': {
      if (arg === 'news') await noteDealt(db, nightId, { kind: 'echo', act, beat }) // the ledger: the news is on the screen (safeguards)
      const { list } = await guests(db, nightId)
      const ui = labelled(await readArea(db, 'ui_copy'))
      const over = ui[`NOTICE ${arg.toUpperCase()}`] ? { text: ui[`NOTICE ${arg.toUpperCase()}`] } : {}
      let dealt = 0
      for (const g of list) if (await dealCard(db, g.uid, noticeCard(arg, act, beat, over))) dealt++
      return { ok: true, dealt }
    }
    case 'deal':
      if (arg === 'encounter') return dealEncounter(db, nightId, act, beat, { now })
      throw new NightError('invalid', `Unknown deal: ${arg}`)
    case 'window':
      return openWindow(db, nightId, arg, { now, act, beat })
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
    case 'end':
      return end(db, nightId, { now })
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
