// The study station's download (28 Oct 2026: Jon asked for the zip on the
// site). Zips station/ with its parts and its settings into a folder named
// "Study station", and saves it to the project's Cloud Storage at
// downloads/study-station.zip, where storage.rules lets only staff read it.
// The workshop's Study test page offers it as a download. Never on Hosting:
// the zip holds station/.env (the station key and the walls' tokens) and the
// site is public.
//
//   npm --prefix scripts run upload-station
//
// Prints the size only, never a setting.

import { execFileSync } from 'node:child_process'
import { cpSync, mkdtempSync, readFileSync, rmSync, statSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import 'dotenv/config'
import { initializeApp, applicationDefault } from 'firebase-admin/app'
import { getStorage } from 'firebase-admin/storage'
import { say } from './lib.mjs'

export const STATION_ZIP = 'downloads/study-station.zip'
const PROJECT = 'murderwin-at-sirwin-manor'
// Left out: the tests, the example settings, and the taps taught on this Mac
// (taps belong to the Mac that runs the station).
export const LEFT_OUT = new Set(['test', '.env.example', 'touch-map.json'])

export function keep(src, station) {
  const rel = src.slice(station.length + 1)
  return !rel || !LEFT_OUT.has(rel.split('/')[0])
}

async function main() {
  const station = join(dirname(fileURLToPath(import.meta.url)), '..', 'station')
  for (const need of ['.env', 'node_modules/firebase', 'Start the Study.command']) {
    if (!existsSync(join(station, need))) { say(`FAIL: station/${need} is missing`); process.exit(1) }
  }
  const work = mkdtempSync(join(tmpdir(), 'study-station-'))
  try {
    const folder = join(work, 'Study station')
    cpSync(station, folder, { recursive: true, verbatimSymlinks: true, filter: src => keep(src, station) })
    const zip = join(work, 'study-station.zip')
    execFileSync('ditto', ['-c', '-k', '--keepParent', folder, zip])
    const bucket = getStorage(initializeApp({ credential: applicationDefault(), projectId: PROJECT }))
      .bucket(`${PROJECT}.firebasestorage.app`)
    await bucket.file(STATION_ZIP).save(readFileSync(zip), {
      resumable: false,
      metadata: {
        contentType: 'application/zip',
        contentDisposition: 'attachment; filename="Study station.zip"',
        cacheControl: 'no-store',
      },
    })
    say(`PASS: saved the Study station zip, ${Math.round(statSync(zip).size / 1e6)} MB`)
  } finally {
    rmSync(work, { recursive: true, force: true })
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch(e => { say(`FAIL: ${e.code || e.message}`); process.exit(1) })
}
