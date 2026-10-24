# Sirwin Manor · The Sensory Bags

**Current as of Friday 23 October 2026, 6:40 PM.** This file replaces the 3:17 PM version of the same name and answers every question it left open. It is the one place for everything about the bags. `docs/handoff-2026-10-23.md` (the master handoff) carries the same decisions and templates as of 5:10 PM; where the two differ, this file is newer and wins.

Nothing in this file is sealed. The bag **packing** (which numbered bag holds which items) and the game's **per-night fill** of each clue are sealed (Rule 1) and never appear here, in a chat, in the repo or on a screen Jon can see.

---

## 1 · The decision (23 October)

- **The bags stay.** They are no longer an open question. The old decision card *bagsAct4* is answered: yes.
- **Only two things ever point at a person: the bags and the traces.** Nothing else does.
- **A bag clue in Act 2 is about the Murderer. A bag clue in Act 4 is about the Ghost.** Players are told this rule out loud in Act 1 and it is on the rules deck.
- The bags are the second way to find the Murderer. The trace reveal can end at level 1 (a grey smear), and the bags are how the room still gets there. The test plan's "solvable at dial 1" check now depends on them.

| Who | Pointed at by the bags | Closed by the trace |
|---|---|---|
| The Murderer | Act 2 (and talked over at supper in Act 3) | Act 6, the trace behind the bedroom door |
| The Ghost (the Victim) | Act 4 | Act 4, the Study light puzzle |

---

## 2 · The bags themselves

- **Ten black velvet drawstring bags, 9 x 12 inches, numbered 1 to 10.** More bags than players. (No "velvet" property in the pool, since every bag is velvet.)
- **Six ordinary objects in each bag:** one for each sense (sight, sound, smell, touch, taste) plus one spare. Every bag has at least two clueable properties.
- **Every item is cute enough to take home** (new, 23 October). The bags double as the party favours.
- **Food rule** (relaxed 23 October): vegetarian, so **no gelatin** (gummies, marshmallows, many chewy candies). Carmine (cochineal, "Natural Red 4") and confectioner's glaze (shellac) are fine.
- **Near-twins** are the trick (29 September): items that feel the same to one sense but look different, so a clue like "something minty" fits two or three bags and never one.
- Sight needs the bag open, so **bags stay closed unless the holder is invited**. Sound leaks on its own whenever the bag moves. Smell, touch and taste need permission.
- **No bag list anywhere in the app**, not even for your own bag. Memory only.

### The property words the game can use

