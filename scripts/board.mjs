#!/usr/bin/env node
// npm --prefix scripts run board: the open Timeline cards that are Claude
// Code's job, for the start of a Claude Code session. Jon's notes from the
// workshop's Game test tab come first (source 'game-test'), then the rest,
// each in board order. Read only.
//
//   npm --prefix scripts run board
//
// It reads the tasks collection and nothing else, with the same admin
// credentials as the other scripts (scripts/.env), and prints only the
// cards: who, status, title, detail, moment and order, the exact command
// kept for Claude Code (`tech`), and for a Game test note its section and
// the address last opened. A card shared with someone ("Jon and Claude
// Code") is Claude Code's too. The cards are safe content, written by Jon on
// the Timeline; nothing sealed is read. A card Jenna filed (steward: true)
// prints its title and section only, never its detail: Jenna knows the
// secrets, and the workshop files their notes in fixed words anyway.

import { fileURLToPath } from 'node:url'
import { adminDb, say, printFatal } from './lib.mjs'

// A card's owner in the Timeline's own words (app/src/lib/timeline.js
// ownerOf): a card with no name is Jon's; the old "Claude" cards are Claude Code's.
export function ownerOf(task) {
  const who = String(task?.who ?? '').replace(/\s+/g, ' ').trim()
  if (!who) return 'Jon'
  if (/^claude( code)?$/i.test(who)) return 'Claude Code'
  return who
}

export const isGameTest = task => task?.source === 'game-test' || /^Game test ·/.test(String(task?.title ?? ''))
export const isSteward = task => task?.steward === true
const isOpen = task => !!task && !task.deleted && task.status !== 'done'
const orderOf = task => (typeof task?.order === 'number' && Number.isFinite(task.order) ? task.order : Infinity)
// Claude Code's alone, or shared with someone ("Jon and Claude Code").
export const isClaudeCodes = task => ownerOf(task) === 'Claude Code' || /\bclaude code\b/i.test(String(task?.who ?? ''))

// Claude Code's open cards: the Game test notes first, then the rest, each by order.
export function claudeCodeCards(tasks = []) {
  const mine = tasks.filter(t => isOpen(t) && isClaudeCodes(t))
  const byOrder = (a, b) => orderOf(a) - orderOf(b)
  return [...mine.filter(isGameTest).sort(byOrder), ...mine.filter(t => !isGameTest(t)).sort(byOrder)]
}

// One card as plain lines: the fields the board keeps, nothing more.
export function cardLines(task) {
  const order = Number.isFinite(orderOf(task)) ? `#${task.order}` : '#?'
  const lines = [
    `${order} · ${String(task.title ?? '').trim() || '(no title)'}`,
    `  who: ${String(task.who ?? '').trim() || 'Jon'} · status: ${task.status ?? 'todo'} · moment: ${task.moment ?? '(none)'}`,
  ]
  if (isSteward(task)) {
    lines.push(`  from Jenna${task.test ? `, section ${task.test}` : ''}: the words stay off the board.`)
    return lines
  }
  const detail = String(task.detail ?? '').trim()
  if (detail) for (const line of detail.split('\n')) lines.push(`  ${line}`)
  if (isGameTest(task)) {
    const facts = [task.test ? `section ${task.test}` : null, task.tried ? `last opened ${task.tried}` : null].filter(Boolean)
    if (facts.length) lines.push(`  game test: ${facts.join(' · ')}`)
  }
  const tech = String(task.tech ?? '').trim()
  if (tech) for (const [i, line] of tech.split('\n').entries()) lines.push(`  ${i ? '  ' : 'for Claude Code: '}${line}`)
  return lines
}

export function boardText(tasks = []) {
  const cards = claudeCodeCards(tasks)
  if (!cards.length) return ['No open cards for Claude Code.']
  const tests = cards.filter(isGameTest).length
  const out = [`Open cards for Claude Code: ${cards.length} (from the Game test tab: ${tests})`]
  for (const c of cards) out.push('', ...cardLines(c))
  return out
}

async function main() {
  const db = adminDb()
  const snap = await db.collection('tasks').get()
  for (const line of boardText(snap.docs.map(d => d.data()))) say(line)
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch(e => { printFatal(e); process.exit(1) })
}
