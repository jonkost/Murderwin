import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  livingView, roomDark, captionsOf, doorStage, doorSlideOf, slideAt, slideTime, castOf, castRows, voteCount, bellShown, soundFresh, dotState, heardText, showSetup, relayRules, showRules,
  DEFAULT_RELAY_RULES, BELL_MS, DOOR_HOLD_MS, SLIDE_FALLBACK_MS,
} from '../src/lib/screen.js'
import { STALE_MS } from '../src/lib/clock.js'

// The room screens' pure rules. Fixtures are throwaway shapes, never content.

const stamp = (t) => ({ toMillis: () => t })
const NOW = 20_000_000
const NIGHT = { act: 2, beat: 'news', phase: 'act', roster: { jon: { name: 'Jon', characterId: 'prof-jonathan' }, jessa: { name: 'Jessa', characterId: 'rye' } } }

test('the living room: the phase wins, then the finale, the vote, a drawing, the votes are in, Talk it over, the door, a card, idle', () => {
  assert.equal(livingView({ night: { ...NIGHT, phase: 'blackout' }, screen: { kind: 'news' } }), 'dark')
  assert.equal(livingView({ night: { ...NIGHT, phase: 'prompt' }, screen: { kind: 'news' } }), 'dark')
  assert.equal(livingView({ night: { ...NIGHT, phase: 'paused' }, screen: { kind: 'news' } }), 'paused')
  assert.equal(livingView({ night: NIGHT, screen: { kind: 'black', title: 'One moment' } }), 'paused')
  assert.equal(livingView({ night: NIGHT, screen: { kind: 'black', title: '' } }), 'dark')
  // the ending (11 Nov 2026): Talk it over, the vote, the votes are in, then the reveal's reel
  const done = { state: 'done', doorOpen: true }
  const talk = { ...NIGHT, act: 6, beat: 'talk', window: { kind: 'questions', settled: true } }
  const vote = { ...NIGHT, act: 7, beat: 'ballot' }
  assert.equal(livingView({ night: talk, relay: done, screen: { kind: 'talk' } }), 'talk', 'Talk it over beats the open door')
  assert.equal(livingView({ night: { ...talk, phase: 'paused' }, relay: done, screen: { kind: 'talk' } }), 'paused', 'the pause still wins')
  assert.equal(livingView({ night: { ...vote, window: { kind: 'ballot', settled: false } }, relay: done, screen: { kind: 'vote' } }), 'ballot')
  assert.equal(livingView({ night: { ...vote, window: { kind: 'ballot', settled: false } }, relay: done, screen: { kind: 'talk' } }), 'ballot', 'the open vote shows whatever the screen doc still says')
  assert.equal(livingView({ night: { ...vote, window: { kind: 'questions', settled: true } }, relay: done, screen: { kind: 'vote' } }), 'ballot', 'between the beat and its window: the vote with no clock yet, never the door again')
  assert.equal(livingView({ night: { ...vote, window: { kind: 'ballot', settled: true } }, relay: done, screen: { kind: 'vote' } }), 'voted', 'the vote has closed: not the door, not the vote')
  assert.equal(livingView({ night: { ...vote, window: { kind: 'ballot', settled: true } }, relay: null, screen: { kind: 'vote' } }), 'voted', 'with the drawing cut too')
  assert.equal(livingView({ night: { ...vote, beat: 'reveal', window: { kind: 'ballot', settled: true } }, relay: done, finale: { at: 1 }, screen: { kind: 'vote' } }), 'finale')
  assert.equal(livingView({ night: { ...NIGHT, act: 7 }, finale: { at: 1 }, screen: { kind: 'vote' } }), 'finale')
  // the iPad (words only) never shows the questions or the votes-are-in card: its words, or its crest; the open vote's clock it does show, as before
  assert.equal(livingView({ night: talk, relay: done, screen: { kind: 'talk' }, captionsOnly: true }), 'idle')
  assert.equal(livingView({ night: { ...vote, window: { kind: 'ballot', settled: true } }, relay: done, screen: { kind: 'vote' }, captionsOnly: true }), 'idle')
  assert.equal(livingView({ night: { ...vote, window: { kind: 'ballot', settled: false } }, relay: done, screen: { kind: 'vote' }, captionsOnly: true }), 'ballot')
  for (const state of ['walk', 'turn', 'vote', 'lockout']) assert.equal(livingView({ night: NIGHT, relay: { state }, screen: { kind: 'news' } }), 'relay')
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

test('Talk it over: everyone at the party under the three questions, by name, as the character they play; one row up to eight, two beyond', () => {
  const names = ['Ivy', 'Ana', 'Hal', 'Ben', 'Gus', 'Cal', 'Fay', 'Dee', 'Eve']
  const roster = Object.fromEntries(names.map((n, i) => [n.toLowerCase(), { name: n, characterId: i % 2 ? 'rye' : 'arms', bag: i + 1 }]))
  const characters = [{ id: 'rye', name: 'Dorothy Rye' }, { id: 'arms', name: 'Roger Arms' }]
  const cast = castOf({ night: { roster }, characters })
  assert.equal(cast.length, 9)
  assert.deepEqual(cast.map(p => p.name), [...names].sort(), 'by name: the order says nothing')
  for (const p of cast) {
    assert.deepEqual(Object.keys(p).sort(), ['characterId', 'characterName', 'key', 'name'], 'who they are and who they play, nothing else (no bag, no role)')
    assert.ok(p.characterName === 'Dorothy Rye' || p.characterName === 'Roger Arms')
  }
  // a character the content does not carry still gets a place, by the guest's name
  assert.deepEqual(castOf({ night: { roster: { x: { name: 'X', characterId: 'unknown' } } } }), [{ key: 'x', name: 'X', characterId: 'unknown', characterName: '' }])
  assert.deepEqual(castOf({}), [])
  // the rows: everyone on one line up to eight; nine or more on two, the longer one on top
  assert.deepEqual(castRows(0), [0])
  assert.deepEqual(castRows(3), [3])
  assert.deepEqual(castRows(8), [8])
  assert.deepEqual(castRows(9), [5, 4])
  assert.deepEqual(castRows(14), [7, 7])
  for (let n = 1; n <= 14; n++) assert.equal(castRows(n).reduce((a, b) => a + b, 0), n, `everyone has a place at ${n}`)
})

test('the vote on the TV: a count of the seats locked in, never who and never what', () => {
  const roster = { a: { name: 'A' }, b: { name: 'B' }, c: { name: 'C' } }
  assert.equal(voteCount({ roster }), null, 'no window')
  assert.equal(voteCount({ roster, window: { kind: 'questions', of: 3, answered: 1 } }), null, 'a Parlour Game is not the vote')
  assert.deepEqual(voteCount({ roster, window: { kind: 'ballot', of: 3 } }), { n: 0, of: 3 })
  assert.deepEqual(voteCount({ roster, window: { kind: 'ballot', of: 3, answered: 2 } }), { n: 2, of: 3 })
  assert.deepEqual(voteCount({ roster, window: { kind: 'ballot', of: 3, answered: 9 } }), { n: 3, of: 3 }, 'never more than the seats')
  assert.deepEqual(voteCount({ roster, window: { kind: 'ballot', answered: 1 } }), { n: 1, of: 3 }, 'an older window has no count of seats: the roster stands in')
  assert.deepEqual(Object.keys(voteCount({ roster, window: { kind: 'ballot', of: 3, answered: 2, settled: true } })), ['n', 'of'])
  // the TV draws it as one seal a seat and the count in words; nothing that reads as holding the room up (F09)
  const kiosk = readFileSync(new URL('../src/screens/Kiosk.jsx', import.meta.url), 'utf8')
  assert.ok(kiosk.includes('`${n} of ${count.of} locked in`'), 'the count in words')
  assert.ok(kiosk.includes('The votes are in.'), 'the card once the vote has closed')
  for (const c of ['export function TalkScreen', 'export function VoteScreen', 'export function VotedScreen', 'function VoteSeals', 'function CastFigure']) assert.ok(kiosk.includes(c), c)
  assert.ok(kiosk.includes("if (view === 'talk') return <TalkScreen night={night} screen={screen} content={content} />"))
  assert.ok(kiosk.includes("if (view === 'voted') return <VotedScreen night={night} />"))
  assert.ok(kiosk.includes("if (view === 'ballot') return <VoteScreen night={night} screen={screen} trace={trace} serverNow={serverNow} captionsOnly={captionsOnly} />"))
  const ending = kiosk.slice(kiosk.indexOf('// ---- the ending'), kiosk.indexOf('// ---- the three corners'))
  assert.ok(ending.length > 1000, 'the ending\'s screens are read')
  assert.ok(!/\.roles?\b|defaulted|murderer|victim|\.ballot\b|\bpicks?\b/i.test(ending.replace(/\/\/.*$/gm, '').replace(/\{\/\*[\s\S]*?\*\/\}/g, '')), 'the TV reads no pick, no role and nobody\'s ballot')
  // the three questions: the same words as the server writes on the screen doc
  const server = readFileSync(new URL('../../functions/lib/screen.js', import.meta.url), 'utf8')
  for (const src of [kiosk, server]) assert.ok(src.includes("THREE_QUESTIONS = ['Who did it?', 'Why?', 'Who is the Ghost?']"))
  // their sizes are capped by the screen's height, so nine figures and the questions fit a 16:9 TV
  const css = readFileSync(new URL('../src/styles.css', import.meta.url), 'utf8')
  for (const rule of [
    '.three-questions li { font-family: var(--serif); font-weight: 600; font-size: min(5.6vw, 9.5vh);',
    '.cast-figure { position: relative; display: block; width: 100%; height: min(40vh, 22vw); }',
    '.kiosk.talk-screen.rows-2 .cast-figure { height: min(23vh, 19vw); }',
    '.vote-seals li { width: min(4.6vw, 7.6vh); height: min(4.6vw, 7.6vh);',
    '.kiosk.ballot-screen .trace.compact .trace-frame { width: 30vh; height: 30vh; }',
  ]) assert.ok(css.includes(rule), rule)
  assert.ok(!/board-rows|\.kiosk\.board\b/.test(css), 'the board\'s styles went with it')
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

test('F31 no setup words in front of the guests (Jon, 29 Oct 2026): the dot and the wake note on a rehearsal and with no night live, never on the party night', () => {
  // the party night: the workshop's "This is the party night" box (forceRehearsal false), and not a dry run
  const party = { ...NIGHT, forceRehearsal: false }
  assert.equal(showSetup(party), false, 'the party night: no dot, no wake note')
  assert.equal(showSetup({ ...party, act: 7, beat: 'end', over: true }), false, 'nor at The End')
  // every rehearsal keeps them: the party box unticked (forceRehearsal true, or never written), or a fake-players dry run
  assert.equal(showSetup({ ...NIGHT, forceRehearsal: true }), true)
  assert.equal(showSetup(NIGHT), true, 'no box written: a rehearsal')
  assert.equal(showSetup({ ...party, dryRun: true }), true, 'a dry run is never the party')
  // no night live: the screens are being set up
  assert.equal(showSetup(null), true)
  assert.equal(showSetup(undefined), true)
  // a screen still looking for its night (just loaded) shows neither, so one reloaded during the party never flashes them
  assert.equal(showSetup(party, { looked: false }), false)
  assert.equal(showSetup(NIGHT, { looked: false }), false)
  assert.equal(showSetup(null, { looked: false }), false)
  assert.equal(showSetup(NIGHT, { looked: true }), true)
  // the kiosk draws no dot at all, and the wake note goes while its listener stays, so the first tap still wakes the sound
  const kiosk = readFileSync(new URL('../src/screens/Kiosk.jsx', import.meta.url), 'utf8')
  assert.ok(kiosk.includes('const looked = uid ? active.loaded && (!nightId || night.loaded) : !!signInError'), 'looked: signed in and the night read, or the sign-in failed')
  assert.ok(kiosk.includes('const setup = showSetup(n, { looked })'))
  assert.ok(kiosk.includes('{setup && <StaleDot view={night} online={online} />}'), 'no dot on the party night')
  assert.ok(kiosk.includes('<Wake hidden={dark || !setup} woke={sound} />'), 'no wake note on the party night, nor in the dark')
  const wake = kiosk.slice(kiosk.indexOf('export function Wake('), kiosk.indexOf('export function Bell('))
  assert.ok(wake.indexOf("window.addEventListener('pointerdown', wake)") >= 0 && wake.indexOf("window.addEventListener('pointerdown', wake)") < wake.indexOf('if (woke || hidden) return null'), 'the listener is set whether or not the note shows')
  assert.ok(wake.includes('}, [known, own])') && !/\}, \[[^\]]*hidden[^\]]*\]\)/.test(wake), 'hiding the note never takes the listener away')
  // on a room screen the page itself listens (useScreenSound, 11 Nov 2026), always, so the first tap wakes the sound whatever shows
  const listens = kiosk.slice(kiosk.indexOf('export function useScreenSound('), kiosk.indexOf('const KIOSK_SOUNDS'))
  assert.ok(listens.includes('for (const e of WAKE_EVENTS) window.addEventListener(e, wake)') && listens.includes('}, [])'), 'the page listens from its first moment to its last')
  // a finger going down is not a tap to a browser; lifting it is (an iPad would never get its sound on the press alone)
  for (const e of ['pointerup', 'touchend', 'click', 'keydown']) assert.ok(kiosk.includes(`'${e}'`) && /const WAKE_EVENTS = \[[^\]]*\]/.exec(kiosk)[0].includes(`'${e}'`), `${e} wakes the sound`)
  // the bell is not a setup mark: it shows on every night (and since 11 Nov 2026 it is the screen's cue player too)
  assert.ok(kiosk.includes("<Bell sounds={sounds} serverNow={serverNow} silent={which === 'decor'} tv={which === 'living'} scope={nightId} />"), 'the bell on every night')
})

