import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { factsOf, entryOf, timingRows, actTotals, reportLines, beatName, sayOf, lengthWords, dayOf } from '../postmortem.mjs'
import { claudeCodeCards, boardText, cardLines } from '../board.mjs'
import { found, strays, folderLines, report, mediaDir, VIDEO_CLIPS, BULLETIN2_CLIPS } from '../media-check.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const T = Date.UTC(2026, 10, 11, 23, 0, 0)
const min = n => n * 60000
const e = (at, act, beat, more = {}) => ({ at: T + at, nightId: 'n1', act, beat, phase: 'act', rehearsal: true, gameTest: false, over: false, missing: 0, ...more })

test('the log keeps only the public facts of a night, never a name or a record', () => {
  const f = factsOf({ act: 2, beat: 'cat', phase: 'act', forceRehearsal: true, roster: { a: { name: 'Jon' } }, hosts: ['Jon'], label: 'x', missingLines: { hint: 2, study: 1 }, window: { id: 'w' } })
  assert.deepEqual(Object.keys(f).sort(), ['act', 'beat', 'gameTest', 'missing', 'over', 'phase', 'rehearsal'])
  assert.equal(f.missing, 3)
  assert.equal(factsOf(null), null)
  assert.equal(factsOf({ forceRehearsal: false }).rehearsal, false, 'only the party night is not a rehearsal')
})

test('an entry only when something the log keeps has changed', () => {
  const a = factsOf({ act: 1, beat: 'arrive', phase: 'act' })
  assert.equal(entryOf(a, factsOf({ act: 1, beat: 'arrive', phase: 'act', roster: { x: 1 } }), { nightId: 'n', at: 1 }), null)
  const next = entryOf(a, factsOf({ act: 1, beat: 'rules', phase: 'act' }), { nightId: 'n', at: 5 })
  assert.equal(next.beat, 'rules')
  assert.equal(next.at, 5)
})

test('timings: each beat once, a pause counted and taken off, The End closes the last', () => {
  const rows = timingRows([
    e(0, 1, 'arrive'),
    e(min(10), 1, 'rules'),
    e(min(12), 1, 'rules', { phase: 'paused' }),
    e(min(15), 1, 'rules'),
    e(min(20), 2, 'orient'),
    e(min(50), 2, 'orient', { over: true }),
  ])
  assert.deepEqual(rows.map(r => [r.act, r.beat, r.ms / 60000, r.pausedMs / 60000, r.pauses]), [
    [1, 'arrive', 10, 0, 0], [1, 'rules', 10, 3, 1], [2, 'orient', 30, 0, 0],
  ])
  const totals = actTotals(rows)
  assert.deepEqual(totals.map(t => [t.act, t.ms / 60000]), [[1, 20], [2, 30]])
  // a log that stopped mid-beat closes at the stop
  assert.equal(timingRows([e(0, 4, 'round1')], T + min(7))[0].ms, min(7))
  assert.deepEqual(timingRows([]), [])
})

test('the names and the words', () => {
  assert.equal(beatName(4, 'round1').startsWith('Act 4: Behind Closed Doors'), true)
  assert.equal(beatName(0, 'arrive'), 'Before Act 1')
  assert.equal(lengthWords(min(75)), '1 h 15 min')
  assert.equal(lengthWords(125000), '2 min 05 s')
  assert.ok(sayOf(e(0, 2, 'cat', { phase: 'paused' })).includes('Paused'))
  assert.ok(sayOf(e(0, 7, 'end', { over: true })).includes('The End'))
  assert.match(dayOf(Date.now()), /^\d{4}-\d{2}-\d{2}$/)
})

