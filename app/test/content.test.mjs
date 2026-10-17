import { test } from 'node:test'
import assert from 'node:assert/strict'
import { AREAS, ADDITIONS, UI_LABELS, NOTICE_KEYS, STUDY_LABELS, STATION_LABELS, TRACE_LABELS, BAG_ITEM_SEED, fieldsFor, codecFor, lintItem, goalOf } from '../src/lib/content.js'
import { ALL_CARDS, cardFor } from '../src/lib/cards.js'
import { planAddition, applyPlan, freshLines } from '../src/lib/additions.js'

// Safe content only: the lists, their cards, their codecs and the additive
// migrations, on an in-memory copy of the database.

test('every list has a card, and its example round-trips through its codec', () => {
  for (const [area, spec] of Object.entries(AREAS)) {
    const card = cardFor(area, null)
    assert.ok(card, `${area} has a card`)
    assert.ok(ALL_CARDS[area].what && ALL_CARDS[area].where && ALL_CARDS[area].howTo, `${area}: what, where, how`)
    if (spec.checklist || spec.editor) continue
    const fields = fieldsFor(area)
    const codec = codecFor(area)
    const vals = {}
    card.example.forEach((e, i) => { if (fields[i]) vals[fields[i].key] = e.text })
    if (!Object.keys(vals).length) continue
    const line = codec.join(vals)
    assert.equal(codec.join(codec.split(line)), line, `${area}: the example round-trips`)
    if (!spec.retired) assert.equal(lintItem(area, line), null, `${area}: the example passes its own lint`)
  }
})

test('no em dash reaches the screen from a card or a list label', () => {
  for (const [area, spec] of Object.entries(AREAS)) {
    for (const k of ['label', 'moment', 'why']) assert.ok(!String(spec[k] ?? '').includes('—'), `${area}.${k}`)
    const card = ALL_CARDS[area]
    for (const k of ['what', 'where', 'howTo', 'emptyState', 'doneLine']) assert.ok(!String(card[k] ?? '').includes('—'), `${area} card ${k}`)
  }
})

test('the phone\'s own lines list offers every label the phone and the dealer read', () => {
  const values = UI_LABELS.map(o => o.value)
  for (const want of ['NUMBERS', 'NOTICE SCRAP', 'STOPS', 'FILLER', 'RELAY RULES', 'ORIENT', 'NOT FOR YOU', 'PAUSED BY HOST', 'YOUR ROLE']) assert.ok(values.includes(want), want)
  for (const k of NOTICE_KEYS) assert.ok(values.includes(`NOTICE ${k.toUpperCase()}`), k)
  assert.equal(new Set(values).size, values.length, 'no label twice')
  assert.equal(goalOf(AREAS.ui_copy), values.length)
  assert.equal(STUDY_LABELS.length, 12)
  assert.equal(STATION_LABELS.map(o => o.value).join(','), 'STUDY,CAT,BAGS,PUZZLE,CHECKIN')
  assert.equal(TRACE_LABELS.length, 14)
  assert.ok(TRACE_LABELS.every(o => /^TRACE [A-Z ]+$/.test(o.value)), 'trace labels have no hyphen, so the label codec keeps them')
  assert.ok(TRACE_LABELS.some(o => o.value === 'TRACE BOOT PRINT'))
  // the lint keeps the safe's slots and the five stops
  assert.equal(lintItem('ui_copy', 'NUMBERS: the numbers were [A], [B] and [C].'), null)
  assert.ok(lintItem('ui_copy', 'NUMBERS: the numbers were lost.'))
  assert.equal(lintItem('ui_copy', 'STOPS: Cold shoulder, Wary, Undecided, Fond, Devoted'), null)
  assert.ok(lintItem('ui_copy', 'STOPS: Cold, Warm'))
  assert.ok(lintItem('trace_lines', 'TRACE INK: Rye left it'), 'never a name')
  assert.equal(lintItem('trace_lines', 'TRACE INK: a splash of ink beside the desk'), null)
})

