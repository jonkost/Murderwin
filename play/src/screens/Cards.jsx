import { createContext, useContext, useEffect, useState } from 'react'
import { callMeet, callLeave, callNotYet, callLockIn } from '../firebase'
import { writeNotes } from '../lib/hooks'
import { faceUrl, buzzOnce } from '../lib/night'
import { portraitUrls } from '../lib/content'
import { catPictureUrl } from '../lib/rooms'
import { chime } from '../lib/permissions'
import { troubleLine } from '../lib/trouble'
import { TraceView } from './Kiosk'
import Spoken from './Spoken'

// Everything a phone is dealt during an act, one component per kind of card.
// Every card that needs an answer has a required tap before it goes away
// (client rule: every innocent beat needs an interaction), and every card is
// the same shape whatever role the phone belongs to.

// `over` (The End, 25 Oct 2026): the result card stays on Now for good, with
// nothing left to tap on it.
export function Card({ card, uid, notes, nightId = null, over = false }) {
  const seen = !!notes?.seen?.[card.id]
  const put = () => writeNotes(uid, { seen: { [card.id]: true } }).catch(() => {})
  switch (card.kind) {
    case 'notice': return <Notice card={card} onDone={put} />
    case 'testimony': return <Testimony card={card} />
    case 'group': return <Group card={card} uid={uid} nightId={nightId} notes={notes} onDone={put} />
    case 'station': return <Station card={card} uid={uid} notes={notes} onDone={put} />
    case 'clue': return <Clue card={card} uid={uid} notes={notes} />
    case 'result': return <Result card={card} onDone={put} seen={seen || over} />
    case 'award': return <Award card={card} onDone={put} />
    default: return null
  }
}

// Whether the phone's night is a rehearsal (lib/night.js isRehearsalNight;
// App.jsx says so around the tabs, the only way to these cards on a phone).
// The Rehearsal text tag is setup language, so on a phone it shows on a
// rehearsal night only, never on the party night (Jon, 29 Oct 2026). A page
// App does not draw keeps it: the workshop's previews, whose sample nights
// are rehearsals, like a room screen with no night live (lib/screen.js showSetup).
export const RehearsalNight = createContext(true)

export function Rehearsal({ card }) {
  const rehearsal = useContext(RehearsalNight)
  return rehearsal && card?.placeholder ? <span className="chip-tag">Rehearsal text</span> : null
}

// A host's line (functions/lib/hosts.js): the cat's face and their words.
// Flavor only, the same on every phone.
const HOST_NAMES = { boo: 'Miss Boo LaRue', salem: 'Salem Crooknog', granolia: 'Granolia Lickspittle', zimothy: 'Zimothy Clawford, Esq.', irwin: 'Sir Irwin' }
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

// A notice may carry a picture (`card.image`, functions/lib/deal.js
// NOTICE_IMAGES): `birthday` is the Happy Birthday Irwin card over the cake
// notice (cue 12, 25 Oct 2026).
function Notice({ card, onDone }) {
  return (
    <section className={`dealt notice${card.image ? ` with-image image-${card.image}` : ''}`}>
      {card.image === 'birthday' && <Birthday seed={card.id} />}
      <h3>{card.title}</h3>
      <p><Spoken text={card.text} /></p>
      <button className="big" onClick={onDone}>{card.button || 'Done'}</button>
    </section>
  )
}

// Happy Birthday, Sir Irwin: one of his full pictures (varied by the card, the
// same on every phone) and the greeting. No picture in yet: the greeting alone.
export function Birthday({ seed }) {
  const [broken, setBroken] = useState(false)
  const src = catPictureUrl('irwin', seed, import.meta.env.BASE_URL)
  return (
    <div className="birthday-card">
      {src && !broken && <img className="birthday-irwin" src={src} alt="Sir Irwin" onError={() => setBroken(true)} />}
      <p className="birthday-title">Happy Birthday, Sir Irwin!</p>
    </div>
  )
}

// Act 2, Lights Out: where this guest goes next (sessions/{uid}.lights,
// written by the server; the words are the handoff's, §9.4). Wait in the
// Parlour; your turn: On my way, or Not yet, call me later (every phone has
// the same button, no penalty); in the room, scan the code; read the cat and
// tap Done. The phone buzzes once when it calls its guest. A guest whose
// phone cannot scan taps "I am with …" in the room instead.
export function LightsStep({ lights, uid, nightId, notes, note = null }) {
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState(null)
  const buzzKey = lights?.step === 'go' ? `lights-go-${lights.cat}-${lights.at?.seconds ?? ''}` : null
  useEffect(() => {
    if (!buzzKey || !uid || uid === 'preview') return
    const vibrate = typeof navigator !== 'undefined' && navigator.vibrate ? p => navigator.vibrate(p) : null
    if (buzzOnce(buzzKey, notes, vibrate)) { chime(); writeNotes(uid, { buzzed: { [buzzKey]: true } }).catch(() => {}) }
  }, [buzzKey, uid, notes])
  if (!lights) return null
  const onWayKey = `onmyway-${lights.cat}`
  const onWay = lights.step === 'go' && !!notes?.seen?.[onWayKey]
  const call = async (fn, args) => {
    if (nightId === 'preview') return
    setBusy(true); setMsg(null)
    try { await fn({ nightId, ...args }) } catch (e) { setMsg(troubleLine(e, 'The house did not answer. Try again.')) } finally { setBusy(false) }
  }
  const goNow = () => { if (uid && uid !== 'preview') writeNotes(uid, { seen: { [onWayKey]: true } }).catch(() => {}) }
  const short = (lights.catName ?? 'the cat').split(' ')[0]
  return (
    <section className={`dealt lights lights-${lights.step}`}>
      <p className="eyebrow">Your next step</p>
      {lights.cat && lights.step !== 'done' && lights.step !== 'wait' && <CatFace cat={lights.cat} name={lights.catName} size="l" />}
      <h3>{lights.title}</h3>
      <p>{onWay ? lights.arrive : lights.text}</p>
      {lights.step === 'go' && !onWay && (
        <div className="pair">
          <button className="big" onClick={goNow}>On my way</button>
          <button className="quiet" disabled={busy} onClick={() => call(callNotYet, {})}>Not yet, call me later</button>
        </div>
      )}
      {lights.step === 'go' && onWay && <button className="quiet" disabled={busy} onClick={() => call(callMeet, { cat: lights.cat })}>Cannot scan? I am with {short}</button>}
      {lights.step === 'with' && <button className="big" disabled={busy} onClick={() => call(callLeave, {})}>Done</button>}
      {(msg || note) && <p className="trouble" role="status">{msg || note}</p>}
    </section>
  )
}

