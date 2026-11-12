import { test } from 'node:test'
import assert from 'node:assert/strict'
import { FakeFirestore } from './fake-firestore.mjs'
import { createNight, join, seatFillIn, nameKey, CHARACTERS } from '../lib/night.js'
import { hostCommand, player, startEvening } from '../lib/run.js'
import { PARTY_DAY } from '../lib/morning.js'
import { lightsPath, planWaves, LIGHTS_CATS } from '../lib/deal.js'
import { makeRooms, readRotation, fillNightGroups, FILL_NIGHT_GROUPS, MAX_GROUPS, ROOM_KEYS, act4Path, act4PrivatePath, memoryPath, salemPath, booPath, roundsFor, groupIn } from '../lib/act4.js'
import { makeGroups, studyPath } from '../lib/station.js'
import { start as startRelay, turnOrder, relayPaths } from '../lib/relay.js'
import { seededPick } from '../lib/seed.js'
import { FILL_IN_NAMES, MAX_FILL_INS, fillInCount, seatFillIns, fillInSeats } from '../lib/fillins.js'
import { fillInUid, isFillInUid, isFillIn, hasFillIns, fillInKeys, realKeys, seatsToWaitFor, drawerKeys, lineGuests } from '../lib/seats.js'

// Fill-in players (the polish pass, job A4, 11 Nov 2026): seats with no
// phone on a practice night. Every night here is a throwaway rehearsal in a
// fake Firestore, made and dropped in the test. Assertions are about keys,
// counts and flags, never about what a seat was dealt.

const T0 = Date.parse('2026-11-12T23:00:00Z') // the practice evening: before the party day, whatever today is
const nightOf = (db, id) => db.store.get(`nights/${id}`)
const sessionOf = (db, uid) => db.store.get(`sessions/${uid}`)
const deckOf = (db, id) => db.store.get(`nights/${id}/private/deck`)
const flagged = n => Object.entries(n.roster ?? {}).filter(([, r]) => r.fillIn === true).map(([k]) => k).sort()
const host = (db, nightId, command, arg, now = T0) => hostCommand(db, { nightId, command, arg, now })

// A practice night from the big Start button, with fill-ins, and the real players' phones joined after.
async function practice({ fillIns = 6, real = ['Jon', 'Sue'], now = T0, meta = {} } = {}) {
  const db = new FakeFirestore()
  db.store.set('meta/game', { host_jonathan: 'Jon', host_susan: 'Susan', ...meta })
  const started = await hostCommand(db, { command: 'create', arg: { real: false, introAt: now + 5 * 60_000, fillIns }, now })
  const uids = {}
  for (const name of real) { const uid = `u-${nameKey(name)}`; await join(db, { uid, nightId: started.nightId, name }); uids[nameKey(name)] = uid }
  return { db, nightId: started.nightId, uids, started }
}

// ---- who the night waits for (lib/seats.js) -----------------------------------

test('seats: with no fill-in on the roster every helper gives back every key, in the same order (the party night)', () => {
  const roster = { jon: { name: 'Jon' }, susan: { name: 'Susan' }, jessa: { name: 'Jessa' }, zed: { name: 'Zed' } }
  const keys = Object.keys(roster)
  assert.equal(hasFillIns(roster), false)
  assert.deepEqual(realKeys(roster), keys)
  assert.deepEqual(seatsToWaitFor(roster), keys)
  assert.deepEqual(drawerKeys(roster), keys)
  assert.deepEqual(fillInKeys(roster), [])
  // a caller's own order (a seeded night sorts its keys) is kept
  const sorted = [...keys].sort()
  assert.deepEqual(drawerKeys(roster, sorted), sorted)
  assert.deepEqual(seatsToWaitFor(roster, sorted), sorted)
  const list = keys.map(key => ({ key, ...roster[key], uid: `u-${key}` }))
  assert.deepEqual(lineGuests(list), list)
  // nothing but the literal flag makes a fill-in
  for (const odd of [{ fillIn: 'true' }, { fillIn: 1 }, { fillin: true }, {}, null, undefined]) assert.equal(isFillIn(odd), false)
  assert.deepEqual(seatsToWaitFor({}), [])
  assert.deepEqual(seatsToWaitFor(undefined), [])
})

