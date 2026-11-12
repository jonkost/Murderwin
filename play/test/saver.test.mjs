import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { SAVER_FACES, SAVER_FILES, SAVER_START_MS, SAVER_ON, CROSS_MS, DROP_MS, CORNER_MS, FACE_EVERY, FACE_PART, backAndForth, saverFace, saverSide, faceBox, saverAt, saverPlace } from '../src/lib/saver.js'
import { TRIMS } from '../src/look/look.js'
import { faceUrl } from '../src/lib/night.js'
import { LOOP_OF } from '../src/lib/rooms.js'

// The idle screens' screen saver (Jon, 12 Nov 2026: "For the loops just make the classic dvd screen saver with
// the cats and dog face picture when it bounces off the edge of the screen"; and on seeing the first clip:
// "You can make if faster and don't change faces with every bounce"; and then: "I want to have this on the second
// screenes. I'll need a link to it in the game setup").
const read = p => readFileSync(new URL(p, import.meta.url), 'utf8')
const NOW = 1_794_520_000_000 // an afternoon in November 2026
const SCREENS = [[1920, 1080], [1728, 1080], [1366, 1024], [1024, 1366], [640, 360]]
const near = (a, b, by = 1e-6) => Math.abs(a - b) <= by

test('the five faces are the household’s own, each cut to its edges', () => {
  assert.deepEqual(SAVER_FACES, ['irwin', 'granolia', 'boo', 'zimothy', 'salem'], 'the dog and the four cats')
  for (const who of SAVER_FACES) {
    assert.ok(faceUrl(who).endsWith(`household/faces/${encodeURIComponent(SAVER_FILES[who])}`), `${who} is the phone’s own face picture`)
    assert.ok(TRIMS[SAVER_FILES[who]], `${SAVER_FILES[who]} is measured (look/look.js TRIMS)`)
  }
  assert.equal(Object.keys(SAVER_FILES).length, SAVER_FACES.length)
})

test('something going back and forth between two walls', () => {
  assert.deepEqual(backAndForth(0), { at: 0, hits: 0 })
  assert.deepEqual(backAndForth(0.25), { at: 0.25, hits: 0 })
  assert.deepEqual(backAndForth(1), { at: 1, hits: 1 }, 'at the far wall, having met it')
  assert.deepEqual(backAndForth(1.25), { at: 0.75, hits: 1 }, 'on its way back')
  assert.deepEqual(backAndForth(2), { at: 0, hits: 2 }, 'home again')
  for (const odd of [-3, NaN, Infinity, undefined]) assert.deepEqual(backAndForth(odd), { at: 0, hits: 0 }, `${odd} is the start`)
})

test('one square moves; each face sits in it at its own shape, the same size as the others', () => {
  for (const [w, h] of SCREENS) {
    const side = saverSide(w, h)
    assert.ok(near(side, Math.min(w, h) * FACE_PART, 1e-9), 'a part of the screen’s shorter side')
    assert.ok(side < w && side < h, 'and it fits the screen')
    for (const who of SAVER_FACES) {
      const b = faceBox(who, w, h)
      assert.ok(near(b.w / b.h, TRIMS[SAVER_FILES[who]][4], 1e-9), `${who} keeps its shape on ${w} by ${h}`)
      assert.ok(near(b.w * b.h, side * side, 1e-6), `${who} is as big as the others`)
      assert.ok(near(b.dx, (side - b.w) / 2, 1e-9) && near(b.dy, (side - b.h) / 2, 1e-9), `${who} is centred on the square`)
      // so when the square meets a wall, the cat's own edge is within a sixteenth of its size of it: the outline's width
      assert.ok(Math.abs(b.dx) <= side * 0.06 && Math.abs(b.dy) <= side * 0.06, `${who} is close to the square’s edges (${(b.dx / side).toFixed(3)}, ${(b.dy / side).toFixed(3)})`)
    }
  }
  assert.ok(saverSide(0, 0) > 0 && Number.isFinite(saverSide(undefined, NaN)), 'a screen with no size yet never divides by nothing')
  const none = faceBox('irwin', 0, 0)
  assert.ok(none.w > 0 && none.h > 0 && Number.isFinite(none.dx))
  assert.ok(near(faceBox('nobody', 1920, 1080).w, saverSide(1920, 1080)), 'a name it does not know is the plain square')
})

