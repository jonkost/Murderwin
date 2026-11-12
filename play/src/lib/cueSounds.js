// The house's cue sounds, played by every room screen and every phone
// (handoff 11 Nov 2026, A2 layer 1: "the screens and phones are speakers").
// Jon: "It was hard to hear the chimes." "The game just kind of felt quiet."
// Until now a cue's sound came from one place, the brain's own speakers, a
// second late; the phones made no sound at any cue, and a room screen made
// one soft beep. Now the moment the night calls a cue (nights/{id}/public/
// sounds.current changes), every page that has been tapped plays it itself,
// at full volume, and all of them start together.
//
// No React and no Firebase here, so play/test can run it under node --test.
// The hook that feeds it is lib/useCueSounds.js. It shares the page's one
// AudioContext with the house's sound kit (lib/soundkit.js).
//
// Any phone may read public/sounds, and every phone plays the same cue at the
// same moment whatever its role, so no sound is ever a tell.
//
// What a cue plays, in order of choice:
//   1. its own file, when one is on the site: play/public/sound/<id>.mp3
//      (written by `npm run media-import`; not kept in git, like the videos),
//      or for the blackout Jon's scream, which is already there
//      (play/public/audio/Scream.mp3). A file is trimmed of the silence in
//      front of it and brought up to full level here, so a quiet recording is
//      as loud as a loud one;
//   2. a fuller sound made in code (CUE_FIGURES): three warm notes for the
//      chime, a newsroom sounder, two small barks and a bell for Sir Irwin, a
//      sting for the study solved, the door, the reveal and the result, and a
//      low boom for a blackout with no file.
// Never a W-O-O-F News recording: those stay on the brain (the seal).

import { SOUNDS, audioContext, unlock, soundReady } from './soundkit.js'

// The nine cue ids: a copy of functions/lib/screen.js SOUND_IDS (the brain
// has one too, cues/lib/cues.js). A test checks the three agree.
export const CUE_IDS = ['chime-news', 'sounder-bulletin', 'chime-irwin', 'sting-solved', 'sting-door', 'sting-reveal', 'sting-result', 'blackout', 'chime-phone']

// ---- the sounds made in code -------------------------------------------------
// A voice is the sound kit's: { w: wave, f: hertz, to: hertz it slides to,
// t: start (s), d: length (s), g: peak loudness, a: attack (s), lp: low-pass
// (Hz) }, or a puff of noise { n: 1, t, d, g, bp: band-pass (Hz), lp }.
const bell = (f, t, d, g) => [
  { w: 'sine', f, t, d, g },
  { w: 'sine', f: f * 2, t, d: d * 0.5, g: g * 0.34 },
  { w: 'sine', f: f * 3.01, t, d: d * 0.28, g: g * 0.14 },
]
const brass = (f, t, d, g) => [
  { w: 'sawtooth', f, t, d, g, a: 0.03, lp: 2400 },
  { w: 'triangle', f: f / 2, t, d, g: g * 0.55, a: 0.03 },
]

