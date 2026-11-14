// Jon's two Shortcuts for the blackout (12 Nov 2026: "I have added 2 new
// shortcuts to help with the black out. Blackout and afterblackout. Please use
// these if it helps make the blackout hit hard."), and since 14 Nov a third,
// for the scream on the HomePods. lib/blackoutShortcuts.js says when each
// runs; cues.mjs runs them. Nothing here runs a Shortcut, switches a light
// or makes a sound.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import {
  blackoutShortcutsOf, blackoutShortcutProblems, nameOnThisMac, blackoutShortcutCheck, blackoutShortcutTimes, stepBlackoutShortcuts,
  afterWaitMs, NO_PRESS, DEFAULT_SHORTCUT_LEAD_MS, DEFAULT_AFTER_LEAD_MS, MAX_SHORTCUT_LEAD_MS, MAX_AFTER_LEAD_MS, DARK_SETTLE_MS,
  DEFAULT_SOUND_LEAD_MS, SOUND_LATE_MS, SOUND_GUARD_MS, SOUND_GUARD_END_MS, SOUND_AFTER_STOP_MS, soundGuardUntil,
} from '../lib/blackoutShortcuts.js'
import { sceneProblems, planScenes, emptySceneState } from '../lib/scenes.js'
import { createStringsMirror, createShortcutRunner, RETRY_IN_PROGRESS_MS } from '../lib/strings.js'

const read = p => readFileSync(new URL(p, import.meta.url), 'utf8')
const SHEET = JSON.parse(read('../scenes.json'))
const CFG = { dark: { name: 'Blackout', leadMs: 1500 }, after: { name: 'AfterBlackOut', leadMs: 0 } }
// the blackout's marks as the server writes them: the dark two seconds after the press, the power five after that
const P = 1_000_000
const MARKS = { pressAt: P, darkAt: P + 2000, powerAt: P + 7000 }
// run a list of moments through the stepper; `marksAt(t)` says what the night carries at each
function play(times, { cfg = CFG, marksAt = () => MARKS, from = NO_PRESS } = {}) {
  let state = from
  const ran = []
  let nextAt = null
  for (const t of times) {
    const r = stepBlackoutShortcuts(state, { marks: marksAt(t), now: t, cfg })
    state = r.state
    nextAt = r.nextAt
    for (const x of r.run) ran.push([t - P, x.which, x.name])
  }
  return { ran, state, nextAt }
}

test('the sheet names Jon\'s two Shortcuts, with a lead for each, and reads clean', () => {
  assert.deepEqual(blackoutShortcutsOf(SHEET), { dark: { name: 'Blackout', leadMs: 1500 }, after: { name: 'AfterBlackOut', leadMs: 0 }, sound: { name: 'Scream', leadMs: 1000 } })
  assert.equal(SHEET.blackout.leadMs, 2000, 'the server\'s own lead is as it was: nothing to publish')
  assert.deepEqual(sceneProblems(SHEET), [])
  // defaults, and a sheet that names none
  assert.deepEqual(blackoutShortcutsOf({ blackout: { shortcut: ' Blackout ' } }), { dark: { name: 'Blackout', leadMs: DEFAULT_SHORTCUT_LEAD_MS }, after: null, sound: null })
  assert.deepEqual(blackoutShortcutsOf({ blackout: { afterShortcut: 'AfterBlackOut' } }), { dark: null, after: { name: 'AfterBlackOut', leadMs: DEFAULT_AFTER_LEAD_MS }, sound: null })
  assert.deepEqual(blackoutShortcutsOf({ blackout: { leadMs: 2000 } }), { dark: null, after: null, sound: null })
  assert.deepEqual(blackoutShortcutsOf(null), { dark: null, after: null, sound: null })
  assert.deepEqual(blackoutShortcutsOf({ blackout: { shortcut: '', afterShortcut: null } }), { dark: null, after: null, sound: null })
  // a lead is never negative and never more than ten seconds
  assert.equal(blackoutShortcutsOf({ blackout: { shortcut: 'B', shortcutLeadMs: 60_000 } }).dark.leadMs, MAX_SHORTCUT_LEAD_MS)
  assert.equal(blackoutShortcutsOf({ blackout: { shortcut: 'B', shortcutLeadMs: -5 } }).dark.leadMs, DEFAULT_SHORTCUT_LEAD_MS)
  assert.equal(blackoutShortcutsOf({ blackout: { shortcut: 'B', shortcutLeadMs: 0 } }).dark.leadMs, 0, 'nought is a lead: run it on the mark')
  assert.equal(blackoutShortcutsOf({ blackout: { shortcut: 'B', shortcutLeadMs: 'soon' } }).dark.leadMs, DEFAULT_SHORTCUT_LEAD_MS)
})

test('a broken blackout block is named, and stops nothing else on the sheet', () => {
  assert.deepEqual(blackoutShortcutProblems({}), [])
  assert.deepEqual(blackoutShortcutProblems({ blackout: { leadMs: 2000 } }), [])
  assert.deepEqual(blackoutShortcutProblems({ blackout: { shortcut: 'Blackout', shortcutLeadMs: 1200, afterShortcut: null, afterLeadMs: 0 } }), [])
  assert.deepEqual(blackoutShortcutProblems({ blackout: { shortcut: 7 } }), ['blackout.shortcut is not a Shortcut\'s name or null'])
  assert.deepEqual(blackoutShortcutProblems({ blackout: { afterShortcut: '  ' } }), ['blackout.afterShortcut is not a Shortcut\'s name or null'])
  assert.equal(blackoutShortcutProblems({ blackout: { shortcutLeadMs: -1 } }).length, 1)
  assert.equal(blackoutShortcutProblems({ blackout: { afterLeadMs: 'now' } }).length, 1)
  assert.equal(blackoutShortcutProblems({ blackout: { afterLeadMs: 99_999 } }).length, 1)
  assert.deepEqual(blackoutShortcutProblems({ blackout: [] }), ['blackout is not an object'])
  // never fatal (the check of 12 Nov 2026): the leads are tuned by hand on the night, and one mistyped number
  // must not switch off the music, the Hue scenes and the projector. The sheet's own check does not look at them...
  for (const slip of [{ shortcutLeadMs: 12_000 }, { shortcutLeadMs: -300 }, { shortcutLeadMs: '15O0' }, { afterShortcut: '' }, { shortcut: 5 }, { afterLeadMs: true }]) {
    const cfg = { ...SHEET, blackout: { ...SHEET.blackout, ...slip } }
    assert.deepEqual(sceneProblems(cfg), [], `the sheet stays on with ${JSON.stringify(slip)}`)
    assert.equal(blackoutShortcutProblems(cfg).length, 1, 'and the slip is named')
  }
  // ...the brain says the slip when it starts and uses the usual value
  assert.equal(blackoutShortcutsOf({ blackout: { shortcut: 'Blackout', shortcutLeadMs: '15O0' } }).dark.leadMs, DEFAULT_SHORTCUT_LEAD_MS)
  assert.equal(blackoutShortcutsOf({ blackout: { shortcut: 'Blackout', shortcutLeadMs: 12_000 } }).dark.leadMs, MAX_SHORTCUT_LEAD_MS)
  assert.equal(blackoutShortcutsOf({ blackout: { shortcut: 5, afterShortcut: 'AfterBlackOut' } }).dark, null)
  const src = read('../cues.mjs')
  // a bad number: the usual one is used; a bad name: that Shortcut is left out; each said once at the start
  assert.ok(src.includes("for (const line of blackoutShortcutProblems(sheet)) log(`cues/scenes.json: ${line}; ${/LeadMs/.test(line) ? 'the usual value is used instead' : 'that Shortcut is not run'}`)"))
  assert.ok(!read('../lib/scenes.js').includes('out.push(...blackoutShortcutProblems'), 'not part of the check that can switch the sheet off')
})

