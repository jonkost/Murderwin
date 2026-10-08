import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { subscribeArea, subscribeLatestValidation } from '../lib/store'
import { AREAS, AREA_GROUPS, GROUP_WHY, TAB_KINDS } from '../lib/content'
import TaskBoard from '../components/TaskBoard'
import DecisionsPanel from '../components/DecisionsPanel'

// Home. Plain words, one sentence per section, a bar per list. Nothing here
// blocks anything: bars fill, that is all they do.

function Row({ label, count, goal, to, suffix, why }) {
  const pct = goal ? Math.min(100, Math.round((count / goal) * 100)) : 0
  return (
    <Link to={to} className="prow">
      <span className="plabel">{label}<small>{why}</small></span>
      <span className="pcount">{count} of {goal}{suffix ?? ''}</span>
      <span className="pbar"><span style={{ width: `${pct}%` }} /></span>
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

  useEffect(() => {
    const unsubs = Object.keys(AREAS).map(area =>
      subscribeArea(area, items => setData(d => ({ ...d, [area]: items })), () => {}))
    unsubs.push(subscribeLatestValidation(setValidation, () => {}))
    return () => unsubs.forEach(u => u())
  }, [])

  const rows = (filter) => Object.entries(AREAS)
    .filter(([, spec]) => filter(spec))
    .map(([area, spec]) => areaRow(area, spec, data[area] ?? []))

  return (
    <main className="dash">
      <section className="panel lead">
        <h2>Game night</h2>
        <p className="why">Your name and Susan’s, the square code for the Act 1 slide, and how guests join. <Link to="/night">Open Game night</Link></p>
      </section>

      {AREA_GROUPS.map(group => (
        <section className="panel" key={group}>
          <h2>{group}</h2>
          <p className="why">{GROUP_WHY[group]}</p>
          {rows(spec => spec.group === group && !spec.hidden).map(r => <Row key={r.key} {...r} />)}
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

      <details className="panel more">
        <summary>Everything else — rarely needed</summary>
        {rows(spec => spec.hidden).map(r => <Row key={r.key} {...r} />)}
        <TaskBoard />
        <DecisionsPanel />
      </details>
    </main>
  )
}
