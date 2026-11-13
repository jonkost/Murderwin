import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, existsSync, statSync } from 'node:fs'
import { DEVICE_ROOMS, DEVICES, SWITCH_ON, WHEN_ONE_DIES, deviceUrl, stepParts } from '../src/lib/devices.js'

// The devices page: every room screen the phone client knows is listed,
// every address is one the client answers, and nothing is a guest's phone.

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8')
const kioskSrc = read('../../play/src/screens/Kiosk.jsx')
const handled = (k) => k === 'living' || new RegExp(`which === '${k}'`).test(kioskSrc)

test('every room screen the client answers has a device, and every kiosk address is answered or says why not', () => {
  // orangerie joined on 25 Oct 2026 (the brain's browser, the cue list)
  for (const k of ['living', 'bedroom', 'study', 'ipad', 'memory', 'boo', 'orangerie']) assert.ok(DEVICES.some(d => d.kiosk === k), `a device opens ?kiosk=${k}`)
  // Boo's camera went on 11 Nov 2026 (Jon: "anything regarding the camera for it"): no device, no address, no row when it dies
  assert.ok(!DEVICES.some(d => d.kiosk === 'pose' || /camera/i.test(`${d.name} ${d.machine} ${d.what}`)), 'no camera on the Devices page')
  assert.ok(![...SWITCH_ON, ...WHEN_ONE_DIES.flat()].some(s => /camera|Jenna.s iPad/i.test(s)), 'and none in the start order or the fixes')
  for (const d of DEVICES.filter(x => x.kiosk)) {
    if (handled(d.kiosk)) assert.ok(!d.pending, `${d.key}: the client answers ?kiosk=${d.kiosk} now, so drop the pending note`)
    else assert.ok(d.pending, `${d.key}: ?kiosk=${d.kiosk} is not answered yet, so the page must say why`)
  }
})

// Jon's device key (docs/cue-list.md, 25 Oct 2026; built 26 Oct): Susan's
// MacBook Pro never moves (Boo's screen in the Entryway since 5 Nov), the
// iPad Pro roams through its stations, the brain's browser is the
// Orangerie's screen, and the older family iPad is out unless Jon answers
// olderIpad the other way. Jenna's iPad has no job (11 Nov 2026).
test('the devices follow Jon’s key: the iPad Pro’s stations are one machine, Susan’s MacBook Pro never moves, the older iPad is out', () => {
  const byKiosk = (k) => DEVICES.find(d => d.kiosk === k && !d.query)
  const ipadRooms = new Set(['ipad', 'memory', 'bedroom'].map(k => byKiosk(k).room))
  assert.equal(ipadRooms.size, 1, 'the iPad Pro’s three addresses sit together under one heading')
  for (const k of ['ipad', 'memory', 'bedroom']) assert.match(byKiosk(k).machine, /iPad Pro/, `${k} is the iPad Pro`)
  assert.match(byKiosk('boo').machine, /Susan.s work MacBook Pro in the Entryway with the Stream Deck \+ XL.*all night/, 'Susan’s MacBook Pro is Boo’s screen all night (the arcade, 5 Nov 2026)')
  assert.ok(!/Susan/.test(byKiosk('bedroom').machine), 'the bedroom screen is not Susan’s MacBook Pro any more')
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
  assert.ok(DEVICES.find(d => d.key === 'study').start.some(s => s.includes('Double-click Start the Study')))
})

