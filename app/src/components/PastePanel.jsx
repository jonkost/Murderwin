import { useMemo, useRef, useState } from 'react'
import { parsePaste } from '../lib/paste'
import { pathCount } from '../lib/scenarios'

// Paste a lot at once. Jon writes in Notes or a chat, pastes it here, and
// the workshop reads it into lines and boxes. He sees what was read before
// anything is added, and lines it could not read are named.
export default function PastePanel({ area, fields, codec, shape, onAdd }) {
  const [raw, setRaw] = useState('')
  const [open, setOpen] = useState(false)
  const [added, setAdded] = useState(null)
  const fileRef = useRef(null)
  const parsed = useMemo(() => (raw.trim() ? parsePaste(area, raw, { fields, codec }) : { items: [], skipped: [] }), [area, raw, fields, codec])
  const n = parsed.items.length

  const readFile = (file) => {
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => setRaw(String(reader.result ?? ''))
    reader.readAsText(file)
  }

  const add = () => {
    if (!n) return
    onAdd(parsed.items)
    setAdded(n)
    setRaw('')
    if (fileRef.current) fileRef.current.value = ''
  }

  return (
    <details className="paste" open={open} onToggle={e => setOpen(e.currentTarget.open)}>
      <summary>Have a lot written already? Paste it here and it fills itself in</summary>
      <p className="hint">One per line, or a blank line between each. {shape}</p>
      <textarea rows={6} value={raw} placeholder="Paste from Notes, a chat, or a spreadsheet…"
        onChange={e => { setRaw(e.target.value); setAdded(null) }} aria-label="Paste many lines" />
      <div className="paste-row">
        <label className="ghost upload-new">
          Or add a file (.txt, .md, .csv)
          <input ref={fileRef} type="file" accept=".txt,.md,.csv,.tsv,.json,text/plain,text/markdown,text/csv" hidden
            onChange={e => readFile(e.target.files?.[0])} />
        </label>
        <button className="primary" disabled={!n} onClick={add}>
          {n ? `Add these ${n}` : 'Add'}
        </button>
      </div>
      {added && !raw && <p className="hint">Added {added}. They are in the list above, ready to edit.</p>}
      {n > 0 && (
        <div className="paste-preview" aria-live="polite">
          <span className="example-tag">What was read: {n} {n === 1 ? 'entry' : 'entries'}</span>
          <ol>
            {parsed.items.slice(0, 6).map((it, i) => (
              <li key={i}>
                {it.beats
                  ? <span><b>{it.text}</b> <span className="hint">3 questions, {pathCount(it.beats)} ways through</span></span>
                  : fields && fields.length > 1
                    ? fields.map(f => it.values?.[f.key] ? <span key={f.key}><i>{f.label}:</i> {String(it.values[f.key]).slice(0, 80)} </span> : null)
                    : <span>{String(it.text).slice(0, 120)}</span>}
              </li>
            ))}
          </ol>
          {n > 6 && <p className="hint">…and {n - 6} more.</p>}
        </div>
      )}
      {parsed.skipped.length > 0 && (
        <p className="lint">⚠ Could not read {parsed.skipped.length}: {parsed.skipped.slice(0, 3).map(s => `“${s.slice(0, 60)}”`).join(', ')}{parsed.skipped.length > 3 ? '…' : ''}. Fix those lines and they will be read too.</p>
      )}
    </details>
  )
}
