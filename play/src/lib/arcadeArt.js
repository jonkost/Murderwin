// Miss Boo LaRue's Arcade: the pictures (docs/boo-arcade.md, 28 Oct 2026).
// Every key face of the Stream Deck + XL and its touch strip, drawn on a
// canvas, each drawn once and kept. The same pictures go to the deck (RGBA
// buffers: 112 x 112 a key, 1200 x 100 the strip) and to the deck on the Mac's
// screen (pictures at twice the size).
//
// Black lacquer and gold (Jon, 29 Oct 2026: "Not the darker blue", "brighter
// and fun, colorful and high contrast. Think glam!"): black keys, gold rims
// and lights, the house's claret, red and parchment, and green for every
// success, a black tick on it ("Like a check if you get the mouse"). Every
// strike is the house red with a big parchment cross, over whatever was hit.
//
// Big pictures, few words: the keys are read from a seat across the table,
// in dim light. The animals and the things on the table are colour emoji (no
// new picture files: household/play is Jon's to fill). Boo is her own face
// picture, household/faces/Boo Face.png, white outline and all, and so is each
// of her friends, Sir Irwin and the cats (household/faces/, PET_FILES), in
// Whack-a-Mouse and in Boo Chasing Her Tail. A player's token is Boo's own
// gold coin, household/faces/Boo Coin.png (Jon, 29 Oct 2026).
//
// Nothing is drawn at import, so node can import this file for the tests.
// The face ids are lib/arcade.js's (FACE_IDS); ART_FACES is the list this
// file draws (made from its drawing tables), so a test can check the art
// knows every one.

export const FACE_SIZE = 112, STRIP_W = 1200, STRIP_H = 100

// Every face is drawn in a 72-unit square (station/keys/make.html's key), on
// a pen scaled by k = size / 72, so its insets, lines, radii and type keep
// their proportions at any size.
const UNIT = 72, MID = UNIT / 2

// The house palette (play/src/styles.css), and the arcade's gold and green.
const HOUSE = { claret: '#592F32', red: '#bf1925', brass: '#A6A253', parchment: '#F1E8D6', charcoal: '#1F2124' }
const GOLD = { hi: '#fff6c4', mid: '#d6cf86', lo: '#a6903a', dim: '#5c5426' }
const GREEN = '#33bd66' // a success, with a black tick on it (8.6 to 1)
const INK = '#111114' // Boo's black fur, and the tick
const SERIF = '"New York", "Source Serif 4", Georgia, serif'
const SANS = '"Source Sans 3", -apple-system, BlinkMacSystemFont, system-ui, sans-serif'
const EMOJI = '"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif'

// Knock It Off the Table's eight things, in the order they come (lib/arcade.js KNOCK_OBJECTS).
const OBJECTS = ['vase', 'teacup', 'teapot', 'candle', 'picture', 'clock', 'plant', 'cake']
const PICTURE = {
  mouse: '🐭', swipe: '🐾', yarn: '🧶', basket: '🧺', cat: '🐈‍⬛',
  vase: '🏺', teacup: '☕', teapot: '🫖', candle: '🕯️', picture: '🖼️', clock: '🕰️', plant: '🪴', cake: '🎂',
}
// The menu's five keys: each game's picture on a parchment plate over its
// short name in gold (lib/arcade.js GAMES). The Tail key is a black cat (Jon,
// 29 Oct 2026), and the Knock key is Boo's paws, her swipe (Jon, 29 Oct 2026).
const MENU = { tail: ['cat', 'Tail'], pointer: ['dot', 'Pointer'], mice: ['mouse', 'Mice'], knock: ['swipe', 'Knock'], yarn: ['yarn', 'Yarn'] }

