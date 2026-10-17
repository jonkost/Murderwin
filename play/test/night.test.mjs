import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  notesFor, notesPatch, mergeNotes, seen, wantsWelcome, buzzOnce, resetBuzzGuard, mayCheck, needsHandoverReset,
  clueCards, roleCard, nowCards, openWindow, clockFor, secondsLeft, KEEPS, effectivePhase, isDark, presenceKey,
} from '../src/lib/night.js'
import { isStale, secondsSinceHeard, watchWake, STALE_MS } from '../src/lib/clock.js'

// Pure helpers only: no Firebase, no React. Sample cards are stage
// directions in brackets, never content.

test('notes are scoped to the night: a rehearsal phone starts the party clean', () => {
  // the phone rehearsed under night A and hid everything
  let doc = mergeNotes({}, notesPatch('A', { seen: { welcome: true, 'prompt-2': true, '2-power-role': true }, crossed: { 4: true } }))
  assert.equal(seen(doc, 'A', 'welcome'), true)
  assert.equal(seen(doc, 'B', 'welcome'), false, 'the real night shows the tour again')
  assert.equal(seen(doc, 'B', 'prompt-2'), false, 'and the role prompt')
  assert.deepEqual(notesFor(doc, 'B').crossed, {}, 'and no motives are crossed off')
  // the first write under B lands under byNight.B and leaves A alone
  doc = mergeNotes(doc, notesPatch('B', { seen: { welcome: true } }))
  assert.ok(doc.byNight.B, 'the doc carries byNight.B after the first write')
  assert.deepEqual(doc.byNight.B, { seen: { welcome: true } })
  assert.equal(seen(doc, 'A', 'prompt-2'), true)
  assert.equal(seen(doc, 'B', 'prompt-2'), false)
  // writes merge: a second key under B keeps the first
  doc = mergeNotes(doc, notesPatch('B', { seen: { 'prompt-2': true } }))
  assert.deepEqual(doc.byNight.B.seen, { welcome: true, 'prompt-2': true })
  // the old flat shape is ignored entirely
  const flat = { seen: { welcome: true }, crossed: { 1: true } }
  assert.equal(seen(flat, 'B', 'welcome'), false)
  assert.deepEqual(notesFor(flat, 'B'), { seen: {}, crossed: {}, buzzed: {} })
  assert.equal(notesPatch(null, { seen: {} }), null, 'no night, no write')
})

test('the Welcome tour shows for a late arrival at any act, never over the blackout or the prompt', () => {
  const fresh = {}
  assert.equal(wantsWelcome({ act: 3, phase: 'act' }, fresh, 'N'), true, 'a fixture at act 3 with no welcome flag lands on Welcome')
  assert.equal(wantsWelcome({ act: 1, phase: 'act' }, fresh, 'N'), true)
  assert.equal(wantsWelcome({ act: 1, phase: 'blackout' }, fresh, 'N'), false)
  assert.equal(wantsWelcome({ act: 2, phase: 'prompt' }, fresh, 'N'), false)
  const toured = mergeNotes({}, notesPatch('N', { seen: { welcome: true } }))
  assert.equal(wantsWelcome({ act: 3, phase: 'act' }, toured, 'N'), false)
  assert.equal(wantsWelcome({ act: 3, phase: 'act' }, toured, 'M'), true, 'a new night tours again')
})

test('the prompt buzzes exactly once per card id', () => {
  resetBuzzGuard()
  let calls = 0
  const vibrate = () => { calls++ }
  const notes = { buzzed: {} }
  assert.equal(buzzOnce('2-power-role', notes, vibrate), true)
  assert.equal(buzzOnce('2-power-role', notes, vibrate), false, 'a second render does not buzz again')
  assert.equal(calls, 1)
  assert.equal(buzzOnce('prompt-4', notes, vibrate), true, 'a new card id buzzes')
  assert.equal(calls, 2)
  resetBuzzGuard()
  assert.equal(buzzOnce('2-power-role', { buzzed: { '2-power-role': true } }, vibrate), false, 'a reload with the note written does not buzz')
  assert.equal(calls, 2)
  resetBuzzGuard()
  assert.equal(buzzOnce('x', notes, null), true, 'no motor is not an error')
  assert.equal(buzzOnce('y', notes, () => { throw new Error('not allowed') }), true, 'a refused vibrate is not an error')
})

test('the role card is kept all night, readable from You, never listed among the clues', () => {
  const role = { id: '2-power-role', act: 2, beat: 'orient', kind: 'role', text: '(a role card)' }
  const testimony = { id: '2-cat-testimony', act: 2, beat: 'cat', kind: 'testimony', cat: 'salem', lines: ['(a line)'] }
  const session = { cards: [role, testimony] }
  assert.ok(KEEPS.has('role'))
  assert.equal(roleCard(session)?.id, '2-power-role')
  assert.equal(roleCard({ cards: [testimony] }), null)
  assert.deepEqual(clueCards(session).map(c => c.kind), ['testimony'])
  assert.deepEqual(nowCards(session, { seen: {} }, 2).map(c => c.kind), ['testimony'])
})

test('a paused night freezes the clock: an open window stays open past its old deadline', () => {
  const t0 = 1_000_000
  const w = { id: 'q1', kind: 'questions', opensAt: new Date(t0), closesAt: new Date(t0 + 60_000), settled: false }
  const session = { guestKey: 'jessa', windows: { q1: { kind: 'questions', beats: [] } } }
  const live = () => t0 + 90_000
  assert.equal(openWindow({ window: w, phase: 'act' }, session, live), null, 'closed on a running clock')
  const paused = { window: w, phase: 'paused', pausedAt: new Date(t0 + 30_000) }
  const clock = clockFor(paused, live)
  assert.equal(clock(), t0 + 30_000, 'the clock stands at the moment of the pause')
  assert.ok(openWindow(paused, session, clock), 'still open while paused')
  assert.equal(secondsLeft(w, clock), 30, 'the bar stands still')
  assert.equal(clockFor({ phase: 'act' }, live), live, 'a running night keeps the server clock')
})

