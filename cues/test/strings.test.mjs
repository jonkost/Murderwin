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
  // 31 Oct 2026: with the pairing and STRINGS_SHORTCUTS=on both set, both roads; and --check-strings
  // waits for a Shortcut that is still running, so its report (the "partially succeeded" line) is seen
  assert.ok(src.includes('new TwoWayLights({ direct, shortcuts, log })'), 'both roads')
  assert.ok(src.includes('new ShortcutLights({ log })'), 'the Shortcuts log their late lines')
  assert.ok(src.includes('await stringLights.idle()'), 'the check waits for the report')
})

// ---- through Apple Home: one Shortcut per colour (STRINGS_SHORTCUTS=on) ----

test('through Apple Home: each colour runs its own Shortcut, by its exact name', async () => {
  const { ShortcutLights, shortcutColours, STRING_SHORTCUTS } = await import('../lib/strings.js')
  assert.deepEqual(Object.keys(STRING_SHORTCUTS).sort(), ['decor', 'green', 'red'])
  const colours = shortcutColours()
  assert.deepEqual(colours.red, { shortcut: 'Red Murderwin Strings' })
  assert.deepEqual(colours, { red: { shortcut: 'Red Murderwin Strings' }, green: { shortcut: 'Green Murderwin Strings' }, decor: { shortcut: 'Decor Murderwin Strings' } })
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
  // what the tool said comes through, with how long it took and whether the scene only partly ran (31 Oct 2026)
  let clock = 0
  const partial = (cmd, args, opts, cb) => { clock += 64_000; cb(Object.assign(new Error('Command failed'), { code: 1 }), '', 'Error: Action set execution partially succeeded.\n') }
  const e = await runShortcut('Red Murderwin Strings', { execFileImpl: partial, now: () => clock }).catch(e => e)
  assert.match(e.message, /^shortcut Red Murderwin Strings: Action set execution partially succeeded\./)
  assert.equal(e.partial, true)
  assert.equal(e.took, 64_000)
  const killed = (cmd, args, opts, cb) => cb(Object.assign(new Error('killed'), { killed: true, signal: 'SIGTERM' }))
  const k = await runShortcut('Red Murderwin Strings', { execFileImpl: killed }).catch(e => e)
  assert.match(k.message, /did not finish/)
  assert.equal(k.partial, false)
})

// ---- 31 Oct 2026: a Home scene with a straggler runs a minute, then "partially succeeded" ----

test('a colour counts as sent after the head start, whether or not the Shortcut has finished; a late failure is one plain line that says what to fix', async () => {
  const { ShortcutLights, shortcutColours, SHORTCUT_HEAD_START_MS, SHORTCUT_TIMEOUT_MS } = await import('../lib/strings.js')
  assert.ok(SHORTCUT_HEAD_START_MS >= 500 && SHORTCUT_HEAD_START_MS <= 1500, 'well past the tenth of a second a real failure takes, well under the shortest hold of a colour')
  assert.ok(SHORTCUT_TIMEOUT_MS >= 70_000, 'longer than the minute Apple Home waits on a straggler')
  const colours = shortcutColours()
  const logs = []
  // the run hangs until released; the head start is released by hand too
  let release, releaseHead
  let runs = 0
  const lights = new ShortcutLights({
    run: (name) => { runs++; return new Promise((_, reject) => { release = reject }) },
    wait: () => new Promise(r => { releaseHead = r }),
    log: l => logs.push(l),
  })
  const shown = lights.show(colours.red)
  let done = false
  shown.then(() => { done = true })
  await settle()
  assert.equal(done, false, 'not yet: neither the Shortcut nor the head start')
  assert.equal(lights.running(), 1)
  releaseHead(); await settle(); await settle()
  assert.equal(done, true, 'the head start passed: the colour counts as sent')
  assert.deepEqual(logs, [], 'nothing to say yet')
  // a minute later the tool says the scene only partly ran: one line, with the fix
  release(Object.assign(new Error('shortcut Red Murderwin Strings: Action set execution partially succeeded.'), { partial: true, took: 64_000 }))
  await settle(); await settle()
  assert.equal(logs.length, 1)
  assert.match(logs[0], /Red Murderwin Strings Shortcut ran for 64 s and then said "partially succeeded"/)
  assert.match(logs[0], /Home app.*No Response/)
  assert.equal(lights.running(), 0)
  // the next colour's late failure says nothing more, until a run succeeds
  const again = lights.show(colours.green)
  releaseHead(); await settle(); await settle()
  await again
  release(Object.assign(new Error('partial'), { partial: true, took: 63_000 }))
  await settle(); await settle()
  assert.equal(logs.length, 1, 'quiet the second time')
  // a run that finishes inside the head start: no waiting, and the warning is cleared
  const quick = new ShortcutLights({ run: async () => {}, wait: () => new Promise(() => {}), log: l => logs.push(l) })
  await quick.show(colours.decor)
  assert.equal(quick.running(), 0)
  // a run that fails inside the head start is a real failure: the colour is not sent
  const broken = new ShortcutLights({ run: async () => { throw new Error('shortcut Nope: not found') }, wait: () => new Promise(() => {}) })
  await assert.rejects(broken.show(colours.decor), /not found/)
  // a late failure that is not a partial success: the other line
  let rej
  const slow = new ShortcutLights({ run: () => new Promise((_, r) => { rej = r }), wait: async () => {}, log: l => logs.push(l) })
  await slow.show(colours.red)
  rej(Object.assign(new Error('shortcut Red Murderwin Strings: it did not finish'), { partial: false, took: 90_000 }))
  await settle(); await settle()
  assert.match(logs.at(-1), /did not finish after 90 s/)
  await slow.idle()
  // the same Shortcut run again cancels the earlier run still waiting on its straggler: the newer colour took over, nothing to say
  const n = logs.length
  let cancel
  const twice = new ShortcutLights({ run: () => new Promise((_, r) => { cancel = r }), wait: async () => {}, log: l => logs.push(l) })
  await twice.show(colours.green)
  cancel(Object.assign(new Error('shortcut Green Murderwin Strings v2: Running was cancelled'), { partial: false, cancelled: true, took: 56_000 }))
  await settle(); await settle()
  assert.equal(logs.length, n, 'a cancelled run is quiet')
})

