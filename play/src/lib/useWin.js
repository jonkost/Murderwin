import { useEffect, useRef, useState } from 'react'

// True for `ms` after `on` turns from false to true while this screen is up,
// and never at first sight: a screen that reloads onto a finished game does
// not celebrate it a second time. For the big win on a room screen (B4; the
// look Jon approved on 12 Nov 2026, screen 4): Solved!, then the room's own
// finished page.
//
// `known`: the game's own record has arrived. A screen draws as soon as the
// night is in, which can be a moment before its game's record: until that
// record is here nothing is "first sight", or a reload onto a finished game
// would see not-won, then won, and play Solved! and the fanfare a second
// time (the review of 12 Nov 2026).
export const WIN_MS = 4200
// One look, pure (play/test/look.test.mjs): `was` is what the last look saw (null: nothing yet).
export function winStep(was, on, known = true) {
  if (!known) return { was, rose: false }
  return { was: !!on, rose: was === false && !!on }
}
export function useJustWon(on, known = true, ms = WIN_MS) {
  const was = useRef(null)
  const [won, setWon] = useState(false)
  useEffect(() => {
    if (!known) { setWon(false); return undefined }
    const { was: next, rose } = winStep(was.current, on, known)
    was.current = next
    if (!on) { setWon(false); return undefined }
    if (!rose) return undefined
    setWon(true)
    const id = setTimeout(() => setWon(false), ms)
    return () => clearTimeout(id)
  }, [on, known, ms])
  return won
}