test('seats: the real players are who the night waits for; a night of fill-ins only waits for them all', () => {
  const roster = { jon: { name: 'Jon' }, mabel: { name: 'Mabel', fillIn: true }, sue: { name: 'Sue' }, gus: { name: 'Gus', fillIn: true } }
  assert.equal(hasFillIns(roster), true)
  assert.deepEqual(realKeys(roster), ['jon', 'sue'])
  assert.deepEqual(fillInKeys(roster), ['mabel', 'gus'])
  assert.deepEqual(seatsToWaitFor(roster), ['jon', 'sue'])
  assert.deepEqual(drawerKeys(roster), ['jon', 'sue'], 'only real players are called to the paper')
  assert.deepEqual(lineGuests(Object.entries(roster).map(([key, r]) => ({ key, ...r }))).map(g => g.key), ['jon', 'sue'])
  const only = { mabel: { fillIn: true }, gus: { fillIn: true } }
  assert.deepEqual(realKeys(only), [])
  assert.deepEqual(seatsToWaitFor(only), ['mabel', 'gus'])
  assert.deepEqual(drawerKeys(only), ['mabel', 'gus'])
  assert.equal(fillInUid('20261112-ab12', 0), 'fillin-20261112-ab12-1')
  assert.ok(isFillInUid(fillInUid('n', 7)) && !isFillInUid('uid-jon') && !isFillInUid(null))
})

// ---- the seats (lib/fillins.js, night.js seatFillIn) ---------------------------

test('the count from the Start card is 0 to 8, and anything else is nobody', () => {
  assert.equal(MAX_FILL_INS, 8)
  assert.deepEqual(FILL_IN_NAMES.slice(0, 6), ['Mabel', 'Gus', 'Dot', 'Walt', 'Pearl', 'Otis'], 'Jon\'s six, in his order')
  assert.equal(new Set(FILL_IN_NAMES.map(nameKey)).size, 8, 'eight different names')
  for (const [given, want] of [[6, 6], [8, 8], [9, 8], [100, 8], [0, 0], [-1, 0], ['six', 0], [null, 0], [undefined, 0], [NaN, 0], [2.7, 2], ['3', 3], [{}, 0], [Infinity, 0]]) {
    assert.equal(fillInCount(given), want, `${String(given)} gives ${want}`)
  }
})

test('six fill-ins are six real seats: a name, a character from the deck, a bag, a session nobody can sign in to', async () => {
  const { db, nightId, started } = await practice({ fillIns: 6, real: [] })
  assert.equal(started.fillIns, 6, 'the Start button is told how many were seated')
  const n = nightOf(db, nightId)
  assert.equal(n.fillIns, 6)
  assert.deepEqual([n.act, n.beat, n.phase], [1, 'arrive', 'act'], 'seated at Arrivals, before any guest taps a name')
  assert.deepEqual(flagged(n), FILL_IN_NAMES.slice(0, 6).map(nameKey).sort())
  assert.equal(fillInSeats(n), 6)
  const hostChars = new Set(CHARACTERS.filter(c => c.host).map(c => c.id))
  const seats = Object.values(n.roster)
  assert.equal(new Set(seats.map(r => r.characterId)).size, 6, 'six different characters')
  assert.ok(seats.every(r => !hostChars.has(r.characterId)), 'never a Professor')
  assert.equal(new Set(seats.map(r => r.bag)).size, 6, 'six different bags')
  const deck = deckOf(db, nightId)
  for (const [i, name] of FILL_IN_NAMES.slice(0, 6).entries()) {
    const key = nameKey(name)
    assert.equal(deck.uids[key], fillInUid(nightId, i), 'a made-up uid, tied to the night')
    const s = sessionOf(db, deck.uids[key])
    assert.deepEqual([s.status, s.fillIn, s.nightId, s.guestKey, s.host], ['active', true, nightId, key, null])
    assert.equal(s.characterId, n.roster[key].characterId)
    assert.equal(s.affection.irwin, 5, 'affection rolled like any guest\'s')
    assert.deepEqual(Object.keys(n.roster[key]).sort(), ['bag', 'characterId', 'fillIn', 'joinedAt', 'name'])
  }
})

