import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { AREAS, ADDITIONS, UI_LABELS, COUNTED_UI_LABELS, NOTICE_KEYS, STUDY_LABELS, STATION_LABELS, TRACE_LABELS, BAG_ITEM_SEED, CASE_WORDS, TAB_KINDS, fieldsFor, codecFor, lintItem, goalOf, tabsOf } from '../src/lib/content.js'
import { ALL_CARDS, cardFor } from '../src/lib/cards.js'
import { HOUSEHOLD, npcCodec } from '../src/lib/codecs.js'
import { planAddition, applyPlan, freshLines, taskMatches, taskOrdersOf, decisionKeysOf } from '../src/lib/additions.js'

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
  assert.equal(goalOf(AREAS.ui_copy), COUNTED_UI_LABELS.length, 'the goal counts only the lines with no words of their own yet')
  assert.equal(UI_LABELS.filter(l => l.extra).length, 54, 'fifty-four extra lines the game reads (Act 2 and Act 4 added 23 Oct 2026)')
  assert.deepEqual(UI_LABELS.filter(l => l.retired).map(l => l.value), ['HIDE', 'HOLD', 'NUMBERS', 'NOTICE SCRAP', 'NOTICE CHECKIN', 'GREET SALEM', 'GREET ZIMOTHY', 'GREET BOO', 'GREET GRANOLIA'], 'the role card’s hide button and hold line (25 Oct 2026), the safe’s lines, the check-in and the greetings, retired, still show what was written')
  assert.ok(values.includes('CONTINUE'), 'the one button after the blackout (25 Oct 2026)')
  assert.equal(UI_LABELS.length - COUNTED_UI_LABELS.length, 63, 'neither the extra nor the retired lines count')
  assert.equal(STUDY_LABELS.length, 12)
  assert.equal(STATION_LABELS.map(o => o.value).join(','), 'STUDY,CAT,BAGS,PUZZLE,CHECKIN')
  assert.ok(AREAS.station_text.retired && AREAS.station_text.hidden, 'the five stations are retired: Act 4 is four rooms')
  assert.equal(TRACE_LABELS.length, 14)
  assert.ok(TRACE_LABELS.every(o => /^TRACE [A-Z ]+$/.test(o.value)), 'trace labels have no hyphen, so the label codec keeps them')
  assert.ok(TRACE_LABELS.some(o => o.value === 'TRACE BOOT PRINT'))
  // the lint keeps the five stops; the safe's old lines need nothing
  assert.equal(lintItem('ui_copy', 'NUMBERS: the numbers were lost.'), null)
  assert.equal(lintItem('ui_copy', 'STOPS: Cold shoulder, Wary, Undecided, Fond, Devoted'), null)
  assert.ok(lintItem('ui_copy', 'STOPS: Cold, Warm'))
  assert.ok(lintItem('trace_lines', 'TRACE INK: Rye left it'), 'never a name')
  assert.equal(lintItem('trace_lines', 'TRACE INK: a splash of ink beside the desk'), null)
})

