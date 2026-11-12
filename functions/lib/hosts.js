// Who hosts what (docs/handoff-2026-10-22.md §6b and §5): flavor only, an
// intro in each character's voice, no change to play. Open copy; the
// workshop's ui_copy lines HOST <KEY> win (HOST BOO 1 to HOST BOO 6, HOST
// IRWIN TRACE 1 to 5).
//
//   Irwin     the Relay Drawing and the trace reveal (one line per level)
//   Granolia  the study light puzzle
//   Zimothy   the memory match
//   Boo       the Parlour Games (one of six lines at random per game; she
//             judges whatever you pick and never hints which answer she likes)
//   Salem     nobody reads his line since 11 Nov 2026: the vote is one card
//             with three rows and no host (Jon: "Don't overcomplicate it").
//             Kept, like the workshop's HOST SALEM label, in case it comes back.

import { createHash } from 'node:crypto'

export const HOST_LINES = {
  // The new words (25 Oct 2026, the default of the decision granoliaIntro, card 473): the game is played by touching the wall; the buttons take the colour and the number at the end.
  granolia: "You're here! Copy the wall's pattern three times, then press the color, the number and submit.",
  zimothy: "Disaster: my files are everywhere. Match each pair, and I'll strike one motive from your list.",
  salem: "Name the Murderer, the motive and the victim. And before you ask, it wasn't me.",
  boo: [
    "Let's see how disappointing you are.",
    "Choose carefully, darling. Everyone's watching, mostly me.",
    "There's a right answer. I doubt you'll find it.",
    'Try to have taste. Just this once.',
    "Ugh, fine. Impress me.",
    "I've already judged you, darling. This just makes it official.",
  ],
  // the trace reveal, Act 6 (replaces the 5 Oct draft)
  irwinTrace: {
    1: 'I dug and dug, but all I found was a gray blob. Then again, everything looks gray to me. Want me to dig some more?',
    2: "Ooh, it's got colors! I can't tell what it is, though. Is it a toy? Is it for me?",
    3: "It's one of these two! I'd bet my toy on it. Not my good toy, though.",
    4: "I fetched it! Here it is! I don't know what it's called, but I fetched it!",
    5: 'I fetched it, and I even know its name! Can we play again? Please?',
  },
}

// A host's line, with the workshop's own words first.
export function hostLine(key, ui = {}) {
  return ui[`HOST ${key.toUpperCase()}`] ?? HOST_LINES[key] ?? null
}

// Boo's line for one Parlour Game: one of the six, the same for every phone
// and every re-read of the same window.
export function booLine(windowId, ui = {}) {
  const h = createHash('sha256').update(`boo\u0000${windowId}`).digest()
  const i = h.readUInt32BE(0) % HOST_LINES.boo.length
  return ui[`HOST BOO ${i + 1}`] ?? HOST_LINES.boo[i]
}

// Sir Irwin on the trace, by its level 1 to 5.
export function irwinTraceLine(level, ui = {}) {
  const l = Math.min(5, Math.max(1, Math.round(Number(level) || 3)))
  return ui[`HOST IRWIN TRACE ${l}`] ?? HOST_LINES.irwinTrace[l]
}
