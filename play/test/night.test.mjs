import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  notesFor, notesPatch, mergeNotes, seen, wantsWelcome, buzzOnce, resetBuzzGuard, mayCheck, needsHandoverReset,
  clueCards, roleCard, nowCards, openWindow, clockFor, secondsLeft, KEEPS, KINDS, TRANSIENT, effectivePhase, isDark, presenceKey,
  lightsStep, meetParam, LIGHTS_STEPS, isRehearsalNight, showRehearsalBand, salemFriendNote, SALEM_FRIEND,
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
  assert.deepEqual(notesFor(flat, 'B'), { seen: {}, crossed: {}, buzzed: {}, continued: {}, text: '' }) // continued: the tap after the blackout; text: the Notes tab (25 Oct 2026)
  assert.equal(notesPatch(null, { seen: {} }), null, 'no night, no write')
})

// F30, the Notes tab (25 Oct 2026, the cue list's "Notes area"): free text
// per phone per night, written as a string under the night, so a write of it
// replaces the words and leaves seen, crossed and buzzed exactly as they
// were; written after a short pause and when the box loses focus; read by
// nobody else; and (26 Oct) a refused write never empties the box.
test('F30 the Notes tab: one box per phone per night, a text write touches nothing else, the quiet line says Saved once the doc holds the words, and a refused write keeps the words in the box', async () => {
  const { EMPTY_NOTES, notesLine, notesReconcile, notesAfterRefusal, NOTES_SAVE_MS } = await import('../src/lib/night.js')
  assert.equal(EMPTY_NOTES.text, '', 'EMPTY_NOTES carries the empty text')
  assert.equal(notesFor({}, 'N').text, '', 'no doc, no words')
  let doc = mergeNotes({}, notesPatch('N', { seen: { welcome: true, 'prompt-2': true }, crossed: { 4: true, 9: true }, buzzed: { 'prompt-2': true } }))
  assert.equal(notesFor(doc, 'N').text, '', 'nothing typed yet')
  doc = mergeNotes(doc, notesPatch('N', { text: '(a first line of scribbles)' }))
  assert.equal(notesFor(doc, 'N').text, '(a first line of scribbles)')
  assert.deepEqual(notesFor(doc, 'N').seen, { welcome: true, 'prompt-2': true }, 'seen is untouched by a text write')
  assert.deepEqual(notesFor(doc, 'N').crossed, { 4: true, 9: true }, 'crossed is untouched')
  assert.deepEqual(notesFor(doc, 'N').buzzed, { 'prompt-2': true }, 'buzzed is untouched')
  doc = mergeNotes(doc, notesPatch('N', { text: '(a second version, shorter)' }))
  assert.equal(notesFor(doc, 'N').text, '(a second version, shorter)', 'a string replaces, never merges')
  doc = mergeNotes(doc, notesPatch('N', { text: '' }))
  assert.equal(notesFor(doc, 'N').text, '', 'clearing the box is a write of nothing')
  assert.deepEqual(notesFor(doc, 'N').crossed, { 4: true, 9: true }, 'and still touches nothing else')
  // the other way round: a cross-off or a seen flag never touches the words
  doc = mergeNotes(doc, notesPatch('N', { text: '(kept)' }))
  doc = mergeNotes(doc, notesPatch('N', { crossed: { 12: true }, seen: { '3-down-down': true } }))
  assert.equal(notesFor(doc, 'N').text, '(kept)')
  assert.equal(notesFor(doc, 'M').text, '', 'another night has its own box')
  assert.equal(notesFor({ byNight: { N: { text: 7 } } }, 'N').text, '', 'anything but a string reads as empty')
  // the quiet line under the box: Saved, or nothing (the contract's quiet line; no Saving word on every pause, 26 Oct)
  assert.equal(notesLine('', ''), '', 'an empty box with nothing stored says nothing')
  assert.equal(notesLine('(abc)', '(ab)'), '', 'typed ahead of the doc: nothing yet')
  assert.equal(notesLine('(abc)', '(abc)'), 'Saved', 'the doc holds the words')
  assert.equal(notesLine('', '(abc)'), '', 'cleared, not yet written: nothing')
  assert.match(notesLine('(abc)', '(ab)', { failed: true }), /^Not saved yet\./, 'a refused write says so and keeps the words')
  assert.ok(NOTES_SAVE_MS >= 500 && NOTES_SAVE_MS <= 1500, 'the pause before a write is short, about 800 ms')
  // what the box shows when the doc changes under it (26 Oct 2026)
  assert.deepEqual(notesReconcile({ stored: '(saved)', typed: '', dirty: false }), { text: '(saved)', dirty: false }, 'a reload or a late load paints the saved words')
  assert.deepEqual(notesReconcile({ stored: '(abc)', typed: '(abc)', dirty: true }), { text: '(abc)', dirty: false }, 'our own write echoes back: clean')
  assert.deepEqual(notesReconcile({ stored: '(ab)', typed: '(abcd)', dirty: true }), { text: '(abcd)', dirty: true }, 'newer typing is never overwritten by an older doc')
  assert.deepEqual(notesReconcile({ stored: '(ab)', typed: '(abc)', dirty: false, failed: true }), { text: '(abc)', dirty: true }, 'a refused write: the rollback to the old words never empties the box')
  assert.deepEqual(notesReconcile({ stored: '', typed: '', dirty: false }), { text: '', dirty: false }, 'nothing anywhere')
  // the refused write, in the order Firestore can deliver it: the latency-compensated echo, then the rollback, then the rejection (or the rejection first)
  const refused = (rollbackFirst) => {
    let stored = '(ab)', typed = '(abc)', dirty = true, failed = false, pending = false, sent = '(abc)'
    const doc = (next) => { stored = next; const r = notesReconcile({ stored, typed, dirty, failed }); typed = r.text; dirty = r.dirty }
    const reject = () => { failed = true; dirty = true; typed = notesAfterRefusal({ typed, sent, pending }) }
    doc('(abc)')                                  // the echo: the two agree
    assert.equal(dirty, false, 'clean after the echo')
    if (rollbackFirst) { doc('(ab)'); reject() } else { reject(); doc('(ab)') }
    return { typed, dirty, failed, line: notesLine(typed, stored, { failed }) }
  }
  for (const first of [true, false]) {
    const r = refused(first)
    assert.equal(r.typed, '(abc)', `the words come back whether the rollback lands ${first ? 'before' : 'after'} the rejection`)
    assert.equal(r.dirty, true, 'and the box counts as unsaved, so a tap away writes again')
    assert.match(r.line, /^Not saved yet\./, 'and the line says so')
  }
  assert.equal(notesAfterRefusal({ typed: '(abcde)', sent: '(abc)', pending: true }), '(abcde)', 'a newer keystroke waiting its pause wins over the sent words')
  assert.equal(notesAfterRefusal({ typed: '(ab)', sent: '(abc)', pending: false }), '(abc)', 'no newer keystroke: the sent words come back')
  // the screens: the seventh tab after Clues, the box writes text through writeNotes after the pause and on blur, the tour explains it
  const { readFileSync } = await import('node:fs')
  const read = f => readFileSync(new URL(`../src/${f}`, import.meta.url), 'utf8')
  const rest = read('screens/Rest.jsx')
  assert.match(rest, /\{ key: 'clues', label: 'Clues' \},\s*\{ key: 'notes', label: 'Notes' \}/, 'Notes comes after Clues')
  assert.match(rest, /\{shown === 'notes' && <Notes uid=\{uid\} notes=\{notes\} \/>\}/)
  const notesPane = rest.slice(rest.indexOf('function Notes('), rest.indexOf('function Cats('))
  assert.match(notesPane, /writeNotes\(uid, \{ text: value \}\)/, 'the box writes text and nothing else')
  assert.match(notesPane, /setTimeout\(\(\) => save\(v\), NOTES_SAVE_MS\)/, 'after the pause')
  assert.match(notesPane, /onBlur=\{flush\}/, 'and when the box loses focus')
  assert.match(notesPane, /const flush = \(\) => \{ if \(timer\.current \|\| refused\.current \|\| typed\.current !== held\.current\) save/, 'tapping away also retries a refused write and writes words the doc does not hold')
  assert.match(notesPane, /<textarea className="notes-box" value=\{text\}/, 'local state: typing never waits on Firestore')
  assert.match(notesPane, /notesLine\(text, stored, \{ failed \}\)/, 'the quiet line is the pure rule')
  assert.match(notesPane, /notesReconcile\(\{ stored, typed: typed\.current, dirty: dirty\.current, failed: refused\.current \}\)/, 'the doc change goes through the pure rule')
  assert.match(notesPane, /notesAfterRefusal\(\{ typed: typed\.current, sent: sent\.current, pending: !!timer\.current \}\)/, 'and so does the refusal')
  assert.ok(!/role="status"/.test(notesPane), 'no second live region: the sheet already is one')
  assert.ok(!/<button/.test(notesPane), 'nothing to tap: the box saves itself')
  assert.match(read('screens/Welcome.jsx'), /<dt>Notes<\/dt><dd>[^<]+<\/dd>/, 'the tour explains the Notes tab')
  assert.ok(read('Preview.jsx').includes("case 'notes':"), 'the preview keeps a page for it')
  const css = read('styles.css')
  assert.match(css, /^\.tab \{[^}]*font-size: clamp\(0\.6[0-9]?rem, 3\.[0-9]vw, 0\.[0-9]+rem\)/m, 'seven labels shrink with the phone width, never under about 12 px (the root font is 19px), in the one .tab rule')
  assert.equal(css.match(/^\.tab \{/gm).length, 1, 'one .tab rule, one source for the size')
  assert.match(css, /^\.tabs\.eight \.tab \{ font-size: clamp\(0\.5[0-9]?rem, 3\.[0-9]vw, 0\.[0-9]+rem\)/m, 'the hosts\' eight labels too')
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

test('the hint cat says its hint line alone; a card of a kind the phone no longer shows never appears', async () => {
  const hint = { id: '2-cat-testimony', act: 2, beat: 'cat', kind: 'testimony', cat: 'salem', catName: 'Salem Crooknog', room: 'the Orangerie', lines: [], hint: { text: '(a hint line)' } }
  const greet = { id: '2-cat-greet-boo', act: 2, beat: 'cat', kind: 'testimony', cat: 'boo', catName: 'Miss Boo LaRue', room: 'the Entryway', lines: ['(a greeting)'] }
  // what an older build dealt in Act 2: the safe, the paper it paid out, the scrap of paper with its numbers
  const safe = { id: '2-puzzle-safe', act: 2, beat: 'puzzle', kind: 'puzzle', title: '(the safe)', text: '(three numbers)' }
  const paper = { id: '2-puzzle-safe-payout', act: 2, beat: 'puzzle', kind: 'document', text: '(a paper)' }
  const scrap = { id: '2-cat-scrap', act: 2, beat: 'cat', kind: 'notice', key: 'scrap', title: '(a scrap)', text: '(the numbers)', button: 'Keep it' }
  const checkin = { id: '2-checkin-checkin', act: 2, beat: 'checkin', kind: 'notice', key: 'checkin', title: '(check-in)', text: '(words)', button: 'Done' }
  const session = { cards: [greet, hint, scrap, safe, paper, checkin, null] }
  assert.deepEqual(nowCards(session, { seen: {} }, 2).map(c => c.id), ['2-checkin-checkin', '2-cat-testimony', '2-cat-greet-boo'])
  assert.deepEqual(clueCards(session).map(c => c.id), ['2-cat-testimony', '2-cat-greet-boo'])
  assert.equal(roleCard(session), null)
  for (const kind of ['puzzle', 'document']) assert.ok(!KINDS.has(kind) && !KEEPS.has(kind) && !TRANSIENT.has(kind), kind)
  // the phone has no safe, no paper and no brush-off left to draw
  const { readFileSync } = await import('node:fs')
  const src = (f) => readFileSync(new URL(`../src/${f}`, import.meta.url), 'utf8')
  const cards = src('screens/Cards.jsx')
  assert.ok(!/callSolve|function Safe|function Document|deflect|stationery/.test(cards), 'Cards.jsx draws no safe, paper or brush-off')
  assert.ok(cards.includes('{lines.length > 0 && ('), 'a card with no lines draws the hint alone')
  assert.ok(!src('firebase.js').includes("'solve'"), 'the phone never calls the safe')
  assert.ok(!/Document|'document'/.test(src('screens/Clues.jsx')), 'Clues keeps no paper')
})

test('Act 2 rooms: the next step shows only in Act 2, and a room code names one of the four cats', () => {
  const session = { lights: { step: 'go', cat: 'granolia', catName: 'Granolia Lickspittle', room: 'the Study', title: 'Go to the Study', text: '(words)' } }
  assert.equal(lightsStep(session, 2)?.step, 'go')
  assert.equal(lightsStep(session, 3), null, 'gone at supper')
  assert.equal(lightsStep({ lights: { step: 'nonsense' } }, 2), null)
  assert.equal(lightsStep({}, 2), null)
  assert.deepEqual(LIGHTS_STEPS, ['wait', 'go', 'with', 'done'])
  assert.equal(meetParam('?meet=salem'), 'salem')
  assert.equal(meetParam('?meet=irwin'), null, 'Sir Irwin keeps no room in Act 2')
  assert.equal(meetParam('?kiosk=living'), null)
  // a testimony is on Now as soon as it is dealt: the greeting comes only when the guest is with the cat
  const t = { id: '2-cat-testimony', act: 2, beat: 'cat', kind: 'testimony', cat: 'salem', lines: ['(a line)'] }
  assert.deepEqual(nowCards({ cards: [t] }, { seen: {} }, 2).map(c => c.id), ['2-cat-testimony'])
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

test('CL-8 the REHEARSAL band: every rehearsal night, never the party night, never in the dark', async () => {
  // nights rehearse unless the workshop's party box was ticked (forceRehearsal false)
  assert.equal(isRehearsalNight({ forceRehearsal: true, rehearsal: false, phase: 'lobby' }), true, 'at the doors, before any case is dealt')
  assert.equal(isRehearsalNight({ forceRehearsal: true, rehearsal: true }), true)
  assert.equal(isRehearsalNight({ rehearsal: false }), true, 'no flag at all: a rehearsal, as the dealer reads it')
  assert.equal(isRehearsalNight({ forceRehearsal: false, rehearsal: false }), false, 'the party night')
  assert.equal(isRehearsalNight({ forceRehearsal: false, dryRun: true }), true, 'a fake-players dry run is not the party')
  assert.equal(isRehearsalNight(null), false)
  // the band goes dark with the room
  const night = { forceRehearsal: true, phase: 'act' }
  assert.equal(showRehearsalBand(night), true)
  assert.equal(showRehearsalBand({ ...night, phase: 'blackout' }), false)
  assert.equal(showRehearsalBand({ ...night, phase: 'prompt' }), false)
  assert.equal(showRehearsalBand({ ...night, phase: 'paused', pausedFrom: 'blackout' }), false)
  assert.equal(showRehearsalBand({ ...night, phase: 'paused', pausedFrom: 'act' }), true)
  assert.equal(showRehearsalBand({ ...night, phase: 'lobby' }), true)
  assert.equal(showRehearsalBand({ forceRehearsal: false, phase: 'act' }), false)
  // every phone screen after the doors carries it, except the blackout and the prompt
  const { readFileSync } = await import('node:fs')
  const app = readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8')
  assert.ok(app.includes('<RehearsalBand on={showRehearsalBand(n)} />'))
  assert.equal((app.match(/return <>\{band\}/g) ?? []).length, 7, 'join, superseded, the permissions, welcome, a window, the pause and the phone at rest')
  assert.ok(app.includes('if (isDark(n)) return <Blackout />'), 'the blackout has no band')
  const css = readFileSync(new URL('../src/styles.css', import.meta.url), 'utf8')
  assert.ok(/\.rehearsal-band \{[^}]*position: fixed; top: 0;/.test(css), 'the band is fixed across the top')
  assert.ok(css.includes(':root.rehearsal-on body { padding-top: var(--band-h); }'), 'the page moves down so nothing is covered')
})

test('CL-24 a True Friend sees the honour again at the top of Salem\'s row', async () => {
  assert.equal(salemFriendNote({ salemFriend: false, cards: [] }), null)
  assert.equal(salemFriendNote(null), null)
  const card = { id: 'salem-friend', kind: 'notice', title: 'True Friend of the Groundskeeper', text: '[the workshop SALEM FRIEND line]' }
  assert.deepEqual(salemFriendNote({ salemFriend: true, cards: [card] }), { title: card.title, text: card.text }, 'the words the server sent')
  assert.deepEqual(salemFriendNote({ salemFriend: true, cards: [] }), SALEM_FRIEND, 'the card is gone: the default words')
  assert.ok(SALEM_FRIEND.text.startsWith("Well, I'll be. Salem has chosen you."))
  const { readFileSync } = await import('node:fs')
  const server = readFileSync(new URL('../../functions/lib/deal.js', import.meta.url), 'utf8')
  assert.ok(server.includes(SALEM_FRIEND.text), 'the same default words as the server')
  const rest = readFileSync(new URL('../src/screens/Rest.jsx', import.meta.url), 'utf8')
  assert.ok(rest.includes("{cat.key === 'salem' && friend && <p className=\"friend-note\">"), 'shown at the top of Salem\'s open row')
})
