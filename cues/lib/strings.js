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
import { stamp } from './cues.js'

export const STRING_COLOURS = ['red', 'green']
export const DECOR = 'decor'

// The same as cues/scenes.json "strings", for when that file cannot be read.
export const DEFAULT_STRING_COLOURS = {
  red: { hue: 0, sat: 100, brightness: 100 },
  green: { hue: 120, sat: 100, brightness: 100 },
  decor: { hue: 32, sat: 70, brightness: 35 },
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
export function stringsBody({ hue, sat, brightness }) {
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
export const STRING_SHORTCUTS = { red: 'Red Murderwin Strings', green: 'Green Murderwin Strings', decor: 'Decor Murderwin Strings' }

// The projector's plug (25 Oct 2026, the cue list): an IKEA smart switch in
// Apple Home, switched from the brain by two more Shortcuts on this Mac,
// each running one Home scene Jon made (the plug on; the plug off). Which
// moments want it on or off is the `projector` layer of cues/scenes.json
// (lib/scenes.js); this only runs the Shortcut, through the same
// `shortcuts run` as the string lights. PROJECTOR_SHORTCUTS=on in cues/.env
// turns it on; the names may be changed there (PROJECTOR_SHORTCUT_ON / _OFF).
export const PROJECTOR_SHORTCUTS = { on: 'Projector Murderwin On', off: 'Projector Murderwin Off' }

// The Shortcut names from cues/.env, or the defaults.
export function projectorShortcutNames(env = {}) {
  const named = k => String(env[`PROJECTOR_SHORTCUT_${k.toUpperCase()}`] ?? '').trim() || PROJECTOR_SHORTCUTS[k]
  return { on: named('on'), off: named('off') }
}

// The switch: set('on' | 'off') runs that Shortcut. The planner is
// edge-triggered, so this is asked once per change; a failure is one plain
// line (the projector takes a moment to warm up anyway, and its code in
// Act 2 is printed too). Not enabled (or fake): it says what it would do.
export function createProjectorSwitch({ enabled = false, names = PROJECTOR_SHORTCUTS, run = runShortcut, log = () => {}, fake = false, timeoutMs = 8000 } = {}) {
  let chain = Promise.resolve()
  function set(state) {
    if (state !== 'on' && state !== 'off') return chain
    if (fake || !enabled) { log(`[projector] would switch the projector ${state}${fake ? '' : ' (PROJECTOR_SHORTCUTS is not on in cues/.env)'}`); return chain }
    chain = chain.then(async () => {
      try { await run(names[state], { timeoutMs }); log(`[projector] ${state}`) } catch (e) { log(`[projector] ${state} failed (${e.message}); switch the plug in the Home app`) }
    })
    return chain
  }
  return { set, idle: () => chain }
}

// The mirror's colours when the strings go through Shortcuts: each colour
// names its Shortcut. With `colours` (cues/scenes.json "strings") the Open
// API body stays beside it, so TwoWayLights can take either road.
export function shortcutColours(names = STRING_SHORTCUTS, colours = null) {
  return Object.fromEntries(Object.entries(names).map(([colour, name]) => [colour, { ...(colours?.[colour] ?? {}), shortcut: name }]))
}

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
      reject(Object.assign(new Error(`shortcut ${name}: ${reason}`), { partial: /partially succeeded/i.test(said), took: now() - startedAt }))
    })
    child?.stdin?.end?.()
  })
}

// A Home scene through a Shortcut answers in about a second when every
// accessory in the scene is reachable. When one is not (Jon, 31 Oct 2026:
// the Red Shortcut turned the strings red at once, then ran a full minute
// and ended "Action set execution partially succeeded"), Apple Home waits
// about a minute for the straggler before the tool returns an error. So a
// colour counts as sent after SHORTCUT_HEAD_START_MS, whether or not the
// Shortcut has finished: the lights have taken it by then. A failure inside
// the head start is a real one (`shortcuts` missing, no Shortcut by that
// name: the tool says so in well under a second). A failure after it is a
// late one: the scene was sent, so it costs one plain line that says what to
// fix, not a restart of the colour.
export const SHORTCUT_HEAD_START_MS = 1500
export const SHORTCUT_TIMEOUT_MS = 90_000

export class ShortcutLights {
  constructor({ run = runShortcut, headStartMs = SHORTCUT_HEAD_START_MS, timeoutMs = SHORTCUT_TIMEOUT_MS, log = () => {}, wait = ms => new Promise(r => setTimeout(r, ms)) } = {}) {
    this.run = run
    this.headStartMs = headStartMs
    this.timeoutMs = timeoutMs
    this.log = log
    this.wait = wait
    this.pending = new Set()
    this.warned = false
  }

  // Resolves once the Shortcut has finished or the head start has passed,
  // whichever comes first; rejects only when it fails inside the head start.
  async show(setting) {
    if (!setting?.shortcut) throw new Error('string lights: no shortcut for that colour')
    const name = setting.shortcut
    let over = false
    const run = this.run(name, { timeoutMs: this.timeoutMs }).then(
      () => { over = true; this.warned = false },
      e => { over = true; throw e },
    )
    this.pending.add(run)
    run.catch(() => {}).then(() => this.pending.delete(run))
    const head = this.wait(this.headStartMs)
    await Promise.race([run, head])
    if (!over) run.catch(e => this.late(name, e))
  }

  // The lights most likely changed; say once what is wrong, until a run succeeds.
  late(name, e) {
    if (this.warned) return
    this.warned = true
    const secs = Math.round((e?.took ?? 0) / 1000)
    if (e?.partial) this.log(`[strings] the ${name} Shortcut ran for ${secs} s and then said "partially succeeded": the lights changed, but something else in its Home scene is not answering. In the Home app, open that scene and take out whatever shows No Response (or make it again with only the Holiday Lights in it). The game does not wait on it.`)
    else this.log(`[strings] the ${name} Shortcut did not finish after ${secs} s (${e?.message ?? 'no reason'}); the lights may still have changed, and the phones carry the colour`)
  }

  // Every Shortcut still running has finished (for --check-strings).
  idle() { return Promise.allSettled([...this.pending]) }
  running() { return this.pending.size }
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
