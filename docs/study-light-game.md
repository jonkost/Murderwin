# The study light game (Act 4)

The big puzzle of Act 4. Written 13 October 2026 from everything already decided about it,
with the gaps filled in. Everything here is structure. No answers, no clue text. Safe for you
to read.

**Where the settled parts come from:** the Canon page (Puzzles, Hardware, The seven acts),
`CLAUDE.md` (Hardware), the act skeletons (`chats/docs/sirwin-manor-act-skeletons.md` §5), the
first puzzle worksheet from 3 September (house rules for all puzzles), the cat info
(`docs/cat-info.md`, Granolia), and the lighting chat from 30 August. Where this doc goes past
those, it says so under "Decisions this doc makes".

---

## 1. What it is, in one breath

A group walks into the study. One wall of white hexagons plays a pattern. They touch it back.
Do that three times and the colour lights on the other wall answer with a colour and a number.
They press that pair on the little button box. Three rounds, three pairs, and the study hands
every phone in the group a clue. Fifteen minutes, then out, whatever happened. Granolia helps.

The study is the timekeeper for the whole act: when one group is done, everyone rotates.

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
says *Something has been sent to your phones*, every phone in the group receives the clue, the
walls do a short celebration, and the rotation fires for the whole house. The study goes back
to rest for the next group.

**The clock.** Fifteen minutes from the first touch, hard, on the server's clock. At twelve
minutes Granolia mentions the time. At fifteen the walls stop testing, the screen shows every
pair the group had not yet earned, the clue is sent anyway, and the rotation fires. *"Thank you
for trying your best. Off you go."* Nobody leaves the study without the clue.

---

## 4. The numbers

| Round | Pattern lengths (touches) | Pace |
|---|---|---|
| 1 | 3, then 4, then 5 | Slow. Each panel lit about 0.8 s. |
| 2 | 4, then 5, then 6 | Medium. About 0.6 s. |
| 3 | 5, then 6, then 7 | Quick. About 0.45 s. |

- A clean run is about four minutes. Each mistake costs about half a minute. The cap allows
  roughly twenty mistakes, which is generous on purpose.
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
| Twelve minutes | Mentions the time, kindly. |
| Fifteen minutes | Stops the game, gives everything, sends everyone on. |

In the study Granolia is always right. Her misremembering is about the night, not her own room.
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

One clue, the same clue for every group, reached by a different route each time. Which clue it
is comes from the seed's slot pool and is sealed. The study station never knows what it is
sending; it only tells the server "this group finished" and the server deals the clue to each
phone in the group. The phones show it in the clue list, marked as found in the study.

Groups share information only inside the group during Act 4, and the clue arrives on each
member's phone, so a trio that splits up afterwards still all have it.

---

## 6. Rule 1 check

- You can walk into the study on the night and play it. The patterns and the code are made up
  on the spot by the station, differently for every group, and they mean nothing. The clue
  behind them is sealed, dealt by the server, and never passes through the station.
- You can build and test the whole room in October. Patterns, colours, counts, the button box,
  Granolia's lines, the clock: all safe content. Testing uses a throwaway night.
- Nothing in the study is ever written down for the next group. Every start is a reset.
- Granolia's hint lines are safe content you write in the workshop. They never mention the clue.

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
- [ ] Walk through one full round yourself before guests arrive. Touch, Lines, button box,
      phone. If the phone gets a clue, the chain works.
- [ ] Screen angled so a group at the wall can see Granolia without turning around.

---

## 8. If something breaks

Delay, never destroy. The clue is dealt whatever happens.

| What fails | What the group sees instead |
|---|---|
| The hexagons stop answering touch | The pattern plays on the screen over a drawing of the wall, with the panels numbered. The group taps the numbers on the button box in order. Same game, same keys. |
| The Lines go dark | The colour and the count appear on the screen instead. |
| The whole station is down | The study is cut. The rotation runs on a twelve-minute timer and the server deals the study clue to each group as their study slot ends. Granolia's lines show on their phones. |
| The server cannot be reached | The station keeps running the game locally and sends "finished" when it reconnects. The group's phones catch up on their own. |

