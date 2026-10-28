import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { stringsColour, nextChangeAt, salemToMirror, stringsBody, StringLights, createStringsMirror, DEFAULT_STRING_COLOURS, DECOR, RETRY_MS } from '../lib/strings.js'

const SHEET = JSON.parse(readFileSync(new URL('../scenes.json', import.meta.url), 'utf8'))
const ts = ms => ({ toMillis: () => ms }) // a Firestore Timestamp

const playing = (t0) => ({
  state: 'playing', round: 1, groupId: 'g1',
  flips: [{ at: ts(t0), colour: 'red' }, { at: ts(t0 + 3000), colour: 'green' }, { at: ts(t0 + 5000), colour: 'red' }],
  endsAt: ts(t0 + 30_000),
})

test('while the game plays: the colour of the last flip whose time has come, by the flips\' own timestamps', () => {
  const t0 = 1_000_000
  const s = playing(t0)
  assert.equal(stringsColour(s, t0 - 1), DECOR, 'before the first flip')
  assert.equal(stringsColour(s, t0), 'red')
  assert.equal(stringsColour(s, t0 + 2999), 'red')
  assert.equal(stringsColour(s, t0 + 3000), 'green')
  assert.equal(stringsColour(s, t0 + 4999), 'green')
  assert.equal(stringsColour(s, t0 + 29_999), 'red')
  assert.equal(stringsColour(s, t0 + 30_000), DECOR, 'the round is over')
  // flips out of order still count by their time
  const shuffled = { ...s, flips: [s.flips[2], s.flips[0], s.flips[1]] }
  assert.equal(stringsColour(shuffled, t0 + 3500), 'green')
  assert.equal(nextChangeAt(s, t0 + 100), t0 + 3000)
  assert.equal(nextChangeAt(s, t0 + 5000), t0 + 30_000, 'then the round\'s end')
  assert.equal(nextChangeAt({ ...s, state: 'passed' }, t0), null)
})

test('the rest of the time: the warm decor colour', () => {
  const t0 = 1_000_000
  for (const state of ['idle', 'intro', 'passed', 'cleared', undefined]) assert.equal(stringsColour({ ...playing(t0), state }, t0 + 4000), DECOR, String(state))
  assert.equal(stringsColour(null, t0), DECOR)
  assert.equal(stringsColour({ state: 'playing', flips: null, endsAt: null }, t0), DECOR)
  assert.equal(stringsColour({ state: 'playing', flips: [{ colour: 'red' }, { at: t0, colour: 'blue' }], endsAt: null }, t0 + 1), DECOR, 'a flip with no time, or a colour that is not red or green, is ignored')
  assert.equal(stringsColour({ state: 'playing', flips: [{ at: new Date(t0), colour: 'green' }], endsAt: null }, t0 + 1), 'green', 'a Date works too')
})

test('the Open API request: one PUT to the strings\' state, plain HTTP on port 16021, with the colour from scenes.json', async () => {
  assert.deepEqual(SHEET.strings, DEFAULT_STRING_COLOURS, 'the built-in colours match scenes.json')
  assert.deepEqual(stringsBody(SHEET.strings.red), { on: { value: true }, hue: { value: 0 }, sat: { value: 100 }, brightness: { value: 100, duration: 0 } })
  const calls = []
  const lights = new StringLights({ host: '192.168.1.60', token: 'tok', fetchImpl: async (url, opts) => { calls.push({ url, opts }); return { ok: true, status: 204 } } })
  await lights.show(SHEET.strings.green)
  assert.equal(calls[0].url, 'http://192.168.1.60:16021/api/v1/tok/state')
  assert.equal(calls[0].opts.method, 'PUT')
  assert.deepEqual(JSON.parse(calls[0].opts.body).hue, { value: 120 })
  const failing = new StringLights({ host: 'h', token: 't', fetchImpl: async () => ({ ok: false, status: 401 }) })
  await assert.rejects(failing.show(SHEET.strings.red), /401/)
  assert.throws(() => new StringLights({ host: '', token: 't' }))
})

const settle = () => new Promise(r => setImmediate(r))

test('the mirror sends only changes, the newest colour wins, and a silent string costs one line, not one a flip', async () => {
  const sent = []
  let answer = true
  let hold = null
  const lights = {
    show: async (setting) => {
      if (hold) await hold
      if (!answer) throw new Error('no route to host')
      sent.push(setting.hue)
    },
  }
  const lines = []
  const m = createStringsMirror({ lights, colours: SHEET.strings, log: l => lines.push(l) })
  m.update('decor'); await settle()
  m.update('decor'); m.update('decor'); await settle()
  assert.deepEqual(sent, [32], 'once, however often it is asked')
  // a slow string: red then green asked while red is still on its way; red, then green, never three
  let release; hold = new Promise(r => { release = r })
  m.update('red'); m.update('green'); m.update('green')
  hold = null; release(); await settle(); await settle()
  assert.deepEqual(sent, [32, 0, 120])
  assert.equal(m.shown(), 'green')
  // the strings stop answering: one line, then quiet; they come back: one line
  answer = false
  m.update('red'); await settle()
  m.update('green'); await settle()
  m.update('red'); await settle()
  assert.equal(lines.filter(l => l.includes('did not answer')).length, 1)
  answer = true
  m.update('green'); await settle()
  assert.equal(m.shown(), 'green')
  assert.deepEqual(lines, ['[strings] the string lights did not answer; the phones carry the colour', '[strings] the string lights are answering again'])
})

