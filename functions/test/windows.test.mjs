import { test } from 'node:test'
import assert from 'node:assert/strict'
import { FakeFirestore } from './fake-firestore.mjs'
import { createNight, join } from '../lib/night.js'
import { hostCommand, player } from '../lib/run.js'
import { NIGHT, ROLE_CARDS, REHEARSAL_SETS, ms, roleCardsFor, ROLE_CARD_ID } from '../lib/deal.js'
import { studyPath, rotationPath, ABSENT_SLOT_MS } from '../lib/station.js'
import {
  tick, activeNightId, pushDial, pickSets, setFor, slotFor, setLength, wordCount,
  parityCheck, fillerLine, GRACE_MS, PARITY_TOLERANCE, SET_TOLERANCE, DEFAULT_FILLER, HIDDEN_ROLES,
} from '../lib/windows.js'
import { noteExposure, isHushed } from '../lib/ledger.js'
import { wordCount as workshopWordCount } from '../../app/src/lib/scenarios.js'

// The windows engine. Throwaway nights on stand-ins; the rehearsal case the
// dealer makes is read here only to find the two hidden roles, and nothing
// from it is ever printed. The Parlour Game sets written here are bracketed
// throwaways made inline and discarded with the test.

async function party(n = 8) {
  const db = new FakeFirestore()
  db.store.set('meta/game', { host_jonathan: 'Jon', host_susan: 'Susan' })
  const { nightId } = await createNight(db)
  const uids = []
  for (let i = 0; i < n; i++) { const uid = `u${i}`; await join(db, { uid, nightId, name: `Guest ${i}` }); uids.push(uid) }
  return { db, nightId, uids }
}
const night = (db, id) => db.store.get(`nights/${id}`)
const session = (db, uid) => db.store.get(`sessions/${uid}`)
const caseOf = (db, id) => db.store.get(`cases/${id}`)
const keyOf = (db, uid) => session(db, uid).guestKey
const uidOf = (db, nightId, key) => db.store.get(`nights/${nightId}/private/deck`).uids[key]

// Into Act 2 with a case and the roles dealt, then one Parlour Game open
// (the host's Light up button: no beat, so every phone draws at random).
async function litUp(db, nightId, now) {
  await hostCommand(db, { nightId, command: 'act', arg: 2, now })
  await hostCommand(db, { nightId, command: 'light-up', now })
  return night(db, nightId).window
}
// Into Act 2, then the Act 2 Parlour Game beat itself (the window the case names a slot for).
async function beatWindow(db, nightId, now) {
  await hostCommand(db, { nightId, command: 'act', arg: 2, now })
  await hostCommand(db, { nightId, command: 'beat', arg: 'questions', now })
  return night(db, nightId).window
}
// A deterministic picker, so a statistical test is the same run after run.
function seededPick(seed) {
  let s = seed >>> 0
  return n => { s = (Math.imul(s, 1103515245) + 12345) >>> 0; return (s >>> 8) % n }
}
// The picks that score the most (or the least) for one phone, from the private values.
function bestPicks(db, nightId, windowId, key, sign = 1) {
  const w = db.store.get(`nights/${nightId}/private/windows`)[windowId][key]
  return w.values.map(v => Object.entries(v).sort((a, b) => sign * (b[1] - a[1]))[0][0])
}
function totalOf(db, nightId, windowId, key, picks) {
  const w = db.store.get(`nights/${nightId}/private/windows`)[windowId][key]
  return picks.reduce((s, k, i) => s + (w.values[i][k] ?? 0), 0)
}
// A throwaway bank of bracketed sets, each a different length, written as the workshop would.
function writeBank(db, sizes) {
  const beats = (n, s) => [0, 1, 2].map(i => ({
    q: `(Set ${s} question ${i + 1} ${'of some words '.repeat(n).trim()})`, n: 2,
    a: '(Choice one)', av: i === 0 ? 2 : 1, b: '(Choice two)', bv: -1,
  }))
  db.store.set('safe_content/scenarios', { items: sizes.map((n, i) => ({ id: `s${i}`, order: i, text: `(Set ${i})`, beats: beats(n, i) })) })
}

// ---------------------------------------------------------------------------
// The tick

