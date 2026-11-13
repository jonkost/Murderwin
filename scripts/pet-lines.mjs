// Every line a pet can say that a voice is made for (12 Nov 2026, Jon: "Can
// we get voices reading for the pets"). Pure: it reads the open banks through
// the game's own code and lists every way a line can be filled, so a file
// can be made ahead for each (scripts/pet-voices.mjs). Nothing sealed is
// read: which of these lines a night deals is the night's secret, and this
// lists them all.
//
//   the four cats at a visit (Act 2): the motive hint, at every rung, about
//       every family and every motive it could name (functions/lib/cats.js)
//   the four cats on a bag (Acts 2 and 4): the bag line, at every rung, with
//       every clue word and every sense (functions/lib/bagclues.js)
//   Sir Irwin at dessert (Act 5): his opener, the line that says how sure he
//       is, each of the nineteen motive rhymes, his closer
//       (functions/lib/screen.js)
//
// A test samples the dealer thousands of times and checks every line it
// deals is in this list (scripts/test/pet-voices.test.mjs).
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { CAT_LINES, motiveName, listOf, fillSlot } from '../functions/lib/cats.js'
import { FAMILIES, ALL_MOTIVES, motivesOf, familyOf } from '../functions/lib/families.js'
import { BAG_LINES, BAG_CATS, SENSES, templateOf, fillLine, unfilled } from '../functions/lib/bagclues.js'
import { IRWIN_OPTION_LINES, DEFAULT_IRWIN, dogFilter, castNames } from '../functions/lib/screen.js'
import { tidyWords } from '../play/src/lib/petvoice.js'

const here = dirname(fileURLToPath(import.meta.url))
const seed = name => JSON.parse(readFileSync(join(here, '..', 'seed', name), 'utf8'))

const cap = t => (t ? t[0].toUpperCase() + t.slice(1) : t)
const FAMILY_KEYS = FAMILIES.map(f => f.key)
const outside = family => ALL_MOTIVES.filter(n => familyOf(n) !== family)
// every ordered pair of two different motives of one family
const pairsIn = family => motivesOf(family).flatMap(a => motivesOf(family).filter(b => b !== a).map(b => [a, b]))

// The clue words a bag line can name (the open list in seed/bag-items.json).
export function clueWords(file = seed('bag-items.json')) {
  return (file.words ?? []).map(w => w.word).filter(Boolean)
}

// A cat's motive hint, every way it can be filled (Act 2).
export function catHintLines() {
  const out = []
  const add = (who, text) => { if (text) out.push({ who, text }) }
  const name = motiveName
  // Salem: a family, backwards or straight
  for (const f of FAMILY_KEYS) { const pair = CAT_LINES.salem.act2[f]; add('salem', pair?.was); add('salem', pair?.wasnt) }
  // Zimothy: one motive (1, 2), two (3), a whole family (4), a family and a bonus (5)
  const z = CAT_LINES.zimothy.levels
  for (const l of ['1', '2']) for (const n of ALL_MOTIVES) add('zimothy', z[l].replace('[MOTIVE]', z[l].startsWith('[MOTIVE]') ? cap(name(n)) : name(n)))
  for (const f of FAMILY_KEYS) {
    const whole = listOf(motivesOf(f).map(name))
    for (const [a, b] of pairsIn(f)) add('zimothy', z['3'].replace('[MOTIVES]', listOf([name(a), name(b)])))
    for (const a of motivesOf(f)) add('zimothy', z['3'].replace('[MOTIVES]', listOf([name(a)])))
    add('zimothy', z['4'].replace('[MOTIVES]', whole))
    add('zimothy', z['5'].replace('[MOTIVES]', whole).replace('[BONUS]', ''))
    for (const b of outside(f)) add('zimothy', z['5'].replace('[MOTIVES]', whole).replace('[BONUS]', name(b)))
  }
  // Boo: a look (1), a brush-off (2), one motive (3), a family (4), a family and a bonus (5)
  const boo = CAT_LINES.boo
  add('boo', boo.levels['1']); add('boo', boo.levels['2'])
  for (const n of ALL_MOTIVES) add('boo', boo.levels['3'].replace('[MOTIVE]', cap(name(n))))
  for (const f of FAMILY_KEYS) {
    add('boo', boo.family4[f])
    for (const b of outside(f)) add('boo', boo.family5[f].replace('[BONUS]', name(b)))
  }
  // Granolia: a ramble (1), half a name (2), one motive (3), two (4), a whole family (5)
  const g = CAT_LINES.granolia
  add('granolia', g.levels['1'])
  for (const n of ALL_MOTIVES) {
    add('granolia', fillSlot(g.levels['2'], '[HALF]', g.half[String(n)] ?? name(n)))
    add('granolia', g.levels['3'].replace('[MOTIVE]', name(n)))
    add('granolia', g.levels['4'].replace('[MOTIVE]', name(n)).replace('[MOTIVE2]', name(n)))
  }
  for (const f of FAMILY_KEYS) {
    for (const [a, b] of pairsIn(f)) add('granolia', g.levels['4'].replace('[MOTIVE]', name(a)).replace('[MOTIVE2]', name(b)))
    add('granolia', g.levels['5'].replace('[MOTIVES]', listOf(motivesOf(f).map(name))))
  }
  return out
}

