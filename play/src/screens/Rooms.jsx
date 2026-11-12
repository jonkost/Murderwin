import { Children, useEffect, useMemo, useRef, useState } from 'react'
import { SalemCount, useSalemWins } from './SalemCount'
import { callMemoryStep, callArcadeClue, callArcadeScore } from '../firebase'
import { useTick } from '../lib/hooks'
import { useQr } from '../lib/qr'
import { PLAY_URL } from '../lib/config'
import { ms, salemColourAt, faceUrl } from '../lib/night'
import BooArcade from './Arcade'
import { STAND_IN_CLUE } from '../lib/arcade'
import { promptShown, videoUrl, MEMORY_ROUNDS, ALL_TRACES, ZIMOTHY_LINES, SALEM_SCREEN_LINES, standaloneBoards, sendUntilHeard, UNHEARD_LINE, turnNames, groupNames, mostPairs, fewestSlips, andList, winnerPlain, GAME_NAMES, loopUrl, meetUrl, codeWords, CAT_NAMES, catPicture, catPictureUrl, RULES_LINES, rulesLine } from '../lib/rooms'
import Spoken from './Spoken'

// The room screens added on 23 Oct 2026 (docs/handoff-2026-10-23.md):
//   the Parlour TV  Sir Irwin's sharing prompts (Act 2's cat visits, Act 4's
//                   rounds), the Act 4 title card, and the W-O-O-F News
//                   bulletins as video (bulletin 1, the closing bulletin)
//   ?kiosk=memory   Zimothy's memory match in three rounds, all fourteen traces
//   ?kiosk=memory&play=1   the same game on its own, no case, no clues
//   ?kiosk=boo      the Entryway: Miss Boo LaRue's Arcade on Susan's MacBook Pro and the
//                   Stream Deck + XL (BooRoom, 5 Nov 2026)
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

import { Splash, GameCard, BigWin } from '../look/parts'
import { useJustWon } from '../lib/useWin'
import { lookOn, SPLASH_OF, splashNow, trimStyle } from '../look/look'
import { SAVER_FACES, SAVER_FILES, SAVER_START_MS, saverAt, faceBox, saverPlace } from '../lib/saver'

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

// The screen saver on an idle room screen (Jon, 12 Nov 2026: "For the loops
// just make the classic dvd screen saver with the cats and dog face picture
// when it bounces off the edge of the screen"). One face crosses the screen,
// turns at every edge, and after every tenth edge becomes the next of the
// five (lib/saver.js works out whose, and where, from the clock on the wall;
// faster, and fewer changes, since his word on the first clip). All five pictures are drawn
// once, one over the other, and only the one whose turn it is shows; a frame
// moves one square and nothing else, and the pictures are laid out again only
// when the screen changes size. While the five pictures come in the screen is
// its plain ground (a moment; no splash flashes by each time a screen goes
// idle). If one of them will not load, or they are not all in after
// SAVER_WAIT_MS, the children show instead (the room's splash), so a screen is
// never left empty. The box is see-through until all five are in, never
// display none: its pictures must load.
const SAVER_WAIT_MS = 4000
export function Saver({ which, children = null }) {
  const box = useRef(null)
  const mover = useRef(null)
  const faces = useRef({})
  const [loaded, setLoaded] = useState(0)
  const [failed, setFailed] = useState(false)
  const [slow, setSlow] = useState(false)
  const ready = !failed && loaded >= SAVER_FACES.length
  useEffect(() => { const id = setTimeout(() => setSlow(true), SAVER_WAIT_MS); return () => clearTimeout(id) }, [])
  useEffect(() => {
    let frame = 0
    let last = ''
    let size = ''
    const step = () => {
      const el = box.current
      const m = mover.current
      if (el && m) {
        const w = el.clientWidth
        const h = el.clientHeight
        const s = saverAt(Date.now(), w, h, { startMs: SAVER_START_MS[which] ?? 0 })
        m.style.transform = `translate3d(${s.left.toFixed(2)}px, ${s.top.toFixed(2)}px, 0)`
        if (`${w}x${h}` !== size) {
          size = `${w}x${h}`
          m.style.width = `${s.side.toFixed(2)}px`
          m.style.height = `${s.side.toFixed(2)}px`
          for (const who of SAVER_FACES) {
            const f = faces.current[who]
            const b = faceBox(who, w, h)
            if (f) Object.assign(f.style, { left: `${b.dx.toFixed(2)}px`, top: `${b.dy.toFixed(2)}px`, width: `${b.w.toFixed(2)}px`, height: `${b.h.toFixed(2)}px` })
          }
        }
        if (s.who !== last) {
          for (const who of SAVER_FACES) faces.current[who]?.classList.toggle('on', who === s.who)
          last = s.who
        }
      }
      frame = requestAnimationFrame(step)
    }
    frame = requestAnimationFrame(step)
    return () => cancelAnimationFrame(frame)
  }, [which])
  return (
    <>
      {(failed || (slow && !ready)) && children}
      <div ref={box} className={`saver${ready ? ' on' : ''}`} aria-hidden="true">
        <div ref={mover} className="saver-mover">
          {SAVER_FACES.map(who => (
            <span key={who} ref={el => { faces.current[who] = el }} className="saver-face">
              <img src={faceUrl(who)} alt="" draggable="false" style={trimStyle(SAVER_FILES[who])} onLoad={() => setLoaded(n => n + 1)} onError={() => setFailed(true)} />
            </span>
          ))}
        </div>
      </div>
    </>
  )
}

