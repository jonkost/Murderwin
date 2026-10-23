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

Three tabs: **The secrets**, **The packing list** and **The cats' leans**.

**The secrets.** The first tab. Nineteen codes, one per motive. A code is a
short label the computer made up; it says nothing about which motive it is.
Pick one and the whole set opens: the riddle it serves at the top, then every
line the five cats can say about it, the three documents, the three news
fragments, the three study clues and Sir Irwin's three lines for Act 5.

**Skip three parts of each set.** They are no longer shown on the night:
- the news fragments (since 22 Oct: the W-O-O-F News bulletins replaced them);
- the study clues (since 22 Oct: the study now pays the victim's trace);
- Sir Irwin's three lines (since 23 Oct: his Act 5 screen shows only his
  open lines and the motive cards).

The generator still writes them. Whether the cats' lines and the documents
stay as extra clues is an open decision for Jon (secretLines). Until he
answers, read and edit those as normal. Once he answers, the parts nobody
will see come off this page.

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
That is the whole report. The checks count how many sets are marked done,
never which, and Jon never sees a word of what is in them. Jenna reading every set is also
the game's canary check: no one else reads the secrets for quality.

**The packing list.** The second tab. Ten bags, six things each, exactly as
the computer decided. Pack what is listed; a thing marked **pack two** goes in
twice. Nobody who is playing may see this tab or the packed bags open.

**The cats' leans.** The third tab, and Jenna's main secret job before the
party. Every Parlour Game question in Jon's list, its two answers, and which
answer each of the four listening cats would pick (Granolia, Miss Boo,
Zimothy, Salem; Irwin never listens). Tap an answer to set a cat's lean, tap
it again to clear it; each tap saves at once. The game picks the other answer
one time in four by itself, so pick the one that fits the cat. A blank still
works on the night: the game picks for that cat at random. The tab shows how
many leans are filled in. Nobody who is playing may see this tab.

## Not on this page: the Relay Drawing pictures

The three real pictures for the Act 6 drawing are a secret too, but this page
cannot show or change them. A command Jon runs makes them blind, and the
game checks them on its own. Whether Jenna should see and swap them here is an
open decision for Jon (stewardPictures). This section changes if he says yes.

## Every secret, what makes it, and where Jenna sees it

| The secret | What makes it (Jon runs the command; it prints counts only) | On this page |
|---|---|---|
| The cats' secret lines, the documents, the news fragments, the study clues and Irwin's lines, one set per motive, plus the list of which code is which motive | `npm --prefix scripts run generate` | The secrets tab (each set shows the riddle it serves) |
| Which answer each cat leans toward in the Parlour Games | `npm --prefix scripts run leans` fills only the blanks; Jenna sets or clears any lean | The cats' leans tab |
| Which numbered bag holds which items | `npm --prefix scripts run pack-bags` | The packing list tab |
| The Relay Drawing pictures | `npm --prefix scripts run relay-pictures` | Not on this page (stewardPictures) |
| Each night's case: who did it, who died, the motive, what each clue crosses off | The game itself, at the blackout at the end of Act 1 | Not on this page |

## What Jon sees

Only counts, never a word, and Jenna reports to Jon only "done" or "needs
more". Today the workshop's home shows how many motive sets exist and whether
the checks pass. The checks also count how many sets Jenna edited and marked
done, never which. Count-only rows on Home for whether the leans, the packing
list and the drawing pictures exist are not built yet (a card on the board).

## Making the secrets again

Running the generator again used to throw everything away first. It no
longer does. A set Jenna has edited is kept, byte for byte, and every other
set is written fresh. The codes stay the same, so a set Jenna marked done is
still the same set afterwards.

If a set really must be made again, Jon runs the generator with that one
code, or with "regenerate all". Either way the edited set is copied to a
safe place first, so nothing Jenna wrote is ever lost. The terminal prints
counts only: kept, generated, archived.

The leans work the same way: running the leans command again fills only the
blanks and never touches a lean Jenna set. To have one redone, Jenna clears
it on their page. The packing command refuses to replace a packing that is
already there unless Jon asks it to repack.

---

## For Claude Code

- The gate is `functions/lib/steward.js isSteward(token)`: `email_verified`
  must be true and `sha256(email.trim().toLowerCase())` must equal
  `RULES_STEWARD_HASH`, the same hash `firestore.rules isAdmin()` carries
  (`functions/test/admin-drift.test.mjs` keeps them equal). The env var
  `STEWARD_EMAIL_HASH` overrides it when it holds a 64-character hex hash, for
  a stand-in Steward on the emulator only: `stewardHash()` reads it when
  `FUNCTIONS_EMULATOR` is `true` and ignores it everywhere else, so a line in
  `functions/.env` can never open the sealed sets to another account on the
  deployed function. A UID never opens it; Jon's admin UID is
  refused with everyone else. No `firestore.rules` change: clients still cannot
  read `sealed/*`, and the callable is the only road.
- One callable, `steward` in `functions/index.js`, ops `whoami`, `list`,
  `read`, `write`, `mark`, `bags`, `leans`, `lean` (`stewardOp`, `OPS`). `list` returns codes with
  `edited`, `version`, `review`, `complete` and never the motive; `read`
  returns one set with the motive it serves (the Steward may see the manifest
  by design) and `checkSealed`'s reason codes; `write` takes one dotted field
  (`kernels.boo.1`, `kernels.salem.0.anchor`, `documents.2.emphasis`,
  `fragments.0`, `studyClue.1`, `irwin.2`; `fieldAllowed`) and a string up to
  `VALUE_MAX` characters, sets `editedAt`, `editedBy: 'steward'`, `version + 1`
  and keeps the generated five fields under `original` the first time; `mark`
  sets `review` to `'done' | 'more' | ''`; `bags` joins `sealed/bags` to the
  workshop's `bag_items` lines by id; `leans` returns the workshop's Parlour
  Games bank (`safe_content/scenarios`, safe) beside `sealed/parlour_leans`
  (sealed), one row per question with `leans { granolia, boo, zimothy, salem }`
  and a `filled` / `of` count; `lean { setId, q, cat, value: 'a'|'b'|'' }`
  writes one lean in a transaction over the whole table (`''` clears it). The
  log line is `steward <op> <code>`,
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
- The other blind scripts: `generate-leans.mjs` (`sealed/parlour_leans`,
  fills blanks only, so the Steward's leans survive), `pack-bags.mjs`
  (`sealed/bags`, refuses to replace without `--repack`) and
  `generate-relay-pictures.mjs` (`sealed/relay_pictures`, tops each round up
  to three, never touches a picture already there). No Steward op reads
  `sealed/relay_pictures` (open decision stewardPictures) or `cases/*`.
- Of `CONTENT_FIELDS`, `fragments`, `studyClue` and `irwin` are still read,
  written and validated but shown nowhere on the night (nothing calls
  `screen.echoLines`, Irwin's Act 5 screen no longer reads `cases.irwin`, and
  station.js pays the trace). Taking them
  off the generator, the validator, `checkSealed` and this page waits on
  secretLines.
- Tests: `functions/test/steward.test.mjs` (gate, every op, console captured
  and checked for synthetic strings), `app/test/steward.test.mjs`,
  `scripts/test/generate.test.mjs` (kept 1, generated 18; archive; force one;
  stdout checked for content).
