import { useEffect } from 'react'
import { Idle, MemoryRounds, RoomCode } from './Rooms'
import { Living, Bedroom, OneMoment } from './Kiosk'
import { ipadShows } from '../lib/ipad'
import { keepAwake } from '../lib/permissions'
import { addHomeScreenManifest } from '../lib/homescreen'

// The iPad's one page, ?kiosk=ipad (handoff 11 Nov 2026, A10; lib/ipad.js):
// the Library's splash, Zimothy's code, the supper captions, In Duplicate or
// the bedroom, as the night (or the Host tab's row "The iPad shows") says.
// Nothing reloads: each body is the same one its own address shows
// (?kiosk=memory, ?kiosk=bedroom), and the heartbeat stays kiosk-ipad.
// Kiosk.jsx has already drawn the dark (the blackout, the prompt, The End).
export default function IpadScreen({ night, nightId, relay, trace, finale, screen, cues, content, memory, memoryKnown = true, rotation, serverNow }) {
  const show = ipadShows({ night, relay, cues })
  if (show === 'code') return night.phase === 'paused' ? <OneMoment /> : <RoomCode cat="zimothy" />
  if (show === 'memory') return <MemoryRounds board={memory} known={memoryKnown} night={night} nightId={nightId} content={content} rotation={rotation} />
  if (show === 'bedroom') return <Bedroom relay={relay} trace={trace} />
  if (show === 'captions') return <Living night={night} relay={relay} trace={trace} finale={finale} screen={screen} cues={cues} content={content} serverNow={serverNow} nightId={nightId} captionsOnly />
  return <Idle title="The Library" line="" loop="memory" />
}

// Every room screen: the small web manifest (so Add to Home Screen opens the
// page with no bars; only on a room screen, never on a guest's phone), and
// the screen kept awake (the Screen Wake Lock API where the browser has it,
// asked again on the first tap, since some browsers want one, and taken
// again whenever the page comes back into view: lib/permissions.js).
export function useRoomScreenDevice() {
  useEffect(() => {
    addHomeScreenManifest()
    keepAwake().catch(() => {})
    let done = false
    const again = () => {
      if (done) return
      done = true
      keepAwake().catch(() => {})
    }
    window.addEventListener('pointerup', again)
    window.addEventListener('touchend', again)
    return () => { window.removeEventListener('pointerup', again); window.removeEventListener('touchend', again) }
  }, [])
}
