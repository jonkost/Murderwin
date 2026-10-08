import { test } from 'node:test'
import assert from 'node:assert/strict'
import { FakeFirestore } from './fake-firestore.mjs'
import {
  createNight, join, hostCommand, canHost, rollAffection, nameKey,
  CHARACTERS, AFFECTION_MODS, CATS,
} from '../lib/night.js'

function seeded(hosts = { host_jonathan: 'Jon', host_susan: 'Susan' }) {
  const db = new FakeFirestore()
  db.store.set('meta/game', hosts)
  db.store.set('safe_content/rules_text', { items: [{ id: 'r1', text: 'The ghost rule — one of us died.', deleted: false, order: 0 }] })
  db.store.set('safe_content/bios', { items: [{ id: 'b1', text: 'gone', deleted: true, order: 0 }] })
  return db
}


test('typed names become keys that are safe for field paths and tolerant of spacing and case', () => {
  assert.equal(nameKey("Marie's fiancé René"), 'marie_s_fianc_ren')
  assert.equal(nameKey('  JON '), 'jon')
  assert.equal(nameKey(''), '')
})

test('createNight deals a private deck, publishes content, and goes live', async () => {
  const db = seeded()
  const r = await createNight(db, { label: 'Dry run' })
  const night = db.store.get(`nights/${r.nightId}`)
  assert.equal(night.act, 0)
  assert.equal(night.phase, 'lobby')
  assert.equal(night.joinOpen, true)
  assert.deepEqual(night.hosts, { jonathan: { name: 'Jon', key: 'jon' }, susan: { name: 'Susan', key: 'susan' } })
  const deck = db.store.get(`nights/${r.nightId}/private/deck`)
  assert.equal(deck.order.length, 12, 'twelve non-Professor characters in the draw')
  assert.equal(new Set(deck.order).size, 12)
  assert.equal(deck.bags.length, 14, 'one bag number per possible character')
  assert.equal(db.store.get('public_state/active').nightId, r.nightId)
  const content = db.store.get(`nights/${r.nightId}/public/content`)
  assert.equal(content.motives.length, 19)
  assert.equal(content.characters.length, 14)
  assert.ok(!('trace' in content.characters[0]), 'traces never leave the server')
  assert.equal(content.rules_text.length, 1)
  assert.equal(content.bios.length, 0, 'deleted lines are not published')
})

test('join: hosts get the Professors, everyone else draws from the deck, bags are unique', async () => {
  const db = seeded()
  const { nightId } = await createNight(db)
  const deck = db.store.get(`nights/${nightId}/private/deck`)
  const jon = await join(db, { uid: 'u-jon', nightId, name: 'Jon' })
  assert.equal(jon.characterId, 'prof-jonathan')
  const susan = await join(db, { uid: 'u-susan', nightId, name: 'Susan' })
  assert.equal(susan.characterId, 'prof-susan')
  const jessa = await join(db, { uid: 'u-jessa', nightId, name: 'Jessa' })
  assert.equal(jessa.characterId, deck.order[0])
  const jacob = await join(db, { uid: 'u-jacob', nightId, name: 'Jacob' })
  assert.equal(jacob.characterId, deck.order[1])
  const night = db.store.get(`nights/${nightId}`)
  const bags = Object.values(night.roster).map(r => r.bag)
  assert.equal(new Set(bags).size, 4)
  const s = db.store.get('sessions/u-jessa')
  assert.equal(s.status, 'active')
  assert.equal(s.host, null)
  assert.equal(db.store.get('sessions/u-jon').host, 'jonathan')
  assert.equal(db.store.get('sessions/u-susan').host, 'susan')
  assert.equal(s.affection.irwin, 5)
  assert.ok(CATS.every(c => s.affection[c] >= 1 && s.affection[c] <= 5))
})

test('join: same phone again resumes; same phone as somebody else is refused', async () => {
  const db = seeded()
  const { nightId } = await createNight(db)
  const first = await join(db, { uid: 'u1', nightId, name: 'Jessa' })
  const again = await join(db, { uid: 'u1', nightId, name: 'Jessa' })
  assert.equal(again.resumed, true)
  assert.equal(again.characterId, first.characterId)
  await assert.rejects(join(db, { uid: 'u1', nightId, name: 'Jacob' }), e => e.code === 'already-joined')
})

test('join: the same guest on a new phone takes the character with them', async () => {
  const db = seeded()
  const { nightId } = await createNight(db)
  const first = await join(db, { uid: 'old-phone', nightId, name: 'Stanley' })
  const oldSession = db.store.get('sessions/old-phone')
  const second = await join(db, { uid: 'new-phone', nightId, name: 'Stanley' })
  assert.equal(second.characterId, first.characterId)
  assert.equal(db.store.get('sessions/old-phone').status, 'superseded')
  const newSession = db.store.get('sessions/new-phone')
  assert.equal(newSession.status, 'active')
  assert.equal(newSession.bag, oldSession.bag)
  assert.deepEqual(newSession.affection, oldSession.affection, 'affection never changes, even across phones')
  assert.equal(Object.keys(db.store.get(`nights/${nightId}`).roster).length, 1)
})

