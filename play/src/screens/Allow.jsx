import { useState } from 'react'
import { writeNotes } from '../lib/hooks'
import { PERMISSION_LINES, allowAll } from '../lib/permissions'
import { Seal } from './Moments'

// "To play tonight, allow these:" (§9.10). One Allow button, then a check
// beside each line, then on into the game. Shown once per night at sign-in;
// the You tab's Allow again link brings it back (onDone closes it). The Game
// test tab's Salem practice shows it too, going on to the practice instead.
export default function Allow({ uid, onDone = null, again = false, onward = 'On to the party' }) {
  const [got, setGot] = useState(null)
  const [busy, setBusy] = useState(false)
  const allow = async () => {
    setBusy(true)
    const r = await allowAll()
    setGot(r)
    setBusy(false)
  }
  const done = () => {
    if (!again && uid && uid !== 'preview') writeNotes(uid, { seen: { allow: true } }).catch(() => {})
    onDone?.()
  }
  const mark = v => (v === 'ok' ? '✓' : v === 'none' ? '–' : '✗')
  return (
    <div className="moment allow papered">
      <Seal />
      <p className="crest">To play tonight, allow these:</p>
      <ul className="allow-list">
        {PERMISSION_LINES.map(l => (
          <li key={l.key} className={got ? `allow-${got[l.key]}` : ''}>
            <span className="mark" aria-hidden="true">{got ? mark(got[l.key]) : '·'}</span>
            <span>{l.text}</span>
          </li>
        ))}
      </ul>
      {!got && <button className="big" disabled={busy} onClick={allow}>Allow</button>}
      {got && (
        <>
          {Object.values(got).some(v => v === 'denied') && <p className="gloss">Something said no. That is all right: the game works anyway. Ask the host if a shake game will not feel your phone.</p>}
          <button className="big" onClick={done}>{onward}</button>
        </>
      )}
    </div>
  )
}
