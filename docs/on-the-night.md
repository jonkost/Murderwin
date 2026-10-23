# On the night

Sunday 15 November 2026. Which machine does what, the order to start things
in, what you press and when, what each screen shows, how to tell each one is
alive, and what to do when something dies. Everything on this page is safe
for you to read: nothing here says who did what, and nothing you can press
shows you.

Written 17 October 2026, updated 23 October for the 22 October handoff.
Commands are typed like `npm test`. Buttons on your phone's Host tab are in
bold type. A test checks that every one of them exists. Your jobs before the
night are cards on the workshop's Timeline page; this page says how to do
them.

## Before the night

- *The secrets, in this order.* First finish the lists they read: the bag
  items, the Parlour Games, and the cats' openers, closers, brush-offs and
  pools. The scripts need your Anthropic key and the service-account file in
  `scripts/.env` (copy `scripts/.env.example`). Each command prints counts
  and a PASS or FAIL line and nothing else; read only that line. Run them
  soon (this week if you can), not the week of the freeze: Jenna needs time
  to read and to pack.
  1. If the bags station stays (the open question *bagsAct4*):
     `npm --prefix scripts run pack-bags` (the packing list, for Jenna). If
     it says the bags are already packed, leave it.
  2. Once you have answered the open question *secretLines* (the cats' secret
     lines and the Act 2 safe's document): `npm --prefix scripts run generate`,
     then `npm --prefix scripts run validate`.
  3. `npm --prefix scripts run leans` (which way each cat leans in the
     Parlour Games). Run it again after adding a Parlour Game; it fills only
     the new ones.
  4. `npm --prefix scripts run relay-pictures` (the drawing pictures, made
     blind; you never see them). Until it has run, the drawing uses stand-in
     pictures.
  5. With no night running:
     `GOOGLE_APPLICATION_CREDENTIALS=scripts/service-account.json npm run fake-night -- --real-secrets --live --i-know-this-is-the-party-database`.
     Eight fake phones play on the real secrets and throw the night away.
     Your phone and Susan's never join it. While any night is live it
     refuses and says so.
  6. Tell Jenna: she reads the sets and the leans, packs the bags, and says
     "done" or "needs more".
- *Put the game live.* `npm run deploy`. This is the one line to run whenever
  Claude says a build is done. It builds the workshop and the phone client,
  refuses to go on if either came out empty, and then publishes the site, the
  rules and the server. Nothing goes live until you run it.
- *The Game night page* (in the workshop). Type both hosts' names, so you and
  Susan get the Professors. Type the names Jessa and Jake will type, for Sir
  Irwin's two seats. Print the four cat-room codes from the same page.
- *The key word.* Pick one word of four letters or more. On a rehearsal
  night, type it on your Host tab under The study and tap **Save key**. It is
  kept from night to night. Put the same word in `station/.env` on the study
  Mac and in `cues/.env` on the brain, each as `STATION_KEY=yourword`. The
  brain needs it to find the W-O-O-F News recordings.
- *The nine sounds.* The brain will not start while any of the nine cue
  sounds has no file in `media/`. Until you have recorded them, run
  `node scripts/make-placeholder-sounds.mjs` once on the brain. It makes a
  stand-in tone for each (`media/README.md` lists what each one is for).
- *The recordings.* Each W-O-O-F News line is its own sound file in `media/`
  on the brain, named as `media/README.md` says. A missing one is skipped;
  the words still show. As built they play as sound, with the words on the
  screens. Whether bulletin 1 and the closing bulletin become video on the
  living room TV is the open question *newsVideo*: answer it before you film
  anything.
- *Sydney's photo.* Save it as `play/public/household/sydney.jpg`, then
  `npm run deploy`. Without it his end-credits card shows his name only.
- *A dry run with nobody in the room.* `npm run fake-night`. Eight fake phones
  play the whole night on stand-in text and throw it away. One line per act, a
  tally, PASS. Nothing in what it prints is a clue.
- *A rehearsal on phones.* Open the game on your phone, tap "Host? Start the
  night", type your name, and press **Next** through the evening with Susan's
  phone and a spare joined. Every night you start is a rehearsal unless the
  Game night page's "This is the party night" box is ticked. A rehearsal
  night shows a big red REHEARSAL band on every phone and every room screen.
- *The hardware evening.* Wall, Stream Deck and bulb plugged in.
  `node scripts/hardware-check.mjs` prints PASS or FAIL. Then one run of the
  study and one grid of the drawing, and check that the Orangerie HomePod
  plays from the brain (`media/README.md` says how). The checklists are in
  `docs/study-light-game.md` and `docs/relay-drawing-game.md`.
- *The square code.* Save it from the Game night page. Your Host tab shows it
  too, under The doors. Which screen shows it in Act 1, with the rules deck,
  is the open question *rulesDeckScreen*.
- *Freeze the workshop* on Saturday 7 November (see "After the freeze" below).
- Charge everything. Spare phone chargers in the orangery.

## Which machine does what

| Machine | Its job | How it starts |
|---|---|---|
| The brain (M3 Air) | The hall light, the nine sounds and the W-O-O-F News recordings. The spare host. | Ethernet in, sleep off. `cd cues && npm start` in a terminal window you can see. It prints counts only, never a name. |
| The speakers | Every sound and recording, played from the brain. | On the brain, choose the AirPlay group that includes the Orangerie HomePod as the sound output. |
| Living room MacBook Pro | The TV: the news (Act 2), Sir Irwin (Act 5), the drawing and the deduction board (Act 6), the ballot clock and the reveal (Act 7). In the drawing the room taps its guess on this screen, so keep the trackpad within reach. | A browser, full screen, at `https://murderwin-at-sirwin-manor.web.app/play/?kiosk=living` |
| Study M1 Air | The light puzzle and Granolia's screen. | `cd station && npm start`, and a browser at `?kiosk=study`. Quit the Elgato app first. |
| The iPad Pro (the roaming iPad) | Until the end of supper: the words of the news and bulletin 2, on a stand in the orangery (`?kiosk=ipad`). Act 4: the memory match, on its stand in the Library (`?kiosk=memory`). From dessert: the bedroom screen (`?kiosk=bedroom`), door closed. | Safari, full screen. Tap it once after each move. |
| The older family iPad | The spare phone. | The plain game address, left on the join screen. |
| The second MacBook Pro | No job since 22 October (it was the bedroom screen). A stand-in for the living room screen. | Charged. |
| Your phone and Susan's | The Host tab. | Type your names at the door. The tab appears on its own. |

The game itself lives on the internet at https://murderwin-at-sirwin-manor.web.app/play/.
Every phone and every screen only needs the wifi. The brain does not serve the
game; it serves the bulb and the speakers.

## Start order, and how you know each one is alive

1. *The router, the Hue bulb and both Nanoleaf controllers.* On first. Give
   them five minutes.
2. *The brain.* `cd cues && npm start`. Alive when the terminal prints a
   line and sits there waiting. When the night begins it prints `[hall] red`
   and the bulb outside the bedroom turns red. If it prints `failed` and
   `retrying`, the bridge address in `cues/.env` is wrong; the night runs on
   without the bulb. If it lists missing sounds and stops, run the stand-in
   step under "The nine sounds" above and start it again.
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
5. *The screens.* Open the living room (`?kiosk=living`), the study and the
   iPad Pro (`?kiosk=ipad`, on its stand in the orangery), full screen. Each
   one shows a small "tap once to wake" note in the bottom right corner, so
   the browser lets it make a sound; tap anywhere once and leave it. Each
   shows its crest and a waiting line. They follow the night on their own.
   Two are touched on purpose: the memory match iPad in Act 4, and the living
   room screen, where the room taps its drawing guesses in Act 6. The bedroom
   screen comes later: the iPad goes there after dessert. A small dot in the
   bottom left corner is green while the screen can hear the house, amber if
   it has gone quiet, red if it is off the wifi. A bell in the top right
   corner shows for three seconds whenever a sound is called for, so you can
   tell a silent speaker from a missed cue. The Host tab has a dot for each
   screen, the memory match iPad included.
6. *The rooms.* The four cat-room codes on the walls: Granolia in the Study
   (upstairs), Salem in the Orangerie, Zimothy in the Library, Boo in the
   Entryway. None in the living room. In the Library: the paper roll and the
   markers for the drawing, and the stand for the memory match iPad. The
   orangery table set before guests arrive.
7. *The guests.* They scan the square code, type their name, and are dealt a
   character and a bag number. Watch the green dots fill in. Until you answer
   *rulesDeckScreen*, guests can scan the code on your Host tab, under The
   doors.

## Running the night, in order

- **Next** is the one button. It does whatever the next beat needs on every
  phone at once and tells you only how many phones it reached. The beat you
  are on and what it is for are written above the button.
- Act 1: arrivals, meet the household, introductions, then ready for the
  dark. Which screen shows the rules deck and the join code, and when it goes
  back to the game, is the open question *rulesDeckScreen* on the board. When
  you answer it, this line will name the screen and say when it goes back.
  Act 1 ends with **Blackout**.
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
  its late answer changes nothing.
- Act 2: **Next** on the news flash puts W-O-O-F News bulletin 1 on the TV,
  with its recording on the speakers. After the news, **Next** starts the cat
  visits. The phones send guests to the four cats' rooms, one guest at each
  cat at a time. Each guest scans the code on the wall, reads the cat on their phone, taps when
  done, and is sent to the next cat. Everyone else waits in the living room.
  Nothing to press: a guest who has not scanned in after four minutes, or is
  still with a cat after five, is moved on. Your Host tab counts it: "Cat
  visits: N of M guests have seen all four". **Next** for the first puzzle
  can go while visits are running. Press **Next** for Check-in only when
  everyone has seen all four cats: it sends anyone still waiting to supper
  (they still get their real hint).
- Act 3: phones down, supper in the orangery. Near the end of supper, press
  **Next** when it says "Next: Arm the bulletin". Your phone says only
  "Armed." W-O-O-F News bulletin 2 plays on its own 3 to 6 minutes later
  through the speakers (the Orangerie HomePod), with the words on the iPad.
  Every phone gets a notice when it plays, yours too: wait for it before
  **Next** for the groups. **Make the groups** does the same thing as that
  beat. Then carry the iPad Pro to its stand in the Library and open
  `?kiosk=memory`.
- Act 4: since the end of supper every phone has said "You're teamed up
  with" and the other characters' names; now each says where its group goes
  next. The stations are the study (Granolia's light puzzle, upstairs), a cat
  in its room, the bags, the memory match on
  the iPad in the Library, and free time. The cat station never sends a group
  to Granolia, because her room, the Study, holds the light puzzle (settled
  by default; you may change it). Whether the bags stay a station is the open
  question *bagsAct4*. The study is the clock. When a group finishes the
  light puzzle, the whole house rotates on its own. **Next** is the backup if
  the study runs long: the group still in there is paid its clue when the
  house moves on. **Finish this group now** pays the group in the study at
  once and moves the house on. A group that never clears the memory match
  gets its cross-off at dessert anyway.
- Act 5: cake, and everyone wanders. Then **Next** for Sir Irwin: the chime,
  and his countdown on the TV. The phones send everyone to the living room.
  Before you press **Next** for Act 6, carry the iPad Pro from the Library
  into the bedroom, open `?kiosk=bedroom`, tap it once, and close the door.
  It shows "The door is closed" until the third picture is named.
- Act 6 opens with two Parlour Games, back to back. Wait until the second has
  ended on your own phone, then **Next** starts the drawing (or
  **Start the drawing**). Sir Irwin explains it on the TV, each slide up long
  enough to read (about two minutes in all), then a practice smiley and three
  rounds.
  The game calls a random player by their character's picture and name; they
  walk to the paper in the Library before the square shows, and the room
  describes it, words only. When a grid is full the room agrees and taps its
  guess on the living room screen; a wrong one is crossed off. While it
  runs, **Next** refuses to leave it. When the third picture is named, the TV
  shows Sir Irwin's "Pawsome!" door slide, the hall light goes green and the
  bedroom iPad shows the trace. **Next** tells every phone the door is open,
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
  closing W-O-O-F News bulletin; the card shows once its lead-in line has
  played, and the next press cuts off any recording still playing. After the
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

## What each screen shows

| Act | The living room TV | The iPad Pro |
|---|---|---|
| 1 | Its crest and the act name. The rules deck and the join code: see *rulesDeckScreen*. | In the orangery: its crest. |
| 2 | W-O-O-F News bulletin 1: the words, with the recording on the speakers. Then its crest. | The same words, kept up. |
| 3 | Bulletin 2's words, when it plays. | In the orangery: bulletin 2's words, with the recording on the Orangerie HomePod. After supper it moves to the Library. |
| 4 | Its crest and the act name. | In the Library: the memory match for the group at that station. Players tap it. |
| 5 | Sir Irwin: his opener, the countdown line, the motive cards, his closer. | Before Act 6, carried to the bedroom: "The door is closed", door closed. |
| 6 | Sir Irwin's rules slides, the practice, then each called player's picture and character name, the black square with its label, and the guess (tapped here). Then the "Pawsome!" slide, "The door is open", and the deduction board. | In the bedroom: the trace, from the moment the third picture is named. |
| 7 | The ballot clock with the trace and the board. Then the stats, the achievements you gave, the graph, each name card as you press, the closing story, the dial's journey, the end credits and Sir Irwin's last card. | In the bedroom: the trace. |

The study screen shows Granolia and the light puzzle in Act 4, and waits on
its idle line the rest of the night. Every screen is dark from the blackout
until the first beat of Act 2, and near-black with "One moment" while the night is paused.
The phones say where to look. On a rehearsal night every phone and screen has
a red REHEARSAL band; on the party night it is gone.

## When something dies

| What died | What to do |
|---|---|
| A guest's phone | They tap their name on any other phone (the older family iPad is for this). Their character, bag, cards and cat standings follow. The old phone says the character has moved. |
| A borrowed phone that must change hands | **Hand this phone on** wipes it. The next person types their own name; the previous owner taps theirs on another phone and gets everything back. (One tap or ask twice is the open question *handOn*.) |
| Your phone | Tap your name on Susan's phone or the older family iPad; the Host tab moves with you. The brain is the spare host: `node functions/host.mjs status` says where the night is, `node functions/host.mjs next` presses Next. It needs the key file described at the top of `functions/host.mjs`. |
| The living room screen | Open `?kiosk=living` on the second MacBook Pro, or on the older family iPad, and put it by the TV. The room taps its drawing guesses there. |
| The bedroom screen | Nobody goes to the bedroom. Press **Show the trace on the TV** under The Big Solve: ten seconds after the door opens, the TV shows the trace, and again at the ballot. |
| The memory match iPad | Carry on. Any group that did not clear it gets its cross-off at dessert. |
| A cat-room code will not scan (Act 2) | The guest waits; after four minutes the phone shows the cat anyway and sends them to the next room. |
| The study station | Keep going. The group in the study is paid its clue when the house moves on, and Granolia's lines show on their phones. |
| The hall bulb | The TV says the door is open and the phones say the light is green regardless. |
| The brain | Nothing waits on it. Start `cd cues && npm start` again; it never replays an old cue. The TV rings its own small chime and shows the bell for every cue, so the room loses the big speakers and the W-O-O-F News voices; the words still show on the TV and the iPad. |
| A W-O-O-F News recording does not play | The words are on the screens anyway. Check that `cues/.env` has the same key word as the study, then restart the brain. |
| The wifi | Phones show a red strip, keep what they had, and catch up on their own when it returns. Nothing is lost. If it is out for long, **Pause, Irwin needs the garden**. |
| The wrong group walks into the study | Before they finish, tap **This group is in the study** on the Host tab and pick the group that is actually in there; the study pays them. If you miss it, the group that was due is paid. Carry on. |
| Somebody gives a hidden role away out loud | **Hush the Murderer** or **Hush the Ghost**, whichever role was given away. Nothing on any phone changes. From then on that player's Parlour Game answers stop moving the clarity dial (their cats still warm and cool as usual, so nothing looks different), and the reveal says one line about it. You never learn who it was from the button. |
| The story itself needs to change (a guess that landed too early, a secret blurted) | **Spill the Beans**. The Manor decides on its own whether the story can still change, and says nothing either way; the phone's message is the same whether it worked or not. It can only change before any clue has reached anyone (the news, a cat's hint, a document, the study's clue or the memory match), so in practice only at the very start of Act 2, before the news. If it did, the Murderer stays, everyone keeps their character, and the rest is re-drawn. |
| The night itself | Before the blackout, **Start a new night** deals new characters and every phone types its name again. After the blackout, pause and think; a new night is a new case. |

## After the freeze, 7 November

Anything not working is cut, not fixed.

- Safe to cut: the Nanoleaf layer (the puzzle runs on the study screen and
  the clue still lands), the Hue bulb (the TV announces the door), the iPad's
  jobs (the TV shows the trace, the bulletin's words show on the TV only, and
  a group that missed the memory match gets its cross-off at dessert), and
  any W-O-O-F News recording (the words show on the screens).
- Never cut: the secrets generator, the reveal order (Murderer, then Motive,
  then Victim), the sealed testimony (the open question *secretLines* may
  change this one).
- The workshop lock: on Saturday 7 November, open the workshop's Game night
  page and press "Freeze the workshop". Every list goes read-only and the
  phones keep the words as they are. Unfreeze only if something really must
  change, then freeze again.

## Rehearsing without touching the party

The emulator is a pretend Firebase on your own Mac. Nothing it holds reaches
the real game. It needs Java on this Mac, which is not installed yet; if it
says so, ask Claude Code.

- `npm run emulate` in one terminal. It stays running.
- `npm run emulate:seed` in another, once, to give it the starting cat lines and pools.
- `npm run fake-night -- --emulator` plays a whole night on it.
- `npm run test:rules` proves the security rules on it: a phone can read its
  own session and never anyone else's, never the secrets, never the case.
- `npm test` runs every test in the repo with no emulator and no key. Claude
  runs it before saying done; you can too.

A night started on the real game with the party box unticked is a rehearsal
too: stand-in text, and the red REHEARSAL band on every screen. Replaying a
night by its seed is not built yet (a card on the board).

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

*The kiosks* (`play/src/screens/Kiosk.jsx`):
`?kiosk=living | ipad | memory | bedroom | study`. The one iPad Pro is
`ipad` until supper ends, `memory` in Act 4, `bedroom` from dessert
(`app/src/lib/devices.js`). The living kiosk
takes the relay guesses (`callRelayGuess`), the memory kiosk takes
`callMemoryCleared`. W-O-O-F News clips reach the relay as codes derived from
the clip id and the station key (`STATION_KEY` in `cues/.env`,
`media/README.md`), and the relay logs counts only.

*Emulators.* `firebase.json` runs auth 9099, firestore 8080, functions 5001,
hosting 5000, storage 9199, UI 4000, project `demo-murderwin`. A phone against
them: `VITE_EMULATOR=1 npm --prefix play run dev` (`VITE_EMULATOR_HOST` for a
real phone on the LAN). The relay, the station and the terminal host:
`MURDERWIN_EMULATOR=1`. `scripts/seed-emulator.mjs` writes with the token
`owner`, which only the emulator honours.

*The clock.* `functions/index.js` exports `tick`, a scheduled function
(`every 1 minutes`, Cloud Scheduler, which the Blaze plan includes) that runs
`lib/windows.js tick` for the live night (`public_state/active`): a window
past `closesAt` plus a five-second grace is settled, a twelve-minute study
slot that ran out is ended (`station.tickStudy`), a paused night is skipped.
It also opens any Parlour Game that is due (`windows.tickParlour`), plays an
armed bulletin 2 and deals its notice (`screen.tickBulletin`, then
`notice:bulletin`), and moves the Act 2 cat-room lines on (`deal.tickLights`).
The Host tab calls the same host command `tick` once when it opens.
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
kind, act, beat and guest key or group id (never a word of content) whenever a
document lands (`deal.solve`), the study pays out (`station.dealStudy`, and
`deal.rotate` with no station), the News flash beat runs (the echo), a cat's
Act 2 hint is dealt, or the memory match pays (`BLOCKING_KINDS` in
`ledger.js`). `spillAllowed(night, case)` is the whole rule: Acts 2 to 5, not
in a blackout, no open window, no blocking kind in the ledger. A legal spill
builds a fresh case from another sealed code (a different motive) or a fresh
rehearsal, then `case.rerollCase` keeps the Murderer, the pools, the template
and the hidden sets, picks a new Ghost, restarts the dial and the exposure
record, and the role cards are replaced in place under the same card id.
The Hush writes `cases/{nightId}.exposure[role] = { hushedAt, act }`;
`deal.applyPoints` skips the dial for a hushed role and `finaleDoc` adds
`spotlight[]` only when the record exists.

*A dry run with the real secrets* (blind-content-protocol.md): on the brain,
with the key, `npm run fake-night -- --live --i-know-this-is-the-party-database --real-secrets`.
It refuses while any night is live, creates its own night with
`createNight(db, { forceRehearsal: false, dryRun: true })`, is joined only by
the eight fake phones, and discards the night and its case afterwards. Jon's
and Susan's phones never join it. Without `--real-secrets` the same run uses
stand-ins; without `--live` it uses the emulator (`--emulator`) or an
in-memory stand-in for Firestore (the default, no services at all).
