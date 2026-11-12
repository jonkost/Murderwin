import { useEffect } from 'react'
import { NO_CUES_YET, cueKeyOf, cueStep, loadCueFiles, playCue } from './cueSounds'

// The hook that makes a page one of the house's speakers (handoff 11 Nov
// 2026, A2 layer 1). Give it the live view of nights/{id}/public/sounds
// (lib/hooks.js useDoc: { data, loaded }) and the server's clock, and the
// page plays each cue the moment the night calls it: every phone (App.jsx)
// and every room screen (Kiosk.jsx Bell). The rules of when are pure and
// live in lib/cueSounds.js (cueStep and cueDue), where the tests can run them.
//
//   silent  this page never makes a cue's sound (the brain's own browser,
//           a Mac's second display); it still keeps track
//   tv      the Parlour TV: a cue whose recordings it plays as video is not
//           chimed over its own film
//   scope   the night's id: a new night starts from scratch
//
// What the page remembers is kept for the whole page, not for one mount, so
// a cue can never sound twice on one page.
let memory = NO_CUES_YET

export function useCueSounds(view, serverNow, { silent = false, tv = false, scope = null } = {}) {
  const loaded = !!view?.loaded
  const key = cueKeyOf(view?.data)
  // the cue files, once a page: fetched now so they are ready when the first cue comes
  useEffect(() => {
    if (!silent) loadCueFiles({ base: import.meta.env?.BASE_URL ?? '/play/' }).catch(() => {})
  }, [silent])
  useEffect(() => {
    const step = cueStep(memory, { loaded, sounds: view?.data ?? null, scope, now: serverNow(), silent, tv })
    memory = step.memory
    if (step.due) playCue(step.due.id, { waitMs: step.due.waitMs })
  }, [key, loaded, scope])
}
