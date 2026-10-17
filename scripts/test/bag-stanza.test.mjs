import { test } from 'node:test'
import assert from 'node:assert/strict'
import { memoryDb, readSafeInputs, readBagInputs, bagStanza, stanzaCounts, inputStanza } from '../lib.mjs'
import { userPrompt } from '../generate-sealed.mjs'

// The generator's bag stanza: the property words in play (safe content) go
// into the prompt as words to avoid; which bag holds what never does.

test('the bag inputs are the property words from the packing and the pool, never a bag number', async () => {
  const db = memoryDb({
    'safe_content/bag_items': { items: [
      { id: 'a', text: '(item a) — smell: (prop minty); sound: (prop rattles)', order: 0 },
      { id: 'b', text: '(item b) — touch: (prop rough)', order: 1 },
      { id: 'c', text: 'gone — taste: (never)', order: 2, deleted: true },
      { id: 'd', text: 'no dash here', order: 3 },
    ] },
    'sealed/bags': { properties: { '(prop rough)': [1, 2], '(prop gold)': [3, 4, 5] }, stackedPairs: [['(prop rough)', '(prop gold)']], packedAt: new Date(0) },
  })
  const bags = await readBagInputs(db)
  assert.deepEqual(bags.properties, ['(prop gold)', '(prop minty)', '(prop rattles)', '(prop rough)'])
  assert.equal(bags.packed, 2)
  assert.equal(bags.stackedPairs, 1)
  const stanza = bagStanza(bags)
  assert.ok(stanza.includes('(prop minty)') && stanza.includes('OUT of all content'))
  assert.ok(!/\b[1-5]\b/.test(stanza), 'no bag number in the stanza')
  assert.ok(!stanza.includes('(item'), 'no item name either')
  assert.equal(bagStanza({ properties: [] }), '')
  assert.equal(bagStanza(null), '')
  // through readSafeInputs and the counts
  const inputs = await readSafeInputs(db)
  assert.deepEqual(inputs.bags.properties, bags.properties)
  assert.deepEqual(stanzaCounts(inputs), { poolValues: 0, voiceLines: 0, bagProperties: 4, bagsPacked: 2 })
  const prompt = userPrompt({ n: 1, rhyme: 'A test rhyme for the stanza' }, { stanza: [inputStanza(inputs), bagStanza(inputs.bags)].filter(Boolean).join('\n'), names: [] })
  assert.ok(prompt.includes('(prop rough)'))
  // nothing packed, nothing written: an empty workshop adds nothing
  const empty = await readBagInputs(memoryDb({}))
  assert.deepEqual(empty, { properties: [], packed: 0, stackedPairs: 0 })
})
