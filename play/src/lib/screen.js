// Pure rules for the room screens (the Parlour TV, the iPad, the
// bedroom and the study): which view to show, the cast for Talk it over,
// the door's hold, the bell, the corner dot and when it shows. No React, no Firebase,
// so play/test can run them under node --test. Everything here reads public
// docs any phone may read, and nothing it returns names a role, a dial value
// or a motive that is still in play.

import { isStale, secondsSinceHeard } from './clock.js'
import { effectivePhase, isOver, isRehearsalNight } from './night.js'

export const BELL_MS = 3_000
export const SOUND_FRESH_MS = 30_000
export const DOOR_HOLD_MS = 10_000
// The drawing is on the screens in these states. 'lockout' is an older server's
// ten-second wait after a wrong pick (gone 11 Nov 2026, lib/relayhost.js): it
// stays here so the TV never leaves the drawing if such a server is behind it.
export const RELAY_RUNNING = ['intro', 'walk', 'turn', 'vote', 'lockout']
export const CAPTION_KINDS = ['news', 'bulletin', 'irwin']

export function ms(t) {
  if (!t) return 0
  if (typeof t.toMillis === 'function') return t.toMillis()
  if (t instanceof Date) return t.getTime()
  return Number(t) || 0
}

// The living room screen, in order of precedence: the host's phase first
// (dark through the blackout and the prompt, "One moment" while paused),
// then the finale, the vote's clock, a drawing under way, the vote once it
// has closed ("The votes are in."), Talk it over, the open door, a card
// (news, bulletin, Irwin), the prompts, the title card, the join code (Act 1
// and the dinner wrap-up, 25 Oct 2026), the birthday card (the Cake! button,
// 25 Oct 2026) and finally the idle crest.
// A pause taken during the blackout or the prompt keeps the room dark: the
// phase the night was paused from decides, the same as on the phones.
// The vote (11 Nov 2026): 'ballot' while its window is open, and for the
// moment between the beat and its window (the TV draws the questions with no
// clock yet, never the door again); 'voted' once the window is settled, until
// the reveal's reel takes the screen. Both come before the open door, which
// would otherwise show again the moment the vote closed.
export function livingView({ night, relay, screen, finale, captionsOnly = false } = {}) {
  if (isOver(night)) return 'end' // The End: a card, never the dark (C1)
  const phase = effectivePhase(night)
  if (phase === 'blackout' || phase === 'prompt') return 'dark'
  if (night?.phase === 'paused') return 'paused'
  if (screen?.kind === 'black') return screen.title ? 'paused' : 'dark'
  if (finale && night?.act === 7) return 'finale'
  if (night?.window?.kind === 'ballot' && !night.window.settled) return 'ballot'
  if (RELAY_RUNNING.includes(relay?.state)) return 'relay'
  if (captionsOnly) return screen?.captions || CAPTION_KINDS.includes(screen?.kind) ? 'captions' : 'idle'
  if (screen?.kind === 'vote') return night?.window?.kind === 'ballot' && night.window.settled ? 'voted' : 'ballot'
  if (screen?.kind === 'talk') return 'talk'
  if (relay?.state === 'done' || screen?.kind === 'door') return 'door'
  if (CAPTION_KINDS.includes(screen?.kind)) return 'card'
  // Sir Irwin's sharing prompts (Act 2's cat visits, Act 4's rounds) and the Act 4 title card
  if (screen?.kind === 'prompts') return 'prompts'
  if (screen?.kind === 'title') return 'title'
  // the join code (cues 3 and 10): a big square of the play address, never on the iPad's words
  if (screen?.kind === 'join') return 'join'
  // the Happy Birthday Irwin card, from the Cake! button in Act 5 (cue 13); the TV draws it with his picture
  if (screen?.kind === 'birthday') return 'birthday'
  return 'idle'
}

