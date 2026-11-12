import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { ipadShows, ipadAuto, ipadChip, IPAD_CHOICES, IPAD_SHOWS } from '../src/lib/ipad.js'
import { addHomeScreenManifest, MANIFEST_HREF } from '../src/lib/homescreen.js'
import { SETUP_ROOMS, SETUP_SPARES } from '../src/lib/setup.js'

// The iPad: one page, full screen (handoff 11 Nov 2026, A10).
const read = p => readFileSync(new URL(p, import.meta.url), 'utf8')
const at = (act, beat, extra = {}) => ({ act, beat, phase: 'act', ...extra })

test('Auto follows the night: the splash, the code, the captions, In Duplicate, the bedroom', () => {
  assert.equal(ipadShows({ night: at(1, 'arrive') }), 'splash')
  assert.equal(ipadShows({ night: at(1, 'rules') }), 'splash')
  assert.equal(ipadShows({ night: at(2, 'news') }), 'captions', 'bulletin 1’s words while the TV plays it')
  assert.equal(ipadShows({ night: at(2, 'cat') }), 'code', 'Zimothy’s code through the cat visits')
  assert.equal(ipadShows({ night: at(2, 'supper') }), 'captions')
  assert.equal(ipadShows({ night: at(3, 'down') }), 'captions')
  assert.equal(ipadShows({ night: at(3, 'wrap') }), 'captions')
  assert.equal(ipadShows({ night: at(4, 'warn') }), 'memory')
  assert.equal(ipadShows({ night: at(4, 'round3') }), 'memory')
  assert.equal(ipadShows({ night: at(5, 'roam') }), 'splash')
  assert.equal(ipadShows({ night: at(5, 'irwin') }), 'splash')
  assert.equal(ipadShows({ night: at(6, 'games') }), 'splash', 'the two Parlour Games: the Library still')
  assert.equal(ipadShows({ night: at(6, 'games'), relay: { state: 'intro' } }), 'bedroom', 'a drawing started by hand during the games')
  assert.equal(ipadShows({ night: at(6, 'drawing'), relay: { state: 'turn' } }), 'bedroom')
  assert.equal(ipadShows({ night: at(6, 'door'), relay: { state: 'done' } }), 'bedroom')
  assert.equal(ipadShows({ night: at(6, 'talk') }), 'bedroom')
  assert.equal(ipadShows({ night: at(7, 'ballot') }), 'bedroom')
  assert.equal(ipadShows({ night: at(7, 'end') }), 'bedroom')
  assert.equal(ipadShows({ night: null }), 'splash')
  assert.equal(ipadShows({ night: { act: 0, phase: 'lobby' } }), 'splash')
  for (let a = 0; a <= 7; a++) assert.ok(IPAD_SHOWS.includes(ipadAuto({ act: a, beat: 'x' })))
})

test('a pick by hand wins at once, and holds only through its own act', () => {
  const n = at(3, 'down')
  assert.equal(ipadShows({ night: n, cues: { ipad: { show: 'memory', act: 3 } } }), 'memory')
  assert.equal(ipadChip(n, { ipad: { show: 'memory', act: 3 } }), 'memory')
  assert.equal(ipadShows({ night: at(4, 'warn'), cues: { ipad: { show: 'bedroom', act: 3 } } }), 'memory', 'the next act: Auto again')
  assert.equal(ipadChip(at(4, 'warn'), { ipad: { show: 'bedroom', act: 3 } }), 'auto')
  assert.equal(ipadShows({ night: n, cues: { ipad: { show: 'auto', act: 3 } } }), 'captions')
  assert.equal(ipadShows({ night: n, cues: { ipad: { show: 'living', act: 3 } } }), 'captions', 'a value it does not know is Auto')
  assert.equal(ipadShows({ night: n, cues: { ipad: null } }), 'captions')
  assert.equal(ipadShows({ night: at(2, 'news'), cues: { ipad: { show: 'code', act: 2 } } }), 'code')
  assert.deepEqual(IPAD_CHOICES.map(c => c.label), ['Auto', 'Zimothy’s code', 'Supper captions', 'In Duplicate', 'The bedroom'])
})

