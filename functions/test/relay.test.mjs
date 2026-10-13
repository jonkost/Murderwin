import { test } from 'node:test'
import assert from 'node:assert/strict'
import { FakeFirestore } from './fake-firestore.mjs'
import { createNight, join } from '../lib/night.js'
import { generateSet, checkGrid, sameGrid, rotateGrid, cellDifference } from '../lib/relay-gen.js'
import { start, advance, vote, reset, turnOrder, relayPaths, TURN_MS, WALK_MS, PULL_MS, VOTE_MS, LOCKOUT_MS } from '../lib/relay.js'

// ---- the generator ------------------------------------------------------

test('generateSet: three grids, every stroke describable, options sound, across many seeds', () => {
  for (let s = 1; s <= 120; s++) {
    const set = generateSet(s * 104729)
    assert.equal(set.grids.length, 3)
    assert.deepEqual(set.grids.map(g => g.size), [3, 4, 5])
    for (const g of set.grids) {
      assert.deepEqual(checkGrid({ size: g.size, cells: g.cells }), [], `seed ${s} grid ${g.number}`)
      assert.equal(g.options.length, 4)
      assert.ok(g.answer >= 0 && g.answer < 4)
      assert.ok(sameGrid({ size: g.size, cells: g.options[g.answer] }, { size: g.size, cells: g.cells }), 'the answer is the real grid')
      const reals = g.options.filter(o => sameGrid({ size: g.size, cells: o }, { size: g.size, cells: g.cells }))
      assert.equal(reals.length, 1, 'no decoy equals the real grid')
      for (const o of g.options) assert.deepEqual(checkGrid({ size: g.size, cells: o }), [], 'decoys are describable too')
      // the shuffled turn order is exactly the drawn cells
      const drawn = Object.keys(g.cells).filter(k => g.cells[k].length)
      assert.deepEqual([...g.order].sort(), drawn.sort())
    }
    assert.equal(set.grids[0].order.length, 9, 'grid 1: every cell drawn')
    const dots2 = Object.values(set.grids[1].cells).flat().filter(x => x.kind === 'dot').length
    assert.ok(dots2 >= 2, 'grid 2 carries dots as noise')
    const g3 = set.grids[2]
    assert.ok(g3.order.length >= 12 && g3.order.length <= 15, `grid 3 drawn cells ${g3.order.length}`)
    assert.ok(!sameGrid({ size: 5, cells: g3.cells }, rotateGrid({ size: 5, cells: g3.cells })), 'grid 3 changes under a quarter turn')
    const rotatedOption = g3.options.some(o => sameGrid({ size: 5, cells: o }, rotateGrid({ size: 5, cells: g3.cells })))
    assert.ok(rotatedOption, 'grid 3 offers the rotated copy as a decoy')
    const nudged = g3.options.some((o, i) => i !== g3.answer && cellDifference({ size: 5, cells: o }, { size: 5, cells: g3.cells }) === 1)
    assert.ok(nudged, 'grid 3 offers a one-stroke-moved decoy')
  }
})

test('generateSet is deterministic for a seed and different across seeds', () => {
  const a = generateSet(42), b = generateSet(42), c = generateSet(43)
  assert.deepEqual(a, b)
  assert.notDeepEqual(a.grids[0].cells, c.grids[0].cells)
})

// ---- the turn order -----------------------------------------------------

test('turnOrder: everyone draws before anyone repeats, nobody twice running', () => {
  const keys = ['a', 'b', 'c', 'd', 'e']
  for (let t = 0; t < 50; t++) {
    const order = turnOrder(keys, 33)
    assert.equal(order.length, 33)
    assert.deepEqual([...new Set(order.slice(0, 5))].sort(), keys)
    for (let i = 1; i < order.length; i++) assert.notEqual(order[i], order[i - 1])
  }
})

// ---- the state machine ----------------------------------------------------

