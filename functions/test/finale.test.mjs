import { test } from 'node:test'
import assert from 'node:assert/strict'
import { FakeFirestore } from './fake-firestore.mjs'
import { createNight, join, CHARACTERS, NightError } from '../lib/night.js'
import { hostCommand, studyFinished, advanceRelay, nextOf } from '../lib/run.js'
import { stationCommand, studyClueCard, rotationPath, studyPath, STUDY_PLACEHOLDER } from '../lib/station.js'
import {
  traceLevel, TRACE_BUCKETS, TRACE_CONTEXT, pickPartner, revealTrace, ensureHallRed, reveal, finaleDoc, ensureCase, ms, results,
} from '../lib/deal.js'
import { CANON_LABELS, HUSH_LABEL, STAGES, finalePath, revealPath, awardsPath, fillEpilogue, DEFAULT_EPILOGUE, go } from '../lib/finale.js'
import { relayPaths, TURN_MS, WALK_MS, PULL_MS, VOTE_MS } from '../lib/relay.js'

// A throwaway night. The rehearsal case the dealer makes is never printed.
async function party(n = 6) {
  const db = new FakeFirestore()
  db.store.set('meta/game', { host_jonathan: 'Jon', host_susan: 'Susan' })
  const { nightId } = await createNight(db)
  const names = ['Jon', 'Susan', 'Jessa', 'Jacob', 'Stanley', 'Jeanette', 'Matthew', 'Marie', 'René', 'Guest'].slice(0, n)
  const uids = {}
  for (const name of names) { const uid = `u-${name.toLowerCase()}`; await join(db, { uid, nightId, name }); uids[name.toLowerCase()] = uid }
  return { db, nightId, uids, names }
}
const night = (db, id) => db.store.get(`nights/${id}`)
const cards = (db, uid, kind) => (db.store.get(`sessions/${uid}`).cards ?? []).filter(c => !kind || c.kind === kind)

// Walk the host's Next to a given act and beat.
async function walkTo(db, nightId, act, beat, t) {
  const next = () => hostCommand(db, { nightId, command: 'next', now: t.now })
  while (night(db, nightId).act < 1) await next()
  if (act === 1) { while (night(db, nightId).beat !== beat) await next(); return }
  while (night(db, nightId).beat !== 'ready') await next()
  await hostCommand(db, { nightId, command: 'blackout' })
  await hostCommand(db, { nightId, command: 'power', now: t.now })
  let guard = 0
  while (!(night(db, nightId).act === act && night(db, nightId).beat === beat) && guard++ < 60) {
    const n = night(db, nightId)
    if (n.window && !n.window.settled) t.now = Math.max(t.now, ms(n.window.closesAt) + 1)
    await next()
  }
  assert.equal(night(db, nightId).beat, beat, `reached act ${act} ${beat}`)
}

// Act 2 up to the puzzle, then the clock to the first Parlour Game: it pops up on its own.
async function firstParlour(db, nightId, t) {
  await walkTo(db, nightId, 2, 'puzzle', t)
  t.now = ms(db.store.get(`nights/${nightId}/private/parlour`).due0)
  await hostCommand(db, { nightId, command: 'tick', now: t.now })
  assert.equal(night(db, nightId).window?.id, 'questions-2-p0')
}

// ---- the study pay-out --------------------------------------------------

test('the study station card carries no clue text; the clue is dealt once when the station says finished', async () => {
  const { db, nightId, uids } = await party(6)
  const t = { now: 1_000_000 }
  await walkTo(db, nightId, 3, 'groups', t)
  // the station is alive before the first rotation, so the shortcut does not fire
  db.store.set(studyPath(nightId), { ...(db.store.get(studyPath(nightId)) ?? {}), updatedAt: new Date(t.now) })
  await hostCommand(db, { nightId, command: 'next', now: t.now })
  assert.equal(night(db, nightId).beat, 'station1')
  const rot = db.store.get(rotationPath(nightId))
  const first = rot.studyOrder[0]
  const group = rot.groups.find(g => g.id === first)
  for (const m of group.members) {
    const uid = uids[m.key]
    const sc = cards(db, uid, 'station').find(c => c.station === 'study')
    assert.ok(sc, 'the study group holds a study station card')
    assert.ok(!('payout' in sc), 'no clue text rides on the station card')
    assert.equal(sc.payoutId, `${sc.id}-clue`)
    assert.equal(cards(db, uid, 'clue').length, 0, 'nothing paid out yet while the station is alive')
  }
  assert.equal(db.store.get(studyPath(nightId)).groupId, first, 'the station is pointed at the due group')
  const r = await stationCommand(db, { nightId, command: 'finished', payload: { groupId: first, outcome: 'solved', seconds: 400, pairs: 3 } })
  assert.equal(r.dealt, group.members.length)
  for (const m of group.members) {
    const uid = uids[m.key]
    const clue = cards(db, uid, 'clue')
    assert.equal(clue.length, 1)
    assert.equal(clue[0].id, '4-station1-study-clue')
    assert.ok(clue[0].trace && clue[0].trace.level >= 1 && clue[0].trace.level <= 5, 'the study pays the Ghost\'s trace at a level')
    assert.equal(clue[0].placeholder, true, 'a rehearsal case is marked')
  }
  const again = await stationCommand(db, { nightId, command: 'finished', payload: { groupId: first } })
  assert.equal(again.repeated, true)
  for (const m of group.members) assert.equal(cards(db, uids[m.key], 'clue').length, 1, 'dealt once')
})

test('studyClueCard carries the reveal it is given; with none it is the marked stand-in', () => {
  const real = studyClueCard({ rehearsal: false }, 4, 'station2', { level: 3, trace: 'ink', label: null, context: null })
  assert.equal(real.placeholder, false)
  assert.equal(real.id, '4-station2-study-clue')
  assert.equal(real.trace.trace, 'ink')
  const none = studyClueCard(null, 4, 'station2')
  assert.equal(none.placeholder, true)
  assert.equal(none.text, STUDY_PLACEHOLDER)
})

