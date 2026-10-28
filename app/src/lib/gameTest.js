// The Game test tab, the pure part (24 Oct 2026, Jon: "a tab that is called
// game test. Under that tab it has all the game in it to test"). Every game
// of Acts 4 and 6 and the Parlour Games, in the order of the night: what it
// is, where to try it, the steps, and the note that goes to Claude Code as a
// Timeline card. No Firebase and no React here, so node can test it. The
// callable and the reads live in gameTestApi.js; the page is
// pages/GameTest.jsx.
//
// Nothing here is sealed. Every address is a sample screen (?preview=, made
// up data, no case), a practice that never touches a night (?practice=), or
// the standalone memory match. The two room screens a test night needs are
// marked `night`, so the page turns them off while the party box is ticked
// or the live night is the party or a dry run.

import night from '../../../seed/night.json' with { type: 'json' }
import gameNames from '../../../seed/game-names.json' with { type: 'json' }
import { normalizeBeats, titleOf } from './scenarios.js'
import { millisOf } from './studyTest.js'

const NAME = Object.fromEntries(gameNames.games.map(g => [g.id, g.name]))

// Get Off My Lawn! plays three rounds (functions/lib/act4.js SALEM_ROUNDS),
// and Boo's Catwalk three poses (BOO_POSES).
export const SALEM_ROUNDS = 3
export const BOO_POSES = 3

// Where Jon tries a thing, said the way the house says it.
export const DEVICES = {
  phone: 'On your phone',
  tv: 'On the Parlour TV computer',
  ipad: 'On the iPad in the Library', // kept for notes filed before 26 Oct 2026; new ones say ipadpro
  ipadpro: 'On the iPad Pro',
  projector: 'On the projector computer or any screen',
  study: 'On the study computer',
  bedroom: 'On the bedroom screen',
  walls: 'At the study walls',
  other: 'Somewhere else',
}

// "Try it on your phone"
export function tryWords(device) {
  const d = DEVICES[device] ?? DEVICES.other
  return `Try it ${d.charAt(0).toLowerCase()}${d.slice(1)}`
}

const preview = (name, label, device) => ({ label, device, params: { preview: name } })

