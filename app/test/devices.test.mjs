import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { DEVICE_ROOMS, DEVICES, SWITCH_ON, WHEN_ONE_DIES, deviceUrl } from '../src/lib/devices.js'

// The devices page: every room screen the phone client knows is listed,
// every address is one the client answers, and nothing is a guest's phone.

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8')
const kioskSrc = read('../../play/src/screens/Kiosk.jsx')
const handled = (k) => k === 'living' || new RegExp(`which === '${k}'`).test(kioskSrc)

test('every room screen the client answers has a device, and every kiosk address is answered or says why not', () => {
  // orangerie joined on 25 Oct 2026 (the brain's browser, the cue list)
  for (const k of ['living', 'bedroom', 'study', 'ipad', 'memory', 'boo', 'pose', 'orangerie']) assert.ok(DEVICES.some(d => d.kiosk === k), `a device opens ?kiosk=${k}`)
  for (const d of DEVICES.filter(x => x.kiosk)) {
    if (handled(d.kiosk)) assert.ok(!d.pending, `${d.key}: the client answers ?kiosk=${d.kiosk} now, so drop the pending note`)
    else assert.ok(d.pending, `${d.key}: ?kiosk=${d.kiosk} is not answered yet, so the page must say why`)
  }
})

// Jon's device key (docs/cue-list.md, 25 Oct 2026; built 26 Oct): Susan's
// MacBook Pro feeds the projector all night and never moves, the iPad Pro
// roams through its stations, Jenna's iPad Pro is Boo's camera, the brain's
// browser is the Orangerie's screen, and the older family iPad is out unless
// Jon answers olderIpad the other way.
test('the devices follow Jon’s key: the iPad Pro’s stations are one machine, Susan’s MacBook Pro never moves, Jenna’s iPad is the camera, the older iPad is out', () => {
  const byKiosk = (k) => DEVICES.find(d => d.kiosk === k && !d.query)
  const ipadRooms = new Set(['ipad', 'memory', 'bedroom'].map(k => byKiosk(k).room))
  assert.equal(ipadRooms.size, 1, 'the iPad Pro’s three addresses sit together under one heading')
  for (const k of ['ipad', 'memory', 'bedroom']) assert.match(byKiosk(k).machine, /iPad Pro/, `${k} is the iPad Pro`)
  assert.match(byKiosk('boo').machine, /Susan.s work MacBook Pro.*all night/, 'Susan’s MacBook Pro is the projector all night')
  assert.ok(!/Susan/.test(byKiosk('bedroom').machine), 'the bedroom screen is not Susan’s MacBook Pro any more')
  assert.match(byKiosk('pose').machine, /Jenna.s iPad Pro/, 'Boo’s camera is Jenna’s iPad Pro')
  assert.match(byKiosk('orangerie').machine, /brain/, 'the Orangerie screen is the brain’s browser')
  const older = DEVICES.find(d => d.key === 'older')
  assert.ok(older && !older.kiosk && !older.plain, 'the older family iPad is listed with no address')
  assert.match(older.note ?? '', /olderIpad/, 'its note names the question')
  assert.ok(!DEVICES.some(d => d.kiosk === 'memory' && /older/i.test(d.machine)), 'nothing opens the memory match on the older iPad by default')
  // when the Parlour TV dies its fallback is the brain's browser: the iPad Pro is busy all night
  const tv = WHEN_ONE_DIES.find(([what]) => what === 'The Parlour TV')[1]
  assert.match(tv, /on the brain/)
  assert.ok(!/open .*on the iPad Pro/i.test(tv))
  assert.ok(SWITCH_ON.some(s => /projector.s plug/.test(s)), 'the projector’s plug is switched on with the lights')
  assert.ok(SWITCH_ON.some(s => /iPad Pro moves three times/.test(s)), 'the start order says the iPad Pro moves')
})

test('addresses are built from the game address, and a device with none says how it starts', () => {
  const base = 'https://example.test/play/'
  assert.equal(deviceUrl(base, { kiosk: 'living' }), 'https://example.test/play/?kiosk=living')
  assert.equal(deviceUrl('https://example.test/play/?x=1', { kiosk: 'study' }), 'https://example.test/play/?x=1&kiosk=study')
  assert.equal(deviceUrl(base, { plain: true }), base)
  assert.equal(deviceUrl(base, { kiosk: 'memory', query: 'play=1' }), 'https://example.test/play/?kiosk=memory&play=1')
  assert.equal(deviceUrl(base, { key: 'router' }), null)
  assert.equal(deviceUrl('', { kiosk: 'living' }), null)
  for (const d of DEVICES) assert.ok(d.start?.length, `${d.key} says how it starts`)
})

test('keys are unique, nothing is a guest phone, and no em dash reaches the screen', () => {
  const keys = DEVICES.map(d => d.key)
  assert.equal(new Set(keys).size, keys.length)
  assert.equal(new Set(DEVICE_ROOMS.map(r => r.key)).size, DEVICE_ROOMS.length)
  for (const d of DEVICES) {
    for (const k of ['name', 'machine', 'what', 'alive', 'pending', 'note', 'tech']) assert.ok(!String(d[k] ?? '').includes('—'), `${d.key}.${k}`) // note joined 26 Oct 2026: two devices carry one
    for (const s of d.start) assert.ok(!s.includes('—'), d.key)
  }
  for (const s of [...SWITCH_ON, ...WHEN_ONE_DIES.flat()]) assert.ok(!s.includes('—'), s)
})

test('what Jon reads is plain: no Terminal, no commands, no file names; the exact line is only in tech', () => {
  const engineer = /terminal|npm |cd (cues|station)|\.env|afplay|node scripts|kiosk=|docs\//i
  for (const d of DEVICES) {
    for (const s of [d.name, d.machine, d.what, d.alive, d.pending, d.note, ...d.start].filter(Boolean)) assert.ok(!engineer.test(s), `${d.key}: ${s}`)
  }
  for (const s of [...SWITCH_ON, ...WHEN_ONE_DIES.flat()]) assert.ok(!engineer.test(s), s)
  assert.ok(SWITCH_ON.length >= 5 && WHEN_ONE_DIES.length >= 5, 'the order to switch on and the fixes are on the page')
  assert.ok(DEVICES.find(d => d.key === 'brain').tech.includes('cd cues && npm start'))
  // on the night nobody waits on a chat to bring a machine up: a double-click on its desktop
  const night = [...SWITCH_ON, ...WHEN_ONE_DIES.flat(), ...DEVICES.flatMap(d => d.start)]
  assert.ok(!night.some(s => /ask claude code to start/i.test(s)), 'no machine waits on Claude Code to start')
  assert.ok(DEVICES.find(d => d.key === 'brain').start.some(s => s.includes('Double-click Start the brain')))
  assert.ok(DEVICES.find(d => d.key === 'study').start.some(s => s.includes('Double-click Start the study')))
})

test('the commands a device names exist', () => {
  const pkg = (p) => JSON.parse(read(p)).scripts ?? {}
  const cmds = DEVICES.flatMap(d => [...d.start, d.tech ?? '']).join('\n')
  if (cmds.includes('cd cues && npm start')) assert.ok(pkg('../../cues/package.json').start)
  if (cmds.includes('cd station && npm start')) assert.ok(pkg('../../station/package.json').start)
})