test('rotate does not clobber a running study game, and the rehearsal shortcut fires only when no station is alive', async () => {
  const { db, nightId, uids } = await party(4)
  const t = { now: 2_000_000 }
  await walkTo(db, nightId, 4, 'station1', t)
  const rot = db.store.get(rotationPath(nightId))
  // no station alive at station1 → the study group got its clue with the card
  const g1 = rot.groups.find(g => g.id === rot.studyOrder[0])
  for (const m of g1.members) assert.equal(cards(db, uids[m.key], 'clue').length, 1, 'rehearsal shortcut')
  // a game is running in the study: the next rotation leaves groupId alone
  db.store.set(studyPath(nightId), { state: 'playing', groupId: 'running', updatedAt: new Date(t.now) })
  await hostCommand(db, { nightId, command: 'next', now: t.now }) // station2
  assert.equal(night(db, nightId).beat, 'station2')
  assert.equal(db.store.get(studyPath(nightId)).groupId, 'running')
  // idle again: the next rotation points at the group due at that rotation
  db.store.set(studyPath(nightId), { state: 'done', groupId: 'running', updatedAt: new Date(t.now) })
  await hostCommand(db, { nightId, command: 'next', now: t.now }) // station3
  assert.equal(night(db, nightId).beat, 'station3')
  assert.equal(db.store.get(studyPath(nightId)).groupId, rot.studyOrder[2] ?? null)
  assert.equal(db.store.get(studyPath(nightId)).state, 'idle')
})

test('studyFinished rotates the house in Act 4, and only there; a Parlour Game on the phones keeps running through the rotation', async () => {
  const { db, nightId } = await party(6)
  const t = { now: 3_000_000 }
  await walkTo(db, nightId, 4, 'station1', t)
  const rot = db.store.get(rotationPath(nightId))
  const r = await studyFinished(db, { nightId, payload: { groupId: rot.studyOrder[0], outcome: 'solved', seconds: 300, pairs: 3 }, now: t.now })
  assert.equal(r.rotated, true)
  assert.equal(night(db, nightId).beat, 'station2')
  // a Parlour Game pops up; the next finish still moves the house on, and the game keeps running
  await hostCommand(db, { nightId, command: 'light-up', now: t.now })
  const w = night(db, nightId).window
  const r2 = await studyFinished(db, { nightId, payload: { groupId: rot.studyOrder[1], outcome: 'capped' }, now: t.now + 1000 })
  assert.equal(r2.rotated, true, 'next beat exists in Act 4')
  assert.equal(night(db, nightId).beat, 'station3')
  assert.equal(night(db, nightId).window.id, w.id)
  assert.equal(night(db, nightId).window.settled, false, 'the game was not closed early')
  // a repeat is harmless
  const r4 = await studyFinished(db, { nightId, payload: { groupId: rot.studyOrder[0] }, now: t.now })
  assert.equal(r4.repeated, true)
})

test('the Host tab groups button keeps the murderer and the ghost apart', async () => {
  for (let i = 0; i < 20; i++) {
    const { db, nightId } = await party(9)
    const t = { now: 4_000_000 }
    await walkTo(db, nightId, 2, 'orient', t)
    const c = db.store.get(`cases/${nightId}`)
    await hostCommand(db, { nightId, command: 'groups', now: t.now })
    const rot = db.store.get(rotationPath(nightId))
    assert.ok(!rot.groups.some(g => g.members.some(m => m.key === c.murderer) && g.members.some(m => m.key === c.ghost)))
  }
})

// ---- the trace ----------------------------------------------------------

test('traceLevel: neutral at zero, one rung per four points, clamped to 1..5', () => {
  assert.equal(traceLevel(0), 3)
  assert.equal(traceLevel(2), 4)
  assert.equal(traceLevel(-2), 2)
  assert.equal(traceLevel(40), 5)
  assert.equal(traceLevel(-40), 1)
  assert.equal(traceLevel(undefined), 3)
})

test('TRACE_BUCKETS: every current trace in at least two buckets, the Professors never share one, every trace has a context line', () => {
  const traces = CHARACTERS.map(c => c.trace)
  for (const tr of traces) {
    const n = Object.values(TRACE_BUCKETS).filter(b => b.includes(tr)).length
    assert.ok(n >= 2, `${tr} sits in ${n} bucket(s)`)
    assert.ok(TRACE_CONTEXT[tr], `${tr} has a context line (kept for the workshop, not shown)`)
  }
  for (const b of Object.values(TRACE_BUCKETS)) {
    for (const tr of b) assert.ok(traces.includes(tr), `${tr} is a current trace`)
    assert.ok(!(b.includes('elbow-patch') && b.includes('white-sand')), 'Professors never share a bucket')
  }
})

test('pickPartner: in play only, never the excluded trace, Professors only as a last resort', () => {
  const inPlay = ['ink', 'elbow-patch', 'coffee', 'white-sand']
  for (let i = 0; i < 50; i++) {
    const p = pickPartner('iodine', inPlay)
    assert.ok(['ink', 'coffee'].includes(p), `got ${p}`)
  }
  assert.equal(pickPartner('iodine', ['iodine', 'flour']), null, 'nobody confusable at the party')
  assert.equal(pickPartner('iodine', ['ink'], { exclude: ['ink'] }), null, 'the victim is never the partner')
  assert.equal(pickPartner('coffee', ['elbow-patch']), 'elbow-patch', 'a Professor when nobody else fits')
})

test('revealTrace writes the contract shape, turns the hall green, and never a name or a role', async () => {
  for (const dial of [0, 9, -9, -4, 4]) {
    const { db, nightId } = await party(8)
    const t = { now: 5_000_000 }
    await walkTo(db, nightId, 2, 'orient', t)
    await db.doc(`cases/${nightId}`).update({ dial })
    const c = db.store.get(`cases/${nightId}`)
    const r = await revealTrace(db, nightId, { now: t.now })
    // the whole of it lives where no phone reads
    const doc = db.store.get(`nights/${nightId}/private/trace`)
    const murdererTrace = CHARACTERS.find(ch => ch.id === night(db, nightId).roster[c.murderer].characterId)
    assert.equal(doc.trace, murdererTrace.trace)
    assert.equal(r.level, doc.level)
    const expected = traceLevel(dial)
    assert.ok(doc.level === expected || (expected === 3 && doc.level === 4), `level ${doc.level} for dial ${dial}`)
    assert.equal(doc.label, doc.level === 5 ? murdererTrace.traceLabel : null, 'the name only at level 5')
    assert.ok(!('context' in doc), 'no line of context on any level (Jon, 22 Oct)')
    if (doc.level === 3) {
      assert.ok(doc.partner && doc.partner !== doc.trace)
      const victimTrace = CHARACTERS.find(ch => ch.id === night(db, nightId).roster[c.ghost].characterId).trace
      assert.notEqual(doc.partner, victimTrace)
      const inPlay = Object.values(night(db, nightId).roster).map(x => CHARACTERS.find(ch => ch.id === x.characterId).trace)
      assert.ok(inPlay.includes(doc.partner))
    } else assert.equal(doc.partner, null)
    assert.equal(doc.placeholder, true)
    // what the room screens read carries only what the level allows: the dial's work is not undone by one read
    const pub = db.store.get(`nights/${nightId}/public/trace`)
    assert.equal(pub.level, doc.level)
    assert.ok(!('partner' in pub), 'the public doc never says which picture is the real one')
    if (doc.level === 3) {
      assert.ok(!('trace' in pub), 'at level 3 the public doc never says which of the two is the real one')
      assert.deepEqual([...pub.images].sort(), [doc.trace, doc.partner].sort())
    } else {
      assert.equal(pub.trace, doc.trace, `one picture at level ${doc.level}`)
      assert.equal(pub.label, doc.label)
      assert.ok(!('images' in pub))
    }
    const text = JSON.stringify([doc, pub])
    for (const forbidden of ['murderer', 'ghost', 'motive', 'roles', 'kernel', 'document', c.murderer, c.ghost]) {
      assert.ok(!text.includes(forbidden), `trace doc must not carry ${forbidden}`)
    }
    assert.equal(db.store.get(`nights/${nightId}/public/cues`).hall, 'green')
    const again = await revealTrace(db, nightId, { now: t.now + 1 })
    assert.equal(again.already, true)
  }
})

