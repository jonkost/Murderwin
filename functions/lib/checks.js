// The checks (docs/test-plan.md): pure functions that say pass or fail, never
// what a clue says. Two callers:
//   scripts/checks.mjs (npm run checks)  deals 1,000 stand-in cases and runs
//     the case checks on each; Jon reads the counts on the workshop's Health page.
//   steward.js (Jenna's "Run the checks")  runs the content checks on the real
//     sealed packing, leans and drawing pictures, on the server; Jenna's page
//     shows PASS or FIX NEEDED and the check's ID, nothing else.
//
// SEAL RULE: every result is { id, pass } (and a count). Nothing here returns,
// prints or logs a word, a lean, a bag, a picture or a case fact.

import { FAMILIES, ALL_MOTIVES, familyOf, hintsOf, familyForCat, memoryPick, irwinOptions, irwinCount, remainingMotives, roomClues, HINT_CATS } from './families.js'
import { hintLine } from './cats.js'
import { wordBags, clueWords, bagPlan, bagLine, BAG_CATS, PROMPTS, promptsWithClueWords } from './bagclues.js'
import { roomFor, roundsFor, ROOM_KEYS, PARLOUR, MEMORY_ROUNDS, ALL_TRACES, memoryBoards } from './act4.js'
import { makeGroups } from './station.js'
import { checkPicture, ROUND_SIZES } from './relay-bank.js'

// What each check is called, in plain words (the Health page and Jenna's page).
export const CHECK_NAMES = {
  G32: 'Every clue together names one motive at dial 3',
  G33: 'Act 2 hints never rule out the real family',
  G34: 'Sir Irwin shows five to one cards, the real one always among them',
  G39: 'Every bag clue fits the bag it is about',
  G41: 'Every clue word sits in two or three bags in play',
  G43: 'Every bag has at least two clue words',
  G45: 'No guest alone can name the real family after Act 2',
  G46: 'One guest\'s bag clues never pin one bag',
  G47: 'Every group visits every room once; never two groups in a room',
  G49: 'Salem names a wrong word at 1 to 3, the right one at 5',
  G50: 'The memory match: 7, 10 and 14 pairs, all fourteen traces',
  G51: 'Zimothy and Boo never cross off the real motive, never the same one twice',
  L01: 'No sealed file in the repo or its history',
  L06: 'The bag packing is not in the repo',
  L08: 'Sir Irwin\'s prompts never contain a clue word',
  PK1: 'Ten bags of four or five, one food, the pairs written out',
  PK2: 'With two bags sitting out, nearly every bag keeps two clue words',
  LN1: 'Every Parlour Game question has a lean for every cat',
  RP1: 'The drawing has a good picture for each of its three rounds',
}

// ---------------------------------------------------------------------------
// One stand-in case, every case check. `c` is a dealt case (case.js), `roster`
// the guests [{ key, bag, characterId }], `packing` a packing in the sealed
// shape (made in memory by the caller), `rng(n)` an integer in [0, n).
export function caseChecks(c, { roster, packing = null, rng }) {
  const out = []
  const add = (id, pass) => out.push({ id, pass: !!pass })
  const s = c.solving
  const keys = roster.map(g => g.key)

  // G33 and G45: two wrong families per guest; with the news, two families always stand
  let g33 = true, g45 = true
  for (const k of keys) {
    const fams = hintsOf(s, k)
    if (fams.includes(s.family) || fams.some(f => s.newsOut.includes(f))) g33 = false
    const out4 = new Set(s.newsOut)
    for (const cat of HINT_CATS) {
      const family = familyForCat(fams, { cat, seed: `${c.screenSalt}\u0000${k}` })
      const line = hintLine(c, { cat, level: 1 + rng(5), act: 2, family, seed: `${c.screenSalt}\u0000${k}\u0000${cat}`, bonusFamilies: [...fams, ...s.newsOut] })
      for (const f of line.families) out4.add(f)
      if (line.families.includes(s.family) || line.motives.includes(Number(c.motive))) g33 = false
    }
    if (out4.has(s.family) || FAMILIES.filter(f => !out4.has(f.key)).length < 2) g45 = false
  }
  add('G33', g33)
  add('G45', g45)

  // G47 and G51: the groups walk the rooms; Zimothy and Boo cross off one each
  const groups = keys.length >= 2 ? makeGroups(keys, { apart: [c.murderer, c.ghost].filter(Boolean), pickInt: rng }) : []
  const order = groups.map((_, i) => `g${i + 1}`)
  const rot = { order, rooms: [...ROOM_KEYS], rounds: roundsFor(order.length) }
  let g47 = true
  for (const gid of order) {
    const rooms = Array.from({ length: rot.rounds }, (_, r) => roomFor(rot, gid, r + 1)).filter(x => x !== PARLOUR)
    if (rooms.length !== ROOM_KEYS.length || new Set(rooms).size !== ROOM_KEYS.length) g47 = false
  }
  for (let r = 1; r <= rot.rounds; r++) {
    const here = order.map(gid => roomFor(rot, gid, r)).filter(x => x !== PARLOUR)
    if (new Set(here).size !== here.length) g47 = false
  }
  add('G47', g47)
  groups.forEach((members, i) => {
    const groupId = `g${i + 1}`
    s.memory[groupId] = memoryPick(c, { groupId, members, seed: c.screenSalt })
    s.boo[groupId] = memoryPick(c, { groupId, members, seed: c.screenSalt, tag: 'boo' })
  })
  const picks = [...Object.values(s.memory), ...Object.values(s.boo)]
  add('G51', !picks.includes(Number(c.motive)) && new Set(picks).size === picks.length)

  // G34 and G32: Sir Irwin's countdown, and every clue together at dial 3
  let g34 = true
  for (const band of [1, 2, 3, 4, 5]) {
    const opts = irwinOptions(c, { band, seed: c.screenSalt })
    if (opts.length !== irwinCount(band) || !opts.includes(Number(c.motive))) g34 = false
  }
  add('G34', g34)
  const irwin = irwinOptions(c, { band: 3, seed: c.screenSalt })
  const left = remainingMotives(roomClues(c, { irwin, bulletinBand: 3 }))
  add('G32', left.length === 1 && left[0] === Number(c.motive))

  // the bag clues, on the packing, with the bags the guests hold in play
  if (packing) {
    const inPlay = [...new Set(roster.map(g => Number(g.bag)).filter(Number.isFinite))]
    const at = wordBags(packing, inPlay)
    const bagOf = k => roster.find(g => g.key === k)?.bag
    let g39 = true, g41 = true, g46 = true, g49 = true
    const about = [[c.murderer, 2], [c.ghost, 4]]
    for (const [who, act] of about) {
      const bag = bagOf(who)
      if (bag == null) continue
      for (const k of keys) {
        const plan = bagPlan(packing, { bag, inPlay, seed: `${c.screenSalt}\u0000${act}\u0000${k}` })
        if (!plan) continue
        const named = new Set()
        for (const cat of BAG_CATS) for (let rung = 1; rung <= 5; rung++) {
          const line = bagLine(plan, { cat, act, rung, seed: `${c.screenSalt}\u0000${k}\u0000${cat}` })
          if (!line.word) continue
          if (![2, 3].includes(at[line.word]?.length ?? 0)) g41 = false
          const inBag = !!packing.words?.[String(bag)]?.[line.word]
          if (line.right && !inBag) g39 = false
          if (line.right === false && inBag) g39 = false
          if (cat !== 'salem' && !line.right) g39 = false
          if (cat === 'salem' && rung <= 3 && line.right) g49 = false
          if (cat === 'salem' && rung === 5 && line.right === false) g49 = false
          if (line.right) named.add(line.word)
        }
        if (named.size > 1) g46 = false
      }
    }
    add('G39', g39)
    add('G41', g41)
    add('G46', g46)
    add('G49', g49)
  }
  return out
}

