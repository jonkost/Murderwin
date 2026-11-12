import { test } from 'node:test'
import assert from 'node:assert/strict'
import { FakeFirestore } from './fake-firestore.mjs'
import { walkLights } from './lights-walk.mjs'
import { createNight, join, MOTIVES, hostCommand as baseCommand } from '../lib/night.js'
import { hostCommand, nextOf, prevOf, firstBeat, player, BLACKOUT_POWER_MS, BLACKOUT_LEAD_MS } from '../lib/run.js'
import {
  NIGHT, beatsOf, ms, openWindow, runAction,
} from '../lib/deal.js'
import { roomFor, groupIn, roundsFor, ROOM_KEYS, PARLOUR } from '../lib/act4.js'
import { tickParlour, GRACE_MS } from '../lib/windows.js'

// A throwaway night with four phones. Nothing here is a real case; the
// rehearsal case is generated fresh by the dealer and thrown away with the db.
async function party() {
  const db = new FakeFirestore()
  db.store.set('meta/game', { host_jonathan: 'Jon', host_susan: 'Susan' })
  const { nightId } = await createNight(db)
  const phones = { jon: 'uid-jon', jessa: 'uid-jessa', jacob: 'uid-jacob', marie: 'uid-marie' }
  for (const [name, uid] of Object.entries(phones)) await join(db, { uid, nightId, name: name[0].toUpperCase() + name.slice(1) })
  return { db, nightId, phones }
}
const night = (db, id) => db.store.get(`nights/${id}`)
const session = (db, uid) => db.store.get(`sessions/${uid}`)
const cards = (db, uid, kind) => (session(db, uid).cards ?? []).filter(c => !kind || c.kind === kind)

test('the beat list walks every act in order and stops where the host has their own button', () => {
  assert.equal(firstBeat(1), 'arrive')
  // the cue list (25 Oct 2026): the house rules after the arrivals, the dinner wrap-up after the bulletin,
  // the motives update after Sir Irwin, and The End after the result
  assert.deepEqual(beatsOf(1).map(b => b.key), ['arrive', 'rules', 'meet', 'introduce', 'ready'])
  assert.deepEqual(nextOf(1, 'arrive'), { act: 1, beat: 'rules' })
  assert.equal(nextOf(1, 'ready'), null, 'Act 1 ends in the blackout, not in Next')
  assert.deepEqual(nextOf(2, 'supper'), { act: 3, beat: 'down' })
  assert.deepEqual(beatsOf(3).map(b => b.key), ['down', 'bulletin', 'wrap'])
  assert.deepEqual(nextOf(3, 'wrap'), { act: 4, beat: 'warn' })
  assert.deepEqual(beatsOf(5).map(b => b.key), ['roam', 'irwin', 'update'])
  assert.deepEqual(beatsOf(7).map(b => b.key), ['ballot', 'reveal', 'result', 'end'])
  assert.deepEqual(nextOf(7, 'result'), { act: 7, beat: 'end' })
  assert.equal(nextOf(7, 'end'), null, 'The End is the last beat of the night')
  assert.equal(NIGHT.acts['7'].beats.at(-1).action, 'end')
  assert.deepEqual(prevOf(3, 'down'), { act: 2, beat: 'supper' })
  assert.deepEqual(beatsOf(2).map(b => b.key), ['orient', 'news', 'peek', 'cat', 'supper'], 'Act 2 has no safe; the bag peek after the news; supper ends it')
  assert.deepEqual(beatsOf(4).map(b => b.key), ['warn', 'groups', 'round1', 'round2', 'round3', 'round4', 'round5'])
  assert.ok(!Object.values(NIGHT.acts).some(a => a.beats.some(b => b.action === 'deal:puzzle')), 'no beat deals a puzzle')
  assert.equal(prevOf(2, 'orient'), null, 'nothing before the power returning')
  for (const act of Object.keys(NIGHT.acts)) assert.ok(beatsOf(act).length > 0, `act ${act} has beats`)
})

