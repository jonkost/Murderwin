import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import night from '../../seed/night.json' with { type: 'json' }
import tasksFile from '../../seed/tasks.json' with { type: 'json' }
import { AREAS, ADDITIONS, UI_LABELS, COUNTED_UI_LABELS, STATION_LABELS, TAB_KINDS } from '../src/lib/content.js'
import { TIMELINE, NEEDS, MOMENT_KEYS, TIMELINE_LISTS, STANDIN_LISTS, momentName, nightTimeline, timelineItems, timelineProgress, bucketProgress, listStatus, taskWhen, taskStandin, taskNotYou, OWNERS, ownerOf, taskBy, byLabel, leftByOwner, leftLine, nextCards, unfiled, momentOptions, openDecisions, decisionsForJon, isRetiredDecision, RETIRED_MOMENT, firstSentence } from '../src/lib/timeline.js'
import { TIMELINE_TASKS, TIMELINE_DECISIONS, RETIRED_FOR_TIMELINE, STANDIN_SOUND_TASKS, ALL_TIMELINE_TASKS, HANDOFF_TASKS, RETIRED_FOR_HANDOFF, HANDOFF_BUILT_TASKS, RETIRED_FOR_BUILT, AUDIT_TASKS, RETIRED_FOR_AUDIT, FILED_FOR_AUDIT, AUDIT_DECISIONS, FILED_DECISIONS_FOR_AUDIT, ANSWERED_FOR_AUDIT, SECRET_LINES_TASKS, SECRET_LINES_DECISIONS, RETIRED_FOR_SECRET_LINES, FILED_FOR_SECRET_LINES, CLEANUP_TASKS, CLEANUP_DECISIONS, RETIRED_FOR_CLEANUP, REWRITTEN_FOR_CLEANUP, REFILED_FOR_CLEANUP, NEWS_CAST_TASKS, RETIRED_FOR_NEWS_CAST, FILED_FOR_NEWS_CAST, REWRITTEN_FOR_NEWS_CAST, ANSWERED_FOR_NEWS_CAST, FILED_DECISIONS_FOR_NEWS_CAST, REFILED_FOR_NEWS_CAST, SUPERSEDED_FOR_NEWS_CAST, ITEM4_TASKS, RETIRED_FOR_ITEM4, ITEM4_DECISIONS, RETIRED_FOR_CUE_LIST_3, REWRITTEN_FOR_CUE_LIST_3, CUE_LIST_3_DECISIONS, CUE_LIST_TASKS, CUE_LIST_DECISIONS, ANSWERED_FOR_CUE_LIST, RETIRED_FOR_CUE_LIST, REWRITTEN_FOR_CUE_LIST, RETIRED_FOR_GAME_TEST_1026, RETIRED_FOR_BOO_1027, BOO_1027_TASKS, TURNS_1028_TASKS, TURNS_1028_DECISIONS, RETIRED_FOR_PHONE_LOOK_1028, PHONE_LOOK_1028_TASKS, PHONE_LOOK_1028_DECISIONS, ARCADE_1028_TASKS, RETIRED_FOR_WINNERS_1029, WINNERS_1029_TASKS, MICE_PETS_1029_TASKS, FILED_FOR_MICE_PETS_1029, REWRITTEN_FOR_MICE_PETS_1029, ARCADE_MENU_1029_TASKS, FILED_FOR_ARCADE_MENU_1029, RETIRED_FOR_ARCADE_REWORK_1029, ARCADE_REWORK_1029_TASKS, ANSWERED_FOR_ARCADE_REWORK_1029, ARCADE_REWORK_1029_DECISIONS, REWRITTEN_FOR_ARCADE_REWORK_1029, RETIRED_FOR_MEMORY_RESEND_1029, RETIRED_FOR_NEVER_A_NOTE_1029, NEVER_A_NOTE_1029_TASKS, NEVER_A_NOTE_1029_DECISIONS, ARCADE_PLAYTEST_1030_TASKS, FILED_FOR_ARCADE_PLAYTEST_1030, ARCADE_PLAYTEST_1030_DECISIONS, SALEM_1031_TASKS, RETIRED_FOR_SALEM_1031, ARCADE_PLAYTEST_1031_TASKS, FILED_FOR_ARCADE_PLAYTEST_1031, ARCADE_PLAYTEST_1031_DECISIONS, MUSIC_SHORTCUTS_1031_TASKS, ARCADE_NOTES_1101_TASKS, FILED_FOR_ARCADE_NOTES_1101, ARCADE_NOTES_1101_DECISIONS, RETIRED_FOR_STUDY_STOP_1101, FILED_FOR_STUDY_STOP_1101, ARCADE_NIGHT_1105_TASKS, RETIRED_FOR_ARCADE_NIGHT_1105, FILED_FOR_ARCADE_NIGHT_1105, ARCADE_NIGHT_1105_DECISIONS, ANSWERED_FOR_THREE_CARDS_1105, RETIRED_FOR_THREE_CARDS_1105, RETIRED_ITEMS_FOR_THREE_CARDS_1105, APPENDED_ITEMS_FOR_THREE_CARDS_1105, SWEEP_1106_DECISIONS, POSTMORTEM_1111_TASKS, MEDIA_1111_TASKS, WALKTHROUGH_1111_TASKS, SETUP_1111_TASKS, START_1112_TASKS, WORKSHOP_1112_TASKS, POLISH_1112_TASKS, RETIRED_FOR_POLISH_1112, FILED_FOR_POLISH_1112, ANSWERED_FOR_POLISH_1112, REVIEW_1112_TASKS, RETIRED_FOR_REVIEW_1112, FILED_FOR_REVIEW_1112, BLACKOUT_SHORTCUTS_1112_TASKS, REWRITTEN_FOR_BLACKOUT_SHORTCUTS_1112, FILED_FOR_BLACKOUT_SHORTCUTS_1112, AUDIO_PANIC_1112_TASKS, REWRITTEN_FOR_AUDIO_PANIC_1112, FILED_FOR_AUDIO_PANIC_1112, SCREEN_SAVER_1112_TASKS, RETIRED_FOR_SCREEN_SAVER_1112, REWRITTEN_FOR_SCREEN_SAVER_1112 } from '../src/lib/timelineTasks.js'
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
  // a sound card a later migration closed (the power sound, 25 Oct 2026) stays on the board as done and is no cue
  const closed = new Set(RETIRED_FOR_CUE_LIST_3.map(r => r.order))
  const soundCards = ALL_TIMELINE_TASKS.filter(t => t.title.startsWith('Sound: ') && !closed.has(t.order))
  const sounds = soundCards.map(t => t.title.slice(7))
  assert.deepEqual([...sounds].sort(), [...ids].sort())
  assert.ok(!ids.includes('power') && ALL_TIMELINE_TASKS.some(t => t.order === 140 && t.title === 'Sound: power'), 'the power card was seeded and is closed, not deleted')
  for (const t of soundCards) {
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

test('the item 4 migration: followed by the cue list’s blackout step; the six built cards and the two string-lights cards close, three questions filed, open on the board by number and title; Jon\'s three new cards are new and plain', () => {
  const { before, add, newId } = boardThrough('2026-10-25-item4')
  assert.equal(ADDITIONS[ADDITIONS.indexOf(add) + 1]?.id, '2026-10-25-cue-list-blackout', 'followed by the cue list’s blackout step, the same evening')
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
  assert.deepEqual(RETIRED_FOR_ITEM4.map(r => r.order).sort((a, b) => a - b), [196, 308, 324, 343, 423, 450, 462, 479])
  for (const r of RETIRED_FOR_ITEM4) {
    assert.ok(before.tasks.some(t => t.order === r.order && t.title === r.title && t.status !== 'done' && !t.deleted), `card ${r.order} (${r.title}) is open on the board`)
    assert.match(r.detail, /^(Built 25 Oct 2026|Done 25 Oct):/)
    assert.ok(!r.detail.includes('—'), `card ${r.order}`)
  }
  const after = applyPlan(planAddition(add, before, { newId, now: 3 }), before)
  for (const r of RETIRED_FOR_ITEM4) assert.equal(after.tasks.find(t => t.order === r.order && t.title === r.title).status, 'done', r.title)
  assert.ok(after.tasks.some(t => t.title === 'Open the case, the morning after' && t.moment === 'after'))
  const again = applyPlan(planAddition(add, after, { newId, now: 4 }), after)
  assert.equal(again.tasks.length, after.tasks.length, 'once only')
})

test('the cue list’s blackout step (25 Oct 2026, evening): followed by the cue list’s board; the power sound’s card closes, the brain’s start card is reworded with its old words kept, one new question, each open on the board by number and title, once only', () => {
  const { before, add, newId } = boardThrough('2026-10-25-cue-list-blackout')
  assert.equal(ADDITIONS[ADDITIONS.indexOf(add) + 1]?.id, '2026-10-26-cue-list', 'followed by the cue list’s board, the next day')
  assert.ok(add.retireTasks === RETIRED_FOR_CUE_LIST_3 && add.rewriteTasks === REWRITTEN_FOR_CUE_LIST_3 && add.decisions === CUE_LIST_3_DECISIONS)
  assert.equal(add.tasks, undefined, 'no new cards: the cue list’s cards come with the board step')
  assert.deepEqual(RETIRED_FOR_CUE_LIST_3.map(r => [r.order, r.title]), [[140, 'Sound: power']])
  for (const r of [...RETIRED_FOR_CUE_LIST_3, ...REWRITTEN_FOR_CUE_LIST_3]) {
    assert.ok(before.tasks.some(t => t.order === r.order && t.title === r.title && t.status !== 'done' && !t.deleted), `card ${r.order} (${r.title}) is open on the board`)
  }
  for (const r of RETIRED_FOR_CUE_LIST_3) { assert.match(r.detail, /^Done 25 Oct 2026:/); assert.ok(!r.detail.includes('—')) }
  for (const r of REWRITTEN_FOR_CUE_LIST_3) {
    assert.ok(!r.set.detail.includes('—') && !r.set.detail.includes('ten sounds'), `card ${r.order}: nine sounds, two required`)
    assert.match(r.set.detail, /chime-phone/); assert.match(r.set.detail, /blackout sound/)
  }
  for (const d of CUE_LIST_3_DECISIONS) {
    assert.equal(before.decisions[d.key], undefined, `${d.key} is a new question`)
    assert.ok(MOMENT_KEYS.includes(d.moment), d.moment)
    assert.equal(d.options.length, 2)
    assert.match(d.note, /^Default: /)
    for (const k of ['question', 'note']) assert.ok(!d[k].includes('—'), `${d.key}.${k}`)
  }
  const after = applyPlan(planAddition(add, before, { newId, now: 5 }), before)
  const power = after.tasks.find(t => t.order === 140 && t.title === 'Sound: power')
  assert.equal(power.status, 'done'); assert.ok(power.detail.endsWith(RETIRED_FOR_CUE_LIST_3[0].detail))
  const brain = after.tasks.find(t => t.order === 121 && t.title === 'Start the brain')
  assert.equal(brain.detail, REWRITTEN_FOR_CUE_LIST_3[0].set.detail)
  assert.match(brain.previous['2026-10-25-cue-list-blackout'].detail, /ten sounds/, 'the old words are kept on the card')
  assert.equal(after.decisions.promptScreen.moment, 'act2.orient'); assert.equal(after.decisions.promptScreen.answer, null)
  const again = applyPlan(planAddition(add, after, { newId, now: 6 }), after)
  assert.equal(again.tasks.length, after.tasks.length, 'once only')
  assert.equal(again.tasks.find(t => t.order === 121).previous, brain.previous, 'not rewritten twice')
})

// ---- the cue list's board, 26 Oct 2026 ---------------------------------------

// The plain words a card of Jon's, Susan's or Jenna's must keep to (the cleanup's rule).
const PLAIN = /terminal|npm |\.env|kiosk=|living room|orangery|crookshank|the freeze|nine sounds|deploy|seed\/|play\/public/i

test('the cue-list board (26 Oct 2026): the newest; the seven built steps as done cards, Jon’s cards new and plain in a fresh block, the five questions open with their defaults, rulesDeckScreen answered by its first option, every card it closes or rewords open on the board by number and title', () => {
  const { before, add } = boardThrough('2026-10-26-cue-list')
  assert.ok(ADDITIONS.includes(add), 'on the board')
  assert.ok(add.tasks === CUE_LIST_TASKS && add.decisions === CUE_LIST_DECISIONS && add.retireTasks === RETIRED_FOR_CUE_LIST && add.rewriteTasks === REWRITTEN_FOR_CUE_LIST && add.answerDecisions === ANSWERED_FOR_CUE_LIST)
  assert.equal(add.fileTasks, undefined)
  const earlier = new Set(before.tasks.map(t => t.order))
  for (const t of CUE_LIST_TASKS) {
    assert.ok(t.order >= 490 && t.order < 560, `${t.title}: numbered from 490`)
    assert.ok(!earlier.has(t.order), `order ${t.order} is new`)
    assert.ok(OWNERS.includes(t.who), `${t.title}: ${t.who}`)
    assert.ok(MOMENT_KEYS.includes(t.moment), t.moment)
    if (t.by) assert.match(t.by, /^2026-1[01]-\d{2}$/, `${t.title}: a date before the party`)
    for (const k of ['title', 'detail', 'tech']) assert.ok(!String(t[k] ?? '').includes('—'), `${t.title}.${k}`)
    if (t.status === 'done') {
      assert.equal(t.who, 'Claude Code', `${t.title}: a built step is Claude Code’s`)
      assert.match(t.detail, /^Built 25 Oct 2026: /, t.title)
    } else {
      assert.equal(t.status, 'todo')
      assert.equal(t.who, 'Jon', `${t.title}: the open cards are Jon’s`)
      assert.ok(!PLAIN.test(`${t.title} ${t.detail}`), `${t.title}: plain words, the line itself under tech`)
    }
  }
  assert.equal(new Set(CUE_LIST_TASKS.map(t => t.order)).size, CUE_LIST_TASKS.length, 'one number each')
  assert.equal(CUE_LIST_TASKS.filter(t => t.status === 'done').length, 7, 'section 5, items 2 to 8')
  for (const title of ['The brain follows the cue list', 'The blackout returns the power on its own', 'A Notes tab on every phone', 'The devices follow your key']) assert.ok(CUE_LIST_TASKS.some(t => t.title === title && t.status === 'done'), title)
  // the device moves, each at the moment it happens
  assert.equal(CUE_LIST_TASKS.find(t => t.title === 'Carry the iPad Pro to the Orangerie for the captions').moment, 'act3.down')
  assert.equal(CUE_LIST_TASKS.find(t => t.title === 'The iPad Pro back to the Library before Start Act 4').moment, 'act4.warn')
  assert.equal(CUE_LIST_TASKS.find(t => t.title === 'Carry the iPad Pro into the bedroom before the drawing').moment, 'act6.games')
  for (const t of CUE_LIST_TASKS.filter(x => /^Carry the iPad Pro|^The iPad Pro back/.test(x.title))) assert.equal(taskWhen(t), 'later', t.title)
  // the five questions, open, each with its default built
  assert.deepEqual(CUE_LIST_DECISIONS.map(d => d.key).sort(), ['bedroomName', 'blackoutAuto', 'cueSounds', 'olderIpad', 'roomMusic'])
  for (const d of CUE_LIST_DECISIONS) {
    assert.equal(before.decisions[d.key], undefined, `${d.key} is a new question`)
    assert.ok(MOMENT_KEYS.includes(d.moment), d.moment)
    assert.equal(d.options.length, 2, d.key)
    assert.equal(d.answer, null, `${d.key} is Jon’s to answer`)
    assert.match(d.note, /^Default: /, d.key)
    assert.ok(!d.who, `${d.key} is asked of Jon on Home`)
    for (const k of ['question', 'note']) assert.ok(!d[k].includes('—') && !/kiosk=/.test(d[k]), `${d.key}.${k}`)
  }
  assert.deepEqual(CUE_LIST_DECISIONS.map(d => [d.key, d.moment]).sort(), [['bedroomName', 'act6.door'], ['blackoutAuto', 'act1.ready'], ['cueSounds', 'freeze'], ['olderIpad', 'setup'], ['roomMusic', 'act4.groups']])
  // rulesDeckScreen: open on the board, answered with its first option as the cleanup reworded it
  assert.equal(before.decisions.rulesDeckScreen.answer, null)
  assert.equal(ANSWERED_FOR_CUE_LIST.rulesDeckScreen, before.decisions.rulesDeckScreen.options[0])
  assert.deepEqual(Object.keys(ANSWERED_FOR_CUE_LIST), ['rulesDeckScreen'], 'nothing else is answered for Jon')
  // every card it closes or rewords is open on the board by number and title, one rewrite each
  for (const r of [...RETIRED_FOR_CUE_LIST, ...REWRITTEN_FOR_CUE_LIST]) {
    assert.ok(r.title, `card ${r.order} is matched by its title too`)
    assert.ok(before.tasks.some(t => t.order === r.order && t.title === r.title && t.status !== 'done' && !t.deleted), `card ${r.order} (${r.title}) is open on the board`)
  }
  assert.equal(new Set(REWRITTEN_FOR_CUE_LIST.map(r => r.order)).size, REWRITTEN_FOR_CUE_LIST.length, 'one rewrite per card')
  assert.ok(!RETIRED_FOR_CUE_LIST.some(r => REWRITTEN_FOR_CUE_LIST.some(w => w.order === r.order)), 'never closed and reworded at once')
  assert.deepEqual(RETIRED_FOR_CUE_LIST.map(r => r.order).sort((a, b) => a - b), [429, 430, 472, 473])
  for (const r of RETIRED_FOR_CUE_LIST) {
    assert.match(r.detail, /^(Built 25|Done 25|Replaced 26|Out by default \(the question olderIpad, 26) Oct 2026[^:]*:/, `card ${r.order} says when and why`)
    assert.ok(!r.detail.includes('—'), `card ${r.order}`)
  }
  for (const r of REWRITTEN_FOR_CUE_LIST) {
    if (r.set.moment) assert.ok(MOMENT_KEYS.includes(r.set.moment), r.set.moment)
    if (r.set.who) assert.ok(OWNERS.includes(r.set.who), r.set.who)
    for (const k of ['title', 'detail', 'tech']) assert.ok(!String(r.set[k] ?? '').includes('—'), `card ${r.order}.${k}`)
  }
  // the sound cards keep their titles and moments (the cue test pins them), under cueSounds' default
  const sounds = REWRITTEN_FOR_CUE_LIST.filter(r => r.title.startsWith('Sound: '))
  assert.deepEqual(sounds.map(r => r.order).sort((a, b) => a - b), [134, 141, 152, 160, 171, 181, 190, 191, 420], 'every sound card but the closed power one')
  for (const r of sounds) {
    assert.ok(!('title' in r.set) && !('moment' in r.set), `${r.title} keeps its title and moment`)
    assert.ok(!/ten sounds/.test(r.set.detail), r.title)
  }
  for (const order of [141, 152, 171]) assert.match(sounds.find(r => r.order === order).set.detail, /^Optional\. .*chime-phone/, `card ${order} borrows the chime`)
  for (const order of [160, 181, 190, 191]) assert.match(sounds.find(r => r.order === order).set.detail, /^Optional\. .*silent/, `card ${order} is an optional sting`)
  for (const order of [134, 420]) assert.match(sounds.find(r => r.order === order).set.detail, /one of the two sounds the brain needs/i, `card ${order} is required`)
})

test('the cue-list board on a pretend board: the stale cards closed with the reason, the device and sound cards reworded with their old words kept, Jon’s open cards in plain words, the questions waiting on Jon, rulesDeckScreen answered, once only', () => {
  const { before, add, newId } = boardThrough('2026-10-26-cue-list')
  // Jon has added a card by hand that shares a number with one the board rewords, and answered one question himself
  const state = {
    ...before,
    tasks: [...before.tasks, { id: 'jon', order: 421, status: 'todo', title: 'Buy jazz records', detail: 'For the Parlour.' }],
    decisions: { ...before.decisions, olderIpad: { key: 'olderIpad', moment: 'setup', question: 'Older iPad?', options: ['Out', 'Stays'], answer: 'Stays', answeredBy: 'Jon', answeredAt: 0 } },
  }
  const after = applyPlan(planAddition(add, state, { newId, now: 7 }), state)
  const card = (order, title) => after.tasks.find(t => t.order === order && t.id !== 'jon' && (!title || t.title === title))
  for (const r of RETIRED_FOR_CUE_LIST) {
    const t = card(r.order, r.title)
    assert.equal(t.status, 'done', `card ${r.order} closed`)
    assert.ok(t.detail.endsWith(r.detail), `card ${r.order} says why`)
  }
  for (const r of REWRITTEN_FOR_CUE_LIST) {
    const t = card(r.order)
    for (const [k, v] of Object.entries(r.set)) assert.deepEqual(t[k], v, `card ${r.order}.${k}`)
    assert.ok(t.previous?.[add.id], `card ${r.order} keeps the words it had`)
    assert.equal(t.status, 'todo', `card ${r.order} stays open`)
  }
  assert.equal(after.tasks.find(t => t.id === 'jon').detail, 'For the Parlour.', 'Jon’s own card is never rewritten')
  // the new cards landed, under their moments
  for (const t of CUE_LIST_TASKS) {
    const live = card(t.order, t.title)
    assert.ok(live, t.title)
    assert.deepEqual([live.moment, live.status, live.who], [t.moment, t.status, t.who], t.title)
  }
  // no open card still says what the key or the cue list changed
  const open = after.tasks.filter(t => !t.deleted && t.status !== 'done' && t.id !== 'jon')
  for (const t of open) {
    const text = `${t.title} ${t.detail ?? ''}`
    assert.ok(!/older iPad (in|does|on)|Susan’s MacBook Pro (to|into) the bedroom|captions iPad|ten sounds|Murderwin · (Arrival|Investigation|Supper)|Murderwin (Arrival|Lights Out|Reveal)\b|guess(es|ing)? on (the|your) (TV|work MacBook)/i.test(text), `card ${t.order} (${t.title}) is up to date`)
  }
  const jons = open.filter(t => ['Jon', 'Jon and Susan', 'Susan', 'Jenna'].includes(ownerOf(t)))
  for (const t of jons) assert.ok(!PLAIN.test(`${t.title} ${t.detail ?? ''}`), `card ${t.order} (${t.title}) is in plain words`)
  // the sound cards still count their simple tone, and the power card stays closed
  for (const t of open.filter(x => x.title.startsWith('Sound: '))) assert.equal(taskStandin(t, after.tasks), true, t.title)
  assert.equal(card(140, 'Sound: power').status, 'done')
  // the decisions: the four new ones wait on Jon on Home, Jon's own answer stands, rulesDeckScreen is answered by the canon
  const ds = decisionList(after)
  for (const d of CUE_LIST_DECISIONS.filter(x => x.key !== 'olderIpad')) {
    assert.deepEqual([after.decisions[d.key].moment, after.decisions[d.key].answer, after.decisions[d.key].note], [d.moment, null, d.note], d.key)
    assert.ok(decisionsForJon(ds).some(x => x.key === d.key), `${d.key} waits on Jon`)
  }
  assert.deepEqual([after.decisions.olderIpad.answer, after.decisions.olderIpad.question], ['Stays', 'Older iPad?'], 'a question Jon already answered is never replaced')
  assert.deepEqual([after.decisions.rulesDeckScreen.answer, after.decisions.rulesDeckScreen.answeredBy], ['The Parlour TV, back to the game before the blackout', 'the canon'])
  assert.ok(!decisionsForJon(ds).some(d => d.key === 'rulesDeckScreen'), 'rulesDeckScreen is answered, not waiting on Jon')
  assert.deepEqual(decisionsForJon(ds).map(d => d.key).sort(), ['ballotMajority', 'bedroomName', 'blackoutAuto', 'cueSounds', 'dialSpill', 'diningName', 'granoliaIntro', 'handOn', 'promptScreen', 'roomMusic', 'senseClue', 'stringsLead'], 'the open questions: CLAUDE.md’s, the build’s three, promptScreen and the cue list’s four (olderIpad answered here by Jon; tidyFolders is Claude Code’s to ask)')
  assert.deepEqual(unfiled({ tasks: after.tasks.filter(t => t.id !== 'jon'), decisions: ds }).decisions, [], 'every open question has a place on the night')
  // Jon's next three are his own real jobs
  const next = nextCards(after.tasks.filter(t => t.id !== 'jon'))
  assert.equal(next.length, 3)
  assert.ok(next.every(t => ['Jon', 'Jon and Susan'].includes(ownerOf(t))), next.map(t => t.title).join(' | '))
  // once only
  const again = applyPlan(planAddition(add, after, { newId, now: 8 }), after)
  assert.deepEqual([again.tasks, again.decisions], [after.tasks, after.decisions], 'never twice')
  assert.equal(again.tasks.find(t => t.order === 421 && t.id !== 'jon').previous, card(421).previous, 'not rewritten twice')
})

// ---- Jon's Game test notes, 26 Oct 2026 (evening) ---------------------------

test('the Game test notes of 26 Oct: three notes marked done by number, Boo’s Catwalk left open', () => {
  const add = ADDITIONS.find(a => a.id === '2026-10-26-game-test-notes')
  assert.equal(add.retireTasks, RETIRED_FOR_GAME_TEST_1026)
  assert.deepEqual(RETIRED_FOR_GAME_TEST_1026.map(r => r.order), [10000, 10001, 10003])
  for (const r of RETIRED_FOR_GAME_TEST_1026) assert.match(r.detail, /^Fixed 26 Oct 2026: .+ Try it again\.$/)
})

// ---- Boo's Catwalk, 27 Oct 2026 -----------------------------------------------

test('Boo’s Catwalk, 27 Oct: Jon’s note 10002 marked done by number', () => {
  const add = ADDITIONS.find(a => a.id === '2026-10-27-boo-catwalk')
  assert.equal(add.retireTasks, RETIRED_FOR_BOO_1027)
  assert.deepEqual(RETIRED_FOR_BOO_1027.map(r => r.order), [10002])
  assert.match(RETIRED_FOR_BOO_1027[0].detail, /^Fixed 27 Oct 2026: .+ Try it again: .+\.$/)
  // Boo's music on the Parlour HomePod (Jon, 27 Oct): three of Jon's cards
  assert.equal(add.tasks, BOO_1027_TASKS)
  assert.deepEqual(BOO_1027_TASKS.map(t => [t.order, t.who, t.moment]), [[507, 'Jon', 'freeze'], [508, 'Jon', 'act4.warn'], [509, 'Jon', 'freeze']])
})

// ---- In Duplicate's turns and the Entryway's game, 28 Oct 2026 ---------------

test('28 Oct: Jon tries the turns, and the Entryway’s game is his decision', () => {
  const add = ADDITIONS.find(a => a.id === '2026-10-28-turns')
  assert.ok(ADDITIONS.indexOf(add) >= 0)
  assert.equal(add.tasks, TURNS_1028_TASKS)
  assert.deepEqual(TURNS_1028_TASKS.map(t => [t.order, t.who, t.moment]), [[510, 'Jon', 'act4.puzzle']])
  assert.equal(add.decisions, TURNS_1028_DECISIONS)
  assert.deepEqual(TURNS_1028_DECISIONS.map(d => [d.key, d.answer]), [['entrywayGame', null]])
  for (const t of TURNS_1028_TASKS) assert.ok(MOMENT_KEYS.includes(t.moment), t.moment)
  for (const d of TURNS_1028_DECISIONS) assert.ok(MOMENT_KEYS.includes(d.moment), d.moment)
})

// ---- Jon's Game test notes and the phone's look, 28 Oct 2026 (evening) -------

test('28 Oct, evening: Jon’s five Game test notes closed by number, the study’s second screen his decision', () => {
  const add = ADDITIONS.find(a => a.id === '2026-10-28-phone-look')
  assert.equal(ADDITIONS[ADDITIONS.indexOf(add) + 1]?.id, '2026-10-28-arcade', 'followed by the arcade')
  assert.equal(add.retireTasks, RETIRED_FOR_PHONE_LOOK_1028)
  assert.deepEqual(RETIRED_FOR_PHONE_LOOK_1028.map(r => r.order), [10004, 10005, 10006, 10007, 10008])
  for (const r of RETIRED_FOR_PHONE_LOOK_1028) assert.match(r.detail, /^(Done|Answered|Filed|Fixed) 28 Oct 2026: /)
  assert.equal(add.tasks, PHONE_LOOK_1028_TASKS)
  assert.deepEqual(PHONE_LOOK_1028_TASKS.map(t => [t.order, t.who, t.moment]), [[511, 'Jon', 'freeze'], [512, 'Jon', 'freeze']])
  assert.equal(add.decisions, PHONE_LOOK_1028_DECISIONS)
  assert.deepEqual(PHONE_LOOK_1028_DECISIONS.map(d => [d.key, d.answer]), [['studySecondScreen', null]])
  for (const t of PHONE_LOOK_1028_TASKS) assert.ok(MOMENT_KEYS.includes(t.moment), t.moment)
  for (const d of PHONE_LOOK_1028_DECISIONS) assert.ok(MOMENT_KEYS.includes(d.moment), d.moment)
})

// ---- Miss Boo LaRue's Arcade, 28 Oct 2026 (night; reviewed and fixed 29 Oct) ----

test('28 Oct, night: followed by the winners; the arcade built to try, Jon’s try, the arcade on the night only if entrywayGame picks it, the two just-for-fun winners, and roomMusic’s mismatch', () => {
  const { before, add, newId } = boardThrough('2026-10-28-arcade')
  assert.equal(ADDITIONS[ADDITIONS.indexOf(add) + 1]?.id, '2026-10-29-winners', 'followed by the winners')
  assert.equal(add.tasks, ARCADE_1028_TASKS)
  assert.ok(!add.decisions && !add.retireTasks && !add.rewriteTasks, 'it answers and retires nothing: entrywayGame stays Jon’s')
  assert.deepEqual(ARCADE_1028_TASKS.map(t => [t.order, t.who, t.moment, t.status]), [
    [513, 'Claude Code', 'act4.entryway', 'done'],
    [514, 'Jon', 'act4.entryway', 'todo'],
    [515, 'Claude Code', 'act4.entryway', 'todo'],
    [516, 'Claude Code', 'act4.puzzle', 'todo'],
    [517, 'Claude Code', 'act4.orangerie', 'todo'],
    [518, 'Claude Code', 'act4.groups', 'todo'],
  ])
  const earlier = new Set(before.tasks.map(t => t.order))
  for (const t of ARCADE_1028_TASKS) {
    assert.ok(!earlier.has(t.order), `order ${t.order} is new`)
    assert.ok(OWNERS.includes(t.who), `${t.title}: ${t.who}`)
    assert.ok(MOMENT_KEYS.includes(t.moment), t.moment)
    if (t.by) assert.match(t.by, /^2026-1[01]-\d{2}$/)
    assert.ok(!/\b(npm|kiosk|deploy|repo|seed|stand-in|preview|terminal)\b|\.env|—/i.test(`${t.title} ${t.detail}`), `${t.title}: plain words, the line itself under tech`)
  }
  const after = applyPlan(planAddition(add, before, { newId, now: 1 }), before)
  for (const t of ARCADE_1028_TASKS) {
    const card = after.tasks.find(c => c.order === t.order && !c.deleted)
    assert.ok(card && card.title === t.title && card.status === t.status, `card ${t.order} on the board`)
  }
  // card 515's first title (since 29 Oct, evening: The arcade on the night)
  assert.equal(ARCADE_1028_TASKS.find(t => t.order === 515).title, 'The arcade on the night, if entrywayGame picks it')
  // card 518 only asks: roomMusic stays open on the board until Jon says which stands
  assert.equal(decisionList(after).find(d => d.key === 'roomMusic')?.answer ?? null, null)
})

// ---- The just-for-fun winners, 29 Oct 2026 ------------------------------------

test('29 Oct: followed by the mice’s pets; the two just-for-fun winners closed by number and title, Jon’s try new and plain, once only', () => {
  const { before, add, newId } = boardThrough('2026-10-29-winners')
  assert.equal(ADDITIONS[ADDITIONS.indexOf(add) + 1]?.id, '2026-10-29-mice-pets', 'followed by the mice’s pets')
  assert.equal(add.retireTasks, RETIRED_FOR_WINNERS_1029)
  assert.deepEqual(RETIRED_FOR_WINNERS_1029.map(r => [r.order, r.title]), [[516, 'A just-for-fun winner in In Duplicate'], [517, 'A just-for-fun winner in Get Off My Lawn!']])
  for (const r of RETIRED_FOR_WINNERS_1029) assert.match(r.detail, /^Done 29 Oct 2026: /)
  assert.ok(!add.decisions && !add.rewriteTasks && !add.answerDecisions, 'it decides nothing')
  assert.equal(add.tasks, WINNERS_1029_TASKS)
  assert.deepEqual(WINNERS_1029_TASKS.map(t => [t.order, t.who, t.moment, t.status]), [[519, 'Jon', 'act4.groups', 'todo']])
  const earlier = new Set(before.tasks.map(t => t.order))
  for (const t of WINNERS_1029_TASKS) {
    assert.ok(!earlier.has(t.order), `order ${t.order} is new`)
    assert.ok(OWNERS.includes(t.who), `${t.title}: ${t.who}`)
    assert.ok(MOMENT_KEYS.includes(t.moment), t.moment)
    assert.match(t.by, /^2026-1[01]-\d{2}$/)
    assert.ok(!/\b(npm|kiosk|deploy|repo|seed|stand-in|preview|terminal)\b|\.env|—/i.test(`${t.title} ${t.detail}`), `${t.title}: plain words, the line itself under tech`)
  }
  // both cards are open on the board by number and title, and close with the reason added
  for (const r of RETIRED_FOR_WINNERS_1029) {
    const card = before.tasks.find(c => c.order === r.order && !c.deleted)
    assert.ok(card && card.title === r.title && card.status === 'todo', `card ${r.order} open on the board`)
  }
  const after = applyPlan(planAddition(add, before, { newId, now: 1 }), before)
  for (const r of RETIRED_FOR_WINNERS_1029) {
    const card = after.tasks.find(c => c.order === r.order && !c.deleted)
    assert.equal(card.status, 'done', `card ${r.order} done`)
    assert.ok(card.detail.endsWith(` ${r.detail}`), 'the reason at the end of the card')
  }
  const tryCard = after.tasks.find(c => c.order === 519 && !c.deleted)
  assert.ok(tryCard && tryCard.who === 'Jon' && tryCard.status === 'todo')
  // the arcade's other cards stay as they were: Jon's try, the arcade on the night, roomMusic
  for (const order of [514, 515, 518]) assert.equal(after.tasks.find(c => c.order === order && !c.deleted)?.status, 'todo', `card ${order} still open`)
  // once only
  const again = applyPlan(planAddition(add, after, { newId, now: 2 }), after)
  assert.deepEqual(again.tasks, after.tasks, 'never twice')
})

// ---- Whack-a-Mouse's pets, 29 Oct 2026 ----------------------------------------

test('29 Oct: the newest; Whack-a-Mouse’s pets, the black cat and the strike words done and plain, a line on Jon’s try, the mice’s points and the menu’s fish on the night card, once only', () => {
  const { before, add, newId } = boardThrough('2026-10-29-mice-pets')
  assert.equal(ADDITIONS[ADDITIONS.indexOf(add) + 1]?.id, '2026-10-29-arcade-menu', 'followed by the arcade’s menu')
  assert.ok(add.tasks === MICE_PETS_1029_TASKS && add.fileTasks === FILED_FOR_MICE_PETS_1029 && add.rewriteTasks === REWRITTEN_FOR_MICE_PETS_1029)
  assert.ok(!add.decisions && !add.retireTasks && !add.answerDecisions, 'it decides and closes nothing')
  assert.deepEqual(MICE_PETS_1029_TASKS.map(t => [t.order, t.who, t.moment, t.status]), [[520, 'Claude Code', 'act4.entryway', 'done'], [521, 'Claude Code', 'act4.entryway', 'done'], [522, 'Claude Code', 'act4.entryway', 'done']])
  const earlier = new Set(before.tasks.map(t => t.order))
  for (const t of MICE_PETS_1029_TASKS) {
    assert.ok(!earlier.has(t.order), `order ${t.order} is new`)
    assert.ok(OWNERS.includes(t.who), `${t.title}: ${t.who}`)
    assert.ok(MOMENT_KEYS.includes(t.moment), t.moment)
    assert.ok(!/\b(npm|kiosk|deploy|repo|seed|stand-in|preview|terminal)\b|\.env|—/i.test(`${t.title} ${t.detail}`), `${t.title}: plain words, the line itself under tech`)
  }
  for (const f of FILED_FOR_MICE_PETS_1029) assert.ok(!/\b(npm|kiosk|deploy|repo|seed|stand-in|preview|terminal)\b|\.env|—/i.test(f.note), 'the line on Jon’s try is plain')
  // Jon's try and the night card are open on the board by number and title
  for (const r of [...FILED_FOR_MICE_PETS_1029, ...REWRITTEN_FOR_MICE_PETS_1029]) {
    const card = before.tasks.find(c => c.order === r.order && !c.deleted)
    assert.ok(card && card.title === r.title && card.status === 'todo', `card ${r.order} open on the board`)
  }
  const after = applyPlan(planAddition(add, before, { newId, now: 1 }), before)
  const card = (order) => after.tasks.find(c => c.order === order && !c.deleted)
  for (const order of [520, 521, 522]) assert.equal(card(order).status, 'done', `card ${order}`)
  assert.ok(card(514).detail.endsWith(` ${FILED_FOR_MICE_PETS_1029[0].note}`), 'the line about the pets at the end of Jon’s try')
  assert.equal(card(514).status, 'todo')
  const was = before.tasks.find(c => c.order === 515)
  assert.equal(card(515).tech, was.tech.replace('57 to 156 for the mice', '45 to 113 for the mice since the pets of 29 Oct (57 to 156 before)'), 'only the mice’s numbers change')
  assert.equal(card(515).detail, was.detail.replace(' (and its key on the menu)', ''), 'the menu’s key is a black cat now: only the treat is a fish')
  assert.notEqual(card(515).detail, was.detail)
  assert.deepEqual(card(515).previous[add.id], { detail: was.detail, tech: was.tech }, 'the old words kept on the card')
  // once only
  const again = applyPlan(planAddition(add, after, { newId, now: 2 }), after)
  assert.deepEqual(again.tasks, after.tasks, 'never twice')
})

test('the arcade menu migration (29 Oct 2026, later): Boo’s face, paws and a flashing top row, done (523), and a line on Jon’s try (514)', () => {
  const { before, add, newId } = boardThrough('2026-10-29-arcade-menu')
  assert.equal(ADDITIONS[ADDITIONS.indexOf(add) + 1]?.id, '2026-10-29-arcade-rework', 'followed by the arcade made again')
  assert.ok(add.tasks === ARCADE_MENU_1029_TASKS && add.fileTasks === FILED_FOR_ARCADE_MENU_1029)
  assert.ok(!add.decisions && !add.retireTasks && !add.rewriteTasks && !add.answerDecisions, 'it decides, closes and rewrites nothing')
  assert.deepEqual(ARCADE_MENU_1029_TASKS.map(t => [t.order, t.who, t.moment, t.status]), [[523, 'Claude Code', 'act4.entryway', 'done']])
  const earlier = new Set(before.tasks.map(t => t.order))
  for (const t of ARCADE_MENU_1029_TASKS) {
    assert.ok(!earlier.has(t.order), `order ${t.order} is new`)
    assert.ok(OWNERS.includes(t.who), `${t.title}: ${t.who}`)
    assert.ok(MOMENT_KEYS.includes(t.moment), t.moment)
    assert.ok(!/\b(npm|kiosk|deploy|repo|seed|stand-in|preview|terminal)\b|\.env|—/i.test(`${t.title} ${t.detail}`), `${t.title}: plain words, the line itself under tech`)
  }
  for (const f of FILED_FOR_ARCADE_MENU_1029) assert.ok(!/\b(npm|kiosk|deploy|repo|seed|stand-in|preview|terminal)\b|\.env|—/i.test(f.note), 'the line on Jon’s try is plain')
  const open = before.tasks.find(c => c.order === 514 && !c.deleted)
  assert.ok(open && open.title === FILED_FOR_ARCADE_MENU_1029[0].title && open.status === 'todo', 'Jon’s try is open on the board by number and title')
  const after = applyPlan(planAddition(add, before, { newId, now: 1 }), before)
  const card = (order) => after.tasks.find(c => c.order === order && !c.deleted)
  assert.equal(card(523).status, 'done')
  assert.equal(card(514).detail, `${open.detail} ${FILED_FOR_ARCADE_MENU_1029[0].note}`, 'the line about the menu at the end of Jon’s try, after the pets’ line')
  assert.equal(card(514).status, 'todo')
  // once only
  const again = applyPlan(planAddition(add, after, { newId, now: 2 }), after)
  assert.deepEqual(again.tasks, after.tasks, 'never twice')
})

// ---- The arcade made again, 29 Oct 2026 (evening) ------------------------------

test('the arcade rework (29 Oct 2026, evening): Jon’s three notes closed by number, the rework done and plain, entrywayGame answered, ghostProof his decision, his try and the night card written again, the rules deck to Claude chat, once only', () => {
  const { before, add, newId } = boardThrough('2026-10-29-arcade-rework')
  const plain = /\b(npm|kiosk|deploy|repo|seed|stand-in|preview|terminal)\b|\.env|—/i
  assert.equal(ADDITIONS[ADDITIONS.indexOf(add) + 1]?.id, '2026-10-29-memory-resend', 'followed by In Duplicate’s board sent again')
  assert.ok(ADDITIONS.indexOf(add) > ADDITIONS.findIndex(a => a.id === '2026-10-29-arcade-menu'), 'after the arcade menu')
  assert.ok(add.tasks === ARCADE_REWORK_1029_TASKS && add.retireTasks === RETIRED_FOR_ARCADE_REWORK_1029 && add.rewriteTasks === REWRITTEN_FOR_ARCADE_REWORK_1029)
  assert.ok(add.answerDecisions === ANSWERED_FOR_ARCADE_REWORK_1029 && add.decisions === ARCADE_REWORK_1029_DECISIONS)
  assert.ok(!add.fileTasks, 'Jon’s try is written again, not added to')
  // Jon's three Game test notes, closed by number (the Game test tab files them, not the repo)
  assert.deepEqual(RETIRED_FOR_ARCADE_REWORK_1029.map(r => r.order), [10009, 10010, 10011])
  for (const r of RETIRED_FOR_ARCADE_REWORK_1029) {
    assert.match(r.detail, /^Fixed 29 Oct 2026: .+ Try it again\.$/)
    assert.ok(!plain.test(r.detail), `note ${r.order}: plain words`)
  }
  // the rework done, the rules deck for Claude chat
  assert.deepEqual(ARCADE_REWORK_1029_TASKS.map(t => [t.order, t.who, t.moment, t.status]), [[524, 'Claude Code', 'act4.entryway', 'done'], [525, 'Claude chat', 'act1.rules', 'todo'], [526, 'Claude Code', 'allnight', 'done'], [527, 'Claude Code', 'act4.puzzle', 'todo'], [528, 'Claude Code', 'act4.entryway', 'done'], [529, 'Claude Code', 'allnight', 'todo']])
  const earlier = new Set(before.tasks.map(t => t.order))
  for (const t of ARCADE_REWORK_1029_TASKS) {
    assert.ok(!earlier.has(t.order), `order ${t.order} is new`)
    assert.ok(OWNERS.includes(t.who), `${t.title}: ${t.who}`)
    assert.ok(MOMENT_KEYS.includes(t.moment), t.moment)
    assert.ok(!plain.test(`${t.title} ${t.detail}`), `${t.title}: plain words, the line itself under tech`)
  }
  // entrywayGame was open and is answered; ghostProof is new, open and Jon's
  assert.equal(before.decisions.entrywayGame?.answer, null, 'entrywayGame open before')
  assert.deepEqual(Object.keys(ANSWERED_FOR_ARCADE_REWORK_1029), ['entrywayGame'])
  assert.ok(!before.decisions.ghostProof, 'ghostProof is a new question')
  assert.deepEqual(ARCADE_REWORK_1029_DECISIONS.map(d => [d.key, d.answer, d.moment, d.options.length]), [['ghostProof', null, 'freeze', 2]])
  // Jon's try and the night card are open on the board by number and title
  for (const r of REWRITTEN_FOR_ARCADE_REWORK_1029) {
    const card = before.tasks.find(c => c.order === r.order && !c.deleted)
    assert.ok(card && card.title === r.title && card.status === 'todo', `card ${r.order} open on the board`)
    assert.ok(!plain.test(`${r.set.title ?? ''} ${r.set.detail}`), `card ${r.order}: plain words`)
  }
  const after = applyPlan(planAddition(add, before, { newId, now: 1 }), before)
  const card = (order) => after.tasks.find(c => c.order === order && !c.deleted)
  const was = (order) => before.tasks.find(c => c.order === order && !c.deleted)
  assert.equal(card(524).status, 'done')
  assert.equal(card(525).status, 'todo')
  assert.equal(card(514).detail, REWRITTEN_FOR_ARCADE_REWORK_1029[0].set.detail, 'Jon’s try written again')
  assert.equal(card(514).status, 'todo')
  assert.equal(card(514).title, was(514).title)
  assert.deepEqual(card(514).previous[add.id], { detail: was(514).detail, tech: was(514).tech }, 'the old words kept on the card, the pets’ and the menu’s lines with them')
  assert.equal(card(515).title, 'The arcade on the night')
  assert.ok(!/if entrywayGame|Only if you answer/.test(`${card(515).title} ${card(515).detail}`), 'no longer an if')
  assert.equal(card(515).previous[add.id].title, 'The arcade on the night, if entrywayGame picks it')
  // docs/boo-arcade.md §8 sends its open questions to card 515 by its new title
  const doc = readFileSync(new URL('../../docs/boo-arcade.md', import.meta.url), 'utf8')
  assert.match(doc, /settled by the build \(5 November\)/, 'since 5 Nov 2026 the doc says the build settled it (card 515 done)')
  assert.equal(after.decisions.entrywayGame.answer, ANSWERED_FOR_ARCADE_REWORK_1029.entrywayGame)
  assert.equal(after.decisions.ghostProof.answer, null)
  assert.ok(openDecisions(decisionList(after)).some(d => d.key === 'ghostProof'), 'ghostProof on the open list')
  assert.ok(!openDecisions(decisionList(after)).some(d => d.key === 'entrywayGame'), 'entrywayGame off it')
  // once only
  const again = applyPlan(planAddition(add, after, { newId, now: 2 }), after)
  assert.deepEqual(again.tasks, after.tasks, 'never twice')
  assert.deepEqual(again.decisions, after.decisions, 'never twice')
})

// ---- In Duplicate's finished board sent again, 29 Oct 2026 (night) ------------

test('the In Duplicate resend migration (29 Oct 2026, night): after the arcade rework, before never a note; card 527 done by number and title, in plain words, once only', () => {
  const { before, add, newId } = boardThrough('2026-10-29-memory-resend')
  const plain = /\b(npm|kiosk|deploy|repo|seed|stand-in|preview|terminal)\b|\.env|—/i
  assert.equal(ADDITIONS[ADDITIONS.indexOf(add) + 1]?.id, '2026-10-29-never-a-note', 'followed by never a note on a guest’s screen')
  assert.equal(add.retireTasks, RETIRED_FOR_MEMORY_RESEND_1029)
  assert.ok(!add.tasks && !add.decisions && !add.fileTasks && !add.rewriteTasks && !add.answerDecisions, 'it closes one card and nothing else')
  assert.deepEqual(RETIRED_FOR_MEMORY_RESEND_1029.map(r => [r.order, r.title]), [[527, 'In Duplicate: a finished board the house did not hear is never sent again']])
  for (const r of RETIRED_FOR_MEMORY_RESEND_1029) {
    assert.match(r.detail, /^Done 29 Oct 2026: /)
    assert.ok(!plain.test(r.detail), 'plain words')
    assert.ok(r.detail.includes('“The Library did not hear that. Trying again.”'), 'the screen’s own line')
  }
  // the card is open on the board, filed by the arcade rework, by number and title
  const open = before.tasks.find(c => c.order === 527 && !c.deleted)
  assert.ok(open && open.title === RETIRED_FOR_MEMORY_RESEND_1029[0].title && open.status === 'todo' && open.who === 'Claude Code', 'card 527 open on the board')
  const after = applyPlan(planAddition(add, before, { newId, now: 1 }), before)
  const card = after.tasks.find(c => c.order === 527 && !c.deleted)
  assert.equal(card.status, 'done')
  assert.equal(card.detail, `${open.detail} ${RETIRED_FOR_MEMORY_RESEND_1029[0].detail}`, 'what was done, after what was found')
  assert.deepEqual(after.tasks.filter(c => c.order !== 527), before.tasks.filter(c => c.order !== 527), 'no other card changes')
  // once only
  const again = applyPlan(planAddition(add, after, { newId, now: 2 }), after)
  assert.deepEqual(again.tasks, after.tasks, 'never twice')
})

// ---- Never a note about the game on a guest's screen, 29 Oct 2026 (night) -----

test('the never-a-note migration (29 Oct 2026, night): after the arcade rework; card 529 done by number and title, the news flash card new, quietWords Jon’s with the built words its first option, in plain words, once only', () => {
  const { before, add, newId } = boardThrough('2026-10-29-never-a-note')
  const plain = /\b(npm|kiosk|deploy|repo|seed|stand-in|preview|terminal)\b|\.env|—/i
  assert.ok(ADDITIONS.indexOf(add) > ADDITIONS.findIndex(a => a.id === '2026-10-29-arcade-rework'), 'after the arcade rework')
  assert.ok(add.retireTasks === RETIRED_FOR_NEVER_A_NOTE_1029 && add.tasks === NEVER_A_NOTE_1029_TASKS && add.decisions === NEVER_A_NOTE_1029_DECISIONS)
  assert.ok(!add.fileTasks && !add.rewriteTasks && !add.answerDecisions, 'it answers and rewrites nothing')
  // card 529, closed by number and title
  assert.deepEqual(RETIRED_FOR_NEVER_A_NOTE_1029.map(r => [r.order, r.title]), [[529, 'Never a note about the game on a guest’s screen']])
  for (const r of RETIRED_FOR_NEVER_A_NOTE_1029) {
    assert.match(r.detail, /^Done 29 Oct 2026: /)
    assert.ok(!plain.test(r.detail), 'plain words')
  }
  const open = before.tasks.find(c => c.order === 529 && !c.deleted)
  assert.ok(open && open.title === RETIRED_FOR_NEVER_A_NOTE_1029[0].title && open.status === 'todo' && open.who === 'Claude Code', 'card 529 open on the board')
  // the news flash's note: a new card for Claude Code
  assert.deepEqual(NEVER_A_NOTE_1029_TASKS.map(t => [t.order, t.who, t.moment, t.status]), [[530, 'Claude Code', 'act2.news', 'todo']])
  const earlier = new Set(before.tasks.map(t => t.order))
  for (const t of NEVER_A_NOTE_1029_TASKS) {
    assert.ok(!earlier.has(t.order), `order ${t.order} is new`)
    assert.ok(OWNERS.includes(t.who), `${t.title}: ${t.who}`)
    assert.ok(MOMENT_KEYS.includes(t.moment), t.moment)
    assert.match(t.by, /^2026-1[01]-\d{2}$/)
    assert.ok(!plain.test(`${t.title} ${t.detail}`), `${t.title}: plain words, the line itself under tech`)
  }
  // quietWords: new, open, Jon's; its first option quotes the words the house says today
  assert.ok(!before.decisions.quietWords, 'quietWords is a new question')
  assert.deepEqual(NEVER_A_NOTE_1029_DECISIONS.map(d => [d.key, d.answer, d.moment, d.options.length]), [['quietWords', null, 'allnight', 2]])
  for (const d of NEVER_A_NOTE_1029_DECISIONS) for (const k of ['question', 'note']) assert.ok(!d[k].includes('—'), `${d.key}.${k}`)
  const deal = readFileSync(new URL('../../functions/lib/deal.js', import.meta.url), 'utf8')
  const station = readFileSync(new URL('../../functions/lib/station.js', import.meta.url), 'utf8')
  const hint = deal.match(/export const HINT_QUIET = '([^']+)'/)[1].replace('[CAT]', 'Miss Boo LaRue')
  const study = station.match(/export const STUDY_QUIET = '([^']+)'/)[1]
  const built = NEVER_A_NOTE_1029_DECISIONS[0].options[0]
  assert.ok(built.includes(`“${hint}”`) && built.includes(`“${study}”`), 'the built words, word for word')
  const after = applyPlan(planAddition(add, before, { newId, now: 1 }), before)
  const card = (order) => after.tasks.find(c => c.order === order && !c.deleted)
  assert.equal(card(529).status, 'done')
  assert.equal(card(529).detail, `${open.detail} ${RETIRED_FOR_NEVER_A_NOTE_1029[0].detail}`, 'what was done, after what was found')
  assert.equal(card(530).status, 'todo')
  assert.equal(after.decisions.quietWords.answer, null)
  assert.ok(openDecisions(decisionList(after)).some(d => d.key === 'quietWords'), 'quietWords on the open list')
  // once only
  const again = applyPlan(planAddition(add, after, { newId, now: 2 }), after)
  assert.deepEqual(again.tasks, after.tasks, 'never twice')
  assert.deepEqual(again.decisions, after.decisions, 'never twice')
})

