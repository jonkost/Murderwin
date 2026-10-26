import { test } from 'node:test'
import assert from 'node:assert/strict'
import { EventEmitter } from 'node:events'
import { CLIP_IDS, plan, hallColour, phaseOf, soundCandidates, parseEnv, bridgeHostProblem, presenceRow, PRESENCE_KEY, PRESENCE_MS, SOUND_STALE_MS, SOUND_IDS, REQUIRED_SOUND_IDS, CHIME_FALLBACK, OPTIONAL_SOUND_IDS, knownSound, missingSoundFiles, soundFileFor, soundFileReport, soundFilesLines, clipCode, clipReader, playLine, recordingFiles } from '../lib/cues.js'
import { createPlayer } from '../lib/player.js'
import { SOUND_IDS as SERVER_SOUND_IDS } from '../../functions/lib/screen.js'
import { CLIP_IDS as SERVER_CLIP_IDS, clipCode as serverClipCode } from '../../functions/lib/news.js'
import { readFileSync } from 'node:fs'
import { lightBody, XY, Hue, bridgeFetch, sameSceneName, SCENE_RECALL } from '../lib/hue.js'

test('hall: red when the night says red, green when it says green or the door is open', () => {
  assert.equal(hallColour({}), null)
  assert.equal(hallColour({ cues: { hall: 'red' } }), 'red')
  assert.equal(hallColour({ cues: { hall: 'green' } }), 'green')
  assert.equal(hallColour({ cues: { hall: 'red' }, relay: { doorOpen: true } }), 'green', 'the door opening wins')
  assert.equal(hallColour({ relay: { doorOpen: true } }), 'green', 'no cues doc at all still turns green')
})

// ---- 25 Oct 2026, the cue list: the bulb's third state ----

