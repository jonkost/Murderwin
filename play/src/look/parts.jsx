import { useEffect, useRef, useState } from 'react'
import characters from '../../../seed/characters.json' with { type: 'json' }
import motiveList from '../../../seed/motives.json' with { type: 'json' }
import names from '../../../seed/game-names.json' with { type: 'json' }
import { useQr } from '../lib/qr'
import { celebrate } from '../lib/celebrate'
import { unlock, play } from '../lib/soundkit'
import { CAT_NAMES } from '../lib/rooms'
import { SPLASHES, GAME_STEPS, RULE_CARDS, NOW_STATES, TWINKLES, WIN_PAWS, FACES, CATS, confetti, pictureFor, trimOf, trimStyle, headStyle } from './look'
import TabIcon from '../screens/TabIcon'
import './look.css'

// The pieces of the look (look.css). The look is the one Jon approved on
// 12 Nov 2026, kept exactly as drawn in docs/look-approved.html: each piece
// here is one of those nine screens, sized from its own box so it is right on
// a TV, an iPad and a phone. The look book (LookBook.jsx) shows them all;
// the night's own screens use the same pieces. Nothing here reads a night:
// every word and picture comes in as a prop or from the open seed lists.

const BASE = import.meta.env.BASE_URL
const pic = file => `${BASE}household/full/${encodeURIComponent(file)}`
const face = file => `${BASE}household/faces/${encodeURIComponent(file)}`
const SEAL = `${BASE}brand/seal.png`
const GAMES = Object.fromEntries(names.games.map(g => [g.id, g]))
const MOTIVES = motiveList.motives ?? motiveList
const PEOPLE = characters.characters

// The ground of every screen: the wallpaper under a veil of Manor blue, dark
// at the edges, a gaslight glow, and the brass double line round the screen.
// `tall` is a phone (no line, the phone's wallpaper); `calm` holds it still.
export function Ground({ tall = false, calm = false, frame = !tall, still = false }) {
  return (
    <div className={`lk-ground${tall ? ' tall' : ''}${calm ? ' calm' : ''}${still ? ' held' : ''}`} aria-hidden="true">
      <div className="lk-wall" />
      <div className="lk-veil" />
      <div className="lk-vignette" />
      <div className="lk-gas" />
      {frame && <><div className="lk-frame a" /><div className="lk-frame b" /></>}
    </div>
  )
}

// One of the household: Jon's own picture, cut to its own edges, floating.
// It hops when the window hears a win (lib/celebrate.js). `file` names one
// picture; else `who` and a turn `n` pick one of theirs. `move`: float (the
// default), peek, hop, pop or still.
export function Cat({ who, n = 0, file = null, move = 'float', className = '' }) {
  const f = file ?? pictureFor(who, n)
  const [hop, setHop] = useState(false)
  useEffect(() => {
    const on = e => { if (e.detail?.hop) { setHop(true); setTimeout(() => setHop(false), 950) } }
    window.addEventListener('celebrate', on)
    return () => window.removeEventListener('celebrate', on)
  }, [])
  if (!f) return null
  return (
    <span key={f} className={`lk-cat ${hop ? 'hop' : move}${className ? ` ${className}` : ''}`} style={{ '--r': trimOf(f)[4] }} aria-hidden="true">
      <span><img src={pic(f)} alt="" draggable="false" style={trimStyle(f)} /></span>
    </span>
  )
}

// A marquee frame: the name in lights, a row of slow bulbs above and below.
// `fast` is a game's card and The End; the bulbs of a room's splash are slow.
export function Marquee({ children, bulbs = 16, fast = false, className = '' }) {
  const row = <div className="lk-bulbs" aria-hidden="true">{Array.from({ length: bulbs }, (_, i) => <i key={i} />)}</div>
  return <div className={`lk-marquee${fast ? ' fast' : ''}${className ? ` ${className}` : ''}`}>{row}{children}{row}</div>
}

// A few twinkles: four-point stars that breathe. `spots` is one of look.js TWINKLES.
export function Twinkles({ spots = TWINKLES.splash, quick = false }) {
  return spots.map(([x, y, size, delay, tone], i) => (
    <svg key={i} className={`lk-twinkle lk-tone-${tone}${quick ? ' quick' : ''}`} viewBox="0 0 24 24" aria-hidden="true"
      style={{ left: `${x}%`, top: `${y}%`, '--tw': size, animationDelay: `${delay}s` }}>
      <path d="M12 0 L14.5 9.5 L24 12 L14.5 14.5 L12 24 L9.5 14.5 L0 12 L9.5 9.5 Z" fill="currentColor" />
    </svg>
  ))
}

