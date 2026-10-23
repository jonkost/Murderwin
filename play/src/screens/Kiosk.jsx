import { useEffect, useRef, useState } from 'react'
import { useAuthUid, useDoc, useServerClock, useTick, useOnline } from '../lib/hooks'
import { callRelayAdvance, callMemoryCleared } from '../firebase'
import { Cell, Figure } from '../lib/draw'
import { ms } from './Relay'
import { ACTS, studyLines, uiLines } from '../lib/content'
import { livingView, roomDark, captionsOf, doorStage, boardRows, bellShown, soundFresh, dotState, heardText, relayRules, showRules } from '../lib/screen'
import { finaleStage, shownStats, shownAchievements, releasedNames, elapsed, hushLines } from '../lib/finale'

// The room screens: /play/?kiosk=living | bedroom | study | ipad | memory. A kiosk is
// a browser on a MacBook pointed at the host, signed in anonymously like a
// phone. It shows the room what the public night state says and nothing
// more. The living room kiosk is also the relay's clock: it nudges the
// server whenever a deadline has passed. (The study kiosk lives with the
// station: ?kiosk=study.) The iPad (?kiosk=ipad) is the living room screen
// with the words only: it keeps the news and the bulletin up through dinner.
// The memory match (?kiosk=memory, an iPad at the small puzzle station in
// Act 4) shows the board for the group at that station.
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
// near-black.

