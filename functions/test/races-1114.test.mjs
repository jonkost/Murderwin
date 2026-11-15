import { test } from 'node:test'
import assert from 'node:assert/strict'
import { FakeFirestore } from './fake-firestore.mjs'
import { createNight, join } from '../lib/night.js'
import { hostCommand, player } from '../lib/run.js'
import { dealCard, lightsPath, settleLights, guests, ms } from '../lib/deal.js'
import { act4Path, readRotation } from '../lib/act4.js'

// The deep scan of 14 Nov 2026, the two races (C-races). Every night here is a
// throwaway rehearsal in a fake Firestore; assertions are about ids, steps and
// counts, never about what a card says or which cat holds which hint.

const NAMES = ['Jon', 'Susan', 'Jessa', 'Jacob', 'Stanley', 'Jeanette']
async function catVisits() {
  const db = new FakeFirestore()
  const { nightId } = await createNight(db)
  const uids = {}
  for (const name of NAMES) { const uid = `u-${name.toLowerCase()}`; await join(db, { uid, nightId, name }); uids[name.toLowerCase()] = uid }
  const now = Date.now()
  await hostCommand(db, { nightId, command: 'act', arg: 2, now })
  await hostCommand(db, { nightId, command: 'beat', arg: 'cat', now })
  return { db, nightId, uids, now }
}

test('two cards dealt to one phone at the same moment both land (dealCard is one transaction)', async () => {
  const db = new FakeFirestore()
  db.store.set('sessions/u1', { nightId: 'n1', cards: [{ id: 'old' }] })
  const dealt = await Promise.all([
    dealCard(db, 'u1', { id: 'a', kind: 'notice' }),
    dealCard(db, 'u1', { id: 'b', kind: 'notice' }),
    dealCard(db, 'u1', { id: 'a', kind: 'notice' }),
  ])
  const ids = db.store.get('sessions/u1').cards.map(c => c.id).sort()
  assert.deepEqual(ids, ['a', 'b', 'old'], 'neither card lost, and the same id never twice')
  assert.equal(dealt.filter(Boolean).length, 2)
  assert.equal(await dealCard(db, 'nobody', { id: 'a' }), false, 'no session: nothing dealt')
})