// The bedroom, the study and every other room screen go dark with everyone
// else, and stay dark when the host pauses in the middle of the blackout or
// the prompt. A screen that reads public/screen is dark on a black doc with no
// title (the titled one is the pause card). The End is never dark (C1, 11 Nov
// 2026): once the night is over (nights/{id}.over, or Act 7's end beat) every
// screen shows The End card, for good (lib/closing.js roomEnded), whatever the
// screen doc says (the end beat still writes a black doc, for a page from
// before the card).
export function roomDark(night, screen = null) {
  if (isOver(night)) return false
  const phase = effectivePhase(night)
  if (phase === 'blackout' || phase === 'prompt') return true
  return screen?.kind === 'black' && !screen.title
}

// The captions the iPad shows: the card itself while it is up, else the
// last ones the server carried on the doc (through dinner).
export function captionsOf(screen) {
  if (!screen) return null
  if (CAPTION_KINDS.includes(screen.kind)) return { kind: screen.kind, title: screen.title ?? '', lines: screen.lines ?? [] }
  if (screen.captions?.lines?.length) return { kind: screen.captions.kind, title: '', lines: screen.captions.lines }
  return null
}

// After the door opens: "The door is open" for the hold, then the trace,
// but only when the host has asked for it on the TV (public/cues.tvTrace).
export function doorStage({ screen, cues, trace, now } = {}) {
  const at = ms(screen?.at)
  const hold = screen?.kind === 'door' ? (screen.holdMs ?? DOOR_HOLD_MS) : 0
  const holding = at > 0 && now - at < hold
  if (!holding && cues?.tvTrace && trace) return 'trace'
  return 'open'
}

// Everyone at the party, for Talk it over on the Parlour TV (handoff 11 Nov
// 2026, A6): the three questions over everyone's portraits. One entry a
// guest, by name: who they are, and who they play. Nothing here knows a role,
// and the order says nothing (it is the alphabet).
export function castOf({ night, characters = [] } = {}) {
  const roster = night?.roster ?? {}
  const charName = id => characters.find(c => c.id === id)?.name ?? ''
  return Object.entries(roster)
    .map(([key, r]) => ({ key, name: r?.name ?? '', characterId: r?.characterId ?? null, characterName: charName(r?.characterId) }))
    .sort((a, b) => a.name.localeCompare(b.name))
}
// How the portraits sit under the questions: one row up to eight, two rows
// beyond (the party is about nine; the cast is fourteen at most).
export function castRows(count) {
  const n = Math.max(0, Math.floor(Number(count) || 0))
  if (n <= 8) return [n]
  const top = Math.ceil(n / 2)
  return [top, n - top]
}

// The vote's count on the Parlour TV: how many seats have locked in, of how
// many were dealt the vote. Numbers only, never who and never what; null when
// the night's window is not the vote. An older night's window has no `of`:
// the roster's size stands in.
export function voteCount(night) {
  const w = night?.window
  if (!w || w.kind !== 'ballot') return null
  const of = Math.max(0, Math.floor(Number(w.of) || Object.keys(night?.roster ?? {}).length))
  const n = Math.max(0, Math.min(of, Math.floor(Number(w.answered) || 0)))
  return { n, of }
}

// The bell in the corner: three seconds from the moment a sound was called
// for (by the server's clock). A stale sound (a kiosk opened late) rings nothing.
export function bellShown(sounds, now) {
  const at = ms(sounds?.current?.at)
  if (!at) return false
  return now - at >= 0 && now - at < BELL_MS
}
export function soundFresh(sounds, now) {
  const at = ms(sounds?.current?.at)
  return !!at && Math.abs(now - at) < SOUND_FRESH_MS
}

