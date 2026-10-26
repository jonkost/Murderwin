import { useEffect } from 'react'
import { useTick, writeNotes } from '../lib/hooks'
import { buzzOnce, promptHold } from '../lib/night'

// The in-between screens. Every one of them is a real state, never an
// error view, and they look the same on every phone in the room.

export function Dark() {
  return <div className="moment dark" aria-label="Sirwin Manor" />
}

// A single line, held on a near-black screen. Used for the lobby doors, the
// pause, and the handed-over-phone notice.
export function Seal() {
  return <img className="seal" src={`${import.meta.env.BASE_URL}brand/seal.png`} alt="" />
}

export function Moment({ text, crest, foot }) {
  return (
    <div className="moment papered">
      {crest && <Seal />}
      {crest && <p className="crest">Sirwin Manor</p>}
      <p className="moment-text">{text}</p>
      {foot}
    </div>
  )
}

// Phones stay dark through the blackout. Nothing on any screen.
export function Blackout() {
  return <div className="moment dark" aria-label="Blackout" />
}

// The strip across the top when the house cannot be reached: the phone is
// off the network, or Firestore has painted from its cache for twenty
// seconds. Says how long ago the house was last heard from, so the host can
// tell a blink from an outage. Nothing is lost either way.
export function Offline({ ui, seconds }) {
  return (
    <div className="offline" role="status">
      {ui.OFFLINE}
      {seconds != null && seconds >= 5 ? <span className="offline-since"> Last heard from the house {seconds} s ago.</span> : null}
    </div>
  )
}

// The strip over a window the host has paused: the choices stay on screen
// but nothing can be tapped and the clock stands still.
export function PausedStrip({ ui }) {
  return <div className="paused-strip" role="status">{ui['PAUSED BY HOST']}</div>
}

// A rehearsal night (lib/night.js isRehearsalNight): a big red band fixed
// across the top of every phone and room screen, never on the party night,
// never while the room is dark. The page moves down by the band's height
// (html.rehearsal-on in styles.css), so the band never covers anything.
// The Game test tab's practice pages wear the same band, saying PRACTICE.
export function RehearsalBand({ on, label = 'REHEARSAL' }) {
  useEffect(() => {
    if (!on || typeof document === 'undefined') return
    const root = document.documentElement
    root.classList.add('rehearsal-on')
    return () => root.classList.remove('rehearsal-on')
  }, [on])
  if (!on) return null
  return <div className="rehearsal-band" role="note">{label}</div>
}

// The power returns: every phone lights at once with its prompt, on a
// near-black ground like the blackout it follows, and buzzes once. The
// prompt holds for fifteen seconds measured against the SERVER clock, then a
// hide button appears. Slower readers take as long as they like. Hiding is
// remembered per night, so a reload never shows it twice and a rehearsal
// never hides it on the real night. A phone with no role card yet (a late
// arrival) shows the same shape of screen with the orientation line in the
// card's place, so no phone in the room looks different from the rest.
export function Prompt({ uid, night, ui, serverNow, promptKey, card, notes }) {
  useTick(500)
  const { canHide } = promptHold(night, serverNow)
  const buzzKey = card?.id ?? promptKey
  useEffect(() => {
    if (!uid || uid === 'preview') return
    const vibrate = typeof navigator !== 'undefined' && navigator.vibrate ? p => navigator.vibrate(p) : null
    if (buzzOnce(buzzKey, notes, vibrate)) writeNotes(uid, { buzzed: { [buzzKey]: true } }).catch(() => {})
  }, [uid, buzzKey, notes])
  const hide = () => writeNotes(uid, { seen: { [promptKey]: true } }).catch(() => {})
  return (
    <div className="moment prompt">
      <Seal />
      <p className="crest">Sirwin Manor</p>
      <p className="moment-text role-card">{card ? card.text : ui.ORIENT}</p>
      <p className="moment-sub">Act {night.act} begins. Eyes on your own phone.</p>
      {canHide
        ? <button className="big" onClick={hide}>{ui.HIDE}</button>
        : <p className="hold" aria-live="polite">{ui.HOLD}</p>}
    </div>
  )
}