test('F01 and G01 the whole night, one Next at a time: every phone gets the same shape of thing at every beat', async () => {
  const { db, nightId, phones } = await party()
  const uids = Object.values(phones)
  let now = 1_000_000
  const next = async () => hostCommand(db, { nightId, command: 'next', now })

  // Act 0 → Act 1 and through its beats (the house rules deal nothing: the video and the slides are the TV's)
  await next()
  assert.equal(night(db, nightId).act, 1)
  assert.equal(night(db, nightId).beat, 'arrive')
  await next() // the house rules
  assert.equal(night(db, nightId).beat, 'rules')
  for (const uid of uids) assert.deepEqual(cards(db, uid, 'notice'), [], 'the rules beat deals no card')
  await next(); await next(); await next()
  for (const uid of uids) assert.deepEqual(cards(db, uid, 'notice').map(c => c.key), ['meet', 'introduce', 'ready'])
  await assert.rejects(next, /Blackout/)

  // Blackout: the dark, then (five seconds later on the server; the test's sleep is instant) the power
  // returns on its own: roles land, held on every phone the same way (25 Oct 2026, the cue list)
  const sleeps = []
  assert.deepEqual(await hostCommand(db, { nightId, command: 'blackout', now, sleep: ms => { sleeps.push(ms) } }), { ok: true, powerReturned: true })
  assert.deepEqual(sleeps, [BLACKOUT_LEAD_MS, BLACKOUT_POWER_MS], 'the lead (the music stops first), then five seconds of dark, waited on the server (A1, 11 Nov 2026)')
  const n2 = night(db, nightId)
  assert.equal(n2.act, 2); assert.equal(n2.phase, 'prompt'); assert.equal(n2.beat, 'orient'); assert.equal(n2.rehearsal, true)
  const c = db.store.get(`cases/${nightId}`)
  assert.equal(Object.values(c.roles).filter(r => r === 'murderer').length, 1)
  assert.equal(Object.values(c.roles).filter(r => r === 'ghost').length, 1)
  for (const uid of uids) {
    const role = cards(db, uid, 'role')
    assert.equal(role.length, 1)
    assert.equal(role[0].id, '2-power-role')
    assert.ok(role[0].text.length > 40)
    assert.equal(cards(db, uid, 'notice').at(-1).key, 'orient')
    assert.equal(session(db, uid).role, undefined, 'a session never carries its role as a field')
  }
  // pressing Power once the power is back changes nothing: nothing is dealt twice
  assert.deepEqual(await hostCommand(db, { nightId, command: 'power', now }), { ok: true, already: true })
  for (const uid of uids) assert.equal(cards(db, uid, 'role').length, 1)

  // Act 2: news, the bag peek, the cats, a Parlour Game when it is due, supper
  await next() // news
  await next() // peek
  for (const uid of uids) assert.equal(cards(db, uid, 'notice').at(-1).key, 'peek', 'a quiet look in your own bag')
  await next() // cat: the first wave goes, one guest to each cat; everyone else waits in the Parlour
  const sent = uids.filter(uid => session(db, uid).lights?.step === 'go')
  assert.equal(sent.length, Math.min(4, uids.length), 'one guest at each of the four cats')
  for (const uid of uids) {
    assert.ok(['wait', 'go'].includes(session(db, uid).lights.step), 'every phone has a next step')
    assert.equal(cards(db, uid, 'testimony').length, 0, 'nothing is said until the guest is with the cat')
  }
  // the first Parlour Game pops up on its own when it is due, during the cat visits and in no other beat of Act 2 (A5)
  const sched = db.store.get(`nights/${nightId}/private/parlour`)
  assert.equal(sched.act, 2); assert.equal(sched.count, 5)
  await tickParlour(db, nightId, ms(sched.due0) - 1) // the Parlour Games' own clock: the whole tick would also move the cat line on
  assert.ok(!night(db, nightId).window, 'not a moment early')
  await tickParlour(db, nightId, ms(sched.due0))
  const w = night(db, nightId).window
  assert.equal(w.kind, 'questions'); assert.equal(w.settled, false)
  assert.equal(w.id, 'questions-2-p0')
  const wOpened = ms(w.opensAt)
  assert.equal(ms(w.closesAt) - wOpened, NIGHT.windows.questions.ms)
  const shown = session(db, uids[0]).windows[w.id]
  for (const uid of uids) {
    const set = session(db, uid).windows[w.id]
    assert.deepEqual(Object.keys(set).sort(), ['beats', 'kind', 'opensAt'], 'no cat, no numbers: the listening cat is a secret')
    assert.deepEqual(set, shown, 'every phone gets the same set')
    assert.equal(set.beats.length, 3)
    for (const b of set.beats) {
      assert.equal(b.choices.length, 2, 'exactly two answers')
      for (const ch of b.choices) assert.deepEqual(Object.keys(ch).sort(), ['k', 'text'], 'no numbers on a phone')
    }
  }
  // two phones answer; Next refuses while the window is open; after it closes the other two get random picks
  const first = session(db, uids[1]).windows[w.id]
  await player.answer(db, { nightId, uid: uids[1], windowId: w.id, picks: first.beats.map(b => b.choices[0].k), now: wOpened })
  await player.answer(db, { nightId, uid: uids[2], windowId: w.id, picks: ['a', 'b', 'a'], now: wOpened })
  await assert.rejects(() => player.answer(db, { nightId, uid: uids[2], windowId: w.id, picks: ['x', 'b', 'a'], now: wOpened }).then(r => { if (r.already) throw new Error('already') }), /already/)
  await assert.rejects(() => hostCommand(db, { nightId, command: 'next', now: wOpened }), /still choosing/)
  await hostCommand(db, { nightId, command: 'settle', now: wOpened + NIGHT.windows.questions.ms + 1 })
  assert.equal(night(db, nightId).window.settled, true)
  for (const uid of uids) assert.ok(session(db, uid).answers[w.id].picks.length === 3)
  assert.equal(session(db, uids[0]).answers[w.id].defaulted, true)
  assert.equal(session(db, uids[1]).answers[w.id].defaulted, false)
  const walked = await walkLights(db, nightId, { now })
  assert.equal(walked.meetings, 4 * uids.length, 'every guest visits all four cats'); assert.equal(walked.worst, 1, 'never two guests at a cat')
  for (const uid of uids) {
    const all = cards(db, uid, 'testimony')
    assert.equal(all.length, 4, 'one card from each cat')
    assert.deepEqual(all.map(x => x.cat).sort(), ['boo', 'granolia', 'salem', 'zimothy'], 'every cat, never Sir Irwin')
    for (const t of all) {
      assert.equal(t.outcome, undefined, 'no pass, no partial, no brush-off, no greeting-only cat')
      assert.deepEqual(t.lines, [], 'the cat says only its hint and its bag clue')
      // a practice night plays for real (11 Nov 2026): the cat's own hint line and bag clue, never a note in brackets
      assert.ok(t.hint?.text?.length > 10 && t.hint.placeholder === false && !t.hint.none, 'a practice night: the motive hint is a real line')
      assert.ok(t.bag?.text?.length > 10 && t.bag.placeholder === false, 'and so is the bag clue')
      assert.ok(!/___|\[|\]/.test(t.hint.text + t.bag.text), 'no blank and no bracket in either')
      assert.equal(t.placeholder, false)
      if (t.cat === 'granolia') assert.equal(t.room, 'the Study')
    }
    assert.equal(session(db, uid).lights.step, 'done')
  }
  assert.equal(night(db, nightId).beat, 'supper', 'everyone has seen all four cats: the supper chime came on its own')
  assert.equal(db.store.get(`nights/${nightId}/public/sounds`).current.id, 'chime-phone')
  assert.equal(db.store.get(`nights/${nightId}/private/puzzles`), undefined, 'no safe numbers anywhere')
  for (const uid of uids) assert.equal(cards(db, uid, 'puzzle').length, 0, 'no safe on any phone')
  // supper: a Parlour Game that falls due now waits (it is carried to Act 4); the tick opens nothing (A5)
  await hostCommand(db, { nightId, command: 'tick', now: ms(sched.due1) + 10 * 60_000 })
  assert.equal(night(db, nightId).window.id, w.id, 'no Parlour Game over supper')
  await next() // Act 3
  assert.equal(night(db, nightId).act, 3)
  for (const uid of uids) for (const v of Object.values(session(db, uid).affection)) assert.ok(v >= 1 && v <= 5)
  // the hidden roles' points reach the dial; their phones look like everyone else's
  assert.equal(typeof db.store.get(`cases/${nightId}`).dial, 'number')

  // Act 3: supper (the phone stays in the Parlour, charging), the bulletin armed, the dinner wrap-up
  // (the first motives prompt, 25 Oct 2026); then Start Act 4
  for (const uid of uids) assert.match(cards(db, uid, 'notice').at(-1).text, /Leave your phone charging in the Parlour/)
  await next() // arm the bulletin
  await next() // the dinner wrap-up
  assert.equal(night(db, nightId).beat, 'wrap')
  for (const uid of uids) {
    const c = cards(db, uid, 'notice').at(-1)
    assert.equal(c.key, 'motives')
    assert.equal(c.title, 'Your motives')
    assert.match(c.text, /Motives tab/)
    assert.equal(c.image, undefined, 'no picture on the motives prompt')
  }
  await hostCommand(db, { nightId, command: 'start-act4', now })
  assert.equal(night(db, nightId).beat, 'warn')
  for (const uid of uids) assert.equal(cards(db, uid, 'notice').at(-1).key, 'act4-warn', 'the two-minute warning')
  await next() // the group cards
  const rot = db.store.get(`nights/${nightId}/public/rotation`)
  assert.equal(rot.groups.length, 2)
  assert.equal(rot.rounds, 4)
  const m = c.murderer, g = c.ghost
  assert.ok(!rot.groups.some(grp => grp.members.some(x => x.key === m) && grp.members.some(x => x.key === g)), 'hidden roles apart')
  for (const uid of uids) {
    const gc = cards(db, uid, 'group')
    assert.equal(gc.length, 1)
    assert.equal(gc[0].lockIn, true)
    assert.ok(gc[0].members.every(x => x.characterId), 'portraits for every member')
    assert.ok(session(db, uid).group)
  }
  // everyone taps Locked in: the first round starts at once, with the chime
  for (const uid of uids) await player.lockIn(db, { nightId, uid, now })
  assert.equal(night(db, nightId).beat, 'round1')

  // Act 4: four rounds; every group visits every room once; the chime pays any room not finished
  const visited = Object.fromEntries(uids.map(u => [u, []]))
  for (let r = 1; r <= rot.rounds; r++) {
    assert.equal(night(db, nightId).beat, `round${r}`)
    for (const uid of uids) visited[uid].push(session(db, uid).act4.room)
    await next()
  }
  assert.equal(night(db, nightId).act, 5, 'Next after the last round goes on to Act 5 (no fifth round with two groups)')
  for (const uid of uids) {
    assert.deepEqual([...visited[uid]].sort(), [...ROOM_KEYS].sort(), 'every room once')
    const rooms = cards(db, uid, 'clue').filter(x => x.room)
    assert.deepEqual(rooms.map(x => x.room).sort(), [...ROOM_KEYS].sort(), 'every room paid its reward at the chime')
    for (const x of rooms) {
      // a practice night plays for real (11 Nov 2026): a real bag hint about the Ghost, and Zimothy's real cross-off
      assert.equal(x.placeholder, false)
      assert.ok(x.bag.text.length > 10 && x.bag.placeholder === false && !/___|\[|\]/.test(x.text + x.bag.text), 'a practice night: the Ghost bag hint is a real line')
      if (x.room === 'library') assert.ok(MOTIVES.some(m => m.n === x.cross) && x.cross !== db.store.get(`cases/${nightId}`).motive, 'Zimothy crosses off a wrong motive')
      else assert.equal(x.cross, undefined, 'only the Library crosses a motive off')
    }
    assert.ok(cards(db, uid, 'clue').some(x => x.id.endsWith('study-clue')), 'the study paid out its trace slot')
  }

  // Act 5: the cake notice carries the birthday picture (cue 12, 25 Oct 2026); Sir Irwin; the motives update
  assert.equal(night(db, nightId).beat, 'roam')
  for (const uid of uids) {
    const c = cards(db, uid, 'notice').at(-1)
    assert.equal(c.key, 'roam')
    assert.equal(c.image, 'birthday', 'the Happy Birthday Irwin graphic above the cake notice')
  }
  await next() // Sir Irwin
  assert.equal(night(db, nightId).act, 5)
  await next() // update your motives (the second motives prompt)
  assert.equal(night(db, nightId).beat, 'update')
  for (const uid of uids) assert.equal(cards(db, uid, 'notice').at(-1).key, 'update')
  // Act 6 opens on the break note and its two Parlour Games, the first at once (the break notice, cue 15)
  await next()
  assert.equal(night(db, nightId).act, 6)
  assert.equal(night(db, nightId).beat, 'games')
  for (const uid of uids) assert.equal(cards(db, uid, 'notice').at(-1).key, 'break')
  assert.equal(night(db, nightId).window.kind, 'questions')
  now += NIGHT.windows.questions.ms + 1
  await next() // the drawing
  assert.ok(['intro', 'walk'].includes(db.store.get(`nights/${nightId}/public/relay`).state))
  await assert.rejects(next, /still running/) // the phones stay on the drawing until it is done or cleared
  await hostCommand(db, { nightId, command: 'relay-reset', now })
  await next() // door
  for (const uid of uids) assert.equal(cards(db, uid, 'notice').at(-1).key, 'door')
  // Talk it over (11 Nov 2026), the last beat of Act 6: one plain notice on every phone, and nothing
  // else. No window, no clock, no board of strikes, and no call a phone could make
  const before = night(db, nightId).window
  await next()
  assert.equal(night(db, nightId).act, 6)
  assert.equal(night(db, nightId).beat, 'talk')
  assert.equal(beatsOf(6).at(-1).key, 'talk', 'talk ends Act 6')
  for (const uid of uids) {
    const card = cards(db, uid, 'notice').at(-1)
    assert.deepEqual([card.key, card.title, card.text], ['talk', 'Talk it over', 'The vote is next.'])
    assert.ok(card.button, 'one tap puts it away')
  }
  assert.deepEqual(night(db, nightId).window, before, 'talking opens no window: the last one is still the Parlour Game from the start of the act')
  assert.equal(before.settled, true)
  assert.equal(Object.keys(night(db, nightId)).some(k => /^elim/.test(k)), false, 'the night keeps no board')
  assert.equal(Object.keys(player).some(k => /^elim/.test(k)), false, 'and no phone can call for one')
  assert.deepEqual(Object.keys(NIGHT.windows).sort(), ['ballot', 'questions'], 'two kinds of window: a Parlour Game and the vote')

  // Act 7: the vote, the reveal, the result
  await next()
  const bw = night(db, nightId).window
  assert.equal(bw.kind, 'ballot')
  assert.equal(bw.title, 'The vote')
  assert.equal(bw.of, 4, 'four seats were dealt the vote')
  assert.equal(bw.host, undefined, 'no host line on the vote: three rows and Lock in')
  await player.ballot(db, { nightId, uid: uids[1], murderer: m, motive: c.motive, victim: g, now })
  await assert.rejects(() => player.ballot(db, { nightId, uid: uids[2], murderer: 'nobody', motive: 1, victim: g, now }), /party/)
  await assert.rejects(next, /still choosing/)
  now += NIGHT.windows.ballot.ms + 1
  await next() // reveal: the answer goes where no phone reads; the screen names nothing until the host presses
  const r = db.store.get(`nights/${nightId}/private/reveal`)
  assert.equal(r.murderer.key, m); assert.equal(r.victim.key, g); assert.equal(r.motive.n, c.motive)
  assert.equal(night(db, nightId).reveal, undefined)
  assert.deepEqual(db.store.get(`nights/${nightId}/public/finale`).names, {})
  await assert.rejects(next, /named/)
  for (let i = 0; i < 3; i++) await hostCommand(db, { nightId, command: 'reveal-stage', now })
  await next() // results
  const res = session(db, uids[1]).result
  assert.deepEqual([res.murderer, res.motive, res.victim], [true, true, true])
  assert.equal(night(db, nightId).tally.of, 4)
  assert.ok(cards(db, uids[1], 'result').length === 1)
  assert.equal(night(db, nightId).over, undefined, 'the night is not over until The End')
  // The End (cue 23, 25 Oct 2026): nights.over, once; then nothing is left to press
  const theEnd = await next()
  assert.equal(night(db, nightId).beat, 'end')
  assert.equal(theEnd.over, true)
  assert.equal(night(db, nightId).over, true)
  const overAt = night(db, nightId).overAt
  assert.ok(overAt, 'stamped')
  assert.deepEqual(await hostCommand(db, { nightId, command: 'beat', arg: 'end', now }), { ok: true, act: 7, beat: 'end', over: true, already: true }, 'a second visit changes nothing')
  assert.deepEqual(night(db, nightId).overAt, overAt)
  for (const uid of uids) assert.ok(cards(db, uid, 'result').length === 1, 'The End deals nothing: the result card stays')
  await assert.rejects(next, /end of the night/)
  // Back from The End opens the night up again (a rehearsal walks the end twice); Next closes it once more
  await hostCommand(db, { nightId, command: 'back', now })
  assert.equal(night(db, nightId).beat, 'result')
  assert.equal(night(db, nightId).over, undefined, 'Back from The End takes the flag off')
  assert.equal(night(db, nightId).overAt, undefined)
  await next()
  assert.equal(night(db, nightId).over, true)

  // The seal, checked after the whole walk: nothing a phone can read names a role.
  for (const uid of uids) {
    const s = session(db, uid)
    assert.equal(s.role, undefined)
    for (const [, set] of Object.entries(s.windows)) assert.ok(!JSON.stringify(set).includes('"av"'))
  }
  const pub = JSON.stringify({ n: night(db, nightId), content: db.store.get(`nights/${nightId}/public/content`), rot })
  assert.ok(!/"roles"|dialSign|"dial"/.test(pub), 'the night doc carries no roles and no dial')
})

