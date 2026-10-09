import {
  doc, getDoc, onSnapshot, setDoc,
  collection, addDoc, updateDoc, serverTimestamp,
  query, orderBy, limit, runTransaction,
} from 'firebase/firestore'
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage'
import { db, storage, auth } from '../firebase'
import { seedDocs, seedTasks, ADDITIONS } from './content'

// One-time seed import, guarded by meta/seeded inside a transaction so two
// concurrent boots cannot double-seed. Never auto-seeds again. A fresh seed
// already contains everything, so it also stamps every ADDITIONS id as
// applied; older databases get them via applyAdditions.
export async function ensureSeeded() {
  const { tasks, decisions } = (await seedTasks()).default
  const docs = seedDocs()
  const addTasks = ADDITIONS.flatMap(a => a.tasks ?? [])
  const addDecisions = ADDITIONS.flatMap(a => a.decisions ?? [])

  const seeded = await runTransaction(db, async tx => {
    const guardRef = doc(db, 'meta', 'seeded')
    const guard = await tx.get(guardRef)
    if (guard.exists()) return false
    for (const [area, data] of Object.entries(docs)) {
      tx.set(doc(db, 'safe_content', area), data)
    }
    ;[...tasks, ...addTasks].forEach((t, i) => {
      tx.set(doc(collection(db, 'tasks')), { ...t, ts: Date.now() + i })
    })
    for (const d of [...decisions, ...addDecisions]) {
      tx.set(doc(db, 'decisions', d.key), { ...d, answeredAt: null })
    }
    tx.set(doc(db, 'meta', 'migrations'), { applied: ADDITIONS.map(a => a.id) })
    tx.set(guardRef, { at: serverTimestamp() })
    return true
  })
  if (!seeded) {
    await applyAdditions(ADDITIONS)
    await repairNestedAreaDocs()
  }
  return { seeded }
}

// One-time repair for docs the buggy first migration double-nested.
// Unwraps in place (data preserved), guarded by meta/migrations.
async function repairNestedAreaDocs() {
  const REPAIR_ID = '2026-08-30-unwrap-asset-items'
  await runTransaction(db, async tx => {
    const migRef = doc(db, 'meta', 'migrations')
    const migSnap = await tx.get(migRef)
    const applied = migSnap.exists() ? migSnap.data().applied ?? [] : []
    if (applied.includes(REPAIR_ID)) return
    const areas = ['art_assets', 'av_assets']
    const snaps = await Promise.all(areas.map(a => tx.get(doc(db, 'safe_content', a))))
    snaps.forEach((snap, i) => {
      if (!snap.exists()) return
      const raw = snap.data().items
      if (!Array.isArray(raw) && Array.isArray(raw?.items)) {
        tx.set(doc(db, 'safe_content', areas[i]), { items: raw.items })
      }
    })
    tx.set(migRef, { applied: [...applied, REPAIR_ID] })
  })
}

// An early migration bug briefly wrote {items: {items: [...]}} — normalize
// on every read so a malformed doc can never crash a render.
function asItems(raw) {
  if (Array.isArray(raw)) return raw
  if (Array.isArray(raw?.items)) return raw.items
  return []
}

export function subscribeArea(area, onData, onError) {
  return onSnapshot(doc(db, 'safe_content', area),
    snap => onData(snap.exists() ? asItems(snap.data().items) : []),
    onError)
}

// Replay a list of {itemId, before, after} changes onto a remote items array.
function applyChangesTo(remote, changes) {
  let items = [...remote]
  for (const c of changes) {
    const idx = items.findIndex(i => i.id === c.itemId)
    if (c.after === null) continue // never hard-delete
    if (idx >= 0) items[idx] = c.after
    else items.push(c.after)
  }
  return items
}

// Who is making this change, in plain words. Jon by UID; the Steward by the
// SHA-256 of her verified email (the same test the security rules use), so her
// address is never written anywhere. Anyone else shows as their email.
const JON_UID = 'JYSmPSQfdMen0leIDYmqUa32Prt1'
const STEWARD_HASH = '2ea18fbeb53147b23ca3afa1e1291934aeea1b6e5c6c2c7b40b6301386ffe2b8'
let whoCache = null
export async function whoAmI() {
  const u = auth.currentUser
  if (!u) return { uid: null, name: 'unknown' }
  if (whoCache?.uid === u.uid) return whoCache
  let name = u.email ?? 'unknown'
  if (u.uid === JON_UID) name = 'Jon'
  else if (u.email && crypto?.subtle) {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(u.email.toLowerCase()))
    const hex = [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('')
    if (hex === STEWARD_HASH) name = 'Jenna'
  }
  whoCache = { uid: u.uid, name }
  return whoCache
}