// ---- The Boo Arcade handoff, 30 Oct 2026 (Jon's playtest) ---------------------

test('the Boo Arcade migration (30 Oct 2026): after never-a-note, before Salem\'s board; nine new cards, all done and plain, one a job of the handoff; a line on Jon’s try and the night card; arcadeOverall and arcadeExit new, open, Jon’s, their built defaults first; once only', () => {
  const { before, add, newId } = boardThrough('2026-10-30-boo-arcade')
  const plain = /\b(npm|kiosk|deploy|repo|seed|stand-in|preview|terminal|callable|prop|state)\b|\.env|—/i
  assert.equal(ADDITIONS[ADDITIONS.indexOf(add) + 1]?.id, '2026-10-31-salem-board', 'before Salem’s board (31 Oct)')
  assert.equal(ADDITIONS[ADDITIONS.indexOf(add) - 1]?.id, '2026-10-29-never-a-note', 'after never a note on a guest’s screen')
  assert.ok(add.tasks === ARCADE_PLAYTEST_1030_TASKS && add.fileTasks === FILED_FOR_ARCADE_PLAYTEST_1030 && add.decisions === ARCADE_PLAYTEST_1030_DECISIONS)
  assert.ok(!add.retireTasks && !add.rewriteTasks && !add.answerDecisions, 'it closes and answers nothing that was open')
  // the cards: one a job, 531 to 539, done the same day, each saying what was done
  assert.deepEqual(ARCADE_PLAYTEST_1030_TASKS.map(t => t.order), [531, 532, 533, 534, 535, 536, 537, 538, 539])
  const earlier = new Set(before.tasks.map(t => t.order))
  for (const t of ARCADE_PLAYTEST_1030_TASKS) {
    assert.ok(!earlier.has(t.order), `order ${t.order} is new`)
    assert.equal(t.status, 'done')
    assert.equal(t.who, 'Claude Code')
    assert.ok(MOMENT_KEYS.includes(t.moment), t.moment)
    assert.match(t.detail, /^Done 30 Oct 2026/)
    assert.ok(!plain.test(`${t.title} ${t.detail}`), `${t.title}: plain words`)
    assert.ok(!t.by, 'done: no by date')
  }
  assert.equal(ARCADE_PLAYTEST_1030_TASKS.find(t => t.order === 539).moment, 'act7.result', 'the achievements card at the reveal')
  assert.ok(ARCADE_PLAYTEST_1030_TASKS.filter(t => t.moment === 'act4.entryway').length === 8, 'the rest in the Entryway')
  // Jon's try and the night card get a line each, by number and title, on cards open on the board
  assert.deepEqual(FILED_FOR_ARCADE_PLAYTEST_1030.map(f => f.order), [514, 515])
  for (const f of FILED_FOR_ARCADE_PLAYTEST_1030) {
    const open = before.tasks.find(c => c.order === f.order && !c.deleted)
    assert.ok(open && open.title === f.title && open.status === 'todo', `card ${f.order} open on the board`)
    assert.match(f.note, /^\(30 Oct 2026: /)
    assert.ok(!plain.test(f.note), `${f.order}: plain words`)
  }
  // the two questions: new, open, Jon's, the built default the first option, plain
  for (const d of ARCADE_PLAYTEST_1030_DECISIONS) {
    assert.ok(!before.decisions[d.key], `${d.key} is a new question`)
    assert.equal(d.answer, null)
    assert.equal(d.options.length, 2)
    assert.ok(MOMENT_KEYS.includes(d.moment), d.moment)
    assert.match(d.note, /^Default: .*built 30 Oct 2026/)
    for (const k of ['question', 'note']) assert.ok(!d[k].includes('—'), `${d.key}.${k}`)
  }
  assert.deepEqual(ARCADE_PLAYTEST_1030_DECISIONS.map(d => [d.key, d.moment]), [['arcadeOverall', 'act7.result'], ['arcadeExit', 'act4.entryway']])
  assert.match(ARCADE_PLAYTEST_1030_DECISIONS[0].options[0], /^By place/)
  assert.match(ARCADE_PLAYTEST_1030_DECISIONS[1].options[0], /^They can play it again/)
  // applied
  const after = applyPlan(planAddition(add, before, { newId, now: 1 }), before)
  const card = (order) => after.tasks.find(c => c.order === order && !c.deleted)
  for (const t of ARCADE_PLAYTEST_1030_TASKS) assert.equal(card(t.order).status, 'done')
  for (const f of FILED_FOR_ARCADE_PLAYTEST_1030) {
    const was = before.tasks.find(c => c.order === f.order && !c.deleted)
    assert.ok(card(f.order).detail.endsWith(f.note) && card(f.order).detail.startsWith(was.detail), `${f.order}: the line filed after what was there`)
    assert.equal(card(f.order).status, 'todo', `${f.order} stays open`)
  }
  assert.equal(after.decisions.arcadeOverall.answer, null)
  assert.equal(after.decisions.arcadeExit.answer, null)
  assert.ok(openDecisions(decisionList(after)).some(d => d.key === 'arcadeOverall') && openDecisions(decisionList(after)).some(d => d.key === 'arcadeExit'), 'both on the open list')
  assert.deepEqual(after.tasks.filter(c => ![514, 515, ...ARCADE_PLAYTEST_1030_TASKS.map(t => t.order)].includes(c.order)), before.tasks.filter(c => ![514, 515].includes(c.order)), 'no other card changes')
  // once only
  const again = applyPlan(planAddition(add, after, { newId, now: 2 }), after)
  assert.deepEqual(again.tasks, after.tasks, 'never twice')
  assert.deepEqual(again.decisions, after.decisions, 'never twice')
})

test('Salem’s board migration (31 Oct 2026): before the second arcade playtest; four new cards, three done and one for Jon, plain; Jon’s Game test note 10012 closed by number and title; once only', () => {
  const { before, add, newId } = boardThrough('2026-10-31-salem-board')
  const plain = /\b(npm|kiosk|deploy|repo|seed|stand-in|preview|terminal|callable|prop|state)\b|\.env|—/i
  assert.equal(ADDITIONS[ADDITIONS.indexOf(add) + 1]?.id, '2026-10-31-arcade-playtest', 'before the second arcade playtest (31 Oct, evening)')
  assert.ok(add.tasks === SALEM_1031_TASKS && add.retireTasks === RETIRED_FOR_SALEM_1031)
  assert.ok(!add.fileTasks && !add.rewriteTasks && !add.answerDecisions && !add.decisions, 'no question: nothing for Jon to decide')
  assert.deepEqual(SALEM_1031_TASKS.map(t => [t.order, t.status, t.who]), [[540, 'done', 'Claude Code'], [541, 'done', 'Claude Code'], [542, 'done', 'Claude Code'], [543, 'todo', 'Jon']])
  const earlier = new Set(before.tasks.map(t => t.order))
  for (const t of SALEM_1031_TASKS) {
    assert.ok(!earlier.has(t.order), `order ${t.order} is new`)
    assert.ok(MOMENT_KEYS.includes(t.moment), t.moment)
    if (t.status === 'done') assert.match(t.detail, /^Done 31 Oct 2026/)
    assert.ok(!plain.test(`${t.title} ${t.detail}`), `${t.title}: plain words`)
    assert.ok(!t.by, 'no by date')
  }
  assert.ok(SALEM_1031_TASKS.slice(0, 3).every(t => t.moment === 'act4.orangerie'), 'the three built cards in the Orangerie')
  assert.equal(SALEM_1031_TASKS[3].moment, 'freeze', 'Jon’s Home-app card before the second tech run')
  assert.match(SALEM_1031_TASKS[3].detail, /No Response/, 'it says what to take out of each scene')
  assert.match(SALEM_1031_TASKS[2].detail, /partially succeeded/, 'the built card says what was found')
  assert.ok(SALEM_1031_TASKS[2].tech, 'the technical detail under its own heading, out of the plain words')
  // the note: closed by number, with the fix, and the Game test tab's chip goes back to Not tried yet
  assert.deepEqual(RETIRED_FOR_SALEM_1031.map(r => r.order), [10012])
  assert.match(RETIRED_FOR_SALEM_1031[0].detail, /^Fixed 31 Oct 2026: .*Try it again\.$/)
  // applied twice, nothing doubles
  let state = applyPlan(planAddition(add, before, { newId, now: 1 }), before)
  const once = state.tasks.filter(t => t.order >= 540 && t.order <= 543).length
  state = applyPlan(planAddition(add, state, { newId, now: 2 }), state)
  assert.equal(state.tasks.filter(t => t.order >= 540 && t.order <= 543).length, once, 'once only')
  assert.equal(once, 4)
})

test('the second arcade playtest migration (31 Oct 2026, evening): before the music Shortcuts; six new cards, all done and plain, the round length under the warning; a line on Jon’s try; arcadeWarmUp new, open, Jon’s, its built default first; once only', () => {
  const { before, add, newId } = boardThrough('2026-10-31-arcade-playtest')
  const plain = /\b(npm|kiosk|deploy|repo|seed|stand-in|preview|terminal|callable|prop|state|constant)\b|\.env|—/i
  assert.equal(ADDITIONS[ADDITIONS.indexOf(add) + 1]?.id, '2026-10-31-music-shortcuts', 'before the music Shortcuts')
  assert.ok(add.tasks === ARCADE_PLAYTEST_1031_TASKS && add.fileTasks === FILED_FOR_ARCADE_PLAYTEST_1031 && add.decisions === ARCADE_PLAYTEST_1031_DECISIONS)
  assert.ok(!add.retireTasks && !add.rewriteTasks && !add.answerDecisions, 'nothing closed or answered')
  assert.deepEqual(ARCADE_PLAYTEST_1031_TASKS.map(t => [t.order, t.status, t.who]), [544, 545, 546, 547, 548, 549].map(n => [n, 'done', 'Claude Code']))
  const earlier = new Set(before.tasks.map(t => t.order))
  for (const t of ARCADE_PLAYTEST_1031_TASKS) {
    assert.ok(!earlier.has(t.order), `order ${t.order} is new`)
    assert.ok(MOMENT_KEYS.includes(t.moment), t.moment)
    assert.match(t.detail, /^Done 31 Oct 2026/)
    assert.ok(!plain.test(`${t.title} ${t.detail}`), `${t.title}: plain words`)
    assert.ok(!t.by, 'no by date')
  }
  assert.ok(ARCADE_PLAYTEST_1031_TASKS.slice(0, 5).every(t => t.moment === 'act4.entryway'), 'the arcade cards in the Entryway')
  assert.equal(ARCADE_PLAYTEST_1031_TASKS[5].moment, 'act4.warn', 'the round length is the act’s, under its warning')
  assert.match(ARCADE_PLAYTEST_1031_TASKS[5].detail, /fifteen minutes/)
  assert.match(ARCADE_PLAYTEST_1031_TASKS[1].detail, /both dials/, 'the tail card says what was not found')
  // the line on Jon's try: card 514 by number and title, a note that names what to watch for
  assert.deepEqual(FILED_FOR_ARCADE_PLAYTEST_1031.map(f => f.order), [514])
  assert.match(FILED_FOR_ARCADE_PLAYTEST_1031[0].note, /^\(31 Oct 2026: .*both dials.*\)$/)
  assert.ok(before.tasks.some(t => t.order === 514 && t.title === FILED_FOR_ARCADE_PLAYTEST_1031[0].title), '514 is on the board under that title')
  // the question: Jon's, open, its built default first
  assert.deepEqual(ARCADE_PLAYTEST_1031_DECISIONS.map(d => [d.key, d.answer, d.moment]), [['arcadeWarmUp', null, 'act4.entryway']])
  assert.ok(!before.decisions.arcadeWarmUp, 'new')
  assert.match(ARCADE_PLAYTEST_1031_DECISIONS[0].options[0], /^No warm-up/)
  assert.match(ARCADE_PLAYTEST_1031_DECISIONS[0].note, /^Default: no warm-up, nothing built/)
  // applied twice, nothing doubles
  let state = applyPlan(planAddition(add, before, { newId, now: 1 }), before)
  const once = state.tasks.filter(t => t.order >= 544 && t.order <= 549).length
  const after = applyPlan(planAddition(add, state, { newId, now: 2 }), state)
  assert.equal(after.tasks.filter(t => t.order >= 544 && t.order <= 549).length, once, 'once only')
  assert.equal(once, 6)
  assert.equal(after.decisions.arcadeWarmUp.answer, null)
  assert.deepEqual(after.decisions, state.decisions, 'the question never twice')
})

test('the music Shortcuts migration (31 Oct 2026, evening): before the arcade notes; one done card and one for Jon, plain; once only', () => {
  const { before, add, newId } = boardThrough('2026-10-31-music-shortcuts')
  const plain = /\b(npm|kiosk|deploy|repo|seed|stand-in|preview|terminal|callable|prop|state)\b|\.env|—/i
  assert.equal(ADDITIONS[ADDITIONS.indexOf(add) + 1]?.id, '2026-11-01-arcade-notes', 'before the arcade notes')
  assert.ok(add.tasks === MUSIC_SHORTCUTS_1031_TASKS && !add.retireTasks && !add.decisions)
  assert.deepEqual(MUSIC_SHORTCUTS_1031_TASKS.map(t => [t.order, t.status, t.who, t.moment]), [[550, 'done', 'Claude Code', 'freeze'], [551, 'todo', 'Jon', 'freeze']])
  const earlier = new Set(before.tasks.map(t => t.order))
  for (const t of MUSIC_SHORTCUTS_1031_TASKS) {
    assert.ok(!earlier.has(t.order), `order ${t.order} is new`)
    assert.ok(!plain.test(`${t.title} ${t.detail}`), `${t.title}: plain words`)
    assert.ok(t.tech, 'the technical line under its own heading')
  }
  for (const name of ['Default Jazz', 'Default Jazz 20%', 'Lightbulb Moment Music', 'Get Off My Grass Game Music', 'Intense Music 35%', 'Intense Music 60%', 'Credit Roll Music']) assert.ok(MUSIC_SHORTCUTS_1031_TASKS[0].detail.includes(name), name)
  assert.match(MUSIC_SHORTCUTS_1031_TASKS[1].detail, /PANIC/, "Jon's stop Shortcut")
  let state = applyPlan(planAddition(add, before, { newId, now: 1 }), before)
  const once = state.tasks.filter(t => t.order >= 550 && t.order <= 551).length
  state = applyPlan(planAddition(add, state, { newId, now: 2 }), state)
  assert.equal(state.tasks.filter(t => t.order >= 550 && t.order <= 551).length, once)
  assert.equal(once, 2)
})

test('the arcade notes migration (1 Nov 2026): before the Study\'s stop; five done cards in the Entryway and a job in the Study, plain; a line on Jon\'s try; one question; nothing closed; once only', () => {
  const { before, add, newId } = boardThrough('2026-11-01-arcade-notes')
  const plain = /\b(npm|kiosk|deploy|repo|seed|stand-in|preview|terminal|callable|prop|state|constant)\b|\.env|—/i
  assert.equal(ADDITIONS[ADDITIONS.indexOf(add) + 1]?.id, '2026-11-01-study-stop', 'before the Study\'s stop')
  assert.ok(add.tasks === ARCADE_NOTES_1101_TASKS && add.fileTasks === FILED_FOR_ARCADE_NOTES_1101 && add.decisions === ARCADE_NOTES_1101_DECISIONS)
  assert.ok(!add.retireTasks && !add.rewriteTasks && !add.answerDecisions, 'nothing closed or answered')
  assert.deepEqual(ARCADE_NOTES_1101_TASKS.map(t => [t.order, t.status, t.who, t.moment]), [...[552, 553, 554, 555, 556].map(n => [n, 'done', 'Claude Code', 'act4.entryway']), [557, 'todo', 'Claude Code', 'act4.study']])
  const earlier = new Set(before.tasks.map(t => t.order))
  for (const t of ARCADE_NOTES_1101_TASKS) {
    assert.ok(!earlier.has(t.order), `order ${t.order} is new`)
    assert.ok(MOMENT_KEYS.includes(t.moment), t.moment)
    assert.match(t.detail, t.status === 'done' ? /^Done 1 Nov 2026/ : /^Found 1 Nov 2026/)
    assert.ok(!plain.test(`${t.title} ${t.detail}`), `${t.title}: plain words`)
    assert.ok(!t.by, 'no by date')
  }
  assert.match(ARCADE_NOTES_1101_TASKS[3].detail, /cannot follow your finger/, 'the slide card says the limit')
  assert.match(ARCADE_NOTES_1101_TASKS[4].detail, /Much faster/, 'the Knock card says what it undoes')
  assert.match(ARCADE_NOTES_1101_TASKS[4].detail, /about a third fewer things come/, 'and that the slower moves bring fewer things')
  assert.match(ARCADE_NOTES_1101_TASKS[5].detail, /card 549/, 'the Study card names the done card it corrects')
  // the line on Jon's try: card 514 by number and title, a note that names what to watch for
  assert.deepEqual(FILED_FOR_ARCADE_NOTES_1101.map(f => f.order), [514])
  assert.match(FILED_FOR_ARCADE_NOTES_1101[0].note, /^\(1 Nov 2026: .*a slow slide.*Two lines earlier on this card are out of date.*\)$/)
  assert.ok(before.tasks.some(t => t.order === 514 && t.title === FILED_FOR_ARCADE_NOTES_1101[0].title), '514 is on the board under that title')
  // the question: Jon's, open, its built default first
  assert.deepEqual(ARCADE_NOTES_1101_DECISIONS.map(d => [d.key, d.answer, d.moment]), [['arcadeTrioTime', null, 'act4.entryway']])
  assert.ok(!before.decisions.arcadeTrioTime, 'new')
  assert.match(ARCADE_NOTES_1101_DECISIONS[0].options[0], /^Leave it as built/)
  assert.match(ARCADE_NOTES_1101_DECISIONS[0].note, /^Default: left as built/)
  // applied twice, nothing doubles
  let state = applyPlan(planAddition(add, before, { newId, now: 1 }), before)
  const once = state.tasks.filter(t => t.order >= 552 && t.order <= 557).length
  assert.equal(once, 6)
  const tried = state.tasks.find(t => t.order === 514)
  assert.ok(tried.detail.endsWith(FILED_FOR_ARCADE_NOTES_1101[0].note), 'the line lands on the card')
  const after = applyPlan(planAddition(add, state, { newId, now: 2 }), state)
  assert.equal(after.tasks.filter(t => t.order >= 552 && t.order <= 557).length, once, 'once only')
  assert.deepEqual(after.decisions, state.decisions, 'the question never twice')
})

test('the Study stop migration (1 Nov 2026): last; card 557 done by number and title, a line on the blackout sound, which stays open, one on the tech run for Pause and one on the rules deck\'s card; plain; once only', () => {
  const { before, add, newId } = boardThrough('2026-11-01-study-stop')
  const plain = /\b(npm|kiosk|deploy|repo|seed|stand-in|preview|terminal|callable|prop|state|constant)\b|\.env|—/i
  assert.equal(ADDITIONS.at(-15), add, 'the migration before the two of 5 Nov 2026, the sweep of 6 Nov and the postmortem of 11 Nov')
  assert.ok(add.retireTasks === RETIRED_FOR_STUDY_STOP_1101 && add.fileTasks === FILED_FOR_STUDY_STOP_1101)
  assert.ok(!add.tasks && !add.decisions && !add.rewriteTasks && !add.answerDecisions, 'no new cards, nothing answered')
  assert.deepEqual(RETIRED_FOR_STUDY_STOP_1101.map(r => r.order), [557])
  assert.deepEqual(FILED_FOR_STUDY_STOP_1101.map(f => f.order), [134, 332, 525])
  const done = RETIRED_FOR_STUDY_STOP_1101[0], note = FILED_FOR_STUDY_STOP_1101[0].note, pause = FILED_FOR_STUDY_STOP_1101[1].note, deck = FILED_FOR_STUDY_STOP_1101[2].note
  assert.match(done.detail, /^Done 1 Nov 2026, your word \("make the stop 15mins"\)/)
  assert.match(done.detail, /Start the Study/, 'how it reaches the study Mac')
  assert.match(note, /^\(1 Nov 2026: your scream.*has not heard it.*\)$/)
  assert.match(pause, /^\(1 Nov 2026: press Pause and then Resume.*\)$/)
  assert.match(pause, /Resume button on the pause card/, 'what is there now, not the tabs a first try kept')
  assert.match(deck, /^\(1 Nov 2026: a second job.*ten minutes a room.*Steward Handbook.*\)$/)
  for (const line of [done.detail, note, pause, deck]) assert.ok(!plain.test(line) && !PLAIN.test(line), `plain words: ${line.slice(0, 40)}`)
  const study = before.tasks.find(t => t.order === 557), sound = before.tasks.find(t => t.order === 134)
  assert.ok(study.title === done.title && study.status === 'todo', '557 is open on the board under that title')
  assert.ok(sound.title === FILED_FOR_STUDY_STOP_1101[0].title && sound.status !== 'done', '134 is open on the board under that title')
  const script = before.tasks.find(t => t.order === 525)
  assert.ok(script.title === FILED_FOR_STUDY_STOP_1101[2].title && script.status !== 'done' && script.who === 'Claude chat', '525 is open, and Claude chat\'s, under that title')
  // applied twice, the card closes once and the line lands once
  const state = applyPlan(planAddition(add, before, { newId, now: 1 }), before)
  const closed = state.tasks.find(t => t.order === 557)
  assert.equal(closed.status, 'done')
  assert.ok(closed.detail.startsWith(study.detail) && closed.detail.endsWith(done.detail), 'what was found stays on the card')
  const heard = state.tasks.find(t => t.order === 134)
  assert.notEqual(heard.status, 'done', 'open until Jon has heard it')
  assert.ok(heard.detail.endsWith(note))
  assert.equal(state.tasks.length, before.tasks.length, 'no new cards')
  const after = applyPlan(planAddition(add, state, { newId, now: 2 }), state)
  assert.equal(after.tasks.find(t => t.order === 134).detail, heard.detail, 'once only')
  assert.equal(after.tasks.find(t => t.order === 557).detail, closed.detail, 'once only')
})

// ---- the arcade on the night, 5 Nov 2026 ----------------------------------------

test('the arcade on the night (5 Nov 2026): last; card 515 done by number and title, two jobs for Jon, lines on his try and the tech run, three questions open with their defaults; plain; once only', () => {
  const { before, add, newId } = boardThrough('2026-11-05-arcade-night')
  const plain = /\b(npm|kiosk|deploy|repo|seed|stand-in|preview|terminal|callable|prop|state|constant)\b|\.env|—/i
  assert.equal(ADDITIONS.at(-14), add, 'the migration before the three cards of the same session, the sweep of 6 Nov and the postmortem of 11 Nov')
  assert.ok(add.tasks === ARCADE_NIGHT_1105_TASKS && add.retireTasks === RETIRED_FOR_ARCADE_NIGHT_1105 && add.fileTasks === FILED_FOR_ARCADE_NIGHT_1105 && add.decisions === ARCADE_NIGHT_1105_DECISIONS)
  assert.deepEqual(ARCADE_NIGHT_1105_TASKS.map(t => [t.order, t.who, t.moment, t.status, t.by]), [[558, 'Jon', 'act4.entryway', 'todo', '2026-11-11'], [559, 'Jon', 'act4.entryway', 'todo', '2026-11-11']])
  assert.deepEqual(RETIRED_FOR_ARCADE_NIGHT_1105.map(r => r.order), [515])
  assert.deepEqual(FILED_FOR_ARCADE_NIGHT_1105.map(f => f.order), [514, 332])
  assert.deepEqual(ARCADE_NIGHT_1105_DECISIONS.map(d => [d.key, d.moment, d.answer]), [['arcadeClueRung', 'act4.entryway', null], ['arcadeCamera', 'act4.entryway', null], ['arcadeSound', 'act4.entryway', null]])
  const done = RETIRED_FOR_ARCADE_NIGHT_1105[0]
  assert.match(done.detail, /^Done 5 Nov 2026 \("Cook it all up\. We are 1 week out!"\)/)
  assert.match(done.detail, /No motive is crossed off there/, 'Boo\'s cross-off is not replaced (Jon, 29 Oct)')
  assert.match(done.detail, /cards 558 and 559/, 'not tried on the real Mac: Jon\'s two jobs')
  for (const line of [...ARCADE_NIGHT_1105_TASKS.map(t => t.detail), done.detail, ...FILED_FOR_ARCADE_NIGHT_1105.map(f => f.note), ...ARCADE_NIGHT_1105_DECISIONS.map(d => d.note + ' ' + d.question)]) assert.ok(!plain.test(line) && !PLAIN.test(line), `plain words: ${line.slice(0, 40)}`)
  for (const d of ARCADE_NIGHT_1105_DECISIONS) assert.ok(/^Default: /.test(d.note) && d.options.length >= 2, `${d.key}: a default and the choices`)
  const night = before.tasks.find(t => t.order === 515), tryCard = before.tasks.find(t => t.order === 514), run = before.tasks.find(t => t.order === 332)
  assert.ok(night.title === done.title && night.status === 'todo', '515 is open on the board under that title')
  assert.ok(tryCard.title === FILED_FOR_ARCADE_NIGHT_1105[0].title && run.title === FILED_FOR_ARCADE_NIGHT_1105[1].title, '514 and 332 are on the board under those titles')
  assert.ok(!before.tasks.some(t => t.order === 558 || t.order === 559), 'new numbers')
  const state = applyPlan(planAddition(add, before, { newId, now: 1 }), before)
  const closed = state.tasks.find(t => t.order === 515)
  assert.equal(closed.status, 'done')
  assert.ok(closed.detail.startsWith(night.detail) && closed.detail.endsWith(done.detail), 'what was asked stays on the card')
  assert.equal(state.tasks.length, before.tasks.length + 2, 'two new cards')
  for (const d of ARCADE_NIGHT_1105_DECISIONS) assert.equal(state.decisions[d.key].answer, null)
  assert.ok(openDecisions(decisionList(state)).some(d => d.key === 'arcadeSound'), 'on the open list for Jon')
  const again = applyPlan(planAddition(add, state, { newId, now: 2 }), state)
  assert.equal(again.tasks.length, state.tasks.length, 'once only')
  assert.equal(again.tasks.find(t => t.order === 514).detail, state.tasks.find(t => t.order === 514).detail, 'once only')
})

// ---- three cards, 5 Nov 2026 ---------------------------------------------------

test('the three cards (5 Nov 2026): last; roomMusic answered as the Canon has it, 518, 530 and 311 done by number and title, the two old household cards retired and the two new ones added, never erased; plain; once only', () => {
  const { before, add, newId } = boardThrough('2026-11-05-three-cards')
  const plain = /\b(npm|kiosk|deploy|repo|seed|stand-in|preview|terminal|callable|prop|state|constant)\b|\.env|—/i
  assert.equal(ADDITIONS.at(-13), add, 'the migration before the sweep of 6 Nov and the postmortem of 11 Nov')
  assert.ok(add.answerDecisions === ANSWERED_FOR_THREE_CARDS_1105 && add.retireTasks === RETIRED_FOR_THREE_CARDS_1105 && add.retireItems === RETIRED_ITEMS_FOR_THREE_CARDS_1105 && add.appendItems === APPENDED_ITEMS_FOR_THREE_CARDS_1105)
  assert.ok(!add.tasks && !add.decisions && !add.fileTasks, 'no new cards or questions')
  assert.deepEqual(Object.keys(ANSWERED_FOR_THREE_CARDS_1105), ['roomMusic'])
  assert.match(ANSWERED_FOR_THREE_CARDS_1105.roomMusic, /^Each room its own player, through Home scenes/, 'the Canon\'s answer, word for word at the start')
  assert.deepEqual(RETIRED_FOR_THREE_CARDS_1105.map(r => r.order), [518, 530, 311])
  for (const r of RETIRED_FOR_THREE_CARDS_1105) {
    const card = before.tasks.find(t => t.order === r.order)
    assert.ok(card && card.title === r.title && card.status === 'todo', `${r.order} is open on the board under that title`)
    assert.match(r.detail, /^Done 5 Nov 2026/)
  }
  for (const line of RETIRED_FOR_THREE_CARDS_1105.map(r => r.detail)) assert.ok(!plain.test(line.replace(/G61/g, '')) && !PLAIN.test(line), `plain words: ${line.slice(0, 40)}`)
  // the household cards: the old two retired by their exact text, the new two under the right headings, the body as Jon wrote it
  const [oldSalem, oldBoo] = RETIRED_ITEMS_FOR_THREE_CARDS_1105.npc_cards, [newSalem, newBoo] = APPENDED_ITEMS_FOR_THREE_CARDS_1105.npc_cards
  assert.ok(oldSalem.startsWith('SALEM CROOKSHANK — ') && newSalem.startsWith('SALEM CROOKNOG — the long-time groundskeeper. '), 'Salem under his right name')
  assert.ok(oldBoo.startsWith('MISS BOO LARUE — ') && newBoo.startsWith('MISS BOO LARUE — family friend and socialite. '))
  assert.equal(newSalem.split('\nTrusting Salem:')[0].replace('CROOKNOG', 'CROOKSHANK'), oldSalem.split('\nTrusting Salem:')[0], 'the rest of his card as Jon wrote it')
  assert.equal(newBoo.split('\nTrusting Boo:')[0], oldBoo.split('\nTrusting Boo:')[0], 'the rest of her card as Jon wrote it')
  assert.ok(newSalem.endsWith('Trusting Salem: Most days, he’s got it backwards, so flip whatever he tells you. Win him over and he might set it straight. Only a true friend gets it right every time.'))
  assert.ok(newBoo.endsWith('Trusting Boo: The more she likes you, the more she’ll say. Bore her and you get a look. Win her over and she might be useful.'))
  assert.equal(before.decisions.roomMusic.answer, null, 'open on the board before')
  const state = applyPlan(planAddition(add, before, { newId, now: 1 }), before)
  assert.equal(state.decisions.roomMusic.answer, ANSWERED_FOR_THREE_CARDS_1105.roomMusic)
  assert.ok(!openDecisions(decisionList(state)).some(d => d.key === 'roomMusic'), 'off the open list')
  for (const r of RETIRED_FOR_THREE_CARDS_1105) assert.equal(state.tasks.find(t => t.order === r.order).status, 'done')
  assert.equal(state.tasks.length, before.tasks.length, 'no new cards')
  const again = applyPlan(planAddition(add, state, { newId, now: 2 }), state)
  assert.equal(again.tasks.find(t => t.order === 311).detail, state.tasks.find(t => t.order === 311).detail, 'once only')
})

// ---- the stability sweep, 6 Nov 2026 --------------------------------------------

test('the sweep (6 Nov 2026): before the postmortem; one question open with its default, arcadePause, at the Entryway; plain; once only', () => {
  const { before, add, newId } = boardThrough('2026-11-06-sweep')
  const plain = /\b(npm|kiosk|deploy|repo|seed|stand-in|preview|terminal|callable|prop|state|constant)\b|\.env|—/i
  assert.equal(ADDITIONS.at(-12), add, 'the migration before the postmortem of 11 Nov')
  assert.ok(add.decisions === SWEEP_1106_DECISIONS && !add.tasks && !add.retireTasks && !add.fileTasks, 'one question, nothing else')
  assert.deepEqual(SWEEP_1106_DECISIONS.map(d => [d.key, d.moment, d.answer, d.options.length]), [['arcadePause', 'act4.entryway', null, 2]])
  for (const d of SWEEP_1106_DECISIONS) for (const line of [d.question, d.note, ...d.options]) assert.ok(!plain.test(line) && !PLAIN.test(line), `plain words: ${line.slice(0, 40)}`)
  assert.ok(!before.decisions.arcadePause, 'new on the board')
  const state = applyPlan(planAddition(add, before, { newId, now: 1 }), before)
  assert.ok(openDecisions(decisionList(state)).some(d => d.key === 'arcadePause'), 'open on the board')
  assert.equal(state.tasks.length, before.tasks.length, 'no new cards')
  const again = applyPlan(planAddition(add, state, { newId, now: 2 }), state)
  assert.deepEqual(Object.keys(again.decisions).length, Object.keys(state.decisions).length, 'once only')
})

test('the postmortem (11 Nov 2026): last; three done cards and two jobs for Jon, new numbers, plain; once only', () => {
  const { before, add, newId } = boardThrough('2026-11-11-postmortem')
  const plain = /\b(npm|kiosk|deploy|repo|seed|stand-in|preview|terminal|callable|prop|state|constant)\b|\.env|—/i
  assert.equal(ADDITIONS.at(-11), add, 'the last migration of its day')
  assert.ok(add.tasks === POSTMORTEM_1111_TASKS && !add.retireTasks && !add.fileTasks && !add.decisions, 'new cards, nothing else')
  assert.deepEqual(POSTMORTEM_1111_TASKS.map(t => [t.order, t.who, t.moment, t.status]), [
    [560, 'Claude Code', 'after', 'done'], [561, 'Claude Code', 'setup', 'done'], [562, 'Claude Code', 'act5.irwin', 'done'],
    [563, 'Jon', 'setup', 'todo'], [564, 'Jon', 'after', 'todo'],
  ])
  for (const t of POSTMORTEM_1111_TASKS) {
    assert.ok(MOMENT_KEYS.includes(t.moment), `${t.order} is filed on a row`)
    for (const line of [t.title, t.detail]) assert.ok(!plain.test(line) && !PLAIN.test(line), `plain words: ${line.slice(0, 40)}`)
    assert.ok(!before.tasks.some(b => b.order === t.order), `${t.order} is a new number`)
  }
  const state = applyPlan(planAddition(add, before, { newId, now: 1 }), before)
  assert.equal(state.tasks.length, before.tasks.length + 5, 'five new cards')
  const again = applyPlan(planAddition(add, state, { newId, now: 2 }), state)
  assert.equal(again.tasks.length, state.tasks.length, 'once only')
})

test('the media folder (11 Nov 2026): one done card and two jobs for Jon, new numbers, plain; once only', () => {
  const { before, add, newId } = boardThrough('2026-11-11-media')
  assert.ok(add.tasks === MEDIA_1111_TASKS && !add.retireTasks && !add.fileTasks && !add.decisions, 'new cards, nothing else')
  assert.deepEqual(MEDIA_1111_TASKS.map(t => [t.order, t.who, t.moment, t.status]), [
    [565, 'Claude Code', 'act7.reveal', 'done'], [566, 'Jon', 'act7.reveal', 'todo'], [567, 'Jon', 'setup', 'todo'],
  ])
  for (const t of MEDIA_1111_TASKS) {
    assert.ok(MOMENT_KEYS.includes(t.moment), `${t.order} is filed on a row`)
    for (const line of [t.title, t.detail]) assert.ok(!PLAIN.test(line), `plain words: ${line.slice(0, 40)}`)
    assert.ok(!before.tasks.some(b => b.order === t.order), `${t.order} is a new number`)
  }
  const state = applyPlan(planAddition(add, before, { newId, now: 1 }), before)
  assert.equal(state.tasks.length, before.tasks.length + 3, 'three new cards')
  const again = applyPlan(planAddition(add, state, { newId, now: 2 }), state)
  assert.equal(again.tasks.length, state.tasks.length, 'once only')
})

test('before the walk-through (11 Nov 2026, evening): two done cards and one job for Jon, new numbers, plain; once only', () => {
  const { before, add, newId } = boardThrough('2026-11-11-walkthrough')
  assert.ok(add.tasks === WALKTHROUGH_1111_TASKS && !add.retireTasks && !add.fileTasks && !add.decisions, 'new cards, nothing else')
  assert.deepEqual(WALKTHROUGH_1111_TASKS.map(t => [t.order, t.who, t.moment, t.status]), [
    [568, 'Claude Code', 'setup', 'done'], [569, 'Claude Code', 'act7.result', 'done'], [570, 'Jon', 'act7.result', 'todo'],
  ])
  for (const t of WALKTHROUGH_1111_TASKS) {
    assert.ok(MOMENT_KEYS.includes(t.moment), `${t.order} is filed on a row`)
    for (const line of [t.title, t.detail]) assert.ok(!PLAIN.test(line), `plain words: ${line.slice(0, 40)}`)
    assert.ok(!before.tasks.some(b => b.order === t.order), `${t.order} is a new number`)
  }
  const state = applyPlan(planAddition(add, before, { newId, now: 1 }), before)
  assert.equal(state.tasks.length, before.tasks.length + 3, 'three new cards')
  const again = applyPlan(planAddition(add, state, { newId, now: 2 }), state)
  assert.equal(again.tasks.length, state.tasks.length, 'once only')
})

test('the setup address (11 Nov 2026, late): one done card and one job for Jon, new numbers, plain; once only', () => {
  const { before, add, newId } = boardThrough('2026-11-11-setup')
  assert.ok(add.tasks === SETUP_1111_TASKS && !add.retireTasks && !add.fileTasks && !add.decisions, 'new cards, nothing else')
  assert.deepEqual(SETUP_1111_TASKS.map(t => [t.order, t.who, t.moment, t.status]), [
    [571, 'Claude Code', 'setup', 'done'], [572, 'Jon', 'setup', 'todo'],
  ])
  for (const t of SETUP_1111_TASKS) {
    assert.ok(MOMENT_KEYS.includes(t.moment), `${t.order} is filed on a row`)
    for (const line of [t.title, t.detail]) assert.ok(!PLAIN.test(line), `plain words: ${line.slice(0, 40)}`)
    assert.ok(!before.tasks.some(b => b.order === t.order), `${t.order} is a new number`)
  }
  const state = applyPlan(planAddition(add, before, { newId, now: 1 }), before)
  assert.equal(state.tasks.length, before.tasks.length + 2, 'two new cards')
  const again = applyPlan(planAddition(add, state, { newId, now: 2 }), state)
  assert.equal(again.tasks.length, state.tasks.length, 'once only')
})

test('the big Start button (12 Nov 2026): one done card and two jobs for Jon, new numbers, plain; once only', () => {
  const { before, add, newId } = boardThrough('2026-11-12-start')
  assert.ok(add.tasks === START_1112_TASKS && !add.retireTasks && !add.fileTasks && !add.decisions, 'new cards, nothing else')
  assert.deepEqual(START_1112_TASKS.map(t => [t.order, t.who, t.moment, t.status]), [
    [573, 'Claude Code', 'setup', 'done'], [574, 'Jon', 'setup', 'todo'], [575, 'Jon', 'setup', 'todo'],
  ])
  for (const t of START_1112_TASKS) {
    assert.ok(MOMENT_KEYS.includes(t.moment), `${t.order} is filed on a row`)
    for (const line of [t.title, t.detail]) assert.ok(!PLAIN.test(line), `plain words: ${line.slice(0, 40)}`)
    assert.ok(!before.tasks.some(b => b.order === t.order), `${t.order} is a new number`)
  }
  const state = applyPlan(planAddition(add, before, { newId, now: 1 }), before)
  assert.equal(state.tasks.length, before.tasks.length + 3, 'three new cards')
  const again = applyPlan(planAddition(add, state, { newId, now: 2 }), state)
  assert.equal(again.tasks.length, state.tasks.length, 'once only')
})

test('the Start button in the workshop (12 Nov 2026, later): last; one done card, new numbers, plain; once only', () => {
  const { before, add, newId } = boardThrough('2026-11-12-workshop')
  assert.equal(ADDITIONS.at(-6), add, 'the migration before the polish pass')
  assert.ok(add.tasks === WORKSHOP_1112_TASKS && !add.retireTasks && !add.fileTasks && !add.decisions, 'new cards, nothing else')
  assert.deepEqual(WORKSHOP_1112_TASKS.map(t => [t.order, t.who, t.moment, t.status]), [
    [576, 'Claude Code', 'setup', 'done'],
  ])
  for (const t of WORKSHOP_1112_TASKS) {
    assert.ok(MOMENT_KEYS.includes(t.moment), `${t.order} is filed on a row`)
    for (const line of [t.title, t.detail]) assert.ok(!PLAIN.test(line), `plain words: ${line.slice(0, 40)}`)
    assert.ok(!before.tasks.some(b => b.order === t.order), `${t.order} is a new number`)
  }
  const state = applyPlan(planAddition(add, before, { newId, now: 1 }), before)
  assert.equal(state.tasks.length, before.tasks.length + 1, 'one new card')
  const again = applyPlan(planAddition(add, state, { newId, now: 2 }), state)
  assert.equal(again.tasks.length, state.tasks.length, 'once only')
})

test('the polish pass and the approved look (11 to 12 Nov 2026): last; done cards, Jon’s jobs, one for Claude chat; two old cards closed, two noted, two questions answered; plain; once only', () => {
  const { before, add, newId } = boardThrough('2026-11-12-polish')
  assert.equal(ADDITIONS.at(-5), add, 'the migration before the review of 12 Nov')
  assert.ok(add.tasks === POLISH_1112_TASKS && add.retireTasks === RETIRED_FOR_POLISH_1112 && add.fileTasks === FILED_FOR_POLISH_1112 && add.answerDecisions === ANSWERED_FOR_POLISH_1112 && !add.decisions)
  assert.deepEqual(POLISH_1112_TASKS.map(t => [t.order, t.who, t.status]), [
    [577, 'Claude Code', 'done'], [578, 'Claude Code', 'done'], [579, 'Claude Code', 'done'], [580, 'Claude Code', 'done'],
    [581, 'Jon', 'todo'], [582, 'Jon', 'todo'], [583, 'Jon', 'todo'], [584, 'Jon', 'todo'], [585, 'Jon', 'todo'], [586, 'Jon', 'todo'], [587, 'Jon', 'todo'], [588, 'Jon', 'todo'], [589, 'Jon', 'todo'],
    [590, 'Claude chat', 'todo'],
  ])
  for (const t of POLISH_1112_TASKS) {
    assert.ok(MOMENT_KEYS.includes(t.moment), `${t.order} is filed on a row`)
    for (const line of [t.title, t.detail]) assert.ok(!PLAIN.test(line), `plain words: ${line.slice(0, 40)}`)
    assert.ok(!before.tasks.some(b => b.order === t.order), `${t.order} is a new number`)
    assert.ok(!/—/.test(t.title + t.detail), `${t.order}: no long dash`)
  }
  // the dedication's words are Jon's, exactly
  assert.ok(POLISH_1112_TASKS.find(t => t.order === 580).detail.includes('For Sydney, The Best Big Brother A Pup Could Ask For'))
  // every card it closes or notes is on the board, open, by number and title
  for (const r of [...RETIRED_FOR_POLISH_1112, ...FILED_FOR_POLISH_1112]) {
    const card = before.tasks.find(b => b.order === r.order)
    assert.ok(card && card.title === r.title, `${r.order} is on the board by its title`)
    assert.notEqual(card.status, 'done', `${r.order} was open`)
  }
  // both questions were open, and each answer is one of its own options
  for (const [key, answer] of Object.entries(ANSWERED_FOR_POLISH_1112)) {
    const d = before.decisions[key]
    assert.ok(d && d.answer == null, `${key} was open`)
    assert.ok(d.options.includes(answer), `${key}: the answer is one of its options`)
  }
  const state = applyPlan(planAddition(add, before, { newId, now: 1 }), before)
  assert.equal(state.tasks.length, before.tasks.length + 14, 'fourteen new cards')
  for (const r of RETIRED_FOR_POLISH_1112) assert.equal(state.tasks.find(t => t.order === r.order).status, 'done', `${r.order} is done`)
  for (const f of FILED_FOR_POLISH_1112) assert.ok(state.tasks.find(t => t.order === f.order).detail.endsWith(f.note), `${f.order} carries the note`)
  assert.equal(state.decisions.arcadeCamera.answer, 'Out: the credits have no photos')
  const again = applyPlan(planAddition(add, state, { newId, now: 2 }), state)
  assert.equal(again.tasks.length, state.tasks.length, 'once only')
})

test('the review before the practice night and the publish (12 Nov 2026): last; one done card, the drawing pictures and the publish closed, a note on Jon’s practice card; plain; once only', () => {
  const { before, add, newId } = boardThrough('2026-11-12-review')
  assert.equal(ADDITIONS.at(-4), add, 'the migration before the blackout Shortcuts')
  assert.ok(add.tasks === REVIEW_1112_TASKS && add.retireTasks === RETIRED_FOR_REVIEW_1112 && add.fileTasks === FILED_FOR_REVIEW_1112 && !add.decisions && !add.answerDecisions)
  assert.deepEqual(REVIEW_1112_TASKS.map(t => [t.order, t.who, t.status]), [[591, 'Claude Code', 'done']])
  for (const t of REVIEW_1112_TASKS) {
    assert.ok(MOMENT_KEYS.includes(t.moment), `${t.order} is filed on a row`)
    for (const line of [t.title, t.detail]) assert.ok(!PLAIN.test(line), `plain words: ${line.slice(0, 40)}`)
    assert.ok(!before.tasks.some(b => b.order === t.order), `${t.order} is a new number`)
    assert.ok(!/—/.test(t.title + t.detail), `${t.order}: no long dash`)
  }
  // every card it closes or notes is on the board, open, by number and title; plain words in what it adds
  for (const r of [...RETIRED_FOR_REVIEW_1112, ...FILED_FOR_REVIEW_1112]) {
    const card = before.tasks.find(b => b.order === r.order)
    assert.ok(card && card.title === r.title, `${r.order} is on the board by its title`)
    assert.notEqual(card.status, 'done', `${r.order} was open`)
    assert.ok(!PLAIN.test(r.detail ?? r.note), `${r.order}: plain words`)
    assert.ok(!/—/.test(r.detail ?? r.note), `${r.order}: no long dash`)
  }
  // nothing about a picture but how many: counts only
  assert.match(RETIRED_FOR_REVIEW_1112[0].detail, /17 of them/)
  const state = applyPlan(planAddition(add, before, { newId, now: 1 }), before)
  assert.equal(state.tasks.length, before.tasks.length + 1, 'one new card')
  assert.equal(state.tasks.find(t => t.order === 214).status, 'done', 'the drawing pictures are made')
  assert.equal(state.tasks.find(t => t.order === 581).status, 'done', 'published, on Jon’s word')
  assert.match(RETIRED_FOR_REVIEW_1112[1].detail, /Yes, publish/)
  assert.deepEqual(FILED_FOR_REVIEW_1112.map(f => f.order), [585])
  for (const f of FILED_FOR_REVIEW_1112) {
    const card = state.tasks.find(t => t.order === f.order)
    assert.ok(card.detail.endsWith(f.note), `${f.order} carries the note`)
    assert.notEqual(card.status, 'done', `${f.order} stays open: it is still Jon’s to do`)
  }
  const again = applyPlan(planAddition(add, state, { newId, now: 2 }), state)
  assert.equal(again.tasks.length, state.tasks.length, 'once only')
})

test('Jon’s two Shortcuts for the blackout (12 Nov 2026): one done card, his Shortcuts card reworded to the one still missing, a note on his practice card; plain; once only', () => {
  const { before, add, newId } = boardThrough('2026-11-12-blackout-shortcuts')
  assert.equal(ADDITIONS.at(-3), add, 'the migration before the music’s stop')
  assert.ok(add.tasks === BLACKOUT_SHORTCUTS_1112_TASKS && add.rewriteTasks === REWRITTEN_FOR_BLACKOUT_SHORTCUTS_1112 && add.fileTasks === FILED_FOR_BLACKOUT_SHORTCUTS_1112 && !add.retireTasks && !add.decisions && !add.answerDecisions)
  assert.deepEqual(BLACKOUT_SHORTCUTS_1112_TASKS.map(t => [t.order, t.who, t.status, t.moment]), [[592, 'Claude Code', 'done', 'act1.ready']])
  for (const t of BLACKOUT_SHORTCUTS_1112_TASKS) {
    assert.ok(MOMENT_KEYS.includes(t.moment), `${t.order} is filed on a row`)
    for (const line of [t.title, t.detail]) assert.ok(!PLAIN.test(line), `plain words: ${line.slice(0, 40)}`)
    assert.ok(!before.tasks.some(b => b.order === t.order), `${t.order} is a new number`)
    assert.ok(!/—/.test(t.title + t.detail), `${t.order}: no long dash`)
  }
  // the cards it rewords or notes are on the board, open, by number and title; plain words in what it writes
  for (const r of [...REWRITTEN_FOR_BLACKOUT_SHORTCUTS_1112, ...FILED_FOR_BLACKOUT_SHORTCUTS_1112]) {
    const card = before.tasks.find(b => b.order === r.order)
    assert.ok(card && card.title === r.title, `${r.order} is on the board by its title`)
    assert.notEqual(card.status, 'done', `${r.order} was open`)
    for (const line of [r.set?.title, r.set?.detail, r.note].filter(Boolean)) {
      assert.ok(!PLAIN.test(line), `${r.order}: plain words`)
      assert.ok(!/—/.test(line), `${r.order}: no long dash`)
    }
  }
  const state = applyPlan(planAddition(add, before, { newId, now: 1 }), before)
  assert.equal(state.tasks.length, before.tasks.length + 1, 'one new card')
  const shortcuts = state.tasks.find(t => t.order === 582)
  assert.equal(shortcuts.title, 'Make one more Shortcut on the brain: PANIC')
  assert.match(shortcuts.detail, /named exactly PANIC/)
  assert.match(shortcuts.detail, /Off Murderwin Strings is no longer needed/)
  assert.notEqual(shortcuts.status, 'done', 'still Jon’s to do: without it the music plays through the dark')
  assert.ok(shortcuts.previous?.['2026-11-12-blackout-shortcuts']?.title === 'Make two Shortcuts on the brain: PANIC and Off Murderwin Strings', 'what it said before is kept')
  const practice = state.tasks.find(t => t.order === 585)
  assert.ok(practice.detail.endsWith(FILED_FOR_BLACKOUT_SHORTCUTS_1112[0].note))
  // the direction of the one word Jon says: lights late = start the Shortcut sooner
  assert.match(FILED_FOR_BLACKOUT_SHORTCUTS_1112[0].note, /after the screens, tell Claude Code "sooner"; if before, "later"/)
  const again = applyPlan(planAddition(add, state, { newId, now: 2 }), state)
  assert.equal(again.tasks.length, state.tasks.length, 'once only')
  assert.equal(again.tasks.find(t => t.order === 585).detail, practice.detail, 'the note is not added twice')
})

test('the music’s stop is Jon’s AudioPanic Shortcut (12 Nov 2026): last; one done card, one small job left for Claude Code, his Shortcuts card reworded to the one thing still missing, a note on his practice card; plain; once only', () => {
  const { before, add, newId } = boardThrough('2026-11-12-audio-panic')
  assert.equal(ADDITIONS.at(-2), add, 'the migration before the screen saver')
  assert.ok(add.tasks === AUDIO_PANIC_1112_TASKS && add.rewriteTasks === REWRITTEN_FOR_AUDIO_PANIC_1112 && add.fileTasks === FILED_FOR_AUDIO_PANIC_1112 && !add.retireTasks && !add.decisions && !add.answerDecisions)
  assert.deepEqual(AUDIO_PANIC_1112_TASKS.map(t => [t.order, t.who, t.status, t.moment]), [[593, 'Claude Code', 'done', 'act1.ready'], [594, 'Claude Code', 'todo', 'act3.bulletin']])
  for (const t of AUDIO_PANIC_1112_TASKS) {
    assert.ok(MOMENT_KEYS.includes(t.moment), `${t.order} is filed on a row`)
    for (const line of [t.title, t.detail]) assert.ok(!PLAIN.test(line), `plain words: ${line.slice(0, 40)}`)
    assert.ok(!before.tasks.some(b => b.order === t.order), `${t.order} is a new number`)
    assert.ok(!/—/.test(t.title + t.detail), `${t.order}: no long dash`)
  }
  // the name the brain looks for is the one on the sheet, and the card tells Jon to keep it
  assert.match(AUDIO_PANIC_1112_TASKS[0].detail, /yours is called AudioPanic, so the brain now looks for that name\. Keep the name as it is\./)
  // the cards it rewords or notes are on the board, open, by number and by the title the update before left them with
  for (const r of [...REWRITTEN_FOR_AUDIO_PANIC_1112, ...FILED_FOR_AUDIO_PANIC_1112]) {
    const card = before.tasks.find(b => b.order === r.order)
    assert.ok(card && card.title === r.title, `${r.order} is on the board by its title`)
    assert.notEqual(card.status, 'done', `${r.order} was open`)
    for (const line of [r.set?.title, r.set?.detail, r.note].filter(Boolean)) {
      assert.ok(!PLAIN.test(line), `${r.order}: plain words`)
      assert.ok(!/—/.test(line), `${r.order}: no long dash`)
    }
  }
  const state = applyPlan(planAddition(add, before, { newId, now: 1 }), before)
  assert.equal(state.tasks.length, before.tasks.length + 2, 'two new cards')
  // the supper bulletin: the fix is said on the done card, in plain words
  assert.match(AUDIO_PANIC_1112_TASKS[0].detail, /Now the jazz stops while the bulletin plays and comes back after it\./)
  const shortcuts = state.tasks.find(t => t.order === 582)
  assert.equal(shortcuts.title, 'TV Wonder plays on through every stop: put it right in the Home app')
  assert.match(shortcuts.detail, /there is nothing more to make/)
  assert.match(shortcuts.detail, /open the scene PANIC and add TV Wonder to it, paused like the others/)
  assert.match(shortcuts.detail, /Or take TV Wonder out of the Study’s music scene and the two Intense scenes/)
  assert.ok(!/named exactly PANIC/.test(shortcuts.detail), 'it no longer asks for a Shortcut by the old name')
  assert.notEqual(shortcuts.status, 'done', 'still Jon’s to do: the Study’s TV plays through a stop')
  assert.equal(shortcuts.who, 'Jon')
  assert.ok(shortcuts.previous?.['2026-11-12-audio-panic']?.title === 'Make one more Shortcut on the brain: PANIC', 'what it said before is kept')
  const practice = state.tasks.find(t => t.order === 585)
  assert.ok(practice.detail.endsWith(FILED_FOR_AUDIO_PANIC_1112[0].note))
  assert.ok(practice.detail.includes(FILED_FOR_BLACKOUT_SHORTCUTS_1112[0].note), 'the note before it is still there')
  // the brain's own volume: three of Jon's Shortcuts turn this Mac down and leave it there
  assert.match(FILED_FOR_AUDIO_PANIC_1112[0].note, /first turn the brain’s own volume all the way up/)
  // his older music card no longer sends him looking for a Shortcut called PANIC
  const music = state.tasks.find(t => t.order === 551)
  assert.ok(music.detail.endsWith(FILED_FOR_AUDIO_PANIC_1112[1].note))
  assert.match(FILED_FOR_AUDIO_PANIC_1112[1].note, /Nothing called PANIC is needed/)
  const again = applyPlan(planAddition(add, state, { newId, now: 2 }), state)
  assert.equal(again.tasks.length, state.tasks.length, 'once only')
})

test('the idle screens’ screen saver (12 Nov 2026, Jon’s word): last; one done card, his loops card closed, his folder card reworded to the one thing left; plain; once only', () => {
  const { before, add, newId } = boardThrough('2026-11-12-screen-saver')
  assert.equal(ADDITIONS.at(-1), add, 'the last migration')
  assert.ok(add.tasks === SCREEN_SAVER_1112_TASKS && add.retireTasks === RETIRED_FOR_SCREEN_SAVER_1112 && add.rewriteTasks === REWRITTEN_FOR_SCREEN_SAVER_1112 && !add.fileTasks && !add.decisions && !add.answerDecisions)
  assert.deepEqual(SCREEN_SAVER_1112_TASKS.map(t => [t.order, t.who, t.status, t.moment]), [[595, 'Claude Code', 'done', 'setup']])
  for (const t of SCREEN_SAVER_1112_TASKS) {
    assert.ok(MOMENT_KEYS.includes(t.moment), `${t.order} is filed on a row`)
    for (const line of [t.title, t.detail]) assert.ok(!PLAIN.test(line), `plain words: ${line.slice(0, 40)}`)
    assert.ok(!before.tasks.some(b => b.order === t.order), `${t.order} is a new number`)
    assert.ok(!/—/.test(t.title + t.detail), `${t.order}: no long dash`)
  }
  // his own words are on the card, and what it costs: the room's name in lights gives way on those screens
  assert.match(SCREEN_SAVER_1112_TASKS[0].detail, /For the loops just make the classic dvd screen saver with the cats and dog face picture when it bounces off the edge of the screen/)
  assert.match(SCREEN_SAVER_1112_TASKS[0].detail, /it takes the place of the room’s name in lights; a Mac’s own second screen keeps its room’s name/)
  // the cards it closes or rewords are on the board, open, by number and title; plain words in what it writes
  for (const r of [...RETIRED_FOR_SCREEN_SAVER_1112, ...REWRITTEN_FOR_SCREEN_SAVER_1112]) {
    const card = before.tasks.find(b => b.order === r.order)
    assert.ok(card && card.title === r.title, `${r.order} is on the board by its title`)
    assert.notEqual(card.status, 'done', `${r.order} was open`)
    for (const line of [r.detail, r.set?.title, r.set?.detail].filter(Boolean)) {
      assert.ok(!PLAIN.test(line), `${r.order}: plain words`)
      assert.ok(!/—/.test(line), `${r.order}: no long dash`)
    }
  }
  const state = applyPlan(planAddition(add, before, { newId, now: 1 }), before)
  assert.equal(state.tasks.length, before.tasks.length + 1, 'one new card')
  const loops = state.tasks.find(t => t.order === 492)
  assert.equal(loops.status, 'done', 'no videos to make')
  assert.match(loops.detail, /there are no videos to make/)
  const folder = state.tasks.find(t => t.order === 567)
  assert.equal(folder.title, 'Your new picture of Sir Irwin: say where it should show')
  assert.notEqual(folder.status, 'done', 'still Jon’s to say')
  assert.equal(folder.who, 'Jon')
  assert.ok(!/No loops for the idle screens|No photo of Sydney/.test(folder.detail), 'the two settled things are no longer asked for')
  assert.ok(folder.previous?.['2026-11-12-screen-saver']?.title === 'Still missing from your folder: the five loops, Sydney’s photo, and where Irwin’s new portrait goes', 'what it said before is kept')
  const again = applyPlan(planAddition(add, state, { newId, now: 2 }), state)
  assert.equal(again.tasks.length, state.tasks.length, 'once only')
  assert.equal(again.tasks.find(t => t.order === 567).title, folder.title)
})
