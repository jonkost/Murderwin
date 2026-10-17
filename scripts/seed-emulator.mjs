// Puts the starting safe content into the LOCAL EMULATOR so a rehearsal
// against it has cat openers, closers, pools, echo frames and stationery.
// Runs only against an emulator: it signs its writes "owner", which only the
// emulator honours, so it cannot reach the party database by accident.
//
//   npm run emulate          (in one terminal, at the repo root)
//   npm run emulate:seed     (in another)
//
// Prints counts only. Everything it writes is safe content from seed/.

import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { targets, setDoc, getDoc } from './rest.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const project = process.env.MURDERWIN_PROJECT_ID || 'demo-murderwin'
const host = process.env.MURDERWIN_EMULATOR_HOST || '127.0.0.1'
const t = targets({ project, emulatorHost: host })
const OWNER = 'owner'

let n = 0
const newId = () => `seed-${Date.now().toString(36)}-${++n}`

// The same shapes app/src/lib/content.js seedDocs() writes on first boot.
export function seedAreaDocs(seed) {
  const docs = {}
  for (const area of ['openers', 'closers']) {
    const items = []
    for (const cat of Object.keys(seed[area] ?? {})) {
      seed[area][cat].forEach((text, i) => items.push({ id: newId(), cat, text, deleted: false, order: i }))
    }
    docs[area] = { items }
  }
  {
    const items = []
    for (const pool of Object.keys(seed.pools ?? {})) {
      seed.pools[pool].forEach((text, i) => items.push({ id: newId(), pool, text, deleted: false, order: i }))
    }
    docs.pools = { items }
  }
  docs.echo_frames = { items: (seed.echo_frames ?? []).map((text, i) => ({ id: newId(), text, deleted: false, order: i })) }
  docs.templates = { items: (seed.templates ?? []).map((tpl, i) => ({ id: tpl.id, text: `${tpl.name} — ${tpl.brief}`, deleted: false, order: i })) }
  docs.scenarios = { items: [] }
  return docs
}

async function main() {
  const probe = await getDoc(t, 'meta/game', OWNER).catch(() => null)
  if (!probe || (probe.status !== 200 && probe.status !== 404)) {
    console.log(`No emulator answering at ${host}:8080. Start it first: npm run emulate`)
    process.exit(2)
  }
  const seed = JSON.parse(readFileSync(join(here, '..', 'seed', 'safe-content.json'), 'utf8'))
  const docs = seedAreaDocs(seed)
  let lines = 0
  for (const [area, data] of Object.entries(docs)) {
    await setDoc(t, `safe_content/${area}`, data, OWNER)
    lines += data.items.length
  }
  await setDoc(t, 'meta/game', { host_jonathan: 'Jon', host_susan: 'Susan', station_key: 'rehearsal' }, OWNER, { merge: true })
  await setDoc(t, 'meta/seeded', { at: new Date(), by: 'seed-emulator' }, OWNER)
  console.log(`Seeded the emulator: ${Object.keys(docs).length} lists, ${lines} lines, hosts Jon and Susan, station key "rehearsal".`)
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch(e => { console.log(`Seed failed: ${e.message}`); process.exit(1) })
}