// Play the Act 6 drawing through to its last vote, everyone picking right,
// and leave `t.now` at the moment that vote can be closed.
async function playToLastVote(db, nightId, uids, names, t) {
  const { pub, priv } = relayPaths(nightId)
  const { vote } = await import('../lib/relay.js')
  let guard = 0
  while (guard++ < 400) {
    const p = db.store.get(pub)
    if (p.state === 'vote') {
      const answer = db.store.get(priv).grids[p.grid - 1].answer
      for (const name of names) await vote(db, { nightId, uid: uids[name.toLowerCase()], pick: answer })
      if (p.grid === 3) return
      await advanceRelay(db, { nightId, now: t.now + 1 })
      continue
    }
    t.now += p.state === 'walk' ? Math.max(WALK_MS, PULL_MS) : TURN_MS
    await advanceRelay(db, { nightId, now: t.now })
  }
  assert.fail('the drawing never reached its last vote')
}

test('the trace reveal heals itself: a failed write is retried by the next nudge, and by Next into the door', async () => {
  const { db, nightId, uids, names } = await party(4)
  const t = { now: 8_000_000 }
  await walkTo(db, nightId, 6, 'drawing', t)
  await playToLastVote(db, nightId, uids, names, t)
  // the last vote closes, but the trace's write fails (a dropped connection) just after the relay commits 'done'
  const realBatch = db.batch.bind(db)
  let failures = 1
  db.batch = () => { const b = realBatch(); if (failures-- > 0) b.commit = async () => { throw new Error('UNAVAILABLE') }; return b }
  const r = await advanceRelay(db, { nightId, now: t.now + 1 })
  assert.equal(r.state, 'done')
  assert.equal(r.trace, 'failed')
  assert.equal(db.store.get(`nights/${nightId}/public/trace`), undefined)
  assert.equal(db.store.get(`nights/${nightId}/public/cues`).hall, 'red')
  // the kiosk nudges again (nothing moves) and the trace lands
  const again = await advanceRelay(db, { nightId, now: t.now + 2 })
  assert.equal(again.moved, false)
  assert.ok(db.store.get(`nights/${nightId}/public/trace`))
  assert.equal(db.store.get(`nights/${nightId}/public/cues`).hall, 'green')
  // and Next into the door is a second safety net
  db.store.delete(`nights/${nightId}/public/trace`)
  db.store.set(`nights/${nightId}/public/cues`, { hall: 'red' })
  await hostCommand(db, { nightId, command: 'next', now: t.now + 3 })
  assert.equal(night(db, nightId).beat, 'door')
  assert.ok(db.store.get(`nights/${nightId}/public/trace`))
  assert.equal(db.store.get(`nights/${nightId}/public/cues`).hall, 'green')
})

test('Clear the drawing takes the trace and the green light with it; the next run turns it green again', async () => {
  const { db, nightId, uids, names } = await party(4)
  const t = { now: 9_000_000 }
  await walkTo(db, nightId, 6, 'drawing', t)
  await playToLastVote(db, nightId, uids, names, t)
  await advanceRelay(db, { nightId, now: t.now + 1 })
  assert.ok(db.store.get(`nights/${nightId}/public/trace`))
  assert.equal(db.store.get(`nights/${nightId}/public/cues`).hall, 'green')
  await hostCommand(db, { nightId, command: 'relay-reset', now: t.now + 2 })
  assert.equal(db.store.get(`nights/${nightId}/public/trace`), undefined)
  assert.equal(db.store.get(`nights/${nightId}/private/trace`), undefined)
  assert.equal(db.store.get(`nights/${nightId}/public/cues`).hall, 'red')
  assert.equal(await ensureHallRed(db, nightId, t.now + 3), false, 'red already')
  // run it again: a fresh trace, a fresh green
  await hostCommand(db, { nightId, command: 'relay-start', now: t.now + 4 })
  await playToLastVote(db, nightId, uids, names, t)
  await advanceRelay(db, { nightId, now: t.now + 1 })
  assert.ok(db.store.get(`nights/${nightId}/public/trace`))
  assert.equal(db.store.get(`nights/${nightId}/public/cues`).hall, 'green')
})

test('a running drawing is never wiped or walked away from: Next and the beat list refuse, Start keeps it, Clear frees it', async () => {
  const { db, nightId } = await party(3)
  const t = { now: 10_000_000 }
  await walkTo(db, nightId, 6, 'drawing', t)
  const { pub, priv } = relayPaths(nightId)
  const seed = db.store.get(priv).seed
  assert.equal(db.store.get(pub).state, 'walk')
  await assert.rejects(hostCommand(db, { nightId, command: 'next', now: t.now }), /still running/)
  await assert.rejects(hostCommand(db, { nightId, command: 'beat', arg: 'door', now: t.now }), /still running/)
  assert.equal((await hostCommand(db, { nightId, command: 'relay-start', now: t.now })).already, true)
  const r = await hostCommand(db, { nightId, command: 'beat', arg: 'drawing', now: t.now })
  assert.equal(r.already, true)
  assert.equal(db.store.get(priv).seed, seed, 'the same drawing is still on the paper')
  assert.equal(night(db, nightId).beat, 'drawing')
  await hostCommand(db, { nightId, command: 'relay-reset', now: t.now })
  await hostCommand(db, { nightId, command: 'next', now: t.now })
  assert.equal(night(db, nightId).beat, 'door')
})

