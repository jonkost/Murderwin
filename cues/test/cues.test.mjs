import { test } from 'node:test'
import assert from 'node:assert/strict'
import { EventEmitter } from 'node:events'
import { CLIP_IDS, plan, hallColour, soundCandidates, parseEnv, bridgeHostProblem, presenceRow, PRESENCE_KEY, PRESENCE_MS, SOUND_STALE_MS, SOUND_IDS, knownSound, missingSoundFiles } from '../lib/cues.js'
import { SOUND_IDS as SERVER_SOUND_IDS } from '../../functions/lib/screen.js'
import { CLIP_IDS as SERVER_CLIP_IDS } from '../../functions/lib/news.js'
import { readFileSync } from 'node:fs'
import { lightBody, XY, Hue, bridgeFetch } from '../lib/hue.js'

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
  let r = plan(s, { sounds: { current: { id: 'chime-news', at: 1000 } } }, 1000)
  assert.deepEqual(r.actions, [{ type: 'sound', id: 'chime-news' }])
  s = r.state
  assert.deepEqual(plan(s, { sounds: { current: { id: 'chime-news', at: 1000 } } }, 1000).actions, [])
  r = plan(s, { sounds: { current: { id: 'chime-news', at: 2000 } } }, 2000)
  assert.deepEqual(r.actions, [{ type: 'sound', id: 'chime-news' }])
  r = plan(r.state, { sounds: { current: { id: 'sting-door', at: { toMillis: () => 3000 } } } }, 3000)
  assert.deepEqual(r.actions, [{ type: 'sound', id: 'sting-door' }])
})

test('plan: a relay that starts an hour in does not replay the last sound; the next new one still plays', () => {
  const t = 10_000_000
  const fresh = { hall: null, sound: null }
  const old = plan(fresh, { sounds: { current: { id: 'chime-news', at: t - 60 * 60_000 } } }, t)
  assert.deepEqual(old.actions, [], 'an old cue is remembered, not performed')
  assert.equal(old.state.sound, `chime-news@${t - 60 * 60_000}`)
  const next = plan(old.state, { sounds: { current: { id: 'chime-news', at: t + 5000 } } }, t + 5000)
  assert.deepEqual(next.actions, [{ type: 'sound', id: 'chime-news' }])
  const edge = plan(fresh, { sounds: { current: { id: 'sting-door', at: t - SOUND_STALE_MS + 1000 } } }, t)
  assert.deepEqual(edge.actions, [{ type: 'sound', id: 'sting-door' }], 'inside the window still plays')
})

test('the catalogue: every id is accepted, an unknown one is refused with a count and no id, and the server list is the same', () => {
  assert.deepEqual(SOUND_IDS, SERVER_SOUND_IDS, 'cues/lib/cues.js and functions/lib/screen.js agree')
  let s = { hall: null, sound: null }
  let t = 1000
  for (const id of SOUND_IDS) {
    assert.ok(knownSound(id))
    const r = plan(s, { sounds: { current: { id, at: t } } }, t)
    assert.deepEqual(r.actions, [{ type: 'sound', id }])
    s = r.state; t += 10
  }
  assert.ok(!knownSound('7F3A'))
  const refused = plan(s, { sounds: { current: { id: '7F3A', at: t } } }, t)
  assert.deepEqual(refused.actions, [{ type: 'refused', count: 1 }], 'a count, never the id')
  assert.equal(refused.state.sound, `7F3A@${t}`, 'remembered, so it is refused once, not on every snapshot')
  assert.deepEqual(plan(refused.state, { sounds: { current: { id: '7F3A', at: t } } }, t).actions, [])
  // the relay logs the refusal as a count only
  const src = readFileSync(new URL('../cues.mjs', import.meta.url), 'utf8')
  assert.ok(src.includes("a.type === 'refused'") && src.includes('refused ${a.count} id'), 'a count-only log line')
})

test('missing files: the ids with no file under media, by any accepted extension; the relay refuses to start on any', () => {
  const have = new Set(['/m/chime-news.m4a', '/m/sting-door.wav', '/m/power.mp3'])
  const missing = missingSoundFiles('/m', f => have.has(f))
  assert.equal(missing.length, SOUND_IDS.length - 3)
  assert.ok(!missing.includes('chime-news') && !missing.includes('sting-door') && !missing.includes('power'))
  assert.deepEqual(missingSoundFiles('/m', () => true), [])
  assert.deepEqual(missingSoundFiles('/m', () => false, ['x']), ['x'])
  const src = readFileSync(new URL('../cues.mjs', import.meta.url), 'utf8')
  assert.ok(src.includes('missingSoundFiles(MEDIA_DIR, existsSync)') && src.includes('process.exit(2)'), 'quits before watching anything')
  assert.ok(src.indexOf('missingSoundFiles(MEDIA_DIR') < src.indexOf('initializeApp('), 'the check runs before the sign-in')
})

