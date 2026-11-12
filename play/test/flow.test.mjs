import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { mayReload, isNewer, BUILD_STAMP, STAMP_FILE, CHECK_EVERY_MS } from '../src/lib/freshness.js'
import { parlourBeat, beatLine } from '../src/lib/flow.js'
import { NIGHT } from '../src/lib/night.js'

// A5 (handoff 11 Nov 2026): the flow of the night on the phone side, and screens that update themselves.
const read = p => readFileSync(new URL(p, import.meta.url), 'utf8')
const now = 50_000_000
const at = (act, beat, more = {}) => ({ phase: 'act', act, beat, ...more })

test('A5 a newer build is newer: stamps sort as times, and an older or equal one never reloads', () => {
  assert.equal(isNewer('2026-11-12T20:00:00.000Z', '2026-11-12T19:00:00.000Z'), true)
  assert.equal(isNewer('2026-11-12T19:00:00.000Z', '2026-11-12T19:00:00.000Z'), false)
  assert.equal(isNewer('2026-11-12T18:00:00.000Z', '2026-11-12T19:00:00.000Z'), false, 'a cache still serving the last build')
  assert.equal(isNewer(undefined, '2026-11-12T19:00:00.000Z'), false)
  assert.equal(isNewer('2026-11-12T20:00:00.000Z', null), false, 'a page with no stamp (the dev server) never reloads')
  assert.equal(BUILD_STAMP, null, 'no stamp outside a build')
  assert.equal(STAMP_FILE, 'build.json')
  assert.equal(CHECK_EVERY_MS, 60_000, 'once a minute')
})

test('A5 a phone reloads only while it is idle or dark', () => {
  const phone = o => mayReload({ page: 'phone', now, ...o })
  assert.equal(phone({ night: null }), true, 'the doors')
  assert.equal(phone({ night: at(1, 'arrive') }), true)
  assert.equal(phone({ night: at(1, 'rules') }), true, 'the phone is quiet while the TV plays the rules')
  assert.equal(phone({ night: { ...at(1, 'ready'), phase: 'blackout' } }), true, 'dark')
  assert.equal(phone({ night: { ...at(2, 'orient'), phase: 'prompt' } }), false, 'the role cards')
  assert.equal(phone({ night: { ...at(2, 'cat'), phase: 'paused' } }), false, 'a pause')
  assert.equal(phone({ night: at(2, 'cat'), session: { lights: { step: 'wait' } } }), true)
  assert.equal(phone({ night: at(2, 'cat'), session: { lights: { step: 'with' } } }), false, 'with a cat')
  const open = { id: 'questions-2-p0', kind: 'questions', settled: false, closesAt: now + 30_000 }
  assert.equal(phone({ night: at(2, 'cat', { window: open }) }), false, 'a Parlour Game')
  assert.equal(phone({ night: at(2, 'cat', { window: { ...open, closesAt: now - 60_000 } }) }), true, 'long closed')
  assert.equal(phone({ night: at(2, 'cat', { window: { ...open, settled: true } }) }), true)
  assert.equal(phone({ night: at(4, 'round2'), session: { act4: { room: 'study' } } }), false, 'in a game room')
  assert.equal(phone({ night: at(4, 'round2'), session: { act4: { room: 'study', paid: true } } }), true)
  assert.equal(phone({ night: at(4, 'round2'), session: { act4: { room: 'parlour' } } }), true, 'waiting in the Parlour')
  assert.equal(phone({ night: at(6, 'drawing'), relay: { state: 'turn' } }), false, 'the drawing')
  assert.equal(phone({ night: at(6, 'drawing'), relay: { state: 'done' } }), false, 'the drawing\'s last screen')
  assert.equal(phone({ night: at(6, 'talk') }), true)
  assert.equal(phone({ night: at(7, 'ballot') }), false, 'the vote')
  assert.equal(phone({ night: at(7, 'reveal') }), false, 'the reveal')
  assert.equal(phone({ night: at(7, 'result') }), false, 'the credits')
  assert.equal(phone({ night: { ...at(7, 'end'), over: true } }), true, 'The End')
  assert.equal(phone({ night: at(3, 'down'), typing: true }), false, 'never under a half-typed note')
})

