// The review of 12 Nov 2026, the pause: two things a pause used to break.
//   1. At The house rules the Parlour TV's intro video and the rules film run
//      from the beat's own start, so a pause made the film skip what the
//      pause covered. Resume now moves that start on by the pause, there only.
//   2. A Get Off My Lawn! round under way kept its clock through a pause, so
//      its thirty clean seconds ran out and the round passed itself after
//      Resume. Resume now moves the round's start, its clean mark and every
//      colour's time on by the pause.
// Every case is a throwaway night in a fake Firestore. Nothing is printed.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { FakeFirestore } from './fake-firestore.mjs'
import { createNight, join } from '../lib/night.js'
import { hostCommand, player } from '../lib/run.js'
import { ms } from '../lib/deal.js'
import { readRotation, salemPath, salemColourAt, SALEM_CLEAN_MS } from '../lib/act4.js'
import * as phone from '../../play/src/lib/salem.js'
import { rulesFilmAt, filmTimeline, INTRO_MS, AFTER_INTRO_MS } from '../../play/src/lib/rulesfilm.js'

const NAMES = ['Jon', 'Jessa', 'Jacob', 'Marie', 'Pat', 'Sam', 'Lee', 'Ana']

function fresh() {
  const db = new FakeFirestore()
  db.store.set('meta/game', { host_jonathan: 'Jon', host_susan: 'Susan' })
  return db
}

test('a pause at The house rules: Resume moves the beat\'s start on, so the rules film picks up where it stopped', async () => {
  const db = fresh()
  const { nightId } = await createNight(db)
  const night = () => db.store.get(`nights/${nightId}`)
  const t0 = 5_000_000
  await hostCommand(db, { nightId, command: 'next', now: t0 }) // Arrivals
  await hostCommand(db, { nightId, command: 'next', now: t0 }) // The house rules
  assert.equal(night().act, 1); assert.equal(night().beat, 'rules')
  // the fake stamps the beat with a server time; pin it so the film's clock can be read
  db.store.set(`nights/${nightId}`, { ...night(), beatAt: new Date(t0) })
  const film = filmTimeline()
  const filmAt = t0 + INTRO_MS + AFTER_INTRO_MS
  // four minutes into the film, Jon pauses for seven minutes
  const tPause = filmAt + 4 * 60_000
  const before = rulesFilmAt(night(), tPause, film)
  assert.ok(before, 'the film is on')
  await hostCommand(db, { nightId, command: 'pause', now: tPause })
  assert.equal(rulesFilmAt(night(), tPause + 60_000, film), null, 'no film in a pause')
  const tResume = tPause + 7 * 60_000
  const r = await hostCommand(db, { nightId, command: 'resume', now: tResume })
  assert.equal(r.shiftMs, 7 * 60_000)
  assert.equal(ms(night().beatAt), t0 + 7 * 60_000, 'the beat\'s start moved on by the pause')
  const after = rulesFilmAt(night(), tResume, film)
  assert.ok(after, 'the film is on again')
  assert.equal(after.index, before.index, 'on the same slide')
  assert.equal(after.into, before.into, 'at the same moment of it')
  // a pause as long as the whole film loses none of it
  await hostCommand(db, { nightId, command: 'pause', now: tResume + 1000 })
  await hostCommand(db, { nightId, command: 'resume', now: tResume + 1000 + film.total + 60_000 })
  assert.ok(rulesFilmAt(night(), tResume + 1000 + film.total + 60_000, film), 'still the film, not the join code')
})

test('a pause at any other beat leaves the beat\'s start alone', async () => {
  const db = fresh()
  const { nightId } = await createNight(db)
  const night = () => db.store.get(`nights/${nightId}`)
  const t0 = 6_000_000
  await hostCommand(db, { nightId, command: 'next', now: t0 })
  assert.equal(night().act, 1); assert.equal(night().beat, 'arrive')
  db.store.set(`nights/${nightId}`, { ...night(), beatAt: new Date(t0) })
  await hostCommand(db, { nightId, command: 'pause', now: t0 + 10_000 })
  await hostCommand(db, { nightId, command: 'resume', now: t0 + 70_000 })
  assert.equal(ms(night().beatAt), t0, 'Arrivals keeps its start: the intro\'s own clock compares with it')
})

