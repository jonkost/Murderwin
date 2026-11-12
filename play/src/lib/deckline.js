// The Stream Deck line on /setup, under Boo's button (handoff 11 Nov 2026,
// A11; Jon: "I could not get the stream deck to connect to SK MacBook Pro for
// the Boo Arcade"). One plain line says what to do: Deck ready, Open this page
// in Chrome, Press Connect, Quit the Stream Deck app, or This Mac cannot see
// the deck. The setup page is Jon's, never a guest's, so device words are
// fine here; the night's screen keeps none (CLIENT RULES).
//
// checkDeck() looks without asking: a browser with no WebHID is not Chrome;
// a deck this site was never allowed needs Connect; an allowed one is opened
// (never taken from another arcade tab) and let go again at once, so the
// night's screen opens it later with no click. connectDeck() is Connect: it
// asks the browser inside the click, then checks. The page works the same on
// every other machine: it looks only when asked, or on the machine whose last
// choice was Boo's.
import { deckSupported, reopenDeck, releaseDeck, deckProblem as deckErrorWord } from './arcadeDeck.js'

const VENDOR = 0x0fd9 // Elgato
const PRODUCT = 0x00c6 // the Stream Deck + XL

export const DECK_LINES = {
  ready: 'Deck ready.',
  chrome: 'Open this page in Chrome.',
  connect: 'Press Connect.',
  busy: 'Quit the Stream Deck app.',
  unseen: 'This Mac cannot see the deck.',
}

// Which of the five, from what the check found: { supported, allowed, opened, error, chose }.
export function deckKey({ supported = false, allowed = false, opened = false, error = null, chose = null } = {}) {
  if (!supported) return 'chrome'
  if (opened) return 'ready'
  if (chose === 'none' || chose === 'refused') return 'unseen' // Connect listed nothing, or this Mac would not ask
  if (!allowed) return 'connect'
  if (error === 'busy') return 'busy' // it could not be opened: the Stream Deck app holds it
  if (error === 'tab') return 'ready' // another arcade tab in this Chrome has it open: the deck works
  return 'unseen'
}

// The one plain line.
export function deckProblem(state) {
  return DECK_LINES[deckKey(state)]
}

const isPlusXl = d => d?.vendorId === VENDOR && d?.productId === PRODUCT
function hidOf(hid) {
  if (hid) return hid
  return deckSupported() ? globalThis.navigator.hid : null
}

// Looks at the deck without asking. Never throws.
export async function checkDeck({ hid, load, locks } = {}) {
  const h = hidOf(hid)
  if (!h) return { supported: false }
  let devices = []
  try { devices = await h.getDevices() } catch { devices = [] }
  if (!devices.some(isPlusXl)) return { supported: true, allowed: false }
  const deck = await reopenDeck({ hid: h, ...(load ? { load } : {}), ...(locks ? { locks } : {}), steal: false })
  if (deck) {
    await releaseDeck()
    return { supported: true, allowed: true, opened: true }
  }
  return { supported: true, allowed: true, opened: false, error: deckErrorWord() }
}

// Connect: call it from the click itself (the browser shows its chooser only
// then). It lists the + XL alone. Never throws.
export async function connectDeck({ hid, load, locks } = {}) {
  const h = hidOf(hid)
  if (!h) return { supported: false }
  let chosen
  try {
    chosen = await h.requestDevice({ filters: [{ vendorId: VENDOR, productId: PRODUCT }] })
  } catch (error) {
    // NotFoundError: the chooser was closed with nothing picked (or had nothing to list)
    return { supported: true, chose: error?.name === 'NotFoundError' ? 'none' : 'refused' }
  }
  if (!chosen?.length) return { supported: true, chose: 'none' }
  return checkDeck({ hid: h, load, locks })
}
