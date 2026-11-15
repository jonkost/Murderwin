// G46 with a late guest (14 Nov 2026): a guest who joins while the cats are receiving (Act 2), or after
// the groups are made (Act 4), never changes the bag words planned for anyone else. One guest, one true
// word about the Murderer's bag; one group, one true word about the Ghost's bag. Practice nights dealt
// from seed words, so every run is the same. Counts and booleans only: no word, bag or role is printed.
import test from 'node:test'
import assert from 'node:assert/strict'
import { FakeFirestore } from './fake-firestore.mjs'
import { createNight, join } from '../lib/night.js'
import { hostCommand, player, studyFinished } from '../lib/run.js'
import { lightsPath, ms } from '../lib/deal.js'
import { packingFor } from '../lib/bags.js'
import { bagPlan } from '../lib/bagclues.js'
import { studyPath, rotationPath } from '../lib/station.js'

const NAMES = ['Jon', 'Susan', 'Ada', 'Bea', 'Cal', 'Dot', 'Eli', 'Fay', 'Gus', 'Hal']
const bagsOf = (roster, keep = () => true) => [...new Set(Object.entries(roster).filter(([k]) => keep(k)).map(([, r]) => Number(r.bag)))]
const trueWords = per => new Set(Object.values(per ?? {}).filter(l => l.word && l.right).map(l => l.word))

async function wave(db, nightId, now) {
  const uids = db.store.get(`nights/${nightId}/private/deck`).uids
  let n = 0
  for (const [key, g] of Object.entries(db.store.get(lightsPath(nightId)).guests)) {
    if (g.step !== 'go') continue
    await player.meetCat(db, { nightId, uid: uids[key], cat: g.cat, now })
    await player.leaveCat(db, { nightId, uid: uids[key], now })
    n++
  }
  return n
}

test('G46 a guest who joins late never gives another guest, or a group, a second true word about a bag', async () => {
  let moved2 = 0, moved4 = 0
  for (const i of [15, 27, 28, 40]) { // seed words on which the late bag moves a word (found 14 Nov 2026)
    const db = new FakeFirestore()
    db.store.set('meta/game', { host_jonathan: 'Jon', host_susan: 'Susan' })
    const { nightId } = await createNight(db, { forceRehearsal: true, seed: `latebag-${i}` })
    for (let k = 0; k < 8; k++) await join(db, { uid: `u${k}`, nightId, name: NAMES[k] })
    let now = 5_000_000
    const host = (command, arg) => hostCommand(db, { nightId, command, arg, now, sleep: () => {} })
    const nd = () => db.store.get(`nights/${nightId}`)
    for (let k = 0; k < 5; k++) await host('next')
    await host('blackout')
    await host('next'); await host('next'); await host('next') // the news, the peek, the cats
    await wave(db, nightId, now)
    const seated = Object.keys(nd().roster)
    await join(db, { uid: 'u8', nightId, name: NAMES[8] }) // arrives while the cats are receiving
    await host('tick') // and is given a route
    for (let guard = 0; guard < 60; guard++) if (!(await wave(db, nightId, now))) { await host('tick'); if (!(await wave(db, nightId, now))) break }
    assert.equal(nd().beat, 'supper')
    const c = db.store.get(`cases/${nightId}`)
    const packing = await packingFor(db, c)
    const roster = nd().roster
    for (const k of seated) {
      assert.ok(trueWords(c.bagClues.act2[k]).size <= 1, 'one guest, one true word about the Murderer\'s bag')
      const plan = inPlay => bagPlan(packing, { bag: roster[c.murderer].bag, inPlay, seed: `${c.screenSalt}\u0000bag\u0000${k}` })?.truth ?? null
      if (plan(bagsOf(roster, x => seated.includes(x))) !== plan(bagsOf(roster))) moved2++
    }
    // Act 4: a guest who first comes after the groups are made
    await host('next'); await host('next') // phones down; the bulletin is armed
    now = ms(db.store.get(`nights/${nightId}/private/bulletin`).dueAt)
    await host('tick')
    await host('next') // the dinner wrap-up
    await host('start-act4')
    await host('next') // the group cards
    for (const uid of Object.values(db.store.get(`nights/${nightId}/private/deck`).uids)) await player.lockIn(db, { nightId, uid, now })
    assert.equal(nd().beat, 'round1')
    const grouped = Object.keys(nd().roster)
    for (let guard = 0; guard < 8 && nd().act === 4; guard++) {
      const due = db.store.get(studyPath(nightId))?.groupId ?? null
      if (due && !db.store.get(rotationPath(nightId)).finished?.[due]) await studyFinished(db, { nightId, payload: { groupId: due, outcome: 'solved', seconds: 300, pairs: 3 }, now })
      await host('next') // the chime
      if (guard === 0) await join(db, { uid: 'u9', nightId, name: NAMES[9] })
    }
    assert.equal(nd().act, 5)
    const c4 = db.store.get(`cases/${nightId}`)
    const all = nd().roster
    for (const g of db.store.get(rotationPath(nightId)).groups) {
      assert.ok(trueWords(c4.bagClues.act4[g.id]).size <= 1, 'one group, one true word about the Ghost\'s bag')
      const plan = inPlay => bagPlan(packing, { bag: all[c4.ghost].bag, inPlay, seed: `${c4.screenSalt}\u0000bag4\u0000${g.id}` })?.truth ?? null
      if (plan(bagsOf(all, x => grouped.includes(x))) !== plan(bagsOf(all))) moved4++
    }
  }
  // the test means something: on some of these nights the late bag would have moved a word
  assert.ok(moved2 > 0, `a late bag moves some guest's word (${moved2})`)
  assert.ok(moved4 > 0, `a late bag moves some group's word (${moved4})`)
})
