// Teaches the study station which hexagon each tap names. The Elements report
// a tap by an id their layout never lists (seen 24 Oct 2026: the layout lists
// only each hexagon's six corner lights), so each hexagon is lit in turn and
// the next tap is remembered as that hexagon's. Saved to touch-map.json next
// to this file, which station.mjs reads at start. Run it again if a hexagon
// is moved. The wall goes back to its own effect at the end.
//
//   npm run teach-touch        (with the study station stopped)

import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Nanoleaf } from './lib/nanoleaf.js'

const here = dirname(fileURLToPath(import.meta.url))
const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a)
const env = Object.fromEntries(
  (existsSync(join(here, '.env')) ? readFileSync(join(here, '.env'), 'utf8') : '').split('\n')
    .map(l => /^\s*([A-Z_]+)\s*=\s*(.*)$/.exec(l)).filter(Boolean)
    .map(m => [m[1], m[2].trim().replace(/^(["'])(.*)\1$/, '$2')]),
)
const LIT = [255, 255, 255], DIM = [25, 25, 25]

const wall = new Nanoleaf({ host: env.NANOLEAF_ELEMENTS_HOST, token: env.NANOLEAF_ELEMENTS_TOKEN, name: 'elements' })
const before = await wall.call('/effects/select')
const panels = await wall.loadLayout()
log(`${panels.length} hexagons. Each one lights up in turn: tap it once. Ctrl-C stops.`)

let waiting = null
const stop = wall.listenTouch((id, gesture) => {
  if (gesture === 0 || gesture === 1) waiting?.(id)
})
// it waits as long as it takes: the lit hexagon stays lit until it is tapped
const nextTap = () => new Promise(resolve => { waiting = (id) => { waiting = null; resolve(id) } })

const touches = {}
for (const [i, p] of panels.entries()) {
  const frame = Object.fromEntries(panels.map(q => [q.id, q.id === p.id ? LIT : DIM]))
  await wall.frame(frame, 2)
  log(`hexagon ${i + 1} of ${panels.length} is lit: tap it`)
  let id = await nextTap()
  // a tap the wall already names for another hexagon is a slip: wait for the right one
  while (touches[id] != null && touches[id] !== p.id) { log('that one is already taught; tap the lit hexagon'); id = await nextTap() }
  touches[id] = p.id
  await wall.frame(Object.fromEntries(panels.map(q => [q.id, DIM])), 1)
  await new Promise(r => setTimeout(r, 300))
}
stop()

writeFileSync(join(here, 'touch-map.json'), JSON.stringify({
  note: 'Which hexagon each tap names, taught on the real Elements wall by teach-touch.mjs. Tap id → panel id (the smallest id among the hexagon\'s corners).',
  taughtAt: new Date().toISOString(),
  touches,
}, null, 2) + '\n')
await wall.call('/effects', { method: 'PUT', body: { select: before } }).catch(() => {})
log(`taught all ${panels.length} hexagons. Saved touch-map.json; start the station again.`)
process.exit(0)
