// The game night: creating a night, joining it from a phone, and the host's
// act controls. Pure logic over a Firestore `db`, shared by the Cloud
// Functions (index.js) and the terminal host script (scripts/host.mjs).
//
// SEAL RULE: nothing in this file reads or writes sealed/* or cases/*.
// Everything it handles is safe content: the guest list, the fourteen
// characters, the published player copy, who holds which bag number.

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

// Safe-content areas copied onto the phones when a night is created.
// Never role_cards (per role, delivered through session docs once roles exist)
// and never bag_items (there is no bag ledger anywhere in the app).
export const PLAYER_AREAS = [
  'bios', 'npc_cards', 'rules_text', 'ui_copy', 'filler', 'smalltalk',
  'lore', 'act_scripts', 'status_lines',
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

async function readArea(db, area) {
  const snap = await db.collection('safe_content').doc(area).get()
  if (!snap.exists) return []
  return asItems(snap.data().items)
    .filter(i => !i.deleted && typeof i.text === 'string' && i.text.trim())
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
}

// A guest line in the workshop: "Name", or "Name — host: Jonathan" /
// "Name — host: Susan" for the two hosts, who always play the Professors.
export function parseGuest(text) {
  const [namePart, ...rest] = text.split('—')
  const name = namePart.trim()
  const m = /^host:\s*(jonathan|susan)\b/i.exec(rest.join('—').trim())
  return { name, host: m ? m[1].toLowerCase() : null }
}

export function guestKey(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')
}

export async function readGuests(db) {
  const guests = []
  const seen = new Set()
  for (const item of await readArea(db, 'guests')) {
    const g = parseGuest(item.text)
    if (!g.name) continue
    const key = guestKey(g.name)
    if (!key || seen.has(key)) continue
    seen.add(key)
    guests.push({ key, ...g })
  }
  return guests
}

export async function publishContent(db, nightId) {
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
  return { areas: PLAYER_AREAS.length, lines }
}

export async function createNight(db, { label } = {}) {
  const guests = await readGuests(db)
  const date = new Date()
  const nightId = `${date.toISOString().slice(0, 10).replace(/-/g, '')}-${randomBytes(2).toString('hex')}`
  const pool = CHARACTERS.filter(c => !c.host).map(c => c.id)
  const bagCount = Math.max(PLANNING_BAGS, guests.length + 2)
  const batch = db.batch()
  batch.set(db.doc(`nights/${nightId}`), {
    nightId,
    label: label || `Night of ${date.toDateString()}`,
    createdAt: FieldValue.serverTimestamp(),
    joinOpen: true,
    act: 0,
    phase: 'lobby',
    phaseAt: FieldValue.serverTimestamp(),
    actStartedAt: null,
    pausedFrom: null,
    guests,
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
  return { nightId, guests: guests.length, ...published }
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

// A phone joins the night as a named guest. One phone, one character, all
// night. The same guest on a NEW phone (dead battery, borrowed iPad) takes
// the character with them; the old phone is told it has been superseded.
export async function join(db, { uid, nightId, guestKey: key }) {
  if (!uid) throw new NightError('unauthenticated', 'Sign in first.')
  if (!nightId || !key) throw new NightError('invalid', 'Which night, and who are you?')
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
    const guest = (night.guests ?? []).find(g => g.key === key)
    if (!guest) throw new NightError('no-guest', 'That name is not on the guest list. Find the host.')
    if (!night.joinOpen) throw new NightError('closed', 'The doors are closed for now. Find the host.')

    const roster = night.roster ?? {}
    const entry = roster[key] ?? null
    const oldUid = entry ? (deck.uids?.[key] ?? null) : null
    const oldSessionSnap = oldUid && oldUid !== uid ? await tx.get(db.doc(`sessions/${oldUid}`)) : null

    let characterId, bag, affection
    if (entry) {
      characterId = entry.characterId
      bag = entry.bag
      affection = oldSessionSnap?.data()?.affection ?? existing?.affection ?? null
    } else {
      const taken = new Set(Object.values(roster).map(r => r.characterId))
      if (guest.host) characterId = CHARACTERS.find(c => c.host === guest.host)?.id
      else characterId = (deck.order ?? []).find(id => !taken.has(id))
      if (!characterId || taken.has(characterId)) throw new NightError('full', 'Every character is spoken for tonight. Find the host.')
      const usedBags = new Set(Object.values(roster).map(r => r.bag))
      bag = (deck.bags ?? []).find(b => !usedBags.has(b)) ?? Object.keys(roster).length + 1
    }
    const character = characterById(characterId)
    if (!character) throw new NightError('invalid', 'That character does not exist.')
    if (!affection) affection = rollAffection(character.profession)

    // then writes
    if (oldSessionSnap?.exists) {
      tx.set(oldSessionSnap.ref, { status: 'superseded', supersededAt: FieldValue.serverTimestamp() }, { merge: true })
    }
    tx.update(nightRef, {
      [`roster.${key}`]: {
        name: guest.name, characterId, bag,
        joinedAt: entry?.joinedAt ?? FieldValue.serverTimestamp(),
      },
    })
    tx.update(deckRef, { [`uids.${key}`]: uid })
    tx.set(sessionRef, {
      nightId, guestKey: key, guestName: guest.name,
      characterId, bag, affection,
      status: 'active',
      joinedAt: FieldValue.serverTimestamp(),
    })
    return { ok: true, characterId, resumed: false }
  })
}

// The host's buttons. Labelled by function, never by content.
export async function hostCommand(db, { nightId, command, arg } = {}) {
  if (command === 'create') return createNight(db, { label: arg })
  if (!nightId) throw new NightError('invalid', 'Which night?')
  const ref = db.doc(`nights/${nightId}`)
  const snap = await ref.get()
  if (!snap.exists) throw new NightError('no-night', 'No such night.')
  const night = snap.data()
  const now = FieldValue.serverTimestamp()
  switch (command) {
    case 'publish':
      return publishContent(db, nightId)
    case 'activate':
      await db.doc('public_state/active').set({ nightId, since: now })
      return { ok: true }
    case 'refresh-guests': {
      const guests = await readGuests(db)
      await ref.update({ guests })
      return { ok: true, guests: guests.length }
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
      await ref.update({ act, phase: 'act', phaseAt: now, actStartedAt: now, pausedFrom: null })
      return { ok: true, act }
    }
    case 'blackout':
      // Every phone goes dark. Nothing on any screen until the power returns.
      await ref.update({ phase: 'blackout', phaseAt: now, pausedFrom: null })
      return { ok: true }
    case 'power':
      // Power returns: every phone lights at once with its prompt, held 15 s.
      await ref.update({ act: 2, phase: 'prompt', phaseAt: now, actStartedAt: now, pausedFrom: null })
      return { ok: true }
    case 'pause':
      if (night.phase === 'paused') return { ok: true }
      await ref.update({ phase: 'paused', pausedFrom: night.phase, phaseAt: now })
      return { ok: true }
    case 'resume':
      if (night.phase !== 'paused') return { ok: true }
      await ref.update({ phase: night.pausedFrom ?? 'act', pausedFrom: null, phaseAt: now })
      return { ok: true }
    default:
      throw new NightError('invalid', `Unknown command: ${command}`)
  }
}
