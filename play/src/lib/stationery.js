// The seven stationery designs a document can be printed on. The case names
// a design by the workshop's template line ("Telegram", "Household notice");
// the phone turns that into a file slug under /play/stationery/ and a font.
// A name the phone does not know prints on the plain block instead, so a
// renamed design never breaks a card. Pure: tested by test/stationery.test.mjs.

export const STATIONERY = {
  receipt: { name: 'Receipt', ink: 'mono' },
  telegram: { name: 'Telegram', ink: 'mono' },
  'household-notice': { name: 'Household notice', ink: 'poster' },
  'citation-form': { name: 'Citation / form', ink: 'mono' },
  'personal-letter': { name: 'Personal letter', ink: 'hand' },
  playbill: { name: 'Playbill', ink: 'poster' },
  'mourning-card': { name: 'Mourning card', ink: 'serif' },
}
export const TEMPLATE_NAMES = Object.values(STATIONERY).map(t => t.name)

// Other words a design might be called by, in the workshop or the plan.
const ALIASES = {
  notice: 'household-notice', handbill: 'household-notice', 'newspaper-cutting': 'household-notice',
  citation: 'citation-form', form: 'citation-form', 'ledger-page': 'citation-form',
  letter: 'personal-letter', letterhead: 'personal-letter', note: 'personal-letter',
  mourning: 'mourning-card', 'calling-card': 'mourning-card',
  bill: 'playbill',
}

export function templateSlug(name) {
  const s = String(name ?? '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  if (!s) return null
  if (STATIONERY[s]) return s
  if (ALIASES[s]) return ALIASES[s]
  const head = s.split('-')[0]
  if (STATIONERY[head]) return head
  if (ALIASES[head]) return ALIASES[head]
  return null
}

export function stationeryUrl(slug, base = '/') {
  return `${base}stationery/${slug}.svg`
}
