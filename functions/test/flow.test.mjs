import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { FakeFirestore } from './fake-firestore.mjs'
import { createNight, join, NightError } from '../lib/night.js'
import { hostCommand, player, advanceRelay } from '../lib/run.js'
import { NIGHT, beatsOf, beatSpec, ms, lightsPath } from '../lib/deal.js'
import { parlourPath } from '../lib/windows.js'
import { parlourBeat, holdReason, drawingStarted, allFired, unplayed, BULLETIN_HOLD_MS } from '../lib/flow.js'
import * as relay from '../lib/relay.js'

// The flow of the night (A5, handoff 11 Nov 2026): nothing out of order.
// Jon: "The parlour games were all out of order. I was getting them after the
// final trace reveal." A throwaway night on stand-ins, walked on a clock the
// test owns: the tick every twenty seconds (the Host tab's own rate), the fake
// phones doing what a room would. At every beat it checks:
//   1. a Parlour Game opens only in its own beats (seed/night.json parlour.beats)
//   2. Act 6 plays at most its own two, none carried in
//   3. once the drawing has started no Parlour Game opens again, to The End
//   4. the host's own button is refused wherever the clock would wait
//   5. Act 6's games beat goes on to the drawing by itself
//   7. every phone has one plain line of what to do or where to go
// Nothing here is a real case and nothing a phone was dealt is printed.

const TICK = 20_000
const MIN = 60_000
const PARLOUR_BEATS = Object.entries(NIGHT.acts).flatMap(([act, spec]) => spec.beats.filter(b => parlourBeat(act, b.key)).map(b => `${act}/${b.key}`))
// The beats' own lines for a quiet phone (play/src/lib/beatline.js shows them on Now when nothing else is up)
const BEAT_LINES = JSON.parse(readFileSync(new URL('../../seed/beat-lines.json', import.meta.url), 'utf8')).lines

// What this phone shows that tells its guest what to do or where to go, or null (check 7).
// Read from the server's state only: the same documents the phone draws from.
const CARD_KINDS = new Set(['notice', 'group', 'station', 'result', 'role'])
export function direction({ night, session, relayState = null }) {
  if (!night || !session) return null
  if (night.phase === 'blackout') return 'dark'          // every phone near-black for five seconds
  if (night.phase === 'prompt') return 'role card'       // Sorry for the interruption, then the role card
  const w = night.window
  if (w && !w.settled && session.windows?.[w.id]) return `window:${w.kind}`
  if (relayState && relay.RUNNING.includes(relayState)) return 'drawing' // the phone is the drawing's surface
  const action = beatSpec(night.act, night.beat)?.action
  if (Number(night.act) === 7 && ['reveal', 'results', 'end'].includes(action)) return 'act 7 lock'
  if (Number(night.act) === 2 && session.lights?.step) return 'lights step'
  if (Number(night.act) === 4 && session.act4?.room) return 'act 4 step'
  const card = (session.cards ?? []).find(c => c.act === night.act && c.beat === night.beat && CARD_KINDS.has(c.kind) && String(c.text ?? c.title ?? '').trim())
  if (card) return `card:${card.kind}`
  if (String(BEAT_LINES[`${night.act}/${night.beat}`] ?? '').trim()) return 'beat line'
  return null
}

async function party(n = 8) {
  const db = new FakeFirestore()
  db.store.set('meta/game', { host_jonathan: 'Jon', host_susan: 'Susan' })
  const { nightId } = await createNight(db)
  const names = ['Jon', 'Susan', 'Mabel', 'Gus', 'Dot', 'Walt', 'Pearl', 'Otis', 'Ida'].slice(0, n)
  const uids = []
  for (const name of names) { const uid = `u-${name.toLowerCase()}`; await join(db, { uid, nightId, name }); uids.push(uid) }
  return { db, nightId, uids }
}

