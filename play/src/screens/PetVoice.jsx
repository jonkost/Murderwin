import { Component, useEffect, useMemo, useRef, useState } from 'react'
import { petVoiceUrl, irwinSpeech, speechFresh, SPEECH_LEAD_MS, PET_SHORT } from '../lib/petvoice'
import { hasVoice, sayVoices, stopVoice, takeArmedVoice } from '../lib/voicekit'

// The pets' voices on the page (12 Nov 2026, Jon: "Can we get voices reading
// for the pets"; lib/petvoice.js says which file goes with which words, and
// lib/voicekit.js plays it).
//
//   HearIt        on a cat's card on a phone: a small button that reads the
//                 cat's lines aloud in its own voice, when the guest presses
//                 it. A card with no voice has no button. (Built and switched
//                 off, lib/petvoice.js CATS_SPEAK_BY_THEMSELVES: at a cat's
//                 door, on the phone that has just scanned that cat's code,
//                 the card can also speak once by itself. Never in a group,
//                 at supper, on a phone the house moved on without a scan,
//                 or twice.)
//   StudyVoice    on the Study's screen: Granolia says her one line each time
//                 it changes (15 Nov 2026, Jon: "Please build the VOs for the
//                 study lines"). A line with no file is silent.
//   IrwinSpeech   on the Parlour TV: Sir Irwin says his dessert speech as it
//                 comes up, once. A TV reloaded later stays quiet.
//
// A voice is never allowed to cost a clue: both sit inside Quiet, which shows
// nothing if anything in them breaks, and nothing here waits on a sound.

const BASE = import.meta.env.BASE_URL

// Whatever goes wrong inside, the card around it is untouched.
export class Quiet extends Component {
  constructor(props) { super(props); this.state = { broken: false } }
  static getDerivedStateFromError() { return { broken: true } }
  componentDidCatch() { /* a voice that broke is a voice that stays silent */ }
  render() { return this.state.broken ? null : this.props.children }
}

// Has this phone already said this card by itself? (Kept for the tab's life,
// so a card that comes back on screen is not read out again.)
const saidKey = id => `pet-voice-said:${id}`
function alreadySaid(id) {
  try { return !id || globalThis.sessionStorage?.getItem(saidKey(id)) === '1' } catch { return true }
}
function markSaid(id) {
  try { if (id) globalThis.sessionStorage?.setItem(saidKey(id), '1') } catch { /* a phone that keeps nothing: it may speak again */ }
}

function HearItInner({ who, lines, cardId = null, auto = false }) {
  const urls = useMemo(() => (lines ?? []).map(l => petVoiceUrl(who, l, BASE)).filter(Boolean), [who, (lines ?? []).join('\n')])
  const [found, setFound] = useState(false)
  // this card's own mark on a voice it starts. A voice goes on to its end when its card leaves the screen
  // (15 Nov 2026, Jon: "make the voice overs on the phone play if you go to a different part of the app":
  // a tab change or the news coming up cut it off). The next Hear press takes its place
  const me = useRef({})
  useEffect(() => {
    let live = true
    setFound(false)
    if (!urls.length) return undefined
    hasVoice(urls).then(yes => {
      if (!live || !yes) return
      setFound(true)
      // alone with the cat, at its door: it speaks once, by itself, when the page's sound is awake. Only on
      // the phone that has just scanned this cat's code (lib/voicekit.js armVoice): a card that came any
      // other way waits for the button
      if (auto && !alreadySaid(cardId) && takeArmedVoice(who)) sayVoices(urls, { owner: me.current }).then(seconds => { if (seconds > 0) markSaid(cardId) })
    })
    return () => { live = false }
  }, [urls.join('|'), auto, cardId])
  if (!found) return null
  return (
    <button type="button" className="chip hear-it" onClick={() => { markSaid(cardId); sayVoices(urls, { wake: true, owner: me.current }) }}>
      <span aria-hidden="true">🔊</span> Hear {PET_SHORT[who] ?? 'it'}
    </button>
  )
}

export function HearIt(props) {
  return <Quiet><HearItInner {...props} /></Quiet>
}

function IrwinSpeechInner({ screen, serverNow = null }) {
  const at = typeof screen?.at?.toMillis === 'function' ? screen.at.toMillis() : Number(screen?.at) || 0
  const lines = irwinSpeech(screen)
  const key = `${at}|${lines.join('\n')}`
  // once for each time the speech comes up (its own moment on the server's clock, and its words)
  useEffect(() => {
    if (!at || !lines.length) return undefined
    const now = serverNow ? serverNow() : Date.now()
    if (!speechFresh(at, now)) return undefined
    const urls = lines.map(l => petVoiceUrl('irwin', l, BASE)).filter(Boolean)
    // after the chime that opens the beat; the files are fetched meanwhile
    hasVoice(urls)
    const timer = setTimeout(() => { sayVoices(urls, { gapMs: 600 }) }, Math.max(0, SPEECH_LEAD_MS - Math.max(0, now - at)))
    return () => { clearTimeout(timer); stopVoice() }
  }, [key])
  return null
}

export function IrwinSpeech(props) {
  return <Quiet><IrwinSpeechInner {...props} /></Quiet>
}

// Granolia in the Study: her line, said when it comes up and when it changes.
// A short wait first, so a line that only flashes by (Watch, between two
// patterns) is not started and cut, and the room's chime rings before her.
const STUDY_VOICE_WAIT_MS = 450
function StudyVoiceInner({ line }) {
  const url = line ? petVoiceUrl('granolia', line, BASE) : null
  useEffect(() => {
    if (!url) return undefined
    hasVoice([url])
    const timer = setTimeout(() => { sayVoices([url]) }, STUDY_VOICE_WAIT_MS)
    return () => { clearTimeout(timer) }
  }, [url])
  return null
}

export function StudyVoice(props) {
  return <Quiet><StudyVoiceInner {...props} /></Quiet>
}