test('every other writer of a phone’s cards is one transaction too: the Study’s card, an award, Salem petted', async () => {
  const { readFileSync } = await import('node:fs')
  const read = p => readFileSync(new URL(p, import.meta.url), 'utf8')
  const station = read('../lib/station.js')
  const once = station.slice(station.indexOf('async function dealOnce('), station.indexOf('// Has the study station reported in lately?'))
  assert.match(once, /db\.runTransaction\(async tx => \{/)
  assert.ok(!/ref\.update\(/.test(once), 'no plain write of the whole list')
  const finale = read('../lib/finale.js')
  assert.ok(finale.includes('const dealt = await db.runTransaction(async tx => {\n    const sSnap = await tx.get(sessionRef)'))
  const deal = read('../lib/deal.js')
  const salem = deal.slice(deal.indexOf('export async function salemPetted('), deal.indexOf('\n}\n', deal.indexOf('export async function salemPetted(')))
  assert.match(salem, /return db\.runTransaction\(async tx => \{/)
  assert.ok(!/await ref\.update\(/.test(salem))
})

test('Salem petted still works, once, and never for a host', async () => {
  const { db, nightId, uids } = await catVisits()
  const deck = db.store.get(`nights/${nightId}/private/deck`)
  const keyOf = uid => Object.entries(deck.uids).find(([, u]) => u === uid)[0]
  await hostCommand(db, { nightId, command: 'salem-petted', arg: keyOf(uids.jessa) })
  const s = db.store.get(`sessions/${uids.jessa}`)
  assert.equal(s.salemFriend, true)
  assert.equal(s.affection.salem, 5)
  assert.equal(s.cards.filter(c => c.id === 'salem-friend').length, 1)
  const again = await hostCommand(db, { nightId, command: 'salem-petted', arg: keyOf(uids.jessa) })
  assert.equal(again.already, true)
  assert.equal(db.store.get(`sessions/${uids.jessa}`).cards.filter(c => c.id === 'salem-friend').length, 1)
  await assert.rejects(hostCommand(db, { nightId, command: 'salem-petted', arg: keyOf(uids.jon) }))
})

test('a phone left on an older step is put right by the next tick, and a phone that is right is never written', async () => {
  const { db, nightId, uids, now } = await catVisits()
  const line = () => db.store.get(lightsPath(nightId)).guests
  const [calledKey, called] = Object.entries(line()).find(([, g]) => g.step === 'go')
  const deck = db.store.get(`nights/${nightId}/private/deck`)
  const uid = deck.uids[calledKey]
  const right = Object.entries(deck.uids).find(([k, u]) => k !== calledKey && db.store.get(`sessions/${u}`)?.lights)?.[1]
  const rightAt = db.store.get(`sessions/${right}`).lights.at
  // the older follow-up landing last: the line has this guest called, the phone still says Wait
  db.store.set(`sessions/${uid}`, { ...db.store.get(`sessions/${uid}`), lights: { step: 'wait', variant: 'wait', cat: called.cat, title: 'x', text: 'x' } })
  const r = await hostCommand(db, { nightId, command: 'tick', now: now + 20_000 })
  assert.ok(r.ok !== false)
  const lights = db.store.get(`sessions/${uid}`).lights
  assert.equal(lights.step, line()[calledKey].step, 'the phone says what the line says')
  assert.equal(lights.cat, line()[calledKey].cat)
  assert.equal(db.store.get(`sessions/${right}`).lights.at, rightAt, 'a phone already right is left alone')
  // and the plain pass writes nothing when every phone is right
  const { list } = await guests(db, nightId)
  assert.equal(await settleLights(db, nightId, list, { now: now + 40_000 }), 0)
})

test('the forced race: a called guest’s Wait, landing after the call, is undone by the next tick', async () => {
  const { db, nightId, uids, now } = await catVisits()
  const line = () => db.store.get(lightsPath(nightId))
  const phone = uid => db.store.get(`sessions/${uid}`)?.lights
  const keyUid = Object.entries(db.store.get(`nights/${nightId}/private/deck`).uids)
  // everyone called goes in
  for (const [k, g] of Object.entries(line().guests)) if (g.step === 'go') await player.meetCat(db, { nightId, uid: keyUid.find(([kk]) => kk === k)[1], cat: g.cat, now })
  const withKeys = Object.entries(line().guests).filter(([, g]) => g.step === 'with').map(([k]) => k)
  assert.ok(withKeys.length >= 2)
  const base = new Map([...db.store].map(([k, v]) => [k, structuredClone(v)]))
  const restore = () => { db.store = new Map([...base].map(([k, v]) => [k, structuredClone(v)])) }
  const realDoc = db.doc.bind(db)
  let found = 0
  for (const x of withKeys) for (const y of withKeys) {
    if (x === y || found) continue
    restore()
    const ux = keyUid.find(([k]) => k === x)[1], uy = keyUid.find(([k]) => k === y)[1]
    // hold x's own Wait write until y's whole call is done (the older follow-up lands last)
    let open; const gate = new Promise(r => { open = r })
    let held = false
    db.doc = path => {
      const ref = realDoc(path)
      if (path !== `sessions/${ux}`) return ref
      return { ...ref, update: async f => { if (!held && f?.lights?.step === 'wait') { held = true; await gate } return ref.update(f) } }
    }
    const px = player.leaveCat(db, { nightId, uid: ux, now: now + 1000 })
    await new Promise(r => setTimeout(r, 2))
    await player.leaveCat(db, { nightId, uid: uy, now: now + 1001 })
    open(); await px
    db.doc = realDoc
    if (!(phone(ux)?.step === 'wait' && line().guests[x].step === 'go')) continue
    found++
    await hostCommand(db, { nightId, command: 'tick', now: now + 21_000 })
    assert.equal(phone(ux).step, 'go', 'one tick later the phone calls the guest')
    assert.equal(phone(ux).cat, line().guests[x].cat)
  }
  assert.equal(found, 1, 'the race was reproduced, then put right')
})

// The review of the deep scan's fixes (14 Nov 2026, night): two more races, each forced here in the fake.

test('a tick that lands while a call is still on its way to the phone leaves it to the call: the phone buzzes once', async () => {
  const db = new FakeFirestore()
  const { nightId } = await createNight(db)
  for (const name of NAMES) await join(db, { uid: `u-${name.toLowerCase()}`, nightId, name })
  const T0 = 1_800_000_000_000
  await hostCommand(db, { nightId, command: 'act', arg: 2, now: T0 })
  await hostCommand(db, { nightId, command: 'beat', arg: 'cat', now: T0 })
  const deck = db.store.get(`nights/${nightId}/private/deck`).uids
  const line = () => db.store.get(lightsPath(nightId)).guests
  const [xKey, x] = Object.entries(line()).find(([, g]) => g.step === 'go')
  await player.meetCat(db, { nightId, uid: deck[xKey], cat: x.cat, now: T0 + 10_000 })
  // every write of a phone's Go, with its stamp (the phone's buzz is keyed on the stamp's second, Cards.jsx)
  const goWrites = []
  const upd = db._update.bind(db)
  db._update = (path, fields) => { if (path.startsWith('sessions/') && fields?.lights?.step === 'go') goWrites.push({ path, at: new Date(fields.lights.at).getTime() }); return upd(path, fields) }
  // the leave's own write to the newly called phone is slow, as a real network can be
  const realDoc = db.doc.bind(db)
  let open; const gate = new Promise(r => { open = r })
  let held = null
  db.doc = path => {
    const ref = realDoc(path)
    if (!path.startsWith('sessions/')) return ref
    return { ...ref, update: async f => { if (!held && f?.lights?.step === 'go') { held = path; await gate } return ref.update(f) } }
  }
  const leaving = player.leaveCat(db, { nightId, uid: deck[xKey], now: T0 + 20_000 })
  await new Promise(r => setTimeout(r, 5))
  assert.ok(held, 'the call is on its way to the phone')
  await hostCommand(db, { nightId, command: 'tick', now: T0 + 21_500 }) // a tick a second and a half on
  open(); await leaving
  db.doc = realDoc
  db._update = upd
  const mine = goWrites.filter(w => w.path === held)
  assert.equal(mine.length, 1, 'the called phone is written once, so it buzzes once')
  const calledKey = Object.entries(deck).find(([, u]) => `sessions/${u}` === held)[0]
  assert.equal(db.store.get(held).lights.step, line()[calledKey].step, 'and it says what the line says')
})

test('the last chime of Act 4 rings once when two clocks reach the end of the last round together', async () => {
  const db = new FakeFirestore()
  db.store.set('meta/game', { host_jonathan: 'Jon', host_susan: 'Susan' })
  const { nightId } = await createNight(db)
  for (const name of ['Jon', 'Jessa', 'Jacob', 'Marie', 'Pat', 'Sam', 'Lee', 'Ana', 'Rene']) await join(db, { uid: `u-${name.toLowerCase()}`, nightId, name })
  const now = 1_000_000
  const host = (command, at, arg) => hostCommand(db, { nightId, command, arg, now: at })
  await host('act', now, 3)
  await host('start-act4', now)
  await host('next', now)
  await host('next', now)
  const rot = await readRotation(db, nightId)
  for (let r = 1; r < rot.rounds; r++) await host('next', now)
  assert.equal(db.store.get(act4Path(nightId)).round, rot.rounds, 'the last round is on')
  const chimes = []
  const set = db._set.bind(db)
  db._set = (path, data, opts) => { if (path === `nights/${nightId}/public/sounds` && data?.current?.id === 'chime-phone') chimes.push(ms(data.current.at)); return set(path, data, opts) }
  // the first clock's pay-outs are slow (one phone's mark held), and a second clock comes two seconds on
  const realDoc = db.doc.bind(db)
  let open; const gate = new Promise(r => { open = r })
  let held = false
  db.doc = path => {
    const ref = realDoc(path)
    if (!path.startsWith('sessions/')) return ref
    return { ...ref, update: async f => { if (!held && f && Object.keys(f).includes('act4.paid')) { held = true; await gate } return ref.update(f) } }
  }
  const end = ms(db.store.get(act4Path(nightId)).roundEndsAt) + 1
  const first = host('tick', end)
  await new Promise(r => setTimeout(r, 5))
  assert.equal(held, true, 'the first clock is still paying the rooms')
  await host('tick', end + 2_000)
  open(); await first
  db.doc = realDoc
  db._set = set
  assert.deepEqual(chimes.map(t => t - end), [0], 'one chime, the first clock\'s, at the round\'s end')
  assert.equal(db.store.get(act4Path(nightId)).phase, 'done', 'and the rounds are over')
})

// A night of nine at the end of Act 4's last round, for the two tests below.
async function atLastRound() {
  const db = new FakeFirestore()
  db.store.set('meta/game', { host_jonathan: 'Jon', host_susan: 'Susan' })
  const { nightId } = await createNight(db)
  for (const name of ['Jon', 'Jessa', 'Jacob', 'Marie', 'Pat', 'Sam', 'Lee', 'Ana', 'Rene']) await join(db, { uid: `u-${name.toLowerCase()}`, nightId, name })
  const now = 1_000_000
  const host = (command, at, arg) => hostCommand(db, { nightId, command, arg, now: at })
  await host('act', now, 3)
  await host('start-act4', now)
  await host('next', now)
  await host('next', now)
  const rot = await readRotation(db, nightId)
  for (let r = 1; r < rot.rounds; r++) await host('next', now)
  assert.equal(db.store.get(act4Path(nightId)).round, rot.rounds, 'the last round is on')
  return { db, nightId, host, end: ms(db.store.get(act4Path(nightId)).roundEndsAt) + 1 }
}

test('the last chime of Act 4 is written in the same commit as its claim: a commit whose answer was lost, run again, still rings once (the deep scan’s second review)', async () => {
  const { db, nightId, host, end } = await atLastRound()
  const chimes = []
  const set = db._set.bind(db)
  db._set = (path, data, opts) => { if (path === `nights/${nightId}/public/sounds` && data?.current?.id === 'chime-phone') chimes.push(ms(data.current.at)); return set(path, data, opts) }
  // like the real database: the claim's commit lands, the answer is lost on its way back, and the function is run
  // again, which now finds the claim taken
  const realTx = db.runTransaction.bind(db)
  let replayed = false
  db.runTransaction = async fn => {
    let claims = false
    const first = await realTx(tx => fn({ ...tx, update: (ref, fields) => { if (ref.path === act4Path(nightId) && fields && 'finishChimeAt' in fields) claims = true; return tx.update(ref, fields) } }))
    if (!claims || replayed) return first
    replayed = true
    return realTx(fn)
  }
  await host('tick', end)
  db.runTransaction = realTx
  db._set = set
  assert.equal(replayed, true, 'the claim was run again')
  assert.deepEqual(chimes.map(t => t - end), [0], 'the chime rang once, at the round\'s end: it landed with the claim')
  assert.equal(db.store.get(act4Path(nightId)).phase, 'done', 'and the rounds are over')
  // a later clock rings nothing more
  await host('tick', end + 60_000)
  assert.equal(db.store.get(`nights/${nightId}/public/sounds`).current.at.getTime(), end, 'no second chime')
})

test('Locked in: the rounds start when every seat with a phone is in, and a seat handed on is not waited for (the deep scan’s second review)', async () => {
  const db = new FakeFirestore()
  db.store.set('meta/game', { host_jonathan: 'Jon', host_susan: 'Susan' })
  const { nightId } = await createNight(db)
  const names = ['Jon', 'Jessa', 'Jacob', 'Marie', 'Pat', 'Sam']
  for (const name of names) await join(db, { uid: `u-${name.toLowerCase()}`, nightId, name })
  const now = 1_000_000
  const host = (command, at, arg) => hostCommand(db, { nightId, command, arg, now: at })
  const night = () => db.store.get(`nights/${nightId}`)
  await host('handover', now, 'sam') // a name nobody plays, handed on at the doors
  assert.equal(night().roster.sam.handed, true)
  await host('act', now, 3)
  await host('start-act4', now)
  await host('next', now) // the group cards
  assert.equal(night().beat, 'groups')
  const lockEndsAt = ms(db.store.get(act4Path(nightId)).lockEndsAt)
  const at = now + 1_000
  assert.ok(at < lockEndsAt, 'well inside the two minutes')
  for (const name of names.slice(0, -2)) await player.lockIn(db, { nightId, uid: `u-${name.toLowerCase()}`, now: at })
  assert.equal(night().beat, 'groups', 'a seat with a phone is still to come')
  await player.lockIn(db, { nightId, uid: 'u-pat', now: at })
  assert.equal(night().beat, 'round1', 'every seat with a phone is in: the round starts, with no wait for the seat handed on')
})
