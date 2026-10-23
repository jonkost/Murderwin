import { useEffect, useState } from 'react'
import { callMeet, callLeave } from '../firebase'
import { writeNotes } from '../lib/hooks'
import { faceUrl, buzzOnce } from '../lib/night'
import { TraceView } from './Kiosk'
import Spoken from './Spoken'

// Everything a phone is dealt during an act, one component per kind of card.
// Every card that needs an answer has a required tap before it goes away
// (client rule: every innocent beat needs an interaction), and every card is
// the same shape whatever role the phone belongs to.

export function Card({ card, uid, notes }) {
  const seen = !!notes?.seen?.[card.id]
  const put = () => writeNotes(uid, { seen: { [card.id]: true } }).catch(() => {})
  switch (card.kind) {
    case 'notice': return <Notice card={card} onDone={put} />
    case 'testimony': return <Testimony card={card} />
    case 'group': return <Group card={card} onDone={put} />
    case 'station': return <Station card={card} uid={uid} notes={notes} onDone={put} />
    case 'clue': return <Clue card={card} uid={uid} notes={notes} />
    case 'result': return <Result card={card} onDone={put} seen={seen} />
    case 'award': return <Award card={card} onDone={put} />
    default: return null
  }
}

export function Rehearsal({ card }) {
  return card?.placeholder ? <span className="chip-tag">Rehearsal text</span> : null
}

// A host's line (functions/lib/hosts.js): the cat's face and their words.
// Flavor only, the same on every phone.
const HOST_NAMES = { boo: 'Miss Boo LaRue', salem: 'Salem Crookshank', granolia: 'Granolia Lickspittle', zimothy: 'Zimothy Clawford, Esq.', irwin: 'Sir Irwin' }
export function HostLine({ host }) {
  if (!host?.line) return null
  return (
    <p className={`host-line host-${host.cat}`}>
      <CatFace cat={host.cat} name={HOST_NAMES[host.cat]} size="s" />
      <span><Spoken text={host.line} /></span>
    </p>
  )
}

export function CatFace({ cat, name, size = 'm' }) {
  const url = faceUrl(cat)
  return (
    <span className={`face face-${size}`} aria-hidden="true">
      {url ? <img src={url} alt="" /> : <span className="face-initial">{(name ?? '?')[0]}</span>}
    </span>
  )
}

function Notice({ card, onDone }) {
  return (
    <section className="dealt notice">
      <h3>{card.title}</h3>
      <p><Spoken text={card.text} /></p>
      <button className="big" onClick={onDone}>{card.button || 'Done'}</button>
    </section>
  )
}

// Act 2, Lights Out: where this guest goes next (sessions/{uid}.lights,
// written by the server). Wait in the living room; go to a cat's room and
// scan its code; read what the cat says and tap; back to the living room.
// The phone buzzes once when it sends its guest off. A guest whose phone
// cannot scan taps "I am with …" in the room instead.
export function LightsStep({ lights, uid, nightId, notes, note = null }) {
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState(null)
  const buzzKey = lights?.step === 'go' ? `lights-go-${lights.cat}` : null
  useEffect(() => {
    if (!buzzKey || !uid || uid === 'preview') return
    const vibrate = typeof navigator !== 'undefined' && navigator.vibrate ? p => navigator.vibrate(p) : null
    if (buzzOnce(buzzKey, notes, vibrate)) writeNotes(uid, { buzzed: { [buzzKey]: true } }).catch(() => {})
  }, [buzzKey, uid, notes])
  if (!lights) return null
  const call = async (fn, args) => {
    if (nightId === 'preview') return
    setBusy(true); setMsg(null)
    try { await fn({ nightId, ...args }) } catch (e) { setMsg(e?.message || 'The house did not answer. Try again.') } finally { setBusy(false) }
  }
  const short = (lights.catName ?? 'the cat').split(' ')[0]
  return (
    <section className={`dealt lights lights-${lights.step}`}>
      <p className="eyebrow">Your next step</p>
      {lights.cat && lights.step !== 'done' && lights.step !== 'wait' && <CatFace cat={lights.cat} name={lights.catName} size="l" />}
      <h3>{lights.title}</h3>
      <p>{lights.text}</p>
      {lights.step === 'with' && <button className="big" disabled={busy} onClick={() => call(callLeave, {})}>I have heard it</button>}
      {lights.step === 'go' && <button className="quiet" disabled={busy} onClick={() => call(callMeet, { cat: lights.cat })}>Cannot scan? I am with {short}</button>}
      {(msg || note) && <p className="trouble" role="status">{msg || note}</p>}
    </section>
  )
}

