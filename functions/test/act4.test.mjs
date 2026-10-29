import { test } from 'node:test'
import assert from 'node:assert/strict'
import { FakeFirestore } from './fake-firestore.mjs'
import { walkLights } from './lights-walk.mjs'
import { createNight, join, characterById, MOTIVES } from '../lib/night.js'
import { hostCommand, player } from '../lib/run.js'
import { FREE_TIME_TIPS, lightsProgressOf, lightsPath, ms } from '../lib/deal.js'
import {
  ACT4_TEXT, DIRECTIONS, ROOMS, ROOM_KEYS, PARLOUR, roomFor, readRotation, act4Path, salemPath, booPath, memoryPath, parlourTip,
  salemFlips, salemColourAt, SALEM_CLEAN_MS, SALEM_LEAD_MS, SALEM_ROUNDS, booShow, BOO_POSES, BOO_JUDGING, ROUND_MS,
  addPairsBy, plusOne, markAt, PLACES_MAX,
} from '../lib/act4.js'
import { rehearsalCase } from '../lib/case.js'

// Act 4, Behind Closed Doors (docs/handoff-2026-10-23.md §3, §9.5 to §9.9):
// the warning, the group cards, four game rooms on a ten-minute clock, the
// rewards. Every case is the dealer's throwaway case in a fake Firestore,
// made and dropped here; the packing is a bracketed stand-in. Nothing is printed.

const NAMES = ['Jon', 'Jessa', 'Jacob', 'Marie', 'Pat', 'Sam', 'Lee', 'Ana', 'Rene', 'Lou']

async function party(n, { partyNight = false, now = 1_000_000 } = {}) {
  const db = new FakeFirestore()
  db.store.set('meta/game', { host_jonathan: 'Jon', host_susan: 'Susan', ...(partyNight ? { party_night: true } : {}) })
  // a throwaway packing in brackets: every bag has two words, each word in two or three bags
  const words = Object.fromEntries(Array.from({ length: 10 }, (_, i) => [String(i + 1), { [`(synthetic-${i % 4})`]: ['touch'], [`(synthetic-${4 + (i % 3)})`]: ['smell'] }]))
  const properties = {}
  for (const [n, ws] of Object.entries(words)) for (const w of Object.keys(ws)) (properties[w] ??= []).push(Number(n))
  db.store.set('sealed/bags', { words, properties })
  const { nightId } = await createNight(db)
  const uids = {}
  for (const name of NAMES.slice(0, n)) { const uid = `u-${name.toLowerCase()}`; await join(db, { uid, nightId, name }); uids[name.toLowerCase()] = uid }
  return { db, nightId, uids, now }
}
const session = (db, uid) => db.store.get(`sessions/${uid}`)
const cardsOf = (db, uid, kind) => (session(db, uid).cards ?? []).filter(c => c.kind === kind)
const host = (db, nightId, command, now, arg) => hostCommand(db, { nightId, command, arg, now })
const uidOf = (db, nightId, key) => db.store.get(`nights/${nightId}/private/deck`).uids[key]

// Start Act 4 at the end of supper, deal the group cards, and start round 1.
async function intoRounds(db, nightId, now) {
  await host(db, nightId, 'act', now, 3)
  await host(db, nightId, 'start-act4', now)
  await host(db, nightId, 'next', now) // the group cards
  await host(db, nightId, 'next', now) // round 1
  return readRotation(db, nightId)
}

