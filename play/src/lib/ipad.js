// The iPad's one page (?kiosk=ipad; handoff 11 Nov 2026, A10): Jon carries
// one iPad through the night and never reloads it. What it shows follows the
// night by itself (Auto), and the Host tab's row "The iPad shows" can pick
// one by hand. Pure, so play/test can run it under node --test.
//
//   Act 1                      the Library's splash, with Zimothy
//   Act 2                      Zimothy's code during the cat visits; the captions (bulletin 1's words) otherwise
//   Act 3                      the supper captions
//   Act 4                      In Duplicate
//   Act 5                      the Library's splash
//   Act 6 from the drawing on  the bedroom's screen (the splash through the two Parlour Games)
//   Act 7                      the bedroom's screen
//
// A by-hand pick sits on the public cues doc as `ipad: { show, act, at }`
// (functions/lib/ipad.js) and holds only through the act it was made in: the
// next act goes back to Auto, so a pick left on by mistake never strands it.
// `memory` and `bedroom` stay as their own addresses for any other device.

import { RELAY_RUNNING } from './screen.js'

export const IPAD_SHOWS = ['splash', 'code', 'captions', 'memory', 'bedroom']

// The Host tab's row, in order. Auto is the default.
export const IPAD_CHOICES = [
  { key: 'auto', label: 'Auto' },
  { key: 'code', label: 'Zimothy’s code' },
  { key: 'captions', label: 'Supper captions' },
  { key: 'memory', label: 'In Duplicate' },
  { key: 'bedroom', label: 'The bedroom' },
]
export const IPAD_WORDS = { splash: 'the Library’s picture', code: 'Zimothy’s code', captions: 'the supper captions', memory: 'In Duplicate', bedroom: 'the bedroom' }

// What Auto shows for this moment of the night.
export function ipadAuto(night, relay = null) {
  const act = Number(night?.act) || 0
  if (act === 2) return night.beat === 'cat' ? 'code' : 'captions'
  if (act === 3) return 'captions'
  if (act === 4) return 'memory'
  if (act === 6) {
    const drawing = RELAY_RUNNING.includes(relay?.state) || relay?.state === 'done'
    return night.beat === 'games' && !drawing ? 'splash' : 'bedroom'
  }
  if (act === 7) return 'bedroom'
  return 'splash'
}

// The pick by hand, when there is one for this act; else null (Auto).
export function ipadPick(night, cues = null) {
  const p = cues?.ipad
  if (!p || !IPAD_SHOWS.includes(p.show) || p.show === 'splash') return null
  if (Number(p.act) !== Number(night?.act)) return null
  return p.show
}

// What the iPad shows now: one of IPAD_SHOWS.
export function ipadShows({ night, relay = null, cues = null } = {}) {
  if (!night) return 'splash'
  return ipadPick(night, cues) ?? ipadAuto(night, relay)
}

// Which chip on the Host tab is lit: the pick by hand, or Auto.
export function ipadChip(night, cues = null) {
  return ipadPick(night, cues) ?? 'auto'
}
