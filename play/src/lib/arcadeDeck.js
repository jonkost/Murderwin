// Miss Boo LaRue's Arcade: the Stream Deck + XL over WebHID (docs/boo-arcade.md).
// Susan's MacBook Pro plays the arcade on the deck in Google Chrome; every
// other browser keeps the on-screen deck. WebHID needs Chrome or Edge, on https
// or http://localhost, and the Elgato Stream Deck app must be quit first (it
// holds the keys).
//
// The library (@elgato-stream-deck/webhid 7.8.0) loads only inside these
// functions, with a dynamic import, so Vite gives it a chunk of its own and the
// phones never fetch it. Importing this file touches no page, browser or deck.
//
// Nothing here throws to the page: an open that fails gives null, a write that
// fails calls onLost once, and deckProblem() says why in one word.
//
// One arcade tab holds the deck at a time (29 Oct 2026): a Web Lock named
// 'arcade-deck', held for as long as the deck is open here. The open on load
// and Connect take it from another arcade tab; a replug takes it only when no
// other tab has it. The tab it is taken from lets go without blanking it.

const LOCK = 'arcade-deck' // the Web Lock that makes the deck one tab's at a time
const VENDOR = 0x0fd9 // Elgato
const PRODUCT = 0x00c6 // the Stream Deck + XL (core 7.8.0, modelInfo.js)
const PLUS_XL = 'plus-xl' // its model id, DeviceModelId.PLUS_XL
const KEY_COUNT = 36 // 9 columns by 4 rows; key index = row * 9 + column
const FACE_BYTES = 112 * 112 * 4 // one key in RGBA: the library wants exactly this many
const STRIP_BYTES = 1200 * 100 * 4 // the touch strip (lcd 0) in RGBA
const BRIGHTNESS = 90
const PREPARED_MAX = 800 // prepared key pictures a painter keeps, the oldest dropped first
const STRIP_GAP_MS = 250 // the strip at most 4 times a second
const BLACK = [0, 0, 0]

let held = null // the open + XL: { deck, device, offs, claim }
let opening = null // an open in flight, shared by everyone who asks meanwhile
let closing = null // a close in flight: nothing opens until it is done
let lastError = null // the last thing that went wrong, for deckProblem()
const painters = new WeakMap() // deck -> its painter: { retire, lose }
const claims = new WeakMap() // deck -> this tab's claim on it (claimDeck)

// Short lines only: never a picture, a face list or a buffer.
function say(what, error) {
  if (error) console.warn(`Stream Deck + XL: ${what}`, error?.message ?? String(error))
  else console.warn(`Stream Deck + XL: ${what}`)
}
const clock = () => globalThis.performance?.now?.() ?? Date.now()
const isPlusXl = device => device?.vendorId === VENDOR && device?.productId === PRODUCT
const modelOf = deck => deck?.modelInfo?.id ?? deck?.MODEL
const unplugged = () => new Error('The Stream Deck was unplugged.')
const elsewhere = () => new Error('The Stream Deck went to another arcade tab.')

// Can this browser reach a Stream Deck? Chrome or Edge, on https or localhost.
// Safari has no WebHID: the page says to open it in Google Chrome.
export function deckSupported() {
  try { return !!(globalThis.navigator?.hid && globalThis.window?.isSecureContext) } catch { return false }
}

// The library, loaded on first use. Its build is CommonJS, so the exports may
// sit on the module itself or on its default.
async function loadLibrary() {
  const m = await import('@elgato-stream-deck/webhid')
  const lib = m.requestStreamDecks ? m : m.default
  if (typeof lib?.openDevice !== 'function') throw new Error('The Stream Deck library did not load.')
  return lib
}

// navigator.hid when this browser has it (the tests pass their own).
function hidOf(hid) {
  if (hid) return hid
  return deckSupported() ? globalThis.navigator.hid : null
}

// navigator.locks where the deck can be reached (the tests pass their own).
// None in an older browser: the deck then opens as it always has.
function locksOf(locks) {
  if (locks) return locks
  return deckSupported() ? globalThis.navigator.locks ?? null : null
}

