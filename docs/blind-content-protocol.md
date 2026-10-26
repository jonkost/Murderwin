# The secret content — how it gets made without you seeing it

The game's secrets are: which answer each cat leans toward in the Parlour
Games, the Relay Drawing picture bank (up to three per round; the night uses
one per round), which numbered bag holds which items, and each night's case
(who did it, who died, the motive, and what each clue crosses off). There are
no hidden events in any act (22 Oct), so there is no event copy.

Since 23 Oct 2026 there are no secret texts. The cats say only their open
hint lines, and the Act 2 safe and its document are gone (see "Retired on 23
October 2026" below).

Claude or the game makes every secret, blind. It goes straight into the
game's database. It never lands in a file on your Mac, never in this folder,
never on your screen, never in a chat.

This is what lets you host, build and still play.

## Every secret and what makes it

| The secret | What makes it | Who may see it |
|---|---|---|
| The cats' leans in the Parlour Games | `npm --prefix scripts run leans` (fills only the blanks) | Jenna (the cats' leans tab), who may change any lean |
| The Relay Drawing pictures | `npm --prefix scripts run relay-pictures` | Nobody. Jenna may not either (stewardPictures, answered no on 24 Oct with the handoff's default). |
| Which numbered bag holds which items | `npm --prefix scripts run pack-bags` | Jenna (the packing list tab), who packs to it |
| Each night's case | The game itself, at the blackout at the end of Act 1 | Nobody |

You run each command. Each prints counts and PASS or FAIL only.

## What you do

1. Finish the two lists the secrets are made from: the Parlour Games and the
   things in the bags (you and Susan, by 30 October; a card on the board). The
   leans and the packing list are made from them on Saturday 31 October.
2. Run the three commands above. Each takes a few minutes, needs an internet
   connection and prints numbers only. Count-only rows on Home for the leans,
   the packing list and the drawing pictures are not built yet (a card on the
   board).
3. If one says FAIL, run it again. None of them ever replaces Jenna's work:
   the leans command fills only blanks, the pictures command only tops each
   round up, and the packer refuses to replace a packing unless you ask it to
   repack. A packing was made on 20 October, so if you and Susan changed or
   added bag items since then, run
   `npm --prefix scripts run pack-bags -- --repack` once, before Jenna packs.
   Otherwise the packing stays on the old list.

## The secrets, in words

- **The cats' leans.** For every Parlour Game question you wrote, which of the
  two answers each of the four listening cats would pick. The command fills
  only the blanks, so a lean Jenna set is never replaced. A blank still works
  on the night: the cat picks at random.
- **The Relay Drawing pictures.** Simple thick-line pictures for the three real
  rounds, each with three wrong names for the guess. Up to three per round; the
  night picks one per round at random. A picture is refused if its name or any
  wrong name is a style sample, a star, a trace object or a motive-card object.
  The command never touches a picture already there. Rehearsals never use them.
- **The bag packing.** See "The bags" below.
- **Each night's case.** Made by the game at the blackout, from who came: who
  did it, who died, the motive (drawn at random from the nineteen), which
  family each clue crosses off, and the night's Parlour Games. No command makes
  it, and no page shows it.

## Retired on 23 October 2026

You decided two things on 23 October: retire the cats' secret lines
(secretLines), and take the Act 2 safe out. With them went every per-motive
secret set. Gone from the game:

- the cats' secret lines (the secret middle between a cat's greeting and its
  sign-off), the affection roll that cut them short, and the brush-offs;
- Salem's secret line that flipped on its own, and Granolia's one wrong
  detail;
- the Act 2 safe, its three numbers, the scrap of paper, the document it paid
  out and the seven stationery designs;
- the parts already unused since 22 and 23 October: the news fragments, the
  study clues and Sir Irwin's old Act 5 lines;
- the command that made the sets and the one that checked them, and the line
  on Home that counted them.

The nineteen sets made on 20 October stay in the game's database, unused.
Nothing reads them. The workshop lists that fed them (the blanks, the
stationery designs and the brush-offs) are kept, not used.

## Who writes and who edits

Decided 28 September, changed 23 October. You and Susan draft; Claude makes the
leans and the pictures blind; the packer packs the bags; Jenna, the Steward,
looks after the secrets.

