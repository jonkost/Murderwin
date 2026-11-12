import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import {
  CUE_IDS, CUE_SOUND, CUE_FIGURES, figureMs, cueDue, cueKeyOf, cueStep, NO_CUES_YET, CUE_LEAD_MS, CUE_LATE_MS, CUE_AHEAD_MS,
  trimAndGain, SILENCE_LEVEL, loadCueFiles, cueSource, playCue, wakeSound, installUnlock, WAKE_EVENTS, resetCueSounds,
} from '../src/lib/cueSounds.js'
import { SOUNDS, soundReady } from '../src/lib/soundkit.js'
import { unlockSound, chime, allowAll } from '../src/lib/permissions.js'
import { SOUND_IDS as SERVER_IDS } from '../../functions/lib/screen.js'
import { SOUND_IDS as BRAIN_IDS } from '../../cues/lib/cues.js'

// Handoff 11 Nov 2026, A2 layer 1: "the screens and phones are speakers". Jon: "It was hard to hear the
// chimes." "The game just kind of felt quiet." Until now a cue's sound came from the brain's own speakers
// alone, a second late; no phone made a sound at any cue, and a room screen made one soft beep. Now every
// phone and every room screen plays the cue itself, loud, the moment the night calls it.

const read = p => readFileSync(new URL(p, import.meta.url), 'utf8')
const NOW = 1_800_000_000_000
const cue = (id, at = NOW, more = {}) => ({ current: { id, at, ...more } })
const settle = async (n = 4) => { for (let i = 0; i < n; i++) await new Promise(r => setImmediate(r)) }

// ---- the rules of when: pure ---------------------------------------------------

test('the nine cue ids are the server\'s and the brain\'s, and each has a file to try and a sound made in code behind it', () => {
  assert.deepEqual(CUE_IDS, SERVER_IDS, 'play/src/lib/cueSounds.js and functions/lib/screen.js agree')
  assert.deepEqual(CUE_IDS, BRAIN_IDS, 'and so does the brain (cues/lib/cues.js)')
  assert.deepEqual(Object.keys(CUE_SOUND).sort(), [...CUE_IDS].sort())
  for (const id of CUE_IDS) {
    const spec = CUE_SOUND[id]
    assert.equal(spec.files[0], `sound/${id}.mp3`, `${id}: its own file first, named after its id`)
    assert.ok(CUE_FIGURES[spec.figure]?.length >= 3, `${id}: a sound made in code when no file is on the site`)
  }
  assert.deepEqual(CUE_SOUND.blackout.files, ['sound/blackout.mp3', 'audio/Scream.mp3'], 'the blackout: Jon\'s scream is already on the site, so it needs no new file')
  assert.ok(readdirSync(new URL('../public/audio/', import.meta.url)).includes('Scream.mp3'), 'and the file is there, tracked')
  // never a W-O-O-F News recording: those stay on the brain
  const everyFile = Object.values(CUE_SOUND).flatMap(s => s.files).join(' ')
  for (const word of ['bulletin2', 'newsflash', 'woof']) assert.ok(!everyFile.includes(word), `no ${word} recording is ever asked for`)
  // the figures: each its own, the chime the house's one chime, each loud, each a length a room can take
  assert.equal(CUE_FIGURES.chime, SOUNDS.chime, 'the phone chime is the kit\'s three warm notes: one chime for the house')
  assert.equal(new Set(Object.values(CUE_SOUND).map(s => s.figure)).size, CUE_IDS.length, 'nine cues, nine different sounds')
  for (const [name, voices] of Object.entries(CUE_FIGURES)) {
    assert.ok(Math.max(...voices.map(v => v.g)) >= 0.5, `${name}: at least twice as loud as the old beeps (0.25 and 0.3)`)
    assert.ok(figureMs(name) >= 900 && figureMs(name) <= 3200, `${name} lasts ${figureMs(name)} ms: fuller than a third of a second, never long`)
    for (const v of voices) {
      assert.ok(v.g > 0 && v.g <= 1 && v.d > 0 && v.t >= 0, `${name}: every voice is audible and has a length`)
      assert.ok(v.n === 1 || (v.f >= 40 && v.f <= 7000), `${name}: a tone a speaker can play`)
      if (v.a) assert.ok(v.a < v.d, `${name}: the attack fits inside the note`)
    }
    assert.ok(voices.some(v => v.n === 1 || v.f >= 300), `${name}: something a phone's small speaker can carry`)
  }
  assert.equal(figureMs('nothing'), 0)
})

