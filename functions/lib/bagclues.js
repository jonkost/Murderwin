// The bag clues (docs/handoff-2026-10-23.md §9.1, §9.2, §15; docs/sensory-bags.md).
// A cat names a clue word that is in one bag (Act 2: the Murderer's; Act 4:
// the Ghost's) and in one or two other bags in play, never only one, and
// never an item, a bag number or a person: a compass, not a pointer.
//
// Pure: the words come from the packing (sealed/bags `words`, written blind by
// scripts/pack-bags.mjs), the lines from the open bank (seed/bag-lines.json).
// The dealer (deal.js) reads the packing with the Admin SDK and calls these.
//
//   Act 2  every cat a guest visits gives one bag clue about the Murderer, at
//          the rung its affection for that guest sets at the scan.
//   Act 4  every game room pays a bag hint about the Ghost, at the rung of the
//          group's average affection with that room's cat.
//
// Each guest (Act 2) or group (Act 4) is given ONE true word for the bag, so
// two true words can never be crossed to pin one bag (G46), and Salem's wrong
// word is one that, read backwards ("not that"), still leaves at least two
// bags (G46 again). A word counts once per bag, whatever its sense.
//
// SEAL RULE: nothing here prints or logs. The fill is the case's: the dealer
// writes what each line named into cases/{id} (for the checks) and onto the
// one phone it is dealt to, never anywhere else.

import { readFileSync } from 'node:fs'
import { dirname, join as joinPath } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createHash } from 'node:crypto'

const here = dirname(fileURLToPath(import.meta.url))
export const BAG_LINES = JSON.parse(readFileSync(joinPath(here, '..', 'seed', 'bag-lines.json'), 'utf8')) // copied from ../seed by `npm run seed`
export const BAG_CATS = ['granolia', 'zimothy', 'boo', 'salem']
export const CAT_SHORT = { granolia: 'Granolia', zimothy: 'Zimothy', boo: 'Boo', salem: 'Salem' }
export const SENSES = Object.keys(BAG_LINES.senses)

function unit(...parts) {
  const h = createHash('sha256').update(parts.map(String).join('\u0000')).digest()
  return h.readUInt32BE(0) / 0x100000000
}
function seededPick(list, ...seed) {
  if (!list.length) return undefined
  return [...list].map(x => ({ x, r: unit(...seed, x) })).sort((a, b) => a.r - b.r)[0].x
}
const rungOf = l => Math.min(5, Math.max(1, Math.round(Number(l) || 3)))

// ---------------------------------------------------------------------------
// The words in play. `packing` is sealed/bags; `inPlay` the bag numbers the
// guests at the party hold.

// Which in-play bags carry each word.
export function wordBags(packing, inPlay) {
  const live = new Set((inPlay ?? []).map(Number))
  const out = {}
  for (const [n, words] of Object.entries(packing?.words ?? {})) {
    if (!live.has(Number(n))) continue
    for (const w of Object.keys(words ?? {})) (out[w] ??= []).push(Number(n))
  }
  for (const w of Object.keys(out)) out[w].sort((a, b) => a - b)
  return out
}

// A bag's clue words among the bags in play: in it, and in two or three in-play
// bags. Never one. When a bag has none (too many bags sat out), none: the
// dealer falls back to a line that names no word.
export function clueWords(packing, bag, inPlay) {
  const at = wordBags(packing, inPlay)
  return Object.keys(packing?.words?.[String(bag)] ?? {}).filter(w => [2, 3].includes(at[w]?.length ?? 0)).sort()
}

// Words NOT in the bag that still sit in two or three in-play bags: Salem's
// wrong words. Preferred: one whose bags, struck out, still leave at least two
// of the true word's bags standing (so "not that" never pins one bag).
export function wrongWords(packing, bag, inPlay, { truth = null } = {}) {
  const at = wordBags(packing, inPlay)
  const mine = new Set(Object.keys(packing?.words?.[String(bag)] ?? {}))
  const all = Object.keys(at).filter(w => !mine.has(w) && [2, 3].includes(at[w].length)).sort()
  if (!truth || !at[truth]) return all
  const keeps = w => at[truth].filter(n => !at[w].includes(n)).length >= 2
  const safe = all.filter(keeps)
  return safe.length ? safe : all
}

// The senses a word has in a bag.
export function sensesOf(packing, bag, word) {
  const s = packing?.words?.[String(bag)]?.[word]
  return Array.isArray(s) ? s.filter(x => SENSES.includes(x)) : []
}

// ---------------------------------------------------------------------------
// One person's (or one group's) plan for a bag: the one true word, Salem's
// wrong word, and the sense the rung-2 and rung-3 lines name. `seed` is the
// case's secret and the guest or group, so a re-deal agrees.
export function bagPlan(packing, { bag, inPlay, seed = '' } = {}) {
  if (!packing?.words || bag == null || !packing.words[String(bag)]) return null
  const truths = clueWords(packing, bag, inPlay)
  const truth = seededPick(truths, seed, 'truth') ?? null
  const wrong = seededPick(wrongWords(packing, bag, inPlay, { truth }), seed, 'wrong') ?? null
  const senseFrom = truth ?? seededPick(Object.keys(packing.words[String(bag)]), seed, 'any') ?? null
  const sense = senseFrom ? seededPick(sensesOf(packing, bag, senseFrom), seed, 'sense') ?? null : null
  return { truth, wrong, sense }
}

