import { useEffect, useRef } from 'react'
import { callRelayAdvance } from '../firebase'
import { useTick, writeNotes } from '../lib/hooks'
import { Cell, Figure } from '../lib/draw'
import { isGuessing, guessLine, wrongPick, pictureNamed } from '../lib/relayhost'
import { play as playSound } from '../lib/soundkit'
import { celebrate } from '../lib/celebrate'
import { Seal } from './Moments'
import { HostRelayPanel } from './Host'

// The relay drawing on a phone (Act 6). Every phone follows the same public
// doc. The drawer's phone says "draw"; everyone else's shows the cell the TV
// is showing, so nobody has to squint. The room agrees its guess and tells
// the host, who taps it on their own phone (25 Oct 2026, Jon's cue list; the
// Parlour TV's options stay as the fallback): a guest's phone only shows what
// is still standing, and a host's phone (session.host) carries At the paper
// while someone walks and the four options to tap while the room guesses
// (HostRelayPanel). All timing is read from server deadlines.
//
// 11 Nov 2026 (Jon's practice, handoff A7): no wait after a wrong pick (it
// is crossed off, the phone buzzes, and the room guesses again at once); the
// words at a turn are "{Name} is drawing." and "Describe this square!", and
// on the drawer's own phone "Draw what they say!".

// Was this phone watching the room guess the last picture? Then the door card that follows plays the win.
let watchedLastGuess = false

// A server timestamp, a Date, or a plain millisecond number (the study station sends numbers).
export function ms(t) {
  if (typeof t === 'number') return t
  return t?.toMillis?.() ?? (t instanceof Date ? t.getTime() : 0)
}

function Bar({ endsAt, total, serverNow }) {
  const left = Math.max(0, ms(endsAt) - serverNow())
  const pct = Math.max(0, Math.min(100, (left / total) * 100))
  return <div className="bar" aria-hidden="true"><div className="bar-fill" style={{ width: `${pct}%` }} /></div>
}

// The bar totals come from the server (public/relay.timing, written at start);
// these stand in only for a doc written before the server sent them (the
// cue list's numbers, 25 Oct 2026: fifteen seconds a turn, the walk at most twenty).
const FALLBACK = { turnMs: 15_000, walkMs: 20_000, pullMs: 20_000, voteMs: 45_000 }
export function timingOf(relay) {
  const t = relay?.timing ?? {}
  const pick = (k) => (typeof t[k] === 'number' && t[k] > 0 ? t[k] : FALLBACK[k])
  return { TURN_MS: pick('turnMs'), WALK_MS: pick('walkMs'), PULL_MS: pick('pullMs'), VOTE_MS: pick('voteMs') }
}

