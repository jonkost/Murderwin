// The review of 12 Nov 2026: the Host tab's own lines for S2 (a stale Next) and S6 (a real Blackout
// pressed while a Blackout test is running).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const src = p => readFileSync(new URL(p, import.meta.url), 'utf8')

test('S2 the Host tab\'s Next sends the act and beat it is showing, and a stale reply says one short line', () => {
  const host = src('../src/screens/Host.jsx')
  assert.ok(host.includes("run('next', { from: `${night.act ?? 0}/${night.beat ?? ''}` })"), 'Next names the beat on the screen')
  assert.ok(host.includes("if (r.stale) return 'The night had already moved on.'"))
})