// Claims the deck for this tab: the lock is held until release(). With steal
// it is taken from any other arcade tab; without, the claim is null while
// another tab has it (lastError then says so). If another tab takes it later,
// the claim is marked lost and stolen() deals with it. Without Web Locks every
// claim is granted at once.
function claimDeck(locks, steal) {
  const claim = { release() {}, request: null, lost: false, done: false }
  if (typeof locks?.request !== 'function') return Promise.resolve(claim)
  return new Promise(resolve => {
    let end = null
    const kept = new Promise(r => { end = r })
    claim.release = () => { claim.done = true; end() }
    let mine = false
    claim.request = locks.request(LOCK, steal ? { steal: true } : { ifAvailable: true }, lock => {
      if (!lock) { lastError = elsewhere(); resolve(null); return null } // another arcade tab has it
      mine = true
      resolve(claim)
      return kept // the lock is held until this settles
    })
    claim.request.catch(error => {
      if (!mine) { lastError = error?.name === 'AbortError' ? elsewhere() : error; resolve(null) }
      else if (!claim.done) { claim.lost = true; stolen(claim) }
    })
  })
}

// Lets the claim's lock go, and settles once it has gone, so this tab's next
// open is never refused by its own lock and never takes it from itself.
async function unclaim(claim) {
  claim.release()
  try { await claim.request } catch { /* another tab took it: gone already */ }
}

// Another arcade tab took the deck (its open on load, or its Connect). That
// tab paints it now, so this one lets go without blanking it: its painter
// stops where it is and tells the page once, and a deck with no painter yet
// just closes. An open still in flight sees claim.lost itself, and a claim
// this tab has already let go is no longer its to lose.
function stolen(claim) {
  if (held?.claim !== claim) return
  const painter = painters.get(held.deck)
  if (painter) painter.lose(elsewhere())
  else letGo(held.deck, null, elsewhere())
}

// Closes a deck this open will not keep. Never throws.
async function discard(deck) {
  try { await deck.close() } catch { /* already closed */ }
}

// The open deck, or null. One the browser has closed under us is let go.
function live() {
  if (held && held.device?.opened === false) letGo(held.deck, null, new Error('The Stream Deck was closed.'))
  return held ? held.deck : null
}

// Keep this deck as the open one, under this tab's claim, and let it go if
// it is unplugged.
function hold(deck, device, hid, claim) {
  const h = { deck, device, offs: [], claim }
  if (typeof hid?.addEventListener === 'function') {
    const gone = e => { if (e?.device === device && held === h) letGo(deck, null, unplugged()) }
    hid.addEventListener('disconnect', gone)
    h.offs.push(() => hid.removeEventListener('disconnect', gone))
  }
  claims.set(deck, claim)
  held = h
  lastError = null
}

// Let go of a deck: it stops being the open one, its listeners go (a device
// opened again must never fire through the old one) and it closes, after
// first() if given, and then its claim's lock goes. Anything opened next
// waits for this. Never throws.
function letGo(deck, first = null, why = null) {
  if (why) lastError = why
  let claim = null
  if (held?.deck === deck) {
    for (const off of held.offs) off()
    claim = held.claim
    held = null
  }
  const task = (async () => {
    if (first) { try { await first() } catch { /* best effort: it may be unplugged */ } }
    try { deck.removeAllListeners?.() } catch { /* nothing to remove */ }
    try { await deck.close() } catch { /* already closed, or unplugged */ }
    if (claim) await unclaim(claim)
  })()
  const done = Promise.all([closing, task]).then(() => { if (closing === done) closing = null })
  closing = done
  return done
}

// One open at a time: a second caller (React StrictMode runs effects twice)
// gets the same open.
function share(task) {
  const p = (async () => {
    try { return await task() } catch (error) { lastError = error; say('could not open it.', error); return null }
  })()
  opening = p
  p.then(() => { if (opening === p) opening = null })
  return p
}

// Open the first + XL among these browser devices, set it up and keep it.
// Any other model is closed again at once: the + XL is the only deck the
// arcade knows. The deck is claimed for this tab before it is opened (here,
// so everyone sharing this open shares one claim). If another tab takes the
// claim meanwhile, the deck is closed again, never blanked; an open that
// keeps nothing lets the claim go.
async function openFirst(devices, hid, load, locks, steal) {
  const lib = await load()
  const found = (devices ?? []).filter(isPlusXl)
  if (!found.length) return null
  const claim = await claimDeck(locks, steal)
  if (!claim) return null // another arcade tab has it
  let kept = false
  try {
    for (const device of found) {
      if (claim.lost) break
      // Left open by an earlier copy of this page (a hot reload): close it first.
      if (device.opened) { try { await device.close() } catch { /* then the open below says why */ } }
      let deck = null
      try { deck = await lib.openDevice(device) } catch (error) { lastError = error; say('could not open it.', error); continue }
      if (claim.lost) { await discard(deck); break } // the other tab paints it now
      if (modelOf(deck) !== PLUS_XL) {
        lastError = new Error('That is not the Stream Deck + XL.')
        await discard(deck)
        continue
      }
      try {
        await deck.setBrightness(BRIGHTNESS)
        if (!claim.lost) await deck.clearPanel()
      } catch (error) {
        lastError = error
        say('could not set it up.', error)
        await discard(deck)
        continue
      }
      if (claim.lost) { await discard(deck); break }
      hold(deck, device, hid, claim)
      kept = true
      return deck
    }
    return null
  } finally {
    if (!kept) {
      if (claim.lost) lastError = elsewhere()
      await unclaim(claim)
    }
  }
}

