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
Reticule (since then also *Now* and *Clues*, where every cat's hint and bag
clue is saved) — four tabs:
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

Since 22 October:
- *Next* on *Arm the bulletin* (Act 3) arms W-O-O-F News bulletin 2, and
  your phone says only Armed.
- *Salem petted*: tap the guest the real Salem let pet him.
- *Fetch Champion*: tap the first guest the real Sir Irwin brings a toy to.
  It shows in the end credits.
- On the workshop's Game night page, *Sir Irwin's Favorite* and *Sir Irwin's
  Least Favorite* name the two guests for his end-credit awards (Jessa and
  Jake unless you change them).
- Each cat hosts its game with a line in its own voice: Boo the Parlour
  Games, Granolia the study, Zimothy the memory match, Salem the ballot,
  Sir Irwin the drawing and the trace.
- The house panel has a dot for every room screen, the memory match iPad
  included, and in Act 2 a line "Cat visits: N of M guests have seen all
  four".

**A dead phone.** The guest taps their name on any other phone. The character,
bag and cat standings move with them. The old phone says the character has
moved to another phone. If it was a host's phone, the Host tab moves too.

**No signal.** A red strip says the Manor cannot hear the phone and that nothing
is lost. The phone keeps showing what it last saw and catches up on its own.

## The whole night on the phone (built 13 October 2026)

Every screen a guest will see between the door and the reveal now exists on
the phone, with stand-in text wherever the real words are not written yet.
Stand-in text is always in brackets and marked "Rehearsal text", so nothing
on a phone can be mistaken for content. The real lines and your workshop
lines drop in later without changing a single screen.

**Getting started.** The first time a phone has a character it walks the
guest through four pages: who they are, their bag number, the household, and
the Reticule. "Show me around again" on the You tab brings it back.

**The Reticule** is now six tabs: *Now* (what to do at this moment), *You*,
*Clues* (everything a cat said, every clue a room paid out, newest
first), *Motives*, *Cats* and *Rules*. When something new lands, the
phone opens Now by itself and a red dot sits on the tab until it is dealt
with.

**One button runs the night.** The night is a list of beats, act by act,
written down in one place (`seed/night.json`, structure only). On the Host
tab, *Run the night* shows the beat you are on, what it is for, and one big
button: *Next*. Pressing it does whatever that beat needs on every phone at
once: a notice, the four cats to visit, the Act 4 groups, a rotation, the
drawing, the ballot, the reveal. The Parlour Games are not
beats: they pop up on their own at times rolled for the night. The button
never shows you content, only "sent to 9 phones". *Back one* steps back
without dealing anything. The act numbers and Blackout / Power returns are
still there for jumping about in a rehearsal.

**What the phone shows, act by act.**
- *Act 1.* Three notices: meet the household, say your name and profession
  out loud, settle in. Then Blackout.
- *Power returns.* Every phone shows its role card, held fifteen seconds, the
  same shape on every phone. Then "Where things are".
- *Act 2.* Eyes up for W-O-O-F News on the TV. Then the phone sends you to
  all four cats in turn (Granolia in the Study, Salem in the Orangerie,
  Zimothy in the Library, Boo in the Entryway); scan the code in the room.
  One cat, picked for you, gives a real hint: one line from the Cat Hint
  Lines, nothing else. The others say hello. (There is no safe since
  23 October.) Five Parlour Games pop up, hosted by Boo. Then check-in and
  the chime for supper.
- *Act 3.* Phones down. Near the end of supper you arm bulletin 2; it plays
  3 to 5 minutes later and every phone gets a notice. Then the groups, for
  example "You're teamed up with Dorothy Rye and Jasper Steeps. From now on,
  only share with your group."
