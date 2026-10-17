# The play side — what guests see on their phones

This is the part of the game that lives on each guest's own phone during the
party. Built 8 October 2026 as the first slice of the build order ("one
character onto a phone via QR"), and shaped so the rest of the night can be
added to it act by act. Everything on it is safe for you to see: your own
character, the rules, the nineteen motives, the five of the household.

## What exists now

**The door.** A guest opens the square code at the entrance (printable from
the workshop's Game night page). Their phone signs itself in silently — no account, no
password — and shows "Who are you? Tap your name." The names come from the
guest list you write in the workshop. One tap, and the game hands them a
character at random. You and Susan are marked as hosts on that list, so you
always get the Professors. The same screen tells them which numbered bag to
collect.

**The phone at rest.** Their character: name, profession, a one-line bio, the
bag number, and now and then a line from a cat wandering past. Under it, the
Reticule — four tabs:
- *You* — the character card.
- *Motives* — all nineteen rhymes, visible from Act 1. Tap to cross one off.
  That is the guest's own note; it proves nothing and nobody else sees it.
- *Cats* — the five of the household, who they are, and how each one stands
  with this guest tonight, in words. Numbers never show.
- *Rules* — the rulebook sections from the workshop, with sensible defaults
  until yours are written.

**The moments.** When a host presses a button, every phone follows at once:
- *Blackout* — every screen goes dark. Nothing on any phone.
- *Power returns* — every phone lights at once with its role card, held for
  fifteen seconds measured against the server's clock, then a "Hide this"
  button. Act 2 begins. The case is built at this moment, blind (17 Oct).
- *Pause* — "Sir Irwin requires the garden."
- *Acts 1 to 7* — the act name and its objective line appear at the top of
  every phone.

**The Host tab.** Type the host names from the Game night page and your own
phones get a fifth tab, *Host*: the doors
(open or closed), the seven act buttons, Blackout, Power returns, Pause, who is
here with a green dot for phones heard from lately, the square code to show a
guest, and "Start a new night" for rehearsals. Nothing on the night needs the
workshop or a Google sign-in. The buttons are labelled by what they do; none
of them can show who the Murderer, the Ghost or the victim is.

**A dead phone.** The guest taps their name on any other phone. The character,
bag and cat standings move with them. The old phone says the character has
moved to another phone. If it was a host's phone, the Host tab moves too.

**No signal.** A red strip says the Manor cannot hear the phone and that nothing
is lost. The phone keeps showing what it last saw and catches up on its own.

## The whole night on the phone (built 13 October 2026)

Every screen a guest will see between the door and the reveal now exists on
the phone, with stand-in text wherever the real words are not written yet.
Stand-in text is always in brackets and marked "Rehearsal text", so nothing
on a phone can be mistaken for content. Jenna's secrets and your workshop
lines drop in later without changing a single screen.

**Getting started.** The first time a phone has a character it walks the
guest through four pages: who they are, their bag number, the household, and
the Reticule. "Show me around again" on the You tab brings it back.

**The Reticule** is now six tabs: *Now* (what to do at this moment), *You*,
*Clues* (everything a cat said, every paper, every clue a room paid out,
newest first), *Motives*, *Cats* and *Rules*. When something new lands, the
phone opens Now by itself and a red dot sits on the tab until it is dealt
with.

**One button runs the night.** The night is a list of beats, act by act,
written down in one place (`seed/night.json`, structure only). On the Host
tab, *Run the night* shows the beat you are on, what it is for, and one big
button: *Next*. Pressing it does whatever that beat needs on every phone at
once: a notice, a cat to go and find, a puzzle, a window of questions, the
Act 4 groups, a rotation, the drawing, the ballot, the reveal. The button
never shows you content, only "sent to 9 phones". *Back one* steps back
without dealing anything. The act numbers and Blackout / Power returns are
still there for jumping about in a rehearsal.

**What the phone shows, act by act.**
- *Act 1.* Three notices: meet the household, say your name and profession
  out loud, settle in. Then Blackout.
- *Power returns.* Every phone shows its role card, held fifteen seconds, the
  same shape on every phone. Then "Where things are".
- *Act 2.* Eyes up for the news. Then "Go to the scullery, Salem is waiting":
  tap "I'm here" and the cat speaks, in three short paragraphs or one
  brush-off, gated by how that cat feels about you. Then the safe: three
  numbers the cat let slip, in order; three misses and it gives way. The
  pay-out is a document printed on a piece of stationery. Then every phone
  lights up with three silly questions from a cat. Then check-in.
- *Act 3.* Phones down. The bulletin. Then "You are with Jacob and Mari."
- *Act 4.* Five stations, one card each: the study (its clue lands on every
  phone in the group), a cat who talks to the whole group, the bags
  ("something minty is in two or three bags"), a small shape puzzle on the
  phone, and check-in. Two more rounds of questions in between.
- *Act 5.* Cake, then the chime and "go to the living room".
- *Act 6.* The last questions, the drawing (already built), "the door is
  open", then the deduction round: every phone picks one thing it is not, a
  person or a motive, and the room's picks are listed on every Now tab.
- *Act 7.* The ballot: who, why, who died; two minutes on the server's
  clock; a phone that does not pick gets a random pick. "Eyes on the
  screen" for the reveal. Then each phone's own result: three ticks or
  crosses and what it said.

**Windows.** Questions, the deduction round and the ballot are windows: every
phone at once, a bar counting down against the server's clock, and they never
close early. When the time is up the phone goes back to rest and the server
picks for anyone who did not, so a no-show is never a pattern. The Next
button waits for the window to run out.

**Rehearsing.** Start a night, join from a few phones (or a few browser tabs
in private windows), and press Next. The first time roles are needed the
server deals a throwaway case for that night only: rehearsal nights say
"rehearsal" in the act line. Every screen can also be looked at without a
night at `?preview=<name>`, and `?preview=tour` walks all thirty-nine of them
with arrows at the top.

## What you do

1. Workshop → Game night: type the name each of you will use on your phone,
   and save the square code picture for the Act 1 slide.
2. Put it live (the deploy command is under the technical heading below).
3. On your phone, open the game. While no night is live the doors screen
   offers *Host? Start the night*. Tap it, then type your name. Your character
   appears, and the Host tab with it.
4. Press the act buttons and watch the other phones follow. Press *Blackout*,
   then *Power returns*, and time the fifteen-second hold.

Start a new night from the Host tab as often as you like while testing. Each
one is fresh, and every phone types its name again.

**Rehearsing without anyone (17 Oct 2026).** `npm run fake-night` plays a whole
night with eight fake phones and throws it away: one line per act, a tally,
PASS. `npm run emulate` starts a pretend Firebase on your Mac so a rehearsal on
real phones never touches the party; `docs/on-the-night.md` has the steps, and
is the page to have open on the day.

**Portraits.** Drop one picture per character into `play/public/portraits/`,
named after the character (the README in that folder lists the names), then
`npm run deploy:site`. A character without a picture shows initials.

## What is not built yet (17 October 2026)

- Jenna's page: the Steward reads and edits the secrets; your account is
  refused by code.
- The secrets themselves: the generator needs your Anthropic key once, then
  Jenna reads every set. Until then every night deals bracketed stand-ins.
- The bag packing (a blind script) and the seven stationery pictures; the
  stand-ins work until then.
- The finale staging on the TV and tappable achievements.
- Spill the Beans and the Hush: your two safeguard buttons.
- The workshop's Freeze button for 7 November.

Built since the first slice: the whole night on the phone (above), the case
bridge and cat testimony with the safe, the Parlour Game windows, dinner to
the reveal, the study light game and its station (`docs/study-light-game.md`),
the relay drawing and the room screens for Acts 6 and 7
(`docs/relay-drawing-game.md`), the cue relay (`docs/cues-relay.md`), the
emulator, the eight fake players and the day-of runbook (`docs/on-the-night.md`),
and (18 October) the screens for every beat that says look at the screen:
the news flash, the Act 3 bulletin, Sir Irwin at cake, the board of strikes
and the door on the TV, the iPad as a captions screen, and a sound for every
cue (`docs/room-screens.md`).

## Cats tab: where you stand (built 16 Oct 2026)

Decided by Jon, 13 Oct 2026; built 16 Oct. Replaces the one-line status
sentence per cat (the workshop's status lines still show under each slider as
flavour). The five words come from the workshop: Words on the phones, the
phone's own little lines, the STOPS line (five words, low to high, with
commas). `?preview=cats` shows the tab with one cat at every stop.

**What the guest sees (changed by Jon, 16 Oct).** Five rows in a column, in
this order: Sir Irwin, Granolia, Miss Boo, Zimothy, Salem. Each row is the
cat's face (a cut-out, no circle) with the gauge beside it. Tap a row and it
opens: what that level means for you, who the cat is, and the house's own
line about where you stand. Nothing else shows until tapped.

- Left: the cat's face (`play/public/household/faces/`), with the name under or
  beside it.
- Right: a slider track with **5 stops**. A marker sits on the stop that matches
  the guest's affection with that cat (1 to 5). It is a picture, not a control:
  the guest cannot drag it.
- Under the track, the word for the current stop. Never a number, anywhere.
- Sir Irwin's marker always sits on the top stop, with a small lock icon and
  the word "Locked" beside his name: his never moves.

**The five stops** (low to high, left to right; working names, Jon may rename):

| Affection | Stop label |
|---|---|
| 1 | Cold shoulder |
| 2 | Wary |
| 3 | Undecided |
| 4 | Fond |
| 5 | Devoted |

**Movement.** Affection moves only through the Parlour Games (the push and
pull questions, renamed by Jon on 13 Oct) in Acts 2, 4 and 6 (decided 12 Oct). When a window closes and a guest's affection
has changed, the marker slides to its new stop the next time the Cats tab is
shown. A short, slow slide; no sound, no "+1", nothing that reads as a score.

**Settled 16 Oct.** The Murderer's and the Ghost's markers move exactly like
everyone else's; their points also move the clarity dial, which has no slider
on any phone and is revealed in the Act 7 graph.

**Rules that still apply.**
- Murderer and Ghost phones show the same sliders, built from the same data
  shape, so the tab looks identical for every role.
- The data is `sessions/{uid}.affection` (already there). The labels are safe
  content: if they change, change them in the workshop, not in code.
- Big touch-free visuals for dim light: track at least 8 px tall, marker at
  least 28 px, labels at reading size.
- The optional status lines (`status_lines` in the workshop) can still show
  under each slider as a line of flavour.

The rules deck (slide "How the cats feel about you") already shows this design.

---

## The bags, the paper and the freeze (built 18 October 2026)

- **The bags clue is true.** The bags station card says "something minty is in
  two of the bags" from the real packing, and the property it picks sits in
  the murderer's or the victim's bag. It never says a bag number. Before the
  bags are packed, or in a rehearsal, it draws a property from the bag items
  list at random and wears the Rehearsal chip, as before.
- **The document looks like paper.** A solved safe pays out its document on
  one of the seven stationery designs, with a font to match (typewriter for a
  telegram, handwriting for a letter). The designs are blank stand-ins in
  `play/public/stationery/`, one file per design, so your art drops in later
  file for file. A design the phone does not know prints on the plain block.
  See them on a phone at `/play/?preview=document` and tap the name in the
  corner to cycle; `?template=playbill` starts on one.
- **The freeze.** On the workshop's Game night page, Freeze the workshop the
  week of the party. The phones keep the words exactly as they are; nothing
  typed in a list after that can change a phone mid-night. The host's Resend
  button and every join still work; they simply find nothing new to copy.
- **The room screens read the workshop too.** Granolia's lines on the study
  screen, the five station cards, the news frames and the closing story are
  copied to the phones' content with everything else, and the Check page
  (`?check=1`) lists them.

## For Claude Code (technical)

Layout: `play/` is the phone client (React + Vite, base `/play/`, one page,
no router). `functions/` holds the Cloud Functions (Node 22, ESM,
firebase-functions v2). `functions/lib/night.js` is the night logic, pure over
a Firestore `db`, shared by the callables and `functions/host.mjs`.
`functions/test/` proves it against an in-memory fake (`npm test` at the root
runs every suite: functions, cues, station, app, play, scripts). The emulators
(`npm run emulate`, `firebase.json`), the fake players (`npm run fake-night`,
`scripts/fake-players.mjs`) and the rules tests (`npm run test:rules`) are
described in `docs/on-the-night.md` under its technical heading.

Deploy (Jon runs this; it was denied to Claude Code as a production deploy):

```bash
npm run deploy
```

That builds the workshop and the phone client into `hosting/`, then deploys
hosting, Firestore rules and functions. `npm run deploy:site` is hosting only.
First functions deploy enables Cloud Build / Artifact Registry on the project
and takes a few minutes. Dev servers: `npm --prefix play run dev` on 5174
(`.claude/launch.json` → `play`); the workshop stays on 5173.

Preview without a night: `http://localhost:5174/play/?preview=join|rest|lobby|prompt|prompt-late|you|offline|paused|paused-window|cats-act4|blackout|doors`.

Firestore (all authed-read unless stated; Functions write):
- `public_state/active` `{ nightId }` — which night is live.
- `nights/{nightId}` `{ nightId, label, joinOpen, act, phase, phaseAt, actStartedAt, pausedFrom, hosts{jonathan|susan: {name, key}}, roster{nameKey: {name, characterId, bag, joinedAt}} }`.
  Phases: `lobby | act | blackout | prompt | paused`.
- `nights/{nightId}/public/content` — copy of the safe areas in `PLAYER_AREAS`
  plus `motives` and `characters` (id, name, profession, gender, bio — never trace).
- `nights/{nightId}/private/deck` — `{ order[], bags[], uids{} }`. No client reads.
- `sessions/{uid}` — owner read only: `{ nightId, guestKey, guestName, characterId, bag, affection{}, host, status }`.
  Role cards and everything dealt go here later.
- `presence/{uid}` — owner write `{ nightId, guestKey, at }`; admin read. Doubles
  as the server-clock probe: the phone reads back the stamped `at` and keeps the skew.
- `notes/{uid}`, owner read/write, kept per night since 17 Oct: `{ byNight: { [nightId]: { seen{}, crossed{}, buzzed{} } } }`. A phone that rehearsed starts the real night with nothing hidden and nothing crossed off. Anything written flat at the top level (the old shape) is ignored.

Callables (region us-central1): `join({ nightId, name })` for any signed-in
phone; `hostCommand({ nightId, command, arg })` when `canHost` says yes: the
admin UID, or a phone whose active session has `host` set for that night. With
no night live, `create` is open to any signed-in phone (the bootstrap).
Host phones may also read `presence/*` (rules `isHost()` does a `get` on the
caller's session).
Commands: `create`, `activate`, `publish`, `refresh-hosts`, `join-open`,
`join-close`, `act` (1–7), `blackout`, `power`, `pause`, `resume`, `handover`,
plus the run.js ones below and the dry-run trio `dry-run`, `settle-now`,
`discard-night`. The one list is `HOST_COMMANDS` in `functions/lib/commands.js`;
`node functions/host.mjs --help` prints it and a test keeps it in step with
the switch statements.

Safety nets (17 Oct): `pause` stores `pausedAt`; `resume` moves every deadline on by
the length of the pause in one batch (the window's `opensAt` and `closesAt`, the
relay's four `*EndsAt`, the study's `slotEndsAt`, the finale's `at`; the list is
`PAUSE_SHIFTED` in `functions/lib/night.js`). Nothing settles and the relay does
not advance while paused. A paused phone keeps an open window on screen, greyed,
with its clock standing still. `handover` (arg: a roster key or a uid) moves a
phone's cards, windows and affection into the private deck (`handed[guestKey]`,
unreadable by any phone), drops the deck's pointer from that guest to the phone,
wipes the phone's notes for the night, marks the session `handed` and bumps
`generation`; the phone sees the newer generation, clears its local cache and
reloads to the doors. The next person types their own name on it and gets a
fresh session; the previous owner taps their name on any other phone and gets
everything back from the parked copy, without touching the new owner. A guest
who joins after the power has returned is written into the case as a detective
and dealt the same role card as everyone else; a guest who rejoins on a new
phone brings their cards with them. The role card is kept all
night and re-read from the You tab behind a tap. The prompt renders near-black
and buzzes once per card. The offline strip shows when the phone is off the
network OR the night doc has painted from cache for twenty seconds, and says how
long ago the house was last heard from. `?check=1` opens for host phones and the
admin only.

Hosts come from `meta/game` (`host_jonathan`, `host_susan`, written by the
workshop's Game night form; defaults Jon / Susan) and are copied onto the night
as `hosts`. Roster keys are `nameKey(name)`: `[a-z0-9_]`, safe in dotted paths.

Seal: nothing in `play/`, `functions/` or the rules touches `sealed/*` or
`cases/*`; those two rules blocks are byte-identical to before. When the case
generator lands it writes `cases/{nightId}` and per-player payloads into
`sessions/{uid}`; the phone keeps reading only its own session.

### The night, beat by beat (13 Oct)

`seed/night.json` holds the acts, their beats and the windows; `functions/`
copies it in `npm run seed` and `play/src/lib/night.js` imports it. Each beat
has an `action` the server runs on entry: `notice:<key>`, `deal:encounter`,
`deal:puzzle`, `window:questions|eliminate|ballot`, `groups`, `rotate`,
`relay:start`, `reveal`, `results`.

- `functions/lib/run.js` composes the host commands: `next`, `back`,
  `beat <key>`, `act <n>` (jumping to 2 deals roles), `power` (deals roles,
  enters the first beat of Act 2), `light-up` (a questions window any time in
  Acts 2, 4, 6), `settle` (random picks for the rest, only after `closesAt`),
  `relay-*`. Everything else falls through to `night.js`. Player callables:
  `answer`, `solve`, `ballot`, `eliminate` (plus the relay pair).
- `functions/lib/deal.js` is the dealer. Cards go into `sessions/{uid}.cards[]`
  once each, by id, so a repeated Next never doubles a card. Kinds: `role`,
  `notice`, `go`, `testimony` (`lines[]`, `outcome` full|partial|deflect),
  `puzzle` (the safe; its answers sit in `nights/{id}/private/puzzles`),
  `document`, `group`, `station` (with `testimony`, `property` or `sequence`),
  `clue`, `result`. Testimony = opener + kernel + closer; the kernel comes
  from `cases/{nightId}.kernels` once the generator writes it, else a bracketed
  rehearsal line; `fillPools` fills `[ROOM]` etc. from the workshop pools and
  swaps exactly one for Granolia.
- Windows: `nights/{id}.window = { id, kind, opensAt, closesAt, settled }`
  (Dates on the server clock). Each phone's set is in
  `sessions/{uid}.windows[id]` WITHOUT point values; the values and the cat
  are in `nights/{id}/private/windows`. Which set: every detective gets the
  same set for that window, drawn among the sets that read about as long as
  the hidden roles' sets; the Murderer and the Ghost get the set their case
  names in `cases/{id}.hiddenSets[role][act2|act4a|act4b|act6]`
  (`functions/lib/windows.js` pickSets). A scheduled `tick` (index.js, every
  minute) settles a window five seconds after `closesAt`; an answer after
  that returns `{ ok, late: true }` and the phone shows the same Thanks.
  Points: every phone's total nudges
  that cat's affection one step (sign only), whatever the role; a hidden
  role's total ALSO moves `cases/{id}.dial` by that night's `dialMap`
  (ghost +1, murderer -1) in one transaction (`pushDial`), logged to
  `dialLog`; after `note-exposure <role>` that role's pushes log delta 0
  and `hushed: true` (Jon, 16 Oct: no slider for the dial, revealed at the
  end). No phone ever sees a number. The three role cards go through
  `parityCheck` before they are dealt: a card more than 20 percent shorter
  than the longest is padded with the workshop's `FILLER:` line (ui_copy),
  and the dealer logs a count.
- Groups and Act 4 come from `station.js` (`makeRotation`, `public/rotation`),
  with the case's murderer and ghost passed as `apart`. A group at study
  position p is at station `(r - p) mod 5` at rotation r, so the study is the
  clock. In rehearsal the study's pay-out card lands with the station card.
- The case (17 Oct 2026): `cases/{nightId}` is built once, at the blackout,
  by `deal.buildCaseForNight`; its full shape is CASE_SHAPE in
  `functions/lib/case.js`. Every night rehearses unless
  `nights/{id}.forceRehearsal` is false (the workshop's "This is the party
  night" checkbox), in which case one sealed motive set is drawn and checked;
  a failure falls back to rehearsal with `nights/{id}.caseWarning`. The
  rehearsal case has the same keys with bracketed stand-ins, and
  `card.placeholder` follows `cases.rehearsal`. A case with roles is never
  replaced. Nothing in `cases/*` is ever returned. Details:
  `docs/blind-content-protocol.md`, Runtime.
- Seal check in `functions/test/run.test.mjs`: after a whole night, no
  session carries a role field, no window on a phone carries values, and the
  night doc and public content carry no roles and no dial.
- Previews: `?preview=` doors | join | welcome | lobby | act1 | prompt |
  orient | news | go | testimony | deflect | puzzle | document | questions |
  checkin | dinner | groups | study | cat | bags | puzzle4 | checkin4 | roam |
  irwin | door | eliminate | ballot | reveal | result | clues | host |
  relay-* | tour. A second dev server config, `play-5175`, exists for when
  another session already holds 5174.
