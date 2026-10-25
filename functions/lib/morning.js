// The morning after (card 196): once the party is over, the case that ran
// opens to Jon. Built now, used after the party (Jon, 24 Oct 2026).
//
// Four ops through one callable, `morningAfter` (functions/index.js), Jon's
// admin account only:
//   status   whether it can open yet, and why not. Never content.
//   open     { confirm: 'OPEN' }  copies the party night into an archive
//            (archive/{nightId} and its parts: the case, the night, its
//            private records, every guest's phone, Boo's Catwalk photos,
//            and the three secrets that ran: the packing, the cats' leans,
//            the drawing pictures), then marks it open (archive/_morning, a
//            doc no client may write). Nothing is moved or deleted.
//   read     the archive as plain sections for the workshop's Morning after
//            page: who did it, to whom, why, everyone's role, what the cats
//            ruled out, the dial, the bags, the drawing.
//   secrets  { choice: 'keep' | 'clear' }  Jon's call on the three secrets
//            that ran. Keep leaves them sealed as they are. Clear copies each
//            one as it stands into the archive (a newer version than the copy
//            made at open included), then removes it from sealed/*, so
//            nothing is lost. The nineteen retired sets of 20 October never ran and
//            are left alone either way.
//
// THE GATE (Rule 1). Before the party, nothing here gives anything away:
// `open` refuses unless all four hold: Jon's account (index.js), the party
// day has come (PARTY_DAY), a party night (not a rehearsal, a dry run or a
// Game test night) has had its reveal play to the end (public/finale stage
// 'victim') on the party day or later, so a night started with the party box
// ticked before the party never counts, and Jon typed OPEN. `read` and
// `secrets` refuse until `open` has run, and check the day again. The mark
// that says it is open lives where no client may write (archive/_morning;
// meta/* is the admin's to write, so a mark there could be forged).
// `status` says only yes or no and a plain reason. Logs carry the op and
// counts only.

import { NightError, readArea, characterById, MOTIVES } from './night.js'
import { FAMILIES, familyOf } from './families.js'
import { traceLevel } from './traces.js'
import { readBagLine } from './steward.js'

// Not before the party day (Sunday 15 November 2026): noon UTC is early
// morning in the house, hours before the doors open, so no reveal can come first.
export const PARTY_DAY = Date.parse('2026-11-15T12:00:00Z')
export const MORNING_DOC = 'archive/_morning'
export const SECRET_DOCS = ['sealed/bags', 'sealed/parlour_leans', 'sealed/relay_pictures']
export const archivePath = nightId => `archive/${nightId}`
const partPath = (nightId, part) => `archive/${nightId}/parts/${part}`
const secretPart = path => path.replace('/', '-') // sealed/bags → sealed-bags

function millis(v) {
  if (!v) return 0
  if (typeof v.toMillis === 'function') return v.toMillis()
  if (v instanceof Date) return v.getTime()
  return Number(v) || 0
}

// The party nights: made with the party box ticked, never a dry run or a Game test night.
async function partyNights(db) {
  const snap = await db.collection('nights').where('forceRehearsal', '==', false).get()
  return (snap.docs ?? []).map(d => ({ id: d.id, night: d.data() })).filter(({ night }) => night && night.dryRun !== true && night.gameTest !== true)
}

// The party night whose reveal played to the end (all three names out) on
// the party day or later, newest first. A night started with the party box
// ticked before the party (a tech run, say) is never this one, however far it got.
async function revealedParty(db) {
  const nights = await partyNights(db)
  nights.sort((a, b) => millis(b.night.createdAt) - millis(a.night.createdAt))
  for (const n of nights) {
    const f = (await db.doc(`nights/${n.id}/public/finale`).get()).data()
    if (f?.stage === 'victim' && millis(f.victimNamedAt ?? f.victimAt) >= PARTY_DAY) return n
  }
  return null
}

// The mark, only when it names a night the archive really holds (openCase writes both).
async function openMark(db, now) {
  if (now < PARTY_DAY) return null
  const mark = (await db.doc(MORNING_DOC).get()).data() ?? null
  if (!mark?.openedAt || !mark.nightId) return null
  const index = await db.doc(archivePath(mark.nightId)).get()
  return index.exists ? mark : null
}

export const WHY = {
  before: 'It opens on the party day, after the reveal. Not before.',
  noParty: 'No party night has had its reveal yet. It opens once the third name is on the screen.',
  ready: 'Ready. The party night has had its reveal.',
  opened: 'Open. The case is in the archive.',
}

