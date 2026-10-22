// What one additive migration (an ADDITIONS entry in content.js) does to
// the database, worked out from a snapshot of what is there. Pure: no
// Firebase, no React. The store reads the snapshot inside a transaction,
// asks this for the writes, and makes them. Tested by test/content.test.mjs.
//
// An entry may carry:
//   areaDocs:        { area: doc }        create the list doc if it is missing
//   appendItems:     { area: [text] }     add lines not already there
//   appendScenarios: { area: [beats] }    add Parlour Game sets whose first
//                                         question is not already there
//   tasks:           [task]               add task cards
//   decisions:       [decision]           add decisions not already there
//   retireTasks:     [{ order, detail }]  move those task cards to done, once
//   answerDecisions: { key: answer }      answer a decision nobody has answered
// Nothing here ever deletes, reorders or rewrites a line.

import { normalizeBeats, titleOf } from './scenarios.js'

function asItems(raw) {
  if (Array.isArray(raw)) return raw
  if (Array.isArray(raw?.items)) return raw.items
  return []
}

export function defaultNewId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
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

// snapshot: { applied: [id], areas: { area: rawDocOrNull }, decisions: { key: dataOrNull }, tasks: [{ id, order, status, detail }] }
export function planAddition(add, snapshot, { newId = defaultNewId, now = Date.now() } = {}) {
  const applied = snapshot.applied ?? []
  const plan = { id: add.id, skip: false, areaDocs: {}, tasks: [], decisions: {}, taskPatches: [], decisionPatches: {}, applied }
  if (applied.includes(add.id)) { plan.skip = true; return plan }
  for (const [area, doc] of Object.entries(add.areaDocs ?? {})) {
    if (snapshot.areas?.[area] == null) plan.areaDocs[area] = doc
  }
  for (const [area, lines] of Object.entries(add.appendItems ?? {})) {
    const existing = asItems(snapshot.areas?.[area]?.items)
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
  for (const r of add.retireTasks ?? []) {
    for (const t of snapshot.tasks ?? []) {
      if (t.order !== r.order || t.status === 'done') continue
      plan.taskPatches.push({ id: t.id, patch: { status: 'done', detail: [t.detail, r.detail].filter(Boolean).join(' ') } })
    }
  }
  for (const [key, answer] of Object.entries(add.answerDecisions ?? {})) {
    const d = snapshot.decisions?.[key]
    if (d && d.answer == null) plan.decisionPatches[key] = { answer, answeredAt: now, answeredBy: 'the canon' }
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
