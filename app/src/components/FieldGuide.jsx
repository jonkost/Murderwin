// The long field guide for a list, folded under the card. The guide text
// comes from the seed file and was written with long dashes; they are
// swapped for commas on the way to the screen, so nothing Jon reads has one.
const plain = (s) => String(s ?? '').replace(/\s*—\s*/g, ', ').replace(/,\s*,/g, ',')

export default function FieldGuide({ guide, fields, codec }) {
  if (!guide) return null
  // An example is shown the way the boxes show it, so the stored shape
  // (with its separators) never has to be read.
  const boxes = (text) => {
    if (!fields || !codec || fields.length < 2) return <>“{plain(text)}”</>
    const v = codec.split(text)
    return <span className="ex-boxes">{fields.map(f => v[f.key] ? <span key={f.key}><i>{f.label}:</i> {v[f.key]} </span> : null)}</span>
  }
  const rich = guide.syntax || guide.good || guide.bad
  return (
    <div className="guide">
      {rich ? (
        <details className="guide-more">
          <summary>All the rules and more examples</summary>
          <p>{plain(guide.what)}</p>
          {guide.test && <p>The test: <i>{plain(guide.test)}</i></p>}
          {guide.syntax && (
            <ul className="syntax">
              {guide.syntax.map((s, i) => <li key={i}>{plain(s)}</li>)}
            </ul>
          )}
          {guide.good?.map((g, i) => (
            <p key={`g${i}`} className="ex good">✓ {boxes(g.text)} <span className="why">{plain(g.why)}</span></p>
          ))}
          {guide.bad?.map((g, i) => (
            <p key={`b${i}`} className="ex bad">✗ {boxes(g.text)} <span className="why">{plain(g.why)}</span></p>
          ))}
        </details>
      ) : (
        guide.examples && (
          <p className="hint">For example: {guide.examples.map(e => `“${e}”`).join(' · ')}</p>
        )
      )}
    </div>
  )
}