test('a name is found as this Mac spells it: Jon wrote "afterblackout", the Shortcut is "AfterBlackOut"', () => {
  const have = ['Blackout', 'AfterBlackOut', 'Default Jazz', 'Red Murderwin Strings']
  assert.equal(nameOnThisMac('Blackout', have), 'Blackout')
  assert.equal(nameOnThisMac('afterblackout', have), 'AfterBlackOut')
  assert.equal(nameOnThisMac('After Black Out', have), 'AfterBlackOut')
  assert.equal(nameOnThisMac('  blackout ', have), 'Blackout')
  assert.equal(nameOnThisMac('PANIC', have), null)
  assert.equal(nameOnThisMac('', have), null)
  assert.equal(nameOnThisMac('Blackout', []), null)
  // the very name wins over a look-alike
  assert.equal(nameOnThisMac('blackout', ['BLACKOUT', 'blackout']), 'blackout')
})

test('the two against this Mac\'s list: what will run, and what the brain says when it starts', () => {
  const sheet = blackoutShortcutsOf({ blackout: { shortcut: 'Blackout', shortcutLeadMs: 1500, afterShortcut: 'afterblackout', afterLeadMs: 0 } })
  const both = blackoutShortcutCheck(sheet, ['Blackout', 'AfterBlackOut', 'Default Jazz'])
  assert.deepEqual(both.dark, { name: 'Blackout', leadMs: 1500 })
  assert.deepEqual(both.after, { name: 'AfterBlackOut', leadMs: 0 }, 'run under the name this Mac has')
  assert.deepEqual(both.lines, [
    '[blackout] the sheet says "afterblackout"; on this Mac the Shortcut is called "AfterBlackOut", and that is the one the brain runs',
    '[blackout] the house lights: "Blackout" 1500 ms before the dark, then "AfterBlackOut" as the power returns',
  ])
  // one that is not on this Mac is left out, and said
  const one = blackoutShortcutCheck(sheet, ['Blackout', 'Default Jazz'])
  assert.deepEqual(one.dark, { name: 'Blackout', leadMs: 1500 })
  assert.equal(one.after, null)
  assert.ok(one.lines.includes('[blackout] no Shortcut called "afterblackout" on this Mac, so only the lights on the Hue bridge come back after it'))
  const none = blackoutShortcutCheck(sheet, ['Default Jazz'])
  assert.equal(none.dark, null); assert.equal(none.after, null)
  assert.equal(none.lines.length, 2)
  assert.ok(none.lines[0].includes('so only the lights on the Hue bridge go dark in the blackout'))
  // the list could not be read: the sheet's names are tried as they are, and nothing is said
  assert.deepEqual(blackoutShortcutCheck(sheet, null), { dark: sheet.dark, after: sheet.after, sound: null, lines: [] })
  // none named: nothing to say
  assert.deepEqual(blackoutShortcutCheck({ dark: null, after: null }, ['Blackout']), { dark: null, after: null, sound: null, lines: [] })
  // a lead for the after one is said too
  assert.ok(blackoutShortcutCheck({ dark: null, after: { name: 'AfterBlackOut', leadMs: 800 } }, ['AfterBlackOut']).lines[0].includes('"AfterBlackOut" 800 ms before the power returns'))
})

test('the timeline: Blackout a second and a half before the dark, AfterBlackOut as the power returns, each once', () => {
  assert.deepEqual(blackoutShortcutTimes(MARKS, CFG), { darkAt: P + 500, afterAt: P + 7000, soundAt: null })
  assert.deepEqual(blackoutShortcutTimes(null, CFG), { darkAt: null, afterAt: null, soundAt: null })
  // the press arrives; the brain steps at each timer and at every change of the night in between
  const first = stepBlackoutShortcuts(NO_PRESS, { marks: MARKS, now: P + 120, cfg: CFG })
  assert.deepEqual(first.run, [], 'nothing at the press: the music\'s stop is its own Shortcut')
  assert.equal(first.nextAt, P + 500)
  const night = play([P + 120, P + 505, P + 600, P + 2005, P + 4000, P + 7005, P + 7300])
  assert.deepEqual(night.ran, [[505, 'dark', 'Blackout'], [7005, 'after', 'AfterBlackOut']])
  assert.equal(night.nextAt, null)
  // the power's return takes the marks off the night: nothing more, and the brain is ready for the next press
  const done = stepBlackoutShortcuts(night.state, { marks: null, now: P + 7400, cfg: CFG })
  assert.deepEqual(done.run, [])
  assert.deepEqual(done.state, NO_PRESS)
  // the next press (a second Blackout test) runs both again
  const again = { pressAt: P + 60_000, darkAt: P + 62_000, powerAt: P + 67_000 }
  const second = play([P + 60_100, P + 60_505, P + 67_005], { marksAt: () => again, from: done.state })
  assert.deepEqual(second.ran.map(r => r[1]), ['dark', 'after'])
})

test('the blackout ends sooner than its marks said: the house comes back at once, and only if it went dark', () => {
  // Power returns by hand, three seconds into the dark: the marks come off, and AfterBlackOut runs then
  const byHand = play([P + 100, P + 505, P + 2005, P + 5000, P + 5100], { marksAt: t => (t >= P + 5000 ? null : MARKS) })
  assert.deepEqual(byHand.ran, [[505, 'dark', 'Blackout'], [5000, 'after', 'AfterBlackOut']])
  assert.deepEqual(byHand.state, NO_PRESS)
  // a pause in the lead before the lights' Shortcut was started: the press is called off, and nothing runs at all
  const early = play([P + 100, P + 300, P + 400, P + 9000], { marksAt: t => (t >= P + 300 ? null : MARKS) })
  assert.deepEqual(early.ran, [])
  // a pause in the lead after it was started: the lights are going out for a dark that will not come, so they come straight back
  const late = play([P + 100, P + 505, P + 900, P + 1000], { marksAt: t => (t >= P + 900 ? null : MARKS) })
  assert.deepEqual(late.ran, [[505, 'dark', 'Blackout'], [900, 'after', 'AfterBlackOut']])
  // the night itself goes away in the dark (ended by hand): the house still comes back
  const gone = play([P + 505, P + 3000], { marksAt: t => (t >= P + 3000 ? null : MARKS) })
  assert.deepEqual(gone.ran.map(r => r[1]), ['dark', 'after'])
})