test('F11 the blackout returns the power on its own five seconds later on the server; Power returns by hand works in the dark and is harmless after; a pause in the dark holds it (the cue list, 25 Oct 2026)', async () => {
  // by hand: the base blackout (night.js) puts the night in the dark with no automatic return
  {
    const { db, nightId, phones } = await party()
    const uids = Object.values(phones)
    const now = 3_000_000
    for (let i = 0; i < 5; i++) await hostCommand(db, { nightId, command: 'next', now }) // Act 1's five beats
    await baseCommand(db, { nightId, command: 'blackout', now })
    assert.equal(night(db, nightId).phase, 'blackout')
    await assert.rejects(hostCommand(db, { nightId, command: 'next', now }), /Power/, 'Next refuses in the dark')
    const r = await hostCommand(db, { nightId, command: 'power', now })
    assert.equal(r.already, undefined)
    const n2 = night(db, nightId)
    assert.equal(n2.act, 2); assert.equal(n2.phase, 'prompt'); assert.equal(n2.beat, 'orient')
    for (const uid of uids) assert.equal(cards(db, uid, 'role').length, 1)
    assert.equal(db.store.get(`nights/${nightId}/public/cues`).hall, 'red', 'the hall bulb is red from the power\'s return')
    assert.deepEqual(await hostCommand(db, { nightId, command: 'power', now }), { ok: true, already: true }, 'a second press changes nothing')
  }
  // on its own: the Blackout waits five seconds on the server, then runs the same sequence, timed from that moment
  {
    const { db, nightId, phones } = await party()
    const now = 4_000_000
    for (let i = 0; i < 5; i++) await hostCommand(db, { nightId, command: 'next', now }) // Act 1's five beats
    assert.equal(db.store.get(`nights/${nightId}/public/cues`).hall, 'green', 'green for the welcome through Act 1')
    let slept = null
    const r = await hostCommand(db, { nightId, command: 'blackout', now, sleep: async waitMs => {
      if (waitMs === BLACKOUT_LEAD_MS) { assert.equal(night(db, nightId).phase, 'act', 'the lead: the music stops, the dark is still to come'); return }
      slept = waitMs
      assert.equal(night(db, nightId).phase, 'blackout', 'dark while the server waits')
      assert.equal(db.store.get(`nights/${nightId}/public/sounds`).current.id, 'blackout', 'the blackout sound plays at the press')
      assert.equal(db.store.get(`cases/${nightId}`), undefined, 'nothing is dealt in the dark')
    } })
    assert.deepEqual(r, { ok: true, powerReturned: true })
    assert.equal(slept, BLACKOUT_POWER_MS)
    assert.equal(night(db, nightId).phase, 'prompt'); assert.equal(night(db, nightId).act, 2)
    for (const uid of Object.values(phones)) assert.equal(cards(db, uid, 'role').length, 1)
    assert.equal(ms(db.store.get(`nights/${nightId}/private/parlour`).startedAt), now + BLACKOUT_LEAD_MS + BLACKOUT_POWER_MS, 'the power\'s moment is five seconds after the dark, which is the lead after the press')
    assert.equal(db.store.get(`nights/${nightId}/public/cues`).hall, 'red')
    assert.equal(db.store.get(`nights/${nightId}/public/sounds`).current.id, 'blackout', 'no power sound: the blackout\'s stays the last')
    assert.equal(db.store.get(`nights/${nightId}/public/screen`).kind, 'black', 'the TV stays dark through the prompt')
  }
  // a pause pressed during the five dark seconds is refused (the final check of 12 Nov 2026: a night paused in
  // the dark stayed dark for good, with no Resume on any phone, since every phone is black in the dark): the
  // power returns by itself as ever, and the pause can be pressed after it
  {
    const { db, nightId } = await party()
    const now = 5_000_000
    for (let i = 0; i < 5; i++) await hostCommand(db, { nightId, command: 'next', now }) // Act 1's five beats
    let refused = 0
    const r = await hostCommand(db, { nightId, command: 'blackout', now, sleep: async waitMs => {
      if (waitMs !== BLACKOUT_POWER_MS) return
      assert.equal(night(db, nightId).phase, 'blackout')
      await assert.rejects(hostCommand(db, { nightId, command: 'pause', now: now + BLACKOUT_LEAD_MS + 1000 }), /The power comes back in a few seconds/)
      refused++
    } })
    assert.equal(refused, 1)
    assert.deepEqual(r, { ok: true, powerReturned: true })
    const n = night(db, nightId)
    assert.equal(n.phase, 'prompt'); assert.equal(n.act, 2); assert.equal(n.pausedFrom ?? null, null)
    assert.ok(db.store.get(`cases/${nightId}`), 'the case is dealt as the power returns')
    // once the power is back the pause works again
    await hostCommand(db, { nightId, command: 'pause', now: now + 10_000 })
    assert.equal(night(db, nightId).phase, 'paused'); assert.equal(night(db, nightId).pausedFrom, 'prompt')
  }
  // the two landing together: Power returns typed on the brain during the five seconds wins, the
  // Blackout's own return finds the night already out of the dark and does nothing, so the case is
  // dealt once and the night's time is the hand press's
  {
    const { db, nightId, phones } = await party()
    const now = 6_000_000
    for (let i = 0; i < 5; i++) await hostCommand(db, { nightId, command: 'next', now }) // Act 1's five beats
    let byHand = null
    const r = await hostCommand(db, { nightId, command: 'blackout', now, sleep: async waitMs => {
      if (waitMs !== BLACKOUT_POWER_MS) return
      byHand = await hostCommand(db, { nightId, command: 'power', now: now + 1000 })
    } })
    assert.deepEqual(byHand, { ok: true }, 'the hand press did the return')
    assert.deepEqual(r, { ok: true, powerReturned: false }, 'the automatic return found the power back already')
    assert.equal(night(db, nightId).phase, 'prompt'); assert.equal(night(db, nightId).act, 2)
    for (const uid of Object.values(phones)) assert.equal(cards(db, uid, 'role').length, 1, 'one role card, not two')
    assert.equal(ms(db.store.get(`nights/${nightId}/private/parlour`).startedAt), now + 1000, 'Act 2 began at the hand press')
    assert.equal(db.store.get(`sessions/${Object.values(phones)[0]}`).cards.filter(c => c.kind === 'notice' && c.key === 'orient').length, 1, 'one orient notice')
  }
})

