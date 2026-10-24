# Sirwin Manor — Test Plan for Claude Code

Written 19 October 2026, updated 22 October (from `docs/handoff-2026-10-22.md`), 23 October (where every check stands; then again for Jon's two decisions that day: the cats' secret lines retired, the Act 2 safe taken out) and 24 October (the 23 October handoff's checks, its section 11; `npm run checks`, the Health page and Jenna's checks built). Put this file at `docs/test-plan.md` in the repo.
Canon wins any disagreement. If something here conflicts with Canon, stop and ask Jon.

**Every check is listed here** (24 Oct), including the ones first written in `docs/parlour-games.md` (G25 to G31, F19, L05), `docs/solving-the-case.md` (G32 to G38, F20, F21) and the 23 October handoff (G39 to G52, F22 to F28, L06 to L08). Those docs keep the longer wording. Where each check stands today is in the table at the end, "Where every check stands".

**Three IDs changed meaning on 24 October.** The handoff reused G39, G40 and G41 for the bag checks, and the handoff wins. The old G39 (one real Act 2 hint each) is retired: every cat now gives a hint (G44). The old G40 (every bulletin 2 line points at the real family) is now **G53**. The old G41 (every cat line only rules out wrong answers) was already G18b, and lives on under that ID.

---

## Why this exists

Jon is the host, the builder, **and a player**. He can never see the real answers. That means he can't check the game by reading it. He has to trust it by **running checks that only say pass or fail.**

Your job, Claude Code:
1. Write every check below as an automated test, named starting with its ID (for example "F11 blackout messages hold every phone for 15 seconds").
2. Make each one runnable with one command.
3. Show results on one simple page Jon can read at a glance.
4. **Never show Jon sealed content**, not even in an error message.

---

## The golden rule for every check

> A check reports **what** broke and **which seed** broke it. It never reports **what the clue says**.

- Good: `FAIL · G07 Solvable · seed tulip-4471 · solver found 2 possible murderers`
- Bad: anything that prints a cat's lean, a bag's contents, a drawing picture, a per-night pick, a motive-to-clue link, or a generated case's answer.

Every check gets a short ID (G01, F01, L01…) and a plain-English name.

