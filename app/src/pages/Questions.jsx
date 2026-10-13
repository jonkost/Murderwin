import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAreaEditor } from '../lib/useAreaEditor'
import { AREAS, CASE_WORDS } from '../lib/content'
import { cardFor } from '../lib/cards'
import {
  emptyBeats, normalizeBeats, pathTotals, pathCount, lintScenario, isComplete, hasAnyText, titleOf,
  clampValue, fmtValue, choicesOf, CHOICE_KEYS, CHOICE_LABELS, MAX_CHOICES, MIN_CHOICES, VALUE_MIN, VALUE_MAX,
} from '../lib/scenarios'
import ListCard from '../components/ListCard'
import FocusBar from '../components/FocusBar'
import ReviewRow from '../components/ReviewRow'

// The push and pull questions. One scenario is three questions in a row,
// two choices each (a third or fourth when a question needs one), points on
// each choice. Whatever a guest picks, the next question is the same. Stored
// as item.beats (three maps), with item.text mirroring the first question so
// lists and history can name it.

// The boxes of a set, in typing order: question, then each choice's words
// and points. Enter walks this list.
function boxOrder(beats) {
  const ids = []
  normalizeBeats(beats).forEach((b, i) => {
    ids.push(`${i}:q`)
    for (const k of choicesOf(b)) ids.push(`${i}:${k}`, `${i}:${k}v`)
  })
  return ids
}

