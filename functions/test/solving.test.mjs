import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { FakeFirestore } from './fake-firestore.mjs'
import { walkLights } from './lights-walk.mjs'
import { createNight, join, MOTIVES, CHARACTERS } from '../lib/night.js'
import { hostCommand, player } from '../lib/run.js'
import { NIGHT, beatsOf, lightsPath, LIGHTS_CATS, CAT_ROOMS, GO_MS, LATER_MS, ms, revealTrace } from '../lib/deal.js'
import { memoryBoards, memoryPath, MEMORY_ROUNDS, ALL_TRACES } from '../lib/act4.js'
import { studyReveal, studyClueCard, makeGroups } from '../lib/station.js'
import { rehearsalCase } from '../lib/case.js'
import { irwinMotiveClue, irwinLines, DEFAULT_IRWIN } from '../lib/screen.js'
import { FAMILIES, ALL_MOTIVES, familyOf, familyMates, solvingPlan, memoryPick, irwinOptions, irwinCount, remainingMotives, roomClues, hintsOf, familyForCat } from '../lib/families.js'
import { traceOf } from '../lib/traces.js'
import { hintLine as catHintLine, HINT_CATS, motiveName, CAT_LINES, fillSlot } from '../lib/cats.js'

// How the case gets solved (docs/solving-the-case.md): checks G32 to G38,
// F20 and F21. Every case here is a throwaway rehearsal case, made and
// dropped inside the test. A failure names the check and a seed or a count,
// never a word of a clue.

// A small seeded generator, so a failing seed can be replayed: rng(n) is in [0, n).
function seeded(seed) {
  let x = (seed * 2654435761) >>> 0 || 1
  return n => { x ^= x << 13; x >>>= 0; x ^= x >>> 17; x ^= x << 5; x >>>= 0; return x % n }
}
const NAMES = ['Jon', 'Susan', 'Jessa', 'Jacob', 'Stanley', 'Jeanette', 'Matthew', 'Marie', 'Rene', 'Guest', 'Pat', 'Lou']
const PLAYABLE = CHARACTERS.filter(ch => !ch.host)

// A roster of n guests with distinct characters, the two Professors first (the hosts).
function rosterOf(n, rng) {
  const profs = CHARACTERS.filter(ch => ch.host)
  const rest = [...PLAYABLE]
  for (let i = rest.length - 1; i > 0; i--) { const j = rng(i + 1); [rest[i], rest[j]] = [rest[j], rest[i]] }
  const chars = [...profs, ...rest].slice(0, n)
  return chars.map((ch, i) => ({ key: NAMES[i].toLowerCase(), name: NAMES[i], characterId: ch.id }))
}

// One case, played through on paper: the plan, the bulletin, every group's
// memory match, then Sir Irwin at the band given. Returns what the room is left with.
function playCase(seed, { players = 9, band = 3 } = {}) {
  const rng = seeded(seed)
  const roster = rosterOf(players, rng)
  const c = rehearsalCase({ nightId: `g-${seed}`, roster, rng })
  const dial = (band - 3) * 4
  c.dial = dial
  const groups = makeGroups(roster.map(g => g.key), { apart: [c.murderer, c.ghost], pickInt: rng })
  groups.forEach((members, i) => {
    const groupId = `g${i + 1}`
    c.solving.memory[groupId] = memoryPick(c, { groupId, members, seed: c.screenSalt })
    c.solving.boo[groupId] = memoryPick(c, { groupId, members, seed: c.screenSalt, tag: 'boo' })
  })
  const irwin = irwinOptions(c, { band, seed: c.screenSalt })
  return { c, roster, groups, irwin, left: remainingMotives(roomClues(c, { irwin, bulletinBand: band })) }
}

// ---- G32 ------------------------------------------------------------------

test('G32 at dial 3, a solver given every clue up to the end of Act 5 finds exactly one motive (1,000 cases, 4 to 12 players)', () => {
  const bad = []
  for (let seed = 1; seed <= 1000; seed++) {
    const { c, left } = playCase(seed, { players: 4 + (seed % 9), band: 3 })
    if (left.length !== 1 || left[0] !== c.motive) bad.push(`seed ${seed}: ${left.length} left`)
  }
  assert.deepEqual(bad.slice(0, 5), [], `${bad.length} of 1000 cases failed`)
})

test('the real motive survives every clue at every band (the solver never rules it out)', () => {
  for (let seed = 1; seed <= 500; seed++) {
    for (const band of [1, 2, 3, 4, 5]) {
      const { c, left } = playCase(seed, { players: 4 + (seed % 9), band })
      assert.ok(left.includes(c.motive), `seed ${seed} band ${band}`)
      if (band >= 4) assert.equal(left.length, 1, `seed ${seed} band ${band}: Irwin names it`)
    }
  }
})

// ---- G33 ------------------------------------------------------------------

test('G33 Act 2 hints only ever rule out wrong families; the real family is never ruled out (1,000 cases)', () => {
  for (let seed = 1; seed <= 1000; seed++) {
    const rng = seeded(seed)
    const roster = rosterOf(2 + (seed % 11), rng)
    const c = rehearsalCase({ nightId: `g-${seed}`, roster, rng })
    const s = c.solving
    assert.equal(s.family, familyOf(c.motive), `seed ${seed}: the plan knows the real family`)
    assert.equal(s.newsOut.length, 1, `seed ${seed}: bulletin 1 crosses off exactly one family`)
    assert.ok(!s.newsOut.includes(s.family), `seed ${seed}: the news never rules out the real family`)
    for (const k of roster.map(g => g.key)) {
      const mine = hintsOf(s, k)
      assert.equal(mine.length, 2, `seed ${seed}: every guest is given two wrong families for their four cats`)
      assert.ok(!mine.includes(s.family), `seed ${seed}: a hint never rules out the real family`)
      assert.ok(!mine.some(f => s.newsOut.includes(f)), `seed ${seed}: a hint is a family the news did not take`)
      // G45: with the news, at least two families stand for any one guest (the real one and one more)
      const left = FAMILIES.map(f => f.key).filter(f => !s.newsOut.includes(f) && !mine.includes(f))
      assert.equal(left.length, 2, `seed ${seed}: G45`)
      assert.ok(left.includes(s.family))
    }
    // with enough guests, every wrong family reaches the room one way or another
    if (roster.length >= 2) assert.equal(new Set([...s.newsOut, ...Object.keys(s.hints).flatMap(k => hintsOf(s, k))]).size, FAMILIES.length - 1, `seed ${seed}`)
  }
})

