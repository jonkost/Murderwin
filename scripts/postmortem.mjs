#!/usr/bin/env node
// The postmortem's two tools (11 Nov 2026, Jon: "a system in place to have a
// postmortem review of how things went").
//
//   npm run night-log               on the brain, before the night starts: writes down every
//                                   move of the night with its time (the act, the beat, a pause,
//                                   The End) until you press Ctrl-C. Read only.
//   npm run postmortem              after the run: puts the timings and Jon's notes from the
//   npm run postmortem -- 2026-11-11   workshop's Postmortem page into docs/postmortems/<date>.md
//
// SEAL RULE. The log reads two public documents and nothing else:
// public_state/active (which night is live) and that night's own public doc
// (nights/{id}), the same doc every phone reads. From it the log keeps only
// the act, the beat, the phase, whether it is a rehearsal, whether it is
// over, and the counts of missing lines. Never a private record, a case, a
// session or a name. The report reads the log files and the tasks collection
// (Jon's own notes, safe content). Nothing sealed is read, printed or filed.

import { appendFileSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import night from '../seed/night.json' with { type: 'json' }

const here = dirname(fileURLToPath(import.meta.url))
export const DIR = join(here, '..', 'docs', 'postmortems')

// ---- pure ------------------------------------------------------------------

const pad = n => String(n).padStart(2, '0')
export function dayOf(ms) {
  const d = new Date(ms)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}
export function clockOf(ms) {
  const d = new Date(ms)
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}
export function lengthWords(ms) {
  const s = Math.max(0, Math.round(ms / 1000))
  const m = Math.floor(s / 60)
  return m >= 60 ? `${Math.floor(m / 60)} h ${pad(m % 60)} min` : m ? `${m} min ${pad(s % 60)} s` : `${s} s`
}

// The only facts the log keeps from a night's public doc.
export function factsOf(n) {
  if (!n) return null
  const missing = n.missingLines ?? {}
  return {
    act: Number(n.act) || 0,
    beat: typeof n.beat === 'string' ? n.beat : null,
    phase: typeof n.phase === 'string' ? n.phase : null,
    rehearsal: n.forceRehearsal !== false,
    gameTest: n.gameTest === true,
    over: n.over === true,
    missing: ['hint', 'study', 'news'].reduce((sum, k) => sum + (Math.max(0, Math.floor(Number(missing[k]) || 0))), 0),
  }
}

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b)

// One log line for a change, or null when nothing the log keeps has changed.
export function entryOf(prev, facts, { nightId, at }) {
  if (!facts || same(prev, facts)) return null
  return { at, nightId, ...facts }
}

export function beatName(act, beat) {
  const a = night.acts?.[String(act)]
  if (!a) return act ? `Act ${act}` : 'Before Act 1'
  const b = a.beats.find(x => x.key === beat)
  return `Act ${act}: ${a.name}${b ? `, ${b.name}` : ''}`
}

// What the brain's window says for one entry.
export function sayOf(e) {
  const where = e.over ? 'The End' : e.phase === 'paused' ? `Paused (${beatName(e.act, e.beat)})` : e.phase === 'lobby' ? 'The lobby is open' : beatName(e.act, e.beat)
  return `${clockOf(e.at)}  ${where}${e.missing ? `  · missing lines: ${e.missing}` : ''}`
}

// The log's entries as rows: one per stretch of a beat, with how long it ran
// and how long it stood paused. `end` closes the last row (the last entry's
// time when the night was over, else when the log stopped).
export function timingRows(entries, end = null) {
  const rows = []
  let row = null
  let pausedAt = null
  const close = (at) => {
    if (!row) return
    if (pausedAt !== null) { row.pausedMs += at - pausedAt; pausedAt = null }
    row.ms = at - row.at
    rows.push(row)
    row = null
  }
  for (const e of entries) {
    if (e.over) { close(e.at); continue }
    if (e.phase === 'paused') { if (row && pausedAt === null) { pausedAt = e.at; row.pauses++ } continue }
    if (row && row.act === e.act && row.beat === e.beat) {
      if (pausedAt !== null) { row.pausedMs += e.at - pausedAt; pausedAt = null }
      continue
    }
    close(e.at)
    row = { act: e.act, beat: e.beat, at: e.at, ms: 0, pausedMs: 0, pauses: 0 }
  }
  const last = entries[entries.length - 1]
  if (row) close(Math.max(end ?? last.at, last.at))
  return rows
}

// Planned minutes for an act, where the night's file says (the acts the
// Parlour Games are timed against).
export const plannedMinutes = act => night.parlour?.actMinutes?.[String(act)] ?? null

export function actTotals(rows) {
  const out = new Map()
  for (const r of rows) {
    const t = out.get(r.act) ?? { act: r.act, ms: 0, pausedMs: 0, pauses: 0 }
    t.ms += r.ms; t.pausedMs += r.pausedMs; t.pauses += r.pauses
    out.set(r.act, t)
  }
  return [...out.values()]
}

