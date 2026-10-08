import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import QRCode from 'qrcode'

// The night is run from the hosts' own phones (the Host tab), never from
// here: nothing on the play side sits behind a Google sign-in. This page only
// holds the printable square code and the three things to do first.

const PLAY_URL = 'https://murderwin-at-sirwin-manor.web.app/play/'

export default function Night() {
  const [qr, setQr] = useState(null)
  useEffect(() => {
    QRCode.toDataURL(PLAY_URL, { width: 720, margin: 1, color: { dark: '#2a2118', light: '#f4ecdc' } })
      .then(setQr).catch(() => setQr(null))
  }, [])

  return (
    <main className="dash night">
      <section className="panel">
        <h2>The square code</h2>
        <div className="night-join">
          {qr && <img className="qr" src={qr} alt="Square code that opens the game on a phone" />}
          <div>
            <p className="night-line">Print this for the front entrance, or show it on the iPad. Guests scan it, then tap their own name.</p>
            <p className="night-line"><a href={PLAY_URL} target="_blank" rel="noreferrer">{PLAY_URL}</a></p>
          </div>
        </div>
      </section>
      <section className="panel">
        <h2>Running the night</h2>
        <ol className="night-steps">
          <li><Link to="/edit/guests">Write the guest list</Link>. Mark the two of you “— host: Jonathan” and “— host: Susan”.</li>
          <li>On any phone, open the link above and tap <b>Host? Start the night</b>. Then tap your own name.</li>
          <li>Your phone gets a <b>Host</b> tab: the doors, the acts, Blackout, Power returns, Pause, and who is here. Susan’s does too.</li>
        </ol>
        <p className="hint">Nothing on the night needs this workshop or a Google sign-in. Start a fresh night from the Host tab whenever you rehearse.</p>
      </section>
    </main>
  )
}
