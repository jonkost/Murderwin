import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { spokenParts } from '../src/lib/spoken.js'

// BK-8: stage directions in the open line banks are kept between stars;
// the phone and the room screens show them in italics, without the stars.

const catLines = JSON.parse(readFileSync(new URL('../../seed/cat-lines.json', import.meta.url), 'utf8'))

test('a stage direction between stars is set apart, without its stars', () => {
  assert.deepEqual(spokenParts('Hi! *heavy breathing* Okay.'), [
    { text: 'Hi! ', stage: false }, { text: 'heavy breathing', stage: true }, { text: ' Okay.', stage: false },
  ])
  assert.deepEqual(spokenParts('*snrk.*'), [{ text: 'snrk.', stage: true }], "Granolia's snort keeps its full stop")
  assert.deepEqual(spokenParts('*snort* and *snort*').filter(p => p.stage).map(p => p.text), ['snort', 'snort'])
  assert.deepEqual(spokenParts('Plain words.'), [{ text: 'Plain words.', stage: false }])
  assert.deepEqual(spokenParts('5 * 3 is a sum'), [{ text: '5 * 3 is a sum', stage: false }], 'a lone star stays')
  assert.deepEqual(spokenParts('** nothing'), [{ text: '** nothing', stage: false }])
  assert.deepEqual(spokenParts(''), [])
  assert.deepEqual(spokenParts(null), [])
})

test('no cat line in the open bank shows a star once it is on screen', () => {
  const lines = []
  const walk = (o) => {
    if (typeof o === 'string') lines.push(o)
    else if (o && typeof o === 'object') for (const v of Object.values(o)) walk(v)
  }
  for (const cat of ['salem', 'zimothy', 'boo', 'granolia']) walk(catLines[cat])
  let directions = 0
  for (const line of lines) {
    for (const p of spokenParts(line)) {
      if (p.stage) directions++
      else assert.ok(!p.text.includes('*'), 'a star left in the words')
    }
  }
  assert.ok(directions >= 7, 'the bank has its heavy breathing and snorts')
})

test('every place a cat line or hint is shown renders it through Spoken', () => {
  const src = (f) => readFileSync(new URL(`../src/screens/${f}`, import.meta.url), 'utf8')
  const cards = src('Cards.jsx')
  assert.ok(cards.includes('<p key={i}><Spoken text={l} /></p>'), 'a greeting line')
  assert.ok(cards.includes('<Spoken text={card.hint.text} />'), 'a hint')
  assert.ok(cards.includes('<Spoken text={host.line} />'), 'a host line')
  assert.ok(cards.includes('<Spoken text={card.text} />'), 'a notice (Salem\'s honour arrives as one)')
  assert.ok(src('Rest.jsx').includes('<Spoken text={idle.text} />'), 'a cat passing by')
  assert.ok(src('Clues.jsx').includes('<Spoken text={card.text} />'), 'a cat\'s kept clue')
  const kiosk = src('Kiosk.jsx')
  assert.ok(kiosk.includes('<Spoken text={line} />'), 'Granolia on the study screen')
  assert.ok(kiosk.includes('<Spoken text={trace.irwinLine} />'), 'Sir Irwin over the trace')
  assert.ok(kiosk.includes('<Spoken text={slide.text} />'), 'the door slide')
  const spoken = src('Spoken.jsx')
  assert.ok(spoken.includes('<em key={i} className="stage">'), 'stage directions in italics')
})
