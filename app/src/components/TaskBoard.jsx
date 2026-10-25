import { useEffect, useRef, useState } from 'react'
import { updateTask } from '../lib/store'

// The To do / Doing / Done board that lived in Home's fold came off on
// 24 Oct 2026: the Timeline is the one board for every job (CLAUDE.md, HOW
// WE WORK). What is left here is the typing the Timeline's lines share.

// A task's title and detail as the person types them, saved after a short
// pause. Used by the lines on the Timeline page.
export function useTaskDraft(task, onError, onSaved) {
  const [title, setTitle] = useState(task.title)
  const [detail, setDetail] = useState(task.detail ?? '')
  const pending = useRef(null) // merged patch awaiting flush
  const timer = useRef(null)

  // adopt remote edits only while nothing local is pending
  useEffect(() => {
    if (!timer.current && !pending.current) {
      setTitle(task.title)
      setDetail(task.detail ?? '')
    }
  }, [task.title, task.detail])

  const flush = () => {
    clearTimeout(timer.current)
    timer.current = null
    const patch = pending.current
    if (!patch) return
    pending.current = null
    updateTask(task.id, patch, task)
      .then(onSaved)
      .catch(() => {
        // keep the patch so Retry (or the next keystroke) can resend it
        pending.current = { ...patch, ...pending.current }
        onError()
      })
  }

  // patches MERGE — a title keystroke must never drop a queued detail edit
  const save = (patch) => {
    pending.current = { ...pending.current, ...patch }
    clearTimeout(timer.current)
    timer.current = setTimeout(flush, 400)
  }

  useEffect(() => {
    const onHide = () => { if (pending.current) flush() }
    window.addEventListener('pagehide', onHide)
    document.addEventListener('visibilitychange', onHide)
    return () => {
      window.removeEventListener('pagehide', onHide)
      document.removeEventListener('visibilitychange', onHide)
      onHide()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return {
    title, detail,
    setTitle: (v) => { setTitle(v); save({ title: v }) },
    setDetail: (v) => { setDetail(v); save({ detail: v }) },
  }
}
