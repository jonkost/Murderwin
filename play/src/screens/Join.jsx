import { useState } from 'react'
import { callJoin } from '../firebase'
import { Seal } from './Moments'

// "Who are you?" — type your name, and the game hands you a character.
// Back on a new phone? Tap your name in the list and the character follows.
export default function Join({ night, ui }) {
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const roster = Object.values(night.roster ?? {}).sort((a, b) => a.name.localeCompare(b.name))

  const go = async (chosen) => {
    const n = (chosen ?? name).trim()
    if (!n) return
    setBusy(true)
    setError(null)
    try {
      await callJoin({ nightId: night.nightId, name: n })
      // the session doc arrives through its own listener; nothing else to do
    } catch (e) {
      setError(e?.message || 'The Manor did not answer. Try again.')
      setBusy(false)
    }
  }

  if (!night.joinOpen) return (
    <div className="moment papered">
      <Seal />
      <p className="crest">Sirwin Manor</p>
      <p className="moment-text">{ui.DOORS}</p>
    </div>
  )

  return (
    <main className="join papered">
      <Seal />
      <p className="crest">Sirwin Manor</p>
      <h1 className="ask">{ui.JOIN}</h1>
      <form className="join-form" onSubmit={e => { e.preventDefault(); go() }}>
        <input
          className="name-input"
          type="text"
          inputMode="text"
          autoComplete="given-name"
          autoCapitalize="words"
          maxLength={30}
          placeholder="Your name"
          aria-label="Your name"
          value={name}
          onChange={e => setName(e.target.value)}
          disabled={busy}
          autoFocus
        />
        <button className="big" type="submit" disabled={busy || !name.trim()}>
          {busy ? 'One moment…' : ui['JOIN BUTTON']}
        </button>
      </form>
      {error && <p className="trouble" role="alert">{error}</p>}
      {roster.length > 0 && (
        <section className="again">
          <p className="gloss">{ui['JOIN AGAIN']}</p>
          <ul className="names">
            {roster.map(r => (
              <li key={r.name}>
                <button className="name" disabled={busy} onClick={() => go(r.name)}>{r.name}</button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  )
}
