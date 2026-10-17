// The cue planner. Pure: given what the public docs said before and what
// they say now, return the cues to perform. The relay stays blind: it knows
// "hall is green" and "play sound 7F3A", never what either means.
//
// Inputs are the public docs any phone may read:
//   cues   nights/{id}/public/cues    { hall: 'red'|'green', changedAt }
//   relay  nights/{id}/public/relay   { doorOpen: boolean, ... }
//   sounds nights/{id}/public/sounds  { current: { id, at } }

export function hallColour({ cues, relay } = {}) {
  if (cues?.hall === 'green' || relay?.doorOpen) return 'green'
  if (cues?.hall === 'red') return 'red'
  return null
}

// What changed since last time. `prev` is the last planned state, not the
// last docs, so a reload that replays the same docs produces nothing.
export function plan(prev, next) {
  const actions = []
  const hall = hallColour(next)
  if (hall && hall !== prev.hall) actions.push({ type: 'hall', colour: hall })
  const soundId = next.sounds?.current?.id ?? null
  const soundAt = stamp(next.sounds?.current?.at)
  const key = soundId ? `${soundId}@${soundAt}` : null
  if (key && key !== prev.sound) actions.push({ type: 'sound', id: soundId })
  return { actions, state: { hall: hall ?? prev.hall ?? null, sound: key ?? prev.sound ?? null } }
}

function stamp(t) {
  if (!t) return 0
  if (typeof t.toMillis === 'function') return t.toMillis()
  if (t instanceof Date) return t.getTime()
  return Number(t) || 0
}

// Sound files are named after the event id, nothing else. First match wins.
export const SOUND_EXTENSIONS = ['m4a', 'mp3', 'wav', 'aiff']
export function soundCandidates(dir, id) {
  const clean = String(id ?? '').replace(/[^A-Za-z0-9_-]/g, '')
  if (!clean) return []
  return SOUND_EXTENSIONS.map(ext => `${dir}/${clean}.${ext}`)
}
