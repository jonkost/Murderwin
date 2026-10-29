// Miss Boo LaRue's Arcade: the pictures (docs/boo-arcade.md, 28 Oct 2026).
// Every key face of the Stream Deck + XL and its touch strip, drawn on a
// canvas in the house's Stream Deck look (station/keys/make.html: Manor blue
// grounds, brass rims, the parchment serif), each drawn once and kept. The
// same pictures go to the deck (RGBA buffers: 112 x 112 a key, 1200 x 100 the
// strip) and to the deck on the Mac's screen (pictures at twice the size).
//
// Big pictures, few words: the keys are read from a seat across the table,
// in dim light. The animals and the things on the table are colour emoji (no
// new picture files: household/play is Jon's to fill). Boo is her own face
// picture, household/faces/Boo Face.png, white outline and all, and so is each
// of Whack-a-Mouse's pets (household/faces/, PET_FILES).
//
// Nothing is drawn at import, so node can import this file for the tests.
// The face ids are lib/arcade.js's (§6, FACE_IDS); ART_FACES is the list this
// file draws (made from its drawing tables), so a test can check the art
// knows every one.

export const FACE_SIZE = 112, STRIP_W = 1200, STRIP_H = 100

// make.html's key is 72 units square. Every face here is drawn in that same
// square, on a pen scaled by k = size / 72, so its insets, lines, radii and
// type keep the house's proportions at any size.
const UNIT = 72, MID = UNIT / 2

// The house palette (make.html's BRAND; play/src/styles.css), soot for under
// the table, and make.html's green for the ok key.
const BRAND = { blue: '#001925', card: '#0c2634', red: '#bf1925', claret: '#592F32', brass: '#A6A253', parchment: '#F1E8D6', soot: '#332526' }
const GREEN = '#1f9d4a'
const SERIF = '"New York", "Source Serif 4", Georgia, serif'
const SANS = '"Source Sans 3", -apple-system, BlinkMacSystemFont, system-ui, sans-serif'
const EMOJI = '"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif'

// Knock It Off the Table's eight things, in the order they come.
const OBJECTS = ['vase', 'teacup', 'teapot', 'candle', 'picture', 'glass', 'plant', 'cake']
const PICTURE = {
  fish: '🐟', mouse: '🐭', bonk: '💥', crash: '💥', swipe: '🐾', yarn: '🧶', basket: '🧺', cat: '🐈‍⬛',
  vase: '🏺', teacup: '☕', teapot: '🫖', candle: '🕯️', picture: '🖼️', glass: '🍷', plant: '🪴', cake: '🎂',
}
// The menu's five keys: each game's picture over its short name (lib/arcade.js
// GAMES). The Tail key is a black cat (Jon, 29 Oct 2026; the treat in the game
// stays a fish), and the Knock key is Boo's paws, her swipe in the game (Jon,
// 29 Oct 2026; the vase stays on the table).
const MENU = { tail: ['cat', 'Tail'], pointer: ['dot', 'Pointer'], mice: ['mouse', 'Mice'], knock: ['swipe', 'Knock'], yarn: ['yarn', 'Yarn'] }

// Faces that are one flat colour. The deck paints these with fillKeyColor
// (one small report, no picture to send); the rest are pictures.
const SOLID = new Map([
  ['off', Object.freeze([0, 0, 0])],
  ['blank', Object.freeze([0, 25, 37])], // Manor blue
  ['below', Object.freeze([51, 37, 38])], // soot, under the table
])
export function faceSolid(id) { return SOLID.get(id) ?? null }

// ---- the canvases and what is kept -----------------------------------------

// A canvas to draw on: an OffscreenCanvas where the browser has one, else one
// from the page; none at all in node. Its pen is made for reading back (the
// deck takes the pixels), and every later getContext returns that same pen.
const pen = c => c.getContext('2d', { willReadFrequently: true })
function newCanvas(w, h) {
  const makers = [
    () => (typeof OffscreenCanvas === 'function' ? new OffscreenCanvas(w, h) : null),
    () => {
      if (typeof document === 'undefined') return null
      const c = document.createElement('canvas')
      c.width = w; c.height = h
      return c
    },
  ]
  for (const make of makers) {
    try {
      const c = make()
      if (c && pen(c)) return c
    } catch { /* try the next kind */ }
  }
  return null
}

const faces = new Map() // `${id}@${size}` -> its canvas
const urls = new Map() // `${id}@${size}` -> its data URL
const pixels = new Map() // id -> the 112 x 112 RGBA buffer the deck takes
const strips = new Map() // the strip's JSON -> { canvas, rgba, url }, only the last few
const STRIPS_KEPT = 6
const has = (o, k) => Object.prototype.hasOwnProperty.call(o, k)
function remember(map, key, value, limit) {
  map.set(key, value)
  while (map.size > limit) map.delete(map.keys().next().value)
  return value
}
function clearArt() { faces.clear(); urls.clear(); pixels.clear(); strips.clear() }
const sizeOf = s => Math.min(1024, Math.max(8, Math.round(Number(s)) || FACE_SIZE))

