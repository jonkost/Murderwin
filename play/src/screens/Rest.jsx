import { useEffect, useMemo, useState } from 'react'
import { writeNotes } from '../lib/hooks'
import Host from './Host'
import {
  ACTS, CATS, actScript, bioFor, characterById, motives, npcCards, portraitUrls, rules,
  smalltalk, statusLine,
} from '../lib/content'

const TABS = [
  { key: 'you', label: 'You' },
  { key: 'motives', label: 'Motives' },
  { key: 'cats', label: 'Cats' },
  { key: 'rules', label: 'Rules' },
]

// The phone at rest: your character, and the Reticule underneath it.
// This is what a phone shows whenever nothing else is happening — the idle
// screen is a real state, indistinguishable from a phone that just finished
// something.
export default function Rest({ uid, night, session, content, notes, ui }) {
  const [tab, setTab] = useState(() => {
    try { return localStorage.getItem('reticule-tab') || 'you' } catch { return 'you' }
  })
  useEffect(() => { try { localStorage.setItem('reticule-tab', tab) } catch {} }, [tab])

  const character = characterById(content, session.characterId)
  const script = actScript(content, night.act)
  const act = ACTS[night.act]
  const tabs = session.host ? [...TABS, { key: 'host', label: 'Host' }] : TABS
  const shown = tabs.some(t => t.key === tab) ? tab : 'you'

  return (
    <main className="rest papered">
      <header className="act">
        {night.act >= 1 && act ? (
          <>
            <p className="act-num">Act {night.act} · {act.plain}</p>
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
        {shown === 'you' && <You character={character} session={session} content={content} ui={ui} />}
        {shown === 'motives' && <Motives uid={uid} content={content} notes={notes} />}
        {shown === 'cats' && <Cats session={session} content={content} />}
        {shown === 'rules' && <Rules content={content} />}
        {shown === 'host' && <Host night={night} content={content} />}
      </section>

      <nav className="tabs" aria-label="Your Reticule">
        {tabs.map(t => (
          <button key={t.key} className={t.key === shown ? 'tab on' : 'tab'} onClick={() => setTab(t.key)}>
            {t.label}
          </button>
        ))}
      </nav>
    </main>
  )
}

function You({ character, session, content, ui }) {
  const [idle, setIdle] = useState(() => smalltalk(content))
  useEffect(() => {
    const id = setInterval(() => setIdle(smalltalk(content)), 90_000)
    return () => clearInterval(id)
  }, [content])
  if (!character) return <p className="moment-text">Your character is on its way.</p>
  return (
    <div className="you">
      <Portrait character={character} />
      <h2 className="who">{character.name}</h2>
      <p className="profession">the {character.profession}</p>
      <p className="bio">{bioFor(content, character)}</p>
      {session.bag && <p className="bag">{ui.BAG} <strong>{session.bag}</strong></p>}
      {session.host && <p className="gloss">{ui.HOST}</p>}
      {idle && (
        <p className="idle"><span className="idle-cat">{idle.cat.name}</span> {idle.text}</p>
      )}
      <p className="gloss">{ui.RETICULE}</p>
    </div>
  )
}

// The portrait file if one exists, else initials. Tries .png then .jpg.
function Portrait({ character }) {
  const [idx, setIdx] = useState(0)
  const urls = portraitUrls(character.id)
  useEffect(() => setIdx(0), [character.id])
  if (idx < urls.length) {
    return (
      <div className="portrait figure">
        <img src={urls[idx]} alt="" onError={() => setIdx(i => i + 1)} />
      </div>
    )
  }
  return (
    <div className="portrait" aria-hidden="true">
      <span>{initials(character.name)}</span>
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
      <p className="gloss">Nineteen reasons someone might. Tap one to cross it off — your note, nobody else’s.</p>
      <ol className="motives">
        {list.map(m => (
          <li key={m.n}>
            <button className={crossed[m.n] ? 'motive off' : 'motive'} onClick={() => toggle(m.n)} aria-pressed={!!crossed[m.n]}>
              <span className="n">{m.n}</span>
              <span className="rhyme">{m.rhyme}</span>
            </button>
          </li>
        ))}
      </ol>
    </div>
  )
}

// The five of the household, and how each one stands with you tonight.
function Cats({ session, content }) {
  const cards = useMemo(() => npcCards(content), [content])
  const lines = useMemo(() =>
    Object.fromEntries(CATS.map(c => [c.key, statusLine(content, c.key, session.affection?.[c.key] ?? 3)])),
    [content, session.affection])
  return (
    <div>
      <p className="gloss">Never suspects. Each one tells it differently. Your standing with each is yours alone.</p>
      <ul className="cats">
        {cards.map(cat => (
          <li key={cat.key} className="cat">
            <h3>{cat.name}</h3>
            <p className="cat-text">{cat.text}</p>
            <p className="standing">{lines[cat.key]}</p>
          </li>
        ))}
      </ul>
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