test('both roads at once: the pairing first, and the Shortcuts from the first time it fails, with one line that says why', async () => {
  const { TwoWayLights, ShortcutLights, StringLights, shortcutColours } = await import('../lib/strings.js')
  const colours = shortcutColours(undefined, SHEET.strings)
  assert.deepEqual(colours.red, { ...SHEET.strings.red, shortcut: 'Red Murderwin Strings' }, 'each colour carries both the Open API body and its Shortcut')
  const puts = []
  const ran = []
  const logs = []
  let status = 204
  const direct = new StringLights({ host: 'h', token: 't', fetchImpl: async (url, opts) => { puts.push(JSON.parse(opts.body).hue.value); return { ok: status < 300, status } } })
  const shortcuts = new ShortcutLights({ run: async name => { ran.push(name) }, wait: () => new Promise(() => {}) })
  const both = new TwoWayLights({ direct, shortcuts, log: l => logs.push(l) })
  await both.show(colours.red)
  assert.deepEqual([puts, ran], [[0], []], 'the pairing answers: no Shortcut')
  status = 401
  await both.show(colours.green)
  assert.deepEqual([puts, ran], [[0, 120], ['Green Murderwin Strings']], 'refused: the Shortcut carries it')
  assert.equal(logs.length, 1)
  assert.match(logs[0], /stale/)
  status = 204
  await both.show(colours.decor)
  assert.deepEqual([puts, ran], [[0, 120], ['Green Murderwin Strings', 'Decor Murderwin Strings']], 'the pairing is not tried again this run')
  assert.equal(logs.length, 1)
  // no answer at all: the other line
  const dead = new StringLights({ host: 'h', token: 't', fetchImpl: async () => { throw new Error('no route to host') } })
  const other = new TwoWayLights({ direct: dead, shortcuts, log: l => logs.push(l) })
  await other.show(colours.red)
  assert.match(logs.at(-1), /did not answer at their own address/)
  assert.throws(() => new TwoWayLights({ direct: null, shortcuts }))
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
  assert.deepEqual(ran, [['Projector Murderwin Off', 90_000], ['Projector Murderwin On', 90_000]], 'one Shortcut per change, in order, with the long timeout behind the head start (31 Oct 2026)')
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
  assert.ok(lib.includes('run = runShortcut') && lib.includes('await runner.fire(names[state])'), 'through the one Shortcut runner (31 Oct 2026)')
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

test('game wide (31 Oct 2026): the projector goes through the same runner, so a Home scene with a straggler never stalls a cue; a late failure is one plain line', async () => {
  const { createProjectorSwitch, createShortcutRunner, runShortcut } = await import('../lib/strings.js')
  const logs = []
  let settle
  const p = createProjectorSwitch({ enabled: true, run: () => new Promise((_, r) => { settle = r }), wait: async () => {}, log: l => logs.push(l) })
  await p.set('off')
  assert.deepEqual(logs, ['[projector] off'], 'done after the head start, the Shortcut still running')
  assert.equal(p.running(), 1)
  settle(Object.assign(new Error('shortcut Projector Murderwin Off: Action set execution partially succeeded.'), { partial: true, took: 61_000 }))
  await p.idle()
  assert.equal(logs.length, 2)
  assert.match(logs[1], /^\[projector\] the Projector Murderwin Off Shortcut ran for 61 s and then said "partially succeeded".*Home app.*No Response/)
  // a run a newer one has replaced says nothing when it fails late; fire() hands back its `done`
  const quiet2 = []
  const rejects = []
  const two = createShortcutRunner({ tag: 't', run: () => new Promise((_, r) => { rejects.push(r) }), wait: async () => {}, log: l => quiet2.push(l) })
  const first = await two.fire('One')
  await two.fire('Two')
  assert.ok(first.done instanceof Promise)
  rejects[0](Object.assign(new Error('shortcut One: Action set execution failed.'), { partial: false, took: 6000 }))
  await first.done
  assert.deepEqual(quiet2, [], 'the replaced run is quiet')
  rejects[1](Object.assign(new Error('shortcut Two: Action set execution failed.'), { partial: false, took: 11_000 }))
  await two.idle()
  assert.equal(quiet2.length, 1, 'the newest run still reports')
  assert.match(quiet2[0], /the Two Shortcut did not finish after 11 s/)
  // runShortcut marks a cancelled run, and the runner says nothing about one
  const cancelled = (cmd, args, opts, cb) => cb(Object.assign(new Error('x'), { code: 1 }), '', 'Error: Running was cancelled\n')
  const e = await runShortcut('Green Murderwin Strings v2', { execFileImpl: cancelled }).catch(e => e)
  assert.equal(e.cancelled, true)
  const quiet = []
  let r2
  const runner = createShortcutRunner({ tag: 'test', run: () => new Promise((_, r) => { r2 = r }), wait: async () => {}, log: l => quiet.push(l) })
  await runner.fire('Anything')
  r2(e)
  await runner.idle()
  assert.deepEqual(quiet, [])
})
