import { useEffect, useState } from 'react'
import Viewfinder from './Viewfinder'
import './scan.css'

// The Now card's one button (Scan Salem's code) opens the same viewfinder: it
// asks by a window event, so the card needs to know nothing about this button.
// With no button on the page (a held card, the end) nothing happens, and the
// card's own "Cannot scan?" still works.
export const SCAN_OPEN = 'scan-open'
export function openScanner() {
  try { window.dispatchEvent(new Event(SCAN_OPEN)) } catch { /* no page */ }
}

// The camera inside the app (handoff 11 Nov 2026, A12): a small round button,
// top right, on every tab. A tap opens the full-screen viewfinder, and only
// then does the browser ask for the camera (never at sign-in). The printed
// codes and the phone's own camera work as before. App.jsx mounts it in one
// line, over the tabs only: never over a Parlour Game, the vote's hold, the
// drawing, the blackout or a pause, and taking it away stops the camera.
export default function ScanButton({ nightId, onNote = () => {} }) {
  const [open, setOpen] = useState(false)
  useEffect(() => {
    const on = () => setOpen(true)
    window.addEventListener(SCAN_OPEN, on)
    return () => window.removeEventListener(SCAN_OPEN, on)
  }, [])
  return (
    <>
      <button type="button" className="scan-button" aria-label="Scan a code" onClick={() => setOpen(true)}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/></svg>
      </button>
      {open && <Viewfinder nightId={nightId} onNote={onNote} onClose={() => setOpen(false)} />}
    </>
  )
}