// 12 Nov 2026, the review before the party (Jon could not play the night through, so the setup was walked
// in the code instead). The page had fallen behind the night: it sent the cue sounds through the brain to
// the HomePods, opened a second tab on the Parlour TV, started the night from the old party box, and
// promised a Start the brain button that did not exist.
test('the setup words are the night as it starts today', () => {
  const by = (key) => DEVICES.find(d => d.key === key)
  const jon = (d) => [d.name, d.machine, d.what, d.alive, d.note, ...d.start].filter(Boolean).join(' ')
  // the button the page promises is there, and runs
  const button = new URL('../../cues/Start the brain.command', import.meta.url)
  assert.ok(existsSync(button), 'cues/Start the brain.command exists')
  assert.ok((statSync(button).mode & 0o111) !== 0, 'and can be run by a double-click')
  assert.match(read('../../cues/Start the brain.command'), /^\s*node cues\.mjs "\$@"$/m, 'it starts the relay')
  assert.ok(existsSync(new URL('../../station/Start the Study.command', import.meta.url)), 'and so does Start the Study')
  assert.ok(!DEVICES.some(d => /Until it exists/.test(d.tech ?? '')), 'nothing still waits on a button to be made')
  // the sounds: every room screen and phone plays its own, so the brain stays on its own speakers
  assert.match(jon(by('brain')), /own speakers, not a HomePod/)
  assert.ok(!/AirPlay group/.test(jon(by('speakers'))), 'the HomePods are not the brain’s sound output')
  assert.match(jon(by('speakers')), /every room screen and phone/)
  assert.ok(!/rings nothing/.test(jon(by('orangerie'))), 'the Orangerie’s screen plays its own chimes')
  // the Parlour TV plays the intro and the rules by itself
  assert.ok(!/second browser tab/.test(jon(by('living'))), 'no second tab on the Parlour TV')
  assert.ok(!DEVICES.some(d => /black at The End/.test(d.what)), 'The End is a card, not black')
  // the night starts from the big button with its own box, before the first guest
  const start = SWITCH_ON.find(s => /Start the night/.test(s))
  assert.ok(start, 'the order says to start the night')
  assert.match(start, /tick This is the real night/)
  assert.match(start, /before the first guest/)
  assert.ok(![...SWITCH_ON, ...WHEN_ONE_DIES.flat()].some(s => /party box|Host\? Start the night|This is the party night\. Then/.test(s)), 'never the old party box or the old button')
  assert.ok(SWITCH_ON.findIndex(s => /Start the brain/.test(s)) < SWITCH_ON.indexOf(start), 'the brain is up before the night starts, so the jazz plays')
  assert.ok(SWITCH_ON.some(s => /Start the Study in the Study station folder/.test(s)), 'the Study’s button is in its folder')
  assert.ok(SWITCH_ON.some(s => /setup/.test(s) && /Send each screen its page/.test(s)), 'both ways to open a screen')
  // every step opens with what it is about, for the pages to show in bold
  for (const step of SWITCH_ON) { const [lead, rest] = stepParts(step); assert.ok(lead && rest && `${lead}: ${rest}` === step, step.slice(0, 30)) }
  assert.deepEqual(stepParts('No lead here'), ['', 'No lead here'])
  // when something dies
  const fix = (what) => WHEN_ONE_DIES.find(([w]) => w === what)[1]
  assert.match(fix('Your phone'), /Susan’s phone: it has the same Host tab/)
  assert.ok(!/Tap your name on Susan/.test(fix('Your phone')), 'Susan’s phone holds Susan: no name to tap there')
  assert.match(fix('The wifi'), /mobile data/)
  assert.match(fix('The brain'), /Double-click Start the brain/)
  assert.match(fix('The brain'), /stay as they are and stop changing/, 'a dead brain stops nothing: the music and lights hold')
  assert.match(start, /If your phone opens on an old night, use A fresh night/, 'and the step covers a practice night left on')
  assert.match(fix('A guest’s phone'), /Notes stay on the old phone/)
})

// 28 Oct 2026: Miss Boo LaRue’s Arcade on its own page; 29 Oct, the review: through a
// HomePod its sounds land two seconds after the press; 5 Nov 2026: the same arcade is the
// night's Entryway screen (plain ?kiosk=boo), with no setup words on it
test('Miss Boo LaRue’s Arcade: an address of its own beside Boo’s screen, in Chrome, the sound on the Mac’s own speakers; the night’s screen connects the deck from it first', () => {
  const arcade = DEVICES.find(d => d.key === 'arcadeplay')
  assert.ok(arcade, 'listed')
  assert.equal(deviceUrl('https://example.test/play/', arcade), 'https://example.test/play/?kiosk=boo&play=1', 'a query of its own, so Boo’s screen stays the night’s boo screen')
  assert.ok(arcade.start.some(s => /Google Chrome/.test(s)) && arcade.start.some(s => /Safari cannot reach the Stream Deck/.test(s)))
  assert.ok(arcade.start.some(s => /quit the Stream Deck app/i.test(s)))
  assert.ok(arcade.start.some(s => /sound output to its own speakers/.test(s)), 'its sounds on the Mac’s own speakers')
  assert.match(arcade.note, /runs on the night on Boo’s screen/, 'the note says the night runs the same arcade')
  const byKiosk = (k) => DEVICES.find(d => d.kiosk === k && !d.query)
  const boo = byKiosk('boo')
  assert.ok(boo.start.some(s => /no Connect button/.test(s)), 'the night’s screen has no setup words: the deck is connected once from the practice page')
  assert.ok(boo.start.some(s => /Google Chrome/.test(s)) && /Stream Deck \+ XL/.test(boo.machine) && /Stream Deck/.test(boo.what))
  assert.ok(!/projector/i.test(boo.what + boo.machine), 'the projector is out of the Entryway')
})

test('the commands a device names exist', () => {
  const pkg = (p) => JSON.parse(read(p)).scripts ?? {}
  const cmds = DEVICES.flatMap(d => [...d.start, d.tech ?? '']).join('\n')
  if (cmds.includes('cd cues && npm start')) assert.ok(pkg('../../cues/package.json').start)
  if (cmds.includes('cd station && npm start')) assert.ok(pkg('../../station/package.json').start)
})
