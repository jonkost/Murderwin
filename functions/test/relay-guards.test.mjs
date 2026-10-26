import { test } from 'node:test'
import assert from 'node:assert/strict'
import { FakeFirestore } from './fake-firestore.mjs'
import { createNight, join } from '../lib/night.js'
import { hostCommand, advanceRelay } from '../lib/run.js'
import { generateSet, CELL_CAPS, MAX_CELLS } from '../lib/relay-gen.js'
import {
  start, advance, vote, guess, reset, relayPaths, presentKeys,
  TURN_MS, WALK_MS, PULL_MS, VOTE_MS, LOCKOUT_MS, MAX_TURNS, DRAW_BUDGET_MS, PRESENT_MS, TIMING,
} from '../lib/relay.js'
import { ms, NIGHT } from '../lib/deal.js'

// The Act 6 door cannot misfire: a second Start keeps the drawing, Clear
// re-opens the door for a second run, the grids fit the time budget, and a
// vote never waits on a phone nobody has heard from. Throwaway nights only.

async function party(n = 4) {
  const db = new FakeFirestore()
  db.store.set('meta/game', { host_jonathan: 'Jon', host_susan: 'Susan' })
  const { nightId } = await createNight(db)
  const names = ['Jon', 'Susan', 'Jessa', 'Jacob', 'Stanley', 'Jeanette', 'Matthew', 'Marie', 'Rene'].slice(0, n)
  const uids = {}
  for (const name of names) { const uid = `u-${name.toLowerCase()}`; await join(db, { uid, nightId, name }); uids[name.toLowerCase()] = uid }
  const keys = Object.keys(db.store.get(`nights/${nightId}`).roster)
  return { db, nightId, uids, names, keys }
}
const night = (db, id) => db.store.get(`nights/${id}`)
const present = (db, nightId, uid, guestKey, at) => db.store.set(`presence/${uid}`, { nightId, guestKey, at: new Date(at) })

async function runGridToVote(db, nightId, t, beforeEach = () => {}) {
  const { pub } = relayPaths(nightId)
  let guard = 0
  while (db.store.get(pub).state !== 'vote' && guard++ < 200) {
    const p = db.store.get(pub)
    t.now += p.state === 'walk' ? Math.max(WALK_MS, PULL_MS) : TURN_MS
    beforeEach(t.now)
    await advance(db, { nightId, now: t.now })
  }
  assert.equal(db.store.get(pub).state, 'vote')
}
// Everyone votes right on every grid: the drawing is done.
async function solveAll(db, nightId, uids, t, nudge = (args) => advance(db, args)) {
  const { priv, pub } = relayPaths(nightId)
  for (let grid = 1; grid <= db.store.get(priv).grids.length; grid++) {
    await runGridToVote(db, nightId, t)
    const answer = db.store.get(priv).grids[grid - 1].answer
    t.now += 1000
    await guess(db, { nightId, pick: answer, now: t.now })
    await nudge({ nightId, now: t.now })
  }
  assert.equal(db.store.get(pub).state, 'done')
}

test('F29 the time budget: fifteen seconds a turn, the walk a limit of twenty, every grid under its cap and the set within twenty-six minutes', () => {
  // Jon's cue list, 25 Oct 2026: fifteen seconds a turn (was ten); the walk becomes a limit the host
  // ends early with At the paper (was a fixed twelve seconds); the budget follows, and MAX_TURNS must
  // still hold the biggest set the caps allow (9 + 9 + 11 + 13 = 42 with the practice)
  assert.equal(TURN_MS, 15_000)
  assert.equal(WALK_MS, 20_000)
  assert.equal(PULL_MS, 20_000)
  assert.equal(DRAW_BUDGET_MS, 26 * 60_000)
  assert.equal(MAX_TURNS, 44)
  assert.ok(MAX_TURNS >= 42, 'the practice and the three rounds at their caps fit the budget')
  assert.deepEqual(TIMING, { turnMs: TURN_MS, walkMs: WALK_MS, pullMs: PULL_MS, voteMs: VOTE_MS, lockoutMs: LOCKOUT_MS, introMs: TIMING.introMs })
  assert.deepEqual(CELL_CAPS, [9, 11, 12])
  assert.equal(MAX_CELLS, 32)
  assert.equal(MAX_TURNS, Math.floor(DRAW_BUDGET_MS / (TURN_MS + WALK_MS)))
  assert.ok(MAX_CELLS <= MAX_TURNS, 'the caps add up to no more than the budget allows')
  for (let s = 1; s <= 400; s++) {
    const set = generateSet(s * 7919 + 3)
    set.grids.forEach((g, i) => assert.ok(g.order.length <= CELL_CAPS[i], `seed ${s} grid ${i + 1}: ${g.order.length} cells`))
    const turns = set.grids.reduce((n, g) => n + g.order.length, 0)
    assert.ok(turns <= MAX_TURNS, `seed ${s}: ${turns} turns`)
    assert.ok(turns * (TURN_MS + WALK_MS) <= DRAW_BUDGET_MS)
  }
})

