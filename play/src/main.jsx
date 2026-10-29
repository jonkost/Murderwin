import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import Preview, { previewScreen } from './Preview'
import ErrorBoundary from './ErrorBoundary'
import Kiosk from './screens/Kiosk'
import PhoneFrame from './PhoneFrame'
import Check from './screens/Check'
import { SalemPractice, BooPractice, BooWallPractice, PoseCameraPractice } from './screens/Practice'
import BooArcade from './screens/Arcade'
import { practiceParam } from './lib/gametest'
import './styles.css'

const preview = previewScreen()
// A room screen: /play/?kiosk=living | bedroom | study | ipad (the living room's words only) | memory | boo | pose | orangerie (the brain's browser, 25 Oct 2026). Same page, same sign-in, no router.
const kiosk = new URLSearchParams(window.location.search).get('kiosk')
// Miss Boo LaRue's Arcade (28 Oct 2026): /play/?kiosk=boo&play=1, and &visit=1 for a group's visit in
// practice. A page on its own, before the practices and the room screens: no sign-in, no night.
const arcade = kiosk === 'boo' && new URLSearchParams(window.location.search).get('play') === '1'
// A phone-shaped frame on a big screen: /play/?phone=1 (testing on a Mac).
const phone = new URLSearchParams(window.location.search).get('phone')
// Does the phone say what the workshop says? /play/?check=1
const check = new URLSearchParams(window.location.search).get('check')
// The workshop's Game test tab: /play/?practice=salem | boo on any phone, and
// /play/?kiosk=boo&practice=1 on the wall. No night; nothing is paid.
const practice = practiceParam()
const PRACTICE = { salem: SalemPractice, boo: BooPractice, 'boo-wall': BooWallPractice, 'pose-wall': PoseCameraPractice }
const Practising = practice ? PRACTICE[practice] : null

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      {check ? <Check /> : phone ? <PhoneFrame /> : preview ? <Preview screen={preview} /> : arcade ? <BooArcade /> : Practising ? <Practising /> : kiosk ? <Kiosk which={kiosk} /> : <App />}
    </ErrorBoundary>
  </React.StrictMode>,
)
