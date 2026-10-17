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

// ---------------------------------------------------------------------------
// Phone safety nets (17 Oct 2026): a late joiner, a dead phone, a borrowed
// phone and a pause. The dealer's rehearsal case is thrown away with the db.

import { hostCommand as runCommand, player } from '../lib/run.js'
import { NIGHT, ms as msOf } from '../lib/deal.js'
import { CARRIED_FIELDS, PAUSE_SHIFTED } from '../lib/night.js'

const sessionOf = (db, uid) => db.store.get(`sessions/${uid}`)
const cardsOf = (db, uid, kind) => (sessionOf(db, uid).cards ?? []).filter(c => !kind || c.kind === kind)

test('a late joiner after the power returns gets one role card as a detective; a join in Act 1 deals none', async () => {
  const db = seeded()
  const { nightId } = await createNight(db)
  await join(db, { uid: 'u-jon', nightId, name: 'Jon' })
  await join(db, { uid: 'u-jessa', nightId, name: 'Jessa' })
  await join(db, { uid: 'u-jacob', nightId, name: 'Jacob' })
  await runCommand(db, { nightId, command: 'act', arg: 1 })
  const early = await join(db, { uid: 'u-mari', nightId, name: 'Mari' })
  assert.equal(early.roleDealt, 0)
  assert.equal(cardsOf(db, 'u-mari', 'role').length, 0, 'Act 1: no case yet, nothing dealt')
  assert.equal(db.store.get(`cases/${nightId}`), undefined, 'and no case is made by a join')
  await runCommand(db, { nightId, command: 'blackout' })
  await runCommand(db, { nightId, command: 'power' })
  for (const uid of ['u-jon', 'u-jessa', 'u-jacob', 'u-mari']) assert.equal(cardsOf(db, uid, 'role').length, 1)
  const late = await join(db, { uid: 'u-stan', nightId, name: 'Stanley' })
  assert.equal(late.roleDealt, 1)
  const role = cardsOf(db, 'u-stan', 'role')
  assert.equal(role.length, 1)
  assert.equal(role[0].id, '2-power-role', 'the same card id as everyone else')
  assert.equal(db.store.get(`cases/${nightId}`).roles.stanley, 'detective', 'never promoted')
  assert.equal(sessionOf(db, 'u-stan').role, undefined, 'no session carries a role field')
  // the power pressed again deals nothing twice, to anyone
  await runCommand(db, { nightId, command: 'power' })
  assert.equal(cardsOf(db, 'u-stan', 'role').length, 1)
  // the hidden roles are untouched by the late arrival
  const c = db.store.get(`cases/${nightId}`)
  assert.equal(Object.values(c.roles).filter(r => r === 'murderer').length, 1)
  assert.equal(Object.values(c.roles).filter(r => r === 'ghost').length, 1)
})

test('a dead phone: the same name on a new phone brings the cards along', async () => {
  const db = seeded()
  const { nightId } = await createNight(db)
  await join(db, { uid: 'u-jon', nightId, name: 'Jon' })
  await join(db, { uid: 'old', nightId, name: 'Stanley' })
  await runCommand(db, { nightId, command: 'act', arg: 2 })
  await runCommand(db, { nightId, command: 'beat', arg: 'cat' })
  const before = cardsOf(db, 'old')
  assert.ok(before.length >= 3, 'role, go, testimony')
  await join(db, { uid: 'new', nightId, name: 'Stanley' })
  assert.deepEqual(cardsOf(db, 'new').map(c => c.id), before.map(c => c.id))
  assert.equal(sessionOf(db, 'old').status, 'superseded')
  assert.ok(CARRIED_FIELDS.includes('cards') && CARRIED_FIELDS.includes('windows'))
})

