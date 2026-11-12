// A8 (12 Nov 2026): the Study test page's Check the map.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { HEX_CENTRES, matchLine } from '../src/lib/studyHexes.js'
import * as walls from '../../play/src/lib/walls.js'

test('the page draws the rules card\'s ten hexagons', () => {
  assert.deepEqual(HEX_CENTRES, walls.HEX_CENTRES)
})

test('plain words for each step', () => {
  assert.equal(matchLine(null), null)
  assert.match(matchLine({ kind: 'check', step: 2, of: 3 }), /^Check 2 of 3\./)
  assert.match(matchLine({ kind: 'remap', step: 4, of: 10 }), /Hexagon 4 of 10 is lit on the wall/)
  assert.match(matchLine({ kind: 'check', step: 3, of: 3, done: true, ok: true }), /All three match/)
})

test('the Study test page mounts it', () => {
  const src = readFileSync(new URL('../src/pages/StudyTest.jsx', import.meta.url), 'utf8')
  assert.match(src, /<CheckTheMap status=/)
  const part = readFileSync(new URL('../src/components/CheckTheMap.jsx', import.meta.url), 'utf8')
  for (const c of ["send('match')", "send('yes')", "send('no')", "send('hex', String(i))"]) assert.ok(part.includes(c), c)
})
