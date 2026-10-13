import { test } from 'node:test'
import assert from 'node:assert/strict'
import { labelCodec, dashCodec, bagCodec, npcCodec, echoCodec, fillerCodec, characterCodec, plainCodec } from '../src/lib/codecs.js'

const roundTrips = (codec, lines) => {
  for (const line of lines) assert.equal(codec.join(codec.split(line)), line, `round trip: ${line}`)
}

test('label codec: CAPS label splits, plain colon stays whole', () => {
  roundTrips(labelCodec, [
    'OFFLINE: The Manor cannot hear your phone. Stay where you are: it will reconnect. Nothing is lost.',
    'BALLOT CONFIRM: You accuse once tonight. Seal your answer?',
    'LOCKED: Boo remembers everyone who has ever wasted her evening.',
    'THE FAMILY: Papa Sirwin inherited everything, including his opinions.',
    "JOIN BUTTON: Enter the Manor",
    'WELCOME SPEECH:\nGood evening, and welcome.',   // a body on its own line keeps its line break
    'Go to the study: now.',       // not a CAPS label, stays whole
    'Just a plain line',
    '',
  ])
  assert.deepEqual(labelCodec.split('IN: The polish drops.'), { label: 'IN', text: 'The polish drops.' })
  assert.equal(labelCodec.join({ label: '', text: 'x' }), 'x')
  assert.equal(labelCodec.join({ label: 'HOLD', text: '' }), 'HOLD:')
})

test('dash codec', () => {
  roundTrips(dashCodec, [
    'YOUR PHONE — It is your notebook, your map, and your memory tonight.',
    'Jon — host: Jonathan',
    'no dash here',
    '',
  ])
  assert.deepEqual(dashCodec.split('A — B'), { title: 'A', body: 'B' })
  assert.equal(dashCodec.join({ title: '', body: 'B' }), 'B')
})

test('bag codec', () => {
  roundTrips(bagCodec, [
    'Mint tea bag — smell: minty',
    'Dog-training clicker — sound: clicks',
    'Just an item',
  ])
  assert.deepEqual(bagCodec.split('Mint tea bag — Smell: minty'), { item: 'Mint tea bag', sense: 'smell', property: 'minty' })
  assert.deepEqual(bagCodec.split('Thing — smell'), { item: 'Thing', sense: 'smell', property: '' })
  assert.equal(bagCodec.join({ item: 'Thing', sense: '', property: '' }), 'Thing')
})

test('npc codec', () => {
  roundTrips(npcCodec, [
    'MISS BOO LARUE — family friend and socialite. Arrived for a party some years back and has seen no reason to declare it over. Found wherever the light is best.',
    'ZIMOTHY CLAWFORD, ESQ. — the old family solicitor. Retained since before anyone can name the year. Receives callers in the library.',
    'SIR IRWIN — the dog.',
    'SIR IRWIN — ',
    'no dash at all',
  ])
  assert.deepEqual(npcCodec.split('SIR IRWIN — the dog. Adores you already.'), { name: 'SIR IRWIN', title: 'the dog', about: 'Adores you already.' })
  assert.equal(npcCodec.join({ name: 'SIR IRWIN', title: 'the dog', about: '' }), 'SIR IRWIN — the dog.')
  assert.equal(npcCodec.join({ name: '', title: '', about: '' }), '')
  // a long first sentence with no title picked is the About box, not a title
  assert.deepEqual(npcCodec.split('MISS BOO LARUE — Arrived for a party some years back and has seen no reason to declare it over. Found in the light.'),
    { name: 'MISS BOO LARUE', title: '', about: 'Arrived for a party some years back and has seen no reason to declare it over. Found in the light.' })
})

test('echo codec keeps the gap and its punctuation', () => {
  roundTrips(echoCodec, [
    '...the morning post brings word of ███, which the household calls exaggerated and the post calls Tuesday...',
    '...this station has received reports of ███ from several residents...',
    '...word reaches us that ███...',
    'no gap in this one',
    '...word reaches us that ███',
    '',
  ])
  // a gap at the very end survives, and moves when the second box is used
  assert.deepEqual(echoCodec.split('...that ███'), { before: '...that ███', after: '' })
  assert.equal(echoCodec.join({ before: '...that ███', after: 'and more...' }), '...that ███ and more...')
  assert.deepEqual(echoCodec.split('...of ███, which...'), { before: '...of', after: ', which...' })
  assert.equal(echoCodec.join({ before: '...of', after: 'the rest...' }), '...of ███ the rest...')
  assert.equal(echoCodec.join({ before: '...of ███', after: '' }), '...of ███')
  assert.equal(echoCodec.join({ before: '...of', after: '' }), '...of')
  assert.equal(echoCodec.join({ before: '', after: 'x' }), '███ x')
})

test('filler codec', () => {
  roundTrips(fillerCodec, [
    'Open your bag and pick out the one thing you would never want to smell twice. Button: Done, I have picked one',
    'Which way do you put the toilet paper roll on the holder? Button: Over or Under?',
    'No button at all',
  ])
  assert.deepEqual(fillerCodec.split('Hello. Button: Go'), { message: 'Hello.', button: 'Go' })
  assert.equal(fillerCodec.join({ message: 'Hello.', button: '' }), 'Hello.')
})

test('character codec (unchanged from before)', () => {
  roundTrips(characterCodec, [
    'DR. PIPETTA VONBEAKER — the Scientist. Trusts nothing she has not measured twice, including the soup. Costume: any long coat worn as a lab coat, spectacles.',
    'MRS. IMOGEN STERLINGSHIRE — the Banker. Finishes every sum before you finish asking. Costume: severe dark dress or suit.',
    'DOROTHY RYE — the Baker. Up since four! Costume: Apron?',
  ])
  assert.deepEqual(characterCodec.split('DOROTHY RYE — the Baker. Up since four. Costume: Apron.'),
    { name: 'DOROTHY RYE', profession: 'Baker', persona: 'Up since four.', costume: 'Apron.' })
})

test('plain codec', () => {
  roundTrips(plainCodec, ['anything at all', ''])
})

// Editing one box never changes another box, for every codec and field.
test('isolation: changing one box leaves the others exactly as they were', () => {
  const cases = [
    [labelCodec, 'OFFLINE: The Manor cannot hear your phone.'],
    [dashCodec, 'YOUR PHONE — It is your notebook.'],
    [bagCodec, 'Mint tea bag — smell: minty'],
    [npcCodec, 'MISS BOO LARUE — family friend and socialite. Arrived for a party. Found in the light.'],
    [echoCodec, '...word of ███, which the household denies...'],
    [fillerCodec, 'Pick a smell. Button: Done'],
    [characterCodec, 'DOROTHY RYE — the Baker. Up since four. Costume: Apron.'],
  ]
  for (const [codec, line] of cases) {
    const base = codec.split(line)
    for (const f of Object.keys(base)) {
      // a label box only ever holds capitals and spaces; every other box takes anything
      const probes = f === 'label' || f === 'profession' || (f === 'title' && codec === npcCodec) ? ['A B', 'HOLD', 'X'] : ['a b', 'end.', 'x, y', 'Over']
      for (const v of probes) {
        const next = codec.split(codec.join({ ...base, [f]: v }))
        for (const g of Object.keys(base)) if (g !== f) assert.equal(next[g], base[g], `${f}=${JSON.stringify(v)} moved ${g} in ${line}`)
      }
    }
  }
})
