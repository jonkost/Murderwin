import { test } from 'node:test'
import assert from 'node:assert/strict'
import { plan, hallColour, soundCandidates } from '../lib/cues.js'
import { lightBody, XY, Hue } from '../lib/hue.js'

test('hall: red when the night says red, green when it says green or the door is open', () => {
  assert.equal(hallColour({}), null)
  assert.equal(hallColour({ cues: { hall: 'red' } }), 'red')
  assert.equal(hallColour({ cues: { hall: 'green' } }), 'green')
  assert.equal(hallColour({ cues: { hall: 'red' }, relay: { doorOpen: true } }), 'green', 'the door opening wins')
  assert.equal(hallColour({ relay: { doorOpen: true } }), 'green', 'no cues doc at all still turns green')
})

test('plan: red → green once; the same docs again do nothing; a reload does nothing', () => {
  let s = { hall: null, sound: null }
  let r = plan(s, { cues: { hall: 'red' } })
  assert.deepEqual(r.actions, [{ type: 'hall', colour: 'red' }])
  s = r.state
  r = plan(s, { cues: { hall: 'red' } })
  assert.deepEqual(r.actions, [])
  r = plan(s, { cues: { hall: 'green' } })
  assert.deepEqual(r.actions, [{ type: 'hall', colour: 'green' }])
  s = r.state
  r = plan(s, { cues: { hall: 'green' }, relay: { doorOpen: true } })
  assert.deepEqual(r.actions, [], 'green stays green')
  r = plan(s, { cues: { hall: 'red' }, relay: { doorOpen: true } })
  assert.deepEqual(r.actions, [], 'an old red cue cannot close the door')
})

test('plan: a sound id plays once per arrival, and again only when re-sent with a new stamp', () => {
  let s = { hall: null, sound: null }
  let r = plan(s, { sounds: { current: { id: '7F3A', at: 1000 } } })
  assert.deepEqual(r.actions, [{ type: 'sound', id: '7F3A' }])
  s = r.state
  assert.deepEqual(plan(s, { sounds: { current: { id: '7F3A', at: 1000 } } }).actions, [])
  r = plan(s, { sounds: { current: { id: '7F3A', at: 2000 } } })
  assert.deepEqual(r.actions, [{ type: 'sound', id: '7F3A' }])
  r = plan(r.state, { sounds: { current: { id: 'B2C4', at: { toMillis: () => 3000 } } } })
  assert.deepEqual(r.actions, [{ type: 'sound', id: 'B2C4' }])
})

test('sound files are looked up by id and extension, and ids are kept to safe characters', () => {
  assert.deepEqual(soundCandidates('/m', '7F3A'), ['/m/7F3A.m4a', '/m/7F3A.mp3', '/m/7F3A.wav', '/m/7F3A.aiff'])
  assert.deepEqual(soundCandidates('/m', '../etc'), ['/m/etc.m4a', '/m/etc.mp3', '/m/etc.wav', '/m/etc.aiff'])
  assert.deepEqual(soundCandidates('/m', ''), [])
})

test('hue: the request body for red and green, and the request shape to the bridge', async () => {
  assert.deepEqual(lightBody('red'), { on: { on: true }, dimming: { brightness: 60 }, color: { xy: XY.red } })
  assert.deepEqual(lightBody('green', { brightness: 80 }).dimming, { brightness: 80 })
  assert.throws(() => lightBody('blue'))
  const calls = []
  const fetchImpl = async (url, opts) => { calls.push({ url, opts }); return { ok: true, status: 200, text: async () => JSON.stringify({ data: [{ id: 'abc', metadata: { name: 'Hall' } }] }) } }
  const hue = new Hue({ host: '10.0.0.4', key: 'k', fetchImpl })
  assert.deepEqual(await hue.lights(), [{ id: 'abc', name: 'Hall' }])
  await hue.setLight('abc', 'green')
  const put = calls.at(-1)
  assert.equal(put.url, 'https://10.0.0.4/clip/v2/resource/light/abc')
  assert.equal(put.opts.method, 'PUT')
  assert.equal(put.opts.headers['hue-application-key'], 'k')
  assert.deepEqual(JSON.parse(put.opts.body).color.xy, XY.green)
  assert.throws(() => new Hue({ host: '', key: 'k' }))
})
