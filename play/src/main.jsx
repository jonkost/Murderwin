import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import Preview, { previewScreen } from './Preview'
import ErrorBoundary from './ErrorBoundary'
import Kiosk from './screens/Kiosk'
import PhoneFrame from './PhoneFrame'
import Check from './screens/Check'
import { SalemPractice, PoseCameraPractice, OrangeriePractice } from './screens/Practice'
import BooArcade from './screens/Arcade'
import { practiceParam } from './lib/gametest'
import Setup from './screens/Setup'
import { setupParam } from './lib/setup'
import './styles.css'

const preview = previewScreen()
// A room screen: /play/?kiosk=living | bedroom | study | ipad (the living room's words only) | memory | boo | pose | orangerie (the brain's browser, 25 Oct 2026). Same page, same sign-in, no router.
const kiosk = new URLSearchParams(window.location.search).get('kiosk')
// Miss Boo LaRue's Arcade on its own (28 Oct 2026): /play/?kiosk=boo&play=1, and &visit=1 for a group's visit in
// practice. A page on its own, before the practices and the room screens: no sign-in, no night.
// Plain ?kiosk=boo is the night's Entryway screen (Kiosk.jsx): the same arcade, with the night's group.
const arcade = kiosk === 'boo' && new URLSearchParams(window.location.search).get('play') === '1'
// A phone-shaped frame on a big screen: /play/?phone=1 (testing on a Mac).
const phone = new URLSearchParams(window.location.search).get('phone')
// Does the phone say what the workshop says? /play/?check=1
const check = new URLSearchParams(window.location.search).get('check')
// The workshop's Game test tab: /play/?practice=salem on any phone, /play/?kiosk=orangerie&practice=1
// for Salem's board on the brain's browser (31 Oct 2026), and /play/?kiosk=pose&practice=1 for Boo's
// camera. No night; nothing is paid.
const practice = practiceParam()
const PRACTICE = { salem: SalemPractice, 'pose-wall': PoseCameraPractice, 'orangerie-wall': OrangeriePractice }
const Practicing = practice ? PRACTICE[practice] : null
// The setup page: /setup (firebase.json) or /play/?setup=1. Which screen is this? One tap opens that room (11 Nov 2026).
const setup = setupParam()

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      {setup ? <Setup /> : check ? <Check /> : phone ? <PhoneFrame /> : preview ? <Preview screen={preview} /> : arcade ? <BooArcade /> : Practicing ? <Practicing /> : kiosk ? <Kiosk which={kiosk} /> : <App />}
    </ErrorBoundary>
  </React.StrictMode>,
)
