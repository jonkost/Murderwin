import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  livingView, roomDark, captionsOf, doorStage, doorSlideOf, slideAt, slideTime, boardRows, bellShown, soundFresh, dotState, heardText, relayRules, showRules,
  DEFAULT_RELAY_RULES, BELL_MS, DOOR_HOLD_MS, SLIDE_FALLBACK_MS,
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
  // the Happy Birthday Irwin card from the Cake! button (cue 13, 25 Oct 2026): its own view on the TV, never on the iPad's words
  assert.equal(livingView({ night: { ...NIGHT, act: 5, beat: 'roam' }, screen: { kind: 'birthday', title: 'Happy Birthday, Sir Irwin!' } }), 'birthday')
  assert.equal(livingView({ night: { ...NIGHT, act: 5 }, screen: { kind: 'birthday' }, captionsOnly: true }), 'idle')
  assert.equal(livingView({ night: { ...NIGHT, act: 5, phase: 'paused' }, screen: { kind: 'birthday' } }), 'paused', 'the pause still wins')
  // the iPad: words only, kept up while the server carries them
  assert.equal(livingView({ night: NIGHT, screen: { kind: 'news', lines: ['x'] }, captionsOnly: true }), 'captions')
  assert.equal(livingView({ night: NIGHT, screen: { kind: 'idle', captions: { kind: 'news', lines: ['x'] } }, captionsOnly: true }), 'captions')
  assert.equal(livingView({ night: NIGHT, screen: { kind: 'idle', captions: null }, captionsOnly: true }), 'idle')
  assert.equal(livingView({ night: NIGHT, relay: { state: 'turn' }, screen: { kind: 'idle', captions: { lines: ['x'] } }, captionsOnly: true }), 'relay', 'the iPad shows the drawing too')
  // the join code (cues 3 and 10, 25 Oct 2026): its own view on the TV; the iPad keeps its words or its crest
  assert.equal(livingView({ night: { ...NIGHT, act: 1, beat: 'arrive' }, screen: { kind: 'join', title: 'Scan to join' } }), 'join')
  assert.equal(livingView({ night: { ...NIGHT, act: 3, beat: 'wrap' }, screen: { kind: 'join', captions: { kind: 'bulletin', lines: ['x'] } } }), 'join')
  assert.equal(livingView({ night: { ...NIGHT, act: 3, beat: 'wrap' }, screen: { kind: 'join', captions: { kind: 'bulletin', lines: ['x'] } }, captionsOnly: true }), 'captions', 'the iPad keeps bulletin 2 up through the wrap-up')
  assert.equal(livingView({ night: { ...NIGHT, act: 1 }, screen: { kind: 'join' }, captionsOnly: true }), 'idle')
  assert.equal(livingView({ night: { ...NIGHT, act: 1, phase: 'paused' }, screen: { kind: 'join' } }), 'paused', 'the pause still wins')
  // the bedroom and the study go dark with everyone else
  assert.equal(roomDark({ phase: 'blackout' }), true)
  assert.equal(roomDark({ phase: 'prompt' }), true)
  assert.equal(roomDark({ phase: 'act' }), false)
  assert.equal(roomDark(null), false)
})

test('The End (cue 23, 25 Oct 2026): every room screen goes black once the night is over, and stays black', () => {
  // nights/{id}.over, written by the end beat, darkens the kiosks that never read public/screen
  assert.equal(roomDark({ act: 7, beat: 'end', phase: 'act', over: true }), true)
  assert.equal(roomDark({ act: 7, beat: 'end', phase: 'act' }), true, 'the end beat alone is enough')
  assert.equal(roomDark({ act: 7, beat: 'result', phase: 'act' }), false, 'the result beat is not the end')
  assert.equal(roomDark({ act: 5, beat: 'roam', phase: 'act', over: true }), true, 'a night marked over is over whatever beat it says')
  // the TV and the iPad read the screen doc: a black doc with no title is dark, the titled one is the pause card
  assert.equal(roomDark({ act: 7, beat: 'end', phase: 'act' }, { kind: 'black', title: '' }), true)
  assert.equal(roomDark({ act: 6, beat: 'door', phase: 'act' }, { kind: 'black', title: '' }), true)
  assert.equal(roomDark({ act: 6, beat: 'door', phase: 'paused' }, { kind: 'black', title: 'One moment' }), false, 'the pause card is not the dark')
  assert.equal(roomDark({ act: 6, beat: 'door', phase: 'act' }, { kind: 'door' }), false)
  // the living view agrees: the end beat's black doc is dark there too
  assert.equal(livingView({ night: { act: 7, beat: 'end', phase: 'act', over: true }, screen: { kind: 'black', title: '' } }), 'dark')
  // every kiosk goes through roomDark with the screen doc the TV reads, and the dispatch darkens before any room branch
  const kiosk = readFileSync(new URL('../src/screens/Kiosk.jsx', import.meta.url), 'utf8')
  assert.ok(kiosk.includes("roomDark(n, living ? screen.data : null)) body = <Dark />"), 'the dark branch comes first')
  assert.ok(kiosk.indexOf('body = <Dark />') < kiosk.indexOf("else if (code) body = <RoomCode"), 'dark before the room code')
})

