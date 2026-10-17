import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  livingView, roomDark, captionsOf, doorStage, boardRows, bellShown, soundFresh, dotState, heardText, relayRules, showRules,
  DEFAULT_RELAY_RULES, BELL_MS, DOOR_HOLD_MS,
} from '../src/lib/screen.js'
import { STALE_MS } from '../src/lib/clock.js'

// The room screens' pure rules. Fixtures are throwaway shapes, never content.

const stamp = (t) => ({ toMillis: () => t })
const NOW = 20_000_000
const NIGHT = { act: 2, beat: 'news', phase: 'act', roster: { jon: { name: 'Jon', characterId: 'prof-jonathan' }, jessa: { name: 'Jessa', characterId: 'rye' } } }

test('the living room: the phase wins, then the finale, the ballot, a drawing, the board, the door, a card, idle', () => {
  assert.equal(livingView({ night: { ...NIGHT, phase: 'blackout' }, screen: { kind: 'news' } }), 'dark')
  assert.equal(livingView({ night: { ...NIGHT, phase: 'prompt' }, screen: { kind: 'news' } }), 'dark')
  assert.equal(livingView({ night: { ...NIGHT, phase: 'paused' }, screen: { kind: 'news' } }), 'paused')
  assert.equal(livingView({ night: NIGHT, screen: { kind: 'black', title: 'One moment' } }), 'paused')
  assert.equal(livingView({ night: NIGHT, screen: { kind: 'black', title: '' } }), 'dark')
  assert.equal(livingView({ night: { ...NIGHT, act: 7 }, finale: { at: 1 }, screen: { kind: 'board' } }), 'finale')
  assert.equal(livingView({ night: { ...NIGHT, window: { kind: 'ballot', settled: false } }, screen: { kind: 'board' } }), 'ballot')
  assert.equal(livingView({ night: { ...NIGHT, window: { kind: 'ballot', settled: true } }, screen: { kind: 'board' } }), 'board')
  for (const state of ['walk', 'turn', 'vote', 'lockout']) assert.equal(livingView({ night: NIGHT, relay: { state }, screen: { kind: 'news' } }), 'relay')
  assert.equal(livingView({ night: NIGHT, relay: { state: 'done' }, screen: { kind: 'board' } }), 'board', 'the board beats the open door once the round starts')
  assert.equal(livingView({ night: NIGHT, relay: { state: 'done' }, screen: { kind: 'idle' } }), 'door')
  assert.equal(livingView({ night: NIGHT, relay: { state: 'idle' }, screen: { kind: 'door' } }), 'door', 'the door beat shows the door even when the drawing was cut')
  for (const kind of ['news', 'bulletin', 'irwin']) assert.equal(livingView({ night: NIGHT, screen: { kind } }), 'card')
  assert.equal(livingView({ night: NIGHT, screen: { kind: 'idle' } }), 'idle')
  assert.equal(livingView({ night: NIGHT }), 'idle')
  // the iPad: words only, kept up while the server carries them
  assert.equal(livingView({ night: NIGHT, screen: { kind: 'news', lines: ['x'] }, captionsOnly: true }), 'captions')
  assert.equal(livingView({ night: NIGHT, screen: { kind: 'idle', captions: { kind: 'news', lines: ['x'] } }, captionsOnly: true }), 'captions')
  assert.equal(livingView({ night: NIGHT, screen: { kind: 'idle', captions: null }, captionsOnly: true }), 'idle')
  assert.equal(livingView({ night: NIGHT, relay: { state: 'turn' }, screen: { kind: 'idle', captions: { lines: ['x'] } }, captionsOnly: true }), 'relay', 'the iPad shows the drawing too')
  // the bedroom and the study go dark with everyone else
  assert.equal(roomDark({ phase: 'blackout' }), true)
  assert.equal(roomDark({ phase: 'prompt' }), true)
  assert.equal(roomDark({ phase: 'act' }), false)
  assert.equal(roomDark(null), false)
})