test('a start that fails leaves Next on the drawing beat, so trying again tries the drawing again', async () => {
  const { db, nightId } = await party(1) // one person: the drawing cannot start
  const t = { now: 11_000_000 }
  await hostCommand(db, { nightId, command: 'act', arg: 5, now: t.now })
  await hostCommand(db, { nightId, command: 'next', now: t.now }) // irwin
  assert.equal(night(db, nightId).beat, 'irwin')
  await assert.rejects(hostCommand(db, { nightId, command: 'next', now: t.now }), /at least two/)
  assert.equal(night(db, nightId).beat, 'irwin', 'the beat did not move')
  assert.equal(db.store.get(relayPaths(nightId).pub), undefined)
})

test('the group due in the study is paid when the house moves on without the station saying so', async () => {
  const { db, nightId, uids } = await party(6)
  const t = { now: 12_000_000 }
  await walkTo(db, nightId, 3, 'groups', t)
  const alive = (extra = {}) => db.store.set(studyPath(nightId), { ...(db.store.get(studyPath(nightId)) ?? {}), state: 'idle', updatedAt: new Date(t.now), ...extra })
  alive()
  await hostCommand(db, { nightId, command: 'next', now: t.now }) // station1
  const rot = db.store.get(rotationPath(nightId))
  const [g1, g2, g3] = rot.studyOrder.map(id => rot.groups.find(g => g.id === id))
  for (const m of g1.members) assert.equal(cards(db, uids[m.key], 'clue').length, 0, 'nothing yet: the station is alive')
  // the station dies (no touch ever came); the host presses Next anyway
  alive()
  await hostCommand(db, { nightId, command: 'next', now: t.now }) // station2
  for (const m of g1.members) assert.equal(cards(db, uids[m.key], 'clue').length, 1, 'g1 leaves the study with the clue')
  assert.equal(db.store.get(rotationPath(nightId)).finished[g1.id].outcome, 'absent')
  assert.equal(db.store.get(studyPath(nightId)).groupId, g2.id)
  // a late word from the station about g1 deals nothing twice
  const late = await stationCommand(db, { nightId, command: 'finished', payload: { groupId: g1.id, outcome: 'solved' } })
  assert.equal(late.repeated, true)
  for (const m of g1.members) assert.equal(cards(db, uids[m.key], 'clue').length, 1)
  // g2 is mid-game with the station alive when the house rotates: left to the station, not paid yet
  alive({ state: 'playing' })
  await hostCommand(db, { nightId, command: 'next', now: t.now }) // station3
  assert.equal(night(db, nightId).beat, 'station3')
  for (const m of g2.members) assert.equal(cards(db, uids[m.key], 'clue').length, 0, 'the station still has g2')
  assert.equal(db.store.get(rotationPath(nightId)).finished[g2.id], undefined)
  assert.equal(db.store.get(studyPath(nightId)).groupId, g2.id, 'the running game is left alone')
  // and when the station is not alive the mid-game group is paid at the next rotation
  db.store.set(studyPath(nightId), { ...db.store.get(studyPath(nightId)), updatedAt: new Date(t.now - 10 * 60_000) })
  await hostCommand(db, { nightId, command: 'next', now: t.now }) // station4
  for (const m of g2.members) assert.equal(cards(db, uids[m.key], 'clue').length, 1)
  assert.ok(g3)
})

test('a finish from a rotation the host already moved past does not move the house again', async () => {
  const { db, nightId, uids } = await party(6)
  const t = { now: 13_000_000 }
  await walkTo(db, nightId, 3, 'groups', t)
  db.store.set(studyPath(nightId), { ...(db.store.get(studyPath(nightId)) ?? {}), state: 'idle', updatedAt: new Date(t.now) })
  await hostCommand(db, { nightId, command: 'next', now: t.now }) // station1, rotation 0
  const rot = db.store.get(rotationPath(nightId))
  const g1 = rot.groups.find(g => g.id === rot.studyOrder[0])
  // g1 overruns in the study; the host keeps the other groups moving
  db.store.set(studyPath(nightId), { ...db.store.get(studyPath(nightId)), state: 'playing', groupId: g1.id, updatedAt: new Date(t.now) })
  await hostCommand(db, { nightId, command: 'next', now: t.now }) // station2, rotation 1
  assert.equal(night(db, nightId).rotation, 1)
  // two minutes later g1 finishes: the clue lands, the house stays where it is
  const r = await studyFinished(db, { nightId, payload: { groupId: g1.id, outcome: 'solved', seconds: 700, pairs: 3 }, now: t.now + 120_000 })
  assert.equal(r.rotated, false)
  assert.equal(r.reason, 'already-rotated')
  assert.equal(night(db, nightId).beat, 'station2')
  for (const m of g1.members) assert.equal(cards(db, uids[m.key], 'clue').length, 1)
})

test('both hidden roles answering at the same moment push the dial twice, and a late answer during settle counts once', async () => {
  const { db, nightId, uids, names } = await party(4)
  const t = { now: 14_000_000 }
  await firstParlour(db, nightId, t)
  const n2 = night(db, nightId)
  const { answer } = await import('../lib/deal.js')
  const picksFor = (uid) => db.store.get(`sessions/${uid}`).windows[n2.window.id].beats.map(b => b.choices[0].k)
  // every phone taps at once
  await Promise.all(names.slice(0, 3).map(name => { const uid = uids[name.toLowerCase()]; return answer(db, { nightId, uid, windowId: n2.window.id, picks: picksFor(uid), now: t.now }) }))
  // the fourth answers in the grace period while the host's Next is settling
  t.now = ms(n2.window.closesAt) + 1
  const lastUid = uids[names[3].toLowerCase()]
  await Promise.all([
    hostCommand(db, { nightId, command: 'next', now: t.now }),
    answer(db, { nightId, uid: lastUid, windowId: n2.window.id, picks: picksFor(lastUid), now: t.now }).catch(e => { if (e.code !== 'closed') throw e }),
  ])
  const c = db.store.get(`cases/${nightId}`)
  assert.equal(c.dialLog.length, 2, 'one push per hidden role, none lost, none doubled')
  assert.deepEqual([...c.dialLog.map(e => e.role)].sort(), ['ghost', 'murderer'])
  assert.equal(c.dial, c.dialLog.reduce((s, e) => s + e.delta, 0))
})

