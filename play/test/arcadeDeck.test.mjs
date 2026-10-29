import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { deckEvents, deckPainter, watchPlugs, reopenDeck, chooseDeck, deckSupported, deckProblem, encodeJpeg } from '../src/lib/arcadeDeck.js'

// Miss Boo LaRue's Arcade: the Stream Deck + XL link (build spec section 11).
// Fakes only: a deck that records every write, an art that hands back tagged
// buffers, a navigator.hid, a library and, for the JPEGs, a browser's
// canvases. The real @elgato-stream-deck/webhid is never loaded here. The
// recorded calls hold full-size picture buffers, so the assertions compare
// names and small tuples only (assert would print a buffer in full).

const FACE_BYTES = 112 * 112 * 4
const STRIP_BYTES = 1200 * 100 * 4
const PART_BYTES = 200 * 100 * 4 // one of the strip's six parts
const PARTS = [0, 200, 400, 600, 800, 1000] // where each part of the strip starts, left to right
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

// console.warn's lines while fn runs, kept off the terminal.
async function warnings(fn) {
  const warn = console.warn
  const lines = []
  console.warn = (...args) => { lines.push(args.join(' ')) }
  try { await fn() } finally { console.warn = warn }
  return lines
}

// A deck shaped like StreamDeckWeb: on/off like eventemitter3, and every write
// recorded (and every prepared buffer it hands back, in buffers). slow: each
// write waits a turn of the event loop; slowClose: so does close, as a real
// device's does. fail: { when, error }.
function fakeDeck({ model = 'plus-xl', device = null, slow = false, slowClose = false, fail = null } = {}) {
  const listeners = new Map()
  const deck = {
    MODEL: model,
    modelInfo: { id: model },
    calls: [],
    buffers: [],
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
    prepareFillKeyBuffer: (i, rgba, options) => write('prepareFillKeyBuffer', [i, rgba, options], () => {
      const buffer = { key: i, rgba }
      deck.buffers.push(buffer)
      return buffer
    }),
    sendPreparedBuffer: buffer => write('sendPreparedBuffer', [buffer]),
    fillLcd: (i, rgba, options) => write('fillLcd', [i, rgba, options]),
    fillLcdRegion: (i, x, y, rgba, options) => write('fillLcdRegion', [i, x, y, rgba, options]),
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
// 'flat' as flat colours. A strip's picture is six parts of 200 pixels, each
// all one value: strip.bands[part] when the strip gives bands, else a value of
// its own for each new strip (200 and up), so two strips with different words
// differ in every part, and a test that gives bands says which parts differ.
function fakeArt() {
  const faces = new Map()
  const strips = new Map()
  return {
    faceRgba(id) {
      if (!faces.has(id)) faces.set(id, Object.assign(new Uint8ClampedArray(FACE_BYTES), { face: id }))
      return faces.get(id)
    },
    faceSolid: id => (id === 'off' ? [0, 0, 0] : id === 'flat' ? [31, 157, 74] : null),
    stripRgba(spec) {
      const json = JSON.stringify(spec)
      if (!strips.has(json)) {
        const own = 200 + (strips.size % 50)
        const rgba = new Uint8ClampedArray(STRIP_BYTES)
        for (let part = 0; part < 6; part++) {
          const value = spec?.bands?.[part] ?? own
          for (let y = 0; y < 100; y++) rgba.fill(value, (y * 1200 + part * 200) * 4, (y * 1200 + part * 200 + 200) * 4)
        }
        strips.set(json, Object.assign(rgba, { strip: json }))
      }
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
// The strip's parts that went, in order: [x, value] (each part of the fake art's strip is one value).
const stripParts = deck => named(deck, 'fillLcdRegion').map(c => [c[2], c[4][0]])
// Every write that shows something, in order and short: 'k5' key 5, 's400'
// the part of the strip at x 400, 'strip' the whole strip, 'clear' the deck.
const shown = deck => deck.calls.flatMap(([name, ...a]) =>
  name === 'fillKeyColor' ? [`k${a[0]}`]
    : name === 'sendPreparedBuffer' ? [`k${a[0].key}`]
      : name === 'fillLcdRegion' ? [`s${a[1]}`]
        : name === 'fillLcd' ? ['strip']
          : name === 'clearPanel' ? ['clear'] : [])
// The pictures made ready, in order: 'key|face'.
const prepared = deck => named(deck, 'prepareFillKeyBuffer').map(c => `${c[1]}|${c[2].face}`)

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
// options: what each openDevice was handed, in order.
function fakeLib() {
  const lib = {
    opened: [], options: [], decks: [], error: null, model: null, slowClose: false, slow: false,
    async openDevice(device, options) {
      lib.opened.push(device)
      lib.options.push(options)
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

test("the deck's presses become the arcade's events: keys, dial presses and turns, strip taps short or long, and swipes", () => {
  const deck = fakeDeck()
  const got = []
  const errors = []
  const pages = []
  deck.on('down', () => pages.push('down')) // the page's own listener, untouched by ours
  const names = ['down', 'up', 'rotate', 'lcdShortPress', 'lcdLongPress', 'lcdSwipe', 'error', 'nfcRead']
  const before = names.map(n => deck.count(n))
  const off = deckEvents(deck, event => got.push(event), error => errors.push(error))
  const segment = { type: 'lcd-segment', id: 0, index: 0 }

  deck.emit('down', { type: 'button', index: 7 })
  deck.emit('down', { type: 'encoder', index: 2 })
  deck.emit('rotate', { type: 'encoder', index: 4 }, -3)
  deck.emit('rotate', { type: 'encoder', index: 0 }, 1)
  deck.emit('lcdShortPress', segment, { x: 640, y: 50 })
  deck.emit('lcdLongPress', segment, { x: 10, y: 10 }) // a slow tap is still a tap
  deck.emit('lcdSwipe', segment, { x: 10, y: 10 }, { x: 900, y: 10 })
  deck.emit('lcdSwipe', segment, { x: 1150, y: 80 }, { x: 300, y: 20 }) // right to left
  deck.emit('lcdShortPress', segment) // no position given: the left end
  deck.emit('lcdLongPress', segment)
  deck.emit('lcdSwipe', segment)
  // ignored: releases, a turn of nothing and the NFC reader
  deck.emit('up', { type: 'button', index: 7 })
  deck.emit('up', { type: 'encoder', index: 2 })
  deck.emit('rotate', { type: 'encoder', index: 1 }, 0)
  deck.emit('rotate', { type: 'encoder', index: 1 }, NaN)
  deck.emit('nfcRead', 'abc')
  const boom = new Error('boom')
  deck.emit('error', boom)

  assert.deepEqual(got, [
    { kind: 'key', index: 7 },
    { kind: 'press', dial: 2 },
    { kind: 'turn', dial: 4, amount: -3 },
    { kind: 'turn', dial: 0, amount: 1 },
    { kind: 'strip', x: 640 },
    { kind: 'strip', x: 10 },
    { kind: 'swipe', from: 10, to: 900 },
    { kind: 'swipe', from: 1150, to: 300 },
    { kind: 'strip', x: 0 },
    { kind: 'strip', x: 0 },
    { kind: 'swipe', from: 0, to: 0 },
  ])
  assert.deepEqual(errors, [boom])

  off()
  assert.deepEqual(names.map(n => deck.count(n)), before, 'exactly our listeners went')
  deck.emit('down', { type: 'button', index: 1 })
  deck.emit('rotate', { type: 'encoder', index: 1 }, 1)
  deck.emit('lcdLongPress', segment, { x: 5, y: 5 })
  deck.emit('lcdSwipe', segment, { x: 5, y: 5 }, { x: 50, y: 5 })
  assert.equal(got.length, 11, 'nothing after the unsubscribe')
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

// ---- the painter: the keys ---------------------------------------------------

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

test('paint() takes its options as null or left out, as well as { urgent }', async () => {
  const deck = fakeDeck()
  const p = deckPainter(deck, fakeArt(), { stripGapMs: 0 })
  p.paint(fill('star'), null, null)
  p.paint(fill('blank'), null)
  await p.idle()
  assert.deepEqual(lastFaces(deck), fill('blank'))
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
  assert.deepEqual(writes[1], [0, 'mouse'], 'key 0, the first key still to change, gets its newest face next')
  assert.deepEqual(writes.slice(2).map(([i]) => i), Array.from({ length: 35 }, (_, i) => i + 1), 'then the rest, left to right')
  await p.close()
})

test('the keys a press changed (urgent) are painted before any other, even while an earlier paint is on its way', async () => {
  const deck = fakeDeck({ slow: true })
  const p = deckPainter(deck, fakeArt(), { stripGapMs: 0 })
  p.paint(fill('star')) // key 0 is on its way at once
  const next = fill('star')
  next[7] = 'blank'
  next[12] = 'mouse'
  next[30] = 'off'
  p.paint(next, null, { urgent: [30, 12, -1, 36, 2.5, '7', null] }) // only real key numbers count
  await p.idle()
  const writes = keyWrites(deck)
  assert.deepEqual(writes.slice(0, 3), [[0, 'star'], [12, 'mouse'], [30, 'rgb(0,0,0)']], 'after the write on its way: the urgent keys, left to right, a flat one too')
  const rest = Array.from({ length: 36 }, (_, i) => i).filter(i => i !== 0 && i !== 12 && i !== 30)
  assert.deepEqual(writes.slice(3).map(([i]) => i), rest, 'then every other key, left to right')
  assert.deepEqual(lastFaces(deck), next.map(face => (face === 'off' ? 'rgb(0,0,0)' : face)), 'each with its newest face')
  assert.equal(deck.most, 1)

  deck.calls.length = 0
  p.paint(next, null, { urgent: [3, 12] })
  await p.idle()
  assert.deepEqual(deck.calls.map(c => c[0]), [], 'an urgent key with nothing new to show is not painted again')
  await p.close()
})

test('keys gaining a picture are painted before keys going back to a flat colour, each left to right', async () => {
  const deck = fakeDeck()
  const p = deckPainter(deck, fakeArt(), { stripGapMs: 0 })
  p.paint(fill('star')); await p.idle()
  deck.calls.length = 0
  const next = fill('star')
  next[0] = 'off'
  next[1] = 'flat'
  next[5] = 'mouse'
  next[20] = 'off'
  next[33] = 'blank'
  p.paint(next); await p.idle()
  assert.deepEqual(keyWrites(deck), [[5, 'mouse'], [33, 'blank'], [0, 'rgb(0,0,0)'], [1, 'rgb(31,157,74)'], [20, 'rgb(0,0,0)']])

  deck.calls.length = 0
  const back = fill('star')
  back[2] = 'off'
  p.paint(back, null, { urgent: [20] }); await p.idle()
  assert.deepEqual(keyWrites(deck).map(([i]) => i), [20, 0, 1, 5, 33, 2], 'the urgent key, then the pictures, then the flat one')
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
  assert.deepEqual(keyWrites(deck)[0], [2, 'star'], 'the one picture first')
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

// ---- the painter: the touch strip --------------------------------------------

test('the strip goes in six parts of 200 pixels, and after the first only the parts that changed', async () => {
  const deck = fakeDeck()
  const p = deckPainter(deck, fakeArt(), { stripGapMs: 0 })
  const faces = fill('off')
  const A = strip({ bands: [1, 2, 3, 4, 5, 6] })
  p.paint(faces, A); await p.idle()
  const sent = named(deck, 'fillLcdRegion')
  assert.deepEqual(sent.map(c => [c[1], c[2], c[3]]), PARTS.map(x => [0, x, 0]), 'lcd 0, every part from the left, at the top')
  assert.ok(sent.every(c => c[4].length === PART_BYTES), 'each part 200 by 100 pixels')
  assert.ok(sent.every(c => JSON.stringify(c[5]) === JSON.stringify({ format: 'rgba', width: 200, height: 100 })), 'in RGBA, 200 by 100')
  assert.deepEqual(stripParts(deck).map(([, value]) => value), [1, 2, 3, 4, 5, 6])

  deck.calls.length = 0
  p.paint(faces, strip({ bands: [1, 2, 3, 4, 5, 6] })); await p.idle() // the same strip, a new object
  p.paint(faces, strip({ bands: [1, 2, 3, 4, 5, 6], left: 'New words' })); await p.idle() // new words, the same picture
  assert.deepEqual(deck.calls.map(c => c[0]), [], 'the same picture: nothing sent')

  p.paint(faces, strip({ bands: [1, 2, 9, 4, 5, 7] })); await p.idle()
  assert.deepEqual(stripParts(deck), [[400, 9], [1000, 7]], 'only the two parts that changed')
  p.paint(faces, A); await p.idle()
  assert.deepEqual(stripParts(deck).slice(2), [[400, 3], [1000, 6]], 'and only those two back again')
  assert.equal(named(deck, 'fillLcd').length, 0, 'never the whole strip')
  await p.close()
})

test('each part of the strip holds exactly its own 200 columns, row by row', async () => {
  // every pixel says where it is: red and green its column, blue its row
  const where = new Uint8ClampedArray(STRIP_BYTES)
  for (let y = 0; y < 100; y++) {
    for (let x = 0; x < 1200; x++) {
      const at = (y * 1200 + x) * 4
      where[at] = x & 255
      where[at + 1] = x >> 8
      where[at + 2] = y
      where[at + 3] = 255
    }
  }
  const moved = where.slice() // only the part at x 600 changes: its blue is the row plus 100
  for (let y = 0; y < 100; y++) for (let x = 600; x < 800; x++) moved[(y * 1200 + x) * 4 + 2] = y + 100
  const art = { ...fakeArt(), stripRgba: spec => (spec.moved ? moved : where) }
  const deck = fakeDeck()
  const p = deckPainter(deck, art, { stripGapMs: 0 })
  p.paint(fill('off'), { moved: false }); await p.idle()
  p.paint(fill('off'), { moved: true }); await p.idle()
  const sent = named(deck, 'fillLcdRegion')
  assert.deepEqual(sent.map(c => c[2]), [...PARTS, 600])
  const misplaced = sent.map(([, , x0, , part], n) => {
    let wrong = 0
    for (let y = 0; y < 100; y++) {
      for (let c = 0; c < 200; c++) {
        const at = (y * 200 + c) * 4
        const x = x0 + c
        const blue = n === 6 ? y + 100 : y
        if (part[at] !== (x & 255) || part[at + 1] !== x >> 8 || part[at + 2] !== blue || part[at + 3] !== 255) wrong++
      }
    }
    return wrong
  })
  assert.deepEqual(misplaced, [0, 0, 0, 0, 0, 0, 0], 'no pixel out of place in any part')
  await p.close()
})

test('the strip goes after the keys, and a key changed meanwhile goes before the rest of the strip', async () => {
  const deck = fakeDeck({ slow: true })
  const p = deckPainter(deck, fakeArt(), { stripGapMs: 0 })
  const faces = fill('off')
  const send = deck.fillLcdRegion
  deck.fillLcdRegion = (...args) => {
    if (args[1] === 0) { const next = faces.slice(); next[9] = 'mouse'; p.paint(next) } // a press while the first part is on its way
    return send(...args)
  }
  p.paint(faces, strip())
  await p.idle()
  const keys = Array.from({ length: 36 }, (_, i) => `k${i}`)
  assert.deepEqual(shown(deck), [...keys, 's0', 'k9', 's200', 's400', 's600', 's800', 's1000'])
  assert.equal(deck.most, 1, 'one write at a time')
  await p.close()
})

test('a newer strip replaces the parts still waiting from an older one, and skips what the deck already shows', async () => {
  const deck = fakeDeck({ slow: true })
  const p = deckPainter(deck, fakeArt(), { stripGapMs: 0 })
  p.paint(null, strip({ bands: [1, 1, 1, 1, 1, 1] })) // its first part is on its way at once
  p.paint(null, strip({ bands: [1, 2, 2, 2, 2, 2] }))
  await p.idle()
  assert.deepEqual(stripParts(deck), [[0, 1], [200, 2], [400, 2], [600, 2], [800, 2], [1000, 2]])
  assert.deepEqual(keyWrites(deck), [], 'no faces asked for: no key painted')
  await p.close()
})

test('a new strip is taken at most every stripGapMs: one asked for too soon waits, then the newest goes by itself', async () => {
  const deck = fakeDeck()
  const p = deckPainter(deck, fakeArt(), { stripGapMs: 60 })
  const faces = fill('off')
  p.paint(faces, strip({ bands: [1, 1, 1, 1, 1, 1] })); await p.idle()
  assert.equal(stripParts(deck).length, 6)
  p.paint(faces, strip({ bands: [2, 2, 2, 2, 2, 2] }))
  p.paint(faces, strip({ bands: [3, 3, 3, 1, 1, 1] }))
  await p.idle()
  assert.equal(stripParts(deck).length, 6, 'held back: too soon after the last')
  const next = faces.slice()
  next[3] = 'mouse'
  p.paint(next); await p.idle()
  assert.deepEqual(keyWrites(deck).at(-1), [3, 'mouse'], 'a key is never held back by the strip')
  await sleep(150)
  await p.idle()
  assert.deepEqual(stripParts(deck).slice(6), [[0, 3], [200, 3], [400, 3]], 'then the newest, with no paint needed, only where it differs; the one between never shown')
  await sleep(70) // longer than the gap since that strip went, however late its timer came
  p.paint(faces, strip({ bands: [3, 3, 3, 1, 1, 4] })); await p.idle()
  assert.deepEqual(stripParts(deck).slice(9), [[1000, 4]], 'long enough after the last: at once')
  await p.close()
})

test('with wholeStrip the whole strip goes in one fillLcd, every time it changes', async () => {
  const deck = fakeDeck()
  const art = fakeArt()
  const p = deckPainter(deck, art, { stripGapMs: 0, wholeStrip: true })
  const faces = fill('off')
  const A = strip({ bands: [1, 2, 3, 4, 5, 6] })
  p.paint(faces, A); await p.idle()
  p.paint(faces, strip({ bands: [1, 2, 3, 4, 5, 6] })); await p.idle() // the same strip again: nothing
  p.paint(faces, strip({ bands: [1, 2, 3, 4, 5, 6], left: 'New words' })); await p.idle() // the same picture, new words: whole all the same
  p.paint(faces, strip({ bands: [1, 2, 9, 4, 5, 6] })); await p.idle()
  const whole = named(deck, 'fillLcd')
  assert.equal(whole.length, 3)
  assert.ok(whole.every(c => c[1] === 0), 'lcd 0: the touch strip')
  assert.ok(whole[0][2] === art.stripRgba(A), "the art's own strip, untouched")
  assert.ok(whole.every(c => c[2].length === STRIP_BYTES))
  assert.ok(whole.every(c => JSON.stringify(c[3]) === JSON.stringify({ format: 'rgba', width: 1200, height: 100 })), 'in RGBA, 1200 by 100')
  assert.deepEqual(whole.map(c => JSON.parse(c[2].strip).bands[2]), [3, 3, 9], 'the newest each time')
  assert.equal(named(deck, 'fillLcdRegion').length, 0, 'never in parts')
  await p.clear()
  p.paint(faces, A); await p.idle()
  assert.equal(named(deck, 'fillLcd').length, 4, 'after a clear, the strip goes whole again')
  await p.close()
})

test('a strip the art cannot draw leaves the strip as it is, is said once, and the painter carries on', async () => {
  const deck = fakeDeck()
  const art = fakeArt()
  const draw = art.stripRgba
  art.stripRgba = spec => (spec.broken ? new Uint8ClampedArray(16) : draw(spec))
  const lost = []
  const p = deckPainter(deck, art, { onLost: error => lost.push(error), stripGapMs: 0 })
  const faces = fill('off')
  const lines = await warnings(async () => {
    p.paint(faces, strip({ bands: [1, 2, 3, 4, 5, 6] })); await p.idle()
    p.paint(faces, strip({ broken: 1 })); await p.idle()
    p.paint(faces, strip({ broken: 2 })); await p.idle()
  })
  assert.equal(stripParts(deck).length, 6, 'only the strip that could be drawn')
  assert.deepEqual(lines, ['Stream Deck + XL: no picture for the strip.'], 'said once')
  const next = faces.slice()
  next[8] = 'mouse'
  p.paint(next, strip({ bands: [1, 2, 3, 4, 5, 9] })); await p.idle()
  assert.deepEqual(keyWrites(deck).at(-1), [8, 'mouse'])
  assert.deepEqual(stripParts(deck).slice(6), [[1000, 9]], 'the next strip that can be drawn goes, by what the deck shows')
  assert.deepEqual(lost, [])
  await p.close()
})

test('a strip the art cannot draw, asked for while an older strip is half sent, leaves the older strip whole', async () => {
  const deck = fakeDeck({ slow: true })
  const art = fakeArt()
  const draw = art.stripRgba
  art.stripRgba = spec => (spec.broken ? new Uint8ClampedArray(16) : draw(spec))
  const p = deckPainter(deck, art, { stripGapMs: 0 })
  await quiet(async () => {
    p.paint(null, strip({ bands: [1, 1, 1, 1, 1, 1] })) // its first part is on its way at once
    p.paint(null, strip({ broken: true }))
    await p.idle()
  })
  assert.deepEqual(stripParts(deck), PARTS.map(x => [x, 1]), 'all six parts of the older strip')
  await p.close()
})

// ---- the painter: faces made ready before they are shown (warm) --------------

test('warm() makes pictures ready on key 0 and sends nothing; flat faces and faces already warmed are skipped', async () => {
  const deck = fakeDeck()
  const p = deckPainter(deck, fakeArt(), { stripGapMs: 0 })
  p.warm(['mouse', 'star', 'off', 'flat', 'mouse', 42, null])
  await p.idle()
  assert.deepEqual(prepared(deck), ['0|mouse', '0|star'])
  const first = named(deck, 'prepareFillKeyBuffer')[0]
  assert.deepEqual(first[3], { format: 'rgba' })
  assert.equal(first[2].length, FACE_BYTES)
  assert.deepEqual(deck.calls.map(c => c[0]).filter(name => name !== 'prepareFillKeyBuffer'), [], 'nothing sent: no key, no strip, no clear')

  p.warm(['mouse', 'yarn', 'star'])
  await p.idle()
  assert.deepEqual(prepared(deck), ['0|mouse', '0|star', '0|yarn'], 'only the face not warmed yet')

  const faces = fill('off')
  faces[0] = 'mouse'
  faces[9] = 'star'
  p.paint(faces); await p.idle()
  assert.deepEqual(prepared(deck), ['0|mouse', '0|star', '0|yarn', '9|star'], "key 0 shows its warmed picture without drawing it again; key 9 makes its own")
  const sends = named(deck, 'sendPreparedBuffer').map(c => c[1])
  assert.deepEqual(sends.map(b => b.key), [0, 9])
  assert.ok(sends[0] === deck.buffers[0], 'the very buffer warm() made ready')
  await p.close()

  const none = deckPainter(null, fakeArt()) // no deck: a painter that does nothing
  none.warm(['mouse'])
  none.paint(fill('mouse'), strip())
  await none.idle()
  await none.clear()
  await none.close()
})

test('warming waits for the keys and the strip: anything asked for meanwhile goes before the faces still to warm', async () => {
  const deck = fakeDeck({ slow: true })
  const p = deckPainter(deck, fakeArt(), { stripGapMs: 0 })
  p.warm(['a', 'b', 'c']) // 'a' is on its way at once
  const faces = new Array(36).fill(null)
  faces[4] = 'mouse'
  faces[5] = 'off'
  p.paint(faces, strip({ bands: [1, 1, 1, 1, 1, 1] }))
  await p.idle()
  const order = deck.calls.map(([name, ...a]) =>
    name === 'prepareFillKeyBuffer' ? `prepare ${a[0]} ${a[1].face}`
      : name === 'sendPreparedBuffer' ? `send ${a[0].key}`
        : name === 'fillKeyColor' ? `colour ${a[0]}`
          : name === 'fillLcdRegion' ? `part ${a[1]}` : name)
  assert.deepEqual(order, [
    'prepare 0 a',
    'prepare 4 mouse', 'send 4', 'colour 5',
    'part 0', 'part 200', 'part 400', 'part 600', 'part 800', 'part 1000',
    'prepare 0 b', 'prepare 0 c',
  ])
  assert.equal(deck.most, 1, 'one write at a time, warming too')
  await p.close()
})

test('a face that fails to warm is skipped quietly: the deck is kept, the rest are warmed, and it is made when first shown', async () => {
  let failures = 1
  const error = new Error('no JPEG')
  const deck = fakeDeck({ fail: { when: (name, args) => name === 'prepareFillKeyBuffer' && args[1].face === 'star' && failures-- > 0, error } })
  const lost = []
  const p = deckPainter(deck, fakeArt(), { onLost: e => lost.push(e), stripGapMs: 0 })
  const lines = await warnings(async () => { p.warm(['mouse', 'star', 'yarn']); await p.idle() })
  assert.deepEqual(prepared(deck), ['0|mouse', '0|star', '0|yarn'])
  assert.deepEqual(lost, [], 'not lost')
  assert.deepEqual(lines, [], 'and nothing said')
  assert.ok(!deck.closed)
  const faces = fill('off')
  faces[0] = 'star'
  p.paint(faces); await p.idle()
  assert.deepEqual(prepared(deck).at(-1), '0|star', 'made when it is first shown')
  assert.deepEqual(keyWrites(deck)[0], [0, 'star'])
  assert.deepEqual(lost, [])
  await p.close()
})

test('clear() forgets what was warmed, and drops the faces still waiting to be warmed', async () => {
  const deck = fakeDeck({ slow: true })
  const p = deckPainter(deck, fakeArt(), { stripGapMs: 0 })
  p.warm(['mouse', 'star', 'yarn']) // 'mouse' is on its way at once
  await p.clear()
  assert.deepEqual(deck.calls.map(c => c[0]), ['prepareFillKeyBuffer', 'clearPanel'], 'the rest were dropped')

  p.warm(['mouse', 'star']); await p.idle()
  assert.deepEqual(prepared(deck), ['0|mouse', '0|mouse', '0|star'], 'warmed again after the clear, so new art shows')

  await p.clear()
  const faces = fill('off')
  faces[0] = 'star'
  p.paint(faces); await p.idle()
  assert.deepEqual(prepared(deck), ['0|mouse', '0|mouse', '0|star', '0|star'], 'the warmed picture was forgotten too: drawn afresh')
  await p.close()
})

test('warm() asked for straight after clear(), before the deck is blank, still warms the faces warmed before the clear', async () => {
  const deck = fakeDeck()
  const p = deckPainter(deck, fakeArt(), { stripGapMs: 0 })
  p.warm(['mouse']); await p.idle()
  p.clear() // not waited for: new art, then the faces again
  p.warm(['mouse'])
  await p.idle()
  assert.deepEqual(prepared(deck), ['0|mouse', '0|mouse'], 'made ready again after the clear forgot it')
  await p.close()
})

// ---- the painter: when things go wrong, clear, close, and the page going ----

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
  assert.equal(named(deck, 'fillLcdRegion').length + named(deck, 'fillLcd').length, 0, 'the strip was never reached')
  assert.ok(deck.closed, 'the deck is let go and closed, so Connect opens it afresh')
  assert.ok(deck.cleared, 'and our listeners on it are gone')
  assert.equal(deckProblem(lost[0]), 'gone')
  assert.equal(deckProblem(), 'gone', 'the last problem, with nothing passed')

  const seen = deck.calls.length
  p.paint(fill('blank'), strip({ centre: 'x' }))
  p.paint(fill('mouse'))
  p.warm(['yarn'])
  await p.clear()
  await flush()
  assert.equal(deck.calls.length, seen, 'nothing more is written, not even a face made ready')
  assert.equal(lost.length, 1)
  await p.close()
  assert.equal(named(deck, 'clearPanel').length, 0, 'closing a lost deck does not try to clear it')
})

test('a part of the strip that fails to go is lost the same way: onLost once, and nothing more', async () => {
  const error = chromeError('NotAllowedError', 'Failed to write the report.')
  const deck = fakeDeck({ fail: { when: (name, args) => name === 'fillLcdRegion' && args[1] === 400, error } })
  const lost = []
  const p = deckPainter(deck, fakeArt(), { onLost: e => lost.push(e), stripGapMs: 0 })
  await quiet(async () => {
    p.paint(fill('off'), strip())
    await p.idle()
    await flush()
  })
  assert.deepEqual(lost, [error])
  assert.deepEqual(stripParts(deck).map(([x]) => x), [0, 200, 400], 'it stopped at the part that failed')
  assert.ok(deck.closed)
  assert.equal(deckProblem(lost[0]), 'gone')
  const seen = deck.calls.length
  p.paint(fill('star'), strip({ centre: 'later' }))
  p.warm(['mouse'])
  await p.idle()
  await flush()
  assert.equal(deck.calls.length, seen, 'nothing more is written')
  await p.close()
  assert.equal(named(deck, 'clearPanel').length, 0)
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
  assert.deepEqual(stripParts(deck).map(([x]) => x), PARTS, 'and every part of the strip, though it is the same strip')
  assert.equal(named(deck, 'prepareFillKeyBuffer').length, 4, 'pictures drawn afresh, so new art shows')

  deck.calls.length = 0
  await p.close()
  assert.deepEqual(deck.calls.map(c => c[0]), ['clearPanel', 'close'])
  assert.ok(deck.cleared)
  p.paint(fill('mouse'), strip({ centre: 'later' }))
  p.warm(['yarn'])
  await flush()
  assert.deepEqual(deck.calls.map(c => c[0]), ['clearPanel', 'close'], 'nothing after close')
})

test('leaving the page blanks the deck (pagehide), and a closed painter stops listening for it', async () => {
  const listeners = new Map()
  const page = {
    addEventListener: (type, fn) => listeners.set(type, [...(listeners.get(type) ?? []), fn]),
    removeEventListener: (type, fn) => listeners.set(type, (listeners.get(type) ?? []).filter(f => f !== fn)),
  }
  const saved = Object.getOwnPropertyDescriptor(globalThis, 'window')
  Object.defineProperty(globalThis, 'window', { value: page, configurable: true, writable: true })
  try {
    const deck = fakeDeck()
    const p = deckPainter(deck, fakeArt(), { stripGapMs: 0 })
    assert.equal(listeners.get('pagehide')?.length, 1)
    p.paint(fill('star'), strip()); await p.idle()
    deck.calls.length = 0
    for (const fn of listeners.get('pagehide')) fn({ type: 'pagehide' })
    await p.idle()
    assert.deepEqual(deck.calls.map(c => c[0]), ['clearPanel'], 'blanked, and nothing painted again')
    await p.close()
    assert.equal(listeners.get('pagehide').length, 0)
  } finally {
    if (saved) Object.defineProperty(globalThis, 'window', saved)
    else delete globalThis.window
  }
})

test('a second painter on the same deck takes over: still one write at a time', async () => {
  const deck = fakeDeck({ slow: true })
  const art = fakeArt()
  const first = deckPainter(deck, art, { stripGapMs: 0 })
  first.paint(fill('star'))
  const second = deckPainter(deck, art, { stripGapMs: 0 }) // React StrictMode mounts twice
  second.paint(fill('blank'))
  first.paint(fill('mouse')) // the first one is retired: ignored
  first.warm(['yarn'])
  await first.idle()
  await second.idle()
  assert.equal(deck.most, 1)
  assert.deepEqual(lastFaces(deck), fill('blank'))
  assert.ok(keyWrites(deck).every(([, face]) => face !== 'mouse'))
  assert.ok(!prepared(deck).includes('0|yarn'), 'nor does it warm')
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

// ---- opening the deck ----------------------------------------------------------

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

test("the deck is opened with the arcade's own JPEG maker (openDevice's encodeJPEG), by reopenDeck and by chooseDeck", async () => {
  const lib = fakeLib()
  const xl = fakeDevice(XL)
  const hid = fakeHid([xl])
  hid.chosen = [xl]
  const deck = await reopenDeck({ hid, load: lib.load })
  assert.ok(deck)
  assert.equal(lib.options.length, 1)
  assert.ok(lib.options[0]?.encodeJPEG === encodeJpeg, 'reopenDeck')
  await deckPainter(deck, fakeArt()).close()
  const chosen = await chooseDeck({ hid, load: lib.load })
  assert.ok(chosen && chosen !== deck)
  assert.ok(lib.options[1]?.encodeJPEG === encodeJpeg, 'chooseDeck')
  await deckPainter(chosen, fakeArt()).close()
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
  painterA.warm(['yarn'])
  await painterA.clear()
  await flush()
  assert.deepEqual(deckA.calls.slice(seen).map(c => c[0]).filter(name => name !== 'close'), [], 'no clear, no key, no strip and no face made ready once it was taken')
  assert.ok(deckA.closed && deckA.cleared, 'its handle closed and its listeners gone')
  assert.equal(a.hid.count('disconnect'), 0)
  assert.equal(lost.length, 1)

  // the newer tab paints on, and its close lets the lock go
  const painterB = b.arcade.deckPainter(deckB, fakeArt(), { stripGapMs: 0 })
  painterB.paint(fill('blank'), strip()); await painterB.idle()
  assert.deepEqual(lastFaces(deckB), fill('blank'))
  assert.deepEqual(stripParts(deckB).map(([x]) => x), PARTS)
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
      assert.ok(lib.options[0]?.encodeJPEG === arcade.encodeJpeg, "each copy of the page hands the library its own JPEG maker")
      if (locks) assert.deepEqual(locks.asked, [{ name: 'arcade-deck', steal: true }])
      await arcade.deckPainter(deck, fakeArt()).close()
      assert.equal(named(deck, 'clearPanel').length, 2, 'set up, then blanked when the page let it go')
      if (locks) assert.equal(locks.holder, null)
    })
  }
})

// ---- the JPEGs (encodeJpeg) --------------------------------------------------------

// A copy of the module of its own, so its JPEGs and canvases start empty.
const freshCopy = () => import(`../src/lib/arcadeDeck.js?jpeg=${++copies}`)

// A picture of w by h in RGBA, a pattern of its own, with n in its first two bytes.
function picture(w, h, n) {
  const bytes = new Uint8Array(w * h * 4)
  for (let i = 0; i < bytes.length; i++) bytes[i] = (i * 7 + n) & 255
  return stamp(bytes, n)
}
function stamp(bytes, n) {
  bytes[0] = n & 255
  bytes[1] = (n >> 8) & 255
  return bytes
}
// What a fake JPEG says about the picture it was made from: its first four bytes and its last.
const marks = bytes => [bytes[0], bytes[1], bytes[2], bytes[3], bytes[bytes.length - 1]]

// The browser's canvases for one test, all fake, put back after: an
// OffscreenCanvas, or with page: true none, and a canvas from
// document.createElement instead. Every canvas made and every JPEG asked for
// is in the log. A JPEG is 0xff 0xd8 and then the marks of the picture on the
// canvas when it was asked for (a real canvas copies its picture then), and it
// comes a turn of the event loop later. log.fail: how many JPEGs fail before
// they work; log.empty: toBlob hands back no blob.
async function withCanvases({ page = false, fail = 0 } = {}, fn) {
  const log = { canvases: [], tags: [], asks: [], fail, empty: false }
  const blob = bytes => ({ type: 'image/jpeg', arrayBuffer: async () => Uint8Array.from(bytes).buffer })
  const canvas = (width, height, how) => {
    let showing = null
    const c = {
      width, height, how, puts: [], contexts: [],
      getContext(type) {
        c.contexts.push(type)
        return {
          createImageData: (w, h) => ({ width: w, height: h, data: new Uint8ClampedArray(w * h * 4) }),
          putImageData(image, x, y) { showing = image; c.puts.push({ image, x, y }) },
        }
      },
    }
    // the JPEG of what the canvas shows now, or null when this one fails
    const ask = (how, type, quality) => {
      log.asks.push({ size: `${c.width}x${c.height}`, how, type, quality })
      if (log.fail > 0) { log.fail--; return null }
      return showing && !log.empty ? [0xff, 0xd8, ...marks(showing.data)] : null
    }
    if (page) {
      c.toBlob = (callback, type, quality) => {
        const jpeg = ask('toBlob', type, quality)
        setImmediate(() => callback(jpeg ? blob(jpeg) : null))
      }
    } else {
      c.convertToBlob = ({ type, quality } = {}) => {
        const jpeg = ask('convertToBlob', type, quality)
        return new Promise((resolve, reject) => setImmediate(() => (jpeg ? resolve(blob(jpeg)) : reject(new Error('The canvas made no JPEG.')))))
      }
    }
    log.canvases.push(c)
    return c
  }
  const saved = ['OffscreenCanvas', 'document'].map(name => [name, Object.getOwnPropertyDescriptor(globalThis, name)])
  const put = (name, value) => Object.defineProperty(globalThis, name, { value, configurable: true, writable: true })
  if (page) {
    put('OffscreenCanvas', undefined)
    put('document', { createElement(tag) { log.tags.push(tag); return canvas(300, 150, 'page') } })
  } else {
    put('OffscreenCanvas', class { constructor(width, height) { return canvas(width, height, 'offscreen') } })
  }
  try { return await fn(log) } finally {
    for (const [name, descriptor] of saved) {
      if (descriptor) Object.defineProperty(globalThis, name, descriptor)
      else delete globalThis[name]
    }
  }
}

test('encodeJpeg: the same pixels at the same size give the very same JPEG, made once on one kept canvas', async () => {
  await withCanvases({}, async log => {
    const { encodeJpeg: jpeg } = await freshCopy()
    const face = picture(112, 112, 7)
    const first = jpeg(face, 112, 112)
    assert.ok(first instanceof Promise)
    assert.ok(jpeg(face, 112, 112) === first, 'asked again: the very same JPEG')
    assert.ok(jpeg(face.slice(), 112, 112) === first, 'the same pixels in a new buffer (the same face on another key): the same JPEG')
    const made = await first
    assert.ok(made instanceof Uint8Array)
    assert.deepEqual([...made], [0xff, 0xd8, ...marks(face)], "the canvas's JPEG of those pixels")
    assert.deepEqual(log.asks, [{ size: '112x112', how: 'convertToBlob', type: 'image/jpeg', quality: 0.8 }], 'one JPEG, at quality 0.8')
    assert.equal(log.canvases.length, 1)
    const [canvas] = log.canvases
    assert.deepEqual([canvas.how, canvas.width, canvas.height, canvas.contexts], ['offscreen', 112, 112, ['2d']])
    assert.equal(canvas.puts.length, 1)
    const { image, x, y } = canvas.puts[0]
    assert.deepEqual([x, y, image.width, image.height], [0, 0, 112, 112])
    let wrong = 0
    for (let i = 0; i < face.length; i++) if (image.data[i] !== face[i]) wrong++
    assert.equal(wrong, 0, 'every byte of the picture on the canvas')

    // one byte apart, anywhere: a JPEG of its own, on the same canvas
    const near = [0, face.length >> 1, face.length - 1].map(at => {
      const bytes = face.slice()
      bytes[at] ^= 1
      return jpeg(bytes, 112, 112)
    })
    assert.ok(near.every(p => p !== first) && new Set(near).size === 3, 'three pictures one byte from it: three new JPEGs')
    // the same pixels at another size: a JPEG of its own, on a canvas of that size
    const tall = jpeg(face, 56, 224)
    assert.ok(tall !== first)
    await Promise.all([...near, tall])
    assert.equal(log.asks.length, 5)
    assert.deepEqual(log.canvases.map(c => `${c.width}x${c.height}`), ['112x112', '56x224'], 'one canvas per size, kept')
  })
})

test('encodeJpeg: pictures asked for at once on the one canvas each get the JPEG of their own pixels', async () => {
  await withCanvases({}, async log => {
    const { encodeJpeg: jpeg } = await freshCopy()
    const pictures = [1, 2, 3].map(n => picture(112, 112, n))
    const made = await Promise.all(pictures.map(p => jpeg(p, 112, 112)))
    assert.deepEqual(made.map(bytes => [...bytes]), pictures.map(p => [0xff, 0xd8, ...marks(p)]))
    assert.equal(log.canvases.length, 1)
    assert.equal(log.asks.length, 3)
  })
})

test('encodeJpeg keeps key pictures and other sizes apart: 24 strip parts and 600 key pictures, the oldest dropped first', async () => {
  await withCanvases({}, async log => {
    const { encodeJpeg: jpeg } = await freshCopy()
    const all = []
    const key = picture(112, 112, 1)
    const keyJpeg = jpeg(key, 112, 112)
    // the + XL turns each 200 by 100 part of the strip, so the library hands it over as 100 by 200
    const parts = Array.from({ length: 30 }, (_, n) => picture(100, 200, n + 1))
    const partJpegs = parts.map(p => jpeg(p, 100, 200))
    all.push(keyJpeg, ...partJpegs)
    assert.ok(jpeg(key, 112, 112) === keyJpeg, 'thirty strip parts never pushed the key picture out')
    assert.ok(jpeg(parts[29], 100, 200) === partJpegs[29], 'the newest part is kept')
    assert.ok(jpeg(parts[6], 100, 200) === partJpegs[6], 'and the oldest of the 24 newest')
    const remade = jpeg(parts[5], 100, 200)
    all.push(remade)
    assert.ok(remade !== partJpegs[5], 'one older than that was dropped, so it is made again')
    assert.equal(log.asks.length, 32)

    // 600 more key pictures: the first key picture is then the oldest of 601, so it goes
    const many = picture(112, 112, 0)
    let newest = null
    for (let n = 1000; n < 1600; n++) all.push(newest = jpeg(stamp(many, n), 112, 112))
    assert.ok(jpeg(many, 112, 112) === newest, 'the newest key picture is kept')
    assert.ok(jpeg(parts[29], 100, 200) === partJpegs[29], 'and 600 key pictures never pushed a part out')
    const again = jpeg(key, 112, 112)
    all.push(again)
    assert.ok(again !== keyJpeg, 'the oldest key picture was dropped: made again')
    assert.equal(log.asks.length, 32 + 600 + 1)
    assert.deepEqual(log.canvases.map(c => `${c.width}x${c.height}`), ['112x112', '100x200'], 'still one canvas per size')
    await Promise.all(all)
  })
})

test('encodeJpeg: a JPEG that failed is not kept, so the next ask makes it afresh', async () => {
  await withCanvases({ fail: 1 }, async log => {
    const { encodeJpeg: jpeg } = await freshCopy()
    const face = picture(112, 112, 9)
    const first = jpeg(face, 112, 112)
    assert.ok(jpeg(face, 112, 112) === first, 'while it is being made: the same one')
    await assert.rejects(first, /made no JPEG/)
    const again = jpeg(face, 112, 112)
    assert.ok(again !== first, 'made afresh')
    assert.deepEqual([...(await again)], [0xff, 0xd8, ...marks(face)])
    assert.ok(jpeg(face, 112, 112) === again, 'and that one is kept')
    assert.equal(log.asks.length, 2)
  })
})

test('encodeJpeg without OffscreenCanvas draws on one canvas from the page per size, and asks toBlob for the JPEG', async () => {
  await withCanvases({ page: true }, async log => {
    const { encodeJpeg: jpeg } = await freshCopy()
    const pictures = [[112, 112, 4], [112, 112, 5], [100, 200, 6]].map(([w, h, n]) => [picture(w, h, n), w, h])
    const made = await Promise.all(pictures.map(([bytes, w, h]) => jpeg(bytes, w, h)))
    assert.deepEqual(made.map(bytes => [...bytes]), pictures.map(([bytes]) => [0xff, 0xd8, ...marks(bytes)]))
    assert.deepEqual(log.tags, ['canvas', 'canvas'])
    assert.deepEqual(log.canvases.map(c => [c.how, `${c.width}x${c.height}`, c.contexts]), [['page', '112x112', ['2d']], ['page', '100x200', ['2d']]], 'one canvas per size, sized by the arcade')
    assert.deepEqual(log.asks.map(ask => [ask.how, ask.type, ask.quality]), Array.from({ length: 3 }, () => ['toBlob', 'image/jpeg', 0.8]))

    log.empty = true
    const face = picture(112, 112, 7)
    await assert.rejects(jpeg(face, 112, 112), /No image generated/)
    log.empty = false
    assert.deepEqual([...(await jpeg(face, 112, 112))], [0xff, 0xd8, ...marks(face)], 'made afresh once the canvas gives a JPEG again')
  })
})
