import { useEffect, useRef, useState } from 'react'
import { Ground, Splash, GameCard, BigWin, TheEnd, Dedication, Phone, NowSample, RulesSwipe, VoteCard, SmallWin } from './parts'
import { SPLASHES, SPLASH_ROOMS, NOW_STATES, WINS } from './look'
import { celebrate } from '../lib/celebrate'
import { unlock } from '../lib/soundkit'
import { filmTimeline } from '../lib/rulesfilm'
import RulesFilm from '../screens/RulesFilm'
import { Saver, Idle } from '../screens/Rooms'

// The look book: /play/?look=1. The nine screens Jon approved on 12 Nov 2026
// (docs/look-approved.html), built for real, with the real art, in the order
// of his drawings; then the Rules tab's cards and the little wins. A page on
// its own: no sign-in, no night, nothing written. Never linked from a guest's
// screen.
//
//   /play/?look=1                          the book
//   /play/?look=1&show=splash&room=study   one screen, filling the window
//   (show: splash, saver (add &second=living, study or any for a Mac's second screen), second, game, win, end,
//    dedication, now, vote, met, rules;
//    room, game, state, word and who pick which; &still=1 holds it still;
//    show=film&n=7 is slide 7 of the rules film as the Parlour TV shows it)

const BASE = import.meta.env.BASE_URL
const GAME_IDS = ['orangerie', 'study', 'library', 'entryway']
const GAME_LABEL = { orangerie: 'Get Off My Lawn!', study: 'Lightbulb Moment', library: 'In Duplicate', entryway: 'Boo’s Arcade' }
const CODE_OF = { orangerie: 'salem', study: 'granolia', library: 'zimothy', entryway: 'boo' }
const HOST_OF = { orangerie: 'salem', study: 'granolia', library: 'zimothy', entryway: 'boo' }
const codeUrl = id => `https://murderwin-at-sirwin-manor.web.app/play/?meet=${CODE_OF[id]}`

// Something that moves on by itself: the cat's picture.
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
// a room's splash -> the name its screen idles under (lib/rooms.js LOOP_OF), for the screen saver
const IDLE_OF = { living: 'living', study: 'study', library: 'memory', entryway: 'boo', bedroom: 'bedroom', orangerie: 'orangerie' }
// sample picks for a picture of the vote: no night's answer (there is none here)
const SAMPLE_PICKS = { murderer: 'steeps', motive: 8, ghost: 'devine' }

// One screen, filling the window, as its room would show it.
function Show({ show, params }) {
  const turn = useTurn(20_000)
  const fixed = params.has('n') ? Number(params.get('n')) || 0 : null
  const room = SPLASHES[params.get('room')] ? params.get('room') : 'study'
  const game = GAME_IDS.includes(params.get('game')) ? params.get('game') : 'orangerie'
  const who = params.get('who') || 'boo'
  if (show === 'second') return <Splash room={room} turn={fixed ?? turn} calm className="full" />
  // a Mac's second screen as it is since the evening of 12 Nov 2026: the real idle screen, with no night
  if (show === 'saver' && params.has('second')) return <Idle title="Sirwin Manor" line="" loop={null} room={SPLASHES[params.get('second')] ? params.get('second') : null} calm />
  // an idle room screen as it is since 12 Nov 2026: the screen saver (the splash only if a face will not load)
  if (show === 'saver') return <div className="kiosk idle"><Saver which={IDLE_OF[room] ?? 'living'}><Splash room={room} turn={fixed ?? turn} className="full" /></Saver></div>
  if (show === 'game') return <GameCard id={game} turn={fixed ?? turn + 1} codeUrl={codeUrl(game)} className="full" />
  if (show === 'win') return <BigWin word={params.get('word') || 'Solved!'} who={params.get('who') || 'granolia'} sound={false} className="full" />
  if (show === 'end') return <TheEnd burst={!params.has('still')} className="full" />
  if (show === 'dedication') return <Dedication photo={`${BASE}household/sydney.jpg`} className="full" />
  // the phone screens, filling the window: on a phone they are life size
  if (show === 'now') return <div className="lk-fullphone"><Phone on="now"><NowSample state={NOW_STATES[params.get('state')] ? params.get('state') : 'room'} /></Phone></div>
  if (show === 'rules') return <div className="lk-fullphone"><Phone on="rules"><RulesSwipe /></Phone></div>
  // &picks=1 fills the three rows with sample picks; &locked=1 shows the seal
  if (show === 'vote') return <div className="lk-fullphone"><Phone title="The Vote" on="now"><VoteCard title={false} left={72} initial={params.has('picks') ? SAMPLE_PICKS : null} startLocked={params.has('locked')} /></Phone></div>
  if (show === 'met') return <div className="lk-fullphone"><SmallWin who={who} met={['granolia', who]} sound={false} /></div>
  if (show === 'film') {
    const film = filmTimeline()
    const k = Math.max(0, Math.min(film.slides.length - 1, (Number(params.get('n')) || 1) - 1))
    // &voice=3 starts the slide's recording three seconds in (add &mute=1 to try it without a sound)
    const voice = params.has('voice') ? Number(params.get('voice')) || 0 : null
    return <RulesFilm at={{ startedAt: 0, index: k, slide: film.slides[k], into: 0, voice, count: film.slides.length, total: film.total }} />
  }
  return <Splash room={room} turn={fixed ?? turn} className="full" />
}

