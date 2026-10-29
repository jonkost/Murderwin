# Sessions

A short log of every working session on Murderwin, newest first. One entry
per session: the date, the tool (Claude Code or Claude chat), what changed,
what is left, and the decisions taken.

Claude Code adds an entry at the end of every session (`CLAUDE.md`, HOW WE
WORK). A Claude chat's session gets its entry when its handoff is applied.
Jobs are not tracked here: they live on the workshop Timeline. Decisions live
on the Canon.

## 29 Oct 2026 · Claude Code (Whack-a-Mouse's pets, the black cat, the words on the strip)

- Jon: "lets add a decoy element to the mouse", and asked what the decoy
  should be: "all the pets. zimmy is a similar color. I think after 3
  missed your out, or it ends at 2 mins". Built in Miss Boo LaRue's
  Arcade's Whack-a-Mouse.
- From five seconds in, about one in four of what pops up is one of the
  household's five pets (Sir Irwin, Granolia, Boo, Zimothy and Salem),
  each its own face picture from `play/public/household/faces/`, up as
  long as a mouse. A pet tapped scores nothing, plays the miss and shows
  on red for 0.6 seconds; the third ends the game ("You tapped three
  pets. 12 points.", and Boo: "Not the household, darling. Out you go.").
  While it plays, the strip (in place of the game's name) and the screen
  beside the points say "Pets tapped: 1 of 3". Read as Jon's "missed": a
  mouse that hides, or a tap on an empty key, costs nothing. Otherwise
  the game still ends at its two minutes (80 seconds for a trio). A key a
  mouse has just left stays empty for half a second, so a tap a moment
  late never lands on a pet.
- Pretend players who never tap a pet now score about 113, 106 and 45
  (quick, typical, slow; 156, 144 and 57 before, as there are fewer
  mice). One who takes one pet in 20 for a mouse (Zimothy one in ten) is
  out in about one game in four, usually in the second minute. How often
  a real guest does is for Jon's try (card 514).
- Then, the same day: "Lets use the black cat emoji for the tail", and
  asked where, "The Tail key on the menu". The Tail key shows a black cat
  in a pale glow; the treat in the game stays a fish. And "Make sure all
  strike systems show some verbage in the touch screen": every strike
  says so on the touch strip for a second and a half, in place of the
  points ("Strike 1! That's a pet.", then "Strike 2! That's a pet.",
  which stay up while mice are tapped; "Too soon!" or "Too late!" in
  Knock It Off the Table, where a knock brings the points back sooner).
  The build adds: the strip says Whack-a-Mouse's rule before it starts
  ("Three pets and you're out."), and when any game ends, its strip says
  how ("Boo bit her own tail.", "You tapped three pets.", "Time's up.")
  beside the points. Yarn Catch has no strikes (a ball that falls past
  only scores nothing), so while it plays its strip shows the points, as
  before.
- Checked in the browser pane (in a tab of its own, beside Jon's): the
  five pets and their red faces drawn side by side by the page's own
  code, "Pets tapped" on the strip and beside the points, and three pets
  tapped (by a test tapper) ending the game with Boo's line and picture.
  Every new strip drawn in the real fonts fits at full size (nothing
  shrunk or cut; the tightest, Knock It Off the Table's result, 289 of
  302 pixels); on the page, the ready strip with the rule, "Strike 2!
  That's a pet." 20 ms after a tap and the points again after 1.5
  seconds, and the result's "You tapped three pets."; the black cat on
  the menu. No console errors. After the second review, again in a tab
  of its own: Zimothy tapped and a mouse 43 ms later, and "Strike 1!
  That's a pet." stayed its whole 1.5 seconds before "1 point"; no
  console errors. Not tried on the real Stream Deck + XL.
- Reviewed twice, each finding checked again before anything was fixed.
  The first (13 findings, 5 real) found that a tap a moment late for a
  mouse could land on a pet that came up in its place: a key a mouse
  leaves now stays empty for half a second. The second (19 findings, all
  real, most small) found that a mouse tapped just after a strike wiped
  its words, sometimes before the strip could show them: now they stay
  their whole second and a half in Whack-a-Mouse (the screen shows the
  points meanwhile), and only a knock ends them sooner in Knock It Off
  the Table. The rest were checks that could not fail (now they can: the
  black cat's glow, Boo's face loading first, each pet's picture late in
  turn with its own stand-in, the strike words found among what was
  shown, a game ending while a strike's words still show) and wording in
  the docs and on card 522. Also new: a check that each pet's fitting
  box matches its face picture, so a new picture fails it until it is
  fitted again (the household pictures' README tells Jon). Left for
  Jon's try: on two strips the middle words sit close to the side ones
  (the ready strip with the rule, and Knock It Off the Table's win), 34
  and 41 pixels apart on a strip 1,200 wide.
- Tests: functions 281 (2 skipped, 2 to do), cues 69, station 53, the
  workshop 130, play 178 and scripts 53 pass; `npm run checks` all clear;
  the build and its check pass. Twenty-seven deliberate breaks of the new
  code, each in a throwaway copy, each fail a test: among them no rests,
  the red key free, a pet up longer, no strike words or short ones, a
  mouse tapped that wipes them, a knock that keeps them, the words wrong
  on the edge or on the way back, the result showing a strike's words,
  no rule, the old result strip, a fish on the Tail key or a cat with no
  glow, Boo's face not first, a wrong stand-in, a late picture used and a
  box measured wrong. Not deployed, not pushed.
- Board: cards 520 (the pets), 521 (the black cat) and 522 (the words on
  the strip) done; a line about all three added to Jon's try of the
  arcade (514); card 515's points for the mice brought up to date and the
  menu's fish taken out of its questions (its old words kept on the
  card). No decision changed, so the Canon is
  as it was. Start Here's snapshot says so. `docs/boo-arcade.md` (§1, §3,
  §4, §5, §6, §7, §8 and the technical notes), `docs/test-plan.md` (G54
  and G56) and `play/public/household/README.md` updated.

## 29 Oct 2026 · Claude Code (the two just-for-fun winners)

- Jon, 28 Oct: "Make boo's, zimmy's, and Salem have a winner. Just for
  fun." Boo's arcade had its winner; this session built the other two
  (cards 516 and 517), picked the arcade's way: the best count wins, a tie
  names everyone tied, and one player names nobody.
- In Duplicate: each pair counts for the player whose turn it was, over
  all three boards. After the third board the Library's screen names
  whoever found the most pairs, in Zimothy's voice ("The sharpest clerk at
  the table. I'd hire you. Cheaply."; a tie: "A tie. I'll split the credit
  and bill you both."), the name big and a plain line under it ("Most
  pairs: Margaret, 12."). If the chime comes first, nobody is named.
- Get Off My Lawn!: each slip counts against the phone that made it. Once
  Salem's game is cleared, the Orangerie's screen (the brain's browser)
  names whoever slipped least, in Salem's voice ("That one barely
  trampled my lawn. Don't let it go to your head."; a tie: "A tie. Can't
  tell you lot apart. Never could."). A phone that can't feel a shake
  never slips, so it would always win: every phone now says whether it
  felt a shake as the clean mark passes, and only those phones (and any
  that slipped) can win.
- Neither changes anything: the whole group is paid the same, and nothing
  earns a clue. The counts live on the server by place in the group,
  numbers only (no names on the rooms' public docs, L07), so a reloaded
  screen still names the right player; the screens put the names to them
  from the Act 4 groups.
- Samples: `?preview=kiosk-memory-winner`, `kiosk-memory-tie`,
  `kiosk-orangerie-winner` and `kiosk-orangerie-tie`, and one of each on
  the Game test tab under its game. Checked in the browser pane at 800 by
  600 and at the iPad's 1366 by 1024: all four, and the rules card and the
  memory board as before, with no console errors. Not tried on a
  rehearsal night yet (card 519).
- Checks G57 and G58 (`docs/test-plan.md`); `docs/room-screens.md` and
  `docs/on-the-night.md` updated.
- Tests: functions 281 (2 skipped, 2 to do), cues 69, station 53, the
  workshop 129, play 171 and scripts 53 pass. `npm run checks`: all clear
  (not saved to the Health page from here: no way into Firestore). The
  build and its check pass. Not deployed, not pushed.
- Board: cards 516 and 517 done; new 519 (Jon tries the two winners on a
  rehearsal night that reaches Act 4, by 6 Nov). Start Here's snapshot
  says so. No decision changed, so the Canon is as it was.
- Noticed, not changed: the Game test practices name no winner (the
  memory match on its own has no names, and Salem's practice has no
  group); the Game test tab and the Devices page still say In Duplicate
  has 7, 10 and 14 pairs (the game deals 6, 10 and 14).

## 28 to 29 Oct 2026 · Claude Code (Miss Boo LaRue's Arcade, built to try)

- Jon: "We need to get boos game up for testing. Not the cat walk the
  arcade games." Miss Boo LaRue's Arcade is built from Jon's 28 Oct talk,
  on a page of its own: `?kiosk=boo&play=1` (free play) and `&visit=1`
  (a practice visit; `&names=` starts one at once). It reads no night,
  pays nothing and deals no clue. The night keeps Boo's Catwalk until Jon
  answers entrywayGame. `docs/boo-arcade.md` has the whole game.
- Five games on the Stream Deck + XL (Boo Chasing Her Tail, The Lazy
  Pointer, Whack-a-Mouse, Knock It Off the Table, Yarn Catch), picked from
  the middle of the second row of keys, two blank keys at each end. The
  left three dials steer left and right, the right three up and down, and
  a press on any dial knocks. With no Stream Deck the deck drawn on the
  screen plays the same, with the mouse or the keyboard.
- The visit: two or three names, two tokens each in turns, two minutes a
  game (80 seconds for a trio), each player's clue on the screen after
  their second game (in practice a line in square brackets), a trio's
  third player gets "Didn't I give you enough? Now be off! I'm done
  playing games.", Boo's winner (the most points, ties named), free play,
  and "Be on your way." at the chime, ten minutes in or on Ring the chime.
- Reviewed on 29 Oct (a Workflow of reviewers and bot players), and the
  confirmed findings fixed: in a visit, a game that would run into the
  chime is cut short (never under 30 seconds) so its clue usually still
  comes first (a pair at an ordinary pace lost its second clue 86 times in
  100 before; none now); the chime names a trio's third player apart; the
  knock's paw rests 0.4 seconds, and a press while it rests misses again;
  the mice stay up a little longer; one arcade tab holds the Stream Deck
  at a time (the tab opened last takes it, and the other says so, with
  Connect to take it back); a long winner's line fits; Boo's picture and
  the sounds wait properly; the practice note's words. The study station
  now opens only a fifteen-key deck, so the + XL beside it never confuses
  it (`station/lib/streamdeck.js`), and the hardware check counts the
  same way.
- Checked in the browser pane at 1280 by 720, on the built site: free
  play, a visit with three 30-character names, the count, the chime's
  two-sentence farewell and the clue screen all fit, with no console
  errors. Not tried: the real Stream Deck + XL in Chrome, and how fast
  each game feels.
- Tests: functions 279 (4 skipped), cues 69, station 53, the workshop 128,
  play 169 and scripts 53 pass. `npm run checks`: all clear. The build
  and its check pass.
- Deployed 29 Oct on Jon's yes, from a clean copy of dc6a6af (another
  session was at work in the same folder, so none of its edits went out):
  hosting, the rules (unchanged) and the functions (all 25 skipped,
  unchanged since 28 Oct). The tests, the checks and the build passed on
  that copy first. Checked live: all 118 files match the build byte for
  byte, the study station's code is version 94791318b2c7, and the arcade
  opens and plays at ?kiosk=boo&play=1 with no errors. The workshop could
  not be opened signed in from here, so the board's new cards (513 to 518)
  land the next time Jon opens it. The station picks up its fix at its
  next start. Not pushed.
- Board: card 513 done; new 514 (Jon tries the arcade with the + XL, by
  1 Nov), 515 (the arcade on the night, only if entrywayGame picks it,
  with the questions to ask then: even points, Knock's steady press, each
  clue's affection, the sounds, the two-minute games, the fish), 516 and
  517 (Jon's just-for-fun winners for In Duplicate and Get Off My Lawn!),
  and 518 (below).
- The Canon's Genuinely open list (checked 29 Oct) gains the three open
  questions it was missing: promptScreen (25 Oct), studySecondScreen and
  entrywayGame (28 Oct). Start Here's snapshot is dated 29 Oct. Noticed on
  the way: the Canon and Start Here say Jon answered roomMusic on 25 Oct
  (one Apple Home scene per cue), while the board, `CLAUDE.md` and the
  build keep it open on its default (one playlist through the brain).
  Card 518 asks Jon once which stands; nothing changed meanwhile.
- Left: Jon's try (card 514), then his answer to entrywayGame.
- Decisions: none changed. entrywayGame stays open (default: Boo's
  Catwalk), now listed in `CLAUDE.md` and on the Canon.

## 28 Oct 2026 · Claude Code (the phone's look; Jon's five Game test notes)

- The phone app has a new look (Jon: "make it look pretty", "the menu at
  the bottom is crude", "a hierarchy system"): one ladder of text sizes for
  the whole app (label, small, body, lead, title, display), the serif for
  what the household says and a plain face for what the phone tells you,
  brass edges and a soft glow on the cards and the big buttons, and a new
  tab bar with a small line drawing above each word, the lit tab in brass.
  The header is the act's number and name. Every tab word fits on a phone
  320 to 390 pixels wide (checked in the preview).
- Fewer words (Jon: "way too many words on the pages"): the Act 4
  directions and arrivals, every notice, the lights-out lines, the Relay
  Drawing's screens, Salem's and Boo's phone screens, the Welcome and the
  practices. The TV cards keep their full rules; a test checks that the
  phones' short rules agree with them.
- Get Off My Lawn! (card 10008): while a round plays, each phone's whole
  screen is only red or green, with no words. The rule shows once, before
  the first round: a red Shake tile and a green Freeze tile.
- The string lights and the practice (card 10007): the brain followed only
  the night's game, never the Game test practice. Now it follows the
  practice too, and the night's game wins if both play. Stop the brain and
  start it again once to pick this up.
- In Duplicate full screen (card 10005): the page now lets an iPad open it
  from a Home Screen icon with no Safari bars (Share, then Add to Home
  Screen). Nothing ever asks anyone to install. New card 511 for Jon: the
  three icons on the iPad Pro.
- The study's second screen (card 10006): a decision card,
  studySecondScreen. Its default needs nothing built: the study's screen
  full screen on the second display, the station's window on the Mac.
- Granolia's Lightbulb Moment (card 10004): done, it ships.
- Tests: functions 279, cues 69, station 48, play 149 and scripts 52 pass;
  the workshop 125 of 126. The one failing test belongs to the Boo arcade
  work in progress in the same folder (another session), which this commit
  leaves out.
- Deployed 28 Oct on Jon's yes: hosting, the rules and all 25 functions.
  The first try stopped before anything went out (Google's us-central1
  was briefly unreachable); the second went through. Checked live: the new
  tab bar and Salem's red screen on the phone, the board's changes in the
  workshop. The deploy also carried the Boo arcade session's uncommitted
  work as the folder stood (Jon: deploy now, arcade bits and all): its
  Game test entries and its own page at ?kiosk=boo&play=1, which no
  guest's phone and no night screen opens. Not pushed.
- Left: Jon looks over the new look on his phone (card 512) and puts the
  iPad stations on its Home Screen (card 511). The brain was not running,
  so its next start follows the practice. The board marks the five notes
  done the next time the workshop opens.
- Decisions: studySecondScreen, new and open.

## 28 Oct 2026 · Claude Code (In Duplicate's turns; the Entryway's game)

- In Duplicate takes turns (Jon, 27 Oct): the Library screen names whose
  turn it is, from the Act 4 group (so a trio is known when it arrives); a
  pair keeps the turn, a miss passes it on, each board starts with someone
  else. The whole group is still paid. Tried in the preview with three
  names. Not tried on the iPad.
- The 27 Oct session's work (Boo's music on the Parlour HomePod) was
  committed as it stood.
- Talked through, not built: the projector cannot reach the landing, so a
  Stream Deck + XL arcade for Boo on Susan's MacBook Pro (decision card
  entrywayGame, with the design in its note). Jon also floated, then
  dropped, renaming Boo to Miss Beaux LaRue: her name stays Miss Boo LaRue.
- All six test suites, `npm run checks` (all clear) and the build pass.
  Deployed 28 Oct on Jon's yes (hosting; no function changed). Not pushed.
- The study's rules card draws both walls as they hang, read from the
  controllers' layouts and levelled to Jon's photos (`play/src/lib/walls.js`).
- The study station was started on the brain; it reached both walls but the
  key word saved online did not match station/.env. SKMBA is up: the station
  moves there (a zip of station/ with its settings, made for AirDrop).
- The study station starts with a double-click (Jon: setup was too much
  work): `station/Start the Study.command` clears the AirDrop mark, finds
  Node (or opens its download page), keeps the Mac awake and restarts the
  station if it stops. The zip for SKMBA (Desktop, "Study station.zip")
  carries the parts and the settings, so nothing installs but Node.
  On Jon's yes the online key word was set to match station/.env and
  cues/.env (checked by match only, never printed).
- The zip is on the workshop (Jon asked): the Study test page's Download
  the Study station button, shown while the station is not connected. It
  lives in Cloud Storage at `downloads/study-station.zip`, staff only (a
  signed-out request gets 403), never on Hosting, since it holds
  station/.env and the site and repo are public. A new one after any change
  to station/: `npm --prefix scripts run upload-station`. Deployed 28 Oct
  (hosting) on Jon's ask. Not pushed.
- Teaching the taps was slow. Measured on the real Elements: the gesture
  stream reports a tap about 1.1 s after the finger and never reports a
  press held about a second. The station now also takes the wall's raw
  touch over UDP (TouchEventsPort), one tap per touch, and drops the
  stream's late copy. Replayed the recorded touches: one tap each. A fresh
  zip is saved. Start the Study now fetches the newest station code from
  the site at every start (`hosting/station-code/`, built by
  `scripts/station-code.mjs`), so later fixes need no download; it never
  touches the repo's own station/. Needs a hosting deploy to take effect.
- The practice round took no taps (four misses). Listened again: touching
  across the wall, the gesture stream read most taps as swipes and
  reported 4 of 9; the fast road reported all 9, one each. A dropped tap
  makes the next one a miss. Fix: the new station (the fresh zip).
- Jon played a practice round on the new station: it works, and is tricky.
  His notes, built: one half of each Lines bar lights for a count (so the
  count reads), a green 3, 2, 1 on the Lines before every pattern, one red
  flash on the Lines for a wrong touch or a wrong pair, tighter pauses.
  Tried in the tests and on the real Lines layout, not yet on the walls.
  Deployed 28 Oct on Jon's yes (hosting, with the station code at
  `/station-code/`, version 3e5bd24aac00). Not pushed.
- The Stream Deck in the game's branding (Jon picked branding over three
  mock-ups): faces drawn once in a browser (`station/keys/make.html`) and
  painted from files; the top-right key flashes a green tick for a right
  pair, a red cross for a wrong one. The faces travel with the station
  code, so SKMBA gets them on a restart after a deploy.
- macOS on SKMBA refused the downloaded starter; right-click Open no longer
  works, so the page now says Open Anyway in Privacy & Security.
- Left: Jon's answer on entrywayGame (and, if the arcade, how to make up
  Boo's motive cross-off); trying the turns on the iPad (card 510).

## 27 Oct 2026 · Claude Code (the workshop's slow sign-in; Boo's Catwalk)

- The workshop's sign-in was slow: every boot replayed all 23 board
  migrations, one server transaction each (and a query or two before most).
  Now `ensureSeeded` reads `meta/seeded` and `meta/migrations` once and runs
  only migrations not yet applied (each still rechecks inside its own
  transaction). Not timed live: it needs Jon's sign-in and a deploy.
- Boo's Catwalk (Jon's note 10002, "I don't get the game … looks ugly"):
  the wall is now a lit runway with Boo in a spotlight. The card between
  groups and her intro list the three steps; the strut says Strut! with
  three pose dots; the music stops with a record scratch; STRIKE A POSE!
  flashes red with a big count; the verdict is a speech bubble; the end
  says to look at the phones. The fallback music is a real groove (kick,
  hats, bass) instead of beeps. The phones say the same in fewer words.
  The show's timing and the server are unchanged. New sample on the Game
  test tab: Boo's wall, the whole show (`?preview=kiosk-boo-show`).
- Boo's music on the Parlour HomePod (Jon's decision, same day): the
  brain takes the Parlour HomePod out of Music's AirPlay speakers when Act 4
  starts and puts it back when it ends (`boo` in `cues/scenes.json`,
  `music.speaker`, `npm start -- --speakers`); Susan's MacBook Pro plays the
  wall's music to it; the wall starts and stops the music two seconds early
  for the AirPlay delay (`booLead`, `&airplay=`; none in practice unless
  set). New Game test try: the practice wall through the HomePod. Untried
  on the hardware: the HomePod's name (the list hung on a permission
  question), the switch itself, and whether a chime takes the HomePod back.
- Board: migration `2026-10-27-boo-catwalk` marks card 10002 done and adds
  Jon's cards 507 (the HomePod's name), 508 (Susan's MacBook Pro to the
  HomePod before Start Act 4) and 509 (tune the delay by ear).
