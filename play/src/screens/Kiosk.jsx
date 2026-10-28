import { useEffect, useRef, useState } from 'react'
import { useAuthUid, useDoc, useServerClock, useTick, useOnline } from '../lib/hooks'
import { callRelayAdvance, callRelayGuess } from '../firebase'
import { HEX_CENTRES, LINE_BARS, hexPoints } from '../lib/walls'
import { Prompts, TitleCard, BulletinVideo, MemoryRounds, MemoryStandalone, BooWall, GameName, Idle, Loop, RoomCode, RulesCard, JoinScreen, RejoinCode, BirthdayScreen, Orangerie, Picture } from './Rooms'
import { PoseCamera, PoseShot } from './Pose'
import { newsClips, closingClips, loopFor, roomCode, rulesLine, catPictureUrl } from '../lib/rooms'
import { portraitUrls } from '../lib/content'
import { motivePictureUrl } from '../lib/motives'
import { Cell, Figure } from '../lib/draw'
import { ms } from './Relay'
import { ACTS, studyLines, uiLines } from '../lib/content'
import { livingView, roomDark, captionsOf, doorStage, doorSlideOf, slideAt, boardRows, bellShown, soundFresh, dotState, heardText } from '../lib/screen'
import { finaleStage, shownStats, shownAchievements, revealView, revealCharacterId, creditsAwards, elapsed, hushLines, CREDITS_AFTER_MS, LAST_AFTER_MS } from '../lib/finale'
import { isRehearsalNight } from '../lib/night'
import { RehearsalBand } from './Moments'
import Spoken from './Spoken'

// The room screens: /play/?kiosk=living | bedroom | study | ipad | memory | boo | pose | orangerie.
// A kiosk is a browser on a MacBook pointed at the host, signed in anonymously like a
// phone. It shows the room what the public night state says and nothing
// more. The living room kiosk is also the relay's clock: it nudges the
// server whenever a deadline has passed. (The study kiosk lives with the
// station: ?kiosk=study.) The iPad (?kiosk=ipad) is the living room screen
// with the words only: it keeps the news and the bulletin up through dinner.
// The memory match (?kiosk=memory, the iPad in the Library in Act 4)
// shows the boards for the group in the Library this round; with &play=1 it is
// the same game on its own, for fun. Boo's wall (?kiosk=boo, Susan's MacBook
// Pro at the projector) is her catwalk (screens/Rooms.jsx). Boo's
// camera (?kiosk=pose, the iPad facing the catwalk in Act 4) follows the
// same show and photographs each group's last pose for the end credits
// (screens/Pose.jsx). The Orangerie's screen (?kiosk=orangerie, the brain's
// browser) shows Salem's code in Act 2 and the Get Off My Lawn! rules card in
// Act 4 (screens/Rooms.jsx Orangerie).
//
// Since 25 Oct 2026 (Jon's cue list, docs/cue-list.md): every idle screen
// plays its looping graphic when the file is in (Rooms.jsx Idle and Loop);
// during Act 2's cat visits each room's screen shows its cat's code (Rooms.jsx
// RoomCode, chosen here by lib/rooms.js roomCode); in Act 4 each room's
// screen shows its game's rules card between groups (Rooms.jsx RulesCard);
// the Parlour TV shows the join code through Act 1 and at the dinner wrap-up
// (screen kind `join`) and a rejoin code under the ballot clock; and at The
// End every screen goes black (lib/screen.js roomDark).
//
// What the living room shows comes from nights/{id}/public/screen (written
// by the server beat by beat: news, bulletin, Sir Irwin, the door, the
// board) and public/sounds (the bell in the corner, and this screen's own
// chime). Three things sit in the corners of every kiosk: a small "tap to
// wake" (bottom right, until the first tap or key anywhere on the page) so
// the browser lets it make a sound, a bell for three seconds whenever a
// sound is called for, and a dot that says whether the house can still be
// heard. None of them ever covers the content, and none of them shows while
// the room is dark: a kiosk that reloads during the blackout stays
// near-black. On a rehearsal night a red REHEARSAL band runs across the top
// of every room screen (never on the party night, never in the dark).

export default function Kiosk({ which }) {
  const { uid } = useAuthUid()
  const living = which === 'living' || which === 'ipad'
  const active = useDoc(uid ? 'public_state/active' : null)
  const nightId = active.data?.nightId ?? null
  const night = useDoc(nightId ? `nights/${nightId}` : null)
  const relay = useDoc(nightId ? `nights/${nightId}/public/relay` : null)
  const study = useDoc(nightId && which === 'study' ? `nights/${nightId}/public/study` : null)
  const rotation = useDoc(nightId && (which === 'study' || which === 'memory') ? `nights/${nightId}/public/rotation` : null)
  const content = useDoc(nightId && (which === 'study' || which === 'memory' || living) ? `nights/${nightId}/public/content` : null) // the memory kiosk too (26 Oct 2026): Zimothy's card follows the workshop's host line
  const trace = useDoc(nightId && which !== 'study' && which !== 'memory' ? `nights/${nightId}/public/trace` : null)
  const standalone = which === 'memory' && new URLSearchParams(window.location.search).get('play') === '1'
  const memory = useDoc(nightId && which === 'memory' && !standalone ? `nights/${nightId}/public/memory` : null)
  const boo = useDoc(nightId && (which === 'boo' || which === 'pose') ? `nights/${nightId}/public/boo` : null)
  const salem = useDoc(nightId && which === 'orangerie' ? `nights/${nightId}/public/salem` : null) // the Orangerie's rules card varies its picture by the group due
  const finale = useDoc(nightId && living ? `nights/${nightId}/public/finale` : null)
  const screen = useDoc(nightId && living ? `nights/${nightId}/public/screen` : null)
  const sounds = useDoc(nightId ? `nights/${nightId}/public/sounds` : null)
  const cues = useDoc(nightId && living ? `nights/${nightId}/public/cues` : null)
  const serverNow = useServerClock(uid, nightId, `kiosk-${which}`) // the iPad is kiosk-ipad, its own row on the Host tab
  const online = useOnline()
  useTick(250)

  const n = night.data
  const r = relay.data
  // dark: the blackout and the prompt (paused or not), The End (the night is over),
  // or a black screen the server wrote; nothing in the corners shows while the room is dark
  const dark = !!n && (roomDark(n, living ? screen.data : null) || (living && livingView({ night: n, relay: r, screen: screen.data, finale: finale.data, captionsOnly: which === 'ipad' }) === 'dark'))
  // Act 2's cat visits: this room's cat code, whatever else the room would show
  const code = roomCode(which, n)
  let body
  if (standalone) body = <MemoryStandalone />
  else if (!uid || !nightId || !n) body = <Idle title="Sirwin Manor" line="The house is quiet." loop={loopFor(which)} />
  else if (roomDark(n, living ? screen.data : null)) body = <Dark />
  else if (code) body = <RoomCode cat={code} />
  else if (which === 'bedroom') body = <Bedroom relay={r} trace={trace.data} />
  else if (which === 'study') body = <Study study={study.data} rotation={rotation.data} serverNow={serverNow} lines={studyLines(content.data)} night={n} content={content.data} />
  else if (which === 'memory') body = <MemoryRounds board={memory.data} night={n} nightId={nightId} content={content.data} rotation={rotation.data} />
  else if (which === 'boo') body = <BooWall boo={boo.data} night={n} nightId={nightId} serverNow={serverNow} />
  else if (which === 'pose') body = <PoseCamera boo={n.act === 4 ? boo.data : null} nightId={nightId} serverNow={serverNow} />
  else if (which === 'orangerie') body = <Orangerie night={n} salem={salem.data} />
  else body = <Living night={n} relay={r} trace={trace.data} finale={finale.data} screen={screen.data} cues={cues.data} content={content.data} serverNow={serverNow} nightId={nightId} captionsOnly={which === 'ipad'} />
  return (
    <>
      <RehearsalBand on={!!n && !dark && isRehearsalNight(n)} />
      {body}
      <Bell sounds={sounds.data} serverNow={serverNow} silent={which === 'orangerie'} />
      <StaleDot view={night} online={online} />
      <Wake hidden={dark} />
    </>
  )
}