test('handover clears cards and bumps generation; only a host may call it', async () => {
  const db = seeded()
  const { nightId } = await createNight(db)
  await join(db, { uid: 'u-jon', nightId, name: 'Jon' })
  await join(db, { uid: 'u-jessa', nightId, name: 'Jessa' })
  await runCommand(db, { nightId, command: 'act', arg: 2 })
  await runCommand(db, { nightId, command: 'beat', arg: 'questions', now: 1_000_000 })
  assert.ok(cardsOf(db, 'u-jessa').length > 0)
  assert.ok(Object.keys(sessionOf(db, 'u-jessa').windows).length === 1)
  const t = 1_010_000
  const r = await runCommand(db, { nightId, command: 'handover', arg: 'jessa', now: t })
  assert.equal(r.ok, true)
  const s = sessionOf(db, 'u-jessa')
  assert.deepEqual(s.cards, [])
  assert.deepEqual(s.windows, {})
  assert.equal(s.generation, t)
  assert.equal(s.status, 'handed')
  assert.equal(s.characterId !== undefined, true, 'the character stays with the guest on the roster')
  // the gate: a plain guest is refused, a host phone is not
  assert.equal(await canHost(db, { uid: 'u-jessa', nightId, command: 'handover' }), false)
  assert.equal(await canHost(db, { uid: 'u-jon', nightId, command: 'handover' }), true)
  // a stranger is refused in words
  await assert.rejects(runCommand(db, { nightId, command: 'handover', arg: 'nobody' }), e => e.code === 'no-guest')
  await assert.rejects(runCommand(db, { nightId, command: 'handover', arg: '' }), e => e.code === 'invalid')
  // by uid works too, and a handed-over host phone loses the buttons
  await runCommand(db, { nightId, command: 'handover', arg: 'u-jon', now: t + 1 })
  assert.equal(sessionOf(db, 'u-jon').generation, t + 1)
  assert.equal(await canHost(db, { uid: 'u-jon', nightId, command: 'handover' }), false)
  // the next person to pick the phone up joins as themselves; Jessa's character is still hers elsewhere
  const next = await join(db, { uid: 'u-jessa', nightId, name: 'Mari' })
  assert.equal(next.resumed, false)
  assert.equal(sessionOf(db, 'u-jessa').guestKey, 'mari')
  assert.equal(cardsOf(db, 'u-jessa', 'role').length, 1, 'the new owner gets a role card at once')
  const back = await join(db, { uid: 'u-spare', nightId, name: 'Jessa' })
  assert.equal(back.characterId, db.store.get(`nights/${nightId}`).roster.jessa.characterId)
})

test('handover wipes the previous owner\'s notes for this night, so the next person inherits nothing', async () => {
  const db = seeded()
  const { nightId } = await createNight(db)
  await join(db, { uid: 'u-jon', nightId, name: 'Jon' })
  await join(db, { uid: 'u-jessa', nightId, name: 'Jessa' })
  await join(db, { uid: 'u-jacob', nightId, name: 'Jacob' })
  // Jessa's phone has hidden the tour and the Act 2 prompt and crossed off two motives;
  // the same phone rehearsed under an earlier night too (flags only, never content)
  db.store.set('notes/u-jessa', {
    byNight: {
      [nightId]: { seen: { welcome: true, 'prompt-2': true }, buzzed: { '2-power-role': true }, crossed: { 3: true, 7: true } },
      'old-night': { seen: { welcome: true }, crossed: { 1: true } },
    },
  })
  await runCommand(db, { nightId, command: 'handover', arg: 'jessa', now: 1_010_000 })
  const notes = db.store.get('notes/u-jessa')
  assert.equal(notes.byNight[nightId], undefined, 'nothing of Jessa\'s is left under this night for the next person')
  assert.deepEqual(notes.byNight['old-night'], { seen: { welcome: true }, crossed: { 1: true } }, 'another night\'s branch is left alone')
  assert.equal(sessionOf(db, 'u-jessa').status, 'handed', 'the session is handed in the same stroke')
  // a phone that never wrote a note is handed over just the same
  await runCommand(db, { nightId, command: 'handover', arg: 'jacob', now: 1_010_001 })
  assert.equal(db.store.has('notes/u-jacob'), false)
  assert.equal(sessionOf(db, 'u-jacob').status, 'handed')
  // a notes doc with no branch for this night is left as it is
  db.store.set('notes/u-jon', { byNight: { 'old-night': { seen: { welcome: true } } } })
  await runCommand(db, { nightId, command: 'handover', arg: 'jon', now: 1_010_002 })
  assert.deepEqual(db.store.get('notes/u-jon'), { byNight: { 'old-night': { seen: { welcome: true } } } })
})

