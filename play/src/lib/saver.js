// The idle screens' screen saver (Jon, 12 Nov 2026: "For the loops just make
// the classic dvd screen saver with the cats and dog face picture when it
// bounces off the edge of the screen"). One of the household's five faces
// crosses the screen in a straight line, turns at every edge, and becomes the
// next face each time it meets one. No React, no Firebase: whose face shows,
// and where, is worked out from the clock on the wall alone, so a reload or a
// screen that comes back to idle carries on from the same place, and
// play/test can read it.
import { trimOf } from '../look/look.js'

// The order the faces follow one another, and each one's picture in
// play/public/household/faces/ (the same files as lib/night.js faceUrl; a test
// keeps them equal).
export const SAVER_FACES = ['irwin', 'granolia', 'boo', 'zimothy', 'salem']
export const SAVER_FILES = { irwin: 'Irwin Face.png', granolia: 'Granola Face.png', boo: 'Boo Face.png', zimothy: 'Zimmy Face.png', salem: 'Salem Face.png' }

export const CROSS_MS = 11_000 // one way across the screen
export const DROP_MS = 7_400   // one way down it
// Both edges are met in the same instant once every CORNER_MS: the face lands
// square in a corner, the moment everyone waits for. Between two of those it
// comes close many times and misses.
export const CORNER_MS = 407_000
export const FACE_PART = 0.3   // a face's size, as a part of the screen's shorter side

// Each room screen starts somewhere else along the same path, so two screens
// in sight of each other are never in step (the names are lib/rooms.js LOOP_OF's).
export const SAVER_START_MS = { living: 0, study: 23_300, memory: 41_900, boo: 67_100, bedroom: 89_500, orangerie: 113_700 }

// Something going back and forth between 0 and 1: after `turns` crossings it
// is at `at`, and it has met a wall `hits` times.
export function backAndForth(turns) {
  const t = Number.isFinite(turns) && turns > 0 ? turns : 0
  const n = Math.floor(t)
  const f = t - n
  return { at: n % 2 === 0 ? f : 1 - f, hits: n }
}

// Whose face it is after `hits` edges.
export function saverFace(hits) {
  const n = Number.isFinite(hits) && hits > 0 ? Math.floor(hits) : 0
  return SAVER_FACES[n % SAVER_FACES.length]
}

// What moves is one square, the same for every face, so the path never jumps
// when the picture changes (the first build gave each face its own box, and a
// face hopped up to forty pixels as it changed; the review of 12 Nov 2026).
const size = n => Math.max(0, Number(n) || 0)
export function saverSide(w, h) {
  return Math.max(1, Math.min(size(w), size(h)) * FACE_PART)
}

// A face inside that square: the picture cut to its own edges (look/look.js
// TRIMS), at its own shape, centred, every face covering the same area. So a
// wider face is a little shorter, and each face's own edge is within a few
// hundredths of the square's when the square meets a wall: less than the
// width of the picture's outline. `dx` and `dy` place it in the square.
export function faceBox(who, w, h) {
  const shape = trimOf(SAVER_FILES[who])[4] || 1
  const side = saverSide(w, h)
  const fw = side * Math.sqrt(shape)
  const fh = side / Math.sqrt(shape)
  return { w: fw, h: fh, dx: (side - fw) / 2, dy: (side - fh) / 2 }
}

// The whole picture at `ms` on a screen of w by h: whose face shows, the
// square's side, and where the square's top left corner is, in pixels.
// `startMs` is the screen's own place along the path (SAVER_START_MS).
export function saverAt(ms, w, h, { startMs = 0 } = {}) {
  const t = (Number(ms) || 0) + (Number(startMs) || 0)
  const x = backAndForth(t / CROSS_MS)
  const y = backAndForth(t / DROP_MS)
  const hits = x.hits + y.hits
  const side = saverSide(w, h)
  return {
    who: saverFace(hits),
    hits,
    side,
    left: x.at * Math.max(0, size(w) - side),
    top: y.at * Math.max(0, size(h) - side),
  }
}
