import { useEffect, useRef, useState } from 'react'
import { Ground, Cat, Splash, GameCard, TheEnd, Dedication, Phone, NowCard, RulesSwipe, VoteCard } from './parts'
import { SPLASHES, SPLASH_ROOMS, NOW_STATES, WINS, HOUSE_TIPS } from './look'
import { celebrate } from '../lib/celebrate'
import { unlock } from '../lib/soundkit'
import { filmTimeline } from '../lib/rulesfilm'
import RulesFilm from '../screens/RulesFilm'

// The look book (handoff 11 Nov 2026, B1): /play/?look=1. Eight real screens
// in the new look, with the real art, for Jon to say yes or no to before
// anything rolls out. A page on its own: no sign-in, no night, nothing
// written. Never linked from a guest's screen.
//
//   /play/?look=1                       the book
//   /play/?look=1&show=splash&room=study   one room screen, filling the window
//   (show: splash, second, game, end, dedication; room and game pick which;
//    show=film&n=7 is slide 7 of the rules film, silent, as the Parlour TV draws it)

const BASE = import.meta.env.BASE_URL
const GAME_IDS = ['orangerie', 'study', 'library', 'entryway']
const GAME_LABEL = { orangerie: 'Get Off My Lawn!', study: 'Lightbulb Moment', library: 'In Duplicate', entryway: 'Boo’s Arcade' }
const CODE_OF = { orangerie: 'salem', study: 'granolia', library: 'zimothy', entryway: 'boo' }
const codeUrl = id => `https://murderwin-at-sirwin-manor.web.app/play/?meet=${CODE_OF[id]}`

// Something that moves on by itself: the cat's picture, the tip.
function useTurn(ms) {
  const [n, setN] = useState(0)
  useEffect(() => { const id = setInterval(() => setN(k => k + 1), ms); return () => clearInterval(id) }, [ms])
  return n
}

function Section({ n, title, line, children }) {
  return (
    <section className="lk-sec">
      <header className="lk-sec-head">
        <span className="lk-sec-n">{n}</span>
        <h2>{title}</h2>
        <p>{line}</p>
      </header>
      {children}
    </section>
  )
}

function Chips({ items, value, onPick }) {
  return (
    <div className="lk-chips">
      {items.map(([key, word]) => <button key={key} type="button" className={key === value ? 'lk-chip on' : 'lk-chip'} onClick={() => onPick(key)}>{word}</button>)}
    </div>
  )
}

const open = query => { window.location.assign(`${BASE}?look=1&${query}`) }
const SAMPLE_PICKS = { murderer: 'ledger', motive: 12, ghost: 'barnes' }

// The stage the wins play on: a room's screen with its cat and one card.
function Stage({ stageRef = null, className = '' }) {
  return (
    <div ref={stageRef} className={`lk-screen lk-stage${className ? ` ${className}` : ''}`}>
      <Ground />
      <Cat who="zimothy" n={3} />
      <div className="lk-card">
        <p className="lk-label">In Duplicate</p>
        <p className="lk-big">A match!</p>
      </div>
    </div>
  )
}
// &show=win&level=big: the stage filling the window, the win played once (quiet: nobody tapped).
// &freeze=1 stops every piece part of the way through its flight, for a picture of the win.
function WinStage({ level, freeze = false }) {
  const stage = useRef(null)
  useEffect(() => {
    if (!level) return undefined
    const id = setTimeout(() => {
      celebrate(level, { root: stage.current, at: stage.current?.querySelector('.lk-card') ?? null, quiet: true, base: BASE })
      if (!freeze) return
      for (const el of stage.current?.querySelectorAll('.lk-fx > *') ?? []) {
        const length = parseFloat(getComputedStyle(el).animationDuration) || 1
        el.style.animationDelay = `${-(el.classList.contains('lk-flash') ? 0.16 : 0.42) * length}s`
        el.style.animationPlayState = 'paused'
      }
    }, freeze ? 1200 : 300)
    return () => clearTimeout(id)
  }, [level, freeze])
  return <>{freeze && <img src={`${BASE}brand/seal.png`} alt="" hidden />}<Stage stageRef={stage} className="full" /></>
}

