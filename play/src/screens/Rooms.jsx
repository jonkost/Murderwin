import { useEffect, useMemo, useRef, useState } from 'react'
import { callMemoryStep, callBooDone } from '../firebase'
import { useTick } from '../lib/hooks'
import { useQr } from '../lib/qr'
import { PLAY_URL } from '../lib/config'
import { ms, booMoment } from '../lib/night'
import { promptShown, videoUrl, MEMORY_ROUNDS, ALL_TRACES, ZIMOTHY_LINES, standaloneBoards, GAME_NAMES, loopUrl, meetUrl, codeWords, CAT_NAMES, catPictureUrl, RULES_LINES, rulesLine } from '../lib/rooms'
import Spoken from './Spoken'

// The room screens added on 23 Oct 2026 (docs/handoff-2026-10-23.md):
//   the Parlour TV  Sir Irwin's sharing prompts (Act 2's cat visits, Act 4's
//                   rounds), the Act 4 title card, and the W-O-O-F News
//                   bulletins as video (bulletin 1, the closing bulletin)
//   ?kiosk=memory   Zimothy's memory match in three rounds, all fourteen traces
//   ?kiosk=memory&play=1   the same game on its own, no case, no clues
//   ?kiosk=boo      Boo's catwalk on the triangle wall, from Susan's MacBook Pro
//   ?kiosk=boo&practice=1   the Game test tab's practice show (screens/Practice.jsx)
// And on 25 Oct 2026, for Jon's cue list (docs/cue-list.md, DESIGN section 6):
//   Idle and Loop   every idle screen's looping graphic, the crest until the file is in
//   RoomCode        each room's cat code during Act 2's cat visits (cue 7)
//   RulesCard       the Act 4 rules card between groups: the game's name and hook,
//                   the host's line, the cat's picture (varied) and the room's code
//   JoinScreen      the join code on the Parlour TV (Act 1, the dinner wrap-up)
//   RejoinCode      the small code under the ballot clock (cue 19)
//   BirthdayScreen  the Happy Birthday Irwin card from the Cake! button (cue 13)
//   ?kiosk=orangerie   the brain's browser in the Orangerie: Salem's code in Act 2,
//                   the Get Off My Lawn! rules card in Act 4, its loop otherwise
// Everything here reads public docs and open lines only.

const BASE = import.meta.env.BASE_URL

// ---- the loop slot, on every idle screen -------------------------------------

// Jon's looping graphic for a screen (play/public/loops/<name>.mp4, silent),
// shown once the browser has its first frame; until then, and when there is
// no file or it will not play, the children (the crest and a line). Nothing
// is fetched to find out: the video element says so itself.
export function Loop({ which, children = null, className = '' }) {
  const src = loopUrl(which, BASE)
  const [ready, setReady] = useState(false)
  const [failed, setFailed] = useState(false)
  useEffect(() => { setReady(false); setFailed(false) }, [src])
  // the first frame is in: show it, and ask it to play once more in case the browser
  // declined autoplay while the element was still transparent (26 Oct 2026, the screens' review)
  const loaded = (e) => { setReady(true); const p = e.currentTarget.play?.(); if (p?.catch) p.catch(() => {}) }
  if (!src || failed) return children
  return (
    <>
      <video className={`kiosk-loop${ready ? ' on' : ''}${className ? ` ${className}` : ''}`} src={src} autoPlay muted loop playsInline
        onLoadedData={loaded} onError={() => setFailed(true)} />
      {!ready && children}
    </>
  )
}

// The idle view of every kiosk: the loop when its file is in, else the crest.
export function Idle({ title, line, loop = null }) {
  return (
    <div className="kiosk idle">
      <Loop which={loop}>
        <p className="kiosk-crest">{title}</p>
        <p className="kiosk-line">{line}</p>
      </Loop>
    </div>
  )
}

// A picture from play/public that may not be there: nothing shows until it is.
export function Picture({ src, className = '', alt = '' }) {
  const [broken, setBroken] = useState(false)
  useEffect(() => setBroken(false), [src])
  if (!src || broken) return null
  return <img className={className} src={src} alt={alt} aria-hidden={alt ? undefined : 'true'} onError={() => setBroken(true)} />
}

// ---- the square codes ----------------------------------------------------------

// Act 2's cat visits: the room's cat code, big, so a guest the phone has
// called scans it on the wall (cue 7). The same address as the printed code.
export function RoomCode({ cat }) {
  const qr = useQr(meetUrl(cat, PLAY_URL), 720)
  return (
    <div className={`kiosk room-code code-${cat}`}>
      {qr ? <img className="code-qr big" src={qr} alt={`the code for ${CAT_NAMES[cat] ?? cat}`} /> : <p className="kiosk-crest">Sirwin Manor</p>}
      <p className="kiosk-line code-words">{codeWords(cat)}</p>
    </div>
  )
}