test('strings that stop answering on one colour are tried again every fifteen seconds, not ten times a second', async () => {
  let clock = 0
  let tries = 0
  let answer = false
  const lights = { show: async () => { tries++; if (!answer) throw new Error('down') } }
  const m = createStringsMirror({ lights, colours: SHEET.strings, now: () => clock })
  m.update('decor'); await settle()
  for (let i = 0; i < 50; i++) { clock += 100; m.update('decor'); await settle() }
  assert.equal(tries, 1, 'five seconds of asking: one try')
  answer = true
  clock += RETRY_MS
  m.update('decor'); await settle()
  assert.equal(tries, 2)
  assert.equal(m.shown(), 'decor', 'back, and showing decor')
})

test('the mirror in fake mode, and with no strings set up, sends nothing', () => {
  const lines = []
  const fake = createStringsMirror({ lights: null, colours: SHEET.strings, log: l => lines.push(l), fake: true })
  fake.update('red'); fake.update('red'); fake.update('decor')
  assert.deepEqual(lines, ['[strings] would show red', '[strings] would show decor'])
  const none = createStringsMirror({ lights: null, colours: SHEET.strings, log: l => lines.push(l) })
  none.update('green')
  assert.equal(lines.length, 2, 'not set up: quiet')
})

test('the relay watches Salem\'s public doc and checks the colour ten times a second', () => {
  const src = readFileSync(new URL('../cues.mjs', import.meta.url), 'utf8')
  assert.ok(src.includes("'salem'"), 'nights/{id}/public/salem')
  assert.ok(src.includes('setInterval(mirrorStrings, 100)'))
  assert.ok(src.includes('NANOLEAF_STRINGS_HOST') && src.includes('NANOLEAF_STRINGS_TOKEN'))
})

// ---- through Apple Home: one Shortcut per colour (STRINGS_SHORTCUTS=on) ----

test('through Apple Home: each colour runs its own Shortcut, by its exact name', async () => {
  const { ShortcutLights, shortcutColours, STRING_SHORTCUTS } = await import('../lib/strings.js')
  assert.deepEqual(Object.keys(STRING_SHORTCUTS).sort(), ['decor', 'green', 'red'])
  const colours = shortcutColours()
  assert.deepEqual(colours.red, { shortcut: 'Red Murderwin Strings' })
  const ran = []
  const lights = new ShortcutLights({ run: async (name) => { ran.push(name) } })
  await lights.show(colours.green)
  await lights.show(colours.decor)
  assert.deepEqual(ran, ['Green Murderwin Strings', 'Decor Murderwin Strings'])
  await assert.rejects(lights.show({ hue: 0 }), /no shortcut/)
})

test('runShortcut asks macOS to run the named Shortcut, and a failure rejects', async () => {
  const { runShortcut } = await import('../lib/strings.js')
  const calls = []
  let closed = false
  // the real tool waits on stdin until it closes: answer only once it has
  const ok = (cmd, args, opts, cb) => { calls.push([cmd, args, opts.timeout]); return { stdin: { end: () => { closed = true; cb(null) } } } }
  await runShortcut('Red Murderwin Strings', { timeoutMs: 5000, execFileImpl: ok })
  assert.deepEqual(calls, [['shortcuts', ['run', 'Red Murderwin Strings'], 5000]])
  assert.ok(closed, 'stdin is closed so the Shortcut does not wait for input')
  const missing = (cmd, args, opts, cb) => cb(Object.assign(new Error('not found'), { code: 1 }))
  await assert.rejects(runShortcut('Nope', { execFileImpl: missing }), /shortcut Nope/)
})

test('the mirror drives Shortcuts like the paired strings: only changes, one line when they stop answering', async () => {
  const { ShortcutLights, shortcutColours } = await import('../lib/strings.js')
  const ran = []
  let fail = false
  const lights = new ShortcutLights({ run: async (name) => { if (fail) throw new Error('no home'); ran.push(name) } })
  const logs = []
  const mirror = createStringsMirror({ lights, colours: shortcutColours(), log: l => logs.push(l) })
  mirror.update('red'); await new Promise(r => setTimeout(r, 5))
  mirror.update('red'); await new Promise(r => setTimeout(r, 5))
  assert.deepEqual(ran, ['Red Murderwin Strings'], 'the same colour is not sent twice')
  fail = true
  mirror.update('green'); await new Promise(r => setTimeout(r, 5))
  assert.equal(logs.filter(l => l.includes('did not answer')).length, 1)
})