test('when a cue is due: every device starts it together, a moment after its stamp; an old one, a doubled one, the brain\'s own and the TV\'s film are left alone', () => {
  assert.equal(CUE_LEAD_MS, 350)
  assert.equal(CUE_LATE_MS, 3000)
  const key = cueKeyOf(cue('chime-phone'))
  assert.equal(key, `chime-phone@${NOW}`)
  assert.equal(cueKeyOf(null), null)
  assert.equal(cueKeyOf({ current: { id: 'chime-phone' } }), null, 'no stamp: no cue')
  assert.equal(cueKeyOf({ current: { id: null, at: NOW, clips: ['x'] } }), `clips@${NOW}`)
  // heard at once: it waits for the shared moment
  assert.deepEqual(cueDue(null, cue('chime-phone'), NOW), { id: 'chime-phone', key, waitMs: CUE_LEAD_MS })
  assert.deepEqual(cueDue(null, cue('chime-phone'), NOW + 200), { id: 'chime-phone', key, waitMs: 150 }, 'a phone that heard 200 ms later starts at the same moment')
  assert.equal(cueDue(null, cue('chime-phone'), NOW + 2000).waitMs, 0, 'two seconds late: at once')
  assert.equal(cueDue(null, cue('chime-phone'), NOW + CUE_LEAD_MS + CUE_LATE_MS).waitMs, 0, 'at the edge: still plays')
  assert.equal(cueDue(null, cue('chime-phone'), NOW + CUE_LEAD_MS + CUE_LATE_MS + 1), null, 'later than that: a phone that was asleep stays quiet')
  assert.equal(cueDue(null, cue('chime-phone'), NOW + 4000), null, 'four seconds late: nothing')
  // a Firestore Timestamp and a Date both read
  assert.equal(cueDue(null, { current: { id: 'sting-door', at: { toMillis: () => NOW } } }, NOW).id, 'sting-door')
  assert.equal(cueDue(null, { current: { id: 'sting-door', at: new Date(NOW) } }, NOW).id, 'sting-door')
  // a cue stamped ahead of time (the blackout's scream, timed to the dark) waits for its moment
  assert.equal(cueDue(null, cue('blackout', NOW + 2000), NOW).waitMs, 2000 + CUE_LEAD_MS)
  assert.equal(cueDue(null, cue('blackout', NOW + CUE_AHEAD_MS + 1), NOW), null, 'a stamp too far ahead is not believed')
  // the same cue twice, and the first thing a page reads
  assert.equal(cueDue(key, cue('chime-phone'), NOW), null, 'the same cue again: nothing')
  assert.equal(cueDue(null, cue('chime-phone'), NOW, { first: true }), null, 'what was on the doc when the page opened is old news')
  assert.equal(cueDue(key, cue('chime-phone', NOW + 5000), NOW + 5000).id, 'chime-phone', 'the same sound re-sent with a new stamp plays again')
  // nothing to play, or nothing this page knows
  assert.equal(cueDue(null, null, NOW), null)
  assert.equal(cueDue(null, {}, NOW), null)
  assert.equal(cueDue(null, cue('7F3A'), NOW), null, 'an id outside the catalogue')
  assert.equal(cueDue(null, { current: { id: null, at: NOW, clips: ['a'] } }, NOW), null, 'recordings alone carry no cue sound')
  // bulletin 2: the brain speaks it, so it plays the sounder itself; here it would be heard twice
  assert.equal(cueDue(null, cue('sounder-bulletin', NOW, { clips: ['c1', 'c2', 'c3'] }), NOW), null)
  assert.equal(cueDue(null, cue('sounder-bulletin'), NOW).id, 'sounder-bulletin', 'with no recordings behind it (the sound check), the screens and phones play it')
  assert.equal(cueDue(null, cue('chime-news', NOW, { clips: ['c1'] }), NOW), null, 'bulletin 1 as sound, not video: the brain speaks that too')
  // bulletin 1 as video: every phone and room screen chimes, the TV does not chime over its own film
  const news = cue('chime-news', NOW, { clips: ['c1', 'c2'], video: true })
  assert.equal(cueDue(null, news, NOW).id, 'chime-news', 'a phone, or any other room screen')
  assert.equal(cueDue(null, news, NOW, { tv: true }), null, 'the Parlour TV')
  assert.equal(cueDue(null, cue('chime-phone'), NOW, { tv: true }).id, 'chime-phone', 'the TV plays every other cue')
  // every id plays on a phone
  for (const id of CUE_IDS) assert.equal(cueDue(null, cue(id), NOW).id, id)
})

