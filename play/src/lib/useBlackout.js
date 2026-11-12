import { useEffect, useState } from 'react'
import { markTimes, ms } from './blackout'

// Wake the page at the blackout's dark and power marks (A1, 11 Nov 2026), on
// the server's clock, so it goes dark at the mark and not up to a second
// later at the next tick. `night` is the night doc, `serverNow` the clock.
export function useBlackoutMarks(night, serverNow) {
  const [, setBeat] = useState(0)
  const key = night?.blackout ? `${ms(night.blackout.pressAt)}` : null
  useEffect(() => {
    if (!key) return undefined
    const now = serverNow()
    const timers = markTimes(night, now).map(t => setTimeout(() => setBeat(b => b + 1), t - now + 1))
    return () => timers.forEach(clearTimeout)
  }, [key])
}
