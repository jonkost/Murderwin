#!/usr/bin/env node
// Eight fake phones walk a whole night, then throw it away.
//
// The phones hold nothing: each one is a signed-in id with a session the
// dealer fills, exactly as a real phone's would be. The script drives the
// host's Next through every beat of every act (seed/night.json), and at each
// beat does what the room would do: dismisses notices, goes to its cat when
// the phone sends it (one guest at a cat at a time), reads the cat's
// numbers and opens the safe, answers every Parlour Game, finishes the study
// for each group, clears the memory match, guesses in the drawing, strikes one
// thing out, casts a ballot. It checks the Act 2 rooms (F20, F21) and that
// the motive funnel leaves the real motive standing (G32, counts only). At the end it checks the seal (no phone can read a role, no public
// document carries the case), prints one line per act and a tally, and
// discards the night: the case, the night, every session. Nothing it prints
// is ever a card. Counts, keys and act names only.
//
//   npm run fake-night                       in-process, against an in-memory stand-in Firestore
//   npm run fake-night -- --emulator         against the local emulators (npm run emulate first)
//   npm run fake-night -- --real-secrets     the night draws a SEALED motive set (a dry run);
//                                            needs sealed content where the script is pointed
//   --live --i-know-this-is-the-party-database
//                                            the party project (GOOGLE_APPLICATION_CREDENTIALS);
//                                            refuses while a night is live; discards its own
//
// Exit 0 is PASS. Anything else is FAIL, and the night is discarded either way.
//
// SEAL RULE: this file never prints, logs or keeps a card. The numbers for
// the safe are read from the phone's own testimony and used at once. With
// --real-secrets the testimony on the fake phones is sealed content; it is
// discarded with the night and never leaves the process.

