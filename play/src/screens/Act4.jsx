import { useEffect, useRef, useState } from 'react'
import { callMeet, callSalemReady, callSalemSlip, callSalemPassed, callBooDone } from '../firebase'
import { useDoc, useTick } from '../lib/hooks'
import { ROOMS, freeForGames, waitingGames, salemColourAt, salemFlipAt, salemSlip, booMoment, ms, SALEM_GRACE_MS, SALEM_SHAKE } from '../lib/night'
import { troubleLine } from '../lib/trouble'
import { CatFace, HostLine } from './Cards'
import { Questions } from './Windows'
import Spoken from './Spoken'

// Act 4, Behind Closed Doors (docs/handoff-2026-10-23.md §3, §9.5 to §9.9).
// The phone shows where the group goes this round (sessions/{uid}.act4,
// written by the server at every chime), then, once the group has scanned
// the code on the wall, that room's game: Salem's Motion Game and Boo's poses
// run on the phones; the light puzzle and the memory match run on the room's
// own screen. Whenever the guest is not in a game room, a Parlour Game that
// is waiting on the phone can be played (§3: never in a game room).
// Every word here is open copy; nothing sealed reaches a phone except the
// group's own reward card, which the server deals.

// Few words (Jon, 28 Oct 2026: "way too many words"; "don't tell the player
// when to shake. It's red or it's green"): the rule is said once, before the
// first round; while a round plays the phone is only the colour.
export const SALEM_LINES = {
  intro: 'RED: shake. GREEN: freeze. Yes, backwards.',
  ready: 'Phones in hand.',
  slipGreen: 'Someone moved on green. Again.',
  slipRed: 'Someone froze on red. Again.',
  passed: 'Not bad. For people.',
  cleared: "Huh. You lot can follow instructions. Here's what I know.",
  noSensor: "This phone can't feel a shake. Just watch.",
}
export const BOO_LINES = {
  intro: 'Watch the wall. When the music stops, strike a pose.',
}
// No device names in front of the guests (Jon, 29 Oct 2026): the iPad on its
// stand is "the Library's screen" (docs/room-screens.md).
const ROOM_GAMES = {
  study: 'The game is on the wall.',
  library: 'The game is on the screen.',
}

export default function Act4({ step, session, nightId, uid, serverNow, notes }) {
  const [game, setGame] = useState(null)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState(null)
  if (!step) return null
  const room = ROOMS[step.room] ?? null
  const free = freeForGames(step)
  const games = waitingGames(session)
  const scan = async () => {
    if (!room || nightId === 'preview') return
    setBusy(true); setMsg(null)
    try { await callMeet({ nightId, cat: room.cat }) } catch (e) { setMsg(troubleLine(e, 'The house did not answer. Try again.')) } finally { setBusy(false) }
  }
  if (game) {
    return (
      <div className="overlay" role="dialog" aria-modal="true" aria-label="Parlour Game">
        <Questions w={game} nightId={nightId} serverNow={serverNow} onDone={() => setGame(null)} />
      </div>
    )
  }
  return (
    <section className={`dealt act4 act4-${step.room}`}>
      <p className="eyebrow">{step.over ? 'Behind Closed Doors' : `Round ${step.round} of ${step.rounds}`}</p>
      {step.chime && !step.here && !step.paid && <p className="gloss">{step.chime}</p>}
      {room && <CatFace cat={room.cat} name={step.catName} size="l" />}
      <h3>{step.title}</h3>
      {step.hook && !step.here && <p className="game-hook">{step.hook}</p>}
      {!step.paid && !step.here && <p><Spoken text={step.text} /></p>}
      {room && !step.here && !step.paid && (
        <>
          <p className="gloss">{step.arrive}</p>
          <button className="quiet" disabled={busy} onClick={scan}>Can't scan? We're here</button>
        </>
      )}
      {room && step.here && !step.paid && step.host && <HostLine host={step.host} />}
      {room && step.here && !step.paid && <RoomGame room={step.room} nightId={nightId} uid={uid} serverNow={serverNow} groupId={session?.group} />}
      {step.paid && <p className="gloss">{step.paidText || 'Done. Back to the Parlour.'}</p>}
      {msg && <p className="trouble" role="status">{msg}</p>}
      {free && games.length > 0 && (
        <div className="waiting-game">
          <p>A Parlour Game is waiting.</p>
          <button className="big" onClick={() => setGame(games[0])}>Play</button>
        </div>
      )}
    </section>
  )
}

