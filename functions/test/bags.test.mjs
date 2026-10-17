import { test } from 'node:test'
import assert from 'node:assert/strict'
import { FakeFirestore } from './fake-firestore.mjs'
import { createNight, join } from '../lib/night.js'
import { hostCommand } from '../lib/run.js'
import { NIGHT } from '../lib/deal.js'
import { firstProperty, propertyForClue, bagsClue, bagsText, readPacking } from '../lib/bags.js'

// SEAL. The packing here is synthetic: bracketed property names, bag
// numbers made up in the test, tied to no item and gone with the process.
// The case is the dealer's own throwaway rehearsal case with its flag
// flipped so the real path runs; nothing in it is printed.

const PACKING = {
  properties: { '(prop a)': [1, 2], '(prop b)': [3, 4, 5], '(prop c)': [2, 6], '(prop d)': [7, 8, 9], '(prop lone)': [10], '(prop many)': [1, 2, 3, 4] },
  bags: {}, packedAt: new Date(0), packedBy: 'packer',
}

test('the first property of a bag line is the clue word: "minty; sound: rattles" gives minty', () => {
  assert.equal(firstProperty('Tin of Altoids — smell: minty; sound: rattles'), 'minty')
  assert.equal(firstProperty('Glass marble — touch: Cold and smooth'), 'cold and smooth')
  assert.equal(firstProperty('Just an item'), '')
  assert.equal(firstProperty('Thing — smell'), '')
})

test('propertyForClue: a property in two or three bags, one of them the murderer\'s or the victim\'s, and the count matches the words', () => {
  const seen = new Set()
  for (let i = 0; i < 300; i++) {
    const got = propertyForClue(PACKING, { prefer: [2, 9] })
    assert.ok(got, 'something is picked')
    const bags = PACKING.properties[got.property]
    assert.ok(bags.length === 2 || bags.length === 3, 'never one bag, never four')
    assert.ok(bags.includes(2) || bags.includes(9), 'points at a hidden role\'s bag')
    assert.equal(got.count, bags.length)
    assert.equal(got.pointed, true)
    seen.add(got.property)
    const text = bagsText(got.property, got.count)
    assert.ok(text.includes(got.count === 2 ? 'two of the bags' : 'three of the bags'))
    assert.ok(!/\d/.test(text), 'never a bag number')
  }
  assert.deepEqual([...seen].sort(), ['(prop a)', '(prop c)', '(prop d)'])
  // nobody's bag in the packing: any two-or-three property, never the lone or the four
  const loose = new Set()
  for (let i = 0; i < 200; i++) { const g = propertyForClue(PACKING, { prefer: [11, 12] }); loose.add(g.property); assert.equal(g.pointed, false) }
  assert.deepEqual([...loose].sort(), ['(prop a)', '(prop b)', '(prop c)', '(prop d)'])
  assert.equal(propertyForClue({ properties: { x: [1] } }), null)
  assert.equal(propertyForClue(null), null)
  // a workshop sentence with the two slots, and one without them
  assert.equal(bagsText('(p)', 3, 'BAGS line: [PROPERTY] in [COUNT] bags.'), 'BAGS line: (p) in three bags.')
  assert.ok(bagsText('(p)', 2, 'no slots here').startsWith('Something (p) is in two'))
  assert.ok(bagsText('(p)', null).includes('two or three'))
})

test('bagsClue: the real path reads the packing; a rehearsal or a night with no packing draws from the bag items with placeholder', async () => {
  const db = new FakeFirestore()
  db.store.set('safe_content/bag_items', { items: [
    { id: 'i1', text: '(item one) — smell: (rehearsal minty); sound: (rehearsal rattles)', deleted: false, order: 0 },
    { id: 'i2', text: '(item two) — touch: (rehearsal rough)', deleted: false, order: 1 },
    { id: 'i3', text: 'gone — smell: (never)', deleted: true, order: 2 },
  ] })
  const roster = { jon: { bag: 2 }, jessa: { bag: 9 } }
  // no packing yet: rehearsal path even for a real case
  for (let i = 0; i < 30; i++) {
    const r = await bagsClue(db, { c: { rehearsal: false, murderer: 'jon', ghost: 'jessa' }, roster })
    assert.equal(r.placeholder, true)
    assert.ok(['(rehearsal minty)', '(rehearsal rough)'].includes(r.property), 'first property only, never a deleted line')
    assert.equal(r.count, null)
  }
  db.store.set('sealed/bags', PACKING)
  assert.ok(await readPacking(db))
  for (let i = 0; i < 30; i++) {
    const r = await bagsClue(db, { c: { rehearsal: false, murderer: 'jon', ghost: 'jessa' }, roster })
    assert.equal(r.placeholder, false)
    assert.ok(['(prop a)', '(prop c)', '(prop d)'].includes(r.property))
    assert.equal(r.count, PACKING.properties[r.property].length)
  }
  // a rehearsal case never touches the packing
  for (let i = 0; i < 30; i++) {
    const r = await bagsClue(db, { c: { rehearsal: true, murderer: 'jon', ghost: 'jessa' }, roster })
    assert.equal(r.placeholder, true)
    assert.ok(r.property.startsWith('(rehearsal'))
  }
})

