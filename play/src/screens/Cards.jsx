import { useEffect, useRef, useState } from 'react'
import { callSolve } from '../firebase'
import { writeNotes } from '../lib/hooks'
import { faceUrl } from '../lib/night'
import { STATIONERY, templateSlug, stationeryUrl } from '../lib/stationery'

// Everything a phone is dealt during an act, one component per kind of card.
// Every card that needs an answer has a required tap before it goes away
// (client rule: every innocent beat needs an interaction), and every card is
// the same shape whatever role the phone belongs to.

export function Card({ card, uid, nightId, notes, session }) {
  const seen = !!notes?.seen?.[card.id]
  const put = () => writeNotes(uid, { seen: { [card.id]: true } }).catch(() => {})
  switch (card.kind) {
    case 'notice': return <Notice card={card} onDone={put} />
    case 'go': return <Go card={card} onDone={put} />
    case 'testimony': return <Testimony card={card} />
    case 'puzzle': return <Safe card={card} nightId={nightId} session={session} onDone={put} />
    case 'document': return <Document card={card} />
    case 'group': return <Group card={card} onDone={put} />
    case 'station': return <Station card={card} uid={uid} notes={notes} onDone={put} />
    case 'clue': return <Clue card={card} />
    case 'result': return <Result card={card} onDone={put} seen={seen} />
    case 'award': return <Award card={card} onDone={put} />
    default: return null
  }
}

export function Rehearsal({ card }) {
  return card?.placeholder ? <span className="chip-tag">Rehearsal text</span> : null
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
      <p>{card.text}</p>
      <button className="big" onClick={onDone}>{card.button || 'Done'}</button>
    </section>
  )
}

function Go({ card, onDone }) {
  return (
    <section className="dealt go">
      <CatFace cat={card.cat} name={card.catName} size="l" />
      <h3>Go to {card.room}</h3>
      <p>{card.catName} is waiting for you there. Find the cat, then tap.</p>
      <button className="big" onClick={onDone}>I’m here</button>
    </section>
  )
}

// A cat speaks: opener, the middle, closer, as three short paragraphs.
// A brush-off is one line in italics. Nothing on the card says which.
export function Testimony({ card, compact = false }) {
  const deflected = card.outcome === 'deflect'
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
      <div className={deflected ? 'said deflect' : 'said'}>
        {(card.lines ?? []).map((l, i) => <p key={i}>{l}</p>)}
      </div>
    </section>
  )
}

// The safe: three numbers in the order the cat said them.
function Safe({ card, nightId, session, onDone }) {
  const slots = card.slots ?? 3
  const [digits, setDigits] = useState(() => Array(slots).fill(''))
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState(null)
  const refs = useRef([])
  const solved = !!session?.solved?.[card.id]
  const tries = session?.tries?.[card.id] ?? 0

  useEffect(() => { if (!solved) refs.current[0]?.focus() }, [solved])

  const set = (i, v) => {
    const clean = v.replace(/\D/g, '').slice(0, 2)
    const next = [...digits]; next[i] = clean; setDigits(next)
    if (clean.length === 2 && i + 1 < slots) refs.current[i + 1]?.focus()
  }
  const submit = async (e) => {
    e.preventDefault()
    if (digits.some(d => !d)) return
    setBusy(true); setNote(null)
    try {
      const r = await callSolve({ nightId, cardId: card.id, entry: digits.map(Number) })
      const d = r.data ?? {}
      if (d.gaveWay) setNote('The safe gave way. Something fell out.')
      else if (d.right) setNote('It opens.')
      else { setNote(`Not that. ${3 - (d.tries ?? 1)} more ${3 - (d.tries ?? 1) === 1 ? 'try' : 'tries'} before it gives way.`); setDigits(Array(slots).fill('')); refs.current[0]?.focus() }
    } catch (err) {
      setNote(err?.message || 'The safe did not answer. Try again.')
    } finally { setBusy(false) }
  }

  if (solved) return (
    <section className="dealt puzzle">
      <h3>{card.title}</h3>
      <p>{note || 'Open. What was inside is in your Clues.'}</p>
      <button className="big" onClick={onDone}>Put it away</button>
    </section>
  )
  return (
    <section className="dealt puzzle">
      <h3>{card.title}</h3>
      <p>{card.text}</p>
      <form className="safe" onSubmit={submit}>
        <div className="dials">
          {digits.map((d, i) => (
            <input key={i} ref={el => { refs.current[i] = el }} className="dial" inputMode="numeric" pattern="[0-9]*" maxLength={2}
              value={d} onChange={e => set(i, e.target.value)} aria-label={`Number ${i + 1}`} disabled={busy} />
          ))}
        </div>
        <button className="big" type="submit" disabled={busy || digits.some(d => !d)}>{busy ? 'Turning…' : 'Try it'}</button>
      </form>
      {note && <p className="trouble" role="status">{note}</p>}
      {tries > 0 && !note && <p className="gloss">{tries} wrong so far.</p>}
    </section>
  )
}

