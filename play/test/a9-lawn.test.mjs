// A9 (12 Nov 2026), Get Off My Lawn!: the round, the clean seconds big, the
// slips left on every phone and the Orangerie's screen; the one restart line;
// the celebrations; the practice keeps the limits; a room screen keeps no cache.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { salemView, salemPassDue, SALEM_WORDS } from '../src/lib/salem.js'
import { salemPractice } from '../src/lib/gametest.js'

const src = (p) => readFileSync(new URL(p, import.meta.url), 'utf8')

test('the words', () => {
  assert.equal(SALEM_WORDS.round(2), 'Round 2 of 3')
  assert.equal(SALEM_WORDS.slipsLeft(3), '3 slips left')
  assert.equal(SALEM_WORDS.slipsLeft(1), '1 slip left')
  assert.equal(SALEM_WORDS.restartGreen, 'Someone moved. From the top!')
})

test('the countdown counts the server\'s seconds, never below zero', () => {
  const t = 1_000_000
  const doc = { state: 'playing', round: 1, startsAt: new Date(t), cleanAt: new Date(t + 30_000), slips: 0, maxSlips: 5 }
  assert.equal(salemView(doc, t + 29_100).cleanLeft, 1)
  assert.equal(salemView(doc, t + 40_000).cleanLeft, 0)
  assert.equal(salemView(doc, t + 1).slipsLeft, 5)
  assert.equal(salemView({ ...doc, state: 'passed' }, t).playing, false)
  assert.equal(salemPassDue({ ...doc, state: 'intro', gameEndsAt: new Date(t) }, t), 'game', 'a group that never taps Ready is let through too')
})

test('the phones and the board show it, and celebrate', () => {
  const count = src('../src/screens/SalemCount.jsx')
  assert.match(count, /celebrate\('big'/)
  assert.match(count, /celebrate\('medium'/)
  assert.match(count, /celebrate\('miss'/)
  const act4 = src('../src/screens/Act4.jsx')
  assert.match(act4, /<SalemCount doc=\{doc\} now=\{now\} \/>/)
  assert.match(act4, /useSalemWins\(doc\)/)
  assert.match(act4, /salemPassDue\(doc, now\)/)
  const rooms = src('../src/screens/Rooms.jsx')
  assert.match(rooms, /<SalemCount doc=\{doc\} now=\{now\} className="board" \/>/)
  assert.match(rooms, /useSalemWins\(doc, \{ quiet: true \}\)/)
})

test('the practice passes the limits on to the phones', () => {
  const g = salemPractice({ status: 'open', runId: 'r', players: {}, state: 'playing', round: 1, attempt: 1, roundEndsAt: 5, gameEndsAt: 9, maxSlips: 5, letThrough: false }).game
  assert.equal(g.roundEndsAt, 5)
  assert.equal(g.gameEndsAt, 9)
  assert.equal(g.maxSlips, 5)
})

test('a room screen keeps no cache on the machine', () => {
  const fb = src('../src/firebase.js')
  assert.match(fb, /ROOM_SCREEN \? memoryLocalCache\(\) : persistentLocalCache\(\)/)
  assert.match(fb, /\(kiosk\|setup\|practice\)=/)
})