test('a brain that starts late, or a press it only hears of late', () => {
  // first heard of in the dark: the lights go out at once, and come back on the power's mark
  const inDark = play([P + 3000, P + 7005])
  assert.deepEqual(inDark.ran, [[3000, 'dark', 'Blackout'], [7005, 'after', 'AfterBlackOut']])
  // first heard of after the lights' moment but before the dark: at once
  assert.deepEqual(play([P + 900]).ran, [[900, 'dark', 'Blackout']])
  // first heard of when the power is already back: none of it is the brain's to do
  assert.deepEqual(play([P + 7200, P + 9000]).ran, [])
  // first heard of in the very moment the power returns: no dark to make, so nothing to bring back
  assert.deepEqual(play([P + 7000]).ran, [])
})

test('one of the two alone, and leads of every size', () => {
  // only the after one named: it runs for itself as the power returns
  assert.deepEqual(play([P + 100, P + 2005, P + 7005], { cfg: { dark: null, after: CFG.after } }).ran, [[7005, 'after', 'AfterBlackOut']])
  // only the dark one named: it runs, and the end of the blackout runs nothing
  const onlyDark = play([P + 505, P + 7005, P + 7300], { cfg: { dark: CFG.dark, after: null }, marksAt: t => (t >= P + 7300 ? null : MARKS) })
  assert.deepEqual(onlyDark.ran, [[505, 'dark', 'Blackout']])
  // neither: never anything
  assert.deepEqual(play([P + 505, P + 7005], { cfg: { dark: null, after: null } }).ran, [])
  // a lead longer than the blackout's own: at the press, never before it
  assert.deepEqual(blackoutShortcutTimes(MARKS, { dark: { name: 'B', leadMs: 9000 }, after: null }), { darkAt: P, afterAt: null, soundAt: null })
  assert.deepEqual(play([P + 50], { cfg: { dark: { name: 'Blackout', leadMs: 9000 }, after: CFG.after } }).ran, [[50, 'dark', 'Blackout']])
  // no lead at all: on the dark mark
  assert.deepEqual(play([P + 1000, P + 2005], { cfg: { dark: { name: 'Blackout', leadMs: 0 }, after: null } }).ran, [[2005, 'dark', 'Blackout']])
  // the after one started early so it lands on the power's mark
  assert.deepEqual(play([P + 505, P + 5505], { cfg: { dark: CFG.dark, after: { name: 'AfterBlackOut', leadMs: 1500 } } }).ran, [[505, 'dark', 'Blackout'], [5505, 'after', 'AfterBlackOut']])
  // stepping many times a second (the strings' own clock, every change of the night) never runs one twice
  const busy = play(Array.from({ length: 90 }, (_, i) => P + i * 100))
  assert.deepEqual(busy.ran.map(r => r[1]), ['dark', 'after'])
})

// The check of 12 Nov 2026: a pause in the lead just after the lights' Shortcut went out sent the after one a
// fraction of a second behind it. Two Home scenes started together race light by light, so "off" could be the
// last word on some lights, for a blackout that was called off.
test('the house is brought back only once the lights\' Shortcut has had time to land', () => {
  assert.equal(DARK_SETTLE_MS, 2500)
  // the ordinary blackout: six and a half seconds lie between the two, so there is nothing to wait for
  assert.equal(afterWaitMs(P + 505, P + 7005), 0)
  // called off 0.3 s after the lights' Shortcut went out: wait the rest of the two and a half seconds
  assert.equal(afterWaitMs(P + 505, P + 805), 2200)
  // Power returns by hand just as it went out
  assert.equal(afterWaitMs(P + 505, P + 505), DARK_SETTLE_MS)
  // long after, or the dark one never went out for this press: at once
  assert.equal(afterWaitMs(P + 505, P + 60_000), 0)
  assert.equal(afterWaitMs(null, P), 0)
  assert.equal(afterWaitMs(undefined, P), 0)
  // a clock that jumped back never makes it wait longer than the settle
  assert.equal(afterWaitMs(P + 5000, P), DARK_SETTLE_MS)
  // the brain's program: the dark one's moment is kept, the after one waits on a timer, and a new press takes a waiting one off
  const src = read('../cues.mjs')
  assert.ok(src.includes('const wait = afterWaitMs(darkSentAt, now)'))
  assert.ok(src.includes('if (wait > 0) afterTimer = setTimeout(() => { afterTimer = null; runBlackoutShortcut(which, name) }, wait)'))
  assert.ok(src.includes("clearTimeout(afterTimer); afterTimer = null // a new press: its own after one will bring the house back"))
})

test('the after Shortcut can never bring the house back before it has gone dark', () => {
  // a lead longer than the dark is cut to four seconds, and the moment itself is never before the dark mark
  assert.equal(MAX_AFTER_LEAD_MS, 4000)
  assert.equal(blackoutShortcutsOf({ blackout: { afterShortcut: 'AfterBlackOut', afterLeadMs: 6000 } }).after.leadMs, MAX_AFTER_LEAD_MS)
  assert.equal(blackoutShortcutsOf({ blackout: { afterShortcut: 'AfterBlackOut', afterLeadMs: 1500 } }).after.leadMs, 1500)
  assert.deepEqual(blackoutShortcutTimes(MARKS, { dark: CFG.dark, after: { name: 'AfterBlackOut', leadMs: 9000 } }), { darkAt: P + 500, afterAt: P + 2000, soundAt: null })
  // even so configured by hand, the order holds: off first, back no sooner than the dark mark
  const odd = play([P + 100, P + 505, P + 1005, P + 2005, P + 7005], { cfg: { dark: CFG.dark, after: { name: 'AfterBlackOut', leadMs: 9000 } } })
  assert.deepEqual(odd.ran, [[505, 'dark', 'Blackout'], [2005, 'after', 'AfterBlackOut']])
  // and with the lights' Shortcut on the mark itself, both still run, in order
  const tight = play([P + 100, P + 2005, P + 2010, P + 7005], { cfg: { dark: { name: 'Blackout', leadMs: 0 }, after: { name: 'AfterBlackOut', leadMs: 4000 } } })
  assert.deepEqual(tight.ran.map(r => r[1]), ['dark', 'after'])
})

test('the strings are sent their colour again once the house is back: Jon\'s scene has them in it, at full', async () => {
  const sent = []
  const lights = { show: async setting => { sent.push(setting) } }
  const colours = { decor: { hue: 32, sat: 70, brightness: 35 }, off: { off: true } }
  const m = createStringsMirror({ lights, colours })
  m.update('decor')
  await new Promise(r => setImmediate(r))
  m.update('decor')
  await new Promise(r => setImmediate(r))
  assert.equal(sent.length, 1, 'the same colour is not sent twice')
  m.forget()
  assert.equal(m.shown(), null)
  m.update('decor')
  await new Promise(r => setImmediate(r))
  assert.equal(sent.length, 2, 'after forget it is sent again')
  assert.deepEqual(sent[1], colours.decor)
})