- Left: Jon tries Boo's Catwalk again; the three cards; deploy when Jon
  says. Start Here's snapshot and the Canon page not updated yet.
- Decisions: Boo's music plays on the Parlour HomePod in Act 4, not the
  house jazz (Jon, 27 Oct; changes cue 11).

## 26 Oct 2026, evening · Claude Code (Jon's Game test notes)

**What changed** (on `main`; deployed and pushed on Jon's yes)
- Asked first to start the study station on the M1 Air by the walls: not done. This session runs
  on the brain, and the M1 Air is not set up or reachable from here (card 474, Set up the study
  station on the M1 Air, is still open).
- In Duplicate (note 10000): the first round is 6 pairs on a 4 by 3 grid, then 10 and 14
  (`MEMORY_ROUNDS` in `functions/lib/act4.js` and `play/src/lib/rooms.js`, the board sized to fit
  the iPad; G50 and the docs follow). Canon updated.
- Sir Irwin Needs a Hand (note 10001): each square's line is clipped at the box's edge
  (`play/src/lib/draw.jsx` `Cell`), the drawing's screens are black (the slides, the call, the
  guess), and Sir Irwin's slides read from the left.
- Granolia's Lightbulb Moment (note 10003): the study screen in the house look: manor blue under
  the red wallpaper, the serif title and hook, the clock in brass at the top right, Granolia's own
  picture beside one panel holding the group, the jewels, the round and her line. Its card between
  groups wears the same look.
