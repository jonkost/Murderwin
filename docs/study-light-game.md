# Granolia's Lightbulb Moment: the study light game (Act 4)

The big puzzle of Act 4. Written 13 October 2026 from everything already decided about it,
with the gaps filled in. Everything here is structure. No answers, no clue text. Safe for you
to read.

**Updated 23 October 2026:** the study pays the Ghost's trace at the dial's level (§5), the end
credits have two study awards (§9), and Granolia's intro on the phone needs new words (§11).

**Updated 24 October 2026** (the 23 October handoff, built that day): the game has a name,
**Granolia's Lightbulb Moment**, with its line *"She knows how to turn on the lights. It's on the
tip of her tongue."* on the phones and the study screen. The cap is **ten minutes** (was fifteen),
the same as every Act 4 room. The study is no longer the clock for the house: Act 4 is four game
rooms in ten-minute rounds on the server's clock, every group visits the Study once, and the
study pays the Ghost's trace plus a bag hint about the Ghost's bag. Where the dated build notes in
§12 say otherwise, this paragraph wins.

**Updated 24 October 2026, evening:** both walls were tried for real that day, and the study can
be tried from your phone on the workshop's Game test tab: flash the walls, teach the taps, and a
practice round with an answer pad (§13). The walls' real counts are in §11. Granolia's hello on
the phone is now a decision card, *granoliaIntro* (§11).

**Where the settled parts come from:** the Canon page (Puzzles, Hardware, The seven acts),
`CLAUDE.md` (Hardware), the act skeletons (`chats/docs/sirwin-manor-act-skeletons.md` §5), the
first puzzle worksheet from 3 September (house rules for all puzzles), the cat info
(`docs/cat-info.md`, Granolia), and the lighting chat from 30 August. Where this doc goes past
those, it says so under "Decisions this doc makes".

---

## 1. What it is, in one breath

A group walks into the study. One wall of white hexagons plays a pattern. They touch it back.
Do that three times and the colour lights on the other wall answer with a colour and a number.
They press that pair on the little button box. Three rounds, three pairs, and the study sends
every phone in the group the trace the victim left behind. Ten minutes, then out, whatever
happened. Granolia hosts and helps.

The Study is one of Act 4's four game rooms. Every group visits it once, in its own ten-minute
round; the round's chime, not the study, moves the house on.

Granolia's only Act 4 job is the study. With the trace she gives the group a bag hint about the
Ghost's bag, at the group's average affection with her.

---

## 2. The room

| Thing | What it is | Job |
|---|---|---|
| The Elements wall | White Nanoleaf hexagons, touch-sensitive | Plays the pattern. Takes the answer. |
| The Lines wall | Coloured Nanoleaf bars in a zigzag, opposite wall | Answers with a colour and a count. |
| The button box | The fifteen-key Stream Deck, on the desk | The only way to enter an answer. No keyboard, no mouse. |
| The study screen | The M1 MacBook Air's own screen | Instructions, Granolia, the three jewels, the clock. |
| Granolia | The study's cat, on the screen, peeking out from behind something | Hints, in character. Encouraging words at the cap. |
| The pointer | A telescoping teacher's pointer | So anyone can poke the high panels. The couch stays. |

The M1 Air drives all of it: Stream Deck over USB, both Nanoleaf walls over wifi, and the screen.
No Raspberry Pi anywhere. The room light stays low; the walls are the light.

---

## 3. How it plays, beat by beat

**Called up.** When it is a group's round in the Study, every phone in the group shows the game's
name, *Granolia's Lightbulb Moment*, and says *Granolia's expecting your group in the Study,
upstairs.* The group scans the Study's code on the wall, and Granolia's intro shows under it, in
her voice.

**At rest.** The hexagons breathe at a dim glow. The Lines drift slowly through colours. The
screen shows the study and Granolia, half hidden. Nothing says "waiting". This is a real state,
and it is what every group sees when they walk in.

**1. Begin.** The screen says: *Touch any panel to begin.* The first touch starts the clock.
That touch also generates this group's patterns and code, fresh, so nothing from the last
group is ever still on the walls. The screen greets the group by their characters' names.

**2. The wall plays a pattern.** Three or more hexagons light in turn. The group watches.

**3. The group touches it back.** Each touched panel pulses to say "got it". Finish the
sequence correctly and the whole wall ripples. Get a panel wrong and the wall dims, breathes,
and plays the same pattern again. Nothing is lost; you only replay that one pattern.

