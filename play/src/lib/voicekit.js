// Playing a pet's voice on a phone or a room screen (lib/petvoice.js says
// which file goes with which words). The files go through the page's one
// sound (lib/soundkit.js), so the same tap that wakes the chimes wakes the
// voices, and an iPhone on silent still speaks.
//
// Nothing here throws, and nothing waits on a sound: a file that is not
// there, a page nobody has tapped, a browser with no sound, all end the same
// way, quietly. &mute=1 in the address keeps it silent, for trying a screen
// without waking the house.
import { audioContext, soundReady } from './soundkit.js'
import { wakeSound } from './cueSounds.js'

const buffers = new Map() // url -> Promise of an AudioBuffer, or of null when there is no such voice
let speaking = null       // the voice that is talking now, so a new one can cut in

const muted = () => {
  try { return new URLSearchParams(globalThis.window?.location?.search ?? '').get('mute') === '1' } catch { return false }
}

function decode(ctx, data) {
  return new Promise((resolve, reject) => {
    try {
      const p = ctx.decodeAudioData(data, resolve, reject)
      if (p?.then) p.then(resolve, reject)
    } catch (e) { reject(e) }
  })
}

// One voice file, fetched and decoded once. null when it is not there (the
// site answers a missing file with its own page, which is not a sound).
export function voiceBuffer(url, { fetchImpl = globalThis.fetch, ctx = audioContext() } = {}) {
  if (!url || !ctx || typeof fetchImpl !== 'function') return Promise.resolve(null)
  if (!buffers.has(url)) {
    buffers.set(url, (async () => {
      try {
        const res = await fetchImpl(url)
        if (!res?.ok) return null
        if (/text\/html/i.test(String(res.headers?.get?.('content-type') ?? ''))) return null
        return await decode(ctx, await res.arrayBuffer())
      } catch { buffers.delete(url); return null } // a dropped connection: asked for again the next time it is wanted
    })())
  }
  return buffers.get(url)
}

// Is there a voice for any of these lines? (It also fetches them, so the
// first word comes at once when it is asked for.)
export async function hasVoice(urls, opts) {
  const found = await Promise.all((urls ?? []).map(u => voiceBuffer(u, opts)))
  return found.some(Boolean)
}

export function stopVoice() {
  const was = speaking
  speaking = null
  try { was?.stop() } catch { /* already done */ }
}

// Say these files, one after another. Resolves to the seconds it will take,
// or 0 when nothing was said (no voice, or the page's sound is asleep).
// `wake` is for a press: it wakes the page's sound first.
export async function sayVoices(urls, { gapMs = 350, wake = false, ctx = audioContext(), fetchImpl = globalThis.fetch, w = globalThis.window } = {}) {
  try {
    if (!ctx) return 0
    if (wake && !soundReady()) await wakeSound(w)
    const found = (await Promise.all((urls ?? []).map(u => voiceBuffer(u, { fetchImpl, ctx })))).filter(Boolean)
    if (!found.length || ctx.state !== 'running') return 0
    stopVoice()
    const gain = ctx.createGain()
    gain.gain.value = muted() ? 0 : 1
    gain.connect(ctx.destination)
    let at = ctx.currentTime + 0.06
    const sources = found.map(buffer => {
      const src = ctx.createBufferSource()
      src.buffer = buffer
      src.connect(gain)
      src.start(at)
      at += buffer.duration + gapMs / 1000
      return src
    })
    const me = { stop() { for (const s of sources) { try { s.stop() } catch { /* never started, or over */ } } try { gain.disconnect() } catch { /* gone */ } } }
    speaking = me
    sources.at(-1).onended = () => { if (speaking === me) speaking = null; try { gain.disconnect() } catch { /* gone */ } }
    return Math.max(0, at - ctx.currentTime - gapMs / 1000)
  } catch { return 0 }
}

// A cat speaks by itself only on the phone that has just come to its door:
// the scan of its code (or "Cannot scan? I am with ...") arms that cat's voice
// on this phone for a short while, and the card that arrives takes it. A
// card that reaches a phone any other way never speaks by itself: a guest
// the house moved on after four minutes without ever leaving the Parlour,
// the notes left at supper, a card met again after a reload. (12 Nov 2026:
// Act 2 is for the guest's ears only.)
export const ARM_MS = 45_000
let armed = null // { who, until }
export function armVoice(who, now = Date.now()) {
  armed = who ? { who, until: now + ARM_MS } : null
}
export function takeArmedVoice(who, now = Date.now()) {
  const mine = !!armed && armed.who === who && now <= armed.until
  if (mine) armed = null
  return mine
}

// For the tests: forget what was fetched and armed.
export function resetVoices() { buffers.clear(); stopVoice(); armed = null }