function Paw() {
  return <svg viewBox="0 0 48 48" aria-hidden="true"><g fill="currentColor"><ellipse cx="24" cy="31" rx="11" ry="9" /><ellipse cx="10" cy="19" rx="4.5" ry="6" /><ellipse cx="19" cy="11" rx="4.5" ry="6" /><ellipse cx="29" cy="11" rx="4.5" ry="6" /><ellipse cx="38" cy="19" rx="4.5" ry="6" /></g></svg>
}

// Confetti falling across the whole screen, behind the words: paw prints and
// paper strips (look.js confetti). `tall` is a phone.
export function Confetti({ tall = false }) {
  return (
    <div className={`lk-confetti${tall ? ' tall' : ''}`} aria-hidden="true">
      {confetti(tall).map((c, i) => (
        <i key={i} className={`lk-fall lk-${c.kind} lk-tone-${c.tone}`} style={{ left: `${c.x}%`, '--fs': c.size, animationDuration: `${c.ms}ms`, animationDelay: `${c.delay}ms` }}>
          {c.kind === 'paw' && <Paw />}
        </i>
      ))}
    </div>
  )
}

// The brass double rule under a big word.
function Rule() { return <hr className="lk-rule" /> }

// 1. A room's splash: the room's name in a marquee frame with slow bulbs, the
// cat's name on a red bar, lower left, and the cat, large, on the right. The
// cat's picture changes through the night (`turn` moves it on).
// 2. `calm` is a Mac's second display: the seal, the room's name and the cat.
// No other words on either.
export function Splash({ room = 'living', turn = 0, calm = false, className = '' }) {
  const s = SPLASHES[room] ?? SPLASHES.living
  if (calm) {
    return (
      <div className={`lk-screen lk-second${className ? ` ${className}` : ''}`}>
        <Ground calm />
        <img className="lk-seal-mark" src={SEAL} alt="" aria-hidden="true" />
        <div className="lk-second-words">
          <h2 className="lk-big" style={{ '--chars': s.name.length }}>{s.name}</h2>
          <Rule />
        </div>
        <Cat who={s.who} n={turn + 1} />
      </div>
    )
  }
  return (
    <div className={`lk-screen lk-splash${className ? ` ${className}` : ''}`}>
      <Ground />
      <Marquee><h2 className="lk-big" style={{ '--chars': s.name.length }}>{s.name}</h2></Marquee>
      <p className="lk-namebar"><i aria-hidden="true" /><b>{CAT_NAMES[s.who]}</b></p>
      <Twinkles spots={TWINKLES.splash} />
      <Cat who={s.who} n={turn} />
    </div>
  )
}

// 3. A game's card, between groups: the name in lights, the game's steps as
// numbered cards, Scan to start by the room's code, and the room's cat.
// `line` is one working line under the steps (Eyes on your phones.), when the
// room has one to say; `code` false leaves the code off while a group plays.
export function GameCard({ id = 'orangerie', turn = 0, codeUrl = null, line = null, file = null, className = '', children = null }) {
  const g = GAMES[id]
  const steps = GAME_STEPS[id] ?? []
  const qr = useQr(codeUrl, 360)
  if (!g) return null
  return (
    <div className={`lk-screen lk-game${className ? ` ${className}` : ''}`}>
      <Ground />
      <Marquee bulbs={18} fast><h2 className="lk-big" style={{ '--chars': g.name.length }}>{g.name}</h2></Marquee>
      <ol className="lk-steps">{steps.map((step, i) => <li key={i}><b>{i + 1}</b><span>{step}</span></li>)}</ol>
      {line && <p className="lk-game-line">{line}</p>}
      <Cat who={g.host} n={turn} file={file} />
      {qr && <figure className="lk-code"><img src={qr} alt="" /><figcaption>Scan to start</figcaption></figure>}
      {children}
    </div>
  )
}