**4. Three patterns make a round.** Each is a little longer and a little faster than the last.

**5. The Lines answer.** Clear the third pattern and the Lines wall resolves to a colour and a
countable number of lit bars, separated by dark ones so they are easy to count. *Pink and four.*
It stays lit until the pair is entered.

**6. Enter it on the button box.** Tap a colour, tap a number, tap Submit. The screen echoes
the pair as you build it. Undo clears whatever half you entered last. Nothing ever submits on
its own.
- Right: the pair locks into the first of three jewels on the screen. The Lines go back to
  drifting, and the hexagons start the next round.
- Wrong: the keys shiver, and Granolia tells you which half was right. *"The colour's right,
  dear. Count the bars again."* The Lines keep showing the answer. Try again.

**7. Three rounds, three jewels.** When the third pair locks in, the study pays out: the screen
says *Something has been sent to your phones*, every phone in the group receives the trace
(§5), the walls do a short celebration, and the group goes back to the Parlour until the chime.
The study goes back to rest for the next group.

**The clock.** Ten minutes from the first touch, hard, on the server's clock. At eight minutes
Granolia mentions the time. At ten the walls stop testing, the screen shows every pair the
group had not yet earned, and the trace is sent anyway. *"Thank you for trying your best. Off
you go."* The round's chime (ten minutes from the start of the round) also pays a group that is
still in there. Nobody leaves the study without the trace.

---

## 4. The numbers

| Round | Pattern lengths (touches) | Pace |
|---|---|---|
| 1 | 3, then 4, then 5 | Slow. Each panel lit about 0.8 s. |
| 2 | 4, then 5, then 6 | Medium. About 0.6 s. |
| 3 | 5, then 6, then 7 | Quick. About 0.45 s. |

- A clean run is about four minutes. Each mistake costs about half a minute. The ten-minute cap
  allows roughly a dozen mistakes, less the walk upstairs.
- Six colours: red, yellow, green, blue, pink, white. Six numbers: one to six. Thirty-six
  possible pairs per round, so the full code is one in 46,656. Guessing is not a strategy.
- Every pattern is random. The same panel can repeat inside a pattern only if there is at least
  one other panel between.
- These are starting values. The Canon's open item stands: time nine patterns plus three entries
  on the real wall. If round 3 is too much for the youngest or oldest player, drop it to
  5, 5, 6. The station reads these from a small settings table, so changing them is not a code
  change.

**Granolia's hints.** Nobody has to ask, and nobody can press anything to ask, so she offers.
She steps in only when a group is stuck, never before, and she never costs anything. Whether a
group needed her never leaves the room: nothing downstairs ever shows it, so every group walks
out looking brilliant.

| When | What she does |
|---|---|
| Second miss on the same pattern | Replays it at half speed. |
| Fourth miss on the same pattern | The screen shows a drawing of the wall with the panels numbered in the order they lit. She reads it out in words. |
| Wrong pair entered | Says which half was right. |
| A second wrong pair | Names the colour in words and shows the count as a number on screen. |
| Eight minutes | Mentions the time, kindly. |
| Ten minutes | Stops the game, gives everything, sends everyone on. |