// A document, printed live onto one of the seven stationery designs: the
// blank design is the paper's background (play/public/stationery/<slug>.svg,
// a stand-in until Jon's art replaces the file) and the case's text, big
// word and note are laid over it in that design's ink. A design the phone
// does not know prints on the plain block.
export function Document({ card }) {
  const slug = templateSlug(card.template)
  const design = slug ? STATIONERY[slug] : null
  const base = import.meta.env?.BASE_URL ?? '/'
  const cls = design ? `paper paper-on paper-${slug} ink-${design.ink}` : 'paper'
  const style = design ? { backgroundImage: `url(${stationeryUrl(slug, base)})` } : undefined
  return (
    <section className="dealt document">
      <div className={cls} style={style}>
        <p className="paper-kind">{card.template}{card.gaveWay ? ' · fell out of the safe' : ''}</p>
        <p className="paper-big">{card.bigWord}</p>
        <p className="paper-text">{card.text}</p>
        {card.annotation && <p className="paper-note">{card.annotation}</p>}
      </div>
      <Rehearsal card={card} />
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

// Act 4 stations. The study, the bags and the check-in are instructions; the
// cat station carries a testimony for the whole group; the small puzzle is
// a game on the phone.
function Station({ card, uid, notes, onDone }) {
  const metKey = `${card.id}-met`
  const met = !!notes?.seen?.[metKey]
  const meet = () => writeNotes(uid, { seen: { [metKey]: true } }).catch(() => {})
  return (
    <section className={`dealt station station-${card.station}`}>
      <p className="eyebrow">Station · {card.title}</p>
      {card.station === 'cat' && <CatFace cat={card.cat} name={card.catName} size="l" />}
      {card.station === 'bags' && card.property && <p className="property">Something <strong>{card.property}</strong></p>}
      <p>{card.text}</p>
      {card.station === 'cat' && (met
        ? <Testimony card={card.testimony} compact />
        : <button className="big" onClick={meet}>We’re with the cat</button>)}
      {card.station === 'puzzle' && <Sequence symbols={card.sequence} />}
      {(card.station !== 'cat' || met) && <button className="big" onClick={onDone}>Done here</button>}
    </section>
  )
}

const GLYPH = { circle: '●', square: '■', triangle: '▲', star: '★', moon: '☾', cross: '✚' }
const ALL = Object.keys(GLYPH)

// Watch four shapes, then tap them back in the same order. Wrong → watch again.
function Sequence({ symbols = [] }) {
  const [phase, setPhase] = useState('ready') // ready | show | tap | done
  const [shown, setShown] = useState(-1)
  const [taps, setTaps] = useState([])
  useEffect(() => {
    if (phase !== 'show') return
    let i = -1
    const id = setInterval(() => {
      i += 1
      if (i >= symbols.length) { clearInterval(id); setShown(-1); setPhase('tap'); return }
      setShown(i)
    }, 900)
    return () => clearInterval(id)
  }, [phase, symbols.length])
  const tap = (s) => {
    const next = [...taps, s]
    if (symbols[next.length - 1] !== s) { setTaps([]); setPhase('ready'); return }
    setTaps(next)
    if (next.length === symbols.length) setPhase('done')
  }
  if (phase === 'done') return <p className="sequence-done">That’s it.</p>
  return (
    <div className="sequence">
      {phase === 'ready' && <button className="chip" onClick={() => { setTaps([]); setPhase('show') }}>{taps.length || shown >= 0 ? 'Watch again' : 'Show me'}</button>}
      {phase === 'show' && <p className="glyph big-glyph" aria-live="polite">{shown >= 0 ? GLYPH[symbols[shown]] : ' '}</p>}
      {phase === 'tap' && (
        <div className="glyphs">
          {ALL.map(s => <button key={s} className="glyph" onClick={() => tap(s)} aria-label={s}>{GLYPH[s]}</button>)}
        </div>
      )}
      {phase === 'tap' && <p className="gloss">{taps.length} of {symbols.length}</p>}
    </div>
  )
}

export function Clue({ card }) {
  return (
    <section className="dealt clue">
      <h3>{card.title}</h3>
      <p>{card.text || '(Nothing came through. Ask the host.)'}</p>
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
