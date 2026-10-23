import { test } from 'node:test'
import assert from 'node:assert/strict'
import { FakeFirestore } from './fake-firestore.mjs'
import { walkLights } from './lights-walk.mjs'
import { createNight, join, MOTIVES } from '../lib/night.js'
import { hostCommand, nextOf, prevOf, firstBeat, player } from '../lib/run.js'
import {
  NIGHT, STATIONS, affectionOutcome, fillPools, assembleTestimony, stationFor, beatsOf, ms, openWindow,
} from '../lib/deal.js'

// A throwaway night with four phones. Nothing here is a real case; the
// rehearsal case is generated fresh by the dealer and thrown away with the db.
async function party() {
  const db = new FakeFirestore()
  db.store.set('meta/game', { host_jonathan: 'Jon', host_susan: 'Susan' })
  db.store.set('safe_content/pools', { items: [
    { id: 'p1', text: 'the scullery', pool: 'room', order: 0 }, { id: 'p2', text: 'the parlour', pool: 'room', order: 1 },
    { id: 'p3', text: 'a quarter past six', pool: 'time', order: 0 }, { id: 'p4', text: 'nearly seven', pool: 'time', order: 1 },
  ] })
  const { nightId } = await createNight(db)
  const phones = { jon: 'uid-jon', jessa: 'uid-jessa', jacob: 'uid-jacob', marie: 'uid-marie' }
  for (const [name, uid] of Object.entries(phones)) await join(db, { uid, nightId, name: name[0].toUpperCase() + name.slice(1) })
  return { db, nightId, phones }
}
const night = (db, id) => db.store.get(`nights/${id}`)
const session = (db, uid) => db.store.get(`sessions/${uid}`)
const cards = (db, uid, kind) => (session(db, uid).cards ?? []).filter(c => !kind || c.kind === kind)

test('the beat list walks every act in order and stops where the host has their own button', () => {
  assert.equal(firstBeat(1), 'arrive')
  assert.deepEqual(nextOf(1, 'arrive'), { act: 1, beat: 'meet' })
  assert.equal(nextOf(1, 'ready'), null, 'Act 1 ends in the blackout, not in Next')
  assert.deepEqual(nextOf(2, 'checkin'), { act: 3, beat: 'down' })
  assert.equal(nextOf(7, 'result'), null)
  assert.deepEqual(prevOf(3, 'down'), { act: 2, beat: 'checkin' })
  assert.equal(prevOf(2, 'orient'), null, 'nothing before the power returning')
  for (const act of Object.keys(NIGHT.acts)) assert.ok(beatsOf(act).length > 0, `act ${act} has beats`)
})

