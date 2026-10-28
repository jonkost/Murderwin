import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { buildStationCode } from '../station-code.mjs'

test('the station code on the site is code only: no settings, no parts, no taught taps', () => {
  const out = join(mkdtempSync(join(tmpdir(), 'sc-')), 'station-code')
  const { version, files } = buildStationCode(new URL('../../station', import.meta.url).pathname, out)
  assert.ok(files.includes('station.mjs') && files.includes('lib/nanoleaf.js'))
  for (const f of files) assert.match(f, /^(lib\/)?[\w-]+\.(m?js)$/, f)
  assert.ok(!existsSync(join(out, '.env')) && !existsSync(join(out, 'node_modules')))
  assert.deepEqual(readFileSync(join(out, 'manifest.txt'), 'utf8').trim().split('\n'), [version, ...files])
})
