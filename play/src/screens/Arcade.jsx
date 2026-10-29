import { useEffect, useRef, useState } from 'react'
import {
  ARCADE_NAME, KEY_COUNT, DIALS, keyAt, rowOf, colOf, MENU_KEYS, BACK_KEY, TOKENS, MAX_PLAYERS, GAMES, BOO_PICTURES,
  CLUE_MIN_MS, WINNER_MIN_MS, newArcade, arcadeStep, arcadeInput, arcadeChime, arcadeView, arcadeSample,
} from '../lib/arcade'
import { STRIP_W, loadArt, faceUrl, faceRgba, faceSolid, stripRgba, stripUrl } from '../lib/arcadeArt'
import { deckSupported, reopenDeck, chooseDeck, deckEvents, deckPainter, watchPlugs, deckProblem } from '../lib/arcadeDeck'
import { sfx } from '../lib/arcadeSound'
import { wakeAudio, Wake } from './Kiosk'
import { RehearsalBand } from './Moments'
import Spoken from './Spoken'

// Miss Boo LaRue's Arcade (28 Oct 2026, docs/boo-arcade.md): the page.
// /play/?kiosk=boo&play=1 is free play; &visit=1 is a group's visit for
// practice, its names asked first; &names=Jon,Susan starts a visit at once.
// main.jsx sends it here before the practices and the room screens, so it
// never goes through Kiosk.jsx: no sign-in, no presence row, no night. The
// only clue it ever shows is the house's square-bracket stand-in.
//
// One arcade (lib/arcade.js) lives in a ref. A 50 ms loop steps it on the
// page's own clock (performance.now(): there is no night and no server
// here); a press on the Stream Deck + XL (lib/arcadeDeck.js), on the deck
// drawn on the screen or on the keyboard moves it at once. Every view goes
// to the deck's painter, which paints only the keys that changed; the screen
// re-renders only when the view's sig changes. The sounds (lib/arcadeSound.js)
// play through the kiosk's one AudioContext once a click has woken it: a
// press on the deck cannot, so the Wake corner stays until the first click.
// The painter itself blanks the deck when the page is closed or left.
//
// <BooArcade sample="clue" /> is a Preview's frozen moment (arcadeSample):
// no loop, no input, no deck, no sound, no setup form, no band.

const TICK_MS = 50
const BASE = import.meta.env.BASE_URL
const booUrl = name => `${BASE}household/full/${encodeURIComponent(name)}`
const ART = { faceRgba, faceSolid, stripRgba } // what the deck's painter draws with

// The Stream Deck + XL's face in its own units, 1280 by 1081, so the deck on
// the screen has the shape of the one on the table: each key's corner, the
// touch strip, and each dial's middle (the dials' tops at 969, 112 across).
const FACE_W = 1280, FACE_H = 1081
const KEY_X = [11, 154, 298, 441, 585, 728, 872, 1015, 1159]
const KEY_Y = [32, 176, 318, 462]
const KEY_SIZE = 112
const DIAL_MID_X = d => 100 + 216 * d
const DIAL_MID_Y = 969 + 56
// A dial on the screen: its left arrow, its middle to press, its right arrow.
const DIAL_W = 192, DIAL_H = 84
const pct = (v, of) => `${(v / of * 100).toFixed(3)}%`
const KEY_BOXES = Array.from({ length: KEY_COUNT }, (_, i) => ({
  left: pct(KEY_X[colOf(i)], FACE_W), top: pct(KEY_Y[rowOf(i)], FACE_H), width: pct(KEY_SIZE, FACE_W), height: pct(KEY_SIZE, FACE_H),
}))
const STRIP_BOX = { left: pct(40, FACE_W), top: pct(674, FACE_H), width: pct(1200, FACE_W), height: pct(100, FACE_H) }
const DIAL_BOXES = Array.from({ length: DIALS }, (_, d) => ({
  left: pct(DIAL_MID_X(d) - DIAL_W / 2, FACE_W), top: pct(DIAL_MID_Y - DIAL_H / 2, FACE_H), width: pct(DIAL_W, FACE_W), height: pct(DIAL_H, FACE_H),
}))

