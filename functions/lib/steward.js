// The Steward's door to the secrets. Jenna (they/them) is the one person who
// may read and edit sealed/* because they never play (CLAUDE.md, The
// Steward exception). This is the real gate: a Cloud Function, checked by
// the SHA-256 of a verified Google email. firestore.rules keeps denying
// every client read of sealed/*, so nothing here needs a rules change, and
// Jon's admin UID is refused like anyone else's.
//
// SEAL RULE. Sealed text passes through here on its way to the Steward's
// screen and back. It is never logged: the log line carries the op and the
// code only. Errors carry reason codes, never text. Nothing here reads
// cases/*.
//
// Ops (all through one callable, `steward`, functions/index.js):
//   whoami            { ok: true }            proves the gate opens for this account
//   list              { codes: [{ code, edited, version, review, complete }], bags, generated }
//   read   { code }   one sealed set, its edit marks and the motive it serves
//   write  { code, field, value }   one field: editedAt, editedBy, version+1,
//                     the generated copy kept under `original` the first time
//   mark   { code, review }         'done' | 'more' | '' (Jenna's two words per set)
//   bags              sealed/bags as a packing list by bag number, items named
//                     from the workshop's bag lines
//   leans             the Parlour Games lean table (sealed/parlour_leans): every
//                     set in the workshop bank, its questions and answers, and
//                     which answer each cat leans toward (docs/parlour-games.md)
//   lean   { setId, q, cat, value }   one cat's leaning answer for one question:
//                     'a', 'b', or '' to clear it
//
// The sealed doc after an edit:
//   { ...the five content fields (edited), original: { the five as generated },
//     generatedAt, editedAt, editedBy: 'steward', version: n, review?, reviewedAt? }
// The generator (scripts/generate-sealed.mjs) skips any doc with editedAt.

import { createHash } from 'node:crypto'
import { NightError, readArea, MOTIVES } from './night.js'
import { checkSealed, CAT_KEYS } from './case.js'
import { LISTENERS, ANSWERS, QUESTIONS } from './parlour.js'

// The Steward's hash: the SHA-256 of their verified Google email, lower
// case. The same value as isAdmin() in firestore.rules (the admin-drift
// test keeps them equal). STEWARD_EMAIL_HASH in the functions env overrides
// it for a stand-in Steward, but ONLY on the emulator (FUNCTIONS_EMULATOR is
// 'true' there and nowhere else): a deployed function always uses the hash
// in the rules, so no .env line can open the sealed sets to another account.
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

export const CONTENT_FIELDS = ['kernels', 'documents', 'fragments', 'studyClue', 'irwin']
export const OPS = ['whoami', 'list', 'read', 'write', 'mark', 'bags', 'leans', 'lean']
export const LEANS_DOC = 'sealed/parlour_leans' // the same doc deal.js reads at the case deal
export const REVIEWS = ['done', 'more', '']
export const VALUE_MAX = 2000

// Which fields may be edited, as dotted paths into the sealed doc. Variants
// are fixed at three: an index past the end is refused, nothing is appended.
const FIELD_RE = [
  /^kernels\.(irwin|boo|granolia|zimothy)\.(\d+)$/,
  /^kernels\.salem\.(\d+)\.(text|anchor)$/,
  /^documents\.(\d+)\.(text|emphasis|annotation)$/,
  /^(fragments|studyClue|irwin)\.(\d+)$/,
]
export function fieldAllowed(field) {
  return typeof field === 'string' && FIELD_RE.some(re => re.test(field))
}

const CODE_RE = /^[A-Z0-9]{3,12}$/
function codeOf(data) {
  const code = data?.code
  if (typeof code !== 'string' || !CODE_RE.test(code) || code === 'manifest' || code === 'bags') throw new NightError('invalid', 'Which set?')
  return code
}

function contentOf(doc) {
  const out = {}
  for (const f of CONTENT_FIELDS) out[f] = structuredClone(doc?.[f] ?? null)
  return out
}

function millis(v) {
  if (!v) return null
  if (typeof v === 'number') return v
  if (v instanceof Date) return v.getTime()
  if (typeof v.toMillis === 'function') return v.toMillis()
  return null
}

// Walk a dotted path inside a cloned top-level field and set the leaf.
// Returns the new top-level value; throws 'invalid' when the path runs off
// the existing shape (a missing cat, an index past the three variants).
function setLeaf(doc, field, value) {
  const parts = field.split('.')
  const top = parts[0]
  const next = structuredClone(doc[top])
  let cur = next
  for (let i = 1; i < parts.length - 1; i++) {
    const p = parts[i]
    if (cur === null || typeof cur !== 'object' || !(p in cur)) throw new NightError('invalid', 'That part of the set does not exist.')
    cur = cur[p]
  }
  const leaf = parts[parts.length - 1]
  if (cur === null || typeof cur !== 'object') throw new NightError('invalid', 'That part of the set does not exist.')
  if (Array.isArray(cur)) {
    const i = Number(leaf)
    if (!Number.isInteger(i) || i < 0 || i >= cur.length) throw new NightError('invalid', 'That part of the set does not exist.')
    cur[i] = value
  } else {
    if (!(leaf in cur)) throw new NightError('invalid', 'That part of the set does not exist.')
    cur[leaf] = value
  }
  return { top, next }
}

async function readManifest(db) {
  const snap = await db.doc('sealed/manifest').get()
  return snap.exists ? snap.data() : null
}

