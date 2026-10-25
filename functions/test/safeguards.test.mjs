import { test, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { FakeFirestore } from './fake-firestore.mjs'
import { walkLights } from './lights-walk.mjs'
import { createNight, join } from '../lib/night.js'
import { hostCommand, player, studyFinished } from '../lib/run.js'
import { finaleDoc, ROLE_CARD_ID, ROLE_CARDS } from '../lib/deal.js'
import { rerollCase, rehearsalCase, buildCase, CASE_KEYS } from '../lib/case.js'
import { MOTIVES } from '../lib/night.js'
import { spill, hush, spillAllowed, noteDealt, spillBlocked, isHushed, spotlightLines, BLOCKING_KINDS, HUSH_ROLES } from '../lib/safeguards.js'
import { rotationPath, studyPath } from '../lib/station.js'
import { wordCount, PARITY_TOLERANCE } from '../lib/windows.js'

// THE SEAL IN THIS FILE. Every case below is dealt in a fake Firestore and
// discarded with it. Console output is captured for the whole file and
// checked: a spill prints nothing, and no command result carries a motive,
// a role or the cats' leans. The story is compared by hash only.

const sha = s => createHash('sha256').update(String(s)).digest('hex').slice(0, 12)

// ---- console capture for the whole file ----------------------------------
const captured = []
const real = {}
beforeEach(() => {
  for (const k of ['log', 'info', 'warn', 'error', 'debug']) { real[k] = console[k]; console[k] = (...a) => captured.push(a.map(String).join(' ')) }
})
afterEach(() => { for (const k of Object.keys(real)) console[k] = real[k] })
function assertNothingLeaked(extra = '') {
  const text = captured.join('\n') + '\n' + extra
  assert.ok(!/synthetic|"motive"|"roles"|"leans"/i.test(text), 'output carried a motive, a role or a lean')
}

// ---- a throwaway night ---------------------------------------------------
async function party({ partyNight = false, guests = ['Jon', 'Susan', 'Jessa', 'Jacob', 'Stanley'] } = {}) {
  const db = new FakeFirestore()
  db.store.set('meta/game', { host_jonathan: 'Jon', host_susan: 'Susan', ...(partyNight ? { party_night: true } : {}) })
  db.store.set('sealed/parlour_leans', { sets: { 'synthetic-set': { 0: { boo: 'a' } } } })
  const { nightId } = await createNight(db, { forceRehearsal: !partyNight })
  const uids = {}
  for (const name of guests) { const uid = `u-${name.toLowerCase()}`; await join(db, { uid, nightId, name }); uids[name.toLowerCase()] = uid }
  return { db, nightId, uids }
}
const realParty = () => party({ partyNight: true })
// Every doc path the fake database is asked for from here on.
function watchReads(db) {
  const paths = []
  const get = db._get.bind(db)
  db._get = path => { paths.push(path); return get(path) }
  return paths
}
const night = (db, id) => db.store.get(`nights/${id}`)
const caseOf = (db, id) => db.store.get(`cases/${id}`)
const session = (db, uid) => db.store.get(`sessions/${uid}`)
async function toPower(db, nightId, now) {
  const next = () => hostCommand(db, { nightId, command: 'next', now })
  await next(); await next(); await next(); await next()
  await hostCommand(db, { nightId, command: 'blackout' })
  await hostCommand(db, { nightId, command: 'power', now })
}
// What a spill must leave alone, snapshotted for a before/after compare.
function people(db, nightId) {
  const n = night(db, nightId)
  const deck = db.store.get(`nights/${nightId}/private/deck`)
  return Object.fromEntries(Object.entries(n.roster).map(([key, r]) => [key, {
    characterId: r.characterId, bag: r.bag, affection: session(db, deck.uids[key])?.affection ?? null,
  }]))
}
const storyHash = c => sha(JSON.stringify([c.motive, c.solving]))
const roleCardOf = (db, uid) => (session(db, uid).cards ?? []).find(x => x.id === ROLE_CARD_ID)
const keyOf = (db, nightId, uid) => Object.entries(db.store.get(`nights/${nightId}/private/deck`).uids).find(([, u]) => u === uid)?.[0]
const uidOf = (db, nightId, key) => db.store.get(`nights/${nightId}/private/deck`).uids[key]

// ---- the pure helper -------------------------------------------------------

test('G23 rerollCase keeps the Murderer, the characters and the Parlour Games; changes the motive and the Ghost; restarts the dial', () => {
  const roster = [{ key: 'a', characterId: 'white' }, { key: 'b', characterId: 'arms' }, { key: 'c', characterId: 'rye' }, { key: 'd', characterId: 'glass' }]
  for (let seed = 1; seed <= 40; seed++) {
    let n = seed
    const rng = max => (n = (n * 1103515245 + 12345) & 0x7fffffff) % max
    const prev = { ...buildCase({ roster, rng, now: 1000 }), dial: 9, dialLog: [{ act: 2, role: 'ghost', delta: 9 }], exposure: { ghost: { act: 2 } } }
    const fresh = { ...buildCase({ roster, rng, now: 2000 }), motive: prev.motive === 12 ? 13 : 12 }
    const next = rerollCase({ prev, fresh, roster, rng })
    assert.deepEqual(Object.keys(next).sort(), [...CASE_KEYS, 'spills'].sort())
    assert.equal(next.rehearsal, false)
    assert.equal(next.murderer, prev.murderer)
    assert.notEqual(next.ghost, prev.ghost)
    assert.notEqual(next.ghost, next.murderer)
    assert.deepEqual(Object.keys(next.roles).sort(), Object.keys(prev.roles).sort())
    assert.deepEqual(Object.values(next.roles).sort(), ['detective', 'detective', 'ghost', 'murderer'])
    assert.equal(next.roles[next.murderer], 'murderer'); assert.equal(next.roles[next.ghost], 'ghost')
    assert.equal(next.motive, fresh.motive)
    assert.notEqual(next.motive, prev.motive)
    assert.equal(next.victimCharacterId, roster.find(g => g.key === next.ghost).characterId)
    assert.deepEqual(next.parlourPlan, prev.parlourPlan, 'the night\'s Parlour Games carry on as planned')
    assert.equal(next.screenSalt, prev.screenSalt)
    assert.equal(next.createdAt, prev.createdAt)
    assert.equal(next.dial, 0); assert.deepEqual(next.dialLog, []); assert.deepEqual(next.exposure, {})
    assert.equal(next.spills, 1)
    assert.ok(next.solving.family, 'the new motive has its own solving plan')
    assert.notEqual(storyHash(next), storyHash(prev))
  }
  // a rehearsal reroll that happened to draw the same motive is pushed to another one
  const r1 = rehearsalCase({ roster, rng: () => 0 })
  const r2 = rehearsalCase({ roster, rng: () => 0 })
  assert.equal(r1.motive, r2.motive)
  const rr = rerollCase({ prev: r1, fresh: r2, roster, rng: () => 0 })
  assert.notEqual(rr.motive, r1.motive)
  assert.equal(rr.rehearsal, true)
  assert.ok(MOTIVES.some(m => m.n === rr.motive))
  assertNothingLeaked()
})

test('G23 spillAllowed: only Acts 2 to 5, never in a blackout, never with a window open, never once a clue that pins the motive is out', () => {
  const c = { roles: { a: 'murderer', b: 'ghost' }, dealtClues: [] }
  assert.equal(spillAllowed({ act: 2, phase: 'act' }, c), true)
  assert.equal(spillAllowed({ act: 5, phase: 'act' }, c), true)
  assert.equal(spillAllowed({ act: 1, phase: 'act' }, c), false)
  assert.equal(spillAllowed({ act: 6, phase: 'act' }, c), false)
  assert.equal(spillAllowed({ act: 2, phase: 'blackout' }, c), false)
  assert.equal(spillAllowed({ act: 2, phase: 'act', window: { settled: false } }, c), false)
  assert.equal(spillAllowed({ act: 2, phase: 'act', window: { settled: true } }, c), true)
  assert.equal(spillAllowed({ act: 2, phase: 'act' }, { roles: null }), false)
  assert.deepEqual(BLOCKING_KINDS, ['study', 'echo', 'hint', 'memory', 'room'])
  for (const kind of BLOCKING_KINDS) assert.equal(spillAllowed({ act: 2, phase: 'act' }, { ...c, dealtClues: [{ kind }] }), false, kind)
  assert.equal(spillBlocked({ dealtClues: [{ kind: 'testimony' }] }), false, 'a cat visit alone does not pin the story')
})

// ---- Spill the Beans, on a real case -------------------------------------

test('G23 spill before any clue: the motive and the Ghost change, the Murderer stays, characters and affection are kept, role cards are replaced in place', async () => {
  const { db, nightId } = await realParty()
  const now = 1_700_000_000_000
  await toPower(db, nightId, now)
  const before = caseOf(db, nightId)
  assert.equal(before.rehearsal, false)
  const peopleBefore = people(db, nightId)
  const cardsBefore = Object.fromEntries(Object.keys(before.roles).map(k => [k, roleCardOf(db, uidOf(db, nightId, k))]))
  assert.ok(Object.values(cardsBefore).every(Boolean), 'every phone holds its role card')

  const reads = watchReads(db)
  const r = await hostCommand(db, { nightId, command: 'spill', now })
  assert.deepEqual(r, { ok: true, did: true })
  const after = caseOf(db, nightId)
  assert.equal(after.rehearsal, false)
  assert.notEqual(after.motive, before.motive)
  assert.ok(MOTIVES.some(m => m.n === after.motive), 'a different motive, drawn from the nineteen')
  assert.notEqual(after.ghost, before.ghost)
  assert.equal(after.murderer, before.murderer)
  assert.deepEqual(Object.keys(after.roles).sort(), Object.keys(before.roles).sort())
  assert.deepEqual(Object.values(after.roles).sort(), ['detective', 'detective', 'detective', 'ghost', 'murderer'])
  assert.equal(after.victimCharacterId, night(db, nightId).roster[after.ghost].characterId)
  assert.deepEqual(people(db, nightId), peopleBefore, 'characters, bags and affection are untouched')
  assert.notEqual(storyHash(after), storyHash(before))
  assert.deepEqual(after.parlourPlan, before.parlourPlan, 'the cats\' leans and the Parlour Games carry on')
  assert.equal(after.dial, 0); assert.deepEqual(after.dialLog, []); assert.deepEqual(after.exposure, {})
  assert.equal(after.spills, 1)
  assert.equal(night(db, nightId).rehearsal, false)
  // role cards: same id, same count, the two phones whose role moved hold the new text
  for (const k of Object.keys(after.roles)) {
    const uid = uidOf(db, nightId, k)
    const cards = session(db, uid).cards
    assert.equal(cards.filter(x => x.id === ROLE_CARD_ID).length, 1, 'one role card per phone')
    assert.equal(roleCardOf(db, uid).text, ROLE_CARDS[after.roles[k].toUpperCase()])
  }
  assert.equal(roleCardOf(db, uidOf(db, nightId, before.ghost)).text, ROLE_CARDS.DETECTIVE)
  assert.equal(roleCardOf(db, uidOf(db, nightId, after.ghost)).text, ROLE_CARDS.GHOST)
  assert.equal(roleCardOf(db, uidOf(db, nightId, after.murderer)), cardsBefore[after.murderer] ? roleCardOf(db, uidOf(db, nightId, after.murderer)) : null)
  assert.deepEqual(roleCardOf(db, uidOf(db, nightId, after.murderer)), cardsBefore[after.murderer], 'the Murderer\'s card is not touched')
  // a second spill rolls again, to yet another motive
  const r2 = await hostCommand(db, { nightId, command: 'spill', now })
  assert.equal(r2.did, true)
  const third = caseOf(db, nightId)
  assert.notEqual(third.motive, after.motive)
  assert.equal(third.murderer, before.murderer)
  assert.equal(third.spills, 2)
  assert.ok(reads.length > 0, 'the spill was watched')
  assert.deepEqual(reads.filter(p => p.startsWith('sealed/')), [], 'a spill reads nothing under sealed/: no manifest, no motive set, no leans')
  assertNothingLeaked(JSON.stringify([r, r2]))
})

test('G23 the story a spill deals passes G01 to G21 again: one Murderer and one Ghost, nothing from outside the party, the motive one of the nineteen, nothing pointing at the Murderer, Salem alone no help, Irwin right, the groups apart (party and rehearsal, 3 to 9 guests)', async () => {
  const { caseChecks, SPILL_IDS } = await import('../lib/checks.js')
  const NAMES = ['Jon', 'Susan', 'Jessa', 'Jacob', 'Stanley', 'Jeanette', 'Matthew', 'Marie', 'Rene']
  let pick = 7
  const rng = n => (pick = (pick * 1103515245 + 12345) & 0x7fffffff) % n
  for (const partyNight of [true, false]) {
    for (let n = 3; n <= NAMES.length; n++) {
      const { db, nightId } = await party({ partyNight, guests: NAMES.slice(0, n) })
      const now = 1_700_000_000_000
      await toPower(db, nightId, now)
      const before = caseOf(db, nightId)
      assert.deepEqual(await hostCommand(db, { nightId, command: 'spill', now }), { ok: true, did: true })
      const after = caseOf(db, nightId)
      const roster = Object.entries(night(db, nightId).roster).map(([key, r]) => ({ key, characterId: r.characterId, bag: r.bag }))
      const results = caseChecks(after, { roster, rng, reroll: false }).filter(r => SPILL_IDS.includes(r.id))
      assert.equal(results.length, SPILL_IDS.length)
      for (const r of results) assert.ok(r.pass, `G23 ${r.id} after a spill, ${n} guests, ${partyNight ? 'party' : 'rehearsal'}`)
      assert.equal(after.murderer, before.murderer, 'G23 the Murderer stays')
      assert.notEqual(after.motive, before.motive, 'G23 a new motive')
      assert.notEqual(after.ghost, before.ghost, 'G23 a new Ghost')
    }
  }
  assertNothingLeaked()
})

// The Canon says the clarity dial stacks across the whole night and never resets; Spill the Beans
// restarts it today (case.js rerollCase sets the dial to 0, and the G23 tests above expect it).
// Not changed: which one is right is Jon's call.
test.todo('G24 the dial never resets during the night, not even after Spill the Beans (today a spill restarts it; the Canon says it never resets; needs Jon\'s call)')

test('spill deals the role cards through the parity check: uneven workshop cards stay padded and only the two phones whose role moved are touched', async () => {
  const { db, nightId } = await realParty()
  const now = 1_700_000_000_000
  // a five-word Murderer card against two long ones: the parity check pads it at the power beat
  db.store.set('safe_content/role_cards', { items: [
    { id: 'm', order: 0, text: 'MURDERER: (You did it. Hush.)' },
    { id: 'g', order: 1, text: `GHOST: (You are the one who died tonight, and you know it, though not who did it to you; say nothing to anyone.)` },
    { id: 'd', order: 2, text: `DETECTIVE: (You are here to find out who did it, why, and to whom; listen to the cats and trust Sir Irwin above all.)` },
  ] })
  await toPower(db, nightId, now)
  const before = caseOf(db, nightId)
  const counts = () => Object.fromEntries(Object.keys(before.roles).map(k => [k, wordCount(roleCardOf(db, uidOf(db, nightId, k)).text)]))
  const spreadOf = cs => { const v = Object.values(cs); return (Math.max(...v) - Math.min(...v)) / Math.max(...v) }
  assert.ok(spreadOf(counts()) <= PARITY_TOLERANCE, `padded at the power beat: ${JSON.stringify(counts())}`)
  const stamps = Object.fromEntries(Object.keys(before.roles).map(k => [k, roleCardOf(db, uidOf(db, nightId, k)).at]))
  const r = await hostCommand(db, { nightId, command: 'spill', now })
  assert.equal(r.did, true)
  const after = caseOf(db, nightId)
  assert.ok(spreadOf(counts()) <= PARITY_TOLERANCE, `still padded after the spill: ${JSON.stringify(counts())}`)
  const murdererCount = counts()[after.murderer]
  assert.ok(murdererCount > 5, 'the Murderer, whose role did not change, does not hold the one short card')
  const touched = Object.keys(after.roles).filter(k => roleCardOf(db, uidOf(db, nightId, k)).at !== stamps[k])
  assert.deepEqual(touched.sort(), [before.ghost, after.ghost].sort(), 'only the old Ghost and the new Ghost were rewritten')
  assertNothingLeaked(JSON.stringify(r))
})

test('spill on a rehearsal case: a fresh rehearsal story with another motive and another Ghost; nothing is ever printed', async () => {
  const { db, nightId } = await party()
  const now = 1_700_000_000_000
  await toPower(db, nightId, now)
  const before = caseOf(db, nightId)
  assert.equal(before.rehearsal, true)
  const peopleBefore = people(db, nightId)
  const r = await hostCommand(db, { nightId, command: 'spill', now })
  assert.deepEqual(r, { ok: true, did: true })
  const after = caseOf(db, nightId)
  assert.equal(after.rehearsal, true)
  assert.notEqual(after.motive, before.motive)
  assert.notEqual(after.ghost, before.ghost)
  assert.equal(after.murderer, before.murderer)
  assert.deepEqual(people(db, nightId), peopleBefore)
  assert.equal(after.dial, 0)
  assert.equal(captured.length, 0, 'the spill prints nothing at all')
  assertNothingLeaked(JSON.stringify(r))
})

test('spill after a cat\'s hint is dealt: did:false, nothing changes, no reason given', async () => {
  const { db, nightId, uids } = await realParty()
  const now = 1_700_000_000_000
  await toPower(db, nightId, now)
  // straight to the cats (no news on the screen): every guest meets all four cats, every one gives a hint,
  // and the ledger notes each one
  await hostCommand(db, { nightId, command: 'beat', arg: 'cat', now })
  await walkLights(db, nightId, { now })
  const c = caseOf(db, nightId)
  assert.ok(c.dealtClues.length > 0 && c.dealtClues.every(e => e.kind === 'hint'))
  assert.deepEqual([...new Set(c.dealtClues.map(e => e.key))].sort(), Object.values(uids).map(u => keyOf(db, nightId, u)).sort(), 'every guest heard a cat')
  assert.ok(c.dealtClues.every(e => Object.keys(e).every(f => ['kind', 'act', 'beat', 'key', 'at'].includes(f))), 'the ledger holds no content field')

  const snapshot = JSON.stringify([caseOf(db, nightId), ...Object.values(uids).map(u => session(db, u))])
  const r = await hostCommand(db, { nightId, command: 'spill', now })
  assert.deepEqual(r, { ok: true, did: false })
  assert.equal(JSON.stringify([caseOf(db, nightId), ...Object.values(uids).map(u => session(db, u))]), snapshot, 'nothing changed')
  assert.equal(caseOf(db, nightId).spills, undefined)
  assertNothingLeaked(JSON.stringify(r))
})

test('spill is off once the news is on the screen, once the study has paid out, after Act 5, and before the case exists', async () => {
  // the news: the News flash beat notes it (ledger kind 'echo')
  {
    const { db, nightId } = await realParty()
    const now = 1_700_000_000_000
    await toPower(db, nightId, now)
    await hostCommand(db, { nightId, command: 'next', now }) // orient -> news
    assert.deepEqual(caseOf(db, nightId).dealtClues.map(e => e.kind), ['echo'])
    const motive = caseOf(db, nightId).motive
    assert.deepEqual(await hostCommand(db, { nightId, command: 'spill', now }), { ok: true, did: false })
    assert.equal(caseOf(db, nightId).motive, motive)
  }
  // the study clue, with the station alive: the finish pays the group and notes it
  {
    const { db, nightId } = await party()
    const now = 1_700_000_000_000
    await toPower(db, nightId, now)
    await hostCommand(db, { nightId, command: 'act', arg: 3, now })
    await hostCommand(db, { nightId, command: 'start-act4', now })
    await hostCommand(db, { nightId, command: 'next', now }) // the group cards
    await db.doc(studyPath(nightId)).set({ state: 'idle', updatedAt: new Date(now) }, { merge: true }) // the station's heartbeat
    await hostCommand(db, { nightId, command: 'next', now }) // round 1
    // with three groups one room is empty each round: point the study at a group, as the host's reassign would
    if (!db.store.get(studyPath(nightId)).groupId) await db.doc(studyPath(nightId)).set({ groupId: db.store.get(rotationPath(nightId)).order[0] }, { merge: true })
    assert.equal(caseOf(db, nightId).dealtClues.length, 0, 'the room directions do not pin the story')
    assert.equal((await hostCommand(db, { nightId, command: 'spill', now })).did, true, 'still on in the first round')
    const groupId = db.store.get(studyPath(nightId)).groupId
    const fin = await studyFinished(db, { nightId, payload: { groupId, outcome: 'solved', seconds: 200, pairs: 3 }, now })
    assert.ok(fin.dealt > 0)
    assert.deepEqual(caseOf(db, nightId).dealtClues.map(e => [e.kind, e.groupId])[0], ['study', groupId])
    assert.deepEqual(await hostCommand(db, { nightId, command: 'spill', now }), { ok: true, did: false })
  }
  // the study clue, with no station: the round's cap pays it
  {
    const { db, nightId } = await party()
    const now = 1_700_000_000_000
    await toPower(db, nightId, now)
    await hostCommand(db, { nightId, command: 'act', arg: 3, now })
    await hostCommand(db, { nightId, command: 'start-act4', now })
    await hostCommand(db, { nightId, command: 'next', now }) // the group cards
    await hostCommand(db, { nightId, command: 'next', now }) // round 1
    while (!db.store.get(studyPath(nightId)).groupId) await hostCommand(db, { nightId, command: 'next', now })
    const groupId = db.store.get(studyPath(nightId)).groupId
    await hostCommand(db, { nightId, command: 'next', now }) // the chime: every room not finished is paid
    assert.ok(caseOf(db, nightId).dealtClues.some(e => e.kind === 'study' && e.groupId === groupId))
    assert.deepEqual(await hostCommand(db, { nightId, command: 'spill', now }), { ok: true, did: false })
  }
  // Act 6 and beyond
  {
    const { db, nightId } = await party()
    const now = 1_700_000_000_000
    await toPower(db, nightId, now)
    await hostCommand(db, { nightId, command: 'act', arg: 5, now })
    assert.equal((await hostCommand(db, { nightId, command: 'spill', now })).did, true, 'on through Act 5')
    await hostCommand(db, { nightId, command: 'act', arg: 6, now: now + 1 })
    assert.deepEqual(await hostCommand(db, { nightId, command: 'spill', now: now + 2 }), { ok: true, did: false })
  }
  // before the case exists (Act 1) and during a Parlour Game
  {
    const { db, nightId } = await party()
    const now = 1_700_000_000_000
    await hostCommand(db, { nightId, command: 'next', now }) // Act 1 begins
    assert.deepEqual(await hostCommand(db, { nightId, command: 'spill', now }), { ok: true, did: false })
    assert.equal(caseOf(db, nightId), undefined, 'no case was made by asking')
    for (let i = 0; i < 3; i++) await hostCommand(db, { nightId, command: 'next', now })
    await hostCommand(db, { nightId, command: 'blackout' })
    assert.deepEqual(await hostCommand(db, { nightId, command: 'spill', now }), { ok: true, did: false }, 'not in the dark')
    await hostCommand(db, { nightId, command: 'power', now })
    await hostCommand(db, { nightId, command: 'light-up', now })
    assert.deepEqual(await hostCommand(db, { nightId, command: 'spill', now: now + 1000 }), { ok: true, did: false })
  }
  assertNothingLeaked()
})

// ---- the Hush --------------------------------------------------------------

// Picks that score as high as the set allows, from the numbers the server keeps.
function bestPicks(db, nightId, windowId, key) {
  const values = db.store.get(`nights/${nightId}/private/windows`)[windowId].values // one set for the whole room
  return values.map(v => Object.entries(v).sort((a, b) => b[1] - a[1])[0][0])
}

test('hush: that role\'s answers move no dial from then on; the other role still pushes; the second tap is a no-op', async () => {
  const { db, nightId } = await party()
  const now = 1_700_000_000_000
  await toPower(db, nightId, now)
  const c = caseOf(db, nightId)
  const ghostUid = uidOf(db, nightId, c.ghost), murdererUid = uidOf(db, nightId, c.murderer)

  const r = await hostCommand(db, { nightId, command: 'hush', arg: 'ghost', now })
  assert.deepEqual(r, { ok: true, role: 'ghost', hushed: true, already: false })
  assert.ok(isHushed(caseOf(db, nightId), 'ghost'))
  assert.equal(caseOf(db, nightId).exposure.ghost.act, 2)
  assert.ok(!isHushed(caseOf(db, nightId), 'murderer'))
  // a field name, not a substring: Dr. Paige Shushwell's name contains the letters "hush"
  for (const uid of [ghostUid, murdererUid]) assert.equal(/"(hush|hushed|hushedAt|exposure)"\s*:/.test(JSON.stringify(session(db, uid))), false, 'no phone carries a trace of it')

  const w = await hostCommand(db, { nightId, command: 'light-up', now })
  await player.answer(db, { nightId, uid: ghostUid, windowId: w.id, picks: bestPicks(db, nightId, w.id, c.ghost), now: now + 1000 })
  assert.equal(caseOf(db, nightId).dial, 0, 'the hushed Ghost moved nothing')
  // a hushed push is kept as a zero, marked hushed, so the Act 7 graph can spotlight it (windows.pushDial)
  const pushes = (log) => log.filter(e => !e.hushed)
  assert.deepEqual(pushes(caseOf(db, nightId).dialLog), [])
  assert.ok(caseOf(db, nightId).dialLog.every(e => e.role !== 'ghost' || (e.hushed && e.delta === 0)))
  await player.answer(db, { nightId, uid: murdererUid, windowId: w.id, picks: bestPicks(db, nightId, w.id, c.murderer), now: now + 1000 })
  assert.ok(caseOf(db, nightId).dial < 0, 'the Murderer still pulls the dial down')
  assert.equal(pushes(caseOf(db, nightId).dialLog).length, 1)
  assert.equal(pushes(caseOf(db, nightId).dialLog)[0].role, 'murderer')
  // the window settles for the rest without a push from the hushed role
  await hostCommand(db, { nightId, command: 'settle', now: now + 61_000 })
  assert.ok(pushes(caseOf(db, nightId).dialLog).every(e => e.role === 'murderer'))

  const again = await hostCommand(db, { nightId, command: 'hush', arg: 'ghost', now: now + 2000 })
  assert.deepEqual(again, { ok: true, role: 'ghost', hushed: true, already: true })
  assert.equal(caseOf(db, nightId).exposure.ghost.act, 2, 'the first tap stands')
  await assert.rejects(hostCommand(db, { nightId, command: 'hush', arg: 'detective', now }), e => e.code === 'invalid')
  await assert.rejects(hostCommand(db, { nightId, command: 'hush', now }), e => e.code === 'invalid')
  assertNothingLeaked(JSON.stringify([r, again]))
})

test('the finale carries the spotlight line only when a hush exists; a spill wipes an earlier hush', async () => {
  const { db, nightId } = await party()
  const now = 1_700_000_000_000
  await toPower(db, nightId, now)
  const plain = await finaleDoc(db, nightId, caseOf(db, nightId), now)
  assert.equal('spotlight' in plain, false)
  assert.deepEqual(spotlightLines(caseOf(db, nightId)), [])

  await hostCommand(db, { nightId, command: 'hush', arg: 'murderer', now })
  const lit = await finaleDoc(db, nightId, caseOf(db, nightId), now)
  assert.equal(lit.spotlight.length, 1)
  assert.equal(lit.spotlight[0].role, 'murderer')
  assert.equal(lit.spotlight[0].act, 2)
  assert.match(lit.spotlight[0].text, /^The Murderer was found out in Act 2\./)
  assert.ok(!lit.spotlight[0].text.includes('—'))
  for (const role of HUSH_ROLES) await hostCommand(db, { nightId, command: 'hush', arg: role, now })
  assert.equal((await finaleDoc(db, nightId, caseOf(db, nightId), now)).spotlight.length, 2)

  // Spill the Beans starts the dial again, and with it the exposure record
  const r = await hostCommand(db, { nightId, command: 'spill', now })
  assert.equal(r.did, true)
  assert.deepEqual(caseOf(db, nightId).exposure, {})
  assert.equal('spotlight' in await finaleDoc(db, nightId, caseOf(db, nightId), now), false)
  assertNothingLeaked()
})

test('noteDealt: quiet with no case, keeps only the ledger fields, never a word of content', async () => {
  const db = new FakeFirestore()
  assert.deepEqual(await noteDealt(db, 'n0', { kind: 'hint' }), { noted: false })
  db.store.set('cases/n0', { roles: {}, dealtClues: [] })
  assert.deepEqual(await noteDealt(db, 'n0', { kind: 'hint', act: 2, beat: 'cat', key: 'jon', text: '(Synthetic leak)', title: 'x' }, { now: 5 }), { noted: true, count: 1 })
  assert.deepEqual(await noteDealt(db, 'n0', { act: 2 }), { noted: false }, 'no kind, no entry')
  const [e] = db.store.get('cases/n0').dealtClues
  assert.deepEqual(Object.keys(e).sort(), ['act', 'at', 'beat', 'key', 'kind'])
  assert.ok(!JSON.stringify(db.store.get('cases/n0')).includes('leak'))
  assertNothingLeaked()
})
