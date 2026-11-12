import { useEffect, useRef } from 'react'
import { beatSpec, ms } from './night.js'

// Screens update themselves (A5, handoff 11 Nov 2026: "Publishes landed while
// the night was running, and open screens kept their old code until someone
// reloaded them"). Every build writes its stamp twice: compiled into the page
// (__BUILD_STAMP__, play/vite.config.js) and as build.json beside it. Once a
// minute each page (the phones and the room screens) reads build.json; when the
// site has a newer build than the page, the page reloads itself, but only at a
// quiet moment: never in the middle of a game, a film, a video, a window, the
// drawing, the vote or the reveal (mayReload, pure, play/test/freshness.test.mjs).
// A reload comes back exactly where it was: every page draws from the server's
// documents and the phone's own notes, so it reconnects and rehydrates
// silently (CLIENT RULES), like any reload.

export const CHECK_EVERY_MS = 60_000      // the minute between looks at build.json
export const STALE_EVERY_MS = 5_000       // once a newer build is known, look for a quiet moment this often
export const STAMP_FILE = 'build.json'
// eslint-disable-next-line no-undef
export const BUILD_STAMP = typeof __BUILD_STAMP__ === 'string' && __BUILD_STAMP__ ? __BUILD_STAMP__ : null
const TRIED_KEY = 'murderwin-reloaded-for'

// The drawing's running states (functions/lib/relay.js RUNNING).
const DRAWING = ['intro', 'walk', 'turn', 'vote', 'lockout']
// The rooms whose screen is a game through Act 4's rounds. The iPad is In Duplicate then (?kiosk=ipad,
// 12 Nov 2026): a reload in the middle of a board would deal the group a fresh look at it.
const GAME_ROOMS = ['study', 'memory', 'boo', 'orangerie', 'ipad']
// The Parlour TV's films and timed cards: bulletin 1, bulletin 2, Sir Irwin, the open door.
const FILM_SCREENS = ['news', 'bulletin', 'irwin', 'door']
// A window is still in play this long after it closes (the server's grace, and the settle after it).
const WINDOW_TAIL_MS = 10_000

// Is `remote` a newer build than `local`? Stamps are ISO times, so they sort as text.
// An older or equal one (a cache still serving the last build) never reloads anything.
export function isNewer(remote, local) {
  return typeof remote === 'string' && typeof local === 'string' && !!remote && !!local && remote > local
}

// May this page reload itself now? Pure. `page`: 'phone' or 'room'; `which`: the room screen (?kiosk=).
// `typing`: a text box has the cursor (a half-typed note is kept by a short wait, never by a reload).
// `fullscreen`: the browser's own full screen from a click on a room screen, which a reload would leave
// with nobody there to click again, so the browser's bar would show in the room: such a screen waits.
// `overlay`: something is open over the page (a Parlour Game the guest is part-way through in Act 4,
// which has no window on the night's own record; the camera; a little win): a reload would lose it.
export function mayReload({ page = 'phone', which = null, night = null, session = null, relay = null, screen = null, now = Date.now(), typing = false, fullscreen = false, overlay = false } = {}) {
  if (typing || overlay) return false
  if (page === 'room' && fullscreen) return false
  if (page === 'room' && which === 'practice') return false // a practice game on its own page: never mid-game
  if (!night) return true                      // the doors, a quiet house
  if (night.over === true) return true          // The End: the screens black, the phones open for good
  const phase = night.phase
  if (phase === 'paused' || phase === 'prompt') return false // a held moment, the role cards
  if (phase === 'blackout') return true         // dark: nothing on any screen
  const act = Number(night.act)
  const action = beatSpec(act, night.beat)?.action ?? null
  const w = night.window
  if (w && !w.settled && now < ms(w.closesAt) + WINDOW_TAIL_MS) return false // a Parlour Game or the vote
  if (relay && DRAWING.includes(relay.state)) return false                   // the drawing
  if (act === 6 && action === 'relay:start') return false                    // the drawing's last screens, the door slide
  if (act === 7 && ['window:ballot', 'reveal', 'results'].includes(action)) return false // the vote, the reveal, the credits
  if (page === 'room') {
    if (act === 1 && night.beat === 'rules') return false                    // the intro video and the rules film
    if (FILM_SCREENS.includes(screen?.kind)) return false                    // a bulletin, Sir Irwin, the door
    if (act === 4 && GAME_ROOMS.includes(which) && /^round\d+$/.test(String(night.beat ?? ''))) return false
    return true
  }
  // a phone
  if (act === 2 && session?.lights?.step === 'with') return false           // with a cat, reading
  const a4 = act === 4 ? session?.act4 : null
  if (a4?.room && a4.room !== 'parlour' && !a4.paid && !a4.over) return false // in a game room
  return true
}

function typingNow() {
  const el = typeof document !== 'undefined' ? document.activeElement : null
  return !!el && (el.tagName === 'TEXTAREA' || el.tagName === 'INPUT' || el.isContentEditable === true)
}
// Is something open over the page? Every card that opens over a phone is drawn in an .overlay (a Parlour
// Game, Allow again), the look's sheet (the vote's picker), the viewfinder (the camera) or the little win
// (a cat met).
function overlayNow() {
  return typeof document !== 'undefined' && !!document.querySelector('.overlay, .lk-sheet, .viewfinder, .lk-smallwin')
}
function triedFor() { try { return sessionStorage.getItem(TRIED_KEY) } catch { return null } }
function markTried(stamp) { try { sessionStorage.setItem(TRIED_KEY, stamp) } catch { /* no storage: a reload is still safe */ } }

// The hook, one line in each page: useFreshness(() => ({ page, which, night, session, relay, screen, now })).
// `read` is called at each look, so it always sees the page's latest documents. Off in development and in
// any page built without a stamp. A page reloads once for a given build: if the reload still brought the
// old code (a cache), it does not try again for that build.
export function useFreshness(read) {
  const readRef = useRef(read)
  readRef.current = read
  useEffect(() => {
    if (!BUILD_STAMP || typeof window === 'undefined' || typeof fetch !== 'function') return
    let newer = null
    let timer = null
    let stopped = false
    const base = (import.meta.env && import.meta.env.BASE_URL) || '/play/'
    const look = async () => {
      if (stopped) return
      if (!newer) {
        try {
          const r = await fetch(`${base}${STAMP_FILE}?t=${Date.now()}`, { cache: 'no-store' })
          const j = r.ok ? await r.json() : null
          if (isNewer(j?.stamp, BUILD_STAMP) && triedFor() !== j.stamp) newer = j.stamp
        } catch { /* offline, or no file: look again next minute */ }
      }
      if (newer && !stopped) {
        let state = {}
        try { state = readRef.current?.() ?? {} } catch { state = {} }
        const fullscreen = typeof document !== 'undefined' && !!document.fullscreenElement
        if (mayReload({ ...state, typing: typingNow(), fullscreen, overlay: overlayNow() })) {
          markTried(newer)
          window.location.reload()
          return
        }
      }
      timer = setTimeout(look, newer ? STALE_EVERY_MS : CHECK_EVERY_MS)
    }
    timer = setTimeout(look, CHECK_EVERY_MS)
    return () => { stopped = true; clearTimeout(timer) }
  }, [])
}
