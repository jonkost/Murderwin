import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import Preview, { previewScreen } from './Preview'
import ErrorBoundary from './ErrorBoundary'
import Kiosk from './screens/Kiosk'
import PhoneFrame from './PhoneFrame'
import Check from './screens/Check'
import './styles.css'

const preview = previewScreen()
// A room screen: /play/?kiosk=living | bedroom | study | ipad (the living room's words only). Same page, same sign-in, no router.
const kiosk = new URLSearchParams(window.location.search).get('kiosk')
// A phone-shaped frame on a big screen: /play/?phone=1 (testing on a Mac).
const phone = new URLSearchParams(window.location.search).get('phone')
// Does the phone say what the workshop says? /play/?check=1
const check = new URLSearchParams(window.location.search).get('check')

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      {check ? <Check /> : phone ? <PhoneFrame /> : preview ? <Preview screen={preview} /> : kiosk ? <Kiosk which={kiosk} /> : <App />}
    </ErrorBoundary>
  </React.StrictMode>,
)
