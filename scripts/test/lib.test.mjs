import { test } from 'node:test'
import assert from 'node:assert/strict'
import { say, memoryDb, redactedError, printFatal, LINE_MAX } from '../lib.mjs'

// The shared helpers of the blind scripts: the printer keeps every line
// short, an error never carries its message, and the stand-in store is
// only memory.

function capture(fn, stream = 'log') {
  const lines = []
  const real = console[stream]
  console[stream] = (...a) => lines.push(a.map(String).join(' '))
  try { fn() } finally { console[stream] = real }
  return lines
}

test('say wraps every line to eighty characters and loses no word', () => {
  const text = 'x'.repeat(50) + ' ' + 'y'.repeat(50) + '\nshort'
  const lines = capture(() => say(text))
  assert.ok(lines.every(l => l.length <= LINE_MAX), 'no line longer than 80')
  assert.deepEqual(lines, ['x'.repeat(50), '  ' + 'y'.repeat(50), 'short'])
  const long = capture(() => say('z'.repeat(200)))
  assert.ok(long.every(l => l.length <= LINE_MAX))
  assert.equal(long.join('').replace(/ /g, '').length, 200, 'a word longer than a line is cut, never dropped')
})

test('a redacted error carries the status and the message length, never the message', () => {
  const e = redactedError('the model call', Object.assign(new Error('(Synthetic secret words)'), { status: 529 }))
  assert.equal(e.sealSafe, true)
  assert.match(e.message, /^the model call failed \(529 Error; message length 24\)$/)
  assert.ok(!e.message.includes('Synthetic'))
  const safe = capture(() => printFatal(e), 'error')
  assert.deepEqual(safe, [e.message])
  const raw = capture(() => printFatal(Object.assign(new Error('(Synthetic secret words)'), { code: 'E1' })), 'error')
  assert.equal(raw.length, 1)
  assert.ok(!raw[0].includes('Synthetic'), 'an unmarked error prints as its type and code only')
  assert.match(raw[0], /^fatal: Error E1 \(message redacted, length 24\)$/)
})

test('memoryDb reads and writes docs in memory, by path or by collection, and merges on request', async () => {
  const db = memoryDb({ 'sealed/bags': { a: 1 } })
  assert.equal((await db.doc('sealed/none').get()).exists, false)
  const snap = await db.collection('sealed').doc('bags').get()
  assert.equal(snap.exists, true)
  assert.deepEqual(snap.data(), { a: 1 })
  await db.doc('sealed/bags').set({ b: 2 }, { merge: true })
  assert.deepEqual(db.store.get('sealed/bags'), { a: 1, b: 2 })
  await db.doc('sealed/bags').set({ c: 3 })
  assert.deepEqual(db.store.get('sealed/bags'), { c: 3 })
  const copy = (await db.doc('sealed/bags').get()).data()
  copy.c = 4
  assert.equal(db.store.get('sealed/bags').c, 3, 'a read is a copy')
})
