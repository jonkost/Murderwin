import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import gameNames from '../../seed/game-names.json' with { type: 'json' }
import {
  SECTIONS, SECTION_KEYS, DEVICES, tryWords, playUrl, queryOf, base64url, setOf, setParam, parlourSets,
  nightStrip, nightOff, actWords, BOX_TICKED, LIVE_IS_PARTY, LIVE_IS_REHEARSAL, ACT4_NEEDS_TWO, ROLE_CARD_FIRST, TICK_AGAIN, PARTY_DAY,
  salemView, booView, dayWords, whenWords, stewardTask,
  firstWords, gameTestCards, nextOrder, feedbackTask, chipOf, sentLine, openNotesText, FIRST_ORDER,
} from '../src/lib/gameTest.js'
import { MOMENT_KEYS, ownerOf, taskWhen } from '../src/lib/timeline.js'
import { decodeSet } from '../../play/src/lib/gametest.js'

// The Game test tab, tested through its pure helpers (the page is JSX and
// renders in the browser; a preview check covers it), plus a read of the
// sources for the rail, the routes and the roads the page may use.

const here = dirname(fileURLToPath(import.meta.url))
const src = p => readFileSync(join(here, '..', 'src', p), 'utf8')
const playSrc = p => readFileSync(join(here, '..', '..', 'play', 'src', p), 'utf8')
const decode = s => JSON.parse(Buffer.from(s, 'base64url').toString('utf8'))
const BASE = 'https://murderwin-at-sirwin-manor.web.app/play/'

test('eight sections in the order of the night, each named, filed under a real moment, with three to five steps', () => {
  // Miss Boo LaRue's Arcade (28 Oct 2026) sits beside Boo's Catwalk, under the Entryway's moment
  assert.deepEqual(SECTION_KEYS, ['study', 'memory', 'salem', 'boo', 'arcade', 'parlour', 'drawing', 'deduction'])
  const named = Object.fromEntries(gameNames.games.map(g => [g.id, g.name]))
  assert.deepEqual(SECTIONS.map(s => s.name), [
    named.study, named.library, named.orangerie, named.entryway, 'Miss Boo LaRue’s Arcade', 'The Parlour Games', named.drawing, 'The deduction round',
  ])
  assert.deepEqual(SECTIONS.map(s => s.moment), ['act4.study', 'act4.puzzle', 'act4.orangerie', 'act4.entryway', 'act4.entryway', 'act2.parlour', 'act6.drawing', 'act6.eliminate'])
  for (const s of SECTIONS) {
    assert.ok(MOMENT_KEYS.includes(s.moment), `${s.key}: ${s.moment} is a row on the Timeline`)
    assert.ok(s.steps.length >= 3 && s.steps.length <= 5, `${s.key}: 3 to 5 steps`)
    assert.ok(s.what && s.where, `${s.key}: what it is and where`)
    assert.ok(s.devices.length && s.devices.every(d => DEVICES[d]), `${s.key}: the feedback box's screens`)
    for (const t of s.tries) assert.ok(DEVICES[t.device], `${s.key}: ${t.label} says which device`)
  }
})