test('the square never leaves the screen, on any screen, at any moment', () => {
  for (const [w, h] of SCREENS) {
    for (const which of Object.keys(SAVER_START_MS)) {
      for (let t = NOW; t < NOW + 10 * 60_000; t += 137) {
        const s = saverAt(t, w, h, { startMs: SAVER_START_MS[which] })
        assert.ok(s.left >= 0 && s.left + s.side <= w + 1e-6, `left ${s.left} on ${w}`)
        assert.ok(s.top >= 0 && s.top + s.side <= h + 1e-6, `top ${s.top} on ${h}`)
        assert.ok(SAVER_FACES.includes(s.who))
      }
    }
  }
  const tiny = saverAt(NOW, 0, 0)
  assert.ok(tiny.left === 0 && tiny.top === 0 && Number.isFinite(tiny.side), 'a screen with no size yet')
  assert.deepEqual(Object.keys(saverAt(NOW, 1920, 1080)), ['who', 'hits', 'side', 'left', 'top'])
})

test('it touches each edge exactly, and turns there, from every room screen’s own start', () => {
  const [w, h] = [1920, 1080]
  for (const startMs of Object.values(SAVER_START_MS)) {
    const at = (t, opts = { startMs }) => saverAt(t - startMs, w, h, opts) // t is the path's own clock
    // a moment the far side is met: an odd number of crossings since the clock began
    const k = Math.ceil(NOW / CROSS_MS) | 1
    const atRight = k * CROSS_MS
    const hit = at(atRight)
    assert.ok(near(hit.left + hit.side, w, 1e-6), 'the square’s edge is on the screen’s edge')
    assert.ok(at(atRight - 400).left + hit.side < w && at(atRight + 400).left + hit.side < w, 'short of it before, and away from it after')
    assert.equal(hit.hits, at(atRight - 1).hits + 1, 'that was one edge met')
    assert.ok(near(at(atRight + CROSS_MS).left, 0, 1e-6), 'and the left edge, one crossing later')
    // top and bottom the same way
    const j = Math.ceil(NOW / DROP_MS) | 1
    const bottom = at(j * DROP_MS)
    assert.ok(near(bottom.top + bottom.side, h, 1e-6))
    assert.ok(near(at((j + 1) * DROP_MS).top, 0, 1e-6))
  }
})