// The checks that need no case: the memory match's boards and Sir Irwin's prompts.
export function boardChecks({ rng, clueWords: words = [] }) {
  const boards = memoryBoards(rng)
  const sizes = boards.map(b => b.length).join(',') === MEMORY_ROUNDS.map(n => n * 2).join(',')
  const paired = boards.every(b => Object.values(b.reduce((m, t) => ({ ...m, [t]: (m[t] ?? 0) + 1 }), {})).every(n => n === 2))
  const all = new Set(boards.at(-1)).size === ALL_TRACES.length
  return [{ id: 'G50', pass: sizes && paired && all }, { id: 'L08', pass: PROMPTS.length > 0 && promptsWithClueWords(words) === 0 }]
}

// ---------------------------------------------------------------------------
// The real content, for Jenna (steward.js). Each takes the sealed doc as it
// is and returns { id, pass, count?, of? }: counts, never content.

// PK1, G43, PK2 on the packing (sealed/bags).
export function packingChecks(packing, { rng, samples = 200 } = {}) {
  if (!packing?.bags || !packing?.words) return [{ id: 'PK1', pass: false }, { id: 'G43', pass: false }, { id: 'PK2', pass: false }]
  const numbers = Object.keys(packing.bags).map(Number).sort((a, b) => a - b)
  const sizes = numbers.every(n => [4, 5].includes((packing.bags[String(n)] ?? []).length))
  const pairs = Object.entries(packing.doubles ?? {}).every(([n, ids]) => (ids ?? []).every(id => (packing.bags[String(n)] ?? []).includes(id)))
  const allBags = numbers
  const twoEach = numbers.filter(n => clueWords(packing, n, allBags).length >= 2).length
  // two bags sit out: how many bags still hold two clue words among the bags in play
  let kept = 0, of = 0
  for (let i = 0; i < samples; i++) {
    const shuffled = [...numbers]
    for (let j = shuffled.length - 1; j > 0; j--) { const k = rng(j + 1); [shuffled[j], shuffled[k]] = [shuffled[k], shuffled[j]] }
    const inPlay = shuffled.slice(0, Math.max(2, numbers.length - 2))
    for (const n of inPlay) { of++; if (clueWords(packing, n, inPlay).length >= 2) kept++ }
  }
  return [
    { id: 'PK1', pass: numbers.length === 10 && sizes && pairs },
    { id: 'G43', pass: twoEach === numbers.length, count: twoEach, of: numbers.length },
    { id: 'PK2', pass: of > 0 && kept / of >= 0.9, count: kept, of },
  ]
}

// LN1 on the lean table (sealed/parlour_leans) against the bank's sets.
export function leanChecks(table, sets = []) {
  const cats = ['granolia', 'boo', 'zimothy', 'salem']
  let filled = 0, of = 0
  for (const s of sets) for (let q = 0; q < 3; q++) for (const cat of cats) { of++; if (['a', 'b'].includes(table?.[s.id]?.[q]?.[cat])) filled++ }
  return [{ id: 'LN1', pass: of > 0 && filled === of, count: filled, of }]
}

// RP1 on the drawing's picture bank (sealed/relay_pictures).
export function pictureChecks(bank) {
  const rounds = Object.keys(ROUND_SIZES).map(Number)
  const good = rounds.filter(r => (bank?.pictures ?? []).some(p => Number(p?.round) === r && !checkPicture(p, r).length)).length
  return [{ id: 'RP1', pass: good === rounds.length, count: good, of: rounds.length }]
}

export { ALL_MOTIVES, familyOf }