// The check of 12 Nov 2026: a Home scene with an accessory that does not answer runs on for a minute, and a second
// run of the same scene is refused until it ends. The runner tries a refused run again every second and a half; for
// the blackout's lights a try that lands late, as the power returns, is worse than none.
test('the lights\' Shortcut is not tried again once its moment has passed; any other run is tried as before', async () => {
  let clock = 10_000
  const tries = []
  const run = async name => { tries.push([name, clock]); throw new Error('Action set execution in progress.') }
  // the head start is real time on the Mac and a refusal comes back at once, well inside it: here the head start
  // never ends, and the wait between tries moves the test's clock on
  const HEAD = 750
  const wait = ms => (ms === HEAD ? new Promise(() => {}) : new Promise(resolve => { clock += ms; resolve() }))
  const runner = createShortcutRunner({ tag: 'blackout', run, wait, headStartMs: HEAD, now: () => clock })
  // the dark mark is 1500 ms away, and a second of grace after it: tries at 0 and at 1500, not at 3000
  await assert.rejects(runner.fire('Blackout', { retryUntil: 10_000 + 1500 + 1000 }), /its moment has passed/)
  assert.deepEqual(tries.map(t => t[1] - 10_000), [0, RETRY_IN_PROGRESS_MS])
  // with no deadline the same refusal is tried for thirty seconds, as it always was (the music, the strings)
  tries.length = 0
  await assert.rejects(runner.fire('AfterBlackOut'), /still busy with the last action after 30 s/)
  assert.equal(tries.length, 21)
  // a deadline already behind us: one try, no second
  tries.length = 0
  await assert.rejects(runner.fire('Blackout', { retryUntil: clock - 1 }), /its moment has passed/)
  assert.equal(tries.length, 1)
  // a run that is taken at once is untouched by a deadline
  const fine = createShortcutRunner({ tag: 'blackout', run: async () => {}, wait, headStartMs: HEAD, now: () => clock })
  const r = await fine.fire('Blackout', { retryUntil: clock + 5 })
  assert.ok(r.done && !r.dropped)
  // a refused run nobody wants any more (the blackout was called off meanwhile) is dropped, quietly, not tried again
  tries.length = 0
  let wanted = true
  const waitThenCancel = ms => (ms === HEAD ? new Promise(() => {}) : new Promise(resolve => { clock += ms; wanted = false; resolve() }))
  const called = createShortcutRunner({ tag: 'blackout', run, wait: waitThenCancel, headStartMs: HEAD, now: () => clock })
  const off = await called.fire('Blackout', { retryUntil: clock + 60_000, stillWanted: () => wanted })
  assert.equal(off.dropped, true)
  assert.equal(tries.length, 1, 'one try, then the call-off: no second')
  // and one that was never wanted is not even waited for
  tries.length = 0
  const never = await called.fire('Blackout', { stillWanted: () => false })
  assert.equal(never.dropped, true)
  assert.equal(tries.length, 1)
})

test('a forget that comes while a colour is being sent is not lost', async () => {
  const sent = []
  let release = null
  const lights = { show: setting => new Promise(resolve => { sent.push(setting); release = resolve }) }
  const colours = { decor: { hue: 32 }, off: { off: true } }
  const m = createStringsMirror({ lights, colours })
  m.update('decor')            // the first send is in flight (the Shortcut is still running)
  await new Promise(r => setImmediate(r))
  assert.equal(sent.length, 1)
  m.forget()                   // Jon's scene has just changed the strings behind its back
  release()                    // ...and the first send now finishes
  await new Promise(r => setImmediate(r))
  assert.equal(sent.length, 2, 'the colour is sent again: the first send no longer says what the strings show')
  release()
  await new Promise(r => setImmediate(r))
  assert.equal(m.shown(), 'decor')
  assert.equal(sent.length, 2, 'and then it rests')
})

test('the brain\'s program runs them on the marks, through one runner, and never in fake mode', () => {
  const src = read('../cues.mjs')
  assert.ok(src.includes("import { blackoutShortcutsOf, blackoutShortcutCheck, blackoutShortcutProblems, blackoutShortcutTimes, stepBlackoutShortcuts, afterWaitMs, soundGuardUntil, NO_PRESS, SOUND_AFTER_STOP_MS, SOUND_LATE_MS } from './lib/blackoutShortcuts.js'"))
  // woken at the two Shortcuts' own moments as well as at the marks
  assert.ok(src.includes('const due = blackoutShortcutTimes(m, blackoutCfg)'))
  assert.ok(src.includes('for (const at of [m.darkAt, m.powerAt, due.darkAt, due.afterAt, due.soundAt]) if (at && at > now) marksTimers.push(setTimeout(apply, at - now + 5))'))
  // stepped on every plan: each change of the night, each timer
  const apply = src.slice(src.indexOf('function apply() {'), src.indexOf('function playSound(a)'))
  assert.ok(apply.includes('stepBlackout(now)'))
  assert.ok(src.includes('const r = stepBlackoutShortcuts(blackoutState, { marks, now, cfg: blackoutCfg })'))
  // only in Act 1, where the blackout is: a test later in a practice night leaves the two scenes out (the Study's walls, the strings under a game)
  // ...and never for a paused night: a pause with the marks still on is a blackout being called off
  assert.ok(src.includes("const marks = Number(docs.night?.act ?? 0) <= 1 && docs.night?.phase !== 'paused' ? blackoutMarkTimes(docs.night) : null"))
  // one runner for the lights' two: the after one replaces a dark one still waiting on Apple Home
  // (and since 14 Nov 2026 a second runner, for the scream alone, so that it can never replace the dark one)
  assert.ok(src.includes("const blackoutRunner = createShortcutRunner({ tag: 'blackout', log })"))
  assert.equal(src.split("createShortcutRunner({ tag: 'blackout', log })").length - 1, 2)
  assert.ok(src.includes("    const runner = which === 'sound' ? screamRunner : blackoutRunner\n    log(`[blackout] ${name}`)\n    runner.fire(name, { retryUntil, stillWanted }).then("))
  // a run Apple Home never took is said, and the dark one is not tried again after its moment
  assert.ok(src.includes('r => { if (r?.dropped) log(`[blackout] Apple Home was still busy with the last run of ${name}, so it did not run this time`) },'))
  assert.ok(src.includes("runBlackoutShortcut(which, name, { retryUntil: marks ? marks.darkAt + DARK_RETRY_GRACE_MS : now + DARK_RETRY_GRACE_MS, stillWanted: () => darkLive === token })"))
  // once the house is to come back, a dark run still waiting on Apple Home is not tried again
  assert.ok(src.includes('darkLive = null // the house is to come back: a dark run still waiting on Apple Home is not tried again'))
  // fake mode only says what it would do
  assert.ok(src.includes('if (FAKE) log(`[blackout] would run the Shortcut "${name}"'))
  // the strings again, a few seconds after the house is back
  assert.ok(src.includes("if (which === 'after') setTimeout(() => { strings.forget(); mirrorStrings() }, STRINGS_AGAIN_MS)"))
  // checked against this Mac's list when the brain starts, with the rest; and an off switch
  assert.ok(src.includes('const b = blackoutShortcutCheck(blackoutSheet, have)'))
  // one of the lights' two that is not on this Mac is looked for again each minute, and counts in the check's own
  // answer. The scream's Shortcut is optional and is in neither (14 Nov 2026): a read of the list replaces what the
  // brain knows of the lights' two as well, so it is not read again for the scream's sake
  assert.ok(src.includes('const blackoutMissing = () => !!((blackoutSheet.dark && !blackoutCfg.dark) || (blackoutSheet.after && !blackoutCfg.after))'))
  assert.ok(!/blackoutMissing = [^\n]*sound/.test(src), 'never for the scream')
  assert.ok(src.includes('process.exit(r && !r.missing.length && !blackoutMissing() ? 0 : 1)'))
  // a sheet that names only the scream is still checked when the brain starts
  assert.ok(src.includes('if (shortcutNames.length || blackoutSheet.dark || blackoutSheet.after || blackoutSheet.sound) { await checkShortcuts(); heartbeat() }'))
  // the strings' dark is left to Jon's scene only when they have no way of their own to go off
  assert.ok(src.includes('stringsOffLeftToBlackout = !!blackoutCfg.dark && stringsByShortcuts && !stringsPaired && !have.includes(stringShortcutNames.off)'))
  assert.ok(src.includes('blackoutShortcutsOf(offSwitch(env.BLACKOUT_SHORTCUTS) ? null : sheet)'))
  // neither is the music's stop: that stays its own Shortcut on the sheet (AudioPanic, the one Jon made on 12 Nov 2026)
  assert.equal(SHEET.musicShortcuts.off, 'AudioPanic')
})