function RoomGame({ room, nightId, uid, serverNow, groupId }) {
  if (room === 'orangerie') return <SalemGame nightId={nightId} uid={uid} serverNow={serverNow} groupId={groupId} />
  if (room === 'entryway') return <BooPoses nightId={nightId} serverNow={serverNow} groupId={groupId} />
  return <p><Spoken text={ROOM_GAMES[room] ?? ''} /></p>
}

// ---------------------------------------------------------------------------
// Salem's Motion Game (§9.6). Red means go: shake. Green means freeze. The
// server schedules every colour change with a timestamp (public/salem), so
// every phone and the string lights flip together; the phone tints its whole
// screen the colour too, so the game works with no lights at all. A slip on
// any phone restarts the round for everyone; thirty seconds clean passes it.
// The Game test tab's practice (?practice=salem, screens/Practice.jsx) plays
// the same rounds through SalemRounds, on its own record.

// Movement, in m/s² with gravity taken out, from the phone's motion sensor.
// `ok` is false until a reading arrives (a phone with no sensor never slips).
export function useMotion() {
  const [state] = useState(() => ({ ok: false, mag: 0, lastShakeAt: 0, g: null }))
  useEffect(() => {
    if (typeof window === 'undefined' || !('DeviceMotionEvent' in window)) return
    const on = e => {
      let x, y, z
      if (e.acceleration && e.acceleration.x != null) ({ x, y, z } = e.acceleration)
      else if (e.accelerationIncludingGravity && e.accelerationIncludingGravity.x != null) {
        const a = e.accelerationIncludingGravity
        state.g = state.g ? { x: state.g.x * 0.9 + a.x * 0.1, y: state.g.y * 0.9 + a.y * 0.1, z: state.g.z * 0.9 + a.z * 0.1 } : { x: a.x, y: a.y, z: a.z }
        x = a.x - state.g.x; y = a.y - state.g.y; z = a.z - state.g.z
      } else return
      state.ok = true
      state.mag = Math.sqrt(x * x + y * y + z * z)
      if (state.mag > SALEM_SHAKE) state.lastShakeAt = Date.now()
    }
    window.addEventListener('devicemotion', on)
    return () => window.removeEventListener('devicemotion', on)
  }, [state])
  return state
}

function SalemGame({ nightId, uid, serverNow, groupId }) {
  const view = useDoc(nightId && nightId !== 'preview' ? `nights/${nightId}/public/salem` : null)
  const doc = view.data
  const motion = useMotion()
  const mine = doc && doc.groupId === groupId
  if (!mine) return <p className="gloss">Salem is finishing with the last lot.</p>
  return (
    <SalemRounds doc={doc} serverNow={serverNow} motion={motion}
      ready={() => callSalemReady({ nightId })}
      slip={(attempt, colour) => callSalemSlip({ nightId, attempt, colour })}
      passed={(attempt, felt) => callSalemPassed({ nightId, attempt, felt })} />
  )
}