test('G20 Start Act 4: the two-minute warning on every phone, then the group card by portrait and character with Locked in', async () => {
  const { db, nightId, uids, now } = await party(6)
  await host(db, nightId, 'act', now, 2)
  await assert.rejects(host(db, nightId, 'start-act4', now), /end of supper/)
  await host(db, nightId, 'act', now, 3)
  await host(db, nightId, 'start-act4', now)
  const pub = db.store.get(act4Path(nightId))
  assert.equal(pub.phase, 'warn')
  assert.equal(ms(pub.warnEndsAt) - now, 2 * 60_000)
  for (const uid of Object.values(uids)) {
    const warn = cardsOf(db, uid, 'notice').at(-1)
    assert.equal(warn.text, ACT4_TEXT.warn.text)
    assert.equal(cardsOf(db, uid, 'group').length, 0, 'nobody sees the groups during the warning')
  }
  await host(db, nightId, 'next', now) // the group cards (the clock does it at two minutes)
  const roster = db.store.get(`nights/${nightId}`).roster
  for (const [key, uid] of Object.entries(uids)) {
    const [card] = cardsOf(db, uid, 'group')
    assert.ok(card, `${key} has a group card`)
    assert.equal(card.lockIn, true)
    const others = card.members.filter(m => m.key !== key)
    assert.equal(card.title, `You're teamed up with ${others.map(m => characterById(roster[m.key].characterId).name).join(' and ')}`)
    assert.equal(card.text, 'From now on, only share with your group.')
    for (const m of card.members) assert.ok(m.name && m.characterName && m.characterId, 'each member with a portrait, a character and a name')
  }
  // Locked in: a name on the public doc, never anything else; the last one starts the round
  const keys = Object.keys(uids)
  for (const k of keys.slice(0, -1)) await player.lockIn(db, { nightId, uid: uids[k], now })
  assert.equal(db.store.get(`nights/${nightId}`).beat, 'groups')
  assert.deepEqual(Object.keys(db.store.get(act4Path(nightId)).locked).sort(), keys.slice(0, -1).sort())
  await player.lockIn(db, { nightId, uid: uids[keys.at(-1)], now })
  assert.equal(db.store.get(`nights/${nightId}`).beat, 'round1')
})

test('G47 every group visits each of the four rooms once, a room never holds two groups; the directions are the handoff\'s lines', async () => {
  for (const n of [4, 6, 9, 10]) {
    const { db, nightId, uids, now } = await party(n)
    const rot = await intoRounds(db, nightId, now)
    assert.equal(rot.rounds, Math.max(4, rot.groups.length))
    const visits = Object.fromEntries(rot.groups.map(g => [g.id, []]))
    for (let r = 1; r <= rot.rounds; r++) {
      const here = {}
      for (const g of rot.groups) {
        const room = roomFor(rot, g.id, r)
        visits[g.id].push(room)
        if (room !== PARLOUR) { assert.ok(!here[room], `${n} players round ${r}: one group in ${room}`); here[room] = g.id }
        for (const m of g.members) {
          const step = session(db, uidOf(db, nightId, m.key)).act4
          assert.equal(step.room, room, 'every phone says where its group goes')
          assert.equal(step.round, r)
          if (room === PARLOUR) assert.ok(step.text.startsWith(DIRECTIONS.parlour) && FREE_TIME_TIPS.some(t => step.text.endsWith(t)), 'the Parlour, with a tip')
          else {
            assert.equal(step.text, DIRECTIONS[room])
            assert.equal(step.arrive, ACT4_TEXT.arrive)
          }
          if (r > 1) assert.equal(step.chime, ACT4_TEXT.chime)
        }
      }
      if (r < rot.rounds) await host(db, nightId, 'next', now)
    }
    for (const g of rot.groups) assert.deepEqual(visits[g.id].filter(x => x !== PARLOUR).sort(), [...ROOM_KEYS].sort(), `${n} players: every room once`)
    assert.ok(Object.keys(uids).length === n)
  }
})

test('the Parlour tip: one of the five, the same for the whole group, from the case\'s secret salt', () => {
  const c = rehearsalCase({ nightId: 'n1', roster: [{ key: 'a' }, { key: 'b' }] })
  const c2 = { ...c, screenSalt: 'f'.repeat(32) }
  const seen = new Set()
  for (let g = 0; g < 60; g++) {
    const tip = parlourTip(c, `g${g}`, 1, 'n1')
    assert.ok(FREE_TIME_TIPS.includes(tip))
    assert.equal(parlourTip(c, `g${g}`, 1, 'n1'), tip, 'the same every time for the group')
    seen.add(tip)
  }
  assert.equal(seen.size, 5, 'every tip turns up across groups')
  assert.ok(Array.from({ length: 30 }, (_, g) => parlourTip(c, `g${g}`, 1) !== parlourTip(c2, `g${g}`, 1)).some(Boolean), 'another salt, other tips')
})

