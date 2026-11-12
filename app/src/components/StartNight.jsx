import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { startWords, liveLine, REPLACE_ASK, AFTER_START } from '../lib/startNight'
import { startNight } from '../lib/startNightApi'
import { gameTestApi } from '../lib/gameTestApi'

// The big Start button (12 Nov 2026): one press starts the night for the
// whole house. A run-through unless the box is ticked; the server refuses the
// real night before the party day.
export default function StartNight() {
  const [real, setReal] = useState(false)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState(null)
  const [err, setErr] = useState(null)
  const [live, setLive] = useState(null)
  useEffect(() => gameTestApi().subscribeLive(setLive, () => setLive({ nightId: null, night: null })), [])
  const words = startWords({ real })
  const start = async () => {
    if (live?.nightId && live?.night && !window.confirm(REPLACE_ASK)) return
    setBusy(true); setMsg(null); setErr(null)
    try {
      await startNight({ real })
      setMsg(AFTER_START)
    } catch (e) {
      setErr(e?.message && !/internal/i.test(e.message) ? e.message : 'That did not start. Check your signal and press it again.')
    } finally {
      setBusy(false)
    }
  }
  return (
    <section className="panel start-panel">
      <h2>Start the night</h2>
      <p className="why">{liveLine(live)}</p>
      <button className="primary start-big" disabled={busy} onClick={start}>{busy ? 'Starting…' : words.button}</button>
      <label className="field check start-real">
        <input type="checkbox" checked={real} disabled={busy} onChange={e => setReal(e.target.checked)} />
        <span>This is the real night</span>
      </label>
      <p className="hint">{words.note}</p>
      {msg && <p className="start-done" role="status">{msg}</p>}
      {err && <div className="banner error" role="alert">{err}</div>}
      <p className="night-line"><Link className="ghost dl" to="/devices">Every screen and its address</Link></p>
    </section>
  )
}