test('what a page remembers: its first read of a night is the starting point, the next cue plays even if it is the night\'s first, and nothing ever plays twice', () => {
  let m = NO_CUES_YET
  const step = (o) => { const r = cueStep(m, { scope: 'n1', now: NOW, ...o }); m = r.memory; return r.due }
  assert.equal(step({ loaded: false, sounds: null }), null, 'not read yet')
  assert.equal(m, NO_CUES_YET)
  // the page opens on a night whose doc already holds a cue from a second ago: never played
  assert.equal(step({ loaded: true, sounds: cue('chime-phone', NOW - 1000) }), null, 'old news')
  assert.deepEqual(m, { scope: 'n1', heard: `chime-phone@${NOW - 1000}` })
  assert.equal(step({ loaded: true, sounds: cue('chime-phone', NOW - 1000) }), null, 'the same again (a re-render, React\'s double effect): nothing')
  // the next cue plays
  assert.deepEqual(step({ loaded: true, sounds: cue('sting-door', NOW), now: NOW + 100 }), { id: 'sting-door', key: `sting-door@${NOW}`, waitMs: 250 })
  assert.equal(step({ loaded: true, sounds: cue('sting-door', NOW), now: NOW + 200 }), null, 'once')
  // a page that opened before the night's first sound plays that first sound (the old bell skipped it)
  let fresh = NO_CUES_YET
  let r = cueStep(fresh, { loaded: true, sounds: null, scope: 'n1', now: NOW })
  assert.equal(r.due, null)
  assert.deepEqual(r.memory, { scope: 'n1', heard: null })
  r = cueStep(r.memory, { loaded: true, sounds: cue('chime-phone', NOW + 60_000), scope: 'n1', now: NOW + 60_100 })
  assert.equal(r.due.id, 'chime-phone', 'the sound test, the first sound of the night, is heard')
  // a cue that came while the page was asleep is remembered, not played
  r = cueStep(r.memory, { loaded: true, sounds: cue('chime-irwin', NOW + 120_000), scope: 'n1', now: NOW + 180_000 })
  assert.equal(r.due, null)
  assert.equal(r.memory.heard, `chime-irwin@${NOW + 120_000}`)
  // a new night: a new starting point, whatever the old night's doc still shows for a moment
  r = cueStep(r.memory, { loaded: true, sounds: cue('chime-irwin', NOW + 120_000), scope: 'n2', now: NOW + 200_000 })
  assert.equal(r.due, null)
  assert.equal(r.memory.scope, 'n2')
  r = cueStep(r.memory, { loaded: false, sounds: cue('chime-irwin', NOW + 120_000), scope: 'n2', now: NOW + 200_010 })
  assert.equal(r.due, null, 'while the new night\'s doc is on its way: nothing')
  r = cueStep(r.memory, { loaded: true, sounds: null, scope: 'n2', now: NOW + 200_500 })
  assert.equal(r.due, null)
  r = cueStep(r.memory, { loaded: true, sounds: cue('chime-phone', NOW + 300_000), scope: 'n2', now: NOW + 300_000 })
  assert.equal(r.due.id, 'chime-phone')
  // a silent page (the brain's own browser, a second display) never plays, and never plays late either
  let s = cueStep(NO_CUES_YET, { loaded: true, sounds: null, scope: 'n1', now: NOW, silent: true }).memory
  const quiet = cueStep(s, { loaded: true, sounds: cue('chime-phone', NOW), scope: 'n1', now: NOW, silent: true })
  assert.equal(quiet.due, null)
  assert.equal(quiet.memory.heard, `chime-phone@${NOW}`, 'it still keeps track')
  // the Parlour TV
  s = cueStep(NO_CUES_YET, { loaded: true, sounds: null, scope: 'n1', now: NOW, tv: true }).memory
  assert.equal(cueStep(s, { loaded: true, sounds: cue('chime-news', NOW, { clips: ['a'], video: true }), scope: 'n1', now: NOW, tv: true }).due, null)
})