test('nine asks for eight; a second call seats nobody twice and only tops the seats up', async () => {
  const { db, nightId } = await practice({ fillIns: 9, real: [] })
  assert.equal(nightOf(db, nightId).fillIns, 8)
  assert.equal(flagged(nightOf(db, nightId)).length, 8)
  const before = structuredClone(nightOf(db, nightId).roster)
  assert.deepEqual(await seatFillIns(db, nightId, 8, { now: T0 }), { ok: true, seated: 8 })
  assert.deepEqual(await seatFillIns(db, nightId, 3, { now: T0 }), { ok: true, seated: 8 }, 'asking for fewer takes nobody away')
  assert.deepEqual(nightOf(db, nightId).roster, before, 'nothing changed')
  // a top-up: two seated, then six asked for
  const two = await practice({ fillIns: 2, real: [] })
  assert.deepEqual(flagged(nightOf(two.db, two.nightId)), ['gus', 'mabel'])
  assert.equal((await seatFillIns(two.db, two.nightId, 6, { now: T0 })).seated, 6)
  assert.equal(nightOf(two.db, two.nightId).fillIns, 6)
  assert.equal(new Set(Object.values(nightOf(two.db, two.nightId).roster).map(r => r.characterId)).size, 6)
})

test('a fill-in never takes a name a host or a real guest holds, and stops when the characters run out', async () => {
  // a host called Gus: that name is skipped, and the count is still met from the list
  const a = await practice({ fillIns: 6, real: [], meta: { host_jonathan: 'Gus' } })
  assert.deepEqual(flagged(nightOf(a.db, a.nightId)), ['dot', 'hazel', 'mabel', 'otis', 'pearl', 'walt'])
  assert.equal(nightOf(a.db, a.nightId).roster.gus, undefined)
  // a real guest already called Dot: left alone, never flagged
  const db = new FakeFirestore()
  db.store.set('meta/game', { host_jonathan: 'Jon', host_susan: 'Susan' })
  const { nightId } = await createNight(db, { forceRehearsal: true })
  await join(db, { uid: 'u-dot', nightId, name: 'Dot' })
  assert.equal((await seatFillIns(db, nightId, 8, { now: T0 })).seated, 7, 'seven names are left')
  assert.equal(nightOf(db, nightId).roster.dot.fillIn, undefined)
  assert.equal(deckOf(db, nightId).uids.dot, 'u-dot')
  // twelve characters in the deck: with ten real guests in, two fill-ins fit and the rest are not seated
  const full = new FakeFirestore()
  full.store.set('meta/game', { host_jonathan: 'Jon', host_susan: 'Susan' })
  const f = await createNight(full, { forceRehearsal: true })
  for (let i = 1; i <= 10; i++) await join(full, { uid: `u${i}`, nightId: f.nightId, name: `Guest ${i}` })
  assert.equal((await seatFillIns(full, f.nightId, 8, { now: T0 })).seated, 2)
  assert.equal(Object.keys(nightOf(full, f.nightId).roster).length, 12)
})

test('a real phone that types a fill-in\'s name takes the seat: the mark goes, the fill-in is superseded, the character stays', async () => {
  const { db, nightId } = await practice({ fillIns: 6, real: ['Jon'] })
  const was = structuredClone(nightOf(db, nightId).roster.mabel)
  const r = await join(db, { uid: 'u-real-mabel', nightId, name: 'mabel' })
  assert.equal(r.characterId, was.characterId)
  const now = nightOf(db, nightId).roster.mabel
  assert.equal(now.fillIn, undefined, 'a real seat now')
  assert.deepEqual(Object.keys(now).sort(), ['bag', 'characterId', 'joinedAt', 'name'])
  assert.equal(now.bag, was.bag)
  assert.equal(deckOf(db, nightId).uids.mabel, 'u-real-mabel')
  assert.equal(sessionOf(db, fillInUid(nightId, 0)).status, 'superseded')
  assert.equal(sessionOf(db, 'u-real-mabel').fillIn, undefined, 'the phone\'s session is an ordinary one')
  assert.deepEqual(flagged(nightOf(db, nightId)), ['dot', 'gus', 'otis', 'pearl', 'walt'])
  assert.equal(fillInSeats(nightOf(db, nightId)), 5)
})

// ---- the party night is untouched ------------------------------------------------

test('guard 2: the server ignores the number on the real night: the party day\'s real start seats nobody', async () => {
  const db = new FakeFirestore()
  db.store.set('meta/game', { host_jonathan: 'Jon', host_susan: 'Susan' })
  const day = PARTY_DAY + 3 * 60 * 60_000
  const r = await hostCommand(db, { command: 'create', arg: { real: true, introAt: day + 60 * 60_000, fillIns: 6 }, now: day })
  assert.equal(r.ok, true, 'the start is never refused over the number')
  assert.equal(r.fillIns, undefined)
  const n = nightOf(db, r.nightId)
  assert.equal(n.forceRehearsal, false, 'the party night')
  assert.deepEqual(n.roster, {}, 'nobody is seated')
  assert.equal(n.fillIns, undefined, 'and the night carries no count')
  assert.deepEqual(deckOf(db, r.nightId).uids, {})
  assert.equal([...db.store.keys()].filter(k => k.startsWith('sessions/')).length, 0)
})

