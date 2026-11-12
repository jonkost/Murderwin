import { useCallback, useEffect, useRef, useState } from 'react'
import { doc, collection, query, where, onSnapshot, setDoc, getDocFromServer, serverTimestamp, terminate, clearIndexedDbPersistence } from 'firebase/firestore'
import { auth, db, signInAnonymously, onAuthStateChanged } from '../firebase'
import { notesPatch } from './night'
import { isStale, secondsSinceHeard, watchWake, skewFrom } from './clock'

export { isStale, secondsSinceHeard, STALE_MS } from './clock'

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
// `fromCache` says whether the latest paint came from the local cache;
// `heardAt` is when the server last confirmed it (ms). Together they feed
// the offline strip: cache-only for twenty seconds means the house is out
// of reach, whatever navigator.onLine says.
export function useDoc(path) {
  const [state, setState] = useState({ data: null, loaded: false, error: null, fromCache: false, heardAt: null })
  useEffect(() => {
    if (!path) { setState({ data: null, loaded: false, error: null, fromCache: false, heardAt: null }); return }
    setState(s => ({ ...s, loaded: false }))
    const ref = doc(db, ...path.split('/'))
    const since = Date.now()
    return onSnapshot(ref, { includeMetadataChanges: true },
      snap => setState(s => ({
        data: snap.exists() ? snap.data() : null, loaded: true, error: null, fromCache: snap.metadata.fromCache,
        heardAt: snap.metadata.fromCache ? (s.heardAt ?? since) : Date.now(),
      })),
      error => setState(s => ({ ...s, loaded: true, error })))
  }, [path])
  return state
}

// Is this live view stale (cache-only for twenty seconds or more)? Re-checks
// with the caller's own tick; pass the view from useDoc.
export function useStale(view, now = Date.now()) {
  return isStale(view, now)
}

// Server clock. Every phone writes a heartbeat with a server timestamp and
// reads back what the server stamped; the difference is this phone's skew.
// All holds and timers are measured against serverNow(), never Date.now().
// The skew is re-measured once a minute AND the moment the phone wakes:
// coming back to the tab, regaining the network, or the page being shown
// again after sleep (17 Oct 2026). A phone that slept through a beat no
// longer runs on a stale skew until the next minute.
// `extra` (11 Nov 2026): a few more fields for the row, a room screen's `sound` (is this
// page allowed to make sound yet?). If the house's rules refuse them (rules older than the
// page), the page says who it is without them rather than fall silent: the heartbeat is
// what lets a room screen act at all.
export function useServerClock(uid, nightId, guestKey, extra = null) {
  const skew = useRef(0)
  const plain = useRef(false)
  const extraKey = extra ? JSON.stringify(extra) : ''
  useEffect(() => {
    if (!uid) return
    const ref = doc(db, 'presence', uid)
    let stopped = false
    let last = 0
    const beat = async () => {
      const t0 = Date.now()
      if (t0 - last < 2000) return // a burst of wake events is one re-measure
      last = t0
      const row = { nightId: nightId ?? null, guestKey: guestKey ?? null, at: serverTimestamp() }
      try {
        try {
          await setDoc(ref, extra && !plain.current ? { ...row, ...extra } : row)
        } catch (e) {
          if (!extra || plain.current || e?.code !== 'permission-denied') throw e
          plain.current = true
          await setDoc(ref, row)
        }
        const snap = await getDocFromServer(ref)
        const at = snap.data()?.at?.toMillis?.()
        if (at && !stopped) skew.current = skewFrom(t0, Date.now(), at)
      } catch {
        // offline: keep the last skew; the heartbeat retries on the next tick
      }
    }
    beat()
    const id = setInterval(beat, 60_000)
    const unwatch = typeof window === 'undefined' ? () => {} : watchWake(window, document, () => beat())
    return () => { stopped = true; clearInterval(id); unwatch() }
  }, [uid, nightId, guestKey, extraKey])
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

// The player's own scribbles (crossed-off motives, prompts already hidden,
// and the Notes box's free text), kept per night: notes/{uid}.byNight[nightId]. App tells this module which
// night is live; every write lands under that night and nowhere else, so a
// phone that rehearsed starts the real night with nothing hidden.
let notesNight = null
export function setNotesNight(nightId) { notesNight = nightId ?? null }
export function writeNotes(uid, patch, nightId = notesNight) {
  const scoped = notesPatch(nightId, patch)
  if (!uid || !scoped) return Promise.resolve()
  return setDoc(doc(db, 'notes', uid), scoped, { merge: true })
}

// A borrowed phone (the host pressed "hand on"): forget everything this
// browser holds about the previous owner, then come back as a fresh phone at
// the doors. Firestore must be stopped before its cache can be cleared.
// Firebase Auth keeps its own store, so the phone comes back with the SAME
// anonymous uid; the previous owner's notes for this night are dropped by
// the server in the handover itself (functions/lib/night.js), not here, so
// a phone that is offline when it resets still comes back clean.
export async function handoverReset(generation) {
  try { localStorage.clear(); sessionStorage.clear() } catch {}
  try { localStorage.setItem('handover-seen', String(generation)) } catch {}
  try { await terminate(db) } catch {}
  try { await clearIndexedDbPersistence(db) } catch {}
  window.location.reload()
}
export function lastHandoverSeen() {
  try { return Number(localStorage.getItem('handover-seen')) || 0 } catch { return 0 }
}

// Who has been heard from lately, by guest key → last heartbeat (ms). Only a
// host phone (or the admin) may read presence; anyone else gets an empty map.
// `usePresenceRows` also says, for each room screen, whether its newest row has its sound
// on (11 Nov 2026): { seen: key -> ms, sound: key -> true or false }.
export function usePresenceRows(nightId) {
  const [rows, setRows] = useState({ seen: {}, sound: {} })
  useEffect(() => {
    if (!nightId) { setRows({ seen: {}, sound: {} }); return }
    const q = query(collection(db, 'presence'), where('nightId', '==', nightId))
    return onSnapshot(q, snap => {
      const seen = {}
      const sound = {}
      snap.forEach(d => {
        const p = d.data()
        if (!p.guestKey) return
        const at = p.at?.toMillis?.() ?? 0
        if (at >= (seen[p.guestKey] ?? 0)) { seen[p.guestKey] = at; sound[p.guestKey] = p.sound === true }
      })
      setRows({ seen, sound })
    }, () => setRows({ seen: {}, sound: {} }))
  }, [nightId])
  return rows
}
export function usePresence(nightId) {
  return usePresenceRows(nightId).seen
}
