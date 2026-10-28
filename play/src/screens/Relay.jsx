import { useEffect, useRef } from 'react'
import { callRelayAdvance } from '../firebase'
import { useTick, writeNotes } from '../lib/hooks'
import { Cell, Figure } from '../lib/draw'
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
const FALLBACK = { turnMs: 15_000, walkMs: 20_000, pullMs: 20_000, voteMs: 45_000, lockoutMs: 10_000 }
export function timingOf(relay) {
  const t = relay?.timing ?? {}
  const pick = (k) => (typeof t[k] === 'number' && t[k] > 0 ? t[k] : FALLBACK[k])
  return { TURN_MS: pick('turnMs'), WALK_MS: pick('walkMs'), PULL_MS: pick('pullMs'), VOTE_MS: pick('voteMs'), LOCKOUT_MS: pick('lockoutMs') }
}

export default function Relay({ uid, night, session, relay, serverNow, rules = null }) {
  useTick(250)
  const me = session.guestKey
  const host = !!session.host // the two host phones carry the drawing's controls (HostRelayPanel)
  const { TURN_MS, WALK_MS, PULL_MS, VOTE_MS, LOCKOUT_MS } = timingOf(relay)
  const nudged = useRef(0)

  // A phone may nudge the clock too, so a kiosk that fell over never stalls the room.
  useEffect(() => {
    const deadline = relay.state === 'turn' ? ms(relay.turnEndsAt)
      : relay.state === 'walk' ? ms(relay.walkEndsAt)
      : relay.state === 'intro' ? ms(relay.introEndsAt)
      : relay.state === 'lockout' ? ms(relay.lockoutEndsAt) : 0
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
          <>
            <p className="moment-text">Draw!</p>
            <p className="moment-sub">Marker down at the buzz.</p>
          </>
        ) : (
          <>
            <Cell strokes={relay.cell?.strokes} />
            <p className="moment-text">Tell {relay.drawerName} how.</p>
            {relay.nextName && <p className="gloss">Next: {relay.nextName}</p>}
          </>
        )}
        <Bar endsAt={relay.turnEndsAt} total={TURN_MS} serverNow={serverNow} />
      </div>
    )
  }

  if (relay.state === 'vote' || relay.state === 'lockout') {
    const locked = relay.state === 'lockout'
    const crossed = relay.crossed ?? []
    return (
      <div className="moment relay vote papered">
        <p className="crest">{relay.round ?? `Grid ${relay.grid}`} is drawn</p>
        <p className="moment-text">{locked ? 'Not that one.' : host ? 'Look at the paper. Tap the room’s guess.' : 'Look at the paper. Tell the host your guess.'}</p>
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
        {locked && <Bar endsAt={relay.lockoutEndsAt} total={LOCKOUT_MS} serverNow={serverNow} />}
      </div>
    )
  }

  return null
}

// The door is open: one line, a hide button, then the phone goes back to rest.
export function RelayDone({ uid, relay, seenKey }) {
  const hide = () => writeNotes(uid, { seen: { [seenKey]: true } }).catch(() => {})
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
