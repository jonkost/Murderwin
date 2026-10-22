# Sirwin Manor — How the Case Gets Solved

Written 21 October 2026. Put this file at `docs/solving-the-case.md` in the repo.
Canon wins any disagreement. If something here conflicts with Canon, stop and ask Jon.
Everything here was decided with Jon on 21 Oct, and it is waiting to be copied into Canon.

This doc says **how** clues reach players across the night. It never says **what** a clue says. All clue wording, voiceover copy and cat hint text is sealed content (Rule 1): Jenna writes it, and it never goes in the repo.

---

## Three answers, three tracks

Players must name three things at the end. Each has its own track through the night.

| Answer | Narrowed by | Closed by |
|---|---|---|
| **Motive** | Acts 2 to 5, a little more each act | Irwin at dessert (Act 5) |
| **Victim** (the Ghost) | — | The Study light puzzle (Act 4) |
| **Murderer** | — | The trace reveal (Act 6) |

---

## The motive funnel

The 19 motives go from 19 down to one, starting vague and getting tighter.

1. **Act 1, The Invitation.** No clues. Characters and rules only.
2. **Act 2, Lights Out.** A voiceover rules out one or two motive families for everyone. Then each player's cat greeting gives one private hint that rules out another family. Different players get different hints, so nobody has the whole picture. About 8 motives left across the room.
3. **Act 3, Supper.** No new motive clues. The table shares and crosses off together.
4. **Act 4, Behind Closed Doors.** The cats give finer clues inside the family that's left, using the group's average affection. The memory match station crosses off one more (see below). About 3 or 4 left.
5. **Act 5, dessert.** Irwin settles it (see below). By the end of Act 5 the room should be able to name the motive.

### Motive families (draft, Jon approved the shape)

Five families. Players never see the family names. They are only the structure the generator uses. Match each to the motive IDs already in the repo.

- **Food:** the pie, the missing snacks, the chewing.
- **Bathroom:** the empty roll, the seat left up, the dairy air, the sneeze.
- **Screens:** the deleted progress, the loud gadget, left on read, the charger, reply all.
- **Out and about:** the lane, the door, the shopping cart.
- **Personal slights:** the anniversary, the stained top, the grammar, the spoiler.

Rules:
- A clue that rules out a family **never** rules out the real one.
- Which family is real is decided when the case is dealt, like everything else.

### Irwin's motive clue (Act 5)

Irwin never lies. The clarity dial at that moment decides how sure he sounds.

| Dial | Irwin says |
|---|---|
| 1 or 2 | It was one of these **three**. |
| 3 | It was one of these **two**. |
| 4 or 5 | It was **this one**. |

- The real motive is always one of the options.
- The other options come from **the same family** as the real motive, so they all sound believable.
- Reuse Irwin's five moods from the trace reveal on this screen.

---

## Act 2, Lights Out

How it plays, start to finish:

1. **Lights out.** The room goes dark and the chime sounds. A voiceover says someone has been murdered at Sir Irwin's party.
2. **Every phone shows its role** on the same-looking screen. Everyone taps to continue.
3. **The news flash.** A voiceover rules out a family or two of motives for everyone.
4. **Players go off alone,** in small waves, to different rooms.
5. **A cat greets each player** with one private hint (see rooms below). How much the cat says depends on affection.
6. **Parlour Games pop up** at random times (four in Act 2; see `docs/parlour-games.md`).
7. **The chime calls everyone to supper** in the Orangerie.

Players may tell nobody anything in Act 2.

**No hidden events for the Murderer or the Ghost in Act 2** (decided 21 Oct). Their Parlour Games already move the dial. Act 4's hidden events are unchanged for now.

### The phone runs the room rotation

- The phone tells each player where to go, for example: "Granolia is waiting in the Study."
- Each cat's room has a QR code. The player scans it, and the cat greets them on their phone.
- **Only one player at a cat at a time,** so nobody overhears a private hint. The phones send players off in waves to make this work.
- The phone tells the player when to move on: to the next room, or to supper when the chime sounds.

### Cat rooms

| Cat | Room |
|---|---|
| Granolia | The Study |
| Salem | The Orangerie |
| Zimothy | The Library (the real dining room) |
| Boo | The Entryway |

- No cat goes in the living room. Everyone waits there, so a hint could be overheard.
- Supper is in the Orangerie. Jon sets the table before guests arrive, so Salem can stay there in Act 2.

---

## Act 4, Behind Closed Doors

### The Study: the Ghost's trace

The light puzzle's reward is **the Ghost's trace**, shown at whatever level the clarity dial is at the moment the group finishes (or when the 15-minute cap runs out).

- It uses the **same five-level trace reveal** as Act 6. No new art.
- It names the trace, never the person.
- The dial can move during Act 4, so two groups may see different levels. That's fine.
- **Default (ask Jon if unsure):** at level 3, the second option in the Study is never the Murderer's trace. In Act 6, the second option is never the Ghost's trace. Otherwise one reveal would spoil the other.

### The small puzzle station: trace memory match

This fills the wait while other groups are in the Study.

- **On the iPad.** The group flips two cards at a time to find matching pairs. Where the iPad sits is not settled yet.
- **6 pairs, 12 cards.** Only traces of characters in play, shuffled fresh for each group.
- **No names on the cards,** only the traces.
- **Reward:** clearing the board crosses one wrong motive off that group's list. The game picks which one. It never crosses off the real motive, and it should pick one the group might still have.

---

## New checks for `docs/test-plan.md`

- **G32** At dial 3, a solver given every clue up to the end of Act 5 finds exactly one motive.
- **G33** Act 2 hints only ever rule out wrong families. The real family is never ruled out.
- **G34** Irwin's motive clue: three options at dial 1 or 2, two at dial 3, one at 4 or 5. The real motive is always included, and the others share its family.
- **G35** The Study clue shows the Ghost's trace and never names a person.
- **G36** Level 3 second options follow the default above (Study never shows the Murderer's trace; Act 6 never shows the Ghost's).
- **G37** Memory match uses only in-play traces, 6 pairs, and never crosses off the real motive.
- **G38** No hidden events for the Murderer or the Ghost in Act 2.
- **F20** Only one player is at a cat's QR code at a time in Act 2.
- **F21** Every player is told where to go next. Nobody is ever left without a next step.

---

## Not designed yet — don't invent these

- All clue wording, voiceovers and cat hint text (sealed; Jenna's job).
- Exactly how many families the Act 2 voiceover removes, and how the private hints are shared out.
- Where the memory match iPad sits.
- Whether the bags stay in Act 4.
- How players link a trace to a character in the Big Solve.
