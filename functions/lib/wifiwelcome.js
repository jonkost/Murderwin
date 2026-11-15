// The Wi-Fi welcome on the screen by the door (15 Nov 2026, Jon: "can I have the ability to advance it from the
// host panel"). The welcome page itself, with the house's Wi-Fi code, never reaches the server: it is kept only
// in the door Mac's own browser (its setup page), and that Mac's room screen shows it over itself while the guests
// arrive (Act 1's Arrivals) and takes it down by itself when the intro starts (play/src/lib/wifiwelcome.js).
// This is the Host tab's Hide the welcome, and Show the welcome to bring it back: one field on the night doc,
// `wifiWelcome: { hidden, at }`, which every room screen already reads. It moves no beat, clock or light, so a
// pause does not hold it. Nothing here is sealed: it says whether a screen shows a page, never what is on it.
import { NightError } from './night.js'

export const WIFI_WELCOME_PICKS = ['hide', 'show']

export async function setWifiWelcome(db, nightId, arg, { now = Date.now() } = {}) {
  const pick = String(arg ?? '').trim().toLowerCase()
  if (!WIFI_WELCOME_PICKS.includes(pick)) throw new NightError('invalid', 'The Wi-Fi welcome is hide or show.')
  const hidden = pick === 'hide'
  await db.doc(`nights/${nightId}`).update({ wifiWelcome: { hidden, at: new Date(now) } })
  return { ok: true, hidden }
}
