import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { FakeFirestore } from './fake-firestore.mjs'
import { createNight, join, NightError } from '../lib/night.js'
import { hostCommand } from '../lib/run.js'
import { reveal, ms } from '../lib/deal.js'
import { finalePath } from '../lib/finale.js'
import { arcadePath, ARCADE_GAMES, OVERALL_TITLE, OVERALL_LINE, MAX_SCORE, recordArcadeScore, arcadeAwards, arcadeAchievements } from '../lib/arcade.js'
import { GAMES } from '../../play/src/lib/arcade.js'
import * as run from '../lib/run.js'

// Miss Boo LaRue's Arcade on the night (30 Oct 2026): the scores saved per
// guest and per game, and the awards with the achievements. G60: one counted
// score a guest a game; the best all round by place; no score or award
// depends on a role. A throwaway night; nothing sealed read or printed.

async function party(n = 6) {
  const db = new FakeFirestore()
  db.store.set('meta/game', { host_jonathan: 'Jon', host_susan: 'Susan' })
  const { nightId } = await createNight(db)
  const names = ['Jon', 'Susan', 'Jessa', 'Jacob', 'Stanley', 'Jeanette', 'Matthew', 'Marie'].slice(0, n)
  const uids = {}
  for (const name of names) { const uid = `u-${name.toLowerCase()}`; await join(db, { uid, nightId, name }); uids[name.toLowerCase()] = uid }
  return { db, nightId, uids, names, keys: names.map(x => x.toLowerCase()) }
}
const night = (db, id) => db.store.get(`nights/${id}`)
async function walkTo(db, nightId, act, beat, t) {
  const next = () => hostCommand(db, { nightId, command: 'next', now: t.now })
  while (night(db, nightId).act < 1) await next()
  while (night(db, nightId).beat !== 'ready') await next()
  await hostCommand(db, { nightId, command: 'blackout', now: t.now, sleep: () => {} })
  let guard = 0
  while (!(night(db, nightId).act === act && night(db, nightId).beat === beat) && guard++ < 60) {
    const n = night(db, nightId)
    if (n.window && !n.window.settled) t.now = Math.max(t.now, ms(n.window.closesAt) + 1)
    await next()
  }
  assert.equal(night(db, nightId).beat, beat)
}

test('G60 the five games are the arcade\'s own, by id and name', () => {
  assert.deepEqual(ARCADE_GAMES.map(g => [g.id, g.name]), GAMES.map(g => [g.id, g.name]))
})

test('G60 a round\'s score is saved once a guest a game: the first counts, a second changes nothing; a bad night, guest, game or score is refused; nothing but the number and the moment is written', async () => {
  const { db, nightId, keys } = await party(3)
  const [a, b] = keys
  const r1 = await recordArcadeScore(db, { nightId, guestKey: a, game: 'mice', score: 23, now: 1000 })
  assert.deepEqual(r1, { ok: true, counted: true })
  const r2 = await recordArcadeScore(db, { nightId, guestKey: a, game: 'mice', score: 99, now: 2000 })
  assert.deepEqual(r2, { ok: true, counted: false, already: true })
  await recordArcadeScore(db, { nightId, guestKey: a, game: 'tail', score: 0, now: 3000 })
  await recordArcadeScore(db, { nightId, guestKey: b, game: 'mice', score: 31, now: 4000 })
  const doc = db.store.get(arcadePath(nightId))
  assert.deepEqual(Object.keys(doc), ['scores'])
  assert.deepEqual(Object.keys(doc.scores).sort(), [a, b].sort())
  assert.deepEqual(doc.scores[a].mice.score, 23, 'the first round counts')
  assert.deepEqual(doc.scores[a].tail.score, 0, 'nought is a score')
  assert.deepEqual(doc.scores[b].mice.score, 31)
  for (const g of Object.values(doc.scores)) for (const s of Object.values(g)) assert.deepEqual(Object.keys(s).sort(), ['at', 'score'])
  assert.ok(!JSON.stringify(doc).includes('role') && !JSON.stringify(doc).includes('murderer'), 'nothing about the case')
  // through the player table, as the callable calls it
  assert.deepEqual(await run.player.arcadeScore(db, { nightId, guestKey: b, game: 'yarn', score: 7 }), { ok: true, counted: true })
  // refused
  await assert.rejects(recordArcadeScore(db, { nightId: 'nope', guestKey: a, game: 'mice', score: 1 }), NightError)
  await assert.rejects(recordArcadeScore(db, { nightId, guestKey: 'nobody', game: 'mice', score: 1 }), /No such guest/)
  await assert.rejects(recordArcadeScore(db, { nightId, guestKey: a, game: 'catwalk', score: 1 }), /Which game/)
  for (const score of [-1, 1.5, 'x', NaN, MAX_SCORE + 1, undefined]) await assert.rejects(recordArcadeScore(db, { nightId, guestKey: a, game: 'knock', score }), /whole number/, String(score))
  for (const guestKey of ['', 'a.b', 'a/b', null]) await assert.rejects(recordArcadeScore(db, { nightId, guestKey, game: 'knock', score: 1 }), /Which guest/)
  assert.equal(Object.keys(db.store.get(arcadePath(nightId)).scores[a]).length, 2, 'nothing refused was written')
})

