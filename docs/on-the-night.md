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
- *Put the game live.* `npm run deploy`. This is the one line to run whenever
  Claude says a build is done. It builds the workshop and the phone client,
  refuses to go on if either came out empty, and then publishes the site, the
  rules and the server. Nothing goes live until you run it. The first deploy
  after 23 October asks whether to delete the function solve (it ran the old
  Act 2 safe): type y.
- *The Game night page* (in the workshop). Type both hosts' names, so you and
  Susan get the Professors. Type the names Jessa and Jake will type, for Sir
  Irwin's two seats. Print the four cat-room codes from the same page.
- *The key word.* Pick one word of four letters or more. On a rehearsal
  night, type it on your Host tab under The study and tap **Save key**. It is
  kept from night to night. Put the same word in `station/.env` on the study
  Mac and in `cues/.env` on the brain, each as `STATION_KEY=yourword`. The
  brain needs it to find the W-O-O-F News recordings.
- *The ten sounds.* The brain will not start while any of the ten cue
  sounds has no file in `media/` (the tenth, `chime-phone`, rings when supper
  is ready, when Act 4 starts and at every Act 4 round, and as the Act 6
  Parlour Games open). Until you have recorded them, run
  `node scripts/make-placeholder-sounds.mjs` once on the brain. It makes a
  stand-in tone for each (`media/README.md` lists what each one is for).