// Every screen is dark through the blackout and the prompt: near-black, nothing on it.
export function Dark() {
  return <div className="kiosk dark" aria-label="Sirwin Manor" />
}

// The host's pause, on a room screen: near-black with two words.
export function OneMoment() {
  return (
    <div className="kiosk dark paused">
      <p className="kiosk-line dim">One moment</p>
    </div>
  )
}

// Idle (the crest, or the room's loop) lives in Rooms.jsx since 25 Oct 2026, with the loop slot.
export { Idle }

// The browser lets a page make a sound only after a tap. The first tap on a
// kiosk makes (or resumes) the one AudioContext every chime uses.
export function wakeAudio() {
  try {
    const ctx = chime.ctx ?? (chime.ctx = new (window.AudioContext || window.webkitAudioContext)())
    if (ctx.state === 'suspended') ctx.resume().catch(() => {})
    return ctx
  } catch { return null }
}

// A short chime from the kiosk's own speaker (no AirPlay spin-up).
function chime(kind) {
  try {
    const ctx = chime.ctx ?? (chime.ctx = new (window.AudioContext || window.webkitAudioContext)())
    const notes = kind === 'end' ? [880, 660] : kind === 'right' ? [660, 880, 1100] : kind === 'wrong' ? [330, 262] : [660]
    notes.forEach((f, i) => {
      const o = ctx.createOscillator(), g = ctx.createGain()
      o.frequency.value = f; o.type = 'sine'
      g.gain.value = 0.0001
      o.connect(g); g.connect(ctx.destination)
      const t = ctx.currentTime + i * 0.18
      g.gain.setValueAtTime(0.0001, t)
      g.gain.exponentialRampToValueAtTime(0.3, t + 0.02)
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.35)
      o.start(t); o.stop(t + 0.4)
    })
  } catch {}
}

