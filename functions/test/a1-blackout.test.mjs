// A1 (11 Nov 2026): the blackout's timeline (Press, Dark, Power) and the Blackout test.
// A2: the Sound test plays any one cue.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { FakeFirestore } from './fake-firestore.mjs'
import { createNight, join } from '../lib/night.js'
import { hostCommand, BLACKOUT_POWER_MS, BLACKOUT_LEAD_MS, PAUSE_HELD } from '../lib/run.js'
import { blackoutMarks, blackoutStage, leadFrom, DEFAULT_LEAD_MS, ms } from '../lib/blackout.js'
import { HOST_COMMANDS } from '../lib/commands.js'

async function party() {
  const db = new FakeFirestore()
  db.store.set('meta/game', { host_jonathan: 'Jon', host_susan: 'Susan' })
  const { nightId } = await createNight(db)
  for (const [name, uid] of [['Jon', 'uid-jon'], ['Jessa', 'uid-jessa'], ['Jacob', 'uid-jacob'], ['Marie', 'uid-marie']]) await join(db, { uid, nightId, name })
  return { db, nightId }
}
const night = (db, id) => db.store.get(`nights/${id}`)
const sound = (db, id) => db.store.get(`nights/${id}/public/sounds`)?.current ?? null

test('the lead starts at 2000 ms and is read from the brain\'s sheet; the stages: press, dark, then nothing at the power', () => {
  const sheet = JSON.parse(readFileSync(new URL('../../cues/scenes.json', import.meta.url), 'utf8'))
  assert.equal(sheet.blackout.leadMs, 2000)
  assert.equal(BLACKOUT_LEAD_MS, 2000)
  assert.equal(leadFrom(null), DEFAULT_LEAD_MS)
  assert.equal(leadFrom({ blackout: { leadMs: 1500 } }), 1500)
  assert.equal(leadFrom({ blackout: { leadMs: 99_000 } }), 10_000, 'never more than ten seconds')
  assert.equal(leadFrom({ blackout: { leadMs: 'soon' } }), DEFAULT_LEAD_MS)
  assert.equal(BLACKOUT_POWER_MS, 5000, 'the dark is five seconds, as the client rule says')
  const m = blackoutMarks(10_000, { leadMs: 2000 })
  assert.deepEqual([ms(m.pressAt), ms(m.darkAt), ms(m.powerAt)], [10_000, 12_000, 17_000])
  assert.equal(m.test, false)
  assert.equal(blackoutStage(m, 9_999), null)
  assert.equal(blackoutStage(m, 10_000), 'press')
  assert.equal(blackoutStage(m, 11_999), 'press')
  assert.equal(blackoutStage(m, 12_000), 'dark')
  assert.equal(blackoutStage(m, 16_999), 'dark')
  assert.equal(blackoutStage(m, 17_000), null, 'the power returns on its own')
  assert.equal(blackoutStage(null, 12_000), null)
  // the cue sheet's copy goes with the functions, and the prompt leaves the music off
  assert.ok(JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')).scripts.seed.includes('../cues/scenes.json seed/'))
  assert.equal(sheet.phases.prompt.music, 'off', 'no music through the role cards: the jazz returns when Act 2\'s first beat turns to act')
})

test('the real blackout: Press writes the marks (the music stops), Dark the lead later (phase, TV, scream at the dark mark), Power five seconds after', async () => {
  const { db, nightId } = await party()
  const now = 3_000_000
  for (let i = 0; i < 5; i++) await hostCommand(db, { nightId, command: 'next', now })
  const seen = []
  const r = await hostCommand(db, { nightId, command: 'blackout', now, sleep: async waitMs => {
    const n = night(db, nightId)
    seen.push({ waitMs, phase: n.phase, marks: n.blackout && [ms(n.blackout.pressAt), ms(n.blackout.darkAt), ms(n.blackout.powerAt), n.blackout.test], sound: sound(db, nightId) && [sound(db, nightId).id, ms(sound(db, nightId).at)] })
  } })
  assert.deepEqual(r, { ok: true, powerReturned: true })
  const marks = [now, now + 2000, now + 7000, false]
  // since the review of 12 Nov 2026 the scream is in hand at the press, stamped for the dark mark (every page plays it then)
  assert.deepEqual(seen[0], { waitMs: BLACKOUT_LEAD_MS, phase: 'act', marks, sound: ['blackout', now + 2000] }, 'Press: the marks, still lit, the scream stamped for the dark')
  assert.deepEqual(seen[1], { waitMs: BLACKOUT_POWER_MS, phase: 'blackout', marks, sound: ['blackout', now + 2000] }, 'Dark: the phase and the scream, stamped at the dark mark')
  assert.equal(seen.length, 2)
  const n = night(db, nightId)
  assert.equal(n.phase, 'prompt'); assert.equal(n.act, 2)
  assert.equal(n.blackout, null, 'the marks come off with the power')
  assert.equal(db.store.get(`nights/${nightId}/public/screen`).kind, 'black')
})

test('a second press while one runs changes nothing; a pause in the lead means no dark at all; the test is refused on the party night', async () => {
  {
    const { db, nightId } = await party()
    const now = 4_000_000
    for (let i = 0; i < 5; i++) await hostCommand(db, { nightId, command: 'next', now })
    let second = null
    await hostCommand(db, { nightId, command: 'blackout', now, sleep: async waitMs => {
      if (waitMs === BLACKOUT_LEAD_MS) second = await hostCommand(db, { nightId, command: 'blackout', now: now + 500, sleep: () => { throw new Error('never waits') } })
    } })
    assert.deepEqual(second, { ok: true, already: true })
  }
  {
    const { db, nightId } = await party()
    const now = 5_000_000
    for (let i = 0; i < 5; i++) await hostCommand(db, { nightId, command: 'next', now })
    const r = await hostCommand(db, { nightId, command: 'blackout', now, sleep: waitMs => waitMs === BLACKOUT_LEAD_MS && hostCommand(db, { nightId, command: 'pause', now: now + 500 }) })
    assert.deepEqual(r, { ok: true, powerReturned: false, dark: false })
    const n = night(db, nightId)
    assert.equal(n.phase, 'paused'); assert.equal(n.act, 1); assert.equal(n.blackout, null, 'the marks come off')
    assert.equal(sound(db, nightId)?.id ?? null, null, 'no scream')
    assert.equal(db.store.get(`cases/${nightId}`), undefined)
  }
  {
    const { db, nightId } = await party()
    db.store.set(`nights/${nightId}`, { ...night(db, nightId), rehearsal: false, forceRehearsal: false })
    await assert.rejects(hostCommand(db, { nightId, command: 'blackout-test', now: 1, sleep: () => {} }), /practice night only/)
  }
})

test('the Blackout test: the same marks with test on, the scream at the dark, and nothing else moves; again and again', async () => {
  const { db, nightId } = await party()
  let now = 6_000_000
  for (let i = 0; i < 2; i++) await hostCommand(db, { nightId, command: 'next', now })
  const before = night(db, nightId)
  assert.equal(before.act, 1); assert.equal(before.beat, 'rules')
  const screenBefore = JSON.stringify(db.store.get(`nights/${nightId}/public/screen`))
  for (let press = 0; press < 3; press++) {
    const seen = []
    const r = await hostCommand(db, { nightId, command: 'blackout-test', now, sleep: async waitMs => {
      const n = night(db, nightId)
      seen.push({ waitMs, phase: n.phase, test: n.blackout?.test, dark: ms(n.blackout?.darkAt), sound: sound(db, nightId) && ms(sound(db, nightId).at) })
    } })
    assert.deepEqual(r, { ok: true, test: true })
    assert.deepEqual(seen.map(s => s.waitMs), [BLACKOUT_LEAD_MS, BLACKOUT_POWER_MS])
    assert.ok(seen.every(s => s.phase === 'act' && s.test === true && s.dark === now + 2000), 'the phase never changes')
    assert.equal(seen[1].sound, now + 2000, 'the scream at the dark mark')
    const n = night(db, nightId)
    assert.equal(n.act, 1); assert.equal(n.beat, 'rules'); assert.equal(n.phase, 'act'); assert.equal(n.blackout, null)
    assert.equal(db.store.get(`cases/${nightId}`), undefined, 'no case dealt')
    assert.equal(JSON.stringify(db.store.get(`nights/${nightId}/public/screen`)), screenBefore, 'the TV\'s screen is untouched')
    now += 30_000
  }
  assert.ok(PAUSE_HELD.has('blackout-test'))
  assert.ok(HOST_COMMANDS.some(c => c.name === 'blackout-test'))
})

test('A2: the Sound test plays the cue named, the chime with none, and refuses a name it does not know', async () => {
  const { db, nightId } = await party()
  assert.deepEqual(await hostCommand(db, { nightId, command: 'sound-test', arg: 'sting-door', now: 1000 }), { ok: true, sound: 'sting-door' })
  assert.equal(sound(db, nightId).id, 'sting-door')
  assert.deepEqual(await hostCommand(db, { nightId, command: 'sound-test', now: 2000 }), { ok: true, sound: 'chime-phone' })
  await assert.rejects(hostCommand(db, { nightId, command: 'sound-test', arg: 'bulletin2-opening', now: 3000 }), /No such sound/)
})
