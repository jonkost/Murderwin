# Blind Content Protocol — sealed generation & validation

How sealed content gets made, checked, and used without Jon ever seeing it.
Companion to the SEAL section of CLAUDE.md.

## Generation — scripts/generate-sealed.mjs

Node script, run by Jon from the terminal. It:
1. Reads SAFE inputs only: seed/motives.json, safe_content (voice layers, pools).
2. Calls the Anthropic API per motive to write: 15 kernels (3 variants × 5 cats),
   3 document texts, 3 echo fragments. Prompts encode the voice rules:
   - impersonal (Ghost protection: never addressed to anyone, no personal memories)
   - no kernel/document/fragment may contain ANY word from its motive's rhyme line
   - Salem variants must warp a true fact from sibling kernels
   - Granolia variants must match truth with exactly one [POOL] variable
     omitted (she trails off / forgets it — incomplete, never wrong)
   - kernels use [ROOM]/[TIME]/[DURATION]/[COUNT]/[PLACE]/[CROWD] placeholders;
     the runtime injects pool items per seed
3. Assigns opaque codes (shuffled, no relation to motive order) and writes the
   manifest + content to Firestore `sealed/*` via Admin SDK.
4. Prints ONLY: per-code counts, validation pass/fail totals, and a run hash.
   Any error output must redact content (log doc paths + lengths, never text).

Re-running regenerates fresh content (new details/phrasings) — safe and encouraged
close to party day so nothing half-remembered can match.

## Validation — scripts/validate-sealed.mjs

Automated, counts-only. Checks per code:
- full coverage (15 kernels, 3 docs, 3 fragments)
- banned-word check vs. that code's motive rhyme (and vs. ALL rhyme words globally)
- length bounds (kernels ≤ 40 words; documents 40–60; fragments ≤ 15)
- placeholder integrity (only known [POOL] tokens; Granolia = exactly 1 fewer
  token than sibling truth kernels)
- Salem shares ≥1 concrete noun with a sibling truth kernel (the warped fact)
- no personal pronouns of address ("you", "your") — impersonality guard

Writes an aggregate report to `validation_reports` (client-readable):
`{codes: 19, complete: 19, banned: 0, lengthFails: 0, ... , pass: true}`.
The workshop dashboard renders this. No content ever leaves the function.

## Runtime use

Cloud Function `assembleTestimony(caseId, cat, playerCtx)`:
opener (random from safe pool) + kernel (active motive, that cat, random variant,
pools injected per case seed; Granolia gets one variable omitted; Salem serves the
warp variant per his 60% roll) + closer (random from safe pool).
Client receives only the final assembled string. Same pattern for documents
(template id + overlaid text) and echoes (frame + fragment).

## Seal-safe ops constraints

Two places where party prep could pierce the seal by accident:

1. **The rulebook tutorial example** may only ever be built from motive #8
   (the burned exception, if promoted) or from a wholly invented motive that
   appears nowhere in seed/motives.json. Never a fresh worked example against
   any other live motive — a clue chain derived from a real rhyme can converge
   with the blind-generated kernels for that rhyme.
2. **Rehearsals and tech checks** must never render sealed-derived text in
   front of Jon. Cue and kiosk tests run in a dummy/placeholder mode, or
   BEFORE the real case is generated; kiosk verification asserts idle/chrome
   states only. If a rehearsal ever exercises real content, regeneration
   afterward is mandatory and should be enforced by the tooling (the rehearsal
   mode itself triggers regen), not by memory.

## Human canary (optional, recommended)
One coded set can be exported by a Cloud Function to a share link for a trusted
NON-PLAYER to review for quality ("is this funny and coherent?"). The exporter
picks the code at random; the link never shows the manifest. One set out of 19
tells the canary nothing about the party.
