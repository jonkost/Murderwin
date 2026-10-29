import { test } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { runChecks, lineFor } from '../hardware-check.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const script = join(here, '..', 'hardware-check.mjs')

// Decks as the Stream Deck module lists them, hand-built: the module is
// installed with the station, and Node cannot reach it from scripts/. The
// station's own test checks the same rule on the module's real models.
const buttons = (n, px) => Array.from({ length: n }, (_, index) => ({ type: 'button', index, pixelSize: { width: px, height: px } }))
const MK2 = { path: 'usb-1', model: 'original-mk2', modelInfo: { name: 'Stream Deck MK.2', controls: buttons(15, 72) } }
const PLUS_XL = {
  path: 'usb-2', model: 'plus-xl',
  modelInfo: { name: 'Stream Deck + XL', controls: [...buttons(36, 112), ...Array.from({ length: 6 }, (_, index) => ({ type: 'encoder', index }))] },
}

test('--fake prints three PASS lines and nothing else', () => {
  const out = execFileSync(process.execPath, [script, '--fake'], { encoding: 'utf8' })
  const lines = out.trim().split('\n')
  assert.equal(lines.length, 3)
  assert.deepEqual(lines, ['PASS Nanoleaf walls', 'PASS Hue bridge', 'PASS Stream Deck'])
})

test('each device is PASS or FAIL with a short reason, from fakes for the walls, the bridge and the deck', async () => {
  const ok = async () => ({ ok: true, status: 200, text: async () => '{}' })
  const good = await runChecks({
    stationEnv: { NANOLEAF_ELEMENTS_HOST: '10.0.0.1', NANOLEAF_ELEMENTS_TOKEN: 't', NANOLEAF_LINES_HOST: '10.0.0.2', NANOLEAF_LINES_TOKEN: 't' },
    cuesEnv: { HUE_BRIDGE_HOST: '10.0.0.3', HUE_APP_KEY: 'k' },
    fetchImpl: ok, bridgeFetchImpl: ok, listDecks: async () => [MK2],
  })
  assert.deepEqual(good.map(lineFor), ['PASS Nanoleaf walls', 'PASS Hue bridge', 'PASS Stream Deck'])
  const bad = await runChecks({
    stationEnv: { NANOLEAF_ELEMENTS_HOST: '10.0.0.1', NANOLEAF_ELEMENTS_TOKEN: 't' },
    cuesEnv: {},
    fetchImpl: async () => { throw new Error('timeout') }, bridgeFetchImpl: ok, listDecks: async () => [],
  })
  assert.deepEqual(bad.map(c => c.ok), [false, false, false])
  assert.equal(lineFor(bad[0]), 'FAIL Nanoleaf walls (elements: no answer from 10.0.0.1; lines: no address or token in station/.env)')
  assert.equal(lineFor(bad[1]), 'FAIL Hue bridge (no address or key in cues/.env)')
  assert.equal(lineFor(bad[2]), 'FAIL Stream Deck (none plugged in)')
  const missing = await runChecks({ stationEnv: {}, cuesEnv: { HUE_BRIDGE_HOST: 'h', HUE_APP_KEY: 'k' }, bridgeFetchImpl: async () => ({ ok: false, status: 403 }), listDecks: async () => { throw new Error('no module') } })
  assert.equal(lineFor(missing[1]), 'FAIL Hue bridge (403 from h)')
  assert.equal(lineFor(missing[2]), 'FAIL Stream Deck (module not installed (npm install in station/))')
})

test("the Stream Deck counts only the study's fifteen-key deck: the arcade's + XL on its own fails, by name", async () => {
  const deckLine = async (decks) => lineFor((await runChecks({ stationEnv: {}, cuesEnv: {}, listDecks: async () => decks }))[2])
  assert.equal(await deckLine([PLUS_XL]), "FAIL Stream Deck (only a Stream Deck + XL, not the study's fifteen-key deck)")
  assert.equal(await deckLine([PLUS_XL, MK2]), 'PASS Stream Deck', 'beside the + XL, the study deck still passes')
})
