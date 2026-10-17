import { useEffect, useRef, useState } from 'react'
import { callRelayVote, callRelayAdvance } from '../firebase'
import { useTick, writeNotes } from '../lib/hooks'
import { Cell, Figure } from '../lib/draw'
import { Seal } from './Moments'

// The relay drawing on a phone (Act 6). Every phone follows the same public
// doc. The drawer's phone says "draw"; everyone else's shows the cell the TV
// is showing, so nobody has to squint. At vote time every phone lights up
// with four pictures. All timing is read from server deadlines.

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
// these stand in only for a doc written before the server sent them.
const FALLBACK = { turnMs: 10_000, walkMs: 12_000, pullMs: 20_000, voteMs: 45_000, lockoutMs: 10_000 }
export function timingOf(relay) {
  const t = relay?.timing ?? {}
  const pick = (k) => (typeof t[k] === 'number' && t[k] > 0 ? t[k] : FALLBACK[k])
  return { TURN_MS: pick('turnMs'), WALK_MS: pick('walkMs'), PULL_MS: pick('pullMs'), VOTE_MS: pick('voteMs'), LOCKOUT_MS: pick('lockoutMs') }
}

export default function Relay({ uid, night, session, relay, serverNow }) {
  useTick(250)
  const me = session.guestKey
  const { TURN_MS, WALK_MS, PULL_MS, VOTE_MS, LOCKOUT_MS } = timingOf(relay)
  const [pick, setPick] = useState(null)
  const [busy, setBusy] = useState(false)
  const nudged = useRef(0)

  // A phone may nudge the clock too, so a kiosk that fell over never stalls the room.
  useEffect(() => {
    const deadline = relay.state === 'turn' ? ms(relay.turnEndsAt)
      : relay.state === 'walk' ? ms(relay.walkEndsAt)
      : relay.state === 'vote' ? ms(relay.voteEndsAt)
      : relay.state === 'lockout' ? ms(relay.lockoutEndsAt) : 0
    const now = serverNow()
    if (night.nightId === 'preview') return
    if (deadline && now > deadline + 2500 && now - nudged.current > 6000) {
      nudged.current = now
      callRelayAdvance({ nightId: night.nightId }).catch(() => {})
    }
  })

  // buzz when it is my turn, and when the vote opens
  useEffect(() => {
    if ((relay.state === 'turn' && relay.drawerKey === me) || relay.state === 'vote') {
      try { navigator.vibrate?.([200, 100, 200]) } catch {}
    }
    if (relay.state !== 'vote') setPick(null)
  }, [relay.state, relay.drawerKey, relay.voteEndsAt, me])

  const cast = async (idx) => {
    setBusy(true)
    setPick(idx)
    try { await callRelayVote({ nightId: night.nightId, pick: idx }) } catch { setPick(null) } finally { setBusy(false) }
  }

  if (relay.state === 'walk') {
    const mine = relay.nextKey === me
    const first = (relay.gridDone?.length ?? 0) === 0
    return (
      <div className="moment relay papered">
        <Seal />
        <p className="crest">Grid {relay.grid} · {relay.gridSize} by {relay.gridSize}</p>
        {mine ? (
          <>
            <p className="moment-text">You’re up next. Walk to the paper.</p>
            {first && <p className="moment-sub">Pull the paper down until the whole grid is showing.</p>}
          </>
        ) : (
          <p className="moment-text">{relay.nextName} is walking to the paper.</p>
        )}
        <Bar endsAt={relay.walkEndsAt} total={first ? PULL_MS : WALK_MS} serverNow={serverNow} />
      </div>
    )
  }

  if (relay.state === 'turn') {
    const mine = relay.drawerKey === me
    return (
      <div className="moment relay papered">
        <p className="crest">{relay.cell?.label} · grid {relay.grid}</p>
        {mine ? (
          <>
            <p className="moment-text">Draw. The room will tell you how.</p>
            <p className="moment-sub">Ten seconds. Marker down when your phone buzzes.</p>
          </>
        ) : (
          <>
            <Cell strokes={relay.cell?.strokes} />
            <p className="moment-sub">{relay.drawerName} is drawing this. Tell them how.</p>
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
        <p className="crest">Grid {relay.grid} is drawn</p>
        <p className="moment-text">{locked ? 'Not that one.' : 'Go and look at the paper. Which is it?'}</p>
        <div className="options">
          {(relay.options ?? []).map((o, i) => {
            const out = crossed.includes(i)
            return (
              <button key={i} className={`option${pick === i ? ' on' : ''}${out ? ' out' : ''}`}
                disabled={busy || locked || out} onClick={() => cast(i)} aria-pressed={pick === i}>
                <span className="letter">{'ABCD'[i]}</span>
                <Figure size={o.size} cells={o.cells} crossed={out} />
              </button>
            )
          })}
        </div>
        {!locked && <p className="gloss">{relay.votesIn} of {relay.votesNeeded} have picked. Most votes wins.</p>}
        <Bar endsAt={locked ? relay.lockoutEndsAt : relay.voteEndsAt} total={locked ? LOCKOUT_MS : VOTE_MS} serverNow={serverNow} />
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
      <p className="moment-sub">The light outside the bedroom has turned green. Go and see.</p>
      <button className="big" onClick={hide}>Hide this</button>
    </div>
  )
}
