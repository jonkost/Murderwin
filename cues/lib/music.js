// Apple Music on the brain, through the Mac's own scripting (osascript,
// "tell application Music"). A thin wrapper: what to play and when is
// decided by lib/scenes.js; this file only does it.
//
//   play({ name, volume })  that playlist, on shuffle and repeat, at its volume
//                           (already playing it: left alone, at the new volume;
//                           paused on it: resumed)
//   playTrack({ name, volume })  one song from the Music library (Cake!, 25 Oct
//                           2026): shuffle and repeat off, so it plays once
//   nowPlaying()            { playing, track } from Music, or null when Music
//                           cannot be read (the end-of-track poll)
//   followTrack(...)        resolves when that song has ended (the poll), or
//                           after `seconds` when Music cannot be read
//   pause()                 stop the music (Music is never opened just to pause it)
//   duck() / unduck()       Music's own volume down to a whisper under a cue
//                           sound, and back to the playlist's volume after
//   speakers()              [{ name, on, kind }] for every AirPlay speaker Music sees
//   hasTrack(name)          true or false: is that song in the library? null
//                           when Music cannot be asked
//   toHomePods({ names, volume })  the Music app plays through those AirPlay
//                           speakers (none named: every HomePod it can see) and
//                           not through the Mac: 'set', 'none' (no such speaker
//                           is there) or 'failed'. For the cake's song, 11 Nov 2026
//   releaseSpeakers()       the Music app lets go of them: back to the Mac's own
//                           speakers, so the HomePods can take their own music again
//
// Commands run one at a time, in order. A failure (no permission yet, a
// playlist that is not there, Music not answering) logs one plain line and
// never stops the relay; the same line is not repeated within a minute.
// The first command asks macOS for permission to control Music: one click
// on the hardware evening (docs/cues-relay.md).

import { execFile } from 'node:child_process'

