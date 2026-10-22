import { test, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { FakeFirestore } from './fake-firestore.mjs'
import { createNight, join } from '../lib/night.js'
import { hostCommand, player, studyFinished } from '../lib/run.js'
import { finaleDoc, ROLE_CARD_ID, ROLE_CARDS } from '../lib/deal.js'
import { rerollCase, rehearsalCase, buildCase, CASE_KEYS, CAT_KEYS } from '../lib/case.js'
import { MOTIVES } from '../lib/night.js'
import { spill, hush, spillAllowed, noteDealt, spillBlocked, isHushed, spotlightLines, BLOCKING_KINDS, HUSH_ROLES } from '../lib/safeguards.js'
import { studyPath } from '../lib/station.js'
import { wordCount, PARITY_TOLERANCE } from '../lib/windows.js'

// THE SEAL IN THIS FILE. Every "sealed" string below is a throwaway made
// here, in brackets, from a word the test picks; it is never a real kernel,
// never written to disk, and discarded with the fake database. Console
// output is captured for the whole file and checked: no synthetic text may
// ever reach it, and no command result may carry it. Content is compared by
// hash only.

const sha = s => createHash('sha256').update(String(s)).digest('hex').slice(0, 12)

function syntheticSealed(word) {
  const v = n => `(Synthetic ${word} ${n})`
  const truth = n => `(Synthetic ${word} ${n}: a lantern was left in [ROOM] at [TIME].)`
  const long = n => `(Synthetic ${word} document ${n}. ${Array.from({ length: 44 }, (_, i) => `w${i}`).join(' ')}.)`
  return {
    kernels: {
      irwin: [truth('irwin one'), truth('irwin two'), truth('irwin three')],
      boo: [truth('boo one'), truth('boo two'), truth('boo three')],
      granolia: [truth('granolia one'), truth('granolia two'), truth('granolia three')],
      zimothy: [truth('zimothy one'), truth('zimothy two'), truth('zimothy three')],
      salem: [1, 2, 3].map(n => ({ text: `(Synthetic ${word} salem ${n}: the lantern was never in [ROOM].)`, anchor: 'lantern' })),
    },
    documents: [1, 2, 3].map(n => ({ text: long(n), emphasis: 'LANTERN', annotation: `(Synthetic ${word} note ${n})` })),
    fragments: [v('fragment one'), v('fragment two'), v('fragment three')],
    studyClue: [v('study one'), v('study two'), v('study three')],
    irwin: [v('dog one'), v('dog two'), v('dog three')],
    generatedAt: new Date(0),
  }
}
function sealedStrings(doc) {
  const out = []
  for (const cat of CAT_KEYS) for (const k of doc.kernels[cat]) out.push(typeof k === 'string' ? k : k.text)
  for (const d of doc.documents) out.push(d.text, d.annotation)
  out.push(...doc.fragments, ...doc.studyClue, ...doc.irwin)
  return out
}

// ---- console capture for the whole file ----------------------------------
const captured = []
const real = {}
beforeEach(() => {
  for (const k of ['log', 'info', 'warn', 'error', 'debug']) { real[k] = console[k]; console[k] = (...a) => captured.push(a.map(String).join(' ')) }
})
afterEach(() => { for (const k of Object.keys(real)) console[k] = real[k] })
const allSealed = []
function assertNothingLeaked(extra = '') {
  const text = captured.join('\n') + '\n' + extra
  for (const s of allSealed) assert.ok(!text.includes(s), `output carried a sealed string of length ${s.length} (hash ${sha(s)})`)
  assert.ok(!/Synthetic/.test(text), 'output carried synthetic content')
}

// ---- a throwaway night ---------------------------------------------------
const THREE = { AAAAA: 3, BBBBB: 7, CCCCC: 11 }
async function party({ partyNight = false, sealed = {}, manifest = null, guests = ['Jon', 'Susan', 'Jessa', 'Jacob', 'Stanley'] } = {}) {
  const db = new FakeFirestore()
  db.store.set('meta/game', { host_jonathan: 'Jon', host_susan: 'Susan', ...(partyNight ? { party_night: true } : {}) })
  db.store.set('safe_content/pools', { items: [
    { id: 'p1', text: 'the scullery', pool: 'room', order: 0 }, { id: 'p2', text: 'the parlour', pool: 'room', order: 1 },
    { id: 'p3', text: 'a quarter past six', pool: 'time', order: 0 }, { id: 'p4', text: 'nearly seven', pool: 'time', order: 1 },
  ] })
  db.store.set('safe_content/templates', { items: [{ id: 't1', text: 'Telegram — office banner', order: 0 }, { id: 't2', text: 'Receipt — shop letterhead', order: 1 }] })
  if (manifest) db.store.set('sealed/manifest', { codes: manifest })
  for (const [code, doc] of Object.entries(sealed)) { db.store.set(`sealed/${code}`, doc); allSealed.push(...sealedStrings(doc)) }
  const { nightId } = await createNight(db, { forceRehearsal: !partyNight })
  const uids = {}
  for (const name of guests) { const uid = `u-${name.toLowerCase()}`; await join(db, { uid, nightId, name }); uids[name.toLowerCase()] = uid }
  return { db, nightId, uids }
}
async function realParty() {
  const sealed = { AAAAA: syntheticSealed('alpha'), BBBBB: syntheticSealed('bravo'), CCCCC: syntheticSealed('charlie') }
  return party({ partyNight: true, sealed, manifest: THREE })
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
const kernelHash = c => sha(JSON.stringify(c.kernels))
const roleCardOf = (db, uid) => (session(db, uid).cards ?? []).find(x => x.id === ROLE_CARD_ID)
const keyOf = (db, nightId, uid) => Object.entries(db.store.get(`nights/${nightId}/private/deck`).uids).find(([, u]) => u === uid)?.[0]
const uidOf = (db, nightId, key) => db.store.get(`nights/${nightId}/private/deck`).uids[key]

// ---- the pure helper -------------------------------------------------------

test('rerollCase keeps the Murderer, the characters, the pools, the template and the hidden sets; changes the motive and the Ghost; restarts the dial', () => {
  const roster = [{ key: 'a', characterId: 'white' }, { key: 'b', characterId: 'arms' }, { key: 'c', characterId: 'rye' }, { key: 'd', characterId: 'glass' }]
  const templates = [{ text: 'Telegram — office banner' }, { text: 'Receipt — shop letterhead' }]
  const pools = { room: ['the scullery', 'the parlour'], time: ['six', 'seven'] }
  const sealedA = syntheticSealed('pure-a'), sealedB = syntheticSealed('pure-b')
  allSealed.push(...sealedStrings(sealedA), ...sealedStrings(sealedB))
  for (let seed = 1; seed <= 40; seed++) {
    let n = seed
    const rng = max => (n = (n * 1103515245 + 12345) & 0x7fffffff) % max
    const prev = { ...buildCase({ nightId: 'n1', roster, sealedDoc: sealedA, motiveN: 5, templates, pools, rng, now: 1000 }), dial: 9, dialLog: [{ act: 2, role: 'ghost', delta: 9 }], exposure: { ghost: { act: 2 } } }
    const fresh = buildCase({ nightId: 'n1', roster, sealedDoc: sealedB, motiveN: 12, templates, pools, rng, now: 2000 })
    const next = rerollCase({ prev, fresh, roster, poolLists: pools, rng })
    assert.deepEqual(Object.keys(next).sort(), [...CASE_KEYS, 'spills'].sort())
    assert.equal(next.murderer, prev.murderer)
    assert.notEqual(next.ghost, prev.ghost)
    assert.notEqual(next.ghost, next.murderer)
    assert.deepEqual(Object.keys(next.roles).sort(), Object.keys(prev.roles).sort())
    assert.deepEqual(Object.values(next.roles).sort(), ['detective', 'detective', 'ghost', 'murderer'])
    assert.equal(next.roles[next.murderer], 'murderer'); assert.equal(next.roles[next.ghost], 'ghost')
    assert.equal(next.motive, 12)
    assert.equal(next.victimCharacterId, roster.find(g => g.key === next.ghost).characterId)
    assert.deepEqual(next.pools, prev.pools)
    assert.ok(next.documents.every(d => d.template === prev.documents[0].template), 'the paper stays the same')
    assert.deepEqual(next.parlourPlan, prev.parlourPlan, 'the night\'s Parlour Games carry on as planned')
    assert.equal(next.createdAt, prev.createdAt)
    assert.equal(next.dial, 0); assert.deepEqual(next.dialLog, []); assert.deepEqual(next.exposure, {})
    assert.equal(next.spills, 1)
    assert.equal(kernelHash(next), kernelHash(fresh), 'the new story is the fresh set')
    assert.notEqual(kernelHash(next), kernelHash(prev))
    if (next.granoliaSlot) assert.notEqual(next.granoliaSlot.value, next.pools[next.granoliaSlot.key], 'Granolia is still wrong about one blank')
  }
  // a rehearsal reroll that happened to draw the same motive is pushed to another one
  const r1 = rehearsalCase({ nightId: 'n1', roster, templates, pools, rng: () => 0 })
  const r2 = rehearsalCase({ nightId: 'n1', roster, templates, pools, rng: () => 0 })
  assert.equal(r1.motive, r2.motive)
  const rr = rerollCase({ prev: r1, fresh: r2, roster, poolLists: pools, rng: () => 0 })
  assert.notEqual(rr.motive, r1.motive)
  assert.ok(MOTIVES.some(m => m.n === rr.motive))
  assertNothingLeaked()
})

test('spillAllowed: only Acts 2 to 5, never in a blackout, never with a window open, never once a clue that pins the motive is out', () => {
  const c = { roles: { a: 'murderer', b: 'ghost' }, dealtClues: [] }
  assert.equal(spillAllowed({ act: 2, phase: 'act' }, c), true)
  assert.equal(spillAllowed({ act: 5, phase: 'act' }, c), true)
  assert.equal(spillAllowed({ act: 1, phase: 'act' }, c), false)
  assert.equal(spillAllowed({ act: 6, phase: 'act' }, c), false)
  assert.equal(spillAllowed({ act: 2, phase: 'blackout' }, c), false)
  assert.equal(spillAllowed({ act: 2, phase: 'act', window: { settled: false } }, c), false)
  assert.equal(spillAllowed({ act: 2, phase: 'act', window: { settled: true } }, c), true)
  assert.equal(spillAllowed({ act: 2, phase: 'act' }, { roles: null }), false)
  for (const kind of BLOCKING_KINDS) assert.equal(spillAllowed({ act: 2, phase: 'act' }, { ...c, dealtClues: [{ kind }] }), false, kind)
  assert.equal(spillBlocked({ dealtClues: [{ kind: 'testimony' }] }), false, 'a cat visit alone does not pin the story')
})

// ---- Spill the Beans, on a real case -------------------------------------

test('spill before any document: the motive and the Ghost change, the Murderer stays, characters and affection are kept, role cards are replaced in place', async () => {
  const { db, nightId } = await realParty()
  const now = 1_700_000_000_000
  await toPower(db, nightId, now)
  const before = caseOf(db, nightId)
  assert.equal(before.rehearsal, false)
  const peopleBefore = people(db, nightId)
  const cardsBefore = Object.fromEntries(Object.keys(before.roles).map(k => [k, roleCardOf(db, uidOf(db, nightId, k))]))
  assert.ok(Object.values(cardsBefore).every(Boolean), 'every phone holds its role card')

  const r = await hostCommand(db, { nightId, command: 'spill', now })
  assert.deepEqual(r, { ok: true, did: true })
  const after = caseOf(db, nightId)
  assert.equal(after.rehearsal, false)
  assert.notEqual(after.motive, before.motive)
  assert.ok(Object.values(THREE).includes(after.motive), 'the new motive comes from another sealed set')
  assert.notEqual(after.ghost, before.ghost)
  assert.equal(after.murderer, before.murderer)
  assert.deepEqual(Object.keys(after.roles).sort(), Object.keys(before.roles).sort())
  assert.deepEqual(Object.values(after.roles).sort(), ['detective', 'detective', 'detective', 'ghost', 'murderer'])
  assert.equal(after.victimCharacterId, night(db, nightId).roster[after.ghost].characterId)
  assert.deepEqual(people(db, nightId), peopleBefore, 'characters, bags and affection are untouched')
  assert.notEqual(kernelHash(after), kernelHash(before))
  assert.deepEqual(after.pools, before.pools)
  assert.equal(after.documents[0].template, before.documents[0].template)
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
  // a second spill rolls again, from yet another set or the first one
  const r2 = await hostCommand(db, { nightId, command: 'spill', now })
  assert.equal(r2.did, true)
  const third = caseOf(db, nightId)
  assert.notEqual(third.motive, after.motive)
  assert.equal(third.murderer, before.murderer)
  assert.equal(third.spills, 2)
  assertNothingLeaked(JSON.stringify([r, r2]))
})

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

test('spill after a document is dealt: did:false, nothing changes, no reason given', async () => {
  const { db, nightId, uids } = await realParty()
  const now = 1_700_000_000_000
  await toPower(db, nightId, now)
  await hostCommand(db, { nightId, command: 'beat', arg: 'puzzle', now })
  // three wrong tries: the safe gives way and the document lands (the ledger notes it)
  const uid = uids.jessa
  const card = session(db, uid).cards.find(x => x.kind === 'puzzle')
  for (let i = 0; i < 3; i++) await player.solve(db, { nightId, uid, cardId: card.id, entry: [0, 0, 0] })
  assert.ok(session(db, uid).cards.some(x => x.kind === 'document'))
  const c = caseOf(db, nightId)
  assert.deepEqual(c.dealtClues.map(e => [e.kind, e.key]), [['document', keyOf(db, nightId, uid)]])
  assert.ok(c.dealtClues.every(e => Object.keys(e).every(f => ['kind', 'act', 'beat', 'key', 'at'].includes(f))), 'the ledger holds no content field')

  const snapshot = JSON.stringify([caseOf(db, nightId), ...Object.values(uids).map(u => session(db, u))])
  const r = await hostCommand(db, { nightId, command: 'spill', now })
  assert.deepEqual(r, { ok: true, did: false })
  assert.equal(JSON.stringify([caseOf(db, nightId), ...Object.values(uids).map(u => session(db, u))]), snapshot, 'nothing changed')
  assert.equal(caseOf(db, nightId).spills, undefined)
  assertNothingLeaked(JSON.stringify(r))
})

test('spill is off once the echo is on the screen, once the study has paid out, after Act 5, and before the case exists', async () => {
  // the echo: the News flash beat notes it
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
    await hostCommand(db, { nightId, command: 'beat', arg: 'groups', now })
    await db.doc(studyPath(nightId)).set({ state: 'idle', updatedAt: new Date(now) }, { merge: true }) // the station's heartbeat
    await hostCommand(db, { nightId, command: 'act', arg: 4, now })
    assert.equal(caseOf(db, nightId).dealtClues.length, 0, 'station cards do not pin the story')
    assert.equal((await hostCommand(db, { nightId, command: 'spill', now })).did, true, 'still on at the first station')
    const groupId = db.store.get(studyPath(nightId)).groupId
    const fin = await studyFinished(db, { nightId, payload: { groupId, outcome: 'solved', seconds: 200, pairs: 3 }, now })
    assert.ok(fin.dealt > 0)
    assert.deepEqual(caseOf(db, nightId).dealtClues.map(e => [e.kind, e.groupId])[0], ['study', groupId])
    assert.deepEqual(await hostCommand(db, { nightId, command: 'spill', now }), { ok: true, did: false })
  }
  // the study clue, with no station: it lands with the station card at the first rotation
  {
    const { db, nightId } = await party()
    const now = 1_700_000_000_000
    await toPower(db, nightId, now)
    await hostCommand(db, { nightId, command: 'act', arg: 3, now })
    await hostCommand(db, { nightId, command: 'beat', arg: 'groups', now })
    await hostCommand(db, { nightId, command: 'act', arg: 4, now })
    const groupId = db.store.get(studyPath(nightId)).groupId
    assert.deepEqual(caseOf(db, nightId).dealtClues.map(e => [e.kind, e.groupId, e.beat]), [['study', groupId, 'station1']])
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
  assert.deepEqual(await noteDealt(db, 'n0', { kind: 'document' }), { noted: false })
  db.store.set('cases/n0', { roles: {}, dealtClues: [] })
  assert.deepEqual(await noteDealt(db, 'n0', { kind: 'document', act: 2, beat: 'puzzle', key: 'jon', text: '(Synthetic leak)', title: 'x' }, { now: 5 }), { noted: true, count: 1 })
  assert.deepEqual(await noteDealt(db, 'n0', { act: 2 }), { noted: false }, 'no kind, no entry')
  const [e] = db.store.get('cases/n0').dealtClues
  assert.deepEqual(Object.keys(e).sort(), ['act', 'at', 'beat', 'key', 'kind'])
  assert.ok(!JSON.stringify(db.store.get('cases/n0')).includes('leak'))
  assertNothingLeaked()
})
