// The Orangerie string lights (Nanoleaf Holiday String Lights, Wi-Fi), the
// mirror of Salem's Motion Game (handoff 23 Oct, 9.6). The game runs on the
// phones; the server schedules every colour change with a timestamp in the
// public doc nights/{id}/public/salem:
//   { state: 'idle'|'intro'|'playing'|'passed'|'cleared', round: 0-3,
//     flips: [{ at: Timestamp, colour: 'red'|'green' }], endsAt: Timestamp|null, groupId }
// While the game is playing, the strings show the colour of the last flip
// whose time has come; otherwise a soft warm decor colour. If the strings do
// not answer, the relay says so once and carries on: every phone in the
// group tints its whole screen the same colour, so the game never waits on
// the lights.
//
// The strings speak the Nanoleaf Open API v1, plain HTTP on port 16021 (as
// station/lib/nanoleaf.js). Pairing, once: hold the controller's power
// button 5 to 7 seconds until it flashes, then within 30 seconds
//   curl -X POST http://<address>:16021/api/v1/new   → { "auth_token": "…" }
// and put the address and token in cues/.env (NANOLEAF_STRINGS_HOST,
// NANOLEAF_STRINGS_TOKEN). Untested on the real strings until the hardware
// evening.
//
// The other road (Jon, 25 Oct 2026): through Apple Home, with no Nanoleaf
// pairing. On the real strings, holding the button to pair reset their Wi-Fi,
// so the brain runs one Apple Shortcut per colour instead (STRING_SHORTCUTS,
// each runs one Home scene Jon made for the Holiday Lights), with STRINGS_SHORTCUTS=on
// in cues/.env. Apple Home answers in about a second, so in Salem's game the
// phones carry the colour and the strings follow.

import { execFile } from 'node:child_process'
import { stamp, blackoutStageOf } from './cues.js'

export const STRING_COLOURS = ['red', 'green']
export const DECOR = 'decor'
// The blackout (A1, 11 Nov 2026): the strings go dark with everything else.
export const OFF = 'off'

// The same as cues/scenes.json "strings", for when that file cannot be read.
export const DEFAULT_STRING_COLOURS = {
  red: { hue: 0, sat: 100, brightness: 100 },
  green: { hue: 120, sat: 100, brightness: 100 },
  decor: { hue: 32, sat: 70, brightness: 35 },
  off: { off: true },
}

// The colour the strings should show at `now`: 'red', 'green' or 'decor'.
export function stringsColour(salem, now = Date.now()) {
  if (salem?.state !== 'playing') return DECOR
  const end = stamp(salem.endsAt)
  if (end && now >= end) return DECOR
  let colour = DECOR
  let last = -Infinity
  for (const f of Array.isArray(salem.flips) ? salem.flips : []) {
    const at = stamp(f?.at)
    if (!at || at > now || !STRING_COLOURS.includes(f.colour)) continue
    if (at >= last) { colour = f.colour; last = at }
  }
  return colour
}

// What the strings show, the blackout first: between its dark and power marks
// (nights/{id}.blackout) they are off, whatever Salem's game says; the rest of
// the time stringsColour.
export function stringsWanted(salem, night, now = Date.now()) {
  if (blackoutStageOf(night, now) === 'dark' || night?.phase === 'blackout') return OFF
  return stringsColour(salem, now)
}

// Which of Salem's records the strings follow: the night's while a group is
// playing it, else the Game test tab's practice (public_state/game_test_salem,
// the same shape) while that is playing. Jon, 28 Oct 2026: the lights did not
// go with the practice, because the brain only watched the night's record.
export function salemToMirror(night, practice) {
  if (night?.state === 'playing') return night
  if (practice?.state === 'playing') return practice
  return night ?? null
}

// When the colour next changes (the next flip, or the round's end), so the
// relay can wake exactly then; null when nothing more is scheduled.
export function nextChangeAt(salem, now = Date.now()) {
  if (salem?.state !== 'playing') return null
  const times = (Array.isArray(salem.flips) ? salem.flips : []).map(f => stamp(f?.at)).filter(t => t > now)
  const end = stamp(salem.endsAt)
  if (end > now) times.push(end)
  return times.length ? Math.min(...times) : null
}

// The Open API body for one colour: { hue 0-360, sat 0-100, brightness 0-100 }
// from cues/scenes.json "strings".
export function stringsBody({ hue, sat, brightness, off = false }) {
  if (off) return { on: { value: false } }
  return { on: { value: true }, hue: { value: hue }, sat: { value: sat }, brightness: { value: brightness, duration: 0 } }
}

