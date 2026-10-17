// The bags station's clue: "Something minty is in two of the bags." True on
// the night because it is read from the packing the blind packer wrote
// (scripts/pack-bags.mjs, sealed/bags), and pointed: the property chosen is
// one that sits in the murderer's or the victim's bag when either is at the
// party. The card never carries a bag number.
//
// SEAL RULE: sealed/bags is read here with the Admin SDK and nothing from
// it leaves except one property word and a count of two or three, on the
// card of the group that earned it. Never logged.

import { randomInt } from 'node:crypto'
import { readArea } from './night.js'

const pickInt = n => randomInt(n)

// The first property of a bag line: "Item — smell: minty; sound: rattles"
// gives "minty". One property per card.
export function firstProperty(text) {
  const t = String(text ?? '')
  const dash = t.indexOf('—')
  if (dash < 0) return ''
  const rest = t.slice(dash + 1).split(';')[0]
  const colon = rest.indexOf(':')
  return colon >= 0 ? rest.slice(colon + 1).trim().toLowerCase().replace(/\s+/g, ' ') : ''
}

export async function readPacking(db) {
  const snap = await db.doc('sealed/bags').get()
  const d = snap.exists ? snap.data() : null
  return d && d.properties && typeof d.properties === 'object' ? d : null
}

// A property in two or three bags, preferring one whose bags include one
// of `prefer` (the murderer's and the victim's bag numbers). Null when the
// packing has nothing usable.
export function propertyForClue(packing, { prefer = [], pick = pickInt } = {}) {
  const all = Object.entries(packing?.properties ?? {})
    .map(([property, bags]) => ({ property, bags: (Array.isArray(bags) ? bags : []).map(Number).filter(Number.isFinite) }))
    .filter(x => x.property && (x.bags.length === 2 || x.bags.length === 3))
  if (!all.length) return null
  const wanted = prefer.map(Number).filter(Number.isFinite)
  const pointed = all.filter(x => x.bags.some(n => wanted.includes(n)))
  const from = pointed.length ? pointed : all
  const x = from[pick(from.length)]
  return { property: x.property, count: x.bags.length, pointed: pointed.length > 0 }
}

export const COUNT_WORDS = { 2: 'two', 3: 'three' }

// The sentence on the card. A workshop line (station_text, "BAGS: ...") may
// carry [PROPERTY] and [COUNT]; the default reads "two or three" when the
// count is not known (a rehearsal).
export const DEFAULT_BAGS_TEXT = 'Something [PROPERTY] is in [COUNT] of the bags in this house. Ask people to open theirs. Narrow it down; nobody is accused here.'
export function bagsText(property, count, template = DEFAULT_BAGS_TEXT) {
  const base = template && template.includes('[PROPERTY]') ? template : DEFAULT_BAGS_TEXT
  return base.replace(/\[PROPERTY\]/g, property).replace(/\[COUNT\]/g, COUNT_WORDS[count] ?? 'two or three')
}

// What the bags station deals one group: the property, how many bags, and
// whether it is a rehearsal stand-in. A rehearsal case, or a night with no
// packing yet, draws a property from the workshop's bag items at random and
// marks the card placeholder, exactly as before the packer existed.
export async function bagsClue(db, { c, roster = {}, pick = pickInt } = {}) {
  const packing = c && !c.rehearsal ? await readPacking(db) : null
  if (packing) {
    const prefer = [roster[c.murderer]?.bag, roster[c.ghost]?.bag].filter(n => Number.isFinite(Number(n)))
    const got = propertyForClue(packing, { prefer, pick })
    if (got) return { property: got.property, count: got.count, placeholder: false }
  }
  const items = await readArea(db, 'bag_items')
  const props = items.map(i => firstProperty(i.text)).filter(Boolean)
  const property = props.length ? props[pick(props.length)] : '(rehearsal: a property, like minty or rough)'
  return { property, count: null, placeholder: true }
}
