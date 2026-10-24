import { test } from 'node:test'
import assert from 'node:assert/strict'
import { FakeFirestore } from './fake-firestore.mjs'
import { createNight, join } from '../lib/night.js'
import { hostCommand, player } from '../lib/run.js'
import { NIGHT, ROLE_CARDS, REHEARSAL_SETS, ms, roleCardsFor, ROLE_CARD_ID } from '../lib/deal.js'
import { studyPath, rotationPath } from '../lib/station.js'
import {
  tick, activeNightId, pushDial, wordCount, dueSlot, parlourPath,
  parityCheck, fillerLine, GRACE_MS, PARITY_TOLERANCE, DEFAULT_FILLER, HIDDEN_ROLES,
} from '../lib/windows.js'
import { extraListeners, catMoves, applyMoves } from '../lib/parlour.js'
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
// Into Act 2, then the clock to the act's first Parlour Game: it pops up on its own.
async function firstGame(db, nightId, now) {
  await hostCommand(db, { nightId, command: 'act', arg: 2, now })
  await hostCommand(db, { nightId, command: 'next', now }) // news: the role prompt is over
  const due = ms(db.store.get(parlourPath(nightId)).due0)
  await hostCommand(db, { nightId, command: 'tick', now: due })
  return night(db, nightId).window
}
// A deterministic picker, so a statistical test is the same run after run.
function seededPick(seed) {
  let s = seed >>> 0
  return n => { s = (Math.imul(s, 1103515245) + 12345) >>> 0; return (s >>> 8) % n }
}
// The picks that score the most (or the least) for one phone, from the private values.
function bestPicks(db, nightId, windowId, key, sign = 1) {
  const w = db.store.get(`nights/${nightId}/private/windows`)[windowId] // one set for the whole room
  return w.values.map(v => Object.entries(v).sort((a, b) => sign * (b[1] - a[1]))[0][0])
}
function totalOf(db, nightId, windowId, key, picks) {
  const w = db.store.get(`nights/${nightId}/private/windows`)[windowId] // one set for the whole room
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
  assert.equal(again.lights.moved, 0)
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

test('tick in Act 4 runs the clock: the warning gives way to the groups, the groups to the first round, a round to the next at ten minutes', async () => {
  const { db, nightId } = await party(8)
  let now = 3_000_000
  const tickHost = t => hostCommand(db, { nightId, command: 'tick', now: t })
  await hostCommand(db, { nightId, command: 'act', arg: 3, now })
  await hostCommand(db, { nightId, command: 'start-act4', now })
  assert.equal(night(db, nightId).beat, 'warn')
  assert.equal((await tickHost(now + 60_000)).clock, null, 'not before the two minutes')
  assert.equal((await tickHost(now + 2 * 60_000)).clock, 'groups')
  assert.equal((await tickHost(now + 4 * 60_000)).clock, 'round1', 'nobody locked in: two minutes on, the rounds start anyway')
  const round = db.store.get(`nights/${nightId}/public/act4`)
  assert.equal(round.round, 1)
  assert.equal(ms(round.roundEndsAt) - ms(round.roundStartsAt), 10 * 60_000)
  assert.equal((await tickHost(ms(round.roundEndsAt) - 1000)).clock, null)
  assert.equal((await tickHost(ms(round.roundEndsAt))).clock, 'round2')
  assert.equal(night(db, nightId).beat, 'round2')
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

test('across thirty nights every phone holds the same set at the same moment, the set is the case\'s for that slot, and no value, lean or listening cat reaches a phone or a public doc', async () => {
  const seen = new Set()
  for (let run = 0; run < 30; run++) {
    const { db, nightId, uids } = await party(6)
    writeBank(db, [3, 9, 4, 8, 12, 9, 8])
    const w = await firstGame(db, nightId, 7_000_000 + run)
    assert.equal(w.id, 'questions-2-p0')
    const c = caseOf(db, nightId)
    const planned = c.parlourPlan.acts[2][0]
    const bank = db.store.get('safe_content/scenarios').items
    const want = bank.find(i => i.id === planned.setId).beats[0].q
    for (const uid of uids) assert.equal(session(db, uid).windows[w.id].beats[0].q, want, 'every phone, every role: the set the case planned')
    seen.add(planned.setId)
    // the seal: no phone and no public doc carries a value, a set id, a lean, a listening cat, or a role
    for (const uid of uids) {
      const text = JSON.stringify(session(db, uid))
      for (const token of ['"av":', '"bv":', '"values":', '"setId":', '"lean":', '"listeners":', '"parlourPlan":', '"cat":', '"role":', '"dial":', '"exposure":']) assert.ok(!text.includes(token), `session carries ${token}`)
      assert.deepEqual(Object.keys(session(db, uid).windows[w.id]).sort(), ['beats', 'kind', 'opensAt'], 'the same shape on every phone')
    }
    const pub = JSON.stringify([night(db, nightId), ...[...db.store.keys()].filter(k => k.startsWith(`nights/${nightId}/public/`)).map(k => db.store.get(k))])
    for (const token of ['"parlourPlan":', '"lean":', '"listeners":', '"dial":', '"roles":', '"murderer":', '"ghost":', '"values":', '"setId":', '"exposure":', '"due0":']) assert.ok(!pub.includes(token), `public carries ${token}`)
  }
  assert.ok(seen.size > 1, 'the first game of the night is not the same set night after night')
})

test('a by-hand light-up deals a set the night has not used yet, the same set on every phone', async () => {
  for (let run = 0; run < 10; run++) {
    const { db, nightId, uids } = await party(6)
    writeBank(db, [5, 5, 5])
    const now = 7_500_000 + run
    const first = await firstGame(db, nightId, now)
    const bonus = (await hostCommand(db, { nightId, command: 'light-up', now: now + 1_000_000 })).id
    const third = (await hostCommand(db, { nightId, command: 'light-up', now: now + 2_000_000 })).id
    const priv = db.store.get(`nights/${nightId}/private/windows`)
    assert.equal(new Set([first.id, bonus, third].map(id => priv[id].setId)).size, 3, 'three games, three different sets')
    for (const id of [bonus, third]) {
      const q = session(db, uids[0]).windows[id].beats[0].q
      for (const uid of uids) assert.equal(session(db, uid).windows[id].beats[0].q, q)
    }
  }
})

test('dueSlot: a game is due at its time, in order, never closer than the gap to the last one', () => {
  const gap = 4 * 60_000
  const sched = { count: 3, fired: {}, lastAt: null, due0: new Date(10_000), due1: new Date(20_000), due2: new Date(500_000) }
  assert.equal(dueSlot(sched, { now: 9_999, gapMs: gap }), null)
  assert.equal(dueSlot(sched, { now: 10_000, gapMs: gap }), 0)
  const after = { ...sched, fired: { 0: true }, lastAt: new Date(10_000) }
  assert.equal(dueSlot(after, { now: 20_000, gapMs: gap }), null, 'due, but too close to the last one')
  assert.equal(dueSlot(after, { now: 10_000 + gap, gapMs: gap }), 1)
  assert.equal(dueSlot({ ...after, fired: { 0: true, 1: true, 2: true } }, { now: 1e9, gapMs: gap }), null, 'all played')
  assert.equal(dueSlot(null, { now: 1e9 }), null)
})

test('the built-in rehearsal sets have three questions with exactly two answers each, and ids', () => {
  for (const set of REHEARSAL_SETS) {
    assert.ok(set.id)
    assert.equal(set.beats.length, 3)
    for (const b of set.beats) { assert.ok(b.q && b.a && b.b); assert.equal(b.c, undefined); assert.equal(b.d, undefined) }
  }
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
  const priv = db.store.get(`nights/${nightId}/private/windows`)[w.id]
  const picks = bestPicks(db, nightId, w.id, c.ghost)
  const total = totalOf(db, nightId, w.id, c.ghost, picks)
  assert.ok(total > 0, 'the best picks score')
  const before = { ...session(db, ghostUid).affection }
  const listeners = extraListeners({ seed: c.parlourPlan.seed, windowId: w.id, setId: priv.setId, leans: c.parlourPlan.leans })
  const expected = applyMoves(before, catMoves({ listeners, picks, hidden: true, seed: c.parlourPlan.seed, windowId: w.id, key: c.ghost }))
  await player.answer(db, { nightId, uid: ghostUid, windowId: w.id, picks, now: now + 10 })
  const after = caseOf(db, nightId)
  assert.equal(after.dial, 0, 'the dial did not move')
  assert.equal(after.dialLog.length, 1)
  assert.deepEqual({ role: after.dialLog[0].role, delta: after.dialLog[0].delta, hushed: after.dialLog[0].hushed }, { role: 'ghost', delta: 0, hushed: true })
  assert.deepEqual(session(db, ghostUid).affection, { ...before, ...expected }, 'the cats still moved, by the coin, as for anyone (the placebo)')
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