test('captions: the card while it is up, else the last ones the server carried', () => {
  assert.deepEqual(captionsOf({ kind: 'bulletin', title: 'The bulletin', lines: ['a', 'b'] }), { kind: 'bulletin', title: 'The bulletin', lines: ['a', 'b'] })
  assert.deepEqual(captionsOf({ kind: 'idle', captions: { kind: 'news', lines: ['a'] } }), { kind: 'news', title: '', lines: ['a'] })
  assert.equal(captionsOf({ kind: 'idle', captions: null }), null)
  assert.equal(captionsOf(null), null)
})

test('the door: open for the hold on the server clock, then the trace only when the host put it on the TV', () => {
  const trace = { level: 3, trace: 'ink' }
  const screen = { kind: 'door', at: stamp(NOW), holdMs: DOOR_HOLD_MS }
  assert.equal(doorStage({ screen, cues: { tvTrace: true }, trace, now: NOW + 3000 }), 'open')
  assert.equal(doorStage({ screen, cues: { tvTrace: true }, trace, now: NOW + DOOR_HOLD_MS }), 'trace')
  assert.equal(doorStage({ screen, cues: { tvTrace: false }, trace, now: NOW + 60_000 }), 'open', 'not asked for')
  assert.equal(doorStage({ screen, cues: { tvTrace: true }, trace: null, now: NOW + 60_000 }), 'open', 'no trace yet')
  assert.equal(doorStage({ screen: { kind: 'idle' }, cues: { tvTrace: true }, trace, now: NOW }), 'trace', 'no door beat yet: no hold')
  assert.equal(doorStage({ screen: null, cues: null, trace, now: NOW }), 'open')
})

test('the board: nine rows, a strike each, defaulted ones indistinguishable, sorted by name', () => {
  const names = ['Ana', 'Ben', 'Cal', 'Dee', 'Eve', 'Fay', 'Gus', 'Hal', 'Ivy']
  const roster = Object.fromEntries(names.map((n, i) => [n.toLowerCase(), { name: n, characterId: i % 2 ? 'rye' : 'arms' }]))
  const keys = Object.keys(roster)
  const eliminations = Object.fromEntries(keys.map((k, i) => [k, i % 2
    ? { kind: 'motive', n: i + 1, name: roster[k].name, at: stamp(NOW), ...(i === 1 ? { defaulted: true } : {}) }
    : { kind: 'person', key: keys[(i + 1) % 9], name: roster[k].name, at: stamp(NOW), ...(i === 4 ? { defaulted: true } : {}) }]))
  const characters = [{ id: 'rye', name: 'Dorothy Rye' }, { id: 'arms', name: 'Roger Arms' }]
  const motives = Array.from({ length: 19 }, (_, i) => ({ n: i + 1, rhyme: `rhyme ${i + 1}` }))
  const rows = boardRows({ night: { roster, eliminations }, characters, motives })
  assert.equal(rows.length, 9)
  assert.deepEqual(rows.map(r => r.name), names)
  for (const r of rows) {
    assert.ok(r.strike, `${r.name} has a strike`)
    assert.ok(!('defaulted' in r) && !('defaulted' in r.strike), 'a defaulted strike looks like any other')
    assert.ok(r.strike.text.startsWith('not '))
    assert.ok(r.characterName === 'Dorothy Rye' || r.characterName === 'Roger Arms')
  }
  assert.equal(JSON.stringify(rows).includes('defaulted'), false)
  assert.equal(rows.find(r => r.name === 'Ben').strike.text, 'not 2. rhyme 2')
  assert.equal(rows.find(r => r.name === 'Ana').strike.text, 'not Ben')
  // a row with no strike yet, and an unknown motive number, still render
  const partial = boardRows({ night: { roster: { x: { name: 'X' } }, eliminations: { x: { kind: 'motive', n: 99 } } } })
  assert.equal(partial[0].strike.text, 'not motive 99')
  assert.equal(boardRows({ night: { roster: { x: { name: 'X' } } } })[0].strike, null)
  assert.deepEqual(boardRows({}), [])
})

