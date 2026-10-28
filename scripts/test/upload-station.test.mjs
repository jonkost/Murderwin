import test from 'node:test'
import assert from 'node:assert/strict'
import { keep, STATION_ZIP } from '../upload-station.mjs'

test('the Study station zip keeps the settings and the parts, and leaves out tests, the example and taught taps', () => {
  const s = '/r/station'
  for (const p of [s, `${s}/.env`, `${s}/station.mjs`, `${s}/node_modules/firebase/x.js`, `${s}/Start the Study.command`]) assert.equal(keep(p, s), true, p)
  for (const p of [`${s}/test`, `${s}/test/a.test.mjs`, `${s}/.env.example`, `${s}/touch-map.json`]) assert.equal(keep(p, s), false, p)
})

test('the zip lives in staff-only storage, and the page asks for the same path', async () => {
  const api = await import('node:fs').then(fs => fs.readFileSync(new URL('../../app/src/lib/studyTestApi.js', import.meta.url), 'utf8'))
  assert.ok(api.includes(`'${STATION_ZIP}'`))
})
