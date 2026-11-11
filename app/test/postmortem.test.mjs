import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  KINDS, kindOf, momentChoices, WHOLE_NIGHT, todayRun, isRun, runsOf, runCards, nextOrder, postmortemTask, countsLine, runText, isPostmortemCard, POSTMORTEM_SOURCE,
} from '../src/lib/postmortem.js'
import { MOMENT_KEYS, ownerOf } from '../src/lib/timeline.js'
import { isGameTestCard, FIRST_ORDER } from '../src/lib/gameTest.js'

const here = dirname(fileURLToPath(import.meta.url))
const src = f => readFileSync(join(here, '..', 'src', f), 'utf8')
const NOW = new Date(2026, 10, 11, 21, 30).getTime()

test('the moments: the whole night first, then setting up and every row of the seven acts', () => {
  const m = momentChoices()
  assert.equal(m[0].key, WHOLE_NIGHT)
  assert.ok(MOMENT_KEYS.includes(WHOLE_NIGHT), 'a note about the whole night is still filed on a row')
  assert.equal(m[1].key, 'setup')
  for (const n of [1, 2, 3, 4, 5, 6, 7]) assert.ok(m.some(x => x.key.startsWith(`act${n}.`)), `Act ${n} has a moment`)
  assert.ok(m.every(x => x.name && (x.key === WHOLE_NIGHT || MOMENT_KEYS.includes(x.key))))
  assert.equal(new Set(m.map(x => x.key)).size, m.length)
})

test('a note is a Timeline card for Claude Code, filed at its moment; a Keep is filed done', () => {
  const t = postmortemTask({ run: '2026-11-11', moment: 'act4.study', kind: 'broke', words: '  The deck froze after the second round and nobody knew what to do next  ', now: NOW, order: 10040 })
  assert.equal(ownerOf(t), 'Claude Code')
  assert.equal(t.status, 'todo')
  assert.equal(t.source, POSTMORTEM_SOURCE)
  assert.equal(t.moment, 'act4.study')
  assert.equal(t.run, '2026-11-11')
  assert.equal(t.words, 'The deck froze after the second round and nobody knew what to do next')
  assert.ok(t.title.startsWith('Postmortem · Broke · '))
  assert.ok(t.title.endsWith('…'), 'the title is the first words')
  assert.ok(t.tech.includes('npm run postmortem -- 2026-11-11'))
  assert.ok(isPostmortemCard(t) && !isGameTestCard(t))
  const keep = postmortemTask({ run: '2026-11-11', moment: 'nowhere', kind: 'keep', words: 'The blackout was great', now: NOW, order: 10041 })
  assert.equal(keep.status, 'done')
  assert.equal(keep.moment, WHOLE_NIGHT, 'an unknown moment files under the whole night')
  assert.equal(kindOf('nonsense').key, 'rough')
  assert.equal(KINDS.length, 4)
})

test('numbers, runs and the lists', () => {
  assert.equal(nextOrder([]), FIRST_ORDER)
  assert.equal(nextOrder([{ order: 559 }, { order: 10012, source: 'game-test' }]), 10013, 'one range with the Game test notes')
  assert.equal(nextOrder([{ order: 10012 }], 10020), 10021)
  assert.equal(todayRun(NOW), '2026-11-11')
  assert.ok(isRun('2026-11-11') && !isRun('11 Nov') && !isRun(''))
  const tasks = [
    postmortemTask({ run: '2026-11-11', moment: 'act6.drawing', kind: 'rough', words: 'b', now: NOW, order: 10051 }),
    postmortemTask({ run: '2026-11-11', moment: 'act2.news', kind: 'idea', words: 'a', now: NOW, order: 10052 }),
    postmortemTask({ run: '2026-11-11', moment: WHOLE_NIGHT, kind: 'keep', words: 'w', now: NOW, order: 10053 }),
    postmortemTask({ run: '2026-11-04', moment: 'act2.news', kind: 'broke', words: 'old', now: NOW, order: 10001 }),
    { ...postmortemTask({ run: '2026-11-11', moment: 'act2.news', kind: 'broke', words: 'gone', now: NOW, order: 10054 }), deleted: true },
    { source: 'game-test', order: 10002, status: 'todo' },
  ]
  assert.deepEqual(runsOf(tasks), ['2026-11-11', '2026-11-04'])
  assert.deepEqual(runCards(tasks, '2026-11-11').map(t => t.words), ['w', 'a', 'b'], 'the whole night, then night order')
  assert.equal(countsLine(runCards(tasks, '2026-11-11')), '3 notes: 1 rough, 1 idea, 1 keep. 2 still to fix.')
  assert.equal(countsLine([]), 'No notes for this run yet.')
  const text = runText(tasks, '2026-11-11', NOW)
  assert.ok(text.startsWith('Postmortem of the run of 2026-11-11.'))
  assert.ok(text.includes('- Idea: a (card 10052)'))
  assert.ok(!text.includes('gone') && !text.includes('old'))
  assert.equal(runText(tasks, '2026-01-01'), 'No postmortem notes for the run of 2026-01-01.')
})

test('the page: a route, links to it, and only the Timeline is touched', () => {
  const app = src('App.jsx')
  assert.ok(app.includes('<Route path="/postmortem" element={<Postmortem />} />'))
  assert.ok(!/NavLink to="\/postmortem"/.test(app), 'not in the rail: it is full on a phone')
  for (const page of ['pages/Status.jsx', 'pages/Night.jsx', 'pages/Dashboard.jsx']) assert.ok(src(page).includes('to="/postmortem"'), `${page} links to it`)
  const page = src('pages/Postmortem.jsx')
  assert.ok(page.includes("from '../lib/store'") && !/firebase/.test(page), 'the page goes through the store')
  assert.ok(/subscribeTasks/.test(page) && /addTask/.test(page) && !/updateTask|saveArea|saveGame/.test(page))
})
