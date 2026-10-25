import { test } from 'node:test'
import assert from 'node:assert/strict'
import { FakeFirestore } from './fake-firestore.mjs'
import { createNight, join, CHARACTERS, MOTIVES } from '../lib/night.js'
import { rehearsalCase, buildCase } from '../lib/case.js'
import { FAMILIES, familyOf, irwinOptions } from '../lib/families.js'
import { NEWS, bulletin2 } from '../lib/news.js'
import { hintLine as catHintLine, HINT_CATS } from '../lib/cats.js'
import { wordBags } from '../lib/bagclues.js'
import {
  caseChecks, CHECK_NAMES, rolesOk, castOk, bulletin2Ok, salemAloneOk, irwinWinsOk, murdererHiddenOk, spillChecks, SPILL_IDS,
  fairnessChecks, standInRoster, HOST_SEATS,
} from '../lib/checks.js'

// The case-level checks `npm run checks` runs on every stand-in case
// (functions/lib/checks.js): G01, G03, G04, G05, G06, G09, G17, G19, G20,
// G21, G23 and G53. Every case here is a throwaway rehearsal case made and
// dropped inside the test, every packing is made of bracketed stand-in
// words. A failing assertion names the check and a seed, never a clue, a
// role or a motive.

// A small seeded generator, so a failing seed can be replayed: rng(n) is in [0, n).
function seeded(seed) {
  let x = (seed * 2654435761) >>> 0 || 1
  return n => { x ^= x << 13; x >>>= 0; x ^= x >>> 17; x ^= x << 5; x >>>= 0; return x % n }
}

// A throwaway packing in the sealed shape, made the way the bag rules make one
// (docs/sensory-bags.md): every bag holds one food (it smells, it tastes, its
// wrapper rustles), one touch item and two or three extras, each a bracketed
// stand-in word from a small pool, so most words sit in two or three bags.
const SENSES = ['sight', 'sound', 'smell', 'touch', 'taste']
function packing(seed) {
  const rng = seeded(seed + 31)
  const words = {}
  for (let n = 1; n <= 10; n++) {
    const bag = words[String(n)] = {}
    bag[`(food ${rng(4)})`] = ['smell', 'taste', 'sound']
    bag[`(touch ${rng(4)})`] = ['touch']
    const extras = 2 + rng(2)
    for (let i = 0; i < extras; i++) bag[`(extra ${rng(8)})`] = [SENSES[rng(5)]]
  }
  return { words }
}

// One stand-in case: a roster of n guests (the two host seats among them), the deal, a packing.
function standIn(seed, n = 4 + (seed % 9)) {
  const rng = seeded(seed)
  const roster = standInRoster(n, rng)
  const c = rehearsalCase({ roster, rng })
  return { rng, roster, c, packing: packing(seed) }
}
const resultOf = (results, id) => results.find(r => r.id === id)

test('every new case check has a plain name for the Health page', () => {
  for (const id of ['G01', 'G03', 'G04', 'G05', 'G06', 'G09', 'G17', 'G19', 'G20', 'G21', 'G23', 'G53']) {
    assert.ok(typeof CHECK_NAMES[id] === 'string' && CHECK_NAMES[id].length > 10, `${id} has a name`)
  }
})

test('the case checks pass on 200 stand-in cases of 4 to 12 guests, with a packing, and say nothing but pass or fail', () => {
  const bad = {}
  for (let seed = 1; seed <= 200; seed++) {
    const { rng, roster, c, packing: p } = standIn(seed)
    const results = caseChecks(c, { roster, packing: p, rng })
    for (const r of results) {
      assert.deepEqual(Object.keys(r).sort(), ['id', 'pass'], 'a result is an id and a pass, nothing else')
      if (!r.pass) bad[r.id] = (bad[r.id] ?? 0) + 1
    }
    for (const id of ['G01', 'G03', 'G04', 'G09', 'G17', 'G19', 'G20', 'G21', 'G23', 'G53']) assert.ok(resultOf(results, id), `${id} runs on every case`)
  }
  assert.deepEqual(Object.keys(bad), [], `checks that failed somewhere: ${Object.keys(bad).join(' ')}`)
})

