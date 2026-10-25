import { useEffect, useState } from 'react'
import { morningCall } from '../lib/morningApi'

// The morning after (card 196, functions/lib/morning.js). Before the party
// this page can only say "not yet" and why: the server refuses everything
// else. After the party night's reveal has played, Jon types OPEN and the
// case that ran is archived and shown here; then he keeps or clears the
// secrets. The page asks for the case only once the server says it is open.
export default function Morning() {
  const [status, setStatus] = useState(null)
  const [view, setView] = useState(null)
  const [word, setWord] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  const refresh = async () => {
    try {
      const st = await morningCall({ op: 'status' })
      setStatus(st)
      if (st.opened) setView((await morningCall({ op: 'read' })).view)
      setErr('')
    } catch (e) { setErr(e?.message || 'That did not work. Try again.') }
  }
  useEffect(() => { refresh() }, [])

  const open = async () => {
    setBusy(true)
    try { await morningCall({ op: 'open', confirm: word }); await refresh() } catch (e) { setErr(e?.message || 'That did not work. Try again.') } finally { setBusy(false) }
  }
  const choose = async (choice) => {
    if (choice === 'clear' && !window.confirm('Clear the secrets? The packing list, the cats’ leans and the drawing pictures leave the sealed lists. Their copies stay in this archive.')) return
    setBusy(true)
    try { await morningCall({ op: 'secrets', choice }); await refresh() } catch (e) { setErr(e?.message || 'That did not work. Try again.') } finally { setBusy(false) }
  }

  return (
    <main className="dash morning">
      <section className="panel">
        <h2>The morning after</h2>
        {err && <div className="banner error" role="alert">{err}</div>}
        {status === null && !err && <p className="hint">Asking…</p>}
        {status && !status.ready && <p className="night-line">Not yet. {status.why}</p>}
        {status?.opened && <p className="why">Opened{status.openedAt ? ` ${new Date(status.openedAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}` : ''}{status.label ? `: ${status.label}` : ''}. Everything below is the party night as it ended, from the archive.</p>}
        {status?.ready && !status.opened && (
          <>
            <p className="why">The party is over. Open the case that ran: who did it, to whom, why, and everything the game kept from you all night. It is copied into an archive first; nothing is moved.</p>
            <label className="field">
              <span>Type OPEN to open the case</span>
              <input type="text" value={word} onChange={e => setWord(e.target.value)} autoComplete="off" />
            </label>
            <p className="night-line"><button className="primary" disabled={busy || word.trim().toUpperCase() !== 'OPEN'} onClick={open}>Open the case</button></p>
          </>
        )}
      </section>
      {view && <CaseView view={view} />}
      {view && (
        <section className="panel">
          <h2>The secrets</h2>
          <p className="why">The packing list, the cats’ leans and the drawing pictures are still sealed. Keep them as they are, or clear them from the sealed lists. Either way the archive keeps a copy.</p>
          {status?.secrets
            ? <p className="night-line">{status.secrets === 'cleared' ? 'Cleared. Their copies are in the archive.' : 'Kept, sealed as they were.'}</p>
            : <p className="night-line">
                <button className="primary" disabled={busy} onClick={() => choose('keep')}>Keep the secrets</button>{' '}
                <button className="ghost" disabled={busy} onClick={() => choose('clear')}>Clear the secrets</button>
              </p>}
        </section>
      )}
    </main>
  )
}

function CaseView({ view }) {
  const a = view.answer ?? {}
  return (
    <>
      <section className="panel">
        <h2>What really happened</h2>
        <ul className="morning-answer">
          <li><span className="list-moment">The Murderer</span> <b>{a.murderer?.name ?? 'Nobody'}</b> {a.murderer?.character ? `(${a.murderer.character})` : ''}</li>
          <li><span className="list-moment">The motive</span> <b>{a.motive ? `${a.motive.n}. ${a.motive.rhyme}` : 'None'}</b> {a.motive?.family ? `(${a.motive.family})` : ''}</li>
          <li><span className="list-moment">The victim, the Ghost</span> <b>{a.victim?.name ?? 'Nobody'}</b> {a.victim?.character ? `(${a.victim.character})` : ''}</li>
        </ul>
        {view.spills > 0 && <p className="hint">Spill the Beans re-rolled the story {view.spills === 1 ? 'once' : `${view.spills} times`}; this is the story as it ended.</p>}
      </section>
      <section className="panel">
        <h2>Everyone</h2>
        <ul className="morning-people">
          {view.people.map(p => (
            <li key={`${p.name}-${p.character}`}>
              <b>{p.name}</b> · {p.character} · {p.role}{p.bag ? ` · bag ${p.bag}` : ''}
              {p.ruledOut?.length > 0 && <><br /><span className="hint">Their cats ruled out: {p.ruledOut.join(' and ')}</span></>}
            </li>
          ))}
        </ul>
        {view.news?.length > 0 && <p className="hint">The first W-O-O-F News bulletin crossed off: {view.news.join(' and ')}.</p>}
      </section>
      <section className="panel">
        <h2>The clarity dial</h2>
        <p className="night-line">It ended at {view.dial.level} of 5. The Ghost’s answers pushed it {view.dial.pushes.ghost} {view.dial.pushes.ghost === 1 ? 'time' : 'times'}, the Murderer’s {view.dial.pushes.murderer}.</p>
      </section>
      <section className="panel">
        <h2>The bags</h2>
        {view.bags.list.length === 0 ? <p className="hint">There was no packing list.</p> : (
          <>
            <p className="night-line">The Murderer held bag {view.bags.murderer ?? '?'}; the Ghost held bag {view.bags.ghost ?? '?'}.</p>
            <ul className="morning-bags">
              {view.bags.list.map(b => <li key={b.n}><b>Bag {b.n}</b>{b.n === view.bags.murderer ? ' (the Murderer’s)' : b.n === view.bags.ghost ? ' (the Ghost’s)' : ''}: {b.items.join(', ')}</li>)}
            </ul>
          </>
        )}
      </section>
      <section className="panel">
        <h2>Sir Irwin Needs a Hand</h2>
        {view.drawing.length === 0 ? <p className="hint">The drawing did not run.</p>
          : <ul className="morning-bags">{view.drawing.map(d => <li key={d.round}><b>Round {d.round}</b>: {d.picture}</li>)}</ul>}
      </section>
    </>
  )
}