// The + XL this site was allowed before, opened with no click (after a reload,
// or when it is plugged in again), or null. Hands back the open one while it
// is open. With steal (the page's open on load) it takes the deck from
// another arcade tab; without (a replug) it gives null while another tab has
// it, and deckProblem() says 'tab'. Never throws.
export async function reopenDeck({ hid, load = loadLibrary, locks, steal = false } = {}) {
  const h = hidOf(hid)
  if (!h) return null
  live() // a deck the browser closed under us starts closing here
  while (closing) await closing
  const open = live()
  if (open) return open
  if (opening) return opening
  return share(async () => openFirst(await h.getDevices(), h, load, locksOf(locks), steal))
}

// Asks the browser which deck to use (call it from a click), then opens the
// + XL; with steal (Connect) it takes the deck from another arcade tab. Hands
// back the open one while it is open, without asking. Null when nothing was
// chosen or it could not be opened. Never throws.
export async function chooseDeck({ hid, load = loadLibrary, locks, steal = false } = {}) {
  const h = hidOf(hid)
  if (!h) return null
  const open = live()
  if (open) return open
  let chosen
  try {
    // Asked before anything is awaited: the browser shows its chooser only
    // while it is still handling the click. It lists the + XL alone.
    const asking = h.requestDevice({ filters: [{ vendorId: VENDOR, productId: PRODUCT }] })
    Promise.resolve().then(load).catch(() => {}) // fetch the library while the chooser is open
    chosen = await asking
  } catch (error) {
    if (error?.name === 'NotFoundError') { lastError = null; return null } // the chooser was closed
    lastError = error
    say('could not ask for it.', error)
    return null
  }
  while (closing || opening) await (closing ?? opening)
  const now = live()
  if (now) return now
  if (!chosen?.length) { lastError = null; return null } // the chooser was closed
  return share(() => openFirst(chosen, h, load, locksOf(locks), steal))
}

// The deck's presses as the arcade's events: a key is { kind: 'key', index }
// (0 to 35), a dial pressed is { kind: 'press', dial } (0 to 5, left to right),
// a dial turned is { kind: 'turn', dial, amount } (clockwise is positive; a
// fast spin sends more than 1), a tap on the touch strip is { kind: 'strip', x }.
// Releases, long presses, swipes and the NFC reader are ignored. The deck's
// 'error' goes to onError, if given. Returns the unsubscribe, which takes away
// exactly these listeners.
export function deckEvents(deck, onEvent, onError) {
  if (typeof deck?.on !== 'function') return () => {}
  const tell = event => {
    try { onEvent(event) } catch (error) { say('a press was not handled.', error) }
  }
  const listeners = {
    down: control => {
      if (control?.type === 'button') tell({ kind: 'key', index: control.index })
      else if (control?.type === 'encoder') tell({ kind: 'press', dial: control.index })
    },
    rotate: (control, amount) => {
      if (control && Number.isFinite(amount) && amount !== 0) tell({ kind: 'turn', dial: control.index, amount })
    },
    lcdShortPress: (control, position) => tell({ kind: 'strip', x: position?.x ?? 0 }),
  }
  if (typeof onError === 'function') listeners.error = error => onError(error)
  const pairs = Object.entries(listeners)
  for (const [name, fn] of pairs) deck.on(name, fn)
  let done = false
  return () => {
    if (done) return
    done = true
    for (const [name, fn] of pairs) deck.off(name, fn)
  }
}

