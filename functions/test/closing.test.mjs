// The close of the night (handoff 11 Nov 2026, C1): the credits' last places
// on the server, and the host's Good night. A throwaway night; no case is read.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { FakeFirestore } from './fake-firestore.mjs'
import { createNight } from '../lib/night.js'
import { hostCommand } from '../lib/run.js'
import { goodNight, SPECIAL_THANKS, DEDICATION } from '../lib/closing.js'
import { HOST_COMMANDS } from '../lib/commands.js'
import { beatSpec } from '../lib/deal.js'

const SEED = JSON.parse(readFileSync(new URL('../../seed/credits.json', import.meta.url), 'utf8'))

async function atTheEnd({ over = true } = {}) {
  const db = new FakeFirestore()
  db.store.set('meta/game', { host_jonathan: 'Jon', host_susan: 'Susan' })
  const { nightId } = await createNight(db)
  const ref = `nights/${nightId}`
  db.store.set(ref, { ...db.store.get(ref), act: 7, beat: over ? 'end' : 'result', phase: 'act', ...(over ? { over: true, overAt: new Date(1) } : {}) })
  return { db, nightId, night: () => db.store.get(ref) }
}

test('the credits\' last places come from the seed: Special thanks empty until Jon\'s lines, then the dedication in his words', () => {
  assert.deepEqual([...SPECIAL_THANKS], SEED.specialThanks.map(s => s.trim()).filter(Boolean))
  assert.equal(DEDICATION.line, 'For Sydney, The Best Big Brother A Pup Could Ask For', 'exactly as Jon wrote it, 12 Nov 2026')
  assert.equal(DEDICATION.photo, 'household/sydney.jpg')
  const finale = readFileSync(new URL('../lib/finale.js', import.meta.url), 'utf8')
  assert.ok(finale.includes('thanks: [...THANKS, ...people.map(p => p.guest.name)], special: [...SPECIAL_THANKS], dedication: { ...DEDICATION }, last: LAST_CARD'), 'in order: thanks, special, the dedication, the last card')
  assert.ok(!finale.includes('IN_MEMORY'), 'one dedication, not two')
  const pkg = readFileSync(new URL('../package.json', import.meta.url), 'utf8')
  assert.ok(pkg.includes('../seed/credits.json'), 'npm run seed copies it')
})

test('The End is not black on the brain\'s sheet: the Default lights, the projector as it was at the vote', () => {
  const sheet = JSON.parse(readFileSync(new URL('../../cues/scenes.json', import.meta.url), 'utf8'))
  const end = sheet.acts['7'].beats.end
  assert.equal(end.hue, 'Murderwin Default')
  assert.equal(end.projector, undefined, 'the projector keeps the act\'s setting, on, as at the vote')
  assert.equal(sheet.acts['7'].projector, 'on')
  assert.equal(beatSpec(7, 'end').action, 'end')
})

test('Good night: refused before The End, once after it, and a second press changes nothing', async () => {
  const before = await atTheEnd({ over: false })
  await assert.rejects(() => hostCommand(before.db, { nightId: before.nightId, command: 'good-night', now: 5 }), /The End first/)
  assert.equal(before.night().goodNight, undefined)

  const { db, nightId, night } = await atTheEnd()
  assert.deepEqual(await hostCommand(db, { nightId, command: 'good-night', now: 10 }), { ok: true, goodNight: true })
  assert.equal(night().goodNight, true)
  const stamped = night().goodNightAt
  assert.ok(stamped)
  assert.equal(night().beat, 'end', 'the night stays on The End: every screen keeps it')
  assert.equal(night().over, true)
  assert.deepEqual(await hostCommand(db, { nightId, command: 'good-night', now: 20 }), { ok: true, goodNight: true, already: true }, 'twice is safe')
  assert.deepEqual(night().goodNightAt, stamped, 'the first time stands')
  assert.deepEqual(await goodNight(db, nightId, { now: 30 }), { ok: true, goodNight: true, already: true })
  // a rehearsal's Back from The End opens the night again, Good night with it
  await hostCommand(db, { nightId, command: 'back', now: 40 })
  assert.equal(night().beat, 'result')
  assert.equal(night().over, undefined)
  assert.equal(night().goodNight, undefined)
  assert.equal(night().goodNightAt, undefined)
})

test('Good night is one line in the host\'s command list', () => {
  assert.equal(HOST_COMMANDS.filter(c => c.name === 'good-night').length, 1)
})
