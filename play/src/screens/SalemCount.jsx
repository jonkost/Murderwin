import { useEffect, useRef } from 'react'
import { salemView, SALEM_WORDS } from '../lib/salem'
import { celebrate } from '../lib/celebrate'

// Get Off My Lawn!'s countdown (A9, 12 Nov 2026; Jon: "a countdown as far
// as how well you have to do, or a little bit more communication"), on every
// phone in the game and on the Orangerie's screen: the round in words, the
// thirty clean seconds as a big number counting down (once the round is
// under way; the three-second lead has its own big count), and the slips
// left. Read from the record and the caller's server clock (lib/salem.js).
// The look around it stays as it was: the colour, Salem floating.
export function SalemCount({ doc, now, className = '' }) {
  const v = salemView(doc, now)
  if (!v.playing) return null
  return (
    <div className={`salem-countdown${className ? ` ${className}` : ''}`}>
      <p className="salem-countdown-round">{SALEM_WORDS.round(v.round, v.rounds)}</p>
      {v.started && v.cleanLeft != null && (
        <p className={`salem-countdown-clean${v.cleanLeft <= 10 ? ' last' : ''}`} aria-hidden="true">{v.cleanLeft}</p>
      )}
      {v.slipsLeft != null && <p className="salem-countdown-slips">{SALEM_WORDS.slipsLeft(v.slipsLeft)}</p>}
    </div>
  )
}

// The game's wins and misses, as the record changes (B4's celebrate, one
// call each, so the look can restyle them): a round passed is medium, the
// game cleared is big, a slip (a fresh attempt of the same round) is a miss.
// The first reading of the record celebrates nothing, so a reload is quiet.
export function useSalemWins(doc, { quiet = false } = {}) {
  const prev = useRef(null)
  const state = doc?.state ?? null
  const attempt = Number(doc?.attempt) || 0
  const round = Number(doc?.round) || 0
  useEffect(() => {
    const p = prev.current
    prev.current = { state, attempt, round }
    if (!p || !state) return
    if (state === 'cleared' && p.state !== 'cleared') celebrate('big', { quiet })
    else if (state === 'passed' && p.state === 'playing') celebrate('medium', { quiet })
    else if (state === 'playing' && p.state === 'playing' && round === p.round && attempt > p.attempt) celebrate('miss', { quiet })
  }, [state, attempt, round, quiet])
}
