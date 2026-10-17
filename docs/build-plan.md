# The major build, 17 October 2026

What is being built between now and the freeze on 7 November, in plain words.
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

Nothing yet. When a wave is merged I will say so, and then:

- Deploy: `npm run deploy`. Nothing goes live until you run it.
- Make the secrets for real: put your Anthropic key and the service-account
  file in `scripts/.env`, run the two scripts I name, read only the PASS line.
- Dry runs with real secrets are for the fake players only. You watch the
  Host tab and the TV. Your phone and Susan's never join that night.
- On the party day, tick "This is the party night" when you create the night.
- One evening before 7 November with the Nanoleaf wall, the Stream Deck and
  the Hue bulb plugged in, to run a hardware check.
- Sound files and the seven stationery pictures, whenever you have them.
  Stand-ins work until then.

## Decisions I am taking unless you say otherwise

- The Act 3 bulletin is text on the TV and the iPad with a sounder, not a
  spoken voice. The Canon says audio is atmosphere, never information.
- When the study finishes, the Parlour Game fires and the house rotates on
  its own. Next on the Host tab is the backup.
- The murderer clue at the bags station is a property from the murderer's
  real bag.
- Rehearsals use the emulator rather than a second Firebase project.

## Not in this build

The full hidden-event system with nested scenarios (the Parlour Games are
the event system now), the ten-thousand-run solvability proof, puzzle
slot-pools beyond the safe and the shape game, a recap button, idle art.
All listed on the workshop's Status page as "after the party".