test('guard 3: nobody is seated on a party night, by the Start card\'s road or any other; nor on the party day', async () => {
  // a party night made the old way (the workshop's party box and a plain create)
  const db = new FakeFirestore()
  db.store.set('meta/game', { host_jonathan: 'Jon', host_susan: 'Susan', party_night: true })
  const { nightId } = await createNight(db)
  assert.deepEqual(await seatFillIns(db, nightId, 6, { now: T0 }), { ok: true, seated: 0, why: 'real-night' })
  await assert.rejects(seatFillIn(db, { uid: fillInUid(nightId, 0), nightId, name: 'Mabel' }), e => e.code === 'closed', 'the door itself refuses a fill-in on a party night')
  assert.deepEqual(nightOf(db, nightId).roster, {})
  assert.equal(nightOf(db, nightId).fillIns, undefined)
  // a night with no rehearsal flag at all is not a practice
  db.store.set(`nights/${nightId}`, { ...nightOf(db, nightId), forceRehearsal: undefined })
  assert.equal((await seatFillIns(db, nightId, 6, { now: T0 })).seated, 0)
  // a practice night on the party day: still nobody
  const p = new FakeFirestore()
  p.store.set('meta/game', { host_jonathan: 'Jon', host_susan: 'Susan' })
  const late = await startEvening(p, { real: false, fillIns: 6, now: PARTY_DAY + 1 })
  assert.equal(late.fillIns, undefined)
  assert.deepEqual(nightOf(p, late.nightId).roster, {})
  // and a fill-in can never be a host
  const q = await practice({ fillIns: 0, real: [] })
  await assert.rejects(seatFillIn(q.db, { uid: fillInUid(q.nightId, 0), nightId: q.nightId, name: 'Jon' }), e => e.code === 'invalid')
})

test('a phone\'s join writes exactly the keys it always has: no fill-in mark on the roster, the session or the night', async () => {
  for (const partyNight of [true, false]) {
    const db = new FakeFirestore()
    db.store.set('meta/game', { host_jonathan: 'Jon', host_susan: 'Susan', ...(partyNight ? { party_night: true } : {}) })
    const { nightId } = await createNight(db)
    for (const name of ['Jon', 'Susan', 'Jessa', 'Mabel']) await join(db, { uid: `u-${name.toLowerCase()}`, nightId, name })
    const n = nightOf(db, nightId)
    for (const [key, entry] of Object.entries(n.roster)) {
      assert.deepEqual(Object.keys(entry).sort(), ['bag', 'characterId', 'joinedAt', 'name'], `${key}: the roster entry`)
      assert.deepEqual(Object.keys(sessionOf(db, deckOf(db, nightId).uids[key])).sort(), ['affection', 'bag', 'characterId', 'guestKey', 'guestName', 'host', 'joinedAt', 'nightId', 'status'], `${key}: the session`)
    }
    assert.equal('fillIns' in n, false)
    assert.equal(hasFillIns(n.roster), false, 'a guest who happens to be called Mabel is a guest')
    assert.equal(Object.values(deckOf(db, nightId).uids).some(isFillInUid), false)
  }
})

test('a practice start with no number, or with nought, is the night it always was', async () => {
  for (const arg of [{ real: false, introAt: T0 + 60_000 }, { real: false, introAt: T0 + 60_000, fillIns: 0 }, { real: false, introAt: T0 + 60_000, fillIns: 'six' }]) {
    const db = new FakeFirestore()
    db.store.set('meta/game', { host_jonathan: 'Jon', host_susan: 'Susan' })
    const r = await hostCommand(db, { command: 'create', arg, now: T0 })
    assert.deepEqual(Object.keys(r).sort(), ['act', 'areas', 'beat', 'introAt', 'lines', 'nightId', 'ok', 'real'], 'the reply is today\'s, key for key')
    assert.deepEqual(nightOf(db, r.nightId).roster, {})
    assert.equal('fillIns' in nightOf(db, r.nightId), false)
  }
})

