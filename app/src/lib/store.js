import {
  doc, getDoc, setDoc, updateDoc, onSnapshot,
  collection, addDoc, serverTimestamp, writeBatch,
} from 'firebase/firestore'
import { db } from '../firebase'
import { seedDocs, seedTasks } from './content'

// One-time seed import, guarded by meta/seeded. Never auto-seeds again.
export async function ensureSeeded() {
  const guardRef = doc(db, 'meta', 'seeded')
  const guard = await getDoc(guardRef)
  if (guard.exists()) return { seeded: false }

  const batch = writeBatch(db)
  const docs = seedDocs()
  for (const [area, data] of Object.entries(docs)) {
    batch.set(doc(db, 'safe_content', area), data)
  }
  const { tasks, decisions } = (await seedTasks()).default
  tasks.forEach((t, i) => {
    batch.set(doc(collection(db, 'tasks')), { ...t, ts: Date.now() + i })
  })
  for (const d of decisions) {
    batch.set(doc(db, 'decisions', d.key), { ...d, answeredAt: null })
  }
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
  await updateDoc(doc(db, 'safe_content', area), { items })
  await Promise.all(changes.map(({ itemId, before, after }) =>
    addDoc(collection(db, 'workshop_history'), {
      area, itemId,
      before: before ?? null,
      after: after ?? null,
      ts: serverTimestamp(),
    })))
}

export async function createAreaDoc(area, items) {
  await setDoc(doc(db, 'safe_content', area), { items })
}