// ---- G01 ---------------------------------------------------------------------

test('G01 exactly one Murderer and one Ghost, two different guests, everyone else a Detective (1,000 deals, 2 to 14 guests, party and rehearsal)', () => {
  for (let seed = 1; seed <= 1000; seed++) {
    const rng = seeded(seed)
    const n = 2 + (seed % 13)
    const roster = standInRoster(n, rng)
    const c = (seed % 2 ? buildCase : rehearsalCase)({ roster, rng })
    const keys = roster.map(g => g.key)
    assert.ok(rolesOk(c, keys), `G01 seed ${seed}`)
    assert.equal(Object.values(c.roles).filter(r => r === 'detective').length, n - 2, `G01 seed ${seed}: the rest are Detectives`)
  }
  // the check bites: two Murderers, or one guest as both, fails
  const { c, roster } = standIn(7)
  const keys = roster.map(g => g.key)
  const other = keys.find(k => k !== c.murderer && k !== c.ghost)
  assert.equal(rolesOk({ ...c, roles: { ...c.roles, [other]: 'murderer' } }, keys), false, 'G01 two Murderers fail')
  assert.equal(rolesOk({ ...c, ghost: c.murderer }, keys), false, 'G01 one guest as both fails')
  assert.equal(rolesOk({ ...c, roles: { ...c.roles, [other]: 'butler' } }, keys), false, 'G01 a fourth role fails')
})

// ---- G03 ---------------------------------------------------------------------

test('G03 characters not in play leave no trace and no clue: every role, hint, the victim and both trace reveals belong to guests in play (1,000 deals)', () => {
  const notInPlayTraces = new Set()
  for (let seed = 1; seed <= 1000; seed++) {
    const { rng, roster, c } = standIn(seed)
    assert.ok(castOk(c, roster, rng), `G03 seed ${seed}`)
    const inPlay = new Set(roster.map(g => g.characterId))
    for (const ch of CHARACTERS) if (!inPlay.has(ch.id)) notInPlayTraces.add(ch.trace)
  }
  assert.ok(notInPlayTraces.size >= 10, 'the deals left most characters out at one time or another, so the check had something to catch')
  // the check bites
  const { rng, roster, c } = standIn(11, 5)
  const outside = CHARACTERS.find(ch => !roster.some(g => g.characterId === ch.id))
  assert.equal(castOk({ ...c, victimCharacterId: outside.id }, roster, rng), false, 'G03 a victim who is not at the party fails')
  assert.equal(castOk({ ...c, solving: { ...c.solving, hints: { ...c.solving.hints, nobody: ['food', 'out'] } } }, roster, rng), false, 'G03 a hint for a guest who is not at the party fails')
  assert.equal(castOk({ ...c, roles: { ...c.roles, nobody: 'detective' } }, roster, rng), false, 'G03 a role for a guest who is not at the party fails')
})

// ---- G04 ---------------------------------------------------------------------

test('G04 the motive is one of the nineteen, and motive 8 is dealt like the others, with the same open hint lines', () => {
  let eights = 0
  for (let seed = 1; seed <= 1000; seed++) {
    const { c } = standIn(seed)
    assert.ok(Number.isInteger(c.motive) && MOTIVES.some(m => m.n === c.motive), `G04 seed ${seed}`)
    if (c.motive === 8) eights++
  }
  const { rng: r1, roster: o1, c: c1 } = standIn(1)
  assert.ok(resultOf(caseChecks(c1, { roster: o1, rng: r1, reroll: false }), 'G04').pass, 'G04 the case check passes a dealt case')
  assert.ok(eights > 0, 'motive 8 is dealt')
  // motive 8 gets the same open hint lines as any other: a line from every cat at every level
  const c8 = { motive: 8, solving: { family: familyOf(8), newsOut: [], hints: {} } }
  for (const family of FAMILIES.map(f => f.key).filter(k => k !== familyOf(8))) {
    for (const cat of HINT_CATS) for (let level = 1; level <= 5; level++) {
      assert.ok(catHintLine(c8, { cat, level, act: 2, family, seed: 'g04' }).text, `G04 motive 8 has its ${cat} line at level ${level}`)
    }
  }
  // the check bites
  const { rng, roster, c } = standIn(3)
  for (const motive of [0, 20, '8b', null]) assert.equal(resultOf(caseChecks({ ...c, motive }, { roster, rng, reroll: false }), 'G04').pass, false, 'G04 a motive outside the nineteen fails')
})