// A small code with a caption: the room's code on an Act 4 rules card, the
// rejoin code under the ballot clock.
export function SmallCode({ text, words }) {
  const qr = useQr(text, 360)
  if (!qr) return null
  return (
    <figure className="small-code">
      <img src={qr} alt="" />
      <figcaption>{words}</figcaption>
    </figure>
  )
}
export function RejoinCode() {
  return <SmallCode text={PLAY_URL} words="Need to rejoin? Scan here." />
}

// The join code on the Parlour TV (screen kind `join`, cues 3 and 10): the
// square of the play address, big, with the server's words beside it, and the
// Parlour's loop (or the crest) on the other side.
export function JoinScreen({ screen, loop = 'living' }) {
  const qr = useQr(PLAY_URL, 720)
  return (
    <div className="kiosk join-screen">
      <div className="join-side">
        <Loop which={loop} className="inset">
          <p className="kiosk-crest">Sirwin Manor</p>
        </Loop>
      </div>
      <div className="join-code">
        {qr && <img className="code-qr" src={qr} alt="the code to join" />}
        <p className="join-title">{screen?.title ?? 'Scan to join'}</p>
        {(screen?.lines ?? []).map((l, i) => <p key={i} className="kiosk-line join-line">{l}</p>)}
        {screen?.rehearsal && <p className="kiosk-next">Rehearsal</p>}
      </div>
    </div>
  )
}

// ---- the Act 4 rules cards -----------------------------------------------------

// A room's rules card, between groups: the game's name and hook, its host's
// line, the cat's picture (varied by `pick`: the group due or the round, so it
// changes through the night) and the room's code to scan on arrival. `frame`
// names one picture instead (Boo's walking frames during her intro).
export function RulesCard({ id, line, pick = null, code = true, frame = null, className = '', children = null }) {
  const game = GAME_NAMES[id]
  const cat = game?.host ?? null
  const src = frame ? `${BASE}household/full/${encodeURIComponent(frame)}` : catPictureUrl(cat, pick, BASE)
  return (
    <div className={`kiosk rules-card rules-${id}${className ? ` ${className}` : ''}`}>
      <GameName id={id} />
      <div className="rules-body">
        <Picture src={src} className="rules-cat" />
        <div className="rules-words">
          <p className="kiosk-line rules-line"><Spoken text={line} /></p>
          {code && cat && <SmallCode text={meetUrl(cat, PLAY_URL)} words="Scan the code to begin." />}
        </div>
      </div>
      {children}
    </div>
  )
}

// ---- the Happy Birthday Irwin card on the Parlour TV (cue 13) -----------------

// Written by the Cake! button (functions/lib/screen.js birthday): Sir Irwin's
// full picture, varied by the moment it was pressed, and the server's words.
export function BirthdayScreen({ screen }) {
  const src = catPictureUrl('irwin', ms(screen?.at) || 'cake', BASE)
  return (
    <div className="kiosk birthday">
      <Picture src={src} className="birthday-irwin" />
      <p className="birthday-title">{screen?.title ?? 'Happy Birthday, Sir Irwin!'}</p>
      {(screen?.lines ?? []).map((l, i) => <p key={i} className="kiosk-line">{l}</p>)}
      {screen?.rehearsal && <p className="kiosk-next">Rehearsal</p>}
    </div>
  )
}

// ---- the Orangerie: the brain's browser (?kiosk=orangerie) --------------------

// Get Off My Lawn! runs on the group's phones, so this screen only ever
// explains: in Act 4 the rules card with Salem's line and the room's code,
// varied by the group due (public/salem.groupId); outside Act 4 its loop. Act 2's
// code is Kiosk.jsx's, before this component.
export function Orangerie({ night, salem = null }) {
  if (!night || night.act !== 4) return <Idle title="Sirwin Manor" line="The Orangerie" loop="orangerie" />
  // a group is at play while public/salem (functions/lib/act4.js) says intro, playing or passed;
  // idle and cleared are between groups, when the code to scan is back (26 Oct 2026)
  const busy = ['intro', 'playing', 'passed'].includes(salem?.state)
  return (
    <RulesCard id="orangerie" line={RULES_LINES.orangerie} pick={salem?.groupId ?? night.beat} code={!busy}>
      <p className="kiosk-line">{busy ? 'Eyes on your phones.' : 'The next group will be along.'}</p>
    </RulesCard>
  )
}

