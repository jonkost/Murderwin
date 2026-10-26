import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createMusic, SCRIPTS, playlistNames, musicProblem, runOsascript, FADE_STEPS } from '../lib/music.js'

const JAZZ = { name: 'Murderwin · Jazz', volume: 70 }
const INTENSE = { name: 'Murderwin · Intense', volume: 40 }

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
  await m.play(JAZZ)
  assert.deepEqual(calls, [{ which: 'play', args: ['70', ...playlistNames('Murderwin · Jazz')] }])
  assert.deepEqual(lines, ['[music] Murderwin · Jazz at 70'], 'the line carries the volume since 25 Oct 2026: one playlist plays at two levels (jazz 55 and 30, intense 35 and 60)')
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
  await m.play(INTENSE)
  assert.match(lines.at(-1), /no playlist called "Murderwin · Intense" in Music/)
  replies = { play: denied, pause: denied }
  await m.play(JAZZ)
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
  await m.play(INTENSE)
  await m.duck()
  await m.unduck()
  assert.deepEqual(calls.slice(-2), [{ which: 'fade', args: ['12', String(FADE_STEPS.down)] }, { which: 'fade', args: ['40', String(FADE_STEPS.up)] }])
})

test('a playlist that starts while a cue is playing starts at the whisper, and comes up when the cue ends', async () => {
  const { run, calls } = fakeRun({ play: 'playing', fade: 'faded' })
  const m = createMusic({ run, whisper: 10 })
  m.duck()                     // the door's sting begins…
  await m.play(INTENSE)        // …as the door opens and Intense starts
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
  m.play(JAZZ)
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
  await m.play(JAZZ); await m.duck(); await m.unduck(); await m.pause()
  assert.equal(calls.length, 0)
  assert.deepEqual(lines, ['[music] would play Murderwin · Jazz at 70', '[music] would stop'])
})

