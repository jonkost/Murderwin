import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { houseView, MACHINES, QUIET_MS, QUIET_SCREENS } from '../src/lib/house.js'

const read = p => readFileSync(new URL(p, import.meta.url), 'utf8')
const NOW = 1_800_000_000_000
const NIGHT = { nightId: 'n1', act: 1, beat: 'arrive', phase: 'act', roster: {} }

// Handoff 11 Nov 2026, A14 ("It didn't run any of the intros, the audio, the video"). The videos were in
// and switched on. A browser lets a page play sound, and a video with its sound, only once a person has
// clicked or tapped it; a room screen nobody had clicked was refused, and a bulletin clip then sat on its
// first frame for good. Now the screen says whether its sound is on, the Host tab shows it, and a refused
// clip plays silent rather than freeze.

test('a room screen that is up says whether its sound is on; the Host tab shows it beside its dot', () => {
  const presence = { 'kiosk-living': NOW - 1000, 'kiosk-study': NOW - 1000, 'kiosk-orangerie': NOW - 1000, 'kiosk-boo': NOW - QUIET_MS - 1, cues: NOW - 1000 }
  const sound = { 'kiosk-living': true, 'kiosk-study': false, 'kiosk-orangerie': true, 'kiosk-boo': true }
  const by = Object.fromEntries(houseView({ night: NIGHT, presence, sound, now: NOW }).machines.map(m => [m.key, m]))
  assert.equal(by['kiosk-living'].sound, true, 'clicked: sound on')
  assert.equal(by['kiosk-study'].sound, false, 'up, but nobody has clicked it yet')
  assert.equal(by['kiosk-boo'].sound, null, 'a screen that is down says nothing about its sound')
  assert.equal(by['kiosk-ipad'].sound, null)
  // the brain's own browser is the Orangerie's speaker for the cues (11 Nov 2026), so it has a sound mark; the brain is not a screen
  assert.equal(by['kiosk-orangerie'].sound, true)
  assert.equal(by.cues.sound, null)
  assert.ok(!QUIET_SCREENS.has('kiosk-orangerie') && QUIET_SCREENS.has('cues') && !QUIET_SCREENS.has('kiosk-living'))
  // a screen whose heartbeat carries no word on sound (an older page) is shown as not yet: the safe thing to tell a host
  assert.equal(houseView({ night: NIGHT, presence, now: NOW }).machines.find(m => m.key === 'kiosk-living').sound, false)
  assert.equal(houseView({ night: NIGHT, presence, now: NOW }).machines.length, MACHINES.filter(m => !m.spare).length, 'a spare address that is not up has no row (A10)')

  const host = read('../src/screens/Host.jsx')
  assert.ok(host.includes('m.sound === true') && host.includes('m.sound === false'), 'the house panel shows both')
  assert.ok(host.includes('No sound yet. Click once on that screen.'), 'in plain words, with what to do')
  assert.ok(host.includes('usePresenceRows(night.nightId)'))
  assert.ok(/SendScreens presence=\{presence\} sound=\{screenSound\}/.test(host), 'the send list shows it too, before the guests come')
})

test('the heartbeat carries the sound mark, and falls back to the plain row if the house’s rules are older than the page', () => {
  const hooks = read('../src/lib/hooks.js')
  assert.ok(hooks.includes('export function useServerClock(uid, nightId, guestKey, extra = null)'))
  assert.ok(hooks.includes("e?.code !== 'permission-denied'") && hooks.includes('plain.current = true'), 'a refused row is sent again without the extras')
  assert.ok(hooks.includes('await setDoc(ref, row)'), 'so a room screen never falls silent to the house')
  const kiosk = read('../src/screens/Kiosk.jsx')
  assert.ok(kiosk.includes('useServerClock(uid, nightId, `kiosk-${which}`, { sound })'))
  assert.ok(kiosk.includes('export function useScreenSound()'))
  assert.ok(!/new \(window\.AudioContext/.test(kiosk), 'the room screens share the sound kit’s one AudioContext')
  // the phones' heartbeat is unchanged: it never carries the mark
  assert.ok(read('../src/App.jsx').includes('useServerClock(uid, nightId, presenceKey(session.data, nightId))'))
  // the rules let the row carry a yes or a no, and nothing else new
  const rules = read('../../firestore.rules')
  assert.ok(rules.includes("hasOnly(['nightId', 'guestKey', 'at', 'sound'])"))
  assert.ok(rules.includes("request.resource.data.sound is bool"))
})

test('a bulletin clip that is refused sound plays silent, and one that will not play at all is skipped: never a frozen first frame', () => {
  const rooms = read('../src/screens/Rooms.jsx')
  const at = rooms.indexOf('export function BulletinVideo(')
  const body = rooms.slice(at, rooms.indexOf('// ---- the Library', at))
  assert.ok(/started\.catch\(\(\) => \{[\s\S]*v\.muted = true[\s\S]*v\.play\(\)/.test(body), 'refused with sound: it plays muted')
  assert.ok(body.includes('skip.current?.()'), 'refused even muted: on to the next clip, so the film always ends')
  assert.ok(!body.includes('v.play().catch(() => {})'), 'the old swallow, which left the clip on its first frame, is gone')
  // the intro video already did this
  const kiosk = read('../src/screens/Kiosk.jsx')
  assert.ok(kiosk.includes('v.play().catch(() => { v.muted = true; v.play().catch(() => onOver()) })'))
  // the setup page says what its tap does
  assert.ok(read('../src/screens/Setup.jsx').includes('That tap turns its sound on.'))
})
