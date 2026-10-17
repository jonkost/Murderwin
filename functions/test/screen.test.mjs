import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createHash, randomInt } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { FakeFirestore } from './fake-firestore.mjs'
import { createNight, join, MOTIVES, CHARACTERS } from '../lib/night.js'
import { hostCommand, studyFinished, advanceRelay, player } from '../lib/run.js'
import { beatsOf, beatSpec, traceLevel, ms } from '../lib/deal.js'
import { relayPaths, vote, advance, VOTE_MS, WALK_MS, TURN_MS, PULL_MS } from '../lib/relay.js'
import { stationCommand, studyPath, rotationPath } from '../lib/station.js'
import {
  SOUND_IDS, SCREEN_KINDS, FORBIDDEN_SCREEN_KEYS, DEFAULT_FRAME, DEFAULT_IRWIN, REHEARSAL_FRAGMENT, DEFAULT_RELAY_RULES,
  echoLines, bulletinLines, struckMotives, strikeCount, dialBand, irwinTier, irwinLines, dogFilter, castNames, parseFrame, frameList,
  checkScreen, screenDoc, writeScreen, readScreen, play, currentSound, onBeat, onPhase, tvTrace, relayRules, labelled,
} from '../lib/screen.js'

// Everything here is a throwaway: synthetic bracketed fragments made in the
// test and discarded with the process, and the dealer's own rehearsal case
// in a fake Firestore. Nothing is printed. Where a test needs to know the
// gap was filled it compares hashes and lengths, never the text.

const sha = s => createHash('sha256').update(String(s)).digest('hex')
const synthetic = word => `(Synthetic ${word} ${randomInt(1e6)})`

// A case with only the fields the screens read, bracketed, made fresh each time.
function fixtureCase({ dial = 0, motive = 7, rehearsal = false } = {}) {
  return {
    rehearsal, dial, motive,
    echo: { fragment: synthetic('fragment') },
    irwin: { lines: [synthetic('dog quiet'), synthetic('dog plainer'), synthetic('dog plainest')] },
    roles: { a: 'murderer' }, murderer: 'a', ghost: 'b', kernels: { irwin: [synthetic('kernel')] },
  }
}

const FRAMES = [
  { text: '...residents further report ███. Authorities have declined to comment...' },
  { text: '...staff describe ███, though none would be quoted directly...' },
]

// ---------------------------------------------------------------------------
// The echo

test('echoLines fills the gap of one frame: the frame text is there, the gap is gone, the fragment is inside (by hash and length only)', () => {
  const c = fixtureCase()
  const lines = echoLines(c, FRAMES, { seed: 'n1' })
  assert.equal(lines.length, 1)
  const line = lines[0]
  assert.ok(!line.includes('███'))
  const frames = frameList(FRAMES)
  const used = frames.find(f => line.startsWith(f.before.replace(/\s+$/, '')) && line.endsWith(f.after))
  assert.ok(used, 'one of the frames was used, whole')
  const expected = `${used.before} ${c.echo.fragment}${used.after}`.replace(/\s+/g, ' ').trim()
  assert.equal(sha(line), sha(expected))
  assert.equal(line.length, used.before.length + 1 + c.echo.fragment.length + used.after.length)
  // the same night picks the same frame every time
  assert.equal(sha(echoLines(c, FRAMES, { seed: 'n1' })[0]), sha(line))
})

test('with no frames the default frame is used; with no fragment the bracketed stand-in fills it', () => {
  const c = fixtureCase()
  const [line] = echoLines(c, [], { seed: 'x' })
  assert.ok(line.startsWith(DEFAULT_FRAME.before))
  assert.ok(line.endsWith(DEFAULT_FRAME.after.trim()))
  assert.equal(line.length, DEFAULT_FRAME.before.length + 1 + c.echo.fragment.length + DEFAULT_FRAME.after.length)
  const [stand] = echoLines({ rehearsal: true }, FRAMES, { seed: 'x' })
  assert.ok(stand.includes(REHEARSAL_FRAGMENT))
  // a frame given as before/after (the workshop's codec) parses too, and a line with no gap is skipped
  assert.deepEqual(parseFrame({ before: 'a', after: 'b' }), { before: 'a', after: 'b' })
  assert.equal(parseFrame({ text: 'no gap here' }), null)
  assert.equal(frameList([{ text: 'no gap' }, { text: 'x ███ y' }]).length, 1)
})