test('scanning in: only the group due in that room this round; anyone else is told kindly where to go', async () => {
  const { db, nightId, now } = await party(8)
  const rot = await intoRounds(db, nightId, now)
  const g = rot.groups[0]
  const mine = roomFor(rot, g.id, 1)
  const uid = uidOf(db, nightId, g.members[0].key)
  const wrong = ROOM_KEYS.find(k => k !== mine)
  await assert.rejects(player.meetCat(db, { nightId, uid, cat: ROOMS[wrong].cat, now }), /Not this room/)
  if (mine !== PARLOUR) {
    const r = await player.meetCat(db, { nightId, uid, cat: ROOMS[mine].cat, now })
    assert.equal(r.room, mine)
    for (const m of g.members) assert.equal(session(db, uidOf(db, nightId, m.key)).act4.here, true, 'the whole group turns to the room\'s game')
  }
})

test('G52 every room pays at the chime even if the group never finished; on a party night with the cross-off and a filled bag hint about the Ghost (G51)', async () => {
  const { db, nightId, now } = await party(10, { partyNight: true })
  const rot = await intoRounds(db, nightId, now)
  for (let r = 1; r <= rot.rounds; r++) await host(db, nightId, 'next', now)
  assert.equal(db.store.get(`nights/${nightId}`).act, 5, 'past the last round, Act 5')
  const c = db.store.get(`cases/${nightId}`)
  for (const g of rot.groups) {
    for (const m of g.members) {
      const rooms = cardsOf(db, uidOf(db, nightId, m.key), 'clue').filter(x => x.room)
      assert.deepEqual(rooms.map(x => x.room).sort(), [...ROOM_KEYS].sort(), 'all four rooms paid')
      for (const x of rooms) {
        assert.equal(x.placeholder, false)
        assert.ok(x.bag.text && !/___|\[sense/.test(x.bag.text), `a filled bag hint (${x.room}: ${x.bag.text.length})`)
        assert.equal(x.catName.length > 0, true)
        if (x.room === 'library' || x.room === 'entryway') {
          assert.ok(MOTIVES.some(mm => mm.n === x.cross), 'one wrong motive crossed off')
          assert.notEqual(x.cross, c.motive, 'never the real one (G51)')
          assert.ok(x.text.includes(MOTIVES.find(mm => mm.n === x.cross).rhyme), 'the cat names the rhyme')
        }
      }
    }
    assert.notEqual(c.solving.memory[g.id], c.solving.boo[g.id], 'never the same motive twice for one group (G51)')
    for (const cat of ['granolia', 'zimothy', 'salem', 'boo']) assert.ok(c.bagClues.act4[g.id][cat], 'the case records what each bag hint named')
  }
  // everyone back in the Parlour
  for (const g of rot.groups) for (const m of g.members) assert.equal(session(db, uidOf(db, nightId, m.key)).act4.over, true)
})

test('G48 Boo speaks to every group in Act 4 at any affection, and every room\'s bag hint is about the Ghost', async () => {
  const { db, nightId, now } = await party(8, { partyNight: true })
  // everyone cold with Boo: in Act 2 she would say nothing about a bag; in Act 4 she talks anyway
  for (const uid of Object.values(db.store.get(`nights/${nightId}/private/deck`).uids)) db.store.set(`sessions/${uid}`, { ...db.store.get(`sessions/${uid}`), affection: { ...db.store.get(`sessions/${uid}`).affection, boo: 1 } })
  const rot = await intoRounds(db, nightId, now)
  for (let r = 1; r <= rot.rounds; r++) await host(db, nightId, 'next', now)
  for (const g of rot.groups) {
    const boo = cardsOf(db, uidOf(db, nightId, g.members[0].key), 'clue').find(x => x.room === 'entryway')
    assert.ok(boo.bag.text.length > 20 && !/says nothing/i.test(boo.bag.text), 'Boo speaks')
    assert.ok(/screamed|scream/.test(boo.bag.text), 'about the one who screamed: the Ghost')
  }
})

test('F28 a rehearsal: the rooms pay bracketed stand-ins for the cross-off and the bag hint, never a motive', async () => {
  const { db, nightId, now } = await party(6)
  const rot = await intoRounds(db, nightId, now)
  for (let r = 1; r <= rot.rounds; r++) await host(db, nightId, 'next', now)
  for (const g of rot.groups) {
    for (const x of cardsOf(db, uidOf(db, nightId, g.members[0].key), 'clue').filter(y => y.room)) {
      assert.equal(x.placeholder, true)
      assert.equal(x.cross, undefined)
      assert.match(x.bag.text, /bag clue about the Ghost appears here\]$/)
      if (x.room === 'library' || x.room === 'entryway') assert.match(x.text, /cross-off appears here/)
    }
  }
})

