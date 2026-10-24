# The major build, 17 to 19 October 2026

**This page records the 17 to 19 October build.** It is merged and live
(the latest deploy was 23 October). Later work (the Parlour Games on 21 and
22 October, how the case gets solved, the 22 October handoff, the fixes of
23 October) is in the commit log and in `docs/sessions.md`. **What is left
is on the workshop's Timeline page.**

**24 October:** the 23 October handoff changed several things this page
describes, so read these lines as history: the living room is the Parlour;
Act 4 is four game rooms in ten-minute rounds (the study no longer moves
the house on, and the stations and the bags station are gone); every cat
gives a bag clue; the bedroom screen is Susan's MacBook Pro and the older
iPad is the memory match; and there is no freeze date (the second full tech
run by Wednesday 11 November, checks and fixes only after it).

Written 17 to 19 October from a full map of the game against the Canon (six
readers, three planners, three judges, one plan). A status line for each
piece was added on 23 October. Anything marked "new 23 Oct" is built but
reaches the phones only after your next `npm run deploy`. Everything here is
safe for you to read.

## Where things live now (since 23 October)

- **Decisions:** the Canon page (a Claude Doc).
- **Jobs:** the workshop's Timeline page. One card per job, with an owner
  (Jon, Susan, Jon and Susan, Jenna, Claude Code, Claude chat), the moment of
  the night it belongs to, and sometimes a "by" date. Open questions are
  decision cards on the same board.
- **The live status:** the workshop's "Where we are" page: what is left by
  owner, your next three jobs, the open decisions, links.
- **Start Here** (a Claude Doc): the map for any Claude chat. Where everything
  lives, the routine, and a dated status snapshot Claude Code refreshes at
  the end of each session.
- **Handoffs:** a Claude chat that decides or writes something ends with a
  dated Claude Doc, copied into the repo as `docs/handoff-YYYY-MM-DD.md`.
  Claude Code applies it and writes "Applied <date>" at the top of both.
- **`docs/sessions.md`:** one entry per working session, newest first.
- **The night itself:** `docs/on-the-night.md`.

## The ten pieces, and where each stands on 23 October

Built in two waves by separate builders, each in its own copy of the repo,
each with tests. I merged them and checked them before anything went live.

**Wave one, no dependencies.**

1. **The case bridge (A).** The night stops running on rehearsal stand-ins.
   At the blackout the server picks the real murderer, ghost and motive and
   pulls the secret kernels, documents and study clue from the sealed store,
   blind. Nights rehearse by default; on the party day you tick one box on
   the Night page to make it real. The cat's three numbers for the safe
   ride inside the real testimony; a brush-off still leaves a scrap of paper.

   *23 October: built and live, then changed the same day.* You retired the
   cats' secret lines (*secretLines*) and took the Act 2 safe out
   (*act2Safe*). Now the case pulls nothing from a sealed set: the deal picks
   the murderer, the ghost and the motive itself, and the cats say only their
   open hint lines. No safe, no numbers, no scrap of paper, no document. A
   party night reads only the cats' leans, the packing and the drawing
   pictures ("The secrets, in this order", in `docs/on-the-night.md`).

2. **Phone safety nets (B).** A phone that rehearsed starts clean on the real
   night. The role card can be read again all night. The power-returns card
   buzzes and is near-black. A late arrival gets a role card and the tour.
   Pause freezes every clock. A handed-over phone carries nothing stale.

   *23 October: built and live.* New 23 Oct: a big red REHEARSAL band on
   every phone and room screen on a rehearsal night. Whether "Hand this
   phone on" is one tap or asks twice is the open question *handOn*.

3. **Study and relay fixes (E).** The study hands off cleanly to the next
   group, finishing the study lights the Parlour Game and rotates the house
   by itself, a dead station falls back to twelve-minute slots, the drawing
   cannot be started twice, and the Host tab shows the station, the kiosks
   and the lights as dots.

   *23 October: built and live.* (Changed 21 Oct: the study rotates the
   house; the Parlour Games come at their own times.) The drawing was rebuilt
   on 22 October to the handoff: Sir Irwin's rules slides (new 23 Oct: each
   up long enough to read, and the "Pawsome!" door slide on the TV), a
   practice smiley, three rounds from the sealed picture bank, a random
   player called by portrait and character name, the room's guess on the
   living room screen, and the bedroom iPad showing the trace.
   "Clear the drawing" is still one tap with no question, and it wipes the
   trace; a guard on it is not built yet. New 23 Oct: the Host tab has a dot
   for the memory match iPad and an Act 2 line, "Cat visits: N of M guests
   have seen all four".

4. **Test harness and operations (F).** An emulator for rehearsing without
   touching the live game, eight fake players that walk a whole night and
   delete it afterwards, one `npm test` for everything, safer deploys, a
   day-of runbook.

   *23 October: built.* `npm test` and the fake night need no services. The
   emulator needs Java, which is not on this Mac yet, so the security rules
   test has not run here. The runbook is `docs/on-the-night.md`, updated
   23 October. Replaying a night by its seed is not built (a card on the
   board).

