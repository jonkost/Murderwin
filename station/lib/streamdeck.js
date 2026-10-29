// The button box: a fifteen-key Stream Deck over USB, driven directly (the
// Elgato app must be closed). Each key is painted from its face in keys/,
// drawn in the game's branding (Jon, 28 Oct 2026; keys/make.html draws them):
// raw RGB, 72 pixels square, one file a key, plus ok and wrong for the corner
// flash. A missing face falls back to a solid colour with its name in a small
// bitmap font. No canvas library.
// Loaded only when a deck is plugged in; the fake stands in otherwise.

import { readFileSync } from 'node:fs'
import { DECK, COLOURS } from './study.js'

export const FACE_SIZE = 72
export const CORNER = DECK[0].length - 1   // the top-right key: blank, and the flash after Submit
const KEYS_DIR = new URL('../keys/', import.meta.url)

// One key's face at `size` pixels, or null when there is none (nearest
// pixel when the deck's keys are not 72 pixels).
export function face(name, size = FACE_SIZE, read = (n) => readFileSync(new URL(`${n}.rgb`, KEYS_DIR))) {
  let src
  try { src = read(name) } catch { return null }
  if (!src || src.length !== FACE_SIZE * FACE_SIZE * 3) return null
  src = Buffer.from(src)
  if (size === FACE_SIZE) return src
  const out = Buffer.alloc(size * size * 3)
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const from = (Math.floor(y * FACE_SIZE / size) * FACE_SIZE + Math.floor(x * FACE_SIZE / size)) * 3
    src.copy(out, (y * size + x) * 3, from, from + 3)
  }
  return out
}

const KEY_RGB = {
  red: [191, 25, 37], yellow: [230, 190, 40], green: [20, 140, 60],
  blue: [20, 70, 200], pink: [220, 60, 150], white: [235, 230, 215],
  undo: [60, 60, 60], submit: [166, 162, 83], blank: [0, 0, 0],
  '1': [30, 30, 30], '2': [30, 30, 30], '3': [30, 30, 30], '4': [30, 30, 30], '5': [30, 30, 30], '6': [30, 30, 30],
}
const TEXT_RGB = { white: [20, 20, 20], yellow: [20, 20, 20], submit: [10, 10, 10] }

// A 3×5 font: each glyph is five rows of three bits, top to bottom.
const FONT = {
  A: [0b010, 0b101, 0b111, 0b101, 0b101], B: [0b110, 0b101, 0b110, 0b101, 0b110], D: [0b110, 0b101, 0b101, 0b101, 0b110],
  E: [0b111, 0b100, 0b110, 0b100, 0b111], G: [0b011, 0b100, 0b101, 0b101, 0b011], H: [0b101, 0b101, 0b111, 0b101, 0b101],
  I: [0b111, 0b010, 0b010, 0b010, 0b111], K: [0b101, 0b101, 0b110, 0b101, 0b101], L: [0b100, 0b100, 0b100, 0b100, 0b111],
  M: [0b101, 0b111, 0b111, 0b101, 0b101], N: [0b110, 0b101, 0b101, 0b101, 0b101], O: [0b111, 0b101, 0b101, 0b101, 0b111],
  P: [0b110, 0b101, 0b110, 0b100, 0b100], R: [0b110, 0b101, 0b110, 0b101, 0b101], S: [0b011, 0b100, 0b010, 0b001, 0b110],
  T: [0b111, 0b010, 0b010, 0b010, 0b010], U: [0b101, 0b101, 0b101, 0b101, 0b111], W: [0b101, 0b101, 0b111, 0b111, 0b101],
  Y: [0b101, 0b101, 0b010, 0b010, 0b010],
  1: [0b010, 0b110, 0b010, 0b010, 0b111], 2: [0b111, 0b001, 0b111, 0b100, 0b111], 3: [0b111, 0b001, 0b111, 0b001, 0b111],
  4: [0b101, 0b101, 0b111, 0b001, 0b001], 5: [0b111, 0b100, 0b111, 0b001, 0b111], 6: [0b111, 0b100, 0b111, 0b101, 0b111],
}

