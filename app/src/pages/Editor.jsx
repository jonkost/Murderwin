import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams, useSearchParams, Link } from 'react-router-dom'
import { useAreaEditor, autoGrow } from '../lib/useAreaEditor'
import { AREAS, TAB_KINDS, lintItem, fieldsFor, codecFor, mainFieldKey, goalForTab } from '../lib/content'
import { hasContent } from '../lib/codecs'
import { cardFor } from '../lib/cards'
import ListCard from '../components/ListCard'
import FocusBar from '../components/FocusBar'
import ReviewRow from '../components/ReviewRow'
import PastePanel from '../components/PastePanel'
import GamePreview from '../components/GamePreview'
import Questions from './Questions'
import { useDictation } from '../lib/useDictation'

export default function Editor() {
  const { area } = useParams()
  const spec = AREAS[area]
  if (!spec) return <main className="dash sheet"><p>Unknown list. <Link to="/">Back home</Link></p></main>
  // key by area: a fresh instance per area so stale local state can never
  // be flushed into a different area's document
  if (spec.editor === 'questions') return <Questions key={area} area={area} />
  return <AreaEditor key={area} area={area} />
}

function AreaEditor({ area }) {
  const spec = AREAS[area]
  const fields = fieldsFor(area)
  const codec = codecFor(area)
  const mainKey = mainFieldKey(area)
  const [params, setParams] = useSearchParams()
  const { items, status, flush, applyChange } = useAreaEditor(area)
  const [lastDeleted, setLastDeleted] = useState(null)
  // The fresh line at the bottom. Local until committed, so an abandoned
  // empty draft never becomes a junk item in the database.
  const [draft, setDraft] = useState({})
  const draftRef = useRef({})       // the same values, readable from event handlers
  const inputRefs = useRef([])      // one per field, in order

  const tabDef = spec.tabs ? TAB_KINDS[spec.tabs] : null
  const tabs = tabDef?.list ?? null
  const remembered = tabs ? readMemory(`workshop.tab.${area}`) : null
  const tab = tabs ? (tabs.includes(params.get('tab')) ? params.get('tab') : tabs.includes(remembered) ? remembered : tabs[0]) : null
  useEffect(() => { if (tab) writeMemory(`workshop.tab.${area}`, tab) }, [area, tab])
  const lastFocus = useRef(0)          // which box has the cursor, for Speak
  const loaded = items !== null
  const card = cardFor(area, tab)
  // Focus mode: one list, a small goal, the card still on screen.
  const focusGoal = Number(params.get('focus')) || 0
  const [startCount, setStartCount] = useState(null)

  const draftKey = `workshop.draft.${area}.${tab ?? ''}`
  const setField = (key, value) => {
    const next = { ...draftRef.current, [key]: value }
    draftRef.current = next
    setDraft(next)
    writeMemory(draftKey, JSON.stringify(next))
  }
  // A half-typed line comes back after the tab dies.
  useEffect(() => {
    const saved = readMemory(draftKey)
    let vals = {}
    try { vals = saved ? JSON.parse(saved) : {} } catch { vals = {} }
    draftRef.current = vals
    setDraft(vals)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftKey])

  // Speak a line: the words land in the main box; Enter or Add keeps them.
  // Speech lands in the typing box that had the cursor (never a dropdown),
  // after whatever was already there.
  const spokenBase = useRef('')
  const speechTarget = () => {
    const i = lastFocus.current
    const f = fields[i]
    return f && f.kind !== 'select' ? i : Math.max(0, fields.findIndex(x => x.key === mainKey))
  }
  const dictation = useDictation(
    text => { const key = fields[speechTarget()].key; setField(key, [spokenBase.current.trim(), text].filter(Boolean).join(' ')) },
    () => focusField(speechTarget()),
  )
  const startSpeaking = () => {
    spokenBase.current = draftRef.current[fields[speechTarget()].key] ?? ''
    dictation.start()
  }

  const focusField = (i) => {
    const el = inputRefs.current[i]
    if (el) el.focus()
  }

  // Cursor lands in the first box on load, and again on every tab switch.
  useEffect(() => {
    if (loaded) focusField(0)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, tab])

  const visible = useMemo(() => {
    if (!items) return []
    return items
      .filter(i => !i.deleted)
      .filter(i => !tabDef || i[tabDef.field] === tab)
      .sort((a, b) => b.order - a.order) // newest first: what you just wrote sits under the boxes
  }, [items, tab, tabDef])

  useEffect(() => {
    if (loaded && focusGoal && startCount === null) setStartCount(visible.length)
  }, [loaded, focusGoal, startCount, visible.length])

  if (!loaded) return <main className="dash sheet"><p>Opening the list…</p></main>
  const written = startCount === null ? 0 : Math.max(0, visible.length - startCount)

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

  // Many lines at once, from the paste panel: one save, one history row each.
  const addMany = (parsed) => {
    let order = Math.max(-1, ...items.filter(i => !tabDef || i[tabDef.field] === tab).map(i => i.order))
    const fresh = parsed.map(p => ({
      id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
      text: p.text,
      deleted: false,
      order: ++order,
      ...(spec.checklist ? { done: false } : {}),
      ...(tabDef ? { [tabDef.field]: tab } : {}),
    }))
    if (!fresh.length) return
    applyChange([...items, ...fresh], fresh.map(item => ({ itemId: item.id, before: null, after: item })), true)
  }

  // Enter in the last box (or the Add button) commits the draft as a new
  // line and leaves fresh boxes under the cursor. Reads the ref, not state,
  // so a blur followed by a click on Add can never commit the same text twice.
  const commitDraft = () => {
    const vals = { ...draftRef.current }
    // a dropdown with one allowed choice on this tab picks itself
    for (const f of fields) {
      const allowed = f.kind === 'select' ? (f.onlyForTab?.[tab] ?? null) : null
      if (allowed?.length === 1 && !vals[f.key]) vals[f.key] = allowed[0]
    }
    if (!fields.some(f => f.kind !== 'select' && (vals[f.key] ?? '').trim())) return
    const text = codec.join(vals)
    draftRef.current = {}
    setDraft({})
    writeMemory(draftKey, '')
    for (const el of inputRefs.current) if (el?.tagName === 'TEXTAREA') el.style.height = 'auto'
    if (text.trim()) add(text)
  }

  // Enter moves to the next box; from the last box it saves the line.
  // Shift+Enter still puts a line break inside a box.
  const onDraftKey = (e, i) => {
    if (e.key !== 'Enter' || e.shiftKey) return
    e.preventDefault()
    if (i < fields.length - 1) focusField(i + 1)
    else { commitDraft(); focusField(0) }
  }

  // Enter on an existing line commits it and jumps to the fresh boxes.
  const onLineKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      flush()
      focusField(0)
    }
  }

  const useExample = (example) => {
    // Put the example in the boxes, matched by order, so there is something
    // to edit instead of a blank page.
    const vals = { ...draftRef.current }
    fields.forEach((f, i) => { if (example[i] && !(vals[f.key] ?? '').trim()) vals[f.key] = example[i].text })
    draftRef.current = vals
    setDraft(vals)
    writeMemory(draftKey, JSON.stringify(vals))
    focusField(0)
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

  const draftText = codec.join(draft)
  const draftWarn = spec.checklist || !hasContent(draft) ? null : lintItem(area, draftText)
  const goal = tabDef ? goalForTab(spec, tab) : spec.goal
  const atGoal = goal > 0 && visible.length >= goal

  return (
    <main className="dash sheet">
      {status === 'error' && (
        <div className="banner error" role="alert">
          SAVE FAILED. Your latest edits are not saved.
          <button onClick={flush}>Retry now</button>
        </div>
      )}
      {status === 'loaderror' && (
        <div className="banner error" role="alert">
          Could not load this list. Check your connection and reload.
        </div>
      )}
      <div className="editor-head">
        <h2>{spec.label}</h2>
        <span className={`save-dot ${status}`}>
          {status === 'saved' ? 'saved ✓' : status === 'saving' ? 'saving…' : 'not saved'}
        </span>
      </div>

      {tabs && (
        <nav className="tabs" aria-label="Which one">
          {tabs.map(t => {
            const n = items.filter(i => !i.deleted && i[tabDef.field] === t).length
            const need = goalForTab(spec, t)
            const full = n >= need
            return (
              <button key={t} className={`tab${t === tab ? ' active' : ''}${full ? ' full' : ''}`}
                onClick={() => setParams(p => { const nx = new URLSearchParams(p); nx.set('tab', t); return nx })}>
                {shortTab(spec.tabs, t, tabDef)}<span className="tab-count">{full ? 'full' : `${n} of ${need}`}</span>
              </button>
            )
          })}
        </nav>
      )}

      {!tabs && <Needs spec={spec} items={items} />}
      {tabDef && items.some(i => !i.deleted && !tabs.includes(i[tabDef.field])) && (
        <p className="hint">{items.filter(i => !i.deleted && !tabs.includes(i[tabDef.field])).length} line(s) are filed under a tab this list no longer uses. They are kept, not shown.</p>
      )}

      {focusGoal > 0 && (
        <FocusBar goal={focusGoal} written={written} doneLine={card?.doneLine} />
      )}

      <div className="card-row">
        <ListCard area={area} tab={tab} onUseExample={spec.retired || spec.checklist ? null : useExample} />
        <GamePreview area={area} tab={tab} values={draft} example={exampleValues(fields, card?.example)} />
      </div>
      {!spec.retired && <ReviewRow area={area} />}
      {!spec.retired && !spec.checklist && (
        <PastePanel area={area} fields={fields} codec={codec} shape={pasteShape(fields)} onAdd={addMany} />
      )}

      {visible.length === 0 && card?.emptyState && (
        <p className="empty">{card.emptyState}</p>
      )}

      <ul className="items">
        {!spec.retired && (
          <li className="item draft">
            <p className="draft-label">{visible.length === 0 ? 'Your first one goes here' : atGoal ? 'One more, if you like' : 'A new one goes here'}</p>
            <div className="item-row">
              {spec.checklist && <span className="check-gap" aria-hidden="true" />}
              <span className="reorder" aria-hidden="true" />
              <FieldsForm fields={fields} values={draft} dashed tab={tab}
                refs={inputRefs} onKeyDown={onDraftKey} onFocusField={i => { lastFocus.current = i }}
                onChange={setField} />
              <div className="draft-actions">
                {dictation.supported && (
                  <button className={dictation.listening ? 'mic on' : 'mic'} onMouseDown={e => e.preventDefault()}
                    onClick={() => (dictation.listening ? dictation.stop() : startSpeaking())}
                    title={dictation.listening ? 'Stop listening' : 'Speak the line'} aria-pressed={dictation.listening}>
                    {dictation.listening ? 'Stop' : 'Speak'}
                  </button>
                )}
                <button className="primary" onMouseDown={e => e.preventDefault()} onClick={() => { commitDraft(); focusField(0) }} title="Add this line">Add</button>
              </div>
            </div>
            {dictation.listening && <p className="lint listening">Listening. Say the line, tap Stop, then press Enter.</p>}
            {draftWarn && <p className="lint">⚠ {draftWarn}</p>}
            {fields.length > 1 && <p className="hint keys">Enter moves to the next box. From the last box, Enter adds the line.</p>}
          </li>
        )}
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
                  <button onClick={() => move(item.id, -1)} disabled={idx === 0} title="Move up" aria-label="Move up">▲</button>
                  <button onClick={() => move(item.id, +1)} disabled={idx === visible.length - 1} title="Move down" aria-label="Move down">▼</button>
                </span>
                <SavedRow fields={fields} codec={codec} text={item.text} onKeyDown={onLineKey} tab={tab}
                  onSave={text => edit(item.id, text)} />
                <button className="ghost" onClick={() => softDelete(item.id)} title="Remove (you can undo)" aria-label="Remove this line">✕</button>
              </div>
              {warn && <p className="lint">⚠ {warn}</p>}
            </li>
          )
        })}
      </ul>

      {lastDeleted && (
        <div className="editor-foot">
          <button className="ghost" onClick={undelete}>
            Undo remove: “{(codec.split(lastDeleted.text)[mainKey] ?? lastDeleted.text ?? '').slice(0, 30)}…”
          </button>
        </div>
      )}
    </main>
  )
}