export function Living({ night, relay, trace, finale, screen = null, cues = null, content = null, serverNow, nightId, captionsOnly = false }) {
  const lastState = useRef(null)
  const nudged = useRef(0)
  const lastReveal = useRef(null)
  const view = livingView({ night, relay, screen, finale, captionsOnly })

  // a soft note at each reveal, as the card cuts in after its lead-in; never again once the
  // closing story, the journey or the credits are up (a screen reloaded then stays quiet)
  const fresh = finale && night?.act === 7 && NAME_STAGES.includes(finaleStage(finale, serverNow())) ? revealView(finale, serverNow()).fresh : null
  useEffect(() => {
    if (!fresh) return
    if (lastReveal.current !== fresh) { chime('right'); lastReveal.current = fresh }
  }, [fresh])

  // the clock: nudge the server when a deadline passes, or when every vote is in
  useEffect(() => {
    if (!relay) return
    const deadline = relay.state === 'turn' ? ms(relay.turnEndsAt)
      : relay.state === 'walk' ? ms(relay.walkEndsAt)
      : relay.state === 'intro' ? ms(relay.introEndsAt)
      : relay.state === 'lockout' ? ms(relay.lockoutEndsAt) : 0
    const now = serverNow()
    if (deadline && now >= deadline) {
      if (now - nudged.current > 800) {
        nudged.current = now
        callRelayAdvance({ nightId }).catch(() => {})
      }
    }
  })

  // sounds on state changes
  useEffect(() => {
    if (!relay) return
    const key = `${relay.state}:${relay.turnIndex}:${relay.lastResult}:${relay.crossed?.length}`
    if (lastState.current && lastState.current !== key) {
      if (relay.state === 'walk' && relay.lastResult === 'right') chime('right')
      else if (relay.state === 'lockout') chime('wrong')
      else if (relay.state === 'walk') chime('end')
      else if (relay.state === 'turn') chime('start')
      else if (relay.state === 'done') chime('right')
    }
    lastState.current = key
  }, [relay?.state, relay?.turnIndex, relay?.lastResult, relay?.crossed?.length])

  if (view === 'dark') return <Dark />
  if (view === 'paused') return <OneMoment />
  // Act 7: the finale runs on this screen against the server's clock
  if (view === 'finale') return <Finale night={night} finale={finale} content={content} serverNow={serverNow} />
  // Act 7: while the phones decide, the clock is on the big screen, with the
  // trace when there is one (the drawing may have been cut, or never run)
  // and the board of strikes from the deduction round beneath
  if (view === 'ballot') {
    const left = Math.max(0, Math.ceil((ms(night.window.closesAt) - serverNow()) / 1000))
    return (
      <div className="kiosk ballot-screen">
        <p className="kiosk-crest">Two minutes to decide</p>
        {trace ? <TraceView trace={trace} compact /> : <p className="kiosk-big">Decide.</p>}
        <div className="ballot-clock">
          <p className="kiosk-count">{Math.floor(left / 60)}:{String(left % 60).padStart(2, '0')}</p>
          {/* the rejoin code under the clock (cue 19, 25 Oct 2026): a phone that slept finds its way back */}
          {!captionsOnly && <RejoinCode />}
        </div>
        <Board night={night} content={content} compact />
      </div>
    )
  }
  if (view === 'captions') return <Captions captions={captionsOf(screen)} rehearsal={screen?.rehearsal} />
  if (view === 'board') return <Board night={night} content={content} title={screen?.title} />
  if (view === 'door') return <DoorScreen screen={screen} cues={cues} trace={trace} relay={relay} serverNow={serverNow} />
  if (view === 'prompts') return <Prompts screen={screen} serverNow={serverNow} />
  if (view === 'title') return <TitleCard screen={screen} />
  // the join code (cues 3 and 10, 25 Oct 2026): Act 1 and the dinner wrap-up
  if (view === 'join') return <JoinScreen screen={screen} />
  // the Happy Birthday Irwin card from the Cake! button (cue 13, 25 Oct 2026): Sir Irwin's full picture, varied
  if (view === 'birthday') return <BirthdayScreen screen={screen} />
  // bulletin 1 as video on the Parlour TV (23 Oct 2026); the words show if there is no video
  if (view === 'card' && screen?.kind === 'news' && screen.video) return <BulletinVideo clips={newsClips(screen.lines ?? [])} lines={screen.lines ?? []} startedAt={ms(screen.at)} serverNow={serverNow} />
  if (view === 'card') return <ScreenCard screen={screen} />
  if (view === 'idle' || !relay || relay.state === 'idle' || !relay.state) {
    const act = ACTS[night.act]
    // the loop (cue 1 and every "back to the loop" cue): the Parlour's on the TV, the Library's on the iPad
    return <Idle title="Sirwin Manor" line={night.act ? `Act ${night.act} · ${act?.plain ?? ''}` : 'The doors are open.'} loop={captionsOnly ? 'memory' : 'living'} />
  }

  // Sir Irwin's rules slides, one at a time on the server's clock, each up
  // for its own time. A slide with a square (slide 3: the practice smiley's
  // B1) draws it the way a turn does, dark, with its label beside the words.
  if (relay.state === 'intro') {
    const { index, slide: s, count } = slideAt(relay, serverNow())
    return (
      <div className={`kiosk relay-slide${s?.cell ? ' with-cell' : ''}`}>
        <IrwinFace mood={5} />
        {s && <p className="kiosk-crest">{s.title} · {index + 1} of {count}</p>}
        {s?.hook && <p className="game-hook">{s.hook}</p>}
        {s && (s.cell
          ? <div className="slide-with-cell">
              <p className="kiosk-line slide-text"><Spoken text={s.text} /></p>
              <div className="slide-cell">
                <p className="slide-cell-label">{s.cell.label}</p>
                <Cell strokes={s.cell.strokes} className="cell-art slide" dark />
              </div>
            </div>
          : <p className="kiosk-line slide-text"><Spoken text={s.text} /></p>)}
      </div>
    )
  }

  // the drawer is called: only their character's portrait and name, no other words (handoff §7)
  if (relay.state === 'walk') {
    return (
      <div className="kiosk walk called">
        <Portrait characterId={relay.nextCharacterId} />
        <p className="kiosk-big">{relay.nextName}</p>
      </div>
    )
  }
  // the square: a black screen, one white-outlined box, white line art, its label centred above it (Jon, 26 Oct 2026). Never the whole picture.
  if (relay.state === 'turn') {
    return (
      <div className="kiosk turn black-box">
        <div className="kiosk-cell">
          <p className="kiosk-label">{relay.cell?.label}</p>
          <Cell strokes={relay.cell?.strokes} className="cell-art big" dark />
        </div>
      </div>
    )
  }
  // the fallback for the room's guess (the host taps it on their phone, 25 Oct 2026): a tap here is
  // the room's pick; a wrong one is crossed off
  if (relay.state === 'vote' || relay.state === 'lockout') {
    return <Guess relay={relay} nightId={nightId} serverNow={serverNow} />
  }
  // a finished drawing is the door (livingView), with Sir Irwin's door slide on it
  return null
}

// A character's portrait, from play/public/portraits.
function Portrait({ characterId, className = 'called-portrait' }) {
  const [i, setI] = useState(0)
  useEffect(() => setI(0), [characterId])
  const urls = characterId ? portraitUrls(characterId) : []
  if (!urls[i]) return null
  return <img className={className} src={urls[i]} alt="" onError={() => setI(i + 1)} />
}

// The guess: four named pictures (or drawn ones, on a stand-in round). Since 25 Oct 2026 (the cue
// list) the host taps the room's guess on their own phone (Host.jsx HostRelayPanel); a tap here still
// works, as the fallback, through the same callable.
function Guess({ relay, nightId, serverNow }) {
  const [busy, setBusy] = useState(false)
  const locked = relay.state === 'lockout'
  const crossed = relay.crossed ?? []
  const pick = async (i) => {
    if (busy || locked || crossed.includes(i) || nightId === 'preview') return
    setBusy(true)
    try { await callRelayGuess({ nightId, pick: i }) } catch {} finally { setBusy(false) }
  }
  return (
    <div className="kiosk vote">
      <p className="kiosk-crest">{relay.round ?? `Grid ${relay.grid}`} · {relay.gridSize} by {relay.gridSize}</p>
      <p className="kiosk-line">{locked ? 'Not that one.' : 'What is the picture? Agree, then tell the host.'}</p>
      <div className="kiosk-options">
        {(relay.options ?? []).map((o, i) => (
          <button key={i} className={`kiosk-option${crossed.includes(i) ? ' out' : ''}`} disabled={busy || locked || crossed.includes(i)} onClick={() => pick(i)}>
            <span className="letter">{'ABCD'[i]}</span>
            {o.name ? <span className="option-name">{o.name}</span> : <Figure size={o.size} cells={o.cells} crossed={crossed.includes(i)} />}
          </button>
        ))}
      </div>
      {locked && <Countdown endsAt={relay.lockoutEndsAt} serverNow={serverNow} />}
    </div>
  )
}

// ---- the screens the beats name ------------------------------------------