The Nanoleaf layer is on the list of things that are safe to cut after the freeze. The clue
is not.

---

## 9. What it leaves for the stats reel

- Fastest light puzzle (the group's time from first touch to third jewel).
- Nothing about hints, and no "slowest".

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
4. **Granolia is always right in the study.** Her one-wrong-detail trait applies to her
   testimony about the night, not to puzzle hints.
5. **The study's finish fires the house rotation.** Solve or cap, the rotation chime goes.
6. **The six colours** are red, yellow, green, blue, pink, white, chosen to look different from
   each other on LED bars in a dim room. Check them on the real Lines and swap any two that
   look alike.
7. **The pay-out goes to each phone in the group**, not to the study screen. The screen never
   shows clue text.

## 11. Still open

- Pattern lengths and pace, tuned on the real wall with Jessa and your dad (not a decision,
  a test).
- How many hexagons and how many Line bars are on the walls. The station reads the layout from
  the controllers, so it only matters for whether six counted bars fit with gaps between them.
  If not, the bars light side by side from one end.

---

## 12. What is built (13 October 2026)

Built blind, tested against fakes. Not yet run on the real walls.

- **The station**, `station/`: the whole game as a state machine (`lib/study.js`),
  the Nanoleaf driver, the button-box driver with its own key labels, fakes for
  both, and the runner `station.mjs`. Twelve tests.
- **The server side**, `functions/lib/station.js`: *Make the groups* (pairs and
  trios, the study order), the station key, the station's state and "finished"
  calls, and the pay-out hook that marks each phone in the group as dealt. The
  clue itself waits for the case generator. Six tests.
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
4. After dinner, Host tab → *Make the groups*. The study greets the first group.
5. No walls yet? `npm run fake` in `station/` plays the whole game from the
   keyboard (the key map prints when it starts).

**Added 17 October 2026.**
- **The clue is dealt for real.** When the station says a group is done (or the cap falls),
  the server deals one clue card to every phone in the group: the study's clue from the case
  when the generator has written it, a bracketed rehearsal line until then. The station card
  on the phone no longer carries the clue text; nothing is on a phone before it is earned.
- **The study is the clock.** The same "done" moves the whole house to the next station,
  exactly as pressing *Next* would, as long as the night is in Act 4 on a station beat. During
  a Parlour Game the host's *Next* stays in charge.
- **Rehearsing without the walls.** If no station has reported in for two minutes, a rotation
  deals the study's clue with the station card, so a phones-only rehearsal still pays out.
- **Make the groups** on the Host tab now goes through the dealer, so the Murderer and the
  Ghost are kept apart there too.
- **Fastest light puzzle** reaches the Act 7 stats reel from the groups' finish times.

**Added 17 October 2026, second pass (the Act 4 clock cannot misfire).**
- **The study is the clock at every slot.** The two Parlour Games in Act 4 sit between
  stations. Before this, a group finishing the study right before a Parlour Game lit the
  phones and then waited for you to press Next. Now one finish does both: every phone lights
  up with its three questions AND the whole house moves to its next station, in the same
  moment. People answer as they walk. You never need Next between study finishes. Next still
  works as the backup if the station is ever stuck.
  The flag that does this is `autoAfterStudy: true` on the two Parlour Game beats in
  `seed/night.json`. Set it to `false` and the old behaviour returns: a finish opens the
  Parlour Game and the house waits for Next.
- **The server decides who is due in the study.** The station only ever says "the group I
  was told about is done". Which group that was, and who comes next, is the rotation's. The
  station re-arms for whichever group the server's study document names, never from its own
  memory, so a second group is never greeted as the first and paid as the first.
- **No station? Twelve minutes a group.** If the study station has not reported in for two
  minutes when a rotation happens, the study runs on a twelve-minute timer instead: the clue
  rides with the station card, and when the twelve minutes are up the house moves on, paid
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
  before the freeze with everything plugged in. `--fake` runs it with no hardware.

One question for you, deferred: the Parlour Games now fire on a study finish. If you would
rather they fired on your Next (so the room is seated, say), flip `autoAfterStudy` to `false`
on either beat. It is one word in the seed.

Decisions made while building, on top of §10:
- **The station presents a key, not an account.** You type a key on the Host
  tab and the same key into the station's settings file. Simpler than a second
  sign-in, and it can be changed from your phone.
- **Who is in the study comes from the groups.** *Make the groups* writes the
  order; the station pays out to the group the order says is due. The Host tab
  does not yet reassign a group; if the wrong group walks in, the scheduled one
  is paid.
- **Hints the screen shows are defaults** written in the kiosk page. A "study
  lines" list in the workshop can replace them later.

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

**Pay-out (as built).** Callable `stationCommand({ nightId, key, station: 'study', command:
'finished', payload: { groupId, outcome, seconds, pairs } })` → `dealStudy` writes
`sessions/{uid}.dealt.study = { at, outcome, groupId }` for each member, records the group in
`rotation.finished`, advances `rotation.current`, and points `public/study.groupId` at the next
group. Idempotent by `groupId`. When the case generator lands, `dealStudy` is where the clue is
assembled from sealed content into each session, server-side only.

**Clock.** The cap is `startedAt + 15 min` on server time. The station keeps server skew the
same way the phones do (write, read back the server stamp). The kiosk page renders the clock
from `startedAt`, never from its own timer.

**Pause.** The station also watches `nights/{id}` (station/lib/follow.js). While `phase` is
`paused` its clock stands still and the wall ignores touches; on resume the game's `startedAt`
moves on by the length of the pause (`runner.paused`), the next state write carries the moved
start to the kiosk, and the group gets its whole fifteen minutes. The no-station slot
(`public/study.slotEndsAt`) is moved by the server's `resume` instead (`PAUSE_SHIFTED`).

**Which group.** The rotation engine (not yet built) publishes who is due in the study. The
station greets that group and pays out to it. It does not try to detect who is physically
present. If a different group starts, the Host tab can reassign before pay-out; otherwise the
scheduled group is paid.

**Fallbacks.** Elements unreachable for 5 s → the kiosk page shows the numbered wall and the
station accepts number keys as the answer. Lines unreachable → colour and count rendered on the
kiosk page. Station offline → `deal.rotate` sees `stationAlive` false and writes
`public/study { state: 'absent', slotEndsAt: now + ABSENT_SLOT_MS (12 min), groupId }`;
`station.tickStudy(db, nightId, now)` (host command `study-tick`, called by the Host tab on load
and once a minute in Act 4; any scheduled tick may call it too) ends a slot that has passed by
calling `run.studyFinished` with `outcome: 'absent'`, once per group (`rotation.finished` is the
guard). A station that died mid-act never wrote a slot, so the beat's `beatAt` plus twelve
minutes stands in. A live heartbeat (`updatedAt` within `STATION_QUIET_MS`) stops the tick.

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

**autoAfterStudy.** `run.studyFinished` on a rotate beat whose next beat is a questions beat
with `autoAfterStudy: true` enters that beat (opens the window) and then the following rotate
beat, in one call. With the flag false it enters the questions beat only.

**Settings.** `station/lib/study.js settingsFrom(input)` takes `capMs, warnMs, rounds (3 of
{lengths[3], onMs, gapMs}), replayHintMisses, mapHintMisses, restMs` within sane ranges; the
rest falls back to `DEFAULT_SETTINGS`. The runner rebuilds the machine with new settings when
it is idle. Nothing writes `settings` yet; a host or the workshop may, with the Admin SDK.

**Tests.** A fake Nanoleaf (layout + event emitter) and a fake Stream Deck, so the whole state
machine runs in `npm test`: clean solve, cap, wrong tap replays, wrong pair feedback, hint rungs
fire at the right miss counts, pay-out called once. Throwaway night; nothing persisted.
