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

test('Start Act 4: the two-minute warning on every phone, then the group card by portrait and character with Locked in', async () => {
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

test('a rehearsal: the rooms pay bracketed stand-ins for the cross-off and the bag hint, never a motive', async () => {
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

test('Act 4 Parlour Games wait on the phone: never on the night doc, played when free, and the rest answered at random when Act 4 ends', async () => {
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

test('the memory board and the rooms\' public docs carry no name, no role, no motive', async () => {
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