// ---------------------------------------------------------------------------
// The line.

// Fill a template: ___ is the word, [sense] / [sense:verb] / [sense:organ] the sense.
export function fillLine(template, { word = null, sense = null } = {}) {
  const forms = BAG_LINES.senses[sense] ?? null
  let t = String(template ?? '')
  if (word) t = t.replace(/___/g, word)
  if (forms) t = t.replace(/\[sense:verb\]/g, forms.verb).replace(/\[sense:organ\]/g, forms.organ).replace(/\[sense\]/g, forms.noun)
  return t
}
const needsWord = t => /___/.test(t)
const needsSense = t => /\[sense(:verb|:organ)?\]/.test(t)

// What a rung asks for, by cat and act: 'word', 'sense' or 'none'.
export function rungNeeds(cat, act, rung) {
  const t = templateOf(cat, act, rung)
  return needsWord(t) ? 'word' : needsSense(t) ? 'sense' : 'none'
}

export function templateOf(cat, act, rung) {
  const bank = act === 4 ? BAG_LINES.act4 : BAG_LINES.act2
  return bank?.[cat]?.[rungOf(rung) - 1] ?? ''
}

// Does Salem tell it straight at this rung? Wrong at 1 to 3, a coin flip at
// 4 (seeded, so a re-deal agrees), right at 5.
export function salemStraight(rung, seed = '') {
  const r = rungOf(rung)
  return r === 5 || (r === 4 && unit(seed, 'salem-bag-coin') < 0.5)
}

// One cat's bag line for one guest or group.
//   plan   bagPlan(...) for the bag the line is about (null: no packing)
//   act    2 (the Murderer) or 4 (the Ghost)
// Returns { text, word, sense, right } where `word` is the word named (or
// null), `right` whether it is the bag's own (null when no word is named).
// With no plan, or a rung that wants a word the plan does not have, the line
// steps down to the highest rung below it that it can fill, so the guest still
// hears the cat in character and nothing untrue is named.
export function bagLine(plan, { cat, act = 2, rung = 3, seed = '' } = {}) {
  if (!BAG_CATS.includes(cat)) return { text: null, word: null, sense: null, right: null }
  const lead = act === 4 ? BAG_LINES.act4.leadIn?.[cat] ?? null : null
  const out = (text, extra = {}) => ({ text: lead ? `${lead} ${text}` : text, word: null, sense: null, right: null, ...extra })
  for (let r = rungOf(rung); r >= 1; r--) {
    const tpl = templateOf(cat, act, r)
    const need = needsWord(tpl) ? 'word' : needsSense(tpl) ? 'sense' : 'none'
    if (need === 'none') return out(tpl)
    if (need === 'sense') {
      if (!plan?.sense) continue
      return out(fillLine(tpl, { sense: plan.sense }), { sense: plan.sense })
    }
    // a word: Salem's may be the wrong one; everyone else names only the true one
    const straight = cat === 'salem' ? salemStraight(r, seed) : true
    const word = straight ? plan?.truth : plan?.wrong
    if (!word) continue
    return out(fillLine(tpl, { word }), { word, right: straight })
  }
  // Salem's ladder is all words: with nothing to fill, his first line without the blank's clause
  return out(BAG_LINES[act === 4 ? 'act4' : 'act2'][cat][0].replace(/\s*[^.!?]*___[^.!?]*[.!?]/, '').trim() || 'Nothing to report.')
}

// The rehearsal stand-in: a rehearsal never reads the packing, so the slot
// says what would show there (Jon, 23 Oct 2026).
export function bagStandIn(cat, act = 2) {
  return `[${CAT_SHORT[cat] ?? 'The cat'}'s bag clue about the ${act === 4 ? 'Ghost' : 'Murderer'} appears here]`
}

// ---------------------------------------------------------------------------
// Sir Irwin's sharing prompts (§9.3, §15.4): the Parlour TV shows one at a
// time, a new one every `everyMinutes`, in an order no screen can replay
// from the night id: a shuffle of all of them, then another, never the same
// one twice running across the seam. Pure; the order goes on the screen doc
// (the prompts are open lines, so the order says nothing).
export const PROMPTS = BAG_LINES.prompts.lines
export const PROMPT_EVERY_MS = (Number(BAG_LINES.prompts.everyMinutes) || 3) * 60_000

export function promptOrder(seed, rounds = 6) {
  const n = PROMPTS.length
  const order = []
  for (let r = 0; r < rounds; r++) {
    let round = [...Array(n).keys()].map(i => ({ i, u: unit(seed, 'prompts', r, i) })).sort((a, b) => a.u - b.u).map(x => x.i)
    if (order.length && round[0] === order.at(-1)) round = [...round.slice(1), round[0]]
    order.push(...round)
  }
  return order
}

// Which prompt shows at `now`, for a screen that started at `startedAt`.
export function promptAt(order, startedAt, now, everyMs = PROMPT_EVERY_MS) {
  if (!order?.length) return 0
  const k = Math.max(0, Math.floor((now - startedAt) / everyMs))
  return order[k % order.length]
}

// Check L08: no prompt carries a clue word.
export function promptsWithClueWords(words) {
  return PROMPTS.filter(p => words.some(w => new RegExp(`\\b${w.replace(/[-]/g, '\\-')}\\b`, 'i').test(p))).length
}
