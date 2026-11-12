import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import characters from '../../../seed/characters.json' with { type: 'json' }
import motiveList from '../../../seed/motives.json' with { type: 'json' }
import names from '../../../seed/game-names.json' with { type: 'json' }
import { useQr } from '../lib/qr'
import { celebrate } from '../lib/celebrate'
import { unlock, play } from '../lib/soundkit'
import { SPLASHES, GAME_HOW, RULE_CARDS, NOW_STATES, bulbSpots, pictureFor } from './look'
import TabIcon from '../screens/TabIcon'
import './look.css'

// The pieces of the look (look.css; handoff 11 Nov 2026, "The look"). Each is
// a real component: the look book (LookBook.jsx) shows them for Jon to
// approve, and the night's own screens take them once he has (B2 to B4, A6,
// C1). Nothing here reads a night: every word and picture comes in as a prop
// or from the open seed lists.

const BASE = import.meta.env.BASE_URL
const pic = file => `${BASE}household/full/${encodeURIComponent(file)}`
const GAMES = Object.fromEntries(names.games.map(g => [g.id, g]))
const MOTIVES = motiveList.motives ?? motiveList
const PEOPLE = characters.characters

// The ground of every screen: the wallpaper, drifting, under a veil of Manor
// blue, with gaslight in two corners. `tall` for a phone; `calm` holds the
// gaslight still (a second display).
export function Ground({ tall = false, calm = false }) {
  return (
    <div className={`lk-ground${tall ? ' tall' : ''}${calm ? ' calm' : ''}`} aria-hidden="true">
      <div className="lk-wall" />
      <div className="lk-veil" />
      <div className="lk-gas a" />
      <div className="lk-gas b" />
    </div>
  )
}

// One of the household, cut out, floating. It hops when the window hears a
// win (lib/celebrate.js), and arrives softly when its picture changes.
export function Cat({ who, n = 0, className = '' }) {
  const file = pictureFor(who, n)
  const [hop, setHop] = useState(false)
  useEffect(() => {
    const on = e => { if (e.detail?.hop) { setHop(true); setTimeout(() => setHop(false), 950) } }
    window.addEventListener('celebrate', on)
    return () => window.removeEventListener('celebrate', on)
  }, [])
  if (!file) return null
  return <img key={file} className={`lk-cat swap${hop ? ' hop' : ''}${className ? ` ${className}` : ''}`} src={pic(file)} alt="" aria-hidden="true" draggable="false" />
}