These are the 40 clue words in the item pool today (`seed/bag-items.json`, 108 items, loaded into the workshop's Bag items list on 18 October). A clue only ever names one of these, with its sense. New items may add new words; tell Claude Code and it adds them to the list.

| Sense | Words |
|---|---|
| Sight | blue, feathery, gold, green, lacy, red, sparkly, striped |
| Sound | clacks, clicks, crinkles, jingles, rattles, sloshes, squeaks |
| Smell | cinnamon, coffee, lavender, lemon, minty, pine, vanilla |
| Touch | beaded, bristly, bumpy, cold and smooth, fuzzy, mesh, rough, squishy, stretchy, stringy |
| Taste | black licorice, butterscotch, chocolate, cinnamon hot, honey, powdery, salty, sour |

---

## 3 · Jon's shopping guide (this weekend, Target)

Three rules while you browse:

1. **Cute enough to take home.** No pantry items (a loose tea bag, a cinnamon stick). Smell comes from a scented eraser, a fun-shaped lip balm, scratch-and-sniff stickers, a mini scented squishy, not from the spice aisle.
2. **Think in pairs that feel alike but look different.** Two different mini plushies (both fuzzy). A mini Play-Doh and a mini slime (both squishy; Play-Doh covers smell too). A sticky hand and a bouncy ball (both rubbery). A jingle-bell keychain and a bell bracelet. A click pen and a fidget clicker. A mini egg shaker and a tiny box of Tic Tacs. A mini squeaky toy and a dog-shaped squeaker, for Irwin.
3. **Buy the whole pool, not a bag's worth.** The packer chooses from your stock, so the shopping never shows which items are in play. Two of each thing you eat. Leftovers are party favours.

The non-candy trick-or-treat packs (mini Play-Doh, pop-it keychains, scented erasers, stickers) are exactly the right size and price. Season does not matter; feel does. Skip the Five Below junk.

**When you get home:** tell Claude what you bought (a photo of the haul is enough). Claude writes each item with its sense and clue word, Claude Code adds them to the workshop's Bag items list, and then you run the packer once (section 6).

Also buy: ten bags with the numbers 1 to 10 on them (black velvet drawstring, 9 x 12 inches; Amazon sells 10-packs).

---

## 4 · How the bags move through the night

| Act | What happens with the bags |
|---|---|
| **1 · The Invitation** | At sign-in the phone says which numbered bag to take ("Take bag six"). Roles do not exist yet. You may look in your own; the others stay closed. The rules deck states the bag rule (Act 2 = Murderer, Act 4 = Ghost). |
| **2 · Lights Out** | After the W-O-O-F News video, the phone says: take a quiet look inside your own bag, here in the Parlour, and show nobody yet. Then every guest visits all four cats; **each cat gives one motive hint and one bag clue about the Murderer**, at the rung its affection sets, saved on the phone's Clues tab. Between visits, **Sir Irwin's sharing prompts on the Parlour TV** ask people to share something from their bag for a given sense; the guest chooses what. Nothing from the Parlour is recorded. |
| **3 · Supper** | Bags come to the table. Everyone compares what they found and what they heard. No new bag clues. |
| **4 · Behind Closed Doors** | **Bag hints point at the Ghost.** Each of the four game rooms pays one with its reward, on the group's average affection: Granolia (the Study, with the trace), Zimothy (the Library, with a motive cross-off), Salem (the Orangerie, heavier-handed and maybe backwards), Boo (the Entryway, with a motive cross-off; she speaks to every group in Act 4). Sir Irwin's prompts keep running on the Parlour TV for the groups waiting there. |
| **5 · One Candle** | The bags may be talked about freely. No new clues. |
| **6 and 7** | No new bag clues. Players use what they remember and what is on their Clues tab. The trace closes the Murderer. |

---

## 5 · What a bag clue is

- It names **a sense and a property**, never an item, never a bag number, never a person.
- The property is in **two or three in-play bags, never one**. A clue narrows; it never accuses.
- **A compass, not a pointer.** Even a cat who adores you only half-saw the bag. At top affection a bag clue is still a nudge: if you are torn between two people, it tips you one way. Other players may not have the same nudge.
- **Rungs 1 and 2 give no property** (the line still shows, so every visit looks the same length). Rung 3 names a sense only. Rungs 4 and 5 name the property.
- **Salem** is filled with a **wrong** property at rungs 1 to 3, a coin flip at 4, the right one at 5. His wording never changes, so nobody can tell. A wrong property must still be a property of some in-play bag that is not the pointed-at bag, and still sit in two or three bags.
- On a **rehearsal night** every bag clue shows a bracketed stand-in such as `[Salem's bag clue about the Murderer appears here]`, never a filled line.

Jon may rewrite any line below in his own voice. `___` is the blank the game fills at the deal. `[sense]` is the sense word the game picks with it.

### 5a · Act 2 templates, about the Murderer (rung = the cat's affection for the guest at the scan)

**Granolia** (truthful, forgetful)
1. "Oh! The bag. I saw a bag. Someone's bag. It was... a bag. I'm sorry, I licked a book and now it's all gone."
2. "The Murderer's bag! I sniffed it. Or heard it. Or... one of those. There was definitely a something."
3. "There's something in the Murderer's bag that you'd only notice if you [sense] it. I noticed. Then I forgot."
4. "Something in the Murderer's bag was ___. Or near enough. Or I'm thinking of a different bag. No. I'm fairly sure. Mostly."
5. "I remember this one! Something in the Murderer's bag is ___. Write that down before I lose it again."

**Zimothy** (never lies; the cheap version if he doesn't like you)
1. "I have a note on the Murderer's bag. It is not free."
2. "The Murderer's bag contains something of interest to the [sense]. That is all my fee covers."
3. "For the record: an item in the Murderer's bag is best examined by [sense]. Further particulars cost extra."
4. "My file says the Murderer's bag holds something one might call ___. I will not swear to the wording."
5. "My file is clear. The Murderer's bag holds something ___. Filed, witnessed, and billed."

**Boo** (speaks only at 4 or above in Act 2)
1. "Boo looks you up and down. She says nothing about any bag."
2. "Ew. Do I know you? No. Then I don't know anything about anybody's bag."
3. "I'm off duty, darling. Ask me again when we're friends."
4. "Murderer's bag. Something ___. Darling."
5. "The Murderer's bag holds something ___. I'd know. I knocked it off a table."

**Salem** (wrong at 1 to 3, coin flip at 4, right at 5)
1. "Off my lawn. Fine. The Murderer's bag? Something ___ in it. Now git."
2. "Saw the Murderer's bag go by. Something ___. Don't ask me twice."
3. "Forty years on these grounds. The Murderer's bag had something ___ in it. I'd swear to it."
4. "The Murderer's bag. Something ___. Or the other thing. One of the two."
5. "You're all right, you are. The Murderer's bag holds something ___. Straight up, no lawn jokes."

### 5b · Act 4 templates, about the Ghost (rung = the group's average affection)

"The one who cried out" is the Ghost. No line ever says a name.

**Granolia** (the Study, after the trace). Lead-in at every rung: "Oh! Also! Before I forget, and I will:"
1. "Someone shouted for help. I was reading. Was it a book? No. A person. I think."
2. "When the shout came, there was a... a [sense] thing. Near them. I forget the rest."
3. "The one who shouted had something you'd have to [sense] to know about. I noticed. Then the lights went out."
4. "The one who shouted had something ___ with them. Or near them. Or I'm mixing up chapters."
5. "The one who shouted had something ___ with them. I'm sure. I wrote it in the margin."

**Zimothy** (the Library, with the cross-off)
1. "A cry for help was heard. My notes on it are not free."
2. "The party who cried out carried something for the [sense]. My fee covers no more."
3. "For the record: whoever cried out had something best examined by [sense]."
4. "My file says the deceased had something one might call ___ about them. No warranty."
5. "My file is clear. The victim carried something ___. Filed, witnessed, billed."

**Salem** (the Orangerie; heavier-handed: a property at every rung; wrong at 1 to 3, coin flip at 4, right at 5)
1. "Heard the yelp from the lawn. Whoever it was had something ___ on 'em. Forty years, never wrong."
2. "That yelp. Something ___ went with it. I'd stake the hedges on it."
3. "Whoever hollered had something ___ about 'em. Mark it down."
4. "The yelp? Something ___ went with it. Or didn't. Fifty-fifty, like my knees."
5. "Straight up, no lawn jokes: whoever yelped had something ___ on 'em."

**Boo** (the Entryway, with the cross-off; she speaks at every rung in Act 4)
1. "Ugh. Fine. Whoever screamed had something... [sense]-ish about them. Don't make me say more."
2. "Ew. Do I know you? No. But the one who screamed had something for the [sense]. There."
3. "The scream. Something ___-ish. Five words, darling. I'm done."
4. "The one who screamed? Something ___ about them. Dreadful, really."
5. "Darling, whoever screamed carried something ___. I'd know. I was judging them at the time."

### 5c · Sir Irwin's sharing prompts (the Parlour TV, Acts 2 and 4)

One prompt at a time with Sir Irwin's picture, a new one every three minutes (Jon may change the minutes), random order, no repeat until all twelve have shown. Prompts name only a **sense**, never a property word, so a prompt can never match a clue. The guest chooses what to share.

1. "Show someone something from your bag that makes a sound. I'll be listening. I'm always listening."
2. "Let a friend smell something from your bag. Nothing says friendship like sniffing."
3. "Pass around something from your bag that's nice to touch. Nicer than me? Impossible. Try anyway."
4. "Show someone the best-looking thing in your bag. Ooh. Look at it."
5. "Got a snack in there? Show it. Don't eat it. Don't give it to me. Okay, give it to me."
6. "Let someone feel something from your bag with their eyes closed. Don't tell them what it is."
7. "Find someone who hasn't seen inside your bag yet. Say hi. Share one thing. Sniffing optional."
8. "Show someone something you could smell from across the room. I could smell it from the garden."
9. "Make a sound with something from your bag. Then do it again. I liked it."
10. "Show someone the smallest thing in your bag. I'm not allowed to have small things."
11. "Share something from your bag that's good to taste. Then explain to me why dogs can't have it."
12. "Share whatever you like. I trust you. I trust everyone. It's a problem."

---

## 6 · The packing, Jenna, and what stays secret

- **The item pool is safe.** Jon and Susan write it (the workshop's Bag items list; `seed/bag-items.json`).
- **The packing is sealed.** `npm --prefix scripts run pack-bags` assigns six items to each numbered bag under the bag rules and writes `sealed/bags`, printing counts only. A packing was made on 20 October from the September pool. **After the final shopping, run `npm --prefix scripts run pack-bags -- --repack` once**, before Jenna packs, so the packing uses the finished list. Never again after that.
- **The fill is sealed.** At the deal the game picks, for the Murderer's bag and the Ghost's bag, the property words that sit in two or three in-play bags, and fills each cat's template by rung. Nobody writes or sees it.
- **Jenna packs the bags**, from the packing list on their Steward page, out of Jon's sight: at the house before guests arrive, or earlier if Jon drops the items off. Jenna is expected at the party (23 October) and never plays. Jenna tells Jon only "done" or "needs more".
- **Jon never sees** the packing list, the fill, or any bag's contents other than his own on the night. His account cannot read `sealed/bags`; `npm run test:rules` proves it.
- Every night reads only its bag **count** (`createNight`), never an item.

---

## 7 · Checks (for `docs/test-plan.md`)

- **G39** Every Act 2 bag clue fits the Murderer's bag; every Act 4 bag hint fits the Ghost's bag.
- **G40** No bag clue names an item, a bag number or a person.
- **G41** Every property a clue uses sits in two or three in-play bags, never one.
- **G42** At dial 1, a solver using only the bag clues and the room's shared information narrows the Murderer to a small group, and the Act 6 trace can finish it.
- **G43** Every bag has at least two clueable properties.
- **G44** In Act 2, every cat visit gives one motive hint and one bag clue, at the rung set by that cat's affection at the scan.
- **G46** No single guest's Act 2 bag clues narrow the Murderer to one bag.
- **G49** Salem's bag clue is a wrong property at rungs 1 to 3 and the right one at 5; his wrong property is still a property of an in-play bag, in two or three bags.
- **L06** The bag packing is not in the repo, and Jon's account cannot read it.
- **L07** The Parlour TV never shows sealed content or anything about a specific player.
- **L08** Sir Irwin's prompt bank contains sense words only, never a clue property word.

---

## 8 · For Claude Code

**Build** (the ordered list is section 10 of the master handoff):
1. The bag clue engine: from `sealed/bags` and each item's sense and clue word, the sets of properties in two or three in-play bags for the Murderer's bag and the Ghost's bag; the fill by rung and by cat (Salem's wrong-property rule); bracketed stand-ins on rehearsal nights.
2. Act 2: the bag peek screen after the news; every cat's card = its hint line plus its bag clue (templates 5a); both saved on the Clues tab.
3. Act 4: each room's reward pays its Ghost bag hint (templates 5b) with the trace or the cross-off.
4. Sir Irwin's prompts (5c) as a living-kiosk state during the Act 2 cat visits and for the Parlour in Act 4.
5. The checks above.

**Where things live:** the pool in the workshop's Bag items list and `seed/bag-items.json`; the packer in `scripts/pack-bags.mjs`; the packing in `sealed/bags`; Jenna's packing list on the Steward page (`functions/lib/steward.js`); the night's bag count in `createNight`. The old bag station in `seed/night.json` (`stations`, key `bags`) goes: the bags are not a rotation stop any more.

**Never:** print, log or file the packing or a fill; show Jon a bag's contents; name an item or a person in a clue.

---

## 9 · History

- **28 September:** the bag system rules (near-twins, six items, sealed packing, Jenna sees the list).
- **29 September:** the 108-item pool in 40 families; "buy the whole list".
- **18 October:** the pool loaded into the workshop; the blind packer built.
- **20 October:** the first packing made (ten bags).
- **23 October, 3:17 PM:** the bags stay; Act 2 = Murderer, Act 4 = Ghost; only bags and traces point at a person; cute items; the food rule relaxed.
- **23 October, afternoon:** every cat gives a bag clue in Act 2; a compass, not a pointer; Sir Irwin's prompts on the Parlour TV; the four Act 4 rooms each pay a Ghost bag hint; Jenna attends and packs at the house.
- **23 October, 6:40 PM:** this file, with the templates, the prompts, the shopping guide and the checks.