- The board: migration `2026-10-26-game-test-notes` marks notes 10000, 10001 and 10003 done.
- Deployed on Jon's yes (hosting, both rule sets, 25 functions) and pushed. Checking the live
  site turned up that the memory match's board was sized by a guess at the room under Zimothy's
  words: rounds 2 and 3 ran about 130px off the bottom of an 11-inch iPad (1194 by 834), and on a
  short laptop screen the cards shrank to 62px. Now the screen is one screen high, the board fills
  the room actually left (a CSS size container, `.memory-fit`), and Zimothy's words are capped by
  the screen's height. Measured, all three rounds fit with and without the rehearsal band at
  1194 by 834, 1366 by 1024, 834 by 1194 and 1280 by 720 (cards 169, 211, 177 and 136px in round 1).
  A 7-pair board dealt before the change still fits (7 by 2). The preview deals 6 pairs. The
  site deployed again (hosting only) and pushed.
- Then, from Jon: the square's coordinate (C3, B1) sits centred above the square, on a turn and
  on Sir Irwin's slide 3 (`Kiosk.jsx`, `.kiosk-cell`, `.slide-cell`). Deployed (hosting) and pushed
  on Jon's yes.

**What is left**
- Boo's Catwalk (note 10002) stays open: Jon sends the shape he wants for the wall and the catwalk.
- Jon tries the three fixed games again on the Game test tab (deployed).

