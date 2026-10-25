import { useCallback, useEffect, useRef, useState } from 'react'
import { callGameTest } from '../firebase'
import { useAuthUid, useDoc, useOnline } from '../lib/hooks'
import { watchWake } from '../lib/clock'
import { uiLines } from '../lib/content'
import { GAME_NAMES } from '../lib/rooms'
import { SALEM_SHAKE, SALEM_STILL_MS } from '../lib/night'
import { PRACTICE_DOCS, salemPractice, slipsSince, savedName, saveName, cleanName, booPractice, clockSample, keepSample, practiceError } from '../lib/gametest'
import { SalemRounds, SALEM_LINES, BooMoments, useMotion } from './Act4'
import { BooRunway } from './Rooms'
import { PoseCamera } from './Pose'
import { Wake, StaleDot } from './Kiosk'
import { CatFace } from './Cards'
import { Moment, Seal, RehearsalBand } from './Moments'
import Allow from './Allow'

// The Game test tab's practice pages (24 Oct 2026): a game tried before the
// night, on any phone, with no night at all.
//   ?practice=salem          Get Off My Lawn!: join with a first name, then the
//                            same rounds as the night, plus a shake meter and
//                            a line for every slip
//   ?practice=boo            Boo's Catwalk on the phones
//   ?kiosk=boo&practice=1    Boo's Catwalk on the wall
// Each follows its own record (public_state/game_test_salem, game_test_boo),
// which only the gameTest function writes; the workshop opens, starts and
// stops them. Nothing here reads a night or pays anyone, and nothing writes
// presence/{uid}: that row is the whole browser's, and a room screen in
// another tab of the same browser is let in by it. The clock asks the
// gameTest function the time instead (usePracticeClock).

const ui = uiLines(null)

// The phone's own words while it practises. Salem's last line promises a
// clue the practice does not give, so it stops before that.
const PRACTICE_SALEM_LINES = { ...SALEM_LINES, cleared: "Huh. You lot can follow instructions. Backwards ones, anyway." }
const SAY = {
  closed: 'The practice is closed. Open it again on the Game test page in the workshop to play again.',
  cleared: 'That was all three rounds. On the night, Salem’s reward shows here. This is practice, so nothing is paid.',
  joining: 'Joining the practice…',
  booNotStarted: 'The show has not started. Start it on the Game test page in the workshop, and watch the wall.',
  booDone: 'That’s the show. This is practice, so nothing is paid.',
  booWallIdle: 'Practice. Start the show on the Game test page in the workshop.',
}

function Shell({ game, cat, catName, children }) {
  const g = GAME_NAMES[game]
  return (
    <main className="practice papered">
      <section className={`dealt act4 act4-${game}`}>
        <p className="eyebrow">Practice · nothing counts</p>
        <CatFace cat={cat} name={catName} size="l" />
        <h3>{g?.name}</h3>
        {g?.hook && <p className="game-hook">{g.hook}</p>}
        {children}
      </section>
    </main>
  )
}

// The server's clock without a heartbeat: the gameTest function's 'clock'
// answer, measured on load, again a moment later (the first call may wake
// the function), once a minute and on every wake. The reading with the
// shortest round trip wins (lib/gametest.js keepSample).
function usePracticeClock(uid) {
  const best = useRef(null)
  useEffect(() => {
    if (!uid) return
    let stopped = false
    let last = 0
    const measure = async () => {
      const t0 = Date.now()
      if (t0 - last < 2000) return // a burst of wake events is one re-measure
      last = t0
      try {
        const r = await callGameTest({ command: 'clock' })
        if (!stopped) best.current = keepSample(best.current, clockSample(t0, Date.now(), r?.data?.now))
      } catch {
        // offline: keep the last reading; the next tick tries again
      }
    }
    measure()
    const soon = setTimeout(measure, 2500)
    const id = setInterval(measure, 60_000)
    const unwatch = typeof window === 'undefined' ? () => {} : watchWake(window, document, () => measure())
    return () => { stopped = true; clearTimeout(soon); clearInterval(id); unwatch() }
  }, [uid])
  return useCallback(() => Date.now() + (best.current?.skew ?? 0), [])
}

// ---- Get Off My Lawn! -------------------------------------------------------