// 14 Nov 2026, Jon, after a test: the blackout "didn't ... play the scream through all the HomePods. Would it be
// better if I could build a short cut for it?" The brain cannot reach a HomePod itself; a Shortcut of his can.
test('the scream on the HomePods: a third Shortcut, a second before the dark, once, and only in its moment', () => {
  const cfg = { ...CFG, sound: { name: 'Scream', leadMs: 1000 } }
  assert.equal(DEFAULT_SOUND_LEAD_MS, 1000)
  assert.deepEqual(blackoutShortcutsOf({ blackout: { soundShortcut: ' Scream ' } }), { dark: null, after: null, sound: { name: 'Scream', leadMs: DEFAULT_SOUND_LEAD_MS } })
  assert.equal(blackoutShortcutsOf({ blackout: { soundShortcut: 'Scream', soundLeadMs: 400 } }).sound.leadMs, 400)
  assert.equal(blackoutShortcutsOf({ blackout: { soundShortcut: null, soundLeadMs: 400 } }).sound, null, 'not named: not run')
  assert.deepEqual(blackoutShortcutTimes(MARKS, cfg), { darkAt: P + 500, afterAt: P + 7000, soundAt: P + 1000 })
  // the whole blackout: the lights' Shortcut, then the scream's, then the house back
  const whole = play([P + 5, P + 505, P + 1005, P + 1500, P + 2005, P + 4000, P + 7005, P + 7500], { cfg })
  assert.deepEqual(whole.ran, [[505, 'dark', 'Blackout'], [1005, 'sound', 'Scream'], [7005, 'after', 'AfterBlackOut']], 'each once, in this order')
  // the brain is woken for it
  assert.equal(play([P + 505], { cfg }).nextAt, P + 1000)
  // the scream alone, with neither lights' Shortcut
  assert.deepEqual(play([P + 5, P + 1005, P + 7005], { cfg: { dark: null, after: null, sound: cfg.sound } }).ran, [[1005, 'sound', 'Scream']])
  // a lead longer than the press to the dark: at the press, never before it
  assert.equal(blackoutShortcutTimes(MARKS, { ...CFG, sound: { name: 'Scream', leadMs: 9000 } }).soundAt, P)
  // a brain that first sees the press late in the dark makes no scream: one as the power returns is worse than none
  assert.equal(SOUND_LATE_MS, 2000)
  assert.deepEqual(play([P + 2000 + SOUND_LATE_MS + 5, P + 7005], { cfg }).ran.filter(r => r[1] === 'sound'), [], 'too late: skipped')
  assert.deepEqual(play([P + 2000 + SOUND_LATE_MS - 5], { cfg }).ran.filter(r => r[1] === 'sound'), [[2000 + SOUND_LATE_MS - 5, 'sound', 'Scream']], 'still in its moment: run')
  // called off before the scream was due (a pause in the lead takes the marks away): no scream, then or later
  const off = play([P + 505, P + 800, P + 1005, P + 2005, P + 7005], { cfg, marksAt: t => (t < P + 700 ? MARKS : null) })
  assert.deepEqual(off.ran.filter(r => r[1] === 'sound'), [], 'stepped past the scream\'s own moment with the marks gone')
  assert.deepEqual(off.ran, [[505, 'dark', 'Blackout'], [800, 'after', 'AfterBlackOut']], 'the house is brought back, and that is all')
  // called off after the scream went out: it is not sent again (cues.mjs takes a waiting one off)
  assert.deepEqual(play([P + 1005, P + 1500, P + 2005], { cfg, marksAt: t => (t < P + 1200 ? MARKS : null) }).ran.filter(r => r[1] === 'sound'), [[1005, 'sound', 'Scream']])
  // a press seen only after its power's mark: nothing of it is the brain's to do
  assert.deepEqual(play([P + 7100], { cfg }).ran, [])
  // a new press is a new scream
  const M2 = { pressAt: P + 60_000, darkAt: P + 62_000, powerAt: P + 67_000 }
  const two = play([P + 1005, P + 7005, P + 61_005], { cfg, marksAt: t => (t < P + 60_000 ? MARKS : M2) })
  assert.deepEqual(two.ran.filter(r => r[1] === 'sound').map(r => r[0]), [1005, 61_005])
})