// ---------------------------------------------------------------------------
// The bulletin and Sir Irwin, by the dial's band

test('the band follows the trace ladder exactly, and the strike count is 0, 1 or 2 by band', () => {
  for (let d = -20; d <= 20; d++) assert.equal(dialBand(d), traceLevel(d), `dial ${d}`)
  assert.equal(strikeCount(0), 1)
  assert.equal(strikeCount(-8), 0)
  assert.equal(strikeCount(-4), 0)
  assert.equal(strikeCount(8), 2)
  assert.equal(strikeCount(4), 2)
  assert.equal(irwinTier(-8), 0); assert.equal(irwinTier(0), 1); assert.equal(irwinTier(8), 2)
})

test('the bulletin strikes 1 motive at dial 0, 0 at strong negative, 2 at strong positive, never the active one, and the same ones on a re-run', () => {
  for (const [dial, count] of [[0, 1], [-9, 0], [9, 2]]) {
    for (let trial = 0; trial < 30; trial++) {
      const c = fixtureCase({ dial, motive: MOTIVES[trial % MOTIVES.length].n })
      const struck = struckMotives(c, { seed: `night-${trial}` })
      assert.equal(struck.length, count, `dial ${dial}`)
      for (const s of struck) {
        assert.notEqual(s.n, c.motive, 'the active motive is never struck')
        assert.equal(MOTIVES.find(m => m.n === s.n)?.rhyme, s.rhyme)
      }
      assert.deepEqual(struckMotives(c, { seed: `night-${trial}` }), struck, 'seeded on the night')
    }
  }
  const c = fixtureCase({ dial: 9, motive: 3 })
  const { lines, struck } = bulletinLines(c, FRAMES, { seed: 's' })
  assert.equal(lines.length, 3)
  assert.equal(struck.length, 2)
  assert.ok(lines[1].includes(`number ${struck[0].n}`))
  assert.ok(lines[2].includes(struck[1].rhyme))
  assert.ok(!lines.join(' ').includes('███'))
})

test('Irwin: opener, one sealed line by band, closer; at most twelve words; no roster or character name; rehearsal stand-ins', () => {
  const roster = { jon: { name: 'Jon', characterId: 'x' }, jessa: { name: 'Jessa', characterId: 'y' } }
  const names = castNames(roster)
  assert.ok(names.includes('Jon') && names.includes('Jessa'))
  for (const ch of CHARACTERS) assert.ok(names.includes(ch.name))
  const long = `${CHARACTERS[0].name} and Jessa saw ${CHARACTERS[1].name.split(' ').pop()} walk the long corridor past the clock and out`
  const filtered = dogFilter(long, names)
  assert.ok(filtered.split(' ').length <= 12)
  for (const n of names) for (const part of n.split(' ')) if (part.length >= 3) assert.ok(!new RegExp(`\\b${part}\\b`, 'i').test(filtered), `${part} is gone`)
  assert.ok(filtered.endsWith('.'))
  assert.equal(dogFilter('A short line.', names), 'A short line.')
  // the index follows the band
  const c = fixtureCase({ dial: 0 })
  const mid = irwinLines(c, { names })
  assert.equal(mid.length, 3)
  assert.equal(mid[0], DEFAULT_IRWIN.opener)
  assert.equal(mid[2], DEFAULT_IRWIN.closer)
  assert.equal(sha(mid[1]), sha(c.irwin.lines[1]))
  const low = fixtureCase({ dial: -8 }); assert.equal(sha(irwinLines(low, {})[1]), sha(low.irwin.lines[0]))
  const high = fixtureCase({ dial: 8 }); assert.equal(sha(irwinLines(high, {})[1]), sha(high.irwin.lines[2]))
  // every line stays within form whatever the case holds
  const wordy = fixtureCase(); wordy.irwin.lines[1] = `${'word '.repeat(30)}Jon.`
  for (const l of irwinLines(wordy, { names })) { assert.ok(l.split(' ').length <= 12); assert.ok(!/\bJon\b/.test(l)) }
  // workshop opener and closer win; no lines at all gets the stand-in
  const v = irwinLines(c, { opener: 'Hello.', closer: 'Bye.', names })
  assert.equal(v[0], 'Hello.'); assert.equal(v[2], 'Bye.')
  assert.ok(irwinLines({ rehearsal: true }, {})[1].startsWith('(Rehearsal'))
})