const KIND_WORDS = { broke: 'Broke', rough: 'Rough', idea: 'Idea', keep: 'Keep' }
const KIND_ORDER = ['broke', 'rough', 'idea', 'keep']

// The report, as Markdown lines. `nights` is [{ nightId, entries }];
// `notes` the run's postmortem cards; `momentName` names a moment key.
export function reportLines({ run, nights = [], notes = [], momentName = k => k, momentIndex = () => 0, now = Date.now() }) {
  const out = [`# Postmortem: the run of ${run}`, '', `Written ${dayOf(now)} ${clockOf(now).slice(0, 5)} by \`npm run postmortem\`. The timings are the brain's log (\`npm run night-log\`); the notes are Jon's, from the workshop's Postmortem page.`, '']

  out.push('## How long each part ran', '')
  if (!nights.length) out.push('No log for this day. `npm run night-log` was not running on the brain, so there are no timings.', '')
  for (const n of nights) {
    const rows = timingRows(n.entries, n.stoppedAt ?? null)
    const first = n.entries[0]
    const missing = Math.max(0, ...n.entries.map(e => e.missing || 0))
    out.push(`Night \`${n.nightId}\`${first?.gameTest ? ' (a Game test night)' : first?.rehearsal ? ' (a rehearsal)' : ' (the party night)'}, logged from ${clockOf(first.at)}.${missing ? ` Lines that were missing when dealt: ${missing}.` : ''}`, '')
    if (!rows.length) { out.push('The night never left the lobby while the log ran.', ''); continue }
    out.push('| Started | Part of the night | Ran for | Paused |', '|---|---|---|---|')
    for (const r of rows) out.push(`| ${clockOf(r.at)} | ${beatName(r.act, r.beat)} | ${lengthWords(r.ms - r.pausedMs)} | ${r.pauses ? `${r.pauses}, ${lengthWords(r.pausedMs)}` : ''} |`)
    out.push('', '| Act | Ran for | Planned | Paused |', '|---|---|---|---|')
    for (const t of actTotals(rows)) {
      const plan = plannedMinutes(t.act)
      out.push(`| ${t.act ? `Act ${t.act}: ${night.acts[String(t.act)]?.name ?? ''}` : 'Before Act 1'} | ${lengthWords(t.ms - t.pausedMs)} | ${plan ? `${plan} min` : ''} | ${t.pauses ? `${t.pauses}, ${lengthWords(t.pausedMs)}` : ''} |`)
    }
    const whole = rows.reduce((s, r) => s + r.ms, 0)
    out.push('', `The whole run: ${lengthWords(whole)}.`, '')
  }

  out.push('## Jon\'s notes', '')
  if (!notes.length) out.push('No notes for this run yet. They come from the workshop\'s Postmortem page.', '')
  const counts = KIND_ORDER.map(k => [k, notes.filter(n => n.kind === k).length]).filter(([, n]) => n)
  if (counts.length) out.push(`${notes.length} in all: ${counts.map(([k, n]) => `${n} ${KIND_WORDS[k].toLowerCase()}`).join(', ')}. Still to fix: ${notes.filter(n => n.status !== 'done').length}.`, '')
  const sorted = [...notes].sort((a, b) => momentIndex(a.moment) - momentIndex(b.moment) || KIND_ORDER.indexOf(a.kind) - KIND_ORDER.indexOf(b.kind) || (a.order ?? 0) - (b.order ?? 0))
  let last
  for (const n of sorted) {
    if (n.moment !== last) { if (last !== undefined) out.push(''); out.push(`### ${momentName(n.moment)}`, ''); last = n.moment }
    const words = String(n.words ?? '').replace(/\s+/g, ' ').trim()
    out.push(`- **${KIND_WORDS[n.kind] ?? 'Note'}**${n.status === 'done' && n.kind !== 'keep' ? ' (fixed)' : ''}: ${words} (card ${n.order ?? '?'})`)
  }
  if (sorted.length) out.push('')

  out.push('## The review', '', 'For Claude Code, with Jon: what to fix before the party, what to cut, what to leave. One line each, then the cards on the board.', '')
  return out
}

// ---- the log files -----------------------------------------------------------

const logName = (day, nightId) => `${day}-${String(nightId).replace(/[^A-Za-z0-9_-]/g, '')}.jsonl`

