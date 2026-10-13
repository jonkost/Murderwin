import { useEffect, useRef } from 'react'
import { useAuthUid, useDoc, useServerClock, useTick } from '../lib/hooks'
import { callRelayAdvance } from '../firebase'
import { Cell, Figure } from '../lib/draw'
import { ms } from './Relay'
import { ACTS } from '../lib/content'

// The room screens: /play/?kiosk=living | bedroom. A kiosk is a browser on a
// MacBook pointed at the host, signed in anonymously like a phone. It shows
// the room what the public night state says and nothing more. The living
// room kiosk is also the relay's clock: it nudges the server whenever a
// deadline has passed. (The study kiosk lives with the station: ?kiosk=study.)

export default function Kiosk({ which }) {
  const { uid } = useAuthUid()
  const active = useDoc(uid ? 'public_state/active' : null)
  const nightId = active.data?.nightId ?? null
  const night = useDoc(nightId ? `nights/${nightId}` : null)
  const relay = useDoc(nightId ? `nights/${nightId}/public/relay` : null)
  const study = useDoc(nightId && which === 'study' ? `nights/${nightId}/public/study` : null)
  const rotation = useDoc(nightId && which === 'study' ? `nights/${nightId}/public/rotation` : null)
  const serverNow = useServerClock(uid, nightId, `kiosk-${which}`)
  useTick(250)

  const n = night.data
  const r = relay.data
  if (!uid || !nightId || !n) return <Idle title="Sirwin Manor" line="The house is quiet." />

  if (which === 'bedroom') return <Bedroom relay={r} />
  if (which === 'study') return <Study study={study.data} rotation={rotation.data} serverNow={serverNow} />
  return <Living night={n} relay={r} serverNow={serverNow} nightId={nightId} />
}

function Idle({ title, line }) {
  return (
    <div className="kiosk idle">
      <p className="kiosk-crest">{title}</p>
      <p className="kiosk-line">{line}</p>
    </div>
  )
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

function Living({ night, relay, serverNow, nightId }) {
  const lastState = useRef(null)
  const nudged = useRef(0)

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

  if (!relay || relay.state === 'idle' || !relay.state) {
    const act = ACTS[night.act]
    return <Idle title="Sirwin Manor" line={night.act ? `Act ${night.act} · ${act?.plain ?? ''}` : 'The doors are open.'} />
  }

  const done = relay.gridDone?.length ?? 0
  const total = relay.gridTurns ?? 0
  const head = <p className="kiosk-crest">Grid {relay.grid} of 3 · {relay.gridSize} by {relay.gridSize} · {done} of {total} drawn</p>

  if (relay.state === 'walk') {
    const first = done === 0
    return (
      <div className="kiosk walk">
        {head}
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
  if (relay.state === 'done') {
    return (
      <div className="kiosk done">
        <p className="kiosk-crest">All three drawings named</p>
        <p className="kiosk-big">The door is open.</p>
        <p className="kiosk-line">The light outside the bedroom is green. Go and see.</p>
      </div>
    )
  }
  return null
}

function Countdown({ endsAt, serverNow }) {
  const left = Math.max(0, Math.ceil((ms(endsAt) - serverNow()) / 1000))
  return <p className="kiosk-count" aria-live="off">{left}</p>
}

// The bedroom: the door is closed until the drawing is named. The trace
// reveal lands here once the case generator exists; until then the open door
// shows the words only.
function Bedroom({ relay }) {
  const open = !!relay?.doorOpen
  return (
    <div className={`kiosk bedroom ${open ? 'open' : 'closed'}`}>
      <p className="kiosk-crest">The bedroom</p>
      <p className="kiosk-big">{open ? 'The door is open.' : 'The door is closed.'}</p>
      <p className="kiosk-line">{open ? 'What was left behind is on this screen once the case is dealt.' : 'Name the three drawings in the living room.'}</p>
    </div>
  )
}


// ---- the study screen -----------------------------------------------------
// The M1 Air's own screen. Granolia, the three jewels, the clock, her hints.
// Everything here is counts and words from the station; the clue never comes
// through this screen. (Granolia's lines are defaults; the workshop can
// replace them once a "study lines" list exists.)

const CAP_MS = 15 * 60_000

const SAY = {
  idle: 'Touch any panel to begin. The wall will show you a pattern; touch it back.',
  playing: 'Watch.',
  reproducing: 'Now you. Touch them in the same order.',
  entering: 'Look at the other wall. A colour, and a number of bars. Press them on the button box, then Submit.',
  slow: 'Again, slower. I have all day. Well. Fifteen minutes.',
  map: 'Here, I have numbered them for you. Follow the numbers.',
  halfColour: 'The number is right, dear. Look at the colour again.',
  halfNumber: 'The colour is right, dear. Count the bars again.',
  neither: 'Neither half, I am afraid. Look again at both.',
  time: 'Three minutes left, dear. Not that I am counting. I am counting.',
  solved: 'Oh, well done. Something has been sent to your phones. Off you go.',
  capped: 'Thank you for trying your best. Here is the rest. Something has been sent to your phones. Off you go.',
}

function Study({ study, rotation, serverNow }) {
  const s = study ?? { state: 'idle' }
  const group = (rotation?.groups ?? []).find(g => g.id === s.groupId)
  const names = group ? group.members.map(m => m.name).join(', ') : null
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

// A drawing of the wall with the panels numbered in the order they lit.
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
        return (
          <g key={p.id}>
            <circle cx={p.x} cy={-p.y} r={r} fill={steps.length ? '#F1E8D6' : '#2a3a44'} stroke="#A6A253" strokeWidth={r / 12} />
            <text x={p.x} y={-p.y + r * 0.35} textAnchor="middle" fontSize={r} fill={steps.length ? '#001925' : '#8a9aa2'}>{fallback ? i + 1 : (steps.join(',') || '')}</text>
          </g>
        )
      })}
    </svg>
  )
}
