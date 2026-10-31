// The music through Apple Home (Jon, 31 Oct 2026, from the formal rundown):
// one Shortcut per music setting on the brain, each running a Home scene
// that plays on the HomePods themselves ("Default Jazz", "Default Jazz 20%",
// "Lightbulb Moment Music", "Get Off My Grass Game Music", "Intense Music
// 60%", "Intense Music 35%", "Credit Roll Music"). MUSIC_SHORTCUTS=on in
// cues/.env puts the brain on this road; the names come from
// cues/scenes.json "musicShortcuts", by the same short keys as "playlists"
// (jazz, jazzLow, intense35, intense60, credits, act4), plus "off" for the
// Shortcut that stops the music. A key may name a list of Shortcuts, run in
// order a head start apart (Act 4: the house jazz first, then the Study's
// and the Orangerie's own music, so the two rooms take their HomePods out
// of the jazz last).
//
// The same interface as lib/music.js createMusic, so lib/scenes.js and
// cues.mjs need not know which road the music is on:
//   play({ playlist, name, volume })  that setting's Shortcut(s)
//   pause()                           the "off" Shortcut (and the Music app
//                                     paused too, in case the cake song is on)
//   duck() / unduck()                 nothing: the HomePods play their own
//                                     stream, which the Mac's volume cannot touch
//   playTrack / nowPlaying / speakers the Music app's (the cake song, Boo's
//                                     speaker list): `fallback`, when there is one
//   speaker()                         nothing: the house music is not the Mac's
//   idle()                            every Shortcut still running has finished
//
// A setting with no Shortcut named falls back to the Music app, with one
// line; a Shortcut that is not on this Mac is one line too (the tool says
// so inside the head start); a Home scene with a straggler is the runner's
// one late line (lib/strings.js createShortcutRunner).

import { createShortcutRunner } from './strings.js'

export const OFF_KEY = 'off'

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
    if (k !== OFF_KEY && !cfg?.playlists?.[k]) out.push(`musicShortcuts.${k} is not a playlist key or "off"`)
    const list = Array.isArray(v) ? v : [v]
    if (!list.length || !list.every(n => typeof n === 'string' && n.trim())) out.push(`musicShortcuts.${k} is not a Shortcut name or a list of them`)
  }
  return out
}

// A setting that runs several Shortcuts lets each finish before the next,
// or waits this long: a Home audio scene takes a few seconds to set its
// HomePods, and the next one starting too soon makes it fail (31 Oct 2026).
export const SEQUENCE_WAIT_MS = 8000

export function createShortcutMusic({ names = {}, runner = null, fallback = null, log = () => {}, fake = false, headStartMs, wait = ms => new Promise(r => setTimeout(r, ms)) } = {}) {
  const run = runner ?? createShortcutRunner({ tag: 'music', log, ...(headStartMs ? { headStartMs } : {}) })
  let chain = Promise.resolve()
  const said = new Set()
  const once = (key, line) => { if (said.has(key)) return; said.add(key); log(line) }

  function enqueue(fn) {
    chain = chain.then(fn).catch(e => log(`[music] ${e?.message ?? e}`))
    return chain
  }

  // One Shortcut: a failure inside the head start is one plain line.
  // Resolves to { done } (the run's end, for the sequence), or null when it
  // did not run. The handle is an object on purpose: an async function
  // that returned the promise itself would wait for the whole run.
  async function fire(name) {
    if (fake) { log(`[music] would run the ${name} Shortcut`); return { done: Promise.resolve() } }
    try { return { done: (await run.fire(name))?.done ?? Promise.resolve() } } catch (e) {
      once(`missing:${name}`, `[music] the ${name} Shortcut did not run (${e?.message ?? 'no reason'}): make it in Shortcuts on this Mac, named exactly that, or name it in cues/scenes.json musicShortcuts`)
      return null
    }
  }

  function play(a) {
    const key = a?.playlist
    const list = shortcutsFor(names, key)
    if (!list.length) {
      if (fallback) { once(`none:${key}`, `[music] no Shortcut named for "${key}" in cues/scenes.json musicShortcuts: the Music app plays it instead`); return fallback.play(a) }
      once(`none:${key}`, `[music] no Shortcut named for "${key}" in cues/scenes.json musicShortcuts, and no Music app: nothing plays`)
      return chain
    }
    return enqueue(async () => {
      const ran = []
      for (const [i, name] of list.entries()) {
        const r = await fire(name)
        if (r === null) continue
        ran.push(name)
        // the next one only once this one has finished, or after the wait
        if (i < list.length - 1 && !fake) await Promise.race([r.done, wait(SEQUENCE_WAIT_MS)])
      }
      if (ran.length && !fake) log(`[music] ${ran.join(', then ')}`)
    })
  }

  function pause() {
    const list = shortcutsFor(names, OFF_KEY)
    if (!list.length) once('none:off', '[music] no Shortcut named to stop the music (cues/scenes.json musicShortcuts.off): the HomePods play on until you stop them')
    return enqueue(async () => {
      for (const name of list) await fire(name)
      if (list.length && !fake) log('[music] off')
      if (fallback) await fallback.pause() // the Music app, in case the cake song is on
    })
  }

  const nothing = () => chain
  return {
    play, pause, duck: nothing, unduck: nothing, speaker: nothing,
    playTrack: a => (fallback ? fallback.playTrack(a) : Promise.resolve('missing')),
    nowPlaying: () => (fallback ? fallback.nowPlaying() : Promise.resolve(null)),
    speakers: () => (fallback ? fallback.speakers() : Promise.resolve([])),
    idle: () => chain.then(() => run.idle()),
    running: () => run.running(),
    road: 'shortcuts',
  }
}