test('the scream\'s Shortcut against this Mac\'s list, the sheet\'s slips, and the stop that is held back', () => {
  const sheet = blackoutShortcutsOf({ blackout: { shortcut: 'Blackout', afterShortcut: 'AfterBlackOut', soundShortcut: 'scream', soundLeadMs: 1000 } })
  const all = blackoutShortcutCheck(sheet, ['Blackout', 'AfterBlackOut', 'Scream'])
  assert.deepEqual(all.sound, { name: 'Scream', leadMs: 1000 }, 'run under the name this Mac has')
  assert.ok(all.lines.includes('[blackout] the scream on the HomePods: "Scream" 1000 ms before the dark'))
  // not made yet: left out, said in one line, and the lights' two still run
  const notYet = blackoutShortcutCheck(sheet, ['Blackout', 'AfterBlackOut'])
  assert.equal(notYet.sound, null)
  assert.ok(notYet.dark && notYet.after)
  assert.ok(notYet.lines.includes('[blackout] no Shortcut called "scream" on this Mac, so the scream comes from the room screens and the phones only, as before'))
  // the list could not be read: tried as named
  assert.deepEqual(blackoutShortcutCheck(sheet, null).sound, sheet.sound)
  // slips in the sheet are said, never fatal
  assert.deepEqual(blackoutShortcutProblems({ blackout: { soundShortcut: 5, soundLeadMs: 'soon' } }), ["blackout.soundShortcut is not a Shortcut's name or null", `blackout.soundLeadMs is not a number of milliseconds from 0 to ${MAX_SHORTCUT_LEAD_MS}`])
  assert.deepEqual(blackoutShortcutProblems(SHEET), [])
  // How long the music's second stop is held back: five seconds from the scream's send, and never into the last
  // half second before the power's mark, so the stops at the power's return always go (the review of 14 Nov: a
  // scream sent on the dark itself, or late, used to hold them back too)
  assert.ok(SOUND_GUARD_MS >= 4000 && SOUND_GUARD_MS < 6000, 'longer than the scream and its start')
  assert.equal(soundGuardUntil(MARKS, P + 1005), P + 1005 + SOUND_GUARD_MS, 'the usual lead: over a second before the power')
  assert.equal(soundGuardUntil(MARKS, P + 2005), P + 7000 - SOUND_GUARD_END_MS, 'sent on the dark (a lead of 0): it ends before the power\'s mark')
  assert.equal(soundGuardUntil(MARKS, P + 2000 + SOUND_LATE_MS), P + 7000 - SOUND_GUARD_END_MS, 'sent as late as it may be: the same')
  assert.ok(soundGuardUntil(MARKS, P + 2000 + SOUND_LATE_MS) < MARKS.powerAt)
  assert.equal(soundGuardUntil(null, P), P + SOUND_GUARD_MS)
  assert.ok(SOUND_GUARD_END_MS >= 250 && SOUND_AFTER_STOP_MS >= 250 && SOUND_AFTER_STOP_MS <= 1000)
  // The brain's program
  const src = read('../cues.mjs')
  const step = src.slice(src.indexOf('function stepBlackout(now) {'), src.indexOf('function apply() {'))
  // once a press, by a token: one waiting on Apple Home is tried again only while its moment lasts and only while
  // this blackout still wants it
  assert.ok(step.includes("    if (which === 'sound') {"))
  assert.ok(step.includes('      const token = {}\n      soundLive = token\n      soundQuietUntil = soundGuardUntil(marks, now)\n      screamToSend = { name, token, retryUntil: (marks ? marks.darkAt : now) + SOUND_LATE_MS }\n      continue'))
  assert.ok(src.includes("    if (soundLive !== token) return\n    music?.supersede?.()\n    runBlackoutShortcut('sound', name, { retryUntil, stillWanted: () => soundLive === token })"))
  // called off, over, or past Act 1: a waiting scream is taken off and no stop is held back for it; the same when the house is to come back
  assert.ok(step.includes('  if (!marks) { soundLive = null; soundQuietUntil = null; screamToSend = null }'))
  assert.ok(step.includes('    soundLive = null // ...nor a scream, and the stops at the power\'s return are never held back\n    soundQuietUntil = null\n    screamToSend = null'))
  // a runner of its own: on the lights\' runner a newer run drops one still waiting on Apple Home, and the scream must never cost the house its dark
  assert.ok(src.includes("const screamRunner = createShortcutRunner({ tag: 'blackout', log })"))
  assert.ok(src.includes("const runner = which === 'sound' ? screamRunner : blackoutRunner"))
  // the stop sent a second time is held back while the scream plays...
  assert.ok(src.includes('const screamPlaying = (now) => soundQuietUntil !== null && now < soundQuietUntil'))
  assert.ok(src.includes("      else if (a.again && screamPlaying(now)) log('[music] the second stop is held back while the scream plays on the HomePods')"))
  assert.ok(src.includes("blackoutCfg = { dark: b.dark, after: b.after, sound: b.sound }"))
  // ...and only that one: a first stop, a host's stop and a play are never touched
  const music = src.slice(src.indexOf("    if (a.type === 'music' && music) {"), src.indexOf("    if (a.type === 'scene' && scenesOn)"))
  assert.ok(music.includes("if (a.do === 'play') music.play(a)") && music.includes('else { stopAskedAt = now; music.pause() }'))
  // the scream goes out last in a plan, and never sooner than half a second after the brain's last stop: both act
  // on the same four HomePods (AudioPanic pauses them), and the scream must be the newer word
  const apply = src.slice(src.indexOf('function apply() {'), src.indexOf('function playSound(a)'))
  assert.ok(apply.indexOf('else { stopAskedAt = now; music.pause() }') < apply.indexOf('if (screamToSend) sendScream(now)'), 'after the music\'s own actions')
  assert.ok(apply.indexOf('stepBlackout(now)') < apply.indexOf('const scene = planScenes('), 'and the step first, so a stop planned in the same moment is already held back')
  assert.ok(src.includes('  const wait = stopAskedAt === null ? 0 : SOUND_AFTER_STOP_MS - (now - stopAskedAt)\n  if (wait > 0) setTimeout(go, wait)\n  else go()'))
})

test('the scream never drops the lights: two runners, so a scream fired while the dark waits on Apple Home leaves it waiting', async () => {
  // Apple Home is busy for the first try of anything; the dark is fired, then the scream half a second later
  const calls = []
  const busyOnce = new Set()
  const run = async (name) => { calls.push(name); if (!busyOnce.has(name)) { busyOnce.add(name); throw new Error(`shortcut ${name}: Action set execution in progress`) } }
  const waits = []
  const wait = () => new Promise(r => { waits.push(r) })
  const micro = async () => { for (let i = 0; i < 16; i++) await Promise.resolve() }
  const release = async () => { const w = waits.splice(0); for (const r of w) r(); await micro() }
  // on ONE runner the newer run drops the older one that is still waiting: this is why the scream has its own
  const one = createShortcutRunner({ tag: 'blackout', run, wait, headStartMs: 5 })
  const darkOnOne = one.fire('Blackout')
  await micro()                       // Apple Home is busy: the dark waits to try again
  const screamOnOne = one.fire('Scream')
  await micro()
  await release(); await release()
  assert.equal((await darkOnOne).dropped, true, 'on one runner the lights would have stayed on')
  assert.ok(!(await screamOnOne).dropped)
  // with two runners both land
  calls.length = 0; busyOnce.clear()
  const lights = createShortcutRunner({ tag: 'blackout', run, wait, headStartMs: 5 })
  const scream = createShortcutRunner({ tag: 'blackout', run, wait, headStartMs: 5 })
  const dark = lights.fire('Blackout')
  await micro()
  const shout = scream.fire('Scream')
  await micro()
  await release(); await release()
  const [d, s2] = await Promise.all([dark, shout])
  assert.ok(!d.dropped && !s2.dropped, 'neither is dropped')
  assert.deepEqual(calls.filter(n => n === 'Blackout').length, 2, 'the lights\' Shortcut was tried again and ran')
  assert.deepEqual(calls.filter(n => n === 'Scream').length, 2)
})


