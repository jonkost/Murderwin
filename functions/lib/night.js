// The game night: creating a night, joining it from a phone, and the host's
// act controls. Pure logic over a Firestore `db`, shared by the Cloud
// Functions (index.js) and the terminal host script (scripts/host.mjs).
//
// SEAL RULE: nothing in this file reads sealed/* or cases/*, with one
// narrow exception: a guest who joins after the power has returned is handed
// to deal.dealRoleTo (loaded at call time, never at import), which adds them
// to the case as a detective and deals their role card. Nothing from the
// case comes back here. Everything else is safe content: the guest list, the
// fourteen characters, the published player copy, who holds which bag number.

import { randomInt, randomBytes } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { dirname, join as joinPath } from 'node:path'
import { fileURLToPath } from 'node:url'
import { FieldValue } from 'firebase-admin/firestore'

const here = dirname(fileURLToPath(import.meta.url))
const seedDir = joinPath(here, '..', 'seed') // copied from ../seed by `npm run seed`
const CHARACTERS_FILE = JSON.parse(readFileSync(joinPath(seedDir, 'characters.json'), 'utf8'))
export const CHARACTERS = CHARACTERS_FILE.characters
export const AFFECTION_MODS = CHARACTERS_FILE.affection
export const MOTIVES = JSON.parse(readFileSync(joinPath(seedDir, 'motives.json'), 'utf8')).motives

export const CATS = ['granolia', 'boo', 'zimothy', 'salem'] // Irwin is always 5
export const PLANNING_BAGS = 10 // 8 players → 10 bags (bag doc, 29 Sep)

// Safe-content areas copied onto the phones when a night is created: only
// the lists a phone actually reads. Never role_cards (per role, delivered
// through session docs once roles exist), never bag_items (there is no bag
// ledger anywhere in the app), and not the retired lists (filler, lore).
export const PLAYER_AREAS = [
  'bios', 'npc_cards', 'rules_text', 'ui_copy', 'smalltalk',
  'act_scripts', 'status_lines', 'motive_notes',
  // 18 Oct 2026 (G): the room screens read these from the same copy
  'study_lines', 'echo_frames', 'epilogue_frames', 'station_text',
  'achievements', // 18 Oct 2026 (I): the Host tab's tap list reads the titles from here
]

export class NightError extends Error {
  constructor(code, message) { super(message); this.code = code }
}