test('the whole night, one Next at a time: every phone gets the same shape of thing at every beat', async () => {
  const { db, nightId, phones } = await party()
  const uids = Object.values(phones)
  let now = 1_000_000
  const next = async () => hostCommand(db, { nightId, command: 'next', now })

  // Act 0 → Act 1 and through its beats
  await next()
  assert.equal(night(db, nightId).act, 1)
  assert.equal(night(db, nightId).beat, 'arrive')
  await next(); await next(); await next()
  for (const uid of uids) assert.deepEqual(cards(db, uid, 'notice').map(c => c.key), ['meet', 'introduce', 'ready'])
  await assert.rejects(next, /Blackout/)

  // Blackout, then the power returns: roles land, held on every phone the same way
  await hostCommand(db, { nightId, command: 'blackout' })
  await assert.rejects(next, /Power/)
  await hostCommand(db, { nightId, command: 'power', now })
  const n2 = night(db, nightId)
  assert.equal(n2.act, 2); assert.equal(n2.phase, 'prompt'); assert.equal(n2.beat, 'orient'); assert.equal(n2.rehearsal, true)
  const c = db.store.get(`cases/${nightId}`)
  assert.equal(Object.values(c.roles).filter(r => r === 'murderer').length, 1)
  assert.equal(Object.values(c.roles).filter(r => r === 'ghost').length, 1)
  for (const uid of uids) {
    const role = cards(db, uid, 'role')
    assert.equal(role.length, 1)
    assert.equal(role[0].id, '2-power-role')
    assert.ok(role[0].text.length > 40)
    assert.equal(cards(db, uid, 'notice').at(-1).key, 'orient')
    assert.equal(session(db, uid).role, undefined, 'a session never carries its role as a field')
  }
  // pressing Power twice deals nothing twice
  await hostCommand(db, { nightId, command: 'power', now })
  for (const uid of uids) assert.equal(cards(db, uid, 'role').length, 1)

  // Act 2: news, cat, puzzle, a Parlour Game when it is due, check-in
  await next() // news
  await next() // cat: the first wave goes, one guest to each cat; everyone else waits in the living room
  const sent = uids.filter(uid => session(db, uid).lights?.step === 'go')
  assert.equal(sent.length, Math.min(4, uids.length), 'one guest at each of the four cats')
  for (const uid of uids) {
    assert.ok(['wait', 'go'].includes(session(db, uid).lights.step), 'every phone has a next step')
    assert.equal(cards(db, uid, 'testimony').length, 0, 'nothing is said until the guest is with the cat')
  }
  const walked = await walkLights(db, nightId, { now })
  assert.equal(walked.meetings, 4 * uids.length, 'every guest visits all four cats'); assert.equal(walked.worst, 1, 'never two guests at a cat')
  for (const uid of uids) {
    const all = cards(db, uid, 'testimony')
    assert.equal(all.length, 4, 'one card from each cat')
    const greets = all.filter(x => x.outcome === 'greet')
    assert.equal(greets.length, 3, 'three cats only greet')
    for (const g of greets) assert.ok(!g.hint && g.lines.length === 1, 'a greeting carries no hint')
    const t = all.filter(x => x.outcome !== 'greet')
    assert.equal(t.length, 1, 'one real hint')
    assert.ok(['full', 'partial', 'deflect'].includes(t[0].outcome))
    assert.ok(t[0].lines.length >= 1)
    assert.ok(!t[0].lines.join(' ').includes('[ROOM]'), 'blanks are filled')
    assert.ok(t[0].hint?.text, 'the greeting carries the private hint (a marked stand-in until it is written)')
    assert.notEqual(t[0].cat, 'irwin', 'Sir Irwin keeps no room in Act 2')
    if (t[0].cat === 'granolia') assert.equal(t[0].room, 'the Study')
    assert.equal(session(db, uid).lights.step, 'done')
  }
  assert.ok(db.store.get(`nights/${nightId}/private/puzzles`).safe.jon.length === 3, 'the safe answer is kept by guest key')
  await next() // puzzle
  for (const uid of uids) assert.equal(cards(db, uid, 'puzzle').length, 1)
  // the first Parlour Game pops up on its own when it is due: the once-a-minute tick
  const sched = db.store.get(`nights/${nightId}/private/parlour`)
  assert.equal(sched.act, 2); assert.equal(sched.count, 5)
  await hostCommand(db, { nightId, command: 'tick', now: ms(sched.due0) - 1 })
  assert.ok(!night(db, nightId).window, 'not a moment early')
  now = ms(sched.due0)
  await hostCommand(db, { nightId, command: 'tick', now })
  const w = night(db, nightId).window
  assert.equal(w.kind, 'questions'); assert.equal(w.settled, false)
  assert.equal(w.id, 'questions-2-p0')
  assert.equal(ms(w.closesAt) - ms(w.opensAt), NIGHT.windows.questions.ms)
  const shown = session(db, uids[0]).windows[w.id]
  for (const uid of uids) {
    const set = session(db, uid).windows[w.id]
    assert.deepEqual(Object.keys(set).sort(), ['beats', 'kind', 'opensAt'], 'no cat, no numbers: the listening cat is a secret')
    assert.deepEqual(set, shown, 'every phone gets the same set')
    assert.equal(set.beats.length, 3)
    for (const b of set.beats) {
      assert.equal(b.choices.length, 2, 'exactly two answers')
      for (const ch of b.choices) assert.deepEqual(Object.keys(ch).sort(), ['k', 'text'], 'no numbers on a phone')
    }
  }
  // two phones answer; Next refuses while the window is open; after it closes the other two get random picks
  const first = session(db, uids[1]).windows[w.id]
  await player.answer(db, { nightId, uid: uids[1], windowId: w.id, picks: first.beats.map(b => b.choices[0].k), now })
  await player.answer(db, { nightId, uid: uids[2], windowId: w.id, picks: ['a', 'b', 'a'], now })
  await assert.rejects(() => player.answer(db, { nightId, uid: uids[2], windowId: w.id, picks: ['x', 'b', 'a'], now }).then(r => { if (r.already) throw new Error('already') }), /already/)
  await assert.rejects(next, /still choosing/)
  now += NIGHT.windows.questions.ms + 1
  await next() // check-in (settles first)
  assert.equal(night(db, nightId).window.settled, true)
  for (const uid of uids) assert.ok(session(db, uid).answers[w.id].picks.length === 3)
  assert.equal(session(db, uids[0]).answers[w.id].defaulted, true)
  assert.equal(session(db, uids[1]).answers[w.id].defaulted, false)
  for (const uid of uids) for (const v of Object.values(session(db, uid).affection)) assert.ok(v >= 1 && v <= 5)
  // the hidden roles' points reach the dial; their phones look like everyone else's
  assert.equal(typeof db.store.get(`cases/${nightId}`).dial, 'number')

  // Act 3: dinner, bulletin, groups
  await next(); assert.equal(night(db, nightId).act, 3)
  await next()
  await next() // groups
  const rot = db.store.get(`nights/${nightId}/public/rotation`)
  assert.equal(rot.groups.length, 2)
  assert.equal(rot.studyOrder.length, 2)
  const m = c.murderer, g = c.ghost
  assert.ok(!rot.groups.some(grp => grp.members.some(x => x.key === m) && grp.members.some(x => x.key === g)), 'hidden roles apart')
  for (const uid of uids) {
    assert.equal(cards(db, uid, 'group').length, 1)
    assert.ok(session(db, uid).group)
  }

  // Act 4: five stations; everyone visits the study exactly once
  const visited = Object.fromEntries(uids.map(u => [u, []]))
  for (const b of beatsOf(4)) {
    await next()
    assert.equal(night(db, nightId).beat, b.key)
    if (b.action === 'rotate') for (const uid of uids) visited[uid].push(cards(db, uid, 'station').at(-1).station)
  }
  for (const uid of uids) {
    assert.equal(visited[uid].length, 5)
    assert.deepEqual([...visited[uid]].sort(), STATIONS.map(s => s.key).sort(), 'every station once')
    assert.ok(cards(db, uid, 'clue').length >= 1, 'the study paid out in rehearsal')
  }

  // Act 5, Act 6
  await next(); await next()
  assert.equal(night(db, nightId).act, 5)
  await next() // Act 6 opens on its two Parlour Games, the first at once
  assert.equal(night(db, nightId).act, 6)
  assert.equal(night(db, nightId).beat, 'games')
  assert.equal(night(db, nightId).window.kind, 'questions')
  now += NIGHT.windows.questions.ms + 1
  await next() // the drawing
  assert.equal(db.store.get(`nights/${nightId}/public/relay`).state, 'walk')
  await assert.rejects(next, /still running/) // the phones stay on the drawing until it is done or cleared
  await hostCommand(db, { nightId, command: 'relay-reset', now })
  await next() // door
  await next() // eliminate
  const ew = night(db, nightId).window
  assert.equal(ew.kind, 'eliminate')
  await player.eliminate(db, { nightId, uid: uids[0], target: { kind: 'motive', n: 3 }, now })
  await player.eliminate(db, { nightId, uid: uids[1], target: { kind: 'person', key: 'jacob' }, now })
  await assert.rejects(() => player.eliminate(db, { nightId, uid: uids[1], target: { kind: 'person', key: 'nobody' }, now }), /Pick/)
  now += NIGHT.windows.eliminate.ms + 1

  // Act 7: ballot, reveal, result
  await next()
  const bw = night(db, nightId).window
  assert.equal(bw.kind, 'ballot')
  assert.equal(Object.keys(night(db, nightId).eliminations).length, 4, 'two picked, two defaulted')
  await player.ballot(db, { nightId, uid: uids[1], murderer: m, motive: c.motive, victim: g, now })
  await assert.rejects(() => player.ballot(db, { nightId, uid: uids[2], murderer: 'nobody', motive: 1, victim: g, now }), /party/)
  await assert.rejects(next, /still choosing/)
  now += NIGHT.windows.ballot.ms + 1
  await next() // reveal: the answer goes where no phone reads; the screen names nothing until the host presses
  const r = db.store.get(`nights/${nightId}/private/reveal`)
  assert.equal(r.murderer.key, m); assert.equal(r.victim.key, g); assert.equal(r.motive.n, c.motive)
  assert.equal(night(db, nightId).reveal, undefined)
  assert.deepEqual(db.store.get(`nights/${nightId}/public/finale`).names, {})
  await assert.rejects(next, /named/)
  for (let i = 0; i < 3; i++) await hostCommand(db, { nightId, command: 'reveal-stage', now })
  await next() // results
  const res = session(db, uids[1]).result
  assert.deepEqual([res.murderer, res.motive, res.victim], [true, true, true])
  assert.equal(night(db, nightId).tally.of, 4)
  assert.ok(cards(db, uids[1], 'result').length === 1)
  await assert.rejects(next, /end of the night/)

  // The seal, checked after the whole walk: nothing a phone can read names a role.
  for (const uid of uids) {
    const s = session(db, uid)
    assert.equal(s.role, undefined)
    for (const [, set] of Object.entries(s.windows)) assert.ok(!JSON.stringify(set).includes('"av"'))
  }
  const pub = JSON.stringify({ n: night(db, nightId), content: db.store.get(`nights/${nightId}/public/content`), rot })
  assert.ok(!/"roles"|dialSign|"dial"/.test(pub), 'the night doc carries no roles and no dial')
})

