# Sirwin Manor — How the Case Gets Solved

Written 21 October 2026, updated 22 October from `docs/handoff-2026-10-22.md` (which wins where this doc disagrees), 23 October (what is built, open decisions, what to watch in the practice game; then Jon retired the cats' secret lines and took the Act 2 safe out) and 24 October from `docs/handoff-2026-10-23.md` (all four cats in Act 2, the bag clues, Act 4's four rooms, the game names; built that day).
Canon wins any other disagreement. If something here conflicts with Canon, stop and ask Jon.

This doc says **how** clues reach players across the night.

**What is open and what is sealed** (changed 22 Oct). The W-O-O-F News lines, the cat hint lines and Irwin's lines are **open banks**: every line in them is written, Jon may see them, and they may live in the repo. Only the game's pick is secret: which family is real, which line plays, which motive a cat rules out. The pick is made at the deal and never shown to Jon.

The banks live in three Claude Docs (linked from the handoff): the W-O-O-F News Recording Script, Cat Hint Lines, and The Relay Drawing · How to Play.

The game plays the repo copies: `seed/woof-news.json`, `seed/cat-lines.json`, `seed/bag-lines.json` (the bag clue templates and Sir Irwin's prompts), and the lines in `functions/lib/deal.js`, `act4.js`, `screen.js` and `hosts.js`. The repo copy is what plays. If you change a line in a Claude Doc, ask Claude Code to copy it in before the second full tech run (by Wednesday 11 November; there is no freeze date).

---

## Three answers, three tracks

Players must name three things at the end. Each has its own track through the night.

| Answer | Narrowed by | Closed by |
|---|---|---|
| **Motive** | Acts 2 to 4, a little more each act | Irwin's countdown at dessert (Act 5) |
| **Victim** (the Ghost) | Act 4 bag hints about the Ghost's bag | The Study light puzzle (Act 4) |
| **Murderer** | Act 2 bag clues about the Murderer's bag, and what the bags hold | The trace reveal (Act 6) |

**The bag rule** (stated in the rules deck in Act 1): a bag clue in Act 2 is about the Murderer; a bag clue in Act 4 is about the Ghost. Only bags and traces ever point at a person.

---

## The night's clue path

| Act | Motive clue | Other clues |
| --- | --- | --- |
| 1 · The Invitation | None | Characters and rules |
| 2 · Lights Out | W-O-O-F News bulletin 1 crosses off **exactly one** family. All four cats give each player a private motive hint. | Role reveal, the bag peek, and from every cat a bag clue about the Murderer |
| 3 · Supper | W-O-O-F News bulletin 2 hints at the real family, plainness set by the dial | Table shares; the bags come to the table |
| 4 · Behind Closed Doors | The Library (In Duplicate) and the Entryway (Boo's Catwalk) each cross off one wrong motive for the group. | The Study (Granolia's Lightbulb Moment) shows the Ghost's trace; every room's cat gives a bag hint about the Ghost |
| 5 · Dessert | Irwin's countdown settles the motive | |
| 6 · The Final Hour | None | 2 Parlour Games, Relay Drawing, then the trace reveal (the Murderer) |
| 7 · Unmasked | | Picks, closing bulletin reveal, end credits |

Act 3 now has a clue (22 Oct). This replaces "no new motive clues in Act 3".

### Motive families

Five families. Players never see the family names. They are only the structure the case deal uses (`functions/lib/families.js`).

- **Food:** the pie, the missing snacks, the chewing.
- **Bathroom:** the empty roll, the seat left up, the dairy air, the sneeze.
- **Screens:** the deleted progress, the loud gadget, left on read, the charger, reply all.
- **Out and about:** the lane, the door, the shopping cart.
- **Personal slights:** the anniversary, the stained top, the grammar, the spoiler.

Rules:
- A clue that rules out a family or a motive **never** rules out the real one. Every cat, every bulletin, every room only ever rules out wrong answers.
- Which family is real is decided when the case is dealt, like everything else.

---

## W-O-O-F News

The news team: Ava Waves (studio anchor), Mic Cameron (field reporter), Haley Stratton (weather), Mitt Kickwell (sports). Ava and Mic front all three bulletins; weather and sports are for fun. Every line is in the W-O-O-F News Recording Script.

The cast (Jon, 24 Oct): **Susan plays Ava Waves** and **Jon plays Mic Cameron**. Susan reads bulletin 1's opening and sign-off on camera, all of bulletin 2, and the closing bulletin's studio opening and close; Jon reads the closing bulletin's four field parts outside.

**Bulletin 1 · Act 2, lights out · video.** Ava (Susan) on camera for the opening and sign-off; the family line plays over B-roll. Always clarity level 3. Crosses off exactly one wrong family. Five family clips plus the opening and sign-off. Sign-off: "Don't touch that dial! Stay tuned for more updates."

Bulletin 1 and the closing bulletin play as video on the Parlour TV once Jon ticks The bulletins are videos on the Game night page (Jon, 23 Oct; built 24 Oct); until then the brain plays the recordings and the TV shows the words. Each part is its own file; a part with no video file is skipped, and the words stay on the screen.

**Bulletin 2 · Act 3, near the end of supper · audio.** Plays on the HomePods (the Orangerie's included), captions on the iPad. Read by Susan as Ava Waves (bulletin2Voice, Jon 24 Oct). She knows which family each line points at, and Jon accepted that (bulletin2Known, 24 Oct). 25 lines: 5 families × 5 dial levels. Every level points at the real family; level 1 is very obscure, level 5 is plain. Jon arms it from his host phone; it plays at a random moment 3 to 5 minutes later. The arm screen says only "Armed", never the line. Sign-off teases Irwin's "pup-lic address". (This replaces the older Bulletin 2 design that ruled out single motives.)

**Bulletin 3 · Act 7, the reveal · video.** See "Act 7" below.

---

## Act 2, Lights Out

How it plays, start to finish (Jon's final plan, 23 Oct; built 24 Oct):

1. **Lights out.** The room goes dark and the chime sounds.
2. **Every phone shows its role** on the same-looking screen. Everyone taps to continue.
3. **W-O-O-F News bulletin 1** crosses off exactly one wrong family for everyone.
4. **The bag peek.** Every phone: take a quiet look inside your own bag, here in the Parlour, and show nobody yet.
5. **Every player visits all four cats**, one guest at a cat at a time, called by the phone.
6. **Every cat gives real information**: one motive hint and one bag clue about the Murderer, both at the rung of that cat's ladder set by its affection for the guest at the moment of the scan. Both are saved on the phone's Clues tab.
7. **Each guest has two wrong families** of their own, picked at the deal from the three the bulletin left. A whole-family line names one of those two; a single-motive line names a motive inside one of them, or inside the family bulletin 1 already crossed off. So after Act 2 at least two families always stand for any one guest (G45): nobody can name the real family alone before supper.
8. **Parlour Games pop up** at random times (five planned in Act 2; see `docs/parlour-games.md`).
9. **The chime calls everyone to supper** in the Orangerie: on its own once everyone has seen all four cats, or when Jon presses Supper's ready. A guest with cats still unvisited gets those cats' lines on the phone as a note.

Players may tell nobody anything in Act 2.

**No hidden events for the Murderer or the Ghost in any act** (closed 22 Oct). Their only "events" are the Parlour Games: the same questions as everyone, and their answers move the clarity dial.

### The phone runs the queue

- Each cat's room has a printed code. The player scans it, and the cat speaks on their phone, in silent text.
- **Only one player at a cat at a time,** so nobody overhears a private hint.
- Visits are a queue, not a schedule. **"Not yet, call me later"** is on every phone when it is called: it puts the guest back in the queue for two minutes, no penalty, and looks the same for everyone. No cat sits idle while someone is waiting for it.
- A guest who has not scanned in after four minutes, or is still with a cat after five, gets the cat's lines on the phone and the next guest is called.
- The phone always names the next cat and room, or sends the player to supper.

Phone direction screens (built, `functions/lib/deal.js`):
1. In the Parlour: "Make yourself at home in the Parlour. You'll be called soon. Sir Irwin has ideas on the TV."
2. Your turn: "Granolia is waiting for you in the Study. Go alone, and don't keep her waiting." With On my way and Not yet.
3. Arriving: "Find the code in the room and scan it to say hello."
4. With the cat: "Read what the cat says. It is for you alone. Tap Done when you have read it."
5. Back in the queue: "No problem. You're back in the queue. We'll call you again."
6. All four seen: "You have seen all four cats. Tell nobody what you heard. The chime will call everyone to supper in the Orangerie."
7. Supper: "That's the chime! Supper is served in the Orangerie."

The greeting-only lines (the three cats that did not give a hint) are gone: every cat now gives a hint (24 Oct).

### Cat rooms

| Cat | Room |
|---|---|
| Granolia | The Study (upstairs) |
| Salem | The Orangerie |
| Zimothy | The Library (the real dining room) |
| Boo | The Entryway |

- No cat goes in the Parlour. Everyone waits there, with Sir Irwin's prompts on the TV, so a hint could be overheard.
- Supper is in the Orangerie. Jon sets the table before guests arrive, so Salem can stay there in Act 2.

### The bag clues

Full rules, templates and checks in `docs/sensory-bags.md`; the templates are in `seed/bag-lines.json`.

- A bag clue is **a compass, not a pointer**. It names a sense or a clue word (one of the fourteen), never an item, a bag number or a person (G40), and the word is in two or three of the bags in play, never one (G41).
- Each guest has **one true word** for the bag, so one guest alone never pins one bag (G46).
- Every cat's bag clue follows its ladder. Salem names a wrong word at 1 to 3 (still a word in two or three bags), a coin flip at 4, the right one at 5 (G49). At low rungs a cat gives only a sense, or nothing.
- In Act 4 each cat has its own set of lines (`act4` in `seed/bag-lines.json`) about **the Ghost's** bag, at the group's average affection.

## The cats' hint ladders

Every hint line is in the Cat Hint Lines doc. Every cat only ever rules out wrong families or motives. In Act 4 the ladder uses the group's average affection. Since 23 October (Jon retired the cats' secret lines) the hint line is all a cat says: no secret line beside it, no brush-off, no wrong detail from Granolia.

| Cat | 1 | 2 | 3 | 4 | 5 |
| --- | --- | --- | --- | --- | --- |
| Salem | Backwards | Backwards | Backwards | Coin flip | Straight |
| Zimothy | One motive, curt | One motive, civil | Two motives | Whole family | Family + bonus motive |
| Boo | A look | "Ew. Do I know you?" | One motive, five words | A family, chatty | Family + bonus motive |
| Granolia | Long ramble, nothing | Half a motive name | One motive | Two, forgets the third | Whole family |

**Salem:** everyone starts at 3 with him. Parlour Games cap him at 4. Level 5 unlocks only by petting the real Salem: Jon presses "Salem petted" on his host phone and picks the player. Everyone is eligible except Jon and Susan, kids included. When backwards, he points AT a wrong answer, so he never rules out the truth. Nobody can solve the case from Salem alone.

**Salem's unlock screen:** a badge with stars on Salem in the Cats tab. On tap: "Well, I'll be. Salem has chosen you. He likes the cut of your jib. You've earned his rarest honor: True Friend of the Groundskeeper. From now on, he'll tell it to you straight. Don't let it go to your head. And stay off the lawn."

Built: a True Friend sees this text when they open Salem on the Cats tab, and at 5 his hint line goes straight. His hint line is all he says: his secret line, which flipped on its own, was retired on 23 October with the other secret lines (G17 in `docs/test-plan.md`).

---

## Act 4, Behind Closed Doors

Four game rooms, pairs and trios, about an hour (Jon's plan, 23 Oct; built 24 Oct; `functions/lib/act4.js`).

**How it starts.** Jon presses Start Act 4 when everyone has settled after supper. Every phone gets a two-minute warning. Then `chime-phone`, the title card on the Parlour TV, and every phone shows its group as character portraits with a Locked in button. The rounds start when everyone is locked in, or two minutes later.

**The groups.** Three to five groups (at most five), pairs and trios. The Murderer and the Ghost are never in the same group. Information is shared only inside your group.

**The rounds.** Ten minutes each, on the server's clock, for every room. Every group visits each of the four rooms once (G47); a room never holds two groups. With five groups there are five rounds and one group waits in the Parlour each round. The group scans the room's code to begin (the same four codes as Act 2). A group that finishes early is paid at once and goes back to the Parlour; at the chime, a group that has not finished is paid anyway (G52).

| Room | Host | The game (its name since 24 Oct) | The reward |
|---|---|---|---|
| The Study (upstairs) | Granolia | Granolia's Lightbulb Moment: the light puzzle | **The Ghost's trace**, at the dial's level, plus a bag hint |
| The Library | Zimothy | In Duplicate: the memory match, three rounds, on the older iPad | **One wrong motive crossed off**, plus a bag hint |
| The Orangerie | Salem | Get Off My Lawn!: backwards red light, green light on the phones | A bag hint, which may be backwards |
| The Entryway | Boo | Boo's Catwalk: strike a pose when the music stops, on the wall | **One wrong motive crossed off**, plus a bag hint |
| The Parlour | Sir Irwin | No game: Sir Irwin's prompts on the TV, Parlour Games waiting on the phone | Nothing recorded |

- **Every cat reward uses the group's average affection with that cat** at the moment it is paid. The bag hints are about **the Ghost's** bag. The trace level comes from the dial, not from affection. The cross-offs happen whatever the affection.
- **Boo speaks to every group in Act 4**, at any affection (her one exception, G48).
- **The cross-offs** (Zimothy's and Boo's) never take the real motive, and never the same motive twice for one group, or one already crossed off for another group (G51). The game picks one the group might still have: inside the real family first, then any family the group has not ruled out.
- **Parlour Games wait on the phone in Act 4** and are played when the guest is free, never in a game room (`docs/parlour-games.md`).
- The old stations, the cat station, the bags station and the Free time card are gone (23 Oct). A group with no room this round reads "Nothing for your group right now. Make yourselves at home in the Parlour. Sir Irwin has ideas." with one of the tips below, the same tip for the whole group.

Phone direction screens (built, `act4.DIRECTIONS`; each room's game name is the card's title, with its line under it):
- The Study: "Granolia's expecting your group in the Study, upstairs."
- The Library: "Zimothy will see your group in the Library. Go together."
- The Orangerie: "Salem will see your group in the Orangerie. Bring your phones."
- The Entryway: "Boo is expecting your group in the Entryway. Mind the catwalk."

Parlour tips:
- "Have you crossed off everything you know?"
- "Compare what the cats told you. Do they agree?"
- "Remember, Salem usually has it backwards."
- "Look at the portraits. Every character carries a trace."
- "Only tell your group. The walls have ears. And whiskers."

### The Study: the Ghost's trace

The light puzzle's reward is **the Ghost's trace**, shown at whatever level the clarity dial is at the moment the group finishes (or when the ten-minute cap runs out).

- It uses the **same five-level trace reveal** as Act 6. No new art.
- It names the trace, never the person.
- The dial can move during Act 4, so two groups may see different levels. That's fine.
- **Default:** at level 3, the second option in the Study is never the Murderer's trace. In Act 6, the second option is never the Ghost's trace. Otherwise one reveal would spoil the other.

### In Duplicate (the trace memory match)

- **On the older iPad, on a small stand in the Library with Zimothy**, all night. Card backs look like file folders.
- **Three rounds: 7, 10 and 14 pairs**, always all fourteen traces as art (G50), the one exception to "characters not in play are set aside", so players get familiar with every trace. Shuffled fresh for each group.
- **No names on the cards,** only the traces.
- **Reward:** clearing the third board crosses one wrong motive off that group's list (G51 above). At the cap the group is paid anyway.
- **A standalone version** (`?kiosk=memory&play=1`) plays the same three rounds with no case and no clues, any time.

## Act 5: Irwin's countdown

All Irwin lines are on-screen text in his puppy voice. Nothing is recorded. Reuse his five moods art.

Irwin shows a countdown of motive cards. The dial sets how many:

| Dial | Cards | Irwin says |
|---|---|---|
| 1 | 5 | "I sniffed the whole house! Twice! It's one of these five. Is that too many? Can I still have a treat?" |
| 2 | 4 | "I sniffed really, really hard, and it's one of these four! Keep sniffing with me!" |
| 3 | 3 | "Ooh! It's one of these three! My tail is wagging, so I'm pretty sure!" |
| 4 | 2 | "It's one of these two! I'm sure! Well, mostly sure! Okay, very sure!" |
| 5 | 1 | "It's THIS one! I sniffed it out all by myself! Who's a good boy? Me!" |

- The real motive is always included.
- Filler comes from the real family first, then from families already ruled out.
- This replaces the 3/2/1 rule.
- Motive card art: "The last of the pie" shows **pizza**, not apple pie.
- Built (23 Oct): Irwin's Act 5 screen shows only his opener, the countdown line, the motive cards and his closer. His opener and closer are the first Irwin line in the workshop lists "What a cat says first" and "What a cat says last". The old secret middle line is gone for good: Jon retired the secret lines on 23 October, and nothing makes them any more.

---

## Act 6: the trace reveal

Irwin's lines, by level (replace the 5 Oct draft in READ-FIRST):

1. "I dug and dug, but all I found was a gray blob. Then again, everything looks gray to me. Want me to dig some more?"
2. "Ooh, it's got colors! I can't tell what it is, though. Is it a toy? Is it for me?"
3. "It's one of these two! I'd bet my toy on it. Not my good toy, though."
4. "I fetched it! Here it is! I don't know what it's called, but I fetched it!"
5. "I fetched it, and I even know its name! Can we play again? Please?"

Settled by default, as built: the deduction round comes after the bedroom door opens. Jon may change it.

**Trace linking is closed** (22 Oct). Players link traces to characters from the portraits, which show each trace. One gap: the Medium's portrait needs a candle (her trace is lilac candle wax). That's an art task for Jon.

---

## Act 7: the closing bulletin

Video that bookends the Act 2 bulletin. Order stays Murderer, Motive, Victim (F17). Susan (Ava, in the studio) and Jon (Mic, the four field parts outside) record generic lines; the game cuts in the three cards as B-roll, so neither needs the answer. Full script in `docs/handoff-2026-10-22.md` §7b. Then the end credits (§8).

Built (23 Oct; as video on the Parlour TV since 24 Oct, once The bulletins are videos is ticked on the Game night page; until then the brain plays the recordings and the TV shows the words): each name card appears only after its lead-in part has played, and pressing the next name cuts off whatever is playing. A part with no video file is skipped. The end-credit awards show only in the credits.

---

## Who hosts what

Flavor only: intro text in each character's voice, no change to play. Lines in `docs/handoff-2026-10-22.md` §6b.

| Host | Activity |
| --- | --- |
| Irwin | Sir Irwin Needs a Hand (the Relay Drawing), the trace reveal, the Parlour prompts |
| Granolia | Granolia's Lightbulb Moment (the Study light puzzle) |
| Zimothy | In Duplicate (the memory match) |
| Salem | Get Off My Lawn! (Act 4) and the Act 7 final picks |
| Boo | The Parlour Games and Boo's Catwalk (Act 4) |

---

## Checks for `docs/test-plan.md`

- **G32** At dial 3, a solver given every clue up to the end of Act 5 finds exactly one motive.
- **G33** Act 2 hints and bulletin 1 only ever rule out wrong families. The real family is never ruled out. Bulletin 1 crosses off exactly one family.
- **G34** Irwin's countdown: five cards at dial 1, four at 2, three at 3, two at 4, one at 5. The real motive is always included. Filler comes from the real family first, then from families already ruled out.
- **G35** The Study clue shows the Ghost's trace and never names a person.
- **G36** Level 3 second options follow the default above (Study never shows the Murderer's trace; Act 6 never shows the Ghost's).
- **G37** Replaced by G50 (24 Oct).
- **G38** No hidden events for the Murderer or the Ghost in any act.
- **G39** Every Act 2 bag clue fits the Murderer's bag; every Act 4 bag hint fits the Ghost's bag.
- **G40** No bag clue names an item, a bag number or a person.
- **G41** Every clue word a clue uses sits in two or three in-play bags, never one.
- **G44** Every Act 2 cat visit gives one motive hint and one bag clue, at the rung set at the scan.
- **G45** At least two families remain for every guest after Act 2.
- **G46** No single guest's Act 2 bag clues narrow the Murderer to one bag.
- **G47** Every group visits each of the four rooms exactly once; a room never holds two groups.
- **G48** Boo speaks to every group in Act 4.
- **G49** Salem's bag clue is wrong at 1 to 3 and right at 5.
- **G50** The memory match uses all fourteen traces, 7, 10 and 14 pairs, and never crosses off the real motive.
- **G51** Zimothy's and Boo's cross-offs never take the real motive, never the same one twice for a group.
- **G52** Every Act 4 reward is paid by the ten-minute cap.
- **G53** Every bulletin 2 line at every dial level points at the real family (was G40 until 24 Oct).
- **G18b** Every cat line, at every affection level, only rules out wrong answers (was G41 until 24 Oct).
- **F20** Only one player is at a cat's code at a time in Act 2.
- **F21** Every player is told where to go next. Nobody is ever left without a next step.
- **F22 to F24** Not yet, the queue never stalls, the supper chime (see `docs/test-plan.md`).

All of these are in `docs/test-plan.md` too, with where each one stands. The old G39 (one real Act 2 hint each) is retired: every cat gives a hint now.

---

## To check in the weekend practice

- **Does Irwin's countdown matter?** In a simulation where every clue was pooled and read perfectly, the room could name the motive almost every time, even at dial 1. So Irwin's countdown added little. Real players will not read every clue perfectly. Watch whether they can name the motive before dessert. Ask Jon about it only after the practice game.

---

## Not designed yet — don't invent these

- Dining Hall vs Library naming (Jon's open decision diningName). In the house that room is the Library (Zimothy's room), and the phones already call it "the Library" (the cat rooms in `seed/night.json`). "The dining hall" is left only in the workshop list "Blanks (retired)", Rooms tab, and its seed defaults. Since 23 October nothing reads that list: only the cats' secret lines had blanks, and they are retired. Nothing sealed needs remaking either way.