test('G45 no single guest\'s four Act 2 cats, with bulletin 1, name the real family, at any rungs (1,000 cases)', () => {
  for (let seed = 1; seed <= 1000; seed++) {
    const rng = seeded(seed)
    const roster = rosterOf(2 + (seed % 11), rng)
    const c = rehearsalCase({ nightId: `g45-${seed}`, roster, rng })
    const s = c.solving
    for (const g of roster) {
      const families = hintsOf(s, g.key)
      const out = new Set(s.newsOut)
      const motivesOut = new Set()
      for (const cat of HINT_CATS) {
        const family = familyForCat(families, { cat, seed: `${c.screenSalt}\u0000${g.key}` })
        const line = catHintLine(c, { cat, level: 1 + rng(5), act: 2, family, seed: `${c.screenSalt}\u0000${g.key}\u0000${cat}`, bonusFamilies: [...families, ...s.newsOut] })
        for (const f of line.families) out.add(f)
        for (const n of line.motives) motivesOut.add(n)
        for (const n of line.motives) assert.ok([...families, ...s.newsOut].includes(familyOf(n)), `seed ${seed}: a single motive only from the guest's two families or the news's`)
      }
      assert.ok(!out.has(s.family) && !motivesOut.has(c.motive), `seed ${seed}: never the real answer`)
      const standing = FAMILIES.map(f => f.key).filter(f => !out.has(f))
      assert.ok(standing.length >= 2, `seed ${seed}: at least two families stand for one guest after Act 2`)
    }
  }
})

test('the five families hold all nineteen motives, each exactly once', () => {
  assert.equal(FAMILIES.length, 5)
  assert.deepEqual(ALL_MOTIVES, MOTIVES.map(m => m.n).sort((a, b) => a - b))
  assert.equal(new Set(ALL_MOTIVES).size, 19)
  for (const m of MOTIVES) assert.ok(familyOf(m.n), `motive ${m.n} has a family`)
})

// ---- G34 ------------------------------------------------------------------

test('G34 Irwin\'s countdown: five cards at dial 1 down to one at 5; the real motive always; filler from its family first, then from families already ruled out', () => {
  for (const m of MOTIVES) {
    for (const band of [1, 2, 3, 4, 5]) {
      const family = familyOf(m.n)
      const others = FAMILIES.map(f => f.key).filter(k => k !== family)
      const c = { motive: m.n, solving: { family, newsOut: [others[0]], hints: { a: others[1] }, memory: {}, struck: [] } }
      const opts = irwinOptions(c, { band, seed: `s${m.n}` })
      assert.equal(opts.length, irwinCount(band), `motive ${m.n} band ${band}`)
      assert.equal(opts.length, 6 - band)
      assert.ok(opts.includes(m.n), 'the real motive is always named')
      const mates = familyMates(m.n)
      const inFamily = opts.filter(n => n !== m.n && familyOf(n) === family).length
      assert.equal(inFamily, Math.min(mates.length, opts.length - 1), 'the real family fills first')
      for (const n of opts) assert.ok(familyOf(n) === family || others.slice(0, 2).includes(familyOf(n)), 'then only families already ruled out')
      assert.deepEqual(opts, [...opts].sort((a, b) => a - b), 'in number order, so the order says nothing')
    }
  }
  // on the screen: the line matches the count, the choices carry rhymes only
  const clue = irwinMotiveClue({ motive: 11, dial: 0, solving: { memory: {}, struck: [] } }, { seed: 'x' })
  assert.equal(clue.choices.length, 3)
  assert.match(clue.optionLine, /one of these three/)
  assert.equal(clue.mood, 3)
  for (const ch of clue.choices) assert.deepEqual(Object.keys(ch).sort(), ['n', 'rhyme'])
  // and his screen is the opener, that line and the closer: the countdown replaces the old sealed line (handoff §5)
  assert.deepEqual(irwinLines({ optionLine: clue.optionLine }), [DEFAULT_IRWIN.opener, clue.optionLine, DEFAULT_IRWIN.closer])
})

// ---- G35 and G36: the study pays the Ghost's trace -----------------------

function hiddenPair(rng, players = 8) {
  const list = rosterOf(players, rng)
  const roster = Object.fromEntries(list.map(g => [g.key, g]))
  return { list, roster }
}

