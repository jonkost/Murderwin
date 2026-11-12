import nightSeed from '../../../seed/night.json' with { type: 'json' }
import beatLines from '../../../seed/beat-lines.json' with { type: 'json' }

// The flow of the night on the phone side (A5, 12 Nov 2026). Pure, so
// play/test runs it under node --test.

// The Parlour Games' own beats (seed/night.json parlour.beats): the only beats the
// Host tab offers Parlour Game now in, the same rule the server keeps (functions/lib/flow.js).
const BEATS = nightSeed.parlour?.beats ?? {}
export function parlourBeat(act, beat) {
  return (BEATS[String(act)] ?? []).includes(String(beat ?? ''))
}

// The beat's one plain line for a quiet Now tab (seed/beat-lines.json), or null. Only the beats where
// nothing else tells a guest what to do or where to go have one (functions/test/flow.test.mjs checks).
export function beatLine(night) {
  if (!night) return null
  const line = beatLines.lines?.[`${night.act}/${night.beat}`]
  return typeof line === 'string' && line.trim() ? line.trim() : null
}
