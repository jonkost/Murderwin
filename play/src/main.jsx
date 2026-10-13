import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import Preview, { previewScreen } from './Preview'
import ErrorBoundary from './ErrorBoundary'
import Kiosk from './screens/Kiosk'
import './styles.css'

const preview = previewScreen()
// A room screen: /play/?kiosk=living | bedroom. Same page, same sign-in, no router.
const kiosk = new URLSearchParams(window.location.search).get('kiosk')

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      {preview ? <Preview screen={preview} /> : kiosk ? <Kiosk which={kiosk} /> : <App />}
    </ErrorBoundary>
  </React.StrictMode>,
)
