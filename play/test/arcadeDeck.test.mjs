import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { deckEvents, deckPainter, watchPlugs, reopenDeck, chooseDeck, deckSupported, deckProblem } from '../src/lib/arcadeDeck.js'

// Miss Boo LaRue's Arcade: the Stream Deck + XL link (build spec section 11).
// Fakes only: a deck that records every write, an art that hands back tagged
// buffers, a navigator.hid and a library. The real @elgato-stream-deck/webhid
// is never loaded here. The recorded calls hold full-size picture buffers, so
// the assertions compare names and small tuples only (assert would print a
// buffer in full).

const FACE_BYTES = 112 * 112 * 4
const STRIP_BYTES = 1200 * 100 * 4
const XL = 0x00c6 // the + XL's USB product id
const MK2 = 0x0080 // the study's 15-key Stream Deck MK.2

const flush = () => new Promise(resolve => setImmediate(resolve))
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))
const fill = face => Array.from({ length: 36 }, () => face)

// console.warn kept quiet while a test makes the deck fail on purpose.
async function quiet(fn) {
  const warn = console.warn
  console.warn = () => {}
  try { return await fn() } finally { console.warn = warn }
}

// A deck shaped like StreamDeckWeb: on/off like eventemitter3, and every write
// recorded. slow: each write waits a turn of the event loop; slowClose: so does
// close, as a real device's does. fail: { when, error }.
function fakeDeck({ model = 'plus-xl', device = null, slow = false, slowClose = false, fail = null } = {}) {
  const listeners = new Map()
  const deck = {
    MODEL: model,
    modelInfo: { id: model },
    calls: [],
    inFlight: 0,
    most: 0,
    closed: false,
    cleared: false,
    on(name, fn) { listeners.set(name, [...(listeners.get(name) ?? []), fn]); return deck },
    off(name, fn) { listeners.set(name, (listeners.get(name) ?? []).filter(f => f !== fn)); return deck },
    emit(name, ...args) { for (const fn of [...(listeners.get(name) ?? [])]) fn(...args) },
    count(name) { return (listeners.get(name) ?? []).length },
    removeAllListeners() { listeners.clear(); deck.cleared = true; return deck },
    fillKeyColor: (i, r, g, b) => write('fillKeyColor', [i, r, g, b]),
    prepareFillKeyBuffer: (i, rgba, options) => write('prepareFillKeyBuffer', [i, rgba, options], () => ({ key: i, rgba })),
    sendPreparedBuffer: buffer => write('sendPreparedBuffer', [buffer]),
    fillLcd: (i, rgba, options) => write('fillLcd', [i, rgba, options]),
    clearPanel: () => write('clearPanel', []),
    setBrightness: percent => write('setBrightness', [percent]),
    async close() {
      deck.calls.push(['close'])
      if (slowClose) await flush()
      deck.closed = true
      if (device) device.opened = false
    },
  }
  async function write(name, args, result) {
    deck.inFlight++
    deck.most = Math.max(deck.most, deck.inFlight)
    deck.calls.push([name, ...args])
    try {
      if (slow) await flush()
      if (fail?.when(name, args)) throw fail.error
      return result?.()
    } finally { deck.inFlight-- }
  }
  return deck
}

// The art: one cached buffer per face id, tagged with the id, and 'off' and
// 'flat' as flat colours.
function fakeArt() {
  const faces = new Map()
  const strips = new Map()
  return {
    faceRgba(id) {
      if (!faces.has(id)) faces.set(id, Object.assign(new Uint8ClampedArray(FACE_BYTES), { face: id }))
      return faces.get(id)
    },
    faceSolid: id => (id === 'off' ? [0, 0, 0] : id === 'flat' ? [31, 157, 74] : null),
    stripRgba(strip) {
      const json = JSON.stringify(strip)
      if (!strips.has(json)) strips.set(json, Object.assign(new Uint8ClampedArray(STRIP_BYTES), { strip: json }))
      return strips.get(json)
    },
  }
}

// What landed on each key, in order: [index, face] (a colour fill as 'rgb(r,g,b)').
const keyWrites = deck => deck.calls.flatMap(([name, ...a]) =>
  name === 'fillKeyColor' ? [[a[0], `rgb(${a.slice(1).join(',')})`]]
    : name === 'sendPreparedBuffer' ? [[a[0].key, a[0].rgba.face]] : [])
const lastFaces = deck => {
  const faces = new Array(36).fill(null)
  for (const [i, face] of keyWrites(deck)) faces[i] = face
  return faces
}
const named = (deck, name) => deck.calls.filter(c => c[0] === name)

const strip = (extra = {}) => ({ left: 'Free play', centre: 'Press a game', right: '', bar: null, dials: ['', '', '', '', '', ''], ...extra })

// A browser HID device, navigator.hid and the library, all fake.
const fakeDevice = (productId, vendorId = 0x0fd9) => ({
  vendorId, productId, opened: false, closes: 0,
  async close() { this.closes++; this.opened = false },
})
function fakeHid(granted = []) {
  const listeners = { connect: [], disconnect: [] }
  return {
    granted, chosen: [], asked: 0, filters: null,
    async getDevices() { return this.granted },
    requestDevice(options) { this.asked++; this.filters = options?.filters; return Promise.resolve(this.chosen) },
    addEventListener(type, fn) { listeners[type].push(fn) },
    removeEventListener(type, fn) { listeners[type] = listeners[type].filter(f => f !== fn) },
    fire(type, device) { for (const fn of [...listeners[type]]) fn({ type, device }) },
    count(type) { return listeners[type].length },
  }
}
function fakeLib() {
  const lib = {
    opened: [], decks: [], error: null, model: null, slowClose: false, slow: false,
    async openDevice(device) {
      lib.opened.push(device)
      if (lib.error) throw lib.error
      device.opened = true
      const deck = fakeDeck({ model: lib.model ?? (device.productId === XL ? 'plus-xl' : 'original-mk2'), device, slowClose: lib.slowClose, slow: lib.slow })
      lib.decks.push(deck)
      return deck
    },
    requestStreamDecks() { throw new Error('never used: the chooser is asked directly') },
  }
  lib.load = async () => lib
  return lib
}
const chromeError = (name, message) => Object.assign(new Error(message), { name })