test('the bell: three seconds from the sound stamp; a stale sound rings nothing', () => {
  const sounds = { current: { id: 'chime-news', at: stamp(NOW) } }
  assert.equal(bellShown(sounds, NOW), true)
  assert.equal(bellShown(sounds, NOW + BELL_MS - 1), true)
  assert.equal(bellShown(sounds, NOW + BELL_MS), false)
  assert.equal(bellShown(sounds, NOW - 1), false)
  assert.equal(bellShown(null, NOW), false)
  assert.equal(soundFresh(sounds, NOW + 10_000), true)
  assert.equal(soundFresh(sounds, NOW + 60_000), false)
  assert.equal(soundFresh({ current: { id: 'x', at: new Date(NOW) } }, NOW), true)
})

test('the dot: green live, amber after twenty seconds from cache, red offline, with the time since heard', () => {
  const live = { fromCache: false, heardAt: NOW - 5000 }
  assert.deepEqual(dotState(live, true, NOW), { colour: 'green', label: 'live', seconds: 5 })
  const cached = { fromCache: true, heardAt: NOW - 30_000 }
  assert.equal(dotState(cached, true, NOW).colour, 'amber')
  assert.equal(dotState(cached, true, NOW).seconds, 30)
  assert.equal(dotState({ fromCache: true, heardAt: NOW - STALE_MS + 1000 }, true, NOW).colour, 'green', 'not yet')
  assert.equal(dotState(live, false, NOW).colour, 'red')
  assert.equal(dotState(null, true, NOW).colour, 'green')
  assert.equal(heardText(null), 'not heard yet')
  assert.equal(heardText(2), 'heard just now')
  assert.equal(heardText(47), 'heard 47 s ago')
  assert.equal(heardText(130), 'heard 2 min ago')
})

test('the relay rules: three lines from the workshop or the defaults, on the first walk of grid one only', () => {
  assert.deepEqual(relayRules(''), DEFAULT_RELAY_RULES)
  assert.deepEqual(relayRules('A. | B. | C. | D.'), ['A.', 'B.', 'C.'])
  assert.deepEqual(relayRules('One sentence. Two sentences. Three.'), ['One sentence.', 'Two sentences.', 'Three.'])
  assert.equal(showRules({ state: 'walk', grid: 1, gridDone: [] }), true)
  assert.equal(showRules({ state: 'walk', grid: 1, gridDone: ['A1'] }), false)
  assert.equal(showRules({ state: 'walk', grid: 2, gridDone: [] }), false)
  assert.equal(showRules({ state: 'turn', grid: 1, gridDone: [] }), false)
  // the server's copy of the defaults is the same three lines
  const server = readFileSync(new URL('../../functions/lib/screen.js', import.meta.url), 'utf8')
  for (const line of DEFAULT_RELAY_RULES) assert.ok(server.includes(line), 'functions/lib/screen.js has the same default rules')
})

test('the previews cover every screen the plan names, and the kiosk has the three corners', () => {
  const preview = readFileSync(new URL('../src/Preview.jsx', import.meta.url), 'utf8')
  for (const k of ['kiosk-news', 'kiosk-bulletin', 'kiosk-irwin', 'kiosk-black', 'kiosk-board', 'kiosk-ipad', 'kiosk-living-done']) assert.ok(preview.includes(`'${k}'`), k)
  const kiosk = readFileSync(new URL('../src/screens/Kiosk.jsx', import.meta.url), 'utf8')
  for (const c of ['function Wake', 'function Bell', 'function StaleDot', 'function Board', 'function ScreenCard', 'function Captions', 'function DoorScreen', 'function OneMoment', 'function Dark']) assert.ok(kiosk.includes(c), c)
  assert.ok(kiosk.includes("which === 'ipad'"), 'the iPad alias')
  assert.ok(!kiosk.includes('—'), 'no em dash on a room screen')
  const main = readFileSync(new URL('../src/main.jsx', import.meta.url), 'utf8')
  assert.ok(main.includes('ipad'))
})