// The pixels, opaque (the deck gets a JPEG), or null when they cannot be read.
function readBack(c, w, h) {
  if (!c) return null
  try {
    const d = pen(c).getImageData(0, 0, w, h).data
    for (let i = 3; i < d.length; i += 4) d[i] = 255
    return d.length === w * h * 4 ? d : null
  } catch { return null }
}
// A buffer of one colour, where there is no canvas (node): the right length, opaque.
function filled(w, h, [r, g, b]) {
  const d = new Uint8ClampedArray(w * h * 4)
  for (let i = 0; i < d.length; i += 4) { d[i] = r; d[i + 1] = g; d[i + 2] = b; d[i + 3] = 255 }
  return d
}
// A picture's data URL, for an <img> on the screen. An OffscreenCanvas has no
// toDataURL, so its picture is copied onto a page canvas first.
function dataUrl(c) {
  if (!c) return null
  try {
    if (typeof c.toDataURL === 'function') return c.toDataURL('image/png')
    if (typeof document === 'undefined') return null
    const p = document.createElement('canvas')
    p.width = c.width; p.height = c.height
    p.getContext('2d').drawImage(c, 0, 0)
    return p.toDataURL('image/png')
  } catch { return null }
}

// ---- loading ----------------------------------------------------------------

// The household's face pictures: Boo's for her own keys, and all five for
// Whack-a-Mouse's pets (lib/arcade.js PETS).
export const PET_FILES = Object.freeze({
  boo: 'Boo Face.png', granola: 'Granola Face.png', irwin: 'Irwin Face.png', salem: 'Salem Face.png', zimmy: 'Zimmy Face.png',
})
// Each face picture is 1500 pixels square and a key wants about a hundred.
// Halving it a few times, smoothly, keeps the eyes and whiskers clean when it
// is drawn small: the halves are kept smallest first, the picture itself last.
const levels = new Map() // pet -> its halvings
let waitOver = false // loadArt has stopped waiting: a picture that comes after that is not used
function shrink(img) {
  const levels = [img]
  let src = img, w = img.naturalWidth || img.width, h = img.naturalHeight || img.height
  while (w > 200 && h > 200) {
    w = Math.round(w / 2); h = Math.round(h / 2)
    const c = newCanvas(w, h)
    if (!c) break
    const g = pen(c)
    g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high'
    g.drawImage(src, 0, 0, w, h)
    levels.unshift(c)
    src = c
  }
  return levels
}
// The load event, not decode(): decode() waits for the page to draw a frame,
// and a page opened behind another tab draws none. The first drawImage decodes it.
async function loadFace(pet) {
  if (levels.has(pet)) return true
  if (typeof Image !== 'function') return false
  const img = new Image()
  img.fetchPriority = pet === 'boo' ? 'high' : 'low' // Boo's face first: her keys are in every game
  await new Promise((ok, no) => {
    img.onload = ok; img.onerror = no
    img.src = `${import.meta.env?.BASE_URL ?? '/'}household/faces/${encodeURIComponent(PET_FILES[pet])}`
  })
  if (waitOver || !(img.naturalWidth > 0)) return false
  levels.set(pet, shrink(img))
  return true
}
// Waits for at most `ms` and never fails: a font that never comes, or a
// picture that does not load, just leaves the faces without it.
function settle(make, ms = 6000) {
  return new Promise(resolve => {
    const timer = setTimeout(() => resolve(null), ms)
    const done = v => { clearTimeout(timer); resolve(v) }
    try { Promise.resolve(make()).then(done, () => done(null)) } catch { done(null) }
  })
}

// Waits for the two house fonts (play/index.html loads them) and the five face
// pictures, then forgets every face drawn so far, so each is drawn again with
// them. Call it once, before the first paint: a face drawn earlier (with a
// stand-in) is only replaced if the caller asks for it again. A picture that
// comes after the wait is not used: its stand-in stays until a reload, so a
// key drawn later always matches the ones already drawn.
// Never throws; resolves true once Boo's picture is in, false without it.
let loading = null
export async function loadArt() {
  if (!loading) loading = fetchArt()
  return loading
}
async function fetchArt() {
  const fonts = typeof document !== 'undefined' ? document.fonts : null
  await Promise.all([
    settle(() => fonts?.load('600 40px "Source Serif 4"')),
    settle(() => fonts?.load('600 40px "Source Sans 3"')),
    ...Object.keys(PET_FILES).map(pet => settle(() => loadFace(pet))),
  ])
  waitOver = true
  clearArt()
  return levels.has('boo')
}

// ---- the faces --------------------------------------------------------------

// A cached canvas of the face, `size` pixels square (112 for the deck, 224
// for the screen). Null where there is no canvas at all (node).
export function faceCanvas(id, size = FACE_SIZE) {
  const px = sizeOf(size)
  const key = `${id}@${px}`
  if (faces.has(key)) return faces.get(key)
  const c = newCanvas(px, px)
  if (!c) return null
  const g = pen(c)
  try {
    g.fillStyle = '#000'; g.fillRect(0, 0, px, px) // opaque even if a drawing fails
    const k = px / UNIT
    g.setTransform(k, 0, 0, k, 0, 0)
    paint(g, k, String(id))
  } catch { /* a face that failed part way stays as far as it got */ }
  g.setTransform(1, 0, 0, 1, 0, 0)
  return remember(faces, key, c, 300)
}