// The seven sections, in the order of the night. `moment` is the Timeline
// row a note is filed under (lib/timeline.js MOMENT_KEYS). `devices` is the
// feedback box's "which screen" list, first is the default.
export const SECTIONS = [
  {
    key: 'study', name: NAME.study, where: 'Act 4 · the Study', moment: 'act4.study',
    what: 'Copy the light pattern on the white wall, then enter the colour and the number on the button box. Three rounds, ten minutes a group.',
    devices: ['walls', 'phone', 'study'],
    steps: [
      'Save the study key word, once, in the box on this page.',
      'Ask Claude Code to start the study station on the Mac by the walls.',
      'Stand at the walls with your phone. Tap Flash the walls, then Teach the taps and touch each hexagon as it lights. The taps are kept on the Mac that runs the study: for the night, teach them on the M1 Air by the walls, once Claude Code has set it up.',
      'Tap Play a practice round. Copy the pattern on the wall, then enter the colour and the number on the answer pad.',
      'Open Granolia’s screen on the study computer. During your practice round it shows the game; between groups in Act 4 it shows her rules card, and outside Act 4 the Study’s loop or its crest.',
    ],
    tries: [
      preview('kiosk-study', 'Granolia’s screen, a sample', 'study'),
      preview('kiosk-study-fallback', 'Granolia’s screen when the walls are down, a sample', 'study'),
      preview('room-study', 'What a phone shows in the Study, a sample', 'phone'),
    ],
  },
  {
    key: 'memory', name: NAME.library, where: 'Act 4 · the Library', moment: 'act4.puzzle',
    what: 'Zimothy’s memory match on the iPad Pro, back in the Library for Act 4 (the older family iPad only if you answer olderIpad that it stays): three boards of 7, 10 and 14 pairs. Clearing it, or the ten minutes running out, crosses a motive off for the group.',
    devices: ['ipadpro', 'phone'],
    steps: [
      'On the iPad Pro, scan the square code for the real game, or open it there.',
      'Tap two cards to turn them over. Match every pair.',
      'Play all three boards. Play again deals fresh boards.',
      'Nothing is paid and no clue is dealt. The samples show the reward card.',
    ],
    note: 'While a night is running, the Host tab counts the real game page as the memory match in the Library.',
    tries: [
      { label: 'The real game, on its own', device: 'ipadpro', params: { kiosk: 'memory', play: '1' } },
      preview('kiosk-memory', 'The first board, a sample', 'ipadpro'),
      preview('kiosk-memory-clear', 'A cleared board, a sample', 'ipadpro'),
      preview('room-paid', 'The reward on a phone, a sample', 'phone'),
    ],
  },
  {
    key: 'salem', name: NAME.orangerie, where: 'Act 4 · the Orangerie', moment: 'act4.orangerie',
    what: 'Salem’s red light, green light on the group’s phones, backwards: red means shake, green means freeze. A slip starts the round again, thirty seconds clean passes it, three rounds.',
    devices: ['phone'],
    steps: [
      'Tap Open the practice.',
      'On every phone that plays, scan the square code below and type a first name. Allow motion when the phone asks.',
      'Anyone taps Ready. Red means shake, green means freeze.',
      'Thirty seconds with no slip passes a round. Play all three.',
      'Tap Stop when you are done. Nothing is paid and no night changes.',
    ],
    tries: [
      { key: 'join', label: 'The practice, for every phone that plays', device: 'phone', params: { practice: 'salem' } },
      preview('room-salem', 'What a phone shows in the Orangerie, a sample', 'phone'),
    ],
  },
  {
    key: 'boo', name: NAME.entryway, where: 'Act 4 · the Entryway', moment: 'act4.entryway',
    what: 'Boo struts on the wall above the Parlour. When the music stops, the group strikes a pose and holds it, then Boo judges. Three poses.',
    devices: ['projector', 'phone', 'ipadpro'],
    steps: [
      'Open Boo’s wall for the practice show on the projector computer, or any screen, full screen. Tap it once so it can play sound.',
      'Open the practice show on one or more phones. For the end credits’ photo, also open Boo’s camera on Jenna’s iPad Pro (or any iPad with a camera), stand it facing you, and tap Turn on the camera.',
      'Tap Start the show.',
      'While the music plays, strut. When it stops (a record scratch), strike a pose and freeze while the big number counts down, then Boo gives her verdict. Three poses, then That’s the show. At the last pose the camera takes the photo and keeps it on its own screen.',
      'Tap Start the show to go again. Nothing is paid.',
    ],
    tries: [
      { key: 'wall', label: 'Boo’s wall, the practice show', device: 'projector', params: { kiosk: 'boo', practice: '1' } },
      { key: 'phones', label: 'The practice show on a phone', device: 'phone', params: { practice: 'boo' } },
      preview('kiosk-boo-show', 'Boo’s wall, the whole show, a sample (about a minute, no workshop needed)', 'projector'),
      preview('kiosk-boo', 'Boo’s wall, one pose, a sample', 'projector'),
      preview('kiosk-boo-pose', 'Boo’s wall at the pose, a sample', 'projector'),
      { key: 'camera', label: 'Boo’s camera, the practice show', device: 'ipadpro', params: { kiosk: 'pose', practice: '1' } },
    ],
  },
  {
    key: 'parlour', name: 'The Parlour Games', where: 'Acts 2, 4 and 6', moment: 'act2.parlour',
    what: 'Three silly questions in a row, two choices each, on every phone at once for sixty seconds. In Act 4 they wait on the phone instead.',
    devices: ['phone'],
    steps: [
      'Pick a set below and tap See it on a phone.',
      'Read Boo’s line, then tap through the three questions. Nothing is sent anywhere.',
      'On a test night in Act 2, 4 or 6, tap Parlour Game now: every phone in the test night gets one. In Act 4 it waits on the phone.',
    ],
    tries: [
      preview('room-parlour', 'Act 4: a Parlour Game waiting on the phone, a sample', 'phone'),
    ],
  },
  {
    key: 'drawing', name: NAME.drawing, where: 'Act 6 · the Parlour and the Library', moment: 'act6.drawing',
    what: 'Sir Irwin’s rules and a practice square, then three grids. A player called at random draws on paper in the Library while the room describes the square and tells the host its guess, tapped on the host’s phone (the TV’s names still work, the fallback). The third picture opens the bedroom door.',
    devices: ['tv', 'phone', 'bedroom'],
    ready: 'Have ready: paper and markers in the Library, and the Parlour TV page open on a screen people can reach.',
    steps: [
      'Have the paper, the markers and the Parlour TV page ready (below).',
      'Tap Start a test night at the top, and join it on your phone with your host name, so you get the Host tab.',
      'Tap Go to Act 6. Your phone shows the Sorry for the interruption, continue here button, then a role card for 15 seconds, for this test night only, and carries on by itself. Act 6 opens with two Parlour Games: answer them, then tap Start the drawing on your phone’s Host tab.',
      'When your name is called, go to the paper; press At the paper on your phone when you are there (or let the twenty seconds run), and draw what the room describes. Tap the room’s guess on your phone (the TV’s names still take a tap, the fallback).',
      'The third picture opens the door, and the bedroom screen shows what was left behind. With one phone you are called every turn.',
    ],
    tries: [
      { key: 'living', label: 'The Parlour TV page, for a test night', device: 'tv', params: { kiosk: 'living' }, night: true },
      { key: 'bedroom', label: 'The bedroom screen, for a test night', device: 'bedroom', params: { kiosk: 'bedroom' }, night: true },
      preview('kiosk-living-rules', 'Sir Irwin’s rules and the practice square, a sample', 'tv'),
      preview('kiosk-relay-called', 'A name is called, a sample', 'tv'),
      preview('kiosk-relay-square', 'The square the room describes, a sample', 'tv'),
      preview('kiosk-relay-guess', 'The four names on the TV, the fallback, a sample', 'tv'),
      preview('kiosk-living-hold', 'Sir Irwin’s door slide, a sample', 'tv'),
      preview('kiosk-living-done', 'The door is open, a sample', 'tv'),
      preview('relay-walk', 'Your name is called, a sample', 'phone'),
      preview('relay-walk-host', 'Your phone while someone walks: At the paper, a sample', 'phone'),
      preview('relay-draw', 'Your turn to draw, a sample', 'phone'),
      preview('relay-turn', 'Someone else is drawing, a sample', 'phone'),
      preview('relay-vote', 'The room guesses, a sample', 'phone'),
      preview('relay-vote-host', 'Your phone at the guess: the four names to tap, a sample', 'phone'),
      preview('relay-done', 'A picture is named, a sample', 'phone'),
      preview('door', 'The door is open, a sample', 'phone'),
      preview('kiosk-bedroom-closed', 'The bedroom screen with the door shut, a sample', 'bedroom'),
      preview('kiosk-bedroom-1', 'The bedroom screen with the door open, a sample', 'bedroom'),
    ],
  },
  {
    key: 'deduction', name: 'The deduction round', where: 'Act 6 · the Parlour', moment: 'act6.eliminate',
    what: 'Each player publicly strikes out one thing, and the Parlour TV shows every character with what they struck.',
    devices: ['phone', 'tv'],
    steps: [
      'Open the phone sample and strike out one thing.',
      'Open the board on the Parlour TV computer: every character, with what they struck beneath.',
      'On a test night: after the door opens in Act 6, Next on your phone’s Host tab starts the round.',
    ],
    tries: [
      preview('eliminate', 'Strike out one thing, a sample', 'phone'),
      preview('kiosk-board', 'The board of what everyone struck, a sample', 'tv'),
    ],
  },
]

