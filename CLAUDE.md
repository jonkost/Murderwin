# CLAUDE.md — A Murderwin at Sirwin Manor

Rules for working in this repo. These are load-bearing. Read fully before any task.
Updated 23 October 2026. Party: Sunday 15 November 2026. Freeze: Saturday 7 November 2026.

> **22 Oct 2026 handoff (`docs/handoff-2026-10-22.md`): applied and built on 22 Oct** (commits c8b76a4 to f705587; deployed 23 Oct). It still wins where an older doc disagrees. Left out on purpose, each now an open decision: the Partner in Crime and Ghost Whisperer awards (partnerAwards), and a tab for the drawing pictures on Jenna's page (stewardPictures). Decided by Jon on 23 Oct: secretLines (retired: the cats say only their open hint lines) and act2Safe (the Act 2 safe is taken out). What is left is on the workshop's Timeline. Open decisions (15 on 23 Oct), each a card on the board and Jon's call only: newsVideo, stewardPictures, partnerAwards, diningName, rulesDeckScreen, tidyFolders, bagsAct4, handOn, tutorial8, swapMotive, grossnola, ballotMajority, bulletin2Voice, bulletin2Known, dialMapping. Every session follows HOW WE WORK below.

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
- How the two hidden roles' Parlour Game points map to the clarity dial
  (decided blind per night; every phone gets the same set since 21 Oct). There
  are no hidden events in any act (closed 22 Oct). The dial has no slider on any phone
  (Jon, 16 Oct 2026): it is revealed in the Act 7 graph. The hidden roles'
  answers move their cat sliders like everyone else's, so no phone is a tell.
- The bag packing: which numbered bag holds which items (`sealed/bags`)
- The Relay Drawing picture bank (`sealed/relay_pictures`, simple thick-line
  art, made blind by `scripts/generate-relay-pictures.mjs`; never in the repo
  or Jon's terminal)
- Every per-night pick from an open bank: which family is real, which bulletin
  line plays, which cat gives each player's real Act 2 hint and what it rules out
- Each night's private records (`nights/{id}/private/*`), for example the
  drawing's pictures and answers, the reveal, the trace, the bulletin's level,
  the dial clues

### The Steward exception (decided by Jon, 28 Sep 2026)
The Steward is Jenna (they/them), a REMOTE NON-PLAYER who never visits the
house. Their job is editing content. They may see and edit EVERYTHING, sealed
content included, because Jon cannot.

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
  runs the real checks once the Health page exists, and reports to Jon only
  "done" or "needs more", never content.
- Bags: Jon and Susan supply the item pool as safe content (workshop area
  `bag_items`). A blind packing script (`scripts/pack-bags.mjs`, built 18 Oct
  2026) assigns items to numbered bags under the bag rules and writes
  `sealed/bags`, printing counts only. The bags station reads it on the party
  night; every night reads only its bag count (`createNight`), never an item.
  Only Jenna's Steward view shows the packing list, and Jenna packs to it.
  Claude Code never prints the packing. Jenna also reads rules and bios cold,
  and looks over the cats' leans (build step 13). Brief: never
  volunteer anything, never confirm a guess. Full role: the Steward Handbook
  (WHERE THINGS LIVE) and `chats/docs/sirwin-manor-the-steward.md`.

Jenna's page, built 17 to 19 Oct 2026, the leans tab 22 Oct, the secrets tab
removed 23 Oct (`functions/lib/steward.js`, the workshop's Steward page,
`docs/steward-view.md`). Two tabs: the packing list (read only) and the cats'
leans (ops `whoami`, `bags`, `leans`, `lean`). These rules still hold:
- It reads `sealed/bags` and reads and edits `sealed/parlour_leans`, by
  verified Google email only. It never loads for Jon's account. Changing the
  security rules needs Jon's explicit approval.
- Regenerating sealed content must never silently overwrite Jenna's edits.
- Claude Code still never prints, logs or files sealed content. The Steward
  view is built and debugged blind, exactly like the blind scripts.
- Not on Jenna's page: the Relay Drawing pictures (left out 22 Oct; open decision
  stewardPictures). Until then nobody reads them; they pass only the
  picture script's own checks.

### Enforcement — infrastructure, not discipline
1. Sealed content lives ONLY in Firestore: `sealed/*`, `cases/*`, and each
   night's `nights/{id}/private/*`. The security rules deny every client read
   of all three. It is NEVER committed to this repo — not as JSON, not in seeds,
   not in fixtures, not in test snapshots. `.gitignore` guards known paths; you
   guard everything else.
