import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { FakeFirestore } from './fake-firestore.mjs'
import { createNight, join } from '../lib/night.js'
import { hostCommand, player } from '../lib/run.js'
import { NIGHT, ms } from '../lib/deal.js'
import { parlourPath } from '../lib/windows.js'
import {
  planParlour, configOf, rollTimes, stream, catMoves, applyMoves, clampAffection, stopOf, parlourAwards, SALEM_PARLOUR_MAX,
  fittingAnswer, LISTENERS, PARLOUR_ACTS, SIZES, AFFECTION_MIN, AFFECTION_MAX,
} from '../lib/parlour.js'

// The Parlour Games checks from docs/parlour-games.md (G25 to G31). Every
// case here is a throwaway: seeds are made up in the loop, the bank ids are
// stand-ins, no lean table is real, and nothing is printed.

const BANK = JSON.parse(readFileSync(new URL('../../seed/parlour-games.json', import.meta.url), 'utf8')).sets
const IDS = BANK.map(s => s.key)
const CFG = configOf(NIGHT.parlour)
const plans = (n, extra = {}) => Array.from({ length: n }, (_, i) => planParlour({ seed: `seed-${i}`, bankIds: IDS, config: NIGHT.parlour, ...extra }))
const slotsOf = (p) => PARLOUR_ACTS.flatMap(act => p.acts[act])

test('G25 each case uses 12 different sets from the bank, planned five, five and two in Acts 2, 4 and 6; every set is picked about equally often across 1,000 cases', () => {
  assert.equal(BANK.length, 17)
  const counts = Object.fromEntries(IDS.map(id => [id, 0]))
  for (const p of plans(1000)) {
    for (const act of PARLOUR_ACTS) assert.equal(p.acts[act].length, CFG.counts[act], `${CFG.counts[act]} in Act ${act}`)
    const ids = slotsOf(p).map(s => s.setId)
    assert.equal(ids.length, 12)
    assert.equal(new Set(ids).size, 12, 'no set twice in one night')
    for (const id of ids) counts[id]++
  }
  const expected = (1000 * 12) / 17
  for (const [id, n] of Object.entries(counts)) assert.ok(Math.abs(n - expected) < expected * 0.15, `${id} picked ${n} times, expected about ${Math.round(expected)}`)
})

test('G25b Parlour Game times follow the spacing rules (never back to back in Acts 2 and 4; Act 6\'s two at the start), and the same seed gives the same sets at the same times', () => {
  const gap = CFG.minGapMin * 60_000, edge = CFG.edgeMin * 60_000
  assert.deepEqual(NIGHT.parlour.counts, { 2: 5, 4: 5, 6: 2 }, 'G25: five, five and two')
  for (const p of plans(500)) {
    assert.deepEqual(p.acts[6].map(s => s.atMs), [0, NIGHT.parlour.startGapSec * 1000], 'Act 6: both at the start, one short gap apart')
    for (const act of PARLOUR_ACTS.filter(a => a !== 6)) {
      const times = p.acts[act].map(s => s.atMs)
      const length = CFG.actMinutes[act] * 60_000
      times.forEach((t, i) => {
        assert.ok(t >= edge && t <= length - edge, `Act ${act}: ${t} ms is inside the first or last ${CFG.edgeMin} minutes`)
        if (i) assert.ok(t - times[i - 1] >= gap - 1000, `Act ${act}: two games ${t - times[i - 1]} ms apart`)
      })
    }
  }
  const a = planParlour({ seed: 'tulip-4471', bankIds: IDS, config: NIGHT.parlour })
  const b = planParlour({ seed: 'tulip-4471', bankIds: IDS, config: NIGHT.parlour })
  assert.deepEqual(a, b, 'the same seed, the same night')
  assert.notDeepEqual(a, planParlour({ seed: 'tulip-4472', bankIds: IDS, config: NIGHT.parlour }))
  // an act too short for the gap still gets every game, as evenly as it can
  const tight = rollTimes(stream('x').unit, { minutes: 10, count: 4, gapMin: 4, edgeMin: 2 })
  assert.equal(tight.length, 4)
  tight.forEach((t, i) => { assert.ok(t >= 120_000 && t <= 480_000); if (i) assert.ok(t >= tight[i - 1]) })
})

