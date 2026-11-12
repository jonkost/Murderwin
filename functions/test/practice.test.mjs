import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { FakeFirestore } from './fake-firestore.mjs'
import { walkLights } from './lights-walk.mjs'
import { join, MOTIVES, CHARACTERS } from '../lib/night.js'
import { hostCommand, player, studyFinished, advanceRelay, guessRelay } from '../lib/run.js'
import { beatsOf, ms } from '../lib/deal.js'
import { ROOMS, ROOM_KEYS, groupIn } from '../lib/act4.js'
import { studyPath, rotationPath } from '../lib/station.js'
import { relayPaths } from '../lib/relay.js'
import { hintLine as catHintLine } from '../lib/cats.js'
import { hintsOf, familyForCat, irwinOptions, irwinCount } from '../lib/families.js'
import { stopOf } from '../lib/parlour.js'
import { NEWS } from '../lib/news.js'
import { dialBand } from '../lib/screen.js'
import { bagPlan, bagLine, wordBags } from '../lib/bagclues.js'
import { packingFor } from '../lib/bags.js'

// A practice night plays for real (docs/handoff-2026-11-11-polish.md, job A3;
// Jon: "I want actual clues. I want actual hints, I want actual reveals. I
// don't want the insert text."). Done when: a whole practice night holds no
// square bracket in any card, notice or screen document, and nothing under
// sealed/ is read.
//
// THE SEAL IN THIS FILE. The case is the practice night's own throwaway,
// dealt in the fake Firestore and dropped with it. It is read here, in
// process, to check that what the phones and the room screens were given is
// what the case says. Nothing is printed: every check is a true or a false,
// and a failure's message carries counts and lengths, never a line, a name or
// a motive.

const T0 = Date.parse('2026-11-12T20:00:00Z') // the practice night, before the party day
// the practice night's eight seats: Jon, Susan under another name, six more
const SEATS = ['Jon', 'Sue', 'Mabel', 'Gus', 'Dot', 'Walt', 'Pearl', 'Otis']

// Throwaway docs at every sealed path the game knows, in brackets, so a read
// or a scan of them would register (an empty collection scans without a read).
function syntheticSecrets() {
  const words = Object.fromEntries(Array.from({ length: 10 }, (_, i) => [String(i + 1), { [`(synthetic-${i % 4})`]: ['touch'], [`(synthetic-${4 + (i % 3)})`]: ['smell'] }]))
  const properties = {}
  for (const [n, ws] of Object.entries(words)) for (const w of Object.keys(ws)) (properties[w] ??= []).push(Number(n))
  return {
    'sealed/parlour_leans': { sets: { 'rehearsal-1': { 0: { granolia: 'a', boo: 'b', zimothy: 'a', salem: 'b' } } } },
    'sealed/bags': { words, properties, packedAt: new Date(0) },
    'sealed/relay_pictures': { pictures: [] },
    'sealed/manifest': { '(synthetic)': 1 },
  }
}

// Every path under sealed/ the night touches, by any road the stand-in
// Firestore has: a read, a scan, a write, an update, a delete. Paths only.
function sealedTouches(db) {
  const touched = []
  const note = (how, path) => { if (String(path) === 'sealed' || String(path).startsWith('sealed/')) touched.push(`${how} ${path}`) }
  for (const m of ['_get', '_set', '_update', '_delete']) {
    const real = db[m].bind(db)
    db[m] = (path, ...rest) => { note(m.slice(1), path); return real(path, ...rest) }
  }
  const collection = db.collection.bind(db)
  db.collection = name => { note('scan', name); return collection(name) }
  return touched
}

// Every string a phone or a room screen of this night can read: each session,
// the night doc and the night's public docs (not public/content: the
// workshop's own lines, with blanks the phone fills in). Counts only.
function bracketCount(db, nightId) {
  let strings = 0, found = 0
  const walk = v => {
    if (typeof v === 'string') { strings++; if (/[[\]]/.test(v)) found++ }
    else if (Array.isArray(v)) v.forEach(walk)
    else if (v && typeof v === 'object' && !(v instanceof Date)) Object.values(v).forEach(walk)
  }
  for (const [path, data] of db.store) {
    if (path.startsWith('sessions/') ? data?.nightId === nightId : path === `nights/${nightId}` || (path.startsWith(`nights/${nightId}/public/`) && !path.endsWith('/public/content'))) walk(data)
  }
  return { strings, found }
}

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b)
const CLUE_WORDS = JSON.parse(readFileSync(new URL('../../seed/bag-items.json', import.meta.url), 'utf8')).words.map(w => w.word)

