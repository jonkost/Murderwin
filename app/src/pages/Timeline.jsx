import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { subscribeArea, subscribeLatestValidation, subscribeTasks, subscribeDecisions, updateTask, addTask, whoAmI } from '../lib/store'
import { TIMELINE, TIMELINE_LISTS, needStatus, timelineItems } from '../lib/timeline'
import { useTaskDraft } from '../components/TaskBoard'
import { Decision } from '../components/DecisionsPanel'

// The night, in order. One straight line from the freeze to the morning
// after: under every moment, the lists it needs (live counts), the secrets
// it needs (whether they exist, never their words), the decisions still open
// and the tasks, each with a tick box. A task added here is filed under that
// moment on the task board too.

const PREF = 'workshop.timeline.onlyLeft'
function readPref() { try { return localStorage.getItem(PREF) === '1' } catch { return false } }
function writePref(v) { try { localStorage.setItem(PREF, v ? '1' : '0') } catch { /* private window: fine */ } }

function NeedLine({ need, status }) {
  return (
    <li className={status.done ? 'tl-item done' : 'tl-item'}>
      <span className="tl-mark" aria-hidden="true">{status.done ? '✓' : '○'}</span>
      <span className="tl-body">
        {need.also && <span className="hint">Used again: </span>}
        {status.to ? <Link to={status.to}>{status.label}</Link> : <span>{need.secret ? '🔒 ' : ''}{status.label}</span>}
        <span className="hint"> · {status.text}</span>
      </span>
    </li>
  )
}

function TaskLine({ task, onError, onSaved, onEnter, focus }) {
  const { title, detail, setTitle, setDetail } = useTaskDraft(task, onError, onSaved)
  const [open, setOpen] = useState(false)
  const input = useRef(null)
  // the row may mount before it is named the one to focus, so focus on change
  useEffect(() => { if (focus) input.current?.focus() }, [focus])
  const done = task.status === 'done'
  const toggle = () => updateTask(task.id, { status: done ? 'todo' : 'done' }, task).then(onSaved).catch(onError)
  return (
    <li className={done ? 'tl-item tl-task done' : 'tl-item tl-task'}>
      <input type="checkbox" className="tl-check" checked={done} onChange={toggle} aria-label={`Done: ${title || 'new task'}`} />
      <span className="tl-body">
        <span className="tl-head">
          <input ref={input} className="tl-title" value={title} placeholder="What needs doing"
            onChange={e => setTitle(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); onEnter() } }} />
          {task.who && <span className="tl-who">{task.who}</span>}
          <button className="card-toggle" onClick={() => setOpen(o => !o)}>{open ? 'close' : detail ? 'edit detail' : 'add detail'}</button>
          <button className="card-toggle" title="Remove (kept in the history)" aria-label={`Remove: ${title || 'new task'}`}
            onClick={() => updateTask(task.id, { deleted: true }, task).then(onSaved).catch(onError)}>✕</button>
        </span>
        {open
          ? <textarea rows={3} value={detail} placeholder="The details" onChange={e => setDetail(e.target.value)} />
          : detail && <span className="hint tl-detail">{detail}</span>}
      </span>
    </li>
  )
}

