# Sirwin Manor — Parlour Games for Claude Code

Written 21 October 2026, updated the same day (four sets per act). Put this file at `docs/parlour-games.md` in the repo.
Canon wins any disagreement. If something here conflicts with Canon, stop and ask Jon.

"Parlour Games" is the new name (13 Oct) for the push and pull questions. The workshop and the code still say "push and pull". Rename them as part of this work.

---

## What happens on the night

- **Twelve Parlour Games a night:** four each in Acts 2, 4 and 6 (decided 21 Oct; this replaces "three a night").
- **They pop up at random times** during the act, so nobody knows when the next one is coming. The times are rolled from the case seed.
  - Defaults (Jon may change): at least 4 minutes apart, and none in the first 2 or last 2 minutes of an act.
  - If a phone is on another screen (a cat greeting, a puzzle), the Parlour Game shows on top. When it's done, the phone goes back to exactly where it was.
- **Every phone lights up at the same moment** with one set: three questions in a row, two answers each. Tap one.
- **No numbers, no scores, no "+1"** anywhere on any phone. Ever.
- **No "waiting for other players" screen.** The window never closes early.
- **If someone doesn't answer,** a random answer is picked for them when the window closes. No penalty.

---

## The bank

The bank holds **17 sets**. When the case is dealt, the game picks **12 different sets at random**, four per act, in a random order. **5 sets go unused** each night. Nobody knows which ones are coming, Jon included.

- No set is used twice in one night.
- The three questions inside a set always appear **in the order written**. Some sets build on themselves.
- The pick and the times use the case seed, so `npm run replay -- <seed>` gives the same sets at the same times.
- Jon edits the bank in the workshop. It is safe content (he wrote it), so it may live in the repo.

### The 17 sets

**1 · Orange juice**
1. Do you like orange juice? · *Love it* / *Not for me*
2. Ice in orange juice? · *Obviously* / *Absolutely not*
3. Pulp or no pulp? · *The more the better* / *Pulp is a crime*

**2 · Toilet paper**
1. Do you care which way the toilet paper hangs? · *Deeply* / *It's just paper*
2. Over or under? · *Over, of course* / *Under, of course*
3. Would you fix it at someone else's house? · *Already did* / *Wouldn't want to be rude*

**3 · Potatoes**
1. Potatoes: baked or fried? · *Baked* / *Fried*
2. Chips or fries? · *Chips* / *Fries*
3. Fries dipped in a milkshake? · *Genius* / *Disgusting*

**4 · Pizza**
1. Pineapple on pizza? · *Yes, please* / *Never*
2. Crust: eat it or leave it? · *Eat it* / *Leave it*
3. Leftover pizza: cold or reheated? · *Cold* / *Reheated*

**5 · Cereal**
1. Cereal first or milk first? · *Cereal first* / *Milk first*
2. Drink the leftover milk? · *Best part* / *Gross*
3. Cereal for dinner? · *Totally fine* / *That's not dinner*

**6 · Animals**
1. Cats or dogs? · *Cats* / *Dogs*
2. Pets on the bed? · *Of course* / *Not a chance*
3. Dogs in sweaters? · *Adorable* / *Let dogs be dogs*

**7 · The great debates**
1. Is a hot dog a sandwich? · *Obviously, yes* / *How dare you*
2. Is cereal a soup? · *Technically, yes* / *Stop it*
3. Is water wet? · *Of course it is* / *No, it makes things wet*

(Question 1 matches the rules deck slide. Keep them the same.)

**8 · Teeth**
1. Brush before or after breakfast? · *Before* / *After*
2. Squeeze the toothpaste from the middle or the end? · *The middle* / *The end*
3. How often do you floss? · *Every day* / *The night before the dentist*

**9 · Tech**
1. Apple or PC? · *Apple* / *PC*
2. Call or text? · *Call me* / *Just text*
3. Do you read the terms and conditions? · *Every word* / *Just click agree*

**10 · Books and movies**
1. A good book or a good movie? · *Book* / *Movie*
2. Binge the whole season or one episode a week? · *Binge it* / *One a week*
3. Can you spoil a show for someone? · *Never* / *If it's been a year, no*

**11 · Rain**
1. Umbrella or raincoat? · *Umbrella* / *Raincoat*
2. See a puddle? · *Splash right in* / *Walk around it*
3. Dancing in the rain? · *Absolutely* / *Get me inside*

**12 · Mountains or beach**
1. Mountains or beach? · *Mountains* / *Beach*
2. Pool or ocean? · *Pool* / *Ocean*
3. A night in a tent? · *Bring it on* / *Hotel, please*

**13 · Fruit and veg**
1. Is a tomato a fruit? · *Yes, a fruit* / *No, a veggie*
2. Bananas: green or spotty? · *A bit green* / *Nice and spotty*
3. Raisins in cookies? · *Love them* / *A betrayal*

**14 · Theme parks**
1. Disney or Universal? · *Disney* / *Universal*
2. Roller coasters? · *Front row, hands up* / *I'll hold the bags*
3. Matching family T-shirts? · *Love it* / *So embarrassing*