export class StringLights {
  constructor({ host, token, fetchImpl = globalThis.fetch, timeoutMs = 1500 } = {}) {
    if (!host || !token) throw new Error('string lights: address and token are required')
    this.url = `http://${host}:16021/api/v1/${token}/state`
    this.fetch = fetchImpl
    this.timeoutMs = timeoutMs
  }

  async show(setting) {
    const res = await this.fetch(this.url, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(stringsBody(setting)), signal: AbortSignal.timeout(this.timeoutMs),
    })
    if (!res.ok && res.status !== 204) throw new Error(`string lights: ${res.status}`)
  }
}

// The three Apple Shortcuts on the brain, one per colour.
export const STRING_SHORTCUTS = { red: 'Red Murderwin Strings', green: 'Green Murderwin Strings', decor: 'Decor Murderwin Strings', off: 'Off Murderwin Strings' }

// ---- Apple Shortcuts, game wide (31 Oct 2026) -------------------------------
//
// Everything the brain asks Apple Home for goes through one Shortcut each
// (the string lights' three colours, the projector's plug, and any Home scene
// a cue is given later), run with macOS's own `shortcuts run`. A Home scene
// answers in about a second when every accessory in it is reachable. When one
// is not (Jon, 31 Oct 2026: every string-light Shortcut turned the lights at
// once, then ran a full minute and ended "Action set execution partially
// succeeded"), Apple Home waits about a minute for the straggler before the
// tool returns. The brain used to wait on the tool and cut it off at eight
// seconds, so every cue behind it stalled. So: a Shortcut counts as done
// SHORTCUT_HEAD_START_MS after it starts, whether or not the tool has
// returned. A failure inside the head start is a real one (`shortcuts`
// missing, no Shortcut by that name: the tool says so in under a tenth of a
// second, measured). A failure after it is a late one: the scene was sent, so
// it costs one plain line that says what to fix, not a retry. The same
// Shortcut run again while an earlier run still waits cancels that run
// ("Running was cancelled"): the newer cue took over, nothing to say.

// Run one shortcut by name with macOS's own `shortcuts` tool; rejects when it
// is missing, is not on this Mac, or fails. `shortcuts run` reads its input
// from stdin until it closes, so stdin is closed at once (left open, it waits
// until the timeout kills it). The error carries what the tool said, whether
// that was "partially succeeded", and how long the run took.
export function runShortcut(name, { timeoutMs = SHORTCUT_TIMEOUT_MS, execFileImpl = execFile, now = () => Date.now() } = {}) {
  const startedAt = now()
  return new Promise((resolve, reject) => {
    const child = execFileImpl('shortcuts', ['run', name], { timeout: timeoutMs }, (err, stdout, stderr) => {
      if (!err) return resolve()
      const said = String(stderr ?? '').trim().replace(/^Error:\s*/i, '')
      const reason = said || (err.killed || err.signal ? 'it did not finish' : err.code ?? err.message)
      reject(Object.assign(new Error(`shortcut ${name}: ${reason}`), { partial: /partially succeeded/i.test(said), cancelled: /cancelled/i.test(said), took: now() - startedAt }))
    })
    child?.stdin?.end?.()
  })
}

// Every Shortcut on this Mac, by name: `shortcuts list`, which only reads
// (it runs nothing, plays nothing and switches nothing). Rejects when the
// tool is not here (this is not a Mac) or will not answer. 11 Nov 2026: the
// sheet named a Shortcut to stop the music that was never made, so every stop
// the brain sent failed while its window said "off". The relay now reads this
// list when it starts and says, one line each, which of the Shortcuts it will
// run are missing (shortcutsNeeded and shortcutCheck, below).
export function listShortcuts({ execFileImpl = execFile, timeoutMs = 10_000 } = {}) {
  return new Promise((resolve, reject) => {
    const child = execFileImpl('shortcuts', ['list'], { timeout: timeoutMs }, (err, stdout, stderr) => {
      if (err) return reject(new Error(String(stderr ?? '').trim().replace(/^Error:\s*/i, '') || err.code || err.message || 'no answer'))
      resolve(String(stdout ?? '').split('\n').map(l => l.trim()).filter(Boolean))
    })
    child?.stdin?.end?.()
  })
}