test('the blackout is Act 1 only: refused in the lobby and in every later act, and a second press in the dark changes nothing (25 Oct 2026)', async () => {
  const { db, nightId, phones } = await party()
  const now = 7_000_000
  await assert.rejects(hostCommand(db, { nightId, command: 'blackout', now, sleep: () => {} }), /ends Act 1/, 'not before Act 1')
  assert.equal(night(db, nightId).act, 0)
  for (let i = 0; i < 5; i++) await hostCommand(db, { nightId, command: 'next', now }) // Act 1's five beats
  // a second press during the dark: answered already, and the first press still returns the power once
  let second = null
  const r = await hostCommand(db, { nightId, command: 'blackout', now, sleep: async () => {
    second = await hostCommand(db, { nightId, command: 'blackout', now: now + 1000, sleep: () => { throw new Error('a second press never waits') } })
  } })
  assert.deepEqual(second, { ok: true, already: true })
  assert.deepEqual(r, { ok: true, powerReturned: true })
  for (const uid of Object.values(phones)) assert.equal(cards(db, uid, 'role').length, 1)
  // once the night is in Act 2 or later, a mis-press is refused and the night stays where it is
  for (const act of [2, 4, 7]) {
    if (act !== 2) await hostCommand(db, { nightId, command: 'act', arg: act, now })
    await assert.rejects(hostCommand(db, { nightId, command: 'blackout', now, sleep: () => {} }), /ends Act 1/)
    assert.equal(night(db, nightId).act, act)
    assert.notEqual(night(db, nightId).phase, 'blackout')
  }
})

