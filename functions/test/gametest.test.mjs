import { test } from 'node:test'
import assert from 'node:assert/strict'
import { FakeFirestore } from './fake-firestore.mjs'
import { createNight, join } from '../lib/night.js'
import { SALEM_LEAD_MS, SALEM_CLEAN_MS, SALEM_ROUNDS, salemFlips, booShow, BOO_INTRO_MS, BOO_HOLD_MS, BOO_JUDGE_MS, BOO_POSES, BOO_JUDGING } from '../lib/act4.js'
import {
  gameTestRequest, SALEM_DOC, BOO_DOC, PLAYERS_MAX, NAME_MAX, PLAYER_KEEP_MS, BOO_LEAD_MS, TEST_NIGHT_LABEL,
  ADMIN_COMMANDS, PLAYER_COMMANDS, PARTY_BOX_MESSAGE, PARTY_NIGHT_MESSAGE, REHEARSAL_MESSAGE, REPLACE_MESSAGE, ACT4_MESSAGE,
} from '../lib/gametest.js'

// The Game test (lib/gametest.js): the practices of Get Off My Lawn! and
// Boo's Catwalk on their own public docs, and a test night that is always a
// rehearsal. Nothing here is sealed: a practice deals nothing and pays
// nobody, and a test night's case is a throwaway, gone with the db.

const T0 = Date.parse('2026-11-01T18:00:00Z')

function house() {
  const db = new FakeFirestore()
  db.store.set('meta/game', { host_jonathan: 'Jon', host_susan: 'Susan' })
  return db
}

// The same made-up "random" on every call to it: two copies agree, so the
// test can lay out what the practice should have laid out.
function fixedPick() {
  let i = 0
  return n => (i++ * 7 + 3) % n
}

// Every doc path read, and every doc path written, from here on.
function watch(db) {
  const reads = []
  const writes = []
  const get = db._get.bind(db)
  const set = db._set.bind(db)
  const update = db._update.bind(db)
  db._get = path => { reads.push(path); return get(path) }
  db._set = (path, ...rest) => { writes.push(path); return set(path, ...rest) }
  db._update = (path, ...rest) => { writes.push(path); return update(path, ...rest) }
  return { reads, writes }
}

const admin = (data) => ({ ...data, uid: 'uid-admin', isAdmin: true })
const phone = (uid, data) => ({ ...data, uid })
const salem = db => db.store.get(SALEM_DOC)
const boo = db => db.store.get(BOO_DOC)
const ms = t => (t instanceof Date ? t.getTime() : t)
// An answer is ok flags and a runId, never anything else.
const flagsOnly = r => Object.entries(r).every(([k, v]) => (k === 'runId' ? typeof v === 'string' || v === null : typeof v === 'boolean'))

test('an unknown command is refused; the admin commands are the admin\'s only; a phone must be signed in', async () => {
  const db = house()
  for (const command of ['salem', 'Salem-open', 'boo-done', 'night-create', 'next', '', null, undefined, 7]) {
    await assert.rejects(gameTestRequest(db, admin({ command })), e => e.code === 'invalid' && e.message === 'The game test does not know that command.', `refused ${JSON.stringify(command)}`)
  }
  for (const command of ADMIN_COMMANDS) {
    await assert.rejects(gameTestRequest(db, phone('uid-a', { command, act: 4, beat: 'groups' })), e => e.code === 'permission-denied' && e.message === 'Only the workshop can do that.', command)
  }
  for (const command of PLAYER_COMMANDS) {
    await assert.rejects(gameTestRequest(db, { command, name: 'Jon' }), e => e.code === 'unauthenticated', command)
  }
  assert.deepEqual([...db.store.keys()], ['meta/game'], 'nothing was written')
})