export function SalemPractice() {
  const { uid, error } = useAuthUid()
  const [name, setName] = useState(() => savedName())
  const [allowed, setAllowed] = useState(false)
  let step
  if (error) step = <Moment text={ui.OFFLINE} crest />
  else if (!name) step = <NameStep onName={n => { saveName(n); setName(cleanName(n)) }} />
  // motion is asked for from a tap, the same screen as the night's
  else if (!allowed) step = <Allow uid={null} onDone={() => setAllowed(true)} onward="On to the practice" />
  else step = <SalemPracticeGame uid={uid} name={name} onRename={() => setName('')} />
  return <><RehearsalBand on label="PRACTICE" />{step}</>
}

function NameStep({ onName }) {
  const [text, setText] = useState('')
  const n = cleanName(text)
  return (
    <main className="join papered">
      <Seal />
      <p className="crest">Practice · Get Off My Lawn!</p>
      <h1 className="ask">Your first name</h1>
      <form className="join-form" onSubmit={e => { e.preventDefault(); if (n) onName(n) }}>
        <input className="name-input" type="text" inputMode="text" autoComplete="given-name" autoCapitalize="words" maxLength={30}
          placeholder="Your first name" aria-label="Your first name" value={text} onChange={e => setText(e.target.value)} autoFocus />
        <button className="big" type="submit" disabled={!n}>Join the practice</button>
      </form>
      <p className="gloss">So the others can see who joined. This phone remembers it.</p>
    </main>
  )
}

function SalemPracticeGame({ uid, name, onRename }) {
  const view = useDoc(uid ? PRACTICE_DOCS.salem : null)
  const serverNow = usePracticeClock(uid)
  const motion = useMotion()
  const p = salemPractice(view.data, uid)
  const [msg, setMsg] = useState(null)
  const [log, setLog] = useState([])
  const tried = useRef(null)

  // join once per practice and per name (a new name joins again); a refusal
  // says why, with a button to try again. The first phone to join a practice
  // nobody has opened yet opens it (functions/lib/gametest.js salemJoin).
  const mine = view.data?.players?.[uid]
  const needsJoin = (p.status === 'open' || p.status === 'none') && !p.joined
  const renamed = p.status === 'open' && !!mine && cleanName(mine.name) !== name
  const joinKey = `${p.runId}|${name}`
  const join = () => {
    tried.current = joinKey
    setMsg(null)
    callGameTest({ command: 'salem-join', name }).catch(e => setMsg(practiceError(e)))
  }
  // a phone that was in and is not any more (dropped from the list) joins again by itself
  const wasJoined = useRef(false)
  useEffect(() => {
    if (wasJoined.current && !p.joined) tried.current = null
    wasJoined.current = p.joined
  }, [p.joined])
  useEffect(() => {
    if (!uid || !(needsJoin || renamed) || tried.current === joinKey) return
    join()
  }, [uid, needsJoin, renamed, joinKey, p.joined])

  // a plain line for every slip seen while this page is open; a new practice starts the list again
  const last = useRef(null)
  const d = view.data
  useEffect(() => {
    const next = d ? { runId: d.runId ?? null, state: d.state, round: d.round, attempt: d.attempt, slips: d.slips, lastSlip: d.lastSlip ?? null } : null
    const prev = last.current
    last.current = next
    if (prev && next && prev.runId !== next.runId) { setLog([]); return }
    const fresh = slipsSince(prev, next)
    if (fresh.length) setLog(l => [...fresh.map((s, i) => ({ ...s, key: `${next.attempt}-${i}` })), ...l].slice(0, 12))
  }, [d?.runId, d?.attempt, d?.slips, d?.state, d?.round])

  const ready = () => callGameTest({ command: 'salem-ready' }).then(() => setMsg(null), e => setMsg(practiceError(e)))
  const slip = (attempt, colour) => callGameTest({ command: 'salem-slip', attempt, colour })
  const passed = attempt => callGameTest({ command: 'salem-passed', attempt })

  let body
  if (!uid || !view.loaded) body = <p className="gloss">{SAY.joining}</p>
  else if (p.status === 'closed') body = <p>{SAY.closed}</p>
  else if (needsJoin) body = msg ? null : <p className="gloss">{SAY.joining}</p>
  else body = (
    <>
      <SalemRounds key={p.runId ?? 'practice'} doc={p.game} serverNow={serverNow} motion={motion} ready={ready} slip={slip} passed={passed} lines={PRACTICE_SALEM_LINES} />
      {p.game.state === 'cleared' && <p className="gloss">{SAY.cleared}</p>}
    </>
  )

  return (
    <Shell game="orangerie" cat="salem" catName="Salem Crooknog">
      {body}
      {msg && <p className="trouble" role="status">{msg}</p>}
      {msg && needsJoin && <button className="quiet" onClick={join}>Try joining again</button>}
      <ShakeMeter motion={motion} />
      {p.status === 'open' && p.game.state === 'playing' && <p className="gloss">Slips this round: {p.game.slips}</p>}
      {log.length > 0 && (
        <ul className="slip-log" aria-live="polite">
          {log.map(s => <li key={s.key}>Round {s.round}: {s.line}</li>)}
        </ul>
      )}
      {p.players.length > 0 && <p className="gloss">On this practice: {p.players.map(x => x.name).join(', ')}</p>}
      <button className="link" onClick={onRename}>Not {name}? Change the name</button>
    </Shell>
  )
}