2. Only Cloud Functions (Admin SDK) read it: to assemble player-facing payloads
   at game time, and for the Steward's view (see above).
3. Sealed content is made only by the blind scripts: `scripts/generate-leans.mjs`
   and `generate-relay-pictures.mjs` (they call the Anthropic API) and
   `pack-bags.mjs`. Each writes straight to Firestore. Its stdout prints
   COUNTS AND PASS/FAIL ONLY. It never prints, logs, or files content. The
   case itself is dealt at the Act 1 blackout by `functions/lib/case.js`
   (through `deal.buildCaseForNight`, whose log line carries only the night id
   and the rehearsal flag). (`generate-sealed.mjs` and `validate-sealed.mjs`,
   which made and checked the per-motive sets, were deleted 23 Oct.)
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
DECISION PENDING (card tutorial8 on the board): promote its example clue set
to the rulebook tutorial. Since 23 Oct no motive has in-game kernels
(secretLines retired): motive 8 is dealt like the others, with the same open
hint lines.

## HOW WE WORK (23 Oct 2026)

Rules for every Claude Code session. Jon should never have to remember where a
job or a decision lives.

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
| Live status | Workshop "Where we are", https://murderwin-at-sirwin-manor.web.app/workshop/#/status |
| Claude chat handoffs | `docs/handoff-YYYY-MM-DD.md`, plus the dated Claude Doc |
| Session log | `docs/sessions.md` |
| W-O-O-F News lines | Claude Doc https://claude.ai/artifact/GJAR2uwXZ356opX6xNvMNN; `seed/woof-news.json` |
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
  except the bags: six ordinary objects per numbered bag, the one deliberate
  physical exception (`chats/docs/sirwin-manor-bag-system.md`).
  14 playable characters with professions, genders and traces, assigned at random
  at runtime and never changed all night.
- Stack: React + Vite, Firebase Hosting, Firestore, Cloud Functions, anonymous
  session auth via QR. Phone-first. Single page, one route, no client-side router.
- Data format for clues, cases and seeds: JSON. Decided 25 Sep. Never YAML.
- 7 acts, 2 to 2.5 hours (names since 13 Oct, `seed/night.json`):
  1 The Invitation (together, 4:00pm; role rules stated in the preamble;
    blackout at the end)
  2 Lights Out (solo, ~5:30pm; the tutorial; everything for your ears only;
    every guest visits all four cats, one gives a real hint; beats orient,
    news, cat, checkin; no safe since 23 Oct, decision act2Safe)
  3 Supper Is Served (orangery)
  4 Behind Closed Doors (pairs/trios; info shared only inside your group; the
    study is the timekeeper with a 15-minute cap). The cat station sends a
    group to Boo, Salem or Zimothy, never Granolia: her room, the Study, holds
    the light puzzle (settled by default 23 Oct; Jon may change it)
  5 One Candle (dessert, roaming; Sir Irwin speaks)
  6 The Final Hour (living room; two Parlour Games, the Relay Drawing, the door
    opens, then a deduction round where each player publicly commits to one
    elimination; built with the deduction round after the door)
  7 Unmasked (~8:00pm; 2 minutes to enter picks; majority decides; metrics plus a
    visual graph of the clarity dial)
  Reveal order: Murderer → Motive → Victim.
- Three roles, symmetric, each holds one third: Detective, Murderer, Ghost.
  The Murderer knows they did it, not the motive. The Ghost knows they are dead,
  not who did it. Roles are assigned during the Act 1 blackout; every phone buzzes.
  Every win condition is the same: name Murderer + Motive + Victim.
