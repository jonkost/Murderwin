import { useEffect, useMemo, useRef, useState } from 'react'
import { callMeet } from './firebase'
import { useAuthUid, useDoc, useServerClock, useOnline, useTick, setNotesNight, handoverReset, lastHandoverSeen, isStale, secondsSinceHeard } from './lib/hooks'
import { uiLines } from './lib/content'
import { relayRules } from './lib/screen'
import { clockFor, effectivePhase, isDark, meetParam, needsHandoverReset, notesFor, openWindow, overlays, presenceKey, roleCard, showRehearsalBand, wantsWelcome } from './lib/night'
import Join from './screens/Join'
import Rest from './screens/Rest'
import Welcome from './screens/Welcome'
import { Questions, Ballot, Eliminate } from './screens/Windows'
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
  useTick(1000) // windows close on the server's clock; re-check once a second

  // Notes are kept per night: a phone that rehearsed starts the party clean.
  useEffect(() => { setNotesNight(nightId) }, [nightId])
  const notes = useMemo(() => notesFor(notesDoc.data, nightId), [notesDoc.data, nightId])

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
    callMeet({ nightId, cat }).then(() => setMeetNote(null)).catch(e => setMeetNote(e?.message || 'The cat did not answer. Try the code again.'))
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
  // A pause taken during the role prompt keeps the prompt up on the frozen
  // clock, so nothing bright appears in the dark room either way.
  if (isDark(n)) return <Blackout />
  const promptKey = `prompt-${n.act}`
  if (effectivePhase(n) === 'prompt' && !notes.seen[promptKey]) {
    return <Prompt uid={uid} night={n} ui={ui} serverNow={clockFor(n, serverNow)} promptKey={promptKey} card={roleCard(s)} notes={notes} />
  }

  // Getting started: the first time this phone has a character on this
  // night, whatever the act, and on request from the You tab.
  if (tour || (notesDoc.loaded && wantsWelcome(n, notesDoc.data, nightId))) {
    return <>{band}<Welcome uid={uid} session={s} content={content.data} ui={ui} onDone={() => setTour(false)} /></>
  }

  // Every phone lights up at once: questions, the deduction round, the ballot.
  // During a pause the clock stands still at the moment of the pause, so an
  // open window stays on screen, disabled, until the host resumes.
  const paused = n.phase === 'paused'
  const clock = clockFor(n, serverNow)
  const w = openWindow(n, s, clock)
  let screen = null
  if (w && sent !== w.id) {
    const done = () => setSent(w.id)
    if (w.kind === 'questions') screen = <Questions w={w} nightId={nightId} serverNow={clock} onDone={done} />
    if (w.kind === 'ballot') screen = <Ballot w={w} night={n} session={s} content={content.data} nightId={nightId} serverNow={clock} onDone={done} />
    if (w.kind === 'eliminate') screen = <Eliminate w={w} night={n} session={s} content={content.data} nightId={nightId} serverNow={clock} onDone={done} />
  }
  const held = screen && paused ? <><PausedStrip ui={ui} /><div className="paused-shell" inert>{screen}</div></> : screen
  const over = Boolean(screen) && overlays(w)
  if (screen && !over) return <>{band}{banner}{held}</>

  // A Parlour Game sits on top of the screen the phone was on, which stays
  // mounted underneath (inert, hidden from screen readers) and comes back
  // exactly as it was when the game is done.
  const top = over ? <div className="overlay" role="dialog" aria-modal="true" aria-label={w.title || 'Parlour Game'}>{held}</div> : null
  if (paused && !over) return <>{band}{banner}<Moment text={ui.PAUSED} crest /></>

  // The relay drawing (Act 6): while it runs, every phone is its surface.
  const r = relay.data
  const doneKey = r?.state === 'done' ? `relay-${ms(r.startedAt)}` : null
  let base
  if (r && ['walk', 'turn', 'vote', 'lockout'].includes(r.state)) {
    base = <Relay uid={uid} night={n} session={s} relay={r} serverNow={serverNow} rules={relayRules(ui['RELAY RULES'])} />
  } else if (doneKey && !notes.seen[doneKey]) {
    base = <RelayDone uid={uid} relay={r} seenKey={doneKey} />
  } else {
    base = <Rest uid={uid} night={n} session={s} content={content.data} notes={notes} ui={ui} serverNow={serverNow} onTour={() => setTour(true)} meetNote={meetNote} />
  }
  return <>{band}{banner}<div className={over ? 'beneath covered' : 'beneath'} inert={over || undefined} aria-hidden={over || undefined}>{base}</div>{top}</>
}
