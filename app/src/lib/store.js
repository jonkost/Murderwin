import {
  doc, getDoc, setDoc, updateDoc, onSnapshot,
  collection, addDoc, serverTimestamp, writeBatch,
} from 'firebase/firestore'
import { db } from '../firebase'
import { seedDocs, seedTasks, ADDITIONS } from './content'

// One-time seed import, guarded by meta/seeded. Never auto-seeds again.
// A fresh seed already contains everything, so it also stamps every
// ADDITIONS id as applied; older databases get them via applyAdditions.
export async function ensureSeeded() {
  const guardRef = doc(db, 'meta', 'seeded')
  const guard = await getDoc(guardRef)
  if (guard.exists()) {
    await applyAdditions(ADDITIONS)
    return { seeded: false }
  }

  const batch = writeBatch(db)
  const docs = seedDocs()
  for (const [area, data] of Object.entries(docs)) {
    batch.set(doc(db, 'safe_content', area), data)
  }
  const { tasks, decisions } = (await seedTasks()).default
  const addTasks = ADDITIONS.flatMap(a => a.tasks ?? [])
  const addDecisions = ADDITIONS.flatMap(a => a.decisions ?? [])
  ;[...tasks, ...addTasks].forEach((t, i) => {
    batch.set(doc(collection(db, 'tasks')), { ...t, ts: Date.now() + i })
  })
  for (const d of [...decisions, ...addDecisions]) {
    batch.set(doc(db, 'decisions', d.key), { ...d, answeredAt: null })
  }
  batch.set(doc(db, 'meta', 'migrations'), { applied: ADDITIONS.map(a => a.id) })
  batch.set(guardRef, { at: serverTimestamp() })
  await batch.commit()
  return { seeded: true }
}

export function subscribeArea(area, onData, onError) {
  return onSnapshot(doc(db, 'safe_content', area),
    snap => onData(snap.exists() ? snap.data().items ?? [] : []),
    onError)
}

// Write the full items array; append one history entry per changed item.
// Nothing is ever hard-deleted — deletes are soft flags on items.
export async function saveArea(area, items, changes) {
  const ref = doc(db, 'safe_content', area)
  try {
    await updateDoc(ref, { items })
  } catch (e) {
    if (e.code !== 'not-found') throw e
    // areas added after the original seed import start life on first save
    await setDoc(ref, { items })
  }
  await Promise.all(changes.map(({ itemId, before, after }) =>
    addDoc(collection(db, 'workshop_history'), {
      area, itemId,
      before: before ?? null,
      after: after ?? null,
      ts: serverTimestamp(),
    })))
}

// Additive-only migrations, guarded by meta/migrations. Each entry runs once,
// only ADDS documents/items, and never rewrites anything that exists.
export async function applyAdditions(additions) {
  const migRef = doc(db, 'meta', 'migrations')
  const snap = await getDoc(migRef)
  const applied = snap.exists() ? snap.data().applied ?? [] : []
  for (const add of additions) {
    if (applied.includes(add.id)) continue
    const batch = writeBatch(db)
    for (const [area, items] of Object.entries(add.areaDocs ?? {})) {
      const areaSnap = await getDoc(doc(db, 'safe_content', area))
      if (!areaSnap.exists()) batch.set(doc(db, 'safe_content', area), { items })
    }
    for (const t of add.tasks ?? []) {
      batch.set(doc(collection(db, 'tasks')), { ...t, ts: Date.now() })
    }
    for (const d of add.decisions ?? []) {
      const dSnap = await getDoc(doc(db, 'decisions', d.key))
      if (!dSnap.exists()) batch.set(doc(db, 'decisions', d.key), { ...d, answeredAt: null })
    }
    applied.push(add.id)
    batch.set(migRef, { applied })
    await batch.commit()
  }
}
