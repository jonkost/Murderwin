import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { subscribeArea } from '../lib/store'
import { AREAS, CATS, POOLS } from '../lib/content'

function Row({ label, count, goal, to }) {
  const pct = Math.min(100, Math.round((count / goal) * 100))
  return (
    <Link to={to} className="prow">
      <span className="plabel">{label}</span>
      <span className="pcount">{count} / {goal}</span>
      <span className="pbar"><span style={{ width: `${pct}%` }} /></span>
    </Link>
  )
}

export default function Dashboard() {
  const [data, setData] = useState({})

  useEffect(() => {
    const unsubs = Object.keys(AREAS).map(area =>
      subscribeArea(area, items => setData(d => ({ ...d, [area]: items })), () => {}))
    return () => unsubs.forEach(u => u())
  }, [])

  const live = (area, filter) =>
    (data[area] ?? []).filter(i => !i.deleted && (!filter || filter(i))).length

  return (
    <main className="dash">
      <section className="panel">
        <h2>Progress</h2>
        {CATS.map(c => (
          <Row key={`o-${c.key}`} label={`Openers — ${c.name}`} to={`/edit/openers?tab=${c.key}`}
            count={live('openers', i => i.cat === c.key)} goal={AREAS.openers.goalPerTab} />
        ))}
        {CATS.map(c => (
          <Row key={`c-${c.key}`} label={`Closers — ${c.name}`} to={`/edit/closers?tab=${c.key}`}
            count={live('closers', i => i.cat === c.key)} goal={AREAS.closers.goalPerTab} />
        ))}
        {POOLS.map(p => (
          <Row key={`p-${p}`} label={`Pool — ${p}`} to={`/edit/pools?tab=${p}`}
            count={live('pools', i => i.pool === p)} goal={AREAS.pools.goalPerTab} />
        ))}
        <Row label="Echo frames" to="/edit/echo_frames"
          count={live('echo_frames')} goal={AREAS.echo_frames.goal} />
        <Row label="Stationery templates" to="/edit/templates"
          count={live('templates')} goal={AREAS.templates.goal} />
        <div className="prow static">
          <span className="plabel">Sealed coverage</span>
          <span className="pcount">no validator report yet</span>
        </div>
      </section>
      <section className="panel">
        <h2>What's next</h2>
        <p className="hint">
          Task board and decisions land here next. For now: pick a thin bar above
          and fill it. Boo's closers are the proving ground.
        </p>
      </section>
    </main>
  )
}
