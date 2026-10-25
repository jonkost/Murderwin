import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { subscribeArea, subscribeHistory, subscribeTasks, subscribeDecisions, whoAmI } from '../lib/store'
import { AREAS, AREA_GROUPS, GROUP_WHY, TAB_KINDS, goalOf, goalForTab, tabsOf } from '../lib/content'
import { STANDIN_LISTS, STANDIN_NOTE, LEFT_OUT_LISTS, LEFT_OUT_NOTE, nextCards, decisionsForJon, byLabel, momentName, firstSentence } from '../lib/timeline'
import { isComplete } from '../lib/scenarios'
import { useReviews } from '../components/ReviewRow'
import { Decision } from '../components/DecisionsPanel'

// Home (24 Oct 2026): the front page, and it never asks Jon to write. Jon
// writes nothing more (23 Oct): Claude chat writes what is left and Claude
// Code copies it in. So Home shows his next three jobs, the questions only
// he answers, and the way into Game test. Every job lives on the Timeline,
// the one board; there is no second board here and no totals. The lists are
// still here, folded away, for reading or a small fix.

function Row({ label, count, goal, to, why, moment, note, review, reviewBy }) {
  const done = goal > 0 && count >= goal
  return (
    <Link to={to} className={done ? 'list-card done' : 'list-card'}>
      <span className="list-name">{label}
        {review === 'clear' && <span className="ribbon" title={`${reviewBy ?? 'Jenna'}: reads clearly`}>✓ read</span>}
        {review === 'again' && <span className="ribbon again" title={`${reviewBy ?? 'Jenna'}: needs another look`}>another look</span>}
      </span>
      {moment && <span className="list-moment">{moment}</span>}
      <span className="list-why">{why}</span>
      <span className="list-count">{done ? <><img className="seal-small" src="/workshop/seal.png" alt="" /> Full</> : goal > 0 ? `${count} of ${goal}` : `${count}`}{note ? ` · ${note}` : ''}</span>
    </Link>
  )
}

const SAFE_AREAS = new Set(Object.keys(AREAS))

function countOf(spec, live) {
  if (spec.editor === 'questions') return live.filter(i => isComplete(i.beats)).length
  return live.length
}

// Where a list opens: its thinnest tab, when it has tabs.
function linkFor(area, spec, live) {
  if (spec.tabs) {
    const def = TAB_KINDS[spec.tabs]
    const thin = tabsOf(spec).map(t => ({ t, n: live.filter(i => i[def.field] === t).length - goalForTab(spec, t) })).sort((a, b) => a.n - b.n)[0]
    return `/edit/${area}?tab=${thin.t}`
  }
  return `/edit/${area}`
}

// A list the night leaves out while it is empty shows its count and who
// writes it, never a goal: nothing on Home is Jon's to fill.
function areaRow(area, spec, items, reviews) {
  const live = items.filter(i => !i.deleted)
  const leftOut = LEFT_OUT_LISTS.includes(area)
  return {
    key: area, label: spec.label, why: spec.why, moment: spec.moment,
    count: countOf(spec, live), goal: leftOut ? 0 : goalOf(spec), to: linkFor(area, spec, live),
    note: STANDIN_LISTS.has(area) ? STANDIN_NOTE : leftOut ? LEFT_OUT_NOTE : null,
    review: reviews?.[area]?.state, reviewBy: reviews?.[area]?.by?.name,
  }
}

