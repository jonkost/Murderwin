import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createHash, randomInt } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { FakeFirestore } from './fake-firestore.mjs'
import { createNight, join, MOTIVES, CHARACTERS } from '../lib/night.js'
import { hostCommand, studyFinished, advanceRelay, guessRelay, player } from '../lib/run.js'
import { beatsOf, beatSpec, traceLevel, ms, NIGHT } from '../lib/deal.js'
import { relayPaths, vote, advance, VOTE_MS, WALK_MS, TURN_MS, PULL_MS } from '../lib/relay.js'
import { stationCommand, studyPath, rotationPath } from '../lib/station.js'
import {
  SOUND_IDS, SCREEN_KINDS, FORBIDDEN_SCREEN_KEYS, DEFAULT_FRAME, DEFAULT_IRWIN, REHEARSAL_FRAGMENT, DEFAULT_RELAY_RULES, NEWS_FLASH_PLACEHOLDER,
  echoLines, dialBand, irwinLines, dogFilter, castNames, parseFrame, frameList,
  checkScreen, screenDoc, writeScreen, readScreen, play, currentSound, soundsPath, onBeat, onPhase, tvTrace, relayRules, labelled,
  screenSeed, doorReached, isPauseCard, IRWIN_OPTION_LINES,
} from '../lib/screen.js'
import { rehearsalCase, buildCase, screenSalt } from '../lib/case.js'
import { NEWS, CLIP_IDS, clipCode } from '../lib/news.js'

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
// The dial's band, the salt the screens seed on, and Sir Irwin

test('the band follows the trace ladder exactly', () => {
  for (let d = -20; d <= 20; d++) assert.equal(dialBand(d), traceLevel(d), `dial ${d}`)
})

test('the screens seed on the case\'s secret salt, never the public night id', () => {
  // every case carries a salt from its own rng, 32 hex characters, different case to case
  const a = rehearsalCase({ nightId: 'n1', roster: [{ key: 'g1' }, { key: 'g2' }, { key: 'g3' }] })
  const b = rehearsalCase({ nightId: 'n1', roster: [{ key: 'g1' }, { key: 'g2' }, { key: 'g3' }] })
  assert.match(a.screenSalt, /^[0-9a-f]{32}$/)
  assert.notEqual(a.screenSalt, b.screenSalt)
  assert.equal(screenSalt(() => 0), '0'.repeat(32))
  assert.equal(screenSeed(a, 'n1'), a.screenSalt, 'the screens seed on the salt')
  assert.equal(screenSeed({}, 'n1'), 'n1', 'a case from before the salt falls back to the night id')
  assert.ok(FORBIDDEN_SCREEN_KEYS.includes('screenSalt'), 'a public doc may never carry it')
})