export default function Relay({ uid, night, session, relay, serverNow, rules = null }) {
  useTick(250)
  const me = session.guestKey
  const host = !!session.host // the two host phones carry the drawing's controls (HostRelayPanel)
  const { TURN_MS, WALK_MS, PULL_MS } = timingOf(relay)
  const nudged = useRef(0)

  // A phone may nudge the clock too, so a kiosk that fell over never stalls the room.
  useEffect(() => {
    const deadline = relay.state === 'turn' ? ms(relay.turnEndsAt)
      : relay.state === 'walk' ? ms(relay.walkEndsAt)
      : relay.state === 'intro' ? ms(relay.introEndsAt)
      : relay.state === 'lockout' ? ms(relay.lockoutEndsAt) : 0 // an older server's wait: it ends on that server's clock
    const now = serverNow()
    if (night.nightId === 'preview') return
    if (deadline && now > deadline + 2500 && now - nudged.current > 6000) {
      nudged.current = now
      callRelayAdvance({ nightId: night.nightId }).catch(() => {})
    }
  })

  // buzz when I am called to the paper, and when it is my turn
  useEffect(() => {
    if ((relay.state === 'walk' && relay.nextKey === me) || (relay.state === 'turn' && relay.drawerKey === me)) {
      try { navigator.vibrate?.([200, 100, 200]) } catch {}
    }
  }, [relay.state, relay.drawerKey, relay.nextKey, relay.turnIndex, me])

  // a short buzz on every phone when a pick is crossed off (the TV buzzes aloud). Only when the
  // list grows while this phone is watching: a phone that opens on a crossed list stays quiet.
  const crossedCount = isGuessing(relay) ? (relay.crossed?.length ?? 0) : 0
  const lastCrossed = useRef(crossedCount)
  useEffect(() => {
    if (wrongPick(lastCrossed.current, relay)) {
      playSound('buzz')
      try { navigator.vibrate?.(250) } catch {}
    }
    lastCrossed.current = crossedCount
  }, [crossedCount, relay.lastResult])

  // a picture named: a medium win on every phone (the TV has the big one). The last picture opens the
  // door, and this screen gives way to the door card, which plays it (RelayDone, below).
  const seenGrid = useRef(isGuessing(relay) ? relay.grid : 0)
  useEffect(() => {
    if (pictureNamed(seenGrid.current, relay)) celebrate('medium')
    seenGrid.current = isGuessing(relay) ? relay.grid : relay.state === 'walk' ? 0 : seenGrid.current
    watchedLastGuess = isGuessing(relay) && relay.grid >= (relay.gridCount ?? 3)
  }, [relay.state, relay.grid, relay.lastResult])

  // Sir Irwin's slides on the TV (cue 16, 25 Oct 2026): every phone says to be in the Parlour
  if (relay.state === 'intro') {
    return (
      <div className="moment relay papered">
        <Seal />
        <p className="crest">The Relay Drawing</p>
        <p className="moment-text">To the Parlour. Eyes on the TV.</p>
      </div>
    )
  }

  if (relay.state === 'walk') {
    const mine = relay.nextKey === me
    const first = (relay.gridDone?.length ?? 0) === 0
    return (
      <div className="moment relay papered">
        <Seal />
        <p className="crest">{relay.round ?? `Grid ${relay.grid}`} · {relay.gridSize} by {relay.gridSize}</p>
        {first && (relay.grid ?? 1) === 1 && rules && <ol className="relay-rules">{rules.map((l, i) => <li key={i}>{l}</li>)}</ol>}
        {mine ? (
          <>
            <p className="moment-text">You’re up next. Walk to the paper.</p>
            {first && <p className="moment-sub">Pull the paper down so the whole grid shows.</p>}
          </>
        ) : (
          <p className="moment-text">{relay.nextName} is walking to the paper.</p>
        )}
        <Bar endsAt={relay.walkEndsAt} total={first ? PULL_MS : WALK_MS} serverNow={serverNow} />
        {host && <HostRelayPanel relay={relay} nightId={night.nightId} inline />}
      </div>
    )
  }

  if (relay.state === 'turn') {
    const mine = relay.drawerKey === me
    return (
      <div className="moment relay papered">
        <p className="crest">{relay.cell?.label} · {relay.round ?? `grid ${relay.grid}`}</p>
        {mine ? (
          <p className="moment-text">Draw what they say!</p>
        ) : (
          <>
            <Cell strokes={relay.cell?.strokes} />
            {/* the name is the person at the paper now: the server writes the drawer only when their walk ends */}
            <p className="moment-text">{relay.drawerName ?? 'Someone'} is drawing.<br />Describe this square!</p>
          </>
        )}
        <Bar endsAt={relay.turnEndsAt} total={TURN_MS} serverNow={serverNow} />
      </div>
    )
  }

  // the guess: no clock, and no wait after a wrong pick (11 Nov 2026). The pick is crossed off and
  // the room guesses again at once.
  if (isGuessing(relay)) {
    const crossed = relay.crossed ?? []
    return (
      <div className="moment relay vote papered">
        <p className="crest">{relay.round ?? `Grid ${relay.grid}`} is drawn</p>
        <p className="moment-text">{guessLine(relay, host ? 'host' : 'guest')}</p>
        {host ? <HostRelayPanel relay={relay} nightId={night.nightId} inline /> : (
          <div className="options">
            {(relay.options ?? []).map((o, i) => {
              const out = crossed.includes(i)
              return (
                <div key={i} className={`option${out ? ' out' : ''}`}>
                  <span className="letter">{'ABCD'[i]}</span>
                  {o.name ? <span className={out ? 'option-name crossed' : 'option-name'}>{o.name}</span> : <Figure size={o.size} cells={o.cells} crossed={out} />}
                </div>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  return null
}

// The door is open: one line, a hide button, then the phone goes back to rest.
export function RelayDone({ uid, relay, seenKey }) {
  const hide = () => writeNotes(uid, { seen: { [seenKey]: true } }).catch(() => {})
  // the third picture named, seen live on this phone: a medium win (a phone that opens on the door stays quiet)
  useEffect(() => { if (watchedLastGuess) { watchedLastGuess = false; celebrate('medium') } }, [])
  return (
    <div className="moment relay papered">
      <Seal />
      <p className="crest">Sirwin Manor</p>
      <p className="moment-text">The door is open.</p>
      <p className="moment-sub">Go and see.</p>
      <button className="big" onClick={hide}>Hide this</button>
    </div>
  )
}