// Transactional save: merges the pending changes onto the CURRENT remote
// items (so an edit from the other device is never erased by a whole-array
// overwrite) and appends history entries in the same atomic commit.
// Nothing is ever hard-deleted — deletes are soft flags on items.
export async function saveArea(area, _items, changes) {
  const ref = doc(db, 'safe_content', area)
  const by = await whoAmI()
  await runTransaction(db, async tx => {
    const snap = await tx.get(ref)
    const remote = snap.exists() ? asItems(snap.data().items) : []
    tx.set(ref, { items: applyChangesTo(remote, changes) })
    for (const c of changes) {
      tx.set(doc(collection(db, 'workshop_history')), {
        area, itemId: c.itemId,
        before: c.before ?? null,
        after: c.after ?? null,
        by,
        ts: serverTimestamp(),
      })
    }
  })
}

async function logHistory(area, itemId, before, after) {
  const by = await whoAmI()
  return addDoc(collection(db, 'workshop_history'), {
    area, itemId,
    before: before ?? null,
    after: after ?? null,
    by,
    ts: serverTimestamp(),
  })
}

// ---- Who has been working: the last 300 changes, newest first ----
export function subscribeHistory(onData, onError) {
  return onSnapshot(query(collection(db, 'workshop_history'), orderBy('ts', 'desc'), limit(300)),
    snap => onData(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
    onError)
}

// ---- Task board ----
export function subscribeTasks(onData, onError) {
  return onSnapshot(query(collection(db, 'tasks'), orderBy('order')),
    snap => onData(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
    onError)
}

export async function updateTask(id, patch, before) {
  await updateDoc(doc(db, 'tasks', id), patch)
  await logHistory('tasks', id, before, { ...before, ...patch })
}

export async function addTask(task) {
  const ref = await addDoc(collection(db, 'tasks'), { ...task, ts: Date.now() })
  await logHistory('tasks', ref.id, null, task)
  return ref.id
}

// ---- Decisions ----
export function subscribeDecisions(onData, onError) {
  return onSnapshot(collection(db, 'decisions'),
    snap => onData(snap.docs.map(d => ({ key: d.id, ...d.data() }))),
    onError)
}

export async function answerDecision(key, answer, before) {
  await updateDoc(doc(db, 'decisions', key), { answer, answeredAt: serverTimestamp() })
  await logHistory('decisions', key, before, { ...before, answer })
}

// ---- Sealed coverage (aggregates only — the seal stays sealed) ----
export function subscribeLatestValidation(onData, onError) {
  return onSnapshot(query(collection(db, 'validation_reports'), orderBy('ts', 'desc'), limit(1)),
    snap => onData(snap.empty ? null : snap.docs[0].data()),
    onError)
}

// ---- File uploads (stationery references, the Assets page) ----
// Every upload gets a fresh path, so replacing a file never overwrites the
// old one — it stays in storage and in workshop_history.
export async function uploadFile(folder, itemId, file) {
  const safeName = file.name.replace(/[^\w.-]+/g, '_')
  const path = `${folder}/${itemId}/${Date.now()}-${safeName}`
  const snap = await uploadBytes(storageRef(storage, path), file, { contentType: file.type })
  const url = await getDownloadURL(snap.ref)
  return { path, url, name: file.name, type: file.type, size: file.size }
}

export function uploadReference(itemId, file) {
  return uploadFile('stationery', itemId, file)
}

// Additive-only migrations, guarded by meta/migrations. Each entry runs once
// in a transaction (reads before writes), only ADDS, never rewrites.
export async function applyAdditions(additions) {
  const migRef = doc(db, 'meta', 'migrations')
  for (const add of additions) {
    await runTransaction(db, async tx => {
      const migSnap = await tx.get(migRef)
      const applied = migSnap.exists() ? migSnap.data().applied ?? [] : []
      if (applied.includes(add.id)) return
      const areaEntries = Object.entries(add.areaDocs ?? {})
      const areaSnaps = await Promise.all(
        areaEntries.map(([area]) => tx.get(doc(db, 'safe_content', area))))
      const decSnaps = await Promise.all(
        (add.decisions ?? []).map(d => tx.get(doc(db, 'decisions', d.key))))
      areaEntries.forEach(([area, items], i) => {
        if (!areaSnaps[i].exists()) tx.set(doc(db, 'safe_content', area), items)
      })
      for (const t of add.tasks ?? []) {
        tx.set(doc(collection(db, 'tasks')), { ...t, ts: Date.now() })
      }
      ;(add.decisions ?? []).forEach((d, i) => {
        if (!decSnaps[i].exists()) tx.set(doc(db, 'decisions', d.key), { ...d, answeredAt: null })
      })
      tx.set(migRef, { applied: [...applied, add.id] })
    })
  }
}
// ---- Game night settings (the two hosts' names) ----
export function subscribeGame(onData, onError) {
  return onSnapshot(doc(db, 'meta', 'game'), snap => onData(snap.exists() ? snap.data() : {}), onError)
}

export async function saveGame(patch, before) {
  await setDoc(doc(db, 'meta', 'game'), patch, { merge: true })
  await logHistory('game', 'settings', before, { ...before, ...patch })
}