test('Salem\'s Motion Game: red means go, green means freeze; a slip restarts the round; thirty seconds clean passes; three rounds pay Salem', async () => {
  // the schedule: alternating colours, faster each round, past the clean mark
  let pick = 0
  const rng = n => (pick++ * 7) % n
  for (const round of [1, 2, 3]) {
    const flips = salemFlips(round, 10_000, rng)
    assert.ok(ms(flips.at(-1).at) >= 10_000 + SALEM_CLEAN_MS - 7000, 'the colours run past the clean mark')
    for (let i = 1; i < flips.length; i++) assert.notEqual(flips[i].colour, flips[i - 1].colour, 'alternating')
  }
  const gap = round => { const f = salemFlips(round, 0, () => 0); return ms(f[1].at) - ms(f[0].at) }
  assert.ok(gap(1) > gap(2) && gap(2) > gap(3), 'faster each round')
  // through the dealer
  const { db, nightId, now } = await party(8)
  const rot = await intoRounds(db, nightId, now)
  let r = 1
  while (!db.store.get(salemPath(nightId)).groupId && r < rot.rounds) { await host(db, nightId, 'next', now); r++ }
  const doc = () => db.store.get(salemPath(nightId))
  const gid = doc().groupId
  const g = rot.groups.find(x => x.id === gid)
  const uid = uidOf(db, nightId, g.members[0].key)
  assert.equal(doc().state, 'idle', 'nothing until the group scans in')
  await player.meetCat(db, { nightId, uid, cat: 'salem', now })
  assert.equal(doc().state, 'intro')
  let t = now
  for (let round = 1; round <= SALEM_ROUNDS; round++) {
    await player.salemReady(db, { nightId, uid, now: t })
    assert.equal(doc().state, 'playing')
    assert.equal(doc().round, round)
    assert.equal(ms(doc().startsAt) - t, SALEM_LEAD_MS)
    const attempt = doc().attempt
    // a slip: the whole group starts the round again
    t = ms(doc().startsAt) + 5000
    assert.ok(['red', 'green'].includes(salemColourAt(doc(), t)))
    await player.salemSlip(db, { nightId, uid, attempt, colour: 'green', now: t })
    assert.equal(doc().attempt, attempt + 1)
    // a second phone's slip of the same moment changes nothing
    await player.salemSlip(db, { nightId, uid: uidOf(db, nightId, g.members[1].key), attempt, now: t })
    assert.equal(doc().attempt, attempt + 1)
    await assert.rejects(player.salemPassed(db, { nightId, uid, attempt: attempt + 1, now: t + 10_000 }), /Not yet/)
    t = ms(doc().cleanAt)
    await player.salemPassed(db, { nightId, uid, attempt: attempt + 1, now: t })
    assert.equal(doc().state, round === SALEM_ROUNDS ? 'cleared' : 'passed')
  }
  for (const m of g.members) {
    const card = cardsOf(db, uidOf(db, nightId, m.key), 'clue').find(x => x.room === 'orangerie')
    assert.ok(card, 'cleared: Salem pays at once')
    assert.match(card.text, /follow instructions/)
    assert.equal(session(db, uidOf(db, nightId, m.key)).act4.paid, true, 'the group goes back to the Parlour until the chime')
  }
})

test('Boo\'s catwalk: the show is laid out with timestamps at the scan, three poses, five-second holds, a judging line each; Boo pays when it is over', async () => {
  let k = 0
  const show = booShow(1000, n => (k++ * 3) % n)
  assert.equal(show.poses.length, BOO_POSES)
  for (const p of show.poses) {
    assert.equal(ms(p.holdUntil) - ms(p.poseAt), 5000)
    assert.ok(BOO_JUDGING.includes(p.line))
  }
  assert.ok(ms(show.endsAt) - 1000 < ROUND_MS, 'the show fits in the round')
  const { db, nightId, now } = await party(8)
  const rot = await intoRounds(db, nightId, now)
  let r = 1
  while (!db.store.get(booPath(nightId)).groupId && r < rot.rounds) { await host(db, nightId, 'next', now); r++ }
  const doc = () => db.store.get(booPath(nightId))
  const g = rot.groups.find(x => x.id === doc().groupId)
  const uid = uidOf(db, nightId, g.members[0].key)
  await player.meetCat(db, { nightId, uid, cat: 'boo', now })
  assert.equal(doc().state, 'show')
  assert.equal((await player.booDone(db, { nightId, now: now + 1000 })).notYet, true, 'not before the show is over')
  await player.booDone(db, { nightId, now: ms(doc().endsAt) })
  assert.equal(doc().state, 'done')
  assert.ok(cardsOf(db, uid, 'clue').some(x => x.room === 'entryway'))
})

