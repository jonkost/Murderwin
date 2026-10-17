# The secret content — how it gets made without you seeing it

The game's secrets are: what each cat actually reveals about each motive, the
documents that get overlaid on the stationery, the news fragments in the echoes,
(later) the event copy for Acts 2, 4 and 6, and which numbered bag holds which
items. Claude writes all of it. It goes
straight into the game's database. It never lands in a file on your Mac, never in
this folder, never on your screen, never in a chat.

This is what lets you host, build and still play.

## What you do

1. Finish the safe content in the workshop first: openers, closers, deflection
   lines, the six pools, the echo frames. The secrets are written to fit those.
2. When that's ready, Claude Code gives you one command to run in the terminal.
   It takes a few minutes and needs an internet connection.
3. It prints numbers only: how many sets were made, and PASS or FAIL. Nothing else.
   The workshop home then shows "19 of 19 motive sets complete — checked ✓".
4. If it says FAIL, run it again. Every run writes fresh sets with different
   details, except the ones Jenna has already edited: those are kept exactly as
   they are (see "Who writes and who edits"). Running it again the week of the
   party is a good idea: nothing you might half-remember can match what's live.

## What the secrets are, in words

For each of the 19 motives:
- **15 cat lines** — 3 versions for each of the 5 cats. This is the middle of a
  testimony; at game time the game puts one of your openers in front of it and one
  of your closers after it. Where a line needs a room, a time, a count and so on,
  it holds a blank like [ROOM], filled from your pools.
- **3 documents** — the biggest tell for that motive: a receipt, a telegram, a
  notice… 40 to 60 words, one word printed large, one handwritten annotation.
- **3 news fragments** — the juicy phrase that fills the ███ in an echo frame.
- **3 study clues**: the written clue the study pays out to a whole group at
  once, 20 to 60 words, a second angle on the same facts as the documents.
- **3 lines for Sir Irwin**: what he says on the living room screen in Act 5.
  Through the dog filter: twelve words at most, plainly true, and never a
  guest's name.

The rules Claude writes to:
- Never addressed to anyone. No "you", no names, no professions. Witnesses saw
  events, not people. (This protects the Ghost.)
- Never a word from that motive's rhyme, or the riddle solves itself.
- Irwin: plainly true. Boo: true and precise. Zimothy: true but minimal.
  Granolia: true, but at game time one of her blanks is filled with the wrong
  item from the same pool — she misremembers one detail. Salem: confidently wrong,
  twisting a true fact from the others so a careful player can catch it.

## Who writes and who edits

Decided 28 September. You and Susan draft; Claude drafts the secrets; Jenna, the
Steward, edits everything.

- **You and Susan draft the safe lines only**: openers, closers, deflection
  lines, pools, echo frames, innocent beats. You both play, and anything you
  draft you would recognise on the night.
- **Claude drafts all the secrets**, through the generator described above.
- **Jenna edits all of it**, from wherever they are, on their own page in the
  workshop (For Jenna, then **Open your page**; built 17 October, see
  `docs/steward-view.md`). The server opens it for their account only: yours
  is refused by code, with no rule change. They never share their screen with
  you, and they tell you only "done" or "needs more". Making the secrets again
  never wipes Jenna's edits: an edited set is kept as it is, and the only two
  ways to replace one copy it to a safe place first.

## The bags

You and Susan list the bag items in the workshop (Bags → Bag items). The game
then decides which items go in which numbered bag, without either of you seeing
it, and saves that packing as a secret. Only Jenna's page shows the packing list,
and Jenna packs the bags to it. Because the game decided the packing, it already
knows what is in every bag when it writes the clues.

## The checks

After every run the secrets are checked automatically: every set complete, no
rhyme words, right lengths, blanks in the right shape, Granolia's blanks matching
the truthful lines so there's always one to swap, Salem's twist catchable, nothing
that says "you". You only ever see the counts. If something fails, the fix is
always "run it again".

## Rehearsals, the party night and dry runs (decided 17 October 2026)

Every night you start from your phone is a rehearsal. The cats read bracketed
stand-in text, the documents say REHEARSAL, and the act line on every phone
says "rehearsal". The secrets stay sealed and nothing you see on a rehearsal
night is a secret.