test("the deck's presses become the arcade's events: keys, dial presses, dial turns, strip taps", () => {
  const deck = fakeDeck()
  const got = []
  const errors = []
  const pages = []
  deck.on('down', () => pages.push('down')) // the page's own listener, untouched by ours
  const names = ['down', 'up', 'rotate', 'lcdShortPress', 'lcdLongPress', 'lcdSwipe', 'error', 'nfcRead']
  const before = names.map(n => deck.count(n))
  const off = deckEvents(deck, event => got.push(event), error => errors.push(error))

  deck.emit('down', { type: 'button', index: 7 })
  deck.emit('down', { type: 'encoder', index: 2 })
  deck.emit('rotate', { type: 'encoder', index: 4 }, -3)
  deck.emit('rotate', { type: 'encoder', index: 0 }, 1)
  deck.emit('lcdShortPress', { type: 'lcd-segment', id: 0, index: 0 }, { x: 640, y: 50 })
  // ignored: releases, long presses, swipes and the NFC reader
  deck.emit('up', { type: 'button', index: 7 })
  deck.emit('up', { type: 'encoder', index: 2 })
  deck.emit('lcdLongPress', { type: 'lcd-segment', id: 0, index: 0 }, { x: 10, y: 10 })
  deck.emit('lcdSwipe', { type: 'lcd-segment', id: 0, index: 0 }, { x: 10, y: 10 }, { x: 900, y: 10 })
  deck.emit('nfcRead', 'abc')
  const boom = new Error('boom')
  deck.emit('error', boom)

  assert.deepEqual(got, [
    { kind: 'key', index: 7 },
    { kind: 'press', dial: 2 },
    { kind: 'turn', dial: 4, amount: -3 },
    { kind: 'turn', dial: 0, amount: 1 },
    { kind: 'strip', x: 640 },
  ])
  assert.deepEqual(errors, [boom])

  off()
  assert.deepEqual(names.map(n => deck.count(n)), before, 'exactly our listeners went')
  deck.emit('down', { type: 'button', index: 1 })
  deck.emit('rotate', { type: 'encoder', index: 1 }, 1)
  assert.equal(got.length, 5, 'nothing after the unsubscribe')
  assert.deepEqual(pages, ['down', 'down', 'down'], "the page's own listener still hears the deck")
  off() // twice is harmless

  const plain = fakeDeck()
  deckEvents(plain, () => {})
  assert.equal(plain.count('error'), 0, 'no error listener without onError')
})

test('a press the page fails to handle does not stop the next one', async () => {
  const deck = fakeDeck()
  const got = []
  deckEvents(deck, event => { if (event.index === 0) throw new Error('page bug'); got.push(event) })
  await quiet(() => deck.emit('down', { type: 'button', index: 0 }))
  deck.emit('down', { type: 'button', index: 1 })
  assert.deepEqual(got, [{ kind: 'key', index: 1 }])
})

test('the painter paints only the keys whose face changed', async () => {
  const deck = fakeDeck()
  const p = deckPainter(deck, fakeArt(), { stripGapMs: 0 })
  const faces = Array.from({ length: 36 }, (_, i) => (i % 2 ? 'blank' : 'star'))
  p.paint(faces, null)
  await p.idle()
  assert.equal(keyWrites(deck).length, 36, 'the first paint draws every key')
  assert.deepEqual(lastFaces(deck), faces)

  deck.calls.length = 0
  p.paint(faces, null)
  await p.idle()
  assert.deepEqual(deck.calls.map(c => c[0]), [], 'the same faces again: nothing written')

  const next = faces.slice()
  next[4] = 'mouse'
  next[30] = 'off'
  p.paint(next, null)
  await p.idle()
  assert.deepEqual(keyWrites(deck), [[4, 'mouse'], [30, 'rgb(0,0,0)']], 'only the two keys that changed')
  assert.equal(deck.most, 1, 'never two writes in flight')
  await p.close()
})

test('a burst of paints is painted once, with the newest faces, one write at a time', async () => {
  const deck = fakeDeck({ slow: true })
  const p = deckPainter(deck, fakeArt(), { stripGapMs: 0 })
  const A = fill('star')
  const B = Array.from({ length: 36 }, (_, i) => `burst${i}`)
  const C = Array.from({ length: 36 }, (_, i) => (i % 3 ? 'blank' : 'mouse'))
  p.paint(A) // key 0 starts at once, with A's face
  p.paint(B) // while it is in flight: only remembered
  p.paint(C) // and replaced before any of B is painted
  await p.idle()
  const writes = keyWrites(deck)
  assert.equal(deck.most, 1, 'one write queue: never two writes in flight')
  assert.ok(writes.every(([, face]) => !B.includes(face)), 'B was never painted')
  assert.deepEqual(lastFaces(deck), C, 'the deck ends on the newest faces')
  assert.equal(writes.length, 37, 'key 0 twice (A was already on its way), every other key once')
  assert.deepEqual(writes[0], [0, 'star'])
  assert.deepEqual(writes[36], [0, 'mouse'])
  await p.close()
})