test('start twice keeps the drawing: turnIndex and seed stand; force restarts it; timing is on the doc', async () => {
  const { db, nightId } = await party(4)
  const t = { now: 1_000_000 }
  const first = await start(db, { nightId, now: t.now, seed: 5 })
  assert.equal(first.already, undefined)
  const { pub, priv } = relayPaths(nightId)
  assert.deepEqual(db.store.get(pub).timing, TIMING)
  assert.deepEqual(Object.keys(db.store.get(pub).timing).sort(), ['introMs', 'lockoutMs', 'pullMs', 'turnMs', 'voteMs', 'walkMs'])
  assert.equal(db.store.get(pub).state, 'intro', 'Sir Irwin\'s slides first')
  t.now = ms(db.store.get(pub).introEndsAt); await advance(db, { nightId, now: t.now })
  t.now += PULL_MS; await advance(db, { nightId, now: t.now })
  t.now += TURN_MS; await advance(db, { nightId, now: t.now })
  t.now += WALK_MS; await advance(db, { nightId, now: t.now })
  assert.equal(db.store.get(pub).turnIndex, 1)
  const again = await start(db, { nightId, now: t.now, seed: 6 })
  assert.equal(again.already, true)
  assert.equal(db.store.get(pub).turnIndex, 1, 'a second Start does not reset the turn')
  assert.equal(db.store.get(priv).seed, 5)
  const forced = await start(db, { nightId, now: t.now, seed: 6, force: true })
  assert.equal(forced.already, undefined)
  assert.equal(db.store.get(pub).turnIndex, 0)
  assert.equal(db.store.get(priv).seed, 6)
})

test('reset re-opens the door: after a full run, Clear, then a second full run reveals a new trace and the hall goes green again', async () => {
  const { db, nightId, uids } = await party(3)
  const t = { now: 2_000_000 }
  await hostCommand(db, { nightId, command: 'act', arg: 6, now: t.now }) // Act 6 opens on two Parlour Games
  t.now += NIGHT.windows.questions.ms + 1
  await hostCommand(db, { nightId, command: 'next', now: t.now }) // then the drawing
  assert.equal(night(db, nightId).beat, 'drawing')
  const cues = `nights/${nightId}/public/cues`, trace = `nights/${nightId}/public/trace`
  assert.equal(db.store.get(cues).hall, 'red')
  await solveAll(db, nightId, uids, t, (args) => advanceRelay(db, args))
  assert.ok(db.store.get(trace), 'the trace is behind the door')
  const firstAt = ms(db.store.get(trace).at)
  assert.equal(db.store.get(cues).hall, 'green')
  // the beat's own Start keeps a finished drawing too
  assert.equal((await hostCommand(db, { nightId, command: 'beat', arg: 'drawing', now: t.now })).already, true)
  assert.equal(db.store.get(relayPaths(nightId).pub).state, 'done')
  // Clear: the door shuts, the hall is red, the trace is gone
  await hostCommand(db, { nightId, command: 'relay-reset', now: t.now })
  assert.equal(db.store.get(trace), undefined)
  assert.equal(db.store.get(`nights/${nightId}/private/trace`), undefined)
  assert.equal(db.store.get(cues).hall, 'red')
  assert.equal(db.store.get(relayPaths(nightId).pub).doorOpen, false)
  // a second run opens it again
  t.now += 60_000
  const r = await hostCommand(db, { nightId, command: 'relay-start', now: t.now })
  assert.equal(r.already, undefined)
  await solveAll(db, nightId, uids, t, (args) => advanceRelay(db, args))
  assert.ok(db.store.get(trace), 'a new trace')
  assert.ok(ms(db.store.get(trace).at) > firstAt)
  assert.equal(db.store.get(cues).hall, 'green')
})

test('reset on an idle night is harmless and leaves the hall red', async () => {
  const { db, nightId } = await party(2)
  await reset(db, { nightId, now: 5 })
  assert.equal(db.store.get(relayPaths(nightId).pub).state, 'idle')
  assert.equal(db.store.get(`nights/${nightId}/public/cues`).hall, 'red')
  assert.equal(LOCKOUT_MS, TIMING.lockoutMs)
  assert.equal(VOTE_MS, TIMING.voteMs)
})
