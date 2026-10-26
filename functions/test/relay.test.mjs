import { test } from 'node:test'
import assert from 'node:assert/strict'
import { FakeFirestore } from './fake-firestore.mjs'
import { createNight, join } from '../lib/night.js'
import { generateSet, checkGrid, sameGrid, rotateGrid, cellDifference } from '../lib/relay-gen.js'
import { start, advance, vote, guess, reset, turnOrder, relayPaths, atThePaper, TURN_MS, WALK_MS, PULL_MS, VOTE_MS, LOCKOUT_MS, IRWIN_SLIDES, INTRO_MS, SLIDE_BASE_MS, SLIDE_WORD_MS, slideMs } from '../lib/relay.js'
import { PRACTICE, BANK_DOC, checkPicture, namesAny, NEVER_WORDS, TRACE_WORDS, MOTIVE_WORDS, DISQUALIFIED } from '../lib/relay-bank.js'
import { hostCommand } from '../lib/run.js'
import { ms } from '../lib/deal.js'

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

test('turnOrder: a random player every turn, anyone, repeats allowed', () => {
  const keys = ['a', 'b', 'c', 'd', 'e']
  let repeats = 0
  for (let t = 0; t < 50; t++) {
    const order = turnOrder(keys, 33)
    assert.equal(order.length, 33)
    assert.ok(order.every(k => keys.includes(k)))
    for (let i = 1; i < order.length; i++) if (order[i] === order[i - 1]) repeats++
  }
  assert.ok(repeats > 0, 'the same person may be called twice running')
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

test('start → walk → turn → … → guess: a practice smiley first, one cell at a time, and the drawer only ever as their character', async () => {
  const { db, nightId } = await party(4)
  let now = 1_000_000
  await start(db, { nightId, now, seed: 7 })
  const { pub, priv } = relayPaths(nightId)
  const roster = db.store.get(`nights/${nightId}`).roster
  const realNames = Object.values(roster).map(r => r.name)
  let p = db.store.get(pub)
  assert.equal(p.state, 'intro', 'Sir Irwin\'s rules slides come first')
  assert.equal(p.slides.length, 7)
  assert.equal(ms(p.introEndsAt), now + INTRO_MS, 'the slides end when every slide has had its time')
  assert.equal((await advance(db, { nightId, now: now + 1000 })).moved, false)
  assert.equal((await advance(db, { nightId, now: now + INTRO_MS - 1 })).moved, false, 'not a moment early')
  now += INTRO_MS
  assert.equal((await advance(db, { nightId, now })).state, 'walk')
  p = db.store.get(pub)
  assert.equal(p.grid, 1); assert.equal(p.gridCount, 4); assert.equal(p.round, 'Practice'); assert.equal(p.gridSize, 3)
  assert.equal(p.cell, null, 'the drawer walks to the paper before the square is shown')
  assert.ok(p.nextCharacterId && p.nextName && !realNames.includes(p.nextName), 'the character, never a real name')
  const d = db.store.get(priv)
  assert.equal(d.grids.length, 4)
  assert.deepEqual(d.grids[0].cells, PRACTICE.cells, 'the practice smiley')
  assert.equal(d.grids[0].options[d.grids[0].answer].name, 'A smiley face')
  assert.deepEqual(d.grids.slice(1).map(g => g.size), [3, 4, 5])
  assert.equal(d.fromBank, 0, 'a rehearsal never reads the bank: stand-in grids')
  assert.equal((await advance(db, { nightId, now: now + 1000 })).moved, false)
  now += PULL_MS
  assert.equal((await advance(db, { nightId, now })).state, 'turn')
  p = db.store.get(pub)
  assert.equal(p.cell.label.length, 2)
  assert.ok(Array.isArray(p.cell.strokes) && p.cell.strokes.length >= 1)
  assert.ok(p.drawerCharacterId && !realNames.includes(p.drawerName))
  assert.ok(!('grids' in p), 'the grids never reach the public doc')
  now += TURN_MS
  assert.equal((await advance(db, { nightId, now })).moved, true)
  assert.equal((await advance(db, { nightId, now })).moved, false)
  for (let i = 0; i < 8; i++) { now += WALK_MS; await advance(db, { nightId, now }); now += TURN_MS; await advance(db, { nightId, now }) }
  p = db.store.get(pub)
  assert.equal(p.state, 'vote')
  assert.equal(p.gridDone.length, 9)
  assert.deepEqual(p.options.map(o => o.name).sort(), ['A clock', 'A cookie', 'A smiley face', 'A sun'])
  assert.equal(p.voteEndsAt, null, 'the guess waits for the room')
  now += 10 * 60_000
  assert.equal((await advance(db, { nightId, now })).moved, false, 'no clock closes the guess')
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

test('guess: a wrong pick is crossed off with a short lockout, until the room gets it right; then the next round', async () => {
  const { db, nightId } = await party(3)
  const t = { now: 9_000_000 }
  await start(db, { nightId, now: t.now, seed: 13 })
  const { pub, priv } = relayPaths(nightId)
  await runGridToVote(db, nightId, t)
  const answer = db.store.get(priv).grids[0].answer
  const wrong = [0, 1, 2, 3].filter(i => i !== answer)
  assert.equal((await guess(db, { nightId, pick: wrong[0], now: t.now })).right, false)
  let p = db.store.get(pub)
  assert.equal(p.state, 'lockout'); assert.deepEqual(p.crossed, [wrong[0]]); assert.equal(p.lastResult, 'wrong')
  await assert.rejects(guess(db, { nightId, pick: answer, now: t.now }), e => e.code === 'closed', 'not during the lockout')
  t.now += LOCKOUT_MS
  assert.equal((await advance(db, { nightId, now: t.now })).state, 'vote')
  await assert.rejects(guess(db, { nightId, pick: wrong[0], now: t.now }), e => e.code === 'invalid', 'a crossed option cannot be picked')
  assert.equal((await guess(db, { nightId, pick: answer, now: t.now })).right, true)
  p = db.store.get(pub)
  assert.equal(p.state, 'walk'); assert.equal(p.grid, 2); assert.equal(p.round, 'Round 1'); assert.equal(p.lastResult, 'right'); assert.equal(p.options, null)
  assert.deepEqual(db.store.get(priv).misses, [1, 0, 0, 0])
})

test('naming all four (the practice and three rounds) opens the door; the practice is not in the stats', async () => {
  const { db, nightId } = await party(4)
  const t = { now: 20_000_000 }
  await start(db, { nightId, now: t.now, seed: 17 })
  const { pub, priv } = relayPaths(nightId)
  for (let grid = 1; grid <= 4; grid++) {
    await runGridToVote(db, nightId, t)
    const g = db.store.get(priv).grids[grid - 1]
    if (grid === 3) { await guess(db, { nightId, pick: [0, 1, 2, 3].find(i => i !== g.answer), now: t.now }); t.now += LOCKOUT_MS; await advance(db, { nightId, now: t.now }) }
    await guess(db, { nightId, pick: g.answer, now: t.now })
  }
  const p = db.store.get(pub)
  assert.equal(p.state, 'done'); assert.equal(p.doorOpen, true)
  assert.ok(p.stats.totalSeconds > 0)
  assert.deepEqual(p.stats.misses, [0, 1, 0], 'one miss in round 2; the practice never counts')
  assert.equal(db.store.get(`nights/${nightId}/public/sounds`).current.id, 'sting-door')
  assert.equal((await advance(db, { nightId, now: t.now + 60_000 })).moved, false, 'done stays done')
})

test('the party night draws its three rounds from the sealed bank, never a bad picture; a phone cannot vote', async () => {
  const { db, nightId } = await party(3)
  db.store.set(`cases/${nightId}`, { rehearsal: false })
  const square = (n) => Object.fromEntries(Array.from({ length: n }, (_, i) => [`${'ABCDE'[i]}1`, [{ kind: 'line', from: [0, 0], to: [1, 1] }]]))
  db.store.set(BANK_DOC, { pictures: [
    { id: 'p1', round: 1, name: 'Thing one', decoys: ['Other a', 'Other b', 'Other c'], cells: square(3) },
    { id: 'p2', round: 2, name: 'Thing two', decoys: ['Other a', 'Other b', 'Other c'], cells: square(4) },
    { id: 'bad', round: 3, name: 'A house', decoys: ['Other a', 'Other b', 'Other c'], cells: square(5) },
  ] })
  await start(db, { nightId, now: 1_000, seed: 3 })
  const d = db.store.get(relayPaths(nightId).priv)
  assert.equal(d.fromBank, 2, 'rounds 1 and 2 from the bank; round 3 had only a disqualified picture')
  assert.equal(d.grids[1].named, true); assert.equal(d.grids[3].named, false)
  assert.ok(checkPicture({ name: 'A smiley', decoys: ['a', 'b', 'c'], cells: square(3) }, 1).includes('disqualified'))
  assert.ok(checkPicture({ name: 'x', decoys: ['a', 'b', 'c'], cells: { Z9: [{ kind: 'dot', at: [0.5, 0.5] }] } }, 1).length)
  await assert.rejects(vote(db, { nightId, uid: 'u-jon', pick: 0 }), /host/, 'a phone that still asks is told the host taps the guess (25 Oct 2026)')
})

test('F29 At the paper ends the walk now and the square shows at once; refused in every other state, and while the night is paused', async () => {
  // Jon's cue list, cue 17 (25 Oct 2026): the walk is a limit, not a wait. The host's button is the
  // host command at-the-paper: a transaction on the public doc, then the clock is advanced.
  const { db, nightId } = await party(4)
  const { pub, priv } = relayPaths(nightId)
  let now = 30_000_000
  const press = () => hostCommand(db, { nightId, command: 'at-the-paper', now })
  // no drawing at all: refused, and nothing is written
  await assert.rejects(press(), e => e.code === 'invalid')
  assert.equal(db.store.get(pub), undefined)
  await start(db, { nightId, now, seed: 21 })
  // Sir Irwin's slides: nobody is walking yet
  await assert.rejects(press(), e => e.code === 'invalid' && /walking/.test(e.message))
  now += INTRO_MS
  assert.equal((await advance(db, { nightId, now })).state, 'walk')
  const walkEndsAt = ms(db.store.get(pub).walkEndsAt)
  assert.equal(walkEndsAt, now + PULL_MS, 'the first walk of a grid allows the pull-down time')
  // three seconds into the walk the drawer is there: the walk ends now, the square shows now
  now += 3_000
  const r = await press()
  assert.equal(r.atPaper, true)
  assert.equal(r.state, 'turn')
  let p = db.store.get(pub)
  assert.equal(p.state, 'turn')
  assert.ok(p.cell?.label && Array.isArray(p.cell.strokes), 'the square is on the public doc')
  assert.equal(ms(p.turnEndsAt), now + TURN_MS, 'the fifteen seconds run from the press, not from the walk\'s limit')
  assert.equal(p.walkEndsAt, null)
  assert.equal((await advance(db, { nightId, now: now + 1000 })).moved, false, 'the clock is not fooled into moving again')
  // while someone draws: refused, and the turn is untouched
  await assert.rejects(press(), e => e.code === 'invalid')
  assert.equal(ms(db.store.get(pub).turnEndsAt), now + TURN_MS)
  // the next walk, between turns: the limit is twenty seconds, and At the paper ends it too
  now += TURN_MS
  assert.equal((await advance(db, { nightId, now })).state, 'walk')
  assert.equal(ms(db.store.get(pub).walkEndsAt), now + WALK_MS)
  now += 7_000
  assert.equal((await press()).state, 'turn')
  assert.equal(ms(db.store.get(pub).turnEndsAt), now + TURN_MS)
  // a walk nobody ends runs its limit as before
  now += TURN_MS
  await advance(db, { nightId, now })
  assert.equal(db.store.get(pub).state, 'walk')
  now += WALK_MS - 1
  assert.equal((await advance(db, { nightId, now })).moved, false, 'not a moment early')
  now += 1
  assert.equal((await advance(db, { nightId, now })).state, 'turn')
  // paused: the button waits like every other move, and the walk is not shortened
  now += TURN_MS
  await advance(db, { nightId, now })
  assert.equal(db.store.get(pub).state, 'walk')
  const limit = ms(db.store.get(pub).walkEndsAt)
  await hostCommand(db, { nightId, command: 'pause', now })
  await assert.rejects(press(), /paused/)
  assert.equal(ms(db.store.get(pub).walkEndsAt), limit, 'the pause left the walk as it was')
  now += 10_000
  await hostCommand(db, { nightId, command: 'resume', now })
  assert.equal(ms(db.store.get(pub).walkEndsAt), limit + 10_000, 'the resume shifted the walk by the pause')
  assert.equal((await press()).state, 'turn')
  // the guess and the lockout: nobody is walking, so the button is refused in both
  let guard = 0
  while (db.store.get(pub).state !== 'vote' && guard++ < 60) {
    p = db.store.get(pub)
    now += p.state === 'walk' ? WALK_MS : TURN_MS
    await advance(db, { nightId, now })
  }
  assert.equal(db.store.get(pub).state, 'vote')
  await assert.rejects(press(), e => e.code === 'invalid')
  const answer = db.store.get(priv).grids[0].answer
  await guess(db, { nightId, pick: [0, 1, 2, 3].find(i => i !== answer), now })
  assert.equal(db.store.get(pub).state, 'lockout')
  await assert.rejects(press(), e => e.code === 'invalid')
  // the helper on its own writes only the one field
  now += LOCKOUT_MS
  await advance(db, { nightId, now })
  await guess(db, { nightId, pick: answer, now })
  assert.equal(db.store.get(pub).state, 'walk', 'a right guess: the next drawer walks to pull the paper down')
  const before = db.store.get(pub)
  now += 2_000
  assert.deepEqual(await atThePaper(db, { nightId, now }), { ok: true, state: 'walk' })
  const after = db.store.get(pub)
  assert.equal(ms(after.walkEndsAt), now)
  assert.deepEqual({ ...after, walkEndsAt: null }, { ...before, walkEndsAt: null }, 'nothing else on the doc changed')
})

test('the picture bank refuses the samples, a star, every trace and every motive-card object, in the name or any of the three wrong names', () => {
  const square = (n) => Object.fromEntries(Array.from({ length: n }, (_, i) => [`${'ABCDE'[i]}1`, [{ kind: 'line', from: [0, 0], to: [1, 1] }]]))
  const pic = (name, decoys = ['A kite', 'A tree', 'A fish']) => ({ name, decoys, cells: square(3) })
  assert.deepEqual(checkPicture(pic('A kite', ['A tree', 'A fish', 'A cloud']), 1), [], 'a plain picture passes')
  for (const w of ['star', 'smiley', 'house', 'diamond']) assert.ok(checkPicture(pic(`A ${w}`), 1).includes('disqualified'), w)
  assert.ok(checkPicture(pic('A kite', ['A tree', 'A starfish', 'A cloud']), 1).includes('disqualified'), 'a sample among the wrong names counts too')
  for (const w of NEVER_WORDS) {
    assert.ok(checkPicture(pic(`A ${w}`), 1).includes('never'), `${w} as the name`)
    assert.ok(checkPicture(pic('A kite', ['A tree', `Two ${w}s`, 'A cloud']), 1).includes('never'), `${w} as a wrong name, plural`)
  }
  // the words the audit named (handoff §3 and the drawn traces) are all on it
  for (const w of ['boot', 'spectacles', 'candle', 'cup', 'picture', 'vial', 'sand', 'iodine', 'elbow patch']) assert.ok(TRACE_WORDS.includes(w), w)
  for (const w of ['pizza', 'toilet roll', 'phone', 'charger', 'door', 'shopping cart', 'crown', 'car']) assert.ok(MOTIVE_WORDS.includes(w), w)
  assert.ok(DISQUALIFIED.includes('star'))
  // inside a longer word: four letters and up anywhere, three letters at the end
  for (const n of ['Sunglasses', 'A doorknob', 'A teacup', 'A racecar', 'A bookcase']) assert.ok(namesAny(n, NEVER_WORDS), n)
  for (const n of ['A kite', 'A cloud', 'A cartwheel', 'An apple', 'A tree']) assert.equal(namesAny(n, NEVER_WORDS), false, n)
  // reasons name no picture
  for (const r of checkPicture(pic('A boot'), 1)) assert.ok(!/boot/i.test(r))
})

test('start needs at least two people', async () => {
  const { db, nightId } = await party(1)
  await assert.rejects(start(db, { nightId }), e => e.code === 'invalid')
})

test('Sir Irwin\'s slides: each stays up five seconds plus 0.4 a word, in the order of the How to Play doc; slide 3 carries the practice smiley\'s B1 square', () => {
  assert.deepEqual(IRWIN_SLIDES.map(s => s.title), ['Sir Irwin Needs a Hand', 'The idea', 'A turn', 'The shouting', 'Guessing', 'The rounds', 'The clue'])
  for (const s of IRWIN_SLIDES) {
    const words = s.text.trim().split(/\s+/).length
    assert.equal(s.ms, SLIDE_BASE_MS + SLIDE_WORD_MS * words, s.title)
    assert.equal(s.ms, slideMs(s.text))
  }
  assert.equal(INTRO_MS, IRWIN_SLIDES.reduce((a, s) => a + s.ms, 0))
  const idea = IRWIN_SLIDES.find(s => s.title === 'The idea')
  assert.ok(idea.ms >= 21_000 && idea.ms <= 23_000, 'the longest slide gets about 22 seconds')
  assert.ok(INTRO_MS >= 100_000 && INTRO_MS <= 115_000, 'all seven take about 1.8 minutes')
  // slide 3 ("like this arc in B1") draws the public practice square; no other slide carries a square
  assert.deepEqual(IRWIN_SLIDES[2].cell, { label: 'B1', strokes: PRACTICE.cells.B1 })
  assert.ok(IRWIN_SLIDES[2].text.includes('B1'))
  assert.equal(IRWIN_SLIDES.filter(s => s.cell).length, 1)
})
