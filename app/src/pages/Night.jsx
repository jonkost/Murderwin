import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { doc, collection, query, where, orderBy, limit, onSnapshot } from 'firebase/firestore'
import QRCode from 'qrcode'
import { db, hostCommand } from '../firebase'
import characters from '../../../seed/characters.json'

// Jon's table on the night. Every button is labelled by what it does, never
// by content. Nothing on this page can show who the Murderer, the Ghost or
// the victim is — the roles do not exist here yet, and when they do they
// will live in sealed/cases that this page cannot read.

const PLAY_URL = 'https://murderwin-at-sirwin-manor.web.app/play/'

const ACTS = [
  [1, 'Welcome'], [2, 'First investigation'], [3, 'Dinner'], [4, 'Rotation'],
  [5, 'Dessert'], [6, 'The Big Solve'], [7, 'The Reveal'],
]

const PHASE_WORDS = {
  lobby: 'doors open, nothing started',
  act: 'playing',
  blackout: 'BLACKOUT — every phone is dark',
  prompt: 'power is back — phones are showing their prompt',
  paused: 'paused — phones say Sir Irwin requires the garden',
}

function characterName(id) {
  return characters.characters.find(c => c.id === id)?.name ?? id
}

function describe(command, r) {
  switch (command) {
    case 'create': return `Night started. ${r.guests} on the guest list, ${r.lines} lines sent to the phones.`
    case 'publish': return `Sent ${r.lines} lines to the phones.`
    case 'refresh-guests': return `Guest list refreshed: ${r.guests} names.`
    case 'act': return `Act ${r.act} is on.`
    default: return 'Done.'
  }
}