test('the report: the timings, the notes in night order, what broke first, and a place for the review', () => {
  const notes = [
    { moment: 'act4.study', kind: 'rough', words: 'The wall was slow', status: 'todo', order: 10021, run: '2026-11-11' },
    { moment: 'act2.news', kind: 'keep', words: 'The news landed', status: 'done', order: 10020, run: '2026-11-11' },
    { moment: 'act4.study', kind: 'broke', words: 'The deck   froze', status: 'todo', order: 10022, run: '2026-11-11' },
  ]
  const order = ['act2.news', 'act4.study']
  const lines = reportLines({ run: '2026-11-11', nights: [{ nightId: 'n1', entries: [e(0, 1, 'arrive'), e(min(5), 2, 'orient'), e(min(40), 2, 'orient', { over: true })] }], notes, momentName: k => k, momentIndex: k => order.indexOf(k), now: T })
  const text = lines.join('\n')
  assert.ok(text.includes('# Postmortem: the run of 2026-11-11'))
  assert.ok(text.includes('| Act 2: Lights Out | 35 min 00 s | 30 min |'), 'the act against its plan')
  assert.ok(text.includes('3 in all: 1 broke, 1 rough, 1 keep. Still to fix: 2.'))
  assert.ok(text.indexOf('The news landed') < text.indexOf('The deck froze'), 'night order')
  assert.ok(text.indexOf('The deck froze') < text.indexOf('The wall was slow'), 'broke before rough')
  assert.ok(text.includes('(card 10022)'))
  assert.equal(lines.filter(l => l === '## The review').length, 1)
  const none = reportLines({ run: '2026-11-11', now: T }).join('\n')
  assert.ok(none.includes('No log for this day'))
  assert.ok(none.includes('No notes for this run yet'))
})

