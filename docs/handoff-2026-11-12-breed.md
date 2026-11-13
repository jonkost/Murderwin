# Handoff, 12 November 2026 (morning): Irwin's breed moment

From Claude chat, for Claude Code. Written 12 November 2026, 6:30 AM. Not applied yet.

This fills the row "Irwin's breed moment" under Coming from Jon in `docs/handoff-2026-11-11-polish.md`. Call it job **C2**. It follows the same rules as that handoff: simple, celebratory, few words, Jon's own art.

## Jon, start here

**A surprise bonus question pops up on every phone the moment the last vote locks in. Everyone picks 3 breeds from a list of 12. Then the TV shows what Sir Irwin is really made of.**

- It is just for fun. It does not change anyone's case score.
- It is not a secret. You, Susan and the kids know the answer, so nothing here is sealed.
- Nothing for you to make. It uses your Irwin art.

## The answer

From Jon's Embark screenshots, 12 Nov.

| Breed | Share |
| --- | --- |
| Australian Shepherd | 69.1% |
| Siberian Husky | 17.9% |
| Pomeranian | 13% |

## The list on the phones

Twelve choices, three right. Shuffled fresh on every phone.

| Right | Decoys |
| --- | --- |
| Australian Shepherd | Pembroke Welsh Corgi |
| Siberian Husky | Border Collie |
| Pomeranian | Papillon |
| | Shetland Sheepdog |
| | Golden Retriever |
| | Cavalier King Charles Spaniel |
| | Chihuahua |
| | Dachshund |
| | Red Fox |

Red Fox is the joke answer. The rest are fair guesses from how he looks.

## How it plays

| Step | What happens |
| --- | --- |
| 1 | The last seat locks in its vote. The vote closes, as in job A6 |
| 2 | Every phone flips to the bonus card, with a sparkle and a ding. No warning before it |
| 3 | Each player taps exactly 3 breeds, then **Lock in** |
| 4 | It closes when the last seat locks in, or at 60 seconds, whichever is first |
| 5 | The Parlour TV shows the answer (below). Phones show how many each player got |
| 6 | The night carries on by itself into the closing bulletin: Murderer, Motive, Victim |

## The words

**The phone card**

- Title: **One more mystery!**
- Line: What is Sir Irwin made of? Pick 3.
- Button: **Lock in** (lights when exactly 3 are picked)
- After: Locked in. Eyes on the big screen.

**The Parlour TV, while people pick**

- Title: **One more mystery!**
- Line: What is Sir Irwin made of?
- Sir Irwin, large, from `play/public/household/full/`

**The Parlour TV, the answer.** One breed at a time, smallest first, about two seconds each, a chime on each:

1. 13% Pomeranian
2. 17.9% Siberian Husky
3. 69.1% Australian Shepherd
4. Then the big one: **100% Irwin**, with confetti and the fanfare

A ring around Sir Irwin's picture fills in as each breed lands, drawn in code: red, blue, then gold.

**The phones, after the answer**

| Got | Phone says | Celebration (B4) |
| --- | --- | --- |
| 3 of 3 | Good nose! 3 out of 3. | Big |
| 1 or 2 | 2 out of 3. So close! (or 1 out of 3) | Small |
| 0 | 0 out of 3. He fooled you! | Small, never a buzz |

## Build notes for Claude Code

1. A new window kind, `breed`, opened by the server the moment the vote settles. It is the one window allowed between the vote and the reveal: add it to the A5 rule that refuses windows there.
2. The breeds and shares live in the open in `seed/breed.json`. Nothing sealed. No read of `sealed/`.
3. Shuffle the twelve per phone. The card refuses a fourth pick: tapping a fourth does nothing until one is untapped.
4. Fill-in players pick 3 at random within 20 seconds, like the vote.
5. No points. The count is not added to the case result, and it is not an end-credit award.
6. Use Jon's Irwin pictures only. Never Embark's logo, drawings or screens.
7. The answer screen ends by itself, then the closing bulletin starts as it does today. Jon presses nothing extra.
8. Add the beat to `docs/run-sheet.md` and the flow test: the window opens once, after the vote, and never again.
9. The cut line holds. If it is not built and tested two hours before a practice night, leave it out and tell Jon.

**Done when:** in a practice night the bonus card appears on every phone within a second of the last vote, closes on the last lock-in, the TV counts up to 100% Irwin with sound, and the closing bulletin follows with no tap from Jon.

## Choices made for Jon

| Choice | The default that gets built | The other way |
| --- | --- | --- |
| When the answer shows | Right away, before the Murderer is named | Saved for the very end, after the credits |
| Points | None. Just for fun | A "Best Nose" award in the credits for 3 of 3 |
| The joke answer | Red Fox is on the list | Dogs only |
| Showing the shares | The percents show in the answer | Names only |

## Prompt for Claude Code

Paste this into Claude Code:

> Read `docs/handoff-2026-11-12-breed.md` in full and apply it as job C2, after the jobs in `docs/handoff-2026-11-11-polish.md` that are already under way. It is Irwin's breed moment: a surprise pick-3 question on every phone right after the vote closes, then the answer on the Parlour TV, then the closing bulletin as today. Nothing in it is sealed. Use my own Irwin art, keep the words exactly as written, and use the defaults in Choices made for Jon. The cut line holds: if it is not tested two hours before the practice night, leave it out and tell me. Do the end-of-session routine in CLAUDE.md. Do not deploy or push until I say.