export const CUE_FIGURES = {
  // "look at your phone": the kit's three warm notes, so the house has one chime
  chime: SOUNDS.chime,
  // the news: a wire ticker, then three rising notes that hold
  news: [
    ...[0, 1, 2, 3, 4, 5].map(i => ({ w: 'square', f: i % 2 ? 932.3 : 880, t: i * 0.085, d: 0.06, g: 0.2, a: 0.004, lp: 3200 })),
    ...brass(587.3, 0.58, 0.2, 0.44), ...brass(784, 0.76, 0.2, 0.46), ...brass(987.8, 0.94, 0.9, 0.55),
    ...bell(1975.5, 0.94, 0.9, 0.28),
  ],
  // bulletin 2's sounder, for a night the brain is not there to speak it
  sounder: [
    ...brass(392, 0, 0.17, 0.44), ...brass(523.3, 0.16, 0.17, 0.44), ...brass(659.3, 0.32, 0.17, 0.46), ...brass(784, 0.48, 0.9, 0.55),
    ...bell(1568, 0.48, 1.0, 0.26),
  ],
  // Sir Irwin has something to say: two small barks, then a happy bell
  irwin: [
    { w: 'triangle', f: 340, to: 215, t: 0, d: 0.13, g: 0.65, a: 0.006 },
    { n: 1, t: 0, d: 0.05, g: 0.3, bp: 1100 },
    { w: 'triangle', f: 385, to: 240, t: 0.19, d: 0.13, g: 0.65, a: 0.006 },
    { n: 1, t: 0.19, d: 0.05, g: 0.3, bp: 1250 },
    ...bell(659.3, 0.44, 0.5, 0.5), ...bell(784, 0.6, 0.5, 0.5), ...bell(1046.5, 0.76, 1.1, 0.58),
  ],
  // the study is solved: a quick run up, and a bright chord on top
  solved: [
    ...[523.3, 659.3, 784, 1046.5, 1318.5].map((f, i) => ({ w: 'triangle', f, t: i * 0.07, d: 0.2, g: 0.5 })),
    ...brass(1046.5, 0.38, 1.0, 0.32), ...brass(1318.5, 0.38, 1.0, 0.28), ...brass(784, 0.38, 1.0, 0.28),
    ...bell(2093, 0.38, 1.2, 0.5),
  ],
  // the door opens: the latch, three rising notes, and a chord that rings
  door: [
    { w: 'sine', f: 110, to: 52, t: 0, d: 0.36, g: 0.95 },
    { n: 1, t: 0, d: 0.09, g: 0.5, lp: 800 },
    ...brass(392, 0.3, 0.2, 0.42), ...brass(523.3, 0.5, 0.2, 0.42), ...brass(659.3, 0.7, 0.2, 0.44),
    ...brass(523.3, 0.92, 1.7, 0.26), ...brass(784, 0.92, 1.7, 0.3), ...brass(1046.5, 0.92, 1.7, 0.32),
    ...bell(2093, 0.92, 1.5, 0.28), ...bell(1568, 1.22, 1.3, 0.2),
  ],
  // the reveal begins: a rumble that swells, then one dark chord
  reveal: [
    { w: 'sawtooth', f: 55, t: 0, d: 1.35, g: 0.5, a: 1.0, lp: 320 },
    { w: 'triangle', f: 110, t: 0, d: 1.35, g: 0.4, a: 1.05 },
    { n: 1, t: 0.2, d: 1.15, g: 0.2, a: 0.95, lp: 1400 },
    { w: 'sine', f: 84, to: 40, t: 1.32, d: 0.55, g: 0.95 },
    ...brass(220, 1.32, 1.4, 0.42), ...brass(261.6, 1.32, 1.4, 0.36), ...brass(329.6, 1.32, 1.4, 0.36), ...brass(440, 1.32, 1.4, 0.3),
  ],
  // everyone's result: four notes up and a full bright chord
  result: [
    ...brass(392, 0, 0.22, 0.44), ...brass(523.3, 0.2, 0.22, 0.46), ...brass(659.3, 0.4, 0.22, 0.48), ...brass(784, 0.6, 0.32, 0.55),
    ...brass(523.3, 0.96, 1.7, 0.26), ...brass(659.3, 0.96, 1.7, 0.26), ...brass(784, 0.96, 1.7, 0.28), ...brass(1046.5, 0.96, 1.7, 0.34),
    ...bell(2093, 0.96, 1.5, 0.3), ...bell(1568, 1.16, 1.3, 0.22),
  ],
  // a blackout with no scream on the site: a hard low boom, a crash, a falling wail
  boom: [
    { w: 'sine', f: 95, to: 30, t: 0, d: 1.6, g: 1 },
    { w: 'triangle', f: 190, to: 60, t: 0, d: 1.1, g: 0.7 },
    { n: 1, t: 0, d: 0.5, g: 0.9, lp: 2200 },
    { n: 1, t: 0.05, d: 1.4, g: 0.35, lp: 600 },
    { w: 'sawtooth', f: 900, to: 120, t: 0.02, d: 1.2, g: 0.32, lp: 2600 },
  ],
}

