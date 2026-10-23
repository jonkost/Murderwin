// Pure rules for the room screens (the living room TV, the iPad, the
// bedroom and the study): which view to show, the board rows, the door's
// hold, the bell and the corner dot. No React, no Firebase, so play/test can
// run them under node --test. Everything here reads public docs any phone
// may read, and nothing it returns names a role, a dial value or a motive
// that is still in play.

import { isStale, secondsSinceHeard } from './clock.js'
import { effectivePhase } from './night.js'

export const BELL_MS = 3_000
export const SOUND_FRESH_MS = 30_000
export const DOOR_HOLD_MS = 10_000
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
// then the finale, the ballot clock, a drawing under way, the board, the
// open door, a card (news, bulletin, Irwin) and finally the idle crest.
// A pause taken during the blackout or the prompt keeps the room dark: the
// phase the night was paused from decides, the same as on the phones.
export function livingView({ night, relay, screen, finale, captionsOnly = false } = {}) {
  const phase = effectivePhase(night)
  if (phase === 'blackout' || phase === 'prompt') return 'dark'
  if (night?.phase === 'paused') return 'paused'
  if (screen?.kind === 'black') return screen.title ? 'paused' : 'dark'
  if (finale && night?.act === 7) return 'finale'
  if (night?.window?.kind === 'ballot' && !night.window.settled) return 'ballot'
  if (RELAY_RUNNING.includes(relay?.state)) return 'relay'
  if (captionsOnly) return screen?.captions || CAPTION_KINDS.includes(screen?.kind) ? 'captions' : 'idle'
  if (screen?.kind === 'board') return 'board'
  if (relay?.state === 'done' || screen?.kind === 'door') return 'door'
  if (CAPTION_KINDS.includes(screen?.kind)) return 'card'
  return 'idle'
}

// The bedroom and the study go dark with everyone else, and stay dark when
// the host pauses in the middle of the blackout or the prompt.
export function roomDark(night) {
  const phase = effectivePhase(night)
  return phase === 'blackout' || phase === 'prompt'
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

// The elimination board: one row per character at the party, their strike
// beneath. A strike the server picked for a silent phone looks exactly like
// one that was chosen: the row never carries `defaulted`.
export function boardRows({ night, characters = [], motives = [] } = {}) {
  const roster = night?.roster ?? {}
  const strikes = night?.eliminations ?? {}
  const charName = id => characters.find(c => c.id === id)?.name ?? ''
  const rows = Object.entries(roster).map(([key, r]) => {
    const s = strikes[key]
    let strike = null
    if (s?.kind === 'person') strike = { kind: 'person', text: `not ${roster[s.key]?.name ?? 'someone'}` }
    else if (s?.kind === 'motive') {
      const m = motives.find(x => Number(x.n) === Number(s.n))
      strike = { kind: 'motive', text: `not ${m ? `${m.n}. ${m.rhyme}` : `motive ${s.n}`}` }
    }
    return { key, name: r.name, characterName: charName(r.characterId), strike }
  })
  return rows.sort((a, b) => a.name.localeCompare(b.name))
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

// Three rules lines for the drawing, from the workshop's RELAY RULES line
// (split on | or on sentences) or the defaults. The same rule as the server.
export const DEFAULT_RELAY_RULES = [
  'One of you draws what your phone shows, without looking at the paper.',
  'Everyone else shouts directions. Ten seconds, then the next person walks up.',
  'When the grid is full, vote on your phone for the picture it makes.',
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