test('tick settles a window left open past its close, with defaults for every phone that did not answer, once across two ticks', async () => {
  const { db, nightId, uids } = await party(6)
  let now = 1_000_000
  const w = await litUp(db, nightId, now)
  assert.equal(await activeNightId(db), nightId)
  // two phones answer in time
  for (const uid of uids.slice(0, 2)) {
    const set = session(db, uid).windows[w.id]
    await player.answer(db, { nightId, uid, windowId: w.id, picks: set.beats.map(b => b.choices[0].k), now })
  }
  // too early: nothing settles
  let r = await tick(db, nightId, ms(w.closesAt) + GRACE_MS - 1)
  assert.equal(r.windowSettled, false); assert.equal(r.settled, 0)
  assert.equal(night(db, nightId).window.settled, false)
  // past the close and the grace: the four others get a default, once
  now = ms(w.closesAt) + GRACE_MS
  r = await tick(db, nightId, now)
  assert.equal(r.windowSettled, true)
  assert.equal(r.settled, 4)
  assert.equal(night(db, nightId).window.settled, true)
  for (const uid of uids) assert.equal(session(db, uid).answers[w.id].picks.length, 3)
  assert.equal(uids.filter(uid => session(db, uid).answers[w.id].defaulted).length, 4)
  const again = await tick(db, nightId, now + 60_000)
  assert.equal(again.windowSettled, false); assert.equal(again.settled, 0)
  assert.equal(again.study.ticked, false)
  // the host's command is the same path
  const viaHost = await hostCommand(db, { nightId, command: 'tick', now: now + 120_000 })
  assert.equal(viaHost.settled, 0)
  assert.ok(!('window' in viaHost) && !('cards' in viaHost), 'counts and reasons only')
})

test('tick leaves a paused night alone, and a night that does not exist', async () => {
  const { db, nightId } = await party(4)
  const now = 2_000_000
  const w = await litUp(db, nightId, now)
  await hostCommand(db, { nightId, command: 'pause', now: now + 1000 })
  const r = await tick(db, nightId, ms(w.closesAt) + 60_000)
  assert.equal(r.skipped, 'paused'); assert.equal(r.settled, 0)
  assert.equal(night(db, nightId).window.settled, false)
  await hostCommand(db, { nightId, command: 'resume', now: ms(w.closesAt) + 60_000 })
  // the resume shifted the close by the pause; the window is still open now
  const r2 = await tick(db, nightId, ms(w.closesAt) + 60_000)
  assert.equal(r2.windowSettled, false)
  const r3 = await tick(db, nightId, ms(night(db, nightId).window.closesAt) + GRACE_MS)
  assert.equal(r3.windowSettled, true); assert.equal(r3.settled, 4)
  assert.equal((await tick(db, 'no-such-night', now)).skipped, 'no-night')
})

test('tick ends a study slot that has run out, through the station clock, and the house moves on', async () => {
  const { db, nightId } = await party(8)
  let now = 3_000_000
  await hostCommand(db, { nightId, command: 'act', arg: 2, now })
  await hostCommand(db, { nightId, command: 'groups', now })
  await hostCommand(db, { nightId, command: 'act', arg: 4, now }) // no station heartbeat: the slot is twelve minutes
  const study = db.store.get(studyPath(nightId))
  assert.equal(study.state, 'absent')
  assert.ok(ms(study.slotEndsAt) > now)
  // the host command (and the schedule) wire the finish to the rotation; a bare tick only pays
  const tickHost = now => hostCommand(db, { nightId, command: 'tick', now })
  let r = await tickHost(now + 60_000)
  assert.equal(r.study.ticked, false); assert.equal(r.study.reason, 'slot-open')
  now = ms(study.slotEndsAt) + 1
  r = await tickHost(now)
  assert.equal(r.study.ticked, true, 'the slot ran out and the group was paid')
  assert.equal(night(db, nightId).rotation, 1, 'and the house rotated')
  assert.equal(Object.keys(db.store.get(rotationPath(nightId)).finished).length, 1)
  const second = await tickHost(now + 1000)
  assert.equal(second.study.ticked, false, 'the next slot is a fresh twelve minutes')
  assert.ok(ABSENT_SLOT_MS > 0)
})

