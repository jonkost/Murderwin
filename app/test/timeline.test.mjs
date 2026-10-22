import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import night from '../../seed/night.json' with { type: 'json' }
import tasksFile from '../../seed/tasks.json' with { type: 'json' }
import { AREAS, ADDITIONS, UI_LABELS, STATION_LABELS, TAB_KINDS } from '../src/lib/content.js'
import { TIMELINE, NEEDS, MOMENT_KEYS, TIMELINE_LISTS, momentName, nightTimeline, timelineItems, timelineProgress, listStatus, secretStatus } from '../src/lib/timeline.js'
import { TIMELINE_TASKS, TIMELINE_DECISIONS, RETIRED_FOR_TIMELINE } from '../src/lib/timelineTasks.js'
import { planAddition, applyPlan } from '../src/lib/additions.js'

// The night, in order: every beat has a place, every list and label is
// filed once, and every task points at a real moment. Safe content only.

const allNeeds = () => TIMELINE.flatMap(s => [...s.needs, ...s.rows.flatMap(r => r.needs)])
const counted = () => allNeeds().filter(n => !n.also)

test('every beat of every act, and every Act 4 station, has a row, in night order', () => {
  for (const [n, act] of Object.entries(night.acts)) {
    if (n === '4') continue
    for (const b of act.beats) assert.ok(MOMENT_KEYS.includes(`act${n}.${b.key}`), `act${n}.${b.key}`)
  }
  for (const s of night.stations) assert.ok(MOMENT_KEYS.includes(`act4.${s.key}`), `act4.${s.key}`)
  assert.equal(new Set(MOMENT_KEYS).size, MOMENT_KEYS.length, 'row keys are unique')
  assert.equal(MOMENT_KEYS[0], 'freeze')
  assert.equal(MOMENT_KEYS.at(-1), 'after')
  const acts = TIMELINE.filter(s => s.act).map(s => s.act)
  assert.deepEqual(acts, [1, 2, 3, 4, 5, 6, 7])
})

test('a Parlour Games row sits in each act that plans some', () => {
  for (const [n, count] of Object.entries(night.parlour.counts)) {
    if (count > 0) assert.ok(MOMENT_KEYS.includes(`act${n}.parlour`), `act${n}.parlour`)
  }
})

test('every need names a real list, tab or label', () => {
  const labelSets = { ui_copy: UI_LABELS, station_text: STATION_LABELS }
  for (const key of Object.keys(NEEDS)) assert.ok(MOMENT_KEYS.includes(key), `NEEDS.${key} is a row`)
  for (const need of allNeeds()) {
    if (need.secret) { assert.ok(need.name, `secret ${need.secret} has a name`); continue }
    const spec = AREAS[need.list]
    assert.ok(spec, `${need.list} is a list`)
    assert.ok(!spec.retired, `${need.list} is not retired`)
    if (need.tab) assert.ok(TAB_KINDS[spec.tabs].list.includes(need.tab), `${need.list} has tab ${need.tab}`)
    for (const l of need.labels ?? []) assert.ok(labelSets[need.list].some(x => x.value === l), `${need.list} has label ${l}`)
  }
})

test('every list the night reads is on the timeline, and every label is filed exactly once', () => {
  const lists = new Set(counted().map(n => n.list).filter(Boolean))
  for (const [area, spec] of Object.entries(AREAS)) {
    if (spec.retired || spec.hidden || spec.checklist) continue
    assert.ok(lists.has(area), `${area} has a place on the night`)
  }
  for (const [list, labels] of [['ui_copy', UI_LABELS], ['station_text', STATION_LABELS]]) {
    const filed = counted().filter(n => n.list === list).flatMap(n => n.labels ?? [])
    assert.deepEqual([...filed].sort(), labels.map(l => l.value).sort(), `${list}: each label once`)
  }
  const acts = counted().filter(n => n.list === 'act_scripts').map(n => n.tab)
  assert.deepEqual(acts, TAB_KINDS.acts.list, 'one act script per act')
  assert.ok(TIMELINE_LISTS.includes('ui_copy') && TIMELINE_LISTS.includes('trace_lines'))
})

test('every new task and decision is filed under a real moment, with no em dash', () => {
  for (const t of TIMELINE_TASKS) {
    assert.ok(MOMENT_KEYS.includes(t.moment), `${t.title}: ${t.moment}`)
    assert.ok(momentName(t.moment), t.moment)
    for (const k of ['title', 'detail', 'who']) assert.ok(!String(t[k] ?? '').includes('—'), `${t.title}.${k}`)
  }
  for (const d of TIMELINE_DECISIONS) {
    assert.ok(MOMENT_KEYS.includes(d.moment), d.key)
    assert.ok(d.options.length >= 2, d.key)
  }
  for (const s of TIMELINE) for (const r of s.rows) for (const k of ['name', 'what']) assert.ok(!String(r[k]).includes('—'), `${r.key}.${k}`)
})

test('task orders never collide with any earlier card', () => {
  const earlier = [...tasksFile.tasks, ...ADDITIONS.filter(a => a.id !== '2026-10-22-night-timeline').flatMap(a => a.tasks ?? [])].map(t => t.order)
  const mine = TIMELINE_TASKS.map(t => t.order)
  assert.equal(new Set(mine).size, mine.length, 'unique among themselves')
  for (const o of mine) assert.ok(!earlier.includes(o), `order ${o} is new`)
  for (const r of RETIRED_FOR_TIMELINE) assert.ok(earlier.includes(r.order), `retired order ${r.order} was a card`)
})

