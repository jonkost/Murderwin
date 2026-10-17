import { test } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { STATIONERY, TEMPLATE_NAMES, templateSlug, stationeryUrl } from '../src/lib/stationery.js'

// The seven blank designs: one file each, named by slug, and every name the
// workshop uses for a design lands on one of them. Safe content only.

test('seven designs, seven blank files, in the house palette, with no words on them', () => {
  const slugs = Object.keys(STATIONERY)
  assert.equal(slugs.length, 7)
  for (const slug of slugs) {
    const file = new URL(`../public/stationery/${slug}.svg`, import.meta.url)
    assert.ok(existsSync(file), `${slug}.svg exists`)
    const svg = readFileSync(file, 'utf8')
    assert.ok(svg.startsWith('<svg'), 'an svg')
    assert.ok(svg.includes('viewBox="0 0 360 520"'), 'the paper shape')
    assert.ok(/#F1E8D6|#f6eedf|#f3e6cc|#efe6d8/i.test(svg), 'parchment')
    const words = (svg.match(/<text[^>]*>([^<]*)<\/text>/g) ?? []).map(t => t.replace(/<[^>]+>/g, '').trim()).filter(w => /[a-z]{3,}/i.test(w))
    assert.deepEqual(words, [], 'no words on the blank')
  }
})

test('every workshop template name maps to its slug; other spellings land somewhere sensible; an unknown name is null', () => {
  assert.deepEqual(TEMPLATE_NAMES.map(templateSlug), ['receipt', 'telegram', 'household-notice', 'citation-form', 'personal-letter', 'playbill', 'mourning-card'])
  assert.equal(templateSlug('Telegram'), 'telegram')
  assert.equal(templateSlug('Household notice'), 'household-notice')
  assert.equal(templateSlug('Citation / form'), 'citation-form')
  assert.equal(templateSlug('Personal letter'), 'personal-letter')
  assert.equal(templateSlug('Mourning card'), 'mourning-card')
  assert.equal(templateSlug('  RECEIPT '), 'receipt')
  assert.equal(templateSlug('Notice'), 'household-notice')
  assert.equal(templateSlug('Letter'), 'personal-letter')
  assert.equal(templateSlug('Letterhead'), 'personal-letter')
  assert.equal(templateSlug('Receipt, torn'), 'receipt')
  assert.equal(templateSlug('A map of the grounds'), null, 'unknown: the plain block')
  assert.equal(templateSlug(''), null)
  assert.equal(templateSlug(undefined), null)
  assert.equal(stationeryUrl('playbill', '/play/'), '/play/stationery/playbill.svg')
})
