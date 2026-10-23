# Sirwin Manor — Test Plan for Claude Code

Written 19 October 2026, updated 22 October (from `docs/handoff-2026-10-22.md`). Put this file at `docs/test-plan.md` in the repo.
Canon wins any disagreement. If something here conflicts with Canon, stop and ask Jon.

**More checks live in two newer docs.** Add them to this plan:
- `docs/parlour-games.md`: G25 to G31, F19 and L05.
- `docs/solving-the-case.md`: G32 to G41, F20 and F21.

---

## Why this exists

Jon is the host, the builder, **and a player**. He can never see the real answers. That means he can't check the game by reading it. He has to trust it by **running checks that only say pass or fail.**

Your job, Claude Code:
1. Write every check below as an automated test.
2. Make each one runnable with one command.
3. Show results on one simple page Jon can read at a glance.
4. **Never show Jon sealed content**, not even in an error message.

---

## The golden rule for every check

> A check reports **what** broke and **which seed** broke it. It never reports **what the clue says**.

- Good: `FAIL · G07 Solvable · seed tulip-4471 · solver found 2 possible murderers`
- Bad: anything that prints a kernel, a document text, an echo fragment, a motive-to-clue link, or a generated case's answer.

Every check gets a short ID (G01, F01, L01…) and a plain-English name.

---

## Stand-in clues (used for all of Jon's runs)

Rehearsals use stand-ins, never the real sealed content.

- **Label stand-ins** (default): each clue is just a label of where it came from and what it points at, in code only. Shown on screen as `Salem · Act 2 · clue 3`. Jon can see that a clue arrived at the right place and time without learning anything.
- **Motive 8 stand-ins**: motive 8's clue set is already burned for Jon, so it may be used as a "real-looking" practice case.
- Stand-in mode must be impossible to confuse with live mode. Show a big **REHEARSAL** banner on every screen.

---

## The three commands

| Command | Who runs it | What it does |
|---|---|---|
| `npm run checks` | Jon | Deals 1,000 random stand-in cases and runs every G check on each. Prints one score. Fine to run overnight. |
| `npm run rehearse` | Jon | One full dry run: all seven acts, eight fake players plus one seat for Jon, on the dev copy. Runs every F check. |
| `npm run checks:real` | **Jenna only** | Runs the G checks on the real sealed content. Prints only `PASS` or `FIX NEEDED · check ID`. Details go to Jenna's Steward view, never to the terminal. |

Plus: `npm run replay -- <seed>` re-deals one exact case so a failure can be reproduced and fixed.

---

## Group G · The case generator (every dealt case)

The generator runs these same checks **on party night** too. If a case fails anything, it quietly throws it away and deals again. A bad case must never reach the table.

**Roles and cast**
- **G01** Exactly one Murderer and one Ghost. They are different players. Everyone else is a Detective.
- **G02** Each player gets a different character from the 14. Characters are random, including Jon's.
- **G03** Characters not in play have no trace and no clues anywhere in the case.
- **G04** The motive is one of the 19. (Motive 8 excluded from live deals until its clues are rebuilt.)

**Fairness** (measured across all 1,000 cases)
- **G05** Every seat, including Jon's, lands Murderer and Ghost about equally often. No seat is favored.
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
- **G16** Granolia never says anything false (she may leave parts out).
- **G17** Salem follows his ladder: backwards at 1 to 3, a coin flip at 4, straight at 5. When backwards he points at a wrong answer, so he never rules out the real one. No case is solvable from Salem's lines alone.
- **G18** Boo follows her ladder: a look at 1, "Ew. Do I know you?" at 2, one motive in five words at 3, a family at 4, a family plus a bonus motive at 5.
- **G18b** Every cat line, at every level, only rules out wrong answers (also G41).
- **G19** If Irwin and any cat disagree, Irwin is the one telling the truth.

**Groups (Act 4)**
- **G20** Every player is in exactly one pair or trio.
- **G21** The Murderer and the Ghost are never in the same group.

**Replay and reset**
- **G22** The same seed always deals the exact same case.
- **G23** Spill the Beans: re-rolls victim, motive and Ghost. Keeps characters and affection. Only allowed up to the end of Act 5. The new case passes G01 to G21.

