// The speaker. One cue at a time: a sound id, then its recordings one after
// the other (a W-O-O-F News bulletin). A newer cue stops the file that is
// playing (kills its afplay) before it starts, so two recordings never talk
// over each other: pressing the next name in the closing bulletin cuts the
// last line off.
//
// The window prints one count-only line per cue (cues.js playLine): never a
// sound id, a clip id or a file name.
//
// `spawn` is node's child_process.spawn (a stand-in in the tests); `exists`
// is fs.existsSync; `fake` logs and plays nothing. `onDone`, per cue, is
// called once when the cue's last file has finished (or at once when there
// is nothing to play), and never for a cue a newer one cut off: the relay
// brings the music back up then.

import { soundCandidates, soundFileFor, playLine } from './cues.js'

export function createPlayer({ mediaDir, exists, spawn, log = () => {}, fake = false } = {}) {
  let sequence = 0
  let current = null // the afplay process that is playing, if any

  function stop() {
    const p = current
    current = null
    if (p) { try { p.kill() } catch { /* already gone */ } }
  }

  function play(id, clips = [], { unknown = 0, onTv = 0, onDone = null } = {}) {
    const mine = ++sequence
    stop()
    const find = x => soundCandidates(mediaDir, x).find(f => exists(f)) ?? null
    // a chime with no file of its own plays the one chime's file (cues.js CHIME_FALLBACK, 25 Oct 2026)
    const found = id ? soundFileFor(mediaDir, id, exists) : null
    const sound = found?.file ?? null
    const recordings = clips.map(find)
    const missing = recordings.filter(f => !f).length
    log(`${playLine({ sound: id ? (found ? (found.fallback ? 'fallback' : 'ok') : 'missing') : null, recordings: clips.length, missing, unknown, onTv })}${fake ? ' (fake: nothing plays)' : ''}`)
    const queue = [sound, ...recordings].filter(Boolean)
    const nextOne = () => {
      if (mine !== sequence) return // a newer cue has taken over
      const file = queue.shift()
      if (!file) { current = null; if (onDone) onDone(); return }
      if (fake) { nextOne(); return }
      const p = spawn('afplay', [file], { stdio: 'ignore' })
      current = p
      let done = false
      const after = (failed) => {
        if (done) return
        done = true
        if (current === p) current = null
        if (failed && mine === sequence) log('[sound] one file would not play; skipped')
        nextOne()
      }
      p.on('error', () => after(true))
      p.on('exit', () => after(false))
    }
    nextOne()
  }

  return { play, stop, playing: () => current !== null }
}