// The mouse wheel or a trackpad over a dial turns it. A trackpad sends many
// small amounts and keeps going after the fingers lift, so the amounts add up:
const WHEEL_FIRST = 24 // pixels of scrolling for the first turn,
const WHEEL_MORE = 120 // this many more for each turn after it,
const WHEEL_GAP_MS = 220 // a pause this long starts a new flick,
const WHEEL_MAX = 4 // and one flick turns the dial at most this many times

// Why the deck is not working (lib/arcadeDeck.js deckProblem), in words.
const PROBLEM = {
  tab: 'The Stream Deck went to another arcade tab. Press Connect to bring it back here.',
  busy: 'The Stream Deck is busy: quit the Stream Deck app, then press Connect again.',
  gone: 'The Stream Deck was unplugged. Plug it back in.',
  other: "The Stream Deck didn't answer. Press Connect again.",
}

// While the names are typed the deck rests: Boo in the middle of the second
// row, and a line on the strip.
const RESTING = {
  faces: Array.from({ length: KEY_COUNT }, (_, i) => (i === keyAt(1, 4) ? 'boo' : 'off')),
  strip: { left: '', centre: 'Type the names on the screen', right: '', bar: null, dials: ['', '', '', '', '', ''] },
  screen: null,
  sig: 'resting',
}

// The moments that take the middle of the screen; the menu and a game in
// play leave Boo and the deck side by side.
const MOMENTS = ['ready', 'count', 'result', 'clue', 'third', 'winner', 'farewell']
// A clue, Boo's line for a trio's third player and the winner wait this long
// before a press moves them on (the engine's own rule), so OK waits too.
const OK_AFTER = { clue: CLUE_MIN_MS, third: CLUE_MIN_MS, winner: WINNER_MIN_MS }
const tooSoon = (a, now) => !!a && OK_AFTER[a.stage] != null && now - a.stageAt < OK_AFTER[a.stage]

// The engine's dial labels (GAMES dials) as arrows on the screen.
const ARROWS = { '◀': ['left', 'turn left'], '▶': ['right', 'turn right'], '▼': ['down', 'turn down'], '▲': ['up', 'turn up'] }
function arrowsOf(label) {
  const [a, b] = String(label ?? '').split(' ')
  const one = (glyph, dir, word) => (ARROWS[glyph] ? { dir: ARROWS[glyph][0], word: ARROWS[glyph][1] } : { dir, word })
  return [one(a, 'ccw', 'turn anticlockwise'), one(b, 'cw', 'turn clockwise')]
}

const GAME_NAMES = Object.fromEntries(GAMES.map(g => [`menu:${g.id}`, g.name]))
function keyName(face, i) {
  if (GAME_NAMES[face]) return GAME_NAMES[face]
  if (face === 'back') return 'Back'
  if (face === 'ok') return 'OK'
  return `Key ${i + 1}`
}

function clockOf(ms) {
  const s = Math.max(0, Math.round((ms ?? 0) / 1000))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}
const pointsWord = n => (n === 1 ? 'point' : 'points')
function andList(names) {
  const list = (names ?? []).filter(Boolean)
  return list.length <= 1 ? (list[0] ?? '') : `${list.slice(0, -1).join(', ')} and ${list[list.length - 1]}`
}
const noFocus = e => e.preventDefault() // a click leaves the focus where it was, so the space bar stays the first dial
const cleanNames = list => list.map(n => String(n ?? '').replace(/\s+/g, ' ').trim()).filter(Boolean).slice(0, MAX_PLAYERS)

// What the page opens on: a sample, a visit named in the address, the visit's
// form, or free play.
function opening(sample) {
  const now = performance.now()
  if (sample) return { now, arcade: arcadeSample(sample, now), setup: false }
  let p
  try { p = new URLSearchParams(window.location.search) } catch { p = new URLSearchParams() }
  const names = cleanNames(String(p.get('names') ?? '').split(','))
  if (names.length) return { now, arcade: newArcade({ mode: 'visit', players: names, seed: Date.now(), now }), setup: false }
  if (p.get('visit') === '1') return { now, arcade: null, setup: true }
  return { now, arcade: newArcade({ mode: 'free', seed: Date.now(), now }), setup: false }
}

