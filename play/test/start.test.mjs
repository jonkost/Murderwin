import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { introAtFor, countdownLeft, countdownText, clockWords, screenLinks, secondDisplayLink, introPlaying, RUN_THROUGH_MS, INTRO_LATE_MS, MAX_FILL_INS, PARTY_DAY, fillInCount, fillInsOffered, fillInArg, fillInWords } from '../src/lib/start.js'
import { SETUP_ROOMS } from '../src/lib/setup.js'
import { MACHINES, fillInLine, fillInSeats, fillInsRunning, lockedInCount, FILL_IN_PRESENCE, FILL_IN_FRESH_MS } from '../src/lib/house.js'

const read = p => readFileSync(new URL(p, import.meta.url), 'utf8')
const at = (h, m) => new Date(2026, 10, 15, h, m, 0, 0).getTime()

test('when the intro goes: the real night at half past four, a run-through five minutes after the tap', () => {
  assert.equal(introAtFor({ real: true, now: at(15, 0) }), at(16, 30))
  assert.equal(introAtFor({ real: true, now: at(16, 29) }), at(16, 30))
  assert.equal(introAtFor({ real: true, now: at(16, 30) }), null, 'past half past four: Next runs it')
  assert.equal(introAtFor({ real: false, now: at(23, 55) }), at(23, 55) + RUN_THROUGH_MS)
  assert.equal(clockWords(at(16, 30)), '4:30 pm')
  assert.equal(clockWords(at(0, 5)), '12:05 am')
})

test('the countdown: only at Arrivals, only while playing, only with a time, never after a Back past the time', () => {
  const night = { phase: 'act', act: 1, beat: 'arrive', introAt: 10_000, beatAt: 1_000 }
  assert.equal(countdownLeft(night, 4_000), 6_000)
  assert.equal(countdownLeft(night, 12_000), 0, 'it holds at zero until the server moves the night')
  assert.equal(countdownLeft({ ...night, beat: 'rules' }, 4_000), null)
  assert.equal(countdownLeft({ ...night, act: 0, phase: 'lobby' }, 4_000), null)
  assert.equal(countdownLeft({ ...night, phase: 'paused' }, 4_000), null)
  assert.equal(countdownLeft({ ...night, introAt: null }, 4_000), null)
  assert.equal(countdownLeft({ ...night, beatAt: 11_000 }, 12_000), null)
  assert.equal(countdownLeft(null, 0), null)
  assert.equal(countdownText(90 * 60_000), '1:30:00')
  assert.equal(countdownText(299_000), '4:59')
  assert.equal(countdownText(500), '0:01')
  assert.equal(countdownText(0), '0:00')
})

test('a page to send for every room screen, each with the heartbeat the Host tab knows', () => {
  const links = screenLinks('https://example.test/play/')
  assert.equal(links.length, SETUP_ROOMS.length)
  assert.equal(links[0].url, 'https://example.test/play/?kiosk=living')
  const known = new Set(MACHINES.map(m => m.key))
  for (const l of links) assert.ok(known.has(l.presenceKey), `${l.presenceKey} is a machine on the Host tab`)
})

test('the intro video: at The house rules, from the beat\'s start, not long after', () => {
  const night = { act: 1, beat: 'rules', beatAt: 100_000 }
  assert.deepEqual(introPlaying(night, 130_000), { startedAt: 100_000, offset: 30 })
  assert.equal(introPlaying(night, 100_000 + INTRO_LATE_MS + 1), null)
  assert.equal(introPlaying({ ...night, beat: 'arrive' }, 130_000), null)
  assert.equal(introPlaying({ ...night, act: 2 }, 130_000), null)
})