// A marquee: chasing bulbs round whatever is inside (a game's name, The End).
// The bulbs are placed from the box's own size, evenly, so they never bunch
// at a corner; three sets take turns, which is the chase.
export function Marquee({ children, className = '' }) {
  const box = useRef(null)
  const [spots, setSpots] = useState([])
  useLayoutEffect(() => {
    const el = box.current
    if (!el) return undefined
    const place = () => setSpots(bulbSpots(el.offsetWidth, el.offsetHeight))
    place()
    if (typeof ResizeObserver === 'undefined') return undefined
    const ro = new ResizeObserver(place)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  return (
    <div ref={box} className={`lk-marquee${className ? ` ${className}` : ''}`}>
      {children}
      {spots.map((s, i) => <i key={i} className={`lk-bulb p${i % 3}`} style={{ left: `${s.x}%`, top: `${s.y}%` }} aria-hidden="true" />)}
    </div>
  )
}

// 1. A room's splash: its cat, large and slowly moving, the room's name, one
// inviting line, and a tip from the house that fades in now and then. The
// cat's picture changes through the night (`turn` moves it on). `calm` is the
// second display: the same splash, smaller and quieter.
export function Splash({ room = 'living', turn = 0, tip = null, tipMs = 60_000, calm = false, className = '' }) {
  const s = SPLASHES[room] ?? SPLASHES.living
  return (
    <div className={`lk-screen lk-splash${s.left ? ' left' : ''}${calm ? ' calm' : ''}${className ? ` ${className}` : ''}`}>
      <Ground calm={calm} />
      <Cat who={s.who} n={turn} />
      <div className="lk-words">
        <p className="lk-label">Sirwin Manor</p>
        <h2 className="lk-big">{s.name}</h2>
        <hr className="lk-rule" />
        <p className="lk-line">{s.line}</p>
      </div>
      {tip && <p key={tip} className="lk-tip" style={{ '--tip-ms': `${tipMs}ms` }}>{tip}</p>}
    </div>
  )
}

// 6. A game's rules card, between groups: the name in lights, its hook, the
// host, two short lines of how to play, and the room's code.
export function GameCard({ id = 'orangerie', turn = 0, codeUrl = null, className = '' }) {
  const g = GAMES[id]
  const how = GAME_HOW[id] ?? []
  const qr = useQr(codeUrl, 360)
  if (!g) return null
  return (
    <div className={`lk-screen lk-game${className ? ` ${className}` : ''}`}>
      <Ground />
      <header>
        <Marquee><h2 className="lk-big">{g.name}</h2></Marquee>
        <p className="lk-line lk-hook">{g.hook}</p>
      </header>
      <div className="lk-body">
        <Cat who={g.host} n={turn} />
        <div className="lk-card">
          <div>{how.map((line, i) => <p key={i} className="lk-how">{line}</p>)}</div>
          {qr && <figure className="lk-code"><img src={qr} alt="" /><figcaption>Scan to begin</figcaption></figure>}
        </div>
      </div>
    </div>
  )
}

// 7. The End, in lights: Sir Irwin, his birthday line, one burst of paw
// prints. `burst` plays the burst when the card arrives (quiet: the music is
// the house's).
export function TheEnd({ line = 'Happy first birthday, Sir Irwin', burst = true, className = '' }) {
  const root = useRef(null)
  useEffect(() => {
    if (!burst) return undefined
    const id = setTimeout(() => celebrate('big', { root: root.current, quiet: true, base: BASE }), 500)
    return () => clearTimeout(id)
  }, [burst])
  return (
    <div ref={root} className={`lk-screen lk-end${className ? ` ${className}` : ''}`}>
      <Ground />
      <Cat who="irwin" n={0} />
      <div className="lk-stack">
        <Marquee><h2 className="lk-big">The End</h2></Marquee>
        <p className="lk-line">{line}</p>
      </div>
    </div>
  )
}

// 8. The dedication, one card in the credits, held for eight seconds.
export function Dedication({ label = 'In loving memory of', name = 'Sydney', line = 'the original good boy', className = '' }) {
  return (
    <div className={`lk-screen lk-dedication${className ? ` ${className}` : ''}`}>
      <Ground calm />
      <div className="lk-card">
        <p className="lk-label">{label}</p>
        <h2 className="lk-big">{name}</h2>
        <hr className="lk-rule" />
        <p className="lk-line">{line}</p>
      </div>
    </div>
  )
}

// ---- the phone ---------------------------------------------------------------

const TABS = [['now', 'Now'], ['you', 'You'], ['clues', 'Clues'], ['notes', 'Notes'], ['motives', 'Motives'], ['cats', 'Cats'], ['rules', 'Rules']]

// A phone's page in the look: the act's name in the display face, the body,
// the Reticule's tabs (as they are today). `on` lights a tab.
export function Phone({ label = 'Act 2', title = 'Lights Out', on = 'now', children }) {
  return (
    <div className="lk-phone">
      <Ground tall />
      <header className="lk-phone-head">
        <p className="lk-label">{label}</p>
        <h2 className="lk-big">{title}</h2>
      </header>
      <div className="lk-phone-body">{children}</div>
      <nav className="lk-tabs" aria-hidden="true">
        {TABS.map(([key, word]) => (
          <span key={key} className={key === on ? 'tab on' : 'tab'}>
            <span className="tab-mark"><TabIcon name={key} /></span>
            <span className="tab-word">{word}</span>
          </span>
        ))}
      </nav>
    </div>
  )
}

// 2. The Now tab: one big card. What to do right now, and one button. Its cat
// peeks over the top. `state` is one of NOW_STATES (look.js).
export function NowCard({ state = 'cat', onGo = null }) {
  const s = NOW_STATES[state] ?? NOW_STATES.cat
  return (
    <div className="lk-now-wrap">
      <div className="lk-pcard lk-now">
        <Cat who={s.who} n={s.n ?? 0} />
        <p className="lk-label">{s.label}</p>
        <p className="lk-lead">{s.lead}</p>
        {s.sub && <p className="lk-sub">{s.sub}</p>}
        {s.clock && <p className="lk-clock"><b>{s.clock}</b><span>seconds left</span></p>}
        {s.button && <button type="button" className="big lk-press" onClick={e => onGo?.(e.currentTarget)}>{s.button}</button>}
        {s.quiet && <button type="button" className="lk-quiet">{s.quiet}</button>}
      </div>
    </div>
  )
}

// 3. The Rules tab: cards to swipe. One idea a card, a picture on each. The
// first card is the whole game in three lines.
export function RulesSwipe({ cards = RULE_CARDS }) {
  const rail = useRef(null)
  const [at, setAt] = useState(0)
  const onScroll = () => {
    const el = rail.current
    if (!el || !el.firstElementChild) return
    const step = el.firstElementChild.offsetWidth + 15
    setAt(Math.max(0, Math.min(cards.length - 1, Math.round(el.scrollLeft / step))))
  }
  return (
    <div>
      <div ref={rail} className="lk-swipe" onScroll={onScroll}>
        {cards.map((c, i) => (
          <article key={c.title} className="lk-rcard">
            <div className="lk-rcard-art">
              <div className="lk-wall" />
              <Cat who={c.who} n={c.n ?? i} />
              <span className="lk-rcard-n">{i + 1} of {cards.length}</span>
            </div>
            <div className="lk-rcard-words">
              <h3>{c.title}</h3>
              {c.three
                ? <p className="lk-three">{c.three.map(t => <span key={t}>{t}</span>)}</p>
                : <p>{c.body}</p>}
            </div>
          </article>
        ))}
      </div>
      <div className="lk-dots" aria-hidden="true">{cards.map((c, i) => <i key={c.title} className={i === at ? 'on' : ''} />)}</div>
      <p className="lk-swipe-hint">Swipe for the next one</p>
    </div>
  )
}

// 5. The vote: one card with three rows. Tap a row, pick, come back. Lock in
// lights when all three are filled; then the seal comes down. `onLock` gets
// the three picks. In the look book the lists are the open ones (the fourteen
// characters, the nineteen motives); on the night the ballot hands its own in.
const ROWS = [
  { key: 'murderer', label: 'The Murderer', kind: 'person' },
  { key: 'motive', label: 'The Motive', kind: 'motive' },
  { key: 'ghost', label: 'The Ghost', kind: 'person' },
]
export function VoteCard({ people = PEOPLE, motives = MOTIVES, onLock = null, sound = true, initial = null, startLocked = false }) {
  const [picks, setPicks] = useState(initial ?? {})
  const [open, setOpen] = useState(null)
  const [locked, setLocked] = useState(startLocked)
  const card = useRef(null)
  const full = ROWS.every(r => picks[r.key] != null)
  const choose = (row, value) => {
    setPicks(p => ({ ...p, [row.key]: value }))
    setOpen(null)
    if (sound) { unlock(); play('ding') }
  }
  const lock = () => {
    setLocked(true)
    if (sound) { unlock(); play('seal') }
    onLock?.(picks)
  }
  const person = id => people.find(p => p.id === id)
  const motive = n => motives.find(m => m.n === n)
  const shown = row => {
    const v = picks[row.key]
    if (v == null) return null
    return row.kind === 'person' ? person(v)?.name : motive(v)?.rhyme
  }
  if (locked) {
    return (
      <div className="lk-pcard lk-locked" ref={card}>
        <img src={`${BASE}brand/seal.png`} alt="" />
        <p className="lk-lead">Locked in.</p>
        <p className="lk-sub">Eyes on the big screen.</p>
      </div>
    )
  }
  const row = open ? ROWS.find(r => r.key === open) : null
  return (
    <>
      <div className="lk-pcard lk-vote" ref={card}>
        <h3>Your vote</h3>
        <ul className="lk-rows">
          {ROWS.map(r => {
            const v = picks[r.key]
            return (
              <li key={r.key}>
                <button type="button" className="lk-row lk-press" onClick={() => setOpen(r.key)}>
                  <span className={`lk-row-mark${v != null ? ' done' : ''}`}>
                    {v == null ? '?' : r.kind === 'person' ? <img src={`${BASE}portraits/${v}.png`} alt="" /> : v}
                  </span>
                  <span className="lk-label">{r.label}</span>
                  <span className={`lk-row-pick${v == null ? ' empty' : ''}`}>{shown(r) ?? 'Tap to choose'}</span>
                  <span className="lk-row-go" aria-hidden="true">›</span>
                </button>
              </li>
            )
          })}
        </ul>
        <button type="button" className={`big lk-press${full ? ' lit' : ''}`} disabled={!full} onClick={lock}>Lock in</button>
      </div>
      {row && (
        <div className="lk-sheet" role="dialog" aria-label={row.label} onClick={e => { if (e.target === e.currentTarget) setOpen(null) }}>
          <div className="lk-sheet-box">
            <h4>{row.label}</h4>
            <ul className="lk-picks">
              {row.kind === 'person'
                ? people.map(p => (
                  <li key={p.id}><button type="button" className="lk-pick" onClick={() => choose(row, p.id)}>
                    <span className="lk-row-mark"><img src={`${BASE}portraits/${p.id}.png`} alt="" /></span>{p.name}
                  </button></li>
                ))
                : motives.map(m => (
                  <li key={m.n}><button type="button" className="lk-pick" onClick={() => choose(row, m.n)}>
                    <span className="lk-row-mark">{m.n}</span>{m.rhyme}
                  </button></li>
                ))}
            </ul>
          </div>
        </div>
      )}
    </>
  )
}
