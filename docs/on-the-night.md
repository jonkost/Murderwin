# On the night

Sunday 15 November 2026. Which machine does what, the order to start things
in, what you press and when, what each screen shows, how to tell each one is
alive, and what to do when something dies. Everything on this page is safe
for you to read: nothing here says who did what, and nothing you can press
shows you.

Written 17 October 2026, updated 23 October for the 22 October handoff and
your two decisions that day (the cats' secret lines retired, the Act 2 safe
taken out), and again on 24 October for the 23 October handoff: the living
room is the Parlour, all four cats talk to every guest in Act 2, Act 4 is
four game rooms, the bags are in, the game names, and the device table.
Updated again on the evening of 24 October: the workshop's Game test tab
(see "Trying the games" below) and the news team's cast (Susan plays Ava
Waves, you play Mic Cameron). Updated 25 October: the Home rows that count
the secrets, the motive card pictures,
replaying a rehearsal by its seed word, and the morning after. Updated 25 and
26 October for your cue list (`docs/cue-list.md`), the whole build: the
blackout ends on its own after five seconds, then the "Sorry for the
interruption" button and the role card's fifteen seconds; the hall bulb
green for the welcome, off in the blackout and red from the power's return;
nine sounds, two of them required; three Host tab buttons (**Sound test**,
**Cake!** and **At the paper**), the drawing's guess tapped on your own
phone and fifteen seconds a turn; the night's shape (the house rules beat
with the join code on the Parlour TV through Act 1, the dinner wrap-up and
the two motive prompts, the dessert chime and the Happy Birthday Irwin
card, the break line as Act 6 opens, the ballot as a card on the Now tab,
the thank-you lock through the credits, and The End); the screens (a
looping graphic on every idle screen once your files are in, each room's
cat code on its screen during the Act 2 cat visits, the Act 4 rules cards
with the cats' pictures, the Happy Birthday Irwin card with Sir Irwin's
picture, a rejoin code under the ballot clock, and the brain's browser as
the Orangerie's screen, `?kiosk=orangerie`); a Notes tab on every phone, a
box for each guest's own scribbles; and the devices in your cue list's key
(Susan's MacBook Pro never moves, the
brain switches the projector's plug, your iPad Pro roams through four
stations, and the older family iPad is
out unless you say it stays, the question *olderIpad*). The Host tab's six
scene buttons are the cue list's six scenes. Updated 29 October for your two
just-for-fun winners: Zimothy names who found the most pairs in In Duplicate,
and Salem who slipped least in Get Off My Lawn!, each on its room's screen.
Updated 11 November: Boo's camera is gone. Jenna's iPad has no job on the
night, the end credits have no photos, and nothing is left to set up for it.
Commands are typed like `npm test`. Buttons on your phone's Host tab are in
bold type. A test checks that every one of them exists. Your jobs before the
night are cards on the workshop's Timeline page; this page says how to do
them.

## Before the night

- *The secrets, in this order.* Three things are made blind: the cats'
  leans, the packing list and the drawing pictures. (Since 23 October there
  are no secret cat lines or documents to make.) First finish the lists they
  read: the bag items and the Parlour Games. The scripts need your Anthropic
  key and the service-account file in `scripts/.env` (copy
  `scripts/.env.example`). Each command prints counts and a PASS or FAIL
  line and nothing else; read only that line. Run them by Saturday
  31 October (the dates are on the Timeline), not in the last week: Jenna
  needs time to look.
  1. The packing list, for Jenna. Your final 24 bag items went into the
     workshop on 24 October (the 108 September items are retired, kept but
     not used). After the next deploy, open the workshop once so it loads
     them, then run `npm --prefix scripts run pack-bags -- --repack` once.
     It replaces the September packing and says only how many bags were
     packed, whether every rule passed, and whether every bag reached three
     clue words. Never an item. Run it again only if the bag items change.
  2. `npm --prefix scripts run leans` (which way each cat leans in the
     Parlour Games). Run it again after adding a Parlour Game; it fills only
     the new ones.
  3. `npm --prefix scripts run relay-pictures -- --practice`, then
     `npm --prefix scripts run relay-pictures -- --party` (the drawing
     pictures, made blind; you see only the practice ones, on a practice
     night, and no party picture shares a name with one). Until each has run,
     its nights' drawing uses stand-in pictures.
  4. Run this with no night running. First close the TV and the room
     screens, and keep your phone and Susan's off the game page until it
     says PASS or FAIL: the screens and phones follow the newest night, and
     this one shows the real drawing pictures. Then:
     `GOOGLE_APPLICATION_CREDENTIALS=scripts/service-account.json npm run fake-night -- --real-secrets --live --i-know-this-is-the-party-database`.
     Eight fake phones play a party night on the real leans, packing and
     drawing pictures, and throw the night away. It says "Case: party", and
     near the end a "Party secrets used" line of counts. The script joins
     only its eight fake players; nothing stops a real phone that is open on
     the game page from following along, so keep yours closed. While any
     night is live it refuses and says so.
  5. Tell Jenna: they look over the leans (if they want), press "Run the
     checks" on their page, and say "done" or "needs more". Jenna comes to
     the party (they do not play) and packs the ten bags at the house before
     the guests arrive, from their page.
- *How far the secrets have got.* The workshop's Home page has three rows
  under "The secrets, made blind": the packing list (made or not, and how
  many bags), the cats' leans (questions with a lean for every cat, of all
  of them) and the drawing pictures (good ones, of nine). Numbers only:
  nothing in them is ever shown to you.
- *The motive card pictures.* Nineteen drawings, one per motive, saved as
  `play/public/motives/1.png` to `19.png` by the motive's number ("The last
  of the pie" shows pizza). They show beside each motive in Sir Irwin's
  countdown and on the motive's card at the reveal. A motive with no
  picture shows its rhyme alone, so the game works with none, some or all
  of them. `npm run deploy` after adding them.
- *Sir Irwin's voice for the drawing.* `npm run irwin-voice` on the brain
  makes his eight lines (seven slides and the door) with the Mac's voice,
  silently, into `play/public/voice/`. To use your own voice instead, save a
  recording there with the same name and run it again; yours is never
  replaced (`play/public/voice/README.md`). Then `npm run deploy`.
- *Put the game live.* `npm run deploy`. This is the one line to run whenever
  Claude says a build is done. It builds the workshop and the phone client,
  refuses to go on if either came out empty, and then publishes the site, the
  rules and the server. Nothing goes live until you run it. The first deploy
  after 23 October asks whether to delete the function solve (it ran the old
  Act 2 safe): type y.
- *The Game night page* (in the workshop). Type both hosts' names, so you and
  Susan get the Professors. Type the names Jessa and Jake will type, for Sir
  Irwin's two seats. Print the four cat-room codes from the same page.
- *The key word.* Pick one word of four letters or more and save it once:
  at the top of the workshop's Game test tab (it works with no night
  running), or on a rehearsal night on your Host tab under The study with
  **Save key**. It is kept from night to night. The same word goes in
  `station/.env` on the study Mac and in `cues/.env` on the brain, each as
  `STATION_KEY=yourword`; Claude Code can put it there, or save the word
  the Macs already have, without showing it. Until it is saved the study
  station is turned away, and the brain needs it to find the W-O-O-F News
  recordings.
