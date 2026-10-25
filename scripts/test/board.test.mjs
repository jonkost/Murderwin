import { test } from 'node:test'
import assert from 'node:assert/strict'
import { ownerOf, claudeCodeCards, cardLines, boardText, isClaudeCodes } from '../board.mjs'

// npm --prefix scripts run board: the open cards that are Claude Code's, the
// command kept for Claude Code included. Made-up cards only.

const card = (over) => ({ status: 'todo', moment: 'freeze', title: 'A card', detail: 'Plain words.', ...over })

test('the owner: Claude Code alone or shared, the old Claude cards too; done and deleted cards are left out', () => {
  assert.equal(ownerOf({ who: 'claude' }), 'Claude Code')
  assert.equal(ownerOf({}), 'Jon')
  assert.ok(isClaudeCodes({ who: 'Jon and Claude Code' }))
  assert.ok(!isClaudeCodes({ who: 'Claude chat' }))
  const tasks = [
    card({ order: 5, who: 'Claude Code', title: 'Five' }),
    card({ order: 3, who: 'Jon and Claude Code', title: 'Three' }),
    card({ order: 10001, who: 'Claude Code', source: 'game-test', title: 'Game test · In Duplicate: slow' }),
    card({ order: 1, who: 'Claude Code', status: 'done', title: 'Done' }),
    card({ order: 2, who: 'Claude Code', deleted: true, title: 'Gone' }),
    card({ order: 4, who: 'Claude chat', title: 'Not ours' }),
  ]
  assert.deepEqual(claudeCodeCards(tasks).map(t => t.title), ['Game test · In Duplicate: slow', 'Three', 'Five'])
})

test('a card prints its command for Claude Code, and a Game test note its section and address', () => {
  const lines = cardLines(card({ order: 472, who: 'Claude Code', tech: 'npm run checks\nthen look at the Health page' }))
  assert.ok(lines.includes('  for Claude Code: npm run checks'))
  assert.ok(lines.includes('    then look at the Health page'))
  const note = cardLines(card({ order: 10000, who: 'Claude Code', source: 'game-test', test: 'salem', tried: '?practice=salem', tech: 'Game test tab, section salem.' }))
  assert.ok(note.includes('  game test: section salem · last opened ?practice=salem'))
  assert.ok(note.some(l => l.includes('for Claude Code: Game test tab')))
  assert.ok(!cardLines(card({ order: 1 })).some(l => l.includes('for Claude Code')), 'no tech, no line')
})

test('a card Jenna filed prints its title and section only, never its words', () => {
  const lines = cardLines(card({ order: 10002, who: 'Claude Code', source: 'game-test', steward: true, test: 'boo', title: 'Game test · Boo’s Catwalk: Jenna says needs more', detail: 'SECRET-ISH WORDS', tech: 'SECRET-ISH TECH' }))
  assert.ok(lines[0].includes('Jenna says needs more'))
  assert.ok(lines.some(l => l.includes('from Jenna, section boo')))
  assert.ok(!lines.join('\n').includes('SECRET-ISH'))
  assert.deepEqual(boardText([]), ['No open cards for Claude Code.'])
})
