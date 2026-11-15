import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  WIFI_WELCOME_KEY, WIFI_WELCOME_TITLE, WIFI_WELCOME_MAX, WIFI_WELCOME_NEVER,
  wifiWelcomeCheck, wifiWelcomeShown, wifiWelcomeButton, readWifiWelcome, keepWifiWelcome, dropWifiWelcome,
} from '../src/lib/wifiwelcome.js'

// The Wi-Fi welcome on the screen by the door (15 Nov 2026, Jon: "can I have the ability to advance it from the
// host panel"). The page is kept in that Mac's browser alone; its room screen shows it while the guests arrive,
// never on the Parlour TV, until the intro or the Host tab's Hide the welcome. These tests use a page that is
// only the welcome's outline: never the real page, which holds the house's Wi-Fi code.
const OUTLINE = `<!doctype html><html><head>${WIFI_WELCOME_TITLE}</head><body><svg class="qr" viewBox="0 0 1 1"></svg></body></html>`
const ARRIVE = { phase: 'act', act: 1, beat: 'arrive' }

function fakeStorage({ refuse = false } = {}) {
  const m = new Map()
  return {
    getItem: k => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => { if (refuse) throw new Error('QuotaExceededError'); m.set(k, String(v)) },
    removeItem: k => { m.delete(k) },
    size: () => m.size,
  }
}

test('the welcome shows only at Arrivals, while the night plays, on a machine that keeps it', () => {
  assert.equal(wifiWelcomeShown(ARRIVE, { kept: true, which: 'boo' }), true)
  assert.equal(wifiWelcomeShown(ARRIVE, { kept: true, which: 'decor' }), true, 'a Mac’s second screen too')
  assert.equal(wifiWelcomeShown(ARRIVE, { kept: false, which: 'boo' }), false, 'nothing kept here, nothing shown')
  assert.equal(wifiWelcomeShown(null, { kept: true, which: 'boo' }), false, 'no night: the screen saver, as ever')
  assert.equal(wifiWelcomeShown(ARRIVE, { kept: true, which: 'living' }), false, 'never on the Parlour TV: the join code')
  assert.ok(WIFI_WELCOME_NEVER.has('living'))
  assert.equal(wifiWelcomeShown({ ...ARRIVE, phase: 'paused' }, { kept: true, which: 'boo' }), false, 'a pause shows the pause')
  assert.equal(wifiWelcomeShown({ ...ARRIVE, phase: 'lobby' }, { kept: true, which: 'boo' }), false)
  for (const beat of ['rules', 'meet', 'ready']) {
    assert.equal(wifiWelcomeShown({ ...ARRIVE, beat }, { kept: true, which: 'boo' }), false, `gone from ${beat}: the intro ends it`)
  }
  assert.equal(wifiWelcomeShown({ ...ARRIVE, act: 2 }, { kept: true, which: 'boo' }), false)
  assert.equal(wifiWelcomeShown({ ...ARRIVE, wifiWelcome: { hidden: true } }, { kept: true, which: 'boo' }), false, 'the host hid it')
  assert.equal(wifiWelcomeShown({ ...ARRIVE, wifiWelcome: { hidden: false } }, { kept: true, which: 'boo' }), true, 'and showed it again')
})

test('the Host tab’s row: one line, one button, and what it sends', () => {
  assert.deepEqual(wifiWelcomeButton(ARRIVE), { line: 'The Wi-Fi welcome shows until the intro.', label: 'Hide the welcome', arg: 'hide' })
  assert.deepEqual(wifiWelcomeButton({ ...ARRIVE, wifiWelcome: { hidden: true } }), { line: 'The Wi-Fi welcome is hidden.', label: 'Show the welcome', arg: 'show' })
  assert.equal(wifiWelcomeButton(null).arg, 'hide')
  // the server takes exactly these two words
  const server = readFileSync(new URL('../../functions/lib/wifiwelcome.js', import.meta.url), 'utf8')
  assert.match(server, /WIFI_WELCOME_PICKS = \['hide', 'show'\]/)
  // the Host tab draws the row at Arrivals, and sends the command the server's switch has
  const host = readFileSync(new URL('../src/screens/Host.jsx', import.meta.url), 'utf8')
  assert.match(host, /night\.act === 1 && night\.beat === 'arrive' && <WifiWelcomeRow/)
  assert.match(host, /run\('wifi-welcome', b\.arg\)/)
  const run = readFileSync(new URL('../../functions/lib/run.js', import.meta.url), 'utf8')
  assert.match(run, /case 'wifi-welcome':/)
})

test('the setup page takes only the welcome page', () => {
  assert.equal(wifiWelcomeCheck(OUTLINE).ok, true)
  assert.equal(wifiWelcomeCheck('').ok, false)
  assert.equal(wifiWelcomeCheck(null).ok, false)
  assert.match(wifiWelcomeCheck('<html><title>Other</title></html>').why, /not the welcome screen/)
  assert.match(wifiWelcomeCheck(`${WIFI_WELCOME_TITLE} no code here`).why, /not the welcome screen/, 'the title alone is not enough')
  assert.match(wifiWelcomeCheck(OUTLINE + ' '.repeat(WIFI_WELCOME_MAX)).why, /too big/)
})

test('the page is kept in this browser alone, and quietly when it will not', () => {
  const s = fakeStorage()
  assert.equal(readWifiWelcome(s), null)
  assert.equal(keepWifiWelcome(OUTLINE, s), true)
  assert.equal(readWifiWelcome(s), OUTLINE)
  assert.equal(s.getItem(WIFI_WELCOME_KEY), OUTLINE)
  assert.equal(dropWifiWelcome(s), true)
  assert.equal(readWifiWelcome(s), null)
  assert.equal(s.size(), 0)
  // a full or refused store says no, and never throws into the page
  const full = fakeStorage({ refuse: true })
  assert.equal(keepWifiWelcome(OUTLINE, full), false)
  assert.equal(readWifiWelcome(full), null)
  const broken = { getItem() { throw new Error('SecurityError') }, setItem() { throw new Error('SecurityError') }, removeItem() { throw new Error('SecurityError') } }
  assert.equal(readWifiWelcome(broken), null)
  assert.equal(keepWifiWelcome(OUTLINE, broken), false)
  assert.equal(dropWifiWelcome(broken), false)
})

test('the room screen shows the page whole, with no script, and lets its first click through', () => {
  const jsx = readFileSync(new URL('../src/screens/WifiWelcome.jsx', import.meta.url), 'utf8')
  assert.match(jsx, /sandbox=""/, 'none of the page’s own script runs on the room screen')
  assert.match(jsx, /srcDoc=\{page\}/)
  assert.match(jsx, /memo\(/, 'never drawn again at the screen’s four redraws a second')
  const css = readFileSync(new URL('../src/styles.css', import.meta.url), 'utf8')
  const rule = css.match(/\.kiosk-wifi-welcome \{[^}]*\}/)?.[0] ?? ''
  assert.match(rule, /pointer-events: none/, 'the room screen’s first click still makes it full screen and wakes its sound')
  assert.match(rule, /z-index: 70/)
  const kiosk = readFileSync(new URL('../src/screens/Kiosk.jsx', import.meta.url), 'utf8')
  assert.match(kiosk, /wifiWelcomeShown\(n, \{ kept: !!keptWelcome, which \}\)/)
  assert.match(kiosk, /<IntroCountdown [^>]*\/>\}\n\s*\{welcome && <WifiWelcomeOverlay/, 'drawn after the countdown, which stays mounted and moves the night on')
})
