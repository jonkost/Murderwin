import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createMusic, SCRIPTS, playlistNames, musicProblem, runOsascript, FADE_STEPS } from '../lib/music.js'

const ARRIVAL = { name: 'Murderwin · Arrival', volume: 70 }
const INVESTIGATION = { name: 'Murderwin · Investigation', volume: 40 }

// A stand-in for osascript: records each call, answers from `replies` (by
// script), and can be held so the test sees the order of the calls.
function fakeRun(replies = {}) {
  const calls = []
  const run = async (lines, args = []) => {
    const which = Object.keys(SCRIPTS).find(k => SCRIPTS[k] === lines)
    calls.push({ which, args })
    const r = replies[which]
    if (r instanceof Error) throw r
    return typeof r === 'function' ? r(args) : (r ?? '')
  }
  return { run, calls }
}

test('play: the playlist by name and its spellings, at its volume, on shuffle and repeat; one line in the window', async () => {
  const { run, calls } = fakeRun({ play: 'playing' })
  const lines = []
  const m = createMusic({ run, log: l => lines.push(l), whisper: 10 })
  await m.play(ARRIVAL)
  assert.deepEqual(calls, [{ which: 'play', args: ['70', ...playlistNames('Murderwin · Arrival')] }])
  assert.deepEqual(lines, ['[music] Murderwin · Arrival'])
  const script = SCRIPTS.play.join('\n')
  assert.ok(script.includes('set shuffle enabled to true') && script.includes('set song repeat to all'), 'shuffle and repeat')
  assert.ok(script.includes('return "already"') && script.includes('return "resumed"'), 'a playlist already on is left alone; a paused one carries on')
  for (const s of Object.values(SCRIPTS)) assert.ok(!s.join('\n').includes('Murderwin'), 'names arrive as arguments, never pasted into a script')
})

test('a missing playlist, or no permission yet, is one plain line; the relay carries on and the next command still runs', async () => {
  const lines = []
  const denied = new Error('execution error: Not authorized to send Apple events to Music. (-1743)')
  let replies = { play: 'missing' }
  const { run, calls } = fakeRun(new Proxy({}, { get: (_, k) => replies[k] }))
  let clock = 0
  const m = createMusic({ run, log: l => lines.push(l), now: () => clock })
  await m.play(INVESTIGATION)
  assert.match(lines.at(-1), /no playlist called "Murderwin · Investigation" in Music/)
  replies = { play: denied, pause: denied }
  await m.play(ARRIVAL)
  await m.pause()
  assert.equal(lines.filter(l => l.includes('Automation')).length, 1, 'the same problem once a minute, not on every command')
  clock += 61_000
  await m.pause()
  assert.equal(lines.filter(l => l.includes('Automation')).length, 2, 'and again after a minute')
  replies = { pause: 'paused' }
  await m.pause()
  assert.equal(lines.at(-1), '[music] stopped', 'the chain is not broken by a failure')
  assert.equal(calls.length, 5)
})

test('duck and unduck: down to the whisper under a cue, back to the playing playlist\'s volume after; once each', async () => {
  const { run, calls } = fakeRun({ play: 'playing', fade: 'faded' })
  const m = createMusic({ run, whisper: 12 })
  await m.unduck()
  assert.equal(calls.length, 0, 'nothing to bring back')
  await m.duck()
  await m.duck()
  assert.deepEqual(calls, [{ which: 'fade', args: ['12', String(FADE_STEPS.down)] }], 'one dip')
  assert.equal(m.ducked(), true)
  await m.unduck()
  assert.equal(calls.length, 1, 'no playlist put on yet: nothing to come back to')
  await m.play(INVESTIGATION)
  await m.duck()
  await m.unduck()
  assert.deepEqual(calls.slice(-2), [{ which: 'fade', args: ['12', String(FADE_STEPS.down)] }, { which: 'fade', args: ['40', String(FADE_STEPS.up)] }])
})