test('salem-open: round 1, waiting for Ready, a new runId each time', async () => {
  const db = house()
  const r = await gameTestRequest(db, admin({ command: 'salem-open', now: T0 }))
  assert.equal(typeof r.runId, 'string')
  assert.ok(r.runId.length >= 8)
  assert.ok(flagsOnly(r))
  const d = salem(db)
  assert.deepEqual(Object.keys(d).sort(), ['attempt', 'cleanAt', 'flips', 'lastSlip', 'players', 'round', 'runId', 'slips', 'startsAt', 'state', 'updatedAt'])
  assert.deepEqual({ ...d, updatedAt: null }, { runId: r.runId, state: 'idle', round: 1, attempt: 0, startsAt: null, cleanAt: null, flips: [], slips: 0, lastSlip: null, players: {}, updatedAt: null })
  assert.ok(d.updatedAt instanceof Date, 'the server stamps it')
  const again = await gameTestRequest(db, admin({ command: 'salem-open', now: T0 + 1000 }))
  assert.notEqual(again.runId, r.runId)
  assert.equal(salem(db).runId, again.runId)
})

test('salem-join: a first name, cut to thirty; the same phone again changes its name; twelve phones at most', async () => {
  const db = house()
  for (const name of ['', '   ', null, undefined, 7, ['Jon'], { name: 'Jon' }]) {
    await assert.rejects(gameTestRequest(db, phone('uid-a', { command: 'salem-join', name })), e => e.code === 'invalid' && e.message === 'Type your first name.', `refused ${JSON.stringify(name)}`)
  }
  assert.equal(salem(db), undefined, 'nothing was written')
  // a phone that opens the page before the practice is opened starts it, waiting at round 1
  const r = await gameTestRequest(db, phone('uid-a', { command: 'salem-join', name: '  Jessa   Marie  ', now: T0 }))
  assert.deepEqual(Object.keys(r).sort(), ['ok', 'runId'])
  assert.equal(salem(db).runId, r.runId)
  assert.equal(salem(db).state, 'idle')
  assert.equal(salem(db).round, 1)
  assert.deepEqual(salem(db).players['uid-a'], { name: 'Jessa Marie', at: new Date(T0) })
  await gameTestRequest(db, phone('uid-a', { command: 'salem-join', name: 'x'.repeat(80), now: T0 + 5 }))
  assert.equal(salem(db).players['uid-a'].name, 'x'.repeat(NAME_MAX))
  assert.equal(Object.keys(salem(db).players).length, 1, 'the same phone, once')
  for (let i = 2; i <= PLAYERS_MAX; i++) await gameTestRequest(db, phone(`uid-${i}`, { command: 'salem-join', name: `Guest ${i}`, now: T0 + i }))
  assert.equal(Object.keys(salem(db).players).length, PLAYERS_MAX)
  await assert.rejects(gameTestRequest(db, phone('uid-13', { command: 'salem-join', name: 'One too many', now: T0 + 20 })), e => e.code === 'full')
  assert.equal(salem(db).players['uid-13'], undefined)
  // one already in may still change its name when the practice is full
  await gameTestRequest(db, phone('uid-2', { command: 'salem-join', name: 'Susan', now: T0 + 30 }))
  assert.equal(salem(db).players['uid-2'].name, 'Susan')
  assert.equal(salem(db).runId, r.runId, 'joining never resets the practice')
})

