import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import Preview, { previewScreen } from './Preview'
import ErrorBoundary from './ErrorBoundary'
import './styles.css'

const preview = previewScreen()

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      {preview ? <Preview screen={preview} /> : <App />}
    </ErrorBoundary>
  </React.StrictMode>,
)