// ---------------------------------------------------------------------------
// The dial

test('twenty interleaved pushes from the two hidden roles all land: the dial is the sum and the log holds twenty', async () => {
  const { db, nightId } = await party(4)
  await hostCommand(db, { nightId, command: 'act', arg: 2, now: 4_000_000 })
  const c = caseOf(db, nightId)
  let expected = 0
  // ten rounds of the real worst case: the Ghost and the Murderer tapping in the same instant
  for (let round = 0; round < 10; round++) {
    const pair = []
    for (const [j, role] of ['murderer', 'ghost'].entries()) {
      const total = ((round + j) % 5) + 1
      expected += (c.dialMap[role]) * total
      pair.push(pushDial(db, nightId, { c, role, total, act: 2, now: 4_000_000 + round * 2 + j }))
    }
    await Promise.all(pair)
  }
  const after = caseOf(db, nightId)
  assert.equal(after.dial, expected)
  assert.equal(after.dialLog.length, 20)
  assert.equal(after.dialLog.filter(e => e.role === 'ghost').length, 10)
  assert.ok(after.dialLog.every(e => typeof e.delta === 'number' && e.act === 2))
  assert.equal(await pushDial(db, nightId, { c, role: 'detective', total: 9 }), null, 'a detective never moves the dial')
  assert.equal(caseOf(db, nightId).dial, expected)
})

test('both hidden roles answering the same window at once both move the dial, in opposite directions for equal totals', async () => {
  const { db, nightId } = await party(6)
  const now = 5_000_000
  const w = await litUp(db, nightId, now)
  const c = caseOf(db, nightId)
  const roles = Object.fromEntries(HIDDEN_ROLES.map(r => [r, c[r]]))
  // each hidden role picks for the biggest total; the totals are what the private values say
  const picks = Object.fromEntries(HIDDEN_ROLES.map(r => [r, bestPicks(db, nightId, w.id, roles[r])]))
  const totals = Object.fromEntries(HIDDEN_ROLES.map(r => [r, totalOf(db, nightId, w.id, roles[r], picks[r])]))
  await Promise.all(HIDDEN_ROLES.map(r => player.answer(db, { nightId, uid: uidOf(db, nightId, roles[r]), windowId: w.id, picks: picks[r], now })))
  const after = caseOf(db, nightId)
  assert.equal(after.dialLog.length, 2)
  const delta = Object.fromEntries(after.dialLog.map(e => [e.role, e.delta]))
  assert.equal(delta.ghost, c.dialMap.ghost * totals.ghost)
  assert.equal(delta.murderer, c.dialMap.murderer * totals.murderer)
  assert.equal(after.dial, delta.ghost + delta.murderer)
  assert.equal(Math.sign(c.dialMap.ghost), -Math.sign(c.dialMap.murderer), 'the map is opposed')
  assert.equal(c.dialMap.ghost, 1); assert.equal(c.dialMap.murderer, -1)
})