test('hall: off in the blackout, whatever the cues doc says, a pause from the blackout included; red again when the power returns', () => {
  assert.equal(phaseOf(null), null)
  assert.equal(phaseOf({ phase: 'paused', pausedFrom: 'blackout' }), 'blackout')
  assert.equal(phaseOf({ phase: 'paused' }), 'act')
  assert.equal(phaseOf({ act: 2 }), 'act', 'no phase: an act')
  assert.equal(hallColour({ night: { phase: 'blackout' }, cues: { hall: 'green' } }), 'off')
  assert.equal(hallColour({ night: { phase: 'blackout' }, cues: { hall: 'red' }, relay: { doorOpen: true } }), 'off', 'the blackout wins over everything')
  assert.equal(hallColour({ night: { phase: 'paused', pausedFrom: 'blackout' }, cues: { hall: 'red' } }), 'off', 'paused in the dark is still dark')
  assert.equal(hallColour({ night: { phase: 'prompt' }, cues: { hall: 'red' } }), 'red', 'the power returns: the server wrote red')
  assert.equal(hallColour({ night: { phase: 'act' }, cues: { hall: 'green' } }), 'green')
  assert.equal(hallColour({ night: { phase: 'blackout' } }), 'off', 'no cues doc yet: still off')
  // the planner: green at the welcome, off at the blackout, red at the power's return, each once
  let s = { hall: null, sound: null }
  let r = plan(s, { night: { act: 1, phase: 'act' }, cues: { hall: 'green' } })
  assert.deepEqual(r.actions, [{ type: 'hall', colour: 'green' }])
  s = r.state
  r = plan(s, { night: { act: 1, phase: 'blackout' }, cues: { hall: 'green' } })
  assert.deepEqual(r.actions, [{ type: 'hall', colour: 'off' }])
  s = r.state
  assert.deepEqual(plan(s, { night: { act: 1, phase: 'paused', pausedFrom: 'blackout' }, cues: { hall: 'green' } }).actions, [], 'paused: no change')
  assert.deepEqual(plan(s, { night: { act: 1, phase: 'blackout' }, cues: { hall: 'green' } }).actions, [], 'the same again: nothing')
  r = plan(s, { night: { act: 2, phase: 'prompt' }, cues: { hall: 'red' } })
  assert.deepEqual(r.actions, [{ type: 'hall', colour: 'red' }])
  assert.equal(r.state.hall, 'red')
  // a relay started in the blackout turns the bulb off at once
  assert.deepEqual(plan({ hall: null, sound: null }, { night: { phase: 'blackout' }, cues: { hall: 'red' } }).actions, [{ type: 'hall', colour: 'off' }])
  // the relay sends 'off' to the bulb like a colour, and re-sends it in the retry loop
  assert.deepEqual(lightBody('off'), { on: { on: false } })
  const src = readFileSync(new URL('../cues.mjs', import.meta.url), 'utf8')
  assert.ok(src.includes('if (wantHall && !FAKE && hue) setHall(wantHall)'), 'off is retried like red and green')
  assert.ok(src.includes('[hall] would turn ${colour}'), 'fake mode: "[hall] would turn off"')
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

test('missing files: the ids with no file under media, by any accepted extension; the relay refuses to start only when a required one is missing', () => {
  const have = new Set(['/m/chime-news.m4a', '/m/sting-door.wav', '/m/blackout.mp3'])
  const missing = missingSoundFiles('/m', f => have.has(f))
  assert.equal(missing.length, SOUND_IDS.length - 3)
  assert.ok(!missing.includes('chime-news') && !missing.includes('sting-door') && !missing.includes('blackout'))
  assert.deepEqual(missingSoundFiles('/m', () => true), [])
  assert.deepEqual(missingSoundFiles('/m', () => false, ['x']), ['x'])
  const src = readFileSync(new URL('../cues.mjs', import.meta.url), 'utf8')
  assert.ok(src.includes('soundFileReport(MEDIA_DIR, existsSync)') && src.includes('if (soundReport.required.length && !TOOL)') && src.includes('process.exit(2)'), 'quits before watching anything, on a required sound only')
  assert.ok(src.indexOf('soundFileReport(MEDIA_DIR') < src.indexOf('initializeApp('), 'the check runs before the sign-in')
})

// ---- 25 Oct 2026, cueSounds: nine sounds, two required, one chime for every chime moment, the stings optional ----

test('nine sounds, on both sides: the power sound is gone; chime-phone and blackout are the two required; the three other chimes fall back to chime-phone; the four stings are optional', () => {
  assert.equal(SOUND_IDS.length, 9)
  assert.ok(!SOUND_IDS.includes('power'))
  assert.deepEqual(SOUND_IDS, SERVER_SOUND_IDS, 'cues/lib/cues.js and functions/lib/screen.js agree')
  assert.deepEqual(REQUIRED_SOUND_IDS, ['chime-phone', 'blackout'])
  assert.deepEqual(CHIME_FALLBACK, { 'chime-news': 'chime-phone', 'chime-irwin': 'chime-phone', 'sounder-bulletin': 'chime-phone' })
  assert.deepEqual(OPTIONAL_SOUND_IDS, ['sting-solved', 'sting-door', 'sting-reveal', 'sting-result'])
  for (const id of [...REQUIRED_SOUND_IDS, ...Object.keys(CHIME_FALLBACK), ...OPTIONAL_SOUND_IDS]) assert.ok(SOUND_IDS.includes(id), id)
  assert.equal(REQUIRED_SOUND_IDS.length + Object.keys(CHIME_FALLBACK).length + OPTIONAL_SOUND_IDS.length, SOUND_IDS.length, 'every sound is in exactly one group')
})

test('the one chime serves every chime moment: a chime with no file of its own plays chime-phone\'s file; a sting with none plays nothing', () => {
  const have = new Set(['/m/chime-phone.m4a', '/m/blackout.wav', '/m/sting-door.m4a'])
  const exists = f => have.has(f)
  assert.deepEqual(soundFileFor('/m', 'chime-phone', exists), { file: '/m/chime-phone.m4a', fallback: false })
  assert.deepEqual(soundFileFor('/m', 'chime-news', exists), { file: '/m/chime-phone.m4a', fallback: true })
  assert.deepEqual(soundFileFor('/m', 'chime-irwin', exists), { file: '/m/chime-phone.m4a', fallback: true })
  assert.deepEqual(soundFileFor('/m', 'sounder-bulletin', exists), { file: '/m/chime-phone.m4a', fallback: true })
  assert.deepEqual(soundFileFor('/m', 'sting-door', exists), { file: '/m/sting-door.m4a', fallback: false })
  assert.equal(soundFileFor('/m', 'sting-reveal', exists), null, 'an optional sting with no file: silent')
  assert.equal(soundFileFor('/m', 'chime-news', () => false), null, 'no chime-phone either: nothing')
  // a chime's own file wins over the fallback
  assert.deepEqual(soundFileFor('/m', 'chime-news', f => f === '/m/chime-news.mp3' || have.has(f)), { file: '/m/chime-news.mp3', fallback: false })
  // the report for the start of the evening, counts only
  const r = soundFileReport('/m', exists)
  assert.deepEqual(r, { required: [], chimes: ['chime-news', 'sounder-bulletin', 'chime-irwin'], optional: ['sting-solved', 'sting-reveal', 'sting-result'], total: 9 })
  assert.deepEqual(soundFilesLines(r), [
    '3 chimes have no file of their own: the one chime plays there',
    '3 optional sounds have no file: silent at those moments',
  ])
  const none = soundFileReport('/m', () => false)
  assert.deepEqual(none.required, ['blackout', 'chime-phone'], 'in the catalogue\'s order')
  assert.deepEqual(none.chimes, [], 'with no chime-phone there is nothing to fall back on')
  assert.equal(none.optional.length, 7)
  assert.equal(soundFilesLines(none)[0], '2 of the 2 required sounds have no file (media/README.md names the two)')
  assert.deepEqual(soundFilesLines(soundFileReport('/m', () => true)), ['all 9 sounds have a file'])
  assert.deepEqual(soundFilesLines(soundFileReport('/m', f => f !== '/m/blackout.m4a' && f !== '/m/blackout.mp3' && f !== '/m/blackout.wav' && f !== '/m/blackout.aiff')), ['1 of the 2 required sounds has no file (media/README.md names the two)'])
  for (const line of [...soundFilesLines(r), ...soundFilesLines(none)]) for (const id of SOUND_IDS) assert.ok(!line.includes(id), 'counts only, never an id')
  // the player uses the fallback, and its line says so without naming anything
  const { spawn, procs } = fakeSpawn()
  const lines = []
  const player = createPlayer({ mediaDir: '/m', exists, spawn, log: l => lines.push(l) })
  player.play('chime-news', [])
  assert.equal(procs.at(-1).file, '/m/chime-phone.m4a', 'the chime stands in')
  assert.equal(lines.at(-1), '[sound] sound playing (the one chime stands in)')
  player.play('sting-reveal', [])
  assert.equal(procs.length, 1, 'an optional sting with no file: nothing spawned')
  assert.equal(lines.at(-1), '[sound] sound file missing; skipped')
  for (const l of lines) for (const id of SOUND_IDS) assert.ok(!l.includes(id))
  // the start-up prints the counts
  const src = readFileSync(new URL('../cues.mjs', import.meta.url), 'utf8')
  assert.ok(src.includes('soundFilesLines(soundReport)'), 'the counts are printed at the start')
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
  assert.deepEqual(r.actions, [{ type: 'sound', id: 'chime-news', clips: ['newsflash-opening', 'newsflash-signoff'], unknown: 1 }], 'the unknown one is counted, never named')
})

test('plan: a cue of recorded lines alone (the closing bulletin) plays them, once', () => {
  const r = plan({ hall: null, sound: null }, { sounds: { current: { id: null, at: 5000, clips: ['woof-close-field-motive'] } } }, 5000)
  assert.deepEqual(r.actions, [{ type: 'sound', id: null, clips: ['woof-close-field-motive'] }])
  assert.deepEqual(plan(r.state, { sounds: { current: { id: null, at: 5000, clips: ['woof-close-field-motive'] } } }, 5000).actions, [])
})

// ---- the recordings as codes, and the window that prints counts only ----------

const KEY = 'study-2026'

test('a recording\'s code is the same on the server and here, and the relay maps it back to its file with the key', () => {
  for (const id of CLIP_IDS) {
    assert.equal(clipCode(KEY, id), serverClipCode(KEY, id), 'functions/lib/news.js and cues/lib/cues.js agree')
    assert.match(clipCode(KEY, id), /^[0-9a-f]{16}$/)
  }
  const read = clipReader(` ${KEY} `)
  for (const id of CLIP_IDS) assert.equal(read(clipCode(KEY, id)), id)
  assert.equal(read('bulletin2-food-3'), 'bulletin2-food-3', 'a night with no key saved still sends names, and they play')
  assert.equal(read(clipCode('another-key', 'bulletin2-food-3')), null, 'a code from another key is not one of ours')
  assert.equal(read('nope'), null)
  const keyless = clipReader('')
  assert.equal(keyless(clipCode(KEY, 'bulletin2-food-3')), null, 'with no key here, a code cannot be read')
  // the planner plays the files the codes stand for, in order, and counts what it could not read
  const sent = ['bulletin2-opening', 'bulletin2-food-3', 'bulletin2-signoff'].map(id => clipCode(KEY, id))
  const r = plan({ hall: null, sound: null }, { sounds: { current: { id: 'sounder-bulletin', at: 1000, clips: sent } } }, 1000, { readClip: read })
  assert.deepEqual(r.actions, [{ type: 'sound', id: 'sounder-bulletin', clips: ['bulletin2-opening', 'bulletin2-food-3', 'bulletin2-signoff'] }])
  const lost = plan({ hall: null, sound: null }, { sounds: { current: { id: null, at: 2000, clips: sent } } }, 2000, { readClip: keyless })
  assert.deepEqual(lost.actions, [{ type: 'sound', id: null, clips: [], unknown: 3 }], 'no key: counted, so the window can say so')
})

test('the window\'s line for a cue is counts only: never a sound id, a recording, a code or a file name', () => {
  assert.equal(playLine({ recordings: 3, missing: 1 }), '[sound] bulletin: 3 recordings, 1 missing (the screen shows the words)')
  assert.equal(playLine({ sound: 'ok' }), '[sound] sound playing')
  assert.equal(playLine({ sound: 'missing', recordings: 1 }), '[sound] sound file missing; skipped; bulletin: 1 recording')
  assert.match(playLine({ unknown: 2 }), /2 recordings, 2 not recognised/)
  const lines = [playLine({ sound: 'ok', recordings: 40, missing: 12, unknown: 1 })]
  for (const l of lines) {
    for (const id of [...SOUND_IDS, ...CLIP_IDS]) assert.ok(!l.includes(id), 'no id')
    for (const f of ['food', 'bathroom', 'screens', 'personal', '.m4a', '/m/', 'media/']) assert.ok(!l.includes(f), 'no family, no sound file')
  }
  assert.equal(recordingFiles('/m', f => f === '/m/bulletin2-opening.m4a'), 1)
  // the relay's own source prints nothing but counts about sounds
  const src = readFileSync(new URL('../cues.mjs', import.meta.url), 'utf8')
  assert.ok(!/\[sound\] \$\{/.test(src) && !src.includes('missing.join'), 'cues.mjs never prints an id or a file')
  assert.ok(src.includes('clipReader(env.STATION_KEY)'), 'the key comes from cues/.env')
})

// A stand-in for child_process.spawn: each "afplay" is an emitter the test ends or kills.
function fakeSpawn() {
  const procs = []
  const spawn = (cmd, args) => {
    const p = new EventEmitter()
    p.cmd = cmd; p.file = args[0]; p.killed = false
    p.kill = () => { p.killed = true; queueMicrotask(() => p.emit('exit', null, 'SIGTERM')) }
    procs.push(p)
    return p
  }
  return { spawn, procs }
}
const tick = () => new Promise(r => setImmediate(r))

test('the player: a cue\'s files one after the other; a newer cue stops the recording that is playing before it starts', async () => {
  const { spawn, procs } = fakeSpawn()
  const lines = []
  const have = new Set(['/m/woof-close-studio-open.m4a', '/m/woof-close-field-murderer.m4a', '/m/woof-close-field-motive.m4a', '/m/chime-news.m4a'])
  const player = createPlayer({ mediaDir: '/m', exists: f => have.has(f), spawn, log: l => lines.push(l) })
  player.play(null, ['woof-close-studio-open', 'woof-close-field-murderer'])
  assert.equal(procs.length, 1, 'one file at a time')
  assert.equal(procs[0].file, '/m/woof-close-studio-open.m4a')
  assert.ok(player.playing())
  // Ava is still talking when the host presses the next name
  player.play(null, ['woof-close-field-motive'])
  assert.equal(procs[0].killed, true, 'the recording that was playing is stopped')
  assert.equal(procs.length, 2)
  assert.equal(procs[1].file, '/m/woof-close-field-motive.m4a', 'and the new one starts at once')
  await tick()
  assert.equal(procs.length, 2, 'the old cue\'s queue never carries on to Mic\'s first line')
  procs[1].emit('exit', 0)
  await tick()
  assert.equal(player.playing(), false)
  // a sound then its recordings, in order; a missing recording is skipped and counted
  player.play('chime-news', ['woof-close-studio-open', 'newsflash-opening'])
  assert.equal(procs.at(-1).file, '/m/chime-news.m4a')
  procs.at(-1).emit('exit', 0); await tick()
  assert.equal(procs.at(-1).file, '/m/woof-close-studio-open.m4a')
  procs.at(-1).emit('exit', 0); await tick()
  assert.equal(procs.length, 4, 'the missing one is not played')
  // a file that will not play moves on, once, even if the process then exits too
  player.play(null, ['woof-close-field-murderer', 'woof-close-field-motive'])
  const bad = procs.at(-1)
  bad.emit('error', new Error('afplay not found /m/woof-close-field-murderer.m4a'))
  bad.emit('exit', 1)
  await tick()
  assert.equal(procs.length, 6, 'the next file, once')
  // every line the window got: counts only
  assert.ok(lines.length >= 4)
  for (const l of lines) {
    for (const id of [...SOUND_IDS, ...CLIP_IDS]) assert.ok(!l.includes(id), `no id in "${l.length} chars"`)
    assert.ok(!l.includes('/m') && !l.includes('afplay'), 'no file name, no error text')
  }
  assert.ok(lines.includes('[sound] sound playing; bulletin: 2 recordings, 1 missing (the screen shows the words)'))
})

test('the player in fake mode plays nothing and says so in one count-only line', () => {
  const { spawn, procs } = fakeSpawn()
  const lines = []
  const player = createPlayer({ mediaDir: '/m', exists: () => true, spawn, log: l => lines.push(l), fake: true })
  player.play('sting-door', ['woof-close-field-out'])
  assert.equal(procs.length, 0)
  assert.deepEqual(lines, ['[sound] sound playing; bulletin: 1 recording (fake: nothing plays)'])
})

// ---- 24 Oct: chime-phone, video, the done callback, Hue scenes, the night doc ----

test('chime-phone is the last sound, on both sides (the ninth since 25 Oct 2026)', () => {
  assert.equal(SOUND_IDS.length, 9)
  assert.equal(SOUND_IDS.at(-1), 'chime-phone')
  assert.ok(knownSound('chime-phone'))
  assert.ok(!knownSound('power'), 'the power\'s return plays nothing')
  assert.deepEqual(plan({ hall: null, sound: null }, { sounds: { current: { id: 'chime-phone', at: 1000 } } }, 1000).actions, [{ type: 'sound', id: 'chime-phone' }])
  assert.deepEqual(plan({ hall: null, sound: null }, { sounds: { current: { id: 'power', at: 1000 } } }, 1000).actions, [{ type: 'refused', count: 1 }], 'an old server sending power is refused, counted')
})

test('video: the TV plays the bulletin, so the relay plays the chime and never the recordings; recordings alone play nothing', () => {
  const clips = ['newsflash-opening', 'newsflash-signoff']
  const r = plan({ hall: null, sound: null }, { sounds: { current: { id: 'chime-news', at: 1000, clips, video: true } } }, 1000)
  assert.deepEqual(r.actions, [{ type: 'sound', id: 'chime-news', video: true, onTv: 2 }])
  assert.deepEqual(plan(r.state, { sounds: { current: { id: 'chime-news', at: 1000, clips, video: true } } }, 1000).actions, [], 'once')
  const bare = plan({ hall: null, sound: null }, { sounds: { current: { id: 'chime-news', at: 2000, video: true } } }, 2000)
  assert.deepEqual(bare.actions, [{ type: 'sound', id: 'chime-news', video: true }], 'no clips sent: the chime, still marked as video')
  const closing = plan({ hall: null, sound: null }, { sounds: { current: { id: null, at: 3000, clips: ['woof-close-field-motive'], video: true } } }, 3000)
  assert.deepEqual(closing.actions, [{ type: 'video', count: 1 }])
  assert.deepEqual(plan(closing.state, { sounds: { current: { id: null, at: 3000, clips: ['woof-close-field-motive'], video: true } } }, 3000).actions, [], 'once')
  const refused = plan({ hall: null, sound: null }, { sounds: { current: { id: '7F3A', at: 4000, video: true } } }, 4000)
  assert.deepEqual(refused.actions, [{ type: 'refused', count: 1 }], 'an unknown id is refused, video or not')
  assert.deepEqual(plan({ hall: null, sound: null }, { sounds: { current: { id: 'chime-news', at: 1, clips, video: true } } }, 1 + SOUND_STALE_MS).actions, [], 'stale: nothing')
  // the window's line: counts only
  const line = playLine({ sound: 'ok', onTv: 2 })
  assert.equal(line, '[sound] sound playing; bulletin on the TV as video: 2 recordings not played here')
  assert.equal(playLine({ onTv: 1 }), '[sound] bulletin on the TV as video: 1 recording not played here')
  for (const id of [...SOUND_IDS, ...CLIP_IDS]) assert.ok(!line.includes(id))
  const src = readFileSync(new URL('../cues.mjs', import.meta.url), 'utf8')
  assert.ok(src.includes("a.type === 'video'") && src.includes('playLine({ onTv: a.count })'), 'a video cue logs a count and plays nothing')
})

test('the player tells the relay when a cue is done (so the music comes back), never for a cue a newer one cut off', async () => {
  const { spawn, procs } = fakeSpawn()
  const done = []
  const player = createPlayer({ mediaDir: '/m', exists: () => true, spawn })
  player.play('chime-news', ['newsflash-opening'], { onDone: () => done.push('first') })
  player.play('chime-phone', [], { onDone: () => done.push('second') })
  procs[0].emit('exit', 0)
  await tick()
  assert.deepEqual(done, [], 'the cut-off cue never reports done')
  procs[1].emit('exit', 0)
  await tick()
  assert.deepEqual(done, ['second'])
  const none = createPlayer({ mediaDir: '/m', exists: () => false, spawn })
  none.play('chime-phone', [], { onDone: () => done.push('nothing to play') })
  assert.deepEqual(done, ['second', 'nothing to play'], 'nothing to play: done at once')
  const lines = []
  const fake = createPlayer({ mediaDir: '/m', exists: () => true, spawn, fake: true, log: l => lines.push(l) })
  fake.play('chime-news', [], { onTv: 3, onDone: () => done.push('fake') })
  assert.equal(done.at(-1), 'fake')
  assert.deepEqual(lines, ['[sound] sound playing; bulletin on the TV as video: 3 recordings not played here (fake: nothing plays)'])
})

test('hue scenes: listed with their rooms, recalled by name (every scene with that name), forgiving case and spaces', async () => {
  const calls = []
  const data = {
    '/clip/v2/resource/scene': [
      { id: 's1', metadata: { name: 'Murderwin Default' }, group: { rid: 'z1', rtype: 'zone' } },
      { id: 's2', metadata: { name: 'murderwin  default ' }, group: { rid: 'r2', rtype: 'room' } },
      { id: 's3', metadata: { name: 'Murderwin Blackout' }, group: { rid: 'z1', rtype: 'zone' } },
    ],
    '/clip/v2/resource/room': [{ id: 'r2', metadata: { name: 'Orangerie' } }],
    '/clip/v2/resource/zone': [{ id: 'z1', metadata: { name: 'The house but the hall' } }],
  }
  const fetchImpl = async (url, opts) => {
    calls.push({ url, opts })
    const path = new URL(url).pathname
    return { ok: true, status: 200, text: async () => JSON.stringify({ data: data[path] ?? [] }) }
  }
  const hue = new Hue({ host: '10.0.0.4', key: 'k', fetchImpl })
  assert.deepEqual((await hue.scenes()).map(s => s.name), ['Murderwin Default', 'murderwin  default ', 'Murderwin Blackout'])
  const places = await hue.places()
  assert.equal(places.get('r2'), 'Orangerie')
  assert.equal(places.get('z1'), 'The house but the hall')
  calls.length = 0
  assert.equal(await hue.recallScene('Murderwin Default'), 2)
  const puts = calls.filter(c => c.opts.method === 'PUT')
  assert.deepEqual(puts.map(c => c.url), ['https://10.0.0.4/clip/v2/resource/scene/s1', 'https://10.0.0.4/clip/v2/resource/scene/s2'])
  for (const p of puts) assert.deepEqual(JSON.parse(p.opts.body), { recall: { action: 'active' } })
  assert.deepEqual(SCENE_RECALL, { recall: { action: 'active' } })
  assert.equal(await hue.recallScene('Murderwin Candles'), 0, 'none by that name: nothing recalled, and the caller says so')
  assert.equal(sameSceneName('Murderwin Study Dim', ' murderwin study  dim'), true)
  assert.equal(sameSceneName('', ''), false)
  assert.equal(sameSceneName('Murderwin Default', 'Murderwin Defaults'), false)
})

test('the relay watches the night doc as well as the public docs (the study too), and has the scene lister and the hardware checks', () => {
  const src = readFileSync(new URL('../cues.mjs', import.meta.url), 'utf8')
  assert.ok(src.includes('doc(db, `nights/${id}`)'), 'the night doc: act, beat, phase')
  for (const name of ['cues', 'relay', 'sounds', 'salem', 'study']) assert.ok(src.includes(`'${name}'`), name)
  for (const flag of ['--scenes', '--scene', '--check-music', '--check-strings', '--check-projector', '--offline', '--demo']) assert.ok(src.includes(`'${flag}'`), flag)
  assert.ok(src.includes('planScenes(sceneState, docs, now, sheet)'))
  // the planner's new actions are performed: the projector's plug, and the cake (then the sheet again)
  assert.ok(src.includes("if (a.type === 'projector') projector.set(a.do)"))
  assert.ok(src.includes("if (a.type === 'cake') serveCake(a)") && src.includes('sceneState = afterCake(sceneState)'))
  assert.ok(src.includes('PROJECTOR_SHORTCUTS') && src.includes('projectorShortcutNames(env)'), 'the projector is on with PROJECTOR_SHORTCUTS=on, its Shortcut names from cues/.env')
  // every cue brings the music back when it ends, even one that played nothing after cutting off a ducked one
  assert.ok(src.includes('if (ducksFor(a)) cueStarts()') && src.includes('onDone: () => cueEnds(a, startedAt)'))
  // the hall bulb keeps its own logic: scenes never set it
  assert.ok(!/recallScene\([^)]*HALL/.test(src))
  // offline mode never signs in
  assert.ok(src.indexOf('if (!OFFLINE) {') < src.indexOf('initializeApp(firebaseConfig)'))
})