// One night under the test's own clock.
function driver({ db, nightId, uids }) {
  const t = { now: Date.parse('2026-11-15T21:00:00Z') }
  const night = () => db.store.get(`nights/${nightId}`)
  const session = uid => db.store.get(`sessions/${uid}`)
  const where = () => `${night().act}/${night().beat}`
  const seen = new Map()   // Parlour Game id: the beat it first appeared in
  const log = []           // every beat the night stood on, in order
  const untold = []        // check 7: a beat where a phone had no line
  let drawingAt = null     // how many games had appeared when the drawing started
  const games = () => Object.keys(db.store.get(`nights/${nightId}/private/windows`) ?? {}).filter(id => id.startsWith('questions-'))
  const look = () => {
    const at = where()
    const n = night()
    const relayState = db.store.get(relay.relayPaths(nightId).pub)?.state ?? null
    if (log.at(-1) !== at) {
      log.push(at)
      // check 7, on the way into every beat (and the prompt's own moment), every phone
      for (const uid of uids) if (!direction({ night: n, session: session(uid), relayState })) untold.push(`${at} (${n.phase})`)
    }
    for (const id of games()) if (!seen.has(id)) seen.set(id, { at, phase: n.phase })
    if (drawingAt === null && relayState && relayState !== 'idle') drawingAt = seen.size
  }
  const host = async (command, arg) => { const r = await hostCommand(db, { nightId, command, arg, now: t.now, sleep: () => {} }); look(); return r }
  const tick = () => host('tick')
  // every phone that wants to answers what is open (every phone at once) or waiting (Act 4)
  const answerAll = async (count = uids.length) => {
    const w = night().window
    for (const uid of uids.slice(0, count)) {
      const s = session(uid)
      if (w && !w.settled && w.kind === 'questions' && s.windows?.[w.id] && !s.answers?.[w.id]) await player.answer(db, { nightId, uid, windowId: w.id, picks: s.windows[w.id].beats.map(b => b.choices[0].k), now: t.now })
      for (const [id, x] of Object.entries(s.windows ?? {})) if (x.waiting && !s.answers?.[id]) await player.answer(db, { nightId, uid, windowId: id, picks: x.beats.map(b => b.choices[0].k), now: t.now })
    }
    look()
  }
  // stay on this beat for `forMs`, the clock ticking; stops early if the night moves on by itself
  const stay = async (forMs, { answers = uids.length, each = null } = {}) => {
    const from = where()
    const until = t.now + forMs
    while (t.now < until && where() === from) {
      t.now += Math.min(TICK, until - t.now)
      await tick()
      if (where() !== from) break
      if (answers) await answerAll(answers)
      if (each) await each()
    }
    return where() !== from
  }
  // Next, waiting out an open window first (the Host tab greys the button while the phones choose)
  const next = async () => {
    const w = night().window
    if (w && !w.settled && t.now < ms(w.closesAt)) t.now = ms(w.closesAt) + 1
    return host('next')
  }
  // the cat visits at a walking pace: a called guest scans in, reads for a minute, taps Done
  const withSince = new Map()
  const visitCats = async () => {
    const deck = db.store.get(`nights/${nightId}/private/deck`).uids
    const state = db.store.get(lightsPath(nightId))
    for (const [key, g] of Object.entries(state?.guests ?? {})) {
      if (where() !== '2/cat') return
      if (g.step === 'go') { await player.meetCat(db, { nightId, uid: deck[key], cat: g.cat, now: t.now }); withSince.set(key, t.now) }
      else if (g.step === 'with' && t.now - (withSince.get(key) ?? 0) >= MIN) await player.leaveCat(db, { nightId, uid: deck[key], now: t.now })
    }
    look()
  }
  // the drawing on its own clock, the minute's tick running through it
  const draw = async () => {
    const pub = () => db.store.get(relay.relayPaths(nightId).pub)
    let lastTick = t.now
    for (let guard = 0; guard < 2000 && pub().state !== 'done'; guard++) {
      const p = pub()
      if (p.state === 'vote') {
        const standing = [0, 1, 2, 3].filter(i => !(p.crossed ?? []).includes(i))
        await player.relayGuess(db, { nightId, pick: standing[guard % standing.length], now: t.now })
      } else {
        t.now = Math.max(t.now, ms(p.introEndsAt) || 0, ms(p.walkEndsAt) || 0, ms(p.turnEndsAt) || 0, ms(p.lockoutEndsAt) || 0) + 1
        await advanceRelay(db, { nightId, now: t.now })
      }
      if (t.now - lastTick >= MIN) { lastTick = t.now; await tick() }
      look()
    }
    assert.equal(pub().state, 'done', 'the drawing finished')
  }
  return { t, night, session, where, seen, log, untold, host, tick, stay, next, answerAll, visitCats, draw, drawingAt: () => drawingAt }
}

