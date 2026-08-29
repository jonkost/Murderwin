import { useEffect, useRef, useState } from 'react'
import { subscribeTasks, updateTask, addTask } from '../lib/store'

const COLS = [
  { key: 'todo', label: 'To do' },
  { key: 'doing', label: 'Doing' },
  { key: 'done', label: 'Done' },
]

function Card({ task, onError, onSaved }) {
  const [title, setTitle] = useState(task.title)
  const [detail, setDetail] = useState(task.detail ?? '')
  const [open, setOpen] = useState(!task.title)
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

  const moveTo = (statusKey) => {
    updateTask(task.id, { status: statusKey }, task).then(onSaved).catch(onError)
  }

  const idx = COLS.findIndex(c => c.key === task.status)
  const prev = COLS[idx - 1]
  const next = COLS[idx + 1]

  return (
    <div className="card">
      <input value={title} placeholder="task…"
        onChange={e => { setTitle(e.target.value); save({ title: e.target.value }) }} />
      <button className="card-toggle" onClick={() => setOpen(o => !o)}>
        {open ? 'hide detail' : 'detail'}
      </button>
      {open && (
        <textarea rows={3} value={detail} placeholder="detail…"
          onChange={e => { setDetail(e.target.value); save({ detail: e.target.value }) }} />
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
          SAVE FAILED — your latest board change is NOT saved. It will retry on
          your next edit.
        </div>
      )}
      {loadErr && (
        <div className="banner error" role="alert">
          Couldn’t load the board — check your connection.
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