test('the heartbeat row is the shape the rules allow, under the guest key cues, once a minute', () => {
  assert.deepEqual(presenceRow('n1'), { nightId: 'n1', guestKey: 'cues' })
  assert.deepEqual(presenceRow(null), { nightId: null, guestKey: 'cues' })
  assert.equal(PRESENCE_KEY, 'cues')
  assert.equal(PRESENCE_MS, 60_000)
  // firestore.rules: presence rows may hold only nightId, guestKey and at
  const rules = readFileSync(new URL('../../firestore.rules', import.meta.url), 'utf8')
  const allowed = /presence\/\{uid\}[\s\S]*?hasOnly\(\[([^\]]*)\]\)/.exec(rules)[1].replace(/['\s]/g, '').split(',')
  for (const k of [...Object.keys(presenceRow('n1')), 'at']) assert.ok(allowed.includes(k), `${k} is allowed by the rules`)
  const src = readFileSync(new URL('../cues.mjs', import.meta.url), 'utf8')
  assert.ok(src.includes("'presence'") && src.includes('serverTimestamp()'), 'the relay writes its row with a server stamp')
})

test('.env values lose a trailing space and one pair of quotes; a bad bridge address is named', () => {
  const env = parseEnv('HUE_BRIDGE_HOST=192.168.1.40 \nHUE_APP_KEY="abc-123"\n# a comment\nHUE_HALL_LIGHT_ID=\'id\'\nMEDIA_DIR=/m \n')
  assert.deepEqual(env, { HUE_BRIDGE_HOST: '192.168.1.40', HUE_APP_KEY: 'abc-123', HUE_HALL_LIGHT_ID: 'id', MEDIA_DIR: '/m' })
  assert.equal(bridgeHostProblem('192.168.1.40'), null)
  assert.ok(bridgeHostProblem('192.168.1.40 '))
  assert.ok(bridgeHostProblem(''))
})

// A stand-in for node's https.request: the handler gets a response that
// sends headers and part of a body, then the connection drops.
function droppedRequest(opts, onResponse) {
  const req = new EventEmitter()
  req.destroy = () => {}
  req.end = () => {
    const res = new EventEmitter()
    res.statusCode = 200; res.complete = false; res.setEncoding = () => {}
    queueMicrotask(() => { onResponse(res); res.emit('data', '{"da'); res.emit('close') })
  }
  return req
}

test('bridgeFetch settles when the bridge drops the connection mid-response', async () => {
  await assert.rejects(bridgeFetch('https://10.0.0.4/clip/v2/resource/light', { requestImpl: droppedRequest }), /connection dropped/)
  // and the body goes out in one piece, with end()
  let sent = null
  const req = new EventEmitter()
  req.destroy = () => {}
  req.end = (body) => { sent = body; const res = new EventEmitter(); res.statusCode = 200; res.complete = true; res.setEncoding = () => {}; queueMicrotask(() => { req.handler(res); res.emit('data', 'ok'); res.emit('end'); res.emit('close') }) }
  const r = await bridgeFetch('https://10.0.0.4/x', { method: 'PUT', body: '{"on":1}', requestImpl: (opts, h) => { req.handler = h; return req } })
  assert.equal(sent, '{"on":1}')
  assert.equal(await r.text(), 'ok')
})

test('sound files are looked up by id and extension, and ids are kept to safe characters', () => {
  assert.deepEqual(soundCandidates('/m', 'chime-news'), ['/m/chime-news.m4a', '/m/chime-news.mp3', '/m/chime-news.wav', '/m/chime-news.aiff'])
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

test('plan: a bulletin\'s recorded clips ride with its sound, in order; an unknown clip is dropped', () => {
  assert.deepEqual(CLIP_IDS, SERVER_CLIP_IDS, 'cues/lib/cues.js and functions/lib/news.js agree')
  const r = plan({ hall: null, sound: null }, { sounds: { current: { id: 'chime-news', at: 1000, clips: ['newsflash-opening', 'nope', 'newsflash-signoff'] } } }, 1000)
  assert.deepEqual(r.actions, [{ type: 'sound', id: 'chime-news', clips: ['newsflash-opening', 'newsflash-signoff'] }])
})

test('plan: a cue of recorded lines alone (the closing bulletin) plays them, once', () => {
  const r = plan({ hall: null, sound: null }, { sounds: { current: { id: null, at: 5000, clips: ['woof-close-field-motive'] } } }, 5000)
  assert.deepEqual(r.actions, [{ type: 'sound', id: null, clips: ['woof-close-field-motive'] }])
  assert.deepEqual(plan(r.state, { sounds: { current: { id: null, at: 5000, clips: ['woof-close-field-motive'] } } }, 5000).actions, [])
})
