import { test } from 'node:test'
import assert from 'node:assert/strict'
import { encodeFields, decodeFields, targets, call } from '../rest.mjs'

test('Firestore typed values round-trip: strings, numbers, booleans, null, dates, arrays and maps', () => {
  const at = new Date('2026-11-15T21:00:00.000Z')
  const doc = { s: 'x', i: 3, d: 2.5, b: true, n: null, at, list: [1, 'two', { three: 3 }], map: { a: { b: [false] } } }
  const back = decodeFields(encodeFields(doc))
  assert.deepEqual(back, doc)
  assert.deepEqual(encodeFields({ i: 3 }), { i: { integerValue: '3' } })
  assert.deepEqual(encodeFields({ skip: undefined, keep: 1 }), { keep: { integerValue: '1' } })
})

test('targets: the emulator by default, the live project only when asked', () => {
  const emu = targets({ project: 'demo-murderwin' })
  assert.equal(emu.live, false)
  assert.ok(emu.firestore.startsWith('http://127.0.0.1:8080/'))
  assert.ok(emu.functions.endsWith('/demo-murderwin/us-central1'))
  const lan = targets({ project: 'demo-murderwin', emulatorHost: '192.168.1.20' })
  assert.ok(lan.auth.startsWith('http://192.168.1.20:9099/'))
  const live = targets({ project: 'murderwin-at-sirwin-manor', live: true, apiKey: 'k' })
  assert.equal(live.live, true)
  assert.ok(live.functions.startsWith('https://us-central1-murderwin-at-sirwin-manor.cloudfunctions.net'))
  assert.ok(live.firestore.startsWith('https://firestore.googleapis.com/'))
})

test('a callable that cannot be reached comes back as a refusal, never a throw', async () => {
  const t = targets({ project: 'demo-murderwin', emulatorHost: '127.0.0.1' })
  t.functions = 'http://127.0.0.1:1/x/y'
  const r = await call(t, 'join', { nightId: 'n' }, 'token').catch(e => ({ ok: false, code: 'threw', message: e.message }))
  assert.equal(r.ok, false)
})