test('join: unknown name, closed doors, and a full house are refused in words', async () => {
  const db = seeded()
  const { nightId } = await createNight(db)
  await assert.rejects(join(db, { uid: 'x', nightId, name: '   ' }), e => e.code === 'invalid')
  await assert.rejects(join(db, { uid: 'x', nightId, name: 'A'.repeat(31) }), e => e.code === 'invalid')
  await hostCommand(db, { nightId, command: 'join-close' })
  await assert.rejects(join(db, { uid: 'x', nightId, name: 'Jessa' }), e => e.code === 'closed')
  await hostCommand(db, { nightId, command: 'join-open' })
  // thirteen non-host guests: the thirteenth finds no character left
  
  const db2 = seeded()
  const n2 = await createNight(db2)
  for (let i = 1; i <= 12; i++) await join(db2, { uid: `u${i}`, nightId: n2.nightId, name: `Guest ${i}` })
  await assert.rejects(join(db2, { uid: 'u13', nightId: n2.nightId, name: 'Guest 13' }), e => e.code === 'full')
})

test('rollAffection: Irwin maxed, values 1–5, always one friendly cat', () => {
  for (const profession of Object.keys(AFFECTION_MODS)) {
    for (let i = 0; i < 200; i++) {
      const a = rollAffection(profession)
      assert.equal(a.irwin, 5)
      assert.ok(CATS.every(c => a[c] >= 1 && a[c] <= 5), profession)
      assert.ok(CATS.some(c => a[c] >= 4), `${profession} must have a friendly cat`)
    }
  }
  assert.equal(CHARACTERS.length, 14)
  assert.ok(CHARACTERS.every(c => AFFECTION_MODS[c.profession]), 'every profession has an affection row')
})

test('hostCommand: acts, blackout, power, pause and resume move the night', async () => {
  const db = seeded()
  const { nightId } = await createNight(db)
  const read = () => db.store.get(`nights/${nightId}`)
  await hostCommand(db, { nightId, command: 'act', arg: 1 })
  assert.equal(read().act, 1); assert.equal(read().phase, 'act')
  await hostCommand(db, { nightId, command: 'blackout' })
  assert.equal(read().phase, 'blackout')
  await hostCommand(db, { nightId, command: 'power' })
  assert.equal(read().act, 2); assert.equal(read().phase, 'prompt')
  await hostCommand(db, { nightId, command: 'pause' })
  assert.equal(read().phase, 'paused'); assert.equal(read().pausedFrom, 'prompt')
  await hostCommand(db, { nightId, command: 'resume' })
  assert.equal(read().phase, 'prompt')
  await assert.rejects(hostCommand(db, { nightId, command: 'act', arg: 9 }), e => e.code === 'invalid')
  await assert.rejects(hostCommand(db, { nightId, command: 'dance' }), e => e.code === 'invalid')
  const r = await hostCommand(db, { nightId, command: 'refresh-hosts' })
  assert.equal(r.ok, true)
})

test('canHost: hosts run the night from their phones; the first night can start from any phone', async () => {
  const db = seeded()
  // nothing live yet: anyone may start the night, nobody may run it
  assert.equal(await canHost(db, { uid: 'anyone', command: 'create' }), true)
  assert.equal(await canHost(db, { uid: 'anyone', command: 'act' }), false)
  assert.equal(await canHost(db, { uid: null, command: 'create' }), false)
  assert.equal(await canHost(db, { uid: null, isAdmin: true, command: 'act' }), true)
  const { nightId } = await createNight(db)
  await join(db, { uid: 'u-jon', nightId, name: 'Jon' })
  await join(db, { uid: 'u-jessa', nightId, name: 'Jessa' })
  assert.equal(await canHost(db, { uid: 'u-jon', nightId, command: 'act' }), true)
  assert.equal(await canHost(db, { uid: 'u-jon', nightId, command: 'create' }), true)
  assert.equal(await canHost(db, { uid: 'u-jessa', nightId, command: 'act' }), false)
  assert.equal(await canHost(db, { uid: 'u-jessa', nightId, command: 'create' }), false, 'once a night is live only a host may start another')
  assert.equal(await canHost(db, { uid: 'stranger', nightId, command: 'blackout' }), false)
  assert.equal(await canHost(db, { uid: 'u-jon', nightId: 'some-other-night', command: 'act' }), false)
  // the host's phone dies and they rejoin on another: the old phone loses the buttons
  await join(db, { uid: 'u-jon-2', nightId, name: 'Jon' })
  assert.equal(await canHost(db, { uid: 'u-jon', nightId, command: 'act' }), false)
  assert.equal(await canHost(db, { uid: 'u-jon-2', nightId, command: 'act' }), true)
})

test('join: host names come from the settings form, any spelling of case or spaces', async () => {
  const db = seeded({ host_jonathan: 'Jonathan K', host_susan: '' })
  const { nightId } = await createNight(db)
  const jon = await join(db, { uid: 'u1', nightId, name: '  jonathan   k ' })
  assert.equal(jon.characterId, 'prof-jonathan')
  assert.equal(db.store.get('sessions/u1').guestName, 'jonathan k')
  const susan = await join(db, { uid: 'u2', nightId, name: 'Susan' })
  assert.equal(susan.characterId, 'prof-susan', 'an empty host field falls back to the default name')
  const other = await join(db, { uid: 'u3', nightId, name: 'Jon' })
  assert.notEqual(other.characterId, 'prof-jonathan', 'a name that is not the host name is just a guest')
})
