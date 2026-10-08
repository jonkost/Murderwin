import { useTick, writeNotes } from '../lib/hooks'

// The in-between screens. Every one of them is a real state, never an
// error view, and they look the same on every phone in the room.

export function Dark() {
  return <div className="moment dark" aria-label="Sirwin Manor" />
}

// A single line, held on a near-black screen. Used for the lobby doors, the
// pause, and the handed-over-phone notice.
export function Moment({ text, crest }) {
  return (
    <div className="moment">
      {crest && <p className="crest">Sirwin Manor</p>}
      <p className="moment-text">{text}</p>
    </div>
  )
}

// Phones stay dark through the blackout. Nothing on any screen.
export function Blackout() {
  return <div className="moment dark" aria-label="Blackout" />
}

const HOLD_MS = 15_000

// The power returns: every phone lights at once with its prompt. The prompt
// holds for fifteen seconds measured against the SERVER clock, then a hide
// button appears. Slower readers take as long as they like. Hiding is
// remembered, so a reload never shows it twice.
export function Prompt({ uid, night, ui, serverNow, promptKey }) {
  useTick(500)
  const phaseAt = night.phaseAt?.toMillis?.() ?? 0
  const remaining = phaseAt ? phaseAt + HOLD_MS - serverNow() : HOLD_MS
  const canHide = remaining <= 0
  const hide = () => writeNotes(uid, { seen: { [promptKey]: true } }).catch(() => {})
  return (
    <div className="moment prompt">
      <p className="crest">Sirwin Manor</p>
      <p className="moment-text">{ui.POWER}</p>
      <p className="moment-sub">Act {night.act} begins.</p>
      {canHide
        ? <button className="big" onClick={hide}>{ui.HIDE}</button>
        : <p className="hold" aria-live="polite">{ui.HOLD}</p>}
    </div>
  )
}
