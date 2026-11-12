// A whole practice night with fill-in players, start to finish (the polish
// pass, job A4, 11 Nov 2026): the proof of its Done-when, "Jon and Susan play
// a whole practice night with eight seats and never wait on a fill-in".
//
// Two fake phones (the real players) and the fill-ins' own clock walk a night
// made by the big Start button: the phones do what Jon and Susan would, the
// clock is stepped two seconds at a time with one pass of the fill-ins'
// moves at each step (what npm run fill-ins does on the brain), and the host
// presses Next only where the host really would. At every gate that used to
// wait on everyone it checks that the night moved on the real players' own
// last tap. Used by functions/test/fillins.test.mjs.
//
// It is written to outlive the rest of the polish pass: it presses Next beat
// by beat without naming the beats of Acts 5 to 7, answers whatever window
// is open by its kind, and plays the drawing by its state, so a beat or a
// window another job adds or removes does not break it.
//
// SEAL RULE: the night is a throwaway rehearsal. Nothing a seat was dealt is
// returned, printed or kept: the summary is counts, keys and short codes.

import * as night from '../lib/night.js'
import * as run from '../lib/run.js'
import * as deal from '../lib/deal.js'
import * as act4 from '../lib/act4.js'
import * as relay from '../lib/relay.js'
import { studyPath, rotationPath } from '../lib/station.js'
import { stepFillIns, PAUSES } from '../lib/fillins.js'
import { isFillIn, fillInKeys, realKeys } from '../lib/seats.js'

export const PRACTICE_START = Date.parse('2026-11-12T23:00:00Z') // the practice evening: before the party day
const STEP_MS = 2_000 // the driver's own pace
const AFTER_PAUSES = Math.max(PAUSES.answer[1], PAUSES.vote[1], PAUSES.lock[1]) + 2 * STEP_MS

