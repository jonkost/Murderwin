import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import QRCode from 'qrcode'
import { subscribeGame, saveGame, whoAmI, subscribeReplay } from '../lib/store'
import { replayView, cleanSeed } from '../lib/replay'
import { frozenState, freezePatch, unfreezePatch } from '../lib/frozen'

// Game night: the two hosts' names, the square code for the Act 1 slide,
// and how guests join. The night itself is run from the hosts' phones (the
// Host tab), never from here, so nothing on the night needs this page.

import { PLAY_URL } from '../lib/config'

// The four cat rooms (docs/solving-the-case.md): one printed code per room,
// the same code for Act 2's cat visits and Act 4's game rooms. A guest the
// phone has sent there scans it and the cat greets them. Keep in step with
// seed/night.json solving.catRooms.
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

// Replay a rehearsal by its seed word (card 324, functions/lib/seed.js).
// Every rehearsal is dealt from a word; typing one here makes the next night
// started from a phone deal that rehearsal again. Used once. Never on the
// party night. It has its own box, not the page's draft, so it empties
// when the server uses the word.
function Replay({ game, onSave }) {
  const [replay, setReplay] = useState(null)
  const [word, setWord] = useState(game.replay_seed ?? '')
  useEffect(() => subscribeReplay(setReplay, () => setReplay(null)), [])
  useEffect(() => { setWord(game.replay_seed ?? '') }, [game.replay_seed])
  const v = replayView({ replay, game })
  const save = (text) => onSave({ replay_seed: cleanSeed(text) })
  return (
    <section className="panel">
      <h2>Play a rehearsal again</h2>
      <p className="why">Every rehearsal is dealt from a seed word. Type one here and the next night you start from a phone deals that rehearsal again: the same roles, motive, cat hints, Parlour Game times, Act 4 groups and drawing, and the same characters for the same people joining in the same order. For when a run went wrong and you want to see it again.</p>
      <label className="field">
        <span>Seed word for the next rehearsal</span>
        <input type="text" maxLength={40} placeholder="tulip-4471" value={v.party ? '' : word} disabled={v.party}
          onChange={e => setWord(e.target.value)} onBlur={() => save(word)} onKeyDown={e => { if (e.key === 'Enter') save(word) }} />
      </label>
      <p className="hint">{v.status}{v.waiting && !v.party ? ' Used once: the box empties when that night starts.' : ''}</p>
      {!v.party && v.waiting && <p className="night-line"><button className="ghost" onClick={() => { setWord(''); save('') }}>Clear the word</button></p>}
      {v.recent.length > 0 && (
        <>
          <p className="why">The last rehearsals, newest first.</p>
          <ul className="replay-recent">
            {v.recent.map(r => (
              <li key={`${r.seed}-${r.at}`}>
                <b>{r.seed}</b>{r.at ? ` · ${new Date(r.at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}` : ''}{r.label ? ` · ${r.label}` : ''}{r.note ? ` (${r.note})` : ''}
                {!v.party && <> <button className="ghost" onClick={() => { setWord(r.seed); save(r.seed) }}>Play it again</button></>}
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  )
}

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
        <h2>Try the games</h2>
        <p className="why">Every game in Acts 4 and 6, and the Parlour Games, to try before the night on the device it runs on. A test never touches the party night.</p>
        <p className="night-line"><Link className="primary dl" to="/game-test">Game test</Link></p>
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
        <p className="why">Every night you start is a rehearsal unless this box is ticked: the cats’ leans, the bag packing and the drawing pictures stay sealed, and where a secret would show, a rehearsal shows a note in square brackets instead. Tick it on the day of the party, before you start the night from your phone. Untick it again afterwards.</p>
        <label className="field check">
          <input type="checkbox" checked={draft.party_night === true} onChange={e => change('party_night', e.target.checked)} />
          <span>This is the party night</span>
        </label>
        <p className="hint">{draft.party_night === true ? 'Ticked: the next night started from a phone uses the sealed content.' : 'Not ticked: the next night started from a phone is a rehearsal.'}</p>
      </section>

      <Replay game={game} onSave={patch => { setStatus('saving'); saveGame(patch, latest.current).then(() => setStatus('saved')).catch(() => setStatus('error')) }} />

      <section className="panel">
        <h2>The bulletin videos</h2>
        <p className="why">Bulletin 1 and the closing bulletin are video on the Parlour TV (decided 23 October). Until this box is ticked, the brain plays your recordings and the TV shows the words, so a night never goes silent. Tick it after Claude Code has put the videos in and put them live.</p>
        <label className="field check">
          <input type="checkbox" checked={draft.bulletinVideo === true} onChange={e => change('bulletinVideo', e.target.checked)} />
          <span>The bulletins are videos</span>
        </label>
      </section>

      <section className="panel">
        <h2>Freeze the workshop</h2>
        <p className="why">There is no fixed date: press it when the lists are final, Thursday 12 to Saturday 14 November, after the second tech run. Every list goes read-only, and the phones keep the words exactly as they are now: nothing typed after this can change a phone mid-night. Unfreeze if something really must change, then freeze again.</p>
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
        <h2>The four room codes (Acts 2 and 4)</h2>
        <p className="why">Print each code and put it up in its room before the party. In Act 2 the phones send guests to the rooms one at a time; a guest scans the code in the room and the cat talks to them on their phone. In Act 4 each group scans the same code to start that room’s game. None goes up in the Parlour.</p>
        {CAT_ROOM_CODES.map(r => <RoomCode key={r.cat} {...r} />)}
      </section>

      <section className="panel">
        <h2>After the party</h2>
        <p className="why">The morning after, open the case that ran: who did it, to whom, why, and everything the game kept from you. It stays shut until the party night’s reveal has played, on the party day or later.</p>
        <p className="night-line"><Link className="ghost dl" to="/morning">The morning after</Link></p>
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
