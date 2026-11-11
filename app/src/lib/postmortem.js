// The Postmortem page (11 Nov 2026, Jon: "a system in place to have a
// postmortem review of how things went"). Pure: no React, no Firebase.
//
// After a run of the night Jon says one thing at a time: when in the night it
// was, what kind of thing it is, and his words. Each note is a Timeline card
// (app/src/lib/store.firestore.js addTask) with source 'postmortem' and the
// run's date, so the board prints them first for Claude Code and
// `npm run postmortem` writes them, with the night's timings, into
// docs/postmortems/<date>.md. A note is Jon's own words about how the night
// ran: safe content. Nothing here reads a night.

import { MOMENT_KEYS, momentName } from './timeline.js'
import { firstWords, whenWords, FIRST_ORDER } from './gameTest.js'

export const POSTMORTEM_SOURCE = 'postmortem'

// What kind of thing a note is, in the order the page offers them.
export const KINDS = [
  { key: 'broke', label: 'It broke', word: 'Broke' },
  { key: 'rough', label: 'It was rough', word: 'Rough' },
  { key: 'idea', label: 'An idea', word: 'Idea' },
  { key: 'keep', label: 'It worked: keep it', word: 'Keep' },
]
export const KIND_KEYS = KINDS.map(k => k.key)
export const kindOf = key => KINDS.find(k => k.key === key) ?? KINDS[1]

// Where a note about no one moment is filed: the Timeline's all-night row.
export const WHOLE_NIGHT = 'allnight'

// The moments the page offers, in night order: the whole night first, then
// setting up, then every row of Acts 1 to 7.
export function momentChoices() {
  const night = MOMENT_KEYS.filter(k => k === 'setup' || /^act\d\./.test(k))
  return [{ key: WHOLE_NIGHT, name: 'The whole night' }, ...night.map(key => ({ key, name: momentName(key) ?? key }))]
}

export const isPostmortemCard = t => Boolean(t) && !t.deleted && t.source === POSTMORTEM_SOURCE

// A run is named by its date, 2026-11-11.
export const isRun = s => /^\d{4}-\d{2}-\d{2}$/.test(String(s ?? ''))
export function todayRun(now = Date.now()) {
  const d = new Date(now)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// Every run that has a note, newest first.
export function runsOf(tasks) {
  return [...new Set((tasks ?? []).filter(isPostmortemCard).map(t => t.run).filter(isRun))].sort().reverse()
}

const momentIndex = key => {
  if (key === WHOLE_NIGHT) return -1
  const i = MOMENT_KEYS.indexOf(key)
  return i < 0 ? MOMENT_KEYS.length : i
}

// One run's notes in night order, then in the order they were sent.
export function runCards(tasks, run) {
  return (tasks ?? [])
    .filter(t => isPostmortemCard(t) && t.run === run)
    .sort((a, b) => momentIndex(a.moment) - momentIndex(b.moment) || (a.order ?? 0) - (b.order ?? 0))
}

// A note's card number: the notes' own range from 10000, shared with the
// Game test notes, clear of the seeded cards.
export function nextOrder(tasks, lastUsed = 0) {
  const used = (tasks ?? []).filter(t => t && Number.isFinite(t.order) && t.order >= FIRST_ORDER).map(t => t.order)
  return Math.max(FIRST_ORDER - 1, lastUsed, ...used) + 1
}

const momentWords = key => (key === WHOLE_NIGHT ? 'The whole night' : momentName(key) ?? 'The whole night')

// The Timeline card for one note. A Keep note is filed done: it is something
// to leave alone, not a job.
export function postmortemTask({ run, moment, kind, words, now = Date.now(), order }) {
  const text = String(words ?? '').trim()
  const k = kindOf(kind)
  const at = MOMENT_KEYS.includes(moment) ? moment : WHOLE_NIGHT
  return {
    title: `Postmortem · ${k.word} · ${momentWords(at)}: ${firstWords(text, 8)}`,
    detail: [text, '', `${k.label}. The run of ${run}.`, `Sent ${whenWords(now)}. From the Postmortem page.`].join('\n'),
    status: k.key === 'keep' ? 'done' : 'todo',
    who: 'Claude Code',
    moment: at,
    when: 'now',
    order,
    source: POSTMORTEM_SOURCE,
    run,
    kind: k.key,
    words: text,
    sentAt: now,
    tech: k.key === 'keep'
      ? `Postmortem of the run of ${run}: something that worked. Leave it as it is.`
      : `Postmortem of the run of ${run}. \`npm run postmortem -- ${run}\` writes every note of that run, with the night's timings, into docs/postmortems/${run}.md. Once fixed, mark this card done by its number and title.`,
  }
}

// How many of each kind a run has, and how many are still open.
export function runCounts(cards) {
  const out = { total: cards.length, open: 0, broke: 0, rough: 0, idea: 0, keep: 0 }
  for (const c of cards) {
    if (KIND_KEYS.includes(c.kind)) out[c.kind]++
    if (c.status !== 'done') out.open++
  }
  return out
}

export function countsLine(cards) {
  if (!cards.length) return 'No notes for this run yet.'
  const c = runCounts(cards)
  const parts = KINDS.filter(k => c[k.key]).map(k => `${c[k.key]} ${k.word.toLowerCase()}`)
  return `${c.total} ${c.total === 1 ? 'note' : 'notes'}: ${parts.join(', ')}. ${c.open} still to fix.`
}

// One run as plain text, for pasting into a Claude chat.
export function runText(tasks, run, now = Date.now()) {
  const cards = runCards(tasks, run)
  if (!cards.length) return `No postmortem notes for the run of ${run}.`
  const out = [`Postmortem of the run of ${run}. ${countsLine(cards)} Copied ${whenWords(now)}.`]
  let last = null
  for (const c of cards) {
    if (c.moment !== last) { out.push('', momentWords(c.moment)); last = c.moment }
    out.push(`- ${kindOf(c.kind).word}${c.status === 'done' && c.kind !== 'keep' ? ' (fixed)' : ''}: ${c.words || firstWords(c.detail, 40)} (card ${c.order})`)
  }
  return out.join('\n')
}