// ---- G05 and G06 ---------------------------------------------------------------

test('G05 every seat, both host seats included, lands Murderer and Ghost about equally often (3,000 deals, 4 to 12 guests)', () => {
  const [g05] = fairnessChecks({ count: 3000, rng: seeded(2026) })
  assert.equal(g05.id, 'G05')
  assert.ok(g05.pass, `G05: ${g05.count} of ${g05.of} seats fair`)
  assert.equal(g05.of, 12, 'twelve seats, the two host seats among them')
  // the host seats sit on the Professors in every stand-in roster
  const profs = CHARACTERS.filter(ch => ch.host).map(ch => ch.id)
  for (let seed = 1; seed <= 50; seed++) {
    const roster = standInRoster(4 + (seed % 9), seeded(seed))
    assert.deepEqual(HOST_SEATS.map(k => roster.find(g => g.key === k)?.characterId), profs, 'the hosts play the Professors')
    assert.equal(new Set(roster.map(g => g.characterId)).size, roster.length, 'every guest a different character')
  }
  // the check bites: a deal that never makes a host the Murderer is caught
  const rigged = ({ roster, rng }) => {
    const c = rehearsalCase({ roster, rng })
    if (!HOST_SEATS.includes(c.murderer)) return c
    const swap = roster.map(g => g.key).find(k => !HOST_SEATS.includes(k) && k !== c.ghost)
    return { ...c, murderer: swap, roles: { ...c.roles, [c.murderer]: 'detective', [swap]: 'murderer' } }
  }
  assert.equal(fairnessChecks({ count: 3000, rng: seeded(2026), deal: rigged })[0].pass, false, 'G05 a deal that spares the hosts fails')
})

test('G06 all nineteen motives turn up in fair shares across the deals', () => {
  const [, g06] = fairnessChecks({ count: 3000, rng: seeded(1511) })
  assert.equal(g06.id, 'G06')
  assert.ok(g06.pass, `G06: ${g06.count} of ${g06.of} motives fair`)
  assert.equal(g06.of, MOTIVES.length)
  const rigged = ({ roster, rng }) => ({ ...rehearsalCase({ roster, rng }), motive: 1 + rng(10) })
  assert.equal(fairnessChecks({ count: 3000, rng: seeded(1511), deal: rigged })[1].pass, false, 'G06 a deal that never draws ten of the motives fails')
})

test('G06 all fourteen characters turn up in fair shares: the hosts always the Professors, the other twelve drawn evenly', async () => {
  // the draw is the night's own: createNight shuffles the twelve, every guest takes the next one
  const db = new FakeFirestore()
  db.store.set('meta/game', { host_jonathan: 'Jon', host_susan: 'Susan' })
  const drawn = Object.fromEntries(CHARACTERS.filter(ch => !ch.host).map(ch => [ch.id, 0]))
  const NIGHTS = 600, GUESTS = 6
  for (let i = 0; i < NIGHTS; i++) {
    const { nightId } = await createNight(db)
    const order = db.store.get(`nights/${nightId}/private/deck`).order
    assert.equal(order.length, 12, 'the deck holds the twelve, never a Professor')
    for (const id of order.slice(0, GUESTS)) drawn[id]++
  }
  const share = (NIGHTS * GUESTS) / 12
  const spread = 4 * Math.sqrt(NIGHTS * GUESTS * (1 / 12) * (11 / 12))
  for (const [id, n] of Object.entries(drawn)) assert.ok(Math.abs(n - share) <= spread, `G06 character ${CHARACTERS.findIndex(ch => ch.id === id) + 1} of 14 drawn about as often as the rest`)
  // and the guests take the deck in order, the hosts the Professors
  const { nightId } = await createNight(db)
  const order = db.store.get(`nights/${nightId}/private/deck`).order
  const names = ['Jessa', 'Jon', 'Jacob', 'Susan', 'Marie']
  for (const [i, name] of names.entries()) await join(db, { uid: `u-${i}`, nightId, name })
  const roster = db.store.get(`nights/${nightId}`).roster
  assert.deepEqual(['jessa', 'jacob', 'marie'].map(k => roster[k].characterId), order.slice(0, 3), 'every other guest takes the next card in the deck')
  assert.deepEqual(['jon', 'susan'].map(k => roster[k].characterId), CHARACTERS.filter(ch => ch.host).map(ch => ch.id), 'the hosts play the Professors')
})

