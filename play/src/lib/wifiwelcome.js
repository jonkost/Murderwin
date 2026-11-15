// The Wi-Fi welcome on a room screen (15 Nov 2026, the party day; Jon: "can I have the ability to advance it
// from the host panel"). The welcome page (made on the brain, media/welcome: the household parading behind a
// card with the Wi-Fi code) holds the house's Wi-Fi password inside its code, so it never goes on the site or
// the server. The setup page keeps the file in this browser alone (localStorage, which no sync carries), and a
// room screen on the same machine shows it whole, with no script, over its own screen while the guests
// arrive. It goes by itself when the intro starts, or sooner from the Host tab (Hide the welcome, which lands
// on the night as `wifiWelcome: { hidden }`: functions/lib/wifiwelcome.js). Nothing of the code is ever read
// here: the page is kept and shown as it came. (Not the phone's Welcome, screens/Welcome.jsx: the four
// getting-started pages.)
//
// Before this, the page was opened beside the room screen in its own tab, which took that screen out of full
// screen; closing it at 4:30 left the game's address showing until the screen was reloaded and clicked.
//
// Pure, so play/test can run it under node --test.

export const WIFI_WELCOME_KEY = 'murderwin.wifiWelcome.page'
export const WIFI_WELCOME_TITLE = '<title>Welcome to Sirwin Manor</title>'
export const WIFI_WELCOME_MAX = 8_000_000 // characters; the page is about 1.4 million

// Never on the Parlour TV: it shows the join code through Act 1, and a guest who cannot see it cannot join.
// A welcome kept on that Mac shows on its own screen beside the TV (?kiosk=decor&room=living) instead.
export const WIFI_WELCOME_NEVER = new Set(['living'])

// Is this text the welcome page? { ok: true }, or { ok: false, why } in plain words for the setup page.
export function wifiWelcomeCheck(text) {
  if (typeof text !== 'string' || !text.length) return { ok: false, why: 'That file is empty. Pick Welcome screen.html.' }
  if (text.length > WIFI_WELCOME_MAX) return { ok: false, why: 'That file is too big to be the welcome screen. Pick Welcome screen.html.' }
  if (!text.includes(WIFI_WELCOME_TITLE) || !text.includes('<svg class="qr"')) return { ok: false, why: 'That is not the welcome screen. Pick Welcome screen.html.' }
  return { ok: true }
}

// Does this room screen show the welcome now? Only with a welcome kept on this machine, never on the Parlour
// TV, only at Arrivals while the night is playing (not paused), and not once the host has hidden it. The
// intro's beat ends it, so it never covers the intro, the rules film or anything after.
export function wifiWelcomeShown(night, { kept = false, which = null } = {}) {
  if (!kept || !night || WIFI_WELCOME_NEVER.has(which)) return false
  if (night.phase !== 'act' || night.act !== 1 || night.beat !== 'arrive') return false
  return night.wifiWelcome?.hidden !== true
}

// The Host tab's row, at Arrivals only: its line, its button and what the button sends.
export function wifiWelcomeButton(night) {
  const hidden = night?.wifiWelcome?.hidden === true
  return {
    line: hidden ? 'The Wi-Fi welcome is hidden.' : 'The Wi-Fi welcome shows until the intro.',
    label: hidden ? 'Show the welcome' : 'Hide the welcome',
    arg: hidden ? 'show' : 'hide',
  }
}

// This browser's own copy. Each one is quiet when the browser will not (a private window, storage refused).
const store = s => s ?? (typeof window === 'undefined' ? null : window.localStorage)
export function readWifiWelcome(storage) {
  try { return store(storage)?.getItem(WIFI_WELCOME_KEY) || null } catch { return null }
}
export function keepWifiWelcome(text, storage) {
  try { store(storage).setItem(WIFI_WELCOME_KEY, text); return readWifiWelcome(storage) === text } catch { return false }
}
export function dropWifiWelcome(storage) {
  try { store(storage)?.removeItem(WIFI_WELCOME_KEY); return true } catch { return false }
}
