import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { subscribeArea, subscribeLatestValidation } from '../lib/store'
import { AREAS, AREA_GROUPS, TAB_KINDS } from '../lib/content'
import TaskBoard from '../components/TaskBoard'
import DecisionsPanel from '../components/DecisionsPanel'

function Row({ label, count, goal, to, suffix }) {
  const pct = goal ? Math.min(100, Math.round((count / goal) * 100)) : 0
  return (
    <Link to={to} className="prow">
      <span className="plabel">{label}</span>
      <span className="pcount">{count} / {goal}{suffix ?? ''}</span>
      <span className="pbar"><span style={{ width: `${pct}%` }} /></span>
    </Link>
  )
}

// Per-tab breakdown rows for the founding layers the spec calls out
// (openers/closers per cat, pools per pool); other tabbed areas get one
// row — their editor tabs carry the breakdown.
const PER_TAB_ROWS = ['openers', 'closers', 'refusals', 'pools']

function areaRows(area, spec, items) {
  const live = items.filter(i => !i.deleted)
  if (spec.checklist) {
    const done = live.filter(i => i.done).length
    return [{ key: area, label: spec.label, count: done, goal: live.length, suffix: ' done', to: `/edit/${area}` }]
  }
  if (spec.tabs && PER_TAB_ROWS.includes(area)) {
    const tabDef = TAB_KINDS[spec.tabs]
    return tabDef.list.map(t => ({
      key: `${area}-${t}`,
      label: `${spec.label} — ${tabDef.label(t)}`,
      count: live.filter(i => i[tabDef.field] === t).length,
      goal: spec.goalPerTab,
      to: `/edit/${area}?tab=${t}`,
    }))
  }
  const goal = spec.tabs ? spec.goalPerTab * TAB_KINDS[spec.tabs].list.length : spec.goal
  const to = area === 'templates' ? '/stationery' : `/edit/${area}`
  return [{ key: area, label: spec.label, count: live.length, goal, to }]
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

  return (
    <main className="dash">
      {AREA_GROUPS.map(group => (
        <section className="panel" key={group}>
          <h2>{group}</h2>
          {Object.entries(AREAS)
            .filter(([, spec]) => spec.group === group)
            .flatMap(([area, spec]) => areaRows(area, spec, data[area] ?? []))
            .map(r => <Row key={r.key} {...r} />)}
        </section>
      ))}
      <section className="panel">
        <h2>Sealed coverage</h2>
        <div className="prow static">
          <span className="plabel">Kernels · documents · echoes</span>
          <span className="pcount">
            {validation === null
              ? 'no validator report yet'
              : `${validation.complete}/${validation.codes} codes complete — ${validation.pass ? 'validated ✓' : 'FAILING'}`}
          </span>
        </div>
        {validation !== null && !validation.pass && (
          <p className="hint">
            Aggregate issues: {['banned', 'lengthFails', 'placeholderFails', 'granoliaFails', 'salemFails', 'impersonalFails']
              .filter(k => validation[k] > 0)
              .map(k => `${k} ${validation[k]}`)
              .join(' · ') || 'coverage incomplete'}. Re-run generation.
          </p>
        )}
        {validation !== null && validation.bannedGlobal > 0 && (
          <p className="hint">
            Advisory: {validation.bannedGlobal} texts share a word with some
            other motive's rhyme (doesn't gate the pass).
          </p>
        )}
      </section>
      <TaskBoard />
      <DecisionsPanel />
    </main>
  )
}