- **You and Susan draft the safe lists only**: the Parlour Games, the bag
  items, Sir Irwin's Act 5 hello and goodbye, and the rest of the workshop.
  You both play, and anything you draft you would recognise on the night.
- **Claude makes the leans and the drawing pictures**, through the commands
  above. **The packer** packs the bags. No AI is involved in the packing.
- **Jenna** has their own page in the workshop (For Jenna, then **Open your
  page**; see `docs/steward-view.md`). Since 23 Oct it has two tabs: the
  packing list and the cats' leans. It does not show the drawing pictures
  (stewardPictures) or any night's case. The server opens it for their account
  only: yours is refused by code, with no rule change. Their jobs: read the
  lists cold, look over the leans (if they have time), pack the bags, and run
  the real checks once the Health page exists. They never share their screen
  with you, and they tell you only "done" or "needs more".

## The bags

You and Susan list the bag items in the workshop (Bags → Bag items). The game
then decides which items go in which numbered bag, without either of you seeing
it, and saves that packing as a secret. Only Jenna's page shows the packing list,
and Jenna packs the bags to it. Because the game decided the packing, it already
knows what is in every bag when it writes the clues.

## The checks

Each command checks its own work and prints counts and PASS or FAIL only:
how many leans are filled, how many pictures passed the bank's checks, whether
the packing keeps the bag rules. You only ever see the counts. If something
fails, the fix is "run it again".

## Rehearsals, the party night and dry runs (decided 17 October 2026)

Every night you start from your phone is a rehearsal, and every phone and room
screen shows a red REHEARSAL band. A rehearsal reads none of the secrets: the
cats lean at random, the bags card names a stand-in property, and the drawing
uses stand-in pictures. The one thing it takes from the packing is how many
bags there are, so the bag numbers are real; never what is in them.

On the day of the party, open the workshop's Game night page and tick **This
is the party night**. The next night you start from your phone then deals the
party case at the blackout, when the power goes out at the end of Act 1, and
reads the real leans, packing and pictures. The case is dealt then, not
before: it needs to know who came. Untick the box after the party.

A **dry run with the real secrets** is how the game gets tested end to end
without you. It is a separate night that the eight fake players
(`scripts/fake-players.mjs`) create for themselves, marked as a dry run and
not a rehearsal. The script joins only the fake players, and it throws the
night away afterwards. You follow it in the terminal, which prints counts
only. Keep the TV, the room screens, your phone and Susan's phone off the
game page while it runs: they all follow the newest night, nothing stops an
open phone from following a dry run, and a dry run on the real secrets draws
the real pictures in Act 6. If either of you ever
sees a secret by accident, tell Claude Code before the party, so that part can
be made again without you seeing it.

## Two ways you could get spoiled by accident

1. **The rulebook tutorial example** may only be built from motive #8 (already
   spoiled for you) or from a made-up motive that isn't one of the 19. Never a
   worked example against a real motive.
2. **Rehearsals and screen tests** never read the secrets (see above). If a
   screen ever shows you something from the party's secrets, tell Claude Code,
   and that part gets made again. The tooling forces that, not your memory.

## The canary

Changed 23 October 2026: there are no secret sets left to read. The canary is
a person who is not coming to the party playing a rehearsal night cold, so
nothing they see is a secret. Jenna looks over the leans.

---

## For Claude Code (technical appendix)

Every sealed path, its writer and its readers (no client reads any of them;
`firestore.rules` denies `sealed/*`, `cases/*` and `nights/{id}/private/*`):

| Path | Written by | Read by |
|---|---|---|
| `sealed/parlour_leans` | `scripts/generate-leans.mjs` (`run leans`, blanks only); the Steward's `lean` | `deal.buildCaseForNight` on a party night only (copied into `parlourPlan.leans`), `steward.js opLeans`, `steward.js opChecks` (LN1, a count) |
| `sealed/relay_pictures` | `scripts/generate-relay-pictures.mjs` (`run relay-pictures`) | `relay.start` on a party night only (`cases/{id}.rehearsal === false`), `steward.js opChecks` (RP1, a count) |
| `sealed/bags` | `scripts/pack-bags.mjs` (`run pack-bags`) | `bags.readPacking` for the bag clues (`bagclues.js`) on a party night only: `deal.greetGuest` (Act 2, the Murderer's bag) and `act4.payRoom` (Act 4, the Ghost's bag); `night.packedBagCount` at `createNight` on every night (the highest bag number only, never an item); `steward.js opBags` and `opChecks` (PK1, G43, PK2, counts) |
| `cases/{nightId}` | `deal.buildCaseForNight` at the Act 1 blackout; then kept up to date by `deal.js` (late joiners, what each clue crossed off), `windows.js` (the dial), `ledger.js` (dealt clues, exposure) and `safeguards.js` (Spill the Beans) | Functions only: `deal.js`, `screen.js`, `station.js`, `windows.js`, `safeguards.js`, `ledger.js`; `relay.js` and `discard.js` read its `rehearsal` flag only |
| `nights/{id}/private/*` | the Functions (the Act 2 rooms, the bulletin, the drawing, the dial clues) | Functions only |

