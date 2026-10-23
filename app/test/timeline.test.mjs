import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import night from '../../seed/night.json' with { type: 'json' }
import tasksFile from '../../seed/tasks.json' with { type: 'json' }
import { AREAS, ADDITIONS, UI_LABELS, COUNTED_UI_LABELS, STATION_LABELS, TAB_KINDS } from '../src/lib/content.js'
import { TIMELINE, NEEDS, MOMENT_KEYS, TIMELINE_LISTS, STANDIN_LISTS, momentName, nightTimeline, timelineItems, timelineProgress, bucketProgress, listStatus, taskWhen, taskStandin, taskNotYou, OWNERS, ownerOf, taskBy, byLabel, leftByOwner, leftLine, nextCards, unfiled, momentOptions } from '../src/lib/timeline.js'
import { TIMELINE_TASKS, TIMELINE_DECISIONS, RETIRED_FOR_TIMELINE, STANDIN_SOUND_TASKS, ALL_TIMELINE_TASKS, HANDOFF_TASKS, RETIRED_FOR_HANDOFF, HANDOFF_BUILT_TASKS, RETIRED_FOR_BUILT, AUDIT_TASKS, RETIRED_FOR_AUDIT, FILED_FOR_AUDIT, AUDIT_DECISIONS, FILED_DECISIONS_FOR_AUDIT, ANSWERED_FOR_AUDIT, SECRET_LINES_TASKS, SECRET_LINES_DECISIONS, RETIRED_FOR_SECRET_LINES, FILED_FOR_SECRET_LINES } from '../src/lib/timelineTasks.js'
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

test('a Parlour Games row sits in each act that plans some at random times; an act that plays them as it opens has none', () => {
  const atStart = (night.parlour.atStart ?? []).map(String)
  assert.ok(atStart.includes('6'), 'Act 6 plays its two as it opens')
  for (const [n, count] of Object.entries(night.parlour.counts)) {
    if (!count) continue
    if (atStart.includes(n)) assert.ok(!MOMENT_KEYS.includes(`act${n}.parlour`), `act${n}: no second row for the same games`)
    else assert.ok(MOMENT_KEYS.includes(`act${n}.parlour`), `act${n}.parlour`)
  }
  assert.ok(NEEDS['act6.games'].some(n => n.list === 'scenarios' && n.also), 'the Parlour Games list is shown again on Act 6’s own games beat')
})

