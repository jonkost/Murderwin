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
//
// Every item also says when it can be done (22 Oct 2026, Jon: "what I can
// do now, separately from what only happens later"): `now`, before the
// freeze, or `later`, the week before, on the day or after. Whether the
// night already covers it with a stand-in. And whether it is someone else's
// to do (Claude's or Jenna's), so the page can point at the next thing that
// truly needs Jon.

import night from '../../../seed/night.json' with { type: 'json' }
import { AREAS, TAB_KINDS, ACT_NAMES, goalOf, goalForTab } from './content.js'
import { labelCodec } from './codecs.js'
import { isComplete } from './scenarios.js'
import { ALL_TIMELINE_TASKS } from './timelineTasks.js'

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
  // The news is W-O-O-F News since 22 Oct, an open bank: the old news frames
  // and their secret fragments are shown nowhere, so neither is a need here.
  'act2.news': [ui('NOTICE NEWS')],
  'act2.cat': [
    { list: 'openers' }, { list: 'closers' }, { list: 'refusals' }, { list: 'pools' },
    { secret: 'kernels', name: 'The secret middle of every cat’s testimony' },
    ui('NUMBERS', 'NOTICE SCRAP'),
  ],
  'act2.puzzle': [{ list: 'templates' }, { secret: 'documents', name: 'The secret words on the documents' }],
  'act2.checkin': [ui('NOTICE CHECKIN')],
  'act3.down': [ui('NOTICE DOWN')],
  'act3.bulletin': [ui('NOTICE BULLETIN')],
  'act4.parlour': [{ list: 'scenarios', also: true }],
  'act4.study': [{ list: 'study_lines' }, station('STUDY')],
  'act4.cat': [station('CAT'), { list: 'openers', also: true }, { list: 'closers', also: true }, { list: 'refusals', also: true }],
  'act4.bags': [station('BAGS'), { list: 'bag_items' }],
  'act4.puzzle': [station('PUZZLE')],
  'act4.checkin': [station('CHECKIN')],
  'act5.roam': [ui('NOTICE ROAM')],
  // Sir Irwin's countdown is open copy (23 Oct): no secret line at dessert.
  'act5.irwin': [ui('NOTICE IRWIN')],
  // Act 6 plays its two games as it opens (night.json parlour.atStart).
  'act6.games': [{ list: 'scenarios', also: true }],
  'act6.drawing': [ui('RELAY RULES')],
  'act6.door': [ui('NOTICE DOOR')],
  'act7.reveal': [ui('NOTICE EYES')],
  'act7.result': [{ list: 'epilogue_frames' }, { list: 'achievements', also: true }],
}

