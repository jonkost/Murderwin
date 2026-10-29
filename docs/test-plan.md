# Sirwin Manor — Test Plan for Claude Code

Written 19 October 2026, updated 22 October (from `docs/handoff-2026-10-22.md`), 23 October (where every check stands; then again for Jon's two decisions that day: the cats' secret lines retired, the Act 2 safe taken out) 24 October (the 23 October handoff's checks, its section 11; `npm run checks`, the Health page and Jenna's checks built; that evening Jon answered worstDial: build the worst-dial proof now) 25 October (card 479: the checks that were Not yet, written; every test that had no ID renamed; the host seats in the fake night), 28 October (Miss Boo LaRue's Arcade, a page of its own to try, not on the night yet: G54 to G56 and L09) and 29 October (the arcade's review: G54, G55, G56 and L09 check more; that day too, Jon's two just-for-fun winners in Act 4: G57 and G58, and the pets, the black cat and the strike words in the arcade's games: G54 and G56). Put this file at `docs/test-plan.md` in the repo.
Canon wins any disagreement. If something here conflicts with Canon, stop and ask Jon.

**Every check is listed here** (24 Oct), including the ones first written in `docs/parlour-games.md` (G25 to G31, F19, L05), `docs/solving-the-case.md` (G32 to G38, F20, F21) and the 23 October handoff (G39 to G52, F22 to F28, L06 to L08), since 28 October Miss Boo LaRue's Arcade (G54 to G56 and L09, `docs/boo-arcade.md`), and since 29 October the two just-for-fun winners in Act 4 (G57 and G58, `docs/room-screens.md`). Those docs keep the longer wording. Where each check stands today is in the table at the end, "Where every check stands".

**Three IDs changed meaning on 24 October.** The handoff reused G39, G40 and G41 for the bag checks, and the handoff wins. The old G39 (one real Act 2 hint each) is retired: every cat now gives a hint (G44). The old G40 (every bulletin 2 line points at the real family) is now **G53**. The old G41 (every cat line only rules out wrong answers) was already G18b, and lives on under that ID.

---

## Why this exists

Jon is the host, the builder, **and a player**. He can never see the real answers. That means he can't check the game by reading it. He has to trust it by **running checks that only say pass or fail.**

Your job, Claude Code:
1. Write every check below as an automated test, named starting with its ID (for example "F11 after the blackout: one button, then the role card for 15 seconds").
2. Make each one runnable with one command.
3. Show results on one simple page Jon can read at a glance.
4. **Never show Jon sealed content**, not even in an error message.

---

## The golden rule for every check

> A check reports **what** broke and **which seed** broke it. It never reports **what the clue says**.

- Good: `FAIL · G07 Solvable · seed tulip-4471 · solver found 2 possible murderers`
- Bad: anything that prints a cat's lean, a bag's contents, a drawing picture, a per-night pick, a motive-to-clue link, or a generated case's answer.

Every check gets a short ID (G01, F01, L01…) and a plain-English name.

Every rehearsal and every stand-in case is dealt from a seed word (25 Oct, `functions/lib/seed.js`), so a failure names its word, and the word deals the same case again. See G22 and replay by seed below.

---

## Stand-in clues (used for all of Jon's runs)

Rehearsals use stand-ins, never the real sealed content.