// Paints the deck. paint(faces, strip) takes the 36 face ids (key index = row
// * 9 + column) and the strip's spec; art is { faceRgba, faceSolid, stripRgba }
// (lib/arcadeArt.js). The paint budget: only keys whose face changed are
// painted; one write at a time; a key that changes again before its turn is
// painted once, with its newest face; a face already prepared for a key is
// sent again without drawing it again; 'off' and flat faces are one cheap
// colour fill; the strip only when it changed, at most every stripGapMs.
// Any write that fails: painting stops and onLost(error) is called once, and
// the deck is let go, so Connect opens it afresh. Another arcade tab taking
// the deck does the same, with an error deckProblem() reads as 'tab', and from
// then on nothing here writes to the deck, not even close()'s clear.
// clear() blanks the deck and forgets what was painted and asked for: nothing
// shows until the next paint(), which draws every key afresh (so call it after
// the art changes, too). close() clears, lets the deck go and closes it.
// idle() settles when nothing is being written. A second painter on the same
// deck takes over from the first.
export function deckPainter(deck, art, { onLost, stripGapMs = STRIP_GAP_MS } = {}) {
  const nothing = async () => {}
  if (!deck || typeof deck !== 'object') return { paint() {}, clear: nothing, close: nothing, idle: nothing }
  const painted = new Array(KEY_COUNT).fill(null) // the face on each key, as far as we know
  let paintedStrip = null // the strip on the deck, as JSON
  let wantFaces = null // the newest faces asked for
  let wantStrip = null // the newest strip asked for, as JSON
  let wantClear = false
  const prepared = new Map() // `${index}|${face}` -> its prepared buffer, oldest first
  const warned = new Set()
  let running = null // the write loop, while it runs
  let lost = false
  let stopped = false
  let shut = null
  let stripAt = -Infinity
  let stripTimer = null

  // One painter per deck: a new one waits for the old one's write in flight.
  const before = painters.get(deck)
  let ready = before ? before.retire() : null
  const retire = () => { stop(); return idle() }
  const me = { retire, lose } // lose: for stolen(), when another tab takes the deck
  painters.set(deck, me)

  // The deck goes dark when the page is closed or left.
  const page = globalThis.window
  const onHide = () => { clear() }
  page?.addEventListener?.('pagehide', onHide)

  function paint(faces, strip) {
    if (lost || stopped) return
    if (Array.isArray(faces)) wantFaces = faces.slice(0, KEY_COUNT)
    if (strip != null) { try { wantStrip = JSON.stringify(strip) } catch { /* not a strip: keep the last */ } }
    kick()
  }

  function clear() {
    if (!lost && !stopped) {
      wantClear = true
      wantFaces = null // nothing shows again until the next paint()
      wantStrip = null
      kick()
    }
    return idle()
  }

  function close() {
    if (shut) return shut
    const clean = !lost
    stop()
    shut = letGo(deck, async () => {
      await idle()
      if (clean && !lost && !claims.get(deck)?.lost) await deck.clearPanel() // never blank a deck another tab took meanwhile
    })
    return shut
  }

  async function idle() {
    if (ready) await ready // the painter before this one, still finishing a write
    while (running) await running
  }

  function stop() {
    stopped = true
    clearTimeout(stripTimer)
    stripTimer = null
    page?.removeEventListener?.('pagehide', onHide)
    if (painters.get(deck) === me) painters.delete(deck)
  }

  function lose(error) {
    if (lost) return
    lost = true
    if (stopped) return // closing or taken over: whoever has the deck now deals with it
    stop()
    say('lost the deck.', error)
    letGo(deck, null, error ?? new Error('The Stream Deck stopped.'))
    try { onLost?.(error) } catch { /* the page's own trouble */ }
  }

  function kick() {
    if (running || lost || stopped) return
    running = drain().catch(lose).finally(() => {
      running = null
      if (dirty()) kick()
    })
  }

  function dirty() {
    if (lost || stopped) return false
    if (wantClear) return true
    if (wantFaces?.some((face, i) => face != null && face !== painted[i])) return true
    return wantStrip !== null && wantStrip !== paintedStrip && !stripTimer
  }

  // The one write queue. Each pass reads the newest faces at each key's turn,
  // so a key changed twice meanwhile is painted once; then the strip; then
  // another pass while anything still differs.
  async function drain() {
    if (ready) { await ready; ready = null }
    while (!lost && !stopped) {
      if (wantClear) {
        wantClear = false
        if (!(await write(() => deck.clearPanel()))) return
        painted.fill(null)
        paintedStrip = null
        prepared.clear() // drawn afresh, so new art shows
        continue
      }
      let wrote = false
      for (let i = 0; i < KEY_COUNT && !lost && !stopped && !wantClear; i++) {
        const face = wantFaces?.[i]
        if (face == null || face === painted[i]) continue
        if (!(await write(() => paintKey(i, face)))) return
        painted[i] = face
        wrote = true
      }
      if (lost || stopped || wantClear) continue
      if (wantStrip !== null && wantStrip !== paintedStrip) {
        const wait = stripAt + stripGapMs - clock()
        if (wait > 0) later(wait)
        else {
          const json = wantStrip
          stripAt = clock()
          if (!(await write(() => paintStrip(json)))) return
          paintedStrip = json
          wrote = true
        }
      }
      if (!wrote) return
    }
  }

  async function write(fn) {
    try { await fn(); return true } catch (error) { lose(error); return false }
  }

  function later(ms) {
    if (stripTimer || stopped) return
    stripTimer = setTimeout(() => { stripTimer = null; kick() }, ms)
  }

  async function paintKey(i, face) {
    const flat = face === 'off' ? BLACK : solidOf(face)
    if (flat) return deck.fillKeyColor(i, flat[0], flat[1], flat[2])
    const id = `${i}|${face}`
    let buffer = prepared.get(id)
    if (buffer) prepared.delete(id) // set again below, as the newest
    else {
      const rgba = rgbaOf(face)
      if (!rgba) return deck.fillKeyColor(i, 0, 0, 0) // a face the art cannot draw stays dark
      buffer = await deck.prepareFillKeyBuffer(i, rgba, { format: 'rgba' })
    }
    prepared.set(id, buffer)
    if (prepared.size > PREPARED_MAX) prepared.delete(prepared.keys().next().value)
    return deck.sendPreparedBuffer(buffer)
  }

  async function paintStrip(json) {
    let rgba = null
    try { rgba = art?.stripRgba(JSON.parse(json)) } catch { rgba = null }
    if (rgba?.length !== STRIP_BYTES) {
      if (!warned.has('strip')) { warned.add('strip'); say('no picture for the strip.') }
      return // the strip keeps what it shows
    }
    return deck.fillLcd(0, rgba, { format: 'rgba', width: 1200, height: 100 })
  }

  function solidOf(face) {
    let colour = null
    try { colour = art?.faceSolid?.(face) } catch { colour = null }
    if (!Array.isArray(colour) || colour.length < 3) return null
    return colour.slice(0, 3).map(v => Math.max(0, Math.min(255, Math.round(Number(v) || 0))))
  }

  function rgbaOf(face) {
    let rgba = null
    try { rgba = art?.faceRgba(face) } catch { rgba = null }
    if (rgba?.length === FACE_BYTES) return rgba
    if (!warned.has(face)) { warned.add(face); say(`no picture for the face ${face}.`) }
    return null
  }

  return { paint, clear, close, idle }
}

