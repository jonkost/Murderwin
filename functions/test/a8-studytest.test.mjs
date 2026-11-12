// A8 (12 Nov 2026): Check the map on the Study test page. The commands are
// the workshop's only; the report's map part is numbers, whitelisted.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { FakeFirestore } from './fake-firestore.mjs'
import { setStationKey } from '../lib/station.js'
import { studyTestRequest, cleanStatus, QUEUE_DOC, COMMANDS, MODES } from '../lib/studytest.js'

const KEY = 'study-2026'
async function house() { const db = new FakeFirestore(); await setStationKey(db, KEY); return db }

test('match, yes, no and hex are the workshop\'s, and hex names one of the ten hexagons', async () => {
  const db = await house()
  for (const c of ['match', 'yes', 'no', 'hex']) assert.ok(COMMANDS.includes(c))
  assert.ok(MODES.includes('match'))
  await assert.rejects(studyTestRequest(db, { command: 'match', key: KEY }), e => e.code === 'permission-denied')
  await studyTestRequest(db, { command: 'match', isAdmin: true })
  await studyTestRequest(db, { command: 'no', isAdmin: true })
  await studyTestRequest(db, { command: 'hex', name: '7', isAdmin: true })
  for (const bad of ['10', '-1', 'x', '', null, '1.5']) {
    await assert.rejects(studyTestRequest(db, { command: 'hex', name: bad, isAdmin: true }), e => e.code === 'invalid', String(bad))
  }
  const q = db.store.get(QUEUE_DOC).queue
  assert.deepEqual(q.map(e => [e.command, e.name]), [['match', null], ['no', null], ['hex', '7']])
})

test('the report\'s map part keeps numbers only', () => {
  const s = cleanStatus({ mode: 'match', match: { kind: 'remap', step: 4, of: 10, hex: 3, done: 'yes', ok: true, picks: [1, 2], extra: 'x' } })
  assert.equal(s.mode, 'match')
  assert.deepEqual(s.match, { kind: 'remap', step: 4, of: 10, hex: 3, done: false, ok: true })
  assert.equal(cleanStatus({ match: { kind: 'odd', hex: 12 } }).match.hex, null)
  assert.equal(cleanStatus({ match: { kind: 'odd' } }).match.kind, 'check')
  assert.equal(cleanStatus({ match: [1] }).match, null)
})
