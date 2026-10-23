# Cat Info — Sirwin Manor

**Status:** consolidated 26 Aug 2026 from the Murderwin Mystery Party session. This is the register document — every line of cat dialogue gets written against it.

**25 Sep 2026:** the Canon page (link in CLAUDE.md) wins where the two disagree. Folded in below: Salem's surname is **Crookshank**; Boo is terse (five words, then done); Zimothy shades money answers; the trust ladder is stated at the top of the night (if Irwin and anyone disagree, Irwin is right); a failed affection roll gets an in-character deflection line, no penalty. **26 Sep 2026, decided:** Granolia *misremembers* — what she tells you is true except for exactly one detail (a room, a time, a count, a place, a crowd…), which is wrong. She never omits, never trails off at the gap, never corrects herself. Section 2 and 6 wording below is updated to match.

**22 Oct 2026 (handoff §6 and §6b; wins over everything below).** Every cat's hint comes from the open Cat Hint Lines bank (`seed/cat-lines.json`), picked by the player's affection level. A cat only ever rules out WRONG families or motives. Never the truth.

| Cat | 1 | 2 | 3 | 4 | 5 |
|---|---|---|---|---|---|
| Salem | Backwards | Backwards | Backwards | Coin flip | Straight |
| Zimothy | One motive, curt | One motive, civil | Two motives | Whole family | Family + bonus motive |
| Boo | A look | "Ew. Do I know you?" | One motive, five words | A family, chatty | Family + bonus motive |
| Granolia | Long ramble, nothing | Half a motive name | One motive | Two, forgets the third | Whole family |

- **Salem:** everyone starts at 3, whatever their profession. The Parlour Games take him no higher than 4. Level 5 comes only from petting the real Salem: Jon's Host tab button, for anyone but Jon and Susan, kids included. When he is backwards he points AT a wrong answer, so he never rules out the truth. Nobody can solve the case from Salem alone.
- **Boo** speaks from level 3 (one motive, five words) and is chatty at 4.
- **Zimothy** gives at least one motive at every level.
- **Granolia's** hint depends on affection like the others'.
- **Profession** still seeds the starting affection for Zimothy, Boo and Granolia, never Salem.
- **Rooms:** Granolia in the Study (upstairs), Salem in the Orangerie, Zimothy in the Library (the dining room), Boo in the Entryway.
- **Hosts:** Granolia the study light puzzle, Zimothy the memory match, Boo the Parlour Games, Salem the final picks. Sir Irwin hosts the Relay Drawing and the trace reveal.
- **New "Trusting" lines** (handoff §6):
  - Salem: "Most days, he's got it backwards, so flip whatever he tells you. Win him over and he might set it straight. Only a true friend gets it right every time."
  - Boo: "The more she likes you, the more she'll say. Bore her and you get a look. Win her over and she might be useful."
  - Zimothy and Granolia keep their current lines.

**23 Oct 2026 (Jon; wins over everything below).** The cats' secret lines are retired (decision secretLines). A cat's hint line is now all it says, at the rung of its ladder above. Gone: the secret middle between a greeting and a sign-off, the affection roll and its brush-off lines, Granolia's one wrong detail, and Salem's secret line that flipped on its own. The Act 2 safe is taken out too, so no cat hands over numbers for a puzzle. Where the sections below describe those, they are design history.

---

## 0. THE FOUNDING RULE — nobody addresses it

**[DECIDED]** The animals talk. Nobody in the fiction ever remarks on this. No explanation, no translation conceit, no "did that cat just —". The cats speak, people answer, life continues.

Why this is the strongest option: it needs no exposition in a game where players don't read, it can never be broken because there is no rule to break, and the silence is funnier than any explanation would be.

**Writing rules that follow:**
- No cat ever comments on its own ability to speak.
- No NPC, bulletin, or app copy ever hangs a lantern on it.
- Cats are treated as household members with opinions, not as a magic effect.
- Never write a cat *sound* into dialogue — no "meow," no purring described. They just talk.

> ⚠️ Fragile in exactly one place: an improvising human. If a guest says "wait, the cat talks?" the Detective answers the question as though it were about a person. Worth briefing Susan on.

---

## 1. THE TWO-LAYER MODEL 🔑

**[DECIDED]** Cat information exists at two layers, built into the data from day one.