test('G26 every question in the bank has exactly two answers, and every phone is dealt exactly two', async () => {
  for (const set of BANK) {
    assert.equal(set.beats.length, 3, set.key)
    for (const b of set.beats) {
      assert.ok(b.q && b.a && b.b, set.key)
      assert.equal(b.n, 2)
      assert.equal(b.c, undefined); assert.equal(b.d, undefined)
    }
  }
  // a workshop set written with a third choice is dealt with its first two
  const db = new FakeFirestore()
  db.store.set('meta/game', { host_jonathan: 'Jon' })
  db.store.set('safe_content/scenarios', { items: [{ id: 'x1', order: 0, text: '(x)', beats: [0, 1, 2].map(i => ({ q: `(Question ${i})`, n: 3, a: '(One)', av: 1, b: '(Two)', bv: -1, c: '(Three)', cv: 0 })) }] })
  const { nightId } = await createNight(db)
  for (let i = 0; i < 4; i++) await join(db, { uid: `u${i}`, nightId, name: `Guest ${i}` })
  await hostCommand(db, { nightId, command: 'act', arg: 2 })
  const { id } = await hostCommand(db, { nightId, command: 'light-up' })
  for (let i = 0; i < 4; i++) for (const b of db.store.get(`sessions/u${i}`).windows[id].beats) assert.deepEqual(b.choices.map(c => c.k), ['a', 'b'])
})

test('G27 Irwin is never the listening cat, and his affection never moves', () => {
  for (const p of plans(300)) for (const s of slotsOf(p)) for (const l of s.listeners) {
    assert.ok(LISTENERS.includes(l.cat)); assert.notEqual(l.cat, 'irwin')
    assert.ok(SIZES.includes(l.size)); assert.ok(['a', 'b'].includes(l.lean))
  }
  assert.deepEqual(catMoves({ listeners: [{ cat: 'irwin', size: 1, lean: 'a' }], picks: ['a'] }), {})
  assert.deepEqual(applyMoves({ irwin: 5 }, { irwin: -1 }), {})
})

test('G14 and G17 for Salem: the Parlour Games never take him above 4; only a guest who petted him goes higher', () => {
  assert.deepEqual(applyMoves({ salem: 4 }, { salem: 1 }), {}, 'capped at 4')
  assert.deepEqual(applyMoves({ salem: 3.5 }, { salem: 1 }), { salem: 4 })
  assert.deepEqual(applyMoves({ salem: 4 }, { salem: 1 }, { salemFriend: true }), { salem: 5 })
  assert.deepEqual(applyMoves({ salem: 5 }, { salem: -0.5 }, { salemFriend: true }), { salem: 4.5 })
  assert.deepEqual(applyMoves({ salem: 5 }, { salem: 0.5 }), {}, 'a petted 5 is never pulled down by the cap')
  assert.deepEqual(applyMoves({ boo: 4 }, { boo: 1 }), { boo: 5 }, 'the cap is Salem\'s alone')
  const { pick } = stream('salem-walk')
  for (let night = 0; night < 200; night++) {
    const p = planParlour({ seed: `salem-${night}`, bankIds: IDS, config: NIGHT.parlour })
    let aff = { salem: 3 }
    for (const s of slotsOf(p)) {
      aff = { ...aff, ...applyMoves(aff, catMoves({ listeners: s.listeners, picks: [0, 1, 2].map(() => (pick(2) ? 'a' : 'b')) })) }
      assert.ok(aff.salem <= 4, `night ${night}: Salem at ${aff.salem}`)
    }
  }
})

test('G28 every cat\'s affection stays between 1 and 5 all night, in half steps', () => {
  const { pick } = stream('walk')
  for (let night = 0; night < 200; night++) {
    const p = planParlour({ seed: `walk-${night}`, bankIds: IDS, config: NIGHT.parlour })
    let aff = Object.fromEntries(LISTENERS.map(c => [c, 1 + pick(5)]))
    for (const s of slotsOf(p)) {
      const picks = [0, 1, 2].map(() => (pick(2) ? 'a' : 'b'))
      aff = { ...aff, ...applyMoves(aff, catMoves({ listeners: s.listeners, picks })) }
      for (const v of Object.values(aff)) {
        assert.ok(v >= AFFECTION_MIN && v <= AFFECTION_MAX, `affection ${v}`)
        assert.equal(v * 2, Math.round(v * 2), 'half steps only')
        assert.ok(stopOf(v) >= 1 && stopOf(v) <= 5 && Number.isInteger(stopOf(v)))
      }
    }
  }
  assert.equal(clampAffection(5.5), 5); assert.equal(clampAffection(0.5), 1); assert.equal(clampAffection('x'), 3)
  assert.equal(stopOf(2.5), 3); assert.equal(stopOf(3.5), 4); assert.equal(stopOf(1), 1)
})