test('every sample screen named here exists on the phones, and the practices and the real game have their addresses', () => {
  const preview = playSrc('Preview.jsx')
  const names = SECTIONS.flatMap(s => s.tries.map(t => t.params.preview).filter(Boolean))
  // 26, plus the host's two drawing screens (At the paper, the four names) from the cue list, 25 Oct 2026, Boo's whole show, 27 Oct,
  // and the arcade's three, 28 Oct: a player's clue, a trio's third player, the chime
  assert.equal(names.length, 32)
  for (const n of [...names, 'questions']) {
    assert.ok(new RegExp(`['"]${n}['"]|\\b${n.replace(/-/g, '\\-')}: \\{`).test(preview), `?preview=${n} is in play/src/Preview.jsx`)
  }
  const queries = SECTIONS.flatMap(s => s.tries.map(t => queryOf(t.params)))
  for (const q of ['?kiosk=memory&play=1', '?practice=salem', '?kiosk=boo&practice=1', '?practice=boo', '?kiosk=living', '?kiosk=bedroom', '?kiosk=boo&play=1', '?kiosk=boo&play=1&visit=1']) {
    assert.ok(queries.includes(q), q)
  }
  // the drawing's previews, in the order the contract lists them; since 25 Oct 2026 (the cue list) the
  // host's own phone follows each walk and each guess: At the paper, then the four names as buttons
  const drawing = SECTIONS.find(s => s.key === 'drawing').tries.map(t => t.params.preview).filter(Boolean)
  assert.deepEqual(drawing, ['kiosk-living-rules', 'kiosk-relay-called', 'kiosk-relay-square', 'kiosk-relay-guess', 'kiosk-living-hold', 'kiosk-living-done',
    'relay-walk', 'relay-walk-host', 'relay-draw', 'relay-turn', 'relay-vote', 'relay-vote-host', 'relay-done', 'door', 'kiosk-bedroom-closed', 'kiosk-bedroom-1'])
  // only the two room screens a test night needs follow a night; everything else is a sample or a practice
  const night = SECTIONS.flatMap(s => s.tries.filter(t => t.night).map(t => queryOf(t.params)))
  assert.deepEqual(night, ['?kiosk=living', '?kiosk=bedroom'])
  for (const t of SECTIONS.flatMap(s => s.tries)) {
    if (t.night) continue
    assert.ok(t.params.preview || t.params.practice || t.params.play === '1', `${t.label} never follows a night`)
  }
})

test('the words Jon sees are plain: no engineer words, no long dashes', () => {
  const shown = [
    ...Object.values(DEVICES),
    ...SECTIONS.flatMap(s => [s.name, s.where, s.what, s.note, s.ready, ...s.steps, ...s.tries.map(t => t.label)]),
  ].filter(Boolean).join(' \n ')
  for (const w of [/\bnpm\b/i, /\.env\b/, /\bkiosk\b/i, /\bdeploy/i, /\brepo\b/i, /\bseed\b/i, /stand-in/i, /\bpreview\b/i, /\bterminal\b/i, /—/]) {
    assert.ok(!w.test(shown), `no ${w}`)
  }
  assert.equal(tryWords('phone'), 'Try it on your phone')
  // 26 Oct 2026, Jon's key: the memory match is on the iPad Pro; the older iPad is out (olderIpad)
  assert.equal(tryWords('ipadpro'), 'Try it on the iPad Pro')
  assert.ok(!/older iPad/.test(tryWords('ipad')), 'no device sends Jon to the older iPad')
  assert.equal(tryWords('tv'), 'Try it on the Parlour TV computer')
  assert.equal(tryWords('deck'), 'Try it on a Mac with the Stream Deck + XL')
  assert.equal(tryWords('nope'), 'Try it somewhere else')
})

// 28 Oct 2026: the arcade is built to try, and the night still plays the
// Catwalk until Jon answers the decision card entrywayGame.
test('Miss Boo LaRue’s Arcade: right after Boo’s Catwalk, on its own page in Chrome, never a night, and not on the night yet', () => {
  const arcade = SECTIONS.find(s => s.key === 'arcade')
  assert.equal(SECTION_KEYS.indexOf('arcade'), SECTION_KEYS.indexOf('boo') + 1, 'beside the Catwalk, which stays')
  assert.deepEqual(arcade.devices, ['deck', 'projector'])
  assert.deepEqual(arcade.tries.map(t => queryOf(t.params)), [
    '?kiosk=boo&play=1', '?kiosk=boo&play=1&visit=1', '?preview=kiosk-arcade-clue', '?preview=kiosk-arcade-third', '?preview=kiosk-arcade-farewell',
  ])
  assert.ok(arcade.tries.every(t => !t.night && (t.key || t.params.preview)), 'no try follows a night, and each has a key for the list')
  assert.match(arcade.where, /not on the night yet/)
  assert.match(arcade.note, /not on the night yet/i)
  assert.match(arcade.note, /entrywayGame/, 'the note names the question')
  assert.match(arcade.steps.join(' '), /Google Chrome/, 'Safari has no way to the Stream Deck')
  assert.match(arcade.steps.join(' '), /Quit the Stream Deck app/)
  // 29 Oct 2026, the review: through a HomePod the sounds lag two seconds, and one arcade tab
  // holds the deck at a time, so the visit starts from free play's own button
  assert.match(arcade.steps[0], /sound output to its own speakers/)
  const visit = arcade.steps.find(s => s.startsWith('For a group’s visit'))
  assert.match(visit, /tap Practise a group’s visit at the bottom of the free play page, or close the free play tab/)
  assert.ok(playSrc('screens/Arcade.jsx').includes("Practise a group's visit"), 'the button the step names is on the page')
  assert.match(visit, /the last game is shorter when time runs short/, 'two minutes a game, but not past the chime')
})