// One screen, filling the window, as its room would show it.
function Show({ show, params }) {
  const turn = useTurn(20_000)
  const tip = HOUSE_TIPS[useTurn(60_000) % HOUSE_TIPS.length]
  const room = SPLASHES[params.get('room')] ? params.get('room') : 'living'
  const game = GAME_IDS.includes(params.get('game')) ? params.get('game') : 'orangerie'
  if (show === 'second') return <Splash room={room} turn={turn} calm className="full" />
  if (show === 'game') return <GameCard id={game} turn={turn} codeUrl={codeUrl(game)} className="full" />
  if (show === 'end') return <TheEnd className="full" />
  if (show === 'dedication') return <Dedication className="full" />
  // the three phone screens, filling the window: on a phone they are life size
  if (show === 'now') return <div className="lk-fullphone"><Phone label="Act 2" title="Lights Out" on="now"><NowCard state={NOW_STATES[params.get('state')] ? params.get('state') : 'cat'} /></Phone></div>
  if (show === 'rules') return <div className="lk-fullphone"><Phone label="The rules" title="How to play" on="rules"><RulesSwipe /></Phone></div>
  // &picks=1 fills the three rows with sample picks (no night's answer: there is none here); &locked=1 shows the seal
  if (show === 'vote') return <div className="lk-fullphone"><Phone label="Act 7" title="Unmasked" on="now"><VoteCard initial={params.has('picks') ? SAMPLE_PICKS : null} startLocked={params.has('locked')} /></Phone></div>
  if (show === 'win') return <WinStage level={params.get('level')} freeze={params.has('freeze')} />
  if (show === 'film') {
    const film = filmTimeline()
    const k = Math.max(0, Math.min(film.slides.length - 1, (Number(params.get('n')) || 1) - 1))
    // &voice=3 starts the slide's recording three seconds in (add &mute=1 to try it without a sound)
    const voice = params.has('voice') ? Number(params.get('voice')) || 0 : null
    return <RulesFilm at={{ startedAt: 0, index: k, slide: film.slides[k], into: 0, voice, count: film.slides.length, total: film.total }} />
  }
  return <Splash room={room} turn={turn} tip={tip} className="full" />
}

