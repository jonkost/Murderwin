// The Steward's door to the sealed lists. Jenna (they/them) is the one
// person who may read sealed/* and edit the cats' leans, because they never
// play (CLAUDE.md, The Steward exception). This is the real gate: a Cloud
// Function, checked by the SHA-256 of a verified Google email.
// firestore.rules keeps denying every client read of sealed/*, so nothing
// here needs a rules change, and Jon's admin UID is refused like anyone
// else's.
//
// SEAL RULE. Sealed content passes through here on its way to the Steward's
// screen and back. It is never logged: the log line carries the op only.
// Errors carry reason codes, never text. Nothing here reads cases/*.
//
// Ops (all through one callable, `steward`, functions/index.js):
//   whoami            { ok: true }            proves the gate opens for this account
//   bags              sealed/bags as a packing list by bag number, each item's
//                     name and "looks like" note from the workshop's bag lines,
//                     a pair written out ("2 Hershey's Kisses") (read only)
//   leans             the Parlour Games lean table (sealed/parlour_leans): every
//                     set in the workshop bank, its questions and answers, and
//                     which answer each cat leans toward (docs/parlour-games.md)
//   lean   { setId, q, cat, value }   one cat's leaning answer for one question:
//                     'a', 'b', or '' to clear it
//   checks            the content checks on the real packing, leans and drawing
//                     pictures (checks.js): each check's ID, its plain name, PASS
//                     or FIX NEEDED and a count. Never a word of what it read.

import { createHash } from 'node:crypto'
import { NightError, readArea } from './night.js'
import { LISTENERS, ANSWERS, QUESTIONS } from './parlour.js'
import { BANK_DOC } from './relay-bank.js'

// The Steward's hash: the SHA-256 of their verified Google email, lower
// case. The same value as isAdmin() in firestore.rules (the admin-drift
// test keeps them equal). STEWARD_EMAIL_HASH in the functions env overrides
// it for a stand-in Steward, but ONLY on the emulator (FUNCTIONS_EMULATOR is
// 'true' there and nowhere else): a deployed function always uses the hash
// in the rules, so no .env line can open the sealed lists to another account.
export const RULES_STEWARD_HASH = '2ea18fbeb53147b23ca3afa1e1291934aeea1b6e5c6c2c7b40b6301386ffe2b8'
export function onEmulator(env = process.env) {
  return String(env.FUNCTIONS_EMULATOR ?? '').trim().toLowerCase() === 'true'
}
export function stewardHash(env = process.env) {
  if (!onEmulator(env)) return RULES_STEWARD_HASH
  const override = String(env.STEWARD_EMAIL_HASH ?? '').trim().toLowerCase()
  return /^[a-f0-9]{64}$/.test(override) ? override : RULES_STEWARD_HASH
}

export function emailHash(email) {
  return createHash('sha256').update(String(email ?? '').trim().toLowerCase()).digest('hex')
}

// The gate. A verified email whose hash is the Steward's; nothing else
// counts, not an admin UID, not an unverified address.
export function isSteward(token, { hash = stewardHash() } = {}) {
  if (!token || typeof token !== 'object') return false
  if (token.email_verified !== true) return false
  if (typeof token.email !== 'string' || !token.email.includes('@')) return false
  if (!/^[a-f0-9]{64}$/.test(String(hash))) return false
  return emailHash(token.email) === hash
}

export const OPS = ['whoami', 'bags', 'leans', 'lean', 'checks']
export const LEANS_DOC = 'sealed/parlour_leans' // the same doc deal.js reads at the case deal

function millis(v) {
  if (!v) return null
  if (typeof v === 'number') return v
  if (v instanceof Date) return v.getTime()
  if (typeof v.toMillis === 'function') return v.toMillis()
  return null
}

// ---- the ops ------------------------------------------------------------

// One bag line, read for the packing list: the item's name, what it looks
// like, and its clue words, from "Item — sense: word · kind · stock N ·
// looks like: note · tag: tag" (docs/handoff-2026-10-23.md §15). A line in
// an older shape gives its name and the rest whole.
export function readBagLine(text) {
  const t = String(text ?? '')
  const dash = t.indexOf('—')
  if (dash < 0) return { name: t.trim(), looks: '', words: '' }
  const [words, ...tail] = t.slice(dash + 1).split('·').map(x => x.trim())
  const looks = tail.find(x => x.toLowerCase().startsWith('looks like:'))
  return { name: t.slice(0, dash).trim(), looks: looks ? looks.slice(looks.indexOf(':') + 1).trim() : '', words: /^no clue words?$/i.test(words) ? '' : words }
}

// The packing list, by bag number, as Jenna packs it: each item's name and
// what it looks like, a pair written out ("2 Hershey's Kisses": the food
// listed under `doubles` goes in as two singles).
async function opBags(db) {
  const snap = await db.doc('sealed/bags').get()
  if (!snap.exists || !snap.data()?.bags) return { ok: true, packed: false, bags: [] }
  const d = snap.data()
  const items = await readArea(db, 'bag_items')
  const text = Object.fromEntries(items.map(i => [i.id, i.text]))
  const bags = Object.keys(d.bags).map(Number).filter(Number.isFinite).sort((a, b) => a - b).map(n => {
    const ids = Array.isArray(d.bags[String(n)]) ? d.bags[String(n)] : []
    const twice = new Set(Array.isArray(d.doubles?.[String(n)]) ? d.doubles[String(n)] : [])
    return {
      n,
      items: ids.map(id => {
        const line = text[id]
        const read = line ? readBagLine(line) : { name: '(a line that is no longer in the workshop)', looks: '', words: '' }
        return { id, text: line ?? read.name, name: twice.has(id) ? `2 ${read.name}` : read.name, looks: read.looks, words: read.words, twice: twice.has(id) }
      }),
    }
  })
  return {
    ok: true,
    packed: true,
    packedAt: millis(d.packedAt),
    packedBy: d.packedBy ?? null,
    counts: d.counts ?? null,
    properties: d.properties ?? {},
    bags,
  }
}

