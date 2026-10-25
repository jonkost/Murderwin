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
// each a single Home action on the Holiday Lights), with STRINGS_SHORTCUTS=on
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
export const STRING_SHORTCUTS = { red: 'Murderwin Strings Red', green: 'Murderwin Strings Green', decor: 'Murderwin Strings Decor' }

// The mirror's colours when the strings go through Shortcuts.
export function shortcutColours(names = STRING_SHORTCUTS) {
  return Object.fromEntries(Object.entries(names).map(([colour, name]) => [colour, { shortcut: name }]))
}

// Run one shortcut by name with macOS's own `shortcuts` tool; rejects when it
// is missing or fails, so the mirror says once that the strings did not answer.
export function runShortcut(name, { timeoutMs = 8000, execFileImpl = execFile } = {}) {
  return new Promise((resolve, reject) => {
    execFileImpl('shortcuts', ['run', name], { timeout: timeoutMs }, err => (err ? reject(new Error(`shortcut ${name}: ${err.code ?? err.message}`)) : resolve()))
  })
}

export class ShortcutLights {
  constructor({ run = runShortcut, timeoutMs = 8000 } = {}) {
    this.run = run
    this.timeoutMs = timeoutMs
  }

  async show(setting) {
    if (!setting?.shortcut) throw new Error('string lights: no shortcut for that colour')
    await this.run(setting.shortcut, { timeoutMs: this.timeoutMs })
  }
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
