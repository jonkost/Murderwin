import { useMemo, useState } from 'react'
import { useAuthUid, useDoc, useServerClock, useOnline, useTick } from './lib/hooks'
import { uiLines } from './lib/content'
import { cardsOf, openWindow } from './lib/night'
import Join from './screens/Join'
import Rest from './screens/Rest'
import Welcome from './screens/Welcome'
import { Questions, Ballot, Eliminate } from './screens/Windows'
import { Dark, Moment, Blackout, Prompt } from './screens/Moments'
import { StartNight } from './screens/Host'
import Relay, { RelayDone, ms } from './screens/Relay'

// One page. What a phone shows is a pure function of three documents:
// the active night (public), this phone's session (private), and this
// phone's notes. Every transition is driven by the server; nothing here
// counts down on its own.
export default function App() {
  const { uid, error: authError } = useAuthUid()
  const active = useDoc(uid ? 'public_state/active' : null)
  const nightId = active.data?.nightId ?? null
  const night = useDoc(nightId ? `nights/${nightId}` : null)
  const content = useDoc(nightId ? `nights/${nightId}/public/content` : null)
  const session = useDoc(uid ? `sessions/${uid}` : null)
  const notes = useDoc(uid ? `notes/${uid}` : null)
  const relay = useDoc(nightId ? `nights/${nightId}/public/relay` : null)
  const serverNow = useServerClock(uid, nightId, session.data?.guestKey)
  const online = useOnline()
  const ui = useMemo(() => uiLines(content.data), [content.data])
  const [tour, setTour] = useState(false)
  const [sent, setSent] = useState(null) // a window just answered, until the session catches up
  useTick(1000) // windows close on the server's clock; re-check once a second

  const offline = !online || (night.loaded && night.fromCache && !online)
  const banner = offline ? <div className="offline" role="status">{ui.OFFLINE}</div> : null

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
  if (!s) return <>{banner}<Join night={n} ui={ui} /></>

  // Getting started: the first time this phone has a character, and on request.
  if (tour || (notes.loaded && !notes.data?.seen?.welcome && n.act <= 1)) {
    return <Welcome uid={uid} session={s} content={content.data} ui={ui} onDone={() => setTour(false)} />
  }

  if (n.phase === 'paused') return <>{banner}<Moment text={ui.PAUSED} crest /></>
  if (n.phase === 'blackout') return <Blackout />
  const promptKey = `prompt-${n.act}`
  if (n.phase === 'prompt' && !notes.data?.seen?.[promptKey]) {
    const role = cardsOf(s).find(c => c.kind === 'role')
    return <Prompt uid={uid} night={n} ui={ui} serverNow={serverNow} promptKey={promptKey} card={role} />
  }

  // Every phone lights up at once: questions, the deduction round, the ballot.
  const w = openWindow(n, s, serverNow)
  if (w && sent !== w.id) {
    const done = () => setSent(w.id)
    if (w.kind === 'questions') return <Questions w={w} nightId={nightId} serverNow={serverNow} onDone={done} />
    if (w.kind === 'ballot') return <Ballot w={w} night={n} session={s} content={content.data} nightId={nightId} serverNow={serverNow} onDone={done} />
    if (w.kind === 'eliminate') return <Eliminate w={w} night={n} session={s} content={content.data} nightId={nightId} serverNow={serverNow} onDone={done} />
  }

  // The relay drawing (Act 6): while it runs, every phone is its surface.
  const r = relay.data
  if (r && ['walk', 'turn', 'vote', 'lockout'].includes(r.state)) {
    return <>{banner}<Relay uid={uid} night={n} session={s} relay={r} serverNow={serverNow} /></>
  }
  const doneKey = r?.state === 'done' ? `relay-${ms(r.startedAt)}` : null
  if (doneKey && !notes.data?.seen?.[doneKey]) return <RelayDone uid={uid} relay={r} seenKey={doneKey} />
  return <>{banner}<Rest uid={uid} night={n} session={s} content={content.data} notes={notes.data} ui={ui} serverNow={serverNow} onTour={() => setTour(true)} /></>
}