// The host's own button is refused wherever a due game would wait (check 4).
async function refusesLightUp(d, label) {
  await assert.rejects(() => d.host('light-up'), e => e instanceof NightError, `${label}: Parlour Game now is refused at ${d.where()}`)
}

async function walkNight({ phones = 8, hold, cats = true, skipToSupper = false, skipSupperBeats = false, answers = phones, nextInGames = false }) {
  const p = await party(phones)
  const d = driver(p)
  const { db, nightId, uids } = p
  const stayOn = async (extra = {}) => d.stay(hold(d.night().act, d.night().beat), { answers, ...extra })
  const checkBeat = async () => { if (!PARLOUR_BEATS.includes(d.where()) || d.night().phase !== 'act') await refusesLightUp(d, 'check 4') }

  // ---- Act 1
  await d.host('next') // Arrivals
  for (const b of beatsOf(1).slice(1)) { await checkBeat(); await stayOn(); await d.next(); assert.equal(d.night().beat, b.key) }
  await checkBeat(); await stayOn()
  await d.host('blackout')
  assert.equal(d.where(), '2/orient'); assert.equal(d.night().phase, 'prompt')
  await refusesLightUp(d, 'the role cards')
  // ---- Act 2
  await stayOn(); await d.next() // news
  await checkBeat(); await stayOn()
  if (skipToSupper) await d.host('supper') // 11 Nov: straight to supper, the cats never visited
  else {
    await d.next(); await checkBeat(); await stayOn() // peek
    await d.next() // the cat visits
    assert.equal(d.where(), '2/cat')
    const moved = await d.stay(hold(2, 'cat'), { answers, each: cats ? d.visitCats : null })
    if (!moved) await d.host('supper')
  }
  assert.equal(d.where(), '2/supper')
  await checkBeat(); await stayOn()
  // ---- Act 3
  await d.next(); await checkBeat(); await stayOn() // phones down
  if (skipSupperBeats) await d.host('start-act4') // 11 Nov: Start Act 4 eight seconds in
  else {
    await d.next(); await checkBeat(); await stayOn() // the bulletin armed; it plays itself on the tick
    await d.next(); await checkBeat(); await stayOn() // the dinner wrap-up
    await d.host('start-act4')
  }
  // ---- Act 4: the warning and the groups on the clock (or Next), then the rounds
  assert.equal(d.where(), '4/warn')
  await checkBeat()
  if (!(await stayOn())) await d.next()
  assert.equal(d.where(), '4/groups')
  await checkBeat()
  for (const uid of uids) await player.lockIn(db, { nightId, uid, now: d.t.now })
  await d.tick()
  assert.equal(d.where(), '4/round1', 'everyone locked in: the first round at once')
  for (let guard = 0; guard < 8 && d.night().act === 4; guard++) {
    const at = d.where()
    const moved = await stayOn()
    if (d.night().act !== 4) break
    const done = db.store.get(`nights/${nightId}/public/act4`)?.phase === 'done'
    if (!moved || done) await d.next() // Next sooner than the chime, or after the last round
    assert.notEqual(d.where(), at)
  }
  // ---- Act 5
  assert.equal(d.where(), '5/roam')
  await checkBeat(); await stayOn(); await d.next()
  await checkBeat(); await stayOn(); await d.next()
  await checkBeat(); await stayOn()
  // ---- Act 6: the games, then the drawing by itself (or Next sooner)
  await d.next()
  assert.equal(d.where(), '6/games')
  const sched = db.store.get(parlourPath(nightId))
  assert.equal(sched.act, 6)
  assert.ok(sched.count <= NIGHT.parlour.counts['6'], `check 2: Act 6 plays at most its own ${NIGHT.parlour.counts['6']} (it laid out ${sched.count})`)
  assert.ok((sched.slots ?? []).every(s => s.act === 6), 'check 2: nothing carried into Act 6')
  assert.equal(d.night().window?.kind, 'questions', 'the first game at once')
  const before6 = d.seen.size
  if (nextInGames) {
    await d.stay(hold(6, 'games'), { answers })
    if (d.where() === '6/games') await d.next()
  } else {
    const moved = await d.stay(10 * MIN, { answers })
    assert.ok(moved, 'check 5: the games beat goes on to the drawing by itself when the last game has closed')
  }
  assert.equal(d.where(), '6/drawing')
  assert.ok(d.seen.size - before6 <= NIGHT.parlour.counts['6'], 'check 2: no more than its own two opened in Act 6')
  assert.equal(db.store.get(parlourPath(nightId)).closed, true, 'check 3: what was left is dropped')
  await refusesLightUp(d, 'the drawing')
  const atDrawing = d.seen.size
  await d.draw()
  await d.stay(90_000, { answers: 0 }) // the door stands open on the TV before the host presses Next
  assert.equal(d.where(), '6/drawing')
  await refusesLightUp(d, 'the drawing done')
  await d.next()
  assert.equal(d.where(), '6/door')
  await checkBeat(); await stayOn({ answers: 0 })
  await d.next() // Talk it over
  assert.equal(d.where(), `6/${beatsOf(6).at(-1).key}`)
  await checkBeat()
  await d.stay(Math.max(hold(6, d.night().beat), 3 * MIN), { answers: 0 })
  // ---- Act 7
  await d.next()
  assert.equal(d.where(), '7/ballot')
  await checkBeat()
  const keys = Object.keys(d.night().roster)
  for (const uid of uids) await player.ballot(db, { nightId, uid, murderer: keys[0], motive: 1, victim: keys[1], now: d.t.now })
  await stayOn({ answers: 0 })
  await d.next() // the reveal
  await checkBeat()
  for (let i = 0; i < 3; i++) await d.host('reveal-stage')
  await stayOn({ answers: 0 })
  await d.next() // your result
  await checkBeat(); await stayOn({ answers: 0 })
  await d.next() // The End
  assert.equal(d.where(), '7/end'); assert.equal(d.night().over, true)
  await d.stay(5 * MIN, { answers: 0 })
  await checkBeat()

  // check 1: every Parlour Game first appeared in one of its own beats, with the night in play
  for (const [id, first] of d.seen) {
    assert.ok(PARLOUR_BEATS.includes(first.at), `check 1: ${id} opened at ${first.at}`)
    assert.equal(first.phase, 'act', `check 1: ${id} opened while the night was ${first.phase}`)
  }
  // check 3: none after the drawing started
  assert.equal(d.seen.size, atDrawing, 'check 3: no Parlour Game after the drawing started')
  assert.equal(d.drawingAt(), atDrawing)
  assert.ok(d.seen.size <= 12, 'never more than the night\'s twelve')
  // check 7: every beat left every phone with a line
  assert.deepEqual([...new Set(d.untold)], [], 'check 7: every phone has one plain line at every beat')
  return { d, games: d.seen.size, log: d.log }
}

