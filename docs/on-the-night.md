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
the secrets, the motive card pictures, Boo's camera for the end credits,
replaying a rehearsal by its seed word, and the morning after. Updated on
the evening of 25 October for your cue list (`docs/cue-list.md`): the
blackout ends on its own after five seconds, the "Sorry for the
interruption" button and the role card's fifteen seconds, the hall bulb
green for the welcome and red from the power's return, and nine sounds,
two of them required; and, the same evening, three Host tab buttons from
the cue list (**Sound test**, **Cake!** and **At the paper**), the drawing's
guess tapped on your own phone, and fifteen seconds a turn in the drawing.
Later that evening, the night's shape from the cue list: the house rules
beat with the join code on the Parlour TV through Act 1, the dinner wrap-up
and the two motive prompts, the dessert chime and the Happy Birthday Irwin
card, the break line as Act 6 opens, the ballot as a card on the Now tab,
the thank-you lock through the credits, and The End. Later still, the
screens: a looping graphic on every idle screen once your files are in,
each room's cat code on its screen during the Act 2 cat visits, the Act 4
rules cards with the cats' pictures, the Happy Birthday Irwin card with Sir
Irwin's picture, a rejoin code under the ballot clock, and the brain's
browser as the Orangerie's screen (`?kiosk=orangerie`); and a Notes tab on
every phone, a box for each guest's own scribbles. Updated 26 October for
the devices in your cue list's key: Susan's MacBook Pro feeds the projector
all night and never moves (the brain switches the projector's plug), your
iPad Pro roams through four stations (the Library in Act 2, the Orangerie
for supper, the memory match in Act 4, the bedroom from Act 6), Jenna's iPad
Pro is Boo's camera, and the older family iPad is out unless you say it
stays (the question *olderIpad*).
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
  3. `npm --prefix scripts run relay-pictures` (the drawing pictures, made
     blind; you never see them). Until it has run, the drawing uses stand-in
     pictures.
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
- *Music and lights on the brain.* Three playlists in Apple Music on the brain, named Murderwin · Arrival, Murderwin · Investigation and Murderwin · Supper (a hyphen in place of the dot works too), and four scenes in the Hue app
  (Murderwin Arrival, Murderwin Blackout, Murderwin Lights Out, Murderwin
  Reveal). Turn them on with `MUSIC=on` and `HUE_SCENES=on` in `cues/.env`.
  The brain changes them as the night moves; `docs/cues-relay.md` has the
  table and the set-up steps. Nothing waits on music or a light.
- *Sydney's photo.* Save it as `play/public/household/sydney.jpg`, then
  `npm run deploy`. Without it his end-credits card shows his name only.
- *A dry run with nobody in the room.* `npm run fake-night`. Eight fake phones
  play a whole rehearsal night and throw it away. It says "Case: rehearsal",
  then one line per act, a tally, PASS. Nothing in what it prints is a clue.
- *A rehearsal on phones.* Open the game on your phone, tap "Host? Start the
  night", type your name, and press **Next** through the evening with Susan's
  phone and a spare joined. Every night you start is a rehearsal unless the
  Game night page's "This is the party night" box is ticked. A rehearsal
  night shows a big red REHEARSAL band on every phone and every room screen.
- *The hardware evening* (the first full tech run, Monday 2 to Friday
  6 November). Wall, Stream Deck and bulb plugged in.
  `node scripts/hardware-check.mjs` prints PASS or FAIL. Then one run of the
  study and one grid of the drawing, the HomePods at party volume (the
  Orangerie one too, `media/README.md` says how), the Hue scenes, the
  Orangerie string lights through Apple Home (the three Shortcuts on the
  brain; if they will not answer, stop there: the phones carry Salem's
  colours on their own), the projector on the landing with Susan's MacBook
  Pro on `?kiosk=boo`, and the projector's plug: let the brain switch it off
  and on (a blackout on a test night does it) and check the full-screen
  browser comes back on the projector, not on the MacBook's own screen. The
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
  one under the ballot clock; the intro
  video and the rules slides play from a second browser tab or a player at
  "The house rules", and you switch back to the game tab after them. The join
  code is also printed at the door, the fallback. The room screens show their
  own cat's code during the Act 2 cat visits and on the Act 4 rules cards
  (the study screen, the iPad Pro in the Library, the projector, the brain's
  browser in the Orangerie); the printed codes are the fallback for a screen
  that has died or a projector still warming up.
- *The loops.* Five silent looping videos, one per idle screen, dropped into
  `play/public/loops/` by their exact names (`play/public/loops/README.md`
  has the list: Sir Irwin in the Parlour, Granolia, Zimothy in the Library,
  Salem in the bedroom, Sir Irwin's portrait and Boo walking for the
  projector), then `npm run deploy:site`. Until a file is in, that screen
  shows its crest and a line; nothing waits on them.
- *Freeze the workshop* when the lists are final, Thursday 12 to Saturday
  14 November. There is no fixed freeze date (see "The last days" below).
- Charge everything, the old iPhone 11 spare included. Spare phone chargers
  in the Orangerie.

## Which machine does what

| Machine | Its job | How it starts |
|---|---|---|
| The brain (your M3 MacBook Air) | The nine sounds, the W-O-O-F News recordings (only bulletin 2's once the bulletins are videos), the playlists, the Hue scenes, the hall light, the projector's plug (off for the blackout, from the drawing's intro to the end of Act 6, and at The End; on again when the power returns and for the ballot) and the Orangerie string lights. The spare host. Its browser is the Orangerie's screen (`?kiosk=orangerie`): Salem's code in Act 2, the Get Off My Lawn! rules card in Act 4, its loop otherwise. That browser shows the bell for every cue but rings nothing: the real sound comes from the brain itself. | Ethernet in, sleep off. `cd cues && npm start` in a terminal window you can see. It prints counts only, never a name. A browser, full screen, at `?kiosk=orangerie`, facing the Orangerie table. |
| The speakers (four HomePods) | Every sound, recording and the music, played from the brain: the Entryway, the Study, the Orangerie and the Parlour. | On the brain, choose the AirPlay group that includes the Orangerie HomePod as the sound output. |
| Your work MacBook Pro on the TV | The Parlour screen, all night: the join code in Act 1 and again at the dinner wrap-up (the intro video and the rules deck from a second browser tab), the blackout, bulletin 1, Sir Irwin's prompts while guests wait in Acts 2 and 4, the Act 4 title card, Sir Irwin's countdown, the drawing and the deduction board, the ballot clock and the reveal, then black at The End. In the drawing you tap the room's guess on your own phone; this screen's four names still take a tap, the fallback, so keep the trackpad within reach. | A browser, full screen, at `https://murderwin-at-sirwin-manor.web.app/play/?kiosk=living` |
| Study M1 Air | Granolia's Lightbulb Moment (the light puzzle) and Granolia's screen. | `cd station && npm start`, and a browser at `?kiosk=study`. Quit the Elgato app first. |
| Susan's work MacBook Pro | Beside the projector on the upstairs landing, all night, and it never moves (`?kiosk=boo`): its loop on the triangle wall from Act 1, Boo's code in Act 2, Boo's Catwalk in Act 4, its loop again, black at The End. The projector hangs off an IKEA smart plug in Apple Home that the brain switches: off for the blackout and the drawing, on again when the power returns and for the ballot. | A browser, full screen, sleep off, lid open. Tap it once. Check on the hardware evening that the browser comes back on the projector when the plug does. |
| Your iPad Pro | Roaming, four stations in turn. Act 2: in the Library with Zimothy, showing his code during the cat visits and bulletin 1's words (`?kiosk=ipad`). Act 3: on its stand in the Orangerie, bulletin 2's words through supper and the wrap-up (the same address). Act 4: back on its small stand in the Library as In Duplicate, the memory match (`?kiosk=memory`). From Act 6: the bedroom screen, door closed (`?kiosk=bedroom`). | Safari, full screen. Tap it once after each move. Three moves: to the Orangerie on your way in to supper, to the Library before **Start Act 4**, into the bedroom after Act 4. |
| Jenna's iPad Pro | Boo's camera in the Entryway, Act 4, on its stand at the end of the catwalk facing the group (`?kiosk=pose`, nice to have). Jenna is at the house to pack the bags and never plays, so it is free all night. | Safari, full screen, before **Start Act 4**. Tap Turn on the camera and allow it. |
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

1. *The router, the Hue bridge and bulb, both Nanoleaf controllers, the
   string lights and the projector's plug.* On first. Give them five
   minutes. The plug is an IKEA smart switch in the Home app, with the
   projector on it; the brain switches it through two Shortcuts on the
   brain, Projector Murderwin On and Projector Murderwin Off (each runs a
   Home scene for the plug), so it must be on and in Home before the night.
2. *The brain.* `cd cues && npm start`. Alive when the terminal prints a
   line saying what is on (music, Hue scenes, string lights) and sits there
   waiting. When the night begins it prints `[hall] green` and the bulb
   outside the bedroom turns green for the welcome; it goes off for the
   blackout, red when the power returns, and green again when the drawing
   is done. If it prints `failed` and `retrying`, the bridge address in
   `cues/.env` is wrong; the night runs on without the lights. If it says
   the chime or the blackout sound has no file and stops, run the stand-in
   step under "The nine sounds" above and start it again.
3. *The party box, then your phone.* On the workshop's Game night page, tick
   "This is the party night" (untick it after the party). Then open the game
   on your phone, tap "Host? Start the night", type your name. If a rehearsal
   night is still on, press **Start a new night** on its Host tab instead.
   The Host tab appears. No red REHEARSAL band means the box worked. Under
   "Who is here", a green dot sits beside every phone the house has heard
   from in the last two minutes. That dot is how you know a phone is alive
   all night.
4. *The study.* Your key word is kept from the rehearsal (if you ever save a
   new one, on the Game test tab or under The study, change `station/.env`
   and `cues/.env` to match and restart both). On the M1 Air, `cd station && npm start`. Alive when
   the terminal prints `study station up` with the panel counts. `DOWN`
   beside either wall means the game runs on the screen instead; the clue
   still lands.
5. *The screens.* Open the Parlour screen (`?kiosk=living`), the study, the
   iPad Pro (`?kiosk=ipad`: in the Library with Zimothy for Act 2, as your
   cue list has it), Susan's MacBook Pro by
   the projector on the landing (`?kiosk=boo`, where it stays all night) and
   the brain's own browser
   (`?kiosk=orangerie`, facing the Orangerie table), full screen. Each one shows
   a small "tap once to wake" note in the bottom right corner, so the
   browser lets it make a sound; tap anywhere once and leave it (the brain's
   browser shows the bell but rings nothing: the brain's own sound already
   comes out of the HomePods, so a tap there is harmless). Each shows
   its loop, once your files are in `play/public/loops`, or its crest and a
   line until then. They follow the night
   on their own. Two are touched on purpose: the memory match in Act 4, and
   the Parlour screen, the fallback for the drawing's guesses in Act 6 (you
   tap them on your own phone). The iPad Pro moves three times, and each
   move is in the act bullets below: to its stand in the Orangerie for
   supper (the same address), back to the Library as the memory match
   (`?kiosk=memory`) before **Start Act 4**, and into the bedroom
   (`?kiosk=bedroom`) after Act 4. Jenna's iPad Pro comes out before
   **Start Act 4** as Boo's camera. The older family iPad stays in the
   drawer unless you say it stays (the question *olderIpad*). On your Host
   tab the iPad Pro's dot for its earlier station goes quiet after each move
   (the Library and Orangerie one from Act 4, the memory match one once it
   is in the bedroom); that is right, not a fault.
   A small dot in the bottom left corner is green while the screen can hear
   the house, amber if it has gone quiet, red if it is off the wifi. A bell
   in the top right corner shows for three seconds whenever a sound is
   called for, so you can tell a silent speaker from a missed cue. The Host
   tab has a dot for each screen.
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
  TV). "The house rules" is the beat for the intro video and the rules
  slides: play them from a second browser tab or a player on the same
  MacBook, and switch back to the game tab for the next beat; the brain stops
  the music and dims the lights for them. When the rules reach the
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
  screen, and tap it once (In Duplicate waits there for each group). If you
  are using Boo's camera, Jenna's iPad Pro stands at the end of the catwalk
  facing the group, on `?kiosk=pose` in Safari, full screen, with Turn on
  the camera tapped.
  **Start Act 4** gives every phone a two-minute warning and makes the
  groups (nobody sees them yet). Two minutes later, on its own: the chime,
  the title card on the Parlour TV, and every phone shows its group as
  portraits with a Locked in button. The rounds start when everyone is
  locked in, or two minutes after that. Each round is ten minutes on the
  server's clock: the chime sends every group to a room, and every group
  visits all four rooms once:
  - The Study: Granolia's Lightbulb Moment (the light puzzle), upstairs.
    Pays the Ghost's trace and a bag hint.
  - The Library: In Duplicate (Zimothy's memory match), on the iPad Pro:
    three boards of 7, 10 and 14 pairs. Pays one wrong motive crossed off
    and a bag hint.
  - The Orangerie: Get Off My Lawn! (Salem's Motion Game), on the group's
    own phones. Red means shake, green means freeze; a slip on any phone
    restarts the round; thirty seconds clean passes it; three rounds, each
    faster. The phones tint red and green, and the string lights follow if
    they answer the brain. Pays a bag hint (Salem's may be backwards).
  - The Entryway: Boo's Catwalk, on the triangle wall from
    Susan's MacBook Pro and the projector: Boo struts, the music stops, the
    group strikes a pose and holds it, Boo judges, three times. Pays one
    wrong motive crossed off and a bag hint. If Boo's camera is up, Jenna's
    iPad Pro facing the catwalk shows the group to itself and takes one
    photo a moment into each group's last pose, for the end credits. Nothing
    to press.
  The group scans the room's code to begin. Between groups each room's
  screen shows its game's rules card: the name and its line, the host cat's
  words (the Study's and the Library's follow a host line you change in the
  workshop, the same as the phones; the study's card also carries Granolia's
  "Touch any panel to begin"), a full picture of the cat (a different one as the groups change)
  and the room's code, so a group arriving knows what to do before anyone
  explains; the Orangerie's screen (the brain's browser) shows its card all
  through Act 4, since its game is on the phones. A group that finishes early is
  paid at once and goes back to the Parlour; at the chime, any room not
  finished is paid anyway. The bag hints are about the Ghost's bag. With
  five groups there are five rounds, and each round one group waits in the
  Parlour, where Sir Irwin's prompts run on the TV and any waiting Parlour
  Game can be played. Your Host tab says the round and the time to the next
  chime; **Next** moves everyone on at once. **Finish this group now** pays
  the group in the study at once. After the last round every phone says
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
  each slide up long enough to read (about two minutes in all), while every
  phone says to be in the Parlour for the final event and the brain switches
  the projector off for the drawing (its plug comes back on for the ballot);
  then a practice smiley and three rounds.
  The game calls a random player by their character's picture and name; they
  walk to the paper in the Library before the square shows. The walk allows
  twenty seconds, a limit, not a wait: the moment they are at the paper,
  press **At the paper** on your phone and the square shows at once. The
  room describes it, words only, fifteen seconds a turn. When a grid is full
  the room agrees and tells you, and you tap the room's guess on your own
  phone: the four names, A to D (the TV's own names still take a tap, the
  fallback, with the trackpad); a wrong one is crossed off. While the drawing
  runs your phone shows it like everyone else's, with At the paper and the
  four names on it, so you never have to find the Host tab; Susan's phone has
  them too. While it
  runs, **Next** refuses to leave it. When the third picture is named, the TV
  shows Sir Irwin's "Pawsome!" door slide, the hall light goes green and the
  bedroom screen shows the trace. **Next** tells every phone the door is open,
  and everyone goes to look. **Next** again opens the deduction round (built
  this way: it comes after the door opens), and the TV shows every character
  with the thing they struck out beneath.
- **Clear the drawing** wipes the drawing and shuts the door again. The trace
  only comes out when a drawing is finished, so after a clear press
  **Start the drawing** and finish it. Never press it after the door has
  opened. (It is one tap with no question; a guard on it is not built yet.)
- Act 7: **Next** opens the ballot, two minutes on the server's clock. Salem
  hosts it on every phone as a card on the Now tab, so a guest can still open
  their Clues, Notes and Motives while they decide (your cue list, cue 19); after
  Lock it in a small "Your three are in" card holds its place. The TV shows
  the clock, the trace and the board; the projector comes back on, with its
  loop, for the rest of the night. The two minutes always run, even when
  every pick is in. **Next** again
  starts the TV: the stats, the achievements you gave, then the graph, and
  every guest's phone locks on "Eyes on the screen." with no tabs (yours and
  Susan's keep their tabs: the Host tab runs the reveal). Nobody
  is named until you press. When the Host tab says the screen is ready, press
  **Name the Murderer**, then **Name the Motive**, then **Name the Victim**,
  each when the room is ready for it. Each press plays its part of the
  closing W-O-O-F News bulletin (as video on the TV once The bulletins are videos is ticked; until then the brain plays the recordings and the words show); the card shows once its
  lead-in part has played, and the next press cuts off anything still
  playing. After the
  Victim, on their own: the closing story, the dial's journey, the end
  credits (with each group's last pose from Boo's camera, if it was up) and
  Sir Irwin's last card, about two minutes. **Hold the screen**
  stops it where it is (a toast, a photograph); **Carry on** resumes, and
  nothing on the screen is skipped. **Next** for everyone's result only works
  once all three are named: every guest's phone shows its own three answers
  against the truth with "Thank you for playing." under them and no tabs,
  while the credits roll (your phone and Susan's show the result on Now, tabs
  and all). Then **Next** once more for "The End": every screen goes black,
  the projector is off, and every phone opens up for good with everything
  readable: the result on Now, the clues, the notes. The Host tab says the
  night is over. **Back one** from "The End" opens the night up again, for a
  rehearsal that wants to see the result twice. A pause during the ballot
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
- **Pause, Irwin needs the garden** stops every clock in the house. **Resume**
  carries on from where it stopped; nobody loses time.
- The house: scenes. The brain changes the music and the Hue scenes on its
  own as the night moves. If you want one by hand: **Arrival**, **Blackout**,
  **Lights Out** or **Reveal** recalls that scene, and the music has
  **Play**, **Pause** and **Next playlist**. Your choice holds until the
  night's next change. The buttons never say why.
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

## What each screen shows

| Act | The Parlour TV | The other screens |
|---|---|---|
| 1 | The join code, big, with "Scan to join", through the whole act, with the Parlour's loop beside it. The intro video and the rules slides in a second browser tab or a player, at "The house rules". | Every other screen on its loop (its crest until the file is in): the projector from Act 1. |
| 2 | W-O-O-F News bulletin 1: as video once the box is ticked on the Game night page, until then the words with the recordings. Then, during the cat visits, Sir Irwin's prompts, a new one every three minutes. | The iPad Pro, in the Library, keeps bulletin 1's words up. Then, through the cat visits, every room screen shows its cat's code, big: Granolia's in the study, Zimothy's on the iPad Pro in the Library (`?kiosk=ipad`; `?kiosk=memory` shows his code too), Boo's on the wall from the projector, Salem's on the brain's browser in the Orangerie. The printed codes are the fallback. |
| 3 | Bulletin 2's words, when it plays. At "Dinner wrap-up", the join code again, for anyone who needs to rejoin. | The iPad Pro, carried to its stand in the Orangerie for supper: bulletin 2's words, with the recording on the HomePods, kept up through the wrap-up. Every other screen on its loop. |
| 4 | The title card ("Act 4 · Behind Closed Doors"), then Sir Irwin's prompts during the rounds. | The study: Granolia's Lightbulb Moment. The iPad Pro, back in the Library: In Duplicate. Susan's MacBook Pro on the wall: Boo's Catwalk. Boo's camera (Jenna's iPad Pro), if it is up: the group like a mirror, and the photo of the last pose in its corner. The group's phones in the Orangerie: Get Off My Lawn!, with the rules card and the code on the brain's browser in the room. Between groups each room's screen shows its game's rules card: the name and its line, the host cat's words, the cat's picture (changing with the groups) and the room's code. |
| 5 | The Happy Birthday Irwin card from **Cake!** while the cake is served, with his full picture. Then Sir Irwin: his opener, the countdown line, the motive cards (each with its picture once drawn, else the rhyme alone), his closer. | Every screen on its loop. The bedroom screen (the iPad Pro), once it is in: "The door is closed", its loop behind the words. |
| 6 | Sir Irwin Needs a Hand: his rules slides (the first one carries the game's name), the practice, then each called player's picture and character name, the black square with its label, and the four names to guess from (you tap the room's guess on your phone; a tap here still works). Then the "Pawsome!" slide, "The door is open", and the deduction board. | The projector is off from the drawing's intro (the brain switches its plug). In the bedroom, on the iPad Pro: the trace, from the moment the third picture is named. |
| 7 | The ballot clock with the trace, a small rejoin code under the clock, and the board. Then the stats, the achievements you gave, the graph, each name card as you press (the closing bulletin, as video once the box is ticked; the motive's card with its picture once drawn), the closing story, the dial's journey, the end credits (with Boo's Catwalk photos, when there are any) and Sir Irwin's last card. At "The End": black. | In the bedroom: the trace. The projector is back on from the ballot, with its loop. At "The End" every screen goes black and the projector is off. |

Outside Act 4 the study screen is on its loop (its crest until the file is
in) unless a round is under way; in Act 4, between groups, it shows
Granolia's rules card with her "Touch any panel to begin" under it. Every screen is dark
from the blackout, through the five seconds and the role cards, until your
first **Next** in Act 2 (built so on purpose, so every eye is on its own
phone while the roles are read; cue 5 says the loop comes back at once, and
the question *promptScreen* on the board lets you choose), and near-black
with "One moment" while the night is paused. The phones say where to look.
On a
rehearsal night every phone and screen has a red REHEARSAL band, and every
slot that would show a secret shows a stand-in in square brackets instead;
on the party night both are gone.

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
| The memory match (the iPad Pro in the Library) | Carry on. A group that did not clear it is paid its cross-off at the chime anyway. |
| Boo's wall or the projector | Carry on, or open `?kiosk=boo` on any screen the group can see. A group that did not finish is paid at the chime anyway. In Act 2 the Entryway's printed code does Boo's screen's job. If the projector's plug never came back on after the blackout or the drawing, switch it on by hand in the Home app; the brain carries on, and the projector takes a moment to warm up. |
| The Orangerie screen (the brain's browser) | Carry on. Salem's game is on the phones; the printed code in the Orangerie serves Act 2 and Act 4, and the phones have "Cannot scan?" anyway. Open `?kiosk=orangerie` on any spare screen if you want the rules card back. |
| A loop will not play | The screen shows its crest and a line instead, and nothing else changes. Check the file's name against `play/public/loops/README.md` and that it was deployed. |
| Boo's camera (Jenna's iPad Pro in the Entryway) | Carry on. The catwalk runs the same without it; the end credits have no photo for that group. If it says the camera is off, allow the camera for the page in the iPad's Settings and reload. |
| Get Off My Lawn! (a phone with no motion sensor, or the string lights) | Nothing to do. A phone that cannot feel a shake never slips; the phones tint red and green whatever the lights do. |
| A room code will not scan | Try the other copy: the one on the room's screen or the printed one. Act 2: the phone has "Cannot scan? I am with" the cat; or the guest waits, and after four minutes the phone shows the cat anyway and calls the next guest. Act 4: the phone has "Cannot scan? We are in" the room. |
| The study station | Keep going. The group in the study is paid at the chime, and Granolia's lines show on their phones. |
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
  the projector for Boo's wall (the wall page runs on any screen, and every
  room pays at the chime anyway), the iPad's captions (the bulletin's words
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
too: a throwaway case, a stand-in in square brackets wherever a secret would
show (the cats' hints, the bag clues, the cross-offs, the trace, the news
line), stand-in drawing pictures, and the red REHEARSAL band on every
screen.

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
  first: the case, everyone's phone, the night's own records, Boo's
  Catwalk photos, and the three secrets that ran. Nothing is moved, except
  the guests' photos: they leave the game site (where anyone with the game
  open could read them) and stay in the archive, shown on the page to
  save.
- The page then shows what really happened: the Murderer, the motive and
  the victim, everyone's character and role and bag, which families each
  guest's cats ruled out and which family the first bulletin crossed off,
  where the clarity dial ended, every bag's contents, the drawing's
  pictures, and each group's photo from Boo's camera, to save.
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
day) or Needs a fix. The sample screens show made-up data, and the two
practices (Salem's and Boo's) have no night at all: nothing is paid and no
clue is dealt.

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
  three boards, Play again deals fresh ones, nothing is paid. Samples of a
  board, a cleared board and the reward on a phone.
- *Get Off My Lawn!* (the Orangerie). Tap "Open the practice". Every phone
  that plays scans the square code beside "The practice, for every phone
  that plays", types a first name and allows motion. Anyone taps Ready. Red
  means shake, green means freeze; thirty seconds with no slip passes a
  round; three rounds. Each phone shows a shake meter, so you can feel how
  hard a shake has to be, and the tab lists who joined and every slip. Tap
  "Stop" when you are done. Up to twelve phones.
- *Boo's Catwalk* (the Entryway). Open "Boo's wall, the practice show" on
  the projector computer or any screen, full screen, and tap it once so it
  can play sound. Open the practice show on one or more phones. Tap "Start
  the show": three seconds later Boo struts, the music stops, you strike a
  pose and hold it, Boo judges, three times. Nothing is paid. To try Boo's
  camera too, open "Boo's camera, the practice show" on the iPad Pro, stand
  it facing you and tap Turn on the camera: at the last pose it takes the
  photo and keeps it on its own screen, never sent anywhere.
- *The Parlour Games.* Every set in the workshop's bank, numbered, each with
  "See it on a phone": Boo's line and the three questions, exactly as a
  phone shows them. Nothing is sent anywhere. On a test night in Act 2, 4
  or 6, "Parlour Game now" sends one to every phone in it (in Act 4 it waits
  on each phone).
- *Sir Irwin Needs a Hand* (Act 6). Samples of every screen: Sir Irwin's
  rules and the practice square, a name called, the square, the guess, his
  door slide, each phone's turn, and the bedroom screen shut and open. For
  the whole game, use a test night: paper and markers in the Library, the
  Parlour TV page open on a screen people can reach, then "Start a test
  night", join on your phone with your host name, "Go to Act 6", answer the
  two Parlour Games, and press **Start the drawing** on your Host tab. With
  one phone you are called every turn; your phone carries **At the paper**
  on each walk and the four names at each guess. The third picture opens the
  door.
- *The deduction round* (Act 6). Samples of a phone striking one thing out
  and of the board on the Parlour TV. On a test night, after the door opens,
  **Next** on your Host tab starts the round.

*The test night.* Some games need a night to run. The strip near the top
of the tab says which night is live, with four buttons: "Start a test
night", "Go to Act 4", "Go to Act 6" and "Parlour Game now". Its rules:

- A test night is always a rehearsal: nothing sealed is read, the red
  REHEARSAL band shows, and it is never the party.
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
`?kiosk=living | ipad | memory | boo | pose | bedroom | study | orangerie`, plus
`?kiosk=memory&play=1` (the standalone memory match, no night). The device
table is `app/src/lib/devices.js`, to Jon's key (`docs/cue-list.md`, built
26 Oct): the iPad Pro is `ipad` in Acts 2 and 3 (the Library, then the
Orangerie), `memory` in Act 4 and `bedroom` from Act 6, one `DEVICE_ROOMS`
group; Susan's MacBook Pro is `boo` all night (the projector's plug is the
brain's, `docs/cues-relay.md`); Jenna's iPad Pro is `pose`; the brain's
browser is `orangerie`; the older family iPad is listed with no address, its
note naming the question olderIpad. `app/test/devices.test.mjs` pins all of
that. The living kiosk takes the relay guesses (`callRelayGuess`) and
shows `prompts` and `title` screens (`livingView`) and bulletin video
(`BulletinVideo`, clips from `newsClips` / `closingClips` in
`play/src/lib/rooms.js`, files at `play/public/video/<clip>.mp4`; the screen
doc carries only `video: true`, the finale doc only `video.<stage>: true`, never a clip name). The memory kiosk takes
`callMemoryStep`, the boo kiosk `callBooDone`. W-O-O-F News clips reach the
relay as codes derived from the clip id and the station key (`STATION_KEY`
in `cues/.env`, `media/README.md`), and the relay logs counts only; a sounds
doc with `video: true` rings the chime and skips the clips. Whether the TV
plays the two bulletins as video is `meta/game.bulletinVideo` (only `true` means video: the box The bulletins are videos on the workshop's Game night page, `app/src/pages/Night.jsx`; unset or unticked, the brain plays the recordings and the TV shows the words).

*Added 25 Oct, the evening, the screens* (the cue list, step 6 of
`docs/handoff-2026-10-25.md`; `docs/room-screens.md` has the detail). The loop
slot: `Rooms.jsx` `Loop` and `Idle({ title, line, loop })`, the file from
`play/src/lib/rooms.js` `loopUrl(which)` (`LOOP_OF`: `ipad` plays `memory`,
`pose` none), shown from `onLoadedData`, the crest until then and on
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
study's card keeps Granolia's IDLE line and the station's "gone quiet"
warning. `Bell` takes `silent`, true for the orangerie kiosk (the brain's
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
group due) comes before the Living fallback; `play/src/lib/house.js` MACHINES
gains `kiosk-orangerie` and `kiosk-pose`. Tests: `play/test/rooms.test.mjs`,
`play/test/screen.test.mjs` (the join view, The End, the preview list),
`play/test/house.test.mjs`. Previews: `?preview=kiosk-join | kiosk-rejoin |
kiosk-code-* | kiosk-rules-* | kiosk-boo-intro | kiosk-birthday | kiosk-loop-* |
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
(a Parlour Game), `screen` (the deduction round) or `card` (the ballot, drawn
by `Rest` in the Now grid with `Ballot card`, then `BallotSent`);
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
stands, as a `cleared-*` part, before removing it) and `posePhoto` (`functions/lib/pose.js`, at the
party, from the pose camera's own presence row (`fromPoseCamera`, the
guest key `kiosk-pose`) or the admin: a JPEG data URL of at most
`POSE_MAX_CHARS`, kept at
`nights/{id}/public/pose-<group>` only while `public/boo` is that group's
show; `finaleDoc` lists the groups with a photo in `credits.poses`, and the
TV reads each photo from its own doc). Replay by seed is
`functions/lib/seed.js`: a rehearsal's word in
`nights/{id}/private/deck.seed` (the caller's `seed`, else
`meta/game.replay_seed`, used once and never by a Game test night, else
`newSeedWord`), `meta/replay` keeps the last five for the Game night page,
and `pickFor(seed, purpose...)` gives each random choice its own stream
(`deck`, `bags`, `affection`, `case`, `waves`, `rooms`, `memory`, `relay`,
`relay-order`, `trace`, `study`, `finale`, `spill`, `default`). A party night
and a dry run have no seed and keep crypto randomness. Salem's colours and
Boo's poses keep their own timing. The pose camera is
`play/src/screens/Pose.jsx` (`?kiosk=pose`, and `?kiosk=pose&practice=1`
on the practice show, which sends nothing); the motive pictures are
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
cats, and Act 4's warning, lock-in, rounds and Boo's show (`act4.due`,
`act4.booDone`). The Host tab calls the host command `tick` when it opens
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
none of them; `createNight` reads `sealed/bags` on every night, for the bag
count only. Without `--live` it uses the emulator (`--emulator`) or an
in-memory stand-in for Firestore (the default, no services at all).

*The Game test tab* (24 Oct). `app/src/pages/GameTest.jsx` at
`#/game-test`; `#/study-test` redirects to `#/game-test#study`, and a hash
of any section key opens that section. The pure part is
`app/src/lib/gameTest.js` (`SECTIONS` in the order of the night: study,
memory, salem, boo, parlour, drawing, deduction; `nightStrip`, `chipOf`,
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
(`functions/lib/gametest.js`) writes the two practices to
`public_state/game_test_salem` and `public_state/game_test_boo` with the
Admin SDK, on the real game's own rules and timing (`act4.salemFlips`,
`act4.booShow`, Boo's verdicts from `ui_copy`), and never reads or writes
`nights/*`, `cases/*` or `sealed/*` for them. The practice pages are
`play/src/screens/Practice.jsx`: `?practice=salem`, `?practice=boo` and
`?kiosk=boo&practice=1`; they take the server's time from the callable's
`clock` and never write `presence/{uid}`. `?preview=questions&set=<base64url>`
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