// The rounds themselves, on one record in the night's shape ({ state: intro |
// idle | playing | passed | cleared, round, attempt, flips, startsAt, cleanAt,
// lastSlip }). `ready()`, `slip(attempt, colour)` and `passed(attempt, felt)`
// send to the server and return a promise; a refused slip or pass is sent
// again. `felt`: this phone can feel a shake, so it counts for Salem's
// just-for-fun winner on the Orangerie's screen (28 Oct 2026).
export function SalemRounds({ doc, serverNow, motion, ready, slip, passed, lines = SALEM_LINES }) {
  const sent = useRef({})
  const [slipShown, setSlipShown] = useState(null)
  useTick(100)
  const now = serverNow()
  const playing = doc.state === 'playing'
  const started = playing && now >= ms(doc.startsAt)
  const colour = started ? salemColourAt(doc, now) : null

  // a fresh attempt after a slip: say whose kind of slip it was, for a moment
  useEffect(() => {
    if (!doc?.lastSlip || !doc.attempt) return
    setSlipShown(doc.lastSlip)
    const id = setTimeout(() => setSlipShown(null), 3000)
    return () => clearTimeout(id)
  }, [doc?.attempt, doc?.lastSlip])

  // the rules, checked ten times a second on this phone; each attempt reports once
  useEffect(() => {
    if (!started || !colour || !motion.ok) return
    const key = `${doc.attempt}`
    if (sent.current[key]) return
    const local = Date.now()
    const offset = local - now // this phone's clock against the server's
    const flipAt = salemFlipAt(doc, now) + offset
    const grace = SALEM_GRACE_MS[doc.round] ?? 600
    const s = salemSlip({ colour, motion, local, flipAt, grace })
    if (s) {
      sent.current[key] = true
      Promise.resolve(slip(doc.attempt, s)).catch(() => { sent.current[key] = false })
    }
  })
  // thirty seconds clean: any phone may say so
  useEffect(() => {
    if (!playing || now < ms(doc.cleanAt)) return
    const key = `passed-${doc.attempt}`
    if (sent.current[key]) return
    sent.current[key] = true
    Promise.resolve(passed(doc.attempt, motion.ok)).catch(() => { sent.current[key] = false })
  })

  const onReady = () => Promise.resolve(ready()).catch(() => {})
  if (doc.state === 'intro' || doc.state === 'idle') return (
    <div className="salem">
      <div className="salem-key" role="img" aria-label={lines.intro}>
        <span className="salem-key-red">Shake</span>
        <span className="salem-key-green">Freeze</span>
      </div>
      <p className="salem-aside">Yes, backwards.</p>
      {!motion.ok && <p className="gloss">{lines.noSensor}</p>}
      <button className="big" onClick={onReady}>Ready</button>
    </div>
  )
  if (doc.state === 'passed') return (
    <div className="salem">
      <p><Spoken text={lines.passed} /></p>
      <button className="big" onClick={onReady}>Ready</button>
    </div>
  )
  if (doc.state === 'cleared') return <p><Spoken text={lines.cleared} /></p>
  // the round: the whole screen is the colour and nothing else; before it, a count; after a slip, one line
  const count = Math.max(1, Math.ceil((ms(doc.startsAt) - now) / 1000))
  return (
    <div className={`salem-play ${colour ?? 'wait'}`} role="status" aria-live="assertive" aria-label={colour ?? 'get ready'}>
      {!started && <p className="salem-count">{count}</p>}
      {!started && slipShown && <p className="slip">{slipShown === 'green' ? lines.slipGreen : lines.slipRed}</p>}
      <p className="salem-round" aria-hidden="true">{[1, 2, 3].map(r => <span key={r} className={r < doc.round ? 'done' : r === doc.round ? 'now' : ''} />)}</p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Boo's catwalk (§9.7): the show is on the wall (?kiosk=boo); the phones
// flash STRIKE A POSE with the five-second HOLD IT and Boo's verdict, all
// from the server's schedule (public/boo). When the show is over, the first
// phone to notice tells the server, and Boo pays. The practice
// (?practice=boo) shows the same moments through BooMoments, and pays nobody.
function BooPoses({ nightId, serverNow, groupId }) {
  const view = useDoc(nightId && nightId !== 'preview' ? `nights/${nightId}/public/boo` : null)
  const doc = view.data
  const told = useRef(false)
  const mine = doc && doc.groupId === groupId
  if (!mine) return <p className="gloss">Boo is finishing with the last lot.</p>
  const over = () => {
    if (doc.state !== 'show' || told.current) return
    told.current = true
    callBooDone({ nightId }).catch(() => { told.current = false })
  }
  return <BooMoments boo={doc} serverNow={serverNow} onOver={over} />
}

// The show's moments on a phone, from one record in the night's shape (see
// lib/night.js booMoment). `onOver()` is called while the show is over.
export function BooMoments({ boo, serverNow, onOver = null, doneText = "That's the show." }) {
  useTick(250)
  const now = serverNow()
  const m = booMoment(boo, now)
  useEffect(() => { if (m.part === 'done') onOver?.() })
  if (m.part === 'idle' || m.part === 'intro') return <p><Spoken text={BOO_LINES.intro} /></p>
  const of = boo?.poses?.length || 3
  if (m.part === 'strut') return (
    <div className="boo-phone">
      <p className="boo-phone-say">♪ Strut! ♪</p>
      <p className="gloss">Pose {m.pose} of {of}</p>
    </div>
  )
  if (m.part === 'pose') return (
    <div className="boo-pose" role="status" aria-live="assertive">
      <p className="boo-strike">POSE!</p>
      <p className="boo-hold">{m.hold}</p>
    </div>
  )
  if (m.part === 'judge') return (
    <div className="boo-phone">
      <p className="boo-judge"><Spoken text={m.line} /></p>
    </div>
  )
  return <p className="gloss">{doneText}</p>
}
