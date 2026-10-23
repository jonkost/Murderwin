import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { subscribeArea, subscribeLatestValidation, subscribeTasks, subscribeDecisions, updateTask, addTask, fileDecision, whoAmI } from '../lib/store'
import { TIMELINE, TIMELINE_LISTS, WHEN, OWNERS, needStatus, timelineItems, bucketProgress, taskWhen, ownerOf, byLabel, taskBy, unfiled, momentOptions, leftByOwner } from '../lib/timeline'
import { useTaskDraft } from '../components/TaskBoard'
import { Decision } from '../components/DecisionsPanel'

// The night, in order. One straight line from the freeze to the morning
// after: under every moment, the lists it needs (live counts), the secrets
// it needs (whether they exist, never their words), the decisions still open
// and the tasks, each with a tick box. A task added here is filed under that
// moment on the task board too.
//
// Three views (22 Oct 2026): Do now (before the freeze), Happens later (the
// week before, the day, after) and Everything. Something the night already
// covers with a stand-in says so, and the pointer at the top skips it, as
// it skips Claude's and Jenna's cards. Every row and its add button stay in
// every view; only "Show only what is left" hides rows.
//
// Who (23 Oct 2026): a row of buttons, one per owner, each with a count of
// that owner's open cards; picking one shows only those cards (and, for Jon,
// the decisions only he answers). A card may carry a "by" date, shown on the
// card. Anything with no place on the night is listed first, under Not filed
// yet, with a picker to file it.

const VIEWS = [
  { key: 'now', label: WHEN.now },
  { key: 'later', label: WHEN.later },
  { key: 'all', label: 'Everything' },
]
const PREF_LEFT = 'workshop.timeline.onlyLeft'
const PREF_VIEW = 'workshop.timeline.view'
const PREF_WHO = 'workshop.timeline.who'
// Today on this computer's own calendar (not UTC), so a card due today is
// not shown late in the evening.
const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }
function readPref(key, fallback) { try { return localStorage.getItem(key) ?? fallback } catch { return fallback } }
function writePref(key, v) { try { localStorage.setItem(key, v) } catch { /* private window: fine */ } }

const STANDIN = 'a stand-in works until then'

function NeedLine({ need, status, standin }) {
  return (
    <li className={status.done ? 'tl-item done' : 'tl-item'}>
      <span className="tl-mark" aria-hidden="true">{status.done ? '✓' : '○'}</span>
      <span className="tl-body">
        {need.also && <span className="hint">Used again: </span>}
        {status.to ? <Link to={status.to}>{status.label}</Link> : <span>{need.secret ? '🔒 ' : ''}{status.label}</span>}
        <span className="hint"> · {status.text}</span>
        {standin && !status.done && !need.also && <span className="tl-standin">{STANDIN}</span>}
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
        {standin && !done && <span className="tl-standin">{STANDIN}</span>}
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
              <span className="hint tl-detail">Do now means before the freeze. Happens later means the week before, the day, or after.</span>
            </>
          )
          : detail && <span className="hint tl-detail">{detail}</span>}
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

