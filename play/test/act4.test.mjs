import { test } from 'node:test'
import assert from 'node:assert/strict'
import { act4Step, freeForGames, waitingGames, salemColourAt, salemFlipAt, booMoment, ROOMS, lightsStep } from '../src/lib/night.js'
import { promptShown, standaloneBoards, MEMORY_ROUNDS, ALL_TRACES, videoUrl, newsClips, closingClips } from '../src/lib/rooms.js'
import news from '../../seed/woof-news.json' with { type: 'json' }
import { askMotion, unlockSound, keepAwake, PERMISSION_LINES } from '../src/lib/permissions.js'

// The phone's Act 4 rules and the new room screens' rules (handoff 23 Oct 2026).
// Pure: throwaway docs made here, nothing printed.

test('act4Step: only in Act 4 and only with a room; free for a Parlour Game in the Parlour, once paid, or when the rounds are over', () => {
  assert.equal(act4Step({ act4: { room: 'study' } }, 3), null)
  assert.equal(act4Step({}, 4), null)
  assert.deepEqual(act4Step({ act4: { room: 'study', round: 1 } }, 4), { room: 'study', round: 1 })
  assert.equal(freeForGames({ room: 'study' }), false, 'never in a game room')
  assert.equal(freeForGames({ room: 'study', paid: true }), true)
  assert.equal(freeForGames({ room: 'parlour' }), true)
  assert.equal(freeForGames({ room: 'parlour', over: true }), true)
  assert.deepEqual(Object.keys(ROOMS).sort(), ['entryway', 'library', 'orangerie', 'study'])
  assert.equal(lightsStep({ lights: { step: 'go' } }, 4), null, 'the Act 2 step is gone in Act 4')
})

test('waitingGames: the unplayed Act 4 games, oldest first, never a window that pops up for everyone', () => {
  const session = {
    windows: {
      'questions-4-p1': { kind: 'questions', waiting: true, opensAt: 2000, beats: [1, 2, 3] },
      'questions-4-p0': { kind: 'questions', waiting: true, opensAt: 1000, beats: [1, 2, 3] },
      'questions-2-p0': { kind: 'questions', opensAt: 500, beats: [1, 2, 3] },
      'questions-4-p2': { kind: 'questions', waiting: true, opensAt: 3000, beats: [1, 2, 3] },
    },
    answers: { 'questions-4-p2': { picks: ['a', 'a', 'a'] } },
  }
  const g = waitingGames(session)
  assert.deepEqual(g.map(x => x.id), ['questions-4-p0', 'questions-4-p1'])
  assert.ok(g.every(x => x.waiting && x.mine.beats.length === 3))
})

test('Salem\'s colour at a moment: the last flip whose time has come; none unless playing', () => {
  const doc = { state: 'playing', flips: [{ at: 1000, colour: 'green' }, { at: 4000, colour: 'red' }, { at: 7000, colour: 'green' }] }
  assert.equal(salemColourAt(doc, 999), null)
  assert.equal(salemColourAt(doc, 1000), 'green')
  assert.equal(salemColourAt(doc, 5000), 'red')
  assert.equal(salemFlipAt(doc, 5000), 4000)
  assert.equal(salemColourAt({ ...doc, state: 'passed' }, 5000), null)
})

test('Boo\'s show at a moment: intro, strut, pose with a hold count, judge, done', () => {
  const poses = [
    { strutAt: 9000, poseAt: 20000, holdUntil: 25000, judgeUntil: 31000, line: 'Bold. Wrong, but bold.' },
    { strutAt: 31000, poseAt: 40000, holdUntil: 45000, judgeUntil: 51000, line: 'Fine. Fine! You may stay.' },
  ]
  const doc = { state: 'show', startsAt: 1, poses, endsAt: 51000 }
  assert.equal(booMoment(doc, 5000).part, 'intro')
  assert.deepEqual(booMoment(doc, 12000), { part: 'strut', pose: 1 })
  assert.deepEqual(booMoment(doc, 21500), { part: 'pose', pose: 1, hold: 4 })
  assert.equal(booMoment(doc, 26000).line, 'Bold. Wrong, but bold.')
  assert.equal(booMoment(doc, 35000).part, 'strut')
  assert.equal(booMoment(doc, 52000).part, 'done')
  assert.equal(booMoment({ state: 'idle' }, 0).part, 'idle')
})

test('the Parlour TV turns Sir Irwin\'s prompts on the server\'s clock, in the order it was given', () => {
  const prompts = { lines: ['a', 'b', 'c'], order: [2, 0, 1], startedAt: 1000, everyMs: 180_000 }
  assert.equal(promptShown(prompts, 1000), 'c')
  assert.equal(promptShown(prompts, 1000 + 180_000), 'a')
  assert.equal(promptShown(prompts, 1000 + 3 * 180_000), 'c', 'round again')
  assert.equal(promptShown(null, 0), '')
})

test('the standalone memory match: three boards of 7, 10 and 14 pairs, every trace as art, fresh each time', () => {
  assert.equal(ALL_TRACES.length, 14)
  const a = standaloneBoards(1)
  assert.deepEqual(a.map(b => b.length), MEMORY_ROUNDS.map(n => n * 2))
  for (const b of a) for (const t of b) assert.ok(ALL_TRACES.includes(t))
  assert.notDeepEqual(standaloneBoards(2), a)
  assert.match(videoUrl('newsflash-opening'), /video\/newsflash-opening\.mp4$/)
})

test('the permissions: three lines, and a phone that cannot or says no still gets an answer, never a throw', async () => {
  assert.deepEqual(PERMISSION_LINES.map(l => l.key), ['motion', 'sound', 'awake'])
  assert.equal(await askMotion({}), 'none')
  assert.equal(await askMotion({ DeviceMotionEvent: {} }), 'ok')
  assert.equal(await askMotion({ DeviceMotionEvent: { requestPermission: async () => 'granted' } }), 'ok')
  assert.equal(await askMotion({ DeviceMotionEvent: { requestPermission: async () => 'denied' } }), 'denied')
  assert.equal(await askMotion({ DeviceMotionEvent: { requestPermission: async () => { throw new Error('x') } } }), 'denied')
  assert.equal(await unlockSound({}), 'none')
  assert.equal(await keepAwake({ navigator: {} }, null), 'none')
  assert.equal(await keepAwake({ navigator: { wakeLock: { request: async () => ({ released: false }) } } }, null), 'ok')
})

test('the bulletin videos: the TV finds each part by its words in the open bank; a stand-in line has none', () => {
  const fam = Object.values(news.bulletin1.families)[0]
  assert.deepEqual(newsClips([news.bulletin1.opening.text, fam.text, news.bulletin1.signoff.text]), [news.bulletin1.opening.clip, fam.clip, news.bulletin1.signoff.clip])
  assert.deepEqual(newsClips([news.bulletin1.opening.text, '[W-O-O-F News crosses off one family of motives here]', news.bulletin1.signoff.text]), [news.bulletin1.opening.clip, news.bulletin1.signoff.clip])
  const all = ['murderer', 'motive', 'victim'].flatMap(closingClips)
  assert.deepEqual(all, news.closing.parts.map(p => p.clip), 'the three names play every closing part once, in order')
  assert.deepEqual(closingClips('nobody'), [])
})
