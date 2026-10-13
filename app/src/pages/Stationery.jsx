import { useState } from 'react'
import { useAreaEditor, autoGrow } from '../lib/useAreaEditor'
import { uploadReference } from '../lib/store'
import ListCard from '../components/ListCard'
import ReviewRow from '../components/ReviewRow'

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
        ? 'Upload failed: you appear to be offline. Notes and ticks still queue; images need a connection.'
        : e.code?.startsWith('storage/')
          ? 'Upload failed: picture storage is not set up yet. The note and tick still save.'
          : `Upload failed: ${e.message}`)
    } finally {
      setUploading(u => ({ ...u, [id]: false }))
    }
  }

  if (items === null) return <main className="dash sheet"><p>Loading…</p></main>

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
          The tracker did not load. Check your signal and reload.
        </div>
      )}
      {uploadErr && (
        <div className="banner error" role="alert">
          {uploadErr}
          <button onClick={() => setUploadErr(null)}>Dismiss</button>
        </div>
      )}
      <div className="editor-head">
        <h2>Stationery designs</h2>
        <span className={`save-dot ${status}`}>
          {status === 'saved' ? 'saved ✓' : status === 'saving' ? 'saving…' : 'not saved'}
        </span>
      </div>
      <ListCard area="templates" tab={null} />
      <ReviewRow area="templates" />
      <ul className="items stationery">
        {items.filter(i => !i.deleted).sort((a, b) => a.order - b.order).map(item => (
          <li key={item.id} className={item.done ? 'sitem done' : 'sitem'}>
            <div className="sitem-head">
              <input type="checkbox" className="check" checked={!!item.done}
                onChange={() => patch(item.id, { done: !item.done }, true)} title="Ready for the party" />
              <input className="stitle" value={item.text}
                onChange={e => patch(item.id, { text: e.target.value })} />
            </div>
            <textarea rows={2} value={item.notes ?? ''} placeholder="Notes on the design…"
              onInput={autoGrow}
              onChange={e => patch(item.id, { notes: e.target.value })} />
            <div className="thumbs">
              {(item.images ?? []).map(img => (
                <a key={img.path} href={img.url} target="_blank" rel="noreferrer">
                  <img src={img.url} alt={img.name} />
                </a>
              ))}
              <label className={uploading[item.id] ? 'ghost upload busy' : 'ghost upload'}>
                {uploading[item.id] ? 'uploading…' : '+ Add a reference picture'}
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
