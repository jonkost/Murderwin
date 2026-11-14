// Irwin's progress bar over the counting screen (handoff 14 Nov 2026; lib/irwinbar.js says what it is told).
// A frame that fills the Parlour TV, on top of today's plain bar and lists, which stay drawn underneath:
//   wait   the first moments: a plain dark screen while the bar loads
//   bar    the bar has said it is there: it shows, and is started
//   plain  it never said so: the frame is hidden and the plain bar and lists show, as before
// The state is a data attribute, not a class: a class called "bar" met an old rule of that name in styles.css
// and squeezed the frame into a strip ten pixels high (found by filming it, 14 Nov 2026).
// The bar is started once, and again only when its key changes (a hold, a carry-on, a reload), never at a
// redraw: this screen redraws four times a second. A hold sends where the bar stands instead of a start.
import { useEffect, useRef, useState } from 'react'
import { irwinMessage, IRWIN_BAR_FILE, WAIT_MS } from '../lib/irwinbar'

const SRC = `${import.meta.env.BASE_URL}${IRWIN_BAR_FILE}?embed=1`

export default function IrwinBar({ finale, now }) {
  const frame = useRef(null)
  const told = useRef(null) // the key the bar was last told
  const [state, setState] = useState('wait')
  const { key, message } = irwinMessage(finale, now)
  const latest = useRef(message)
  latest.current = message

  useEffect(() => {
    const heard = (ev) => {
      // only from the wait: a screen that has fallen back to the plain bar stays on it, and never swaps part way through the count
      if (ev.source === frame.current?.contentWindow && ev.data?.type === 'irwin:ready') setState(s => (s === 'wait' ? 'bar' : s))
    }
    window.addEventListener('message', heard)
    const late = setTimeout(() => setState(s => (s === 'wait' ? 'plain' : s)), WAIT_MS)
    return () => { window.removeEventListener('message', heard); clearTimeout(late) }
  }, [])

  useEffect(() => {
    if (state !== 'bar' || told.current === key) return
    const bar = frame.current?.contentWindow
    if (!bar) return
    bar.postMessage(latest.current, window.location.origin)
    told.current = key
  }, [state, key])

  // the frame may have been ready before this screen was listening: ask it to say so again
  const hello = () => { try { frame.current?.contentWindow?.postMessage({ type: 'irwin:hello' }, window.location.origin) } catch { /* not there: the plain bar shows */ } }

  return (
    <div className="irwin-bar" data-state={state} aria-hidden="true">
      <iframe ref={frame} src={SRC} title="" tabIndex={-1} onLoad={hello} />
    </div>
  )
}
