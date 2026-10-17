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
  const trace = useDoc(nightId && which !== 'study' ? `nights/${nightId}/public/trace` : null)
  const finale = useDoc(nightId && which === 'living' ? `nights/${nightId}/public/finale` : null)
  const serverNow = useServerClock(uid, nightId, `kiosk-${which}`)
  useTick(250)

  const n = night.data
  const r = relay.data
  if (!uid || !nightId || !n) return <Idle title="Sirwin Manor" line="The house is quiet." />

  if (which === 'bedroom') return <Bedroom relay={r} trace={trace.data} />
  if (which === 'study') return <Study study={study.data} rotation={rotation.data} serverNow={serverNow} />
  return <Living night={n} relay={r} trace={trace.data} finale={finale.data} serverNow={serverNow} nightId={nightId} />
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

export function Living({ night, relay, trace, finale, serverNow, nightId }) {
  const lastState = useRef(null)
  const nudged = useRef(0)
  const lastReveal = useRef(null)

  // a soft note at each reveal
  const stage = finale && night?.reveal ? finaleStage(finale, serverNow()) : null
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

  // Act 7: the finale runs on this screen against the server's clock
  if (finale && night?.reveal) return <Finale night={night} finale={finale} serverNow={serverNow} />
  // Act 7: while the phones decide, the trace is back on the big screen
  if (night?.window?.kind === 'ballot' && !night.window.settled && trace) {
    const left = Math.max(0, Math.ceil((ms(night.window.closesAt) - serverNow()) / 1000))
    return (
      <div className="kiosk ballot-screen">
        <p className="kiosk-crest">Two minutes to decide</p>
        <TraceView trace={trace} compact />
        <p className="kiosk-count">{Math.floor(left / 60)}:{String(left % 60).padStart(2, '0')}</p>
      </div>
    )
  }
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
// 1 heavy haze · 2 two traces overlaid · 3 clear, no name · 4 named · 5 named with a line
export function TraceView({ trace, compact = false }) {
  const level = Math.max(1, Math.min(5, Number(trace?.level) || 3))
  const base = import.meta.env.BASE_URL
  const src = (id) => `${base}traces/${id}.png`
  return (
    <div className={`trace level-${level}${compact ? ' compact' : ''}`}>
      <div className="trace-frame">
        <img className="trace-img main" src={src(trace.trace)} alt={level >= 4 ? trace.label : 'something left behind'} onError={e => { e.currentTarget.style.visibility = 'hidden' }} />
        {level === 2 && trace.partner && <img className="trace-img partner" src={src(trace.partner)} alt="" onError={e => { e.currentTarget.style.visibility = 'hidden' }} />}
        {level === 1 && <div className="trace-haze" aria-hidden="true" />}
      </div>
      {level >= 4 && trace.label && <p className="trace-label">{trace.label}</p>}
      {level === 5 && trace.context && <p className="trace-context">{trace.context}</p>}
      {level <= 2 && <p className="kiosk-next">{level === 1 ? 'Something was left behind.' : 'Something was left behind. One of two things.'}</p>}
      {level === 3 && <p className="kiosk-next">Something was left behind.</p>}
      {trace.placeholder && <p className="kiosk-next">Rehearsal</p>}
    </div>
  )
}

// ---- Act 7: the finale ----------------------------------------------------
// Everything on this screen is a function of the server's clock and the
// finale doc the server wrote at the reveal beat. Nothing is a timer.
export function finaleStage(finale, now) {
  const t = now - ms(finale.at)
  const s = finale.schedule ?? {}
  if (t >= (s.done ?? 110_000)) return 'done'
  if (t >= (s.victim ?? 95_000)) return 'victim'
  if (t >= (s.motive ?? 80_000)) return 'motive'
  if (t >= (s.murderer ?? 65_000)) return 'murderer'
  if (t >= (s.graph ?? 35_000)) return 'graph'
  return 'stats'
}

export function Finale({ night, finale, serverNow }) {
  const now = serverNow()
  const stage = finaleStage(finale, now)
  const r = night.reveal ?? {}
  if (stage === 'stats') return <StatsReel finale={finale} now={now} />
  if (stage === 'graph') return (
    <div className="kiosk finale">
      <p className="kiosk-crest">All night, two of you were pulling</p>
      <TugOfWar graph={finale.graph} />
      <p className="kiosk-line">Every Parlour Game answer from two phones moved this. Nobody knew. Not even them.</p>
    </div>
  )
  const order = ['murderer', 'motive', 'victim']
  const upto = stage === 'done' ? 3 : order.indexOf(stage) + 1
  return (
    <div className={`kiosk finale reveal ${stage}`}>
      <p className="kiosk-crest">{stage === 'done' ? 'Unmasked' : stage === 'murderer' ? 'The murderer' : stage === 'motive' ? 'The motive' : 'The one who died'}</p>
      <div className={`reveal-row count-${upto}`}>
        {order.slice(0, upto).map(k => (
          <div key={k} className={`reveal-card ${k}${k === stage ? ' now' : ''}`}>
            <p className="reveal-what">{k === 'murderer' ? 'Murderer' : k === 'motive' ? 'Motive' : 'Victim'}</p>
            {k === 'motive'
              ? <><p className="reveal-name motive">{r.motive?.n ? `${r.motive.n}.` : ''}</p><p className="reveal-sub">{r.motive?.rhyme ?? ''}</p></>
              : <><p className="reveal-name">{r[k]?.name ?? '…'}</p><p className="reveal-sub">{r[k]?.characterName ?? ''}{k === 'victim' ? ' · was the one who died' : ''}</p></>}
          </div>
        ))}
      </div>
      {finale.rehearsal && <p className="kiosk-next">Rehearsal</p>}
    </div>
  )
}

// Lines fade in one by one across the stats window. Mid-credits energy.
function StatsReel({ finale, now }) {
  const stats = finale.stats ?? []
  const span = (finale.schedule?.graph ?? 35_000)
  const t = Math.max(0, now - ms(finale.at))
  const each = span / Math.max(1, stats.length + 1)
  const shown = Math.min(stats.length, Math.floor(t / each))
  return (
    <div className="kiosk finale stats">
      <p className="kiosk-crest">While the Manor counts</p>
      <ul className="stats-reel">
        {stats.slice(0, shown).map((s, i) => (
          <li key={i} className={i === shown - 1 ? 'fresh' : ''}>
            <span className="stat-label">{s.label}</span>
            <span className="stat-value">{s.value}</span>
          </li>
        ))}
      </ul>
      {!stats.length && <p className="kiosk-line">The Manor is counting.</p>}
    </div>
  )
}

// The clarity dial across the night: the Ghost pulls up, the Murderer pulls
// down, and the line is where it landed after each act.
export function TugOfWar({ graph }) {
  const points = graph?.points ?? []
  const running = graph?.running ?? [{ act: 2, value: 0 }, { act: 4, value: 0 }, { act: 6, value: 0 }]
  const acts = [2, 4, 6]
  const W = 1000, H = 520, L = 190, R = 150, T = 50, B = 70
  const maxAbs = Math.max(6, ...running.map(p => Math.abs(p.value)), ...points.map(p => Math.abs(p.delta)))
  const x = (act) => L + ((acts.indexOf(act) + 0.5) / acts.length) * (W - L - R)
  const y = (v) => T + (H - T - B) / 2 - (v / maxAbs) * ((H - T - B) / 2)
  const mid = y(0)
  const pathD = running.map((p, i) => `${i ? 'L' : 'M'} ${x(p.act)} ${y(p.value)}`).join(' ')
  // bars: each push drawn from the running value before it
  const bars = []
  const before = {}
  let acc = 0
  for (const act of acts) {
    before[act] = acc
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
  return (
    <svg className="tug" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="the clarity dial across the night">
      <text x={L - 12} y={T + 14} textAnchor="end" className="tug-side">Ghost</text>
      <text x={L - 12} y={H - B - 4} textAnchor="end" className="tug-side">Murderer</text>
      <line x1={L} x2={W - R} y1={mid} y2={mid} className="tug-mid" />
      <text x={W - R + 8} y={mid + 6} className="tug-neutral">neutral</text>
      {acts.map(a => <text key={a} x={x(a)} y={H - 24} textAnchor="middle" className="tug-act">Act {a}</text>)}
      {bars.map((b, i) => (
        <rect key={i} className={`tug-bar ${b.role}`}
          x={x(b.act) + (b.role === 'ghost' ? -70 : 10)} width={60}
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