test('F31 nothing in the corners beside a near-black screen, the bell ringing or not (29 Oct 2026)', () => {
  // it was a dim note and a dim dot (opacity 0.35, which beat the bell's own 0) through the blackout, the role cards, a pause and The End
  const css = readFileSync(new URL('../src/styles.css', import.meta.url), 'utf8')
  assert.ok(css.includes('.kiosk.dark ~ .kiosk-dot, .kiosk.dark ~ .kiosk-bell, .kiosk.dark ~ .kiosk-wake { display: none; }'), 'all three gone in the dark')
  assert.ok(!/\.kiosk\.dark ~ [^{]*\{[^}]*opacity/.test(css), 'never a dim mark left in the dark')
  // the rule finds them because the corners come after the screen, and both near-black screens carry .kiosk.dark
  const kiosk = readFileSync(new URL('../src/screens/Kiosk.jsx', import.meta.url), 'utf8')
  const from = kiosk.indexOf('      {body}\n      {!dark')
  const corners = kiosk.slice(from, kiosk.indexOf('</>', from))
  const at = (t) => { const i = corners.indexOf(t); assert.ok(i >= 0, t); return i }
  for (const mark of ['<Bell ', '<StaleDot ', '<Wake ']) assert.ok(at('{body}') < at(mark), `${mark.trim()} after the screen`)
  assert.ok(kiosk.includes('<div className="kiosk dark" aria-label="Sirwin Manor" />'), 'the dark')
  assert.ok(kiosk.includes('<div className="kiosk dark paused">'), 'the pause card')
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
  for (const k of ['kiosk-news', 'kiosk-bulletin', 'kiosk-irwin', 'kiosk-black', 'kiosk-ipad', 'kiosk-living-done', 'kiosk-living-hold', 'kiosk-finale-leadin', 'host-house-act2',
    // the ending (11 Nov 2026): Talk it over with four, nine and fourteen at the party, the vote, the votes are in
    'kiosk-talk', 'kiosk-talk-4', 'kiosk-talk-14', 'kiosk-ballot', 'kiosk-ballot-no-trace', 'kiosk-voted',
    // the cue list's screens (25 Oct 2026): the join and rejoin codes, the four room codes, the four rules cards and Boo's arcade (5 Nov 2026), the birthday card, every loop slot, The End
    'kiosk-join', 'kiosk-rejoin', 'kiosk-code-study', 'kiosk-code-library', 'kiosk-code-entryway', 'kiosk-code-orangerie',
    'kiosk-rules-study', 'kiosk-rules-library', 'kiosk-rules-entryway', 'kiosk-boo', 'kiosk-rules-orangerie', 'kiosk-birthday',
    'kiosk-loop-living', 'kiosk-loop-ipad', 'kiosk-loop-study', 'kiosk-loop-memory', 'kiosk-loop-boo', 'kiosk-loop-bedroom', 'kiosk-loop-orangerie', 'kiosk-end']) assert.ok(preview.includes(`'${k}'`), k)
  for (const k of ['cats-friend']) assert.ok(preview.includes(`case '${k}'`), k)
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
  // CL-8 (changed 11 Nov 2026): no REHEARSAL band on a room screen; a rehearsal looks like the party night
  assert.ok(!kiosk.includes('RehearsalBand'), 'no band on a room screen')
  for (const c of ['function Wake', 'function Bell', 'function StaleDot', 'function TalkScreen', 'function VoteScreen', 'function ScreenCard', 'function Captions', 'function DoorScreen', 'function OneMoment', 'function Dark']) assert.ok(kiosk.includes(c), c)
  assert.ok(!kiosk.includes('function Board') && !preview.includes('kiosk-board'), 'the board went with the round that filled it (11 Nov 2026)')
  assert.ok(kiosk.includes("which === 'ipad'"), 'the iPad alias')
  assert.ok(!kiosk.includes('—'), 'no em dash on a room screen')
  // the real W-O-O-F News lines, Sir Irwin's five motives and the memory match's boards (measured in the room left, 26 Oct 2026) fit a
  // 16:9 TV and the iPad, REHEARSAL band included: their sizes are capped by the screen's height
  const fit = readFileSync(new URL('../src/styles.css', import.meta.url), 'utf8')
  for (const rule of [
    '.kiosk.card-screen .kiosk-lines .kiosk-line { font-size: min(3.8vw, 5.2vh); }',
    '.kiosk.irwin .kiosk-lines .kiosk-line { font-size: min(4.6vw, 4.2vh); }',
    '.kiosk.irwin .irwin-choices { font-size: min(3.4vw, 4vh);',
    '.kiosk.captions .kiosk-line { font-size: min(4.2vw, 5vh); }',
    '.kiosk.memory { height: calc(100vh - var(--band-h)); height: calc(100dvh - var(--band-h)); min-height: 0; }',
    '.memory-fit { flex: 1 1 0; min-height: 0; width: 100%; container-type: size;',
    '.reveal-row.count-3 .reveal-portrait { max-height: 8vh; }',
  ]) assert.ok(fit.includes(rule), rule)
  // the iPad heartbeats under its own key, never as the living room TV
  assert.ok(kiosk.includes('`kiosk-${which}`'), 'the heartbeat key is the kiosk name itself')
  assert.ok(!kiosk.includes("which === 'ipad' ? 'living'"), 'the iPad never borrows the TV key')
  // the wake control: a corner control that never shows while the room is dark, nor on the party night (29 Oct 2026)
  assert.ok(kiosk.includes('<Wake hidden={dark || !setup} woke={sound} />'), 'the wake control is hidden while dark and on the party night')
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