test('back moves without dealing; act jump to 2 deals the roles; light-up opens a window in Acts 2, 4 and 6 only', async () => {
  const { db, nightId, phones } = await party()
  const uids = Object.values(phones)
  await assert.rejects(() => hostCommand(db, { nightId, command: 'light-up' }), /Acts 2, 4 and 6/)
  await hostCommand(db, { nightId, command: 'act', arg: 2 })
  assert.equal(night(db, nightId).phase, 'prompt')
  for (const uid of uids) assert.equal(cards(db, uid, 'role').length, 1)
  await hostCommand(db, { nightId, command: 'next' })
  await hostCommand(db, { nightId, command: 'back' })
  assert.equal(night(db, nightId).beat, 'orient')
  for (const uid of uids) assert.equal(cards(db, uid, 'notice').filter(c => c.key === 'news').length, 1, 'back deals nothing new')
  await assert.rejects(() => hostCommand(db, { nightId, command: 'light-up' }), /cat visits/, 'not over the orientation (A5)')
  await hostCommand(db, { nightId, command: 'beat', arg: 'cat' })
  const r = await hostCommand(db, { nightId, command: 'light-up' })
  assert.equal(r.phones, 4)
  assert.equal(night(db, nightId).window.kind, 'questions')
  await assert.rejects(() => hostCommand(db, { nightId, command: 'settle' }), /still choosing/)
})