test('addresses: on top of the play page, with or without a query already there', () => {
  assert.equal(playUrl(BASE, { preview: 'kiosk-study' }), `${BASE}?preview=kiosk-study`)
  assert.equal(playUrl(BASE, { kiosk: 'memory', play: '1' }), `${BASE}?kiosk=memory&play=1`)
  assert.equal(playUrl(`${BASE}?x=1`, { practice: 'boo' }), `${BASE}?x=1&practice=boo`)
  assert.equal(playUrl(BASE, {}), BASE)
  assert.equal(queryOf({ kiosk: 'boo', practice: '1' }), '?kiosk=boo&practice=1')
  assert.equal(queryOf({}), '')
})

test('a Parlour Game set travels as base64url JSON: the three questions and two choices, never a point', () => {
  const beats = [
    { q: 'Ice in orange juice?', n: 2, a: 'Always', av: 3, b: 'Never', bv: -2 },
    { q: ' Pick a sock ', n: 3, a: 'Left', av: 1, b: 'Right ', bv: 0, c: 'Neither', cv: 4 },
    { q: 'A pigeon’s tiny hat, café-style', a: 'Trust it', b: 'Do not' },
  ]
  const p = setParam(beats)
  assert.match(p, /^[A-Za-z0-9_-]+$/, 'url-safe, no padding')
  const set = decode(p)
  assert.deepEqual(set, {
    title: 'Ice in orange juice?',
    questions: [
      { q: 'Ice in orange juice?', a: 'Always', b: 'Never' },
      { q: 'Pick a sock', a: 'Left', b: 'Right' },
      { q: 'A pigeon’s tiny hat, café-style', a: 'Trust it', b: 'Do not' },
    ],
  })
  assert.ok(!/"[a-d]v"|lean|cat/i.test(JSON.stringify(set)), 'no points, no lean, no cat')
  assert.deepEqual(setOf(null).questions, [{ q: '', a: '', b: '' }, { q: '', a: '', b: '' }, { q: '', a: '', b: '' }], 'odd data still makes three')
  assert.equal(Buffer.from(base64url('Boo’s “line” ✓'), 'base64url').toString('utf8'), 'Boo’s “line” ✓')
  // the phone's sample screen reads it back (play/src/lib/gametest.js)
  const shown = decodeSet(p)
  assert.equal(shown.problem, null)
  assert.equal(shown.set.title, 'Ice in orange juice?')
  assert.deepEqual(shown.set.beats.map(x => [x.q, ...x.choices.map(c => c.text)]), set.questions.map(x => [x.q, x.a, x.b]))
  assert.equal(decodeSet(setParam([{ q: 'Half written?', a: '', b: '' }])).problem, 'not-ready', 'an unfinished set falls back to the sample')
})

test('the bank: removed sets skipped, oldest first, numbered, each with its own sample address', () => {
  const items = [
    { id: 'b', order: 2, beats: [{ q: 'Second?', a: 'A', b: 'B' }] },
    { id: 'gone', order: 1, deleted: true, beats: [{ q: 'Gone?', a: 'A', b: 'B' }] },
    { id: 'a', order: 0, beats: [{ q: 'First?', a: 'Yes', b: 'No' }] },
    { id: 'c', order: 3, text: 'Kept name', beats: [] },
  ]
  const sets = parlourSets(items, BASE)
  assert.deepEqual(sets.map(s => [s.n, s.id, s.title]), [[1, 'a', 'First?'], [2, 'b', 'Second?'], [3, 'c', 'Kept name']])
  const url = new URL(sets[0].url)
  assert.equal(url.searchParams.get('preview'), 'questions')
  assert.equal(decode(url.searchParams.get('set')).questions[0].q, 'First?')
  assert.deepEqual(parlourSets(null, BASE), [])
})