test('the iPad’s page: one body for each show, the same parts as their own addresses, mounted in one line', () => {
  const ipad = read('../src/screens/Ipad.jsx')
  for (const part of ['<RoomCode cat="zimothy" />', '<MemoryRounds', '<Bedroom', 'captionsOnly />', '<Idle title="The Library" line="" loop="memory" />']) assert.ok(ipad.includes(part), part)
  assert.ok(ipad.includes("night.phase === 'paused' ? <OneMoment />"), 'a pause hides the code, as on the TV')
  const kiosk = read('../src/screens/Kiosk.jsx')
  assert.ok(kiosk.includes("else if (which === 'ipad') body = <IpadScreen"), 'the iPad’s page')
  assert.ok(kiosk.indexOf("else if (which === 'ipad') body") < kiosk.indexOf('else if (code) body'), 'a pick by hand wins over the cat code')
  assert.ok(kiosk.indexOf('roomDark(n, living ? screen.data : null)) body = <Dark />') < kiosk.indexOf("else if (which === 'ipad') body"), 'dark with the room first')
  assert.ok(kiosk.includes('`kiosk-${which}`'), 'the heartbeat stays kiosk-ipad all night')
  // the Host tab: its own file, one line to mount it
  const host = read('../src/screens/Host.jsx')
  assert.ok(host.includes("import IpadPanel from './IpadPanel'") && host.includes('<IpadPanel night={night}'))
  const panel = read('../src/screens/IpadPanel.jsx')
  assert.ok(panel.includes('The iPad shows') && panel.includes("run('ipad', c.key)"))
})

test('no room screen shows an act’s plain name: idle is the room’s splash', () => {
  const kiosk = read('../src/screens/Kiosk.jsx')
  assert.ok(!kiosk.includes('act?.plain') && !kiosk.includes('ACTS['), 'no act name on a room screen')
  assert.ok(kiosk.includes("<Idle title=\"Sirwin Manor\" line={captionsOnly ? 'The Library' : 'The Parlour'}"))
  const rooms = read('../src/screens/Rooms.jsx')
  assert.ok(!rooms.includes('.plain}') && !rooms.includes('ACTS'), 'nor in the rooms')
})

test('/setup: one iPad button in place of three; In Duplicate and the bedroom stay as addresses for another device', () => {
  assert.equal(SETUP_ROOMS.filter(r => /iPad/.test(`${r.room} ${r.machine}`)).length, 1)
  assert.equal(SETUP_ROOMS.find(r => r.kiosk === 'ipad').room, 'The iPad')
  assert.deepEqual(SETUP_SPARES.map(r => r.kiosk), ['memory', 'bedroom'])
  const page = read('../src/screens/Setup.jsx')
  assert.ok(page.includes('SETUP_SPARES.map') && page.includes('<details'), 'the spares under a fold')
  const main = read('../src/main.jsx')
  for (const k of ['memory', 'bedroom', 'ipad']) assert.ok(main.includes(k), `${k} is still an address`)
})

test('Add to Home Screen: a small manifest on room screens only, no service worker, nothing that prompts', () => {
  const m = JSON.parse(read('../public/manifest.webmanifest'))
  assert.equal(m.display, 'standalone')
  assert.ok(m.name && m.icons?.length)
  assert.equal(m.start_url, undefined, 'the icon opens the page it was added from, never the join page')
  assert.ok(m.icons.every(i => !/512|192/.test(i.sizes)), 'too small an icon for Chrome to call the game installable on a phone')
  const index = read('../index.html')
  assert.ok(!index.includes('rel="manifest"'), 'a guest’s phone never gets the manifest')
  assert.ok(index.includes('apple-mobile-web-app-capable') && index.includes('apple-touch-icon'), 'the Home Screen tags, for an older iPad too')
  // only room screens link it, once
  const doc = { head: { kids: [], appendChild(x) { this.kids.push(x) } }, querySelector: () => null, createElement: () => ({}) }
  assert.equal(addHomeScreenManifest(doc), true)
  assert.equal(doc.head.kids[0].rel, 'manifest')
  assert.equal(doc.head.kids[0].href, MANIFEST_HREF)
  assert.equal(addHomeScreenManifest({ head: {}, querySelector: () => ({}) }), false, 'once')
  assert.equal(addHomeScreenManifest(null), false)
  assert.ok(read('../src/screens/Kiosk.jsx').includes('useRoomScreenDevice()'))
  // nothing anywhere in the page's code registers a worker or handles an install prompt
  const src = fileURLToPath(new URL('../src', import.meta.url))
  const walk = d => readdirSync(d).flatMap(f => { const p = join(d, f); return statSync(p).isDirectory() ? walk(p) : [p] })
  for (const f of walk(src).filter(f => /\.(jsx?|mjs)$/.test(f))) {
    const t = readFileSync(f, 'utf8')
    assert.ok(!/beforeinstallprompt|serviceWorker\.register/.test(t), f)
  }
})

test('the iPad keeps its screen awake and its first touch turns its sound on', () => {
  const ipad = read('../src/screens/Ipad.jsx')
  assert.ok(ipad.includes('keepAwake()') && ipad.includes("addEventListener('touchend', again)"), 'the wake lock, asked again on the first touch')
  const perm = read('../src/lib/permissions.js')
  assert.ok(perm.includes("d.visibilityState === 'visible'"), 'taken again when the page is back in view')
  const kiosk = read('../src/screens/Kiosk.jsx')
  assert.ok(kiosk.includes("const WAKE_EVENTS = ['pointerdown', 'pointerup', 'touchend', 'click', 'keydown']"), 'a finger lifting wakes the sound')
})