// The scripts. Arguments arrive in argv: never pasted into the script text.
export const SCRIPTS = {
  // argv: volume, then the playlist's name and the spellings to try after it
  play: [
    'on run argv',
    'set vol to (item 1 of argv) as integer',
    'set names to rest of argv',
    'tell application "Music"',
    'set found to missing value',
    'repeat with n in names',
    'if exists playlist (n as text) then',
    'set found to playlist (n as text)',
    'exit repeat',
    'end if',
    'end repeat',
    'if found is missing value then return "missing"',
    'set sound volume to vol',
    'set wanted to name of found',
    'try',
    'if name of current playlist is wanted then',
    'if player state is playing then return "already"',
    'if player state is paused then',
    'play',
    'return "resumed"',
    'end if',
    'end if',
    'end try',
    'set shuffle enabled to true',
    'set song repeat to all',
    'play found',
    'return "playing"',
    'end tell',
    'end run',
  ],
  // argv: volume, then the song's exact name: the first track in the library
  // with that name, played once (shuffle off, repeat off), the one Cake! wants
  track: [
    'on run argv',
    'set vol to (item 1 of argv) as integer',
    'set songName to (item 2 of argv) as text',
    'tell application "Music"',
    'try',
    'set t to (first track whose name is songName)',
    'on error',
    'return "missing"',
    'end try',
    'set sound volume to vol',
    'set shuffle enabled to false',
    'set song repeat to off',
    'play t',
    'return "playing"',
    'end tell',
    'end run',
  ],
  // what Music is doing now: "stopped", or "playing" and the current track's name
  nowPlaying: [
    'if application "Music" is not running then return "not running"',
    'tell application "Music"',
    'if player state is not playing then return "stopped"',
    'try',
    'return "playing" & tab & (name of current track)',
    'on error',
    'return "playing" & tab',
    'end try',
    'end tell',
  ],
  pause: [
    'if application "Music" is not running then return "not running"',
    'tell application "Music" to pause',
    'return "paused"',
  ],
  // every AirPlay speaker Music sees: name, tab, true or false (is it ticked),
  // tab, its kind (computer, HomePod, Apple TV...), one a line
  speakers: [
    'set out to ""',
    'tell application "Music"',
    'repeat with d in AirPlay devices',
    'set k to "unknown"',
    'try',
    'set k to (kind of d) as text',
    'end try',
    'set out to out & (name of d) & tab & ((selected of d) as text) & tab & k & linefeed',
    'end repeat',
    'end tell',
    'return out',
  ],
  // argv: the song's exact name. "yes" or "no": is it in the library?
  hasTrack: [
    'on run argv',
    'set songName to (item 1 of argv) as text',
    'tell application "Music"',
    'try',
    'set t to (first track whose name is songName)',
    'return "yes"',
    'on error',
    'return "no"',
    'end try',
    'end tell',
    'end run',
  ],
  // argv: volume, then the speakers' names in Music's AirPlay list (none
  // named: every HomePod Music can see). Ticks each one that is there and
  // sets its volume, then unticks every other speaker, the Mac's own among
  // them, so the song plays on those alone. The ticking comes first: Music
  // will not untick its last speaker. "none" when not one of them is there
  // (nothing is changed then); else "set", tab, how many.
  toHomePods: [
    'on run argv',
    'set vol to (item 1 of argv) as integer',
    'set wanted to rest of argv',
    'set picked to {}',
    'tell application "Music"',
    'repeat with d in AirPlay devices',
    'set n to (name of d) as text',
    'set pick to false',
    'if (count of wanted) is 0 then',
    'if (kind of d) is HomePod then set pick to true',
    'else',
    'if wanted contains n then set pick to true',
    'end if',
    'if pick then',
    'try',
    'set selected of d to true',
    'set end of picked to n',
    'end try',
    'end if',
    'end repeat',
    'if (count of picked) is 0 then return "none"',
    'repeat with d in AirPlay devices',
    'set n to (name of d) as text',
    'if picked contains n then',
    'try',
    'set sound volume of d to vol',
    'end try',
    'else',
    'try',
    'set selected of d to false',
    'end try',
    'end if',
    'end repeat',
    'end tell',
    'return "set" & tab & (count of picked)',
    'end run',
  ],
  // back to the Mac's own speakers: tick the computer first, then untick the rest
  releaseSpeakers: [
    'if application "Music" is not running then return "not running"',
    'tell application "Music"',
    'repeat with d in AirPlay devices',
    'if (kind of d) is computer then',
    'try',
    'set selected of d to true',
    'end try',
    'end if',
    'end repeat',
    'repeat with d in AirPlay devices',
    'if (kind of d) is not computer then',
    'try',
    'set selected of d to false',
    'end try',
    'end if',
    'end repeat',
    'end tell',
    'return "released"',
  ],
  // argv: the volume to end on, the number of steps (a short fade)
  fade: [
    'on run argv',
    'set target to (item 1 of argv) as integer',
    'set steps to (item 2 of argv) as integer',
    'if application "Music" is not running then return "not running"',
    'tell application "Music"',
    'set startVol to sound volume',
    'repeat with i from 1 to steps',
    'set sound volume to (startVol + (target - startVol) * i / steps) as integer',
    'delay 0.03',
    'end repeat',
    'set sound volume to target',
    'end tell',
    'return "faded"',
    'end run',
  ],
}

// The playlist's name, then easier spellings of its middle dot, so a
// playlist typed "Murderwin - Arrival" is found too.
export function playlistNames(name) {
  const n = String(name ?? '').trim()
  const out = [n]
  if (n.includes('·')) for (const sep of [' - ', ' – ', ': ', ' ']) out.push(n.replace(/\s*·\s*/g, sep))
  return [...new Set(out.filter(Boolean))]
}

// osascript's error, in words for Jon.
export function musicProblem(err) {
  const t = String(err?.message ?? err ?? '')
  if (/-1743|not authori[sz]ed/i.test(t)) return 'the Mac has not let the relay control Music yet: System Settings, Privacy & Security, Automation, then tick Music under Terminal'
  if (/ENOENT/.test(t)) return 'osascript is not here (this is not a Mac): no music'
  if (/-600|isn.t running/i.test(t)) return 'Music is not running and would not open'
  return 'Music did not answer; the music carries on as it was'
}

