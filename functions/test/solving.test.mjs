import { test } from 'node:test'
import assert from 'node:assert/strict'
import { FakeFirestore } from './fake-firestore.mjs'
import { walkLights } from './lights-walk.mjs'
import { createNight, join, MOTIVES, CHARACTERS } from '../lib/night.js'
import { hostCommand, player } from '../lib/run.js'
import { NIGHT, beatsOf, lightsPath, LIGHTS_CATS, CAT_ROOMS, GO_MS, memoryBoard, memoryPath, MEMORY_PAIRS, revealTrace } from '../lib/deal.js'
import { studyReveal, studyClueCard, makeGroups } from '../lib/station.js'
import { rehearsalCase } from '../lib/case.js'
import { struckMotives, screenSeed, irwinMotiveClue } from '../lib/screen.js'
import { FAMILIES, ALL_MOTIVES, familyOf, familyMates, solvingPlan, memoryPick, irwinOptions, irwinCount, remainingMotives, roomClues } from '../lib/families.js'
import { traceOf } from '../lib/traces.js'

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
      assert.ok(s.hints[k], `seed ${seed}: every guest gets a hint`)
      assert.notEqual(s.hints[k], s.family, `seed ${seed}: a hint never rules out the real family`)
      assert.ok(!s.newsOut.includes(s.hints[k]), `seed ${seed}: a hint is a family the news did not take`)
    }
    // with enough guests, every wrong family reaches the room one way or another
    if (roster.length >= 3) assert.equal(new Set([...s.newsOut, ...Object.values(s.hints)]).size, FAMILIES.length - 1, `seed ${seed}`)
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

test('G37 the memory match: only in-play traces, six pairs, never the real motive crossed off', () => {
  for (let seed = 1; seed <= 300; seed++) {
    const rng = seeded(seed)
    const list = rosterOf(2 + (seed % 11), rng)
    const roster = Object.fromEntries(list.map(g => [g.key, g]))
    const inPlay = new Set(list.map(g => traceOf(g.characterId).trace))
    const board = memoryBoard(roster, rng)
    assert.equal(board.length, MEMORY_PAIRS * 2, `seed ${seed}: twelve cards`)
    const counts = {}
    for (const t of board) { assert.ok(inPlay.has(t), `seed ${seed}: only traces at the party`); counts[t] = (counts[t] ?? 0) + 1 }
    for (const n of Object.values(counts)) assert.equal(n % 2, 0, `seed ${seed}: every card has its pair`)
    if (inPlay.size >= 6) assert.equal(Object.keys(counts).length, 6, `seed ${seed}: six different traces when six are at the party`)
    assert.ok(!board.some(t => /[A-Z]/.test(t)), 'trace ids only, never a name')
  }
  for (let seed = 1; seed <= 1000; seed++) {
    const { c, groups } = playCase(seed, { players: 4 + (seed % 9) })
    const s = c.solving
    assert.ok(!Object.values(s.memory).includes(c.motive), `seed ${seed}: never the real motive`)
    // one they might still have: replayed group by group, whenever the group still had a wrong one to lose
    const memory = {}
    groups.forEach((members, i) => {
      const groupId = `g${i + 1}`
      const out = new Set([...s.newsOut, ...members.map(k => s.hints[k])])
      const gone = new Set([...s.struck, ...Object.values(memory)])
      const could = ALL_MOTIVES.filter(n => n !== c.motive && !out.has(familyOf(n)) && !gone.has(n))
      const n = memoryPick({ ...c, solving: { ...s, memory } }, { groupId, members, seed: c.screenSalt })
      assert.equal(n, s.memory[groupId], `seed ${seed}: the same pick every time`)
      if (could.length) assert.ok(could.includes(n), `seed ${seed} group ${i + 1}: a motive the group might still have`)
      memory[groupId] = n
    })
  }
})