| | **Base layer** | **Personal layer** |
|---|---|---|
| What it is | How the cat works for everyone | How the cat works *for you* |
| Set by | The cat's fixed nature | Your affection + your profession |
| Example | Salem inverts things he's confident about | Salem likes you because you're the Farmer |
| Where it shows | Room screens, shared moments | Your device only |

The base layer is the cat's **distortion type** — the fun way that cat twists information. The personal layer is **access** — whether you get the good version, the short version, or nothing.

Keeping these separate means the room can collectively learn "Salem gets things backwards" without that knowledge telling anyone what Salem said to *you*. The public fact is a rule; the private fact is a clue.

---

## 2. THE FOUR DISTORTION TYPES

Deliberately four different *shapes* of unreliability, not four dials of the same one. A player should never be able to treat two cats the same way.

| Cat | Distortion | The player's problem |
|---|---|---|
| **Salem** | **Inverted** — confidently backwards | Is this one of the wrong ones? |
| **Zimothy** | **Withheld** — accurate but rationed | What is he not telling me? |
| **Boo** | **Gated** — excellent, if she'll speak | How do I get in? |
| **Granolia** | **Garbled** — true but one detail is wrong *(retired 23 Oct: she now forgets instead; at 4 she names two and forgets the third)* | Which detail? Check it against Irwin. |

None of them is "random." Every cat is *legible* once you understand them — which is the whole pleasure. The middling cat you haven't figured out yet is more dangerous than the liar you have.

---

## 3. SALEM CROOKSHANK — the long-time groundskeeper

**[DECIDED] Canon phrasing: "the long-time groundskeeper."** Not decorative — the tenure is what licenses his confidence. He's been here longer than anyone, which is exactly why nobody questions him when he's wrong, and why he doesn't bother questioning himself.

**The reference:** Groundskeeper Willie without the accent. A gruff old handyman who mutters *at* you rather than talks *with* you.

**[DECIDED] He has no interpersonal relationships.** The load-bearing detail. Salem isn't lying to deceive anybody — he has no agenda because he doesn't care enough about people to have one. He is simply, magnificently, **confidently wrong**.