export const SECTION_KEYS = SECTIONS.map(s => s.key)
export const sectionOf = key => SECTIONS.find(s => s.key === key) ?? null

// The game's address on top of the play page's: ?preview=kiosk-study.
export function playUrl(base, params = {}) {
  const b = String(base ?? '')
  const q = new URLSearchParams(params).toString()
  if (!q) return b
  return `${b}${b.includes('?') ? '&' : '?'}${q}`
}

// Just the part after the play page, for a card: "?kiosk=memory&play=1".
export function queryOf(params = {}) {
  const q = new URLSearchParams(params).toString()
  return q ? `?${q}` : ''
}

// ---- the Parlour Games, as a phone shows them ----------------------------

// Text as base64url (RFC 4648 section 5, no padding), from its UTF-8 bytes,
// so curly quotes and accents survive the address.
export function base64url(text) {
  const bytes = new TextEncoder().encode(String(text ?? ''))
  let bin = ''
  for (const b of bytes) bin += String.fromCharCode(b)
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

// One set from the workshop's list as the phone's sample screen takes it
// (play ?preview=questions&set=): the three questions and their first two
// choices. Never a point and never a lean: the night deals only the first two
// choices, and the leans are sealed and never in the workshop.
export function setOf(beats) {
  const bs = normalizeBeats(beats)
  return {
    title: titleOf(bs),
    questions: bs.map(b => ({ q: b.q.trim(), a: b.a.trim(), b: b.b.trim() })),
  }
}

export function setParam(beats) {
  return base64url(JSON.stringify(setOf(beats)))
}

// The bank, oldest first and numbered, each with its sample address.
export function parlourSets(items, base) {
  return (items ?? [])
    .filter(i => i && !i.deleted)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    .map((i, n) => ({
      id: i.id,
      n: n + 1,
      title: titleOf(i.beats) || i.text || 'A set with no first question yet',
      url: playUrl(base, { preview: 'questions', set: setParam(i.beats) }),
    }))
}

// ---- the test night -------------------------------------------------------

const ACT_NAME = Object.fromEntries(Object.entries(night.acts).map(([n, a]) => [Number(n), a.name]))
export const PARLOUR_ACTS = [2, 4, 6]

// The refusals, word for word as the server sends them (functions/lib/gametest.js).
// The party box words never just say untick it: a box left unticked makes
// the party night a rehearsal.
export const BOX_TICKED = 'The party box is ticked, so testing is off. To test before the party starts, untick it on the Game night page, then tick it again before you start the party night.'
export const LIVE_IS_PARTY = 'The live night is the party night (or a dry run). Testing would change it.'
export const LIVE_IS_REHEARSAL = 'The live night is a rehearsal started from a phone, not a test night. Run it from the Host tab on your phone.'
export const ACT4_NEEDS_TWO = 'Act 4 needs at least two phones in the test night, because it plays in groups. Join on a second phone, then try again.'
// Lines the strip shows beside its buttons.
export const ROLE_CARD_FIRST = 'The first time a test night goes to Act 2 or later, every phone shows the Sorry for the interruption, continue here button, then its role card for 15 seconds, for this test night only, and carries on by itself.'
export const PARTY_DAY = '2026-11-15'
export const TICK_AGAIN = 'Today is the party. Tick the party box on the Game night page again before you start the party night.'

// "Act 4, Behind Closed Doors", or the doors before Act 1.
export function actWords(n) {
  if (!n) return ''
  const act = Number(n.act ?? 0)
  let words = act === 0 ? 'the doors are open and Act 1 has not started' : `Act ${act}, ${ACT_NAME[act] ?? ''}`.replace(/, $/, '')
  if (n.phase === 'paused') words += ', paused'
  else if (n.phase === 'blackout') words += ', in the blackout'
  return words
}

// What the night strip says and allows. `game` is meta/game, `live` is
// { nightId, night } from the live night's own public doc (null while no
// night is live), `today` the local date as YYYY-MM-DD. A night the page
// cannot place is treated as the party: a party night has forceRehearsal
// false, a dry run has dryRun true (functions/lib/night.js). A test night is
// one this tab started, marked gameTest: true. Any other rehearsal was
// started from a phone and may have guests on it (the weekend practice game,
// a tech run): the buttons leave it alone, and Start asks first (`label`
// names it for the question).
export function nightStrip({ game, live, failed = false, today = null } = {}) {
  const off = { canStart: false, canMove: false, canParlour: false, notes: [] }
  if (failed) return { kind: 'unknown', line: 'Cannot tell which night is running. Check your signal, then reload this page.', reason: 'Testing a night waits until the page can tell.', ...off }
  if (game == null || live === undefined) return { kind: 'reading', line: '…', reason: null, ...off }
  const n = live?.nightId ? live.night ?? null : null
  if (n && n.dryRun === true) return { kind: 'dry', line: 'A dry run is running.', reason: LIVE_IS_PARTY, ...off }
  if (n && n.forceRehearsal !== true) return { kind: 'party', line: 'The party night is running.', reason: LIVE_IS_PARTY, ...off }
  if (game.party_night === true) {
    const still = n ? ` ${n.gameTest === true ? 'A test night' : 'A rehearsal'} is still live: ${actWords(n)}.` : ''
    return { kind: 'box', line: `The party box is ticked on the Game night page.${still}`, reason: BOX_TICKED, ...off }
  }
  const notes = today === PARTY_DAY ? [TICK_AGAIN] : []
  if (n && n.gameTest !== true) {
    const label = String(n.label ?? '').trim() || 'a night with no name'
    return {
      kind: 'rehearsal', line: `A rehearsal started from a phone is running (${label}): ${actWords(n)}.`, reason: LIVE_IS_REHEARSAL, label,
      canStart: true, canMove: false, canParlour: false, notes,
    }
  }
  const tips = [ACT4_NEEDS_TWO, ROLE_CARD_FIRST, ...notes]
  if (!n) return { kind: 'none', line: 'No night is running.', reason: null, hint: 'Start a test night first, then join it on your phone.', canStart: true, canMove: false, canParlour: false, notes: tips }
  const act = Number(n.act ?? 0)
  const canParlour = PARLOUR_ACTS.includes(act)
  return {
    kind: 'test', line: `A test night is running: ${actWords(n)}.`, reason: null, act,
    hint: canParlour ? null : 'Parlour Game now works in Acts 2, 4 and 6.',
    canStart: true, canMove: true, canParlour, notes: tips,
  }
}

// What a section's night-only links and buttons say while they are off.
export function nightOff(strip) {
  if (!strip || strip.kind === 'none' || strip.kind === 'test') return null
  if (strip.kind === 'reading') return '…'
  return strip.reason ?? 'Testing a night waits until the page can tell which night is running.'
}

// ---- the two practices ----------------------------------------------------

function names(players) {
  return Object.values(players ?? {})
    .filter(p => p && typeof p.name === 'string' && p.name.trim())
    .sort((a, b) => (millisOf(a.at) ?? 0) - (millisOf(b.at) ?? 0))
    .map(p => p.name.trim())
}

// Get Off My Lawn!'s practice (public_state/game_test_salem), in words.
export function salemView(doc) {
  if (doc === undefined) return { line: '…', open: false }
  if (!doc || doc.state === 'done') {
    return { line: doc ? 'The practice is closed. Tap Open the practice to play again.' : 'The practice is not open yet.', open: false, joined: null, slips: null }
  }
  const round = Math.min(SALEM_ROUNDS, Math.max(1, Number(doc.round) || 1))
  const line = doc.state === 'passed' ? `All ${SALEM_ROUNDS} rounds passed.`
    : doc.state === 'playing' ? `Round ${round} of ${SALEM_ROUNDS} is on.`
      : `Round ${round} of ${SALEM_ROUNDS}. Waiting for someone to tap Ready.`
  const who = names(doc.players)
  const joined = who.length ? `Joined (${who.length}): ${who.join(', ')}.` : 'Nobody has joined yet.'
  const n = Number(doc.slips) || 0
  let slips = n ? `Slips this round: ${n}.` : null
  if (n && doc.lastSlip === 'green') slips += ' The last one: someone moved on green.'
  if (n && doc.lastSlip === 'red') slips += ' The last one: someone stopped shaking on red.'
  return { line, open: true, joined, slips }
}

// Boo's practice show (public_state/game_test_boo), at a moment. The times
// are the server's; the page only compares them with its clock to say which
// part is on, and never counts down.
export function booView(doc, now = Date.now()) {
  if (doc === undefined) return { line: '…', running: false }
  if (!doc) return { line: 'No show yet. Open the wall, then tap Start the show.', running: false }
  if (doc.state === 'done') return { line: 'The show is stopped. Tap Start the show to go again.', running: false }
  if (doc.state !== 'playing') return { line: 'Ready for a show. Tap Start the show.', running: false }
  const ends = millisOf(doc.endsAt)
  if (ends !== null && now >= ends) return { line: 'That’s the show. Tap Start the show to go again.', running: false }
  const starts = millisOf(doc.startsAt)
  if (starts !== null && now < starts) return { line: 'The show is about to start.', running: true }
  const poses = Array.isArray(doc.poses) ? doc.poses : []
  const begun = poses.filter(p => (millisOf(p?.stopAt) ?? Infinity) <= now)
  const p = begun[begun.length - 1]
  if (!p) return { line: 'Boo is strutting.', running: true }
  const k = begun.length
  if (now < (millisOf(p.holdUntil) ?? 0)) return { line: `Pose ${k} of ${BOO_POSES}: strike a pose and hold it.`, running: true }
  if (now < (millisOf(p.judgedAt) ?? 0)) return { line: `Pose ${k} of ${BOO_POSES}: Boo is judging.`, running: true }
  return { line: k >= BOO_POSES ? 'Boo is taking her bow.' : 'Boo is strutting.', running: true }
}

// ---- dates, in the house's words ------------------------------------------

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

// "Sat 24 Oct"
export function dayWords(ts) {
  const ms = millisOf(ts)
  if (ms === null) return ''
  const d = new Date(ms)
  return `${DAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`
}

// "Sat 24 Oct, 3:41pm"
export function whenWords(ts) {
  const ms = millisOf(ts)
  if (ms === null) return ''
  const d = new Date(ms)
  const h = d.getHours()
  return `${dayWords(ms)}, ${h % 12 || 12}:${String(d.getMinutes()).padStart(2, '0')}${h < 12 ? 'am' : 'pm'}`
}

// ---- the notes to Claude Code ---------------------------------------------

export const GAME_TEST_SOURCE = 'game-test'
export const FIRST_ORDER = 10000

export function firstWords(text, n = 8) {
  const words = String(text ?? '').trim().split(/\s+/).filter(Boolean)
  return words.length > n ? `${words.slice(0, n).join(' ')}…` : words.join(' ')
}

export const isGameTestCard = t => Boolean(t) && !t.deleted && t.source === GAME_TEST_SOURCE

// The Game test notes, newest first; one section's when `key` is given.
export function gameTestCards(tasks, key = null) {
  return (tasks ?? [])
    .filter(t => isGameTestCard(t) && (key === null || t.test === key))
    .sort((a, b) => (b.order ?? 0) - (a.order ?? 0))
}

// A note's card number: its own range from 10000, clear of the seeded cards
// (up to the 400s), which later board updates find by number.
export function nextOrder(tasks, lastUsed = 0) {
  const used = (tasks ?? [])
    .filter(t => t && Number.isFinite(t.order) && (t.source === GAME_TEST_SOURCE || t.order >= FIRST_ORDER))
    .map(t => t.order)
  return Math.max(FIRST_ORDER - 1, lastUsed, ...used) + 1
}

// What Jenna's one button files (Jenna is the Steward and knows the
// secrets, so their own words never go on the board: Jon reads every card,
// and so does Claude Code's terminal). Fixed words only, like their report
// to Jon: done or needs more.
export function stewardTask({ section, now = Date.now(), order }) {
  return {
    title: `Game test · ${section.name}: Jenna says needs more`,
    detail: [
      'Jenna tried this game and says it needs more.',
      '',
      'Their own words stay off the board, because Jenna knows the secrets.',
      `Sent ${whenWords(now)}. From the Game test tab.`,
    ].join('\n'),
    status: 'todo',
    who: 'Claude Code',
    moment: section.moment,
    when: 'now',
    order,
    source: GAME_TEST_SOURCE,
    test: section.key,
    steward: true,
    device: 'other',
    words: 'Jenna says it needs more.',
    tried: null,
    sentAt: now,
    tech: `Game test tab, section ${section.key}, from Jenna (the Steward). Never ask Jenna what they saw in writing: look the game over yourself, or ask Jon to try it. Once fixed, mark this card done by its number and title.`,
  }
}

// The Timeline card for one note (app/src/lib/store.firestore.js addTask).
// `tried` is the last address opened in this section, `night` the test
// night strip, `order` the card's number.
export function feedbackTask({ section, words, device, tried = null, strip = null, now = Date.now(), order }) {
  const text = String(words ?? '').trim()
  const lines = [
    text,
    '',
    `Device: ${DEVICES[device] ?? DEVICES.other}.`,
    tried ? `Last opened: ${tried.label}.` : null,
    strip?.kind === 'test' ? `Test night: ${actWords({ act: strip.act })}.` : null,
    `Sent ${whenWords(now)}. From the Game test tab.`,
  ].filter(l => l !== null)
  return {
    title: `Game test · ${section.name}: ${firstWords(text, 8)}`,
    detail: lines.join('\n'),
    status: 'todo',
    who: 'Claude Code',
    moment: section.moment,
    when: 'now',
    order,
    source: GAME_TEST_SOURCE,
    test: section.key,
    device: DEVICES[device] ? device : 'other',
    words: text,
    tried: tried?.query ?? null,
    sentAt: now,
    // the Timeline's For Claude Code fold (components/TechFold.jsx)
    tech: `Game test tab, section ${section.key}${tried?.query ? `, last opened ${tried.query} on the play page` : ''}. Once fixed, mark this card done by its number and title, so the section's chip goes back to Not tried yet.`,
  }
}

// The status chip: Not tried yet, Works (date) or Needs a fix. A section
// whose notes Claude Code has all closed goes back to Not tried yet, so
// Jon tries it again.
export function chipOf(key, chips, tasks) {
  const c = chips?.[key]
  if (c?.state === 'works') return { state: 'works', label: `Works (${dayWords(c.at)})`.replace(' ()', '') }
  if (c?.state === 'fix') {
    const mine = tasks ? gameTestCards(tasks, key) : null
    if (mine && mine.length && mine.every(t => t.status === 'done')) return { state: 'untried', label: 'Not tried yet', fixed: true }
    return { state: 'fix', label: 'Needs a fix' }
  }
  return { state: 'untried', label: 'Not tried yet' }
}

// One sent note, as the section lists it.
export function sentLine(card) {
  const day = dayWords(card.sentAt ?? card.ts)
  const words = card.words || firstWords(card.detail, 20)
  return `Sent to Claude Code${day ? ` on ${day}` : ''}: ${words}`
}

// Every open note as plain text, for pasting into a Claude Code chat.
export function openNotesText(tasks, now = Date.now()) {
  const open = gameTestCards(tasks).filter(t => t.status !== 'done').reverse() // oldest first
  if (!open.length) return 'No open notes from the Game test tab.'
  const out = [`Open notes from the Game test tab: ${open.length}, copied ${whenWords(now)}.`]
  open.forEach((t, i) => {
    const facts = [
      `Game: ${t.test}`,
      `Moment: ${t.moment}`,
      `Device: ${DEVICES[t.device] ?? t.device ?? 'not said'}`,
      t.tried ? `Last opened: ${t.tried}` : null,
    ].filter(Boolean).join('. ')
    out.push('', `${i + 1}. #${t.order} ${t.title}`, `   ${facts}.`, ...String(t.words || t.detail || '').split('\n').map(l => `   ${l}`))
  })
  return out.join('\n')
}
