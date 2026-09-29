# Task: load the bag item list into the Workshop

Written 29 Sep 2026 for Claude Code, working in `~/Documents/GitHub/Murderwin`.
Read `CLAUDE.md` and `chats/docs/sirwin-manor-bag-system.md` first. They win any disagreement with this file.

## What Jon wants

1. The 108 items below appear in the Workshop under **Bags → Bag items**.
2. Everything is set up so the blind packer (task card 26) and Jenna's packing list (task card 27) work smoothly later.

Talk to Jon in plain English, one step at a time. Show him counts, not code.

## Rule 1 (the host plays)

- The **item pool** below is safe content. Jon wrote it. It can live in the repo and the Workshop.
- The **packing** (which numbered bag holds which item) is sealed. It goes only to `sealed/bags`.
  Never print it, log it, write it to a file, or show it in Jon's browser. Only Jenna's Steward view shows it.
- If any step would reveal the packing to Jon, stop and ask him first.

## Step 1: put the list in the repo

Save the list below as `seed/bag-items.json` (JSON, decided 25 Sep; never YAML): an array of strings, one per line below.

Line format is the one the Workshop already checks in `app/src/lib/content.js`:
`Item — sense: property`

Some items carry a second property, joined with `; `. Example: `Tin of Altoids — smell: minty; sound: rattles`.
The Workshop lint only checks the first property, so this passes. Anything that reads these lines later
(the packer, the generator) must split on `; ` and read every property.

## Step 2: add the items to the Workshop, additively

- `safe_content/bag_items` probably already exists (migration `2026-09-28-bags` created it empty).
  The existing `ADDITIONS` mechanism only creates missing docs, so it will **not** add items to it.
- Add a new guarded, one-time step with id `2026-09-29-bag-items` (recorded in `meta/migrations`) that:
  - reads the current `bag_items` doc,
  - appends each line from `seed/bag-items.json` that is not already there (compare text, ignoring case and extra spaces),
  - uses the same item shape as other areas: `{ id: newId(), text, deleted: false, order }`, with `order` continuing after the last existing item,
  - never deletes, reorders or rewrites an existing item. Susan's and Jenna's edits must survive.
- Run it against dev first if dev and live are split by then. Then tell Jon the count: "108 items added, 0 duplicates skipped" (or whatever it really is).

## Step 3: get the packer ready (do not build it unless Jon asks)

Write these rules into task card 26 and into `chats/docs/sirwin-manor-bag-system.md`, so whoever builds the packer has them:

- **Planning number:** 8 players, so 10 bags, 6 items each, 60 items packed. Final headcount is still open.
- **Buying:** Jon buys the whole pool (one of each item, two of each Taste item). The packer only picks from that stock.
  Buying everything keeps Jon blind: a shopping list made from the packing would show him which items are in play. Leftovers become party favors.
- **Each bag:** one item for each of the five senses, plus one spare from any sense.
- **Each property that gets used lands in 2 or 3 bags. Never 1.**
- **Each bag has at least 2 clueable properties.**
- **Prefer not** to put two items with the same property in one bag.
- **Taste backups:** the second copy of a Taste item goes in the same bag as the first, so a clue survives being eaten.
- **Stacked clues:** list every pair of properties whose holders overlap in exactly one bag. The generator must never
  give the same player both halves of such a pair. Report only the count of such pairs to Jon.
- **Output:** the packing goes to `sealed/bags` only. Jenna's view shows it as a checklist: bag number, then its items.

Also record in the bag system doc:

- **Bags:** black velvet drawstring, 9 x 12 inches, 10 of them, numbered 1 to 10 with a white paint pen or a tag.
- There is **no velvet property** in the pool, because the bags themselves are velvet.
- The pool is **vegetarian**. Jon's household is strictly vegetarian: no meat, and every candy gets checked for gelatin, carmine and confectioner's glaze.

## Step 4: tell Jon

One short message: how many items are now in the Workshop, and what is next. No item names, no code.

---

## The list (108 items)

The sense and property on each line is the clue word players will hunt for.

