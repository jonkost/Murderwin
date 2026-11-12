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
import { FILL_IN_NAMES, MAX_FILL_INS, fillInCount, seatFillIns, fillInSeats, stepFillIns, stepLiveFillIns, pauseMs, PAUSES, FILL_IN_PRESENCE, HEARTBEAT_EVERY_MS } from '../lib/fillins.js'
import { fillInUid, isFillInUid, isFillIn, hasFillIns, fillInKeys, realKeys, seatsToWaitFor, drawerKeys, lineGuests } from '../lib/seats.js'
import { payRoom, roomFor, EARLY_CHIME_MS, ROUND_MS, LOCK_MS } from '../lib/act4.js'
import { studyFinished, clockTick } from '../lib/run.js'
import { NIGHT, ms } from '../lib/deal.js'
import { MOTIVES } from '../lib/night.js'
import { fillInNight, PRACTICE_START } from './fill-in-night.mjs'

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

test('guard 2: the server refuses fill-ins on the real night, before anything is made; the real start with none is as ever', async () => {
  const db = new FakeFirestore()
  db.store.set('meta/game', { host_jonathan: 'Jon', host_susan: 'Susan' })
  const day = PARTY_DAY + 3 * 60 * 60_000
  for (const fillIns of [1, 6, 8, '6']) {
    await assert.rejects(hostCommand(db, { command: 'create', arg: { real: true, introAt: day + 60 * 60_000, fillIns }, now: day }), e => e.code === 'invalid' && /practice nights only/.test(e.message), `${fillIns} refused`)
  }
  assert.equal([...db.store.keys()].filter(k => k.startsWith('nights/')).length, 0, 'no night was made')
  const r = await hostCommand(db, { command: 'create', arg: { real: true, introAt: day + 60 * 60_000, fillIns: 0 }, now: day })
  assert.equal(r.ok, true)
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

// ---- the fill-ins play along (lib/fillins.js stepFillIns) ---------------------------
// One pass makes every move whose pause has run out. The tests walk the clock by hand: `now` is the
// only time there is, exactly as the driver on the brain steps it every two seconds.

const fillUids = (db, nightId) => { const d = deckOf(db, nightId).uids; return Object.fromEntries(flagged(nightOf(db, nightId)).map(k => [k, d[k]])) }
function countWrites(db) {
  const n = { writes: 0 }
  for (const m of ['_set', '_update', '_delete']) { const real = db[m].bind(db); db[m] = (...a) => { n.writes++; return real(...a) } }
  return n
}
function recordReads(db) {
  const paths = new Set()
  const get = db._get.bind(db)
  db._get = path => { paths.add(path); return get(path) }
  return paths
}
// A practice night in Act 2, playing (past the role cards).
async function inAct2(opts) {
  const p = await practice(opts)
  await host(p.db, p.nightId, 'act', 2)
  await host(p.db, p.nightId, 'beat', 'cat') // the cat visits: a Parlour Game opens only in its own beats (A5)
  return p
}
// A practice night in Act 4's first round, the real players locked in.
async function intoRounds(opts) {
  const p = await practice(opts)
  await host(p.db, p.nightId, 'act', 3)
  await host(p.db, p.nightId, 'start-act4')
  await host(p.db, p.nightId, 'next') // the group cards
  for (const uid of Object.values(p.uids)) await player.lockIn(p.db, { nightId: p.nightId, uid, now: T0 })
  const rot = await readRotation(p.db, p.nightId)
  return { ...p, rot, mine: rot.groups.find(g => !g.fill) }
}

test('a pause is the seat\'s own: inside its band, the same every time it is asked, and not the same for everyone', () => {
  assert.deepEqual(PAUSES, { lock: [3_000, 10_000], answer: [5_000, 20_000], vote: [5_000, 20_000] }, 'Locked in after a few seconds; a Parlour Game in 5 to 20; the vote within 20')
  const id = '20261112-ab12'
  for (const kind of Object.keys(PAUSES)) {
    const all = FILL_IN_NAMES.map(n => pauseMs(id, nameKey(n), kind, 'w1'))
    for (const p of all) assert.ok(p >= PAUSES[kind][0] && p <= PAUSES[kind][1], `${kind}: inside its band`)
    assert.deepEqual(FILL_IN_NAMES.map(n => pauseMs(id, nameKey(n), kind, 'w1')), all, `${kind}: the same on a second asking`)
    assert.ok(new Set(all).size >= 6, `${kind}: the seats do not all move at once`)
  }
  assert.notEqual(pauseMs(id, 'mabel', 'answer', 'w1'), pauseMs(id, 'mabel', 'answer', 'w2'), 'another game, another pause')
  assert.notEqual(pauseMs(id, 'mabel', 'answer', 'w1'), pauseMs('20261113-cd34', 'mabel', 'answer', 'w1'), 'another night, another pause')
})

test('Locked in: each fill-in taps it three to ten seconds after its group card, once, and starts no round', async () => {
  const { db, nightId } = await practice()
  await host(db, nightId, 'act', 3)
  await host(db, nightId, 'start-act4')
  await host(db, nightId, 'next') // the group cards, at T0
  assert.equal(ms(db.store.get(act4Path(nightId)).lockEndsAt), T0 + LOCK_MS)
  const keys = flagged(nightOf(db, nightId))
  const locked = () => Object.keys(db.store.get(act4Path(nightId)).locked ?? {}).sort()
  const early = await stepFillIns(db, nightId, { now: T0 + PAUSES.lock[0] - 1 })
  assert.deepEqual([early.on, early.act, early.seats, early.did], [true, 4, 6, 0])
  assert.deepEqual(locked(), [])
  // each seat at its own moment: not a millisecond before its pause, and on the pass at it
  // (the night's id is random, so two seats can share a pause to the millisecond: the second then taps on the
  // first one's pass, at its own moment, and never before it; the final check of 12 Nov 2026 found this test
  // failing about once in thirty runs on exactly that)
  let lastAt = null
  for (const key of [...keys].sort((a, b) => pauseMs(nightId, a, 'lock') - pauseMs(nightId, b, 'lock'))) {
    const at = T0 + pauseMs(nightId, key, 'lock')
    if (locked().includes(key)) { assert.equal(at, lastAt, 'tapped already only on a pass at its own moment'); continue }
    await stepFillIns(db, nightId, { now: at - 1 })
    assert.ok(!locked().includes(key), 'not before its pause')
    const r = await stepFillIns(db, nightId, { now: at })
    assert.ok(locked().includes(key) && r.locked >= 1, 'on the pass at its pause')
    lastAt = at
  }
  assert.deepEqual(locked(), keys)
  const again = await stepFillIns(db, nightId, { now: T0 + PAUSES.lock[1] + 1_000 })
  assert.deepEqual([again.did, again.locked], [0, 0], 'nobody taps twice')
  assert.equal(nightOf(db, nightId).beat, 'groups', 'the rounds wait for the real players, never for the fill-ins')
})

test('a Parlour Game on every phone: each fill-in answers five to twenty seconds in, a pick to every question, and only the count moves on the night', async () => {
  const { db, nightId, uids } = await inAct2()
  const T1 = T0 + 60_000
  await host(db, nightId, 'light-up', undefined, T1)
  const w = nightOf(db, nightId).window
  assert.equal(w.kind, 'questions')
  const fills = fillUids(db, nightId)
  const answerOf = key => sessionOf(db, fills[key]).answers?.[w.id]
  assert.equal((await stepFillIns(db, nightId, { now: T1 + PAUSES.answer[0] - 1 })).answered, 0, 'nobody answers in under five seconds')
  for (const key of Object.keys(fills).sort((a, b) => pauseMs(nightId, a, 'answer', w.id) - pauseMs(nightId, b, 'answer', w.id))) {
    const at = T1 + pauseMs(nightId, key, 'answer', w.id)
    await stepFillIns(db, nightId, { now: at - 1 })
    assert.equal(answerOf(key), undefined, 'not before its pause')
    await stepFillIns(db, nightId, { now: at })
    const a = answerOf(key)
    assert.equal(a.defaulted, false, 'its own answer, not the clock\'s pick')
    assert.equal(a.picks.length, 3)
    assert.ok(a.picks.every(p => p === 'a' || p === 'b'))
  }
  assert.equal(nightOf(db, nightId).window.answered, 6, 'six have answered: a count, never who')
  for (const uid of Object.values(uids)) assert.equal(sessionOf(db, uid).answers, undefined, 'a real phone is never answered for')
  assert.equal((await stepFillIns(db, nightId, { now: T1 + PAUSES.answer[1] + 5_000 })).did, 0, 'once each')
  assert.equal((await stepFillIns(db, nightId, { now: ms(w.closesAt) + 1 })).did, 0, 'and nothing after the close')
})

test('two passes in the same moment make each move once: one answer a seat, a hidden role\'s points on the dial once', async () => {
  const { db, nightId } = await inAct2()
  const T1 = T0 + 60_000
  await host(db, nightId, 'light-up', undefined, T1)
  const [a, b] = await Promise.all([stepFillIns(db, nightId, { now: T1 + 20_000 }), stepFillIns(db, nightId, { now: T1 + 20_000 })])
  assert.equal(a.answered + b.answered, 6, 'six answers between the two, none twice')
  assert.equal(nightOf(db, nightId).window.answered, 6)
  const c = db.store.get(`cases/${nightId}`)
  const hidden = [c.murderer, c.ghost].filter(k => flagged(nightOf(db, nightId)).includes(k)).length
  assert.equal(c.dialLog.length, hidden, 'one push for each hidden fill-in, never two')
})

test('Act 4: a Parlour Game waiting on the phone is played by each fill-in five to twenty seconds after it lands', async () => {
  const { db, nightId, uids } = await intoRounds()
  const T1 = T0 + 60_000
  const lit = await host(db, nightId, 'light-up', undefined, T1)
  assert.equal(lit.waiting, true)
  const fills = fillUids(db, nightId)
  assert.equal((await stepFillIns(db, nightId, { now: T1 + PAUSES.answer[0] - 1 })).answered, 0)
  let answered = 0
  for (let t = PAUSES.answer[0]; t <= PAUSES.answer[1]; t += 1_000) answered += (await stepFillIns(db, nightId, { now: T1 + t })).answered
  assert.equal(answered, 6)
  for (const uid of Object.values(fills)) assert.equal(sessionOf(db, uid).answers[lit.id].defaulted, false)
  for (const uid of Object.values(uids)) assert.equal(sessionOf(db, uid).answers?.[lit.id], undefined, 'the real players play theirs when they are free')
  assert.equal(nightOf(db, nightId).window, null, 'a waiting game is never a window on the night')
  assert.equal((await stepFillIns(db, nightId, { now: T1 + 30_000 })).answered, 0, 'once each')
})

test('the vote: each fill-in casts its own ballot within twenty seconds, two people at the party and a real motive, once', async () => {
  const { db, nightId, uids } = await practice()
  await host(db, nightId, 'act', 2)
  await host(db, nightId, 'act', 7) // straight to the ballot
  const w = nightOf(db, nightId).window
  assert.equal(w.kind, 'ballot')
  const open = ms(w.opensAt)
  const fills = fillUids(db, nightId)
  assert.equal((await stepFillIns(db, nightId, { now: open + PAUSES.vote[0] - 1 })).voted, 0)
  let voted = 0
  for (let t = PAUSES.vote[0]; t <= PAUSES.vote[1]; t += 1_000) voted += (await stepFillIns(db, nightId, { now: open + t })).voted
  assert.equal(voted, 6, 'all six, inside twenty seconds')
  const roster = nightOf(db, nightId).roster
  const votes = new Set()
  for (const [key, uid] of Object.entries(fills)) {
    const b = sessionOf(db, uid).ballot
    const third = b.victim ?? b.ghost
    assert.equal(b.defaulted, false, `${key}: its own vote, not the clock's`)
    assert.ok(roster[b.murderer] && roster[third] && b.murderer !== third, 'two different people at the party')
    assert.ok(MOTIVES.some(m => m.n === b.motive), 'a motive from the list')
    votes.add(`${b.murderer}/${b.motive}/${third}`)
  }
  assert.ok(votes.size > 1, 'they do not all vote alike')
  for (const uid of Object.values(uids)) assert.equal(sessionOf(db, uid).ballot, undefined, 'the real players\' votes are their own to cast')
  assert.equal((await stepFillIns(db, nightId, { now: open + PAUSES.vote[1] + 5_000 })).voted, 0, 'once each')
})

test('a seat a real phone took over is never moved again', async () => {
  const { db, nightId } = await inAct2()
  await join(db, { uid: 'u-real-mabel', nightId, name: 'Mabel' })
  const T1 = T0 + 60_000
  await host(db, nightId, 'light-up', undefined, T1)
  const w = nightOf(db, nightId).window
  let answered = 0
  for (let t = PAUSES.answer[0]; t <= PAUSES.answer[1]; t += 1_000) answered += (await stepFillIns(db, nightId, { now: T1 + t })).answered
  assert.equal(answered, 5, 'the five who are still fill-ins')
  assert.equal(sessionOf(db, 'u-real-mabel').answers?.[w.id], undefined, 'her phone answers for itself')
  assert.equal(sessionOf(db, fillInUid(nightId, 0)).answers?.[w.id], undefined, 'and the fill-in she replaced makes no move')
  assert.equal((await stepFillIns(db, nightId, { now: T1 + 30_000 })).seats, 5)
})

test('nobody moves while no phone would: at the doors, on the role cards, in a pause, after The End', async () => {
  // at the doors: a practice night not started yet
  const lobby = new FakeFirestore()
  lobby.store.set('meta/game', { host_jonathan: 'Jon', host_susan: 'Susan' })
  const made = await createNight(lobby, { forceRehearsal: true })
  await seatFillIns(lobby, made.nightId, 6, { now: T0 })
  assert.deepEqual(await stepFillIns(lobby, made.nightId, { now: T0 + 60_000 }), { ok: true, on: true, act: 0, seats: 6, did: 0, why: 'held' })
  // on the role cards: every phone is still on its card, no game can be lit there (A5: a window opens only
  // while the night is playing, in a game's own beat), and nobody moves
  const { db, nightId } = await practice()
  await host(db, nightId, 'act', 2)
  assert.equal(nightOf(db, nightId).phase, 'prompt')
  await assert.rejects(host(db, nightId, 'light-up'), /Not now/)
  assert.deepEqual(await stepFillIns(db, nightId, { now: T0 + 20_000 }), { ok: true, on: true, act: 2, seats: 6, did: 0, why: 'held' })
  // in a pause: the clocks stand still, and the pauses start again from the window's new opening
  const p = await inAct2()
  const T1 = T0 + 60_000
  await host(p.db, p.nightId, 'light-up', undefined, T1)
  await host(p.db, p.nightId, 'pause', undefined, T1 + 1_000)
  assert.equal((await stepFillIns(p.db, p.nightId, { now: T1 + 20_000 })).why, 'held')
  assert.equal(nightOf(p.db, p.nightId).window.answered, undefined, 'nobody answered in the pause')
  await host(p.db, p.nightId, 'resume', undefined, T1 + 61_000) // a minute's pause: the window opens a minute later
  const opens = ms(nightOf(p.db, p.nightId).window.opensAt)
  assert.equal(opens, T1 + 60_000)
  assert.equal((await stepFillIns(p.db, p.nightId, { now: opens + PAUSES.answer[0] - 1 })).answered, 0)
  assert.equal((await stepFillIns(p.db, p.nightId, { now: opens + PAUSES.answer[1] })).answered, 6)
  // after The End
  p.db.store.set(`nights/${p.nightId}`, { ...nightOf(p.db, p.nightId), over: true })
  assert.equal((await stepFillIns(p.db, p.nightId, { now: opens + 30_000 })).why, 'over')
})

test('guard: a real night is never stepped, even with every mark forged onto it, and no night is from the party day on: not one write', async () => {
  // a party night in Act 2 with a Parlour Game open
  const db = new FakeFirestore()
  db.store.set('meta/game', { host_jonathan: 'Jon', host_susan: 'Susan', party_night: true })
  const { nightId } = await createNight(db)
  for (const name of ['Jon', 'Susan', 'Jessa']) await join(db, { uid: `u-${name.toLowerCase()}`, nightId, name })
  await host(db, nightId, 'act', 2)
  await host(db, nightId, 'beat', 'cat') // the cat visits: a Parlour Game's own beat (A5)
  const T1 = T0 + 60_000
  await host(db, nightId, 'light-up', undefined, T1)
  // forge everything a fill-in night would carry: the count, the mark on a seat, its made-up uid and session
  const n = nightOf(db, nightId)
  assert.equal(n.forceRehearsal, false)
  db.store.set(`nights/${nightId}`, { ...n, fillIns: 1, roster: { ...n.roster, jessa: { ...n.roster.jessa, fillIn: true } } })
  db.store.set(`sessions/${fillInUid(nightId, 0)}`, { ...sessionOf(db, 'u-jessa'), fillIn: true })
  db.store.set(`nights/${nightId}/private/deck`, { ...deckOf(db, nightId), uids: { ...deckOf(db, nightId).uids, jessa: fillInUid(nightId, 0) } })
  const before = JSON.stringify([...db.store])
  const count = countWrites(db)
  assert.deepEqual(await stepFillIns(db, nightId, { now: T1 + 20_000 }), { ok: true, on: false, why: 'real-night', did: 0 })
  assert.deepEqual(await stepLiveFillIns(db, { now: T1 + 20_000 }), { ok: true, on: false, why: 'real-night', did: 0 })
  assert.equal(count.writes, 0, 'not one write')
  assert.equal(JSON.stringify([...db.store]), before, 'the night is as it was')
  const tick = await host(db, nightId, 'tick', undefined, T1 + 20_000)
  assert.equal('fillIns' in tick, false, 'the night\'s own tick never asks on a real night')
  assert.equal(sessionOf(db, fillInUid(nightId, 0)).answers, undefined)
  // the party day: a practice night with real fill-in seats is left alone too, before anything is read
  const p = await inAct2()
  await host(p.db, p.nightId, 'light-up', undefined, T1)
  const was = JSON.stringify([...p.db.store])
  const reads = recordReads(p.db)
  const writes = countWrites(p.db)
  assert.deepEqual(await stepFillIns(p.db, p.nightId, { now: PARTY_DAY }), { ok: true, on: false, why: 'party-day', did: 0 })
  assert.deepEqual(await stepLiveFillIns(p.db, { now: PARTY_DAY + 60_000 }), { ok: true, on: false, why: 'party-day', did: 0 })
  assert.deepEqual([reads.size, writes.writes], [0, 0])
  assert.equal(JSON.stringify([...p.db.store]), was)
})

test('with no driver running, the night\'s own tick moves the fill-ins; a night with none is never asked', async () => {
  const { db, nightId } = await inAct2()
  const T1 = T0 + 60_000
  await host(db, nightId, 'light-up', undefined, T1)
  const r = await host(db, nightId, 'tick', undefined, T1 + 30_000)
  assert.equal(r.fillIns, 6, 'six moves, as a count')
  assert.equal(nightOf(db, nightId).window.answered, 6)
  assert.equal((await host(db, nightId, 'tick', undefined, T1 + 40_000)).fillIns, 0)
  // a practice night with no fill-ins: the tick's reply is the one it always was, key for key
  const plain = await inAct2({ fillIns: 0 })
  const t = await host(plain.db, plain.nightId, 'tick', undefined, T1)
  assert.deepEqual(Object.keys(t).sort(), ['bulletin', 'clock', 'lights', 'ok', 'parlour', 'settled', 'windowSettled'])
})

test('the callable\'s road: the live night is stepped, counts come back, and a heartbeat says the fill-ins are playing along', async () => {
  assert.deepEqual(await stepLiveFillIns(new FakeFirestore(), { now: T0 }), { ok: true, on: false, why: 'no-night', did: 0 })
  const { db, nightId } = await inAct2()
  const T1 = T0 + 60_000
  await host(db, nightId, 'light-up', undefined, T1)
  const r = await stepLiveFillIns(db, { now: T1 + 20_000 })
  assert.deepEqual(Object.keys(r).sort(), ['act', 'answered', 'did', 'locked', 'ok', 'on', 'seats', 'voted'], 'counts and keys, nothing a seat was dealt')
  assert.deepEqual([r.ok, r.on, r.act, r.seats, r.did, r.answered], [true, true, 2, 6, 6, 6])
  const path = `presence/fillins-${nightId}`
  const row = db.store.get(path)
  assert.deepEqual([row.nightId, row.guestKey, row.at instanceof Date], [nightId, FILL_IN_PRESENCE, true])
  assert.deepEqual(Object.keys(row).sort(), ['at', 'guestKey', 'nightId'])
  const v = db.versions.get(path)
  await stepLiveFillIns(db, { now: T1 + 20_000 + HEARTBEAT_EVERY_MS - 1 })
  assert.equal(db.versions.get(path), v, 'one heartbeat every thirty seconds at most')
  await stepLiveFillIns(db, { now: T1 + 20_000 + HEARTBEAT_EVERY_MS })
  assert.equal(db.versions.get(path), v + 1)
  // a practice night with no fill-ins: off, and no heartbeat
  const plain = await practice({ fillIns: 0 })
  assert.deepEqual(await stepLiveFillIns(plain.db, { now: T0 }), { ok: true, on: false, why: 'no-fill-ins', did: 0 })
  assert.equal(plain.db.store.get(`presence/fillins-${plain.nightId}`), undefined)
})

test('the driver on the brain and the house, end to end in memory: it asks every two seconds, the fill-ins answer inside their pauses, the window shows counts only, and it stops for the real night', async () => {
  const { drive, EVERY_MS, WORDS } = await import('../../cues/lib/fillins.js')
  const { db, nightId } = await inAct2()
  let clock = T0 + 60_000
  await host(db, nightId, 'light-up', undefined, clock)
  const opened = clock
  const lines = []
  // the brain's loop, with the house's own function in place of the network and a clock that moves only when it sleeps
  const asked = await drive({ call: () => stepLiveFillIns(db, { now: clock }), sleep: async ms => { clock += ms }, say: l => lines.push(l), now: () => clock, max: 13 })
  assert.equal(asked, 13)
  assert.equal(clock - opened, 13 * EVERY_MS, 'two seconds a call')
  assert.equal(nightOf(db, nightId).window.answered, 6, 'all six have answered inside twenty-six seconds')
  assert.deepEqual(lines, ['Playing 6 fill-in players on the practice night. Act 2.'], 'one line, and no more until something changes')
  for (const uid of Object.values(fillUids(db, nightId))) assert.equal(sessionOf(db, uid).answers[nightOf(db, nightId).window.id].defaulted, false)
  // the party night comes on: the driver's next call is its last
  const party = new FakeFirestore()
  party.store.set('meta/game', { host_jonathan: 'Jon', host_susan: 'Susan', party_night: true })
  await createNight(party)
  const said = []
  const calls = await drive({ call: () => stepLiveFillIns(party, { now: clock }), sleep: async () => {}, say: l => said.push(l), now: () => clock, max: 50 })
  assert.deepEqual([calls, said], [1, [WORDS.realNight]])
})

// ---- the early chime -----------------------------------------------------------------

test('the early chime: on a fill-in night a round ends thirty seconds after the real players\' group has finished its room, whichever room it is', async () => {
  const { db, nightId, uids, rot, mine } = await intoRounds()
  let now = T0 + 60_000
  const rooms = []
  for (let round = 1; round <= 4; round++) {
    assert.equal(nightOf(db, nightId).beat, `round${round}`)
    const room = roomFor(rot, mine.id, round)
    rooms.push(room)
    assert.equal((await clockTick(db, nightId, now)).moved, null, 'not while the real players are still in their room')
    if (room === 'entryway') {
      // the arcade: the visit is over at the last player's clue moment, not the first
      await player.meetCat(db, { nightId, uid: uids.jon, cat: 'boo', now })
      await player.arcadeClue(db, { nightId, groupId: mine.id, place: 0, now })
      assert.equal((await clockTick(db, nightId, now + 10 * 60_000)).moved, null, 'one player\'s clue moment is not the end of the visit')
      now += 5_000
      await player.arcadeClue(db, { nightId, groupId: mine.id, place: 1, now })
    } else if (room === 'study') {
      await studyFinished(db, { nightId, payload: { groupId: mine.id, outcome: 'solved', seconds: 300, pairs: 3 }, now })
    } else {
      await payRoom(db, nightId, mine.id, room, { outcome: 'done', now }) // the room's own game cleared: the Library's boards, Salem's rounds
    }
    assert.equal((await clockTick(db, nightId, now + EARLY_CHIME_MS - 1)).moved, null, 'not before the thirty seconds')
    const r = await stepFillIns(db, nightId, { now: now + EARLY_CHIME_MS })
    assert.equal(r.clock, round < 4 ? `round${round + 1}` : 'finish', 'the fill-ins\' own pass rings it')
    now += EARLY_CHIME_MS + 10_000
  }
  assert.deepEqual([...rooms].sort(), [...ROOM_KEYS].sort(), 'all four rooms were walked')
  assert.equal(db.store.get(act4Path(nightId)).phase, 'done', 'after the fourth, everyone is back in the Parlour')
  assert.ok(now - T0 < 6 * 60_000, 'four rounds in minutes, not an hour')
  assert.equal(Object.keys(db.store.get(act4PrivatePath(nightId)).paid).length, 16, 'and every group was paid for every room')
})

test('no early chime on a night with no fill-ins, however early its groups finish; none on a fill-in night until the real players are done', async () => {
  const db = new FakeFirestore()
  db.store.set('meta/game', { host_jonathan: 'Jon', host_susan: 'Susan' })
  const { nightId } = await createNight(db)
  const uids = []
  for (const name of ['Jon', 'Susan', 'Jessa', 'Jacob']) { const uid = `u-${name.toLowerCase()}`; await join(db, { uid, nightId, name }); uids.push(uid) }
  await host(db, nightId, 'act', 3)
  await host(db, nightId, 'start-act4')
  await host(db, nightId, 'next')
  for (const uid of uids) await player.lockIn(db, { nightId, uid, now: T0 })
  assert.equal(nightOf(db, nightId).beat, 'round1')
  const rot = await readRotation(db, nightId)
  for (const g of rot.groups) { const room = roomFor(rot, g.id, 1); if (ROOM_KEYS.includes(room)) await payRoom(db, nightId, g.id, room, { outcome: 'done', now: T0 + 60_000 }) }
  assert.equal((await clockTick(db, nightId, T0 + 10 * 60_000)).moved, null, 'every group is done and paid, and the round still runs its fifteen minutes')
  // even a count forged onto the night changes nothing: there is no fill-in group to end the round for
  db.store.set(`nights/${nightId}`, { ...nightOf(db, nightId), fillIns: 6 })
  assert.equal((await clockTick(db, nightId, T0 + 10 * 60_000)).moved, null)
  assert.equal((await clockTick(db, nightId, T0 + ROUND_MS)).moved, 'round2', 'the chime at the round\'s own end')
  // a fill-in night whose real players never finish their room: the round's own end, as ever
  const p = await intoRounds()
  assert.equal((await clockTick(p.db, p.nightId, T0 + ROUND_MS - 1)).moved, null)
  assert.equal((await clockTick(p.db, p.nightId, T0 + ROUND_MS)).moved, 'round2')
})

test('three clocks at the same round change on a fill-in night ring one chime: the move is taken once', async () => {
  const { db, nightId } = await intoRounds()
  let chimes = 0
  const set = db._set.bind(db)
  db._set = (path, ...rest) => { if (path === `nights/${nightId}/public/sounds`) chimes++; return set(path, ...rest) }
  // the round's own end: the minute's tick, the Host tab's tick and the fill-ins' pass all arrive together
  const at = T0 + ROUND_MS
  const [a, b, c] = await Promise.all([
    clockTick(db, nightId, at),
    stepFillIns(db, nightId, { now: at + 1 }),
    hostCommand(db, { nightId, command: 'tick', now: at + 2 }),
  ])
  assert.deepEqual([a.moved, b.clock ?? null, c.clock].filter(Boolean), ['round2'], 'one of the three made the move')
  assert.equal(chimes, 1, 'one chime')
  assert.equal(nightOf(db, nightId).beat, 'round2')
  assert.equal(db.store.get(act4Path(nightId)).round, 2)
  // the next round's change is free to be taken, again once
  const next = at + ROUND_MS + 10
  const [d, e] = await Promise.all([clockTick(db, nightId, next), clockTick(db, nightId, next + 1)])
  assert.deepEqual([d.moved, e.moved].filter(Boolean), ['round3'])
  assert.equal(chimes, 2)
})

// ---- the whole night -------------------------------------------------------------------

test('F01 with fill-ins: a whole practice night, eight seats, Start to The End; the real players never wait on a fill-in; nothing sealed is read', async () => {
  const db = new FakeFirestore()
  db.store.set('meta/game', { host_jonathan: 'Jon', host_susan: 'Susan' })
  // the party's three secrets are there, in throwaway shapes: a practice night must never read them
  for (const path of ['sealed/parlour_leans', 'sealed/bags', 'sealed/relay_pictures']) db.store.set(path, { marker: '(never read)' })
  const reads = recordReads(db)
  const lines = []
  const s = await fillInNight({ db, fillIns: 6, real: ['Jon', 'Sue'], start: PRACTICE_START, log: l => lines.push(l) })
  assert.equal(s.error, null)
  assert.deepEqual(s.checks, [], 'every check along the way')
  assert.equal(s.ok, true)
  assert.deepEqual([s.seats, s.fillIns, s.groups, s.rounds, s.earlyChimes, s.ballots, s.results, s.over], [8, 6, 4, 4, 4, 8, 8, true])
  assert.deepEqual([s.moves.locked, s.moves.voted], [6, 6], 'six taps of Locked in and six votes, each a fill-in\'s own')
  // the Act 4 game waiting on the phone is answered on the fill-ins' own clock; the games on every phone close on the
  // real players' last answer, each fill-in answering at once (the GAME-WAITS and FILL-ANSWER checks, review 12 Nov 2026)
  assert.ok(s.moves.answered >= 6, 'and every Parlour Game answered in time')
  assert.ok(s.drawers >= 1 && s.drawers <= 2, 'only the two real players were ever called to the paper')
  // the one bank a practice night may read is its own practice pictures (A7: sealed/relay_pictures_practice), never the party's
  assert.deepEqual([...reads].filter(p => p.startsWith('sealed/')), ['sealed/relay_pictures_practice'], 'a practice night reads its own case and its own practice pictures, never the party\'s packing, leans or pictures')
  assert.equal(lines.length, 1)
  assert.match(lines[0], /^Fill-in night: 8 seats \(6 fill-ins\), 4 groups, 4 rounds, 4 early chimes; .* PASS$/)
  assert.ok(!/murderer|ghost|motive/i.test(lines[0]), 'counts only')
  // and the other sizes the Start card allows: one fill-in, eight, a third real player, a lone real player
  for (const [fillIns, real] of [[1, ['Jon', 'Sue']], [8, ['Jon', 'Sue', 'Amy']], [6, ['Jon']]]) {
    const other = new FakeFirestore()
    other.store.set('meta/game', { host_jonathan: 'Jon', host_susan: 'Susan' })
    const o = await fillInNight({ db: other, fillIns, real })
    assert.deepEqual([o.ok, o.checks, o.error], [true, [], null], `${fillIns} fill-ins and ${real.length} real`)
    assert.deepEqual([o.seats, o.over, o.ballots, o.results], [fillIns + real.length, true, fillIns + real.length, fillIns + real.length])
  }
})

test('F01 with fill-ins and the brain off: nothing runs the fill-ins, and the whole night still never waits on one', async () => {
  const db = new FakeFirestore()
  db.store.set('meta/game', { host_jonathan: 'Jon', host_susan: 'Susan' })
  const lines = []
  const s = await fillInNight({ db, fillIns: 6, real: ['Jon', 'Sue'], start: PRACTICE_START, driver: false, log: l => lines.push(l) })
  assert.equal(s.error, null)
  assert.deepEqual(s.checks, [], 'every gate moved on the real players\' own taps')
  assert.equal(s.ok, true)
  assert.deepEqual([s.seats, s.fillIns, s.groups, s.rounds, s.earlyChimes, s.ballots, s.results, s.over], [8, 6, 4, 4, 4, 8, 8, true])
  assert.deepEqual([s.moves.locked, s.moves.answered, s.moves.voted], [0, 0, 0], 'no fill-in moved on its own clock')
  assert.match(lines[0], /PASS$/)
})