test("'off' and flat faces are one colour fill, with no picture drawn", async () => {
  const deck = fakeDeck()
  const art = { ...fakeArt(), faceSolid: id => (id === 'flat' ? [31, 157, 74] : null) } // 'off' is black whatever the art says
  const p = deckPainter(deck, art, { stripGapMs: 0 })
  const faces = fill('off')
  faces[1] = 'flat'
  faces[2] = 'star'
  p.paint(faces)
  await p.idle()
  const colours = named(deck, 'fillKeyColor')
  assert.equal(colours.length, 35)
  assert.deepEqual(colours[0], ['fillKeyColor', 0, 0, 0, 0])
  assert.deepEqual(colours[1], ['fillKeyColor', 1, 31, 157, 74])
  assert.deepEqual(named(deck, 'prepareFillKeyBuffer').map(c => c[1]), [2], 'only the star key was drawn')
  await p.close()
})

test('a face already prepared for a key is sent again without drawing it again', async () => {
  const deck = fakeDeck()
  const p = deckPainter(deck, fakeArt(), { stripGapMs: 0 })
  const faces = fill('off')
  const show = async (key, face) => { faces[key] = face; p.paint(faces); await p.idle() }
  await show(3, 'mouse')
  await show(3, 'blank')
  await show(3, 'mouse')
  await show(4, 'mouse') // the same face on another key is its own picture (the key is inside it)
  const prepares = named(deck, 'prepareFillKeyBuffer')
  assert.deepEqual(prepares.map(c => `${c[1]}|${c[2].face}`), ['3|mouse', '3|blank', '4|mouse'])
  assert.deepEqual(prepares[0][3], { format: 'rgba' })
  assert.equal(prepares[0][2].length, FACE_BYTES)
  const sends = named(deck, 'sendPreparedBuffer').map(c => c[1])
  assert.equal(sends.length, 4)
  assert.ok(sends[2] === sends[0], 'the very same prepared buffer, sent again')
  await p.close()
})

test('prepared pictures are kept to about 800, the oldest dropped first', async () => {
  const deck = fakeDeck()
  const p = deckPainter(deck, fakeArt(), { stripGapMs: 0 })
  for (let n = 0; n < 24; n++) { p.paint(fill(`face${n}`)); await p.idle() } // 864 key pictures
  const prepares = () => named(deck, 'prepareFillKeyBuffer').length
  assert.equal(prepares(), 864)
  p.paint(fill('face0')); await p.idle()
  assert.equal(prepares(), 900, 'the oldest were dropped, so drawn again')
  p.paint(fill('face23')); await p.idle()
  assert.equal(prepares(), 900, 'the newest were kept')
  await p.close()
})

test('the strip is painted only when it changes, at most every stripGapMs', async () => {
  const deck = fakeDeck()
  const p = deckPainter(deck, fakeArt(), { stripGapMs: 0 })
  const faces = fill('off')
  p.paint(faces, strip()); await p.idle()
  p.paint(faces, strip({ dials: ['', '', '', '', '', ''] })); await p.idle() // the same picture, a new object
  p.paint(faces, strip({ centre: '3 points' })); await p.idle()
  const lcd = named(deck, 'fillLcd')
  assert.equal(lcd.length, 2)
  assert.equal(lcd[0][1], 0, 'lcd 0: the touch strip')
  assert.equal(lcd[0][2].length, STRIP_BYTES)
  assert.deepEqual(lcd[0][3], { format: 'rgba', width: 1200, height: 100 })
  assert.equal(JSON.parse(lcd[1][2].strip).centre, '3 points')
  await p.close()

  const slow = fakeDeck()
  const q = deckPainter(slow, fakeArt(), { stripGapMs: 60 })
  q.paint(faces, strip()); await q.idle()
  q.paint(faces, strip({ centre: 'a' }))
  q.paint(faces, strip({ centre: 'b' }))
  await q.idle()
  assert.equal(named(slow, 'fillLcd').length, 1, 'held back: too soon after the last')
  await sleep(150)
  await q.idle()
  const later = named(slow, 'fillLcd')
  assert.equal(later.length, 2)
  assert.equal(JSON.parse(later[1][2].strip).centre, 'b', 'then the newest, once')
  await q.close()
})

test('a failing write calls onLost once, then nothing more is written and the deck is let go', async () => {
  const error = chromeError('NotAllowedError', 'Failed to write the report.')
  const deck = fakeDeck({ fail: { when: (name, args) => name === 'sendPreparedBuffer' && args[0].key === 5, error } })
  const lost = []
  const p = deckPainter(deck, fakeArt(), { onLost: e => lost.push(e), stripGapMs: 0 })
  await quiet(async () => {
    p.paint(fill('star'), strip())
    await p.idle()
    await flush()
  })
  assert.deepEqual(lost, [error], 'onLost, once, with the error')
  assert.deepEqual(keyWrites(deck).map(([i]) => i), [0, 1, 2, 3, 4, 5], 'it stopped at the key that failed')
  assert.equal(named(deck, 'fillLcd').length, 0)
  assert.ok(deck.closed, 'the deck is let go and closed, so Connect opens it afresh')
  assert.ok(deck.cleared, 'and our listeners on it are gone')
  assert.equal(deckProblem(lost[0]), 'gone')
  assert.equal(deckProblem(), 'gone', 'the last problem, with nothing passed')

  const seen = deck.calls.length
  p.paint(fill('blank'), strip({ centre: 'x' }))
  p.paint(fill('mouse'))
  await p.clear()
  await flush()
  assert.equal(deck.calls.length, seen, 'nothing more is written')
  assert.equal(lost.length, 1)
  await p.close()
  assert.equal(named(deck, 'clearPanel').length, 0, 'closing a lost deck does not try to clear it')
})