// Before and after the acts. Each is one section with one row.
const BEFORE = [
  { key: 'freeze', clock: 'By Saturday 7 November', title: 'Before the freeze', what: 'Everything that has to work before the workshop locks. After the freeze, anything not working is cut, not fixed.' },
  { key: 'week', clock: 'Sunday 8 to Saturday 14 November', title: 'The week before', what: 'The bags packed, the fake-player dry run, and a last check. The secrets were made and read before the freeze.' },
  { key: 'setup', clock: 'Sunday 15 November, before 4:00pm', title: 'Setting up the house', what: 'The machines on in order, the screens open, the rooms ready.', link: { to: '/devices', label: 'Every device, room by room, with its address' } },
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
// stations: every group visits each one, so the station is the moment. An
// act that plays its Parlour Games as it opens (parlour.atStart, Act 6) has
// its own beat for them, so it gets no row for games at random times.
export function nightTimeline(file = night) {
  const sections = BEFORE.map(b => ({ key: b.key, clock: b.clock, title: b.title, rows: [{ key: b.key, name: b.title, what: b.what, link: b.link }] }))
  const atStart = new Set((file.parlour?.atStart ?? []).map(String))
  for (const [n, act] of Object.entries(file.acts)) {
    const rows = []
    if (file.parlour?.counts?.[n] && !atStart.has(String(n))) rows.push(parlourRow(n))
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

// ---- when, and stand-ins ---------------------------------------------------

export const WHEN = { now: 'Do now', later: 'Happens later' }

// Lists the night already covers with its own plain words until Jon writes
// his: every slot it reads has a default in code. Where each default lives:
//   ui_copy         play/src/lib/content.js DEFAULT_UI, functions/lib/deal.js
//                   NOTICES, DEFAULT_NUMBERS_LINE, DEFAULT_SCRAP, the relay
//                   rules in play/src/lib/screen.js, the filler in windows.js
//   station_text    deal.js STATION_TEXT
//   study_lines     play/src/lib/content.js DEFAULT_STUDY_LINES
//   rules_text      play/src/lib/content.js DEFAULT_RULES
//   status_lines    play/src/lib/content.js DEFAULT_STATUS
//   openers, closers, refusals   deal.js DEFAULT_VOICE, one line per cat
//   pools           case.js DEFAULT_POOLS
//   role_cards      deal.js ROLE_CARDS
//   epilogue_frames finale.js DEFAULT_EPILOGUE
//   bios            play/src/lib/content.js bioFor, the seed's own bios
//   npc_cards       play/src/lib/content.js CATS blurbs
//   templates       play/public/stationery, the seven paper stand-ins
// Not here, because the night simply leaves them out until written: what
// each motive means, cat chatter, achievements, the act scripts.
export const STANDIN_LISTS = new Set([
  'ui_copy', 'station_text', 'study_lines', 'rules_text', 'status_lines',
  'openers', 'closers', 'refusals', 'pools',
  'role_cards', 'epilogue_frames', 'bios', 'npc_cards', 'templates',
])
// The phone's own rules show only while the list is empty: once Jon writes
// one rule, his replace all eight (play/src/lib/content.js rules()).
const STANDIN_ONLY_WHILE_EMPTY = new Set(['rules_text'])
function needStandin(need, status) {
  if (need.secret || !STANDIN_LISTS.has(need.list)) return false
  return !(STANDIN_ONLY_WHILE_EMPTY.has(need.list) && status.count > 0)
}

// The rows that can only happen close to the night.
const LATER_ROWS = new Set(['week', 'setup', 'after'])
const SEEDED = new Map(ALL_TIMELINE_TASKS.map(t => [t.order, t]))

// A card's when: Jon's own choice, else the seeded card's, else its row's.
export function taskWhen(task) {
  if (task.when === 'now' || task.when === 'later') return task.when
  const seeded = SEEDED.get(task.order)
  if (seeded?.when) return seeded.when
  return LATER_ROWS.has(task.moment) ? 'later' : 'now'
}
// A stand-in that needs another card done first (the sound cards need the
// stand-in sounds made) counts only once that card is ticked.
export function taskStandin(task, tasks = []) {
  const seeded = SEEDED.get(task.order)
  if (!(task.standin ?? seeded?.standin)) return false
  const first = task.standinOnceDone ?? seeded?.standinOnceDone
  if (first == null) return true
  return tasks.some(t => t.order === first && !t.deleted && t.status === 'done')
}
// Someone else's card: Claude's (Claude Code's or Claude chat's) or Jenna's
// alone. "Jon and Claude" is Jon's.
export function taskNotYou(task) {
  return /^(Claude( Code| chat)?|Jenna)$/.test(String(task.who ?? '').trim())
}

// ---- who, and by when (23 Oct 2026) ----------------------------------------

// Everyone a card can belong to, in the order the Who row shows them.
export const OWNERS = ['Jon', 'Susan', 'Jon and Susan', 'Jenna', 'Claude Code', 'Claude chat']
// A card's owner, in those words. A card with no name is Jon's (he added
// it); the old "Claude" cards are Claude Code's; "Jon and Claude" is Jon's.
export function ownerOf(task) {
  const who = String(task?.who ?? '').replace(/\s+/g, ' ').trim()
  if (!who) return 'Jon'
  const known = OWNERS.find(o => o.toLowerCase() === who.toLowerCase())
  if (known) return known
  if (/^claude$/i.test(who)) return 'Claude Code'
  if (/^jon and /i.test(who)) return 'Jon'
  return who
}

// A card's "by" date, as YYYY-MM-DD, or null.
export function taskBy(task) {
  const by = String(task?.by ?? '').trim()
  return /^\d{4}-\d{2}-\d{2}$/.test(by) ? by : null
}
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
// "by Sat 31 Oct", or '' when the card has no date.
export function byLabel(task) {
  const by = taskBy(task)
  if (!by) return ''
  const [y, m, d] = by.split('-').map(Number)
  const day = new Date(Date.UTC(y, m - 1, d)).getUTCDay()
  return `by ${DAYS[day]} ${d} ${MONTHS[m - 1]}`
}

const isOpenCard = (t) => !t.deleted && t.status !== 'done'

// Open cards per owner: { Jon: n, Susan: n, ... }, every owner listed.
export function leftByOwner(tasks = []) {
  const out = Object.fromEntries(OWNERS.map(o => [o, 0]))
  for (const t of tasks.filter(isOpenCard)) {
    const o = ownerOf(t)
    out[o] = (out[o] ?? 0) + 1
  }
  return out
}

// "N for you, N for you and Susan, ..." in plain words, skipping the zeros.
export function leftLine(counts) {
  const name = { Jon: 'you', 'Jon and Susan': 'you and Susan together' }
  const parts = OWNERS.filter(o => counts[o]).map(o => `${counts[o]} for ${name[o] ?? o}`)
  if (!parts.length) return 'Nothing is left on the board.'
  return `What is left: ${parts.length > 1 ? `${parts.slice(0, -1).join(', ')} and ${parts.at(-1)}` : parts[0]}.`
}

// Where a moment falls in the night, for sorting (unknown moments last).
export function momentIndex(key) {
  const i = MOMENT_KEYS.indexOf(key)
  return i < 0 ? MOMENT_KEYS.length : i
}

// Open cards for one owner (or several), soonest first: dated cards by date,
// then the rest in night order, with the cards that can only happen later,
// and the ones a stand-in already covers, after the rest.
export function nextCards(tasks = [], owners = ['Jon', 'Jon and Susan'], n = 3) {
  const want = new Set(owners)
  return tasks
    .filter(t => isOpenCard(t) && want.has(ownerOf(t)))
    .map(t => ({ t, by: taskBy(t), later: taskWhen(t) === 'later', standin: taskStandin(t, tasks) }))
    .sort((a, b) => {
      if (a.by && b.by) return a.by.localeCompare(b.by) || momentIndex(a.t.moment) - momentIndex(b.t.moment)
      if (a.by || b.by) return a.by ? -1 : 1
      if (a.later !== b.later) return a.later ? 1 : -1
      if (a.standin !== b.standin) return a.standin ? 1 : -1
      return momentIndex(a.t.moment) - momentIndex(b.t.moment) || (a.t.order ?? 0) - (b.t.order ?? 0)
    })
    .slice(0, n)
    .map(x => x.t)
}

// Open cards and open decisions with no place on the night: no moment, or a
// moment that is no longer a row. The Timeline lists them at the top, each
// with a picker to file it.
export function unfiled({ tasks = [], decisions = [] } = {}) {
  const lost = (m) => !m || !MOMENT_KEYS.includes(m)
  return {
    tasks: tasks.filter(t => isOpenCard(t) && lost(t.moment)).sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
    decisions: decisions.filter(d => d.answer == null && lost(d.moment)).sort((a, b) => String(a.key).localeCompare(String(b.key))),
  }
}

// Every moment a thing can be filed under, with its name, in night order.
export function momentOptions() {
  return MOMENT_KEYS.map(key => ({ key, name: momentName(key) }))
}

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
    for (const need of s.needs) {
      const status = needStatus(need, { areas, validation })
      out.push({ kind: 'need', section: s.key, row: null, need, when: 'now', standin: needStandin(need, status), notYou: false, status })
    }
    for (const r of s.rows) {
      for (const need of r.needs) {
        if (need.also) continue
        const id = need.secret ? `secret:${need.secret}` : `${need.list}:${need.tab ?? ''}:${(need.labels ?? []).join(',')}`
        if (seen.has(id)) continue
        seen.add(id)
        const status = needStatus(need, { areas, validation })
        // The secrets are made the week before (Make the secrets), blind, by
        // Claude: never Jon's, never before the freeze.
        out.push({ kind: 'need', section: s.key, row: r.key, need, when: need.secret ? 'later' : 'now', standin: needStandin(need, status), notYou: Boolean(need.secret), status })
      }
      for (const d of byMoment(decisions, r.key)) out.push({ kind: 'decision', section: s.key, row: r.key, decision: d, when: 'now', standin: false, notYou: false, status: { done: d.answer != null } })
      // Dated cards first, soonest first, then the rest in their own order.
      const byDate = (a, b) => (taskBy(a) ?? '9999').localeCompare(taskBy(b) ?? '9999') || (a.order ?? 0) - (b.order ?? 0)
      for (const t of byMoment(tasks, r.key).filter(t => !t.deleted).sort(byDate)) {
        out.push({ kind: 'task', section: s.key, row: r.key, task: t, when: taskWhen(t), standin: taskStandin(t, tasks), notYou: taskNotYou(t), status: { done: !isOpenTask(t) } })
      }
    }
  }
  return out
}

// How much is ready in one bucket of items: { ready, total, left, standin,
// others, needsYou, first }. Of what is left, `standin` is already covered
// by a stand-in, `others` is Claude's or Jenna's to do, and `needsYou` is
// the rest; `first` is the first of those, in night order.
const needsJon = (i) => !i.status.done && !i.standin && !i.notYou
export function bucketProgress(items) {
  const left = items.filter(i => !i.status.done)
  const standin = left.filter(i => i.standin).length
  const others = left.filter(i => !i.standin && i.notYou).length
  return {
    ready: items.length - left.length, total: items.length, left: left.length,
    standin, others, needsYou: left.length - standin - others,
    first: items.find(needsJon) ?? null,
  }
}

// The whole night, and each when on its own.
export function timelineProgress(data) {
  const items = timelineItems(data)
  return {
    ...bucketProgress(items),
    now: bucketProgress(items.filter(i => i.when === 'now')),
    later: bucketProgress(items.filter(i => i.when === 'later')),
  }
}
