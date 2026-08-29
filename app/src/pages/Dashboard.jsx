import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { subscribeArea } from '../lib/store'
import { AREAS, AREA_GROUPS, TAB_KINDS, CATS } from '../lib/content'

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

// Per-cat breakdown rows for the two founding voice layers; every other
// area gets one row (its editor tabs carry the breakdown).
const PER_CAT_ROWS = ['openers', 'closers']

function areaRows(area, spec, items) {
  const live = items.filter(i => !i.deleted)
  if (spec.checklist) {
    const done = live.filter(i => i.done).length
    return [{ key: area, label: spec.label, count: done, goal: live.length, suffix: ' done', to: `/edit/${area}` }]
  }
  if (PER_CAT_ROWS.includes(area)) {
    return CATS.map(c => ({
      key: `${area}-${c.key}`,
      label: `${spec.label} — ${c.name}`,
      count: live.filter(i => i.cat === c.key).length,
      goal: spec.goalPerTab,
      to: `/edit/${area}?tab=${c.key}`,
    }))
  }
  const goal = spec.tabs ? spec.goalPerTab * TAB_KINDS[spec.tabs].list.length : spec.goal
  return [{ key: area, label: spec.label, count: live.length, goal, to: `/edit/${area}` }]
}

export default function Dashboard() {
  const [data, setData] = useState({})

  useEffect(() => {
    const unsubs = Object.keys(AREAS).map(area =>
      subscribeArea(area, items => setData(d => ({ ...d, [area]: items })), () => {}))
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
          <span className="pcount">no validator report yet</span>
        </div>
      </section>
      <section className="panel">
        <h2>What's next</h2>
        <p className="hint">
          Pick a thin bar and fill it. The guides at the top of each editor say
          what the layer is and how to test a line. Decisions and the task board
          land on this page next.
        </p>
      </section>
    </main>
  )
}
