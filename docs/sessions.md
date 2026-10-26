# Sessions

A short log of every working session on Murderwin, newest first. One entry
per session: the date, the tool (Claude Code or Claude chat), what changed,
what is left, and the decisions taken.

Claude Code adds an entry at the end of every session (`CLAUDE.md`, HOW WE
WORK). A Claude chat's session gets its entry when its handoff is applied.
Jobs are not tracked here: they live on the workshop Timeline. Decisions live
on the Canon.

## 26 Oct 2026, evening · Claude Code (Jon's Game test notes)

**What changed** (on `main`; not deployed, not pushed)
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

**What is left**
- Boo's Catwalk (note 10002) stays open: Jon sends the shape he wants for the wall and the catwalk.
- Jon tries the three fixed games again on the Game test tab after the next deploy.

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