**Affinities:** close to the **Farmer** and anyone who does manual labor — possibly the Sergeant Major (to be reviewed). *(22 Oct: flavour only. Salem's starting affection is 3 for everyone; see the note at the top.)*

---

## 4. ZIMOTHY CLAWFORD, ESQ. — the old family solicitor

**[DECIDED] Name is Zimothy** — Timothy with the cat already baked in (replaced the earlier "Zimmerton").

**Distortion:** withheld — accurate but rationed. Openly transactional.

**[DECIDED] Biased by class:** profession buys access, not niceness. The Banker and Solicitor-adjacent roles get the good information; the groundskeeper's mate gets stonewalled. Some players simply cannot reach Zimothy this game and must ask a person who can — that's the face-to-face corroboration doing real work. *(22 Oct: his ladder gives at least one motive at every level, so nobody is shut out; low affection only gets less.)*

His gate feels *professional*, in contrast to Boo's (below).

---

## 5. MISS BOO LARUE — family friend and socialite

**[DECIDED] Canon phrasing: "family friend and socialite."** Flapper aesthetic.

**Structurally important: Boo is not staff.** She was taken in *socially*, not employed — a peer of the hosts. That's why her gate reads as personal rather than professional: Salem and Zimothy withhold on the job; Boo withholds because she's decided about you.

**[REVISED] Not a snob — an alley cat who became a society lady.** She needs **affection 4+ before she'll speak at all**, because she's been burned, not because she's snobbish. *(22 Oct: she now speaks from level 3, one motive in five words, and is chatty at 4; see the note at the top.)* Guardedness dressed up as glamour.

**Voice and behavior:**
- Means well but had a rough upbringing; cautious with information.
- Young at heart — wants to party at all hours.
- The way in isn't flattery, it's showing her a good time. She responds to **glamour and sparkle** (Zimothy wants status; Boo wants style).
- More open to the **Influencer** and the **Medium** — both performers; she trusts people who are also putting on a show.
- When comfortable, the polish drops and the alley cat slips back through.

---

## 6. GRANOLIA LICKSPITTLE — the charity case

**[DECIDED] Canon phrasing: "taken in by the family when no one else would."** The one you describe by saying *"well — at least she has a good personality."*

This explains almost everything about her: secluded in the study because she's never been absorbed into the household; the other cats don't take to her because she arrived with no standing; entirely without malice because she has **nothing to protect and no position to defend** — the only cat in the house who isn't guarding something.

She snorts. She breathes heavily. She's fat. She licks everything. She is weird and slightly gross and completely without malice.

**Names:**
- **[DECIDED] First name: Granolia** — Granola crossed with Magnolia. Period flower name with the snack still audible inside it (same trick as Zimothy).
- **[DECIDED] Surname: LICKSPITTLE** — the real word, a grovelling toady, so it passes as a genuine Victorian surname while being thoroughly disgusting. Nonsense spelling "Licksplittle" was considered and dropped. (Other surname options pitched: Dewey, Marginalia, Bartleby, Snerd, Footnote, Crumb.)
- **Open question:** should the "Grossnola" nickname be canon?

**Behavior and mechanics:**
- Honest but forgetful. She doesn't mean to lie — she just misremembers, so exactly one detail in what she tells you is wrong (a room, a time, a count…) and she is cheerfully confident about all of it. Not gatekeeping; **you can't buy her affection**. *(22 Oct: her hint line now depends on affection like every cat's; see the note at the top.)*
- She hands you the whole story with one wrong piece — the cross-check engine the core loop runs on. You find the bad piece by checking her against someone reliable. *(23 Oct: retired with the secret lines. Her hint lines never get a detail wrong; she rambles, halves a name or forgets one, by affection.)*
- She *wants to learn*, so she's close to the knowledgeable roles: **Librarian, Scientist, Professors**, and the **Baker** (she'd love the Baker off the bat).
- Lives alone in the study — the best-equipped room — so visiting her is a deliberate trip.
- Earlier "circus runaway / Barnum" concept was scrapped in favor of the nerd.

---

## 7. HOUSEHOLD STRUCTURE 🔑

Once all four descriptors existed, a shape appeared that nobody designed:

| Cat | Standing | How they came to be here |
|---|---|---|
| **Salem** | Staff | Employed. Longer than anyone. |
| **Zimothy** | Staff | Professional. Retained, not hired. |
| **Boo** | Not staff | Taken in **socially** — a peer, a friend of the family. |
| **Granolia** | Not staff | Taken in **out of pity** — when nobody else would. |

**Two employees and two dependents, and the dependents are on completely different terms.** Boo arrived as an equal; Granolia arrived as a kindness. This does the work of a backstory without anyone having to read one — it explains why Boo's gate feels personal while Zimothy's feels transactional, why Granolia is alone in the study, and why she's the only cat guarding nothing.

---

## 8. HOW CATS DELIVER INFORMATION

- **[DECIDED] No cat speaks aloud.** All cat dialogue is text on screens. Audio is generic, pre-recorded atmosphere only (chimes, crackle, thunder) — never spoken information.
- **Changed 22 Oct.** In Act 2 each guest meets all four cats alone, one at a time, on their own phone. One of the four, picked at the deal, gives a real hint; the other three only greet. In Act 4 a cat talks to a whole group at once, on the group's average affection, and the cat station never sends a group to Granolia (her Study holds the light puzzle; settled by default, Jon may change it). What a cat says is on phones, never on a room screen.
- **Profession seeds starting affection.** Each cat has a different relationship to profession: Zimothy respects status, Boo responds to glamour, Granolia loves learners. Salem cares about labor (not people), but since 22 Oct his start is 3 for everyone.

## 9. CATS IN THE CORE LOOP

- ~~Act 2, beat 2 is the **cat encounter**: dispersed, four cats, four rooms. Everyone is met by a cat, gets a quick in-fiction explanation of affection, then receives information.~~ Replaced 22 Oct, see §8.
- ~~**[DECIDED] Cats deliver the inputs the puzzle requires**, not just clues. Worked example: Salem gives three sets of three numbers and says *"I'd use these three first."* He is the least trustworthy cat in the house. Do you believe him?~~ Retired 23 Oct: the Act 2 safe is taken out, so no cat gives numbers for a puzzle.

---

## THE CAST

- **Sir Irwin** — the dog
- **Salem Crookshank** — the long-time groundskeeper
- **Zimothy Clawford, Esq.** — the old family solicitor
- **Miss Boo LaRue** — family friend and socialite
- **Granolia Lickspittle** — the charity case