// ---- the brain's own blackout code, run for real (14 Nov 2026) -------------------------------------------------
// cues.mjs is a program, not a library, so the tests above only read its lines. That was not enough: a line that
// began with a bracket was read by JavaScript as a call on the line before it (`log(...)` then `(a ? b : c).fire(`),
// which no line-reading test could see, and which would have thrown at the party's one blackout. So the block
// from the runners to apply() is cut out of the source and run here, with stand-ins for Apple Home and the clock.
function brainBlackout({ fake = false, cfg = { ...CFG, sound: { name: 'Scream', leadMs: 1000 } }, answers = () => null } = {}) {
  const src = read('../cues.mjs')
  const from = src.indexOf("const blackoutRunner = createShortcutRunner({ tag: 'blackout', log })")
  const to = src.indexOf('function apply() {')
  assert.ok(from > 0 && to > from, 'the blackout block is where the test expects it')
  const fired = []   // [runner number, Shortcut name, options]
  const logs = []
  const timers = []  // { fn, ms, on }
  const music = { superseded: 0, supersede() { music.superseded++ } }
  let runners = 0
  const deps = {
    // answers(name): what Apple Home says to that run: nothing (it ran), { dropped: true }, or an Error to reject with
    createShortcutRunner: () => { const id = ++runners; return { fire: (name, opts) => { fired.push([id, name, opts]); const a = answers(name); return a instanceof Error ? Promise.reject(a) : Promise.resolve({ done: Promise.resolve(), ...(a ?? {}) }) } } },
    music,
    log: (...a) => { logs.push(a.join(' ')) },
    NO_PRESS, SOUND_AFTER_STOP_MS, SOUND_LATE_MS, soundGuardUntil, afterWaitMs, stepBlackoutShortcuts,
    FAKE: fake,
    strings: { forget() {} },
    mirrorStrings() {},
    // the night's marks as plain numbers, the way lib/cues.js blackoutMarkTimes hands them on
    blackoutMarkTimes: night => (night?.blackout ? { ...night.blackout } : null),
    setTimeout: (fn, ms) => { const t = { fn, ms, on: true }; timers.push(t); return t },
    clearTimeout: t => { if (t) t.on = false },
  }
  const make = new Function(...Object.keys(deps), 'blackoutCfgIn', `
    let docs = {}
    let blackoutCfg = blackoutCfgIn
    ${src.slice(from, to)}
    return {
      stepBlackout, sendScream, screamPlaying, runBlackoutShortcut,
      night: n => { docs = { night: n } },
      toSend: () => screamToSend,
      stopAsked: t => { stopAskedAt = t },
    }
  `)
  const b = make(...Object.values(deps), cfg)
  // one plan of the brain, as apply() does it: the step, then the music's stop if one is planned, then the scream
  const plan = (now, { stop = false, again = false } = {}) => {
    b.stepBlackout(now)
    let held = false
    if (stop) { if (again && b.screamPlaying(now)) held = true; else b.stopAsked(now) }
    if (b.toSend()) b.sendScream(now)
    return { held }
  }
  const runTimers = () => { for (const t of timers.splice(0)) if (t.on) t.fn() }
  return { b, plan, fired, logs, timers, runTimers, music, names: () => fired.map(f => f[1]) }
}
const NIGHT = { act: 1, phase: 'act', blackout: MARKS }

test('the brain\'s own code, run: each Shortcut goes to its runner, and nothing throws', () => {
  const x = brainBlackout()
  x.b.runBlackoutShortcut('dark', 'Blackout')
  x.b.runBlackoutShortcut('sound', 'Scream')
  x.b.runBlackoutShortcut('after', 'AfterBlackOut')
  assert.deepEqual(x.fired.map(f => [f[0], f[1]]), [[1, 'Blackout'], [2, 'Scream'], [1, 'AfterBlackOut']], 'the lights\' two on one runner, the scream on its own')
  assert.deepEqual(x.logs, ['[blackout] Blackout', '[blackout] Scream', '[blackout] AfterBlackOut'])
  // fake mode says what it would do, and runs nothing
  const f = brainBlackout({ fake: true })
  f.b.runBlackoutShortcut('sound', 'Scream')
  assert.deepEqual(f.fired, [])
  assert.deepEqual(f.logs, ['[blackout] would run the Shortcut "Scream" (the scream on the HomePods)'])
})

test('the brain\'s own code, run: what Apple Home answers is said in one line, and never thrown', async () => {
  // a run that gave way, and a run that failed: each is one line in the window (both handlers really run here)
  const x = brainBlackout({ answers: name => (name === 'Scream' ? { dropped: true } : name === 'Blackout' ? new Error('shortcut Blackout: no such Shortcut') : null) })
  x.b.runBlackoutShortcut('sound', 'Scream')
  x.b.runBlackoutShortcut('dark', 'Blackout')
  x.b.runBlackoutShortcut('after', 'AfterBlackOut')
  for (let i = 0; i < 8; i++) await Promise.resolve()
  assert.deepEqual(x.logs, [
    '[blackout] Scream', '[blackout] Blackout', '[blackout] AfterBlackOut',
    '[blackout] Apple Home was still busy with the last run of Scream, so it did not run this time',
    '[blackout] the Blackout Shortcut did not run: shortcut Blackout: no such Shortcut',
  ])
})

test('the brain\'s own code, run: a whole blackout, the stop at the dark held back, the stops at the power\'s return sent', () => {
  const x = brainBlackout()
  x.b.night(NIGHT)
  assert.equal(x.plan(P + 5, { stop: true }).held, false, 'the stop at the press is never held')
  x.plan(P + 505)
  assert.deepEqual(x.names(), ['Blackout'])
  assert.equal(x.music.superseded, 0)
  x.plan(P + 1005)
  assert.deepEqual(x.names(), ['Blackout', 'Scream'], 'a second after the stop: sent at once')
  assert.equal(x.music.superseded, 1, 'and from its send a stop still waiting to be tried again is dropped: the scream is the newest word')
  assert.equal(x.timers.filter(t => t.on).length, 0)
  const scream = x.fired[1]
  assert.equal(scream[0], 2, 'on its own runner')
  assert.equal(scream[2].retryUntil, P + 2000 + SOUND_LATE_MS)
  assert.equal(scream[2].stillWanted(), true)
  assert.equal(x.plan(P + 2005, { stop: true, again: true }).held, true, 'the second stop, at the dark: held back')
  assert.equal(x.plan(P + 4000, { stop: true }).held, false, 'a first stop or a host\'s stop is never held')
  // the power's return: the house back, and its stops go (the scream's guard is taken off with it)
  assert.equal(x.plan(P + 7005, { stop: true, again: true }).held, false)
  assert.deepEqual(x.names(), ['Blackout', 'Scream', 'AfterBlackOut'])
  assert.equal(scream[2].stillWanted(), false, 'a scream still waiting on Apple Home is not tried again once the house is to come back')
})