test('G29 the Murderer\'s and the Ghost\'s affection moves with the same odds and sizes as a Detective\'s, across 1,000 cases', () => {
  const tally = () => ({ warm: 0, cool: 0, half: 0, full: 0 })
  const det = tally(), hid = tally()
  const { pick } = stream('g29')
  for (const [i, p] of plans(1000).entries()) {
    for (const s of slotsOf(p)) {
      // one question at a time: a cat heard twice in one set would net its two moves
      s.listeners.forEach((l, q) => {
        const one = [l]
        const picks = [pick(2) ? 'a' : 'b'] // a Detective who answers as they please
        const d = catMoves({ listeners: one, picks })[l.cat]
        const h = catMoves({ listeners: one, picks, hidden: true, seed: p.seed, windowId: `w${i}-${q}`, key: 'k' })[l.cat]
        for (const [t, v] of [[det, d], [hid, h]]) { t[v > 0 ? 'warm' : 'cool']++; t[Math.abs(v) === 0.5 ? 'half' : 'full']++ }
      })
    }
  }
  const share = (t, k, of) => t[k] / (t[of[0]] + t[of[1]])
  for (const [k, of] of [['warm', ['warm', 'cool']], ['half', ['half', 'full']]]) {
    const a = share(det, k, of), b = share(hid, k, of)
    assert.ok(Math.abs(a - b) < 0.02, `${k}: detectives ${a.toFixed(3)}, hidden roles ${b.toFixed(3)}`)
  }
  assert.ok(Math.abs(share(hid, 'warm', ['warm', 'cool']) - 0.5) < 0.02, 'the coin is fair')
  assert.ok(Math.abs(share(hid, 'half', ['half', 'full']) - 0.5) < 0.02, 'a little and a lot are equally likely')
})

test('G30 each cat leans toward its fitting answer about 75% of the time (65 to 85%)', () => {
  const leans = Object.fromEntries(IDS.map(id => [id, { 0: { granolia: 'a', boo: 'a', zimothy: 'a', salem: 'a' }, 1: { granolia: 'b', boo: 'b', zimothy: 'b', salem: 'b' }, 2: { granolia: 'a', boo: 'b', zimothy: 'a', salem: 'b' } }]))
  const byCat = Object.fromEntries(LISTENERS.map(c => [c, { fits: 0, all: 0 }]))
  for (const p of plans(1000, { leans })) for (const s of slotsOf(p)) s.listeners.forEach((l, q) => {
    const fit = fittingAnswer(leans, p.seed, s.setId, q, l.cat)
    assert.equal(l.fits, l.lean === fit, 'the plan says which way it leaned, and it did')
    byCat[l.cat].all++; if (l.lean === fit) byCat[l.cat].fits++
  })
  for (const [cat, { fits, all }] of Object.entries(byCat)) {
    const share = fits / all
    assert.ok(share >= 0.65 && share <= 0.85, `${cat} leaned toward its fitting answer ${(share * 100).toFixed(1)}% of the time`)
  }
  // a question Jenna has not filled in yet still has a fitting answer, the same one every time
  assert.equal(fittingAnswer({}, 's', 'x', 0, 'boo'), fittingAnswer(null, 's', 'x', 0, 'boo'))
  assert.equal(fittingAnswer({ x: { 0: { boo: 'b' } } }, 's', 'x', 0, 'boo'), 'b')
})

test('G31 the awards compare guests with each other from their own answers only: never the cats\' leans, never a missed window', () => {
  const answers = {
    ann: { w1: { picks: ['a', 'a', 'a'] }, w2: { picks: ['a', 'b', 'a'] } },
    bob: { w1: { picks: ['a', 'a', 'a'] }, w2: { picks: ['a', 'b', 'a'] } },
    cat: { w1: { picks: ['a', 'a', 'b'] }, w2: { picks: ['a', 'b', 'b'] } },
    dan: { w1: { picks: ['b', 'b', 'b'] }, w2: { picks: ['b', 'a', 'b'] } },
    eve: { w1: { picks: ['b', 'b', 'b'], defaulted: true }, w2: { picks: ['a', 'a', 'a'], defaulted: true } },
  }
  const a = parlourAwards(answers)
  assert.deepEqual(a.rebel, ['dan'], 'sided with the smaller group most often')
  assert.deepEqual(a.crowd, ['ann', 'bob', 'cat'], 'a tie shows everyone tied')
  assert.deepEqual(a.kindred, [['ann', 'bob']])
  assert.deepEqual(a.rivals, [['ann', 'dan'], ['bob', 'dan']])
  assert.ok(![...a.rebel, ...a.crowd, ...a.kindred.flat(), ...a.rivals.flat()].includes('eve'), 'answers picked for a missed window do not count')
  // the function takes the answers and nothing else: there is no lean to pass it
  assert.equal(parlourAwards.length, 1)
  assert.deepEqual(parlourAwards({}), { rebel: [], crowd: [], kindred: [], rivals: [] })
  const same = { ann: { w1: { picks: ['a', 'a', 'a'] } }, bob: { w1: { picks: ['a', 'a', 'a'] } }, cat: { w1: { picks: ['a', 'a', 'a'] } } }
  assert.deepEqual(parlourAwards(same), { rebel: [], crowd: [], kindred: [], rivals: [] }, 'an award everybody would win is not given')
})