// Faces that are one flat colour. The deck paints these with fillKeyColor
// (one small report, no picture to send); the rest are pictures. The deck on
// the Mac's screen draws them (FACES) from the same colours, so the two match.
const RUG = HOUSE.claret // Boo Chasing Her Tail's floor, under every key of her tail too
const rgbOf = hex => Object.freeze([1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16))) // '#rrggbb' as [r, g, b]
const SOLID = new Map([
  ['off', Object.freeze([0, 0, 0])],
  ['blank', Object.freeze([0, 0, 0])],
  ['rug', rgbOf(RUG)],
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
// her friends in Whack-a-Mouse and Boo Chasing Her Tail (lib/arcade.js PETS).
export const PET_FILES = Object.freeze({
  boo: 'Boo Face.png', granola: 'Granola Face.png', irwin: 'Irwin Face.png', salem: 'Salem Face.png', zimmy: 'Zimmy Face.png',
})
// Boo's coin (Jon, 29 Oct 2026): a player's token, on the keys and the screen.
export const COIN_FILE = 'Boo Coin.png'
const PICTURE_FILES = Object.freeze({ ...PET_FILES, coin: COIN_FILE })
// The coin's picture, for the screen's list of players.
export const coinUrl = () => `${import.meta.env?.BASE_URL ?? '/'}household/faces/${encodeURIComponent(COIN_FILE)}`
// Each face picture is 1500 pixels square and a key wants about a hundred.
// Halving it a few times, smoothly, keeps the eyes and whiskers clean when it
// is drawn small: the halves are kept smallest first, the picture itself last.
const levels = new Map() // pet (or 'coin') -> its halvings
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
    img.src = `${import.meta.env?.BASE_URL ?? '/'}household/faces/${encodeURIComponent(PICTURE_FILES[pet])}`
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

// Waits for the two house fonts (play/index.html loads them), the five face
// pictures and Boo's coin, then forgets every face drawn so far, so each is drawn again with
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
    ...Object.keys(PICTURE_FILES).map(pet => settle(() => loadFace(pet))),
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
    if (kind === 'tail-tip' && has(TURNS, arg)) return tailTip(g, k, arg)
    if (kind === 'tail-end' && has(TURNS, arg)) return tailEnd(g, k, arg)
    if (kind === 'tail-fur' && FUR_PAIRS.includes(arg)) return tailFur(g, k, ...arg.split('-'))
    if (OBJECTS.includes(arg) && has(SCENES, kind)) return SCENES[kind](g, k, arg)
    if (has(PET_FILES, arg) && has(PETS_DRAWN, kind)) return PETS_DRAWN[kind](g, k, arg)
  }
  lacquer(g); big(g, '?', 40) // a face this file does not know: plain to see when testing
}

const FACES = {
  off: g => flat(g, '#000'),
  blank: g => flat(g, '#000'),
  // every success: the green tick (Jon, 29 Oct 2026); every strike: the red
  // cross (strike, below), here over nothing
  hit: g => { flat(g, GREEN); tick(g) },
  miss: g => strike(g),
  ok: g => { flat(g, GREEN); tick(g) },
  // the menu's top row: a marquee of gold paws, one in three lit at a time
  // (lib/arcade.js marquee), Boo in the middle
  paw: g => { lacquer(g); pawPrint(g, GOLD.dim) },
  'paw-lit': (g, k) => { lacquer(g); glowing(g, k, 'rgba(255, 226, 122, 0.9)', 9, () => pawPrint(g, litGold(g))) },
  boo: (g, k) => { jewel(g, HOUSE.claret, '#8a4a50'); booFace(g, k, BOO_FRAMED); goldRim(g) },
  back: g => { jewel(g, HOUSE.claret, '#7a4247'); goldRim(g); arrowLeft(g, MID, 27); words(g, 'Back', 15, 54) },
  // a player's tokens: Boo's gold coin to spend, an empty ring as big once spent
  coin: (g, k) => { lacquer(g); coin(g, k) },
  'coin-spent': g => { lacquer(g); ring(g, MID, MID, COIN_ACROSS / 2 - 2.5, 3.5, 'rgba(214, 207, 134, 0.5)') },
  // Boo Chasing Her Tail, over the whole board (Jon, 29 Oct 2026): the claret
  // rug is the floor; Boo herself, the player's piece, big and bright on gold
  // in a gold frame; walls of grey stone (bricks) and her friends (PETS_DRAWN's
  // pet faces) in her way; her black tail and its white tip (tailFur, tailEnd, tailTip)
  rug: g => flat(g, RUG),
  'tail-boo': (g, k) => { goldGround(g); glowing(g, k, 'rgba(255, 255, 255, 0.95)', 5, () => booFace(g, k, BOO_PIECE)); rim(g, INK, 6, 1.6); goldRim(g, 2.5, 3.5) },
  wall: g => bricks(g),
  // The Lazy Pointer: the red dot, the sparkles, and Boo napping, waking and after the dot
  dot: (g, k) => { lacquer(g); laserDot(g, k, MID, MID, 19) },
  sparkle: (g, k) => { lacquer(g); glowing(g, k, 'rgba(255, 226, 122, 0.95)', 8, () => sparkle(g, MID, MID, 27, litGold(g))) },
  'boo-nap': (g, k) => { flat(g, HOUSE.charcoal); g.globalAlpha = 0.55; booFace(g, k, 46, MID - 5, MID + 8); g.globalAlpha = 1; snore(g) },
  'boo-alert': (g, k) => { jewel(g, HOUSE.claret, '#8a4a50'); booFace(g, k, BOO_FULL - 8, MID - 4, MID + 4); bang(g) },
  chaser: (g, k) => { jewel(g, HOUSE.claret, '#8a4a50'); booFace(g, k, BOO_FULL) },
  caught: (g, k) => strike(g, () => booFace(g, k, BOO_FRAMED)),
  // Whack-a-Mouse (Boo's friends: PETS_DRAWN below)
  mouse: g => { spot(g); emoji(g, PICTURE.mouse, 50) },
  'mouse-gold': (g, k) => { goldGround(g); glowing(g, k, 'rgba(255, 252, 230, 0.95)', 9, () => emoji(g, PICTURE.mouse, 50)) },
  // Knock It Off the Table (the things on it: SCENES below)
  cloth: g => tableTop(g),
  edge: g => tableTop(g, true),
  // Yarn Catch
  yarn: g => { spot(g); emoji(g, PICTURE.yarn, 48) },
  'yarn-gold': (g, k) => { goldGround(g); glowing(g, k, 'rgba(255, 252, 230, 0.95)', 9, () => emoji(g, PICTURE.yarn, 48)) },
  basket: g => { lacquer(g); goldRim(g); emoji(g, PICTURE.basket, 46, MID, 39) },
  'basket-catch': g => { flat(g, GREEN); emoji(g, PICTURE.basket, 40, MID, 45); tick(g, 0.45, MID, 13) },
  'yarn-miss': g => { lacquer(g); g.globalAlpha = 0.4; emoji(g, PICTURE.yarn, 32, MID, 40); g.globalAlpha = 1; cross(g, MID, 36, 14, '#e8323d', 6) },
}

