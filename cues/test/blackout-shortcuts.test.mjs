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
  NO_PRESS, DEFAULT_SHORTCUT_LEAD_MS, DEFAULT_AFTER_LEAD_MS, MAX_SHORTCUT_LEAD_MS,
} from '../lib/blackoutShortcuts.js'
import { sceneProblems } from '../lib/scenes.js'
import { createStringsMirror } from '../lib/strings.js'

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
  assert.ok(sceneProblems({ ...SHEET, blackout: { leadMs: 2000, shortcut: 12 } }).includes('blackout.shortcut is not a Shortcut\'s name or null'))
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

test('the brain\'s program runs them on the marks, through one runner, and never in fake mode', () => {
  const src = read('../cues.mjs')
  assert.ok(src.includes("import { blackoutShortcutsOf, blackoutShortcutCheck, blackoutShortcutTimes, stepBlackoutShortcuts, NO_PRESS } from './lib/blackoutShortcuts.js'"))
  // woken at the two Shortcuts' own moments as well as at the marks
  assert.ok(src.includes('const due = blackoutShortcutTimes(m, blackoutCfg)'))
  assert.ok(src.includes('for (const at of [m.darkAt, m.powerAt, due.darkAt, due.afterAt]) if (at && at > now) marksTimers.push(setTimeout(apply, at - now + 5))'))
  // stepped on every plan: each change of the night, each timer
  const apply = src.slice(src.indexOf('function apply() {'), src.indexOf('function playSound(a)'))
  assert.ok(apply.includes('stepBlackout(now)'))
  assert.ok(src.includes('const r = stepBlackoutShortcuts(blackoutState, { marks: blackoutMarkTimes(docs.night), now, cfg: blackoutCfg })'))
  // one runner for the two: the after one replaces a dark one still waiting on Apple Home
  assert.equal(src.split("createShortcutRunner({ tag: 'blackout', log })").length - 1, 1)
  assert.ok(src.includes('blackoutRunner.fire(name).catch('))
  // fake mode only says what it would do
  assert.ok(src.includes('if (FAKE) log(`[blackout] would run the Shortcut "${name}"'))
  // the strings again, a few seconds after the house is back
  assert.ok(src.includes("if (which === 'after') setTimeout(() => { strings.forget(); mirrorStrings() }, STRINGS_AGAIN_MS)"))
  // checked against this Mac's list when the brain starts, with the rest; and an off switch
  assert.ok(src.includes('const b = blackoutShortcutCheck(blackoutSheet, have)'))
  assert.ok(src.includes('blackoutShortcutsOf(offSwitch(env.BLACKOUT_SHORTCUTS) ? null : sheet)'))
  // neither is the music's stop: that stays its own Shortcut on the sheet
  assert.equal(SHEET.musicShortcuts.off, 'PANIC')
})