// ---- the ops ------------------------------------------------------------

async function opList(db) {
  const manifest = await readManifest(db)
  const codes = Object.keys(manifest?.codes ?? {}).sort()
  const rows = []
  for (const code of codes) {
    const snap = await db.doc(`sealed/${code}`).get()
    if (!snap.exists) { rows.push({ code, missing: true, edited: false, version: 0, review: '', complete: false }); continue }
    const d = snap.data()
    rows.push({
      code,
      edited: Boolean(d.editedAt),
      editedAt: millis(d.editedAt),
      version: Number(d.version ?? 0),
      review: REVIEWS.includes(d.review) ? d.review : '',
      complete: checkSealed(d).ok,
    })
  }
  const bagsSnap = await db.doc('sealed/bags').get()
  return {
    ok: true,
    generated: codes.length > 0,
    generatedAt: millis(manifest?.generatedAt),
    codes: rows,
    bags: bagsSnap.exists && Boolean(bagsSnap.data()?.bags),
  }
}

async function opRead(db, data) {
  const code = codeOf(data)
  const snap = await db.doc(`sealed/${code}`).get()
  if (!snap.exists) throw new NightError('no-doc', 'No such set.')
  const d = snap.data()
  const manifest = await readManifest(db)
  const n = manifest?.codes?.[code] ?? null
  const motive = MOTIVES.find(m => m.n === n) ?? null
  return {
    ok: true,
    code,
    motive: motive ? { n: motive.n, rhyme: motive.rhyme } : null,
    content: contentOf(d),
    original: d.original ? structuredClone(d.original) : null,
    editedAt: millis(d.editedAt),
    editedBy: d.editedBy ?? null,
    version: Number(d.version ?? 0),
    review: REVIEWS.includes(d.review) ? d.review : '',
    generatedAt: millis(d.generatedAt),
    shape: checkSealed(d),
  }
}

async function opWrite(db, data, { now }) {
  const code = codeOf(data)
  const { field, value } = data ?? {}
  if (!fieldAllowed(field)) throw new NightError('invalid', 'That field cannot be edited.')
  if (typeof value !== 'string' || !value.trim() || value.length > VALUE_MAX) throw new NightError('invalid', `Write something, up to ${VALUE_MAX} characters.`)
  const ref = db.doc(`sealed/${code}`)
  const result = await db.runTransaction(async tx => {
    const snap = await tx.get(ref)
    if (!snap.exists) throw new NightError('no-doc', 'No such set.')
    const d = snap.data()
    const { top, next } = setLeaf(d, field, value)
    const version = Number(d.version ?? 0) + 1
    const patch = { [top]: next, editedAt: now, editedBy: 'steward', version }
    if (!d.original) patch.original = contentOf(d)
    tx.update(ref, patch)
    return { version, shape: checkSealed({ ...d, [top]: next }) }
  })
  return { ok: true, code, field, version: result.version, shape: result.shape }
}

async function opMark(db, data, { now }) {
  const code = codeOf(data)
  const review = data?.review ?? ''
  if (!REVIEWS.includes(review)) throw new NightError('invalid', 'Done, needs more, or neither.')
  const ref = db.doc(`sealed/${code}`)
  const snap = await ref.get()
  if (!snap.exists) throw new NightError('no-doc', 'No such set.')
  await ref.update({ review, reviewedAt: now })
  return { ok: true, code, review }
}

// The packing list, by bag number, with each item's workshop line so Jenna
// can pack from it. A taste item listed under `doubles` is packed twice.
async function opBags(db) {
  const snap = await db.doc('sealed/bags').get()
  if (!snap.exists || !snap.data()?.bags) return { ok: true, packed: false, bags: [] }
  const d = snap.data()
  const items = await readArea(db, 'bag_items')
  const text = Object.fromEntries(items.map(i => [i.id, i.text]))
  const bags = Object.keys(d.bags).map(Number).filter(Number.isFinite).sort((a, b) => a - b).map(n => {
    const ids = Array.isArray(d.bags[String(n)]) ? d.bags[String(n)] : []
    const twice = new Set(Array.isArray(d.doubles?.[String(n)]) ? d.doubles[String(n)] : [])
    return { n, items: ids.map(id => ({ id, text: text[id] ?? '(a line that is no longer in the workshop)', twice: twice.has(id) })) }
  })
  return {
    ok: true,
    packed: true,
    packedAt: millis(d.packedAt),
    packedBy: d.packedBy ?? null,
    counts: d.counts ?? null,
    stackedPairs: Array.isArray(d.stackedPairs) ? d.stackedPairs.length : 0,
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

// One entry point for the callable and the tests. `log` gets the op and the
// code only.
export async function stewardOp(db, data, { now = new Date(), log = (...a) => console.log(...a) } = {}) {
  const op = data?.op
  if (!OPS.includes(op)) throw new NightError('invalid', 'Which op?')
  log('steward', op, typeof data?.code === 'string' && CODE_RE.test(data.code) ? data.code : '-')
  switch (op) {
    case 'whoami': return { ok: true }
    case 'list': return opList(db)
    case 'read': return opRead(db, data)
    case 'write': return opWrite(db, data, { now })
    case 'mark': return opMark(db, data, { now })
    case 'bags': return opBags(db)
    case 'leans': return opLeans(db)
    case 'lean': return opLean(db, data, { now })
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

export { CAT_KEYS }
