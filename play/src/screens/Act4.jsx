import { useEffect, useRef, useState } from 'react'
import { callMeet, callSalemReady, callSalemSlip, callSalemPassed } from '../firebase'
import { useDoc, useTick } from '../lib/hooks'
import { ROOMS, freeForGames, waitingGames, salemColourAt, salemFlipAt, salemSlip, ms, SALEM_GRACE_MS, SALEM_SHAKE } from '../lib/night'
import { troubleLine } from '../lib/trouble'
import { CatFace, HostLine } from './Cards'
import { Questions } from './Windows'
import Spoken from './Spoken'

// Act 4, Behind Closed Doors (docs/handoff-2026-10-23.md §3, §9.5 to §9.9).
// The phone shows where the group goes this round (sessions/{uid}.act4,
// written by the server at every chime), then, once the group has scanned
// the code on the wall, that room's game: Salem's Motion Game runs on the
// phones; the light puzzle, the memory match and Boo's arcade run on the
// room's own screen. Whenever the guest is not in a game room, a Parlour Game that
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
// No device names in front of the guests (Jon, 29 Oct 2026): the iPad on its
// stand is "the Library's screen" (docs/room-screens.md), and Boo's Mac with
// the Stream Deck is "the screen" and "the deck" (the arcade, 5 Nov 2026).
const ROOM_GAMES = {
  study: 'The game is on the wall.',
  library: 'The game is on the screen.',
  entryway: 'The games are on the deck. Your clue comes to this phone too.',
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
// Since 31 Oct 2026 (Jon's note 10012) it keeps the last reading itself as
// well, for Salem's head on the screen: `ax`, `ay` the push sideways and up
// the screen, `gx`, `gy` which way is down (gravity), and `spin` how fast the
// phone is turning flat (degrees a second). None of it changes the rules.
export function useMotion() {
  const [state] = useState(() => ({ ok: false, mag: 0, lastShakeAt: 0, g: null, ax: 0, ay: 0, gx: 0, gy: 0, spin: 0 }))
  useEffect(() => {
    if (typeof window === 'undefined' || !('DeviceMotionEvent' in window)) return
    const on = e => {
      let x, y, z
      const ag = e.accelerationIncludingGravity
      if (e.acceleration && e.acceleration.x != null) {
        ({ x, y, z } = e.acceleration)
        if (ag && ag.x != null) state.g = { x: ag.x - x, y: ag.y - y, z: ag.z - z }
      } else if (ag && ag.x != null) {
        state.g = state.g ? { x: state.g.x * 0.9 + ag.x * 0.1, y: state.g.y * 0.9 + ag.y * 0.1, z: state.g.z * 0.9 + ag.z * 0.1 } : { x: ag.x, y: ag.y, z: ag.z }
        x = ag.x - state.g.x; y = ag.y - state.g.y; z = ag.z - state.g.z
      } else return
      state.ok = true
      state.mag = Math.sqrt(x * x + y * y + z * z)
      if (state.mag > SALEM_SHAKE) state.lastShakeAt = Date.now()
      state.ax = x; state.ay = y
      state.gx = state.g?.x ?? 0; state.gy = state.g?.y ?? 0
      state.spin = Number(e.rotationRate?.alpha) || 0
    }
    window.addEventListener('devicemotion', on)
    return () => window.removeEventListener('devicemotion', on)
  }, [state])
  return state
}

// Salem's head, loose on the phone's screen while a round plays (Jon's note
// 10012, 31 Oct 2026: "the phone should have a little bit more insight, some
// characteristics of the game moving, like with the accelerometer the head
// bounces around, being able to rotate"). A thing in a shaken box: every jolt
// throws it the other way, it rolls to whichever side is down, it bounces off
// the edges, it turns against the phone's own turning, and it swells with a
// hard shake. Nothing it does changes the rules (lib/night.js salemSlip); it
// only shows the phone can feel what the guest is doing. With no sensor, or
// before the first reading, it floats gently in the middle. Drawn straight
// to the element, sixty times a second, with no React redraw.
export const HEAD_PUSH = 140 // px/s² of head for each m/s² of phone
export const HEAD_ROLL = 60 // px/s² of head for each m/s² of gravity sideways
export function SalemHead({ motion, src = `${import.meta.env.BASE_URL}household/faces/${encodeURIComponent('Salem Face.png')}` }) {
  const ref = useRef(null)
  useEffect(() => {
    const el = ref.current
    if (!el || typeof window === 'undefined' || !window.requestAnimationFrame) return
    const still = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches
    const h = { x: 0, y: 0, vx: 0, vy: 0, a: 0, va: 0, last: performance.now(), t: 0 }
    let raf = 0
    const step = (now) => {
      const dt = Math.min(0.05, Math.max(0.001, (now - h.last) / 1000))
      h.last = now
      h.t += dt
      const size = el.offsetWidth || Math.min(window.innerWidth, window.innerHeight) * 0.44
      const maxX = Math.max(0, (window.innerWidth - size) / 2)
      const maxY = Math.max(0, (window.innerHeight - size) / 2)
      if (motion.ok && !still) {
        // the phone's jolt throws the head the other way; the screen's y runs down, the phone's y runs up
        h.vx += (-motion.ax * HEAD_PUSH - motion.gx * HEAD_ROLL) * dt
        h.vy += (motion.ay * HEAD_PUSH + motion.gy * HEAD_ROLL) * dt
        h.va += -motion.spin * dt * 0.8
      } else {
        // no reading: a gentle float
        h.vx += (Math.sin(h.t * 0.9) * 18 - h.x * 2) * dt
        h.vy += (Math.cos(h.t * 0.7) * 14 - h.y * 2) * dt
      }
      // a soft spring to the middle and some drag, so it settles when the phone does
      h.vx += -h.x * 2.5 * dt; h.vy += -h.y * 2.5 * dt
      h.vx *= 1 - 1.4 * dt; h.vy *= 1 - 1.4 * dt
      h.x += h.vx * dt; h.y += h.vy * dt
      // the edges: a bounce, and the knock sets it spinning
      if (h.x > maxX) { h.x = maxX; h.vx = -Math.abs(h.vx) * 0.6; h.va += h.vy * 0.4 }
      if (h.x < -maxX) { h.x = -maxX; h.vx = Math.abs(h.vx) * 0.6; h.va -= h.vy * 0.4 }
      if (h.y > maxY) { h.y = maxY; h.vy = -Math.abs(h.vy) * 0.6; h.va -= h.vx * 0.4 }
      if (h.y < -maxY) { h.y = -maxY; h.vy = Math.abs(h.vy) * 0.6; h.va += h.vx * 0.4 }
      // the turn eases back upright
      h.va += -h.a * 1.5 * dt
      h.va *= 1 - 1.6 * dt
      h.a += h.va * dt
      const swell = motion.ok ? 1 + Math.min(0.45, motion.mag / 24) : 1
      el.style.transform = `translate(${h.x.toFixed(1)}px, ${h.y.toFixed(1)}px) rotate(${h.a.toFixed(1)}deg) scale(${swell.toFixed(3)})`
      raf = window.requestAnimationFrame(step)
    }
    raf = window.requestAnimationFrame(step)
    return () => window.cancelAnimationFrame(raf)
  }, [motion])
  return <img ref={ref} className="salem-head" src={src} alt="" aria-hidden="true" draggable="false" onError={e => { e.currentTarget.style.visibility = 'hidden' }} />
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
      <SalemHead motion={motion} />
      {!started && <p className="salem-count">{count}</p>}
      {!started && slipShown && <p className="slip">{slipShown === 'green' ? lines.slipGreen : lines.slipRed}</p>}
      <p className="salem-round" aria-hidden="true">{[1, 2, 3].map(r => <span key={r} className={r < doc.round ? 'done' : r === doc.round ? 'now' : ''} />)}</p>
    </div>
  )
}

// ---------------------------------------------------------------------------

