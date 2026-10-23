# The room screens

What the living room TV, the iPad, the bedroom screen and the study screen
show at every beat of the night, and the sound that goes with it. Written
18 October 2026, brought up to date 23 October 2026. Everything on this page
is safe to read: no screen ever shows who did it, who died, which motive is
live, or which way the hidden pair have pulled.

## Where each screen lives

| Address | Screen | What it does |
|---|---|---|
| `?kiosk=living` | The living room TV (your work MacBook Pro) | Everything below. In the drawing the room taps its guesses here. |
| `?kiosk=ipad` | The iPad Pro on a stand in the orangery, Acts 2 and 3 | The words of W-O-O-F News bulletins 1 and 2, kept up through supper. |
| `?kiosk=memory` | The same iPad Pro, on a small stand in the Library with Zimothy, Act 4 | The memory match: six pairs of traces, with file-folder backs; clearing it crosses one motive off that group's list. |
| `?kiosk=bedroom` | The same iPad Pro, carried into the bedroom right after dessert | Closed until the third picture is named, then the trace and Sir Irwin's line for it. |
| `?kiosk=study` | The study screen on the M1 Air | Granolia and the light puzzle. |

One iPad Pro does three jobs in turn: the captions at supper, the memory
match in Act 4, then the bedroom. The older family iPad is the spare phone.

Every screen is dark from the blackout until the first beat of Act 2, and
near-black with "One moment" while the night is paused. On a rehearsal
night a big red REHEARSAL band runs across every phone and every room
screen.

## What the TV shows, beat by beat

- *Act 1.* The act name.
- *Act 2, W-O-O-F News bulletin 1.* The opening, the one line that crosses
  off a wrong family, and the sign-off. The brain plays `chime-news`, then
  the recordings. The phones say eyes up. The TV goes back to its crest at
  the next beat; the iPad keeps the words up.
- *Act 3, bulletin 2.* Press Next on *Arm the bulletin* near the end of
  supper; your phone says only Armed. 3 to 5 minutes later it plays on the
  speakers (the Orangerie HomePod), the orangery iPad shows the words, and
  every phone gets a notice. It points at the real family, plainer the
  higher the dial.
- *Act 5, Sir Irwin's countdown.* Irwin in one of his five moods, his
  opener, the line that says how sure he is, five to one motive cards (five
  at dial 1, one at dial 5, the real one always among them), and his closer.
  Nothing else: the old secret middle line is gone (23 October).
- *Act 6, the drawing.* Irwin's seven rules slides, each up long enough to
  read (about 5 seconds plus 0.4 seconds a word); slide 3 shows the practice
  smiley's B1 square. Each turn, only the called player's portrait and
  character name while they walk to the paper in the Library, then a black
  screen with one white square and its label. After each picture, four names
  to agree on and tap here: a wrong pick is crossed off and the room waits
  ten seconds before guessing again. Practice smiley, then 3 by 3, 4 by 4,
  5 by 5.
- *Act 6, the door.* Irwin's "Pawsome!" slide above "The door is open". The
  hall light goes green and the bedroom iPad shows the trace. If the bedroom
  iPad has died, press **Show the trace on the TV** on the Host tab: after
  ten seconds the TV shows the trace, the same as the bedroom would.
- *Act 6, the deduction round* (after the door opens: settled by default,
  you may change it), *and the Act 7 ballot.* The board: every character at
  the party with the thing they struck out beneath. A phone that chose nothing gets a strike picked for
  it, and the board shows it the same way as everyone else's. During the
  ballot the TV adds the two-minute clock and the trace, if there is one.
- *Act 7.* The stats and the achievements you gave during the night, while
  the Manor counts. Then W-O-O-F News. Each name you press plays the next
  part of the closing bulletin, then shows its card (Murderer, Motive,
  Victim) once that part has played. Then the closing story, the dial's
  journey, the end credits (with the end-credit awards, which show only
  here), and Irwin's "Can we play again?"

## The three corners of every screen

- *Tap once to wake.* A small note in the bottom right corner. Browsers will
  not play a sound until someone has touched the page; one tap anywhere on
  the page (or any key), then leave it. It never covers the screen, and it
  does not show while the room is dark, so a screen that reloads during the
  blackout stays black.
- *The bell.* Top right, for three seconds, whenever a sound is called for.
  The screen rings a small chime of its own at the same moment. If you see
  the bell and hear nothing from the speakers, the brain or the speakers are
  the trouble, not the night.
- *The dot.* Bottom left. Green while the screen can hear the house; amber,
  with how long since it last heard, when it has gone quiet for twenty
  seconds; red when it is off the wifi. Nothing on the screen ever covers
  the content. The Host tab shows a dot for each screen too, the memory match
  iPad included.

## The sounds

Nine cue sounds, one file each in `media/`, plus the W-O-O-F News
recordings. `media/README.md` lists them all, how to name them, and the
one-second-of-silence rule. The brain plays them through the speakers. A
recording with no file yet is skipped; the words are on the screen anyway.
Until you have recorded the nine, `node scripts/make-placeholder-sounds.mjs`
makes a different little tone for each.

---

## For Claude Code (technical)

`functions/lib/screen.js` writes two public docs any phone may read:

- `nights/{id}/public/screen` `{ kind, title, lines[], at, holdMs, rehearsal, act, beat, captions, choices?, mood?, parked? }`,
  kind one of `idle | black | news | bulletin | irwin | board | door | trace`.
  `struck` is never written any more (the struck-motives bulletin is gone).
  `run.enterBeat` calls `screen.onBeat` after the beat moves (the
  beat's `screen` and `sound` fields in `seed/night.json`); the blackout,
  pause and resume commands and the power command call `screen.onPhase`
  (pause parks the previous doc under `parked`, resume restores it).
  `checkScreen` refuses any doc carrying a key in `FORBIDDEN_SCREEN_KEYS`
  at any depth before it is written, and the night-walk test asserts the
  same plus the fake players' public-doc tokens at every step.
- `nights/{id}/public/sounds` `{ current: { id | null, at, clips? } }` via
  `screen.play`: `id` from `SOUND_IDS`, or null with clips only (the closing
  bulletin). Since 23 October the clips go out as codes keyed on the station
  key, never as clip ids, on any night with a key saved (`media/README.md`,
  technical). `sting-solved` is
  written by `run.studyFinished` on a solved outcome; `sting-door` by
  `relay.guess` in its done transaction (`relay.js`); the door beat is
  `soundOnce` so it does not ring twice.

W-O-O-F News (`functions/lib/news.js`, open bank `seed/woof-news.json`):
`bulletin1(c)` takes the family in `cases.solving.newsOut[0]`;
`bulletin2(c, band)` takes the real family's line at `dialBand(dial)`;
`closingParts()` lists the closing parts; `CLIP_IDS` is every recording. The
news screen shows `NEWS_FLASH_PLACEHOLDER` only when the case has no family
to cross off. There is no echo frame or fragment on any screen. Bulletin 2
is armed by the beat action `arm:bulletin` (`screen.armBulletin`, writing
`nights/{id}/private/bulletin` `{ armedAt, dueAt, played }`, the delay from
`bulletin2Delay` on the case seed); `screen.tickBulletin`, inside
`windows.tick`, plays it once when due (adding `playedAt` and `level`), and
the tick then deals `notice:bulletin` to every phone.

Sir Irwin (Act 5): `screen.irwinMotiveClue` gives `choices: [{ n, rhyme }]`
(`families.irwinOptions` / `irwinCount` by the dial band) and `mood` (the
band, which picks `household/full/Irwin 1.png` to `Irwin 5.png`), plus the
countdown line from `IRWIN_OPTION_LINES` (ui_copy `IRWIN FIVE` to
`IRWIN ONE` override). The screen's lines are the workshop's Irwin opener,
that line and the closer (`irwinVoice`: the first Irwin line in `openers`
and `closers`, else `DEFAULT_IRWIN`), through `dogFilter` for names. The
case has had no `irwin.lines` since 23 October: *secretLines* was answered
"Retire them", and the per-motive secret sets went with them.

The finale (`functions/lib/finale.js`): `stage` names the next card and
plays that card's closing parts with `play(db, nightId, null, { clips })`;
the TV releases the card at `finale.cardAt.<stage>`, once the lead-in
parts' `holdMs` have passed (`news.closingStage`; a hold pushes it back).
`tv-trace [off]` (run.js, commands.js) writes `public/cues.tvTrace`.

`play/src/lib/screen.js` holds the pure client rules (`livingView`
precedence, `roomDark`, `captionsOf`, `doorStage`, `doorSlideOf`, `slideAt`,
`boardRows`, `bellShown`, `soundFresh`, `dotState`, `heardText`), tested
under node in `play/test/screen.test.mjs`; `relayRules` and `showRules` are
still exported but no screen uses them. `play/src/screens/Kiosk.jsx` renders them
(`ScreenCard`, `IrwinFace`, `Captions`, `Board`, `DoorScreen`, `Bedroom`,
`TraceView`, `MemoryMatch`, `Finale` with `CalcBar`, `StatsReel`,
`AwardsReel`, `Credits`, `TugOfWar`, the drawing's `Portrait` and `Guess`,
`Study`, `Dark`, `OneMoment`, `Wake`, `Bell`, `StaleDot`). The living kiosk
and the iPad subscribe to `public/content` for the character names on the
board; the study kiosk for Granolia's lines. Previews (`play/src/Preview.jsx`
`KIOSK`): `?preview=kiosk-news | kiosk-rehearsal | kiosk-bulletin |
kiosk-irwin | kiosk-black | kiosk-paused | kiosk-board | kiosk-ipad | kiosk-living-done |
kiosk-living-hold | kiosk-living-rules | kiosk-living-turn |
kiosk-living-vote | kiosk-relay-called | kiosk-relay-square |
kiosk-relay-guess | kiosk-bedroom-closed | kiosk-bedroom-1 to
kiosk-bedroom-5 | kiosk-ballot | kiosk-ballot-no-trace | kiosk-study |
kiosk-study-fallback | kiosk-memory | kiosk-memory-clear | kiosk-finale |
kiosk-finale-awards | kiosk-finale-graph | kiosk-finale-reveal |
kiosk-finale-leadin | kiosk-finale-victim | kiosk-finale-done |
kiosk-finale-journey | kiosk-finale-credits | kiosk-finale-last |
host-house | host-house-window | host-house-act2`. The list grows as screens
are added: `KIOSK` in `Preview.jsx` is the source.
