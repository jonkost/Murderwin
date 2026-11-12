import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  BAG_LINES, BAG_CATS, wordBags, clueWords, wrongWords, bagPlan, bagLine, fillLine, templateOf, salemStraight, unfilled,
  PROMPTS, PROMPT_EVERY_MS, promptOrder, promptAt, promptsWithClueWords,
} from '../lib/bagclues.js'

// The bag clues (docs/handoff-2026-10-23.md §9.1, §9.2, §15; docs/test-plan.md
// G39 to G43, G46, G49, L08). Every packing here is a throwaway made in the
// test from bracketed words; nothing is printed.

const SEED = JSON.parse(readFileSync(new URL('../../seed/bag-items.json', import.meta.url), 'utf8'))
const CLUE_WORDS = SEED.words.map(w => w.word)

// A small seeded generator, so a failing seed can be replayed.
function seeded(seed) {
  let x = (seed * 2654435761) >>> 0 || 1
  return n => { x ^= x << 13; x >>>= 0; x ^= x >>> 17; x ^= x << 5; x >>>= 0; return x % n }
}

// A throwaway packing: ten bags, each with 3 to 5 bracketed words from a pool
// of fourteen, each word with a sense.
function packing(seed) {
  const rng = seeded(seed)
  const words = {}
  for (let n = 1; n <= 10; n++) {
    words[String(n)] = {}
    const k = 3 + rng(3)
    for (let i = 0; i < k; i++) words[String(n)][`(w${rng(14)})`] = [['sight', 'sound', 'smell', 'touch', 'taste'][rng(5)]]
  }
  return { words }
}
function inPlayOf(seed) {
  const rng = seeded(seed + 999)
  const all = Array.from({ length: 10 }, (_, i) => i + 1)
  for (let i = all.length - 1; i > 0; i--) { const j = rng(i + 1); [all[i], all[j]] = [all[j], all[i]] }
  return all.slice(0, 6 + rng(5))
}

test('the lines: five rungs per cat in both acts; a blank is ___ or a sense; rungs 1 and 2 never name a word', () => {
  for (const act of [2, 4]) for (const cat of BAG_CATS) {
    for (let r = 1; r <= 5; r++) assert.ok(templateOf(cat, act, r).length > 10, `${cat} act ${act} rung ${r}`)
    for (const r of [1, 2]) if (cat !== 'salem') assert.ok(!templateOf(cat, act, r).includes('___'), `${cat} act ${act} rung ${r}: no word`)
  }
  assert.equal(fillLine('Something ___ in it. You would [sense:verb] it, by [sense], with your [sense:organ].', { word: 'minty', sense: 'smell' }), 'Something minty in it. You would smell it, by smell, with your nose.')
  assert.equal(fillLine('If you [sense:verb] it.', { sense: 'sound' }), 'If you hear it.')
  assert.equal(unfilled('Off my lawn. Fine. The bag? Something ___ in it. Now git.'), 'Off my lawn. Fine. The bag? Now git.')
})

test('F28 with no packing for the bag every cat still says a line of its own, at every rung, with no blank and no note in brackets; it names no word', async () => {
  // the rehearsal stand-in ("[Salem's bag clue about the Murderer appears here]") is gone (11 Nov 2026)
  assert.equal((await import('../lib/bagclues.js')).bagStandIn, undefined)
  for (const plan of [null, undefined, bagPlan(null, { bag: 3, inPlay: [1, 2, 3] }), bagPlan({ words: {} }, { bag: 3, inPlay: [1, 2, 3] }), { truth: null, wrong: null, sense: null }]) {
    for (const cat of BAG_CATS) for (const act of [2, 4]) for (let rung = 1; rung <= 5; rung++) {
      const line = bagLine(plan, { cat, act, rung, seed: 'none' })
      assert.ok(typeof line.text === 'string' && line.text.length > 10, `${cat} act ${act} rung ${rung}: a line`)
      assert.ok(!/___|\[|\]/.test(line.text), `${cat} act ${act} rung ${rung}: no blank, no bracket`)
      assert.deepEqual([line.word, line.sense, line.right], [null, null, null], 'nothing is named')
    }
  }
  // the words are the cat's own, minus the sentence that would have named something
  assert.equal(bagLine(null, { cat: 'salem', act: 2, rung: 5 }).text, unfilled(templateOf('salem', 2, 1)))
  assert.equal(bagLine(null, { cat: 'granolia', act: 2, rung: 5 }).text, templateOf('granolia', 2, 2), 'the highest rung of hers that names nothing')
})