test('it keeps a face for ten edges, then becomes the next one, and only ever changes at an edge', () => {
  assert.equal(FACE_EVERY, 10, 'Jon: "don’t change faces with every bounce"')
  const [w, h] = [1728, 1080]
  let last = saverAt(NOW, w, h)
  let changes = 0
  let edges = 0
  for (let t = NOW + 1; t <= NOW + 5 * 60_000; t += 1) {
    const s = saverAt(t, w, h)
    if (s.hits !== last.hits) {
      edges += s.hits - last.hits
      assert.ok(t % CROSS_MS === 0 || t % DROP_MS === 0, `an edge was counted at ${t - NOW} ms, which is not one`)
    }
    if (s.who !== last.who) {
      changes++
      assert.notEqual(s.hits, last.hits, 'a face only ever changes as an edge is met')
      assert.equal(Math.floor(s.hits / FACE_EVERY), Math.floor(last.hits / FACE_EVERY) + 1, 'and only when the tenth edge is met')
      assert.equal(s.who, SAVER_FACES[(SAVER_FACES.indexOf(last.who) + 1) % SAVER_FACES.length], 'the next in the order')
    } else {
      assert.equal(Math.floor(s.hits / FACE_EVERY), Math.floor(last.hits / FACE_EVERY), 'the same face until then')
    }
    last = s
  }
  // five minutes: over a hundred edges, and a tenth as many changes
  assert.ok(edges > 100, `${edges} edges`)
  assert.equal(changes, Math.floor(last.hits / FACE_EVERY) - Math.floor(saverAt(NOW, w, h).hits / FACE_EVERY))
  assert.ok(changes >= 10 && changes <= edges / FACE_EVERY + 1, `${changes} changes in ${edges} edges`)
  // a face stays for about twenty-five seconds: long enough to watch it, short enough to meet all five
  const lasts = FACE_EVERY / (1000 / CROSS_MS + 1000 / DROP_MS)
  assert.ok(lasts > 15 && lasts < 40, `${lasts.toFixed(1)} seconds a face`)
  assert.deepEqual([0, 9, 10, 19, 20, 30, 40, 49, 50, 61].map(saverFace), ['irwin', 'irwin', 'granolia', 'granolia', 'boo', 'zimothy', 'salem', 'salem', 'irwin', 'granolia'])
  assert.equal(saverFace(-1), 'irwin')
  assert.equal(saverFace(NaN), 'irwin')
})

test('nothing jumps when the face changes: the same square carries every face', () => {
  for (const [w, h] of [[1920, 1080], [1366, 1024]]) {
    let last = saverAt(NOW, w, h)
    let changes = 0
    for (let t = NOW + 1; t <= NOW + 3 * 60_000; t += 1) {
      const s = saverAt(t, w, h)
      if (s.who !== last.who) changes++
      assert.ok(Math.abs(s.left - last.left) < 0.5 && Math.abs(s.top - last.top) < 0.5, `a millisecond apart is a fraction of a pixel, at a change too (${t - NOW} ms)`)
      assert.equal(s.side, last.side)
      last = s
    }
    assert.ok(changes >= 5, 'and the face did change, several times')
  }
})

test('once in a while it lands square in a corner', () => {
  assert.equal(CORNER_MS % CROSS_MS, 0)
  assert.equal(CORNER_MS % DROP_MS, 0)
  for (let ms = CROSS_MS; ms < CORNER_MS; ms += CROSS_MS) assert.notEqual(ms % DROP_MS, 0, 'and never sooner than that')
  const [w, h] = [1920, 1080]
  const corner = Math.ceil(NOW / CORNER_MS) * CORNER_MS
  const s = saverAt(corner, w, h)
  const onSide = near(s.left, 0, 1e-6) || near(s.left + s.side, w, 1e-6)
  const onTopOrBottom = near(s.top, 0, 1e-6) || near(s.top + s.side, h, 1e-6)
  assert.ok(onSide && onTopOrBottom, 'both edges in the same instant')
  assert.equal(s.hits, saverAt(corner - 1, w, h).hits + 2, 'two edges met at once')
  // between two corners it comes close and misses: within a third of a second of both edges, at least twice
  let close = 0
  for (let x = Math.ceil(NOW / CROSS_MS) * CROSS_MS; x < NOW + CORNER_MS; x += CROSS_MS) {
    const off = x % DROP_MS
    const gap = Math.min(off, DROP_MS - off)
    if (gap > 0 && gap <= 333) close++
  }
  assert.ok(close >= 2, `${close} near misses between corners`)
})