// Paint one key: solid fill, the label centred. Returns an RGB buffer.
export function keyImage(name, size, { lit = true } = {}) {
  const fill = lit ? (KEY_RGB[name] ?? [40, 40, 40]) : [0, 0, 0]
  const text = TEXT_RGB[name] ?? [245, 240, 230]
  const buf = Buffer.alloc(size * size * 3)
  for (let i = 0; i < size * size; i++) { buf[i * 3] = fill[0]; buf[i * 3 + 1] = fill[1]; buf[i * 3 + 2] = fill[2] }
  if (!lit || name === 'blank') return buf
  const label = /^\d$/.test(name) ? name : name.toUpperCase()
  const big = label.length === 1
  const scale = big ? Math.floor(size / 7) : Math.max(1, Math.floor(size / (label.length * 4 + 1)))
  const glyphW = 3 * scale, gap = scale, glyphH = 5 * scale
  const totalW = label.length * glyphW + (label.length - 1) * gap
  const x0 = Math.floor((size - totalW) / 2), y0 = Math.floor((size - glyphH) / 2)
  ;[...label].forEach((ch, i) => {
    const rows = FONT[ch]
    if (!rows) return
    const gx = x0 + i * (glyphW + gap)
    rows.forEach((bits, r) => {
      for (let c = 0; c < 3; c++) {
        if (!(bits & (1 << (2 - c)))) continue
        for (let dy = 0; dy < scale; dy++) for (let dx = 0; dx < scale; dx++) {
          const x = gx + c * scale + dx, y = y0 + r * scale + dy
          if (x < 0 || y < 0 || x >= size || y >= size) continue
          const o = (y * size + x) * 3
          buf[o] = text[0]; buf[o + 1] = text[1]; buf[o + 2] = text[2]
        }
      }
    })
  })
  return buf
}

// The study's deck: fifteen keys, every one a button 72 pixels wide. That is
// each fifteen-key model, and never the arcade's Stream Deck + XL, which may
// share the Mac. It reads a deck as listed, so no other deck is ever opened:
// an open holds the deck, and the arcade's page could not then reach it.
// scripts/hardware-check.mjs counts decks by this same test.
export function isStudyDeck(listed) {
  const controls = listed?.modelInfo?.controls ?? []
  return controls.length === DECK.flat().length
    && controls.every(c => c.type === 'button' && c.pixelSize?.width === FACE_SIZE)
}

// Open the study's Stream Deck. Returns { size, paint(lit), shiver(), flash(ok), onKey(fn), close() },
// or null when the module is missing, no fifteen-key deck is plugged in or
// none will open, so the station stays up and the keyboard stands in.
// `load` is for the tests.
export async function openDeck({ log = () => {}, load = () => import('@elgato-stream-deck/node') } = {}) {
  let mod
  try { mod = await load() } catch { log('stream deck: module not installed'); return null }
  let devices
  try { devices = await mod.listStreamDecks() } catch (e) { log(`stream deck: cannot list the decks (${e?.message ?? e})`); return null }
  const kept = devices.filter(isStudyDeck)
  if (!kept.length) {
    const skipped = [...new Set(devices.map(d => d.modelInfo?.name ?? d.model))]
    log(skipped.length ? `stream deck: no fifteen-key deck (skipped ${skipped.join(', ')})` : 'stream deck: none plugged in')
    return null
  }
  let deck = null
  for (const d of kept) {
    try { deck = await mod.openStreamDeck(d.path); break } catch (e) { log(`stream deck: ${d.modelInfo.name} would not open (${e?.message ?? e})`) }
  }
  // Nothing tries the deck again while the station runs: the restart loop
  // only follows a stop.
  if (!deck) { log("stream deck: quit the Stream Deck app, then close and reopen the station's window"); return null }
  const size = deck.CONTROLS?.find(c => c.type === 'button')?.pixelSize?.width ?? FACE_SIZE
  const keys = DECK.flat()
  const listeners = []
  deck.on('down', (control) => {
    if (control?.type !== 'button') return   // a dial's press is not a key
    const name = keys[control.index]
    if (name && name !== 'blank') listeners.forEach(fn => fn(name))
  })
  deck.on('error', (e) => log(`stream deck: ${e?.message ?? e}`))
  const faces = Object.fromEntries([...keys, 'ok', 'wrong'].map(n => [n, face(n, size)]))
  if (Object.values(faces).some(f => !f)) log('stream deck: some key faces are missing (station/keys); those keys get plain letters')
  const dark = Buffer.alloc(size * size * 3)
  const image = (name, lit) => !lit ? dark : (faces[name] ?? keyImage(name, size, { lit }))
  let litNow = false
  const fill = async (i, buf) => {
    try { await deck.fillKeyBuffer(i, buf, { format: 'rgb' }) } catch (e) { log(`stream deck paint: ${e?.message ?? e}`) }
  }
  const paint = async (lit) => {
    litNow = lit
    for (let i = 0; i < keys.length; i++) await fill(i, image(keys[i], lit))
  }
  // The top-right key flashes a green tick for a right pair, a red cross for a wrong one.
  const flash = async (ok) => {
    const name = ok ? 'ok' : 'wrong'
    await fill(CORNER, faces[name] ?? keyImage(ok ? 'green' : 'red', size))
    await new Promise(r => setTimeout(r, 900))
    await fill(CORNER, image(keys[CORNER], litNow))
  }
  const shiver = async () => {
    for (let n = 0; n < 2; n++) {
      await paint(false); await new Promise(r => setTimeout(r, 90))
      await paint(true); await new Promise(r => setTimeout(r, 90))
    }
  }
  await deck.clearPanel()
  return {
    size, paint, shiver, flash,
    onKey: (fn) => listeners.push(fn),
    close: async () => { try { await deck.clearPanel(); await deck.close() } catch {} },
  }
}

export { COLOURS }