async function lawn(now) {
  const db = fresh()
  const { nightId } = await createNight(db)
  for (const name of NAMES) await join(db, { uid: `u-${name.toLowerCase()}`, nightId, name })
  const host = (command, arg, at = now) => hostCommand(db, { nightId, command, arg, now: at })
  await host('act', 3); await host('start-act4'); await host('next'); await host('next')
  const rot = await readRotation(db, nightId)
  let r = 1
  while (!db.store.get(salemPath(nightId)).groupId && r < rot.rounds) { await host('next'); r++ }
  const doc = () => db.store.get(salemPath(nightId))
  const g = rot.groups.find(x => x.id === doc().groupId)
  const uidOf = key => db.store.get(`nights/${nightId}/private/deck`).uids[key]
  return { db, nightId, doc, uids: g.members.map(m => uidOf(m.key)), host }
}

test('a pause in a Get Off My Lawn! round: the round picks up where it stopped, and does not pass itself', async () => {
  const t0 = 7_000_000
  const n = await lawn(t0)
  const [a, b] = n.uids
  await player.meetCat(n.db, { nightId: n.nightId, uid: a, cat: 'salem', now: t0 })
  await player.salemReady(n.db, { nightId: n.nightId, uid: a, now: t0 })
  const was = n.doc()
  assert.equal(was.state, 'playing')
  const startsAt = ms(was.startsAt), cleanAt = ms(was.cleanAt)
  assert.equal(cleanAt - startsAt, SALEM_CLEAN_MS)
  // ten seconds into the round the host pauses, for two minutes: far longer than the clean thirty seconds
  const tPause = startsAt + 10_000
  const colour = salemColourAt(was, tPause)
  const shift = 120_000
  await n.host('pause', undefined, tPause)
  await n.host('resume', undefined, tPause + shift)
  const d = n.doc()
  assert.equal(d.state, 'playing', 'still the same round')
  assert.equal(d.attempt, was.attempt, 'and the same attempt')
  assert.equal(ms(d.startsAt), startsAt + shift)
  assert.equal(ms(d.cleanAt), cleanAt + shift)
  assert.equal(d.flips.length, was.flips.length)
  d.flips.forEach((f, i) => { assert.equal(ms(f.at), ms(was.flips[i].at) + shift); assert.equal(f.colour, was.flips[i].colour) })
  assert.equal(salemColourAt(d, tPause + shift), colour, 'on the colour it stopped on')
  assert.equal(ms(d.roundEndsAt), ms(was.roundEndsAt) + shift, 'its limits moved too, as before')
  // just after Resume no phone thinks the round is done, and the server refuses one that says so
  assert.equal(phone.salemPassDue(d, tPause + shift + 500), null, 'the phones do not call it passed')
  await assert.rejects(player.salemPassed(n.db, { nightId: n.nightId, uid: b, attempt: d.attempt, now: tPause + shift + 500 }), /Not yet/)
  assert.equal(n.doc().state, 'playing')
  // twenty clean seconds later, the thirty are up: it passes as any round does
  const tClean = cleanAt + shift
  assert.equal(phone.salemPassDue(n.doc(), tClean), 'clean')
  await player.salemPassed(n.db, { nightId: n.nightId, uid: b, attempt: d.attempt, now: tClean })
  assert.equal(n.doc().state, 'passed')
})

test('a pause between rounds moves no colours (there are none), and Ready still starts the next round', async () => {
  const t0 = 8_000_000
  const n = await lawn(t0)
  const [a] = n.uids
  await player.meetCat(n.db, { nightId: n.nightId, uid: a, cat: 'salem', now: t0 })
  assert.equal(n.doc().state, 'intro')
  await n.host('pause', undefined, t0 + 1000)
  await n.host('resume', undefined, t0 + 61_000)
  assert.deepEqual(n.doc().flips, [])
  assert.equal(n.doc().state, 'intro')
  await player.salemReady(n.db, { nightId: n.nightId, uid: a, now: t0 + 62_000 })
  assert.equal(n.doc().state, 'playing')
})
