import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAreaEditor } from '../lib/useAreaEditor'
import { uploadFile } from '../lib/store'
import { AREAS, GUIDES } from '../lib/content'
import FieldGuide from '../components/FieldGuide'

// One tab per checklist area that takes uploads.
const TABS = [
  { id: 'pictures', area: 'art_assets', noun: 'picture', accept: 'image/*' },
  { id: 'sounds', area: 'av_assets', noun: 'sound', accept: 'audio/*' },
]

function newId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

// "boo_portrait-v2.png" → "boo portrait v2"
function nameFromFile(file) {
  return file.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').trim() || file.name
}

function uploadErrorText(e) {
  if (!navigator.onLine) return 'Upload failed — you appear to be offline. Names and ticks still save; files need a connection.'
  if (e.code === 'storage/unauthorized') return 'Upload failed — this account isn’t allowed to upload files.'
  return `Upload failed — ${e.message}`
}

export default function Assets() {
  const [params, setParams] = useSearchParams()
  const tab = TABS.find(t => t.id === params.get('tab')) ?? TABS[0]
  return (
    <main className="dash">
      <nav className="tabs">
        {TABS.map(t => (
          <button key={t.id} className={t.id === tab.id ? 'tab active' : 'tab'}
            onClick={() => setParams({ tab: t.id })}>
            {AREAS[t.area].label}
          </button>
        ))}
      </nav>
      {/* keyed: a fresh editor per area, so nothing pending crosses tabs */}
      <AssetList key={tab.area} area={tab.area} noun={tab.noun} accept={tab.accept} />
    </main>
  )
}

function AssetList({ area, noun, accept }) {
  const spec = AREAS[area]
  const { items, itemsRef, status, flush, applyChange, patch } = useAreaEditor(area)
  const [uploading, setUploading] = useState({}) // itemId → true; 'new' → count
  const [uploadErr, setUploadErr] = useState(null)
  const [lastDeleted, setLastDeleted] = useState(null)
  const [draft, setDraft] = useState('')
  const draftText = useRef('')
  const draftRef = useRef(null)
  const loaded = items !== null

  // Cursor lands in the input on load.
  useEffect(() => { if (loaded) draftRef.current?.focus() }, [loaded])

  if (!loaded) return <p>Loading…</p>

  const visible = items.filter(i => !i.deleted).sort((a, b) => a.order - b.order)
  const done = visible.filter(i => i.done).length
  const nextOrder = () => Math.max(-1, ...itemsRef.current.map(i => i.order)) + 1

  const addItem = (fields) => {
    const item = { id: newId(), text: '', done: false, deleted: false, order: nextOrder(), ...fields }
    applyChange([...itemsRef.current, item], { itemId: item.id, before: null, after: item }, true)
  }

  // Upload first, then create the item, so a failed upload leaves no junk line.
  const uploadNew = async (files) => {
    setUploadErr(null)
    for (const file of files) {
      setUploading(u => ({ ...u, new: (u.new ?? 0) + 1 }))
      try {
        const id = newId()
        const uploaded = await uploadFile(`assets/${area}`, id, file)
        addItem({ id, text: nameFromFile(file), file: uploaded })
      } catch (e) {
        setUploadErr(uploadErrorText(e))
      } finally {
        setUploading(u => ({ ...u, new: u.new - 1 }))
      }
    }
  }

  // The old file stays in storage and in the history; only the link moves.
  const uploadInto = async (id, file) => {
    if (!file || uploading[id]) return
    setUploadErr(null)
    setUploading(u => ({ ...u, [id]: true }))
    try {
      patch(id, { file: await uploadFile(`assets/${area}`, id, file) }, true)
    } catch (e) {
      setUploadErr(uploadErrorText(e))
    } finally {
      setUploading(u => ({ ...u, [id]: false }))
    }
  }

  const commitDraft = () => {
    const text = draftText.current.trim()
    draftText.current = ''
    setDraft('')
    if (text) addItem({ text })
  }

  const softDelete = (item) => {
    setLastDeleted(item)
    patch(item.id, { deleted: true })
  }

  const undelete = () => {
    const id = lastDeleted?.id
    setLastDeleted(null)
    if (id) patch(id, { deleted: false })
  }

  return (
    <>
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
      {uploadErr && (
        <div className="banner error" role="alert">
          {uploadErr}
          <button onClick={() => setUploadErr(null)}>Dismiss</button>
        </div>
      )}
      <div className="editor-head">
        <h2>{spec.label} <span className="count">{done} of {visible.length} done</span></h2>
        <span className={`save-dot ${status}`}>
          {status === 'saved' ? 'saved ✓' : status === 'saving' ? 'saving…' : 'not saved'}
        </span>
      </div>
      <FieldGuide guide={GUIDES[spec.guide]} />

      <label className={uploading.new ? 'primary upload-new busy' : 'primary upload-new'}>
        {uploading.new ? `uploading ${uploading.new}…` : `+ Upload ${noun}s`}
        <input type="file" accept={accept} multiple hidden
          onChange={e => { uploadNew([...e.target.files]); e.target.value = '' }} />
      </label>
      <p className="hint">Each file becomes a new line, named after the file. Rename it any time.</p>

      <ul className="items stationery">
        {visible.map(item => (
          <li key={item.id} className={item.done ? 'sitem done' : 'sitem'}>
            <div className="sitem-head">
              <input type="checkbox" className="check" checked={!!item.done}
                onChange={() => patch(item.id, { done: !item.done }, true)}
                title="Done" aria-label={`${item.text} done`} />
              <input className="stitle" value={item.text} placeholder="name…"
                aria-label="Name"
                onChange={e => patch(item.id, { text: e.target.value })}
                onKeyDown={e => { if (e.key === 'Enter') { flush(); draftRef.current?.focus() } }} />
              <button className="ghost" onClick={() => softDelete(item)} title="Remove (can undo)">✕</button>
            </div>
            <div className="asset-file">
              {item.file && (noun === 'picture'
                ? <a href={item.file.url} target="_blank" rel="noreferrer"><img src={item.file.url} alt={item.text} /></a>
                : <audio controls preload="none" src={item.file.url} />)}
              <label className={uploading[item.id] ? 'ghost upload busy' : 'ghost upload'}>
                {uploading[item.id] ? 'uploading…' : item.file ? 'Replace file' : `+ Add the ${noun}`}
                <input type="file" accept={accept} hidden disabled={!!uploading[item.id]}
                  onChange={e => { uploadInto(item.id, e.target.files[0]); e.target.value = '' }} />
              </label>
            </div>
          </li>
        ))}
        <li className="item draft">
          <div className="item-row">
            <input ref={draftRef} className="draft-name" value={draft}
              placeholder={`Name a ${noun} you still need`}
              aria-label="New name"
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); commitDraft() } }}
              onBlur={commitDraft}
              onChange={e => { draftText.current = e.target.value; setDraft(e.target.value) }} />
            <button className="primary" onMouseDown={e => e.preventDefault()} onClick={commitDraft}>Add</button>
          </div>
        </li>
      </ul>

      {lastDeleted && (
        <div className="editor-foot">
          <button className="ghost" onClick={undelete}>
            Undo remove: “{lastDeleted.text.slice(0, 30)}”
          </button>
        </div>
      )}
    </>
  )
}
