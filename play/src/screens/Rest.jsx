import { useEffect, useMemo, useRef, useState } from 'react'
import { writeNotes } from '../lib/hooks'
import Host from './Host'
import Clues from './Clues'
import { Card, CatFace, LightsStep } from './Cards'
import { Eliminations } from './Windows'
import { nowCards, roleCard, stopOf, lightsStep, act4Step, salemFriendNote } from '../lib/night'
import Act4 from './Act4'
import Spoken from './Spoken'
import Allow from './Allow'
import {
  ACTS, CATS, actScript, bioFor, cardTone, characterById, motiveNotes, motives, npcCards, portraitFit, portraitUrls, rules,
  smalltalk, statusLine, stopWords, STOP_MEANINGS,
} from '../lib/content'

const TABS = [
  { key: 'now', label: 'Now' },
  { key: 'you', label: 'You' },
  { key: 'clues', label: 'Clues' },
  { key: 'motives', label: 'Motives' },
  { key: 'cats', label: 'Cats' },
  { key: 'rules', label: 'Rules' },
]

// The phone at rest: your character, and the Reticule underneath it.
// This is what a phone shows whenever nothing else is happening — the idle
// screen is a real state, indistinguishable from a phone that just finished
// something.
export default function Rest({ uid, night, session, content, notes, ui, onTour, serverNow, meetNote = null }) {
  const [tab, setTab] = useState(() => {
    try { return localStorage.getItem('reticule-tab') || 'you' } catch { return 'you' }
  })
  useEffect(() => { try { localStorage.setItem('reticule-tab', tab) } catch {} }, [tab])

  const character = characterById(content, session.characterId)
  const script = actScript(content, night.act)
  const act = ACTS[night.act]
  const tabs = session.host ? [...TABS, { key: 'host', label: 'Host' }] : TABS
  const shown = tabs.some(t => t.key === tab) ? tab : 'you'
  const now = nowCards(session, notes, night.act)
  const waiting = now.filter(c => c.kind !== 'testimony' && c.kind !== 'clue').length

  // When something new lands for this act (a card, or a new step in the Act 2
  // rooms), the phone goes to Now on its own.
  const lights = lightsStep(session, night.act)
  const rooms = act4Step(session, night.act)
  const newest = [now[0]?.id, lights && `${lights.step}-${lights.cat}`, rooms && `${rooms.round}-${rooms.room}-${rooms.here}-${rooms.paid}`, meetNote].filter(Boolean).join('|') || null
  useEffect(() => { if (newest) setTab('now') }, [newest])

  return (
    <main className="rest papered">
      <header className="act">
        {night.act >= 1 && act ? (
          <>
            <p className="act-num">Act {night.act} · {act.plain}{night.rehearsal ? ' · rehearsal' : ''}</p>
            <h1 className="act-name">{script.banner || act.name}</h1>
            {script.objective && <p className="act-objective">{script.objective}</p>}
          </>
        ) : (
          <>
            <p className="act-num">Sirwin Manor</p>
            <p className="act-objective">{ui.LOBBY}</p>
          </>
        )}
      </header>

      <section className="sheet" aria-live="polite">
        {shown === 'now' && <Now uid={uid} night={night} session={session} content={content} notes={notes} cards={now} lights={lights} rooms={rooms} meetNote={meetNote} serverNow={serverNow} />}
        {shown === 'you' && <You character={character} session={session} content={content} ui={ui} onTour={onTour} />}
        {shown === 'clues' && <Clues session={session} />}
        {shown === 'motives' && <Motives uid={uid} content={content} notes={notes} />}
        {shown === 'cats' && <Cats session={session} content={content} ui={ui} act={night.act} />}
        {shown === 'rules' && <Rules content={content} />}
        {shown === 'host' && <Host night={night} content={content} serverNow={serverNow} />}
      </section>

      <nav className="tabs" aria-label="Your Reticule">
        {tabs.map(t => (
          <button key={t.key} className={t.key === shown ? 'tab on' : 'tab'} onClick={() => setTab(t.key)}>
            {t.label}{t.key === 'now' && waiting > 0 && shown !== 'now' ? <span className="badge" aria-label={`${waiting} waiting`} /> : null}
          </button>
        ))}
      </nav>
    </main>
  )
}