Cases do not carry a seed yet, so today a failure cannot name one. See G22 and replay by seed below.

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
| `npm run fake-night` | Claude Code | The rehearse command: one whole night, all seven acts, eight fake phones, in memory (or on the emulator with `-- --emulator`). Checks F20, F21, G32 and the seal, and prints pass or fail with counts only. With `-- --real-secrets` it is a party-night dry run on the real leans, packing and drawing pictures (23 Oct), and prints a "Party secrets used" line of counts. Still to add: the two host seats (F02, G05) and the other F checks. | Yes |
| `npm run test:rules` | Claude Code | The security rules check (L04), on the emulator. Plain `npm test` skips it. | Yes |
| `npm run checks` | Jon (or Claude Code) | `scripts/checks.mjs`. Three groups. **Case generator**: deals 1,000 stand-in cases (4 to 12 guests, bags packed in memory from the seed's item list) and runs every case check on each (ten on every case: G32, G33, G34, G39, G41, G45, G46, G47, G49, G51; the memory-match and prompt checks, G50 and L08, on every 50th). **Dry run**: one whole fake night in memory. **Leak checks**: L01 (the files and the history), L06 and L08. Prints one line per group, counts only, and saves the same counts to `validation_reports/checks` for the Health page. `-- --cases 200` for a quick look, `-- --local` to save nothing. It does not run the rules check (L04 needs the emulator): that is still `npm run test:rules`. About two seconds a hundred cases. | Yes (24 Oct) |
| Jenna's "Run the checks" | **Jenna only** | The checks on the real sealed content, on the server: PK1, G43 and PK2 on the packing, LN1 on the leans, RP1 on the drawing pictures. Their Steward page, tab The checks, shows each check's ID, its plain name, PASS or FIX NEEDED and a count (every check but PK1), never content. (Was planned as `npm run checks:real`; Jenna works only in the browser, so it is a button.) | Yes (24 Oct) |
| Replay by seed | Claude Code | Deals one exact case again from its seed, so a broken night can be played again. Shows counts only. | Not built. It is a card on the board ("Replay a night by its seed"). |

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
- **G50** The memory match always uses all fourteen traces as art, in three rounds of 7, 10 and 14 pairs, and never crosses off the real motive.
- **G51** Zimothy's and Boo's cross-offs never cross off the real motive, and never the same motive for one group.
- **G52** Every Act 4 reward is paid by the ten-minute cap even if the group never finishes.

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
- **F11** Blackout messages stay up for 15 seconds.
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
- **F27** `chime-phone` plays at every "look at your phone" moment: supper, the Act 4 groups and every round, and the Act 6 Parlour Games.
- **F28** On a rehearsal night every sealed slot shows a bracketed stand-in naming what will render there, and never the real thing.

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

**Built 24 October:** the workshop's **Health** page (`#/health`, linked from Where we are). As specified, with two differences: the Case generator count is checks, not cases (ten on each of 1,000 cases plus two on every 50th, so `10,040 of 10,040 passed`), and under a red cross the page shows the stand-in case's number (or "fake night") where the spec says seed.

- `npm run checks` writes one counts-only results record: the group, how many passed, the total, the IDs and seeds of any that failed, and the time. The page reads that record.
- Big text. One line per group: Case generator, Dry run, Leak checks.
- A green tick or a red cross, and a count. Example: `Case generator · 1,000 of 1,000 passed`
- Under any red cross: the check ID, its plain-English name, and the seed. Nothing else.
- The date and time of the last run.
- No "Run again" button (the workshop runs in the browser and cannot start the checks on the Mac). The page says: "To run again, ask Claude Code to run npm run checks."

If everything is green, show one sentence: **"All clear. The game is ready."**

---

## What is left (24 October)

Built: the tests marked "Has a test" in the table below, the stand-ins, `npm run fake-night`, the REHEARSAL band, `npm run checks` with its counts-only record, the Health page, and Jenna's "Run the checks" button.

Before the second full tech run (by Wednesday 11 November; all Claude Code):
1. Replay by seed: one stored seed per case drives every pick, the same seed deals the same case, counts only, and a G22 test. It is a card on the board ("Replay a night by its seed"). Until then a failure in `npm run checks` names the stand-in case's number, not a seed.
2. The missing tests, each named with its ID. First F11, F09, G05 (with both host seats), G03, G19, F22, F23 and F25. Then the rest marked "Not yet" in the table.
3. Rename the tests that exist but carry no ID, so the Health page can count them.
4. Extend G38 to every act. G53 for all 25 bulletin 2 lines (every family, every level). G18 for Boo's words at each level. F18 for the dial's journey in the end credits. G42, the bag solver at dial 1.
5. The two host seats in the fake-players run (F02, G05).
6. More checks into `npm run checks` as they are written, so the Health page counts them.

Dropped on 23 October: the old item "Salem's testimony straight at 5 (G17)". Jon retired the secret lines, so Salem has no testimony.

There is no freeze date (23 Oct). Any check not done before the second full tech run is marked "after the party" in the table, not left silent.

G07 and G08 together are the worst-dial proof (everyone can still get two of three at dial 1). Whether it is built before the second full tech run or after the party is Jon's call: ask him once, as one question.

---

## Where every check stands (checked 24 October 2026)

- **Has a test**: an automated test checks it, and the test's name starts with the ID.
- **Has a test, no ID**: a test checks it, but its name does not carry the ID yet. Rename it so the Health page can count it.
- **Partly**: some of it is tested. The last column says what is missing.
- **Not yet**: no test.
- **Retired**: no longer a check.

| ID | Check | Status | Where, or what is missing |
|---|---|---|---|
| G01 | One Murderer, one Ghost | Has a test, no ID | `functions/test/run.test.mjs` |
| G02 | Different characters; hosts are the Professors | Has a test, no ID | `functions/test/night.test.mjs` ("hosts get the Professors") |
| G03 | Characters not in play leave no clue | Not yet | |
| G04 | The motive is one of the 19 | Not yet | |
| G05 | Seat fairness, both host seats included | Not yet | Needs the host seats in the fake-players run |
| G06 | Motive and character fairness | Not yet | |
| G07 | Solvable at dial 3 | Partly | Only the motive is proven (G32). The Murderer and the Victim are not. |
| G08 | Still solvable at dial 1 | Not yet | Before the second full tech run or after the party is Jon's call |
| G09 | No single clue before Act 6 gives away the Murderer | Not yet | |
| G10 | Clues name a trace, never a person | Has a test, no ID | `functions/test/finale.test.mjs` |
| G11 | Every trace in a clue is in play | Has a test, no ID | `functions/test/finale.test.mjs` |
| G12 | Level 3 second option is in play | Has a test, no ID | `functions/test/finale.test.mjs` |
| G13 | Levels 1 to 5 each give a picture | Has a test, no ID | `functions/test/finale.test.mjs` |
| G14 | Affection rolls; Irwin maxed; Salem starts at 3 | Has a test | `functions/test/night.test.mjs`, `functions/test/parlour.test.mjs` |
| G15 | Irwin and Zimothy never say anything false | Partly | Zimothy's lines: the G18b test. Irwin's countdown: the G34 test. The older test of their secret lines went with them on 23 Oct. |
| G16 | Granolia's lines only leave things out | Has a test | The G18b test: what she rules out at each level. (Reworded 23 Oct: the wrong-blank tests went with her secret lines.) |
| G17 | Salem's ladder | Partly | The G18b test in `functions/test/solving.test.mjs` (backwards at 1 to 3, nothing to trust at 4, straight at 5), and he stays at 4 or below unless petted (`functions/test/parlour.test.mjs`). His bag clues: G49. Not checked: that no case is solvable from Salem's lines alone. |
| G18 | Boo's ladder | Partly, no ID | Inside the G18b test: what she rules out at each level. Her words at each level are not checked. |
| G18b | Every cat line only rules out wrong answers | Has a test | `functions/test/solving.test.mjs` ("G18b every cat line, at every level, in Acts 2 and 4") |
| G19 | Irwin wins any disagreement | Not yet | |
| G20 | Everyone in exactly one group | Has a test, no ID | `functions/test/station.test.mjs`, `functions/test/act4.test.mjs` |
| G21 | Murderer and Ghost never in one group | Has a test, no ID | `functions/test/station.test.mjs` |
| G22 | Same seed, same case | Not yet | No case seed is stored yet. Replay by seed is a card on the board. |
| G23 | Spill the Beans | Partly, no ID | `functions/test/safeguards.test.mjs`. "The new case passes G01 to G21" is not checked. |
| G24 | Dial starts at 3, stays 1 to 5, never resets | Partly, no ID | `functions/test/finale.test.mjs`. Today a Spill the Beans restarts the dial (`functions/test/safeguards.test.mjs` expects it), but the Canon says the dial never resets. |
| G25 | 12 sets: five, five, two | Has a test | `functions/test/parlour.test.mjs` |
| G25b | Parlour Game times and spacing (Act 4: waiting on the phone) | Has a test | `functions/test/parlour.test.mjs`; the Act 4 exception in `functions/test/act4.test.mjs` ("Act 4 Parlour Games wait on the phone"), no ID |
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
| G38 | No hidden events in any act | Partly | The test walks Act 2 only. Extend it to every act. |
| G39 | Every bag clue fits the bag it is about | Has a test | `functions/test/bagclues.test.mjs`; also in `npm run checks` |
| G40 | No bag clue names an item, a bag number or a person | Has a test | `functions/test/bagclues.test.mjs` |
| G41 | Every clue word sits in two or three in-play bags | Has a test | `functions/test/bagclues.test.mjs`; also in `npm run checks` |
| G42 | The bag solver at dial 1 | Not yet | |
| G43 | Every bag has two clue words | Has a test | `functions/test/bagclues.test.mjs`; on the real packing, Jenna's checks |
| G44 | Every Act 2 cat visit gives a hint and a bag clue | Has a test | `functions/test/solving.test.mjs`; the fake night |
| G45 | Two families stand for every guest after Act 2 | Has a test | `functions/test/solving.test.mjs`; also in `npm run checks` |
| G46 | One guest's bag clues never pin one bag | Has a test | `functions/test/bagclues.test.mjs`; also in `npm run checks` |
| G47 | Every group visits every room once | Has a test | `functions/test/act4.test.mjs`; also in `npm run checks` |
| G48 | Boo speaks to every group in Act 4 | Has a test | `functions/test/act4.test.mjs` |
| G49 | Salem's bag clue: wrong at 1 to 3, right at 5 | Has a test | `functions/test/bagclues.test.mjs`; also in `npm run checks` |
| G50 | The memory match: 7, 10, 14 pairs, all fourteen traces | Has a test | `functions/test/solving.test.mjs`; also in `npm run checks` |
| G51 | Zimothy's and Boo's cross-offs | Has a test | Inside the G50 and G52 tests (`functions/test/solving.test.mjs`, `functions/test/act4.test.mjs`); also in `npm run checks` |
| G52 | Every Act 4 reward paid by the cap | Has a test | `functions/test/act4.test.mjs`; the fake night |
| G53 | Every bulletin 2 line points at the real family (was G40) | Not yet | `functions/test/screen.test.mjs` checks only the rehearsal stand-in at the dial's level. No line is checked against the real family. |
| F01 | All seven acts run | Has a test, no ID | `functions/test/run.test.mjs`, `scripts/test/fake-players.test.mjs` |
| F02 | Host seats played by bots, no different | Not yet | The fake players have no host seat |
| F03 | A dropped phone rejoins | Has a test, no ID | `functions/test/night.test.mjs` |
| F04 | Every role screen has the same layout | Has a test, no ID | `functions/test/windows.test.mjs` |
| F05 | Parlour Game screens read alike | Has a test, no ID | `functions/test/windows.test.mjs` |
| F06 | Every role card needs the same tap | Not yet | The old F06 (innocent event screens) is retired: no act has hidden events. |
| F07 | Sliders behave the same after a Parlour Game | Partly | G29 covers the odds and sizes |
| F08 | Every phone gets each window at once (Act 4: waiting on the phone) | Has a test, no ID | `functions/test/windows.test.mjs`; the Act 4 exception in `functions/test/act4.test.mjs` |
| F09 | No waiting-for-players screen | Not yet | |
| F10 | A window never closes early | Has a test, no ID | `functions/test/windows.test.mjs` |
| F11 | Blackout messages hold 15 seconds | Not yet | Built (15 seconds, then a hide button) but untested |
| F12 | Puzzles appear on the chime | Not yet | |
| F13 | Parlour Games are the only events | Has a test, no ID | `functions/test/parlour.test.mjs`, `functions/test/windows.test.mjs` |
| F14 | The Cats tab never shows a number | Not yet | |
| F15 | Act 4 shows your affection and the group's | Has a test, no ID | `functions/test/night.test.mjs` |
| F16 | Ten minutes a room, then the reward anyway | Has a test, no ID | `station/test/study.test.mjs` (the study), `functions/test/act4.test.mjs` (the G52 test) |
| F17 | Two minutes for picks; Murderer, Motive, Victim | Has a test, no ID | `functions/test/finale.test.mjs` |
| F18 | The dial graph and the dial's journey | Partly, no ID | `functions/test/finale.test.mjs` checks the graph from the dial log. The dial's journey in the end credits is not checked. |
| F19 | A Parlour Game returns the phone to where it was | Has a test | `play/test/windows.test.mjs` |
| F20 | One player at a cat at a time | Has a test | `functions/test/solving.test.mjs`, `scripts/test/fake-players.test.mjs` |
| F21 | Everyone always has a next step | Has a test | `functions/test/solving.test.mjs`, `scripts/test/fake-players.test.mjs` |
| F22 | Not yet, the same on every phone, no penalty | Not yet | Built (`deal.notYet`, two minutes back in the queue) but untested |
| F23 | No cat sits idle while someone waits | Not yet | Built (`deal.sendNext` calls the longest-waiting guest) but untested by ID |
| F24 | The supper chime waits for everyone, or Supper's ready | Has a test, no ID | `scripts/test/fake-players.test.mjs` (the fake night's Act 2 line) |
| F25 | No motion sensor, no slip | Not yet | Built (the phone never reports a slip without a reading) but untested |
| F26 | Salem's colours reach every phone within half a second | Not yet | The colours are timestamps on the server's clock; the half second is not measured |
| F27 | `chime-phone` at every look-at-your-phone moment | Partly, no ID | `functions/test/screen.test.mjs` checks it at supper and in Act 4 |
| F28 | Bracketed stand-ins on a rehearsal night | Has a test, no ID | `functions/test/case.test.mjs` (the rehearsal walk), `functions/test/act4.test.mjs` (the rehearsal rooms) |
| L01 | No sealed content in the repo or its history | Partly | `npm run checks` (the leak group: no sealed file name in the tracked files or the history), `scripts/test/checks.test.mjs`. Not yet: the scan of tracked JSON for a sealed shape beyond the packing (L06). |
| L02 | No sealed text in any output | Has a test, no ID | `functions/test/case.test.mjs`; the fake-players run prints "Seal: PASS" |
| L03 | A rehearsal never reads the secrets | Partly, no ID | `functions/test/case.test.mjs` |
| L04 | Only Jenna's account opens sealed content | Has a test, no ID | `functions/test/rules.test.mjs` (skipped unless `npm run test:rules` runs the emulator), `functions/test/steward.test.mjs` |
| L05 | The lean table is not in the repo or readable by Jon | Has a test | `functions/test/parlour.test.mjs`, `functions/test/rules.test.mjs` |
| L06 | The packing is not in the repo or readable by Jon | Partly | `npm run checks` (no tracked JSON shaped like a packing); `functions/test/rules.test.mjs` covers `sealed/*` for Jon's account |
| L07 | The Parlour TV never shows anything sealed or about one player | Partly, no ID | `functions/test/act4.test.mjs` (the rooms' public docs) and the night-walk seal checks; not by ID |
| L08 | Sir Irwin's prompts never contain a clue word | Has a test | `functions/test/bagclues.test.mjs`; also in `npm run checks` |
| PK1, PK2, LN1, RP1 | Jenna's checks on the real content | Has a test | `functions/test/steward.test.mjs` (the checks op); `functions/lib/checks.js` |
| (old) | Innocent event screens need a tap (the old F06) | Retired | No act has hidden events (closed 22 Oct) |
| (old) | Checks on hidden-event copy for Acts 4 and 6 | Retired | Same reason |
| (old) | Biggest Rebel, Crowd Pleaser, Kindred Spirits, Sworn Rivals | Retired | Dropped 22 Oct; G31 covers the end-credit awards |

---

## Not designed yet — don't invent these

Nothing open today. The bags are decided (they stay, 23 Oct: Act 2 bag clues about the Murderer, Act 4 bag hints about the Ghost). Act 4's games are designed: see `docs/solving-the-case.md` and the 23 October handoff, sections 9.6 to 9.9.