// News (Act 2), the bulletin (Act 3) and Sir Irwin (Act 5): a title and a
// few lines, nothing else.
export function ScreenCard({ screen }) {
  const text = screen?.lines ?? []
  return (
    <div className={`kiosk card-screen ${screen?.kind ?? ''}`}>
      <p className="kiosk-crest">{screen?.title ?? ''}</p>
      {screen?.kind === 'irwin' && <IrwinFace mood={screen.mood} />}
      {screen?.kind === 'irwin' && Array.isArray(screen.choices) && screen.choices.length > 0
        // the motives he names sit under "It was one of these…", before his sign-off
        ? <div className="kiosk-lines">
            {text.slice(0, -1).map((l, i) => <p key={i} className="kiosk-line"><Spoken text={l} /></p>)}
            <ul className="irwin-choices">{screen.choices.map(c => <li key={c.n}><MotivePicture n={c.n} className="irwin-card" /><span><span className="n">{c.n}</span> {c.rhyme}</span></li>)}</ul>
            {text.slice(-1).map((l, i) => <p key={`end-${i}`} className="kiosk-line"><Spoken text={l} /></p>)}
          </div>
        : <div className="kiosk-lines">
            {text.map((l, i) => <p key={i} className="kiosk-line"><Spoken text={l} /></p>)}
          </div>}
      {screen?.rehearsal && <p className="kiosk-next">Rehearsal</p>}
    </div>
  )
}

// A motive card's picture (play/public/motives/<n>.png, card 308). A missing
// picture shows nothing: the rhyme beside it is the card until it is drawn.
export function MotivePicture({ n, className = 'motive-card' }) {
  const [broken, setBroken] = useState(false)
  useEffect(() => setBroken(false), [n])
  const src = motivePictureUrl(n, import.meta.env.BASE_URL)
  if (!src || broken) return null
  return <img className={className} src={src} alt="" aria-hidden="true" onError={() => setBroken(true)} />
}

// Sir Irwin in one of his five moods (play/public/household/full/Irwin 1 to 5),
// by the dial's band, the same five steps as the trace reveal. With no mood
// (an older screen doc) or no picture, the plain round face.
export function IrwinFace({ mood }) {
  const [broken, setBroken] = useState(false)
  const m = Math.max(1, Math.min(5, Number(mood) || 0))
  if (!mood || broken) return <div className="irwin-face" aria-hidden="true" />
  const src = `${import.meta.env.BASE_URL}household/full/${encodeURIComponent(`Irwin ${m}.png`)}`
  return <img className="irwin-mood" src={src} alt="" aria-hidden="true" onError={() => setBroken(true)} />
}

// ---- Act 4: the memory match and Boo's wall live in Rooms.jsx ------------
export { MemoryRounds as MemoryMatch } from './Rooms'

// The iPad's view: the words of the last news, bulletin or Irwin, kept up.
export function Captions({ captions, rehearsal = false }) {
  if (!captions) return <Idle title="Sirwin Manor" line="Nothing to read yet." loop="memory" />
  return (
    <div className={`kiosk captions ${captions.kind ?? ''}`}>
      {captions.title && <p className="kiosk-crest">{captions.title}</p>}
      <div className="kiosk-lines">
        {(captions.lines ?? []).map((l, i) => <p key={i} className="kiosk-line"><Spoken text={l} /></p>)}
      </div>
      {rehearsal && <p className="kiosk-next">Rehearsal</p>}
    </div>
  )
}

// After the third drawing is named: the door is open, held for ten seconds
// on the server's clock, then the trace if the host has put it on the TV.
// While the drawing is done, Sir Irwin's door slide ("Pawsome!") sits above
// "The door is open" (relay.doorSlide), until the trace takes the screen.
export function DoorScreen({ screen, cues, trace, relay = null, serverNow }) {
  const stage = doorStage({ screen, cues, trace, now: serverNow() })
  if (stage === 'trace') return (
    <div className="kiosk door trace-on-tv">
      <p className="kiosk-crest">What was left behind</p>
      <TraceView trace={trace} compact />
    </div>
  )
  const slide = doorSlideOf({ relay, stage })
  return (
    <div className={`kiosk done${slide ? ' with-slide' : ''}`}>
      {slide && (
        <div className="door-slide">
          <IrwinFace mood={5} />
          <p className="kiosk-line slide-text"><Spoken text={slide.text} /></p>
        </div>
      )}
      <p className="kiosk-crest">All three drawings named</p>
      <p className="kiosk-big">The door is open.</p>
      <p className="kiosk-line">{screen?.lines?.[0] ?? 'The light outside the bedroom is green. Go and see.'}</p>
    </div>
  )
}

// The deduction round and the ballot: every character at the party with
// their strike beneath. A strike the server made for a silent phone looks
// the same as a chosen one. A row with no strike yet says so.
export function Board({ night, content, title = 'The deduction round', compact = false }) {
  const rows = boardRows({ night, characters: content?.characters ?? [], motives: content?.motives ?? [] })
  return (
    <div className={`kiosk board${compact ? ' compact' : ''}`}>
      {!compact && <p className="kiosk-crest">{title}</p>}
      <ul className="board-rows">
        {rows.map(r => (
          <li key={r.key} className={r.strike ? `struck ${r.strike.kind}` : 'waiting'}>
            <span className="board-name">{r.name}</span>
            <span className="board-char">{r.characterName}</span>
            <span className="board-strike">{r.strike ? r.strike.text : 'choosing'}</span>
          </li>
        ))}
      </ul>
      {!rows.length && <p className="kiosk-line">Nobody is at the party yet.</p>}
    </div>
  )
}

// ---- the three corners -----------------------------------------------------

// One tap, once per load, so the browser lets this screen make a sound: a
// small control in the bottom right corner, never over the content, and
// never shown while the room is dark. The first tap or key anywhere on the
// page counts, so nobody has to find the corner; the screen works without
// it (the chime is only a fallback for the bell).
export function Wake({ hidden = false }) {
  const [woke, setWoke] = useState(() => chime.ctx?.state === 'running')
  useEffect(() => {
    if (woke) return
    const wake = () => { wakeAudio(); setWoke(true) }
    window.addEventListener('pointerdown', wake)
    window.addEventListener('keydown', wake)
    return () => { window.removeEventListener('pointerdown', wake); window.removeEventListener('keydown', wake) }
  }, [woke])
  if (woke || hidden) return null
  return (
    <button type="button" className="kiosk-wake" onClick={() => { wakeAudio(); setWoke(true) }}>
      Tap once to wake this screen
    </button>
  )
}

// A bell for three seconds whenever the night calls for a sound, and this
// screen's own small chime, so a cue never silently vanishes. `silent`
// (26 Oct 2026): the brain's own browser (?kiosk=orangerie) shows the bell
// but never chimes, since the brain's sound output is the HomePods, where the
// real sound is already playing; a chime there would sound every cue twice.
export function Bell({ sounds, serverNow, silent = false }) {
  const lastAt = useRef(0)
  const at = ms(sounds?.current?.at)
  useEffect(() => {
    if (!at || at === lastAt.current) return
    const first = lastAt.current === 0
    lastAt.current = at
    if (!first && !silent && soundFresh(sounds, serverNow())) chime('start')
  }, [at])
  const shown = bellShown(sounds, serverNow())
  return <div className={`kiosk-bell${shown ? ' ring' : ''}`} aria-hidden={!shown} aria-label="a sound is playing">&#9835;</div>
}