// The count's 3, 2, 1, in gold.
function number(g, n) { lacquer(g); goldRim(g); big(g, n, 52, litGold(g)) }

// A game on the menu: its picture on a parchment plate over its short name in gold.
function menu(g, k, game) {
  const [pic, label] = MENU[game]
  lacquer(g); goldRim(g, 3, 2.5)
  disc(g, MID, 27, 18, HOUSE.parchment)
  if (pic === 'dot') laserDot(g, k, MID, 27, 10)
  else emoji(g, PICTURE[pic], 28, MID, 27)
  words(g, label, 15, 57, { colour: GOLD.mid, max: 56 })
}

// ---- Boo Chasing Her Tail: her tail ---------------------------------------

// Her tail is one band of black fur, three keys long, anywhere on the board
// (Jon, 29 Oct 2026: "run over the entire board"), drawn key by key so the
// keys line up: across a key, or round a corner (tailFur), from the side it
// comes from to the middle at its end (tailEnd), and to a white puff ringed in
// black at its tip (tailTip), pointing the way it lies. Each of its keys is the
// rug under it, so it lies on the floor next to anything, and the black fur
// has a soft gold glow, so it stands out from the claret.
const TURNS = { right: 0, down: Math.PI / 2, left: Math.PI, up: -Math.PI / 2 }
const FUR_PAIRS = ['left-right', 'down-up', 'down-left', 'down-right', 'left-up', 'right-up'] // lib/arcade.js FUR_PAIRS
const SIDE = { left: [0, MID], right: [UNIT, MID], up: [MID, 0], down: [MID, UNIT] } // each side's middle
const TAIL_R = 15 // the tail's half-width
function tailFur(g, k, a, b) { furOnRug(g, k, () => furPath(g, tailPoints(a, b, 15), TAIL_R)) }
function tailEnd(g, k, way) { furOnRug(g, k, () => furPath(g, tailPoints(way, null, 8), TAIL_R, 0.72)) }
function tailTip(g, k, way) {
  const back = { up: 'down', down: 'up', left: 'right', right: 'left' }[way]
  const x = MID + Math.cos(TURNS[way]) * 13, y = MID + Math.sin(TURNS[way]) * 13
  furOnRug(g, k, () => { furPath(g, tailPoints(back, null, 8), TAIL_R); fluffPath(g, x, y, 17) })
  fluff(g, x, y, 13.5, '#fff')
}
// The rug, and black fur on it in a gold glow. The fur is one shape, filled
// once, so the glow goes round its outside only.
function furOnRug(g, k, shape) {
  flat(g, RUG)
  glowing(g, k, 'rgba(255, 226, 122, 1)', 8, () => { g.beginPath(); shape(); g.fillStyle = INK; g.fill() })
}
// Points along the tail from one side's middle to another's (or to the key's
// middle, for null): straight, or round the corner two sides share.
function tailPoints(from, to, n) {
  const [x0, y0] = SIDE[from] ?? [MID, MID], [x1, y1] = SIDE[to] ?? [MID, MID]
  if (SIDE[from] && SIDE[to] && x0 !== x1 && y0 !== y1) {
    const cx = x0 === MID ? x1 : x0, cy = y0 === MID ? y1 : y0
    const a0 = Math.atan2(y0 - cy, x0 - cx)
    let a1 = Math.atan2(y1 - cy, x1 - cx)
    if (a1 - a0 > Math.PI) a1 -= 2 * Math.PI
    if (a0 - a1 > Math.PI) a1 += 2 * Math.PI
    return Array.from({ length: n }, (_, i) => { const a = a0 + (a1 - a0) * i / (n - 1); return [cx + MID * Math.cos(a), cy + MID * Math.sin(a)] })
  }
  return Array.from({ length: n }, (_, i) => [x0 + (x1 - x0) * i / (n - 1), y0 + (y1 - y0) * i / (n - 1)])
}
// Fur along the points, `r` thick each side (narrowing to `end` of it at the
// last point), with a tuft out each side every other point: added to the
// pen's path, for furOnRug to fill.
function furPath(g, points, r, end = 1) {
  points.forEach(([x, y], i) => {
    const w = r * (1 - (1 - end) * i / Math.max(1, points.length - 1))
    g.moveTo(x + w, y); g.arc(x, y, w, 0, Math.PI * 2)
    if (i % 2) return
    const [px, py] = points[Math.max(0, i - 1)], [nx, ny] = points[Math.min(points.length - 1, i + 1)]
    const len = Math.hypot(nx - px, ny - py) || 1
    const ux = -(ny - py) / len, uy = (nx - px) / len // across the tail
    for (const side of [1, -1]) {
      const tx = x + ux * w * 0.86 * side, ty = y + uy * w * 0.86 * side
      g.moveTo(tx + w * 0.38, ty); g.arc(tx, ty, w * 0.38, 0, Math.PI * 2)
    }
  })
}

