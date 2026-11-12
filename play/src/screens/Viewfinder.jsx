import { useEffect, useRef, useState } from 'react'
import { callMeet } from '../firebase'
import { PLAY_URL } from '../lib/config'
import { scanTarget, SCAN_LINES } from '../lib/scan'
import { startScanner } from '../lib/scanner'
import { play as playSound, unlock as unlockSound } from '../lib/soundkit'
import { troubleLine } from '../lib/trouble'

// The full-screen viewfinder (A12): the camera's picture, one line and Close.
// A code the house knows is acted on at once, with a ding and no reload: a
// cat's or a game room's code makes the same call the address makes
// (App.jsx, callMeet), and a refusal shows under the next step, as it does
// for the address; the join code needs nothing (this phone is already in).
// Any other code says so and the camera keeps looking. The camera stops when
// this closes, when the page is hidden, and when it is taken off the screen.
// The picture never leaves the phone.
export default function Viewfinder({ nightId, onNote, onClose }) {
  const video = useRef(null)
  const [line, setLine] = useState(SCAN_LINES.point)
  const [refused, setRefused] = useState(false)
  const last = useRef({ text: null, at: 0 })
  const done = useRef(false)

  useEffect(() => {
    let stop = null
    let live = true
    unlockSound().catch(() => {}) // the tap that opened this is a person's own: the ding may play
    const read = (text) => {
      if (done.current) return
      const t = Date.now()
      if (text === last.current.text && t - last.current.at < 2000) return // the same code, held up: once
      last.current = { text, at: t }
      const target = scanTarget(text, { playUrl: PLAY_URL, origin: window.location.origin })
      if (target.kind === 'other') { setLine(SCAN_LINES.unknown); return }
      done.current = true
      playSound('ding')
      if (target.kind === 'meet' && nightId && nightId !== 'preview') {
        callMeet({ nightId, cat: target.cat }).then(() => onNote(null)).catch(e => onNote(troubleLine(e, 'The cat did not answer. Try the code again.')))
      }
      onClose()
    }
    startScanner(video.current, read)
      .then(s => { if (live) stop = s; else s() })
      .catch(() => { if (live) { setRefused(true); setLine(SCAN_LINES.refused) } })
    // a hidden page closes the viewfinder, and with it the camera
    const hide = () => { if (document.visibilityState === 'hidden') onClose() }
    document.addEventListener('visibilitychange', hide)
    return () => {
      live = false
      document.removeEventListener('visibilitychange', hide)
      if (stop) stop()
    }
  }, [])

  return (
    <div className="viewfinder" role="dialog" aria-modal="true" aria-label="Scan a code">
      <video ref={video} className="viewfinder-video" playsInline muted />
      {!refused && <div className="viewfinder-frame" aria-hidden="true" />}
      <p className="viewfinder-line" aria-live="polite">{line}</p>
      <button type="button" className="big viewfinder-close" onClick={onClose}>Close</button>
    </div>
  )
}