- 19 motives, universal (any motive can attach to any character pair), final as of
  27 Aug. Visible to all players from Act 1 as a cross-off menu. `seed/motives.json`.
  Jon may still swap one — his call, never yours (card swapMotive).
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
  Salem Crookshank, the groundskeeper — backwards at 1–3, coin flip at 4,
    straight at 5; everyone starts at 3, Parlour Games cap him at 4, and only
    petting the real Salem (Jon's host button; anyone but Jon and Susan)
    unlocks 5, shown as True Friend of the Groundskeeper on the Cats tab. When
    backwards he points AT a wrong answer, so he never rules out the truth.
    (His separate 60 percent secret-line flip went with the secret lines,
    23 Oct: the ladder is all there is.)
  Trust ladder, stated at the top of the night: if Irwin and anyone disagree,
  Irwin is right. No cat ever speaks aloud: all dialogue is text. Audio is
  atmosphere, plus the W-O-O-F News recordings, whose words always show on a
  screen too (sound with captions today; video for bulletin 1 and the closing
  bulletin is open decision newsVideo).
- Affection to each cat is rolled at character creation (Salem always starts
  at 3, Irwin always maxed).
  Since 23 Oct there is no pass or fail roll and no brush-off: a cat's
  affection sets the rung of its ladder (above), and the cat gives that
  rung's hint line. The three cats who are not a guest's Act 2 hint cat give
  one greeting line.
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
  same set moves the clarity dial instead, and how their points map to the
  dial is decided blind per night (sealed),
  so Jon's numbers never tell him which way the night moved. Their cat
  sliders still move for real, by coin flip, with a Detective's odds and
  sizes. No phone ever shows a number.
- No hidden events in any act (closed 22 Oct 2026, never re-raise). The
  Murderer's and Ghost's only "events" are the Parlour Games: same questions as
  everyone, and their answers move the clarity dial. The dial changes
  information CLARITY, never content — "delay, never destroy." It stacks across
  the whole night and never resets; strong-vs-strong lands neutral and neither
  player learns they cancelled out. The validator must assume the worst dial
  and still prove every player can reach two of three (not built yet: today
  only the motive is proven, at dial 3, check G32).
- The clue path (22 Oct, `docs/solving-the-case.md`): W-O-O-F News bulletin 1
  (Act 2) crosses off one family; one cat per player gives a real Act 2 hint;
  bulletin 2 (Act 3) hints at the real family; Act 4 cats and memory match;
  Irwin's countdown (Act 5, five cards at dial 1 down to one at dial 5);
  Study trace (Ghost) and trace reveal (Murderer); closing bulletin and
  credits in Act 7.
- Safeguards: Spill the Beans (the outward reset): the button works through
  Act 5, never after, but the engine only changes the story while no clue has
  reached anyone (no news, cat hint, study clue or memory match). In
  practice that is the start of Act 2, before the news flash. It says nothing
  either way. Making it work later in the night is new work: ask Jon first. The
  exposure safeguard is a silent tap with no call-out until Act 7, if ever.
- Picked per night: which of the four cats gives each guest the real Act 2 hint, which
  wrong family bulletin 1 crosses off, and the Parlour Game times. The Relay
  Drawing calls its players at random. (The Act 2 safe, the one puzzle kind
  built for it, was taken out on 23 Oct: decision act2Safe.)

## CLIENT RULES (hard rules for every player surface)

- All timing comes from server timestamps. No phone ever counts down on its own.
  A locked phone, a dropped connection and a late arrival all recover the same
  way: reconnect, rehydrate to current server state, silently.
- There is NO waiting-for-players screen anywhere in the game.
- Windows never close early. No choice → a default fires, leaning random, so a
  no-show is never a recognisable pattern.
- All phones get an event window at once. Read-time parity: innocent content
  matches the choice prompt in length. Every innocent beat needs a required
  interaction before it can be dismissed.
- The idle screen is a real state, not an error view, and is indistinguishable
  from a phone that just finished choosing an event.
- Blackout messages hold every phone 15 s minimum, then a hide button; screens
  render near-black.
- No service worker, no notification permission, no install prompt.
- The cue relay performs no logic and stays blind. Sound files are named after
  the cue id. For W-O-O-F News the recordings reach it under codes that do not
  name the family, and the brain's window prints only counts, never a name or
  a path. Pad 1 s of silence for AirPlay spin-up. Always build a visual
  fallback: every recording's words also show on a screen.
- An 11-year-old and a 70-year-old must be able to use every surface, in dim light.

## HARDWARE (decided 25 Sep — no Raspberry Pi anywhere; updated 22 Oct)

The game runs on Firebase Hosting. No machine in the house serves it. Device
setup, step by step: the workshop's Devices page.
- M3 15" MacBook Air — "the brain". Ethernet, sleep off. Runs the cue relay
  (`cues/`): turns the Hue bulb outside the bedroom red or green and plays
  files from `media/` through its own sound output (the AirPlay group, which
  must include the Orangerie HomePod). Also a stand-in for the host phone
  (`functions/host.mjs`).
- Living room MacBook Pro on the TV (`?kiosk=living`): news, Irwin, the
  drawing and the room's guesses, the ballot, the reveal.
- The second MacBook Pro: no job since 22 Oct (it was the bedroom screen);
  keep it charged as a stand-in for the living room screen.
- M1 MacBook Air — the study station (`?kiosk=study`, `station/`): Stream Deck
  over USB, Nanoleaf over wifi (Open API, plain HTTP, port 16021), the study's
  on-screen information.
- iPad Pro M2 — supper captions in the orangery (`?kiosk=ipad`), the memory
  match in the Library in Act 4 (`?kiosk=memory`), the bedroom screen from
  dessert (`?kiosk=bedroom`). Older family iPad — the spare phone.
- The study puzzle: Simon says on the white Nanoleaf Elements — three escalating
  patterns per round, reproduced by touching the panels (touch gestures stay ON
  for this wall; a telescoping pointer covers reach). Clearing a round lights a
  colour and a count, entered on the 15-key Stream Deck: columns 1–2 are six
  colours, columns 3–4 are numbers 1–6, column 5 is blank / undo / submit.
  Nothing auto-submits. Three rounds → three colour-number pairs → the code.
  Granolia hints. 15-minute cap, then the group rotates regardless.

## THE WORKSHOP (what we build first)

`/workshop` — Jon's private dashboard for building safe content part by part.
Full spec in `docs/workshop-spec.md`. Requirements learned the hard way:
- List-based CRUD, NOT a random task dealer. Jon picks a list, sees all of it,
  adds/edits/deletes inline, works one list until he chooses to switch.
- A dashboard home: progress per content area and "what's next." The Timeline
  page is the task board (every job filed by moment); "Where we are" is the
  live status (HOW WE WORK).
- Autosave per keystroke-debounce to Firestore. Every write also appends to a
  `workshop_history` audit collection. NOTHING is ever hard-deleted — deletes
  are soft flags. He lost work once to a client-side toy; never again.
- A save failure is a visible banner, never silent. Typing continues when
  Firestore is unreachable. Cursor lands in the input on load; Enter commits and
  opens a fresh line; click any line to edit in place.
- Auth: Firebase Auth sign-in, UID allowlisted in security rules as admin.

## BUILD ORDER (from Start Here; status 23 Oct 2026)

1. Repo + this file: done.
2. Clue format locked, JSON: done.
3. One character onto a phone via QR: done.
4. Seed-based case generator: done, as the case deal (`functions/lib/case.js`
   at the blackout; the motive drawn with crypto randomness; replay by seed is
   a card on the board). Since 23 Oct no secrets generator feeds it.
5. Eight fake test players: done (`npm run fake-night`, PASS 23 Oct).
6. Split dev and live: replaced 17 Oct. Rehearsals are nights with the party
   box unticked, or the emulator; no second project.
7. First full dry run: not done. The leans, the packing and the drawing
   pictures first (their blind scripts), then
   `npm run fake-night -- --real-secrets` (a party-night dry run on them),
   then the full tech run: every machine on at once, Act 1 to Act 7, twice.
8. Host Mac as server: changed. The game is on Firebase; the brain plays the
   sounds and the hall light (`cues/`). Built; setup is on the board.
9. Media bank: not done. Stand-in tones until the recordings exist.
10. Screens as kiosks: built (`?kiosk=living`, `bedroom`, `study`, `ipad`,
    `memory`); setup is on the board.
11. Nanoleaf layer: built (`station/`), not yet run on the real walls.
12. Full play-through review: not done. The weekend practice game (24-25 Oct,
    phones only) is the first walk-through.
13. Canary (changed 23 Oct): someone who is not coming plays a rehearsal
    night cold, and Jenna checks the leans on the Steward page. Not done.
14. Freeze: Saturday 7 November (the Freeze button on the Game night page).

## WORKING STYLE

- Small commits, one concern each. Plain commit messages.
- When a design question is answered above or on the Canon page, follow it. When
  it is genuinely new, ask Jon — ONE question at a time, options included, short.
  He works in short bursts and is often tired: never hand him a wall of text or
  a batch of decisions. A question that waits on him becomes a decision card on
  the board.
- The party date is fixed. After the freeze on 7 Nov, anything not working is cut,
  not fixed. Safe to cut: the Nanoleaf layer (the study runs on its screen), the
  Hue bulb (the TV announces the door), the iPad (another screen takes its
  jobs, since any browser runs them; failing that, the TV shows the trace and a
  group that missed the memory match gets its cross-off at dessert). Never cut:
  the case deal (`functions/lib/case.js`), the reveal order (Murderer, Motive,
  Victim) and the clue path (both bulletins, the cat hints, Irwin's
  countdown, the study trace and the trace reveal).
  When in doubt, choose the simpler build.
