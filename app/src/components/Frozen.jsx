import { useEffect, useState } from 'react'
import { subscribeGame } from '../lib/store'
import { frozenState } from '../lib/frozen'

// Is the workshop frozen for the party? One subscription to meta/game,
// shared by the rail chip, the editors and the Game night page.
export function useFrozen() {
  const [state, setState] = useState(() => frozenState(null))
  useEffect(() => subscribeGame(g => setState(frozenState(g)), () => {}), [])
  return state
}

// The banner at the top of a read-only list.
export function FrozenBanner({ state }) {
  if (!state?.frozen) return null
  return <div className="banner frozen" role="status">{state.banner}</div>
}