export default function Questions({ area }) {
  const spec = AREAS[area]
  const card = cardFor(area, null)
  const [params] = useSearchParams()
  const { items, status, flush, applyChange, patch } = useAreaEditor(area)
  const [draft, setDraft] = useState(emptyBeats())
  const draftRef = useRef(draft)
  const refs = useRef(new Map())
  const [lastDeleted, setLastDeleted] = useState(null)
  const [draftGen, setDraftGen] = useState(0)
  const focusGoal = Number(params.get('focus')) || 0
  const [startCount, setStartCount] = useState(null)
  const loaded = items !== null

  const visible = useMemo(() => (items ?? []).filter(i => !i.deleted).sort((a, b) => b.order - a.order), [items]) // newest first
  const complete = visible.filter(i => isComplete(i.beats)).length

  const focusBox = (id) => refs.current.get(id)?.focus()
  useEffect(() => { if (loaded) focusBox('0:q') }, [loaded])
  useEffect(() => {
    if (loaded && focusGoal && startCount === null) setStartCount(complete)
  }, [loaded, focusGoal, startCount, complete])

  const DRAFT_KEY = `workshop.draft.${area}`
  const setDraftBeats = (beats) => {
    draftRef.current = beats
    setDraft(beats)
    try { hasAnyText(beats) ? localStorage.setItem(DRAFT_KEY, JSON.stringify(beats)) : localStorage.removeItem(DRAFT_KEY) } catch {}
  }
  // A half-written set comes back after the tab dies. (Every hook sits
  // above the early return below, so the hook order never changes.)
  useEffect(() => {
    try {
      const saved = localStorage.getItem(DRAFT_KEY)
      if (saved) { const beats = normalizeBeats(JSON.parse(saved)); draftRef.current = beats; setDraft(beats) }
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (!loaded) return <main className="dash"><p>Opening the list…</p></main>
  const written = startCount === null ? 0 : Math.max(0, complete - startCount)

  const commitDraft = () => {
    const beats = normalizeBeats(draftRef.current)
    if (!hasAnyText(beats)) return
    const maxOrder = Math.max(-1, ...(items ?? []).map(i => i.order))
    const item = {
      id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
      text: titleOf(beats),
      beats,
      deleted: false,
      order: maxOrder + 1,
    }
    applyChange([...items, item], { itemId: item.id, before: null, after: item })
    setDraftBeats(emptyBeats())
    setDraftGen(g => g + 1)
    focusBox('0:q')
  }

  const editItem = (id, beats) => {
    patch(id, { beats: normalizeBeats(beats), text: titleOf(beats) })
  }

  const softDelete = (id) => {
    const before = items.find(i => i.id === id)
    setLastDeleted(before)
    patch(id, { deleted: true })
  }
  const undelete = () => {
    const before = lastDeleted && items.find(i => i.id === lastDeleted.id)
    setLastDeleted(null)
    if (before) patch(before.id, { deleted: false })
  }

  // Enter moves to the next box; from the very last box it saves the set.
  const onDraftKey = (e, id) => {
    if (e.key !== 'Enter' || e.shiftKey) return
    e.preventDefault()
    const order = boxOrder(draftRef.current)
    const next = order[order.indexOf(id) + 1]
    if (next) focusBox(next)
    else commitDraft()
  }
  const onLineKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); flush(); focusBox('0:q') }
  }

  const useExample = () => {
    setDraftBeats([
      { q: 'Do you care which way your toilet paper sits?', n: 2, a: 'Yes', av: 5, b: 'No', bv: 0 },
      { q: 'Which way?', n: 2, a: 'Over', av: 5, b: 'Under', bv: -1 },
      { q: 'Do you fix it when you see it wrong?', n: 2, a: 'Yes', av: -1, b: 'No', bv: -1 },
    ])
    focusBox('0:q')
  }

  const draftWarn = hasAnyText(draft) ? lintScenario(draft, CASE_WORDS) : null
  const goal = spec.goal ?? 0

  return (
    <main className="dash">
      {status === 'error' && (
        <div className="banner error" role="alert">
          SAVE FAILED. Your latest edits are not saved.
          <button onClick={flush}>Retry now</button>
        </div>
      )}
      {status === 'loaderror' && (
        <div className="banner error" role="alert">Could not load this list. Check your connection and reload.</div>
      )}
      <div className="editor-head">
        <h2>{spec.label}</h2>
        <span className={`save-dot ${status}`}>{status === 'saved' ? 'saved ✓' : status === 'saving' ? 'saving…' : 'not saved'}</span>
      </div>

      {goal > 0 && (
        <div className="needs">
          <span className="needs-label">Needs {goal}.</span>
          <span className={complete >= goal ? 'need full' : 'need'}>{complete >= goal ? 'Full' : `${complete} written`}</span>
          {visible.length > complete && <span className="need">{visible.length - complete} half done</span>}
        </div>
      )}

      {focusGoal > 0 && <FocusBar goal={focusGoal} written={written} doneLine={card?.doneLine} />}

      <ListCard area={area} tab={null} onUseExample={useExample} />
      <ReviewRow area={area} />

      {visible.length === 0 && <p className="empty">{card?.emptyState}</p>}

      <ol className="scenarios">
        <li className="scenario draft">
          <ScenarioForm key={draftGen} number={visible.length + 1} beats={draft} refs={refs} dashed
            label={visible.length === 0 ? 'Your first set goes here' : 'A new set goes here'}
            onKeyDown={onDraftKey} onChange={setDraftBeats} />
          {draftWarn && <p className="lint">⚠ {draftWarn}</p>}
          <div className="scenario-foot">
            <p className="hint keys">Enter moves to the next box. From the last box, Enter saves the set.</p>
            <button className="primary" onMouseDown={e => e.preventDefault()} onClick={commitDraft}>Save this set</button>
          </div>
        </li>
        {visible.map((item, idx) => (
          <li key={item.id} className="scenario">
            <ScenarioForm number={visible.length - idx} beats={normalizeBeats(item.beats)} onKeyDown={onLineKey}
              onChange={beats => editItem(item.id, beats)}
              onRemove={() => softDelete(item.id)} />
          </li>
        ))}
      </ol>

      {lastDeleted && (
        <div className="editor-foot">
          <button className="ghost" onClick={undelete}>Undo remove: “{(lastDeleted.text ?? '').slice(0, 30)}…”</button>
        </div>
      )}
    </main>
  )
}

