#!/usr/bin/env node
// Eight fake phones walk a whole night, then throw it away.
//
// The phones hold nothing: each one is a signed-in id with a session the
// dealer fills, exactly as a real phone's would be. The script drives the
// host's Next through every beat of every act (seed/night.json), and at each
// beat does what the room would do: dismisses notices, goes to its cat when
// the phone sends it (one guest at a cat at a time), answers every Parlour
// Game, finishes the study for each group, clears the memory match, guesses
// in the drawing, strikes one thing out, casts a ballot. The first two phones
// are the hosts (the names on the Game night form), so they play the two
// Professors, and bots play them like every other seat (F02). It checks the
// Act 2 rooms (F20, F21) and that the motive funnel leaves the real motive
// standing (G32, counts only), that the host seats were dealt and answered
// like everyone else (F02), and, over 2,000 cases dealt by the case deal
// itself on stand-in rosters, that every seat, both host seats included,
// lands the Murderer and the Ghost about equally often (G05). At the end it
// checks the seal (no phone can read a role,
// no public document carries the case), prints one line per act, a tally and
// how much of the party's secrets the night used, and discards the night: the
// case, the night, every session. Nothing it prints is ever a card. Counts,
// keys and act names only.
//
//   npm run fake-night                       in-process, against an in-memory stand-in Firestore
//   npm run fake-night -- --emulator         against the local emulators (npm run emulate first)
//   npm run fake-night -- --seed tulip-4471  a rehearsal dealt from that seed word (functions/lib/seed.js):
//                                            the same deal as any night from that word; the fake
//                                            phones' own taps still differ. Every rehearsal prints its word
//   npm run fake-night -- --real-secrets     a party night (a dry run): it reads the party's sealed
//                                            leans, packing and drawing pictures where the script
//                                            is pointed, as the real night does
//   --live --i-know-this-is-the-party-database
//                                            the party project (GOOGLE_APPLICATION_CREDENTIALS);
//                                            refuses while a night is live; discards its own
//
// Exit 0 is PASS. Anything else is FAIL, and the night is discarded either way.
//
// SEAL RULE: this file never prints, logs or keeps a card. With
// --real-secrets the cats' leans, the bags clue and the drawing's pictures on
// the fake night are sealed content; they are discarded with the night and
// never leave the process. What it prints about them is counts.