export default function BooArcade({ sample = null }) {
  const live = !sample
  const [start] = useState(() => opening(sample))
  const arcadeRef = useRef(start.arcade)
  const [setup, setSetup] = useState(start.setup)
  const [view, setView] = useState(() => (start.arcade ? arcadeView(start.arcade, start.now) : RESTING))
  const viewRef = useRef(view) // the newest view, for a deck that connects or art that arrives
  const sigRef = useRef(view.sig)
  const [early, setEarly] = useState(false) // the moment's OK is not ready yet
  const earlyRef = useRef(false)
  const [artReady, setArtReady] = useState(false)
  const artRef = useRef(false)
  const [deck, setDeck] = useState(() => (!live ? 'none' : deckSupported() ? 'looking' : 'unsupported'))
  const [problem, setProblem] = useState(null)
  const heldRef = useRef(null) // the connected deck: { deck, painter, off }
  const attachRef = useRef(null)
  const heardRef = useRef(false)
  const [heard, setHeard] = useState(false)
  const deckBoxRef = useRef(null)
  const inputRef = useRef(null)
  const tickRef = useRef(null)

  // The view at `now` goes to the deck every time, and to the screen when it changed.
  function show(a, now) {
    const v = a ? arcadeView(a, now) : RESTING
    viewRef.current = v
    if (artRef.current) heldRef.current?.painter.paint(v.faces, v.strip)
    const wait = tooSoon(a, now)
    if (wait !== earlyRef.current) { earlyRef.current = wait; setEarly(wait) }
    if (v.sig !== sigRef.current) { sigRef.current = v.sig; setView(v) }
  }
  function play(events) {
    if (!heardRef.current || !events?.length) return
    const ctx = wakeAudio()
    for (const name of events) sfx(ctx, name)
  }
  function move(next, now) {
    arcadeRef.current = next
    play(next.events)
    show(next, now)
  }
  function input(ev) {
    const a = arcadeRef.current
    if (!live || !a) return
    const now = performance.now()
    move(arcadeInput(a, ev, now), now)
  }
  function tick() {
    const a = arcadeRef.current
    const now = performance.now()
    if (a) move(arcadeStep(a, now), now)
    else show(null, now)
  }
  function ring() {
    const a = arcadeRef.current
    if (!live || !a) return
    const now = performance.now()
    move(arcadeChime(a, now), now)
  }
  function begin(names) {
    const now = performance.now()
    arcadeRef.current = newArcade({ mode: 'visit', players: cleanNames(names), seed: Date.now(), now })
    setSetup(false)
    show(arcadeRef.current, now)
  }
  function freePlay() {
    const now = performance.now()
    arcadeRef.current = newArcade({ mode: 'free', seed: Date.now(), now })
    setSetup(false)
    show(arcadeRef.current, now)
  }
  function practise() {
    arcadeRef.current = null
    setSetup(true)
    show(null, performance.now())
  }
  // Connect: the browser's chooser opens only inside the click, so it is asked
  // first. It takes the deck from another arcade tab, if one has it.
  function connect() {
    const asking = chooseDeck({ steal: true })
    setDeck('asking')
    setProblem(null)
    asking.then(d => {
      if (d && attachRef.current) attachRef.current(d)
      else { setDeck(s => (s === 'asking' ? 'none' : s)); setProblem(deckProblem()) }
    })
  }
  inputRef.current = input
  tickRef.current = tick

  // The loop.
  useEffect(() => {
    if (!live) return
    const id = setInterval(() => tickRef.current(), TICK_MS)
    return () => clearInterval(id)
  }, [live])

  // The pictures: the fonts and the five face pictures once, then everything is
  // drawn with them. Boo's pictures for the screen come after, so they never
  // hold up the faces.
  useEffect(() => {
    let on = true
    loadArt().then(() => {
      if (!on) return
      artRef.current = true
      setArtReady(true)
      const v = viewRef.current
      heldRef.current?.painter.paint(v.faces, v.strip)
      for (const name of BOO_PICTURES) { const img = new Image(); img.src = booUrl(name) }
    })
    return () => { on = false }
  }, [])

  // Sound: the first click or key wakes the kiosk's AudioContext, and every one after keeps it awake.
  useEffect(() => {
    if (!live) return
    const wake = () => { heardRef.current = true; wakeAudio(); setHeard(true) }
    for (const type of ['pointerdown', 'click', 'keydown']) window.addEventListener(type, wake, true)
    return () => { for (const type of ['pointerdown', 'click', 'keydown']) window.removeEventListener(type, wake, true) }
  }, [live])

  // The keyboard: the left and right arrows turn the first dial, up and down
  // the last one, the space bar or Enter presses the first dial, 1 to 5 are
  // the five games on the menu, Escape is Back before a game starts. Never
  // while a name is being typed.
  useEffect(() => {
    if (!live) return
    const onKey = e => {
      if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey) return
      const t = e.target
      if (t?.isContentEditable || t?.closest?.('input, textarea, select')) return
      // a button of the page's own (Connect, OK) keeps its space bar; on the deck drawn on the screen it is the first dial
      const control = !t?.closest?.('.arcade-deck') && !!t?.closest?.('button, a[href], summary')
      let ev = null
      if (e.key === 'ArrowLeft') ev = { kind: 'turn', dial: 0, amount: -1 }
      else if (e.key === 'ArrowRight') ev = { kind: 'turn', dial: 0, amount: 1 }
      else if (e.key === 'ArrowUp') ev = { kind: 'turn', dial: DIALS - 1, amount: 1 }
      else if (e.key === 'ArrowDown') ev = { kind: 'turn', dial: DIALS - 1, amount: -1 }
      else if (e.repeat) return
      else if (e.key === ' ' || e.key === 'Enter') { if (!control) ev = { kind: 'press', dial: 0 } }
      else if (e.key === 'Escape') { if (arcadeRef.current?.stage === 'ready') ev = { kind: 'key', index: BACK_KEY } }
      else if (/^[1-9]$/.test(e.key) && Number(e.key) <= MENU_KEYS.length) ev = { kind: 'key', index: MENU_KEYS[Number(e.key) - 1] }
      if (!ev) return
      e.preventDefault()
      inputRef.current(ev)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [live])

  // The mouse wheel over a dial turns it (on a Mac, with its natural
  // scrolling: fingers to the right or up turn it clockwise).
  useEffect(() => {
    const box = deckBoxRef.current
    if (!live || !box) return
    let w = { dial: -1, dir: 0, sum: 0, turns: 0, at: -Infinity }
    const onWheel = e => {
      const dialBox = e.target?.closest?.('[data-dial]')
      if (!dialBox) return
      e.preventDefault()
      const dial = Number(dialBox.dataset.dial)
      const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 400 : 1
      const dx = e.deltaX * unit, dy = e.deltaY * unit
      const d = Math.abs(dx) > Math.abs(dy) ? -dx : dy
      if (!d) return
      const dir = Math.sign(d)
      const now = performance.now()
      if (dial !== w.dial || dir !== w.dir || now - w.at > WHEEL_GAP_MS) w = { dial, dir, sum: 0, turns: 0, at: now }
      w.at = now
      w.sum += Math.abs(d)
      while (w.turns < WHEEL_MAX && w.sum >= WHEEL_FIRST + w.turns * WHEEL_MORE) {
        w.turns += 1
        inputRef.current({ kind: 'turn', dial, amount: dir })
      }
    }
    box.addEventListener('wheel', onWheel, { passive: false })
    return () => box.removeEventListener('wheel', onWheel)
  }, [live])

  // The Stream Deck + XL: the one this browser was allowed before opens with no
  // click (after a reload, or plugged in again); otherwise Connect asks. Every
  // open goes through lib/arcadeDeck.js, which keeps one open deck for the
  // page, so React's second run of this effect gets the same one. The deck is
  // one arcade tab's at a time: the open on load takes it from another tab,
  // and a replug takes it only when no other tab has it.
  useEffect(() => {
    if (!live || !deckSupported()) return
    let cancelled = false
    const drop = () => {
      const held = heldRef.current
      if (!held) return
      heldRef.current = null
      held.off()
      held.painter.close()
    }
    const lost = (d, error) => {
      if (cancelled || heldRef.current?.deck !== d) return
      drop()
      setDeck('none')
      setProblem(deckProblem(error) ?? 'gone')
    }
    const attach = d => {
      if (cancelled || !d) return
      if (heldRef.current?.deck !== d) {
        drop()
        const painter = deckPainter(d, ART, { onLost: error => lost(d, error) })
        const off = deckEvents(d, ev => inputRef.current(ev), error => lost(d, error))
        heldRef.current = { deck: d, painter, off }
        const v = viewRef.current
        if (artRef.current) painter.paint(v.faces, v.strip)
      }
      setDeck('connected')
      setProblem(null)
    }
    attachRef.current = attach
    reopenDeck({ steal: true }).then(d => {
      if (cancelled) return
      if (d) attach(d)
      else { setDeck(s => (s === 'looking' ? 'none' : s)); setProblem(p => p ?? deckProblem()) }
    })
    const unwatch = watchPlugs({
      onPlug: () => reopenDeck().then(d => { if (cancelled) return; if (d) attach(d); else setProblem(p => deckProblem() ?? p) }),
      onUnplug: () => {
        if (cancelled) return
        drop()
        setDeck('none')
        setProblem('gone')
      },
    })
    return () => {
      cancelled = true
      unwatch()
      if (attachRef.current === attach) attachRef.current = null
      drop()
    }
  }, [live])

  // The browser tab says where it is.
  useEffect(() => {
    if (!live) return
    const before = document.title
    document.title = ARCADE_NAME
    return () => { document.title = before }
  }, [live])

  const screen = view.screen
  const stage = screen?.stage ?? null
  const visit = setup || screen?.mode === 'visit'
  const moment = screen && MOMENTS.includes(stage) ? stage : null
  const sub = !visit ? 'Free play' : screen?.free && stage !== 'farewell' ? 'Free play until the chime' : "A group's visit, for practice"
  const go = live ? () => input({ kind: 'press', dial: 0 }) : null
  const back = live ? () => input({ kind: 'key', index: BACK_KEY }) : null

  return (
    <div className="kiosk arcade papered" inert={sample ? true : undefined}>
      <RehearsalBand on={live && visit} label="PRACTICE" />
      <header className="arcade-top">
        <div className="arcade-name">
          <h1>{ARCADE_NAME}</h1>
          <p className="arcade-sub">{sub}</p>
        </div>
        {screen?.clockMs != null ? (
          <div className="arcade-round">
            {live && stage !== 'farewell' ? <button type="button" className="arcade-chime" onMouseDown={noFocus} onClick={ring}>Ring the chime</button> : null}
            <p className={`study-clock${screen.clockMs <= 60000 ? ' warn' : ''}`} aria-label="Time left in the round">{clockOf(screen.clockMs)}</p>
          </div>
        ) : null}
      </header>
      <main className="arcade-main">
        {screen ? <BooSide screen={screen} /> : <div className="arcade-boo" />}
        <Deck view={view} art={artReady} onInput={live ? input : null} boxRef={deckBoxRef} />
        {setup && live ? <Setup onStart={begin} onCancel={freePlay} />
          : moment ? <Moment key={moment} screen={screen} early={early} onGo={go} onBack={back} /> : null}
      </main>
      <footer className={`arcade-foot${live && !heard ? ' waking' : ''}`}>
        {live ? <DeckLine state={deck} problem={problem} onConnect={connect} /> : null}
        <Players screen={screen} setup={setup} onPractise={live ? practise : null} />
      </footer>
      {live ? <Wake /> : null}
    </div>
  )
}

// Boo, her line and what to do, beside the deck: the menu, and a game in play
// with its points and time (and Whack-a-Mouse's pets tapped).
function BooSide({ screen }) {
  const playing = screen.stage === 'play' && !!screen.game
  return (
    <section className={`arcade-boo${playing ? ' playing' : ''}`}>
      {playing ? <p className="arcade-game">{screen.game.name}</p> : null}
      <img className="arcade-picture" src={booUrl(screen.picture)} alt="Miss Boo LaRue" draggable={false} />
      <p className="boo-bubble arcade-bubble"><Spoken text={screen.boo} /></p>
      {playing ? (
        <p className="arcade-score">
          <span><strong>{screen.score}</strong> {pointsWord(screen.score)}</span>
          <span className="arcade-left">{clockOf(screen.timeLeftMs)} left</span>
          {screen.tally ? <span className="arcade-tally">{screen.tally}</span> : null}
        </p>
      ) : null}
      <p className="arcade-plain" aria-live="polite">{screen.plain}</p>
    </section>
  )
}

// Boo and her line, side by side, at the top of a moment.
function Says({ screen }) {
  return (
    <div className="arcade-says">
      <img src={booUrl(screen.picture)} alt="Miss Boo LaRue" draggable={false} />
      <p className="boo-bubble"><Spoken text={screen.boo} /></p>
    </div>
  )
}

// A moment across the middle of the screen: how to play, the count, the
// points, a player's clue, Boo's line for a trio's third player, the winner,
// the chime. Its buttons do what a press on the deck does.
function Moment({ screen, early, onGo, onBack }) {
  const ok = onGo ? (
    <div className="arcade-actions">
      <button type="button" className="arcade-btn" onMouseDown={noFocus} onClick={onGo} disabled={early}>OK</button>
    </div>
  ) : null
  const game = screen.game
  switch (screen.stage) {
    case 'ready':
      return (
        <div className="arcade-moment ready">
          <h2 className="arcade-moment-name">{game?.name}</h2>
          <p className="arcade-how">{game?.how}</p>
          <p className="arcade-do">{screen.plain}</p>
          {onGo ? (
            <div className="arcade-actions">
              <button type="button" className="arcade-btn" onMouseDown={noFocus} onClick={onGo}>Start</button>
              <button type="button" className="arcade-btn quiet" onMouseDown={noFocus} onClick={onBack}>Back</button>
            </div>
          ) : null}
        </div>
      )
    case 'count':
      return (
        <div className="arcade-moment count">
          <p className="arcade-moment-name small">{game?.name}</p>
          <p key={screen.count} className="arcade-count">{screen.count}</p>
          <p className="arcade-how dim">{game?.how}</p>
        </div>
      )
    case 'result':
      return (
        <div className="arcade-moment result">
          <Says screen={screen} />
          {screen.result ? <p className="arcade-points"><strong>{screen.result.score}</strong>{pointsWord(screen.result.score)}</p> : null}
          <p className="arcade-do">{screen.plain}</p>
        </div>
      )
    case 'clue':
      return (
        <div className="arcade-moment clue">
          <Says screen={screen} />
          <div className="arcade-clue">
            <p className="arcade-clue-text">{screen.clue}</p>
            {screen.note ? <p className="arcade-clue-note">{screen.note}</p> : null}
          </div>
          <p className="arcade-do">{screen.plain}</p>
          {ok}
        </div>
      )
    case 'third':
      return (
        <div className="arcade-moment third">
          <Says screen={screen} />
          <p className="arcade-do">{screen.plain}</p>
          {ok}
        </div>
      )
    case 'winner': {
      // a long names line (a tie, or long names) is set smaller, so OK stays on the screen
      const who = andList(screen.winner?.names)
      return (
        <div className={`arcade-moment winner${who.length > 28 ? ' long' : ''}`}>
          <Says screen={screen} />
          <p className="arcade-winner">{who}</p>
          <p className="arcade-do">{screen.plain}</p>
          {ok}
        </div>
      )
    }
    case 'farewell':
      return (
        <div className="arcade-moment farewell">
          <Says screen={screen} />
          {screen.plain ? <p className="arcade-do">{screen.plain}</p> : null}
        </div>
      )
    default:
      return null
  }
}

// A press on the deck drawn on the screen happens as the button goes down,
// like a key on the real one. Enter and the space bar never press the drawn
// key that has the focus: on the deck they are the first dial (the page's
// keyboard rule), so a key left focused by a click cannot take over the space
// bar. Only a click with no pointer (detail 0) presses the key itself: a
// screen reader's, or Enter or the space bar held down until it repeats,
// since the keyboard rule lets repeats through.
function hit(onInput, ev) {
  if (!onInput) return {}
  return {
    onPointerDown: e => { if (e.button !== 0) return; e.preventDefault(); onInput(ev) },
    onClick: e => { if (e.detail === 0) onInput(ev) },
  }
}
function stripHit(onInput) {
  if (!onInput) return {}
  return {
    onPointerDown: e => {
      if (e.button !== 0) return
      e.preventDefault()
      const r = e.currentTarget.getBoundingClientRect()
      onInput({ kind: 'strip', x: r.width > 0 ? (e.clientX - r.left) / r.width * STRIP_W : 0 })
    },
    onClick: e => { if (e.detail === 0) onInput({ kind: 'press', dial: 0 }) },
  }
}

// The Stream Deck + XL drawn on the screen: the 36 keys, the touch strip and
// the six dials, each a real button, with the same pictures the deck shows.
function Deck({ view, art, onInput, boxRef }) {
  const labels = view.strip?.dials ?? []
  return (
    <div className="arcade-deck" ref={boxRef} role="group" aria-label="The Stream Deck">
      {view.faces.map((face, i) => {
        const url = art ? faceUrl(face, 224) : null
        return (
          <button key={i} type="button" className="arcade-key" style={KEY_BOXES[i]} aria-label={keyName(face, i)} {...hit(onInput, { kind: 'key', index: i })}>
            {url ? <img src={url} alt="" draggable={false} /> : null}
          </button>
        )
      })}
      <button type="button" className="arcade-strip" style={STRIP_BOX} aria-label="The touch strip" {...stripHit(onInput)}>
        {art ? <StripPicture strip={view.strip} /> : null}
      </button>
      {DIAL_BOXES.map((box, d) => {
        const [ccw, cw] = arrowsOf(labels[d])
        return (
          <div key={d} className="arcade-dial" style={box} data-dial={d}>
            <button type="button" className="arcade-turn" aria-label={`Dial ${d + 1}, ${ccw.word}`} {...hit(onInput, { kind: 'turn', dial: d, amount: -1 })}><Arrow dir={ccw.dir} /></button>
            <button type="button" className={`arcade-knob${labels[d] === 'Press' ? ' lit' : ''}`} aria-label={`Press dial ${d + 1}`} {...hit(onInput, { kind: 'press', dial: d })} />
            <button type="button" className="arcade-turn" aria-label={`Dial ${d + 1}, ${cw.word}`} {...hit(onInput, { kind: 'turn', dial: d, amount: 1 })}><Arrow dir={cw.dir} /></button>
          </div>
        )
      })}
    </div>
  )
}
function StripPicture({ strip }) {
  const url = stripUrl(strip)
  return url ? <img src={url} alt="" draggable={false} /> : null
}

// An arrow on a dial: the way the game moves, or a turn either way.
function Arrow({ dir }) {
  if (dir === 'cw' || dir === 'ccw') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <g transform={dir === 'ccw' ? 'translate(24 0) scale(-1 1)' : undefined}>
          <path d="M5.4 9.6 A7 7 0 1 1 10.8 18.9" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
          <path d="M7 19.6 L12.2 15.6 L12.6 22 Z" fill="currentColor" />
        </g>
      </svg>
    )
  }
  const turn = { up: 0, right: 90, down: 180, left: 270 }[dir] ?? 0
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 4.5 L20.5 18.5 H3.5 Z" fill="currentColor" transform={`rotate(${turn} 12 12)`} />
    </svg>
  )
}