test('there is one sound task per sound cue, under the beat that plays it', () => {
  const src = readFileSync(new URL('../../functions/lib/screen.js', import.meta.url), 'utf8')
  const ids = JSON.parse(src.match(/export const SOUND_IDS = (\[[^\]]*\])/)[1].replace(/'/g, '"'))
  const sounds = TIMELINE_TASKS.filter(t => t.title.startsWith('Sound: ')).map(t => t.title.slice(7))
  assert.deepEqual([...sounds].sort(), [...ids].sort())
  for (const t of TIMELINE_TASKS.filter(x => x.title.startsWith('Sound: '))) {
    const [act, beat] = t.moment.split('.')
    const spec = night.acts[act.slice(3)]?.beats.find(b => b.key === beat)
    if (spec?.sound) assert.equal(spec.sound, t.title.slice(7), `${t.moment} plays ${spec.sound}`)
  }
})

test('the migration files the new cards and retires the old ones, once', () => {
  const add = ADDITIONS.find(a => a.id === '2026-10-22-night-timeline')
  assert.ok(add, 'the addition exists')
  const old = tasksFile.tasks.map((t, i) => ({ ...t, id: `old${i}` }))
  const state = { applied: [], areas: {}, decisions: {}, tasks: old }
  const after = applyPlan(planAddition(add, state, { newId: () => 'x', now: 1 }), state)
  for (const r of RETIRED_FOR_TIMELINE.filter(r => old.some(t => t.order === r.order))) {
    const t = after.tasks.find(x => x.order === r.order)
    assert.equal(t.status, 'done', `card ${r.order} retired`)
    assert.ok(t.detail.endsWith(r.detail), `card ${r.order} says why`)
  }
  assert.equal(after.tasks.filter(t => t.moment).length, TIMELINE_TASKS.length)
  for (const d of TIMELINE_DECISIONS) assert.equal(after.decisions[d.key].moment, d.moment)
  const again = applyPlan(planAddition(add, after, { newId: () => 'y', now: 2 }), after)
  assert.equal(again.tasks.length, after.tasks.length, 'never twice')
})

test('status: lists count live lines, labels need words, secrets give counts only', () => {
  const ui = NEEDS['act1.meet'].find(n => n.list === 'ui_copy')
  assert.equal(listStatus(ui, []).done, false)
  assert.equal(listStatus(ui, [{ text: 'NOTICE MEET:', deleted: false }]).count, 0, 'a label with no words is not written')
  assert.equal(listStatus(ui, [{ text: 'NOTICE MEET: Find the cats.', deleted: true }]).count, 0, 'a deleted line is not written')
  assert.equal(listStatus(ui, [{ text: 'NOTICE MEET: Find the cats.', deleted: false }]).done, true)
  const roles = { list: 'role_cards' }
  assert.equal(listStatus(roles, [1, 2, 3].map(i => ({ text: `card ${i}`, deleted: false }))).done, true)
  assert.equal(listStatus({ list: 'act_scripts', tab: 'act2' }, [{ act: 'act2', text: 'Go.', deleted: false }]).done, true)
  assert.equal(secretStatus({ name: 'x' }, null).done, false)
  assert.equal(secretStatus({ name: 'x' }, { complete: 19, codes: 19, pass: true }).done, true)
  assert.equal(secretStatus({ name: 'x' }, { complete: 19, codes: 19, pass: false }).done, false)
})

test('progress: one entry per need, task and decision, in night order', () => {
  const empty = timelineProgress({})
  assert.equal(empty.ready, 0)
  assert.equal(empty.first.section, 'setup', 'the first gap with no tasks loaded is the first list')
  const tasks = [{ id: 'a', moment: 'freeze', status: 'todo', title: 'A', order: 1 }, { id: 'b', moment: 'after', status: 'done', title: 'B', order: 2 }, { id: 'c', moment: 'after', status: 'todo', title: 'C', deleted: true, order: 3 }]
  const decisions = [{ key: 'k', moment: 'act2.news', answer: null }]
  const items = timelineItems({ tasks, decisions })
  assert.equal(items.filter(i => i.kind === 'task').length, 2, 'a deleted task is not on the night')
  assert.equal(items.filter(i => i.kind === 'decision').length, 1)
  const p = timelineProgress({ tasks, decisions })
  assert.equal(p.first.kind, 'task')
  assert.equal(p.ready, 1)
  const keys = new Set(items.filter(i => i.kind === 'need').map(i => `${i.need.list ?? i.need.secret}:${i.need.tab ?? ''}:${(i.need.labels ?? []).join()}`))
  assert.equal(keys.size, items.filter(i => i.kind === 'need').length, 'each need counted once')
})

test('the timeline follows night.json: a renamed beat or station shows up by itself', () => {
  const file = structuredClone(night)
  file.stations[0].name = 'Renamed'
  file.acts['2'].beats.push({ key: 'extra', name: 'Extra', what: 'x' })
  const t = nightTimeline(file)
  assert.equal(t.find(s => s.key === 'act4').rows.find(r => r.key === 'act4.study').name, 'Renamed')
  assert.ok(t.find(s => s.key === 'act2').rows.some(r => r.key === 'act2.extra'))
})
