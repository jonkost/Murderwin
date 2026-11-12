# Handoff, 12 November 2026: the dedication

From Claude chat, for Claude Code. Written 12 November 2026, 6:50 am. Not applied yet.

The same words as the last section of the Claude Doc: https://claude.ai/artifact/NJuSLuD5nQcaKTz599UYUU

Jon sent the dedication on 12 Nov: Sydney's photo and the words. This page puts both on the dedication card in the credits. It adds to `docs/handoff-2026-11-12.md` and changes nothing else.

## What Jon sent

**Jon:** “This is for the dedication. It should read ‘For Sydney, The Best Big Brother A Pup Could Ask For’.”

| What | Where it is now |
| --- | --- |
| Sydney's photo | `play/public/household/sydney.jpg`, put there by Claude chat. Jon's own photo, full size (1120 by 1420) |
| The words | For Sydney, The Best Big Brother A Pup Could Ask For |

## Build

1. The dedication card reads exactly: **For Sydney, The Best Big Brother A Pup Could Ask For**. Keep Jon's capital letters and his comma. Add nothing to it: no “In loving memory”, no “the original good boy”.
2. Set it in two lines, broken after the comma and nowhere else. First “For Sydney,” and under it, a little smaller, “The Best Big Brother A Pup Could Ask For”.
3. The photo sits above the words in a round brass frame. Place the picture at 50% across and 70% down (`object-position: 50% 70%`), so his nose stays inside the circle.
4. Change every place the old line lives: `IN_MEMORY` in `functions/lib/finale.js`, the `Dedication` part in `play/src/look/parts.jsx`, and whatever `Kiosk.jsx`, `Preview.jsx` and the look book show.
5. The card as Jon has seen it is screen 6 in `docs/look-approved.html`. That file now shows the photo and these words.
6. The rest of job C1 stands: one card, held for eight seconds, before the last card of the credits.

**Done when:** `npm run media` says Sydney's photo is in, and the credits show his photo with Jon's words, exactly as written.

The photo goes live with `npm run deploy:site`, on Jon's word.

## Still to come from Jon

- The special thanks for the credits.

## Prompt for Claude Code

Paste this into Claude Code:

> Read `docs/handoff-2026-11-12-dedication.md` and apply it. Sydney's photo is in the game folder, and the dedication reads exactly as I wrote it. Do not deploy or push until I say.