test('an act jump that skips the power beat still builds the case and deals every phone its role card', async () => {
  const { db, nightId, phones } = await party()
  const uids = Object.values(phones)
  await hostCommand(db, { nightId, command: 'act', arg: 1 })
  assert.equal(db.store.get(`cases/${nightId}`), undefined, 'Act 1: no case yet')
  for (const uid of uids) assert.equal(cards(db, uid, 'role').length, 0)
  // the host taps 3 on the acts row, then Next to the bulletin
  await hostCommand(db, { nightId, command: 'act', arg: 3 })
  const n = night(db, nightId)
  assert.equal(n.act, 3)
  assert.equal(n.phase, 'prompt', 'the roles have just landed: every phone shows its card first')
  const c = db.store.get(`cases/${nightId}`)
  assert.ok(c?.roles, 'the case was built on the way')
  for (const uid of uids) {
    const role = cards(db, uid, 'role')
    assert.equal(role.length, 1, 'exactly one role card on every phone')
    assert.equal(role[0].id, '2-power-role')
  }
  await hostCommand(db, { nightId, command: 'next' })
  assert.equal(night(db, nightId).beat, 'bulletin')
  assert.equal(night(db, nightId).phase, 'act')
  for (const uid of uids) assert.equal(cards(db, uid, 'role').length, 1, 'still one, never two')
  // a later jump deals nothing twice; a jump back to 1 deals nothing either
  await hostCommand(db, { nightId, command: 'act', arg: 5 })
  assert.equal(night(db, nightId).phase, 'act', 'the roles were already out: no prompt again')
  for (const uid of uids) assert.equal(cards(db, uid, 'role').length, 1)
  const { db: db2, nightId: n2, phones: p2 } = await party()
  await hostCommand(db2, { nightId: n2, command: 'act', arg: 1 })
  assert.equal(db2.store.get(`cases/${n2}`), undefined)
  for (const uid of Object.values(p2)) assert.equal(cards(db2, uid, 'role').length, 0)
})

