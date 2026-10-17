// A tiny in-memory stand-in for the Firestore Admin SDK — just the surface
// lib/night.js uses: doc/collection get, set (with merge), update with dotted
// paths, batches and transactions. Enough to prove the night logic without
// credentials. Never a substitute for the real rules.
// Added 17 Oct for discard-night: delete (doc, batch, transaction),
// FieldValue.delete() in an update, where('field', '==', v).get() on a
// collection, and listDocuments on a subcollection.
import { FieldValue } from 'firebase-admin/firestore'

function isSentinel(v) {
  return v instanceof FieldValue
}

function resolve(value) {
  if (isSentinel(value)) return new Date()
  if (Array.isArray(value)) return value.map(resolve)
  if (value && typeof value === 'object' && !(value instanceof Date)) {
    const out = {}
    for (const [k, v] of Object.entries(value)) out[k] = resolve(v)
    return out
  }
  return value
}

function setPath(obj, path, value) {
  const parts = path.split('.')
  let cur = obj
  for (const p of parts.slice(0, -1)) {
    if (typeof cur[p] !== 'object' || cur[p] === null) cur[p] = {}
    cur = cur[p]
  }
  cur[parts[parts.length - 1]] = value
}
function deletePath(obj, path) {
  const parts = path.split('.')
  let cur = obj
  for (const p of parts.slice(0, -1)) {
    if (typeof cur[p] !== 'object' || cur[p] === null) return
    cur = cur[p]
  }
  delete cur[parts[parts.length - 1]]
}
function isDeleteSentinel(v) {
  return isSentinel(v) && v.isEqual(FieldValue.delete())
}
function getPath(obj, path) {
  let cur = obj
  for (const p of path.split('.')) { if (cur === null || typeof cur !== 'object') return undefined; cur = cur[p] }
  return cur
}

export class FakeFirestore {
  constructor() { this.store = new Map(); this.versions = new Map() }

  _bump(path) { this.versions.set(path, (this.versions.get(path) ?? 0) + 1) }
  _get(path) {
    const data = this.store.get(path)
    return { exists: data !== undefined, data: () => (data === undefined ? undefined : structuredClone(data)), ref: this.doc(path), id: path.split('/').pop() }
  }
  _set(path, data, opts) {
    const next = resolve(data)
    if (opts?.merge && this.store.has(path)) this.store.set(path, { ...this.store.get(path), ...next })
    else this.store.set(path, next)
    this._bump(path)
  }
  _update(path, fields) {
    if (!this.store.has(path)) throw new Error(`update on missing doc ${path}`)
    const cur = structuredClone(this.store.get(path))
    for (const [k, v] of Object.entries(fields)) {
      if (isDeleteSentinel(v)) deletePath(cur, k)
      else setPath(cur, k, resolve(v))
    }
    this.store.set(path, cur)
    this._bump(path)
  }
  _delete(path) { this.store.delete(path); this._bump(path) }

  doc(path) {
    const db = this
    return {
      path,
      id: path.split('/').pop(),
      get: async () => db._get(path),
      set: async (data, opts) => db._set(path, data, opts),
      update: async (fields) => db._update(path, fields),
      delete: async () => db._delete(path),
      collection: (sub) => db.collection(`${path}/${sub}`),
    }
  }
  collection(name) {
    const db = this
    const depth = name.split('/').length + 1
    const keys = () => [...db.store.keys()].filter(k => k.startsWith(`${name}/`) && k.split('/').length === depth)
    const snapshotOf = (ks) => {
      const docs = ks.map(k => db._get(k))
      return { docs, empty: docs.length === 0, size: docs.length }
    }
    const query = (filters) => ({
      where: (field, op, value) => query([...filters, { field, op, value }]),
      get: async () => snapshotOf(keys().filter(k => filters.every(f => {
        const v = getPath(db.store.get(k), f.field)
        if (f.op === '==') return v === f.value
        if (f.op === '!=') return v !== f.value
        throw new Error(`fake where: unsupported op ${f.op}`)
      }))),
    })
    return {
      doc: (id) => db.doc(`${name}/${id}`),
      listDocuments: async () => keys().map(k => db.doc(k)),
      where: (field, op, value) => query([{ field, op, value }]),
      get: async () => snapshotOf(keys()),
    }
  }
  batch() {
    const ops = []
    return {
      set: (ref, data, opts) => ops.push(() => this._set(ref.path, data, opts)),
      update: (ref, fields) => ops.push(() => this._update(ref.path, fields)),
      delete: (ref) => ops.push(() => this._delete(ref.path)),
      commit: async () => { for (const op of ops) op() },
    }
  }
  // Like the real thing: if a doc read inside the transaction changed before
  // the writes land (another call got there first), the function runs again.
  async runTransaction(fn) {
    for (let attempt = 0; attempt < 10; attempt++) {
      const writes = []
      const read = new Map()
      const tx = {
        get: async (ref) => { read.set(ref.path, this.versions.get(ref.path) ?? 0); return this._get(ref.path) },
        set: (ref, data, opts) => writes.push(() => this._set(ref.path, data, opts)),
        update: (ref, fields) => writes.push(() => this._update(ref.path, fields)),
        delete: (ref) => writes.push(() => this._delete(ref.path)),
      }
      const result = await fn(tx)
      const stale = [...read].some(([path, v]) => (this.versions.get(path) ?? 0) !== v)
      if (stale) continue
      for (const w of writes) w()
      return result
    }
    throw new Error('transaction: too much contention')
  }
}