export default function LookBook() {
  const params = new URLSearchParams(window.location.search)
  const show = params.get('show')
  const [room, setRoom] = useState('study')
  const [second, setSecond] = useState('study')
  const [now, setNow] = useState('room')
  const [game, setGame] = useState('orangerie')
  const [winKey, setWinKey] = useState(0)
  const [endKey, setEndKey] = useState(0)
  const [voteKey, setVoteKey] = useState(0)
  const [metKey, setMetKey] = useState(0)
  const [met, setMet] = useState('boo')
  const stage = useRef(null)
  const turn = useTurn(7000)
  // &still=1 holds every screen still, for a picture of it
  const still = params.has('still')
  useEffect(() => { document.documentElement.classList.toggle('lk-still', still) }, [still])

  if (show) return <Show show={show} params={params} />

  const little = level => { unlock(); celebrate(level, { root: stage.current, base: BASE }) }

  return (
    <main className="lk-book">
      <Ground tall frame={false} />
      <div className="lk-book-in">
        <header className="lk-book-top">
          <h1>The look book</h1>
          <hr />
          <p>The nine screens you approved on 12 November, built for real. Tell Claude Code what to change, by number.</p>
        </header>

        <Section n="1" title="Room splash" line="A room’s name in lights. Since the afternoon of 12 November an idle screen plays the screen saver (12); a Mac’s second display keeps this.">
          <Splash room={room} turn={turn} className="lk-tv" />
          <Chips items={SPLASH_ROOMS.map(k => [k, SPLASHES[k].name.replace('The ', '')])} value={room} onPick={setRoom} />
          <button type="button" className="lk-open" onClick={() => open(`show=splash&room=${room}`)}>See it fill the screen</button>
        </Section>

        <Section n="2" title="A Mac’s second display" line="The seal, the room’s name and the cat. Since the evening of 12 November a second screen plays the screen saver (12); this shows only if a face will not load.">
          <Splash room={second} turn={turn} calm className="lk-tv wide" />
          <Chips items={[['study', 'Study'], ['living', 'Parlour']]} value={second} onPick={setSecond} />
          <button type="button" className="lk-open" onClick={() => open(`show=second&room=${second}`)}>See it fill the screen</button>
          <button type="button" className="lk-open" onClick={() => open(`show=saver&second=${second}`)}>See the screen saver on it</button>
        </Section>

        <Section n="3" title="A game’s card" line="On a room’s screen between groups.">
          <GameCard key={game} id={game} turn={turn + 1} codeUrl={codeUrl(game)} className="lk-tv" />
          <Chips items={GAME_IDS.map(k => [k, GAME_LABEL[k]])} value={game} onPick={setGame} />
          <button type="button" className="lk-open" onClick={() => open(`show=game&game=${game}`)}>See it fill the screen</button>
        </Section>

        <Section n="4" title="A big win" line="On a room’s screen when a room is solved. Turn your sound on.">
          <BigWin key={winKey} word="Solved!" who={HOST_OF[game]} sound={winKey > 0} className="lk-tv" />
          <div className="lk-chips"><button type="button" className="lk-chip go" onClick={() => { unlock(); setWinKey(k => k + 1) }}>Play it again, with sound</button></div>
          <button type="button" className="lk-open" onClick={() => open(`show=win&who=${HOST_OF[game]}`)}>See it fill the screen</button>
        </Section>

        <Section n="5" title="The End" line="The last thing on every screen.">
          <TheEnd key={endKey} burst={endKey > 0} className="lk-tv" />
          <div className="lk-chips"><button type="button" className="lk-chip go" onClick={() => { unlock(); setEndKey(k => k + 1) }}>Play it again</button></div>
          <button type="button" className="lk-open" onClick={() => open('show=end')}>See it fill the screen</button>
        </Section>

        <Section n="6" title="The dedication" line="One card in the credits, held for eight seconds.">
          <Dedication photo={`${BASE}household/sydney.jpg`} className="lk-tv" />
          <button type="button" className="lk-open" onClick={() => open('show=dedication')}>See it fill the screen</button>
        </Section>

        <Section n="7" title="Phone: Now" line="Where to go, and one button.">
          <div className="lk-handset"><Phone on="now"><NowSample key={now} state={now} onGo={el => { unlock(); celebrate('small', { root: el.closest('.lk-phone'), at: el, base: BASE }) }} /></Phone></div>
          <Chips items={Object.entries(NOW_STATES).map(([k, s]) => [k, s.chip])} value={now} onPick={setNow} />
          <button type="button" className="lk-open" onClick={() => open(`show=now&state=${now}`)}>See it fill the screen</button>
        </Section>

        <Section n="8" title="Phone: The vote" line="Tap a row, pick, come back. Lock in lights when all three are filled.">
          <div className="lk-handset"><Phone title="The Vote" on="now"><VoteCard key={voteKey} title={false} left={72} /></Phone></div>
          <div className="lk-chips"><button type="button" className="lk-chip" onClick={() => setVoteKey(k => k + 1)}>Start the vote again</button></div>
          <button type="button" className="lk-open" onClick={() => open('show=vote&picks=1')}>See it fill the screen</button>
        </Section>

        <Section n="9" title="Phone: A small win" line="After a cat has told you what it knows.">
          <div className="lk-handset"><SmallWin key={`${met}${metKey}`} who={met} met={['granolia', met]} sound={metKey > 0} className="framed" onDone={() => { unlock(); setMetKey(k => k + 1) }} /></div>
          <Chips items={[['boo', 'Boo'], ['granolia', 'Granolia'], ['zimothy', 'Zimothy'], ['salem', 'Salem']]} value={met} onPick={setMet} />
          <button type="button" className="lk-open" onClick={() => open(`show=met&who=${met}`)}>See it fill the screen</button>
        </Section>

        <Section n="10" title="Phone: Rules" line="Cards to swipe, as built on 11 November.">
          <div className="lk-handset"><Phone on="rules"><RulesSwipe /></Phone></div>
          <button type="button" className="lk-open" onClick={() => open('show=rules')}>See it fill the screen</button>
        </Section>

        <Section n="11" title="The little wins" line="A sparkle, a seal, a burst, a soft buzz. Tap each one, with your sound on.">
          <div ref={stage}><Splash room="library" turn={2} className="lk-tv" /></div>
          <div className="lk-when">
            {WINS.map(w => (
              <button key={w.level} type="button" className="lk-press" onClick={() => little(w.level)}>
                <b>{w.name}</b>
                <span>{w.when}</span>
              </button>
            ))}
          </div>
        </Section>

        <Section n="12" title="The screen saver" line="What a room’s screen shows when nobody is playing on it. A face crosses the screen and turns at every edge; after ten edges it becomes the next face.">
          <div className="lk-tv lk-saver"><Saver which={IDLE_OF[room] ?? 'living'} /></div>
          <button type="button" className="lk-open" onClick={() => open(`show=saver&room=${room}`)}>See it fill the screen</button>
        </Section>
      </div>
    </main>
  )
}