test('A5 a room screen reloads only while it is idle or dark, never in a film, a game or out of its full screen', () => {
  const room = (which, o) => mayReload({ page: 'room', which, now, ...o })
  assert.equal(room('living', { night: at(1, 'arrive'), screen: { kind: 'join' } }), true)
  assert.equal(room('living', { night: at(1, 'rules'), screen: { kind: 'join' } }), false, 'the intro video and the rules film')
  assert.equal(room('living', { night: at(2, 'news'), screen: { kind: 'news' } }), false, 'bulletin 1')
  assert.equal(room('living', { night: at(3, 'bulletin'), screen: { kind: 'bulletin' } }), false, 'bulletin 2')
  assert.equal(room('living', { night: at(5, 'irwin'), screen: { kind: 'irwin' } }), false, 'Sir Irwin')
  assert.equal(room('living', { night: at(6, 'door'), screen: { kind: 'door' } }), false, 'the door')
  assert.equal(room('living', { night: at(6, 'talk'), screen: { kind: 'talk' } }), true)
  assert.equal(room('living', { night: at(7, 'reveal') }), false, 'the reveal and the closing film')
  for (const which of ['study', 'memory', 'boo', 'orangerie']) {
    assert.equal(room(which, { night: at(4, 'round3') }), false, `${which}: its game through the rounds`)
    assert.equal(room(which, { night: at(5, 'roam') }), true, `${which}: its loop after`)
  }
  assert.equal(room('living', { night: at(4, 'round3'), screen: { kind: 'prompts' } }), true, 'the Parlour TV\'s prompts')
  assert.equal(room('bedroom', { night: { ...at(1, 'ready'), phase: 'blackout' } }), true, 'dark')
  assert.equal(room('living', { night: at(5, 'roam'), fullscreen: true }), false, 'a reload would leave the full screen with nobody to click')
  assert.equal(room('practice', { night: null }), false, 'a practice game on its own page')
})

test('A5 the build writes its stamp with no new step: compiled into the page and as build.json beside it', () => {
  const vite = read('../vite.config.js')
  assert.match(vite, /__BUILD_STAMP__/)
  assert.match(vite, /fileName: 'build\.json'/)
  assert.match(vite, /apply: 'build'/, 'only a build has a stamp; the dev server never reloads')
  // one line mounts it on the phones and one on the room screens
  assert.match(read('../src/App.jsx'), /useFreshness\(\(\) => \(\{ page: 'phone'/)
  assert.match(read('../src/screens/Kiosk.jsx'), /useFreshness\(\(\) => \(\{ page: 'room'/)
})

test('A5 the Host tab offers Parlour Game now only in the games\' own beats; a quiet Now says the beat\'s line', () => {
  assert.deepEqual(Object.entries(NIGHT.acts).flatMap(([act, s]) => s.beats.filter(b => parlourBeat(act, b.key)).map(b => `${act}/${b.key}`)),
    ['2/cat', '4/round1', '4/round2', '4/round3', '4/round4', '4/round5', '6/games'])
  assert.match(read('../src/screens/Host.jsx'), /parlourBeat\(night\.act, night\.beat\) && night\.act !== 6 &&/)
  assert.equal(beatLine({ act: 1, beat: 'rules' }), 'Eyes on the Parlour TV.')
  assert.equal(beatLine({ act: 2, beat: 'cat' }), null, 'the cat line says where to go')
  assert.equal(beatLine(null), null)
  assert.match(read('../src/screens/Rest.jsx'), /beatLine\(night\) \?\? 'Nothing to do just now\. Talk to people\.'/)
})