test('A5 the rule itself: the games\' own beats, and every moment that holds a game back', () => {
  assert.deepEqual(PARLOUR_BEATS, ['2/cat', '4/round1', '4/round2', '4/round3', '4/round4', '4/round5', '6/games'], 'the Parlour Games\' own beats')
  const play = { phase: 'act', act: 2, beat: 'cat' }
  const now = 10_000_000
  assert.equal(holdReason({ night: play, now }), null)
  assert.equal(holdReason({ night: { ...play, beat: 'news' }, now }), 'beat')
  assert.equal(holdReason({ night: { ...play, phase: 'prompt' }, now }), 'phase')
  assert.equal(holdReason({ night: { ...play, phase: 'paused' }, now }), 'phase')
  assert.equal(holdReason({ night: { ...play, over: true }, now }), 'over')
  assert.equal(holdReason({ night: { phase: 'act', act: 7, beat: 'ballot' }, now }), 'beat')
  assert.equal(holdReason({ night: { phase: 'act', act: 6, beat: 'games' }, relay: { state: 'done' }, now }), 'drawing')
  assert.equal(holdReason({ night: { phase: 'act', act: 6, beat: 'games' }, relay: { state: 'idle' }, now }), null)
  // bulletin 2 can play itself in the first minutes of Act 4: the round's games wait while it plays
  const round = { phase: 'act', act: 4, beat: 'round1' }
  assert.equal(holdReason({ night: round, screen: { kind: 'bulletin', at: new Date(now - 1000) }, now }), 'bulletin')
  assert.equal(holdReason({ night: round, screen: { kind: 'bulletin', at: new Date(now - BULLETIN_HOLD_MS - 1) }, now }), null)
  for (const [kind, why] of [['irwin', 'irwin'], ['door', 'door'], ['trace', 'door'], ['talk', 'talk'], ['vote', 'vote']]) assert.equal(holdReason({ night: round, screen: { kind, at: new Date(now) }, now }), why)
  assert.equal(holdReason({ night: round, screen: { kind: 'prompts', at: new Date(now) }, now }), null)
  assert.ok(drawingStarted({ state: 'intro' }) && drawingStarted({ state: 'done' }) && !drawingStarted({ state: 'idle' }) && !drawingStarted(null))
  assert.equal(allFired({ count: 2, fired: { 0: true, 1: true } }), true)
  assert.equal(allFired({ count: 2, fired: { 0: true } }), false)
  assert.equal(allFired({ count: 0 }), false, 'a schedule with no games never moves the beat')
  assert.equal(unplayed({ count: 5, fired: { 0: true, 3: true } }), 3)
})