test('a late answer is thanked, changes nothing, and the default stands', async () => {
  const { db, nightId, uids } = await party(4)
  const now = 6_000_000
  const w = await litUp(db, nightId, now)
  const c = caseOf(db, nightId)
  const ghostUid = uidOf(db, nightId, c.ghost)
  const picks = bestPicks(db, nightId, w.id, c.ghost)
  const before = JSON.stringify(session(db, ghostUid).affection)
  // after the close and the grace, before any settle
  let r = await player.answer(db, { nightId, uid: ghostUid, windowId: w.id, picks, now: ms(w.closesAt) + GRACE_MS + 1 })
  assert.deepEqual(r, { ok: true, late: true })
  assert.equal(session(db, ghostUid).answers?.[w.id], undefined)
  assert.equal(caseOf(db, nightId).dialLog.length, 0)
  // the tick picks for everyone; a tap after that is late too
  await tick(db, nightId, ms(w.closesAt) + GRACE_MS + 2)
  assert.equal(session(db, ghostUid).answers[w.id].defaulted, true)
  r = await player.answer(db, { nightId, uid: ghostUid, windowId: w.id, picks, now: ms(w.closesAt) + GRACE_MS + 3 })
  assert.deepEqual(r, { ok: true, late: true })
  assert.equal(session(db, ghostUid).answers[w.id].defaulted, true, 'the default stands')
  assert.equal(caseOf(db, nightId).dialLog.filter(e => e.role === 'ghost').length, 1, 'only the default moved the dial for the ghost')
  assert.equal(caseOf(db, nightId).dialLog.length, 2, 'the murderer\'s default landed too')
  assert.equal(night(db, nightId).window.answered ?? 0, 0, 'a late tap is not counted as an answer')
  // a tap at a window that is gone (the next one opened) is late, never an error, for a phone that held it
  const w2 = (await hostCommand(db, { nightId, command: 'light-up', now: ms(w.closesAt) + 70_000 })).id
  r = await player.answer(db, { nightId, uid: ghostUid, windowId: w.id, picks, now: ms(w.closesAt) + 70_001 })
  assert.deepEqual(r, { ok: true, late: true })
  await assert.rejects(() => player.answer(db, { nightId, uid: uids[0], windowId: 'never-dealt', picks, now }), /Nothing to answer/)
  // a real answer to the live window still counts, and answering twice says so
  const set = session(db, ghostUid).windows[w2]
  r = await player.answer(db, { nightId, uid: ghostUid, windowId: w2, picks: set.beats.map(b => b.choices[0].k), now: ms(w.closesAt) + 70_002 })
  assert.deepEqual(r, { ok: true })
  r = await player.answer(db, { nightId, uid: ghostUid, windowId: w2, picks: set.beats.map(b => b.choices[0].k), now: ms(w.closesAt) + 70_003 })
  assert.deepEqual(r, { ok: true, already: true })
  assert.ok(before.length > 0)
})

// ---------------------------------------------------------------------------
// Which set each phone gets

test('slotFor names the four windows of the night as the case does; a window with no beat has no slot', () => {
  assert.equal(slotFor(2, 'questions'), 'act2')
  assert.equal(slotFor(4, 'station1'), 'act4a')
  assert.equal(slotFor(4, 'station2'), 'act4a')
  assert.equal(slotFor(4, 'questions1'), 'act4a')
  assert.equal(slotFor(4, 'station3'), 'act4b', 'a window opened by hand after the first Parlour Game is the second')
  assert.equal(slotFor(4, 'questions2'), 'act4b')
  assert.equal(slotFor(4, 'station5'), 'act4b')
  assert.equal(slotFor(6, 'merged'), 'act6')
  assert.equal(slotFor(5, 'roam'), null)
  // the host's Light up button passes no beat: no slot, in any act
  for (const act of [2, 4, 6]) assert.equal(slotFor(act, null), null, `act ${act} by hand`)
  assert.equal(slotFor(2), null)
})