test('G60 the awards: the top scorer in each game with the score, ties named together; the best all round by place (arcadeOverall\'s default): first place as many points as there are players down to 1, ties sharing the higher points, a game never played scoring nothing; nobody when nobody played', () => {
  const people = [{ key: 'a', name: 'Ann' }, { key: 'b', name: 'Bo' }, { key: 'c', name: 'Cy' }, { key: 'd', name: 'Di' }]
  const s = (score) => ({ score, at: new Date(0) })
  const scores = {
    a: { mice: s(20), tail: s(10), yarn: s(5) },
    b: { mice: s(20), tail: s(4), knock: s(9) },
    c: { mice: s(7), tail: s(12), knock: s(9), pointer: s(30) },
    // d played nothing
  }
  const { games, overall, points } = arcadeAwards(scores, people)
  assert.deepEqual(games.map(g => [g.game, g.name, g.score]), [['tail', 'Cy', 12], ['pointer', 'Cy', 30], ['mice', 'Ann and Bo', 20], ['knock', 'Bo and Cy', 9], ['yarn', 'Ann', 5]], 'in the menu\'s order, only games somebody played')
  assert.equal(games.find(g => g.game === 'mice').title, 'Whack-a-Mouse')
  // by place, four players: mice Ann 4, Bo 4, Cy 2; tail Cy 4, Ann 3, Bo 2; knock Bo 4, Cy 4; pointer Cy 4; yarn Ann 4
  assert.deepEqual(points, { a: 4 + 3 + 4, b: 4 + 2 + 4, c: 2 + 4 + 4 + 4, d: 0 })
  assert.deepEqual(overall, { names: ['Cy'], points: 14, name: 'Cy' })
  // a tie all round names everyone tied
  const tied = arcadeAwards({ a: { mice: s(5) }, b: { tail: s(5) } }, people.slice(0, 2))
  assert.deepEqual(tied.overall, { names: ['Ann', 'Bo'], points: 2, name: 'Ann and Bo' })
  // the lowest place is still 1 point, never nought or less (a tie for last among many)
  const many = arcadeAwards({ a: { mice: s(1) }, b: { mice: s(1) }, c: { mice: s(1) }, d: { mice: s(9) } }, people)
  assert.deepEqual(many.points, { a: 3, b: 3, c: 3, d: 4 })
  // nobody played: no games, no overall, and the reel gets no lines
  assert.deepEqual(arcadeAwards({}, people), { games: [], overall: null, points: { a: 0, b: 0, c: 0, d: 0 } })
  assert.deepEqual(arcadeAchievements(arcadeAwards({}, people)), [])
  // the reel's lines: one a game, then the best all round
  const items = arcadeAchievements({ games, overall })
  assert.deepEqual(items.map(i => [i.title, i.name, i.line]), [
    ['Boo Chasing Her Tail', 'Cy', '12 points'], ['The Lazy Pointer', 'Cy', '30 points'], ['Whack-a-Mouse', 'Ann and Bo', '20 points'],
    ['Knock It Off the Table', 'Bo and Cy', '9 points'], ['Yarn Catch', 'Ann', '5 points'], [OVERALL_TITLE, 'Cy', OVERALL_LINE],
  ])
  assert.equal(arcadeAchievements({ games: [{ game: 'yarn', title: 'Yarn Catch', name: 'Ann', score: 1 }], overall: null })[0].line, '1 point')
  // a guest not on the roster, or a score that is not a number, is left out
  assert.deepEqual(arcadeAwards({ zz: { mice: s(99) }, a: { mice: { score: 'x' } } }, people).games, [])
})