// A cat's bag line, every way it can be filled (Act 2 about the Murderer's
// bag, Act 4 about the Ghost's).
export function catBagLines(words = clueWords()) {
  const out = []
  for (const cat of BAG_CATS) {
    for (const act of [2, 4]) {
      const lead = act === 4 ? BAG_LINES.act4.leadIn?.[cat] ?? null : null
      const add = text => { if (text) out.push({ who: cat, text: lead ? `${lead} ${text}` : text }) }
      for (let rung = 1; rung <= 5; rung++) {
        const tpl = templateOf(cat, act, rung)
        if (!tpl) continue
        if (/___/.test(tpl)) for (const word of words) add(fillLine(tpl, { word }))
        else if (/\[sense(:verb|:organ)?\]/.test(tpl)) for (const sense of SENSES) add(fillLine(tpl, { sense }))
        else add(tpl)
      }
      add(unfilled(templateOf(cat, act, 1)))
    }
  }
  return out
}

// Sir Irwin at dessert. `workshop` holds the words the workshop has in place
// of the game's own, when it has any: { opener, closer, ui: { 'IRWIN FIVE': … } }.
// The game's own words are always made too, so a night that falls back to
// them still has a voice.
const IRWIN_LABEL = { 5: 'IRWIN FIVE', 4: 'IRWIN FOUR', 3: 'IRWIN THREE', 2: 'IRWIN TWO', 1: 'IRWIN ONE' }
export function irwinLines({ workshop = {}, motives = seed('motives.json').motives } = {}) {
  const out = []
  const add = text => { if (tidyWords(text)) out.push({ who: 'irwin', text }) }
  // The TV shows his opener and closer through the server's dog filter (screen.js irwinLines): twelve words
  // at most, and any name in the cast replaced. So the voice is made for the words as the filter leaves
  // them. (A guest's own name in a line would change it again on the night: that line is then not said.)
  const cast = castNames({})
  const short = text => (text ? dogFilter(text, cast) : null)
  const whole = text => (text ? dogFilter(text, cast, { maxWords: Infinity }) : null)
  add(short(DEFAULT_IRWIN.opener)); add(short(DEFAULT_IRWIN.closer))
  add(short(workshop.opener)); add(short(workshop.closer))
  for (const n of [5, 4, 3, 2, 1]) { add(whole(IRWIN_OPTION_LINES[n])); add(whole(workshop.ui?.[IRWIN_LABEL[n]])) }
  for (const m of motives) add(m.rhyme)
  return out
}

// All of them, each once.
export function allPetLines(opts = {}) {
  const seen = new Set()
  const out = []
  for (const line of [...catHintLines(), ...catBagLines(opts.words), ...irwinLines(opts)]) {
    const text = tidyWords(line.text)
    const key = `${line.who}|${text}`
    if (!text || seen.has(key)) continue
    seen.add(key)
    out.push({ who: line.who, text })
  }
  return out
}
