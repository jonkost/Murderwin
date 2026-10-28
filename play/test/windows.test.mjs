import { test } from 'node:test'
import assert from 'node:assert/strict'
import { THANKS, answerOutcome, outcomeForError } from '../src/lib/windows.js'

// The Parlour Game's last screen reads the same whatever the server said:
// in time, late, or twice. A phone never shows "Try again" for a window
// that has closed.

test('an answer in time, a late answer and a repeated answer all end on Thanks', () => {
  assert.equal(answerOutcome({ data: { ok: true } }), 'thanks')
  assert.equal(answerOutcome({ data: { ok: true, late: true } }), 'thanks')
  assert.equal(answerOutcome({ data: { ok: true, already: true } }), 'thanks')
  assert.equal(answerOutcome({ ok: true, late: true }), 'thanks', 'with or without the callable wrapper')
})

test('only a reply the Manor did not give is retried', () => {
  assert.equal(answerOutcome(undefined), 'retry')
  assert.equal(answerOutcome({ data: {} }), 'retry')
  assert.equal(answerOutcome({ data: { ok: false } }), 'retry')
  assert.equal(outcomeForError({ code: 'functions/failed-precondition', message: 'That window has closed.' }), 'thanks', 'a window that is gone is not an error for the phone')
  assert.equal(outcomeForError({ code: 'functions/internal' }), 'retry')
  assert.equal(outcomeForError({ code: 'functions/unavailable' }), 'retry')
  assert.equal(outcomeForError(new Error('network')), 'retry')
})

test('the Thanks copy is plain, short, and says nothing about time or points', () => {
  assert.equal(THANKS.title, 'Thanks')
  assert.ok(THANKS.text.split(/\s+/).length <= 12)
  for (const s of Object.values(THANKS)) {
    assert.ok(!s.includes('—'), 'no em dash on screen')
    assert.ok(!/late|point|score|closed|too slow/i.test(s), 'no pattern for a late phone')
  }
})

// F19 (docs/parlour-games.md): a Parlour Game that pops up over another
// screen returns the phone to exactly where it was.
test('F19 a Parlour Game shows over the screen beneath, which stays mounted in the same place, so the phone comes back exactly where it was', async () => {
  const { overlays, placement, stopOf } = await import('../src/lib/night.js')
  assert.equal(overlays({ kind: 'questions' }), true)
  assert.equal(overlays({ kind: 'ballot' }), false, 'the ballot is a card on Now, the deduction round a beat of its own')
  assert.equal(overlays({ kind: 'eliminate' }), false)
  assert.equal(overlays(null), false)
  // where each window shows (25 Oct 2026, cue 19: the ballot moved from the whole screen to a card on Now)
  assert.equal(placement({ kind: 'questions' }), 'overlay')
  assert.equal(placement({ kind: 'eliminate' }), 'screen')
  assert.equal(placement({ kind: 'ballot' }), 'card')
  assert.equal(placement(null), null)
  const { readFileSync } = await import('node:fs')
  const app = readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8')
  // one place renders the screen beneath, with or without a game on top: same parent, same slot,
  // so React keeps its state (the tab, a half-typed answer, the scroll)
  assert.equal((app.match(/<Rest /g) ?? []).length, 1, 'Rest is rendered from one place only')
  // (a pause with the ballot card up keeps that same page beneath, inert under the strip: 25 Oct 2026)
  assert.match(app, /return <>\{band\}\{banner\}\{strip\}<div className=\{over \? 'beneath covered' : heldCard \? 'beneath paused-shell' : 'beneath'\} inert=\{over \|\| heldCard \|\| undefined\}[^>]*>\{base\}<\/div>\{top\}<\/>/)
  // the slider shows the nearest stop of an affection kept in half steps
  assert.equal(stopOf(2.5), 3); assert.equal(stopOf(4.5), 5); assert.equal(stopOf(1), 1); assert.equal(stopOf(undefined), 3); assert.equal(stopOf(9), 5)
})