test('the memory match through the dealer: the board is set for the group at the station, a wrong clear is refused, a right one pays the group once', async () => {
  const db = new FakeFirestore()
  db.store.set('meta/game', { host_jonathan: 'Jon', host_susan: 'Susan' })
  const { nightId } = await createNight(db)
  for (const name of NAMES.slice(0, 8)) await join(db, { uid: `u-${name.toLowerCase()}`, nightId, name })
  const now = 3_000_000
  await hostCommand(db, { nightId, command: 'act', arg: 2, now })
  await hostCommand(db, { nightId, command: 'groups', now })
  await hostCommand(db, { nightId, command: 'act', arg: 4, now })
  let board = db.store.get(memoryPath(nightId))
  for (let r = 0; !board?.boardId && r < 5; r++) { await hostCommand(db, { nightId, command: 'next', now }); board = db.store.get(memoryPath(nightId)) }
  assert.ok(board.boardId, 'a group is at the memory match')
  assert.equal(board.cards.length, 12)
  assert.ok(!JSON.stringify(board).match(/"(name|members|motive|cross)"/), 'the board carries traces only')
  const wrong = [[0, 1], [2, 3], [4, 5], [6, 7], [8, 9], [10, 11]]
  if (!wrong.every(([a, b]) => board.cards[a] === board.cards[b])) await assert.rejects(player.memoryCleared(db, { nightId, boardId: board.boardId, pairs: wrong }), /do not match/)
  const pairs = []
  const open = new Map()
  board.cards.forEach((t, i) => { if (open.has(t) && open.get(t).length) pairs.push([open.get(t).pop(), i]); else open.set(t, [...(open.get(t) ?? []), i]) })
  const r = await player.memoryCleared(db, { nightId, boardId: board.boardId, pairs })
  assert.ok(r.paid >= 2, 'every member of the group got the cross-off')
  const again = await player.memoryCleared(db, { nightId, boardId: board.boardId, pairs })
  assert.equal(again.already, true)
  const c = db.store.get(`cases/${nightId}`)
  assert.notEqual(c.solving.memory[board.groupId], c.motive, 'never the real motive')
  // Act 5: every group still unpaid is paid
  await hostCommand(db, { nightId, command: 'act', arg: 5, now })
  const groups = db.store.get(`nights/${nightId}/public/rotation`).groups
  const after = db.store.get(`cases/${nightId}`).solving.memory
  assert.equal(Object.keys(after).length, groups.length, 'every group crossed one off by Act 5')
  assert.ok(!Object.values(after).includes(c.motive))
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

async function lightsParty(n, now = 1_000_000) {
  const db = new FakeFirestore()
  db.store.set('meta/game', { host_jonathan: 'Jon', host_susan: 'Susan' })
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
  // a guest sent to a cat who never turns up: the tick moves them on, greets them on the phone, and sends the next
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
    assert.equal(db.store.get(`sessions/${uid}`).cards.filter(c => c.kind === 'testimony' && c.outcome !== 'greet').length, 1, 'everyone holds their real hint')
  }
  told()
  assert.ok(Object.keys(uids).length === 9)
})

test('the Act 2 hint rides on the greeting as a marked stand-in that names no family, and the case knows each guest\'s family', async () => {
  const { db, nightId } = await lightsParty(6)
  await walkLights(db, nightId)
  const c = db.store.get(`cases/${nightId}`)
  const deck = db.store.get(`nights/${nightId}/private/deck`).uids
  for (const [key, uid] of Object.entries(deck)) {
    const t = db.store.get(`sessions/${uid}`).cards.find(x => x.kind === 'testimony' && x.outcome !== 'greet')
    assert.equal(t.cat, c.solving.hintCats[key], 'the real hint comes from the guest\'s hint cat')
    assert.equal(t.hint.placeholder, true)
    const text = JSON.stringify(t.hint)
    for (const f of FAMILIES) assert.ok(!text.toLowerCase().includes(`"${f.key}"`) && !text.includes(f.name), 'no family name on a phone')
    assert.ok(c.solving.hints[key], 'the case knows the family')
    assert.notEqual(c.solving.hints[key], c.solving.family)
  }
  assert.ok(c.dealtClues.some(e => e.kind === 'hint'), 'the ledger notes the hints (Spill the Beans is off once one is out)')
})

// ---- G39 ------------------------------------------------------------------

test('G39 each player gets exactly one real Act 2 hint; the other three cats only greet (2 to 12 players)', async () => {
  for (let n = 2; n <= 12; n++) {
    const { db, nightId } = await lightsParty(n)
    await walkLights(db, nightId)
    const c = db.store.get(`cases/${nightId}`)
    const deck = db.store.get(`nights/${nightId}/private/deck`).uids
    for (const [key, uid] of Object.entries(deck)) {
      const said = db.store.get(`sessions/${uid}`).cards.filter(x => x.kind === 'testimony')
      const real = said.filter(x => x.outcome !== 'greet')
      assert.equal(real.length, 1, `${n} players: one real hint`)
      assert.ok(real[0].hint, `${n} players: the real one carries the hint`)
      assert.equal(said.filter(x => x.outcome === 'greet' && !x.hint).length, 3, `${n} players: three greetings, no hint`)
      assert.ok(LIGHTS_CATS.includes(c.solving.hintCats[key]))
    }
  }
  // across many deals, every cat is somebody's hint cat about equally often
  const counts = Object.fromEntries(LIGHTS_CATS.map(cat => [cat, 0]))
  for (let seed = 1; seed <= 1000; seed++) {
    const rng = seeded(seed)
    const roster = rosterOf(9, rng)
    for (const cat of Object.values(rehearsalCase({ nightId: `h-${seed}`, roster, rng }).solving.hintCats)) counts[cat]++
  }
  for (const cat of LIGHTS_CATS) assert.ok(counts[cat] > 9000 / 4 * 0.85 && counts[cat] < 9000 / 4 * 1.15, `${cat}: ${counts[cat]}`)
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
