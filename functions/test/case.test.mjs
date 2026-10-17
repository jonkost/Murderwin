import { test, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { FakeFirestore } from './fake-firestore.mjs'
import { createNight, join } from '../lib/night.js'
import { hostCommand, player } from '../lib/run.js'
import {
  buildCaseForNight, ensureCase, testimonyCard, kernelFor, fillPools, scrapCard, numbersSentence, ms, MAX_CODE_TRIES,
} from '../lib/deal.js'
import {
  buildCase, rehearsalCase, checkSealed, CASE_KEYS, CAT_KEYS, DIAL_SIGN, WINDOW_SLOTS, poolTokens, seededUnit, SALEM_WARP_SHARE,
} from '../lib/case.js'
import { studyClueCard } from '../lib/station.js'

// THE SEAL IN THIS FILE. Every "sealed" string below is a throwaway made
// here, in brackets, from a word the test picks; it is never a real kernel,
// never written to disk, and discarded with the fake database. Console
// output is captured for the whole file and checked: no synthetic text may
// ever reach it. Assertions on content compare lengths and hashes only.

const sha = s => createHash('sha256').update(String(s)).digest('hex').slice(0, 12)

// A synthetic sealed motive set in the generator's shape (scripts/lib.mjs).
function syntheticSealed(word) {
  const v = n => `(Synthetic ${word} ${n})`
  const truth = n => `(Synthetic ${word} ${n}: a lantern was left in [ROOM] at [TIME].)`
  const long = n => `(Synthetic ${word} document ${n}. ${Array.from({ length: 44 }, (_, i) => `w${i}`).join(' ')}.)`
  return {
    kernels: {
      irwin: [truth('irwin one'), truth('irwin two'), truth('irwin three')],
      boo: [truth('boo one'), truth('boo two'), truth('boo three')],
      granolia: [truth('granolia one'), truth('granolia two'), truth('granolia three')],
      zimothy: [`(Synthetic ${word} zimothy one: the lantern, at [TIME].)`, truth('zimothy two'), truth('zimothy three')],
      salem: [1, 2, 3].map(n => ({ text: `(Synthetic ${word} salem ${n}: the lantern was never in [ROOM].)`, anchor: 'lantern' })),
    },
    documents: [1, 2, 3].map(n => ({ text: long(n), emphasis: 'LANTERN', annotation: `(Synthetic ${word} note ${n})` })),
    fragments: [v('fragment one'), v('fragment two'), v('fragment three')],
    studyClue: [v('study one'), v('study two'), v('study three')],
    irwin: [v('dog one'), v('dog two'), v('dog three')],
    generatedAt: new Date(0),
  }
}
// Every string a sealed set holds, for the seal checks.
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
function assertNothingLeaked() {
  const text = captured.join('\n')
  for (const s of allSealed) assert.ok(!text.includes(s), `console carried a sealed string of length ${s.length} (hash ${sha(s)})`)
  assert.ok(!/Synthetic/.test(text), 'console carried synthetic content')
}

// ---- a throwaway night ---------------------------------------------------
// Traces at this party: elbow-patch, white-sand, glasses, picture. Every one
// has a look-alike among the others, so the cast-lock check is quiet.
async function party({ partyNight = false, sealed = {}, manifest = null, characters = ['shushwell', 'vayne'], guests = ['Jon', 'Susan', 'Jessa', 'Jacob'] } = {}) {
  const db = new FakeFirestore()
  db.store.set('meta/game', { host_jonathan: 'Jon', host_susan: 'Susan', ...(partyNight ? { party_night: true } : {}) })
  db.store.set('safe_content/pools', { items: [
    { id: 'p1', text: 'the scullery', pool: 'room', order: 0 }, { id: 'p2', text: 'the parlour', pool: 'room', order: 1 },
    { id: 'p3', text: 'a quarter past six', pool: 'time', order: 0 }, { id: 'p4', text: 'nearly seven', pool: 'time', order: 1 },
  ] })
  db.store.set('safe_content/templates', { items: [{ id: 't1', text: 'Telegram — office banner', order: 0 }, { id: 't2', text: 'Receipt — shop letterhead', order: 1 }] })
  if (manifest) db.store.set('sealed/manifest', { codes: manifest })
  for (const [code, doc] of Object.entries(sealed)) { db.store.set(`sealed/${code}`, doc); allSealed.push(...sealedStrings(doc)) }
  const { nightId } = await createNight(db)
  const deck = db.store.get(`nights/${nightId}/private/deck`)
  deck.order = [...characters, ...deck.order.filter(id => !characters.includes(id))]
  const uids = {}
  for (const name of guests) { const uid = `u-${name.toLowerCase()}`; await join(db, { uid, nightId, name }); uids[name.toLowerCase()] = uid }
  return { db, nightId, uids }
}
const night = (db, id) => db.store.get(`nights/${id}`)
const cards = (db, uid, kind) => (db.store.get(`sessions/${uid}`).cards ?? []).filter(c => !kind || c.kind === kind)
async function toPower(db, nightId, now) {
  const next = () => hostCommand(db, { nightId, command: 'next', now })
  await next(); await next(); await next(); await next()
  await hostCommand(db, { nightId, command: 'blackout' })
  await hostCommand(db, { nightId, command: 'power', now })
}
const TWO = { AAAAA: 3, BBBBB: 7 }

// ---- the contract ----------------------------------------------------------

test('buildCase returns every field of CASE_SHAPE with the right types; the rehearsal case has identical keys', () => {
  const sealed = syntheticSealed('alpha'); allSealed.push(...sealedStrings(sealed))
  const roster = [{ key: 'a', characterId: 'white' }, { key: 'b', characterId: 'arms' }, { key: 'c', characterId: 'rye' }]
  const templates = [{ text: 'Telegram — office banner' }]
  const pools = { room: ['the scullery', 'the parlour'], time: ['six', 'seven'] }
  for (let seed = 0; seed < 20; seed++) {
    let n = seed
    const rng = max => (n = (n * 1103515245 + 12345) & 0x7fffffff) % max
    const c = buildCase({ nightId: 'n1', roster, sealedDoc: sealed, motiveN: 5, templates, pools, rng, bankSize: 4, now: 1000 })
    assert.deepEqual(Object.keys(c).sort(), CASE_KEYS)
    assert.equal(c.rehearsal, false)
    assert.ok(c.createdAt instanceof Date)
    assert.deepEqual(Object.values(c.roles).sort(), ['detective', 'ghost', 'murderer'])
    assert.equal(c.roles[c.murderer], 'murderer'); assert.equal(c.roles[c.ghost], 'ghost')
    assert.equal(c.motive, 5)
    assert.equal(c.victimCharacterId, roster.find(g => g.key === c.ghost).characterId)
    assert.deepEqual(c.dialSign, { ghost: 1, murderer: -1 }); assert.deepEqual(c.dialMap, { ghost: 1, murderer: -1 })
    assert.equal(c.dial, 0); assert.deepEqual(c.dialLog, [])
    for (const cat of CAT_KEYS) {
      assert.ok(Array.isArray(c.kernels[cat]) && c.kernels[cat].every(k => typeof k === 'string'), `${cat} kernels are strings`)
      assert.ok(Number.isInteger(c.variant[cat]) && c.variant[cat] >= 0 && c.variant[cat] < 3)
    }
    assert.equal(c.kernels.salem.length, 3)
    assert.deepEqual(c.salemAnchors, ['lantern', 'lantern', 'lantern'])
    assert.equal(c.salemTruthIndex, c.variant.irwin)
    assert.equal(c.documents.length, 3)
    for (const d of c.documents) { assert.equal(d.template, 'Telegram'); assert.equal(d.bigWord, 'LANTERN'); assert.ok(d.text.length > 100); assert.ok(d.annotation) }
    assert.ok(sealed.studyClue.some(s => sha(s) === sha(c.studyClue.text)))
    assert.ok(sealed.fragments.some(s => sha(s) === sha(c.echo.fragment)))
    assert.equal(c.irwin.lines.length, 3)
    for (const k of ['room', 'time', 'duration', 'count', 'place', 'crowd']) assert.equal(typeof c.pools[k], 'string')
    assert.ok(['the scullery', 'the parlour'].includes(c.pools.room), 'the workshop pool wins')
    assert.ok(['room', 'time'].includes(c.granoliaSlot.key))
    assert.notEqual(c.granoliaSlot.value, c.pools[c.granoliaSlot.key])
    for (const role of ['murderer', 'ghost']) {
      assert.deepEqual(Object.keys(c.hiddenSets[role]), WINDOW_SLOTS)
      for (const i of Object.values(c.hiddenSets[role])) assert.ok(Number.isInteger(i) && i >= 0 && i < 4)
    }
    assert.deepEqual(c.exposure, {}); assert.deepEqual(c.dealtClues, [])
    assert.equal(c.code, undefined, 'the case never carries the sealed code')
  }
  const r = rehearsalCase({ nightId: 'n1', roster, templates, pools, rng: () => 0, now: 1000 })
  assert.deepEqual(Object.keys(r).sort(), CASE_KEYS)
  assert.equal(r.rehearsal, true)
  assert.deepEqual(r.dialSign, DIAL_SIGN)
  for (const cat of CAT_KEYS) assert.ok(r.kernels[cat][0].startsWith('(Rehearsal'))
  assert.ok(r.documents.length >= 2 && r.studyClue.text && r.echo.fragment && r.irwin.lines.length === 3)
  assertNothingLeaked()
})

test('the structural check names what is missing, never what is there', () => {
  assert.deepEqual(checkSealed(syntheticSealed('beta')), { ok: true, fails: [] })
  const noFrag = { ...syntheticSealed('beta'), fragments: [] }
  assert.deepEqual(checkSealed(noFrag).fails, ['fragments'])
  const oneDoc = { ...syntheticSealed('beta'), documents: syntheticSealed('beta').documents.slice(0, 1), studyClue: [] }
  assert.deepEqual(checkSealed(oneDoc).fails, ['documents', 'studyClue'])
  const badToken = syntheticSealed('beta'); badToken.kernels.boo[1] = '(Synthetic beta [Room] wrong case.)'
  assert.deepEqual(checkSealed(badToken).fails, ['kernels:boo:token'])
  const badGranolia = syntheticSealed('beta'); badGranolia.kernels.granolia[0] = '(Synthetic beta no blanks at all.)'
  assert.deepEqual(checkSealed(badGranolia).fails, ['granolia'])
  const noSalem = syntheticSealed('beta'); noSalem.kernels.salem = []
  assert.deepEqual(checkSealed(noSalem).fails, ['kernels:salem'])
  assert.equal(checkSealed(null).ok, false)
  for (const f of checkSealed({ kernels: { irwin: ['(Synthetic beta x)'] } }).fails) assert.ok(!f.includes('Synthetic'), 'reason codes carry no text')
})

// ---- the blackout ----------------------------------------------------------

test('the power beat on a party night pulls a real case; a second ensureCase leaves it unchanged', async () => {
  const { db, nightId, uids } = await party({ partyNight: true, manifest: TWO, sealed: { AAAAA: syntheticSealed('gamma'), BBBBB: syntheticSealed('delta') } })
  assert.equal(night(db, nightId).forceRehearsal, false)
  await toPower(db, nightId, 1_000_000)
  const c = db.store.get(`cases/${nightId}`)
  assert.equal(c.rehearsal, false)
  assert.equal(night(db, nightId).rehearsal, false)
  assert.equal(night(db, nightId).caseWarning, null)
  assert.ok([3, 7].includes(c.motive))
  assert.deepEqual(Object.keys(c).sort(), CASE_KEYS)
  for (const uid of Object.values(uids)) assert.equal(cards(db, uid, 'role').length, 1)
  const before = JSON.stringify(c)
  await ensureCase(db, nightId)
  await buildCaseForNight(db, nightId)
  await hostCommand(db, { nightId, command: 'power', now: 1_000_001 })
  assert.equal(JSON.stringify(db.store.get(`cases/${nightId}`)), before, 'never replaced once it has roles')
  // nothing a phone can read carries the case
  const pub = JSON.stringify({ n: night(db, nightId), content: db.store.get(`nights/${nightId}/public/content`) })
  assert.ok(!/Synthetic|"roles"|dialSign|kernels/.test(pub))
  assertNothingLeaked()
})

test('with forceRehearsal (the default) the same fixtures yield a rehearsal case', async () => {
  const { db, nightId } = await party({ manifest: TWO, sealed: { AAAAA: syntheticSealed('eps'), BBBBB: syntheticSealed('zeta') } })
  assert.equal(night(db, nightId).forceRehearsal, true)
  await toPower(db, nightId, 2_000_000)
  const c = db.store.get(`cases/${nightId}`)
  assert.equal(c.rehearsal, true)
  assert.equal(night(db, nightId).rehearsal, true)
  assert.equal(night(db, nightId).caseWarning, null)
  assert.ok(!JSON.stringify(c).includes('Synthetic'), 'a rehearsal case never touches the sealed set')
  assertNothingLeaked()
})

test('a code missing fragments is skipped and the next used; all codes broken falls back to rehearsal with a warning', async () => {
  const broken = { ...syntheticSealed('eta'), fragments: [] }
  const lines = []
  // pick = () => 0 tries BBBBB first (see shuffled), so the broken set must be BBBBB
  const a = await party({ partyNight: true, manifest: TWO, sealed: { AAAAA: syntheticSealed('theta'), BBBBB: broken } })
  const c = await buildCaseForNight(a.db, a.nightId, { pick: () => 0, now: 3_000_000, log: l => lines.push(l) })
  assert.equal(c.rehearsal, false)
  assert.equal(c.motive, 3, 'the good code, AAAAA')
  assert.equal(night(a.db, a.nightId).caseWarning, null)
  assert.equal(lines.length, 1)
  assert.deepEqual(Object.keys(JSON.parse(lines[0].replace(/^case /, ''))), ['nightId', 'kernelCount', 'docCount', 'rehearsal', 'triedCodes'])
  assert.equal(JSON.parse(lines[0].replace(/^case /, '')).triedCodes, 2)
  assert.ok(!lines[0].includes('AAAAA') && !lines[0].includes('BBBBB'), 'the log never names a code')

  const b = await party({ partyNight: true, manifest: { AAAAA: 3, BBBBB: 7, CCCCC: 9, DDDDD: 11, EEEEE: 2, FFFFF: 4 }, sealed: { AAAAA: broken, BBBBB: broken, CCCCC: broken, DDDDD: broken, EEEEE: broken, FFFFF: broken } })
  const c2 = await buildCaseForNight(b.db, b.nightId, { now: 3_000_001, log: l => lines.push(l) })
  assert.equal(c2.rehearsal, true)
  assert.equal(night(b.db, b.nightId).rehearsal, true)
  assert.equal(night(b.db, b.nightId).caseWarning, 'rehearsal-fallback')
  assert.equal(JSON.parse(lines[1].replace(/^case /, '')).triedCodes, MAX_CODE_TRIES)

  // a missing manifest on a party night: rehearsal, and the Host tab is told, since the party
  // would otherwise look like it was working until the first cat spoke
  const d = await party({ partyNight: true })
  const c3 = await buildCaseForNight(d.db, d.nightId, { now: 3_000_002, log: l => lines.push(l) })
  assert.equal(c3.rehearsal, true)
  assert.equal(night(d.db, d.nightId).rehearsal, true)
  assert.equal(night(d.db, d.nightId).caseWarning, 'no-sealed-content')
  // a manifest with no codes is the same
  const e = await party({ partyNight: true, manifest: {} })
  await buildCaseForNight(e.db, e.nightId, { now: 3_000_003, log: l => lines.push(l) })
  assert.equal(night(e.db, e.nightId).caseWarning, 'no-sealed-content')
  // a rehearsal night with no manifest is what it says it is: no warning
  const f = await party()
  await buildCaseForNight(f.db, f.nightId, { now: 3_000_004, log: l => lines.push(l) })
  assert.equal(night(f.db, f.nightId).caseWarning, null)
  for (const l of lines) assert.ok(!/Synthetic|kernels:/.test(l))
  assertNothingLeaked()
})

test('a roster whose traces have no partner sets caseWarning trace-partner', async () => {
  // the two Professors share no bucket
  const { db, nightId } = await party({ guests: ['Jon', 'Susan'] })
  await buildCaseForNight(db, nightId, { now: 4_000_000, log: () => {} })
  assert.equal(night(db, nightId).caseWarning, 'trace-partner')
  const both = await party({ partyNight: true, manifest: { AAAAA: 3 }, sealed: { AAAAA: { ...syntheticSealed('iota'), fragments: [] } }, guests: ['Jon', 'Susan'] })
  await buildCaseForNight(both.db, both.nightId, { now: 4_000_001, log: () => {} })
  assert.equal(night(both.db, both.nightId).caseWarning, 'rehearsal-fallback,trace-partner')
  assertNothingLeaked()
})

// ---- dealing through one path -------------------------------------------

async function wholeNight({ partyNight }) {
  const sealed = { AAAAA: syntheticSealed('kappa') }
  const { db, nightId, uids } = await party({ partyNight, manifest: { AAAAA: 12 }, sealed })
  let now = 5_000_000
  const next = () => hostCommand(db, { nightId, command: 'next', now })
  await toPower(db, nightId, now)
  const c = db.store.get(`cases/${nightId}`)
  await next() // news
  await next() // cat
  await next() // puzzle
  const safe = db.store.get(`nights/${nightId}/private/puzzles`).safe
  for (const [key, uid] of Object.entries(uids)) {
    const puzzle = cards(db, uid, 'puzzle')[0]
    const r = await player.solve(db, { nightId, uid, cardId: puzzle.id, entry: safe[key] })
    assert.equal(r.right, true)
  }
  await next() // questions
  now += 60_001
  await next() // checkin
  await next(); await next(); await next() // act 3: down, bulletin, groups
  await next() // act 4 station1 (no station alive: the study group gets its clue with the card)
  await next() // station2
  return { db, nightId, uids, c }
}

test('a whole night with a real case deals testimony, document and study clue with placeholder false and no brackets', async () => {
  const { db, nightId, uids, c } = await wholeNight({ partyNight: true })
  assert.equal(c.rehearsal, false)
  let clues = 0
  for (const uid of Object.values(uids)) {
    const t = cards(db, uid, 'testimony')[0]
    assert.equal(t.placeholder, false)
    const said = t.lines.join(' ')
    assert.ok(!said.includes('[object Object]'))
    assert.ok(!/\[[A-Z]+\]/.test(said), 'every blank filled')
    if (t.outcome !== 'deflect') assert.ok(!said.includes('(Rehearsal'), 'no rehearsal text on a party night')
    const d = cards(db, uid, 'document')[0]
    assert.equal(d.placeholder, false)
    assert.ok(['Telegram', 'Receipt'].includes(d.template))
    assert.equal(d.bigWord, 'LANTERN')
    assert.ok(!d.text.includes('[') && !d.text.includes('object Object'))
    for (const s of cards(db, uid, 'station')) {
      if (s.testimony) { assert.equal(s.testimony.placeholder, false); assert.ok(!s.testimony.lines.join(' ').includes('[object Object]')) }
    }
    for (const k of cards(db, uid, 'clue')) { clues++; assert.equal(k.placeholder, false); assert.ok(!k.text.includes('[') && k.text.length > 10) }
  }
  assert.ok(clues >= 2, 'the first study group was paid its clue')
  assertNothingLeaked()
})

test('the same walk on a rehearsal night carries placeholder true on every one of those cards', async () => {
  const { db, uids, c } = await wholeNight({ partyNight: false })
  assert.equal(c.rehearsal, true)
  for (const uid of Object.values(uids)) {
    assert.equal(cards(db, uid, 'testimony')[0].placeholder, true)
    assert.equal(cards(db, uid, 'document')[0].placeholder, true)
    for (const k of cards(db, uid, 'clue')) assert.equal(k.placeholder, true)
    for (const s of cards(db, uid, 'station')) if (s.testimony) assert.equal(s.testimony.placeholder, true)
  }
  assert.equal(studyClueCard(c, 4, 'station1').placeholder, true)
  assertNothingLeaked()
})

test('fifty Irwin deals to two guests say the same thing; Granolia is wrong on one blank, the same for everyone; Salem keeps his anchor', async () => {
  const sealed = syntheticSealed('lambda'); allSealed.push(...sealedStrings(sealed))
  const { db, nightId } = await party()
  const roster = [{ key: 'a', characterId: 'white' }, { key: 'b', characterId: 'arms' }]
  const pools = { room: ['the scullery', 'the parlour'], time: ['six', 'seven'] }
  const c = buildCase({ nightId, roster, sealedDoc: sealed, motiveN: 1, pools, now: 1 })
  const voice = { openers: () => [], closers: () => [], refusals: () => [], pools, numbersLine: undefined, scrap: {} }
  const seen = new Set()
  for (let i = 0; i < 50; i++) {
    for (const guestKey of ['a', 'b']) {
      const t = await testimonyCard(db, { c, cat: 'irwin', level: 5, act: 2, beat: 'cat', id: 'x', room: null, voice, nightId, guestKey })
      seen.add(sha(t.lines.join('|')))
    }
  }
  assert.equal(seen.size, 1, 'identical wording and values for every listener')
  const straight = fillPools(c.kernels.granolia[c.variant.granolia], c.pools)
  const slots = new Set()
  for (const guestKey of ['a', 'b', 'c', 'd']) {
    const t = await testimonyCard(db, { c, cat: 'granolia', level: 5, act: 2, beat: 'cat', id: 'x', room: null, voice, nightId, guestKey, roll: () => 0 })
    const hers = t.lines[1] // opener, kernel, closer
    assert.notEqual(hers, straight)
    assert.ok(hers.includes(c.granoliaSlot.value))
    assert.ok(!hers.includes(c.pools[c.granoliaSlot.key]) || c.granoliaSlot.value.includes(c.pools[c.granoliaSlot.key]))
    slots.add(sha(hers))
  }
  assert.equal(slots.size, 1, 'the same wrong blank for every listener')
  // the slot is one of her blanks, and exactly one value differs from the fixed pools
  assert.ok(poolTokens(c.kernels.granolia[c.variant.granolia]).map(k => k.toLowerCase()).includes(c.granoliaSlot.key))
  assert.equal(fillPools('[ROOM] [TIME]', c.pools, { garble: true, slot: c.granoliaSlot }).split(' ').filter((w, i) => w !== `${c.pools.room} ${c.pools.time}`.split(' ')[i]).length > 0, true)
  let warpedSeen = 0
  for (let i = 0; i < 40; i++) {
    const k = kernelFor(c, 'salem', { nightId, guestKey: `g${i}` })
    if (k.warped) { warpedSeen++; assert.ok(k.text.includes(c.salemAnchors[c.variant.salem])) }
    else assert.equal(sha(k.text), sha(c.kernels.irwin[c.salemTruthIndex]))
  }
  assert.ok(warpedSeen > 0)
  assertNothingLeaked()
})

test('Salem inverts about 60 percent: over 1000 seeded guests, the same guest always the same branch, both inside his opener and closer', async () => {
  const sealed = syntheticSealed('mu'); allSealed.push(...sealedStrings(sealed))
  const { db, nightId } = await party()
  const c = buildCase({ nightId, roster: [{ key: 'a', characterId: 'white' }, { key: 'b', characterId: 'arms' }], sealedDoc: sealed, motiveN: 2, now: 1 })
  let warped = 0
  for (let i = 0; i < 1000; i++) {
    const k1 = kernelFor(c, 'salem', { nightId, guestKey: `guest-${i}` })
    const k2 = kernelFor(c, 'salem', { nightId, guestKey: `guest-${i}` })
    assert.equal(k1.warped, k2.warped); assert.equal(k1.text, k2.text)
    if (k1.warped) warped++
  }
  assert.ok(warped >= 550 && warped <= 650, `warped share ${warped / 10} percent`)
  assert.ok(Math.abs(SALEM_WARP_SHARE - 0.6) < 1e-9)
  assert.ok(seededUnit('x', 'y') === seededUnit('x', 'y') && seededUnit('x', 'y') !== seededUnit('x', 'z'))
  const voice = { openers: () => ['(Opener.)'], closers: () => ['(Closer.)'], refusals: () => ['(No.)'], pools: {}, scrap: {} }
  const branches = new Set()
  for (let i = 0; i < 30; i++) {
    const t = await testimonyCard(db, { c, cat: 'salem', level: 5, act: 4, beat: 'station1', id: 'x', room: null, voice, nightId, guestKey: `g${i}`, roll: () => 0 })
    assert.equal(t.lines[0], '(Opener.)'); assert.equal(t.lines.at(-1), '(Closer.)'); assert.equal(t.lines.length, 3)
    branches.add(sha(t.lines[1]))
  }
  assert.equal(branches.size, 2, 'both branches occur, each inside Salem\'s voice')
  assertNothingLeaked()
})

test('the safe numbers reach the phone for every outcome, and open the safe first try for a real document', async () => {
  const sealed = { AAAAA: syntheticSealed('nu') }
  const { db, nightId, uids } = await party({ partyNight: true, manifest: { AAAAA: 6 }, sealed })
  const now = 6_000_000
  await toPower(db, nightId, now)
  const c = db.store.get(`cases/${nightId}`)
  const codes = [12, 34, 56]
  const voice = { openers: () => [], closers: () => [], refusals: () => ['(Not now.)'], pools: {}, scrap: {} }
  const has = (text, nums) => nums.every(n => text.includes(String(n)))
  const full = await testimonyCard(db, { c, cat: 'irwin', level: 5, act: 2, beat: 'cat', id: 'x', codes, voice, nightId, guestKey: 'a' })
  assert.equal(full.outcome, 'full'); assert.ok(has(full.lines.join(' '), codes))
  const partial = await testimonyCard(db, { c, cat: 'zimothy', level: 3, act: 2, beat: 'cat', id: 'x', codes, voice, nightId, guestKey: 'a', roll: () => 2 })
  assert.equal(partial.outcome, 'partial'); assert.ok(has(partial.lines.join(' '), codes))
  const deflect = await testimonyCard(db, { c, cat: 'boo', level: 1, act: 2, beat: 'cat', id: 'x', codes, voice, nightId, guestKey: 'a' })
  assert.equal(deflect.outcome, 'deflect'); assert.ok(!has(deflect.lines.join(' '), codes))
  const scrap = scrapCard(2, 'cat', codes)
  assert.equal(scrap.kind, 'notice'); assert.ok(has(scrap.text, codes)); assert.ok(scrap.button)
  assert.equal(numbersSentence(codes, 'NUMBERS [A] [B] [C]'), 'NUMBERS 12 34 56')
  assert.equal(numbersSentence(null), '')

  // through the dealer: every phone, whatever its cat said
  const next = () => hostCommand(db, { nightId, command: 'next', now })
  await next(); await next(); await next()
  const safe = db.store.get(`nights/${nightId}/private/puzzles`).safe
  let deflected = 0
  for (const [key, uid] of Object.entries(uids)) {
    const t = cards(db, uid, 'testimony')[0]
    const scrapN = cards(db, uid, 'notice').find(n => n.key === 'scrap')
    const text = t.lines.join(' ') + ' ' + (scrapN?.text ?? '')
    assert.ok(has(text, safe[key]), `phone holds all three numbers (${t.outcome})`)
    if (t.outcome === 'deflect') { deflected++; assert.ok(scrapN, 'a brush-off leaves a scrap of paper') } else assert.ok(!scrapN)
    const puzzle = cards(db, uid, 'puzzle')[0]
    const r = await player.solve(db, { nightId, uid, cardId: puzzle.id, entry: safe[key] })
    assert.equal(r.right, true); assert.equal(r.tries, 1)
    const d = cards(db, uid, 'document')[0]
    assert.equal(d.placeholder, false); assert.equal(d.gaveWay, undefined)
  }
  assert.ok(deflected >= 0)
  assertNothingLeaked()
})

test('createNight: nights rehearse by default; the party checkbox or an explicit caller turns the sealed content on', async () => {
  const db = new FakeFirestore()
  db.store.set('meta/game', { host_jonathan: 'Jon', host_susan: 'Susan' })
  const a = await createNight(db)
  assert.equal(night(db, a.nightId).forceRehearsal, true); assert.equal(night(db, a.nightId).dryRun, false); assert.equal(night(db, a.nightId).caseWarning, null)
  db.store.set('meta/game', { host_jonathan: 'Jon', host_susan: 'Susan', party_night: true })
  const b = await createNight(db)
  assert.equal(night(db, b.nightId).forceRehearsal, false)
  const d = await createNight(db, { forceRehearsal: false, dryRun: true })
  assert.equal(night(db, d.nightId).forceRehearsal, false); assert.equal(night(db, d.nightId).dryRun, true)
  const e = await createNight(db, { forceRehearsal: true })
  assert.equal(night(db, e.nightId).forceRehearsal, true)
})

test('the seal, after everything: nothing synthetic ever reached the console', () => {
  assert.ok(allSealed.length > 50)
  assertNothingLeaked()
})