test('salem-ready, slip and passed: the real game\'s timing and flips, three rounds, then passed; nothing is paid', async () => {
  const db = house()
  await gameTestRequest(db, admin({ command: 'salem-open', now: T0 }))
  await gameTestRequest(db, phone('uid-a', { command: 'salem-join', name: 'Jon', now: T0 }))
  await gameTestRequest(db, phone('uid-b', { command: 'salem-join', name: 'Susan', now: T0 }))
  let now = T0 + 10_000

  for (let round = 1; round <= SALEM_ROUNDS; round++) {
    const pick = fixedPick()
    const r = await gameTestRequest(db, phone('uid-a', { command: 'salem-ready', now, pick }))
    assert.deepEqual(r, { ok: true })
    let d = salem(db)
    const startsAt = now + SALEM_LEAD_MS
    assert.equal(d.state, 'playing')
    assert.equal(d.round, round)
    assert.equal(d.attempt, 2 * round - 1, 'one attempt a Ready, one a slip')
    assert.equal(ms(d.startsAt), startsAt)
    assert.equal(ms(d.cleanAt), startsAt + SALEM_CLEAN_MS)
    assert.deepEqual(d.flips, salemFlips(round, startsAt, fixedPick()), 'exactly the flips the real game lays out')
    assert.ok(d.flips.every(f => f.at instanceof Date && (f.colour === 'red' || f.colour === 'green')))
    assert.equal(d.slips, 0)
    assert.equal(d.lastSlip, null)
    // a second Ready while playing changes nothing
    assert.deepEqual(await gameTestRequest(db, phone('uid-b', { command: 'salem-ready', now: now + 1 })), { ok: true, already: true })
    assert.equal(ms(salem(db).startsAt), startsAt)

    // a slip on green: the round starts again for everyone
    now = startsAt + 2000
    const attempt = d.attempt
    const slipped = await gameTestRequest(db, phone('uid-b', { command: 'salem-slip', attempt, colour: 'green', now, pick: fixedPick() }))
    assert.deepEqual(slipped, { ok: true, restarted: true })
    d = salem(db)
    assert.equal(d.attempt, attempt + 1)
    assert.equal(d.slips, 1)
    assert.equal(d.lastSlip, 'green')
    assert.equal(d.round, round, 'a slip keeps the round')
    assert.equal(ms(d.startsAt), now + SALEM_LEAD_MS)
    assert.deepEqual(d.flips, salemFlips(round, now + SALEM_LEAD_MS, fixedPick()))
    // the other phone's slip of the same moment is a stale attempt
    assert.deepEqual(await gameTestRequest(db, phone('uid-a', { command: 'salem-slip', attempt, colour: 'red', now })), { ok: true, already: true })
    assert.equal(salem(db).slips, 1)

    // not yet clean: refused, so the phone asks again; a stale attempt changes nothing
    await assert.rejects(gameTestRequest(db, phone('uid-a', { command: 'salem-passed', attempt: d.attempt, now: ms(d.cleanAt) - 1 })), e => e.code === 'invalid' && e.message === 'Not yet. Keep going.')
    assert.deepEqual(await gameTestRequest(db, phone('uid-a', { command: 'salem-passed', attempt, now: ms(d.cleanAt) + 1 })), { ok: true, already: true })
    assert.equal(salem(db).state, 'playing')
    now = ms(d.cleanAt)
    const passed = await gameTestRequest(db, phone('uid-a', { command: 'salem-passed', attempt: String(d.attempt), now }))
    assert.deepEqual(passed, { ok: true, cleared: round === SALEM_ROUNDS })
    d = salem(db)
    assert.deepEqual(d.flips, [])
    if (round < SALEM_ROUNDS) {
      assert.equal(d.state, 'idle', 'the next round waits for Ready')
      assert.equal(d.round, round + 1)
    } else {
      assert.equal(d.state, 'passed')
      assert.equal(d.round, SALEM_ROUNDS)
    }
    // a second phone saying so too changes nothing
    assert.deepEqual(await gameTestRequest(db, phone('uid-b', { command: 'salem-passed', attempt: d.attempt, now: now + 5 })), { ok: true, already: true })
    now += 5000
  }
  assert.deepEqual(await gameTestRequest(db, phone('uid-a', { command: 'salem-ready', now })), { ok: true, already: true }, 'passed: open it again to play again')
  assert.equal(salem(db).state, 'passed')
  assert.ok([...db.store.keys()].every(p => p === 'meta/game' || p === SALEM_DOC), 'no night, no case, no ledger, no pay')
})

test('salem-slip: only the current attempt, only once it has started; the colour is kept only if it is one', async () => {
  const db = house()
  await gameTestRequest(db, phone('uid-a', { command: 'salem-join', name: 'Jon', now: T0 }))
  assert.deepEqual(await gameTestRequest(db, phone('uid-a', { command: 'salem-slip', attempt: 0, colour: 'red', now: T0 })), { ok: true, already: true }, 'nothing is playing')
  await gameTestRequest(db, phone('uid-a', { command: 'salem-ready', now: T0 }))
  const { attempt, startsAt } = salem(db)
  assert.deepEqual(await gameTestRequest(db, phone('uid-a', { command: 'salem-slip', attempt, colour: 'red', now: ms(startsAt) - 1 })), { ok: true, already: true }, 'before the round starts')
  assert.deepEqual(await gameTestRequest(db, phone('uid-a', { command: 'salem-slip', attempt: attempt + 1, colour: 'red', now: ms(startsAt) + 1 })), { ok: true, already: true }, 'an attempt from the future')
  assert.equal(salem(db).slips, 0)
  await gameTestRequest(db, phone('uid-a', { command: 'salem-slip', attempt, colour: 'blue', now: ms(startsAt) + 1 }))
  assert.equal(salem(db).lastSlip, null)
  assert.equal(salem(db).slips, 1)
  const next = salem(db)
  await gameTestRequest(db, phone('uid-a', { command: 'salem-slip', attempt: String(next.attempt), colour: 'red', now: ms(next.startsAt) + 1 }))
  assert.equal(salem(db).lastSlip, 'red')
  assert.equal(salem(db).slips, 2)
})

