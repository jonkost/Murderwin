#!/usr/bin/env node
// npm run screen-files: the files Jon AirDrops from the brain to each room's
// machine (handoff 11 Nov 2026, A11), made from the setup page's own list
// (play/src/lib/setup.js), so the folder never drifts from /setup.
//
//   one .webloc a room screen   opens that room's page in the Mac's usual browser
//   the Entryway's .command     opens Boo's arcade in Google Chrome by name, since
//                               the Stream Deck works only in Chrome; with no Chrome
//                               it opens the usual browser
//
// It writes into ~/Desktop/Murderwin screens (or the folder given), and moves
// any older .webloc or .command there that is not one of today's files into a
// folder inside it, "Not needed any more" (nothing is deleted; the Study
// station's folder and zip are never touched). Prints file names only.
import { mkdirSync, writeFileSync, chmodSync, readdirSync, renameSync } from 'node:fs'
import { join } from 'node:path'
import { homedir } from 'node:os'
import { fileURLToPath } from 'node:url'
import { SETUP_ROOMS, SECOND_DISPLAY, SECOND_DISPLAY_ROOMS, setupHref } from '../play/src/lib/setup.js'

export const LIVE_PLAY = 'https://murderwin-at-sirwin-manor.web.app/play/'
export const OLD_FOLDER = 'Not needed any more'
const NAMES = {
  living: 'Parlour TV', study: 'Study', boo: 'Entryway - Boo’s arcade', orangerie: 'Orangerie', ipad: 'iPad',
  'decor-living': 'Parlour - the Mac’s own screen', 'decor-study': 'Study - the Mac’s own screen', decor: 'Second display',
}

export function webloc(url) {
  const safe = String(url).replace(/&/g, '&amp;').replace(/</g, '&lt;')
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
	<key>URL</key>
	<string>${safe}</string>
</dict>
</plist>
`
}

export function chromeCommand(url) {
  if (!/^https:\/\/[^'"\s]+$/.test(url)) throw new Error('an https address with no quotes or spaces')
  return `#!/bin/sh
# Opens Boo's arcade in Google Chrome: the Stream Deck works only there.
# With no Chrome on this Mac it opens the usual browser instead.
open -a "Google Chrome" '${url}' 2>/dev/null || open '${url}'
`
}

// Every file, in the setup page's order: { name, text, run }.
export function screenFiles(playUrl = LIVE_PLAY) {
  const base = String(playUrl).split('?')[0]
  const rooms = [...SETUP_ROOMS, ...SECOND_DISPLAY_ROOMS, SECOND_DISPLAY]
  return rooms.map((r, i) => {
    const url = `${base}${setupHref('', r)}`
    const name = `${i + 1} ${NAMES[r.key] ?? r.room}`
    if (r.key === 'boo') return { name: `${name}.command`, text: chromeCommand(url), run: true, url }
    return { name: `${name}.webloc`, text: webloc(url), run: false, url }
  })
}

export function writeScreenFiles(folder, files = screenFiles()) {
  mkdirSync(folder, { recursive: true })
  const keep = new Set(files.map(f => f.name))
  const moved = []
  for (const old of readdirSync(folder)) {
    if (!/\.(webloc|command)$/.test(old) || keep.has(old)) continue
    mkdirSync(join(folder, OLD_FOLDER), { recursive: true })
    renameSync(join(folder, old), join(folder, OLD_FOLDER, old))
    moved.push(old)
  }
  for (const f of files) {
    const p = join(folder, f.name)
    writeFileSync(p, f.text)
    if (f.run) chmodSync(p, 0o755)
  }
  return { written: files.map(f => f.name), moved }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const folder = process.argv[2] || join(homedir(), 'Desktop', 'Murderwin screens')
  const { written, moved } = writeScreenFiles(folder)
  console.log(`In ${folder}:`)
  for (const n of written) console.log(`  ${n}`)
  if (moved.length) console.log(`Moved to "${OLD_FOLDER}": ${moved.join(', ')}`)
}