// Three practice nights, each dealt from its own seed word (the Game night page's Replay box), so a night
// that fails here can be walked again exactly. The fake players (scripts/) walk nights nobody chose.
for (const word of ['tulip-4471', 'heron-2024', 'otter-1215']) test(`F28 a practice night started the way Jon's phone starts it (Start the night, the real-night box unticked), walked to the bedroom door: every clue is the real thing from its own throwaway case, no note in square brackets anywhere, and nothing under sealed/ is read, scanned or written (seed ${word})`, async () => {
  const db = new FakeFirestore()
  db.store.set('meta/game', { host_jonathan: 'Jon', host_susan: 'Susan', replay_seed: word })
  const secrets = syntheticSecrets()
  for (const [path, data] of Object.entries(secrets)) db.store.set(path, data)
  const touched = sealedTouches(db) // from before the night is made

  let now = T0
  const made = await hostCommand(db, { command: 'create', arg: { real: false, introAt: T0 + 5 * 60_000 }, now })
  const nightId = made.nightId
  const nightDoc = () => db.store.get(`nights/${nightId}`)
  const caseDoc = () => db.store.get(`cases/${nightId}`)
  const session = uid => db.store.get(`sessions/${uid}`)
  const cardsOf = (uid, kind) => (session(uid).cards ?? []).filter(c => c.kind === kind)
  const screen = () => db.store.get(`nights/${nightId}/public/screen`)
  const sound = () => db.store.get(`nights/${nightId}/public/sounds`).current
  const host = (command, arg) => hostCommand(db, { nightId, command, arg, now, sleep: () => {} })
  const next = () => host('next')
  const looks = []
  const look = stage => {
    const r = bracketCount(db, nightId)
    looks.push(r.strings)
    assert.equal(r.found, 0, `no note in square brackets at ${stage} (${r.strings} strings read)`)
  }

  // ---- the night is a practice night, at Arrivals; eight seats scan in
  assert.equal(nightDoc().forceRehearsal, true)
  assert.deepEqual([nightDoc().act, nightDoc().beat], [1, 'arrive'])
  assert.equal(db.store.get(`nights/${nightId}/private/deck`).seed, word, 'dealt from the word, so it can be walked again')
  const uids = {}
  for (const name of SEATS) { const uid = `u-${name.toLowerCase()}`; await join(db, { uid, nightId, name }); uids[name.toLowerCase()] = uid }
  const roster = nightDoc().roster
  assert.deepEqual(Object.keys(roster).sort(), Object.keys(uids).sort())
  assert.ok(Object.values(roster).every(r => r.bag >= 1 && r.bag <= 10) && new Set(Object.values(roster).map(r => r.bag)).size === SEATS.length, 'every seat holds its own bag, one of the practice night\'s ten')
  const inPlay = [...new Set(Object.values(roster).map(r => Number(r.bag)))]

  // ---- Act 1 to the blackout: the case is dealt, this night's own throwaway
  while (nightDoc().beat !== beatsOf(1).at(-1).key) await next()
  await host('blackout') // the dark is not waited for here; the power returns and the roles land
  assert.equal(caseDoc().rehearsal, true)
  assert.equal(nightDoc().rehearsal, true)
  for (const uid of Object.values(uids)) assert.equal(cardsOf(uid, 'role').length, 1)

  // ---- Act 2, W-O-O-F News bulletin 1: the crossed-off family's own line, and its recording with the other two
  await next()
  assert.equal(nightDoc().beat, 'news')
  const crossed = NEWS.bulletin1.families[caseDoc().solving.newsOut[0]]
  assert.ok(screen().kind === 'news' && screen().lines.length === 3 && screen().lines[1] === crossed.text, 'bulletin 1: the family\'s own line between the opening and the sign-off')
  assert.ok(sound().clips.length === 3 && sound().clips[1] === crossed.clip, 'bulletin 1: all three recordings, the family\'s in the middle')
  look('the news')

  // ---- Act 2, the cats: every guest sees all four; each gives its real hint and its real bag clue
  await next() // the bag peek
  await next() // the cats
  const affection = Object.fromEntries(Object.entries(uids).map(([key, uid]) => [key, { ...session(uid).affection }]))
  const walked = await walkLights(db, nightId, { now })
  assert.equal(walked.meetings, 4 * SEATS.length)
  const c2 = caseDoc()
  // the packing this night's bag clues read (bags.js packingFor): its own practice packing, ten bags of the
  // items Jon bought, never the sealed one
  const packing = await packingFor(db, c2)
  assert.ok(packing && same(Object.keys(packing.words).map(Number).sort((a, b) => a - b), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]), 'the night\'s own practice packing: ten bags')
  assert.ok(!JSON.stringify(packing).includes('synthetic'), 'nothing of what sits at sealed/bags')
  const at = wordBags(packing, inPlay)
  // a word a line names is one of the fourteen clue words, in two or three of the bags in play; right means
  // it is in the bag the line is about, and only Salem ever names a wrong one
  const wordOk = (line, bag, cat) => !line.word || (CLUE_WORDS.includes(line.word) && [2, 3].includes(at[line.word]?.length ?? 0) && !!packing.words[String(bag)][line.word] === line.right && (cat === 'salem' || line.right === true))
  let hints = 0, named = 0
  for (const [key, uid] of Object.entries(uids)) {
    const fams = hintsOf(c2.solving, key)
    const all = cardsOf(uid, 'testimony')
    assert.equal(all.length, 4, 'one card from each cat')
    // the dealer's own working (deal.js greetGuest), done again here from the case
    const plan = bagPlan(packing, { bag: roster[c2.murderer].bag, inPlay, seed: `${c2.screenSalt}\u0000bag\u0000${key}` })
    for (const t of all) {
      const level = stopOf(affection[key][t.cat])
      const family = familyForCat(fams, { cat: t.cat, seed: `${c2.screenSalt}\u0000${key}` })
      const hint = catHintLine(c2, { cat: t.cat, level, act: 2, family, seed: `${c2.screenSalt}\u0000${key}\u0000${t.cat}`, bonusFamilies: [...fams, ...c2.solving.newsOut] })
      assert.ok(hint.text && t.hint.text === hint.text && t.hint.placeholder === false && !t.hint.none, `the cat's real motive hint (${t.cat}, lengths ${t.hint.text.length} and ${hint.text?.length ?? 0})`)
      const bag = bagLine(plan, { cat: t.cat, act: 2, rung: level, seed: `${c2.screenSalt}\u0000bag\u0000${key}\u0000${t.cat}` })
      assert.ok(bag.text && t.bag.text === bag.text && t.bag.placeholder === false, `the cat's real bag clue about the Murderer (${t.cat}, lengths ${t.bag.text.length} and ${bag.text?.length ?? 0})`)
      assert.ok(same(c2.bagClues.act2[key][t.cat], { rung: level, word: bag.word ?? null, sense: bag.sense ?? null, right: bag.right ?? null }), 'what the bag clue named is kept in the case')
      assert.ok(wordOk(bag, roster[c2.murderer].bag, t.cat), `a clue word of the Murderer's practice bag, or Salem's wrong one (${t.cat})`)
      assert.equal(t.placeholder, false)
      hints++
      if (bag.word) named++
    }
  }
  assert.equal(hints, 4 * SEATS.length)
  assert.ok(named >= SEATS.length, `the bag clues name clue words (${named} of ${hints}): Salem's for every guest at least`)
  look('the cats')

  // ---- Act 3, bulletin 2: the real family's own line at the dial's level, and its recording
  assert.equal(nightDoc().beat, 'supper', 'everyone has seen all four cats: supper came on its own')
  await next() // phones down
  assert.equal((await next()).armed, true) // the bulletin is armed
  now = ms(db.store.get(`nights/${nightId}/private/bulletin`).dueAt)
  await host('tick')
  const c3 = caseDoc()
  const real = NEWS.bulletin2.families[c3.solving.family][dialBand(c3.dial) - 1]
  assert.ok(screen().kind === 'bulletin' && screen().lines.length === 3 && screen().lines[1] === real.text, 'bulletin 2: the real family\'s line at the dial\'s level')
  assert.ok(sound().clips.length === 3 && sound().clips[1] === real.clip, 'bulletin 2: all three recordings, the family\'s in the middle')
  look('bulletin 2')

  // ---- Act 4: every group walks the four rooms; the arcade's first player gets Boo's line on the Mac
  await next() // the dinner wrap-up
  await host('start-act4')
  await next() // the group cards
  for (const uid of Object.values(uids)) await player.lockIn(db, { nightId, uid, now })
  assert.equal(nightDoc().beat, 'round1')
  const rot = db.store.get(rotationPath(nightId))
  let arcade = 0
  for (let guard = 0; guard < 8 && nightDoc().act === 4; guard++) {
    const round = Number(/^round(\d+)$/.exec(nightDoc().beat)?.[1] ?? 0)
    assert.ok(round >= 1)
    const gid = groupIn(rot, 'entryway', round)
    if (gid) {
      const first = rot.groups.find(g => g.id === gid).members[0].key
      await player.meetCat(db, { nightId, uid: uids[first], cat: ROOMS.entryway.cat, now })
      const r = await player.arcadeClue(db, { nightId, groupId: gid, place: 0, now })
      const card = cardsOf(uids[first], 'clue').find(x => x.room === 'entryway')
      assert.ok(r.dealt && !r.third && r.placeholder === false && typeof r.text === 'string' && r.text.length > 10 && r.text === card?.bag?.text && !/[[\]]/.test(r.text), 'the arcade: the words for the Mac\'s screen are Boo\'s real line, the same as on the player\'s phone')
      arcade++
    }
    const due = db.store.get(studyPath(nightId))?.groupId ?? null
    if (due && !db.store.get(rotationPath(nightId)).finished?.[due]) await studyFinished(db, { nightId, payload: { groupId: due, outcome: 'solved', seconds: 300, pairs: 3 }, now })
    await next() // the chime: every room not finished is paid, the groups move on
  }
  assert.equal(nightDoc().act, 5)
  assert.equal(arcade, rot.groups.length, 'every group visited the arcade')
  const c4 = caseDoc()
  const ghostTrace = CHARACTERS.find(ch => ch.id === roster[c4.ghost].characterId).trace
  for (const g of rot.groups) {
    const plan = bagPlan(packing, { bag: roster[c4.ghost].bag, inPlay, seed: `${c4.screenSalt}\u0000bag4\u0000${g.id}` })
    for (const m of g.members) {
      const mine = cardsOf(uids[m.key], 'clue')
      const rooms = mine.filter(x => x.room)
      assert.ok(same(rooms.map(x => x.room).sort(), [...ROOM_KEYS].sort()), 'all four rooms paid')
      for (const x of rooms) {
        assert.equal(x.placeholder, false)
        if (x.third) { assert.ok(x.room === 'entryway' && x.bag === undefined); continue }
        const kept = c4.bagClues.act4[g.id][x.cat]
        const want = bagLine(plan, { cat: x.cat, act: 4, rung: kept.rung, seed: `${c4.screenSalt}\u0000bag4\u0000${g.id}\u0000${x.cat}` })
        assert.ok(want.text && x.bag.text === want.text && x.bag.placeholder === false, `the room's real bag hint about the Ghost (${x.room}, lengths ${x.bag.text.length} and ${want.text?.length ?? 0})`)
        assert.ok(same([kept.word, kept.sense, kept.right], [want.word ?? null, want.sense ?? null, want.right ?? null]), 'what the bag hint named is kept in the case')
        assert.ok(wordOk(want, roster[c4.ghost].bag, x.cat), `a clue word of the Ghost's practice bag, or Salem's wrong one (${x.room})`)
        if (x.room === 'library') {
          assert.ok(x.cross === c4.solving.memory[g.id] && x.cross !== c4.motive && MOTIVES.some(mm => mm.n === x.cross), 'Zimothy crosses off a wrong motive, the one the case picked for this group')
          assert.ok(x.text.includes(`number ${x.cross}, “${MOTIVES.find(mm => mm.n === x.cross).rhyme}”`), 'and says which')
        } else assert.equal(x.cross, undefined, 'only the Library crosses a motive off')
      }
      const study = mine.find(x => x.id.endsWith('-study-clue'))
      assert.ok(study && study.placeholder === false && !study.none && study.trace?.level >= 1, 'the Study paid a trace')
      assert.ok(study.trace.level === 3 ? study.trace.images?.length === 2 && study.trace.images.includes(ghostTrace) : study.trace.trace === ghostTrace, 'the Ghost\'s trace, as a picture, at the level the dial allowed')
    }
  }
  look('Act 4')

  // ---- Act 5, Sir Irwin: his real motive cards, the real one among them
  assert.equal(nightDoc().beat, 'roam')
  await next()
  assert.equal(nightDoc().beat, 'irwin')
  const c5 = caseDoc()
  const band = dialBand(c5.dial)
  const cards5 = irwinOptions(c5, { band, seed: c5.screenSalt })
  const irwin = screen()
  assert.ok(irwin.kind === 'irwin' && irwin.mood === band && irwin.choices.length === irwinCount(band), 'five cards at dial 1 down to one at dial 5')
  assert.ok(irwin.choices.every((x, i) => x.n === cards5[i] && x.rhyme === MOTIVES.find(m => m.n === x.n)?.rhyme) && cards5.includes(c5.motive), 'the motives the case gives him, the real one among them')
  look('Sir Irwin')

  // ---- Act 6: through the Parlour Games and the drawing to the bedroom door
  await next() // update your motives
  const { pub, priv } = relayPaths(nightId)
  const drawing = () => db.store.get(pub)?.state ?? 'idle'
  for (let guard = 0; drawing() === 'idle' && guard < 12; guard++) {
    const w = nightDoc().window
    if (w && !w.settled) now = Math.max(now, ms(w.closesAt) + 1) // a window closes on its clock before Next moves on
    await next()
  }
  assert.equal(nightDoc().act, 6)
  assert.notEqual(drawing(), 'idle', 'the drawing has started')
  // the room names every picture at its first guess (the answers are this test night's own, read in process)
  for (let guard = 0; drawing() !== 'done' && guard < 400; guard++) {
    const p = db.store.get(pub)
    now += 5 * 60_000
    if (p.state === 'vote') await guessRelay(db, { nightId, pick: db.store.get(priv).grids[p.grid - 1].answer, now })
    else await advanceRelay(db, { nightId, now })
  }
  assert.equal(drawing(), 'done')
  await next()
  assert.equal(nightDoc().beat, 'door')
  const trace = db.store.get(`nights/${nightId}/public/trace`)
  const c6 = caseDoc()
  const murdererTrace = CHARACTERS.find(ch => ch.id === roster[c6.murderer].characterId).trace
  assert.ok(trace && !('standIn' in trace) && trace.placeholder === false, 'behind the door: a picture, never a note')
  assert.ok(trace.level >= 1 && trace.level <= 5 && (trace.level === 3 ? trace.images?.length === 2 && trace.images.includes(murdererTrace) : trace.trace === murdererTrace), 'the Murderer\'s trace, at the level the dial allowed')
  look('the door')

  // ---- and from before the night was made to here, nothing under sealed/ was read, scanned or written
  // but the drawing's practice bank, read once (job A7, 12 Nov 2026: the party's three docs, never)
  assert.deepEqual(touched, ['get sealed/relay_pictures_practice'], 'a practice night touches nothing sealed but the practice pictures')
  for (const [path, data] of Object.entries(secrets)) assert.ok(same(db.store.get(path), data), 'the sealed store is as it was')
  assert.ok(looks.length === 6 && looks.every(n => n > 300) && looks.at(-1) > 1500, `every look read the night's words (${looks.join(', ')} strings)`)
})

test('the real-night box is still refused before the party day, so a practice night is the only night Jon can start until Sunday', async () => {
  const db = new FakeFirestore()
  await assert.rejects(hostCommand(db, { command: 'create', arg: { real: true, introAt: T0 + 60_000 }, now: T0 }), /only be started on the party day/)
  assert.equal(db.store.has('public_state/active'), false, 'nothing was made')
})