test('ready, slip and passed need a phone that joined and an open practice; Stop ends it; opening again keeps the phones of the last hours', async () => {
  const db = house()
  for (const command of ['salem-ready', 'salem-slip', 'salem-passed']) {
    await assert.rejects(gameTestRequest(db, phone('uid-a', { command, attempt: 1, now: T0 })), e => e.code === 'closed', `${command}: no practice yet`)
  }
  await gameTestRequest(db, admin({ command: 'salem-open', now: T0 }))
  for (const command of ['salem-ready', 'salem-slip', 'salem-passed']) {
    await assert.rejects(gameTestRequest(db, phone('uid-stranger', { command, attempt: 1, now: T0 })), e => e.code === 'no-guest' && e.message === 'Type your first name to join the practice first.', `${command}: not joined`)
  }
  assert.equal(salem(db).state, 'idle')
  await gameTestRequest(db, phone('uid-old', { command: 'salem-join', name: 'Last week', now: T0 }))
  const later = T0 + PLAYER_KEEP_MS + 60_000
  await gameTestRequest(db, phone('uid-a', { command: 'salem-join', name: 'Jon', now: later }))
  assert.deepEqual(Object.keys(salem(db).players).sort(), ['uid-a', 'uid-old'], 'joining never drops a phone: one still on the page keeps its place')
  await gameTestRequest(db, phone('uid-a', { command: 'salem-ready', now: later }))
  const attempt = salem(db).attempt
  assert.equal(attempt, 1)

  const stop = await gameTestRequest(db, admin({ command: 'salem-stop' }))
  assert.ok(flagsOnly(stop))
  assert.equal(stop.runId, salem(db).runId)
  assert.equal(salem(db).state, 'done')
  assert.deepEqual(salem(db).flips, [])
  await assert.rejects(gameTestRequest(db, phone('uid-a', { command: 'salem-ready', now: later + 1 })), e => e.code === 'closed' && /stopped/.test(e.message))
  assert.deepEqual(await gameTestRequest(db, phone('uid-a', { command: 'salem-slip', attempt, colour: 'red', now: later + 5000 })), { ok: true, already: true })

  const runId = salem(db).runId
  await gameTestRequest(db, admin({ command: 'salem-open', now: later + 10_000 }))
  const d = salem(db)
  assert.notEqual(d.runId, runId)
  assert.equal(d.state, 'idle')
  assert.equal(d.round, 1)
  assert.deepEqual(Object.keys(d.players), ['uid-a'], 'the phone of the last hours stays joined; the old one drops off')
  assert.equal(d.attempt, attempt, 'the attempt never goes back to 0: a phone left on the page counts by it')
  await gameTestRequest(db, phone('uid-a', { command: 'salem-ready', now: later + 20_000 }))
  assert.equal(salem(db).attempt, attempt + 1)
})

test('salem-join: a phone of hours ago keeps its place and its runId, but only the last hours count toward twelve', async () => {
  const db = house()
  const { runId } = await gameTestRequest(db, admin({ command: 'salem-open', now: T0 }))
  await gameTestRequest(db, phone('uid-early', { command: 'salem-join', name: 'Early', now: T0 }))
  const later = T0 + PLAYER_KEEP_MS + 60_000
  for (let i = 1; i <= PLAYERS_MAX; i++) await gameTestRequest(db, phone(`uid-${i}`, { command: 'salem-join', name: `Guest ${i}`, now: later + i }))
  const d = salem(db)
  assert.equal(Object.keys(d.players).length, PLAYERS_MAX + 1, 'the early phone is still there: twelve recent ones were let in beside it')
  assert.equal(d.runId, runId, 'the early phone sees the same practice, so it never has to join again')
  // the early phone can still play: it is joined
  assert.deepEqual(await gameTestRequest(db, phone('uid-early', { command: 'salem-ready', now: later + 100 })), { ok: true })
  await assert.rejects(gameTestRequest(db, phone('uid-13', { command: 'salem-join', name: 'One too many', now: later + 200 })), e => e.code === 'full')
  // opening again drops the old phone, with a new runId every phone sees
  const again = await gameTestRequest(db, admin({ command: 'salem-open', now: later + 300 }))
  assert.notEqual(again.runId, runId)
  assert.equal(salem(db).players['uid-early'], undefined)
  assert.equal(Object.keys(salem(db).players).length, PLAYERS_MAX)
})

