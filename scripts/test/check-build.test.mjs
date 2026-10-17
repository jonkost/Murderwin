import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { spawnSync } from 'node:child_process'
import { checkBuild, REQUIRED } from '../check-build.mjs'

function site(parts) {
  const root = mkdtempSync(join(tmpdir(), 'murderwin-hosting-'))
  for (const p of parts) { mkdirSync(join(root, p, '..'), { recursive: true }); writeFileSync(join(root, p), '<!doctype html>') }
  return root
}

test('check-build passes a complete site and names the folder of a missing page', () => {
  const full = site(REQUIRED.map(r => r.path))
  assert.equal(checkBuild(full).ok, true)
  rmSync(full, { recursive: true, force: true })

  const noWorkshop = site(['index.html', 'play/index.html'])
  mkdirSync(join(noWorkshop, 'workshop'), { recursive: true }) // the folder exists, empty
  const r = checkBuild(noWorkshop)
  assert.equal(r.ok, false)
  assert.equal(r.missing.length, 1)
  assert.equal(r.missing[0].what, 'the workshop')
  assert.ok(r.missing[0].folder.endsWith('/workshop'))

  // run as a command: exit 1 with a plain message, before any deploy could start
  const run = spawnSync(process.execPath, [new URL('../check-build.mjs', import.meta.url).pathname, '--root', noWorkshop], { encoding: 'utf8' })
  assert.equal(run.status, 1)
  assert.match(run.stdout, /Not deploying/)
  assert.match(run.stdout, /the workshop is missing from .*workshop/)
  rmSync(noWorkshop, { recursive: true, force: true })

  const empty = site(['index.html', 'play/index.html', 'workshop/index.html'])
  writeFileSync(join(empty, 'play', 'index.html'), '')
  assert.equal(checkBuild(empty).missing[0].what, 'the phone client', 'an empty file counts as missing')
  rmSync(empty, { recursive: true, force: true })
})