// What to do at this moment: the cards dealt for this act, newest first,
// each one gone once it has been answered. When there is nothing to do the
// screen says so plainly; that is a real state, not an error.
function Now({ uid, night, session, content, notes, cards, lights = null, rooms = null, meetNote = null, serverNow }) {
  return (
    <div className="now">
      {lights && <LightsStep lights={lights} uid={uid} nightId={night.nightId} notes={notes} note={meetNote} />}
      {rooms && <Act4 step={rooms} session={session} nightId={night.nightId} uid={uid} serverNow={serverNow} notes={notes} />}
      {rooms && meetNote && <p className="trouble" role="status">{meetNote}</p>}
      {cards.length === 0 && !lights && !rooms && (
        <p className="moment-text quiet-line">{night.act >= 1 ? 'Nothing to do just now. Talk to people.' : 'The game will find you when it starts.'}</p>
      )}
      {cards.map(c => <Card key={c.id} card={c} uid={uid} notes={notes} nightId={night.nightId} />)}
      {night.act === 6 && <Eliminations night={night} content={content} />}
    </div>
  )
}

function You({ character, session, content, ui, onTour }) {
  const [idle, setIdle] = useState(() => smalltalk(content))
  const [showRole, setShowRole] = useState(false)
  const role = roleCard(session)
  useEffect(() => {
    const id = setInterval(() => setIdle(smalltalk(content)), 90_000)
    return () => clearInterval(id)
  }, [content])
  if (!character) return <p className="moment-text">Your character is on its way.</p>
  return (
    <div className="you">
      <CharacterCard character={character} />
      <p className="bio">{bioFor(content, character)}</p>
      {session.bag && <p className="bag">{ui.BAG} <strong>{session.bag}</strong></p>}
      {session.host && <p className="gloss">{ui.HOST}</p>}
      {role && (
        <section className="role-row" aria-label={ui['YOUR ROLE']}>
          <p className="eyebrow">{ui['YOUR ROLE']}</p>
          {showRole
            ? <p className="role-card role-again">{role.text}</p>
            : <p className="gloss role-hint">Your card from when the power came back. Nobody else can see it.</p>}
          <button className="quiet" onClick={() => setShowRole(v => !v)} aria-expanded={showRole}>{showRole ? ui['HIDE ROLE'] : ui['SHOW ROLE']}</button>
        </section>
      )}
      <p className="gloss">{ui.RETICULE}</p>
      {onTour && <button className="quiet" onClick={onTour}>Show me around again</button>}
      <AllowAgain />
      {idle && (
        <div className="passing" aria-label={`${idle.cat.name}, passing by`}>
          <CatFace cat={idle.cat.key} name={idle.cat.name} />
          <p><span className="idle-cat">{idle.cat.name}, passing by</span><br /><Spoken text={idle.text} /></p>
        </div>
      )}
    </div>
  )
}

// The quiet Allow again link (§9.10): an iPhone may forget motion or sound
// after a reload or a rejoin; one tap asks again.
function AllowAgain() {
  const [open, setOpen] = useState(false)
  if (open) return <div className="overlay" role="dialog" aria-modal="true" aria-label="Allow again"><Allow again onDone={() => setOpen(false)} /></div>
  return <button className="link" onClick={() => setOpen(true)}>Allow again (motion, sound, screen awake)</button>
}