// Calls onPlug(device) when a Stream Deck + XL is plugged in and
// onUnplug(device) when it is pulled out (only the + XL: another Elgato deck
// on the same Mac never counts). The open one is let go before onUnplug runs.
// Returns the unsubscribe.
export function watchPlugs({ onPlug, onUnplug, hid } = {}) {
  const h = hidOf(hid)
  if (typeof h?.addEventListener !== 'function') return () => {}
  const plug = e => { if (isPlusXl(e?.device)) onPlug?.(e.device) }
  const unplug = e => {
    if (!isPlusXl(e?.device)) return
    if (held?.device === e.device) letGo(held.deck, null, unplugged())
    onUnplug?.(e.device)
  }
  h.addEventListener('connect', plug)
  h.addEventListener('disconnect', unplug)
  return () => {
    h.removeEventListener('connect', plug)
    h.removeEventListener('disconnect', unplug)
  }
}

// Why the deck is not working, in one word, from an error it gave (onLost's,
// or with nothing passed, the last thing that went wrong here):
// 'tab': another arcade tab took it, or has it (the deck is one tab's at a time);
// 'busy': it could not be opened, so the Stream Deck app or another tab has it
//   (Chrome: NotAllowedError "Failed to open the device.", or "already open");
// 'gone': it was unplugged or closed (Chrome: "The device must be opened
//   first.", "Failed to write the report.", "closed unexpectedly");
// 'other': anything else (the library: "Stream Deck is of unexpected type.").
// Null when there is nothing to report.
export function deckProblem(error = lastError) {
  if (error == null) return null
  const text = String(error?.message ?? error)
  const name = String(error?.name ?? '')
  if (/another arcade tab/i.test(text)) return 'tab'
  if (/failed to open|already open|in progress/i.test(text)) return 'busy'
  if (/must be opened|closed|forgotten|failed to (write|receive)|unplugged|disconnect/i.test(text)) return 'gone'
  if (name === 'NotAllowedError') return 'busy'
  if (name === 'InvalidStateError' || name === 'NotFoundError') return 'gone'
  return 'other'
}
