// The review of 12 Nov 2026: the Host tab's own lines for S2 (a stale Next) and S6 (a real Blackout
// pressed while a Blackout test is running).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

import { cueDue, cueStep, NO_CUES_YET, CUE_LEAD_MS, AHEAD_ARM_MS, playCue, resetCueSounds } from '../src/lib/cueSounds.js'

const src = p => readFileSync(new URL(p, import.meta.url), 'utf8')
const NOW = 1_800_000_000_000
const DARK = NOW + 2_000
const scream = (at = DARK, more = { ahead: true }) => ({ current: { id: 'blackout', at, ...more } })

// ---- S5: the scream in hand at the press, played at the dark mark exactly -------------

test('S5 a cue stamped ahead starts on its stamp, with no lead; any other keeps its lead', () => {
  assert.deepEqual(cueDue(null, scream(), NOW), { id: 'blackout', key: `blackout@${DARK}`, waitMs: 2_000, ahead: true })
  assert.equal(cueDue(null, scream(DARK, {}), NOW).waitMs, 2_000 + CUE_LEAD_MS, 'unmarked: the usual lead after the stamp')
  assert.equal(cueDue(null, scream(), DARK).waitMs, 0, 'heard of at the mark: now, never before it')
})

test('S5 a page that got the scream early plays it once; a page that reloads in the lead plays it too; one that reloads after does not', () => {
  const scope = 'night-1'
  // early: the page already had its starting point
  let memory = { scope, heard: null }
  let step = cueStep(memory, { loaded: true, sounds: scream(), scope, now: NOW + 10 })
  assert.equal(step.due.waitMs, 1_990)
  memory = step.memory
  assert.equal(cueStep(memory, { loaded: true, sounds: scream(), scope, now: NOW + 500 }).due, null, 'once')
  // a reload in the lead: the first read, and still the scream at its stamp
  step = cueStep(NO_CUES_YET, { loaded: true, sounds: scream(), scope, now: NOW + 1_200 })
  assert.equal(step.due.id, 'blackout')
  assert.equal(step.due.waitMs, 800)
  assert.equal(cueStep(step.memory, { loaded: true, sounds: scream(), scope, now: NOW + 1_300 }).due, null, 'and once')
  // a reload in the dark, or any cue that is not stamped ahead: old news, as ever
  assert.equal(cueStep(NO_CUES_YET, { loaded: true, sounds: scream(), scope, now: DARK + 100 }).due, null)
  assert.equal(cueStep(NO_CUES_YET, { loaded: true, sounds: scream(NOW + 100, {}), scope, now: NOW }).due, null)
  // the brain's own browser stays quiet
  assert.equal(cueStep(NO_CUES_YET, { loaded: true, sounds: scream(), scope, now: NOW, silent: true }).due, null)
})

// A pretend page with a running AudioContext that counts what it starts.
function pretendPage() {
  const started = []
  const param = () => { const p = { value: 0 }; for (const how of ['setValueAtTime', 'linearRampToValueAtTime', 'exponentialRampToValueAtTime', 'setTargetAtTime']) p[how] = () => p; return p }
  const node = () => { const n = { frequency: param(), gain: param(), Q: param(), threshold: param(), knee: param(), ratio: param(), attack: param(), release: param(), connect: to => to, start: at => started.push(at), stop() {} }; return n }
  class AC {
    constructor() { this.state = 'running'; this.currentTime = 10; this.sampleRate = 48000; this.destination = {} }
    createOscillator() { return node() }
    createBufferSource() { return node() }
    createGain() { return node() }
    createBiquadFilter() { return node() }
    createDynamicsCompressor() { return node() }
    createBuffer(channels, length) { const data = new Float32Array(length); return { numberOfChannels: channels, length, getChannelData: () => data } }
    resume() { return Promise.resolve() }
  }
  return { started, w: { AudioContext: AC, navigator: {}, addEventListener() {} } }
}

test('S5 the scream is held until just before the dark and plays then; called off in the lead (a pause), it never sounds', () => {
  resetCueSounds()
  const page = pretendPage()
  const scope = 'night-2'
  let clock = 0
  const timers = []
  const timer = (fn, t) => timers.push({ fn, at: clock + t })
  const run = upTo => { clock = upTo; for (const t of timers.splice(0).sort((a, b) => a.at - b.at)) { if (t.at <= upTo) { clock = t.at; t.fn() } else timers.push(t) } clock = upTo }
  // heard at the press: two seconds to the dark
  let step = cueStep({ scope, heard: null }, { loaded: true, sounds: scream(), scope, now: NOW })
  assert.equal(playCue(step.due.id, { waitMs: step.due.waitMs, w: page.w, now: () => clock, timer }), true)
  assert.equal(page.started.length, 0, 'nothing sounds in the lead')
  run(2_000 - AHEAD_ARM_MS - 1)
  assert.equal(page.started.length, 0)
  run(2_000 - AHEAD_ARM_MS)
  assert.ok(page.started.length > 0, 'handed to the speaker just before the dark')
  assert.ok(page.started.every(at => at >= 10 + AHEAD_ARM_MS / 1000 - 1e-9), 'and scheduled for the dark mark itself, never before it')
  // a second press, called off in its lead: the doc names nothing by the time it would play
  const before = page.started.length
  const later = scream(DARK + 60_000)
  step = cueStep(step.memory, { loaded: true, sounds: later, scope, now: NOW + 58_000 })
  clock = 100_000
  playCue(step.due.id, { waitMs: step.due.waitMs, w: page.w, now: () => clock, timer })
  cueStep(step.memory, { loaded: true, sounds: { current: { id: null, at: NOW + 58_500, calledOff: true } }, scope, now: NOW + 58_500 })
  run(clock + 3_000)
  assert.equal(page.started.length, before, 'the scream was let go')
})

test('S2 the Host tab\'s Next sends the act and beat it is showing, and a stale reply says one short line', () => {
  const host = src('../src/screens/Host.jsx')
  assert.ok(host.includes("run('next', { from: `${night.act ?? 0}/${night.beat ?? ''}` })"), 'Next names the beat on the screen')
  assert.ok(host.includes("if (r.stale) return 'The night had already moved on.'"))
})