// A cat speaks. A cat with a hint for this guest (Act 2) or this group
// (Act 4) says only its hint line, from the open Cat Hint Lines bank; the
// other three cats in Act 2 say one greeting line each, with no hint. Stage
// directions (*snort*) read in italics, without the stars.
export function Testimony({ card, compact = false }) {
  const lines = card.lines ?? []
  return (
    <section className={`dealt testimony${compact ? ' compact' : ''}`}>
      <header className="speaker">
        <CatFace cat={card.cat} name={card.catName} />
        <div>
          <h3>{card.catName}</h3>
          {card.room && <p className="where">in {card.room}</p>}
        </div>
        <Rehearsal card={card} />
      </header>
      {lines.length > 0 && (
        <div className="said">
          {lines.map((l, i) => <p key={i}><Spoken text={l} /></p>)}
        </div>
      )}
      {card.hint?.text && <p className={card.hint.placeholder ? 'hint-line placeholder' : 'hint-line'}><Spoken text={card.hint.text} /></p>}
    </section>
  )
}

function Group({ card, onDone }) {
  return (
    <section className="dealt group">
      <h3>{card.title}</h3>
      <ul className="members">
        {(card.members ?? []).map(m => <li key={m.key}><strong>{m.name}</strong>{m.characterName ? <span className="dim"> · {m.characterName}</span> : null}</li>)}
      </ul>
      <p>{card.text}</p>
      <button className="big" onClick={onDone}>Got it</button>
    </section>
  )
}

// Act 4 stations. The study, the bags, the memory match (on the iPad) and the
// check-in are instructions; the cat station carries the cat's hint line for
// the whole group.
function Station({ card, uid, notes, onDone }) {
  const metKey = `${card.id}-met`
  const met = !!notes?.seen?.[metKey]
  const meet = () => writeNotes(uid, { seen: { [metKey]: true } }).catch(() => {})
  return (
    <section className={`dealt station station-${card.station}`}>
      <p className="eyebrow">Station · {card.title}</p>
      {card.station === 'cat' && <CatFace cat={card.cat} name={card.catName} size="l" />}
      <HostLine host={card.host} />
      {card.station === 'bags' && card.property && <p className="property">Something <strong>{card.property}</strong></p>}
      <p>{card.text}</p>
      {card.station === 'cat' && (met
        ? <Testimony card={card.testimony} compact />
        : <button className="big" onClick={meet}>We’re with the cat</button>)}
      {(card.station !== 'cat' || met) && <button className="big" onClick={onDone}>Done here</button>}
    </section>
  )
}

// A clue a room paid out: the study's trace (the same five-level picture as
// the bedroom door, never a name) or the memory match's crossed-off motive,
// with a button that crosses it off the Motives tab.
export function Clue({ card, uid = null, notes = null }) {
  const n = Number(card.cross) || null
  const crossed = n && !!notes?.crossed?.[n]
  const cross = () => { if (uid && uid !== 'preview') writeNotes(uid, { crossed: { [n]: true } }).catch(() => {}) }
  return (
    <section className="dealt clue">
      <h3>{card.title}</h3>
      {card.trace ? <TraceView trace={{ ...card.trace, placeholder: false }} compact /> : <p>{card.text || '(Nothing came through. Ask the host.)'}</p>}
      {n && uid && (crossed ? <p className="gloss">Crossed off.</p> : <button className="chip" onClick={cross}>Cross it off</button>)}
      <Rehearsal card={card} />
    </section>
  )
}

// An achievement the host gave this guest (I, 18 Oct 2026): a title and a
// line, kept until tapped. The screen shows it again at the end.
function Award({ card, onDone }) {
  return (
    <section className="dealt award">
      <p className="eyebrow">Achievement</p>
      <h3>{card.title}</h3>
      {card.text && <p>{card.text}</p>}
      <button className="big" onClick={onDone}>{card.button || 'Keep it'}</button>
    </section>
  )
}

function Result({ card, onDone, seen }) {
  const rows = [['murderer', 'The murderer'], ['motive', 'The motive'], ['victim', 'The victim']]
  const right = rows.filter(([k]) => card[k]).length
  return (
    <section className="dealt result">
      <h3>{right === 3 ? 'All three.' : right === 2 ? 'Two of three.' : right === 1 ? 'One of three.' : 'None of three. The Manor keeps its secrets.'}</h3>
      <ul className="verdicts">
        {rows.map(([k, label]) => (
          <li key={k} className={card[k] ? 'right' : 'wrong'}>
            <span className="mark" aria-hidden="true">{card[k] ? '✓' : '✗'}</span>
            <span><strong>{label}</strong><br /><span className="dim">You said: {card.picks?.[k] || 'nothing'}</span></span>
          </li>
        ))}
      </ul>
      {card.defaulted && <p className="gloss">Your phone picked for you when the two minutes ran out.</p>}
      {!seen && <button className="big" onClick={onDone}>Keep this</button>}
    </section>
  )
}