import { existsSync, mkdirSync, copyFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { randomInt } from 'node:crypto'

const here = dirname(fileURLToPath(import.meta.url))
const root = join(here, '..')

// The night logic reads functions/seed/*.json (copied by `npm --prefix
// functions run seed`). Copy it here too, so the script runs on its own.
export function ensureSeed() {
  const dest = join(root, 'functions', 'seed')
  mkdirSync(dest, { recursive: true })
  for (const f of ['characters.json', 'motives.json', 'night.json', 'families.json', 'woof-news.json', 'cat-lines.json']) {
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

export const PHONES = 8
const choice = list => list[randomInt(list.length)]

// The safe's numbers ride in a safe sentence with [A], [B] and [C] slots
// (ui_copy NUMBERS, or the dealer's default). Turn that template into a
// pattern and pull the three numbers out of a line. Null when they are not there.
export function codesIn(text, template) {
  if (typeof text !== 'string' || !template) return null
  const pattern = template.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\\\[(A|B|C)\\\]/g, '(\\d+)')
  const m = new RegExp(pattern).exec(text)
  return m && m.length >= 4 ? [m[1], m[2], m[3]].map(Number) : null
}

async function numbersTemplates(db) {
  const ui = await night.readArea(db, 'ui_copy')
  const find = (label, fallback) => {
    const it = ui.find(i => i.text.trim().startsWith(`${label}:`))
    const t = it ? it.text.trim().slice(label.length + 1).trim() : ''
    return t.includes('[A]') ? t : fallback
  }
  return { line: find('NUMBERS', deal.DEFAULT_NUMBERS_LINE), scrap: find('NOTICE SCRAP', deal.DEFAULT_SCRAP.text) }
}

// What a failure is called on the way out. NightError messages are fixed
// safe copy; anything else is a runtime error, never a card.
function describeError(e) {
  if (e instanceof night.NightError) return `${e.code}: ${e.message}`
  return `${e?.name ?? 'Error'}: ${e?.message ?? String(e)}`
}

const CASE_WARNINGS = {
  'rehearsal-fallback': 'the sealed content could not be used, so stand-ins were dealt',
  'no-sealed-content': 'the party night found no sealed content in this project, so stand-ins were dealt',
  'trace-partner': 'one trace at the party has no look-alike among the guests',
}

// Words a phone-readable document must never carry. Checked as JSON keys
// (with the quotes) so "motives", the public list, does not trip "motive".
const NEVER_PUBLIC = ['"roles"', '"dialSign"', '"dialMap"', '"dial"', '"dialLog"', '"kernels"', '"documents"', '"parlourPlan"', '"leans"', '"listeners"', '"studyClue"', '"echo"', '"salemTruthIndex"', '"granoliaSlot"', '"variant"', '"solving"', '"hints"', '"newsOut"', '"family"']
const NEVER_BEFORE_REVEAL = ['"murderer"', '"ghost"', '"victim"']

export async function fakeNight({ db, log = console.log, realSecrets = false, phones = PHONES, label = 'Fake players' } = {}) {
  const say = line => log(line)
  const runId = Math.random().toString(36).slice(2, 8)
  const uids = Array.from({ length: phones }, (_, i) => `fake-${runId}-${i + 1}`)
  const summary = { nightId: null, rehearsal: null, acts: [], seal: { checks: 0, failed: [] }, checks: [], tally: null, discard: null, ok: false, error: null }

  const nightOpts = realSecrets ? { forceRehearsal: false, dryRun: true, label } : { forceRehearsal: true, dryRun: true, label }
  const { nightId } = await night.createNight(db, nightOpts)
  summary.nightId = nightId
  say(`Fake players: ${phones} phones, ${realSecrets ? 'sealed case, dry run' : 'stand-in case'}, night ${nightId}`)

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

  // Act 2, Lights Out: each phone goes to its cat when it is sent, scans the
  // room's code, reads, taps done. At every step: never two guests at a cat
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

  // Act 4: the group at the memory match turns every card and finds the six pairs (the board is public)
  async function clearMemory() {
    const board = (await db.doc(deal.memoryPath(nightId)).get()).data()
    if (!board?.boardId || board.cleared) return 0
    const open = new Map()
    const pairs = []
    board.cards.forEach((t, i) => { const o = open.get(t) ?? []; if (o.length) pairs.push([o.pop(), i]); else o.push(i); open.set(t, o) })
    const r = await run.player.memoryCleared(db, { nightId, boardId: board.boardId, pairs })
    return r.paid ? 1 : 0
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
    for (const [name, data] of docs) {
      const text = JSON.stringify(data ?? {})
      for (const token of NEVER_PUBLIC) { checks++; if (text.includes(token)) failed.push(`${stage}:${name}:${token.replace(/"/g, '')}`) }
      if (stage === 'before-reveal') for (const token of NEVER_BEFORE_REVEAL) { checks++; if (text.includes(token)) failed.push(`${stage}:${name}:${token.replace(/"/g, '')}`) }
    }
    summary.seal.checks += checks
    summary.seal.failed.push(...failed)
  }

  try {
    // ---- Act 1: arrivals, three notices, the blackout
    for (let i = 0; i < uids.length; i++) await night.join(db, { uid: uids[i], nightId, name: `Phone ${i + 1}` })
    for (const b of deal.beatsOf(1)) { await next(); if ((await nightDoc()).beat !== b.key) throw new Error(`expected beat ${b.key}`) }
    const notices1 = await countCards('notice')
    await host('blackout')
    await host('power')
    actLine(1, [`${uids.length} phones joined`, `${notices1} notices dealt`, 'blackout', 'power returned'])

    // ---- Act 2: roles, the cat, the safe, the first Parlour Game
    const n2 = await nightDoc()
    summary.rehearsal = n2.rehearsal === true
    say(`Case: ${summary.rehearsal ? 'stand-ins' : 'sealed'}${n2.caseWarning ? `; warning: ${String(n2.caseWarning).split(',').map(k => CASE_WARNINGS[k] ?? k).join('; ')}` : ''}`)
    const roleCards = await countCards('role')
    await next() // news
    await next() // cat: the first wave goes
    const rooms = await walkRooms()
    if (!rooms.ok) summary.checks.push(...(rooms.twoAtACat ? ['F20'] : []), ...(rooms.untold ? ['F21'] : []))
    const outcomes = { full: 0, partial: 0, deflect: 0, greet: 0 }
    for (const uid of uids) for (const t of cardsOf(await sessionOf(uid), 'testimony')) outcomes[t.outcome] = (outcomes[t.outcome] ?? 0) + 1
    await next() // the safe
    const templates = await numbersTemplates(db)
    let opened = 0, gaveWay = 0
    for (const uid of uids) {
      const s = await sessionOf(uid)
      const puzzle = cardsOf(s, 'puzzle')[0]
      if (!puzzle) continue
      let codes = null
      for (const t of cardsOf(s, 'testimony')) for (const line of t.lines ?? []) codes ??= codesIn(line, templates.line)
      for (const c of cardsOf(s, 'notice').filter(c => c.key === 'scrap')) codes ??= codesIn(c.text, templates.scrap)
      let r = codes ? await run.player.solve(db, { nightId, uid, cardId: puzzle.id, entry: codes }) : null
      for (let tries = 0; !(r?.right || r?.gaveWay) && tries < 3; tries++) r = await run.player.solve(db, { nightId, uid, cardId: puzzle.id, entry: [0, 0, 0] })
      if (r?.right) opened++; else if (r?.gaveWay) gaveWay++
    }
    const documents = await countCards('document')
    const p2 = await allParlours() // the act's Parlour Games, each at its own time
    await next() // check-in
    say(`Act 2 rooms: ${rooms.meetings} visits in ${rooms.waves} waves; one guest at a cat at a time (F20) ${rooms.twoAtACat ? 'FAIL' : 'PASS'}; every phone told where to go (F21) ${rooms.untold ? 'FAIL' : 'PASS'}`)
    actLine(2, [`${roleCards} role cards`, `${rooms.meetings} cat visits`, `${outcomes.full + outcomes.partial + outcomes.deflect} real hints (${outcomes.full} full, ${outcomes.partial} partial, ${outcomes.deflect} brush-offs) and ${outcomes.greet} greetings`, `safe opened on ${opened} phones (${gaveWay} gave way)`, `${documents} documents`, `${p2.games} Parlour Games, ${p2.answered} answers`])

    // ---- Act 3: dinner, bulletin 2 (armed, then it plays itself on the tick), the groups
    await next() // phones down
    const armed = await next() // arm the bulletin: the host hears only Armed
    const due = deal.ms((await db.doc(`nights/${nightId}/private/bulletin`).get()).data()?.dueAt)
    await host('tick', undefined, due) // three to five minutes later it plays
    const played = (await db.doc(`nights/${nightId}/private/bulletin`).get()).data()?.played === true
    if (!armed.armed || !played) summary.checks.push('B2')
    const r3 = await next()
    actLine(3, [`${await countCards('notice', 3)} notices`, `bulletin 2 ${played ? 'played' : 'DID NOT PLAY'}`, `${r3.groups} groups (${r3.trios} of three)`])

    // ---- Act 4: five stations, the study finishing each group, a Parlour Game popping up between finishes
    await heartbeat() // the station is alive: the study's clue is earned in the room, not dealt with the card
    await next() // station1
    let rotations = 0, throughStudy = 0, answered4 = 0, games4 = 0, memoryClears = 0, guard = 0
    while (guard++ < 40) {
      const n = await nightDoc()
      if (n.act !== 4) break
      rotations = Math.max(rotations, (n.rotation ?? -1) + 1)
      if (deal.beatSpec(4, n.beat)?.action !== 'rotate') { await next(); continue }
      const a4 = await nextParlour() // one pops up while the groups are at their stations
      if (a4 !== null) { games4++; answered4 += a4 }
      if (randomInt(4)) memoryClears += await clearMemory() // most groups clear the board; the rest are paid at the next rotation
      await heartbeat()
      const due = (await db.doc(station.studyPath(nightId)).get()).data()?.groupId ?? null
      const rot = (await db.doc(station.rotationPath(nightId)).get()).data() ?? {}
      if (due && !rot.finished?.[due]) {
        const r = await run.studyFinished(db, { nightId, payload: { groupId: due, outcome: 'solved', seconds: 200 + randomInt(600), pairs: 3 } })
        throughStudy++
        if (r.rotated) continue
      }
      await next()
    }
    if ((await nightDoc()).act !== 5) throw new Error('Act 4 did not end')
    const stationCards = await countCards('station')
    const clues = await countCards('clue')
    actLine(4, [`${rotations} rotations`, `${throughStudy} groups through the study`, `${memoryClears} memory matches cleared`, `${stationCards} station cards`, `${clues} clues`, `${games4} Parlour Games, ${answered4} answers`])

    // ---- Act 5: cake, the chime, Sir Irwin
    // Act 4's last rotation brought the house to the cake: any group the memory match never paid was paid then
    await next() // Sir Irwin on the screen
    const funnel = await motiveFunnel()
    if (!funnel.ok) summary.checks.push('G32')
    say(`Motive funnel: ${funnel.ok ? 'PASS' : 'FAIL'}, ${funnel.left} left after Sir Irwin named ${funnel.named}`)
    actLine(5, [`${await countCards('notice', 5)} notices`, `${funnel.crossed} motives crossed off by the memory match`])

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

  // G32 on this night: every structured clue the room shared by the end of
  // Act 5 (the news flash, every guest's hint, the bulletin, the memory
  // matches) and the motives Sir Irwin named on the screen. The real motive
  // must still stand; at dial 3 it must be the only one. The case is read in
  // the process and nothing of it is printed: counts and PASS or FAIL.
  async function motiveFunnel() {
    const c = (await db.doc(`cases/${nightId}`).get()).data()
    const screenDoc = (await db.doc(`nights/${nightId}/public/screen`).get()).data()
    const named = (screenDoc?.choices ?? []).map(x => x.n)
    const bulletinBand = (await db.doc(`nights/${nightId}/private/bulletin`).get()).data()?.level ?? null
    const left = families.remainingMotives(families.roomClues(c, { irwin: named, bulletinBand }))
    const band = Number(screenDoc?.mood) || 3
    const ok = named.length === families.irwinCount(band) && left.includes(Number(c?.motive)) && (band !== 3 || left.length === 1)
    return { ok, left: left.length, named: named.length, crossed: Object.keys(c?.solving?.memory ?? {}).length }
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
      clock += p.state === 'intro' ? relay.SLIDE_MS * relay.IRWIN_SLIDES.length : p.state === 'walk' ? Math.max(relay.WALK_MS, relay.PULL_MS) : p.state === 'lockout' ? relay.LOCKOUT_MS : relay.TURN_MS
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
  const summary = await fakeNight({ db, realSecrets })
  return summary.ok ? 0 : 1
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().then(code => process.exit(code)).catch(e => { console.log(`FAIL: ${describeError(e)}`); process.exit(1) })
}