// The face for the deck: exactly 112 x 112 x 4 bytes of RGBA, opaque, cached.
export function faceRgba(id) {
  const key = String(id)
  const kept = pixels.get(key)
  if (kept) return kept
  const data = readBack(faceCanvas(key, FACE_SIZE), FACE_SIZE, FACE_SIZE) ?? filled(FACE_SIZE, FACE_SIZE, faceSolid(key) ?? SOLID.get('blank'))
  return remember(pixels, key, data, 120)
}

// The face as a data URL, for the deck on the screen (cached).
export function faceUrl(id, size = FACE_SIZE * 2) {
  const px = sizeOf(size)
  const key = `${id}@${px}`
  if (urls.has(key)) return urls.get(key)
  const url = dataUrl(faceCanvas(id, px))
  return url ? remember(urls, key, url, 300) : null
}

// Draws one face on a pen already scaled to the 72-unit square.
function paint(g, k, id) {
  if (has(FACES, id)) return FACES[id](g, k)
  const at = id.indexOf(':')
  if (at > 0) {
    const kind = id.slice(0, at), arg = id.slice(at + 1)
    if (kind === 'num' && /^\d$/.test(arg)) return number(g, arg)
    if (kind === 'menu' && has(MENU, arg)) return menu(g, k, arg)
    if (OBJECTS.includes(arg) && has(SCENES, kind)) return SCENES[kind](g, k, arg)
    if (has(PET_FILES, arg) && has(PETS_DRAWN, kind)) return PETS_DRAWN[kind](g, k, arg)
  }
  ground(g); big(g, '?', 40) // a face this file does not know: plain to see when testing
}

const FACES = {
  off: g => flat(g, '#000'),
  blank: g => flat(g, BRAND.blue),
  below: g => flat(g, BRAND.soot),
  // the menu's top row: a marquee of brass paws, one in three lit at a time
  // (lib/arcade.js marquee), Boo framed in the middle
  paw: g => { ground(g); pawPrint(g, '#4e4b27') },
  'paw-lit': (g, k) => { ground(g); glowing(g, k, 'rgba(255, 226, 122, 0.9)', 9, () => pawPrint(g, litBrass(g))) },
  boo: (g, k) => { ground(g, BRAND.claret, '#7a4448'); booFace(g, k, BOO_FRAMED); rim(g) },
  back: g => { ground(g, BRAND.claret, '#6e3b3f'); rim(g); arrowLeft(g, MID, 27); words(g, 'Back', 15, 54) },
  ok: g => { ground(g, GREEN, '#33bd66'); rim(g, BRAND.parchment); tick(g) },
  // a player's tokens: a lit brass coin to spend, an empty ring once spent
  coin: (g, k) => { ground(g); coin(g, k) },
  'coin-spent': g => { ground(g); ring(g, MID, MID, 22, 3, 'rgba(166, 162, 83, 0.75)') },
  // Boo Chasing Her Tail: her face leads, black fur follows
  'tail-head': (g, k) => { ground(g); booFace(g, k, BOO_FULL) },
  'tail-body': g => { ground(g); fur(g, 19, 4) },
  'tail-tip': g => { ground(g); fur(g, 11, 3.5) },
  fish: g => { ground(g); emoji(g, PICTURE.fish, 50) },
  bite: (g, k) => { ground(g, BRAND.red, '#e23a44'); booFace(g, k, BOO_FRAMED); rim(g, BRAND.parchment) },
  // The Lazy Pointer: the red dot, and Boo on black after it
  dot: (g, k) => { ground(g); laserDot(g, k, MID, MID, 19) },
  chaser: (g, k) => { flat(g, '#000'); booFace(g, k, BOO_FULL) },
  caught: (g, k) => { ground(g, '#7a0000', '#ff2a2a'); booFace(g, k, BOO_FRAMED); rim(g, BRAND.parchment) },
  // Whack-a-Mouse
  mouse: g => { ground(g); emoji(g, PICTURE.mouse, 48) },
  'mouse-gold': (g, k) => { gold(g); glowing(g, k, 'rgba(255, 252, 230, 0.95)', 9, () => emoji(g, PICTURE.mouse, 48)) },
  bonk: g => { ground(g); emoji(g, PICTURE.bonk, 56) },
  // Knock It Off the Table (the things on it: SCENES below)
  table: g => tableTop(g),
  edge: g => tableTop(g, true),
  crash: g => { flat(g, BRAND.soot); emoji(g, PICTURE.crash, 58) },
  // a miss: Boo's paw prints on the edge, lit from behind so the dark paws show on claret
  swipe: (g, k) => { tableTop(g, true); glowing(g, k, 'rgba(241, 232, 214, 0.95)', 6, () => emoji(g, PICTURE.swipe, 32, 31, 26)) },
  // Yarn Catch
  yarn: g => { ground(g); emoji(g, PICTURE.yarn, 46) },
  'yarn-gold': (g, k) => { gold(g); glowing(g, k, 'rgba(255, 252, 230, 0.95)', 9, () => emoji(g, PICTURE.yarn, 46)) },
  basket: g => { ground(g); rim(g); emoji(g, PICTURE.basket, 46, MID, 39) },
  'basket-catch': (g, k) => {
    ground(g)
    const r = g.createRadialGradient(MID, 42, 2, MID, 42, 34)
    r.addColorStop(0, 'rgba(239, 231, 166, 0.9)'); r.addColorStop(1, 'rgba(166, 162, 83, 0)')
    g.fillStyle = r; g.fillRect(0, 0, UNIT, UNIT)
    rim(g, BRAND.parchment)
    emoji(g, PICTURE.basket, 44, MID, 45)
    glowing(g, k, 'rgba(255, 252, 230, 0.9)', 5, () => emoji(g, PICTURE.yarn, 20, MID, 17))
  },
  'yarn-miss': g => {
    ground(g)
    g.globalAlpha = 0.45; emoji(g, PICTURE.yarn, 30, MID, 44); g.globalAlpha = 1
    cross(g, MID, 36, 13, '#d4202c')
  },
}