// Open cards and decisions with no place on the night, each with a picker.
function NotFiled({ lost, onError, onSaved }) {
  const options = momentOptions()
  const picker = (label, onPick) => (
    <label className="tl-when">File it under
      <select value="" aria-label={`File ${label} under`} onChange={e => e.target.value && onPick(e.target.value)}>
        <option value="">Pick a moment…</option>
        {options.map(o => <option key={o.key} value={o.key}>{o.name}</option>)}
      </select>
    </label>
  )
  return (
    <section className="panel tl-section tl-unfiled" aria-labelledby="tl-unfiled">
      <h2 id="tl-unfiled">Not filed yet</h2>
      <p className="why">These have no place on the night yet, so nothing below shows them. Pick where each one belongs.</p>
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

// One line at the top for the view in hand: how much is ready, and how
// much of what is left already works with a stand-in.
function viewSummary(view, p) {
  const head = view === 'now' ? `Before the freeze: ${p.ready} of ${p.total} ready.`
    : view === 'later' ? `The week before, the day and after: ${p.ready} of ${p.total} done. Most of these belong to the week before and the day itself.`
    : `The whole night: ${p.ready} of ${p.total} ready.`
  if (!p.left || view === 'later') return head
  const parts = [`${p.needsYou} need you`]
  if (p.standin) parts.push(`${p.standin} already work with a stand-in`)
  if (p.others) parts.push(`${p.others} are Claude’s or Jenna’s`)
  const list = parts.length > 1 ? `${parts.slice(0, -1).join(', ')} and ${parts.at(-1)}` : parts[0]
  return `${head} Of the ${p.left} left, ${list}.`
}

export default function Timeline() {
  const [areas, setAreas] = useState({})
  const [validation, setValidation] = useState(null)
  const [tasks, setTasks] = useState(null)
  const [decisions, setDecisions] = useState([])
  const [loadErr, setLoadErr] = useState(false)
  const [saveErr, setSaveErr] = useState(false)
  const [me, setMe] = useState(null)
  const [onlyLeft, setOnlyLeft] = useState(() => readPref(PREF_LEFT, '0') === '1')
  const [view, setView] = useState(() => { const v = readPref(PREF_VIEW, 'now'); return VIEWS.some(x => x.key === v) ? v : 'now' })
  const [params] = useSearchParams()
  const [who, setWho] = useState(() => { const w = params.get('who') ?? readPref(PREF_WHO, 'all'); return OWNERS.includes(w) ? w : 'all' })
  // A link with ?who= (from Where we are) picks that owner, even when the page is already open.
  const whoParam = params.get('who')
  useEffect(() => { if (OWNERS.includes(whoParam)) setWho(whoParam) }, [whoParam])
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
  const inView = (it) => view === 'all' || it.when === view
  // One owner's open cards (and, for Jon, the open decisions), or everything.
  const forWho = (it) => who === 'all'
    || (it.kind === 'task' && !it.status.done && ownerOf(it.task) === who)
    || (who === 'Jon' && it.kind === 'decision' && !it.status.done)
  const viewItems = items.filter(inView).filter(forWho)
  const progress = bucketProgress(viewItems)
  // On Everything, point at the first thing before the freeze that needs you.
  const first = who !== 'all' && who !== 'Jon' ? null
    : view === 'all' ? bucketProgress(items.filter(i => i.when === 'now').filter(forWho)).first ?? progress.first : progress.first
  // The Who row counts every open card on the board, filed or not and in
  // any view, so its numbers match Home and Where we are. The line under it
  // counts the view in hand.
  const openCount = (tasks ?? []).filter(t => !t.deleted && t.status !== 'done').length
  const whoCounts = leftByOwner(tasks ?? [])
  // Not filed yet: everything for Everyone; one owner's own cards (and, for
  // Jon, the decisions) when one owner is picked.
  const lostAll = unfiled(data)
  const lost = who === 'all' ? lostAll : { tasks: lostAll.tasks.filter(t => ownerOf(t) === who), decisions: who === 'Jon' ? lostAll.decisions : [] }

  const toggleLeft = () => setOnlyLeft(v => { writePref(PREF_LEFT, v ? '0' : '1'); return !v })
  const pickView = (v) => { setView(v); writePref(PREF_VIEW, v) }
  const pickWho = (w) => { setWho(w); writePref(PREF_WHO, w) }
  const filtering = onlyLeft || who !== 'all'
  const whoSummary = () => {
    const cards = viewItems.filter(i => i.kind === 'task').length
    const asks = viewItems.filter(i => i.kind === 'decision').length
    const name = who === 'Jon' ? 'you' : who === 'Jon and Susan' ? 'you and Susan together' : who
    const head = `${cards === 0 ? 'No' : cards} open ${cards === 1 ? 'card' : 'cards'} for ${name} in this part of the list.`
    return asks ? `${head} And ${asks} ${asks === 1 ? 'decision' : 'decisions'} only you can answer.` : head
  }

  // A task added in Do now or Happens later is filed under that view, so it
  // stays in sight; on Everything it takes its row's own. With one owner
  // picked, it is theirs.
  const addHere = (moment) => {
    const maxOrder = Math.max(0, ...(tasks ?? []).map(t => t.order ?? 0))
    const task = { title: '', detail: '', status: 'todo', moment, order: maxOrder + 1 }
    if (view !== 'all') task.when = view
    if (who !== 'all') task.who = who
    addTask(task)
      .then(id => { setFocusId(id); onSaved() })
      .catch(onError)
  }

  // A row's own place, or, for a line that belongs to the whole act (its
  // act script), the act's heading.
  const goTo = (it) => document.getElementById(it.row ? `moment-${it.row}` : `tl-${it.section}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })

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

  const renderItem = (it, rowKey) => {
    if (it.kind === 'need') return <NeedLine key={`n-${it.need.list ?? it.need.secret}-${it.need.tab ?? ''}-${(it.need.labels ?? []).join()}`} need={it.need} status={it.status} standin={it.standin} />
    if (it.kind === 'decision') {
      const d = it.decision
      return d.answer != null
        ? <AnsweredDecision key={`d-${d.key}`} d={d} canAnswer={canAnswer} onError={onError} onSaved={onSaved} />
        : <li key={`d-${d.key}`} className="tl-item tl-decision"><span className="tl-mark" aria-hidden="true">?</span><span className="tl-body"><Decision d={d} canAnswer={canAnswer} onError={onError} onSaved={onSaved} /></span></li>
    }
    return <TaskLine key={it.task.id} task={it.task} onError={onError} onSaved={onSaved} onEnter={() => addHere(rowKey)} focus={it.task.id === focusId} standin={it.standin} showWhen={view === 'all'} />
  }

  const sections = TIMELINE.map(s => {
    const sectionItems = viewItems.filter(i => i.section === s.key)
    const shownOf = (arr) => (onlyLeft ? arr.filter(i => !i.status.done) : arr)
    const headItems = shownOf(sectionItems.filter(i => i.row === null))
    const rows = s.rows.map(r => {
      const shown = shownOf(sectionItems.filter(i => i.row === r.key))
      const also = filtering || view === 'later' ? [] : r.needs.filter(n => n.also)
      return { r, shown, also }
    }).filter(({ shown, also }) => !filtering || shown.length || also.length)
    return { s, sectionItems, headItems, rows }
  }).filter(({ headItems, rows }) => !loaded || !filtering || headItems.length || rows.length)

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
        <div className="tl-views" role="group" aria-label="Which part of the list">
          {VIEWS.map(v => (
            <button key={v.key} className={view === v.key ? 'tab active' : 'tab'} aria-pressed={view === v.key} onClick={() => pickView(v.key)}>{v.label}</button>
          ))}
        </div>
        <div className="tl-views tl-who-row" role="group" aria-label="Whose cards">
          <button className={who === 'all' ? 'tab active' : 'tab'} aria-pressed={who === 'all'} onClick={() => pickWho('all')}>
            Everyone{loaded && <span className="tab-count">{openCount}</span>}
          </button>
          {OWNERS.map(o => (
            <button key={o} className={who === o ? 'tab active' : 'tab'} aria-pressed={who === o} onClick={() => pickWho(o)}>
              {o}{loaded && <span className="tab-count">{whoCounts[o]}</span>}
            </button>
          ))}
        </div>
        <p className="why">{!loaded ? 'Counting…' : who === 'all' ? viewSummary(view, progress) : whoSummary()}</p>
        {who === 'all' && <span className="bar big"><span style={{ width: `${progress.total ? Math.round((progress.ready / progress.total) * 100) : 0}%` }} /></span>}
        {loaded && first && (
          <p className="night-line">
            <b>Next thing that needs you:</b> {firstPlace(first)}. {firstLabel(first)}{/[.!?]$/.test(firstLabel(first)) ? '' : '.'}{' '}
            <button className="ghost" onClick={() => goTo(first)}>Take me there</button>
          </p>
        )}
        {loaded && !first && view !== 'later' && (who === 'all' || who === 'Jon') && (
          <p className="night-line"><b>Nothing here needs you.</b>{
            progress.standin && progress.others ? ' What is left already works with a stand-in, or is Claude’s or Jenna’s.'
              : progress.standin ? ' What is left already works with a stand-in.'
                : progress.others ? ' What is left is Claude’s or Jenna’s.' : ''}</p>
        )}
        <p className="night-line">
          <button className="ghost" aria-pressed={onlyLeft} onClick={toggleLeft}>{onlyLeft ? 'Show what is done too' : 'Show only what is left'}</button>
        </p>
      </section>

      {loaded && (lost.tasks.length > 0 || lost.decisions.length > 0) && (
        <NotFiled lost={lost} onError={onError} onSaved={onSaved} />
      )}

      {loaded && sections.length === 0 && (
        <section className="panel"><p className="why">Nothing left in this part of the list.</p></section>
      )}

      {sections.map(({ s, sectionItems, headItems, rows }) => {
        const left = sectionItems.filter(i => !i.status.done).length
        return (
          <section className="panel tl-section" key={s.key} aria-labelledby={`tl-${s.key}`}>
            <p className="tl-clock">{s.clock}{s.length ? ` · ${s.length}` : ''}</p>
            <h2 id={`tl-${s.key}`}>{s.title}{s.plain && <span className="tl-plain"> · {s.plain}</span>}</h2>
            {loaded && sectionItems.length > 0 && <p className="hint">{left === 0 ? 'All ready.' : `${sectionItems.length - left} of ${sectionItems.length} ready.`}</p>}
            {headItems.length > 0 && <ul className="tl-list">{headItems.map(it => renderItem(it, s.rows[0]?.key))}</ul>}
            {rows.map(({ r, shown, also }) => {
              const lone = s.rows.length === 1 && r.name === s.title
              // Nothing of this view here: the name (or, for a section of one
              // row, where its things are instead) and the add button.
              if (!shown.length && !also.length && view !== 'all') {
                const elsewhere = sectionItems.length < items.filter(i => i.section === s.key).length
                const empty = !lone ? r.name
                  : elsewhere ? (view === 'now' ? 'Nothing to do here before the freeze. Its things are under Happens later.' : 'Nothing here for later. Its things are under Do now.')
                  : 'Nothing here yet.'
                return (
                  <div className="tl-row tl-row-empty" id={`moment-${r.key}`} key={r.key}>
                    <span className="tl-empty-name">{empty}</span>
                    <button className="ghost tl-add" onClick={() => addHere(r.key)}>+ Add a task here</button>
                  </div>
                )
              }
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
        )
      })}
    </main>
  )
}