test('the hall light is red from Act 1 and green when the drawing is done', async () => {
  const { db, nightId, uids, names } = await party(3)
  const t = { now: 6_000_000 }
  assert.equal(db.store.get(`nights/${nightId}/public/cues`), undefined)
  await walkTo(db, nightId, 1, 'meet', t)
  assert.equal(db.store.get(`nights/${nightId}/public/cues`).hall, 'red')
  assert.equal(await ensureHallRed(db, nightId, t.now), false, 'already set')
  await walkTo(db, nightId, 6, 'drawing', t)
  const { pub, priv } = relayPaths(nightId)
  assert.equal(db.store.get(pub).state, 'walk')
  // play the whole drawing with everyone picking right
  let guard = 0
  while (db.store.get(pub).state !== 'done' && guard++ < 400) {
    const p = db.store.get(pub)
    if (p.state === 'vote') {
      const answer = db.store.get(priv).grids[p.grid - 1].answer
      for (const name of names) await hostCommand(db, { nightId, command: 'relay-advance', now: t.now }) // harmless early calls
      for (const name of names) {
        const { vote } = await import('../lib/relay.js')
        await vote(db, { nightId, uid: uids[name.toLowerCase()], pick: answer })
      }
      await advanceRelay(db, { nightId, now: t.now + 1 })
      continue
    }
    t.now += p.state === 'walk' ? Math.max(WALK_MS, PULL_MS) : TURN_MS
    await advanceRelay(db, { nightId, now: t.now })
  }
  assert.equal(db.store.get(pub).state, 'done')
  assert.equal(db.store.get(`nights/${nightId}/public/cues`).hall, 'green')
  const trace = db.store.get(`nights/${nightId}/public/trace`)
  assert.ok(trace && trace.level >= 1 && trace.level <= 5)
})

// ---- the dial log and the finale -----------------------------------------

// Everyone answers the open Parlour Game with their first choice.
async function answerAll(db, nightId, uids, names, t) {
  const n = night(db, nightId)
  const { answer } = await import('../lib/deal.js')
  for (const name of names) {
    const uid = uids[name.toLowerCase()]
    const set = db.store.get(`sessions/${uid}`).windows[n.window.id]
    await answer(db, { nightId, uid, windowId: n.window.id, picks: set.beats.map(b => b.choices[0].k), now: t.now })
  }
}

// The night as it would stand at the reveal: Act 2 answered, a study solved
// and one capped, a drawing done, then the reveal beat written.
async function revealed(n = 5) {
  const { db, nightId, uids, names } = await party(n)
  const t = { now: 7_000_000 }
  await firstParlour(db, nightId, t)
  await answerAll(db, nightId, uids, names, t)
  t.now = ms(night(db, nightId).window.closesAt) + 1
  await hostCommand(db, { nightId, command: 'settle', now: t.now })
  await hostCommand(db, { nightId, command: 'groups', now: t.now })
  const rot = db.store.get(rotationPath(nightId))
  await stationCommand(db, { nightId, command: 'finished', payload: { groupId: rot.studyOrder[0], outcome: 'solved', seconds: 372, pairs: 3 } })
  await stationCommand(db, { nightId, command: 'finished', payload: { groupId: rot.studyOrder[1], outcome: 'capped', seconds: 900, pairs: 1 } })
  db.store.set(`nights/${nightId}/public/relay`, { state: 'done', doorOpen: true, stats: { totalSeconds: 1020, misses: [0, 2, 0] } })
  await reveal(db, nightId, { now: t.now })
  return { db, nightId, uids, names, t, c: db.store.get(`cases/${nightId}`) }
}

// everything a client can read: the night doc, its public docs, and every session (less that phone's own ballot and result, which are its own picks)
const publicDocs = (db, nightId) => [...db.store.keys()].filter(k => k === `nights/${nightId}` || k.startsWith(`nights/${nightId}/public/`) || k.startsWith('sessions/')).map(k => { const { ballot, result, ...rest } = db.store.get(k); return [k, rest] })

test('the finale: the seven canon lines as strings, no slowest, the graph from the dial log with its sides from the case, nothing sealed', async () => {
  const { db, nightId, c } = await revealed(5)
  assert.ok(Array.isArray(c.dialLog) && c.dialLog.length === 2, 'two hidden roles pushed once each')
  assert.ok(c.dialLog.every(e => e.act === 2 && ['murderer', 'ghost'].includes(e.role) && typeof e.delta === 'number'))
  const f = db.store.get(finalePath(nightId))
  assert.deepEqual(Object.keys(f.schedule), ['stats', 'awards', 'graph', 'names'])
  assert.ok(f.schedule.stats < f.schedule.graph && f.schedule.graph < f.schedule.names, 'the reel, the graph, then the names')
  assert.equal(f.schedule.awards, f.schedule.graph, 'no achievements given: the awards segment has no length')
  const labels = f.stats.map(s => s.label)
  for (const l of CANON_LABELS) assert.ok(labels.includes(l), `the reel carries "${l}"`)
  assert.equal(labels.length, CANON_LABELS.length, 'no Hush line without an exposure')
  assert.ok(labels.every(l => !/ran out|slowest/i.test(l)), 'nobody is called out')
  assert.ok(f.stats.every(s => typeof s.value === 'string' && typeof s.showAt === 'number'))
  assert.deepEqual(f.stats.map(s => s.showAt), f.stats.map((_, i) => i * 4000), 'one line every four seconds')
  assert.equal(f.stats.find(s => s.label === 'Time on the drawing').value, '17 min')
  assert.equal(f.stats.find(s => s.label === 'Pictures that took more than one guess').value, 'Grid 2')
  assert.match(f.stats.find(s => s.label === 'Fastest light puzzle').value, /6 min 12 s$/)
  assert.equal(f.stats.find(s => s.label === 'Fastest safe').value, 'Nobody opened one')
  assert.match(f.stats.find(s => s.label === "The cats' favourites").value, /^Granolia: .+ · Boo: .+ · Zimothy: .+ · Salem: .+$/)
  assert.ok(!/tie/i.test(JSON.stringify(f.stats)), 'a tie is never shown as one')
  assert.equal(f.graph.points.length, 2)
  assert.deepEqual(f.graph.running.map(r => r.act), [2, 4, 6])
  assert.equal(f.graph.running[0].value, c.dialLog.reduce((s, e) => s + e.delta, 0))
  // the two roles pull toward opposite sides, named from the case's fixed signs, never assumed
  assert.notEqual(f.graph.sides.up, f.graph.sides.down)
  assert.deepEqual([f.graph.sides.up, f.graph.sides.down].sort(), ['ghost', 'murderer'])
  assert.equal(f.graph.sides.up, c.dialSign.ghost > 0 ? 'ghost' : 'murderer')
  assert.equal(f.graph.hush, false)
  assert.equal(f.rehearsal, true)
  assert.equal(f.stage, 'stats')
  assert.deepEqual(f.names, {})
  const text = JSON.stringify(f)
  for (const forbidden of ['roles', 'kernel', 'document', 'dialSign', '"dial"', c.murderer, c.ghost]) assert.ok(!text.includes(forbidden), `finale must not carry ${forbidden}`)
  // the answer lives only where no client reads
  const r = db.store.get(revealPath(nightId))
  assert.ok(r.murderer.name && r.motive.rhyme && r.victim.name)
  assert.equal(night(db, nightId).reveal, undefined)
})