test('the bag items seed: 108 lines, every one passes the list\'s rules, two-property lines get a note not a stop', () => {
  assert.equal(BAG_ITEM_SEED.length, 108)
  assert.equal(new Set(BAG_ITEM_SEED.map(l => l.toLowerCase())).size, 108)
  let twice = 0
  for (const line of BAG_ITEM_SEED) {
    const warn = lintItem('bag_items', line)
    if (line.includes(';')) { twice++; assert.ok(warn && warn.startsWith('Two things'), line) } else assert.equal(warn, null, line)
    const codec = codecFor('bag_items')
    assert.equal(codec.join(codec.split(line)), line, 'round trip')
  }
  assert.equal(twice, 4)
  assert.equal(goalOf(AREAS.bag_items), 108)
})

// A pretend database: nothing seeded, then every addition applied, twice.
function emptyState() { return { applied: [], areas: {}, decisions: {}, tasks: [] } }
function applyAll(state, { newId }) {
  let next = state
  for (const add of ADDITIONS) next = applyPlan(planAddition(add, next, { newId, now: 1000 }), next)
  return next
}

test('the additive migrations are idempotent on a pretend database, and the bag items land once', () => {
  let n = 0
  const newId = () => `id${++n}`
  const once = applyAll(emptyState(), { newId })
  assert.deepEqual(once.applied, ADDITIONS.map(a => a.id))
  assert.equal(once.areas.bag_items.items.length, 108)
  assert.ok(once.areas.study_lines && once.areas.station_text && once.areas.trace_lines, 'the three new lists exist')
  assert.ok(once.areas.bag_items.items.every(it => it.deleted === false && typeof it.order === 'number'))
  const twice = applyAll(once, { newId })
  assert.deepEqual(twice, once, 'a second pass changes nothing')
  // a line Jon already wrote (or edited) is never doubled, and nothing is removed
  const written = { ...emptyState(), areas: { bag_items: { items: [{ id: 'jon1', text: 'Tin of Altoids — smell: minty (Jon’s wording)', deleted: false, order: 0 }, { id: 'jon2', text: 'Something of Susan’s — touch: soft', deleted: false, order: 1 }] } } }
  const after = applyAll(written, { newId })
  const items = after.areas.bag_items.items
  assert.equal(items.length, 2 + 107)
  assert.equal(items[0].text, 'Tin of Altoids — smell: minty (Jon’s wording)')
  assert.equal(items.filter(it => it.text.toLowerCase().startsWith('tin of altoids')).length, 1)
  assert.ok(items.every((it, i) => i === 0 || it.order > items[i - 1].order), 'orders keep climbing')
})

test('retired tasks are marked done once, and settled decisions answered once', () => {
  const state = { ...emptyState(), tasks: [{ id: 't14', order: 14, status: 'todo', detail: 'old' }, { id: 't15', order: 15, status: 'done', detail: 'already' }, { id: 't99', order: 99, status: 'todo' }], decisions: { irwinAffection: { key: 'irwinAffection', answer: null }, act4Pairing: { key: 'act4Pairing', answer: 'Self-chosen' } } }
  const add = ADDITIONS.find(a => a.id === '2026-10-18-missing-lists')
  const plan = planAddition(add, state, { now: 5 })
  assert.deepEqual(plan.taskPatches.map(p => p.id), ['t14'], 'only the open card with that number')
  assert.ok(plan.taskPatches[0].patch.detail.startsWith('old Retired'))
  assert.deepEqual(Object.keys(plan.decisionPatches), ['irwinAffection'], 'an answered decision is left alone')
  const after = applyPlan(plan, state)
  assert.equal(after.tasks.find(t => t.id === 't14').status, 'done')
  assert.equal(after.tasks.find(t => t.id === 't99').status, 'todo')
  assert.equal(after.decisions.act4Pairing.answer, 'Self-chosen')
  assert.equal(after.decisions.irwinAffection.answeredBy, 'the canon')
  assert.equal(planAddition(add, after).skip, true)
  // freshLines on its own
  assert.deepEqual(freshLines([{ text: 'A — smell: x', order: 3 }], ['A — smell: y', 'B — smell: z', 'B — smell: z'], () => 'i').map(it => [it.text, it.order]), [['B — smell: z', 4]])
})
