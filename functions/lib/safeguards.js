// The host's two safeguard buttons (CLAUDE.md, Safeguards):
//
//  Spill the Beans: the outward reset. Allowed through the end of Act 5,
//  never after. The engine decides legality silently, with a conservative
//  rule: the story may change only while nothing that pins the motive has
//  reached a phone (no document, no study clue, no echo on the screen: the
//  ledger in ledger.js) and no window is open. When it is off the answer is
//  { did: false } with no reason, and the Host tab says the same thing either
//  way. When it is on: the Murderer stays, every guest keeps their character
//  and their affection, a new sealed set is drawn (a different motive), a new
//  Ghost is picked, the case is rewritten, the role cards are replaced in
//  place (same card id) and the dial starts again.
//
//  The Hush: the exposure safeguard. A silent tap when a hidden role has been
//  found out in the room. From then on that role's Parlour Game answers move
//  no dial (deal.js applyPoints reads ledger.isHushed). Nothing on any phone
//  changes; the finale says one line about it (ledger.spotlightLines).
//
// SEAL RULE: nothing here returns content. Results are ok flags and counts.
// Clue content is read from sealed/* and cases/* with the Admin SDK and
// written only to cases/{nightId}; role card text is safe copy.

import { randomInt } from 'node:crypto'
import { NightError, readArea } from './night.js'
import { buildCase, rehearsalCase, rerollCase, checkSealed, nextMotive, POOL_KEYS } from './case.js'
import * as deal from './deal.js'
import { noteExposure, spillBlocked, HUSH_ROLES } from './ledger.js'

export { noteDealt, noteExposure, spillBlocked, isHushed, spotlightLines, BLOCKING_KINDS, HUSH_ROLES } from './ledger.js'

export const SPILL_LAST_ACT = 5
export const SPILL_TRIES = 5

function shuffled(list, pick) {
  const a = [...list]
  for (let i = a.length - 1; i > 0; i--) { const j = pick(i + 1); [a[i], a[j]] = [a[j], a[i]] }
  return a
}

// Everyone at the party with a phone: { key, name, characterId, uid }.
async function guestsOf(db, nightId) {
  const [nightSnap, deckSnap] = await Promise.all([db.doc(`nights/${nightId}`).get(), db.doc(`nights/${nightId}/private/deck`).get()])
  if (!nightSnap.exists) throw new NightError('no-night', 'No such night.')
  const night = nightSnap.data()
  const uids = deckSnap.exists ? (deckSnap.data().uids ?? {}) : {}
  const list = Object.entries(night.roster ?? {}).map(([key, r]) => ({ key, ...r, uid: uids[key] ?? null }))
  return { night, list }
}

// Is the spill on? Decided here and nowhere else; the caller gets a boolean.
export function spillAllowed(night, c, { now = Date.now() } = {}) {
  if (!night || !c?.roles) return false
  if (!(night.act >= 2 && night.act <= SPILL_LAST_ACT)) return false
  if (night.phase === 'blackout') return false
  if (night.window && !night.window.settled) return false
  if (spillBlocked(c)) return false
  return true
}

// A fresh case from another sealed set, with a different motive. Null when
// no usable set remains (the night keeps the story it has).
async function freshCase(db, { c, common, pick }) {
  if (c.rehearsal) {
    const fresh = rehearsalCase(common)
    return { ...fresh, motive: nextMotive(c.motive, pick) }
  }
  const manifestSnap = await db.doc('sealed/manifest').get()
  const codes = manifestSnap.exists ? manifestSnap.data().codes ?? {} : {}
  const others = Object.keys(codes).filter(code => Number(codes[code]) !== Number(c.motive))
  for (const code of shuffled(others, pick).slice(0, SPILL_TRIES)) {
    const snap = await db.doc(`sealed/${code}`).get()
    const sealedDoc = snap.exists ? snap.data() : null
    if (!sealedDoc || !checkSealed(sealedDoc).ok) continue
    try { return buildCase({ ...common, sealedDoc, motiveN: codes[code] }) } catch (e) { if (e?.code !== 'sealed-shape') throw e }
  }
  return null
}

// The role card on each phone is replaced in place, same id, so the You tab
// shows the role the case now holds. Only phones whose text changes are touched.
async function replaceRoleCards(db, nightId, list, c) {
  const written = await deal.roleCardTexts(db)
  let changed = 0
  for (const g of list) {
    if (!g.uid) continue
    const ref = db.doc(`sessions/${g.uid}`)
    const snap = await ref.get()
    if (!snap.exists) continue
    const s = snap.data()
    if (s.nightId !== nightId) continue
    const cards = Array.isArray(s.cards) ? s.cards : []
    const i = cards.findIndex(x => x.id === deal.ROLE_CARD_ID)
    if (i < 0) continue
    const text = deal.roleCardText(deal.roleOf(c, g.key), written)
    if (cards[i].text === text) continue
    const next = [...cards]
    next[i] = { ...cards[i], text, at: new Date() }
    await ref.update({ cards: next })
    changed++
  }
  return changed
}

export async function spill(db, { nightId, now = Date.now(), pick = randomInt } = {}) {
  const { night, list } = await guestsOf(db, nightId)
  const c = await deal.readCase(db, nightId)
  if (!spillAllowed(night, c, { now })) return { ok: true, did: false }
  const [templates, poolItems] = await Promise.all([readArea(db, 'templates'), readArea(db, 'pools')])
  const poolLists = {}
  for (const k of POOL_KEYS) poolLists[k.toLowerCase()] = poolItems.filter(i => i.pool === k.toLowerCase()).map(i => i.text)
  const common = { nightId, roster: list, templates, pools: poolLists, rng: pick, now }
  const fresh = await freshCase(db, { c, common, pick })
  if (!fresh) return { ok: true, did: false }
  const next = rerollCase({ prev: c, fresh, roster: list, poolLists, rng: pick })
  await db.doc(`cases/${nightId}`).set(next)
  await replaceRoleCards(db, nightId, list, next)
  return { ok: true, did: true }
}

export async function hush(db, { nightId, role, now = Date.now() } = {}) {
  if (!HUSH_ROLES.includes(role)) throw new NightError('invalid', 'Hush the Murderer or the Ghost.')
  const snap = await db.doc(`nights/${nightId}`).get()
  if (!snap.exists) throw new NightError('no-night', 'No such night.')
  const night = snap.data()
  const r = await noteExposure(db, nightId, role, { act: night.act ?? null, now })
  return { ok: true, role, hushed: r.hushed, already: r.already }
}