test('every need names a real list, tab or label', () => {
  const labelSets = { ui_copy: UI_LABELS, station_text: STATION_LABELS }
  for (const key of Object.keys(NEEDS)) assert.ok(MOMENT_KEYS.includes(key), `NEEDS.${key} is a row`)
  for (const need of allNeeds()) {
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
  for (const [list, labels] of [['ui_copy', COUNTED_UI_LABELS], ['station_text', STATION_LABELS]]) {
    const filed = counted().filter(n => n.list === list).flatMap(n => n.labels ?? [])
    assert.deepEqual([...filed].sort(), labels.map(l => l.value).sort(), `${list}: each label once`)
  }
  const extra = UI_LABELS.filter(l => l.extra).map(l => l.value)
  assert.ok(!allNeeds().some(n => (n.labels ?? []).some(l => extra.includes(l))), 'the extra labels (words that already play) are never a need')
  const acts = counted().filter(n => n.list === 'act_scripts').map(n => n.tab)
  assert.deepEqual(acts, TAB_KINDS.acts.list, 'one act script per act')
  assert.ok(TIMELINE_LISTS.includes('ui_copy') && TIMELINE_LISTS.includes('study_lines'))
})

test('every new task and decision is filed under a real moment, with no em dash', () => {
  for (const t of ALL_TIMELINE_TASKS) {
    assert.ok(MOMENT_KEYS.includes(t.moment), `${t.title}: ${t.moment}`)
    assert.ok(momentName(t.moment), t.moment)
    for (const k of ['title', 'detail', 'who']) assert.ok(!String(t[k] ?? '').includes('—'), `${t.title}.${k}`)
  }
  for (const d of [...TIMELINE_DECISIONS, ...AUDIT_DECISIONS]) {
    assert.ok(MOMENT_KEYS.includes(d.moment), d.key)
    assert.ok(d.options.length >= 2, d.key)
    for (const k of ['question', 'note']) assert.ok(!String(d[k] ?? '').includes('—'), `${d.key}.${k}`)
  }
  for (const s of TIMELINE) for (const r of s.rows) for (const k of ['name', 'what']) assert.ok(!String(r[k]).includes('—'), `${r.key}.${k}`)
})

test('task orders never collide with any earlier card', () => {
  const earlier = [...tasksFile.tasks, ...ADDITIONS.filter(a => a.id !== '2026-10-22-night-timeline').flatMap(a => a.tasks ?? [])].map(t => t.order)
  const mine = TIMELINE_TASKS.map(t => t.order)
  const all = ALL_TIMELINE_TASKS.map(t => t.order)
  assert.equal(new Set(all).size, all.length, 'unique among themselves, the stand-in sounds card too')
  for (const o of mine) assert.ok(!earlier.includes(o), `order ${o} is new`)
  for (const r of RETIRED_FOR_TIMELINE) assert.ok(earlier.includes(r.order), `retired order ${r.order} was a card`)
})

test('the handoff cards are new, and the cards it settles were already on the board', () => {
  const add = ADDITIONS.find(a => a.id === '2026-10-22-handoff')
  assert.ok(add, 'the migration is there')
  const before = [...tasksFile.tasks, ...ADDITIONS.filter(a => a.id !== '2026-10-22-handoff').flatMap(a => a.tasks ?? [])].map(t => t.order)
  for (const t of HANDOFF_TASKS) assert.ok(!before.includes(t.order), `order ${t.order} is new`)
  for (const r of RETIRED_FOR_HANDOFF) assert.ok(before.includes(r.order), `retired order ${r.order} was a card`)
  assert.equal(add.answerDecisions.newsFamilies, TIMELINE_DECISIONS.find(d => d.key === 'newsFamilies').options[0])
  const built = ADDITIONS.find(a => a.id === '2026-10-22-handoff-built')
  const earlier = [...tasksFile.tasks, ...ADDITIONS.filter(a => a.id !== '2026-10-22-handoff-built').flatMap(a => a.tasks ?? [])].map(t => t.order)
  for (const t of HANDOFF_BUILT_TASKS) assert.ok(!earlier.includes(t.order), `order ${t.order} is new`)
  for (const r of RETIRED_FOR_BUILT) assert.ok(HANDOFF_TASKS.some(t => t.order === r.order), `retired order ${r.order} was a handoff card`)
  assert.ok(built.tasks === HANDOFF_BUILT_TASKS)
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
})

test('progress: one entry per need, task and decision, in night order', () => {
  const empty = timelineProgress({})
  assert.equal(empty.ready, 0)
  assert.equal(empty.first.section, 'allnight', 'the first gap with nothing written skips the stand-in lines and lands on the first list without one')
  assert.ok(!empty.first.standin)
  const tasks = [{ id: 'a', moment: 'freeze', status: 'todo', title: 'A', order: 1 }, { id: 'b', moment: 'after', status: 'done', title: 'B', order: 2 }, { id: 'c', moment: 'after', status: 'todo', title: 'C', deleted: true, order: 3 }]
  const decisions = [{ key: 'k', moment: 'act2.news', answer: null }]
  const items = timelineItems({ tasks, decisions })
  assert.equal(items.filter(i => i.kind === 'task').length, 2, 'a deleted task is not on the night')
  assert.equal(items.filter(i => i.kind === 'decision').length, 1)
  const p = timelineProgress({ tasks, decisions })
  assert.equal(p.first.kind, 'task')
  assert.equal(p.ready, 1)
  assert.equal(p.now.total + p.later.total, p.total, 'every item is either now or later')
  assert.equal(p.later.ready, 1, 'the done card under After the party is later')
  const keys = new Set(items.filter(i => i.kind === 'need').map(i => `${i.need.list}:${i.need.tab ?? ''}:${(i.need.labels ?? []).join()}`))
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

test('when: the week before, the day and after are later; everything else is now, and Jon can move a card', () => {
  for (const t of TIMELINE_TASKS) {
    const w = taskWhen(t)
    if (['week', 'setup', 'after'].includes(t.moment)) assert.equal(w, 'later', t.title)
    else if (t.when) assert.equal(w, t.when, t.title)
    else assert.equal(w, 'now', t.title)
  }
  // the live cards were written before `when` existed: the order finds the seeded card
  const cake = TIMELINE_TASKS.find(t => t.title.startsWith('The cake'))
  const { when, standin, ...live } = cake
  assert.equal(taskWhen(live), 'later')
  assert.equal(taskWhen({ ...live, when: 'now' }), 'now', 'Jon’s own choice wins')
  assert.equal(taskWhen({ moment: 'setup', order: 999 }), 'later', 'a new card under Setting up is later')
  assert.equal(taskWhen({ moment: 'act2.news', order: 999 }), 'now')
  assert.equal(taskWhen({ moment: 'setup', order: 999, when: 'now' }), 'now')
  for (const title of ['The square code up at the door', 'The numbered bags at the door', 'Dinner on the table in the orangery', 'The cake, with one candle']) {
    assert.equal(taskWhen(TIMELINE_TASKS.find(t => t.title === title)), 'later', title)
  }
})

test('stand-ins: every sound card, the blind-written stand-in cards and the paper stand-ins, and only lists the night has its own words for', () => {
  const covered = new Set([142, 143, 144, 306])
  const soundsMade = [{ order: 105, status: 'done' }]
  for (const t of ALL_TIMELINE_TASKS) assert.equal(taskStandin(t, soundsMade), t.title.startsWith('Sound: ') || covered.has(t.order), t.title)
  const { standin, standinOnceDone, ...liveSound } = TIMELINE_TASKS.find(t => t.title.startsWith('Sound: '))
  assert.equal(taskStandin(liveSound, soundsMade), true, 'found by order on a live card')
  assert.equal(taskStandin(liveSound, []), false, 'no stand-in sound exists until the stand-in sounds are made')
  assert.equal(taskStandin(liveSound, [{ order: 105, status: 'todo' }]), false)
  assert.equal(taskStandin(liveSound, [{ order: 105, status: 'done', deleted: true }]), false)
  assert.equal(taskStandin(TIMELINE_TASKS.find(t => t.order === 144), []), true, 'the paper stand-ins need nothing first')
  for (const l of STANDIN_LISTS) assert.ok(AREAS[l], l)
  for (const l of ['motive_notes', 'smalltalk', 'achievements', 'act_scripts', 'scenarios', 'bag_items']) assert.ok(!STANDIN_LISTS.has(l), `${l} has no stand-in`)
  const items = timelineItems({})
  assert.ok(items.filter(i => i.kind === 'decision').every(i => i.when === 'now' && !i.standin))
})

test('the stand-ins the page claims are really in the code', () => {
  const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8')
  const play = read('../../play/src/lib/content.js')
  const deal = read('../../functions/lib/deal.js')
  const screen = read('../../functions/lib/screen.js')
  const where = {
    ui_copy: [play, 'export const DEFAULT_UI'], station_text: [deal, 'export const STATION_TEXT'], study_lines: [play, 'export const DEFAULT_STUDY_LINES'],
    rules_text: [play, 'export const DEFAULT_RULES'], status_lines: [play, 'export const DEFAULT_STATUS'],
    openers: [screen, 'DEFAULT_IRWIN.opener'], closers: [screen, 'DEFAULT_IRWIN.closer'],
    role_cards: [deal, 'ROLE_CARDS.MURDERER'], epilogue_frames: [read('../../functions/lib/finale.js'), 'export const DEFAULT_EPILOGUE'],
    bios: [play, 'return character.bio'], npc_cards: [play, '${cat.name}, ${cat.tag}. ${cat.blurb}'],
  }
  assert.deepEqual(Object.keys(where).sort(), [...STANDIN_LISTS].sort(), 'every stand-in list has a place to check')
  for (const [list, [src, needle]] of Object.entries(where)) assert.ok(src.includes(needle), `${list}: ${needle}`)
  for (const key of ['meet', 'introduce', 'ready', 'orient', 'news', 'checkin', 'down', 'bulletin', 'roam', 'irwin', 'door', 'eyes']) assert.match(deal, new RegExp(`^  ${key}: \\{ title:`, 'm'), `NOTICE ${key.toUpperCase()} has a default`)
})

test('Claude’s or Jenna’s cards never count as needing Jon', () => {
  assert.equal(taskNotYou({ who: 'Claude' }), true)
  assert.equal(taskNotYou({ who: 'Claude Code' }), true)
  assert.equal(taskNotYou({ who: 'Claude chat' }), true)
  assert.equal(taskNotYou({ who: 'Jenna' }), true)
  assert.equal(taskNotYou({ who: 'Susan' }), false, 'only Claude’s and Jenna’s cards are someone else’s')
  assert.equal(taskNotYou({ who: 'Jon and Claude' }), false)
  assert.equal(taskNotYou({ who: 'Jon' }), false)
  assert.equal(taskNotYou({}), false, 'a card Jon adds is his')
  const mine = { kind: 'task', status: { done: false }, standin: false, notYou: false }
  const claudes = { kind: 'task', status: { done: false }, standin: false, notYou: true }
  const covered = { kind: 'task', status: { done: false }, standin: true, notYou: false }
  const p = bucketProgress([claudes, covered, mine])
  assert.deepEqual([p.left, p.standin, p.others, p.needsYou], [3, 1, 1, 1])
  assert.equal(p.first, mine, 'the pointer skips stand-ins and other people’s cards')
})

test('Press Freeze is later, so the pointer never sends Jon to freeze early', () => {
  const freeze = TIMELINE_TASKS.find(t => t.title === 'Press Freeze')
  const { when, ...live } = freeze
  assert.equal(taskWhen(live), 'later')
  const tasks = ALL_TIMELINE_TASKS.map((t, i) => ({ ...t, id: `t${i}`, when: undefined, standin: undefined, status: t.moment === 'freeze' && t.order !== 104 ? 'done' : 'todo' }))
  const p = timelineProgress({ tasks })
  assert.notEqual(p.now.first?.task?.title, 'Press Freeze')
})

test('the rules stand-in holds only while the list is empty', () => {
  const rules = { list: 'rules_text' }
  const empty = timelineItems({}).find(i => i.kind === 'need' && i.need.list === 'rules_text')
  assert.equal(empty.standin, true)
  const one = timelineItems({ areas: { rules_text: [{ text: 'A rule — its words', deleted: false }] } }).find(i => i.kind === 'need' && i.need.list === 'rules_text')
  assert.equal(one.standin, false, 'one rule written replaces all eight of the phone’s own, so it needs finishing')
  assert.equal(listStatus(rules, []).done, false)
})

test('the stand-in sounds card is added once, under Before the freeze', () => {
  const add = ADDITIONS.find(a => a.id === '2026-10-22-standin-sounds')
  assert.ok(add)
  assert.deepEqual(add.tasks, STANDIN_SOUND_TASKS)
  assert.ok(STANDIN_SOUND_TASKS.every(t => t.moment === 'freeze' && taskWhen(t) === 'now' && !taskStandin(t)))
  const timeline = ADDITIONS.find(a => a.id === '2026-10-22-night-timeline')
  assert.ok(!timeline.tasks.some(t => STANDIN_SOUND_TASKS.some(x => x.order === t.order)), 'never seeded twice')
})

// ---- the audit, 23 Oct 2026 ------------------------------------------------

const before = (id) => [...tasksFile.tasks, ...ADDITIONS.filter(a => a.id !== id).flatMap(a => a.tasks ?? [])]
const audit = () => ADDITIONS.find(a => a.id === '2026-10-23-audit')

test('the audit migration: its cards are new and numbered from 300, the cards it settles were on the board by number and title', () => {
  const add = audit()
  assert.ok(add, 'the migration is there')
  assert.ok(ADDITIONS.indexOf(add) < ADDITIONS.findIndex(a => a.id === '2026-10-23-secret-lines'), 'before the secret lines one')
  assert.ok(add.tasks === AUDIT_TASKS && add.decisions === AUDIT_DECISIONS)
  const earlier = before(add.id)
  for (const t of AUDIT_TASKS) {
    assert.ok(t.order >= 300, `${t.title}: numbered from 300`)
    assert.ok(!earlier.some(e => e.order === t.order), `order ${t.order} is new`)
    assert.ok(OWNERS.includes(t.who), `${t.title}: ${t.who} is one of the owners`)
    if (t.by) assert.match(t.by, /^2026-1[01]-\d{2}$/, `${t.title}: a date before the party`)
  }
  for (const r of [...RETIRED_FOR_AUDIT, ...FILED_FOR_AUDIT]) {
    const card = earlier.find(e => e.order === r.order)
    assert.ok(card, `card ${r.order} was on the board`)
    assert.equal(r.title, card.title, `card ${r.order} is matched by its title too`)
  }
  const keys = new Set([...tasksFile.decisions, ...ADDITIONS.flatMap(a => a.decisions ?? [])].map(d => d.key))
  for (const key of [...Object.keys(FILED_DECISIONS_FOR_AUDIT), ...Object.keys(ANSWERED_FOR_AUDIT)]) assert.ok(keys.has(key), `${key} is a decision`)
  for (const m of Object.values(FILED_DECISIONS_FOR_AUDIT)) assert.ok(MOMENT_KEYS.includes(m), m)
  for (const f of FILED_FOR_AUDIT) if (f.moment) assert.ok(MOMENT_KEYS.includes(f.moment), f.moment)
})

test('the audit leaves Jon’s open questions open, and the two it settles by default say so and can be changed', () => {
  const open = ['secretLines', 'newsVideo', 'stewardPictures', 'partnerAwards', 'diningName', 'rulesDeckScreen', 'tidyFolders']
  for (const key of open) {
    const d = AUDIT_DECISIONS.find(x => x.key === key)
    assert.ok(d, key)
    assert.equal(d.answer, null, `${key} is Jon’s to answer`)
    assert.ok(!(key in ANSWERED_FOR_AUDIT), `${key} is not answered for him`)
  }
  for (const key of ['bagsAct4', 'handOn', 'tutorial8', 'swapMotive']) assert.ok(!(key in ANSWERED_FOR_AUDIT), `${key} stays open`)
  const granolia = AUDIT_DECISIONS.find(d => d.key === 'act4Granolia')
  assert.equal(granolia.answer, 'Skip Granolia in Act 4 (she is in the Study)')
  for (const d of AUDIT_DECISIONS.filter(x => x.answer != null)) {
    assert.ok(d.options.includes(d.answer), `${d.key}: the answer is one of its options, so Jon can pick the other`)
    assert.match(d.note, /may change it/)
  }
  assert.equal(ANSWERED_FOR_AUDIT.ipadDinner, TIMELINE_DECISIONS.find(d => d.key === 'ipadDinner').options[0])
})

test('the audit on a pretend board: stale cards done with the reason, the secrets before the freeze with dates, every open decision filed, once only', () => {
  let n = 0
  const newId = () => `id${++n}`
  let state = { applied: [], areas: {}, decisions: Object.fromEntries(tasksFile.decisions.map(d => [d.key, { ...d }])), tasks: tasksFile.tasks.map(t => ({ ...t, id: newId() })) }
  for (const add of ADDITIONS.slice(0, ADDITIONS.findIndex(a => a.id === '2026-10-23-audit'))) state = applyPlan(planAddition(add, state, { newId, now: 1 }), state)
  // Jon has added a card by hand that shares a number with one the audit settles
  state = { ...state, tasks: [...state.tasks, { id: 'jon', order: 206, status: 'todo', title: 'Buy markers', moment: 'act6.drawing' }] }
  // and answered one of the decisions himself
  state = { ...state, decisions: { ...state.decisions, eventDeck: { ...state.decisions.eventDeck, answer: 'Shared menu + merge table' } } }
  const add = audit()
  const after = applyPlan(planAddition(add, state, { newId, now: 2 }), state)
  const card = (order, title) => after.tasks.find(t => t.order === order && (!title || t.title === title))
  for (const r of RETIRED_FOR_AUDIT) {
    const t = card(r.order, r.title)
    assert.equal(t.status, 'done', `card ${r.order} retired`)
    assert.ok(t.detail.endsWith(r.detail), `card ${r.order} says why`)
  }
  assert.equal(after.tasks.find(t => t.id === 'jon').status, 'todo', 'Jon’s own card is never ticked off')
  const dated = { 110: '2026-10-31', 111: '2026-10-31', 112: '2026-10-31', 214: '2026-10-31', 113: '2026-11-05' }
  for (const [order, by] of Object.entries(dated)) {
    const t = card(Number(order))
    assert.equal(t.moment, 'freeze', `card ${order} is before the freeze`)
    assert.equal(t.by, by, `card ${order} is due ${by}`)
  }
  assert.ok(card(215).detail.endsWith('Then ask Claude Code to deploy, so the photo reaches the screens.'))
  assert.equal(card(300).by, '2026-11-06', 'the last deploy, Friday 6 November')
  assert.equal(after.decisions.ipadDinner.answer, 'Captions in the orangery')
  assert.equal(after.decisions.eventDeck.answer, 'Shared menu + merge table', 'an answer Jon gave is never changed')
  assert.equal(after.decisions.scoring.moment, 'act7.result')
  for (const d of AUDIT_DECISIONS) assert.equal(after.decisions[d.key].moment, d.moment)
  const lost = unfiled({ tasks: after.tasks.filter(t => t.id !== 'jon'), decisions: Object.entries(after.decisions).map(([key, d]) => ({ ...d, key })) })
  assert.deepEqual(lost.decisions.map(d => d.key), [], 'every open decision has a place on the night')
  assert.ok(!lost.tasks.some(t => t.order === 27), 'the Steward view card is done, not lost')
  const again = applyPlan(planAddition(add, after, { newId, now: 3 }), after)
  assert.deepEqual(again.tasks, after.tasks, 'never twice')
})

test('the secret lines migration: Jon’s answer recorded, the secret-set cards done with the reason, three new cards, once only', () => {
  let n = 0
  const newId = () => `id${++n}`
  let state = { applied: [], areas: {}, decisions: Object.fromEntries(tasksFile.decisions.map(d => [d.key, { ...d }])), tasks: tasksFile.tasks.map(t => ({ ...t, id: newId() })) }
  const at = ADDITIONS.findIndex(a => a.id === '2026-10-23-secret-lines')
  assert.ok(at > ADDITIONS.findIndex(a => a.id === '2026-10-23-audit'), 'after the audit')
  for (const add of ADDITIONS.slice(0, at)) state = applyPlan(planAddition(add, state, { newId, now: 1 }), state)
  const before = state
  const add = ADDITIONS[at]
  const after = applyPlan(planAddition(add, state, { newId, now: 2 }), state)
  const card = (order, title) => after.tasks.find(t => t.order === order && t.title === title)
  for (const r of RETIRED_FOR_SECRET_LINES) {
    assert.ok(before.tasks.some(t => t.order === r.order && t.title === r.title && t.status !== 'done'), `card ${r.order} was open on the board`)
    const t = card(r.order, r.title)
    assert.equal(t.status, 'done', `card ${r.order} retired`)
    assert.ok(t.detail.endsWith(r.detail), `card ${r.order} says why`)
  }
  for (const f of FILED_FOR_SECRET_LINES) assert.ok(card(f.order, f.title).detail.endsWith(f.note), `card ${f.order} gets its note`)
  const orders = new Set(ALL_TIMELINE_TASKS.filter(t => !SECRET_LINES_TASKS.includes(t)).map(t => t.order))
  for (const t of SECRET_LINES_TASKS) {
    assert.ok(!orders.has(t.order), `card ${t.order} is new`)
    assert.ok(MOMENT_KEYS.includes(t.moment), t.moment)
    assert.ok(OWNERS.includes(t.who), t.who)
    assert.equal(card(t.order, t.title).status, 'todo')
    if (t.by) assert.match(t.by, /^2026-1[01]-\d{2}$/)
    assert.ok(!/secret/i.test(`${t.title} ${t.detail}`), `card ${t.order} never sends anyone to the secrets`)
  }
  assert.equal(after.decisions.secretLines.answer, 'Retire them')
  assert.equal(after.decisions.act2Safe.answer, 'Take it out')
  assert.ok(SECRET_LINES_DECISIONS[0].options.includes('Take it out'))
  assert.ok(MOMENT_KEYS.includes(after.decisions.act2Safe.moment))
  const left = after.tasks.filter(t => !t.deleted && t.status !== 'done')
  assert.ok(!left.some(t => /secret/i.test(t.title)), 'no open card is about the secret sets')
  const answered = { ...before, decisions: { ...before.decisions, secretLines: { ...before.decisions.secretLines, answer: 'Keep them as extra clues' } } }
  const kept = applyPlan(planAddition(add, answered, { newId, now: 2 }), answered)
  assert.equal(kept.decisions.secretLines.answer, 'Keep them as extra clues', 'an answer already on the board is never changed')
  const again = applyPlan(planAddition(add, after, { newId, now: 3 }), after)
  assert.deepEqual(again.tasks, after.tasks, 'never twice')
})

test('who: the owners, a card with no name is Jon’s, the old Claude cards are Claude Code’s, and the counts skip done and removed cards', () => {
  assert.deepEqual(OWNERS, ['Jon', 'Susan', 'Jon and Susan', 'Jenna', 'Claude Code', 'Claude chat'])
  assert.equal(ownerOf({}), 'Jon')
  assert.equal(ownerOf({ who: 'Claude' }), 'Claude Code')
  assert.equal(ownerOf({ who: 'claude chat' }), 'Claude chat')
  assert.equal(ownerOf({ who: 'Jon and Claude' }), 'Jon')
  assert.equal(ownerOf({ who: ' Jon  and Susan ' }), 'Jon and Susan')
  const tasks = [{ who: 'Jon', status: 'todo' }, { status: 'todo' }, { who: 'Susan', status: 'done' }, { who: 'Jenna', status: 'todo', deleted: true }, { who: 'Claude Code', status: 'doing' }]
  const counts = leftByOwner(tasks)
  assert.deepEqual([counts.Jon, counts.Susan, counts.Jenna, counts['Claude Code']], [2, 0, 0, 1])
  assert.equal(leftLine(counts), 'What is left: 2 for you and 1 for Claude Code.')
  assert.equal(leftLine(leftByOwner([])), 'Nothing is left on the board.')
  assert.equal(leftLine({ Jon: 1, 'Jon and Susan': 2, Jenna: 3 }), 'What is left: 1 for you, 2 for you and Susan together and 3 for Jenna.')
  for (const t of AUDIT_TASKS) assert.equal(taskNotYou(t), !['Jon', 'Susan', 'Jon and Susan'].includes(t.who), t.title)
})

test('by dates: shown in plain words, and Jon’s next three put the dated cards first, then the night in order', () => {
  assert.equal(byLabel({ by: '2026-10-31' }), 'by Sat 31 Oct')
  assert.equal(byLabel({ by: '2026-11-06' }), 'by Fri 6 Nov')
  assert.equal(byLabel({ by: 'soon' }), '')
  assert.equal(taskBy({ by: null }), null)
  const tasks = [
    { id: 'a', who: 'Jon', status: 'todo', moment: 'act2.cat', order: 1 },
    { id: 'b', who: 'Jon', status: 'todo', moment: 'act7.result', order: 2, by: '2026-11-05' },
    { id: 'c', who: 'Jon and Susan', status: 'todo', moment: 'freeze', order: 3, by: '2026-10-30' },
    { id: 'd', who: 'Jenna', status: 'todo', moment: 'freeze', order: 4, by: '2026-10-24' },
    { id: 'e', who: 'Jon', status: 'todo', moment: 'setup', order: 5 },
    { id: 'f', who: 'Jon', status: 'done', moment: 'freeze', order: 6, by: '2026-10-24' },
    { id: 'g', who: 'Jon', status: 'todo', moment: 'act1.arrive', order: 7 },
  ]
  assert.deepEqual(nextCards(tasks).map(t => t.id), ['c', 'b', 'g'], 'dated first; then now before later; never someone else’s or a done card')
  assert.deepEqual(nextCards(tasks, ['Jenna'], 5).map(t => t.id), ['d'])
  const row = timelineItems({ tasks: [{ id: 'p', moment: 'freeze', status: 'todo', order: 1 }, { id: 'q', moment: 'freeze', status: 'todo', order: 9, by: '2026-11-06' }, { id: 'r', moment: 'freeze', status: 'todo', order: 5, by: '2026-10-31' }] })
  assert.deepEqual(row.filter(i => i.kind === 'task').map(i => i.task.id), ['r', 'q', 'p'], 'under a moment, the dated cards come first, soonest first')
})

test('not filed yet: open cards and decisions with no moment, or a moment that is gone, and the picker offers every moment', () => {
  const tasks = [{ id: 'a', status: 'todo', order: 2 }, { id: 'b', status: 'todo', moment: 'act6.parlour', order: 1 }, { id: 'c', status: 'done' }, { id: 'd', status: 'todo', moment: 'freeze' }, { id: 'e', status: 'todo', deleted: true }]
  const decisions = [{ key: 'x', answer: null }, { key: 'y', answer: 'Yes' }, { key: 'z', answer: null, moment: 'act2.cat' }]
  const lost = unfiled({ tasks, decisions })
  assert.deepEqual(lost.tasks.map(t => t.id), ['b', 'a'], 'Act 6 has no random-time games row any more, so a card filed there is lost too')
  assert.deepEqual(lost.decisions.map(d => d.key), ['x'])
  assert.deepEqual(momentOptions().map(o => o.key), MOMENT_KEYS)
  assert.ok(momentOptions().every(o => o.name))
})
