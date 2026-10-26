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
import { rehearsalCase, rerollCase } from './case.js'
import { bulletin2, NEWS } from './news.js'
import { traceOf, workReveal, shownReveal } from './traces.js'
import { CHARACTERS, MOTIVES } from './night.js'

// What each check is called, in plain words (the Health page and Jenna's page).
export const CHECK_NAMES = {
  G01: 'One Murderer and one Ghost, two different people; everyone else a Detective',
  G03: 'Characters not in play leave no trace and no clue',
  G04: 'The motive is one of the nineteen',
  G05: 'Every seat, both host seats included, lands Murderer and Ghost about equally often',
  G06: 'All nineteen motives turn up in fair shares',
  G09: 'No single clue before Act 6 gives the Murderer away',
  G17: 'Salem\'s ladder holds, and his lines alone never solve the case',
  G19: 'When Sir Irwin and a cat disagree, Sir Irwin is right',
  G20: 'Everyone is in exactly one pair or trio',
  G21: 'The Murderer and the Ghost are never in one group',
  G23: 'Spill the Beans: the new story passes the case checks again',
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
  G53: 'Every bulletin 2 line, at every level, points at the real family',
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
export function caseChecks(c, { roster, packing = null, rng, reroll = true }) {
  const out = []
  const add = (id, pass) => out.push({ id, pass: !!pass })
  const s = c.solving
  const keys = roster.map(g => g.key)

  // G23 first, on the case as dealt: Spill the Beans re-rolls the story, and the new one passes again
  if (reroll) add('G23', spillChecks(c, { roster, packing, rng }))

  // G01, G03, G04: the roles, the cast, the motive
  add('G01', rolesOk(c, keys))
  add('G03', castOk(c, roster, rng))
  add('G04', Number.isInteger(Number(c.motive)) && ALL_MOTIVES.includes(Number(c.motive)) && MOTIVES.some(m => m.n === Number(c.motive)))
  // G53: bulletin 2 at every level is the real family's own line
  add('G53', bulletin2Ok(c))
  // G17: Salem's ladder, and everything Salem tells the whole room still leaves two motives standing
  add('G17', salemAloneOk(c, keys))

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
  // G20 and G21: everyone in exactly one pair or trio; the hidden roles apart whenever there are two groups
  const placed = groups.flat()
  add('G20', groups.length >= 1 && groups.length <= 5 && placed.length === keys.length && new Set(placed).size === keys.length && keys.every(k => placed.includes(k)) && groups.every(g => g.length >= 2 && (keys.length > 15 || g.length <= 3)))
  add('G21', groups.length < 2 || !groups.some(g => g.includes(c.murderer) && g.includes(c.ghost)))
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
  // G19: wherever a cat's line and Sir Irwin's cards cannot both be true, Irwin's are
  add('G19', irwinWinsOk(c, keys))
  // G09: before Act 6 nothing points at one person (the study, the bag clues about the Murderer)
  add('G09', murdererHiddenOk(c, roster, packing, rng))

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

// ---------------------------------------------------------------------------
// The pieces of the case checks above. Each returns true or false, never what
// it looked at. The seeds are the dealer's own (deal.js greetGuest), so a
// check sees the lines a guest would be dealt.

const ROLE_NAMES = ['detective', 'murderer', 'ghost']
const DIALS = [-8, -4, 0, 4, 8] // the trace ladder's levels 1 to 5 (traces.traceLevel)
const guestSeed = (c, k) => `${c?.screenSalt ?? ''}\u0000${k}`

// G01: one Murderer, one Ghost, two different guests; everyone else a Detective.
export function rolesOk(c, keys) {
  const roles = c?.roles ?? {}
  const of = keys.map(k => roles[k])
  return keys.length >= 2 && of.every(r => ROLE_NAMES.includes(r))
    && of.filter(r => r === 'murderer').length === 1 && of.filter(r => r === 'ghost').length === 1
    && !!c.murderer && !!c.ghost && c.murderer !== c.ghost
    && roles[c.murderer] === 'murderer' && roles[c.ghost] === 'ghost'
}

// Both trace reveals at every level of the ladder: the study's (Act 4, the
// Ghost's trace, never offering the Murderer's) and the door's (Act 6, the
// Murderer's, never offering the Ghost's). What each would show: the traces only.
function revealsOf(c, roster, rng) {
  const traceAt = k => traceOf(roster.find(g => g.key === k)?.characterId)
  const ghost = traceAt(c?.ghost)
  const murderer = traceAt(c?.murderer)
  const inPlay = roster.map(g => traceOf(g.characterId)?.trace).filter(Boolean)
  const out = []
  for (const dial of DIALS) {
    for (const [where, owner, other] of [['study', ghost, murderer], ['door', murderer, ghost]]) {
      if (!owner) { out.push({ where, traces: null }); continue }
      const { level, partner } = workReveal({ owner, inPlay, exclude: [other?.trace].filter(Boolean), dial, pick: rng })
      const shown = shownReveal({ level, trace: owner.trace, label: owner.traceLabel, partner, pick: rng })
      out.push({ where, level, traces: shown.images ?? [shown.trace] })
    }
  }
  return { out, inPlay, murdererTrace: murderer?.trace ?? null }
}

// G03: nothing in the case belongs to a character who is not at the party:
// every role and every guest's hint is for a guest in play, the victim is the
// Ghost's own character, and both trace reveals show only traces in play.
// (The memory match's fourteen traces are art, not clues: the one exception, G50.)
export function castOk(c, roster, rng) {
  const keys = new Set(roster.map(g => g.key))
  const ghostCharacter = roster.find(g => g.key === c?.ghost)?.characterId ?? null
  if (!Object.keys(c?.roles ?? {}).every(k => keys.has(k))) return false
  if (!Object.keys(c?.solving?.hints ?? {}).every(k => keys.has(k))) return false
  if (!keys.has(c?.murderer) || !keys.has(c?.ghost)) return false
  if (!ghostCharacter || c.victimCharacterId !== ghostCharacter) return false
  const { out, inPlay } = revealsOf(c, roster, rng)
  return out.every(r => Array.isArray(r.traces) && r.traces.length > 0 && r.traces.every(t => inPlay.includes(t)))
}

// G53: bulletin 2 at every level of the dial plays the real family's own line
// for that level (and the family the case calls real is the motive's own).
export function bulletin2Ok(c) {
  const family = c?.solving?.family ?? null
  const own = NEWS.bulletin2.families?.[family]
  if (!family || familyOf(c.motive) !== family || !Array.isArray(own) || own.length !== 5) return false
  const others = Object.entries(NEWS.bulletin2.families).filter(([f]) => f !== family).flatMap(([, lines]) => lines)
  for (let band = 1; band <= 5; band++) {
    const b = bulletin2(c, band)
    const line = own[band - 1]
    if (b.placeholder || b.level !== band || b.lines[1] !== line?.text || b.clips[1] !== line?.clip) return false
    if (others.some(o => o.text === line.text || o.clip === line.clip)) return false
  }
  return true
}

// G17: Salem's ladder for every guest (backwards at 1 to 3, a coin nobody can
// trust at 4, straight at 5), and everything his lines rule out for the whole
// room, read rightly at every rung, still leaves the real motive and at least
// one other standing: Salem alone never solves the case.
export function salemAloneOk(c, keys) {
  const s = c?.solving ?? {}
  const families = new Set()
  const motives = new Set()
  for (const k of keys) {
    const fams = hintsOf(s, k)
    const family = familyForCat(fams, { cat: 'salem', seed: guestSeed(c, k) })
    if (!family) continue
    for (let level = 1; level <= 5; level++) {
      const line = hintLine(c, { cat: 'salem', level, act: 2, family, seed: `${guestSeed(c, k)}\u0000salem`, bonusFamilies: [...fams, ...(s.newsOut ?? [])] })
      if (!line.text) return false
      if (level <= 3 && line.straight !== false) return false
      if (level === 5 && line.straight !== true) return false
      if (level === 4 && (line.families.length || line.motives.length)) return false
      line.families.forEach(f => families.add(f))
      line.motives.forEach(n => motives.add(n))
    }
  }
  const left = remainingMotives({ hintFamilies: [...families], hintMotives: [...motives] })
  return left.length >= 2 && left.includes(Number(c.motive))
}

// G19: Sir Irwin's cards always hold the real motive, at every band; a cat's
// line, taken at its word (Salem's "it was" points AT his family; every other
// line rules something out), only ever says something false when it is
// Salem's; so wherever a cat and Irwin cannot both be right, Irwin is.
export function irwinWinsOk(c, keys, { irwin = band => irwinOptions(c, { band, seed: c.screenSalt }) } = {}) {
  const s = c?.solving ?? {}
  const real = Number(c?.motive)
  const bands = [1, 2, 3, 4, 5].map(irwin)
  if (bands.some(opts => !opts.includes(real))) return false
  for (const k of keys) {
    const fams = hintsOf(s, k)
    for (const cat of HINT_CATS) {
      const family = familyForCat(fams, { cat, seed: guestSeed(c, k) })
      if (!family) continue
      for (let level = 1; level <= 5; level++) {
        const line = hintLine(c, { cat, level, act: 2, family, seed: `${guestSeed(c, k)}\u0000${cat}`, bonusFamilies: [...fams, ...(s.newsOut ?? [])] })
        if (!line.text) continue
        const says = cat === 'salem'
          ? n => (line.straight ? familyOf(n) !== family : familyOf(n) === family)
          : n => !line.families.includes(familyOf(n)) && !line.motives.includes(n)
        if (cat !== 'salem' && !says(real)) return false
        for (const opts of bands) if (!opts.some(says) && says(real)) return false
      }
    }
  }
  return true
}

// G09: before Act 6 no single clue points at the Murderer. The study's trace
// (Act 4) is the Ghost's and never offers the Murderer's at any level; Sir
// Irwin's cards are motives only; and every Act 2 bag clue about the
// Murderer's bag that names a word names one two or more bags in play share.
// Not checked here (a test.todo, docs/test-plan.md): a clue that names only a
// sense, in a party of four to six, can name a sense the Murderer's bag alone
// holds among the bags in play.
export function murdererHiddenOk(c, roster, packing, rng, { plan: planOf = opts => bagPlan(packing, opts) } = {}) {
  const { out, murdererTrace } = revealsOf(c, roster, rng)
  if (!murdererTrace) return false
  if (out.filter(r => r.where === 'study').some(r => !r.traces || r.traces.includes(murdererTrace))) return false
  for (const band of [1, 2, 3, 4, 5]) if (!irwinOptions(c, { band, seed: c.screenSalt }).every(n => ALL_MOTIVES.includes(n))) return false
  if (!packing) return true
  const inPlay = [...new Set(roster.map(g => Number(g.bag)).filter(Number.isFinite))]
  const at = wordBags(packing, inPlay)
  const bag = roster.find(g => g.key === c.murderer)?.bag
  for (const g of roster) {
    const plan = planOf({ bag, inPlay, seed: `${c.screenSalt}\u0000bag\u0000${g.key}` })
    if (!plan) continue
    for (const cat of BAG_CATS) for (let rung = 1; rung <= 5; rung++) {
      const line = bagLine(plan, { cat, act: 2, rung, seed: `${c.screenSalt}\u0000bag\u0000${g.key}\u0000${cat}` })
      if (line.word && (at[line.word]?.length ?? 0) < 2) return false
    }
  }
  return true
}

// G23: Spill the Beans on this case (case.js rerollCase, with a fresh deal the
// same way): the Murderer stays, the motive changes, the Ghost changes when a
// third guest exists, and the new story passes G01 to G21 again.
export const SPILL_IDS = ['G01', 'G03', 'G04', 'G09', 'G17', 'G19', 'G20', 'G21']
export function spillChecks(c, { roster, packing = null, rng }) {
  const fresh = rehearsalCase({ roster, rng })
  const again = rerollCase({ prev: c, fresh, roster, rng })
  if (again.murderer !== c.murderer || Number(again.motive) === Number(c.motive)) return false
  if (roster.length >= 3 && again.ghost === c.ghost) return false
  const results = caseChecks(again, { roster, packing, rng, reroll: false }).filter(r => SPILL_IDS.includes(r.id))
  return results.length === SPILL_IDS.length && results.every(r => r.pass)
}

// ---------------------------------------------------------------------------
// G05 and G06 across many deals (scripts/checks.mjs, scripts/fake-players.mjs).
// Each deal is a stand-in roster of 4 to 12 guests, the two host seats (Jon and
// Susan, the Professors) among them at a random place, dealt by the case deal
// itself (case.js). Every seat should land the Murderer and the Ghost about
// as often as a fair draw would, and every motive turn up about as often as
// any other: within four standard deviations of a fair share. Counts only.

export const HOST_SEATS = ['jon', 'susan']
export const FAIR_WITHIN = 4 // standard deviations

function shuffledWith(list, rng) {
  const a = [...list]
  for (let i = a.length - 1; i > 0; i--) { const j = rng(i + 1); [a[i], a[j]] = [a[j], a[i]] }
  return a
}

// A stand-in roster of n guests: the two host seats on the Professors, the
// rest on characters at random, in a random order, bags 1 to 10 at random.
export function standInRoster(n, rng) {
  const profs = CHARACTERS.filter(ch => ch.host)
  const rest = shuffledWith(CHARACTERS.filter(ch => !ch.host), rng)
  const bags = shuffledWith(Array.from({ length: 10 }, (_, i) => i + 1), rng)
  const seats = [
    ...HOST_SEATS.map((key, i) => ({ key, name: key, characterId: profs[i].id, host: true })),
    ...rest.slice(0, Math.max(0, n - HOST_SEATS.length)).map((ch, i) => ({ key: `seat${i + 3}`, name: `Seat ${i + 3}`, characterId: ch.id })),
  ]
  return shuffledWith(seats, rng).map((g, i) => ({ ...g, bag: bags[i % bags.length] }))
}

export function fairnessChecks({ count = 1000, rng, sizes = [4, 5, 6, 7, 8, 9, 10, 11, 12], deal = rehearsalCase } = {}) {
  const seats = {}
  const motives = Object.fromEntries(MOTIVES.map(m => [m.n, 0]))
  for (let i = 0; i < count; i++) {
    const n = sizes[i % sizes.length]
    const roster = standInRoster(n, rng)
    const c = deal({ roster, rng })
    const p = 1 / roster.length
    for (const g of roster) {
      const t = (seats[g.key] ??= { murderer: 0, ghost: 0, expected: 0, variance: 0 })
      t.expected += p
      t.variance += p * (1 - p)
      if (c.murderer === g.key) t.murderer++
      if (c.ghost === g.key) t.ghost++
    }
    motives[c.motive] = (motives[c.motive] ?? 0) + 1
  }
  const fair = t => ['murderer', 'ghost'].every(role => Math.abs(t[role] - t.expected) <= FAIR_WITHIN * Math.sqrt(t.variance))
  const all = Object.values(seats)
  const fairSeats = all.filter(fair).length
  const hostsFair = HOST_SEATS.every(k => seats[k] && fair(seats[k]))
  const share = count / MOTIVES.length
  const spread = FAIR_WITHIN * Math.sqrt(count * (1 / MOTIVES.length) * (1 - 1 / MOTIVES.length))
  const fairMotives = Object.values(motives).filter(v => Math.abs(v - share) <= spread).length
  return [
    { id: 'G05', pass: count > 0 && hostsFair && fairSeats === all.length, count: fairSeats, of: all.length },
    { id: 'G06', pass: count > 0 && Object.keys(motives).length === MOTIVES.length && fairMotives === MOTIVES.length, count: fairMotives, of: MOTIVES.length },
  ]
}

// ---------------------------------------------------------------------------
// L01 on a JSON document (scripts/checks.mjs reads every tracked .json): does
// it look like sealed content? A dealt case (roles with a Murderer), a
// kernels key holding text, a code-to-motive map (five or more keys that are
// not motive numbers, every value a motive number), or a lean table (a
// question giving three or more of the listening cats an answer, a or b).
// True or false only: never which file, never what matched.

const LEAN_CATS = ['granolia', 'boo', 'zimothy', 'salem']
const hasText = v => (typeof v === 'string' ? v.trim().length > 0 : Array.isArray(v) ? v.some(hasText) : v && typeof v === 'object' ? Object.values(v).some(hasText) : false)
const motiveRef = x => {
  const n = typeof x === 'number' ? x : x && typeof x === 'object' && !Array.isArray(x) && 'motive' in x ? Number(x.motive) : NaN
  return Number.isInteger(n) && n >= 1 && n <= MOTIVES.length
}
export function sealedShape(doc) {
  let found = false
  const walk = (v, depth) => {
    if (found || depth > 20 || !v || typeof v !== 'object') return
    if (!Array.isArray(v)) {
      const entries = Object.entries(v)
      if (v.roles && typeof v.roles === 'object' && Object.values(v.roles).includes('murderer')) found = true
      else if ('kernels' in v && hasText(v.kernels)) found = true
      else if (entries.length >= 5 && entries.every(([k, x]) => !/^\d+$/.test(k) && motiveRef(x))) found = true
      else if (LEAN_CATS.filter(cat => v[cat] === 'a' || v[cat] === 'b').length >= 3) found = true
      if (found) return
    }
    for (const x of Array.isArray(v) ? v : Object.values(v)) walk(x, depth + 1)
  }
  walk(doc, 0)
  return found
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