// ---- the Parlour TV ---------------------------------------------------------

// Sir Irwin's prompts: one at a time with his picture, a new one every three
// minutes on the server's clock, in the order the server laid out.
export function Prompts({ screen, serverNow }) {
  useTick(1000)
  const line = promptShown(screen?.prompts, serverNow())
  return (
    <div className="kiosk prompts">
      <img className="prompts-irwin" src={`${BASE}household/full/${encodeURIComponent('Irwin 5.png')}`} alt="" onError={e => { e.currentTarget.style.visibility = 'hidden' }} />
      <p className="kiosk-crest">{screen?.title || 'Sir Irwin has ideas'}</p>
      <p className="kiosk-big prompt-line" key={line}><Spoken text={line} /></p>
      {screen?.rehearsal && <p className="kiosk-next">Rehearsal</p>}
    </div>
  )
}

// The Act 4 title card: silent (the jazz is the HomePods').
export function TitleCard({ screen }) {
  return (
    <div className="kiosk title-card">
      <p className="kiosk-big">{screen?.title}</p>
      {(screen?.lines ?? []).map((l, i) => <p key={i} className="kiosk-line">{l}</p>)}
    </div>
  )
}

// A bulletin as video (Jon, 23 Oct 2026: "the video news bulletin... that is
// me"): the clips play one after another from play/public/video/<clip>.mp4,
// with the TV's own sound. A clip with no file is skipped; with none at all,
// or once they are done, the words stay on the screen, as they always have.
export function BulletinVideo({ clips = [], lines = [], title = 'W-O-O-F News', startedAt = 0, serverNow }) {
  const [i, setI] = useState(0)
  const [done, setDone] = useState(false)
  const ref = useRef(null)
  const key = `${startedAt}-${clips.join(',')}`
  useEffect(() => { setI(0); setDone(false) }, [key])
  // a screen that reloads long after the bulletin began shows the words, not the start again
  const late = startedAt && serverNow ? serverNow() - startedAt > 10 * 60_000 : false
  useEffect(() => {
    const v = ref.current
    if (!v || done || late) return
    v.play().catch(() => {}) // a screen nobody tapped may refuse sound: the words are there anyway
  }, [i, done, late])
  const next = () => { if (i + 1 < clips.length) setI(i + 1); else setDone(true) }
  const words = (
    <div className="kiosk-lines video-words">
      {lines.map((l, k) => <p key={k} className="kiosk-line"><Spoken text={l} /></p>)}
    </div>
  )
  if (!clips.length || done || late) return (
    <div className="kiosk card-screen news">
      <p className="kiosk-crest">{title}</p>
      {words}
    </div>
  )
  return (
    <div className="kiosk video-screen">
      <video ref={ref} key={clips[i]} className="bulletin-video" src={videoUrl(clips[i])} autoPlay playsInline onEnded={next} onError={next} />
      <p className="video-caption"><Spoken text={lines[Math.min(i, lines.length - 1)] ?? ''} /></p>
    </div>
  )
}

// ---- the Library: Zimothy's memory match (?kiosk=memory) -------------------

// One board: cards face down (Zimothy's file folders), two at a time; a pair
// stays up, a miss turns back over after a moment. `onClear(pairs)` once every
// pair is found.
function Board({ cards, boardKey, onClear, disabled = false }) {
  const [up, setUp] = useState([])
  const [found, setFound] = useState([])
  const sent = useRef(null)
  useEffect(() => { setUp([]); setFound([]); sent.current = null }, [boardKey])
  const done = cards.length > 0 && found.length * 2 === cards.length
  useEffect(() => {
    if (!done || sent.current === boardKey) return
    sent.current = boardKey
    onClear(found)
  }, [done, boardKey])
  useEffect(() => {
    if (up.length !== 2) return
    const [a, b] = up
    if (cards[a] === cards[b]) { setFound(f => [...f, [a, b]]); setUp([]); return }
    const id = setTimeout(() => setUp([]), 1100)
    return () => clearTimeout(id)
  }, [up, cards])
  const shown = new Set([...up, ...found.flat()])
  const flip = i => { if (!disabled && up.length < 2 && !shown.has(i)) setUp(u => [...u, i]) }
  // the fit box takes the height left under Zimothy's words, and the board is as big as fits in it
  return (
    <div className="memory-fit">
      <div className={`memory-board cards-${cards.length}`}>
        {cards.map((t, i) => (
          <button key={`${boardKey}-${i}`} className={shown.has(i) ? 'memory-card up' : 'memory-card'} onClick={() => flip(i)} aria-label={shown.has(i) ? 'a trace' : 'a card, face down'} disabled={disabled}>
            {shown.has(i) ? <img src={`${BASE}traces/${t}.png`} alt="" onError={e => { e.currentTarget.style.visibility = 'hidden' }} /> : <FolderBack />}
          </button>
        ))}
      </div>
    </div>
  )
}

