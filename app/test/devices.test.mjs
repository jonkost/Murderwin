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
  for (const k of ['living', 'bedroom', 'study', 'ipad', 'memory', 'boo']) assert.ok(DEVICES.some(d => d.kiosk === k), `a device opens ?kiosk=${k}`)
  for (const d of DEVICES.filter(x => x.kiosk)) {
    if (handled(d.kiosk)) assert.ok(!d.pending, `${d.key}: the client answers ?kiosk=${d.kiosk} now, so drop the pending note`)
    else assert.ok(d.pending, `${d.key}: ?kiosk=${d.kiosk} is not answered yet, so the page must say why`)
  }
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
    for (const k of ['name', 'machine', 'what', 'alive', 'pending', 'tech']) assert.ok(!String(d[k] ?? '').includes('—'), `${d.key}.${k}`)
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
