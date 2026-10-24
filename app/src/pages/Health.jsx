import { useEffect, useState } from 'react'
import { subscribeChecks } from '../lib/store'
import { healthView, ALL_CLEAR, RUN_AGAIN } from '../lib/health'

// Health (docs/test-plan.md, "The results page Jon reads"): the last run of
// npm run checks, one line per group, a tick or a cross and a count. Under a
// cross: the check's ID, its plain name and the stand-in case. Nothing else,
// and no Run again button: the checks run on the Mac, not in the browser.
export default function Health() {
  const [record, setRecord] = useState(undefined)
  const [err, setErr] = useState(false)
  useEffect(() => subscribeChecks(r => { setRecord(r); setErr(false) }, () => setErr(true)), [])
  const v = healthView(record)
  return (
    <main className="dash">
      <section className="panel health">
        <h2>Health</h2>
        {err && <div className="banner error" role="alert">Could not read the last run. Check the connection and reload.</div>}
        {record === undefined && !err && <p className="hint">Reading the last run…</p>}
        {record !== undefined && v.empty && <p className="health-line">The checks have not been run yet.</p>}
        {v.allClear && <p className="health-clear">{ALL_CLEAR}</p>}
        <ul className="health-groups">
          {v.groups.map(g => (
            <li key={g.name}>
              <p className={`health-line ${g.ok ? 'ok' : 'bad'}`}><span aria-hidden="true">{g.ok ? '✓' : '✗'}</span> {g.line}</p>
              {g.failed.length > 0 && (
                <ul className="health-failed">
                  {g.failed.map((f, i) => <li key={`${f.id}-${i}`}><b>{f.id}</b> {f.name} <span className="hint">{f.seed}</span></li>)}
                </ul>
              )}
            </li>
          ))}
        </ul>
        {v.when && <p className="hint">Last run: {v.when}.</p>}
        <p className="why">{RUN_AGAIN}</p>
      </section>
    </main>
  )
}
