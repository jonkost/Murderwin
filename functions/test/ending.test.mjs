import { test } from 'node:test'
import assert from 'node:assert/strict'
import { FakeFirestore } from './fake-firestore.mjs'
import { createNight, join } from '../lib/night.js'
import { hostCommand, player } from '../lib/run.js'
import { NIGHT, beatsOf, beatSpec, ms } from '../lib/deal.js'
import { tick, tickParlour, parlourPath, GRACE_MS } from '../lib/windows.js'
import { relayPaths } from '../lib/relay.js'

// The ending (handoff 11 Nov 2026, A6; Jon: "talk, conversation, and then I
// will trigger through the host area on my phone to start the vote... When
// anything is entered by the last person, automatically continue"): the door,
// Talk it over, the vote. Throwaway nights in a fake Firestore; the rehearsal
// case the dealer makes is read here only for a key or two, and nothing from
// it is printed.

async function party(names = ['Jon', 'Jessa', 'Jacob', 'Marie']) {
  const db = new FakeFirestore()
  db.store.set('meta/game', { host_jonathan: 'Jon', host_susan: 'Susan' })
  const { nightId } = await createNight(db)
  const uids = []
  for (const name of names) { const uid = `uid-${name.toLowerCase()}`; await join(db, { uid, nightId, name }); uids.push(uid) }
  return { db, nightId, uids }
}
const night = (db, id) => db.store.get(`nights/${id}`)
const session = (db, uid) => db.store.get(`sessions/${uid}`)
const notices = (db, uid) => (session(db, uid).cards ?? []).filter(c => c.kind === 'notice')

// Straight to the vote: the roles out, the role prompt over, then Act 7's first beat.
async function atTheVote({ names, now = 5_000_000 } = {}) {
  const p = await party(names)
  await hostCommand(p.db, { nightId: p.nightId, command: 'act', arg: 2, now })
  await hostCommand(p.db, { nightId: p.nightId, command: 'next', now }) // the news: the role prompt is over
  await hostCommand(p.db, { nightId: p.nightId, command: 'act', arg: 7, now })
  const w = night(p.db, p.nightId).window
  assert.equal(w.kind, 'ballot')
  return { ...p, now, w, keys: Object.keys(night(p.db, p.nightId).roster) }
}
const vote = (p, uid, { murderer = p.keys[0], motive = 3, victim = p.keys[1], now = p.now } = {}) =>
  player.ballot(p.db, { nightId: p.nightId, uid, murderer, motive, victim, now })

test('Act 6 ends in talk and Act 7 opens on the vote: the seed has no other window and no round after the door', () => {
  assert.deepEqual(beatsOf(6).map(b => b.key), ['games', 'drawing', 'door', 'talk'])
  const talk = beatSpec(6, 'talk')
  assert.deepEqual([talk.name, talk.action, talk.screen], ['Talk it over', 'notice:talk', 'talk'])
  assert.equal(talk.sound, undefined, 'the music and the sounds stay as at the door')
  const first7 = beatsOf(7)[0]
  assert.deepEqual([first7.key, first7.name, first7.action, first7.screen], ['ballot', 'The vote', 'window:ballot', 'vote'])
  assert.deepEqual(Object.keys(NIGHT.windows).sort(), ['ballot', 'questions'])
  assert.deepEqual(NIGHT.windows.ballot, { ms: 120_000, title: 'The vote' }, 'two minutes, the backstop')
  for (const [act, spec] of Object.entries(NIGHT.acts)) for (const b of spec.beats) {
    if (String(b.action ?? '').startsWith('window:')) assert.ok(['window:questions', 'window:ballot'].includes(b.action), `${act}/${b.key}`)
  }
})