test('G35 the study clue shows the Ghost\'s trace at the dial\'s level and never names a person', async () => {
  const db = new FakeFirestore()
  for (let seed = 1; seed <= 200; seed++) {
    const rng = seeded(seed)
    const { list, roster } = hiddenPair(rng, 4 + (seed % 9))
    const c = { ghost: list[1].key, murderer: list[2].key, dial: (seed % 25) - 12, rehearsal: false }
    const ghostTrace = traceOf(roster[c.ghost].characterId).trace
    const reveal = await studyReveal(db, { c, roster, pick: rng })
    const card = studyClueCard(c, 4, 'station1', reveal)
    if (reveal.level === 3) assert.ok(reveal.images.includes(ghostTrace), `seed ${seed}: one of the two is the Ghost's`)
    else assert.equal(reveal.trace, ghostTrace, `seed ${seed}: the Ghost's own trace`)
    assert.equal(reveal.label ?? null, reveal.level === 5 ? traceOf(roster[c.ghost].characterId).traceLabel : null, `seed ${seed}: the trace's name only at level 5`)
    const text = JSON.stringify(card)
    for (const g of list) {
      assert.ok(!text.includes(g.name), `seed ${seed}: no guest name`)
      assert.ok(!text.includes(CHARACTERS.find(ch => ch.id === g.characterId).name), `seed ${seed}: no character name`)
    }
    assert.ok(!/"(ghost|murderer|victim|role|characterId)"/.test(text), `seed ${seed}: no role, no character id`)
  }
})

test('G36 level 3, two similar options: the study never offers the Murderer\'s trace, the bedroom never the Ghost\'s', async () => {
  // a party where the Ghost's and the Murderer's traces share a bucket, so the look-alike could be either
  const pairs = [['white', 'leech'], ['rye', 'devine'], ['steeps', 'arms']] // ink/iodine, flour/petals, coffee/boot print
  let studyOther = 0
  for (const [ghostId, murdererId] of pairs) {
    for (let seed = 1; seed <= 100; seed++) {
      const rng = seeded(seed)
      const others = PLAYABLE.filter(ch => ![ghostId, murdererId].includes(ch.id)).slice(0, 4)
      const list = [ghostId, murdererId, ...others.map(o => o.id)].map((id, i) => ({ key: `k${i}`, name: NAMES[i], characterId: id }))
      const roster = Object.fromEntries(list.map(g => [g.key, g]))
      const c = { ghost: 'k0', murderer: 'k1', dial: 0, rehearsal: false }
      const reveal = await studyReveal(new FakeFirestore(), { c, roster, pick: rng })
      if (reveal.level !== 3) continue
      studyOther++
      assert.ok(!reveal.images.includes(traceOf(murdererId).trace), `${ghostId}/${murdererId} seed ${seed}: the study never shows the Murderer's trace`)
    }
  }
  assert.ok(studyOther > 0, 'level 3 was reached')
  // the bedroom door, through the dealer, at the same rung
  for (const [ghostId, murdererId] of pairs) {
    const db = new FakeFirestore()
    db.store.set('meta/game', { host_jonathan: 'Jon', host_susan: 'Susan' })
    const { nightId } = await createNight(db)
    for (let i = 0; i < 6; i++) await join(db, { uid: `u${i}`, nightId, name: NAMES[i + 2] })
    const n = db.store.get(`nights/${nightId}`)
    const keys = Object.keys(n.roster)
    const others = PLAYABLE.filter(ch => ![ghostId, murdererId].includes(ch.id))
    keys.forEach((k, i) => { n.roster[k].characterId = i === 0 ? ghostId : i === 1 ? murdererId : others[i].id })
    await hostCommand(db, { nightId, command: 'act', arg: 2 })
    const c = db.store.get(`cases/${nightId}`)
    db.store.set(`cases/${nightId}`, { ...c, ghost: keys[0], murderer: keys[1], dial: 0 })
    await revealTrace(db, nightId, { force: true })
    const priv = db.store.get(`nights/${nightId}/private/trace`)
    if (priv.level === 3) assert.notEqual(priv.partner, traceOf(ghostId).trace, 'the bedroom never shows the Ghost\'s trace')
  }
})

// ---- G37: the memory match -------------------------------------------------

test('G50 the memory match: three rounds of 6, 10 and 14 pairs, always all fourteen traces as art; never the real motive crossed off', () => {
  assert.deepEqual(MEMORY_ROUNDS, [6, 10, 14])
  assert.equal(ALL_TRACES.length, 14)
  for (let seed = 1; seed <= 300; seed++) {
    const rng = seeded(seed)
    const boards = memoryBoards(rng)
    assert.deepEqual(boards.map(b => b.length), [12, 20, 28], `seed ${seed}: 6, 10 and 14 pairs`)
    for (const board of boards) {
      const counts = {}
      for (const t of board) { assert.ok(ALL_TRACES.includes(t), `seed ${seed}: trace art only`); counts[t] = (counts[t] ?? 0) + 1 }
      for (const n of Object.values(counts)) assert.equal(n, 2, `seed ${seed}: every card has exactly one pair`)
    }
    assert.equal(new Set(boards[2]).size, 14, `seed ${seed}: the last board holds every trace`)
    assert.ok(!boards.flat().some(t => /[A-Z]/.test(t)), 'trace ids only, never a name')
  }
  // G51: Zimothy's and Boo's cross-offs never take the real motive, never the same one twice
  for (let seed = 1; seed <= 1000; seed++) {
    const { c, groups } = playCase(seed, { players: 4 + (seed % 9) })
    const s = c.solving
    const picks = [...Object.values(s.memory), ...Object.values(s.boo)]
    assert.ok(!picks.includes(c.motive), `seed ${seed}: never the real motive`)
    assert.equal(new Set(picks).size, picks.length, `seed ${seed}: never the same motive twice`)
    // one they might still have: replayed group by group, whenever the group still had a wrong one to lose
    const memory = {}
    const boo = {}
    groups.forEach((members, i) => {
      const groupId = `g${i + 1}`
      const out = new Set([...s.newsOut, ...members.flatMap(k => hintsOf(s, k))])
      const gone = new Set([...s.struck, ...Object.values(memory), ...Object.values(boo)])
      const could = ALL_MOTIVES.filter(n => n !== c.motive && !out.has(familyOf(n)) && !gone.has(n))
      const n = memoryPick({ ...c, solving: { ...s, memory, boo } }, { groupId, members, seed: c.screenSalt })
      assert.equal(n, s.memory[groupId], `seed ${seed}: the same pick every time`)
      if (could.length) assert.ok(could.includes(n), `seed ${seed} group ${i + 1}: a motive the group might still have`)
      memory[groupId] = n
      boo[groupId] = s.boo[groupId]
    })
  }
})