test('the phone, the Host tab and the room screens use them; no setup words on a room screen', () => {
  const host = read('../src/screens/Host.jsx')
  // (11 Nov 2026, the polish pass: on a practice night the call may carry { fillIns } too, and nothing more on the real night)
  assert.ok(host.includes("callHost({ command: 'create', arg: { real, introAt: introAtFor({ real }), ...fillInArg({ real, fillIns }) } })"), 'the big button sends the tick box and the time')
  assert.ok(host.includes('This is the real night') && host.includes("{busy ? 'Starting…' : 'Start the night'}") && host.includes('A practice night. The intro plays in five minutes.'), 'a run-through unless the box is ticked')
  assert.ok(host.includes('<StartNight ui={{ \'START NIGHT\': \'Start a new night\' }} again />'), 'the same button on the Host tab')
  assert.ok(host.includes('navigator.share({ title: s.room, url: s.url })'), 'each screen is sent from the share sheet')
  const kiosk = read('../src/screens/Kiosk.jsx')
  assert.ok(kiosk.includes('{!dark && !standalone && <IntroCountdown night={n} nightId={nightId} serverNow={serverNow} />}'), 'every room screen counts down, never in the dark')
  assert.ok(kiosk.includes('callIntroDue({ nightId })'), 'the screen tells the server at zero')
  assert.ok(kiosk.includes('requestFullscreen'), 'the first click goes full screen')
  const count = kiosk.slice(kiosk.indexOf('function IntroCountdown'), kiosk.indexOf('const INTRO_MUTED'))
  assert.ok(!/Connect|Chrome|AirDrop|full screen/i.test(count.replace(/\/\/.*$/gm, '')), 'the countdown says only when the evening begins')
})

test('a Mac\'s second display has a page of its own: the crest, sent like the rest, silent', () => {
  assert.equal(secondDisplayLink('https://example.test/play/').url, 'https://example.test/play/?kiosk=decor')
  const kiosk = read('../src/screens/Kiosk.jsx')
  assert.ok(kiosk.includes("else if (which === 'decor') body = <Idle title=\"Sirwin Manor\" line=\"\" loop={null} room={decorRoom} calm />"), 'the crest and nothing else (its room’s splash, calmer, once the look is switched on)')
  assert.ok(kiosk.indexOf('roomDark(n, living ? screen.data : null)) body = <Dark />') < kiosk.indexOf("which === 'decor') body"), 'dark with the room first')
  assert.ok(kiosk.includes("silent={which === 'decor'}"), 'it never chimes: the room\'s own screen does')
  assert.ok(read('../src/screens/Host.jsx').includes('send(second)') && read('../src/screens/Setup.jsx').includes('SECOND_DISPLAY'), 'on the Host tab\'s list and the setup page')
})

// ---- Fill-in players (the polish pass, job A4, 11 Nov 2026) ------------------------
// Seats with no phone, on a practice night only. Guard 1 of three is here: the phone
// hides the row and never sends the number on the real night (guards 2 and 3 are the
// server's, functions/test/fillins.test.mjs).

const before = Date.parse('2026-11-12T23:00:00Z') // the practice evening

test('fill-ins on the Start card: 0 to 8, and the number goes with a practice start only', () => {
  assert.equal(MAX_FILL_INS, 8)
  for (const [given, want] of [[6, 6], [9, 8], [-1, 0], ['six', 0], [null, 0], [2.7, 2], ['3', 3]]) assert.equal(fillInCount(given), want, String(given))
  assert.deepEqual(fillInArg({ real: false, fillIns: 6, now: before }), { fillIns: 6 })
  assert.deepEqual(fillInArg({ real: false, fillIns: 12, now: before }), { fillIns: 8 })
  assert.deepEqual(fillInArg({ real: false, fillIns: 0, now: before }), {}, 'nought sends nothing: the call is the one it always was')
  assert.deepEqual(fillInArg({ real: false, now: before }), {})
  assert.equal(fillInWords(0), '')
  assert.equal(fillInWords(1), '1 fill-in player joins with no phone.')
  assert.equal(fillInWords(6), '6 fill-in players join with no phone.')
})