test('the recorder reads two public documents and nothing private', () => {
  const src = readFileSync(join(here, '..', 'postmortem.mjs'), 'utf8')
  const docs = [...src.matchAll(/db\.doc\(([^)]+)\)/g)].map(m => m[1])
  assert.deepEqual(docs.sort(), ["'public_state/active'", '`nights/${id}`'].sort())
  assert.ok(!/private|sealed|cases\/|sessions/.test(src.replace(/\/\/.*$/gm, '')), 'no private road in the code')
  assert.deepEqual([...src.matchAll(/collection\('([^']+)'\)/g)].map(m => m[1]), ['tasks'])
})

test('the board prints the postmortem notes first: the newest run, what broke first', () => {
  const tasks = [
    { who: 'Claude Code', status: 'todo', order: 474, title: 'Set up the study' },
    { who: 'Claude Code', status: 'todo', order: 10030, title: 'Game test · x', source: 'game-test', test: 'study' },
    { who: 'Claude Code', status: 'todo', order: 10031, title: 'Postmortem · rough', source: 'postmortem', run: '2026-11-11', kind: 'rough' },
    { who: 'Claude Code', status: 'todo', order: 10032, title: 'Postmortem · broke', source: 'postmortem', run: '2026-11-11', kind: 'broke' },
    { who: 'Claude Code', status: 'todo', order: 10010, title: 'Postmortem · old', source: 'postmortem', run: '2026-11-04', kind: 'broke' },
    { who: 'Claude Code', status: 'done', order: 10033, title: 'Postmortem · keep', source: 'postmortem', run: '2026-11-11', kind: 'keep' },
  ]
  assert.deepEqual(claudeCodeCards(tasks).map(t => t.order), [10032, 10031, 10010, 10030, 474])
  assert.ok(boardText(tasks)[0].includes('from the postmortem: 3, printed first'))
  assert.ok(cardLines(tasks[2]).some(l => l.includes('postmortem: the run of 2026-11-11 · rough')))
  assert.ok(!boardText([tasks[0]])[0].includes('postmortem'))
})

test('the media check: what is in, what is missing, and a misspelt file', () => {
  const files = ['chime-phone.wav', 'blackout.m4a', 'power.wav', 'Chime-News.wav', 'README.md', '.DS_Store']
  assert.equal(found(files, 'blackout', ['m4a', 'mp3', 'wav']), 'blackout.m4a')
  assert.equal(found(files, 'chime-news', ['m4a', 'wav']), null, 'the name is exact, capitals and all')
  assert.deepEqual(strays(files, ['chime-phone', 'blackout', 'chime-news'], ['m4a', 'mp3', 'wav']), ['power.wav', 'Chime-News.wav'])
  const lines = folderLines({ title: 'T', where: '/x', files, endings: ['m4a', 'wav'], groups: [{ title: 'Required', ids: ['chime-phone', 'blackout'], need: 'Needed.' }, { title: 'Chimes', ids: ['chime-news'], need: 'Fine.' }] })
  assert.ok(lines.includes('  Required: 2 of 2 in.'))
  assert.ok(lines.includes('  Chimes: 0 of 1 in. Fine.'))
  assert.ok(lines.some(l => l.includes('Not read by the game') && l.includes('Chime-News.wav')))
  assert.ok(folderLines({ title: 'T', where: '/x', files: null, endings: ['mp4'], groups: [] }).some(l => l.includes('does not exist yet')))
  assert.equal(VIDEO_CLIPS.length, 13)
  assert.equal(BULLETIN2_CLIPS.length, 27)
  assert.ok(mediaDir('MEDIA_DIR=/tmp/sounds\n') === '/tmp/sounds')
  assert.ok(mediaDir('').endsWith('/media'))
  const all = report({ media: { dir: '/m', files: [] }, video: { dir: '/v', files: null }, loops: { dir: '/l', files: ['living.mp4'] }, household: { file: '/s.jpg', there: false }, sizes: { 'living.mp4': 40 * 1024 * 1024 } }).join('\n')
  assert.ok(all.includes('The five loops: 1 of 5 in.'))
  assert.ok(all.includes('Over 30 MB'))
  // the video folder's page names every file the TV looks for
  const page = readFileSync(join(here, '..', '..', 'play', 'public', 'video', 'README.md'), 'utf8')
  for (const id of VIDEO_CLIPS) assert.ok(page.includes(`\`${id}.mp4\``), `${id}.mp4 is on the page`)
})

test('media-import sorts a file by its name: videos, name clips, loops, sounds, the portrait; the rest is left', async () => {
  const { sortOf, pickLongest } = await import('../media-import.mjs')
  assert.deepEqual(sortOf('newsflash-food.mp4'), { kind: 'video', id: 'newsflash-food' })
  assert.deepEqual(sortOf('newsflash-bathroom_1.mp4'), { kind: 'video', id: 'newsflash-bathroom' })
  assert.deepEqual(sortOf('woof-close-field-trans-static.mov'), { kind: 'video', id: 'woof-close-field-trans-static' })
  assert.deepEqual(sortOf('Sirwin_Intro.mov'), { kind: 'video', id: 'sirwin-intro' })
  assert.deepEqual(sortOf('woof-close-name-prof-susan.mp4'), { kind: 'name', id: 'prof-susan' })
  assert.deepEqual(sortOf('boo.mov'), { kind: 'loop', id: 'boo' })
  assert.deepEqual(sortOf('bulletin2-food-1.wav'), { kind: 'sound', id: 'bulletin2-food-1', ext: 'wav' })
  assert.deepEqual(sortOf('blackout.wav'), { kind: 'sound', id: 'blackout', ext: 'wav' })
  assert.deepEqual(sortOf('Irwin portrait.png'), { kind: 'portrait' })
  assert.equal(sortOf('rules-01-cover.wav').kind, 'other')
  assert.equal(sortOf('.DS_Store').kind, 'skip')
  const two = pickLongest([{ kind: 'video', id: 'a', seconds: 1.3, file: 'a.mp4' }, { kind: 'video', id: 'a', seconds: 11, file: 'a_1.mp4' }, { kind: 'name', id: 'a', seconds: 2, file: 'n.mp4' }])
  assert.deepEqual(two.map(e => e.file), ['a_1.mp4', 'n.mp4'])
})
