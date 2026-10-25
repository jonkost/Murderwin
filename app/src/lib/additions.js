// What one additive migration (an ADDITIONS entry in content.js) does to
// the database, worked out from a snapshot of what is there. Pure: no
// Firebase, no React. The store reads the snapshot inside a transaction,
// asks this for the writes, and makes them. Tested by test/content.test.mjs.
//
// An entry may carry:
//   areaDocs:        { area: doc }        create the list doc if it is missing
//   retireItems:     { area: [text] }     mark deleted (never erase) the live
//                                         lines whose opening words (before the
//                                         dash) match one of these; runs before
//                                         appendItems
//   appendItems:     { area: [text] }     add lines not already there
//   appendScenarios: { area: [beats] }    add Parlour Game sets whose first
//                                         question is not already there
//   tasks:           [task]               add task cards
//   decisions:       [decision]           add decisions not already there
//   retireTasks:     [{ order, title?, detail }]
//                                         move those task cards to done, once
//   answerDecisions: { key: answer }      answer a decision nobody has answered
//   fileTasks:       [{ order, title?, moment?, from?, by?, note? }]
//                                         on those open cards: file under
//                                         `moment` (only a card with no moment,
//                                         or one still under `from`), give a
//                                         `by` date (only a card with none),
//                                         and add `note` to the end of the detail
//   rewriteTasks:    [{ order, title?, set }]
//                                         on those open cards: replace the
//                                         fields in `set` (title, detail, who,
//                                         moment, by, when, tech), once, when a
//                                         card's words must change rather than
//                                         grow. The words replaced are kept on
//                                         the card, under `previous`, by entry
//   fileDecisions:   { key: moment }      file a decision that has no moment
//   refileDecisions: { key: { from, to, set? } }
//                                         move a decision still filed under
//                                         `from` (a moment the night no longer
//                                         has, or the same one) to `to`, and
//                                         replace the fields in `set`
//                                         (question, options, note, who,
//                                         retired). New options keep their
//                                         places: an answer that was one of the
//                                         old options becomes the new option in
//                                         the same place, so Jon's pick stands
//   supersedeDecisions: { key: answer }  on a decision whose answer later
//                                         decisions replaced (24 Oct 2026: six
//                                         still showed their 31 August
//                                         answers): the answer becomes this
//                                         plain line saying what is true now,
//                                         answered by 'later decisions'. The
//                                         answer it replaces is kept on the
//                                         decision, under `previous`, by entry
// With a `title`, a card must also have that title (any case), so a card
// someone added by hand that happens to share a number is never touched.
// Nothing here ever erases or reorders a line; retireItems only sets the
// soft-delete flag the workshop's own Remove sets, and rewriteTasks and
// supersedeDecisions keep the words they replace. The store reads only the
// cards taskOrdersOf names and the decisions decisionKeysOf names, so every
// operation here works on those.

import { normalizeBeats, titleOf } from './scenarios.js'

function asItems(raw) {
  if (Array.isArray(raw)) return raw
  if (Array.isArray(raw?.items)) return raw.items
  return []
}

export function defaultNewId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

// A line's opening words, before the dash, as the matching rules read them.
export function headOf(line) {
  return String(line ?? '').split('—')[0].replace(/\s+/g, ' ').trim().toLowerCase()
}

// Lines to append to a list: those whose opening words (before the dash)
// are not already there. A line Jon has since edited is never doubled.
export function freshLines(existing, lines, newId = defaultNewId) {
  const have = existing.filter(it => !it.deleted).map(it => String(it.text ?? '').toLowerCase().replace(/\s+/g, ' ').trim())
  let order = Math.max(-1, ...existing.map(it => it.order ?? 0))
  const seen = new Set()
  return lines.filter(line => {
    const head = line.split('—')[0].replace(/\s+/g, ' ').trim().toLowerCase()
    if (!head || seen.has(head)) return false
    seen.add(head)
    return !have.some(t => t.startsWith(head))
  }).map(text => ({ id: newId(), text, deleted: false, order: ++order }))
}

