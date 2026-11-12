import { test } from 'node:test'
import assert from 'node:assert/strict'
import { FakeFirestore } from './fake-firestore.mjs'
import { join, nameKey } from '../lib/night.js'
import { hostCommand, clockTick } from '../lib/run.js'
import { parlourPath, dueSlot, tickParlour } from '../lib/windows.js'

// The repairs after the review of the review (12 Nov 2026). Throwaway rehearsals in a fake Firestore;
// assertions are about keys, beats and flags, never about what a seat was dealt.

const T0 = Date.parse('2026-11-12T23:00:00Z')
const nightOf = (db, id) => db.store.get(`nights/${id}`)
const host = (db, nightId, command, arg, now = T0) => hostCommand(db, { nightId, command, arg, now })

async function inActSix() {
  const db = new FakeFirestore()
  db.store.set('meta/game', { host_jonathan: 'Jon', host_susan: 'Susan' })
  const started = await hostCommand(db, { command: 'create', arg: { real: false, introAt: T0 + 5 * 60_000, fillIns: 6 }, now: T0 })
  const nightId = started.nightId
  for (const name of ['Jon', 'Sue']) await join(db, { uid: `u-${nameKey(name)}`, nightId, name })
  await host(db, nightId, 'act', 2)
  await host(db, nightId, 'act', 6)
  const n = nightOf(db, nightId)
  assert.equal(`${n.act}/${n.beat}`, '6/games')
  assert.equal(n.window?.beat, 'p0', 'game one opened with the act')
  return { db, nightId, first: n.window }
}

test('R1 dueSlot back to back counts only the game just before, never an older one', () => {
  const sched = { act: 6, count: 2, due0: new Date(0), due1: new Date(90_000), fired: { 0: true }, lastAt: new Date(0) }
  assert.equal(dueSlot(sched, { now: 10_000, gapMs: 90_000, backToBack: true, closedBeat: 'p0' }), 1)
  assert.equal(dueSlot(sched, { now: 10_000, gapMs: 90_000, backToBack: true, closedBeat: 'p4' }), null, 'a game of Act 2 that closed on its last answer is not game one')
  assert.equal(dueSlot(sched, { now: 10_000, gapMs: 90_000, backToBack: true }), null)
})

test('R1 Act 6: while game one is still being opened, an Act 2 game left closed and all in does not open game two', async () => {
  const { db, nightId, first } = await inActSix()
  const sched = db.store.get(parlourPath(nightId))
  // game one claimed, its window not yet written: the night still shows Act 2's last game, closed on its last answer
  db.store.set(parlourPath(nightId), { ...sched, fired: { 0: true }, lastAt: new Date(T0 + 1_000), due1: new Date(T0 + 3_600_000), closed: false })
  db.store.set(`nights/${nightId}`, { ...nightOf(db, nightId), window: { id: 'questions-2-p4', kind: 'questions', act: 2, beat: 'p4', settled: true, allIn: true } })
  const r = await tickParlour(db, nightId, T0 + 2_000)
  assert.equal(r.opened, false, 'game two waits')
  assert.ok(!db.store.get(parlourPath(nightId)).fired?.[1])
  // game one's own window, closed on its last answer: game two follows at once
  db.store.set(`nights/${nightId}`, { ...nightOf(db, nightId), window: { ...first, settled: true, allIn: true } })
  const r2 = await tickParlour(db, nightId, T0 + 3_000)
  assert.equal(r2.opened, true)
  assert.equal(r2.slot, 1)
})

test('R2 Act 6: a clock while game two is still being opened does not start the drawing; once game two has closed, it does', async () => {
  const { db, nightId, first } = await inActSix()
  const sched = db.store.get(parlourPath(nightId))
  // game two claimed (both fired), its window not yet written: the night still shows game one, closed
  db.store.set(parlourPath(nightId), { ...sched, fired: { 0: true, 1: true }, closed: false })
  db.store.set(`nights/${nightId}`, { ...nightOf(db, nightId), window: { ...first, settled: true, allIn: true } })
  const r = await clockTick(db, nightId, T0 + 5_000)
  assert.equal(r.moved, null)
  assert.equal(nightOf(db, nightId).beat, 'games', 'no drawing under game two')
  assert.ok(!db.store.get(parlourPath(nightId)).closed)
  // game two's window written and closed: the next clock starts the drawing
  db.store.set(`nights/${nightId}`, { ...nightOf(db, nightId), window: { ...first, id: 'questions-6-p1', beat: 'p1', settled: true } })
  const r2 = await clockTick(db, nightId, T0 + 6_000)
  assert.equal(r2.moved, 'drawing')
  assert.equal(nightOf(db, nightId).beat, 'drawing')
})
