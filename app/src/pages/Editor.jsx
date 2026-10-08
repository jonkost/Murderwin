import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams, useSearchParams, Link } from 'react-router-dom'
import { useAreaEditor, autoGrow } from '../lib/useAreaEditor'
import { AREAS, TAB_KINDS, GUIDES, lintItem, splitFields, joinFields } from '../lib/content'
import FieldGuide from '../components/FieldGuide'

export default function Editor() {
  const { area } = useParams()
  // key by area: a fresh instance per area so stale local state can never
  // be flushed into a different area's document
  return AREAS[area]
    ? <AreaEditor key={area} area={area} />
    : <main className="dash"><p>Unknown area. <Link to="/">Back</Link></p></main>
}

function AreaEditor({ area }) {
  const spec = AREAS[area]
  const [params, setParams] = useSearchParams()
  const { items, status, flush, applyChange } = useAreaEditor(area)
  const [lastDeleted, setLastDeleted] = useState(null)
  // The fresh line at the bottom. Local until committed, so an abandoned
  // empty draft never becomes a junk item in Firestore.
  const [draft, setDraft] = useState('')
  const [draftA, setDraftA] = useState('')
  const draftText = useRef('')
  const draftRef = useRef(null)
  const form = spec.form ?? null

  const tabDef = spec.tabs ? TAB_KINDS[spec.tabs] : null
  const tabs = tabDef?.list ?? null
  const tab = tabs ? (params.get('tab') ?? tabs[0]) : null
  const loaded = items !== null

  // Cursor lands in the input on load, and again on every tab switch.
  useEffect(() => {
    if (loaded) draftRef.current?.focus()
  }, [loaded, tab])

  const visible = useMemo(() => {
    if (!items) return []
    return items
      .filter(i => !i.deleted)
      .filter(i => !tabDef || i[tabDef.field] === tab)
      .sort((a, b) => a.order - b.order)
  }, [items, tab, tabDef])

  if (!loaded) return <main className="dash"><p>Loading…</p></main>

  const guideKey = spec.tabs === 'pools' ? tab : spec.guide
  const guide = guideKey ? GUIDES[guideKey] : null

  const edit = (id, text) => {
    const before = items.find(i => i.id === id)
    const next = items.map(i => (i.id === id ? { ...i, text } : i))
    applyChange(next, { itemId: id, before, after: { ...before, text } })
  }

  const add = (text) => {
    const maxOrder = Math.max(-1, ...items.filter(i => !tabDef || i[tabDef.field] === tab).map(i => i.order))
    const item = {
      id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
      text,
      deleted: false,
      order: maxOrder + 1,
      ...(spec.checklist ? { done: false } : {}),
      ...(tabDef ? { [tabDef.field]: tab } : {}),
    }
    applyChange([...items, item], { itemId: item.id, before: null, after: item })
  }

  // Enter commits the draft as a new line and leaves a fresh one under the
  // cursor. Reads the ref, not state, so a blur followed by a click on Add
  // can never commit the same text twice.
  const commitDraft = () => {
    const text = form ? joinFields(area, draftA, draftText.current) : draftText.current.trim()
    if (!draftText.current.trim()) return
    draftText.current = ''
    setDraft('')
    if (draftRef.current) draftRef.current.style.height = 'auto'
    setDraftA('')
    if (text) add(text)
  }

  const onDraftKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      commitDraft()
      draftRef.current?.focus()
    }
  }

  // Enter on an existing line commits it and jumps to the fresh line.
  // Shift+Enter still inserts a line break.
  const onLineKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      flush()
      draftRef.current?.focus()
    }
  }

  const toggleDone = (id) => {
    const before = items.find(i => i.id === id)
    const next = items.map(i => (i.id === id ? { ...i, done: !i.done } : i))
    applyChange(next, { itemId: id, before, after: { ...before, done: !before.done } }, true)
  }

  const softDelete = (id) => {
    const before = items.find(i => i.id === id)
    const next = items.map(i => (i.id === id ? { ...i, deleted: true } : i))
    setLastDeleted(before)
    applyChange(next, { itemId: id, before, after: { ...before, deleted: true } })
  }

  const undelete = () => {
    const before = lastDeleted && items.find(i => i.id === lastDeleted.id)
    setLastDeleted(null)
    if (!before) return
    const next = items.map(i => (i.id === before.id ? { ...i, deleted: false } : i))
    applyChange(next, { itemId: before.id, before, after: { ...before, deleted: false } })
  }

  const move = (id, dir) => {
    const idx = visible.findIndex(i => i.id === id)
    const other = visible[idx + dir]
    if (!other) return
    const a = items.find(i => i.id === id)
    const b = items.find(i => i.id === other.id)
    const next = items.map(i =>
      i.id === a.id ? { ...i, order: b.order } :
      i.id === b.id ? { ...i, order: a.order } : i)
    applyChange(next, [
      { itemId: a.id, before: a, after: { ...a, order: b.order } },
      { itemId: b.id, before: b, after: { ...b, order: a.order } },
    ])
  }

  const draftWarn = spec.checklist ? null : lintItem(area, draft)

  return (
    <main className="dash">
      {status === 'error' && (
        <div className="banner error" role="alert">
          SAVE FAILED — your latest edits are NOT saved.
          <button onClick={flush}>Retry now</button>
        </div>
      )}
      {status === 'loaderror' && (
        <div className="banner error" role="alert">
          Couldn’t load this list — check your connection and reload.
        </div>
      )}
      <div className="editor-head">
        <h2>{spec.label}</h2>
        <span className={`save-dot ${status}`}>
          {status === 'saved' ? 'saved ✓' : status === 'saving' ? 'saving…' : 'not saved'}
        </span>
      </div>

      {tabs && (
        <nav className="tabs">
          {tabs.map(t => (
            <button key={t} className={t === tab ? 'tab active' : 'tab'}
              onClick={() => setParams({ tab: t })}>
              {tabDef.label(t)}
            </button>
          ))}
        </nav>
      )}

      <p className="why">{spec.why}</p>
      <FieldGuide guide={guide} tab={spec.tabs && spec.tabs !== 'pools' ? tab : null} />

      <ul className="items">
        {visible.map((item, idx) => {
          const warn = spec.checklist ? null : lintItem(area, item.text)
          return (
            <li key={item.id} className={item.done ? 'item done' : 'item'}>
              <div className="item-row">
                {spec.checklist && (
                  <input type="checkbox" className="check" checked={!!item.done}
                    onChange={() => toggleDone(item.id)} title="Done" />
                )}
                <span className="reorder">
                  <button onClick={() => move(item.id, -1)} disabled={idx === 0} title="Move up">▲</button>
                  <button onClick={() => move(item.id, +1)} disabled={idx === visible.length - 1} title="Move down">▼</button>
                </span>
                {form ? (
                  <Fields area={area} form={form} text={item.text} onKeyDown={onLineKey}
                    onChange={(a, b) => edit(item.id, joinFields(area, a, b))} />
                ) : (
                  <textarea rows={2} value={item.text} placeholder="…"
                    onInput={autoGrow}
                    onKeyDown={onLineKey}
                    onChange={e => edit(item.id, e.target.value)} />
                )}
                <button className="ghost" onClick={() => softDelete(item.id)} title="Delete (soft)">✕</button>
              </div>
              {warn && <p className="lint">⚠ {warn}</p>}
            </li>
          )
        })}
        <li className="item draft">
          <div className="item-row">
            {spec.checklist && <span className="check-gap" aria-hidden="true" />}
            <span className="reorder" aria-hidden="true" />
            {form ? (
              <div className="fields">
                {form.options
                  ? <select value={draftA} aria-label={form.a} onChange={e => setDraftA(e.target.value)}>
                      <option value="">{form.a}…</option>
                      {form.options.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  : <input type="text" value={draftA} placeholder={form.a} aria-label={form.a}
                      onChange={e => setDraftA(e.target.value)} />}
                <textarea ref={draftRef} rows={2} value={draft}
                  placeholder={`${form.b} — Enter adds it`}
                  aria-label={form.b}
                  onInput={autoGrow}
                  onKeyDown={onDraftKey}
                  onChange={e => { draftText.current = e.target.value; setDraft(e.target.value) }} />
              </div>
            ) : (
              <textarea ref={draftRef} rows={2} value={draft}
                placeholder="New line — Enter adds it"
                aria-label="New line"
                onInput={autoGrow}
                onKeyDown={onDraftKey}
                onBlur={commitDraft}
                onChange={e => { draftText.current = e.target.value; setDraft(e.target.value) }} />
            )}
            <button className="primary" onMouseDown={e => e.preventDefault()} onClick={commitDraft} title="Add line">Add</button>
          </div>
          {draftWarn && <p className="lint">⚠ {draftWarn}</p>}
        </li>
      </ul>

      {lastDeleted && (
        <div className="editor-foot">
          <button className="ghost" onClick={undelete}>
            Undo delete: “{lastDeleted.text.slice(0, 30)}…”
          </button>
        </div>
      )}
    </main>
  )
}


// Two labelled fields for one saved line. The line is split on its separator
// and joined back on every keystroke, so what is stored never changes shape.
function Fields({ area, form, text, onChange, onKeyDown }) {
  const { a, b } = splitFields(area, text)
  return (
    <div className="fields">
      {form.options
        ? <select value={a} aria-label={form.a} onChange={e => onChange(e.target.value, b)}>
            <option value="">{form.a}…</option>
            {form.options.map(o => <option key={o} value={o}>{o}</option>)}
            {a && !form.options.includes(a) && <option value={a}>{a}</option>}
          </select>
        : <input type="text" value={a} placeholder={form.a} aria-label={form.a}
            onChange={e => onChange(e.target.value, b)} />}
      <textarea rows={2} value={b} placeholder={form.b} aria-label={form.b}
        onInput={autoGrow} onKeyDown={onKeyDown}
        onChange={e => onChange(a, e.target.value)} />
    </div>
  )
}