**15 · Movie snacks**
1. Popcorn or candy? · *Popcorn* / *Candy*
2. Sneak in your own snacks? · *Every time* / *Never, it's the rules*
3. Share your snacks? · *Of course* / *Get your own*

**16 · The holidays**
1. Christmas music before Thanksgiving? · *The sooner the better* / *Wait your turn*
2. Real tree or fake? · *Real, always* / *Fake, no mess*
3. Ugly holiday sweaters? · *The uglier the better* / *Not in public*

**17 · Birthday** (for Sir Irwin's party)
1. Cake or pie? · *Cake* / *Pie*
2. Frosting? · *The best part* / *Scrape it off*
3. Everyone sings Happy Birthday to you. Do you... · *Conduct the choir* / *Melt into the floor*

### Rules for writing new sets

- Exactly **two answers**. Both should be fun to pick.
- **Anyone can answer**, even if it doesn't apply to them. No "Do you have a pet?" style questions.
- **Works for the youngest guest and the oldest.** No tech jargon.
- **No Santa.** Keep belief in Santa out of the whole bank.
- **Short.** Keep it quick to read, so the screen matches the read time of a Murderer or Ghost screen.

---

## How a Detective's answers move the cats

For **each question**, the deal picks one cat who is secretly listening: **Salem, Zimothy, Boo or Granolia.** Never Irwin.

1. **The cat has a lean.** It leans toward the answer that fits its obvious vibe (Boo posh, Salem grumpy and outdoorsy, Zimothy fussy, Granolia nerdy), but only **3 times in 4**. The other time it leans the opposite way.
2. **The cat cares a little or a lot.** Rolled per question: **a little = half a stop, a lot = a full stop.**
3. **Your answer matches the lean:** that cat warms to you by that amount. **It doesn't:** it cools by that amount.
4. **Affection stays between 1 and 5.** Store it with half steps; the slider shows the nearest stop.
5. Everything above is rolled when the case is dealt, from the seed.

In Act 4, cat information uses the group's average affection, as Canon says.

**The lean table.** Each question needs one "leaning answer" for each of the four cats. **Jon must never see this table**, because it would give him an edge. It must not go in the repo, and Jon's workshop account must not be able to read it. Treat it like sealed content.
*Built 22 Oct:* `npm --prefix scripts run leans` fills every blank lean blind through the Claude API, straight into `sealed/parlour_leans`, printing counts only (Jon's call, 22 Oct: generated, since Jenna may not have time). It never overwrites a lean already there. Jenna can still change any lean on her Steward page, tab "The cats' leans".

---

## The Murderer and the Ghost

- **Their answers move the clarity dial**, not the cats. Use the blind per-night mapping already in Canon. Don't redesign it here.
- **Their cat sliders still move, and the moves are real** (decided 21 Oct). For each question, a cat is picked and the size is rolled exactly as for a Detective. Then a coin flip decides warm or cool, in place of their answer.
- The result must look just like a Detective's: same odds, same sizes, same animation. A slider that never moves would be a tell, and a slider that doesn't match how the cats treat them would be a worse one.

---

## The slider after a Parlour Game

Already specified in `docs/play-side.md`: a short, slow slide on the Cats tab, no sound, no number. Every phone animates the same way whether or not anything moved. Irwin's marker stays on the top stop.

Update the "Open" note in `docs/play-side.md`: it is now closed by the section above.

---

## Awards at the reveal (draft)

During Act 7, while the final picks are being counted, show a few fun awards based on everyone's Parlour Game answers.

- Awards compare players **with each other only**. They **never** use the cats' leans, so nobody looks like "the cats' favorite" while their slider says otherwise.
- **Draft titles** (Jon may rewrite them in his own voice):
  - **Biggest Rebel:** sided with the smaller group most often.
  - **Crowd Pleaser:** sided with the bigger group most often.
  - **Kindred Spirits:** the two players whose answers matched most.
  - **Sworn Rivals:** the two players whose answers matched least.
- Ties: show everyone tied. Random answers given for a missed window don't count.

---

## New checks for `docs/test-plan.md`

- **G25** Each case uses 12 different sets from the bank, four per act in Acts 2, 4 and 6. Every set is picked about equally often across 1,000 cases.
- **G25b** Parlour Game times follow the spacing rules above, and the same seed gives the same times.
- **F19** A Parlour Game that pops up over another screen returns the phone to exactly where it was.
- **G26** Every question has exactly two answers.
- **G27** Irwin is never the listening cat. His affection never moves.
- **G28** Every cat's affection stays between 1 and 5 all night.
- **G29** Murderer and Ghost affection moves with the same odds and sizes as a Detective's (compare across 1,000 cases).
- **G30** Each cat leans toward its fitting answer about 75% of the time (allow 65 to 85%).
- **G31** Awards never use the cats' leans.
- **L05** The lean table is not in the repo, and Jon's account cannot read it.

---

## Other places that still say "three"

These must change to match (Jon or a chat session will handle the decks, since they live outside the repo):
- The rules deck: "Three times tonight" and the phone mockup "Parlour Game · 1 of 3".
- The intro and rules voiceover script.
- `docs/play-side.md`, wherever it says one Parlour Game per act.

---

## Not designed yet — don't invent these

- The lean table (Jenna's job, see above).
- Final award titles and wording.