// The game's number for 3, 2, 1.
function number(g, n) { ground(g); rim(g); big(g, n, 52) }

// A game on the menu: its picture over its short name, framed in brass.
function menu(g, k, game) {
  const [pic, label] = MENU[game]
  ground(g); rim(g)
  if (pic === 'dot') laserDot(g, k, MID, 28, 12)
  // the black cat in a faint parchment glow, to stand off the Manor blue (Jon, 29 Oct 2026: less noticeable)
  else if (pic === 'cat') glowing(g, k, 'rgba(241, 232, 214, 0.35)', 2, () => emoji(g, PICTURE.cat, 36, MID, 28))
  else emoji(g, PICTURE[pic], 36, MID, 28)
  words(g, label, 15, 56.5, { max: 56 })
}

// ---- Knock It Off the Table's scenes ----------------------------------------

// The table top: a band of warm wood across the key, on claret. The edge
// key's band stops short with a brass lip, and the key has a brass rim (a key
// you may press) and a brass arrow down, where things fall.
const TOP = 46, BAND = 13 // where the wood starts, and how thick it is
function tableTop(g, edge = false) {
  ground(g, BRAND.claret, '#6a373b')
  const end = edge ? 56 : UNIT
  const w = g.createLinearGradient(0, TOP, 0, TOP + BAND)
  w.addColorStop(0, '#c99862'); w.addColorStop(0.16, '#a06a3c'); w.addColorStop(1, '#5a371b')
  g.fillStyle = w; g.fillRect(0, TOP, end, BAND)
  g.strokeStyle = 'rgba(58, 32, 12, 0.6)'; g.lineWidth = 0.7
  for (const [y, a, b] of [[50, 3, 28], [52.5, 18, 66], [55.5, 6, 44]]) {
    g.beginPath(); g.moveTo(a, y); g.lineTo(Math.min(b, end - 4), y); g.stroke()
  }
  g.fillStyle = 'rgba(0, 0, 0, 0.35)'; g.fillRect(0, TOP + BAND, end, 2.5) // its shadow
  if (!edge) return
  g.fillStyle = BRAND.brass; g.fillRect(end - 3, TOP - 1, 3.5, BAND + 2)
  g.beginPath(); g.moveTo(58.5, 49); g.lineTo(67, 49); g.lineTo(62.75, 56.5); g.closePath(); g.fill()
  rim(g)
}
const SCENES = {
  // on the table: standing on the wood
  table: (g, k, obj) => { tableTop(g); emoji(g, PICTURE[obj], 42, MID, TOP + 0.5, true) },
  // on the edge: teetering
  edge: (g, k, obj) => {
    tableTop(g, true)
    g.save(); g.translate(30, TOP + 0.5); g.rotate(0.2); emoji(g, PICTURE[obj], 42, 0, 0, true); g.restore()
  },
  // falling down the last column, under the table
  fall: (g, k, obj) => {
    flat(g, BRAND.soot)
    g.strokeStyle = 'rgba(241, 232, 214, 0.45)'; g.lineWidth = 2; g.lineCap = 'round'
    for (const [x, a, b] of [[24, 5, 13], [36, 3, 11], [48, 5, 13]]) { g.beginPath(); g.moveTo(x, a); g.lineTo(x, b); g.stroke() }
    g.save(); g.translate(MID, 42); g.rotate(0.7); emoji(g, PICTURE[obj], 42, 0, 0); g.restore()
  },
}

// ---- Whack-a-Mouse's pets ---------------------------------------------------

// Each pet (lib/arcade.js PETS) up among the mice, and just tapped (petFace,
// below, draws the sticker).
const PET_SIZE = 56, OOPS_SIZE = 50
const PETS_DRAWN = {
  // up: on Manor blue, like a mouse
  pet: (g, k, pet) => { ground(g); petFace(g, k, pet, PET_SIZE) },
  // tapped: on red, framed, like Boo when she bites her tail
  oops: (g, k, pet) => { ground(g, BRAND.red, '#e23a44'); petFace(g, k, pet, OOPS_SIZE); rim(g, BRAND.parchment) },
}

