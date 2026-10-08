import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import { callHost } from '../firebase'
import { usePresence, useTick } from '../lib/hooks'
import { ACTS, characterById } from '../lib/content'

// The host's buttons, on the host's own phone. Nothing here needs a Google
// sign-in: the two guests marked "— host:" on the guest list get this tab.
// Every button is labelled by what it does, never by content, and nothing on
// it can show who the Murderer, the Ghost or the victim is.

export const PLAY_URL = 'https://murderwin-at-sirwin-manor.web.app/play/'

const PHASE_WORDS = {
  lobby: 'doors open, nothing started',
  act: 'playing',
  blackout: 'BLACKOUT — every phone is dark',
  prompt: 'power is back — phones are showing their prompt',
  paused: 'paused — Sir Irwin requires the garden',
}

function describe(command, r) {
  switch (command) {
    case 'create': return 'New night started. Type your name again to rejoin it.'
    case 'publish': return `Sent ${r.lines} lines to the phones.`
    case 'act': return `Act ${r.act} is on.`
    default: return 'Done.'
  }
}

export function useQr(text) {
  const [qr, setQr] = useState(null)
  useEffect(() => {
    QRCode.toDataURL(text, { width: 360, margin: 1, color: { dark: '#0f0d0c', light: '#f1e8d6' } })
      .then(setQr).catch(() => setQr(null))
  }, [text])
  return qr
}

export default function Host({ night, content }) {
  const [busy, setBusy] = useState(null)
  const [msg, setMsg] = useState(null)
  const presence = usePresence(night.nightId)
  const qr = useQr(PLAY_URL)
  useTick(15_000) // online dots age out on their own

  const run = async (command, arg) => {
    setBusy(command)
    setMsg(null)
    try {
      const r = await callHost({ nightId: night.nightId, command, arg })
      setMsg(describe(command, r.data ?? {}))
    } catch (e) {
      setMsg(`That didn’t work: ${e?.message ?? 'no answer from the Manor'}`)
    } finally {
      setBusy(null)
    }
  }

  const roster = night.roster ?? {}
  const people = Object.entries(roster).map(([key, r]) => ({ key, ...r })).sort((a, b) => a.name.localeCompare(b.name))
  const hostKeys = new Set(Object.values(night.hosts ?? {}).map(h => h.key))
  const now = Date.now()

  return (
    <div className="host">
      <p className="host-status">
        {night.act ? `Act ${night.act} · ${ACTS[night.act]?.plain}` : 'Before Act 1'} · {PHASE_WORDS[night.phase] ?? night.phase}
        <br />Doors {night.joinOpen ? 'open' : 'closed'} · {people.length} joined
      </p>
      {msg && <p className="host-msg" role="status">{msg}</p>}

      <h3>The acts</h3>
      <div className="host-row">
        {Object.entries(ACTS).map(([n, a]) => (
          <button key={n} className={Number(n) === night.act ? 'chip on' : 'chip'} disabled={!!busy}
            onClick={() => run('act', Number(n))} title={a.name}>
            {n}
          </button>
        ))}
      </div>
      <div className="host-row">
        <button className="big wide" disabled={!!busy || night.phase === 'blackout'} onClick={() => run('blackout')}>Blackout</button>
        <button className="big wide" disabled={!!busy || night.phase !== 'blackout'} onClick={() => run('power')}>Power returns · Act 2</button>
        {night.phase === 'paused'
          ? <button className="chip wide" disabled={!!busy} onClick={() => run('resume')}>Resume</button>
          : <button className="chip wide" disabled={!!busy} onClick={() => run('pause')}>Pause — Irwin needs the garden</button>}
      </div>

      <h3>The doors</h3>
      <div className="host-row">
        <button className="chip wide" disabled={!!busy} onClick={() => run(night.joinOpen ? 'join-close' : 'join-open')}>
          {night.joinOpen ? 'Close the doors' : 'Open the doors'}
        </button>
        <button className="chip wide" disabled={!!busy} onClick={() => run('publish')}>Resend rules &amp; bios</button>
      </div>
      {qr && (
        <figure className="host-qr">
          <img src={qr} alt="Square code that opens the game" />
          <figcaption>Let a guest scan this, then tap their name.</figcaption>
        </figure>
      )}

      <h3>Who is here</h3>
      {people.length === 0 && <p className="gloss">Nobody has typed their name yet.</p>}
      <ul className="here">
        {people.map(r => {
          const online = now - (presence[r.key] ?? 0) < 2 * 60 * 1000
          const character = characterById(content, r.characterId)
          return (
            <li key={r.key}>
              <span className={online ? 'dot on' : 'dot'} aria-label={online ? 'phone is here' : 'phone not seen lately'} />
              <span className="who-name">{r.name}{hostKeys.has(r.key) ? ' · host' : ''}</span>
              <span className="who-char">{(character?.name ?? r.characterId)} · bag {r.bag}</span>
            </li>
          )
        })}
      </ul>

      <h3>A fresh night</h3>
      <p className="gloss">Only for rehearsals or if tonight must start over. It deals new characters to everyone, and every phone must tap its name again.</p>
      <button className="chip wide" disabled={!!busy} onClick={() => run('create')}>Start a new night</button>
    </div>
  )
}

// On the doors screen while nothing is live: the host bootstraps the first
// night from any phone. Once a night is live only host phones may start another.
export function StartNight({ ui }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const start = async () => {
    setBusy(true)
    setError(null)
    try {
      await callHost({ command: 'create' })
    } catch (e) {
      setError(e?.message ?? 'The Manor did not answer.')
      setBusy(false)
    }
  }
  return (
    <div className="start-night">
      <button className="quiet" disabled={busy} onClick={start}>{busy ? 'Starting…' : ui['START NIGHT']}</button>
      {error && <p className="trouble" role="alert">{error}</p>}
    </div>
  )
}