test('a playlist that starts while a cue is playing starts at the whisper, and comes up when the cue ends', async () => {
  const { run, calls } = fakeRun({ play: 'playing', fade: 'faded' })
  const m = createMusic({ run, whisper: 10 })
  m.duck()                     // the power sound begins…
  await m.play(INVESTIGATION)  // …as the power returns and Investigation starts
  await m.unduck()             // the sound ends
  assert.deepEqual(calls.map(c => c.which), ['fade', 'play', 'fade'])
  assert.equal(calls[1].args[0], '10', 'started at the whisper')
  assert.equal(calls[2].args[0], '40', 'then up to its own level')
})

test('commands run one at a time, in order, even when osascript is slow', async () => {
  const order = []
  let release
  const gate = new Promise(r => { release = r })
  const run = async (lines) => {
    const which = Object.keys(SCRIPTS).find(k => SCRIPTS[k] === lines)
    order.push(`start ${which}`)
    if (which === 'play') await gate
    order.push(`end ${which}`)
    return which === 'play' ? 'playing' : 'paused'
  }
  const m = createMusic({ run })
  m.play(ARRIVAL)
  const done = m.pause()
  await new Promise(r => setImmediate(r))
  assert.deepEqual(order, ['start play'], 'the pause waits for the play')
  release()
  await done
  assert.deepEqual(order, ['start play', 'end play', 'start pause', 'end pause'])
})

test('fake mode never runs osascript and says what it would do', async () => {
  const { run, calls } = fakeRun()
  const lines = []
  const m = createMusic({ run, fake: true, log: l => lines.push(l) })
  await m.play(ARRIVAL); await m.duck(); await m.unduck(); await m.pause()
  assert.equal(calls.length, 0)
  assert.deepEqual(lines, ['[music] would play Murderwin · Arrival', '[music] would stop'])
})

test('the playlist is found under easier spellings of its middle dot', () => {
  assert.deepEqual(playlistNames('Murderwin · Arrival'), ['Murderwin · Arrival', 'Murderwin - Arrival', 'Murderwin – Arrival', 'Murderwin: Arrival', 'Murderwin Arrival'])
  assert.deepEqual(playlistNames(' Supper '), ['Supper'])
})

test('osascript\'s errors in plain words', () => {
  assert.match(musicProblem(new Error('Not authorized to send Apple events to Music. (-1743)')), /Automation/)
  assert.match(musicProblem(new Error('spawn osascript ENOENT')), /not a Mac/)
  assert.match(musicProblem(new Error('Music got an error: Application isn’t running. (-600)')), /not running/)
  assert.match(musicProblem(new Error('anything else')), /did not answer/)
})

test('runOsascript: one -e per line, then the arguments; its error is the stderr', async () => {
  let seen = null
  const ok = (cmd, argv, opts, cb) => { seen = { cmd, argv, opts }; cb(null, ' playing\n', '') }
  assert.equal(await runOsascript(['on run argv', 'end run'], [70, 'X'], { execFileImpl: ok }), 'playing')
  assert.equal(seen.cmd, 'osascript')
  assert.deepEqual(seen.argv, ['-e', 'on run argv', '-e', 'end run', '70', 'X'])
  assert.ok(seen.opts.timeout > 0, 'a hung Music cannot hang the relay')
  const bad = (cmd, argv, opts, cb) => cb(new Error('exit 1'), '', 'Not authorized (-1743)')
  await assert.rejects(runOsascript(['x'], [], { execFileImpl: bad }), /-1743/)
})

test('the relay only touches Music through lib/music.js, and MUSIC=off leaves it alone', () => {
  const src = readFileSync(new URL('../cues.mjs', import.meta.url), 'utf8')
  assert.ok(!src.includes("'osascript'"), 'no osascript in cues.mjs itself')
  assert.ok(src.includes('offSwitch(env.MUSIC)'))
})