// The ballot as a card on the Now tab (Jon's cue list, cue 19, 25 Oct 2026):
// the tabs stay reachable, the two minutes stay on the server's clock, and
// after Lock it in a small card holds the place until the session has the
// ballot. Nothing on the server changed: the window still never closes early.
test('the ballot is a card on Now with the tabs reachable: App hands the window to Rest, Rest draws it in the Now grid and jumps there, and the sent card follows Lock it in', async () => {
  const { readFileSync } = await import('node:fs')
  const read = f => readFileSync(new URL(`../src/${f}`, import.meta.url), 'utf8')
  const app = read('App.jsx')
  assert.match(app, /const where = placement\(w\)/)
  assert.match(app, /if \(w && sent !== w\.id && where !== 'card'\)/, 'a ballot never becomes the screen')
  assert.ok(!/w\.kind === 'ballot'\) screen =/.test(app), 'the full-screen Ballot branch is gone')
  assert.match(app, /const ballot = where === 'card'\s*\? \{ w, sent: sent === w\.id, onDone: \(\) => setSent\(w\.id\), clock, draft: draft\?\.id === w\.id \? draft : null, onDraft: \(d\) => setDraft\(\{ id: w\.id, \.\.\.d \}\) \}\s*: null/, 'the window, the frozen server clock and the picks so far go down together')
  // the two minutes stay on the server's clock, frozen in a pause (clockFor): the same clock that opened the window
  assert.match(app, /const clock = clockFor\(n, serverNow\)/)
  // the picks so far live above the tab switch: the Now pane unmounts when a guest opens Clues or Motives, App never does
  assert.match(app, /const \[draft, setDraft\] = useState\(null\)/, 'App holds the ballot draft, not the Now pane')
  // a pause with the card up keeps it on screen, inert under the strip, like any paused window
  assert.match(app, /const heldCard = paused && where === 'card'/)
  assert.match(app, /if \(paused && !over && !heldCard\) return <>\{band\}\{banner\}<Moment text=\{ui\.PAUSED\} crest \/><\/>/, 'the paused line yields to the held card')
  assert.match(app, /const strip = heldCard \? <PausedStrip ui=\{ui\} \/> : null/)
  assert.match(app, /<Rest [^\n]*ballot=\{ballot\}[^\n]*over=\{lock === 'over'\}/)
  const rest = read('screens/Rest.jsx')
  assert.match(rest, /ballot\?\.w\?\.id/, 'the phone jumps to Now when the ballot opens')
  assert.match(rest, /\(ballot && !ballot\.sent \? 1 : 0\)/, 'the Now badge counts an unsent ballot')
  const now = rest.slice(rest.indexOf('function Now('))
  assert.match(now, /ballot\.sent\s*\? <BallotSent \/>\s*: <Ballot [^\n]*serverNow=\{ballot\.clock\} onDone=\{ballot\.onDone\} draft=\{ballot\.draft\} onDraft=\{ballot\.onDraft\} card \/>/, 'the card variant, on the clock that came down with the window, with the picks so far')
  const windows = read('screens/Windows.jsx')
  const ballot = windows.slice(windows.indexOf('export function Ballot'), windows.indexOf('export function BallotSent'))
  assert.match(ballot, /card \? 'dealt ballot-card' : 'moment window ballot papered'/)
  assert.equal((ballot.match(/<Clock w=\{w\} serverNow=\{serverNow\} \/>/g) ?? []).length, 2, 'the clock stays on both steps of the card')
  assert.match(ballot, /\{!card && <Seal \/>\}/, 'no crest inside a card')
  // the draft is the caller's when the ballot is a card: no step or pick state of the pane's own to lose on a tab switch
  assert.match(ballot, /const \{ step, pick \} = onDraft \? \(draft \?\? EMPTY_DRAFT\) : local/)
  assert.ok(!/useState\(0\)|setStep|setPick/.test(ballot), 'no step or pick state of its own')
  const sent = windows.slice(windows.indexOf('export function BallotSent'), windows.indexOf('export function EyesLock'))
  assert.match(sent, /Your three are in/)
  assert.ok(!/<button/.test(sent), 'nothing to tap: it goes on its own when the ballot comes back')
  assert.ok(!/two minutes|are up|when the/i.test(sent), 'promises no timing: the reveal comes when the host presses Next, not on the clock')
  // the preview keeps a page for each shape
  const preview = read('Preview.jsx')
  for (const k of ["case 'ballot':", "case 'ballot-sent':", "case 'eyes':", "case 'result-lock':"]) assert.ok(preview.includes(k), k)
})