test('through the night: the bags station card carries a packed property that points at a hidden role\'s bag, and the count matches its words', async () => {
  const db = new FakeFirestore()
  db.store.set('meta/game', { host_jonathan: 'Jon', host_susan: 'Susan' })
  db.store.set('safe_content/station_text', { items: [{ id: 's1', text: 'BAGS: Hunt for something [PROPERTY]. It is in [COUNT] bags.', deleted: false, order: 0 }, { id: 's2', text: 'CHECKIN: Sit and compare.', deleted: false, order: 1 }] })
  const { nightId } = await createNight(db)
  const phones = { jon: 'uid-jon', jessa: 'uid-jessa', jacob: 'uid-jacob', marie: 'uid-marie' }
  for (const [name, uid] of Object.entries(phones)) await join(db, { uid, nightId, name: name[0].toUpperCase() + name.slice(1) })
  let now = 1_000_000
  const next = () => hostCommand(db, { nightId, command: 'next', now })
  await next(); await next(); await next(); await next()
  await hostCommand(db, { nightId, command: 'blackout' })
  await hostCommand(db, { nightId, command: 'power', now })
  // the dealer's throwaway case, with its rehearsal flag off so the packing is read
  const c = db.store.get(`cases/${nightId}`)
  db.store.set(`cases/${nightId}`, { ...c, rehearsal: false })
  const roster = db.store.get(`nights/${nightId}`).roster
  const hidden = [roster[c.murderer].bag, roster[c.ghost].bag]
  // a packing in which every property sits in one of the hidden roles' bags or in none
  const packing = { properties: { '(prop x)': [hidden[0], 99], '(prop y)': [hidden[1], 98, 97], '(prop z)': [50, 51] }, packedAt: new Date(0), packedBy: 'packer' }
  db.store.set('sealed/bags', packing)
  // step through to the end of Act 4; a window that opens is left to close
  const seen = []
  const nightDoc = () => db.store.get(`nights/${nightId}`)
  for (let i = 0; i < 40 && !(nightDoc().act === 4 && nightDoc().beat === 'station5'); i++) {
    await next()
    const w = nightDoc().window
    if (w && !w.settled) now += NIGHT.windows.questions.ms + 1
    for (const uid of Object.values(phones)) {
      for (const card of (db.store.get(`sessions/${uid}`).cards ?? []).filter(x => x.kind === 'station' && x.station === 'bags')) {
        if (!seen.some(x => x.id === card.id && x.property === card.property)) seen.push(card)
      }
    }
  }
  assert.equal(nightDoc().act, 4)
  assert.ok(seen.length >= 2, 'every group was dealt the bags station')
  for (const card of seen) {
    assert.equal(card.placeholder, false)
    assert.ok(['(prop x)', '(prop y)'].includes(card.property), 'points at a hidden role\'s bag, never the loose property')
    assert.equal(card.count, packing.properties[card.property].length)
    assert.equal(card.text, `Hunt for something ${card.property}. It is in ${card.count === 2 ? 'two' : 'three'} bags.`)
    assert.ok(!/\d/.test(card.text))
  }
  const checkin = Object.values(phones).map(uid => (db.store.get(`sessions/${uid}`).cards ?? []).find(x => x.kind === 'station' && x.station === 'checkin')).filter(Boolean)
  assert.ok(checkin.length > 0 && checkin.every(x => x.text === 'Sit and compare.'), 'a written station line replaces the default')
})