test('clock: any signed-in phone gets the server\'s time, and nothing is read or written', async () => {
  const db = house()
  const seen = watch(db)
  assert.deepEqual(await gameTestRequest(db, phone('uid-a', { command: 'clock', now: T0 })), { ok: true, now: T0 })
  const r = await gameTestRequest(db, phone('uid-a', { command: 'clock' }))
  assert.ok(Math.abs(r.now - Date.now()) < 5000)
  await assert.rejects(gameTestRequest(db, { command: 'clock' }), e => e.code === 'unauthenticated')
  assert.deepEqual(seen, { reads: [], writes: [] })
})

test('salem-stop with no practice yet leaves a stopped one', async () => {
  const db = house()
  const r = await gameTestRequest(db, admin({ command: 'salem-stop' }))
  assert.equal(salem(db).state, 'done')
  assert.equal(salem(db).runId, r.runId)
  assert.deepEqual(salem(db).players, {})
})

test('boo-start: three poses on the real show\'s timing from three seconds on, with Boo\'s verdicts; boo-stop ends it', async () => {
  const db = house()
  const r = await gameTestRequest(db, admin({ command: 'boo-start', now: T0, pick: fixedPick() }))
  assert.deepEqual(Object.keys(r).sort(), ['ok', 'runId'])
  const d = boo(db)
  const startsAt = T0 + BOO_LEAD_MS
  assert.deepEqual(Object.keys(d).sort(), ['endsAt', 'poses', 'runId', 'startsAt', 'state', 'updatedAt'])
  assert.equal(d.runId, r.runId)
  assert.equal(d.state, 'playing')
  assert.equal(ms(d.startsAt), startsAt)
  assert.ok(d.updatedAt instanceof Date)
  assert.equal(d.poses.length, BOO_POSES)
  const real = booShow(startsAt, fixedPick(), {})
  d.poses.forEach((p, i) => {
    const want = real.poses[i]
    assert.deepEqual(Object.keys(p).sort(), ['holdUntil', 'judgeUntil', 'judgedAt', 'line', 'poseAt', 'stopAt', 'strutAt'])
    assert.ok([p.stopAt, p.holdUntil, p.judgedAt].every(t => t instanceof Date))
    assert.equal(ms(p.stopAt), ms(want.poseAt), 'the music stops when the real show strikes the pose')
    assert.equal(ms(p.holdUntil), ms(want.holdUntil))
    assert.equal(ms(p.judgedAt), ms(want.judgeUntil))
    assert.equal(ms(p.holdUntil) - ms(p.stopAt), BOO_HOLD_MS)
    assert.equal(ms(p.judgedAt) - ms(p.holdUntil), BOO_JUDGE_MS)
    assert.deepEqual([p.strutAt, p.poseAt, p.judgeUntil, p.line], [want.strutAt, want.poseAt, want.judgeUntil, want.line], 'the real show\'s own fields too')
    assert.ok(BOO_JUDGING.includes(p.line))
    if (i > 0) assert.equal(ms(p.strutAt), ms(d.poses[i - 1].judgedAt), 'the next strut starts when the verdict ends')
  })
  assert.equal(ms(d.poses[0].strutAt) - startsAt, BOO_INTRO_MS, 'Boo\'s intro first, as on the night')
  assert.equal(ms(d.endsAt), ms(d.poses.at(-1).judgedAt))
  assert.equal(new Set(d.poses.map(p => p.line)).size, BOO_POSES, 'three different verdicts')

  // Jon's own verdicts from the workshop, when he has written them
  db.store.set('safe_content/ui_copy', { items: [1, 2, 3, 4, 5, 6].map(i => ({ id: `b${i}`, order: i, text: `BOO JUDGE ${i}: Jon's verdict ${i}.` })) })
  const again = await gameTestRequest(db, admin({ command: 'boo-start', now: T0 + 60_000 }))
  assert.notEqual(again.runId, r.runId)
  assert.ok(boo(db).poses.every(p => /^Jon's verdict \d\.$/.test(p.line)))
  assert.equal(ms(boo(db).startsAt), T0 + 60_000 + BOO_LEAD_MS, 'a new press starts a new show')

  const stop = await gameTestRequest(db, admin({ command: 'boo-stop' }))
  assert.equal(stop.runId, again.runId)
  assert.equal(boo(db).state, 'done')
  const fresh = house()
  const r2 = await gameTestRequest(fresh, admin({ command: 'boo-stop' }))
  assert.deepEqual({ ...boo(fresh), updatedAt: null }, { runId: r2.runId, state: 'done', startsAt: null, poses: [], endsAt: null, updatedAt: null })
})

test('the seal: the practices read and write only their own docs (and Boo\'s verdicts), never a night, a case or sealed/*', async () => {
  const db = house()
  db.store.set('public_state/active', { nightId: 'n1' })
  db.store.set('nights/n1', { act: 4, forceRehearsal: false })
  db.store.set('nights/n1/public/salem', { groupId: 'g1', state: 'intro' })
  db.store.set('nights/n1/public/boo', { groupId: 'g1', state: 'idle' })
  const before = new Map([...db.store].map(([k, v]) => [k, structuredClone(v)]))
  const seen = watch(db)
  const answers = [
    await gameTestRequest(db, admin({ command: 'salem-open', now: T0 })),
    await gameTestRequest(db, phone('uid-a', { command: 'salem-join', name: 'Jon', now: T0 })),
    await gameTestRequest(db, phone('uid-a', { command: 'salem-ready', now: T0 })),
  ]
  const s = salem(db)
  answers.push(await gameTestRequest(db, phone('uid-a', { command: 'salem-slip', attempt: s.attempt, colour: 'red', now: ms(s.startsAt) + 1 })))
  const s2 = salem(db)
  answers.push(await gameTestRequest(db, phone('uid-a', { command: 'salem-passed', attempt: s2.attempt, now: ms(s2.cleanAt) })))
  answers.push(await gameTestRequest(db, admin({ command: 'salem-stop' })))
  answers.push(await gameTestRequest(db, admin({ command: 'boo-start', now: T0 })))
  answers.push(await gameTestRequest(db, admin({ command: 'boo-stop' })))
  assert.ok(seen.reads.length > 0)
  assert.ok(seen.reads.every(p => p === SALEM_DOC || p === BOO_DOC || p === 'safe_content/ui_copy'), `read only the practice docs (${seen.reads.length} reads)`)
  assert.deepEqual([...new Set(seen.writes)].sort(), [BOO_DOC, SALEM_DOC])
  for (const [k, v] of before) assert.deepEqual(db.store.get(k), v, `${k} untouched`)
  for (const a of answers) assert.ok(flagsOnly(a), JSON.stringify(Object.keys(a)))
})

// ---- the test night

const liveNight = db => db.store.get(`nights/${db.store.get('public_state/active').nightId}`)

test('night-start: always a rehearsal named Game test, marked as the tab\'s own, and it becomes the live night', async () => {
  const db = house()
  const r = await gameTestRequest(db, admin({ command: 'night-start' }))
  assert.deepEqual(r, { ok: true })
  const n = liveNight(db)
  assert.equal(n.label, TEST_NIGHT_LABEL)
  assert.equal(n.forceRehearsal, true)
  assert.equal(n.dryRun, false)
  assert.equal(n.gameTest, true)
  assert.equal(n.act, 0)
  // a test night already live is fine: a new test night takes its place
  const first = db.store.get('public_state/active').nightId
  await gameTestRequest(db, admin({ command: 'night-start' }))
  assert.notEqual(db.store.get('public_state/active').nightId, first)
  assert.equal(liveNight(db).forceRehearsal, true)
  assert.equal(liveNight(db).gameTest, true)
  // a night started any other way never carries the mark, even with the same name
  const other = await createNight(db, { label: TEST_NIGHT_LABEL, forceRehearsal: true })
  assert.equal(db.store.get(`nights/${other.nightId}`).gameTest, undefined)
  const party = await createNight(db, { label: 'x', forceRehearsal: false, gameTest: true })
  assert.equal(db.store.get(`nights/${party.nightId}`).gameTest, undefined, 'never on a party night')
})

test('a rehearsal started from a phone is never moved by the Game test, and is ended only after the page asks', async () => {
  const db = house()
  // the weekend practice game: a rehearsal with guests, started from a phone
  const { nightId } = await createNight(db, { label: 'Night of Sat Oct 24 2026', forceRehearsal: true })
  await join(db, { uid: 'uid-jon', nightId, name: 'Jon' })
  await join(db, { uid: 'uid-jessa', nightId, name: 'Jessa' })
  const before = new Map([...db.store].map(([k, v]) => [k, structuredClone(v)]))
  for (const command of ['night-act', 'night-beat', 'night-parlour']) {
    await assert.rejects(gameTestRequest(db, admin({ command, act: 6, beat: 'arrive', now: T0 })),
      e => e.code === 'permission-denied' && e.message === REHEARSAL_MESSAGE, `${command} refused`)
  }
  await assert.rejects(gameTestRequest(db, admin({ command: 'night-start' })), e => e.code === 'running' && e.message === REPLACE_MESSAGE)
  await assert.rejects(gameTestRequest(db, admin({ command: 'night-start', replace: 'yes' })), e => e.code === 'running', 'only replace: true')
  assert.deepEqual(new Map(db.store), before, 'nothing changed')
  // the page asked Jon, and he said yes
  assert.deepEqual(await gameTestRequest(db, admin({ command: 'night-start', replace: true })), { ok: true })
  assert.notEqual(db.store.get('public_state/active').nightId, nightId)
  assert.equal(liveNight(db).gameTest, true)
  assert.deepEqual(db.store.get(`nights/${nightId}`), before.get(`nights/${nightId}`), 'the old rehearsal itself is untouched')
})

test('Act 4 needs two phones: with one, Go to Act 4 is refused before anything moves', async () => {
  const db = house()
  await gameTestRequest(db, admin({ command: 'night-start' }))
  const nightId = db.store.get('public_state/active').nightId
  for (const guests of [[], ['Jon']]) {
    for (const name of guests) await join(db, { uid: `uid-${name}`, nightId, name })
    const before = new Map([...db.store].map(([k, v]) => [k, structuredClone(v)]))
    await assert.rejects(gameTestRequest(db, admin({ command: 'night-act', act: 4, now: T0 })), e => e.code === 'invalid' && e.message === ACT4_MESSAGE, `${guests.length} phones`)
    assert.deepEqual(new Map(db.store), before, `${guests.length} phones: nothing changed`)
  }
  // Act 6 and the rest work with one phone
  assert.deepEqual(await gameTestRequest(db, admin({ command: 'night-act', act: 6, now: T0 })), { ok: true })
  assert.equal(liveNight(db).act, 6)
  // a second phone, and Act 4 goes
  await join(db, { uid: 'uid-Jessa', nightId, name: 'Jessa' })
  assert.deepEqual(await gameTestRequest(db, admin({ command: 'night-act', act: 4, now: T0 + 10 * 60_000 })), { ok: true })
  assert.equal(liveNight(db).act, 4)
})

test('every night-* command is refused while the party box is ticked, or the live night is the party night or a dry run', async () => {
  const cases = [
    { why: 'the party box', game: { party_night: true }, night: null, message: PARTY_BOX_MESSAGE },
    { why: 'the party box, with a rehearsal live', game: { party_night: true }, night: { forceRehearsal: true, dryRun: false }, message: PARTY_BOX_MESSAGE },
    { why: 'the party night', game: { party_night: false }, night: { forceRehearsal: false, dryRun: false }, message: PARTY_NIGHT_MESSAGE },
    { why: 'a dry run on the real secrets', game: {}, night: { forceRehearsal: false, dryRun: true }, message: PARTY_NIGHT_MESSAGE },
    { why: 'a dry run on stand-ins', game: {}, night: { forceRehearsal: true, dryRun: true }, message: PARTY_NIGHT_MESSAGE },
  ]
  for (const c of cases) {
    const db = house()
    db.store.set('meta/game', { ...db.store.get('meta/game'), ...c.game })
    if (c.night) {
      db.store.set('public_state/active', { nightId: 'live' })
      db.store.set('nights/live', { nightId: 'live', act: 4, beat: 'round2', phase: 'act', ...c.night })
    }
    const before = new Map([...db.store].map(([k, v]) => [k, structuredClone(v)]))
    for (const command of ['night-start', 'night-act', 'night-beat', 'night-parlour']) {
      await assert.rejects(
        gameTestRequest(db, admin({ command, act: 6, beat: 'round3', replace: true })),
        e => e.code === 'permission-denied' && e.message === c.message,
        `${command} refused: ${c.why}`,
      )
    }
    assert.deepEqual(new Map(db.store), before, `${c.why}: nothing changed`)
  }
})

test('night-act, night-beat and night-parlour move the live test night with the Host tab\'s own commands', async () => {
  const db = house()
  for (const command of ['night-act', 'night-beat', 'night-parlour']) {
    await assert.rejects(gameTestRequest(db, admin({ command, act: 2, beat: 'news' })), e => e.code === 'no-night' && /Start a test night/.test(e.message), `${command}: no night yet`)
  }
  await gameTestRequest(db, admin({ command: 'night-start' }))
  const nightId = db.store.get('public_state/active').nightId
  await join(db, { uid: 'uid-jon', nightId, name: 'Jon' })
  await join(db, { uid: 'uid-jessa', nightId, name: 'Jessa' })

  assert.deepEqual(await gameTestRequest(db, admin({ command: 'night-act', act: 2, now: T0 })), { ok: true })
  assert.equal(liveNight(db).act, 2)
  assert.equal(liveNight(db).rehearsal, true, 'a throwaway case, dealt blind')
  assert.deepEqual(await gameTestRequest(db, admin({ command: 'night-beat', beat: 'news', now: T0 + 1000 })), { ok: true })
  assert.equal(liveNight(db).beat, 'news')
  assert.deepEqual(await gameTestRequest(db, admin({ command: 'night-parlour', now: T0 + 2000 })), { ok: true })
  assert.equal(liveNight(db).window.kind, 'questions', 'every phone lights up with a Parlour Game')

  // the host commands' own refusals come through as they are
  await assert.rejects(gameTestRequest(db, admin({ command: 'night-act', act: 9 })), e => e.code === 'invalid')
  await assert.rejects(gameTestRequest(db, admin({ command: 'night-beat', beat: 'no-such-beat' })), e => e.code === 'invalid')
  await assert.rejects(gameTestRequest(db, admin({ command: 'night-act', act: 6, now: T0 + 3000 })), e => e.code === 'window-open', 'the phones are still choosing')
  assert.deepEqual(await gameTestRequest(db, admin({ command: 'night-act', act: 6, now: T0 + 10 * 60_000 })), { ok: true })
  assert.equal(liveNight(db).act, 6)
  assert.equal(liveNight(db).forceRehearsal, true, 'still a rehearsal')

  // the party box ticked mid-test: the next button is refused
  db.store.set('meta/game', { ...db.store.get('meta/game'), party_night: true })
  await assert.rejects(gameTestRequest(db, admin({ command: 'night-act', act: 4 })), e => e.message === PARTY_BOX_MESSAGE)
  assert.equal(liveNight(db).act, 6)
})

test('a live night pointer to a night that is gone counts as no night', async () => {
  const db = house()
  db.store.set('public_state/active', { nightId: 'gone' })
  await assert.rejects(gameTestRequest(db, admin({ command: 'night-parlour' })), e => e.code === 'no-night')
  assert.deepEqual(await gameTestRequest(db, admin({ command: 'night-start' })), { ok: true })
  assert.notEqual(db.store.get('public_state/active').nightId, 'gone')
  assert.ok(await createNight(db, { label: 'unused', forceRehearsal: true }), 'createNight itself is unchanged')
})