- *Act 4.* Five stations, one card each, and five Parlour Games in between:
  - the study and its trace: "Granolia's expecting your group in the Study,
    upstairs." Its clue lands on every phone in the group;
  - a cat for the group: "<Cat> will see your group in <room>. Go
    together." Never Granolia, because her room, the Study, holds the light
    puzzle;
  - the bags ("something minty is in two or three bags");
  - Zimothy's memory match on the iPad in the Library;
  - free time: "Nothing for your group right now. Grab a drink, stretch your
    legs." with one of five tips.
- *Act 5.* Cake, then the chime and Sir Irwin's countdown on the TV.
- *Act 6.* Two Parlour Games, then the Relay Drawing (your phone buzzes when
  you are called to the paper), the door, then the deduction round: every
  phone picks one thing it is not, a person or a motive, and the room's picks
  are listed on every Now tab.
- *Act 7.* Salem opens the ballot: who, why, who died; two minutes on the
  server's clock; a phone that does not pick gets a random pick. "Eyes on the
  screen" for the reveal with the closing bulletin. Then each phone's own
  result: three ticks or crosses and what it said. Then the end credits on
  the TV.

**Windows.** The Parlour Games, the deduction round and the ballot are windows: every
phone at once, a bar counting down against the server's clock, and they never
close early. When the time is up the phone goes back to rest and the server
picks for anyone who did not, so a no-show is never a pattern. The Next
button waits for the window to run out.

**Rehearsing.** Start a night, join from a few phones (or a few browser tabs
in private windows), and press Next. The first time roles are needed the
server deals a throwaway case for that night only. On a rehearsal night a
big red REHEARSAL band runs across every phone and every room screen. Every
screen can also be looked at without a night at `?preview=<name>`, and
`?preview=tour` walks through them all with arrows at the top. The preview
samples use the real W-O-O-F News and Cat Hint Lines.

