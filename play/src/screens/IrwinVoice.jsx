import { useEffect, useRef } from 'react'
import { voiceUrl, voiceFrom } from '../lib/irwinvoice'

// Sir Irwin's voice for one slide (or his door line) on the Parlour TV
// (handoff 11 Nov 2026, A7 step 3; lib/irwinvoice.js). Give it a `key` that
// is new for each slide, so each one speaks once. `into` is how far into the
// slide the server's clock is as it mounts: a screen reloaded part-way joins
// the voice there, and one that comes in after the end says nothing. A play
// the browser refuses (the screen was never clicked) is let go: the slide's
// time is the server's, never the sound's. &mute=1 in the address keeps it
// silent, for trying a screen without waking the house.
const BASE = import.meta.env.BASE_URL
const MUTED = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('mute') === '1'

export default function IrwinVoice({ id, voiceMs, into = 0 }) {
  const audio = useRef(null)
  const from = useRef(voiceFrom(into, voiceMs)) // fixed as it mounts
  useEffect(() => {
    const a = audio.current
    if (!a || from.current == null) return
    try { if (from.current > 0) a.currentTime = from.current } catch { /* not loaded that far yet: from the top */ }
    const p = a.play()
    if (p?.catch) p.catch(() => {})
    return () => { try { a.pause() } catch { /* gone */ } }
  }, [])
  if (!id || from.current == null) return null
  return <audio ref={audio} src={voiceUrl(id, BASE)} preload="auto" muted={MUTED} />
}