test('a Parlour Game opens once at its time, in its own beat only; light-up is always fresh; Act 6 plays its own two, then the drawing starts by itself and nothing opens again (A5)', async () => {
  const { db, nightId, phones } = await party()
  const uids = Object.values(phones)
  let now = 3_000_000
  await hostCommand(db, { nightId, command: 'act', arg: 2, now })
  await hostCommand(db, { nightId, command: 'next', now }) // news: the role prompt is over
  const sched = () => db.store.get(`nights/${nightId}/private/parlour`)
  // due, but the news flash is on: it waits (A5)
  now = ms(sched().due0)
  assert.equal((await hostCommand(db, { nightId, command: 'tick', now })).parlour.opened, false)
  assert.ok(!night(db, nightId).window, 'nothing opens over the news flash')
  await hostCommand(db, { nightId, command: 'next', now }) // the bag peek
  await hostCommand(db, { nightId, command: 'tick', now })
  assert.ok(!night(db, nightId).window, 'nor over the bag peek')
  await hostCommand(db, { nightId, command: 'next', now }) // the cat visits: the games' own beat
  await hostCommand(db, { nightId, command: 'tick', now })
  const w1 = night(db, nightId).window
  assert.equal(w1.id, 'questions-2-p0', 'the id names the act and the slot, not the moment')
  now += NIGHT.windows.questions.ms + 1
  await hostCommand(db, { nightId, command: 'settle', now })
  assert.equal(night(db, nightId).window.settled, true)
  const dialLog = db.store.get(`cases/${nightId}`).dialLog.length
  const sets = Object.fromEntries(uids.map(u => [u, Object.keys(session(db, u).windows)]))
  // the tick again, and the dealer asked for the same slot again: the same window stands, settled
  await hostCommand(db, { nightId, command: 'tick', now })
  await openWindow(db, nightId, 'questions', { now, act: 2, beat: 'p0' })
  assert.equal(night(db, nightId).window.id, w1.id)
  assert.equal(night(db, nightId).window.settled, true)
  for (const u of uids) assert.deepEqual(Object.keys(session(db, u).windows), sets[u], 'no second set on any phone')
  assert.equal(db.store.get(`cases/${nightId}`).dialLog.length, dialLog, 'the dial moved once for this game')
  // the next one waits for its own time and for the gap after the last one
  const gap = NIGHT.parlour.minGapMin * 60_000
  await hostCommand(db, { nightId, command: 'tick', now: Math.max(ms(sched().due1), ms(sched().lastAt) + gap) - 1 })
  assert.equal(night(db, nightId).window.id, w1.id)
  // the explicit button is a fresh window every time, and no set is used twice
  const lit = await hostCommand(db, { nightId, command: 'light-up', now })
  assert.notEqual(lit.id, w1.id)
  assert.equal(night(db, nightId).window.id, lit.id)
  assert.equal(night(db, nightId).window.settled, false)
  for (const u of uids) assert.equal(Object.keys(session(db, u).windows).length, 2)
  const priv = db.store.get(`nights/${nightId}/private/windows`)
  assert.notEqual(priv[lit.id].setId, priv[w1.id].setId, 'light-up picks a set not used tonight')
  // Act 6 plays its own two and no more (A5): the four Act 2 games that never got their turn are dropped
  now += NIGHT.windows.questions.ms + 1
  await hostCommand(db, { nightId, command: 'act', arg: 6, now })
  assert.equal(night(db, nightId).beat, 'games')
  assert.equal(sched().act, 6)
  assert.equal(sched().count, 2)
  assert.deepEqual(sched().slots.map(s => `${s.act}-${s.slot}`), ['6-0', '6-1'])
  assert.equal(ms(sched().due1) - ms(sched().due0), NIGHT.parlour.startGapSec * 1000, 'back to back')
  const first6 = night(db, nightId).window
  assert.equal(first6.id, 'questions-6-p0', 'the first of Act 6, at once')
  // it closes; the next follows one short gap later, not the four minutes of Acts 2 and 4
  let r = await hostCommand(db, { nightId, command: 'tick', now: ms(first6.closesAt) + GRACE_MS })
  assert.equal(r.windowSettled, true); assert.equal(r.parlour.opened, false); assert.equal(r.clock, null)
  assert.equal(night(db, nightId).beat, 'games', 'one game still to come')
  now = ms(sched().due1)
  r = await hostCommand(db, { nightId, command: 'tick', now })
  assert.equal(r.parlour.opened, true)
  const second6 = night(db, nightId).window
  assert.equal(second6.id, 'questions-6-p1')
  // the last one closes: the night goes on to the drawing by itself
  r = await hostCommand(db, { nightId, command: 'tick', now: ms(second6.closesAt) + GRACE_MS })
  assert.equal(r.clock, 'drawing')
  assert.equal(night(db, nightId).beat, 'drawing')
  assert.equal(db.store.get(`nights/${nightId}/public/relay`).state, 'intro')
  assert.equal(sched().closed, true, 'what was left is dropped for good')
  // nothing opens over the drawing, at the door, in Talk it over or in Act 7, and the button is refused
  now = ms(second6.closesAt) + GRACE_MS
  const ids = () => Object.keys(db.store.get(`nights/${nightId}/private/windows`)).filter(id => id.startsWith('questions-')).sort()
  const had = ids()
  await assert.rejects(() => hostCommand(db, { nightId, command: 'light-up', now }), /Not now/)
  await hostCommand(db, { nightId, command: 'tick', now: now + 600_000 })
  await hostCommand(db, { nightId, command: 'relay-reset', now })
  await hostCommand(db, { nightId, command: 'next', now }) // the door
  await hostCommand(db, { nightId, command: 'tick', now: now + 700_000 })
  await assert.rejects(() => hostCommand(db, { nightId, command: 'light-up', now }), /Not now/)
  // a Back to the games beat stays where it is put, and still opens nothing
  await hostCommand(db, { nightId, command: 'back', now }); await hostCommand(db, { nightId, command: 'back', now })
  assert.equal(night(db, nightId).beat, 'games')
  r = await hostCommand(db, { nightId, command: 'tick', now: now + 800_000 })
  assert.equal(r.clock, null); assert.equal(r.parlour.opened, false)
  assert.equal(night(db, nightId).beat, 'games')
  assert.deepEqual(ids(), had, 'no Parlour Game after the drawing started')
  const c = db.store.get(`cases/${nightId}`)
  const priv6 = db.store.get(`nights/${nightId}/private/windows`)[first6.id]
  assert.equal(priv6.setId, c.parlourPlan.acts[6][0].setId, 'the set the plan named for it')
})