// 4. A big win on a room screen: one big word, the seal stamping in, paw
// prints bursting out, twinkles, and the room's cat hopping. No card. It
// plays the fanfare once as it arrives (silent on a screen nobody has woken).
export function BigWin({ word = 'Solved!', who = 'irwin', n = 3, sound = true, className = '' }) {
  useEffect(() => { if (sound) play('fanfare') }, [sound])
  return (
    <div className={`lk-screen lk-win${className ? ` ${className}` : ''}`} role="status">
      <Ground still />
      {WIN_PAWS.map(([x, y, size, lean, tone, fx, fy], i) => (
        <i key={i} className={`lk-winpaw lk-tone-${tone}`} aria-hidden="true" style={{ left: `${x}%`, top: `${y}%`, '--fs': size, '--lean': `${lean}deg`, '--fx': fx, '--fy': fy }}><Paw /></i>
      ))}
      <Twinkles spots={TWINKLES.win} quick />
      <div className="lk-win-words">
        <h2 className="lk-big" style={{ '--chars': word.length }}>{word}</h2>
        <Rule />
      </div>
      <img className="lk-stamp" src={SEAL} alt="" aria-hidden="true" />
      <Cat who={who} n={n} move="hop" />
    </div>
  )
}

// 5. The End, in lights: confetti falling across the whole screen behind the
// words, Sir Irwin, his birthday line. `burst` plays one burst of paw prints
// when the card arrives (quiet: the music is the house's).
export function TheEnd({ line = 'Happy first birthday, Sir Irwin.', burst = true, className = '' }) {
  const root = useRef(null)
  useEffect(() => {
    if (!burst) return undefined
    const id = setTimeout(() => celebrate('big', { root: root.current, quiet: true, base: BASE }), 500)
    return () => clearTimeout(id)
  }, [burst])
  return (
    <div ref={root} className={`lk-screen lk-end${className ? ` ${className}` : ''}`}>
      <Ground still frame={false} />
      <Confetti />
      <div className="lk-frame a" aria-hidden="true" /><div className="lk-frame b" aria-hidden="true" />
      <div className="lk-end-stack">
        <Marquee fast><h2 className="lk-big">The End</h2></Marquee>
        <p className="lk-end-line">{line}</p>
      </div>
      <Cat who="irwin" n={3} />
    </div>
  )
}

// 6. The dedication, one card in the credits: Sydney's photo in a round
// brass frame above Jon's words, exactly as he wrote them (12 Nov 2026: "It
// should read 'For Sydney, The Best Big Brother A Pup Could Ask For'"), his
// capitals and his comma kept, nothing added. Two lines, broken after the
// comma and nowhere else: the second a little smaller. No heading. A photo
// that will not load leaves the frame off: nothing stands in for him.
export const DEDICATION = 'For Sydney, The Best Big Brother A Pup Could Ask For'
export function dedicationLines(line = DEDICATION) {
  const at = line.indexOf(',')
  return at < 0 ? [line, ''] : [line.slice(0, at + 1), line.slice(at + 1).trim()]
}
export function Dedication({ line = DEDICATION, photo = null, className = '' }) {
  const [lost, setLost] = useState(false)
  useEffect(() => setLost(false), [photo])
  const [first, second] = dedicationLines(line)
  return (
    <div className={`lk-screen lk-dedication${className ? ` ${className}` : ''}`}>
      <Ground still />
      <div className="lk-dedication-in">
        {photo && !lost && <span className="lk-photo"><img src={photo} alt="Sydney" onError={() => setLost(true)} /></span>}
        <Rule />
        <p className="lk-dedication-line"><span>{first}</span>{second && <span>{second}</span>}</p>
      </div>
    </div>
  )
}

// ---- the phone ---------------------------------------------------------------

const TABS = [['now', 'Now'], ['you', 'You'], ['clues', 'Clues'], ['notes', 'Notes'], ['motives', 'Motives'], ['cats', 'Cats'], ['rules', 'Rules']]

// The round camera button, top right on every tab (job A12 mounts the real one).
export function ScanMark() {
  return (
    <span className="lk-scan" aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 8h3l2-3h6l2 3h3v11H4z" /><circle cx="12" cy="13" r="3.5" /></svg>
    </span>
  )
}