test('the Host tab\'s Hush reaches the Act 7 screen: a Hush line in the reel, hush on the graph and a spotlight line, never which role', async () => {
  const { db, nightId } = await party(4)
  const t = { now: 7_500_000 }
  await walkTo(db, nightId, 2, 'orient', t)
  // the real path: the Host tab's button, through safeguards.hush and the ledger, not a record written by hand
  const r = await hostCommand(db, { nightId, command: 'hush', arg: 'ghost', now: t.now })
  assert.equal(r.hushed, true)
  assert.deepEqual(Object.keys(db.store.get(`cases/${nightId}`).exposure.ghost).sort(), ['act', 'hushedAt'], 'one record shape')
  await reveal(db, nightId, { now: t.now })
  const f = db.store.get(finalePath(nightId))
  const hush = f.stats.find(s => s.label === HUSH_LABEL)
  assert.ok(hush && !/ghost|murderer|victim/i.test(hush.value))
  assert.equal(f.graph.hush, true, 'the graph line the living room renders')
  assert.equal(f.stats.length, CANON_LABELS.length + 1)
  assert.equal(f.spotlight.length, 1)
  assert.equal(f.spotlight[0].act, 2)
  assert.ok(!/"(roles|dial)"/.test(JSON.stringify(f)))
  // both roles hushed through the older note-exposure name: still one line, still hush on the graph
  await hostCommand(db, { nightId, command: 'note-exposure', arg: 'murderer', now: t.now + 1 })
  const f2 = await finaleDoc(db, nightId, db.store.get(`cases/${nightId}`), t.now + 2)
  assert.equal(f2.graph.hush, true)
  assert.equal(f2.stats.filter(s => s.label === HUSH_LABEL).length, 1)
  assert.equal(f2.spotlight.length, 2)
})

test('Quickest on the Parlour Games counts only the Parlour Games a phone was dealt, not the eliminate or ballot windows', async () => {
  const { db, nightId, uids, names } = await party(4)
  const t = { now: 7_600_000 }
  await firstParlour(db, nightId, t)
  await answerAll(db, nightId, uids, names, t)
  t.now = ms(night(db, nightId).window.closesAt) + 1
  await hostCommand(db, { nightId, command: 'settle', now: t.now })
  // the two windows that are not Parlour Games land on every phone too
  const { openWindow } = await import('../lib/deal.js')
  for (const [kind, act, beat] of [['eliminate', 6, 'eliminate'], ['ballot', 7, 'ballot']]) {
    await openWindow(db, nightId, kind, { now: t.now, act, beat })
    t.now = ms(night(db, nightId).window.closesAt) + 1
    await hostCommand(db, { nightId, command: 'settle', now: t.now })
  }
  const anyone = db.store.get(`sessions/${uids[names[0].toLowerCase()]}`)
  assert.equal(Object.keys(anyone.windows).length, 3, 'three windows on the phone')
  const f = await finaleDoc(db, nightId, db.store.get(`cases/${nightId}`), t.now)
  const quick = f.stats.find(s => s.label === CANON_LABELS[6])
  assert.match(quick.value, /, 1 of 1$/, `one Parlour Game dealt, one answered: ${quick.value}`)
})

test('Carry on after a hold during the Victim stage keeps the wait before the closing story', async () => {
  const { db, nightId, t } = await revealed(4)
  const { EPILOGUE_AFTER_MS } = await import('../lib/finale.js')
  for (let i = 0; i < 3; i++) { t.now += 1000; await hostCommand(db, { nightId, command: 'reveal-stage', now: t.now }) }
  const named = db.store.get(finalePath(nightId))
  assert.equal(named.stage, 'victim')
  const victimAt = ms(named.victimAt)
  assert.equal(victimAt, t.now)
  // held three seconds after the Victim's name, carried on thirty seconds later
  await hostCommand(db, { nightId, command: 'finale-hold', now: victimAt + 3_000 })
  const r = await hostCommand(db, { nightId, command: 'finale-go', now: victimAt + 33_000 })
  assert.equal(r.heldMs, 30_000)
  const after = db.store.get(finalePath(nightId))
  assert.equal(ms(after.victimAt), victimAt + 30_000, 'victimAt moved by the length of the hold')
  assert.ok(victimAt + 33_000 - ms(after.victimAt) < EPILOGUE_AFTER_MS, 'the screen still waits for the closing story')
  assert.equal(after.held, 30_000)
  // a hold taken before the Victim was named leaves victimAt alone (the pause path already shifts it)
  const { db: db2, nightId: id2, t: t2 } = await revealed(4)
  await hostCommand(db2, { nightId: id2, command: 'finale-hold', now: t2.now + 5_000 })
  for (let i = 0; i < 3; i++) await hostCommand(db2, { nightId: id2, command: 'reveal-stage', now: t2.now + 6_000 })
  const v2 = ms(db2.store.get(finalePath(id2)).victimAt)
  await hostCommand(db2, { nightId: id2, command: 'finale-go', now: t2.now + 40_000 })
  assert.equal(ms(db2.store.get(finalePath(id2)).victimAt), v2, 'a hold that began before the name does not move it')
})

test('the fastest safe is the quickest right open, counted from the puzzle landing; a safe that gave way does not count', async () => {
  const { db, nightId, uids, names } = await party(3)
  const t = { now: 7_600_000 }
  await walkTo(db, nightId, 2, 'puzzle', t)
  const { solve } = await import('../lib/deal.js')
  const puzzles = db.store.get(`nights/${nightId}/private/puzzles`)
  const [first, second, third] = names.map(n => uids[n.toLowerCase()])
  const cardOf = uid => cards(db, uid, 'puzzle')[0]
  const landedAgo = (uid, msAgo) => db.store.set(`sessions/${uid}`, { ...db.store.get(`sessions/${uid}`), cards: cards(db, uid).map(c => (c.kind === 'puzzle' ? { ...c, at: new Date(t.now - msAgo) } : c)) })
  // the first phone opens it right in two minutes, the second in one, the third forces it open in three tries
  landedAgo(first, 120_000); landedAgo(second, 60_000); landedAgo(third, 10_000)
  await solve(db, { nightId, uid: first, cardId: cardOf(first).id, entry: puzzles.safe[names[0].toLowerCase()] })
  await solve(db, { nightId, uid: second, cardId: cardOf(second).id, entry: puzzles.safe[names[1].toLowerCase()] })
  for (let i = 0; i < 3; i++) await solve(db, { nightId, uid: third, cardId: cardOf(third).id, entry: [0, 0, 0] })
  assert.ok(db.store.get(`sessions/${first}`).solvedAt[cardOf(first).id])
  assert.equal(db.store.get(`sessions/${third}`).gaveWay[cardOf(third).id], true)
  await reveal(db, nightId, { now: t.now })
  const f = db.store.get(finalePath(nightId))
  const line = f.stats.find(s => s.label === 'Fastest safe').value
  assert.ok(line.startsWith(`${names[1]}, `), line)
  assert.ok(!line.includes(names[2]), 'the forced safe is not the fastest')
})

