// The Home rows (card 343): the three things made blind, as numbers only.
// The `sealedCounts` callable (functions/lib/counts.js) sends back
// { packing: { made, bags }, leans: { questions, of }, pictures: { made, of } }
// and never a word of what is in them. Pure, so app/test can run it.

export const SECRET_ROWS_WHY = 'Made without anyone seeing them. You see how far each has got, never what is in it.'

export function secretRows(counts) {
  if (!counts?.ok) return []
  const p = counts.packing ?? {}
  const l = counts.leans ?? {}
  const d = counts.pictures ?? {}
  const of = (n, total) => `${Number(n) || 0} of ${Number(total) || 0}`
  return [
    {
      key: 'packing', label: 'The packing list',
      value: p.made ? `Made · ${p.bags} bags` : 'Not made yet',
      done: !!p.made,
      why: 'Which things go in which numbered bag. Jenna packs to it.',
    },
    {
      key: 'leans', label: "The cats' leans",
      value: `${of(l.questions, l.of)} questions`,
      done: l.of > 0 && l.questions >= l.of,
      why: 'Which answer each cat likes, for every Parlour Game question.',
    },
    {
      key: 'pictures', label: 'The drawing pictures',
      value: of(d.made, d.of),
      done: d.of > 0 && d.made >= d.of,
      why: 'The pictures for Sir Irwin Needs a Hand, three for each round.',
    },
  ]
}