// Every face this file draws, made from the tables that draw them (FACES, the
// count's 3, 2, 1, MENU, SCENES, PETS_DRAWN), so the list can never name a
// face that has no drawing.
export const ART_FACES = Object.freeze([
  ...Object.keys(FACES), 'num:1', 'num:2', 'num:3', ...Object.keys(MENU).map(g => `menu:${g}`),
  ...Object.keys(SCENES).flatMap(scene => OBJECTS.map(o => `${scene}:${o}`)),
  ...Object.keys(PETS_DRAWN).flatMap(kind => Object.keys(PET_FILES).map(pet => `${kind}:${pet}`)),
])
const KNOWN = new Set(ART_FACES)
export function knowsFace(id) { return typeof id === 'string' && KNOWN.has(id) }

// ---- drawing helpers (make.html's, in its 72-unit square) -----------------

// The ground: a radial glow from the centre colour out to the fill (make.html:
// Manor blue glows card-coloured in the middle).
function ground(g, fill = BRAND.blue, centre = fill === BRAND.blue ? BRAND.card : fill) {
  const r = g.createRadialGradient(MID, MID, 4, MID, MID, UNIT * 0.75)
  r.addColorStop(0, centre); r.addColorStop(1, fill)
  g.fillStyle = r; g.fillRect(0, 0, UNIT, UNIT)
}
function flat(g, fill) { g.fillStyle = fill; g.fillRect(0, 0, UNIT, UNIT) }
// A gold mouse's or ball's ground: brass, brighter in the middle.
function gold(g) { ground(g, BRAND.brass, '#e4da86') }
function roundRect(g, x, y, w, h, r) {
  if (typeof g.roundRect === 'function') return g.roundRect(x, y, w, h, r)
  g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r)
  g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath()
}
// The rim: a rounded frame, brass unless the ground is a colour of its own.
function rim(g, colour = BRAND.brass, inset = 3, width = 2) {
  g.beginPath(); roundRect(g, inset, inset, UNIT - 2 * inset, UNIT - 2 * inset, 9)
  g.lineWidth = width; g.strokeStyle = colour; g.stroke()
}
// Draws with a soft glow around it. Shadows ignore the pen's scale, so the
// blur is given in units and multiplied by k here.
function glowing(g, k, colour, blur, draw) {
  g.save(); g.shadowColor = colour; g.shadowBlur = blur * k; draw(); g.restore()
}
function disc(g, x, y, r, fill) { g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fillStyle = fill; g.fill() }
function ring(g, x, y, r, width, colour) { g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.lineWidth = width; g.strokeStyle = colour; g.stroke() }

// Sets the pen's font for `s` at `px`, smaller if it must be to fit `max`
// wide (down to six tenths of `px`), and past that cuts it short with an
// ellipsis. Returns the words to draw.
function fit(g, s, px, max, font = SERIF, weight = 600) {
  let size = px
  const set = () => { g.font = `${weight} ${size}px ${font}` }
  set()
  while (size > px * 0.6 && g.measureText(s).width > max) { size = Math.max(px * 0.6, size - px * 0.05); set() }
  if (g.measureText(s).width <= max) return s
  const chars = Array.from(s)
  while (chars.length > 1 && g.measureText(chars.join('').trimEnd() + '…').width > max) chars.pop()
  return chars.join('').trimEnd() + '…'
}
// Words, centred on a line (make.html's text()).
function words(g, s, px, y, { colour = BRAND.parchment, max = UNIT - 14 } = {}) {
  const t = fit(g, s, px, max)
  g.fillStyle = colour; g.textAlign = 'center'; g.textBaseline = 'middle'
  g.fillText(t, MID, y)
}
// One big character, its ink centred on the key.
function big(g, s, px, colour = BRAND.parchment) {
  g.font = `600 ${px}px ${SERIF}`
  g.fillStyle = colour; g.textAlign = 'center'; g.textBaseline = 'alphabetic'
  const m = g.measureText(s)
  const up = m.actualBoundingBoxAscent || 0, down = m.actualBoundingBoxDescent || 0
  g.fillText(s, MID, up || down ? MID + (up - down) / 2 : MID + px * 0.35)
}
// A colour emoji, `px` high, its ink centred on (x, y); or, sitting, its ink
// standing on y.
function emoji(g, ch, px, x = MID, y = MID, sit = false) {
  g.font = `${px}px ${EMOJI}`
  g.fillStyle = BRAND.parchment; g.textAlign = 'center'; g.textBaseline = 'alphabetic'
  const m = g.measureText(ch)
  const up = m.actualBoundingBoxAscent || 0, down = m.actualBoundingBoxDescent || 0
  const dx = ((m.actualBoundingBoxLeft || 0) - (m.actualBoundingBoxRight || 0)) / 2
  const known = up || down
  const base = sit ? y - (known ? down : px * 0.12) : known ? y + (up - down) / 2 : y + px * 0.35
  g.fillText(ch, x + dx, base)
}

