import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { deckProblem, deckKey, checkDeck, connectDeck, DECK_LINES } from '../src/lib/deckline.js'
import { releaseDeck } from '../src/lib/arcadeDeck.js'
import { SETUP_ROOMS } from '../src/lib/setup.js'

// The Stream Deck line on /setup (handoff 11 Nov 2026, A11). Fakes only: the
// real Stream Deck library is never loaded here.
const read = p => readFileSync(new URL(p, import.meta.url), 'utf8')
const XL = { vendorId: 0x0fd9, productId: 0x00c6 }
const MK2 = { vendorId: 0x0fd9, productId: 0x0080 }

function fakeHid(granted = [], chosen = []) {
  return {
    granted, chosen, asked: 0, filters: null, fail: null,
    async getDevices() { return this.granted },
    requestDevice(options) {
      this.asked++
      this.filters = options?.filters
      if (this.fail) return Promise.reject(this.fail)
      this.granted = [...this.granted, ...this.chosen]
      return Promise.resolve(this.chosen)
    },
    addEventListener() {}, removeEventListener() {},
  }
}
function fakeLib({ error = null } = {}) {
  const lib = {
    opened: 0, closed: 0,
    async openDevice(device) {
      if (error) throw error
      lib.opened++
      device.opened = true
      return {
        MODEL: 'plus-xl', modelInfo: { id: 'plus-xl' },
        setBrightness: async () => {}, clearPanel: async () => {}, removeAllListeners() {},
        async close() { lib.closed++; device.opened = false },
      }
    },
  }
  lib.load = async () => lib
  return lib
}
const err = (name, message) => Object.assign(new Error(message), { name })

test('the five plain lines, one for each thing that can stand in the way', () => {
  assert.deepEqual(Object.values(DECK_LINES), ['Deck ready.', 'Open this page in Chrome.', 'Press Connect.', 'Quit the Stream Deck app.', 'This Mac cannot see the deck.'])
  assert.equal(deckProblem({ supported: false }), 'Open this page in Chrome.')
  assert.equal(deckProblem({}), 'Open this page in Chrome.')
  assert.equal(deckProblem({ supported: true, allowed: false }), 'Press Connect.')
  assert.equal(deckProblem({ supported: true, allowed: true, opened: true }), 'Deck ready.')
  assert.equal(deckProblem({ supported: true, allowed: true, error: 'busy' }), 'Quit the Stream Deck app.')
  assert.equal(deckProblem({ supported: true, allowed: true, error: 'tab' }), 'Deck ready.', 'another arcade tab has it open: it works')
  assert.equal(deckProblem({ supported: true, allowed: true, error: 'gone' }), 'This Mac cannot see the deck.')
  assert.equal(deckProblem({ supported: true, chose: 'none' }), 'This Mac cannot see the deck.', 'Connect listed nothing')
  assert.equal(deckProblem({ supported: true, chose: 'refused' }), 'This Mac cannot see the deck.')
  assert.equal(deckKey({ supported: true, allowed: false }), 'connect')
  for (const l of Object.values(DECK_LINES)) assert.ok(!/—|kiosk|camera/i.test(l), l)
})

test('the check: no WebHID is Chrome; never allowed is Connect; an allowed deck is opened and let go again at once', async () => {
  assert.deepEqual(await checkDeck({}), { supported: false }, 'this node has no WebHID: the Chrome line')
  assert.deepEqual(await checkDeck({ hid: fakeHid([MK2]) }), { supported: true, allowed: false }, 'only the study’s deck: Press Connect')
  const lib = fakeLib()
  const xl = { ...XL }
  const r = await checkDeck({ hid: fakeHid([xl]), load: lib.load })
  assert.deepEqual(r, { supported: true, allowed: true, opened: true })
  assert.equal(lib.opened, 1)
  assert.equal(lib.closed, 1, 'given straight back, so the night’s screen opens it with no click')
  assert.equal(xl.opened, false)
  // the Stream Deck app holds it: Chrome says it failed to open
  const held = await checkDeck({ hid: fakeHid([{ ...XL }]), load: fakeLib({ error: err('NotAllowedError', 'Failed to open the device.') }).load })
  assert.equal(deckProblem(held), 'Quit the Stream Deck app.')
  await releaseDeck() // nothing open: harmless
})

test('Connect asks inside the click for the + XL alone; nothing chosen, or a Mac that will not ask, cannot see the deck', async () => {
  const hid = fakeHid([], [{ ...XL }])
  const lib = fakeLib()
  const r = await connectDeck({ hid, load: lib.load })
  assert.equal(hid.asked, 1)
  assert.deepEqual(hid.filters, [{ vendorId: 0x0fd9, productId: 0x00c6 }])
  assert.equal(deckProblem(r), 'Deck ready.')
  assert.equal(lib.closed, 1)
  assert.equal(deckProblem(await connectDeck({ hid: fakeHid([], []) })), 'This Mac cannot see the deck.')
  const closed = fakeHid([], [])
  closed.fail = err('NotFoundError', 'No device selected.')
  assert.deepEqual(await connectDeck({ hid: closed }), { supported: true, chose: 'none' })
  const locked = fakeHid([], [])
  locked.fail = err('SecurityError', 'Access denied.')
  assert.equal(deckProblem(await connectDeck({ hid: locked })), 'This Mac cannot see the deck.')
  assert.deepEqual(await connectDeck({}), { supported: false })
})

test('/setup: the line and its one button under Boo’s button; the night’s screen keeps no deck words', () => {
  const boo = SETUP_ROOMS.find(r => r.key === 'boo')
  assert.equal(boo.deck, true)
  assert.equal(boo.first, undefined, 'no trip to the practice page first')
  const page = read('../src/screens/Setup.jsx')
  assert.ok(page.includes('{r.deck && <SetupDeck auto={last === r.key} />}'), 'it looks by itself on the machine that was Boo’s last time')
  const deck = read('../src/screens/SetupDeck.jsx')
  assert.ok(deck.includes('{deckProblem(state)}') && deck.includes('look(connectDeck)') && deck.includes('Check the Stream Deck'))
  // the check never takes the deck from another arcade tab
  assert.ok(read('../src/lib/deckline.js').includes('steal: false'))
  // the night's screen: still no Connect and no deck words (arcade.test.mjs holds the rest)
  assert.ok(!/SetupDeck|lib\/deckline/.test(read('../src/screens/Arcade.jsx') + read('../src/screens/Rooms.jsx') + read('../src/screens/Kiosk.jsx')))
})
