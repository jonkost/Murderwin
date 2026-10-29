// The study's deck among other Stream Decks: the arcade's + XL may share the
// Mac (28 Oct 2026). Only a fifteen-key deck is opened, a deck that will not
// open leaves the station up, and a dial's press is never a key.

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { isStudyDeck, openDeck, FACE_SIZE } from '../lib/streamdeck.js'
import { DECK } from '../lib/study.js'

// The module's own list of models, when the optional module is installed.
const lib = await import('@elgato-stream-deck/node').catch(() => null)

test('the study deck is every fifteen-key model, and never the + XL', { skip: !lib && 'the Stream Deck module is not installed' }, () => {
  const kept = Object.values(lib.DEVICE_MODEL_INFO).filter(modelInfo => isStudyDeck({ modelInfo }))
  assert.deepEqual(kept.map(m => m.id).sort(), ['15-module', '15-module-scissor', 'original', 'original-mk2', 'original-mk2-scissor', 'originalv2'])
  assert.equal(isStudyDeck({ modelInfo: lib.getModelInfo('plus-xl') }), false)
  // on each, a key's index is row * 5 + column, the order DECK.flat() names them in
  for (const m of kept) for (const c of m.controls) assert.equal(c.index, c.row * DECK[0].length + c.column, m.id)
  assert.equal(isStudyDeck({ path: 'usb', model: 'original-mk2' }), false, 'no model info, no deck')
})

// Decks as the module lists and opens them, with only what openDeck reads
// (the shapes of @elgato-stream-deck 7.8.0; the test above has the real ones).
const buttons = (n, px) => Array.from({ length: n }, (_, index) => ({ type: 'button', index, pixelSize: { width: px, height: px } }))
const MK2 = { path: 'usb-mk2', model: 'original-mk2', modelInfo: { name: 'Stream Deck MK.2', controls: buttons(15, 72) } }
const PLUS_XL = {
  path: 'usb-xl', model: 'plus-xl',
  modelInfo: { name: 'Stream Deck + XL', controls: [...buttons(36, 112), ...Array.from({ length: 6 }, (_, index) => ({ type: 'encoder', index }))] },
}

// A stand-in for the module: it lists `decks`, opens any but the `busy`
// ones, and keeps what it was asked to open.
function fakeModule(decks, { busy = [] } = {}) {
  const mod = {
    tried: [], opened: {},
    listStreamDecks: async () => decks,
    openStreamDeck: async (path) => {
      mod.tried.push(path)
      if (busy.includes(path)) throw new Error(`cannot open device with path ${path}`)
      const handlers = {}, painted = []
      return (mod.opened[path] = {
        CONTROLS: decks.find(d => d.path === path).modelInfo.controls,
        painted,
        on: (event, fn) => { handlers[event] = fn },
        emit: (event, arg) => handlers[event]?.(arg),
        fillKeyBuffer: async (i, buf) => { painted.push(buf.length) },
        clearPanel: async () => {},
        close: async () => {},
      })
    },
  }
  return mod
}

async function open(mod) {
  const logs = []
  const deck = await openDeck({ log: (m) => logs.push(m), load: async () => mod })
  return { deck, logs }
}

test('the + XL on its own is skipped by name and never opened', async () => {
  const mod = fakeModule([PLUS_XL])
  const { deck, logs } = await open(mod)
  assert.equal(deck, null)
  assert.deepEqual(mod.tried, [])
  assert.deepEqual(logs, ['stream deck: no fifteen-key deck (skipped Stream Deck + XL)'])
})

test('beside the + XL, even listed first, the fifteen-key deck is opened; the blank key and a dial press nothing', async () => {
  const mod = fakeModule([PLUS_XL, MK2])
  const { deck, logs } = await open(mod)
  assert.deepEqual(mod.tried, ['usb-mk2'])
  assert.deepEqual(logs, [])
  assert.equal(deck.size, FACE_SIZE)
  const pressed = []
  deck.onKey(name => pressed.push(name))
  const opened = mod.opened['usb-mk2']
  for (const i of [0, 4, 14]) opened.emit('down', MK2.modelInfo.controls[i])
  opened.emit('down', { type: 'encoder', index: 0 })
  assert.deepEqual(pressed, ['red', 'submit'])
  await deck.paint(true)
  assert.deepEqual(opened.painted, Array(15).fill(FACE_SIZE * FACE_SIZE * 3))
})

test('a deck that will not open: the next is tried, and with none open the station stays up and the log says what to do', async () => {
  const two = fakeModule([MK2, { ...MK2, path: 'usb-mk2-b' }], { busy: ['usb-mk2'] })
  const first = await open(two)
  assert.ok(first.deck)
  assert.deepEqual(two.tried, ['usb-mk2', 'usb-mk2-b'])
  assert.deepEqual(first.logs, ['stream deck: Stream Deck MK.2 would not open (cannot open device with path usb-mk2)'])
  const second = await open(fakeModule([MK2], { busy: ['usb-mk2'] }))
  assert.equal(second.deck, null)
  assert.deepEqual(second.logs, [
    'stream deck: Stream Deck MK.2 would not open (cannot open device with path usb-mk2)',
    "stream deck: quit the Stream Deck app, then close and reopen the station's window",
  ])
})

test('no deck, no module or no list: null, and the log says which', async () => {
  assert.deepEqual(await open(fakeModule([])), { deck: null, logs: ['stream deck: none plugged in'] })
  const missing = []
  assert.equal(await openDeck({ log: (m) => missing.push(m), load: async () => { throw new Error('Cannot find package') } }), null)
  assert.deepEqual(missing, ['stream deck: module not installed'])
  assert.deepEqual(await open({ listStreamDecks: async () => { throw new Error('hid failed') } }), { deck: null, logs: ['stream deck: cannot list the decks (hid failed)'] })
})
