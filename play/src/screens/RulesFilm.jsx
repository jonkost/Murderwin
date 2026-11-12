import { useEffect, useRef } from 'react'
import { Ground, Cat } from '../look/parts'
import { RULES_SLIDES, rulesAudioUrl } from '../lib/rulesfilm'

// The rules film on the Parlour TV (handoff 11 Nov 2026, A14; lib/rulesfilm.js):
// one slide at a time on the server's clock, Jon's recording for it playing
// from the TV's own sound. `at` is rulesFilmAt's answer for this moment, so a
// screen that reloads part-way lands on the right slide and joins the voice
// where it has got to. A screen nobody has clicked is refused sound by its
// browser: the slides still turn, and the Host tab has said so beforehand
// (No sound yet). &mute=1 in the address plays it silent, for trying a screen
// without waking the house.
const BASE = import.meta.env.BASE_URL
const MUTED = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('mute') === '1'

export default function RulesFilm({ at }) {
  const audio = useRef(null)
  const voiced = useRef(null) // the slide whose voice this screen has started
  const { slide, index, count, voice, startedAt } = at
  const speaking = voice != null
  useEffect(() => {
    const a = audio.current
    if (!a || !speaking || voiced.current === `${startedAt}:${index}`) return
    voiced.current = `${startedAt}:${index}`
    // a screen that joins part-way (a reload) starts the voice where the clock says
    try { if (voice > 0.5) a.currentTime = voice } catch { /* not loaded far enough yet: it starts from the top */ }
    const p = a.play()
    if (p?.catch) p.catch(() => {})
  }, [index, speaking, startedAt])
  const next = RULES_SLIDES[index + 1]
  return (
    <div className="lk-screen lk-rules full">
      <Ground />
      <Cat who={slide.who} n={slide.n} />
      <div className="lk-words">
        <div className="lk-words-in" key={slide.file}>
          <p className="lk-label">{slide.label ?? 'The rules'}</p>
          <h2 className="lk-big">{slide.title}</h2>
          <hr className="lk-rule" />
          <ul className="lk-rules-lines">{slide.lines.map(l => <li key={l}>{l}</li>)}</ul>
        </div>
      </div>
      <p className="lk-rules-n">{index + 1} of {count}</p>
      <div className="lk-rules-bar" aria-hidden="true"><i style={{ width: `${Math.min(100, (100 * (slide.at + at.into)) / at.total)}%` }} /></div>
      {slide.voiceMs > 0 && <audio ref={audio} key={slide.file} src={rulesAudioUrl(slide.file, BASE)} preload="auto" muted={MUTED} />}
      {/* the next slide's recording is fetched while this one plays, so it starts on its beat */}
      {next && <audio key={`next-${next.file}`} src={rulesAudioUrl(next.file, BASE)} preload="auto" muted />}
    </div>
  )
}