// Every Shortcut the brain will run tonight, each with what it is for, from
// the roads that are switched on: [{ name, tag, key, does }]. `music` is the
// sheet's musicShortcuts table (null when the music is not on that road),
// `strings` the three colour names, `projector` the two plug names. `key` is
// the table's key ('off' is the stop); `does` finishes the sentence "so ...".
export function shortcutsNeeded({ music = null, strings = null, projector = null } = {}) {
  const out = []
  const list = v => (Array.isArray(v) ? v : v == null ? [] : [v]).filter(n => typeof n === 'string' && n.trim()).map(n => n.trim())
  for (const [key, v] of Object.entries(music ?? {})) {
    for (const name of list(v)) {
      const does = key === 'off' ? 'the brain cannot stop the music'
        : key === 'duck' ? 'the music will not go quiet under a recording'
          : key === 'cake' ? 'the Music app plays the cake\'s song instead'
            : `the music setting "${key}" will not play`
      out.push({ name, tag: 'music', key, does })
    }
  }
  for (const [colour, name] of Object.entries(strings ?? {})) {
    for (const n of list(name)) out.push({ name: n, tag: 'strings', key: colour, does: colour === 'off' ? 'the string lights stay lit through the blackout' : `the string lights will not turn ${colour === 'decor' ? 'back to their warm glow' : colour} (the phones carry the colour)` })
  }
  for (const [state, name] of Object.entries(projector ?? {})) {
    for (const n of list(name)) out.push({ name: n, tag: 'projector', key: state, does: `the projector's plug will not switch ${state}` })
  }
  return out
}

// The needed Shortcuts against the Mac's own list. Names must match exactly;
// one that differs only in capitals or spaces is named beside it, since that
// is the likeliest slip. Returns { missing, lines, stop }:
//   missing  the needed ones that are not on this Mac (each once per name and use)
//   lines    what to print, one line a missing Shortcut, the stop first and in capitals,
//            or one line that all are here
//   stop     'ok' | 'missing' | 'none' (no stop is named, or the music is not on this road)
export function shortcutCheck(needed = [], have = []) {
  const here = new Set(have)
  const loose = n => String(n).toLowerCase().replace(/\s+/g, ' ').trim()
  const near = name => have.find(h => h !== name && loose(h) === loose(name)) ?? null
  const seen = new Set()
  const missing = []
  for (const s of needed) {
    const id = `${s.tag}/${s.key}/${s.name}`
    if (here.has(s.name) || seen.has(id)) continue
    seen.add(id)
    missing.push({ ...s, near: near(s.name) })
  }
  const stops = needed.filter(s => s.tag === 'music' && s.key === 'off')
  const stop = !stops.length ? 'none' : stops.some(s => !here.has(s.name)) ? 'missing' : 'ok'
  const hint = s => (s.near ? ` (there is one called "${s.near}": the two names must match exactly)` : '')
  const lines = [...missing].sort((a, b) => Number(b.key === 'off' && b.tag === 'music') - Number(a.key === 'off' && a.tag === 'music')).map(s => (
    s.tag === 'music' && s.key === 'off'
      ? `[music] THE BRAIN CANNOT STOP THE MUSIC: no Shortcut called "${s.name}" on this Mac${hint(s)}. Make one in the Shortcuts app, named exactly that, that stops all four HomePods (docs/cues-relay.md). Until then every "music off" tonight does nothing`
      : `[${s.tag}] no Shortcut called "${s.name}" on this Mac${hint(s)}, so ${s.does}`
  ))
  const names = new Set(needed.map(s => s.name)).size
  if (!lines.length && names) lines.push(`Shortcuts: all ${names} the brain runs are on this Mac`)
  return { missing, lines, stop }
}

export const SHORTCUT_HEAD_START_MS = 750
export const SHORTCUT_TIMEOUT_MS = 90_000
// "Action set execution in progress." (the music check, 31 Oct 2026): Apple
// Home refuses a Shortcut while it is still carrying out the last one's
// Home action, at once; a HomePod audio action stays in progress for ten to
// twenty seconds. So a refused run is tried again every RETRY_IN_PROGRESS_MS
// for up to RETRY_FOR_MS, unless a newer run has come to this runner
// meanwhile (then it is dropped, quietly: the newer one is the one wanted).
export const RETRY_IN_PROGRESS_MS = 1500
export const RETRY_FOR_MS = 30_000

