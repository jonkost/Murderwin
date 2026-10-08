import { useMemo } from 'react'
import { useAuthUid, useDoc, useServerClock, useOnline } from './lib/hooks'
import { uiLines } from './lib/content'
import Join from './screens/Join'
import Rest from './screens/Rest'
import { Dark, Moment, Blackout, Prompt } from './screens/Moments'
import { StartNight } from './screens/Host'

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
  const serverNow = useServerClock(uid, nightId, session.data?.guestKey)
  const online = useOnline()
  const ui = useMemo(() => uiLines(content.data), [content.data])

  const offline = !online || (night.loaded && night.fromCache && !online)
  const banner = offline ? <div className="offline" role="status">{ui.OFFLINE}</div> : null

  if (authError) return <Moment text={ui.OFFLINE} />
  if (!uid || !active.loaded) return <Dark />
  if (!nightId) return <Moment text={ui.DOORS} crest foot={<StartNight ui={ui} />} />
  if (!night.loaded && !night.data) return <Dark />
  const n = night.data
  if (!n) return <Moment text={ui.DOORS} crest foot={<StartNight ui={ui} />} />

  const s = session.data && session.data.nightId === nightId ? session.data : null
  if (s?.status === 'superseded') return <Moment text={ui.SUPERSEDED} crest />
  if (!s) return <>{banner}<Join uid={uid} night={n} ui={ui} /></>

  if (n.phase === 'paused') return <>{banner}<Moment text={ui.PAUSED} crest /></>
  if (n.phase === 'blackout') return <Blackout />
  const promptKey = `prompt-${n.act}`
  if (n.phase === 'prompt' && !notes.data?.seen?.[promptKey]) {
    return <Prompt uid={uid} night={n} ui={ui} serverNow={serverNow} promptKey={promptKey} />
  }
  return <>{banner}<Rest uid={uid} night={n} session={s} content={content.data} notes={notes.data} ui={ui} /></>
}
