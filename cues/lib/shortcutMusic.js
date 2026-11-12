// The music through Apple Home (Jon, 31 Oct 2026, from the formal rundown):
// one Shortcut per music setting on the brain, each running a Home scene
// that plays on the HomePods themselves ("Default Jazz", "Default Jazz 20%",
// "Lightbulb Moment Music", "Get Off My Grass Game Music", "Intense Music
// 60%", "Intense Music 35%"). MUSIC_SHORTCUTS=on in cues/.env puts the brain
// on this road; the names come from cues/scenes.json "musicShortcuts", by the
// same short keys as "playlists" (jazz, jazzLow, intense35, intense60, act4),
// plus three keys of their own:
//   off   the Shortcut that stops the music on every HomePod
//   duck  (optional) the Shortcut that turns the music down while the brain
//         speaks a recording (bulletin 2); the setting that was on comes back after
//   cake  (optional) a Shortcut that plays the cake's song on the HomePods,
//         in place of the Music app
// A key may name a list of Shortcuts, run in order a head start apart (Act 4:
// the house jazz first, then the Study's and the Orangerie's own music, so
// the two rooms take their HomePods out of the jazz last).
//
// The same interface as lib/music.js createMusic, so lib/scenes.js and
// cues.mjs need not know which road the music is on:
//   play({ playlist, name, volume })  that setting's Shortcut(s)
//   pause()                           the "off" Shortcut (and the Music app
//                                     paused too, in case the cake song is on)
//   duck() / unduck()                 nothing for a plain cue: the HomePods play
//                                     their own stream, which the Mac's volume
//                                     cannot touch. duck({ speech: true }) runs
//                                     the "duck" Shortcut when one is named and
//                                     music is on; unduck() then plays the
//                                     setting that was on again
//   playTrack / nowPlaying / speakers the Music app's (the cake song): `fallback`
//   idle()                            every Shortcut still running has finished
//   stopped()                         true, false or null: did the last stop run?
//
// THE STOP IS HONEST (11 Nov 2026). The sheet named a stop Shortcut that was
// not on the brain, so every "music off" of a whole evening failed while the
// window printed "[music] off". Now:
//   - "off" is printed only when the stop Shortcut really ran;
//   - a stop that did not run says so in capitals, every time, not once;
//   - it is tried once more a few seconds later (STOP_RETRY_MS), unless a
//     newer play or stop has come meanwhile: then the second try is dropped,
//     so it can never kill music that has just come back;
//   - a stop that fails late ("partially succeeded": a HomePod in its Home
//     scene did not answer) says a HomePod may still be playing.
//
// A setting with no Shortcut named falls back to the Music app, with one
// line; a music Shortcut that is not on this Mac is one line too (the tool
// says so inside the head start); a Home scene with a straggler is the
// runner's one late line (lib/strings.js createShortcutRunner).

import { createShortcutRunner } from './strings.js'

export const OFF_KEY = 'off'
export const DUCK_KEY = 'duck'
export const CAKE_KEY = 'cake'
// The keys of musicShortcuts that are not playlist settings.
export const SPECIAL_KEYS = [OFF_KEY, DUCK_KEY, CAKE_KEY]

// The Shortcut names for one key, as a list (a string, a list, or nothing).
export function shortcutsFor(names, key) {
  const v = names?.[key]
  const list = Array.isArray(v) ? v : v == null ? [] : [v]
  return list.filter(n => typeof n === 'string' && n.trim()).map(n => n.trim())
}

// Plain-English problems with a sheet's musicShortcuts (empty when fine).
export function musicShortcutProblems(cfg) {
  const out = []
  const names = cfg?.musicShortcuts
  if (names == null) return out
  if (typeof names !== 'object' || Array.isArray(names)) return ['musicShortcuts is not an object of playlist keys']
  for (const [k, v] of Object.entries(names)) {
    if (!SPECIAL_KEYS.includes(k) && !cfg?.playlists?.[k]) out.push(`musicShortcuts.${k} is not a playlist key or "off"`)
    const list = Array.isArray(v) ? v : [v]
    if (!list.length || !list.every(n => typeof n === 'string' && n.trim())) out.push(`musicShortcuts.${k} is not a Shortcut name or a list of them`)
  }
  return out
}

// A setting that runs several Shortcuts lets each finish before the next,
// or waits this long: a Home audio scene takes a few seconds to set its
// HomePods, and the next one starting too soon makes it fail (31 Oct 2026).
export const SEQUENCE_WAIT_MS = 8000
// A stop that did not run is tried once more after this long, and no more.
export const STOP_RETRY_MS = 3000
export const STOP_TRIES = 2