test('Talk it over: one plain notice on every phone, no window, and the trace behind the door if the drawing is done', async () => {
  const { db, nightId, uids } = await party()
  const now = 4_000_000
  await hostCommand(db, { nightId, command: 'act', arg: 2, now })
  await hostCommand(db, { nightId, command: 'next', now })
  await hostCommand(db, { nightId, command: 'act', arg: 6, now })
  // the drawing was finished, but the trace never landed (a write that failed): the talk beat asks again
  db.store.set(relayPaths(nightId).pub, { state: 'done', doorOpen: true })
  assert.equal(db.store.get(`nights/${nightId}/public/trace`), undefined)
  const before = night(db, nightId).window
  const r = await hostCommand(db, { nightId, command: 'beat', arg: 'talk', now: now + 200_000 })
  assert.equal(r.dealt, uids.length, 'every phone is told')
  assert.equal(night(db, nightId).beat, 'talk')
  for (const uid of uids) {
    const card = notices(db, uid).at(-1)
    assert.deepEqual([card.id, card.key, card.title, card.text, card.button], ['6-talk-talk', 'talk', 'Talk it over', 'The vote is next.', 'Got it'])
  }
  assert.equal(night(db, nightId).window.id, before.id, 'no window opens: nothing to tap, no clock (the last one is the Parlour Game from the start of the act)')
  assert.equal(night(db, nightId).window.settled, true)
  assert.ok(db.store.get(`nights/${nightId}/public/trace`), 'the trace is behind the door')
  assert.equal(db.store.get(`nights/${nightId}/public/cues`).hall, 'green')
  // pressed twice, the notice is dealt once
  await hostCommand(db, { nightId, command: 'beat', arg: 'talk', now: now + 200_001 })
  for (const uid of uids) assert.equal(notices(db, uid).filter(c => c.key === 'talk').length, 1)
  // Next from talk is the vote
  await hostCommand(db, { nightId, command: 'next', now: now + 300_000 })
  assert.equal(night(db, nightId).act, 7)
  assert.equal(night(db, nightId).window.kind, 'ballot')
})

test('no Parlour Game opens over Talk it over, and none in Act 7: Start the vote is never refused by a game that popped up', async () => {
  const { db, nightId, uids } = await party()
  let now = 4_000_000
  await hostCommand(db, { nightId, command: 'act', arg: 2, now })
  await hostCommand(db, { nightId, command: 'next', now })
  // Act 6 opens on a Parlour Game at once; every game Act 2 had no time for came along, so more are due
  await hostCommand(db, { nightId, command: 'act', arg: 6, now })
  const first = night(db, nightId).window
  assert.equal(first.kind, 'questions')
  const sched = () => db.store.get(parlourPath(nightId))
  assert.ok(sched().count >= 3, 'games still to come')
  now = ms(first.closesAt) + GRACE_MS
  await hostCommand(db, { nightId, command: 'tick', now }) // the first is settled; the next is not due yet
  assert.equal(night(db, nightId).window.settled, true)
  await hostCommand(db, { nightId, command: 'beat', arg: 'talk', now })
  // well past every due time: the tick opens nothing while people talk
  now = ms(sched()[`due${sched().count - 1}`]) + 10 * 60_000
  const fired = JSON.stringify(sched().fired)
  assert.deepEqual(await tickParlour(db, nightId, now), { opened: false, reason: 'talk' })
  const r = await hostCommand(db, { nightId, command: 'tick', now })
  assert.equal(r.parlour.opened, false)
  assert.equal(night(db, nightId).window.id, first.id, 'still the game from the start of the act')
  assert.equal(JSON.stringify(sched().fired), fired, 'and no slot was spent')
  for (const uid of uids) assert.equal(Object.keys(session(db, uid).windows).length, 1)
  // so Start the vote goes straight through
  await hostCommand(db, { nightId, command: 'next', now })
  assert.equal(night(db, nightId).window.kind, 'ballot')
  // and in Act 7 the clock opens none either: the vote, the reveal, the credits
  assert.equal((await tickParlour(db, nightId, now + 1)).opened, false)
  await assert.rejects(() => hostCommand(db, { nightId, command: 'light-up', now }), /Acts 2, 4 and 6/)
})

