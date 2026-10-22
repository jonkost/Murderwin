import { useEffect, useRef, useState } from 'react'
import { useFrozen } from '../components/Frozen'
import { stewardApi } from '../lib/stewardApi'
import { SECTIONS, fieldsOf, setField, shapeWords, routeState, packingRows, NOT_FOR_YOU, SAVE_FAILED } from '../lib/steward'
import { autoGrow } from '../lib/useAreaEditor'

// Jenna's page: the secrets, one set at a time, and the packing list.
// The server decides who gets in (the `steward` callable checks a verified
// email hash); this page only asks. Jon's account is turned away here
// before any call is made and refused by the server if it ever asks.
//
// SEAL RULE. Everything sealed on this page lives in React state while the
// page is open. Nothing is written to localStorage or the Firestore client
// cache; the callable does not go through either.

const REVIEW_WORDS = { done: 'Done', more: 'Needs more', '': 'Not marked yet' }

export default function Steward({ user }) {
  const [whoami, setWhoami] = useState(undefined)
  const api = useRef(null)
  useEffect(() => {
    const state = routeState({ uid: user?.uid, whoami: undefined })
    if (state === 'not-for-you') return
    api.current = stewardApi()
    api.current.call({ op: 'whoami' }).then(r => setWhoami(Boolean(r?.ok))).catch(() => setWhoami(false))
  }, [user?.uid])

  const state = routeState({ uid: user?.uid, whoami })
  if (state === 'not-for-you') return <main className="dash"><section className="panel"><h2>{NOT_FOR_YOU}</h2><p className="why">This page opens for the Steward's account only.</p></section></main>
  if (state === 'checking') return <main className="dash"><p>…</p></main>
  return <StewardDesk api={api.current} />
}

function StewardDesk({ api }) {
  const frozen = useFrozen()
  const [list, setList] = useState(null)
  const [listError, setListError] = useState(null)
  const [code, setCode] = useState(null)
  const [tab, setTab] = useState('sets')

  const reload = () => api.call({ op: 'list' }).then(r => { setList(r); setListError(null) }).catch(e => setListError(e?.message ?? 'Could not load the list.'))
  useEffect(() => { reload() }, [])

  return (
    <main className="dash steward">
      <section className="panel">
        <h2>The Steward's desk</h2>
        <p>Only your account opens this page. Jon's is refused by the server, so nothing here can reach him. Read each set for sense, tone and typos; change a line in place and it saves on its own. Tell Jon only <b>done</b> or <b>needs more</b>, never what you read.</p>
        {frozen.frozen && <p className="hint">The workshop is frozen for the party. The lists are read-only; the secrets still save here, so a typo can still be fixed.</p>}
        <div className="tabs">
          <button className={`tab ${tab === 'sets' ? 'active' : ''}`} onClick={() => setTab('sets')}>The secrets</button>
          <button className={`tab ${tab === 'bags' ? 'active' : ''}`} onClick={() => setTab('bags')}>The packing list</button>
          <button className={`tab ${tab === 'leans' ? 'active' : ''}`} onClick={() => setTab('leans')}>The cats' leans</button>
        </div>
      </section>

      {tab === 'bags' && <Packing api={api} />}
      {tab === 'leans' && <Leans api={api} />}

      {tab === 'sets' && (
        <>
          <section className="panel">
            <h2>The nineteen sets</h2>
            {listError && <div className="banner error" role="alert">{listError}</div>}
            {list === null && !listError && <p>…</p>}
            {list && !list.generated && <p className="why">The secrets have not been made yet. When Jon runs the generator, the sets appear here.</p>}
            {list && list.generated && (
              <>
                <p className="why">Each code is one motive's set. A tick means you have changed something in it. Pick one to read it.</p>
                <div className="codes">
                  {list.codes.map(c => (
                    <button key={c.code} className={`code ${code === c.code ? 'on' : ''} ${c.review ? `review-${c.review}` : ''}`} onClick={() => setCode(c.code)} title={c.complete ? '' : 'This set has a problem; open it to see'}>
                      <span className="code-id">{c.code}</span>
                      <span className="code-marks">{c.edited ? '✓ edited' : ''}{c.review ? ` · ${REVIEW_WORDS[c.review]}` : ''}{c.complete ? '' : ' · problem'}</span>
                    </button>
                  ))}
                </div>
                <p className="hint">{list.codes.filter(c => c.review === 'done').length} of {list.codes.length} marked done, {list.codes.filter(c => c.edited).length} edited.</p>
              </>
            )}
          </section>
          {code && <SetEditor key={code} api={api} code={code} onChanged={reload} />}
        </>
      )}
    </main>
  )
}