// The character card: name on a band at the top, the job on a band at the
// bottom, and the drawing standing in an oval on one of the house colours.
// Every figure is drawn the same height whatever the empty space in its file.
export function CharacterCard({ character }) {
  const [idx, setIdx] = useState(0)
  const urls = portraitUrls(character.id)
  useEffect(() => setIdx(0), [character.id])
  const fit = portraitFit(character.id)
  const drawn = Math.max(0.05, fit.bottom - fit.top)
  const height = 68 / drawn                 // the image, as % of the card, so the drawing is 68% tall
  const top = 85 - fit.bottom * height      // the drawing's feet land 15% up from the bottom edge
  const long = character.name.length > 18
  return (
    <div className={`card tone-${cardTone(character.id)}`}>
      <h2 className={long ? 'who long' : 'who'}>{character.name}</h2>
      <div className="oval" aria-hidden="true">
        {idx >= urls.length && <span className="initials">{initials(character.name)}</span>}
      </div>
      {idx < urls.length && (
        <img className="figure" src={urls[idx]} alt="" style={{ height: `${height}%`, top: `${top}%` }}
          onError={() => setIdx(i => i + 1)} />
      )}
      <p className="profession">The {character.profession}</p>
    </div>
  )
}

function initials(name) {
  return name.replace(/^(Prof\.|Dr\.|Madame|Miss|Mrs\.|Mr\.)\s+/, '')
    .split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase()
}

// The nineteen motives, visible from Act 1 as a cross-off menu. Crossing one
// off is your own note; it is never dealt by the game and proves nothing.
function Motives({ uid, content, notes }) {
  const list = motives(content)
  const notesByN = useMemo(() => motiveNotes(content), [content])
  const [open, setOpen] = useState(null)
  const [crossed, setCrossed] = useState(notes?.crossed ?? {})
  useEffect(() => { if (notes?.crossed) setCrossed(notes.crossed) }, [notes?.crossed])
  const toggle = (n) => {
    const next = { ...crossed, [n]: !crossed[n] }
    setCrossed(next)
    writeNotes(uid, { crossed: { [n]: !crossed[n] } }).catch(() => {})
  }
  if (!list.length) return <p className="moment-text">The motives are on their way.</p>
  return (
    <div>
      <p className="gloss">Nineteen reasons someone might. Tap one to cross it off. Your note, nobody else’s.</p>
      <ol className="motives">
        {list.map(m => (
          <li key={m.n} className="motive-row">
            <button className={crossed[m.n] ? 'motive off' : 'motive'} onClick={() => toggle(m.n)} aria-pressed={!!crossed[m.n]}>
              <span className="n">{m.n}</span>
              <span className="rhyme">{m.rhyme}</span>
            </button>
            {notesByN[m.n] && (
              <button className={open === m.n ? 'info on' : 'info'} aria-label="What this means" aria-expanded={open === m.n} onClick={() => setOpen(open === m.n ? null : m.n)}>i</button>
            )}
            {open === m.n && notesByN[m.n] && <p className="motive-note">{notesByN[m.n]}</p>}
          </li>
        ))}
      </ol>
    </div>
  )
}