test('the test night strip: which night is running, and every button off with the reason while the party is near', () => {
  assert.equal(nightStrip({ game: null, live: undefined }).kind, 'reading')
  assert.equal(nightOff(nightStrip({ game: null, live: undefined })), '…')
  const failed = nightStrip({ game: {}, live: undefined, failed: true })
  assert.equal(failed.kind, 'unknown')
  assert.ok(!failed.canStart && !failed.canMove && !failed.canParlour)

  const none = nightStrip({ game: {}, live: { nightId: null, night: null } })
  assert.equal(none.kind, 'none')
  assert.equal(none.line, 'No night is running.')
  assert.ok(none.canStart && !none.canMove && !none.canParlour)
  assert.equal(nightOff(none), null)
  assert.equal(nightStrip({ game: {}, live: { nightId: 'gone', night: null } }).kind, 'none', 'a live id with no night doc')

  const test0 = nightStrip({ game: {}, live: { nightId: 'n', night: { act: 0, phase: 'lobby', forceRehearsal: true, gameTest: true } } })
  assert.equal(test0.kind, 'test')
  assert.equal(test0.line, 'A test night is running: the doors are open and Act 1 has not started.')
  assert.ok(test0.canStart && test0.canMove && !test0.canParlour)
  assert.equal(test0.hint, 'Parlour Game now works in Acts 2, 4 and 6.')
  assert.deepEqual(test0.notes, [ACT4_NEEDS_TWO, ROLE_CARD_FIRST], 'Act 4 needs two phones; the role card comes first')
  assert.deepEqual(none.notes, [ACT4_NEEDS_TWO, ROLE_CARD_FIRST])
  for (const act of [2, 4, 6]) assert.ok(nightStrip({ game: {}, live: { nightId: 'n', night: { act, forceRehearsal: true, gameTest: true } } }).canParlour, `Act ${act}`)
  const four = nightStrip({ game: { party_night: false }, live: { nightId: 'n', night: { act: 4, phase: 'act', forceRehearsal: true, gameTest: true } } })
  assert.equal(four.line, 'A test night is running: Act 4, Behind Closed Doors.')
  assert.equal(four.act, 4)
  assert.equal(actWords({ act: 6, phase: 'paused' }), 'Act 6, The Final Hour, paused')
  assert.equal(actWords({ act: 1, phase: 'blackout' }), 'Act 1, The Invitation, in the blackout')

  const off = (s) => !s.canStart && !s.canMove && !s.canParlour
  const box = nightStrip({ game: { party_night: true }, live: { nightId: null, night: null } })
  assert.equal(box.kind, 'box')
  assert.equal(box.reason, 'The party box is ticked, so testing is off. To test before the party starts, untick it on the Game night page, then tick it again before you start the party night.')
  assert.equal(BOX_TICKED, box.reason)
  assert.ok(off(box))
  assert.equal(nightOff(box), BOX_TICKED)
  const boxTest = nightStrip({ game: { party_night: true }, live: { nightId: 'n', night: { act: 4, forceRehearsal: true, gameTest: true } } })
  assert.equal(boxTest.kind, 'box', 'a ticked box stops even a test night being moved')
  assert.ok(off(boxTest))
  assert.match(boxTest.line, /A test night is still live: Act 4/)

  const party = nightStrip({ game: {}, live: { nightId: 'n', night: { act: 2, forceRehearsal: false, dryRun: false } } })
  assert.equal(party.kind, 'party')
  assert.equal(party.reason, 'The live night is the party night (or a dry run). Testing would change it.')
  assert.equal(LIVE_IS_PARTY, party.reason)
  assert.ok(off(party))
  assert.equal(nightStrip({ game: {}, live: { nightId: 'n', night: { act: 2 } } }).kind, 'party', 'a night that does not say it is a rehearsal is treated as the party')
  const dry = nightStrip({ game: {}, live: { nightId: 'n', night: { act: 5, forceRehearsal: true, dryRun: true } } })
  assert.equal(dry.kind, 'dry')
  assert.equal(dry.reason, LIVE_IS_PARTY)
  assert.ok(off(dry))
  assert.equal(nightOff(dry), LIVE_IS_PARTY)

  // a rehearsal started from a phone (the weekend practice game): named, never moved, Start asks first
  const guests = nightStrip({ game: {}, live: { nightId: 'n', night: { act: 2, phase: 'act', label: 'Night of Sat Oct 24 2026', forceRehearsal: true } } })
  assert.equal(guests.kind, 'rehearsal')
  assert.equal(guests.line, 'A rehearsal started from a phone is running (Night of Sat Oct 24 2026): Act 2, Lights Out.')
  assert.equal(guests.label, 'Night of Sat Oct 24 2026')
  assert.ok(guests.canStart && !guests.canMove && !guests.canParlour)
  assert.equal(guests.reason, LIVE_IS_REHEARSAL)
  assert.equal(nightOff(guests), LIVE_IS_REHEARSAL, 'the test-night room screens are off too')
  assert.equal(nightStrip({ game: {}, live: { nightId: 'n', night: { act: 0, label: 'Game test', forceRehearsal: true } } }).kind, 'rehearsal', 'the name alone never makes a test night')
  assert.match(nightStrip({ game: { party_night: true }, live: { nightId: 'n', night: { act: 2, forceRehearsal: true } } }).line, /A rehearsal is still live/)

  // on the party day, a box left unticked is called out
  assert.equal(PARTY_DAY, '2026-11-15')
  assert.ok(nightStrip({ game: {}, live: { nightId: null, night: null }, today: PARTY_DAY }).notes.includes(TICK_AGAIN))
  assert.ok(nightStrip({ game: {}, live: { nightId: 'n', night: { act: 2, forceRehearsal: true } }, today: PARTY_DAY }).notes.includes(TICK_AGAIN))
  assert.ok(!nightStrip({ game: {}, live: { nightId: null, night: null }, today: '2026-11-14' }).notes.includes(TICK_AGAIN))
})