// ---- G09 ---------------------------------------------------------------------

test('G09 no single clue before Act 6 gives away the Murderer: the study never shows their trace, Irwin names motives only, every bag clue fits two bags or more (1,000 deals)', () => {
  for (let seed = 1; seed <= 1000; seed++) {
    const { rng, roster, c, packing: p } = standIn(seed)
    assert.ok(murdererHiddenOk(c, roster, p, rng), `G09 seed ${seed}`)
  }
  // the check bites: a study that shows the Murderer's own trace, or a bag clue word only one bag holds
  const { rng, roster, c, packing: p } = standIn(5, 6)
  assert.equal(murdererHiddenOk({ ...c, ghost: c.murderer }, roster, p, rng), false, 'G09 the study showing the Murderer\'s trace fails')
  const bag = roster.find(g => g.key === c.murderer).bag
  // a plan whose true word only the Murderer's bag holds (bagPlan never makes one; the check must still catch it)
  const lonely = { words: Object.fromEntries(Object.entries(p.words).map(([n, w]) => [n, Number(n) === Number(bag) ? { '(only here)': ['touch'], ...w } : w])) }
  const inPlay = [...new Set(roster.map(g => Number(g.bag)))]
  assert.equal((wordBags(lonely, inPlay)['(only here)'] ?? []).length, 1, 'the stand-in word sits in one bag in play')
  assert.equal(murdererHiddenOk(c, roster, lonely, rng, { plan: () => ({ truth: '(only here)', wrong: null, sense: 'touch' }) }), false, 'G09 a bag clue only the Murderer\'s bag fits fails')
})

// Found 25 Oct 2026 (card 479): with the packer's own packings of the seed list, in parties of four to
// six guests, about 1 deal in 1,000 has a cat's low-rung bag clue (it names only a sense, because the
// Murderer's bag holds no clue word among the bags in play) name a sense the Murderer's bag alone holds
// among the bags in play. None at eight guests or more. Not changed: it needs Jon's call (the bag rules).
test.todo('G09 a bag clue that names only a sense never names one the Murderer\'s bag alone holds among the bags in play (fails in parties of four to six, about 1 deal in 1,000; needs Jon\'s call)')

// ---- G17 ---------------------------------------------------------------------

test('G17 Salem\'s ladder for every guest, and no case is solvable from Salem\'s lines alone: everything he says to the whole room leaves two motives or more (1,000 deals)', () => {
  for (let seed = 1; seed <= 1000; seed++) {
    const { roster, c } = standIn(seed)
    assert.ok(salemAloneOk(c, roster.map(g => g.key)), `G17 seed ${seed}`)
  }
  // why it holds: Salem only ever speaks of wrong families, and every family has two motives or more,
  // so even a room whose Salems ruled out every wrong family is left with the whole real family
  assert.ok(FAMILIES.every(f => f.motives.length >= 2), 'G17 every family holds two motives or more')
  // the check bites: a guest told about the real family gets no Salem line, which fails
  const { roster, c } = standIn(9, 9)
  const first = roster[0].key
  const told = { ...c, solving: { ...c.solving, hints: { ...c.solving.hints, [first]: [c.solving.family, c.solving.family] } } }
  assert.equal(salemAloneOk(told, roster.map(g => g.key)), false, 'G17 a Salem line about the real family fails')
})

