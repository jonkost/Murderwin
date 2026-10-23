// Pretend data for preview mode. Everything here is safe content: the seed
// lines plus the examples from the cards. Nothing is saved anywhere.
import { seedDocs, AREAS, ADDITIONS, fieldsFor, codecFor } from './content'
import { planAddition, applyPlan } from './additions'
import { ALL_CARDS } from './cards'
import tasksFile from '../../../seed/tasks.json'

const areas = seedDocs()
let nextId = 1
const id = () => `preview-${nextId++}`

// A few lines per list so every screen looks alive, built from each list's
// own example so they also pass the list's rules.
for (const [area, spec] of Object.entries(AREAS)) {
  if (spec.checklist || spec.editor) continue
  const card = ALL_CARDS[area]
  if (!card?.example?.length) continue
  const fields = fieldsFor(area)
  const vals = {}
  fields.forEach((f, i) => { if (card.example[i]) vals[f.key] = card.example[i].text })
  const text = codecFor(area).join(vals)
  const doc = areas[area] ??= { items: [] }
  if (spec.tabs) continue // tabbed lists already have seed lines where it matters
  if (!doc.items.length) doc.items.push({ id: id(), text, deleted: false, order: 0 })
}
areas.scenarios = { items: [{
  id: id(), text: 'Ice in orange juice?', deleted: false, order: 0,
  beats: [
    { q: 'Ice in orange juice?', a: 'Yes', av: 2, b: 'Never', bv: -1 },
    { q: 'Do you tell the waiter?', a: 'Politely', av: 1, b: 'Loudly', bv: 3 },
    { q: 'Would you drink it anyway?', a: 'Yes', av: 0, b: 'No', bv: -2 },
  ],
}] }

const listeners = {}
const notify = (area) => (listeners[area] ?? []).forEach(fn => fn(areas[area]?.items ?? []))

export async function ensureSeeded() { return { seeded: false } }
export async function whoAmI() { return { uid: 'preview', name: 'Preview' } }

export function subscribeArea(area, onData) {
  ;(listeners[area] ??= []).push(onData)
  queueMicrotask(() => onData(areas[area]?.items ?? []))
  return () => { listeners[area] = (listeners[area] ?? []).filter(fn => fn !== onData) }
}

const history = []
export async function saveArea(area, _items, changes) {
  const doc = areas[area] ??= { items: [] }
  for (const c of changes) {
    const idx = doc.items.findIndex(i => i.id === c.itemId)
    if (c.after === null) continue
    if (idx >= 0) doc.items[idx] = c.after
    else doc.items.push(c.after)
    history.unshift({ id: id(), area, itemId: c.itemId, before: c.before ?? null, after: c.after ?? null, by: { name: 'Preview' }, ts: { toMillis: () => Date.now() } })
  }
  notify(area)
}

export function subscribeHistory(onData) { queueMicrotask(() => onData(history)); return () => {} }

// The board as the live one has it: the seed's cards and decisions, then
// every addition, so the timeline's cards show up filed under the night.
const board = ADDITIONS.reduce((st, add) => applyPlan(planAddition(add, st, { newId: id }), st), {
  applied: [], areas: {},
  decisions: Object.fromEntries(tasksFile.decisions.map(d => [d.key, { ...d }])),
  tasks: tasksFile.tasks.map(t => ({ ...t, id: id() })),
})
let tasks = board.tasks
const taskListeners = []
export function subscribeTasks(onData) { taskListeners.push(onData); queueMicrotask(() => onData(tasks)); return () => {} }
export async function updateTask(tid, patch) { tasks = tasks.map(t => (t.id === tid ? { ...t, ...patch } : t)); taskListeners.forEach(fn => fn(tasks)) }
export async function addTask(task) { const t = { ...task, id: id() }; tasks = [...tasks, t]; taskListeners.forEach(fn => fn(tasks)); return t.id }

let decisions = Object.entries(board.decisions).map(([key, d]) => ({ ...d, key }))
const decisionListeners = []
const notifyDecisions = () => decisionListeners.forEach(fn => fn(decisions))
export function subscribeDecisions(onData) { decisionListeners.push(onData); queueMicrotask(() => onData(decisions)); return () => { const i = decisionListeners.indexOf(onData); if (i >= 0) decisionListeners.splice(i, 1) } }
export async function answerDecision(key, answer) { decisions = decisions.map(d => (d.key === key ? { ...d, answer, answeredBy: 'Preview' } : d)); notifyDecisions() }
export async function fileDecision(key, moment) { decisions = decisions.map(d => (d.key === key ? { ...d, moment } : d)); notifyDecisions() }

export async function uploadFile(folder, itemId, file) {
  return { path: `${folder}/${itemId}/${file.name}`, url: URL.createObjectURL(file), name: file.name, type: file.type, size: file.size }
}
export async function applyAdditions() {}

let game = {}
const gameListeners = []
export function subscribeGame(onData) { gameListeners.push(onData); queueMicrotask(() => onData(game)); return () => { const i = gameListeners.indexOf(onData); if (i >= 0) gameListeners.splice(i, 1) } }
export async function saveGame(patch) { game = { ...game, ...patch }; gameListeners.forEach(fn => fn(game)) }

let reviews = { rules_text: { state: 'again', note: 'The second rule reads like a legal notice.', by: { name: 'Jenna' }, at: Date.now() } }
const reviewListeners = []
export function subscribeReviews(onData) { reviewListeners.push(onData); queueMicrotask(() => onData(reviews)); return () => {} }
export async function saveReview(area, patch) { reviews = { ...reviews, [area]: { ...(reviews[area] ?? {}), ...patch, by: { name: 'Preview' }, at: Date.now() } }; reviewListeners.forEach(fn => fn(reviews)) }
export async function countLinesBy(uid, areas) { return 94 + history.filter(h => h.before === null && areas.includes(h.area)).length }
