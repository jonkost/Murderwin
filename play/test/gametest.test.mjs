import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  PRACTICE_DOCS, practiceParam, cleanName, savedName, saveName, NAME_KEY,
  salemPractice, practicePlayers, slipsSince, slipLine, SLIP_LINES,
  decodeSet, setFromAddress, encodeSet, SET_NOTES,
  clockSample, keepSample, CLOCK_KEEP_MS, practiceError, NO_ANSWER,
} from '../src/lib/gametest.js'
import { salemColourAt, SALEM_GRACE_MS } from '../src/lib/night.js'

// The pages the workshop's Game test tab opens (24 Oct 2026): the practice
// records' readers, the Parlour Game set in the address, and the guards that
// keep a practice off every night. Throwaway records made here, nothing printed.

const src = (p) => readFileSync(new URL(p, import.meta.url), 'utf8')
const SAMPLE = [{ q: 'Sample?', choices: [{ k: 'a', text: 'Yes' }, { k: 'b', text: 'No' }] }]

test('the address picks the practice page: Salem on a phone, his board on the brain, nothing else', () => {
  assert.equal(practiceParam('?practice=salem'), 'salem')
  assert.equal(practiceParam('?practice=boo'), null, 'the arcade practises on its own page')
  assert.equal(practiceParam('?kiosk=boo&practice=1'), null)
  assert.equal(practiceParam('?kiosk=orangerie&practice=1'), 'orangerie-wall', 'Salem\'s board on the brain\'s browser (31 Oct 2026)')
  assert.equal(practiceParam('?kiosk=pose&practice=1'), null, 'Boo\'s camera went (11 Nov 2026)')
  assert.equal(practiceParam('?kiosk=living&practice=1'), null, 'only the Orangerie has a practice screen')
  assert.equal(practiceParam('?kiosk=orangerie'), null, 'the night\'s Orangerie screen is not the practice')
  assert.equal(practiceParam('?kiosk=boo'), null, 'the night\'s Entryway screen is not a practice')
  assert.equal(practiceParam('?practice=study'), null)
  assert.equal(practiceParam(''), null)
  assert.deepEqual(PRACTICE_DOCS, { salem: 'public_state/game_test_salem' })
  for (const path of Object.values(PRACTICE_DOCS)) assert.ok(!path.startsWith('nights/'), 'a practice never follows a night')
})

test('the first name: cut to thirty, kept in the browser, and a refusing browser is no trouble', () => {
  assert.equal(cleanName('  Jon   Kost  '), 'Jon Kost')
  assert.equal(cleanName('x'.repeat(40)).length, 30)
  assert.equal(cleanName(null), '')
  const box = new Map()
  const storage = { getItem: k => box.get(k) ?? null, setItem: (k, v) => box.set(k, v) }
  assert.equal(savedName(storage), '')
  saveName(' Susan ', storage)
  assert.equal(box.get(NAME_KEY), 'Susan')
  assert.equal(savedName(storage), 'Susan')
  const refuses = { getItem: () => { throw new Error('private window') }, setItem: () => { throw new Error('full') } }
  assert.equal(savedName(refuses), '')
  assert.doesNotThrow(() => saveName('Jon', refuses))
})