test('pickSets: the hidden roles get their case\'s set; every detective draws their own among the sets near them in length; no slot draws at random for everyone', () => {
  const bank = [
    [{ q: '(short)', a: '(a)', b: '(b)' }],
    [{ q: '(a longer question with many more words in it)', a: '(choice a)', b: '(choice b)' }],
    [{ q: '(short two)', a: '(a)', b: '(b)' }],
    [{ q: '(another long question with a good many words)', a: '(choice a)', b: '(choice b)' }],
  ]
  const c = { hiddenSets: { murderer: { act2: 1, act4a: 0, act4b: 3, act6: 5 }, ghost: { act2: 3, act4a: 2, act4b: 3, act6: 1 } } }
  const s = pickSets({ bank, c, act: 2, beat: 'questions', pick: () => 0 })
  assert.equal(s.murderer, 1); assert.equal(s.ghost, 3)
  assert.deepEqual(s.candidates, [1, 3], 'the detectives read a long set like the hidden roles')
  assert.equal(setFor(s, 'detective', () => 0), 1)
  assert.equal(setFor(s, 'detective', () => 1), 3)
  assert.equal(setFor(s, 'murderer', () => 1), 1, 'a hidden role never draws')
  assert.equal(setFor(s, 'nobody', () => 1), 3, 'an unknown role is a detective')
  // each detective draws on their own: two draws in a row can differ
  let i = 0
  const draws = [0, 1, 2, 3].map(() => setFor(s, 'detective', n => (i++) % n))
  assert.deepEqual(draws, [1, 3, 1, 3])
  const s6 = pickSets({ bank, c, act: 6, beat: 'merged', pick: () => 0 })
  assert.equal(s6.murderer, 1, 'an index past the bank wraps (5 mod 4)')
  assert.equal(s6.ghost, 1)
  const s4 = pickSets({ bank, c, act: 4, beat: 'questions1', pick: () => 0 })
  assert.equal(s4.murderer, 0); assert.equal(s4.ghost, 2)
  assert.deepEqual(s4.candidates, [0, 2], 'short with short')
  // no slot: the hidden roles draw at random too (two draws, one each), and the detectives after them
  let calls = 0
  const s5 = pickSets({ bank, c, act: 5, beat: 'roam', pick: n => { calls++; return n - 1 } })
  assert.equal(calls, 2)
  assert.equal(s5.murderer, 3); assert.equal(s5.ghost, 3)
  calls = 0
  const byHand = pickSets({ bank, c, act: 2, beat: null, pick: n => { calls++; return 0 } })
  assert.equal(calls, 2, 'a by-hand window in Act 2 draws for the hidden roles too')
  assert.equal(byHand.murderer, 0); assert.equal(byHand.ghost, 0)
  // a mixed pair (3 and 13 words): no set is near both, so the set least far from either (set 2, 4 words) is the one
  const mixed = pickSets({ bank, c: { hiddenSets: { murderer: { act2: 0 }, ghost: { act2: 1 } } }, act: 2, beat: 'questions', pick: n => n - 1 })
  assert.deepEqual(mixed.candidates, [2])
  assert.throws(() => pickSets({ bank: [], c, act: 2 }), /no Parlour Games/)
  assert.ok(SET_TOLERANCE > 0 && SET_TOLERANCE < 1)
  assert.equal(setLength([{ q: 'one two', a: 'three', b: 'four five', c: '', d: undefined }]), 5)
})

test('over twenty thousand windows the hidden roles are the odd ones out no more often than any two detectives', () => {
  // a bank of three sets that read alike (the rehearsal bank's size), the case's draw for the hidden
  // roles exactly as pickHiddenSets makes it, and a fresh draw per detective; one seeded picker throughout
  const bank = [0, 1, 2].map(i => [{ q: `(Question ${i} of a few words)`, a: '(one)', b: '(two)' }])
  const pick = seededPick(2026)
  const phones = ['murderer', 'ghost', 'd1', 'd2', 'd3', 'd4']
  const roleOf = p => (p.startsWith('d') ? 'detective' : p)
  const pairs = []
  for (let i = 0; i < phones.length; i++) for (let j = i + 1; j < phones.length; j++) pairs.push([phones[i], phones[j]])
  const oddPair = Object.fromEntries(pairs.map(p => [p.join('+'), 0])) // exactly this pair differs from everyone else
  const oddOne = Object.fromEntries(phones.map(p => [p, 0]))           // this phone's set is on no other phone
  const N = 20_000
  for (let w = 0; w < N; w++) {
    const c = { hiddenSets: { murderer: { act2: pick(bank.length) }, ghost: { act2: pick(bank.length) } } }
    const sets = pickSets({ bank, c, act: 2, beat: 'questions', pick })
    const held = Object.fromEntries(phones.map(p => [p, setFor(sets, roleOf(p), pick)]))
    for (const p of phones) if (!phones.some(o => o !== p && held[o] === held[p])) oddOne[p]++
    for (const [a, b] of pairs) {
      const rest = phones.filter(p => p !== a && p !== b).map(p => held[p])
      const same = rest.every(x => x === rest[0])
      if (same && held[a] !== rest[0] && held[b] !== rest[0]) oddPair[`${a}+${b}`]++
    }
  }
  const detectivePairs = pairs.filter(([a, b]) => a.startsWith('d') && b.startsWith('d')).map(p => oddPair[p.join('+')])
  const hiddenPair = oddPair['murderer+ghost']
  const mean = list => list.reduce((s, x) => s + x, 0) / list.length
  assert.ok(hiddenPair > 0 && Math.min(...detectivePairs) > 0, 'the event happens for everyone')
  assert.ok(hiddenPair <= Math.max(...detectivePairs), `the hidden pair (${hiddenPair}) stands out no more than a detective pair (${detectivePairs.join(', ')})`)
  assert.ok(Math.abs(hiddenPair - mean(detectivePairs)) <= 0.15 * mean(detectivePairs), `the hidden pair (${hiddenPair}) reads like a detective pair (${mean(detectivePairs)})`)
  const detectiveOnes = ['d1', 'd2', 'd3', 'd4'].map(p => oddOne[p])
  for (const h of HIDDEN_ROLES) assert.ok(Math.abs(oddOne[h] - mean(detectiveOnes)) <= 0.1 * mean(detectiveOnes), `${h} alone (${oddOne[h]}) reads like a detective (${mean(detectiveOnes)})`)
})