function SetEditor({ api, code, onChanged }) {
  const [doc, setDoc] = useState(null)
  const [error, setError] = useState(null)
  const [status, setStatus] = useState('saved')
  const [shape, setShape] = useState(null)
  const [showOriginal, setShowOriginal] = useState(false)
  const timers = useRef({})
  const latest = useRef({})

  useEffect(() => {
    api.call({ op: 'read', code }).then(r => { setDoc(r); setShape(r.shape); latest.current = r.content })
      .catch(e => setError(e?.message ?? 'Could not open this set.'))
  }, [code])

  if (error) return <section className="panel"><div className="banner error" role="alert">{error}</div></section>
  if (!doc) return <section className="panel"><p>…</p></section>

  const change = (path, value) => {
    const next = setField(latest.current, path, value)
    latest.current = next
    setDoc(d => ({ ...d, content: next }))
    setStatus('saving')
    clearTimeout(timers.current[path])
    timers.current[path] = setTimeout(() => {
      api.call({ op: 'write', code, field: path, value })
        .then(r => { setStatus('saved'); setShape(r.shape); setDoc(d => ({ ...d, version: r.version, editedAt: Date.now(), editedBy: 'steward' })); onChanged() })
        .catch(() => setStatus('error'))
    }, 700)
  }
  const mark = (review) => {
    setStatus('saving')
    api.call({ op: 'mark', code, review }).then(() => { setStatus('saved'); setDoc(d => ({ ...d, review })); onChanged() }).catch(() => setStatus('error'))
  }

  const fields = fieldsOf(doc.content)
  const originalFields = doc.original ? Object.fromEntries(fieldsOf(doc.original).map(f => [f.path, f.value])) : null
  const problems = shape && !shape.ok ? shapeWords(shape.fails) : []

  return (
    <section className="panel set">
      {status === 'error' && <div className="banner error" role="alert">{SAVE_FAILED}</div>}
      <h2>Set {code} <span className={`save-dot ${status}`}>{status === 'saved' ? 'saved ✓' : status === 'saving' ? 'saving…' : 'not saved'}</span></h2>
      {doc.motive && <p className="rhyme">The riddle this set serves: <i>{doc.motive.rhyme}</i></p>}
      <p className="why">Every line here is a secret. The cats speak the lines with a greeting before and after, and the game fills each [BLANK] from Jon's pools. Keep the blanks exactly as they are, never use a word from the riddle, and never name a person.</p>
      {problems.length > 0 && (
        <div className="banner frozen" role="status">
          <b>This set would fall back to rehearsal text on the night.</b>
          <ul>{problems.map(p => <li key={p}>{p}</li>)}</ul>
        </div>
      )}
      <p className="review-line">
        <span className="review-label">Your two words:</span>
        <button className={`ghost ${doc.review === 'done' ? 'on' : ''}`} onClick={() => mark(doc.review === 'done' ? '' : 'done')}>Done</button>
        <button className={`ghost ${doc.review === 'more' ? 'on' : ''}`} onClick={() => mark(doc.review === 'more' ? '' : 'more')}>Needs more</button>
        <span className="hint">{REVIEW_WORDS[doc.review ?? '']}{doc.version ? ` · changed ${doc.version} ${doc.version === 1 ? 'time' : 'times'}` : ''}</span>
      </p>
      {doc.original && (
        <p className="hint"><button className="linkish" onClick={() => setShowOriginal(v => !v)}>{showOriginal ? 'Hide' : 'Show'} what the generator wrote</button>, under each line you changed.</p>
      )}
      {SECTIONS.map(s => {
        const mine = fields.filter(f => f.section === s.key)
        if (!mine.length) return null
        return (
          <div key={s.key} className="set-section">
            <h3>{s.label}</h3>
            <p className="hint">{s.hint}</p>
            {mine.map(f => (
              <label key={f.path} className="field">
                <span>{f.label}</span>
                <textarea rows={f.rows} value={f.value} onChange={e => change(f.path, e.target.value)} onInput={autoGrow} />
                {showOriginal && originalFields && originalFields[f.path] !== f.value && <span className="original">Generated: {originalFields[f.path]}</span>}
              </label>
            ))}
          </div>
        )
      })}
    </section>
  )
}