export default function Timeline() {
  const [areas, setAreas] = useState({})
  const [validation, setValidation] = useState(null)
  const [tasks, setTasks] = useState(null)
  const [decisions, setDecisions] = useState([])
  const [loadErr, setLoadErr] = useState(false)
  const [saveErr, setSaveErr] = useState(false)
  const [me, setMe] = useState(null)
  const [onlyLeft, setOnlyLeft] = useState(readPref)
  const [focusId, setFocusId] = useState(null)
  const onError = () => setSaveErr(true)
  const onSaved = () => setSaveErr(false)

  useEffect(() => {
    const fail = () => setLoadErr(true)
    const unsubs = TIMELINE_LISTS.map(area => subscribeArea(area, items => setAreas(a => ({ ...a, [area]: items })), fail))
    unsubs.push(subscribeLatestValidation(setValidation, () => {}))
    unsubs.push(subscribeTasks(ts => { setTasks(ts); setLoadErr(false) }, fail))
    unsubs.push(subscribeDecisions(setDecisions, fail))
    return () => unsubs.forEach(u => u())
  }, [])
  useEffect(() => { whoAmI().then(setMe) }, [])
  const canAnswer = me?.name === 'Jon' || me?.name === 'Preview'

  const loaded = tasks !== null && TIMELINE_LISTS.every(a => a in areas)
  const data = { areas, validation, tasks: tasks ?? [], decisions }
  const items = useMemo(() => timelineItems(data), [areas, validation, tasks, decisions]) // eslint-disable-line react-hooks/exhaustive-deps
  const ready = items.filter(i => i.status.done).length
  const first = items.find(i => !i.status.done) ?? null

  const toggleLeft = () => setOnlyLeft(v => { writePref(!v); return !v })

  const addHere = (moment) => {
    const maxOrder = Math.max(0, ...(tasks ?? []).map(t => t.order ?? 0))
    addTask({ title: '', detail: '', status: 'todo', moment, order: maxOrder + 1 })
      .then(id => { setFocusId(id); onSaved() })
      .catch(onError)
  }

  const goTo = (rowKey) => document.getElementById(`moment-${rowKey}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })

  const firstLabel = (it) => {
    if (!it) return ''
    if (it.kind === 'need') return it.status.label
    if (it.kind === 'task') return it.task.title || 'a task with no name yet'
    return it.decision.question
  }
  const firstPlace = (it) => {
    const s = TIMELINE.find(x => x.key === it.section)
    const r = s?.rows.find(x => x.key === it.row)
    return r && r.name !== s.title ? `${s.title}, ${r.name}` : s?.title
  }

  return (
    <main className="dash">
      <section className="panel progress">
        <h2>The night, in order</h2>
        <p className="why">
          Everything the party needs, in the order the night plays it, from the freeze to the morning after.
          Lists count themselves as you write. Tick a task when it is done. The secrets only say whether they exist.
        </p>
        {saveErr && <div className="banner error" role="alert">SAVE FAILED. Your latest change to a task is not saved. It will retry on your next edit.</div>}
        {loadErr && <div className="banner error" role="alert">Part of the night did not load. Check your signal.</div>}
        <p className="why">{loaded ? `${ready} of ${items.length} things are ready.` : 'Counting…'}</p>
        <span className="bar big"><span style={{ width: `${items.length ? Math.round((ready / items.length) * 100) : 0}%` }} /></span>
        {loaded && first && (
          <p className="night-line">
            <b>First thing not ready:</b> {firstPlace(first)}. {firstLabel(first)}.{' '}
            <button className="ghost" onClick={() => goTo(first.row ?? TIMELINE.find(s => s.key === first.section)?.rows[0]?.key)}>Take me there</button>
          </p>
        )}
        {loaded && !first && <p className="night-line"><b>Everything on the night is ready.</b></p>}
        <p className="night-line">
          <button className="ghost" aria-pressed={onlyLeft} onClick={toggleLeft}>{onlyLeft ? 'Show everything' : 'Show only what is left'}</button>
        </p>
      </section>

      {TIMELINE.map(s => {
        const sectionItems = items.filter(i => i.section === s.key)
        const left = sectionItems.filter(i => !i.status.done).length
        if (onlyLeft && loaded && left === 0) return null
        return (
          <section className="panel tl-section" key={s.key} aria-labelledby={`tl-${s.key}`}>
            <p className="tl-clock">{s.clock}{s.length ? ` · ${s.length}` : ''}</p>
            <h2 id={`tl-${s.key}`}>{s.title}{s.plain && <span className="tl-plain"> · {s.plain}</span>}</h2>
            {loaded && <p className="hint">{left === 0 ? 'All ready.' : `${sectionItems.length - left} of ${sectionItems.length} ready.`}</p>}
            {s.needs.length > 0 && (
              <ul className="tl-list">
                {s.needs.map((need, i) => {
                  const status = needStatus(need, data)
                  return onlyLeft && status.done ? null : <NeedLine key={i} need={need} status={status} />
                })}
              </ul>
            )}
            {s.rows.map(r => {
              const rowItems = sectionItems.filter(i => i.row === r.key)
              const rowLeft = rowItems.filter(i => !i.status.done)
              const lone = s.rows.length === 1 && r.name === s.title
              if (onlyLeft && loaded && rowLeft.length === 0) return null
              const shown = (onlyLeft ? rowLeft : rowItems)
              const also = onlyLeft ? [] : r.needs.filter(n => n.also)
              return (
                <div className="tl-row" id={`moment-${r.key}`} key={r.key}>
                  {!lone && <h3>{r.name}</h3>}
                  <p className="why">{r.what}</p>
                  <ul className="tl-list">
                    {shown.map(it => {
                      if (it.kind === 'need') return <NeedLine key={`n-${it.need.list ?? it.need.secret}-${(it.need.labels ?? []).join()}`} need={it.need} status={it.status} />
                      if (it.kind === 'decision') {
                        const d = it.decision
                        return d.answer != null
                          ? <li key={`d-${d.key}`} className="tl-item done"><span className="tl-mark" aria-hidden="true">✓</span><span className="tl-body">{d.question} <span className="hint">· Decided: {d.answer}</span></span></li>
                          : <li key={`d-${d.key}`} className="tl-item tl-decision"><span className="tl-mark" aria-hidden="true">?</span><span className="tl-body"><Decision d={d} canAnswer={canAnswer} onError={onError} onSaved={onSaved} /></span></li>
                      }
                      return <TaskLine key={it.task.id} task={it.task} onError={onError} onSaved={onSaved} onEnter={() => addHere(r.key)} focus={it.task.id === focusId} />
                    })}
                    {also.map((need, i) => <NeedLine key={`a-${i}`} need={need} status={needStatus(need, data)} />)}
                  </ul>
                  <button className="ghost tl-add" onClick={() => addHere(r.key)}>+ Add a task here</button>
                </div>
              )
            })}
          </section>
        )
      })}
    </main>
  )
}