test('the vote closes the moment the last seat locks in, and not one before', async () => {
  const p = await atTheVote()
  const { db, nightId, uids } = p
  assert.equal(p.w.of, 4, 'four seats were dealt the vote')
  assert.equal(p.w.title, 'The vote')
  assert.equal(p.w.host, undefined, 'no host line: three rows and Lock in')
  for (const uid of uids) assert.deepEqual(session(db, uid).windows[p.w.id], { kind: 'ballot' })
  // three lock in: still open, a count on the night doc, and the host's Next and Pick for the rest still refuse
  for (const [i, uid] of uids.slice(0, 3).entries()) {
    assert.deepEqual(await vote(p, uid), { ok: true }, 'the reply says ok and nothing more')
    assert.equal(night(db, nightId).window.answered, i + 1)
    assert.equal(night(db, nightId).window.settled, false)
  }
  await assert.rejects(() => hostCommand(db, { nightId, command: 'next', now: p.now }), /still choosing/)
  await assert.rejects(() => hostCommand(db, { nightId, command: 'settle', now: p.now }), /still choosing/)
  assert.equal(session(db, uids[3]).ballot, undefined, 'nobody is picked for while the vote is open')
  // the fourth locks in: closed in the same write, long before the two minutes
  assert.deepEqual(await vote(p, uids[3]), { ok: true }, 'the last voter\'s reply is the same as anyone\'s')
  const w = night(db, nightId).window
  assert.equal(w.settled, true)
  assert.equal(w.allIn, true)
  assert.equal(w.answered, 4)
  assert.ok(p.now < ms(w.closesAt), 'the clock had not run out')
  for (const uid of uids) assert.equal(session(db, uid).ballot.defaulted, false, 'everyone chose: nobody was picked for')
  // the count is all the night doc says: never who, never what
  assert.deepEqual(Object.keys(w).sort(), ['act', 'allIn', 'answered', 'beat', 'closesAt', 'id', 'kind', 'of', 'opensAt', 'settled', 'title'])
  // the host's Next is free at once
  const r = await hostCommand(db, { nightId, command: 'next', now: p.now })
  assert.equal(r.beat, 'reveal')
})

test('Lock in is final: a second ballot from the same phone changes nothing and is not counted twice', async () => {
  const p = await atTheVote()
  const { db, nightId, uids } = p
  await vote(p, uids[0], { motive: 3 })
  const first = session(db, uids[0]).ballot
  assert.deepEqual(await vote(p, uids[0], { motive: 9 }), { ok: true, already: true })
  assert.deepEqual(session(db, uids[0]).ballot, first, 'the first ballot stands')
  assert.equal(night(db, nightId).window.answered, 1)
  // two taps in the same instant count once too
  await Promise.all([vote(p, uids[1]), vote(p, uids[1])])
  assert.equal(night(db, nightId).window.answered, 2)
  // the others in the same instant: every one counted, and the last of them closes it, once
  const replies = await Promise.all([vote(p, uids[2]), vote(p, uids[3])])
  assert.deepEqual(replies, [{ ok: true }, { ok: true }])
  assert.equal(night(db, nightId).window.answered, 4)
  assert.equal(night(db, nightId).window.settled, true)
  // after the close a phone that locked in is still told ok, and one that never did is told the vote is over
  assert.deepEqual(await vote(p, uids[0]), { ok: true, already: true })
})

