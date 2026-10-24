// Teaches the study station which hexagon each tap names, from the terminal.
// The Elements report a tap by an id their layout never lists (seen 24 Oct
// 2026: the layout lists only each hexagon's six corner lights), so each
// hexagon is lit in turn and the next tap is remembered as that hexagon's
// (lib/teach.js). Saved to touch-map.json next to this file, which
// station.mjs reads at start. Run it again if a hexagon is moved. The wall
// goes back to its own effect at the end. The workshop's Study test page
// does the same from a phone while the station runs.
//
//   npm run teach-touch        (with the study station stopped)

import { readFileSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Nanoleaf } from './lib/nanoleaf.js'
import { createTeacher, writeTouchMap } from './lib/teach.js'

const here = dirname(fileURLToPath(import.meta.url))
const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a)
const env = Object.fromEntries(
  (existsSync(join(here, '.env')) ? readFileSync(join(here, '.env'), 'utf8') : '').split('\n')
    .map(l => /^\s*([A-Z_]+)\s*=\s*(.*)$/.exec(l)).filter(Boolean)
    .map(m => [m[1], m[2].trim().replace(/^(["'])(.*)\1$/, '$2')]),
)

const wall = new Nanoleaf({ host: env.NANOLEAF_ELEMENTS_HOST, token: env.NANOLEAF_ELEMENTS_TOKEN, name: 'elements' })
const before = await wall.call('/effects/select')
const panels = await wall.loadLayout()
log(`${panels.length} hexagons. Each one lights up in turn: tap it once. Ctrl-C stops.`)

const teacher = createTeacher({ wall, panels, log, onStep: ({ step, of }) => log(`hexagon ${step} of ${of} is lit: tap it`) })
const stop = wall.listenTouch((id, gesture, tapId) => {
  if (gesture === 0 || gesture === 1) teacher.tap(tapId ?? id)
})
const touches = await teacher.run()
stop()

writeTouchMap(join(here, 'touch-map.json'), touches)
await wall.call('/effects', { method: 'PUT', body: { select: before } }).catch(() => {})
log(`taught all ${panels.length} hexagons. Saved touch-map.json; start the station again.`)
process.exit(0)