test('Get Off My Lawn! practice: the record turns into the night\'s states, round by round', () => {
  assert.equal(salemPractice(null).status, 'none')
  assert.equal(salemPractice({}).status, 'none')
  const base = { runId: 'r1', round: 1, attempt: 0, flips: [], slips: 0, players: { u1: { name: 'Jon', at: 2 }, u2: { name: 'Susan', at: 1 } } }
  const open = salemPractice({ ...base, state: 'idle' }, 'u1')
  assert.equal(open.status, 'open')
  assert.equal(open.joined, true)
  assert.equal(open.game.state, 'intro', 'round one to come: Salem\'s welcome and Ready')
  assert.deepEqual(open.players.map(p => p.name), ['Susan', 'Jon'], 'in the order they joined')
  assert.equal(salemPractice({ ...base, state: 'idle' }, 'u9').joined, false)
  assert.equal(salemPractice({ ...base, state: 'idle', round: 2 }).game.state, 'passed', 'a round passed: the next to come')
  const flips = [{ at: 1000, colour: 'red' }, { at: 5000, colour: 'green' }]
  const playing = salemPractice({ ...base, state: 'playing', round: 3, attempt: 4, flips, startsAt: 1000, cleanAt: 31000, slips: 2, lastSlip: 'green' }).game
  assert.equal(playing.state, 'playing')
  assert.equal(salemColourAt(playing, 6000), 'green', 'the night\'s colour rule reads it as it is')
  assert.equal(playing.round, 3)
  assert.ok(SALEM_GRACE_MS[playing.round], 'a round the night knows')
  assert.equal(playing.lastSlip, 'green')
  assert.equal(salemPractice({ ...base, state: 'passed', round: 4 }).game.state, 'cleared', 'all three done')
  assert.equal(salemPractice({ ...base, state: 'passed', round: 4 }).game.round, 3)
  assert.equal(salemPractice({ ...base, state: 'done' }).status, 'closed')
  assert.equal(salemPractice({ ...base, state: 'playing', lastSlip: 'purple' }).game.lastSlip, null)
  assert.deepEqual(practicePlayers({ players: { a: { name: '' }, b: null, c: { name: 'Mari', at: 0 } } }).map(p => p.uid), ['c'])
})

test('a plain line for every slip seen while the page is open, and none for a fresh page or a new practice', () => {
  assert.equal(slipLine('green'), 'Someone moved on green. The round starts again.')
  assert.equal(slipLine('red'), SLIP_LINES.red)
  assert.equal(slipLine(null), SLIP_LINES.other)
  const a = { runId: 'r1', state: 'playing', round: 1, attempt: 2, slips: 1, lastSlip: 'red' }
  assert.deepEqual(slipsSince(null, a), [], 'the first reading lists nothing (the round\'s count shows anyway)')
  const b = { ...a, attempt: 3, slips: 2, lastSlip: 'green' }
  assert.deepEqual(slipsSince(a, b), [{ round: 1, colour: 'green', line: SLIP_LINES.green }])
  assert.deepEqual(slipsSince(b, { ...b }), [], 'the same reading twice')
  assert.deepEqual(slipsSince(b, { ...b, attempt: 4, slips: 0, round: 2 }), [], 'Ready starts a round with no slips')
  assert.deepEqual(slipsSince(b, { ...b, runId: 'r2', attempt: 9, slips: 5 }), [], 'a new practice')
  const two = slipsSince(a, { ...a, attempt: 4, slips: 3, lastSlip: 'red' })
  assert.deepEqual(two.map(s => s.colour), [null, 'red'], 'two slips between readings: only the last is known')
  for (const line of Object.values(SLIP_LINES)) assert.ok(!/—|\d/.test(line), 'plain words, no dash, no number')
})
test('a Parlour Game set in the address: three questions, two choices each, words only', () => {
  const set = { title: 'Breakfast “opinions” ☕', questions: [
    { q: 'Ice in orange juice?', a: 'Always', b: 'Never' },
    { q: 'Toast: cut', a: 'Squares', b: 'Triangles' },
    { q: 'Jam or marmalade?', a: 'Jam', b: 'Marmalade', av: 2, bv: -1, leans: { boo: 'a' } },
  ] }
  const code = encodeSet(set)
  assert.match(code, /^[A-Za-z0-9_-]+$/, 'base64url: safe in an address')
  const r = decodeSet(code)
  assert.equal(r.problem, null)
  assert.equal(r.set.title, 'Breakfast “opinions” ☕', 'curly quotes and a cup come through')
  assert.deepEqual(r.set.beats[0], { q: 'Ice in orange juice?', choices: [{ k: 'a', text: 'Always' }, { k: 'b', text: 'Never' }] })
  assert.deepEqual(Object.keys(r.set.beats[2]).sort(), ['choices', 'q'], 'no numbers, no lean, nothing but the words')
  assert.ok(!JSON.stringify(r.set).includes('leans'))
  // plain base64 with padding, or a '+' turned into a space by the address, still reads
  const plain = Buffer.from(JSON.stringify(set), 'utf8').toString('base64')
  assert.deepEqual(decodeSet(plain).set, r.set)
  assert.deepEqual(decodeSet(plain.replace(/\+/g, ' ')).set, r.set)
  assert.deepEqual(decodeSet(encodeSet({ title: 'x', beats: set.questions })).set.beats, r.set.beats, 'the workshop\'s own word for the list works too')

  const shown = setFromAddress(`?preview=questions&set=${code}`, SAMPLE)
  assert.equal(shown.sample, false)
  assert.equal(shown.beats.length, 3)
  assert.equal(shown.note, SET_NOTES.shown('Breakfast “opinions” ☕'))
  assert.match(shown.note, /Nothing is sent/)
})

