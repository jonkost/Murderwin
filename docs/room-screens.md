# The room screens

What the Parlour TV, the iPads, Boo's wall, the bedroom screen and the
study screen show at every beat of the night, and the sound that goes with
it. Written 18 October 2026, brought up to date 24 October 2026 for the
23 October handoff (the Parlour, the four Act 4 games and their names, the
device table, the bulletins as video), on 25 October for Boo's camera
and the motive card pictures, and on the evening of 25 October for Jon's
cue list: the join code on the Parlour TV through Act 1 and at the dinner
wrap-up, the dessert chime, and The End; and later that evening for the
screens themselves: a looping graphic on every idle screen, each room's cat
code during the Act 2 cat visits, the Act 4 rules cards with the cats' full
pictures, the Happy Birthday Irwin card with Sir Irwin's picture, the rejoin
code under the ballot clock, and the Orangerie's screen on the brain's
browser; and on 26 October for the devices in your cue list's key: your iPad
Pro's four stations, Jenna's iPad Pro as Boo's camera, and Susan's MacBook
Pro on the projector all night. Everything on this page
is safe to read: no screen ever shows who did it, who died, which motive is
live, or which way the hidden pair have pulled.

## Where each screen lives

| Address | Screen | What it does |
|---|---|---|
| `?kiosk=living` | The Parlour TV (your work MacBook Pro) | Everything below: the join code through Act 1 and at the dinner wrap-up, the Parlour's loop whenever nothing else is up. In the drawing the four names show here; the host taps the room's guess on their phone, and a tap here still counts, the fallback. |
| `?kiosk=ipad` | Your iPad Pro, its first two stations: in the Library with Zimothy in Act 2, then on its stand in the Orangerie for Act 3 (carried there on the way in to supper) | The words of W-O-O-F News bulletins 1 and 2, kept up through supper; Zimothy's code during the Act 2 cat visits; the Library's loop whenever it has no words to show. In Act 4 it is the memory match (`?kiosk=memory`, below), and from Act 6 the bedroom screen (`?kiosk=bedroom`). |
| `?kiosk=orangerie` | The brain's own browser (your M3 Air), in the Orangerie | Salem's code during the Act 2 cat visits; in Act 4 the rules card for Get Off My Lawn! with Salem's line and the room's code (the game itself runs on the group's phones); its loop otherwise, if you make one. |
| `?kiosk=study` | The study screen on the M1 Air | Granolia's Lightbulb Moment (the light puzzle) and Granolia; her code during the Act 2 cat visits; her rules card between groups in Act 4; the Study's loop outside Act 4. |
| `?kiosk=memory` | Your iPad Pro, back on its small stand in the Library with Zimothy, Act 4 (its third station; the older family iPad only if you answer *olderIpad* that it stays) | In Duplicate (the memory match): three boards of 6, 10 and 14 pairs, all fourteen traces as art, with file-folder backs. Clearing the third crosses one wrong motive off that group's list. Between groups, Zimothy's rules card; outside Act 4, the Library's loop. |
| `?kiosk=memory&play=1` | Any iPad or computer, any day | In Duplicate on its own, just for fun: three fresh boards, no case, no clues, nothing sent. |
| `?kiosk=boo` | Susan's work MacBook Pro and the projector on the upstairs landing, all night; it never moves. The projector hangs off a smart plug the brain switches: off for the blackout and the drawing, on again when the power returns and for the ballot | Its loop from Act 1 (Sir Irwin's portrait and Boo walking), Boo's code during the Act 2 cat visits, Boo's Catwalk on the triangle wall above the Parlour opening in Act 4 with her rules card between groups, black at The End. |
| `?kiosk=boo&practice=1` | The projector computer or any screen, any day (the workshop's Game test tab) | Boo's Catwalk as a practice show: started and stopped from the Game test tab, the real timing and Boo's verdicts, no night, nothing paid. The phones join it at `?practice=boo`. |
| `?kiosk=pose` | Jenna's iPad Pro on its stand at the end of the catwalk, facing the group, Act 4 (nice to have; Jenna is at the house to pack the bags and never plays) | Boo's camera: the group sees itself like a mirror, with Boo's STRIKE A POSE and HOLD IT, and one photo is taken a moment into each group's last pose, for the end credits. It asks for the camera once, with a tap. |
| `?kiosk=pose&practice=1` | Any iPad with a camera, any day (the workshop's Game test tab) | Boo's camera on the practice show: the photo stays on the iPad's own screen and is never sent. |
| `?kiosk=bedroom` | Your iPad Pro, carried into the bedroom after Act 4 (its last station), door closed, from Act 6 | Closed until the third picture is named, with the bedroom's loop behind "The door is closed"; then the trace and Sir Irwin's line for it. |

The Act 4 game in the Orangerie, Get Off My Lawn! (Salem's Motion Game),
runs on the group's own phones, and the Orangerie string lights follow if
they answer the brain; the brain's browser in the room (`?kiosk=orangerie`)
only explains it, with the rules card and the code to scan. The old iPhone 11
is the spare phone. The workshop's Devices page lists every screen with its
address and a square code.

*The loops* (your cue list: "unless otherwise cued, every active screen
shows a looping graphic"). Whenever a screen has nothing else to show it
plays its loop, a silent video you make, one file per screen in
`play/public/loops/` (`living.mp4` Sir Irwin in the Parlour, `study.mp4`
Granolia, `memory.mp4` Zimothy in the Library, also on the iPad Pro,
`bedroom.mp4` Salem in the bedroom, `boo.mp4` Sir Irwin's portrait and Boo
walking for the projector; `orangerie.mp4` is optional). Until a file is in,
that screen shows its crest and a line instead, and nothing waits on it.
`play/public/loops/README.md` has the names and the rules for the files.

Every screen is dark from the blackout, through the five seconds and the
role cards, until the host's first Next in Act 2, and near-black with "One
moment" while the night is paused. At "The End" (the host's last Next, after
everyone's result) every screen goes black and stays black. On a rehearsal
night a big red REHEARSAL band runs across every phone and every room
screen, and every slot that would show a secret shows a stand-in in square
brackets.

## What the TV shows, beat by beat

- *Act 1.* The join code, big, with "Scan to join" (kind `join`), from the
  first beat to the blackout (*rulesDeckScreen*, answered by the cue list:
  the Parlour TV), with the Parlour's loop (or the crest) beside it. Every
  other screen plays its loop. At "The house rules" the intro video and the rules slides
  play from a second browser tab or a player on the same MacBook; switch back
  to the game tab for the next beat. The brain stops the music and dims the
  lights for them, and the **Sound test** chime is the host's.
- *Act 2, W-O-O-F News bulletin 1.* The opening, the one part that crosses
  off a wrong family, and the sign-off. Once you tick The bulletins are videos on the Game night page, they play as video with the TV's own sound (decided 23 October) and the brain plays only `chime-news`. Until then the brain plays `chime-news` and the recordings, and the TV shows the words. Each part is a file in `play/public/video`; a part
  with no file yet is skipped, and its words stay on the screen with a
  caption line under every video. The phones say eyes up. The iPad keeps the
  words up.
- *Act 2, the cat visits.* Sir Irwin's prompts: his picture and one idea for
  what to share, a new one every three minutes, in a fresh order each
  night, never the same one twice running. Sixteen prompts, all in
  `seed/bag-lines.json`; none ever names a clue word. They run while guests
  wait in the Parlour for their turn with a cat. Meanwhile each room's
  screen shows its cat's code (below, "The room screens in Act 2").
- *Act 3, bulletin 2.* Press Next on *Arm the bulletin* near the end of
  supper; your phone says only Armed. 3 to 5 minutes later it plays on the
  speakers (the Orangerie HomePod), the orangery iPad shows the words, and
  every phone gets a notice. It points at the real family, plainer the
  higher the dial.
- *Act 3, the dinner wrap-up.* The join code again, with "Need to rejoin?
  Scan here." (kind `join`), for anyone whose phone went to sleep over
  supper; the iPad keeps bulletin 2's words up, and every other screen is
  on its loop. Every phone asks for the
  motives to be crossed off from what has been learned so far. Everyone is
  back on their phone before Start Act 4.
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
  Nothing else: the old secret middle line is gone (23 October). Before him,
  the dessert chime plays on every HomePod and every phone shows the Happy
  Birthday Irwin card over its cake notice (25 October: one of Sir Irwin's
  five full pictures and "Happy Birthday, Sir Irwin!" above the words); while
  the cake is served, **Cake!** on the Host tab puts the Happy Birthday
  Irwin card on the TV (kind `birthday`: his full picture, a different one
  each press, and the words) until his beat; pressed once his
  countdown is up, it plays the song and leaves his cards on the screen.
  After him, at "Update your motives", the TV goes back to its idle screen
  and every phone asks for the crossings-off to be brought up to date.
- *Act 6, Sir Irwin Needs a Hand (the Relay Drawing).* Irwin's seven rules
  slides, each up long enough to read (about 5 seconds plus 0.4 seconds a
  word); the first carries the game's name and its line ("Three drawings
  open the door. He only has paws."), and slide 3 shows the practice
  smiley's B1 square. Each turn, only the called player's portrait and
  character name while they walk to the paper in the Library, then a black
  screen with one white square and its label (the walk allows twenty
  seconds, and the host's **At the paper** ends it sooner). After each
  picture, four names to agree on; the room tells the host, who taps the
  guess on their phone (a tap here still counts, the fallback): a wrong pick
  is crossed off and the room waits ten seconds before guessing again.
  Practice smiley, then 3 by 3, 4 by 4, 5 by 5.
- *Act 6, the door.* Irwin's "Pawsome!" slide above "The door is open". The
  hall light goes green and the bedroom screen shows the trace. If the
  bedroom screen has died, press **Show the trace on the TV** on the Host tab: after
  ten seconds the TV shows the trace, the same as the bedroom would.
- *Act 6, the deduction round* (after the door opens: settled by default,
  you may change it), *and the Act 7 ballot.* The board: every character at
  the party with the thing they struck out beneath. A phone that chose nothing gets a strike picked for
  it, and the board shows it the same way as everyone else's. During the
  ballot the TV adds the two-minute clock and the trace, if there is one,
  and a small rejoin code under the clock, "Need to rejoin? Scan here.", for
  a phone that went to sleep (cue 19).
- *Act 7.* The stats and the achievements you gave during the night, while
  the Manor counts. Then W-O-O-F News. Each name you press plays the next
  part of the closing bulletin (as video on the TV once The bulletins are videos is ticked on the Game night page; until then the brain plays the recording and the TV shows the words), then shows its card (Murderer, Motive, Victim) once that part has played; the motive's card carries its picture once drawn. Then the closing story, the dial's
  journey, the end credits (with the end-credit awards, which show only
  here, and Boo's Catwalk: each group's last pose from Boo's camera, when
  it took one), and Irwin's "Can we play again?" Through the reveal every
  guest's phone is locked on "Eyes on the screen."; through the credits it
  shows its own result with "Thank you for playing."; the two host phones
  keep their tabs.
- *The End.* The host's last Next, after everyone's result (25 October, cue
  23): the TV goes black (kind `black`), every other screen goes black with
  it and the projector is off, and every phone opens up for good with
  everything readable, the result kept on its Now tab.

## The room screens in Act 2

During the cat visits (the "cat" beat of Act 2) every room screen shows its
cat's square code, big, with "<the cat>, in <the room>. Scan when your phone
calls you.": Granolia's on the study screen, Zimothy's on the iPad Pro in the
Library, Boo's on the wall from the projector, Salem's on the brain's browser
in the Orangerie. It is the same address as the printed code
(`/play/?meet=<cat>`), so a guest the phone has called scans the wall and
reads the cat. The printed codes from the Game night page stay as the
fallback: a screen that has died, or the projector still warming up, costs
nothing. The code comes off the screens when the beat moves on to supper.

## The Act 4 room screens

Each shows the game's name, with its line under it, at the top (Jon,
24 October). Between groups each room's screen shows the game's rules card
(25 October, the cue list): the name and its line, the host's words in the
cat's voice (Granolia's, Zimothy's, Salem's or Boo's, the same words the
phones carry: a host line changed in the workshop reaches the Study's and the
Library's cards as it reaches the phones), a full picture of the room's cat,
which changes with the group
due or the round so it is not the same picture all night, and the room's
code with "Scan the code to begin." The study shows it whenever Granolia is
idle in Act 4, with her own "Touch any panel to begin" under it; the Library
between groups; Boo's wall between groups and
through her intro (with her walking frames for the picture, and no code,
since the group has scanned); the Orangerie
all through Act 4, since its game is on the phones (its code only between
groups). Outside Act 4 every one
of them is on its loop.

- *The study, Granolia's Lightbulb Moment.* Granolia, the three jewels for
  the pairs found, the round and pattern, the ten-minute clock, and what
  Granolia says. `docs/study-light-game.md` has it all.
- *The Library, In Duplicate.* "Sir Irwin scattered his files. Match every
  copy. He bills by the pair." Zimothy's line for the round, then the board:
  turn two folders at a time. Three rounds: 6, 10 and 14 pairs. After the
  third, "Order. Restored." and the reward goes to the group's phones.
- *The Entryway, Boo's Catwalk.* "When the music stops, strike a pose.
  She's always judging." Boo struts across the wall to runway music (a
  simple beat, or `play/public/boo/catwalk.mp3` if you add one). When the
  music stops: STRIKE A POSE, then HOLD IT with a five-second count, then
  Boo's verdict. Three poses, then "That's the show, darling." and the
  reward on the phones. Boo's camera on Jenna's iPad Pro, if it is up,
  follows the same show and takes its photo at the third pose.
- *The Orangerie, Get Off My Lawn!* The group's phones tint their whole
  screen red (shake) or green (freeze), with Salem's lines. The brain's
  browser in the room (`?kiosk=orangerie`) shows the rules card and the code
  to scan, and "Eyes on your phones." while a group plays.

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

Nine cue sounds, one file each in `media/`, plus bulletin 2's recordings.
Only two are required: `chime-phone` (the chime: the **Sound test** during
the rules, when supper is ready, when Act 4's groups come up and at every
Act 4 round, when dessert is ready, and as the Act 6 Parlour Games open) and
`blackout`. The other chimes (the news,
Sir Irwin, bulletin 2's sounder) play the chime's file when their own is
missing, and the four stings are optional, silent while no file is in. There
is no power sound since 25 October: the music coming back is the cue.
`media/README.md` lists them all, how to name them, and the
one-second-of-silence rule. The brain plays them through the speakers, with
the music dipped under them. A recording with no file yet is skipped; the
words are on the screen anyway. Until you have recorded them,
`node scripts/make-placeholder-sounds.mjs` makes a different little tone for
each. Bulletin 1 and the closing bulletin are video on the TV, with the TV's
own sound, once the videos are in and you tick The bulletins are videos on
the Game night page. Until then the brain plays the recordings and the TV
shows the words.

---

## For Claude Code (technical)

*The cue list's screens (25 Oct 2026, DESIGN section 6).* Pure rules in
`play/src/lib/rooms.js`, tested in `play/test/rooms.test.mjs`: `LOOP_OF` /
`loopFor(which)` / `loopUrl(which, base)` (the loop file per kiosk; `ipad`
plays `memory`, `pose` none); `ROOM_CODE_CATS` / `roomCode(which, night)`
(the cat whose code a kiosk shows, only while `night.act === 2 && beat ===
'cat'` and never while the night is paused, when the TV and the iPad show One
moment); `meetUrl(cat, PLAY_URL)` (the printed codes' address) and
`codeWords(cat)`; `CAT_PICTURES` / `catPicture(cat, key)` /
`catPictureUrl(cat, key, base)` (the household's full pictures by their real
file names, `' Boo 5.png'` included, URL-encoded, varied by a stable hash
`variant(key, n)` of the group id, the round or a time stamp); `ROOM_GAME`
and `RULES_LINES` (the hosts' lines copied from `functions/lib/hosts.js`
HOST_LINES for the Study and the Library, Salem's and Boo's intros from the
phones), with `rulesLine(id, content)` putting the workshop's `HOST GRANOLIA`
or `HOST ZIMOTHY` line first, read from the published `public/content` the
study and memory kiosks subscribe (the same order as `hostLine` on the
server, so the cards say what the phones say; Salem's and Boo's HOST lines
are other moments' and never reach their cards). The square is
drawn by `play/src/lib/qr.js` `useQr(text, width)` (moved out of Host.jsx,
which re-exports it). `play/src/lib/screen.js`: `livingView` returns `join`
for kind `join` (never on the iPad, which keeps its words or its crest);
`roomDark(night, screen)` is also true once the night is over
(`nights/{id}.over` or Act 7's `end` beat, `isOver`) and on a black screen
doc with no title, so every kiosk goes black at The End through the one
rule. `play/src/screens/Rooms.jsx`: `Loop` (a muted looping `<video>` shown
from `onLoadedData`, which also calls `play()`; transparent with `opacity: 0`
rather than `display: none` until then, since Safari autoplays only a video
it counts as on screen; its children until the first frame and on `onError`;
never a fetch), `Idle({ title, line, loop })` (moved here from Kiosk.jsx),
`RoomCode`, `SmallCode`, `RejoinCode`, `JoinScreen`, `RulesCard({ id, line,
pick, code, frame })`, `BirthdayScreen`, `Orangerie({ night, salem })` (busy,
"Eyes on your phones." and no code, while `public/salem.state` is intro,
playing or passed); `MemoryRounds` (now takes `content`), `BooRunway` (now
takes `night`; `code={!!night}` so the practice show has no code, and
`code={false}` on her intro) and Kiosk.jsx's `Study` (now takes `night` and
`content`; its rules card keeps Granolia's IDLE line and the "station has
gone quiet" warning) and `Bedroom` use them. Kiosk.jsx subscribes
`public/salem` for the orangerie kiosk and `public/content` for the memory
kiosk too, and dispatches `roomCode` before the room branches and
`Orangerie` before the Living fallback; its `Bell` takes `silent`, true for
the orangerie kiosk, so the brain's browser never chimes through the
HomePods on top of the real sound. `play/src/lib/house.js` MACHINES gains
`kiosk-orangerie` and `kiosk-pose`. `Cards.jsx` `Notice` draws `card.image
=== 'birthday'` (`Birthday`). `play/public/loops/README.md` lists the files;
`.gitignore` keeps the files themselves out of the repo (`play/public/loops/*`,
the README kept), so they deploy from Jon's Mac like the sounds in `media/`.

`functions/lib/screen.js` writes two public docs any phone may read:

- `nights/{id}/public/screen` `{ kind, title, lines[], at, holdMs, rehearsal, act, beat, captions, choices?, mood?, parked?, prompts?, video? }`,
  kind one of `idle | black | news | bulletin | irwin | board | door | trace | prompts | title | birthday | join`
  (`birthday` is written only by the Cake! host command, `screen.birthday`, never by a beat;
  `join` is written by every Act 1 beat and by Act 3's `wrap`, with the words from `screen.JOIN_CARDS`
  beside a square the TV draws itself from the play address, so the doc carries no address; `black` is
  also the `end` beat's screen, and `nights/{id}.over` is true from The End until a Back or an act jump).
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
precedence, `roomDark(night, screen)`, `captionsOf`, `doorStage`, `doorSlideOf`, `slideAt`,
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
`play/src/lib/rooms.js`) and the 25 Oct ones (`Loop`, `Idle`, `RoomCode`,
`SmallCode`, `RejoinCode`, `JoinScreen`, `RulesCard`, `BirthdayScreen`,
`Orangerie`). The boo kiosk reads `public/boo` (the show's
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
host-house | host-house-window | host-house-act2 | kiosk-join | kiosk-rejoin |
kiosk-code-study | kiosk-code-library | kiosk-code-entryway |
kiosk-code-orangerie | kiosk-rules-study | kiosk-rules-library |
kiosk-rules-entryway | kiosk-boo-intro | kiosk-rules-orangerie |
kiosk-birthday | kiosk-loop-living | kiosk-loop-ipad | kiosk-loop-study |
kiosk-loop-memory | kiosk-loop-boo | kiosk-loop-bedroom |
kiosk-loop-orangerie | kiosk-quiet | kiosk-end`. The list grows as screens
are added: `KIOSK` in `Preview.jsx` is the source.
