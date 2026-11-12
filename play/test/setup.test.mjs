import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { SETUP_ROOMS, SETUP_SPARES, setupParam, setupHref } from '../src/lib/setup.js'
import { DEVICES } from '../../app/src/lib/devices.js'

const read = p => readFileSync(new URL(p, import.meta.url), 'utf8')

test('the setup page (11 Nov 2026): one short address, a button for every room screen of the night', () => {
  // every room screen the night has (main.jsx's list), once each
  // one iPad button in place of three (12 Nov 2026, A10): the iPad's page follows the night; In Duplicate and the bedroom stay as spares
  assert.deepEqual(SETUP_ROOMS.map(r => r.kiosk).sort(), ['boo', 'ipad', 'living', 'orangerie', 'study'])
  assert.deepEqual(SETUP_SPARES.map(r => r.kiosk).sort(), ['bedroom', 'memory'])
  assert.ok(!SETUP_ROOMS.some(r => /camera/i.test(`${r.room} ${r.machine} ${r.when}`)), 'no camera button (Boo\'s camera went, 11 Nov 2026)')
  assert.equal(new Set(SETUP_ROOMS.map(r => r.key)).size, SETUP_ROOMS.length)
  // the address each button opens
  assert.equal(setupHref('/play/', SETUP_ROOMS[0]), '/play/?kiosk=living')
  const boo = SETUP_ROOMS.find(r => r.key === 'boo')
  assert.equal(setupHref('/play/', boo), '/play/?kiosk=boo', 'the night’s own screen, no Connect button')
  assert.equal(setupHref('/play/', boo.first), '/play/?kiosk=boo&play=1', 'the deck is connected from the practice page first')
  // /setup lands on the play page's setup mode, ahead of everything else
  assert.equal(setupParam('?setup=1'), true)
  assert.equal(setupParam('?setup'), true)
  assert.equal(setupParam('?kiosk=living'), false)
  assert.equal(setupParam(''), false)
  const fb = JSON.parse(read('../../firebase.json'))
  assert.ok(fb.hosting.redirects.some(r => r.source === '/setup' && r.destination === '/play/?setup=1'), '/setup is sent to the page')
  assert.ok(read('../src/main.jsx').includes('{setup ? <Setup /> : check ?'), 'the setup page comes first')
  // plain words, no dashes
  for (const r of [...SETUP_ROOMS, ...SETUP_SPARES]) for (const line of [r.room, r.machine, r.when, r.first?.label, r.first?.note]) assert.ok(!line || !/—|kiosk|localhost/.test(line), line)
})

test('every room screen on the workshop’s Devices page has its button', () => {
  const kiosks = new Set()
  const walk = v => { if (Array.isArray(v)) v.forEach(walk); else if (v && typeof v === 'object') { if (typeof v.kiosk === 'string') kiosks.add(v.kiosk); Object.values(v).forEach(walk) } }
  walk(DEVICES)
  assert.ok(kiosks.size >= 5, 'the Devices page lists room screens')
  for (const k of kiosks) assert.ok([...SETUP_ROOMS, ...SETUP_SPARES].some(r => r.kiosk === k), `${k} has a button`)
})