test('the playlist is found under easier spellings of its middle dot', () => {
  assert.deepEqual(playlistNames('Murderwin · Jazz'), ['Murderwin · Jazz', 'Murderwin - Jazz', 'Murderwin – Jazz', 'Murderwin: Jazz', 'Murderwin Jazz'])
  assert.deepEqual(playlistNames(' Credits '), ['Credits'])
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

// ---- 25 Oct 2026, Cake!: one song from the library, and following it to its end ----

test('playTrack: the song by its exact name at its volume, shuffle and repeat off, played once; a missing song is one plain line and "missing"', async () => {
  const { run, calls } = fakeRun({ track: 'playing' })
  const lines = []
  const m = createMusic({ run, log: l => lines.push(l), whisper: 10 })
  assert.equal(await m.playTrack({ name: 'Happy Birthday for Dogs', volume: 60 }), 'playing')
  assert.deepEqual(calls, [{ which: 'track', args: ['60', 'Happy Birthday for Dogs'] }])
  assert.deepEqual(lines, ['[music] the song Happy Birthday for Dogs at 60'])
  const script = SCRIPTS.track.join('\n')
  assert.ok(script.includes('first track whose name is songName'), 'one track from the library, not a playlist')
  assert.ok(script.includes('set shuffle enabled to false') && script.includes('set song repeat to off'), 'once, in order')
  assert.ok(script.includes('return "missing"'))
  assert.ok(!script.includes('Happy Birthday'), 'the name arrives as an argument')
  // then unduck returns to the song's volume while it plays
  const { run: run2, calls: calls2 } = fakeRun({ track: 'playing', fade: 'faded' })
  const m2 = createMusic({ run: run2, whisper: 10 })
  await m2.playTrack({ name: 'X', volume: 60 })
  await m2.duck(); await m2.unduck()
  assert.deepEqual(calls2.slice(-2).map(c => c.args[0]), ['10', '60'], 'a chime during the song dips it and comes back to 60')
  // missing, denied, fake
  const missing = createMusic({ run: fakeRun({ track: 'missing' }).run, log: l => lines.push(l) })
  assert.equal(await missing.playTrack({ name: 'X', volume: 60 }), 'missing')
  assert.match(lines.at(-1), /no song called "X" in the Music library/)
  const denied = createMusic({ run: fakeRun({ track: new Error('Not authorized (-1743)') }).run, log: l => lines.push(l) })
  assert.equal(await denied.playTrack({ name: 'X', volume: 60 }), 'failed')
  assert.match(lines.at(-1), /Automation/)
  const fake = createMusic({ run: fakeRun().run, fake: true, log: l => lines.push(l) })
  assert.equal(await fake.playTrack({ name: 'X', volume: 60 }), 'playing')
  assert.equal(lines.at(-1), '[music] would play the song X at 60, once')
})

test('nowPlaying: what Music is doing, or null when it cannot be read', async () => {
  const replies = { nowPlaying: 'playing\tHappy Birthday for Dogs' }
  const { run } = fakeRun(new Proxy({}, { get: (_, k) => replies[k] }))
  const m = createMusic({ run })
  assert.deepEqual(await m.nowPlaying(), { playing: true, track: 'Happy Birthday for Dogs' })
  replies.nowPlaying = 'playing\t'
  assert.deepEqual(await m.nowPlaying(), { playing: true, track: null })
  replies.nowPlaying = 'stopped'
  assert.deepEqual(await m.nowPlaying(), { playing: false, track: null })
  replies.nowPlaying = 'not running'
  assert.deepEqual(await m.nowPlaying(), { playing: false, track: null })
  replies.nowPlaying = new Error('Not authorized (-1743)')
  assert.equal(await m.nowPlaying(), null)
  assert.equal(await createMusic({ run, fake: true }).nowPlaying(), null)
  assert.ok(SCRIPTS.nowPlaying.join('\n').includes('name of current track'))
})

// A clock the test moves by hand, with setTimeout and clearTimeout to match.
function fakeClock() {
  let t = 0
  let timers = []
  const setTimeout = (fn, ms) => { const h = { at: t + ms, fn }; timers.push(h); return h }
  const clearTimeout = h => { timers = timers.filter(x => x !== h) }
  const advance = async (ms) => {
    const until = t + ms
    for (;;) {
      const due = timers.filter(h => h.at <= until).sort((a, b) => a.at - b.at)[0]
      if (!due) break
      t = due.at
      timers = timers.filter(h => h !== due)
      await due.fn()
      await new Promise(r => setImmediate(r))
    }
    t = until
  }
  return { now: () => t, timers: { setTimeout, clearTimeout }, advance }
}

test('followTrack: polls once a second and ends when the song is over (stopped, or Music moved on), never in its first seconds', async () => {
  const { followTrack, TRACK_POLL_MS, TRACK_MIN_MS } = await import('../lib/music.js')
  assert.equal(TRACK_POLL_MS, 1000)
  const clock = fakeClock()
  let state = { playing: false, track: null } // Music has not started yet
  let polls = 0
  const done = followTrack({ name: 'Song', seconds: 75, nowPlaying: async () => { polls++; return state }, timers: clock.timers, now: clock.now })
  let result = null
  done.then(r => { result = r })
  await clock.advance(TRACK_MIN_MS - 500)
  assert.equal(result, null, 'not over in its first seconds, even if Music says stopped')
  state = { playing: true, track: 'Song' }
  await clock.advance(10_000)
  assert.equal(result, null, 'still playing')
  assert.ok(polls >= 10, 'about once a second')
  state = { playing: true, track: 'Another' }
  await clock.advance(1500)
  assert.deepEqual(result, { why: 'ended' }, 'Music moved on to the next track: the song is over')
  // stopped also ends it
  const c2 = fakeClock()
  let r2 = null
  followTrack({ name: 'Song', seconds: 75, nowPlaying: async () => ({ playing: false, track: null }), timers: c2.timers, now: c2.now }).then(r => { r2 = r })
  await c2.advance(TRACK_MIN_MS + 1500)
  assert.deepEqual(r2, { why: 'ended' })
})

test('followTrack: after `seconds` when Music cannot be read, or the song never started, with one plain line', async () => {
  const { followTrack } = await import('../lib/music.js')
  const clock = fakeClock()
  const lines = []
  let r = null
  followTrack({ name: 'Song', seconds: 75, nowPlaying: async () => null, log: l => lines.push(l), timers: clock.timers, now: clock.now }).then(x => { r = x })
  await clock.advance(74_000)
  assert.equal(r, null)
  assert.deepEqual(lines, ['[music] Music cannot be read while the song plays; the sheet comes back after 75 seconds'], 'said once, not once a second')
  await clock.advance(1500)
  assert.deepEqual(r, { why: 'timer' })
  const c2 = fakeClock()
  let polls = 0
  let r2 = null
  followTrack({ name: 'Song', seconds: 10, started: 'missing', nowPlaying: async () => { polls++; return null }, log: l => lines.push(l), timers: c2.timers, now: c2.now }).then(x => { r2 = x })
  await c2.advance(10_500)
  assert.deepEqual(r2, { why: 'timer' })
  assert.equal(polls, 0, 'nothing to follow')
  assert.equal(lines.at(-1), '[music] the song did not start; the sheet comes back after 10 seconds')
  for (const l of lines) assert.ok(!l.includes('Song'), 'the song is never named in the lines')
})
