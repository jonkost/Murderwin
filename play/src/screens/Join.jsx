import { useState } from 'react'
import { callJoin } from '../firebase'

// "Who are you?" — one tap on your own name. The game assigns the character.
export default function Join({ uid, night, ui }) {
  const [busy, setBusy] = useState(null)
  const [error, setError] = useState(null)
  const guests = night.guests ?? []
  const roster = night.roster ?? {}

  const pick = async (guest) => {
    setBusy(guest.key)
    setError(null)
    try {
      await callJoin({ nightId: night.nightId, guestKey: guest.key })
      // the session doc arrives through its own listener; nothing else to do
    } catch (e) {
      setError(e?.message || 'The Manor did not answer. Try again.')
      setBusy(null)
    }
  }

  if (!night.joinOpen) return (
    <div className="moment">
      <p className="crest">Sirwin Manor</p>
      <p className="moment-text">{ui.DOORS}</p>
    </div>
  )

  return (
    <main className="join">
      <p className="crest">Sirwin Manor</p>
      <h1 className="ask">{ui.JOIN}</h1>
      {guests.length === 0 && <p className="moment-text">{ui['JOIN NONE']}</p>}
      <ul className="names">
        {guests.map(g => {
          const taken = !!roster[g.key]
          return (
            <li key={g.key}>
              <button className="name" disabled={busy !== null} onClick={() => pick(g)}>
                <span>{g.name}</span>
                {taken && <small>{ui['JOIN TAKEN']}</small>}
              </button>
            </li>
          )
        })}
      </ul>
      {busy && <p className="moment-sub">One moment…</p>}
      {error && <p className="trouble" role="alert">{error}</p>}
    </main>
  )
}