// The bottom left: whether the Stream Deck is connected, and Connect when it is not.
function DeckLine({ state, problem, onConnect }) {
  if (state === 'unsupported') {
    const insecure = typeof window !== 'undefined' && window.isSecureContext === false
    return (
      <p className="arcade-deckline">
        {insecure ? "To play on the Stream Deck, open this page from the workshop's Game test tab, in Google Chrome." : 'To play on the Stream Deck, open this page in Google Chrome.'}
      </p>
    )
  }
  if (state === 'connected') return <p className="arcade-deckline on">Stream Deck + XL: connected.</p>
  if (state === 'looking') return <p className="arcade-deckline">Looking for the Stream Deck.</p>
  return (
    <div className="arcade-deckline">
      <button type="button" className="arcade-connect" onMouseDown={noFocus} onClick={onConnect} disabled={state === 'asking'}>Connect the Stream Deck</button>
      <span className={problem ? 'arcade-problem' : 'arcade-hint'}>{problem ? PROBLEM[problem] ?? PROBLEM.other : 'Quit the Stream Deck app first.'}</span>
    </div>
  )
}

// The bottom right: in a visit, each player with their tokens and points,
// the player whose turn it is in brass; in free play, a way to a practice visit.
function Players({ screen, setup, onPractise }) {
  const players = screen?.players ?? []
  if (players.length) {
    return (
      <ol className="arcade-players" aria-label="The players">
        {players.map((p, i) => (
          <li key={i} className={`arcade-player${p.now ? ' now' : ''}`}>
            <span className="arcade-player-name">{p.name}</span>
            <span className="arcade-tokens" aria-label={`${p.tokens} of ${TOKENS} tokens left`}>
              {Array.from({ length: TOKENS }, (_, k) => <span key={k} className={`arcade-token${k < TOKENS - p.tokens ? ' spent' : ''}`} />)}
            </span>
            {p.scores.length ? <span className="arcade-scores">{p.scores.length > 1 ? `${p.scores.join(' + ')} = ${p.total}` : p.scores[0]}</span> : null}
          </li>
        ))}
      </ol>
    )
  }
  if (setup || !screen) return null
  return (
    <p className="arcade-fun">
      <span>Just for fun</span>
      {onPractise ? <button type="button" className="arcade-small" onMouseDown={noFocus} onClick={onPractise}>Practise a group's visit</button> : null}
    </p>
  )
}

// The practice visit's names: two or three, in the order they will play.
function Setup({ onStart, onCancel }) {
  const [names, setNames] = useState(['Player 1', 'Player 2', ''])
  const edit = (i, value) => setNames(list => list.map((n, k) => (k === i ? value : n)))
  const first = useRef(null)
  const fresh = useRef(false) // a click just put the cursor in a box: its words stay selected, so typing replaces them
  useEffect(() => { const el = first.current; if (el) { el.focus(); el.select() } }, [])
  return (
    <form className="arcade-moment arcade-setup" onSubmit={e => { e.preventDefault(); onStart(names) }}>
      <h2 className="arcade-moment-name">Who is playing?</h2>
      <p className="arcade-do">Two or three first names, in the order they will play.</p>
      <div className="arcade-names">
        {names.map((n, i) => (
          <input
            key={i} ref={i === 0 ? first : undefined} className="arcade-input" value={n} maxLength={30}
            autoComplete="off" autoCapitalize="words" spellCheck={false}
            placeholder={i === 2 ? 'A third player, if there is one' : ''} aria-label={`Player ${i + 1}`}
            onFocus={e => { e.currentTarget.select(); fresh.current = true }}
            onMouseUp={e => { if (fresh.current) { fresh.current = false; e.preventDefault() } }}
            onBlur={() => { fresh.current = false }}
            onChange={e => edit(i, e.target.value)}
          />
        ))}
      </div>
      <div className="arcade-actions">
        <button type="submit" className="arcade-btn">Start the visit</button>
        <button type="button" className="arcade-btn quiet" onClick={onCancel}>Back to free play</button>
      </div>
    </form>
  )
}
