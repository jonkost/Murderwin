import { useEffect, useRef, useState } from 'react'
import { subscribeTasks, updateTask, addTask } from '../lib/store'
import { momentName, momentOptions, byLabel, taskBy } from '../lib/timeline'

const COLS = [
  { key: 'todo', label: 'To do' },
  { key: 'doing', label: 'Doing' },
  { key: 'done', label: 'Done' },
]

// A task's title and detail as the person types them, saved after a short
// pause. Shared by the board's cards and the lines on the Timeline page.
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

function Card({ task, onError, onSaved }) {
  const { title, detail, setTitle, setDetail } = useTaskDraft(task, onError, onSaved)
  const [open, setOpen] = useState(!task.title)
  const moment = task.moment ? momentName(task.moment) : null

  const moveTo = (statusKey) => {
    updateTask(task.id, { status: statusKey }, task).then(onSaved).catch(onError)
  }
  const patch = (p) => updateTask(task.id, p, task).then(onSaved).catch(onError)

  const idx = COLS.findIndex(c => c.key === task.status)
  const prev = COLS[idx - 1]
  const next = COLS[idx + 1]

  return (
    <div className="card">
      <input value={title} placeholder="task…"
        onChange={e => setTitle(e.target.value)} />
      {moment && <span className="list-moment">{moment}</span>}
      {byLabel(task) && <span className="tl-by">{byLabel(task)}</span>}
      <button className="card-toggle" onClick={() => setOpen(o => !o)}>
        {open ? 'hide detail' : 'detail'}
      </button>
      {open && (
        <>
          <textarea rows={3} value={detail} placeholder="detail…"
            onChange={e => setDetail(e.target.value)} />
          {/* A card with a moment shows on the Timeline under it (23 Oct 2026). */}
          <label className="tl-when">File it under
            <select value={task.moment ?? ''} onChange={e => patch({ moment: e.target.value || null })}>
              <option value="">Not filed yet</option>
              {momentOptions().map(o => <option key={o.key} value={o.key}>{o.name}</option>)}
            </select>
          </label>
          <label className="tl-when">Done by (optional)
            <input type="date" value={taskBy(task) ?? ''} onChange={e => patch({ by: e.target.value || null })} />
          </label>
        </>
      )}
      <div className="card-foot">
        {prev && <button onClick={() => moveTo(prev.key)}>‹ {prev.label}</button>}
        {next && <button onClick={() => moveTo(next.key)}>{next.label} ›</button>}
        <span className="spacer" />
        <button className="ghost" title="Delete (soft)"
          onClick={() => updateTask(task.id, { deleted: true }, task).then(onSaved).catch(onError)}>✕</button>
      </div>
    </div>
  )
}

export default function TaskBoard() {
  const [tasks, setTasks] = useState([])
  const [loadErr, setLoadErr] = useState(false)
  const [saveErr, setSaveErr] = useState(false)
  const onError = () => setSaveErr(true)
  const onSaved = () => setSaveErr(false)

  useEffect(() => subscribeTasks(ts => { setTasks(ts); setLoadErr(false) },
    () => setLoadErr(true)), [])

  const add = (status) => {
    const maxOrder = Math.max(0, ...tasks.map(t => t.order ?? 0))
    addTask({ title: '', detail: '', status, order: maxOrder + 1 }).then(onSaved).catch(onError)
  }

  return (
    <section className="panel">
      <h2>Task board</h2>
      {saveErr && (
        <div className="banner error" role="alert">
          SAVE FAILED. Your latest board change is not saved. It will retry on
          your next edit.
        </div>
      )}
      {loadErr && (
        <div className="banner error" role="alert">
          The board did not load. Check your signal.
        </div>
      )}
      <div className="board">
        {COLS.map(col => (
          <div className="col" key={col.key}>
            <h3>{col.label}</h3>
            {tasks
              .filter(t => !t.deleted && t.status === col.key)
              .map(t => <Card key={t.id} task={t} onError={onError} onSaved={onSaved} />)}
            <button className="ghost add" onClick={() => add(col.key)}>+ Add</button>
          </div>
        ))}
      </div>
    </section>
  )
}