test('Irwin: his opener, the countdown line, his closer, and nothing sealed; at most twelve words; no roster or character name', () => {
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
  // the defaults, then the countdown line kept whole before the closer
  assert.deepEqual(irwinLines({ names }), [DEFAULT_IRWIN.opener, DEFAULT_IRWIN.closer])
  const count = irwinLines({ names, optionLine: IRWIN_OPTION_LINES[5] })
  assert.deepEqual(count, [DEFAULT_IRWIN.opener, IRWIN_OPTION_LINES[5], DEFAULT_IRWIN.closer])
  // the workshop opener and closer win, and stay within form
  assert.deepEqual(irwinLines({ opener: 'Hello.', closer: 'Bye.', names }), ['Hello.', 'Bye.'])
  for (const l of irwinLines({ opener: `${'word '.repeat(30)}Jon.`, closer: 'Bye Jessa.', names })) { assert.ok(l.split(' ').length <= 12); assert.ok(!/\b(Jon|Jessa)\b/.test(l)) }
  // the case is not an input any more: the old sealed lines can never reach the screen
  assert.equal(irwinLines.length, 0, 'irwinLines takes only the voice, the names and the countdown line')
  const src = readFileSync(new URL('../lib/screen.js', import.meta.url), 'utf8')
  assert.ok(!/irwin\?*\.lines/.test(src), 'screen.js never reads the case\'s irwin lines')
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

test('the recordings go out as codes once a station key is saved: no public doc names a family or a level; none saved, the names go as they are', async () => {
  const db = new FakeFirestore()
  const clips = ['bulletin2-opening', 'bulletin2-food-3', 'bulletin2-signoff']
  await play(db, 'n', 'sounder-bulletin', { now: 5, clips })
  assert.deepEqual((await currentSound(db, 'n')).clips, clips, 'a rehearsal with no key: the names, as before')
  db.store.set('meta/game', { station_key: ' study-2026 ' })
  await play(db, 'n', 'sounder-bulletin', { now: 6, clips })
  const sent = (await currentSound(db, 'n')).clips
  assert.deepEqual(sent, clips.map(c => clipCode('study-2026', c)), 'the key is trimmed the way the station check trims it')
  for (const code of sent) assert.match(code, /^[0-9a-f]{16}$/)
  const text = JSON.stringify(db.store.get(soundsPath('n')))
  for (const id of CLIP_IDS) assert.ok(!text.includes(id), 'no clip id on the public doc')
  for (const f of ['food', 'bathroom', 'screens', 'out', 'personal']) assert.ok(!text.includes(f), 'no family on the public doc')
  // the codes depend on the key, so a phone with only the public doc cannot work them back
  assert.notDeepEqual(clips.map(c => clipCode('another-key', c)), sent)
  assert.equal(new Set(CLIP_IDS.map(c => clipCode('study-2026', c))).size, CLIP_IDS.length, 'every recording its own code')
  // a sound with no clips is not coded: the generic sound ids say nothing
  await play(db, 'n', 'chime-news', { now: 7 })
  assert.deepEqual(await currentSound(db, 'n'), { id: 'chime-news', at: new Date(7) })
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
  assert.equal(beatSpec(3, 'bulletin').action, 'arm:bulletin', 'bulletin 2 is armed, then plays itself')
  assert.equal(beatSpec(5, 'irwin').screen, 'irwin')
  assert.equal(beatSpec(6, 'door').screen, 'door')
  assert.equal(beatSpec(6, 'eliminate').screen, 'board')
  assert.equal(beatSpec(6, 'door').soundOnce, true)
})

// ---------------------------------------------------------------------------
// The whole night: every beat that says "look at the screen" has one, every
// sound in the catalogue is written once, and no screen doc ever carries a
// forbidden field. The fake-players' public-doc tokens are checked too.

const NEVER_PUBLIC = ['"roles"', '"dialSign"', '"dialMap"', '"dial"', '"dialLog"', '"kernels"', '"documents"', '"parlourPlan"', '"leans"', '"listeners"', '"studyClue"', '"echo"', '"salemTruthIndex"', '"granoliaSlot"', '"variant"', '"murderer"', '"ghost"', '"victim"', '"motive"', '"fragment"', '"screenSalt"']

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

  // Act 2: W-O-O-F News bulletin 1: the opening, the line for the one family crossed off, the sign-off
  await next() // news
  const news = screen()
  assert.equal(news.kind, 'news')
  const c2 = db.store.get(`cases/${nightId}`)
  assert.deepEqual(news.lines, [NEWS.bulletin1.opening.text, NEWS.bulletin1.families[c2.solving.newsOut[0]].text, NEWS.bulletin1.signoff.text])
  assert.notEqual(c2.solving.newsOut[0], c2.solving.family, 'never the real family')
  assert.equal(news.rehearsal, true)
  assert.deepEqual(news.captions.lines, news.lines)
  const newsSound = await currentSound(db, nightId)
  assert.equal(newsSound.id, 'chime-news')
  assert.deepEqual(newsSound.clips, ['newsflash-opening', NEWS.bulletin1.families[c2.solving.newsOut[0]].clip, 'newsflash-signoff'])
  await next() // cat: the TV goes idle, the captions ride along for the iPad
  assert.equal(screen().kind, 'idle')
  assert.deepEqual(screen().captions.lines, news.lines)
  // a pause parks the screen under a near-black "One moment"; a second press (a double tap, a second
  // host phone) changes nothing; the resume brings the parked screen back
  await host('pause')
  assert.equal(screen().kind, 'black')
  assert.equal(screen().title, 'One moment')
  assert.equal(screen().parked.kind, 'idle')
  assert.equal((await host('pause')).already, true)
  assert.equal(screen().parked.kind, 'idle', 'the second press did not park the card over itself')
  assert.equal(await onPhase(db, nightId, 'pause', { now }).then(r => r.already), true, 'and the screen hook alone refuses too')
  now += 30_000
  await host('resume')
  assert.equal(screen().kind, 'idle', 'the TV is back on the beat, not on One moment')
  assert.equal(screen().parked, null)
  assert.ok(!JSON.stringify(screen()).includes(db.store.get(`cases/${nightId}`).screenSalt), 'the salt never reaches the screen')
  await next() // puzzle
  await next() // checkin

  // Act 3: bulletin 2. Next arms it (the Host tab hears only Armed); it plays itself 3 to 5
  // minutes later on the tick: the real family's line at the dial's level, as captions
  await next() // down
  const armed = await host('next') // arm
  assert.equal(armed.armed, true)
  assert.deepEqual(Object.keys(armed).filter(k => !['ok', 'act', 'beat', 'armed'].includes(k)), [], 'the arm says nothing else')
  assert.notEqual(screen().kind, 'bulletin', 'nothing plays at the arm')
  const sched = db.store.get(`nights/${nightId}/private/bulletin`)
  const wait = ms(sched.dueAt) - now
  assert.ok(wait >= 3 * 60_000 && wait <= 5 * 60_000, 'three to five minutes')
  await host('tick')
  assert.notEqual(screen().kind, 'bulletin', 'not early')
  now = ms(sched.dueAt)
  await host('tick')
  const bulletin = screen()
  assert.equal(bulletin.kind, 'bulletin')
  const c = db.store.get(`cases/${nightId}`)
  const level = Math.min(5, Math.max(1, 3 + Math.sign(c.dial) * Math.round(Math.abs(c.dial) / 4)))
  assert.deepEqual(bulletin.lines, [NEWS.bulletin2.opening.text, NEWS.bulletin2.families[c.solving.family][level - 1].text, NEWS.bulletin2.signoff.text], 'the real family, at the dial')
  assert.equal((await currentSound(db, nightId)).id, 'sounder-bulletin')
  assert.equal((await currentSound(db, nightId)).clips.length, 3)
  for (const uid of Object.values(db.store.get(`nights/${nightId}/private/deck`).uids)) assert.ok(db.store.get(`sessions/${uid}`).cards.some(x => x.key === 'bulletin'), 'every phone hears about it')
  await host('tick')
  assert.equal(db.store.get(`nights/${nightId}/private/bulletin`).played, true, 'once')
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

  // Act 5: Sir Irwin, the workshop opener, how sure he is of the motive, the closer; no sealed line, no names
  await next() // irwin
  const irwin = screen()
  assert.equal(irwin.kind, 'irwin')
  assert.equal(irwin.lines.length, 3, 'opener, countdown line, closer: nothing in between')
  assert.equal(irwin.lines[0], 'Oh! You are all here.')
  assert.ok(Object.values(IRWIN_OPTION_LINES).includes(irwin.lines[1]), 'the countdown line straight after the opener')
  const caseLines = db.store.get(`cases/${nightId}`)?.irwin?.lines ?? []
  for (const l of caseLines) assert.ok(!irwin.lines.includes(l) && !irwin.captions.lines.includes(l), 'the case\'s old Irwin lines never reach the screen')
  assert.ok([1, 2, 3, 4, 5].includes(irwin.choices.length), 'one to five motive cards')
  assert.ok(irwin.mood >= 1 && irwin.mood <= 5, 'one of his five moods')
  const names = castNames(nightDoc().roster)
  for (const l of irwin.lines) {
    if (!Object.values(IRWIN_OPTION_LINES).includes(l)) assert.ok(l.split(' ').length <= 12, 'his own lines stay short; the countdown line is kept whole')
    for (const n of names) assert.ok(!new RegExp(`\\b${n.split(' ').pop()}\\b`).test(l))
  }
  assert.equal((await currentSound(db, nightId)).id, 'chime-irwin')

  // Act 6: the drawing (the kiosk shows the relay itself), the door sting from the relay, the door, the board
  await next() // Act 6 opens on its two Parlour Games
  now += NIGHT.windows.questions.ms + 1
  await next() // the drawing
  const { pub, priv } = relayPaths(nightId)
  for (let g = 1; g <= 4; g++) {
    let p = db.store.get(pub)
    while (p.state !== 'vote') {
      now += Math.max(WALK_MS, PULL_MS, TURN_MS) + 1
      await step(() => advanceRelay(db, { nightId, now }))
      p = db.store.get(pub)
    }
    const answer = db.store.get(priv).grids[g - 1].answer
    now += 1000
    await step(() => guessRelay(db, { nightId, pick: answer, now }))
  }
  assert.equal(db.store.get(pub).state, 'done')
  assert.equal((await currentSound(db, nightId)).id, 'sting-door')
  const stingAt = (await currentSound(db, nightId)).at
  // the trace cannot go on the TV before the door beat, even with the drawing done
  await assert.rejects(host('tv-trace'), /once the door is open/)
  assert.equal(db.store.get(`nights/${nightId}/public/cues`)?.tvTrace, undefined)
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
  // resume with nothing parked and no pause card leaves the screen alone
  await onPhase(db, nightId, 'resume')
  assert.equal((await readScreen(db, nightId)).kind, 'news')
  // the trace on the TV: refused before the door beat, on from the door beat, off at any time
  await assert.rejects(tvTrace(db, nightId, true, { now: 12 }), /once the door is open/)
  assert.equal(db.store.get(`nights/${nightId}/public/cues`)?.tvTrace, undefined)
  await tvTrace(db, nightId, false, { now: 12 })
  assert.equal(db.store.get(`nights/${nightId}/public/cues`).tvTrace, false)
  await db.doc(`nights/${nightId}`).update({ act: 6, beat: 'door' })
  await tvTrace(db, nightId, true, { now: 13 })
  assert.equal(db.store.get(`nights/${nightId}/public/cues`).tvTrace, true)
  assert.equal(doorReached({ act: 6, beat: 'drawing' }), false)
  assert.equal(doorReached({ act: 6, beat: 'door' }), true)
  assert.equal(doorReached({ act: 6, beat: 'eliminate' }), true)
  assert.equal(doorReached({ act: 7, beat: 'ballot' }), true)
  assert.equal(doorReached({ act: 5, beat: 'irwin' }), false)
  assert.equal(doorReached(null), false)
})

