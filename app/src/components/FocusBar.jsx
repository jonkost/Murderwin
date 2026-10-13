import { Link } from 'react-router-dom'

// Focus mode: a small goal for this sitting, and a bar that fills. The list's
// card stays on screen underneath, always.
export default function FocusBar({ goal, written, doneLine }) {
  const reached = goal > 0 && written >= goal
  const pct = Math.min(100, Math.round((written / Math.max(1, goal)) * 100))
  return (
    <div className={reached ? 'focus done' : 'focus'} role="status">
      {reached
        ? <><b>That’s {written}. Goal met.</b> {doneLine ? `${doneLine} ` : ''}Stop here, or keep going; either is a win. <Link to="/">Back home</Link></>
        : <><b>{goal - written} more</b> for this sitting, then stop. Written so far: {written}.</>}
      <span className="focus-bar"><span style={{ width: `${pct}%` }} /></span>
    </div>
  )
}
