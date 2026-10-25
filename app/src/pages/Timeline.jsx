import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { subscribeArea, subscribeTasks, subscribeDecisions, updateTask, addTask, fileDecision, whoAmI } from '../lib/store'
import { TIMELINE, TIMELINE_LISTS, WHEN, OWNERS, STANDIN_NOTE, needStatus, timelineItems, taskWhen, ownerOf, byLabel, taskBy, unfiled, momentOptions, nextCards, momentName } from '../lib/timeline'
import { useTaskDraft } from '../components/TaskBoard'
import { Decision } from '../components/DecisionsPanel'
import TechFold from '../components/TechFold'

// The night, in order. One straight line from now to the morning after:
// under every moment, the decisions still open and the tasks, each with a
// tick box, and (when everything shows) the lists it needs, with live
// counts. A task added here is filed under that moment.
//
// Two ways to look (24 Oct 2026, Jon: "set up for a guy who is designing a
// silly game for his friends and family and not a coder"). The page always
// opens on Jon, what is left: his open cards, the ones for him and Susan,
// and the questions only he answers. One switch, Show everything, shows the
// whole board, done or not, every owner and every list. Nothing is
// remembered between visits, so the page never opens filtered and empty. A
// link from Where we are (?who=) may open one other owner's open cards.
//
// A card may carry `tech`: the exact line Claude Code runs. It sits in a
// closed For Claude Code fold under the card, so Jon reads only the plain
// instruction.

const JON = ['Jon', 'Jon and Susan']
// Today on this computer's own calendar (not UTC), so a card due today is
// not shown late in the evening.
const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }

const WORKS_FOR_NOW = 'works for now without it'

function NeedLine({ need, status, standin }) {
  return (
    <li className={status.done ? 'tl-item done' : 'tl-item'}>
      <span className="tl-mark" aria-hidden="true">{status.done ? '✓' : '○'}</span>
      <span className="tl-body">
        {need.also && <span className="hint">Used again: </span>}
        <Link to={status.to}>{status.label}</Link>
        <span className="hint"> · {status.text}</span>
        {standin && !status.done && !need.also && <span className="tl-standin">{STANDIN_NOTE}</span>}
      </span>
    </li>
  )
}

function TaskLine({ task, onError, onSaved, onEnter, focus, standin, showWhen }) {
  const { title, detail, setTitle, setDetail } = useTaskDraft(task, onError, onSaved)
  const [open, setOpen] = useState(false)
  const input = useRef(null)
  // the row may mount before it is named the one to focus, so focus on change
  useEffect(() => { if (focus) input.current?.focus() }, [focus])
  const done = task.status === 'done'
  const when = taskWhen(task)
  const toggle = () => updateTask(task.id, { status: done ? 'todo' : 'done' }, task).then(onSaved).catch(onError)
  const setWhen = (v) => updateTask(task.id, { when: v }, task).then(onSaved).catch(onError)
  const setBy = (v) => updateTask(task.id, { by: v || null }, task).then(onSaved).catch(onError)
  return (
    <li className={done ? 'tl-item tl-task done' : 'tl-item tl-task'}>
      <input type="checkbox" className="tl-check" checked={done} onChange={toggle} aria-label={`Done: ${title || 'new task'}`} />
      <span className="tl-body">
        <span className="tl-head">
          <input ref={input} className="tl-title" value={title} placeholder="What needs doing"
            onChange={e => setTitle(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); onEnter() } }} />
          {task.who && <span className="tl-who">{task.who}</span>}
          {byLabel(task) && <span className={!done && taskBy(task) < today() ? 'tl-by late' : 'tl-by'}>{byLabel(task)}</span>}
          {showWhen && <span className="tl-who">{WHEN[when]}</span>}
          <button className="card-toggle" onClick={() => setOpen(o => !o)}>{open ? 'close' : detail ? 'edit detail' : 'add detail'}</button>
          <button className="card-toggle" title="Remove (kept in the history)" aria-label={`Remove: ${title || 'new task'}`}
            onClick={() => updateTask(task.id, { deleted: true }, task).then(onSaved).catch(onError)}>✕</button>
        </span>
        {standin && !done && <span className="tl-standin">{WORKS_FOR_NOW}</span>}
        {open
          ? (
            <>
              <textarea rows={3} value={detail} placeholder="The details" onChange={e => setDetail(e.target.value)} />
              <label className="tl-when">When
                <select value={when} onChange={e => setWhen(e.target.value)}>
                  <option value="now">{WHEN.now}</option>
                  <option value="later">{WHEN.later}</option>
                </select>
              </label>
              <label className="tl-when">Done by (optional)
                <input type="date" value={taskBy(task) ?? ''} onChange={e => setBy(e.target.value)} />
              </label>
              <span className="hint tl-detail">Do now means before the second tech run, Wednesday 11 November. Happens later means the last days, the day itself, or after.</span>
            </>
          )
          : detail && <span className="hint tl-detail">{detail}</span>}
        <TechFold tech={task.tech} />
      </span>
    </li>
  )
}