// The dot: green live, amber painting from cache for twenty seconds, red
// offline, with how long since the house was last heard from.
export function StaleDot({ view, online }) {
  const d = dotState(view, online, Date.now())
  return (
    <div className={`kiosk-dot ${d.colour}`} role="status" aria-label={`${d.label}, ${heardText(d.seconds)}`}>
      <span className="dot-mark" />
      <span className="dot-text">{d.colour === 'green' ? '' : `${d.label} · ${heardText(d.seconds)}`}</span>
    </div>
  )
}

function Countdown({ endsAt, serverNow }) {
  const left = Math.max(0, Math.ceil((ms(endsAt) - serverNow()) / 1000))
  return <p className="kiosk-count" aria-live="off">{left}</p>
}

// The bedroom: the door is closed until the drawing is named. Then the
// screen shows what was left behind, as clearly as the dial allowed. While
// closed, the bedroom's loop plays behind the closed-door line (25 Oct 2026).
export function Bedroom({ relay, trace }) {
  const open = !!relay?.doorOpen || !!trace
  if (!open) return (
    <div className="kiosk bedroom closed">
      <Loop which="bedroom" className="behind" />
      <div className="over-loop">
        <p className="kiosk-crest">The bedroom</p>
        <p className="kiosk-big">The door is closed.</p>
        <p className="kiosk-line">Name the three drawings in the Parlour.</p>
      </div>
    </div>
  )
  return (
    <div className="kiosk bedroom open">
      <p className="kiosk-crest">The bedroom · what was left behind</p>
      {trace ? <TraceView trace={trace} /> : <p className="kiosk-line">The door is open. Something was left behind; it is on its way to this screen.</p>}
    </div>
  )
}

// ---- the trace, at one of five levels -------------------------------------
// 1 black and white, hazy · 2 colour, less hazy · 3 two similar options ·
// 4 just the picture · 5 the picture and its name          (Jon, 22 Oct 2026)
// The doc carries only what the level allows (any phone can read it): one
// picture, or at level 3 two pictures in no particular order, and the name
// only at level 5.
export function TraceView({ trace, compact = false }) {
  const level = Math.max(1, Math.min(5, Number(trace?.level) || 3))
  // a rehearsal night: the slot says what would show, never the picture (Jon, 23 Oct 2026)
  if (trace?.standIn) return (
    <div className={`trace level-${level}${compact ? ' compact' : ''}`}>
      <p className="kiosk-big trace-standin">{trace.standIn}</p>
      {trace.irwinLine && <p className="trace-irwin"><Spoken text={trace.irwinLine} /></p>}
    </div>
  )
  const base = import.meta.env.BASE_URL
  const src = (id) => `${base}traces/${id}.png`
  const images = level === 3 ? (trace.images ?? []) : trace.trace ? [trace.trace] : []
  const frame = (id) => (
    <div key={id} className="trace-frame">
      <img className="trace-img" src={src(id)} alt={level === 5 && trace.label ? trace.label : 'something left behind'} onError={e => { e.currentTarget.style.visibility = 'hidden' }} />
      {level <= 2 && <div className="trace-haze" aria-hidden="true" />}
    </div>
  )
  return (
    <div className={`trace level-${level}${compact ? ' compact' : ''}`}>
      {level === 3 ? <div className="trace-pair">{images.map(frame)}</div> : images.slice(0, 1).map(frame)}
      {level === 5 && trace.label && <p className="trace-label">{trace.label}</p>}
      {trace.irwinLine && <p className="trace-irwin"><Spoken text={trace.irwinLine} /></p>}
      {level < 5 && <p className="kiosk-next">{level === 3 ? 'Something was left behind. One of these two.' : 'Something was left behind.'}</p>}
      {trace.placeholder && <p className="kiosk-next">Rehearsal</p>}
    </div>
  )
}

// ---- Act 7: the finale ----------------------------------------------------
// Everything on this screen is a function of the server's clock and the
// finale doc the server wrote at the reveal beat. Nothing is a timer. The
// stats, the achievements and the graph play on the clock; each name shows
// only once the host has pressed for it (finale.names fills one at a time,
// Murderer, Motive, Victim), and its card cuts in only after the closing
// bulletin's lead-in for it has played (finale.cardAt); the closing story
// follows the Victim. A hold freezes the clock where it stood. See
// lib/finale.js.
export { finaleStage }

const NAME_STAGES = ['murderer', 'motive', 'victim']
const NAME_CREST = { murderer: 'The murderer', motive: 'The motive', victim: 'The one who died', done: 'Unmasked' }
const NAME_WHAT = { murderer: 'Murderer', motive: 'Motive', victim: 'Victim' }