// A cat speaks: its motive hint, then its bag clue, both at the rung its
// affection sets (Act 2, handoff 23 Oct §3), then "Saved to your Clues."
// A card left at supper for a cat the guest never reached says so. Stage
// directions (*snort*) read in italics, without the stars.
export function Testimony({ card, compact = false }) {
  const lines = card.lines ?? []
  return (
    <section className={`dealt testimony${compact ? ' compact' : ''}`}>
      <header className="speaker">
        <CatFace cat={card.cat} name={card.catName} />
        <div>
          <h3>{card.catName}</h3>
          {card.room && <p className="where">{card.note ? `left you a note from ${card.room}` : `in ${card.room}`}</p>}
        </div>
        <Rehearsal card={card} />
      </header>
      {lines.length > 0 && (
        <div className="said">
          {lines.map((l, i) => <p key={i}><Spoken text={l} /></p>)}
        </div>
      )}
      {card.hint?.text && <p className={card.hint.placeholder ? 'hint-line placeholder' : 'hint-line'}><Spoken text={card.hint.text} /></p>}
      {card.bag?.text && <p className={card.bag.placeholder ? 'bag-line placeholder' : 'bag-line'}><Spoken text={card.bag.text} /></p>}
      {!compact && card.saved && <p className="gloss saved">{card.saved}</p>}
    </section>
  )
}

// Act 4's group card (§9.5): the group as portraits and character names,
// then Locked in. While the group waits the card stays, with Sir Irwin
// wagging: never a "waiting for the others" screen.
function Group({ card, uid, nightId, notes, onDone }) {
  const lockedKey = `${card.id}-locked`
  const locked = !!notes?.seen?.[lockedKey]
  const [busy, setBusy] = useState(false)
  const lockIn = async () => {
    setBusy(true)
    if (uid && uid !== 'preview') {
      writeNotes(uid, { seen: { [lockedKey]: true } }).catch(() => {})
      try { await callLockIn({ nightId }) } catch { /* the clock starts the rounds anyway */ }
    }
    setBusy(false)
  }
  return (
    <section className="dealt group">
      <h3>{card.title}</h3>
      <ul className="members portraits">
        {(card.members ?? []).map(m => (
          <li key={m.key}>
            {m.characterId && <img className="portrait-s" src={portraitUrls(m.characterId)[0]} alt="" onError={e => { e.currentTarget.style.visibility = 'hidden' }} />}
            <span><strong>{m.characterName || m.name}</strong>{m.characterName ? <span className="dim"> · {m.name}</span> : null}</span>
          </li>
        ))}
      </ul>
      <p>{card.text}</p>
      {card.lockIn
        ? (locked
          ? <p className="locked-in"><CatFace cat="irwin" name="Sir Irwin" /> <span>Locked in. Sir Irwin is wagging. The chime sends your group to its first room.</span></p>
          : <button className="big" disabled={busy} onClick={lockIn}>Locked in</button>)
        : <button className="big" onClick={onDone}>Got it</button>}
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

// A clue a room paid out (Act 4): the study's trace (the same five-level
// picture as the bedroom door, never a name), a cat's reward line with a
// crossed-off motive, and the cat's bag hint about the Ghost; with a button
// that crosses the motive off the Motives tab. A clue with no words shows the
// note in brackets on a rehearsal only; on the party night, the house's plain
// words, the Study's own (functions/lib/station.js STUDY_QUIET; card 529).
const CLUE_QUIET = 'Nothing for you this time.'
export function Clue({ card, uid = null, notes = null }) {
  const rehearsal = useContext(RehearsalNight)
  const n = Number(card.cross) || null
  const crossed = n && !!notes?.crossed?.[n]
  const cross = () => { if (uid && uid !== 'preview') writeNotes(uid, { crossed: { [n]: true } }).catch(() => {}) }
  return (
    <section className="dealt clue">
      <header className="speaker">
        {card.cat && <CatFace cat={card.cat} name={card.catName} />}
        <h3>{card.title}</h3>
      </header>
      {card.trace ? <TraceView trace={{ ...card.trace, placeholder: false }} compact /> : <p><Spoken text={card.text || (rehearsal ? '(Nothing came through. Ask the host.)' : CLUE_QUIET)} /></p>}
      {card.bag?.text && <p className={card.bag.placeholder ? 'bag-line placeholder' : 'bag-line'}><Spoken text={card.bag.text} /></p>}
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

// Act 7: this phone's three answers against the truth. On the result beat it
// fills the screen with no button (Windows.jsx ResultLock); on Now, Keep this
// puts it away until The End, when it stays (lib/night.js nowCards).
export function Result({ card, onDone, seen }) {
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