test('G60 no score or award depends on a role: the module never reads a case, a role or a session, and the same scores give the same awards whatever the case', async () => {
  const src = readFileSync(new URL('../lib/arcade.js', import.meta.url), 'utf8').split('\n').map(l => l.replace(/\/\/.*$/, '')).join('\n') // the code, not its comments
  for (const word of ['role', 'murderer', 'ghost', 'detective', 'cases/', 'private/', 'sealed', 'sessions/', 'readArea', 'caseOf', 'ensureCase']) assert.ok(!src.toLowerCase().includes(word.toLowerCase()), `lib/arcade.js never mentions ${word}`)
  // two nights, the same scores, the roster the same: the same awards, whatever each night's case dealt
  const awards = []
  for (const seed of [1, 2]) {
    const { db, nightId, keys } = await party(4)
    const t = { now: 3_600_000 }
    await walkTo(db, nightId, 4, 'groups', t)
    const scores = [[keys[0], 'mice', 20], [keys[1], 'mice', 18], [keys[2], 'tail', 9], [keys[3], 'tail', 9], [keys[0], 'yarn', 3]]
    for (const [guestKey, game, score] of scores) await recordArcadeScore(db, { nightId, guestKey, game, score, now: t.now })
    await hostCommand(db, { nightId, command: 'act', arg: 7, now: t.now })
    await reveal(db, nightId, { now: t.now + seed })
    const f = db.store.get(finalePath(nightId))
    awards.push(f.arcade)
    // in the reel, after the host's achievements (none here), spaced three seconds apart, before the graph
    const mine = f.achievements.filter(a => a.title === OVERALL_TITLE || ARCADE_GAMES.some(g => g.name === a.title))
    assert.equal(mine.length, 4, 'three games played and the best all round')
    assert.deepEqual(mine.map(a => a.title), ['Boo Chasing Her Tail', 'Whack-a-Mouse', 'Yarn Catch', OVERALL_TITLE])
    assert.ok(mine.every((a, i) => a.showAt === f.schedule.awards + i * 3_000))
    assert.ok(f.schedule.awards < f.schedule.graph && f.schedule.graph < f.schedule.names, 'the segment, then the graph, then the names')
    assert.ok(f.schedule.graph - f.schedule.awards >= mine.length * 3_000 + 2_000, 'room for every line')
    assert.ok(!JSON.stringify(f.arcade).match(/role|murderer|ghost/i))
  }
  assert.deepEqual(awards[0], awards[1], 'the same scores, the same awards')
  assert.deepEqual(awards[0].games.map(g => [g.game, g.name, g.score]), [['tail', 'Jessa and Jacob', 9], ['mice', 'Jon', 20], ['yarn', 'Jon', 3]])
  assert.deepEqual(awards[0].overall, { name: 'Jon', points: 8 })
})

test('G60 a night where nobody played the arcade: no arcade lines in the reel, the schedule as before', async () => {
  const { db, nightId } = await party(3)
  const t = { now: 3_600_000 }
  await walkTo(db, nightId, 4, 'groups', t)
  await hostCommand(db, { nightId, command: 'act', arg: 7, now: t.now })
  await reveal(db, nightId, { now: t.now })
  const f = db.store.get(finalePath(nightId))
  assert.deepEqual(f.arcade, { games: [], overall: null })
  assert.deepEqual(f.achievements, [])
  assert.deepEqual(f.schedule, { stats: 0, awards: 50_000, graph: 50_000, names: 80_000 })
})