test('a reload carries on from the same place, and no two room screens are in step', () => {
  const a = saverAt(NOW, 1920, 1080, { startMs: SAVER_START_MS.study })
  const b = saverAt(NOW, 1920, 1080, { startMs: SAVER_START_MS.study })
  assert.deepEqual(a, b, 'the clock alone says where it is')
  // every room screen that idles has its own start, and no two are the same
  for (const loop of new Set(Object.values(LOOP_OF))) assert.ok(Number.isFinite(SAVER_START_MS[loop]), `${loop} has a start`)
  const starts = Object.values(SAVER_START_MS)
  assert.equal(new Set(starts).size, starts.length)
  const places = Object.keys(SAVER_START_MS).map(k => { const s = saverAt(NOW, 1920, 1080, { startMs: SAVER_START_MS[k] }); return `${Math.round(s.left / 20)},${Math.round(s.top / 20)}` })
  assert.equal(new Set(places).size, places.length, 'six screens, six different places at the same moment')
  // it moves briskly and smoothly: across a 1080p TV in six seconds (it was eleven), a few pixels a frame
  assert.equal(CROSS_MS, 6_000)
  assert.equal(DROP_MS, 4_100)
  const p = saverAt(NOW, 1920, 1080)
  const q = saverAt(NOW + 16, 1920, 1080)
  const step = Math.hypot(q.left - p.left, q.top - p.top)
  assert.ok(step > 3 && step < 7, `${step.toFixed(1)} pixels a frame`)
})

test('which screens play it: every room screen that idles, and a Mac’s second screen, each from its own start', () => {
  assert.deepEqual(SAVER_ON, { rooms: true, second: true }, 'Jon: "For the loops just make...", then "I want to have this on the second screenes"')
  // a room screen, by its own name
  for (const loop of new Set(Object.values(LOOP_OF))) assert.equal(saverPlace({ loop }), loop)
  assert.equal(saverPlace({ loop: 'nonsense' }), null, 'a name it does not know plays nothing')
  assert.equal(saverPlace({}), null, 'a screen with no loop of its own and not a second screen')
  assert.equal(saverPlace(), null)
  // a Mac's second screen (Idle's calm), by the room it stands in, or any other
  assert.equal(saverPlace({ calm: true, room: 'living' }), 'second-living')
  assert.equal(saverPlace({ calm: true, room: 'study' }), 'second-study')
  assert.equal(saverPlace({ calm: true, room: 'library' }), 'second-any')
  assert.equal(saverPlace({ calm: true }), 'second-any')
  assert.equal(saverPlace({ calm: true, loop: 'living' }), 'second-any', 'a second screen is never a room screen')
  // every place has a start of its own, so the Parlour's TV and the Mac beside it are never in step
  for (const place of ['second-living', 'second-study', 'second-any']) assert.ok(Number.isFinite(SAVER_START_MS[place]), place)
  assert.notEqual(SAVER_START_MS.living, SAVER_START_MS['second-living'])
  assert.notEqual(SAVER_START_MS.study, SAVER_START_MS['second-study'])
  const tv = saverAt(NOW, 1920, 1080, { startMs: SAVER_START_MS.living })
  const mac = saverAt(NOW, 1920, 1080, { startMs: SAVER_START_MS['second-living'] })
  assert.ok(Math.hypot(tv.left - mac.left, tv.top - mac.top) > 100, 'side by side, in different places')
})