// How hard this phone is moving, live, against the line where a shake
// counts: so the host can feel how touchy the game is. Practice only.
function ShakeMeter({ motion }) {
  const [level, setLevel] = useState(0)
  const [shaking, setShaking] = useState(false)
  useEffect(() => {
    let peak = 0
    const id = setInterval(() => {
      peak = Math.max(motion.mag, peak * 0.8)
      setLevel(peak)
      setShaking(Date.now() - motion.lastShakeAt < 300)
    }, 100)
    return () => clearInterval(id)
  }, [motion])
  const full = SALEM_SHAKE * 2 // the line sits halfway along the bar
  const pct = Math.min(100, (level / full) * 100)
  const still = (SALEM_STILL_MS / 1000).toLocaleString('en-GB')
  return (
    <div className="shake-meter">
      <p className="eyebrow">Shake meter</p>
      <div className="meter" role="meter" aria-label="How hard this phone is shaking" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(pct)}>
        <div className={`meter-fill${shaking ? ' over' : ''}`} style={{ width: `${pct}%` }} />
        <div className="meter-line" />
      </div>
      <p className="gloss">
        {!motion.ok ? 'This phone has not felt any movement yet.' : shaking ? 'Shaking: past the line counts as a shake.' : 'Still.'}
      </p>
      <p className="gloss">On red, keep shaking: still for more than {still} seconds is a slip. On green, any shake past the line is a slip.</p>
    </div>
  )
}

// ---- Boo's Catwalk ----------------------------------------------------------

function useBooPractice() {
  const { uid, error } = useAuthUid()
  const view = useDoc(uid ? PRACTICE_DOCS.boo : null)
  const serverNow = usePracticeClock(uid)
  return { uid, error, view, serverNow, p: booPractice(view.data) }
}

// The phones: the same moments as the night, from the practice's show.
export function BooPractice() {
  const { uid, error, view, serverNow, p } = useBooPractice()
  return (
    <>
      <RehearsalBand on label="PRACTICE" />
      {error ? <Moment text={ui.OFFLINE} crest /> : (
        <Shell game="entryway" cat="boo" catName="Miss Boo LaRue">
          {!uid || !view.loaded ? <p className="gloss">One moment…</p>
            : p.status !== 'show' ? <p>{SAY.booNotStarted}</p>
            : <BooMoments key={p.runId ?? 'practice'} boo={p.show} serverNow={serverNow} doneText={SAY.booDone} />}
        </Shell>
      )}
    </>
  )
}

// Boo's camera (?kiosk=pose&practice=1): the practice show, and the photo kept
// on the iPad's own screen. Nothing is sent.
export function PoseCameraPractice() {
  const { error, view, serverNow, p } = useBooPractice()
  const online = useOnline()
  return (
    <>
      <RehearsalBand on label="PRACTICE" />
      {error
        ? <div className="kiosk pose-cam"><p className="kiosk-line">{ui.OFFLINE}</p></div>
        : <PoseCamera boo={p.show} nightId="practice" serverNow={serverNow} practice />}
      <StaleDot view={view} online={online} />
    </>
  )
}

// The wall: the night's runway, from the practice's show. No kiosk heartbeat,
// and no presence row at all.
export function BooWallPractice() {
  const { error, view, serverNow, p } = useBooPractice()
  const online = useOnline()
  return (
    <>
      <RehearsalBand on label="PRACTICE" />
      {error
        ? <div className="kiosk boo-wall idle"><p className="kiosk-line">{ui.OFFLINE}</p></div>
        : <BooRunway key={p.runId ?? 'practice'} boo={p.show} live={p.status === 'show'} serverNow={serverNow} idleLine={SAY.booWallIdle} />}
      <StaleDot view={view} online={online} />
      <Wake />
    </>
  )
}