// Parlour Game sets to append: those whose first question is not already a
// first question in the list. A set Jon has since reworded is never doubled.
export function freshScenarios(existing, sets, newId = defaultNewId) {
  const norm = t => String(t ?? '').toLowerCase().replace(/\s+/g, ' ').trim()
  const have = new Set(existing.filter(it => !it.deleted).map(it => norm(titleOf(it.beats) || it.text)))
  let order = Math.max(-1, ...existing.map(it => it.order ?? 0))
  const out = []
  for (const raw of sets) {
    const beats = normalizeBeats(raw)
    const head = norm(titleOf(beats))
    if (!head || have.has(head)) continue
    have.add(head)
    out.push({ id: newId(), text: titleOf(beats), beats, deleted: false, order: ++order })
  }
  return out
}

const normTitle = (t) => String(t ?? '').replace(/\s+/g, ' ').trim().toLowerCase()
// The seeded card an entry means: its number, and its title when one is given.
export function taskMatches(task, entry) {
  if (task.order !== entry.order) return false
  return entry.title == null || normTitle(task.title) === normTitle(entry.title)
}

// The task orders an entry looks up (the store fetches those cards first).
export function taskOrdersOf(add) {
  return [...new Set([...(add.retireTasks ?? []), ...(add.fileTasks ?? []), ...(add.rewriteTasks ?? [])].map(r => r.order))]
}

// The decision keys an entry reads (the store fetches those decisions first).
export function decisionKeysOf(add) {
  return [...new Set([
    ...(add.decisions ?? []).map(d => d.key),
    ...Object.keys(add.answerDecisions ?? {}),
    ...Object.keys(add.fileDecisions ?? {}),
    ...Object.keys(add.refileDecisions ?? {}),
    ...Object.keys(add.supersedeDecisions ?? {}),
  ])]
}

// The fields a rewrite may replace on a card, and on a decision.
export const REWRITE_TASK_FIELDS = ['title', 'detail', 'who', 'moment', 'by', 'when', 'tech']
export const REWRITE_DECISION_FIELDS = ['question', 'options', 'note', 'who', 'retired']
const pick = (obj, keys) => Object.fromEntries(keys.filter(k => obj?.[k] !== undefined).map(k => [k, obj[k]]))