In the study Granolia is always right. (Her old habit of getting one detail of the night wrong was
retired on 23 October 2026 with the cats' secret lines; her hint lines only ramble or forget.)
A hint that was wrong would be cruel, and a player who catches her being wrong here would
rightly stop trusting her hints.

**The button box, face on.** Five columns of three keys.

| Column 1 | Column 2 | Column 3 | Column 4 | Column 5 |
|---|---|---|---|---|
| Red | Blue | 1 | 4 | (blank) |
| Yellow | Pink | 2 | 5 | Undo |
| Green | White | 3 | 6 | Submit |

Each colour key is lit in its colour with the name written on it. Number keys show the digit
large. The blank key stays blank. Decided 25 September; unchanged here.

---

## 5. What the group wins

**Changed 21 and 22 October.** The trace the victim left behind (the Ghost's own trace), as
clearly as the clarity dial allows at the moment the group finishes or the ten minutes run
out, plus Granolia's bag hint about the Ghost's bag (since 24 October):

| Level | What the group gets |
|---|---|
| 1 | The picture in black and white, hazy. |
| 2 | The picture in colour, less hazy. |
| 3 | Two look-alikes side by side. One is real; the other is never the Murderer's. |
| 4 | The picture, clear. |
| 5 | The picture and its name. |

It is the same five-level ladder as the bedroom door in Act 6 (`docs/relay-drawing-game.md`).
Every phone in the group gets the same card, *From the study: Something was left behind.* A
later group may get a clearer or a hazier one, because the dial moves during Act 4. The
station never knows what was sent: it only tells the server "this group finished", and the
server works out the card. The phones show it in the clue list. If the night has no case yet,
the card carries a bracketed stand-in line instead.

Groups share information only inside the group during Act 4, and the trace arrives on each
member's phone, so a trio that splits up afterwards still all have it.

---

## 6. Rule 1 check

- You can walk into the study on the night and play it. The patterns and the code are made up
  on the spot by the station, differently for every group, and they mean nothing. The trace
  behind them comes from the night's sealed case (who the Ghost is), is worked out by the
  server, and never passes through the station.
- You can build and test the whole room in October. Patterns, colours, counts, the button box,
  Granolia's lines, the clock: all safe content. Testing uses a throwaway night.
- Nothing in the study is ever written down for the next group. Every start is a reset.
- Granolia's hint lines are safe content you write in the workshop. They never mention the
  trace.

---

## 7. Setting up the room on the day

- [ ] Couch stays. Pointer on the desk, within reach of the wall.
- [ ] Room light low. The hexagons' resting glow is enough to see by.
- [ ] M1 Air awake, sleep off, plugged in, on the house wifi. Stream Deck plugged in by USB.
- [ ] Quit the Elgato Stream Deck app on the M1. The station talks to the keys directly, and
      the app would grab them first.
- [ ] In the Nanoleaf app, turn off the touch *shortcuts* on the Elements (double-tap to turn
      everything off, swipe to change brightness). Touch itself stays on; it is the game. The
      Canon's "gestures off" open item means exactly these shortcuts.
- [ ] Both Nanoleaf controllers and the Hue Bridge on fixed addresses on the router (the DHCP
      reservations from the Canon's open items). If a controller moves address mid-party, the
      wall goes silent.
- [ ] The study key word is saved (the Game test tab shows it) and the station on the M1 Air
      says it is connected.
- [ ] The taps are taught on the M1 Air (Game test tab, Teach the taps, §13). Taught once, they
      stay taught on that Mac; teach them again only if a hexagon has moved.
- [ ] Walk through one full round yourself before guests arrive. Touch, Lines, button box,
      phone. If the phone gets the card *From the study*, the chain works. (Play a practice
      round on the Game test tab tries the walls and the buttons without any night; the card
      only comes in a real round.)
- [ ] Screen angled so a group at the wall can see Granolia without turning around.

---

## 8. If something breaks

Delay, never destroy. The trace is sent whatever happens.

| What fails | What the group sees instead |
|---|---|
| The hexagons stop answering touch | The pattern plays on the screen over a drawing of the wall, with the panels numbered. The group taps the numbers on the button box in order. Same game, same keys. |
| The Lines go dark | The colour and the count appear on the screen instead. |
| The whole station is down | The study is cut. The group's round runs on the ten-minute clock like every room, and at the chime the server sends the group the trace and the bag hint. Granolia's lines show on their phones. |
| The server cannot be reached | The station keeps running the game locally and sends "finished" when it reconnects. The group's phones catch up on their own. |

The Nanoleaf layer is on the list of things that are safe to cut in the last days (there is no
freeze date). The trace is not.

---

## 9. What it leaves for the end credits

- **Bright Sparks:** the group that cracked the study lights fastest.
- **Left in the Dark:** every group the ten minutes beat, or, if every group cracked it, the
  slowest one (*"Granolia still believes in you."*).
- Decided 22 Oct (handoff §8). Still nothing about hints.

---

## 10. Decisions this doc makes

Each of these fills a gap. Say the word and any of them changes.

1. **No second room, no chest.** The old worksheet had the three pairs opening a virtual chest
   somewhere else. The Canon drops it, so this does too: the third correct pair pays out right
   there in the study. The code is already unguessable.
2. **Begin by touching the wall.** No start button, so the blank key stays blank and nobody has
   to touch the computer.
3. **Hints are offered, not requested.** There is nothing to press, so Granolia watches for
   struggle and steps in. No cost: affection moves only through the Parlour Games
   (decided 12 October), so her help cannot cost affection. That closes the act skeleton's open
   question.
4. **Granolia is always right in the study.** Her old one-wrong-detail trait applied only to her
   secret lines about the night, never to puzzle hints, and went with them on 23 October 2026.
5. **The study pays its group, and only its group.** Solve or cap, the group is paid. (Until
   24 October the study's finish moved the whole house on; the round's chime does that now.)
6. **The six colours** are red, yellow, green, blue, pink, white, chosen to look different from
   each other on LED bars in a dim room. Check them on the real Lines and swap any two that
   look alike.
7. **The pay-out goes to each phone in the group**, not to the study screen. The screen never
   shows the trace.

## 11. Still open

- Pattern lengths and pace, tuned on the real wall with Jessa and your dad (not a decision,
  a test).
- How many hexagons and how many Line bars are on the walls: **answered 24 October** by the real
  walls, ten hexagons and twelve bars. Six counted bars with a dark bar between each need eleven,
  so even a six always shows with gaps.
- **Granolia's intro on the phone needs new words (yours to approve).** Since 24 October this is
  the decision card *granoliaIntro* on the Timeline. Its default is the new words below, which
  Claude Code puts in unless you pick Keep the old words. Today it says, from the
  handoff, *"The lights on the wall flash a pattern. Copy it on the buttons, then press
  submit."* But the game is played by touching the panels; the buttons only take the colour and
  the number at the end. A group that follows it would press buttons while the wall waits for
  touches. Proposed: *"Oh! You're here! The wall flashes a pattern. Touch the same lights in the
  same order. Do that three times, then press the colour and the number on the buttons, and
  press submit. Made a mistake? Press undo. I used to know the whole pattern, but... yeah."*

---

## 12. What is built (13 October 2026)

Built blind, tested against fakes. (First run on the real walls on 24 October: §13.)

- **The station**, `station/`: the whole game as a state machine (`lib/study.js`),
  the Nanoleaf driver, the button-box driver with its own key labels, fakes for
  both, and the runner `station.mjs`. Twelve tests.
- **The server side**, `functions/lib/station.js`: *Make the groups* (pairs and
  trios, the study order), the station key, the station's state and "finished"
  calls, and the pay-out hook that marks each phone in the group as dealt. It
  pays the Ghost's trace at the dial's level (`station.studyReveal`, 22 Oct).
- **The study screen**: `/play/?kiosk=study` on the M1 Air. Granolia, the three
  jewels, the clock, her hints, the numbered wall for the map hint and the
  fallback.
- **The Host tab**: *Make the groups*, and the station key box.

**To run it, once deployed** (`npm run deploy`, which you run):
1. Host tab → *The study* → type a station key (any word of four or more
   letters) → *Save key*.
2. On the M1 Air: copy `station/.env.example` to `station/.env`, fill in the two
   Nanoleaf addresses and tokens and the same key. Then in `station/`:
   `npm install`, then `npm start`. Quit the Elgato app first.
3. Open `https://murderwin-at-sirwin-manor.web.app/play/?kiosk=study` in a
   browser on the M1 Air, full screen.
4. After supper, Host tab → *Start Act 4*. When the rounds begin, the study greets the group due
   there.
5. No walls yet? `npm run fake` in `station/` plays the whole game from the
   keyboard (the key map prints when it starts).

**Added 17 October 2026.**
- **The pay-out is dealt for real.** When the station says a group is done (or the cap falls),
  the server deals one card to every phone in the group. Nothing is on a phone before it is
  earned. **Done 22 Oct:** the card is the Ghost's trace at the dial's level
  (`station.js studyReveal`), not a written clue.
- **The study is the clock.** (Superseded 24 Oct: the rounds are the clock now.) The same "done" moves the whole house to the next station,
  exactly as pressing *Next* would, as long as the night is in Act 4 on a station beat. A
  Parlour Game on the phones keeps running through the rotation (21 Oct).
- **Rehearsing without the walls.** If no station has reported in for two minutes, a rotation
  deals the study's trace card with the station card, so a phones-only rehearsal still pays
  out.
- **Make the groups** on the Host tab now goes through the dealer, so the Murderer and the
  Ghost are kept apart there too.
- **Fastest light puzzle** reaches Act 7 from the groups' finish times (since 22 Oct the end
  credits' Bright Sparks and Left in the Dark, §9).

**Added 17 October 2026, second pass (the Act 4 clock cannot misfire).**
- **The study is the clock at every slot.** (Superseded 24 Oct, as above.) The two Parlour Games in Act 4 sit between
  stations. Before this, a group finishing the study right before a Parlour Game lit the
  phones and then waited for you to press Next. Now one finish does both: every phone lights
  up with its three questions AND the whole house moves to its next station, in the same
  moment. People answer as they walk. You never need Next between study finishes. Next still
  works as the backup if the station is ever stuck.
  **Changed 21 Oct:** the Parlour Games no longer have beats of their own; five pop up at
  random times during Act 4 (twelve a night: five in Act 2, five in Act 4, two at the start of
  Act 6; `docs/parlour-games.md`), so the `autoAfterStudy` flag is gone.
  A study finish during a Parlour Game still moves the house on, and the game keeps running.
- **The server decides who is due in the study.** The station only ever says "the group I
  was told about is done". Which group that was, and who comes next, is the rotation's. The
  station re-arms for whichever group the server's study document names, never from its own
  memory, so a second group is never greeted as the first and paid as the first.
- **No station? Twelve minutes a group.** (Superseded 24 Oct: the round's ten-minute chime pays the group; *study-tick* is kept with a ten-minute slot.) If the study station has not reported in for two
  minutes when a rotation happens, the study runs on a twelve-minute timer instead: the trace
  card rides with the station card, and when the twelve minutes are up the house moves on, paid
  as "absent". Your Host tab keeps that clock (it asks the server once a minute through
  Act 4), and the Host tab also has *Finish this group now* for when you would rather not
  wait.
- **The wrong group walked in.** On the Host tab under *The house*, *This group is in the
  study* lets you name the group that actually went up, before they finish. The study then
  pays that group. Once a group has been paid the button goes away; the house moves on at the
  next station.
- **The study greets by character name.** The study screen says *The study · Dorothy Rye,
  Roger Arms* rather than the guests' own names.
- **Settings without a code change.** The station reads the pattern lengths, pace and the cap
  from the study document when they are there (`nights/{id}/public/study.settings`), and
  uses the defaults in §4 otherwise. Nonsense values are ignored.
- **The house panel on the Host tab** shows whether the study station, the two room screens,
  the study screen and the cue relay are alive (heard from in the last two minutes), who is
  in the study and how long they have, and a red/green switch for the hall light. While a
  Parlour Game is open the guest list shows only "3 of 9 have answered", never who, so a host
  who happens to be the Ghost or the Murderer learns nothing from it.
- **The hardware check.** `node scripts/hardware-check.mjs` prints PASS or FAIL for the
  Nanoleaf walls, the Hue bridge and the Stream Deck, and nothing else. Run it one evening
  before the second full tech run with everything plugged in. `--fake` runs it with no hardware.

(The deferred question about firing the Parlour Games on a study finish is moot since 21 Oct:
they pop up on their own times.)

Decisions made while building, on top of §10:
- **The station presents a key, not an account.** You type a key on the Host
  tab and the same key into the station's settings file. Simpler than a second
  sign-in, and it can be changed from your phone.
- **Who is in the study comes from the groups.** *Make the groups* writes the
  order; the station pays out to the group the order says is due. If the wrong
  group walks in, *This group is in the study* on the Host tab reassigns it
  before pay-out.
- **Granolia's study-screen lines** are the workshop list *Granolia in the
  study*; a line left blank uses the plain default. Her intro on the phone is
  the host line in `functions/lib/hosts.js` (see §11 for its wording).

---

## 13. Trying it before the night: the study test (24 October 2026)

The first section of the workshop's Game test tab is the study test (the old Study test address
opens it). You stand at the walls with your phone; nothing needs a terminal, and a test never
touches a real night: no group finishes, no clue is dealt, and the house does not move on.

**The key word.** The study station shows a key word to the game to be let in, and the brain
uses the same word to find the W-O-O-F News recordings. The word is saved once, in the box on
the Game test tab (at the top of the tab while none is saved), and the same word sits in the
settings file on the Mac that runs the station and on the brain. Until it is saved, the game turns
the station away and the tab says the station is not connected. Not sure what the word is? Ask
Claude Code to save it for you: it copies it across without showing it. It is kept from night to
night.

**The buttons.** With the station running on the Mac by the walls (ask Claude Code to start it),
the tab says it is connected, and:
- *Flash the walls.* Both walls blink once, and the tab says which answered.
- *Teach the taps.* The white wall does not say which hexagon was touched in any way the game can
  read on its own, so it has to be taught once. Each hexagon lights in turn; touch it, and the
  station remembers that touch as that hexagon. The lit one stays lit until it is touched. A
  touch on a hexagon already taught is a slip: the tab says so and waits for the lit one. Teach
  them again only if a hexagon moves.
- *Play a practice round.* The real game on the real walls, with no group and no night: copy the
  pattern on the white wall, then put in the colour and the number on the answer pad on your
  phone, which does what the button box does (a colour, a number, Undo, Submit). The tab follows
  the round, the pairs and the misses. A round nobody touches for ten minutes ends on its own.
- *Stop* ends any of them. The tab also shows the last tap, and what each wall is doing.

In Act 4, while a group is due at the study or playing there, the teach and the practice do
nothing, so a test can never get in a group's way.

**The taps are kept on the Mac that runs the station.** Whatever is taught is saved on that Mac
only. For the night that is the M1 Air by the walls, so the taps must be taught while the M1 Air
runs the station (or Claude Code copies the saved taps across). Taught on another Mac, they stay
on that Mac.

**The hexagons and the bars, grouped.** The walls do not list their panels the way you see them.
The white wall lists each hexagon as its six corner lights, sixty in all, and the colour wall lists
each bar as its two halves, plus the little connectors between bars. The station gathers them
back into the ten hexagons and the twelve bars the game plays with, so a lit hexagon lights all of
it, a bar lights end to end, and the connectors stay dark.

**What was tried on the real walls, 24 October.**
- Both walls paired, and their layouts read: ten hexagons, twelve bars.
- The game's lights show on both walls, whole hexagons and whole bars; the flash works on both.
- The taps: touches came through, and two of the ten hexagons were taught, but on another Mac,
  not the M1 Air, and nothing was kept. Teaching all ten waits until the station is set up on the M1
  Air (a Timeline card for Claude Code, then yours).
- Not tried yet: the Stream Deck (it goes on the M1 Air by the walls), and a whole round with a
  group. Both are Timeline cards, before the first full tech run.

---

## For Claude Code (technical)

**Where it lives.** A new top-level `station/` package: a Node process that runs on the M1 Air
and owns the three devices, plus a kiosk page for the study screen served by the same hosting
as `play/` (one page, `?station=study`). The Node process holds the live pattern and code in
memory only. Nothing about a round is written anywhere except counts and timestamps.

**Devices.**
- Stream Deck: `@elgato-stream-deck/node` over HID. Draw each key (colour fill, label), read
  key-down events. The Elgato app must not be running.
- Nanoleaf Elements and Lines: Open API v1 over HTTP, port 16021, one token per controller
  (pairing: hold the controller's power button, then `POST /api/v1/new` within the window;
  tokens do not expire; they stay paired to HomeKit). Read `panelLayout/layout` at start for
  panel IDs and positions, so nobody hand-types a layout. Light individual panels with a
  static `display` effect written through `PUT /effects` (`write` command). Touch: subscribe to
  the server-sent events stream, `GET /events?id=4`, which reports gesture type and panel ID per
  tap. Elements are white-only (colour temperature 1500 to 4000 K), so patterns are brightness
  only. Lines take full colour. Verify every call on the real controllers; the Elements'
  per-panel write format is the one thing most likely to need a fix. Reserve both controllers'
  addresses on the router.
- Latency to watch: the event stream is fine for taps; if it lags past about 150 ms on the real
  wall, switch to the UDP touch stream the API offers.

**The real walls (24 Oct 2026; `station/lib/nanoleaf.js`, `station/test/layout.test.mjs` on the
real layouts in `station/test/fixtures`).** The layout lists pieces, not panels. The Elements list
each hexagon as six corner lights (shapeType 15; 60 corners, 10 hexagons); the Lines list each bar
as two halves (shapeType 18; 24 halves, 12 bars) plus connectors (16), the controller cap (19) and
the power connector (20); the controller itself (12) is skipped. `groupLayout(layout)` returns
`{ panels, pieces }`: one panel per hexagon (`hexagonsFromCorners` searches the corner reach and
the y direction that gather the most sixes), one per bar (`barsFromHalves`, closest same-angle
pairs first, so two bars end to end in a line are never crossed), every other kind its own panel,
the Lines joints in no panel. A panel's id is the smallest piece id, its position the middle of its
pieces, sorted top to bottom then left to right. `frame()` writes every piece (`pieces`), each
taking its panel's colour, joints dark. `unitOf(id)` maps a touched piece to its panel through
`panelOf`, then through the taught `touchMap`. The Elements report a tap by an id their layout
never lists, so `lib/teach.js createTeacher` lights each panel in turn and maps the next tap's own
id (`listenTouch` hands it as `tapId`, never through an older map) to that panel. The map is
`station/touch-map.json` (`touchMapFile`, `writeTouchMap`) next to `station.mjs`, which loads it at
start and `setTouchMap` takes a newly taught one with no restart; it lives on whichever Mac runs the
station (not in the repo), so it must be taught on the M1 Air or copied there.
`npm run teach-touch` in `station/` does the same from the terminal, with the station stopped.
A tap on a piece no panel holds is logged once per piece. Tried on 24 Oct: pairing, the layout
read, frames and `identify` on both walls; two of ten hexagons taught on another Mac, nothing kept.
Not yet: the full teach on the M1 Air, the Stream Deck, a whole round.

**The study test (`station/lib/testmode.js`, the `studyTest` callable in
`functions/lib/studytest.js`, the workshop's `app/src/pages/StudyTest.jsx` inside the Game test
tab).** The page queues commands in `public_state/study_test` (flash, teach, practice, stop, key);
the station follows the queue (a command older than two minutes is skipped) and reports through
`studyTest('status')`, which the function saves as `public_state/study_test_status` (words and
counts; never a round's code or pattern, except the Lines' colour and count when the Lines are
down, so a practice can still be finished). A practice round is its own `createRunner` with no
night: no state write, no finish, no clue, no rotation. While a teach or a practice runs, the live
runner's writes to the walls and the deck are held back (`hold`), and neither starts while a group
is due or playing (`GROUP_DUE`, `GROUP_PLAYING`). A practice nobody touches for ten minutes ends.
The key word box is `app/src/components/KeyWord.jsx`: `meta/game.station_key`, the same field as
the Host tab's Save key, checked against `STATION_KEY` in `station/.env` by
`functions/lib/station.js stationAllowed`. Never print the word.

**Pattern rules.** Length and pace from a settings doc (`nights/{nightId}/stations/study/settings`
or workshop `meta`), defaults as in §4. No immediate repeats. Three patterns per round are
independent, not a growing chain. Reproduction is judged tap by tap; a wrong tap ends the
attempt at once and replays.

**Lines count.** With `k` segments: if `k >= 2n - 1`, light `n` segments with one dark segment
between each, from the controller end; otherwise light `n` adjacent segments. Colour by name
from a six-entry table with the RGB tuned on the real bars.

**Firestore (as built).** `nights/{nightId}/public/study` is the station's state as the
machine's snapshot (`state, round, pattern, pairsLocked, misses, hint, entry, outcome,
startedAt, finishedAt, warned, map, lines, revealed, groupId`) plus `layout`, `elementsOk`,
`linesOk`, `granolia`, `fallbackPattern`, `updatedAt`. Written only by the function on the
station's `state` call; readable by any signed-in client (the kiosk page reads it).
`nights/{nightId}/public/rotation` holds `{ groups[{id, members[{key,name}]}], studyOrder[],
current, finished{} }`. The station signs in anonymously and presents `meta/game.station_key`
(set by `hostCommand('station-key')`); it never holds a service-account key and never reads
`sealed/*` or `cases/*`.

**Since 24 Oct** `run.studyFinished` calls `stationCommand('finished')` (which records the group
and deals the trace card) and then `act4.payRoom(db, nightId, gid, 'study')` for the bag hint
and the paid mark; it no longer rotates the house. `act4.setRooms` is now the writer of
`public/study.groupId` each round; `deal.rotate` and `station.makeRotation` are gone. The
paragraphs below describe the 17 Oct design where they mention rotation.

**Pay-out (as built).** Callable `stationCommand({ nightId, key, station: 'study', command:
'finished', payload: { groupId, outcome, seconds, pairs } })` → `dealStudy` writes
`sessions/{uid}.dealt.study = { at, outcome, groupId }` for each member, records the group in
`rotation.finished`, advances `rotation.current`, and points `public/study.groupId` at the next
group. Idempotent by `groupId`. **Done 22 Oct:** `dealStudy` calls `studyReveal(db, { c, roster })`
once per group (the Ghost's trace at `c.dial` on the `traces.js` ladder; at level 3 the partner
excludes the Murderer's trace), records the level in `nights/{id}/private/dialClues.study` for
the end credits, and deals `studyClueCard(c, act, beat, reveal)` (`'Something was left behind.'`
plus `trace`; `STUDY_PLACEHOLDER` when there is no reveal) to each member with `dealOnce`.
The case has had no `studyClue` since 23 October 2026 (the per-motive secret sets are retired).
The no-station path deals the same card from `deal.rotate`.

**Clock.** The cap is `startedAt + 10 min` on server time (`capMs`, 24 Oct; `warnMs` 8 min).
Separately, `act4.setRooms` writes `public/study { groupId, slotEndsAt }` at the start of each
round (the round's end), and the round's chime pays the group with `act4.payRoom` if the
station has not. The station keeps server skew the
same way the phones do (write, read back the server stamp). The kiosk page renders the clock
from `startedAt`, never from its own timer.

**Pause.** The station also watches `nights/{id}` (station/lib/follow.js). While `phase` is
`paused` its clock stands still and the wall ignores touches; on resume the game's `startedAt`
moves on by the length of the pause (`runner.paused`), the next state write carries the moved
start to the kiosk, and the group gets its whole ten minutes. The no-station slot
(`public/study.slotEndsAt`) is moved by the server's `resume` instead (`PAUSE_SHIFTED`).

**Which group.** The rotation (`deal.rotate`, `station.makeRotation` for the first group)
publishes who is due in the study. The station greets that group and pays out to it. It does
not try to detect who is physically present. If a different group starts, the Host tab can
reassign before pay-out; otherwise the scheduled group is paid. The group's phones get the
study station card with `host: { cat: 'granolia', line: hostLine('granolia', ui) }` (deal.js):
a workshop ui_copy line `HOST GRANOLIA`, if one is ever written, wins over the default in
`hosts.js`.

**Fallbacks.** Elements unreachable for 5 s → the kiosk page shows the numbered wall and the
station accepts number keys as the answer. Lines unreachable → colour and count rendered on the
kiosk page. Station offline → nothing extra is written: `act4.setRooms` has already set `public/study { groupId, reassignedFrom: null, slotEndsAt }` (the round's end), and the round's chime pays the group through `act4.payRoom`;
`station.tickStudy(db, nightId, now)` (host command `study-tick`, called by the Host tab on load
and once a minute in Act 4; any scheduled tick may call it too) ends a slot that has passed by
calling `run.studyFinished` with `outcome: 'absent'`, once per group (`rotation.finished` is the
guard). A station that died mid-act never wrote a slot, so the beat's `beatAt` plus ten minutes (`ABSENT_SLOT_MS`) stands in. A live heartbeat (`updatedAt` within `STATION_QUIET_MS`) stops the tick.

**Who owns `public/study.groupId` (17 Oct, second pass).** `deal.rotate` (and `makeRotation`
for the first group) are the only writers. `stationCommand('state')` drops `groupId`,
`slotEndsAt`, `reassignedFrom` and `settings` from whatever the station sends, and accepts
`state` only from `STATION_STATES` (`idle | playing | reproducing | entering | done`; `absent`
is the server's word). `finishStudy` no longer moves the pointer. The runner
(`station/lib/runner.js`) ignores `nextGroup` in the answer and re-arms from the latest
`public/study` snapshot after the rest; `station/lib/follow.js` watches `public_state/active`
and swaps the study listener when the night changes (the machine resets to idle).

**Reassign.** `stationCommand('reassign', { groupId })` or host command `study-reassign`
→ `reassignStudy`: refused once the group due has been paid, or for a paid target. It writes
`groupId: <picked>, reassignedFrom: <was due>`; a `finished` that names `reassignedFrom` pays
`groupId` instead and `run.studyFinished` still rotates (the `reassigned` flag bypasses the
slot check). `rotate` clears `reassignedFrom`.

**autoAfterStudy** (removed 21 Oct). The Parlour Games have no beats; `run.studyFinished`
rotates even while a questions window is open, and the window settles on its own clock.

**Settings.** `station/lib/study.js settingsFrom(input)` takes `capMs, warnMs, rounds (3 of
{lengths[3], onMs, gapMs}), replayHintMisses, mapHintMisses, restMs` within sane ranges; the
rest falls back to `DEFAULT_SETTINGS`. The runner rebuilds the machine with new settings when
it is idle. Nothing writes `settings` yet; a host or the workshop may, with the Admin SDK.

**Tests.** A fake Nanoleaf (layout + event emitter) and a fake Stream Deck, so the whole state
machine runs in `npm test`: clean solve, cap, wrong tap replays, wrong pair feedback, hint rungs
fire at the right miss counts, pay-out called once. Throwaway night; nothing persisted.