// With no fill-in seat every changed path must make the draws it always made, in the same order. Each
// reference below is worked out here, from the unchanged pieces (makeGroups, planWaves, turnOrder and a
// plain shuffle), on the same seed streams, and must match what the night wrote.
function shuffledBy(list, pick) {
  const a = [...list]
  for (let i = a.length - 1; i > 0; i--) { const j = pick(i + 1); [a[i], a[j]] = [a[j], a[i]] }
  return a
}

test('no fill-in seat: the Act 4 groups and rooms, the Act 2 line and the drawer order are drawn exactly as before', async () => {
  for (const seed of ['tulip-4471', 'acorn-1000', 'raven-9999']) {
    const db = new FakeFirestore()
    db.store.set('meta/game', { host_jonathan: 'Jon', host_susan: 'Susan' })
    const { nightId } = await createNight(db, { seed })
    for (const name of ['Jon', 'Susan', 'Jessa', 'Jacob', 'Marie', 'Pat', 'Sam']) await join(db, { uid: `u-${name.toLowerCase()}`, nightId, name })
    await host(db, nightId, 'act', 2)
    await host(db, nightId, 'beat', 'cat')
    await makeRooms(db, nightId)
    await startRelay(db, { nightId, now: T0 })
    const n = nightOf(db, nightId)
    assert.equal(hasFillIns(n.roster), false)
    const keys = Object.keys(n.roster).sort()
    const c = db.store.get(`cases/${nightId}`)
    // Act 4: makeGroups, then the walk, then the rooms, on the one 'rooms' stream
    const pick = seededPick(seed, 'rooms')
    const groups = makeGroups(keys, { apart: [c.murderer, c.ghost].filter(Boolean), pickInt: pick, maxGroups: MAX_GROUPS })
    const order = shuffledBy(groups.map((_, i) => `g${i + 1}`), pick)
    const rooms = shuffledBy(ROOM_KEYS, pick)
    const rot = await readRotation(db, nightId)
    assert.deepEqual(rot.groups.map(g => g.members.map(m => m.key)), groups, `${seed}: the groups`)
    assert.deepEqual(rot.order, order, `${seed}: the walk`)
    assert.deepEqual(rot.rooms, rooms, `${seed}: the rooms`)
    assert.ok(rot.groups.every(g => !('fill' in g)), 'no group carries a fill mark')
    assert.deepEqual(Object.keys(rot.groups[0]).sort(), ['id', 'members'], 'a group is the two keys it always was')
    assert.deepEqual(rot.studyOrder, Array.from({ length: roundsFor(order.length) }, (_, r) => groupIn(rot, 'study', r + 1)))
    // Act 2: the line holds every guest, routed by planWaves on the 'waves' stream
    const lights = db.store.get(lightsPath(nightId))
    assert.deepEqual(Object.keys(lights.guests).sort(), keys)
    const { routes } = planWaves(keys, seededPick(seed, 'waves'))
    assert.deepEqual(Object.fromEntries(Object.entries(lights.guests).map(([k, g]) => [k, g.route])), routes, `${seed}: the Act 2 line`)
    // the drawing: a drawer for every turn from every key, on the 'relay-order' stream
    const relay = db.store.get(relayPaths(nightId).priv)
    const turns = relay.grids.reduce((sum, g) => sum + g.order.length, 0)
    assert.deepEqual(relay.order, turnOrder(keys, turns, seededPick(seed, 'relay-order')), `${seed}: the drawer order`)
  }
})

// ---- every gate counts real seats --------------------------------------------------

test('Locked in: the rounds start when the real players are in, with no fill-in locked', async () => {
  const { db, nightId, uids } = await practice()
  await host(db, nightId, 'act', 3)
  await host(db, nightId, 'start-act4')
  await host(db, nightId, 'next') // the group cards
  assert.equal(nightOf(db, nightId).beat, 'groups')
  await player.lockIn(db, { nightId, uid: uids.jon, now: T0 })
  assert.equal(nightOf(db, nightId).beat, 'groups', 'one real player is still to come')
  await player.lockIn(db, { nightId, uid: uids.sue, now: T0 })
  assert.equal(nightOf(db, nightId).beat, 'round1', 'both real players are in: the round starts')
  assert.deepEqual(Object.keys(db.store.get(act4Path(nightId)).locked).sort(), ['jon', 'sue'], 'no fill-in tapped anything')
})