// The runner every Shortcut goes through. fire(name) resolves once the
// Shortcut has finished or the head start has passed, whichever comes first,
// and rejects only when it fails inside the head start. `tag` names the cue
// in the late line ("strings", "projector"). idle() waits for every run still
// going (for the checks); running() counts them.
// fire() resolves to { done }: a promise that settles (never rejects) when
// that run has ended, for a caller that must let one finish before the next
// (the music's Act 4 trio). A run a newer one has already replaced says
// nothing when it fails late (the music check, 31 Oct 2026: a Home audio
// scene still setting up fails with "Action set execution failed" when the
// next one starts; the newer one is the one that counts).
// fire(name, { onLate }): `onLate(e)` takes the place of the one late line
// for that run, for a Shortcut whose late failure is not harmless (the stop
// for the music, 11 Nov 2026: "partially succeeded" there means a HomePod may
// still be playing). A cancelled run stays quiet either way.
export function createShortcutRunner({ tag = 'shortcut', run = runShortcut, headStartMs = SHORTCUT_HEAD_START_MS, timeoutMs = SHORTCUT_TIMEOUT_MS, log = () => {}, wait = ms => new Promise(r => setTimeout(r, ms)) } = {}) {
  const pending = new Set()
  let warned = false
  let seq = 0
  const cancelled = e => !!e?.cancelled || /cancelled/i.test(e?.message ?? '')

  // The job was most likely done; say once what is wrong, until a run succeeds.
  function late(name, e) {
    if (cancelled(e)) return
    if (warned) return
    warned = true
    const secs = Math.round((e?.took ?? 0) / 1000)
    if (e?.partial) log(`[${tag}] the ${name} Shortcut ran for ${secs} s and then said "partially succeeded": it did its job, but something else in its Home scene is not answering. In the Home app, open that scene and take out whatever shows No Response (or make it again with only what it needs). Nothing waits on it.`)
    else log(`[${tag}] the ${name} Shortcut did not finish after ${secs} s (${e?.message ?? 'no reason'}); it may still have done its job`)
  }

  async function fire(name, { onLate = null } = {}) {
    const mine = ++seq
    let waited = 0
    for (;;) {
      let over = false
      const p = run(name, { timeoutMs }).then(
        () => { over = true; warned = false },
        e => { over = true; throw e },
      )
      pending.add(p)
      const done = p.catch(() => {}).then(() => { pending.delete(p) })
      try {
        await Promise.race([p, wait(headStartMs)])
      } catch (e) {
        if (!/in progress/i.test(e?.message ?? '')) throw e
        if (mine !== seq) return { done, dropped: true } // a newer run wants something else now
        if (waited >= RETRY_FOR_MS) throw new Error(`shortcut ${name}: Apple Home was still busy with the last action after ${Math.round(waited / 1000)} s`)
        await wait(RETRY_IN_PROGRESS_MS)
        waited += RETRY_IN_PROGRESS_MS
        if (mine !== seq) return { done, dropped: true }
        continue
      }
      if (!over) p.catch(e => {
        if (mine !== seq) return
        if (onLate) { if (!cancelled(e)) onLate(e) } else late(name, e)
      })
      return { done }
    }
  }

  return { fire, idle: () => Promise.allSettled([...pending]), running: () => pending.size }
}

// The string lights through their three Shortcuts, one per colour.
export class ShortcutLights {
  constructor({ run = runShortcut, headStartMs = SHORTCUT_HEAD_START_MS, timeoutMs = SHORTCUT_TIMEOUT_MS, log = () => {}, wait } = {}) {
    this.runner = createShortcutRunner({ tag: 'strings', run, headStartMs, timeoutMs, log, ...(wait ? { wait } : {}) })
  }

  async show(setting) {
    if (!setting?.shortcut) throw new Error('string lights: no shortcut for that colour')
    await this.runner.fire(setting.shortcut)
  }

  idle() { return this.runner.idle() }
  running() { return this.runner.running() }
}

// The projector's plug (25 Oct 2026, the cue list): an IKEA smart switch in
// Apple Home, switched from the brain by two more Shortcuts on this Mac,
// each running one Home scene Jon made (the plug on; the plug off). Which
// moments want it on or off is the `projector` layer of cues/scenes.json
// (lib/scenes.js); this only runs the Shortcut, through the same runner as
// the string lights. PROJECTOR_SHORTCUTS=on in cues/.env turns it on; the
// names may be changed there (PROJECTOR_SHORTCUT_ON / _OFF).
export const PROJECTOR_SHORTCUTS = { on: 'Projector Murderwin On', off: 'Projector Murderwin Off' }

// The Shortcut names from cues/.env, or the defaults.
export function projectorShortcutNames(env = {}) {
  const named = k => String(env[`PROJECTOR_SHORTCUT_${k.toUpperCase()}`] ?? '').trim() || PROJECTOR_SHORTCUTS[k]
  return { on: named('on'), off: named('off') }
}