5. **Bags, stationery and workshop gaps (G).** A blind packer decides which
   items go in which bag; the bags station reads it. Seven paper stand-ins
   for the documents. The workshop reaches every list the game reads, and a
   Freeze button locks it on 7 November (no fixed date since 24 Oct).

   *23 October: built and live,* the Freeze button included (press it on
   7 November). Whether the bags stay an Act 4 station is the open question
   *bagsAct4*. Later on 23 October the Act 2 safe was taken out, so the seven
   paper stand-ins and the workshop's Stationery page were deleted: nothing
   shows a document now.

**Wave two, built on wave one.**

6. **Windows and the dial (C).** A server clock settles every Parlour Game
   on time even if no host presses anything; the hidden roles' sets and the
   dial mapping are sealed per night; every push is counted exactly once.

   *23 October: built and live.* (Replaced 21 Oct: every phone gets the same
   set.) Twelve Parlour Games a night at their own times
   (`docs/parlour-games.md`). Which way each cat leans is a sealed table,
   made blind by the leans script. The dial mapping is fixed as built (the
   Ghost toward clear, the Murderer toward foggy); a blind per-night mapping
   is the open question *dialMapping*.

7. **Room screens and the echo (D).** A screen for every beat that says
   "look at the screen": the news flash with the sealed fragment in your
   frame, the Act 3 bulletin as text, Sir Irwin at cake, the elimination
   board, the trace on the TV, and a sound for every cue.

   *23 October: built and live.* (Replaced 22 Oct: W-O-O-F News; bulletin 2
   is a recorded voice on the Orangerie HomePod, armed from your phone, with
   the words on the iPad.) Bulletin 1 is the Act 2 news flash and crosses off
   one motive family for everyone. New 23 Oct: Sir Irwin's Act 5 screen
   shows only his opener, the countdown line, the motive cards and his
   closer; the recordings reach the brain under codes, and its window prints
   only counts. Still open: *newsVideo* (bulletin 1 and the closing bulletin as video on
   the TV, or as sound with captions as built). Not built: video playback
   (only if you choose video) and the motive card pictures slot. The old
   sealed news fragment, study clue and Irwin lines are gone: since later on
   23 October nothing makes them (you retired the secret lines).

8. **Jenna's page (H).** The Steward reads and edits the secrets; your
   account is refused by code; regenerating never wipes their edits.

   *23 October: built and live.* They also edit the cats' leans and see the
   packing list. Later on 23 October the secrets tab was removed with the
   secret lines: the page now has two tabs, the packing list and the cats'
   leans. Not on their page: the Relay Drawing pictures. Whether they should
   see and swap them is the open question *stewardPictures*.

9. **The finale (I).** The reveal is staged so nothing is readable early,
   the stats reel and the dial graph appear only after the ballot, and you
   can award achievements by tapping.

   *23 October: built and live, extended on 22 October:* the closing W-O-O-F
   News bulletin with each name (new 23 Oct: a card shows only after its
   lead-in line has played, and the next press cuts off the recording), the
   dial's journey, the end credits (awards from final sliders, Fetch
   Champion, joke counters, the room's split, thanks, Sydney) and Sir Irwin's
   last card. New 23 Oct: the early reel shows only the achievements you
   gave; the end-credit awards show only in the credits. Later on 23 October
   "Fastest safe" left the stats reel with the safe; it now shows Fastest
   light puzzle, Time on the drawing, Pictures that took more than one guess,
   and Quickest on the Parlour Games. Not built: the
   Partner in Crime and Ghost Whisperer awards (the open question
   *partnerAwards*).

10. **Spill the Beans and the Hush (J).** Your two safeguard buttons. Spill
    the Beans greys out after Act 5; the Hush works all night.

    *23 October: built and live.* In practice Spill the Beans can only change
    the story at the very start of Act 2, before the news: any clue that
    reaches a phone stops it.

## Built since this page (21 to 23 October)

- **The Parlour Games** (21 and 22 Oct): twelve a night, one set for every
  phone, a secretly listening cat for each Detective, Boo opening each one.
- **How the case gets solved** (22 Oct): five motive families, the Act 2 cat
  visits (every guest sees all four cats; one gives a real hint), the study
  paying the Ghost's trace, the memory match, Sir Irwin's countdown.
- **The 22 October handoff:** W-O-O-F News, the Cat Hint Lines, the hosts'
  lines, Salem starting at 3 and the Salem petted button, Fetch Champion and
  Sir Irwin's two seats, the Relay Drawing, the end credits.
- **The workshop:** the Timeline page, the "Where we are" page, the Devices
  page.
- **23 October** (built; live after your next deploy): the Act 4 phone
  cards (your group, the Study, the cat's room, and Free time in place of
  Check-in), Granolia's lines reading
  cleanly, a True Friend's Salem text, file-folder backs on the memory match,
  the preview samples, and the room screens' REHEARSAL band.