export default function Kiosk({ which }) {
  const { uid } = useAuthUid()
  const living = which === 'living' || which === 'ipad'
  const active = useDoc(uid ? 'public_state/active' : null)
  const nightId = active.data?.nightId ?? null
  const night = useDoc(nightId ? `nights/${nightId}` : null)
  const relay = useDoc(nightId ? `nights/${nightId}/public/relay` : null)
  const study = useDoc(nightId && which === 'study' ? `nights/${nightId}/public/study` : null)
  const rotation = useDoc(nightId && which === 'study' ? `nights/${nightId}/public/rotation` : null)
  const content = useDoc(nightId && (which === 'study' || living) ? `nights/${nightId}/public/content` : null)
  const trace = useDoc(nightId && which !== 'study' && which !== 'memory' ? `nights/${nightId}/public/trace` : null)
  const memory = useDoc(nightId && which === 'memory' ? `nights/${nightId}/public/memory` : null)
  const finale = useDoc(nightId && living ? `nights/${nightId}/public/finale` : null)
  const screen = useDoc(nightId && living ? `nights/${nightId}/public/screen` : null)
  const sounds = useDoc(nightId ? `nights/${nightId}/public/sounds` : null)
  const cues = useDoc(nightId && living ? `nights/${nightId}/public/cues` : null)
  const serverNow = useServerClock(uid, nightId, `kiosk-${which}`) // the iPad is kiosk-ipad, its own row on the Host tab
  const online = useOnline()
  useTick(250)

  const n = night.data
  const r = relay.data
  // dark: the blackout and the prompt (paused or not), or a black screen the
  // server wrote; nothing in the corners shows while the room is dark
  const dark = !!n && (roomDark(n) || (living && livingView({ night: n, relay: r, screen: screen.data, finale: finale.data, captionsOnly: which === 'ipad' }) === 'dark'))
  let body
  if (!uid || !nightId || !n) body = <Idle title="Sirwin Manor" line="The house is quiet." />
  else if (roomDark(n)) body = <Dark />
  else if (which === 'bedroom') body = <Bedroom relay={r} trace={trace.data} />
  else if (which === 'study') body = <Study study={study.data} rotation={rotation.data} serverNow={serverNow} lines={studyLines(content.data)} />
  else if (which === 'memory') body = <MemoryMatch board={memory.data} night={n} nightId={nightId} />
  else body = <Living night={n} relay={r} trace={trace.data} finale={finale.data} screen={screen.data} cues={cues.data} content={content.data} serverNow={serverNow} nightId={nightId} captionsOnly={which === 'ipad'} />
  return (
    <>
      {body}
      <Bell sounds={sounds.data} serverNow={serverNow} />
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

function Idle({ title, line }) {
  return (
    <div className="kiosk idle">
      <p className="kiosk-crest">{title}</p>
      <p className="kiosk-line">{line}</p>
    </div>
  )
}

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

  // a soft note at each reveal
  const stage = finale && night?.act === 7 ? finaleStage(finale, serverNow()) : null
  useEffect(() => {
    if (!stage) return
    if (['murderer', 'motive', 'victim'].includes(stage) && lastReveal.current !== stage) { chime('right'); lastReveal.current = stage }
  }, [stage])

  // the clock: nudge the server when a deadline passes, or when every vote is in
  useEffect(() => {
    if (!relay) return
    const deadline = relay.state === 'turn' ? ms(relay.turnEndsAt)
      : relay.state === 'walk' ? ms(relay.walkEndsAt)
      : relay.state === 'vote' ? ms(relay.voteEndsAt)
      : relay.state === 'lockout' ? ms(relay.lockoutEndsAt) : 0
    const allIn = relay.state === 'vote' && relay.votesIn >= relay.votesNeeded
    const now = serverNow()
    if ((deadline && now >= deadline) || allIn) {
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
  if (view === 'finale') return <Finale night={night} finale={finale} serverNow={serverNow} />
  // Act 7: while the phones decide, the clock is on the big screen, with the
  // trace when there is one (the drawing may have been cut, or never run)
  // and the board of strikes from the deduction round beneath
  if (view === 'ballot') {
    const left = Math.max(0, Math.ceil((ms(night.window.closesAt) - serverNow()) / 1000))
    return (
      <div className="kiosk ballot-screen">
        <p className="kiosk-crest">Two minutes to decide</p>
        {trace ? <TraceView trace={trace} compact /> : <p className="kiosk-big">Decide.</p>}
        <p className="kiosk-count">{Math.floor(left / 60)}:{String(left % 60).padStart(2, '0')}</p>
        <Board night={night} content={content} compact />
      </div>
    )
  }
  if (view === 'captions') return <Captions captions={captionsOf(screen)} rehearsal={screen?.rehearsal} />
  if (view === 'board') return <Board night={night} content={content} title={screen?.title} />
  if (view === 'door') return <DoorScreen screen={screen} cues={cues} trace={trace} serverNow={serverNow} />
  if (view === 'card') return <ScreenCard screen={screen} />
  if (view === 'idle' || !relay || relay.state === 'idle' || !relay.state) {
    const act = ACTS[night.act]
    return <Idle title="Sirwin Manor" line={night.act ? `Act ${night.act} · ${act?.plain ?? ''}` : 'The doors are open.'} />
  }

  const done = relay.gridDone?.length ?? 0
  const total = relay.gridTurns ?? 0
  const head = <p className="kiosk-crest">Grid {relay.grid} of 3 · {relay.gridSize} by {relay.gridSize} · {done} of {total} drawn</p>

  if (relay.state === 'walk') {
    const first = done === 0
    const rules = showRules(relay) ? relayRules(uiLines(content)['RELAY RULES']) : null
    return (
      <div className="kiosk walk">
        {head}
        {rules && <ol className="kiosk-rules" aria-label="the rules of the drawing">{rules.map((l, i) => <li key={i}>{l}</li>)}</ol>}
        <p className="kiosk-big">{relay.nextName}</p>
        <p className="kiosk-line">{first ? 'to the paper. Pull it down to the next grid.' : 'to the paper.'}</p>
        <Countdown endsAt={relay.walkEndsAt} serverNow={serverNow} />
      </div>
    )
  }
  if (relay.state === 'turn') {
    return (
      <div className="kiosk turn">
        {head}
        <div className="kiosk-cell">
          <Cell strokes={relay.cell?.strokes} className="cell-art big" />
          <p className="kiosk-label">{relay.cell?.label}</p>
        </div>
        <p className="kiosk-line"><strong>{relay.drawerName}</strong> is drawing. Tell them how.</p>
        {relay.nextName && <p className="kiosk-next">Next: {relay.nextName}</p>}
        <Countdown endsAt={relay.turnEndsAt} serverNow={serverNow} />
      </div>
    )
  }
  if (relay.state === 'vote' || relay.state === 'lockout') {
    const locked = relay.state === 'lockout'
    const crossed = relay.crossed ?? []
    return (
      <div className="kiosk vote">
        {head}
        <p className="kiosk-line">{locked ? 'Not that one.' : 'Go and look at the paper, then pick on your phone.'}</p>
        <div className="kiosk-options">
          {(relay.options ?? []).map((o, i) => (
            <div key={i} className={`kiosk-option${crossed.includes(i) ? ' out' : ''}`}>
              <span className="letter">{'ABCD'[i]}</span>
              <Figure size={o.size} cells={o.cells} crossed={crossed.includes(i)} />
            </div>
          ))}
        </div>
        {!locked && <p className="kiosk-next">{relay.votesIn} of {relay.votesNeeded} have picked.</p>}
        <Countdown endsAt={locked ? relay.lockoutEndsAt : relay.voteEndsAt} serverNow={serverNow} />
      </div>
    )
  }
  if (relay.state === 'done') return <DoorScreen screen={screen} cues={cues} trace={trace} serverNow={serverNow} />
  return null
}

// ---- the screens the beats name ------------------------------------------

// News (Act 2), the bulletin (Act 3) and Sir Irwin (Act 5): a title and a
// few lines, nothing else. The bulletin's struck motives are listed with a
// line through them.
export function ScreenCard({ screen }) {
  const lines = screen?.lines ?? []
  const struck = Array.isArray(screen?.struck) ? screen.struck : []
  const text = struck.length ? lines.slice(0, Math.max(0, lines.length - struck.length)) : lines
  return (
    <div className={`kiosk card-screen ${screen?.kind ?? ''}`}>
      <p className="kiosk-crest">{screen?.title ?? ''}</p>
      {screen?.kind === 'irwin' && <IrwinFace mood={screen.mood} />}
      {screen?.kind === 'irwin' && Array.isArray(screen.choices) && screen.choices.length > 0
        // the motives he names sit under "It was one of these…", before his sign-off
        ? <div className="kiosk-lines">
            {text.slice(0, -1).map((l, i) => <p key={i} className="kiosk-line">{l}</p>)}
            <ul className="irwin-choices">{screen.choices.map(c => <li key={c.n}><span className="n">{c.n}</span> {c.rhyme}</li>)}</ul>
            {text.slice(-1).map((l, i) => <p key={`end-${i}`} className="kiosk-line">{l}</p>)}
          </div>
        : <div className="kiosk-lines">
            {text.map((l, i) => <p key={i} className="kiosk-line">{l}</p>)}
          </div>}
      {struck.length > 0 && (
        <div className="strikes">
          <p className="kiosk-next">The constable has ruled out</p>
          <ul>{struck.map(s => <li key={s.n}><s>{s.n}. {s.rhyme}</s></li>)}</ul>
        </div>
      )}
      {screen?.rehearsal && <p className="kiosk-next">Rehearsal</p>}
    </div>
  )
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

// ---- Act 4: the memory match (?kiosk=memory) ------------------------------
// Twelve cards face down: the traces of six people at the party, in pairs,
// no names. The group turns two at a time; a pair stays up, a miss turns
// back over. When the board is clear the iPad tells the server which pairs
// it found, and the server crosses one motive off the group's list on their
// phones. A fresh board, shuffled by the server, for every group.
export function MemoryMatch({ board, night, nightId }) {
  const [up, setUp] = useState([])
  const [found, setFound] = useState([])
  const [sent, setSent] = useState(null)
  const boardId = board?.boardId ?? null
  useEffect(() => { setUp([]); setFound([]); setSent(null) }, [boardId])
  const cards = board?.cards ?? []
  const done = cards.length > 0 && found.length * 2 === cards.length
  useEffect(() => {
    if (!done || sent || !boardId || board?.cleared || nightId === 'preview') return
    setSent('sending')
    callMemoryCleared({ nightId, boardId, pairs: found }).then(() => setSent('sent')).catch(() => setSent(null))
  }, [done, sent, boardId, board?.cleared, nightId, found])
  useEffect(() => {
    if (up.length !== 2) return
    const [a, b] = up
    if (cards[a] === cards[b]) { setFound(f => [...f, [a, b]]); setUp([]); chime('right'); return }
    const id = setTimeout(() => setUp([]), 1100)
    return () => clearTimeout(id)
  }, [up, cards])
  if (!night || night.act !== 4 || !boardId) return <Idle title="The memory match" line="The next group will be along." />
  const shown = new Set([...up, ...found.flat()])
  const flip = (i) => { if (up.length < 2 && !shown.has(i)) setUp(u => [...u, i]) }
  const base = import.meta.env.BASE_URL
  return (
    <div className="kiosk memory">
      <p className="kiosk-crest">The memory match</p>
      {board.cleared || done
        ? <p className="kiosk-big">Clear. Look at your phones.</p>
        : <p className="kiosk-line">Turn two cards at a time. Find the six pairs together.</p>}
      <div className="memory-board">
        {cards.map((t, i) => (
          <button key={`${boardId}-${i}`} className={shown.has(i) ? 'memory-card up' : 'memory-card'} onClick={() => flip(i)} aria-label={shown.has(i) ? 'a trace' : 'a card, face down'} disabled={board.cleared}>
            {shown.has(i) ? <img src={`${base}traces/${t}.png`} alt="" onError={e => { e.currentTarget.style.visibility = 'hidden' }} /> : <span className="memory-back" aria-hidden="true">✦</span>}
          </button>
        ))}
      </div>
    </div>
  )
}

// The iPad's view: the words of the last news, bulletin or Irwin, kept up.
export function Captions({ captions, rehearsal = false }) {
  if (!captions) return <Idle title="Sirwin Manor" line="Nothing to read yet." />
  return (
    <div className={`kiosk captions ${captions.kind ?? ''}`}>
      {captions.title && <p className="kiosk-crest">{captions.title}</p>}
      <div className="kiosk-lines">
        {(captions.lines ?? []).map((l, i) => <p key={i} className="kiosk-line">{l}</p>)}
      </div>
      {rehearsal && <p className="kiosk-next">Rehearsal</p>}
    </div>
  )
}

// After the third drawing is named: the door is open, held for ten seconds
// on the server's clock, then the trace if the host has put it on the TV.
export function DoorScreen({ screen, cues, trace, serverNow }) {
  const stage = doorStage({ screen, cues, trace, now: serverNow() })
  if (stage === 'trace') return (
    <div className="kiosk door trace-on-tv">
      <p className="kiosk-crest">What was left behind</p>
      <TraceView trace={trace} compact />
    </div>
  )
  return (
    <div className="kiosk done">
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
// screen's own small chime, so a cue never silently vanishes.
export function Bell({ sounds, serverNow }) {
  const lastAt = useRef(0)
  const at = ms(sounds?.current?.at)
  useEffect(() => {
    if (!at || at === lastAt.current) return
    const first = lastAt.current === 0
    lastAt.current = at
    if (!first && soundFresh(sounds, serverNow())) chime('start')
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
// screen shows what was left behind, as clearly as the dial allowed.
export function Bedroom({ relay, trace }) {
  const open = !!relay?.doorOpen || !!trace
  if (!open) return (
    <div className="kiosk bedroom closed">
      <p className="kiosk-crest">The bedroom</p>
      <p className="kiosk-big">The door is closed.</p>
      <p className="kiosk-line">Name the three drawings in the living room.</p>
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
// Murderer, Motive, Victim); the closing story follows the Victim. A hold
// freezes the clock where it stood. See lib/finale.js.
export { finaleStage }

const NAME_CREST = { murderer: 'The murderer', motive: 'The motive', victim: 'The one who died', done: 'Unmasked' }
const NAME_WHAT = { murderer: 'Murderer', motive: 'Motive', victim: 'Victim' }

export function Finale({ night, finale, serverNow }) {
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
  if (stage === 'graph') return (
    <div className="kiosk finale">
      <p className="kiosk-crest">All night, two of you were pulling</p>
      <TugOfWar graph={finale.graph} />
      <p className="kiosk-line">Every Parlour Game answer from two phones moved this. Nobody knew. Not even them.</p>
      {hushLines(finale).map(t => <p key={t} className="kiosk-next">{t}</p>)}
      {held && <p className="kiosk-next">Held</p>}
    </div>
  )
  const names = finale.names ?? {}
  const shown = releasedNames(finale)
  const current = stage === 'done' ? 'victim' : stage
  return (
    <div className={`kiosk finale reveal ${stage}`}>
      <p className="kiosk-crest">{NAME_CREST[stage]}</p>
      <div className={`reveal-row count-${shown.length}`}>
        {shown.map(k => (
          <div key={k} className={`reveal-card ${k}${k === current && stage !== 'done' ? ' now' : ''}`}>
            <p className="reveal-what">{NAME_WHAT[k]}</p>
            {k === 'motive'
              ? <><p className="reveal-name motive">{names.motive?.n ? `${names.motive.n}.` : ''}</p><p className="reveal-sub">{names.motive?.rhyme ?? ''}</p></>
              : <><p className="reveal-name">{names[k]?.name ?? '…'}</p><p className="reveal-sub">{names[k]?.characterName ?? ''}{k === 'victim' ? ' · was the one who died' : ''}</p></>}
          </div>
        ))}
      </div>
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

const CAP_MS = 15 * 60_000

// Granolia's lines come from the workshop's study lines list (published with
// the night's content) over the phone's defaults; see lib/content.js.

export function Study({ study, rotation, serverNow, lines = null }) {
  const L = lines ?? studyLines(null)
  const SAY = { idle: L.IDLE, playing: L.PLAYING, reproducing: L.REPRODUCING, entering: L.ENTERING, slow: L.SLOW, map: L.MAP, halfColour: L['HALF COLOUR'], halfNumber: L['HALF NUMBER'], neither: L.NEITHER, time: L.TIME, solved: L.SOLVED, capped: L.CAPPED }
  const s = study ?? { state: 'idle' }
  const group = (rotation?.groups ?? []).find(g => g.id === s.groupId)
  const names = group ? group.members.map(m => m.characterName || m.name).join(', ') : null
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
  const stale = s.updatedAt && serverNow() - ms(s.updatedAt) > 90_000

  return (
    <div className={`kiosk study ${s.state ?? 'idle'}`}>
      <p className="kiosk-crest">The study{names ? ` · ${names}` : ''}</p>
      <div className="jewels" aria-label="pairs found">
        {[0, 1, 2].map(i => <span key={i} className={`jewel${i < (s.pairsLocked ?? 0) ? ' lit' : ''}`} />)}
      </div>
      {s.state !== 'idle' && s.state !== 'done' && (
        <p className="kiosk-next">Round {(s.round ?? 0) + 1} of 3 · pattern {(s.pattern ?? 0) + 1} of 3</p>
      )}
      <div className="granolia">
        <div className="granolia-face" aria-hidden="true" />
        <p className="kiosk-line granolia-says">{line}</p>
      </div>
      {s.state === 'entering' && (
        <p className="kiosk-big entry">{s.entry?.colour ?? '…'} and {s.entry?.number ?? '…'}</p>
      )}
      {s.state === 'entering' && s.linesOk === false && s.lines && (
        <p className="kiosk-big">{s.lines.colour}, {s.lines.number}</p>
      )}
      {s.map && <WallMap layout={s.layout} order={s.map} />}
      {s.fallbackPattern && <WallMap layout={s.layout} order={s.fallbackPattern} fallback />}
      {s.state === 'done' && s.revealed?.length > 0 && (
        <p className="kiosk-line">The rest: {s.revealed.map(p => `${p.colour} and ${p.number}`).join(' · ')}</p>
      )}
      {left != null && <p className={`kiosk-count${s.warned ? ' warn' : ''}`}>{mm}:{String(ss).padStart(2, '0')}</p>}
      {stale && <p className="kiosk-next">The station has gone quiet. Find a host.</p>}
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