test('across thirty nights the hidden roles hold their case\'s set at the Act 2 beat, every detective draws within tolerance, and no values or hint reach a phone or a public doc', async () => {
  let differ = 0
  for (let run = 0; run < 30; run++) {
    const { db, nightId, uids } = await party(6)
    writeBank(db, [3, 9, 4, 8, 12, 9, 8])
    const now = 7_000_000 + run
    const w = await beatWindow(db, nightId, now)
    const c = caseOf(db, nightId)
    const bank = db.store.get('safe_content/scenarios').items.map(i => i.beats)
    const firstQ = uid => session(db, uid).windows[w.id].beats[0].q
    for (const role of HIDDEN_ROLES) {
      const want = bank[c.hiddenSets[role].act2 % bank.length][0].q
      assert.equal(firstQ(uidOf(db, nightId, c[role])), want, `${role} holds the set the case names`)
    }
    const detectives = uids.filter(uid => c.roles[keyOf(db, uid)] === 'detective')
    assert.equal(detectives.length, 4)
    if (new Set(detectives.map(firstQ)).size > 1) differ++
    // parity: every detective's set reads within tolerance of both hidden sets whenever the bank has such a set
    const len = uid => setLength(session(db, uid).windows[w.id].beats.map(b => ({ q: b.q, ...Object.fromEntries(b.choices.map(ch => [ch.k, ch.text])) })))
    const hidden = HIDDEN_ROLES.map(role => len(uidOf(db, nightId, c[role])))
    const nearBoth = x => hidden.every(h => Math.abs(x - h) <= SET_TOLERANCE * Math.max(x, h) + 0.001)
    if (bank.map(setLength).some(nearBoth)) for (const uid of detectives) assert.ok(nearBoth(len(uid)), `a detective's set (${len(uid)} words) reads like the hidden roles' (${hidden.join(', ')})`)
    // the seal: no phone and no public doc carries a value, a set index, or a role
    for (const uid of uids) {
      const text = JSON.stringify(session(db, uid))
      for (const token of ['"av":', '"bv":', '"values":', '"set":', '"setIndex":', '"hiddenSets":', '"role":', '"dial":', '"exposure":']) assert.ok(!text.includes(token), `session carries ${token}`)
      assert.deepEqual(Object.keys(session(db, uid).windows[w.id]).sort(), ['beats', 'cat', 'catName', 'kind'], 'the same shape on every phone')
    }
    const pub = JSON.stringify([night(db, nightId), ...[...db.store.keys()].filter(k => k.startsWith(`nights/${nightId}/public/`)).map(k => db.store.get(k))])
    for (const token of ['"hiddenSets":', '"dial":', '"roles":', '"murderer":', '"ghost":', '"values":', '"set":', '"exposure":']) assert.ok(!pub.includes(token), `public carries ${token}`)
  }
  assert.ok(differ > 0, 'the detectives do not all hold one set night after night')
})