// ---- Knock It Off the Table's scenes ----------------------------------------

// A table across each row: a claret cloth with a gold braid along its top and
// gold tassels under it. The end key's cloth stops at a gold post, with a
// gold arrow down where things fall, and a gold rim: the key to press.
const TOP = 44, BAND = 12 // where the cloth starts, and how deep it is
function tableTop(g, edge = false) {
  lacquer(g)
  const end = edge ? 54 : UNIT
  const w = g.createLinearGradient(0, TOP, 0, TOP + BAND)
  w.addColorStop(0, '#8a4a50'); w.addColorStop(1, HOUSE.claret)
  g.fillStyle = w; g.fillRect(0, TOP, end, BAND)
  g.fillStyle = GOLD.mid
  g.fillRect(0, TOP - 1.5, end, 2.5)
  for (let x = 6; x < end - 3; x += 12) g.fillRect(x - 1, TOP + BAND, 2, 5)
  if (!edge) return
  g.fillRect(end - 1, TOP - 4, 4, BAND + 6)
  g.beginPath(); g.moveTo(57, 49); g.lineTo(68, 49); g.lineTo(62.5, 58); g.closePath(); g.fill()
  goldRim(g)
}
const SCENES = {
  // on the cloth: standing on it
  table: (g, k, obj) => { tableTop(g); emoji(g, PICTURE[obj], 40, MID, TOP - 1, true) },
  // on the end: teetering
  edge: (g, k, obj) => {
    tableTop(g, true)
    g.save(); g.translate(30, TOP - 1); g.rotate(0.2); emoji(g, PICTURE[obj], 40, 0, 0, true); g.restore()
  },
}

// ---- Boo's friends ----------------------------------------------------------

// Each of Boo's friends (lib/arcade.js PETS): up among the mice in
// Whack-a-Mouse or in Boo's way in Boo Chasing Her Tail, and just tapped
// (petFace, below, draws the sticker).
const PET_SIZE = 56, OOPS_SIZE = 50
const PETS_DRAWN = {
  // up, or in the way: in the spotlight, like a mouse
  pet: (g, k, pet) => { spot(g); petFace(g, k, pet, PET_SIZE) },
  // tapped: a strike, the friend faint under the cross
  oops: (g, k, pet) => strike(g, () => petFace(g, k, pet, OOPS_SIZE)),
}

// Every face this file draws, made from the tables that draw them (FACES, the
// count's 3, 2, 1, MENU, the tail's pieces, SCENES, PETS_DRAWN), so the list can
// never name a face that has no drawing.
export const ART_FACES = Object.freeze([
  ...Object.keys(FACES), 'num:1', 'num:2', 'num:3', ...Object.keys(MENU).map(g => `menu:${g}`),
  ...Object.keys(TURNS).flatMap(way => [`tail-tip:${way}`, `tail-end:${way}`]), ...FUR_PAIRS.map(pair => `tail-fur:${pair}`),
  ...Object.keys(SCENES).flatMap(scene => OBJECTS.map(o => `${scene}:${o}`)),
  ...Object.keys(PETS_DRAWN).flatMap(kind => Object.keys(PET_FILES).map(pet => `${kind}:${pet}`)),
])
const KNOWN = new Set(ART_FACES)
export function knowsFace(id) { return typeof id === 'string' && KNOWN.has(id) }

// ---- drawing helpers (in the 72-unit square) --------------------------------

