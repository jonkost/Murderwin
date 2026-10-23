import { spokenParts } from '../lib/spoken'

// A cat's line with its stage directions (*snort*) in italics, no stars.
// Wherever a cat line or hint is shown: testimonies, hints, the hosts'
// lines, a cat passing by, Granolia on the study screen, Sir Irwin.
export default function Spoken({ text }) {
  return spokenParts(text).map((p, i) => (p.stage ? <em key={i} className="stage">{p.text}</em> : p.text))
}
