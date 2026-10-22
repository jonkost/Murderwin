import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import QRCode from 'qrcode'
import { PLAY_URL } from '../lib/config'
import { DEVICE_ROOMS, deviceUrl } from '../lib/devices'

// The devices, room by room: every screen and machine the night needs, not
// counting anyone's own phone. Each one with an address has Open, Copy and
// a square code (an iPad can scan it), plus how to start it and how to tell
// it is alive. Nothing here changes anything; it only points.

function Address({ url, name }) {
  const [qr, setQr] = useState(null)
  const [show, setShow] = useState(false)
  const [copied, setCopied] = useState(false)
  useEffect(() => {
    if (!show || qr) return
    QRCode.toDataURL(url, { width: 600, margin: 2, color: { dark: '#1a1614', light: '#f1e8d6' } }).then(setQr).catch(() => setQr(null))
  }, [show, qr, url])
  const copy = () => navigator.clipboard?.writeText(url).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000) }).catch(() => {})
  return (
    <div className="dev-address">
      <code className="dev-url">{url}</code>
      <div className="dev-actions">
        <a className="primary dl" href={url} target="_blank" rel="noreferrer">Open</a>
        <button className="ghost" onClick={copy}>{copied ? 'Copied' : 'Copy'}</button>
        <button className="ghost" aria-expanded={show} onClick={() => setShow(s => !s)}>{show ? 'Hide the square code' : 'Square code'}</button>
      </div>
      {show && qr && <img className="qr dev-qr" src={qr} alt={`Square code that opens ${name}`} />}
    </div>
  )
}

function Device({ d }) {
  const url = deviceUrl(PLAY_URL, d)
  return (
    <div className="tl-row dev">
      <h3>{d.name} <span className="tl-plain">· {d.machine}</span></h3>
      <p className="why">{d.what}</p>
      {d.pending && <p className="banner frozen" role="status">{d.pending}</p>}
      {d.note && <p className="hint">{d.note}</p>}
      {url && <Address url={url} name={d.name} />}
      <ol className="night-steps">
        {d.start.map((s, i) => <li key={i}>{s}</li>)}
      </ol>
      {d.alive && <p className="hint"><b>Working when:</b> {d.alive}</p>}
    </div>
  )
}

export default function Devices() {
  return (
    <main className="dash">
      <section className="panel">
        <h2>The devices, room by room</h2>
        <p className="why">
          Every screen and machine the night needs, not counting anyone’s own phone. Open each address on its own device,
          full screen. On an iPad, tap Square code here and scan it with the iPad’s camera.
        </p>
        <p className="hint">The order to switch things on, and what to do when one dies, are in docs/on-the-night.md. The setting-up tasks are on the <Link to="/timeline">Timeline</Link>.</p>
      </section>
      {DEVICE_ROOMS.map(r => (
        <section className="panel tl-section" key={r.key} aria-labelledby={`dev-${r.key}`}>
          <h2 id={`dev-${r.key}`}>{r.room}</h2>
          <p className="why">{r.why}</p>
          {r.devices.map(d => <Device key={d.key} d={d} />)}
        </section>
      ))}
    </main>
  )
}