test('G41 and G43 every clue word a cat names sits in two or three of the bags in play, never one; G39 a true word is in the bag it is about', () => {
  for (let seed = 1; seed <= 400; seed++) {
    const p = packing(seed)
    const inPlay = inPlayOf(seed)
    const at = wordBags(p, inPlay)
    for (const bag of inPlay) {
      const plan = bagPlan(p, { bag, inPlay, seed: `s${seed}-${bag}` })
      if (plan.truth) {
        assert.ok(p.words[String(bag)][plan.truth], `seed ${seed}: the true word is in the bag`)
        assert.ok([2, 3].includes(at[plan.truth].length), `seed ${seed}: in two or three bags in play`)
      }
      if (plan.wrong) {
        assert.ok(!p.words[String(bag)][plan.wrong], `seed ${seed}: Salem's wrong word is not in the bag`)
        assert.ok([2, 3].includes(at[plan.wrong].length), `seed ${seed}: and still in two or three bags in play (G49)`)
      }
      for (const cat of BAG_CATS) for (const act of [2, 4]) for (let rung = 1; rung <= 5; rung++) {
        const line = bagLine(plan, { cat, act, rung, seed: `s${seed}-${bag}-${cat}` })
        assert.ok(line.text && !/___|\[sense/.test(line.text), `seed ${seed} ${cat} act ${act} rung ${rung}: every blank filled`)
        if (line.word) {
          assert.ok([2, 3].includes(at[line.word].length), `seed ${seed}: G41`)
          assert.equal(line.right, !!p.words[String(bag)][line.word], `seed ${seed}: right means it is in the bag`)
          if (cat !== 'salem') assert.equal(line.right, true, `seed ${seed}: only Salem ever names a wrong word`)
        }
      }
    }
  }
})

test('G40 no bag clue names an item, a bag number or a person', () => {
  const items = SEED.items.map(t => t.split('—')[0].trim().toLowerCase())
  for (let seed = 1; seed <= 100; seed++) {
    const p = packing(seed)
    const inPlay = inPlayOf(seed)
    for (const bag of inPlay) for (const cat of BAG_CATS) for (const act of [2, 4]) for (let rung = 1; rung <= 5; rung++) {
      const text = bagLine(bagPlan(p, { bag, inPlay, seed: `x${seed}` }), { cat, act, rung }).text.toLowerCase()
      assert.ok(!/\d/.test(text.replace(/\(w\d+\)/g, '')), 'no bag number')
      for (const it of items) assert.ok(!text.includes(it), 'no item')
    }
  }
})

test('G49 Salem is a wrong word at rungs 1 to 3, a coin flip at 4, the right one at 5; Boo says no word in Act 2 below 4 but speaks at every rung in Act 4', () => {
  for (const r of [1, 2, 3]) assert.equal(salemStraight(r, 'x'), false)
  assert.equal(salemStraight(5, 'x'), true)
  const flips = Array.from({ length: 400 }, (_, i) => salemStraight(4, `s${i}`))
  assert.ok(flips.filter(Boolean).length > 150 && flips.filter(Boolean).length < 250, 'about half and half at 4')
  const plan = { truth: '(true)', wrong: '(wrong)', sense: 'touch' }
  for (const r of [1, 2, 3]) assert.equal(bagLine(plan, { cat: 'salem', act: 2, rung: r }).word, '(wrong)')
  assert.equal(bagLine(plan, { cat: 'salem', act: 2, rung: 5 }).word, '(true)')
  for (const r of [1, 2, 3]) assert.equal(bagLine(plan, { cat: 'boo', act: 2, rung: r }).word, null, 'Boo in Act 2 below 4: no word')
  for (const r of [1, 2, 3, 4, 5]) assert.notEqual(bagLine(plan, { cat: 'boo', act: 4, rung: r }).text, null)
  assert.ok(bagLine(plan, { cat: 'granolia', act: 4, rung: 1 }).text.startsWith(BAG_LINES.act4.leadIn.granolia), 'Granolia\'s lead-in first in Act 4')
  // a rung that wants a word the plan does not have steps down, never names something untrue
  const thin = { truth: null, wrong: null, sense: 'smell' }
  assert.equal(bagLine(thin, { cat: 'zimothy', act: 2, rung: 5 }).word, null)
  assert.match(bagLine(thin, { cat: 'zimothy', act: 2, rung: 5 }).text, /nose|smell/)
})

test('G46 one guest\'s true words are one word, and Salem\'s wrong word read backwards never pins the bag', () => {
  for (let seed = 1; seed <= 400; seed++) {
    const p = packing(seed)
    const inPlay = inPlayOf(seed)
    const at = wordBags(p, inPlay)
    for (const bag of inPlay) {
      const plan = bagPlan(p, { bag, inPlay, seed: `g${seed}` })
      if (!plan.truth) continue
      const named = new Set()
      for (const cat of BAG_CATS) for (let rung = 1; rung <= 5; rung++) {
        const line = bagLine(plan, { cat, act: 2, rung, seed: `g${seed}-${cat}` })
        if (line.word && line.right) named.add(line.word)
      }
      assert.ok(named.size <= 1, `seed ${seed}: one true word per guest, so two can never be crossed to pin the bag`)
      if (plan.wrong && wrongWords(p, bag, inPlay, { truth: plan.truth }).some(w => at[plan.truth].filter(n => !at[w].includes(n)).length >= 2)) {
        assert.ok(at[plan.truth].filter(n => !at[plan.wrong].includes(n)).length >= 2, `seed ${seed}: "not that" still leaves two bags`)
      }
    }
  }
  assert.deepEqual(clueWords({ words: { 1: { a: [], b: [] }, 2: { a: [] }, 3: { b: [] }, 4: { b: [] }, 5: { b: [] } } }, 1, [1, 2, 3, 4, 5]), ['a'], 'b is in four bags: no clue')
})

test('L08 Sir Irwin\'s sixteen prompts never contain a clue word; one at a time, no repeat until all have shown', () => {
  assert.equal(PROMPTS.length, 16)
  assert.equal(promptsWithClueWords(CLUE_WORDS), 0)
  for (const w of CLUE_WORDS) for (const p of PROMPTS) assert.ok(!p.toLowerCase().includes(w), 'no clue word')
  const order = promptOrder('salt')
  for (let r = 0; r < order.length / 16; r++) assert.equal(new Set(order.slice(r * 16, r * 16 + 16)).size, 16, 'every prompt once per round')
  for (let i = 1; i < order.length; i++) assert.notEqual(order[i], order[i - 1], 'never the same one twice running')
  assert.equal(PROMPT_EVERY_MS, 3 * 60_000)
  assert.equal(promptAt(order, 1000, 1000), order[0])
  assert.equal(promptAt(order, 1000, 1000 + PROMPT_EVERY_MS), order[1])
  assert.notDeepEqual(promptOrder('salt'), promptOrder('other'), 'seeded on the case\'s salt')
})