- **Stand-ins** (built; changed 23 and 24 Oct): a rehearsal night deals its own throwaway case and reads nothing sealed: no cat leans in the Parlour Games, no packing, stand-in drawing pictures. Every slot that would show a secret shows a stand-in in square brackets naming what will appear there instead (F28): the cats' motive hints, the bag clues ("[Salem's bag clue about the Murderer appears here]"), Zimothy's and Boo's cross-offs, the news line, bulletin 2, Sir Irwin's countdown and the traces ("[the Ghost's trace, level 3]"). Jon can see that a clue arrived at the right place and time without learning anything, about the party or the rehearsal.
- **Motive 8 practice case**: not built. It waits on Jon's pending rulebook-tutorial decision in CLAUDE.md (tutorial8, on the board).
- **The REHEARSAL band** (built 23 Oct): a big red REHEARSAL band across the top of every phone and every room screen on a rehearsal night. A night is a rehearsal unless "This is the party night" is ticked on the workshop's Game night page. There is no separate practice copy of the game: a rehearsal runs on the emulator or on the live game with that box unticked, so the band is how Jon tells at a glance that a night is not the party.

---

## The commands

Today: `npm test` runs every check that exists, `npm run fake-night` plays one whole night with eight fake phones, and `npm run checks` runs the checks Jon reads on the Health page.

| Command | Who runs it | What it does | Built? |
|---|---|---|---|
| `npm test` | Claude Code | Runs every automated check that exists today. | Yes |
| `npm run fake-night` | Claude Code | The rehearse command: one whole night, all seven acts, eight fake phones, in memory (or on the emulator with `-- --emulator`). The first two phones join under the hosts' names from the Game night form, so they play the two Professors and the bots play them like everyone else (25 Oct). Checks F20, F21, F24, G32, F02 (the host seats dealt and answered like every other phone), G05 (2,000 cases dealt on stand-in rosters: every seat, both host seats included, lands Murderer and Ghost about equally often) and the seal, and prints pass or fail with counts only. With `-- --real-secrets` it is a party-night dry run on the real leans, packing and drawing pictures (23 Oct), and prints a "Party secrets used" line of counts. | Yes |
| `npm run test:rules` | Claude Code | The security rules check (L04), on the emulator. Plain `npm test` skips it. | Yes |
| `npm run checks` | Jon (or Claude Code) | `scripts/checks.mjs`. Three groups. **Case generator**: deals 1,000 stand-in cases (4 to 12 guests, bags packed in memory from the seed's item list) and runs every case check on each (twenty on every case: G01, G03, G04, G09, G17, G19, G20, G21, G23, G32, G33, G34, G39, G41, G45, G46, G47, G49, G51, G53; the memory-match and prompt checks, G50 and L08, on every 50th; and G05 and G06 once, across all the deals). **Dry run**: one whole fake night in memory. **Leak checks**: L01 (the files, the history, and no tracked JSON shaped like sealed content), L06 and L08. Prints one line per group, counts only, and saves the same counts to `validation_reports/checks` for the Health page. `-- --cases 200` for a quick look, `-- --local` to save nothing. Each stand-in case is dealt from a seed word (check-1 to check-1000), a failure names it, and `-- --seed check-28` deals that one case again and runs its checks (counts only, saves nothing). It does not run the rules check (L04 needs the emulator): that is still `npm run test:rules`. About ten seconds for the 1,000. | Yes (24 Oct; more checks 25 Oct) |
| Jenna's "Run the checks" | **Jenna only** | The checks on the real sealed content, on the server: PK1, G43 and PK2 on the packing, LN1 on the leans, RP1 on the drawing pictures. Their Steward page, tab The checks, shows each check's ID, its plain name, PASS or FIX NEEDED and a count (every check but PK1), never content. (Was planned as `npm run checks:real`; Jenna works only in the browser, so it is a button.) | Yes (24 Oct) |
| Replay by seed | Jon (the Game night page) and Claude Code | Every rehearsal is dealt from a seed word. On the Game night page, "Play a rehearsal again" lists the last five words, and Play it again (or a word typed in the box) makes the next night started from a phone deal that rehearsal again: the same roles, motive, cat hints, Parlour Games, Act 4 groups and drawing, and the same characters for the same people joining in the same order. Used once; never the party. For a stand-in case: `npm run checks -- --seed check-28`; for a whole fake night: `npm run fake-night -- --seed tulip-4471` (it prints each rehearsal's word). | Yes (25 Oct) |

There is no separate `npm run rehearse`: `npm run fake-night` is the rehearse command.

---

## Group G · The case generator (every dealt case)

Since 23 October there are no secret sets: the deal draws the motive itself and, on a party night, reads only the cats' leans, so there is nothing to skip and no fallback to a rehearsal. The Host tab's only case warning is a trace with no look-alike among the guests. The G checks run before the party, not at the deal.

**Roles and cast**
- **G01** Exactly one Murderer and one Ghost. They are different players. Everyone else is a Detective.
- **G02** Each player gets a different character. Jon and Susan always play the two Professors; every other guest draws at random from the other twelve.
- **G03** Characters not in play have no trace and no clues anywhere in the case.
- **G04** The motive is one of the 19. Motive 8 is dealt like the others, with the same open hint lines (CLAUDE.md, the burned exception).

**Fairness** (measured across all 1,000 cases)
- **G05** Every seat, including both host seats, lands Murderer and Ghost about equally often. No seat is favored.
- **G06** All 19 motives and all 14 characters turn up in roughly fair shares.

**Solvable, but not too easy**
- **G07** A solver given every clue at clarity dial 3 finds exactly one Murderer, one motive, and one Victim. Not zero, not two.
- **G08** The case is still solvable if the dial ends at 1 (worst case for the room), using clues outside the trace reveal.
- **G09** No single clue before Act 6 gives away the Murderer on its own.

**Clue rules**
- **G10** Clues name a trace, never a person.
- **G11** Every trace a clue mentions belongs to a character in play.
- **G12** Trace reveal level 3: the second option belongs to a character in play. If the lookalike twin isn't playing (and always for coins), a different in-play trace is used.
- **G13** Trace reveal levels 1 to 5 each produce a picture. Level 5 names the trace, never the person.

**Cats and the dog**
- **G14** Affection is rolled 1 to 5 for Zimothy, Boo and Granolia. Irwin is always at the top and never moves. Salem starts at 3 for everyone, and never goes above 4 unless Jon pressed "Salem petted" for that player.
- **G15** Irwin never says anything false. Zimothy never says anything false.
- **G16** Granolia's hint lines only leave things out; they never rule out the real answer. (Reworded 23 Oct: her one wrong blank went with her secret lines.)
- **G17** Salem follows his ladder: backwards at 1 to 3, a coin flip at 4, straight at 5. When backwards he points at a wrong answer, so he never rules out the real one. No case is solvable from Salem's lines alone. At 5 his hint line is straight. (Reworded 23 Oct: he has no testimony any more.)
- **G18** Boo follows her ladder: a look at 1, "Ew. Do I know you?" at 2, one motive in five words at 3, a family at 4, a family plus a bonus motive at 5.
- **G18b** Every cat line, at every level, in Acts 2 and 4, only rules out wrong answers (the old G41).
- **G19** If Irwin and any cat disagree, Irwin is the one telling the truth.

**Groups (Act 4)**
- **G20** Every player is in exactly one pair or trio.
- **G21** The Murderer and the Ghost are never in the same group.

**Replay and reset**
- **G22** The same seed always deals the exact same case.
- **G23** Spill the Beans: re-rolls victim, motive and Ghost. Keeps characters and affection. Only allowed up to the end of Act 5. The new case passes G01 to G21.

**Clarity dial**
- **G24** Starts at 3. Never goes below 1 or above 5. Never resets during the night.

**Parlour Games** (full wording in `docs/parlour-games.md`)
- **G25** Each case uses 12 different sets from the bank: five in Act 2, five in Act 4, two in Act 6. Every set is picked about equally often across 1,000 cases.
- **G25b** Parlour Game times follow the spacing rules (never back to back in Acts 2 and 4; both Act 6 sets before the Relay Drawing), and the same seed gives the same times.
- **G26** Every question has exactly two answers.
- **G27** Irwin is never the listening cat. His affection never moves.
- **G28** Every cat's affection stays between 1 and 5 all night.
- **G29** Murderer and Ghost affection moves with the same odds and sizes as a Detective's (compare across 1,000 cases).
- **G30** Each cat leans toward its fitting answer about 75% of the time (allow 65 to 85%).
- **G31** Awards use final affection, never the cats' hidden leans.

**How the case gets solved** (full wording in `docs/solving-the-case.md`)
- **G32** At dial 3, a solver given every clue up to the end of Act 5 finds exactly one motive.
- **G33** Act 2 hints and bulletin 1 only ever rule out wrong families. The real family is never ruled out. Bulletin 1 crosses off exactly one family.
- **G34** Irwin's countdown: five cards at dial 1 down to one at dial 5; the real motive always in. Filler comes from the real family first, then from families already ruled out.
- **G35** The Study clue shows the Ghost's trace and never names a person.
- **G36** Level 3 second options: the Study never shows the Murderer's trace; Act 6 never shows the Ghost's.
- **G37** Replaced by G50 (24 Oct): the memory match now uses all fourteen traces in three rounds.
- **G38** No hidden events for the Murderer or the Ghost in any act.
- **G53** Every bulletin 2 line at every dial level points at the real family. (Was G40 until 24 Oct.)

**The bags** (full wording in `docs/sensory-bags.md`; the handoff of 23 Oct, section 11)
- **G39** Every Act 2 bag clue fits the Murderer's bag; every Act 4 bag hint fits the Ghost's bag.
- **G40** No bag clue names an item, a bag number or a person.
- **G41** Every clue word a clue uses sits in two or three in-play bags, never one.
- **G42** At dial 1, a solver using only the bag clues and the room's shared information narrows the Murderer to a small group, and the Act 6 trace can finish it.
- **G43** Every bag has at least two clue words.
- **G46** No single guest's Act 2 bag clues narrow the Murderer to one bag.
- **G49** Salem's bag clue is a wrong word at rungs 1 to 3 and a right one at 5; his wrong word is still in two or three in-play bags.

**Act 2, Lights Out**
- **G44** Every cat visit gives one motive hint and one bag clue, at the rung set by that cat's affection at the scan.
- **G45** No single guest's Act 2 cat hints, with bulletin 1, name the real family: at least two families remain for every guest.

**Act 4, Behind Closed Doors**
- **G47** Every group visits each of the four rooms exactly once; a room never holds two groups.
- **G48** Boo speaks to every group in Act 4 at any affection (the Act 4 exception to G18).
- **G50** The memory match always uses all fourteen traces as art, in three rounds of 6, 10 and 14 pairs, and never crosses off the real motive.
- **G51** Zimothy's and Boo's cross-offs never cross off the real motive, and never the same motive for one group.
- **G52** Every Act 4 reward is paid by the ten-minute cap even if the group never finishes.

**Miss Boo LaRue's Arcade** (28 October; a page of its own to try, not on the night yet: the Entryway keeps Boo's Catwalk until Jon answers *entrywayGame*. Not case checks: they run in `npm test`, not in `npm run checks`. `docs/boo-arcade.md`)
- **G54** The menu sits on the second row of keys, the five games with two blank keys at each end, and each of the five games plays, scores and ends by its rules: the same seed plays the same way, and every game ends at its time unless it ended sooner. Boo's first fish is never under her, right in front of her or under the how-to-play screen's Back key, and each later one is never under her or right in front of her (300 seeds); a gold mouse always hides sooner than a plain one; in Knock It Off the Table a press while the paw rests is another miss and starts the rest again, so presses closer together than the rest knock nothing off, while a press a little early and then one on the edge still knocks it off. In Whack-a-Mouse the household's pets pop up among the mice from five seconds in, about one in four, all five of them, each up as long as a plain mouse; a pet tapped scores nothing and shows on red for a moment, the third ends the game with the points kept, and the strip and the screen count the pets tapped (29 October). A key a mouse has just left stays empty for half a second and a tapped pet's key stays red and empty, so a tap a moment late never lands on a pet. Every strike says so on the touch strip for a moment, in place of the points ("Strike 1! That's a pet.", "Too soon!", "Too late!"); in Whack-a-Mouse the words stay their whole second and a half while mice are tapped, and in Knock It Off the Table a knock brings the points back. The rule shows before Whack-a-Mouse starts, and the result's strip says how the game ended, even when it ends while a strike's words still show (29 October). The Tail key on the menu is a black cat, drawn in a pale glow so it shows on the dark blue (29 October). Every face a game shows is drawn (on a fake canvas, none falling back to the art's "?"), 36 keys every time. Every sound the engine asks for plays, a win or a loss tune waits for the bite, the last fish or the last knock before it, and each of the five face pictures (Boo's and the pets') is on its keys when it comes in time and never used when it comes late, each pet keeping its own stand-in; Boo's face is asked for first, and each pet is fitted by the box measured from its picture, so a new face picture fails until it is measured again (29 October).
- **G55** A group's visit: the turns go round the group, two tokens each; after a player's second game the first two players get their clue and a trio's third gets Boo's line instead; the most points wins, and a tie names everyone tied; free play after the visit records nothing; the chime ends everything from any moment, then free play. A visit's game that would run into the chime is cut short, so its clue still comes first: the full length while it fits, never under 30 seconds, free play never cut, and a pair and a trio at an ordinary pace get both clues before the chime. The chime names who it caught short in two sentences, a clue owed to the first two and Boo's line to a trio's third player, told apart by place, never by name (29 October).
- **G56** Boo's words: the practice clue is the house's own square-bracket stand-in, word for word, and Jon's two lines ("Didn't I give you enough? Now be off! I'm done playing games." and "Be on your way.") are word for word. Every word the arcade can show passes F09, the chime's two sentences, the strike words and the rule included, and the strike words and the rule are among what the screens and the strip really showed. The result's strip names how the game ended, for every way a game ends. No em dash in the arcade's files.

**The just-for-fun winners in Act 4** (Jon, 28 October; built 29 October. They change nothing: the whole group is paid the same, and nothing earns a clue. Not case checks: they run in `npm test`, not in `npm run checks`. `docs/room-screens.md`)
- **G57** In Duplicate's winner: each pair found counts for the player whose turn it was, and the counts add up over the three boards on the server, by place in the group, so a reloaded Library screen still names the right player. After the third board the Library's screen names whoever found the most pairs, in Zimothy's voice; a tie names everyone tied; one player, or a game with no turns (the game on its own), names nobody. A count that does not fit the board counts nothing and never refuses the board. The group's reward is the same, with no word of a winner.
- **G58** Get Off My Lawn!'s winner: each slip counts against the phone that sent it, by place in the group, and a second phone's slip of the same moment counts nothing, as it restarts nothing. Every phone that can feel a shake says so as the clean mark passes, first or not, and only those phones (and any phone that slipped) can win, so a phone with no motion, which never slips, never wins by standing still. Once Salem's game is cleared the Orangerie's screen names whoever slipped least, in Salem's voice; a tie names everyone tied; one phone that played names nobody. Another group's phone marks nothing, and the next group starts with no counts. The group's reward is the same, with no word of a winner.
- For both: the rooms' public docs carry numbers by place, never a name or a guest (L07); the screens put the names to them from the groups the Parlour TV already shows. Every line the two cats say is 10 to 80 characters, with no number, no em dash and no word of the case.

---

## Group F · The full dry run (eight fake players)

Fake players tap random choices, read at random speeds, and sometimes walk away mid-screen.

**It runs**
- **F01** All seven acts run start to finish with no crash and no stuck screen.
- **F02** The two host seats (Jon and Susan, the Professors) are played by bots like everyone else and land Murderer or Ghost as often as any seat.
- **F03** A phone that drops out can rejoin (or switch to the backup iPad) and lands back where it was.

**Nothing gives a role away**
- **F04** Every role's screen has the same layout and the same number of parts. Compare them automatically.
- **F05** Every Parlour Game screen takes the same time to read on every phone, whatever the role.
- **F06** Every role card needs the same tap, so nobody stands out by tapping. (Reworded 23 Oct: there are no hidden events, so there are no innocent event screens.)
- **F07** After a Parlour Game, every player's sliders behave the same way, so a still marker is never a tell.

**Timing**
- **F08** All nine phones get each window at the same moment. Act 4 exception (24 Oct): its Parlour Games wait on each phone and are played when the guest is free; Acts 2 and 6 unchanged. G25b has the same exception.
- **F09** No "waiting for other players" screen ever appears.
- **F10** A window never closes early.
- **F11** After the blackout (at most five seconds, ended by the server): one button, "Sorry for the interruption, continue here"; then the role card for 15 seconds on the server's clock, with no button; then the main page on its own. (Reworded 25 Oct to Jon's cue list; before, the card held 15 seconds and then showed a hide button.)
- **F12** Puzzles appear on the chime, not on arrival.

**Game rules**
- **F13** Parlour Games: a Detective's answer warms or cools a secretly listening cat, by its hidden lean. Murderer and Ghost answers move the clarity dial. These are the only "events" in the game.
- **F14** The cats tab shows the five-stop slider (Cold shoulder to Devoted). Never a number.
- **F15** Act 4 shows both your own affection and the group's average.
- **F16** Every Act 4 room, the study included: after ten minutes the group gets its reward anyway and moves on (was 15 minutes for the study).
- **F17** Act 7: everyone gets two minutes to enter picks. The reveal goes Murderer, then Motive, then Victim.
- **F18** The clarity-dial graph at the end matches what actually happened. The end credits show the dial's journey: where it stood at the end of each act, its highs and lows, and the level each dial clue landed at (bulletin 2, Irwin's dessert clue, the Study trace, the trace reveal). Shown only after the reveal.
- **F19** A Parlour Game that pops up over another screen returns the phone to exactly where it was.
- **F20** Only one player is at a cat's QR code at a time in Act 2.
- **F21** Every player is told where to go next. Nobody is ever left without a next step.
- **F22** "Not yet, call me later" appears on every phone, looks the same for everyone, and moves the guest back in the queue with no penalty.
- **F23** The Act 2 queue never stalls: no cat sits empty while a guest is waiting and ready.
- **F24** The supper chime waits until everyone has seen all four cats, unless Jon presses Supper's ready; the missed cats' lines are delivered on the phone.
- **F25** A phone with no motion sensor never causes a slip in Salem's game.
- **F26** Every colour change in Salem's game reaches every phone in the group within half a second of the scheduled time.
- **F27** `chime-phone` plays at every "look at your phone" moment: supper, the Act 4 groups and every round, dessert (since 25 Oct, the cue list's cue 12), and the Act 6 Parlour Games.
- **F28** On a rehearsal night every sealed slot shows a bracketed stand-in naming what will render there, and never the real thing.
- **F29** The drawing's clock (Jon's cue list, 25 Oct): fifteen seconds a turn; the walk to the paper is a limit of twenty seconds that the host's At the paper ends early (the square shows at once, and the fifteen seconds run from the press), refused in every other state and while the night is paused; and the practice and the three rounds at their caps fit the twenty-six-minute budget (`MAX_TURNS` at least 42).
- **F30** The Notes tab (Jon's cue list, 25 Oct): one box per phone per night; a text write touches nothing else under the night (not the crossings-off, not the seen flags); written after a short pause and when the box loses focus; read by nobody else; and a write the server refuses never empties the box (26 Oct).

---

## Group L · Leak checks (Rule 1)

These protect Jon's ability to play. Run them with every other check.

- **L01** No sealed content anywhere in the repo or its git history: generated cases, the dial mapping, the Parlour lean table, the Relay Drawing picture bank, bag contents, and the retired per-motive sets still in Firestore (kernels, document texts, echo fragments, the code-to-motive manifest). (The W-O-O-F News, cat hint and Irwin line banks are open and may be in the repo; the per-night pick never is.) The test checks every tracked file, and every file name in git history, for the guarded patterns (anything named `sealed*`, `*.sealed.json`, a `cases/` JSON, `service-account*`). It also checks that no tracked JSON looks like a sealed doc (a kernels key holding text, or a code-to-motive map). It prints only counts and PASS or FAIL, never a match. Plain words like "bags" or "manifest" are not markers: normal files such as `scripts/pack-bags.mjs` use them.
- **L02** No test output, log file, or browser console line contains sealed text.
- **L03** A rehearsal night never reads the secrets: on a rehearsal the dealer skips the leans, the bag clues skip the packing (they show stand-ins), and the Relay Drawing skips the picture bank (checked by a test). Every night, rehearsals included, reads the packing's bag count when it is made, never an item.
- **L04** Jon's workshop account cannot open sealed content. Only Jenna's can.
- **L05** The lean table is not in the repo, and Jon's account cannot read it.
- **L06** The bag packing is not in the repo, and Jon's account cannot read it.
- **L07** The Parlour TV never shows sealed content or anything about a specific player.
- **L08** Sir Irwin's prompts never contain a clue word (changed 24 October: prompts 13 to 16 name a tag or a shape, not a sense).
- **L09** Miss Boo LaRue's Arcade reads no night and shows nothing sealed: its game logic uses nothing from React, Firebase or the browser, and the only clue it shows is the stand-in (28 October). Since 29 October: its pictures and sounds import nothing and its Stream Deck code only the Stream Deck library, the page holds no square-bracket line of its own, its one loop runs every 50 ms, and a sample screen stays frozen.

---

## Group J · Jenna's checks on the real content

Run on the server from Jenna's page ("Run the checks"), never in a terminal. Each shows PASS or FIX NEEDED, the ID, and a count (every check but PK1).
- **PK1** Ten bags of four or five things, and each pair is in the bag it is listed for. (One food a bag is checked by the packer when it packs, not here.)
- **G43** Every bag has at least two clue words (on the real packing).
- **PK2** With two bags sitting out (eight guests), nearly every bag still keeps two clue words: at least nine in ten, over 200 random draws.
- **LN1** Every Parlour Game question has a lean for every cat.
- **RP1** The drawing has a good picture for each of its three rounds.

---

## The results page Jon reads

**Built 24 October:** the workshop's **Health** page (`#/health`, linked from Where we are). As specified, with two differences: the Case generator count is checks, not cases (twenty on each of 1,000 cases, two on every 50th, and the two fairness checks, so `20,042 of 20,042 passed`), and under a red cross the page shows the stand-in case's seed word (check-28, say, or "fake night"), which `npm run checks -- --seed` deals again.

- `npm run checks` writes one counts-only results record: the group, how many passed, the total, the IDs and seeds of any that failed, and the time. The page reads that record.
- Big text. One line per group: Case generator, Dry run, Leak checks.
- A green tick or a red cross, and a count. Example: `Case generator · 1,000 of 1,000 passed`
- Under any red cross: the check ID, its plain-English name, and the seed. Nothing else.
- The date and time of the last run.
- No "Run again" button (the workshop runs in the browser and cannot start the checks on the Mac). The page says: "To run again, ask Claude Code to run npm run checks."

If everything is green, show one sentence: **"All clear. The game is ready."**

---

## What is left (25 October)

Built: the tests marked "Has a test" in the table below, the stand-ins, `npm run fake-night` (with the two host seats since 25 October), the REHEARSAL band, `npm run checks` with its counts-only record, the Health page, and Jenna's "Run the checks" button. Also on 25 October: replay by seed and G22 (card 324). On 25 October (card 479) the checks that were Not yet were written, every test that checked something without an ID was renamed to start with it, and the new case-level checks went into `npm run checks`.

Before the second full tech run (by Wednesday 11 November; all Claude Code):
1. The worst-dial proof, G07, G08 and G42, from Claude chat's patch (below).

Waiting on Jon (each written as a `test.todo` with the reason, so it shows in the test count and is never silent; each is a question on the board with the built behaviour as its default):
- **G09, bag clues that name only a sense.** In a party of four to six guests, about 1 deal in 1,000, a cat's low-rung bag clue names only a sense (the Murderer's bag holds no clue word among the bags in play), and that sense is one only the Murderer's bag holds among the bags in play: on its own it points at one bag. Not seen in 2,000 deals each at eight, nine or ten guests, the party's size. The rest of G09 passes. The question is *senseClue* (default: leave it).
- **G24, the dial after Spill the Beans.** The Canon says the dial never resets; today a Spill the Beans restarts it at zero (and the G23 tests expect that). Which one is right is Jon's call: the question is *dialSpill* (default: start again, as built).

Checked at the tech run, not in a test: F26's half second over the real Wi-Fi. The tests prove the schedule, the redraw rate and the clock rule (a phone stays within half a second while its round trip to the server is under 0.8 seconds); the house's own Wi-Fi is the tech run's to measure.

Miss Boo LaRue's Arcade (28 October): G54 to G56 and L09 test the games and the visit without a screen, and since 29 October the pictures and the sounds on a fake canvas and speaker. The Stream Deck's own code has tests with no ID, as it is not a check on the game (`play/test/arcadeDeck.test.mjs`: the presses, the painter, reopening, the plugs, and one arcade tab at a time). The real Stream Deck + XL is not tried yet: its keys, dials and touch strip in Google Chrome, and how fast each game feels, are Jon's first try on the Game test tab. Putting it on the night waits on *entrywayGame*; if it goes on, the checks that lean on Boo's cross-off (G32, G48, G51) and the fake night change with it.

Dropped on 23 October: the old item "Salem's testimony straight at 5 (G17)". Jon retired the secret lines, so Salem has no testimony.

There is no freeze date (23 Oct). Any check not done before the second full tech run is marked "after the party" in the table, not left silent.

G07 and G08 together are the worst-dial proof (everyone can still get two of three at dial 1). **Answered by Jon on 24 October (worstDial): build it now, before the second full tech run** ("All needs to be built as soon as possible"), with G42, the bag solver at dial 1. Claude chat is building it and sends it as a patch, `docs/patches/2026-10-24-worst-dial.patch`, with how to apply it. Claude Code applies the patch when it arrives and does not start the proof itself. It is a card on the board ("Put in the worst-dial proof when Claude chat sends it").

---

## Where every check stands (checked 25 October 2026; the arcade's four rows added 28 October, updated 29 October; the two winners' rows added 29 October)

- **Has a test**: an automated test checks it, and the test's name starts with the ID.
- **Has a test, no ID**: a test checks it, but its name does not carry the ID yet. Rename it so the Health page can count it.
- **Partly**: some of it is tested. The last column says what is missing.
- **Not yet**: no test.
- **Retired**: no longer a check.

| ID | Check | Status | Where, or what is missing |
|---|---|---|---|
| G01 | One Murderer, one Ghost | Has a test | `functions/test/run.test.mjs` ("F01 and G01 the whole night"), `functions/test/case-checks.test.mjs`; also in `npm run checks` |
| G02 | Different characters; hosts are the Professors | Has a test | `functions/test/night.test.mjs` ("G02 join: hosts get the Professors"); the fake night's host seats (F02) |
| G03 | Characters not in play leave no clue | Has a test | `functions/test/case-checks.test.mjs` (every role, hint, the victim and both trace reveals belong to guests in play); also in `npm run checks` |
| G04 | The motive is one of the 19 | Has a test | `functions/test/case-checks.test.mjs` (motive 8 dealt like the others, with the same open lines); also in `npm run checks` |
| G05 | Seat fairness, both host seats included | Has a test | `functions/test/case-checks.test.mjs` (3,000 deals), `scripts/test/fake-players.test.mjs` (the fake night deals 2,000 and prints "Seat fairness (G05)"); also in `npm run checks` |
| G06 | Motive and character fairness | Has a test | `functions/test/case-checks.test.mjs`: the nineteen motives across the deals, and the fourteen characters through the night's own deck (the hosts always the Professors, the other twelve drawn evenly). The motives also in `npm run checks` |
| G07 | Solvable at dial 3 | Partly | Only the motive is proven (G32). The Murderer and the Victim are not; they come with the worst-dial patch (worstDial, 24 Oct). |
| G08 | Still solvable at dial 1 | Not yet | Before the second full tech run (worstDial, Jon 24 Oct); coming as Claude chat's patch with G07 and G42 |
| G09 | No single clue before Act 6 gives away the Murderer | Partly | `functions/test/case-checks.test.mjs` (the study never shows the Murderer's trace, Irwin names motives only, every bag clue word fits two bags or more); also in `npm run checks`. A `test.todo` for Jon: a bag clue that names only a sense can point at one bag in a party of four to six (see What is left) |
| G10 | Clues name a trace, never a person | Has a test | `functions/test/finale.test.mjs` ("G10, G11, G12 and G13 revealTrace") |
| G11 | Every trace in a clue is in play | Has a test | `functions/test/finale.test.mjs` ("G11 and G12 pickPartner", and the revealTrace test) |
| G12 | Level 3 second option is in play | Has a test | `functions/test/finale.test.mjs` ("G12 TRACE_BUCKETS", "G11 and G12 pickPartner", the revealTrace test) |
| G13 | Levels 1 to 5 each give a picture | Has a test | `functions/test/finale.test.mjs` ("G13 and G24 traceLevel", the revealTrace test) |
| G14 | Affection rolls; Irwin maxed; Salem starts at 3 | Has a test | `functions/test/night.test.mjs`, `functions/test/parlour.test.mjs` |
| G15 | Irwin and Zimothy never say anything false | Has a test | `functions/test/case-checks.test.mjs` ("G15": Irwin's cards at every band, Zimothy's lines at every level); also the G18b test and the G34 test |
| G16 | Granolia's lines only leave things out | Has a test | The G18b test: what she rules out at each level. (Reworded 23 Oct: the wrong-blank tests went with her secret lines.) |
| G17 | Salem's ladder | Has a test | The G18b test in `functions/test/solving.test.mjs` (backwards at 1 to 3, nothing to trust at 4, straight at 5); he stays at 4 or below unless petted (`functions/test/parlour.test.mjs`); no case is solvable from Salem's lines alone (`functions/test/case-checks.test.mjs`, and in `npm run checks`). His bag clues: G49 |
| G18 | Boo's ladder | Has a test | `functions/test/solving.test.mjs` ("G18 Boo's ladder in her own words", and what she rules out in the G18b test) |
| G18b | Every cat line only rules out wrong answers | Has a test | `functions/test/solving.test.mjs` ("G18b every cat line, at every level, in Acts 2 and 4") |
| G19 | Irwin wins any disagreement | Has a test | `functions/test/case-checks.test.mjs` (Irwin's cards always hold the truth; only Salem ever says something false); also in `npm run checks` |
| G20 | Everyone in exactly one group | Has a test | `functions/test/station.test.mjs`, `functions/test/act4.test.mjs`, `functions/test/case-checks.test.mjs`; also in `npm run checks` |
| G21 | Murderer and Ghost never in one group | Has a test | `functions/test/station.test.mjs`, `functions/test/case-checks.test.mjs`; also in `npm run checks` |
| G22 | Same seed, same case | Has a test | `functions/test/seed.test.mjs` (the case from one word twice; a whole rehearsal replayed: characters, bags, affection, case, Act 2 line, Act 4 groups, drawing), `scripts/test/checks.test.mjs` (a stand-in case dealt again from its word) |
| G23 | Spill the Beans | Has a test | `functions/test/safeguards.test.mjs` (the G23 tests; the new story checked against G01 to G21 through the real spill, party and rehearsal), `functions/test/case-checks.test.mjs`; also in `npm run checks` |
| G24 | Dial starts at 3, stays 1 to 5, never resets | Partly | `functions/test/finale.test.mjs` ("G13 and G24 traceLevel"), `functions/test/screen.test.mjs` ("G24 the band follows the trace ladder"). A `test.todo` for Jon: today a Spill the Beans restarts the dial (`functions/test/safeguards.test.mjs` expects it), but the Canon says the dial never resets |
| G25 | 12 sets: five, five, two | Has a test | `functions/test/parlour.test.mjs` |
| G25b | Parlour Game times and spacing (Act 4: waiting on the phone) | Has a test | `functions/test/parlour.test.mjs`; the Act 4 exception in `functions/test/act4.test.mjs` ("G25b and F08 Act 4 Parlour Games wait on the phone") |
| G26 | Exactly two answers | Has a test | `functions/test/parlour.test.mjs` |
| G27 | Irwin never listens | Has a test | `functions/test/parlour.test.mjs` |
| G28 | Affection stays 1 to 5 | Has a test | `functions/test/parlour.test.mjs` |
| G29 | Murderer and Ghost sliders move like a Detective's | Has a test | `functions/test/parlour.test.mjs` |
| G30 | Leans fit about 75% of the time | Has a test | `functions/test/parlour.test.mjs` |
| G31 | Awards use final affection | Has a test | `functions/test/finale.test.mjs` |
| G32 | Exactly one motive at dial 3 | Has a test | `functions/test/solving.test.mjs`; also in `npm run checks` |
| G33 | Act 2 hints and bulletin 1 never rule out the real family | Has a test | `functions/test/solving.test.mjs`; also in `npm run checks` |
| G34 | Irwin's countdown | Has a test | `functions/test/solving.test.mjs`; also in `npm run checks` |
| G35 | The Study shows the Ghost's trace, never a name | Has a test | `functions/test/solving.test.mjs` |
| G36 | Level 3 second options | Has a test | `functions/test/solving.test.mjs` |
| G37 | Memory match (6 pairs) | Replaced | By G50 (24 Oct) |
| G38 | No hidden events in any act | Has a test | `functions/test/solving.test.mjs` (Act 2), `scripts/test/fake-players.test.mjs` ("G38": every act, a whole night, every phone the same windows and cards) |
| G39 | Every bag clue fits the bag it is about | Has a test | `functions/test/bagclues.test.mjs`; also in `npm run checks` |
| G40 | No bag clue names an item, a bag number or a person | Has a test | `functions/test/bagclues.test.mjs` |
| G41 | Every clue word sits in two or three in-play bags | Has a test | `functions/test/bagclues.test.mjs`; also in `npm run checks` |
| G42 | The bag solver at dial 1 | Not yet | Coming with the worst-dial patch (worstDial, 24 Oct) |
| G43 | Every bag has two clue words | Has a test | `functions/test/bagclues.test.mjs`; on the real packing, Jenna's checks |
| G44 | Every Act 2 cat visit gives a hint and a bag clue | Has a test | `functions/test/solving.test.mjs`; the fake night |
| G45 | Two families stand for every guest after Act 2 | Has a test | `functions/test/solving.test.mjs`; also in `npm run checks` |
| G46 | One guest's bag clues never pin one bag | Has a test | `functions/test/bagclues.test.mjs`; also in `npm run checks` |
| G47 | Every group visits every room once | Has a test | `functions/test/act4.test.mjs`; also in `npm run checks` |
| G48 | Boo speaks to every group in Act 4 | Has a test | `functions/test/act4.test.mjs` |
| G49 | Salem's bag clue: wrong at 1 to 3, right at 5 | Has a test | `functions/test/bagclues.test.mjs`; also in `npm run checks` |
| G50 | The memory match: 6, 10, 14 pairs, all fourteen traces | Has a test | `functions/test/solving.test.mjs`; also in `npm run checks` |
| G51 | Zimothy's and Boo's cross-offs | Has a test | Inside the G50 and G52 tests (`functions/test/solving.test.mjs`, `functions/test/act4.test.mjs`); also in `npm run checks` |
| G52 | Every Act 4 reward paid by the cap | Has a test | `functions/test/act4.test.mjs`; the fake night |
| G53 | Every bulletin 2 line points at the real family (was G40) | Has a test | `functions/test/case-checks.test.mjs` (all 25 lines, every family and every level), `functions/test/screen.test.mjs` (on a party night, with its recording); also in `npm run checks` |
| G54 | Miss Boo LaRue's Arcade: the menu and the five games (Whack-a-Mouse's pets too), their pictures and sounds | Has a test | `play/test/arcade.test.mjs` ("G54"), `play/test/arcadeMedia.test.mjs` ("G54": every face drawn, every sound played, a tune waits for the sound before it, the five face pictures in time and late, Boo's face first, each picture's measured box, the black cat on the Tail key in its glow). Not on the night yet (*entrywayGame*); not tried on the real Stream Deck + XL yet |
| G55 | The arcade's visit: turns, two tokens each, the clue after a second game, the trio's line, the winner, free play, the chime, a game cut short near the chime, who the chime caught | Has a test | `play/test/arcade.test.mjs` ("G55") |
| G56 | Boo's words in the arcade and Jon's two lines, word for word; the strike words and the result's strip for every way a game ends | Has a test | `play/test/arcade.test.mjs` ("G56") |
| G57 | In Duplicate's just-for-fun winner: the most pairs, by place, named by Zimothy | Has a test | `functions/test/act4.test.mjs` ("G57": the count on the server, an odd count, the same reward, no names), `play/test/rooms.test.mjs` ("G57 and G58": the rule, the words, the Library's screen) |
| G58 | Get Off My Lawn!'s just-for-fun winner: the fewest slips, by place, named by Salem; a phone that never felt a shake left out | Has a test | `functions/test/act4.test.mjs` ("G58": the slips and the shake marks on the server, the same reward, no names), `play/test/rooms.test.mjs` ("G57 and G58": the rule, the words, the Orangerie's screen) |
| F01 | All seven acts run | Has a test | `functions/test/run.test.mjs` ("F01 and G01"), `scripts/test/fake-players.test.mjs` ("F01, F24 and L03") |
| F02 | Host seats played by bots, no different | Has a test | `scripts/test/fake-players.test.mjs` ("F02 and G05"); the fake night prints "Host seats ... (F02)" |
| F03 | A dropped phone rejoins | Has a test | `functions/test/night.test.mjs` (the F03 tests) |
| F04 | Every role screen has the same layout | Has a test | `functions/test/windows.test.mjs` (the F04 tests) |
| F05 | Parlour Game screens read alike | Has a test | `functions/test/windows.test.mjs` ("F05 and F08 across thirty nights") |
| F06 | Every role card needs the same tap | Has a test | `functions/test/windows.test.mjs` (the same card for every role, and a late joiner), `play/test/phone.test.mjs` (one continue button, a card with no button, one show-again button). The old F06 (innocent event screens) is retired: no act has hidden events. |
| F07 | Sliders behave the same after a Parlour Game | Has a test | `functions/test/parlour.test.mjs` ("F07": the same cats can move, and a marker stays still as often for every role); G29 covers the odds and sizes |
| F08 | Every phone gets each window at once (Act 4: waiting on the phone) | Has a test | `functions/test/windows.test.mjs` ("F05 and F08"); the Act 4 exception in `functions/test/act4.test.mjs` ("G25b and F08") |
| F09 | No waiting-for-players screen | Has a test | `play/test/phone.test.mjs` (no such words anywhere a phone or a room screen reads; every finished screen has its own way on) |
| F10 | A window never closes early | Has a test | `functions/test/windows.test.mjs` (the F10 tests) |
| F11 | The continue button, then the role card for 15 seconds, then the main page | Has a test | `play/test/phone.test.mjs` (the three stages on the server's clock from the tap; a pause never runs the card out; a phone mid-card keeps its seconds after Next; the gate `showsPrompt` is a little wider than the cue list's wording on purpose: it shows the flow in the prompt phase at any act, so the Game test tab's act jumps, which deal the roles and hold the prompt phase at Acts 3 to 7, show the button and the card too); `functions/test/run.test.mjs` ("F11 the blackout returns the power on its own five seconds later on the server"; Power returns by hand; the two landing together return the power once; the blackout is Act 1 only) |
| F12 | Puzzles appear on the chime | Has a test | `functions/test/act4.test.mjs` (every Act 4 room's game is set for its group at the round's chime, the ten minutes run from the chime, a late arrival gets no fresh puzzle, a scan before the chime is turned away) |
| F13 | Parlour Games are the only events | Has a test | `functions/test/parlour.test.mjs`, `functions/test/windows.test.mjs` (the F13 tests) |
| F14 | The Cats tab never shows a number | Has a test | `play/test/phone.test.mjs` (the five stop words, no number rendered, a picture of a slider, not a control) |
| F15 | Act 4 shows your affection and the group's | Has a test | `functions/test/night.test.mjs` ("F15") |
| F16 | Ten minutes a room, then the reward anyway | Has a test | `station/test/study.test.mjs` ("F16 the cap"), `functions/test/act4.test.mjs` (the G52 test) |
| F17 | Two minutes for picks; Murderer, Motive, Victim | Has a test | `functions/test/finale.test.mjs` (the F17 tests) |
| F18 | The dial graph and the dial's journey | Has a test | `functions/test/finale.test.mjs` ("F18 the finale": the graph; "F18 the end credits": where the dial stood after each act, its high and low, each dial clue's level), `play/test/finale.test.mjs` (the journey shows only after the reveal) |
| F19 | A Parlour Game returns the phone to where it was | Has a test | `play/test/windows.test.mjs` (also `placement`: a Parlour Game is an overlay, the deduction round the screen, the ballot a card on Now since 25 Oct) |
| F20 | One player at a cat at a time | Has a test | `functions/test/solving.test.mjs`, `scripts/test/fake-players.test.mjs` |
| F21 | Everyone always has a next step | Has a test | `functions/test/solving.test.mjs`, `scripts/test/fake-players.test.mjs` |
| F22 | Not yet, the same on every phone, no penalty | Has a test | `functions/test/solving.test.mjs` ("F22") |
| F23 | No cat sits idle while someone waits | Has a test | `functions/test/solving.test.mjs` ("F23": after every move and every tick, 2 to 12 guests, with Not yet) |
| F24 | The supper chime waits for everyone, or Supper's ready | Has a test | `scripts/test/fake-players.test.mjs` ("F01, F24 and L03": the fake night's Act 2 line) |
| F25 | No motion sensor, no slip | Has a test | `play/test/act4.test.mjs` ("F25") |
| F26 | Salem's colours reach every phone within half a second | Partly | `functions/test/act4.test.mjs` (one schedule, written three seconds ahead, on the server's clock), `play/test/act4.test.mjs` (ten redraws a second; the clock rule keeps a change within half a second while a phone's round trip is under 0.8 seconds). The real Wi-Fi delay is measured at the tech run |
| F27 | `chime-phone` at every look-at-your-phone moment | Has a test | `functions/test/screen.test.mjs` ("F27 chime-phone": supper, the groups, every round, back to the Parlour, dessert, Act 6's games; and "F27 and L07 the night walk") |
| F28 | Bracketed stand-ins on a rehearsal night | Has a test | `functions/test/case.test.mjs` ("F28 the same walk on a rehearsal night"), `functions/test/act4.test.mjs` ("F28 a rehearsal") |
| F29 | The drawing's clock: 15 s turns, the walk a limit At the paper ends, the 26-minute budget | Has a test | `functions/test/relay-guards.test.mjs` ("F29 the time budget": the numbers, 400 stand-in sets within the budget), `functions/test/relay.test.mjs` ("F29 At the paper": ends the walk now, refused in every other state and while paused, a pause shifts the walk), `play/test/relayhost.test.mjs` ("F29 the host's drawing controls": At the paper only while someone walks, the four names at the guess and through the lockout, the reply words, and the screens use the rules) |
| F30 | The Notes tab: one box per phone per night, a text write touches nothing else, written after a pause and on losing focus, read by nobody else, a refused write keeps the words | Has a test | `play/test/night.test.mjs` ("F30 the Notes tab": the doc shape and the pure rules, the refused-write rollback in both orders, and the screen's shape), `functions/test/discard.test.mjs` (a discarded night drops its `byNight` branch, the Notes text with it) |
| L01 | No sealed content in the repo or its history | Has a test | `npm run checks` (the leak group: no sealed file name in the tracked files or the history, and no tracked JSON shaped like sealed content: a dealt case, kernels, a code-to-motive map, a lean table), `scripts/test/checks.test.mjs` ("L01") |
| L02 | No sealed text in any output | Has a test | `functions/test/case.test.mjs` (the L02 tests); the fake-players run prints "Seal: PASS" |
| L03 | A rehearsal never reads the secrets | Has a test | `functions/test/case.test.mjs` ("L03"), `scripts/test/fake-players.test.mjs` ("F01, F24 and L03": a whole rehearsal night reads nothing sealed but the bag count) |
| L04 | Only Jenna's account opens sealed content | Has a test | `functions/test/rules.test.mjs` (the L04 tests, skipped unless `npm run test:rules` runs the emulator), `functions/test/steward.test.mjs` ("L04 the gate") |
| L05 | The lean table is not in the repo or readable by Jon | Has a test | `functions/test/parlour.test.mjs`, `functions/test/rules.test.mjs` |
| L06 | The packing is not in the repo or readable by Jon | Partly | `npm run checks` (no tracked JSON shaped like a packing); `functions/test/rules.test.mjs` covers `sealed/*` for Jon's account |
| L07 | The Parlour TV never shows anything sealed or about one player | Has a test | `functions/test/act4.test.mjs` ("L07": the rooms' public docs), `functions/test/screen.test.mjs` ("F27 and L07 the night walk"); the fake night's seal check |
| L08 | Sir Irwin's prompts never contain a clue word | Has a test | `functions/test/bagclues.test.mjs`; also in `npm run checks` |
| L09 | The arcade reads no night and shows nothing sealed | Has a test | `play/test/arcade.test.mjs` ("L09") |
| PK1, PK2, LN1, RP1 | Jenna's checks on the real content | Has a test | `functions/test/steward.test.mjs` (the checks op); `functions/lib/checks.js` |
| (old) | Innocent event screens need a tap (the old F06) | Retired | No act has hidden events (closed 22 Oct) |
| (old) | Checks on hidden-event copy for Acts 4 and 6 | Retired | Same reason |
| (old) | Biggest Rebel, Crowd Pleaser, Kindred Spirits, Sworn Rivals | Retired | Dropped 22 Oct; G31 covers the end-credit awards |

---

## Not designed yet — don't invent these

One thing open (28 Oct): Miss Boo LaRue's Arcade on the night. It is built to try on a page of its own; whether it takes the Entryway from Boo's Catwalk is *entrywayGame*, Jon's call, with its second answer about Boo's lost motive cross-off (`docs/boo-arcade.md`, Not decided yet). Do not wire it into Act 4, or write checks for it on the night, before Jon answers. The bags are decided (they stay, 23 Oct: Act 2 bag clues about the Murderer, Act 4 bag hints about the Ghost). Act 4's games are designed: see `docs/solving-the-case.md` and the 23 October handoff, sections 9.6 to 9.9.