test('a sound file is trimmed of the silence in front and brought up to full level, so a quiet recording is as loud as a loud one', () => {
  const rate = 1000
  const wave = (lead, level, n = 400) => Float32Array.from({ length: lead + n }, (_, i) => (i < lead ? 0 : (i % 2 ? level : -level)))
  // a second of silence in front (the brain's copies carry the pad), then a quiet sound
  const padded = trimAndGain([wave(1000, 0.3)], rate)
  assert.equal(padded.silent, false)
  assert.ok(Math.abs(padded.offset - 0.995) < 0.002, 'it starts five milliseconds before the first sound')
  assert.ok(Math.abs(padded.gain - 3) < 1e-6, '0.3 brought up to 0.9: three times')
  // Jon's scream: a third of a second of silence, a peak near half
  const scream = trimAndGain([wave(300, 0.46)], rate)
  assert.ok(Math.abs(scream.offset - 0.295) < 0.002)
  assert.ok(scream.gain > 1.9 && scream.gain < 2, 'about twice as loud')
  // a hot file is left about as it is; a very quiet one is lifted four times at most; hiss below the floor is not a start
  assert.ok(Math.abs(trimAndGain([wave(0, 1)], rate).gain - 0.9) < 1e-6)
  assert.equal(trimAndGain([wave(0, 0.01)], rate).gain, 4)
  assert.equal(trimAndGain([wave(0, 0.5)], rate).offset, 0, 'no silence in front: from the top')
  const hiss = Float32Array.from({ length: 600 }, (_, i) => (i < 300 ? SILENCE_LEVEL / 2 : 0.5))
  assert.ok(Math.abs(trimAndGain([hiss], rate).offset - 0.295) < 0.002)
  // two channels: the louder one decides
  assert.ok(Math.abs(trimAndGain([wave(100, 0.1), wave(50, 0.45)], rate).gain - 2) < 1e-6)
  assert.ok(Math.abs(trimAndGain([wave(100, 0.1), wave(50, 0.45)], rate).offset - 0.045) < 0.002)
  // nothing in it at all
  assert.deepEqual(trimAndGain([new Float32Array(500)], rate), { offset: 0, gain: 1, silent: true })
  assert.deepEqual(trimAndGain([], rate), { offset: 0, gain: 1, silent: true })
})

// ---- the page's sound: one AudioContext, woken by any tap ---------------------
// The kit keeps one context for the page, so these tests share one pretend page and run in order.

function pretendPage() {
  const made = []
  const param = () => {
    const p = { value: 0, sets: [] }
    for (const how of ['setValueAtTime', 'linearRampToValueAtTime', 'exponentialRampToValueAtTime', 'setTargetAtTime']) p[how] = (value, at) => { p.sets.push({ how, value, at }); return p }
    return p
  }
  const node = kind => {
    const n = {
      kind, frequency: param(), gain: param(), Q: param(), threshold: param(), knee: param(), ratio: param(), attack: param(), release: param(),
      outs: [], started: null, offset: null, stopped: null, buffer: null,
      connect(to) { n.outs.push(to); return to },
      start(at = 0, offset = 0) { n.started = at; n.offset = offset },
      stop(at = 0) { n.stopped = at },
    }
    made.push(n)
    return n
  }
  const page = { made, contexts: 0, ctx: null, wakes: true, decoded: [] }
  class AC {
    constructor() {
      page.contexts++
      page.ctx = this
      this.state = 'suspended'
      this.currentTime = 10
      this.sampleRate = 48000
      this.destination = { kind: 'speakers' }
      this.resumed = 0
    }
    createOscillator() { return node('note') }
    createBufferSource() { return node('source') }
    createGain() { return node('gain') }
    createBiquadFilter() { return node('filter') }
    createDynamicsCompressor() { return node('limiter') }
    createBuffer(channels, length, sampleRate) { const data = new Float32Array(length); return { numberOfChannels: channels, length, sampleRate, getChannelData: () => data } }
    resume() { this.resumed++; if (page.wakes) this.state = 'running'; return page.wakes ? Promise.resolve() : new Promise(() => {}) }
    decodeAudioData(data) {
      page.decoded.push(data.byteLength)
      if (data.byteLength < 8) return Promise.reject(new Error('not a sound'))
      // half a second of silence, then a quiet tone: what a hand-copied file with a pad looks like
      const samples = Float32Array.from({ length: 48000 }, (_, i) => (i < 24000 ? 0 : (i % 2 ? 0.3 : -0.3)))
      return Promise.resolve({ numberOfChannels: 1, sampleRate: 48000, length: samples.length, getChannelData: () => samples })
    }
  }
  const listeners = {}
  const docListeners = {}
  page.w = { AudioContext: AC, navigator: { audioSession: { type: 'auto' } }, addEventListener: (e, fn, opts) => { (listeners[e] ??= []).push({ fn, opts }) } }
  page.d = { visibilityState: 'visible', addEventListener: (e, fn) => { (docListeners[e] ??= []).push(fn) } }
  page.listeners = listeners
  page.docListeners = docListeners
  return page
}
const page = pretendPage()

