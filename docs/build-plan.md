# The major build, 17 to 19 October 2026

**Status, 19 October: all ten pieces are built, reviewed and merged on main.**
Nothing is deployed until you run the deploy command below.

What was built between 17 and 19 October, in plain words.
Written from a full map of the game against the Canon (six readers, three
planners, three judges, one plan). Everything here is safe for you to read.

## The ten pieces

Built in two waves by separate builders, each in its own copy of the repo,
each with tests. I merge them and check them before anything goes live.

**Wave one, no dependencies.**

1. **The case bridge (A).** The night stops running on rehearsal stand-ins.
   At the blackout the server picks the real murderer, ghost and motive and
   pulls the secret kernels, documents and study clue from the sealed store,
   blind. Nights rehearse by default; on the party day you tick one box on
   the Night page to make it real. The cat's three numbers for the safe
   ride inside the real testimony; a brush-off still leaves a scrap of paper.
2. **Phone safety nets (B).** A phone that rehearsed starts clean on the real
   night. The role card can be read again all night. The power-returns card
   buzzes and is near-black. A late arrival gets a role card and the tour.
   Pause freezes every clock. A handed-over phone carries nothing stale.
3. **Study and relay fixes (E).** The study hands off cleanly to the next
   group, finishing the study lights the Parlour Game and rotates the house
   by itself, a dead station falls back to twelve-minute slots, the drawing
   cannot be started twice or cleared by one tap, and the Host tab shows the
   station, the kiosks and the lights as dots.
4. **Test harness and operations (F).** An emulator for rehearsing without
   touching the live game, eight fake players that walk a whole night and
   delete it afterwards, one `npm test` for everything, safer deploys, a
   day-of runbook.
5. **Bags, stationery and workshop gaps (G).** A blind packer decides which
   items go in which bag; the bags station reads it. Seven paper stand-ins
   for the documents. The workshop reaches every list the game reads, and a
   Freeze button locks it on 7 November.

**Wave two, built on wave one.**

6. **Windows and the dial (C).** A server clock settles every Parlour Game
   on time even if no host presses anything; the hidden roles' sets and the
   dial mapping are sealed per night; every push is counted exactly once.
7. **Room screens and the echo (D).** A screen for every beat that says
   "look at the screen": the news flash with the sealed fragment in your
   frame, the Act 3 bulletin as text, Sir Irwin at cake, the elimination
   board, the trace on the TV, and a sound for every cue.
8. **Jenna's page (H).** The Steward reads and edits the secrets; your
   account is refused by code; regenerating never wipes her edits.
9. **The finale (I).** The reveal is staged so nothing is readable early,
   the stats reel and the dial graph appear only after the ballot, and you
   can award achievements by tapping.
10. **Spill the Beans and the Hush (J).** Your two safeguard buttons, greyed
    out after Act 5.

## What needs your hands

In this order:

1. **Deploy.** Run `npm run deploy`. It may ask to turn on the Cloud Scheduler
   service for the once-a-minute clock; say yes. Nothing goes live until you do.
2. **Try a rehearsal.** Start a new night from your phone's Host tab and press
   Next. Open `/play/?check=1` on the Mac to confirm your lines; open
   `/play/?phone=1` for a second guest; `/play/?kiosk=living` on the TV.
3. **Make the secrets for real** (any evening): put your Anthropic key and the
   service-account file in `scripts/.env` (copy `scripts/.env.example`), then
   run `npm --prefix scripts run generate` and `node scripts/pack-bags.mjs`.
   Read only the PASS line of each.
4. **On the party day**, tick "This is the party night" on the workshop's
   Game night page before you start the night.

Then, when you have them:

- Dry runs with real secrets are for the fake players only. You watch the
  Host tab and the TV. Your phone and Susan's never join that night.
- One evening before 7 November with the Nanoleaf wall, the Stream Deck and
  the Hue bulb plugged in, to run a hardware check.
- Sound files and the seven stationery pictures, whenever you have them.
  Stand-ins work until then.

## Three questions, one line each, no hurry

- The iPad: stand it in the orangery as the captions screen through dinner
  (what the design says), or keep it as the spare phone only?
- The nine sounds: will you record them before the freeze, or should the
  stand-in tones play at the party?
- Hand this phone on: one tap on the Host tab, or ask twice?

## Decisions I am taking unless you say otherwise

- The Act 3 bulletin is text on the TV and the iPad with a sounder, not a
  spoken voice. The Canon says audio is atmosphere, never information.
- When the study finishes, the Parlour Game fires and the house rotates on
  its own. Next on the Host tab is the backup.
- The murderer clue at the bags station is a property from the murderer's
  real bag.
- Rehearsals use the emulator rather than a second Firebase project.
- Every Detective draws their own Parlour Game set, so no two phones are
  expected to match and the two hidden roles never stand out (the review
  caught this; the first build gave every Detective one shared set).
- Spill the Beans works until the first clue has been shown to the room.
- The deck hands out only the bag numbers the packer packed.
- Jenna's page shows each set's riddle at the top, as the rules allow.

## Not in this build

The full hidden-event system with nested scenarios (the Parlour Games are
the event system now), the ten-thousand-run solvability proof, puzzle
slot-pools beyond the safe and the shape game, a recap button, idle art.
All listed on the workshop's Status page as "after the party".
