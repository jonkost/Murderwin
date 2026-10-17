# Jenna's page: reading and editing the secrets

Jenna is the Steward. They are the one person who may see everything, because
they are the one person who will not be playing. This page is theirs. Jon
never opens it: his account is turned away on screen and refused by the
server, so even a wrong click shows him nothing.

## How Jenna gets there

1. Sign in to the workshop with the same Google account as always.
2. Open **For Jenna** in the rail. Under "What to do first" there is a button,
   **Open your page**. It is not in the rail on purpose.
3. The page checks with the server that this is the Steward's account. For
   anyone else, Jon included, it says **Not for you.** and stops.

## What is on it

**The secrets.** Nineteen codes, one per motive. A code is a short label the
computer made up; it says nothing about which motive it is. Pick one and the
whole set opens: the riddle it serves at the top, then every line the five
cats can say about it, the three documents, the three news fragments, the
three study clues and Sir Irwin's three lines for Act 5.

Every line is a box. Change a line in place and it saves on its own: **saved**
in the corner means saved, a red bar means it did not save, so try again
when there is signal. The first time a set is changed, the computer keeps a
copy of what it wrote, and **Show what the generator wrote** puts that copy
under each changed line.

Keep the blanks exactly as they are: words in square brackets like [ROOM] or
[TIME] are filled in by the game from Jon's pools. Never use a word from the
riddle. Never name a person. If a change would break the set, a note at the
top says so in plain words; that set would read as rehearsal text on the
night until it is fixed.

**Your two words.** Under the riddle on every set: **Done** or **Needs more**.
That is the whole report. Jon sees how many sets are marked done, never
which, and never a word of what is in them.

**The packing list.** The second tab. Ten bags, six things each, exactly as
the computer decided. Pack what is listed; a thing marked **pack two** goes in
twice. Nobody who is playing may see this tab or the packed bags open.

## What Jon sees

Only counts: how many sets have been edited, how many are marked done, and
whether the checks pass. The workshop's home shows those numbers with the
rest of the progress. Jenna reports to Jon only "done" or "needs more".

## Making the secrets again

Running the generator again used to throw everything away first. It no
longer does. A set Jenna has edited is kept, byte for byte, and every other
set is written fresh. The codes stay the same, so a set Jenna marked done is
still the same set afterwards.

If a set really must be made again, Jon runs the generator with that one
code, or with "regenerate all". Either way the edited set is copied to a
safe place first, so nothing Jenna wrote is ever lost. The terminal prints
counts only: kept, generated, archived.

---

## For Claude Code

- The gate is `functions/lib/steward.js isSteward(token)`: `email_verified`
  must be true and `sha256(email.trim().toLowerCase())` must equal
  `RULES_STEWARD_HASH`, the same hash `firestore.rules isAdmin()` carries
  (`functions/test/admin-drift.test.mjs` keeps them equal). The env var
  `STEWARD_EMAIL_HASH` overrides it when it holds a 64-character hex hash, for
  a stand-in Steward on the emulator. A UID never opens it; Jon's admin UID is
  refused with everyone else. No `firestore.rules` change: clients still cannot
  read `sealed/*`, and the callable is the only road.
- One callable, `steward` in `functions/index.js`, ops `whoami`, `list`,
  `read`, `write`, `mark`, `bags` (`stewardOp`). `list` returns codes with
  `edited`, `version`, `review`, `complete` and never the motive; `read`
  returns one set with the motive it serves (the Steward may see the manifest
  by design) and `checkSealed`'s reason codes; `write` takes one dotted field
  (`kernels.boo.1`, `kernels.salem.0.anchor`, `documents.2.emphasis`,
  `fragments.0`, `studyClue.1`, `irwin.2`; `fieldAllowed`) and a string up to
  `VALUE_MAX` characters, sets `editedAt`, `editedBy: 'steward'`, `version + 1`
  and keeps the generated five fields under `original` the first time; `mark`
  sets `review` to `'done' | 'more' | ''`; `bags` joins `sealed/bags` to the
  workshop's `bag_items` lines by id. The log line is `steward <op> <code>`,
  nothing else. Refusals are `NightError` codes `permission-denied`,
  `unauthenticated`, `invalid`, `no-doc`, mapped in `CODE_MAP`.
- The page is `app/src/pages/Steward.jsx` at `/steward` (no rail link; linked
  from `ForJenna.jsx`). `app/src/lib/steward.js` holds the pure parts
  (`routeState`, `fieldsOf`, `setField`, `shapeWords`, `packingRows`,
  `syntheticSet`); `app/src/lib/stewardApi.js` is the callable, with a
  preview fake under `?preview=1`. Sealed text lives in React state only:
  no localStorage, no Firestore client (the callable bypasses the cache).
- `scripts/generate-sealed.mjs runGenerate(db, { generate, regenerateAll,
  forceCode })` keeps any doc with `editedAt`, keeps the manifest's codes, and
  archives an edited doc to `sealed/_archive/items/{code}-{ts}` before
  replacing it (`--regenerate-all`, or `--force-code CODE`). It never deletes
  `sealed/*`. `scripts/validate-sealed.mjs` reads the five content fields of
  every doc, edited or not, and reports `edited` and `reviewed` counts.
- Tests: `functions/test/steward.test.mjs` (gate, every op, console captured
  and checked for synthetic strings), `app/test/steward.test.mjs`,
  `scripts/test/generate.test.mjs` (kept 1, generated 18; archive; force one;
  stdout checked for content).
