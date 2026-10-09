import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { subscribeArea, subscribeLatestValidation, subscribeHistory } from '../lib/store'
import { AREAS, AREA_GROUPS, GROUP_WHY, TAB_KINDS } from '../lib/content'
import TaskBoard from '../components/TaskBoard'
import DecisionsPanel from '../components/DecisionsPanel'

// Home. Plain words, one sentence per section, a bar per list. Nothing here
// blocks anything: bars fill, that is all they do.

function Row({ label, count, goal, to, suffix, why }) {
  const done = goal > 0 && count >= goal
  return (
    <Link to={to} className={done ? 'list-card done' : 'list-card'}>
      <span className="list-name">{label}</span>
      <span className="list-why">{why}</span>
      <span className="list-count">{done ? 'Done' : `${count} of ${goal}${suffix ?? ''}`}</span>
    </Link>
  )
}

const ISSUE_LABELS = {
  banned: 'rhyme words leaked',
  lengthFails: 'wrong length',
  placeholderFails: 'blanks in the wrong shape',
  granoliaFails: 'Granolia’s blanks don’t match',
  salemFails: 'Salem’s twist can’t be caught',
  impersonalFails: 'says “you”',
}

function areaRow(area, spec, items) {
  const live = items.filter(i => !i.deleted)
  if (spec.checklist) {
    const to = `/assets?tab=${spec.upload === 'image' ? 'pictures' : 'sounds'}`
    return { key: area, label: spec.label, why: spec.why, count: live.filter(i => i.done).length, goal: live.length, suffix: ' done', to }
  }
  const goal = spec.tabs ? spec.goalPerTab * TAB_KINDS[spec.tabs].list.length : spec.goal
  const to = area === 'templates' ? '/stationery' : `/edit/${area}`
  return { key: area, label: spec.label, why: spec.why, count: live.length, goal, to }
}

export default function Dashboard() {
  const [data, setData] = useState({})
  const [validation, setValidation] = useState(null)
  const [history, setHistory] = useState([])

  useEffect(() => {
    const unsubs = Object.keys(AREAS).map(area =>
      subscribeArea(area, items => setData(d => ({ ...d, [area]: items })), () => {}))
    unsubs.push(subscribeLatestValidation(setValidation, () => {}))
    unsubs.push(subscribeHistory(setHistory, () => {}))
    return () => unsubs.forEach(u => u())
  }, [])

  const rows = (filter) => Object.entries(AREAS)
    .filter(([, spec]) => filter(spec))
    .map(([area, spec]) => areaRow(area, spec, data[area] ?? []))

  // The three lists furthest from their goal, as big cards. Deterministic:
  // nothing is dealt at random, Jon always picks.
  const picks = Object.entries(AREAS)
    .filter(([, spec]) => !spec.hidden && !spec.checklist)
    .map(([area, spec]) => areaRow(area, spec, data[area] ?? []))
    .filter(r => r.goal > 0 && r.count < r.goal)
    .sort((a, b) => (a.count / a.goal) - (b.count / b.goal))
    .slice(0, 3)

  return (
    <main className="dash">
      <section className="panel pick">
        <h2>Pick one thing</h2>
        <p className="why">Choose one, add three lines, stop. Speak them if you like: every box has a Speak button.</p>
        <div className="pick-cards">
          {picks.map(r => (
            <Link key={r.key} to={`${r.to}${r.to.includes('?') ? '&' : '?'}focus=3`} className="pick-card">
              <span className="pick-label">{r.label}</span>
              <span className="pick-why">{r.why}</span>
              <span className="pick-count">{r.count} of {r.goal} · three more</span>
            </Link>
          ))}
          {picks.length === 0 && <p className="hint">Every list has reached its goal. Go and photograph a cat.</p>}
        </div>
      </section>


      {AREA_GROUPS.map(group => (
        <section className="panel" key={group}>
          <h2>{group}</h2>
          <p className="why">{GROUP_WHY[group]}</p>
          <div className="list-grid">
            {rows(spec => spec.group === group && !spec.hidden).map(r => <Row key={r.key} {...r} />)}
          </div>
        </section>
      ))}

      <section className="panel">
        <h2>The secrets</h2>
        <p className="why">What the cats really reveal, the documents, the news fragments. Claude writes these and you never see them. This row only says whether they exist.</p>
        <div className="prow static">
          <span className="plabel">🔒 Secret cat lines · documents · echoes</span>
          <span className="pcount">
            {validation === null
              ? 'not made yet'
              : `${validation.complete} of ${validation.codes} motive sets — ${validation.pass ? 'checked ✓' : 'needs a re-run'}`}
          </span>
        </div>
        {validation !== null && !validation.pass && (
          <p className="hint">
            What went wrong (counts only): {Object.entries(ISSUE_LABELS)
              .filter(([k]) => validation[k] > 0)
              .map(([k, label]) => `${label} ×${validation[k]}`)
              .join(' · ') || 'some sets are incomplete'}. Ask Claude Code to run the generator again.
          </p>
        )}
      </section>

      <section className="panel">
        <h2>Who has been working</h2>
        <p className="why">Every change in the workshop is kept with who made it. This is the recent trail, counts only.</p>
        <Trail history={history} />
      </section>

      <details className="panel more">
        <summary>Everything else, rarely needed</summary>
        <div className="list-grid">
          {rows(spec => spec.hidden).map(r => <Row key={r.key} {...r} />)}
        </div>
        <TaskBoard />
        <DecisionsPanel />
      </details>
    </main>
  )
}


// Recent activity by person: when they were last here, and how many lines
// they touched in which lists. RULE 1: only the safe lists are named. Any
// entry that touches the sealed side (area beginning "sealed", or a list this
// workshop does not know) is counted as "the secrets" and nothing more: no
// list name, no line, no before/after. Those fields are never rendered here.
const SAFE_AREAS = new Set(Object.keys(AREAS))
function trailLabel(area) {
  if (!area || String(area).startsWith('sealed') || !SAFE_AREAS.has(area)) return 'the secrets'
  return AREAS[area].label
}

function Trail({ history }) {
  const people = {}
  for (const h of history) {
    const name = h.by?.name ?? 'before this was recorded'
    const when = h.ts?.toMillis?.() ?? 0
    const p = people[name] ??= { name, last: 0, count: 0, areas: {} }
    p.count += 1
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
          <span className="hint"> · last here {p.last ? new Date(p.last).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : 'unknown'}</span>
          <br />
          <span className="hint">{p.count} changes recently: {Object.entries(p.areas).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([label, n]) => `${label} ${n}`).join(' · ')}</span>
        </li>
      ))}
    </ul>
  )
}
