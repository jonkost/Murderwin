import { useEffect, useMemo, useRef, useState } from 'react'
import { callMeet } from './firebase'
import { useAuthUid, useDoc, useServerClock, useOnline, useTick, setNotesNight, handoverReset, lastHandoverSeen, isStale, secondsSinceHeard } from './lib/hooks'
import { uiLines } from './lib/content'
import { relayRules } from './lib/screen'
import { clockFor, isDark, isRehearsalNight, lockFor, meetParam, needsHandoverReset, notesFor, openWindow, placement, presenceKey, promptKeyOf, promptStage, resultCard, roleCard, showRehearsalBand, showsPrompt, wantsWelcome } from './lib/night'
import { troubleLine } from './lib/trouble'
import { RehearsalNight } from './screens/Cards'
import Join from './screens/Join'
import Rest from './screens/Rest'
import Welcome from './screens/Welcome'
import Allow from './screens/Allow'
import { keepAwake } from './lib/permissions'
import { Questions, Eliminate, EyesLock, ResultLock } from './screens/Windows'
import { Dark, Moment, Blackout, Prompt, Offline, PausedStrip, RehearsalBand } from './screens/Moments'
import { StartNight } from './screens/Host'
import Relay, { RelayDone, ms } from './screens/Relay'

// One page. What a phone shows is a pure function of three documents:
// the active night (public), this phone's session (private), and this
// phone's notes for this night. Every transition is driven by the server;
// nothing here counts down on its own.
export default function App() {
  const { uid, error: authError } = useAuthUid()
  const active = useDoc(uid ? 'public_state/active' : null)
  const nightId = active.data?.nightId ?? null
  const night = useDoc(nightId ? `nights/${nightId}` : null)
  const content = useDoc(nightId ? `nights/${nightId}/public/content` : null)
  const session = useDoc(uid ? `sessions/${uid}` : null)
  const notesDoc = useDoc(uid ? `notes/${uid}` : null)
  const relay = useDoc(nightId ? `nights/${nightId}/public/relay` : null)
  // The heartbeat names this guest only while the phone holds an active
  // character on this night; a handed-over phone at the doors reports nobody.
  const serverNow = useServerClock(uid, nightId, presenceKey(session.data, nightId))
  const online = useOnline()
  const ui = useMemo(() => uiLines(content.data), [content.data])
  const [tour, setTour] = useState(false)
  const [sent, setSent] = useState(null) // a window just answered, until the session catches up
  // the ballot's picks so far ({ id, step, pick }; 25 Oct 2026): kept here, not in the card, so a guest who
  // opens Clues or Motives while deciding (the Now pane unmounts), or a pause, comes back to the same step
  const [draft, setDraft] = useState(null)
  useTick(1000) // windows close on the server's clock; re-check once a second

  // Notes are kept per night: a phone that rehearsed starts the party clean.
  useEffect(() => { setNotesNight(nightId) }, [nightId])
  const notes = useMemo(() => notesFor(notesDoc.data, nightId), [notesDoc.data, nightId])
  // a phone that allowed the permissions keeps its screen awake after a reload too
  const allowed = !!notes.seen.allow
  useEffect(() => { if (allowed) keepAwake().catch(() => {}) }, [allowed])

  // A borrowed phone: the host's handover bumps the session's generation and
  // this browser forgets the previous owner before anyone else sees it.
  const generation = session.data?.generation ?? null
  useEffect(() => {
    if (needsHandoverReset({ generation }, lastHandoverSeen())) handoverReset(generation)
  }, [generation])

  // A cat's room code (/play/?meet=granolia, Act 2): once this phone holds a
  // character on the night, it tells the server the guest is with that cat,
  // once, and takes the code out of the address so a reload does not repeat
  // it. A refusal ("not yet", "not this room") shows under the next step.
  const meetRef = useRef(meetParam())
  const [meetNote, setMeetNote] = useState(null)
  const activeKey = session.data?.nightId === nightId && session.data?.status === 'active' ? session.data.guestKey : null
  useEffect(() => {
    const cat = meetRef.current
    if (!cat || !activeKey || !nightId) return
    meetRef.current = null
    try { const u = new URL(window.location.href); u.searchParams.delete('meet'); window.history.replaceState(null, '', u) } catch { /* the address stays; harmless */ }
    callMeet({ nightId, cat }).then(() => setMeetNote(null)).catch(e => setMeetNote(troubleLine(e, 'The cat did not answer. Try the code again.')))
  }, [activeKey, nightId])

  // Off the network, or the house has not confirmed the night for twenty
  // seconds (a dead LAN looks exactly like this): say so, and since when.
  const stale = night.loaded && isStale(night)
  const offline = !online || stale
  const banner = offline ? <Offline ui={ui} seconds={secondsSinceHeard(night)} /> : null

  if (authError) return <Moment text={ui.OFFLINE} />
  if (!uid || !active.loaded) return <Dark />
  if (!nightId) return <Moment text={ui.DOORS} crest foot={<StartNight ui={ui} />} />
  if (!night.loaded && !night.data) return <Dark />
  const n = night.data
  if (!n) return <Moment text={ui.DOORS} crest foot={<StartNight ui={ui} />} />
  // a rehearsal night: the red band across the top of every screen from here on, except in the dark
  const band = <RehearsalBand on={showRehearsalBand(n)} />

  const s = session.data && session.data.nightId === nightId ? session.data : null
  // The character was taken by another phone. Not a dead end: tap your name
  // to bring it back here, or type another name to join as someone else.
  if (s?.status === 'superseded') return <>{band}{banner}<Join night={n} ui={ui} notice={ui.SUPERSEDED} /></>
  if (!s || s.status !== 'active') return <>{band}{banner}<Join night={n} ui={ui} /></>

  // The blackout, and a pause taken during it, keep every phone near-black.
  // Then the power returns (the cue list, 25 Oct 2026): one button, "Sorry
  // for the interruption, continue here"; then the role card for fifteen
  // seconds on the server's clock, with no button; then the main page on its
  // own (lib/night.js showsPrompt and promptStage). A pause taken during it
  // keeps the screen up on the frozen clock, so nothing bright appears in the
  // dark room either way. Until this phone's notes have loaded the screen
  // stays dark rather than flash the button at a phone that already tapped.
  if (isDark(n)) return <Blackout />
  const clock = clockFor(n, serverNow)
  if (showsPrompt(n, notes, clock)) {
    if (!notesDoc.loaded) return <Blackout />
    return <Prompt uid={uid} night={n} ui={ui} serverNow={clock} promptKey={promptKeyOf(n)} stage={promptStage(n, notes, clock)} card={roleCard(s)} notes={notes} />
  }

  // The permissions screen (§9.10): once per night, before the tour, never
  // over the dark. A phone that allowed already keeps its screen awake.
  if (notesDoc.loaded && !notes.seen.allow && wantsWelcome(n, { byNight: {} }, nightId)) {
    return <>{band}<Allow uid={uid} /></>
  }

  // Getting started: the first time this phone has a character on this
  // night, whatever the act, and on request from the You tab.
  if (tour || (notesDoc.loaded && wantsWelcome(n, notesDoc.data, nightId))) {
    return <>{band}<Welcome uid={uid} session={s} content={content.data} ui={ui} onDone={() => setTour(false)} /></>
  }

  // Every phone lights up at once: questions, the deduction round, the ballot.
  // Where each shows is lib/night.js placement: a Parlour Game on top of the
  // screen, the deduction round as the screen, the ballot as a card on Now.
  // During a pause the clock stands still at the moment of the pause, so an
  // open window stays on screen, disabled, until the host resumes.
  const paused = n.phase === 'paused'
  const w = openWindow(n, s, clock)
  const where = placement(w)
  let screen = null
  if (w && sent !== w.id && where !== 'card') {
    const done = () => setSent(w.id)
    if (w.kind === 'questions') screen = <Questions w={w} nightId={nightId} serverNow={clock} onDone={done} />
    if (w.kind === 'eliminate') screen = <Eliminate w={w} night={n} session={s} content={content.data} nightId={nightId} serverNow={clock} onDone={done} />
  }
  const held = screen && paused ? <><PausedStrip ui={ui} /><div className="paused-shell" inert>{screen}</div></> : screen
  const over = Boolean(screen) && where === 'overlay'
  if (screen && !over) return <>{band}{banner}{held}</>

  // A Parlour Game sits on top of the screen the phone was on, which stays
  // mounted underneath (inert, hidden from screen readers) and comes back
  // exactly as it was when the game is done. A pause with the ballot card up
  // keeps the card on screen like any other paused window (25 Oct 2026): the
  // page goes inert under the strip, and the frozen clock holds its bar still.
  const heldCard = paused && where === 'card'
  const top = over ? <div className="overlay" role="dialog" aria-modal="true" aria-label={w.title || 'Parlour Game'}>{held}</div> : null
  const strip = heldCard ? <PausedStrip ui={ui} /> : null
  if (paused && !over && !heldCard) return <>{band}{banner}<Moment text={ui.PAUSED} crest /></>

  // The ballot (Act 7; a card since 25 Oct 2026, Jon's cue list, cue 19) goes
  // down to Rest for the Now tab, with every tab reachable: the window, whether
  // this phone has sent its three (a small card then, until the session has
  // its ballot and the window closes for it), the tap that says it has, the
  // clock (the server's, frozen in a pause: the one that opened the window,
  // so the card's bar and the window agree), and the picks so far (above).
  const ballot = where === 'card'
    ? { w, sent: sent === w.id, onDone: () => setSent(w.id), clock, draft: draft?.id === w.id ? draft : null, onDraft: (d) => setDraft({ id: w.id, ...d }) }
    : null

  // Act 7's locks (lib/night.js phoneLock and lockFor, cues 20 to 23): eyes on
  // the screen through the reveal, this phone's result with a thank-you through
  // the credits, then The End opens the phone up for good (the tabs back, the
  // result kept on Now). The two host phones keep their tabs through the first
  // two: the Host tab names the three and presses Next. The locks come before
  // the drawing's screens: by Act 7 the drawing is long done.
  const lock = lockFor(n, s)

  // The relay drawing (Act 6): while it runs, every phone is its surface, from
  // Sir Irwin's slides on (the intro says to be in the Parlour, cue 16), except
  // the two host phones during the slides, which keep their tabs (Pause and
  // Start the drawing live on the Host tab; the drawing's own controls come
  // with the first walk). Never once the night is over: The End opens on Now,
  // even for a phone that never put the door card away.
  const r = relay.data
  const doneKey = r?.state === 'done' ? `relay-${ms(r.startedAt)}` : null
  const drawing = lock !== 'over' && r && ['intro', 'walk', 'turn', 'vote', 'lockout'].includes(r.state) && !(r.state === 'intro' && s.host)
  let base
  if (lock === 'eyes') {
    base = <EyesLock />
  } else if (lock === 'result') {
    base = <ResultLock card={resultCard(s)} />
  } else if (drawing) {
    base = <Relay uid={uid} night={n} session={s} relay={r} serverNow={serverNow} rules={relayRules(ui['RELAY RULES'])} />
  } else if (lock !== 'over' && doneKey && !notes.seen[doneKey]) {
    base = <RelayDone uid={uid} relay={r} seenKey={doneKey} />
  } else {
    // the cards under the tabs are told whether the night is a rehearsal: their
    // Rehearsal text tag never shows on the party night (Cards.jsx, 29 Oct 2026).
    // Rest is the only way to those cards, so it never goes without this.
    base = <RehearsalNight.Provider value={isRehearsalNight(n)}><Rest uid={uid} night={n} session={s} content={content.data} notes={notes} ui={ui} serverNow={serverNow} onTour={() => setTour(true)} meetNote={meetNote} ballot={ballot} over={lock === 'over'} /></RehearsalNight.Provider>
  }
  return <>{band}{banner}{strip}<div className={over ? 'beneath covered' : heldCard ? 'beneath paused-shell' : 'beneath'} inert={over || heldCard || undefined} aria-hidden={over || undefined}>{base}</div>{top}</>
}