// A saved line being edited. The boxes keep their own text while you type
// (so a space at the end of a box, or a full stop, is never eaten by the
// round trip) and the joined line is saved on every keystroke. A change
// from another device is adopted only when nobody is typing in this row.
function SavedRow({ fields, codec, text, onSave, onKeyDown, tab }) {
  const [vals, setVals] = useState(() => codec.split(text))
  const rowRef = useRef(null)
  const lastText = useRef(text)
  useEffect(() => {
    if (text === lastText.current) return
    lastText.current = text
    if (!rowRef.current?.contains(document.activeElement)) setVals(codec.split(text))
  }, [text, codec])
  const change = (key, val) => {
    const next = { ...vals, [key]: val }
    setVals(next)
    const joined = codec.join(next)
    lastText.current = joined
    onSave(joined)
  }
  const onBlur = (e) => {
    // leaving the row: show the line as it was saved (tidied), not as typed
    if (!rowRef.current?.contains(e.relatedTarget)) setVals(codec.split(lastText.current))
  }
  return (
    <div ref={rowRef} className="saved-row" onBlur={onBlur}>
      <FieldsForm fields={fields} values={vals} onChange={change} onKeyDown={onKeyDown} saved tab={tab} />
    </div>
  )
}

// One box per field. The saved line is split into the boxes and joined back
// on every keystroke, so what is stored never changes shape.
function FieldsForm({ fields, values, onChange, onKeyDown, onFocusField, refs, dashed, saved, tab }) {
  const single = fields.length === 1
  // A saved line's empty box says so; only the new-line boxes carry an example.
  const hint = (f) => (saved ? 'Not written yet' : f.placeholder || '')
  return (
    <div className={dashed ? 'fields dashed' : 'fields'}>
      {fields.map((f, i) => {
        const value = values?.[f.key] ?? ''
        const ref = refs ? el => { refs.current[i] = el } : undefined
        const common = {
          ref, value, 'aria-label': f.label,
          onKeyDown: e => onKeyDown?.(e, i),
          onFocus: () => onFocusField?.(i),
          onChange: e => onChange(f.key, e.target.value),
        }
        let control
        if (f.kind === 'select') {
          const allowed = f.onlyForTab?.[tab]
          const opts = f.options.map(o => (typeof o === 'string' ? { value: o, label: o } : o)).filter(o => !allowed || allowed.includes(o.value))
          control = (
            <select {...common} onKeyDown={e => { if (e.key === 'Enter') onKeyDown?.(e, i) }}>
              <option value="">{f.placeholder || 'Pick one'}…</option>
              {opts.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              {value && !opts.some(o => o.value === value) && <option value={value}>{value}</option>}
            </select>
          )
        } else if (f.kind === 'textarea') {
          control = <textarea {...common} rows={2} placeholder={hint(f) || '…'} onInput={autoGrow} />
        } else {
          control = <input {...common} type="text" placeholder={hint(f)} />
        }
        if (single) return <div key={f.key} className="field-row single">{control}</div>
        return (
          <label key={f.key} className="field-row">
            <span>{f.label}</span>
            {control}
          </label>
        )
      })}
    </div>
  )
}

// What this list needs, as a row of counts: one per cat or blank for tabbed
// lists, one number otherwise. Nothing red, nothing nagging.
function Needs({ spec, items }) {
  const live = (items ?? []).filter(i => !i.deleted)
  const goal = spec.goal ?? 0
  if (!goal) return null
  const full = live.length >= goal
  return <div className="needs"><span className="needs-label">This list needs {goal}.</span><span className={full ? 'need full' : 'need'}>{full ? 'Full' : `${live.length} written, ${goal - live.length} to go`}</span></div>
}

// Short tab names: first names for the cats, the act's name, the blank's name.
function shortTab(kind, t, tabDef) {
  if (kind === 'cats' || kind === 'cats4') return { irwin: 'Irwin', boo: 'Boo', granolia: 'Granolia', zimothy: 'Zimothy', salem: 'Salem' }[t] ?? tabDef.label(t)
  return tabDef.label(t)
}

// The phone's own memory, for the last tab and a half-typed line. Never
// required: when it is unavailable the workshop simply forgets.
function readMemory(key) {
  try { return localStorage.getItem(key) } catch { return null }
}
function writeMemory(key, value) {
  try { if (value === '' || value == null) localStorage.removeItem(key); else localStorage.setItem(key, value) } catch {}
}


// The example's values keyed by box, for the game preview.
function exampleValues(fields, example) {
  const v = {}
  ;(example ?? []).forEach((e, i) => { if (fields[i]) v[fields[i].key] = e.text })
  return v
}

// One line on the paste panel saying what shape a pasted entry takes.
function pasteShape(fields) {
  if (!fields || fields.length <= 1) return 'Each line becomes one entry.'
  const labels = fields.map(f => f.label.split(',')[0].toLowerCase())
  if (fields.length >= 3 && fields[0].key === 'name') return `A line like “Name · ${labels[1]}”, then the rest on the lines under it.`
  return `A line like “${labels[0]}: ${labels.slice(1).join(' ')}”, or the ${labels[0]} on its own line with the words under it.`
}