test('clear() blanks the deck and forgets; close() clears and closes; a closed painter paints nothing', async () => {
  const deck = fakeDeck()
  const p = deckPainter(deck, fakeArt(), { stripGapMs: 0 })
  const faces = Array.from({ length: 36 }, (_, i) => (i < 4 ? 'star' : 'off'))
  p.paint(faces, strip()); await p.idle()
  deck.calls.length = 0
  await p.clear()
  assert.deepEqual(deck.calls.map(c => c[0]), ['clearPanel'], 'blank, and nothing painted again until asked')
  p.paint(faces, strip()); await p.idle()
  assert.equal(keyWrites(deck).length, 36, 'every key painted again')
  assert.equal(named(deck, 'fillLcd').length, 1, 'and the strip')
  assert.equal(named(deck, 'prepareFillKeyBuffer').length, 4, 'pictures drawn afresh, so new art shows')

  deck.calls.length = 0
  await p.close()
  assert.deepEqual(deck.calls.map(c => c[0]), ['clearPanel', 'close'])
  assert.ok(deck.cleared)
  p.paint(fill('mouse'), strip({ centre: 'later' }))
  await flush()
  assert.deepEqual(deck.calls.map(c => c[0]), ['clearPanel', 'close'], 'nothing after close')
})

test('a second painter on the same deck takes over: still one write at a time', async () => {
  const deck = fakeDeck({ slow: true })
  const art = fakeArt()
  const first = deckPainter(deck, art, { stripGapMs: 0 })
  first.paint(fill('star'))
  const second = deckPainter(deck, art, { stripGapMs: 0 }) // React StrictMode mounts twice
  second.paint(fill('blank'))
  first.paint(fill('mouse')) // the first one is retired: ignored
  await first.idle()
  await second.idle()
  assert.equal(deck.most, 1)
  assert.deepEqual(lastFaces(deck), fill('blank'))
  assert.ok(keyWrites(deck).every(([, face]) => face !== 'mouse'))
  await second.close()
})

test('a painter closed as soon as it takes over waits for the old write before clearing', async () => {
  const deck = fakeDeck({ slow: true })
  const art = fakeArt()
  const first = deckPainter(deck, art, { stripGapMs: 0 })
  first.paint(fill('star')) // key 0 is on its way
  const second = deckPainter(deck, art, { stripGapMs: 0 })
  await second.close()
  assert.equal(deck.most, 1, 'the clear waited for the write in flight')
  assert.deepEqual(deck.calls.map(c => c[0]).slice(-2), ['clearPanel', 'close'])
})

test('deckProblem: tab, busy, gone or other, from what Chrome and the library throw', () => {
  assert.equal(deckProblem(new Error('The Stream Deck went to another arcade tab.')), 'tab')
  assert.equal(deckProblem(chromeError('NotAllowedError', 'Failed to open the device.')), 'busy')
  assert.equal(deckProblem(chromeError('InvalidStateError', 'The device is already open.')), 'busy')
  assert.equal(deckProblem(chromeError('InvalidStateError', 'An operation that changes the device state is in progress.')), 'busy')
  assert.equal(deckProblem(chromeError('InvalidStateError', 'The device must be opened first.')), 'gone')
  assert.equal(deckProblem(chromeError('NotAllowedError', 'Failed to write the report.')), 'gone')
  assert.equal(deckProblem(chromeError('NotAllowedError', 'Failed to write the feature report.')), 'gone')
  assert.equal(deckProblem(chromeError('NotAllowedError', 'The device was closed unexpectedly.')), 'gone')
  assert.equal(deckProblem(chromeError('InvalidStateError', 'The device is forgotten.')), 'gone')
  assert.equal(deckProblem(new Error('The Stream Deck was unplugged.')), 'gone')
  assert.equal(deckProblem(chromeError('NotAllowedError', '')), 'busy')
  assert.equal(deckProblem(new Error('Stream Deck is of unexpected type.')), 'other')
  assert.equal(deckProblem(new TypeError('Expected a valid keyIndex')), 'other')
  assert.equal(deckProblem(chromeError('SecurityError', 'Must be handling a user gesture to show a permission request.')), 'other')
  assert.equal(deckProblem(null), null)
})

test('reopenDeck opens the + XL once, however many ask at once, and never another deck', async () => {
  const xl = fakeDevice(XL)
  const mk2 = fakeDevice(MK2)
  const mouse = fakeDevice(0xc077, 0x046d)
  const hid = fakeHid([mk2, mouse, xl])
  const lib = fakeLib()
  const [a, b] = await Promise.all([reopenDeck({ hid, load: lib.load }), reopenDeck({ hid, load: lib.load })])
  assert.ok(a)
  assert.ok(a === b, "StrictMode's second effect gets the same deck")
  assert.ok(lib.opened.length === 1 && lib.opened[0] === xl, 'only the + XL was opened, once')
  assert.deepEqual(a.calls.slice(0, 2), [['setBrightness', 90], ['clearPanel']])
  assert.ok((await reopenDeck({ hid, load: lib.load })) === a, 'the open one, while it is open')
  assert.ok((await chooseDeck({ hid, load: lib.load })) === a)
  assert.equal(hid.asked, 0, 'no chooser while it is open')

  // close lets it go; a reopen asked meanwhile waits for the close, then opens it afresh
  const closing = deckPainter(a, fakeArt()).close()
  const again = reopenDeck({ hid, load: lib.load })
  await closing
  const c = await again
  assert.ok(a.closed)
  assert.ok(c && c !== a)
  assert.equal(lib.opened.length, 2)
  await deckPainter(c, fakeArt()).close()

  assert.equal(await reopenDeck({ hid: fakeHid([mk2]), load: lib.load }), null, 'no + XL allowed yet: null')
  assert.equal(lib.opened.length, 2, 'and the MK.2 is never opened')
})

