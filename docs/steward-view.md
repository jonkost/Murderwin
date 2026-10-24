# Jenna's page: the packing list, the cats' leans and the checks

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

Three tabs: **The packing list**, **The cats' leans** and **The checks**.
(Changed 23 Oct 2026: the secrets tab is gone. Jon retired the cats' secret
lines and took the Act 2 safe out, so there are no secret sets left to read.
The checks tab came on 24 Oct.)

**The packing list.** The first tab. Ten bags, four or five things each: one
food, at least one thing to touch, and extras, exactly as the computer
decided from Jon's final 24 items. Each line gives the item's name and what
it looks like. A line that starts with **2** means two single candies of that
kind ("2 Kisses"). Where a line says what it looks like, any one that matches
will do (the six balls are each their own). The order inside a bag does not
matter. Nobody who is playing may see this tab or the packed bags open.

**The cats' leans.** The second tab. Every Parlour Game question in Jon's
list, its two answers, and which answer each of the four listening cats would
pick (Granolia, Miss Boo, Zimothy, Salem; Irwin never listens). A command Jon
runs fills them in blind, so looking them over is optional. Tap an answer to
set a cat's lean, tap it again to clear it; each tap saves at once. The game
picks the other answer one time in four by itself, so pick the one that fits
the cat. A blank still works on the night: the game picks for that cat at
random. The tab shows how many leans are filled in. Nobody who is playing may
see this tab.

**The checks.** The third tab. One button, **Run the checks**. The server
checks the real packing (PK1: ten bags of four or five, each pair in the bag it is listed for; G43: every bag has two clue words; PK2: with two bags
sitting out, nearly every bag still keeps two clue words), the cats' leans
(LN1: every question has a lean for every cat) and the drawing pictures
(RP1: a good picture for each of the three rounds). Each line says PASS or FIX NEEDED, the check's number and its name, and a count for every check but PK1. Nothing it read is
shown. Run it after packing and after any change to the leans; tell Jon
"done" when every line says PASS, or "needs more" and the check's number.

## Jenna's jobs

- Read the workshop's lists cold (For Jenna lists them, in order).
- Look over the cats' leans, if there is time.
- Pack the bags to the packing list, at the house before the guests arrive
  (Jenna comes to the party and does not play).
- Run the checks on the third tab.

Jenna tells Jon only "done" or "needs more".

## Not on this page: the Relay Drawing pictures

The three real pictures for the Act 6 drawing are a secret too, but this page
does not show or change them. A command Jon runs makes them blind, and the
game checks them on its own; the checks tab says only whether each round has
a good one. Decided 24 Oct 2026 (stewardPictures, the handoff's default): no
pictures tab, the blind script is enough.

## Every secret, what makes it, and where Jenna sees it

| The secret | What makes it (Jon runs the command; it prints counts only) | On this page |
|---|---|---|
| Which answer each cat leans toward in the Parlour Games | `npm --prefix scripts run leans` fills only the blanks; Jenna sets or clears any lean | The cats' leans tab |
| Which numbered bag holds which items | `npm --prefix scripts run pack-bags` | The packing list tab |
| The Relay Drawing pictures | `npm --prefix scripts run relay-pictures` | Only RP1 on the checks tab, a count |
| Each night's case: who did it, who died, the motive, what each clue crosses off | The game itself, at the blackout at the end of Act 1 | Not on this page |

## What Jon sees

Only counts, never a word, and Jenna reports to Jon only "done" or "needs
more". The workshop's Health page shows Jon the last run of `npm run checks`,
on stand-in cases only. Count-only rows on Home for whether the leans, the
packing list and the drawing pictures exist are not built yet (a card on the
board).

## Making the secrets again

Running the leans command again fills only the blanks and never touches a
lean Jenna set. To have one redone, Jenna clears it on their page. The
packing command refuses to replace a packing that is already there unless
Jon asks it to repack. The pictures command only tops each round up to three
and never touches a picture already there.

---

## For Claude Code

- The gate is `functions/lib/steward.js isSteward(token)`: `email_verified`
  must be true and `sha256(email.trim().toLowerCase())` must equal
  `RULES_STEWARD_HASH`, the same hash `firestore.rules isAdmin()` carries
  (`functions/test/admin-drift.test.mjs` keeps them equal). The env var
  `STEWARD_EMAIL_HASH` overrides it when it holds a 64-character hex hash, for
  a stand-in Steward on the emulator only: `stewardHash()` reads it when
  `FUNCTIONS_EMULATOR` is `true` and ignores it everywhere else, so a line in
  `functions/.env` can never open the sealed lists to another account on the
  deployed function. A UID never opens it; Jon's admin UID is
  refused with everyone else. No `firestore.rules` change: clients still cannot
  read `sealed/*`, and the callable is the only road.
- One callable, `steward` in `functions/index.js`, ops `whoami`, `bags`,
  `leans`, `lean`, `checks` (`stewardOp`, `OPS`). `bags` joins `sealed/bags` to the
  workshop's `bag_items` lines by id (`readBagLine`: name, "looks like" note,
  clue words; a `doubles` item is named "2 <name>"); `leans` returns the workshop's Parlour
  Games bank (`safe_content/scenarios`, safe) beside `sealed/parlour_leans`
  (sealed), one row per question with `leans { granolia, boo, zimothy, salem }`
  and a `filled` / `of` count; `lean { setId, q, cat, value: 'a'|'b'|'' }`
  writes one lean in a transaction over the whole table (`''` clears it). The
  log line is `steward <op>`, nothing else. Refusals are `NightError` codes
  `permission-denied`, `unauthenticated`, `invalid`, `no-doc`, mapped in
  `CODE_MAP`. `checks` (24 Oct) reads `sealed/bags`, `sealed/parlour_leans`,
  `sealed/relay_pictures` and the scenarios list, runs `packingChecks`,
  `leanChecks` and `pictureChecks` from `functions/lib/checks.js` (loaded
  lazily: `checks.js` reaches `act4.js`, which reaches `deal.js`, which
  imports `steward.js`), and returns `{ allPass, results: [{ id, name, pass,
  count?, of? }] }`: ids, names, booleans and counts only. Removed 23 Oct
  2026 with the secret sets: `list`, `read`, `write`, `mark` and the secrets
  tab.
- The page is `app/src/pages/Steward.jsx` at `/steward` (no rail link; linked
  from `ForJenna.jsx`). `app/src/lib/steward.js` holds the pure parts
  (`routeState`, `packingRows`); `app/src/lib/stewardApi.js` is the callable,
  with a preview fake under `?preview=1` (a synthetic packing list and lean
  table). Sealed content lives in React state only: no localStorage, no
  Firestore client (the callable bypasses the cache).
- The blind scripts: `generate-leans.mjs` (`sealed/parlour_leans`, fills
  blanks only, so the Steward's leans survive), `pack-bags.mjs` (`sealed/bags`,
  refuses to replace without `--repack`) and `generate-relay-pictures.mjs`
  (`sealed/relay_pictures`, tops each round up to three, never touches a
  picture already there). `generate-sealed.mjs` and `validate-sealed.mjs` are
  deleted (23 Oct 2026); the 19 `sealed/{code}` sets and `sealed/manifest`
  stay in Firestore and nothing reads them. Only `checks` reads
  `sealed/relay_pictures`, for RP1's count; no Steward op reads `cases/*`.
- Tests: `functions/test/steward.test.mjs` (the gate, the five ops, the old
  secrets ops refused, the log carries the op only, the checks return nothing
  they read) and `app/test/steward.test.mjs` (the route, the packing list, no
  browser storage, no secrets tab).