test('the reveal is staged: no name leaves private/ until the host presses, one per press in canon order, results refuse early, back forgets it', async () => {
  const { db, nightId, t, c } = await revealed(5)
  const r = db.store.get(revealPath(nightId))
  const keyTokens = ['"murderer":', '"motive":', '"victim":']
  const nothingNamed = () => {
    for (const [k, doc] of publicDocs(db, nightId)) {
      const text = JSON.stringify(doc)
      for (const tok of keyTokens) assert.ok(!text.includes(tok), `${k} carries ${tok}`)
      if (k.endsWith('/public/finale')) assert.ok(!text.includes(r.motive.rhyme), `${k} carries the rhyme`)
    }
  }
  // the host reaches the reveal beat: the reel already written is kept, nothing is named
  await hostCommand(db, { nightId, command: 'act', arg: 7, now: t.now })
  t.now = ms(night(db, nightId).window.closesAt) + 1
  await hostCommand(db, { nightId, command: 'next', now: t.now })
  assert.equal(night(db, nightId).beat, 'reveal')
  nothingNamed()
  assert.equal(db.store.get(finalePath(nightId)).stage, 'stats')
  await assert.rejects(results(db, nightId, 7, 'result'), e => e instanceof NightError && /named/.test(e.message))
  await assert.rejects(hostCommand(db, { nightId, command: 'beat', arg: 'result', now: t.now }), /named/)
  await assert.rejects(hostCommand(db, { nightId, command: 'next', now: t.now }), /named/)
  assert.equal(night(db, nightId).beat, 'reveal', 'the beat did not move')
  // one name per press
  for (const [i, stage] of STAGES.slice(1).entries()) {
    const res = await hostCommand(db, { nightId, command: 'reveal-stage', now: t.now + i })
    assert.equal(res.stage, stage)
    const f = db.store.get(finalePath(nightId))
    assert.equal(f.stage, stage)
    assert.deepEqual(Object.keys(f.names), STAGES.slice(1, i + 2), 'exactly one more name')
    if (stage === 'murderer') { assert.equal(f.names.murderer.name, r.murderer.name); assert.ok(!('victim' in f.names)); assert.ok(!JSON.stringify(f).includes(r.motive.rhyme)) }
    if (stage === 'motive') assert.equal(f.names.motive.rhyme, r.motive.rhyme)
    if (stage === 'victim') { assert.equal(f.names.victim.name, r.victim.name); assert.ok(f.victimAt); assert.ok(f.epilogue) }
    if (stage !== 'victim') await assert.rejects(results(db, nightId, 7, 'result'), /named/)
  }
  const again = await hostCommand(db, { nightId, command: 'reveal-stage', now: t.now })
  assert.equal(again.already, true)
  // the answer never reached the night doc or a session
  for (const [k, doc] of publicDocs(db, nightId)) if (!k.endsWith('/public/finale')) for (const tok of keyTokens) assert.ok(!JSON.stringify(doc).includes(tok), `${k} carries ${tok}`)
  assert.ok(c.murderer && c.ghost)
  // the reveal beat run again (a jump) keeps what the screen has shown
  await hostCommand(db, { nightId, command: 'beat', arg: 'reveal', now: t.now })
  assert.equal(db.store.get(finalePath(nightId)).stage, 'victim')
  // back one from the reveal takes the finale and the answer with it
  await hostCommand(db, { nightId, command: 'back', now: t.now })
  assert.equal(night(db, nightId).beat, 'ballot')
  assert.equal(db.store.get(finalePath(nightId)), undefined)
  assert.equal(db.store.get(revealPath(nightId)), undefined)
  // and Next writes a fresh reel with nothing named
  await hostCommand(db, { nightId, command: 'next', now: t.now })
  assert.equal(db.store.get(finalePath(nightId)).stage, 'stats')
  nothingNamed()
  // a jump back to an earlier act forgets it too
  await hostCommand(db, { nightId, command: 'act', arg: 6, now: t.now })
  assert.equal(db.store.get(finalePath(nightId)), undefined)
})

test('Next from the reveal waits for all three names; results then land', async () => {
  const { db, nightId, uids, names, t } = await revealed(4)
  await hostCommand(db, { nightId, command: 'act', arg: 7, now: t.now })
  t.now = ms(night(db, nightId).window.closesAt) + 1
  await hostCommand(db, { nightId, command: 'next', now: t.now }) // reveal
  await assert.rejects(hostCommand(db, { nightId, command: 'next', now: t.now }), /named/)
  assert.equal(night(db, nightId).beat, 'reveal', 'the beat did not move')
  for (const name of names) assert.equal(cards(db, uids[name.toLowerCase()], 'result').length, 0)
  for (let i = 0; i < 3; i++) await hostCommand(db, { nightId, command: 'reveal-stage', now: t.now })
  await hostCommand(db, { nightId, command: 'next', now: t.now })
  assert.equal(night(db, nightId).beat, 'result')
  for (const name of names) assert.equal(cards(db, uids[name.toLowerCase()], 'result').length, 1)
})

test('the closing story: every blank filled at the Victim stage, from the workshop frame', async () => {
  assert.equal(fillEpilogue(DEFAULT_EPILOGUE, { murderer: { name: 'A' }, victim: { name: 'B' }, motive: { rhyme: 'C' } }), 'And so it was A. Not for money, not for love, for this: C. And B never saw it coming.')
  const { db, nightId } = await party(4)
  const t = { now: 7_700_000 }
  db.store.set('safe_content/epilogue_frames', { items: [{ id: 'e1', text: 'It was [MURDERER], over [MOTIVE_RHYME]; [VICTIM] minded.', order: 0 }] })
  await walkTo(db, nightId, 2, 'orient', t)
  await reveal(db, nightId, { now: t.now })
  const r = db.store.get(revealPath(nightId))
  for (let i = 0; i < 3; i++) await hostCommand(db, { nightId, command: 'reveal-stage', now: t.now })
  const f = db.store.get(finalePath(nightId))
  assert.equal(f.epilogue, `It was ${r.murderer.name}, over ${r.motive.rhyme}; ${r.victim.name} minded.`)
  assert.ok(!/\[(MURDERER|VICTIM|MOTIVE_RHYME)\]/.test(f.epilogue))
})