test('reopenDeck closes a + XL left open by an earlier copy of the page, then opens it', async () => {
  const xl = fakeDevice(XL)
  xl.opened = true
  const lib = fakeLib()
  const deck = await reopenDeck({ hid: fakeHid([xl]), load: lib.load })
  assert.ok(deck)
  assert.equal(xl.closes, 1)
  await deckPainter(deck, fakeArt()).close()
})

test('chooseDeck asks inside the click for the + XL alone; another model, a closed chooser or a busy deck give null', async () => {
  const lib = fakeLib()
  const xl = fakeDevice(XL)
  const hid = fakeHid([])
  hid.chosen = [xl]

  lib.model = 'xl' // pretend the chosen device is another model
  const asking = chooseDeck({ hid, load: lib.load })
  assert.equal(hid.asked, 1, 'asked before anything was awaited, while the click still counts')
  assert.deepEqual(hid.filters, [{ vendorId: 0x0fd9, productId: XL }])
  assert.equal(await asking, null)
  assert.ok(lib.decks[0].closed, 'any other model is closed again at once')
  assert.equal(deckProblem(), 'other')

  hid.chosen = []
  assert.equal(await chooseDeck({ hid, load: lib.load }), null, 'the chooser was closed')
  assert.equal(deckProblem(), null, 'which is no problem')

  lib.model = null
  lib.error = chromeError('NotAllowedError', 'Failed to open the device.')
  hid.chosen = [xl]
  assert.equal(await quiet(() => chooseDeck({ hid, load: lib.load })), null)
  assert.equal(deckProblem(), 'busy', 'the Stream Deck app or another tab has it')

  lib.error = null
  const deck = await chooseDeck({ hid, load: lib.load })
  assert.ok(deck)
  assert.equal(deck.MODEL, 'plus-xl')
  assert.equal(deckProblem(), null)
  await deckPainter(deck, fakeArt()).close()
})

test('watchPlugs hears only the + XL, and lets go of the open one when it is pulled out', async () => {
  const xl = fakeDevice(XL)
  const mk2 = fakeDevice(MK2)
  const mouse = fakeDevice(0xc077, 0x046d)
  const hid = fakeHid([xl])
  const lib = fakeLib()
  const plugs = []
  const unplugs = []
  const off = watchPlugs({ hid, onPlug: d => plugs.push(d), onUnplug: d => unplugs.push(d) })
  hid.fire('connect', mk2)
  hid.fire('connect', mouse)
  hid.fire('connect', xl)
  assert.deepEqual(plugs, [xl])

  const deck = await reopenDeck({ hid, load: lib.load })
  hid.fire('disconnect', mk2) // another deck on the same Mac: never ours
  assert.ok((await reopenDeck({ hid, load: lib.load })) === deck, 'still the open one')
  hid.fire('disconnect', xl)
  assert.deepEqual(unplugs, [xl])
  await flush()
  assert.ok(deck.closed, 'the unplugged deck is let go')
  assert.equal(deckProblem(), 'gone')
  const again = await reopenDeck({ hid, load: lib.load }) // plugged in again
  assert.ok(again && again !== deck)

  off()
  hid.fire('connect', xl)
  assert.equal(plugs.length, 1, 'nothing after the unsubscribe')
  await deckPainter(again, fakeArt()).close()
  assert.equal(hid.count('connect'), 0)
  assert.equal(hid.count('disconnect'), 0, 'every listener on navigator.hid is gone')
})

test('an unplugged deck is let go even when the page is not watching', async () => {
  const xl = fakeDevice(XL)
  const hid = fakeHid([xl])
  const lib = fakeLib()
  const deck = await reopenDeck({ hid, load: lib.load })
  hid.fire('disconnect', xl)
  await flush()
  assert.ok(deck.closed)
  const again = await reopenDeck({ hid, load: lib.load })
  assert.ok(again && again !== deck)
  await deckPainter(again, fakeArt()).close()
})

test('a deck the browser closed under us is let go, and opened afresh once that close is done', async () => {
  const xl = fakeDevice(XL)
  const hid = fakeHid([xl])
  const lib = fakeLib()
  lib.slowClose = true // a real device takes a moment to close
  const deck = await reopenDeck({ hid, load: lib.load })
  xl.opened = false // closed by the browser, with no disconnect seen
  const open = lib.openDevice
  let closedFirst = null
  lib.openDevice = async device => { closedFirst = deck.closed; return open(device) }
  const again = await reopenDeck({ hid, load: lib.load })
  assert.ok(again && again !== deck)
  assert.equal(closedFirst, true, 'the old one was closed before the new open')
  assert.equal(deckProblem(), null, 'open again: nothing to report')
  await deckPainter(again, fakeArt()).close()
})

