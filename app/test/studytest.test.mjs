import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  CONNECTED_MS, KEY_NAMES, COLOURS, millisOf, connection, agoWords, tapAgo, wallLines, tapLine,
  teachLine, practiceLine, roundLine, pairsLine, entryLine, shownLine, sentLine, keyWordProblem, callError, NOT_KEPT,
} from '../src/lib/studyTest.js'

// The Study test page, tested through its pure helpers (the page itself is
// JSX and renders in the browser; a preview check covers it), plus a read
// of the sources for the rail, the links and the roads the page may use.

const here = dirname(fileURLToPath(import.meta.url))
const src = p => readFileSync(join(here, '..', 'src', p), 'utf8')

test('the station counts as connected for 45 seconds after it last reported, from any kind of timestamp', () => {
  const now = 1_000_000
  assert.equal(CONNECTED_MS, 45_000)
  assert.deepEqual(connection({ updatedAt: now - 44_000 }, now), { connected: true, ago: 44_000 })
  assert.deepEqual(connection({ updatedAt: now - 46_000 }, now), { connected: false, ago: 46_000 })
  assert.deepEqual(connection({ updatedAt: { toMillis: () => now - 1000 } }, now), { connected: true, ago: 1000 })
  assert.deepEqual(connection(null, now), { connected: false, ago: null }, 'never reported')
  assert.deepEqual(connection({}, now), { connected: false, ago: null })
  assert.equal(connection({ updatedAt: now + 5000 }, now).connected, true, 'a phone clock a little behind still counts')
  assert.equal(millisOf({ seconds: 2, nanoseconds: 5e8 }), 2500)
  assert.equal(millisOf(new Date(7)), 7)
  assert.equal(millisOf('soon'), null)
  assert.equal(agoWords(3000), 'just now')
  assert.equal(agoWords(30_000), '30 seconds ago')
  assert.equal(agoWords(60_000), '1 minute ago')
  assert.equal(agoWords(5 * 3600_000), '5 hours ago')
})

test('the answer pad sends exactly the button box\'s key names', () => {
  assert.deepEqual(KEY_NAMES, ['red', 'yellow', 'green', 'blue', 'pink', 'white', '1', '2', '3', '4', '5', '6', 'undo', 'submit'])
  for (const c of COLOURS) assert.ok(c.label && c.rgb.length === 3, c.key)
})

test('the walls, the button box and the last tap, in plain words', () => {
  const ok = { walls: { elements: { ok: true, panels: 10, lights: 60, taught: 4 }, lines: { ok: true, bars: 12 } }, deck: 'stream-deck' }
  assert.deepEqual(wallLines(ok), ['White hexagons: 10 found. Taps taught: 4 of 10.', 'Colour bars: 12 found.', 'Button box: the Stream Deck is plugged in.'])
  const down = wallLines({ walls: { elements: { ok: false }, lines: { ok: false } }, deck: 'keyboard' })
  assert.match(down[0], /not answering/)
  assert.match(down[1], /not answering/)
  assert.match(down[2], /keyboard stands in/)
  assert.equal(wallLines({}).length, 3, 'a status with no walls yet still reads')

  assert.equal(tapLine({ panel: 4, known: true, at: 1 }), 'You tapped hexagon 4.')
  assert.equal(tapLine({ panel: null, known: false, at: 1 }), 'The station does not know that tap yet. Teach the taps.')
  assert.match(tapLine(null), /No tap yet/)
  // the tap and stationAt are both the station's clock; the rest is how long the status has sat here
  assert.equal(tapAgo({ lastTap: { at: 900 }, stationAt: 1000, updatedAt: 5000 }, 6000), 1100)
  assert.equal(tapAgo({ lastTap: null, stationAt: 1000, updatedAt: 5000 }, 6000), null)
})