// The switch: set('on' | 'off') runs that Shortcut. The planner is
// edge-triggered, so this is asked once per change; a failure inside the
// head start is one plain line (the projector takes a moment to warm up
// anyway, and its code in Act 2 is printed too). Not enabled (or fake): it
// says what it would do.
export function createProjectorSwitch({ enabled = false, names = PROJECTOR_SHORTCUTS, run = runShortcut, log = () => {}, fake = false, timeoutMs = SHORTCUT_TIMEOUT_MS, headStartMs = SHORTCUT_HEAD_START_MS, wait } = {}) {
  const runner = createShortcutRunner({ tag: 'projector', run, headStartMs, timeoutMs, log, ...(wait ? { wait } : {}) })
  let chain = Promise.resolve()
  function set(state) {
    if (state !== 'on' && state !== 'off') return chain
    if (fake || !enabled) { log(`[projector] would switch the projector ${state}${fake ? '' : ' (PROJECTOR_SHORTCUTS is not on in cues/.env)'}`); return chain }
    chain = chain.then(async () => {
      try { await runner.fire(names[state]); log(`[projector] ${state}`) } catch (e) { log(`[projector] ${state} failed (${e.message}); switch the plug in the Home app`) }
    })
    return chain
  }
  return { set, idle: () => chain.then(() => runner.idle()), running: () => runner.running() }
}

// The mirror's colours when the strings go through Shortcuts: each colour
// names its Shortcut. With `colours` (cues/scenes.json "strings") the Open
// API body stays beside it, so TwoWayLights can take either road.
export function shortcutColours(names = STRING_SHORTCUTS, colours = null) {
  return Object.fromEntries(Object.entries(names).map(([colour, name]) => [colour, { ...(colours?.[colour] ?? {}), shortcut: name }]))
}

// Both roads at once (31 Oct 2026): cues/.env has the strings' own address
// and token and STRINGS_SHORTCUTS=on. The pairing is tried first (it answers
// in milliseconds); the first time it fails the pairing is given up for the
// run, with one line that says why, and the Shortcuts carry every colour
// from then on. A 401 or 403 is a stale token: the strings' Wi-Fi was reset
// on 24 October, so the token in cues/.env may no longer be theirs.
export class TwoWayLights {
  constructor({ direct, shortcuts, log = () => {} }) {
    if (!direct || !shortcuts) throw new Error('string lights: both roads are needed')
    this.direct = direct
    this.shortcuts = shortcuts
    this.log = log
    this.directOff = false
  }

  async show(setting) {
    if (!this.directOff) {
      try { await this.direct.show(setting); return } catch (e) {
        this.directOff = true
        const stale = /\b40[13]\b/.test(e?.message ?? '')
        this.log(stale
          ? '[strings] the strings refused their saved pairing (NANOLEAF_STRINGS_TOKEN in cues/.env is stale: leave both NANOLEAF lines empty, or pair again); the Shortcuts carry the colours from here'
          : `[strings] the strings did not answer at their own address (${e?.message ?? 'no answer'}); the Shortcuts carry the colours from here`)
      }
    }
    await this.shortcuts.show(setting)
  }

  idle() { return this.shortcuts.idle() }
  running() { return this.shortcuts.running() }
}

// The mirror: call update(colour) as often as you like; it sends only a
// change, never two at once (the newest colour wins), and logs one line
// when the strings stop answering and one when they answer again. While
// they are not answering it tries again on the next change, or every
// RETRY_MS with the same colour. `lights` is a StringLights (null in fake
// mode or when not set up).
export const RETRY_MS = 15_000
export function createStringsMirror({ lights = null, colours, log = () => {}, fake = false, now = () => Date.now() } = {}) {
  let shown = null      // the colour the strings last took (null: not known)
  let wanted = null     // the colour asked for most recently
  let busy = false
  let failing = false
  let triedAt = -Infinity

  async function send() {
    if (busy) return
    busy = true
    try {
      while (wanted !== shown) {
        const colour = wanted
        triedAt = now()
        try {
          await lights.show(colours[colour])
          shown = colour
          if (failing) { failing = false; log('[strings] the string lights are answering again') }
        } catch {
          shown = null // whatever they show now, it is not known
          if (!failing) { failing = true; log('[strings] the string lights did not answer; the phones carry the colour') }
          return
        }
      }
    } finally { busy = false }
  }

  function update(colour) {
    if (colour === wanted && (colour === shown || busy || (failing && now() - triedAt < RETRY_MS))) return
    wanted = colour
    if (fake) { if (shown !== colour) { shown = colour; log(`[strings] would show ${colour}`) } return }
    if (!lights) { shown = colour; return }
    send()
  }

  return { update, shown: () => shown }
}