// ---------------------------------------------------------------------------
// The doc, the check, the sound writer

test('checkScreen refuses a forbidden key at any depth and an unknown kind; writeScreen will not write one', async () => {
  const db = new FakeFirestore()
  assert.ok(checkScreen(screenDoc('idle', { title: 'x' })).ok)
  for (const k of FORBIDDEN_SCREEN_KEYS) {
    const bad = checkScreen({ ...screenDoc('news'), captions: { [k]: 1 } })
    assert.equal(bad.ok, false, k)
    assert.ok(bad.bad.some(b => b.endsWith(`.${k}`)))
  }
  assert.equal(checkScreen({ kind: 'secret' }).ok, false)
  await assert.rejects(writeScreen(db, 'n', { ...screenDoc('news'), motive: 4 }), /must not/)
  assert.equal(await readScreen(db, 'n'), null)
  await writeScreen(db, 'n', screenDoc('news', { lines: ['a'] }))
  assert.equal((await readScreen(db, 'n')).kind, 'news')
  assert.ok(SCREEN_KINDS.includes('board') && SCREEN_KINDS.includes('black'))
})

test('play writes one sound at a time and refuses an id outside the catalogue', async () => {
  const db = new FakeFirestore()
  await play(db, 'n', 'chime-news', { now: 5 })
  assert.deepEqual(await currentSound(db, 'n'), { id: 'chime-news', at: new Date(5) })
  await play(db, 'n', 'power', { now: 6 })
  assert.equal((await currentSound(db, 'n')).id, 'power')
  await assert.rejects(play(db, 'n', '7F3A'), /No such sound/)
  await assert.rejects(play(db, 'n', ''), /No such sound/)
  assert.equal(SOUND_IDS.length, 9)
  assert.equal(new Set(SOUND_IDS).size, 9)
})

test('relayRules: three lines from the workshop line or the defaults; labelled reads LABEL: text', () => {
  assert.deepEqual(relayRules(''), DEFAULT_RELAY_RULES)
  assert.deepEqual(relayRules('One. | Two. | Three. | Four.'), ['One.', 'Two.', 'Three.'])
  assert.deepEqual(relayRules('Draw blind. Shout. Vote.'), ['Draw blind.', 'Shout.', 'Vote.'])
  assert.deepEqual(labelled([{ text: 'RELAY RULES: a | b | c' }, { text: 'lower: no' }]), { 'RELAY RULES': 'a | b | c' })
})

test('the seed names a screen and a sound only from the catalogues', () => {
  for (const act of [1, 2, 3, 4, 5, 6, 7]) for (const b of beatsOf(act)) {
    if (b.screen) assert.ok(SCREEN_KINDS.includes(b.screen), `${act}/${b.key} screen`)
    if (b.sound) assert.ok(SOUND_IDS.includes(b.sound), `${act}/${b.key} sound`)
  }
  assert.equal(beatSpec(2, 'news').screen, 'news')
  assert.equal(beatSpec(3, 'bulletin').screen, 'bulletin')
  assert.equal(beatSpec(5, 'irwin').screen, 'irwin')
  assert.equal(beatSpec(6, 'door').screen, 'door')
  assert.equal(beatSpec(6, 'eliminate').screen, 'board')
  assert.equal(beatSpec(6, 'door').soundOnce, true)
})