test('a set that cannot be read, or is not ready, shows the sample and says why; no set, no line', () => {
  assert.deepEqual(setFromAddress('?preview=questions', SAMPLE), { beats: SAMPLE, title: null, note: null, sample: true })
  for (const bad of ['', '%%%', '!!!!', encodeSet('just words'), encodeSet({ questions: 'no' }), 'x'.repeat(9000)]) {
    const r = setFromAddress(`?preview=questions&set=${encodeURIComponent(bad)}`, SAMPLE)
    assert.equal(r.beats, SAMPLE)
    assert.equal(r.sample, true)
    assert.equal(r.note, SET_NOTES.unreadable)
  }
  const two = encodeSet({ title: 'Short', questions: [{ q: 'One?', a: 'Y', b: 'N' }, { q: 'Two?', a: 'Y', b: 'N' }] })
  const r2 = setFromAddress(`?set=${two}`, SAMPLE)
  assert.equal(r2.beats, SAMPLE)
  assert.equal(r2.note, SET_NOTES['not-ready'])
  const blank = encodeSet({ questions: [{ q: 'One?', a: 'Y', b: 'N' }, { q: 'Two?', a: 'Y', b: '  ' }, { q: 'Three?', a: 'Y', b: 'N' }] })
  assert.equal(decodeSet(blank).problem, 'not-ready', 'an answer left empty')
  for (const s of Object.values(SET_NOTES)) assert.ok(!(typeof s === 'string' && s.includes('—')), 'no em dash on screen')
})

