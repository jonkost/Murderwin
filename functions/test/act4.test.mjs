import { test } from 'node:test'
import assert from 'node:assert/strict'
import { FakeFirestore } from './fake-firestore.mjs'
import { walkLights } from './lights-walk.mjs'
import { createNight, join, characterById } from '../lib/night.js'
import { hostCommand } from '../lib/run.js'
import {
  NIGHT, STATION_TEXT, FREE_TIME_TIPS, GROUP_TEXT, ACT4_CATS, CAT_ROOMS, CAT_NAMES, stationCard, freeTimeTip, lightsProgressOf, lightsPath,
} from '../lib/deal.js'
import { rehearsalCase } from '../lib/case.js'

// The Act 4 direction screens (docs/handoff-2026-10-22.md §6c) and the Host
// tab's Act 2 count. Every case is the dealer's throwaway rehearsal case in a
// fake Firestore, made and dropped here. Nothing is printed.

const NAMES = ['Jon', 'Jessa', 'Jacob', 'Marie', 'Pat', 'Sam', 'Lee', 'Ana']

async function party(n, now = 1_000_000) {
  const db = new FakeFirestore()
  db.store.set('meta/game', { host_jonathan: 'Jon', host_susan: 'Susan' })
  const { nightId } = await createNight(db)
  const uids = {}
  for (const name of NAMES.slice(0, n)) { const uid = `u-${name.toLowerCase()}`; await join(db, { uid, nightId, name }); uids[name.toLowerCase()] = uid }
  return { db, nightId, uids, now }
}
// the dealer's voice pools with nothing written in the workshop (deal.js voicePools)
const VOICE = { openers: () => [], closers: () => [], refusals: () => [], pools: {}, numbersLine: '', scrap: {} }
const cardsOf = (db, uid, kind) => (db.store.get(`sessions/${uid}`).cards ?? []).filter(c => c.kind === kind)

test('the group card names the others by character: "You\'re teamed up with ...", then "From now on, only share with your group."', async () => {
  const { db, nightId, uids, now } = await party(6)
  await hostCommand(db, { nightId, command: 'act', arg: 3, now })
  await hostCommand(db, { nightId, command: 'beat', arg: 'groups', now })
  const roster = db.store.get(`nights/${nightId}`).roster
  for (const [key, uid] of Object.entries(uids)) {
    const [card] = cardsOf(db, uid, 'group')
    assert.ok(card, `${key} has a group card`)
    const others = card.members.filter(m => m.key !== key)
    assert.equal(card.title, `You're teamed up with ${others.map(m => characterById(roster[m.key].characterId).name).join(' and ')}`)
    assert.equal(card.text, GROUP_TEXT)
    assert.equal(card.text, 'From now on, only share with your group.')
    for (const m of card.members) assert.ok(m.name && m.characterName, 'the list still pairs each real name with its character')
  }
})

test('the study card and Free time say the handoff\'s lines; Free time carries one of the five tips, the same for the whole group, from the case\'s secret salt', async () => {
  assert.equal(STATION_TEXT.study.text, "Granolia's expecting your group in the Study, upstairs.")
  assert.deepEqual(STATION_TEXT.checkin, { title: 'Free time', text: 'Nothing for your group right now. Grab a drink, stretch your legs.' })
  assert.equal(FREE_TIME_TIPS.length, 5)
  assert.ok(NIGHT.stations.some(s => s.key === 'checkin' && s.name === 'Free time'), 'the station key stays checkin; only its name changed')
  // the tip: seeded on the salt and the group, never on Math.random or the public night id
  const c = rehearsalCase({ nightId: 'n1', roster: [{ key: 'a' }, { key: 'b' }] })
  const c2 = { ...c, screenSalt: 'f'.repeat(32) }
  const seen = new Set()
  for (let g = 0; g < 60; g++) {
    const tip = freeTimeTip(c, `g${g}`, 'n1')
    assert.ok(FREE_TIME_TIPS.includes(tip))
    assert.equal(freeTimeTip(c, `g${g}`, 'n1'), tip, 'the same every time for the group')
    seen.add(tip)
  }
  assert.equal(seen.size, 5, 'every tip turns up across groups')
  assert.ok(Array.from({ length: 30 }, (_, g) => freeTimeTip(c, `g${g}`) !== freeTimeTip(c2, `g${g}`)).some(Boolean), 'another salt, other tips')
  // the cards themselves
  const db = new FakeFirestore()
  const study = await stationCard(db, { c, station: { key: 'study' }, act: 4, beat: 'station1', gid: 'g1', members: ['a', 'b'], levels: {}, voice: null, nightId: 'n1' })
  assert.equal(study.text, "Granolia's expecting your group in the Study, upstairs.")
  assert.equal(study.host.cat, 'granolia', 'her own line still goes under it')
  const free = await stationCard(db, { c, station: { key: 'checkin' }, act: 4, beat: 'station1', gid: 'g1', members: ['a', 'b'], levels: {}, voice: null, nightId: 'n1' })
  assert.equal(free.title, 'Free time')
  assert.equal(free.text, `Nothing for your group right now. Grab a drink, stretch your legs. ${freeTimeTip(c, 'g1', 'n1')}`)
  const written = await stationCard(db, { c, station: { key: 'checkin' }, act: 4, beat: 'station1', gid: 'g1', members: ['a', 'b'], levels: {}, voice: null, nightId: 'n1', over: { CHECKIN: 'Sit and compare.' } })
  assert.equal(written.text, `Sit and compare. ${freeTimeTip(c, 'g1', 'n1')}`, 'the workshop line replaces the main sentence; the tip still follows')
})

