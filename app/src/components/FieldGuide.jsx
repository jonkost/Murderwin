// Renders an area's field guide. Handles both the rich handbook shape
// ({what, syntax, test, good, bad, perTab}) and the legacy thin shape
// ({what, test, examples}).
export default function FieldGuide({ guide, tab }) {
  if (!guide) return null
  const tabNote = tab ? guide.perTab?.[tab] : null
  const rich = guide.syntax || guide.good || guide.bad
  return (
    <div className="guide">
      {tabNote && <p className="tabnote">{tabNote}</p>}
      {rich ? (
        <details className="guide-more">
          <summary>More about this list — rules and examples</summary>
          <p>{guide.what}</p>
          {guide.test && <p>Test: <i>{guide.test}</i></p>}
          {guide.syntax && (
            <ul className="syntax">
              {guide.syntax.map((s, i) => <li key={i}>{s}</li>)}
            </ul>
          )}
          {guide.good?.map((g, i) => (
            <p key={`g${i}`} className="ex good">✓ “{g.text}” <span className="why">— {g.why}</span></p>
          ))}
          {guide.bad?.map((g, i) => (
            <p key={`b${i}`} className="ex bad">✗ “{g.text}” <span className="why">— {g.why}</span></p>
          ))}
        </details>
      ) : (
        guide.examples && (
          <p className="hint">e.g. {guide.examples.map(e => `“${e}”`).join(' · ')}</p>
        )
      )}
    </div>
  )
}