test('a device with no sound says so, and nothing throws', async () => {
  assert.equal(await wakeSound({}), 'none')
  assert.equal(await unlockSound({}), 'none', 'the permissions screen\'s answer is the kit\'s')
  assert.equal(playCue('chime-phone', { w: {} }), false)
  assert.equal(chime(), false, 'the phone\'s chime with no sound: quiet')
  assert.equal(soundReady(), false)
  assert.equal(installUnlock({}), false, 'no page to listen on')
  assert.equal(await loadCueFiles({ base: '/play/', fetchImpl: async () => { throw new Error('should not fetch') }, ctx: null }), 0)
  const got = await allowAll({}, {})
  assert.equal(got.sound, 'none')
})

test('every page arms the unlock once: the first tap, lift, click or key anywhere wakes the sound, and an iPhone then plays with its ring switch on silent', async () => {
  assert.deepEqual(WAKE_EVENTS, ['pointerup', 'touchend', 'click', 'keydown'], 'a finger going down is not a tap to a browser: lifting it is')
  assert.equal(installUnlock(page.w, page.d), true)
  assert.equal(installUnlock(page.w, page.d), false, 'once a page')
  for (const e of WAKE_EVENTS) {
    assert.equal(page.listeners[e]?.length, 1, `${e} is listened for`)
    assert.deepEqual(page.listeners[e][0].opts, { capture: true, passive: true }, 'before anything on the page can stop it, and never in the way of a scroll')
  }
  assert.equal(page.listeners.pageshow?.length, 1)
  assert.equal(page.docListeners.visibilitychange?.length, 1, 'and when the page comes back to the front')
  assert.equal(page.contexts, 0, 'nothing is made until someone touches the page')
  // the first touch
  page.listeners.touchend[0].fn()
  await settle()
  assert.equal(page.contexts, 1, 'the page\'s one AudioContext')
  assert.equal(page.ctx.state, 'running')
  assert.equal(soundReady(), true)
  assert.equal(page.w.navigator.audioSession.type, 'playback', 'Safari: a silenced iPhone still chimes')
  assert.ok(page.made.some(n => n.kind === 'source' && n.started === 0 && n.outs.includes(page.ctx.destination)), 'one silent sample, straight out: the oldest unlock there is')
  // awake: more taps do nothing more
  const resumed = page.ctx.resumed
  for (const e of WAKE_EVENTS) page.listeners[e][0].fn()
  await settle()
  assert.equal(page.ctx.resumed, resumed, 'already awake')
  assert.equal(page.contexts, 1, 'never a second context')
  // an iPhone back from its lock screen says "interrupted": the next touch wakes it again
  page.ctx.state = 'interrupted'
  assert.equal(soundReady(), false)
  page.listeners.pointerup[0].fn()
  await settle()
  assert.equal(page.ctx.state, 'running')
  assert.ok(page.ctx.resumed > resumed)
  // and so does coming back to the page
  page.ctx.state = 'suspended'
  page.docListeners.visibilitychange[0]()
  await settle()
  assert.equal(page.ctx.state, 'running')
  // the permissions screen and the phone's own chime ride on the same context
  assert.equal(await unlockSound(page.w), 'ok')
  assert.equal(page.contexts, 1)
  const before = page.made.length
  assert.equal(chime(), true)
  assert.equal(page.made.slice(before).filter(n => n.kind === 'note').length, SOUNDS.chime.length, 'the kit\'s three warm notes, not two beeps')
})

