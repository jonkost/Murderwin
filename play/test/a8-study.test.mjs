// A8 (12 Nov 2026), the Study's screen: three plain states, and Granolia's
// hint drawn with the rules card's hexagons, the right way round.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { studyState, STUDY_DONE_LINE } from '../src/lib/studyview.js'
import { HEX_CENTRES, hexOf, hexesFor } from '../src/lib/walls.js'
import { DEFAULT_STUDY_LINES } from '../src/lib/content.js'

const src = (p) => readFileSync(new URL(p, import.meta.url), 'utf8')

test('the states, as a table', () => {
  const rot = { finished: { g1: true } }
  const rows = [
    [{ state: 'idle', groupId: 'g2' }, rot, 'ready'],
    [{ state: 'idle', groupId: 'g1' }, rot, 'done'],
    [{ state: 'idle', groupId: null }, rot, 'waiting'],
    [{ state: 'absent', groupId: 'g2' }, rot, 'ready'],
    [{ state: 'playing', groupId: 'g2' }, rot, 'playing'],
    [{ state: 'reproducing' }, rot, 'playing'],
    [{ state: 'entering' }, rot, 'playing'],
    [{ state: 'done', groupId: 'g2' }, rot, 'done'],
    [null, null, 'waiting'],
  ]
  for (const [study, r, want] of rows) assert.equal(studyState(study, r), want, JSON.stringify(study))
  assert.equal(STUDY_DONE_LINE, 'Done. Back to the Parlour.')
})

test('Ready says one thing', () => {
  assert.equal(DEFAULT_STUDY_LINES.IDLE, 'Touch any hexagon to start.')
  for (const k of ['IDLE', 'PLAYING', 'REPRODUCING', 'ENTERING', 'SOLVED', 'CAPPED']) {
    assert.ok(DEFAULT_STUDY_LINES[k].split(/[.!?]\s/).length <= 2, `${k} is short`)
  }
})

test('the hint uses the rules card\'s ten hexagons, mapped through the station\'s map', () => {
  // the real wall's layout (station/test/fixtures, through the station's grouping) as the station sends it
  const layout = [
    { id: 7787, x: 310, y: 224 }, { id: 1295, x: 511, y: 224 }, { id: 3869, x: 210, y: 166 }, { id: 8588, x: 411, y: 166 },
    { id: 5517, x: 612, y: 166 }, { id: 15090, x: 813, y: 166 }, { id: 7456, x: 109, y: 108 }, { id: 6844, x: 712, y: 108 },
    { id: 4930, x: 913, y: 108 }, { id: 5065, x: 612, y: 50 },
  ]
  const hexes = hexOf(layout)
  assert.deepEqual(hexes, [7, 5, 8, 6, 4, 1, 9, 2, 0, 3], 'turned half way round, not mirrored')
  assert.equal(HEX_CENTRES.length, 10)
  assert.deepEqual(hexesFor({ layout }), hexes)
  const hint = src('../src/screens/StudyHexes.jsx')
  assert.match(hint, /HEX_CENTRES\.map\(\(c, h\) =>/, 'drawn from the same centres as the rules card')
  assert.match(hint, /const panel = hexes\.indexOf\(h\) \+ 1/, 'each drawn hexagon is the panel the map names')
  const kiosk = src('../src/screens/Kiosk.jsx')
  assert.ok(kiosk.includes("s.fallbackPattern && (hexesFor(s) ? <HexHint study={s} order={s.fallbackPattern} fallback />"), 'the wall-down pattern too')
})
