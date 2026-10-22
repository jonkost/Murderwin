import { test } from 'node:test'
import assert from 'node:assert/strict'
import { FakeFirestore } from './fake-firestore.mjs'
import { createNight, join } from '../lib/night.js'
import { hostCommand, advanceRelay } from '../lib/run.js'
import { generateSet, CELL_CAPS, MAX_CELLS } from '../lib/relay-gen.js'
import {
  start, advance, vote, reset, relayPaths, presentKeys,
  TURN_MS, WALK_MS, PULL_MS, VOTE_MS, LOCKOUT_MS, MAX_TURNS, DRAW_BUDGET_MS, PRESENT_MS, TIMING,
} from '../lib/relay.js'
import { ms } from '../lib/deal.js'

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
  for (let grid = 1; grid <= 3; grid++) {
    await runGridToVote(db, nightId, t)
    const answer = db.store.get(priv).grids[grid - 1].answer
    for (const uid of Object.values(uids)) await vote(db, { nightId, uid, pick: answer })
    t.now += 1000
    await nudge({ nightId, now: t.now, pickInt: () => 0 })
  }
  assert.equal(db.store.get(pub).state, 'done')
}

test('the time budget: every grid stays under its cap and the three together fit twelve minutes of turns', () => {
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
  assert.deepEqual(Object.keys(db.store.get(pub).timing).sort(), ['lockoutMs', 'pullMs', 'turnMs', 'voteMs', 'walkMs'])
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
  await hostCommand(db, { nightId, command: 'act', arg: 6, now: t.now }) // Act 6 opens on the drawing
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

test('a vote closes when every phone heard from lately has picked: two of nine absent never hold the room', async () => {
  const { db, nightId, uids, names, keys } = await party(9)
  const t = { now: 3_000_000 }
  // seven phones have been heard from in the last two minutes; two have been quiet for an hour
  const quiet = new Set(keys.slice(-2))
  for (const k of keys) present(db, nightId, `p-${k}`, k, quiet.has(k) ? t.now - 60 * 60_000 : t.now - 30_000)
  assert.deepEqual((await presentKeys(db, nightId, keys, t.now)).sort(), keys.filter(k => !quiet.has(k)).sort())
  await start(db, { nightId, now: t.now, seed: 21 })
  const { pub, priv } = relayPaths(nightId)
  assert.equal(db.store.get(pub).votesNeeded, 7)
  // the seven keep their minute-by-minute heartbeat going through the grid; the two stay silent
  const beat = (now) => { for (const k of keys) if (!quiet.has(k)) present(db, nightId, `p-${k}`, k, now - 30_000) }
  await runGridToVote(db, nightId, t, beat)
  assert.equal(db.store.get(pub).votesNeeded, 7)
  const answer = db.store.get(priv).grids[0].answer
  const uidOf = (k) => db.store.get(`nights/${nightId}/private/deck`).uids[k]
  const here = keys.filter(k => !quiet.has(k))
  for (const k of here.slice(0, 6)) await vote(db, { nightId, uid: uidOf(k), pick: answer })
  assert.equal((await advance(db, { nightId, now: t.now + 1000 })).moved, false, 'six of seven: the window stays open')
  await vote(db, { nightId, uid: uidOf(here[6]), pick: answer })
  assert.equal(db.store.get(pub).votesIn, 7)
  const r = await advance(db, { nightId, now: t.now + 2000, pickInt: () => 0 })
  assert.equal(r.moved, true, 'the seventh pick closes the vote well inside the window')
  assert.equal(db.store.get(pub).grid, 2)
  // with nobody heard from at all, every phone counts and the window runs its course
  for (const k of keys) present(db, nightId, `p-${k}`, k, t.now - 2 * 60 * 60_000)
  await runGridToVote(db, nightId, t)
  assert.equal(db.store.get(pub).votesNeeded, 9)
  assert.equal((await advance(db, { nightId, now: t.now + 1000 })).moved, false)
  t.now += VOTE_MS
  assert.equal((await advance(db, { nightId, now: t.now, pickInt: () => 0 })).moved, true, 'the window runs out and the room moves on')
  assert.equal(PRESENT_MS, 120_000)
  assert.equal(names.length, 9)
})

test('reset on an idle night is harmless and leaves the hall red', async () => {
  const { db, nightId } = await party(2)
  await reset(db, { nightId, now: 5 })
  assert.equal(db.store.get(relayPaths(nightId).pub).state, 'idle')
  assert.equal(db.store.get(`nights/${nightId}/public/cues`).hall, 'red')
  assert.equal(LOCKOUT_MS, TIMING.lockoutMs)
  assert.equal(VOTE_MS, TIMING.voteMs)
})
