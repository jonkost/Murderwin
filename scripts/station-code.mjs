// The study station's code on the site (28 Oct 2026: Jon asked that setting
// up the study be less work). Part of `npm run build:site`: copies the
// station's own code (never station/.env, never node_modules) to
// hosting/station-code/, with a list of the files. `Start the Study` fetches
// it at every start, so a fix reaches the study Mac by closing and reopening
// its window. The code is public anyway (the repo is public) and holds
// nothing sealed or secret.

import { createHash } from 'node:crypto'
import { cpSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

// Only code and the Stream Deck's key faces (keys/*.rgb): a new package
// needs the whole zip again (Start the Study runs npm install only when the
// parts are missing).
export function stationFiles(station) {
  const lib = readdirSync(join(station, 'lib')).filter(f => f.endsWith('.js')).sort().map(f => `lib/${f}`)
  const keys = readdirSync(join(station, 'keys')).filter(f => f.endsWith('.rgb')).sort().map(f => `keys/${f}`)
  return ['station.mjs', 'teach-touch.mjs', ...lib, ...keys]
}

export function buildStationCode(station, out) {
  rmSync(out, { recursive: true, force: true })
  mkdirSync(join(out, 'lib'), { recursive: true })
  mkdirSync(join(out, 'keys'), { recursive: true })
  const files = stationFiles(station)
  const hash = createHash('sha256')
  for (const f of files) {
    cpSync(join(station, f), join(out, f))
    hash.update(f).update(readFileSync(join(station, f)))
  }
  const manifest = { version: hash.digest('hex').slice(0, 12), files }
  writeFileSync(join(out, 'manifest.txt'), [manifest.version, ...files].join('\n') + '\n')
  return manifest
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const root = join(dirname(fileURLToPath(import.meta.url)), '..')
  const { version, files } = buildStationCode(join(root, 'station'), join(root, 'hosting', 'station-code'))
  console.log(`Study station code: ${files.length} files, version ${version}.`)
}