// Each cue: the files to try, in order, under the site's own folder, and the
// figure it plays when none is there.
export const CUE_SOUND = {
  'chime-phone': { files: ['sound/chime-phone.mp3'], figure: 'chime' },
  'chime-news': { files: ['sound/chime-news.mp3'], figure: 'news' },
  'sounder-bulletin': { files: ['sound/sounder-bulletin.mp3'], figure: 'sounder' },
  'chime-irwin': { files: ['sound/chime-irwin.mp3'], figure: 'irwin' },
  'sting-solved': { files: ['sound/sting-solved.mp3'], figure: 'solved' },
  'sting-door': { files: ['sound/sting-door.mp3'], figure: 'door' },
  'sting-reveal': { files: ['sound/sting-reveal.mp3'], figure: 'reveal' },
  'sting-result': { files: ['sound/sting-result.mp3'], figure: 'result' },
  blackout: { files: ['sound/blackout.mp3', 'audio/Scream.mp3'], figure: 'boom' },
}

// How long a figure lasts, in milliseconds.
export function figureMs(name) {
  return Math.round(1000 * (CUE_FIGURES[name] ?? []).reduce((end, v) => Math.max(end, v.t + v.d), 0))
}

// ---- when a cue is due --------------------------------------------------------

// Every device starts a cue this long after its stamp, on the server's
// clock: long enough for the news of it to reach a room of phones, so they
// sound as one chime and not a ragged run. A cue stamped ahead of time (the
// blackout's scream) starts this long after its stamp too.
export const CUE_LEAD_MS = 350
// A device that hears of a cue later than this stays quiet: a phone that was
// asleep must not chime ten seconds after the room.
export const CUE_LATE_MS = 3000
// A stamp further ahead than this is not believed.
export const CUE_AHEAD_MS = 15_000

export function ms(t) {
  if (!t) return 0
  if (typeof t.toMillis === 'function') return t.toMillis()
  if (t instanceof Date) return t.getTime()
  return Number(t) || 0
}

// One word for the cue on the doc (null when there is none): a cue is new
// when this changes.
export function cueKeyOf(sounds) {
  const cur = sounds?.current
  const at = ms(cur?.at)
  return cur && at ? `${cur.id ?? 'clips'}@${at}` : null
}

// Is there a cue for this page to play? null, or { id, key, waitMs }: start
// it waitMs from now. `lastKey` is the cue this page last dealt with; `now`
// is the server's clock. Nothing for:
//   - the first thing a page reads (`first`): whatever was on the doc when it
//     opened is old news;
//   - the same cue twice, recordings with no cue sound, an id it does not know;
//   - a cue with recordings that are not video: the brain speaks that one, so
//     it plays the sound itself and the recordings after it (bulletin 2);
//   - the Parlour TV (`tv`) when the cue's recordings play there as video:
//     its own film answers it, and a chime over the first words would smear them;
//   - a cue heard of more than CUE_LATE_MS late, or stamped too far ahead.
export function cueDue(lastKey, sounds, now, { first = false, tv = false } = {}) {
  const cur = sounds?.current
  const key = cueKeyOf(sounds)
  if (!key || first || key === lastKey) return null
  if (!cur.id || !CUE_IDS.includes(cur.id)) return null
  const clips = Array.isArray(cur.clips) ? cur.clips.length : 0
  const video = cur.video === true
  if (clips && !video) return null
  if (video && tv) return null
  // a cue the server stamped ahead (`ahead`: the blackout's scream, written at the press for the dark mark;
  // review 12 Nov 2026) starts on its stamp exactly: every page has it in hand already, so no lead is needed
  const ahead = cur.ahead === true
  const startAt = ms(cur.at) + (ahead ? 0 : CUE_LEAD_MS)
  if (now - startAt > CUE_LATE_MS) return null
  if (startAt - now > CUE_AHEAD_MS) return null
  return { id: cur.id, key, waitMs: Math.max(0, startAt - now), ...(ahead ? { ahead: true } : {}) }
}

