import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams, useSearchParams, Link } from 'react-router-dom'
import { subscribeArea, saveArea } from '../lib/store'
import { AREAS, CATS, POOLS, GUIDES } from '../lib/content'

const DEBOUNCE_MS = 400

export default function Editor() {
  const { area } = useParams()
  const spec = AREAS[area]
  const [params, setParams] = useSearchParams()

  const tabs = spec?.tabs === 'cats' ? CATS.map(c => c.key)
    : spec?.tabs === 'pools' ? POOLS : null
  const tab = tabs ? (params.get('tab') ?? tabs[0]) : null

  const [items, setItems] = useState(null)
  const [status, setStatus] = useState('saved') // saved | saving | error
  const [lastDeleted, setLastDeleted] = useState(null)
  const itemsRef = useRef(null)
  const pendingChanges = useRef([])
  const timer = useRef(null)
  const dirty = useRef(false)

  useEffect(() => {
    if (!spec) return
    return subscribeArea(area, remote => {
      // don't clobber local edits mid-typing; single-user app
      if (!dirty.current) {
        itemsRef.current = remote
        setItems(remote)
      }
    }, e => setStatus('error'))
  }, [area])

  const flush = () => {
    clearTimeout(timer.current)
    const changes = pendingChanges.current
    if (!changes.length) return
    pendingChanges.current = []
    setStatus('saving')
    saveArea(area, itemsRef.current, changes)
      .then(() => { dirty.current = false; setStatus('saved') })
      .catch(() => {
        pendingChanges.current = [...changes, ...pendingChanges.current]
        setStatus('error')
      })
  }

  const applyChange = (next, change) => {
    itemsRef.current = next
    setItems(next)
    dirty.current = true
    pendingChanges.current.push(change)
    clearTimeout(timer.current)
    timer.current = setTimeout(flush, DEBOUNCE_MS)
  }

  const visible = useMemo(() => {
    if (!items) return []
    return items
      .filter(i => !i.deleted)
      .filter(i => !tab || i.cat === tab || i.pool === tab)
      .sort((a, b) => a.order - b.order)
  }, [items, tab])

  if (!spec) return <main className="dash"><p>Unknown area. <Link to="/">Back</Link></p></main>
  if (items === null) return <main className="dash"><p>Loading…</p></main>

  const guideKey = spec.tabs === 'pools' ? tab : spec.guide
  const guide = guideKey ? GUIDES[guideKey] : null

  const edit = (id, text) => {
    const before = items.find(i => i.id === id)
    const next = items.map(i => (i.id === id ? { ...i, text } : i))
    applyChange(next, { itemId: id, before, after: { ...before, text } })
  }

  const add = () => {
    const maxOrder = Math.max(-1, ...items.filter(i => !tab || i.cat === tab || i.pool === tab).map(i => i.order))
    const item = {
      id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
      text: '',
      deleted: false,
      order: maxOrder + 1,
      ...(spec.tabs === 'cats' ? { cat: tab } : {}),
      ...(spec.tabs === 'pools' ? { pool: tab } : {}),
    }
    applyChange([...items, item], { itemId: item.id, before: null, after: item })
  }

  const softDelete = (id) => {
    const before = items.find(i => i.id === id)
    const next = items.map(i => (i.id === id ? { ...i, deleted: true } : i))
    setLastDeleted(before)
    applyChange(next, { itemId: id, before, after: { ...before, deleted: true } })
  }

  const undelete = () => {
    if (!lastDeleted) return
    const before = items.find(i => i.id === lastDeleted.id)
    const next = items.map(i => (i.id === lastDeleted.id ? { ...i, deleted: false } : i))
    setLastDeleted(null)
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
    applyChange(next, { itemId: a.id, before: a, after: { ...a, order: b.order } })
  }

  return (
    <main className="dash">
      {status === 'error' && (
        <div className="banner error" role="alert">
          SAVE FAILED — your latest edits are NOT saved.
          <button onClick={flush}>Retry now</button>
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
              {spec.tabs === 'cats' ? CATS.find(c => c.key === t).name : t}
            </button>
          ))}
        </nav>
      )}

      {guide && (
        <div className="guide">
          <p><b>{guide.what}</b></p>
          <p>Test: <i>{guide.test}</i></p>
          <p className="hint">e.g. {guide.examples.map(e => `“${e}”`).join(' · ')}</p>
        </div>
      )}

      <ul className="items">
        {visible.map((item, idx) => (
          <li key={item.id} className="item">
            <span className="reorder">
              <button onClick={() => move(item.id, -1)} disabled={idx === 0} title="Move up">▲</button>
              <button onClick={() => move(item.id, +1)} disabled={idx === visible.length - 1} title="Move down">▼</button>
            </span>
            <textarea rows={1} value={item.text} placeholder="…"
              onChange={e => edit(item.id, e.target.value)} />
            <button className="ghost" onClick={() => softDelete(item.id)} title="Delete (soft)">✕</button>
          </li>
        ))}
      </ul>

      <div className="editor-foot">
        <button className="primary" onClick={add}>+ Add line</button>
        {lastDeleted && (
          <button className="ghost" onClick={undelete}>
            Undo delete: “{lastDeleted.text.slice(0, 30)}…”
          </button>
        )}
      </div>
    </main>
  )
}