// The idle view of every kiosk: the loop when its file is in, else the crest.
// With the look's splash switched on (look/look.js LOOK.splash; Jon's yes of
// 12 Nov 2026), the crest's place is taken by the room's live splash: the
// room's name in lights, its own cat, large, and the cat's name. No other
// words. Since the afternoon of 12 Nov 2026 a room screen with a loop of its
// own plays the screen saver in its place (Saver, above), and since that
// evening so does a Mac's second screen (Jon: "I want to have this on the
// second screenes"); lib/saver.js saverPlace says which screens do. The
// splash (or, on a second screen with no room, the crest) is what shows if a
// face picture will not load. A loop file still wins if Jon ever drops one
// in. `room` names the splash when the screen has no loop of its own (a
// second display); `calm` is that smaller, quieter one.
export function Idle({ title, line, loop = null, room = null, calm = false }) {
  const splash = lookOn('splash') ? (room ?? SPLASH_OF[loop] ?? null) : null
  const still = splash
    ? <LiveSplash room={splash} calm={calm} />
    : <><p className="kiosk-crest">{title}</p><p className="kiosk-line">{line}</p></>
  const place = saverPlace({ loop, room, calm })
  return <div className="kiosk idle"><Loop which={loop}>{place ? <Saver which={place}>{still}</Saver> : still}</Loop></div>
}

// The room's splash, alive: the cat's picture moves on by the clock on the
// wall (no night is needed, so it shows before one is started too).
function LiveSplash({ room, calm = false }) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => { const id = setInterval(() => setNow(Date.now()), 15_000); return () => clearInterval(id) }, [])
  return <Splash room={room} turn={splashNow(now).turn} calm={calm} className="full" />
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
      {words && <figcaption>{words}</figcaption>}
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
      <div className="join-side papered">
        <Loop which={loop} className="inset">
          <img className="join-seal" src={`${BASE}brand/seal.png`} alt="" />
          <p className="kiosk-crest">Sirwin Manor</p>
          <p className="join-sub">A Murderwin</p>
        </Loop>
      </div>
      <div className="join-code">
        {qr && <img className="code-qr" src={qr} alt="the code to join" />}
        <p className="join-title">{screen?.title ?? 'Scan to join'}</p>
        {(screen?.lines ?? []).map((l, i) => <p key={i} className="kiosk-line join-line">{l}</p>)}
      </div>
    </div>
  )
}

// ---- the Act 4 rules cards -----------------------------------------------------