**Clarity dial**
- **G24** Starts at 3. Never goes below 1 or above 5. Never resets during the night.

**Parlour Games, Irwin and the awards** (full wording in the two newer docs)
- **G25** 12 sets a night: five in Act 2, five in Act 4, two at the start of Act 6.
- **G31** Awards use final affection, never the hidden leans.
- **G34** Irwin's countdown: five cards at dial 1 down to one at dial 5; the real motive always in.
- **G38** No hidden events for the Murderer or the Ghost in any act.

---

## Group F · The full dry run (eight fake players)

Fake players tap random choices, read at random speeds, and sometimes walk away mid-screen.

**It runs**
- **F01** All seven acts run start to finish with no crash and no stuck screen.
- **F02** The "Jon seat" is played by a bot like everyone else. Nothing about it is special.
- **F03** A phone that drops out can rejoin (or switch to the backup iPad) and lands back where it was.

**Nothing gives a role away**
- **F04** Every role's screen has the same layout and the same number of parts. Compare them automatically.
- **F05** Every Parlour Game screen takes the same time to read on every phone, whatever the role.
- **F06** Innocent screens also require a tap, so nobody stands out by tapping.
- **F07** After a Parlour Game, every player's sliders behave the same way, so a still marker is never a tell.

**Timing**
- **F08** All nine phones get each window at the same moment.
- **F09** No "waiting for other players" screen ever appears.
- **F10** A window never closes early.
- **F11** Blackout messages stay up for 15 seconds.
- **F12** Puzzles appear on the chime, not on arrival.

**Game rules**
- **F13** Parlour Games: Detectives' points move cat affection. Murderer and Ghost points move the clarity dial. These are the only "events" in the game.
- **F14** The cats tab shows the five-stop slider (Cold shoulder to Devoted). Never a number.
- **F15** Act 4 shows both your own affection and the group's average.
- **F16** Study puzzle: after 15 minutes the group gets the information anyway and moves on.
- **F17** Act 7: everyone gets two minutes to enter picks. The reveal goes Murderer, then Motive, then Victim.
- **F18** The clarity-dial graph at the end matches what actually happened. The end credits show the dial's journey: where it stood at the end of each act, its highs and lows, and the level each dial clue landed at (bulletin 2, Irwin's dessert clue, the Study trace, the trace reveal). Shown only after the reveal.

---

## Group L · Leak checks (Rule 1)

These protect Jon's ability to play. Run them with every other check.

- **L01** Search the whole repo and its git history. No sealed content anywhere: kernels, document texts, echo fragments, the code-to-motive manifest, generated cases, the dial mapping, the Parlour lean table, the Relay Drawing picture bank, bag contents. (The W-O-O-F News, cat hint and Irwin line banks are open and may be in the repo; the per-night pick never is.)
- **L02** No test output, log file, or browser console line contains sealed text.
- **L03** Rehearsal mode cannot read the real sealed content in Firestore. Prove it by trying and confirming it's refused.
- **L04** Jon's workshop account cannot open sealed content. Only Jenna's can.

---

## The results page Jon reads

Add a **Health** page to the workshop. Keep it calm and simple:

- Big text. One line per group.
- A green tick or a red cross, and a count. Example: `Case generator · 1,000 of 1,000 passed`
- Under any red cross: the check ID, its plain-English name, and the seed. Nothing else.
- The date and time of the last run.
- One "Run again" button.

If everything is green, show one sentence: **"All clear. The game is ready."**

---

## Build order

1. Write the G checks **alongside** the case generator, not after. (Generator is Tuesday 20 October.)
2. Label stand-ins and `npm run replay`.
3. Dev copy of the game, fake players, `npm run rehearse` and the F checks.
4. L checks.
5. Health page.
6. Hand `npm run checks:real` to Jenna before the freeze on Saturday 7 November.

---

## Not designed yet — don't invent these

Leave a clearly marked placeholder and skip the check:
- The bags (still an open question whether they stay)

Act 4's small puzzle is now designed: see the memory match in `docs/solving-the-case.md`.
