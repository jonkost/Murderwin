import { useEffect, useState } from 'react'
import { subscribeDecisions, answerDecision } from '../lib/store'

function Decision({ d, onError, onSaved }) {
  const [picked, setPicked] = useState(null)
  return (
    <div className="decision">
      <p className="dq">{d.question}</p>
      <div className="dopts">
        {(d.options ?? []).map(opt => (
          <button key={opt}
            className={picked === opt ? 'tab active' : 'tab'}
            onClick={() => setPicked(p => (p === opt ? null : opt))}>
            {opt}
          </button>
        ))}
      </div>
      {picked && (
        <button className="primary confirm"
          onClick={() => answerDecision(d.key, picked, d).then(onSaved).catch(onError)}>
          Confirm: {picked}
        </button>
      )}
    </div>
  )
}

export default function DecisionsPanel() {
  const [decisions, setDecisions] = useState([])
  const [loadErr, setLoadErr] = useState(false)
  const [saveErr, setSaveErr] = useState(false)

  useEffect(() => subscribeDecisions(ds => { setDecisions(ds); setLoadErr(false) },
    () => setLoadErr(true)), [])

  const open = decisions.filter(d => d.answer == null)
  if (!open.length && !loadErr && !saveErr) return null

  return (
    <section className="panel">
      <h2>Decisions awaiting you</h2>
      {saveErr && (
        <div className="banner error" role="alert">
          SAVE FAILED — that answer was NOT recorded. Pick and confirm again.
        </div>
      )}
      {loadErr && (
        <div className="banner error" role="alert">
          Couldn’t load decisions — check your connection.
        </div>
      )}
      {open.sort((a, b) => a.key.localeCompare(b.key)).map(d => (
        <Decision key={d.key} d={d} onError={() => setSaveErr(true)}
          onSaved={() => setSaveErr(false)} />
      ))}
    </section>
  )
}