// ---------------------------------------------------------------------------
// The whole night: every beat that says "look at the screen" has one, every
// sound in the catalogue is written once, and no screen doc ever carries a
// forbidden field. The fake-players' public-doc tokens are checked too.

const NEVER_PUBLIC = ['"roles"', '"dialSign"', '"dialMap"', '"dial"', '"dialLog"', '"kernels"', '"documents"', '"hiddenSets"', '"studyClue"', '"echo"', '"salemTruthIndex"', '"granoliaSlot"', '"variant"', '"murderer"', '"ghost"', '"victim"', '"motive"', '"fragment"']

async function party() {
  const db = new FakeFirestore()
  db.store.set('meta/game', { host_jonathan: 'Jon', host_susan: 'Susan' })
  db.store.set('safe_content/echo_frames', { items: FRAMES.map((f, i) => ({ id: `f${i}`, text: f.text, order: i })) })
  db.store.set('safe_content/openers', { items: [{ id: 'o1', cat: 'irwin', text: 'Oh! You are all here.', order: 0 }] })
  const { nightId } = await createNight(db)
  const phones = { jon: 'uid-jon', jessa: 'uid-jessa', jacob: 'uid-jacob', marie: 'uid-marie' }
  for (const [name, uid] of Object.entries(phones)) await join(db, { uid, nightId, name: name[0].toUpperCase() + name.slice(1) })
  return { db, nightId, phones }
}