Retired 23 Oct 2026 (secretLines retired, the Act 2 safe taken out), written
and read by nothing:
- `sealed/manifest` and `sealed/{code}`: the 19 per-motive sets made on 20 Oct
  (kernels, documents, fragments, study clues, Irwin's lines) stay in
  Firestore unused, with any `sealed/_archive/items/*` copies.
  `scripts/generate-sealed.mjs`, `scripts/validate-sealed.mjs`, their npm
  scripts (`generate`, `validate`) and their tests are deleted; `scripts/lib.mjs`
  keeps only the shared helpers (`adminDb`, `areaItems`, `say`, `memoryDb`,
  `sha12`, `redactedError`, `printFatal`). Steward ops `list`, `read`,
  `write` and `mark` are gone.
- `validation_reports`: back in use since 24 Oct, and not sealed:
  `scripts/checks.mjs` (`npm run checks`) writes `validation_reports/checks`
  with the Admin SDK (counts, check IDs, plain names and stand-in case
  numbers only), and the workshop's Health page reads it under the existing
  admin-only read rule. No rules change was needed.
- `nights/{id}/private/puzzles` (the safe's answers), the `solve` callable
  (the next `npm run deploy` asks to delete it; Jon types y), the Act 2
  beat `puzzle` (`deal:puzzle`), card kinds `puzzle` and `document` (the Act 4 station keyed
  `puzzle` is the memory match and stays), and session fields `solved` and
  `tries`.
- Case keys `kernels`, `variant`, `salemAnchors`, `salemTruthIndex`,
  `documents`, `studyClue`, `echo`, `irwin`, `pools`, `granoliaSlot`; case
  warnings `rehearsal-fallback` and `no-sealed-content`; ledger kind
  `document`.

There are no hidden events (closed 22 Oct), so there is no `sealed/events/*`.
Every case's `dialMap` is the same fixed `DIAL_SIGN` (`case.js`), so no
script makes it; decision *dialMapping* closed 24 Oct with the handoff's
default, keep it fixed.

Lean table: `sealed/parlour_leans` (`{ sets: { setId: { q: { cat: 'a'|'b' } } },
generatedAt }`, or `editedAt, editedBy: 'steward'` after the Steward's last
tap), written by `npm --prefix scripts run leans` (`generate-leans.mjs`,
`--dry` counts the blanks). It sends the workshop's Parlour Games questions
under opaque, shuffled references, fills blanks only, never a lean Jenna set,
and prints counts only. The dealer copies it into the case's `parlourPlan` at
a party deal; a rehearsal never reads the table, so its `parlourPlan.leans`
is `{}`, and a blank lean is a coin flip on the night.

Drawing pictures: `sealed/relay_pictures`, written by
`npm --prefix scripts run relay-pictures` (`generate-relay-pictures.mjs`,
`--dry` counts what is missing). It tops each round up to `PER_ROUND` = 3
pictures that pass `relay-bank.checkPicture` (which also refuses the
never-list: the style samples, a star, a teapot, the trace objects and the motive-card
objects, in the name or any decoy), never touches existing ones, prints counts
and PASS/FAIL only, and `relay.start` reads it on the party night only. Shape
and checks: `docs/relay-drawing-game.md`, For Claude Code.

Bag contents: `sealed/bags`, written by the blind packer
(`npm --prefix scripts run pack-bags`, built 18 Oct 2026, rewritten 24 Oct
for Jon's final items). It reads the bag items from the workshop (the final
line format, `docs/sensory-bags.md` §8), packs ten bags of four or five (one
food, a touch item, extras; aims for three clue words a bag, falls back to
two), prints counts and PASS or FAIL only (bags packed, every rule passed,
bags reaching three clue words; never an item), and refuses to replace a
packing that is already there (or one the Steward edited) unless run with
`--repack`. Shape: `{ bags: { n: [itemId] }, doubles: { n: [itemId] }, words:
{ n: { word: [sense] } }, properties, counts, aimed, rules, packedAt,
packedBy, poolHash }`. The clue engine (`bagclues.js`) reads it on a party
night: every clue word it names sits in two or three in-play bags, one guest
gets one true word, and no clue carries an item, a bag number or a person. A
rehearsal never reads it: every bag clue is a bracketed stand-in
(`bagStandIn`).

Runtime (built 17 Oct 2026, changed 23 Oct 2026):
- `functions/lib/case.js` holds CASE_SHAPE, the contract for `cases/{nightId}`.
  `buildCase` (the party case, `rehearsal: false`) and `rehearsalCase`
  (`rehearsal: true`) share one `dealCase`: roles, the motive drawn from
  `MOTIVES` with the deal's rng (crypto `randomInt` by default), the victim,
  the dial (`dialSign`, `dialMap`, `dial`, `dialLog`), `parlourPlan`,
  `screenSalt`, `solving`, `exposure`, `dealtClues`, and `spills` after Spill
  the Beans. Nothing sealed goes in, except the leans in `parlourPlan` on a
  party deal.
- `functions/lib/deal.js buildCaseForNight(db, nightId)` runs when the power
  returns after the Act 1 blackout (run.js `powerReturns`: the Blackout five
  seconds after the dark, or Power returns by hand; and the `act 2` jump),
  once: a case with roles is
  never replaced. `nights/{id}.forceRehearsal !== false` (the default from
  `createNight`; the workshop's `meta/game.party_night` checkbox sets it
  false) deals the rehearsal case, otherwise the party case; either way
  `nights/{id}.rehearsal` says which. The only `caseWarning` is
  `'trace-partner'` (an in-play trace with no in-play look-alike), shown on the
  Host tab as one plain line. It logs `case { nightId, rehearsal }` and
  nothing else.
- The cats: the Act 2 hint cat's card and the Act 4 cat station's card are
  `deal.catHintCard`: `{ kind: 'testimony', cat, catName, room, lines: [],
  hint }`, the hint from `cats.hintLine` (`seed/cat-lines.json`) at the rung
  of the cat's ladder its affection sets. The other three Act 2 cats give one
  greeting line. No affection roll, no brush-off, no blanks.
- The study pays the Ghost's trace at the dial's level (`station.js
  studyReveal`). Both W-O-O-F News bulletins come from the open bank
  (`news.js`, `seed/woof-news.json`). Sir Irwin's Act 5 screen is the first
  Irwin line in the workshop's openers and closers (`screen.js irwinVoice`,
  `DEFAULT_IRWIN`), the countdown line and the motive cards
  (`screen.irwinLines`, `screen.irwinMotiveClue`).
- Spill the Beans (`safeguards.js`) deals the fresh case the same way, by the
  case's own `rehearsal` flag, with a different motive, and reads nothing
  sealed. The ledger's blocking kinds are `study`, `echo` (the news on the
  screen), `hint`, `memory` and `room` (any Act 4 room's reward, 24 Oct;
  `ledger.BLOCKING_KINDS`).
- The dry-run rule: a dry run on the party's secrets is its own night, created
  with `createNight(db, { forceRehearsal: false, dryRun: true })` by
  `npm run fake-night -- --real-secrets` (with `--live
  --i-know-this-is-the-party-database` on the party project), joined only by
  the eight fake players, and discarded afterwards. It prints `Case: party`
  (or `Case: rehearsal`) and a `Party secrets used` counts line: lean sets in
  the plan, bag clues filled from the packing, drawing rounds from the bank. `createNight`
  points `public_state/active` at the new night, so the kiosks follow it; the
  Parlour TV would show the real drawing options. The script never joins
  Jon's or Susan's phones, but nothing in `night.join` refuses a dry-run
  night and an open phone follows the same pointer, so both stay off the game
  page until it prints PASS or FAIL.
- The canary (23 Oct): a person who is not coming plays a rehearsal night;
  Jenna looks over the leans through `steward.js`. No canary export exists or
  is planned.