export function readLogs(day, dir = DIR) {
  if (!existsSync(dir)) return []
  const out = []
  for (const f of readdirSync(dir).filter(f => f.startsWith(`${day}-`) && f.endsWith('.jsonl')).sort()) {
    const entries = []
    let stoppedAt = null
    for (const line of readFileSync(join(dir, f), 'utf8').split('\n')) {
      if (!line.trim()) continue
      try {
        const e = JSON.parse(line)
        if (e.stopped) stoppedAt = e.at
        else if (Number.isFinite(e.at)) entries.push(e)
      } catch { /* a torn line: skip it */ }
    }
    if (entries.length) out.push({ nightId: entries[0].nightId, entries, stoppedAt })
  }
  return out
}

// ---- record ------------------------------------------------------------------

async function record() {
  const { adminDb, say } = await import('./lib.mjs')
  const db = adminDb()
  mkdirSync(DIR, { recursive: true })
  let nightId = null
  let stopNight = null
  let prev = null
  let file = null
  let started = false
  const write = (obj) => { if (file) appendFileSync(file, `${JSON.stringify(obj)}\n`) }
  say('The night log is running. It writes down every move of the night and its time.')
  say('Leave this window open. Press Ctrl-C when the night is over.')
  const watchNight = (id) => {
    stopNight?.()
    stopNight = null
    if (file && nightId) write({ at: Date.now(), nightId, stopped: true })
    nightId = id
    prev = null
    file = id ? join(DIR, logName(dayOf(Date.now()), id)) : null
    if (!id) { say(`${clockOf(Date.now())}  No night is running. Waiting for one.`); return }
    say(`${clockOf(Date.now())}  Watching night ${id}.`)
    stopNight = db.doc(`nights/${id}`).onSnapshot(snap => {
      const facts = snap.exists ? factsOf(snap.data()) : null
      const e = entryOf(prev, facts, { nightId: id, at: Date.now() })
      if (!e) return
      prev = facts
      write(e)
      say(sayOf(e))
    }, err => say(`${clockOf(Date.now())}  The log lost the night for a moment (${err.code ?? 'no signal'}). It carries on when the signal is back.`))
  }
  db.doc('public_state/active').onSnapshot(snap => {
    const id = snap.exists ? snap.data().nightId ?? null : null
    if (!started || id !== nightId) { started = true; watchNight(id) }
  }, err => say(`${clockOf(Date.now())}  The log cannot see which night is live (${err.code ?? 'no signal'}).`))
  const stop = () => {
    if (file && nightId) write({ at: Date.now(), nightId, stopped: true })
    say('')
    say('The night log has stopped. Now: npm run postmortem')
    process.exit(0)
  }
  process.on('SIGINT', stop)
  process.on('SIGTERM', stop)
}

// ---- report ------------------------------------------------------------------

async function report(run) {
  const { adminDb, say } = await import('./lib.mjs')
  const { MOMENT_KEYS, momentName } = await import('../app/src/lib/timeline.js')
  const nights = readLogs(run)
  let notes = []
  let notesRead = true
  try {
    const snap = await adminDb().collection('tasks').where('source', '==', 'postmortem').get()
    notes = snap.docs.map(d => d.data()).filter(t => !t.deleted && t.run === run)
  } catch { notesRead = false }
  const index = k => (k === 'allnight' ? -1 : MOMENT_KEYS.indexOf(k) < 0 ? MOMENT_KEYS.length : MOMENT_KEYS.indexOf(k))
  const name = k => (k === 'allnight' ? 'The whole night' : momentName(k) ?? 'The whole night')
  mkdirSync(DIR, { recursive: true })
  const path = join(DIR, `${run}.md`)
  // Keep whatever was written under The review the last time.
  let review = null
  if (existsSync(path)) {
    const old = readFileSync(path, 'utf8')
    const at = old.indexOf('\n## The review\n')
    if (at >= 0) review = old.slice(at + 1)
  }
  let lines = reportLines({ run, nights, notes, momentName: name, momentIndex: index })
  if (review) lines = [...lines.slice(0, lines.indexOf('## The review')), review.trimEnd(), '']
  writeFileSync(path, `${lines.join('\n')}`)
  say(`Postmortem of ${run}: ${nights.length} ${nights.length === 1 ? 'night' : 'nights'} logged, ${notes.length} ${notes.length === 1 ? 'note' : 'notes'}${notesRead ? '' : ' (the notes could not be read: no way into Firestore from here)'}.`)
  say(`Written to docs/postmortems/${run}.md`)
}

async function main() {
  const [mode, arg] = process.argv.slice(2)
  if (mode === 'record') return record()
  if (mode === 'report') {
    const run = arg ?? dayOf(Date.now())
    if (!/^\d{4}-\d{2}-\d{2}$/.test(run)) { console.log('The date goes as 2026-11-11.'); process.exit(2) }
    await report(run)
    process.exit(0)
  }
  console.log('npm run night-log (before the night), or npm run postmortem (after it).')
  process.exit(2)
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch(e => { console.log(`Stopped: ${e?.code ?? e?.message ?? 'an error'}`); process.exit(1) })
}