// A decision already answered: the answer, the "settled by default" note
// until Jon picks for himself, and (for Jon) a way to change it.
function AnsweredDecision({ d, canAnswer, onError, onSaved }) {
  const [open, setOpen] = useState(false)
  const note = d.note && d.answeredBy === 'settled by default' ? `. ${d.note}` : ''
  return (
    <li className="tl-item done">
      <span className="tl-mark" aria-hidden="true">✓</span>
      <span className="tl-body">
        {d.question} <span className="hint">· Decided: {d.answer}{note}</span>
        {canAnswer && <button className="card-toggle" onClick={() => setOpen(o => !o)}>{open ? 'keep it' : 'change'}</button>}
        {open && <Decision d={d} canAnswer={canAnswer} onError={onError} onSaved={() => { setOpen(false); onSaved() }} />}
      </span>
    </li>
  )
}

// Open cards and questions with no place on the night, each with a picker.
function NotPlaced({ lost, onError, onSaved }) {
  const options = momentOptions()
  const picker = (label, onPick) => (
    <label className="tl-when">Where it goes
      <select value="" aria-label={`Where ${label} goes`} onChange={e => e.target.value && onPick(e.target.value)}>
        <option value="">Pick a part of the night…</option>
        {options.map(o => <option key={o.key} value={o.key}>{o.name}</option>)}
      </select>
    </label>
  )
  return (
    <section className="panel tl-section tl-unfiled" aria-labelledby="tl-unfiled">
      <h2 id="tl-unfiled">Not on the night yet</h2>
      <p className="why">These have no place on the night yet, so nothing below shows them. Pick where each one goes.</p>
      <ul className="tl-list">
        {lost.decisions.map(d => (
          <li key={`d-${d.key}`} className="tl-item tl-decision">
            <span className="tl-mark" aria-hidden="true">?</span>
            <span className="tl-body">{d.question}{picker(d.question, m => fileDecision(d.key, m, d).then(onSaved).catch(onError))}</span>
          </li>
        ))}
        {lost.tasks.map(t => (
          <li key={t.id} className="tl-item">
            <span className="tl-mark" aria-hidden="true">○</span>
            <span className="tl-body">
              <b>{t.title || 'A task with no name yet'}</b>{t.who && <span className="tl-who"> {t.who}</span>}
              {t.detail && <span className="hint tl-detail">{t.detail}</span>}
              {picker(t.title || 'this task', m => updateTask(t.id, { moment: m }, t).then(onSaved).catch(onError))}
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}

export default function Timeline() {
  const [areas, setAreas] = useState({})
  const [tasks, setTasks] = useState(null)
  const [decisions, setDecisions] = useState([])
  const [loadErr, setLoadErr] = useState(false)
  const [saveErr, setSaveErr] = useState(false)
  const [me, setMe] = useState(null)
  const [everything, setEverything] = useState(false)
  const [params, setParams] = useSearchParams()
  // A link from Where we are may name one other owner; Jon's own name is the default view.
  const whoParam = params.get('who')
  const other = OWNERS.includes(whoParam) && !JON.includes(whoParam) ? whoParam : null
  const [focusId, setFocusId] = useState(null)
  const onError = () => setSaveErr(true)
  const onSaved = () => setSaveErr(false)

  useEffect(() => {
    const fail = () => setLoadErr(true)
    const unsubs = TIMELINE_LISTS.map(area => subscribeArea(area, items => setAreas(a => ({ ...a, [area]: items })), fail))
    unsubs.push(subscribeTasks(ts => { setTasks(ts); setLoadErr(false) }, fail))
    unsubs.push(subscribeDecisions(setDecisions, fail))
    return () => unsubs.forEach(u => u())
  }, [])
  useEffect(() => { whoAmI().then(setMe) }, [])
  const canAnswer = me?.name === 'Jon' || me?.name === 'Preview'

  const loaded = tasks !== null && TIMELINE_LISTS.every(a => a in areas)
  const data = { areas, tasks: tasks ?? [], decisions }
  const items = useMemo(() => timelineItems(data), [areas, tasks, decisions]) // eslint-disable-line react-hooks/exhaustive-deps

  // Whose open cards and questions this view shows, or everything.
  const showAll = everything && !other
  const owners = new Set(other ? [other] : JON)
  const theirs = (it) => !it.status.done && (
    (it.kind === 'task' && owners.has(ownerOf(it.task)))
    || (it.kind === 'decision' && owners.has(ownerOf(it.decision))))
  const viewItems = showAll ? items : items.filter(theirs)

  // The next thing for Jon: the same card Home and Where we are put first.
  const next = !showAll && !other ? nextCards(tasks ?? [])[0] ?? null : null
  const cards = viewItems.filter(i => i.kind === 'task').length
  const asks = viewItems.filter(i => i.kind === 'decision').length
  const summary = () => {
    if (showAll) return 'Everything on the board, done or not, with every list the night reads. Tick a card when it is done.'
    const name = other ?? 'you'
    const head = `${cards === 0 ? 'No' : cards} open ${cards === 1 ? 'card' : 'cards'} for ${name}`
    const qs = `${asks} ${asks === 1 ? 'question' : 'questions'}`
    if (!asks) return `${head}.`
    return other ? `${head}, and ${qs} ${other} will ask you about.` : `${head}, and ${qs} only you can answer.`
  }

  // Not on the night yet: everything when everything shows; otherwise only
  // the cards (and questions) of whoever this view is for.
  const lostAll = unfiled(data)
  const lost = showAll ? lostAll : {
    tasks: lostAll.tasks.filter(t => owners.has(ownerOf(t))),
    decisions: lostAll.decisions.filter(d => owners.has(ownerOf(d))),
  }

  // A task added here is filed under its moment, and in someone's view it is theirs.
  const addHere = (moment) => {
    const maxOrder = Math.max(0, ...(tasks ?? []).filter(t => (t.order ?? 0) < 10000).map(t => t.order ?? 0))
    const task = { title: '', detail: '', status: 'todo', moment, order: maxOrder + 1 }
    if (other) task.who = other
    else if (!showAll) task.who = 'Jon'
    addTask(task)
      .then(id => { setFocusId(id); onSaved() })
      .catch(onError)
  }

  const goTo = (moment) => document.getElementById(`moment-${moment}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })

  const renderItem = (it, rowKey) => {
    if (it.kind === 'need') return <NeedLine key={`n-${it.need.list}-${it.need.tab ?? ''}-${(it.need.labels ?? []).join()}`} need={it.need} status={it.status} standin={it.standin} />
    if (it.kind === 'decision') {
      const d = it.decision
      return d.answer != null
        ? <AnsweredDecision key={`d-${d.key}`} d={d} canAnswer={canAnswer} onError={onError} onSaved={onSaved} />
        : <li key={`d-${d.key}`} className="tl-item tl-decision"><span className="tl-mark" aria-hidden="true">?</span><span className="tl-body"><Decision d={d} canAnswer={canAnswer} onError={onError} onSaved={onSaved} /></span></li>
    }
    return <TaskLine key={it.task.id} task={it.task} onError={onError} onSaved={onSaved} onEnter={() => addHere(rowKey)} focus={it.task.id === focusId} standin={it.standin} showWhen={showAll} />
  }

  // Everything shows every row, with its add button. A view for one person
  // shows only the rows that hold something of theirs.
  const sections = TIMELINE.map(s => {
    const sectionItems = viewItems.filter(i => i.section === s.key)
    const headItems = sectionItems.filter(i => i.row === null)
    const rows = s.rows.map(r => ({
      r, shown: sectionItems.filter(i => i.row === r.key), also: showAll ? r.needs.filter(n => n.also) : [],
    })).filter(({ shown, also }) => showAll || shown.length || also.length)
    return { s, headItems, rows }
  }).filter(({ headItems, rows }) => showAll || headItems.length || rows.length)

  return (
    <main className="dash">
      <section className="panel progress">
        <h2>{showAll ? 'The night, in order' : other ? `${other}, what is left` : 'Jon, what is left'}</h2>
        <p className="why">{!loaded ? 'Counting…' : summary()}</p>
        {saveErr && <div className="banner error" role="alert">SAVE FAILED. Your latest change to a task is not saved. It will retry on your next edit.</div>}
        {loadErr && <div className="banner error" role="alert">Part of the night did not load. Check your signal.</div>}
        {loaded && next && (
          <p className="night-line">
            <b>Next:</b> {next.title || 'A task with no name yet'}{byLabel(next) ? ` (${byLabel(next)})` : ''}.{' '}
            {next.moment && momentName(next.moment) && <button className="ghost" onClick={() => goTo(next.moment)}>Take me there</button>}
          </p>
        )}
        {loaded && !showAll && cards === 0 && asks === 0 && <p className="night-line"><b>{other ? `Nothing is open for ${other}.` : 'Nothing here needs you right now.'}</b></p>}
        <p className="night-line">
          {other
            ? <button className="ghost" onClick={() => setParams({})}>Back to your cards</button>
            : <button className="ghost" aria-pressed={everything} onClick={() => setEverything(v => !v)}>{everything ? 'Show only what is left for you' : 'Show everything'}</button>}
        </p>
      </section>

      {loaded && (lost.tasks.length > 0 || lost.decisions.length > 0) && (
        <NotPlaced lost={lost} onError={onError} onSaved={onSaved} />
      )}

      {sections.map(({ s, headItems, rows }) => (
        <section className="panel tl-section" key={s.key} aria-labelledby={`tl-${s.key}`}>
          <p className="tl-clock">{s.clock}{s.length ? ` · ${s.length}` : ''}</p>
          <h2 id={`tl-${s.key}`}>{s.title}{s.plain && <span className="tl-plain"> · {s.plain}</span>}</h2>
          {headItems.length > 0 && <ul className="tl-list">{headItems.map(it => renderItem(it, s.rows[0]?.key))}</ul>}
          {rows.map(({ r, shown, also }) => {
            const lone = s.rows.length === 1 && r.name === s.title
            return (
              <div className="tl-row" id={`moment-${r.key}`} key={r.key}>
                {!lone && <h3>{r.name}</h3>}
                <p className="why">{r.what}</p>
                {r.link && <p className="night-line"><Link className="ghost dl tl-link" to={r.link.to}>{r.link.label}</Link></p>}
                <ul className="tl-list">
                  {shown.map(it => renderItem(it, r.key))}
                  {also.map((need, i) => <NeedLine key={`a-${i}`} need={need} status={needStatus(need, data)} />)}
                </ul>
                <button className="ghost tl-add" onClick={() => addHere(r.key)}>+ Add a task here</button>
              </div>
            )
          })}
        </section>
      ))}
    </main>
  )
}
