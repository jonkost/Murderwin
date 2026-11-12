import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { NOTICES, LIGHTS_TEXT, ARRIVE_TEXT, SAVED_TEXT, SUPPER_NOTE, SALEM_FRIEND, NIGHT } from '../lib/deal.js'
import { DIRECTIONS, ACT4_TEXT, REWARD_LINES, ARCADE_THIRD_LINE } from '../lib/act4.js'
import { HOST_LINES } from '../lib/hosts.js'
import { THREE_QUESTIONS, TALK_CARD, VOTE_CARD, JOIN_CARDS, ACT4_TITLE, BIRTHDAY_CARD, NEWS_QUIET } from '../lib/screen.js'
import { DEFAULT_FILLER } from '../lib/windows.js'
import { STUDY_QUIET } from '../lib/station.js'
import { HUSH_LINE, AWARD_TEXT, LAST_CARD } from '../lib/finale.js'

// B3 (handoff 11 Nov 2026) and Job 3 (handoff 12 Nov 2026): the words a guest
// reads on a phone, a room screen or the Parlour TV, as the server and the
// seeds have them. Jon, 12 Nov: "Anywhere there is random text that is not
// mission critical lose it." A notice is a title, one short line, one button.
//
// The rule, for every line collected here:
//   - no sentence over 25 words;
//   - a notice's or a card's text at most two sentences;
//   - no act's name on a card ("Act 4 · Behind Closed Doors");
//   - plain American spelling, and no long dash.
//
// Exceptions, kept short and explicit: these are never collected, because
// they are clues, the news, a role's rules or Sir Irwin's own lines.
//   seed/cat-lines.json (the cats' hint lines), seed/woof-news.json (the news),
//   the Rules tab's cards, the role cards (deal.js ROLE_CARDS),
//   seed/irwin-lines.json and Sir Irwin's countdown and trace lines
//   (screen.js IRWIN_OPTION_LINES, hosts.js HOST_LINES.irwinTrace).
// The Host tab's words (seed/night.json `what`, act4.rooms) are Jon's, not a guest's.

import { problems } from './words-rule.mjs'

const seed = name => JSON.parse(readFileSync(new URL(`../../seed/${name}`, import.meta.url), 'utf8'))

// Every string leaf of seed/night.json a guest can read: everything but the
// Host tab's words and the machine's keys.
const NIGHT_SKIP = new Set(['what', 'key', 'action', 'screen', 'sound', 'scene', 'cue', 'id', 'kind', 'room', 'plain'])
export function nightLines(night) {
  const out = []
  const walk = (o, path, field) => {
    if (typeof o === 'string') { out.push({ where: `seed/night.json ${path}`, text: o, card: ['text', 'line', 'lines'].includes(field) }); return }
    if (!o || typeof o !== 'object') return
    for (const [k, v] of Object.entries(o)) {
      if (k.startsWith('_') || NIGHT_SKIP.has(k)) continue
      if (path === '.act4' && k === 'rooms') continue // the Host tab's room lines
      if (path === '.parlour' || path === '.solving') continue // config and room names
      walk(v, `${path}.${k}`, Array.isArray(o) ? field : k)
    }
  }
  walk(night, '', null)
  return out
}