function Packing({ api }) {
  const [bags, setBags] = useState(null)
  const [error, setError] = useState(null)
  useEffect(() => { api.call({ op: 'bags' }).then(setBags).catch(e => setError(e?.message ?? 'Could not load the packing list.')) }, [])
  if (error) return <section className="panel"><div className="banner error" role="alert">{error}</div></section>
  if (!bags) return <section className="panel"><p>…</p></section>
  if (!bags.packed) return <section className="panel"><h2>The packing list</h2><p className="why">The bags have not been packed yet. When Jon runs the packer, the list appears here.</p></section>
  const rows = packingRows(bags)
  return (
    <section className="panel">
      <h2>The packing list</h2>
      <p className="why">Ten bags, six things each. Pack exactly what is listed; the order inside a bag does not matter. A thing marked <b>pack two</b> goes in twice. Nobody who is playing may see this page or the packed bags open.</p>
      <p className="hint">Packed {bags.packedAt ? new Date(bags.packedAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : ''}{bags.packedBy ? ` by the ${bags.packedBy}` : ''}. {bags.stackedPairs} stacked pairs.</p>
      {rows.map(b => (
        <div key={b.n} className="bag">
          <h3>Bag {b.n}</h3>
          <ol>
            {b.items.map(it => <li key={it.id}>{it.name}{it.twice ? <b> (pack two)</b> : ''}<span className="hint"> {it.line.includes('—') ? it.line.slice(it.line.indexOf('—') + 1).trim() : ''}</span></li>)}
          </ol>
        </div>
      ))}
    </section>
  )
}

// The Parlour Games lean table (docs/parlour-games.md). For every question in
// the bank, the answer each cat would pick. The night leans the other way one
// time in four on its own, so pick the answer that fits the cat. Each tap
// saves at once. Sealed: Jon must never see which way a cat leans.
const LEAN_CATS = [
  { key: 'granolia', name: 'Granolia', vibe: 'nerdy' },
  { key: 'boo', name: 'Miss Boo', vibe: 'posh' },
  { key: 'zimothy', name: 'Zimothy', vibe: 'fussy' },
  { key: 'salem', name: 'Salem', vibe: 'grumpy and outdoorsy' },
]

function Leans({ api }) {
  const [table, setTable] = useState(null)
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(null)
  useEffect(() => { api.call({ op: 'leans' }).then(setTable).catch(e => setError(e?.message ?? 'Could not load the leans.')) }, [])
  const choose = async (setId, q, cat, value) => {
    const key = `${setId}-${q}-${cat}`
    setSaving(key); setError(null)
    try {
      await api.call({ op: 'lean', setId, q, cat, value })
      setTable(t => ({
        ...t,
        filled: t.filled + (value ? 1 : 0) - (t.sets.find(s => s.id === setId).questions[q].leans[cat] ? 1 : 0),
        sets: t.sets.map(s => s.id !== setId ? s : { ...s, questions: s.questions.map((x, i) => i !== q ? x : { ...x, leans: { ...x.leans, [cat]: value } }) }),
      }))
    } catch (e) { setError(e?.message ?? 'That did not save. Try again.') }
    setSaving(null)
  }
  if (!table) return <section className="panel">{error ? <div className="banner error" role="alert">{error}</div> : <p>…</p>}</section>
  return (
    <section className="panel leans">
      <h2>The cats' leans</h2>
      <p className="why">During each Parlour Game one cat is secretly listening to each question. For every question, tap the answer each cat would pick: {LEAN_CATS.map((c, i) => <span key={c.key}>{i ? ', ' : ''}{c.name} is {c.vibe}</span>)}. Irwin never listens. The game picks the other answer one time in four by itself, so you only need the one that fits. Each tap saves at once. Jon must never see this page.</p>
      <p className="hint">{table.filled} of {table.of} filled in. A question left blank still works on the night: the game picks for that cat at random.</p>
      {error && <div className="banner error" role="alert">{error}</div>}
      {table.sets.length === 0 && <p className="why">The Parlour Games list in the workshop is empty, so there is nothing to lean on yet.</p>}
      {table.sets.map(set => (
        <div key={set.id} className="lean-set">
          {set.questions.map((x, q) => (
            <div key={q} className="lean-q">
              <h3>{x.q || '(a question with no words yet)'}</h3>
              {LEAN_CATS.map(cat => (
                <div key={cat.key} className="lean-row">
                  <span className="lean-cat">{cat.name}</span>
                  {['a', 'b'].map(k => {
                    const on = x.leans[cat.key] === k
                    return (
                      <button key={k} className={on ? 'lean-pick on' : 'lean-pick'} aria-pressed={on} disabled={saving === `${set.id}-${q}-${cat.key}`}
                        onClick={() => choose(set.id, q, cat.key, on ? '' : k)}>{x[k] || k.toUpperCase()}</button>
                    )
                  })}
                </div>
              ))}
            </div>
          ))}
        </div>
      ))}
    </section>
  )
}