test('a cue plays through one limiter to the speakers, loud, starting at its moment on the audio clock', () => {
  const t = page.ctx.currentTime
  let from = page.made.length
  assert.equal(playCue('chime-phone', { w: page.w, waitMs: 0, now: () => 0 }), true)
  let nodes = page.made.slice(from)
  const notes = nodes.filter(n => n.kind === 'note')
  assert.equal(notes.length, CUE_FIGURES.chime.length)
  assert.ok(notes.every(n => n.started >= t + 0.02 - 1e-9 && n.stopped > n.started), 'each note starts and stops')
  assert.ok(Math.abs(Math.min(...notes.map(n => n.started)) - (t + 0.02)) < 1e-9, 'now means now')
  const limiter = page.made.find(n => n.kind === 'limiter' && n.outs.includes(page.ctx.destination))
  assert.ok(limiter, 'one limiter before the speakers: full volume without the crackle')
  assert.ok(limiter.threshold.value < 0 && limiter.ratio.value >= 4)
  const peaks = nodes.filter(n => n.kind === 'gain').flatMap(n => n.gain.sets.filter(s => s.how === 'exponentialRampToValueAtTime').map(s => s.value))
  assert.ok(Math.max(...peaks) >= 0.5, 'at least twice as loud as the old beeps')
  // the same moment for every device: a cue due in 350 ms starts 350 ms on, to the sample
  from = page.made.length
  assert.equal(playCue('sting-door', { w: page.w, waitMs: CUE_LEAD_MS, now: () => 0 }), true)
  nodes = page.made.slice(from).filter(n => n.kind === 'note' || n.kind === 'source')
  assert.ok(Math.abs(Math.min(...nodes.map(n => n.started)) - (t + CUE_LEAD_MS / 1000)) < 1e-9)
  assert.equal(page.made.filter(n => n.kind === 'limiter' && n.outs.includes(page.ctx.destination)).length, 2, 'the kit\'s limiter and the cues\': never a new one a cue')
  // every cue makes a sound; one the page does not know makes nothing
  for (const id of CUE_IDS) {
    from = page.made.length
    assert.equal(playCue(id, { w: page.w, now: () => 0 }), true, id)
    assert.ok(page.made.length > from, `${id} makes something`)
    assert.equal(cueSource(id), CUE_SOUND[id].figure, 'no file loaded: the sound made in code')
  }
  from = page.made.length
  assert.equal(playCue('7F3A', { w: page.w }), false)
  assert.equal(page.made.length, from)
  assert.equal(cueSource('7F3A'), null)
})

test('a cue that finds the page\'s sound asleep asks it to wake, plays the moment it does, and gives up quietly when the cue is too old', async () => {
  // asleep, and it will wake (a tap is on its way)
  page.ctx.state = 'suspended'
  page.wakes = false
  let clock = 1000
  const queue = []
  const timer = fn => { queue.push(fn) }
  let from = page.made.length
  assert.equal(playCue('chime-phone', { w: page.w, waitMs: CUE_LEAD_MS, now: () => clock, timer }), true, 'it waits')
  await settle()
  assert.equal(page.made.slice(from).filter(n => n.kind === 'note').length, 0, 'nothing yet')
  assert.equal(queue.length, 1)
  clock += 120; queue.shift()()
  assert.equal(queue.length, 1, 'still asleep: it looks again')
  // the tap lands a second later: the cue plays at once, a little late and none the worse
  page.ctx.state = 'running'
  clock += 1000; queue.shift()()
  assert.equal(page.made.slice(from).filter(n => n.kind === 'note').length, CUE_FIGURES.chime.length)
  assert.equal(queue.length, 0, 'and stops looking')
  // asleep for good: it stops looking once the cue is more than three seconds past its moment, and plays nothing
  page.ctx.state = 'suspended'
  from = page.made.length
  clock = 50_000
  assert.equal(playCue('sting-result', { w: page.w, waitMs: 0, now: () => clock, timer }), true)
  await settle()
  let looks = 0
  while (queue.length && looks < 100) { clock += 120; queue.shift()(); looks++ }
  assert.ok(looks >= 20 && looks <= 30, `it looked for about three seconds (${looks} times)`)
  assert.equal(page.made.slice(from).filter(n => n.kind === 'note').length, 0)
  page.ctx.state = 'running'
  page.wakes = true
})