export function Finale({ night, finale, content = null, serverNow }) {
  const now = serverNow()
  const stage = finaleStage(finale, now)
  const held = !!finale.holdAt
  if (stage === 'stats' || stage === 'awards') return (
    <div className={`kiosk finale ${stage}`}>
      <p className="kiosk-crest">While the Manor counts</p>
      <CalcBar finale={finale} now={now} />
      {stage === 'stats' ? <StatsReel finale={finale} now={now} /> : <AwardsReel finale={finale} now={now} />}
      {held && <p className="kiosk-next">Held</p>}
    </div>
  )
  // the dial's journey waits until after the reveal (handoff §8); before the names, W-O-O-F News is coming
  if (stage === 'graph') return (
    <div className="kiosk finale">
      <p className="kiosk-crest">W-O-O-F News</p>
      <p className="kiosk-line">Breaking news from Sirwin Manor. Stay tuned.</p>
      {held && <p className="kiosk-next">Held</p>}
    </div>
  )
  if (stage === 'journey') return (
    <div className="kiosk finale journey">
      <p className="kiosk-crest">All night, two of you were pulling</p>
      <TugOfWar graph={finale.graph} />
      <p className="kiosk-line">Every Parlour Game answer from two phones moved this. Nobody knew. Not even them.</p>
      {(finale.graph?.clues ?? []).length > 0 && (
        <ul className="journey-clues">
          {finale.graph.clues.map(c => <li key={c.label}><span>{c.label}</span><span className="clue-level">{'●'.repeat(c.level)}{'○'.repeat(5 - c.level)}</span></li>)}
        </ul>
      )}
      {hushLines(finale).map(t => <p key={t} className="kiosk-next">{t}</p>)}
    </div>
  )
  if (stage === 'credits') return <Credits finale={finale} now={now} nightId={night?.nightId} />
  if (stage === 'last') return (
    <div className="kiosk finale last">
      <img className="last-irwin" src={`${import.meta.env.BASE_URL}household/full/Irwin 5.png`} alt="" onError={e => { e.currentTarget.style.visibility = 'hidden' }} />
      <p className="kiosk-crest">{finale.credits?.last?.line ?? 'Can we play again?'}</p>
    </div>
  )
  const names = finale.names ?? {}
  // the lead-in plays first, under the cards already named; the new card cuts in when it is over
  const rv = revealView(finale, now)
  // the closing bulletin as video (23 Oct 2026): this stage's parts play during the lead-in
  const clips = NAME_STAGES.includes(stage) && finale.video?.[stage] ? closingClips(stage) : null
  if (rv.waiting && clips?.length) return <BulletinVideo clips={clips} lines={rv.captions.map(p => `${p.who}: ${p.text}`)} startedAt={ms(finale.cardAt?.[stage]) - 1} serverNow={null} />
  const who = { characters: content?.characters ?? [], roster: night?.roster ?? {} }
  return (
    <div className={`kiosk finale reveal ${stage}`}>
      <p className="kiosk-crest">{rv.waiting ? 'W-O-O-F News' : NAME_CREST[stage]}</p>
      {rv.cards.length > 0 && (
        <div className={`reveal-row count-${rv.cards.length}`}>
          {rv.cards.map(k => (
            <div key={k} className={`reveal-card ${k}${k === rv.fresh && stage !== 'done' ? ' now' : ''}`}>
              <p className="reveal-what">{NAME_WHAT[k]}</p>
              {k === 'motive'
                ? <><MotivePicture n={names.motive?.n} className="reveal-motive" /><p className="reveal-name motive">{names.motive?.n ? `${names.motive.n}.` : ''}</p><p className="reveal-sub">{names.motive?.rhyme ?? ''}</p></>
                : <>
                    <Portrait characterId={revealCharacterId(names[k], who)} className="reveal-portrait" />
                    <p className="reveal-name">{names[k]?.name ?? '…'}</p>
                    <p className="reveal-sub">{names[k]?.characterName ?? ''}{k === 'victim' ? ' · was the one who died' : ''}</p>
                  </>}
            </div>
          ))}
        </div>
      )}
      {stage !== 'done' && rv.captions.map((p, i) => <p key={i} className="news-caption"><span className="news-who">{p.who}</span> {p.text}</p>)}
      {stage === 'done' && finale.epilogue && <Epilogue text={finale.epilogue} />}
      {finale.rehearsal && <p className="kiosk-next">Rehearsal</p>}
      {held && <p className="kiosk-next">Held</p>}
    </div>
  )
}

// The calculating bar: starts fast and slows, pure CSS against the schedule.
// A screen that loads late lands at the right point (a negative delay), and
// a hold pauses it where it stands.
function CalcBar({ finale, now }) {
  const span = Math.max(1000, finale.schedule?.graph ?? 50_000)
  const t = Math.min(span, elapsed(finale, now))
  return (
    <div className="calc" role="progressbar" aria-label="the Manor is counting" aria-valuemin={0} aria-valuemax={span} aria-valuenow={t}>
      <div className="calc-bar" style={{ animationDuration: `${span}ms`, animationDelay: `-${t}ms`, animationPlayState: finale.holdAt ? 'paused' : 'running' }} />
    </div>
  )
}

// Lines fade in one by one across the stats window. Mid-credits energy.
function StatsReel({ finale, now }) {
  const stats = shownStats(finale, now)
  return (
    <ul className="stats-reel">
      {stats.map((s, i) => (
        <li key={i} className={i === stats.length - 1 ? 'fresh' : ''}>
          <span className="stat-label">{s.label}</span>
          <span className="stat-value">{s.value}</span>
        </li>
      ))}
      {!stats.length && <li className="fresh"><span className="stat-label">The Manor is counting.</span><span className="stat-value" /></li>}
    </ul>
  )
}

// The achievements the host gave during the night, one at a time.
function AwardsReel({ finale, now }) {
  const list = shownAchievements(finale, now)
  return (
    <>
      <p className="kiosk-line">Achievements</p>
      <ul className="awards-reel">
        {list.map((a, i) => (
          <li key={i} className={i === list.length - 1 ? 'fresh' : ''}>
            <span className="award-title">{a.title}</span>
            <span className="award-name">{a.name}</span>
            {a.line && <span className="award-line">{a.line}</span>}
          </li>
        ))}
      </ul>
    </>
  )
}

// The end credits: the achievements the host gave, then the end-credit
// awards (credits.awards), the joke counters, the room's split on every
// Parlour Game, the thanks, and Sydney. One slow roll on the server's clock.
function Credits({ finale, now, nightId = null }) {
  const c = finale.credits ?? {}
  const since = Math.max(0, (finale.holdAt ? ms(finale.holdAt) : now) - ms(finale.victimAt) - CREDITS_AFTER_MS)
  const span = LAST_AFTER_MS - CREDITS_AFTER_MS
  const climb = Math.min(1, since / 20_000)
  return (
    <div className="kiosk finale credits">
      <div className="credits-roll" style={{ animationDuration: `${span}ms`, animationDelay: `-${since}ms`, animationPlayState: finale.holdAt ? 'paused' : 'running' }}>
        <p className="kiosk-crest">Awards</p>
        <ul className="awards-reel">
          {creditsAwards(finale).map((a, i) => (
            <li key={i}><span className="award-title">{a.title}</span><span className="award-name">{a.name}</span>{a.line && <span className="award-line">{a.line}</span>}</li>
          ))}
        </ul>
        <p className="kiosk-crest">By the numbers</p>
        <ul className="counters">
          {(c.counters ?? []).map(k => <li key={k.key}><span className="counter-n">{Math.round(k.value * climb)}</span> <span>{k.label}</span>{k.note && <span className="counter-note">{k.note}</span>}</li>)}
        </ul>
        {(c.splits ?? []).length > 0 && <p className="kiosk-crest">How the room split</p>}
        <ul className="splits">
          {(c.splits ?? []).map((q, i) => <li key={i}><span className="split-q">{q.q}</span><span>{q.a.text} {q.a.count} · {q.b.text} {q.b.count}</span></li>)}
        </ul>
        {(c.poses ?? []).length > 0 && nightId && (
          <>
            <p className="kiosk-crest">Boo’s Catwalk</p>
            <div className="pose-credits">{c.poses.map(p => <CreditPose key={p.groupId} nightId={nightId} pose={p} />)}</div>
          </>
        )}
        <p className="kiosk-crest">Thank you</p>
        <ul className="thanks">{(c.thanks ?? []).map(t => <li key={t}>{t}</li>)}</ul>
        {c.memory && (
          <div className="in-memory">
            <img src={`${import.meta.env.BASE_URL}${c.memory.photo}`} alt="" onError={e => { e.currentTarget.style.display = 'none' }} />
            <p>{c.memory.line}</p>
          </div>
        )}
      </div>
    </div>
  )
}