- **Later on 23 October** (built; live after your next deploy): you retired
  the cats' secret lines and took the Act 2 safe out. The cats say only their
  hint lines; Act 2 is the news, the four cat visits and check-in; Jenna's
  page has two tabs; the secrets generator and its checker are deleted. The
  next deploy asks whether to delete the function solve (the old safe): type
  y.

## What needs your hands

Your jobs are on the workshop's Timeline page, under Do now. The open
questions are decision cards on the same board.

The list that was here on 19 October is done or has moved. The game is
live (deployed again on 23 October). Making the secrets is now "The
secrets, in this order" in `docs/on-the-night.md`. The rehearsal, the party box, the dry runs, the
hardware evening and the sounds are cards on the Timeline.

## The open questions, by name

Only you answer these. Each is a decision card on the Timeline. Fifteen
are open on 23 October. Answered that day: *secretLines* (retire them: the
cats say only their open hint lines) and *act2Safe* (take the Act 2 safe
out).

- *newsVideo:* bulletin 1 and the closing bulletin as video on the living
  room TV, or as sound with captions (as built)?
- *stewardPictures:* should Jenna see and swap the Relay Drawing pictures on
  their page?
- *partnerAwards:* cut the Partner in Crime and Ghost Whisperer awards, or
  build them?
- *diningName:* call the real dining room "the Library" everywhere, or keep
  "the dining hall" in the cats' room list?
- *rulesDeckScreen:* in Act 1, which screen shows the rules deck and the
  join code?
- *tidyFolders:* remove the merged solving-the-case side copy and move the
  25 September handoff bundle out of the repo (nothing deleted)?
- *bagsAct4:* do the bags stay an Act 4 station?
- *handOn:* "Hand this phone on": one tap, or ask twice?
- *tutorial8:* does motive 8's worked example become the rulebook tutorial?
- *swapMotive:* keep all 19 motives, or swap one?
- *grossnola:* make the "Grossnola" nickname canon for Granolia?
- *ballotMajority:* the rules say "majority decides", but each phone scores
  itself. Should the TV also show the room's majority pick?
- *bulletin2Voice:* who reads the 25 lines of bulletin 2?
- *bulletin2Known:* if you record bulletin 2, you will know which family the
  line points at. Accept that, or have someone else record it?
- *dialMapping:* the rules say each night decides blind how the Murderer's
  and the Ghost's answers move the dial; as built it is fixed. Keep it fixed,
  or build the blind mapping?

The three questions this page asked on 19 October:

- The iPad as the captions screen through dinner, or the spare phone only?
  *Settled 22 October by the handoff:* captions in the orangery at supper,
  then the memory match in the Library, then the bedroom screen after
  dessert. The older family iPad is the spare phone.
- The nine sounds: recorded before the freeze, or stand-in tones? *Moved:*
  the Timeline card for the stand-in sounds covers it; any you record
  replace the stand-ins.
- Hand this phone on: one tap, or ask twice? *Moved:* the decision card
  *handOn*.

## Decisions I took unless you said otherwise

- The Act 3 bulletin is text on the TV and the iPad with a sounder, not a
  spoken voice. The Canon says audio is atmosphere, never information.
  **Replaced 22 Oct:** W-O-O-F News; bulletin 2 is a recorded voice on the
  Orangerie HomePod, armed from your phone, and its words always show on
  the iPad too.
- When the study finishes, the Parlour Game fires and the house rotates on
  its own. Next on the Host tab is the backup.
  **Changed 21 Oct:** the study rotates the house; the Parlour Games come at
  their own times.
- The murderer clue at the bags station is a property from the murderer's
  real bag (if the bags station stays: *bagsAct4*). **Superseded 24 Oct:**
  the bags stay, the station is gone, and every cat gives a bag clue.
- Rehearsals use the emulator, or the live game with the party box unticked,
  rather than a second Firebase project.
- Every Detective draws their own Parlour Game set, so no two phones are
  expected to match and the two hidden roles never stand out (the review
  caught this; the first build gave every Detective one shared set).
  **Replaced 21 Oct** (`docs/parlour-games.md`): every phone, all three
  roles, now gets the same set at the same moment, so nobody can stand out;
  twelve a night pop up at random times.
- Spill the Beans works until the first clue has been shown to the room.
- The deck hands out only the bag numbers the packer packed.
- Jenna's page shows each set's riddle at the top, as the rules allow.
  (Gone 23 October, with the secrets tab.)

Two more, taken on 23 October (say if you want them changed):

- The Act 4 cat station never sends a group to Granolia, because her room,
  the Study, holds the light puzzle.
- The deduction round comes after the door opens.

## Not in this build

Closed 22 October: there are no hidden events for the Murderer or the Ghost
in any act; the Parlour Games are the only events. Still not built: the
validator assuming the worst dial (the ten-thousand-run solvability proof),
more puzzles beyond the study light game and the memory match, a recap
button, idle art. They are listed on the workshop's "Where we are" page as after the
party.