test('the bag items seed: Jon\'s final 24 lines, every one passes the list\'s rules and round-trips; a September line gets a note, not a stop', () => {
  assert.equal(BAG_ITEM_SEED.length, 24)
  assert.equal(new Set(BAG_ITEM_SEED.map(l => l.toLowerCase())).size, 24)
  for (const line of BAG_ITEM_SEED) {
    assert.equal(lintItem('bag_items', line), null, line)
    const codec = codecFor('bag_items')
    assert.equal(codec.join(codec.split(line)), line, 'round trip')
  }
  assert.equal(BAG_ITEM_SEED.filter(l => / ball — /.test(l)).length, 6, 'each ball is its own line')
  assert.equal(goalOf(AREAS.bag_items), 24)
  assert.ok(lintItem('bag_items', 'Tin of Altoids — smell: minty; sound: rattles'), 'a September line has no kind')
  assert.match(lintItem('bag_items', 'Thing — smell: crinkly · extra · stock 2'), /never a clue word/)
  assert.match(lintItem('bag_items', 'Thing — smell: zesty · extra · stock 2'), /not one of the fourteen/)
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
  // the 108 September items arrive on 18 Oct and retire on 24 Oct (soft-deleted, never erased); the final 24 are live
  assert.equal(once.areas.bag_items.items.length, 108 + 24)
  assert.equal(once.areas.bag_items.items.filter(it => !it.deleted).length, 24)
  assert.equal(once.areas.bag_items.items.filter(it => it.deleted && it.retiredBy === '2026-10-24-handoff-1023').length, 108)
  assert.ok(once.areas.study_lines && once.areas.station_text && once.areas.trace_lines, 'the three new lists exist')
  assert.ok(once.areas.bag_items.items.every(it => typeof it.deleted === 'boolean' && typeof it.order === 'number'))
  const twice = applyAll(once, { newId })
  assert.deepEqual(twice, once, 'a second pass changes nothing')
  // a line Jon already wrote (or edited) is never doubled, and nothing is removed
  const written = { ...emptyState(), areas: { bag_items: { items: [{ id: 'jon1', text: 'Tin of Altoids — smell: minty (Jon’s wording)', deleted: false, order: 0 }, { id: 'jon2', text: 'Something of Susan’s — touch: soft', deleted: false, order: 1 }] } } }
  const after = applyAll(written, { newId })
  const items = after.areas.bag_items.items
  assert.equal(items.length, 2 + 107 + 24)
  assert.equal(items[0].text, 'Tin of Altoids — smell: minty (Jon’s wording)')
  assert.equal(items.filter(it => it.text.toLowerCase().startsWith('tin of altoids')).length, 1)
  assert.equal(items[0].deleted, true, 'a September line, even in Jon’s wording, is retired with the rest')
  assert.equal(items[1].deleted, false, 'a line that was never on the September list stays')
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

test('the Parlour Games bank lands once: seventeen sets of three questions with two answers, none doubled, Jon\'s own sets left alone', async () => {
  const { freshScenarios } = await import('../src/lib/additions.js')
  const add = ADDITIONS.find(a => a.id === '2026-10-21-parlour-bank')
  assert.ok(add)
  const sets = add.appendScenarios.scenarios
  assert.equal(sets.length, 17)
  for (const beats of sets) {
    assert.equal(beats.length, 3)
    for (const b of beats) { assert.equal(b.n, 2); assert.ok(b.q && b.a && b.b); assert.equal(b.c, undefined) }
  }
  let n = 0
  const newId = () => `id${++n}`
  const mine = { id: 'mine', text: 'Pineapple on pizza?', order: 4, deleted: false, beats: [{ q: 'Pineapple on pizza?', n: 2, a: 'Sure', av: 0, b: 'No', bv: 0 }, { q: '', n: 2, a: '', av: 0, b: '', bv: 0 }, { q: '', n: 2, a: '', av: 0, b: '', bv: 0 }] }
  const state = { applied: [], areas: { scenarios: { items: [mine] } }, decisions: {}, tasks: [] }
  const plan = planAddition(add, state, { newId, now: 1 })
  const items = plan.areaDocs.scenarios.items
  assert.equal(items.length, 17, 'sixteen new and Jon\'s own pizza set, kept as he wrote it')
  assert.deepEqual(items[0], mine)
  assert.ok(items.slice(1).every(i => i.order > 4 && i.text === i.beats[0].q && i.deleted === false))
  const after = applyPlan(plan, state)
  assert.equal(planAddition(add, after).skip, true, 'once only')
  assert.equal(freshScenarios(items, sets).length, 0, 'nothing doubled even if asked again')
})

test('the extra labels are the ones the game reads, can be picked, and pass the lint', () => {
  const read = (f) => readFileSync(new URL(`../../functions/lib/${f}`, import.meta.url), 'utf8')
  const deal = read('deal.js'), hosts = read('hosts.js'), screen = read('screen.js')
  const extra = UI_LABELS.filter(l => l.extra).map(l => l.value)
  const want = [
    ...['WAIT', 'LATER', 'GO', 'NEXT', 'ARRIVE', 'WITH', 'DONE', 'SUPPER'].map(k => `LIGHTS ${k}`), 'SUPPER NOTE',
    ...['WARN', 'GROUP', 'STUDY', 'LIBRARY', 'ORANGERIE', 'ENTRYWAY', 'PARLOUR', 'ARRIVE', 'CHIME', 'PAID', 'OVER'].map(k => `ACT4 ${k}`),
    ...['STUDY', 'LIBRARY', 'ORANGERIE', 'ENTRYWAY'].flatMap(k => [`REWARD ${k} DONE`, `REWARD ${k} CAPPED`]),
    ...[1, 2, 3, 4, 5, 6].map(i => `BOO JUDGE ${i}`),
    'SALEM FRIEND', 'HOST GRANOLIA', 'HOST ZIMOTHY', 'HOST SALEM',
    ...[1, 2, 3, 4, 5, 6].map(i => `HOST BOO ${i}`), ...[1, 2, 3, 4, 5].map(i => `HOST IRWIN TRACE ${i}`),
    ...['FIVE', 'FOUR', 'THREE', 'TWO', 'ONE'].map(w => `IRWIN ${w}`),
  ]
  assert.deepEqual([...extra].sort(), [...want].sort())
  // where the game reads them
  const act4 = read('act4.js')
  assert.ok(deal.includes('`LIGHTS ${variant.toUpperCase()}`') && deal.includes("ui['LIGHTS ARRIVE']") && deal.includes("ui['SUPPER NOTE']") && deal.includes("ui['SALEM FRIEND']"))
  for (const k of ['wait', 'later', 'go', 'next', 'with', 'done', 'supper']) assert.match(deal, new RegExp(`^  ${k}: \\{ title:`, 'm'), `LIGHTS ${k.toUpperCase()} has a default`)
  for (const k of ['ACT4 WARN', 'ACT4 GROUP', 'ACT4 ARRIVE', 'ACT4 CHIME', 'ACT4 PAID', 'ACT4 OVER', 'BOO JUDGE']) assert.ok(act4.includes(k), k)
  assert.ok(act4.includes('`ACT4 ${room.toUpperCase()}`') && act4.includes('`REWARD ${room.toUpperCase()} ${outcome'), 'the room directions and rewards')
  assert.ok(hosts.includes('`HOST ${key.toUpperCase()}`') && hosts.includes('`HOST BOO ${i + 1}`') && hosts.includes('`HOST IRWIN TRACE ${l}`'))
  for (const w of ['FIVE', 'FOUR', 'THREE', 'TWO', 'ONE']) assert.ok(screen.includes(`'IRWIN ${w}'`), `IRWIN ${w}`)
  // every one is offered in the Which screen box and passes the lint
  const options = AREAS.ui_copy.fields.find(f => f.key === 'label').options.map(o => o.value)
  for (const v of extra) {
    assert.ok(options.includes(v), v)
    assert.equal(lintItem('ui_copy', codecFor('ui_copy').join({ label: v, text: 'A line.' })), null, v)
  }
})

test('the retired lists stay out of sight and out of the counts', () => {
  for (const area of ['echo_frames', 'art_assets', 'av_assets', 'trace_lines']) {
    assert.ok(AREAS[area].hidden && AREAS[area].retired, `${area} is retired`)
    assert.match(AREAS[area].moment, /^Retired/, `${area} says so`)
  }
  assert.ok(!AREAS.scenarios.moment.includes('four times'), 'the Parlour Games are five, five and two')
  assert.match(AREAS.scenarios.moment, /Twelve a night/)
})

// The two new board operations (23 Oct 2026), and the title check on a
// retired card, on a pretend board.
test('fileTasks: files an open card with no moment or still under from, dates it once, adds the note once', () => {
  const add = { id: 'x', fileTasks: [
    { order: 1, from: 'week', moment: 'freeze', by: '2026-10-31', note: 'More.' },
    { order: 2, moment: 'act1.meet' },
    { order: 3, from: 'week', moment: 'freeze', by: '2026-10-31' },
    { order: 4, moment: 'freeze' },
    { order: 5, title: 'Seeded title', note: 'Then deploy.' },
  ] }
  const state = { applied: [], areas: {}, decisions: {}, tasks: [
    { id: 'a', order: 1, status: 'todo', moment: 'week', detail: 'Old.' },
    { id: 'b', order: 2, status: 'todo' },
    { id: 'c', order: 3, status: 'todo', moment: 'act2.cat', by: '2026-11-01' },
    { id: 'd', order: 4, status: 'done' },
    { id: 'e', order: 5, status: 'todo', title: 'seeded  TITLE', detail: 'Draw it.' },
    { id: 'f', order: 5, status: 'todo', title: 'Jon’s own card', detail: 'Mine.' },
  ] }
  const plan = planAddition(add, state, { now: 1 })
  const after = applyPlan(plan, state)
  const t = (id) => after.tasks.find(x => x.id === id)
  assert.deepEqual([t('a').moment, t('a').by, t('a').detail], ['freeze', '2026-10-31', 'Old. More.'])
  assert.equal(t('b').moment, 'act1.meet', 'a card with no moment is filed')
  assert.deepEqual([t('c').moment, t('c').by], ['act2.cat', '2026-11-01'], 'a card Jon moved, or dated, keeps his choice')
  assert.equal(t('d').moment, undefined, 'a done card is left alone')
  assert.equal(t('e').detail, 'Draw it. Then deploy.', 'the title matches whatever its spacing and case')
  assert.equal(t('f').detail, 'Mine.', 'a card added by hand with the same number is never touched')
  assert.equal(planAddition(add, after).skip, true, 'once only')
})

test('retireTasks with a title retires only the seeded card; one patch per card even when two entries touch it', () => {
  const add = { id: 'y', retireTasks: [{ order: 7, title: 'Open the screens', detail: 'Replaced.' }], fileTasks: [{ order: 7, title: 'Open the screens', note: 'Ignored once done.' }] }
  const state = { applied: [], areas: {}, decisions: {}, tasks: [
    { id: 's', order: 7, status: 'todo', title: 'Open the screens', detail: 'Old.' },
    { id: 'h', order: 7, status: 'todo', title: 'Buy candles', detail: '' },
  ] }
  const plan = planAddition(add, state, { now: 1 })
  assert.deepEqual(plan.taskPatches.map(p => p.id), ['s'])
  assert.deepEqual(plan.taskPatches[0].patch, { status: 'done', detail: 'Old. Replaced.' }, 'a retired card is not filed or noted as well')
  assert.ok(taskMatches({ order: 7, title: 'OPEN the screens ' }, { order: 7, title: 'Open the screens' }))
  assert.ok(!taskMatches({ order: 8, title: 'Open the screens' }, { order: 7, title: 'Open the screens' }))
  assert.ok(taskMatches({ order: 7, title: 'Anything' }, { order: 7 }), 'with no title, the number alone (the older migrations)')
  assert.deepEqual(taskOrdersOf({ retireTasks: [{ order: 1 }, { order: 2 }], fileTasks: [{ order: 2 }, { order: 3 }] }), [1, 2, 3])
})

test('fileDecisions files a decision with no moment and never moves one that has one; answering and filing the same decision merge', () => {
  const add = { id: 'z', fileDecisions: { a: 'freeze', b: 'freeze', gone: 'freeze' }, answerDecisions: { a: 'Yes' } }
  const state = { applied: [], areas: {}, tasks: [], decisions: { a: { key: 'a', answer: null }, b: { key: 'b', answer: null, moment: 'act2.cat' } } }
  const plan = planAddition(add, state, { now: 3 })
  assert.deepEqual(Object.keys(plan.decisionPatches).sort(), ['a'])
  assert.deepEqual(plan.decisionPatches.a, { answer: 'Yes', answeredAt: 3, answeredBy: 'the canon', moment: 'freeze' })
  const after = applyPlan(plan, state)
  assert.equal(after.decisions.b.moment, 'act2.cat')
  assert.equal(after.decisions.gone, undefined, 'a decision that is not there is not made up')
})

// The rewrite operations (24 Oct 2026): a card's words replaced rather than
// grown, the old words kept on the card; a decision reworded in place.
test('rewriteTasks: replaces the named fields on the seeded open card only, keeps the old words, once', () => {
  const add = { id: 'w', rewriteTasks: [
    { order: 1, title: 'Old title', set: { title: 'New title', detail: 'One clean instruction.', tech: 'npm run x', who: 'Claude Code' } },
    { order: 2, set: { detail: 'Never applied: the card is done.' } },
    { order: 3, set: { moment: 'freeze', by: '2026-11-06' } },
    { order: 4, set: { nonsense: 'ignored' } },
  ] }
  const state = { applied: [], areas: {}, decisions: {}, tasks: [
    { id: 'a', order: 1, status: 'todo', title: 'old  TITLE', detail: 'Old. (24 Oct 2026: a correction.)', who: 'Jon' },
    { id: 'h', order: 1, status: 'todo', title: 'Jon’s own card', detail: 'Mine.' },
    { id: 'b', order: 2, status: 'done', detail: 'Finished.' },
    { id: 'c', order: 3, status: 'todo', title: 'Dated', moment: 'week' },
    { id: 'd', order: 4, status: 'todo', title: 'Untouched', detail: 'Stays.' },
    { id: 'e', order: 3, status: 'todo', title: 'Removed', deleted: true },
  ] }
  const plan = planAddition(add, state, { now: 1 })
  const after = applyPlan(plan, state)
  const t = (id) => after.tasks.find(x => x.id === id)
  assert.deepEqual([t('a').title, t('a').detail, t('a').tech, t('a').who], ['New title', 'One clean instruction.', 'npm run x', 'Claude Code'])
  assert.deepEqual(t('a').previous, { w: { title: 'old  TITLE', detail: 'Old. (24 Oct 2026: a correction.)', tech: null, who: 'Jon' } }, 'the words it replaced are kept on the card')
  assert.equal(t('h').detail, 'Mine.', 'a card added by hand with the same number is never touched')
  assert.equal(t('b').detail, 'Finished.', 'a done card is left alone')
  assert.deepEqual([t('c').moment, t('c').by, t('c').previous.w], ['freeze', '2026-11-06', { moment: 'week', by: null }])
  assert.equal(t('d').previous, undefined, 'a rewrite with nothing it may change does nothing')
  assert.equal(t('e').moment, undefined, 'a removed card is left alone')
  assert.ok(plan.taskPatches.every(p => !Object.values(p.patch).includes(undefined)), 'nothing undefined reaches the database')
  assert.deepEqual(taskOrdersOf(add), [1, 2, 3, 4], 'the store fetches the cards a rewrite names')
  assert.equal(planAddition(add, after).skip, true, 'once only')
  // a card retired by the same entry is not rewritten as well
  const both = planAddition({ id: 'v', retireTasks: [{ order: 1, title: 'Old title', detail: 'Done.' }], rewriteTasks: [{ order: 1, title: 'Old title', set: { detail: 'New.' } }] }, state, { now: 1 })
  assert.deepEqual(both.taskPatches.find(p => p.id === 'a').patch, { status: 'done', detail: 'Old. (24 Oct 2026: a correction.) Done.' })
})

test('refileDecisions with set: rewords a decision still where it was left, and an answer keeps its place among renamed options', () => {
  const add = { id: 'r', refileDecisions: {
    dinner: { from: 'act3.down', to: 'act3.down', set: { question: 'In the Orangerie?', options: ['Captions in the Orangerie', 'Spare phone only'] } },
    jons: { from: 'act3.down', to: 'act3.down', set: { options: ['Captions in the Orangerie', 'Spare phone only'] } },
    gone: { from: 'act4.groups', to: 'retired', set: { retired: true, note: 'Retired.' } },
    tidy: { from: 'freeze', to: 'freeze', set: { who: 'Claude Code', answer: 'never set this way' } },
    moved: { from: 'freeze', to: 'act1.arrive', set: { note: 'Not applied: Jon moved it.' } },
  } }
  const state = { applied: [], areas: {}, tasks: [], decisions: {
    dinner: { key: 'dinner', moment: 'act3.down', options: ['Captions in the orangery', 'Spare phone only'], answer: 'Captions in the orangery' },
    jons: { key: 'jons', moment: 'act3.down', options: ['Captions in the orangery', 'Spare phone only'], answer: 'Something Jon typed' },
    gone: { key: 'gone', moment: 'act4.groups', answer: 'Skip' },
    tidy: { key: 'tidy', moment: 'freeze', answer: null },
    moved: { key: 'moved', moment: 'act2.cat', answer: null },
  } }
  const after = applyPlan(planAddition(add, state, { now: 1 }), state)
  assert.deepEqual([after.decisions.dinner.question, after.decisions.dinner.answer], ['In the Orangerie?', 'Captions in the Orangerie'])
  assert.equal(after.decisions.jons.answer, 'Something Jon typed', 'an answer that was not one of the options is never changed')
  assert.deepEqual([after.decisions.gone.moment, after.decisions.gone.retired, after.decisions.gone.answer], ['retired', true, 'Skip'])
  assert.deepEqual([after.decisions.tidy.who, after.decisions.tidy.answer], ['Claude Code', null], 'a rewrite never answers a question')
  assert.equal(after.decisions.moved.note, undefined, 'a decision Jon moved is left where he put it')
})

test('Salem is Crooknog everywhere, and an old Crookshank line still opens as his card', () => {
  assert.equal(HOUSEHOLD.find(h => h.key === 'salem').name, 'SALEM CROOKNOG')
  assert.ok(CASE_WORDS.includes('crooknog') && !CASE_WORDS.includes('crookshank'))
  const old = npcCodec.split('SALEM CROOKSHANK — the long-time groundskeeper. Forty years on these grounds.')
  assert.deepEqual(old, { who: 'salem', about: 'Forty years on these grounds.' })
  assert.equal(npcCodec.join(old), 'SALEM CROOKNOG — the long-time groundskeeper. Forty years on these grounds.', 'saving it writes the new name')
})

test('no list, card or example tells the old story: the living room, the orangery, fifteen minutes, Crookshank', () => {
  const words = /living room|orangery|fifteen minutes|crookshank|kept quiet earlier/i
  for (const [area, spec] of Object.entries(AREAS)) {
    if (spec.retired) continue
    const card = ALL_CARDS[area]
    const text = [spec.moment, spec.why, ...(spec.fields ?? []).map(f => f.placeholder), card.what, card.where, card.howTo, ...(card.example ?? []).map(e => e.text)].join(' ')
    assert.ok(!words.test(text), `${area}: ${text.match(words)?.[0]}`)
  }
  assert.match(AREAS.scenarios.moment, /wait on each phone/, 'Act 4’s Parlour Games wait on the phone')
})

test('the greeting lists show only Sir Irwin’s tab, the one the night reads; other lists show every tab', () => {
  assert.deepEqual(tabsOf(AREAS.openers), ['irwin'])
  assert.deepEqual(tabsOf(AREAS.closers), ['irwin'])
  assert.deepEqual(tabsOf(AREAS.smalltalk), TAB_KINDS.cats.list)
  assert.equal(tabsOf(AREAS.bios), null)
  assert.equal(goalOf(AREAS.openers), 1)
})

// 24 Oct 2026, evening: six questions still showed their 31 August answers,
// which later decisions replaced. The answer becomes what is true now, and
// the old answer stays on the decision.
test('supersedeDecisions: the answer becomes what is true now, the old answer kept, once', () => {
  const add = { id: 's', supersedeDecisions: {
    old: 'Replaced 22 Oct 2026: what is true now.',
    open: 'Replaced 22 Oct 2026: true now as well.',
    same: 'Already the line.',
    gone: 'Never made up.',
    blank: '',
  } }
  const state = { applied: [], areas: {}, tasks: [], decisions: {
    old: { key: 'old', options: ['A', 'B'], answer: 'A', answeredBy: 'Jon', answeredAt: 5, previous: { earlier: { answer: null } } },
    open: { key: 'open', options: ['A', 'B'], answer: null },
    same: { key: 'same', answer: 'Already the line.', answeredBy: 'later decisions', answeredAt: 7 },
    blank: { key: 'blank', answer: 'Kept.' },
  } }
  const plan = planAddition(add, state, { now: 9 })
  const after = applyPlan(plan, state)
  const d = after.decisions
  assert.deepEqual([d.old.answer, d.old.answeredBy, d.old.answeredAt], ['Replaced 22 Oct 2026: what is true now.', 'later decisions', 9])
  assert.deepEqual(d.old.previous, { earlier: { answer: null }, s: { answer: 'A', answeredBy: 'Jon', answeredAt: 5 } }, 'the 31 August answer is kept, beside any earlier one')
  assert.deepEqual(d.old.options, ['A', 'B'], 'the options are left as they were')
  assert.deepEqual([d.open.answer, d.open.previous.s], ['Replaced 22 Oct 2026: true now as well.', { answer: null, answeredBy: null, answeredAt: null }])
  assert.equal(d.same.answeredAt, 7, 'a decision that already says it is left alone')
  assert.equal(d.gone, undefined, 'a decision that is not there is not made up')
  assert.equal(d.blank.answer, 'Kept.', 'an empty line never wipes an answer')
  assert.ok(Object.values(plan.decisionPatches).every(p => !Object.values(p).includes(undefined)), 'nothing undefined reaches the database')
  assert.deepEqual(decisionKeysOf(add), ['old', 'open', 'same', 'gone', 'blank'], 'the store fetches the decisions it names')
  assert.equal(planAddition(add, after).skip, true, 'once only')
})

test('decisionKeysOf: every decision an entry adds, answers, files, refiles or supersedes, once each', () => {
  const add = {
    decisions: [{ key: 'a' }],
    answerDecisions: { b: 'x', a: 'y' },
    fileDecisions: { c: 'freeze' },
    refileDecisions: { d: { from: 'x', to: 'y' } },
    supersedeDecisions: { e: 'z', b: 'w' },
  }
  assert.deepEqual(decisionKeysOf(add), ['a', 'b', 'c', 'd', 'e'])
  assert.deepEqual(decisionKeysOf({}), [])
  const src = readFileSync(new URL('../src/lib/store.firestore.js', import.meta.url), 'utf8')
  assert.match(src, /const decisionKeys = decisionKeysOf\(add\)/, 'the store reads the keys from the one list')
})
