// Jon's two Shortcuts for the blackout (12 Nov 2026: "I have added 2 new
// shortcuts to help with the black out. Blackout and afterblackout. Please use
// these if it helps make the blackout hit hard."). lib/blackoutShortcuts.js
// says when each runs; cues.mjs runs them. Nothing here runs a Shortcut,
// switches a light or makes a sound.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  blackoutShortcutsOf, blackoutShortcutProblems, nameOnThisMac, blackoutShortcutCheck, blackoutShortcutTimes, stepBlackoutShortcuts,
  afterWaitMs, NO_PRESS, DEFAULT_SHORTCUT_LEAD_MS, DEFAULT_AFTER_LEAD_MS, MAX_SHORTCUT_LEAD_MS, MAX_AFTER_LEAD_MS, DARK_SETTLE_MS,
} from '../lib/blackoutShortcuts.js'
import { sceneProblems } from '../lib/scenes.js'
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
  assert.deepEqual(blackoutShortcutsOf(SHEET), { dark: { name: 'Blackout', leadMs: 1500 }, after: { name: 'AfterBlackOut', leadMs: 0 } })
  assert.equal(SHEET.blackout.leadMs, 2000, 'the server\'s own lead is as it was: nothing to publish')
  assert.deepEqual(sceneProblems(SHEET), [])
  // defaults, and a sheet that names none
  assert.deepEqual(blackoutShortcutsOf({ blackout: { shortcut: ' Blackout ' } }), { dark: { name: 'Blackout', leadMs: DEFAULT_SHORTCUT_LEAD_MS }, after: null })
  assert.deepEqual(blackoutShortcutsOf({ blackout: { afterShortcut: 'AfterBlackOut' } }), { dark: null, after: { name: 'AfterBlackOut', leadMs: DEFAULT_AFTER_LEAD_MS } })
  assert.deepEqual(blackoutShortcutsOf({ blackout: { leadMs: 2000 } }), { dark: null, after: null })
  assert.deepEqual(blackoutShortcutsOf(null), { dark: null, after: null })
  assert.deepEqual(blackoutShortcutsOf({ blackout: { shortcut: '', afterShortcut: null } }), { dark: null, after: null })
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
  assert.deepEqual(blackoutShortcutCheck(sheet, null), { dark: sheet.dark, after: sheet.after, lines: [] })
  // none named: nothing to say
  assert.deepEqual(blackoutShortcutCheck({ dark: null, after: null }, ['Blackout']), { dark: null, after: null, lines: [] })
  // a lead for the after one is said too
  assert.ok(blackoutShortcutCheck({ dark: null, after: { name: 'AfterBlackOut', leadMs: 800 } }, ['AfterBlackOut']).lines[0].includes('"AfterBlackOut" 800 ms before the power returns'))
})

test('the timeline: Blackout a second and a half before the dark, AfterBlackOut as the power returns, each once', () => {
  assert.deepEqual(blackoutShortcutTimes(MARKS, CFG), { darkAt: P + 500, afterAt: P + 7000 })
  assert.deepEqual(blackoutShortcutTimes(null, CFG), { darkAt: null, afterAt: null })
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
  assert.deepEqual(blackoutShortcutTimes(MARKS, { dark: { name: 'B', leadMs: 9000 }, after: null }), { darkAt: P, afterAt: null })
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
  assert.deepEqual(blackoutShortcutTimes(MARKS, { dark: CFG.dark, after: { name: 'AfterBlackOut', leadMs: 9000 } }), { darkAt: P + 500, afterAt: P + 2000 })
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
  assert.ok(src.includes("import { blackoutShortcutsOf, blackoutShortcutCheck, blackoutShortcutProblems, blackoutShortcutTimes, stepBlackoutShortcuts, afterWaitMs, NO_PRESS } from './lib/blackoutShortcuts.js'"))
  // woken at the two Shortcuts' own moments as well as at the marks
  assert.ok(src.includes('const due = blackoutShortcutTimes(m, blackoutCfg)'))
  assert.ok(src.includes('for (const at of [m.darkAt, m.powerAt, due.darkAt, due.afterAt]) if (at && at > now) marksTimers.push(setTimeout(apply, at - now + 5))'))
  // stepped on every plan: each change of the night, each timer
  const apply = src.slice(src.indexOf('function apply() {'), src.indexOf('function playSound(a)'))
  assert.ok(apply.includes('stepBlackout(now)'))
  assert.ok(src.includes('const r = stepBlackoutShortcuts(blackoutState, { marks, now, cfg: blackoutCfg })'))
  // only in Act 1, where the blackout is: a test later in a practice night leaves the two scenes out (the Study's walls, the strings under a game)
  // ...and never for a paused night: a pause with the marks still on is a blackout being called off
  assert.ok(src.includes("const marks = Number(docs.night?.act ?? 0) <= 1 && docs.night?.phase !== 'paused' ? blackoutMarkTimes(docs.night) : null"))
  // one runner for the two: the after one replaces a dark one still waiting on Apple Home
  assert.equal(src.split("createShortcutRunner({ tag: 'blackout', log })").length - 1, 1)
  assert.ok(src.includes('blackoutRunner.fire(name, { retryUntil, stillWanted }).then('))
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
  // one the sheet names that is not on this Mac is looked for again each minute, and counts in the check's own answer
  assert.ok(src.includes('const blackoutMissing = () => !!((blackoutSheet.dark && !blackoutCfg.dark) || (blackoutSheet.after && !blackoutCfg.after))'))
  assert.ok(src.includes('process.exit(r && !r.missing.length && !blackoutMissing() ? 0 : 1)'))
  // the strings' dark is left to Jon's scene only when they have no way of their own to go off
  assert.ok(src.includes('stringsOffLeftToBlackout = !!blackoutCfg.dark && stringsByShortcuts && !stringsPaired && !have.includes(stringShortcutNames.off)'))
  assert.ok(src.includes('blackoutShortcutsOf(offSwitch(env.BLACKOUT_SHORTCUTS) ? null : sheet)'))
  // neither is the music's stop: that stays its own Shortcut on the sheet
  assert.equal(SHEET.musicShortcuts.off, 'PANIC')
})