test('a pause during the blackout or the prompt keeps every room screen dark', () => {
  // the host presses Blackout, then Pause (Irwin needs the garden): the phones
  // stay dark through effectivePhase, and so do the bedroom, the study, the
  // TV and the iPad; "One moment" shows only for a pause taken in an act
  for (const from of ['blackout', 'prompt']) {
    const paused = { ...NIGHT, phase: 'paused', pausedFrom: from }
    assert.equal(roomDark(paused), true, `bedroom and study dark, paused from ${from}`)
    assert.equal(livingView({ night: paused, screen: { kind: 'news' } }), 'dark', `TV dark, paused from ${from}`)
    assert.equal(livingView({ night: paused, screen: { kind: 'idle' }, captionsOnly: true }), 'dark', `iPad dark, paused from ${from}`)
  }
  assert.equal(roomDark({ ...NIGHT, phase: 'paused', pausedFrom: 'act' }), false)
  assert.equal(livingView({ night: { ...NIGHT, phase: 'paused', pausedFrom: 'act' }, screen: { kind: 'news' } }), 'paused')
  assert.equal(livingView({ night: { ...NIGHT, phase: 'paused' }, screen: { kind: 'news' } }), 'paused', 'no pausedFrom: an act')
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

test('D1-1 a finished drawing shows Sir Irwin\'s door slide above the open door, never over the trace', () => {
  const doorSlide = { title: 'The door', text: '(sample door slide)' }
  const relay = { state: 'done', doorOpen: true, doorSlide }
  // the TV takes the door view for a finished drawing; the slide is drawn there
  assert.equal(livingView({ night: NIGHT, relay, screen: { kind: 'idle' } }), 'door')
  assert.equal(livingView({ night: NIGHT, relay, screen: { kind: 'door' } }), 'door')
  const screen = { kind: 'door', at: stamp(NOW), holdMs: DOOR_HOLD_MS }
  const stage = doorStage({ screen, cues: { tvTrace: true }, trace: { level: 3 }, now: NOW + 2000 })
  assert.equal(stage, 'open')
  assert.deepEqual(doorSlideOf({ relay, stage }), doorSlide, 'the slide shows during the hold')
  assert.equal(doorSlideOf({ relay, stage: 'trace' }), null, 'the trace takes the whole screen')
  assert.equal(doorSlideOf({ relay: { state: 'done' }, stage: 'open' }), null, 'no slide on the doc: the door alone')
  assert.equal(doorSlideOf({ relay: { state: 'idle', doorSlide }, stage: 'open' }), null, 'a drawing that was cut: no slide')
  assert.equal(doorSlideOf({}), null)
  // the old unreachable branch is gone: the door screen draws the slide itself
  const kiosk = readFileSync(new URL('../src/screens/Kiosk.jsx', import.meta.url), 'utf8')
  assert.ok(!kiosk.includes("relay.state === 'done') return"), 'no dead done branch in Living')
  assert.ok(kiosk.includes('doorSlideOf({ relay, stage })'), 'DoorScreen draws the slide')
  assert.ok(kiosk.includes('relay={relay} serverNow={serverNow}'), 'Living hands the relay doc to the door screen')
})

test('BK-13 Sir Irwin\'s slides: each up for its own time, slide 3 with the practice smiley\'s B1 square', () => {
  // the server's rule: five seconds plus 0.4 seconds a word
  assert.equal(slideTime('one two three'), 6_200)
  assert.equal(slideTime(''), 5_000)
  const cell = { label: 'B1', strokes: [{ kind: 'arc', from: [0, 0.5], to: [1, 0.5], bulge: -0.3 }] }
  const slides = [{ title: 'a', text: 'x', ms: 6_000 }, { title: 'b', text: 'y', ms: 7_000 }, { title: 'c', text: 'z', ms: 8_000, cell }]
  const start = NOW
  const relay = { state: 'intro', slides, introEndsAt: stamp(start + 21_000), timing: { slideMs: 9_000 } }
  const at = (t) => slideAt(relay, start + t).index
  assert.equal(at(0), 0)
  assert.equal(at(5_999), 0)
  assert.equal(at(6_000), 1, 'slide 2 starts when slide 1 has had its six seconds')
  assert.equal(at(12_999), 1)
  assert.equal(at(13_000), 2)
  assert.equal(at(60_000), 2, 'the last slide stays until the server moves on')
  assert.equal(at(-5_000), 0, 'a screen whose clock runs early still shows slide 1')
  assert.deepEqual(slideAt(relay, start + 14_000).slide.cell, cell, 'slide 3 carries the square')
  assert.equal(slideAt(relay, start).count, 3)
  // an older doc with no per-slide time: every slide gets timing.slideMs
  const old = { state: 'intro', slides: slides.map(({ ms, cell, ...s }) => s), introEndsAt: stamp(start + 27_000), timing: { slideMs: 9_000 } }
  assert.equal(slideAt(old, start + 8_999).index, 0)
  assert.equal(slideAt(old, start + 9_000).index, 1)
  assert.equal(slideAt(old, start + 18_000).index, 2)
  assert.equal(slideAt({ slides: [{ title: 'a', text: 'x' }], introEndsAt: stamp(start + SLIDE_FALLBACK_MS) }, start).index, 0)
  assert.deepEqual(slideAt({ state: 'intro', slides: [] }, start), { index: -1, slide: null, count: 0 })
  // the TV draws the square the way a turn does, dark, with its label
  const kiosk = readFileSync(new URL('../src/screens/Kiosk.jsx', import.meta.url), 'utf8')
  assert.ok(kiosk.includes('slideAt(relay, serverNow())'), 'the slides run on slideAt')
  assert.ok(kiosk.includes('<Cell strokes={s.cell.strokes} className="cell-art slide" dark />'), 'the square is drawn dark')
  assert.ok(kiosk.includes('{s.cell.label}'), 'with its label')
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
  // X-2: the defaults say what the night does now: walk first, describe from the TV, tell the host the guess
  // (fifteen seconds a turn and the host's tap since 25 Oct 2026, Jon's cue list)
  assert.deepEqual(DEFAULT_RELAY_RULES, [
    'Sir Irwin calls a name. That person walks to the paper in the Library before the square shows.',
    'Everyone else describes the square on the TV. Words only, no pointing. Fifteen seconds a turn.',
    'When the grid is full, agree on the picture and tell the host your guess.',
  ])
  assert.ok(!DEFAULT_RELAY_RULES.join(' ').includes('your phone'), 'nothing is drawn or voted on a guest\'s phone')
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
  for (const k of ['kiosk-news', 'kiosk-bulletin', 'kiosk-irwin', 'kiosk-black', 'kiosk-board', 'kiosk-ipad', 'kiosk-living-done', 'kiosk-living-hold', 'kiosk-finale-leadin', 'kiosk-rehearsal', 'host-house-act2',
    // the cue list's screens (25 Oct 2026): the join and rejoin codes, the four room codes, the four rules cards and Boo's intro, the birthday card, every loop slot, The End
    'kiosk-join', 'kiosk-rejoin', 'kiosk-code-study', 'kiosk-code-library', 'kiosk-code-entryway', 'kiosk-code-orangerie',
    'kiosk-rules-study', 'kiosk-rules-library', 'kiosk-rules-entryway', 'kiosk-boo-intro', 'kiosk-rules-orangerie', 'kiosk-birthday',
    'kiosk-loop-living', 'kiosk-loop-ipad', 'kiosk-loop-study', 'kiosk-loop-memory', 'kiosk-loop-boo', 'kiosk-loop-bedroom', 'kiosk-loop-orangerie', 'kiosk-end']) assert.ok(preview.includes(`'${k}'`), k)
  for (const k of ['cats-friend', 'rehearsal']) assert.ok(preview.includes(`case '${k}'`), k)
  // D1-18, BK-7: the samples come from the open banks and say what the night says now
  assert.ok(preview.includes("from '../../seed/woof-news.json'") && preview.includes("from '../../seed/cat-lines.json'"), 'the previews import the open banks')
  assert.ok(!preview.includes('constable'), 'no struck-motives bulletin')
  assert.ok(!preview.includes('Not written yet'), 'no unwritten hint stand-in')
  assert.ok(!preview.includes('Irwin line two'), 'Sir Irwin has no secret middle line')
  assert.ok(preview.includes("Trusting Salem: Most days, he's got it backwards, so flip whatever he tells you. Win him over and he might set it straight. Only a true friend gets it right every time."), 'the new Trusting Salem line')
  assert.ok(!preview.includes('liking you does not make him right'), 'the old Trusting Salem line is gone')
  const kiosk = readFileSync(new URL('../src/screens/Kiosk.jsx', import.meta.url), 'utf8')
  // D1-18: the bulletin's struck list is gone from the card
  assert.ok(!kiosk.includes('struck.map') && !kiosk.includes('The constable has ruled out'), 'ScreenCard draws no struck list')
  // BK-15: the memory match's face-down cards are file folders, not a star (the match lives in Rooms.jsx since 23 Oct)
  const rooms = readFileSync(new URL('../src/screens/Rooms.jsx', import.meta.url), 'utf8')
  assert.ok(rooms.includes('<FolderBack />') && !rooms.includes('✦') && !kiosk.includes('✦'), 'the card backs are file folders')
  // CL-8: the rehearsal band on every room screen, hidden while the room is dark
  assert.ok(kiosk.includes('<RehearsalBand on={!!n && !dark && isRehearsalNight(n)} />'), 'the kiosk shows the band on a rehearsal night')
  for (const c of ['function Wake', 'function Bell', 'function StaleDot', 'function Board', 'function ScreenCard', 'function Captions', 'function DoorScreen', 'function OneMoment', 'function Dark']) assert.ok(kiosk.includes(c), c)
  assert.ok(kiosk.includes("which === 'ipad'"), 'the iPad alias')
  assert.ok(!kiosk.includes('—'), 'no em dash on a room screen')
  // the real W-O-O-F News lines, Sir Irwin's five motives and the memory match's twelve cards fit a
  // 16:9 TV and the iPad, REHEARSAL band included: their sizes are capped by the screen's height
  const fit = readFileSync(new URL('../src/styles.css', import.meta.url), 'utf8')
  for (const rule of [
    '.kiosk.card-screen .kiosk-lines .kiosk-line { font-size: min(3.8vw, 5.2vh); }',
    '.kiosk.irwin .kiosk-lines .kiosk-line { font-size: min(4.6vw, 4.2vh); }',
    '.kiosk.irwin .irwin-choices { font-size: min(3.4vw, 4vh);',
    '.kiosk.captions .kiosk-line { font-size: min(4.2vw, 5vh); }',
    '.memory-board { width: min(92vw, calc(88vh - var(--band-h))); }',
    '.reveal-row.count-3 .reveal-portrait { max-height: 8vh; }',
  ]) assert.ok(fit.includes(rule), rule)
  // the iPad heartbeats under its own key, never as the living room TV
  assert.ok(kiosk.includes('`kiosk-${which}`'), 'the heartbeat key is the kiosk name itself')
  assert.ok(!kiosk.includes("which === 'ipad' ? 'living'"), 'the iPad never borrows the TV key')
  // the wake control: a corner control that never shows while the room is dark
  assert.ok(kiosk.includes('<Wake hidden={dark} />'), 'the wake control is hidden while dark')
  assert.ok(kiosk.includes("window.addEventListener('pointerdown', wake)"), 'any tap on the page wakes the screen')
  const css = readFileSync(new URL('../src/styles.css', import.meta.url), 'utf8')
  const wake = css.split('\n').find(l => l.startsWith('.kiosk-wake {')) ?? ''
  assert.ok(wake, 'the wake style exists')
  assert.ok(!/inset:\s*0/.test(wake), 'the wake control is not a full-screen wall')
  assert.ok(/right:/.test(wake) && /bottom:/.test(wake), 'the wake control sits in a corner')
  assert.ok(!/brand-blue/.test(wake), 'the wake control is not a bright blue wall')
  // the hush line under the graph comes from the finale doc's spotlight
  assert.ok(kiosk.includes('hushLines(finale)'), 'the graph renders the spotlight lines')
  const main = readFileSync(new URL('../src/main.jsx', import.meta.url), 'utf8')
  assert.ok(main.includes('ipad'))
})