export async function morningStatus(db, { now = Date.now() } = {}) {
  const mark = (await db.doc(MORNING_DOC).get()).data() ?? null
  if (mark?.openedAt) return { ok: true, opened: true, ready: true, why: WHY.opened, openedAt: millis(mark.openedAt), secrets: mark.secrets ?? null, label: mark.label ?? '' }
  if (now < PARTY_DAY) return { ok: true, opened: false, ready: false, why: WHY.before }
  const party = await revealedParty(db)
  if (!party) return { ok: true, opened: false, ready: false, why: WHY.noParty }
  return { ok: true, opened: false, ready: true, why: WHY.ready, label: party.night.label ?? '' }
}

export async function openCase(db, { confirm, now = Date.now(), log = (...a) => console.log(...a) } = {}) {
  if (String(confirm ?? '').trim().toUpperCase() !== 'OPEN') throw new NightError('invalid', 'Type OPEN to open the case.')
  const mark = (await db.doc(MORNING_DOC).get()).data() ?? null
  if (mark?.openedAt) return { ok: true, already: true }
  if (now < PARTY_DAY) throw new NightError('closed', WHY.before)
  const party = await revealedParty(db)
  if (!party) throw new NightError('closed', WHY.noParty)
  const nightId = party.id
  const parts = {}
  const take = async (part, path) => { const s = await db.doc(path).get(); if (s.exists) parts[part] = s.data() }
  await take('case', `cases/${nightId}`)
  parts.night = party.night
  for (const ref of await db.collection(`nights/${nightId}/private`).listDocuments()) await take(`private-${ref.id}`, ref.path)
  for (const ref of await db.collection(`nights/${nightId}/public`).listDocuments()) {
    if (['finale', 'trace', 'relay', 'act4', 'screen', 'rotation'].includes(ref.id) || /^pose-g\d{1,2}$/.test(ref.id)) await take(`public-${ref.id}`, ref.path)
  }
  // every guest's phone: what each of them was dealt and answered
  const uids = parts['private-deck']?.uids ?? {}
  for (const [key, uid] of Object.entries(uids)) await take(`session-${key}`, `sessions/${uid}`)
  for (const path of SECRET_DOCS) await take(secretPart(path), path)
  const batch = db.batch()
  for (const [part, data] of Object.entries(parts)) batch.set(db.doc(partPath(nightId, part)), data)
  batch.set(db.doc(archivePath(nightId)), { nightId, label: party.night.label ?? '', openedAt: new Date(now), parts: Object.keys(parts).sort() })
  batch.set(db.doc(MORNING_DOC), { nightId, label: party.night.label ?? '', openedAt: new Date(now), secrets: null })
  await batch.commit()
  log('morningAfter open', JSON.stringify({ parts: Object.keys(parts).length }))
  return { ok: true, parts: Object.keys(parts).length }
}

async function readParts(db, nightId) {
  const index = (await db.doc(archivePath(nightId)).get()).data()
  const parts = {}
  for (const part of index?.parts ?? []) {
    const s = await db.doc(partPath(nightId, part)).get()
    if (s.exists) parts[part] = s.data()
  }
  return parts
}

const familyName = key => FAMILIES.find(f => f.key === key)?.name ?? key