// A five-pointed star, point up, centred on (x, y).
function star(g, x, y, R, r, fill) {
  g.beginPath()
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + i * Math.PI / 5, d = i % 2 ? r : R
    g.lineTo(x + d * Math.cos(a), y + d * Math.sin(a))
  }
  g.closePath(); g.fillStyle = fill; g.fill()
}
// A lit paw's brass: bright like a bulb, lit from above.
function litBrass(g) {
  const f = g.createLinearGradient(0, 15, 0, 58)
  f.addColorStop(0, '#fff6c4'); f.addColorStop(1, '#d8c45a')
  return f
}
// A cat's paw print, filling most of the key: four toes over a soft pad.
const TOES = [[-15, -4, 0.45], [-6, -14, 0.15], [6, -14, -0.15], [15, -4, -0.45]] // x, y, lean
function pawPrint(g, fill) {
  const u = 40 / 44, p = (x, y) => [MID + x * u, MID + y * u] // drawn in a 44-unit box
  g.beginPath()
  for (const [x, y, lean] of TOES) {
    const [cx, cy] = p(x, y)
    g.moveTo(cx + 5 * u * Math.cos(lean), cy - 5 * u * Math.sin(lean)) // where the toe's outline starts
    g.ellipse(cx, cy, 5 * u, 7 * u, -lean, 0, Math.PI * 2)
  }
  g.moveTo(...p(0, 1))
  g.bezierCurveTo(...p(7, 1), ...p(13, 8), ...p(13, 14))
  g.bezierCurveTo(...p(13, 19.5), ...p(8.5, 21.5), ...p(4.5, 20))
  g.bezierCurveTo(...p(2, 19), ...p(-2, 19), ...p(-4.5, 20))
  g.bezierCurveTo(...p(-8.5, 21.5), ...p(-13, 19.5), ...p(-13, 14))
  g.bezierCurveTo(...p(-13, 8), ...p(-7, 1), ...p(0, 1))
  g.closePath()
  g.fillStyle = fill; g.fill()
}
// A token: a brass coin with a star struck in it, softly lit.
function coin(g, k) {
  glowing(g, k, 'rgba(166, 162, 83, 0.55)', 8, () => {
    const f = g.createRadialGradient(MID - 8, MID - 9, 2, MID, MID, 24)
    f.addColorStop(0, '#f2eab0'); f.addColorStop(0.55, BRAND.brass); f.addColorStop(1, '#6e6b31')
    disc(g, MID, MID, 24, f)
  })
  ring(g, MID, MID, 18.5, 1.6, '#6e6b31')
  star(g, MID, MID + 1, 9, 3.6, '#6e6b31')
}
// The red dot: a glowing red disc.
function laserDot(g, k, x, y, r) {
  glowing(g, k, 'rgba(255, 42, 42, 0.85)', r * 0.9, () => {
    const f = g.createRadialGradient(x - r * 0.3, y - r * 0.3, r * 0.05, x, y, r)
    f.addColorStop(0, '#ff2a2a'); f.addColorStop(1, '#7a0000')
    disc(g, x, y, r, f)
  })
}
// A piece of Boo's tail: a ball of black fur with the white outline of her
// picture, and a soft sheen so it reads as fur and not a hole.
function fur(g, r, line) {
  g.beginPath(); g.arc(MID, MID, r, 0, Math.PI * 2)
  g.lineWidth = line * 2; g.strokeStyle = '#fff'; g.stroke()
  g.fillStyle = '#0d0d10'; g.fill()
  const s = g.createRadialGradient(MID - r * 0.35, MID - r * 0.4, 1, MID - r * 0.35, MID - r * 0.4, r)
  s.addColorStop(0, 'rgba(255, 255, 255, 0.16)'); s.addColorStop(1, 'rgba(255, 255, 255, 0)')
  g.fillStyle = s; g.fill()
}
function tick(g) {
  g.beginPath(); g.moveTo(21, 37); g.lineTo(31, 47); g.lineTo(51, 25)
  g.lineWidth = 7; g.lineCap = 'round'; g.lineJoin = 'round'; g.strokeStyle = BRAND.parchment; g.stroke()
}
function cross(g, x, y, r, colour) {
  g.beginPath(); g.moveTo(x - r, y - r); g.lineTo(x + r, y + r); g.moveTo(x + r, y - r); g.lineTo(x - r, y + r)
  g.lineWidth = 5; g.lineCap = 'round'; g.strokeStyle = colour; g.stroke()
}
function arrowLeft(g, x, y) {
  g.beginPath()
  g.moveTo(x - 16, y); g.lineTo(x - 3, y - 11); g.lineTo(x - 3, y - 4.5); g.lineTo(x + 15, y - 4.5)
  g.lineTo(x + 15, y + 4.5); g.lineTo(x - 3, y + 4.5); g.lineTo(x - 3, y + 11); g.closePath()
  g.fillStyle = BRAND.parchment; g.fill()
}

