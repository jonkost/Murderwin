import { test, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { FakeFirestore } from './fake-firestore.mjs'
import { createNight, join, MOTIVES } from '../lib/night.js'
import { hostCommand } from '../lib/run.js'
import { buildCaseForNight, ensureCase, catHintCard, hintLine, HINT_PLACEHOLDER, HINT_QUIET, CAT_NAMES, CAT_ROOMS } from '../lib/deal.js'
import { FAMILIES } from '../lib/families.js'
import { buildCase, rehearsalCase, CASE_KEYS, DIAL_SIGN } from '../lib/case.js'
import { studyClueCard } from '../lib/station.js'
import { walkLights } from './lights-walk.mjs'

// THE SEAL IN THIS FILE. The only sealed thing a case reads is the cats'
// lean table, on the party night. The table below is a throwaway made here,
// in brackets, discarded with the fake database. Console output is captured
// for the whole file and checked: no lean, no set id and no motive may ever
// reach it.

// ---- console capture for the whole file ----------------------------------
const captured = []
const real = {}
beforeEach(() => {
  for (const k of ['log', 'info', 'warn', 'error', 'debug']) { real[k] = console[k]; console[k] = (...a) => captured.push(a.map(String).join(' ')) }
})
afterEach(() => { for (const k of Object.keys(real)) console[k] = real[k] })
function assertNothingLeaked() {
  const text = captured.join('\n')
  assert.ok(!/Synthetic|synthetic-set/.test(text), 'console carried synthetic content')
}

// The keys the per-motive sealed sets used to put on a case. None is ever dealt now.
const RETIRED_KEYS = ['kernels', 'variant', 'salemAnchors', 'salemTruthIndex', 'documents', 'studyClue', 'echo', 'irwin', 'pools', 'granoliaSlot', 'template']

// ---- a throwaway night ---------------------------------------------------
// Traces at this party: elbow-patch, white-sand, glasses, picture. Every one
// has a look-alike among the others, so the cast-lock check is quiet.
async function party({ partyNight = false, characters = ['shushwell', 'vayne'], guests = ['Jon', 'Susan', 'Jessa', 'Jacob'] } = {}) {
  const db = new FakeFirestore()
  db.store.set('meta/game', { host_jonathan: 'Jon', host_susan: 'Susan', ...(partyNight ? { party_night: true } : {}) })
  db.store.set('sealed/parlour_leans', { sets: { 'synthetic-set': { 0: { boo: 'a' } } } })
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
  for (let i = 0; i < 5; i++) await next() // Act 1's five beats (the house rules since 25 Oct 2026)
  await hostCommand(db, { nightId, command: 'blackout', now, sleep: () => {} }) // the power returns on its own (25 Oct 2026)
}
// Every doc path the database is asked for from here on (reads only).
function watchReads(db) {
  const paths = []
  const get = db._get.bind(db)
  db._get = path => { paths.push(path); return get(path) }
  return paths
}

// ---- the contract ----------------------------------------------------------

test('buildCase returns every field of CASE_SHAPE with the right types and no sealed input; the rehearsal case has identical keys', () => {
  const roster = [{ key: 'a', characterId: 'white' }, { key: 'b', characterId: 'arms' }, { key: 'c', characterId: 'rye' }]
  const motives = new Set()
  for (let seed = 0; seed < 40; seed++) {
    let n = seed
    const rng = max => (n = (n * 1103515245 + 12345) & 0x7fffffff) % max
    const c = buildCase({ roster, rng, parlour: { bankIds: ['s1', 's2', 's3', 's4'] }, now: 1000 })
    assert.deepEqual(Object.keys(c).sort(), CASE_KEYS)
    assert.equal(c.rehearsal, false)
    assert.ok(c.createdAt instanceof Date)
    assert.deepEqual(Object.values(c.roles).sort(), ['detective', 'ghost', 'murderer'])
    assert.equal(c.roles[c.murderer], 'murderer'); assert.equal(c.roles[c.ghost], 'ghost')
    assert.ok(MOTIVES.some(m => m.n === c.motive), 'the deal draws one of the nineteen')
    motives.add(c.motive)
    assert.equal(c.victimCharacterId, roster.find(g => g.key === c.ghost).characterId)
    assert.deepEqual(c.dialSign, { ghost: 1, murderer: -1 }); assert.deepEqual(c.dialMap, { ghost: 1, murderer: -1 })
    assert.equal(c.dial, 0); assert.deepEqual(c.dialLog, [])
    assert.deepEqual(Object.keys(c.parlourPlan.acts).sort(), ['2', '4', '6'])
    for (const [act, slots] of Object.entries(c.parlourPlan.acts)) {
      assert.equal(slots.length, { 2: 5, 4: 5, 6: 2 }[act], 'five, five and two: twelve a night')
      for (const p of slots) { assert.ok(['s1', 's2', 's3', 's4'].includes(p.setId)); assert.equal(p.listeners.length, 3) }
    }
    assert.match(c.screenSalt, /^[0-9a-f]{32}$/)
    assert.deepEqual(c.exposure, {}); assert.deepEqual(c.dealtClues, [])
    for (const k of RETIRED_KEYS) assert.equal(k in c, false, `no ${k} on a case`)
  }
  assert.ok(motives.size > 5, 'the motive is drawn, not fixed')
  assert.deepEqual(CASE_KEYS, ['createdAt', 'dial', 'dialLog', 'dialMap', 'dialSign', 'dealtClues', 'exposure', 'ghost', 'motive', 'murderer', 'parlourPlan', 'rehearsal', 'roles', 'screenSalt', 'solving', 'victimCharacterId'].sort())
  const r = rehearsalCase({ roster, rng: () => 0, now: 1000 })
  assert.deepEqual(Object.keys(r).sort(), CASE_KEYS)
  assert.equal(r.rehearsal, true)
  assert.deepEqual(r.dialSign, DIAL_SIGN)
  assert.ok(MOTIVES.some(m => m.n === r.motive))
})

// ---- the blackout ----------------------------------------------------------

test('the power beat on a party night deals a party case and reads only the leans; a second ensureCase leaves it unchanged', async () => {
  const { db, nightId, uids } = await party({ partyNight: true })
  assert.equal(night(db, nightId).forceRehearsal, false)
  const reads = watchReads(db)
  await toPower(db, nightId, 1_000_000)
  const c = db.store.get(`cases/${nightId}`)
  assert.equal(c.rehearsal, false)
  assert.equal(night(db, nightId).rehearsal, false)
  assert.equal(night(db, nightId).caseWarning, null)
  assert.ok(MOTIVES.some(m => m.n === c.motive))
  assert.deepEqual(Object.keys(c).sort(), CASE_KEYS)
  assert.deepEqual(c.parlourPlan.leans, { 'synthetic-set': { 0: { boo: 'a' } } }, 'the lean table as Jenna left it')
  assert.deepEqual([...new Set(reads.filter(p => p.startsWith('sealed/')))], ['sealed/parlour_leans'], 'never sealed/manifest, never a sealed motive set')
  for (const uid of Object.values(uids)) assert.equal(cards(db, uid, 'role').length, 1)
  const before = JSON.stringify(c)
  await ensureCase(db, nightId)
  await buildCaseForNight(db, nightId)
  await hostCommand(db, { nightId, command: 'power', now: 1_000_001 })
  assert.equal(JSON.stringify(db.store.get(`cases/${nightId}`)), before, 'never replaced once it has roles')
  // nothing a phone can read carries the case
  const pub = JSON.stringify({ n: night(db, nightId), content: db.store.get(`nights/${nightId}/public/content`) })
  assert.ok(!/synthetic-set|"roles"|dialSign|parlourPlan/.test(pub))
  assertNothingLeaked()
})

test('L03 with forceRehearsal (the default) the night gets a rehearsal case and reads nothing sealed', async () => {
  const { db, nightId } = await party()
  assert.equal(night(db, nightId).forceRehearsal, true)
  const reads = watchReads(db)
  await toPower(db, nightId, 2_000_000)
  const c = db.store.get(`cases/${nightId}`)
  assert.equal(c.rehearsal, true)
  assert.equal(night(db, nightId).rehearsal, true)
  assert.equal(night(db, nightId).caseWarning, null)
  assert.deepEqual(c.parlourPlan.leans, {}, 'a rehearsal never reads the lean table')
  assert.deepEqual(reads.filter(p => p.startsWith('sealed/')), [])
  assertNothingLeaked()
})

test('L02 the case log is counts only: the night id and the rehearsal flag, never a motive, a role or a lean', async () => {
  const lines = []
  for (const partyNight of [true, false]) {
    const { db, nightId } = await party({ partyNight })
    const c = await buildCaseForNight(db, nightId, { now: 3_000_000, log: l => lines.push(l) })
    const logged = JSON.parse(lines.at(-1).replace(/^case /, ''))
    assert.deepEqual(logged, { nightId, rehearsal: !partyNight })
    assert.equal(c.rehearsal, !partyNight)
  }
  assert.equal(lines.length, 2)
  for (const l of lines) assert.ok(!/motive|murderer|ghost|synthetic/.test(l))
  assertNothingLeaked()
})

test('a roster whose traces have no partner sets caseWarning trace-partner, and that is the only warning', async () => {
  // the two Professors share no bucket
  const { db, nightId } = await party({ guests: ['Jon', 'Susan'] })
  await buildCaseForNight(db, nightId, { now: 4_000_000, log: () => {} })
  assert.equal(night(db, nightId).caseWarning, 'trace-partner')
  const both = await party({ partyNight: true, guests: ['Jon', 'Susan'] })
  await buildCaseForNight(both.db, both.nightId, { now: 4_000_001, log: () => {} })
  assert.equal(night(both.db, both.nightId).caseWarning, 'trace-partner')
  assertNothingLeaked()
})

// ---- dealing through one path -------------------------------------------

async function wholeNight({ partyNight }) {
  const { db, nightId, uids } = await party({ partyNight })
  // a throwaway packing in brackets: every bag has two words, each word in two or three bags
  db.store.set('sealed/bags', { words: Object.fromEntries(Array.from({ length: 10 }, (_, i) => [String(i + 1), { [`(synthetic-${i % 4})`]: ['touch'], [`(synthetic-${4 + (i % 3)})`]: ['smell'] }])) })
  const now = 5_000_000
  const next = () => hostCommand(db, { nightId, command: 'next', now })
  await toPower(db, nightId, now)
  const c = db.store.get(`cases/${nightId}`)
  await next() // news
  await next() // peek
  await next() // cat
  await walkLights(db, nightId, { now }) // everyone sees all four cats: supper on its own
  await next() // act 3: down
  await next() // the bulletin armed
  await hostCommand(db, { nightId, command: 'start-act4', now })
  await next() // the group cards
  await next() // round 1
  await next() // round 2: every room of round 1 paid at the chime
  return { db, nightId, uids, c: db.store.get(`cases/${nightId}`) }
}

test('a whole party night: every cat\'s card is the cat, its room, its open hint line and its bag clue; no safe, no numbers, no document', async () => {
  const { db, nightId, uids, c } = await wholeNight({ partyNight: true })
  assert.equal(c.rehearsal, false)
  let clues = 0
  for (const uid of Object.values(uids)) {
    const all = cards(db, uid, 'testimony')
    assert.equal(all.length, 4, 'all four cats give real information (23 Oct)')
    for (const t of all) {
      assert.deepEqual(Object.keys(t).sort(), ['act', 'at', 'bag', 'beat', 'cat', 'catName', 'hint', 'id', 'kind', 'lines', 'placeholder', 'room', 'saved'])
      assert.equal(t.kind, 'testimony')
      assert.deepEqual(t.lines, [], 'no opener, no middle, no closer')
      assert.equal(t.catName, CAT_NAMES[t.cat]); assert.equal(t.room, CAT_ROOMS[t.cat])
      assert.ok(t.hint.text && t.hint.placeholder === false, 'the open hint line')
      assert.ok(t.bag.text && t.bag.placeholder === false, 'the bag clue, filled from the packing')
      assert.ok(!/___|\[sense|\[[A-Z]+\]/.test(t.hint.text + t.bag.text), 'no blank left in either')
      assert.equal(t.placeholder, false)
      assert.equal(t.saved, 'Saved to your Clues.')
    }
    assert.equal(cards(db, uid, 'puzzle').length, 0, 'no safe')
    assert.equal(cards(db, uid, 'document').length, 0, 'no document')
    assert.ok(!cards(db, uid, 'notice').some(n => n.key === 'scrap'), 'no scrap of paper')
    for (const k of cards(db, uid, 'clue')) {
      clues++
      assert.equal(k.placeholder, false); assert.ok(k.text.length > 10)
      if (k.room) assert.ok(k.bag?.text && !/___|\[sense/.test(k.bag.text), 'each room pays a filled bag hint about the Ghost')
      if (k.room === 'library' || k.room === 'entryway') assert.ok(MOTIVES.some(m => m.n === k.cross), 'Zimothy and Boo cross off a motive')
    }
    assert.equal(db.store.get(`sessions/${uid}`).solved, undefined)
  }
  assert.equal(db.store.get(`nights/${nightId}/private/puzzles`), undefined, 'no safe numbers kept anywhere')
  assert.ok(clues >= 2, 'round 1\'s rooms were paid')
  // what the bag clues named is kept in the case for the checks, never on a public doc
  assert.equal(Object.keys(c.bagClues.act2).length, Object.keys(uids).length)
  assertNothingLeaked()
})

test('F28 the same walk on a rehearsal night: every hint and bag clue is a bracketed stand-in, the study clue is marked placeholder', async () => {
  const { db, uids, c } = await wholeNight({ partyNight: false })
  assert.equal(c.rehearsal, true)
  for (const uid of Object.values(uids)) {
    for (const t of cards(db, uid, 'testimony')) {
      assert.deepEqual(t.lines, [])
      assert.match(t.hint.text, /^\[\w+'s motive hint appears here\]$/)
      assert.match(t.bag.text, /^\[\w+'s bag clue about the Murderer appears here\]$/)
      assert.equal(t.placeholder, true)
    }
    for (const k of cards(db, uid, 'clue')) assert.equal(k.placeholder, true)
  }
  assert.equal(c.bagClues, undefined, 'a rehearsal reads no packing and records no fill')
  assert.equal(studyClueCard(c, 4, 'round1').placeholder, true)
  // a case with no family for the guest carries the marked stand-in, and its card says so
  const { hint } = hintLine(null, null, { cat: 'boo' })
  assert.equal(hint.text, HINT_PLACEHOLDER)
  const card = catHintCard({ id: 'x', act: 2, beat: 'cat', cat: 'boo', hint })
  assert.equal(card.placeholder, true)
  assert.deepEqual(card.lines, [])
  assertNothingLeaked()
})

test('G59 a missing hint: the house\'s note on a rehearsal, the house\'s plain words on the party night, never a note; a hole in the bank counts as missing', () => {
  const party = hintLine({ rehearsal: false, motive: 1 }, null, { cat: 'boo' })
  assert.deepEqual(party, { hint: { text: 'Miss Boo LaRue has nothing to tell you about the motive.', placeholder: false, none: true }, ruled: null })
  assert.equal(party.hint.text, HINT_QUIET.replace('[CAT]', CAT_NAMES.boo))
  assert.ok(!/[()[\]]/.test(party.hint.text), 'no note in brackets on the party night')
  assert.equal(catHintCard({ id: 'x', act: 2, beat: 'cat', cat: 'boo', hint: party.hint }).placeholder, false, 'a card the phone shows plain')
  for (const cat of ['granolia', 'salem', 'zimothy']) assert.equal(hintLine({ rehearsal: false }, null, { cat }).hint.text, `${CAT_NAMES[cat]} has nothing to tell you about the motive.`)
  const rehearsal = hintLine({ rehearsal: true, motive: 1 }, null, { cat: 'boo' })
  assert.deepEqual(rehearsal.hint, { text: HINT_PLACEHOLDER, placeholder: true, none: true })
  // a family the bank has no line for throws inside the cats' code: missing, not a crash
  const broken = hintLine({ rehearsal: false, motive: 1 }, 'no-such-family', { cat: 'salem', level: 2 })
  assert.equal(broken.hint.none, true)
  assert.equal(broken.ruled, null)
})

test('G59 a guest the case has no family for: on the party night all four cats say the house\'s plain words, on a rehearsal the note; the Host tab is told a count, and everyone else hears a real line', async () => {
  for (const partyNight of [true, false]) {
    const { db, nightId, uids } = await party({ partyNight })
    db.store.set('sealed/bags', { words: Object.fromEntries(Array.from({ length: 10 }, (_, i) => [String(i + 1), { [`(synthetic-${i % 4})`]: ['touch'], [`(synthetic-${4 + (i % 3)})`]: ['smell'] }])) })
    const now = 5_000_000
    const next = () => hostCommand(db, { nightId, command: 'next', now })
    await toPower(db, nightId, now)
    await next() // news
    await next() // peek
    // a case with no family left for Jon: none of his own, and every wrong family taken by the news
    const c = db.store.get(`cases/${nightId}`)
    const wrong = FAMILIES.map(f => f.key).filter(k => k !== c.solving.family)
    await db.doc(`cases/${nightId}`).update({ 'solving.newsOut': wrong, 'solving.hints.jon': [] })
    await next() // cat
    await walkLights(db, nightId, { now })
    const jon = cards(db, uids.jon, 'testimony')
    assert.equal(jon.length, 4, 'all four cats still see him')
    for (const t of jon) {
      assert.equal(t.hint.none, true)
      if (partyNight) {
        assert.equal(t.hint.text, `${CAT_NAMES[t.cat]} has nothing to tell you about the motive.`)
        assert.equal(t.hint.placeholder, false)
        assert.equal(t.placeholder, false)
        assert.ok(!/[()[\]]/.test(t.hint.text), 'never a note in brackets')
      } else {
        assert.equal(t.hint.text, HINT_PLACEHOLDER)
        assert.equal(t.placeholder, true)
      }
    }
    for (const [name, uid] of Object.entries(uids)) {
      if (name === 'jon') continue
      for (const t of cards(db, uid, 'testimony')) assert.ok(!t.hint.none && t.hint.text, `${name} hears a real line`)
    }
    // the Host tab: one count a card, never which cat or which guest
    assert.deepEqual(night(db, nightId).missingLines, { hint: 4 })
    assert.equal(db.store.get(`cases/${nightId}`).solving.ruled?.['jon-boo'], undefined, 'nothing ruled out for the solver')
  }
  assertNothingLeaked()
})

test('createNight: nights rehearse by default; the party checkbox or an explicit caller makes it the party', async () => {
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

test('L02 the seal, after everything: nothing from the lean table ever reached the console', () => {
  assertNothingLeaked()
})
