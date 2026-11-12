import { useEffect, useState } from 'react'
import { startWords, liveLine, REPLACE_ASK, AFTER_START, SCREENS, screenUrl } from '../lib/startNight'
import { PLAY_URL } from '../lib/config'
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
  const [note, setNote] = useState(null)
  const send = async (s) => {
    const url = screenUrl(PLAY_URL, s.kiosk)
    setNote(null)
    try {
      if (navigator.share) await navigator.share({ title: s.room, url })
      else { await navigator.clipboard.writeText(url); setNote(`Copied the address for ${s.room}.`) }
    } catch (e) {
      if (e?.name !== 'AbortError') setNote('That did not send. Tap it again.')
    }
  }
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
      <h3 className="send-head">Send each screen its page</h3>
      <p className="hint">Tap Send, pick AirDrop, pick the machine. Its page opens there; click once on it to make it full screen.</p>
      <ul className="send-list">
        {SCREENS.map(s => (
          <li key={s.kiosk}>
            <span className="send-name">{s.room}<small>{s.machine}</small></span>
            <button className="ghost" onClick={() => send(s)}>Send</button>
          </li>
        ))}
      </ul>
      {note && <p className="start-done" role="status">{note}</p>}
    </section>
  )
}