// A game's name with its hook under it (§16): the title on each room's screen.
export function GameName({ id, extra = null }) {
  const g = GAME_NAMES[id]
  if (!g) return null
  return (
    <div className="game-name">
      <p className="kiosk-crest">{g.name}{extra ? ` · ${extra}` : ''}</p>
      <p className="game-hook">{g.hook}</p>
    </div>
  )
}

// The night's match: the boards the server laid out for the group in the
// Library this round; each cleared board goes to the server, which checks it
// and moves to the next; the third pays the group (a motive crossed off and
// Zimothy's bag hint, on their phones).
// `content` (26 Oct 2026): the night's published content, so a host line Jon changed in the workshop reaches the card.
export function MemoryRounds({ board, night, nightId, content = null }) {
  const [msg, setMsg] = useState(null)
  const boardId = board?.boardId ?? null
  const step = board?.step ?? 0
  // outside Act 4 the Library's loop; in Act 4, between groups, the rules card with Zimothy's line and the room's code
  if (!night || night.act !== 4) return <Idle title="Sirwin Manor" line="The Library" loop="memory" />
  if (!boardId) return (
    <RulesCard id="library" line={rulesLine('library', content)} pick={night.beat}>
      <p className="kiosk-line">The next group will be along.</p>
    </RulesCard>
  )
  const cards = board.boards?.[String(step)] ?? []
  const send = async pairs => {
    if (nightId === 'preview') return
    setMsg(null)
    try { await callMemoryStep({ nightId, boardId, step, pairs }) } catch (e) { setMsg(e?.message || 'The Library did not hear that. Try the last pair again.') }
  }
  return (
    <div className="kiosk memory">
      <GameName id="library" extra={`round ${Math.min(step + 1, 3)} of 3`} />
      <p className="kiosk-line"><Spoken text={board.cleared ? `${ZIMOTHY_LINES.cleared} Look at your phones.` : ZIMOTHY_LINES.rounds[step]} /></p>
      {!board.cleared && <Board cards={cards} boardKey={`${boardId}-${step}`} onClear={send} />}
      {msg && <p className="kiosk-next">{msg}</p>}
    </div>
  )
}

// The same game on its own (?kiosk=memory&play=1), for Jon's daughter, any
// time: all fourteen traces, three rounds, no case, no clues, nothing sent.
export function MemoryStandalone() {
  const [seed, setSeed] = useState(() => Date.now())
  const boards = useMemo(() => standaloneBoards(seed), [seed])
  const [step, setStep] = useState(0)
  const cleared = step >= MEMORY_ROUNDS.length
  return (
    <div className="kiosk memory standalone">
      <GameName id="library" extra={cleared ? null : `round ${step + 1} of 3`} />
      <p className="kiosk-line"><Spoken text={cleared ? ZIMOTHY_LINES.standalone : ZIMOTHY_LINES.rounds[step]} /></p>
      {!cleared && <Board cards={boards[step]} boardKey={`${seed}-${step}`} onClear={() => setTimeout(() => setStep(s => s + 1), 900)} />}
      {cleared && <button className="big" onClick={() => { setSeed(Date.now()); setStep(0) }}>Play again</button>}
      <p className="kiosk-next">{ALL_TRACES.length} traces · just for fun</p>
    </div>
  )
}

// A face-down card: one of Zimothy's manila file folders.
export function FolderBack() {
  return (
    <svg className="memory-back" viewBox="0 0 100 100" aria-hidden="true">
      <path className="folder-rear" d="M14 30 V22 a4 4 0 0 1 4 -4 H38 a4 4 0 0 1 3.2 1.6 L46 26 H82 a4 4 0 0 1 4 4 V76 H14 Z" />
      <path className="folder-front" d="M9 38 a3 3 0 0 1 3 -3 H88 a3 3 0 0 1 3 3.4 L87.4 78.6 a4 4 0 0 1 -4 3.4 H16.6 a4 4 0 0 1 -4 -3.4 Z" />
      <path className="folder-label" d="M34 50 H66" />
    </svg>
  )
}

// ---- the Entryway: Boo's catwalk (?kiosk=boo) ------------------------------