test('G25b and F08 Act 4 Parlour Games wait on the phone: never on the night doc, played when free, and the rest answered at random when Act 4 ends', async () => {
  const { db, nightId, uids, now } = await party(6)
  await intoRounds(db, nightId, now)
  const sched = db.store.get(`nights/${nightId}/private/parlour`)
  assert.equal(sched.act, 4)
  let t = ms(sched.due0)
  await host(db, nightId, 'tick', t)
  assert.ok(!db.store.get(`nights/${nightId}`).window || db.store.get(`nights/${nightId}`).window.settled, 'nothing on the night doc')
  const id = 'questions-4-p0'
  for (const uid of Object.values(uids)) {
    const w = session(db, uid).windows[id]
    assert.equal(w.waiting, true)
    assert.equal(w.beats.length, 3)
  }
  // one guest plays it when free; it counts once
  const uid = Object.values(uids)[0]
  const set = session(db, uid).windows[id]
  assert.equal((await player.answer(db, { nightId, uid, windowId: id, picks: set.beats.map(b => b.choices[1].k), now: t + 600_000 })).ok, true)
  assert.equal((await player.answer(db, { nightId, uid, windowId: id, picks: set.beats.map(b => b.choices[0].k), now: t + 600_001 })).already, true)
  // the host's own button deals another waiting game
  const lit = await host(db, nightId, 'light-up', t)
  assert.equal(lit.waiting, true)
  // Act 5: every waiting game nobody played gets a random answer
  await host(db, nightId, 'act', t, 5)
  for (const u of Object.values(uids)) {
    for (const [wid, w] of Object.entries(session(db, u).windows)) if (w.waiting) assert.ok(session(db, u).answers[wid], 'answered, by the guest or at random')
  }
  assert.equal(session(db, uid).answers[id].defaulted, false)
  assert.equal(Object.values(uids).filter(u => session(db, u).answers[id].defaulted).length, Object.keys(uids).length - 1)
})

test('L07 the memory board and the rooms\' public docs carry no name, no role, no motive', async () => {
  const { db, nightId, now } = await party(8)
  const rot = await intoRounds(db, nightId, now)
  for (let r = 1; r <= rot.rounds; r++) {
    const text = JSON.stringify([db.store.get(memoryPath(nightId)), db.store.get(salemPath(nightId)), db.store.get(booPath(nightId)), db.store.get(act4Path(nightId))])
    assert.ok(!/"(murderer|ghost|motive|role|cross|family|bag)"/.test(text))
    for (const g of rot.groups) for (const m of g.members) assert.ok(!text.includes(m.name))
    await host(db, nightId, 'next', now)
  }
})

test('Act 2: the night doc counts the guests who have seen all four cats, and nothing else', async () => {
  assert.deepEqual(lightsProgressOf({ guests: { a: { step: 'done' }, b: { step: 'with' }, c: { step: 'wait' } } }), { done: 1, total: 3 })
  assert.deepEqual(lightsProgressOf(null), { done: 0, total: 0 })
  const { db, nightId } = await party(5)
  await hostCommand(db, { nightId, command: 'act', arg: 2, now: 1_000_000 })
  await hostCommand(db, { nightId, command: 'beat', arg: 'cat', now: 1_000_000 })
  const night = () => db.store.get(`nights/${nightId}`)
  assert.deepEqual(night().lightsProgress, { done: 0, total: 5 }, 'written when the line is made')
  const seen = []
  await walkLights(db, nightId, { check: () => seen.push({ ...night().lightsProgress }) })
  assert.deepEqual(night().lightsProgress, { done: 5, total: 5 })
  for (let i = 1; i < seen.length; i++) assert.ok(seen[i].done >= seen[i - 1].done, 'it only ever climbs')
  assert.deepEqual(Object.keys(night().lightsProgress).sort(), ['done', 'total'], 'a count only: never which cat or which hint')
  const state = db.store.get(lightsPath(nightId))
  assert.equal(night().lightsProgress.done, Object.values(state.guests).filter(g => g.step === 'done').length)
})

// ---- F12 and F26 --------------------------------------------------------------