test('the night walk: news at 2/news, bulletin at 3/bulletin, irwin at 5/irwin, door at 6/door, board at 6/eliminate, black on blackout and pause; every sound once; nothing forbidden', async () => {
  const { db, nightId, phones } = await party()
  const uids = Object.values(phones)
  const sounds = new Set()
  const seen = []
  let now = 1_000_000
  const screen = () => db.store.get(`nights/${nightId}/public/screen`)
  const nightDoc = () => db.store.get(`nights/${nightId}`)
  // after every step: note the sound, and check the screen doc is clean
  const step = async (fn) => {
    const r = await fn()
    const s = db.store.get(`nights/${nightId}/public/sounds`)?.current
    if (s?.id) sounds.add(s.id)
    const doc = screen()
    if (doc) {
      const check = checkScreen(doc)
      assert.ok(check.ok, `screen doc clean at ${nightDoc().act}/${nightDoc().beat}: ${check.bad.length} bad`)
      const text = JSON.stringify(doc)
      for (const t of NEVER_PUBLIC) assert.ok(!text.includes(t), `screen carries no ${t} at ${nightDoc().act}/${nightDoc().beat}`)
      seen.push(`${nightDoc().act}/${nightDoc().beat}:${doc.kind}`)
    }
    return r
  }
  const host = (command, arg) => step(() => hostCommand(db, { nightId, command, arg, now }))
  const next = () => host('next')

  // Act 1: idle screens named after the act, then the blackout goes black with its sound
  await next()
  assert.equal(screen().kind, 'idle')
  assert.equal(screen().title, 'The Invitation')
  await next(); await next(); await next()
  await host('blackout')
  assert.equal(screen().kind, 'black')
  assert.equal(sounds.has('blackout'), true)
  await host('power')
  assert.equal(screen().kind, 'black', 'dark through the prompt')
  assert.equal((await currentSound(db, nightId)).id, 'power')

  // Act 2: the news on the screen, with the frame filled; the echo and the fragment never as keys
  await next() // news
  const news = screen()
  assert.equal(news.kind, 'news')
  assert.equal(news.lines.length, 1)
  assert.ok(!news.lines[0].includes('███'))
  assert.ok(news.lines[0].includes('(Rehearsal'), 'a rehearsal night shows the bracketed stand-in')
  assert.equal(news.rehearsal, true)
  assert.deepEqual(news.captions.lines, news.lines)
  assert.equal((await currentSound(db, nightId)).id, 'chime-news')
  await next() // cat: the TV goes idle, the captions ride along for the iPad
  assert.equal(screen().kind, 'idle')
  assert.deepEqual(screen().captions.lines, news.lines)
  // a pause parks the screen under a near-black "One moment"; the resume brings it back
  await host('pause')
  assert.equal(screen().kind, 'black')
  assert.equal(screen().title, 'One moment')
  now += 30_000
  await host('resume')
  assert.equal(screen().kind, 'idle')
  assert.equal(screen().parked, null)
  await next() // puzzle
  await next() // questions
  now += 61_000
  await next() // checkin

  // Act 3: the bulletin as captions, with the strike lines (one at dial 0), never the active motive
  await next() // down
  await next() // bulletin
  const bulletin = screen()
  assert.equal(bulletin.kind, 'bulletin')
  const c = db.store.get(`cases/${nightId}`)
  assert.equal(bulletin.struck.length, strikeCount(c.dial))
  for (const s of bulletin.struck) assert.notEqual(s.n, c.motive)
  assert.equal(bulletin.lines.length, 1 + bulletin.struck.length)
  assert.equal((await currentSound(db, nightId)).id, 'sounder-bulletin')
  await next() // groups
  assert.deepEqual(screen().captions.lines, bulletin.lines, 'captions stay up through dinner')

  // Act 4: the captions drop; the study solving rings the sting
  const heartbeat = () => stationCommand(db, { nightId, station: 'study', command: 'state', payload: { state: 'idle' } })
  await heartbeat()
  await next() // station1
  assert.equal(screen().kind, 'idle')
  assert.equal(screen().captions, null)
  let guard = 0
  while (guard++ < 40) {
    const n = nightDoc()
    if (n.act !== 4) break
    if (n.window && !n.window.settled) { now = ms(n.window.closesAt) + 1000; await host('settle'); if (beatSpec(4, n.beat)?.action !== 'rotate') await next(); continue }
    if (beatSpec(4, n.beat)?.action !== 'rotate') { await next(); continue }
    await heartbeat()
    const due = db.store.get(studyPath(nightId))?.groupId ?? null
    const rot = db.store.get(rotationPath(nightId)) ?? {}
    if (due && !rot.finished?.[due]) {
      const r = await step(() => studyFinished(db, { nightId, payload: { groupId: due, outcome: 'solved', seconds: 300, pairs: 3 }, now }))
      if (r.rotated) continue
    }
    await next()
  }
  assert.equal(nightDoc().act, 5)
  assert.ok(sounds.has('sting-solved'))

  // Act 5: Sir Irwin, the workshop opener, three short lines, no names
  await next() // irwin
  const irwin = screen()
  assert.equal(irwin.kind, 'irwin')
  assert.equal(irwin.lines.length, 3)
  assert.equal(irwin.lines[0], 'Oh! You are all here.')
  const names = castNames(nightDoc().roster)
  for (const l of irwin.lines) {
    assert.ok(l.split(' ').length <= 12)
    for (const n of names) assert.ok(!new RegExp(`\\b${n.split(' ').pop()}\\b`).test(l))
  }
  assert.equal((await currentSound(db, nightId)).id, 'chime-irwin')

  // Act 6: the drawing (the kiosk shows the relay itself), the door sting from the relay, the door, the board
  await next() // merged
  now += 61_000
  await host('settle')
  await next() // the drawing starts
  const { pub, priv } = relayPaths(nightId)
  for (let g = 1; g <= 3; g++) {
    let p = db.store.get(pub)
    while (p.state !== 'vote') {
      now += Math.max(WALK_MS, PULL_MS, TURN_MS) + 1
      await step(() => advanceRelay(db, { nightId, now }))
      p = db.store.get(pub)
    }
    const answer = db.store.get(priv).grids[g - 1].answer
    for (const uid of uids) await vote(db, { nightId, uid, pick: answer })
    now += VOTE_MS + 1
    await step(() => advanceRelay(db, { nightId, now }))
  }
  assert.equal(db.store.get(pub).state, 'done')
  assert.equal((await currentSound(db, nightId)).id, 'sting-door')
  const stingAt = (await currentSound(db, nightId)).at
  await next() // the door: the sting is not played twice
  assert.equal(screen().kind, 'door')
  assert.equal(screen().holdMs, 10_000)
  assert.deepEqual((await currentSound(db, nightId)).at, stingAt, 'soundOnce: the relay already played the door sting')
  await host('tv-trace')
  assert.equal(db.store.get(`nights/${nightId}/public/cues`).tvTrace, true)
  await host('tv-trace', 'off')
  assert.equal(db.store.get(`nights/${nightId}/public/cues`).tvTrace, false)
  await next() // eliminate
  assert.equal(screen().kind, 'board')
  for (const uid of uids) await player.eliminate(db, { nightId, uid, target: { kind: 'motive', n: 2 }, now })
  now += 91_000
  await host('settle')

  // Act 7: the board stays through the ballot; the reveal and the result each have a sting
  await next() // ballot
  assert.equal(screen().kind, 'board')
  now += 121_000
  await host('settle')
  await next() // reveal
  assert.equal((await currentSound(db, nightId)).id, 'sting-reveal')
  // the screen names one at a time on the host's press (I, 18 Oct): the result waits for all three
  for (let i = 0; i < 3; i++) { now += 1000; await host('reveal-stage') }
  await next() // result
  assert.equal((await currentSound(db, nightId)).id, 'sting-result')

  // every sound in the catalogue was written at least once, and none outside it
  for (const id of SOUND_IDS) assert.ok(sounds.has(id), `sound ${id} was played`)
  for (const id of sounds) assert.ok(SOUND_IDS.includes(id), `${id} is in the catalogue`)
  // the kinds the acceptance line names
  for (const k of ['2/news:news', '3/bulletin:bulletin', '5/irwin:irwin', '6/door:door', '6/eliminate:board']) assert.ok(seen.includes(k), k)
  // and the night doc itself never grew a screen field
  assert.equal(nightDoc().screen, undefined)
})