// ---- G19 ---------------------------------------------------------------------

test('G19 if Sir Irwin and a cat disagree, Irwin is the one telling the truth (500 deals, every cat, every level, every band)', () => {
  for (let seed = 1; seed <= 500; seed++) {
    const { roster, c } = standIn(seed)
    assert.ok(irwinWinsOk(c, roster.map(g => g.key)), `G19 seed ${seed}`)
  }
  // the check bites: an Irwin whose cards miss the real motive is caught
  const { roster, c } = standIn(13, 7)
  const without = band => irwinOptions(c, { band, seed: c.screenSalt }).filter(n => n !== Number(c.motive))
  assert.equal(irwinWinsOk(c, roster.map(g => g.key), { irwin: without }), false, 'G19 cards without the real motive fail')
})

// ---- G20 and G21 ---------------------------------------------------------------

test('G20 everyone is in exactly one pair or trio, and G21 the Murderer and the Ghost are never in one group (300 deals, 4 to 12 guests)', () => {
  for (let seed = 1; seed <= 300; seed++) {
    const { rng, roster, c } = standIn(seed)
    const results = caseChecks(c, { roster, rng, reroll: false })
    assert.ok(resultOf(results, 'G20').pass, `G20 seed ${seed}`)
    assert.ok(resultOf(results, 'G21').pass, `G21 seed ${seed}`)
  }
})

// ---- G23 ---------------------------------------------------------------------

test('G23 Spill the Beans: the Murderer stays, the motive and the Ghost change, and the new story passes G01 to G21 (300 deals)', () => {
  assert.deepEqual(SPILL_IDS, ['G01', 'G03', 'G04', 'G09', 'G17', 'G19', 'G20', 'G21'])
  for (let seed = 1; seed <= 300; seed++) {
    const { rng, roster, c, packing: p } = standIn(seed)
    assert.ok(spillChecks(c, { roster, packing: p, rng }), `G23 seed ${seed}`)
  }
})

// ---- G53 ---------------------------------------------------------------------

test('G53 every bulletin 2 line, for every family and every level, is the real family\'s own line for that level', () => {
  // the bank: five lines a family, twenty-five in all, no line or recording shared between families
  const all = Object.values(NEWS.bulletin2.families).flat()
  assert.equal(Object.keys(NEWS.bulletin2.families).sort().join(), FAMILIES.map(f => f.key).sort().join(), 'G53 a set of lines for every family')
  assert.equal(all.length, 25, 'G53 twenty-five lines')
  assert.equal(new Set(all.map(l => l.text)).size, 25, 'G53 no line is shared by two families')
  assert.equal(new Set(all.map(l => l.clip)).size, 25, 'G53 no recording is shared by two families')
  // every motive as the real one, every band: the line that plays is that family's, at that level
  for (const m of MOTIVES) {
    const family = familyOf(m.n)
    const c = { motive: m.n, solving: { family } }
    assert.ok(bulletin2Ok(c), `G53 motive ${m.n}`)
    for (let band = 1; band <= 5; band++) {
      const b = bulletin2(c, band)
      const own = NEWS.bulletin2.families[family][band - 1]
      assert.ok(!b.placeholder && b.level === band && b.lines[1] === own.text && b.clips[1] === own.clip, `G53 motive ${m.n} band ${band}`)
    }
  }
  // every stand-in case
  for (let seed = 1; seed <= 300; seed++) assert.ok(bulletin2Ok(standIn(seed).c), `G53 seed ${seed}`)
  // the check bites: a case whose real family is not the motive's own fails
  const { c } = standIn(17)
  const wrong = FAMILIES.map(f => f.key).find(k => k !== c.solving.family)
  assert.equal(bulletin2Ok({ ...c, solving: { ...c.solving, family: wrong } }), false, 'G53 the wrong family\'s lines fail')
})
