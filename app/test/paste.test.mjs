import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parsePaste, parseScenarios } from '../src/lib/paste.js'
import { characterCodec, labelCodec, dashCodec, bagCodec, npcCodec, echoCodec, plainCodec } from '../src/lib/codecs.js'

const bioFields = [
  { key: 'name', kind: 'select', options: [{ value: 'Preston White', label: 'Preston White, the Reporter' }, { value: 'Roger Arms', label: 'Roger Arms, the Sergeant Major' }, { value: 'Dorothy Rye', label: 'Dorothy Rye, the Baker' }] },
  { key: 'persona' },
]

test("Jon's bios paste: Name · Job on one line, the bio under it", () => {
  const raw = `Preston White · Reporter
You write the society column. Sir Irwin’s birthday is the biggest story of your career.

Roger Arms · Sergeant Major
On leave from the service, you now guard the Manor.
Costume: a sash and a whistle

Dorothy Rye - Baker - Your bakery makes Sir Irwin’s dog biscuits.`
  const { items, skipped } = parsePaste('bios', raw, { fields: bioFields, codec: characterCodec })
  assert.equal(skipped.length, 0)
  assert.equal(items.length, 3)
  assert.equal(items[0].values.name, 'Preston White')
  assert.match(items[0].values.persona, /^You write the society column/)
  assert.equal(items[1].values.costume, undefined) // costume lines are dropped: nobody dresses up
  assert.match(items[1].values.persona, /guard the Manor\.$/)
  assert.match(items[2].values.persona, /dog biscuits/)
  assert.match(items[0].text, /^PRESTON WHITE — the Reporter\. You write/)
  // a name that is not one of the fourteen is skipped and named
  const odd = parsePaste('bios', 'Lord Nobody · Stranger\nNot a character.', { fields: bioFields, codec: characterCodec })
  assert.equal(odd.items.length, 0)
  assert.match(odd.skipped[0], /not one of the fourteen/)
})

test('one-box lists: a line each, bullets dropped', () => {
  const raw = `- That is everything. I feel much lighter.\n• You may pet me now.\n3. If you learn more, come tell me.`
  const { items } = parsePaste('closers', raw, { fields: [{ key: 'text' }], codec: plainCodec })
  assert.deepEqual(items.map(i => i.text), ['That is everything. I feel much lighter.', 'You may pet me now.', 'If you learn more, come tell me.'])
})

test('label lists: LABEL: text, or the label on its own line; unknown labels are skipped with a reason', () => {
  const fields = [{ key: 'label', kind: 'select', label: 'Standing', options: [{ value: 'LOCKED', label: 'Locked out' }, { value: 'WARMING', label: 'Warming up' }, { value: 'IN', label: 'In' }] }, { key: 'text' }]
  const raw = `Locked out: Boo remembers everyone who has ever wasted her evening.\nwarming - Zimothy has opened a file on you.\n\nIN\nThe polish drops.\n\nSOMEWHERE: not a standing`
  const { items, skipped } = parsePaste('status_lines', raw, { fields, codec: labelCodec })
  assert.deepEqual(items.map(i => i.text), [
    'LOCKED: Boo remembers everyone who has ever wasted her evening.',
    'WARMING: Zimothy has opened a file on you.',
    'IN: The polish drops.',
  ])
  assert.equal(skipped.length, 1)
  assert.match(skipped[0], /no such standing/)
})

test('rules: heading then body, with a dash, a colon, or on two lines', () => {
  const fields = [{ key: 'title', kind: 'text' }, { key: 'body' }]
  const raw = `YOUR PHONE — It is your notebook tonight.\nThe motive menu: 19 reasons appear from Act 1.\n\nHOW TO WIN\nName the Murderer, the Motive and the Victim.`
  const { items } = parsePaste('rules_text', raw, { fields, codec: dashCodec })
  assert.deepEqual(items.map(i => i.text), [
    'YOUR PHONE — It is your notebook tonight.',
    'The motive menu — 19 reasons appear from Act 1.',
    'HOW TO WIN — Name the Murderer, the Motive and the Victim.',
  ])
})

test('bag items: a line in the final format goes in as written', () => {
  const fields = [{ key: 'item' }, { key: 'words' }, { key: 'kind', kind: 'select', options: ['food, two singles', 'food, one pack', 'touch', 'extra'] }, { key: 'stock' }, { key: 'looks' }, { key: 'tag', kind: 'select', options: ['', 'spooky', 'fun', 'no-no'] }]
  const raw = `Red ball — touch: pointy · touch · stock 1 · looks like: big spikes · tag: fun\nCinnamon sticks — smell: cinnamon · extra · stock 4 · looks like: loose sticks`
  const { items } = parsePaste('bag_items', raw, { fields, codec: bagCodec })
  assert.deepEqual(items.map(i => i.text), ['Red ball — touch: pointy · touch · stock 1 · looks like: big spikes · tag: fun', 'Cinnamon sticks — smell: cinnamon · extra · stock 4 · looks like: loose sticks'])
})

test('household cards and news frames', () => {
  const npcFields = [{ key: 'who', kind: 'select', options: [{ value: 'irwin', label: 'Sir Irwin, the dog' }, { value: 'boo', label: 'Miss Boo LaRue, family friend and socialite' }] }, { key: 'about' }]
  const { items, skipped } = parsePaste('npc_cards', `Sir Irwin · the dog\nAdores you already. Found underfoot.\n\nBoo · Arrived for a party some years back.\n\nLord Nobody · a stranger`, { fields: npcFields, codec: npcCodec })
  assert.equal(items[0].text, 'SIR IRWIN — the dog. Adores you already. Found underfoot.')
  assert.equal(items[1].text, 'MISS BOO LARUE — family friend and socialite. Arrived for a party some years back.')
  assert.equal(skipped.length, 1)
  const echo = parsePaste('echo_frames', `...word reaches us of [gap], which the household denies...\n...reports describe ___ at the Grand...`, { fields: [{ key: 'before' }, { key: 'after' }], codec: echoCodec })
  assert.equal(echo.items[0].text, '...word reaches us of ███, which the household denies...')
  assert.equal(echo.items[1].text, '...reports describe ███ at the Grand...')
})

test('Parlour Game sets: questions with choices under them, or one line per question', () => {
  const raw = `Do you care which way your toilet paper sits?
Yes +5
No 0
Which way?
Over +5
Under -1
Do you fix it when you see it wrong?
Yes -1
No -1

Ice in orange juice? | Always +2 | Never -2 | Depends 0
A cup or a glass? | Cup -1 | Glass +3
Do you finish the last sip? | Of course +1 | Leave it 0`
  const { items, skipped } = parseScenarios(raw)
  assert.equal(skipped.length, 0)
  assert.equal(items.length, 2)
  assert.equal(items[0].text, 'Do you care which way your toilet paper sits?')
  assert.deepEqual(items[0].beats[1], { q: 'Which way?', n: 2, a: 'Over', av: 5, b: 'Under', bv: -1 })
  assert.equal(items[1].beats[0].n, 3)
  assert.equal(items[1].beats[0].c, 'Depends')
  assert.equal(items[1].beats[2].av, 1)
})
