import { useMemo, useState } from 'react'
import { callAnswer, callBallot, callEliminate } from '../firebase'
import { useTick } from '../lib/hooks'
import { characterById, motives } from '../lib/content'
import { ms, secondsLeft } from '../lib/night'
import { THANKS, answerOutcome, outcomeForError } from '../lib/windows'
import { Seal } from './Moments'
import { HostLine } from './Cards'

// The moments when every phone lights up at once. Each one is a full
// screen, the same on every phone, measured against the server's clock.
// Nothing here shows a number for points, and nothing closes early: when
// the time is up the phone simply goes back to rest, and the server picks
// for anyone who did not.

function Clock({ w, serverNow }) {
  useTick(500)
  const left = secondsLeft(w, serverNow)
  const total = Math.max(1, (ms(w.closesAt) - ms(w.opensAt)) / 1000)
  return (
    <div className="clock" aria-live="off">
      <div className="bar"><div className="bar-fill" style={{ width: `${Math.min(100, (left / total) * 100)}%` }} /></div>
      <p className="gloss">{left} seconds</p>
    </div>
  )
}

// The same last screen for every answer: in time, late (the server had
// already picked for this phone), or sent twice. One tap to put it away.
export function Thanks({ onDone }) {
  return (
    <div className="moment window papered">
      <Seal />
      <p className="crest">{THANKS.title}</p>
      <p className="moment-text">{THANKS.text}</p>
      <button className="big" onClick={onDone}>{THANKS.button}</button>
    </div>
  )
}

// Three silly questions, one at a time, two big buttons. A cat is secretly
// listening to each question, and the phone never says which.
export function Questions({ w, nightId, serverNow, onDone }) {
  const set = w.mine
  const [i, setI] = useState(0)
  const [picks, setPicks] = useState([])
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState(null)
  const beat = set.beats?.[i]

  const retry = (message) => {
    setError(message || 'The Manor did not hear that. Try again.')
    setPicks([]); setI(0); setBusy(false)
  }
  const choose = async (k) => {
    const next = [...picks, k]
    if (next.length < set.beats.length) { setPicks(next); setI(i + 1); return }
    setBusy(true); setError(null)
    try {
      const r = await callAnswer({ nightId, windowId: w.id, picks: next })
      if (answerOutcome(r) === 'thanks') setSent(true)
      else retry()
    } catch (e) {
      if (outcomeForError(e) === 'thanks') setSent(true)
      else retry(e?.message)
    }
  }

  if (sent) return <Thanks onDone={onDone} />
  if (!beat) return null
  return (
    <div className="moment window papered">
      <header className="asker">
        <Seal />
        <p className="crest">{w.title || 'Parlour Game'} · {i + 1} of {set.beats.length}</p>
      </header>
      {i === 0 && <HostLine host={w.host} />}
      <h1 className="ask">{beat.q}</h1>
      <div className="choices">
        {beat.choices.map(c => (
          <button key={c.k} className="choice" disabled={busy} onClick={() => choose(c.k)}>{c.text}</button>
        ))}
      </div>
      {error && <p className="trouble" role="alert">{error}</p>}
      {/* an Act 4 game waiting on the phone has no clock: it is played when the guest is free */}
      {!w.waiting && <Clock w={w} serverNow={serverNow} />}
    </div>
  )
}

