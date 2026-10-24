import { useEffect, useRef, useState } from 'react'
import { useFrozen } from '../components/Frozen'
import { stewardApi } from '../lib/stewardApi'
import { routeState, packingRows, NOT_FOR_YOU } from '../lib/steward'

// Jenna's page: the packing list, the cats' leans and the real checks.
// The server decides who gets in (the `steward` callable checks a verified
// email hash); this page only asks. Jon's account is turned away here
// before any call is made and refused by the server if it ever asks.
//
// SEAL RULE. Everything sealed on this page lives in React state while the
// page is open. Nothing is written to localStorage or the Firestore client
// cache; the callable does not go through either.

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
  const [tab, setTab] = useState('bags')

  return (
    <main className="dash steward">
      <section className="panel">
        <h2>The Steward's desk</h2>
        <p>Only your account opens this page. Jon's is refused by the server, so nothing here can reach him. Three things live here: the packing list for the bags, which answer each cat leans toward in the Parlour Games, and the checks on both. Tell Jon only <b>done</b> or <b>needs more</b>, never what you read.</p>
        {frozen.frozen && <p className="hint">The workshop is frozen for the party. The lists are read-only; the cats' leans still save here.</p>}
        <div className="tabs">
          <button className={`tab ${tab === 'bags' ? 'active' : ''}`} onClick={() => setTab('bags')}>The packing list</button>
          <button className={`tab ${tab === 'leans' ? 'active' : ''}`} onClick={() => setTab('leans')}>The cats' leans</button>
          <button className={`tab ${tab === 'checks' ? 'active' : ''}`} onClick={() => setTab('checks')}>The checks</button>
        </div>
      </section>

      {tab === 'bags' && <Packing api={api} />}
      {tab === 'leans' && <Leans api={api} />}
      {tab === 'checks' && <Checks api={api} />}
    </main>
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
      <p className="why">Ten bags, four or five things each: one food, at least one thing to touch, and extras. Pack exactly what is listed; the order inside a bag does not matter. A line that starts with <b>2</b> means two single candies of that kind. Where a line says what it looks like, any one that matches will do (the six balls are each their own). Nobody who is playing may see this page or the packed bags open.</p>
      <p className="hint">Packed {bags.packedAt ? new Date(bags.packedAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : ''}{bags.packedBy ? ` by the ${bags.packedBy}` : ''}.</p>
      {rows.map(b => (
        <div key={b.n} className="bag">
          <h3>Bag {b.n}</h3>
          <ol>
            {b.items.map(it => (
              <li key={it.id}>
                <b>{it.name}</b>{it.looks ? <span> · {it.looks}</span> : null}
                {it.words ? <span className="hint"> ({it.words})</span> : null}
              </li>
            ))}
          </ol>
        </div>
      ))}
    </section>
  )
}

// The real checks (docs/test-plan.md): the server runs them on the packing,
// the leans and the drawing's pictures and sends back each check's ID, its
// plain name, PASS or FIX NEEDED and a count. Jon's Health page has the rest.
function Checks({ api }) {
  const [result, setResult] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const run = () => {
    setBusy(true); setError(null)
    api.call({ op: 'checks' }).then(setResult).catch(e => setError(e?.message ?? 'The checks did not run.')).finally(() => setBusy(false))
  }
  return (
    <section className="panel">
      <h2>The checks</h2>
      <p className="why">These run on the real packing, the cats' leans and the drawing's pictures, which only you may see. Run them after the bags are packed and after any change to the leans. Tell Jon <b>done</b> when every line says PASS, or <b>needs more</b> and the check's ID.</p>
      <button className="primary" onClick={run} disabled={busy}>{busy ? 'Running…' : 'Run the checks'}</button>
      {error && <div className="banner error" role="alert">{error}</div>}
      {result && (
        <>
          <p className={result.allPass ? 'health-clear' : 'health-line bad'}>{result.allPass ? 'All clear.' : 'Something needs fixing.'}</p>
          <ul className="audit">
            {result.results.map(r => (
              <li key={r.id}><b>{r.pass ? 'PASS' : 'FIX NEEDED'}</b> · {r.id} · {r.name}{r.of ? <span className="hint"> ({r.count} of {r.of})</span> : null}</li>
            ))}
          </ul>
        </>
      )}
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