import { existsSync, mkdirSync, copyFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { randomInt } from 'node:crypto'
import { seededRng } from './pack-bags.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const root = join(here, '..')

// The night logic reads functions/seed/*.json (copied by `npm --prefix
// functions run seed`). Copy it here too, so the script runs on its own.
export function ensureSeed() {
  const dest = join(root, 'functions', 'seed')
  mkdirSync(dest, { recursive: true })
  for (const f of ['characters.json', 'motives.json', 'night.json', 'families.json', 'woof-news.json', 'cat-lines.json', 'bag-lines.json', 'game-names.json']) {
    const from = join(root, 'seed', f)
    if (existsSync(from)) copyFileSync(from, join(dest, f))
  }
}
ensureSeed()

const night = await import('../functions/lib/night.js')
const run = await import('../functions/lib/run.js')
const deal = await import('../functions/lib/deal.js')
const station = await import('../functions/lib/station.js')
const relay = await import('../functions/lib/relay.js')
const windows = await import('../functions/lib/windows.js')
const families = await import('../functions/lib/families.js')
const news = await import('../functions/lib/news.js')
const screen = await import('../functions/lib/screen.js')
const act4 = await import('../functions/lib/act4.js')
const checks = await import('../functions/lib/checks.js')

export const PHONES = 8
// How many cases the seat-fairness check (G05) deals, and its fixed seed (the party's date).
export const SEAT_DEALS = 2000
const SEAT_SEED = 15112026
const choice = list => list[randomInt(list.length)]

// What a failure is called on the way out. NightError messages are fixed
// safe copy; anything else is a runtime error, never a card.
function describeError(e) {
  if (e instanceof night.NightError) return `${e.code}: ${e.message}`
  return `${e?.name ?? 'Error'}: ${e?.message ?? String(e)}`
}

const CASE_WARNINGS = {
  'trace-partner': 'one trace at the party has no look-alike among the guests',
}

// Words a phone-readable document must never carry. Checked as JSON keys
// (with the quotes) so "motives", the public list, does not trip "motive".
const NEVER_PUBLIC = ['"roles"', '"dialSign"', '"dialMap"', '"dial"', '"dialLog"', '"parlourPlan"', '"leans"', '"listeners"', '"solving"', '"hints"', '"newsOut"', '"family"']
const NEVER_BEFORE_REVEAL = ['"murderer"', '"ghost"', '"victim"']

export async function fakeNight({ db, log = console.log, realSecrets = false, phones = PHONES, label = 'Fake players', seed = null } = {}) {
  const say = line => log(line)
  const runId = Math.random().toString(36).slice(2, 8)
  const uids = Array.from({ length: phones }, (_, i) => `fake-${runId}-${i + 1}`)
  const summary = { nightId: null, rehearsal: null, acts: [], seal: { checks: 0, failed: [] }, checks: [], tally: null, secrets: null, fairness: null, discard: null, ok: false, error: null }

  // a party-night dry run is never dealt from a word; a rehearsal always is (the caller's, or a fresh one)
  const nightOpts = realSecrets ? { forceRehearsal: false, dryRun: true, label } : { forceRehearsal: true, dryRun: true, label, ...(seed ? { seed } : {}) }
  const { nightId } = await night.createNight(db, nightOpts)
  summary.nightId = nightId
  const word = realSecrets ? null : (await db.doc(`nights/${nightId}/private/deck`).get()).data()?.seed ?? null
  summary.seed = word
  say(`Fake players: ${phones} phones, ${realSecrets ? 'party case, dry run' : 'rehearsal case'}, night ${nightId}${word ? `, seed ${word}` : ''}`)

  const nightDoc = async () => (await db.doc(`nights/${nightId}`).get()).data()
  const sessionOf = async uid => (await db.doc(`sessions/${uid}`).get()).data() ?? {}
  const cardsOf = (s, kind) => (s.cards ?? []).filter(c => c.kind === kind)
  const countCards = async (kind, act = null) => { let n = 0; for (const uid of uids) n += cardsOf(await sessionOf(uid), kind).filter(c => act === null || c.act === act).length; return n }
  const actName = act => deal.NIGHT.acts[String(act)]?.name ?? `Act ${act}`
  const next = () => run.hostCommand(db, { nightId, command: 'next' })
  const host = (command, arg, now) => run.hostCommand(db, { nightId, command, arg, ...(now ? { now } : {}) })
  const actLine = (act, parts) => { summary.acts.push({ act, parts }); say(`Act ${act}, ${actName(act)}: ${deal.beatsOf(act).length} beats, ${parts.join(', ')}`) }

  // every phone answers the open Parlour Game with a random pick per question, then the dry run closes it
  async function answerWindow() {
    const n = await nightDoc()
    const w = n.window
    if (!w || w.settled || w.kind !== 'questions') return 0
    let answered = 0
    for (const uid of uids) {
      const set = (await sessionOf(uid)).windows?.[w.id]
      if (!set) continue
      const picks = set.beats.map(b => choice(b.choices).k)
      await run.player.answer(db, { nightId, uid, windowId: w.id, picks })
      answered++
    }
    await host('settle-now')
    return answered
  }
  // the act's next Parlour Game, at its own time: the clock is wound forward to it (and past the gap
  // after the last one), the game pops up on every phone, every phone answers, the dry run closes it
  async function nextParlour() {
    const ref = db.doc(windows.parlourPath(nightId))
    const sched = (await ref.get()).data()
    const i = Array.from({ length: sched?.count ?? 0 }, (_, k) => k).find(k => !sched.fired?.[k])
    if (i === undefined) return null
    const gap = deal.PARLOUR.minGapMin * 60_000
    const at = Math.max(deal.ms(sched[`due${i}`]), sched.lastAt ? deal.ms(sched.lastAt) + gap : 0)
    const r = await windows.tickParlour(db, nightId, at)
    return r.opened ? answerWindow() : null
  }
  async function allParlours() {
    let games = 0, answered = 0
    for (let a = await nextParlour(); a !== null; a = await nextParlour()) { games++; answered += a }
    return { games, answered }
  }
  const heartbeat = () => station.stationCommand(db, { nightId, station: 'study', command: 'state', payload: { state: 'idle' } })

  // Act 2, Lights Out: each phone goes to its cat when it is called, scans the
  // room's code, reads, taps Done. At every step: never two guests at a cat
  // (F20), and every phone has a next step (F21). Counts only.
  async function walkRooms() {
    const deckUids = (await db.doc(`nights/${nightId}/private/deck`).get()).data()?.uids ?? {}
    let meetings = 0, waves = 0, twoAtACat = 0, untold = 0
    const look = async () => {
      const state = (await db.doc(deal.lightsPath(nightId)).get()).data()
      const at = {}
      for (const g of Object.values(state?.guests ?? {})) if (g.step === 'go' || g.step === 'with') at[g.cat] = (at[g.cat] ?? 0) + 1
      if (Object.values(at).some(n => n > 1)) twoAtACat++
      for (const uid of Object.values(deckUids)) { const l = (await sessionOf(uid)).lights; if (!l?.step || !l.title || !l.text) untold++ }
      return state
    }
    for (let guard = 0; guard < 50; guard++) {
      const state = await look()
      const due = Object.entries(state?.guests ?? {}).filter(([, g]) => g.step === 'go')
      if (!due.length) break
      waves++
      for (const [key, g] of due) {
        await run.player.meetCat(db, { nightId, uid: deckUids[key], cat: g.cat })
        await look()
        await run.player.leaveCat(db, { nightId, uid: deckUids[key] })
        meetings++
      }
    }
    await look()
    return { meetings, waves, ok: twoAtACat === 0 && untold === 0, twoAtACat, untold }
  }

  // Act 4, the Library: the group turns every card on each of the three boards (the boards are public)
  async function clearMemory() {
    for (let step = 0; step < 3; step++) {
      const board = (await db.doc(act4.memoryPath(nightId)).get()).data()
      if (!board?.boardId || board.cleared) return 0
      const cards = board.boards?.[String(board.step)] ?? []
      const open = new Map()
      const pairs = []
      cards.forEach((t, i) => { const o = open.get(t) ?? []; if (o.length) pairs.push([o.pop(), i]); else o.push(i); open.set(t, o) })
      const r = await run.player.memoryStep(db, { nightId, boardId: board.boardId, step: board.step, pairs })
      if (r.cleared) return 1
    }
    return 0
  }
  // A group arrives in its room: the code on the wall, from one member's phone.
  async function arrive(gid, room) {
    const rot = (await db.doc(station.rotationPath(nightId)).get()).data()
    const key = rot.groups.find(g => g.id === gid)?.members?.[0]?.key
    const deckUids = (await db.doc(`nights/${nightId}/private/deck`).get()).data()?.uids ?? {}
    if (!key || !deckUids[key]) return null
    await run.player.meetCat(db, { nightId, uid: deckUids[key], cat: act4.ROOMS[room].cat })
    return deckUids[key]
  }
  // Act 4, the Orangerie: Salem's three rounds, each thirty seconds clean (the clock jumped, not waited for)
  async function playSalem(gid) {
    const uid = await arrive(gid, 'orangerie')
    if (!uid) return 0
    for (let r = 0; r < act4.SALEM_ROUNDS; r++) {
      await run.player.salemReady(db, { nightId, uid })
      const doc = (await db.doc(act4.salemPath(nightId)).get()).data()
      if (doc?.state !== 'playing') return 0
      await run.player.salemPassed(db, { nightId, uid, attempt: doc.attempt, now: deal.ms(doc.cleanAt) })
    }
    return (await db.doc(act4.salemPath(nightId)).get()).data()?.state === 'cleared' ? 1 : 0
  }
  // Act 4, the Entryway: Boo's three poses, then her verdict pays the group
  async function playBoo(gid) {
    if (!(await arrive(gid, 'entryway'))) return 0
    const doc = (await db.doc(act4.booPath(nightId)).get()).data()
    if (doc?.state !== 'show') return 0
    const r = await run.player.booDone(db, { nightId, now: deal.ms(doc.endsAt) })
    return r.paid ? 1 : 0
  }
  // Act 4's Parlour Games wait on the phones: every phone plays what is waiting
  async function playWaiting() {
    let played = 0
    for (const uid of uids) {
      const s = await sessionOf(uid)
      for (const [id, w] of Object.entries(s.windows ?? {})) {
        if (!w.waiting || s.answers?.[id]) continue
        await run.player.answer(db, { nightId, uid, windowId: id, picks: w.beats.map(b => choice(b.choices).k) })
        played++
      }
    }
    return played
  }

  // the seal, as a phone or a room screen would see it: counts of checks and short codes for failures
  async function sealCheck(stage) {
    const failed = []
    let checks = 0
    for (const uid of uids) {
      const s = await sessionOf(uid)
      checks++; if ('role' in s) failed.push(`${stage}:session:role`)
      const sets = JSON.stringify(s.windows ?? {})
      checks++; if (sets.includes('"av"') || sets.includes('"values"')) failed.push(`${stage}:session:points`)
    }
    const docs = [['night', await nightDoc()]]
    for (const ref of await db.collection(`nights/${nightId}/public`).listDocuments()) docs.push([`public/${ref.id}`, (await ref.get()).data()])
    // with a station key saved, a W-O-O-F News recording never goes on a public doc by its name (it names a family and a level)
    const coded = !!(await screen.recordingKey(db))
    for (const [name, data] of docs) {
      const text = JSON.stringify(data ?? {})
      for (const token of NEVER_PUBLIC) { checks++; if (text.includes(token)) failed.push(`${stage}:${name}:${token.replace(/"/g, '')}`) }
      if (coded) { checks++; if (news.CLIP_IDS.some(id => text.includes(`"${id}"`))) failed.push(`${stage}:${name}:recording`) }
      if (stage === 'before-reveal') for (const token of NEVER_BEFORE_REVEAL) { checks++; if (text.includes(token)) failed.push(`${stage}:${name}:${token.replace(/"/g, '')}`) }
    }
    summary.seal.checks += checks
    summary.seal.failed.push(...failed)
  }

  try {
    // ---- Act 1: arrivals, three notices, the blackout
    // the first two phones are the hosts (F02): their names play the Professors, bots play them like everyone else
    const hosts = await night.readHosts(db)
    const hostNames = [hosts.jonathan?.name, hosts.susan?.name].filter(Boolean)
    for (let i = 0; i < uids.length; i++) await night.join(db, { uid: uids[i], nightId, name: hostNames[i] ?? `Phone ${i + 1}` })
    for (const b of deal.beatsOf(1)) { await next(); if ((await nightDoc()).beat !== b.key) throw new Error(`expected beat ${b.key}`) }
    const notices1 = await countCards('notice')
    await host('blackout')
    await host('power')
    actLine(1, [`${uids.length} phones joined`, `${notices1} notices dealt`, 'blackout', 'power returned'])

    // ---- Act 2: roles, the cats, the act's Parlour Games
    const n2 = await nightDoc()
    summary.rehearsal = n2.rehearsal === true
    say(`Case: ${summary.rehearsal ? 'rehearsal' : 'party'}${n2.caseWarning ? `; warning: ${String(n2.caseWarning).split(',').map(k => CASE_WARNINGS[k] ?? k).join('; ')}` : ''}`)
    const roleCards = await countCards('role')
    await next() // news
    await next() // the bag peek
    await next() // cat: the first wave goes
    const p2 = await allParlours() // the act's Parlour Games, each at its own time
    const rooms = await walkRooms()
    if (!rooms.ok) summary.checks.push(...(rooms.twoAtACat ? ['F20'] : []), ...(rooms.untold ? ['F21'] : []))
    // every cat gives a motive hint and a bag clue (23 Oct 2026); nothing else is said
    let hints = 0, bagClues = 0
    for (const uid of uids) {
      for (const t of cardsOf(await sessionOf(uid), 'testimony')) {
        if (t.hint?.text && !(t.lines ?? []).length) hints++
        if (t.bag?.text) bagClues++
      }
    }
    if (hints !== bagClues || hints !== 4 * uids.length) summary.checks.push('G44')
    // everyone has seen all four cats: the supper chime came on its own (F24)
    const supper = (await nightDoc()).beat === 'supper'
    if (!supper) summary.checks.push('F24')
    say(`Act 2 rooms: ${rooms.meetings} visits in ${rooms.waves} waves; one guest at a cat at a time (F20) ${rooms.twoAtACat ? 'FAIL' : 'PASS'}; every phone told where to go (F21) ${rooms.untold ? 'FAIL' : 'PASS'}; supper on its own (F24) ${supper ? 'PASS' : 'FAIL'}`)
    actLine(2, [`${roleCards} role cards`, `${rooms.meetings} cat visits`, `${hints} motive hints and ${bagClues} bag clues`, `${p2.games} Parlour Games, ${p2.answered} answers`])

    // ---- Act 3: supper, bulletin 2 (armed, then it plays itself on the tick)
    await next() // phones down
    const armed = await next() // arm the bulletin: the host hears only Armed
    const due = deal.ms((await db.doc(`nights/${nightId}/private/bulletin`).get()).data()?.dueAt)
    await host('tick', undefined, due) // three to five minutes later it plays
    const played = (await db.doc(`nights/${nightId}/private/bulletin`).get()).data()?.played === true
    if (!armed.armed || !played) summary.checks.push('B2')
    await sealCheck('bulletin') // the recordings it just sent are on the public sounds doc
    actLine(3, [`${await countCards('notice', 3)} notices`, `bulletin 2 ${played ? 'played' : 'DID NOT PLAY'}`])

    // ---- Act 4: Start Act 4, the group cards and Locked in, then four game rooms on the clock
    await host('start-act4')
    await next() // the group cards
    for (const uid of uids) await run.player.lockIn(db, { nightId, uid })
    if ((await nightDoc()).beat !== 'round1') throw new Error('Locked in did not start the rounds')
    const rot4 = (await db.doc(station.rotationPath(nightId)).get()).data()
    await heartbeat() // the station is alive: the study's trace is earned in the room
    let rounds = 0, throughStudy = 0, memoryClears = 0, salemClears = 0, booShows = 0, games4 = 0, played4 = 0, guard = 0
    while (guard++ < 10 && (await nightDoc()).act === 4) {
      const n = await nightDoc()
      const round = Number(/^round(\d+)$/.exec(n.beat)?.[1] ?? 0)
      if (!round) { await next(); continue }
      rounds++
      if (await nextParlour() !== null) games4++ // one waits on the phones
      played4 += await playWaiting() // played when the guests are free
      const inRoom = room => act4.groupIn(rot4, room, round)
      if (inRoom('library') && randomInt(4)) memoryClears += await clearMemory() // most groups clear the boards; the rest are paid at the chime
      if (inRoom('orangerie') && randomInt(4)) salemClears += await playSalem(inRoom('orangerie'))
      if (inRoom('entryway')) booShows += await playBoo(inRoom('entryway'))
      const studyDue = (await db.doc(station.studyPath(nightId)).get()).data()?.groupId ?? null
      if (studyDue && randomInt(4)) {
        await heartbeat()
        await run.studyFinished(db, { nightId, payload: { groupId: studyDue, outcome: 'solved', seconds: 200 + randomInt(400), pairs: 3 } })
        throughStudy++
      }
      await next() // the chime: every room not finished is paid; the groups move on
    }
    if ((await nightDoc()).act !== 5) throw new Error('Act 4 did not end')
    // G47 and G52: every group visited every room once, and every room paid every group
    const paid = (await db.doc(act4.act4PrivatePath(nightId)).get()).data()?.paid ?? {}
    if (Object.keys(paid).length !== rot4.groups.length * act4.ROOM_KEYS.length) summary.checks.push('G52')
    const roomCards = (await Promise.all(uids.map(sessionOf))).flatMap(s => cardsOf(s, 'clue').filter(c => c.room)).length
    actLine(4, [`${rot4.groups.length} groups, ${rounds} rounds`, `${roomCards} room rewards`, `${throughStudy} through the study`, `${memoryClears} memory matches cleared`, `${salemClears} Salem games cleared`, `${booShows} catwalks`, `${games4} waiting Parlour Games, ${played4} played`])

    // ---- Act 5: cake, the chime, Sir Irwin
    // Act 4's last chime brought the house to the cake: any room never paid was paid then
    await next() // Sir Irwin on the screen
    const funnel = await motiveFunnel()
    if (!funnel.ok) summary.checks.push('G32')
    say(`Motive funnel: ${funnel.ok ? 'PASS' : 'FAIL'}, ${funnel.left} left after Sir Irwin named ${funnel.named}`)
    actLine(5, [`${await countCards('notice', 5)} notices`, `${funnel.crossed} motives crossed off by the Library and Boo`])

    // ---- Act 6: the two Parlour Games at the start, the drawing, the door, the deduction round
    await next() // the games: the first is on every phone at once
    const first6 = await answerWindow()
    const rest6 = await allParlours()
    const p6 = { games: (first6 ? 1 : 0) + rest6.games, answered: first6 + rest6.answered }
    await next() // the drawing starts
    const drawing = await playDrawing()
    await next() // the door
    await next() // the deduction round
    const n6 = await nightDoc()
    const keys = Object.keys(n6.roster ?? {})
    let struck = 0
    for (const uid of uids) {
      const target = randomInt(2) ? { kind: 'person', key: choice(keys) } : { kind: 'motive', n: choice(night.MOTIVES).n }
      await run.player.eliminate(db, { nightId, uid, target }); struck++
    }
    await host('settle-now')
    await sealCheck('before-reveal')
    actLine(6, [`${p6.games} Parlour Games, ${p6.answered} answers`, `drawing done in ${drawing.turns} turns and ${drawing.votes} guesses on the main computer (${drawing.misses} misses)`, `${struck} strikes`])

    // ---- Act 7: the ballot, the reveal, every phone's result
    await next() // ballot
    let ballots = 0
    for (const uid of uids) {
      await run.player.ballot(db, { nightId, uid, murderer: choice(keys), motive: choice(night.MOTIVES).n, victim: choice(keys) }); ballots++
    }
    await host('settle-now')
    await next() // reveal: the reel on the screen, no name out yet
    for (let i = 0; i < 3; i++) await host('reveal-stage') // the Murderer, the Motive, the Victim, one press each
    const r7 = await next() // results
    const results = await countCards('result')
    actLine(7, [`${ballots} ballots`, `${results} results`])
    summary.tally = { of: r7.of, murderer: r7.murderer, motive: r7.motive, victim: r7.victim }
    say(`Tally: of ${r7.of} ballots, murderer right on ${r7.murderer}, motive on ${r7.motive}, victim on ${r7.victim}`)
    summary.secrets = await secretsUsed()
    const { leanSets, bags, packed, fromBank } = summary.secrets
    say(`Party secrets used: the cats' leans for ${leanSets} ${leanSets === 1 ? 'set' : 'sets'}, the packing on ${packed} of ${bags} bag clues, the picture bank for ${fromBank} of 3 drawing rounds`)

    // F02: the host seats played the Professors and were dealt and answered exactly like every other phone
    const seats = await hostSeats()
    if (!seats.ok) summary.checks.push('F02')
    say(`Host seats: ${seats.hosts} ${seats.hosts === 1 ? 'phone plays a Professor' : 'phones play the Professors'}, dealt and answered like everyone else (F02) ${seats.ok ? 'PASS' : 'FAIL'}`)
    // G05: every seat, both host seats included, lands the Murderer and the Ghost about equally often
    const [g05] = checks.fairnessChecks({ count: SEAT_DEALS, rng: seededRng(SEAT_SEED) })
    summary.fairness = { pass: g05.pass, seats: g05.count, of: g05.of, deals: SEAT_DEALS }
    if (!g05.pass) summary.checks.push('G05')
    say(`Seat fairness (G05): ${g05.pass ? 'PASS' : 'FAIL'}, ${g05.count} of ${g05.of} seats fair over ${SEAT_DEALS.toLocaleString('en-GB')} dealt cases, both host seats included`)

    await sealCheck('end')
    if (summary.seal.failed.length) say(`Seal: FAIL, ${summary.seal.failed.length} of ${summary.seal.checks} checks: ${summary.seal.failed.join(' ')}`)
    else say(`Seal: PASS, ${summary.seal.checks} checks`)
    if (summary.checks.length) say(`Checks: FAIL ${summary.checks.join(' ')}`)
    summary.ok = summary.seal.failed.length === 0 && summary.checks.length === 0
  } catch (e) {
    summary.error = describeError(e)
    summary.ok = false
    say(`Stopped: ${summary.error}`)
  } finally {
    try {
      const d = await host('discard-night')
      const gone = !(await db.doc(`cases/${nightId}`).get()).exists && !(await db.doc(`nights/${nightId}`).get()).exists
      summary.discard = { ...d, gone }
      say(`Discarded night ${nightId}: case ${d.case}, night ${d.night}, ${d.subdocs} subdocs, ${d.sessions} sessions, ${d.presence} presence, ${d.notes} notes${gone ? '' : ' (STILL THERE)'}`)
      if (!gone) summary.ok = false
    } catch (e) {
      summary.discard = { error: describeError(e) }
      summary.ok = false
      say(`Discard failed: ${summary.discard.error}`)
    }
  }
  say(summary.ok ? 'PASS' : 'FAIL')
  return summary

  // The host seats (F02): each host phone holds its Professor and the host
  // flag, and every phone, hosts included, ends the night with the same
  // counts: one role card, four cats' cards, the same Parlour Games dealt and
  // answered, a ballot and a result. Counts only.
  async function hostSeats() {
    const sessions = await Promise.all(uids.map(sessionOf))
    const profs = night.CHARACTERS.filter(ch => ch.host).map(ch => ch.id)
    const count = Math.min(2, uids.length)
    let ok = true
    for (let i = 0; i < count; i++) if (!sessions[i].host || sessions[i].characterId !== profs[i]) ok = false
    const shape = s => JSON.stringify([
      cardsOf(s, 'role').length, cardsOf(s, 'testimony').length, cardsOf(s, 'result').length,
      Object.values(s.windows ?? {}).filter(w => w?.kind === 'questions').length, Object.keys(s.answers ?? {}).length, s.ballot ? 1 : 0,
    ])
    if (new Set(sessions.map(shape)).size !== 1) ok = false
    return { ok, hosts: count }
  }

  // How much of the party's three secrets the night used: the lean table
  // (sets with a lean, in the case's Parlour plan), the packing (bag clues
  // that are not stand-ins) and the drawing's picture bank (rounds it filled).
  // A rehearsal uses none of them. Counts only: never a lean, a property or
  // a picture.
  async function secretsUsed() {
    const c = (await db.doc(`cases/${nightId}`).get()).data()
    let bags = 0, packed = 0
    for (const uid of uids) {
      const s = await sessionOf(uid)
      for (const card of [...cardsOf(s, 'testimony'), ...cardsOf(s, 'clue')].filter(x => x.bag)) { bags++; if (!card.bag.placeholder) packed++ }
    }
    const fromBank = (await db.doc(relay.relayPaths(nightId).priv).get()).data()?.fromBank ?? 0
    return { leanSets: Object.keys(c?.parlourPlan?.leans ?? {}).length, bags, packed, fromBank }
  }

  // G32 on this night: every structured clue the room shared by the end of
  // Act 5 (the news flash, every guest's hint, the bulletin, the memory
  // matches) and the motives Sir Irwin named on the screen. The real motive
  // must still stand; at dial 3 it must be the only one. The case is read in
  // the process and nothing of it is printed: counts and PASS or FAIL.
  async function motiveFunnel() {
    const c = (await db.doc(`cases/${nightId}`).get()).data()
    const screenDoc = (await db.doc(`nights/${nightId}/public/screen`).get()).data()
    const band = Number(screenDoc?.mood) || 3
    // a rehearsal shows a stand-in for Sir Irwin's cards: the same options, worked out from the case here
    const named = c?.rehearsal ? families.irwinOptions(c, { band, seed: screen.screenSeed(c, nightId) }) : (screenDoc?.choices ?? []).map(x => x.n)
    const bulletinBand = (await db.doc(`nights/${nightId}/private/bulletin`).get()).data()?.level ?? null
    const left = families.remainingMotives(families.roomClues(c, { irwin: named, bulletinBand }))
    const ok = named.length === families.irwinCount(band) && left.includes(Number(c?.motive)) && (band !== 3 || left.length === 1)
    return { ok, left: left.length, named: named.length, crossed: Object.keys(c?.solving?.memory ?? {}).length + Object.keys(c?.solving?.boo ?? {}).length }
  }

  // The Act 6 drawing on its own clock: the room taps a guess at random on
  // the main computer (nobody here knows the answer), the relay crosses the
  // wrong ones out, and the slides, walk and turn timers are jumped rather
  // than waited for. Returns counts only.
  async function playDrawing() {
    const { pub } = relay.relayPaths(nightId)
    let clock = Date.now()
    let turns = 0, votes = 0, guard = 0
    while (guard++ < 1000) {
      const p = (await db.doc(pub).get()).data()
      if (!p) throw new Error('the drawing has no public doc')
      if (p.state === 'done') return { turns, votes, misses: (p.stats?.misses ?? []).reduce((a, b) => a + b, 0), seconds: p.stats?.totalSeconds ?? 0 }
      if (p.state === 'vote') {
        const standing = [0, 1, 2, 3].filter(i => !(p.crossed ?? []).includes(i))
        await run.player.relayGuess(db, { nightId, pick: standing[randomInt(standing.length)], now: clock + 1 })
        votes++
        continue
      }
      if (p.state === 'turn') turns++
      clock += p.state === 'intro' ? relay.INTRO_MS : p.state === 'walk' ? Math.max(relay.WALK_MS, relay.PULL_MS) : p.state === 'lockout' ? relay.LOCKOUT_MS : relay.TURN_MS
      await run.advanceRelay(db, { nightId, now: clock })
    }
    throw new Error('the drawing never finished')
  }
}

// ---- the command line ---------------------------------------------------------

async function main() {
  const args = process.argv.slice(2)
  const has = f => args.includes(f)
  const realSecrets = has('--real-secrets')
  const at = args.indexOf('--seed')
  const seed = at >= 0 ? String(args[at + 1] ?? '') : null
  if (seed !== null && realSecrets) {
    console.log('Refusing: --seed is for a rehearsal. The party night is never dealt from a word.')
    return 2
  }
  let db
  if (has('--live')) {
    if (!has('--i-know-this-is-the-party-database')) {
      console.log('Refusing: --live needs --i-know-this-is-the-party-database as well. This is the party database.')
      return 2
    }
    const { openDb } = await import('../functions/lib/connect.js')
    db = openDb({ live: true })
    const active = await db.doc('public_state/active').get()
    const liveId = active.exists ? active.data().nightId : null
    if (liveId && (await db.doc(`nights/${liveId}`).get()).exists) {
      console.log(`Refusing: a night is live (${liveId}). The fake players never join an existing night.`)
      return 2
    }
  } else if (has('--emulator')) {
    const { openDb } = await import('../functions/lib/connect.js')
    db = openDb({ emulator: true })
  } else {
    const { FakeFirestore } = await import('../functions/test/fake-firestore.mjs')
    db = new FakeFirestore()
  }
  const summary = await fakeNight({ db, realSecrets, seed })
  return summary.ok ? 0 : 1
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().then(code => process.exit(code)).catch(e => { console.log(`FAIL: ${describeError(e)}`); process.exit(1) })
}