// A room's rules card, between groups: the game's name and hook, its host's
// line, the cat's picture (varied by `pick`: the group due or the round, so it
// changes through the night) and the room's code to scan on arrival. `frame`
// names one picture instead (Boo's walking frames during her intro).
//
// In the look Jon approved (12 Nov 2026, docs/look-approved.html, screen 3) the
// card is the game's name in lights, its three steps as numbered cards, Scan
// to start by the room's code, and the room's cat. The host's long line is
// off the screen ("Anywhere there is random text that is not mission critical
// lose it"), and so are the lines that only fill the wait (CARD_FILLER): what
// a room still says under the steps is a working line (Eyes on your phones.).
export const CARD_FILLER = /^(The next group will be along\.|Expecting .+\.)$/
export function cardNotes(children) {
  return Children.toArray(children).filter(c => !(typeof c?.props?.children === 'string' && CARD_FILLER.test(c.props.children)))
}
export function RulesCard({ id, line, pick = null, code = true, frame = null, className = '', children = null, words = 'Scan the code to begin.' }) {
  const game = GAME_NAMES[id]
  const cat = game?.host ?? null
  if (lookOn('game') && game) {
    // the Study's line is its state, one short line (Touch any hexagon to start.), so it stays; the other
    // rooms' `line` is the host's long hello, which is off the screen
    const say = id === 'study' && line ? [<p key="say" className="kiosk-line">{line}</p>] : []
    const notes = [...say, ...cardNotes(children)]
    return (
      <div className={`kiosk rules-card rules-look rules-${id}${className ? ` ${className}` : ''}`}>
        <GameCard id={id} file={frame ?? catPicture(cat, pick)} codeUrl={code && cat ? meetUrl(cat, PLAY_URL) : null} className="full">
          {notes.length > 0 && <div className="lk-game-notes">{notes}</div>}
        </GameCard>
      </div>
    )
  }
  const src = frame ? `${BASE}household/full/${encodeURIComponent(frame)}` : catPictureUrl(cat, pick, BASE)
  return (
    <div className={`kiosk rules-card rules-${id}${className ? ` ${className}` : ''}`}>
      <GameName id={id} />
      <div className="rules-body">
        <Picture src={src} className="rules-cat" />
        <div className="rules-words">
          <p className="kiosk-line rules-line"><Spoken text={line} /></p>
          {code && cat && <SmallCode text={meetUrl(cat, PLAY_URL)} words={words} />}
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
    </div>
  )
}

// ---- the Orangerie: the brain's browser (?kiosk=orangerie) --------------------

// Get Off My Lawn! runs on the group's phones, so this screen only ever
// explains: in Act 4 the rules card with Salem's line and the room's code,
// varied by the group due (public/salem.groupId); outside Act 4 its loop. Act 2's
// code is Kiosk.jsx's, before this component. Once a group clears all three
// rounds, Salem names whoever slipped least (28 Oct 2026, just for fun) until
// the chime brings the next group; the names come from `rotation`.
export function Orangerie({ night, salem = null, rotation = null, serverNow = null }) {
  if (!night || night.act !== 4) return <Idle title="Sirwin Manor" line="The Orangerie" loop="orangerie" />
  const win = salem?.state === 'cleared' ? fewestSlips(groupNames(rotation, salem.groupId), salem.slipsBy, salem.feltBy) : null
  if (win) return (
    <div className="kiosk room-won orangerie-won">
      <GameName id="orangerie" />
      <RoomWinner cat="salem" line={win.names.length > 1 ? SALEM_SCREEN_LINES.tie : SALEM_SCREEN_LINES.winner} names={win.names}
        plain={winnerPlain(win, 'Fewest slips')} pick={salem.groupId} />
    </div>
  )
  // a group is at play while public/salem (functions/lib/act4.js) says intro, playing or passed;
  // idle and cleared are between groups, when the code to scan is back (26 Oct 2026)
  const busy = ['intro', 'playing', 'passed'].includes(salem?.state)
  // while a group plays, the room's board (31 Oct 2026, Jon's note 10012): the colour, the count, the slips.
  // In a pause the board stands still where it was, like the phones under their pause card; Resume starts
  // the round again from its count (functions/lib/night.js and lib/salemlimits.js resumedRound, 12 Nov 2026)
  const clock = night.phase === 'paused' && night.pausedAt ? () => ms(night.pausedAt) : serverNow
  if (busy && serverNow) return <SalemBoard doc={salem} names={groupNames(rotation, salem.groupId)} serverNow={clock} />
  return (
    <RulesCard id="orangerie" line={RULES_LINES.orangerie} pick={salem?.groupId ?? night.beat} code={!busy}>
      <p className="kiosk-line">{busy ? 'Eyes on your phones.' : 'The next group will be along.'}</p>
    </RulesCard>
  )
}

