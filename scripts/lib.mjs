// Shared helpers for the blind scripts: the lean table (generate-leans.mjs),
// the drawing's picture bank (generate-relay-pictures.mjs) and the bag
// packing (pack-bags.mjs). Each writes straight to its own sealed/* doc.
// SEAL RULE: nothing in this module may print, log, or file sealed text.
// Print counts, lengths, and hashes only.

import { createHash } from 'node:crypto'
import 'dotenv/config'
import { initializeApp, applicationDefault } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

export const LINE_MAX = 80 // nothing the scripts print is longer than this

export function adminDb() {
  const app = initializeApp({
    credential: applicationDefault(),
    projectId: 'murderwin-at-sirwin-manor',
  })
  return getFirestore(app)
}

// One of the workshop's lists (SAFE content), live items in order. Read with
// the Admin SDK; never printed.
export async function areaItems(db, area) {
  const snap = await db.collection('safe_content').doc(area).get()
  if (!snap.exists) return []
  const raw = snap.data()?.items
  const items = Array.isArray(raw) ? raw : Array.isArray(raw?.items) ? raw.items : []
  return items.filter(i => !i.deleted && typeof i.text === 'string' && i.text.trim()).sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
}

// ---- printing --------------------------------------------------------------
// Every line the scripts print goes through here: at most LINE_MAX characters,
// wrapped, never truncated silently. Counts and PASS/FAIL only, by construction
// of the callers; this only guards the width.
export function say(text) {
  for (const raw of String(text).split('\n')) {
    let line = raw
    while (line.length > LINE_MAX) {
      let cut = line.lastIndexOf(' ', LINE_MAX)
      if (cut < 20) cut = LINE_MAX
      console.log(line.slice(0, cut))
      line = '  ' + line.slice(cut).trimStart()
    }
    console.log(line)
  }
}

// ---- an in-memory stand-in for the Admin SDK -------------------------------
// Only what the scripts' tests and dry runs touch: get and set on a doc.
// Never a substitute for the rules; nothing in it persists.
export function memoryDb(initial = {}) {
  const store = new Map(Object.entries(initial))
  const docRef = path => ({
    id: path.split('/').pop(),
    path,
    get: async () => ({ exists: store.has(path), id: path.split('/').pop(), data: () => (store.has(path) ? structuredClone(store.get(path)) : undefined) }),
    set: async (data, opts) => { store.set(path, opts?.merge && store.has(path) ? { ...store.get(path), ...data } : structuredClone(data)) },
  })
  const collection = name => ({ doc: id => docRef(`${name}/${id}`) })
  return { collection, doc: path => docRef(path), store }
}

export function sha12(obj) {
  return createHash('sha256').update(JSON.stringify(obj)).digest('hex').slice(0, 12)
}

// Errors must never carry content. Wrap anything risky before rethrowing.
// The wrapper is marked sealSafe so top-level handlers know its message may
// be printed; any unmarked error prints as type + code only.
export function redactedError(context, err) {
  const safe = ['status', 'code', 'name'].map(k => err?.[k]).filter(Boolean).join(' ')
  const e = new Error(`${context} failed (${safe || 'no status'}; message length ${String(err?.message ?? '').length})`)
  e.sealSafe = true
  return e
}

export function printFatal(e) {
  if (e?.sealSafe) console.error(e.message)
  else console.error(`fatal: ${e?.name ?? 'Error'} ${e?.code ?? e?.status ?? ''} (message redacted, length ${String(e?.message ?? '').length})`)
}
