import { useState } from 'react'
import { useAreaEditor, autoGrow } from '../lib/useAreaEditor'
import { uploadReference } from '../lib/store'
import { GUIDES } from '../lib/content'
import FieldGuide from '../components/FieldGuide'

export default function Stationery() {
  const { items, itemsRef, status, flush, patch } = useAreaEditor('templates')
  const [uploadErr, setUploadErr] = useState(null)
  const [uploading, setUploading] = useState({})

  const upload = async (id, file) => {
    if (!file || uploading[id]) return
    setUploadErr(null)
    setUploading(u => ({ ...u, [id]: true }))
    try {
      const image = await uploadReference(id, file)
      const before = itemsRef.current.find(i => i.id === id)
      patch(id, { images: [...(before.images ?? []), image] }, true)
    } catch (e) {
      setUploadErr(!navigator.onLine
        ? 'Upload failed — you appear to be offline. Notes and checkboxes still queue; images need a connection.'
        : e.code?.startsWith('storage/')
          ? 'Upload failed — image storage isn’t set up on the project yet. The note and checkbox still save.'
          : `Upload failed — ${e.message}`)
    } finally {
      setUploading(u => ({ ...u, [id]: false }))
    }
  }

  if (items === null) return <main className="dash"><p>Loading…</p></main>

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
          Couldn’t load the tracker — check your connection and reload.
        </div>
      )}
      {uploadErr && (
        <div className="banner error" role="alert">
          {uploadErr}
          <button onClick={() => setUploadErr(null)}>Dismiss</button>
        </div>
      )}
      <div className="editor-head">
        <h2>Stationery templates</h2>
        <span className={`save-dot ${status}`}>
          {status === 'saved' ? 'saved ✓' : status === 'saving' ? 'saving…' : 'not saved'}
        </span>
      </div>
      {GUIDES.template ? <FieldGuide guide={GUIDES.template} /> : (
        <p className="hint">
          Seven blank designs. Overlay spec: room for 40–60 words, one emphasis
          word, and a second-ink annotation line. Attach reference images as you
          design; tick the box when a template is party-ready.
        </p>
      )}
      <ul className="items stationery">
        {items.filter(i => !i.deleted).sort((a, b) => a.order - b.order).map(item => (
          <li key={item.id} className={item.done ? 'sitem done' : 'sitem'}>
            <div className="sitem-head">
              <input type="checkbox" className="check" checked={!!item.done}
                onChange={() => patch(item.id, { done: !item.done }, true)} title="Party-ready" />
              <input className="stitle" value={item.text}
                onChange={e => patch(item.id, { text: e.target.value })} />
            </div>
            <textarea rows={2} value={item.notes ?? ''} placeholder="design notes…"
              onInput={autoGrow}
              onChange={e => patch(item.id, { notes: e.target.value })} />
            <div className="thumbs">
              {(item.images ?? []).map(img => (
                <a key={img.path} href={img.url} target="_blank" rel="noreferrer">
                  <img src={img.url} alt={img.name} />
                </a>
              ))}
              <label className={uploading[item.id] ? 'ghost upload busy' : 'ghost upload'}>
                {uploading[item.id] ? 'uploading…' : '+ reference image'}
                <input type="file" accept="image/*" hidden disabled={!!uploading[item.id]}
                  onChange={e => { upload(item.id, e.target.files[0]); e.target.value = '' }} />
              </label>
            </div>
          </li>
        ))}
      </ul>
    </main>
  )
}