// A phone's page in the look book: the seal (or one title) top left, the
// camera top right, the body, the tabs. `on` lights a tab.
export function Phone({ title = null, on = 'now', bare = false, children }) {
  return (
    <div className="lk-phone">
      <Ground tall />
      {!bare && (
        <header className={`lk-phone-head${title ? ' titled' : ''}`}>
          {title ? <h2 className="lk-big">{title}</h2> : <img className="lk-phone-seal" src={SEAL} alt="" aria-hidden="true" />}
          <ScanMark />
        </header>
      )}
      <div className="lk-phone-body">{children}</div>
      {!bare && (
        <nav className="lk-tabs" aria-hidden="true">
          {TABS.map(([key, word]) => (
            <span key={key} className={key === on ? 'tab on' : 'tab'}>
              <span className="tab-mark"><TabIcon name={key} /></span>
              <span className="tab-word">{word}</span>
            </span>
          ))}
        </nav>
      )}
    </div>
  )
}

const ScanIcon = () => <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5" /><path d="M9 9h6v6H9z" /></svg>

// 7. The Now tab: one card. Where to go, and the one button. The room's cat
// looks over the top of the card. `quiet` is a working control under the
// button (Not yet); `clock` is the last seconds of a clock, big.
export function NowCard({ who = null, n = 0, file = null, lead, button = null, icon = null, onGo = null, quiet = null, onQuiet = null, clock = null, busy = false, children = null }) {
  return (
    <div className={`lk-now-wrap${who || file ? ' peeked' : ''}`}>
      {(who || file) && <Cat who={who} n={n} file={file} move="peek" />}
      <section className="lk-pcard lk-now">
        <h3 className="lk-lead">{lead}</h3>
        {clock != null && <p className="lk-clock"><b>{clock}</b></p>}
        {children}
        {button && (
          <button type="button" className="lk-go lk-press" disabled={busy} onClick={e => onGo?.(e.currentTarget)}>
            {icon === 'scan' && <ScanIcon />}<span>{button}</span>
          </button>
        )}
        {quiet && <button type="button" className="lk-quiet" disabled={busy} onClick={() => onQuiet?.()}>{quiet}</button>}
      </section>
    </div>
  )
}
// The look book's samples.
export function NowSample({ state = 'room', onGo = null }) {
  const s = NOW_STATES[state] ?? NOW_STATES.room
  return <NowCard who={s.who} n={s.n} lead={s.lead} button={s.button} icon={s.icon} quiet={s.quiet} onGo={onGo} />
}