test('a seat that joined after the vote opened is not waited for, and still gets its random pick when the vote closes', async () => {
  const p = await atTheVote()
  const { db, nightId, uids } = p
  await join(db, { uid: 'uid-late', nightId, name: 'Late Guest' })
  assert.equal(session(db, 'uid-late').windows?.[p.w.id], undefined, 'the late phone was not dealt the vote')
  assert.equal(night(db, nightId).window.of, 4, 'the count stays at the seats that were dealt it')
  for (const uid of uids.slice(0, 3)) await vote(p, uid)
  assert.equal(night(db, nightId).window.settled, false)
  await vote(p, uids[3])
  assert.equal(night(db, nightId).window.settled, true, 'the four close it')
  const late = session(db, 'uid-late').ballot
  assert.equal(late.defaulted, true, 'the late seat is picked for, like any silent phone')
  assert.ok(p.keys.concat('late_guest').includes(late.murderer) && Number.isInteger(late.motive))
  // a late seat that taps anyway (its phone has no card, but a call could come): its ballot stands and it is not counted
  const q = await atTheVote()
  await join(q.db, { uid: 'uid-late', nightId: q.nightId, name: 'Late Guest' })
  assert.deepEqual(await vote(q, 'uid-late'), { ok: true })
  assert.equal(night(q.db, q.nightId).window.answered ?? 0, 0)
  for (const uid of q.uids) await vote(q, uid)
  assert.equal(night(q.db, q.nightId).window.settled, true)
  assert.equal(session(q.db, 'uid-late').ballot.defaulted, false, 'Lock in always wins over a pick made for you')
})

test('you may name yourself: the rules tell the Murderer to, and a Ghost may know who died', async () => {
  const p = await atTheVote()
  const { db, uids } = p
  const me = session(db, uids[0]).guestKey
  assert.deepEqual(await vote(p, uids[0], { murderer: me, victim: p.keys.find(k => k !== me) }), { ok: true })
  assert.equal(session(db, uids[0]).ballot.murderer, me)
  const her = session(db, uids[1]).guestKey
  assert.deepEqual(await vote(p, uids[1], { murderer: p.keys.find(k => k !== her), victim: her }), { ok: true })
  assert.equal(session(db, uids[1]).ballot.victim, her)
  // a name that is not at the party, or a motive that is not on the list, is still refused, and counts for nothing
  await assert.rejects(() => vote(p, uids[2], { murderer: 'nobody' }), /at the party/)
  await assert.rejects(() => vote(p, uids[2], { motive: 99 }), /motive from the list/)
  assert.equal(night(db, p.nightId).window.answered, 2)
})

test('the two minutes are the backstop: a silent phone gets a random pick when they are up, and a late tap is refused', async () => {
  const p = await atTheVote()
  const { db, nightId, uids } = p
  await vote(p, uids[0])
  await vote(p, uids[1])
  const chosen = uids.slice(0, 2).map(uid => JSON.stringify(session(db, uid).ballot))
  const closes = ms(p.w.closesAt)
  // not a moment early
  let r = await tick(db, nightId, closes + GRACE_MS - 1)
  assert.equal(r.windowSettled, false)
  assert.equal(night(db, nightId).window.settled, false)
  // inside the grace a tap still counts
  assert.deepEqual(await vote(p, uids[2], { now: closes + GRACE_MS - 1 }), { ok: true })
  // past it the server picks for the one who never did, and the three who chose keep theirs
  r = await tick(db, nightId, closes + GRACE_MS)
  assert.equal(r.windowSettled, true)
  assert.equal(r.settled, 1)
  assert.equal(night(db, nightId).window.settled, true)
  assert.equal(night(db, nightId).window.allIn, undefined, 'it closed on its clock')
  assert.equal(session(db, uids[3]).ballot.defaulted, true)
  assert.deepEqual(uids.slice(0, 2).map(uid => JSON.stringify(session(db, uid).ballot)), chosen)
  await assert.rejects(() => vote(p, uids[3], { now: closes + GRACE_MS + 1 }), /The vote is not open/)
  assert.equal(session(db, uids[3]).ballot.defaulted, true, 'the pick made for it stands')
  // a vote nobody settled yet, well past its time: the tap is refused
  const q = await atTheVote()
  await assert.rejects(() => vote(q, q.uids[0], { now: ms(q.w.closesAt) + GRACE_MS + 1 }), /two minutes are up/)
  // a paused night settles nothing, by the tick or by hand
  const z = await atTheVote()
  await hostCommand(z.db, { nightId: z.nightId, command: 'pause', now: z.now + 1000 })
  assert.equal((await tick(z.db, z.nightId, ms(z.w.closesAt) + 60_000)).skipped, 'paused')
  assert.equal(night(z.db, z.nightId).window.settled, false)
})
