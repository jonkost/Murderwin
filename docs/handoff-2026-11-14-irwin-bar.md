# Sirwin Manor · Handoff · 14 November 2026 (Irwin's progress bar on the Parlour TV)

> **Applied 14 Nov 2026** (Claude Code, the same morning; built, filmed, reviewed and committed; published only on
> Jon's word). The bar is now `play/public/irwin-progress-bar.html`. With these differences:
> - The bar is given the count less 2.4 seconds (`END_ROOM_MS`), not the whole of it: full at the very moment the
>   screen moves on, nobody would have seen the butterfly fly off.
> - The page gained four small things: it says `irwin:ready` (and again when sent `irwin:hello`), so the screen
>   knows it is there; its bar goes by the real time between frames; in the frame it starts with no cards (never
>   the preview's samples); a start that lands where the bar already stands keeps his pose. Its font no longer
>   holds its script back.
> - A hold sends the cards with the bar's place. A screen that has fallen back to the plain bar stays on it.
> - The look book got no new view: `/play/?preview=kiosk-finale` and `kiosk-finale-awards` now show the bar.
> - `tallyCut` and `tallyDial` were never on the board, so they went on already answered, with `tallyLength` open.

Written by Claude chat, Saturday morning, the day before the party. Nothing here is sealed.

## 0 · Why this exists

On 9 November Claude chat made Irwin's progress bar and a handoff for it. Both were saved only in Jon's
claude.ai project, never in the repo, so Claude Code has never seen them. Jon, 14 Nov: "Code doesnt see it".

This handoff brings them in and says how to fit the bar to the game **as it is built today**. Where the
9 Nov handoff disagrees with this one, this one wins (the game's tally screen changed after 9 Nov).

Files put in the repo with this handoff:

| File | What it is |
| --- | --- |
| `docs/irwin-progress-bar.html` | The bar. One file, about 26 KB, no build step. Parked in `docs/` so no publish ships it by accident. |
| `docs/handoff-2026-11-09.md` | The first handoff, as Jon approved it on 9 Nov. Read for the look; read this file for the wiring. |
| `docs/handoff-2026-11-14-irwin-bar.md` | This file. |

Preview of the bar: https://claude.ai/artifact/DjMJwZekYDcYdzQVKbgAtC (or open the file with no query string).

## 1 · What Jon decided (9 Nov, unchanged)

- One 16:9 screen on the Parlour TV while the picks are counted (cue 20).
- Irwin's bar in the top third. The cards come and go one at a time in the space underneath.
- Irwin runs, chasing the butterfly. In the middle he does a play bow, the butterfly over his nose.
  At 100% the butterfly flies off and he stops to watch it.
- Irwin is small (about 8% of the bar). He keeps his nose on the butterfly.
- Made in code: traced from Jon's own picture. No video, no Lottie.
- Colours: Irwin `#CD6300`, butterfly `#6BE4CF`, background `#001925`, text `#F1E8D6`.

## 2 · What the game does today (read from the code on 14 Nov, 3516de0)

- `Finale` in `play/src/screens/Kiosk.jsx`: for stage `stats` and `awards` it shows the crest
  "While the Manor counts", `CalcBar` (a plain green bar, CSS), then `StatsReel` or `AwardsReel`.
- `functions/lib/finale.js` `FINALE_SCHEDULE = { stats: 0, awards: 34_000, graph: 50_000, names: 80_000 }`.
  The awards part grows with the number of achievements (three seconds each).
  At `graph` the TV shows "W-O-O-F News · Breaking news from Sirwin Manor. Stay tuned." Jon presses
  the first name from `names` (80 s).
- `countingBar(finale, now)` in `play/src/lib/finale.js` gives `{ span, t }`: how long the bar runs and
  how far it has got, holds taken out. `CalcBar` uses it with `useAnchored`.
- The cards that exist: `finale.stats` (`{label, value, showAt}`: the four Canon stats, plus the hush
  line on a night it fired) and `finale.achievements` (`{title, name, line, showAt}`: the ones the host
  gave). The end-credit awards and the arcade scores are in the credits, not here. Leave them there.

## 3 · The build (site only, no server change)

Swap `CalcBar` and the two reels for the bar, on the stats and awards stages only. Nothing else moves.

1. **Move the file** to `play/public/irwin-progress-bar.html`. Load it as
   `${import.meta.env.BASE_URL}irwin-progress-bar.html?embed=1` in an iframe that fills the Parlour TV.
   No border, no scrollbars, `pointer-events: none`.
2. **Its clock** is `countingBar(finale, now)`: `seconds = span / 1000`, `elapsed = t / 1000`.
3. **The cards**, in this order, plain text:
   - each stat: `{ tag: '', title: s.label, detail: s.value }`
   - each achievement: `{ tag: 'Achievements', title: a.title, detail: a.name }` (add `a.line` to
     `detail` after " · " if it has one).
   No new words. Nothing about roles is added; the finale doc is already public.
4. **Start it once, not on every redraw.** The Parlour TV redraws four times a second. Post
   `{ type: 'irwin:start', seconds, elapsed, cards }` to the frame when it loads, and again only when
   the key changes. Use the same key `CalcBar` uses
   (`${ms(finale.at)}|${span}|${finale.held ?? 0}|${finale.holdAt ? ms(finale.holdAt) : 'run'}`).
   This is the 14 Nov lesson (`anchored`): a start handed over on every redraw makes it run wrong.
5. **A hold** (`finale.holdAt`): post `{ type: 'irwin:progress', p: t / span }`. That freezes the bar where
   it stands. On the carry-on the key changes, so step 4 starts it again from the right place.
6. **The end:** ignore `irwin:done`. The stage moves to `graph` on the server's clock as now, and the TV
   shows the W-O-O-F News card as now. Jon still presses the names. No new cue.
7. **Fallback:** if the frame has not posted anything back or fails to load, show today's `CalcBar` and
   reels. Keep them in the code. The bar is safe to cut; the reveal is not.
8. **The font:** the file asks Google Fonts for Source Serif 4 and falls back to Georgia. It may stay.
   If the house's network is slow it just uses Georgia.
9. **The preview** (`/play/?look=1`) gets one more view of it with stand-in cards, if that is quick.

Do not change `FINALE_SCHEDULE`, the server, the rules or the names' timing for this.

## 4 · Open question for Jon (decision card `tallyLength`)

On 9 Nov Jon said the bar loads for **two minutes**. Today the counting runs about **50 seconds**
(34 s of stats, then the achievements, then the W-O-O-F News card until 80 s).

- **Default built: keep today's timing.** The bar fills in the time the counting already takes.
  Site only, nothing new on the server the day before the party.
- Two minutes means changing `FINALE_SCHEDULE` (and `names` after it) and a full deploy. Only on Jon's word.

The other two cards from 9 Nov are settled by what is built: `tallyCut` (Jon presses the names, as now)
and `tallyDial` (the dial's journey stays after the reveal, as now). Mark them answered.

## 5 · Checks before Jon says publish

- `play/test`: a test that the cards are built from `finale.stats` then `finale.achievements`, and that
  the start message is sent once per key, not once per redraw.
- In Chrome, with the Parlour TV's redraws on (as the 14 Nov film tools do): the bar fills in `span`,
  not half of it; a reload halfway lands halfway; a hold stands still; a carry-on goes on from there.
- The longest stat value and the longest achievement name fit at 1920 × 1080.
- `media/renders/tools/`: film the reveal again and send Jon a clip under 30 MB, so he sees it before
  the night.
- `docs/on-the-night.md`: one line saying the TV shows Irwin's bar while the Manor counts.

## 6 · End of session (HOW WE WORK)

The ADDITIONS migration (a card for this job, done when built; `tallyLength` as a decision card for Jon;
`tallyCut` and `tallyDial` answered), `docs/sessions.md`, Start Here's snapshot, a short report to Jon.
Commit. Publish only on Jon's word, with `firebase deploy --only hosting` from the checked folder as the
12 Nov note says, keeping the last build's hashed files for screens left open.