// osascript -e line -e line … arg arg; resolves its output, trimmed.
export function runOsascript(lines, args = [], { execFileImpl = execFile, timeoutMs = 15_000 } = {}) {
  return new Promise((resolve, reject) => {
    const argv = [...lines.flatMap(l => ['-e', l]), ...args.map(String)]
    execFileImpl('osascript', argv, { timeout: timeoutMs }, (err, stdout, stderr) => {
      if (err) reject(new Error(String(stderr || err.message || err)))
      else resolve(String(stdout ?? '').trim())
    })
  })
}

export const FADE_STEPS = { down: 8, up: 20 }

export function createMusic({ run = runOsascript, fake = false, log = () => {}, whisper = 10, now = () => Date.now() } = {}) {
  let ducked = false
  let volume = null     // the volume of the playlist the relay last put on
  let chain = Promise.resolve()
  let lastProblem = ''
  let lastProblemAt = -Infinity

  function problem(e) {
    const line = `[music] ${musicProblem(e)}`
    if (line === lastProblem && now() - lastProblemAt < 60_000) return
    lastProblem = line; lastProblemAt = now()
    log(line)
  }
  function enqueue(fn) {
    chain = chain.then(fn).catch(problem)
    return chain
  }

  function play({ name, volume: v }) {
    volume = v
    return enqueue(async () => {
      const level = ducked ? Math.min(whisper, v) : v
      if (fake) { log(`[music] would play ${name} at ${v}${ducked ? ' (at a whisper under a cue)' : ''}`); return }
      const r = await run(SCRIPTS.play, [String(level), ...playlistNames(name)])
      if (r === 'missing') log(`[music] no playlist called "${name}" in Music; make it on the brain (docs/cues-relay.md)`)
      else if (r === 'playing') log(`[music] ${name} at ${v}`)
      else if (r === 'resumed') log(`[music] ${name}, carrying on at ${v}`)
      else if (r === 'already') log(`[music] ${name}, volume ${v}`) // the same playlist at a new level (jazz to jazzLow, intense 35 to 60)
    })
  }

  // One song from the library, once (Cake!). Resolves 'playing', 'missing'
  // or 'failed'; the caller then follows it to its end (followTrack).
  function playTrack({ name, volume: v }) {
    volume = v
    return enqueue(async () => {
      const level = ducked ? Math.min(whisper, v) : v
      if (fake) { log(`[music] would play the song ${name} at ${v}, once`); return 'playing' }
      const r = await run(SCRIPTS.track, [String(level), String(name)])
      if (r === 'missing') { log(`[music] no song called "${name}" in the Music library; add it on the brain (docs/cues-relay.md)`); return 'missing' }
      log(`[music] the song ${name} at ${v}`)
      return 'playing'
    }).then(r => r ?? 'failed', () => 'failed')
  }

  // What Music is doing: { playing: boolean, track: name | null }, or null
  // when it cannot be read (no permission, not a Mac). Never logged by name.
  function nowPlaying() {
    if (fake) return Promise.resolve(null)
    return run(SCRIPTS.nowPlaying).then(r => {
      if (r === 'not running' || r === 'stopped') return { playing: false, track: null }
      if (r.startsWith('playing')) return { playing: true, track: r.split('\t')[1] || null }
      return null
    }, () => null)
  }

  function pause() {
    return enqueue(async () => {
      if (fake) { log('[music] would stop'); return }
      const r = await run(SCRIPTS.pause)
      if (r === 'paused') log('[music] stopped')
    })
  }

  function duck() {
    if (ducked) return chain
    ducked = true
    return enqueue(async () => {
      if (fake || !ducked) return
      await run(SCRIPTS.fade, [String(whisper), String(FADE_STEPS.down)])
    })
  }

  function unduck() {
    if (!ducked) return chain
    ducked = false
    return enqueue(async () => {
      if (fake || ducked || volume === null) return
      await run(SCRIPTS.fade, [String(volume), String(FADE_STEPS.up)])
    })
  }

  function speakers() {
    if (fake) return Promise.resolve([])
    return run(SCRIPTS.speakers).then(parseSpeakers)
  }

  // Is that song in the library? true, false, or null when Music cannot be
  // asked (no permission, not a Mac). The song is never named in a line.
  function hasTrack(name) {
    if (fake) return Promise.resolve(true)
    return run(SCRIPTS.hasTrack, [String(name)]).then(r => (r === 'yes' ? true : r === 'no' ? false : null), () => null)
  }

  // The Music app onto the HomePods (the cake's song, 11 Nov 2026: "on all
  // HomePods"). `names`: speakers by their names in Music's AirPlay list, or
  // none for every HomePod it can see. Resolves 'set', 'none' or 'failed';
  // on anything but 'set' the song plays where Music was already playing.
  function toHomePods({ names = [], volume: v = 60 } = {}) {
    return enqueue(async () => {
      if (fake) { log('[music] would send the song to the HomePods'); return 'set' }
      const r = await run(SCRIPTS.toHomePods, [String(v), ...names.map(String)])
      if (r.startsWith('set')) { log(`[music] the Music app is playing through ${Number(r.split('\t')[1]) || 0} HomePod${Number(r.split('\t')[1]) === 1 ? '' : 's'}`); return 'set' }
      log(names.length
        ? '[music] none of the speakers named for the cake (cues/scenes.json cake.speakers) is in Music\'s AirPlay list; npm start -- --speakers lists them. The song plays from this Mac'
        : '[music] the Music app can see no HomePod; npm start -- --speakers lists what it sees. The song plays from this Mac')
      return 'none'
    }).then(r => r ?? 'failed', () => 'failed')
  }

  function releaseSpeakers() {
    return enqueue(async () => {
      if (fake) { log('[music] would let go of the HomePods'); return 'released' }
      const r = await run(SCRIPTS.releaseSpeakers)
      if (r === 'released') log('[music] the Music app has let go of the HomePods')
      return r
    }).then(r => r ?? 'failed', () => 'failed')
  }

  return { play, playTrack, nowPlaying, pause, duck, unduck, speakers, hasTrack, toHomePods, releaseSpeakers, ducked: () => ducked, idle: () => chain }
}

