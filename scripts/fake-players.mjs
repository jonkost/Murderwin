#!/usr/bin/env node
// Eight fake phones walk a whole night, then throw it away.
//
// The phones hold nothing: each one is a signed-in id with a session the
// dealer fills, exactly as a real phone's would be. The script drives the
// host's Next through every beat of every act (seed/night.json), and at each
// beat does what the room would do: dismisses notices, reads the cat's
// numbers and opens the safe, answers every Parlour Game, finishes the study
// for each group, votes in the drawing, strikes one thing out, casts a
// ballot. At the end it checks the seal (no phone can read a role, no public
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
  for (const f of ['characters.json', 'motives.json', 'night.json']) {
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
  'trace-partner': 'one trace at the party has no look-alike among the guests',
}

// Words a phone-readable document must never carry. Checked as JSON keys
// (with the quotes) so "motives", the public list, does not trip "motive".
const NEVER_PUBLIC = ['"roles"', '"dialSign"', '"dialMap"', '"dial"', '"dialLog"', '"kernels"', '"documents"', '"hiddenSets"', '"studyClue"', '"echo"', '"salemTruthIndex"', '"granoliaSlot"', '"variant"']
const NEVER_BEFORE_REVEAL = ['"murderer"', '"ghost"', '"victim"']

export async function fakeNight({ db, log = console.log, realSecrets = false, phones = PHONES, label = 'Fake players' } = {}) {
  const say = line => log(line)
  const runId = Math.random().toString(36).slice(2, 8)
  const uids = Array.from({ length: phones }, (_, i) => `fake-${runId}-${i + 1}`)
  const summary = { nightId: null, rehearsal: null, acts: [], seal: { checks: 0, failed: [] }, tally: null, discard: null, ok: false, error: null }

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
  const host = (command, arg) => run.hostCommand(db, { nightId, command, arg })
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
  const heartbeat = () => station.stationCommand(db, { nightId, station: 'study', command: 'state', payload: { state: 'idle' } })

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
    await next() // cat
    const outcomes = { full: 0, partial: 0, deflect: 0 }
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
    await next() // Parlour Game
    const answered2 = await answerWindow()
    await next() // check-in
    actLine(2, [`${roleCards} role cards`, `${uids.length} cat visits (${outcomes.full} full, ${outcomes.partial} partial, ${outcomes.deflect} brush-offs)`, `safe opened on ${opened} phones (${gaveWay} gave way)`, `${documents} documents`, `${answered2} Parlour Game answers`])

    // ---- Act 3: dinner, the bulletin, the groups
    await next(); await next()
    const r3 = await next()
    actLine(3, [`${await countCards('notice', 3)} notices`, `${r3.groups} groups (${r3.trios} of three)`])

    // ---- Act 4: five stations, the study finishing each group, two Parlour Games
    await heartbeat() // the station is alive: the study's clue is earned in the room, not dealt with the card
    await next() // station1
    let rotations = 0, throughStudy = 0, answered4 = 0, guard = 0
    while (guard++ < 40) {
      const n = await nightDoc()
      if (n.act !== 4) break
      rotations = Math.max(rotations, (n.rotation ?? -1) + 1)
      // a Parlour Game opened by a study finish sits on a rotate beat: answer it and let the next study finish move the house;
      // one opened by its own beat (autoAfterStudy off) needs Next to move on
      if (n.window && !n.window.settled) { answered4 += await answerWindow(); if (deal.beatSpec(4, n.beat)?.action !== 'rotate') await next(); continue }
      if (deal.beatSpec(4, n.beat)?.action !== 'rotate') { await next(); continue }
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
    actLine(4, [`${rotations} rotations`, `${throughStudy} groups through the study`, `${stationCards} station cards`, `${clues} clues`, `${answered4} Parlour Game answers`])

    // ---- Act 5: cake, the chime
    await next()
    actLine(5, [`${await countCards('notice', 5)} notices`])

    // ---- Act 6: the last Parlour Game, the drawing, the door, the deduction round
    await next() // merged
    const answered6 = await answerWindow()
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
    actLine(6, [`${answered6} Parlour Game answers`, `drawing done in ${drawing.turns} turns and ${drawing.votes} votes (${drawing.misses} misses)`, `${struck} strikes`])

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
    summary.ok = summary.seal.failed.length === 0
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

  // The Act 6 drawing on its own clock: every phone picks a picture at random
  // (the phones hold nothing, so nobody knows the answer), the relay crosses
  // the wrong ones out, and the walk and turn timers are jumped rather than
  // waited for. Returns counts only.
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
        for (const uid of uids) await run.player.relayVote(db, { nightId, uid, pick: standing[randomInt(standing.length)] })
        votes++
        await run.advanceRelay(db, { nightId, now: clock + 1 })
        continue
      }
      if (p.state === 'turn') turns++
      clock += p.state === 'walk' ? Math.max(relay.WALK_MS, relay.PULL_MS) : p.state === 'lockout' ? relay.LOCKOUT_MS : relay.TURN_MS
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