test('the setup page and the Host tab name the second screens for it: those are the links', async () => {
  const { SECOND_DISPLAY, SECOND_DISPLAY_ROOMS, setupHref } = await import('../src/lib/setup.js')
  const all = [...SECOND_DISPLAY_ROOMS, SECOND_DISPLAY]
  assert.deepEqual(all.map(r => r.room), ['The screen saver: the Parlour Mac’s own screen', 'The screen saver: the Study Mac’s own screen', 'The screen saver: any other second screen'])
  assert.deepEqual(all.map(r => setupHref('/play/', r)), ['/play/?kiosk=decor&room=living', '/play/?kiosk=decor&room=study', '/play/?kiosk=decor'], 'the same three addresses as before')
  for (const r of all) {
    assert.match(r.when, /the five faces crossing the screen; dark with the room/)
    for (const line of [r.room, r.machine, r.when]) assert.ok(!/—|kiosk|localhost|splash|small and calm|crest/.test(line), line)
  }
  const { secondDisplayLinks } = await import('../src/lib/start.js')
  assert.deepEqual(secondDisplayLinks('https://example.test/play/').map(l => l.room), all.map(r => r.room), 'the Host tab’s Send list carries the same names')
  const setup = read('../src/screens/Setup.jsx')
  assert.ok(setup.includes('A Mac’s second screen plays the screen saver. Open this page on that screen and tap its line.'), 'the setup page says which lines they are')
  // a setup page: no guest screen links to it, and the saver itself still draws no words
  const kiosk = read('../src/screens/Kiosk.jsx')
  assert.ok(kiosk.includes("else if (which === 'decor') body = <Idle title=\"Sirwin Manor\" line=\"\" loop={null} room={decorRoom} calm />"), 'a second screen is the idle screen, calm')
  assert.ok(kiosk.indexOf('roomDark(n, living ? screen.data : null, serverNow())) body = <Dark') < kiosk.indexOf("which === 'decor') body"), 'and the dark comes first')
})

test('an idle room screen and a Mac’s second screen play it; a loop file still wins', () => {
  const rooms = read('../src/screens/Rooms.jsx')
  assert.ok(rooms.includes('export function Saver({ which, children = null })'))
  assert.ok(rooms.includes('? <LiveSplash room={splash} calm={calm} />') && rooms.includes(': <><p className="kiosk-crest">{title}</p><p className="kiosk-line">{line}</p></>'), 'the splash, or the crest, is still drawn: it shows if a face will not load')
  assert.ok(rooms.includes('const place = saverPlace({ loop, room, calm })'), 'lib/saver.js says which screens play it')
  assert.ok(rooms.includes('<Loop which={loop}>{place ? <Saver which={place}>{still}</Saver> : still}</Loop>'), 'the saver inside the loop slot: a loop file still wins')
  assert.ok(rooms.includes('{(failed || (slow && !ready)) && children}'), 'the splash shows if a face will not load or they are slow, and never flashes by while they come in')
  assert.ok(rooms.includes('const SAVER_WAIT_MS = 4000') && rooms.includes('setTimeout(() => setSlow(true), SAVER_WAIT_MS)') && rooms.includes('clearTimeout(id)'), 'four seconds, then the splash until they are in')
  assert.ok(rooms.includes('const ready = !failed && loaded >= SAVER_FACES.length'), 'all five, and none broken')
  assert.ok(rooms.includes('const w = el.clientWidth') && rooms.includes('saverAt(Date.now(), w, h, { startMs: SAVER_START_MS[which] ?? 0 })'), 'the screen’s own size and its own start, so the square meets the real edge on a TV, a Mac or an iPad')
  assert.ok(rooms.includes('cancelAnimationFrame(frame)'), 'and it stops when the screen has something to show')
  // the join code keeps its seal, and the bedroom's loop slot is as it was: the saver is for idle screens only
  assert.equal(rooms.split('<Saver ').length - 1, 1, 'one place only: Idle')
  const css = read('../src/styles.css')
  assert.ok(css.includes('.saver { position: absolute; inset: 0; overflow: hidden; pointer-events: none; opacity: 0; }') && css.includes('.saver.on { opacity: 1; }'), 'see-through until ready')
  assert.ok(!/\.saver[^{]*\{[^}]*display: none/.test(css), 'never display none: its pictures must load')
  // nothing for a guest to read, and no setup words
  const part = rooms.slice(rooms.indexOf('export function Saver'), rooms.indexOf('// The idle view of every kiosk'))
  assert.ok(part.length > 500 && !/>[A-Za-z][^<{]*</.test(part.replace(/alt=""/g, '')), 'the saver draws no words')
  // the look book shows it with no night and no sign-in
  const book = read('../src/look/LookBook.jsx')
  assert.ok(book.includes("if (show === 'saver')") && book.includes('<Section n="12" title="The screen saver"'))
})