**Trying one game at a time (24 Oct 2026).** The workshop's Game test tab
lists every game of Acts 4 and 6 and the Parlour Games with its samples, two
practices that need no night (Get Off My Lawn! and Boo's Catwalk), and a
test night it can jump straight to Act 4 or Act 6. A note from it goes to
Claude Code as a Timeline card. `docs/on-the-night.md`, "Trying the games",
has the steps.

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

## What is not built yet (24 October 2026)

- The blind scripts: the cats' leans (`npm --prefix scripts run leans`), the
  packing list (run once now that your final bag items are in:
  `npm --prefix scripts run pack-bags -- --repack`) and the drawing pictures
  (`npm --prefix scripts run relay-pictures`, or the party uses stand-in
  pictures). Each prints counts only and is a card on the board.
- Art: the motive card pictures (the slot for
  them is not built yet either), the W-O-O-F News graphics, a candle in the
  Medium's portrait, and a photo of Sydney saved as
  `play/public/household/sydney.jpg`.
- The recordings in `media/README.md`, and the bulletin 1 and closing
  bulletin videos in `play/public/video` (the TV plays them once they are there and the box The bulletins are videos on the Game night page is ticked; until then the brain plays the recordings and the TV shows the words).
- Replaying a night from its seed, and Home's count-only rows for whether
  the leans, the packing list and the drawing pictures exist.
  Both are cards on the board.
- The pose photo for the end credits (a nice-to-have card).

Closed on 24 October with the handoff's defaults: no Partner in Crime or
Ghost Whisperer awards (*partnerAwards*: cut), and no Drawing pictures tab
on Jenna's page (*stewardPictures*: no).

Built since 17 October: Jenna's Steward page (17 October), the Freeze button
(18 October), the blind bag packing (18 October), the Cat Hint Lines,
W-O-O-F News and Sir Irwin's countdown lines (22 October), and (24 October)
everything in "Built 24 October" below.

**The safeguards (17 October).** The Host tab has Spill the Beans and the
Hush under "If something goes wrong". Spill the Beans works through Act 5
and only while nothing that pins the story (the news, a cat's hint or bag
clue, any Act 4 room's reward) has reached anyone; the Manor decides silently and the phone says
the same thing either way. The Hush is for a role given away out loud: that
player's Parlour Game answers stop counting, nothing on any phone changes,
and the reveal says one line about it. `docs/on-the-night.md` has the
what-to-do rows.

Built since the first slice: the whole night on the phone (above), the case
bridge and the cats' cards (with the Act 2 safe, taken out on 23 October),
the Parlour Game windows, dinner to
the reveal, the study light game and its station (`docs/study-light-game.md`),
the relay drawing and the room screens for Acts 6 and 7
(`docs/relay-drawing-game.md`), the cue relay (`docs/cues-relay.md`), the
emulator, the eight fake players and the day-of runbook (`docs/on-the-night.md`),
and (18 October) the screens for every beat that says look at the screen:
the news, the Act 3 bulletin, Sir Irwin at cake, the board of strikes and
the door on the TV, the iPad as a captions screen, and a sound for every
cue (`docs/room-screens.md`; the news and the bulletin became W-O-O-F News
on 22 October).

## Built 24 October 2026 (the 23 October handoff)

Where this section and an older one below disagree, this one wins.

- **The permissions screen.** After a guest types their name, one screen
  asks to allow motion (one game asks you to shake your phone), sound, and
  keeping the screen awake. One tap on Allow does all three; a phone that
  says no still plays the whole game. The You tab keeps an Allow again link.
- **The Parlour.** The living room is the Parlour everywhere: on the phones,
  the TV and the Host tab.
- **Act 2: all four cats talk.** After the news, every phone asks for a quiet
  look in your own bag. Then the phones call guests to the four cats one at
  a time. Every cat gives a motive hint and a bag clue about the Murderer, at
  the rung its affection sets when the guest scans in; both go to the Clues
  tab. Not yet, call me later puts a guest back in the queue for two minutes;
  no cat sits idle while someone is waiting. Others wait in the Parlour with
  Sir Irwin's prompts on the TV. The supper chime comes when everyone has
  seen all four, or when you press Supper's ready; a guest with cats still
  unvisited gets their lines as a note.
- **Act 4: four game rooms.** Start Act 4 (on the Host tab in Act 3), a
  two-minute warning, the groups as portraits with Locked in, then
  ten-minute rounds on the server's clock. Each group visits Granolia's
  Lightbulb Moment (the Study), In Duplicate (the memory match in the
  Library, three boards, all fourteen traces), Get Off My Lawn! (Salem's
  red light, green light on the phones in the Orangerie) and Boo's Catwalk
  (on the Entryway wall), and waits in the Parlour between. Each room pays a
  reward and a bag hint about the Ghost. Parlour Games wait on the phone in
  Act 4. The old stations, the cat station and the bags station are gone.
- **The game names**, each with its line under it, on the phones and on each
  room's screen, and Sir Irwin Needs a Hand on the drawing's first slide.
- **The bags.** Your 24 final items in the workshop, fourteen clue words,
  the packer, the bag clues, and Jenna's packing list ("2 Kisses").
- **W-O-O-F News as video** on the Parlour TV for bulletin 1 and the closing
  bulletin, with the words shown for any part with no video.
- **The Host tab:** Supper's ready, Start Act 4, the four light scenes and
  the music's play, pause and next playlist.
- **Rehearsal stand-ins** in square brackets wherever a secret would show.
- **The checks:** `npm run checks`, the Health page, and Jenna's Run the
  checks.

The older sections below are kept as they were written, with a note where
they are out of date.

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

**Movement.** Affection moves through the Parlour Games (the push and pull
questions, renamed by Jon on 13 Oct) in Acts 2, 4 and 6 (decided 12 Oct),
and in one other way: when you tap Salem petted for a guest on the Host tab,
their Salem goes to the top stop (22 October). Nothing else moves it. When a
window closes and a guest's affection has changed, the marker slides to its
new stop the next time the Cats tab is shown. A short, slow slide; no sound, no "+1", nothing that reads as a score.

**Settled 21 Oct (`docs/parlour-games.md`).** Each question has one cat
secretly listening (never Irwin). A Detective's answer warms it by half a stop
or a full stop when it matches the cat's lean, and cools it by the same when
it does not. Affection is kept in half steps; the slider shows the nearest
stop. The Murderer's and the Ghost's markers move for real with the same odds
and sizes, a coin flip in place of their answer; their points also move the
clarity dial, which has no slider on any phone and is revealed in the Act 7
graph (16 Oct). This closes the earlier open question about how far a
marker moves.

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

- **The bags clue is true.** (Out of date: the bags station went on 23 and
  24 October; every cat now gives a bag clue, see "Built 24 October".) The bags station card says "something minty is in
  two of the bags" from the real packing, and the property it picks sits in
  the murderer's or the victim's bag. It never says a bag number. Before the
  bags are packed, or in a rehearsal, it draws a property from the bag items
  list at random and wears the Rehearsal chip, as before.
- **The document looks like paper.** Taken out on 23 October 2026 with the
  Act 2 safe: no phone shows a document now, and the seven stand-in designs
  (`play/public/stationery/`) and `?preview=document` are deleted.
- **The freeze.** On the workshop's Game night page, Freeze the workshop the
  week of the party. The phones keep the words exactly as they are; nothing
  typed in a list after that can change a phone mid-night. The host's Resend
  button and every join still work; they simply find nothing new to copy.
- **The room screens read the workshop too.** Granolia's lines on the study
  screen, the station cards (gone since 24 October) and the closing story are copied to the
  phones' content with everything else, and the Check page (`?check=1`)
  lists them. Granolia's lines read cleanly: no doubled full stops, and
  *heavy breathing* shows in italics.

## How the case gets solved (built 22 October 2026)

What `docs/solving-the-case.md` describes (decided with Jon on 21 October) is
now in the game. None of it shows you an answer. The clue wording is an
open bank you may read: the W-O-O-F News lines (`seed/woof-news.json`), the
Cat Hint Lines (`seed/cat-lines.json`) and Sir Irwin's countdown lines are
written and in the game (22 October). Only which line plays is the case's
secret.

- **Five motive families.** Food, Bathroom, Screens, Out and about, and
  Personal slights, matched to the nineteen motive numbers in
  `seed/families.json`. Players never see a family name; the game uses them
  to narrow the motive across the night.
- **Act 2, Lights Out, runs the rooms** (updated 22 October; the Parlour,
  the bag peek, the queue and Not yet came on 24 October). After the
  news, every phone sends its guest to **all four cats**, one at a time, at
  the top of Now: *In the Parlour* (it said the living room until 24 October), then *Granolia is waiting for
  you in the Study*, then the cat's greeting, then *Time's up. Boo is
  expecting you in the Entryway*, and so on, then *Back to the Parlour*.
  At the chime: *Supper is served in the Orangerie*. Granolia is in the Study, Salem in the Orangerie, Zimothy in
  the Library and Boo in the Entryway. Only one guest is at a cat at a time:
  the phones send guests off in waves and buzz when it is their turn. In the
  room, the guest scans the square code on the wall (or taps *I am with
  Granolia* if their phone cannot scan). A guest who never turns up, or never
  taps done, is moved on after a few minutes and gets the greeting on the
  phone anyway, and the last beat of Act 2 hands everyone still waiting their
  greeting and sends them to supper.
- **The four room codes** are on the workshop's Game night page, under *The
  four cat rooms (Act 2)*. Print them and put each one up in its room.
- **Every cat gives a real hint** (since 24 October; until then only one of
  the four did, and the other three said hello). Each guest has two wrong
  families of their own; the cats' hints name only those, or a motive in
  the family the news crossed off, so at least two families stand for every
  guest after Act 2. W-O-O-F News bulletin 1 crosses off exactly one family for
  everyone. The hint is that cat's line from the Cat Hint Lines at the
  guest's affection with it. Never the real family.
- **Act 4, the study pays the Ghost's trace**, shown at whatever level the
  clarity dial is at when the group finishes, on the same ladder as the
  bedroom door in Act 6. It names the thing, never the person.
- **The trace ladder (Jon, 22 October), for both:** 1 black and white and
  hazy; 2 colour and less hazy; 3 two similar options side by side; 4 just
  the picture; 5 the picture and the name of the trace. At level 3 the
  study's second option is never the Murderer's trace, and the bedroom's is
  never the Ghost's. The one-line description that used to come with level 5
  is no longer shown, so the workshop's *What was left behind* list is
  retired: hidden from the dashboard, with anything already written kept.
- **Act 4, the small puzzle is now the memory match** (since 24 October:
  In Duplicate, three boards of 7, 10 and 14 pairs, all fourteen traces, on
  the older iPad in the Library; the next lines describe the 22 October
  version), on an iPad pointed at
  `/play/?kiosk=memory`: twelve cards, six pairs of traces of people at the
  party, no names, with file-folder backs, shuffled fresh for each group.
  Zimothy hosts it with a line of his own. Clearing the board crosses
  one motive off that group's list (a card on each phone with a *Cross it
  off* button). Never the real motive. A group that runs out of time is
  given its cross-off anyway.
- **Act 5, Sir Irwin's countdown** (updated 22 October), on the Parlour
  screen: five motive cards at dial 1, four at 2, three at 3, two at 4, one
  at 5, with his five lines from the handoff. The real one is always among
  them. The others come from its family first, then from families already
  ruled out. His picture is one of his five moods
  (`play/public/household/full/Irwin 1.png` to `Irwin 5.png`), the same five
  steps as the trace. The screen shows only his opener, the countdown line,
  the motive cards and his closer; the old secret middle line is gone
  (23 October).
- **No hidden events in any act.** The Murderer and the Ghost only answer the
  Parlour Games, like everyone else.
- **Salem** (22 October) starts at the middle for everyone, and the Parlour
  Games never take him past the second-highest stop. When the real Salem
  lets a guest pet him, tap their name under *Salem petted* on the Host tab:
  their Salem goes to the top, their phone gets the True Friend of the
  Groundskeeper card, and three stars sit by Salem on their Cats tab. When
  they open Salem there, they see his honour text. Not for you or Susan.
- **Act 6 opens on its two Parlour Games** (22 October), one after the
  other, then you press Next for the drawing. The deduction round comes
  after the door opens (settled by default; you may change it).
- **The Act 4 cat station never sends a group to Granolia**, because her
  room, the Study, holds the light puzzle (settled by default; you may
  change it).

Still open: which wrong family each guest's hint names is shared round the
room in turn (a stand-in rule).

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

Preview without a night: `http://localhost:5174/play/?preview=<name>` (the full list is under Previews below).

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

Seal: nothing in `play/` or the rules lets a phone read `sealed/*` or
`cases/*`; only the Cloud Functions read them, with the Admin SDK. The case
deal writes `cases/{nightId}` and per-player cards into `sessions/{uid}`; the
phone keeps reading only its own session.

### The night, beat by beat (13 Oct)

`seed/night.json` holds the acts, their beats and the windows; `functions/`
copies it in `npm run seed` and `play/src/lib/night.js` imports it. Each beat
has an `action` the server runs on entry: `notice:<key>`, `deal:encounter`,
`arm:bulletin`, `window:eliminate|ballot`, `groups`, `rotate`,
`relay:start`, `reveal`, `results`. The Parlour Games have no beat (see
Windows below); no beat uses `window:questions` any more, though `light-up`
still opens one.

- `functions/lib/run.js` composes the host commands: `next`, `back`,
  `beat <key>`, `act <n>` (jumping to 2 deals roles), `power` (deals roles,
  enters the first beat of Act 2), `light-up` (a questions window any time in
  Acts 2, 4, 6), `settle` (random picks for the rest, only after `closesAt`),
  `relay-*`. Everything else falls through to `night.js`. Player callables:
  `answer`, `ballot`, `eliminate` (plus the relay pair). `solve`, the Act 2
  safe, was removed on 23 Oct; the next `npm run deploy` asks to delete it.
- `functions/lib/deal.js` is the dealer. Cards go into `sessions/{uid}.cards[]`
  once each, by id, so a repeated Next never doubles a card. Kinds: `role`,
  `notice`, `go`, `testimony`, `group`, `station` (with `testimony`,
  `property` or `sequence`), `clue`, `result`. Since 23 Oct a cat's card is
  `deal.catHintCard`: `{ kind: 'testimony', cat, catName, room, lines: [],
  hint }`, the hint from `cats.js` `hintLine` at the rung the cat's
  affection sets (the Act 2 hint cat for one guest, the Act 4 cat station
  for a group, at the group's average). A greeting from one of the other
  three Act 2 cats is the same kind with `outcome: 'greet'`, one line and no
  hint. Gone: the `puzzle` and `document` kinds, the affection roll and
  brush-offs, opener + kernel + closer, `fillPools`, Salem's flip.
- Windows: `nights/{id}.window = { id, kind, opensAt, closesAt, settled }`
  (Dates on the server clock). The Parlour Games (`docs/parlour-games.md`,
  21 Oct; counts 22 Oct): twelve a night, planned five, five and two in
  Acts 2, 4 and 6 (`parlour.counts`), with no beat of
  their own. The case deal (`functions/lib/parlour.js` planParlour, from a
  seed in the case) picks twelve different sets from the workshop bank, the
  time of each as an offset from the start of its act (`seed/night.json`
  `parlour`: at least 4 minutes apart, none in the first or last 2 minutes
  of a planned 30, 60 and 30 minute act), and for every question the
  listening cat, its size and its lean; all of it in
  `cases/{id}.parlourPlan`, with the lean table (`sealed/parlour_leans`,
  Jenna's, from the Steward page) copied in at the deal for the party only.
  When an act begins the dealer writes its times to
  `nights/{id}/private/parlour` (`windows.startParlour`); the once-a-minute
  `tick` opens a game when it is due (`windows.tickParlour`), never while
  another window is open or the drawing is running, never closer than the
  gap to the last one. The twelve are one budget for the night: a game the
  act ends before is carried into the next act's schedule (`slots` names
  each game's planned act and slot; the times are laid out afresh), and one
  Act 6 cannot fit is not played. Every phone
  gets the same set, `sessions/{uid}.windows[id] = { kind, beats }`, two
  choices a question, no points and no cat; the points are in
  `nights/{id}/private/windows[id].values`. On the phone the game sits on top
  of the screen it was on, which stays mounted underneath, so the guest comes
  back exactly where they were (App.jsx, F19). The host's Light up button
  opens an extra game with a set not used yet that night. The `tick` also
  settles a window five seconds after `closesAt`; an answer after
  that returns `{ ok, late: true }` and the phone shows the same Thanks.
  Points: each question's listening cat warms or cools by its size (a
  Detective by their answer against its lean, a hidden role by a coin), kept
  in half steps between 1 and 5 (`parlour.catMoves`, `applyMoves`); a hidden
  role's total ALSO moves `cases/{id}.dial` by that night's `dialMap`
  (ghost +1, murderer -1) in one transaction (`pushDial`), logged to
  `dialLog`; after `hush <role>` (or its older name `note-exposure`, the
  same path through `ledger.noteExposure`) that role's pushes log delta 0
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
  night" checkbox), in which case the party case is dealt (`buildCase`;
  otherwise `rehearsalCase`). Since 23 Oct both go through one `dealCase`,
  the motive drawn with crypto randomness, and nothing sealed goes in: only a
  party case copies the cats' leans into `parlourPlan`. Keys: `rehearsal`,
  `createdAt`, `roles`, `murderer`, `ghost`, `motive`, `victimCharacterId`,
  `dialSign`, `dialMap`, `dial`, `dialLog`, `parlourPlan`, `screenSalt`,
  `exposure`, `solving`, `dealtClues` (and `spills` after Spill the Beans),
  the same for both. `nights/{id}.caseWarning` is only ever `trace-partner`.
  `card.placeholder` marks a stand-in: the study clue on a rehearsal, the
  bags clue with no packing, a hint with no family. A case with roles is
  never replaced. Nothing in `cases/*` is ever returned. Details:
  `docs/blind-content-protocol.md`, Runtime.
- How the case gets solved (22 Oct 2026, `docs/solving-the-case.md`):
  - `functions/lib/families.js` (pure): `FAMILIES` from `seed/families.json`
    (copied to `functions/seed/` by `npm --prefix functions run seed` and by
    the fake players), `solvingPlan` (dealt with the case: real family,
    `newsOut` families, one wrong family per guest in `hints`; round-robin
    over the wrong families the news did not take), `hintFamilyFor` (late
    joiner), `memoryPick`, `irwinOptions`/`irwinCount`, and the solver
    `remainingMotives`/`roomClues`. `cases/{id}.solving = { family, newsOut,
    hints, hintCats, memory: { groupId: n }, struck: [] }`; `rerollCase`
    makes a fresh plan for the new motive. `struck` starts empty and nothing
    adds to it any more (the struck-motives bulletin is gone). Hint and
    memory pay-outs go in the ledger (`BLOCKING_KINDS`), so Spill the Beans
    is off once either is out.
  - Act 2 rooms (`deal.js`, Lights Out section): `dealEncounter` makes the line
    in `nights/{id}/private/lights` (`planWaves`: guests spread over the four
    cats of `night.json solving.catRooms`) and sends the first wave;
    `meetCat`/`leaveCat` (callables `meetCat`, `leaveCat`; `?meet=<cat>` on the
    phone) move it in one transaction; `tickLights` (in `windows.tick`, Act 2
    only) moves on a no-show after `goMinutes` or a stayer after
    `withMinutes`, and adds late joiners; `flushLights` (run.enterBeat, last
    Act 2 beat or any later act) greets everyone left. Each phone's step is
    `sessions/{uid}.lights = { step: wait|go|with|done, cat, catName, room,
    title, text }` (ui_copy `LIGHTS WAIT|GO|NEXT|WITH|DONE|SUPPER` override
    the text) and is a `CARRIED_FIELD`. The hint cat deals `catHintCard`
    with `hint: { text, placeholder }`: the cat's line from `cats.js`
    (`seed/cat-lines.json`) at the guest's affection, or `HINT_PLACEHOLDER`
    only when the case has no family for the guest (it names no family). The
    other three deal a greeting card with no hint.
  - Study: `station.studyReveal` works out the Ghost's trace once per group
    (`traces.workReveal` with the Murderer's trace excluded, `shownReveal`),
    and `studyClueCard(c, act, beat, reveal)` carries it as `card.trace`. The
    ladder, buckets and context lines moved to `functions/lib/traces.js`
    (`deal.js` re-exports them); `revealTrace` excludes the Ghost's trace.
    Ladder since 22 Oct (`traces.workReveal`/`shownReveal`, `TraceView`): the
    partner is picked at level 3 (none to pick: level 4); the public doc is
    `{ level, images }` at 3, else `{ level, trace, label }` with the label
    only at 5; no context line anywhere (`TRACE_CONTEXT`/`traceContext` are
    kept but unused).
    Since 23 Oct the case carries no `studyClue` (no per-motive text at all).
  - Memory match (`deal.js`): `rotate` writes `nights/{id}/public/memory`
    `{ groupId, boardId, cards[12], cleared }` for the group at the puzzle
    station (`memoryBoard`), and pays the group whose turn just passed
    (`payMemory`, outcome absent). The iPad kiosk (`?kiosk=memory`,
    `MemoryMatch` in Kiosk.jsx) calls `memoryCleared { boardId, pairs }`
    (presence-gated like `relayAdvance`); the server checks the pairs and
    deals `{ kind: 'clue', id: '4-memory-<gid>', cross: n }`. `flushMemory`
    pays every unpaid group from Act 5.
  - Sir Irwin: `screen.irwinMotiveClue` adds `choices: [{ n, rhyme }]` and
    `mood` (the dial band) to the Act 5 screen doc, plus the line from
    `IRWIN_OPTION_LINES` (ui_copy `IRWIN FIVE` to `IRWIN ONE` override),
    between the workshop's Irwin opener and closer (`irwinVoice` in
    `screen.js`: the first line on Irwin's tab of each list, else
    `DEFAULT_IRWIN`); since 23 Oct the case has no Irwin lines. The news screen shows
    `NEWS_FLASH_PLACEHOLDER` only when the case has no family to cross off;
    there is no echo. `FORBIDDEN_SCREEN_KEYS` now also refuses `solving`,
    `family`, `families`, `newsOut`, `hints`.
  - Checks: `functions/test/solving.test.mjs` (G32 to G38, F20, F21, 1,000
    seeded throwaway cases where it says so); `functions/test/lights-walk.mjs`
    walks the rooms for other tests; `scripts/fake-players.mjs` prints the
    Act 2 rooms line (F20, F21) and the motive funnel (G32) as PASS or FAIL.
  - The open wording banks: `functions/lib/cats.js` (the Cat Hint Lines,
    `seed/cat-lines.json`), `functions/lib/news.js` (W-O-O-F News,
    `seed/woof-news.json`; `docs/room-screens.md` has the bulletins) and
    `functions/lib/hosts.js` (the hosts' lines, `HOST_LINES`, with
    `booLine` and `irwinTraceLine`). Irwin's countdown lines are
    `IRWIN_OPTION_LINES` in `screen.js`.
- Seal check in `functions/test/run.test.mjs`: after a whole night, no
  session carries a role field, no window on a phone carries values, and the
  night doc and public content carry no roles and no dial.
- Previews (`play/src/Preview.jsx`; `TOUR` lists the tour in order):
  `?preview=` doors | join | welcome | lobby | act1 | blackout | prompt |
  prompt-late | orient | news | wait | go | testimony | greet | back |
  questions | checkin | dinner | groups | study | cat |
  bags | puzzle4 | memory-clue | checkin4 | award | roam | irwin |
  relay-walk | relay-draw | relay-turn | relay-vote | relay-lockout |
  relay-done | door | eliminate | ballot | reveal | result | clues | cats |
  cats-act4 | cats-friend | rehearsal | you | offline | host | paused |
  paused-window | superseded | tour, plus the room screens (`kiosk-*` and `host-house*`, listed in
  `docs/room-screens.md`). `?preview=questions&set=<base64url>` shows one of
  the workshop's own Parlour Game sets (the Game test tab's See it on a phone;
  words only, never a point or a lean).
- The Game test tab's practices (24 Oct, `play/src/screens/Practice.jsx`, no
  night): `?practice=salem` (Get Off My Lawn! on any phone that joins, with a
  shake meter), `?practice=boo` (Boo's Catwalk on the phones) and
  `?kiosk=boo&practice=1` (the wall). They follow `public_state/game_test_salem`
  and `game_test_boo`, which only the `gameTest` callable writes, and never
  write `presence/{uid}`. `docs/on-the-night.md` has the tab. A second dev server config, `play-5175`, exists
  for when another session already holds 5174.
