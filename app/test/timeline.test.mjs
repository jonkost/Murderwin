import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import night from '../../seed/night.json' with { type: 'json' }
import tasksFile from '../../seed/tasks.json' with { type: 'json' }
import { AREAS, ADDITIONS, UI_LABELS, COUNTED_UI_LABELS, STATION_LABELS, TAB_KINDS } from '../src/lib/content.js'
import { TIMELINE, NEEDS, MOMENT_KEYS, TIMELINE_LISTS, STANDIN_LISTS, momentName, nightTimeline, timelineItems, timelineProgress, bucketProgress, listStatus, taskWhen, taskStandin, taskNotYou, OWNERS, ownerOf, taskBy, byLabel, leftByOwner, leftLine, nextCards, unfiled, momentOptions, openDecisions, decisionsForJon, isRetiredDecision, RETIRED_MOMENT, firstSentence } from '../src/lib/timeline.js'
import { TIMELINE_TASKS, TIMELINE_DECISIONS, RETIRED_FOR_TIMELINE, STANDIN_SOUND_TASKS, ALL_TIMELINE_TASKS, HANDOFF_TASKS, RETIRED_FOR_HANDOFF, HANDOFF_BUILT_TASKS, RETIRED_FOR_BUILT, AUDIT_TASKS, RETIRED_FOR_AUDIT, FILED_FOR_AUDIT, AUDIT_DECISIONS, FILED_DECISIONS_FOR_AUDIT, ANSWERED_FOR_AUDIT, SECRET_LINES_TASKS, SECRET_LINES_DECISIONS, RETIRED_FOR_SECRET_LINES, FILED_FOR_SECRET_LINES, CLEANUP_TASKS, CLEANUP_DECISIONS, RETIRED_FOR_CLEANUP, REWRITTEN_FOR_CLEANUP, REFILED_FOR_CLEANUP, NEWS_CAST_TASKS, RETIRED_FOR_NEWS_CAST, FILED_FOR_NEWS_CAST, REWRITTEN_FOR_NEWS_CAST, ANSWERED_FOR_NEWS_CAST, FILED_DECISIONS_FOR_NEWS_CAST, REFILED_FOR_NEWS_CAST, SUPERSEDED_FOR_NEWS_CAST, ITEM4_TASKS, RETIRED_FOR_ITEM4, ITEM4_DECISIONS } from '../src/lib/timelineTasks.js'
import { planAddition, applyPlan } from '../src/lib/additions.js'

// The night, in order: every beat has a place, every list and label is
// filed once, and every task points at a real moment. Safe content only.

const allNeeds = () => TIMELINE.flatMap(s => [...s.needs, ...s.rows.flatMap(r => r.needs)])
const counted = () => allNeeds().filter(n => !n.also)