test('teaching and the practice round read as instructions', () => {
  assert.equal(teachLine({ step: 3, of: 10 }), 'Hexagon 3 of 10 is lit. Tap it.')
  assert.equal(teachLine(null), '')
  const p = { state: 'idle', round: 2, rounds: 3, pattern: 1, patterns: 3, pairs: 1, entry: { colour: 'red', number: null }, misses: 0, outcome: null, shown: null }
  assert.equal(practiceLine(p), 'Touch any hexagon to begin.')
  assert.equal(practiceLine({ ...p, state: 'playing' }), 'Watch the wall.')
  assert.equal(practiceLine({ ...p, state: 'reproducing' }), 'Your turn: touch it back.')
  assert.equal(practiceLine({ ...p, state: 'entering' }), 'Enter the colour and the number.')
  assert.equal(practiceLine({ ...p, state: 'done', outcome: 'solved' }), 'Done. Solved: all 3 pairs entered.')
  assert.equal(practiceLine({ ...p, state: 'done', outcome: 'capped' }), 'Done. The time ran out before the last pair.')
  assert.equal(practiceLine(null), '')
  assert.equal(roundLine(p), 'Round 2 of 3, pattern 1 of 3.')
  assert.equal(roundLine({ ...p, state: 'done' }), '')
  assert.equal(pairsLine(p), 'Pairs entered: 1 of 3.')
  assert.equal(entryLine(p), 'Colour: red. Number: not yet.')
  assert.equal(shownLine(p), null, 'nothing about the answer while the colour bars are up')
  assert.equal(shownLine({ ...p, shown: { colour: 'green', number: 3 } }), 'The colour bars are down. They would show: green 3.')
})

test('a sent button waits for the station; the key word and failed calls say what to do', () => {
  assert.equal(sentLine(0, { seenSeq: 0 }), null)
  assert.match(sentLine(5, { seenSeq: 4 }), /Waiting for the station/)
  assert.equal(sentLine(5, { seenSeq: 5 }), null)
  assert.match(sentLine(1, null), /Waiting/)
  assert.equal(sentLine(5, { seenSeq: 4 }, false), NOT_KEPT, 'a station that is off skips it: say so, never "waiting"')
  assert.equal(NOT_KEPT, 'Start the station first. A button tapped while it is off is not kept.')
  assert.equal(keyWordProblem(' abc '), 'A key word needs at least four characters.')
  assert.equal(keyWordProblem('study-2026'), null)
  assert.match(callError({ code: 'functions/unavailable' }), /signal/)
  assert.equal(callError({ code: 'functions/permission-denied', message: 'Only the workshop can do that.' }), 'Only the workshop can do that.')
  assert.match(callError({ code: 'functions/internal', message: 'internal' }), /not deployed/)
  assert.ok(callError(null))
})

test('a rail tab, a route, links from Devices and Game night, and one road each way', () => {
  const app = src('App.jsx')
  assert.ok(/<NavLink to="\/study-test" className="rail-link">Study test<\/NavLink>/.test(app), 'Jon asked for a tab')
  assert.ok(app.includes('path="/study-test"'))
  assert.ok(src('pages/Devices.jsx').includes('to="/study-test"'))
  assert.ok(src('pages/Night.jsx').includes('to="/study-test"'))

  // on a phone the rail is one row: a column for every link and the Sign out button
  const links = (app.match(/className="rail-link( quiet)?"/g) ?? []).length
  const phone = src('styles.css').match(/\.rail \{ position: fixed;[^}]*grid-template-columns: repeat\((\d+), 1fr\)/)
  assert.ok(phone, 'the phone rail rule')
  assert.equal(Number(phone[1]), links, 'one column per rail link')

  const api = src('lib/studyTestApi.js')
  assert.ok(api.includes("httpsCallable(functions, 'studyTest')"))
  assert.equal((api.match(/\bdoc\(db,/g) ?? []).length, 1, 'one Firestore read')
  assert.ok(api.includes("doc(db, 'public_state', 'study_test_status')"))
  // the start buttons wait for a connected station; Stop is always there
  const page = src('pages/StudyTest.jsx')
  assert.equal((page.match(/disabled=\{off \|\| busyMode\}/g) ?? []).length, 3, 'Flash, Teach and Practice need the station')
  assert.ok(/<button className="ghost" onClick=\{\(\) => send\('stop'\)\}>Stop<\/button>/.test(page), 'Stop never waits')
  for (const s of [api, src('pages/StudyTest.jsx'), src('lib/studyTest.js')]) {
    assert.ok(!/['"`](sealed|cases|nights)\//.test(s), 'never a sealed, case or night path')
    assert.ok(!s.includes('—'), 'no em dash')
  }
})