// The real players walk the cat line the way their phones would. Fill-ins have no step: they are not in it.
async function walkCats(db, nightId, now = T0) {
  const deck = deckOf(db, nightId).uids
  let meetings = 0
  for (let guard = 0; guard < 100; guard++) {
    const state = db.store.get(lightsPath(nightId))
    const due = Object.entries(state.guests).filter(([, g]) => g.step === 'go')
    if (!due.length) break
    for (const [key, g] of due) {
      await player.meetCat(db, { nightId, uid: deck[key], cat: g.cat, now })
      await player.leaveCat(db, { nightId, uid: deck[key], now })
      meetings++
    }
  }
  return meetings
}

test('the cat line holds the real players only, and supper comes the moment they have seen all four', async () => {
  const { db, nightId, uids } = await practice()
  await host(db, nightId, 'act', 2)
  await host(db, nightId, 'beat', 'cat')
  const state = db.store.get(lightsPath(nightId))
  assert.deepEqual(Object.keys(state.guests).sort(), ['jon', 'sue'], 'no fill-in is in the line')
  assert.deepEqual(nightOf(db, nightId).lightsProgress, { done: 0, total: 2 }, 'the Host tab counts the real players')
  for (const cat of LIGHTS_CATS) assert.ok(!flagged(nightOf(db, nightId)).includes(state.cats[cat].at), 'no cat is ever waiting for a fill-in')
  // the clock never puts one in either
  await host(db, nightId, 'tick', undefined, T0 + 30_000)
  assert.deepEqual(Object.keys(db.store.get(lightsPath(nightId)).guests).sort(), ['jon', 'sue'])
  assert.equal(await walkCats(db, nightId, T0 + 40_000), 8, 'two players, four cats each')
  assert.equal(nightOf(db, nightId).beat, 'supper', 'supper on its own: nobody waited on a fill-in')
  for (const uid of Object.values(uids)) assert.equal(sessionOf(db, uid).cards.filter(c => c.kind === 'testimony').length, 4)
  // a guest who takes a fill-in's seat while the cats are still receiving is given a route at the next tick
  const again = await practice()
  await host(again.db, again.nightId, 'act', 2)
  await host(again.db, again.nightId, 'beat', 'cat')
  await join(again.db, { uid: 'u-late', nightId: again.nightId, name: 'Walt' })
  await host(again.db, again.nightId, 'tick', undefined, T0 + 30_000)
  assert.deepEqual(Object.keys(again.db.store.get(lightsPath(again.nightId)).guests).sort(), ['jon', 'sue', 'walt'])
})

// ---- Act 4: the real players together, fill-in groups never on a room screen -------

test('fillNightGroups: the real players share one group, the fill-ins take the other walks, four groups at most', () => {
  const rosterOf = (real, fill) => Object.fromEntries([...real.map(k => [k, { name: k }]), ...fill.map(k => [k, { name: k, fillIn: true }])])
  const fills = FILL_IN_NAMES.map(nameKey)
  const check = (real, fill, { groups, realGroups }) => {
    for (let seed = 1; seed <= 40; seed++) {
      const roster = rosterOf(real, fill)
      const keys = Object.keys(roster)
      // the two hidden roles on the first two real players (or two fill-ins): the worst case for "apart"
      const apart = real.length >= 2 ? real.slice(0, 2) : fill.slice(0, 2)
      const made = fillNightGroups(keys, roster, { apart, pick: seededPick(`g-${seed}`, 'rooms') })
      const where = `${real.length} real, ${fill.length} fill-ins, seed ${seed}`
      assert.equal(made.length, groups, `${where}: groups`)
      assert.ok(made.length <= FILL_NIGHT_GROUPS, `${where}: at most four, so no real group sits a round in the Parlour`)
      assert.deepEqual(made.flatMap(g => g.members).sort(), [...keys].sort(), `${where}: every seat in exactly one group`)
      const realOnes = made.filter(g => !g.fill)
      assert.equal(realOnes.length, realGroups, `${where}: real groups`)
      for (const g of made) {
        const kinds = new Set(g.members.map(k => isFillIn(roster[k])))
        assert.equal(kinds.size, 1, `${where}: a group is all real or all fill-in`)
        assert.equal(!!g.fill, isFillIn(roster[g.members[0]]), `${where}: marked fill only when it is`)
      }
      if (real.length && real.length <= 3) assert.deepEqual([...realOnes[0].members].sort(), [...real].sort(), `${where}: the real players are together`)
      if (real.length > 3) assert.ok(!realOnes.some(g => apart.every(k => g.members.includes(k))), `${where}: with four or more, the hidden roles are apart again`)
    }
  }
  check(['jon', 'sue'], fills.slice(0, 6), { groups: 4, realGroups: 1 }) // the practice night: Jon and Susan, and three pairs
  check(['jon', 'sue'], fills, { groups: 4, realGroups: 1 }) // ten seats: still four groups
  check(['jon', 'sue', 'amy'], fills.slice(0, 6), { groups: 4, realGroups: 1 }) // a third real player joins their group
  check(['jon'], fills.slice(0, 6), { groups: 4, realGroups: 1 })
  check(['jon', 'sue'], fills.slice(0, 1), { groups: 2, realGroups: 1 }) // a lone fill-in is a group of its own
  check(['jon', 'sue'], fills.slice(0, 3), { groups: 2, realGroups: 1 })
  check(['a', 'b', 'c', 'd'], fills.slice(0, 4), { groups: 4, realGroups: 2 })
  check(['a', 'b', 'c', 'd', 'e', 'f', 'g'], fills.slice(0, 2), { groups: 4, realGroups: 3 })
  check([], fills.slice(0, 6), { groups: 3, realGroups: 0 })
})

