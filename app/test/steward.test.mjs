import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { routeState, packingRows, JON_UID, NOT_FOR_YOU } from '../src/lib/steward.js'

// Jenna's page, tested through its pure helpers (the page itself is JSX and
// renders in the browser; a preview check covers it). The bags here are
// made up in the test, tied to nothing, in memory only.

const here = dirname(fileURLToPath(import.meta.url))
const src = p => readFileSync(join(here, '..', 'src', p), 'utf8')

test('the route: Jon\'s UID is turned away before any call; everyone else waits on whoami and opens only on ok', () => {
  assert.equal(routeState({ uid: JON_UID, whoami: undefined }), 'not-for-you')
  assert.equal(routeState({ uid: JON_UID, whoami: true }), 'not-for-you', 'even a stray ok does not open it for Jon')
  assert.equal(routeState({ uid: null }), 'not-for-you')
  assert.equal(routeState({}), 'not-for-you')
  assert.equal(routeState({ uid: 'someone', whoami: undefined }), 'checking')
  assert.equal(routeState({ uid: 'someone', whoami: false }), 'not-for-you')
  assert.equal(routeState({ uid: 'someone', whoami: true }), 'open')
  assert.equal(NOT_FOR_YOU, 'Not for you.')
})

test('the packing list: one row per bag, the item name before the dash, taste doubles marked', () => {
  const rows = packingRows({ bags: [
    { n: 2, items: [{ id: 'c', text: 'Glass marble — touch: cold', twice: false }] },
    { n: 1, items: [{ id: 'a', text: 'Tin of mints — smell: minty', twice: false }, { id: 'b', text: 'Lemon drop — taste: sour', twice: true }] },
  ] })
  assert.deepEqual(rows.map(r => r.n), [2, 1], 'the server already sorts; the page keeps its order')
  assert.deepEqual(rows[1].items.map(i => [i.name, i.twice]), [['Tin of mints', false], ['Lemon drop', true]])
  assert.deepEqual(packingRows(null), [])
  assert.deepEqual(packingRows({ packed: false }), [])
})

test('the page and its API never touch browser storage or the Firestore client, and the route is absent from the rail', () => {
  const page = src('pages/Steward.jsx')
  const api = src('lib/stewardApi.js')
  for (const s of [page, api, src('lib/steward.js')]) {
    assert.ok(!/\b(localStorage|sessionStorage|indexedDB|persistentLocalCache)\s*[.([]/.test(s), 'no browser storage (a comment may name it; code may not use it)')
    assert.ok(!/from 'firebase\/firestore'|from '\.\.\/lib\/store'|from '\.\/store'/.test(s), 'no Firestore client; the callable is the only road')
    // the workshop's bag lines are "Item — sense: property"; that separator is data, not prose
    const prose = s.replace(/'—'|\) — (smell|taste|touch|sight|sound):/g, '')
    assert.ok(!prose.includes('—'), 'no em dash in prose')
  }
  assert.ok(api.includes("httpsCallable(functions, 'steward')"))
  const app = src('App.jsx')
  assert.ok(app.includes('path="/steward"'), 'the route exists')
  assert.ok(!/NavLink to="\/steward"/.test(app), 'the rail has no link to it')
  assert.ok(src('pages/ForJenna.jsx').includes('to="/steward"'), 'Jenna reaches it from her brief')
})

test('two tabs only: the packing list and the cats\' leans; the old secret sets are gone from the page and the pretend API', () => {
  const page = src('pages/Steward.jsx')
  const api = src('lib/stewardApi.js')
  assert.ok(page.includes('The packing list') && page.includes("The cats' leans"))
  assert.ok(!/setTab\('sets'\)|SetEditor|The secrets|nineteen sets/i.test(page), 'no secrets tab')
  for (const op of ['list', 'read', 'write', 'mark']) {
    assert.ok(!page.includes(`op: '${op}'`), `the page never calls ${op}`)
    assert.ok(!api.includes(`case '${op}'`), `the pretend API has no ${op}`)
  }
  for (const op of ['whoami', 'bags', 'leans', 'lean']) assert.ok(api.includes(`case '${op}'`), `the pretend API answers ${op}`)
  assert.ok(!/kernel|document|fragment|studyClue/i.test(page + api + src('lib/steward.js')), 'nothing about the retired secret sets')
})