function flat(g, fill) { g.fillStyle = fill; g.fillRect(0, 0, UNIT, UNIT) }
// Black lacquer: black, with a soft sheen above the middle.
function lacquer(g) {
  const r = g.createRadialGradient(MID, 22, 2, MID, 30, UNIT * 0.72)
  r.addColorStop(0, '#2a2c31'); r.addColorStop(1, '#000')
  g.fillStyle = r; g.fillRect(0, 0, UNIT, UNIT)
}
// A spotlight on black, for whatever pops up.
function spot(g) {
  const r = g.createRadialGradient(MID, MID, 3, MID, MID, UNIT * 0.62)
  r.addColorStop(0, '#3a3c42'); r.addColorStop(1, '#000')
  g.fillStyle = r; g.fillRect(0, 0, UNIT, UNIT)
}
// A jewel colour, glowing lighter in the middle.
function jewel(g, fill, centre) {
  const r = g.createRadialGradient(MID, MID, 4, MID, MID, UNIT * 0.75)
  r.addColorStop(0, centre); r.addColorStop(1, fill)
  g.fillStyle = r; g.fillRect(0, 0, UNIT, UNIT)
}
// Gold, brighter in the middle: a gold mouse's or ball's ground.
function goldGround(g) {
  const r = g.createRadialGradient(MID, MID, 4, MID, MID, UNIT * 0.75)
  r.addColorStop(0, GOLD.hi); r.addColorStop(0.6, GOLD.mid); r.addColorStop(1, GOLD.lo)
  g.fillStyle = r; g.fillRect(0, 0, UNIT, UNIT)
}
// Gold lit from above, like a bulb.
function litGold(g) {
  const f = g.createLinearGradient(0, 12, 0, 60)
  f.addColorStop(0, GOLD.hi); f.addColorStop(1, '#d8c45a')
  return f
}
function roundRect(g, x, y, w, h, r) {
  if (typeof g.roundRect === 'function') return g.roundRect(x, y, w, h, r)
  g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r)
  g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath()
}
// A rounded frame round the key.
function rim(g, colour, inset = 3, width = 2) {
  g.beginPath(); roundRect(g, inset, inset, UNIT - 2 * inset, UNIT - 2 * inset, 9)
  g.lineWidth = width; g.strokeStyle = colour; g.stroke()
}
// The gold frame: a key to press, or a picture worth framing.
function goldRim(g, inset = 3, width = 2.5) {
  const f = g.createLinearGradient(0, 0, 0, UNIT)
  f.addColorStop(0, GOLD.hi); f.addColorStop(0.5, GOLD.mid); f.addColorStop(1, GOLD.lo)
  rim(g, f, inset, width)
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
// Words, centred on a line.
function words(g, s, px, y, { colour = HOUSE.parchment, max = UNIT - 14 } = {}) {
  const t = fit(g, s, px, max)
  g.fillStyle = colour; g.textAlign = 'center'; g.textBaseline = 'middle'
  g.fillText(t, MID, y)
}
// One big character, its ink centred on the key.
function big(g, s, px, colour = HOUSE.parchment) {
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
  g.fillStyle = HOUSE.parchment; g.textAlign = 'center'; g.textBaseline = 'alphabetic'
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
// A sparkle: a four-pointed star, long and thin.
function sparkle(g, x, y, R, fill) {
  g.beginPath()
  for (let i = 0; i < 8; i++) {
    const a = -Math.PI / 2 + i * Math.PI / 4, d = i % 2 ? R * 0.26 : R
    g.lineTo(x + d * Math.cos(a), y + d * Math.sin(a))
  }
  g.closePath(); g.fillStyle = fill; g.fill()
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
// A token: Boo's coin (Jon's picture), softly lit, COIN_ACROSS units across.
// Before loadArt() has the picture (and all session, if it came after
// loadArt's wait), a drawn gold coin with a star struck in it stands in.
// Where the coin sits in its 1500-pixel picture, as shares of it (left, top,
// right, bottom; measured 29 Oct 2026 where it is more than faintly there,
// alpha over 100, like PET_BOXES): a test checks it against the picture.
export const COIN_BOX = Object.freeze([0.071, 0.075, 0.92, 0.927])
const COIN_ACROSS = 64 // most of the key (Jon, 29 Oct 2026, of the coins: "They need to be bigger")
function coin(g, k) {
  const [l, t, r, b] = COIN_BOX
  const d = COIN_ACROSS / Math.max(r - l, b - t) // the whole picture, drawn this big
  const src = levelFor('coin', d * k)
  const R = COIN_ACROSS / 2 - 2 // the stand-in's edge, a hair inside the picture's
  glowing(g, k, 'rgba(214, 207, 134, 0.6)', 6, () => {
    if (src) {
      g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high'
      g.drawImage(src, MID - d * (l + r) / 2, MID - d * (t + b) / 2, d, d)
      return
    }
    const f = g.createRadialGradient(MID - R / 3, MID - R * 0.375, 2, MID, MID, R)
    f.addColorStop(0, GOLD.hi); f.addColorStop(0.55, GOLD.mid); f.addColorStop(1, GOLD.lo)
    disc(g, MID, MID, R, f)
  })
  if (src) return
  ring(g, MID, MID, R * 0.77, R / 15, GOLD.lo)
  star(g, MID, MID + 1, R * 0.375, R * 0.15, GOLD.lo)
}
// The red dot: a glowing red disc.
function laserDot(g, k, x, y, r) {
  glowing(g, k, 'rgba(255, 42, 42, 0.85)', r * 0.9, () => {
    const f = g.createRadialGradient(x - r * 0.3, y - r * 0.3, r * 0.05, x, y, r)
    f.addColorStop(0, '#ff2a2a'); f.addColorStop(1, '#7a0000')
    disc(g, x, y, r, f)
  })
}
// A puff of fur: a disc with a ruff of little ones round it, one shape
// (fluffPath adds it to the pen's path; fluff fills it).
function fluffPath(g, x, y, r) {
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2, cx = x + Math.cos(a) * r * 0.78, cy = y + Math.sin(a) * r * 0.78
    g.moveTo(cx + r * 0.3, cy); g.arc(cx, cy, r * 0.3, 0, Math.PI * 2)
  }
  g.moveTo(x + r * 0.84, y); g.arc(x, y, r * 0.84, 0, Math.PI * 2)
}
function fluff(g, x, y, r, fill) { g.beginPath(); fluffPath(g, x, y, r); g.fillStyle = fill; g.fill() }
// Boo asleep: two little gold z's.
function snore(g) {
  g.fillStyle = GOLD.mid; g.textAlign = 'center'; g.textBaseline = 'middle'
  g.font = `600 17px ${SERIF}`; g.fillText('z', 52, 21)
  g.font = `600 12px ${SERIF}`; g.fillText('z', 61, 11)
}
// Boo awake: a red badge with a "!".
function bang(g) {
  disc(g, 57, 15, 11, HOUSE.red)
  g.fillStyle = HOUSE.parchment; g.textAlign = 'center'; g.textBaseline = 'middle'
  g.font = `700 17px ${SANS}`; g.fillText('!', 57, 16)
}
// The tick: black, on the green of a success (`size` 1 fills the key).
function tick(g, size = 1, x = MID, y = MID) {
  const p = (u, v) => [x + u * size, y + v * size]
  g.beginPath(); g.moveTo(...p(-16, 1)); g.lineTo(...p(-5, 12)); g.lineTo(...p(17, -12))
  g.lineWidth = 8 * size; g.lineCap = 'round'; g.lineJoin = 'round'; g.strokeStyle = INK; g.stroke()
}
function cross(g, x, y, r, colour, width = 5) {
  g.beginPath(); g.moveTo(x - r, y - r); g.lineTo(x + r, y + r); g.moveTo(x + r, y - r); g.lineTo(x - r, y + r)
  g.lineWidth = width; g.lineCap = 'round'; g.strokeStyle = colour; g.stroke()
}
// A strike (Jon, 29 Oct 2026: every strike a red cross): the house red, what
// was hit (`picture`) faint under it, and a big parchment cross over it all,
// edged in dark red so it stays clear over a face.
function strike(g, picture) {
  flat(g, HOUSE.red)
  if (picture) { g.globalAlpha = 0.4; picture(); g.globalAlpha = 1 }
  cross(g, MID, MID, 18, '#5a0a10', 11)
  cross(g, MID, MID, 18, HOUSE.parchment, 7.5)
}
// A wall in Boo's way: three courses of grey stone bricks (the house's
// parchment over its charcoal), each lit from above, in charcoal mortar.
// Lighter than the rug, so it stands out from the floor, and darker than
// Boo's gold, so she is still the brightest key on the board: in dim light
// the eye finds the brightest first.
function bricks(g) {
  flat(g, HOUSE.charcoal)
  const high = UNIT / 3, long = UNIT / 2, gap = 3 // a course, a brick, the mortar
  for (let row = 0; row < 3; row++) {
    const y = row * high
    for (let x = row % 2 ? -long / 2 : 0; x < UNIT; x += long) {
      const from = x <= 0 ? 0 : x + gap / 2, to = x + long >= UNIT ? UNIT : x + long - gap / 2
      const f = g.createLinearGradient(0, y, 0, y + high)
      f.addColorStop(0, '#a29c92'); f.addColorStop(1, '#6c6860')
      g.fillStyle = f; g.fillRect(from, y + gap / 2, to - from, high - gap)
    }
  }
}
function arrowLeft(g, x, y) {
  g.beginPath()
  g.moveTo(x - 16, y); g.lineTo(x - 3, y - 11); g.lineTo(x - 3, y - 4.5); g.lineTo(x + 15, y - 4.5)
  g.lineTo(x + 15, y + 4.5); g.lineTo(x - 3, y + 4.5); g.lineTo(x - 3, y + 11); g.closePath()
  g.fillStyle = HOUSE.parchment; g.fill()
}

// Boo's face picture, `h` units high from the tips of her ears to her chin,
// its middle on (x, y) (the key's middle unless given): the picture at the
// nearest kept size above what the key needs. Before loadArt() has it (and
// all session, if it came after loadArt's wait), a plain black cat's head
// stands in.
// The sticker fills 97.5% of its picture's height and sits a hair left of its
// middle (measured 28 Oct 2026), so it is drawn that much right.
const BOO_TALL = 0.975, BOO_NUDGE = 0.01
const BOO_FRAMED = 58, BOO_FULL = 66, BOO_PIECE = 60 // inside a rim; on a key with no rim; Boo's piece, in its frame
function booFace(g, k, h, x = MID, y = MID) {
  const d = h / BOO_TALL
  const src = levelFor('boo', d * k)
  if (!src) return catHead(g, x, y, h * 0.88) // its outline is outside its height
  g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high'
  g.drawImage(src, x - d / 2 + d * BOO_NUDGE, y - d / 2, d, d)
}
// The smallest halving of a face picture at least `px` wide (else the picture
// itself), or null before it has loaded.
function levelFor(pet, px) {
  const list = levels.get(pet)
  return list ? list.find(c => (c.naturalWidth || c.width) >= px) ?? list[list.length - 1] : null
}

// Boo's friends: each sticker, outline and all, as big across its longer side
// as `size`, its middle on the key's. Where each sticker sits in
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

// The strip as lib/arcade.js describes it, tidied: the three words; in a
// game, its points (`score`), its strike boxes (`marks`), its time as lights
// (`lights`) and, for Yarn Catch, its two halves (`zones`); six dial labels.
const upTo = (v, top) => Math.min(top, Math.max(0, Math.round(Number(v)) || 0))
function stripShape(strip) {
  const t = v => (v == null ? '' : String(v))
  const n = Number(strip?.score)
  return {
    left: t(strip?.left), centre: t(strip?.centre), right: t(strip?.right),
    score: strip?.score == null || !Number.isFinite(n) ? null : Math.max(0, Math.round(n)),
    marks: strip?.marks ? { of: upTo(strip.marks.of, 5), used: upTo(strip.marks.used, 5) } : null,
    lights: strip?.lights ? { of: upTo(strip.lights.of, 12), lit: upTo(strip.lights.lit, 12) } : null,
    zones: !!strip?.zones,
    dials: [0, 1, 2, 3, 4, 5].map(i => t(strip?.dials?.[i])),
  }
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

// Black lacquer with a gold rule along each edge; the words in the parchment
// serif (the middle biggest); a game's points big in gold in the middle, its
// strike boxes on the left (a red box with a cross for each strike), its time
// as gold lights on the right, one going out every eighth; for Yarn Catch a
// big gold arrow in each half, the half you tap; the dial labels small, each
// over its dial.
function drawStrip(s) {
  const c = newCanvas(STRIP_W, STRIP_H)
  if (!c) return null
  const g = pen(c)
  try {
    const sheen = g.createLinearGradient(0, 0, 0, STRIP_H)
    sheen.addColorStop(0, '#2a2c31'); sheen.addColorStop(0.6, '#000'); sheen.addColorStop(1, '#000')
    g.fillStyle = sheen; g.fillRect(0, 0, STRIP_W, STRIP_H)
    const rule = g.createLinearGradient(0, 0, STRIP_W, 0)
    rule.addColorStop(0, GOLD.lo); rule.addColorStop(0.5, GOLD.hi); rule.addColorStop(1, GOLD.lo)
    g.fillStyle = rule; g.fillRect(0, 0, STRIP_W, 3); g.fillRect(0, STRIP_H - 3, STRIP_W, 3)

    const dials = s.dials.some(Boolean)
    const y = dials ? 36 : STRIP_H / 2 // the middle of the top line
    if (s.zones) halves(g)
    let left = PAD, right = STRIP_W - PAD // where the words may start and end
    if (s.marks) left = strikeBoxes(g, s.marks, PAD, y, dials ? 46 : 56) + GAP
    if (s.lights) right = timeLights(g, s.lights, STRIP_W - PAD, y, dials ? 10 : 12) - GAP

    g.textBaseline = 'middle'
    let side = STRIP_W / 2 - PAD - GAP // how wide the left and right words may be
    const middle = s.score != null ? String(s.score) : s.centre
    if (middle) {
      const short = Array.from(middle).length <= 3
      // Words with only the strike boxes and the time lights either side (a
      // strike's, in play) are centred in all the room between them, so the
      // longest ("Strike 2! That's Zimothy Clawford, Esq.") shrinks to fit it
      // and never reaches either. The rest is centred on the strip, and kept
      // clear of them too.
      const between = !short && !s.left && !s.right && !!(s.marks || s.lights)
      const x = between ? (left + right) / 2 : STRIP_W / 2
      const room = between ? right - left
        : s.left || s.right || s.marks || s.lights ? Math.min(560, 2 * Math.min(x - left, right - x)) : STRIP_W - 2 * PAD
      const t = fit(g, middle, short ? (dials ? 62 : 74) : 44, room, SERIF, short ? 700 : 600)
      const w = g.measureText(t).width
      if (s.zones) { g.fillStyle = '#000'; g.fillRect(x - w / 2 - 18, 8, w + 36, STRIP_H - 16) } // over the line between the halves
      g.fillStyle = short ? stripGold(g, y) : HOUSE.parchment
      g.textAlign = 'center'; g.fillText(t, x, y + (short ? 3 : 0))
      side = (STRIP_W - w) / 2 - PAD - GAP
    }
    g.fillStyle = HOUSE.parchment
    if (s.left && !s.marks) { const t = fit(g, s.left, 30, Math.min(side, right - left)); g.textAlign = 'left'; g.fillText(t, left, y) }
    if (s.right && !s.lights) { const t = fit(g, s.right, 30, Math.min(side, right - left)); g.textAlign = 'right'; g.fillText(t, right, y) }

    s.dials.forEach((label, i) => { if (label) dialLabel(g, label, DIAL_X[i], 83, 25) })
  } catch { /* the strip stays as far as it got */ }
  return c
}
// Gold for the big numbers, lit from above.
function stripGold(g, y) {
  const f = g.createLinearGradient(0, y - 30, 0, y + 30)
  f.addColorStop(0, GOLD.hi); f.addColorStop(1, '#d8c45a')
  return f
}
// Three strike boxes from `x` (Jon, 29 Oct 2026: "show x on the touch strip
// like 3 strikes"): gold outlines, and the house red with a parchment cross
// for each strike so far. Returns where they end.
function strikeBoxes(g, { of, used }, x, y, size) {
  const gap = size * 0.28
  for (let i = 0; i < of; i++) {
    const bx = x + i * (size + gap), by = y - size / 2
    g.beginPath(); roundRect(g, bx, by, size, size, size * 0.2)
    if (i < used) {
      g.fillStyle = HOUSE.red; g.fill()
      cross(g, bx + size / 2, y, size * 0.26, HOUSE.parchment, size * 0.13)
    } else {
      g.lineWidth = 3; g.strokeStyle = GOLD.mid; g.stroke()
    }
  }
  return x + of * (size + gap) - gap
}
// A game's time as gold lights ending at `right`: the lit ones first, and the
// last lit one goes out next. Returns where they start.
function timeLights(g, { of, lit }, right, y, r) {
  const gap = r * 1.1
  const start = right - of * 2 * r - (of - 1) * gap
  for (let i = 0; i < of; i++) {
    const x = start + r + i * (2 * r + gap)
    if (i < lit) {
      g.save(); g.shadowColor = 'rgba(255, 226, 122, 0.9)'; g.shadowBlur = r * 1.4
      const f = g.createRadialGradient(x - r * 0.3, y - r * 0.3, 1, x, y, r)
      f.addColorStop(0, GOLD.hi); f.addColorStop(1, '#d8c45a')
      g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fillStyle = f; g.fill()
      g.restore()
    } else {
      g.beginPath(); g.arc(x, y, r - 1.5, 0, Math.PI * 2); g.lineWidth = 3; g.strokeStyle = GOLD.dim; g.stroke()
    }
  }
  return start
}
// Yarn Catch's strip: its two halves, the one you tap is the way the basket
// goes (Jon, 29 Oct 2026), a big gold arrow in each and a gold line between.
function halves(g) {
  g.fillStyle = 'rgba(214, 207, 134, 0.5)'; g.fillRect(STRIP_W / 2 - 1.5, 12, 3, STRIP_H - 24)
  g.fillStyle = GOLD.mid
  arrowHead(g, 'left', 140, STRIP_H / 2, 56)
  arrowHead(g, 'right', STRIP_W - 140, STRIP_H / 2, 56)
  g.font = `600 28px ${SANS}`; g.textBaseline = 'middle'
  g.textAlign = 'left'; g.fillText('Tap', 186, STRIP_H / 2)
  g.textAlign = 'right'; g.fillText('Tap', STRIP_W - 186, STRIP_H / 2)
}

// A dial's label, centred over the dial. The arrows are drawn, not typed, so
// they look the same on every Mac (no font has to carry them).
const ARROWS = { '◀': 'left', '▶': 'right', '▲': 'up', '▼': 'down' }
function dialLabel(g, label, x, y, px) {
  const parts = label.replace(/[︎️]/g, '').match(/[◀▶▲▼]|[^\s◀▶▲▼]+/g) ?? []
  g.font = `600 ${px}px ${SANS}`
  g.fillStyle = HOUSE.parchment; g.textAlign = 'left'; g.textBaseline = 'middle'
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