// What a page remembers about cues, and what it does when its view of the
// sounds doc changes. `memory` is { scope, heard }: the night it has taken
// its starting point from (undefined before any) and the last cue it dealt
// with. Returns the new memory and the cue to play, if any.
//   - nothing until the doc has been read (`loaded`);
//   - the first read of a night is the starting point: whatever cue was on
//     the doc then is old news and is never played, so a page that reloads in
//     the middle of the night stays quiet until the next cue. (A cue that
//     comes after that first read plays even if it is the night's first: the
//     old bell skipped the first cue every screen ever saw.);
//   - a `silent` page (the brain's own browser, a second display) plays
//     nothing and still keeps track, so it can never play an old cue later.
//   - one exception to the first read: a cue stamped ahead whose moment is
//     still to come (the blackout's scream, on a page that reloads in the
//     lead) is not old news, and plays at its stamp like everywhere else.
export const NO_CUES_YET = Object.freeze({ scope: undefined, heard: null })
export function cueStep(memory, { loaded = false, sounds = null, scope = null, now = Date.now(), silent = false, tv = false } = {}) {
  if (!loaded) return { memory, due: null }
  const key = cueKeyOf(sounds)
  latestKey = key
  if (memory.scope !== scope) {
    const early = !silent && sounds?.current?.ahead === true && ms(sounds.current.at) > now ? cueDue(null, sounds, now, { tv }) : null
    return { memory: { scope, heard: key }, due: hold(early) }
  }
  if (key === memory.heard) return { memory, due: null }
  const due = silent ? null : cueDue(memory.heard, sounds, now, { tv })
  return { memory: { scope, heard: key }, due: hold(due) }
}

// A cue stamped ahead is held until just before its moment and played only if
// the sounds doc still names it then: a blackout called off in its lead (a
// pause) writes a fresh record, and the scream is let go (review 12 Nov 2026).
// The page's last view of the doc is kept here by cueStep.
export const AHEAD_ARM_MS = 250 // the sound is handed to the speaker this long before its moment
let latestKey = null
let heldAhead = null // { id, key } of the cue stamped ahead that cueStep last handed out
function hold(due) {
  heldAhead = due?.ahead ? { id: due.id, key: due.key } : null
  return due
}
export function stillWanted(key) { return latestKey === key }

// ---- the page's cue player ----------------------------------------------------

// A file's sound, once decoded: where it really starts (the silence in front
// is skipped: the brain's copies carry a second of it, and Jon's scream a
// third of one) and how much louder to play it (its loudest moment is
// brought to 0.9 of full, up to four times over). `channels` is a list of
// Float32Arrays. Pure, so the tests can check it.
export const SILENCE_LEVEL = 0.004 // about 48 dB below full
export function trimAndGain(channels, sampleRate) {
  let peak = 0
  let first = -1
  const length = channels.reduce((n, c) => Math.max(n, c.length), 0)
  for (let i = 0; i < length; i++) {
    let v = 0
    for (const c of channels) { const x = Math.abs(c[i] ?? 0); if (x > v) v = x }
    if (v > peak) peak = v
    if (first < 0 && v > SILENCE_LEVEL) first = i
  }
  if (first < 0 || peak <= 0) return { offset: 0, gain: 1, silent: true }
  const lead = Math.floor(sampleRate * 0.005) // five milliseconds kept, so the start is never clipped
  return { offset: Math.max(0, first - lead) / sampleRate, gain: Math.min(4, 0.9 / peak), silent: false }
}

const files = new Map() // cue id -> { buffer, offset, gain }
let loading = null
let bus = null          // { ctx, input }: one way out for every cue, through a limiter
let noise = null

// Loudness for every cue made here; a test checks the chime is at least
// twice the old beeps' (0.25).
function cueBus(ctx) {
  if (bus?.ctx === ctx) return bus.input
  const limiter = ctx.createDynamicsCompressor()
  limiter.threshold.value = -9
  limiter.knee.value = 6
  limiter.ratio.value = 8
  limiter.attack.value = 0.003
  limiter.release.value = 0.2
  const input = ctx.createGain()
  input.gain.value = 1
  input.connect(limiter).connect(ctx.destination)
  bus = { ctx, input }
  return input
}

