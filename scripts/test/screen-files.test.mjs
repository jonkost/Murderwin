import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, writeFileSync, readdirSync, readFileSync, statSync, mkdirSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { screenFiles, writeScreenFiles, chromeCommand, webloc, OLD_FOLDER, LIVE_PLAY } from '../screen-files.mjs'
import { SETUP_ROOMS, SECOND_DISPLAY_ROOMS } from '../../play/src/lib/setup.js'

// The files Jon AirDrops from the brain (handoff 11 Nov 2026, A11): made from
// the setup page's list, the Entryway's opens Chrome by name. Never the real
// Desktop: a folder of its own under the system's temporary folder.

test('one file a room screen, in the setup page’s order; the Entryway’s opens Google Chrome by name', () => {
  const files = screenFiles(LIVE_PLAY)
  assert.equal(files.length, SETUP_ROOMS.length + SECOND_DISPLAY_ROOMS.length + 1)
  assert.deepEqual(files.map(f => f.name.split(' ')[0]), files.map((_, i) => String(i + 1)))
  const boo = files.find(f => f.url.endsWith('?kiosk=boo'))
  assert.match(boo.name, /^3 Entryway .*\.command$/)
  assert.equal(boo.run, true)
  assert.ok(boo.text.startsWith('#!/bin/sh\n'))
  assert.ok(boo.text.includes(`open -a "Google Chrome" '${LIVE_PLAY}?kiosk=boo' 2>/dev/null || open '${LIVE_PLAY}?kiosk=boo'`))
  const ipad = files.find(f => f.url.endsWith('?kiosk=ipad'))
  assert.match(ipad.name, /iPad\.webloc$/)
  assert.ok(ipad.text.includes(`<string>${LIVE_PLAY}?kiosk=ipad</string>`))
  assert.ok(files.some(f => f.text.includes('?kiosk=decor&amp;room=living')), 'the & is written as the plist wants it')
  assert.ok(!files.some(f => /kiosk=(memory|bedroom|pose)/.test(f.url)), 'one iPad file, no camera')
  assert.throws(() => chromeCommand("https://x.test/'; rm -rf ~"), /no quotes/)
  assert.ok(webloc('https://a.test/?x=1&y=2').includes('?x=1&amp;y=2'))
})

test('writing: the .command can run, older files move to a folder inside, nothing is deleted, the Study station is untouched', () => {
  const dir = mkdtempSync(join(tmpdir(), 'screen-files-'))
  try {
    writeFileSync(join(dir, '6 iPad - Library, In Duplicate.webloc'), 'old')
    writeFileSync(join(dir, 'Study station.zip'), 'zip')
    mkdirSync(join(dir, 'Study station'))
    const { written, moved } = writeScreenFiles(dir)
    assert.deepEqual(moved, ['6 iPad - Library, In Duplicate.webloc'])
    assert.deepEqual(readdirSync(join(dir, OLD_FOLDER)), ['6 iPad - Library, In Duplicate.webloc'])
    for (const n of written) assert.ok(readdirSync(dir).includes(n), n)
    assert.ok(readdirSync(dir).includes('Study station.zip') && readdirSync(dir).includes('Study station'))
    const cmd = written.find(n => n.endsWith('.command'))
    assert.ok(statSync(join(dir, cmd)).mode & 0o100, 'the .command is executable')
    assert.ok(readFileSync(join(dir, cmd), 'utf8').includes('Google Chrome'))
    // a second run changes nothing it has already written
    assert.deepEqual(writeScreenFiles(dir).moved, [])
  } finally { rmSync(dir, { recursive: true, force: true }) }
})