// One group's photo in the credits, from its own doc (nights/{id}/public/pose-<group>).
function CreditPose({ nightId, pose }) {
  const doc = useDoc(nightId && nightId !== 'preview' ? `nights/${nightId}/public/pose-${pose.groupId}` : null)
  return <PoseShot src={doc.data?.image ?? pose.image ?? null} names={pose.names} />
}

function Epilogue({ text }) {
  return <p className="epilogue">{text}</p>
}

// The clarity dial across the night: the Ghost pulls up, the Murderer pulls
// down, and the line is where it landed after each act.
export function TugOfWar({ graph }) {
  const points = graph?.points ?? []
  const sides = graph?.sides ?? { up: 'ghost', down: 'murderer' }
  const sideName = (role) => (role === 'ghost' ? 'Ghost' : 'Murderer')
  const running = graph?.running ?? [{ act: 2, value: 0 }, { act: 4, value: 0 }, { act: 6, value: 0 }]
  const acts = [2, 4, 6]
  const W = 1000, H = 520, L = 190, R = 150, T = 50, B = 70
  // bars: each push drawn from the running value before it, a role's pushes in one act chained
  const bars = []
  let acc = 0
  for (const act of acts) {
    const here = points.filter(p => p.act === act)
    let ghostFrom = acc, murdererFrom = acc
    for (const p of here) {
      const from = p.role === 'ghost' ? ghostFrom : murdererFrom
      const to = from + p.delta
      bars.push({ act, role: p.role, from, to })
      if (p.role === 'ghost') ghostFrom = to; else murdererFrom = to
    }
    acc = running.find(r => r.act === act)?.value ?? acc
  }
  // the scale fits every bar end, not only the line: two strong pulls that cancel still fit the frame
  const maxAbs = Math.max(6, ...running.map(p => Math.abs(p.value)), ...bars.flatMap(b => [Math.abs(b.from), Math.abs(b.to)]))
  const x = (act) => L + ((acts.indexOf(act) + 0.5) / acts.length) * (W - L - R)
  const y = (v) => T + (H - T - B) / 2 - (v / maxAbs) * ((H - T - B) / 2)
  const mid = y(0)
  const pathD = running.map((p, i) => `${i ? 'L' : 'M'} ${x(p.act)} ${y(p.value)}`).join(' ')
  return (
    <svg className="tug" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="the clarity dial across the night">
      <text x={L - 12} y={T + 14} textAnchor="end" className="tug-side">{sideName(sides.up)}</text>
      <text x={L - 12} y={H - B - 4} textAnchor="end" className="tug-side">{sideName(sides.down)}</text>
      <line x1={L} x2={W - R} y1={mid} y2={mid} className="tug-mid" />
      <text x={W - R + 8} y={mid + 6} className="tug-neutral">neutral</text>
      {acts.map(a => <text key={a} x={x(a)} y={H - 24} textAnchor="middle" className="tug-act">Act {a}</text>)}
      {bars.map((b, i) => (
        <rect key={i} className={`tug-bar ${b.role}`}
          x={x(b.act) + (b.role === sides.up ? -70 : 10)} width={60}
          y={Math.min(y(b.from), y(b.to))} height={Math.max(2, Math.abs(y(b.from) - y(b.to)))} rx={4} />
      ))}
      <path d={pathD} className="tug-line" />
      {running.map(p => <circle key={p.act} cx={x(p.act)} cy={y(p.value)} r={9} className="tug-dot" />)}
    </svg>
  )
}


// ---- the study screen -----------------------------------------------------
// The M1 Air's own screen. Granolia, the three jewels, the clock, her hints.
// Everything here is counts and words from the station; the clue never comes
// through this screen. Granolia's lines: the workshop's study lines list,
// with a plain default for each moment.

const CAP_MS = 10 * 60_000 // the study's cap is the ten-minute round (handoff 23 Oct 2026)

// Granolia's lines come from the workshop's study lines list (published with
// the night's content) over the phone's defaults; see lib/content.js.