function noiseBuffer(ctx) {
  if (noise && noise.sampleRate === ctx.sampleRate) return noise
  noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate)
  const data = noise.getChannelData(0)
  let s = 22222 // a fixed little generator, so the puff is the same every time
  for (let i = 0; i < data.length; i++) { s = (s * 16807) % 2147483647; data[i] = (s / 2147483647) * 2 - 1 }
  return noise
}

// Start a figure's voices at t0 on the audio clock (the sound kit's own
// recipe, with a start time: lib/soundkit.js play() can only start now).
function startVoices(ctx, out, voices, t0) {
  for (const v of voices) {
    const start = t0 + v.t
    const end = start + v.d
    const g = ctx.createGain()
    const peak = Math.max(0.0001, Math.min(1, v.g))
    g.gain.setValueAtTime(0.0001, start)
    g.gain.exponentialRampToValueAtTime(peak, start + Math.min(v.a ?? 0.005, v.d * 0.9))
    g.gain.exponentialRampToValueAtTime(0.0001, end)
    let src
    if (v.n) {
      src = ctx.createBufferSource()
      src.buffer = noiseBuffer(ctx)
      src.loop = true
    } else {
      src = ctx.createOscillator()
      src.type = v.w ?? 'sine'
      src.frequency.setValueAtTime(v.f, start)
      if (v.to) src.frequency.exponentialRampToValueAtTime(v.to, end)
    }
    let node = src
    if (v.bp) { const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = v.bp; f.Q.value = 1.2; node.connect(f); node = f }
    if (v.lp) { const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = v.lp; node.connect(f); node = f }
    node.connect(g).connect(out)
    src.start(start)
    src.stop(end + 0.03)
  }
}

function startFile(ctx, out, entry, t0) {
  const src = ctx.createBufferSource()
  src.buffer = entry.buffer
  const g = ctx.createGain()
  g.gain.value = entry.gain
  src.connect(g).connect(out)
  src.start(t0, entry.offset)
}

// What a cue will play on this page right now: 'file' or its figure's name.
export function cueSource(id) {
  if (!CUE_SOUND[id]) return null
  return files.has(id) ? 'file' : CUE_SOUND[id].figure
}

// Fetch and decode every cue's file that is on the site, once a page. A file
// that is not there (the site answers with its own page, or a 404), or that
// will not decode, is simply left out: that cue plays its figure. Never
// throws; resolves to how many files it holds.
export function loadCueFiles({ base = '/play/', fetchImpl = globalThis.fetch, ctx = audioContext() } = {}) {
  if (loading) return loading
  if (!ctx || typeof fetchImpl !== 'function') return Promise.resolve(0)
  const decode = data => new Promise((resolve, reject) => {
    try {
      const p = ctx.decodeAudioData(data, resolve, reject)
      if (p?.then) p.then(resolve, reject)
    } catch (e) { reject(e) }
  })
  const one = async (id) => {
    for (const path of CUE_SOUND[id].files) {
      try {
        const res = await fetchImpl(`${base}${path}`)
        if (!res?.ok) continue
        const type = String(res.headers?.get?.('content-type') ?? '')
        if (/text\/html/i.test(type)) continue // not a sound: the site's own page, sent for a file that is not there
        const buffer = await decode(await res.arrayBuffer())
        const channels = []
        for (let c = 0; c < buffer.numberOfChannels; c++) channels.push(buffer.getChannelData(c))
        const { offset, gain, silent } = trimAndGain(channels, buffer.sampleRate)
        if (silent) continue
        files.set(id, { buffer, offset, gain })
        return
      } catch { /* not there, or not a sound: the next one, or the figure */ }
    }
  }
  loading = Promise.all(CUE_IDS.map(one)).then(() => files.size, () => files.size)
  return loading
}