export default function Dashboard() {
  const [data, setData] = useState({})
  const [history, setHistory] = useState([])
  const [tasks, setTasks] = useState(null)
  const [decisions, setDecisions] = useState(null)
  const [saveErr, setSaveErr] = useState(false)
  const [me, setMe] = useState(null)
  const reviews = useReviews()

  useEffect(() => {
    const unsubs = Object.keys(AREAS).map(area =>
      subscribeArea(area, items => setData(d => ({ ...d, [area]: items })), () => {}))
    unsubs.push(subscribeHistory(setHistory, () => {}))
    unsubs.push(subscribeTasks(setTasks, () => {}))
    unsubs.push(subscribeDecisions(setDecisions, () => {}))
    return () => unsubs.forEach(u => u())
  }, [])
  useEffect(() => { whoAmI().then(setMe) }, [])
  const canAnswer = me?.name === 'Jon' || me?.name === 'Preview'

  const next = tasks ? nextCards(tasks) : []
  const asks = decisions ? decisionsForJon(decisions) : []
  const rows = (filter) => Object.entries(AREAS)
    .filter(([, spec]) => filter(spec))
    .map(([area, spec]) => areaRow(area, spec, data[area] ?? [], reviews))

  return (
    <main className="dash">
      <section className="panel">
        <h2>Your next three</h2>
        <p className="why">Your open cards, soonest first: the ones with a date, then the rest in the order of the night.</p>
        {tasks === null ? <p className="hint">Counting…</p>
          : next.length === 0 ? <p className="hint">Nothing on the board for you.</p>
            : (
              <ol className="hub-next">
                {next.map(t => (
                  <li key={t.id}>
                    <b>{t.title || 'A task with no name yet'}</b>
                    {byLabel(t) && <> <span className="tl-by">{byLabel(t)}</span></>}
                    {t.who && t.who !== 'Jon' && <> <span className="tl-who">{t.who}</span></>}
                    {t.moment && momentName(t.moment) && <><br /><span className="list-moment">{momentName(t.moment)}</span></>}
                    {t.detail && <><br /><span className="hint">{firstSentence(t.detail)}</span></>}
                  </li>
                ))}
              </ol>
            )}
        <p className="night-line"><Link className="ghost dl" to="/timeline">All your cards on the Timeline</Link></p>
      </section>

      <section className="panel">
        <h2>Questions only you can answer</h2>
        {saveErr && <div className="banner error" role="alert">SAVE FAILED. That answer was not recorded. Pick and confirm again.</div>}
        <p className="why">{decisions === null ? 'Counting…' : asks.length === 0 ? 'None. Every question on the board has an answer.' : 'Pick an answer and confirm it. Until you do, the game runs on the default.'}</p>
        <ul className="hub-decisions">
          {asks.map(d => (
            <li key={d.key}>
              {d.moment && momentName(d.moment) && <span className="list-moment">{momentName(d.moment)}</span>}
              <Decision d={d} canAnswer={canAnswer} onError={() => setSaveErr(true)} onSaved={() => setSaveErr(false)} />
            </li>
          ))}
        </ul>
      </section>

      <section className="panel">
        <h2>Try the games</h2>
        <p className="why">Every game in Acts 4 and 6, and the Parlour Games, ready to try before the night. Tell Claude Code what to fix from there: your note goes on the Timeline.</p>
        <p className="night-line"><Link className="primary dl" to="/game-test">Game test</Link></p>
      </section>

      <details className="panel more">
        <summary>The lists (nothing left for you to write)</summary>
        <p className="why">You write nothing more (23 October): Claude chat writes what is left, and Claude Code copies it in. Open a list to read it or fix a word. Where it says {STANDIN_NOTE}, or {LEFT_OUT_NOTE}, the night runs fine with the list as it is.</p>
        {AREA_GROUPS.map(group => (
          <div className="map-group" key={group}>
            <h3>{group}</h3>
            <p className="hint">{GROUP_WHY[group]}</p>
            <div className="list-grid">
              {rows(spec => spec.group === group && !spec.hidden).map(({ key, ...r }) => <Row key={key} {...r} />)}
            </div>
          </div>
        ))}
        <h3>Your own notes</h3>
        <div className="list-grid">
          {rows(spec => spec.hidden && !spec.retired).map(({ key, ...r }) => <Row key={key} {...r} />)}
        </div>
        <h3>Who has been writing</h3>
        <p className="hint">Every change is kept with a name on it. Counts only, never the words. Retired lists keep everything in them, out of sight.</p>
        <Trail history={history} />
      </details>
    </main>
  )
}

// Recent activity by person: lines written (new) and lines tidied (edits),
// from the recent trail. RULE 1: only the safe lists are named. Any entry
// that touches the sealed side (area beginning "sealed", or a list this
// workshop does not know) is counted as "the secrets" and nothing more: no
// list name, no line, no before/after. Those fields are never rendered here.
function trailLabel(area) {
  if (!area || String(area).startsWith('sealed') || !SAFE_AREAS.has(area)) return area === 'reviews' ? 'reads' : area === 'tasks' || area === 'decisions' || area === 'game' ? 'the board' : 'the secrets'
  return AREAS[area].label
}

function Trail({ history }) {
  const people = {}
  for (const h of history) {
    const name = h.by?.name ?? 'before names were kept'
    const when = h.ts?.toMillis?.() ?? 0
    const p = people[name] ??= { name, last: 0, written: 0, tidied: 0, areas: {} }
    if (!SAFE_AREAS.has(h.area)) { /* the board, a read, or the secrets: counted in areas only */ }
    else if (h.before === null) p.written += 1
    else p.tidied += 1
    p.last = Math.max(p.last, when)
    const label = trailLabel(h.area)
    p.areas[label] = (p.areas[label] ?? 0) + 1
  }
  const list = Object.values(people).sort((a, b) => b.last - a.last)
  if (!list.length) return <p className="hint">Nothing recorded yet.</p>
  return (
    <ul className="trail">
      {list.map(p => (
        <li key={p.name}>
          <b>{p.name}</b>
          <span className="hint"> · {p.written} written, {p.tidied} tidied recently · last here {p.last ? new Date(p.last).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : 'unknown'}</span>
          <br />
          <span className="hint">{Object.entries(p.areas).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([label, n]) => `${label} ${n}`).join(' · ')}</span>
        </li>
      ))}
    </ul>
  )
}