// `night` (25 Oct 2026): outside Act 4 a quiet study shows its loop; in Act 4,
// between groups, the rules card (Granolia's line, her picture varied by the
// group due, the room's code). A round under way shows the game whatever the act.
// `content` (26 Oct 2026): the published content, so the card's host line is
// the workshop's when Jon wrote one (rulesLine), as on the phones.
const STUDY_RUNNING = ['playing', 'reproducing', 'entering']
export function Study({ study, rotation, serverNow, lines = null, night = null, content = null }) {
  const L = lines ?? studyLines(null)
  const SAY = { idle: L.IDLE, playing: L.PLAYING, reproducing: L.REPRODUCING, entering: L.ENTERING, slow: L.SLOW, map: L.MAP, halfColour: L['HALF COLOUR'], halfNumber: L['HALF NUMBER'], neither: L.NEITHER, time: L.TIME, solved: L.SOLVED, capped: L.CAPPED }
  const s = study ?? { state: 'idle' }
  const group = (rotation?.groups ?? []).find(g => g.id === s.groupId)
  const names = group ? group.members.map(m => m.characterName || m.name).join(', ') : null
  // the station has gone quiet (no write for ninety seconds): said on the rules card and on the game alike
  const stale = s.updatedAt && serverNow() - ms(s.updatedAt) > 90_000
  if (night && night.act !== 4 && !STUDY_RUNNING.includes(s.state)) return <Idle title="Sirwin Manor" line="The Study" loop="study" />
  if (night?.act === 4 && (s.state === 'idle' || s.state === 'absent' || !s.state)) return (
    <RulesCard id="study" line={rulesLine('study', content)} pick={s.groupId ?? night.beat} className="papered">
      <p className="kiosk-line">{names ? `Expecting ${names}.` : 'The next group will be along.'}</p>
      <StudyWalls />
      {/* Granolia's own start line (the workshop's IDLE) stays on the card, so the group knows the first touch begins (26 Oct 2026) */}
      <p className="kiosk-line">{SAY.idle}</p>
      {stale && <p className="kiosk-next">The station has gone quiet. Find a host.</p>}
    </RulesCard>
  )
  const started = ms(s.startedAt)
  const left = started && s.state !== 'done' && s.state !== 'idle' ? Math.max(0, CAP_MS - (serverNow() - started)) : null
  const mm = left != null ? Math.floor(left / 60_000) : null
  const ss = left != null ? Math.floor((left % 60_000) / 1000) : null

  let line = SAY[s.state] ?? ''
  if (s.hint === 'slow') line = SAY.slow
  if (s.hint === 'map') line = SAY.map
  if (s.state === 'entering' && s.granolia?.hint === 'half') line = s.granolia.colourRight ? SAY.halfNumber : s.granolia.numberRight ? SAY.halfColour : SAY.neither
  if (s.state === 'entering' && s.granolia?.hint === 'words' && s.lines) line = `It is ${s.lines.colour}, and the number is ${['one', 'two', 'three', 'four', 'five', 'six'][s.lines.number - 1]}. Press those.`
  if (s.warned && s.state !== 'done' && !s.hint && s.state !== 'entering') line = SAY.time
  if (s.state === 'done') line = s.outcome === 'capped' ? SAY.capped : SAY.solved

  // the house look (Jon, 26 Oct 2026: clean, on the branding): manor blue with the red wallpaper,
  // the title and the clock along the top, Granolia's own picture beside one panel of words
  return (
    <div className={`kiosk study papered ${s.state ?? 'idle'}`}>
      <header className="study-top">
        <GameName id="study" />
        {left != null && <p className={`study-clock${s.warned ? ' warn' : ''}`}>{mm}:{String(ss).padStart(2, '0')}</p>}
      </header>
      <div className="study-stage">
        <Picture src={catPictureUrl('granolia', s.groupId ?? 'study')} className="study-cat" />
        <div className="study-panel">
          {names && <p className="study-group">{names}</p>}
          <div className="study-progress">
            <div className="jewels" aria-label="pairs found">
              {[0, 1, 2].map(i => <span key={i} className={`jewel${i < (s.pairsLocked ?? 0) ? ' lit' : ''}`} />)}
            </div>
            {s.state !== 'idle' && s.state !== 'done' && (
              <p className="study-round">Round {(s.round ?? 0) + 1} of 3 · pattern {(s.pattern ?? 0) + 1} of 3</p>
            )}
          </div>
          <p className="granolia-says"><Spoken text={line} /></p>
          {s.state === 'entering' && (
            <p className="study-entry">{s.entry?.colour ?? '…'} and {s.entry?.number ?? '…'}</p>
          )}
          {s.state === 'entering' && s.linesOk === false && s.lines && (
            <p className="study-entry">{s.lines.colour}, {s.lines.number}</p>
          )}
          {s.state === 'done' && s.revealed?.length > 0 && (
            <p className="study-rest">The rest: {s.revealed.map(p => `${p.colour} and ${p.number}`).join(' · ')}</p>
          )}
        </div>
      </div>
      {s.map && <WallMap layout={s.layout} order={s.map} />}
      {s.fallbackPattern && <WallMap layout={s.layout} order={s.fallbackPattern} fallback />}
      {stale && <p className="kiosk-next">The station has gone quiet. Find a host.</p>}
    </div>
  )
}

// The two walls as they hang (Jon's photos, 28 Oct 2026), on the rules card
// between groups: the hexagons to watch and touch, the bars that answer with
// a colour and a count.
function StudyWalls() {
  const bars = LINE_BARS.flat()
  const lw = Math.max(...bars.map(p => p[0])), lh = Math.max(...bars.map(p => p[1]))
  const hw = Math.max(...HEX_CENTRES.map(p => p[0])), hh = Math.max(...HEX_CENTRES.map(p => p[1]))
  const r = 100 / Math.sqrt(3) - 2
  return (
    <div className="study-walls" aria-hidden="true">
      <figure>
        <svg viewBox={`${-r - 6} ${-r - 6} ${hw + 2 * r + 12} ${hh + 2 * r + 12}`}>
          {HEX_CENTRES.map((c, i) => <polygon key={i} points={hexPoints(c, r)} className="wall-hex" />)}
        </svg>
        <figcaption><b>1.</b> The hexagons: watch the pattern, then touch it back.</figcaption>
      </figure>
      <figure>
        <svg viewBox={`-10 -10 ${lw + 20} ${lh + 20}`}>
          {LINE_BARS.map(([a, b], i) => <line key={i} x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} className="wall-bar" />)}
        </svg>
        <figcaption><b>2.</b> The lines: after three patterns, note the colour and count the lit bars.</figcaption>
      </figure>
    </div>
  )
}

// A drawing of the wall with the panels numbered in the order they lit. With
// the wall down (fallback) every panel also carries its own number, the key
// to press on the button box, with the order above it.
function WallMap({ layout = [], order = [], fallback = false }) {
  if (!layout.length) return null
  const xs = layout.map(p => p.x), ys = layout.map(p => p.y)
  const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys)
  const w = (maxX - minX) || 1, h = (maxY - minY) || 1
  const r = Math.max(w, h) / Math.max(4, layout.length) / 1.2
  return (
    <svg className="wall-map" viewBox={`${minX - r * 1.5} ${-(maxY + r * 1.5)} ${w + r * 3} ${h + r * 3}`}>
      {layout.map((p, i) => {
        const steps = order.map((n, k) => (n === i + 1 ? k + 1 : null)).filter(Boolean)
        const lit = steps.length > 0
        return (
          <g key={p.id}>
            <circle cx={p.x} cy={-p.y} r={r} fill={lit ? '#F1E8D6' : '#2a3a44'} stroke="#A6A253" strokeWidth={r / 12} />
            {fallback
              ? <>
                  <text x={p.x} y={-p.y + r * 0.55} textAnchor="middle" fontSize={r * 0.9} fill={lit ? '#001925' : '#8a9aa2'}>{i + 1}</text>
                  {lit && <text x={p.x} y={-p.y - r * 0.25} textAnchor="middle" fontSize={r * 0.42} fill="#001925">{steps.length === 1 ? `${steps[0]}${['st', 'nd', 'rd'][steps[0] - 1] ?? 'th'}` : steps.join(',')}</text>}
                </>
              : <text x={p.x} y={-p.y + r * 0.35} textAnchor="middle" fontSize={r} fill={lit ? '#001925' : '#8a9aa2'}>{steps.join(',') || ''}</text>}
          </g>
        )
      })}
    </svg>
  )
}