test('the shared games: the night and the practice play the same component, and a practice never touches a night', () => {
  const act4 = src('../src/screens/Act4.jsx')
  const practice = src('../src/screens/Practice.jsx')
  const rooms = src('../src/screens/Rooms.jsx')
  const main = src('../src/main.jsx')
  assert.match(act4, /function SalemGame[\s\S]*?<SalemRounds /, 'the night plays SalemRounds')
  assert.ok(!/BooPoses|BooMoments|BooRunway|booMoment|PoseCamera/.test(act4 + rooms + practice + main), 'the old Entryway show and its camera are gone from the phones, the screens and the practices')
  assert.match(rooms, /export function BooRoom[\s\S]*?<BooArcade key=\{`\$\{held\.groupId\}-\$\{held\.startsAt\}`\} night=\{nightProps\} \/>/, 'the night\'s Entryway screen is the arcade, in its night mode')
  assert.match(practice, /<SalemRounds /)
  assert.match(rooms, /export function Orangerie[\s\S]*?<SalemBoard doc=\{salem\} names=\{groupNames\(rotation, salem\.groupId\)\} serverNow=\{serverNow\} \/>/, 'the night\'s Orangerie screen is SalemBoard while a group plays (31 Oct 2026)')
  assert.match(practice, /export function OrangeriePractice[\s\S]*?<SalemBoard key=\{p\.runId \?\? 'practice'\} doc=\{p\.game\} names=\{p\.players\.map\(x => x\.name\)\} serverNow=\{serverNow\} practice \/>/, 'the practice\'s board is the same component, on the practice record in the night\'s shape')
  assert.match(main, /'orangerie-wall': OrangeriePractice/, 'routed from ?kiosk=orangerie&practice=1')
  // the practice sends only through gameTest, reads only its own records, and its clock names no night
  assert.ok(!/nights\/|callSalem|callBooDone|callMeet|callJoin/.test(practice), 'no night, no night\'s calls')
  // the clock asks the gameTest function, and nothing writes presence/{uid}:
  // that row is the browser's, and a room screen in another tab is let in by it
  assert.ok(!/useServerClock|setDoc|'presence'|`presence|firebase\/firestore/.test(practice), 'a practice never writes presence or any doc')
  assert.match(practice, /callGameTest\(\{ command: 'clock' \}\)/)
  assert.equal((practice.match(/= usePracticeClock\(uid\)/g) ?? []).length, 2, 'both of Salem\'s practices measure the clock that way (his board since 31 Oct 2026)')
  assert.ok(!practice.includes('<Kiosk'), 'the practice wall is not a room screen')
  assert.match(main, /Practicing \? <Practicing \/> : kiosk \? <Kiosk which=\{kiosk\} \/>/, '?kiosk=boo&practice=1 is routed before the room screens')
  // the night's game still pays through its own calls
  assert.match(act4, /callSalemReady\(\{ nightId \}\)/)
  assert.match(act4, /callSalemSlip\(\{ nightId, attempt, colour \}\)/)
  assert.match(act4, /callSalemPassed\(\{ nightId, attempt, felt \}\)/, 'and says whether this phone can feel a shake (G58)')
  assert.match(rooms, /callArcadeClue\(\{ nightId, groupId: held\.groupId, place \}\)/, 'the Entryway screen asks the house for each player\'s clue (5 Nov 2026)')
  assert.match(rooms, /callArcadeScore\(\{ nightId, guestKey: key, game: rec\.game, score: rec\.score \}\)/, 'and sends each counted round\'s score')
  assert.ok(!/callBooDone|callPosePhoto/.test(act4 + rooms + src('../src/firebase.js')), 'the old show\'s call and the camera\'s are gone')
  // a preview's Parlour Game ends on Thanks and sends nothing
  const windows = src('../src/screens/Windows.jsx')
  assert.match(windows, /if \(nightId === 'preview'\) \{ setSent\(true\); return \}/)
})

test('Granolia speaks of a fifteen-minute round, warned at thirteen, and the Study\'s clocks are the round in the seed', () => {
  // lib/content.js reads a JSON file the browser's way, so its words are read here as text
  const content = src('../src/lib/content.js')
  const block = name => content.slice(content.indexOf(`export const ${name} = {`), content.indexOf('\n}\n', content.indexOf(`export const ${name} = {`)))
  const words = block('DEFAULT_STUDY_LINES') + block('DEFAULT_STATION_TEXT')
  assert.ok(words.length > 200)
  assert.ok(!/\bten minutes/i.test(words), 'no ten minutes')
  assert.ok(!/three minutes left/i.test(words))
  assert.match(words, /TIME: 'Two minutes left, dear\./)
  assert.match(words, /SLOW: '[^']*Fifteen minutes\.'/)
  const study = src('../../station/lib/study.js')
  // the round's length lives in the seed; a change there must reach the Study's clocks too (card 557)
  const round = JSON.parse(src('../../seed/night.json')).act4.roundMinutes
  assert.equal(round, 15)
  assert.match(study, new RegExp(`capMs: ${round} \\* 60_000`))
  assert.match(study, new RegExp(`warnMs: ${round - 2} \\* 60_000`))
  const house = src('../src/lib/house.js')
  assert.match(house, new RegExp(`STUDY_CAP_MS = ${round} \\* 60_000`))
  assert.match(house, new RegExp(`ABSENT_SLOT_MS = ${round} \\* 60_000`))
  // the stop before the round's end: the station and both clocks keep the one number
  assert.equal(house.match(/STUDY_STOP_EARLY_MS = ([\d_]+)/)[1], study.match(/STOP_EARLY_MS = ([\d_]+)/)[1])
})

test('the practice clock keeps the reading with the shortest round trip, and a fresh one after ten minutes', () => {
  assert.equal(clockSample(1000, 1200, 'x'), null)
  assert.equal(clockSample(1000, 900, 5000), null, 'a clock that ran backwards')
  const slow = clockSample(1000, 4000, 5000) // a cold start: three seconds
  assert.deepEqual(slow, { skew: 5000 - 2500, rtt: 3000, at: 4000 })
  const quick = clockSample(6000, 6100, 9050)
  assert.equal(keepSample(null, slow), slow)
  assert.equal(keepSample(slow, quick), quick, 'the quicker answer wins')
  assert.equal(keepSample(quick, clockSample(7000, 9000, 10000)), quick, 'a slower one later does not replace it')
  const late = clockSample(6000 + CLOCK_KEEP_MS + 1, 6000 + CLOCK_KEEP_MS + 3001, 0)
  assert.equal(keepSample(quick, late), late, 'after ten minutes any reading is fresher than the old one')
  assert.equal(keepSample(quick, null), quick, 'a failed call keeps the last')
})

test('a failed call on a practice phone says something plain, never a bare code', () => {
  for (const code of ['functions/internal', 'functions/unavailable', 'functions/deadline-exceeded', 'functions/unknown', '']) {
    assert.equal(practiceError({ code, message: code.replace('functions/', '') }), NO_ANSWER, code)
  }
  assert.equal(practiceError(null), NO_ANSWER)
  assert.equal(practiceError({ code: 'functions/not-found', message: 'not-found' }), NO_ANSWER, 'a function that is not there')
  assert.equal(practiceError({ code: 'functions/internal', message: 'Something broke on the Manor side. Try again.' }), NO_ANSWER)
  const full = '12 phones have joined already. That is the most for a practice.'
  assert.equal(practiceError({ code: 'functions/resource-exhausted', message: full }), full)
  assert.equal(practiceError({ code: 'functions/failed-precondition', message: 'The practice has stopped. Open it again on the Game test tab.' }), 'The practice has stopped. Open it again on the Game test tab.')
  // the HTTP status the Firebase library puts after the server's sentence never shows (lib/trouble.js, 29 Oct 2026)
  assert.equal(practiceError({ code: 'functions/permission-denied', message: 'Only the workshop can do that. [403]' }), 'Only the workshop can do that.')
  assert.equal(practiceError({ code: 'functions/resource-exhausted', message: `${full} [429]` }), full)
  assert.equal(practiceError({ code: 'functions/invalid-argument', message: 'Bad Request [400]' }), NO_ANSWER, 'the library\'s own words are not the server speaking')
  assert.equal(practiceError({ code: 'functions/internal', message: 'internal [0]' }), NO_ANSWER, 'a dropped connection')
  assert.equal(practiceError({ code: 'functions/unauthenticated', message: 'Sign in first. [401]' }), NO_ANSWER, 'the phone signs itself in; trying again is the answer')
  const practice = readFileSync(new URL('../src/screens/Practice.jsx', import.meta.url), 'utf8')
  assert.ok(!/e\?\.message/.test(practice), 'the page never shows the raw message')
  const lib = readFileSync(new URL('../src/lib/gametest.js', import.meta.url), 'utf8')
  assert.ok(lib.includes('return troubleLine(e, NO_ANSWER)') && !/\.message\b/.test(lib), 'the same rule as the night\'s screens, with the practice\'s own words')
})