// Act 7 on the phone (the cue list, cues 20 to 23): eyes on the screen through
// the reveal, the result with a thank-you through the credits, then The End
// opens everything up for good with the result kept on Now.
test('the Act 7 locks: eyes on the reveal, the result with a thank-you on the result beat, open for good at The End, and nowCards keeps the result when the night is over', async () => {
  const { phoneLock, lockFor, isOver, nowCards, resultCard, EMPTY_NOTES } = await import('../src/lib/night.js')
  assert.equal(phoneLock({ act: 7, beat: 'ballot', phase: 'act' }), null, 'the ballot is a card, not a lock')
  // the host phones keep their tabs through the reveal and the result (the Host tab names the three and presses Next)
  const host = { host: 'jonathan', guestKey: 'jon' }
  const guest = { host: null, guestKey: 'jessa' }
  assert.equal(lockFor({ act: 7, beat: 'reveal' }, host), null)
  assert.equal(lockFor({ act: 7, beat: 'result' }, host), null)
  assert.equal(lockFor({ act: 7, beat: 'end' }, host), 'over', 'The End is the same on every phone')
  assert.equal(lockFor({ act: 7, beat: 'reveal' }, guest), 'eyes')
  assert.equal(lockFor({ act: 7, beat: 'result' }, guest), 'result')
  assert.equal(lockFor({ act: 7, beat: 'end' }, guest), 'over')
  assert.equal(phoneLock({ act: 7, beat: 'reveal', phase: 'act' }), 'eyes')
  assert.equal(phoneLock({ act: 7, beat: 'result', phase: 'act' }), 'result')
  assert.equal(phoneLock({ act: 7, beat: 'end', phase: 'act' }), 'over')
  assert.equal(phoneLock({ act: 7, beat: 'end', phase: 'act', over: true }), 'over')
  assert.equal(phoneLock({ act: 6, beat: 'door', phase: 'act', over: true }), 'over', 'a night marked over is over whatever beat it says')
  assert.equal(phoneLock({ act: 6, beat: 'eliminate', phase: 'act' }), null)
  assert.equal(phoneLock({ act: 2, beat: 'news', phase: 'act' }), null)
  assert.equal(phoneLock(null), null)
  assert.equal(isOver({ act: 7, beat: 'end' }), true)
  assert.equal(isOver({ act: 7, beat: 'result' }), false)
  // the result card: put away with Keep this during the night, kept on Now once the night is over
  const result = { id: '7-result-result', act: 7, beat: 'result', kind: 'result', murderer: true, motive: false, victim: true, picks: {} }
  const eyes = { id: '7-reveal-eyes', act: 7, beat: 'reveal', kind: 'notice', key: 'eyes', title: '(eyes)', text: '(watch)', button: 'Watching' }
  const session = { cards: [eyes, result] }
  const kept = { ...EMPTY_NOTES, seen: { '7-result-result': true, '7-reveal-eyes': true } }
  assert.deepEqual(nowCards(session, kept, 7).map(c => c.id), [], 'during the night a kept result leaves Now')
  assert.deepEqual(nowCards(session, kept, 7, { over: true }).map(c => c.id), ['7-result-result'], 'at The End the result stays, the tapped notice does not')
  assert.deepEqual(nowCards(session, EMPTY_NOTES, 7, { over: true }).map(c => c.id), ['7-result-result', '7-reveal-eyes'], 'an untapped notice still waits its tap')
  assert.equal(resultCard(session)?.id, '7-result-result')
  assert.equal(resultCard({ cards: [eyes] }), null)
  // the screens: the locks have no tabs and nothing to tap; the result card on a lock has no Keep this
  const { readFileSync } = await import('node:fs')
  const read = f => readFileSync(new URL(`../src/${f}`, import.meta.url), 'utf8')
  const windows = read('screens/Windows.jsx')
  const eyesLock = windows.slice(windows.indexOf('export function EyesLock'), windows.indexOf('export function ResultLock'))
  const resultLock = windows.slice(windows.indexOf('export function ResultLock'), windows.indexOf('// Act 6: commit'))
  assert.match(eyesLock, /Eyes on the screen\./)
  assert.match(resultLock, /Thank you for playing\./)
  assert.match(resultLock, /<Result card=\{card\} seen \/>/, 'the card with nothing to tap')
  for (const s of [eyesLock, resultLock]) assert.ok(!/<button|<nav|Rest/.test(s), 'no tabs, no button on a lock')
  const app = read('App.jsx')
  assert.match(app, /const lock = lockFor\(n, s\)/, 'this phone\'s lock: the hosts keep their tabs')
  assert.match(app, /if \(lock === 'eyes'\) \{\s*base = <EyesLock \/>/)
  assert.match(app, /else if \(lock === 'result'\) \{\s*base = <ResultLock card=\{resultCard\(s\)\} \/>/)
  assert.match(app, /\['intro', 'walk', 'turn', 'vote', 'lockout'\]\.includes\(r\.state\)/, 'the phones show the drawing from Sir Irwin\'s slides on (cue 16)')
  assert.match(app, /const drawing = lock !== 'over' && r && \[/, 'The End wins over the drawing\'s screens')
  assert.match(app, /&& !\(r\.state === 'intro' && s\.host\)/, 'the two host phones keep their tabs through the slides: Pause lives there')
  assert.match(app, /else if \(lock !== 'over' && doneKey && !notes\.seen\[doneKey\]\)/, 'a door card never put away does not hide the result at The End')
  const relay = read('screens/Relay.jsx')
  assert.match(relay, /To the Parlour\. Eyes on the TV\./)
  // Now: the result card loses its button at The End, and the quiet line says the night is over
  const cards = read('screens/Cards.jsx')
  assert.match(cards, /case 'result': return <Result card=\{card\} onDone=\{put\} seen=\{seen \|\| over\} \/>/)
  const rest = read('screens/Rest.jsx')
  assert.match(rest, /nowCards\(session, notes, night\.act, \{ over \}\)/)
  assert.match(rest, /over \? 'That is the end of the night\./)
})

test('the questions screen never names a cat: the listening cat is a secret', async () => {
  const { readFileSync } = await import('node:fs')
  const src = readFileSync(new URL('../src/screens/Windows.jsx', import.meta.url), 'utf8')
  const questions = src.slice(src.indexOf('export function Questions'), src.indexOf('export function Ballot'))
  assert.ok(!/catName|CatFace|set\.cat\b/.test(questions))
})