test('A5 check 7: every beat in the seed is reached with a line for every phone, and the beat lines are one plain line each', () => {
  const beats = Object.entries(NIGHT.acts).flatMap(([act, spec]) => spec.beats.map(b => `${act}/${b.key}`))
  for (const [at, line] of Object.entries(BEAT_LINES)) {
    assert.ok(beats.includes(at), `${at} is a beat of the night`)
    assert.ok(typeof line === 'string' && line.trim().length > 0, `${at} has words`)
    assert.ok(line.split(/\s+/).length <= 12, `${at}: one short line`)
    assert.ok(line.split(/[.!?]+(?:\s|$)/).filter(Boolean).length <= 1, `${at}: one sentence`)
    assert.ok(!/wait(ing)? for (the )?(other|everyone|players)/i.test(line), 'never a waiting-for-players line')
  }
})

test('A5 a night at full length: Parlour Games only in their own beats, Act 6 its own two, the drawing by itself, none after', async () => {
  const FULL = { 1: { arrive: 5, rules: 16, meet: 2, introduce: 5, ready: 1 }, 2: { orient: 1.5, news: 2, peek: 1, cat: 30, supper: 1 }, 3: { down: 20, bulletin: 6, wrap: 2 }, 4: { warn: 3, groups: 3 }, 5: { roam: 5, irwin: 3, update: 2 }, 6: { door: 2, talk: 3 }, 7: { ballot: 2.2, reveal: 2, result: 1 } }
  const hold = (act, beat) => (FULL[act]?.[beat] ?? (act === 4 ? 16 : 1)) * MIN
  const { games, log } = await walkNight({ hold, answers: 5 })
  assert.ok(games >= 4, `a full night plays its games (${games})`)
  assert.deepEqual(log.filter(x => x.startsWith('6/')), ['6/games', '6/drawing', '6/door', '6/talk'])
})

test('A5 a night squeezed to twenty seconds a beat: the same rules hold, and the host\'s Next in the games beat drops what is left', async () => {
  const hold = () => 20_000
  const a = await walkNight({ hold, cats: false, answers: 8 })
  const b = await walkNight({ hold, cats: false, answers: 8, nextInGames: true })
  assert.ok(a.games <= 12 && b.games <= 12)
})

test('A5 the practice of 11 Nov (three phones, Act 2 in two minutes with no cat visits, Start Act 4 eight seconds into supper, the games beat left after a minute): no Parlour Game after the drawing starts', async () => {
  const SHAPE = { 1: { arrive: 5, rules: 23 }, 2: { orient: 1.2, news: 0.4, supper: 0.1 }, 3: { down: 0.13 }, 4: { warn: 0.15, groups: 0.2, round1: 3.4, round2: 11.7, round3: 16, round4: 8.3 }, 5: { roam: 2.8, irwin: 0.5, update: 0.1 }, 6: { games: 1.03, door: 0.12, talk: 3 }, 7: { ballot: 3, reveal: 2, result: 1 } }
  const hold = (act, beat) => (SHAPE[act]?.[beat] ?? 0.3) * MIN
  await walkNight({ phones: 3, hold, cats: false, skipToSupper: true, skipSupperBeats: true, answers: 3, nextInGames: true })
})