test('the cue files: each id\'s own file from the site when it is there, Jon\'s scream for the blackout, and the made sound for the rest; a missing file is never an error', async () => {
  resetCueSounds()
  const asked = []
  const sound = (bytes = 64) => ({ ok: true, headers: { get: () => 'audio/mpeg' }, arrayBuffer: async () => new ArrayBuffer(bytes) })
  const fetchImpl = async (url) => {
    asked.push(url)
    if (url.endsWith('sound/chime-phone.mp3')) return sound()
    if (url.endsWith('audio/Scream.mp3')) return sound()
    if (url.endsWith('sound/chime-news.mp3')) return { ok: true, headers: { get: () => 'text/html; charset=utf-8' }, arrayBuffer: async () => new ArrayBuffer(64) } // a dev server's page for a file that is not there
    if (url.endsWith('sound/sting-door.mp3')) return sound(4) // a file that is not a sound
    if (url.endsWith('sound/sting-reveal.mp3')) throw new Error('offline')
    return { ok: false, status: 404, headers: { get: () => 'text/html' } }
  }
  const loading = loadCueFiles({ base: '/play/', fetchImpl, ctx: page.ctx })
  assert.equal(loadCueFiles({ base: '/play/', fetchImpl, ctx: page.ctx }), loading, 'once a page')
  assert.equal(await loading, 2)
  assert.deepEqual([...asked].sort(), [...CUE_IDS.map(id => `/play/sound/${id}.mp3`), '/play/audio/Scream.mp3'].sort(), 'each id once, and the scream when the blackout has no file of its own')
  for (const url of asked) for (const word of ['bulletin2', 'newsflash', 'woof']) assert.ok(!url.includes(word), 'never a recording')
  assert.equal(cueSource('chime-phone'), 'file')
  assert.equal(cueSource('blackout'), 'file', 'the scream')
  assert.equal(cueSource('chime-news'), 'news', 'a page is not a sound')
  assert.equal(cueSource('sting-door'), 'door', 'nor is a file that will not decode')
  assert.equal(cueSource('sting-reveal'), 'reveal')
  // the file plays from where its sound starts, lifted to full level, through the same limiter
  const from = page.made.length
  assert.equal(playCue('blackout', { w: page.w, waitMs: 0, now: () => 0 }), true)
  const nodes = page.made.slice(from)
  const src = nodes.find(n => n.kind === 'source')
  assert.ok(src, 'a file, not notes')
  assert.equal(nodes.filter(n => n.kind === 'note').length, 0)
  assert.ok(Math.abs(src.offset - 0.495) < 0.001, 'the half second of silence in front is skipped')
  assert.ok(Math.abs(src.started - (page.ctx.currentTime + 0.02)) < 1e-9)
  const gain = src.outs[0]
  assert.equal(gain.kind, 'gain')
  assert.ok(Math.abs(gain.gain.value - 3) < 1e-6, '0.3 brought up to 0.9')
  assert.ok(gain.outs.some(o => o.kind === 'gain' && o.outs.some(l => l.kind === 'limiter' && l.outs.includes(page.ctx.destination))), 'into the cue bus, through the limiter, to the speakers')
  resetCueSounds()
})

// ---- the wiring: every phone and every room screen ----------------------------

