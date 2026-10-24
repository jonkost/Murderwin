import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import QRCode from 'qrcode'
import { subscribeGame, saveGame, whoAmI } from '../lib/store'
import { frozenState, freezePatch, unfreezePatch } from '../lib/frozen'

// Game night: the two hosts' names, the square code for the Act 1 slide,
// and how guests join. The night itself is run from the hosts' phones (the
// Host tab), never from here, so nothing on the night needs this page.

import { PLAY_URL } from '../lib/config'

// The four cat rooms for Act 2, Lights Out (docs/solving-the-case.md): one
// printed code per room. A guest the phone has sent there scans it and the
// cat greets them. Keep in step with seed/night.json solving.catRooms.
const CAT_ROOM_CODES = [
  { cat: 'granolia', name: 'Granolia', room: 'the Study' },
  { cat: 'salem', name: 'Salem', room: 'the Orangerie' },
  { cat: 'zimothy', name: 'Zimothy', room: 'the Library' },
  { cat: 'boo', name: 'Boo', room: 'the Entryway' },
]
function meetUrl(base, cat) {
  return `${base}${String(base).includes('?') ? '&' : '?'}meet=${cat}`
}

function RoomCode({ cat, name, room }) {
  const [qr, setQr] = useState(null)
  const url = meetUrl(PLAY_URL, cat)
  useEffect(() => {
    QRCode.toDataURL(url, { width: 1200, margin: 2, color: { dark: '#1a1614', light: '#f1e8d6' } })
      .then(setQr).catch(() => setQr(null))
  }, [url])
  return (
    <div className="night-join">
      {qr && <img className="qr" src={qr} alt={`Square code for ${name} in ${room}`} />}
      <div>
        <p className="night-line"><b>{name}</b>, in {room}</p>
        {qr && <p className="night-line"><a className="primary dl" href={qr} download={`murderwin-room-${cat}.png`}>Save the picture</a></p>}
      </div>
    </div>
  )
}

const HOSTS = [
  { key: 'host_jonathan', label: 'Who plays Prof. Jonathan Kostington', placeholder: 'Jon' },
  { key: 'host_susan', label: 'Who plays Prof. Susan Kostington', placeholder: 'Susan' },
]
const IRWIN_SEATS = [
  { key: 'irwin_favourite', label: "Sir Irwin's Favorite", placeholder: 'Jessa' },
  { key: 'irwin_least', label: "Sir Irwin's Least Favorite", placeholder: 'Jake' },
]

export default function Night() {
  const [game, setGame] = useState(null)
  const [draft, setDraft] = useState({})
  const [status, setStatus] = useState('saved')
  const [qr, setQr] = useState(null)
  const [me, setMe] = useState(null)
  useEffect(() => { whoAmI().then(setMe) }, [])
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
  const frozen = frozenState(game)
  const canFreeze = me?.name === 'Jon' || me?.name === 'Preview'
  const setFrozen = (on) => {
    const patch = on ? freezePatch() : unfreezePatch()
    setStatus('saving')
    saveGame(patch, latest.current).then(() => setStatus('saved')).catch(() => setStatus('error'))
  }

  return (
    <main className="dash night">
      {status === 'error' && (
        <div className="banner error" role="alert">SAVE FAILED. Check your signal and try again.</div>
      )}

      <section className="panel">
        <h2>The devices</h2>
        <p className="why">Every screen and machine for each room, with the address to open on it, how to start it and how to tell it is working. Not the phones.</p>
        <p className="night-line"><Link className="primary dl" to="/devices">Every device, room by room</Link></p>
      </section>

      <section className="panel">
        <h2>Test the study</h2>
        <p className="why">From your phone, standing at the Nanoleaf walls: flash them, teach which hexagon each tap names, and play a practice round. A test never touches a real night.</p>
        <p className="night-line"><Link className="primary dl" to="/study-test">Study test</Link></p>
      </section>

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
        <h2>Sir Irwin's two awards</h2>
        <p className="why">At the end, Sir Irwin's Favorite always goes to Jessa's character and his Least Favorite to Jake's. Type the name each of them will type on their phone. Left empty, the game looks for Jessa and Jake.</p>
        {IRWIN_SEATS.map(h => (
          <label key={h.key} className="field">
            <span>{h.label}</span>
            <input type="text" maxLength={30} placeholder={h.placeholder} value={draft[h.key] ?? ''}
              onChange={e => change(h.key, e.target.value)} />
          </label>
        ))}
      </section>

      <section className="panel">
        <h2>Rehearsal or the real thing</h2>
        <p className="why">Every night you start is a rehearsal unless this box is ticked: the cats’ leans, the bag packing and the drawing pictures stay sealed, and the night uses stand-ins for them. Tick it on the day of the party, before you start the night from your phone. Untick it again afterwards.</p>
        <label className="field check">
          <input type="checkbox" checked={draft.party_night === true} onChange={e => change('party_night', e.target.checked)} />
          <span>This is the party night</span>
        </label>
        <p className="hint">{draft.party_night === true ? 'Ticked: the next night started from a phone uses the sealed content.' : 'Not ticked: the next night started from a phone is a rehearsal.'}</p>
      </section>

      <section className="panel">
        <h2>The freeze</h2>
        <p className="why">The week of the party, freeze the workshop. Every list goes read-only, and the phones keep the words exactly as they are now: nothing typed after this can change a phone mid-night. Unfreeze if something really must change, then freeze again.</p>
        {frozen.frozen
          ? <p className="night-line"><b>Frozen for the party</b> since {frozen.since.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}.</p>
          : <p className="night-line">Not frozen. The lists can be edited and the phones pick up new words.</p>}
        {canFreeze
          ? <p className="night-line">
              {frozen.frozen
                ? <button className="ghost" onClick={() => setFrozen(false)}>Unfreeze the workshop</button>
                : <button className="primary" onClick={() => setFrozen(true)}>Freeze the workshop</button>}
            </p>
          : <p className="hint">Only Jon can freeze or unfreeze.</p>}
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
        <h2>The four cat rooms (Act 2)</h2>
        <p className="why">Print each code and put it up in its room before the party. In Act 2 the phones send guests to the rooms one at a time; a guest scans the code in the room and the cat talks to them on their phone. Nothing goes up in the living room.</p>
        {CAT_ROOM_CODES.map(r => <RoomCode key={r.cat} {...r} />)}
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