test('a by-hand light-up after the beat draws afresh for every role: the hidden roles repeat their set no more often than the detectives', async () => {
  let hiddenRepeats = 0, hiddenTrials = 0, detectiveRepeats = 0, detectiveTrials = 0
  for (let run = 0; run < 20; run++) {
    const { db, nightId, uids } = await party(6)
    writeBank(db, [5, 5, 5, 5, 5, 5, 5, 5])
    const now = 7_500_000 + run
    const first = await beatWindow(db, nightId, now)
    const bonus = (await hostCommand(db, { nightId, command: 'light-up', now: now + 100_000 })).id
    assert.notEqual(bonus, first.id)
    const c = caseOf(db, nightId)
    const firstQ = (uid, id) => session(db, uid).windows[id].beats[0].q
    for (const uid of uids) {
      const repeat = firstQ(uid, first.id) === firstQ(uid, bonus)
      if (HIDDEN_ROLES.includes(c.roles[keyOf(db, uid)])) { hiddenTrials++; if (repeat) hiddenRepeats++ } else { detectiveTrials++; if (repeat) detectiveRepeats++ }
    }
  }
  assert.equal(hiddenTrials, 40); assert.equal(detectiveTrials, 80)
  assert.ok(hiddenRepeats < hiddenTrials / 2, `the hidden roles repeated ${hiddenRepeats} of ${hiddenTrials}: a bonus round must not hand them the same set again`)
  assert.ok(hiddenRepeats / hiddenTrials <= detectiveRepeats / detectiveTrials + 0.25, `hidden ${hiddenRepeats}/${hiddenTrials}, detectives ${detectiveRepeats}/${detectiveTrials}`)
})

test('the built-in rehearsal sets read about as long as each other, so the fallback bank never gives a role away by length', () => {
  const lens = REHEARSAL_SETS.map(setLength)
  assert.ok(Math.max(...lens) - Math.min(...lens) <= SET_TOLERANCE * Math.max(...lens) + 3, `lengths ${lens.join(', ')}`)
})

// ---------------------------------------------------------------------------
// Role-card parity

test('the default role cards pass the parity check; one long card is padded with the filler until the three read alike', () => {
  const r = parityCheck(ROLE_CARDS)
  assert.equal(r.ok, true); assert.equal(r.padded, 0)
  assert.deepEqual(r.cards, ROLE_CARDS)
  const long = { ...ROLE_CARDS, GHOST: `${ROLE_CARDS.GHOST} ${'(And here a good deal more, sentence after sentence, so this card runs long.) '.repeat(3)}` }
  const p = parityCheck(long, { filler: '(A filler line of seven words here.)' })
  assert.equal(p.ok, false, 'the long card is out of tolerance before padding')
  assert.ok(p.padded >= 9, `nine pads of seven words lift two cards of 29 and 26 to 56 (${p.padded})`)
  assert.equal(p.within, true)
  const counts = Object.values(p.cards).map(wordCount)
  assert.ok((Math.max(...counts) - Math.min(...counts)) / Math.max(...counts) <= PARITY_TOLERANCE)
  assert.equal(p.cards.GHOST, long.GHOST, 'the long card is untouched')
  assert.ok(p.cards.MURDERER.endsWith('(A filler line of seven words here.)'))
  assert.ok(wordCount(DEFAULT_FILLER) >= 4)
})

test('dealt role cards come through the parity check; the workshop FILLER line is the padding', async () => {
  const { db, nightId, uids } = await party(4)
  db.store.set('safe_content/role_cards', { items: [{ id: 'g', order: 0, text: `GHOST: ${ROLE_CARDS.GHOST} ${'(More words on this card, many more, to run it long.) '.repeat(4)}` }] })
  db.store.set('safe_content/ui_copy', { items: [{ id: 'f', order: 0, text: 'FILLER: (Keep your own counsel.)' }] })
  assert.equal(await fillerLine(db), '(Keep your own counsel.)')
  const lines = []
  const cards = await roleCardsFor(db, { log: l => lines.push(l) })
  assert.equal(lines.length, 1)
  assert.match(lines[0], /^role cards \{"padded":\d+,"within":true\}$/, 'a count, never a card')
  const counts = Object.values(cards).map(wordCount)
  assert.ok((Math.max(...counts) - Math.min(...counts)) / Math.max(...counts) <= PARITY_TOLERANCE)
  await hostCommand(db, { nightId, command: 'act', arg: 2, now: 8_000_000 })
  const dealt = uids.map(uid => session(db, uid).cards.find(c => c.id === ROLE_CARD_ID).text)
  const dc = dealt.map(wordCount)
  assert.ok((Math.max(...dc) - Math.min(...dc)) / Math.max(...dc) <= PARITY_TOLERANCE, 'what reached the phones is within tolerance')
  assert.ok(dealt.some(t => t.includes('(Keep your own counsel.)')), 'the padding is the workshop line')
})