// The five of the household in a column: a face, and beside it a gauge with
// five stops and a marker that cannot be dragged. Never a number. Tap a row
// to read what that level means for you, who the cat is, and the house's
// own line about where you stand. Sir Irwin is locked on the top stop.
// A True Friend of the Groundskeeper (the host's "Salem petted") sees the
// honour's words again at the top of Salem's row.
// In Act 4 a second, smaller marker shows where the whole group stands with
// each cat ("the house"), since a cat talks to the group together then.
function Cats({ session, content, ui, act }) {
  const cards = useMemo(() => npcCards(content), [content])
  const words = stopWords(ui)
  const house = act === 4 && session.groupAffection && typeof session.groupAffection === 'object' ? session.groupAffection : null
  const [open, setOpen] = useState(null)
  const lines = useMemo(() =>
    Object.fromEntries(CATS.map(c => [c.key, statusLine(content, c.key, stopOf(session.affection?.[c.key] ?? 3))])),
    [content, session.affection])
  const friend = salemFriendNote(session)
  return (
    <div>
      <p className="gloss">Where you stand with each of the household. Tap one to learn more.</p>
      <ul className="gauges">
        {cards.map(cat => {
          const level = cat.key === 'irwin' ? 5 : stopOf(session.affection?.[cat.key] ?? 3) // kept in half steps; shown at the nearest stop
          const houseLevel = house && cat.key !== 'irwin' && house[cat.key] ? Math.max(1, Math.min(5, Math.round(house[cat.key]))) : null
          const on = open === cat.key
          return (
            <li key={cat.key} className={on ? 'gauge-item on' : 'gauge-item'}>
              <button className="gauge-row" aria-expanded={on} onClick={() => setOpen(on ? null : cat.key)}>
                <CatFace cat={cat.key} name={cat.name} size="l" />
                <span className="gauge-body">
                  <span className="gauge-name">{cat.name}{cat.key === 'salem' && session.salemFriend && <span className="friend-badge" aria-label="True Friend of the Groundskeeper"> ★★★</span>}</span>
                  <Slider level={level} words={words} locked={cat.key === 'irwin'} house={houseLevel} />
                </span>
              </button>
              {on && (
                <div className="gauge-more">
                  {cat.key === 'salem' && friend && <p className="friend-note"><strong>{friend.title}.</strong> <Spoken text={friend.text} /></p>}
                  <p className="meaning"><strong>{words[level - 1]}.</strong> {cat.key === 'irwin' ? 'Locked. Sir Irwin tells everyone everything, and he never lies.' : STOP_MEANINGS[level - 1]}</p>
                  <About text={cat.text} />
                  <p className="standing">{lines[cat.key]}</p>
                </div>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}

// A household card's About, as written, with the trust statement ("Trusting
// Salem: ...") set apart on its own paragraph and its lead-in in bold.
function About({ text }) {
  const m = /\bTrusting\s+[^:]{1,40}:/.exec(text ?? '')
  if (!m) return <p className="cat-text">{text}</p>
  const lead = text.slice(0, m.index).trim()
  const label = m[0]
  const rest = text.slice(m.index + m[0].length).trim()
  return (
    <>
      {lead && <p className="cat-text">{lead}</p>}
      <p className="cat-text trust"><strong>{label}</strong> {rest}</p>
    </>
  )
}

// A picture of a slider, not a control. Remembers the last stop it showed so
// the marker slides from there when the tab opens on a new value. `house`
// adds the smaller second marker for the group (Act 4 only). Never a number.
function Slider({ level, words, locked = false, house = null }) {
  const key = `stop-${words.length}-${level}`
  const [shown, setShown] = useState(() => {
    try { return Number(sessionStorage.getItem(`slider-${words[0]}-${level}`)) || level } catch { return level }
  })
  const first = useRef(true)
  useEffect(() => {
    if (first.current) {
      first.current = false
      let was = level
      try { was = Number(sessionStorage.getItem(`slider-was-${key}`)) || level } catch {}
      if (was !== level) { setShown(was); const id = setTimeout(() => setShown(level), 350); return () => clearTimeout(id) }
    }
    setShown(level)
  }, [level, key])
  useEffect(() => { try { sessionStorage.setItem(`slider-was-${key}`, String(level)) } catch {} }, [level, key])
  const pct = ((shown - 1) / 4) * 100
  return (
    <div className="slider" role="img" aria-label={words[level - 1]}>
      <div className="track">
        {words.map((w, i) => <span key={w} className={`stop${i + 1 <= level ? ' lit' : ''}`} />)}
        <span className="marker" style={{ left: `${pct}%` }} />
        {house && <span className="marker house" style={{ left: `${((house - 1) / 4) * 100}%` }} title="the house" />}
      </div>
      <p className="stop-word">{words[level - 1]}{locked && <span className="locked"> · <span aria-hidden="true">🔒</span> Locked</span>}{house && <span className="house-word"> · the house: {words[house - 1]}</span>}</p>
    </div>
  )
}

function Rules({ content }) {
  const list = rules(content)
  return (
    <ul className="rules">
      {list.map((r, i) => (
        <li key={i}>
          {r.title && <h3>{r.title}</h3>}
          <p>{r.body}</p>
        </li>
      ))}
    </ul>
  )
}
