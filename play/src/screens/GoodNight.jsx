// The Host tab's close of the night (handoff 11 Nov 2026, C1: "I'll open and
// close the night ... all through my phone"). Mounted once under Run the night.
//   The result beat: how long the credits have left on the Parlour TV, so The
//   End comes after them (Next is never blocked; this only says).
//   The End: one button, Good night. It marks the night over for good
//   (host command good-night, functions/lib/closing.js); every screen keeps
//   The End and the house keeps the jazz and the Default lights.
//   After it: one line, "The night is over. Good night."
// A second press is harmless: the server answers "already" and nothing moves.
import { useState } from 'react'
import { callHost } from '../firebase'
import { beatSpec } from '../lib/night'
import { roomEnded, nightClosed, creditsLeft, minutesText } from '../lib/closing'
import { troubleLine } from '../lib/trouble'
import { useTick } from '../lib/hooks'

export default function GoodNight({ night, finale = null, serverNow = null }) {
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState(null)
  const onResult = Number(night?.act) === 7 && beatSpec(7, night?.beat)?.action === 'results'
  useTick(onResult ? 1000 : 60_000)
  if (nightClosed(night)) return <p className="host-msg good-night" role="status">The night is over. Good night.</p>
  if (onResult) {
    const left = creditsLeft(finale, serverNow ? serverNow() : Date.now())
    if (left == null || left <= 0) return null
    return <p className="host-msg" role="status">The credits finish in {minutesText(left)}. Then Next for The End.</p>
  }
  if (!roomEnded(night)) return null
  const press = async () => {
    setBusy(true)
    setMsg(null)
    try {
      await callHost({ nightId: night.nightId, command: 'good-night' })
    } catch (e) {
      setMsg(`That didn’t work: ${troubleLine(e, 'press it again.')}`)
    } finally {
      setBusy(false)
    }
  }
  return (
    <div className="host-row good-night">
      <button className="big wide" disabled={busy} onClick={press}>Good night</button>
      {msg && <p className="host-msg trouble" role="alert">{msg}</p>}
    </div>
  )
}