test('the strip\'s words are the server\'s, word for word', () => {
  const server = readFileSync(new URL('../../functions/lib/gametest.js', import.meta.url), 'utf8')
  const said = name => server.match(new RegExp(`export const ${name} = '([^']*)'`))?.[1]
  assert.equal(said('PARTY_BOX_MESSAGE'), BOX_TICKED)
  assert.equal(said('PARTY_NIGHT_MESSAGE'), LIVE_IS_PARTY)
  assert.equal(said('REHEARSAL_MESSAGE'), LIVE_IS_REHEARSAL)
  assert.equal(said('ACT4_MESSAGE'), ACT4_NEEDS_TWO)
})

test('Jenna\'s Needs more: fixed words only, never a note of their own', () => {
  const boo = SECTIONS.find(s => s.key === 'boo')
  const now = new Date(2026, 9, 24, 15, 41).getTime()
  const card = stewardTask({ section: boo, now, order: 10009 })
  assert.equal(card.title, `Game test · ${boo.name}: Jenna says needs more`)
  assert.equal(card.steward, true)
  assert.equal(card.who, 'Claude Code')
  assert.equal(card.moment, 'act4.entryway')
  assert.equal(card.test, 'boo')
  assert.equal(card.order, 10009)
  assert.equal(card.tried, null)
  assert.ok(card.detail.startsWith('Jenna tried this game and says it needs more.'))
  assert.equal(stewardTask({ section: boo, now, order: 1 }).detail, card.detail, 'the same words every time')
  assert.equal(sentLine(card), 'Sent to Claude Code on Sat 24 Oct: Jenna says it needs more.')
  const page = src('pages/GameTest.jsx')
  assert.match(page, /isJenna\s*\?\s*<JennaFeedback/, 'Jenna gets no note box')
  assert.ok(!/function JennaFeedback[\s\S]*?<textarea[\s\S]*?\n}\n/.test(page.slice(page.indexOf('function JennaFeedback'), page.indexOf('function Feedback'))))
})

