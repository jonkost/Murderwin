import { test } from 'node:test'
import assert from 'node:assert/strict'
import { FakeFirestore } from './fake-firestore.mjs'
import { createNight, publishContent, PLAYER_AREAS } from '../lib/night.js'

// The copy of the workshop lines the phones and room screens read. Safe
// content only; every line here is a bracketed stand-in.

function seeded() {
  const db = new FakeFirestore()
  db.store.set('meta/game', { host_jonathan: 'Jon', host_susan: 'Susan' })
  db.store.set('safe_content/study_lines', { items: [{ id: 'a', text: 'SLOW: (a study line)', deleted: false, order: 0 }] })
  db.store.set('safe_content/station_text', { items: [{ id: 'b', text: 'BAGS: (a bags line with [PROPERTY] in [COUNT])', deleted: false, order: 0 }] })
  db.store.set('safe_content/echo_frames', { items: [{ id: 'c', text: '...(before) ███ (after)...', deleted: false, order: 0 }, { id: 'c2', text: 'gone', deleted: true, order: 1 }] })
  db.store.set('safe_content/epilogue_frames', { items: [{ id: 'd', text: '(And so it was [MURDERER], for [MOTIVE_RHYME]; [VICTIM] is missed.)', deleted: false, order: 0 }] })
  db.store.set('safe_content/ui_copy', { items: [{ id: 'e', text: 'NUMBERS: (the numbers were [A], [B] and [C])', deleted: false, order: 0 }] })
  return db
}

test('publishContent copies the four room-screen lists along with the phone lists', async () => {
  const db = seeded()
  const { nightId } = await createNight(db)
  const content = db.store.get(`nights/${nightId}/public/content`)
  for (const area of ['study_lines', 'echo_frames', 'epilogue_frames', 'station_text']) {
    assert.ok(PLAYER_AREAS.includes(area), `${area} is a player area`)
    assert.ok(Array.isArray(content[area]), `${area} is published`)
  }
  assert.equal(content.study_lines[0].text, 'SLOW: (a study line)')
  assert.equal(content.echo_frames.length, 1, 'a deleted line is not published')
  assert.equal(content.ui_copy[0].text, 'NUMBERS: (the numbers were [A], [B] and [C])')
  const r = await publishContent(db, nightId)
  assert.equal(r.areas, PLAYER_AREAS.length)
  assert.equal(r.lines, 5)
})

test('frozen: publishContent changes nothing for a night that has its copy, and logs one count line', async () => {
  const db = seeded()
  const { nightId } = await createNight(db)
  const path = `nights/${nightId}/public/content`
  const before = JSON.stringify(db.store.get(path))
  const version = db.versions.get(path)
  db.store.set('meta/game', { ...db.store.get('meta/game'), frozenAt: new Date(1_700_000_000_000) })
  // a workshop edit after the freeze
  db.store.set('safe_content/study_lines', { items: [{ id: 'a', text: 'SLOW: (changed after the freeze)', deleted: false, order: 0 }] })
  const lines = []
  const r = await publishContent(db, nightId, { log: l => lines.push(l) })
  assert.deepEqual(r, { areas: 0, lines: 0, frozen: true })
  assert.equal(JSON.stringify(db.store.get(path)), before, 'the phones keep the frozen copy')
  assert.equal(db.versions.get(path), version, 'not even rewritten in place')
  assert.equal(lines.length, 1)
  assert.ok(lines[0].includes('"frozen":true') && !lines[0].includes('changed after'))
  // the host's Resend button and a join go through the same door
  const again = await publishContent(db, nightId)
  assert.equal(again.frozen, true)
  // a brand-new night started while frozen still gets its one copy
  const second = await createNight(db)
  assert.ok(db.store.get(`nights/${second.nightId}/public/content`), 'a new night has content')
  assert.equal(second.lines, 5)
  // unfreeze: the next publish copies again
  db.store.set('meta/game', { ...db.store.get('meta/game'), frozenAt: null })
  const thawed = await publishContent(db, nightId, { log: () => {} })
  assert.equal(thawed.frozen, undefined)
  assert.equal(db.store.get(path).study_lines[0].text, 'SLOW: (changed after the freeze)')
})
