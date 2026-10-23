import { useState } from 'react'
import { AREAS, GUIDES, fieldsFor, codecFor } from '../lib/content'
import { cardFor } from '../lib/cards'
import FieldGuide from './FieldGuide'

// The card at the top of every list. It is never hidden, not even in focus
// mode: it says what the list is, which part of the night it feeds, what
// goes in each box, and shows one finished example in the shape of the
// boxes. The long field guide (all the rules) folds away underneath.
export default function ListCard({ area, tab, compact = false, onUseExample }) {
  const spec = AREAS[area]
  const card = cardFor(area, tab)
  const [open, setOpen] = useState(!compact)
  if (!spec || !card) return null
  const guide = spec.guide ? GUIDES[spec.guide] : null
  const fields = fieldsFor(area)
  // A dropdown's example shows its plain words, not the stored code.
  const shown = (e, i) => {
    const f = fields[i]
    if (f?.kind !== 'select') return e.text
    const o = f.options.find(o => (typeof o === 'string' ? o : o.value) === e.text)
    return o ? (typeof o === 'string' ? o : o.label) : e.text
  }
  return (
    <section className="listcard" aria-label="About this list">
      <p className="moment"><span className="moment-tag">Part of the night</span> {spec.moment}</p>
      <p className="what">{card.what}</p>
      {card.note && <p className="tabnote">{card.note}</p>}
      {compact && !open ? (
        <button className="linkish" onClick={() => setOpen(true)}>Show what goes in each box</button>
      ) : (
        <>
          <p className="where"><b>Where a guest meets it:</b> {card.where}</p>
          <p className="howto"><b>What to type:</b> {card.howTo}</p>
          {card.example?.length > 0 && (
            <div className="example-card" aria-label="An example, not one of your lines">
              <span className="example-tag">Example only. Not yours, not saved. It shows the shape.</span>
              <dl>
                {card.example.map((e, i) => (
                  <div key={i} className="example-row"><dt>{e.field}</dt><dd>{shown(e, i)}</dd></div>
                ))}
              </dl>
              {onUseExample && <button className="linkish" onClick={() => onUseExample(card.example)}>Copy this example into the boxes, then change it</button>}
            </div>
          )}
          {compact && <button className="linkish" onClick={() => setOpen(false)}>Hide this</button>}
        </>
      )}
      <FieldGuide guide={guide} fields={fields} codec={codecFor(area)} />
    </section>
  )
}
