import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import { callHost } from '../firebase'
import { usePresence, useTick } from '../lib/hooks'
import { ACTS, characterById } from '../lib/content'
import { beatsOf, beatSpec, ms, secondsLeft } from '../lib/night'

// The host's buttons, on the host's own phone. Nothing here needs a Google
// sign-in: the two guests marked "— host:" on the guest list get this tab.
// Every button is labelled by what it does, never by content, and nothing on
// it can show who the Murderer, the Ghost or the victim is.

import { PLAY_URL } from '../lib/config'
export { PLAY_URL }

// nights/{id}.caseWarning, set when the case is built at the blackout. Plain words, never content.
const CASE_WARNINGS = {
  'rehearsal-fallback': 'The secret content could not be used tonight, so this night is running on rehearsal text. Run the generator again before the next night.',
  'trace-partner': 'One trace at the party has no look-alike among the guests here. The bedroom clue may come out clearer than planned.',
}

const PHASE_WORDS = {
  lobby: 'doors open, nothing started',
  act: 'playing',
  blackout: 'BLACKOUT, every phone is dark',
  prompt: 'power is back, phones are showing their prompt',
  paused: 'paused, Sir Irwin requires the garden',
}

function describe(command, r) {
  switch (command) {
    case 'create': return 'New night started. Type your name again to rejoin it.'
    case 'publish': return `Sent ${r.lines} lines to the phones.`
    case 'act': return `Act ${r.act} is on.`
    case 'relay-start': return `The drawing has started: ${r.turns} turns.`
    case 'relay-reset': return 'The drawing is cleared.'
    case 'groups': return `${r.groups} groups made${r.trios ? `, ${r.trios} of three` : ''}. The study knows who is first.`
    case 'station-key': return 'Station key saved. Type the same key into station/.env on the study Mac.'
    case 'next': case 'beat': case 'back': return r.act ? `Act ${r.act}: ${beatSpec(r.act, r.beat)?.name ?? r.beat}.${r.dealt != null ? ` Sent to ${r.dealt} phones.` : ''}${r.phones != null ? ` ${r.phones} phones lit.` : ''}` : 'Moved.'
    case 'light-up': return `Parlour Game on ${r.phones} phones. Sixty seconds.`
    case 'settle': return r.settled ? `Picked for ${r.settled} phones that had not chosen.` : 'Everyone had chosen.'
    case 'power': return 'The power is back. Every phone is showing its card.'
    case 'handover': return 'That phone is wiped. The next person to pick it up types their own name; the previous owner taps theirs on any other phone.'
    case 'pause': return 'Paused. Every clock in the house is standing still.'
    case 'resume': return `Resumed. Every clock moved on by ${Math.round((r.shiftMs ?? 0) / 1000)} seconds.`
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

export default function Host({ night, content, serverNow }) {
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
      {night.caseWarning && <p className="host-msg trouble" role="alert">{String(night.caseWarning).split(',').map(k => CASE_WARNINGS[k] ?? k).join(' ')}</p>}

      <RunPanel night={night} busy={busy} run={run} serverNow={serverNow} />

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
          : <button className="chip wide" disabled={!!busy} onClick={() => run('pause')}>Pause, Irwin needs the garden</button>}
      </div>

      <h3>The study (Act 4)</h3>
      <p className="gloss">Makes the pairs and trios and the order they visit the study. Press once, after dinner.</p>
      <div className="host-row">
        <button className="big wide" disabled={!!busy} onClick={() => run('groups')}>Make the groups</button>
      </div>
      <StationKey busy={busy} run={run} />

      <h3>The Big Solve (Act 6)</h3>
      <p className="gloss">Starts the relay drawing on every phone and the living room screen. It tells you nothing.</p>
      <div className="host-row">
        <button className="big wide" disabled={!!busy} onClick={() => run('relay-start')}>Start the drawing</button>
        <button className="chip wide" disabled={!!busy} onClick={() => run('relay-reset')}>Clear the drawing</button>
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
              <button className="chip handover" disabled={!!busy} onClick={() => run('handover', r.key)} title="Wipe this phone so someone else can use it">Hand this phone on</button>
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

// Running the night: one button. The beats come from seed/night.json; the
// server does whatever the next beat needs (deal, light up, group, reveal)
// and says only how many phones it reached. Nothing here can show content.
function RunPanel({ night, busy, run, serverNow }) {
  useTick(1000)
  const beats = beatsOf(night.act)
  const idx = beats.findIndex(b => b.key === night.beat)
  const here = idx >= 0 ? beats[idx] : null
  const after = idx >= 0 && idx + 1 < beats.length ? beats[idx + 1] : null
  const nextAct = night.act >= 1 && night.act < 7 && !after ? ACTS[night.act + 1] : null
  const w = night.window
  const open = w && !w.settled
  const left = open && serverNow ? secondsLeft(w, serverNow) : 0
  const nextLabel = night.phase === 'blackout' ? 'Press Power returns'
    : night.act === 0 ? 'Begin Act 1'
    : after ? `Next: ${after.name}`
    : night.act === 1 ? 'Then: Blackout'
    : nextAct ? `Next: Act ${night.act + 1}, ${nextAct.plain}`
    : 'The night is over'
  const atEnd = (night.act === 1 || night.act === 7) && !after
  const canNext = !busy && night.phase !== 'blackout' && !atEnd && !(open && left > 0)
  return (
    <section className="run">
      <h3>Run the night</h3>
      {here ? (
        <>
          <p className="run-here"><strong>{here.name}</strong></p>
          <p className="gloss run-what">{here.what}</p>
        </>
      ) : <p className="gloss">Nothing has started. Begin when the room is in.</p>}
      {night.act === 7 && night.beat === 'reveal' && night.reveal && serverNow && (
        <p className="host-msg" role="status">
          {(() => { const left = Math.max(0, Math.ceil((ms(night.reveal.at) + 110_000 - serverNow()) / 1000)); return left > 0 ? `The screen is revealing. ${left} seconds to go, then press Next.` : 'The screen has revealed all three. Press Next for everyone’s result.' })()}
        </p>
      )}
      {open && (
        <p className="host-msg" role="status">
          {w.title}: {left > 0 ? `${left} seconds left.` : 'time is up.'}
          {left === 0 && <> <button className="chip" disabled={!!busy} onClick={() => run('settle')}>Pick for the rest</button></>}
        </p>
      )}
      <div className="host-row">
        <button className="big wide" disabled={!canNext} onClick={() => run('next')}>{nextLabel}</button>
      </div>
      <div className="host-row">
        <button className="chip" disabled={!!busy || !here || idx === 0 && night.act <= 2} onClick={() => run('back')}>Back one</button>
        {[2, 4, 6].includes(night.act) && <button className="chip" disabled={!!busy || open} onClick={() => run('light-up')}>Parlour Game now</button>}
      </div>
      {beats.length > 0 && (
        <details className="run-beats">
          <summary className="gloss">All of Act {night.act}'s beats</summary>
          <ol className="beat-list">
            {beats.map((b, i) => (
              <li key={b.key} className={i === idx ? 'on' : i < idx ? 'done' : ''}>
                <button className="beat" disabled={!!busy} onClick={() => run('beat', b.key)}>{b.name}</button>
              </li>
            ))}
          </ol>
        </details>
      )}
    </section>
  )
}

// The key the study Mac must present. Typed once; the same text goes in station/.env.
function StationKey({ busy, run }) {
  const [key, setKey] = useState('')
  return (
    <form className="host-row" onSubmit={e => { e.preventDefault(); if (key.trim()) run('station-key', key.trim()) }}>
      <input className="field" value={key} onChange={e => setKey(e.target.value)} placeholder="Station key, e.g. study-2026" aria-label="Station key" />
      <button className="chip" type="submit" disabled={!!busy || key.trim().length < 4}>Save key</button>
    </form>
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