test('back moves without dealing; act jump to 2 deals the roles; light-up opens a window in Acts 2, 4 and 6 only', async () => {
  const { db, nightId, phones } = await party()
  const uids = Object.values(phones)
  await assert.rejects(() => hostCommand(db, { nightId, command: 'light-up' }), /Acts 2, 4 and 6/)
  await hostCommand(db, { nightId, command: 'act', arg: 2 })
  assert.equal(night(db, nightId).phase, 'prompt')
  for (const uid of uids) assert.equal(cards(db, uid, 'role').length, 1)
  await hostCommand(db, { nightId, command: 'next' })
  await hostCommand(db, { nightId, command: 'back' })
  assert.equal(night(db, nightId).beat, 'orient')
  for (const uid of uids) assert.equal(cards(db, uid, 'notice').filter(c => c.key === 'news').length, 1, 'back deals nothing new')
  const r = await hostCommand(db, { nightId, command: 'light-up' })
  assert.equal(r.phones, 4)
  assert.equal(night(db, nightId).window.kind, 'questions')
  await assert.rejects(() => hostCommand(db, { nightId, command: 'settle' }), /still choosing/)
})

test('an act jump that skips the power beat still builds the case and deals every phone its role card', async () => {
  const { db, nightId, phones } = await party()
  const uids = Object.values(phones)
  await hostCommand(db, { nightId, command: 'act', arg: 1 })
  assert.equal(db.store.get(`cases/${nightId}`), undefined, 'Act 1: no case yet')
  for (const uid of uids) assert.equal(cards(db, uid, 'role').length, 0)
  // the host taps 3 on the acts row, then Next to the groups
  await hostCommand(db, { nightId, command: 'act', arg: 3 })
  const n = night(db, nightId)
  assert.equal(n.act, 3)
  assert.equal(n.phase, 'prompt', 'the roles have just landed: every phone shows its card first')
  const c = db.store.get(`cases/${nightId}`)
  assert.ok(c?.roles, 'the case was built on the way')
  for (const uid of uids) {
    const role = cards(db, uid, 'role')
    assert.equal(role.length, 1, 'exactly one role card on every phone')
    assert.equal(role[0].id, '2-power-role')
  }
  await hostCommand(db, { nightId, command: 'next' })
  await hostCommand(db, { nightId, command: 'next' })
  assert.equal(night(db, nightId).beat, 'groups')
  assert.equal(night(db, nightId).phase, 'act')
  for (const uid of uids) assert.equal(cards(db, uid, 'role').length, 1, 'still one, never two')
  // a later jump deals nothing twice; a jump back to 1 deals nothing either
  await hostCommand(db, { nightId, command: 'act', arg: 5 })
  assert.equal(night(db, nightId).phase, 'act', 'the roles were already out: no prompt again')
  for (const uid of uids) assert.equal(cards(db, uid, 'role').length, 1)
  const { db: db2, nightId: n2, phones: p2 } = await party()
  await hostCommand(db2, { nightId: n2, command: 'act', arg: 1 })
  assert.equal(db2.store.get(`cases/${n2}`), undefined)
  for (const uid of Object.values(p2)) assert.equal(cards(db2, uid, 'role').length, 0)
})