- *The recordings.* Bulletin 2 is sound: each line its own file in `media/`
  on the brain, named as `media/README.md` says, played on the HomePods at
  supper. Bulletin 1 and the closing bulletin are video on the Parlour TV
  (decided 23 October): one .mp4 per part in `play/public/video`, named as
  its clip in `seed/woof-news.json`, then `npm run deploy`, then tick The
  bulletins are videos on the Game night page. From then the TV plays them
  with its own sound and the brain does not play those recordings, so you
  never hear them twice. Until the box is ticked, the brain plays your
  recordings and the TV shows the words, as before.
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
  Orangerie string lights from the brain (if they will not answer, stop
  there: the phones carry Salem's colours on their own), and the projector
  on the landing with Susan's MacBook Pro on `?kiosk=boo`. The checklists
  are in `docs/study-light-game.md`, `docs/relay-drawing-game.md` and
  `docs/cues-relay.md`.
- *The second full tech run*, by Wednesday 11 November: every machine on at
  once, Act 1 to Act 7. After it, no new features: checks and fixes only.
- *The square code.* Save it from the Game night page. Your Host tab shows it
  too, under The doors. Print the four room codes (Granolia in the Study,
  Salem in the Orangerie, Zimothy in the Library, Boo in the Entryway) from
  the same page: the same four codes serve Act 2 and Act 4. Until you answer
  *rulesDeckScreen*, the default is built: the rules deck and the join code
  show on the Parlour TV in a second browser tab, and you switch back to the
  game tab before the blackout. The join code is also printed at the door.
- *Freeze the workshop* when the lists are final, Thursday 12 to Saturday
  14 November. There is no fixed freeze date (see "The last days" below).
- Charge everything, the old iPhone 11 spare included. Spare phone chargers
  in the Orangerie.

## Which machine does what

| Machine | Its job | How it starts |
|---|---|---|
| The brain (your M3 MacBook Air) | The ten sounds, the W-O-O-F News recordings (only bulletin 2's once the bulletins are videos), the three playlists, the Hue scenes, the hall light and the Orangerie string lights. The spare host. | Ethernet in, sleep off. `cd cues && npm start` in a terminal window you can see. It prints counts only, never a name. |
| The speakers (four HomePods) | Every sound, recording and the music, played from the brain: the Entryway, the Study, the Orangerie and the Parlour. | On the brain, choose the AirPlay group that includes the Orangerie HomePod as the sound output. |
| Your work MacBook Pro on the TV | The Parlour screen, all night: the rules deck in Act 1, the blackout, bulletin 1, Sir Irwin's prompts while guests wait in Acts 2 and 4, the Act 4 title card, Sir Irwin's countdown, the drawing and the deduction board, the ballot clock and the reveal. In the drawing the room taps its guess on this screen, so keep the trackpad within reach. | A browser, full screen, at `https://murderwin-at-sirwin-manor.web.app/play/?kiosk=living` |
| Study M1 Air | Granolia's Lightbulb Moment (the light puzzle) and Granolia's screen. | `cd station && npm start`, and a browser at `?kiosk=study`. Quit the Elgato app first. |
| Susan's work MacBook Pro | Idle until Act 4. Act 4: beside the projector on the upstairs landing, showing Boo's Catwalk on the triangle wall (`?kiosk=boo`). After Act 4: the bedroom screen (`?kiosk=bedroom`), door closed. | A browser, full screen. Tap it once after each move. |
| Your iPad Pro | Acts 2 and 3: the words of bulletins 1 and 2, on a stand in the Orangerie (`?kiosk=ipad`). From Act 4: a spare screen. | Safari, full screen. Tap it once. |
| The older iPad | In Duplicate (the memory match), on its small stand in the Library, all night (`?kiosk=memory`). | Safari, full screen. Tap it once. |
| Susan's 8th-gen iPad | Decor (the picture frame). Never a cue. If a guest needs a device, take the decor off and hand it over. | The plain game address, if it is needed. |
| The old iPhone 11 | The spare phone. | Charged, on the plain game address, left on the join screen. |
| Your phone and Susan's | The Host tab. | Type your names at the door. The tab appears on its own. |

The workshop's Devices page has the same table, room by room, with each
address to open and a square code for it.

The game itself lives on the internet at https://murderwin-at-sirwin-manor.web.app/play/.
Every phone and every screen only needs the wifi. The brain does not serve the
game; it serves the lights and the speakers.

## Start order, and how you know each one is alive

1. *The router, the Hue bridge and bulb, both Nanoleaf controllers and the
   string lights.* On first. Give them five minutes.
2. *The brain.* `cd cues && npm start`. Alive when the terminal prints a
   line saying what is on (music, Hue scenes, string lights) and sits there
   waiting. When the night begins it prints `[hall] red` and the bulb
   outside the bedroom turns red. If it prints `failed` and `retrying`, the
   bridge address in `cues/.env` is wrong; the night runs on without the
   lights. If it lists missing sounds and stops, run the stand-in step under
   "The ten sounds" above and start it again.
3. *The party box, then your phone.* On the workshop's Game night page, tick
   "This is the party night" (untick it after the party). Then open the game
   on your phone, tap "Host? Start the night", type your name. If a rehearsal
   night is still on, press **Start a new night** on its Host tab instead.
   The Host tab appears. No red REHEARSAL band means the box worked. Under
   "Who is here", a green dot sits beside every phone the house has heard
   from in the last two minutes. That dot is how you know a phone is alive
   all night.
4. *The study.* Your key word is kept from the rehearsal (if you ever type a
   new one under The study, change `station/.env` and `cues/.env` to match
   and restart both). On the M1 Air, `cd station && npm start`. Alive when
   the terminal prints `study station up` with the panel counts. `DOWN`
   beside either wall means the game runs on the screen instead; the clue
   still lands.
5. *The screens.* Open the Parlour screen (`?kiosk=living`), the study, the
   iPad Pro (`?kiosk=ipad`, on its stand in the Orangerie), the older iPad
   (`?kiosk=memory`, on its stand in the Library) and Susan's MacBook Pro by
   the projector on the landing (`?kiosk=boo`), full screen. Each one shows
   a small "tap once to wake" note in the bottom right corner, so the
   browser lets it make a sound; tap anywhere once and leave it. Each shows
   its crest or its game's name and a waiting line. They follow the night
   on their own. Two are touched on purpose: the memory match in Act 4, and
   the Parlour screen, where the room taps its drawing guesses in Act 6. The
   bedroom screen comes later: Susan's MacBook Pro goes there after Act 4.
   A small dot in the bottom left corner is green while the screen can hear
   the house, amber if it has gone quiet, red if it is off the wifi. A bell
   in the top right corner shows for three seconds whenever a sound is
   called for, so you can tell a silent speaker from a missed cue. The Host
   tab has a dot for each screen.
6. *The rooms.* The four room codes on the walls: Granolia in the Study
   (upstairs), Salem in the Orangerie, Zimothy in the Library, Boo in the
   Entryway. None in the Parlour. The same codes serve Act 2 and Act 4. In
   the Library: the paper roll and the markers for the drawing, and the
   older iPad on its stand. The Orangerie table set before guests arrive.
   Jenna packs the ten bags somewhere nobody who plays can see.
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
- Act 1: arrivals, meet the household, introductions, then ready for the
  dark. The rules deck and the join code show on the Parlour TV in a second
  browser tab (the default for *rulesDeckScreen*, still yours to change);
  switch back to the game tab before the blackout. Act 1 ends with
  **Blackout**.
  When the room is settled, **Power returns · Act 2**. Every phone shows its
  role card, held fifteen seconds. Yours too.
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
  turn"; the guest taps On my way, goes alone, scans the code on the wall,
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
  left you a note").
- Act 3: phones down, supper in the Orangerie. The bags come to the table,
  and the whole table may share what is in them. Near the end of supper,
  press **Next** when it says "Next: Arm the bulletin". Your phone says only
  "Armed." W-O-O-F News bulletin 2 plays on its own 3 to 5 minutes later
  through the HomePods (the Orangerie one too), with the words on the iPad.
  Every phone gets a notice when it plays, yours too. When everyone has
  settled after supper, press **Start Act 4** (it shows on your Host tab in
  Act 3).
- Act 4, Behind Closed Doors: four game rooms, pairs and trios, about an
  hour. **Start Act 4** gives every phone a two-minute warning and makes the
  groups (nobody sees them yet). Two minutes later, on its own: the chime,
  the title card on the Parlour TV, and every phone shows its group as
  portraits with a Locked in button. The rounds start when everyone is
  locked in, or two minutes after that. Each round is ten minutes on the
  server's clock: the chime sends every group to a room, and every group
  visits all four rooms once:
  - The Study: Granolia's Lightbulb Moment (the light puzzle), upstairs.
    Pays the Ghost's trace and a bag hint.
  - The Library: In Duplicate (Zimothy's memory match), on the older iPad:
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
    wrong motive crossed off and a bag hint.
  The group scans the room's code to begin. A group that finishes early is
  paid at once and goes back to the Parlour; at the chime, any room not
  finished is paid anyway. The bag hints are about the Ghost's bag. With
  five groups there are five rounds, and each round one group waits in the
  Parlour, where Sir Irwin's prompts run on the TV and any waiting Parlour
  Game can be played. Your Host tab says the round and the time to the next
  chime; **Next** moves everyone on at once. **Finish this group now** pays
  the group in the study at once. After the last round every phone says
  back to the Parlour, and **Next** goes on to Act 5. **Make the groups**
  makes the groups early if you ever need them before Start Act 4.
  After Act 4, carry Susan's MacBook Pro from the landing into the bedroom,
  open `?kiosk=bedroom`, tap it once, and close the door. It shows "The door
  is closed" until the third picture is named.
- Act 5: cake, and everyone wanders. Then **Next** for Sir Irwin: the chime,
  and his countdown on the TV. The phones send everyone to the Parlour.
  Before you press **Next** for Act 6, check the bedroom screen is in and
  the door is closed.
- Act 6 opens with two Parlour Games, back to back. Wait until the second has
  ended on your own phone, then **Next** starts Sir Irwin Needs a Hand (the
  Relay Drawing; or **Start the drawing**). Sir Irwin explains it on the TV,
  each slide up long enough to read (about two minutes in all), then a
  practice smiley and three rounds.
  The game calls a random player by their character's picture and name; they
  walk to the paper in the Library before the square shows, and the room
  describes it, words only. When a grid is full the room agrees and taps its
  guess on the Parlour screen; a wrong one is crossed off. While it
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
- Act 7: **Next** opens the ballot, two minutes; Salem hosts it on every
  phone, and the TV shows the clock, the trace and the board. **Next** again
  starts the TV: the stats, the achievements you gave, then the graph. Nobody
  is named until you press. When the Host tab says the screen is ready, press
  **Name the Murderer**, then **Name the Motive**, then **Name the Victim**,
  each when the room is ready for it. Each press plays its part of the
  closing W-O-O-F News bulletin (as video on the TV once The bulletins are videos is ticked; until then the brain plays the recordings and the words show); the card shows once its
  lead-in part has played, and the next press cuts off anything still
  playing. After the
  Victim, on their own: the closing story, the dial's journey, the end
  credits and Sir Irwin's last card, about two minutes. **Hold the screen**
  stops it where it is (a toast, a photograph); **Carry on** resumes, and
  nothing on the screen is skipped. **Next** for everyone's result only works
  once all three are named.

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

## What each screen shows

| Act | The Parlour TV | The other screens |
|---|---|---|
| 1 | Its crest and the act name. The rules deck and the join code in a second browser tab. | The iPad Pro in the Orangerie: its crest. |
| 2 | W-O-O-F News bulletin 1: as video once the box is ticked on the Game night page, until then the words with the recordings. Then, during the cat visits, Sir Irwin's prompts, a new one every three minutes. | The iPad Pro keeps bulletin 1's words up. |
| 3 | Bulletin 2's words, when it plays. | The iPad Pro in the Orangerie: bulletin 2's words, with the recording on the HomePods. |
| 4 | The title card ("Act 4 · Behind Closed Doors"), then Sir Irwin's prompts during the rounds. | The study: Granolia's Lightbulb Moment. The older iPad in the Library: In Duplicate. Susan's MacBook Pro on the wall: Boo's Catwalk. The group's phones in the Orangerie: Get Off My Lawn!. Each room's screen shows the game's name with its line under it. |
| 5 | Sir Irwin: his opener, the countdown line, the motive cards, his closer. | Susan's MacBook Pro, now in the bedroom: "The door is closed". |
| 6 | Sir Irwin Needs a Hand: his rules slides (the first one carries the game's name), the practice, then each called player's picture and character name, the black square with its label, and the guess (tapped here). Then the "Pawsome!" slide, "The door is open", and the deduction board. | In the bedroom: the trace, from the moment the third picture is named. |
| 7 | The ballot clock with the trace and the board. Then the stats, the achievements you gave, the graph, each name card as you press (the closing bulletin, as video once the box is ticked), the closing story, the dial's journey, the end credits and Sir Irwin's last card. | In the bedroom: the trace. |

The study screen waits on its idle line outside Act 4. Every screen is dark
from the blackout until the first beat of Act 2, and near-black with "One
moment" while the night is paused. The phones say where to look. On a
rehearsal night every phone and screen has a red REHEARSAL band, and every
slot that would show a secret shows a stand-in in square brackets instead;
on the party night both are gone.

## When something dies

| What died | What to do |
|---|---|
| A guest's phone | They tap their name on any other phone (the old iPhone 11 is for this). Their character, bag, cards and cat standings follow. The old phone says the character has moved. |
| A borrowed phone that must change hands | **Hand this phone on** wipes it. The next person types their own name; the previous owner taps theirs on another phone and gets everything back. (One tap or ask twice is the open question *handOn*.) |
| Your phone | Tap your name on Susan's phone or the old iPhone 11; the Host tab moves with you. The brain is the spare host: `node functions/host.mjs status` says where the night is, `node functions/host.mjs next` presses Next. It needs the key file described at the top of `functions/host.mjs`. |
| The Parlour screen | Open `?kiosk=living` on the iPad Pro (it is a spare from Act 4), or on the brain, and put it by the TV. The room taps its drawing guesses there. |
| The bedroom screen | Nobody goes to the bedroom. Press **Show the trace on the TV** under The Big Solve: ten seconds after the door opens, the TV shows the trace, and again at the ballot. |
| The memory match iPad | Carry on. A group that did not clear it is paid its cross-off at the chime anyway. |
| Boo's wall or the projector | Carry on, or open `?kiosk=boo` on any screen the group can see. A group that did not finish is paid at the chime anyway. |
| Get Off My Lawn! (a phone with no motion sensor, or the string lights) | Nothing to do. A phone that cannot feel a shake never slips; the phones tint red and green whatever the lights do. |
| A room code will not scan | Act 2: the phone has "Cannot scan? I am with" the cat; or the guest waits, and after four minutes the phone shows the cat anyway and calls the next guest. Act 4: the phone has "Cannot scan? We are in" the room. |
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
screen. Replaying a night by its seed is not built yet (a card on the
board).

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
`?kiosk=living | ipad | memory | boo | bedroom | study`, plus
`?kiosk=memory&play=1` (the standalone memory match, no night). The device
table is `app/src/lib/devices.js`: the iPad Pro is `ipad`, the older iPad is
`memory` all night, Susan's MacBook Pro is `boo` in Act 4 and `bedroom`
after it. The living kiosk takes the relay guesses (`callRelayGuess`) and
shows `prompts` and `title` screens (`livingView`) and bulletin video
(`BulletinVideo`, clips from `newsClips` / `closingClips` in
`play/src/lib/rooms.js`, files at `play/public/video/<clip>.mp4`; the screen
doc carries only `video: true`, the finale doc only `video.<stage>: true`, never a clip name). The memory kiosk takes
`callMemoryStep`, the boo kiosk `callBooDone`. W-O-O-F News clips reach the
relay as codes derived from the clip id and the station key (`STATION_KEY`
in `cues/.env`, `media/README.md`), and the relay logs counts only; a sounds
doc with `video: true` rings the chime and skips the clips. Whether the TV
plays the two bulletins as video is `meta/game.bulletinVideo` (only `true` means video: the box The bulletins are videos on the workshop's Game night page, `app/src/pages/Night.jsx`; unset or unticked, the brain plays the recordings and the TV shows the words).

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