### Sound
```
Retractable pen — sound: clicks
Pet training clicker — sound: clicks
Retractable tape measure — sound: clicks
Jingle bell — sound: jingles
Keys on a key ring — sound: jingles
A few coins in a coin purse — sound: jingles
Tic Tac box — sound: rattles
Empty pill bottle with rice inside — sound: rattles
Small tin of buttons — sound: rattles
Empty chip bag, folded — sound: crinkles
Cellophane candy wrapper — sound: crinkles
Sheet of tissue paper — sound: crinkles
Squeaky dog toy — sound: squeaks
Squeaky rubber duck — sound: squeaks
Small water bottle — sound: sloshes
Travel-size shampoo bottle — sound: sloshes
Bottle of bubbles — sound: sloshes
A few dominoes — sound: clacks
Wooden toy blocks — sound: clacks
Wooden clothespins — sound: clacks
```

### Smell
```
Tin of Altoids — smell: minty; sound: rattles
Peppermint tea bag — smell: minty
Mint ChapStick — smell: minty
Cinnamon stick — smell: cinnamon
Pack of Big Red gum — smell: cinnamon; sight: red
Cinnamon tea bag — smell: cinnamon
Lavender soap bar — smell: lavender
Lavender dryer sachet — smell: lavender
Travel-size lavender lotion — smell: lavender
Vanilla tea light candle — smell: vanilla
Vanilla ChapStick — smell: vanilla
Vanilla Little Trees air freshener — smell: vanilla
Coffee beans in a zip bag — smell: coffee
Instant coffee packet — smell: coffee
Coffee K-Cup pod — smell: coffee
Lemon soap bar — smell: lemon
Lemon tea bag — smell: lemon
Lemon hand wipe, sealed packet — smell: lemon
Pine Little Trees air freshener — smell: pine
Pine-scented tea light candle — smell: pine
```

### Touch
```
Tennis ball — touch: fuzzy
Craft pom-pom — touch: fuzzy
Pipe cleaner — touch: fuzzy
Lego brick — touch: bumpy
Small square of bubble wrap — touch: bumpy
Rubber jar opener — touch: bumpy
Glass marble — touch: cold and smooth
Smooth vase-filler stone — touch: cold and smooth
Metal teaspoon — touch: cold and smooth
Stress ball — touch: squishy
Foam Nerf ball — touch: squishy
Square of sandpaper — touch: rough
Emery board — touch: rough
Burlap scrap — touch: rough
Toothbrush — touch: bristly
Dish scrub brush — touch: bristly
Small hairbrush — touch: bristly
Ball of twine — touch: stringy
Shoelace — touch: stringy
Small ball of yarn — touch: stringy
Beaded bracelet — touch: beaded
Fake pearl necklace — touch: beaded
Mardi Gras beads — touch: beaded
Shower pouf — touch: mesh
Mesh produce bag — touch: mesh
Loofah — touch: mesh
Rubber bands — touch: stretchy
Hair tie — touch: stretchy
Balloon, not blown up — touch: stretchy
```

### Taste (all individually wrapped; buy two of each)
```
Warheads — taste: sour
Snack bag of Sour Patch Kids — taste: sour
Lemon drop — taste: sour
Atomic Fireball — taste: cinnamon hot
Snack box of Hot Tamales — taste: cinnamon hot
Butterscotch disc — taste: butterscotch
Werther's Original — taste: butterscotch
Hershey's Kiss — taste: chocolate
Mini Hershey's bar — taste: chocolate
Pixy Stix — taste: powdery
Fun Dip — taste: powdery
Honey packet — taste: honey
Honey-lemon cough drop — taste: honey
Snack bag of pretzels — taste: salty
Two-pack of saltine crackers — taste: salty
Black Twizzlers — taste: black licorice
Black Red Vines — taste: black licorice
```

### Sight
```
Red ribbon — sight: red
Red button — sight: red
Red crayon — sight: red
Blue ribbon — sight: blue
Blue button — sight: blue
Blue crayon — sight: blue
Green ribbon — sight: green
Green button — sight: green
Green crayon — sight: green
Gold foil chocolate coin — sight: gold; taste: chocolate
Brass key — sight: gold
Gold button — sight: gold
Craft feather — sight: feathery
Feather pen — sight: feathery
Candy cane — sight: striped; smell: minty
Striped paper straw — sight: striped
Striped sock — sight: striped
Paper doily — sight: lacy
Lace ribbon — sight: lacy
Glitter greeting card — sight: sparkly
Rhinestone sticker — sight: sparkly
Sparkly hair clip — sight: sparkly
```