// The corner dot: green when the night doc is live, amber when it has been
// painting from cache for twenty seconds, red when the browser says offline.
export function dotState(view, online, now) {
  const seconds = secondsSinceHeard(view ?? {}, now)
  if (online === false) return { colour: 'red', label: 'offline', seconds }
  if (isStale(view ?? {}, now)) return { colour: 'amber', label: 'not heard lately', seconds }
  return { colour: 'green', label: 'live', seconds }
}
export function heardText(seconds) {
  if (seconds == null) return 'not heard yet'
  if (seconds < 5) return 'heard just now'
  if (seconds < 90) return `heard ${seconds} s ago`
  return `heard ${Math.round(seconds / 60)} min ago`
}

// The corner dot and the "tap once to wake" note are for whoever sets the
// screens up, so no guest sees them on the party night (Jon, 29 Oct 2026: no
// setup words in front of the guests). They show on a rehearsal or a dry run
// (isRehearsalNight) and on a screen with no night live; on the party night
// the Host tab's house panel keeps a dot for every screen. `looked`: the
// screen has signed in and read the night (or found there is none, or could
// not sign in), so one reloaded during the party never flashes them while
// its night is still on its way.
export function showSetup(night, { looked = true } = {}) {
  if (!looked) return false
  return !night || isRehearsalNight(night)
}

// Sir Irwin's door slide ("Pawsome!"), drawn above "The door is open" while
// the drawing is done, and never over the trace once the host puts it on the TV.
export function doorSlideOf({ relay, stage } = {}) {
  if (relay?.state !== 'done' || stage !== 'open') return null
  return relay.doorSlide?.text ? relay.doorSlide : null
}

// Sir Irwin's rules slides on the TV. Each slide carries its own time on
// screen (ms: five seconds plus 0.4 seconds a word, worked out by the
// server), and the run ends at introEndsAt, so slide i shows from the
// sum of the slides before it. A doc with no per-slide time uses
// timing.slideMs for every slide.
export const SLIDE_FALLBACK_MS = 9_000
export function slideTime(text) {
  const words = String(text ?? '').trim().split(/\s+/).filter(Boolean).length
  return 5_000 + 400 * words
}
export function slideAt(relay, now) {
  const slides = Array.isArray(relay?.slides) ? relay.slides : []
  if (!slides.length) return { index: -1, slide: null, count: 0 }
  const each = Number(relay?.timing?.slideMs) > 0 ? Number(relay.timing.slideMs) : SLIDE_FALLBACK_MS
  const lengths = slides.map(s => (Number(s?.ms) > 0 ? Number(s.ms) : each))
  const ends = ms(relay.introEndsAt)
  const t = ends ? Math.max(0, now - (ends - lengths.reduce((a, b) => a + b, 0))) : 0 // no end yet: the first slide
  let index = 0
  let from = 0
  while (index < slides.length - 1 && t >= from + lengths[index]) { from += lengths[index]; index++ }
  return { index, slide: slides[index], count: slides.length, into: t - from } // into: ms into this slide, for its voice
}

// Three rules lines for the drawing, from the workshop's RELAY RULES line
// (split on | or on sentences) or the defaults. The same rule as the server.
// Fifteen seconds a turn and the host's tap since 25 Oct 2026 (the cue list).
export const DEFAULT_RELAY_RULES = [
  'Sir Irwin calls a name. That person walks to the paper in the Library before the square shows.',
  'Everyone else describes the square on the TV. Words only, no pointing. Fifteen seconds a turn.',
  'When the grid is full, agree on the picture and tell the host your guess.',
]
export function relayRules(uiText) {
  const t = String(uiText ?? '').trim()
  if (!t) return DEFAULT_RELAY_RULES
  const parts = (t.includes('|') ? t.split('|') : t.split(/(?<=[.!?])\s+/)).map(s => s.trim()).filter(Boolean)
  return parts.length ? parts.slice(0, 3) : DEFAULT_RELAY_RULES
}
// The rules show on the first walk of the first grid, and nowhere else.
export function showRules(relay) {
  return relay?.state === 'walk' && (relay.grid ?? 1) === 1 && (relay.gridDone?.length ?? 0) === 0
}