// ---- 25 Oct 2026, the cue list: the projector's plug through Apple Home ----

test('the projector: two Shortcuts by their exact names, renamed only in cues/.env; set(on|off) runs one each, in order', async () => {
  const { PROJECTOR_SHORTCUTS, projectorShortcutNames, createProjectorSwitch } = await import('../lib/strings.js')
  assert.deepEqual(PROJECTOR_SHORTCUTS, { on: 'Projector Murderwin On', off: 'Projector Murderwin Off' })
  assert.deepEqual(projectorShortcutNames({}), PROJECTOR_SHORTCUTS)
  assert.deepEqual(projectorShortcutNames({ PROJECTOR_SHORTCUT_ON: ' Beamer On ', PROJECTOR_SHORTCUT_OFF: '' }), { on: 'Beamer On', off: 'Projector Murderwin Off' })
  const ran = []
  const logs = []
  const p = createProjectorSwitch({ enabled: true, run: async (name, { timeoutMs }) => { ran.push([name, timeoutMs]) }, log: l => logs.push(l) })
  p.set('off'); p.set('on')
  await p.idle()
  assert.deepEqual(ran, [['Projector Murderwin Off', 8000], ['Projector Murderwin On', 8000]], 'one Shortcut per change, in order')
  assert.deepEqual(logs, ['[projector] off', '[projector] on'])
  await p.set('sideways')
  assert.equal(ran.length, 2, 'only on and off')
  // renamed on the Mac: the .env names are used
  const named = []
  const q = createProjectorSwitch({ enabled: true, names: projectorShortcutNames({ PROJECTOR_SHORTCUT_ON: 'Beamer On' }), run: async name => { named.push(name) } })
  await q.set('on')
  assert.deepEqual(named, ['Beamer On'])
})

test('the projector: a failing Shortcut is one plain line and never stops the relay; not enabled, or fake, it only says what it would do', async () => {
  const { createProjectorSwitch } = await import('../lib/strings.js')
  const logs = []
  const p = createProjectorSwitch({ enabled: true, run: async () => { throw new Error('shortcut Projector Murderwin On: 1') }, log: l => logs.push(l) })
  await p.set('on')
  assert.equal(logs.length, 1)
  assert.match(logs[0], /^\[projector\] on failed .*switch the plug in the Home app$/)
  const ran = []
  const off = createProjectorSwitch({ enabled: false, run: async name => { ran.push(name) }, log: l => logs.push(l) })
  await off.set('off')
  assert.deepEqual(ran, [], 'not enabled: nothing runs')
  assert.equal(logs.at(-1), '[projector] would switch the projector off (PROJECTOR_SHORTCUTS is not on in cues/.env)')
  const fake = createProjectorSwitch({ enabled: true, fake: true, run: async name => { ran.push(name) }, log: l => logs.push(l) })
  await fake.set('on')
  assert.deepEqual(ran, [])
  assert.equal(logs.at(-1), '[projector] would switch the projector on')
})

test('the relay switches the projector through the same `shortcuts run` as the string lights, and reads PROJECTOR_SHORTCUTS from cues/.env', () => {
  const src = readFileSync(new URL('../cues.mjs', import.meta.url), 'utf8')
  assert.ok(src.includes('onSwitch(env.PROJECTOR_SHORTCUTS)'))
  assert.ok(src.includes('createProjectorSwitch({ enabled: projectorOn, names: projectorShortcutNames(env)'))
  const lib = readFileSync(new URL('../lib/strings.js', import.meta.url), 'utf8')
  assert.ok(lib.includes('run = runShortcut') && lib.includes('await run(names[state], { timeoutMs })'), 'through runShortcut')
  const example = readFileSync(new URL('../.env.example', import.meta.url), 'utf8')
  for (const k of ['PROJECTOR_SHORTCUTS', 'PROJECTOR_SHORTCUT_ON', 'PROJECTOR_SHORTCUT_OFF']) assert.ok(example.includes(k), `${k} in cues/.env.example`)
})

test('the strings follow the Game test practice while it plays, and the night\'s game always wins', () => {
  const playing = { state: 'playing', flips: [{ at: 1000, colour: 'red' }] }
  const practice = { state: 'playing', flips: [{ at: 1000, colour: 'green' }] }
  assert.equal(salemToMirror(null, practice), practice)
  assert.equal(salemToMirror({ state: 'idle' }, practice), practice)
  assert.equal(salemToMirror(playing, practice), playing)
  assert.equal(stringsColour(salemToMirror({ state: 'idle' }, { state: 'idle' }), 2000), DECOR)
  assert.equal(stringsColour(salemToMirror(null, practice), 2000), 'green')
})
