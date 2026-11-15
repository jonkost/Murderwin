import { memo, useEffect, useState } from 'react'
import { WIFI_WELCOME_KEY, readWifiWelcome, keepWifiWelcome, dropWifiWelcome, wifiWelcomeCheck } from '../lib/wifiwelcome'

// The Wi-Fi welcome on a room screen (lib/wifiwelcome.js, 15 Nov 2026). Not the phone's Welcome (Welcome.jsx).

// The page kept in this browser, read once, and again whenever the setup page in another tab adds or takes it
// off (the browser's storage event), so a room screen left open picks it up with no reload.
export function useKeptWifiWelcome() {
  const [page, setPage] = useState(() => readWifiWelcome())
  useEffect(() => {
    const on = (e) => { if (e.key === WIFI_WELCOME_KEY || e.key === null) setPage(readWifiWelcome()) }
    window.addEventListener('storage', on)
    return () => window.removeEventListener('storage', on)
  }, [])
  return page
}

// Over the whole room screen, the welcome page as it came: in a frame that runs none of its script (sandbox),
// takes no click or key (so the room screen's own first click still makes it full screen and wakes its sound),
// and is never drawn again while the screen redraws four times a second (memo, and the same page each time).
export const WifiWelcomeOverlay = memo(function WifiWelcomeOverlay({ page }) {
  return <iframe className="kiosk-wifi-welcome" title="Welcome to Sirwin Manor" srcDoc={page} sandbox="" tabIndex={-1} aria-hidden="true" />
})

// The setup page's part: add the welcome to this machine, or take it off.
export function SetupWifiWelcome() {
  const [kept, setKept] = useState(() => !!readWifiWelcome())
  const [msg, setMsg] = useState(null)
  const pick = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    let text = ''
    try { text = await file.text() } catch { setMsg('That file would not open. Pick Welcome screen.html again.'); return }
    const ok = wifiWelcomeCheck(text)
    if (!ok.ok) { setMsg(ok.why); return }
    if (!keepWifiWelcome(text)) { setMsg('This browser would not keep it. Try again in Google Chrome, not a private window.'); return }
    setKept(true)
    setMsg('Added. This Mac’s room screen shows it while the guests arrive.')
  }
  const drop = () => {
    dropWifiWelcome()
    setKept(!!readWifiWelcome())
    setMsg('Taken off this Mac.')
  }
  return (
    <section className="setup-wifi-welcome">
      <h2>The Wi-Fi welcome</h2>
      <p className="setup-sub">For the screen by the front door. Pick <i>Welcome screen.html</i> from the Murderwin screens folder: this Mac’s room screen shows it while the guests arrive, until the intro or <b>Hide the welcome</b> on the Host tab. It stays on this Mac. Never on the Parlour TV, which shows the join code.</p>
      {kept
        ? <p className="setup-wifi-welcome-on">This Mac shows the welcome while the guests arrive. <button type="button" className="setup-wifi-welcome-off" onClick={drop}>Take it off this Mac</button></p>
        : <label className="setup-go setup-wifi-welcome-add"><span className="setup-name">Add the welcome</span><span className="setup-machine">Pick Welcome screen.html</span><input type="file" accept=".html,text/html" onChange={pick} /></label>}
      {msg && <p className="setup-sub" role="status">{msg}</p>}
    </section>
  )
}
