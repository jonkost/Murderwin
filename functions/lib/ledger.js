// The two records the safeguards read, both kept on cases/{nightId}
// (sealed, Admin SDK only): the ledger of which clues have reached a phone,
// and the exposure record of a hidden role the host hushed. A leaf module
// on purpose: deal.js and station.js write here, safeguards.js decides from
// here, and nothing in this file imports any of them.
//
// SEAL RULE. A ledger entry is a kind, an act, a beat and a guest key or a
// group id: never a word of what was dealt. Nothing here prints or returns
// content.

export const BLOCKING_KINDS = ['study', 'echo', 'hint', 'memory', 'room']
export const LEDGER_FIELDS = ['kind', 'act', 'beat', 'key', 'groupId']
export const HUSH_ROLES = ['murderer', 'ghost']

// Appends one entry to cases/{nightId}.dealtClues. Quiet when there is no
// case yet (Act 1, or a night with no case): there is nothing to protect.
export async function noteDealt(db, nightId, entry = {}, { now = Date.now() } = {}) {
  const ref = db.doc(`cases/${nightId}`)
  const clean = {}
  for (const f of LEDGER_FIELDS) if (entry[f] !== undefined && entry[f] !== null) clean[f] = entry[f]
  if (!clean.kind) return { noted: false }
  return db.runTransaction(async tx => {
    const snap = await tx.get(ref)
    if (!snap.exists) return { noted: false }
    const cur = snap.data() ?? {}
    const list = Array.isArray(cur.dealtClues) ? cur.dealtClues : []
    tx.update(ref, { dealtClues: [...list, { ...clean, at: new Date(now) }] })
    return { noted: true, count: list.length + 1 }
  })
}

// Has anything the story depends on reached anyone? The conservative rule:
// the study's clue, the news on the screen (kind 'echo', the name it has
// always had), a cat's hint (it rules out a family) or the memory match's
// cross-off all pin the motive.
export function spillBlocked(c) {
  const list = Array.isArray(c?.dealtClues) ? c.dealtClues : []
  return list.some(e => BLOCKING_KINDS.includes(e?.kind))
}

// The Hush: the host's silent tap when a hidden role has been found out.
// cases/{nightId}.exposure[role] = { hushedAt, act }. Once set it stays
// (the first tap wins), so a second tap is a no-op.
export async function noteExposure(db, nightId, role, { act = null, now = Date.now() } = {}) {
  if (!HUSH_ROLES.includes(role)) { const e = new Error('Hush the Murderer or the Ghost.'); e.code = 'invalid'; throw e }
  const ref = db.doc(`cases/${nightId}`)
  return db.runTransaction(async tx => {
    const snap = await tx.get(ref)
    if (!snap.exists || !snap.data()?.roles) return { ok: true, hushed: false, already: false }
    const cur = snap.data().exposure ?? {}
    if (cur[role]) return { ok: true, hushed: true, already: true }
    tx.update(ref, { [`exposure.${role}`]: { hushedAt: new Date(now), act } })
    return { ok: true, hushed: true, already: false }
  })
}

export function isHushed(c, role) {
  return !!c?.exposure?.[role]
}

// What the finale says about a hush, in plain words. Empty when nobody was
// hushed, so the finale doc carries the field only when there is something
// to say. Written at the reveal beat, after the roles are named on the TV.
const ROLE_WORDS = { murderer: 'The Murderer', ghost: 'The Ghost' }
export function spotlightLines(c) {
  const out = []
  for (const role of HUSH_ROLES) {
    const x = c?.exposure?.[role]
    if (!x) continue
    const when = x.act ? ` in Act ${x.act}` : ''
    out.push({ role, act: x.act ?? null, text: `${ROLE_WORDS[role]} was found out${when}. From then on their Parlour Game answers moved nothing.` })
  }
  return out
}