test('G52 on a fill-in night: Jon and Susan share a group even as Murderer and Ghost; no room screen ever names a fill-in group; every room pays every group', async () => {
  const { db, nightId, uids } = await practice({ fillIns: 6 })
  await host(db, nightId, 'act', 3)
  // the worst case for keeping them together: the two real players hold the two hidden roles
  const c = db.store.get(`cases/${nightId}`)
  const roles = Object.fromEntries(Object.keys(c.roles).map(k => [k, 'detective']))
  db.store.set(`cases/${nightId}`, { ...c, murderer: 'jon', ghost: 'sue', roles: { ...roles, jon: 'murderer', sue: 'ghost' } })
  await host(db, nightId, 'start-act4')
  await host(db, nightId, 'next') // the group cards
  const rot = await readRotation(db, nightId)
  assert.equal(rot.groups.length, 4)
  assert.equal(rot.rounds, 4, 'four rounds: nobody waits in the Parlour')
  const mine = rot.groups.find(g => g.members.some(m => m.key === 'jon'))
  assert.deepEqual(mine.members.map(m => m.key).sort(), ['jon', 'sue'], 'the real players walk the rooms together')
  assert.equal(mine.fill, undefined)
  const fillGroups = rot.groups.filter(g => g.fill === true)
  assert.equal(fillGroups.length, 3)
  assert.deepEqual(fillGroups.flatMap(g => g.members.map(m => m.key)).sort(), flagged(nightOf(db, nightId)))
  assert.ok(fillGroups.every(g => g.members.length === 2), 'three pairs')
  // the real players' group card names each other, like any night's
  assert.equal(sessionOf(db, uids.jon).cards.filter(x => x.kind === 'group').length, 1)
  assert.equal(sessionOf(db, uids.jon).group, mine.id)
  for (const uid of Object.values(uids)) await player.lockIn(db, { nightId, uid, now: T0 })
  // four rounds: each room's screen is set for the real group once, and for nobody otherwise
  const seen = { study: [], library: [], orangerie: [], entryway: [] }
  for (let round = 1; round <= 4; round++) {
    assert.equal(nightOf(db, nightId).beat, `round${round}`)
    const docs = {
      study: db.store.get(studyPath(nightId)).groupId, library: db.store.get(memoryPath(nightId)).groupId,
      orangerie: db.store.get(salemPath(nightId)).groupId, entryway: db.store.get(booPath(nightId)).groupId,
    }
    for (const [room, gid] of Object.entries(docs)) {
      assert.ok(gid === null || gid === mine.id, `round ${round}: ${room} names the real group or nobody`)
      seen[room].push(gid)
    }
    assert.equal(Object.values(docs).filter(gid => gid === mine.id).length, 1, `round ${round}: the real group is due in exactly one room`)
    assert.equal(db.store.get(memoryPath(nightId)).boardId === null, docs.library === null, 'a board is laid only for a group that is coming')
    await host(db, nightId, 'next', undefined, T0 + round * 1000)
  }
  for (const room of ROOM_KEYS) assert.equal(seen[room].filter(Boolean).length, 1, `${room}: the real group once in four rounds`)
  assert.equal(nightOf(db, nightId).act, 5)
  // G52: sixteen rewards, four groups by four rooms, the fill-in groups' paid at the chime
  const paid = db.store.get(act4PrivatePath(nightId)).paid
  assert.equal(Object.keys(paid).length, 16)
  const deck = deckOf(db, nightId).uids
  for (const key of flagged(nightOf(db, nightId))) {
    const cards = sessionOf(db, deck[key]).cards
    assert.deepEqual(cards.filter(x => x.kind === 'clue' && x.room).map(x => x.room).sort(), [...ROOM_KEYS].sort(), 'a fill-in seat is dealt every room\'s reward')
    assert.equal(cards.filter(x => x.id?.endsWith('study-clue')).length, 1)
  }
  for (const uid of Object.values(uids)) assert.deepEqual(sessionOf(db, uid).cards.filter(x => x.kind === 'clue' && x.room).map(x => x.room).sort(), [...ROOM_KEYS].sort())
})