test('a Parlour Game opens once at its time: a second tick opens nothing twice and pushes the dial once; light-up is always fresh; none during the drawing', async () => {
  const { db, nightId, phones } = await party()
  const uids = Object.values(phones)
  let now = 3_000_000
  await hostCommand(db, { nightId, command: 'act', arg: 2, now })
  await hostCommand(db, { nightId, command: 'next', now }) // news: the role prompt is over
  const sched = () => db.store.get(`nights/${nightId}/private/parlour`)
  now = ms(sched().due0)
  await hostCommand(db, { nightId, command: 'tick', now })
  const w1 = night(db, nightId).window
  assert.equal(w1.id, 'questions-2-p0', 'the id names the act and the slot, not the moment')
  now += NIGHT.windows.questions.ms + 1
  await hostCommand(db, { nightId, command: 'settle', now })
  assert.equal(night(db, nightId).window.settled, true)
  const dialLog = db.store.get(`cases/${nightId}`).dialLog.length
  const sets = Object.fromEntries(uids.map(u => [u, Object.keys(session(db, u).windows)]))
  // the tick again, and the dealer asked for the same slot again: the same window stands, settled
  await hostCommand(db, { nightId, command: 'tick', now })
  await openWindow(db, nightId, 'questions', { now, act: 2, beat: 'p0' })
  assert.equal(night(db, nightId).window.id, w1.id)
  assert.equal(night(db, nightId).window.settled, true)
  for (const u of uids) assert.deepEqual(Object.keys(session(db, u).windows), sets[u], 'no second set on any phone')
  assert.equal(db.store.get(`cases/${nightId}`).dialLog.length, dialLog, 'the dial moved once for this game')
  // the next one waits for its own time and for the gap after the last one
  const gap = NIGHT.parlour.minGapMin * 60_000
  await hostCommand(db, { nightId, command: 'tick', now: Math.max(ms(sched().due1), ms(sched().lastAt) + gap) - 1 })
  assert.equal(night(db, nightId).window.id, w1.id)
  // the explicit button is a fresh window every time, and no set is used twice
  const lit = await hostCommand(db, { nightId, command: 'light-up', now })
  assert.notEqual(lit.id, w1.id)
  assert.equal(night(db, nightId).window.id, lit.id)
  assert.equal(night(db, nightId).window.settled, false)
  for (const u of uids) assert.equal(Object.keys(session(db, u).windows).length, 2)
  const priv = db.store.get(`nights/${nightId}/private/windows`)
  assert.notEqual(priv[lit.id].setId, priv[w1.id].setId, 'light-up picks a set not used tonight')
  // Act 6 opens on its Parlour Games, back to back, before the drawing (22 Oct). The four
  // Act 2 games that never got their turn come along (the twelve are one budget for the
  // night), first in line, then Act 6's own two; the first opens the moment the act does
  now += NIGHT.windows.questions.ms + 1
  await hostCommand(db, { nightId, command: 'act', arg: 6, now })
  assert.equal(night(db, nightId).beat, 'games')
  assert.equal(sched().act, 6)
  assert.equal(sched().count, 4 + 2)
  assert.deepEqual(sched().slots.map(s => `${s.act}-${s.slot}`), ['2-1', '2-2', '2-3', '2-4', '6-0', '6-1'])
  for (let i = 1; i < 6; i++) assert.equal(ms(sched()[`due${i}`]) - ms(sched()[`due${i - 1}`]), NIGHT.parlour.startGapSec * 1000, 'back to back')
  const carried = night(db, nightId).window
  assert.equal(carried.id, 'questions-6-p2-1', 'game 1 of Act 2, played first in Act 6, at once')
  // the next follows one short gap later, not the four minutes of Acts 2 and 4
  now += NIGHT.windows.questions.ms + 1
  await hostCommand(db, { nightId, command: 'tick', now })
  assert.equal(night(db, nightId).window.id, carried.id, 'not before its gap')
  now = ms(sched().due1)
  await hostCommand(db, { nightId, command: 'tick', now })
  assert.equal(night(db, nightId).window.id, 'questions-6-p2-2')
  // the host moves on to the drawing; a game that falls due waits until the drawing is over
  now += NIGHT.windows.questions.ms + 1
  await hostCommand(db, { nightId, command: 'next', now })
  assert.equal(night(db, nightId).beat, 'drawing')
  now = ms(sched().due2) + 1
  await hostCommand(db, { nightId, command: 'tick', now })
  assert.equal(night(db, nightId).window.id, 'questions-6-p2-2', 'nothing pops up over the drawing')
  const c = db.store.get(`cases/${nightId}`)
  const priv6 = db.store.get(`nights/${nightId}/private/windows`)[carried.id]
  assert.equal(priv6.planAct, 2); assert.equal(priv6.slot, 1)
  assert.equal(priv6.setId, c.parlourPlan.acts[2][1].setId, 'the set the plan named for it')
})