// Salem's board on the Orangerie's screen while a group plays Get Off My
// Lawn! (Jon's note 10012, 31 Oct 2026: "I would like a visual component to
// that just like I have for Boo's arcade game"). The game stays on the
// phones; this is the room's view of it, from the same public record the
// phones read (public/salem, or the practice's record in the night's shape):
// the colour the phones show, the whole screen, with the word on it (SHAKE
// on red, FREEZE on green: the screen may say it, the phones only tint), the
// count before a round, the thirty seconds clean filling along the bottom,
// the round's restarts, and the group's names with the slips each phone has
// caused so far, from the server's counts by place (slipsBy). Salem's
// picture changes with the colour and every restart. `names`: the group by
// place on the night, the practice's players in practice (no counts by
// phone there: the practice keeps none).
export const SALEM_BOARD_LINES = {
  intro: 'Tap Ready on any phone.',
  count: 'Here it comes.',
  slipGreen: 'Someone moved. From the top!', // A9, 12 Nov 2026: the one line when a round starts over
  slipRed: 'Someone froze. From the top!',
  clean: 'Thirty seconds clean passes it.',
  restarted: n => `Started again ${n === 1 ? 'once' : `${n} times`}. Keep going.`,
  passed: 'Tap Ready for the next one.',
  cleared: 'That is the lot.',
}
export const SALEM_BOARD_WORDS = { red: 'SHAKE', green: 'FREEZE' }
export function SalemBoard({ doc, names = [], serverNow, practice = false }) {
  useTick(100)
  useSalemWins(doc, { quiet: true })
  const now = serverNow()
  const state = doc?.state
  const playing = state === 'playing'
  const startsAt = ms(doc?.startsAt)
  const cleanAt = ms(doc?.cleanAt)
  const started = playing && now >= startsAt
  const colour = started ? salemColourAt(doc, now) : null
  const round = Math.min(3, Math.max(1, Number(doc?.round) || 1))
  const count = playing && !started ? Math.max(1, Math.ceil((startsAt - now) / 1000)) : null
  const clean = started && cleanAt > startsAt ? Math.min(1, (now - startsAt) / (cleanAt - startsAt)) : 0
  const slips = Number(doc?.slips) || 0
  const word = colour ? SALEM_BOARD_WORDS[colour] : count ? String(count) : state === 'passed' ? `Round ${round} passed` : state === 'cleared' ? 'All three' : 'Ready?'
  const line = colour ? (slips ? SALEM_BOARD_LINES.restarted(slips) : SALEM_BOARD_LINES.clean)
    : count ? (slips && doc?.lastSlip ? (doc.lastSlip === 'green' ? SALEM_BOARD_LINES.slipGreen : SALEM_BOARD_LINES.slipRed) : SALEM_BOARD_LINES.count)
      : state === 'passed' ? SALEM_BOARD_LINES.passed : state === 'cleared' ? SALEM_BOARD_LINES.cleared : SALEM_BOARD_LINES.intro
  const pick = `${doc?.groupId ?? 'practice'}-${doc?.attempt ?? 0}-${colour ?? state ?? ''}`
  const tone = colour ?? (count ? 'wait' : 'rest')
  return (
    <div className={`kiosk salem-board ${tone}`} role="status" aria-live="polite" aria-label={colour ? `${colour}: ${word}` : word}>
      <GameName id="orangerie" extra={`round ${round} of 3`} />
      <div className="salem-stage">
        <Picture src={catPictureUrl('salem', pick, BASE)} className="salem-board-cat" />
        <p className={`salem-board-word${count ? ' count' : ''}`} key={word}>{word}</p>
      </div>
      <p className="kiosk-line salem-board-line">{line}</p>
      {/* the round, the clean seconds big, the slips left (A9, 12 Nov 2026); quiet wins here: the brain's speakers are the house's */}
      <SalemCount doc={doc} now={now} className="board" />
      <div className="salem-clean" aria-hidden="true"><div className="salem-clean-fill" style={{ width: `${Math.round(clean * 1000) / 10}%` }} /></div>
      {names.filter(Boolean).length > 0 && (
        <ul className="salem-crew">
          {names.map((name, i) => name ? <li key={i}>{name}{!practice && <span>{slipsWord(doc?.slipsBy?.[i])}</span>}</li> : null)}
        </ul>
      )}
    </div>
  )
}
function slipsWord(n) {
  const k = Math.max(0, Math.floor(Number(n) || 0))
  return k === 0 ? 'no slips' : k === 1 ? '1 slip' : `${k} slips`
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
// &mute=1 in the address plays the videos with no sound: for trying a screen without waking the house.
const VIDEO_MUTED = typeof location !== 'undefined' && /[?&]mute=1(&|$)/.test(location.search)
export function BulletinVideo({ clips = [], lines = [], title = 'W-O-O-F News', startedAt = 0, serverNow, clipLines = null, onDone = null }) {
  const [i, setI] = useState(0)
  const [done, setDone] = useState(false)
  const ref = useRef(null)
  const played = useRef(0)
  const key = `${startedAt}-${clips.join(',')}`
  useEffect(() => { setI(0); setDone(false); played.current = 0 }, [key])
  // a screen that reloads long after the bulletin began shows the words, not the start again
  const late = startedAt && serverNow ? serverNow() - startedAt > 10 * 60_000 : false
  // A screen nobody has clicked is refused sound by its browser. Until 11 Nov 2026 the clip then sat
  // on its first frame for good: no picture, no sound, and the film never ended. Now it plays silent,
  // with its words under it, and the film carries on; a clip that will not play at all is skipped.
  // (The Host tab shows which screens have their sound on, so it is one click before the guests come.)
  useEffect(() => {
    const v = ref.current
    if (!v || done || late) return undefined
    let live = true
    const started = v.play()
    if (started?.catch) {
      started.catch(() => {
        if (!live) return
        v.muted = true
        const silent = v.play()
        if (silent?.catch) silent.catch(() => { if (live) skip.current?.() })
      })
    }
    return () => { live = false }
  }, [i, done, late])
  // `onDone(n)` (11 Nov 2026): the last clip is over; n is how many clips really played (0: no file at all)
  const next = ok => {
    if (ok) played.current += 1
    if (i + 1 < clips.length) setI(i + 1)
    else { setDone(true); onDone?.(played.current) }
  }
  const skip = useRef(null)
  skip.current = () => next(false)
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
  // `clipLines`: one caption a clip (the closing bulletin, whose clips are not one a line); else the lines in order
  const caption = clipLines ? clipLines[i] ?? '' : lines[Math.min(i, lines.length - 1)] ?? ''
  return (
    <div className="kiosk video-screen">
      <video ref={ref} key={`${i}-${clips[i]}`} className="bulletin-video" src={videoUrl(clips[i])} autoPlay playsInline muted={VIDEO_MUTED} onEnded={() => next(true)} onError={() => next(false)} />
      {caption && <p className="video-caption"><Spoken text={caption} /></p>}
    </div>
  )
}

// ---- the Library: Zimothy's memory match (?kiosk=memory) -------------------

// One board: cards face down (Zimothy's file folders), two at a time; a pair
// stays up, a miss turns back over after a moment. `onClear(pairs, by)` once
// every pair is found.
// `players` (Jon, 27 Oct 2026): the group's names, in turn. Whoever's turn it
// is turns two cards; a pair keeps the turn, a miss passes it on. `first` says
// who starts, so each round starts with someone else. The whole group is paid
// whoever finds the pairs. No names (the standalone game), no turns.
// `by` (28 Oct 2026): for each pair, the place in `players` of whoever's turn
// it was, for Zimothy's just-for-fun winner; null when the board had no turns
// from its first pair.
// Each board is a Board of its own (key={boardKey}), so it starts fresh and a
// finished one is never sent as the next. If the house did not hear it
// (`onClear` fails), a finished board goes again by itself until it is heard,
// for as long as it is on the table (card 527, 29 Oct 2026), with UNHEARD_LINE
// under it meanwhile; the line goes once it is heard, and with the board.
function Board({ cards, boardKey, onClear, disabled = false, players = [], first = 0 }) {
  const [up, setUp] = useState([])
  const [found, setFound] = useState([])
  const [by, setBy] = useState([])
  const [turn, setTurn] = useState(first)
  const [unheard, setUnheard] = useState(false)
  const done = cards.length > 0 && found.length * 2 === cards.length
  useEffect(() => {
    if (!done) return
    let live = true
    sendUntilHeard(() => onClear(found, by.length === found.length && by.every(Number.isInteger) ? by : null),
      { live: () => live, missed: () => setUnheard(true), heard: () => setUnheard(false) })
    return () => { live = false }
  }, [done, boardKey])
  useEffect(() => {
    if (up.length !== 2) return
    const [a, b] = up
    if (cards[a] === cards[b]) {
      setFound(f => [...f, [a, b]])
      setBy(w => [...w, players.length > 1 ? turn % players.length : null])
      setUp([])
      return
    }
    const id = setTimeout(() => { setUp([]); setTurn(t => t + 1) }, 1100)
    return () => clearTimeout(id)
  }, [up, cards])
  const who = players.length > 1 && !done ? players[turn % players.length] : null
  const shown = new Set([...up, ...found.flat()])
  const flip = i => { if (!disabled && up.length < 2 && !shown.has(i)) setUp(u => [...u, i]) }
  // the fit box takes the height left under Zimothy's words, and the board is as big as fits in it
  return (
    <>
    {who && <p className="memory-turn" aria-live="polite">{who}'s turn</p>}
    <div className="memory-fit">
      <div className={`memory-board cards-${cards.length}`}>
        {cards.map((t, i) => (
          <button key={`${boardKey}-${i}`} className={shown.has(i) ? 'memory-card up' : 'memory-card'} onClick={() => flip(i)} aria-label={shown.has(i) ? 'a trace' : 'a card, face down'} disabled={disabled}>
            {shown.has(i) ? <img src={`${BASE}traces/${t}.png`} alt="" onError={e => { e.currentTarget.style.visibility = 'hidden' }} /> : <FolderBack />}
          </button>
        ))}
      </div>
    </div>
    {unheard && <p className="kiosk-next">{UNHEARD_LINE}</p>}
    </>
  )
}

// A game's name with its hook under it (§16): the title on each room's screen.
export function GameName({ id, extra = null }) {
  const g = GAME_NAMES[id]
  if (!g) return null
  return (
    <div className="game-name">
      <p className="kiosk-crest">{g.name}{extra ? ` · ${extra}` : ''}</p>
    </div>
  )
}

// The night's match: the boards the server laid out for the group in the
// Library this round; each cleared board goes to the server, which checks it
// and moves to the next; the third pays the group (a motive crossed off and
// Zimothy's bag hint, on their phones).
// `content` (26 Oct 2026): the night's published content, so a host line Jon changed in the workshop reaches the card.
// `rotation`: the Act 4 groups, so the board knows who is at the table and takes turns (27 Oct 2026).
// Once the third board is clear, Zimothy names whoever found the most pairs
// (28 Oct 2026, just for fun), from the server's count (public/memory.pairsBy),
// so a screen that reloads names the same winner.
export function MemoryRounds({ board, night, nightId, content = null, rotation = null, known = true }) {
  const boardId = board?.boardId ?? null
  const step = board?.step ?? 0
  // the third board cleared is a big win (B4; the approved look, screen 4): Solved!, then Zimothy names his winner
  // (`known`: the board's record has arrived, so a screen that reloads onto a cleared board does not play it again)
  const won = useJustWon(!!board?.cleared, known)
  // outside Act 4 the Library's loop; in Act 4, between groups, the rules card with Zimothy's line and the room's code
  if (!night || night.act !== 4) return <Idle title="Sirwin Manor" line="The Library" loop="memory" />
  if (!boardId) return (
    <RulesCard id="library" line={rulesLine('library', content)} pick={night.beat}>
      <p className="kiosk-line">The next group will be along.</p>
    </RulesCard>
  )
  const cards = board.boards?.[String(step)] ?? []
  const players = turnNames(rotation, board.groupId)
  // fails when the house did not hear the board, and the Board sends it again (card 527)
  const send = (pairs, by) => {
    if (nightId === 'preview') return
    return callMemoryStep({ nightId, boardId, step, pairs, ...(by ? { by } : {}) })
  }
  const boardKey = `${boardId}-${step}`
  const win = board.cleared ? mostPairs(players, board.pairsBy) : null
  if (won) return <BigWin word="Solved!" who="zimothy" className="full" />
  return (
    <div className={`kiosk memory${win ? ' room-won' : ''}`}>
      <GameName id="library" extra={`round ${Math.min(step + 1, 3)} of 3`} />
      <p className="kiosk-line"><Spoken text={board.cleared ? `${ZIMOTHY_LINES.cleared} Look at your phones.` : ZIMOTHY_LINES.rounds[step]} /></p>
      {win && <RoomWinner cat="zimothy" line={win.names.length > 1 ? ZIMOTHY_LINES.tie : ZIMOTHY_LINES.winner} names={win.names}
        plain={winnerPlain(win, 'Most pairs')} pick={board.groupId} />}
      {!board.cleared && <Board key={boardKey} cards={cards} boardKey={boardKey} onClear={send} players={players} first={step} />}
    </div>
  )
}

// A room's just-for-fun winner at the end of a group's visit (28 Oct 2026):
// the arcade's winner moment on a room screen. The cat's line in a bubble
// beside its picture (varied by `pick`), the names big, the plain line under
// them. A long line of names (a tie, or long names) is set smaller.
export function RoomWinner({ cat, line, names = [], plain, pick = null }) {
  const who = andList(names)
  return (
    <div className={`room-winner${who.length > 28 ? ' long' : ''}`} role="status">
      <div className="room-winner-says">
        <Picture src={catPictureUrl(cat, pick, BASE)} className="room-winner-cat" />
        <p className="winner-bubble"><Spoken text={line} /></p>
      </div>
      <p className="room-winner-names">{who}</p>
      <p className="kiosk-line room-winner-plain">{plain}</p>
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
      {!cleared && <Board key={`${seed}-${step}`} cards={boards[step]} boardKey={`${seed}-${step}`} onClear={() => setTimeout(() => setStep(s => s + 1), 900)} />}
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

// ---- the Entryway: Miss Boo LaRue's Arcade (?kiosk=boo) ----------------------

// Susan's MacBook Pro in the Entryway with the Stream Deck + XL (5 Nov 2026,
// card 515).
// Outside Act 4 its loop; in Act 4 the rules card with Boo's line and the
// room's code between groups, and the arcade itself (screens/Arcade.jsx, in
// its night mode) while the group due here is at the deck: the house says
// which group and when the round ends (public/boo), the rotation gives the
// group's names and keys in order, every counted round's score goes to the
// house (arcadeScore), each player's clue is asked of the house at their
// moment (arcadeClue: the house deals it to their phone and sends the words
// back), and the chime rings at the round's end on the house's clock. When
// the round moves on while a visit is still up, the chime rings at once and
// Boo's farewell plays out before the card comes back. In the Preview the
// clue is the stand-in and nothing is sent.
export const BOO_INTRO = RULES_LINES.entryway
const visitOf = boo => (boo?.state === 'visit' && boo.groupId ? { groupId: boo.groupId, startsAt: ms(boo.startsAt) } : null)
const sameVisit = (a, b) => !!a && !!b && a.groupId === b.groupId && a.startsAt === b.startsAt

export function BooRoom({ boo, night, nightId, rotation = null, serverNow }) {
  const [held, setHeld] = useState(null) // the visit on the screen, kept through its farewell
  const [stage, setStage] = useState(null) // the arcade's stage, from the page
  const visit = visitOf(boo)
  useEffect(() => { if (visit && !sameVisit(held, visit)) { setStage(null); setHeld(visit) } }, [visit?.groupId, visit?.startsAt]) // eslint-disable-line react-hooks/exhaustive-deps
  const gone = !!held && !sameVisit(held, visit) // the round moved on: the chime, then the farewell, then the card
  useEffect(() => { if (gone && (stage === 'home' || stage == null)) setHeld(null) }, [gone, stage])
  if (!night || night.act !== 4) return <Idle title="Sirwin Manor" line="The Entryway" loop="boo" />
  if (held && (!gone || stage !== 'home')) {
    const members = (rotation?.groups ?? []).find(g => g.id === held.groupId)?.members ?? []
    const players = members.map(m => ({ name: m.name || m.characterName || '', key: m.key }))
    const preview = nightId === 'preview'
    const nightProps = {
      players: players.length ? players : [{ name: '', key: null }],
      slotEndsAt: ms(boo?.slotEndsAt) || held.startsAt + 15 * 60_000,
      serverNow,
      seed: held.startsAt,
      chime: gone,
      onClue: place => (preview ? Promise.resolve(STAND_IN_CLUE) : callArcadeClue({ nightId, groupId: held.groupId, place }).then(r => r?.data?.text ?? null)),
      onRecord: rec => {
        const key = players[rec.player]?.key
        if (key && !preview) callArcadeScore({ nightId, guestKey: key, game: rec.game, score: rec.score }).catch(() => { /* the score is just for fun; the clue path never waits on it */ })
      },
      onStage: setStage,
    }
    return <BooArcade key={`${held.groupId}-${held.startsAt}`} night={nightProps} />
  }
  return (
    <RulesCard id="entryway" line={BOO_INTRO} pick={boo?.groupId ?? night.beat} code={!visit} className="boo-wall idle">
      <p className="kiosk-line">{visit ? 'Eyes on the deck.' : 'The next group will be along.'}</p>
    </RulesCard>
  )
}

export { ms }