// snapshot: { applied: [id], areas: { area: rawDocOrNull }, decisions: { key: dataOrNull }, tasks: [{ id, order, title, status, detail, moment, by }] }
export function planAddition(add, snapshot, { newId = defaultNewId, now = Date.now() } = {}) {
  const applied = snapshot.applied ?? []
  const plan = { id: add.id, skip: false, areaDocs: {}, tasks: [], decisions: {}, taskPatches: [], decisionPatches: {}, applied }
  if (applied.includes(add.id)) { plan.skip = true; return plan }
  for (const [area, doc] of Object.entries(add.areaDocs ?? {})) {
    if (snapshot.areas?.[area] == null) plan.areaDocs[area] = doc
  }
  for (const [area, lines] of Object.entries(add.retireItems ?? {})) {
    const existing = asItems(plan.areaDocs[area]?.items ?? snapshot.areas?.[area]?.items)
    const heads = new Set(lines.map(headOf).filter(Boolean))
    let retired = 0
    const items = existing.map(it => {
      if (it.deleted || !heads.has(headOf(it.text))) return it
      retired++
      return { ...it, deleted: true, retiredBy: add.id }
    })
    if (retired) plan.areaDocs[area] = { items }
  }
  for (const [area, lines] of Object.entries(add.appendItems ?? {})) {
    const existing = asItems(plan.areaDocs[area]?.items ?? snapshot.areas?.[area]?.items)
    const fresh = freshLines(existing, lines, newId)
    if (fresh.length) plan.areaDocs[area] = { items: [...existing, ...fresh] }
  }
  for (const [area, sets] of Object.entries(add.appendScenarios ?? {})) {
    const existing = asItems(plan.areaDocs[area]?.items ?? snapshot.areas?.[area]?.items)
    const fresh = freshScenarios(existing, sets, newId)
    if (fresh.length) plan.areaDocs[area] = { items: [...existing, ...fresh] }
  }
  for (const t of add.tasks ?? []) plan.tasks.push({ ...t, ts: now })
  for (const d of add.decisions ?? []) {
    if (snapshot.decisions?.[d.key] == null) plan.decisions[d.key] = { ...d, answeredAt: null }
  }
  // One patch per card and per decision, however many entries touch it.
  const patchOf = (id) => plan.taskPatches.find(p => p.id === id)
  const patchTask = (id, patch) => { const p = patchOf(id); if (p) Object.assign(p.patch, patch); else plan.taskPatches.push({ id, patch }) }
  const current = (t) => ({ ...t, ...(patchOf(t.id)?.patch ?? {}) })
  for (const r of add.retireTasks ?? []) {
    for (const t of snapshot.tasks ?? []) {
      if (!taskMatches(t, r) || current(t).status === 'done') continue
      patchTask(t.id, { status: 'done', detail: [current(t).detail, r.detail].filter(Boolean).join(' ') })
    }
  }
  for (const f of add.fileTasks ?? []) {
    for (const t of snapshot.tasks ?? []) {
      const c = current(t)
      if (!taskMatches(t, f) || c.deleted || c.status === 'done') continue
      const patch = {}
      if (f.moment && (!c.moment || (f.from != null && c.moment === f.from))) patch.moment = f.moment
      if (f.by && !c.by) patch.by = f.by
      if (f.note) patch.detail = [c.detail, f.note].filter(Boolean).join(' ')
      if (Object.keys(patch).length) patchTask(t.id, patch)
    }
  }
  for (const r of add.rewriteTasks ?? []) {
    const set = pick(r.set, REWRITE_TASK_FIELDS)
    if (!Object.keys(set).length) continue
    for (const t of snapshot.tasks ?? []) {
      const c = current(t)
      if (!taskMatches(t, r) || c.deleted || c.status === 'done') continue
      const was = Object.fromEntries(Object.keys(set).map(k => [k, c[k] ?? null]))
      patchTask(t.id, { ...set, previous: { ...(c.previous ?? {}), [add.id]: was } })
    }
  }
  for (const [key, answer] of Object.entries(add.answerDecisions ?? {})) {
    const d = snapshot.decisions?.[key]
    if (d && d.answer == null) plan.decisionPatches[key] = { ...plan.decisionPatches[key], answer, answeredAt: now, answeredBy: 'the canon' }
  }
  for (const [key, moment] of Object.entries(add.fileDecisions ?? {})) {
    const d = snapshot.decisions?.[key]
    if (d && !d.moment) plan.decisionPatches[key] = { ...plan.decisionPatches[key], moment }
  }
  for (const [key, { from, to, set }] of Object.entries(add.refileDecisions ?? {})) {
    const d = snapshot.decisions?.[key]
    if (!d || d.moment !== from) continue
    const fields = pick(set, REWRITE_DECISION_FIELDS)
    const answer = { ...d, ...plan.decisionPatches[key] }.answer
    const at = Array.isArray(fields.options) && answer != null ? (d.options ?? []).indexOf(answer) : -1
    if (at >= 0 && fields.options[at] != null) fields.answer = fields.options[at]
    plan.decisionPatches[key] = { ...plan.decisionPatches[key], moment: to, ...fields }
  }
  for (const [key, answer] of Object.entries(add.supersedeDecisions ?? {})) {
    const d = snapshot.decisions?.[key]
    if (!d || !answer) continue
    const c = { ...d, ...plan.decisionPatches[key] }
    if (c.answer === answer) continue
    const was = { answer: c.answer ?? null, answeredBy: c.answeredBy ?? null, answeredAt: c.answeredAt ?? null }
    plan.decisionPatches[key] = {
      ...plan.decisionPatches[key],
      answer, answeredAt: now, answeredBy: 'later decisions',
      previous: { ...(c.previous ?? {}), [add.id]: was },
    }
  }
  plan.applied = [...applied, add.id]
  return plan
}

// Apply a plan to a plain in-memory copy of the database (the tests, and the
// preview store). Same rules as the real store, no transaction.
export function applyPlan(plan, state) {
  if (plan.skip) return state
  const next = {
    applied: plan.applied,
    areas: { ...(state.areas ?? {}) },
    decisions: { ...(state.decisions ?? {}) },
    tasks: [...(state.tasks ?? [])],
  }
  for (const [area, doc] of Object.entries(plan.areaDocs)) next.areas[area] = doc
  for (const [key, doc] of Object.entries(plan.decisions)) next.decisions[key] = doc
  for (const t of plan.tasks) next.tasks.push({ id: `t${next.tasks.length + 1}`, ...t })
  for (const { id, patch } of plan.taskPatches) next.tasks = next.tasks.map(t => (t.id === id ? { ...t, ...patch } : t))
  for (const [key, patch] of Object.entries(plan.decisionPatches)) next.decisions[key] = { ...next.decisions[key], ...patch }
  return next
}
