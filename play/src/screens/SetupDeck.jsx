import { useEffect, useState } from 'react'
import { checkDeck, connectDeck, deckKey, deckProblem } from '../lib/deckline'

// The Stream Deck line under Boo's button on /setup (A11, lib/deckline.js):
// one plain line and the one button it needs. On the machine whose last
// choice was Boo's it looks by itself; elsewhere it waits for Check the
// Stream Deck, so the other machines' page stays as it was.
export default function SetupDeck({ auto = false }) {
  const [state, setState] = useState(null)
  const [busy, setBusy] = useState(false)
  const look = async (how = checkDeck) => {
    setBusy(true)
    try { setState(await how()) } finally { setBusy(false) }
  }
  useEffect(() => { if (auto) look() }, [auto])
  const key = state ? deckKey(state) : null
  return (
    <div className="setup-first setup-deck">
      {key && <p className={`setup-deck-line deck-${key}`} role="status">{deckProblem(state)}</p>}
      {!key && <button type="button" disabled={busy} onClick={() => look()}>Check the Stream Deck</button>}
      {(key === 'connect' || key === 'unseen') && <button type="button" disabled={busy} onClick={() => look(connectDeck)}>Connect</button>}
      {(key === 'busy' || key === 'unseen' || key === 'ready') && <button type="button" disabled={busy} onClick={() => look()}>Check again</button>}
    </div>
  )
}
