import { useEffect, useState } from 'react'
import QRCode from 'qrcode'

// One square code, drawn in the browser from an address: the Host tab's join
// code, the Parlour TV's join and rejoin codes, and each room's cat code
// (25 Oct 2026, the cue list). Nothing here reads a night; the address is the
// whole content. Moved here from screens/Host.jsx so the room screens share it.

export const QR_COLOURS = { dark: '#0f0d0c', light: '#f1e8d6' }

export function useQr(text, width = 360) {
  const [qr, setQr] = useState(null)
  useEffect(() => {
    if (!text) { setQr(null); return }
    QRCode.toDataURL(text, { width, margin: 1, color: QR_COLOURS })
      .then(setQr).catch(() => setQr(null))
  }, [text, width])
  return qr
}