test('the Act 4 cat station never sends a group to Granolia or the Study: only Salem, Zimothy and Boo, each in their own room', async () => {
  assert.deepEqual([...ACT4_CATS].sort(), ['boo', 'salem', 'zimothy'])
  // every group, every rotation, across whole nights: no cat card names the Study
  const cats = new Set()
  for (let night = 0; night < 4; night++) {
    const { db, nightId, uids } = await party(8, 2_000_000 + night)
    let now = 2_000_000
    await hostCommand(db, { nightId, command: 'act', arg: 3, now })
    await hostCommand(db, { nightId, command: 'beat', arg: 'groups', now })
    await hostCommand(db, { nightId, command: 'act', arg: 4, now })
    for (let r = 0; r < 5; r++) {
      now += 60_000
      if (r) await hostCommand(db, { nightId, command: 'next', now })
    }
    for (const uid of Object.values(uids)) {
      for (const card of cardsOf(db, uid, 'station').filter(x => x.station === 'cat')) {
        cats.add(card.cat)
        assert.ok(ACT4_CATS.includes(card.cat), 'never Granolia, never Irwin')
        assert.notEqual(card.room, CAT_ROOMS.granolia)
        assert.ok(!/study/i.test(card.text) && !/study/i.test(card.room), 'no Act 4 cat card names the Study')
        assert.equal(card.text, `${CAT_NAMES[card.cat]} will see your group in ${CAT_ROOMS[card.cat]}. Go together.`)
      }
    }
  }
  assert.ok(cats.size >= 2, 'the cats are shared out')
  // a pick that would have been Granolia's under the old four-cat list lands on one of the three
  const c = rehearsalCase({ nightId: 'n2', roster: [{ key: 'a' }, { key: 'b' }] })
  const db = new FakeFirestore()
  for (let i = 0; i < 6; i++) {
    const card = await stationCard(db, { c, station: { key: 'cat' }, act: 4, beat: 'station2', gid: 'g1', members: ['a', 'b'], levels: {}, voice: VOICE, nightId: '', pick: () => i % 3 })
    assert.ok(ACT4_CATS.includes(card.cat))
    assert.ok(!card.text.includes('Study'))
  }
})

test('Act 2: the night doc counts the guests who have seen all four cats, and nothing else', async () => {
  assert.deepEqual(lightsProgressOf({ guests: { a: { step: 'done' }, b: { step: 'with' }, c: { step: 'wait' } } }), { done: 1, total: 3 })
  assert.deepEqual(lightsProgressOf(null), { done: 0, total: 0 })
  const { db, nightId } = await party(5)
  await hostCommand(db, { nightId, command: 'act', arg: 2, now: 1_000_000 })
  await hostCommand(db, { nightId, command: 'beat', arg: 'cat', now: 1_000_000 })
  const night = () => db.store.get(`nights/${nightId}`)
  assert.deepEqual(night().lightsProgress, { done: 0, total: 5 }, 'written when the line is made')
  const seen = []
  await walkLights(db, nightId, { check: () => seen.push({ ...night().lightsProgress }) })
  assert.deepEqual(night().lightsProgress, { done: 5, total: 5 })
  for (let i = 1; i < seen.length; i++) assert.ok(seen[i].done >= seen[i - 1].done, 'it only ever climbs')
  assert.deepEqual(Object.keys(night().lightsProgress).sort(), ['done', 'total'], 'a count only: never which cat or which hint')
  const state = db.store.get(lightsPath(nightId))
  assert.equal(night().lightsProgress.done, Object.values(state.guests).filter(g => g.step === 'done').length)
})
