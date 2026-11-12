import { useState } from 'react'
import { SETUP_ROOMS, SETUP_SPARES, SETUP_EXTRAS, SECOND_DISPLAY, SECOND_DISPLAY_ROOMS, SETUP_LAST_KEY, setupHref } from '../lib/setup'

// The setup page (lib/setup.js): which screen is this? One tap opens that
// room's screen. The last room this machine opened is marked, so on the party
// night the same tap is easy to find. No sign-in, no night, nothing written
// but this browser's own note of its last choice.
const BASE = import.meta.env.BASE_URL
function lastChoice() { try { return window.localStorage.getItem(SETUP_LAST_KEY) } catch { return null } }

export default function Setup() {
  const [last] = useState(lastChoice)
  const go = (room, target = room) => {
    try { window.localStorage.setItem(SETUP_LAST_KEY, room.key) } catch { /* the page opens anyway */ }
    window.location.assign(setupHref(BASE, target))
  }
  return (
    <main className="setup">
      <h1>Which screen is this?</h1>
      <p className="setup-sub">Tap this machine’s room. That tap turns its sound on. Then click once on the page to make it full screen.</p>
      <ul className="setup-list">
        {SETUP_ROOMS.map(r => (
          <li key={r.key} className={r.key === last ? 'setup-room last' : 'setup-room'}>
            <button type="button" className="setup-go" onClick={() => go(r)}>
              <span className="setup-name">{r.room}</span>
              <span className="setup-machine">{r.machine}</span>
              <span className="setup-when">{r.when}{r.key === last ? ' · This machine last time' : ''}</span>
            </button>
            {r.first && (
              <div className="setup-first">
                <button type="button" onClick={() => go(r, r.first)}>{r.first.label}</button>
                <p>{r.first.note}</p>
              </div>
            )}
          </li>
        ))}
      </ul>
      <details className="setup-spares">
        <summary>Another device for the iPad’s jobs</summary>
        <ul className="setup-list">
          {SETUP_SPARES.map(r => (
            <li key={r.key} className="setup-room">
              <button type="button" className="setup-go" onClick={() => go(r)}>
                <span className="setup-name">{r.room}</span>
                <span className="setup-machine">{r.machine}</span>
                <span className="setup-when">{r.when}</span>
              </button>
            </li>
          ))}
        </ul>
      </details>
      <ul className="setup-list">
        {SECOND_DISPLAY_ROOMS.map(r => (
          <li key={r.key} className="setup-room">
            <button type="button" className="setup-go" onClick={() => window.location.assign(setupHref(BASE, r))}>
              <span className="setup-name">{r.room}</span>
              <span className="setup-machine">{r.machine}</span>
              <span className="setup-when">{r.when}</span>
            </button>
          </li>
        ))}
        <li className="setup-room">
          <button type="button" className="setup-go" onClick={() => window.location.assign(setupHref(BASE, SECOND_DISPLAY))}>
            <span className="setup-name">{SECOND_DISPLAY.room}</span>
            <span className="setup-machine">{SECOND_DISPLAY.machine}</span>
            <span className="setup-when">{SECOND_DISPLAY.when}</span>
          </button>
        </li>
      </ul>
      <ul className="setup-extras">
        {SETUP_EXTRAS.map(x => <li key={x.key}><a href={`${BASE}${x.path}`} target="_blank" rel="noreferrer">{x.label}</a> <span>{x.note}</span></li>)}
      </ul>
      <p className="setup-sub">To come back here, press Back, or type this address again.</p>
    </main>
  )
}
