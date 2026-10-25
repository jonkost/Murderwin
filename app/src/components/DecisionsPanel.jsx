import { useState } from 'react'
import { answerDecision } from '../lib/store'

// The panel that listed the open questions a second time in Home's fold
// came off on 24 Oct 2026; Home, Where we are and the Timeline each show
// them with this one component.

// One open question, its answers as buttons, and Confirm. Its note (the
// default, or why Claude Code asks it) shows under the question, and a
// question Claude Code will ask about when it gets there says so.
export function Decision({ d, onError, onSaved, canAnswer }) {
  const [picked, setPicked] = useState(null)
  return (
    <div className="decision">
      <p className="dq">{d.question}{d.who && <> <span className="tl-who">{d.who} will ask you</span></>}</p>
      {d.note && d.answer == null && <p className="hint">{d.note}</p>}
      <div className="dopts">
        {(d.options ?? []).map(opt => (
          <button key={opt}
            className={picked === opt ? 'tab active' : 'tab'}
            onClick={() => setPicked(p => (p === opt ? null : opt))}>
            {opt}
          </button>
        ))}
      </div>
      {picked && canAnswer && (
        <button className="primary confirm"
          onClick={() => answerDecision(d.key, picked, d).then(onSaved).catch(onError)}>
          Confirm: {picked}
        </button>
      )}
    </div>
  )
}