test('Get Off My Lawn!\'s practice in words: the round, who joined in order, the slips', () => {
  assert.equal(salemView(undefined).line, '…')
  assert.deepEqual(salemView(null), { line: 'The practice is not open yet.', open: false, joined: null, slips: null })
  assert.equal(salemView({ state: 'done', round: 2 }).open, false)
  const idle = salemView({ state: 'idle', round: 1, attempt: 0, slips: 0, players: { u2: { name: 'Susan', at: 20 }, u1: { name: ' Jon ', at: new Date(10) }, u3: { name: '' } } })
  assert.equal(idle.line, 'Round 1 of 3. Waiting for someone to tap Ready.')
  assert.equal(idle.joined, 'Joined (2): Jon, Susan.')
  assert.equal(idle.slips, null)
  assert.ok(idle.open)
  assert.equal(salemView({ state: 'playing', round: 2, players: {} }).joined, 'Nobody has joined yet.')
  assert.equal(salemView({ state: 'playing', round: 2 }).line, 'Round 2 of 3 is on.')
  assert.equal(salemView({ state: 'passed', round: 3 }).line, 'All 3 rounds passed.')
  assert.equal(salemView({ state: 'playing', round: 1, slips: 2, lastSlip: 'green' }).slips, 'Slips this round: 2. The last one: someone moved on green.')
  assert.equal(salemView({ state: 'playing', round: 1, slips: 1, lastSlip: 'red' }).slips, 'Slips this round: 1. The last one: someone stopped shaking on red.')
  assert.equal(salemView({ state: 'idle', round: 9 }).line, 'Round 3 of 3. Waiting for someone to tap Ready.')
})

test('Boo\'s practice show in words, from the server\'s times', () => {
  const t = 1_000_000
  const show = {
    state: 'playing', startsAt: new Date(t), endsAt: new Date(t + 100_000),
    poses: [
      { stopAt: new Date(t + 20_000), holdUntil: new Date(t + 25_000), judgedAt: new Date(t + 31_000) },
      { stopAt: { toMillis: () => t + 45_000 }, holdUntil: { toMillis: () => t + 50_000 }, judgedAt: { toMillis: () => t + 56_000 } },
      { stopAt: { seconds: (t + 70_000) / 1000 }, holdUntil: { seconds: (t + 75_000) / 1000 }, judgedAt: { seconds: (t + 81_000) / 1000 } },
    ],
  }
  assert.equal(booView(undefined).line, '…')
  assert.equal(booView(null).running, false)
  assert.equal(booView({ state: 'idle' }).line, 'Ready for a show. Tap Start the show.')
  assert.equal(booView({ ...show, state: 'done' }, t + 30_000).running, false)
  assert.deepEqual(booView(show, t - 1000), { line: 'The show is about to start.', running: true })
  assert.equal(booView(show, t + 5000).line, 'Boo is strutting.')
  assert.equal(booView(show, t + 21_000).line, 'Pose 1 of 3: strike a pose and hold it.')
  assert.equal(booView(show, t + 27_000).line, 'Pose 1 of 3: Boo is judging.')
  assert.equal(booView(show, t + 40_000).line, 'Boo is strutting.')
  assert.equal(booView(show, t + 46_000).line, 'Pose 2 of 3: strike a pose and hold it.')
  assert.equal(booView(show, t + 80_000).line, 'Pose 3 of 3: Boo is judging.')
  assert.equal(booView(show, t + 90_000).line, 'Boo is taking her bow.')
  assert.deepEqual(booView(show, t + 100_000), { line: 'That’s the show. Tap Start the show to go again.', running: false })
})

test('dates in the house\'s words', () => {
  assert.equal(dayWords(new Date(2026, 9, 24, 15, 41)), 'Sat 24 Oct')
  assert.equal(whenWords(new Date(2026, 9, 24, 15, 41).getTime()), 'Sat 24 Oct, 3:41pm')
  assert.equal(whenWords(new Date(2026, 10, 15, 0, 5)), 'Sun 15 Nov, 12:05am')
  assert.equal(whenWords(new Date(2026, 10, 15, 12, 0)), 'Sun 15 Nov, 12:00pm')
  assert.equal(dayWords(null), '')
  assert.equal(firstWords('one two three four five six seven eight nine', 8), 'one two three four five six seven eight…')
  assert.equal(firstWords('  short   note ', 8), 'short note')
})

