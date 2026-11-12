import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { DEFAULT_UI, CATS, DEFAULT_STATUS, STOP_MEANINGS, DEFAULT_STUDY_LINES } from '../src/lib/content.js'
import { THANKS } from '../src/lib/windows.js'
import { SALEM_FRIEND } from '../src/lib/night.js'
import { ZIMOTHY_LINES, SALEM_SCREEN_LINES, RULES_LINES, UNHEARD_LINE } from '../src/lib/rooms.js'
import { problems } from '../../functions/test/words-rule.mjs'

// B3 (handoff 11 Nov 2026) and Job 3 (handoff 12 Nov 2026): the words a guest
// reads on a phone or a room screen, as the phone's own code has them (the
// server's lines and the seeds are checked in functions/test/b3-words.test.mjs,
// whose rule this file shares: no sentence over 25 words, two sentences at
// most on a card, no act's name, American spelling, no long dash).
//
// Exceptions, kept short and explicit: the Rules tab's cards (content.js
// DEFAULT_RULES), the role card shown to a late arrival (DEFAULT_UI ORIENT,
// a role's rules), and the Host tab's words (DEFAULT_UI HOST, START NIGHT and
// NOT FOR YOU; Host.jsx is never read here). Granolia's SLOW line keeps her
// four short sentences: a test pins its fifteen minutes (gametest.test.mjs).

const EXEMPT_UI = new Set(['ORIENT', 'HOST', 'START NIGHT', 'NOT FOR YOU', 'STOPS'])
const EXEMPT_CARD = new Set(['DEFAULT_STUDY_LINES.SLOW'])

function collect() {
  const lines = []
  const add = (where, text, card = true) => { if (typeof text === 'string' && text) lines.push({ where, text, card: card && !EXEMPT_CARD.has(where) }) }
  for (const [k, t] of Object.entries(DEFAULT_UI)) if (!EXEMPT_UI.has(k)) add(`DEFAULT_UI.${k}`, t)
  for (const c of CATS) { add(`CATS.${c.key}.tag`, c.tag); add(`CATS.${c.key}.blurb`, c.blurb) }
  for (const [band, by] of Object.entries(DEFAULT_STATUS)) for (const [cat, t] of Object.entries(by)) add(`DEFAULT_STATUS.${band}.${cat}`, t)
  STOP_MEANINGS.forEach((t, i) => add(`STOP_MEANINGS.${i}`, t))
  for (const [k, t] of Object.entries(DEFAULT_STUDY_LINES)) add(`DEFAULT_STUDY_LINES.${k}`, t)
  add('THANKS.title', THANKS.title); add('THANKS.text', THANKS.text); add('THANKS.button', THANKS.button)
  add('SALEM_FRIEND.text', SALEM_FRIEND.text)
  ZIMOTHY_LINES.rounds.forEach((t, i) => add(`ZIMOTHY_LINES.rounds.${i}`, t))
  for (const k of ['cleared', 'standalone', 'winner', 'tie']) add(`ZIMOTHY_LINES.${k}`, ZIMOTHY_LINES[k])
  for (const [k, t] of Object.entries(SALEM_SCREEN_LINES)) add(`SALEM_SCREEN_LINES.${k}`, t)
  for (const [k, t] of Object.entries(RULES_LINES)) add(`RULES_LINES.${k}`, t, false) // the rules cards' intros (not shown on the look's cards): length only
  add('UNHEARD_LINE', UNHEARD_LINE)
  return lines
}

// The words written straight into the guest screens' markup: every JSX text
// node with a letter in it and no code around it.
const SCREENS = ['Join', 'Allow', 'Welcome', 'Moments', 'Cards', 'Clues', 'Windows', 'Relay', 'Act4', 'Rest', 'Kiosk', 'Rooms']
export function markupLines(src) {
  const out = []
  for (const m of src.matchAll(/>([^<>{}]*[A-Za-z][^<>{}]*)</g)) {
    const t = m[1].replace(/\s+/g, ' ').trim()
    if (!t || /[=;()]|&&|\|\||=>/.test(t)) continue
    out.push(t)
  }
  return out
}

test('B3 the phone\'s and the room screens\' own words: short sentences, two at most, no act names, American spelling, no long dash', () => {
  const lines = collect()
  for (const name of SCREENS) {
    const src = readFileSync(new URL(`../src/screens/${name}.jsx`, import.meta.url), 'utf8')
    for (const t of markupLines(src)) lines.push({ where: `${name}.jsx "${t.slice(0, 40)}"`, text: t, card: true })
  }
  assert.ok(lines.length > 120, `collected ${lines.length} lines`)
  const bad = lines.map(l => ({ ...l, why: problems(l.text, l) })).filter(l => l.why.length)
  assert.deepEqual(bad.map(l => `${l.where}: ${l.why.join(', ')}`), [])
})

test('B3 no act\'s name on a guest card: the Clues tab heads each act by its plain name, and Act 4\'s card has no "Round 2 of 5" or act label', () => {
  const clues = readFileSync(new URL('../src/screens/Clues.jsx', import.meta.url), 'utf8')
  assert.ok(!/Act \{act\} ·/.test(clues), 'the Clues tab has no "Act 2 ·" heading')
  const act4 = readFileSync(new URL('../src/screens/Act4.jsx', import.meta.url), 'utf8')
  assert.ok(!act4.includes('`Round ${step.round} of ${step.rounds}`') && !act4.includes("'Behind Closed Doors'"), 'no eyebrow on the Act 4 card')
  const cards = readFileSync(new URL('../src/screens/Cards.jsx', import.meta.url), 'utf8')
  assert.ok(!cards.includes('>Your next step<') && !cards.includes('>Achievement<'), 'no label that only names the card')
})

test('B3 the markup check is real: a long paragraph in a screen fails it', () => {
  const long = Array.from({ length: 30 }, (_, i) => `word${i}`).join(' ')
  const found = markupLines(`<p className="gloss">${long}.</p><p>{ui.X}</p>`)
  assert.deepEqual(found, [`${long}.`])
  assert.deepEqual(problems(found[0], { card: true }), ['a sentence of 30 words'])
  assert.deepEqual(problems('Pick your favourite.', { card: true }), ['British spelling: favourite'])
})