export function createShortcutMusic({ names = {}, runner = null, fallback = null, log = () => {}, fake = false, headStartMs, wait = ms => new Promise(r => setTimeout(r, ms)) } = {}) {
  const run = runner ?? createShortcutRunner({ tag: 'music', log, ...(headStartMs ? { headStartMs } : {}) })
  let chain = Promise.resolve()
  const said = new Set()
  const once = (key, line) => { if (said.has(key)) return; said.add(key); log(line) }
  let seq = 0          // every play and every stop takes a number: the newest is the one wanted
  let playing = null   // the setting last asked for ({ playlist, name, volume }); null after a stop
  let ducked = false   // the duck Shortcut has run and the setting has not come back yet
  let stopOk = null    // did the last stop run? null until one is sent

  function enqueue(fn) {
    chain = chain.then(fn).catch(e => log(`[music] ${e?.message ?? e}`))
    return chain
  }

  // One Shortcut. { ok: true, done } (the run's end, for the sequence) when
  // it ran; { ok: false, reason } when it failed inside the head start (it is
  // not on this Mac, or Apple Home refused it); { ok: false, dropped: true }
  // when a newer run took its place while Apple Home was busy. The handle is
  // an object on purpose: an async function that returned the promise itself
  // would wait for the whole run.
  async function fire(name, opts) {
    if (fake) { log(`[music] would run the ${name} Shortcut`); return { ok: true, done: Promise.resolve() } }
    try {
      const r = await run.fire(name, opts)
      if (r?.dropped) return { ok: false, dropped: true }
      return { ok: true, done: r?.done ?? Promise.resolve() }
    } catch (e) {
      return { ok: false, reason: String(e?.message ?? 'no reason').replace(/^shortcut [^:]*:\s*/i, '') }
    }
  }

  // A music setting's Shortcut(s), in order. Used by play() and by unduck().
  async function runSetting(key, list) {
    const ran = []
    for (const [i, name] of list.entries()) {
      const r = await fire(name)
      if (!r.ok) {
        if (!r.dropped) once(`missing:${name}`, `[music] the ${name} Shortcut did not run (${r.reason}): make it in Shortcuts on this Mac, named exactly that, or name it in cues/scenes.json musicShortcuts`)
        continue
      }
      ran.push(name)
      // the next one only once this one has finished, or after the wait
      if (i < list.length - 1 && !fake) await Promise.race([r.done, wait(SEQUENCE_WAIT_MS)])
    }
    if (ran.length && !fake) log(`[music] ${ran.join(', then ')}`)
  }

  function play(a) {
    const key = a?.playlist
    const list = shortcutsFor(names, key)
    ++seq
    ducked = false
    playing = a ?? null
    if (!list.length) {
      if (fallback) { once(`none:${key}`, `[music] no Shortcut named for "${key}" in cues/scenes.json musicShortcuts: the Music app plays it instead`); return fallback.play(a) }
      once(`none:${key}`, `[music] no Shortcut named for "${key}" in cues/scenes.json musicShortcuts, and no Music app: nothing plays`)
      return chain
    }
    return enqueue(() => runSetting(key, list))
  }

  // What a stop that failed late says: the Shortcut started, so most of its
  // Home scene was carried out, but not all of it.
  function stopLate(name, e) {
    const secs = Math.round((e?.took ?? 0) / 1000)
    stopOk = false
    if (e?.partial) log(`[music] THE STOP MAY NOT HAVE REACHED EVERY HOMEPOD: the ${name} Shortcut ran for ${secs} s and then said "partially succeeded", so something in its Home scene did not answer. Listen for a HomePod still playing. In the Home app, open that scene and take out whatever shows No Response.`)
    else log(`[music] THE STOP MAY NOT HAVE REACHED EVERY HOMEPOD: the ${name} Shortcut did not finish after ${secs} s (${String(e?.message ?? 'no reason').replace(/^shortcut [^:]*:\s*/i, '')})`)
  }

  // One try at the stop. `mine` is the number the stop took when it was
  // asked for: a second try only goes ahead while it is still the newest.
  async function stopNow(list, mine, attempt) {
    if (!list.length) {
      stopOk = false
      log('[music] THE MUSIC WAS NOT STOPPED: no Shortcut is named to stop it (cues/scenes.json musicShortcuts.off). The HomePods play on until you stop them in the Home app')
    } else {
      let ran = 0
      let dropped = false
      const why = []
      for (const name of list) {
        const r = await fire(name, { onLate: e => stopLate(name, e) })
        if (r.ok) ran++
        else if (r.dropped) dropped = true
        else why.push(`the ${name} Shortcut did not run (${r.reason})`)
      }
      if (ran === list.length) {
        stopOk = true
        if (!fake) log('[music] off')
      } else if (!dropped) {
        stopOk = false
        const again = attempt < STOP_TRIES
        log(`[music] THE MUSIC WAS NOT STOPPED: ${why.join('; ')}. ${again ? `Trying once more in ${Math.round(STOP_RETRY_MS / 1000)} seconds` : 'The HomePods play on: stop them in the Home app, and make that Shortcut on this Mac, named exactly that (docs/cues-relay.md)'}`)
        // once more, off the queue so nothing waits on it; dropped if a newer play or stop has come
        if (again) wait(STOP_RETRY_MS).then(() => { if (mine === seq) enqueue(() => stopNow(list, mine, attempt + 1)) })
      }
    }
    if (fallback) await fallback.pause() // the Music app, in case the cake song is on
  }

  function pause() {
    const mine = ++seq
    ducked = false
    playing = null
    const list = shortcutsFor(names, OFF_KEY)
    return enqueue(() => stopNow(list, mine, 1))
  }

  // Under a recording the brain speaks (bulletin 2): the duck Shortcut, when
  // the sheet names one and music is on. A plain cue does nothing here.
  function duck({ speech = false } = {}) {
    const list = shortcutsFor(names, DUCK_KEY)
    if (!speech || !list.length || !playing || ducked) return chain
    ducked = true
    const mine = seq
    return enqueue(async () => {
      if (mine !== seq) return // the music changed before the dip could start
      let ran = 0
      for (const name of list) {
        const r = await fire(name)
        if (r.ok) ran++
        else if (!r.dropped) once(`missing:${name}`, `[music] the ${name} Shortcut did not run (${r.reason}): the music stays as loud as it was under the recording`)
      }
      if (!ran) { if (mine === seq) ducked = false; return } // nothing went down, so nothing to bring back
      if (!fake) log('[music] down, under the recording')
    })
  }

  // The recording is over: the setting that was on plays again. Nothing when
  // the music was changed or stopped meanwhile (that play or stop is the
  // newer word).
  function unduck() {
    if (!ducked || !playing) return chain
    ducked = false
    const a = playing
    const mine = seq
    const list = shortcutsFor(names, a.playlist)
    if (!list.length) return chain
    return enqueue(async () => {
      if (mine !== seq) return
      await runSetting(a.playlist, list)
    })
  }

  // The cake's song by its own Shortcut, when the sheet names one: 'playing',
  // or null when there is none (or it did not run), so the caller takes the
  // Music app instead.
  function playCake() {
    const list = shortcutsFor(names, CAKE_KEY)
    if (!list.length) return Promise.resolve(null)
    ++seq
    ducked = false
    playing = null
    let result = null
    return enqueue(async () => {
      let ran = 0
      for (const name of list) {
        const r = await fire(name)
        if (r.ok) ran++
        else if (!r.dropped) log(`[cake] the ${name} Shortcut did not run (${r.reason}): the Music app plays the song instead`)
      }
      if (ran === list.length) { result = 'playing'; if (!fake) log(`[cake] ${list.join(', then ')}`) }
    }).then(() => result)
  }

  // The cake's song from the Music app. It is a newer word than any stop, so
  // a stop's second try can never land on the song.
  function playTrack(a) {
    ++seq
    ducked = false
    playing = null
    return fallback ? fallback.playTrack(a) : Promise.resolve('missing')
  }

  return {
    play, pause, duck, unduck, playCake, playTrack,
    nowPlaying: () => (fallback ? fallback.nowPlaying() : Promise.resolve(null)),
    speakers: () => (fallback ? fallback.speakers() : Promise.resolve([])),
    toHomePods: a => (fallback?.toHomePods ? fallback.toHomePods(a) : Promise.resolve('failed')),
    releaseSpeakers: () => (fallback?.releaseSpeakers ? fallback.releaseSpeakers() : Promise.resolve('failed')),
    hasTrack: name => (fallback?.hasTrack ? fallback.hasTrack(name) : Promise.resolve(null)),
    idle: () => chain.then(() => run.idle()),
    running: () => run.running(),
    stopped: () => stopOk,
    road: 'shortcuts',
  }
}
