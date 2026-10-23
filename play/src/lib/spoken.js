// A cat's line as the phone and the room screens show it. The banks keep
// stage directions between single stars (*heavy breathing*, *snort*,
// Granolia's *snrk.*); on screen they read in italics, without the stars.
// Pure (no React) so play/test can run it under node --test.

const STAGE = /\*([^*\n]+)\*/g

// The line in pieces: [{ text, stage }], stage true for a stage direction.
// A lone star, or one with nothing between, stays as written.
export function spokenParts(text) {
  const s = String(text ?? '')
  const parts = []
  let at = 0
  for (const m of s.matchAll(STAGE)) {
    if (!m[1].trim()) continue
    if (m.index > at) parts.push({ text: s.slice(at, m.index), stage: false })
    parts.push({ text: m[1], stage: true })
    at = m.index + m[0].length
  }
  if (at < s.length) parts.push({ text: s.slice(at), stage: false })
  return parts
}