test('the safe is gone: no beat deals it, the old action is refused, and no phone may call solve', async () => {
  const { db, nightId } = await party()
  await hostCommand(db, { nightId, command: 'act', arg: 2 })
  await assert.rejects(runAction(db, nightId, 2, 'cat', 'deal:puzzle'), e => e.code === 'invalid')
  assert.equal(player.solve, undefined)
})

test('the rooms: every group visits every room once, never two groups in a room, the Parlour when there are five', () => {
  for (const groups of [1, 2, 3, 4, 5]) {
    const order = Array.from({ length: groups }, (_, i) => `g${i + 1}`)
    const rot = { order, rooms: ['library', 'study', 'entryway', 'orangerie'], rounds: roundsFor(groups) }
    assert.equal(rot.rounds, Math.max(4, groups))
    for (const gid of order) {
      const rooms = Array.from({ length: rot.rounds }, (_, r) => roomFor(rot, gid, r + 1))
      assert.deepEqual(rooms.filter(x => x !== PARLOUR).sort(), [...ROOM_KEYS].sort(), `${groups} groups: ${gid} visits every room once`)
    }
    for (let r = 1; r <= rot.rounds; r++) {
      const here = order.map(gid => roomFor(rot, gid, r)).filter(x => x !== PARLOUR)
      assert.equal(new Set(here).size, here.length, 'a room never holds two groups (G47)')
      for (const room of ROOM_KEYS) assert.equal(groupIn(rot, room, r), order.find(gid => roomFor(rot, gid, r) === room) ?? null)
    }
  }
  assert.equal(roomFor({ order: ['g1'], rounds: 4 }, 'g9', 1), PARLOUR, 'a group the walk does not know waits in the Parlour')
})

test('the rehearsal case is thrown away with the night: a new night deals a new one', async () => {
  const a = await party()
  await hostCommand(a.db, { nightId: a.nightId, command: 'act', arg: 2 })
  const b = await party()
  await hostCommand(b.db, { nightId: b.nightId, command: 'act', arg: 2 })
  assert.ok(MOTIVES.some(m => m.n === a.db.store.get(`cases/${a.nightId}`).motive))
  assert.notEqual(a.nightId, b.nightId)
})