// The runway music: play/public/boo/catwalk.mp3 when Jon drops one in, else a
// soft beat from the screen itself. It plays while Boo struts and stops for
// each pose ("when the music stops, strike a pose").
function useRunwayMusic(on) {
  const audio = useRef(null)
  const beat = useRef(null)
  useEffect(() => {
    if (!audio.current) {
      const a = new Audio(`${BASE}boo/catwalk.mp3`)
      a.loop = true
      a.onerror = () => { audio.current = null }
      audio.current = a
    }
    if (on) {
      if (audio.current) audio.current.play().catch(() => startBeat(beat))
      else startBeat(beat)
    } else {
      audio.current?.pause()
      stopBeat(beat)
    }
    return () => {}
  }, [on])
  useEffect(() => () => { audio.current?.pause(); stopBeat(beat) }, [])
}
function startBeat(ref) {
  if (ref.current) return
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    let n = 0
    const id = setInterval(() => {
      const o = ctx.createOscillator(), g = ctx.createGain()
      o.frequency.value = n % 4 === 0 ? 110 : n % 2 === 0 ? 220 : 330
      g.gain.setValueAtTime(0.0001, ctx.currentTime)
      g.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + 0.01)
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.18)
      o.connect(g).connect(ctx.destination)
      o.start(); o.stop(ctx.currentTime + 0.2)
      n++
    }, 300)
    ref.current = { ctx, id }
  } catch { /* no sound on this screen: the wall still shows the poses */ }
}
function stopBeat(ref) {
  if (!ref.current) return
  clearInterval(ref.current.id)
  ref.current.ctx.close().catch(() => {})
  ref.current = null
}

const BOO_FRAMES = ['Boo 1.png', 'Boo 2.png', 'Boo 3.png', 'Boo 4.png']
export const BOO_INTRO = RULES_LINES.entryway // Boo's line on her wall and on her Act 4 rules card

export function BooWall({ boo, night, nightId, serverNow }) {
  const told = useRef(false)
  const over = () => {
    if (boo?.state !== 'show' || told.current || nightId === 'preview') return
    told.current = true
    callBooDone({ nightId }).catch(() => { told.current = false })
  }
  useEffect(() => { told.current = false }, [boo?.groupId, boo?.startsAt])
  return <BooRunway boo={boo} live={!!night && night.act === 4 && !!boo?.groupId} serverNow={serverNow} onOver={over} night={night} />
}

// The wall itself, from one record in the night's shape (lib/night.js
// booMoment): the night's (above) or the Game test tab's practice
// (?kiosk=boo&practice=1, screens/Practice.jsx), which pays nobody. Not
// `live`: outside Act 4 the wall's loop; in Act 4 (and in practice) the rules
// card, with `idleLine` under it and the room's code only on a real night.
// Her intro is the rules card too, with her walking frames for the picture.
// `onOver()` is called while the show is over.
export function BooRunway({ boo, live, serverNow, onOver = null, idleLine = 'The next group will be along.', night = null }) {
  useTick(250)
  const now = serverNow()
  const m = booMoment(boo, now)
  useRunwayMusic(m.part === 'strut' || m.part === 'intro')
  useEffect(() => { if (m.part === 'done') onOver?.() })
  const frame = BOO_FRAMES[Math.floor(now / 450) % BOO_FRAMES.length]
  if (!live || m.part === 'idle') {
    if (night && night.act !== 4) return <Idle title="Sirwin Manor" line="The Entryway" loop="boo" />
    return (
      <RulesCard id="entryway" line={BOO_INTRO} pick={boo?.groupId ?? night?.beat ?? 'practice'} code={!!night} className="boo-wall idle">
        <p className="kiosk-line">{idleLine}</p>
      </RulesCard>
    )
  }
  // her intro: the group has scanned in, so the card carries no code to scan (26 Oct 2026)
  if (m.part === 'intro') return <RulesCard id="entryway" line={BOO_INTRO} frame={frame} code={false} className="boo-wall intro" />
  return (
    <div className={`kiosk boo-wall ${m.part}`}>
      {m.part === 'strut' && <img className="boo-strut" src={`${BASE}household/full/${encodeURIComponent(frame)}`} alt="" />}
      {m.part === 'pose' && <>
        <p className="boo-strike">STRIKE A POSE</p>
        <p className="boo-hold">HOLD IT · {m.hold}</p>
      </>}
      {m.part === 'judge' && <>
        <img className="boo-judging" src={`${BASE}household/full/${encodeURIComponent('Boo 3.png')}`} alt="" />
        <p className="kiosk-big"><Spoken text={m.line} /></p>
      </>}
      {m.part === 'done' && <p className="kiosk-big">That's the show, darling.</p>}
    </div>
  )
}

export { ms }