test('onBeat with Back writes the screen but plays nothing; onPhase on an unknown command is a no-op', async () => {
  const { db, nightId } = await party()
  await onBeat(db, nightId, { act: 2, beat: 'news', spec: beatSpec(2, 'news'), now: 10, run: false })
  assert.equal((await readScreen(db, nightId)).kind, 'news')
  assert.equal(await currentSound(db, nightId), null)
  await onBeat(db, nightId, { act: 2, beat: 'news', spec: beatSpec(2, 'news'), now: 11 })
  assert.equal((await currentSound(db, nightId)).id, 'chime-news')
  assert.deepEqual(await onPhase(db, nightId, 'handover'), { ok: true })
  // resume with nothing parked leaves the screen alone
  await onPhase(db, nightId, 'resume')
  assert.equal((await readScreen(db, nightId)).kind, 'news')
  await tvTrace(db, nightId, true, { now: 12 })
  assert.equal(db.store.get(`nights/${nightId}/public/cues`).tvTrace, true)
})

test('the cue relay carries the same catalogue', () => {
  const src = readFileSync(new URL('../../cues/lib/cues.js', import.meta.url), 'utf8')
  for (const id of SOUND_IDS) assert.ok(src.includes(`'${id}'`), `cues.js lists ${id}`)
})
