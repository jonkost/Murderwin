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
  const { overlays, stopOf } = await import('../src/lib/night.js')
  assert.equal(overlays({ kind: 'questions' }), true)
  assert.equal(overlays({ kind: 'ballot' }), false, 'the ballot and the deduction round are beats of their own')
  assert.equal(overlays({ kind: 'eliminate' }), false)
  assert.equal(overlays(null), false)
  const { readFileSync } = await import('node:fs')
  const app = readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8')
  // one place renders the screen beneath, with or without a game on top: same parent, same slot,
  // so React keeps its state (the tab, a half-typed answer, the scroll)
  assert.equal((app.match(/<Rest /g) ?? []).length, 1, 'Rest is rendered from one place only')
  assert.match(app, /return <>\{band\}\{banner\}<div className=\{over \? 'beneath covered' : 'beneath'\} inert=\{over \|\| undefined\}[^>]*>\{base\}<\/div>\{top\}<\/>/)
  // the slider shows the nearest stop of an affection kept in half steps
  assert.equal(stopOf(2.5), 3); assert.equal(stopOf(4.5), 5); assert.equal(stopOf(1), 1); assert.equal(stopOf(undefined), 3); assert.equal(stopOf(9), 5)
})

test('the questions screen never names a cat: the listening cat is a secret', async () => {
  const { readFileSync } = await import('node:fs')
  const src = readFileSync(new URL('../src/screens/Windows.jsx', import.meta.url), 'utf8')
  const questions = src.slice(src.indexOf('export function Questions'), src.indexOf('export function Ballot'))
  assert.ok(!/catName|CatFace|set\.cat\b/.test(questions))
})