test('every beat of every act, and every Act 4 room, has a row, in night order', () => {
  for (const [n, act] of Object.entries(night.acts)) {
    if (n === '4') continue
    for (const b of act.beats) assert.ok(MOMENT_KEYS.includes(`act${n}.${b.key}`), `act${n}.${b.key}`)
  }
  for (const k of ['warn', 'groups', 'study', 'puzzle', 'orangerie', 'entryway', 'checkin']) assert.ok(MOMENT_KEYS.includes(`act4.${k}`), `act4.${k}`)
  assert.ok(!MOMENT_KEYS.some(k => /^act4\.round/.test(k)), 'the rounds are the clock, not places')
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
  for (const [list, labels] of [['ui_copy', COUNTED_UI_LABELS]]) {
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
  for (const d of [...TIMELINE_DECISIONS, ...AUDIT_DECISIONS, ...CLEANUP_DECISIONS]) {
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
  const sounds = ALL_TIMELINE_TASKS.filter(t => t.title.startsWith('Sound: ')).map(t => t.title.slice(7))
  assert.deepEqual([...sounds].sort(), [...ids].sort())
  for (const t of ALL_TIMELINE_TASKS.filter(x => x.title.startsWith('Sound: '))) {
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

test('the timeline follows night.json: a renamed beat or room shows up by itself', () => {
  const file = structuredClone(night)
  file.act4.rooms.study = 'Renamed room'
  file.acts['4'].beats[0].name = 'Renamed warning'
  file.acts['2'].beats.push({ key: 'extra', name: 'Extra', what: 'x' })
  const t = nightTimeline(file)
  assert.equal(t.find(s => s.key === 'act4').rows.find(r => r.key === 'act4.study').what, 'Renamed room')
  assert.equal(t.find(s => s.key === 'act4').rows.find(r => r.key === 'act4.warn').name, 'Renamed warning')
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
    ui_copy: [play, 'export const DEFAULT_UI'], study_lines: [play, 'export const DEFAULT_STUDY_LINES'],
    rules_text: [play, 'export const DEFAULT_RULES'], status_lines: [play, 'export const DEFAULT_STATUS'],
    openers: [screen, 'DEFAULT_IRWIN.opener'], closers: [screen, 'DEFAULT_IRWIN.closer'],
    role_cards: [deal, 'ROLE_CARDS.MURDERER'], epilogue_frames: [read('../../functions/lib/finale.js'), 'export const DEFAULT_EPILOGUE'],
    bios: [play, 'return character.bio'], npc_cards: [play, '${cat.name}, ${cat.tag}. ${cat.blurb}'],
  }
  assert.deepEqual(Object.keys(where).sort(), [...STANDIN_LISTS].sort(), 'every stand-in list has a place to check')
  for (const [list, [src, needle]] of Object.entries(where)) assert.ok(src.includes(needle), `${list}: ${needle}`)
  for (const key of ['meet', 'introduce', 'ready', 'orient', 'news', 'peek', 'down', 'bulletin', 'roam', 'irwin', 'door', 'eyes']) assert.match(deal, new RegExp(`^  ${key}: \\{ title:`, 'm'), `NOTICE ${key.toUpperCase()} has a default`)
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

test('the 24 Oct migration: built cards done, replaced cards retired with the reason, defaults answered, stray decisions refiled', () => {
  const add = ADDITIONS.find(a => a.id === '2026-10-24-handoff-1023')
  assert.ok(add, 'the addition exists')
  const old = [104, 300, 302, 303, 314, 327, 331].map(order => ({ id: `t${order}`, order, status: 'todo', title: ALL_TIMELINE_TASKS.find(t => t.order === order)?.title ?? '', detail: 'old' }))
  const state = {
    applied: [], areas: {}, tasks: old,
    decisions: {
      newsVideo: { key: 'newsVideo', answer: null }, bagsAct4: { key: 'bagsAct4', answer: null, moment: 'act4.bags' },
      act4Granolia: { key: 'act4Granolia', answer: 'Skip Granolia in Act 4 (she is in the Study)', moment: 'act4.cat' },
      dialMapping: { key: 'dialMapping', answer: 'Build the blind mapping' },
    },
  }
  const plan = planAddition(add, state, { newId: () => 'x', now: 1 })
  const patched = Object.fromEntries(plan.taskPatches.map(p => [p.id, p.patch]))
  for (const t of old) assert.equal(patched[t.id]?.status, 'done', `card ${t.order} retired`)
  assert.equal(plan.decisionPatches.newsVideo.answer, 'Video on the TV')
  assert.ok(!plan.decisionPatches.dialMapping, 'an answer Jon gave is never overwritten')
  assert.equal(plan.decisionPatches.bagsAct4.moment, 'act2.cat')
  assert.equal(plan.decisionPatches.act4Granolia.moment, 'act4.groups')
  assert.ok(plan.tasks.some(t => t.title === 'Put the game names in the game' && t.status === 'done' && t.who === 'Claude Code'))
  assert.ok(plan.tasks.some(t => t.title === 'Sound: chime-phone' && t.moment === 'act2.supper'))
})

// ---- the board made plain, 24 Oct 2026 --------------------------------------

// The pretend board as the live one stands: the seed, then every migration.
function boardThrough(id) {
  let n = 0
  const newId = () => `id${++n}`
  let state = { applied: [], areas: {}, decisions: Object.fromEntries(tasksFile.decisions.map(d => [d.key, { ...d }])), tasks: tasksFile.tasks.map(t => ({ ...t, id: newId() })) }
  const at = ADDITIONS.findIndex(a => a.id === id)
  for (const add of ADDITIONS.slice(0, at)) state = applyPlan(planAddition(add, state, { newId, now: 1 }), state)
  return { before: state, add: ADDITIONS[at], newId }
}
const decisionList = (state) => Object.entries(state.decisions).map(([key, d]) => ({ ...d, key }))

test('the cleanup migration: its new cards are new and plain, and every card it closes or rewrites is on the board by number and title', () => {
  const { before, add } = boardThrough('2026-10-24-cleanup')
  assert.equal(add.id, '2026-10-24-cleanup')
  assert.equal(ADDITIONS[ADDITIONS.indexOf(add) + 1]?.id, '2026-10-24-news-cast', 'followed only by the news cast, the same evening')
  assert.ok(add.tasks === CLEANUP_TASKS && add.decisions === CLEANUP_DECISIONS && add.retireTasks === RETIRED_FOR_CLEANUP && add.rewriteTasks === REWRITTEN_FOR_CLEANUP && add.refileDecisions === REFILED_FOR_CLEANUP)
  const earlier = new Set(before.tasks.map(t => t.order))
  for (const t of CLEANUP_TASKS) {
    assert.ok(t.order >= 460 && t.order < 500, `${t.title}: numbered from 460`)
    assert.ok(!earlier.has(t.order), `order ${t.order} is new`)
    assert.ok(OWNERS.includes(t.who) || t.who === 'Jon and Claude Code', `${t.title}: ${t.who}`)
    if (t.by) assert.match(t.by, /^2026-1[01]-\d{2}$/)
    assert.ok(!/terminal|npm |\.env|living room|orangery|the freeze/i.test(`${t.title} ${t.detail}`), `${t.title}: plain words, the line itself under tech`)
    assert.ok(!String(t.tech ?? '').includes('—'))
  }
  for (const r of [...RETIRED_FOR_CLEANUP, ...REWRITTEN_FOR_CLEANUP]) {
    assert.ok(before.tasks.some(t => t.order === r.order && t.title === r.title && t.status !== 'done' && !t.deleted), `card ${r.order} (${r.title}) is open on the board`)
  }
  for (const r of REWRITTEN_FOR_CLEANUP) {
    if (r.set.moment) assert.ok(MOMENT_KEYS.includes(r.set.moment), r.set.moment)
    if (r.set.who) assert.ok(OWNERS.includes(r.set.who), r.set.who)
    for (const k of ['title', 'detail', 'tech']) assert.ok(!String(r.set[k] ?? '').includes('—'), `card ${r.order}.${k}`)
  }
  assert.equal(new Set(REWRITTEN_FOR_CLEANUP.map(r => r.order)).size, REWRITTEN_FOR_CLEANUP.length, 'one rewrite per card')
  for (const [key, r] of Object.entries(REFILED_FOR_CLEANUP)) {
    assert.equal(before.decisions[key]?.moment, r.from, `${key} is filed under ${r.from}`)
    assert.ok(r.to === RETIRED_MOMENT || MOMENT_KEYS.includes(r.to), r.to)
  }
  for (const d of CLEANUP_DECISIONS) assert.ok(!before.decisions[d.key], `${d.key} is a new question`)
})

test('the cleanup on a pretend board: the done cards closed, the old words gone from every open card of Jon’s, once only', () => {
  const { before, add, newId } = boardThrough('2026-10-24-cleanup')
  // Jon has added a card by hand that shares a number with one the cleanup rewrites
  const state = { ...before, tasks: [...before.tasks, { id: 'jon', order: 301, status: 'todo', title: 'Buy a TV stand', detail: 'For the living room.' }] }
  const after = applyPlan(planAddition(add, state, { newId, now: 2 }), state)
  const card = (order) => after.tasks.find(t => t.order === order && t.id !== 'jon')
  for (const r of RETIRED_FOR_CLEANUP) {
    assert.equal(card(r.order).status, 'done', `card ${r.order} closed`)
    assert.ok(card(r.order).detail.endsWith(r.detail), `card ${r.order} says why`)
  }
  for (const r of REWRITTEN_FOR_CLEANUP) {
    const t = card(r.order)
    for (const [k, v] of Object.entries(r.set)) assert.deepEqual(t[k], v, `card ${r.order}.${k}`)
    assert.ok(t.previous?.[add.id], `card ${r.order} keeps the words it had`)
  }
  assert.equal(after.tasks.find(t => t.id === 'jon').detail, 'For the living room.', 'Jon’s own card is never rewritten')
  const open = after.tasks.filter(t => !t.deleted && t.status !== 'done' && t.id !== 'jon')
  const jons = open.filter(t => ['Jon', 'Jon and Susan', 'Susan', 'Jenna'].includes(ownerOf(t)))
  for (const t of jons) {
    assert.ok(!/terminal|npm |\.env|kiosk=|living room|orangery|crookshank|the freeze|nine sounds|deploy|seed\/|play\/public/i.test(`${t.title} ${t.detail ?? ''}`), `card ${t.order} (${t.title}) is in plain words`)
  }
  assert.ok(!open.some(t => /^(Deploy before the practice game|Make the packing list|Make the stand-in sounds on the brain|Finish the lists the leans and the packing read)$/.test(t.title)), 'what is done is not shown as open')
  // the sound cards now count their simple tone, since the stand-ins are made
  for (const t of open.filter(x => x.title.startsWith('Sound: '))) assert.equal(taskStandin(t, after.tasks), true, t.title)
  // Jon's next three are real jobs: his own, nothing Claude Code would just run, the key word first
  const next = nextCards(after.tasks)
  assert.equal(next.length, 3)
  assert.ok(next.every(t => !['Deploy before the practice game', 'Finish the lists the leans and the packing read'].includes(t.title)))
  assert.ok(next.every(t => ['Jon', 'Jon and Susan'].includes(ownerOf(t)) && !/^Ask Claude Code/.test(t.title)), next.map(t => t.title).join(' | '))
  assert.ok(next.some(t => t.title === 'Save the study key word'), 'the key word the study station waits on is among them')
  assert.equal(ownerOf(card(111)), 'Claude Code')
  assert.equal(ownerOf(card(214)), 'Claude Code')
  // the study station: Claude Code's half and Jon's half are two cards, each with one owner
  assert.equal(card(474).who, 'Claude Code')
  assert.equal(card(464).who, 'Jon')
  assert.ok(!after.tasks.some(t => /claude code/i.test(t.who ?? '') && t.who !== 'Claude Code' && t.status !== 'done'), 'no shared owner hides a job from Claude Code')
  // teaching the taps waits on the M1 Air; the night's start buttons are a double-click, not a chat
  assert.equal(card(460).moment, 'freeze')
  assert.ok(card(460).by <= '2026-11-06' && card(474).by < card(460).by)
  for (const order of [121, 122]) assert.match(card(order).detail, /double-click Start the (brain|study) on its desktop/i)
  assert.ok(card(475).by <= '2026-11-06', 'the desktop buttons come before the first full tech run')
  // the decisions
  const ds = decisionList(after)
  assert.ok(isRetiredDecision(after.decisions.act4Granolia), 'act4Granolia is retired')
  assert.ok(!timelineItems({ decisions: ds }).some(i => i.kind === 'decision' && i.decision.key === 'act4Granolia'), 'and the night never shows it')
  assert.equal(after.decisions.tidyFolders.who, 'Claude Code')
  assert.equal(after.decisions.tidyFolders.answer, null, 'still Jon’s to answer, when Claude Code asks')
  assert.ok(openDecisions(ds).some(d => d.key === 'tidyFolders') && !decisionsForJon(ds).some(d => d.key === 'tidyFolders'))
  assert.equal(after.decisions.ipadDinner.answer, 'Captions in the Orangerie', 'the answer follows its renamed option')
  assert.ok(after.decisions.rulesDeckScreen.options[0].startsWith('The Parlour TV'))
  assert.equal(after.decisions.granoliaIntro.moment, 'act4.study')
  assert.ok(decisionsForJon(ds).some(d => d.key === 'granoliaIntro'))
  assert.ok(decisionsForJon(ds).some(d => d.key === 'worstDial'), 'the worst-dial check is a question on the board, not only a line on Where we are')
  assert.ok(!/repo|solving-the-case|handoff bundle/i.test(after.decisions.tidyFolders.question), 'tidyFolders in plain words')
  for (const d of ds) assert.ok(!/living room|orangery/i.test(`${d.question} ${(d.options ?? []).join(' ')}`) || d.answer != null && isRetiredDecision(d), `${d.key} is in today’s words`)
  const again = applyPlan(planAddition(add, after, { newId, now: 3 }), after)
  assert.deepEqual(again.tasks, after.tasks, 'never twice')
})

test('decisions: a retired one is never shown or lost, one with an owner is not Jon’s, and the pointer skips it', () => {
  const decisions = [
    { key: 'a', moment: 'act2.cat', answer: null },
    { key: 'b', moment: RETIRED_MOMENT, retired: true, answer: null },
    { key: 'c', moment: 'freeze', answer: null, who: 'Claude Code' },
    { key: 'd', moment: 'act1.arrive', answer: 'Yes' },
  ]
  assert.deepEqual(openDecisions(decisions).map(d => d.key), ['c', 'a'], 'open ones, in the order of the night')
  assert.deepEqual(decisionsForJon(decisions).map(d => d.key), ['a'])
  assert.deepEqual(unfiled({ decisions }).decisions, [], 'a retired decision is not waiting to be placed')
  const items = timelineItems({ decisions }).filter(i => i.kind === 'decision')
  assert.deepEqual(items.map(i => i.decision.key), ['c', 'd', 'a'], 'in night order, and never the retired one')
  assert.equal(items.find(i => i.decision.key === 'c').notYou, true)
  assert.equal(bucketProgress(items).first.decision.key, 'a', 'the next thing for Jon is never Claude Code’s question')
  assert.equal(firstSentence('One thing. Then another.'), 'One thing.')
  assert.equal(firstSentence('No full stop'), 'No full stop')
})

// ---- the news team cast, 24 Oct 2026, evening --------------------------------

// The six questions Jon answered on 31 August, as the live board has them:
// one of their old options each, which later decisions replaced.
const AUGUST_ANSWERS = { acts35: 'Design session with Claude', affectionEconomy: 'Static — profession-seeded only', salemSgtMajor: 'Include', eventDeck: 'Shared menu + merge table', scoring: 'All-three-or-nothing + gag superlatives', clueChannels: 'Cat sightings layer' }

test('the news-cast migration: its four cards new and plain, every card it touches open on the board by number and title', () => {
  const { before, add } = boardThrough('2026-10-24-news-cast')
  assert.equal(ADDITIONS[ADDITIONS.indexOf(add) + 1]?.id, '2026-10-25-item4', 'followed by the item 4 build, the next day')
  assert.ok(add.tasks === NEWS_CAST_TASKS && add.retireTasks === RETIRED_FOR_NEWS_CAST && add.fileTasks === FILED_FOR_NEWS_CAST && add.rewriteTasks === REWRITTEN_FOR_NEWS_CAST && add.answerDecisions === ANSWERED_FOR_NEWS_CAST && add.fileDecisions === FILED_DECISIONS_FOR_NEWS_CAST && add.refileDecisions === REFILED_FOR_NEWS_CAST && add.supersedeDecisions === SUPERSEDED_FOR_NEWS_CAST)
  assert.equal(add.decisions, undefined, 'no second worst-dial question, and no new question at all')
  const earlier = new Set(before.tasks.map(t => t.order))
  for (const t of NEWS_CAST_TASKS) {
    assert.ok(t.order >= 476 && t.order < 500, `${t.title}: numbered from 476`)
    assert.ok(!earlier.has(t.order), `order ${t.order} is new`)
    assert.ok(OWNERS.includes(t.who), `${t.title}: ${t.who}`)
    assert.ok(MOMENT_KEYS.includes(t.moment), t.moment)
    for (const k of ['title', 'detail']) assert.ok(!String(t[k]).includes('—'), `${t.title}.${k}`)
  }
  for (const r of [...RETIRED_FOR_NEWS_CAST, ...FILED_FOR_NEWS_CAST, ...REWRITTEN_FOR_NEWS_CAST]) {
    assert.ok(before.tasks.some(t => t.order === r.order && t.title === r.title && t.status !== 'done' && !t.deleted), `card ${r.order} (${r.title}) is open on the board`)
  }
  for (const r of FILED_FOR_NEWS_CAST) assert.ok(!before.tasks.find(t => t.order === r.order && t.title === r.title).by, `card ${r.order} has no date yet`)
  const sounds = before.tasks.filter(t => t.title.startsWith('Sound: ') && !t.deleted)
  assert.equal(sounds.length, 10, 'the ten cue sounds')
  for (const t of sounds) assert.equal(FILED_FOR_NEWS_CAST.find(r => r.order === t.order)?.by, '2026-10-30', t.title)
  for (const r of REWRITTEN_FOR_NEWS_CAST) {
    if (r.set.who) assert.ok(OWNERS.includes(r.set.who), r.set.who)
    assert.ok(!r.set.detail.includes('—'), `card ${r.order}`)
  }
  for (const [key, r] of Object.entries(REFILED_FOR_NEWS_CAST)) {
    assert.equal(before.decisions[key]?.moment, r.from, `${key} is filed under ${r.from}`)
    assert.equal(before.decisions[key]?.answer, null, `${key} has no answer yet on a board seeded from the repo`)
    for (const k of ['question', 'note']) assert.ok(!String(r.set[k] ?? '').includes('—'), `${key}.${k}`)
  }
  // Jon's three answers that evening and the board's two older ones, each one of its question's options
  assert.deepEqual(Object.keys(ANSWERED_FOR_NEWS_CAST).sort(), ['bulletin2Known', 'bulletin2Voice', 'grossnola', 'swapMotive', 'worstDial'])
  for (const [key, answer] of Object.entries(ANSWERED_FOR_NEWS_CAST)) {
    const options = REFILED_FOR_NEWS_CAST[key]?.set.options ?? before.decisions[key].options
    assert.ok(options.includes(answer), `${key}: ${answer}`)
    if (REFILED_FOR_NEWS_CAST[key]) assert.match(REFILED_FOR_NEWS_CAST[key].set.note, /^Answered 24 Oct 2026/, `${key} says it is answered`)
  }
  for (const key of Object.keys(FILED_DECISIONS_FOR_NEWS_CAST)) assert.ok(before.decisions[key]?.moment, `${key} is already filed here, so filing it changes nothing`)
  for (const [key, line] of Object.entries(SUPERSEDED_FOR_NEWS_CAST)) {
    assert.ok(before.decisions[key], `${key} is on the board`)
    assert.match(line, /^Replaced \d/, key)
    assert.ok(!line.includes('—') && !/\n/.test(line), `${key}: one plain line`)
  }
  assert.deepEqual(Object.keys(SUPERSEDED_FOR_NEWS_CAST).sort(), Object.keys(AUGUST_ANSWERS).sort())
})

test('the news cast on a pretend board: the new cast and owners, the dates, the three answers, the 31 August answers replaced, once only', () => {
  const { before, add, newId } = boardThrough('2026-10-24-news-cast')
  const decisions = { ...before.decisions }
  for (const [key, answer] of Object.entries(AUGUST_ANSWERS)) decisions[key] = { ...decisions[key], answer, answeredBy: 'Jon', answeredAt: 0 }
  // Jon has dated one sound card himself
  const tasks = before.tasks.map(t => (t.title === 'Sound: blackout' ? { ...t, by: '2026-10-27' } : t))
  const state = { ...before, decisions, tasks }
  const after = applyPlan(planAddition(add, state, { newId, now: 2 }), state)
  const card = (order) => after.tasks.find(t => t.order === order && !t.deleted)
  // the recording cards: owners, dates and the cast
  assert.deepEqual([card(200).who, card(200).by], ['Susan', '2026-11-08'])
  assert.match(card(200).detail, /Susan reads the opening and the sign-off on camera as Ava Waves/)
  assert.deepEqual([card(203).who, card(203).by], ['Jon and Susan', '2026-11-08'])
  assert.match(card(203).detail, /Susan, as Ava Waves, opens and closes it in the studio; you, as Mic Cameron, do the four field parts/)
  assert.deepEqual([card(202).who, card(202).by], ['Susan', '2026-11-06'])
  assert.match(card(202).detail, /opening and the sign-off/)
  assert.equal(card(201).by, '2026-11-08', 'the news graphics')
  for (const order of [200, 202, 203]) assert.ok(card(order).previous?.[add.id], `card ${order} keeps the words it had`)
  for (const t of after.tasks.filter(x => x.title.startsWith('Sound: ') && !x.deleted)) assert.equal(t.by, t.title === 'Sound: blackout' ? '2026-10-27' : '2026-10-30', t.title)
  // the two new cards and the one they replace
  const practice = after.tasks.find(t => t.title === 'The practice run, Sun 25 Oct')
  assert.deepEqual([practice.who, practice.moment, practice.by, taskWhen(practice)], ['Jon and Susan', 'setup', '2026-10-25', 'now'])
  assert.match(practice.detail, /https:\/\/claude\.ai\/artifact\/3Ekk4JUd8VpN31NJWx56AK/)
  assert.match(practice.detail, /Note anything that feels wrong on the Game test tab or tell Claude Code/)
  assert.equal(byLabel(practice), 'by Sun 25 Oct')
  assert.equal(nextCards(after.tasks)[0], practice, 'tomorrow’s practice run is Jon’s next thing')
  const refresh = after.tasks.find(t => t.title === 'Refresh the claude.ai project’s copies')
  assert.equal(ownerOf(refresh), 'Claude chat')
  assert.match(refresh.detail, /7 November/)
  assert.match(refresh.detail, /23 Oct handoff/)
  assert.equal(card(440).status, 'done', 'the old Claude chat card is part of the new one')
  // the bulletin 2 questions: the new cast, answered by Jon on 24 Oct
  const ds = decisionList(after)
  const voice = after.decisions.bulletin2Voice
  assert.deepEqual([voice.options, voice.answer], [['Ava Waves (Susan)', 'Mic Cameron (Jon)', 'Someone else'], 'Ava Waves (Susan)'])
  assert.match(voice.note, /^Answered 24 Oct 2026: Ava Waves, so Susan/)
  const known = after.decisions.bulletin2Known
  assert.deepEqual([known.question, known.answer, known.options[0]], ['Whoever records bulletin 2 knows which family each line points at. Accept?', 'Accept it', 'Accept it'])
  assert.match(known.note, /^Answered 24 Oct 2026: accepted/)
  // the worst-dial question: the one the cleanup added, naming its checks, answered
  const worst = after.decisions.worstDial
  assert.match(worst.question, /before the second tech run, or after the party/)
  assert.match(worst.note, /G07 and G08/)
  assert.equal(worst.answer, 'Before the second tech run')
  for (const key of ['bulletin2Voice', 'bulletin2Known', 'worstDial', 'grossnola', 'swapMotive']) assert.ok(!decisionsForJon(ds).some(d => d.key === key), `${key} is answered, not waiting on Jon`)
  assert.deepEqual([after.decisions.grossnola.answer, after.decisions.swapMotive.answer], ['Keep it offstage', 'Keep all 19'])
  assert.deepEqual(decisionsForJon(ds).map(d => d.key).sort(), ['ballotMajority', 'diningName', 'granoliaIntro', 'handOn', 'rulesDeckScreen'], 'the open questions CLAUDE.md lists (tidyFolders is Claude Code’s to ask)')
  assert.ok(openDecisions(ds).some(d => d.key === 'tidyFolders'))
  // the worst-dial patch and the test plan's checks: Claude Code's, before the second tech run
  const patch = after.tasks.find(t => t.order === 478)
  assert.deepEqual([patch.who, patch.moment, patch.by], ['Claude Code', 'freeze', '2026-11-11'])
  assert.match(patch.tech, /docs\/patches\/2026-10-24-worst-dial\.patch/)
  assert.match(patch.tech, /G07, G08 and G42/)
  const checks = after.tasks.find(t => t.order === 479)
  assert.deepEqual([checks.who, checks.by], ['Claude Code', '2026-11-11'])
  assert.match(checks.tech, /docs\/test-plan\.md/)
  // as soon as possible, not after the party
  assert.deepEqual([card(196).who, taskWhen(card(196))], ['Claude Code', 'now'])
  assert.ok(!/^Built after the party/.test(card(196).detail), card(196).detail)
  assert.ok(!/only when everything else is done/.test(card(450).detail), card(450).detail)
  assert.match(card(202).detail, /Susan reads them all as Ava Waves/)
  assert.ok(!/unless you pick|question above/.test(card(202).detail), 'bulletin 2’s voice is answered')
  assert.equal(ds.filter(d => /foggiest|worst dial|worst-dial|G07/i.test(`${d.question} ${d.note ?? ''}`)).length, 1, 'one worst-dial question, not two')
  // the six 31 August answers: replaced by what is true now, the old one kept
  for (const [key, old] of Object.entries(AUGUST_ANSWERS)) {
    const d = after.decisions[key]
    assert.deepEqual([d.answer, d.answeredBy], [SUPERSEDED_FOR_NEWS_CAST[key], 'later decisions'], key)
    assert.equal(d.previous[add.id].answer, old, `${key} keeps its 31 August answer`)
    assert.ok(!ds.some(x => x.answer === old), `${key}: no page shows the old answer`)
  }
  const scoring = timelineItems({ decisions: ds }).find(i => i.kind === 'decision' && i.decision.key === 'scoring')
  assert.match(scoring.decision.answer, /^Replaced 22 Oct 2026: everyone wins the same way/, 'the one the Timeline shows, under Act 7')
  // nowhere on the board is Jon Ava Waves, or Mic Cameron uncast
  const open = [...after.tasks.filter(t => !t.deleted && t.status !== 'done').map(t => `${t.title} ${t.detail ?? ''}`), ...ds.filter(d => !isRetiredDecision(d)).map(d => `${d.question} ${(d.options ?? []).join(' ')} ${d.answer ?? ''} ${d.note ?? ''}`)]
  for (const text of open) {
    assert.ok(!/studio voice|you record all 25|\bAva on camera|\bAva in the studio/i.test(text), text)
    if (/\bAva\b/.test(text)) assert.match(text, /Susan/, text)
    if (/\bMic\b/.test(text)) assert.match(text, /Jon|you, as Mic Cameron/, text)
  }
  // Jon's and Susan's new words are plain
  for (const t of [practice, card(200), card(202), card(203)]) {
    assert.ok(!/terminal|npm |\.env|kiosk=|living room|orangery|the freeze|deploy|seed\/|play\/public/i.test(`${t.title} ${t.detail}`), `${t.title} is in plain words`)
  }
  const again = applyPlan(planAddition(add, after, { newId, now: 3 }), after)
  assert.deepEqual([again.tasks, again.decisions], [after.tasks, after.decisions], 'never twice')
})

test('the news cast on the live board’s shape: Claude chat’s answers stand, and an old option moves to its new words', () => {
  const { before, add, newId } = boardThrough('2026-10-24-news-cast')
  const decisions = { ...before.decisions }
  // Claude chat answered both bulletin 2 questions on the board, one with an
  // old option and one in its own words, and made worstDial itself, answered
  decisions.bulletin2Voice = { ...decisions.bulletin2Voice, answer: 'Ava Waves (you, in the studio voice)', answeredBy: 'Claude chat', answeredAt: 5 }
  decisions.bulletin2Known = { ...decisions.bulletin2Known, answer: 'Accepted, since Susan records the lines', answeredBy: 'Claude chat', answeredAt: 5 }
  decisions.worstDial = { key: 'worstDial', question: 'Build the worst-dial proof now?', options: ['After the party', 'Before the second tech run'], answer: 'Before the second tech run', answeredBy: 'Claude chat', answeredAt: 5 }
  decisions.grossnola = { ...decisions.grossnola, answer: 'Keep it offstage', answeredBy: 'Jon', answeredAt: 0 }
  decisions.swapMotive = { ...decisions.swapMotive, answer: 'Keep all 19', answeredBy: 'Jon', answeredAt: 0 }
  const state = { ...before, decisions }
  const after = applyPlan(planAddition(add, state, { newId, now: 2 }), state)
  const d = after.decisions
  assert.deepEqual([d.bulletin2Voice.answer, d.bulletin2Voice.answeredBy], ['Ava Waves (Susan)', 'Claude chat'], 'Jon’s pick follows its renamed option')
  assert.deepEqual([d.bulletin2Known.answer, d.bulletin2Known.answeredBy], ['Accepted, since Susan records the lines', 'Claude chat'], 'an answer in its own words is never changed')
  assert.deepEqual([d.worstDial.answer, d.worstDial.answeredBy, d.worstDial.answeredAt], ['Before the second tech run', 'Claude chat', 5], 'never answered twice')
  assert.equal(d.worstDial.moment, 'freeze', 'a worstDial made with no moment is filed under the freeze rows')
  assert.equal(d.worstDial.question, 'Build the worst-dial proof now?', 'and not reworded: it was not where the refile looks')
  for (const key of ['grossnola', 'swapMotive']) assert.deepEqual([d[key].answeredBy, d[key].answeredAt], ['Jon', 0], `${key}: Jon’s answer stands`)
})

test('the item 4 migration: the newest; the six built cards close, two questions filed, open on the board by number and title; Jon\'s three new cards are new and plain', () => {
  const { before, add, newId } = boardThrough('2026-10-25-item4')
  assert.equal(ADDITIONS.at(-1), add, 'the newest migration')
  assert.ok(add.tasks === ITEM4_TASKS && add.retireTasks === RETIRED_FOR_ITEM4 && add.decisions === ITEM4_DECISIONS)
  for (const d of ITEM4_DECISIONS) {
    assert.equal(before.decisions[d.key], undefined, `${d.key} is a new question`)
    assert.ok(MOMENT_KEYS.includes(d.moment), d.moment)
    assert.equal(d.options.length, 2)
    assert.match(d.note, /^Default: /)
    for (const k of ['question', 'note']) assert.ok(!d[k].includes('—'), `${d.key}.${k}`)
  }
  const earlier = new Set(before.tasks.map(t => t.order))
  for (const t of ITEM4_TASKS) {
    assert.ok(t.order >= 480 && t.order < 500, `${t.title}: numbered from 480`)
    assert.ok(!earlier.has(t.order), `order ${t.order} is new`)
    assert.equal(t.who, 'Jon')
    assert.ok(MOMENT_KEYS.includes(t.moment), t.moment)
    for (const k of ['title', 'detail']) assert.ok(!String(t[k]).includes('—'), `${t.title}.${k}`)
  }
  assert.deepEqual(RETIRED_FOR_ITEM4.map(r => r.order).sort((a, b) => a - b), [196, 308, 324, 343, 450, 479])
  for (const r of RETIRED_FOR_ITEM4) {
    assert.ok(before.tasks.some(t => t.order === r.order && t.title === r.title && t.status !== 'done' && !t.deleted), `card ${r.order} (${r.title}) is open on the board`)
    assert.match(r.detail, /^Built 25 Oct 2026:/)
    assert.ok(!r.detail.includes('—'), `card ${r.order}`)
  }
  const after = applyPlan(planAddition(add, before, { newId, now: 3 }), before)
  for (const r of RETIRED_FOR_ITEM4) assert.equal(after.tasks.find(t => t.order === r.order && t.title === r.title).status, 'done', r.title)
  assert.ok(after.tasks.some(t => t.title === 'Open the case, the morning after' && t.moment === 'after'))
  const again = applyPlan(planAddition(add, after, { newId, now: 4 }), after)
  assert.equal(again.tasks.length, after.tasks.length, 'once only')
})
