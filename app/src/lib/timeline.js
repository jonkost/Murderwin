// The night, in order (22 Oct 2026). One straight line from the freeze to
// the morning after: every act and beat of seed/night.json, in the order the
// house plays them, with what each one needs written, made or done. Pure: no
// Firebase, no React. Tested by test/timeline.test.mjs.
//
// A need is one of:
//   { list, tab?, labels? }  a workshop list (or one tab of it, or some of
//                            its labelled lines), counted live
//   { secret, name }         a sealed part. Its status comes from the
//                            validation report, counts only; never its words
//   { list, also: true }     a list used again here, shown but not counted
// Tasks and decisions find their place by their `moment` field, a row key
// below (lib/timelineTasks.js).

import night from '../../../seed/night.json' with { type: 'json' }
import { AREAS, TAB_KINDS, ACT_NAMES, goalOf, goalForTab } from './content.js'
import { labelCodec } from './codecs.js'
import { isComplete } from './scenarios.js'

const ui = (...labels) => ({ list: 'ui_copy', labels })
const station = (label) => ({ list: 'station_text', labels: [label] })

// Clock times are pencilled from the act skeletons. Only 4:00pm and the
// blackout at sunset (about 5:32pm) are fixed.
const ACT_CLOCK = {
  1: { clock: '4:00pm', length: 'about an hour and a half' },
  2: { clock: 'about 5:30pm', length: 'about half an hour, after the blackout' },
  3: { clock: 'about 6:00pm', length: 'dinner' },
  4: { clock: 'after dinner', length: 'about an hour' },
  5: { clock: 'about 7:15pm', length: 'a quarter of an hour' },
  6: { clock: 'about 7:30pm', length: 'about half an hour' },
  7: { clock: 'about 8:00pm', length: 'the end' },
}

// What each place on the night needs, by row key.
export const NEEDS = {
  setup: [ui('START NIGHT', 'HOST', 'NOT FOR YOU')],
  allnight: [
    { list: 'rules_text' }, { list: 'motive_notes' }, { list: 'status_lines' }, { list: 'smalltalk' }, { list: 'achievements' },
    ui('JOIN AGAIN', 'OFFLINE', 'PAUSED', 'PAUSED BY HOST', 'SUPERSEDED', 'RETICULE', 'STOPS', 'FILLER'),
  ],
  'act1.arrive': [{ list: 'bios' }, ui('DOORS', 'JOIN', 'JOIN BUTTON', 'LOBBY', 'BAG')],
  'act1.meet': [{ list: 'npc_cards' }, ui('NOTICE MEET')],
  'act1.introduce': [ui('NOTICE INTRODUCE')],
  'act1.ready': [{ list: 'role_cards' }, ui('NOTICE READY', 'HOLD', 'HIDE')],
  'act2.parlour': [{ list: 'scenarios' }],
  'act2.orient': [ui('POWER', 'ORIENT', 'YOUR ROLE', 'SHOW ROLE', 'HIDE ROLE', 'NOTICE ORIENT')],
  'act2.news': [{ list: 'echo_frames' }, { secret: 'fragments', name: 'The secret words in the news' }, ui('NOTICE NEWS')],
  'act2.cat': [
    { list: 'openers' }, { list: 'closers' }, { list: 'refusals' }, { list: 'pools' },
    { secret: 'kernels', name: 'The secret middle of every cat’s testimony' },
    ui('NUMBERS', 'NOTICE SCRAP'),
  ],
  'act2.puzzle': [{ list: 'templates' }, { secret: 'documents', name: 'The secret words on the documents' }],
  'act2.checkin': [ui('NOTICE CHECKIN')],
  'act3.down': [ui('NOTICE DOWN')],
  'act3.bulletin': [ui('NOTICE BULLETIN'), { list: 'echo_frames', also: true }],
  'act4.parlour': [{ list: 'scenarios', also: true }],
  'act4.study': [{ list: 'study_lines' }, station('STUDY'), { list: 'trace_lines', also: true }],
  'act4.cat': [station('CAT'), { list: 'openers', also: true }, { list: 'closers', also: true }, { list: 'refusals', also: true }],
  'act4.bags': [station('BAGS'), { list: 'bag_items' }],
  'act4.puzzle': [station('PUZZLE')],
  'act4.checkin': [station('CHECKIN')],
  'act5.roam': [ui('NOTICE ROAM')],
  'act5.irwin': [ui('NOTICE IRWIN'), { secret: 'irwin', name: 'What Sir Irwin says' }],
  'act6.parlour': [{ list: 'scenarios', also: true }],
  'act6.drawing': [ui('RELAY RULES')],
  'act6.door': [{ list: 'trace_lines' }, ui('NOTICE DOOR')],
  'act7.reveal': [ui('NOTICE EYES')],
  'act7.result': [{ list: 'epilogue_frames' }, { list: 'achievements', also: true }],
}