- *The nine sounds.* Nine cue sounds, one file each in `media/`, and only
  two of them are required: `chime-phone` (the chime: the **Sound test**
  during the rules, when supper is ready, when Act 4 starts and at every
  Act 4 round, when dessert is ready, and as the Act 6 Parlour Games open)
  and `blackout` (the thunder and the crash
  when Act 1 ends). The brain will not start while either of those two has
  no file. The other chimes (the news, Sir Irwin, bulletin 2's sounder) play
  the chime's file when their own is missing, so one recording serves every
  chime moment; the four stings (the study solved, the door, the reveal,
  the result) are optional and silent while no file is in. There is no
  power sound since 25 October: the music coming back is the cue. Until you
  have recorded them, run `node scripts/make-placeholder-sounds.mjs` once on
  the brain. It makes a stand-in tone for each (`media/README.md` lists what
  each one is for).
- *The recordings.* Bulletin 2 is sound: each line its own file in `media/`
  on the brain, named as `media/README.md` says, played on the HomePods at
  supper. Bulletin 1 and the closing bulletin are video on the Parlour TV
  (decided 23 October): one .mp4 per part in `play/public/video`, named as
  its clip in `seed/woof-news.json`, then `npm run deploy`, then tick The
  bulletins are videos on the Game night page. From then the TV plays them
  with its own sound and the brain does not play those recordings, so you
  never hear them twice. Until the box is ticked, the brain plays your
  recordings and the TV shows the words, as before.
  Who reads what (decided 24 October): Susan plays Ava Waves, the studio
  anchor. She reads bulletin 1's opening and sign-off on camera, all of
  bulletin 2, and the closing bulletin's studio opening and close. You play
  Mic Cameron, the field reporter: the closing bulletin's four parts outside
  the manor. Every line is in the W-O-O-F News Recording Script. Susan knows
  which family each bulletin 2 line points at, and you accepted that
  (*bulletin2Known*).
- *Try every game.* The workshop's Game test tab has every game of Acts 4
  and 6 and the Parlour Games, each to try on the device it runs on, with a
  box for telling Claude Code what to fix. "Trying the games" below says how.
- *Music and lights on the brain.* Three playlists in Apple Music on the
  brain, named Murderwin · Jazz, Murderwin · Intense and Murderwin · Credits
  (a hyphen in place of the dot works too), the song Happy Birthday for Dogs
  in its Music library for **Cake!**, and six scenes in the Hue app
  (Murderwin Default, Murderwin Dimmed, Murderwin Blackout, Murderwin
  Drawing, Murderwin Candles, Murderwin Study Dim). Turn them on with
  `MUSIC=on` and `HUE_SCENES=on` in `cues/.env`. The brain changes them as
  the night moves; `docs/cues-relay.md` has the table and the set-up steps.
  Nothing waits on music or a light.
- *Sydney's photo.* Save it as `play/public/household/sydney.jpg`, then
  `npm run deploy`. Without it his end-credits card shows his name only.
- *A dry run with nobody in the room.* `npm run fake-night`. Eight fake phones
  play a whole rehearsal night and throw it away. It says "Case: rehearsal",
  then one line per act, a tally, PASS. Nothing in what it prints is a clue.
- *A rehearsal on phones.* Open the game on your phone, tap "Host? Start the
  night", type your name, and press **Next** through the evening with Susan's
  phone and a spare joined. Every night you start is a rehearsal unless the
  Game night page's "This is the party night" box is ticked. A rehearsal
  night looks like the party night on every phone and room screen (no red
  band since 11 Nov); the Host tab says "This night is a rehearsal".
- *The hardware evening* (the first full tech run, Monday 2 to Friday
  6 November). Wall, the study's Stream Deck and bulb plugged in.
  `node scripts/hardware-check.mjs` prints PASS or FAIL (it checks the
  study's fifteen-key deck; the arcade's Stream Deck + XL on its own is a
  FAIL that names it). Then one run of the
  study and one grid of the drawing, the HomePods at party volume (the
  Orangerie one too, `media/README.md` says how), the Hue scenes, the
  Orangerie string lights through Apple Home (the three Shortcuts on the
  brain, `npm start -- --check-strings` in `cues/`; if a Shortcut's report
  says "partially succeeded", the lights changed but something else in its
  Home scene is not answering: open the scene in the Home app and take out
  whatever shows No Response; if they will not answer at all, stop there:
  the phones carry Salem's colours on their own), Susan's MacBook Pro in
  the Entryway on `?kiosk=boo` with the Stream Deck + XL (in Google Chrome;
  connect the deck once from the arcade's practice page in the same browser
  first, since the night's screen has no Connect button), and one visit of
  the arcade from the scan to the chime. The projector is out of the night
  since the arcade took the Entryway (5 Nov); the brain still switches its
  plug, which harms nothing. The
  checklists
  are in `docs/study-light-game.md`, `docs/relay-drawing-game.md` and
  `docs/cues-relay.md`.
- *The second full tech run*, by Wednesday 11 November: every machine on at
  once, Act 1 to Act 7. After it, no new features: checks and fixes only.
- *The square code.* Save it from the Game night page. Your Host tab shows it
  too, under The doors. Print the four room codes (Granolia in the Study,
  Salem in the Orangerie, Zimothy in the Library, Boo in the Entryway) from
  the same page: the same four codes serve Act 2 and Act 4. The Parlour TV
  shows the join code itself through Act 1 and again at the dinner wrap-up
  (*rulesDeckScreen*, answered by your cue list: the Parlour TV), and a small
  one under the ballot clock; at "The house rules" the Parlour TV plays the
  intro video and then the rules film by itself (since 11 Nov 2026: no second
  tab, nothing to switch), and the join code comes back after them. The join
  code is also printed at the door, the fallback. The room screens show their
  own cat's code during the Act 2 cat visits and on the Act 4 rules cards
  (the study screen, the iPad Pro in the Library, the projector, the brain's
  browser in the Orangerie); the printed codes are the fallback for a screen
  that has died or a projector still warming up.
- *Where every file goes.* `docs/media.md` is the one page: the sounds and
  recordings, the bulletin videos, the loops and Sydney's photo, each with
  its folder and its exact names. `npm run media` says what is in, what is
  missing and what is misspelt.
- *The postmortem.* Before any run, start the night log on the brain (`npm
  run night-log`; it only watches, and writes down the time of every move).
  After the run, ten minutes on the workshop's Postmortem page. Then tell
  Claude Code "do the postmortem". `docs/postmortem.md` has the three steps.
- *A night with three players.* Three players make one group in Act 4, so
  the Library crosses off one motive, not two or more, and the clues can
  leave two motives standing when Sir Irwin shows three cards. That is the
  size of the party, not a fault. With four or more it does not happen.
- *The loops.* Five silent looping videos, one per idle screen, dropped into
  `play/public/loops/` by their exact names (`play/public/loops/README.md`
  has the list: Sir Irwin in the Parlour, Granolia, Zimothy in the Library,
  Salem in the bedroom, Sir Irwin's portrait and Boo walking for the
  projector), then `npm run deploy:site`. Until a file is in, that screen
  shows its room's splash (its cat, alive, since 12 Nov 2026); nothing waits
  on them.
- *Freeze the workshop* when the lists are final, Thursday 12 to Saturday
  14 November. There is no fixed freeze date (see "The last days" below).
- Charge everything, the old iPhone 11 spare included. Spare phone chargers
  in the Orangerie.

## Which machine does what

| Machine | Its job | How it starts |
|---|---|---|
| The brain (your M3 MacBook Air) | The nine sounds, the W-O-O-F News recordings (only bulletin 2's once the bulletins are videos), the music (the playlists from the Music app, or since 31 Oct the music Shortcuts through Apple Home, one Home scene per setting, with the Study's and the Orangerie's own music in Act 4), the Hue scenes, the hall light, the projector's plug (off for the blackout, from the drawing's intro to the end of Act 6, and at The End; on again when the power returns and for the ballot) and the Orangerie string lights. The spare host. Its browser is the Orangerie's screen (`?kiosk=orangerie`): Salem's code in Act 2, the Get Off My Lawn! rules card between groups in Act 4 and Salem's board (the colour, the count, the slips) while a group plays, its loop otherwise. That browser shows the bell for every cue but rings nothing: the real sound comes from the brain itself. | Ethernet in, sleep off. `cd cues && npm start` in a terminal window you can see. It prints counts only, never a name. A browser, full screen, at `?kiosk=orangerie`, facing the Orangerie table. |
| The speakers (four HomePods) | Every sound, recording and the music, played from the brain: the Entryway, the Study, the Orangerie and the Parlour. | On the brain, choose the AirPlay group that includes the Orangerie HomePod as the sound output. |
| Your work MacBook Pro on the TV | The Parlour screen, all night: the join code in Act 1 and again at the dinner wrap-up (with the intro video and the rules film at The house rules, which it plays by itself), the blackout, bulletin 1, Sir Irwin's prompts while guests wait in Acts 2 and 4, the Act 4 title card, Sir Irwin's countdown, the drawing, the three questions over everyone's portraits while the room talks it over, the vote's clock and the reveal, then black at The End. In the drawing you tap the room's guess on your own phone; this screen's four names still take a tap, the fallback, so keep the trackpad within reach. | A browser, full screen, at `https://murderwin-at-sirwin-manor.web.app/play/?kiosk=living` |
| Study M1 Air | Granolia's Lightbulb Moment (the light puzzle) and Granolia's screen. | Double-click *Start the Study* in the Study station folder (it keeps the Mac awake and starts the station again if it stops), and a browser at `?kiosk=study`. Quit the Elgato app first. With its second screen plugged in (the question *studySecondScreen*; the default): the browser full screen on the second screen, facing the walls, and the station's window on the Mac's own screen. |
| Susan's work MacBook Pro | In the Entryway with the Stream Deck + XL on USB, all night, and it never moves (`?kiosk=boo`, since 5 Nov; the projector on the landing before): its loop from Act 1, Boo's code in Act 2, Miss Boo LaRue's Arcade in Act 4 (her rules card with the code between groups; the group that scans in plays its visit on the deck, the first two players get the group's clue about the Ghost on the screen and their phones, a trio's third gets Boo's line, and the chime ends it), its loop again, black at The End. | Google Chrome (Safari cannot reach the Stream Deck), the Stream Deck app quit, the sound on the Mac's own speakers, full screen, sleep off, lid open. Before the guests come, open the arcade's practice page from the Game test tab in the same Chrome and tap Connect the Stream Deck once: the night's screen has no Connect button and remembers the deck. Then open the address and tap it once. |
| Your iPad Pro | Roaming, four stations in turn. Act 2: in the Library with Zimothy, showing his code during the cat visits and bulletin 1's words (`?kiosk=ipad`). Act 3: on its stand in the Orangerie, bulletin 2's words through supper and the wrap-up (the same address). Act 4: back on its small stand in the Library as In Duplicate, the memory match (`?kiosk=memory`). From Act 6: the bedroom screen, door closed (`?kiosk=bedroom`). | From its Home Screen icons, so no Safari bars show. Once, before the night: open each of its three addresses in Safari, tap Share, then Add to Home Screen (if it asks, keep Open as Web App on), and name it: the Library (`?kiosk=ipad`, also supper), In Duplicate (`?kiosk=memory`), the bedroom (`?kiosk=bedroom`). On the night, open each station from its icon. Tap it once after each move. Three moves: to the Orangerie on your way in to supper, to the Library before **Start Act 4**, into the bedroom after Act 4. |
| The older family iPad | Out, unless you say it stays (the question *olderIpad* on the board; your key has no older iPad). If it stays: In Duplicate on its small stand in the Library all night (`?kiosk=memory`), and your iPad Pro stays in the Orangerie from supper until it goes to the bedroom. | Nothing, by default. If it stays: Safari, full screen, tap it once. |
| Susan's 8th-gen iPad | Decor (the picture frame). Never a cue. If a guest needs a device, take the decor off and hand it over. | The plain game address, if it is needed. |
| The old iPhone 11 | The spare phone. | Charged, on the plain game address, left on the join screen. |
| Every guest's phone | The game, all night: seven tabs at the bottom (Now, You, Clues, Notes, Motives, Cats, Rules). Notes is a box for their own scribbles, saved to that phone alone as they type and never read by anyone else, you included; it is still there to read at The End. | They scan the join code at the door and tap their name. |
| Your phone and Susan's | The Host tab. | Type your names at the door. The tab appears on its own. |

The workshop's Devices page has the same table of machines, room by room,
with each address to open and a square code for it.

The game itself lives on the internet at https://murderwin-at-sirwin-manor.web.app/play/.
Every phone and every screen only needs the wifi. The brain does not serve the
game; it serves the lights and the speakers.

## Start order, and how you know each one is alive

*The big Start button (12 Nov).* This is the whole setup once every machine
is in its place:

1. On your phone, open the game (or open the workshop: the same button is
   first on Home and on Game night). Tap the big button. With the box **This is
   the real night** unticked it says Start a run-through, which is a
   rehearsal; ticked, it says Start the REAL night, and it only works on the
   party day. If an old night is still on, the same button is at the bottom
   of its Host tab under A fresh night.
   On a practice night the card also has **Fill-in players**: tap plus for up
   to eight seats with no phone, so two of you can play a full-size night
   (see "Fill-in players" under Rehearsing, below). It starts at nought every
   time. Tick the real-night box and the row is gone: the real night never
   has one.
2. Type your name. The Host tab opens with *Send each screen its page*: tap
   Send beside a room, pick AirDrop, pick that room's machine. Its page opens
   there. Click once on it and it goes full screen. A dot turns on beside the
   room when the house has heard from it. (For a link to open in Chrome, make
   Chrome that Mac's usual browser once.)
   A Mac with two screens (the Parlour's, the Study's): send it A second
   display as well and drag that window to its other screen. It shows the
   crest and the countdown, and goes dark with the room.
3. The Study: double-click Start the Study in the Study station folder on
   the Mac by the walls. It starts the walls and the Stream Deck and opens
   the Study's page. The folder is sent to that Mac once, by AirDrop from
   the brain's Desktop (Study station.zip).
4. Leave every screen alone. The jazz plays and every room screen counts
   down "The evening begins in". On the real night the intro goes at 4:30 pm;
   on a run-through, five minutes after you start. At that moment the music
   stops, the lights dim and the Parlour TV plays the intro video on its
   own. When it ends the join code comes back, and you carry on with Next.
   Next before the time starts the intro at once.

*One address for every screen (11 Nov).* On each machine type
`murderwin-at-sirwin-manor.web.app/setup`. The page asks "Which screen is
this?" with one big button per room: the Parlour TV, the Study, Boo's arcade,
the Orangerie, the iPad Pro's three stations. Tap the room,
make the window full screen, click once. It needs no sign-in. The machine's
last choice is marked the next time, so on the party night it is the same
tap. Boo's button has a second one under it for connecting the Stream Deck
first. When the iPad Pro moves, press Back (or type the address again) and
tap its next room. The page is for before the guests come; no guest screen
links to it.

1. *The router, the Hue bridge and bulb, both Nanoleaf controllers, the
   string lights and the projector's plug.* On first. Give them five
   minutes. The plug is an IKEA smart switch in the Home app, with the
   projector on it; the brain switches it through two Shortcuts on the
   brain, Projector Murderwin On and Projector Murderwin Off (each runs a
   Home scene for the plug), so it must be on and in Home before the night.
2. *The brain.* `cd cues && npm start`. Alive when the terminal prints a
   line saying what is on (music, Hue scenes, the projector, string lights)
   and sits there waiting. Above that line it counts the sound files: a line
   saying how many optional sounds have no file is fine (those moments are
   silent). It stops only if the chime or the blackout sound has no file:
   then run the stand-in step under "The nine sounds" above and start it
   again. When the night begins it prints `[hall] green` and the bulb
   outside the bedroom turns green for the welcome; it goes off for the
   blackout, red when the power returns, and green again when the drawing
   is done. If it prints `failed` and `retrying`, the bridge address in
   `cues/.env` is wrong; the night runs on without the lights.
3. *The party box, then your phone.* On the workshop's Game night page, tick
   "This is the party night" (untick it after the party). Then open the game
   on your phone, tap "Host? Start the night", type your name. Do it before
   any guest arrives: until a night is live, every phone that opens the game
   shows that button. If a rehearsal
   night is still on, press **Start a new night** on its Host tab instead.
   The Host tab appears. Its top lines say "This is the party night": the box worked. If they say
   "This night is a rehearsal", stop, tick the box and start a new night. Under
   "Who is here", a green dot sits beside every phone the house has heard
   from in the last two minutes. That dot is how you know a phone is alive
   all night.
4. *The study.* Your key word is kept from the rehearsal (if you ever save a
   new one, on the Game test tab or under The study, change `station/.env`
   and `cues/.env` to match and restart both). On the M1 Air, double-click *Start the Study* in the Study station folder (or `cd station && npm start`). No folder on that Mac yet? Open the Study test page on it, tap Download the Study station, unzip, then double-click *Start the Study* (the first time, macOS refuses: click Done, then System Settings, Privacy & Security, Open Anyway beside Start the Study, and the Mac's password). Alive when
   the terminal prints `study station up` with the panel counts. `DOWN`
   beside either wall means the game runs on the screen instead; the clue
   still lands. Then minimise that window (the yellow button at its top
   left): it keeps running, and the Study's guests see only the game, never
   the station's lines (your rule of 29 October: no setup words in front of
   the guests). Your Host tab, under The house, says whether the station is
   up.
5. *The screens.* Open the Parlour screen (`?kiosk=living`), the study, the
   iPad Pro (`?kiosk=ipad`: in the Library with Zimothy for Act 2, as your
   cue list has it), Susan's MacBook Pro in the Entryway with the Stream
   Deck + XL (`?kiosk=boo` in Google Chrome, where it stays all night; the
   deck connected once from the arcade's practice page first) and
   the brain's own browser
   (`?kiosk=orangerie`, facing the Orangerie table), full screen. Tap each
   one once, anywhere, and leave it, so the browser lets it make a sound. On
   a rehearsal a small "tap once to wake" note sits in the bottom right
   corner until you do; on the party night there is no note, so just tap
   once (the brain's
   browser shows the bell but rings nothing: the brain's own sound already
   comes out of the HomePods, so a tap there is harmless). Each shows
   its loop, once your files are in `play/public/loops`, or its room's
   splash until then. They follow the night
   on their own. Two are touched on purpose: the memory match in Act 4, and
   the Parlour screen, the fallback for the drawing's guesses in Act 6 (you
   tap them on your own phone). The iPad Pro moves three times, and each
   move is in the act bullets below: to its stand in the Orangerie for
   supper (the same address), back to the Library as the memory match
   (`?kiosk=memory`) before **Start Act 4**, and into the bedroom
   (`?kiosk=bedroom`) after Act 4. The older family iPad stays in the
   drawer unless you say it stays (the question *olderIpad*). On your Host
   tab the iPad Pro's dot for its earlier station goes quiet after each move
   (the Library and Orangerie one from Act 4, the memory match one once it
   is in the bedroom); that is right, not a fault.
   On a rehearsal a small dot in the bottom left corner is green while the
   screen can hear the house, amber if it has gone quiet, red if it is off
   the wifi. On the party night the screens show no dot and no words about
   the connection (your rule of 29 October: no setup words in front of the
   guests): check each screen on your Host tab, under The house, which has
   a dot for each. A bell in the top right corner shows for three seconds
   whenever a sound is called for, so you can tell a silent speaker from a
   missed cue; nothing shows in the corners while a room is dark.
6. *The rooms.* The four room codes on the walls: Granolia in the Study
   (upstairs), Salem in the Orangerie, Zimothy in the Library, Boo in the
   Entryway. None in the Parlour. The same codes serve Act 2 and Act 4. In
   the Library: the paper roll and the markers for the drawing, and the
   small stand for the iPad Pro. The Orangerie table set before guests
   arrive. Jenna packs the ten bags somewhere nobody who plays can see.
7. *The guests.* They scan the square code, type their name, and are dealt a
   character and a bag number. Then one screen asks to allow three things:
   motion (one game asks them to shake the phone), sound, and keeping the
   screen awake. One tap on "Allow" does all three. A phone that says no still
   plays the whole game; the You tab has an Allow again link. Watch the
   green dots fill in. Guests can also scan the code on your Host tab, under
   The doors.

## Running the night, in order

- **Next** is the one button. It does whatever the next beat needs on every
  phone at once and tells you only how many phones it reached. The beat you
  are on and what it is for are written above the button.
- Act 1: arrivals, the house rules, meet the household, introductions, then
  ready for the dark. The Parlour TV shows the join code, big, through the
  whole of Act 1 (*rulesDeckScreen* is answered by your cue list: the Parlour
  TV). "The house rules" is the beat for the intro video and the rules: the
  Parlour TV plays the intro and then the rules film by itself, your own 28
  slides each with your recording for it, whole, about sixteen minutes in
  all (the Host tab says in Act 1 whether the film shows your own slides), and the
  join code comes back when it ends (Next goes sooner). The brain stops the
  music and dims the lights for them. The film has sound only if that screen
  has been clicked once since it opened: the Host tab says Sound on beside
  the Parlour screen when it has. When the rules reach the
  sound test, press **Sound test** (under The house, beside the hall light):
  the chime plays on every HomePod, so the room hears the speakers work. Act 1
  ends with
  **Blackout**: every phone and screen goes black, the thunder and the crash
  play, the hall bulb goes out and the projector's plug goes off, and five
  seconds later the power comes back on its own (*blackoutAuto*, the cue
  list's default; the projector takes a moment to warm up). Your phone goes dark
  too, with nothing to press. Five seconds later it shows the same button as
  everyone else's; after your own card the Host tab is back, on Act 2's
  first beat. The button only works in Act 1 (in any other act it is greyed
  out and the Manor refuses it), and a second press in the dark changes
  nothing.
- Act 2 begins when the power returns. Every phone buzzes (where it can) and
  shows one button, "Sorry for the interruption, continue here". The tap
  brings up that phone's role card, with no button and no early tap, for
  fifteen seconds on the server's clock; then the phone goes to its main
  page on its own. Yours too. Slow readers find the card again on the You
  tab, behind "Show me my card". The hall bulb is red from this moment until
  the drawing is done. The Parlour TV and every room screen stay dark until
  your first **Next** (the question *promptScreen* on the board: cue 5 has
  the loop come back at once).
  **Power returns · Act 2** is the hand button for a power that did not come
  back on its own (the night was paused during the five seconds). In the
  dark no phone has a Host tab, so it is pressed from the brain:
  `node functions/host.mjs power`, after `node functions/host.mjs resume` if
  the night was paused. Pressing it once the power is back does nothing, and
  if it and the automatic return land in the same second the power comes
  back once.
- The Parlour Games pop up on their own: twelve a night, about five in Act 2
  and five in Act 4 at times nobody knows, you included, and two at the very
  start of Act 6, one after the other. Boo opens each one. Every phone at
  once, the same three questions, sixty seconds on the server's clock, and it
  never closes early. It sits on top of whatever the phone was showing and
  hands it back when it is done. None pops up during the drawing. A game an
  act ends before moves to the next act; one that Act 6 cannot fit is simply
  not played. **Next** waits for an open one. When the time is up, the server
  picks for anyone who did not, within a minute, on its own;
  **Pick for the rest** does the same thing sooner if you are standing there.
  Press **Parlour Game now** for an extra one in Acts 2, 4 or 6. A phone that
  answers after the time is up sees the same thank-you as everyone else, and
  its late answer changes nothing. Act 4 is the one difference: there a
  Parlour Game does not pop up over everything. It waits on each phone and
  the guest plays it when free, never in a game room. Any a guest never
  played get a random answer when Act 4 ends.
- Act 2: **Next** on the news flash puts W-O-O-F News bulletin 1 on the
  Parlour TV: as video with its own sound once you have ticked The bulletins are videos on the Game night page; until then the TV shows the words and the brain plays your recordings. It crosses off one family of motives for everyone. Then
  **Next** for the bag peek: every phone asks for a quiet look inside your
  own bag, here in the Parlour, shown to nobody yet. Then **Next** starts
  the cat visits. The phones call guests to the four cats one at a time:
  Granolia in the Study, Salem in the Orangerie, Zimothy in the Library,
  Boo in the Entryway. Every guest visits all four. The phone says "Your
  turn"; the guest taps On my way, goes alone, scans the code in the room
  (every room screen shows its cat's code through the visits: the study
  screen, the iPad Pro in the Library, the projector in the Entryway, the
  brain's browser in the Orangerie; the printed codes are the fallback;
  `?kiosk=ipad` and `?kiosk=memory` both show Zimothy's code, since both
  expect the Library, so the Library's code is on your iPad Pro in Act 2
  whatever *olderIpad* says),
  and reads the cat: a motive hint and a clue about the Murderer's bag, both
  saved to their Clues tab. Done sends them back to the Parlour, where Sir
  Irwin's prompts run on the TV (a new one every three minutes, ideas for
  what to share). "Not yet, call me later" puts a guest back in the queue
  for two minutes. No cat sits idle while someone is waiting for one.
  Nothing to press: a guest who has not scanned in after four minutes, or
  is still with a cat after five, gets the cat's lines on the phone and the
  next guest is called. Your Host tab counts it: "Cat visits: N of M guests
  have seen all four".
- Supper: when everyone has seen all four cats, the supper chime rings on
  its own and every phone says supper is served in the Orangerie. To call
  it sooner, press **Supper's ready**. A guest with cats still unvisited
  gets those cats' lines on the phone as a note ("The cats you haven't met
  left you a note"). On your way in to supper, carry the iPad Pro from the
  Library to its stand on the Orangerie table: the same address
  (`?kiosk=ipad`), and bulletin 2's words show on it during the meal.
- Act 3: phones down, supper in the Orangerie. Every phone says to leave it
  here in the Parlour, charging, and to bring the bag to the table; the whole
  table may share what is in them. Near the end of supper,
  press **Next** when it says "Next: Arm the bulletin". Your phone says only
  "Armed." W-O-O-F News bulletin 2 plays on its own 3 to 5 minutes later
  through the HomePods (the Orangerie one too), with the words on the iPad
  Pro on the table.
  Every phone gets a notice when it plays, yours too. When supper is over,
  **Next** for "Dinner wrap-up": every phone asks for the motives to be
  crossed off from what has been learned so far, and the Parlour TV shows the
  join code again for anyone who needs to rejoin. Everyone must be back on
  their phone; then press **Start Act 4** (it shows on your Host tab in
  Act 3).
- Act 4, Behind Closed Doors: four game rooms, pairs and trios, about an
  hour. Before you press it: carry the iPad Pro from the Orangerie back to
  its small stand in the Library, open `?kiosk=memory` on it in Safari, full
  screen, and tap it once (In Duplicate waits there for each group).
  **Start Act 4** gives every phone a two-minute warning and makes the
  groups (nobody sees them yet). Two minutes later, on its own: the chime,
  the title card on the Parlour TV, and every phone shows its group as
  portraits with a Locked in button. The rounds start when everyone is
  locked in, or two minutes after that. Each round is fifteen minutes (31 Oct 2026; it was ten) on the
  server's clock: the chime sends every group to a room, and every group
  visits all four rooms once:
  - The Study: Granolia's Lightbulb Moment (the light puzzle), upstairs.
    Pays the Ghost's trace and a bag hint. The game runs to the end of the
    round, fifteen minutes from the chime (your word, 1 November), stopping
    five seconds early so the group's result is in before the chime rings:
    the study's screen counts down to that, Granolia says two minutes left
    two minutes before it, and then the walls stop, the screen shows the
    pairs not yet found for twenty seconds while the walls rest, and the
    trace goes anyway. It never runs on into the next group's turn, and
    **Next** stops it too. Between groups its rules card
    draws both walls as they hang: the hexagons (watch, then touch) and
    the lines (the colour and the count).
  - The Library: In Duplicate (Zimothy's memory match), on the iPad Pro:
    three boards of 6, 10 and 14 pairs. The guests take turns: the screen
    names whose turn it is (from the group, so a trio is known when it
    arrives); a pair keeps the turn, a miss passes it on, and each board
    starts with someone else. Pays one wrong motive crossed off and a bag
    hint, to the whole group. After the third board, just for fun, Zimothy
    names whoever found the most pairs (every pair counts for whoever's turn
    it was; a tie names everyone tied), and it stays up until the chime. It
    changes nothing: the whole group is paid the same.
  - The Orangerie: Get Off My Lawn! (Salem's Motion Game), on the group's
    own phones. Red means shake, green means freeze; a slip on any phone
    restarts the round; thirty seconds clean passes it; three rounds, each
    faster. The rule shows once, before the first round: a red Shake tile
    and a green Freeze tile. While a round plays, each phone's whole screen
    is only red or green, with no words (Jon, 28 Oct): a count before each
    round, and one short line after a slip; since 31 Oct Salem's head is
    loose on the phone through the round, thrown about by the phone's own
    motion (it changes no rule). The string lights follow if they answer
    the brain. The Orangerie's screen (the brain's browser) shows the room
    Salem's board while the group plays (31 Oct, Jon's note): the phones'
    colour over the whole screen with SHAKE or FREEZE on it, the count
    before a round, the thirty seconds filling along the bottom, how many
    times the round started again and why, and the group's names with the
    slips each has caused. Pays a bag hint (Salem's may be backwards). When
    the group clears all three rounds, the Orangerie's screen names, just
    for fun, whoever slipped least: every slip counts
    against the phone that caused it, and a phone that cannot feel a shake
    is left out. A tie names everyone tied. It stays up until the chime and
    changes nothing.
  - The Entryway: Miss Boo LaRue's Arcade, on Susan's MacBook Pro and the
    Stream Deck + XL (since 5 Nov).
    The group scans Boo's code on her rules card, and the visit starts with
    their names in the order of the group: five coins each, one a game, in
    turns, fifty seconds a game, the Mac's screen the scoreboard and the
    Stream Deck the game (or the deck drawn on the screen, with no Stream
    Deck). After each of the first two players' fifth game their clue shows
    on the screen with their name: the group's bag hint about the Ghost
    from Boo, at the group's average affection with her, like every room's;
    the same words reach that player's phone at that moment. A trio's third
    player gets Boo's line instead ("Didn't I give you enough?..."), on the
    screen and their phone. Then Boo's winner, just for fun, and free play
    until the chime, which rings at the end of the round on the house's
    clock: "Be on your way." Anyone the chime caught short still gets the
    clue on their phone at the chime. No motive is crossed off here (your
    call of 29 Oct). Each counted round's score goes to the house for the
    Act 7 awards. Nothing to press; the brain still lends the
    Parlour HomePod to Susan's Mac through Act 4 (Jon, 27 Oct), which the
    arcade does not use (the question arcadeSound).
  The group scans the room's code to begin. Between groups each room's
  screen shows its game's rules card: the name and its line, the host cat's
  words (the Study's and the Library's follow a host line you change in the
  workshop, the same as the phones; the study's card also carries Granolia's
  "Touch any panel to begin"), a full picture of the cat (a different one as the groups change)
  and the room's code, so a group arriving knows what to do before anyone
  explains; the Orangerie's screen (the brain's browser) shows its card all
  through Act 4, since its game is on the phones, except for Salem's winner
  after a group clears it. A group that finishes early is
  paid at once and goes back to the Parlour; at the chime, any room not
  finished is paid anyway. The bag hints are about the Ghost's bag. With
  five groups there are five rounds, and each round one group waits in the
  Parlour, where Sir Irwin's prompts run on the TV and any waiting Parlour
  Game can be played. Your Host tab says the round and the time to the next
  chime; **Next** moves everyone on at once. **Finish this group now** pays
  the group in the study at once; a game still on the wall carries on until
  the round's end or **Next**, and the Study's screen may show its rules card
  for up to half a minute first. After the last round every phone says
  back to the Parlour, and **Next** goes on to Act 5. **Make the groups**
  makes the groups early if you ever need them before Start Act 4.
  After Act 4, carry the iPad Pro from the Library into the bedroom, open
  `?kiosk=bedroom` on it in Safari, full screen, tap it once, and close the
  door. It shows "The door is closed" until the third picture is named.
  Susan's MacBook Pro stays by the projector all night: the brain turns the
  projector off for the drawing and on again for the ballot.
- Act 5: the dessert chime plays on every HomePod, and every phone shows the
  Happy Birthday Irwin card over the cake notice (one of Sir Irwin's pictures
  and the greeting); everyone wanders. Every screen is on its loop. When the
  cake is served, press **Cake!**
  (above Next, Act 5 only): Happy Birthday for Dogs plays on every HomePod,
  the lights dim for the candles, and the TV shows the Happy Birthday Irwin
  card with his full picture (unless Sir Irwin's countdown is already on the TV, which stays); the
  jazz comes back on its own when the song ends. Then **Next** for
  Sir Irwin: the chime,
  and his countdown on the TV, each motive with its card's picture once it
  is drawn. The phones send everyone to the Parlour. Then **Next** for
  "Update your motives": every phone asks for the motives to be updated from
  what Sir Irwin said, and the TV goes back to its loop.
  Before you press **Next** for Act 6, check the iPad Pro is in the bedroom
  on `?kiosk=bedroom` and the door is closed.
- Act 6 opens with a note on every phone (two Parlour Games on their way,
  then the final event in the Parlour, a good moment for a stretch) and the
  two Parlour Games, back to back. Wait until the second has
  ended on your own phone, then **Next** starts Sir Irwin Needs a Hand (the
  Relay Drawing; or **Start the drawing**). Sir Irwin explains it on the TV,
  reading each slide aloud from the TV's own speaker (about a minute and a
  quarter in all; click the TV once before the night so the Host tab says
  *Sound on*, or the slides turn silently on time), while every
  phone says to be in the Parlour for the final event and the brain switches
  the projector off for the drawing (its plug comes back on for the ballot);
  then three rounds, each grid bigger than the last. There is no practice
  round (your word, 11 November).
  The game calls a random player by their character's picture and name; they
  walk to the paper in the Library before the square shows. The walk allows
  twenty seconds, a limit, not a wait: the moment they are at the paper,
  press **At the paper** on your phone and the square shows at once. The
  room describes it, words only, fifteen seconds a turn: every other phone
  says who is drawing and *Describe this square!*, and the drawer's own says
  *Draw what they say!* When a grid is full
  the room agrees and tells you, and you tap the room's guess on your own
  phone: the four names, A to D (the TV's own names still take a tap, the
  fallback, with the trackpad). A right one is a big win on the TV and a
  smaller one on every phone. A wrong one is crossed off with a buzz from
  the TV and the phones, every screen says *Not that one. Guess again.*, and you tap the
  next guess straight away: there is no wait (11 November). While the drawing
  runs your phone shows it like everyone else's, with At the paper and the
  four names on it, so you never have to find the Host tab; Susan's phone has
  them too. While it
  runs, **Next** refuses to leave it. When the third picture is named, the TV
  shows Sir Irwin's "Pawsome!" door slide, the hall light goes green and the
  bedroom screen shows the trace. **Next** tells every phone the door is open,
  and everyone goes to look.
- Talk it over (11 Nov 2026, your note: "There can just be conversation
  between people"). When everyone is back from the bedroom, press **Next**
  once more (the button reads Next: Talk it over). It is the last beat of
  Act 6. Every phone says "Talk it over. The vote is next." The Parlour TV
  shows the three questions, Who did it? Why? Who is the Ghost?, over
  everyone's portraits. Nothing to tap and no clock: the room just talks, for
  as long as you like. The music and the lights stay as they were at the
  door, and no Parlour Game pops up while people talk. When the room is ready
  for it, press **Start the vote**.
- **Clear the drawing** wipes the drawing and shuts the door again. The trace
  only comes out when a drawing is finished, so after a clear press
  **Start the drawing** and finish it. Never press it after the door has
  opened. (It is one tap with no question; a guard on it is not built yet.)
- Act 7, the vote: **Start the vote** opens it on every phone as a card on
  the Now tab, so a guest can still open their Clues, Notes and Motives while
  they decide (your cue list, cue 19). Each guest picks the Murderer, the
  Motive and the Ghost, then taps Lock in. A guest may pick themself: the
  rules tell the Murderer to. Lock in is final, and the phone then says
  "Locked in. Eyes on the big screen." until the reveal. No host speaks on
  the card any more. The TV shows the three questions, the trace, the clock
  and a row of wax seals, one a guest, pressed as each one locks in ("3 of 9
  locked in": a count, never who). Your Host tab shows the same count. The
  projector comes back on, with its loop, for the rest of the night.
  The vote closes the moment the last guest locks in, and the TV says "The
  votes are in." The two minutes are only the backstop: if someone never
  votes, the vote closes when they run out, and the house picks for them
  within a minute (or press **Pick for the rest**). A guest who joined after
  the vote opened is not waited for. **Next**
  starts the TV: the stats, the achievements you gave, then the graph, and
  every guest's phone locks on "Eyes on the screen." with no tabs (yours and
  Susan's keep their tabs: the Host tab runs the reveal). Nobody
  is named until you press. When the Host tab says the screen is ready, press
  **Name the Murderer**, then **Name the Motive**, then **Name the Victim**,
  each when the room is ready for it. Each press plays its part of the
  closing W-O-O-F News bulletin (as video on the TV once The bulletins are videos is ticked; until then the brain plays the recordings and the words show); the card shows once its
  lead-in part has played, and the next press cuts off anything still
  playing. As video (11 Nov 2026) each press is one short film: for the
  Murderer, Ava in the studio, Mic outside, then the Murderer's name card
  with Mic saying the name; for the Motive, Mic's line, Mic saying the
  motive, a second of static; for the Victim, Mic's line, the Ghost's name
  card with Mic saying the name, Mic's sign-off and Ava's close (about 45
  seconds). The cards come up when each film ends, so wait for the cards
  before the next press. A film with no file shows the words instead. After the
  Victim, on their own: the closing story, the dial's journey, the end
  credits and
  Sir Irwin's last card, about two minutes. **Hold the screen**
  stops it where it is (a toast, a photograph); **Carry on** resumes, and
  nothing on the screen is skipped. **Next** for everyone's result only works
  once all three are named: every guest's phone shows its own three answers
  against the truth with "Thank you for playing." under them and no tabs,
  while the credits roll (your phone and Susan's show the result on Now, tabs
  and all). Then **Next** once more for "The End": every screen goes black,
  the projector is off, and every phone opens up for good with everything
  readable: the result on Now, the clues, the notes. The Host tab says the
  night is over. The brain lets go of the hall light there: it stays green,
  and your own light controls work again. **Back one** from "The End" opens the night up again, for a
  rehearsal that wants to see the result twice. A pause during the vote
  keeps the card on every phone, greyed out, until you resume, like any other
  window.

## Any time, from your Host tab

- **Salem petted**, Acts 1 to 6: when the real Salem lets a guest pet him,
  tap their name on the Host tab, then Yes. Their Salem tells them the truth
  from then on. Never you or Susan.
- **Fetch Champion**, Acts 1 to 6: tap the first guest the real Sir Irwin
  brings a toy to, then Yes. Once. It shows in the end credits.
- Achievements: through Act 5, tap a guest, then an achievement from the
  workshop's list. It lands on their phone at once and plays on the TV at the
  end. After Act 5 the list is closed.
- **Pause, Irwin needs the garden** stops the clocks that decide the night:
  the Parlour Games, the vote, the rounds, the Study,
  the drawing and the reveal. **Resume** carries them on from where they
  stopped, and no clue is lost. The line for the cats, Salem's round and Boo's
  show run on, so a long pause can end them, and a bulletin that fell due in
  the pause plays straight after Resume. A pause takes the tabs off every
  phone, this tab with them, so **Resume** is on the pause card on your phone
  and Susan's, or on the strip across the top if a Parlour Game or the vote
  is held greyed out behind it. Every other phone shows
  the same with no button. The tabs come back at Resume on Now: tap Host to
  get back here.
- The house: scenes. The brain changes the music and the Hue scenes on its
  own as the night moves. If you want one by hand: **Default**, **Dimmed**,
  **Blackout**, **Drawing**, **Candles** or **Study Dim** recalls that
  scene, and the music has **Play**, **Pause** and **Next playlist**. Your
  choice holds until the night's next change. The buttons never say why.
- The hall light: **Red** and **Green**, under The house, if the bulb ever
  needs setting by hand.
- **Sound test**, under The house beside the hall light: the chime on every
  HomePod, to hear the speakers work. The rules ask for it in Act 1; it is
  harmless at any time and moves nothing.
- **Cake!** shows above Next in Act 5 only. Pressed while Sir Irwin's
  countdown is on the TV, it plays the song and dims the lights but leaves
  his motive cards on the screen. **At the paper** and the drawing's four
  names are on your phone's drawing screen, only while the drawing runs: the
  Host tab is away then, like every tab, so there is nothing to find.
- A red line at the top of the Host tab, from Act 2 on, if a cat ever had
  no motive hint for a guest or the Study no trace for a group. For example:
  "A cat had no motive hint ready for a guest once. The guests read plain
  words instead. Nothing to do: the game goes on." It says how many times,
  never which cat, guest or group. The guest read the house's own plain
  words in its place, never a note about the game: "Miss Boo LaRue has
  nothing to tell you about the motive." (with that cat's name), or from the
  Study, "Nothing for you this time." A practice night shows the same plain
  words (since 11 November; before that it showed a note in brackets). The
  checks prove it should never happen (G59); if you see it on a practice
  night, tell Claude Code. Which words the guests read is yours to choose:
  the question *quietWords* on the board.

## What each screen shows

| Act | The Parlour TV | The other screens |
|---|---|---|
| 1 | The join code, big, with "Scan to join", through the whole act, with the Parlour's loop beside it. At "The house rules" it plays the intro video and then the rules film by itself, and the join code comes back. | Every other screen on its loop (its crest until the file is in): the projector from Act 1. |
| 2 | W-O-O-F News bulletin 1: as video once the box is ticked on the Game night page, until then the words with the recordings. Then, during the cat visits, Sir Irwin's prompts, a new one every three minutes. | The iPad Pro, in the Library, keeps bulletin 1's words up. Then, through the cat visits, every room screen shows its cat's code, big: Granolia's in the study, Zimothy's on the iPad Pro in the Library (`?kiosk=ipad`; `?kiosk=memory` shows his code too), Boo's on the wall from the projector, Salem's on the brain's browser in the Orangerie. The printed codes are the fallback. |
| 3 | Bulletin 2's words, when it plays. At "Dinner wrap-up", the join code again, for anyone who needs to rejoin. | The iPad Pro, carried to its stand in the Orangerie for supper: bulletin 2's words, with the recording on the HomePods, kept up through the wrap-up. Every other screen on its loop. |
| 4 | The title card ("Act 4 · Behind Closed Doors"), then Sir Irwin's prompts during the rounds. | The study: Granolia's Lightbulb Moment. The iPad Pro, back in the Library: In Duplicate, and after the third board Zimothy's winner (most pairs). Susan's MacBook Pro in the Entryway: Miss Boo LaRue's Arcade on the Stream Deck + XL, its rules card and code between groups, each player's clue on the screen at their moment. The group's phones in the Orangerie: Get Off My Lawn!, with the rules card and the code on the brain's browser in the room, and Salem's winner (fewest slips) there once a group clears it. Between groups each room's screen shows its game's rules card: the name and its line, the host cat's words, the cat's picture (changing with the groups) and the room's code. |
| 5 | The Happy Birthday Irwin card from **Cake!** while the cake is served, with his full picture. Then Sir Irwin: his opener, the countdown line, the motive cards (each with its picture once drawn, else the rhyme alone), his closer. | Every screen on its loop. The bedroom screen (the iPad Pro), once it is in: "The door is closed", its loop behind the words. |
| 6 | Sir Irwin Needs a Hand: his rules slides (the first one carries the game's name), then each called player's picture and character name, the black square with its label, and the four names to guess from (you tap the room's guess on your phone; a tap here still works). Then the "Pawsome!" slide, "The door is open", and, while the room talks it over, the three questions over everyone's portraits. | The projector is off from the drawing's intro (the brain switches its plug). In the bedroom, on the iPad Pro: the trace, from the moment the third picture is named. |
| 7 | The vote: the three questions, the trace, the clock with a small rejoin code under it, and a wax seal for every guest, pressed as each one locks in; then "The votes are in." Then the stats, the achievements you gave, the graph, each name card as you press (the closing bulletin, as video once the box is ticked; the motive's card with its picture once drawn), the closing story, the dial's journey, the end credits and Sir Irwin's last card. At "The End": black. | In the bedroom: the trace. The projector is back on from the ballot, with its loop. At "The End" every screen goes black and the projector is off. |

Outside Act 4 the study screen is on its loop (its crest until the file is
in) unless a round is under way; in Act 4, between groups, it shows
Granolia's rules card with her "Touch any panel to begin" under it. Every screen is dark
from the blackout, through the five seconds and the role cards, until your
first **Next** in Act 2 (built so on purpose, so every eye is on its own
phone while the roles are read; cue 5 says the loop comes back at once, and
the question *promptScreen* on the board lets you choose). While the night is
paused the Parlour TV and the iPad go near-black with "One moment"; the other
room screens stay as they are, and the Study's clock stands still. The phones
say where to look.
A practice night looks like the party night on every screen (11 November):
real clues, real hints and real reveals, from that night's own throwaway
case, with no note in square brackets and no word Rehearsal on any room
screen. The one place that says which night it is: the top of the Host tab,
"This night is a rehearsal" or "This is the party night". Check that line
before the guests arrive on Sunday.

## When something dies

| What died | What to do |
|---|---|
| A guest's phone | They tap their name on any other phone (the old iPhone 11 is for this). Their character, bag, cards and cat standings follow. Their Notes box and their crossed-off motives stay on the old phone, so if they can, read the notes across before the swap. The old phone says the character has moved. |
| A borrowed phone that must change hands | **Hand this phone on** wipes it. The next person types their own name; the previous owner taps theirs on another phone and gets their character, bag, cards and cat standings back. Their Notes box and their crossed-off motives stay with the wiped phone and are gone, so if they can, read the notes across before the swap. (One tap or ask twice is the open question *handOn*.) |
| Your phone | Tap your name on Susan's phone or the old iPhone 11; the Host tab moves with you. The brain is the spare host: `node functions/host.mjs status` says where the night is, `node functions/host.mjs next` presses Next. It needs the key file described at the top of `functions/host.mjs`. |
| The Parlour screen | Open `?kiosk=living` in a browser on the brain and put it by the TV (the iPad Pro has a job of its own all night). The drawing's guesses are on your phone anyway; the spare screen shows the squares. |
| The iPad Pro, at any of its stations | Carry on. In Act 2 Zimothy's printed code does its job; at supper bulletin 2's words also show on the Parlour TV; in Act 4 In Duplicate is paid at the chime anyway; in Act 6 press **Show the trace on the TV**. Susan's 8th-gen iPad can take any station: open that station's address on it. |
| Your phone, during the drawing | Susan's phone has the same **At the paper** and the same four names. Failing both, the TV's own names take a tap (the trackpad), and a walk nobody ends runs its twenty seconds on its own. |
| The bedroom screen | Nobody goes to the bedroom. Press **Show the trace on the TV** under The Big Solve: ten seconds after the door opens, the TV shows the trace, and again at the ballot. |
| The memory match (the iPad Pro in the Library) | Carry on. A group that did not clear it is paid its cross-off at the chime anyway. If its screen says "The Library did not hear that. Trying again.", leave it: the iPad sends the finished board again by itself, every few seconds, until the house hears it. |
| Boo's screen or the Stream Deck | Carry on: a group that did not finish is paid at the chime anyway, with its clue on every phone. With the Stream Deck gone, the deck drawn on the screen plays the games with the mouse and the keyboard. If the Mac itself goes, open `?kiosk=boo` in Google Chrome on any screen the group can see. In Act 2 the Entryway's printed code does Boo's screen's job. |
| The Orangerie screen (the brain's browser) | Carry on. Salem's game is on the phones; the printed code in the Orangerie serves Act 2 and Act 4, and the phones have "Cannot scan?" anyway. Open `?kiosk=orangerie` on any spare screen if you want the rules card and Salem's board back. |
| A room screen with nothing to do | Since 12 Nov 2026 it shows its room's splash: its own cat, large and slowly moving, the room's name, a line, and a tip once a minute (the Parlour TV has Sir Irwin, the Study Granolia, the Library's iPad Zimothy, the Orangerie Salem, the Entryway Miss Boo LaRue, the bedroom Sir Irwin waiting at the door). Nothing to do. A Mac's own screen beside its room screen can show the same, smaller: on `/setup`, The Parlour: the Mac's own screen, or The Study: the Mac's own screen. |
| A loop will not play | The screen shows its crest and a line instead, and nothing else changes. Check the file's name against `play/public/loops/README.md` and that it was deployed. |
| Get Off My Lawn! (a phone with no motion sensor, or the string lights) | Nothing to do. A phone that cannot feel a shake never slips; every phone's screen turns red and green whatever the lights do. |
| A room code will not scan | Try the other copy: the one on the room's screen or the printed one. Act 2: the phone has "Cannot scan? I am with" the cat; or the guest waits, and after four minutes the phone shows the cat anyway and calls the next guest. Act 4: the phone has "Cannot scan? We are in" the room. |
| The study station | Keep going. The group in the study is paid at the chime, and Granolia's lines show on their phones. |
| A cat's hint or the Study's trace never came (a red line at the top of your Host tab) | Nothing to do. The guest read plain words in its place and the game goes on. The line says how many times, never which. |
| The hall bulb | The TV says the door is open and the phones say the light is green regardless. |
| The brain | Nothing waits on it. Start `cd cues && npm start` again; it never replays an old cue, and it puts the right music and scene back. The TV rings its own small chime and shows the bell for every cue, so the room loses the big speakers, the music and the recorded voices (only bulletin 2's once the bulletins are videos); the words still show on the TV and the iPad. Once the box is ticked, the bulletin videos play from the TV itself. |
| A W-O-O-F News recording or video does not play | The words are on the screens anyway. For bulletin 2, check that `cues/.env` has the same key word as the study, then restart the brain. For a video, check its file is in `play/public/video` and deployed. |
| The wifi | Phones show a red strip, keep what they had, and catch up on their own when it returns. Nothing is lost. If it is out for long, **Pause, Irwin needs the garden**. |
| The wrong group walks into the study | Before they finish, tap **This group is in the study** on the Host tab and pick the group that is actually in there; the study pays them. If you miss it, the group that was due is paid. Carry on. |
| Somebody gives a hidden role away out loud | **Hush the Murderer** or **Hush the Ghost**, whichever role was given away. Nothing on any phone changes. From then on that player's Parlour Game answers stop moving the clarity dial (their cats still warm and cool as usual, so nothing looks different), and the reveal says one line about it. You never learn who it was from the button. |
| The story itself needs to change (a guess that landed too early, a secret blurted) | **Spill the Beans**. The Manor decides on its own whether the story can still change, and says nothing either way; the phone's message is the same whether it worked or not. It can only change before any clue has reached anyone (the news, a cat's hint or bag clue, or any Act 4 room's reward), so in practice only at the very start of Act 2, before the news. If it did, the Murderer stays, everyone keeps their character, and the rest is re-drawn. |
| The night itself | Before the blackout, **Start a new night** deals new characters and every phone types its name again. After the blackout, pause and think; a new night is a new case. |

## The last days (no freeze date)

There is no fixed freeze date (decided 23 October). The last new feature
lands by Wednesday 11 November, after the second full tech run. Thursday 12
to Saturday 14 November is checks and fixes only, and the last deploy.
Anything that cannot be fixed by then is cut.

- Safe to cut: the Nanoleaf layer (the puzzle runs on the study screen and
  the clue still lands), the Hue bulb and scenes (the TV announces the
  door), the music, the string lights (the phones carry Salem's colours),
  the Stream Deck + XL (the deck drawn on Boo's screen plays the arcade,
  and every room pays at the chime anyway), the iPad's captions (the bulletin's words
  show on the TV), and any W-O-O-F News recording or video (the words show
  on the screens).
- Never cut: the case deal, the reveal order (Murderer, then Motive, then
  Victim) and the clue path: both W-O-O-F News bulletins, the cat hints, Sir
  Irwin's countdown, the study trace and the trace reveal.
- The workshop lock: when the lists are final, open the workshop's Game
  night page and press "Freeze the workshop". Every list goes read-only and
  the phones keep the words as they are. Unfreeze only if something really
  must change, then freeze again.

## Rehearsing without touching the party

The emulator is a pretend Firebase on your own Mac. Nothing it holds reaches
the real game. It needs Java on this Mac, which is not installed yet; if it
says so, ask Claude Code.

- `npm run emulate` in one terminal. It stays running.
- `npm run emulate:seed` in another, once, to give it the starting cat lines and lists.
- `npm run fake-night -- --emulator` plays a whole night on it.
- `npm run test:rules` proves the security rules on it: a phone can read its
  own session and never anyone else's, never the secrets, never the case.
- `npm test` runs every test in the repo with no emulator and no key. Claude
  runs it before saying done; you can too.
- `npm run checks` deals 1,000 stand-in cases, checks each one, plays a whole
  fake night and runs the leak checks. It prints one line per group and a
  score, and saves the same counts for the workshop's Health page (Where we
  are links to it). Jenna runs the checks on the real secrets from their own
  page.

A night started on the real game with the party box unticked is a rehearsal
too: a practice night. It deals its own throwaway case and plays it for real
(your word of 11 November: "I want actual clues. I want actual hints, I want
actual reveals. I don't want the insert text."):

- every cat's real motive hint and bag clue, for that night's case;
- both W-O-O-F News bulletins whole, with all three recordings each;
- Sir Irwin's real motive cards, Zimothy's real cross-off (with Cross it off
  on the phone), and the trace as a picture in the Study and behind the
  bedroom door;
- Boo's real line on the arcade's screen.

What it shows is true only for that practice night. Sunday is dealt fresh,
and nothing from a practice carries over. A practice night reads nothing of
Sunday's secrets: not the real packing (not even its count of bags), not the
cats' leans, not the real drawing pictures. Its bag clues name real clue
words from ten practice bags the game packs in memory from your item list,
so no real bag matches a practice clue. The drawing's pictures are still
stand-ins on a practice night for now: its practice pictures are a separate
job. The Host tab says "This night is a rehearsal".

Cards are dealt once. A practice night that was already running when this
was published keeps the cards it had, so start a fresh one.

*Fill-in players (11 Nov, a practice night only).* On the Start card, with
the real-night box unticked, tap plus beside **Fill-in players** for up to
eight extra seats (six is the practice night's plan: you, Susan and six
fill-ins make eight). Their names are Mabel, Gus, Dot, Walt, Pearl, Otis,
then Hazel and Ned. Each one is a real seat with no phone: a character, a
bag number, and any role by the same deal as everyone, so a fill-in can be
the Murderer or the Ghost, and all of them are names in the vote and the
reveal. Your Host tab lists them under Who is here, marked "fill-in", with
no dot and no **Hand this phone on** (there is no phone), and one line above
the list says how many there are and whether they are playing along. The
workshop's Start button has the same row (a 0 to 8 list).

They play along on their own, with human pauses: each taps Locked in a few
seconds after its group card, answers every Parlour Game in 5 to 20 seconds
and votes within 20 seconds. Nothing to start: the cue relay on the brain
sees a practice night with fill-ins and runs their clock (its window prints
lines starting "fill-ins:", counts only). `npm run fill-ins` on the brain
does the same on its own, if the relay is not running. If neither is, the
house's own clock still moves them, only later.

The night never waits for a fill-in:

- The cats in Act 2 call only the people with phones, so supper comes when
  you have all seen the four cats.
- Locked in counts only the people with phones, so Act 4's rounds start
  when you have all tapped it.
- In Act 4 the people with phones share one group and walk the four rooms
  together (up to three of you; from four you are split as on any night).
  The fill-ins make up the other groups. No room's screen is ever set for a
  fill-in group, and each of those groups is paid its reward at the chime,
  like any group that did not finish.
- The drawing calls only the people with phones to the paper.
- The vote closes the moment the last of you locks in: any fill-in still
  choosing votes then, at once. A Parlour Game picks for a fill-in when it
  closes, as it does for any phone that did not answer.
- In Act 4, when your group has finished its room, the chime comes about
  thirty seconds later instead of at the round's fifteen minutes.

A fill-in never speaks, so nobody can ask one what a cat said or look in its
bag: on a fill-in night the motive is worked out from the bulletins, your
own cats, your own Library cross-off and Sir Irwin's cards. That is right
for a practice. If a guest does turn up, they can type a fill-in's name on
the join screen and take that seat, character, cards and all; the names are
not on the tap list, so nobody takes one by accident.

The real night can never have a fill-in: the row is hidden with the box
ticked and from the party day on, the server refuses a number on a real
night, and it refuses to seat one on any night that is not a practice.

*Playing a rehearsal again.* Every rehearsal is dealt from a seed word,
like tulip-4471. The Game night page's "Play a rehearsal again" lists the
last five rehearsals with their words. Tap "Play it again" beside one (or
type a word in the box), then start a night from your phone as usual: it
deals that rehearsal again, the same roles, motive, cat hints, Parlour Game
times and sets, Act 4 groups and drawing, and the same characters and bag
numbers for the same people joining in the same order. The word is used
once: the box empties when the night starts. The box is greyed out while
"This is the party night" is ticked: the party is never dealt from a word.
`npm run checks` names a failing stand-in case by its word too (check-28,
say), and `npm run checks -- --seed check-28` deals that one case again.
`npm run fake-night` prints its rehearsal's word on its first line, and
`npm run fake-night -- --seed tulip-4471` deals that night again (the fake
phones' own taps still differ).

## After the party (the morning after)

The case stays sealed until the party is over. Then the workshop's Game
night page has "The morning after" under After the party.

- It opens only on the party day or later, and only once the party night's
  reveal has played to the end (the third name, the Victim, is on the
  screen). Before that the page says "Not yet" and why, and nothing else.
  A rehearsal, a dry run or a Game test night never opens it.
- Type OPEN and tap "Open the case". The night is copied into an archive
  first: the case, everyone's phone, the night's own records, and the
  three secrets that ran. Nothing is moved.
- The page then shows what really happened: the Murderer, the motive and
  the victim, everyone's character and role and bag, which families each
  guest's cats ruled out and which family the first bulletin crossed off,
  where the clarity dial ended, every bag's contents and the drawing's
  pictures.
- Last, your call on the secrets: "Keep the secrets" leaves the packing
  list, the cats' leans and the drawing pictures sealed as they are; "Clear
  the secrets" takes them out of the sealed lists. Either way the archive
  keeps a copy. The nineteen old secret sets from 20 October never ran and
  are left alone.
- Untick "This is the party night" afterwards, as before.

## Trying the games (the Game test tab)

The workshop's Game test tab (Game test in the rail; the old Study test
address opens its first section) holds every game of Acts 4 and 6 and the
Parlour Games, in the order of the night, to try before the night on the
device each one runs on. Use it on the practice run too.

Every game has the same parts: what it is and where it plays, the steps, a
"Try it" list (a button that opens each screen in a new tab, and a square
code to open it on another device), an "It works" button, and a box for what
to fix. Beside each game's name a chip says Not tried yet, Works (with the
day) or Needs a fix. The sample screens show made-up data, and
Salem's practice and *Miss Boo LaRue's Arcade* on its own
page have no night at all: nothing is paid and no clue is dealt.

- *First, the study key word.* While no word is saved, a box at the top of
  the tab says so. Save the same word the study Mac and the brain already
  have. Not sure what it is? Ask Claude Code to save it for you; it copies
  it across without showing it.
- *Granolia's Lightbulb Moment* (the Study). Ask Claude Code to start the
  study station on the Mac by the walls; the section says whether it is
  connected. Then stand at the walls with your phone:
  - "Flash the walls": both walls blink once, so you know the station can
    reach them.
  - "Teach the taps": each white hexagon lights in turn; touch it, and the
    station learns which hexagon that touch names (the walls do not say on
    their own). The taps are kept on the Mac that runs the study, so for the
    night teach them on the M1 Air by the walls. Do it again if a hexagon
    moves.
  - "Play a practice round": the real game on the real walls, with no group
    and no clue. Copy the pattern on the white wall, then put in the colour
    and the number on the answer pad on your phone (it does what the Stream
    Deck does: a colour, a number, Undo, Submit).
  - "Stop" ends any of them. In Act 4, while a group is due at the study or
    playing there, the teach and the practice do nothing.
  - The samples: Granolia's screen, Granolia's screen with the walls down,
    and what a phone shows in the Study.
- *In Duplicate* (the Library). The real game on its own on the iPad Pro:
  three boards, Play again deals fresh ones, nothing is paid. For no Safari
  bars, open its address in Safari on the iPad, tap Share, then Add to
  Home Screen, and open it from that icon. Samples of a board, a cleared
  board, Zimothy's winner after the third board, and the reward on a phone.
  On its own the game has no names, so no turns and no winner: those come
  on a night.
- *Get Off My Lawn!* (the Orangerie). Tap "Open the practice". Every phone
  that plays scans the square code beside "The practice, for every phone
  that plays", types a first name and allows motion. Anyone taps Ready. Red
  means shake, green means freeze; thirty seconds with no slip passes a
  round; three rounds. While a round plays, the phone is only the colour;
  before and between rounds each phone shows a shake meter, so you can
  feel how hard a shake has to be, and the tab lists who joined and every
  slip, and Salem's head bounces about on the phone as it is shaken. "The
  Orangerie's screen, for the practice" (`?kiosk=orangerie&practice=1`, on
  the brain, full screen) is Salem's board for the practice: the colour
  with the word, the count, the thirty seconds, the restarts and the names
  that joined. If the brain is running, the string lights follow the
  practice too (since 28 Oct: stop the brain and start it again once to
  pick this up). Tap "Stop" when you are done. Up to twelve phones. The
  practice names no winner: the sample "After the third round: Salem names
  who slipped least" shows what the screen shows on the night.
- *Miss Boo LaRue's Arcade* (the Entryway). Built 28 October to try,
  changed from your playtests on 30 and 31 October and 1 November, and on
  the night since 5 November (your call of
  29 October). On a Mac in Google
  Chrome (Safari cannot reach the Stream Deck): quit the Stream Deck app, set
  the Mac's sound output to its own speakers (through a HomePod the sounds
  come about two seconds late), plug in the Stream Deck + XL, open "The
  arcade, free play", tap "Connect the Stream Deck" once and pick it from the
  list. The Mac's screen then becomes the scoreboard (the points, the time,
  the strikes or misses with their word, the time as a bar counting down,
  Boo): the Stream Deck is the game. Press a game in the middle of the second
  row of keys, then any key or dial to start; two minutes a game in free play. To leave a game early press the
  third dial in (it says Exit on the strip while a game counts down or runs,
  except in *Yarn Catch*, whose strip shows only the basket),
  or "Leave this game" at the top of the screen, or Escape; a game left never
  counts. Only the two outside dials steer (one key a click; in *Boo Chasing
  Her Tail* they move Boo herself, the left one across and the right one up
  and down, after the white tip of her tail, round the edges and in at the
  other side, eating the fish and keeping off the red cucumbers); *Knock It
  Off the Table* is the keys at the end of its four tables, two tables
  running each way, and *Yarn Catch* moves its basket with the left dial,
  round the edges, or a slide of a finger along the touch strip: the basket
  goes to where you lift your finger, and the strip shows only the basket in
  this game, the points being on the screen. Sir Irwin and
  his friends are in all but the tail game: never tap, knock off or catch
  them. Five strikes or misses end a game. No Stream Deck? The deck drawn on the screen plays with the
  mouse, or the arrow keys and the space bar. If the touch strip ever looks
  scrambled, add `&strip=whole` to the address and tell Claude Code. On the
  night Boo's screen (`?kiosk=boo`, the Devices page) shows only the game:
  no Connect and no setup words, so connect the Stream Deck once from this
  practice page in the same Chrome before the guests arrive; the night's
  screen remembers it. There the group scans Boo's code on her rules card,
  the visit starts with their names from the groups, each of the first two
  players' clue comes from the house at their moment (on the screen and on
  their phone), a trio's third gets Boo's line, and the chime rings at the
  end of the round; a player caught short gets the clue on their phone at
  the chime. For a group's
  visit, tap "Try a group's visit" at the bottom of the free play page, or
  close the free play tab before opening "A group's visit, for practice":
  only one arcade tab plays on the Stream Deck at a time, and the other says
  so. It asks for two or three first names: five tokens each, one for each
  game (your decision of 30 October: one round of each), in turns; a game
  you have played is dimmed with a tick on your turn and the coin under it
  has gone, so the coins left are the games left; fifty seconds a game (the last one shorter when time runs
  short); each player's
  clue on the screen once all five of their games are played (31 October;
  on this practice page, which has no night behind it, a line in square
  brackets; on a night, a practice night too, Boo's real line), Boo's line instead for a trio's
  third player, Boo's winner (the keys 1, 2 and 3 put each player's five
  scores up; it stays until you tap the touch strip), then free play until
  the chime fifteen minutes in, when Boo
  says "Be on your way." A brisk pair gets through all ten games, and a
  pair gets both clues at any pace but a crawl. A trio's fifteen games do not
  fit at full length: a brisk trio plays about thirteen, which is its first
  player's clue only (the question arcadeTrioTime). "Ring the chime", beside the clock, tries the
  ending at once, and "Back to free play", beside it, leaves the visit
  straight away. Samples of a player's clue, a trio's third player and the
  chime. In practice nothing is saved; on the night each counted round's
  score is kept per guest and per game, and the Parlour TV shows the top
  scorer in each game and the best all round with the achievements in Act 7
  (the only awards that compare one player with another, on purpose). The
  whole game: `docs/boo-arcade.md`.
- *The Parlour Games.* Every set in the workshop's bank, numbered, each with
  "See it on a phone": Boo's line and the three questions, exactly as a
  phone shows them. Nothing is sent anywhere. On a test night in Act 2, 4
  or 6, "Parlour Game now" sends one to every phone in it (in Act 4 it waits
  on each phone).
- *Sir Irwin Needs a Hand* (Act 6). Samples of every screen: Sir Irwin's
  rules with one square as his example, a name called, the square, the guess,
  his
  door slide, each phone's turn, and the bedroom screen shut and open. For
  the whole game, use a test night: paper and markers in the Library, the
  Parlour TV page open on a screen people can reach, then "Start a test
  night", join on your phone with your host name, "Go to Act 6", answer the
  two Parlour Games, and press **Start the drawing** on your Host tab. With
  one phone you are called every turn; your phone carries **At the paper**
  on each walk and the four names at each guess. The third picture opens the
  door.
- *Talk it over and the vote* (Acts 6 and 7; the ending since 11 Nov 2026).
  Samples of the Parlour TV while the room talks (the three questions over
  nine portraits, and over all fourteen), of the vote on the TV (the clock
  and the seals) and "The votes are in.", and of a phone: the talk note, the
  vote card, and Locked in. On a test night, after the door opens, **Next**
  on your Host tab opens Talk it over, and the button then reads
  **Start the vote**. Vote on every phone that joined: the vote closes when
  the last one locks in.

*The test night.* Some games need a night to run. The strip near the top
of the tab says which night is live, with four buttons: "Start a test
night", "Go to Act 4", "Go to Act 6" and "Parlour Game now". Its rules:

- A test night is always a rehearsal: nothing sealed is read, the Host tab
  says "This night is a rehearsal", and it is never the party.
- The buttons move only a night this tab started. A rehearsal started from
  a phone (the practice run, a tech run) may have guests on it, so the
  buttons leave it alone, and the start button turns into "Start a test
  night instead", which asks first: that rehearsal would end for everyone
  on it.
- Join a test night with your host name (the one on the Game night page),
  so your phone gets the Host tab.
- Act 4 plays in groups, so "Go to Act 4" needs at least two phones in the
  test night.
- The first time a test night reaches Act 2 or later, every phone shows the
  "Sorry for the interruption, continue here" button, then its role card
  for fifteen seconds, for this test night only, and carries on by itself.
- "Parlour Game now" works in Acts 2, 4 and 6.

*On the party night the party box turns testing off.* While "This is the
party night" is ticked on the Game night page, or the live night is the
party or a dry run, the test night buttons and the links to the Parlour TV
and bedroom pages are off, and the tab says why. To test in the days before,
untick the box, then tick it again before you start the party night; on
15 November the tab reminds you. The samples and the practices never touch
a night, but there is nothing to try on the day.

*Telling Claude Code what to fix.* Under each game: "What happened, and
what should change?", which screen it was on (the one you last opened there
is already picked), and "Send to Claude Code". "Speak" lets you say it
instead of typing. The note becomes a card on the Timeline for Claude Code,
filed under that game's moment of the night, and the chip says Needs a fix.
A note you have not sent yet waits in the box, even if you close the
section. When Claude Code has fixed every note for a game, the chip goes
back to Not tried yet and says to try it again. Every Claude Code session
starts by reading these notes. At the bottom of the tab, "Your notes to
Claude Code" counts them, and "Copy all open notes" copies them to paste
into a Claude Code chat. Jenna gets no note box (they know the secrets, and
you read every card): one "Needs more" button files a card in fixed words.

---

## For Claude Code (technical)

*What the test greps* (`scripts/test/docs.test.mjs`): every backticked
"npm run" name must be a script in the root `package.json`, and "npm test"
too; a backticked "cd DIR && npm start" or "cd DIR && npm run NAME" must be a
script in that folder's `package.json`; a backticked "npm --prefix DIR run
NAME" must be a script in that folder's `package.json`; a backticked "node
functions/host.mjs COMMAND" must be in `HOST_COMMANDS`
(`functions/lib/commands.js`) or be `status`; every bold phrase (two
asterisks each side) must appear in `play/src/screens/Host.jsx`. Beat names
from `seed/night.json` ("Arm the bulletin") and workshop buttons ("Freeze the
workshop") are in quotes, never bold. No em dashes anywhere in this file.

*The kiosks* (`play/src/screens/Kiosk.jsx`, `play/src/screens/Rooms.jsx`):
`?kiosk=living | ipad | memory | boo | bedroom | study | orangerie`, plus
`?kiosk=memory&play=1` (the standalone memory match, no night) and
`?kiosk=boo&play=1` (Miss Boo LaRue's Arcade on its own, 28 Oct; `&visit=1`
is the practice visit): `play/src/main.jsx` sends it to `BooArcade`
(`play/src/screens/Arcade.jsx`) before the kiosks, so it never goes through
`Kiosk.jsx`: no sign-in, no presence, no night. Plain `?kiosk=boo` is the
night's Entryway screen since 5 Nov (card 515): `Rooms.jsx` `BooRoom`
mounts the same `BooArcade` with `night` (the players from
`public/rotation` in the group's order, the chime at `public/boo.slotEndsAt`
on the server's clock, which a pause moves, `arcadeScore` for each counted
round, `arcadeClue` at each player's clue moment, which deals that player's
reward card to their phone and returns its words for the screen) while
`public/boo` is that group's visit, with the chime at once and the farewell
played out if the round moves on first, and Boo's rules card between groups
(`docs/boo-arcade.md`). The device
table is `app/src/lib/devices.js`, to Jon's key (`docs/cue-list.md`, built
26 Oct): the iPad Pro is `ipad` in Acts 2 and 3 (the Library, then the
Orangerie), `memory` in Act 4 and `bedroom` from Act 6, one `DEVICE_ROOMS`
group; Susan's MacBook Pro is `boo` all night, in the Entryway with the Stream
Deck + XL since 5 Nov (the projector's plug is still the brain's, unused,
`docs/cues-relay.md`; the arcade's Spares entry `arcadeplay` carries
`play=1`, so `byKiosk('boo')` still finds her Mac); the brain's
browser is `orangerie`; the older family iPad is listed with no address, its
note naming the question olderIpad. `app/test/devices.test.mjs` pins all of
that. The living kiosk takes the relay guesses (`callRelayGuess`) and
shows `prompts` and `title` screens (`livingView`) and bulletin video
(`BulletinVideo`, clips from `newsClips` / `closingClips` in
`play/src/lib/rooms.js`, files at `play/public/video/<clip>.mp4`; the screen
doc carries only `video: true`, the finale doc only `video.<stage>: true`, never a clip name). The memory kiosk takes
`callMemoryStep`, the boo kiosk `callArcadeClue` and `callArcadeScore` (5 Nov). W-O-O-F News clips reach the
relay as codes derived from the clip id and the station key (`STATION_KEY`
in `cues/.env`, `media/README.md`), and the relay logs counts only; a sounds
doc with `video: true` rings the chime and skips the clips. Whether the TV
plays the two bulletins as video is `meta/game.bulletinVideo` (only `true` means video: the box The bulletins are videos on the workshop's Game night page, `app/src/pages/Night.jsx`; unset or unticked, the brain plays the recordings and the TV shows the words).

*Added 25 Oct, the evening, the screens* (the cue list, step 6 of
`docs/handoff-2026-10-25.md`; `docs/room-screens.md` has the detail). The loop
slot: `Rooms.jsx` `Loop` and `Idle({ title, line, loop })`, the file from
`play/src/lib/rooms.js` `loopUrl(which)` (`LOOP_OF`: `ipad` plays `memory`),
shown from `onLoadedData`, the crest until then and on
`onError`, never a fetch. The room codes: `roomCode(which, night)` picks the
cat (`ROOM_CODE_CATS`) only while `act === 2 && beat === 'cat'` and the night
is not paused; Kiosk.jsx
shows `RoomCode` before any room branch; the address is `meetUrl(cat,
PLAY_URL)`, the same as the Game night page prints. The Act 4 rules cards:
`RulesCard` with `GAME_NAMES`, `rulesLine(id, content)` (the workshop's
`HOST GRANOLIA` or `HOST ZIMOTHY` line from the published content first, as
the phones have it, else `RULES_LINES`, copied from `functions/lib/hosts.js`
for the Study and the Library, tested equal; Salem's and Boo's intros from the
phones) and `catPictureUrl(cat, key)` over
`CAT_PICTURES` (Jon's file names, encoded, varied by `variant(key, n)`). The
study's card keeps Granolia's IDLE line and, when the station has sent
nothing for 90 seconds, "Granolia has dozed off. Find a host." (it said "The
station has gone quiet" until 29 Oct 2026: no setup words in front of the
guests). `Bell` takes `silent`, true for the orangerie kiosk (the brain's
browser), so no cue sounds twice through the HomePods. The loop `<video>` is
transparent (`opacity: 0`), never `display: none`, until its first frame, and
`play()` is called then, so Safari autoplays it. The loop files are
gitignored (`play/public/loops/*`, the README kept): they deploy from Jon's
Mac like the sounds. The
join code: `livingView` returns `join` for kind `join` and `JoinScreen` draws
`PLAY_URL` with `useQr` (`play/src/lib/qr.js`, shared with Host.jsx);
`RejoinCode` sits under the ballot clock on the TV only. The birthday card:
`BirthdayScreen` on the TV (kind `birthday`, Irwin's picture varied by
`screen.at`), `Cards.jsx` `Birthday` on the phone from `card.image`. The End:
`roomDark(night, screen)` is true once `isOver(night)` or on a black doc with
no title, so every kiosk goes dark through the one rule. The new kiosk
`?kiosk=orangerie` (`Rooms.jsx` `Orangerie`, reads `public/salem` for the
group due, and since 28 Oct `public/rotation` for Salem's winner) comes before the Living fallback; `play/src/lib/house.js` MACHINES
gains `kiosk-orangerie`. Tests: `play/test/rooms.test.mjs`,
`play/test/screen.test.mjs` (the join view, The End, the preview list),
`play/test/house.test.mjs`. Previews: `?preview=kiosk-join | kiosk-rejoin |
kiosk-code-* | kiosk-rules-* | kiosk-birthday | kiosk-loop-* |
kiosk-end`.

*Added 25 Oct, the evening, the night's shape* (the cue list, step 5 of
`docs/handoff-2026-10-25.md`). New beats in `seed/night.json`: Act 1 `rules`
(no action, screen `join`; every Act 1 beat names screen `join`), Act 3 `wrap`
(`notice:motives`, screen `join`), Act 5 `update` (`notice:update`) and Act 7
`end` (action `end`, screen `black`); `roam` carries `chime-phone` and `games`
carries `notice:break`. `deal.NOTICES` gains `motives`, `update` and `break`
and rewrites `down`; `deal.NOTICE_IMAGES` puts `image: 'birthday'` on the
cake notice (the phone draws it). `deal.end` writes `nights/{id}.over: true`
and `overAt`, once; `run.enterBeat` deletes both on any beat that is not the
end, so Back or an act jump reopens the night. `screen.SCREEN_KINDS` gains
`join` (`screen.JOIN_CARDS`: the words beside the code; the TV draws the
square from the play address). `run.nextOf(7, 'result')` is `end`;
`nextOf(7, 'end')` is null; `finale.requireNamed` still keys on the `results`
action. On the phone (`play/src/lib/night.js`): `placement(w)` is `overlay`
(a Parlour Game) or `card` (the vote, drawn by `Rest` in the Now grid with
`Ballot card`, then `BallotSent` for as long as `voteIn(night, session)`);
`phoneLock(night)` is `eyes` | `result` | `over` | null by the Act 7 beat's
action or `nights.over`, and `lockFor(night, session)` lifts the first two for
a host phone; `nowCards(..., { over })` keeps the result card at The End;
`App.jsx` shows the Relay from state `intro` on. Tests: `functions/test/run.test.mjs`
(the beat list, the walk with The End and Back from it), `screen.test.mjs`
(the join screens, F27 with dessert), `play/test/windows.test.mjs` (placement,
the ballot card, the locks), `scripts/fake-players.mjs` (the wrap, the update,
The End).

*Added 25 Oct* (handoff 24 Oct evening, item 4). Three callables, each
checking `ADMIN_UIDS` or the party gate in `functions/index.js`:
`sealedCounts` (`functions/lib/counts.js`, the admin's: the Home rows,
numbers only from `sealed/bags`, `sealed/parlour_leans` against the bank,
`sealed/relay_pictures` by `checkPicture`, at most `PER_ROUND` a round),
`morningAfter` (`functions/lib/morning.js`, the admin's: ops `status`,
`open` with `confirm: 'OPEN'`, `read`, `secrets` with `keep` or `clear`;
`open` refuses before `PARTY_DAY` and unless a night with
`forceRehearsal: false`, not `dryRun`, not `gameTest`, has
`public/finale.stage === 'victim'`; the archive is `archive/{nightId}` and
`archive/{nightId}/parts/*`, which no client rule opens; the mark is
`archive/_morning`, out of every client's reach, and `read` and `secrets`
check it against the archive and the day again; the reveal must have been
named on the party day or later (`victimNamedAt`), so a night started with
the box ticked before the party never opens; Clear copies each secret as it
stands, as a `cleared-*` part, before removing it). Boo's camera went on
11 Nov 2026: the `posePhoto` callable, `functions/lib/pose.js`,
`play/src/screens/Pose.jsx`, `play/src/lib/pose.js`, the `kiosk-pose` row and
`credits.poses` are deleted, and the first deploy after it asks whether to
delete the function `posePhoto`: answer yes. Replay by seed is
`functions/lib/seed.js`: a rehearsal's word in
`nights/{id}/private/deck.seed` (the caller's `seed`, else
`meta/game.replay_seed`, used once and never by a Game test night, else
`newSeedWord`), `meta/replay` keeps the last five for the Game night page,
and `pickFor(seed, purpose...)` gives each random choice its own stream
(`deck`, `bags`, `affection`, `case`, `waves`, `rooms`, `memory`, `relay`,
`relay-order`, `trace`, `study`, `finale`, `spill`, `default`). A party night
and a dry run have no seed and keep crypto randomness. Salem's colours keep
their own timing. The motive pictures are
`MotivePicture` in `play/src/screens/Kiosk.jsx` over
`play/src/lib/motives.js`.

*Emulators.* `firebase.json` runs auth 9099, firestore 8080, functions 5001,
hosting 5000, storage 9199, UI 4000, project `demo-murderwin`. A phone against
them: `VITE_EMULATOR=1 npm --prefix play run dev` (`VITE_EMULATOR_HOST` for a
real phone on the LAN). The relay, the station and the terminal host:
`MURDERWIN_EMULATOR=1`. `scripts/seed-emulator.mjs` writes with the token
`owner`, which only the emulator honours.

*The clock.* `functions/index.js` exports `tick`, a scheduled function
(`every 1 minutes`, Cloud Scheduler, which the Blaze plan includes) that runs
`lib/windows.js tick` for the live night (`public_state/active`): a window
past `closesAt` plus a five-second grace is settled, a paused night is
skipped. It also opens any Parlour Game that is due (`windows.tickParlour`;
in Act 4 `deal.dealWaitingGame` puts it on each phone as a waiting game),
plays an armed bulletin 2 and deals its notice (`screen.tickBulletin`, then
`notice:bulletin`), and moves the Act 2 cat queue on (`deal.tickLights`).
Then `run.clockTick`: the supper beat once every guest has seen all four
cats, and Act 4's warning, lock-in and rounds (`act4.due`; `booDone`
went on 5 Nov). The Host tab calls the host command `tick` when it opens
and every twenty seconds in Acts 2 and 4.
`node functions/host.mjs tick` is the hand version. Logs are counts only.
`note-exposure <murderer|ghost>` is the older name for `hush`: the same
record in `cases/{id}.exposure[role] = { hushedAt, act }`, written only by
`ledger.noteExposure` and read only by `ledger.isHushed`; from then on that
role's Parlour Game answers still move a cat but move the dial by 0, logged
`hushed`, and the Act 7 screen says one line about it.

*The cue list's Host tab buttons (25 Oct, evening).* Three host commands in
`run.js` and `commands.js`: `sound-test` (`screen.play` of `chime-phone`,
nothing else), `cake` (a fresh stamp on `nights/{id}/public/cues.cake = { at }`,
which the brain plays Happy Birthday for Dogs from and recalls the candles
scene, `cues/`; and `screen.birthday`, the screen kind `birthday` on the
Parlour TV, `livingView` 'birthday', until the next beat's screen. It reads
the screen first (`screen.readScreen`) and writes no card over Sir Irwin's
countdown, kind `irwin`, since his motive cards are the clue path: the reply
then carries `card: false`. `screen.birthday` is the kind's only writer; no
beat names it) and
`at-the-paper` (`relay.atThePaper`: one transaction on `public/relay` that
requires `state === 'walk'` and sets `walkEndsAt` to now, then
`run.advanceRelay`, so the square is written at once; refused with `invalid`
in any other state, and held while paused, `PAUSE_HELD`). The drawing's
clock in `relay.js`: `TURN_MS` 15 s, `WALK_MS` 20 s and `PULL_MS` 20 s (both
limits), `DRAW_BUDGET_MS` 26 min, `MAX_TURNS` 44 (the caps keep a set at 42
or fewer). The host's guess goes through the same `relayGuess` callable as the
TV: `HostRelayPanel` in `play/src/screens/Host.jsx`, rendered by `Relay.jsx`
on the drawing screen of a session with `host` set (`inline`); its rules
(which state shows which control, the reply words) are the pure helpers in
`play/src/lib/relayhost.js`, `hostRelayControl`, `guessReply` and
`paperReply`. The copy under The Big Solve on the Host tab is unreachable
today, because every phone leaves its tabs for `Relay.jsx` while the drawing
runs; it stays for the day the drawing surface changes. A reply on the panel
fades after a few seconds rather than clearing on a state change, since a
right guess moves the state in the same call that answers the tap. Previews
`?preview=relay-walk-host` and `relay-vote-host`. Check F29.

*The drawing's trace.* `run.ensureTrace` reveals the trace only when the
relay state is `done` (from `advanceRelay`, `guessRelay`, the door beat and
the ballot). `relay-reset` (Host.jsx, one tap, no act guard) deletes
`public/trace` and `private/trace` and turns the hall red, so a clear after
the door wipes the trace until another drawing finishes. A confirm, a
party-night guard after the door, and a host fallback that reveals the trace
at the dial's level are not built.

*The spare host.* `functions/host.mjs` against the live project needs
`GOOGLE_APPLICATION_CREDENTIALS` pointing at a service-account key kept out
of the repo (`service-account*.json` is gitignored). `--help` lists every
command from `HOST_COMMANDS`.

*The safeguards* (`functions/lib/safeguards.js`, host commands `spill` and
`hush <murderer|ghost>`). The ledger `cases/{nightId}.dealtClues` records a
kind, act, beat and guest key or group id (never a word of content) whenever
the study pays out, the News flash beat runs (kind `echo`, the news on the
screen), a cat's Act 2 hint and bag clue are dealt, or an Act 4 room pays
(`act4.payRoom`; `BLOCKING_KINDS` in `ledger.js`: study, echo, hint, memory,
room; the `document` kind went with the safe on 23 Oct). `spillAllowed(night, case)` is the whole rule: Acts 2 to 5, not in a
blackout, no open window, no blocking kind in the ledger. A legal spill deals
a fresh case the same way as the one it replaces (`buildCase` or
`rehearsalCase`, by the case's own flag, with a different motive; nothing
sealed is read), then `case.rerollCase` keeps the Murderer, every guest's
character and the night's Parlour Games (`parlourPlan`, `screenSalt`), takes
the new motive and its own solving plan, picks a new Ghost, restarts the dial
and the exposure record, and the role cards are replaced in place under the
same card id.
The Hush writes `cases/{nightId}.exposure[role] = { hushedAt, act }`;
`deal.applyPoints` skips the dial for a hushed role and `finaleDoc` adds
`spotlight[]` only when the record exists.

*A dry run with the real secrets* (blind-content-protocol.md): on the brain,
with the key, `npm run fake-night -- --live --i-know-this-is-the-party-database --real-secrets`.
It refuses while any night is live, creates its own night with
`createNight(db, { forceRehearsal: false, dryRun: true })`, is joined only by
the eight fake phones, and discards the night and its case afterwards.
`createNight` points `public_state/active` at it and nothing in `night.join`
refuses a dry-run night, so every kiosk and any open phone follows it, and at
the guess `nights/{id}/public/relay` carries the option names, the real
picture among them: the screens and Jon's and Susan's phones stay closed
until it prints PASS or FAIL. Since 23 Oct the flag keeps its name but
means a party-night dry run: the case is a party case (`Case: party`), which
reads the leans (`sealed/parlour_leans`, into `parlourPlan`), the packing
(`sealed/bags`, for the bag clues) and the picture bank
(`sealed/relay_pictures`), and the run prints `Party secrets used` with
counts only (lean sets, packed bags cards, rounds from the bank of 3).
Without `--real-secrets` the case is a rehearsal (`Case: rehearsal`) and reads
none of them, and nothing else under `sealed/` (since 11 Nov `createNight`
reads `sealed/bags` for the bag count on the party night and its dry run
only; a practice night deals ten bag numbers of its own). Its bag clues are
filled from a practice packing made in memory (`functions/lib/bags.js`
`packingFor` decides which packing a night reads; `practicePacking` makes
one from `seed/bag-items.json` with the packer's rules copied into
`functions/lib/packing.js`, keyed on the case's `screenSalt`). The run also
prints `Real lines (F28)`: the count of strings with a square bracket in
every phone's session, the night doc and the public docs, at eight looks
(it must be none), and `Bag clues`: how many bag lines named a clue word.
Without `--live` it uses the emulator (`--emulator`) or an
in-memory stand-in for Firestore (the default, no services at all).

*The Game test tab* (24 Oct). `app/src/pages/GameTest.jsx` at
`#/game-test`; `#/study-test` redirects to `#/game-test#study`, and a hash
of any section key opens that section. The pure part is
`app/src/lib/gameTest.js` (`SECTIONS` in the order of the night: study,
memory, salem, arcade, parlour, drawing, ending; the arcade is the
Entryway's section since 5 Nov, with the device `deck`; `nightStrip`, `chipOf`,
`feedbackTask`, `stewardTask`); the reads and the chip writes are
`app/src/lib/gameTestApi.js` (chips in `meta/game_test`, each write also in
`workshop_history`). A note is a `tasks` card with `source: 'game-test'`,
`test: <section key>`, `who: 'Claude Code'`, the section's moment, `tech`
(shown in the Timeline's For Claude Code fold, `TechFold.jsx`) and an
order from 10000 up; a card Jenna files carries `steward: true` and fixed
words only. A section's chip goes back to Not tried yet once every one of
its cards is done, so mark a fixed note done by its number and title. Every
Claude Code session starts with `npm --prefix scripts run board`
(`scripts/board.mjs`, read only, the `tasks` collection and nothing else):
it prints the open Claude Code cards, the Game test notes first, and for a
Jenna card only its title and section. The study section is
`app/src/pages/StudyTest.jsx` with the `studyTest` callable
(`docs/study-light-game.md`); the key word box is
`app/src/components/KeyWord.jsx` (`meta/game.station_key`, the field the
Host tab's Save key writes). The `gameTest` callable
(`functions/lib/gametest.js`) writes the Get Off My Lawn! practice to
`public_state/game_test_salem` with the Admin SDK, on the real game's own
rules and timing (`act4.salemFlips`; `game_test_boo` went on
5 Nov, the arcade's practice needs no night), and
never reads or writes `nights/*`, `cases/*` or `sealed/*` for it. The
practice pages are `play/src/screens/Practice.jsx`: `?practice=salem` and
`?kiosk=orangerie&practice=1`, which take the server's time from the
callable's `clock` and never write `presence/{uid}`. `?preview=questions&set=<base64url>`
shows one workshop set (`setParam`: the three questions and their first two
choices, never a point or a lean). The test night: `night-start` calls
`createNight` with `forceRehearsal: true, gameTest: true` and the label
Game test; every `night-*` command is refused while `meta/game.party_night`
is true or the live night has `forceRehearsal: false` or `dryRun: true`,
moves only a night with `gameTest: true` (through `run.hostCommand`: `act`,
`beat`, `light-up`), refuses `night-start` over a phone's rehearsal unless
`replace` is sent (the page asks first), and refuses Act 4 with fewer than
two in the roster. The admin commands check the caller's uid against
`ADMIN_UIDS` in `functions/index.js`.

*Added 25 Oct, evening* (the cue list, step 3: the blackout and the role
card). `run.hostCommand` `blackout` is refused outside Act 1 (`invalid`,
"The blackout ends Act 1") and answers `{ already: true }` while the night
is already dark; otherwise it writes the phase and the black screen with
the `blackout` sound, waits `BLACKOUT_POWER_MS` (5000) on the server
through an injectable `sleep` (the tests pass `() => {}`), then runs
`powerReturns` timed at `now + 5000` and answers
`{ powerReturned: true | false }`. `powerReturns` first moves the night out
of the dark in a transaction (phase `blackout` to `prompt`, act 2, the
stamps); a runner that finds the night already out answers
`{ already: true }` and changes nothing, so the Blackout's own return and a
Power returns by hand landing together deal the case once. The winner then
runs the sequence: `publishContent`, the case, the role cards,
`deal.setHall` red, `startParlour(2)`, the orient beat and notice,
`screen.onPhase('power')`, which writes the black screen and plays nothing.
`power` by hand answers `{ already: true }` unless the phase is `blackout`,
else runs `powerReturns`. The hall bulb:
`deal.ensureHall(colour)` writes only when unset (`enterBeat` asks green for
Act 1, red after), `deal.setHall` writes regardless (the power's return and
the role-dealing `act` jump), `revealTrace` green and `relay.reset` red as
before; the brain turns it off by the phase. `SOUND_IDS` has nine ids (no
`power`). The phone: `notes/{uid}.byNight[nightId].continued[prompt-<act>]`
is the server's time at the tap; `promptStage` in `play/src/lib/night.js`
gives `continue`, `card` or `done` (`PROMPT_HOLD_MS` 15000 from that tap, on
`clockFor`'s clock), `showsPrompt` is the gate (the prompt phase, or Act 2's
first beat in the act phase, while not done; a phone mid-card keeps its
seconds after Next), and `Prompt` in `Moments.jsx` takes a `stage`. The
button's words are `DEFAULT_UI.CONTINUE`; `HIDE` and `HOLD` are no longer
shown. `notes/{uid}.byNight[nightId].text` is the Notes box, written whole by
`writeNotes` after `NOTES_SAVE_MS` (800 ms) and when the box loses focus;
`notesLine` in `play/src/lib/night.js` gives the Saved line, `notesReconcile`
decides what the box shows when the doc changes under it (a refused write's
rollback never empties it) and `notesAfterRefusal` puts the sent words back.
Nothing on the server reads the text; the morning-after discard drops the
night's `byNight` branch with it.

*Added 29 Oct, the night, never a note in a line's place* (card 529, check
G59 in `docs/test-plan.md`). When a cat has no line (no family for the
guest, a hole in the bank, or `catHintLine` throws), `deal.hintLine` gives
`HINT_QUIET` with the cat's name and `placeholder: false, none: true` on the
party night (`c.rehearsal` false), else `HINT_PLACEHOLDER` with `placeholder:
true` as before; `station.studyClueCard` gives `STUDY_QUIET` the same way
when there is no reveal. `night.noteMissingLine(db, nightId, kind)` (kinds in
`MISSING_KINDS`: `hint`, `study`) adds one to `nights/{id}.missingLines.<kind>`
in a transaction: `greetGuest` calls it when the dealt hint is `none`,
`dealStudy` when it deals a card with no reveal (once a group, as the deal is
once). Counts only, never a cat, a guest, a group or a line.
`play/src/lib/house.js` `missingLineWords(night)` makes the red line
(`houseView().missing`, drawn in Host.jsx under the case warning). The
phone's `Clue` card with no text says `CLUE_QUIET` on the party night (tested
equal to `STUDY_QUIET`) and "(Nothing came through. Ask the host.)" on a
rehearsal. The check is `checks.everyLineOk(c, roster)`: every guest and
`LATE_JOINER`, the four `HINT_CATS`, rungs 1 to 5, each line through
`realLine(text)`, and the Study's reveal at every dial from `revealsOf`. The
fake night fails G59 if a hint or a study card comes with `none`, a phone has
no study card, or the night doc has `missingLines`. Not covered yet: the news
flash's own note (`NEWS_FLASH_PLACEHOLDER`), card 530.
