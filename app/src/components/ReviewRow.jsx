import { useEffect, useState } from 'react'
import { subscribeReviews, saveReview, whoAmI } from '../lib/store'

// Jenna's two words for a list: Reads clearly, or Needs another look, with
// one line of note. Jon sees it too. Anyone on staff can set it; the
// workshop records who did.
export const REVIEW_STATES = [
  { key: 'clear', label: 'Reads clearly' },
  { key: 'again', label: 'Needs another look' },
]

export function useReviews() {
  const [reviews, setReviews] = useState({})
  useEffect(() => subscribeReviews(setReviews, () => {}), [])
  return reviews
}

export default function ReviewRow({ area }) {
  const reviews = useReviews()
  const [me, setMe] = useState(null)
  const [note, setNote] = useState(null) // null = not touched locally
  const [err, setErr] = useState(false)
  useEffect(() => { whoAmI().then(setMe) }, [])
  const r = reviews[area] ?? {}
  const shownNote = note ?? r.note ?? ''

  // Only the Steward sets the read; Jon sees it. Writes carry just the
  // change, so a note and a switch tapped a moment apart both survive.
  const canSet = me?.name === 'Jenna' || me?.name === 'Preview'
  const set = (patch) => {
    setErr(false)
    saveReview(area, patch, r).then(() => { if ('note' in patch) setNote(null) }).catch(() => setErr(true))
  }

  if (!canSet) {
    if (!r.state && !r.note) return null
    const label = REVIEW_STATES.find(s => s.key === r.state)?.label
    return (
      <p className="review-line" aria-label="Jenna’s read">
        <b>Jenna’s read:</b> {label ?? ''}{label && r.note ? '. ' : ''}{r.note ?? ''}
      </p>
    )
  }
  return (
    <div className="review" aria-label="Jenna’s read">
      <span className="review-label">{canSet ? 'Your read, Jenna:' : 'Jenna’s read:'}</span>
      <div className="review-switch" role="group">
        {REVIEW_STATES.map(s => (
          <button key={s.key} className={r.state === s.key ? 'tab active' : 'tab'} disabled={!canSet}
            onClick={() => set({ state: r.state === s.key ? '' : s.key })}>{s.label}</button>
        ))}
      </div>
      <input type="text" className="review-note" placeholder={canSet ? 'One line, if anything needs saying' : 'No note yet'} value={shownNote} disabled={!canSet}
        onChange={e => setNote(e.target.value)}
        onBlur={() => { if (note !== null && note !== (r.note ?? '')) set({ note }) }}
        onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur() }} />
      {r.by?.name && r.state && <span className="hint">{r.by.name}, {new Date(r.at ?? 0).toLocaleDateString([], { day: 'numeric', month: 'short' })}</span>}
      {err && <span className="error">That did not save. Try again with signal.</span>}
    </div>
  )
}