function collect() {
  const lines = []
  const add = (where, text, card = false) => { if (typeof text === 'string' && text) lines.push({ where, text, card }) }
  const cardOf = (where, c) => { add(`${where}.title`, c.title); add(`${where}.text`, c.text, true); add(`${where}.line`, c.line, true); add(`${where}.button`, c.button); for (const l of c.lines ?? []) add(`${where}.lines`, l, true) }
  for (const [k, c] of Object.entries(NOTICES)) cardOf(`NOTICES.${k}`, c)
  for (const [k, c] of Object.entries(LIGHTS_TEXT)) cardOf(`LIGHTS_TEXT.${k}`, c)
  add('ARRIVE_TEXT', ARRIVE_TEXT, true); add('SAVED_TEXT', SAVED_TEXT, true)
  cardOf('SUPPER_NOTE', SUPPER_NOTE); cardOf('SALEM_FRIEND', SALEM_FRIEND)
  for (const [k, t] of Object.entries(DIRECTIONS)) add(`DIRECTIONS.${k}`, t, true)
  for (const [k, v] of Object.entries(ACT4_TEXT)) typeof v === 'string' ? add(`ACT4_TEXT.${k}`, v, true) : cardOf(`ACT4_TEXT.${k}`, v)
  for (const [room, r] of Object.entries(REWARD_LINES)) for (const [k, t] of Object.entries(r)) add(`REWARD_LINES.${room}.${k}`, t, true)
  add('ARCADE_THIRD_LINE', ARCADE_THIRD_LINE) // Jon's own words for Boo (28 Oct 2026): checked for length, not cut to two sentences
  for (const k of ['granolia', 'zimothy', 'salem']) add(`HOST_LINES.${k}`, HOST_LINES[k], true)
  HOST_LINES.boo.forEach((t, i) => add(`HOST_LINES.boo.${i}`, t, true))
  for (const q of THREE_QUESTIONS) add('THREE_QUESTIONS', q, true)
  cardOf('TALK_CARD', TALK_CARD); cardOf('VOTE_CARD', VOTE_CARD); cardOf('ACT4_TITLE', ACT4_TITLE); cardOf('BIRTHDAY_CARD', BIRTHDAY_CARD)
  for (const [k, c] of Object.entries(JOIN_CARDS)) cardOf(`JOIN_CARDS.${k}`, c)
  add('NEWS_QUIET', NEWS_QUIET, true); add('DEFAULT_FILLER', DEFAULT_FILLER, true); add('STUDY_QUIET', STUDY_QUIET, true)
  add('HUSH_LINE', HUSH_LINE, true); add('LAST_CARD', LAST_CARD.line, true)
  for (const [k, a] of Object.entries(AWARD_TEXT)) { add(`AWARD_TEXT.${k}.title`, a.title); add(`AWARD_TEXT.${k}.line`, a.line, true) }
  lines.push(...nightLines(NIGHT))
  for (const [k, t] of Object.entries(seed('beat-lines.json').lines)) add(`seed/beat-lines.json ${k}`, t, true)
  for (const g of seed('game-names.json').games) { add(`game ${g.id} name`, g.name); add(`game ${g.id} hook`, g.hook) }
  const credits = seed('credits.json')
  for (const t of credits.specialThanks ?? []) add('credits specialThanks', t, true)
  add('credits dedication', credits.dedication?.line, true)
  return lines
}

test('B3 the words a guest reads, from the server and the seeds: short sentences, two at most on a card, no act names, American spelling, no long dash', () => {
  const lines = collect()
  assert.ok(lines.length > 100, `collected ${lines.length} lines`)
  const bad = lines.map(l => ({ ...l, why: problems(l.text, l) })).filter(l => l.why.length)
  assert.deepEqual(bad.map(l => `${l.where}: ${l.why.join(', ')}`), [])
})

test('B3 the word test is real: a 30-word notice in seed/night.json, a third sentence, an act name, colour and a long dash all fail', () => {
  const long = Array.from({ length: 30 }, (_, i) => `word${i}`).join(' ') + '.'
  const night = structuredClone(NIGHT)
  night.acts['2'].beats[0].notice = { title: 'Where things are', text: long, button: 'Got it' }
  const found = nightLines(night).find(l => l.text === long)
  assert.ok(found && found.card, 'a notice added to the seed is collected as a card')
  assert.deepEqual(problems(found.text, found), ['a sentence of 30 words'])
  assert.deepEqual(problems('One. Two. Three.', { card: true }), ['3 sentences'])
  assert.deepEqual(problems('One. Two. Three.'), [], 'a title or a game hook may have three short ones')
  assert.deepEqual(problems('Act 4 · Behind Closed Doors'), ['an act name'])
  assert.deepEqual(problems('Pick a colour.'), ['British spelling: colour'])
  assert.deepEqual(problems('Wait — then go.'), ['a long dash'])
  assert.deepEqual(problems('[CAT] is waiting in [ROOM]. Go alone.', { card: true }), [], 'a blank counts as one word')
})

test('B3 the exceptions stay out of the collection: no role card, no news line, no cat hint line', () => {
  const texts = new Set(collect().map(l => l.text))
  const news = JSON.stringify(seed('woof-news.json'))
  const cats = JSON.stringify(seed('cat-lines.json'))
  for (const t of texts) {
    assert.ok(!/^The Manor has lost/.test(t), 'no role card')
    if (t.length > 30) assert.ok(!news.includes(JSON.stringify(t)) && !cats.includes(JSON.stringify(t)), `not a news or hint line: ${t.slice(0, 30)}`)
  }
})