test('a pause before any screen, then a resume, leaves the beat\'s screen up and not One moment; a pause in the dark stays dark', async () => {
  const { db, nightId } = await party()
  let now = 2_000_000
  const host = (command, arg) => hostCommand(db, { nightId, command, arg, now })
  const screen = () => db.store.get(`nights/${nightId}/public/screen`)
  assert.equal(screen(), undefined, 'no screen doc yet')
  await host('pause')
  assert.equal(screen().title, 'One moment')
  assert.equal(screen().parked, undefined)
  assert.ok(isPauseCard(screen()))
  now += 5_000
  await host('resume')
  assert.equal(screen().kind, 'idle', 'nothing was parked: the beat\'s idle screen, not One moment')
  assert.equal(screen().title, 'Sirwin Manor')
  assert.ok(!isPauseCard(screen()))
  // into Act 1, blackout, then a pause and a resume in the dark: the TV stays dark throughout
  await host('next'); await host('next'); await host('next'); await host('next')
  await host('blackout')
  assert.equal(screen().kind, 'black'); assert.equal(screen().title, '')
  await host('pause')
  assert.equal(screen().title, 'One moment')
  assert.equal(screen().parked.kind, 'black')
  await host('resume')
  assert.equal(screen().kind, 'black'); assert.equal(screen().title, '', 'dark again, not One moment')
  assert.equal(db.store.get(`nights/${nightId}`).phase, 'blackout')
})

test('the cue relay carries the same catalogue', () => {
  const src = readFileSync(new URL('../../cues/lib/cues.js', import.meta.url), 'utf8')
  for (const id of SOUND_IDS) assert.ok(src.includes(`'${id}'`), `cues.js lists ${id}`)
})