// The Act 4 rooms through the dealer: Start Act 4, the group cards, round by round.
async function act4Party(n = 8, now = 3_000_000) {
  const db = new FakeFirestore()
  db.store.set('meta/game', { host_jonathan: 'Jon', host_susan: 'Susan' })
  const { nightId } = await createNight(db)
  for (const name of NAMES.slice(0, n)) await join(db, { uid: `u-${name.toLowerCase()}`, nightId, name })
  await hostCommand(db, { nightId, command: 'act', arg: 3, now })
  await hostCommand(db, { nightId, command: 'start-act4', now })
  await hostCommand(db, { nightId, command: 'next', now }) // the group cards
  await hostCommand(db, { nightId, command: 'next', now }) // round 1
  return { db, nightId }
}

test('the memory match through the dealer: three boards for the group in the Library, a wrong board is refused, the third pays the group once', async () => {
  const now = 3_000_000
  const { db, nightId } = await act4Party(8, now)
  let board = db.store.get(memoryPath(nightId))
  for (let r = 0; !board?.boardId && r < 5; r++) { await hostCommand(db, { nightId, command: 'next', now }); board = db.store.get(memoryPath(nightId)) }
  assert.ok(board.boardId, 'a group is in the Library')
  assert.equal(board.step, 0)
  assert.ok(!JSON.stringify(board).match(/"(name|members|motive|cross)"/), 'the boards carry traces only')
  const pairsOf = cards => {
    const pairs = []
    const open = new Map()
    cards.forEach((t, i) => { if (open.has(t) && open.get(t).length) pairs.push([open.get(t).pop(), i]); else open.set(t, [...(open.get(t) ?? []), i]) })
    return pairs
  }
  const wrong = Array.from({ length: 7 }, (_, i) => [2 * i, 2 * i + 1])
  if (!wrong.every(([a, b]) => board.boards['0'][a] === board.boards['0'][b])) await assert.rejects(player.memoryStep(db, { nightId, boardId: board.boardId, step: 0, pairs: wrong }), /do not match/)
  await assert.rejects(player.memoryStep(db, { nightId, boardId: board.boardId, step: 1, pairs: pairsOf(board.boards['1']) }), /not the board/)
  for (const step of [0, 1]) assert.equal((await player.memoryStep(db, { nightId, boardId: board.boardId, step, pairs: pairsOf(board.boards[String(step)]) })).step, step + 1)
  const r = await player.memoryStep(db, { nightId, boardId: board.boardId, step: 2, pairs: pairsOf(board.boards['2']) })
  assert.equal(r.cleared, true)
  assert.ok(r.paid >= 2, 'every member of the group got the reward')
  const again = await player.memoryStep(db, { nightId, boardId: board.boardId, step: 2, pairs: pairsOf(board.boards['2']) })
  assert.equal(again.already, true)
  const c = db.store.get(`cases/${nightId}`)
  assert.notEqual(c.solving.memory[board.groupId], c.motive, 'never the real motive')
  // Act 5: every group has had the Library and the Entryway pay, one motive each, never the real one
  await hostCommand(db, { nightId, command: 'act', arg: 5, now })
  const groups = db.store.get(`nights/${nightId}/public/rotation`).groups
  const after = db.store.get(`cases/${nightId}`).solving
  assert.equal(Object.keys(after.memory).length, groups.length, 'every group crossed one off in the Library by Act 5')
  assert.equal(Object.keys(after.boo).length, groups.length, 'and one with Boo')
  assert.ok(![...Object.values(after.memory), ...Object.values(after.boo)].includes(c.motive))
})

// ---- G38 ------------------------------------------------------------------

test('G38 no hidden events for the Murderer or the Ghost in Act 2: no beat opens one, and every phone gets the same windows', async () => {
  for (const b of beatsOf(2)) {
    assert.ok(!/event/i.test(b.action ?? ''), `Act 2 beat ${b.key} opens no event`)
    assert.ok(!String(b.action ?? '').startsWith('window:') || b.action === 'window:questions', `Act 2 beat ${b.key} opens no hidden window`)
  }
  assert.ok(!Object.keys(NIGHT.windows).some(k => /event/i.test(k)), 'there is no event window at all yet')
  // a whole Act 2 on a party: every window every phone holds is the same Parlour Game, whatever the role
  const db = new FakeFirestore()
  db.store.set('meta/game', { host_jonathan: 'Jon', host_susan: 'Susan' })
  const { nightId } = await createNight(db)
  const uids = []
  for (const name of NAMES.slice(0, 7)) { const uid = `u-${name.toLowerCase()}`; await join(db, { uid, nightId, name }); uids.push(uid) }
  let now = 4_000_000
  await hostCommand(db, { nightId, command: 'act', arg: 2, now })
  for (const b of beatsOf(2).slice(1)) await hostCommand(db, { nightId, command: 'beat', arg: b.key, now })
  const sched = db.store.get(`nights/${nightId}/private/parlour`)
  for (let i = 0; i < (sched?.count ?? 0); i++) {
    now = Math.max(now + 4 * 60_000, Number(new Date(sched[`due${i}`]).getTime()) || 0)
    await hostCommand(db, { nightId, command: 'tick', now })
    await hostCommand(db, { nightId, command: 'tick', now: now + 70_000 })
  }
  const shapes = uids.map(uid => JSON.stringify(db.store.get(`sessions/${uid}`).windows ?? {}))
  assert.ok(shapes.every(s => s === shapes[0]), 'identical windows on every phone')
  for (const w of Object.values(JSON.parse(shapes[0]))) assert.equal(w.kind, 'questions', 'only Parlour Games in Act 2')
})

