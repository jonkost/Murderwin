import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams, useSearchParams, Link } from 'react-router-dom'
import { useAreaEditor, autoGrow } from '../lib/useAreaEditor'
import { AREAS, TAB_KINDS, GUIDES, lintItem, splitFields, joinFields, splitCharacter, joinCharacter, CHARACTER_FIELDS } from '../lib/content'
import FieldGuide from '../components/FieldGuide'
import { useDictation } from '../lib/useDictation'

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
  const multi = spec.fields ? CHARACTER_FIELDS : null
  const [draftMulti, setDraftMulti] = useState({})

  const tabDef = spec.tabs ? TAB_KINDS[spec.tabs] : null
  const tabs = tabDef?.list ?? null
  const tab = tabs ? (params.get('tab') ?? tabs[0]) : null
  const loaded = items !== null
  // Focus mode: one list, a small goal, nothing else on screen.
  const focusGoal = Number(params.get('focus')) || 0
  const [startCount, setStartCount] = useState(null)

  // Speak a line: the words land in the fresh box; Enter or Add keeps them.
  const dictation = useDictation(
    text => { draftText.current = text; setDraft(text) },
    () => draftRef.current?.focus(),
  )

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

  useEffect(() => {
    if (loaded && focusGoal && startCount === null) setStartCount(visible.length)
  }, [loaded, focusGoal, startCount, visible.length])

  if (!loaded) return <main className="dash"><p>Loading…</p></main>
  const written = startCount === null ? 0 : Math.max(0, visible.length - startCount)
  const reached = focusGoal > 0 && written >= focusGoal

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
    if (multi) {
      const text = joinCharacter(draftMulti)
      if (!Object.values(draftMulti).some(v => v?.trim())) return
      setDraftMulti({})
      add(text)
      return
    }
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

      <Needs spec={spec} items={items} tabDef={tabDef} tab={tab} />

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

      {focusGoal > 0 ? (
        <div className={reached ? 'focus done' : 'focus'} role="status">
          {reached
            ? <><b>That’s {written}. Goal met.</b> Stop here, or keep going; either is a win. <Link to="/">Back home</Link></>
            : <><b>{focusGoal - written} more</b> and you’re done for now. {spec.why}</>}
          <span className="focus-bar"><span style={{ width: `${Math.min(100, Math.round((written / focusGoal) * 100))}%` }} /></span>
        </div>
      ) : (
        <>
          <p className="add-line">{spec.add ?? spec.why}</p>
          {guide?.good?.[0] && <p className="example">For example: “{guide.good[0].text}”</p>}
          <FieldGuide guide={guide} tab={spec.tabs && spec.tabs !== 'pools' ? tab : null} />
        </>
      )}

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
                {multi ? (
                  <CharacterFields text={item.text} onKeyDown={onLineKey}
                    onChange={next => edit(item.id, joinCharacter(next))} />
                ) : form ? (
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
            {multi ? (
              <div className="fields">
                {CHARACTER_FIELDS.map((f, i) => (
                  <label key={f.key} className="field-row">
                    <span>{f.label}</span>
                    {f.key === 'persona'
                      ? <textarea ref={i === 0 ? draftRef : null} rows={2} value={draftMulti[f.key] ?? ''} placeholder={f.placeholder}
                          onInput={autoGrow} onKeyDown={onDraftKey}
                          onChange={e => setDraftMulti(d => ({ ...d, [f.key]: e.target.value }))} />
                      : <input ref={i === 0 ? draftRef : null} type="text" value={draftMulti[f.key] ?? ''} placeholder={f.placeholder}
                          onKeyDown={onDraftKey}
                          onChange={e => setDraftMulti(d => ({ ...d, [f.key]: e.target.value }))} />}
                  </label>
                ))}
              </div>
            ) : form ? (
              <div className="fields">
                {form.options
                  ? <select value={draftA} aria-label={form.a} onChange={e => setDraftA(e.target.value)}>
                      <option value="">{form.a}…</option>
                      {form.options.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  : <input type="text" value={draftA} placeholder={form.a} aria-label={form.a}
                      onChange={e => setDraftA(e.target.value)} />}
                <textarea ref={draftRef} rows={2} value={draft}
                  placeholder={form.b}
                  aria-label={form.b}
                  onInput={autoGrow}
                  onKeyDown={onDraftKey}
                  onChange={e => { draftText.current = e.target.value; setDraft(e.target.value) }} />
              </div>
            ) : (
              <textarea ref={draftRef} rows={2} value={draft}
                placeholder="Type or speak a line, then press Enter"
                aria-label="New line"
                onInput={autoGrow}
                onKeyDown={onDraftKey}
                onBlur={commitDraft}
                onChange={e => { draftText.current = e.target.value; setDraft(e.target.value) }} />
            )}
            {dictation.supported && (
              <button className={dictation.listening ? 'mic on' : 'mic'} onMouseDown={e => e.preventDefault()}
                onClick={() => (dictation.listening ? dictation.stop() : dictation.start())}
                title={dictation.listening ? 'Stop listening' : 'Speak a line'} aria-pressed={dictation.listening}>
                {dictation.listening ? 'Stop' : 'Speak'}
              </button>
            )}
            <button className="primary" onMouseDown={e => e.preventDefault()} onClick={commitDraft} title="Add line">Add</button>
          </div>
          {dictation.listening && <p className="lint listening">Listening. Say the line, tap Stop, then press Enter.</p>}
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


// What this list needs, as a row of counts: one per cat or blank for tabbed
// lists, one number otherwise. Nothing red, nothing nagging.
function Needs({ spec, items, tabDef, tab }) {
  const live = (items ?? []).filter(i => !i.deleted)
  if (tabDef) {
    return (
      <div className="needs">
        <span className="needs-label">Needs {spec.goalPerTab} each:</span>
        {tabDef.list.map(t => {
          const n = live.filter(i => i[tabDef.field] === t).length
          return <span key={t} className={n >= spec.goalPerTab ? 'need done' : t === tab ? 'need here' : 'need'}>{tabDef.label(t)} {n}</span>
        })}
      </div>
    )
  }
  const goal = spec.goal ?? 0
  if (!goal) return null
  return <div className="needs"><span className="needs-label">Needs {goal}.</span><span className={live.length >= goal ? 'need done' : 'need'}>{live.length} written</span></div>
}

// Four boxes for one character line.
function CharacterFields({ text, onChange, onKeyDown }) {
  const v = splitCharacter(text)
  const set = (key, val) => onChange({ ...v, [key]: val })
  return (
    <div className="fields">
      {CHARACTER_FIELDS.map(f => (
        <label key={f.key} className="field-row">
          <span>{f.label}</span>
          {f.key === 'persona'
            ? <textarea rows={2} value={v[f.key]} placeholder={f.placeholder} onInput={autoGrow} onKeyDown={onKeyDown}
                onChange={e => set(f.key, e.target.value)} />
            : <input type="text" value={v[f.key]} placeholder={f.placeholder} onKeyDown={onKeyDown}
                onChange={e => set(f.key, e.target.value)} />}
        </label>
      ))}
    </div>
  )
}