test('guard 1: the real night never sends a number, and the row is not shown for it or from the party day on', () => {
  for (const fillIns of [0, 1, 6, 8, 99]) assert.deepEqual(fillInArg({ real: true, fillIns, now: before }), {}, `real night, ${fillIns} asked`)
  assert.equal(fillInsOffered({ real: true, now: before }), false)
  assert.equal(fillInsOffered({ real: false, now: before }), true)
  // the party day: no row and no number, box ticked or not
  assert.equal(fillInsOffered({ real: false, now: PARTY_DAY }), false)
  assert.equal(fillInsOffered({ real: false, now: PARTY_DAY - 1 }), true)
  assert.deepEqual(fillInArg({ real: false, fillIns: 6, now: PARTY_DAY + 60_000 }), {})
  // the same moment as the server's (functions/lib/morning.js)
  const server = /export const PARTY_DAY = Date\.parse\('([^']+)'\)/.exec(read('../../functions/lib/morning.js'))
  assert.equal(PARTY_DAY, Date.parse(server[1]), 'the phone and the server agree on the party day')
  // the card: the row sits behind the offer, the number starts at nought and is kept in nothing
  const host = read('../src/screens/Host.jsx')
  const card = host.slice(host.indexOf('export function StartNight'), host.indexOf('// After the start:'))
  assert.ok(card.includes('const offered = fillInsOffered({ real })'), 'offered only on a practice night')
  assert.ok(/\{offered && \(\s*<div className="start-fill"/.test(card), 'the row is drawn only when offered')
  assert.equal(card.split('Fill-in players').length - 1, 2, 'the row and its label, nowhere else on the card')
  assert.ok(card.indexOf('{offered && (') < card.indexOf('Fill-in players</span>'), 'and the words sit inside it')
  assert.ok(card.includes('const [fillIns, setFillIns] = useState(0)'), 'nought every time the card opens')
  assert.ok(!/localStorage|sessionStorage/.test(card), 'never remembered')
  assert.ok(card.includes('disabled={busy || fillIns >= MAX_FILL_INS}') && card.includes('disabled={busy || fillIns <= 0}'), 'the buttons stop at 0 and 8')
})

test('the Host tab marks a fill-in, offers no phone to hand on, and counts the real players at Locked in', () => {
  const night = { roster: { jon: { name: 'Jon' }, sue: { name: 'Sue' }, mabel: { name: 'Mabel', fillIn: true }, gus: { name: 'Gus', fillIn: true } } }
  assert.equal(fillInSeats(night), 2)
  // the line says whether something is running them: the heartbeat of npm run fill-ins on the brain,
  // which the server leaves as the presence row 'fill-ins' (functions/lib/fillins.js FILL_IN_PRESENCE)
  const t = 5_000_000
  assert.equal(fillInLine(night, {}, t), '2 fill-in players have no phone. Nothing is running them, so they answer late. The night never waits for them.')
  assert.equal(fillInLine(night, { 'fill-ins': t - 30_000 }, t), '2 fill-in players have no phone. They are playing along. The night never waits for them.')
  assert.equal(fillInLine(night, { 'fill-ins': t - FILL_IN_FRESH_MS }, t), '2 fill-in players have no phone. Nothing is running them, so they answer late. The night never waits for them.', 'a heartbeat a minute and a half old is a stopped clock')
  assert.equal(fillInLine({ roster: { jon: { name: 'Jon' }, mabel: { name: 'Mabel', fillIn: true } } }, { 'fill-ins': t }, t), '1 fill-in player has no phone. They are playing along. The night never waits for them.')
  assert.equal(fillInsRunning({ 'fill-ins': t - 1 }, t), true)
  assert.equal(fillInsRunning({ jon: t }, t), false, 'a guest\'s own heartbeat is not theirs')
  assert.ok(read('../../functions/lib/fillins.js').includes(`export const FILL_IN_PRESENCE = '${FILL_IN_PRESENCE}'`), 'the same row name as the server writes')
  // a night with no fill-in: no line, and the count is the one it always was
  const plain = { roster: { jon: { name: 'Jon' }, sue: { name: 'Sue' }, amy: { name: 'Amy' } } }
  assert.equal(fillInLine(plain, { 'fill-ins': t }, t), null)
  assert.equal(fillInLine(null), null)
  assert.deepEqual(lockedInCount({ locked: { jon: true, gone: true } }, plain), { locked: 2, of: 3 }, 'today\'s numbers: every key on the doc, every seat')
  assert.deepEqual(lockedInCount({ locked: { jon: true, mabel: true } }, night), { locked: 1, of: 2 }, 'the real players only')
  assert.deepEqual(lockedInCount({ locked: { jon: true, sue: true } }, night), { locked: 2, of: 2 })
  assert.deepEqual(lockedInCount(null, night), { locked: 0, of: 2 })
  const host = read('../src/screens/Host.jsx')
  assert.ok(host.includes("{fill ? ' · fill-in' : ''}"), 'marked beside the name')
  assert.ok(host.includes('{!fill && <button className="chip handover"'), 'no Hand this phone on for a seat with no phone')
  assert.ok(host.includes('{house.showGuests && !fill'), 'and no dot to watch')
  assert.ok(host.includes('fillInLine(night, presence, clock)') && host.includes('{fillLine && <p className="gloss fill-ins">{fillLine}</p>}'), 'one line above the list, on the server\'s clock, only on a night that has them')
  // nobody takes a fill-in's seat by a stray tap: the join screen offers only guests with a phone
  assert.ok(read('../src/screens/Join.jsx').includes('.filter(r => r?.fillIn !== true)'), 'the tap-your-name list leaves fill-ins out')
})