test('F12 puzzles appear on the chime, not on arrival: every room\'s game is set for its group when the round starts, and the ten minutes run from the chime', async () => {
  const { db, nightId, uids, now } = await party(8)
  // before the chime nobody can start a room: the group cards are out, the rounds are not
  await host(db, nightId, 'act', now, 3)
  await host(db, nightId, 'start-act4', now)
  await host(db, nightId, 'next', now) // the group cards
  await assert.rejects(player.meetCat(db, { nightId, uid: uids.jessa, cat: 'zimothy', now }), /Not yet/, 'F12 a scan before the chime is turned away')
  // the chime: round 1
  const chime = now + 60_000
  await host(db, nightId, 'next', chime)
  const rot = await readRotation(db, nightId)
  const rooms = () => ({
    library: db.store.get(memoryPath(nightId)), orangerie: db.store.get(salemPath(nightId)),
    entryway: db.store.get(booPath(nightId)), study: db.store.get(`nights/${nightId}/public/study`),
  })
  const atChime = rooms()
  for (const room of ROOM_KEYS) {
    const due = rot.order.find(gid => roomFor(rot, gid, 1) === room) ?? null
    assert.equal(atChime[room].groupId, due, `F12 the ${room} is set for its round-1 group at the chime`)
  }
  assert.ok(atChime.library.boardId && Object.keys(atChime.library.boards).length === 3, 'F12 the memory match is laid out at the chime')
  for (const room of ['library', 'orangerie', 'entryway']) assert.equal(ms(atChime[room].at), chime, `F12 the ${room} was set at the chime`)
  const pub = db.store.get(act4Path(nightId))
  assert.equal(ms(pub.roundStartsAt), chime)
  assert.equal(ms(pub.roundEndsAt), chime + ROUND_MS, 'F12 ten minutes from the chime, for every room')
  assert.equal(ms(atChime.study.slotEndsAt), chime + ROUND_MS, 'the study\'s ten minutes too')
  // a group that arrives late does not get a fresh puzzle or a longer clock
  const libraryGroup = rot.groups.find(g => g.id === atChime.library.groupId)
  const late = chime + 4 * 60_000
  await player.meetCat(db, { nightId, uid: uidOf(db, nightId, libraryGroup.members[0].key), cat: 'zimothy', now: late })
  assert.equal(db.store.get(memoryPath(nightId)).boardId, atChime.library.boardId, 'F12 arriving does not deal the board again')
  assert.deepEqual(db.store.get(memoryPath(nightId)).boards, atChime.library.boards)
  assert.equal(ms(db.store.get(act4Path(nightId)).roundEndsAt), chime + ROUND_MS, 'F12 arriving does not move the clock')
  // the next chime moves every room on to its round-2 group
  const chime2 = chime + ROUND_MS
  await host(db, nightId, 'next', chime2)
  const atChime2 = rooms()
  for (const room of ROOM_KEYS) assert.equal(atChime2[room].groupId, rot.order.find(gid => roomFor(rot, gid, 2) === room) ?? null, `F12 the ${room} is set for its round-2 group at the second chime`)
})

test('F26 Salem\'s colours: the whole round\'s schedule is written once, three seconds before the first change, on the server\'s clock; every phone reads the same', async () => {
  const { db, nightId, now } = await party(8)
  const rot = await intoRounds(db, nightId, now)
  let r = 1
  while (!db.store.get(salemPath(nightId)).groupId && r < rot.rounds) { await host(db, nightId, 'next', now); r++ }
  const doc = () => db.store.get(salemPath(nightId))
  const g = rot.groups.find(x => x.id === doc().groupId)
  const [a, b] = g.members.map(m => uidOf(db, nightId, m.key))
  await player.meetCat(db, { nightId, uid: a, cat: 'salem', now })
  const readyAt = now + 5_000
  await player.salemReady(db, { nightId, uid: a, now: readyAt })
  const d = doc()
  assert.equal(ms(d.startsAt), readyAt + SALEM_LEAD_MS, 'F26 three seconds of lead before the first colour')
  assert.equal(SALEM_LEAD_MS, 3_000)
  assert.ok(d.flips.length >= 4, 'the whole round\'s colours at once')
  assert.equal(ms(d.flips[0].at), ms(d.startsAt), 'the first colour at the start')
  for (let i = 1; i < d.flips.length; i++) assert.ok(ms(d.flips[i].at) > ms(d.flips[i - 1].at), 'every change at its own later time')
  assert.ok(ms(d.flips.at(-1).at) >= ms(d.cleanAt) - 7_000, 'the colours run to the clean mark')
  // a second Ready from another phone changes nothing: one schedule for the whole group
  await player.salemReady(db, { nightId, uid: b, now: readyAt + 500 })
  assert.deepEqual(doc().flips, d.flips, 'F26 the schedule is written once')
  // any phone, any moment: the colour is a function of the schedule and the server time alone
  for (const f of d.flips) {
    assert.equal(salemColourAt(doc(), ms(f.at)), f.colour)
    assert.equal(salemColourAt(structuredClone(doc()), ms(f.at) + 499), salemColourAt(doc(), ms(f.at) + 499), 'two phones agree')
  }
})