// Before and after the acts. Each is one section with one row.
const BEFORE = [
  { key: 'freeze', clock: 'By Saturday 7 November', title: 'Before the freeze', what: 'Everything that has to work before the workshop locks. After the freeze, anything not working is cut, not fixed.' },
  { key: 'week', clock: 'Sunday 8 to Saturday 14 November', title: 'The week before', what: 'The secrets made, read by Jenna, and the bags packed. A dry run with nobody in the room.' },
  { key: 'setup', clock: 'Sunday 15 November, before 4:00pm', title: 'Setting up the house', what: 'The machines on in order, the screens open, the rooms ready.' },
  { key: 'allnight', clock: 'From 4:00pm, all night', title: 'On every phone, all night', what: 'What a guest can read from the moment they join: the Rules tab, the Motives tab, the Cats tab, and the small lines a phone shows when the signal drops or the night is paused.' },
]
const AFTER = [
  { key: 'after', clock: 'After the party', title: 'After the party', what: 'Put the house back to rehearsals, and find out what really happened.' },
]

function parlourRow(act) {
  const n = night.parlour?.counts?.[act] ?? 0
  return {
    key: `act${act}.parlour`,
    name: `Parlour Games, ${n === 1 ? 'one' : n} through this act`,
    what: 'They pop up on their own at random times: every phone at once, the same three silly questions, sixty seconds. A game the act runs out of time for moves to the next act.',
  }
}

// The whole night as sections, each with rows. Act 4's rows are its five
// stations: every group visits each one, so the station is the moment.
export function nightTimeline(file = night) {
  const sections = BEFORE.map(b => ({ key: b.key, clock: b.clock, title: b.title, rows: [{ key: b.key, name: b.title, what: b.what }] }))
  for (const [n, act] of Object.entries(file.acts)) {
    const rows = []
    if (file.parlour?.counts?.[n]) rows.push(parlourRow(n))
    if (n === '4') {
      rows.push(...(file.stations ?? []).map(s => ({ key: `act4.${s.key}`, name: s.name, what: s.what })))
    } else {
      rows.push(...act.beats.map(b => ({ key: `act${n}.${b.key}`, name: b.name, what: b.what })))
    }
    sections.push({
      key: `act${n}`, act: Number(n),
      clock: ACT_CLOCK[n]?.clock ?? '',
      length: ACT_CLOCK[n]?.length ?? '',
      title: `Act ${n}: ${ACT_NAMES[`act${n}`] ?? act.name}`,
      plain: act.plain,
      needs: [{ list: 'act_scripts', tab: `act${n}` }],
      rows,
    })
  }
  sections.push(...AFTER.map(b => ({ key: b.key, clock: b.clock, title: b.title, rows: [{ key: b.key, name: b.title, what: b.what }] })))
  return sections.map(s => ({ ...s, needs: s.needs ?? [], rows: s.rows.map(r => ({ ...r, needs: NEEDS[r.key] ?? [] })) }))
}

export const TIMELINE = nightTimeline()

// Every row key, in night order: where a task or a decision may be filed.
export const MOMENT_KEYS = TIMELINE.flatMap(s => s.rows.map(r => r.key))

// "Act 2: Lights Out, News flash", or the section title for a lone row.
export function momentName(key) {
  for (const s of TIMELINE) {
    const r = s.rows.find(x => x.key === key)
    if (r) return s.rows.length === 1 && r.name === s.title ? s.title : `${s.title}, ${r.name}`
  }
  return null
}

// The list names the timeline reads, to subscribe to each once.
export const TIMELINE_LISTS = [...new Set(TIMELINE.flatMap(s => [...s.needs, ...s.rows.flatMap(r => r.needs)]).filter(n => n.list).map(n => n.list))]

// ---- status, from live data ------------------------------------------------

const liveOf = (items) => (items ?? []).filter(i => !i.deleted)

