// The word rule (B3, handoff 11 Nov 2026; Job 3, handoff 12 Nov 2026), shared
// by functions/test/b3-words.test.mjs and play/test/b3-words.test.mjs. Not a
// test file itself, so importing it runs no tests.

export const MAX_WORDS = 25
export const MAX_SENTENCES = 2
const ACT_NAME = /Act \d+ ·/
const BRITISH = /\b(colour|favourite|whilst|neighbour|favour)s?\b/i
const LONG_DASH = /[—–]/

export function sentences(text) {
  return String(text).replace(/\[[A-Z_]+\]/g, 'X').split(/(?<=[.!?])\s+/).map(s => s.trim()).filter(Boolean)
}
export function wordsIn(sentence) { return sentence.split(/\s+/).filter(Boolean).length }

// What is wrong with one line, or [] when it passes. `card` is true for the
// text of a notice or a card, where two sentences is the most.
export function problems(text, { card = false } = {}) {
  const out = []
  const s = String(text ?? '')
  if (!s) return out
  for (const one of sentences(s)) if (wordsIn(one) > MAX_WORDS) out.push(`a sentence of ${wordsIn(one)} words`)
  if (card && sentences(s).length > MAX_SENTENCES) out.push(`${sentences(s).length} sentences`)
  if (ACT_NAME.test(s)) out.push('an act name')
  if (BRITISH.test(s)) out.push(`British spelling: ${s.match(BRITISH)[0]}`)
  if (LONG_DASH.test(s)) out.push('a long dash')
  return out
}