// ---- the just-for-fun winners (Jon, 28 Oct 2026; built 29 Oct) ----------------
// The counts the Library's and the Orangerie's screens name a winner from
// (play/src/lib/rooms.js mostPairs, fewestSlips), by place in the group: the
// public docs carry numbers, never a name (L07), and nothing else changes.

const pairsOf = cards => Object.values(cards.reduce((at, t, i) => { (at[t] ??= []).push(i); return at }, {}))

test('G57 In Duplicate\'s just-for-fun winner: each board\'s pairs add up by the place of whoever found them; an odd count counts nothing and never refuses a board; the reward is the same', async () => {
  // the count alone
  assert.deepEqual(addPairsBy(undefined, [0, 1, 0], 3), [2, 1])
  assert.deepEqual(addPairsBy([2, 1], [2, 2], 2), [2, 1, 2], 'a third player joins the count')
  assert.equal(addPairsBy([2, 1], [0, 1], 3), null, 'one place per pair, or nothing')
  for (const odd of [[0, -1, 1], [0, 1.5, 1], [0, PLACES_MAX, 1], [0, '1', 1], null, '0,1,1', { 0: 1 }]) assert.equal(addPairsBy([2, 1], odd, 3), null, JSON.stringify(odd))
  // through the dealer: the Library's group plays its three boards
  const { db, nightId, now } = await party(9)
  const rot = await intoRounds(db, nightId, now)
  let r = 1
  while (!db.store.get(memoryPath(nightId)).groupId && r < rot.rounds) { await host(db, nightId, 'next', now); r++ }
  const doc = () => db.store.get(memoryPath(nightId))
  const g = rot.groups.find(x => x.id === doc().groupId)
  const clear = async by => {
    const d = doc()
    const pairs = pairsOf(d.boards[String(d.step)])
    return player.memoryStep(db, { nightId, boardId: d.boardId, step: d.step, pairs, by: typeof by === 'function' ? by(pairs.length) : by, now })
  }
  // the first board (6 pairs): the first player finds five, the second the last one
  await clear(n => Array.from({ length: n }, (_, i) => (i < n - 1 ? 0 : 1)))
  assert.equal(doc().step, 1)
  assert.deepEqual(doc().pairsBy, [5, 1])
  // the second (10 pairs) with a count that makes no sense: the board still moves on, the count stands
  await clear([0, 1])
  assert.equal(doc().step, 2, 'never refused for the count')
  assert.deepEqual(doc().pairsBy, [5, 1])
  // the third (14 pairs) round the group: it clears and pays as ever
  const r3 = await clear(n => Array.from({ length: n }, (_, i) => i % g.members.length))
  assert.equal(r3.cleared, true)
  assert.equal(doc().cleared, true)
  const third = Array.from({ length: g.members.length }, (_, p) => Array.from({ length: 14 }, (_, i) => i % g.members.length).filter(x => x === p).length)
  assert.deepEqual(doc().pairsBy, third.map((n, p) => n + ([5, 1][p] ?? 0)))
  assert.equal(doc().pairsBy.reduce((a, b) => a + b, 0), 6 + 14, 'every pair counted once, the odd board none')
  for (const m of g.members) {
    const card = cardsOf(db, uidOf(db, nightId, m.key), 'clue').find(x => x.room === 'library')
    assert.ok(card && !/most pairs|winner/i.test(JSON.stringify(card)), 'the same reward for the whole group, no word of a winner')
  }
  // L07: numbers by place, never a name
  const text = JSON.stringify(doc())
  for (const grp of rot.groups) for (const m of grp.members) assert.ok(!text.includes(m.name), 'no name on the memory doc')
  // a board sent with no count at all (an older screen) still clears
  assert.deepEqual(addPairsBy([3], undefined, 6), null)
})

