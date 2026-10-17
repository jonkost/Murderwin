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

// The sound catalogue: one file per id in media/ (media/README.md). This is
// a copy of functions/lib/screen.js SOUND_IDS; a test on each side checks
// the two agree. An id outside it is refused, counted, never played.
export const SOUND_IDS = ['chime-news', 'sounder-bulletin', 'chime-irwin', 'sting-solved', 'sting-door', 'sting-reveal', 'sting-result', 'blackout', 'power']
export function knownSound(id) { return SOUND_IDS.includes(id) }

// Which ids have no file under `dir` (by any accepted extension). The relay
// refuses to start while this is not empty, so a missing file is found at
// the start of the evening, not at the beat.
export function missingSoundFiles(dir, exists, ids = SOUND_IDS) {
  return ids.filter(id => !soundCandidates(dir, id).some(f => exists(f)))
}

// A sound older than this is remembered but not played: a relay started (or
// restarted) an hour into the night must not replay the last cue.
export const SOUND_STALE_MS = 30_000

// What changed since last time. `prev` is the last planned state, not the
// last docs, so a reload that replays the same docs produces nothing.
export function plan(prev, next, now = Date.now()) {
  const actions = []
  const hall = hallColour(next)
  if (hall && hall !== prev.hall) actions.push({ type: 'hall', colour: hall })
  const soundId = next.sounds?.current?.id ?? null
  const soundAt = stamp(next.sounds?.current?.at)
  const key = soundId ? `${soundId}@${soundAt}` : null
  const fresh = !soundAt || now - soundAt < SOUND_STALE_MS
  // an unknown id is refused once (counted, never named in the log); a known one plays
  if (key && key !== prev.sound && fresh) actions.push(knownSound(soundId) ? { type: 'sound', id: soundId } : { type: 'refused', count: 1 })
  return { actions, state: { hall: hall ?? prev.hall ?? null, sound: key ?? prev.sound ?? null } }
}

function stamp(t) {
  if (!t) return 0
  if (typeof t.toMillis === 'function') return t.toMillis()
  if (t instanceof Date) return t.getTime()
  return Number(t) || 0
}

// The relay's heartbeat row, so the Host tab can show it alive: the same
// shape every phone writes to presence/{uid} (firestore.rules allows exactly
// these keys), with the guest key 'cues'. The caller adds `at` as a server
// timestamp. Written once a minute.
export const PRESENCE_KEY = 'cues'
export const PRESENCE_MS = 60_000
export function presenceRow(nightId) {
  return { nightId: nightId ?? null, guestKey: PRESENCE_KEY }
}

// Sound files are named after the event id, nothing else. First match wins.
export const SOUND_EXTENSIONS = ['m4a', 'mp3', 'wav', 'aiff']
export function soundCandidates(dir, id) {
  const clean = String(id ?? '').replace(/[^A-Za-z0-9_-]/g, '')
  if (!clean) return []
  return SOUND_EXTENSIONS.map(ext => `${dir}/${clean}.${ext}`)
}

// KEY=value lines from a .env file. A trailing space or a pair of quotes
// around the value (as pasted from curl's output) is forgiven.
export function parseEnv(text) {
  const out = {}
  for (const line of String(text ?? '').split('\n')) {
    const m = /^\s*([A-Z_]+)\s*=\s*(.*)$/.exec(line)
    if (m && !line.trim().startsWith('#')) out[m[1]] = m[2].trim().replace(/^(["'])(.*)\1$/, '$2')
  }
  return out
}

// The bridge address, checked once at start so a bad .env says so in words.
export function bridgeHostProblem(host) {
  if (!host) return 'HUE_BRIDGE_HOST is not set'
  try { new URL(`https://${host}/`) } catch { return `HUE_BRIDGE_HOST "${host}" is not an address` }
  return null
}
