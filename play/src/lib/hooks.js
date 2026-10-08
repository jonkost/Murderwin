import { useCallback, useEffect, useRef, useState } from 'react'
import { doc, collection, query, where, onSnapshot, setDoc, getDocFromServer, serverTimestamp } from 'firebase/firestore'
import { auth, db, signInAnonymously, onAuthStateChanged } from '../firebase'

// Anonymous session: the phone signs itself in the first time it opens and
// keeps that identity (the session doc hangs off it) until the browser data
// is cleared. No account, no password, no prompt.
export function useAuthUid() {
  const [state, setState] = useState({ uid: null, error: null })
  useEffect(() => onAuthStateChanged(auth, user => {
    if (user) setState({ uid: user.uid, error: null })
    else signInAnonymously(auth).catch(error => setState({ uid: null, error }))
  }), [])
  return state
}

// Live view of one document. `path` null = nothing to watch yet.
export function useDoc(path) {
  const [state, setState] = useState({ data: null, loaded: false, error: null, fromCache: false })
  useEffect(() => {
    if (!path) { setState({ data: null, loaded: false, error: null, fromCache: false }); return }
    setState(s => ({ ...s, loaded: false }))
    const ref = doc(db, ...path.split('/'))
    return onSnapshot(ref, { includeMetadataChanges: true },
      snap => setState({ data: snap.exists() ? snap.data() : null, loaded: true, error: null, fromCache: snap.metadata.fromCache }),
      error => setState(s => ({ ...s, loaded: true, error })))
  }, [path])
  return state
}

// Server clock. Every phone writes a heartbeat with a server timestamp and
// reads back what the server stamped; the difference is this phone's skew.
// All holds and timers are measured against serverNow(), never Date.now().
export function useServerClock(uid, nightId, guestKey) {
  const skew = useRef(0)
  useEffect(() => {
    if (!uid) return
    const ref = doc(db, 'presence', uid)
    let stopped = false
    const beat = async () => {
      const t0 = Date.now()
      try {
        await setDoc(ref, { nightId: nightId ?? null, guestKey: guestKey ?? null, at: serverTimestamp() })
        const snap = await getDocFromServer(ref)
        const at = snap.data()?.at?.toMillis?.()
        if (at && !stopped) skew.current = at - (t0 + Date.now()) / 2
      } catch {
        // offline: keep the last skew; the heartbeat retries on the next tick
      }
    }
    beat()
    const id = setInterval(beat, 60_000)
    return () => { stopped = true; clearInterval(id) }
  }, [uid, nightId, guestKey])
  return useCallback(() => Date.now() + skew.current, [])
}

// Re-render on an interval (for holds that are measured against the server clock).
export function useTick(ms, active = true) {
  const [, set] = useState(0)
  useEffect(() => {
    if (!active) return
    const id = setInterval(() => set(n => n + 1), ms)
    return () => clearInterval(id)
  }, [ms, active])
}

export function useOnline() {
  const [online, setOnline] = useState(typeof navigator === 'undefined' ? true : navigator.onLine)
  useEffect(() => {
    const up = () => setOnline(true)
    const down = () => setOnline(false)
    window.addEventListener('online', up)
    window.addEventListener('offline', down)
    return () => { window.removeEventListener('online', up); window.removeEventListener('offline', down) }
  }, [])
  return online
}

// The player's own scribbles (crossed-off motives, prompts already hidden).
export function writeNotes(uid, patch) {
  return setDoc(doc(db, 'notes', uid), patch, { merge: true })
}

// Who has been heard from lately, by guest key → last heartbeat (ms). Only a
// host phone (or the admin) may read presence; anyone else gets an empty map.
export function usePresence(nightId) {
  const [seen, setSeen] = useState({})
  useEffect(() => {
    if (!nightId) { setSeen({}); return }
    const q = query(collection(db, 'presence'), where('nightId', '==', nightId))
    return onSnapshot(q, snap => {
      const m = {}
      snap.forEach(d => {
        const p = d.data()
        if (p.guestKey) m[p.guestKey] = Math.max(m[p.guestKey] ?? 0, p.at?.toMillis?.() ?? 0)
      })
      setSeen(m)
    }, () => setSeen({}))
  }, [nightId])
  return seen
}
