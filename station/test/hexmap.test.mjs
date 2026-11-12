// A8 (12 Nov 2026): Granolia's hint drawn as the wall hangs. The station's
// map from its panels to the ten drawn hexagons, and the copy in play.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { groupLayout } from '../lib/nanoleaf.js'
import { HEX_CENTRES, CHECK_HEXES, fitHexes, resolveHexes, isHexMap, readHexMap, writeHexMap } from '../lib/hexmap.js'
import * as walls from '../../play/src/lib/walls.js'

const raw = JSON.parse(readFileSync(new URL('./fixtures/elements-layout.json', import.meta.url), 'utf8'))
const layout = groupLayout(raw).panels.map(p => ({ id: p.id, x: p.x, y: p.y }))

test('the copy of the drawing is the rules card\'s', () => {
  assert.deepEqual(HEX_CENTRES, walls.HEX_CENTRES)
})

test('the real wall\'s layout fits the drawing turned half way round, one to one', () => {
  const hexes = fitHexes(layout)
  assert.deepEqual(hexes, [7, 5, 8, 6, 4, 1, 9, 2, 0, 3])
  assert.ok(isHexMap(hexes))
  assert.deepEqual(walls.hexOf(layout), hexes, 'the screen\'s fit agrees with the station\'s')
})

test('the drawing\'s first hexagon on the left is the wall\'s furthest right panel in the controller\'s own view', () => {
  const hexes = fitHexes(layout)
  const first = layout[hexes.indexOf(0)]
  assert.equal(first.x, Math.max(...layout.map(p => p.x)))
})

test('a turned copy still fits; a mirrored one or nine panels does not', () => {
  const a = 60 * Math.PI / 180
  const turned = layout.map(p => ({ id: p.id, x: p.x * Math.cos(a) - p.y * Math.sin(a), y: p.x * Math.sin(a) + p.y * Math.cos(a) }))
  assert.deepEqual(fitHexes(turned), fitHexes(layout))
  const mirrored = layout.map(p => ({ ...p, x: -p.x }))
  assert.equal(fitHexes(mirrored), null)
  assert.equal(walls.hexOf(mirrored), null)
  assert.equal(fitHexes(layout.slice(1)), null)
  assert.equal(fitHexes([]), null)
})

test('a saved map wins when it names every panel once, and is kept beside the taps', () => {
  const swapped = fitHexes(layout).slice()
  ;[swapped[0], swapped[1]] = [swapped[1], swapped[0]]
  const dir = mkdtempSync(join(tmpdir(), 'hexmap-'))
  const path = join(dir, 'hex-map.json')
  assert.equal(readHexMap(path), null)
  writeHexMap(path, layout, swapped)
  assert.deepEqual(resolveHexes(layout, readHexMap(path)), swapped)
  // a map with a hexagon twice, or a panel missing, falls back to the fit
  const bad = Object.fromEntries(layout.map(p => [p.id, 0]))
  assert.deepEqual(resolveHexes(layout, bad), fitHexes(layout))
  assert.deepEqual(resolveHexes(layout, { [layout[0].id]: 3 }), fitHexes(layout))
})

test('the check lights the first, a middle and the last hexagon', () => {
  assert.deepEqual(CHECK_HEXES, [0, 5, 9])
  const xs = CHECK_HEXES.map(i => HEX_CENTRES[i][0])
  assert.equal(xs[0], Math.min(...HEX_CENTRES.map(c => c[0])))
  assert.equal(xs[2], Math.max(...HEX_CENTRES.map(c => c[0])))
})

test('the screen uses the station\'s map when it sends one, the fit when it does not', () => {
  const swapped = fitHexes(layout).slice()
  ;[swapped[2], swapped[3]] = [swapped[3], swapped[2]]
  assert.deepEqual(walls.hexesFor({ layout, hexes: swapped }), swapped)
  assert.deepEqual(walls.hexesFor({ layout }), fitHexes(layout))
  assert.deepEqual(walls.hexesFor({ layout, hexes: [0, 0, 0] }), fitHexes(layout))
  assert.equal(walls.hexesFor({}), null)
})
