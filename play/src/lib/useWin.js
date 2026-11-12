import { useEffect, useRef, useState } from 'react'

// True for `ms` after `on` turns from false to true while this screen is up,
// and never at first sight: a screen that reloads onto a finished game does
// not celebrate it a second time. For the big win on a room screen (B4; the
// look Jon approved on 12 Nov 2026, screen 4): Solved!, then the room's own
// finished page.
export const WIN_MS = 4200
export function useJustWon(on, ms = WIN_MS) {
  const was = useRef(null)
  const [won, setWon] = useState(false)
  useEffect(() => {
    const rose = was.current === false && !!on
    was.current = !!on
    if (!on) { setWon(false); return undefined }
    if (!rose) return undefined
    setWon(true)
    const id = setTimeout(() => setWon(false), ms)
    return () => clearTimeout(id)
  }, [on, ms])
  return won
}