// ---- F20 and F21: the Act 2 rooms ------------------------------------------

async function lightsParty(n, now = 1_000_000, { party = false } = {}) {
  const db = new FakeFirestore()
  db.store.set('meta/game', { host_jonathan: 'Jon', host_susan: 'Susan', ...(party ? { party_night: true } : {}) })
  const { nightId } = await createNight(db)
  const uids = {}
  for (const name of NAMES.slice(0, n)) { const uid = `u-${name.toLowerCase()}`; await join(db, { uid, nightId, name }); uids[name.toLowerCase()] = uid }
  await hostCommand(db, { nightId, command: 'act', arg: 2, now })
  await hostCommand(db, { nightId, command: 'beat', arg: 'cat', now })
  return { db, nightId, uids }
}
const stepOf = (db, uid) => db.store.get(`sessions/${uid}`).lights?.step

test('F20 only one player is at a cat\'s code at a time in Act 2, for every party size', async () => {
  for (let n = 2; n <= 12; n++) {
    const { db, nightId, uids } = await lightsParty(n)
    const r = await walkLights(db, nightId)
    assert.equal(r.worst, 1, `${n} players: never two at a cat`)
    assert.equal(r.meetings, 4 * n, `${n} players: every guest met all four cats`)
    for (const uid of Object.values(uids)) {
      const said = db.store.get(`sessions/${uid}`).cards.filter(c => c.kind === 'testimony')
      assert.deepEqual(said.map(c => c.cat).sort(), [...LIGHTS_CATS].sort(), `${n} players: one card from each cat`)
    }
  }
  // the four rooms, and never Irwin or the living room
  assert.deepEqual(CAT_ROOMS, { granolia: 'the Study', salem: 'the Orangerie', zimothy: 'the Library', boo: 'the Entryway' })
  assert.ok(!LIGHTS_CATS.includes('irwin'))
  // a waiting guest, or the wrong cat, is turned away kindly and nothing changes
  const { db, nightId, uids } = await lightsParty(9)
  const state = db.store.get(lightsPath(nightId))
  const deck = db.store.get(`nights/${nightId}/private/deck`).uids
  const [waitKey, waiter] = Object.entries(state.guests).find(([, g]) => g.step === 'wait')
  await assert.rejects(player.meetCat(db, { nightId, uid: deck[waitKey], cat: waiter.cat }), /Not yet/)
  const [goKey, goer] = Object.entries(state.guests).find(([, g]) => g.step === 'go')
  const other = LIGHTS_CATS.find(cat => cat !== goer.cat)
  await assert.rejects(player.meetCat(db, { nightId, uid: deck[goKey], cat: other }), /Not this room/)
  assert.deepEqual(db.store.get(lightsPath(nightId)), state, 'refusals change nothing')
  // scanning twice is harmless
  await player.meetCat(db, { nightId, uid: deck[goKey], cat: goer.cat })
  const twice = await player.meetCat(db, { nightId, uid: deck[goKey], cat: goer.cat })
  assert.equal(twice.already, true)
  assert.equal(Object.values(uids).length, 9)
})

test('F21 every player is always told where to go next: through the waves, a no-show, a late joiner and the end of the act', async () => {
  const now = 2_000_000
  const { db, nightId, uids } = await lightsParty(9, now)
  const all = () => Object.values(db.store.get(`nights/${nightId}/private/deck`).uids)
  const told = () => { for (const uid of all()) { const l = db.store.get(`sessions/${uid}`).lights; assert.ok(l?.step && l.title && l.text, 'a next step on every phone') } }
  told()
  // a guest called to a cat who never turns up: the tick moves them on, gives them the cat's lines on the phone, and calls the next
  const state = db.store.get(lightsPath(nightId))
  const deck = db.store.get(`nights/${nightId}/private/deck`).uids
  const [noShow] = Object.entries(state.guests).find(([, g]) => g.step === 'go')
  await hostCommand(db, { nightId, command: 'tick', now: now + GO_MS - 1 })
  assert.equal(stepOf(db, deck[noShow]), 'go', 'not a moment early')
  await hostCommand(db, { nightId, command: 'tick', now: now + GO_MS })
  assert.ok(['wait', 'go'].includes(stepOf(db, deck[noShow])), 'moved on to the next cat')
  assert.equal(db.store.get(`sessions/${deck[noShow]}`).cards.filter(c => c.kind === 'testimony' && c.cat === state.guests[noShow].cat).length, 1, 'delay, never destroy')
  told()
  // a guest who arrives late joins the shortest line at the next tick
  await join(db, { uid: 'u-late', nightId, name: 'Lou' })
  await hostCommand(db, { nightId, command: 'tick', now: now + GO_MS + 60_000 })
  assert.ok(['wait', 'go'].includes(stepOf(db, 'u-late')), 'the late guest has a step')
  told()
  // the end of the act: everyone still in a line is greeted on the phone and sent to supper
  await hostCommand(db, { nightId, command: 'beat', arg: beatsOf(2).at(-1).key, now: now + GO_MS + 120_000 })
  for (const uid of all()) {
    assert.equal(stepOf(db, uid), 'done', 'everyone goes to supper')
    assert.match(db.store.get(`sessions/${uid}`).lights.title, /Supper/)
    assert.equal(db.store.get(`sessions/${uid}`).cards.filter(c => c.kind === 'testimony').length, 4, 'everyone holds all four cats\' lines: the ones they missed as a note')
  }
  told()
  assert.ok(Object.keys(uids).length === 9)
})

