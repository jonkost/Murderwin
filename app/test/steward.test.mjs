import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  SECTIONS, fieldsOf, setField, shapeWords, routeState, packingRows, syntheticSet, JON_UID, NOT_FOR_YOU, SAVE_FAILED,
} from '../src/lib/steward.js'

// Jenna's page, tested through its pure helpers (the page itself is JSX and
// renders in the browser; a preview check covers it). Every "secret" here
// is the synthetic preview set: bracketed, tied to nothing, in memory only.

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
  assert.ok(SAVE_FAILED.startsWith('SAVE FAILED'))
})

test('a synthetic set flattens to every editable box in reading order, and an edit lands in a new copy', () => {
  const set = syntheticSet('PREV1')
  const fields = fieldsOf(set)
  // 4 cats x 3 lines + salem 3 x 2 + documents 3 x 3 + fragments 3 + study 3 + irwin 3
  assert.equal(fields.length, 12 + 6 + 9 + 3 + 3 + 3)
  assert.deepEqual([...new Set(fields.map(f => f.section))], SECTIONS.map(s => s.key), 'sections come in the order Jenna reads them')
  assert.equal(fields[0].path, 'kernels.irwin.0')
  assert.ok(fields.some(f => f.path === 'kernels.salem.2.anchor' && f.value === 'lantern'))
  assert.ok(fields.some(f => f.path === 'documents.1.emphasis' && f.value === 'LANTERN'))
  assert.ok(fields.every(f => typeof f.value === 'string' && f.rows >= 1 && f.label))
  const next = setField(set, 'kernels.boo.1', '(Preview edited)')
  assert.equal(next.kernels.boo[1], '(Preview edited)')
  assert.equal(set.kernels.boo[1], fields.find(f => f.path === 'kernels.boo.1').value, 'the old copy is untouched')
  assert.equal(setField(set, 'kernels.salem.0.text', 'x').kernels.salem[0].text, 'x')
  assert.equal(setField(set, 'kernels.salem.0.text', 'x').kernels.salem[0].anchor, 'lantern')
  assert.equal(setField(set, 'nope.0', 'x'), set, 'an unknown path changes nothing')
  assert.equal(setField(set, 'kernels.boo.9', 'x'), set, 'an index past the end changes nothing')
  for (const s of SECTIONS) assert.ok(!s.label.includes('—') && !s.hint.includes('—'), 'no em dash on screen')
})

test('shape failures read as plain words, and the preview set is obviously synthetic', () => {
  const words = shapeWords(['kernels:boo:token', 'kernels:salem:empty', 'kernels:zimothy', 'documents:field', 'documents', 'fragments', 'studyClue', 'irwin', 'granolia', 'other'])
  assert.equal(words.length, 10)
  assert.ok(words[0].startsWith('Miss Boo LaRue: a blank'))
  assert.ok(words[1].startsWith('Salem Crookshank: a line is empty'))
  assert.ok(words[2].startsWith('Zimothy Clawford, Esq.: the lines are missing'))
  assert.ok(words[8].startsWith("Granolia's blanks"))
  for (const w of words) assert.ok(!w.includes('—'))
  assert.deepEqual(shapeWords(), [])
  const set = syntheticSet('ZZZ')
  const all = JSON.stringify(set)
  assert.ok(all.includes('Preview ZZZ') && !/[A-Z]{5}[^"]*(poison|debt|will)/.test(all), 'bracketed preview text only')
  assert.equal(set.kernels.salem.length, 3)
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