**Decisions taken**
- Jon: In Duplicate's first round is 6 pairs on a 4 by 3 grid.

## 25 to 26 Oct 2026 · Claude Code (the cue list built: handoff 25 Oct, section 5)

**What changed** (on `main`, commits 8b4563a to 0276a1e, then the board's migration merged on top; not deployed,
not pushed)
- Applied `docs/handoff-2026-10-25.md` in full. Jon's cue walk-through (`docs/cue-list.md`) is
  canon for sound, light, video and the phones. First the tidy-up: the branch
  `claude/nice-burnell-fe6dfb` merged (the Home rows, the motive card pictures, replay by seed,
  the morning after, Boo's camera, the test plan's checks), all 629 tests green, `npm run checks`
  all clear and saved for the Health page (card 472). Card 473: Granolia's hello in the Study says
  to touch the wall first and use the buttons at the end.
- The brain (`cues/`): the hall bulb by phase (green for the welcome, off in the blackout, red from
  the power's return, green at the unlock); the projector's plug through two Apple Home Shortcuts
  (Projector Murderwin On and Off, `PROJECTOR_SHORTCUTS=on`); `cues/scenes.json` rewritten to the
  cue list: three Music playlists (Murderwin · Jazz, Intense, Credits) at five levels, six Hue
  scenes (Murderwin Default, Dimmed, Blackout, Drawing, Candles, Study Dim), the music cut at the
  first Name press, the dim study scene while a group plays, Cake! (Happy Birthday for Dogs from
  the Music library, the Candles scene, the jazz back when the song ends); nine sounds, only
  chime-phone and blackout required (one chime serves every chime moment; the stings optional).
  `docs/cues-relay.md` rewritten.
- The blackout: Blackout returns the power on its own five seconds later, on the server; Power
  returns stays as the hand button. Every phone then shows one button, "Sorry for the
  interruption, continue here", then its role card for fifteen seconds on the server's clock,
  then the main page on its own. The client rule in CLAUDE.md says so.
- Host tab: **Sound test**, **Cake!**, **At the paper**, and the drawing's guess on the host's own
  phone (the TV's four names stay as the fallback). Fifteen-second turns; the walk a
  twenty-second limit; the drawing's budget 26 minutes (44 turns).
- The night's shape (`seed/night.json`): Act 1 "The house rules" (the brain dims and stops the
  music); the join code on the Parlour TV through Act 1; Act 3 "Dinner wrap-up" (the motive
  prompt, the rejoin code); the supper notice (leave the phone in the Parlour, charging); the
  dessert chime and the Happy Birthday Irwin card; Act 5 "Update your motives"; Act 6's break
  line and "be in the Parlour for the final event"; the ballot as a card on the Now tab with the
  tabs reachable; the Act 7 locks (eyes on the screen, then the result with a thank-you); Act 7
  "The End" (every screen black, every phone open with everything readable, for good).
- The screens: a loop slot on every idle screen (`play/public/loops/`, five files Jon makes);
  each room's code on its screen in Act 2 (printing stays the fallback); `?kiosk=orangerie` for
  the brain's browser; the Act 4 rules cards with the full cat pictures; the birthday card.
- A Notes tab on every phone (free text, saved per phone per night, never read by anyone else).
- The devices follow Jon's key: Susan's MacBook Pro on the projector all night; the iPad Pro
  roaming (the Library in Act 2, the Orangerie captions in Act 3, the memory match in Act 4, the
  bedroom from Act 6); Jenna's iPad Pro as Boo's camera; the older family iPad out by default.
- The board: the built jobs recorded as done cards; Jon's cards (the playlists and the song, the
  six scenes, the Patio light in the Decor strings scene, the projector's plug in Home, the five
  loops, the iPad Pro's moves, the Act 6 fit check); the stale device and sound cards rewritten
  or retired; rulesDeckScreen answered (the Parlour TV).

**What is left**
- Done on 26 Oct, on Jon's yes here: pushed `main` (762bdf0) to GitHub and deployed it
  (hosting, both rule sets, 25 functions, three of them new: morningAfter, sealedCounts and
  posePhoto; the live play and workshop pages answer). Jon opens the workshop once so the two
  new migrations load the cards.
- Nothing was tried on the real hardware: the bulb's off, the projector's plug, the song from
  the Music library, the loops (no files yet), the QR codes from a TV at distance, the brain's
  browser as the Orangerie screen. The practice run and the Game test tab show the phones' new
  flow (previews prompt-continue, ballot, eyes, result-lock, notes).
- Jon's hardware jobs are cards: the playlists and the song, the six Hue scenes (he names the
  study's other lamp), the Patio light into the Decor strings scene, the projector's plug and its
  two Shortcuts, the five loops.
- The worst-dial patch (card 478) has still not arrived from Claude chat.
- The Canon and Start Here: Claude chat keeps them (the handoff says so); this entry and the
  board are the record on this side.

**Decisions taken:** none by Jon. Built as defaults, each a card on the board: roomMusic (one
playlist for the whole house; bulletin 2 on every HomePod), olderIpad (out), cueSounds (one chime,
the stings optional, no power sound), bedroomName ("the bedroom"), blackoutAuto (yes, five seconds),
promptScreen (the TV dark through the role cards). Differences from the letter of the handoff, for
Jon to overrule, are listed at the top of `docs/handoff-2026-10-25.md`.

## 25 Oct 2026, morning · Claude Code (the string lights through Apple Home)

**What changed** (three commits on `main`: b4f9c1c, 325fa87, 2b0afbc; deployed state unchanged,
the brain runs from the repo)
- The Orangerie string lights can run from the brain through Apple Home instead of a Nanoleaf
  pairing: three Home scenes with only the Holiday Lights in them (red, green, a warm decor glow)
  and three Shortcuts on the brain, Red Murderwin Strings, Green Murderwin Strings and Decor
  Murderwin Strings. `STRINGS_SHORTCUTS=on` in `cues/.env` turns it on; a renamed Shortcut is
  named in `cues/.env` (`STRINGS_SHORTCUT_RED`, `_GREEN`, `_DECOR`), never in the code.
- `shortcuts run` reads stdin until it closes, so the brain closes it at once: a Shortcut never
  waits on the terminal.
- `docs/cues-relay.md` steps 12 to 14 and the Where it stands note; tests in
  `cues/test/strings.test.mjs`.

**What is left**
- Apple Home answers in 1 to 2 seconds, so in Get Off My Lawn! the phones lead and the strings
  follow: the question stringsLead (does Salem's intro say to watch the phones?) went on the board
  that day, from the branch's session.
- Nothing on the lights: red, green (Jon's rebuilt Green Murderwin Strings v2, named in
  `cues/.env`) and decor all changed the real Holiday Lights from the brain on 25 Oct.

**Decisions taken:** none. The string-lights cards (423, 462) were marked done from the branch's
migration the same day.

## 25 Oct 2026 · Claude Code (the 24 Oct evening handoff, item 4)

**What changed** (branch `claude/nice-burnell-fe6dfb`, merged into `main` on 25 Oct as 8b4563a; not deployed, not pushed)
- The Home rows (card 343): "The secrets, made blind" on Home counts the
  packing list (made or not, and its bags), the cats' leans (questions with
  a lean for every cat, of all) and the drawing pictures (good ones, of
  nine). A new admin-only callable, `sealedCounts`
  (`functions/lib/counts.js`), returns numbers and one yes or no only.
- The motive card pictures (card 308): `play/public/motives/1.png` to
  `19.png` show beside each motive in Sir Irwin's countdown and on the
  motive's card at the reveal; the rhyme alone until a picture is in.
- Replay a night by its seed (card 324, G22): every rehearsal is dealt from
  a seed word (`functions/lib/seed.js`): the deck, the affection rolls, the
  case, the Act 2 line, the Act 4 groups and memory boards, the drawing, the
  trace look-alikes, the silent phones' answers and a spill. The Game night
  page has "Play a rehearsal again" (the last five words, Play it again, a
  box used once, greyed out on the party night). The party night and every
  dry run are never seeded. `npm run checks` names each stand-in case by a
  word (`-- --seed check-28` deals one again); `npm run fake-night` prints
  its word and takes `-- --seed`.
- The morning after (card 196): a new admin-only callable, `morningAfter`
  (`functions/lib/morning.js`), and a Morning after page linked from the
  Game night page. It opens only on the party day or later, only for a
  party night whose reveal was named on the party day, and only when Jon
  types OPEN. It archives the night (`archive/{nightId}`; the open mark is
  `archive/_morning`; no client rule reaches either), shows the case in
  plain sections and Boo's Catwalk photos, takes the photos off the public
  docs, then Keep or Clear the secrets (Clear copies each as it stands
  first). An independent review found four gaps in the first version (a
  night started with the box ticked before the party could open on the
  day; the mark sat in client-writable meta/; Clear could lose a newer
  version; a dry run could take the typed replay word): all fixed and tested.
- The pose photo (card 450, nice to have): Boo's camera on the iPad Pro
  (`?kiosk=pose`), a mirror of the group with Boo's words, one photo a
  moment into each group's last pose; `posePhoto` takes it only from the
  pose camera's own presence row (or the admin), only for the group Boo is
  judging, and the end credits show each group's photo. A practice camera
  on the Game test tab (`?kiosk=pose&practice=1`, nothing sent). The
  Devices page lists it.
- The test plan's Not yet checks (card 479, by a subagent, merged): every
  Not yet check has a test, the tests carry their IDs, F02 and G05 (the
  host seats in the fake night, seat fairness), and twelve more checks in
  `npm run checks` (20,042 of 20,042 on 1,000 cases). Two left as to-dos,
  each a question on the board: dialSpill (G24) and senseClue (G09). F26's
  half second over the real Wi-Fi is the tech run's to measure.
- Fixed on the way: Act 4's last Next now passes the command's time to
  `finishRounds`; two fake-night tests wanted a bare Case line that a random
  deal can follow with the trace warning (one failure in a dozen runs).
- The board: migration '2026-10-25-item4' marks cards 196, 308, 324, 343,
  450 and 479 done, adds Jon's 480 (Open the case, the morning after), 481
  (Boo's camera: the iPad Pro to the Entryway) and 482 (Try Boo's camera on
  the Game test tab), and files the questions dialSpill and senseClue. For
  the lighting and audio session the same day (its cues/ work is on its own
  branch): cards 423 and 462 done (the string lights run from the brain
  through three Apple Shortcuts and Home scenes, 1 to 2 seconds behind; no
  Nanoleaf pairing), and the question stringsLead (Salem's intro says to
  watch the lights; default: the phones lead, nothing built yet).
- Docs: on-the-night (the new screens, the device move, playing a rehearsal
  again, After the party), room-screens, the test plan, CLAUDE.md (two new
  readers of the sealed docs, the archive, replay, the iPad Pro's Act 4
  job, the two new questions), `play/public/motives/README.md`.
- `npm test`: every suite passes (626 tests: 622 pass, 2 skipped for the
  rules emulator, 2 to-do). `npm run checks`: all clear.

**What is left**
- Deploy and push, on Jon's yes (not during the practice run). Then Jon
  opens the workshop once to load the board migration.
- The worst-dial proof (card 478) when Claude chat's patch arrives.
- Start Here's status snapshot and the Canon's open-decision list (the two
  new questions): Claude Docs, left to the session that started this one.
- Known and not changed: `atTheParty` (and so the memory match, Boo's done,
  the drawing's clock and guess) trusts any signed-in client's own presence
  row; the pose camera's gate narrows it but the same row can be written by
  hand. Fine for a house party; a host-registered kiosk would close it.

**Decisions taken:** none by Jon. Built as defaults: the morning after's
gate (party day, a reveal named on it, OPEN typed), Clear keeping a copy
and leaving the nineteen retired sets alone, the guests' photos leaving the
public docs once archived, replays needing the same people joining in the
same order for the same characters, Salem's colours and Boo's poses keeping
their own timing. Three questions filed for Jon: dialSpill, senseClue and
stringsLead.

## 24 Oct 2026, evening · Claude Code (the hardware, the Game test tab)

**What changed**
- The house hardware, on the brain (on Wi-Fi: its Ethernet adapter shows no
  link). The Hue bridge is paired; the hall bulb is "Master bedroom" in Hue
  ("Jonny's light" in Home) and went red and green through the relay's own
  code. Both study walls are paired and take the game's light writes. The
  Elements report each hexagon as six corner lights and the Lines each bar as
  two halves: `station/lib/nanoleaf.js` `groupLayout` gathers them into 10
  hexagons and 12 bars (fixtures of both real layouts in `station/test`).
  Taps arrive under ids the layout never lists, so they are taught once per
  Mac (`npm run teach-touch`, or Teach the taps on the Game test tab) into
  `station/touch-map.json`. The string lights are parked: holding their button
  resets their Wi-Fi, and their API is not paired. The HomePods are not
  grouped yet. The chime-phone stand-in tone is made, so all ten exist.
- The Study test tab (4134f53, deployed with e91b9db), then the Game test tab:
  every Act 4 and Act 6 game and the Parlour Games in night order, each with
  Try it links by device, steps, It works, and a note box that files a
  Timeline card for Claude Code. New: the `gameTest` callable
  (`functions/lib/gametest.js`): a Get Off My Lawn! practice
  (`?practice=salem`), a Boo's Catwalk practice (`?kiosk=boo&practice=1` and
  `?practice=boo`), and test nights that are always rehearsals, refused while
  the party box is ticked or a party night or dry run is live; the Parlour
  Games sets on a phone (`?preview=questions&set=...`); `scripts/board.mjs`
  (`npm --prefix scripts run board`) so a session can read its cards.
- The workshop, for a non-coder: Home shows the next three and the open
  questions, the second to-do board is gone, Terminal commands moved under For
  Claude Code, old words fixed (the Parlour, Orangerie, Crooknog, ten
  minutes, no freeze), done cards closed, missing hardware cards added, For
  Jenna rewritten, the Assets page hidden.
- Applied `docs/handoff-2026-10-24.md` (Claude chat, below): the cast on the
  board and in the docs, the recording dates, the six stale August answers
  marked replaced, the practice run card.
- New Claude Doc: Where we are, 24 October
  (https://claude.ai/artifact/8LkaQjCZd6juQq58jcW3RZ). The Canon: granoliaIntro
  added to Genuinely open; a Closed on 24 October paragraph.

**What is left**
- Done late on 24 Oct, on Jon's yes here: deployed 3d151c1 from a clean
  copy (all 540 tests passed; 22 functions, gameTest new) and pushed main to
  GitHub. Jon opens the workshop once to load the board migrations.
- The study on the M1 Air with the Stream Deck, and teaching the taps there.
- Handoff item 4 (as soon as possible): the Home rows, the motive card
  slot, the morning-after reveal, replay by seed, the pose photo, the test
  plan's Not yet checks. The worst-dial proof arrives from Claude chat as a
  patch (card 478).

**Decisions taken:** none by Claude Code. Jon's answers tonight are in the
Claude chat entry below.

## 24 Oct 2026, evening · Claude chat (the news team, the practice run)

**What changed:** Jon cast the news team (Susan plays Ava Waves, Jon plays Mic
Cameron), set up the practice run on Sunday 25 October (the whole night, every
screen on), and said yes to deploying and pushing tonight. He answered
bulletin2Voice (Susan reads bulletin 2 as Ava Waves), bulletin2Known
(accepted) and worstDial (build the proof now, before the second tech run).
The Canon, Where we are and the W-O-O-F News script were updated in the chat.
Handoff: `docs/handoff-2026-10-24.md`, applied the same evening.

## 24 Oct 2026 · Claude Code

**What changed**
- Applied `docs/handoff-2026-10-23.md` in full, sections 1 to 16 (the final
  bag items, section 15, and the game names, section 16, included). Built
  (live after the next deploy):
  - The bags: Jon's 24 final items are the Things in the bags list; the 108
    September items are retired (soft-deleted, kept). Fourteen clue words,
    four or five things a bag, one food, a touch item, pairs written out on
    Jenna's list. The packer packs to the new rules; on the seed list every
    bag reaches 3 clue words. Sir Irwin's prompts are sixteen.
  - The bag clue engine: each cat's bag clue (Act 2 about the Murderer's bag,
    Act 4 about the Ghost's), at the cat's rung, Salem backwards at 1 to 3;
    a word that sits in two or three bags in play. Rehearsals show stand-ins
    in square brackets.
  - Act 2: all four cats give every guest a motive hint and a bag clue; each
    guest has two wrong families to rule out, so two always stand. Not yet,
    the queue, the peek screen, Supper's ready and the automatic supper.
  - Act 4: Start Act 4, the two-minute warning, the title card, groups with
    Locked in, ten-minute rounds on the clock, four game rooms with their
    rewards and the Parlour between them, Parlour Games waiting on the phone.
    In Duplicate in three rounds (and on its own, ?kiosk=memory&play=1), Get
    Off My Lawn! on the phones, Boo's Catwalk on ?kiosk=boo.
  - The game names on the phones, each room's screen and the drawing's first
    slide, with their hooks (`seed/game-names.json`).
  - Bulletin 1 and the closing bulletin play as video on the Parlour TV once
    the files are in play/public/video and Jon ticks The bulletins are videos
    on the Game night page; until then the recordings play with the words.
  - The permissions screen at sign-in, and Allow again.
  - The brain (merged from its own branch): chime-phone, the tenth sound;
    the three playlists by act with ducking; the four Hue scenes; the string
    lights mirroring Salem's colours. Scenes and music buttons on the Host tab.
  - `npm run checks` (1,000 stand-in cases, a fake night, the leak checks,
    counts only), the workshop's Health page, and Run the checks on Jenna's
    page (the real packing, leans and pictures; IDs and pass or fail only).
  - The Devices page follows the 23 Oct device table. The study's cap is ten
    minutes.
- The board: thirteen built cards marked done, the chime-phone sound card,
  sixteen new jobs (Jon, Jon and Susan, Claude chat), seven replaced cards
  retired, six notes, six decisions answered with the handoff's defaults,
  two decisions refiled.
- CLAUDE.md and the docs (on-the-night, room-screens, solving-the-case,
  parlour-games, test-plan, sensory-bags, steward-view, study-light-game and
  others) say the same, checked claim by claim against the code by a
  workflow (27 corrections). "Applied 24 Oct 2026" at the top of the handoff.
  The Canon's build paragraph and Start Here's snapshot are dated 24 Oct.
- Found on the way and fixed: the Host tab's study clock still counted
  fifteen minutes, and Boo's wall had no dot on the Host tab.

- Later the same day: deployed (the Study test session's deploy of e91b9db;
  a repeat of mine also deleted the unused `memoryCleared` function). The
  workshop applied the 23 and 24 Oct board updates once. Jon packed the bags
  on the final items: 10 bags, 43 items, every rule passed, all 10 bags with
  3 or more clue words (counts only).

**What is left**
- Jon: the practice game; Jenna runs the checks on their page; the cats'
  leans and the drawing pictures by 31 Oct. Then the recordings.
- Claude chat: mark the project copy of the handoff Applied; two rules deck
  slides. Claude Code: the pose photo (nice to have), replay by seed, the
  Home count rows, the motive card pictures.
- Not tried on real hardware: the string lights, the projector, the Hue
  scenes, the music, Salem's shake on real phones.
- "docs/Sensory Bag Items.docx" (Jon's) is untracked and was not committed.

**Decisions taken**
- With the handoff's defaults (Jon may change any): newsVideo video, bagsAct4
  the bags stay, tutorial8 kept buried, stewardPictures no, partnerAwards cut,
  dialMapping fixed as built.

## 23 Oct 2026, afternoon · Claude Code

**What changed**
- Jon answered secretLines: retire them. Then he chose to take the Act 2 safe
  out, since it had nothing left to pay out (decision act2Safe).
- Built (live after the next deploy):
  - The cats say only their open hint lines. The Act 2 hint cat's card and
    the Act 4 cat station's card are the hint line alone; the other three
    Act 2 cats still say hello. No affection roll, no brush-off, no Salem
    flip, no Granolia wrong blank.
  - Act 2 is orient, news, the four cat visits, check-in. No safe, numbers,
    scrap of paper, document or stationery. The `solve` function is gone:
    the next deploy asks to delete it, and Jon types y.
  - No per-motive secret sets: the deal draws the motive itself, and nothing
    reads sealed/{code} or sealed/manifest. scripts/generate-sealed.mjs and
    validate-sealed.mjs are deleted. The 19 sets made on 20 Oct stay in
    Firestore, unused. Spill the Beans reads nothing sealed (a test proves it).
  - Jenna's page has two tabs, the packing list and the leans. The workshop's
    Stationery page and Home's secrets row are gone. The blanks, the
    stationery designs and the brush-offs are retired lists; openers and
    closers matter only for Sir Irwin's Act 5 screen.
  - The finale's "Fastest safe" stat is gone. fake-night --real-secrets is a
    party-night dry run on the real leans, packing and drawing pictures.
- The board: secretLines answered, act2Safe recorded, seven secret-set cards
  closed, three new cards (the leans and packing lists, the Home count rows,
  the deploy before the practice game).
- The Canon, Start Here, the Steward Handbook, the intro script, CLAUDE.md
  and the docs say the same. The rules deck's affection slide is reworded in
  the local copy only (publishing the deck is still blocked).
- A doc for Claude chat with everything left, one task at a time:
  "Murderwin — What's Left, for Claude chat"
  (https://claude.ai/artifact/SweWtP11QJcx1R12BhYFdT).

**What is left**
- Everything is on the board: 51 jobs for Jon, 10 for Jon and Susan, 2 for
  Susan, 4 for Jenna, 7 for Claude Code, 2 for Claude chat, and 15 open
  decisions. Next: deploy, then the weekend practice game.
- Left on purpose: the firestore.rules read rule for validation_reports is
  unused now (removing it needs Jon's OK; it is harmless). Reference pictures
  from the old Stationery page are still in Storage under stationery/.
  createNight still reads sealed/bags on every night, for the bag count only.
- An untracked "docs/build-plan 2.md" (a Finder copy) is not from this work
  and was not committed.

**Decisions taken**
- Jon: secretLines retired; act2Safe, take the safe out.

## 23 Oct 2026 · Claude Code

**What changed**
- Jon deployed everything built on 22 Oct.
- An audit of every doc, the Claude Docs and the workshop board against the
  code, then fixes the same day to the docs, the Claude Docs, the board and
  the code.
- Built in code (live after the next deploy):
  - Act 4 phones: the group card, the study card, the cat card (never
    Granolia), and "Free time" in place of Check-in, with one of the five tips.
  - Sir Irwin's Act 5 screen shows only his opener, the countdown line, the
    motive cards and his closer.
  - The closing bulletin: each name card waits for its lead-in line; the next
    name cuts off the recording that is playing; the brain's window prints
    only counts, and the recordings reach it under codes that do not name the
    family.
  - The Relay Drawing: Irwin's slides stay up long enough to read, slide 3
    shows the practice smiley's B1 square, the "Pawsome!" door slide shows on
    the TV, and the picture bank refuses trace and motive objects and a star.
  - Granolia's lines read cleanly. A big red REHEARSAL band on every phone and
    room screen on a rehearsal night. The end-credit awards show only in the
    credits.
  - The Host tab: a dot for the memory match iPad, and the Act 2 line "Cat
    visits: N of M guests have seen all four". A True Friend sees Salem's
    honour text on the Cats tab. The memory match cards have file-folder backs.
    The preview samples and the Host tab's beat texts match the new Act 2 and
    Act 6.
  - Sir Irwin's line over the trace reveal reads its words from the workshop,
    as the other hosts' lines do. The Victim's epilogue starts two seconds
    after the closing bulletin's last part, not over it.
  - Safety: the "murderwin" preview server now serves only `hosting/`, on this
    Mac only, and the phone dev server refuses the key files and `chats/`.
- Start Here rewritten as the map: right now, where things live, how we work,
  a dated status snapshot, the dates, and the freeze rules.
- The project system (CLAUDE.md, HOW WE WORK): decisions on the Canon, jobs on
  the workshop Timeline, the live status on "Where we are", Start Here as the
  map, dated handoffs from Claude chats, this log, and the end-of-session
  routine.

**What is left**
- The open decisions, each a card on the board (16): secretLines, newsVideo,
  stewardPictures, partnerAwards, diningName, rulesDeckScreen, tidyFolders,
  bagsAct4, handOn, tutorial8, swapMotive, grossnola, and four the audit
  found: ballotMajority (the room's majority pick in Act 7), bulletin2Voice
  and bulletin2Known (who records bulletin 2), dialMapping (the dial's
  direction is fixed in code, the rules say blind per night).
- The rules deck: twelve slides are edited but not published. Publishing was
  blocked by a permission check; Jon allows it or publishes them.
- Not built yet (cards on the board): replay a night by its seed; Home's
  count-only rows for whether the secrets, leans, packing list and drawing
  pictures exist; the motive card pictures slot; video playback (only if
  newsVideo says video); a Drawing pictures tab for Jenna (only if
  stewardPictures says yes); removing the unused echo fragments, study clue
  and Irwin lines from the generator and Jenna's page (after secretLines).
- Everything else is on the board. Next: the weekend practice game, 24-25 Oct.

**Decisions taken**
- The project system above.
- Settled by default (Jon may change either): the Act 4 cat station never
  sends a group to Granolia, because her room, the Study, holds the light
  puzzle; the deduction round comes after the door opens.

## 22 Oct 2026, evening · Claude Code

**What changed**
- Applied and built the 22 Oct handoff (`docs/handoff-2026-10-22.md`). Fifteen
  commits, c8b76a4 to f705587:
  - c8b76a4: the docs and the Canon to the handoff.
  - 568cc23, 0bf5f46, f4ebe71: the solving-the-case side copy merged into main.
  - 7fe0491: Irwin's five-card countdown; bulletin 1 crosses off one family;
    every guest visits all four cats in Act 2, with one real hint.
  - 897fb30, a103d67: Salem starts at 3, the Parlour Games stop him at 4,
    Salem petted on the Host tab; Act 6 opens on its two Parlour Games.
  - 82be5d5: the board files the handoff's jobs by moment.
  - 551e43e: W-O-O-F News. 37732ef: the Cat Hint Lines. 8051d40: the hosts'
    lines. 3b319a4: the end credits. ca7804c: the Relay Drawing.
  - 5d73852, f705587: the board marks the handoff's Claude cards done and adds
    two jobs for Jon (the drawing pictures, a photo of Sydney).

**Left out on purpose**
- The Partner in Crime and Ghost Whisperer awards (now decision partnerAwards).
- A drawing pictures tab on Jenna's page (now decision stewardPictures).

**What is left**
- Rehearsal mode for the weekend practice game (handoff section 12), the
  recordings, the art, and the blind runs the week before. All on the board.

**Decisions taken**
- None new in Claude Code. The handoff's decisions were taken by Jon in a
  Claude chat (below).

## 22 Oct 2026, daytime · three Claude Code sessions and a Claude chat

**What changed**
- Claude Code, the Parlour Games rebuild: twelve timed pop-ups a night from a
  seeded plan, one set for every phone, secretly listening cats with a sealed
  lean table on Jenna's page, the overlay on the phone. Commits 51d7061 and
  bc69a78. Earlier that morning c0b62ec committed the 21 Oct docs
  (`parlour-games.md`, `solving-the-case.md`, `test-plan.md`).
- Claude Code, how the case gets solved, built in a side copy (worktree
  epic-lehmann-fdcd31): motive families, the Act 2 room waves, the study pays
  the Ghost's trace, the memory match, Irwin's options. Committed as 568cc23
  and merged into main as 0bf5f46 that evening.
- Claude Code, the workshop Timeline: the night in order, every job filed by
  its moment (c7fcd30). Also that day: the workshop's Devices page (9070f29).
- Claude chat: wrote the 22 Oct handoff, the W-O-O-F News Recording Script,
  the Cat Hint Lines and The Relay Drawing · How to Play page.

**What was left**
- Applying the handoff. Done that evening (above).

**Decisions taken (Jon)**
- The twelve Parlour Games are one budget for the night: five, five and two;
  a game an act runs out of time for carries into the next act.
- The cats' leans are made blind by a script; Jenna may change any lean.
- The trace ladder: 1 black and white and hazy, 2 colour and less hazy, 3 two
  similar options, 4 the picture, 5 the picture and its name.
- Everything in the handoff: no hidden events in any act, the new clue path,
  the cat ladders, W-O-O-F News, the hosts, the Relay Drawing, the end credits.