// Where a need's link opens: the list itself, its tab, or its thinnest tab.
function linkFor(need, live) {
  const spec = AREAS[need.list]
  if (need.list === 'templates') return '/stationery'
  if (need.tab) return `/edit/${need.list}?tab=${need.tab}`
  if (spec.tabs) {
    const def = TAB_KINDS[spec.tabs]
    const thin = def.list.map(t => ({ t, n: live.filter(i => i[def.field] === t).length - goalForTab(spec, t) })).sort((a, b) => a.n - b.n)[0]
    return `/edit/${need.list}?tab=${thin.t}`
  }
  return `/edit/${need.list}`
}

// { label, count, goal, done, text, to } for one list need.
export function listStatus(need, items) {
  const spec = AREAS[need.list]
  const live = liveOf(items)
  let count, goal, label
  if (need.labels) {
    const have = new Set(live.map(i => labelCodec.split(i.text)).filter(v => v.label && v.text.trim()).map(v => v.label))
    count = need.labels.filter(l => have.has(l)).length
    goal = need.labels.length
    label = need.labels.length === 1 ? `${spec.label}: ${need.labels[0]}` : `${spec.label}: ${need.labels.join(', ')}`
  } else if (need.tab) {
    const def = TAB_KINDS[spec.tabs]
    count = live.filter(i => i[def.field] === need.tab).length
    goal = goalForTab(spec, need.tab)
    label = `${spec.label}: ${def.label(need.tab)}`
  } else {
    count = spec.editor === 'questions' ? live.filter(i => isComplete(i.beats)).length : live.length
    goal = goalOf(spec)
    label = spec.label
  }
  const done = goal > 0 && count >= goal
  const text = done ? 'Full' : `${Math.min(count, goal)} of ${goal} written`
  return { label, count: Math.min(count, goal), goal, done, text, to: linkFor(need, live) }
}

// A secret's status, from the latest validation report. Counts only.
export function secretStatus(need, validation) {
  if (!validation) return { label: need.name, done: false, text: 'Not made yet. Claude makes it blind, Jenna checks it.' }
  const done = Boolean(validation.pass) && validation.complete >= validation.codes
  return {
    label: need.name, done,
    text: done ? 'Made and checked' : `${validation.complete} of ${validation.codes} motive sets made${validation.pass ? '' : ', needs a re-run'}`,
  }
}

export function needStatus(need, { areas = {}, validation = null } = {}) {
  if (need.secret) return { ...secretStatus(need, validation), secret: true }
  return listStatus(need, areas[need.list])
}

const isOpenTask = (t) => !t.deleted && t.status !== 'done'

// Everything on the night, flattened in order: one entry per need (not the
// "also" ones), task and decision, each with its done state. A list need
// counts once, at its first place; Home and this page count the same way.
export function timelineItems({ areas = {}, validation = null, tasks = [], decisions = [] } = {}) {
  const out = []
  const seen = new Set()
  const byMoment = (arr, key) => arr.filter(x => x.moment === key)
  for (const s of TIMELINE) {
    for (const need of s.needs) out.push({ kind: 'need', section: s.key, row: null, need, status: needStatus(need, { areas, validation }) })
    for (const r of s.rows) {
      for (const need of r.needs) {
        if (need.also) continue
        const id = need.secret ? `secret:${need.secret}` : `${need.list}:${need.tab ?? ''}:${(need.labels ?? []).join(',')}`
        if (seen.has(id)) continue
        seen.add(id)
        out.push({ kind: 'need', section: s.key, row: r.key, need, status: needStatus(need, { areas, validation }) })
      }
      for (const d of byMoment(decisions, r.key)) out.push({ kind: 'decision', section: s.key, row: r.key, decision: d, status: { done: d.answer != null } })
      for (const t of byMoment(tasks, r.key).filter(t => !t.deleted).sort((a, b) => (a.order ?? 0) - (b.order ?? 0))) {
        out.push({ kind: 'task', section: s.key, row: r.key, task: t, status: { done: !isOpenTask(t) } })
      }
    }
  }
  return out
}

// { ready, total, first }: how much of the night is ready, and the first
// thing that is not, in night order.
export function timelineProgress(data) {
  const items = timelineItems(data)
  return { ready: items.filter(i => i.status.done).length, total: items.length, first: items.find(i => !i.status.done) ?? null }
}