test('a guest who takes a fill-in\'s seat brings that group back onto the room screens from the next round', async () => {
  const { db, nightId, uids } = await practice({ fillIns: 6 })
  await host(db, nightId, 'act', 3)
  await host(db, nightId, 'start-act4')
  await host(db, nightId, 'next')
  for (const uid of Object.values(uids)) await player.lockIn(db, { nightId, uid, now: T0 })
  const rot = await readRotation(db, nightId)
  const taken = rot.groups.find(g => g.fill)
  await join(db, { uid: 'u-new', nightId, name: taken.members[0].name })
  await host(db, nightId, 'next', undefined, T0 + 1000) // round 2
  const named = [db.store.get(studyPath(nightId)).groupId, db.store.get(memoryPath(nightId)).groupId, db.store.get(salemPath(nightId)).groupId, db.store.get(booPath(nightId)).groupId].filter(Boolean)
  const real = rot.groups.find(g => !g.fill).id
  const due = ROOM_KEYS.map(room => groupIn(rot, room, 2)).filter(gid => gid === real || gid === taken.id)
  assert.deepEqual([...named].sort(), [...due].sort(), 'the group with a real player in it is on its room\'s screen now')
})

// ---- the drawing calls only real players --------------------------------------------

test('the drawing: only the real players are called to the paper; one real player and six fill-ins can still start', async () => {
  const { db, nightId } = await practice({ fillIns: 6 })
  await host(db, nightId, 'act', 2)
  await startRelay(db, { nightId, now: T0 })
  const order = db.store.get(relayPaths(nightId).priv).order
  assert.ok(order.length > 10)
  assert.deepEqual([...new Set(order)].sort(), ['jon', 'sue'], 'never a fill-in')
  const pub = db.store.get(relayPaths(nightId).pub)
  assert.ok(['jon', 'sue'].includes(pub.nextKey), 'the first one called is a real player')
  const solo = await practice({ fillIns: 6, real: ['Jon'] })
  await host(solo.db, solo.nightId, 'act', 2)
  const r = await startRelay(solo.db, { nightId: solo.nightId, now: T0 })
  assert.equal(r.ok, true, 'the two-people rule counts every seat')
  assert.deepEqual([...new Set(solo.db.store.get(relayPaths(solo.nightId).priv).order)], ['jon'])
})

// ---- the deal treats a fill-in like anyone -------------------------------------------

test('the deal: eight seats, eight role cards, all three roles dealt over all eight keys', async () => {
  const hidden = { real: 0, fill: 0 }
  for (let i = 0; i < 12; i++) {
    const { db, nightId, uids } = await practice({ fillIns: 6 })
    for (let b = 0; b < 4; b++) await host(db, nightId, 'next')
    await hostCommand(db, { nightId, command: 'blackout', now: T0, sleep: () => {} })
    const c = db.store.get(`cases/${nightId}`)
    assert.equal(c.rehearsal, true)
    assert.equal(Object.keys(c.roles).length, 8)
    assert.deepEqual(Object.values(c.roles).sort(), ['detective', 'detective', 'detective', 'detective', 'detective', 'detective', 'ghost', 'murderer'])
    const deck = deckOf(db, nightId).uids
    for (const uid of Object.values(deck)) assert.equal(sessionOf(db, uid).cards.filter(x => x.kind === 'role').length, 1, 'a role card on every seat')
    for (const k of [c.murderer, c.ghost]) hidden[uids[k] ? 'real' : 'fill']++
  }
  assert.ok(hidden.fill > 0, 'a fill-in can be the Murderer or the Ghost: any role, by the same deal')
})