test('the brain\'s own code, run: the scream is never sent sooner than half a second after the music\'s stop', () => {
  // the press is seen late, when the lights' Shortcut and the scream are both due: the stop goes out in the same
  // plan, and the scream waits behind it
  const x = brainBlackout()
  x.b.night(NIGHT)
  x.plan(P + 1200, { stop: true })
  assert.deepEqual(x.names(), ['Blackout'], 'the scream is not sent in the same moment as the stop')
  assert.equal(x.timers.filter(t => t.on).length, 1)
  assert.equal(x.timers[0].ms, SOUND_AFTER_STOP_MS)
  x.runTimers()
  assert.deepEqual(x.names(), ['Blackout', 'Scream'])
  // a stop asked 200 ms before the scream is due: the scream waits the other 300
  const y = brainBlackout()
  y.b.night(NIGHT)
  y.plan(P + 805, { stop: true })
  y.plan(P + 1005)
  assert.equal(y.timers.filter(t => t.on).at(-1).ms, SOUND_AFTER_STOP_MS - 200)
  // a lead as long as the press to the dark (tuned "sooner" too far): still behind the stop
  const z = brainBlackout({ cfg: { ...CFG, sound: { name: 'Scream', leadMs: 2000 } } })
  z.b.night(NIGHT)
  z.plan(P + 5, { stop: true })
  assert.deepEqual(z.names(), [], 'not in the same moment as the stop at the press')
  z.runTimers()
  assert.deepEqual(z.names(), ['Scream'])
})

test('the brain\'s own code, run: a blackout called off takes the scream with it', () => {
  // called off (a Pause in the lead) while the scream waits behind the stop: it is not sent
  const x = brainBlackout()
  x.b.night(NIGHT)
  x.plan(P + 1200, { stop: true })
  x.b.night({ ...NIGHT, phase: 'paused' })
  x.plan(P + 1400)
  x.runTimers()
  assert.ok(!x.names().includes('Scream'), 'never sent')
  assert.equal(x.music.superseded, 0, 'and no stop is dropped for a scream that never went out')
  assert.equal(x.b.screamPlaying(P + 1500), false, 'and no stop is held back for it')
  // called off after it went out: one still waiting on Apple Home is not tried again
  const y = brainBlackout()
  y.b.night(NIGHT)
  y.plan(P + 5, { stop: true })
  y.plan(P + 1005)
  const scream = y.fired.find(f => f[1] === 'Scream')
  assert.equal(scream[2].stillWanted(), true)
  y.b.night({ act: 1, phase: 'act' }) // the marks are off the night
  y.plan(P + 1500)
  assert.equal(scream[2].stillWanted(), false)
  assert.equal(y.b.screamPlaying(P + 1600), false)
  // a scream sent on the dark itself (a lead of 0) or late: the stops at the power's return still go
  const z = brainBlackout({ cfg: { ...CFG, sound: { name: 'Scream', leadMs: 0 } } })
  z.b.night(NIGHT)
  z.plan(P + 5, { stop: true })
  assert.equal(z.plan(P + 2005, { stop: true, again: true }).held, true, 'sent and held in the same plan')
  assert.equal(z.b.screamPlaying(P + 6400), true)
  assert.equal(z.b.screamPlaying(P + 6500), false, 'half a second before the power\'s mark at the latest')
  // no Shortcut called Scream on this Mac: nothing is sent and nothing is held back, as before 14 Nov
  const none = brainBlackout({ cfg: { ...CFG, sound: null } })
  none.b.night(NIGHT)
  none.plan(P + 5, { stop: true }); none.plan(P + 505); none.plan(P + 1005)
  assert.equal(none.plan(P + 2005, { stop: true, again: true }).held, false)
  none.plan(P + 7005)
  assert.deepEqual(none.names(), ['Blackout', 'AfterBlackOut'])
})

test('no line of the brain\'s code begins with a bracket after a finished line', () => {
  // JavaScript puts no semicolon before a line that begins with ( [ or a backtick: it joins it to the line before
  const files = ['../cues.mjs', ...readdirSync(new URL('../lib/', import.meta.url)).filter(n => n.endsWith('.js')).map(n => `../lib/${n}`)]
  assert.ok(files.length >= 8, 'every file of the brain\'s code')
  for (const f of files) {
    const lines = read(f).split('\n')
    let prev = ''
    for (const [i, raw] of lines.entries()) {
      const code = raw.replace(/\s*\/\/.*$/, '').trim()
      if (!code || code.startsWith('*') || code.startsWith('/*')) continue
      if (/^[(\[`]/.test(code)) {
        const open = /[,([{=+\-*/%<>&|?:!~^;}]$/.test(prev) || /=>$/.test(prev) || /\b(return|else|await|typeof|in|of|new)$/.test(prev)
        assert.ok(open, `${f}:${i + 1} begins with a bracket after a finished line: ${code.slice(0, 60)}`)
      }
      prev = code
    }
  }
})

test('the real planner at a blackout: a first stop at the press, the same stop again at the dark, and again at the power\'s return', () => {
  // The brain's own plan above is told by hand which stop is "again". This ties that to the real planner, with
  // the real sheet: the stop the scream's guard holds back is the one at the dark, and only that one.
  const stops = a => a.filter(x => x.type === 'music').map(x => (x.do === 'play' ? `play ${x.playlist}` : x.again ? 'stop again' : 'stop'))
  const ready = { act: 1, beat: 'ready', phase: 'act' }
  let st = emptySceneState()
  let r = planScenes(st, { night: ready }, P - 60_000, SHEET); st = r.state
  assert.deepEqual(stops(r.actions), ['play jazz'], 'the jazz is on at Ready for the dark')
  const pressed = { ...ready, blackout: MARKS }
  r = planScenes(st, { night: pressed }, P + 5, SHEET); st = r.state
  assert.deepEqual(stops(r.actions), ['stop'], 'the press: a first stop, never held back')
  r = planScenes(st, { night: pressed }, P + 1005, SHEET); st = r.state
  assert.deepEqual(stops(r.actions), [], 'nothing for the music when the scream goes out')
  r = planScenes(st, { night: pressed }, P + 2005, SHEET); st = r.state
  assert.deepEqual(stops(r.actions), ['stop again'], 'the dark: the stop a second time (the one the scream\'s guard holds back)')
  const atDark = st
  // the real blackout: the server moves the night on at the power's return, and the stop goes again, twice
  r = planScenes(atDark, { night: { act: 2, beat: 'ready', phase: 'prompt', blackout: MARKS } }, P + 7100, SHEET)
  assert.deepEqual(stops(r.actions), ['stop again'])
  r = planScenes(r.state, { night: { act: 2, beat: 'orient', phase: 'prompt', blackout: MARKS } }, P + 7200, SHEET)
  assert.deepEqual(stops(r.actions), ['stop again'])
  // a Blackout test: nothing moves the night on, and at the power's mark the jazz comes back
  r = planScenes(atDark, { night: pressed }, P + 7005, SHEET)
  assert.deepEqual(stops(r.actions), ['play jazz'])
  // pressed at The house rules, where the music is already off: no stop at the press, the stop again at the dark
  const rules = { act: 1, beat: 'rules', phase: 'act' }
  let q = planScenes(planScenes(emptySceneState(), { night: ready }, P - 120_000, SHEET).state, { night: rules }, P - 60_000, SHEET)
  assert.deepEqual(stops(q.actions), ['stop'])
  q = planScenes(q.state, { night: { ...rules, blackout: MARKS } }, P + 5, SHEET)
  assert.deepEqual(stops(q.actions), [], 'already silent: nothing at the press')
  q = planScenes(q.state, { night: { ...rules, blackout: MARKS } }, P + 2005, SHEET)
  assert.deepEqual(stops(q.actions), ['stop again'])
})