// ---- F22 and F23: Not yet, and the queue never stalls ---------------------------

test('F22 "Not yet, call me later" is the same on every phone and moves the guest back in the queue with no penalty', async () => {
  const now = 3_000_000
  const { db, nightId, uids } = await lightsParty(8, now)
  const deck = db.store.get(`nights/${nightId}/private/deck`).uids
  const state = () => db.store.get(lightsPath(nightId))
  // every phone the line calls shows the same step, the same words but the cat and the room, whatever the role
  const called = Object.entries(state().guests).filter(([, g]) => g.step === 'go')
  assert.ok(called.length >= 2)
  const shapes = called.map(([k]) => { const l = db.store.get(`sessions/${deck[k]}`).lights; return JSON.stringify(Object.keys(l).sort()) + l.variant })
  assert.ok(shapes.every(x => x === shapes[0]), 'F22 the same step on every called phone')
  const cards = readFileSync(new URL('../../play/src/screens/Cards.jsx', import.meta.url), 'utf8')
  const step = cards.slice(cards.indexOf('export function LightsStep'), cards.indexOf('// A cat speaks'))
  assert.match(step, /\{lights\.step === 'go' && !onWay && \(\s*<div className="pair">\s*<button className="big" onClick=\{goNow\}>On my way<\/button>\s*<button className="quiet" disabled=\{busy\} onClick=\{\(\) => call\(callNotYet, \{\}\)\}>Not yet, call me later<\/button>/, 'F22 the one button, on every phone the line calls')
  assert.ok(!/murderer|ghost|detective|\.role\b/i.test(step), 'F22 the phone never asks which role it is')
  // Not yet: back to the Parlour, the cat free for someone else, the skipped cat last on the route
  const [key, was] = called[0]
  const uid = deck[key]
  const before = structuredClone(db.store.get(`sessions/${uid}`))
  await player.notYet(db, { nightId, uid, now })
  const me = state().guests[key]
  assert.equal(me.step, 'wait')
  assert.equal(db.store.get(`sessions/${uid}`).lights.variant, 'later', 'F22 the phone says: back in the queue')
  assert.notEqual(state().cats[was.cat].at, key, 'the cat is free for someone else')
  assert.equal(me.route.at(-1), was.cat, 'the skipped cat comes last')
  assert.deepEqual(me.met ?? [], [], 'nothing counted as seen')
  // no penalty: the same affection, no card lost, nothing else on the phone touched
  const after = db.store.get(`sessions/${uid}`)
  assert.deepEqual(after.affection, before.affection, 'F22 no penalty to any cat')
  assert.deepEqual(after.cards, before.cards, 'F22 nothing taken away')
  // not called again for two minutes; a second tap changes nothing
  assert.equal((await player.notYet(db, { nightId, uid, now })).already, true)
  await hostCommand(db, { nightId, command: 'tick', now: now + LATER_MS - 1 })
  assert.notEqual(state().guests[key].step, 'go', 'not called again for two minutes')
  // and the guest still sees all four cats in the end
  await walkLights(db, nightId, { now: now + LATER_MS })
  for (let t = 1; t <= 10 && state().guests[key].step !== 'done'; t++) {
    await hostCommand(db, { nightId, command: 'tick', now: now + LATER_MS + t * 60_000 })
    await walkLights(db, nightId, { now: now + LATER_MS + t * 60_000 })
  }
  assert.equal(state().guests[key].step, 'done', 'F22 every cat seen in the end')
  assert.deepEqual(db.store.get(`sessions/${uid}`).cards.filter(c => c.kind === 'testimony').map(c => c.cat).sort(), [...LIGHTS_CATS].sort())
  assert.ok(Object.keys(uids).length === 8)
})

test('F23 the Act 2 queue never stalls: after every move and every tick, no cat sits free while a guest who still needs it is waiting and ready (2 to 12 guests, with Not yet)', async () => {
  const ready = (g, at) => g.step === 'wait' && !(ms(g.laterUntil) > at)
  const stalled = (s, at) => LIGHTS_CATS.filter(cat => !s.cats[cat].at && Object.values(s.guests).some(g => ready(g, at) && !(g.met ?? []).includes(cat))).length
  for (let n = 2; n <= 12; n++) {
    let now = 5_000_000
    const rng = seeded(n * 97)
    const { db, nightId } = await lightsParty(n, now)
    const deck = db.store.get(`nights/${nightId}/private/deck`).uids
    const state = () => db.store.get(lightsPath(nightId))
    assert.equal(stalled(state(), now), 0, `F23 ${n} guests: the first wave fills every cat it can`)
    for (let guard = 0; guard < 400; guard++) {
      const s = state()
      if (Object.values(s.guests).every(g => g.step === 'done')) break
      const due = Object.entries(s.guests).filter(([, g]) => g.step === 'go')
      if (!due.length) {
        now += 30_000
        await hostCommand(db, { nightId, command: 'tick', now })
        assert.equal(stalled(state(), now), 0, `F23 ${n} guests: after a tick`)
        continue
      }
      const [k] = due[rng(due.length)]
      if (rng(4) === 0) await player.notYet(db, { nightId, uid: deck[k], now })
      else { await player.meetCat(db, { nightId, uid: deck[k], cat: s.guests[k].cat, now }); await player.leaveCat(db, { nightId, uid: deck[k], now }) }
      assert.equal(stalled(state(), now), 0, `F23 ${n} guests: after a move`)
      now += 1_000
    }
    assert.ok(Object.values(state().guests).every(g => g.step === 'done'), `F23 ${n} guests: everyone saw all four`)
  }
})

test('every Act 2 cat gives its line from the bank, and the case records what each rules out, never the real answer', async () => {
  const { db, nightId } = await lightsParty(6, 1_000_000, { party: true })
  await walkLights(db, nightId)
  const c = db.store.get(`cases/${nightId}`)
  assert.equal(c.rehearsal, false)
  const deck = db.store.get(`nights/${nightId}/private/deck`).uids
  for (const [key, uid] of Object.entries(deck)) {
    const said = db.store.get(`sessions/${uid}`).cards.filter(x => x.kind === 'testimony')
    assert.equal(said.length, 4)
    for (const t of said) {
      assert.equal(t.hint.placeholder, false)
      assert.ok(t.hint.text && !/\[[A-Z0-9]+\]/.test(t.hint.text), 'every blank filled')
      const ruled = c.solving.ruled[`${key}-${t.cat}`]
      assert.ok(ruled, 'what the line ruled out is kept with the case')
      assert.ok(!ruled.families.includes(c.solving.family) && !ruled.motives.includes(c.motive), 'never the real answer')
      assert.ok(ruled.families.every(f => hintsOf(c.solving, key).includes(f)), 'a whole family only from the guest\'s two')
    }
    assert.equal(hintsOf(c.solving, key).length, 2)
  }
  assert.ok(c.dealtClues.some(e => e.kind === 'hint'), 'the ledger notes the hints (Spill the Beans is off once one is out)')
})

// ---- G41 ------------------------------------------------------------------

// A full stop doubled after a word ("Not cheese.."), four dots, or a full
// stop after a question or an exclamation mark ("reply some?.").
const DOUBLED = /[A-Za-z]\.\.(?!\.)|\.\.\.\.|[?!]\./

test('Granolia\'s half-remembered names read cleanly in her level 2 line: never a doubled mark', () => {
  const tpl = CAT_LINES.granolia.levels['2']
  for (const [n, half] of Object.entries(CAT_LINES.granolia.half)) {
    const text = fillSlot(tpl, '[HALF]', half)
    assert.ok(!DOUBLED.test(text) && !text.includes('[HALF]'), `motive ${n}: length ${text.length}`)
    assert.ok(text.includes(half), `motive ${n}: the half-name is whole`)
  }
  assert.equal(fillSlot('It wasn\'t [HALF]. You know.', '[HALF]', 'the pie'), 'It wasn\'t the pie. You know.', 'a plain name keeps its full stop')
  assert.equal(fillSlot('It wasn\'t [HALF]. You know.', '[HALF]', 'the pie?'), 'It wasn\'t the pie? You know.')
})

test('G18b every cat line, at every level, in Acts 2 and 4, for every motive, only rules out wrong answers and fills every blank', () => {
  for (const m of MOTIVES) {
    const real = familyOf(m.n)
    const c = { motive: m.n, solving: { family: real, newsOut: [], hints: {}, memory: {} } }
    for (const family of FAMILIES.map(f => f.key).filter(k => k !== real)) {
      for (const cat of HINT_CATS) for (const level of [1, 2, 3, 4, 5]) for (const act of [2, 4]) {
        const line = catHintLine(c, { cat, level, act, family, seed: `s${m.n}${family}${level}` })
        const where = `motive ${m.n} ${cat} level ${level} act ${act} on ${family}`
        assert.ok(line.text, `${where}: a line`)
        assert.ok(!/\[[A-Z0-9]+\]/.test(line.text) && !line.text.includes('undefined'), `${where}: blanks filled`)
        assert.ok(!DOUBLED.test(line.text), `${where}: no doubled marks`)
        assert.ok(!line.families.includes(real), `${where}: never the real family`)
        assert.ok(!line.motives.includes(m.n), `${where}: never the real motive`)
        if (act === 2) for (const n of line.motives) if (familyOf(n) !== family) assert.equal(familyOf(n), real, `${where}: with no families given, a bonus is a real-family mate`)
        if (act === 2) {
          // as the dealer calls it: the bonus only from the guest's other family or the news's (G45)
          const others = FAMILIES.map(f => f.key).filter(k => k !== real && k !== family)
          const given = catHintLine(c, { cat, level, act, family, seed: `s${m.n}${family}${level}`, bonusFamilies: [family, ...others.slice(0, 2)] })
          for (const n of given.motives) assert.ok([family, ...others.slice(0, 2)].includes(familyOf(n)), `${where}: a bonus inside the given families`)
          assert.ok(!/undefined/.test(given.text), `${where}: blanks filled`)
        }
        if (cat !== 'salem') assert.ok(!line.text.includes(motiveName(m.n)), `${where}: the real motive is never said`)
      }
    }
    // the real family gets no line at all
    assert.equal(catHintLine(c, { cat: 'boo', level: 5, act: 2, family: real }).text, null)
  }
  // the ladders, as the handoff draws them
  const c = { motive: 1, solving: { family: 'food' } }
  const at = (cat, level, act = 2) => catHintLine(c, { cat, level, act, family: 'screens', seed: 'x' })
  assert.deepEqual([1, 2, 3, 4, 5].map(l => at('boo', l).motives.length + at('boo', l).families.length * 10), [0, 0, 1, 10, 11], 'Boo: a look, dismissed, one motive, a family, a family plus a bonus')
  assert.deepEqual([1, 2, 3, 4, 5].map(l => at('zimothy', l).motives.length + at('zimothy', l).families.length * 10), [1, 1, 2, 10, 11], 'Zimothy: one, one, two, the family, the family plus a bonus')
  assert.deepEqual([1, 2, 3, 4, 5].map(l => at('granolia', l).motives.length + at('granolia', l).families.length * 10), [0, 1, 1, 2, 10], 'Granolia: nothing, half a name, one, two, the family')
  for (const l of [1, 2, 3]) assert.equal(at('salem', l).straight, false, 'Salem is backwards at 1 to 3')
  assert.equal(at('salem', 5).straight, true, 'and straight at 5')
  assert.deepEqual(at('salem', 4).families, [], 'a coin flip at 4 rules out nothing anybody can trust')
})

test('G18 Boo\'s ladder in her own words: a look at 1, "Ew. Do I know you?" at 2, one motive in five words at 3, a family at 4, a family and a bonus motive at 5', () => {
  const names = Object.values(CAT_LINES.motiveNames).map(n => n.toLowerCase())
  const namesNone = text => !names.some(n => text.toLowerCase().includes(n))
  const cap = t => t[0].toUpperCase() + t.slice(1)
  const words = t => t.split(/\s+/).filter(Boolean).length
  for (const m of MOTIVES) {
    const real = familyOf(m.n)
    const c = { motive: m.n, solving: { family: real } }
    for (const family of FAMILIES.map(f => f.key).filter(k => k !== real)) {
      const at = level => catHintLine(c, { cat: 'boo', level, act: 2, family, seed: `g18-${m.n}-${family}` })
      const where = `G18 motive ${m.n} on ${family}`
      // 1: a look, nothing said, nothing named
      assert.equal(at(1).text, CAT_LINES.boo.levels['1'], `${where}: level 1 is her look`)
      assert.ok(namesNone(at(1).text) && !/"/.test(at(1).text), `${where}: a look names nothing`)
      // 2: Ew. Do I know you?
      assert.equal(at(2).text, 'Ew. Do I know you?', `${where}: level 2`)
      assert.equal(CAT_LINES.boo.levels['2'], 'Ew. Do I know you?')
      // 3: one motive, in five words: the motive and "So not it. Bye."
      const l3 = at(3)
      assert.equal(l3.motives.length, 1, `${where}: level 3 names one motive`)
      assert.equal(familyOf(l3.motives[0]), family, `${where}: from the family the line is about`)
      const name = cap(motiveName(l3.motives[0]))
      assert.equal(l3.text, CAT_LINES.boo.levels['3'].replace('[MOTIVE]', name), `${where}: her level 3 line`)
      const said = /"([^"]+)"/.exec(l3.text)?.[1] ?? ''
      assert.ok(said.startsWith(`${name}?`) && words(said.slice(name.length + 1)) === 4, `${where}: the motive, then four words`)
      // 4: a family, in her chatty line for it
      assert.equal(at(4).text, CAT_LINES.boo.family4[family], `${where}: level 4 is the family's chatty line`)
      assert.deepEqual(at(4).families, [family])
      assert.ok(words(at(4).text) > 10, `${where}: chatty`)
      // 5: the family and one bonus motive from outside it
      const l5 = at(5)
      assert.deepEqual(l5.families, [family], `${where}: level 5 the family`)
      assert.equal(l5.motives.length, 1, `${where}: and one bonus motive`)
      assert.notEqual(familyOf(l5.motives[0]), family)
      assert.equal(l5.text, CAT_LINES.boo.family5[family].replace('[BONUS]', motiveName(l5.motives[0])), `${where}: her level 5 line`)
    }
  }
})

test('G44 in Act 2 every cat visit gives one motive hint and one bag clue, at the rung of that cat\'s affection at the scan (2 to 12 players)', async () => {
  for (let n = 2; n <= 12; n++) {
    const { db, nightId } = await lightsParty(n)
    await walkLights(db, nightId)
    const deck = db.store.get(`nights/${nightId}/private/deck`).uids
    for (const uid of Object.values(deck)) {
      const said = db.store.get(`sessions/${uid}`).cards.filter(x => x.kind === 'testimony')
      assert.deepEqual(said.map(x => x.cat).sort(), [...LIGHTS_CATS].sort(), `${n} players: one card from each cat`)
      for (const x of said) {
        assert.ok(x.hint?.text, `${n} players: a motive hint on every card`)
        assert.ok(x.bag?.text, `${n} players: a bag clue on every card`)
        assert.equal(x.outcome, undefined, 'no greeting-only cat any more')
      }
    }
  }
})

// ---- Salem petted ----------------------------------------------------------

test('Salem petted: a guest\'s Salem goes to 5 with a card saying so, once; never for the two hosts', async () => {
  const { db, nightId, uids } = await lightsParty(4)
  await assert.rejects(hostCommand(db, { nightId, command: 'salem-petted', arg: 'jon' }), /hosts/)
  await assert.rejects(hostCommand(db, { nightId, command: 'salem-petted', arg: 'susan' }), /hosts/)
  await assert.rejects(hostCommand(db, { nightId, command: 'salem-petted', arg: 'nobody' }), /at the party/)
  assert.equal((await hostCommand(db, { nightId, command: 'salem-petted', arg: 'jessa' })).ok, true)
  const s = db.store.get(`sessions/${uids.jessa}`)
  assert.equal(s.affection.salem, 5)
  assert.equal(s.salemFriend, true)
  assert.equal(s.cards.filter(c => c.id === 'salem-friend').length, 1)
  assert.match(s.cards.find(c => c.id === 'salem-friend').text, /True Friend of the Groundskeeper/)
  assert.equal((await hostCommand(db, { nightId, command: 'salem-petted', arg: 'jessa' })).already, true)
  assert.equal(db.store.get(`sessions/${uids.jessa}`).cards.filter(c => c.id === 'salem-friend').length, 1, 'once')
  assert.equal(db.store.get(`sessions/${uids.jacob}`).affection.salem, 3, 'nobody else moves')
})

test('family mates are the rest of the family', () => {
  assert.deepEqual(familyMates(1).sort((a, b) => a - b), [6, 12])
  assert.deepEqual(familyMates(19).sort((a, b) => a - b), [3, 10, 11, 13])
})
