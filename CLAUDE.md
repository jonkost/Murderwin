# CLAUDE.md — A Murderwin at Sirwin Manor

Rules for working in this repo. These are load-bearing. Read fully before any task.
Updated 12 November 2026. Party: Sunday 15 November 2026. No freeze date (23 Oct). The polish pass of
11 and 12 November (below) reopened the build after the walk-through; from the practice night of Thursday
12 November on: checks and fixes only.

> **12 Nov 2026, night, Jon: "I won't have time to play through today. Is the game solid and able to run smoothly? Please make the game setup and the show run game aspect of my app portal is well built and simple." (built that night on main; the site only, no server change; not published, not pushed).** Ten checkers walked the setup and the whole night in the code in his place, ten more reviewed the fixes, and `docs/sessions.md` has every finding. Where older text below disagrees, this block wins:
> - **The Host tab asks first** (`askFirst`, `play/src/lib/ask.js`; `play/test/host-guards.test.mjs`) before any press that ends, rewinds or skips part of a live night: the seven act numbers, a beat tapped in the beat list, Clear the drawing, Start the drawing outside Act 6, Hand this phone on, Blackout before Ready for the dark, Next in the middle of an Act 4 round or while the credits roll, Back one in the reveal, and Start the night under A fresh night. Never take a question away. A question a browser swallows never makes a dead button: an instant "no" lets the press through, as before.
> - **One big button at a time.** At Ready for the dark the big button is the Blackout itself. Supper's ready shows only during the cat visits, and Start Act 4 only at the dinner wrap-up, where it is the one big button (each used to sit above Next for a whole act, where one slip skipped the cats or bulletin 2). The rules film's Phone chime is on the card while the film plays. The host's drawing screen carries Pause at each walk and guess. The scene chip for Murderwin Blackout is called Lights off. The brain's row under The house is "The brain: music and lights". The top line says "This is a practice night" or "This is the party night".
> - **The party day** (`onPartyDay`: from 7 am Eastern on 15 Nov, for twenty hours). The real-night box still starts unticked (Jon's rule; a pre-ticked box could start a real night by habit, and the real night shows the party's pictures). A practice start asks first, the note under the button is a warning, and a practice night that is on says so in red at the top of the Host tab. The server's gate is unchanged.
> - **The workshop's Game night page** has two cards for the day under the Start button: Set up the house (`SWITCH_ON` in `app/src/lib/devices.js`, the same nine steps as the Devices page) and Run the night (`app/src/lib/runSheet.js`). Tests hold both to the code: change a button's name or a beat and they fail. The Devices page is put right (the chimes are the screens' own, the brain stays on its own speakers, no second tab on the Parlour TV, the night starts from the big button). The old party box is under the fold and says to leave it alone: the Start button never reads it.
> - **Start the brain** is on the brain's Desktop (a link to `cues/Start the brain.command`; card 475): the relay in a window, the Mac kept awake, started again if it stops, a second copy refused, and the Orangerie's page opened once a day.
> - **Checked that night, numbers only:** every test and whole fake nights at every size from 2 to 14 guests pass; the party's three sealed lists are made and Jenna's five checks pass (read through `functions/lib/counts.js` and the Steward's `checks` op, and nothing else); no night was live.
> - **The pets' voices** (the same night, Jon: "Can we get voices reading for the pets", then, on hearing this Mac's own voices, "I need better voices. not robotic at all.", then his casting: "young voices like kids Male for irwin, female for granola. Sexy/sassy voice for Boo. rough man voice for salem. Old man voice for zimmy. Make them natural. Make them MP3 files so it is easy to play out."; built that night and **published on his "Publish it all"**, the site only: the decision *petVoices* is answered, yes, all five). An MP3 is made ahead for every line a pet can say, 834 of them, by `npm run pet-voices`, silently, with the natural voice model that is already on this Mac (Kokoro through mlx-audio, offline, `scripts/pet-voices-kokoro.py`; **never the Mac's own `say` voices**, which are the robotic ones he turned down). `seed/pet-voices.json` holds each pet's voice, pace and pitch (a pitch above 1 makes a voice younger: that is how the two kids are made) and a few words respelled for the voice; `scripts/pet-lines.mjs` lists the lines and a test checks the dealer against it. The file's name comes from the words themselves (`play/src/lib/petvoice.js`), so a line whose words change is simply not said. The files are made into `pet-voices/`, which is no part of the site, so no publish can ship them: `npm run pet-voices -- --on` copies them into the site's folder (`--on irwin`: his only) and `--off` empties it, and neither is run without Jon's word. A cat speaks only when its guest presses Hear on its card (speaking by itself at its door is built and switched off, `CATS_SPEAK_BY_THEMSELVES`: a phone that talks by itself is overheard); Sir Irwin says his dessert speech on the Parlour TV by himself. His yes changed the rule further down: a cat speaks, on a guest's own phone, when the guest presses Hear, and never by itself. He picked by ear from numbered auditions (`pet-voices/auditions/`; a test holds the cast): Granolia a British girl at a kid's pitch, slow ("Granola - 4", "Garnola speed 2"), Boo the model's French woman's voice reading her lines as written, slow (after a British try, his last word: "Boo needs to be 8 Boo - 1 the French one"), Salem a rough British man ("Salem - 2"), Zimothy an old British man ("Zimmy - 1"). Sir Irwin a young Australian boy ("Please give me young boy Aussie options. Forget the low and slow.", then "12 Irwin - 5"): the model has no Australian voice, so the talker gives a British boy's voice the lighter Australian accent by moving each word's vowels (`accent: "aussie-light"` in the cast). With the publish he said "Slow it down", taken as Sir Irwin, the one voice at full pace (0.82 now). All 834 lines are made in these five voices and are on the site (`goOut` all). Sir Irwin's eight drawing-slide lines are in the same new voice (`play/public/voice/irwin-*.m4a`, each shorter than its slide's time, so the server's lengths in `seed/irwin-voice.json` are unchanged on purpose; the old robotic files are kept in `pet-voices/irwin-slides/old-robotic/`). After any change to a voice: `npm run pet-voices`, then `npm run pet-voices -- --on`, then publish. `seed/pet-voices.json` `goOut` holds his answer on whether they go out (none until he says yes), and a test holds the site's folder to it. Nobody has heard the voices on a real phone yet (card 603 is his).
> - **Known and left** (cards 598, 599, 466): a guest who first joins after Start Act 4 has no group; the drawing still calls a guest who has gone home; the real night's own start cannot be tried before Sunday, and the dry run on the real secrets waits for Jon's word with the house quiet. The clocks make the night about four and a half hours from the doors at 4:00, the vote between about 8:10 and 8:45 pm: the Canon's "two to two and a half hours" is older than the fifteen-minute rounds and is Jon's to change. His breed handoff (`docs/handoff-2026-11-12-breed.md`) is in the repo and not applied: the decision breedMoment, default left out. This Mac's Documents folder is in iCloud: never search the whole project folder at once, name the folders.

> **12 Nov 2026, the polish pass and the approved look (built 11 to 12 Nov on main; reviewed, then published 12 Nov, about 9:40 am, on Jon's "Yes, publish": 43db081, a full deploy with one rules change, a presence row may hold `sound`; pushed with everything since, up to the evening of 12 Nov, on Jon's "Push": the older "not pushed" notes further down this file were true when written and are not now).** Three handoffs from Claude chat, all applied: `docs/handoff-2026-11-11-polish.md` (the walk-through's nineteen jobs), `docs/handoff-2026-11-12.md` (the look Jon approved, his own rule slides, the words) and `docs/handoff-2026-11-12-dedication.md`. The newest wins. What changed, and where this file's older text below is now wrong, this block wins:
> - **The look** is the one Jon approved on 12 Nov ("yes this is great"), kept as drawn in `docs/look-approved.html` and built in `play/src/look/` (`/play/?look=1` shows all of it). Every idle room screen is its room's splash (the name in lights, its cat, the cat's name; since the afternoon of 12 Nov an idle room screen plays the screen saver in its place, below); a room's Act 4 card is the game's name in lights, three numbered steps, the code and the cat; the phone's top is the seal and a camera button, with no act's name; Now is one card (where to go, one button, the room's cat over it); the vote is three rows with portraits; a cat met is a small win page; Solved! is the big win. Every cat is Jon's own picture ("Make sure to use the cat art I have made"). **Words:** "Anywhere there is random text that is not mission critical lose it": a title, one line at most, one button; no tips, flavor lines, act names or labels that only name a card; every clue and every working control stays.
> - **The rules film** at The house rules is Jon's own 28 slides and his 28 recordings, whole ("Do not change the rule cards!"): never reword, restyle, reorder or cut them. `npm run rules-film` makes both; `npm run media` says which set plays.
> - **The dedication** in the credits reads exactly "For Sydney, The Best Big Brother A Pup Could Ask For", over Sydney's photo (`play/public/household/sydney.jpg`), one card held eight seconds. Special thanks is a place in `seed/credits.json`, empty until Jon sends his lines.
> - **The night:** Act 6 ends the door, then **Talk it over** (no taps, no clock), then Jon's **Start the vote**; the old last round of Act 6 is deleted. The vote closes when the last seat locks in (two minutes is the backstop). **A window closes when the last phone has answered, or on its clock, whichever is first** (this replaces "windows never close early"). A Parlour Game opens only in Act 2's cat visits, Act 4's rounds and Act 6's games beat; none after the drawing starts (`functions/lib/flow.js`, `docs/run-sheet.md`). The drawing has three rounds, no practice round and no wait after a wrong pick; Sir Irwin's slides are voiced (`npm run irwin-voice`; the cats still never speak). The End is a card with jazz and the lights on Default, not black; Jon's phone closes the night with **Good night**.
> - **A practice night** plays for real: real lines from its own throwaway case, a practice packing dealt in memory, and the practice picture bank (`sealed/relay_pictures_practice`, made by the new blind picture maker; Jon sees those pictures, so their names are kept off the party's bank). It still reads nothing else sealed. **Fill-in players** (0 to 8, practice nights only, refused on the real night): real seats the server plays; the brain's relay runs their clock.
> - **Sound and the blackout:** every room screen and phone plays each cue sound itself (`play/src/lib/soundkit.js`, `cueSounds.js`; `npm run web-sounds` makes loud copies of Jon's own files); a screen has sound only after one click, and the Host tab shows Sound on. The blackout is one timeline (`nights/{id}.blackout`): music stops at the press, the dark comes two seconds later everywhere at once (lights, strings, Study walls and deck, arcade deck, every screen and phone), the power five seconds after. No music through the dark or the role cards. The night ends on jazz. The music's stop is Jon's **AudioPanic** Shortcut (he made it on 12 Nov, "audioPanic is made"; `cues/scenes.json` `musicShortcuts.off`; keep that name; it runs his Home scene PANIC, which pauses the four HomePods; before that day nothing could stop the music). The same Shortcut is the sheet's `duck`: the jazz stops while the brain speaks bulletin 2 at supper and comes back after (never name *Default Jazz 20%* or an Intense one there: each sets this Mac's own volume, not the HomePods'). **TV Wonder, the Study's TV, is not in the PANIC scene**, and the Study's and the Intense music play on it, so from Act 4 it plays through every stop until Jon adds it there or takes it out of those scenes (card 582). Since 12 Nov, later (Jon: "I have added 2 new shortcuts to help with the black out. Blackout and afterblackout. Please use these if it helps make the blackout hit hard"), the brain runs his **Blackout** Shortcut (his Home scene with every light in the house off, the strings and the Study's walls too) `shortcutLeadMs` before the dark mark and **AfterBlackOut** (the house back) as the power returns (`cues/lib/blackoutShortcuts.js`, the names and leads in `cues/scenes.json` `blackout`; tuned by eye with the Blackout test; neither stops the music; Off Murderwin Strings is no longer needed).
> - **Devices:** the iPad Pro is one page all night (`?kiosk=ipad`, with *The iPad shows* on the Host tab). A camera inside the app reads the house's codes (asked for at the first tap, never at sign-in; `qr-scanner`). Boo's camera and Jenna's iPad are out of the night (`?kiosk=pose` is deleted). `/setup` says what the Stream Deck needs; `npm run screen-files` writes the files to AirDrop. Pages reload themselves at a quiet moment when the site is newer.
> - **The review before the practice night (12 Nov, morning; `docs/sessions.md` has every fix):** a Parlour Game closes on the last answer like every window, so Act 6's second game follows the first at once and the drawing starts on the last answer. The Host tab's Next names the beat it shows; one pressed as the clock moved the night on moves nothing and says "The night had already moved on." **A pause** now also holds the intro video and the rules film (Resume moves `beatAt` on at The house rules and adds the pause to `beatShift`), starts a Get Off My Lawn! round again from its count with no slip counted (`functions/lib/salemlimits.js` `resumedRound`; the board and the strings stand still meanwhile), and in the blackout's two-second lead calls the blackout off (press Blackout again); a pause in the five dark seconds is refused, since it left the house dark with no button on any phone. The scream is written at the press, stamped for the dark mark. The party's drawing bank is made (17 pictures: six, six and five a round; counts only).
> - **Published again, the site only, 12 Nov at about 4:05 pm** (88ec4aa, on Jon's "Yes, publish"): the board's two updates of that day and the Host tab's name for the music's stop. The server and the rules are as published at 9:40 am. A publish takes the last build's hashed files off the site, and a room screen in full screen never reloads itself, so a screen left open would lose its late-loaded parts (Boo's Stream Deck): the four such files of the morning's build were kept in this one. At the next publish while screens may be open, do the same, and publish the checked folder with `firebase deploy --only hosting` (`npm run deploy:site` builds again and drops them). `docs/sessions.md` has the steps.
> - **The idle screens' screen saver (12 Nov, late afternoon; Jon: "For the loops just make the classic dvd screen saver with the cats and dog face picture when it bounces off the edge of the screen"; built that day and published at about 6:05 pm on his "Publish", the site only, 65eebc2, the third publish of the day):** a room screen with nothing to show plays it. One of the household's five face pictures (`play/public/household/faces/`) crosses the screen in a straight line and turns at every edge; it keeps its face for ten edges, about twenty-five seconds, then becomes the next; about every four minutes it lands square in a corner. It crosses a TV in six seconds. The speed and the ten edges are Jon's word on the first clip the same evening ("You can make if faster and don't change faces with every bounce"; the first build took eleven seconds and changed at every edge): do not go back. It takes the splash's place on those screens: the room's name in lights shows only if a face picture will not load or the five are slow. A Mac's second display plays it too, all night (Jon, that evening: "I want to have this on the second screenes. I'll need a link to it in the game setup"): its three lines on `/setup` and in the Host tab's send list begin *The screen saver* (`play/src/lib/setup.js`; the same three addresses, `?kiosk=decor` with or without a room), and `saverPlace` and `SAVER_ON` in `play/src/lib/saver.js` say which screens play it. The join code keeps its seal, and the dark, the codes, the films and the games are untouched. No loop files are needed (a file dropped into `play/public/loops/` still wins). Whose face and where comes from the wall clock alone (`play/src/lib/saver.js`; `Saver` and `Idle` in `play/src/screens/Rooms.jsx`); `/play/?look=1&show=saver&room=study` shows it with no night. Do not make it video files: a file cannot meet the real edge of every screen's shape.
> - **Still for Jon after tonight:** say whether the drawing's pictures look like something; his Special thanks lines; rule card 25 still describes the round that is gone (his to change or leave).

> **1 Nov 2026, later, Jon's word on the Study ("make the stop 15mins"; built that day and deployed 2 Nov, a full deploy, not pushed; not tried on the real wall):** the game in the Study stops at the end of the Act 4 round, fifteen minutes from the chime, five seconds early so its report beats the chime, and with no round (a practice) fifteen minutes from the first touch (`station/lib/study.js` `capMs`, `STOP_EARLY_MS`, `tick` and `stop`, `station/lib/runner.js` `due`, `play/src/lib/house.js` `studyStopAt` and `studyMsLeft`): a plain fifteen from the first touch would run past the chime into the next group's turn. Granolia's warning comes two minutes before the stop, the Study's screen and the Host tab count to it and stand still in a pause, and the host's Next stops a game too. The review also put right the Study's finished page (it showed only when a heartbeat happened to land in the rest, after a flash of the rules card), a swapped-out group's trace (the chime now pays the group the round named) and Resume: a pause took the tabs off every phone, the Host tab's Resume with them, so the two host phones now carry that one button on the pause card and the strip, and nothing else stays live (`ResumeNight`, `play/src/App.jsx`). A first try that kept their tabs left room games and Host tab buttons live in a pause: do not go back to it. It reaches the M1 Air when Start the Study is closed and opened again, with the Study's screen and the host phones reloaded. Card 557 is done. The same day Jon said the scream is his, for the blackout: `media/blackout.wav` on the brain (gitignored), his file with the one second of silence first, in place of the tone. Card 134 stays open until he has heard it. His original is in `play/public/audio/` (Jon added it to git himself on 2 Nov, 7b9eccb; since 11 Nov the phones and screens play it as the blackout's sound when no louder copy is on the site).

> **5 Nov 2026, "Cook it all up. We are 1 week out!" (built that day, not deployed, not pushed): card 515, the arcade on the night.** The Entryway's Act 4 round runs Miss Boo LaRue's Arcade on Susan's MacBook Pro and the Stream Deck + XL (plain `?kiosk=boo`, `play/src/screens/Rooms.jsx` `BooRoom`, the same `BooArcade` in a night mode): the group scans Boo's code on her rules card, the visit starts with their names from the rotation, each of the first two players' clue moment asks the house (`arcadeClue`, from the kiosk's own presence row) for the group's bag hint about the Ghost from Boo at the group's average affection, which is dealt to that player's phone then and shown on the screen; a trio's third gets Boo's line on both; every counted round's score goes to `arcadeScore`; the chime rings at the round's end on the server's clock (`public/boo.slotEndsAt`, moved by a pause) or at once when Next moves the round on, and the cap deals every member's card (a phone that has its card keeps it). No motive is crossed off there (Jon, 29 Oct), and G32 still passes on all 1,000 stand-in cases. Boo's Catwalk is gone from the night, the phones, the Game test tab and the practices (`booDone`, `booShow`, `booMoment`, `boo-start`, `boo-stop` deleted); Boo's camera takes one photo a minute into each visit instead of the last pose; the game name is Miss Boo LaRue's Arcade with the hook "Five little games. One coin each. She's always judging." The night's screen shows no Connect or setup words: the deck is connected once from the practice page in the same Chrome before the guests come. New questions on the board, each with its default built: arcadeClueRung (the group's average, as in every room), arcadeCamera (the photo at the arcade), arcadeSound (the Mac's own speakers; the brain still lends the Parlour HomePod to this Mac in Act 4, so the Parlour has no house music then). Not tried on the real Mac, deck or phones.

> **1 Nov 2026, Jon's five notes on the arcade (built and deployed that day, the site only, not pushed; not tried on the real deck):** each coin under its game, gone when that game is played (not left to right any more); the winner's page holds until a tap on the touch strip, which says Tap here for free play (no ten-second timer; the chime still ends it); in Yarn Catch the strip shows only the basket emoji, and a slide puts the basket in the column over where the finger lifts, so a full slide goes all the way across (the Stream Deck reports a slide once, so the basket jumps and cannot follow the finger; a tap still does nothing); the Knock easier (top speed a beat every 0.3 seconds, reached only as the game ends, so about a third fewer things come; a little more time to hit each thing at the start, nearly twice as much in the second half), which partly undoes the 30 Oct "Much faster". From the review before the deploy: open, arcadeTrioTime (a trio's fifteen games do not fit the round at full length, so its clues can run out of time; default as built; wants an answer before card 515); on the board, card 557 (the Study still stopped at ten minutes in a fifteen-minute round; done later that day, above).

> **31 Oct 2026, Jon's second arcade playtest (a transcript in chat, built the same day):** five strikes in every game with strikes; the tail game black, the tail flat with a white shadow, no growth, cucumbers on red, no pause at the edge; the Knock slower at the start, its cross on the end key only, the claret cloth back; Yarn Catch on the left dial and a real slide, no tap; the strip's time as a bar counting down, whose turn big, tokens left to right; the clue after all five games, fifty-second games, the keys 1 to 3 for each player's scores at the winner, no maths under the players; **every Act 4 round is fifteen minutes** (`seed/night.json` roundMinutes; Act 4 is now about an hour and ten minutes). Open: arcadeWarmUp (default no). Deployed 31 Oct.

> **30 Oct 2026 handoff (`docs/handoff-2026-10-30.md`, the Boo Arcade, from Jon's playtest): applied and built 30 Oct.** Jon decided: every player plays one round of each of the five arcade games, and the scores show with the achievements in Act 7 (the one deliberate exception to "no award compares one player with another"; no score may depend on a role). Built on main, not deployed: the five games as the handoff's section 2 asks (an Exit in every game, "practice" with a C; the Tail on Boo's green, smooth, growing, wrapping, with fish and cucumbers; the Pointer faster with walls and a cost for a faded sparkle; more mice; the Knock's tables both ways, friends on them, faster, misses in red; the Yarn's strip as a rail, five misses, friends falling); five tokens a player, one a game, a visit's game forty seconds (a starting point; a brisk pair fits all ten in the round, a trio most of its fifteen); every counted round written down (`records`, the page's `onRecord`), one score a guest a game on the server (`functions/lib/arcade.js`, the `arcadeScore` callable, `nights/{id}/public/arcade`), and the top scorer in each game and the best all round by place with the achievements (G60). Two new open questions, each with its default built: arcadeOverall and arcadeExit. Still not wired into Act 4 (card 515), so on a real night nothing writes a score yet. Claude chat keeps the Canon and Start Here for this handoff.

> **25 Oct 2026 handoff (`docs/handoff-2026-10-25.md`, the cue list): applied and built 25 to 26 Oct.** Jon's cue walk-through (`docs/cue-list.md`, 23 cues) is canon and wins over the 23 Oct cue sheet, `cues/scenes.json`, the device table and the Canon's sound-and-lights bullets wherever they disagree; this handoff wins over the 24 Oct evening one. Built: the brain sets the hall bulb by phase (green for the welcome, off in the blackout, red from the power's return, green at the unlock), switches the projector's plug through two Shortcuts, plays five music settings on three playlists and recalls the six scenes from a rewritten `cues/scenes.json`, dims the study while a group is at the wall, plays the cake song, and starts on nine sounds with only two required. The blackout returns the power on its own after five seconds, then every phone shows the Sorry for the interruption button, the role card for fifteen seconds on the server's clock, and the main page. The Host tab gained Sound test, Cake! and At the paper, and the host taps the drawing's guess on their own phone. The night gained the beats The house rules, Dinner wrap-up, Update your motives and The End, the two motive prompts, the supper and break notices, the dessert chime, the ballot as a card on the Now tab and the Act 7 locks. Every idle screen has a loop slot, the Parlour TV shows the join code, each room shows its cat's code in Act 2 and its game's rules card in Act 4, the Happy Birthday Irwin card is on the phones and the TV, and the brain's browser is the Orangerie's screen. Every phone has a Notes tab. The devices follow Jon's key. Its item 1 (the merge) landed 25 Oct; the board cards (item 9) come with this session's migration. With these differences: the brain brings the music up to intense 60 the moment the third picture is named, before Next (cue 18); the two host phones keep their tabs through the Act 7 locks so the Host tab can name the three; the TV stays dark through the role cards (promptScreen, default dark; cue 5's loop is the alternative); the host's drawing controls sit on the host's own drawing screen (the Host tab is unreachable while the drawing runs) and the TV's four names stay as the fallback; the walk to the paper is a 20-second limit that At the paper ends sooner; the drawing's budget is 26 minutes (44 turns); Act 1 gained a beat, The house rules, so the brain can dim the lights and stop the music for cue 2; Act 3 gained Dinner wrap-up and Act 5 Update your motives for the two motive prompts; one chime recording serves every chime moment through a fallback, so only chime-phone and blackout are required files; the join code also sits under the ballot clock; the Notes tab is on every phone. Deploy and push only when Jon says.

> **24 Oct 2026, evening handoff (`docs/handoff-2026-10-24.md`, from Claude chat).** Jon cast the news team: Jon plays Mic Cameron (the field reporter), Susan plays Ava Waves (the studio anchor). The practice run is Sunday 25 October: a rehearsal night, the whole night, Acts 1 to 7, every screen on, Jon and Susan playing with the spare iPhone 11 as a third player (run sheet: Claude Doc https://claude.ai/artifact/3Ekk4JUd8VpN31NJWx56AK). Answered by Jon that evening: bulletin2Voice (Susan reads bulletin 2, as Ava Waves), bulletin2Known (accepted: Susan, who records it, knows which family each line points at) and worstDial (build the worst-dial proof now, before the second tech run; Claude chat is building it and sends it as a patch, `docs/patches/2026-10-24-worst-dial.patch`, with how to apply it: Claude Code does not start it). This handoff wins over older docs where they disagree. Its item 4 was built on 25 Oct (Claude Code): the Home rows, the motive card pictures, the morning after, replay by seed, the pose photo, and the test plan's Not yet checks.

> **Decisions (24 Oct, evening; two added 25 Oct; six from the cue list, 25 to 26 Oct; two added 28 Oct; one answered and two added 29 Oct).** Open, each a card on the board and Jon's call only, each with its default built: ballotMajority, diningName, handOn, granoliaIntro (new 24 Oct, on the board after the next deploy: Granolia's hello in the Study; default the new words, which Claude Code puts in, card 473), tidyFolders (housekeeping in the repo folder, now a Claude Code card: ask Jon once, when you get there), and from the test plan's checks on 25 Oct: dialSpill (does the dial start again after Spill the Beans? default: yes, as built, though the Canon says it never resets; check G24) and senseClue (a sense-only bag clue can point at one bag in a party of four to six, about once in a thousand deals; default: leave it; check G09), and from the house's hardware on 25 Oct: stringsLead (the string lights run through Apple Home 1 to 2 seconds behind the phones, so should Salem's intro say to follow the phones? default: the phones lead; nothing built yet: Claude chat rewrites the lines, Claude Code copies them in), and from the cue list (25 Oct; each default built 25 to 26 Oct): olderIpad (default: out; the iPad Pro roams), cueSounds (default: one chime for every chime moment, the stings optional, no power sound), bedroomName (default: "the bedroom"), blackoutAuto (default: the power returns on its own after 5 seconds) and promptScreen (default: the TV stays dark through the role cards; cue 5's loop is the alternative; filed by step 3), and from Jon's Game test notes (28 Oct): studySecondScreen (the study's Mac, SKMBA, gets a second screen; default: the study's screen full screen on it, facing the walls, and the station's window on the Mac's own screen; nothing to build), and from Jon's question (29 Oct): ghostProof ("there is not enough to reveal the ghost": the Ghost's clues are only in Act 4, the Study's trace and one bag word from each cat, and nothing proves they are enough while Claude chat's worst-dial patch has not come; should Claude Code build the Ghost check itself, on stand-in nights, counts only? default: wait for the patch), from the 30 Oct handoff (built as defaults): arcadeOverall (how the best all round at the arcade is worked out; default: by place in each game, first place as many points as there are players down to 1, ties sharing the higher, a game never played nothing) and arcadeExit (a game left unfinished never counts; default: the guest can play it again, the token comes back), and from card 529 (29 Oct, night): quietWords (if a cat's hint or the Study's trace is ever missing on the party night, what does the guest's card say? default: the house's plain words, built: "Miss Boo LaRue has nothing to tell you about the motive." with that cat's name, and from the Study "Nothing for you this time."; the other option is nothing on the card; Jon's Host tab is told either way). Answered: roomMusic (the Canon had it answered on 25 Oct, each room its own player through Home scenes, and Jon's music Shortcuts built it so on 31 Oct; the board caught up on 5 Nov, card 518), entrywayGame (Jon, 29 Oct: "Catwalk is 100% scarped"; the Entryway plays Miss Boo LaRue's Arcade, `docs/boo-arcade.md`, for a clue about the Ghost, not a motive, "its not motive its a ghost clue"; Boo's motive cross-off is not replaced; putting the arcade on the night is a Claude Code card), newsVideo (video), bagsAct4 (the bags stay), tutorial8 (kept buried), stewardPictures (no), partnerAwards (cut) and dialMapping (fixed, as built), with the 23 Oct handoff's defaults on 24 Oct (Jon may change any); bulletin2Voice, bulletin2Known and worstDial (Jon, 24 Oct evening, above); rulesDeckScreen (the Parlour TV shows the join code through Act 1; the video and the slides in a second tab; the cue list, 25 Oct); grossnola (keep it offstage, 31 Aug) and swapMotive (keep all 19, 8 Oct), answered long ago and only now off the open list.

> **23 Oct 2026 handoff (`docs/handoff-2026-10-23.md`, with section 15, the final bag items, and section 16, the game names, both added 24 Oct): applied and built on 24 Oct.** It is the master handoff: the night in order, every decision with its date, the sound and light plan, the device table, and the build list. It wins over this file and every older doc wherever they disagree (the 24 Oct evening handoff above wins over it). `docs/sensory-bags.md` is the owner of everything about the bags. Left to do from it: the nice-to-have pose photo, and the Claude chat cards (the project copy marked Applied, two rules deck slides). Its decisions are in the Decisions line above.

> **22 Oct 2026 handoff (`docs/handoff-2026-10-22.md`): applied and built on 22 Oct** (commits c8b76a4 to f705587; deployed 23 Oct). The 23 Oct handoff wins where they disagree. Decided by Jon on 23 Oct: secretLines (retired: the cats say only their open hint lines) and act2Safe (the Act 2 safe is taken out). What is left is on the workshop's Timeline. Every session follows HOW WE WORK below.

> **11 Nov 2026, before the walk-through with three players ("make sure I know where to put the media and make sure the game is rock solid. I would like to have a system in place to have a postmortem review of how things went"; built that day, not deployed, not pushed):** `docs/media.md` is the one page for every media file, `npm run media` (`scripts/media-check.mjs`) says what is in, missing or misspelt, and `play/public/video/` now exists with its own page (the videos are gitignored like the loops). The postmortem is three steps (`docs/postmortem.md`): `npm run night-log` on the brain during a run (read only: the two public documents, a test pins them), the workshop's Postmortem page after it (each note a Timeline card with source `postmortem`, printed first by the board), and `npm run postmortem`, which writes `docs/postmortems/<date>.md` for the review. Found on the way, nothing broken: with fewer than four players there is one Act 4 group, so the Library crosses off one motive and two can be left standing at dial 3 (G32 is dealt on 4 to 12 guests; `npm run fake-night -- --phones 3` now knows).

> **11 Nov 2026, later, Jon's folder of exports (built that day, not deployed, not pushed):** `npm run media-import -- "<folder>"` sorts one folder of exports into the game (videos to 1080p in `play/public/video/`, the sound recordings to `media/` with the second of silence, the name clips into Murderer and Ghost name-card videos from the stills in `play/public/reveal/`), then runs the media check; the originals are never touched. With the videos box ticked each name of the reveal is one film on the Parlour TV: its recorded parts, then the night's own clip (`woof-close-murderer-<id>`, `woof-close-motive-<n>`, `woof-close-ghost-<id>`; a file for every character and motive, so the files say nothing about a night), a second of static after the motive clip, and the card when the film ends (`seed/woof-news.json` `closing.video`, `functions/lib/news.js` `closingVideoStage`, `play/src/screens/Kiosk.jsx` `Finale`). The 11 Nov handoff (the name cards) is applied. The videos are gitignored, so a deploy from a clean worktree ships none: copy `play/public/video/` and `loops/` in first. Not tried on the real TV.

> **11 Nov 2026, evening, Jon before the walk-through ("make sure the larger rehearsals banner is not there"; built that day, not deployed, not pushed):** no red REHEARSAL band on any phone or room screen, so a rehearsal looks like the party night. The Host tab's top lines say "This is a practice night" (until 12 Nov: "This night is a rehearsal") or "This is the party night", and that line is the check that the real-night box worked. The practice pages keep their PRACTICE band. Do not put the band back. The walk-through is three devices that scan in (Jon, Susan and a third), any role, one team of three. The credits were checked: complete, 73 seconds, no `sydney.jpg`; with nine guests each line is on screen about six seconds (card 570).

> **11 Nov 2026, late, Jon setting up the walk-through ("the night setup is so difficult. I need it to be easy and clean"; built that night):** one address for every screen, `murderwin-at-sirwin-manor.web.app/setup` (`firebase.json` redirect to `/play/?setup=1`, `play/src/lib/setup.js`, `play/src/screens/Setup.jsx`): "Which screen is this?" and one button per room screen; the machine's last choice is marked. A new room screen needs a button there (a test checks it against the Devices page). It is a setup page: no guest screen may link to it.

> **12 Nov 2026, Jon's setup for the night ("a big start night button on my phone... something I can airdrop 1 by 1 to the devices... Jazz music until 4:30, a count down on all screens before that. 4:30 intro goes... a check box for it to trigger the real night, otherwise it defaults to a runthrough"; built that day):** the phone's big Start button (`StartNight`, `play/src/screens/Host.jsx`) sends `create` with `{ real, introAt }`; `functions/lib/run.js` `startEvening` makes the night (a rehearsal unless the box is ticked; the box is refused before the party day) and opens Act 1's Arrivals at once. The Host tab lists every room screen with a Send button for AirDrop (`SendScreens`). Every room screen counts down to `nights/{id}.introAt` (4:30 pm on the real night, five minutes after the tap on a run-through; `play/src/lib/start.js`), and at that time the server moves to The house rules on its own (`introDue`, called by the screens, with the minute's tick as the fallback), where the Parlour TV plays the intro video. The first click on a room screen makes it full screen. Start the Study opens the Study's page too; the Study station.zip (with its settings, never in the repo) is on the brain's Desktop. The party box on the Game night page still works for a plain `create`. The same button is first on the workshop's Home and Game night pages (`app/src/components/StartNight.jsx`; later that day), and what those pages need less often is folded under one line each, nothing deleted.

> **12 Nov 2026, night, Jon: "Development is done... I need it simple."** The button is called Start the night (never "run-through"); an unticked night is "a practice night". The workshop's menu is Home, Game night, For Jenna, Devices: Timeline, Where we are and Game test are off it (the pages still open at their addresses; the board script still works). From here: fixes only, plain words, no new jobs for Jon unless something is broken.

> **12 Nov 2026, the walk-through: Get Off My Lawn! trapped the group (round 3, attempt 43).** Slower colours (`SALEM_SEGMENTS`), a longer time to react (`SALEM_GRACE_MS`, mirrored in `play/src/lib/night.js`), and a round passes itself on its fifth slip (`SALEM_MAX_SLIPS`), so no group can be stuck. Do not make it faster again without Jon's word.

## RULE 1 — THE HOST PLAYS

Jon (the human you are working with) is the host, the developer, AND a player.
He must be able to build this entire game without learning the answers.
Every architectural and workflow decision defers to this rule.

## THE SEAL (spoiler-safety architecture)

Content is divided into two classes:

**SAFE (Jon may see, edit, commit):**
- The 19 motive rhymes (player-facing from Act 1 — public by design)
- Character bios, NPC personalities, rules text, UI copy
- Voice layers: cat openers and closers (since 23 Oct only the first line on
  Sir Irwin's tab of each is read, for his Act 5 screen). The cat deflection
  lines (brush-offs) are retired 23 Oct: kept, nothing reads them
- Variable pools (the blanks): rooms, times, durations, counts, places,
  witnesses. Retired 23 Oct: only the secret lines had blanks; kept, nothing
  reads them
- Echo frames (news wrappers with a ███ slot). Retired 22 Oct: nothing reads
  them; W-O-O-F News took the news's place
- The Parlour Games bank: questions, choices and their points
- Open line banks (22 Oct): the W-O-O-F News bulletin lines, the Cat Hint Lines,
  Irwin's countdown and trace-reveal lines, host lines, phone directions. Every
  line is written and Jon may see them; only the game's per-night pick is sealed
- Blank stationery templates (7 designs). Retired 23 Oct with the Act 2 safe:
  the Stationery page and the stand-in pictures are deleted; the list is
  kept, nothing reads it
- All code, schemas, validators, and this file

**SEALED (Jon must NEVER see):**
- Retired 23 Oct 2026 (Jon: secretLines retired, the Act 2 safe taken out):
  the per-motive secret sets. That was the kernels (the middle of every cat
  testimony), the Act 2 documents, the echo fragments, the old study clues,
  Sir Irwin's per-motive Act 5 lines, and the manifest mapping opaque codes
  to motives (`sealed/{code}`, `sealed/manifest`). Nothing makes or reads
  them now. The 19 sets made on 20 Oct stay in Firestore, unused and still
  sealed: never read or print them
- Any per-game generated case (murderer, victim, active motive, clue placement)
- The Parlour Games lean table: which answer each cat leans toward, per
  question (generated blind by `scripts/generate-leans.mjs`, Jon 22 Oct;
  Jenna may change any lean on their Steward page; Jon's account must never
  read it)
- Not sealed, and fixed as built (dialMapping, the handoff's default, 24 Oct):
  how the two hidden roles' Parlour Game points move the clarity dial, the
  Ghost toward clear and the Murderer toward foggy. Every phone gets the same
  set since 21 Oct. There are no hidden events in any act (closed 22 Oct). The
  dial has no slider on any phone (Jon, 16 Oct 2026): it is revealed in the
  Act 7 graph. The hidden roles' answers move their cat sliders like everyone
  else's, so no phone is a tell.
- The bag packing: which numbered bag holds which items (`sealed/bags`)
- The Relay Drawing picture bank (`sealed/relay_pictures`, simple thick-line
  art, made blind by `scripts/generate-relay-pictures.mjs`; never in the repo
  or Jon's terminal). Since 12 Nov 2026 the maker designs each whole picture
  and cuts it into squares, a blind judge keeps only pictures a vision model
  can name, and there is a second bank for practice nights,
  `sealed/relay_pictures_practice`: Jon sees those pictures on a practice
  night, so their names are kept off the party's bank, but Claude Code still
  never prints either bank
- Every per-night pick from an open bank: which family is real, which bulletin
  line plays, which two wrong families each guest's cats rule out, and which
  clue word each bag clue names
- Each night's private records (`nights/{id}/private/*`), for example the
  drawing's pictures and answers, the reveal, the trace, the bulletin's level,
  the dial clues

### The Steward exception (decided by Jon, 28 Sep 2026)
The Steward is Jenna (they/them), a NON-PLAYER. Since 23 Oct Jenna comes to
the party (Jon) and packs the bags at the house before the guests arrive, but
never plays. Their job is checking content. They may see and edit EVERYTHING,
sealed content included, because Jon cannot.

Content workflow (28 Sep; updated 23 Oct): Jon and Susan (Jon's wife, a
player) draft; the blind scripts make the secrets; Jenna checks.
- Jon and Susan draft SAFE content only. Both play, and anything they draft they
  would recognise on the night — decline and cite Rule 1 if either asks to
  draft or see sealed content.
- All sealed content is made blind, by the scripts in Enforcement 3 (the cats'
  leans, the drawing pictures, the bag packing) and by the case deal. Since
  23 Oct there are no secret cat lines or documents to draft (secretLines
  retired).
- Jenna reads the workshop lists cold, may change any lean, packs the bags,
  runs the real checks (Run the checks on their page, built 24 Oct), and
  reports to Jon only "done" or "needs more", never content.
- Bags: Jon and Susan supply the item pool as safe content (workshop area
  `bag_items`). A blind packing script (`scripts/pack-bags.mjs`, built 18 Oct
  2026) assigns items to numbered bags under the bag rules and writes
  `sealed/bags`, printing counts only. On the party night the cats' bag
  clues read it (`bags.js` `readPacking`, called from `deal.js` and `act4.js`, which pass it to the pure `bagclues.js`);
  a rehearsal never does, and shows a stand-in in square brackets. Every night
  reads only its bag count (`createNight`), never an item.
  Only Jenna's Steward view shows the packing list, and Jenna packs to it.
  Claude Code never prints the packing. Jenna also reads rules and bios cold,
  and looks over the cats' leans (build step 13). Brief: never
  volunteer anything, never confirm a guess. Full role: the Steward Handbook
  (WHERE THINGS LIVE) and `chats/docs/sirwin-manor-the-steward.md`.

Jenna's page, built 17 to 19 Oct 2026, the leans tab 22 Oct, the secrets tab
removed 23 Oct, the checks tab 24 Oct (`functions/lib/steward.js`, the
workshop's Steward page, `docs/steward-view.md`). Three tabs: the packing list
(read only), the cats' leans, and the checks (ops `whoami`, `bags`, `leans`,
`lean`, `checks`; the checks send back only IDs, names, pass or fail and
counts). These rules still hold:
- It reads `sealed/bags` and reads and edits `sealed/parlour_leans`, by
  verified Google email only. It never loads for Jon's account. Changing the
  security rules needs Jon's explicit approval.
- Regenerating sealed content must never silently overwrite Jenna's edits.
- Claude Code still never prints, logs or files sealed content. The Steward
  view is built and debugged blind, exactly like the blind scripts.
- Not on Jenna's page: the Relay Drawing pictures (stewardPictures closed
  24 Oct: no). Nobody reads them; they pass the picture script's own checks
  and RP1 in Jenna's checks.

### Enforcement — infrastructure, not discipline
1. Sealed content lives ONLY in Firestore: `sealed/*`, `cases/*`, and each
   night's `nights/{id}/private/*`. The security rules deny every client read
   of all three. `archive/*` (the morning after's copy of the party night,
   made only after the party) has no client rule either. It is NEVER committed to this repo — not as JSON, not in seeds,
   not in fixtures, not in test snapshots. `.gitignore` guards known paths; you
   guard everything else.
2. Only Cloud Functions (Admin SDK) read it: to assemble player-facing payloads
   at game time, for the Steward's view (see above), for the Home rows'
   counts (numbers only, `functions/lib/counts.js`, built 25 Oct), and after
   the party for the morning after (`functions/lib/morning.js`, built 25 Oct:
   Jon's account only, never before the party day, only once the party
   night's reveal has played to the end, and only when he types OPEN).
3. Sealed content is made only by the blind scripts: `scripts/generate-leans.mjs`
   and `generate-relay-pictures.mjs` (they call the Anthropic API) and
   `pack-bags.mjs`. Each writes straight to Firestore. Its stdout prints
   COUNTS AND PASS/FAIL ONLY. It never prints, logs, or files content. The
   case itself is dealt at the Act 1 blackout by `functions/lib/case.js`
   (through `deal.buildCaseForNight`, whose log line carries only the night id
   and the rehearsal flag). (`generate-sealed.mjs` and `validate-sealed.mjs`,
   which made and checked the per-motive sets, were deleted 23 Oct.)
   `npm run checks` (`scripts/checks.mjs`, 24 Oct) makes nothing sealed: it
   deals stand-in cases and a stand-in packing of the seed list in memory and
   prints counts only.
4. When you (Claude Code) work on sealed content: never echo it to the terminal,
   never write it to a local file, never paste it in explanations, never include
   it in commit messages or PR descriptions. Debug with opaque IDs, lengths, and
   hashes. If Jon asks to see sealed content, decline and cite this file — he
   wrote this rule.
5. Validation is automated and reports aggregates only (see docs/blind-content-protocol.md).
6. `motive-clue-worksheet-DRAFTED.md` from earlier design work is BURNED. If a
   copy exists anywhere, do not open, quote, or reuse it. Since 23 Oct no
   kernels are made at all (secretLines retired), so none of it can return.
7. Test fixtures and the eight fake test players use a throwaway generated case
   that is discarded after the run. Never persist one. Never print one.

### The burned exception
Motive #8 ("the dairy air") was authored with Jon and is spoiled for him.
Card tutorial8 closed 24 Oct (the handoff's default): its clue set stays
buried, since the secret sets are retired and there is nothing to promote.
Motive 8 is dealt like the others, with the same open hint lines.

## HOW WE WORK (23 Oct 2026; the start of a session added 24 Oct)

Rules for every Claude Code session. Jon should never have to remember where a
job or a decision lives.

Start of every Claude Code session: run `npm --prefix scripts run board`. It is
read only (the Timeline's cards and nothing else) and prints the open Claude
Code cards, Jon's Game test notes first. Work the Game test notes: they are
Jon's notes from trying each game on the workshop's Game test tab. Notes from a
postmortem (the workshop's Postmortem page, 11 Nov 2026) print before them:
when Jon says "do the postmortem", follow `docs/postmortem.md`. When one is
fixed, mark its card done by its number and title (in the session's ADDITIONS
migration), so the game's chip on the tab goes back to Not tried yet and Jon
tries it again. A card Jenna filed prints only its title and section; never
ask Jenna in writing what they saw.

- **Decisions live on the Canon page.** Only Jon decides. When one changes,
  update the Canon in the same session.
- **Jobs live on the workshop Timeline.** One card per job, with an owner
  (Jon, Susan, Jon and Susan, Jenna, Claude Code, Claude chat), a moment of the
  night, and an optional "by" date. Open questions are decision cards on the
  same board. There is no other to-do list: not in docs, not in chat, not here.
- **"Where we are"** (workshop) is the live status: what is left by owner,
  Jon's next three jobs, open decisions, links.
- **Start Here** (Claude Doc) is the map for any Claude chat: where everything
  lives, this routine, and a dated status snapshot.
- **Claude chat handoffs.** A Claude chat that decides or writes something ends
  with a handoff: a dated Claude Doc, copied into the repo as
  `docs/handoff-YYYY-MM-DD.md`. When one arrives: read it in full, check the
  repo and the Canon, apply what is missing, then write "Applied <date>" at the
  top of both copies. The newest handoff wins where an older doc disagrees.
- **`docs/sessions.md`**: one entry per working session, newest first (date,
  tool, what changed, what is left, decisions taken). A Claude chat's session
  gets its entry when its handoff is applied.
- A build is not done until `docs/on-the-night.md` covers every new host
  button, screen, beat or device move.

End of every Claude Code session, in this order:
1. The board: an ADDITIONS migration (`app/src/lib/content.js`) that marks
   finished cards done and adds every new job, with its owner and moment.
2. A new entry at the top of `docs/sessions.md`.
3. The Canon, if a decision changed.
4. Start Here's status snapshot, dated.
5. A plain-English report to Jon: short, and the one next thing for him.
6. Commit. Push and deploy only when Jon says.

## WHERE THINGS LIVE

| What | Where |
| --- | --- |
| Canon: every settled decision | Claude Doc, https://claude.ai/artifact/CU4JQVHtzuyLBiqt2WuWVk |
| Start Here: the map, the routine, the status snapshot | Claude Doc, https://claude.ai/artifact/P7eHcmr7R5PDLxGufmCK2A |
| Every job and open decision | Workshop Timeline, https://murderwin-at-sirwin-manor.web.app/workshop/#/timeline |
| Live status | Workshop "Where we are", https://murderwin-at-sirwin-manor.web.app/workshop/#/status, and the Where we are Claude Doc, https://claude.ai/artifact/8LkaQjCZd6juQq58jcW3RZ |
| Trying each game before the night, and Jon's notes on them | Workshop Game test tab, https://murderwin-at-sirwin-manor.web.app/workshop/#/game-test (the notes are Timeline cards for Claude Code; `npm --prefix scripts run board` prints them) |
| The last run of `npm run checks` | Workshop Health page, https://murderwin-at-sirwin-manor.web.app/workshop/#/health |
| Where every media file goes | `docs/media.md`; `npm run media` says what is in, missing or misspelt |
| The postmortem of a run (Jon's notes, the night's timings, the review) | Workshop Postmortem page, https://murderwin-at-sirwin-manor.web.app/workshop/#/postmortem (notes are Timeline cards, printed first by the board); `npm run night-log` on the brain during the run; `npm run postmortem` writes `docs/postmortems/<date>.md`; the routine is `docs/postmortem.md` |
| Claude chat handoffs | `docs/handoff-YYYY-MM-DD.md`, plus the dated Claude Doc |
| The cue walk-through (canon for sound, light, video and the phones) | `docs/cue-list.md`; Claude Doc https://claude.ai/artifact/XYhrKSQX193YXnNKdqScBw (the handoff) |
| Session log | `docs/sessions.md` |
| W-O-O-F News lines (the Recording Script; Susan reads Ava Waves, Jon reads Mic Cameron) | Claude Doc https://claude.ai/artifact/GJAR2uwXZ356opX6xNvMNN; `seed/woof-news.json` |
| Cat Hint Lines | Claude Doc https://claude.ai/artifact/Mb39Qkpd4s7jtz59Kdw2vV; `seed/cat-lines.json` |
| The Relay Drawing, Irwin's slides | Claude Doc https://claude.ai/artifact/HjTxtHxUckbN9qR1xRchgt; `docs/relay-drawing-game.md` |
| The rules deck | Claude Doc (slides), https://claude.ai/artifact/QGuBNcSDWkyfFqRg35V7yz |
| The Intro and Rules Script | Claude Doc, https://claude.ai/artifact/DQiHjrdudoaKrLkCKjCLRx |
| The Steward Handbook (Jenna's brief) | Claude Doc, https://claude.ai/artifact/XZC51qsxGg6myKa8FSoH2q |
| READ-FIRST, `cat-lore-final.md` | Files in Jon's claude.ai project, not the repo. Changes go to Claude chat as a Timeline card |

When this file and the Canon page disagree, the Canon page wins — fix this file.

The two big games, built 17 Oct 2026 (the drawing reworked 22 Oct to the
handoff; not yet tried on the real wall and bulb):
- Act 4 study light game: `docs/study-light-game.md`
- Act 6 relay drawing game: `docs/relay-drawing-game.md`

The game names (Jon, 24 Oct; `seed/game-names.json`, display text only; ids,
routes, kiosk names and cue ids keep the old names): Granolia's Lightbulb
Moment (the study light puzzle), In Duplicate (the memory match), Get Off My
Lawn! (Salem's Motion Game), Miss Boo LaRue's Arcade (since 29 Oct; Boo's
Catwalk is scrapped), Sir Irwin Needs a Hand (the Relay Drawing). The Act 6 deduction round has no name.

Decided with Jon on 21 Oct 2026 (Canon updated to match):
- Parlour Games (12 a night, the bank, how the cats lean): `docs/parlour-games.md`
- How the case gets solved (motive funnel, Act 2 rooms, Act 4 memory match): `docs/solving-the-case.md`
- Every automated check, and the Health page: `docs/test-plan.md`

## THE DESIGN DOCS FROM JON'S CHATS

`chats/` (gitignored, never committed) holds Jon's eight Murderwin claude.ai
chats (`murderwin-chats.json`, burned worksheet stripped) and, in `chats/docs/`,
the final version of every design document those chats produced: game design
doc, production plan, cat bible and cat info, act skeletons, traces, bio
worksheet, bag system, the Steward, worksheets 2 and 3, decisions logs. They
are 28 Sep snapshots. Read them before asking Jon anything they might answer,
but `docs/`, the newest handoff and the Canon win wherever they disagree; the
production plan's dates and the Pi lighting guide are superseded. They are
safe content, but if a doc ever turns out to hold drafted clues, stop reading
and tell Jon.

## PROJECT CONTEXT (locked decisions — do not re-litigate)

- Victorian manor murder mystery for Sir Irwin's first birthday. About 9 players
  aged 11 to 70, fully digital and multimedia, no physical props, no real locks —
  except the bags: four or five ordinary objects per numbered bag (Jon's final
  24 items, 24 Oct, `seed/bag-items.json`), the one deliberate physical
  exception (`docs/sensory-bags.md`).
  14 playable characters with professions, genders and traces, assigned at random
  at runtime and never changed all night.
- Stack: React + Vite, Firebase Hosting, Firestore, Cloud Functions, anonymous
  session auth via QR. Phone-first. Single page, one route, no client-side router.
- Data format for clues, cases and seeds: JSON. Decided 25 Sep. Never YAML.
- 7 acts, 2 to 2.5 hours (names since 13 Oct, `seed/night.json`):
  1 The Invitation (together, 4:00pm; role rules stated in the preamble;
    the house rules beat for the intro video and the rules deck, the join
    code on the Parlour TV throughout, 25 Oct; blackout at the end)
  2 Lights Out (solo, ~5:30pm, about 30 minutes; everything for your ears
    only; every guest visits all four cats in a queue, with Not yet; each cat
    gives a motive hint and a bag clue about the Murderer's bag; beats orient,
    news, peek, cat, supper: supper comes when everyone has seen all four, or
    Jon presses Supper's ready; no safe since 23 Oct)
  3 Supper Is Served (the Orangerie; ends with the dinner wrap-up, 25 Oct:
    every phone asks for the motives to be crossed off, the TV shows the join
    code, everyone back on their phone before Act 4)
  4 Behind Closed Doors (about an hour; pairs and trios, at most five groups;
    info shared only inside your group). Jon presses Start Act 4: a two-minute
    warning, the title card, the groups and Locked in, then fifteen-minute rounds (Jon, 31 Oct 2026; ten before)
    on the server clock. Each group visits all four game rooms once (the
    Study, the Library, the Orangerie, the Entryway) and waits in the Parlour
    between them; each room pays a reward and a bag clue about the Ghost's
    bag. Parlour Games wait on the phone in Act 4.
  5 One Candle (dessert, roaming; Sir Irwin speaks; then every phone asks for
    the motives to be updated from what he said, 25 Oct)
  6 The Final Hour (the Parlour; two Parlour Games, the Relay Drawing, the door
    opens, then Talk it over: no taps and no clock, until Jon presses Start the
    vote; 11 Nov 2026)
  7 Unmasked (~8:00pm; 2 minutes to enter picks, the ballot a card on the Now
    tab; majority decides; metrics plus a visual graph of the clarity dial;
    every phone locked to Eyes on the screen through the tally and to its own
    result with a thank-you through the credits, 25 Oct; then The End: a card
    on every screen and phone, jazz, the lights on Default, every phone open
    for good with the result on Now; Jon's phone closes the night with Good
    night, 11 Nov)
  Reveal order: Murderer → Motive → Victim.
- Three roles, symmetric, each holds one third: Detective, Murderer, Ghost.
  The Murderer knows they did it, not the motive. The Ghost knows they are dead,
  not who did it. Roles are assigned during the Act 1 blackout; every phone buzzes.
  Every win condition is the same: name Murderer + Motive + Victim.
- 19 motives, universal (any motive can attach to any character pair), final as of
  27 Aug. Visible to all players from Act 1 as a cross-off menu. `seed/motives.json`.
  swapMotive answered 8 Oct: keep all 19. Any later swap is Jon's call, never yours.
- Clue anatomy (23 Oct 2026, Jon: secretLines retired, the Act 2 safe taken
  out): there are no per-motive sealed clues any more. The cats say only
  their open hint lines (`seed/cat-lines.json`, `functions/lib/cats.js`
  `hintLine`), at the rung of each cat's ladder that its affection sets. The
  news is W-O-O-F News, an open bank (`seed/woof-news.json`). Sir Irwin's Act 5
  screen is his opener, the countdown line, the motive cards and his closer.
  What stays sealed is the case, the night's pick from each bank, the cats'
  leans, the bag packing and the drawing pictures. Gone:
  OPENER + KERNEL + CLOSER testimony, the Act 2 safe and its document, the
  echo fragments, the old study clue, Irwin's per-motive middle line.
- The five NPCs, never suspects. Every cat only ever rules out wrong answers;
  Act 4 uses the group's average affection.
  Sir Irwin, the dog — always true. Act 5: a countdown of motive cards, five at
    dial 1 down to one at dial 5, the real one always among them. Act 6: the
    trace reveal lines.
  Granolia Lickspittle — a long ramble with nothing (1), half a motive name (2),
    one motive (3), two and forgets the third (4), a whole family (5). (Her one
    wrong pool blank went with the secret lines, 23 Oct.) Lives in the Study
    and hosts the light puzzle.
  Miss Boo LaRue — a look (1), "Ew. Do I know you?" (2), one motive in five
    words (3), a family, chatty (4), a family plus a bonus motive (5).
  Zimothy Clawford, Esq., "the old family solicitor" (never shortened) — true
    but money-shaded: one motive curt (1), one motive civil (2), two motives
    (3), a whole family (4), a family plus a bonus motive (5).
  Salem Crooknog, the groundskeeper — backwards at 1–3, coin flip at 4,
    straight at 5; everyone starts at 3, Parlour Games cap him at 4, and only
    petting the real Salem (Jon's host button; anyone but Jon and Susan)
    unlocks 5, shown as True Friend of the Groundskeeper on the Cats tab. When
    backwards he points AT a wrong answer, so he never rules out the truth.
    (His separate 60 percent secret-line flip went with the secret lines,
    23 Oct: the ladder is all there is.)
  Trust ladder, stated at the top of the night: if Irwin and anyone disagree,
  Irwin is right. A cat's words are text first. Since 12 Nov 2026 (Jon:
  "Publish it all") every pet also has a voice: a cat says its lines on a
  guest's own phone when the guest presses Hear on its card, never by
  itself, and Sir Irwin says his dessert speech and his drawing slides on
  the Parlour TV. Audio is
  atmosphere, plus the W-O-O-F News recordings, whose words always show on a
  screen too (bulletin 1 and the closing bulletin are video on the Parlour TV
  once the files are in and the box The bulletins are videos on the Game night page is ticked, newsVideo answered 23 Oct; until then the brain plays the recordings; bulletin 2 is sound).
  The news team (Jon, 24 Oct): Susan plays Ava Waves, the studio anchor (bulletin 1's
  opening and sign-off on camera, all 25 lines of bulletin 2 and their opening and
  sign-off, the closing bulletin's studio open and close); Jon plays Mic Cameron, the
  field reporter (the closing bulletin's four parts outside). Susan knows which family
  each bulletin 2 line points at; Jon accepted that (bulletin2Known). Haley Stratton
  (weather) and Mitt Kickwell (sports) are for fun.
- Affection to each cat is rolled at character creation (Salem always starts
  at 3, Irwin always maxed).
  Since 23 Oct there is no pass or fail roll and no brush-off: a cat's
  affection at the scan sets the rung of its ladder (above), and the cat
  gives that rung's hint line and bag clue. Bag clues are a compass, not a
  pointer: a word that sits in two or three bags in play.
  DECIDED 12 Oct 2026 (Jon): affection moves during the night through the
  Parlour Games (Salem capped at 4). The one exception (22 Oct): the host's
  Salem petted button sets that guest's Salem to 5.
- Parlour Games (decided 12 Oct 2026, Jon's whiteboard; called "push and pull
  questions" in docs before 13 Oct; updated 21 Oct, `docs/parlour-games.md`):
  twelve a night: five in Act 2 and five in Act 4 at random times, two at the
  start of Act 6 before the Relay Drawing (one budget
  for the night: a game an act runs out of time for carries into the next
  act, and one Act 6 cannot fit is skipped; Jon 22 Oct), at random times rolled from
  the seed. Every phone lights up at once with one set: three silly questions
  in a row, exactly two choices each, the same next question whatever was
  picked. The bank (17 sets, 12 dealt a night) is SAFE content Jon writes in
  the workshop (`safe_content/scenarios`). For every Detective a secretly
  listening cat (never Irwin) warms or cools by its hidden lean (sealed, see
  above). For the Murderer and the Ghost the
  same set moves the clarity dial instead, the Ghost toward clear and the
  Murderer toward foggy (fixed as built, dialMapping, 24 Oct). Their cat
  sliders still move for real, by coin flip, with a Detective's odds and
  sizes. No phone ever shows a number.
- No hidden events in any act (closed 22 Oct 2026, never re-raise). The
  Murderer's and Ghost's only "events" are the Parlour Games: same questions as
  everyone, and their answers move the clarity dial. The dial changes
  information CLARITY, never content — "delay, never destroy." It stacks across
  the whole night and never resets; strong-vs-strong lands neutral and neither
  player learns they cancelled out. The validator must assume the worst dial
  and still prove every player can reach two of three (not built yet: today
  only the motive is proven, at dial 3, check G32). worstDial, Jon 24 Oct:
  build it now, before the second tech run (G07, G08 and G42, the bag solver
  at dial 1). Claude chat is building it and sends it as a patch
  (`docs/patches/2026-10-24-worst-dial.patch`); do not start it yourself.
- The clue path (22 Oct, updated 24 Oct, `docs/solving-the-case.md`): W-O-O-F
  News bulletin 1 (Act 2) crosses off one family; all four cats give each guest
  a hint (two wrong families a guest, so at least two always stand) and a bag
  clue about the Murderer; bulletin 2 (Act 3) hints at the real family; the
  Act 4 rooms (a motive crossed off by In Duplicate, and a bag clue about the
  Ghost from each cat; since 29 Oct Boo's arcade pays a clue about the Ghost,
  no motive);
  Irwin's countdown (Act 5, five cards at dial 1 down to one at dial 5);
  Study trace (Ghost) and trace reveal (Murderer); closing bulletin and
  credits in Act 7.
- Safeguards: Spill the Beans (the outward reset): the button works through
  Act 5, never after, but the engine only changes the story while no clue has
  reached anyone (no news, cat hint, study clue or memory match). In
  practice that is the start of Act 2, before the news flash. It says nothing
  either way. Making it work later in the night is new work: ask Jon first. The
  exposure safeguard is a silent tap with no call-out until Act 7, if ever.
- Picked per night: which wrong family bulletin 1 crosses off, the two wrong
  families each guest's cats rule out, each bag clue's word, the Act 4 groups
  and room order, and the Parlour Game times. The Relay Drawing calls its
  players at random. (The Act 2 safe was taken out on 23 Oct: act2Safe.)

## CLIENT RULES (hard rules for every player surface)

- All timing comes from server timestamps. No phone ever counts down on its own.
  A locked phone, a dropped connection and a late arrival all recover the same
  way: reconnect, rehydrate to current server state, silently.
- There is NO waiting-for-players screen anywhere in the game.
- A window closes when the last phone has answered, or on its clock, whichever
  is first (11 Nov 2026; before that a window never closed early). No choice →
  a default fires, leaning random, so a no-show is never a recognisable pattern.
- All phones get an event window at once. Read-time parity: innocent content
  matches the choice prompt in length. Every innocent beat needs a required
  interaction before it can be dismissed.
- The idle screen is a real state, not an error view, and is indistinguishable
  from a phone that just finished choosing an event.
- The blackout holds every phone near-black for at most 5 seconds; the power
  returns on its own. Since 11 Nov 2026 the dark comes two seconds after the
  press, at the same moment on every screen, phone, light and deck. Then one button, Sorry for the interruption, continue
  here; then the role card for 15 seconds on the server's clock, with no
  button; then the main page on its own. The role stays readable on the You
  tab.
- No service worker, no notification permission, no install prompt. The camera
  is asked for only at the first tap of the camera button, never at sign-in
  (11 Nov 2026).
- The cue relay performs no logic and stays blind. Sound files are named after
  the cue id. For W-O-O-F News the recordings reach it under codes that do not
  name the family, and the brain's window prints only counts, never a name or
  a path. Pad 1 s of silence for AirPlay spin-up. Always build a visual
  fallback: every recording's words also show on a screen.
- An 11-year-old and a 70-year-old must be able to use every surface, in dim light.
- No setup words in front of the guests (Jon, 29 Oct 2026: "make sure there is no programing
  things like connect stream deck and such visible to the players on the real game"). On the
  night no screen a guest sees shows a Connect button, a device, app or browser name, a status
  line, an address or a practice button. Setup is done before the guests arrive and its controls
  go once it is done; a fix during the night happens out of the guests' sight. Practice pages
  (`&play=1`, the Game test tab) may keep theirs.

## HARDWARE (decided 25 Sep — no Raspberry Pi anywhere; device table 23 Oct; Jon's key 25 Oct, built 26 Oct)

The game runs on Firebase Hosting. No machine in the house serves it. Device
setup, step by step: the workshop's Devices page. The device codes and jobs
are Jon's key at the end of `docs/cue-list.md`, which wins over this list.
- Jon's M3 15" MacBook Air — "the brain" (JKMBA). Started by a double-click
  on Start the brain on its Desktop (`cues/Start the brain.command`, 12 Nov
  2026). Ethernet, sleep off (on
  24 Oct its cable adapter showed no link, so it is on Wi-Fi for now; a card
  on the board). Runs the cue relay (`cues/`): the nine sounds and the
  playlists (Murderwin · Jazz, Intense and Credits) through its own sound
  output (the AirPlay group of four HomePods, the Orangerie's included; the
  group is not made yet, 24 Oct), the Hue bulb outside the bedroom (green for
  the welcome, off in the blackout, red from the power's return, green at the
  door) and the six Hue scenes (Murderwin Default, Dimmed, Blackout, Drawing,
  Candles and Study Dim; the Host tab has a button for each), the projector's
  plug through its two Shortcuts, the cake song, and the string lights for
  Get Off My Lawn! through three Shortcuts. Its own browser is the
  Orangerie's screen (`?kiosk=orangerie`): Salem's code in Act 2, the Get
  Off My Lawn! rules card in Act 4, its loop otherwise. Since 12 Nov that
  browser is the Orangerie's speaker for the cue sounds, like every room
  screen (the relay itself plays only the recordings), so the brain's sound
  stays on the Mac's own speakers, not a HomePod. Also a stand-in for the
  host phone (`functions/host.mjs`).
- Tried on 24 Oct: the Hue bridge is paired with the brain, and the hall bulb
  went red and green from it. The hall bulb is "Master bedroom" in the Hue app
  and "Jonny's light" in Apple's Home app; the brain finds it by its id
  (`HUE_HALL_LIGHT_ID`), never by name. The string lights run through Apple
  Home since 25 Oct (holding their button to pair reset their Wi-Fi): three
  Home scenes, each run by a Shortcut on the brain (Red, Green and Decor
  Murderwin Strings), `STRINGS_SHORTCUTS=on` in `cues/.env`; pairing by
  `NANOLEAF_STRINGS_HOST` and `NANOLEAF_STRINGS_TOKEN` still works if they
  come back. They run 1 to 2 seconds behind the phones (the question
  stringsLead). The projector's plug
  runs the same way (Jon's key, 25 Oct): an IKEA smart switch in Apple Home
  with the projector on it, two Shortcuts (Projector Murderwin On and Off,
  `PROJECTOR_SHORTCUTS=on`), off for the blackout, the drawing's intro and
  The End, on at the power's return and the ballot. `docs/cues-relay.md` has
  the steps.
- Jon's work MacBook Pro (JKMBP) on the Parlour TV (`?kiosk=living`): the
  join code through Act 1 (the intro video and the rules deck from a second
  tab), the blackout, bulletin 1, Sir Irwin's prompts, the Act 4 title card,
  the birthday card, Irwin, the drawing and the room's guesses (tapped on the
  host's phone; the TV is the fallback), the board, the ballot, the reveal,
  black at The End.
- Susan's work MacBook Pro (SKMBP) is Boo's screen in the Entryway all
  night with the Stream Deck + XL on USB, and never moves (`?kiosk=boo`,
  since 5 Nov; before that it fed the projector on the landing): its loop
  from Act 1, Boo's code in Act 2, Miss Boo LaRue's Arcade in Act 4 (her
  rules card with the code between groups; the group that scans in plays
  its visit on the deck, the first two players get the group's bag hint
  about the Ghost on the screen and their phones, a trio's third gets Boo's
  line, the chime ends it), its loop again, black at The End. Google
  Chrome, the Stream Deck app quit, the sound on the Mac's own speakers;
  the deck is connected once from the arcade's practice page in the same
  Chrome before the guests come, since the night's screen has no Connect
  button. The projector is out of the night; the brain still switches its
  plug (off for the blackout and the drawing, on at the power's return and
  the ballot), which harms nothing, and still lends the Parlour HomePod to
  this Mac through Act 4 (Jon, 27 Oct, for the Catwalk's music; the
  question arcadeSound).
- M1 MacBook Air — the study station (`?kiosk=study`, `station/`): Stream Deck
  over USB, Nanoleaf over wifi (Open API, plain HTTP, port 16021), the study's
  on-screen information. Both walls were paired and tried on 24 Oct, from
  another Mac (the station is not set up on the M1 Air yet, a Claude Code
  card): ten hexagons and twelve bars, which the station gathers from the
  pieces the controllers list (`station/lib/nanoleaf.js` `groupLayout`). The taps are
  taught once per Mac (the Game test tab's Teach the taps, or `npm run
  teach-touch` in `station/`) and saved on the Mac that runs the station
  (`station/touch-map.json`, not in the repo), so they must be taught on the
  M1 Air. `docs/study-light-game.md` §13.
- Jon's iPad Pro M2 (JKIPP) roams on one page all night (`?kiosk=ipad`, since
  12 Nov 2026) that follows the night with no reload: the Library's splash in
  Act 1, Zimothy's code in Act 2, the supper captions on its stand in the
  Orangerie in Act 3, In Duplicate on its small stand in the Library in Act 4,
  the Library's splash in Act 5, the bedroom's screen from the drawing in Act 6
  and through Act 7. *The iPad shows* on the Host tab switches it by hand.
  `?kiosk=memory` (`&play=1` is the standalone game) and `?kiosk=bedroom` stay
  as addresses for any other device. Jenna's iPad Pro and Boo's camera are out
  of the night (11 Nov 2026: `?kiosk=pose` is deleted, the credits have no
  photos). The older family iPad is out unless Jon says it stays (the
  question olderIpad, default out; if it stays, it keeps the memory match all
  night and the iPad Pro stays in the Orangerie until the bedroom). Susan's
  8th-gen iPad — decor, handed over if a guest needs a device. The old
  iPhone 11 — the spare phone.
- The study puzzle: Simon says on the white Nanoleaf Elements — three escalating
  patterns per round, reproduced by touching the panels (touch gestures stay ON
  for this wall; a telescoping pointer covers reach). Clearing a round lights a
  colour and a count, entered on the 15-key Stream Deck: columns 1–2 are six
  colours, columns 3–4 are numbers 1–6, column 5 is blank / undo / submit.
  Nothing auto-submits. Three rounds → three colour-number pairs → the code.
  Granolia hints. The cap is the Act 4 round, fifteen minutes since 31 Oct 2026, then the group moves on
  regardless.

## THE WORKSHOP (what we build first)

`/workshop` — Jon's private dashboard for building safe content part by part.
Full spec in `docs/workshop-spec.md`. Requirements learned the hard way:
- List-based CRUD, NOT a random task dealer. Jon picks a list, sees all of it,
  adds/edits/deletes inline, works one list until he chooses to switch.
- A dashboard home: progress per content area and "what's next." The Timeline
  page is the task board (every job filed by moment); "Where we are" is the
  live status (HOW WE WORK).
- The Game test tab (24 Oct, `#/game-test`; `#/study-test` opens its study
  section): every game of Acts 4 and 6 and the Parlour Games, to try before
  the night on its own device, each with a note box that files a Timeline card
  for Claude Code. Its test nights are always rehearsals, and the party box
  turns them off. `docs/on-the-night.md` ("Trying the games") covers it.
- Autosave per keystroke-debounce to Firestore. Every write also appends to a
  `workshop_history` audit collection. NOTHING is ever hard-deleted — deletes
  are soft flags. He lost work once to a client-side toy; never again.
- A save failure is a visible banner, never silent. Typing continues when
  Firestore is unreachable. Cursor lands in the input on load; Enter commits and
  opens a fresh line; click any line to edit in place.
- Auth: Firebase Auth sign-in, UID allowlisted in security rules as admin.

## BUILD ORDER (from Start Here; status 24 Oct 2026)

1. Repo + this file: done.
2. Clue format locked, JSON: done.
3. One character onto a phone via QR: done.
4. Seed-based case generator: done, as the case deal (`functions/lib/case.js`
   at the blackout; on the party night the motive is drawn with crypto
   randomness). Replay by seed built 25 Oct (`functions/lib/seed.js`): every
   rehearsal is dealt from a seed word, and the Game night page's Replay box
   deals one again; the party night is never seeded. Since 23 Oct no secrets
   generator feeds it.
5. Eight fake test players: done (`npm run fake-night`, PASS 23 Oct).
6. Split dev and live: replaced 17 Oct. Rehearsals are nights with the party
   box unticked, or the emulator; no second project.
7. First full dry run: not done. The leans, the packing (`pack-bags --
   --repack` on the final items) and the drawing pictures first (their blind
   scripts), then `npm run fake-night -- --real-secrets` (a party-night dry
   run on them), then the full tech run: every machine on at once, Act 1 to
   Act 7, twice, the second by Wednesday 11 November. `npm run checks` (24
   Oct) deals 1,000 stand-in cases and plays a fake night; the Health page
   shows the last run.
8. Host Mac as server: changed. The game is on Firebase; the brain plays the
   sounds and the hall light (`cues/`). Built; setup is on the board. On
   24 Oct the Hue bridge was paired and the hall bulb went red and green from
   the brain.
9. Media bank: not done. Stand-in tones until the recordings exist.
10. Screens as kiosks: built (`?kiosk=living`, `bedroom`, `study`, `ipad`,
    `memory`, `boo`, `orangerie`, and `decor` for a Mac's own screen); setup is
    `/setup` and the Devices page.
11. Nanoleaf layer: built (`station/`). On the real walls on 24 Oct the
    walls' lights work: both paired, the layouts read, the game's frames and
    the flash on both, the hexagons and bars grouped (`groupLayout`). Still to
    try, on the M1 Air: teaching all ten taps, the Stream Deck, and a whole
    round. Jon tries it from the Game test tab.
12. Full play-through review: not done. The first walk-through is the
    practice run, Sunday 25 Oct: a rehearsal night, the whole night, every
    screen on, Jon and Susan with the spare iPhone 11 (run sheet: Claude Doc
    https://claude.ai/artifact/3Ekk4JUd8VpN31NJWx56AK). Before the night, each
    game can be tried on its own on the workshop's Game test tab.
13. Canary (changed 23 Oct): someone who is not coming plays a rehearsal
    night cold, and Jenna checks the leans on the Steward page. Not done.
14. Freeze: no fixed date (23 Oct). Jon presses Freeze the workshop on the
    Game night page when the lists are final, Thursday 12 to Saturday 14
    November.

## WORKING STYLE

- Small commits, one concern each. Plain commit messages.
- When a design question is answered above or on the Canon page, follow it. When
  it is genuinely new, ask Jon — ONE question at a time, options included, short.
  He works in short bursts and is often tired: never hand him a wall of text or
  a batch of decisions. A question that waits on him becomes a decision card on
  the board.
- The party date is fixed. After the second full tech run (by Wednesday 11
  Nov), anything not working is cut, not fixed. Safe to cut: the Nanoleaf
  layer (the study runs on its screen), the Hue bulb and scenes (the TV
  announces the door), the string lights (Get Off My Lawn! runs on the
  phones), the Stream Deck + XL (the deck drawn on Boo's screen plays the
  arcade), an iPad (another
  screen takes its jobs, since any browser runs them), the videos (the words
  show instead), Boo's camera (the credits have no photos). Never cut: the case deal (`functions/lib/case.js`), the
  reveal order (Murderer, Motive, Victim) and the clue path (both bulletins,
  the cat hints and bag clues, Irwin's countdown, the study trace and the
  trace reveal).
  When in doubt, choose the simpler build.
