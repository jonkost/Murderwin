import { useEffect, useRef, useState } from 'react'

// Speak a line instead of typing it. Uses the browser's own speech
// recognition (Safari on iPhone and Mac, Chrome). Nothing is sent anywhere
// by us; the browser does the listening. `onText` receives the words as they
// settle, `onDone` fires when listening stops.
export function useDictation(onText, onDone) {
  const Rec = typeof window !== 'undefined' ? (window.SpeechRecognition || window.webkitSpeechRecognition) : null
  const [listening, setListening] = useState(false)
  const rec = useRef(null)
  const cbs = useRef({ onText, onDone })
  cbs.current = { onText, onDone }

  useEffect(() => () => { try { rec.current?.abort() } catch {} }, [])

  const start = () => {
    if (!Rec || listening) return
    const r = new Rec()
    r.lang = 'en-US'
    r.continuous = true
    r.interimResults = true
    let finalText = ''
    r.onresult = (e) => {
      let interim = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript
        if (e.results[i].isFinal) finalText += (finalText ? ' ' : '') + t.trim()
        else interim += t
      }
      cbs.current.onText?.(finalText + (interim ? (finalText ? ' ' : '') + interim : ''))
    }
    r.onend = () => { setListening(false); rec.current = null; cbs.current.onDone?.(finalText) }
    r.onerror = () => { setListening(false); rec.current = null }
    rec.current = r
    try { r.start(); setListening(true) } catch { setListening(false) }
  }
  const stop = () => { try { rec.current?.stop() } catch {} }

  return { supported: !!Rec, listening, start, stop }
}
