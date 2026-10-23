// The cue planner. Pure: given what the public docs said before and what
// they say now, return the cues to perform. The relay stays blind: it knows
// "hall is green" and "play sound 7F3A", never what either means.
//
// Inputs are the public docs any phone may read:
//   cues   nights/{id}/public/cues    { hall: 'red'|'green', changedAt }
//   relay  nights/{id}/public/relay   { doorOpen: boolean, ... }
//   sounds nights/{id}/public/sounds  { current: { id, at, clips? } }
//     clips: the recordings, as codes on a night with a station key saved
//     (functions/lib/news.js clipCode), as names in a rehearsal without one.

import { createHmac } from 'node:crypto'

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

// The recorded W-O-O-F News lines (media/README.md): a copy of
// functions/lib/news.js CLIP_IDS, checked by a test on this side. A sound may
// carry a list of them, played one after the other once the sound is done.
// A clip with no file is skipped (the words are on the screen as captions),
// so these never stop the relay starting.
export const CLIP_IDS = [
  'newsflash-opening',
  'newsflash-food',
  'newsflash-bathroom',
  'newsflash-screens',
  'newsflash-out-and-about',
  'newsflash-personal-slights',
  'newsflash-signoff',
  'bulletin2-opening',
  'bulletin2-food-1',
  'bulletin2-food-2',
  'bulletin2-food-3',
  'bulletin2-food-4',
  'bulletin2-food-5',
  'bulletin2-bathroom-1',
  'bulletin2-bathroom-2',
  'bulletin2-bathroom-3',
  'bulletin2-bathroom-4',
  'bulletin2-bathroom-5',
  'bulletin2-screens-1',
  'bulletin2-screens-2',
  'bulletin2-screens-3',
  'bulletin2-screens-4',
  'bulletin2-screens-5',
  'bulletin2-out-1',
  'bulletin2-out-2',
  'bulletin2-out-3',
  'bulletin2-out-4',
  'bulletin2-out-5',
  'bulletin2-personal-1',
  'bulletin2-personal-2',
  'bulletin2-personal-3',
  'bulletin2-personal-4',
  'bulletin2-personal-5',
  'bulletin2-signoff',
  'woof-close-studio-open',
  'woof-close-field-murderer',
  'woof-close-field-motive',
  'woof-close-field-victim',
  'woof-close-field-out',
  'woof-close-studio-close',
]
export function knownClip(id) { return CLIP_IDS.includes(id) }

// A recording's code: the first 16 hex characters of HMAC-SHA256(key, clip
// id), the same as functions/lib/news.js clipCode (a test checks they agree).
// The key is the study station key (cues/.env STATION_KEY), the one the host
// saves for the station.
export function clipCode(key, clipId) {
  return createHmac('sha256', String(key)).update(String(clipId)).digest('hex').slice(0, 16)
}

// What a clip on the sounds doc is: a code this relay can map back to one of
// its recordings (with the key), or a plain name (a night with no key saved),
// or nothing it knows (null). Returns the reader the planner uses.
export function clipReader(key = '') {
  const k = String(key ?? '').trim()
  const byCode = new Map(k.length >= 4 ? CLIP_IDS.map(id => [clipCode(k, id), id]) : [])
  return x => byCode.get(x) ?? (knownClip(x) ? x : null)
}

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
// `readClip` turns a clip on the doc into one of CLIP_IDS (clipReader); a
// clip it cannot read is counted (`unknown`), never named.
export function plan(prev, next, now = Date.now(), { readClip = clipReader() } = {}) {
  const actions = []
  const hall = hallColour(next)
  if (hall && hall !== prev.hall) actions.push({ type: 'hall', colour: hall })
  const soundId = next.sounds?.current?.id ?? null
  const soundAt = stamp(next.sounds?.current?.at)
  const sent = next.sounds?.current?.clips ?? []
  const clips = sent.map(readClip).filter(Boolean)
  const unknown = sent.length - clips.length
  const clipsOnly = !soundId && sent.length > 0
  const key = soundId || clipsOnly ? `${soundId ?? 'clips'}@${soundAt}` : null
  const fresh = !soundAt || now - soundAt < SOUND_STALE_MS
  // an unknown id is refused once (counted, never named in the log); a known one plays
  if (key && key !== prev.sound && fresh) {
    const extra = { ...(clips.length ? { clips } : {}), ...(unknown ? { unknown } : {}) }
    if (clipsOnly) actions.push({ type: 'sound', id: null, clips, ...(unknown ? { unknown } : {}) })
    else actions.push(knownSound(soundId) ? { type: 'sound', id: soundId, ...extra } : { type: 'refused', count: 1 })
  }
  return { actions, state: { hall: hall ?? prev.hall ?? null, sound: key ?? prev.sound ?? null } }
}

// The one line the relay's window prints for a cue: counts only, never a
// sound id, a clip id, a code or a file name (the window sits in view all
// night). `sound` is 'ok', 'missing' or null (recordings alone).
export function playLine({ sound = null, recordings = 0, missing = 0, unknown = 0 } = {}) {
  const parts = []
  if (sound) parts.push(sound === 'ok' ? 'sound playing' : 'sound file missing; skipped')
  if (recordings || unknown) {
    let b = `bulletin: ${recordings + unknown} recording${recordings + unknown === 1 ? '' : 's'}`
    if (missing) b += `, ${missing} missing (the screen shows the words)`
    if (unknown) b += `, ${unknown} not recognised (is STATION_KEY in cues/.env the station key?)`
    parts.push(b)
  }
  return `[sound] ${parts.join('; ') || 'nothing to play'}`
}

// How many recordings have a file in `dir`: counts for the start-up line.
export function recordingFiles(dir, exists, ids = CLIP_IDS) {
  return ids.filter(id => soundCandidates(dir, id).some(f => exists(f))).length
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