// From a tap, or when the page comes back to the front: wake the page's
// sound. 'ok', 'denied' or 'none' (this device has no sound). The kit's
// unlock does the work (and sets an iPhone to play with its ring switch on
// silent); on top of it this resumes a context an iPhone has "interrupted"
// (back from the lock screen), and plays one silent sample, the oldest way
// there is to unlock a phone's sound and harmless everywhere else.
export const WAKE_WAIT_MS = 1500 // how long to wait for the browser's answer before reading the sound's state
export async function wakeSound(w = globalThis.window) {
  const ctx = audioContext(w)
  if (!ctx) return 'none'
  const asked = unlock(w) // not awaited yet: a browser may hold its answer until the page is tapped
  try {
    if (ctx.state !== 'running' && ctx.state !== 'closed') ctx.resume?.()?.catch?.(() => {})
    const src = ctx.createBufferSource()
    src.buffer = ctx.createBuffer(1, 1, 22050)
    src.connect(ctx.destination)
    src.start(0)
  } catch { /* nothing to unlock with: the answer below says so */ }
  let timer = null
  const settled = await Promise.race([asked, new Promise(r => { timer = setTimeout(() => r(null), WAKE_WAIT_MS) })])
  clearTimeout(timer)
  if (settled === 'none') return 'none'
  return ctx.state === 'running' ? 'ok' : 'denied'
}

// Every page, once: the first tap or key anywhere wakes the page's sound,
// and so does every one after it while the sound is asleep (a phone that
// reloaded, or came back from its lock screen, gets its sound back at the
// next touch, not only at the Allow screen). A finger going down is not a
// tap to a browser, so the listeners are for the lift, the click and the
// key. Never removed.
export const WAKE_EVENTS = ['pointerup', 'touchend', 'click', 'keydown']
let installed = false
export function installUnlock(w = globalThis.window, d = globalThis.document) {
  if (installed || typeof w?.addEventListener !== 'function') return false
  installed = true
  const wake = () => { if (!soundReady()) wakeSound(w) }
  for (const e of WAKE_EVENTS) w.addEventListener(e, wake, { capture: true, passive: true })
  w.addEventListener('pageshow', wake)
  d?.addEventListener?.('visibilitychange', () => { if (d.visibilityState === 'visible') wake() })
  return true
}

// Play a cue on this page, `waitMs` from now. True when it was started or is
// waiting for the page's sound to wake (it gives up, quietly, CUE_LATE_MS
// after its moment). Nothing here throws: a page with no sound stays quiet.
export function playCue(id, { waitMs = 0, w = globalThis.window, now = () => globalThis.performance?.now?.() ?? Date.now(), timer = setTimeout } = {}) {
  const spec = CUE_SOUND[id]
  const ctx = audioContext(w)
  if (!spec || !ctx) return false
  const dueAt = now() + Math.max(0, waitMs)
  // a cue stamped ahead (cueStep's hold, above): wait until just before its moment, then play it only if the
  // doc still names it, so a scream called off in the blackout's lead never sounds
  const held = heldAhead?.id === id ? heldAhead : null
  if (held && waitMs > AHEAD_ARM_MS) {
    heldAhead = null
    timer(() => { if (stillWanted(held.key)) playCue(id, { waitMs: Math.max(0, dueAt - now()), w, now, timer }) }, waitMs - AHEAD_ARM_MS)
    return true
  }
  if (held) heldAhead = null
  const start = () => {
    try {
      const out = cueBus(ctx)
      const t0 = ctx.currentTime + Math.max(0.02, (dueAt - now()) / 1000)
      const file = files.get(id)
      if (file) startFile(ctx, out, file, t0)
      else startVoices(ctx, out, CUE_FIGURES[spec.figure] ?? [], t0)
      return true
    } catch { return false }
  }
  if (ctx.state === 'running') return start()
  // asleep: ask it to wake, and look again a few times before the cue is too old to play
  wakeSound(w)
  const look = () => {
    if (ctx.state === 'running') { start(); return }
    if (now() - dueAt > CUE_LATE_MS) return
    timer(look, 120)
  }
  timer(look, 120)
  return true
}

// For the tests: forget what this page has loaded and made.
export function resetCueSounds() {
  files.clear()
  loading = null
  bus = null
  noise = null
  installed = false
  latestKey = null
  heldAhead = null
}
