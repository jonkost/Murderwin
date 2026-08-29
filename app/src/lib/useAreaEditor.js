import { useEffect, useRef, useState, useCallback } from 'react'
import { subscribeArea, saveArea } from './store'

const DEBOUNCE_MS = 400

// Shared autosave engine for area editors.
// status: 'saved' | 'saving' | 'error' | 'loaderror'
export function useAreaEditor(area) {
  const [items, setItems] = useState(null)
  const [status, setStatus] = useState('saved')
  const itemsRef = useRef(null)
  const pendingChanges = useRef([])
  const timer = useRef(null)
  const dirty = useRef(false)

  useEffect(() => subscribeArea(area, remote => {
    if (!dirty.current) {
      itemsRef.current = remote
      setItems(remote)
    }
  }, () => {
    // surface load failures even before first data (never eternal 'Loading…')
    if (itemsRef.current === null) { itemsRef.current = []; setItems([]) }
    setStatus('loaderror')
  }), [area])

  const flush = useCallback(() => {
    clearTimeout(timer.current)
    const changes = pendingChanges.current
    if (!changes.length) return
    pendingChanges.current = []
    setStatus('saving')
    saveArea(area, itemsRef.current, changes)
      .then(() => {
        if (!pendingChanges.current.length) {
          dirty.current = false
          setStatus('saved')
        }
      })
      .catch(() => {
        pendingChanges.current = [...changes, ...pendingChanges.current]
        setStatus('error')
      })
  }, [area])

  // Edits must survive the tab dying: flush when the page hides or unmounts.
  // (With the persistent Firestore cache the queued write survives eviction.)
  useEffect(() => {
    const onHide = () => { if (pendingChanges.current.length) flush() }
    window.addEventListener('pagehide', onHide)
    document.addEventListener('visibilitychange', onHide)
    return () => {
      window.removeEventListener('pagehide', onHide)
      document.removeEventListener('visibilitychange', onHide)
      onHide()
    }
  }, [flush])

  // changeOrChanges: one {itemId, before, after} or an array of them
  const applyChange = useCallback((next, changeOrChanges, immediate = false) => {
    itemsRef.current = next
    setItems(next)
    dirty.current = true
    const changes = Array.isArray(changeOrChanges) ? changeOrChanges : [changeOrChanges]
    pendingChanges.current.push(...changes)
    setStatus('saving')
    clearTimeout(timer.current)
    if (immediate) flush()
    else timer.current = setTimeout(flush, DEBOUNCE_MS)
  }, [flush])

  const patch = useCallback((id, fields, immediate = false) => {
    const before = itemsRef.current.find(i => i.id === id)
    const next = itemsRef.current.map(i => (i.id === id ? { ...i, ...fields } : i))
    applyChange(next, { itemId: id, before, after: { ...before, ...fields } }, immediate)
  }, [applyChange])

  return { items, itemsRef, status, flush, applyChange, patch }
}

// iOS Safari renders no resize handle on textareas — grow them as you type.
export function autoGrow(e) {
  e.target.style.height = 'auto'
  e.target.style.height = `${e.target.scrollHeight}px`
}
