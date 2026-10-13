import { test } from 'node:test'
import assert from 'node:assert/strict'
import { normalizeBeats, pathTotals, pathCount, lintScenario, isComplete, titleOf, clampValue, fmtValue, choicesOf, emptyBeat } from '../src/lib/scenarios.js'

const tp = [
  { q: 'Do you care which way your toilet paper sits?', n: 2, a: 'Yes', av: 5, b: 'No', bv: 0 },
  { q: 'Which way?', n: 2, a: 'Over', av: 5, b: 'Under', bv: -1 },
  { q: 'Do you fix it when you see it wrong?', n: 2, a: 'Yes', av: -1, b: 'No', bv: -1 },
]

test('normalize fills three beats, clamps values, defaults to two choices', () => {
  const bs = normalizeBeats([{ q: 'x', av: '42', bv: 'nope' }])
  assert.equal(bs.length, 3)
  assert.deepEqual(bs[0], { q: 'x', n: 2, a: '', av: 9, b: '', bv: 0 })
  assert.deepEqual(bs[2], emptyBeat())
  assert.equal(clampValue(-20), -9)
  assert.equal(fmtValue(3), '+3')
  assert.equal(fmtValue(0), '0')
  assert.equal(fmtValue(-2), '-2')
  // an old set without n is read as two choices
  assert.deepEqual(normalizeBeats([{ q: 'Old?', a: 'Yes', av: 1, b: 'No', bv: 0 }])[0], { q: 'Old?', n: 2, a: 'Yes', av: 1, b: 'No', bv: 0 })
})

test('eight paths, whiteboard path Yes / Under / Yes totals +3', () => {
  const paths = pathTotals(tp)
  assert.equal(paths.length, 8)
  assert.equal(pathCount(tp), 8)
  assert.deepEqual(paths[0], { picks: ['Yes', 'Over', 'Yes'], total: 9 })
  const yuy = paths.find(p => p.picks.join() === 'Yes,Under,Yes')
  assert.equal(yuy.total, 3)
  assert.deepEqual(paths[7].picks, ['No', 'Under', 'No'])
  assert.equal(paths[7].total, -2)
})

test('a question can carry a third or fourth choice', () => {
  const three = [{ ...tp[0], n: 3, c: 'Depends', cv: 2 }, tp[1], { ...tp[2], n: 4, c: 'Sometimes', cv: 1, d: 'Never', dv: -3 }]
  assert.deepEqual(choicesOf(three[0]), ['a', 'b', 'c'])
  assert.equal(pathCount(three), 3 * 2 * 4)
  const paths = pathTotals(three)
  assert.equal(paths.length, 24)
  assert.deepEqual(paths[0], { picks: ['Yes', 'Over', 'Yes'], total: 9 })
  assert.deepEqual(paths[23], { picks: ['Depends', 'Under', 'Never'], total: -2 })
  assert.equal(isComplete(three), true)
  assert.equal(isComplete([{ ...tp[0], n: 3 }, tp[1], tp[2]]), false) // third choice has no words yet
  assert.match(lintScenario([{ ...tp[0], n: 3 }, tp[1], tp[2]]), /words on every choice/)
  // n is clamped to 2..4 and extra keys are dropped when n says so
  assert.deepEqual(normalizeBeats([{ ...tp[0], n: 9 }])[0].n, 4)
  assert.deepEqual(Object.keys(normalizeBeats([{ ...tp[0], n: 2, c: 'stray', cv: 3 }])[0]).sort(), ['a', 'av', 'b', 'bv', 'n', 'q'])
})

test('lint: complete silly scenario passes; gaps and heavy words are named', () => {
  assert.equal(lintScenario(tp, ['pie', 'dairy']), null)
  assert.match(lintScenario([{ q: '', a: 'a', b: 'b' }]), /Question 1 is empty/)
  assert.match(lintScenario([{ q: 'Ice in orange juice?', a: 'Yes', b: '' }]), /words on every choice/)
  assert.match(lintScenario([{ q: 'Would you steal a pie?', a: 'Yes', b: 'No' }], ['pie']), /from the case/)
  assert.match(lintScenario([{ q: 'Would you kill for cake?', a: 'Yes', b: 'No' }]), /Keep it silly/)
  assert.match(lintScenario([{ q: 'Soup?', a: 'Yes', b: 'Only on a Tuesday when it rains' }, tp[1], tp[2]]), /same length/)
  assert.match(lintScenario(tp.map(b => ({ ...b, av: 0, bv: 0 }))), /adds up to 0/)
  assert.match(lintScenario([{ q: 'Tea — or coffee?', a: 'Tea', b: 'Coffee' }]), /long dash/)
})

test('case words: animal names and roles are caught, everyday words are not', () => {
  const banned = ['irwin', 'boo', 'murderer', 'victim']
  const ok = [{ q: 'Toilet paper: over or under?', a: 'Over', b: 'Under', av: 1, bv: -1 }, { q: 'Pie for breakfast?', a: 'Yes', b: 'No' }, { q: 'Socks in bed?', a: 'Yes', b: 'No' }]
  assert.equal(lintScenario(ok, banned), null)
  assert.match(lintScenario([{ q: 'Would Boo approve?', a: 'Yes', b: 'No' }], banned), /from the case/)
  assert.match(lintScenario([{ q: "Is Boo's chair the best chair?", a: 'Yes', b: 'No' }], banned), /from the case/)
  assert.match(lintScenario([{ q: 'Who is the murderer?', a: 'Me', b: 'You' }], banned), /from the case/)
})

test('complete and title', () => {
  assert.equal(isComplete(tp), true)
  assert.equal(isComplete([tp[0], tp[1]]), false)
  assert.equal(titleOf(tp), 'Do you care which way your toilet paper sits?')
  assert.equal(titleOf([{ q: '' }, { q: 'Second?' }]), 'Second?')
})

test('normalize is idempotent and never rewrites a well-formed set', () => {
  const once = normalizeBeats(tp)
  assert.deepEqual(once, tp)
  assert.deepEqual(normalizeBeats(once), once)
  const spaced = [{ q: 'Which way? ', n: 2, a: 'Over ', av: 1, b: ' Under', bv: -1 }, tp[1], tp[2]]
  assert.deepEqual(normalizeBeats(spaced)[0], spaced[0]) // spaces are kept while typing
})