// The Rules tab: cards to swipe. One idea a card, a picture on each. The
// first card is the whole game in three lines. (As built on 11 Nov.)
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
    <div className="lk-rules-tab">
      <div ref={rail} className="lk-swipe" onScroll={onScroll}>
        {cards.map((c, i) => (
          <article key={c.title} className="lk-rcard">
            <div className="lk-rcard-art">
              <div className="lk-wall" />
              <Cat who={c.who} n={c.n ?? i} />
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
    </div>
  )
}

// 8. The vote: The Vote, a bar for the time left, three rows with each pick's
// portrait cut to the head, and Lock in. Tap a row, pick, come back. Lock in
// lights when all three are filled; then the seal comes down. `onLock` gets
// the three picks. In the look book the lists are the open ones (the fourteen
// characters, the nineteen motives); on the night the ballot hands its own in.
// `left` is how many seconds remain, `of` the clock's whole length.
const ROWS = [
  { key: 'murderer', label: 'The Murderer', kind: 'person' },
  { key: 'motive', label: 'The Motive', kind: 'motive' },
  { key: 'ghost', label: 'The Ghost', kind: 'person' },
]
const clockWords = s => `${Math.floor(s / 60)}:${String(Math.max(0, Math.floor(s % 60))).padStart(2, '0')}`
export function Head({ id }) {
  return <span className="lk-head"><img src={`${BASE}portraits/${id}.png`} alt="" style={headStyle(id)} /></span>
}
export function VoteCard({ people = PEOPLE, motives = MOTIVES, onLock = null, onPick = null, sound = true, initial = null, startLocked = false, left = null, of = 120, busy = false, title = true }) {
  const [picks, setPicks] = useState(initial ?? {})
  const [open, setOpen] = useState(null)
  const [locked, setLocked] = useState(startLocked)
  const full = ROWS.every(r => picks[r.key] != null)
  const choose = (row, value) => {
    const next = { ...picks, [row.key]: value }
    setPicks(next)
    setOpen(null)
    onPick?.(next)
    if (sound) { unlock(); play('ding') }
  }
  const lock = () => {
    if (!onLock) setLocked(true)
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
  if (locked) return <VoteLocked />
  const row = open ? ROWS.find(r => r.key === open) : null
  return (
    <div className="lk-vote">
      {title && <h3 className="lk-big lk-vote-title">The Vote</h3>}
      {left != null && (
        <div className="lk-timebar" role="timer" aria-label={`${clockWords(left)} left`}>
          <i aria-hidden="true"><b style={{ width: `${Math.max(0, Math.min(100, (100 * left) / of))}%` }} /></i>
          <span>{clockWords(left)}</span>
        </div>
      )}
      <ul className="lk-rows">
        {ROWS.map(r => {
          const v = picks[r.key]
          return (
            <li key={r.key}>
              <button type="button" className="lk-row lk-press" disabled={busy} onClick={() => setOpen(r.key)}>
                {v == null ? <span className="lk-mark empty" aria-hidden="true">?</span>
                  : r.kind === 'person' ? <Head id={v} /> : <span className="lk-mark" aria-hidden="true">{v}</span>}
                <span className="lk-row-words">
                  <span className="lk-row-label">{r.label}</span>
                  <span className={`lk-row-pick${v == null ? ' empty' : (shown(r) ?? '').length > 18 ? ' long' : ''}`}>{shown(r) ?? 'Tap to choose'}</span>
                </span>
                <svg className="lk-row-go" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 6l6 6-6 6" /></svg>
              </button>
            </li>
          )
        })}
      </ul>
      <button type="button" className={`lk-lock lk-press${full ? ' lit' : ''}`} disabled={!full || busy} onClick={lock}>{busy ? 'Sending…' : 'Lock in'}</button>
      {row && (
        <div className="lk-sheet" role="dialog" aria-label={row.label} onClick={e => { if (e.target === e.currentTarget) setOpen(null) }}>
          <div className="lk-sheet-box">
            <h4>{row.label}</h4>
            <ul className="lk-picks">
              {row.kind === 'person'
                ? people.map(p => (
                  <li key={p.id}><button type="button" className="lk-pick" onClick={() => choose(row, p.id)}><Head id={p.id} />{p.name}</button></li>
                ))
                : motives.map(m => (
                  <li key={m.n}><button type="button" className="lk-pick" onClick={() => choose(row, m.n)}><span className="lk-mark" aria-hidden="true">{m.n}</span>{m.rhyme}</button></li>
                ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  )
}
// After Lock in: the seal, stamped, and the one line.
export function VoteLocked({ line = 'Locked in. Eyes on the big screen.' }) {
  return (
    <div className="lk-pcard lk-locked">
      <img src={SEAL} alt="" />
      <p className="lk-lead">{line}</p>
    </div>
  )
}

// 9. A small win on a phone, filling it: the cat's picture, the seal stamping
// in, one line (You met Miss Boo LaRue), the four cat faces (met: in color
// with a tick; not met: gray), and Done. Confetti and twinkles. It plays the
// seal's sound once as it arrives.
export function SmallWin({ who = 'boo', n = 3, lines = null, met = [], onDone = null, button = 'Done', sound = true, className = '' }) {
  useEffect(() => { if (sound) play('seal') }, [sound])
  const words = lines ?? ['You met', CAT_NAMES[who]]
  return (
    <div className={`lk-smallwin${className ? ` ${className}` : ''}`} role="status">
      <Ground tall />
      <Confetti tall />
      <Twinkles spots={TWINKLES.phone} quick />
      <div className="lk-smallwin-art">
        <Cat who={who} n={n} move="pop" />
        <img className="lk-stamp" src={SEAL} alt="" aria-hidden="true" />
      </div>
      <h2 className="lk-big">{words.map((w, i) => <span key={i}>{w}</span>)}</h2>
      <ul className="lk-faces">
        {CATS.map(c => {
          const on = met.includes(c)
          return (
            <li key={c} className={`${on ? 'met' : 'unmet'}${c === who ? ' just' : ''}`}>
              <span className="lk-face"><span style={{ '--r': trimOf(FACES[c])[4] }}><img src={face(FACES[c])} alt={`${CAT_NAMES[c]}, ${on ? 'met' : 'not met yet'}`} style={trimStyle(FACES[c])} /></span></span>
              {on && <b aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5 9-10" /></svg></b>}
            </li>
          )
        })}
      </ul>
      <button type="button" className="lk-go lk-press" onClick={() => onDone?.()}>{button}</button>
    </div>
  )
}
