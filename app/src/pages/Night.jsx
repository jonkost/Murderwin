import { useEffect, useRef, useState } from 'react'
import QRCode from 'qrcode'
import { subscribeGame, saveGame } from '../lib/store'

// Game night: the two hosts' names, the square code for the Act 1 slide,
// and how guests join. The night itself is run from the hosts' phones (the
// Host tab), never from here, so nothing on the night needs this page.

const PLAY_URL = 'https://murderwin-at-sirwin-manor.web.app/play/'

const HOSTS = [
  { key: 'host_jonathan', label: 'Who plays Prof. Jonathan Kostington', placeholder: 'Jon' },
  { key: 'host_susan', label: 'Who plays Prof. Susan Kostington', placeholder: 'Susan' },
]

export default function Night() {
  const [game, setGame] = useState(null)
  const [draft, setDraft] = useState({})
  const [status, setStatus] = useState('saved')
  const [qr, setQr] = useState(null)
  const timer = useRef(null)
  const latest = useRef({})

  useEffect(() => subscribeGame(g => { setGame(g); latest.current = g; setDraft(d => ({ ...g, ...d })) }, () => setStatus('error')), [])

  useEffect(() => {
    QRCode.toDataURL(PLAY_URL, { width: 1200, margin: 2, color: { dark: '#1a1614', light: '#f1e8d6' } })
      .then(setQr).catch(() => setQr(null))
  }, [])

  const change = (key, value) => {
    setDraft(d => ({ ...d, [key]: value }))
    setStatus('saving')
    clearTimeout(timer.current)
    timer.current = setTimeout(() => {
      saveGame({ [key]: value }, latest.current)
        .then(() => setStatus('saved'))
        .catch(() => setStatus('error'))
    }, 500)
  }

  if (game === null) return <main className="dash"><p>…</p></main>

  return (
    <main className="dash night">
      {status === 'error' && (
        <div className="banner error" role="alert">SAVE FAILED — check your connection and try again.</div>
      )}

      <section className="panel">
        <h2>The two hosts <span className={`save-dot ${status}`}>{status === 'saved' ? 'saved ✓' : status === 'saving' ? 'saving…' : 'not saved'}</span></h2>
        <p className="why">Type the name each of you will type on your phone. That name gets the Professor and the Host tab. Everyone else types any name and is dealt a character.</p>
        {HOSTS.map(h => (
          <label key={h.key} className="field">
            <span>{h.label}</span>
            <input type="text" maxLength={30} placeholder={h.placeholder} value={draft[h.key] ?? ''}
              onChange={e => change(h.key, e.target.value)} />
          </label>
        ))}
        <p className="hint">Takes effect the next time a night is started from a phone.</p>
      </section>

      <section className="panel">
        <h2>The square code for the Act 1 slide</h2>
        <p className="why">Save the picture and drop it on the slide. Guests scan it, type their name, and get their character.</p>
        <div className="night-join">
          {qr && <img className="qr" src={qr} alt="Square code that opens the game on a phone" />}
          <div>
            {qr && <p className="night-line"><a className="primary dl" href={qr} download="murderwin-join-qr.png">Save the picture</a></p>}
            <p className="night-line">It opens <a href={PLAY_URL} target="_blank" rel="noreferrer">{PLAY_URL}</a></p>
          </div>
        </div>
      </section>

      <section className="panel">
        <h2>On the night</h2>
        <ol className="night-steps">
          <li>On your phone, open the game and tap <b>Host? Start the night</b>. Type your name.</li>
          <li>Your phone gets a <b>Host</b> tab: the doors, the seven acts, Blackout, Power returns, Pause, who is here. Susan’s phone too.</li>
          <li>Guests scan the slide, type their name, and are dealt a character and a bag number.</li>
        </ol>
        <p className="hint">If a phone dies, that person types the same name on any other phone and their character follows.</p>
      </section>
    </main>
  )
}
