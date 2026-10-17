// Refuses to deploy an empty site. `npm run build:site` fills hosting/ from
// both Vite builds; if either produced nothing, firebase would happily publish
// a blank page over the live one. This runs between the build and the deploy
// and stops with a plain message naming the folder.
//
//   node scripts/check-build.mjs            exits 0 when every page is there
//   node scripts/check-build.mjs --root X   check another hosting folder

import { existsSync, statSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const args = process.argv.slice(2)
const rootArg = args.includes('--root') ? args[args.indexOf('--root') + 1] : null
const hosting = resolve(rootArg ?? join(here, '..', 'hosting'))

// Every page the site must have, and what Jon calls it.
export const REQUIRED = [
  { path: 'index.html', what: 'the invitation page' },
  { path: 'workshop/index.html', what: 'the workshop' },
  { path: 'play/index.html', what: 'the phone client' },
]

export function checkBuild(root) {
  const missing = []
  for (const r of REQUIRED) {
    const p = join(root, r.path)
    const ok = existsSync(p) && statSync(p).isFile() && statSync(p).size > 0
    if (!ok) missing.push({ ...r, folder: join(root, dirname(r.path)) })
  }
  return { ok: missing.length === 0, missing }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { ok, missing } = checkBuild(hosting)
  if (ok) {
    console.log(`Build check: ${REQUIRED.length} pages present in ${hosting}.`)
    process.exit(0)
  }
  console.log('Not deploying: the built site is incomplete.')
  for (const m of missing) console.log(`  ${m.what} is missing from ${m.folder} (no ${m.path.split('/').pop()}).`)
  console.log('Run `npm run build:site` and look for an error above it, then try again.')
  process.exit(1)
}