export async function fillInNight({ db, fillIns = 6, real = ['Jon', 'Sue'], start = PRACTICE_START, log = () => {} } = {}) {
  let now = start
  const summary = { nightId: null, seats: 0, fillIns: 0, checks: [], moves: { locked: 0, answered: 0, voted: 0 }, passes: 0, groups: 0, rounds: 0, earlyChimes: 0, ballots: 0, results: 0, drawers: 0, over: false, error: null, ok: false }
  const fail = code => { if (!summary.checks.includes(code)) summary.checks.push(code) }
  const want = (ok, code) => { if (!ok) fail(code) }

  const started = await run.hostCommand(db, { command: 'create', arg: { real: false, introAt: now + 5 * 60_000, fillIns }, now })
  const nightId = started.nightId
  summary.nightId = nightId
  const uids = {}
  for (const name of real) { const uid = `real-${night.nameKey(name)}`; await night.join(db, { uid, nightId, name }); uids[night.nameKey(name)] = uid }
  const realUids = Object.values(uids)

  const nightDoc = async () => (await db.doc(`nights/${nightId}`).get()).data()
  const sessionOf = async uid => (await db.doc(`sessions/${uid}`).get()).data() ?? {}
  const deckUids = async () => (await db.doc(`nights/${nightId}/private/deck`).get()).data()?.uids ?? {}
  const host = (command, arg) => run.hostCommand(db, { nightId, command, arg, now })
  const next = () => host('next')
  // one pass of the fill-ins' moves, as the driver makes every two seconds
  const pass = async () => {
    const r = await stepFillIns(db, nightId, { now })
    summary.passes++
    for (const k of ['locked', 'answered', 'voted']) summary.moves[k] += r[k] ?? 0
    return r
  }
  const wait = async ms => { let last = null; for (let t = 0; t < ms; t += STEP_MS) { now += STEP_MS; last = await pass() } return last }
  const fillUids = async () => { const n = await nightDoc(); const d = await deckUids(); return fillInKeys(n.roster).map(k => d[k]) }

  // The open window, if any, by its kind: the real phones answer it, the fill-ins answer on their own clock,
  // and whatever is left is closed on the window's own clock. Returns the kind handled, or null.
  async function handleWindow() {
    const n = await nightDoc()
    const w = n.window
    if (!w || w.settled) return null
    const fills = await fillUids()
    if (w.kind === 'questions') {
      for (const uid of realUids) {
        const set = (await sessionOf(uid)).windows?.[w.id]
        if (set) await run.player.answer(db, { nightId, uid, windowId: w.id, picks: set.beats.map(b => b.choices[0].k), now })
      }
      // the real players have answered at once: within twenty seconds every fill-in has too
      await wait(AFTER_PAUSES)
      for (const uid of fills) want((await sessionOf(uid)).answers?.[w.id]?.defaulted === false, 'FILL-ANSWER')
    } else if (w.kind === 'ballot') {
      await wait(AFTER_PAUSES) // the fill-ins vote within twenty seconds
      const keys = Object.keys(n.roster)
      for (const uid of fills) { const b = (await sessionOf(uid)).ballot; want(b && b.defaulted === false && keys.includes(b.murderer), 'FILL-VOTE') }
      for (const uid of realUids) {
        try { await run.player.ballot(db, { nightId, uid, murderer: keys[0], motive: night.MOTIVES[0].n, victim: keys[1], ghost: keys[1], now }) } catch (e) { if (!(e instanceof night.NightError)) throw e }
      }
    }
    // any other kind is left to its clock, and so is whatever this one still waits for
    const after = (await nightDoc()).window
    if (after && !after.settled) { now = Math.max(now, deal.ms(after.closesAt) + 6_000); await host('tick') }
    return w.kind
  }

  try {
    // ---- Act 1: the seats are there before anyone taps a name; the dark; the roles
    const n1 = await nightDoc()
    summary.fillIns = fillInKeys(n1.roster).length
    summary.seats = Object.keys(n1.roster).length
    want(summary.fillIns === Math.min(8, fillIns) && n1.fillIns === summary.fillIns, 'SEATS')
    want(realKeys(n1.roster).length === real.length, 'REAL')
    for (const b of deal.beatsOf(1).slice(1)) { await next(); await pass(); want((await nightDoc()).beat === b.key, 'ACT1') }
    await run.hostCommand(db, { nightId, command: 'blackout', now, sleep: () => {} })
    want((await pass()).why === 'held', 'HELD') // the role cards are up: no fill-in moves
    const c = (await db.doc(`cases/${nightId}`).get()).data()
    want(c?.rehearsal === true, 'REHEARSAL')
    const roles = Object.values(c?.roles ?? {})
    want(roles.length === summary.seats && roles.filter(r => r === 'murderer').length === 1 && roles.filter(r => r === 'ghost').length === 1, 'ROLES')
    for (const uid of Object.values(await deckUids())) want(((await sessionOf(uid)).cards ?? []).filter(x => x.kind === 'role').length === 1, 'ROLE-CARDS')

    // ---- Act 2: the news, the peek, a Parlour Game on every phone, the cats (real players only), supper on its own
    await next(); await next(); await next() // news, peek, the cat visits
    want((await nightDoc()).beat === 'cat', 'ACT2')
    await host('light-up')
    want(await handleWindow() === 'questions', 'ACT2-GAME')
    let meetings = 0
    for (let guard = 0; guard < 60; guard++) {
      const state = (await db.doc(deal.lightsPath(nightId)).get()).data()
      const roster = (await nightDoc()).roster
      want(!Object.keys(state.guests).some(k => isFillIn(roster[k])), 'LINE') // never a fill-in in the cat line
      const at = {}
      for (const g of Object.values(state.guests)) if (g.step === 'go' || g.step === 'with') at[g.cat] = (at[g.cat] ?? 0) + 1
      want(!Object.values(at).some(x => x > 1), 'F20')
      const due = Object.entries(state.guests).filter(([, g]) => g.step === 'go')
      if (!due.length) break
      for (const [key, g] of due) {
        want((await nightDoc()).beat === 'cat', 'SUPPER-EARLY')
        await run.player.meetCat(db, { nightId, uid: uids[key], cat: g.cat, now })
        now += STEP_MS; await pass()
        await run.player.leaveCat(db, { nightId, uid: uids[key], now })
        meetings++
      }
    }
    want(meetings === 4 * real.length, 'CATS')
    want((await nightDoc()).beat === 'supper', 'SUPPER') // on the last real Done: nobody waited on a fill-in

    // ---- Act 3: supper
    for (let i = 0; i < 3; i++) { await handleWindow(); await next() } // phones down, the bulletin armed, the wrap-up
    want((await nightDoc()).act === 3, 'ACT3')

    // ---- Act 4: the warning runs out on the clock, the fill-ins lock in after their pauses, the real players' last tap starts the rounds
    await handleWindow()
    await host('start-act4')
    await wait(act4.WARN_MS + STEP_MS)
    want((await nightDoc()).beat === 'groups', 'GROUPS') // the clock dealt the group cards
    await wait(AFTER_PAUSES)
    const pubLocked = Object.keys((await db.doc(act4.act4Path(nightId)).get()).data().locked ?? {})
    want(pubLocked.length === summary.fillIns, 'FILL-LOCK') // every fill-in tapped Locked in on its own
    want((await nightDoc()).beat === 'groups', 'ROUND-EARLY') // and the rounds still wait for the real players
    for (const uid of realUids) await run.player.lockIn(db, { nightId, uid, now })
    want((await nightDoc()).beat === 'round1', 'LOCKED') // at once: no fill-in was waited for
    const rot = (await db.doc(rotationPath(nightId)).get()).data()
    summary.groups = rot.groups.length
    const roster4 = (await nightDoc()).roster
    const mine = rot.groups.filter(g => g.members.some(m => !isFillIn(roster4[m.key])))
    want(rot.groups.length <= act4.FILL_NIGHT_GROUPS && rot.rounds === 4, 'FOUR')
    want(real.length > 3 || (mine.length === 1 && mine[0].members.length === real.length), 'TOGETHER')
    want(rot.groups.filter(g => g.fill).every(g => g.members.every(m => isFillIn(roster4[m.key]))), 'FILL-GROUPS')
    const realIds = new Set(mine.map(g => g.id))
    let games4 = 0
    for (let guard = 0; guard < 8; guard++) {
      const n = await nightDoc()
      const round = run.roundOf(n.beat)
      if (n.act !== 4 || !round || (await db.doc(act4.act4Path(nightId)).get()).data().phase !== 'rounds') break
      summary.rounds++
      // what each room's screen is set for: a real group, or nobody
      const docs = {
        study: (await db.doc(studyPath(nightId)).get()).data()?.groupId ?? null, library: (await db.doc(act4.memoryPath(nightId)).get()).data()?.groupId ?? null,
        orangerie: (await db.doc(act4.salemPath(nightId)).get()).data()?.groupId ?? null, entryway: (await db.doc(act4.booPath(nightId)).get()).data()?.groupId ?? null,
      }
      want(Object.values(docs).every(gid => gid === null || realIds.has(gid)), 'ROOM-SCREENS')
      // one Parlour Game waits on the phones this act: the real players play it, the fill-ins within twenty seconds
      if (!games4++) {
        const lit = await host('light-up')
        for (const uid of realUids) { const game = (await sessionOf(uid)).windows?.[lit.id]; if (game) await run.player.answer(db, { nightId, uid, windowId: lit.id, picks: game.beats.map(b => b.choices[1].k), now }) }
        await wait(AFTER_PAUSES)
        for (const uid of await fillUids()) want((await sessionOf(uid)).answers?.[lit.id]?.defaulted === false, 'FILL-WAITING')
      }
      // the real players' own room, played to its end
      for (const g of mine) {
        const room = act4.roomFor(rot, g.id, round)
        const uid = uids[g.members.find(m => uids[m.key])?.key]
        want(docs[room] === g.id, 'ROOM-MINE')
        if (room === 'study') await run.studyFinished(db, { nightId, payload: { groupId: g.id, outcome: 'solved', seconds: 200, pairs: 3 }, now })
        if (room === 'library') await clearBoards()
        if (room === 'orangerie') await playSalem(uid)
        if (room === 'entryway') await visitArcade(uid, g)
      }
      // about thirty seconds later the chime moves everyone on, with nobody pressing anything
      const doneAt = now
      await wait(act4.EARLY_CHIME_MS - 2 * STEP_MS)
      want((await nightDoc()).beat === n.beat, 'CHIME-EARLY')
      await wait(4 * STEP_MS)
      const after = await nightDoc()
      const moved = after.beat !== n.beat || (await db.doc(act4.act4Path(nightId)).get()).data().phase === 'done'
      want(moved && now - doneAt <= act4.EARLY_CHIME_MS + 6 * STEP_MS, 'CHIME')
      if (moved) summary.earlyChimes++
    }
    want(summary.rounds === 4 && (await db.doc(act4.act4Path(nightId)).get()).data().phase === 'done', 'ROUNDS')
    await next() // on to Act 5: every room any group was not paid for is paid now
    want((await nightDoc()).act === 5, 'ACT5')
    const paid = (await db.doc(act4.act4PrivatePath(nightId)).get()).data()?.paid ?? {}
    want(Object.keys(paid).length === rot.groups.length * act4.ROOM_KEYS.length, 'G52')

    // ---- Acts 5, 6 and 7, beat by beat: answer what opens, play the drawing when it starts, name the three, to The End
    for (let guard = 0; guard < 40; guard++) {
      const n = await nightDoc()
      if (n.over === true) break
      await handleWindow()
      // more Parlour Games may be due at this beat (Act 6 plays its own back to back): the tick opens the next
      for (let more = 0; more < 6 && (await nightDoc()).act === 6; more++) {
        now += 3 * 60_000
        await host('tick')
        if (!(await handleWindow())) break
      }
      const state = await relay.state(db, nightId)
      if (relay.RUNNING.includes(state)) await playDrawing()
      const finale = (await db.doc(`nights/${nightId}/public/finale`).get()).data()
      if (deal.beatSpec(n.act, n.beat)?.action === 'reveal' && finale && finale.stage !== 'victim') {
        for (let i = 0; i < 3; i++) await host('reveal-stage')
      }
      try { await next() } catch (e) {
        if (!(e instanceof night.NightError)) throw e
        // a window still open or the night's last beat: wait a moment, and stop at the end of the night
        if (/end of the night/.test(e.message)) break
        now += 30_000
      }
    }
    const end = await nightDoc()
    summary.over = end.over === true
    want(summary.over, 'END')
    const every = Object.values(await deckUids())
    for (const uid of every) {
      const s = await sessionOf(uid)
      if (s.ballot) summary.ballots++
      if ((s.cards ?? []).some(x => x.kind === 'result')) summary.results++
    }
    want(summary.ballots === summary.seats && summary.results === summary.seats, 'BALLOTS')
    for (const uid of await fillUids()) want((await sessionOf(uid)).ballot?.defaulted === false, 'FILL-VOTED') // each fill-in cast its own vote
    summary.ok = summary.checks.length === 0
  } catch (e) {
    summary.error = e instanceof night.NightError ? `${e.code}: ${e.message}` : `${e?.name ?? 'Error'}: ${e?.message ?? String(e)}`
    summary.ok = false
  }
  log(`Fill-in night: ${summary.seats} seats (${summary.fillIns} fill-ins), ${summary.groups} groups, ${summary.rounds} rounds, ${summary.earlyChimes} early chimes; the fill-ins locked in ${summary.moves.locked} times, answered ${summary.moves.answered} Parlour Games and cast ${summary.moves.voted} votes in ${summary.passes} passes; ${summary.ballots} ballots, ${summary.results} results; ${summary.ok ? 'PASS' : `FAIL ${summary.checks.join(' ')}${summary.error ? ` (${summary.error})` : ''}`}`)
  return summary

  // The Library: every card of each of the three boards, turned in pairs (the boards are public).
  async function clearBoards() {
    for (let step = 0; step < act4.MEMORY_ROUNDS.length; step++) {
      const board = (await db.doc(act4.memoryPath(nightId)).get()).data()
      if (!board?.boardId || board.cleared) return
      const cards = board.boards?.[String(board.step)] ?? []
      const open = new Map()
      const pairs = []
      cards.forEach((t, i) => { const o = open.get(t) ?? []; if (o.length) pairs.push([o.pop(), i]); else o.push(i); open.set(t, o) })
      await run.player.memoryStep(db, { nightId, boardId: board.boardId, step: board.step, pairs, now })
    }
  }
  // The Orangerie: the scan, then Salem's rounds, each passed at its clean mark.
  async function playSalem(uid) {
    await run.player.meetCat(db, { nightId, uid, cat: 'salem', now })
    for (let r = 0; r < act4.SALEM_ROUNDS; r++) {
      await run.player.salemReady(db, { nightId, uid, now })
      const doc = (await db.doc(act4.salemPath(nightId)).get()).data()
      if (doc?.state !== 'playing') return
      now = Math.max(now, deal.ms(doc.cleanAt))
      await run.player.salemPassed(db, { nightId, uid, attempt: doc.attempt, now })
    }
  }
  // The Entryway: the scan, then each player's clue moment, as the arcade's Mac asks for them.
  async function visitArcade(uid, g) {
    await run.player.meetCat(db, { nightId, uid, cat: 'boo', now })
    for (const [place] of g.members.entries()) { now += STEP_MS; await run.player.arcadeClue(db, { nightId, groupId: g.id, place, now }) }
  }
  // The drawing, by its state: a guess while the room is guessing, the clock otherwise. Only real players draw.
  async function playDrawing() {
    const { pub, priv } = relay.relayPaths(nightId)
    const order = (await db.doc(priv).get()).data()?.order ?? []
    const roster = (await nightDoc()).roster
    summary.drawers = new Set(order).size
    want(order.length > 0 && order.every(k => !isFillIn(roster[k])), 'DRAWERS')
    for (let guard = 0; guard < 600; guard++) {
      const p = (await db.doc(pub).get()).data()
      if (!p || p.state === 'done' || !relay.RUNNING.includes(p.state)) return
      want(!p.drawerKey || !isFillIn(roster[p.drawerKey]), 'DRAWER')
      if (p.state === 'vote') {
        const standing = [0, 1, 2, 3].filter(i => !(p.crossed ?? []).includes(i))
        now += 1_000
        await run.player.relayGuess(db, { nightId, pick: standing[0], now })
        continue
      }
      now += 10 * 60_000 // past any deadline the drawing sets
      await run.advanceRelay(db, { nightId, now })
    }
    fail('DRAWING')
  }
}
