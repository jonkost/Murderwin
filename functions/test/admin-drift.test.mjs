import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

// Three lists say who the staff are: ADMIN_UIDS in functions/index.js,
// isAdmin() in firestore.rules and isStaff() in storage.rules. They are kept
// in step by hand, so this test fails the moment one of them changes alone.
// Jenna (the Steward) is in the two rules files by email hash and, by
// design, NOT in the functions UID list: the Steward's server-side identity
// is the same hash in functions/lib/steward.js, checked by the last test.

const here = dirname(fileURLToPath(import.meta.url))
const root = join(here, '..', '..')
const read = (p) => readFileSync(join(root, p), 'utf8')

const UID = /'([A-Za-z0-9]{20,40})'/g   // a Firebase UID (28 characters); never a 64-character hash
const HASH = /'([a-f0-9]{64})'/g
const all = (re, text) => [...text.matchAll(re)].map(m => m[1])

function block(text, fnName) {
  const start = text.indexOf(`function ${fnName}()`)
  assert.ok(start >= 0, `${fnName}() is in the file`)
  const end = text.indexOf('\n    }', start) > 0 ? text.indexOf('\n    }', start) : text.length
  return text.slice(start, end)
}

test('the admin UID list in functions/index.js equals isAdmin() in firestore.rules', () => {
  const index = read('functions/index.js')
  const m = /const ADMIN_UIDS = \[([^\]]*)\]/.exec(index)
  assert.ok(m, 'ADMIN_UIDS is declared in functions/index.js')
  const functionsUids = all(UID, m[1]).sort()
  const rulesUids = all(UID, block(read('firestore.rules'), 'isAdmin')).sort()
  assert.ok(functionsUids.length >= 1, 'at least one admin')
  assert.deepEqual(functionsUids, rulesUids, 'functions ADMIN_UIDS and firestore.rules isAdmin() list the same UIDs')
})

test('storage.rules isStaff() lists the same UIDs and the same email hashes as firestore.rules isAdmin()', () => {
  const fs = block(read('firestore.rules'), 'isAdmin')
  const st = block(read('storage.rules'), 'isStaff')
  assert.deepEqual(all(UID, fs).sort(), all(UID, st).sort(), 'UIDs agree')
  assert.deepEqual(all(HASH, fs).sort(), all(HASH, st).sort(), 'email hashes agree')
})

test('Jenna is in the rules by email hash, not in the functions UID list, and functions/lib/steward.js carries the same hash', () => {
  const fs = block(read('firestore.rules'), 'isAdmin')
  const hashes = all(HASH, fs)
  assert.equal(hashes.length, 1, 'exactly one Steward hash in the rules')
  const index = read('functions/index.js')
  assert.ok(!index.includes(hashes[0]), 'the functions UID list has no email hash; the Steward is identified by lib/steward.js')
  const steward = read('functions/lib/steward.js')
  assert.deepEqual(all(HASH, steward), hashes, 'RULES_STEWARD_HASH in functions/lib/steward.js equals the hash in firestore.rules')
})