// The lean table beside the bank it belongs to. The questions and answers are
// safe (Jon wrote them); which answer a cat leans toward is sealed.
async function opLeans(db) {
  const items = await readArea(db, 'scenarios')
  const snap = await db.doc(LEANS_DOC).get()
  const table = snap.exists ? (snap.data().sets ?? {}) : {}
  const sets = items
    .filter(i => Array.isArray(i.beats) && i.beats.length === QUESTIONS)
    .map(i => ({
      id: String(i.id),
      questions: i.beats.map((b, q) => ({
        q: String(b?.q ?? ''), a: String(b?.a ?? ''), b: String(b?.b ?? ''),
        leans: Object.fromEntries(LISTENERS.map(cat => [cat, ANSWERS.includes(table[i.id]?.[q]?.[cat]) ? table[i.id][q][cat] : ''])),
      })),
    }))
  const filled = sets.reduce((n, s) => n + s.questions.reduce((m, q) => m + LISTENERS.filter(c => q.leans[c]).length, 0), 0)
  return { ok: true, sets, filled, of: sets.length * QUESTIONS * LISTENERS.length, editedAt: millis(snap.exists ? snap.data().editedAt : null) }
}

async function opLean(db, data, { now }) {
  const { setId, q, cat, value } = data ?? {}
  if (typeof setId !== 'string' || !/^[\w-]{1,80}$/.test(setId)) throw new NightError('invalid', 'Which set?')
  if (!Number.isInteger(q) || q < 0 || q >= QUESTIONS) throw new NightError('invalid', 'Which question?')
  if (!LISTENERS.includes(cat)) throw new NightError('invalid', 'Which cat?')
  if (!['', ...ANSWERS].includes(value)) throw new NightError('invalid', 'The first answer, the second, or neither.')
  const items = await readArea(db, 'scenarios')
  if (!items.some(i => String(i.id) === setId)) throw new NightError('no-doc', 'No such set.')
  const ref = db.doc(LEANS_DOC)
  await db.runTransaction(async tx => {
    const snap = await tx.get(ref)
    const sets = structuredClone(snap.exists ? (snap.data().sets ?? {}) : {})
    sets[setId] ??= {}
    sets[setId][q] ??= {}
    if (value) sets[setId][q][cat] = value
    else delete sets[setId][q][cat]
    tx.set(ref, { sets, editedAt: now, editedBy: 'steward' }) // the whole table: a cleared lean is gone, not merged back
  })
  return { ok: true, setId, q, cat }
}

// Jenna's "Run the checks" (docs/test-plan.md): the checks that need the real
// sealed content, run here on the server. Only IDs, names, pass or fail and
// counts leave this function.
async function opChecks(db, { rng = n => Math.floor(Math.random() * n) } = {}) {
  // loaded here, not at the top: checks.js reaches act4.js, which reaches deal.js, which imports this file
  const { packingChecks, leanChecks, pictureChecks, CHECK_NAMES } = await import('./checks.js')
  const [bags, leans, pictures, items] = await Promise.all([
    db.doc('sealed/bags').get(), db.doc(LEANS_DOC).get(), db.doc(BANK_DOC).get(), readArea(db, 'scenarios'),
  ])
  const sets = items.filter(i => Array.isArray(i.beats) && i.beats.length === QUESTIONS).map(i => ({ id: String(i.id) }))
  const results = [
    ...packingChecks(bags.exists ? bags.data() : null, { rng }),
    ...leanChecks(leans.exists ? (leans.data().sets ?? {}) : {}, sets),
    ...pictureChecks(pictures.exists ? pictures.data() : null),
  ].map(r => ({ id: r.id, name: CHECK_NAMES[r.id] ?? r.id, pass: !!r.pass, ...(Number.isFinite(r.count) ? { count: r.count, of: r.of } : {}) }))
  return { ok: true, allPass: results.every(r => r.pass), results }
}

// One entry point for the callable and the tests. `log` gets the op only.
export async function stewardOp(db, data, { now = new Date(), log = (...a) => console.log(...a) } = {}) {
  const op = data?.op
  if (!OPS.includes(op)) throw new NightError('invalid', 'Which op?')
  log('steward', op)
  switch (op) {
    case 'whoami': return { ok: true }
    case 'bags': return opBags(db)
    case 'leans': return opLeans(db)
    case 'lean': return opLean(db, data, { now })
    case 'checks': return opChecks(db)
    default: throw new NightError('invalid', 'Which op?')
  }
}

// The gate and the op together: what functions/index.js calls with the
// request. Refuses before touching the database; the refusal has no body
// beyond its code and one plain line.
export async function stewardRequest(db, req, { hash = stewardHash(), now, log } = {}) {
  if (!req?.auth?.uid) throw new NightError('unauthenticated', 'Sign in first.')
  if (!isSteward(req.auth.token, { hash })) throw new NightError('permission-denied', 'Not for you.')
  return stewardOp(db, req.data ?? {}, { now, log })
}