async function party(n = 4) {
  const db = new FakeFirestore()
  db.store.set('meta/game', { host_jonathan: 'Jon', host_susan: 'Susan' })
  const { nightId } = await createNight(db)
  const names = ['Jon', 'Susan', 'Jessa', 'Jacob', 'Stanley', 'Jeanette', 'Matthew', 'Marie', 'René'].slice(0, n)
  const uids = {}
  for (const name of names) {
    const uid = `u-${name.toLowerCase()}`
    await join(db, { uid, nightId, name })
    uids[name] = uid
  }
  return { db, nightId, uids, names }
}

const fixedPick = (n) => 0 // deterministic "random" for tie-breaks and absent picks

test('start → walk → turn → … → vote: the public doc only ever carries one cell', async () => {
  const { db, nightId } = await party(4)
  let now = 1_000_000
  await start(db, { nightId, now, seed: 7 })
  const { pub, priv } = relayPaths(nightId)
  let p = db.store.get(pub)
  assert.equal(p.state, 'walk')
  assert.equal(p.grid, 1)
  assert.equal(p.cell, null)
  assert.ok(p.nextName)
  assert.equal(p.turnsTotal, db.store.get(priv).order.length)
  // too early: nothing moves
  assert.equal((await advance(db, { nightId, now: now + 1000 })).moved, false)
  now += PULL_MS
  assert.equal((await advance(db, { nightId, now })).state, 'turn')
  p = db.store.get(pub)
  assert.equal(p.cell.label.length, 2)
  assert.ok(Array.isArray(p.cell.strokes) && p.cell.strokes.length >= 1)
  assert.ok(p.drawerName)
  assert.ok(!('grids' in p), 'the grids never reach the public doc')
  // the same deadline, called twice: one move
  now += TURN_MS
  assert.equal((await advance(db, { nightId, now })).moved, true)
  assert.equal((await advance(db, { nightId, now })).moved, false)
  p = db.store.get(pub)
  assert.equal(p.state, 'walk')
  assert.equal(p.gridDone.length, 1)
  // run grid 1 to its vote
  for (let i = 0; i < 8; i++) {
    now += WALK_MS; await advance(db, { nightId, now })
    now += TURN_MS; await advance(db, { nightId, now })
  }
  p = db.store.get(pub)
  assert.equal(p.state, 'vote')
  assert.equal(p.gridDone.length, 9)
  assert.equal(p.options.length, 4)
  assert.equal(p.votesIn, 0)
  assert.equal(p.votesNeeded, 4)
})

async function runGridToVote(db, nightId, nowRef) {
  const { pub } = relayPaths(nightId)
  let guard = 0
  while (db.store.get(pub).state !== 'vote' && guard++ < 200) {
    const p = db.store.get(pub)
    nowRef.now += p.state === 'walk' ? Math.max(WALK_MS, PULL_MS) : TURN_MS
    await advance(db, { nightId, now: nowRef.now })
  }
  assert.equal(db.store.get(pub).state, 'vote')
}

test('vote: the right pick moves to the next grid; everyone in closes the window early', async () => {
  const { db, nightId, uids, names } = await party(3)
  const t = { now: 5_000_000 }
  await start(db, { nightId, now: t.now, seed: 11 })
  const { pub, priv } = relayPaths(nightId)
  await runGridToVote(db, nightId, t)
  const answer = db.store.get(priv).grids[0].answer
  for (const name of names) await vote(db, { nightId, uid: uids[name], pick: answer })
  assert.equal(db.store.get(pub).votesIn, 3)
  // window not yet over, but everyone is in
  const r = await advance(db, { nightId, now: t.now + 1000, pickInt: fixedPick })
  assert.equal(r.state, 'walk')
  const p = db.store.get(pub)
  assert.equal(p.grid, 2)
  assert.equal(p.gridSize, 4)
  assert.equal(p.lastResult, 'right')
  assert.equal(p.options, null)
  assert.deepEqual(db.store.get(priv).misses, [0, 0, 0])
})

