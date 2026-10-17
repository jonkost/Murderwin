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