function shuffled(list) {
  const a = [...list]
  for (let i = a.length - 1; i > 0; i--) {
    const j = randomInt(i + 1)
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function asItems(raw) {
  if (Array.isArray(raw)) return raw
  if (Array.isArray(raw?.items)) return raw.items
  return []
}

export async function readArea(db, area) {
  const snap = await db.collection('safe_content').doc(area).get()
  if (!snap.exists) return []
  return asItems(snap.data().items)
    .filter(i => !i.deleted && typeof i.text === 'string' && i.text.trim())
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
}

// Names as typed on the phone become roster keys: safe for dotted field paths.
export function nameKey(name) {
  return String(name ?? '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')
}

export const DEFAULT_HOSTS = { jonathan: 'Jon', susan: 'Susan' }

// The two hosts, from the workshop's Game night form (meta/game). Whoever
// types one of these names on a phone plays that Professor and gets the
// Host tab. Everyone else types any name and draws a character.
export async function readHosts(db) {
  const snap = await db.doc('meta/game').get()
  const data = snap.exists ? snap.data() : {}
  const hosts = {}
  for (const host of ['jonathan', 'susan']) {
    const name = String(data[`host_${host}`] ?? '').trim() || DEFAULT_HOSTS[host]
    hosts[host] = { name, key: nameKey(name) }
  }
  return hosts
}

// Counts only, and quiet under node:test unless a test passes its own `log`.
const quietLog = line => { if (!process.env.NODE_TEST_CONTEXT) console.log(line) }

// The freeze (18 Oct 2026): once meta/game.frozenAt is set from the
// workshop's Game night page, a night that already holds its copy of the
// lines keeps it, whatever happens in the workshop. A brand-new night still
// gets its first copy (the lists are read-only while frozen, so it is the
// frozen copy). Logs one count line either way.
export async function isFrozen(db) {
  const snap = await db.doc('meta/game').get()
  const at = snap.exists ? snap.data().frozenAt : null
  return !!at && (typeof at.toMillis === 'function' ? at.toMillis() : Number(at) || (at instanceof Date ? at.getTime() : 0)) > 0
}

export async function publishContent(db, nightId, { log = quietLog } = {}) {
  if (await isFrozen(db)) {
    const ref = db.doc(`nights/${nightId}/public/content`)
    const have = await ref.get()
    if (have.exists) {
      log(`publish ${JSON.stringify({ nightId, frozen: true, areas: 0, lines: 0 })}`)
      return { areas: 0, lines: 0, frozen: true }
    }
  }
  const content = { publishedAt: FieldValue.serverTimestamp() }
  let lines = 0
  for (const area of PLAYER_AREAS) {
    const items = await readArea(db, area)
    lines += items.length
    content[area] = items.map(i => ({
      text: i.text,
      ...(i.cat ? { cat: i.cat } : {}),
      ...(i.act ? { act: i.act } : {}),
    }))
  }
  content.motives = MOTIVES
  // Identities are public; traces are not. Traces never leave the server here.
  content.characters = CHARACTERS.map(({ id, name, profession, gender, bio }) => ({ id, name, profession, gender, bio }))
  await db.doc(`nights/${nightId}/public/content`).set(content)
  log(`publish ${JSON.stringify({ nightId, frozen: false, areas: PLAYER_AREAS.length, lines })}`)
  return { areas: PLAYER_AREAS.length, lines }
}

// How many bags the blind packer packed: the highest bag number any property
// names. Null when there is no packing. Nothing else from the doc is read.
export async function packedBagCount(db) {
  const snap = await db.doc('sealed/bags').get()
  const d = snap.exists ? snap.data() : null
  if (!d || !d.properties || typeof d.properties !== 'object') return null
  const nums = Object.values(d.properties).flat().map(Number).filter(n => Number.isFinite(n) && n > 0)
  if (!nums.length) return null
  return Math.max(...nums)
}

export async function createNight(db, { label, forceRehearsal, dryRun = false } = {}) {
  const hosts = await readHosts(db)
  // Nights rehearse by default. Only the workshop's "This is the party night"
  // checkbox (meta/game.party_night) or an explicit caller (the fake players'
  // dry run) makes a night use the sealed content.
  if (typeof forceRehearsal !== 'boolean') {
    const gameSnap = await db.doc('meta/game').get()
    forceRehearsal = !(gameSnap.exists && gameSnap.data().party_night === true)
  }
  const date = new Date()
  const nightId = `${date.toISOString().slice(0, 10).replace(/-/g, '')}-${randomBytes(2).toString('hex')}`
  const pool = CHARACTERS.filter(c => !c.host).map(c => c.id)
  // Bag numbers come from the packing when one exists (sealed/bags, read here
  // with the Admin SDK; only the count is used, never an item), so every
  // guest's bag is a real one. With no packing yet, fourteen numbers, one per character.
  const bagCount = await packedBagCount(db) ?? Math.max(PLANNING_BAGS, 14)
  const batch = db.batch()
  batch.set(db.doc(`nights/${nightId}`), {
    nightId,
    label: label || `Night of ${date.toDateString()}`,
    createdAt: FieldValue.serverTimestamp(),
    joinOpen: true,
    act: 0,
    beat: 'arrive',    // which beat of the act (seed/night.json); the host steps through them
    window: null,      // { id, kind, opensAt, closesAt, settled } when every phone is choosing
    rehearsal: false,  // true once a throwaway case is dealt
    forceRehearsal,    // true: the case is always a throwaway, whatever is sealed (the default)
    dryRun,            // true: a fake-players run with real sealed content; discarded afterwards
    caseWarning: null, // 'rehearsal-fallback', 'no-sealed-content' and/or 'trace-partner', shown on the Host tab
    phase: 'lobby',
    phaseAt: FieldValue.serverTimestamp(),
    actStartedAt: null,
    pausedFrom: null,
    hosts,
    roster: {},
  })
  // The deck is private: the shuffled draw order and which phone holds which
  // guest. Characters are drawn from it in join order, so nobody can predict
  // who gets whom.
  batch.set(db.doc(`nights/${nightId}/private/deck`), {
    order: shuffled(pool),
    bags: shuffled(Array.from({ length: bagCount }, (_, i) => i + 1)),
    uids: {},
  })
  batch.set(db.doc('public_state/active'), { nightId, since: FieldValue.serverTimestamp() })
  await batch.commit()
  const published = await publishContent(db, nightId)
  return { nightId, ...published }
}

// Affection to each cat, 1–5, rolled once at character creation and never
// changed: base 3, plus the profession modifier, plus a little luck. Irwin is
// always 5. Floor guarantee: at least one cat other than Irwin is friendly (4+).
export function rollAffection(profession) {
  const mods = AFFECTION_MODS[profession] ?? {}
  const out = { irwin: 5 }
  for (const cat of CATS) {
    out[cat] = Math.max(1, Math.min(5, 3 + (mods[cat] ?? 0) + randomInt(3) - 1))
  }
  if (!CATS.some(c => out[c] >= 4)) {
    const best = [...CATS].sort((a, b) => out[b] - out[a])[0]
    out[best] = 4
  }
  return out
}

export function characterById(id) {
  return CHARACTERS.find(c => c.id === id) ?? null
}

// A phone joins the night by typing a name. One phone, one character, all
// night. The same name on a NEW phone (dead battery, borrowed iPad) takes the
// character with it; the old phone is told it has been superseded. A name
// matching one of the two hosts plays that Professor and gets the Host tab.
export async function join(db, { uid, nightId, name }) {
  const result = await joinOnly(db, { uid, nightId, name })
  // Every name tapped refreshes the phones' copy of the workshop lines, so a
  // night can never show stale words (16 Oct 2026). Cheap: seven small reads.
  try { await publishContent(db, nightId) } catch { /* the join itself stands */ }
  // Arrived after the power came back? The case already has its roles; this
  // phone is written in as a detective (never promoted) and gets the same
  // role card as everyone else. Before that moment nothing is dealt.
  if (!result.resumed) {
    try {
      const deal = await import('./deal.js')
      const r = await deal.dealRoleTo(db, nightId, uid)
      result.roleDealt = r.dealt
    } catch { /* the join itself stands; the host's Power button deals it */ }
  }
  return result
}

async function joinOnly(db, { uid, nightId, name }) {
  if (!uid) throw new NightError('unauthenticated', 'Sign in first.')
  const clean = String(name ?? '').trim().replace(/\s+/g, ' ')
  const key = nameKey(clean)
  if (!nightId || !key) throw new NightError('invalid', 'Type your name first.')
  if (clean.length > 30) throw new NightError('invalid', 'A shorter name, please — thirty letters at most.')
  const nightRef = db.doc(`nights/${nightId}`)
  const deckRef = db.doc(`nights/${nightId}/private/deck`)
  const sessionRef = db.doc(`sessions/${uid}`)

  return db.runTransaction(async tx => {
    // all reads first
    const [nightSnap, deckSnap, sessionSnap] = await Promise.all([
      tx.get(nightRef), tx.get(deckRef), tx.get(sessionRef),
    ])
    if (!nightSnap.exists || !deckSnap.exists) throw new NightError('no-night', 'There is no party tonight.')
    const night = nightSnap.data()
    const deck = deckSnap.data()
    const existing = sessionSnap.exists ? sessionSnap.data() : null

    if (existing && existing.nightId === nightId && existing.status === 'active') {
      if (existing.guestKey === key) return { ok: true, characterId: existing.characterId, resumed: true }
      throw new NightError('already-joined', `This phone is already ${existing.guestName}. Find the host to change it.`)
    }
    if (!night.joinOpen) throw new NightError('closed', 'The doors are closed for now. Find the host.')

    const hostFor = Object.entries(night.hosts ?? {}).find(([, h]) => h.key === key)?.[0] ?? null
    const roster = night.roster ?? {}
    const entry = roster[key] ?? null
    const oldUid = entry ? (deck.uids?.[key] ?? null) : null
    const oldSessionSnap = oldUid && oldUid !== uid ? await tx.get(db.doc(`sessions/${oldUid}`)) : null
    // The old phone is theirs only while its session still carries their
    // name. After a handover the pointer is gone (see handover) and someone
    // else may own that uid by now: their session is never read or touched.
    const oldSession = oldSessionSnap?.exists && oldSessionSnap.data().guestKey === key ? oldSessionSnap.data() : null
    const parked = entry ? (deck.handed?.[key] ?? null) : null

    let characterId, bag, affection
    // The same guest on a new phone: the character comes with them, and so
    // does everything their old phone was dealt (cards, windows, answers,
    // the group), so a dead battery costs nothing. The old phone is told it
    // has been superseded and shows the doors. After a handover the same
    // things come back from the parked copy the handover made.
    const carried = {}
    if (entry) {
      characterId = entry.characterId
      bag = entry.bag
      const old = parked ?? oldSession ?? (existing?.guestKey === key ? existing : null)
      affection = old?.affection ?? null
      for (const f of CARRIED_FIELDS) if (old?.[f] !== undefined) carried[f] = old[f]
    } else {
      const taken = new Set(Object.values(roster).map(r => r.characterId))
      if (hostFor) characterId = CHARACTERS.find(c => c.host === hostFor)?.id
      else characterId = (deck.order ?? []).find(id => !taken.has(id))
      if (!characterId || taken.has(characterId)) throw new NightError('full', 'Every character is spoken for tonight. Find the host.')
      const usedBags = new Set(Object.values(roster).map(r => r.bag))
      bag = (deck.bags ?? []).find(b => !usedBags.has(b)) ?? Object.keys(roster).length + 1
    }
    const character = characterById(characterId)
    if (!character) throw new NightError('invalid', 'That character does not exist.')
    if (!affection) affection = rollAffection(character.profession)
    const displayName = entry?.name ?? clean

    // then writes
    if (oldSession) {
      tx.set(oldSessionSnap.ref, { status: 'superseded', supersededAt: FieldValue.serverTimestamp() }, { merge: true })
    }
    tx.update(nightRef, {
      [`roster.${key}`]: {
        name: displayName, characterId, bag,
        joinedAt: entry?.joinedAt ?? FieldValue.serverTimestamp(),
      },
    })
    tx.update(deckRef, { [`uids.${key}`]: uid, ...(parked ? { [`handed.${key}`]: FieldValue.delete() } : {}) })
    tx.set(sessionRef, {
      ...carried,
      nightId, guestKey: key, guestName: displayName,
      characterId, bag, affection,
      host: hostFor, // the two hosts get the Host tab on their own phone
      status: 'active',
      joinedAt: FieldValue.serverTimestamp(),
    })
    return { ok: true, characterId, resumed: false }
  })
}

// What follows a guest from a dead phone to a new one.
export const CARRIED_FIELDS = ['cards', 'windows', 'answers', 'solved', 'tries', 'ballot', 'result', 'group', 'groupAffection', 'dealt', 'lights']

// A borrowed phone (host button). The previous owner's cards, windows and
// everything else they were dealt are moved off the session into the
// private deck (`handed[guestKey]`, which no phone can read), the deck's
// pointer from their name to this phone is dropped, their notes for this
// night are wiped, and `generation` is bumped (a timestamp, so it is always
// newer): the phone sees the change, forgets its local copy and reloads to
// the doors. The next person to pick the phone up joins as themselves, on
// this uid, with nothing of the previous owner's. The previous owner keeps
// their character; tapping their name on any other phone brings it back
// from the parked copy, cards, affection and all, and never touches whoever
// holds the handed phone now. `arg` is the guest's roster key as the Host
// tab knows it, or a session uid.
export async function handover(db, { nightId, arg, now = Date.now() } = {}) {
  const who = String(arg ?? '').trim()
  if (!who) throw new NightError('invalid', 'Whose phone?')
  const deckRef = db.doc(`nights/${nightId}/private/deck`)
  const deck = (await deckRef.get()).data() ?? {}
  const uid = deck.uids?.[who] ?? (Object.values(deck.uids ?? {}).includes(who) ? who : null)
  if (!uid) throw new NightError('no-guest', 'Nobody at the party has that phone.')
  const ref = db.doc(`sessions/${uid}`)
  const snap = await ref.get()
  if (!snap.exists || snap.data().nightId !== nightId) throw new NightError('no-guest', 'That phone is not at this party.')
  const s = snap.data()
  const key = s.guestKey ?? Object.entries(deck.uids ?? {}).find(([, u]) => u === uid)?.[0] ?? null
  const parked = { affection: s.affection ?? null, handedAt: new Date(now) }
  for (const f of CARRIED_FIELDS) if (s[f] !== undefined) parked[f] = s[f]
  const batch = db.batch()
  if (key) batch.update(deckRef, { [`uids.${key}`]: FieldValue.delete(), [`handed.${key}`]: parked })
  const wiped = { cards: [], windows: {}, answers: {}, status: 'handed', handedAt: new Date(now), generation: now }
  for (const f of CARRIED_FIELDS) if (!(f in wiped) && s[f] !== undefined) wiped[f] = FieldValue.delete()
  batch.update(ref, wiped)
  // the phone keeps its uid through the reset, so its notes go too (crossed-off motives, prompts seen)
  const notesRef = db.doc(`notes/${uid}`)
  const notes = await notesRef.get()
  if (notes.exists && notes.data()?.byNight?.[nightId] !== undefined) batch.update(notesRef, { [`byNight.${nightId}`]: FieldValue.delete() })
  await batch.commit()
  return { ok: true }
}

// Pause and resume. Pausing stores the moment; resuming measures how long the
// pause lasted and moves every deadline on by that much, in one batch, so no
// window settles, no relay turn ends and no study slot expires while the
// host is dealing with a dog in the garden. The fields that move:
//   nights/{id}.window.opensAt, .window.closesAt
//   nights/{id}.reveal.at (older nights only; since 18 Oct the reveal lives in public/finale, below)
//   nights/{id}/public/relay: turnEndsAt, walkEndsAt, voteEndsAt, lockoutEndsAt
//   nights/{id}/public/study: slotEndsAt (the twelve-minute slot with no station;
//     a live station keeps its own fifteen-minute clock and freezes it itself
//     by watching this night's phase, station/lib/follow.js)
//   nights/{id}/public/finale: at (the reel's start; its schedule is offsets from it)
// Keep PAUSE_SHIFTED current when a new deadline is added anywhere.
export const PAUSE_SHIFTED = {
  night: ['window.opensAt', 'window.closesAt', 'reveal.at'],
  'public/relay': ['turnEndsAt', 'walkEndsAt', 'voteEndsAt', 'lockoutEndsAt'],
  'public/study': ['slotEndsAt'],
  'public/finale': ['at', 'holdAt', 'victimAt'],
  'private/parlour': [...Array.from({ length: 12 }, (_, i) => `due${i}`), 'lastAt'], // windows.js MAX_PARLOUR_SLOTS
}

function msOf(t) {
  if (!t) return 0
  if (typeof t.toMillis === 'function') return t.toMillis()
  if (t instanceof Date) return t.getTime()
  return Number(t) || 0
}
function pathGet(obj, path) { return path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj) }

export async function pauseNight(db, { nightId, now = Date.now() } = {}) {
  const ref = db.doc(`nights/${nightId}`)
  const night = (await ref.get()).data()
  if (!night) throw new NightError('no-night', 'No such night.')
  if (night.phase === 'paused') return { ok: true, already: true }
  await ref.update({ phase: 'paused', pausedFrom: night.phase, phaseAt: FieldValue.serverTimestamp(), pausedAt: new Date(now) })
  return { ok: true }
}

export async function resumeNight(db, { nightId, now = Date.now() } = {}) {
  const ref = db.doc(`nights/${nightId}`)
  const night = (await ref.get()).data()
  if (!night) throw new NightError('no-night', 'No such night.')
  if (night.phase !== 'paused') return { ok: true, already: true }
  const shift = Math.max(0, now - msOf(night.pausedAt))
  const batch = db.batch()
  let moved = 0
  const nightPatch = { phase: night.pausedFrom ?? 'act', pausedFrom: null, pausedAt: null, phaseAt: FieldValue.serverTimestamp() }
  for (const f of PAUSE_SHIFTED.night) {
    const v = pathGet(night, f)
    if (v) { nightPatch[f] = new Date(msOf(v) + shift); moved++ }
  }
  batch.update(ref, nightPatch)
  for (const sub of Object.keys(PAUSE_SHIFTED).filter(k => k !== 'night')) {
    const subRef = db.doc(`nights/${nightId}/${sub}`)
    const snap = await subRef.get()
    if (!snap.exists) continue
    const data = snap.data()
    const patch = {}
    for (const f of PAUSE_SHIFTED[sub]) if (data[f]) { patch[f] = new Date(msOf(data[f]) + shift); moved++ }
    if (Object.keys(patch).length) batch.update(subRef, patch)
  }
  await batch.commit()
  return { ok: true, shiftMs: shift, moved }
}

// Who may press the host buttons: the admin (Google sign-in in the workshop,
// or the terminal), or a phone whose session is marked host — the guest-list
// lines "— host: Jonathan" / "— host: Susan". Nothing here needs Google on
// the night. The very first night may be started from any phone while no
// night is live, so the host can bootstrap from the doors screen.
export async function canHost(db, { uid, isAdmin = false, nightId, command } = {}) {
  if (isAdmin) return true
  if (!uid) return false
  const activeSnap = await db.doc('public_state/active').get()
  const activeId = activeSnap.exists ? activeSnap.data().nightId ?? null : null
  if (command === 'create') {
    if (!activeId) return true
    const activeNight = await db.doc(`nights/${activeId}`).get()
    if (!activeNight.exists) return true
  }
  const sessionSnap = await db.doc(`sessions/${uid}`).get()
  if (!sessionSnap.exists) return false
  const s = sessionSnap.data()
  if (s.status !== 'active' || !s.host) return false
  if (command === 'create' || command === 'activate') return s.nightId === activeId
  return s.nightId === nightId
}

// The host's buttons. Labelled by function, never by content.
export async function hostCommand(db, { nightId, command, arg, now = Date.now() } = {}) {
  if (command === 'create') return createNight(db, { label: arg })
  if (!nightId) throw new NightError('invalid', 'Which night?')
  const ref = db.doc(`nights/${nightId}`)
  const snap = await ref.get()
  if (!snap.exists) throw new NightError('no-night', 'No such night.')
  const night = snap.data()
  const stamp = FieldValue.serverTimestamp()
  switch (command) {
    case 'publish':
      return publishContent(db, nightId)
    case 'activate':
      await db.doc('public_state/active').set({ nightId, since: stamp })
      return { ok: true }
    case 'refresh-hosts': {
      const hosts = await readHosts(db)
      await ref.update({ hosts })
      return { ok: true }
    }
    case 'join-open':
      await ref.update({ joinOpen: true })
      return { ok: true }
    case 'join-close':
      await ref.update({ joinOpen: false })
      return { ok: true }
    case 'act': {
      const act = Number(arg)
      if (!(act >= 1 && act <= 7)) throw new NightError('invalid', 'Acts run 1 to 7.')
      await ref.update({ act, phase: 'act', phaseAt: stamp, actStartedAt: stamp, pausedFrom: null })
      return { ok: true, act }
    }
    case 'blackout':
      // Every phone goes dark. Nothing on any screen until the power returns.
      await ref.update({ phase: 'blackout', phaseAt: stamp, pausedFrom: null })
      return { ok: true }
    case 'power':
      // Power returns: every phone lights at once with its prompt, held 15 s.
      await ref.update({ act: 2, phase: 'prompt', phaseAt: stamp, actStartedAt: stamp, pausedFrom: null })
      return { ok: true }
    case 'pause':
      return pauseNight(db, { nightId, now })
    case 'resume':
      return resumeNight(db, { nightId, now })
    case 'handover':
      return handover(db, { nightId, arg, now })
    default:
      throw new NightError('invalid', `Unknown command: ${command}`)
  }
}