// Music's AirPlay list, from the speakers script: [{ name, on, kind }].
export function parseSpeakers(text) {
  return String(text ?? '').split('\n').map(l => l.split('\t')).filter(([n]) => n && n.trim()).map(([name, sel, kind]) => ({ name: name.trim(), on: String(sel).trim() === 'true', kind: String(kind ?? '').trim() || 'unknown' }))
}

// Follow one song to its end (Cake!, 25 Oct 2026). Once a second, ask Music
// what is playing; the song is over when Music has stopped or moved on to
// another track. When Music cannot be read (`nowPlaying` gives null), or the
// song was missing or never started, the song is taken to run `seconds`:
// one plain line says so. Resolves { why: 'ended' | 'timer' } once, never
// before `minMs` (so a song that takes a moment to start is not taken for
// one that has ended). `timers` is { setTimeout, clearTimeout } for the tests.
export const TRACK_POLL_MS = 1000
export const TRACK_MIN_MS = 3000
export function followTrack({ name, seconds = 75, started = 'playing', nowPlaying, log = () => {}, intervalMs = TRACK_POLL_MS, minMs = TRACK_MIN_MS, timers = { setTimeout, clearTimeout }, now = () => Date.now() } = {}) {
  const limitMs = Math.max(0, Number(seconds) || 0) * 1000
  return new Promise(resolve => {
    const t0 = now()
    let done = false
    let pollTimer = null
    const finish = (why) => {
      if (done) return
      done = true
      timers.clearTimeout(pollTimer); timers.clearTimeout(limitTimer)
      resolve({ why })
    }
    const limitTimer = timers.setTimeout(() => finish('timer'), limitMs)
    if (started !== 'playing') {
      log(`[music] the song did not start; the sheet comes back after ${Math.round(limitMs / 1000)} seconds`)
      return // the timer alone ends it
    }
    let saidBlind = false
    const poll = async () => {
      if (done) return
      const state = await nowPlaying()
      if (done) return
      if (state === null) {
        if (!saidBlind) { saidBlind = true; log(`[music] Music cannot be read while the song plays; the sheet comes back after ${Math.round(limitMs / 1000)} seconds`) }
      } else if (now() - t0 >= minMs && (!state.playing || (state.track !== null && state.track !== name))) {
        finish('ended'); return
      }
      pollTimer = timers.setTimeout(poll, intervalMs)
    }
    pollTimer = timers.setTimeout(poll, intervalMs)
  })
}