// One scenario: three questions, each with its choices and points, then the
// ways through and a phone preview.
function ScenarioForm({ number, beats, onChange, onKeyDown, onRemove, refs, dashed, label }) {
  const set = (i, key, value) => {
    const next = beats.map((b, j) => (j === i ? { ...b, [key]: value } : b))
    onChange(next)
  }
  // Add a choice: the next letter appears with empty words and 0 points.
  const addChoice = (i) => {
    const b = beats[i]
    const n = Math.min(MAX_CHOICES, choicesOf(b).length + 1)
    const k = CHOICE_KEYS[n - 1]
    onChange(beats.map((x, j) => (j === i ? { ...x, n, [k]: x[k] ?? '', [`${k}v`]: x[`${k}v`] ?? 0 } : x)))
  }
  // Remove the last extra choice (its words go with it; undo by adding again).
  const dropChoice = (i) => {
    const b = beats[i]
    const keys = choicesOf(b)
    if (keys.length <= MIN_CHOICES) return
    const k = keys[keys.length - 1]
    const { [k]: _w, [`${k}v`]: _v, ...rest } = b
    onChange(beats.map((x, j) => (j === i ? { ...rest, n: keys.length - 1 } : x)))
  }
  const refAt = (id) => refs ? (el => { if (el) refs.current.set(id, el); else refs.current.delete(id) }) : undefined
  const warn = !dashed && hasAnyText(beats) ? lintScenario(beats, CASE_WORDS) : null
  const title = titleOf(beats)
  const placeholders = ['Do you care which way your toilet paper sits?', 'Which way?', 'Do you fix it when you see it wrong?']
  return (
    <div className={dashed ? 'scenario-card dashed' : 'scenario-card'}>
      <div className="scenario-head">
        <span className="scenario-num">{label ?? `Set ${number}`}</span>
        {title && !dashed && <span className="scenario-title">{title}</span>}
        {onRemove && <button className="ghost" onClick={onRemove} title="Remove (you can undo)" aria-label="Remove this set">✕</button>}
      </div>
      {beats.map((b, i) => {
        const keys = choicesOf(b)
        return (
          <div className="beat" key={i}>
            <label className="field-row">
              <span>Question {i + 1}{i > 0 ? ' (asked whatever they picked)' : ''}</span>
              <input ref={refAt(`${i}:q`)} type="text" value={b.q} placeholder={placeholders[i]}
                onKeyDown={e => onKeyDown?.(e, `${i}:q`)} onChange={e => set(i, 'q', e.target.value)} />
            </label>
            <div className={keys.length > 2 ? 'choices many' : 'choices'}>
              {keys.map((k, ci) => (
                <Choice key={k} tag={CHOICE_LABELS[k]} text={b[k] ?? ''} value={b[`${k}v`] ?? 0}
                  placeholder={['Yes', 'No', 'Depends', 'Never'][ci]}
                  refText={refAt(`${i}:${k}`)} refValue={refAt(`${i}:${k}v`)}
                  onKeyText={e => onKeyDown?.(e, `${i}:${k}`)} onKeyValue={e => onKeyDown?.(e, `${i}:${k}v`)}
                  onText={v => set(i, k, v)} onValue={v => set(i, `${k}v`, v)}
                  onDrop={ci === keys.length - 1 && keys.length > MIN_CHOICES ? () => dropChoice(i) : null} />
              ))}
            </div>
            {keys.length < MAX_CHOICES && (
              <button className="linkish" onMouseDown={e => e.preventDefault()} onClick={() => addChoice(i)}>
                + Add another choice{keys.length === 2 ? ' (a third button, if this question needs one)' : ''}
              </button>
            )}
          </div>
        )
      })}
      {warn && <p className="lint">⚠ {warn}</p>}
      <PathTotals beats={beats} />
      <details className="preview-wrap">
        <summary>See it the way a guest will</summary>
        <PhonePreview beats={beats} />
      </details>
    </div>
  )
}