test('a hold stands the screen still, and go moves every later moment on the schedule by the length of the hold', async () => {
  const { db, nightId, t } = await revealed(4)
  const before = db.store.get(finalePath(nightId))
  const t0 = 10_000 // held ten seconds into the reel
  await hostCommand(db, { nightId, command: 'finale-hold', now: t.now + t0 })
  assert.equal(ms(db.store.get(finalePath(nightId)).holdAt), t.now + t0)
  assert.equal((await hostCommand(db, { nightId, command: 'finale-hold', now: t.now + t0 + 1 })).already, true)
  const r = await hostCommand(db, { nightId, command: 'finale-go', now: t.now + t0 + 20_000 })
  assert.equal(r.heldMs, 20_000)
  const after = db.store.get(finalePath(nightId))
  assert.equal(after.holdAt, null)
  assert.equal(after.held, 20_000)
  assert.equal(ms(after.at), ms(before.at), 'the start never moves')
  for (const k of Object.keys(before.schedule)) assert.equal(after.schedule[k], before.schedule[k] + (before.schedule[k] > t0 ? 20_000 : 0), `schedule.${k}`)
  for (const [i, s] of before.stats.entries()) assert.equal(after.stats[i].showAt, s.showAt + (s.showAt > t0 ? 20_000 : 0), `stat ${i}`)
  assert.ok(before.stats.some(s => s.showAt <= t0) && before.stats.some(s => s.showAt > t0), 'the hold fell in the middle of the reel')
  assert.equal((await go(db, nightId, { now: t.now })).already, true)
})

test('achievements: given by a tap through Act 5, on the phone at once and in the reel at the end; refused in Act 6', async () => {
  const { db, nightId, uids, names } = await party(4)
  const t = { now: 7_800_000 }
  db.store.set('safe_content/achievements', { items: [
    { id: 'a1', text: 'Clean Plate Club: left nothing on the plate, not even the garnish.', order: 0 },
    { id: 'a2', text: "Crookshank's Confidant: first to pet Salem.", order: 1 },
  ] })
  await walkTo(db, nightId, 3, 'down', t)
  const key = names[1].toLowerCase(), uid = uids[key]
  const r = await hostCommand(db, { nightId, command: 'award', arg: `${key}:2`, now: t.now })
  assert.equal(r.dealt, true)
  assert.equal(r.awards, 1)
  const card = cards(db, uid, 'award')
  assert.equal(card.length, 1)
  assert.equal(card[0].title, "Crookshank's Confidant")
  assert.equal(card[0].text, 'first to pet Salem.')
  assert.ok(card[0].button)
  assert.equal(cards(db, uids[names[0].toLowerCase()], 'award').length, 0, 'nobody else got it')
  assert.equal((await hostCommand(db, { nightId, command: 'award', arg: `${key}:2`, now: t.now })).already, true)
  await assert.rejects(hostCommand(db, { nightId, command: 'award', arg: `${key}:9`, now: t.now }), /No such achievement/)
  await assert.rejects(hostCommand(db, { nightId, command: 'award', arg: `nobody:1`, now: t.now }), /No such guest/)
  await assert.rejects(hostCommand(db, { nightId, command: 'award', arg: 'bad', now: t.now }), /which guest/)
  const doc = db.store.get(awardsPath(nightId))
  assert.equal(Object.keys(doc.awards).length, 1)
  assert.ok(!JSON.stringify(doc).includes('"role"'))
  // Act 6: closed
  await hostCommand(db, { nightId, command: 'act', arg: 6, now: t.now })
  await assert.rejects(hostCommand(db, { nightId, command: 'award', arg: `${key}:1`, now: t.now }), /close at the end of Act 5/)
  // the reel carries the segment, after the stats and before the graph
  await reveal(db, nightId, { now: t.now })
  const f = db.store.get(finalePath(nightId))
  assert.equal(f.achievements.length, 1)
  assert.deepEqual(f.achievements[0], { name: names[1], title: "Crookshank's Confidant", line: 'first to pet Salem.', showAt: f.schedule.awards })
  assert.ok(f.schedule.awards < f.schedule.graph, 'the segment has length when there is something to show')
  assert.ok(f.stats.every(s => s.showAt < f.schedule.awards))
})

test('nextOf still ends Act 4 at the fifth station', () => {
  assert.deepEqual(nextOf(4, 'station5'), { act: 5, beat: 'roam' })
})

test('the Parlour Games awards join the achievements at the reveal: names only, from the guests\' own answers, never a missed window', async () => {
  const { db, nightId, uids, names } = await party(4)
  const t = { now: 7_800_000 }
  await firstParlour(db, nightId, t)
  const w = night(db, nightId).window
  const { answer } = await import('../lib/deal.js')
  const picks = [['a', 'a', 'a'], ['a', 'a', 'a'], ['a', 'a', 'b'], ['b', 'b', 'b']]
  for (let i = 0; i < 3; i++) await answer(db, { nightId, uid: uids[names[i].toLowerCase()], windowId: w.id, picks: picks[i], now: t.now })
  t.now = ms(w.closesAt) + 1
  await hostCommand(db, { nightId, command: 'settle', now: t.now }) // the fourth phone is picked for: it does not count
  const f = await finaleDoc(db, nightId, db.store.get(`cases/${nightId}`), t.now)
  const won = f.achievements.filter(a => a.parlour)
  assert.ok(won.length >= 1, 'at least one Parlour Games award')
  const titles = won.map(a => a.title)
  assert.ok(titles.includes('Kindred Spirits'))
  assert.equal(won.find(a => a.title === 'Kindred Spirits').name, `${names[0]} and ${names[1]}`)
  assert.ok(won.every(a => !a.name.includes(names[3])), 'answers picked for a missed window do not count')
  assert.ok(f.schedule.awards < f.schedule.graph, 'the awards get their moment on the screen')
  for (const a of won) assert.deepEqual(Object.keys(a).sort(), ['line', 'name', 'parlour', 'showAt', 'title'], 'names, a title and a line: nothing else')
})
