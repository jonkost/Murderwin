import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { introAtFor, countdownLeft, countdownText, clockWords, screenLinks, secondDisplayLink, introPlaying, RUN_THROUGH_MS, INTRO_LATE_MS } from '../src/lib/start.js'
import { SETUP_ROOMS } from '../src/lib/setup.js'
import { MACHINES } from '../src/lib/house.js'

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
  assert.ok(host.includes("callHost({ command: 'create', arg: { real, introAt: introAtFor({ real }) } })"), 'the big button sends the tick box and the time')
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
  assert.ok(kiosk.includes("silent={which === 'orangerie' || which === 'decor'}"), 'it never chimes: the room\'s own screen does')
  assert.ok(read('../src/screens/Host.jsx').includes('send(second)') && read('../src/screens/Setup.jsx').includes('SECOND_DISPLAY'), 'on the Host tab\'s list and the setup page')
})
