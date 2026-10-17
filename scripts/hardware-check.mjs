// The hardware smoke check. Run it one evening before the freeze with the
// Nanoleaf walls, the Hue bridge and the Stream Deck plugged in:
//
//   node scripts/hardware-check.mjs          the real devices
//   node scripts/hardware-check.mjs --fake   no hardware: three PASS lines
//
// It prints one line per device, PASS or FAIL, and nothing else. The
// addresses and keys come from station/.env (the two walls) and cues/.env
// (the bridge), the same files the station and the cue relay read. Nothing
// here touches Firestore or any content.

import { readFileSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
import { parseEnv } from '../cues/lib/cues.js'
import { bridgeFetch } from '../cues/lib/hue.js'

const here = dirname(fileURLToPath(import.meta.url))
const root = join(here, '..')

function envFrom(path) {
  return existsSync(path) ? parseEnv(readFileSync(path, 'utf8')) : {}
}

// One Nanoleaf controller answers GET /api/v1/<token>/ with its info.
async function nanoleaf(name, host, token, fetchImpl) {
  if (!host || !token) return `${name}: no address or token in station/.env`
  try {
    const res = await fetchImpl(`http://${host}:16021/api/v1/${token}/`, { signal: AbortSignal.timeout(4000) })
    if (!res.ok) return `${name}: ${res.status} from ${host}`
    return null
  } catch (e) {
    return `${name}: no answer from ${host}`
  }
}

// The bridge answers the lights list with the application key.
async function hue(host, key, fetchImpl) {
  if (!host || !key) return 'no address or key in cues/.env'
  try {
    const res = await fetchImpl(`https://${host}/clip/v2/resource/light`, { headers: { 'hue-application-key': key }, timeoutMs: 4000 })
    if (!res.ok) return `${res.status} from ${host}`
    return null
  } catch (e) {
    return `no answer from ${host}`
  }
}

// The deck is on USB. The module lives with the station.
async function streamDeck(listDecks) {
  try {
    const devices = await listDecks()
    return devices.length ? null : 'none plugged in'
  } catch (e) {
    return 'module not installed (npm install in station/)'
  }
}

async function defaultListDecks() {
  const require = createRequire(join(root, 'station', 'package.json'))
  const mod = await import(require.resolve('@elgato-stream-deck/node'))
  return mod.listStreamDecks()
}

// Every check, as { name, ok, why }. Fakes are handed in by the tests.
export async function runChecks({
  fake = false,
  stationEnv = envFrom(join(root, 'station', '.env')),
  cuesEnv = envFrom(join(root, 'cues', '.env')),
  fetchImpl = globalThis.fetch,
  bridgeFetchImpl = bridgeFetch,
  listDecks = defaultListDecks,
} = {}) {
  const names = ['Nanoleaf walls', 'Hue bridge', 'Stream Deck']
  if (fake) return names.map(name => ({ name, ok: true, why: null }))
  const walls = (await Promise.all([
    nanoleaf('elements', stationEnv.NANOLEAF_ELEMENTS_HOST, stationEnv.NANOLEAF_ELEMENTS_TOKEN, fetchImpl),
    nanoleaf('lines', stationEnv.NANOLEAF_LINES_HOST, stationEnv.NANOLEAF_LINES_TOKEN, fetchImpl),
  ])).filter(Boolean)
  const bridge = await hue(cuesEnv.HUE_BRIDGE_HOST, cuesEnv.HUE_APP_KEY, bridgeFetchImpl)
  const deck = await streamDeck(listDecks)
  return [
    { name: names[0], ok: walls.length === 0, why: walls.join('; ') || null },
    { name: names[1], ok: !bridge, why: bridge },
    { name: names[2], ok: !deck, why: deck },
  ]
}

export function lineFor(c) {
  return `${c.ok ? 'PASS' : 'FAIL'} ${c.name}${c.ok || !c.why ? '' : ` (${c.why})`}`
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]
if (isMain) {
  const results = await runChecks({ fake: process.argv.includes('--fake') })
  for (const c of results) console.log(lineFor(c))
  process.exit(results.every(c => c.ok) ? 0 : 1)
}