// Boo's face picture on the middle of the key, `h` units high from the tips of
// her ears to her chin: the picture at the nearest kept size above what the
// key needs. Before loadArt() has it (and all session, if it came after
// loadArt's wait), a plain black cat's head stands in.
// The sticker fills 97.5% of its picture's height and sits a hair left of its
// middle (measured 28 Oct 2026), so it is drawn that much right.
const BOO_TALL = 0.975, BOO_NUDGE = 0.01
const BOO_FRAMED = 58, BOO_FULL = 66 // inside a rim; on a key with no rim
function booFace(g, k, h) {
  const d = h / BOO_TALL
  const src = levelFor('boo', d * k)
  if (!src) return catHead(g, MID, MID, h * 0.88) // its outline is outside its height
  g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high'
  g.drawImage(src, MID - d / 2 + d * BOO_NUDGE, MID - d / 2, d, d)
}
// The smallest halving of a face picture at least `px` wide (else the picture
// itself), or null before it has loaded.
function levelFor(pet, px) {
  const list = levels.get(pet)
  return list ? list.find(c => (c.naturalWidth || c.width) >= px) ?? list[list.length - 1] : null
}

// Whack-a-Mouse's pets: each sticker, outline and all, as big across its
// longer side as `size`, its middle on the key's. Where each sticker sits in
// its 1500-pixel picture, as shares of it (left, top, right, bottom; measured
// 29 Oct 2026 where the picture is more than faintly there, alpha over 100, so
// Granola's and Zimothy's faint whiskers do not count), so the five look the
// same size on the keys. A test reads each picture and checks its box, so a new
// face picture fails there until it is measured again (household/README.md).
export const PET_BOXES = Object.freeze({
  boo: [0.091, 0.013, 0.891, 0.989], granola: [0.041, 0.085, 0.939, 0.97], irwin: [0.068, 0.033, 0.977, 0.996],
  salem: [0.089, 0.045, 0.945, 0.956], zimmy: [0.041, 0.014, 0.965, 0.951],
})
// Before its picture has loaded: Boo's stand-in cat's head, a whole dog for
// Sir Irwin (a dog's face looks too like the mouse's), a cat for the rest.
const PET_STAND_IN = { irwin: '🐕', granola: '🐱', salem: '🐱', zimmy: '🐱' }
function petFace(g, k, pet, size) {
  const [l, t, r, b] = PET_BOXES[pet]
  const d = size / Math.max(r - l, b - t) // the whole picture, drawn this big
  const src = levelFor(pet, d * k)
  if (!src) return pet === 'boo' ? catHead(g, MID, MID, size * 0.8) : emoji(g, PET_STAND_IN[pet], size * 0.8)
  g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high'
  g.drawImage(src, MID - d * (l + r) / 2, MID - d * (t + b) / 2, d, d)
}
// The stand-in: a black cat's head with a white outline, `h` high from the
// tips of the ears to the chin.
function catHead(g, x, y, h) {
  const p = (u, v) => [x + u * h, y + v * h]
  g.beginPath()
  for (const ear of [[[-0.42, -0.02], [-0.36, -0.5], [-0.08, -0.29]], [[0.08, -0.29], [0.36, -0.5], [0.42, -0.02]]]) {
    g.moveTo(...p(...ear[0])); g.lineTo(...p(...ear[1])); g.lineTo(...p(...ear[2])); g.closePath()
  }
  g.moveTo(...p(0.42, 0.1)); g.ellipse(...p(0, 0.1), 0.42 * h, 0.4 * h, 0, 0, Math.PI * 2)
  g.lineJoin = 'round'; g.lineWidth = 0.12 * h; g.strokeStyle = '#fff'; g.stroke()
  g.fillStyle = '#0b0b0b'; g.fill()
  for (const u of [-0.17, 0.17]) {
    g.beginPath(); g.ellipse(...p(u, 0.06), 0.085 * h, 0.075 * h, 0, 0, Math.PI * 2); g.fillStyle = '#c9d46a'; g.fill()
    g.beginPath(); g.ellipse(...p(u, 0.06), 0.025 * h, 0.065 * h, 0, 0, Math.PI * 2); g.fillStyle = '#0b0b0b'; g.fill()
  }
}

// ---- the touch strip --------------------------------------------------------

// The six dials' centres, in the strip's own pixels (the device's dial
// centres, 100 to 1180, less the strip's left edge at 40).
const DIAL_X = [60, 276, 492, 708, 924, 1140]
const PAD = 24, GAP = 28 // the strip's side margins, and the space around the middle words

