import { useEffect, useMemo, useState } from 'react'
import { useAuthUid, useDoc, useServerClock, useOnline, useTick, setNotesNight, handoverReset, lastHandoverSeen, isStale, secondsSinceHeard } from './lib/hooks'
import { uiLines } from './lib/content'
import { clockFor, effectivePhase, isDark, needsHandoverReset, notesFor, openWindow, roleCard, wantsWelcome } from './lib/night'
import Join from './screens/Join'
import Rest from './screens/Rest'
import Welcome from './screens/Welcome'
import { Questions, Ballot, Eliminate } from './screens/Windows'
import { Dark, Moment, Blackout, Prompt, Offline, PausedStrip } from './screens/Moments'
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
  const serverNow = useServerClock(uid, nightId, session.data?.guestKey)
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

  const s = session.data && session.data.nightId === nightId ? session.data : null
  // The character was taken by another phone. Not a dead end: tap your name
  // to bring it back here, or type another name to join as someone else.
  if (s?.status === 'superseded') return <>{banner}<Join night={n} ui={ui} notice={ui.SUPERSEDED} /></>
  if (!s || s.status !== 'active') return <>{banner}<Join night={n} ui={ui} /></>

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
    return <Welcome uid={uid} session={s} content={content.data} ui={ui} onDone={() => setTour(false)} />
  }

  // Every phone lights up at once: questions, the deduction round, the ballot.
  // During a pause the clock stands still at the moment of the pause, so an
  // open window stays on screen, disabled, until the host resumes.
  const paused = n.phase === 'paused'
  const clock = clockFor(n, serverNow)
  const w = openWindow(n, s, clock)
  if (w && sent !== w.id) {
    const done = () => setSent(w.id)
    let screen = null
    if (w.kind === 'questions') screen = <Questions w={w} nightId={nightId} serverNow={clock} onDone={done} />
    if (w.kind === 'ballot') screen = <Ballot w={w} night={n} session={s} content={content.data} nightId={nightId} serverNow={clock} onDone={done} />
    if (w.kind === 'eliminate') screen = <Eliminate w={w} night={n} session={s} content={content.data} nightId={nightId} serverNow={clock} onDone={done} />
    if (screen && paused) return <>{banner}<PausedStrip ui={ui} /><div className="paused-shell" inert>{screen}</div></>
    if (screen) return <>{banner}{screen}</>
  }

  if (paused) return <>{banner}<Moment text={ui.PAUSED} crest /></>

  // The relay drawing (Act 6): while it runs, every phone is its surface.
  const r = relay.data
  if (r && ['walk', 'turn', 'vote', 'lockout'].includes(r.state)) {
    return <>{banner}<Relay uid={uid} night={n} session={s} relay={r} serverNow={serverNow} /></>
  }
  const doneKey = r?.state === 'done' ? `relay-${ms(r.startedAt)}` : null
  if (doneKey && !notes.seen[doneKey]) return <RelayDone uid={uid} relay={r} seenKey={doneKey} />
  return <>{banner}<Rest uid={uid} night={n} session={s} content={content.data} notes={notes} ui={ui} serverNow={serverNow} onTour={() => setTour(true)} /></>
}