test('vote: a wrong pick crosses it out, locks out ten seconds, and asks again until right', async () => {
  const { db, nightId, uids, names } = await party(3)
  const t = { now: 9_000_000 }
  await start(db, { nightId, now: t.now, seed: 13 })
  const { pub, priv } = relayPaths(nightId)
  await runGridToVote(db, nightId, t)
  const answer = db.store.get(priv).grids[0].answer
  const wrong = [0, 1, 2, 3].filter(i => i !== answer)
  // first wrong pick
  for (const name of names) await vote(db, { nightId, uid: uids[name], pick: wrong[0] })
  assert.equal((await advance(db, { nightId, now: t.now })).state, 'lockout')
  let p = db.store.get(pub)
  assert.deepEqual(p.crossed, [wrong[0]])
  assert.equal(p.lastResult, 'wrong')
  await assert.rejects(vote(db, { nightId, uid: uids[names[0]], pick: answer }), e => e.code === 'closed')
  t.now += LOCKOUT_MS
  assert.equal((await advance(db, { nightId, now: t.now })).state, 'vote')
  await assert.rejects(vote(db, { nightId, uid: uids[names[0]], pick: wrong[0] }), e => e.code === 'invalid', 'a crossed option cannot be picked')
  // second and third wrong picks
  for (const name of names) await vote(db, { nightId, uid: uids[name], pick: wrong[1] })
  await advance(db, { nightId, now: t.now })
  t.now += LOCKOUT_MS; await advance(db, { nightId, now: t.now })
  for (const name of names) await vote(db, { nightId, uid: uids[name], pick: wrong[2] })
  await advance(db, { nightId, now: t.now })
  t.now += LOCKOUT_MS; await advance(db, { nightId, now: t.now })
  p = db.store.get(pub)
  assert.equal(p.state, 'vote')
  assert.deepEqual([...p.crossed].sort(), [...wrong].sort(), 'three crossed, one standing')
  // nobody votes: the window closes and the only standing option wins
  t.now += VOTE_MS
  assert.equal((await advance(db, { nightId, now: t.now, pickInt: fixedPick })).state, 'walk')
  assert.equal(db.store.get(pub).grid, 2)
  assert.deepEqual(db.store.get(priv).misses, [3, 0, 0])
})

test('absent phones get a random pick; a tie goes to one of the tied; the door opens after grid 3', async () => {
  const { db, nightId, uids, names } = await party(4)
  const t = { now: 20_000_000 }
  await start(db, { nightId, now: t.now, seed: 17 })
  const { pub, priv } = relayPaths(nightId)
  for (let grid = 1; grid <= 3; grid++) {
    await runGridToVote(db, nightId, t)
    const answer = db.store.get(priv).grids[grid - 1].answer
    // two vote right, two stay silent → absent picks come from pickInt over the standing list
    await vote(db, { nightId, uid: uids[names[0]], pick: answer })
    await vote(db, { nightId, uid: uids[names[1]], pick: answer })
    t.now += VOTE_MS
    // absent picks land on index `answer` of the standing list → may tie or not; force the tie-break to the answer
    const pickInt = (n) => Math.min(answer, n - 1)
    await advance(db, { nightId, now: t.now, pickInt })
    const p = db.store.get(pub)
    if (grid < 3) assert.equal(p.grid, grid + 1, `grid ${grid} solved`)
  }
  const p = db.store.get(pub)
  assert.equal(p.state, 'done')
  assert.equal(p.doorOpen, true)
  assert.ok(p.stats.totalSeconds > 0)
  assert.deepEqual(p.stats.misses, [0, 0, 0])
  assert.equal((await advance(db, { nightId, now: t.now + 60_000 })).moved, false, 'done stays done')
})

test('vote: only a phone at this party may pick; reset clears everything', async () => {
  const { db, nightId } = await party(2)
  const t = { now: 30_000_000 }
  await start(db, { nightId, now: t.now, seed: 19 })
  await runGridToVote(db, nightId, t)
  await assert.rejects(vote(db, { nightId, uid: 'u-stranger', pick: 0 }), e => e.code === 'no-guest')
  await reset(db, { nightId })
  assert.equal(db.store.get(relayPaths(nightId).pub).state, 'idle')
  assert.equal((await advance(db, { nightId, now: t.now + 1 })).moved, false)
})

test('start needs at least two people', async () => {
  const { db, nightId } = await party(1)
  await assert.rejects(start(db, { nightId }), e => e.code === 'invalid')
})