export default function LookBook() {
  const params = new URLSearchParams(window.location.search)
  const show = params.get('show')
  const [room, setRoom] = useState('study')
  const [second, setSecond] = useState(false)
  const [now, setNow] = useState('cat')
  const [game, setGame] = useState('orangerie')
  const [endKey, setEndKey] = useState(0)
  const [voteKey, setVoteKey] = useState(0)
  const stage = useRef(null)
  const end = useRef(null)
  const turn = useTurn(7000)
  const tip = HOUSE_TIPS[useTurn(9000) % HOUSE_TIPS.length]
  // &still=1 holds every screen still, for a picture of it
  const still = params.has('still')
  useEffect(() => { document.documentElement.classList.toggle('lk-still', still) }, [still])

  if (show) return <Show show={show} params={params} />

  const win = level => { unlock(); celebrate(level, { root: stage.current, at: stage.current?.querySelector('.lk-card') ?? null, base: BASE }) }
  const again = () => { unlock(); setEndKey(k => k + 1); setTimeout(() => celebrate('big', { root: end.current, base: BASE }), 60) }

  return (
    <main className="lk-book">
      <Ground calm />
      <div className="lk-book-in">
        <header className="lk-book-top">
          <p className="lk-label">Sirwin Manor</p>
          <h1>The look book</h1>
          <hr />
          <p>Eight screens in the new look. Tell Claude Code yes, or what to change, by number. Nothing rolls out until you do.</p>
        </header>

        <Section n="1" title="A room’s splash" line="What a room screen shows when nobody is playing on it. Its own cat, always moving.">
          <Splash room={room} turn={turn} tip={second ? null : tip} tipMs={9000} calm={second} className="lk-tv" />
          <Chips items={SPLASH_ROOMS.map(k => [k, SPLASHES[k].name.replace('The ', '')])} value={room} onPick={setRoom} />
          <Chips items={[['main', 'The room’s screen'], ['second', 'A second display']]} value={second ? 'second' : 'main'} onPick={k => setSecond(k === 'second')} />
          <p className="lk-note">The cat’s picture changes through the night. A tip fades in once a minute (faster here).</p>
          <button type="button" className="lk-open" onClick={() => open(`show=${second ? 'second' : 'splash'}&room=${room}`)}>See it fill the screen</button>
        </Section>

        <Section n="2" title="The phone’s Now tab" line="One big card: what to do right now, and one button.">
          <div className="lk-handset short">
            <Phone label="Act 2" title="Lights Out" on="now">
              <NowCard key={now} state={now} onGo={el => { unlock(); celebrate('small', { root: el.closest('.lk-phone'), at: el, base: BASE }) }} />
            </Phone>
          </div>
          <Chips items={Object.entries(NOW_STATES).map(([k, s]) => [k, s.chip])} value={now} onPick={setNow} />
          <button type="button" className="lk-open" onClick={() => open(`show=now&state=${now}`)}>See it fill the screen</button>
        </Section>

        <Section n="3" title="The phone’s Rules tab" line="Cards to swipe. One idea a card, a picture on each.">
          <div className="lk-handset short">
            <Phone label="The rules" title="How to play" on="rules">
              <RulesSwipe />
            </Phone>
          </div>
          <button type="button" className="lk-open" onClick={() => open('show=rules')}>See it fill the screen</button>
        </Section>

        <Section n="4" title="A win, small and big" line="Every win gets a moment. Tap each one. Turn your sound on.">
          <Stage stageRef={stage} className="lk-tv" />
          <div className="lk-when">
            {WINS.map(w => (
              <button key={w.level} type="button" className="lk-press" onClick={() => win(w.level)}>
                <b>{w.name}</b>
                <span>{w.when}</span>
              </button>
            ))}
          </div>
        </Section>

        <Section n="5" title="The vote" line="One card, three rows. Lock in lights when all three are filled.">
          <div className="lk-handset">
            <Phone label="Act 7" title="Unmasked" on="now">
              <VoteCard key={voteKey} />
            </Phone>
          </div>
          <div className="lk-chips"><button type="button" className="lk-chip" onClick={() => setVoteKey(k => k + 1)}>Start the vote again</button></div>
          <button type="button" className="lk-open" onClick={() => open('show=vote')}>See it fill the screen</button>
        </Section>

        <Section n="6" title="A game’s rules card" line="On a room’s screen between groups. The name in lights, two short lines, the code.">
          <GameCard key={game} id={game} turn={turn} codeUrl={codeUrl(game)} className="lk-tv" />
          <Chips items={GAME_IDS.map(k => [k, GAME_LABEL[k]])} value={game} onPick={setGame} />
          <button type="button" className="lk-open" onClick={() => open(`show=game&game=${game}`)}>See it fill the screen</button>
        </Section>

        <Section n="7" title="The End" line="The last thing on every screen. Jazz plays and the lights are up.">
          <div ref={end}><TheEnd key={endKey} burst={endKey === 0} className="lk-tv" /></div>
          <div className="lk-chips"><button type="button" className="lk-chip go" onClick={again}>Play it again, with sound</button></div>
          <button type="button" className="lk-open" onClick={() => open('show=end')}>See it fill the screen</button>
        </Section>

        <Section n="8" title="The dedication" line="One card in the credits, held for eight seconds. Your words go here when they come.">
          <Dedication className="lk-tv" />
          <button type="button" className="lk-open" onClick={() => open('show=dedication')}>See it fill the screen</button>
        </Section>
      </div>
    </main>
  )
}