test('G58 Get Off My Lawn!\'s just-for-fun winner: each slip counts against the phone that sent it, by place; every phone that can feel a shake says so as the clean mark passes, first or not; nothing else changes', async () => {
  // the counts alone
  assert.deepEqual(plusOne(undefined, 2), [0, 0, 1])
  assert.deepEqual(plusOne([1, 'x'], 0), [2, 0])
  for (const p of [-1, 1.5, PLACES_MAX, '0', null]) assert.equal(plusOne([1], p), null)
  assert.deepEqual(markAt(undefined, 1), [false, true])
  assert.deepEqual(markAt([true, 'yes'], 0), [true, false])
  assert.equal(markAt([true], -1), null)
  // through the dealer
  const { db, nightId, now } = await party(8)
  const rot = await intoRounds(db, nightId, now)
  let r = 1
  while (!db.store.get(salemPath(nightId)).groupId && r < rot.rounds) { await host(db, nightId, 'next', now); r++ }
  const doc = () => db.store.get(salemPath(nightId))
  const g = rot.groups.find(x => x.id === doc().groupId)
  const [a, b] = g.members.map(m => uidOf(db, nightId, m.key)) // places 0 and 1
  const other = rot.groups.find(x => x.id !== g.id).members.map(m => uidOf(db, nightId, m.key))[0]
  await player.meetCat(db, { nightId, uid: a, cat: 'salem', now })
  let t = now
  const round = async ({ slipper = null, colour = 'green', passer, others = [] }) => {
    await player.salemReady(db, { nightId, uid: a, now: t })
    let attempt = doc().attempt
    if (slipper) {
      t = ms(doc().startsAt) + 5000
      await player.salemSlip(db, { nightId, uid: slipper, attempt, colour, now: t })
      // the other phone's slip of the same moment is stale: it restarts nothing and counts nothing
      await player.salemSlip(db, { nightId, uid: slipper === a ? b : a, attempt, colour, now: t })
      attempt = doc().attempt
    }
    t = ms(doc().cleanAt)
    await player.salemPassed(db, { nightId, uid: passer, attempt, felt: true, now: t })
    // the rest say so too, after the first: the round is already passed, the mark still counts
    for (const [uid, felt] of others) await player.salemPassed(db, { nightId, uid, attempt, felt, now: t + 200 })
  }
  // round 1: the second phone slips on green; the first passes it, the second says it felt a shake too
  await round({ slipper: b, passer: a, others: [[b, true]] })
  assert.equal(doc().state, 'passed')
  assert.deepEqual(doc().slipsBy, [0, 1], 'the slip counts against the phone that sent it, by place')
  assert.equal(doc().slips, 1, 'the round\'s own count, as before')
  assert.deepEqual(doc().feltBy, [true, true])
  // round 2: no slips; a phone that cannot feel a shake changes nothing, nor does another group's phone
  await round({ passer: b, others: [[a, false], [other, true]] })
  assert.deepEqual(doc().slipsBy, [0, 1], 'kept across the rounds')
  assert.equal(doc().slips, 0, 'the round\'s count starts again')
  assert.deepEqual(doc().feltBy, [true, true])
  // round 3: the first phone freezes on red; then the game is cleared and Salem pays as ever
  await round({ slipper: a, colour: 'red', passer: b })
  assert.equal(doc().state, 'cleared')
  assert.deepEqual(doc().slipsBy, [1, 1])
  for (const m of g.members) {
    const card = cardsOf(db, uidOf(db, nightId, m.key), 'clue').find(x => x.room === 'orangerie')
    assert.ok(card && /follow instructions/.test(card.text) && !/fewest|winner/i.test(JSON.stringify(card)), 'the same reward, no word of a winner')
  }
  // L07: numbers by place, never a name or a guest
  const text = JSON.stringify(doc())
  for (const grp of rot.groups) for (const m of grp.members) assert.ok(!text.includes(m.name) && !text.includes(`"${m.key}"`), 'no name on Salem\'s doc')
  // a fresh group starts with no counts
  await host(db, nightId, 'next', t)
  assert.ok(!doc().slipsBy && !doc().feltBy, 'the next group\'s doc is new')
})
