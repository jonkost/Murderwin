# The room screens

What the Parlour TV, the iPads, Boo's wall, the bedroom screen and the
study screen show at every beat of the night, and the sound that goes with
it. Written 18 October 2026, brought up to date 24 October 2026 for the
23 October handoff (the Parlour, the four Act 4 games and their names, the
device table, the bulletins as video), and on 25 October for Boo's camera
and the motive card pictures. Everything on this page
is safe to read: no screen ever shows who did it, who died, which motive is
live, or which way the hidden pair have pulled.

## Where each screen lives

| Address | Screen | What it does |
|---|---|---|
| `?kiosk=living` | The Parlour TV (your work MacBook Pro) | Everything below. In the drawing the room taps its guesses here. |
| `?kiosk=ipad` | Your iPad Pro on a stand in the Orangerie, Acts 2 and 3 | The words of W-O-O-F News bulletins 1 and 2, kept up through supper. In Act 4 it becomes Boo's camera (below) or a spare screen. |
| `?kiosk=study` | The study screen on the M1 Air | Granolia's Lightbulb Moment (the light puzzle) and Granolia. |
| `?kiosk=memory` | The older iPad, on a small stand in the Library with Zimothy, all night | In Duplicate (the memory match): three boards of 7, 10 and 14 pairs, all fourteen traces as art, with file-folder backs. Clearing the third crosses one wrong motive off that group's list. |
| `?kiosk=memory&play=1` | Any iPad or computer, any day | In Duplicate on its own, just for fun: three fresh boards, no case, no clues, nothing sent. |
| `?kiosk=boo` | Susan's work MacBook Pro and the projector on the upstairs landing, Act 4 | Boo's Catwalk on the triangle wall above the Parlour opening. |
| `?kiosk=boo&practice=1` | The projector computer or any screen, any day (the workshop's Game test tab) | Boo's Catwalk as a practice show: started and stopped from the Game test tab, the real timing and Boo's verdicts, no night, nothing paid. The phones join it at `?practice=boo`. |
| `?kiosk=pose` | Your iPad Pro on its stand at the end of the catwalk, facing the group, Act 4 (nice to have) | Boo's camera: the group sees itself like a mirror, with Boo's STRIKE A POSE and HOLD IT, and one photo is taken a moment into each group's last pose, for the end credits. It asks for the camera once, with a tap. |
| `?kiosk=pose&practice=1` | The iPad Pro, any day (the workshop's Game test tab) | Boo's camera on the practice show: the photo stays on the iPad's own screen and is never sent. |
| `?kiosk=bedroom` | Susan's work MacBook Pro again, carried into the bedroom after Act 4 | Closed until the third picture is named, then the trace and Sir Irwin's line for it. |

The Act 4 game in the Orangerie, Get Off My Lawn! (Salem's Motion Game),
has no room screen: it runs on the group's own phones, and the Orangerie
string lights follow if they answer the brain. The old iPhone 11 is the
spare phone. The workshop's Devices page lists every screen with its
address and a square code.

Every screen is dark from the blackout until the first beat of Act 2, and
near-black with "One moment" while the night is paused. On a rehearsal
night a big red REHEARSAL band runs across every phone and every room
screen, and every slot that would show a secret shows a stand-in in square
brackets.

## What the TV shows, beat by beat

- *Act 1.* The act name. The rules deck and the join code show in a second
  browser tab on the same MacBook; switch back to the game before the
  blackout.
- *Act 2, W-O-O-F News bulletin 1.* The opening, the one part that crosses
  off a wrong family, and the sign-off. Once you tick The bulletins are videos on the Game night page, they play as video with the TV's own sound (decided 23 October) and the brain plays only `chime-news`. Until then the brain plays `chime-news` and the recordings, and the TV shows the words. Each part is a file in `play/public/video`; a part
  with no file yet is skipped, and its words stay on the screen with a
  caption line under every video. The phones say eyes up. The iPad keeps the
  words up.
- *Act 2, the cat visits.* Sir Irwin's prompts: his picture and one idea for
  what to share, a new one every three minutes, in a fresh order each
  night, never the same one twice running. Sixteen prompts, all in
  `seed/bag-lines.json`; none ever names a clue word. They run while guests
  wait in the Parlour for their turn with a cat.
- *Act 3, bulletin 2.* Press Next on *Arm the bulletin* near the end of
  supper; your phone says only Armed. 3 to 5 minutes later it plays on the
  speakers (the Orangerie HomePod), the orangery iPad shows the words, and
  every phone gets a notice. It points at the real family, plainer the
  higher the dial.
- *Act 4, Behind Closed Doors.* After the two-minute warning, the title
  card: "Act 4 · Behind Closed Doors" and "Look at your phone and find your
  group." It is silent; the brain changes the music. Then, through every
  ten-minute round, Sir Irwin's prompts again, for whoever is waiting in the
  Parlour.
- *Act 5, Sir Irwin's countdown.* Irwin in one of his five moods, his
  opener, the line that says how sure he is, five to one motive cards (five
  at dial 1, one at dial 5, the real one always among them), and his closer.
  Each card shows its picture (`play/public/motives/<number>.png`) beside
  the rhyme once it is drawn; until then the rhyme alone.
  Nothing else: the old secret middle line is gone (23 October).
- *Act 6, Sir Irwin Needs a Hand (the Relay Drawing).* Irwin's seven rules
  slides, each up long enough to read (about 5 seconds plus 0.4 seconds a
  word); the first carries the game's name and its line ("Three drawings
  open the door. He only has paws."), and slide 3 shows the practice
  smiley's B1 square. Each turn, only the called player's portrait and
  character name while they walk to the paper in the Library, then a black
  screen with one white square and its label. After each picture, four names
  to agree on and tap here: a wrong pick is crossed off and the room waits
  ten seconds before guessing again. Practice smiley, then 3 by 3, 4 by 4,
  5 by 5.
- *Act 6, the door.* Irwin's "Pawsome!" slide above "The door is open". The
  hall light goes green and the bedroom screen shows the trace. If the
  bedroom screen has died, press **Show the trace on the TV** on the Host tab: after
  ten seconds the TV shows the trace, the same as the bedroom would.
- *Act 6, the deduction round* (after the door opens: settled by default,
  you may change it), *and the Act 7 ballot.* The board: every character at
  the party with the thing they struck out beneath. A phone that chose nothing gets a strike picked for
  it, and the board shows it the same way as everyone else's. During the
  ballot the TV adds the two-minute clock and the trace, if there is one.
- *Act 7.* The stats and the achievements you gave during the night, while
  the Manor counts. Then W-O-O-F News. Each name you press plays the next
  part of the closing bulletin (as video on the TV once The bulletins are videos is ticked on the Game night page; until then the brain plays the recording and the TV shows the words), then shows its card (Murderer, Motive, Victim) once that part has played; the motive's card carries its picture once drawn. Then the closing story, the dial's
  journey, the end credits (with the end-credit awards, which show only
  here, and Boo's Catwalk: each group's last pose from Boo's camera, when
  it took one), and Irwin's "Can we play again?"

## The Act 4 room screens

Each shows the game's name, with its line under it, at the top (Jon,
24 October), and waits for the next group between visits. Boo's wall shows the name only between groups and during her intro.

- *The study, Granolia's Lightbulb Moment.* Granolia, the three jewels for
  the pairs found, the round and pattern, the ten-minute clock, and what
  Granolia says. `docs/study-light-game.md` has it all.
- *The Library, In Duplicate.* "Sir Irwin scattered his files. Match every
  copy. He bills by the pair." Zimothy's line for the round, then the board:
  turn two folders at a time. Three rounds: 7, 10 and 14 pairs. After the
  third, "Order. Restored." and the reward goes to the group's phones.
- *The Entryway, Boo's Catwalk.* "When the music stops, strike a pose.
  She's always judging." Boo struts across the wall to runway music (a
  simple beat, or `play/public/boo/catwalk.mp3` if you add one). When the
  music stops: STRIKE A POSE, then HOLD IT with a five-second count, then
  Boo's verdict. Three poses, then "That's the show, darling." and the
  reward on the phones. Boo's camera on the iPad Pro, if it is up, follows
  the same show and takes its photo at the third pose.
- *The Orangerie, Get Off My Lawn!* No screen: the group's phones tint their
  whole screen red (shake) or green (freeze), with Salem's lines.

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

Ten cue sounds, one file each in `media/`, plus bulletin 2's recordings.
The tenth, `chime-phone`, rings when supper is ready, when Act 4's groups
come up and at every Act 4 round, and as the Act 6 Parlour Games open.
`media/README.md` lists them all, how to name them, and the
one-second-of-silence rule. The brain plays them through the speakers, with
the music dipped under them. A recording with no file yet is skipped; the
words are on the screen anyway. Until you have recorded the ten,
`node scripts/make-placeholder-sounds.mjs` makes a different little tone for
each. Bulletin 1 and the closing bulletin are video on the TV, with the TV's
own sound, once the videos are in and you tick The bulletins are videos on
the Game night page. Until then the brain plays the recordings and the TV
shows the words.

---

## For Claude Code (technical)

`functions/lib/screen.js` writes two public docs any phone may read:

- `nights/{id}/public/screen` `{ kind, title, lines[], at, holdMs, rehearsal, act, beat, captions, choices?, mood?, parked?, prompts?, video? }`,
  kind one of `idle | black | news | bulletin | irwin | board | door | trace | prompts | title`.
  `prompts` is `{ lines, order, startedAt, everyMs }` (`screen.promptsFor`,
  the order from `bagclues.promptOrder` on the case's screen seed, carried on
  from the previous prompts doc); the TV picks the line with
  `promptShown` (`play/src/lib/rooms.js`). `video: true` on a news doc (and
  on the finale's stage) means the TV plays the parts as video
  (`screen.bulletinVideo`, `meta/game.bulletinVideo === true`, the Game night page's box; off by default so a night before the videos exist keeps the recordings); the doc
  never names a clip, the TV finds each part in the open bank by its words.
  `struck` is never written any more (the struck-motives bulletin is gone).
  `run.enterBeat` calls `screen.onBeat` after the beat moves (the
  beat's `screen` and `sound` fields in `seed/night.json`); the blackout,
  pause and resume commands and the power command call `screen.onPhase`
  (pause parks the previous doc under `parked`, resume restores it).
  `checkScreen` refuses any doc carrying a key in `FORBIDDEN_SCREEN_KEYS`
  at any depth before it is written, and the night-walk test asserts the
  same plus the fake players' public-doc tokens at every step.
- `nights/{id}/public/sounds` `{ current: { id | null, at, clips?, video? } }` via
  `screen.play`: `id` from `SOUND_IDS` (ten since 24 Oct, `chime-phone` the
  tenth), or null with clips only (the closing bulletin). `video: true`
  tells the relay to ring the id and skip the clips. Since 23 October the clips go out as codes keyed on the station
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
`Study`, `Dark`, `OneMoment`, `Wake`, `Bell`, `StaleDot`), and
`play/src/screens/Rooms.jsx` the 23 Oct screens (`Prompts`, `TitleCard`,
`BulletinVideo`, `MemoryRounds`, `MemoryStandalone`, `BooWall`, and
`GameName`, which reads `seed/game-names.json` through `GAME_NAMES` in
`play/src/lib/rooms.js`). The boo kiosk reads `public/boo` (the show's
schedule from `act4.booShow`) and calls `booDone`; the memory kiosk reads
`public/memory` and calls `memoryStep` per cleared board. The living kiosk
and the iPad subscribe to `public/content` for the character names on the
board; the study kiosk for Granolia's lines. Previews (`play/src/Preview.jsx`
`KIOSK`): `?preview=kiosk-news | kiosk-rehearsal | kiosk-bulletin |
kiosk-irwin | kiosk-black | kiosk-paused | kiosk-board | kiosk-ipad | kiosk-living-done |
kiosk-living-hold | kiosk-living-rules | kiosk-living-turn |
kiosk-living-vote | kiosk-relay-called | kiosk-relay-square |
kiosk-relay-guess | kiosk-bedroom-closed | kiosk-bedroom-1 to
kiosk-bedroom-5 | kiosk-ballot | kiosk-ballot-no-trace | kiosk-study |
kiosk-study-fallback | kiosk-memory | kiosk-memory-clear |
kiosk-memory-standalone | kiosk-boo | kiosk-boo-pose | kiosk-pose | kiosk-prompts |
kiosk-title | kiosk-finale |
kiosk-finale-awards | kiosk-finale-graph | kiosk-finale-reveal |
kiosk-finale-leadin | kiosk-finale-victim | kiosk-finale-done |
kiosk-finale-journey | kiosk-finale-credits | kiosk-finale-last |
host-house | host-house-window | host-house-act2`. The list grows as screens
are added: `KIOSK` in `Preview.jsx` is the source.
