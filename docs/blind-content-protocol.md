# The secret content — how it gets made without you seeing it

The game's secrets are: what each cat actually reveals about each motive, the
documents that get overlaid on the stationery, the news fragments in the echoes,
and (later) the event copy for Acts 2, 4 and 6. Claude writes all of it. It goes
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
4. If it says FAIL, run it again. Every run throws the old secrets away and writes
   fresh ones with different details. Running it again the week of the party is a
   good idea: nothing you might half-remember can match what's live.

## What the secrets are, in words

For each of the 19 motives:
- **15 cat lines** — 3 versions for each of the 5 cats. This is the middle of a
  testimony; at game time the game puts one of your openers in front of it and one
  of your closers after it. Where a line needs a room, a time, a count and so on,
  it holds a blank like [ROOM], filled from your pools.
- **3 documents** — the biggest tell for that motive: a receipt, a telegram, a
  notice… 40 to 60 words, one word printed large, one handwritten annotation.
- **3 news fragments** — the juicy phrase that fills the ███ in an echo frame.

The rules Claude writes to:
- Never addressed to anyone. No "you", no names, no professions. Witnesses saw
  events, not people. (This protects the Ghost.)
- Never a word from that motive's rhyme, or the riddle solves itself.
- Irwin: plainly true. Boo: true and precise. Zimothy: true but minimal.
  Granolia: true, but at game time one of her blanks is filled with the wrong
  item from the same pool — she misremembers one detail. Salem: confidently wrong,
  twisting a true fact from the others so a careful player can catch it.

## Who writes and who edits

Decided 28 September. You, your wife and Claude draft; Jenna, the Steward,
edits everything.

- **You draft the safe lines only**: openers, closers, deflection lines, pools,
  echo frames, innocent beats. Anything you draft you would recognise on the
  night, so the secrets are never yours to draft.
- **Your wife and Claude draft the secrets.** Claude's first drafts come from the
  generator described above.
- **Jenna edits all of it**, from wherever they are, in a page only their account
  can open. They never share their screen with you, and they tell you only
  "done" or "needs more". That page isn't built yet, and making the secrets again
  must never wipe Jenna's edits.
- **Jenna also puts the bags together**, since the bags are built from the
  secrets.

## The checks

After every run the secrets are checked automatically: every set complete, no
rhyme words, right lengths, blanks in the right shape, Granolia's blanks matching
the truthful lines so there's always one to swap, Salem's twist catchable, nothing
that says "you". You only ever see the counts. If something fails, the fix is
always "run it again".

## Two ways you could get spoiled by accident

1. **The rulebook tutorial example** may only be built from motive #8 (already
   spoiled for you) or from a made-up motive that isn't one of the 19. Never a
   worked example against a real motive.
2. **Rehearsals and screen tests** never show real secret text in front of you.
   They run in a dummy mode, or before the real case exists. If a rehearsal ever
   shows real content, the secrets get regenerated afterwards — the tooling should
   force that, not your memory.

## The canary

One motive's set — chosen at random, never named — can be sent to your canary to
read for quality: is it funny, does it hold together. One set out of 19 tells them
nothing about the party. The canary is chosen; this waits on the secrets existing.

---

## For Claude Code (technical appendix)

Generation — `scripts/generate-sealed.mjs` (Node, run by Jon from the terminal):
1. Reads SAFE inputs only: `seed/motives.json`, safe_content (voice layers, pools).
2. Calls the Anthropic API per motive for 15 kernels (3 variants × 5 cats), 3
   document texts, 3 echo fragments. Prompt rules: impersonal; no word from the
   motive's rhyme; Salem variants warp a true fact from sibling kernels and return
   an `anchor` noun; Granolia variants carry EXACTLY the same [POOL] token multiset
   as a truthful sibling kernel (decided 26 Sep: she misremembers — the runtime
   swaps one injected value for another item from the same pool, chosen per case
   seed so it is stable all night); kernels use [ROOM]/[TIME]/[DURATION]/[COUNT]/
   [PLACE]/[CROWD]; documents and fragments carry no placeholders.
3. Assigns opaque codes (crypto-shuffled, unrelated to motive order) and writes
   manifest + content to Firestore `sealed/*` via Admin SDK. Clears old docs first.
4. Prints ONLY per-code counts, pass/fail totals and a run hash. Errors are
   redacted to type/code/length. ORDER is information: motives are processed in a
   crypto-shuffled order, progress lines carry counters only, per-code count lines
   print once at the end sorted by code string.

Event copy for Acts 2, 4 and 6 is sealed too (CLAUDE.md, 25 Sep): same pipeline,
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
Writes `{codes, complete, banned, bannedGlobal, lengthFails, placeholderFails,
granoliaFails, salemFails, impersonalFails, pass}` to `validation_reports`.

Runtime — Cloud Function `assembleTestimony(caseId, cat, playerCtx)`: opener
(random, safe) + kernel (active motive, that cat, random variant, pools injected
per case seed; Granolia gets exactly one value swapped; Salem serves the warp
variant per his 60% roll) + closer (random, safe). A failed affection roll never
reaches a kernel: return a deflection line from the safe `refusals` layer. Client
receives only the final string. Same pattern for documents (template id + overlaid
text) and echoes (frame + fragment). Canary export: a Function picks a code at
random and shares that set by link; the link never shows the manifest.
