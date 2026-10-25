// The exact line Claude Code runs for a card (its `tech`), out of Jon's way:
// a closed fold under the plain instruction (24 Oct 2026, the plain-words
// rule: technical detail only under For Claude Code).
export default function TechFold({ tech }) {
  if (!tech) return null
  return (
    <details className="guide-more">
      <summary>For Claude Code</summary>
      <p className="hint tl-detail">{tech}</p>
    </details>
  )
}