test('a note is a Timeline card for Claude Code, filed under the game, numbered from 10000', () => {
  const salem = SECTIONS.find(s => s.key === 'salem')
  const now = new Date(2026, 9, 24, 15, 41).getTime()
  const strip = nightStrip({ game: {}, live: { nightId: 'n', night: { act: 4, forceRehearsal: true, gameTest: true } } })
  const card = feedbackTask({
    section: salem, words: '  The phone said I slipped when I was standing perfectly still on green  ',
    device: 'phone', tried: { label: 'The practice, for every phone that plays', query: '?practice=salem' }, strip, now, order: 10004,
  })
  assert.equal(card.title, 'Game test · Get Off My Lawn!: The phone said I slipped when I was…')
  assert.equal(card.detail, [
    'The phone said I slipped when I was standing perfectly still on green',
    '',
    'Device: On your phone.',
    'Last opened: The practice, for every phone that plays.',
    'Test night: Act 4, Behind Closed Doors.',
    'Sent Sat 24 Oct, 3:41pm. From the Game test tab.',
  ].join('\n'))
  assert.equal(card.status, 'todo')
  assert.equal(card.who, 'Claude Code')
  assert.equal(card.moment, 'act4.orangerie')
  assert.equal(card.when, 'now')
  assert.equal(card.order, 10004)
  assert.equal(card.source, 'game-test')
  assert.equal(card.test, 'salem')
  assert.equal(card.tried, '?practice=salem')
  assert.match(card.tech, /^Game test tab, section salem, last opened \?practice=salem on the play page\. Once fixed/)
  assert.equal(ownerOf(card), 'Claude Code', 'the Timeline files it under Claude Code')
  assert.equal(taskWhen(card), 'now', 'and under Do now')
  const bare = feedbackTask({ section: SECTIONS[0], words: 'Too dim', device: 'nowhere', now, order: 10000 })
  assert.equal(bare.device, 'other')
  assert.ok(bare.detail.includes('Device: Somewhere else.'))
  assert.ok(!bare.detail.includes('Last opened') && !bare.detail.includes('Test night'))

  assert.equal(FIRST_ORDER, 10000)
  assert.equal(nextOrder([]), 10000)
  assert.equal(nextOrder(null), 10000)
  const tasks = [{ order: 450 }, { order: 10000, source: 'game-test' }, { order: 10003, source: 'game-test' }, { order: 'x' }, { order: 12 }]
  assert.equal(nextOrder(tasks), 10004)
  assert.equal(nextOrder(tasks, 10007), 10008, 'a note just sent counts before the board catches up')
  assert.equal(nextOrder([{ order: 20000 }]), 20001, 'never on top of any card above 10000')
})

test('the status chip, the sent notes, and every open note as plain text', () => {
  const at = new Date(2026, 9, 24, 9, 0).getTime()
  assert.deepEqual(chipOf('boo', {}, []), { state: 'untried', label: 'Not tried yet' })
  assert.deepEqual(chipOf('boo', null, null), { state: 'untried', label: 'Not tried yet' })
  assert.deepEqual(chipOf('boo', { boo: { state: 'works', at } }, []), { state: 'works', label: 'Works (Sat 24 Oct)' })
  const cards = [
    { id: '1', order: 10000, source: 'game-test', test: 'boo', status: 'done', title: 'Game test · Boo’s Catwalk: Too quiet', moment: 'act4.entryway', device: 'projector', words: 'Too quiet', sentAt: at },
    { id: '2', order: 10001, source: 'game-test', test: 'salem', status: 'todo', title: 'Game test · Get Off My Lawn!: Too touchy', moment: 'act4.orangerie', device: 'phone', words: 'Too touchy\nOn green', tried: '?practice=salem', sentAt: at },
    { id: '3', order: 10002, source: 'game-test', test: 'boo', status: 'todo', deleted: true, title: 'removed' },
    { id: '4', order: 300, status: 'todo', title: 'A seeded card' },
  ]
  assert.deepEqual(chipOf('boo', { boo: { state: 'fix', at } }, cards), { state: 'untried', label: 'Not tried yet', fixed: true }, 'every note fixed: try it again')
  assert.deepEqual(chipOf('salem', { salem: { state: 'fix', at } }, cards), { state: 'fix', label: 'Needs a fix' })
  assert.deepEqual(chipOf('salem', { salem: { state: 'fix', at } }, null), { state: 'fix', label: 'Needs a fix' }, 'still reading the board')
  assert.deepEqual(gameTestCards(cards).map(t => t.id), ['2', '1'])
  assert.deepEqual(gameTestCards(cards, 'boo').map(t => t.id), ['1'])
  assert.equal(sentLine(cards[0]), 'Sent to Claude Code on Sat 24 Oct: Too quiet')

  const text = openNotesText(cards, at)
  assert.ok(text.startsWith('Open notes from the Game test tab: 1, copied Sat 24 Oct, 9:00am.'))
  assert.ok(text.includes('1. #10001 Game test · Get Off My Lawn!: Too touchy'))
  assert.ok(text.includes('Game: salem. Moment: act4.orangerie. Device: On your phone. Last opened: ?practice=salem.'))
  assert.ok(text.includes('   Too touchy\n   On green'))
  assert.ok(!text.includes('Too quiet') && !text.includes('removed') && !text.includes('seeded'), 'only the open game test notes')
  assert.equal(openNotesText([]), 'No open notes from the Game test tab.')
})