// The strip as lib/arcade.js describes it (§7), tidied: the three words, the
// time bar between 0 and 1 (to the thousandth) or null, six dial labels.
function stripShape(strip) {
  const t = v => (v == null ? '' : String(v))
  const n = Number(strip?.bar)
  const bar = strip?.bar == null || !Number.isFinite(n) ? null : Math.round(Math.min(1, Math.max(0, n)) * 1000) / 1000
  return { left: t(strip?.left), centre: t(strip?.centre), right: t(strip?.right), bar, dials: [0, 1, 2, 3, 4, 5].map(i => t(strip?.dials?.[i])) }
}
function stripEntry(strip) {
  const s = stripShape(strip)
  const key = JSON.stringify(s)
  const kept = strips.get(key)
  if (kept) { strips.delete(key); strips.set(key, kept); return kept } // the newest stays longest
  return remember(strips, key, { canvas: drawStrip(s), rgba: null, url: null }, STRIPS_KEPT)
}
export function stripCanvas(strip) { return stripEntry(strip).canvas }
// The strip for the deck: exactly 1200 x 100 x 4 bytes of RGBA, opaque.
export function stripRgba(strip) {
  const e = stripEntry(strip)
  if (!e.rgba) e.rgba = readBack(e.canvas, STRIP_W, STRIP_H) ?? filled(STRIP_W, STRIP_H, SOLID.get('blank'))
  return e.rgba
}
export function stripUrl(strip) {
  const e = stripEntry(strip)
  if (!e.url) e.url = dataUrl(e.canvas)
  return e.url
}

// Manor blue with a card glow behind the middle; the words in the parchment
// serif (the middle biggest); a brass rule, with the time left as a brass
// line along it; the dial labels small, each over its dial.
function drawStrip(s) {
  const c = newCanvas(STRIP_W, STRIP_H)
  if (!c) return null
  const g = pen(c)
  try {
    g.fillStyle = BRAND.blue; g.fillRect(0, 0, STRIP_W, STRIP_H)
    g.save(); g.translate(STRIP_W / 2, STRIP_H / 2); g.scale(6, 1)
    const glow = g.createRadialGradient(0, 0, 4, 0, 0, 100)
    glow.addColorStop(0, BRAND.card); glow.addColorStop(1, BRAND.blue)
    g.fillStyle = glow; g.fillRect(-100, -50, 200, 100)
    g.restore()

    const dials = s.dials.some(Boolean)
    const ruleY = dials ? 62 : 84
    const textY = dials ? 31 : s.bar == null ? 44 : 40

    g.lineCap = 'round'
    g.beginPath(); g.moveTo(PAD, ruleY); g.lineTo(STRIP_W - PAD, ruleY)
    g.lineWidth = 2; g.strokeStyle = s.bar == null ? BRAND.brass : 'rgba(166, 162, 83, 0.35)'; g.stroke()
    if (s.bar > 0) {
      g.beginPath(); g.moveTo(PAD, ruleY); g.lineTo(PAD + (STRIP_W - 2 * PAD) * s.bar, ruleY)
      g.lineWidth = 7; g.strokeStyle = BRAND.brass; g.stroke()
    }

    g.fillStyle = BRAND.parchment; g.textBaseline = 'middle'
    let side = STRIP_W / 2 - PAD - GAP
    if (s.centre) {
      const room = s.left || s.right ? 560 : STRIP_W - 2 * PAD
      const centre = fit(g, s.centre, Array.from(s.centre).length <= 2 ? 70 : 44, room)
      side = (STRIP_W - g.measureText(centre).width) / 2 - PAD - GAP
      g.textAlign = 'center'; g.fillText(centre, STRIP_W / 2, textY)
    }
    if (s.left) { const t = fit(g, s.left, 30, side); g.textAlign = 'left'; g.fillText(t, PAD, textY) }
    if (s.right) { const t = fit(g, s.right, 30, side); g.textAlign = 'right'; g.fillText(t, STRIP_W - PAD, textY) }

    s.dials.forEach((label, i) => { if (label) dialLabel(g, label, DIAL_X[i], 83, 25) })
  } catch { /* the strip stays as far as it got */ }
  return c
}

// A dial's label, centred over the dial. The arrows are drawn, not typed, so
// they look the same on every Mac (no font has to carry them).
const ARROWS = { '◀': 'left', '▶': 'right', '▲': 'up', '▼': 'down' }
function dialLabel(g, label, x, y, px) {
  const parts = label.replace(/[︎️]/g, '').match(/[◀▶▲▼]|[^\s◀▶▲▼]+/g) ?? []
  g.font = `600 ${px}px ${SANS}`
  g.fillStyle = BRAND.parchment; g.textAlign = 'left'; g.textBaseline = 'middle'
  const sized = parts.map(t => ({ t, w: has(ARROWS, t) ? px * 0.8 : g.measureText(t).width }))
  const gap = px * 0.5
  let at = x - (sized.reduce((n, p) => n + p.w, 0) + gap * (sized.length - 1)) / 2
  for (const { t, w } of sized) {
    if (has(ARROWS, t)) arrowHead(g, ARROWS[t], at + w / 2, y, w)
    else g.fillText(t, at, y)
    at += w + gap
  }
}
function arrowHead(g, way, x, y, d) {
  const r = d / 2, v = r * 0.85
  const pts = {
    left: [[x + v, y - r], [x - v, y], [x + v, y + r]],
    right: [[x - v, y - r], [x + v, y], [x - v, y + r]],
    up: [[x - r, y + v], [x, y - v], [x + r, y + v]],
    down: [[x - r, y - v], [x, y + v], [x + r, y - v]],
  }[way]
  g.beginPath(); g.moveTo(...pts[0]); g.lineTo(...pts[1]); g.lineTo(...pts[2]); g.closePath(); g.fill()
}