test('a Detective\'s answer warms the listening cat when it matches the lean and cools it when it does not, by the plan\'s size', async () => {
  const db = new FakeFirestore()
  db.store.set('meta/game', { host_jonathan: 'Jon' })
  const { nightId } = await createNight(db)
  for (let i = 0; i < 5; i++) await join(db, { uid: `u${i}`, nightId, name: `Guest ${i}` })
  let now = 4_000_000
  await hostCommand(db, { nightId, command: 'act', arg: 2, now })
  await hostCommand(db, { nightId, command: 'next', now })
  now = ms(db.store.get(parlourPath(nightId)).due0)
  await hostCommand(db, { nightId, command: 'tick', now })
  const w = db.store.get(`nights/${nightId}`).window
  const c = db.store.get(`cases/${nightId}`)
  const plan = c.parlourPlan.acts[2][0]
  const deck = db.store.get(`nights/${nightId}/private/deck`).uids
  const detectives = Object.keys(c.roles).filter(k => c.roles[k] === 'detective')
  assert.ok(detectives.length >= 2)
  const [yes, no] = detectives
  const agree = plan.listeners.map(l => l.lean)
  const disagree = agree.map(k => (k === 'a' ? 'b' : 'a'))
  const before = { yes: { ...db.store.get(`sessions/${deck[yes]}`).affection }, no: { ...db.store.get(`sessions/${deck[no]}`).affection } }
  await player.answer(db, { nightId, uid: deck[yes], windowId: w.id, picks: agree, now })
  await player.answer(db, { nightId, uid: deck[no], windowId: w.id, picks: disagree, now })
  const want = (aff, sign) => ({ ...aff, ...applyMoves(aff, catMoves({ listeners: plan.listeners, picks: sign > 0 ? agree : disagree })) })
  assert.deepEqual(db.store.get(`sessions/${deck[yes]}`).affection, want(before.yes, 1))
  assert.deepEqual(db.store.get(`sessions/${deck[no]}`).affection, want(before.no, -1))
  for (const l of plan.listeners) {
    const total = plan.listeners.filter(x => x.cat === l.cat).reduce((n, x) => n + x.size, 0)
    const top = l.cat === 'salem' ? Math.max(before.yes.salem, SALEM_PARLOUR_MAX) : AFFECTION_MAX // Salem stops at 4
    assert.equal(db.store.get(`sessions/${deck[yes]}`).affection[l.cat], Math.min(top, clampAffection(before.yes[l.cat] + total)))
  }
  assert.equal(db.store.get(`sessions/${deck[yes]}`).affection.irwin, before.yes.irwin, 'Irwin never moves')
})

test('L05 the lean table is not in the repo: no tracked file holds one, and the bank carries no leans', async () => {
  const { execFileSync } = await import('node:child_process')
  const root = new URL('../../', import.meta.url).pathname
  const files = execFileSync('git', ['ls-files'], { cwd: root, encoding: 'utf8' }).split('\n').filter(Boolean)
  assert.ok(!files.some(f => /parlour_leans|lean-table|leans\.json/i.test(f)), 'no lean table file is tracked')
  const bank = readFileSync(new URL('../../seed/parlour-games.json', import.meta.url), 'utf8')
  assert.ok(!/"lean|"fits"|"listeners"/.test(bank), 'the bank is questions, answers and points only')
  // the dealer reads the leans from the sealed collection only, never for a rehearsal
  const deal = readFileSync(new URL('../lib/deal.js', import.meta.url), 'utf8')
  assert.match(deal, /const leans = forceRehearsal \? null : await parlourLeans\(db\)/)
})