test('deckSupported: navigator.hid in a secure page only (never Safari)', () => {
  const nav = Object.getOwnPropertyDescriptor(globalThis, 'navigator')
  const setNav = value => Object.defineProperty(globalThis, 'navigator', { value, configurable: true, writable: true })
  try {
    setNav({ hid: {} })
    globalThis.window = { isSecureContext: true }
    assert.equal(deckSupported(), true)
    globalThis.window = { isSecureContext: false }
    assert.equal(deckSupported(), false, "the dev server's Wi-Fi address is not a secure page")
    setNav({})
    globalThis.window = { isSecureContext: true }
    assert.equal(deckSupported(), false, 'Safari has no WebHID')
  } finally {
    if (nav) Object.defineProperty(globalThis, 'navigator', nav)
    else delete globalThis.navigator
    delete globalThis.window
  }
  assert.equal(deckSupported(), false, 'Node: no browser at all')
})

test('importing touches no browser, and the library loads only inside a function', async () => {
  const source = readFileSync(new URL('../src/lib/arcadeDeck.js', import.meta.url), 'utf8')
  assert.doesNotMatch(source, /^\s*import\b[^(]*['"]@elgato-stream-deck/m, 'never a static import of the library')
  assert.match(source, /await import\('@elgato-stream-deck\/webhid'\)/)
  const longDash = new RegExp(`${String.fromCharCode(0x2014)}|${String.fromCharCode(0x2013)}`)
  assert.doesNotMatch(source, longDash, 'no long dash')

  const touched = []
  const saved = ['navigator', 'window', 'document'].map(name => [name, Object.getOwnPropertyDescriptor(globalThis, name)])
  for (const [name] of saved) {
    Object.defineProperty(globalThis, name, { configurable: true, get() { touched.push(name) } })
  }
  try {
    await import(`../src/lib/arcadeDeck.js?fresh=${Date.now()}`)
  } finally {
    for (const [name, descriptor] of saved) {
      if (descriptor) Object.defineProperty(globalThis, name, descriptor)
      else delete globalThis[name]
    }
  }
  assert.deepEqual(touched, [])
})

// ---- one arcade tab holds the deck (29 Oct 2026) -------------------------------

// navigator.locks for the arcade tabs of one test: one exclusive lock that
// honours steal (the holder's request rejects with an AbortError, as Chrome's
// does) and ifAvailable (the callback gets null while the lock is held). It
// keeps no queue and refuses a request that would wait in one: the arcade
// never asks for the deck back by itself. slowRelease: a lock let go is free a
// turn of the event loop later, as Chrome's goes through its browser process,
// and the request settles only then. Every test passes its own, so the real
// navigator.locks in Node is never reached.
function fakeLocks({ slowRelease = false } = {}) {
  const later = fn => (slowRelease ? setImmediate(fn) : fn())
  const locks = {
    holder: null, // the request that holds the lock
    asked: [], // every request's name and options, in order
    stolen: 0,
    request(name, options, callback) {
      locks.asked.push({ name, ...options })
      return new Promise((resolve, reject) => {
        const answer = lock => Promise.resolve().then(() => callback(lock))
        if (locks.holder && options?.ifAvailable) { answer(null).then(resolve, reject); return }
        if (locks.holder && !options?.steal) { reject(new Error('a request that waits in a queue')); return }
        if (locks.holder) {
          locks.stolen++
          locks.holder.reject(new DOMException("Lock broken by another request with the 'steal' option.", 'AbortError'))
        }
        const me = { reject }
        locks.holder = me
        const free = () => { if (locks.holder === me) locks.holder = null } // released before the request settles
        answer({ name, mode: 'exclusive' }).then(value => later(() => { free(); resolve(value) }), error => later(() => { free(); reject(error) }))
      })
    },
  }
  return locks
}

// Two arcade tabs on one Mac: two copies of this module, each a page of its
// own, sharing one navigator.locks and the one + XL, which each tab sees as
// its own HIDDevice and opens as its own deck.
let copies = 0
async function twoTabs(lockOptions) {
  const locks = fakeLocks(lockOptions)
  const tab = async name => {
    const xl = fakeDevice(XL)
    const hid = fakeHid([xl])
    hid.chosen = [xl]
    const t = { arcade: await import(`../src/lib/arcadeDeck.js?tab=${name}${++copies}`), xl, hid, lib: fakeLib() }
    t.reopen = (more = {}) => t.arcade.reopenDeck({ hid, load: t.lib.load, locks, ...more })
    t.choose = (more = {}) => t.arcade.chooseDeck({ hid, load: t.lib.load, locks, ...more })
    return t
  }
  return { locks, a: await tab('a'), b: await tab('b') }
}

// A browser for one test: this navigator and a secure page, put back after.
async function asBrowser(navigator, fn) {
  const saved = ['navigator', 'window'].map(name => [name, Object.getOwnPropertyDescriptor(globalThis, name)])
  Object.defineProperty(globalThis, 'navigator', { value: navigator, configurable: true, writable: true })
  Object.defineProperty(globalThis, 'window', { value: { isSecureContext: true }, configurable: true, writable: true })
  try { return await fn() } finally {
    for (const [name, descriptor] of saved) {
      if (descriptor) Object.defineProperty(globalThis, name, descriptor)
      else delete globalThis[name]
    }
  }
}

test('one arcade tab holds the deck: the newer tab takes it, and the older lets go without blanking it or painting again', async () => {
  const { locks, a, b } = await twoTabs()
  a.lib.slow = true // its writes take a moment, so one is on its way when the deck is taken
  const deckA = await a.reopen({ steal: true })
  assert.ok(deckA)
  const lost = []
  const painterA = a.arcade.deckPainter(deckA, fakeArt(), { onLost: error => lost.push(error), stripGapMs: 0 })
  const offA = a.arcade.deckEvents(deckA, () => {})
  painterA.paint(fill('star'), strip())
  await flush() // the first key painted, the next on its way
  const seen = deckA.calls.length

  const deckB = await quiet(async () => { const d = await b.reopen({ steal: true }); await flush(); return d })
  assert.ok(deckB, 'the newer tab has the deck')
  assert.equal(locks.stolen, 1)
  assert.equal(b.arcade.deckProblem(), null)
  assert.deepEqual(lost.map(error => a.arcade.deckProblem(error)), ['tab'], "the older tab's onLost, once, with an error that says 'tab'")
  assert.equal(a.arcade.deckProblem(), 'tab')

  // the older page drops it, as its onLost does; whatever its painter is asked after that writes nothing
  offA()
  await painterA.close()
  painterA.paint(fill('mouse'), strip({ centre: 'later' }))
  await painterA.clear()
  await flush()
  assert.deepEqual(deckA.calls.slice(seen).map(c => c[0]).filter(name => name !== 'close'), [], 'no clear, no key and no strip once it was taken')
  assert.ok(deckA.closed && deckA.cleared, 'its handle closed and its listeners gone')
  assert.equal(a.hid.count('disconnect'), 0)
  assert.equal(lost.length, 1)

  // the newer tab paints on, and its close lets the lock go
  const painterB = b.arcade.deckPainter(deckB, fakeArt(), { stripGapMs: 0 })
  painterB.paint(fill('blank'), strip()); await painterB.idle()
  assert.deepEqual(lastFaces(deckB), fill('blank'))
  await painterB.close()
  assert.equal(locks.holder, null)
})

test('a tab closing its deck just as another tab takes it does not blank it, and its page hears nothing', async () => {
  const { a, b } = await twoTabs()
  a.lib.slow = true
  const deckA = await a.reopen({ steal: true })
  const lost = []
  const painterA = a.arcade.deckPainter(deckA, fakeArt(), { onLost: error => lost.push(error), stripGapMs: 0 })
  painterA.paint(fill('star'))
  await flush()
  const closing = painterA.close() // its clear waits for the write on its way
  const deckB = await b.reopen({ steal: true })
  await closing
  assert.ok(deckB && deckA.closed)
  assert.equal(named(deckA, 'clearPanel').length, 1, 'only the clear of its own open, never one after the other tab took it')
  assert.deepEqual(lost, [], 'a claim the page had let go is no longer its to lose')
  await b.arcade.deckPainter(deckB, fakeArt()).close()
})

test('an open that fails lets the claim go: busy, another model, or a set-up that fails', async () => {
  const { locks, a, b } = await twoTabs()
  const tries = [
    ['busy', () => { a.lib.error = chromeError('NotAllowedError', 'Failed to open the device.') }],
    ['other', () => { a.lib.error = null; a.lib.model = 'xl' }],
    ['gone', () => {
      a.lib.model = null
      const open = a.lib.openDevice
      a.lib.openDevice = async device => Object.assign(await open(device), { setBrightness: async () => { throw chromeError('NotAllowedError', 'Failed to write the feature report.') } })
    }],
  ]
  for (const [problem, setUp] of tries) {
    setUp()
    assert.equal(await quiet(() => a.reopen({ steal: true })), null, problem)
    assert.equal(a.arcade.deckProblem(), problem)
    assert.equal(locks.holder, null, `${problem}: the lock is free again`)
  }
  const deckB = await b.reopen() // so another tab's replug opens it
  assert.ok(deckB)
  assert.equal(locks.stolen, 0)
  await b.arcade.deckPainter(deckB, fakeArt()).close()
})

test('a replug while another arcade tab has the deck opens nothing and says so', async () => {
  const { locks, a, b } = await twoTabs()
  const deckA = await a.reopen({ steal: true })
  let replugged = null
  const unwatch = b.arcade.watchPlugs({ hid: b.hid, onPlug: () => { replugged = b.reopen() } }) // the page's onPlug: no steal
  b.hid.fire('connect', b.xl)
  assert.equal(await replugged, null)
  assert.equal(b.lib.opened.length, 0, 'the deck was never opened')
  assert.equal(b.arcade.deckProblem(), 'tab')
  assert.deepEqual(locks.asked.map(o => (o.steal ? 'steal' : o.ifAvailable ? 'if free' : 'queue')), ['steal', 'if free'])
  assert.equal(locks.stolen, 0, 'nothing taken from the tab that has it')
  assert.ok((await a.reopen()) === deckA, 'which still has it')
  unwatch()
  await a.arcade.deckPainter(deckA, fakeArt()).close()
})

test("a tab that lets go of the deck lets go of the lock too, unplugged or closed, so another tab's replug then opens it", async () => {
  const { locks, a, b } = await twoTabs()
  const deckA = await a.reopen({ steal: true })
  assert.equal(await b.reopen(), null, 'refused while the first tab has it')

  a.hid.fire('disconnect', a.xl) // unplugged
  await flush()
  assert.ok(deckA.closed)
  assert.equal(locks.holder, null, 'the lock went with it')
  const deckB = await b.reopen() // plugged in again: the other tab asks first
  assert.ok(deckB)
  assert.equal(b.arcade.deckProblem(), null)

  await b.arcade.deckPainter(deckB, fakeArt()).close() // closed: its page went
  assert.equal(locks.holder, null)
  const again = await a.reopen()
  assert.ok(again && again !== deckA, 'and the first tab opens it again, asking only if it is free')
  assert.equal(locks.stolen, 0, 'nobody took it from anyone')
  await a.arcade.deckPainter(again, fakeArt()).close()
})

test("a tab's own lock never refuses its next open, nor is taken by it: StrictMode's mount, cleanup and mount, a replug, and Connect after a loss", async () => {
  const { locks, a } = await twoTabs({ slowRelease: true }) // so a next open that asked too soon would meet its own lock
  // StrictMode runs the open on load twice at once: one open, one claim
  const [first, second] = await Promise.all([a.reopen({ steal: true }), a.reopen({ steal: true })])
  assert.ok(first && first === second)
  assert.equal(locks.asked.length, 1, 'one claim for both')

  // mount, cleanup and mount with the deck already open (a hot reload): the close lets the lock go before the next open asks
  const closing = a.arcade.deckPainter(first, fakeArt()).close()
  const remount = a.reopen({ steal: true })
  await closing
  const third = await remount
  assert.ok(third && third !== first)

  // a replug's open, which asks only if the deck is free, after the page let go of it
  await a.arcade.deckPainter(third, fakeArt()).close()
  const replug = await a.reopen()
  assert.ok(replug, 'not refused by its own lock')

  // Connect after a loss: a write fails, the page drops its painter, and Connect opens the deck again
  replug.sendPreparedBuffer = async () => { throw chromeError('NotAllowedError', 'Failed to write the report.') }
  const lost = []
  const painter = a.arcade.deckPainter(replug, fakeArt(), { onLost: error => lost.push(error), stripGapMs: 0 })
  await quiet(async () => { painter.paint(fill('star')); await painter.idle(); await flush() })
  assert.equal(lost.length, 1)
  await painter.close() // the page's drop
  const connected = await a.choose({ steal: true })
  assert.ok(connected && connected !== replug)
  assert.equal(a.arcade.deckProblem(), null)

  assert.equal(locks.stolen, 0, 'it never took the lock from itself')
  assert.ok(locks.asked.every(o => o.name === 'arcade-deck' && (o.steal || o.ifAvailable)), 'every claim steals or asks only if free: none waits in a queue')
  await a.arcade.deckPainter(connected, fakeArt()).close()
  assert.equal(locks.holder, null)
})

test('a steal while a tab is still opening the deck: that open closes it again, never blanked, and says so', async () => {
  // the other tab takes it while this one opens the device, or while it sets the brightness
  for (const [step, calls] of [['openDevice', ['close']], ['setBrightness', ['setBrightness', 'close']]]) {
    const { locks, a, b } = await twoTabs()
    let reached = null
    let go = null
    const inStep = new Promise(resolve => { reached = resolve })
    const gate = new Promise(resolve => { go = resolve })
    const open = a.lib.openDevice
    a.lib.openDevice = async device => {
      if (step === 'openDevice') { reached(); await gate }
      const deck = await open(device)
      const set = deck.setBrightness
      if (step === 'setBrightness') deck.setBrightness = async percent => { reached(); await gate; return set(percent) }
      return deck
    }
    const opening = a.reopen({ steal: true })
    await inStep // the claim is this tab's, and the deck is on its way
    const deckB = await b.reopen({ steal: true })
    assert.ok(deckB, step)
    go()
    assert.equal(await opening, null, step)
    const [deckA] = a.lib.decks
    assert.deepEqual(deckA.calls.map(c => c[0]), calls, `${step}: closed again, never blanked, so the other tab keeps what it paints`)
    assert.equal(a.arcade.deckProblem(), 'tab', step)
    assert.equal(locks.stolen, 1, step)
    assert.ok(locks.holder, `${step}: the lock stays the other tab's`)
    await b.arcade.deckPainter(deckB, fakeArt()).close()
  }
})

test('a tab with no painter on the deck yet lets it go the same way when another tab takes it', async () => {
  const { locks, a, b } = await twoTabs()
  const deckB = await b.reopen({ steal: true }) // opened, and the page has not painted it yet
  const seen = deckB.calls.length
  const deckA = await a.choose({ steal: true }) // Connect, in the other tab
  await flush()
  assert.ok(deckA)
  assert.deepEqual(deckB.calls.slice(seen).map(c => c[0]), ['close'], 'closed, never blanked')
  assert.ok(deckB.cleared)
  assert.equal(b.arcade.deckProblem(), 'tab')
  assert.equal(locks.stolen, 1)
  assert.equal(await b.reopen(), null, 'and a replug there leaves it be')
  assert.equal(b.lib.opened.length, 1)
  await a.arcade.deckPainter(deckA, fakeArt()).close()
  assert.equal(locks.holder, null)
})

test('without Web Locks (an older browser) the deck opens as it always has; with them the claim goes through navigator.locks', async () => {
  const arcade = await import(`../src/lib/arcadeDeck.js?browser=${++copies}`)
  for (const locks of [undefined, fakeLocks()]) {
    await asBrowser({ hid: {}, locks }, async () => {
      const lib = fakeLib()
      const deck = await arcade.reopenDeck({ hid: fakeHid([fakeDevice(XL)]), load: lib.load, steal: true })
      assert.ok(deck, locks ? 'with Web Locks' : 'without them')
      if (locks) assert.deepEqual(locks.asked, [{ name: 'arcade-deck', steal: true }])
      await arcade.deckPainter(deck, fakeArt()).close()
      assert.equal(named(deck, 'clearPanel').length, 2, 'set up, then blanked when the page let it go')
      if (locks) assert.equal(locks.holder, null)
    })
  }
})