test('every phone plays the cues: it reads the night\'s sounds above every screen it can show, so a dark phone still screams', () => {
  const app = read('../src/App.jsx')
  const reads = app.indexOf('const sounds = useDoc(nightId ? `nights/${nightId}/public/sounds` : null)')
  const plays = app.indexOf('useCueSounds(sounds, serverNow, { scope: nightId })')
  const firstReturn = app.indexOf('\n  if (authError) return')
  assert.ok(reads > 0 && plays > reads && firstReturn > plays, 'before the first early return: the blackout, the doors and the join screen all come after it')
  assert.ok(!/if \([^)]*\)\s*useCueSounds/.test(app), 'never behind a condition')
  // any signed-in phone may read public/sounds: no rules change
  const rules = read('../../firestore.rules')
  assert.ok(/match \/public\/\{doc=\*\*\} \{\s*allow read: if signedIn\(\);/.test(rules))
  // the hook: the files fetched once, the pure step, the page's one memory
  const hook = read('../src/lib/useCueSounds.js')
  assert.ok(hook.includes('let memory = NO_CUES_YET') && hook.includes('const step = cueStep(memory, { loaded, sounds: view?.data ?? null, scope, now: serverNow(), silent, tv })'))
  assert.ok(hook.includes('if (step.due) playCue(step.due.id, { waitMs: step.due.waitMs })'))
  assert.ok(hook.includes("loadCueFiles({ base: import.meta.env?.BASE_URL ?? '/play/' })"), 'the files are loaded at the start, ready for the first cue')
  assert.ok(hook.includes('}, [key, loaded, scope])'))
  // no countdown of its own: the wait is worked out from the server's clock
  assert.ok(!hook.includes('Date.now()'))
})

test('the unlock is armed on every page load, not only at the Allow screen; Allow asks for sound inside the tap and then lets the guest hear the chime', () => {
  const main = read('../src/main.jsx')
  assert.ok(main.includes("import { installUnlock } from './lib/cueSounds'") && /\ninstallUnlock\(\)\n/.test(main), 'main.jsx, for every page: phones, room screens, practice pages')
  assert.ok(main.indexOf('installUnlock()') < main.indexOf('createRoot('), 'before anything is drawn')
  const perms = read('../src/lib/permissions.js')
  assert.ok(!/AudioContext|createOscillator|createGain/.test(perms.replace(/\/\/.*$/gm, '')), 'the permissions screen has no sound engine of its own any more')
  assert.ok(perms.includes("import { wakeSound } from './cueSounds.js'") && perms.includes("return playSound('chime')"))
  const all = perms.slice(perms.indexOf('export async function allowAll('))
  assert.ok(all.indexOf('const waking = unlockSound(w)') < all.indexOf('await askMotion(w)'), 'the sound first, in the tap itself: an iPhone\'s motion question can outlast a tap')
  const allow = read('../src/screens/Allow.jsx')
  assert.ok(allow.includes("if (r.sound === 'ok') chime()"), 'the guest hears that their phone is on')
  // one AudioContext for the whole page: only the kit ever makes one
  const makers = []
  const walk = dir => {
    for (const f of readdirSync(new URL(dir, import.meta.url), { withFileTypes: true })) {
      if (f.isDirectory()) walk(`${dir}${f.name}/`)
      else if (/\.(js|jsx)$/.test(f.name) && /new (AC|\(?w(indow)?\??\.(webkit)?AudioContext|AudioContext)\b/.test(read(`${dir}${f.name}`).replace(/\/\/.*$/gm, ''))) makers.push(`${dir}${f.name}`)
    }
  }
  walk('../src/')
  assert.deepEqual(makers, ['../src/lib/soundkit.js'])
})

test('every room screen plays the cues through its bell, the brain\'s own browser included; the second display never sounds, and the TV leaves its own film alone', () => {
  const kiosk = read('../src/screens/Kiosk.jsx')
  assert.ok(kiosk.includes("import { useCueSounds } from '../lib/useCueSounds'"))
  const bell = kiosk.slice(kiosk.indexOf('export function Bell('), kiosk.indexOf('// The dot: green live'))
  assert.ok(bell.includes('useCueSounds(sounds, serverNow, { silent, tv, scope })'))
  assert.ok(bell.includes('kiosk-bell'), 'the bell mark stays as it was')
  assert.ok(!bell.includes("chime('cue')"), 'not the one soft beep any more')
  assert.ok(kiosk.includes("silent={which === 'decor'} tv={which === 'living'} scope={nightId}"))
  assert.ok(!kiosk.includes("which === 'ipad'} scope"), 'the iPad shows the words only, so it chimes for the news like any other screen')
})