test('the safe: wrong twice, then it gives way; right pays a document once', async () => {
  const { db, nightId, phones } = await party()
  await hostCommand(db, { nightId, command: 'act', arg: 2 })
  await hostCommand(db, { nightId, command: 'beat', arg: 'cat' })
  await hostCommand(db, { nightId, command: 'beat', arg: 'puzzle' })
  const uid = phones.jessa
  const puzzle = cards(db, uid, 'puzzle')[0]
  const safe = db.store.get(`nights/${nightId}/private/puzzles`).safe
  assert.deepEqual(Object.keys(safe).sort(), ['jacob', 'jessa', 'jon', 'marie'], 'the safe is kept by guest, never by phone')
  const answer = safe.jessa
  const right = await player.solve(db, { nightId, uid, cardId: puzzle.id, entry: answer })
  assert.equal(right.right, true)
  assert.equal(cards(db, uid, 'document').length, 1)
  const again = await player.solve(db, { nightId, uid, cardId: puzzle.id, entry: answer })
  assert.equal(again.already, true)
  assert.equal(cards(db, uid, 'document').length, 1)

  // Marie's battery dies: her right numbers open the safe on her new phone first try
  await join(db, { uid: 'uid-marie-2', nightId, name: 'Marie' })
  const p3 = cards(db, 'uid-marie-2', 'puzzle')[0]
  assert.ok(p3, 'the puzzle card came along')
  const moved = await player.solve(db, { nightId, uid: 'uid-marie-2', cardId: p3.id, entry: safe.marie })
  assert.equal(moved.right, true)
  assert.equal(moved.tries, 1)
  assert.equal(cards(db, 'uid-marie-2', 'document')[0].gaveWay, undefined)

  const uid2 = phones.jacob
  const p2 = cards(db, uid2, 'puzzle')[0]
  assert.equal((await player.solve(db, { nightId, uid: uid2, cardId: p2.id, entry: [1, 2, 3] })).right, false)
  assert.equal((await player.solve(db, { nightId, uid: uid2, cardId: p2.id, entry: [1, 2, 3] })).right, false)
  const gave = await player.solve(db, { nightId, uid: uid2, cardId: p2.id, entry: [1, 2, 3] })
  assert.equal(gave.gaveWay, true)
  assert.equal(cards(db, uid2, 'document')[0].gaveWay, true)
})