export default function Night() {
  const [active, setActive] = useState(undefined) // undefined = loading
  const [night, setNight] = useState(null)
  const [nights, setNights] = useState([])
  const [presence, setPresence] = useState({})
  const [qr, setQr] = useState(null)
  const [busy, setBusy] = useState(null)
  const [msg, setMsg] = useState(null)
  const [, tick] = useState(0)

  useEffect(() => onSnapshot(doc(db, 'public_state', 'active'),
    s => setActive(s.exists() ? s.data() : null), () => setActive(null)), [])
  const nightId = active?.nightId ?? null

  useEffect(() => {
    if (!nightId) { setNight(null); return }
    return onSnapshot(doc(db, 'nights', nightId), s => setNight(s.exists() ? s.data() : null), () => setNight(null))
  }, [nightId])

  useEffect(() => onSnapshot(query(collection(db, 'nights'), orderBy('createdAt', 'desc'), limit(8)),
    s => setNights(s.docs.map(d => d.data())), () => setNights([])), [])

  useEffect(() => {
    if (!nightId) { setPresence({}); return }
    return onSnapshot(query(collection(db, 'presence'), where('nightId', '==', nightId)), s => {
      const m = {}
      s.forEach(d => { const p = d.data(); if (p.guestKey) m[p.guestKey] = Math.max(m[p.guestKey] ?? 0, p.at?.toMillis?.() ?? 0) })
      setPresence(m)
    }, () => setPresence({}))
  }, [nightId])

  // online dots age out on their own
  useEffect(() => { const id = setInterval(() => tick(n => n + 1), 15000); return () => clearInterval(id) }, [])

  useEffect(() => {
    QRCode.toDataURL(PLAY_URL, { width: 480, margin: 1, color: { dark: '#2a2118', light: '#f4ecdc' } })
      .then(setQr).catch(() => setQr(null))
  }, [])

  const run = async (command, arg, id = nightId) => {
    setBusy(command)
    setMsg(null)
    try {
      const r = await hostCommand({ nightId: id, command, arg })
      setMsg(describe(command, r.data ?? {}))
    } catch (e) {
      setMsg(`That didn’t work: ${e?.message ?? 'no answer from the Manor'}`)
    } finally {
      setBusy(null)
    }
  }

  if (active === undefined) return <main className="dash"><p>…</p></main>

  const roster = night?.roster ?? {}
  const guests = night?.guests ?? []
  const now = Date.now()

  return (
    <main className="dash night">
      {msg && <p className="night-msg" role="status">{msg}</p>}

      <section className="panel">
        <h2>Tonight</h2>
        {night ? (
          <>
            <p className="night-line"><b>{night.label}</b> <span className="hint">· {night.nightId}</span></p>
            <p className="night-line">
              {night.act ? `Act ${night.act} — ${ACTS[night.act - 1]?.[1]}` : 'Before Act 1'} · {PHASE_WORDS[night.phase] ?? night.phase}
            </p>
          </>
        ) : (
          <p className="hint">No night is live. Start one when the guest list is written.</p>
        )}
        <div className="night-buttons">
          <button className="primary" disabled={!!busy} onClick={() => run('create', null)}>
            Start a new night
          </button>
          <span className="hint">Makes a fresh night, deals the characters, and points every phone at it.</span>
        </div>
        {nights.filter(n => n.nightId !== nightId).length > 0 && (
          <details className="night-earlier">
            <summary>Earlier nights</summary>
            <ul>
              {nights.filter(n => n.nightId !== nightId).map(n => (
                <li key={n.nightId}>
                  {n.label} <span className="hint">· {n.nightId}</span>{' '}
                  <button className="ghost" disabled={!!busy} onClick={() => run('activate', null, n.nightId)}>Make this the live night</button>
                </li>
              ))}
            </ul>
          </details>
        )}
      </section>

      {night && (
        <>
          <section className="panel">
            <h2>Joining</h2>
            <div className="night-join">
              {qr && <img className="qr" src={qr} alt="Square code that opens the game on a phone" />}
              <div>
                <p className="night-line">Guests scan this, then tap their own name. Print it, or show it on the iPad.</p>
                <p className="night-line"><a href={PLAY_URL} target="_blank" rel="noreferrer">{PLAY_URL}</a></p>
                <p className="night-line">
                  Doors are <b>{night.joinOpen ? 'open' : 'closed'}</b>.{' '}
                  <button className="ghost" disabled={!!busy} onClick={() => run(night.joinOpen ? 'join-close' : 'join-open')}>
                    {night.joinOpen ? 'Close the doors' : 'Open the doors'}
                  </button>
                </p>
                <p className="night-line">
                  <Link to="/edit/guests">Edit the guest list</Link>{' '}
                  <button className="ghost" disabled={!!busy} onClick={() => run('refresh-guests')}>Refresh names on the phones</button>{' '}
                  <button className="ghost" disabled={!!busy} onClick={() => run('publish')}>Resend rules &amp; bios to the phones</button>
                </p>
              </div>
            </div>
          </section>

          <section className="panel">
            <h2>Who is here</h2>
            {guests.length === 0 && <p className="hint">The guest list is empty. <Link to="/edit/guests">Write it</Link>, then refresh names on the phones.</p>}
            <table className="roster">
              <tbody>
                {guests.map(g => {
                  const r = roster[g.key]
                  const seen = presence[g.key] ?? 0
                  const online = now - seen < 2 * 60 * 1000
                  return (
                    <tr key={g.key}>
                      <td><span className={online ? 'dot on' : 'dot'} title={online ? 'phone is here' : 'phone not seen lately'} /></td>
                      <td>{g.name}{g.host && <span className="hint"> · host</span>}</td>
                      <td>{r ? characterName(r.characterId) : <span className="hint">not joined yet</span>}</td>
                      <td className="hint">{r ? `bag ${r.bag}` : ''}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </section>

          <section className="panel">
            <h2>The acts</h2>
            <div className="night-buttons acts">
              {ACTS.map(([n, name]) => (
                <button key={n} className={night.act === n ? 'tab active' : 'tab'} disabled={!!busy}
                  onClick={() => run('act', n)}>
                  {n}. {name}
                </button>
              ))}
            </div>
            <div className="night-buttons">
              <button className="primary" disabled={!!busy || night.phase === 'blackout'} onClick={() => run('blackout')}>
                Blackout
              </button>
              <button className="primary" disabled={!!busy || night.phase !== 'blackout'} onClick={() => run('power')}>
                Power returns — Act 2 begins
              </button>
              {night.phase === 'paused'
                ? <button className="ghost" disabled={!!busy} onClick={() => run('resume')}>Resume</button>
                : <button className="ghost" disabled={!!busy} onClick={() => run('pause')}>Pause (Irwin needs the garden)</button>}
            </div>
            <p className="hint">
              Phones follow this page. Blackout makes every screen dark; Power returns lights them all at once and holds the prompt for fifteen seconds.
            </p>
          </section>
        </>
      )}
    </main>
  )
}