test('a pause freezes every clock in one batch and resume moves them all on by the pause length', async () => {
  const db = seeded()
  const { nightId } = await createNight(db)
  for (const [uid, name] of [['u-jon', 'Jon'], ['u-jessa', 'Jessa'], ['u-jacob', 'Jacob']]) await join(db, { uid, nightId, name })
  const t0 = 1_000_000
  await runCommand(db, { nightId, command: 'act', arg: 2, now: t0 })
  await runCommand(db, { nightId, command: 'beat', arg: 'questions', now: t0 })
  const night = () => db.store.get(`nights/${nightId}`)
  const w = night().window
  const closes = msOf(w.closesAt)
  assert.equal(closes, t0 + NIGHT.windows.questions.ms)
  // other clocks that must move with it
  db.store.set(`nights/${nightId}/public/relay`, { state: 'turn', turnEndsAt: new Date(t0 + 40_000), walkEndsAt: null, voteEndsAt: null, lockoutEndsAt: null })
  db.store.set(`nights/${nightId}/public/study`, { state: 'playing', slotEndsAt: new Date(t0 + 700_000) })
  // pause thirty seconds before the window closes
  const tPause = closes - 30_000
  await runCommand(db, { nightId, command: 'pause', now: tPause })
  assert.equal(night().phase, 'paused')
  assert.equal(msOf(night().pausedAt), tPause)
  // nothing settles while paused, even past the old deadline
  await assert.rejects(runCommand(db, { nightId, command: 'settle', now: closes + 1 }), /paused/)
  await assert.rejects(runCommand(db, { nightId, command: 'next', now: closes + 1 }), /paused/)
  // resume five minutes later
  const tResume = tPause + 300_000
  const r = await runCommand(db, { nightId, command: 'resume', now: tResume })
  assert.equal(r.shiftMs, 300_000)
  assert.equal(night().phase, 'act')
  assert.equal(night().pausedAt, null)
  assert.equal(msOf(night().window.closesAt), closes + 300_000, 'closesAt moved by five minutes')
  assert.equal(msOf(night().window.opensAt), t0 + 300_000)
  assert.equal(msOf(db.store.get(`nights/${nightId}/public/relay`).turnEndsAt), t0 + 40_000 + 300_000, 'the relay turn moved by the same amount')
  assert.equal(db.store.get(`nights/${nightId}/public/relay`).walkEndsAt, null, 'empty deadlines stay empty')
  assert.equal(msOf(db.store.get(`nights/${nightId}/public/study`).slotEndsAt), t0 + 700_000 + 300_000, 'the study slot moved by the same amount')
  // an answer at the old deadline plus one second is accepted, and no defaults fired
  const set = db.store.get('sessions/u-jessa').windows[w.id]
  await player.answer(db, { nightId, uid: 'u-jessa', windowId: w.id, picks: set.beats.map(b => b.choices[0].k), now: closes + 1000 })
  assert.equal(db.store.get('sessions/u-jessa').answers[w.id].defaulted, false)
  await assert.rejects(runCommand(db, { nightId, command: 'settle', now: closes + 1000 }), /still choosing/)
  for (const uid of ['u-jon', 'u-jacob']) assert.equal(db.store.get(`sessions/${uid}`).answers, undefined, 'no defaults fired')
  // resume again is harmless; the list of shifted fields is documented
  const again = await runCommand(db, { nightId, command: 'resume', now: tResume + 1 })
  assert.equal(again.already, true)
  assert.ok(PAUSE_SHIFTED['public/relay'].includes('turnEndsAt') && PAUSE_SHIFTED['public/study'].includes('slotEndsAt'))
})

test('the Act 4 groups write where the house stands with each cat; nothing before that', async () => {
  const db = seeded()
  const { nightId } = await createNight(db)
  for (const [uid, name] of [['u-jon', 'Jon'], ['u-jessa', 'Jessa'], ['u-jacob', 'Jacob'], ['u-mari', 'Mari']]) await join(db, { uid, nightId, name })
  await runCommand(db, { nightId, command: 'act', arg: 2 })
  assert.equal(sessionOf(db, 'u-jessa').groupAffection, undefined, 'absent before the groups are made')
  await runCommand(db, { nightId, command: 'act', arg: 3 })
  await runCommand(db, { nightId, command: 'beat', arg: 'groups' })
  for (const uid of ['u-jon', 'u-jessa', 'u-jacob', 'u-mari']) {
    const s = sessionOf(db, uid)
    assert.ok(s.groupAffection, 'the group average is on every member')
    for (const cat of ['irwin', 'granolia', 'boo', 'zimothy', 'salem']) {
      const v = s.groupAffection[cat]
      assert.ok(Number.isInteger(v) && v >= 1 && v <= 5, `${cat}: a rounded stop 1 to 5`)
    }
    assert.equal(s.groupAffection.irwin, 5)
  }
  // the windows a phone can read still carry no numbers
  for (const uid of ['u-jon', 'u-jessa']) for (const set of Object.values(sessionOf(db, uid).windows ?? {})) assert.ok(!JSON.stringify(set).includes('"av"'))
})