test('affection gates a testimony: Irwin never fails, Boo needs four, the others roll', () => {
  for (let i = 0; i < 20; i++) assert.equal(affectionOutcome('irwin', 1), 'full')
  assert.equal(affectionOutcome('boo', 3), 'deflect')
  assert.equal(affectionOutcome('boo', 4), 'full')
  assert.equal(affectionOutcome('salem', 5, () => 4), 'partial')   // roll 5, level 5
  assert.equal(affectionOutcome('salem', 5, () => 0), 'full')      // roll 1
  assert.equal(affectionOutcome('zimothy', 1, () => 2), 'deflect') // roll 3
})

test('pools fill every blank; Granolia gets exactly one blank wrong; a partial answer is one sentence', () => {
  const pools = { room: ['the scullery', 'the parlour'], time: ['six', 'seven'] }
  const k = 'Seen in [ROOM] at [TIME], and again in [ROOM].'
  const straight = fillPools(k, pools, { pick: () => 0 })
  assert.equal(straight, 'Seen in the scullery at six, and again in the scullery.')
  const garbled = fillPools(k, pools, { garble: true, pick: () => 0 })
  assert.equal(garbled, 'Seen in the parlour at six, and again in the scullery.')
  const t = assembleTestimony({ cat: 'salem', outcome: 'partial', opener: 'Hm.', closer: 'There.', refusal: 'No.', kernel: 'One thing. Two things.' })
  assert.deepEqual(t.lines, ['Hm.', 'One thing.', 'There.'])
  const d = assembleTestimony({ cat: 'salem', outcome: 'deflect', opener: 'Hm.', closer: 'There.', refusal: 'No.', kernel: 'One thing.' })
  assert.deepEqual(d.lines, ['No.'])
})

test('the study is the clock: a group at study position p is in the study at rotation p', () => {
  const rot = { studyOrder: ['g2', 'g1', 'g3'] }
  assert.equal(stationFor(rot, 'g2', 0).key, 'study')
  assert.equal(stationFor(rot, 'g1', 1).key, 'study')
  assert.equal(stationFor(rot, 'g3', 2).key, 'study')
  assert.equal(stationFor(rot, 'g1', 0).key, STATIONS[4].key)
  const seen = new Set([0, 1, 2, 3, 4].map(r => stationFor(rot, 'g3', r).key))
  assert.equal(seen.size, 5)
})

test('the rehearsal case is thrown away with the night: a new night deals a new one', async () => {
  const a = await party()
  await hostCommand(a.db, { nightId: a.nightId, command: 'act', arg: 2 })
  const b = await party()
  await hostCommand(b.db, { nightId: b.nightId, command: 'act', arg: 2 })
  assert.ok(MOTIVES.some(m => m.n === a.db.store.get(`cases/${a.nightId}`).motive))
  assert.notEqual(a.nightId, b.nightId)
})