test('a rail tab, the routes, one callable and only public reads', () => {
  const app = src('App.jsx')
  assert.ok(/<NavLink to="\/game-test" className="rail-link">Game test<\/NavLink>/.test(app), 'Jon asked for a tab called Game test')
  assert.ok(!/NavLink to="\/study-test"/.test(app), 'one link: the rail is full on a phone')
  assert.ok(app.includes('<Route path="/game-test" element={<GameTest />} />'))
  assert.ok(app.includes('path="/study-test"'), 'the old address still works')
  // on a phone the rail is one row: a column for every link and the Sign out button
  const links = (app.match(/className="rail-link( quiet)?"/g) ?? []).length
  const phone = src('styles.css').match(/\.rail \{ position: fixed;[^}]*grid-template-columns: repeat\((\d+), 1fr\)/)
  assert.equal(Number(phone[1]), links, 'one column per rail link')

  const api = src('lib/gameTestApi.js')
  assert.ok(api.includes("httpsCallable(functions, 'gameTest')"))
  const reads = [...api.matchAll(/doc\(db, ('[^']+'), ([^)]+)\)/g)].map(m => `${m[1]} ${m[2]}`)
  assert.deepEqual(reads.sort(), ["'meta' 'game_test'", "'meta' 'game_test'", "'nights' nightId", "'public_state' 'active'", "'public_state' id"].sort())
  assert.ok(api.includes("watch('game_test_salem')") && api.includes("watch('game_test_boo')"))
  const page = src('pages/GameTest.jsx')
  for (const s of [api, page, src('lib/gameTest.js'), src('components/KeyWord.jsx')]) {
    assert.ok(!/['"`/](sealed|cases)\b|private/.test(s.replace(/\/\/.*$/gm, '')), 'never a sealed, case or private path')
    assert.ok(!s.includes('—'), 'no em dash')
  }
  assert.ok(!page.includes('/steward'), 'never Jenna\'s page')
  assert.ok(page.includes('Try each game before the night. Tell Claude Code what to fix: your note goes on the Timeline.'))
  assert.ok(page.includes('addTask('), 'notes go through the workshop\'s own addTask')
  // the night buttons go through the callable only, never the host command
  assert.ok(!/hostCommand/.test(page + api))
  for (const c of ['night-start', 'night-act', 'night-parlour', 'salem-open', 'salem-stop', 'boo-start', 'boo-stop']) {
    assert.ok(page.includes(`'${c}'`), c)
    assert.ok(api.includes(`'${c}'`), `the pretend server answers ${c}`)
  }
  // the key word box is shared, and the study section no longer carries its own
  assert.ok(!/function KeyWord/.test(src('pages/StudyTest.jsx')))
  assert.ok(src('components/KeyWord.jsx').includes('station_key'))
  assert.ok(page.includes('<KeyWord first />'))
})
