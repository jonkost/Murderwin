// The nineteen motive cards' pictures (card 308): play/public/motives/1.png
// to 19.png, by the motive's number (seed/motives.json). They show in Sir
// Irwin's Act 5 countdown and on the motive's card at the reveal. Until a
// picture is in, the card shows the rhyme only, so the game never waits on
// the drawings. No React, no Firebase, so play/test can run it.

export const MOTIVE_COUNT = 19

// Where motive n's picture lives, or null for anything that is not a motive.
export function motivePictureUrl(n, base = '/') {
  const k = Number(n)
  if (!Number.isInteger(k) || k < 1 || k > MOTIVE_COUNT) return null
  return `${base}motives/${k}.png`
}