function Choice({ tag, text, value, placeholder, refText, refValue, onText, onValue, onKeyText, onKeyValue, onDrop }) {
  const v = clampValue(value)
  // The points box keeps what is typed (a lone minus on the way to -5) and
  // follows the stored number otherwise.
  const [raw, setRaw] = useState(String(v))
  useEffect(() => { setRaw(String(v)) }, [v])
  const step = (d) => { const n = clampValue(v + d); setRaw(String(n)); onValue(n) }
  const typed = (e) => {
    const t = e.target.value
    setRaw(t)
    if (t === '' || t === '-') return
    const n = Number(t)
    if (Number.isFinite(n)) onValue(clampValue(n))
  }
  return (
    <div className="choice">
      <label className="field-row">
        <span>{tag}{onDrop && <button className="linkish drop" onMouseDown={e => e.preventDefault()} onClick={onDrop} aria-label={`Remove ${tag}`}>remove</button>}</span>
        <input ref={refText} type="text" value={text} placeholder={placeholder} onKeyDown={onKeyText} onChange={e => onText(e.target.value)} />
      </label>
      <div className="value" role="group" aria-label={`Points for ${tag}`}>
        <span className="value-tag">Points</span>
        <button type="button" onMouseDown={e => e.preventDefault()} onClick={() => step(-1)} disabled={v <= VALUE_MIN} aria-label="One less">−</button>
        <input ref={refValue} type="text" inputMode="text" pattern="-?[0-9]*" value={raw}
          onBlur={() => setRaw(String(v))}
          onKeyDown={onKeyValue} onChange={typed} aria-label={`Points for ${tag}`} />
        <button type="button" onMouseDown={e => e.preventDefault()} onClick={() => step(1)} disabled={v >= VALUE_MAX} aria-label="One more">+</button>
      </div>
    </div>
  )
}

// Every way through, and what each adds up to. With more than sixteen ways
// only the range shows, so the card stays short.
function PathTotals({ beats }) {
  const paths = pathTotals(beats)
  const count = pathCount(beats)
  const totals = paths.map(p => p.total)
  const lo = Math.min(...totals)
  const hi = Math.max(...totals)
  return (
    <div className="paths">
      <span className="paths-label">
        {count === 8 ? 'The eight ways through, and what each adds up to' : `The ${count} ways through add up to between ${fmtValue(lo)} and ${fmtValue(hi)}`}
      </span>
      {count <= 16 && (
        <ul>
          {paths.map((p, i) => (
            <li key={i} className={p.total > 0 ? 'path pos' : p.total < 0 ? 'path neg' : 'path'}>
              <span className="path-picks">{p.picks.join(' · ')}</span>
              <b className="path-total">{fmtValue(p.total)}</b>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

// What a guest sees: one question at a time, a button per choice, then
// thanks. Numbers never show on a phone.
function PhonePreview({ beats }) {
  const [step, setStep] = useState(0)
  const [picks, setPicks] = useState([])
  const bs = normalizeBeats(beats)
  const reset = () => { setStep(0); setPicks([]) }
  const pick = (k) => { setPicks([...picks, k]); setStep(step + 1) }
  return (
    <div className="phone">
      <div className="phone-screen">
        {step < 3 ? (
          <>
            <p className="phone-count">{step + 1} of 3</p>
            <p className="phone-q">{bs[step].q.trim() || `Question ${step + 1}`}</p>
            <div className="phone-buttons">
              {choicesOf(bs[step]).map(k => (
                <button key={k} onClick={() => pick(k)}>{bs[step][k].trim() || CHOICE_LABELS[k]}</button>
              ))}
            </div>
          </>
        ) : (
          <>
            <p className="phone-q">Noted. The Manor keeps its own counsel.</p>
            <p className="phone-count">You picked: {picks.map((k, i) => (bs[i][k]?.trim() || CHOICE_LABELS[k])).join(', ')}</p>
            <div className="phone-buttons"><button onClick={reset}>Try it again</button></div>
          </>
        )}
      </div>
    </div>
  )
}