test('the Check page opens for hosts and the admin only', () => {
  const night = { hosts: { jonathan: { name: 'Jon', key: 'jon' }, susan: { name: 'Susan', key: 'susan' } } }
  assert.equal(mayCheck({ session: { status: 'active', guestKey: 'jessa', host: null }, night }), false, 'a plain guest sees Not for you')
  assert.equal(mayCheck({ session: { status: 'active', guestKey: 'jon', host: 'jonathan' }, night }), true)
  assert.equal(mayCheck({ session: { status: 'active', guestKey: 'susan', host: null }, night }), true, 'a host by name on the night')
  assert.equal(mayCheck({ session: { status: 'superseded', guestKey: 'jon', host: 'jonathan' }, night }), false)
  assert.equal(mayCheck({ session: null, night }), false)
  assert.equal(mayCheck({ session: null, night, admin: true }), true)
})

test('a handed-over phone resets once, on a newer generation only', () => {
  assert.equal(needsHandoverReset({}, 0), false)
  assert.equal(needsHandoverReset({ generation: 1_700_000 }, 0), true)
  assert.equal(needsHandoverReset({ generation: 1_700_000 }, 1_700_000), false, 'after the reload nothing loops')
  assert.equal(needsHandoverReset({ generation: 1_800_000 }, 1_700_000), true, 'a later handover resets again')
})

test('the stale rule flips at twenty seconds of cache-only paints', () => {
  const t0 = 5_000_000
  assert.equal(isStale({ fromCache: false, heardAt: t0 - 100_000 }, t0), false, 'the server confirmed it; never stale')
  assert.equal(isStale({ fromCache: true, heardAt: t0 - STALE_MS + 1 }, t0), false)
  assert.equal(isStale({ fromCache: true, heardAt: t0 - STALE_MS }, t0), true)
  assert.equal(isStale({ fromCache: true, heardAt: null }, t0), false, 'nothing to measure from yet')
  assert.equal(secondsSinceHeard({ heardAt: t0 - 47_400 }, t0), 47)
  assert.equal(secondsSinceHeard({}, t0), null)
})

test('a wake event re-measures the clock skew at once', () => {
  const win = new EventTarget()
  const doc = new EventTarget()
  doc.visibilityState = 'visible'
  const woke = []
  const stop = watchWake(win, doc, why => woke.push(why))
  doc.dispatchEvent(new Event('visibilitychange'))
  assert.deepEqual(woke, ['visibilitychange'], 'a synthetic visibilitychange triggers a re-measure')
  doc.visibilityState = 'hidden'
  doc.dispatchEvent(new Event('visibilitychange'))
  assert.equal(woke.length, 1, 'going hidden does not')
  win.dispatchEvent(new Event('online'))
  win.dispatchEvent(new Event('focus'))
  assert.deepEqual(woke, ['visibilitychange', 'online', 'focus'])
  stop()
  win.dispatchEvent(new Event('online'))
  assert.equal(woke.length, 3, 'listeners come off cleanly')
})

test('a pause taken during the blackout keeps every phone dark', () => {
  // the host taps Pause while the roles are being handed out
  const paused = { act: 1, phase: 'paused', pausedFrom: 'blackout', pausedAt: new Date(1_000) }
  assert.equal(isDark({ act: 1, phase: 'blackout' }), true)
  assert.equal(isDark(paused), true, 'the room stays near-black while paused')
  assert.equal(effectivePhase(paused), 'blackout')
  assert.equal(wantsWelcome(paused, {}, 'N'), false, 'no tour lights up an untoured phone either')
  // a pause during the role prompt is still the prompt
  const promptPause = { act: 2, phase: 'paused', pausedFrom: 'prompt', pausedAt: new Date(1_000) }
  assert.equal(effectivePhase(promptPause), 'prompt')
  assert.equal(isDark(promptPause), false)
  assert.equal(wantsWelcome(promptPause, {}, 'N'), false)
  // an ordinary pause is an ordinary pause
  assert.equal(isDark({ act: 2, phase: 'paused', pausedFrom: 'act' }), false)
  assert.equal(effectivePhase({ act: 2, phase: 'paused', pausedFrom: 'act' }), 'act')
  assert.equal(effectivePhase({ act: 2, phase: 'paused' }), 'act', 'an old pause with no origin behaves as a running act')
  assert.equal(effectivePhase({ act: 2, phase: 'act' }), 'act')
  assert.equal(isDark(null), false)
})

test('a handed-over phone stops heartbeating as the previous owner', () => {
  const active = { nightId: 'N', status: 'active', guestKey: 'jessa' }
  assert.equal(presenceKey(active, 'N'), 'jessa')
  // the host pressed "hand on": the session is kept but marked handed
  assert.equal(presenceKey({ ...active, status: 'handed' }, 'N'), null, 'nobody is reported from the doors')
  assert.equal(presenceKey({ ...active, status: 'superseded' }, 'N'), null, 'a phone another phone took over reports nobody')
  assert.equal(presenceKey(active, 'M'), null, 'a session from another night reports nobody')
  assert.equal(presenceKey(null, 'N'), null)
  assert.equal(presenceKey(active, null), null)
})
