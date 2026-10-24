// Apple Music on the brain, through the Mac's own scripting (osascript,
// "tell application Music"). A thin wrapper: what to play and when is
// decided by lib/scenes.js; this file only does it.
//
//   play({ name, volume })  that playlist, on shuffle and repeat, at its volume
//                           (already playing it: left alone; paused on it: resumed)
//   pause()                 stop the music (Music is never opened just to pause it)
//   duck() / unduck()       Music's own volume down to a whisper under a cue
//                           sound, and back to the playlist's volume after
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
  pause: [
    'if application "Music" is not running then return "not running"',
    'tell application "Music" to pause',
    'return "paused"',
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
      if (fake) { log(`[music] would play ${name}${ducked ? ' (at a whisper under a cue)' : ''}`); return }
      const r = await run(SCRIPTS.play, [String(level), ...playlistNames(name)])
      if (r === 'missing') log(`[music] no playlist called "${name}" in Music; make it on the brain (docs/cues-relay.md)`)
      else if (r === 'playing') log(`[music] ${name}`)
      else if (r === 'resumed') log(`[music] ${name}, carrying on`)
    })
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

  return { play, pause, duck, unduck, ducked: () => ducked, idle: () => chain }
}