test('the server counts words the way the workshop does', () => {
  for (const s of ['', '  ', 'one', 'one two', ' one  two\nthree ', 'it’s a cat, is it?', '(Bracketed) words, five of them.']) {
    assert.equal(wordCount(s), workshopWordCount(s), JSON.stringify(s))
  }
})

// ---------------------------------------------------------------------------
// Exposure

test('after note-exposure (the older name for hush) a hushed role still moves a cat but not the dial, and the log says so', async () => {
  const { db, nightId } = await party(5)
  const now = 9_000_000
  // before the case exists there is nothing to hush: the same answer as the Hush button
  assert.equal((await hostCommand(db, { nightId, command: 'note-exposure', arg: 'ghost', now })).hushed, false)
  const w = await litUp(db, nightId, now)
  await assert.rejects(() => hostCommand(db, { nightId, command: 'note-exposure', arg: 'butler', now }), /Murderer or the Ghost/)
  let r = await hostCommand(db, { nightId, command: 'note-exposure', arg: 'ghost', now })
  assert.deepEqual(r, { ok: true, role: 'ghost', hushed: true, already: false }, 'the same record and the same answer as hush')
  r = await hostCommand(db, { nightId, command: 'note-exposure', arg: 'ghost', now: now + 1 })
  assert.equal(r.already, true)
  const c = caseOf(db, nightId)
  assert.equal(ms(c.exposure.ghost.hushedAt), now, 'one shape: the ledger\'s')
  assert.equal(c.exposure.ghost.act, 2)
  assert.equal(c.exposure.ghost.at, undefined)
  assert.ok(isHushed(c, 'ghost') && !isHushed(c, 'murderer'))
  assert.equal(c.exposure.murderer, undefined)
  const ghostUid = uidOf(db, nightId, c.ghost)
  const priv = db.store.get(`nights/${nightId}/private/windows`)[w.id][c.ghost]
  const picks = bestPicks(db, nightId, w.id, c.ghost)
  const total = totalOf(db, nightId, w.id, c.ghost, picks)
  assert.ok(total > 0, 'the best picks score')
  const before = session(db, ghostUid).affection[priv.cat]
  await player.answer(db, { nightId, uid: ghostUid, windowId: w.id, picks, now: now + 10 })
  const after = caseOf(db, nightId)
  assert.equal(after.dial, 0, 'the dial did not move')
  assert.equal(after.dialLog.length, 1)
  assert.deepEqual({ role: after.dialLog[0].role, delta: after.dialLog[0].delta, hushed: after.dialLog[0].hushed }, { role: 'ghost', delta: 0, hushed: true })
  assert.equal(session(db, ghostUid).affection[priv.cat], Math.min(5, before + 1), 'the cat still moved (the placebo)')
  // the murderer is not hushed
  const mUid = uidOf(db, nightId, c.murderer)
  const mPicks = bestPicks(db, nightId, w.id, c.murderer)
  await player.answer(db, { nightId, uid: mUid, windowId: w.id, picks: mPicks, now: now + 11 })
  const last = caseOf(db, nightId).dialLog.at(-1)
  assert.equal(last.role, 'murderer'); assert.equal(last.hushed, undefined)
  assert.equal(last.delta, c.dialMap.murderer * totalOf(db, nightId, w.id, c.murderer, mPicks))
  // nothing a phone or a public doc can read names the exposure
  const pub = JSON.stringify([night(db, nightId), session(db, ghostUid), session(db, mUid)])
  assert.ok(!pub.includes('exposure') && !pub.includes('hushed'))
  assert.equal(await noteExposure(db, nightId, 'murderer').then(x => x.hushed), true, 'the ledger is the one writer')
  assert.ok(isHushed(caseOf(db, nightId), 'murderer'))
})
