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

test('bag codec: the final items, and a September line kept as it was', () => {
  roundTrips(bagCodec, [
    'Yellow ball — touch: pointy; touch: bumpy · touch · stock 1 · looks like: small spikes · tag: fun',
    "Hershey's Kisses — smell: chocolatey; taste: chocolatey · food, two singles · stock 50 · looks like: silver foil · tag: no-no",
    'Orange ball — no clue words · touch · stock 1 · looks like: smooth with dents · tag: fun',
    'Click pens — sound: clicky · extra · stock 8 · looks like: one of each ink color',
    'Mint tea bag — smell: minty',
    'Just an item',
  ])
  assert.deepEqual(bagCodec.split('Yellow ball — touch: pointy; touch: bumpy · touch · stock 1 · looks like: small spikes · tag: fun'),
    { item: 'Yellow ball', words: 'touch: pointy; touch: bumpy', kind: 'touch', stock: '1', looks: 'small spikes', tag: 'fun' })
  assert.deepEqual(bagCodec.split('Mint tea bag — smell: minty'), { item: 'Mint tea bag', words: 'smell: minty', kind: '', stock: '', looks: '', tag: '' })
  assert.equal(bagCodec.join({ item: 'Thing', words: '', kind: '', stock: '', looks: '', tag: '' }), 'Thing')
  assert.equal(bagCodec.join({ item: 'Thing', words: '', kind: 'extra', stock: '2', looks: '', tag: '' }), 'Thing — no clue words · extra · stock 2')
})

test('npc codec: one of the five, plus about', () => {
  roundTrips(npcCodec, [
    'MISS BOO LARUE — family friend and socialite. Arrived for a party some years back. Found wherever the light is best.',
    'ZIMOTHY CLAWFORD, ESQ. — the old family solicitor. Retained since before anyone can name the year.',
    'SIR IRWIN — the dog.',
    'no dash at all',
  ])
  assert.deepEqual(npcCodec.split('SIR IRWIN — the dog. Adores you already.'), { who: 'irwin', about: 'Adores you already.' })
  assert.deepEqual(npcCodec.split('Sir Irwin — Adores you already.'), { who: 'irwin', about: 'Adores you already.' })
  assert.equal(npcCodec.join({ who: 'irwin', about: '' }), 'SIR IRWIN — the dog.')
  assert.equal(npcCodec.join({ who: '', about: 'x' }), 'x')
  assert.deepEqual(npcCodec.split('LORD NOBODY — a stranger. Not one of the five.'), { who: '', about: 'LORD NOBODY — a stranger. Not one of the five.' })
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
    [bagCodec, 'Yellow ball — touch: pointy; touch: bumpy · touch · stock 1 · looks like: small spikes · tag: fun'],
    [npcCodec, 'MISS BOO LARUE — family friend and socialite. Arrived for a party. Found in the light.'],
    [echoCodec, '...word of ███, which the household denies...'],
    [fillerCodec, 'Pick a smell. Button: Done'],
    [characterCodec, 'DOROTHY RYE — the Baker. Up since four. Costume: Apron.'],
  ]
  for (const [codec, line] of cases) {
    const base = codec.split(line)
    for (const f of Object.keys(base)) {
      // a label box only ever holds capitals and spaces; every other box takes anything
      const probes = f === 'label' || f === 'profession' ? ['A B', 'HOLD', 'X'] : f === 'who' ? ['boo', 'salem']
        : codec === bagCodec && f === 'kind' ? ['food, one pack', 'extra'] : codec === bagCodec && f === 'tag' ? ['spooky', 'no-no'] : codec === bagCodec && f === 'stock' ? ['3', '12']
          : ['a b', 'end.', 'x, y', 'Over']
      for (const v of probes) {
        const next = codec.split(codec.join({ ...base, [f]: v }))
        for (const g of Object.keys(base)) if (g !== f) assert.equal(next[g], base[g], `${f}=${JSON.stringify(v)} moved ${g} in ${line}`)
      }
    }
  }
})