// Act 7: the murderer, the motive, the victim. Two minutes.
export function Ballot({ w, night, session, content, nightId, serverNow, onDone }) {
  const [step, setStep] = useState(0)
  const [pick, setPick] = useState({ murderer: null, motive: null, victim: null })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const people = useMemo(() => Object.entries(night.roster ?? {})
    .map(([key, r]) => ({ key, name: r.name, character: characterById(content, r.characterId)?.name ?? '' }))
    .sort((a, b) => a.name.localeCompare(b.name)), [night.roster, content])
  const list = motives(content)
  const steps = [
    { key: 'murderer', title: 'Who did it?' },
    { key: 'motive', title: 'Why?' },
    { key: 'victim', title: 'Who died?' },
  ]
  const cur = steps[step]

  const send = async () => {
    setBusy(true); setError(null)
    try {
      await callBallot({ nightId, murderer: pick.murderer, motive: pick.motive, victim: pick.victim })
      onDone?.()
    } catch (e) { setError(e?.message || 'The Manor did not hear that. Try again.'); setBusy(false) }
  }

  if (step === 3) return (
    <div className="moment window papered">
      <Seal />
      <p className="crest">Your three</p>
      <ul className="summary">
        <li><span className="dim">Murderer</span> {people.find(p => p.key === pick.murderer)?.name}</li>
        <li><span className="dim">Motive</span> {list.find(m => m.n === pick.motive)?.rhyme}</li>
        <li><span className="dim">Victim</span> {people.find(p => p.key === pick.victim)?.name}</li>
      </ul>
      <div className="host-row">
        <button className="chip" disabled={busy} onClick={() => setStep(0)}>Change</button>
        <button className="big" disabled={busy} onClick={send}>{busy ? 'Sending…' : 'Lock it in'}</button>
      </div>
      {error && <p className="trouble" role="alert">{error}</p>}
      <Clock w={w} serverNow={serverNow} />
    </div>
  )

  return (
    <div className="moment window ballot papered">
      <p className="crest">{cur.title} · {step + 1} of 3</p>
      {step === 0 && <HostLine host={w.host} />}
      <ul className="pick-list">
        {cur.key === 'motive'
          ? list.map(m => (
            <li key={m.n}><button className={pick.motive === m.n ? 'pick on' : 'pick'} onClick={() => { setPick({ ...pick, motive: m.n }); setStep(step + 1) }}>
              <span className="n">{m.n}</span><span>{m.rhyme}</span></button></li>))
          : people.filter(p => p.key !== session.guestKey || cur.key === 'victim').map(p => (
            <li key={p.key}><button className={pick[cur.key] === p.key ? 'pick on' : 'pick'} onClick={() => { setPick({ ...pick, [cur.key]: p.key }); setStep(step + 1) }}>
              <span>{p.name}</span><span className="dim">{p.character}</span></button></li>))}
      </ul>
      {step > 0 && <button className="quiet" onClick={() => setStep(step - 1)}>Back</button>}
      <Clock w={w} serverNow={serverNow} />
    </div>
  )
}

// Act 6: commit to one thing it is not. A person or a motive. Say it out loud too.
export function Eliminate({ w, night, session, content, nightId, serverNow, onDone }) {
  const [mode, setMode] = useState(null) // person | motive
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const people = Object.entries(night.roster ?? {})
    .filter(([key]) => key !== session.guestKey)
    .map(([key, r]) => ({ key, name: r.name, character: characterById(content, r.characterId)?.name ?? '' }))
    .sort((a, b) => a.name.localeCompare(b.name))
  const list = motives(content)
  const send = async (target) => {
    setBusy(true); setError(null)
    try { await callEliminate({ nightId, target }); onDone?.() }
    catch (e) { setError(e?.message || 'The Manor did not hear that. Try again.'); setBusy(false) }
  }
  return (
    <div className="moment window eliminate papered">
      <p className="crest">The deduction round</p>
      {!mode ? (
        <>
          <h1 className="ask">Name one thing it is not.</h1>
          <p className="moment-sub">Out loud, to the room. Then tap it here.</p>
          <div className="choices">
            <button className="choice" onClick={() => setMode('person')}>A person</button>
            <button className="choice" onClick={() => setMode('motive')}>A motive</button>
          </div>
        </>
      ) : (
        <ul className="pick-list">
          {mode === 'motive'
            ? list.map(m => <li key={m.n}><button className="pick" disabled={busy} onClick={() => send({ kind: 'motive', n: m.n })}><span className="n">{m.n}</span><span>{m.rhyme}</span></button></li>)
            : people.map(p => <li key={p.key}><button className="pick" disabled={busy} onClick={() => send({ kind: 'person', key: p.key })}><span>{p.name}</span><span className="dim">{p.character}</span></button></li>)}
        </ul>
      )}
      {mode && <button className="quiet" onClick={() => setMode(null)}>Back</button>}
      {error && <p className="trouble" role="alert">{error}</p>}
      <Clock w={w} serverNow={serverNow} />
    </div>
  )
}

// The room's commitments so far, on the Now tab once the round has run.
export function Eliminations({ night, content }) {
  const list = motives(content)
  const rows = Object.values(night.eliminations ?? {}).sort((a, b) => ms(a.at) - ms(b.at))
  if (!rows.length) return null
  return (
    <section className="dealt eliminations">
      <h3>What the room has ruled out</h3>
      <ul>
        {rows.map((e, i) => (
          <li key={i}><strong>{e.name}</strong>: not {e.kind === 'person' ? (night.roster?.[e.key]?.name ?? e.key) : (list.find(m => m.n === e.n)?.rhyme ?? `motive ${e.n}`)}</li>
        ))}
      </ul>
    </section>
  )
}