// The archive as plain sections. Pure: the parts as archived, and the
// workshop's bag lines for the items' names.
export function morningView(parts, { bagItems = [] } = {}) {
  const c = parts.case ?? {}
  const night = parts.night ?? {}
  const roster = night.roster ?? {}
  const who = key => {
    const r = roster[key]
    if (!r) return null
    return { name: r.name ?? key, character: characterById(r.characterId)?.name ?? '', bag: r.bag ?? null }
  }
  const motive = MOTIVES.find(m => m.n === Number(c.motive)) ?? null
  const solving = c.solving ?? {}
  const roleName = { murderer: 'The Murderer', ghost: 'The Ghost (the victim)', detective: 'Detective' }
  const people = Object.keys(roster).sort((a, b) => String(roster[a].name).localeCompare(String(roster[b].name))).map(key => ({
    ...who(key), role: roleName[c.roles?.[key] ?? 'detective'] ?? 'Detective',
    ruledOut: (solving.hints?.[key] ?? []).map(familyName),
  }))
  // the bags, by number, each item's name from the workshop's bag lines
  const names = Object.fromEntries(bagItems.map(i => [i.id, readBagLine(i.text).name]))
  const packing = parts['sealed-bags']
  const twice = n => new Set(packing?.doubles?.[String(n)] ?? [])
  const bags = packing?.bags ? Object.keys(packing.bags).map(Number).filter(Number.isFinite).sort((a, b) => a - b).map(n => ({
    n, items: (packing.bags[String(n)] ?? []).map(id => `${twice(n).has(id) ? '2 ' : ''}${names[id] ?? '(a line no longer in the workshop)'}`),
  })) : []
  // the drawing: the answer to each round, or a made-up stand-in
  const grids = parts['private-relay']?.grids ?? []
  const drawing = grids.filter(g => g.number >= 1).map(g => ({ round: g.number, picture: g.named ? (g.options?.[g.answer]?.name ?? '') : 'a made-up picture (the bank had none)' }))
  // Boo's Catwalk: each group's last pose, as the end credits showed it
  const poses = Object.entries(parts).filter(([k]) => /^public-pose-g\d+$/.test(k)).map(([, d]) => ({ names: d.names ?? [], image: d.image ?? null })).filter(p => p.image)
  const pushes = { ghost: 0, murderer: 0 }
  for (const p of c.dialLog ?? []) if (p?.role in pushes) pushes[p.role] += 1
  return {
    label: night.label ?? '',
    rehearsal: c.rehearsal !== false,
    answer: {
      murderer: who(c.murderer),
      victim: who(c.ghost),
      motive: motive ? { n: motive.n, rhyme: motive.rhyme, family: familyName(familyOf(motive.n)) } : null,
    },
    people,
    news: (solving.newsOut ?? []).map(familyName),
    dial: { level: traceLevel(c.dial ?? 0), total: c.dial ?? 0, pushes },
    bags: { murderer: roster[c.murderer]?.bag ?? null, ghost: roster[c.ghost]?.bag ?? null, list: bags },
    drawing,
    poses,
    leans: Object.keys(parts['sealed-parlour_leans']?.sets ?? {}).length,
    spills: c.spills ?? 0,
  }
}

export async function readCase(db, { now = Date.now(), log = (...a) => console.log(...a) } = {}) {
  const mark = await openMark(db, now)
  if (!mark) throw new NightError('closed', 'The case is still sealed. Open it first, after the party.')
  const parts = await readParts(db, mark.nightId)
  log('morningAfter read', JSON.stringify({ parts: Object.keys(parts).length }))
  return { ok: true, view: morningView(parts, { bagItems: await readArea(db, 'bag_items') }), secrets: mark.secrets ?? null }
}

export async function chooseSecrets(db, { choice, now = Date.now(), log = (...a) => console.log(...a) } = {}) {
  if (!['keep', 'clear'].includes(choice)) throw new NightError('invalid', 'Keep the secrets or clear them.')
  const ref = db.doc(MORNING_DOC)
  const mark = await openMark(db, now)
  if (!mark) throw new NightError('closed', 'Open the case first.')
  let cleared = 0
  if (choice === 'clear') {
    const indexRef = db.doc(archivePath(mark.nightId))
    for (const path of SECRET_DOCS) {
      const live = await db.doc(path).get()
      if (!live.exists) continue
      // never cleared without a copy: the secret as it stands now goes into the
      // archive first (it may have changed since the copy made at open)
      const part = `cleared-${secretPart(path)}`
      await db.doc(partPath(mark.nightId, part)).set(live.data())
      const parts = (await indexRef.get()).data()?.parts ?? []
      if (!parts.includes(part)) await indexRef.set({ parts: [...parts, part].sort() }, { merge: true })
      await db.doc(path).delete()
      cleared++
    }
  }
  await ref.set({ secrets: choice === 'clear' ? 'cleared' : 'kept', secretsAt: new Date(now) }, { merge: true })
  log('morningAfter secrets', JSON.stringify({ choice, cleared }))
  return { ok: true, secrets: choice === 'clear' ? 'cleared' : 'kept', cleared }
}

export const OPS = ['status', 'open', 'read', 'secrets']
export async function morningOp(db, data = {}, { now = Date.now(), log } = {}) {
  switch (data?.op) {
    case 'status': return morningStatus(db, { now })
    case 'open': return openCase(db, { confirm: data.confirm, now, log })
    case 'read': return readCase(db, { now, log })
    case 'secrets': return chooseSecrets(db, { choice: data.choice, now, log })
    default: throw new NightError('invalid', 'Which op?')
  }
}