On the day of the party, open the workshop's Game night page and tick **This
is the party night**. The next night you start from your phone then draws one
motive set from the secrets at the blackout, when the power goes out at the
end of Act 1. The case is built then, not before: it needs to know who came.
If the secrets are missing or a set fails its checks, the night quietly falls
back to rehearsal text and your Host tab shows one line saying so. Untick the
box after the party.

A **dry run with the real secrets** is how the game gets tested end to end
without you. It is a separate night that the eight fake players
(`scripts/fake-players.mjs`) create for themselves, marked as a dry run and
not a rehearsal. Only the fake players join it. You watch it from the Host
tab and the TV, which never show secret text, and the script throws the night
away afterwards. Your phone and Susan's phone never join a dry run. If either
of you ever sees real secret text by accident, the secrets get regenerated
before the party.

## Two ways you could get spoiled by accident

1. **The rulebook tutorial example** may only be built from motive #8 (already
   spoiled for you) or from a made-up motive that isn't one of the 19. Never a
   worked example against a real motive.
2. **Rehearsals and screen tests** never show real secret text in front of you.
   They run on rehearsal text (the default for every night you start). If a
   rehearsal ever shows real content, the secrets get regenerated afterwards.
   The tooling forces that, not your memory.

## The canary

One motive's set — chosen at random, never named — can be sent to your canary to
read for quality: is it funny, does it hold together. One set out of 19 tells them
nothing about the party. The canary is chosen; this waits on the secrets existing.

---

## For Claude Code (technical appendix)

Generation — `scripts/generate-sealed.mjs` (Node, run by Jon from the terminal):
1. Reads SAFE inputs only: `seed/motives.json`, `seed/characters.json` (names,
   for the dog filter) and safe_content `pools`, `openers`, `closers`,
   `refusals` (`lib.mjs readSafeInputs`). The pools and voice layers go into
   the prompt as a stanza (`inputStanza`) so kernels use pool vocabulary and
   sit between the openers and closers; stdout prints their counts only.
2. Calls the Anthropic API per motive for 15 kernels (3 variants × 5 cats), 3
   document texts, 3 echo fragments, 3 study clues and 3 Irwin lines (the
   sealed shape is documented at the top of `scripts/lib.mjs`). Prompt rules:
   impersonal; no word from the motive's rhyme; Salem variants warp a true fact
   from sibling kernels and return an `anchor` noun; Granolia variants carry
   EXACTLY the same [POOL] token multiset as a truthful sibling kernel (decided
   26 Sep: she misremembers; the runtime swaps one injected value for another
   item from the same pool, chosen once per case so it is stable all night);
   kernels use [ROOM]/[TIME]/[DURATION]/[COUNT]/[PLACE]/[CROWD]; documents,
   fragments, study clues and Irwin lines carry no placeholders; Irwin lines
   pass the dog filter (at most 12 words, never a character's name).
3. Assigns opaque codes (crypto-shuffled, unrelated to motive order) and writes
   manifest + content to Firestore `sealed/*` via Admin SDK. Since 17 Oct it
   never clears `sealed/*` first: a doc with `editedAt` (the Steward's edit
   mark, `functions/lib/steward.js`) is kept and counted, every other set is
   rewritten, and the manifest keeps its codes. `--regenerate-all` copies each
   edited doc to `sealed/_archive/items/{code}-{ts}` and then replaces all 19;
   `--force-code CODE` replaces that one set (archived first if edited) and
   keeps the rest. The counts line reads `kept N, generated M, archived K`.
   `runGenerate(db, { generate, ... })` is exported and tested on a memory db
   (`scripts/test/generate.test.mjs`).
4. Prints ONLY per-code counts, pass/fail totals and a run hash, every line
   through `say()` (80 characters at most). Errors are redacted to
   type/code/length. ORDER is information: motives are processed in a
   crypto-shuffled order, progress lines carry counters only, per-code count
   lines print once at the end sorted by code string.

Bag contents are sealed too: `sealed/bags`, written by the blind packer
(`npm --prefix scripts run pack-bags`, built 18 Oct 2026). It reads the bag
items from the workshop, packs ten bags of six under the bag rules, prints
counts and PASS or FAIL only, and refuses to replace a packing that is already
there (or one the Steward edited) unless run with `--repack`. The bags station
reads it on the night: the property on the card is in two or three bags, one of
them the murderer's or the victim's, and the card never carries a bag number.
The generator reads only the property words, as words to keep out of the text. Event copy for Acts 2, 4 and 6 is sealed too (CLAUDE.md, 25 Sep): same pipeline,
same counts-only rules, into `sealed/events/*`. Not built yet.

Validation — `scripts/validate-sealed.mjs`, counts-only, per code:
- coverage (15 kernels, 3 docs, 3 fragments)
- banned words vs. own rhyme (gates the pass); overlap with OTHER rhymes counted
  as `bannedGlobal`, advisory only — common words recur across 19 rhymes
- length bounds (kernels ≤ 40 words; documents 40–60; fragments ≤ 15)
- placeholder integrity (only canonical tokens; Granolia = same token multiset as
  some truth kernel, ≥ 1 token)
- Salem's declared anchor appears verbatim in his text and in a truth kernel
- impersonality guard (no you/your)
- study clues by form (3 strings, 20 to 60 words, no tokens); Irwin lines by
  the dog filter (3 strings, at most 12 words, no character name, no tokens)
Writes `{codes, complete, banned, bannedGlobal, lengthFails, placeholderFails,
granoliaFails, salemFails, impersonalFails, studyClueFails, irwinFails, edited,
reviewed, pass}` to `validation_reports` (`edited` and `reviewed` count the
Steward's marks; an edited doc is checked exactly like the rest). `node validate-sealed.mjs --dry` runs the same checks
on a synthetic set in memory (`lib.mjs syntheticSealedSet`) and touches
nothing; `npm --prefix scripts test` covers it.

Runtime (built 17 Oct 2026):
- `functions/lib/case.js` holds CASE_SHAPE, the contract for `cases/{nightId}`
  that every consumer builds against, and the pure builders: `buildCase`
  (sealed set in, case out), `rehearsalCase` (same keys, bracketed stand-ins),
  `checkSealed` (the structural check, reason codes only).
- `functions/lib/deal.js buildCaseForNight(db, nightId)` runs at the Act 1
  blackout (run.js `power`, and the `act 2` jump), once: a case with roles is
  never replaced. With `nights/{id}.forceRehearsal !== false` (the default
  from `createNight`; the workshop's `meta/game.party_night` checkbox sets it
  false) or no `sealed/manifest`, it writes the rehearsal case and
  `nights/{id}.rehearsal = true`. Otherwise it draws a code with crypto
  randomness, reads `sealed/{code}`, runs `checkSealed`, tries up to five
  codes, then falls back to rehearsal with `nights/{id}.caseWarning =
  'rehearsal-fallback'`. The cast-lock check adds `'trace-partner'` when an
  in-play trace has no in-play look-alike. The Host tab shows `caseWarning`
  as one plain line. It logs `{ nightId, kernelCount, docCount, rehearsal,
  triedCodes }` and nothing else.
- Fixed per case: one pool value per key (`pools`), Granolia's one wrong blank
  (`granoliaSlot`), one kernel variant per cat (`variant`), the stationery
  template, `dialSign { ghost: +1, murderer: -1 }` (never random), the hidden
  roles' Parlour Game set indexes (`hiddenSets`).
- Testimony: opener (safe) + kernel (`kernelFor`: the case's variant; Salem
  rolls per (nightId, guestKey) with a seeded hash, 60 percent his warp, 40
  percent Irwin's kernel at `salemTruthIndex`) + the safe's three numbers in a
  safe sentence (ui_copy `NUMBERS:` with [A] [B] [C]) + closer (safe). A
  deflect deals a second notice card, "a scrap of paper", carrying the numbers
  (ui_copy `NOTICE SCRAP:`). `card.placeholder` is `cases.rehearsal`
  everywhere; the bracketed text appears only when the case is a rehearsal.
- Documents: `cases.documents[0]` is the safe's pay-out; the study pays
  `cases.studyClue.text` (station.js `studyClueCard`); the echo frame gets
  `cases.echo.fragment`; Act 5 gets `cases.irwin.lines`.
- The dry-run rule: a dry run with real sealed content is its own night,
  created with `createNight(db, { forceRehearsal: false, dryRun: true })`,
  joined only by the eight fake players (`scripts/fake-players.mjs`), watched
  from the Host tab and the TV, and discarded afterwards. Jon's and Susan's
  phones never join it. Canary export: a Function picks a code at random and
  shares that set by link; the link never shows the manifest (not built).
