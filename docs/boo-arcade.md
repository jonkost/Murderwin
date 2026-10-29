# Miss Boo LaRue's Arcade: Boo's games on the Stream Deck + XL (Act 4, not on the night yet)

Built 28 October 2026, for testing, on a page of its own; reviewed and fixed on 29 October, when
*Whack-a-Mouse* also got its pets, the Tail key on the menu its black cat, and every strike its
words on the touch strip. Later that day the menu's top row became flashing paws, and the Knock
key Boo's paws.
Everything here is structure: no answers, no clue text. Safe for you to read.

**Not on the night yet.** On the night the Entryway still plays *Boo's Catwalk*, as built.
Whether the arcade takes its place is the decision card *entrywayGame* on the board, and only you
answer it. Until then the arcade is a page you can play any day, and nothing in it touches a night.

**Where the settled parts come from:** your words on 28 October (the talk that designed it) and
29 October (the pets in *Whack-a-Mouse*, the black cat, the words on the strip, the menu's
look), quoted in §1, the note on the decision card *entrywayGame*, and the build of 28 October.
Where the build goes past your words (the speeds, the points, how often a pet comes, Boo's
lines, most of the words on the strip), those are starting points, and a note from the Game test
tab changes them.

---

## 1. What it is, in one breath

A group sits at the Stream Deck + XL in front of a Mac. Each player has two tokens. They take
turns: press a game on the keys, play it with the keys and the dials, pass to the next player.
After their second game each player's own clue shows on the Mac's screen; a trio's third player
gets Boo's line instead. Boo names the winner, just for fun, and everyone plays freely until the
chime, when Boo says "Be on your way."

In your words (28 October):

- "a boo arcade (play on the French term) where you get two tokens ... play 2 games out of x
  number we come up with. The players take turns one game at a time; after 2 games each player
  gets their own clue. It's just for the fun of playing."
- "In the event of a 3rd person still give them only 2 clues and have the line "Didn't I give
  you enough? Now be off! I'm done playing games.""
- The games: "snake on the stream deck where you use the dials to move" became *Boo Chasing Her
  Tail*. "don't let boo get the lazy pointer. It's a red block you move and a black block is
  after it. You have to keep it moving and don't let her get it." became *The Lazy Pointer*.
  "The dials are buttons too. So knock it off you push that dial button at the correct time."
  became *Knock It Off the Table*. *Whack-a-Mouse* and *Yarn Catch* make five. (*Cushion Stack*
  was cut: four rows is too short.)
- "The game select should be centered with five games 2 open on each end equaling 9."
- "Make the games last 2 minutes each?" Settled: two minutes a game for one or two players,
  80 seconds for a trio. The build adds one rule: in a visit, a game that would run into the
  chime is cut short (never under 30 seconds), so its clue usually still comes before the chime
  (§5).
- "Not motives it has to be ghost clues. Act 4 is focused on getting insight on the dearly
  departed."
- "We can do the clue of SKMBP": each player's clue shows on Susan's MacBook Pro's screen.
- "After that if we have time before the rotation there can we a free play where you can just
  play not resulting in anything. I think my kids will enjoy that instead of waiting around."
- At the chime Boo says "Be on your way."
- Boo's winner is "who got more points in the arcade games." Just for fun.
- The name: Miss Boo LaRue's Arcade. (Miss Beaux LaRue was floated and dropped: she stays
  Miss Boo LaRue.)
- "We need to get boos game up for testing. Not the cat walk the arcade games."

On 29 October, for *Whack-a-Mouse*: "lets add a decoy element to the mouse", and then "all the
pets. zimmy is a similar color. I think after 3 missed your out, or it ends at 2 mins". Settled:
the decoys are the five household pets (Zimothy's colour is close to the mouse's, so he is the
sneaky one), and the third pet tapped ends the game; otherwise it ends at its two minutes, as
before. The build reads a miss as a pet tapped: a mouse that hides, or a tap on an empty key,
costs nothing.

Also on 29 October: "Lets use the black cat emoji for the tail", and asked where, the Tail key on
the menu. Settled: the key shows a black cat; the treat Boo chases in the game stays a fish. And
"Make sure all strike systems show some verbage in the touch screen". Settled: every strike says
so on the touch strip for a moment, in place of the points ("Strike 1! That's a pet." in
*Whack-a-Mouse*). The build adds: a miss in *Knock It Off the Table* counts as a strike ("Too
soon!" or "Too late!"); before *Whack-a-Mouse* starts, the strip says its rule ("Three pets and
you're out."); and when any game ends, the strip says how ("Boo bit her own tail.", "Boo caught
the red dot.", "You tapped three pets.", "Time's up."). It counts a ball that falls past the
basket in *Yarn Catch* as no strike (it only scores nothing), so while that game plays its strip
shows the points as before.

Later on 29 October, looking at the menu: "Use the boo face image. Make the drop shadow less
noticeable on the 'tail.' Knock should be the cat paws. instead of the stars on the top row. Make
it flashing like an arcade game." Settled: Boo's face picture on the top row's middle key (a
fresh page already showed it; the page now draws its keys again whenever the pictures come in,
so a page left open while the code changes shows it too); the black cat on the Tail key in a
faint glow; the Knock key shows Boo's paws, the paws she swipes with in the game (the vase stays
on her table). The build reads the rest as paws in place of the stars on the top row, flashing
like an arcade's sign: one paw in three lit, the lights running in towards Boo four times a
second. The winner's top row flashes the same way. If you meant Boo's face along the row
instead, say so and it changes.

---

## 2. The page, and how to open it

| Address | What it is |
|---|---|
| `?kiosk=boo&play=1` | Free play: pick any game, as often as you like. Nothing counts. |
| `?kiosk=boo&play=1&visit=1` | A group's visit, for practice: names, turns, tokens, the clue moment, the winner, free play, and a ten-minute round that ends at the chime. |

Both are on the workshop's Game test tab, in the section *Miss Boo LaRue's Arcade* ("The arcade,
free play" and "A group's visit, for practice"), and the first is on the Devices page under
Spares. Free play also has a small Practise a group's visit button at the bottom of the page.

- **Google Chrome on a Mac.** Only Chrome (or Edge) can talk to a Stream Deck from a web page.
  In Safari the page says "To play on the Stream Deck, open this page in Google Chrome." and the
  deck drawn on the screen still plays everything.
- **Quit the Stream Deck app first** (Elgato's). It grabs the keys, and the page then cannot.
- Plug in the Stream Deck + XL, tap Connect the Stream Deck, once, and pick it from the list
  Chrome shows. Chrome remembers it after that. The bottom of the page then says
  "Stream Deck + XL: connected."
- **One arcade tab at a time.** Only one arcade tab plays on the Stream Deck. The tab opened
  last takes it, and so does Connect in any tab; the tab it leaves says "The Stream Deck went to
  another arcade tab. Press Connect to bring it back here." (Unplugged and plugged back in, the
  deck goes to whichever tab asks first: Connect in the one you want.) So to try a group's visit
  from free play, press Practise a group's visit at the bottom of the page, or close the free
  play tab before you open the visit.
- **Sound.** Set the Mac's sound output to its own speakers first: through a HomePod the sounds
  come about two seconds late. The first click anywhere on the page turns the sound on (until
  then the small button Tap once to wake this screen sits in the bottom right corner). A press
  on the Stream Deck cannot do it: the browser waits for a real click.
- **No Stream Deck?** The deck drawn on the screen plays the same games. Click a key. Each dial
  has a left arrow, a middle you press and a right arrow, and the mouse wheel over a dial turns
  it. Click the strip. On the keyboard: the left and right arrows turn the first dial, the up and
  down arrows turn the last one, the space bar or Enter presses the first dial, and 1 to 5 pick
  the five games on the menu.
- A practice visit has the red PRACTICE band across the top, so nobody takes it for the night.
  Free play has no band.

---

## 3. The deck

The Stream Deck + XL has 36 keys (nine across, four down), a touch strip under them, and six
dials along the bottom.

| Where | What it shows |
|---|---|
| Top row | Paws, with Boo's face in the middle: one paw in three lit, the lights running in towards her, like an arcade's sign. |
| Second row | The menu: two blank keys, the five games, two blank keys. From the left: *Boo Chasing Her Tail*, *The Lazy Pointer*, *Whack-a-Mouse*, *Knock It Off the Table*, *Yarn Catch*. |
| Third row | In a visit, the player's two tokens either side of the middle: a full coin for a token left, an empty ring for one spent. |
| Bottom row | Blank. Its left-hand key is Back, on the screen before a game starts. |
| The touch strip | Whose turn it is, the game's name (in *Whack-a-Mouse*, while it plays, the pets tapped in its place), the points (for a moment after a strike, the strike's words instead: §4), the time left as a bar and a clock, and what each dial does in this game. Before *Whack-a-Mouse* starts, its rule; when a game ends, how it ended and the points. A tap on the strip counts as a dial press. |
| The dials | The left three turn left and right (clockwise is right). The right three turn up and down (clockwise is up), like an Etch A Sketch. Every dial is a button too: press it. |

During a game the keys are the game's board. Between games: a big 3, 2, 1 on the middle key of
the second row for the count, one green key with a tick while a clue or Boo's line is up (a press
goes on: any key, or a dial pressed in), the flashing paws and Boo for the winner, and Boo alone
at the chime.

---

## 4. The five games

Two minutes a game (80 seconds a game when three play a visit, and in a visit a game that would
run into the chime is cut short: §5). Every game ends at its time unless it ended sooner. The
speeds and the points are starting points, kept in one place in the game's code, so a note from
the Game test tab is a quick change.

1. *Boo Chasing Her Tail* (your snake). Boo's face is the head; her tail follows. Turn a left
   dial to steer left or right, a right dial to steer up or down; turning straight back on
   herself does nothing. The edges wrap round. A fish makes her tail one longer: 10 points.
   Five fish wins: 20 more, and a point for every whole five seconds left. Biting her own tail
   ends it.
2. *The Lazy Pointer*. Your red dot; Boo is the black block after it. The left dials move the
   dot left and right, the right dials up and down. The edges stop it, and it never moves onto
   Boo. She steps one key towards it (diagonally too), a little quicker every 15 seconds, and every
   sixth step she stops for a beat: she is lazy. A point for every two whole seconds you last,
   and 20 more for lasting to the end. She lands on the dot: caught, and it ends.
3. *Whack-a-Mouse*. Mice pop up on the keys. Tap one before it hides: 1 point, a gold mouse 3
   (one in ten, and it hides sooner). One at a time at first, up to two at once from 30 seconds
   in; they come faster and hide sooner as the game goes on. From five seconds in, the
   household's pets pop up among them (about one in four of what pops up): Sir Irwin, Granolia,
   Boo, Zimothy and Salem, each their own face picture, up as long as a mouse. Leave them alone:
   a pet tapped scores nothing and shows on red for a moment, and the third one ends the game
   ("You tapped three pets."). Each pet tapped says so on the strip for a second and a half, in
   place of the points, mice tapped meanwhile or not: "Strike 1! That's a pet." The strip and
   the screen count them: "Pets tapped: 1 of 3", and before the game starts the strip says the
   rule: "Three pets and you're out." A mouse that
   hides, or a tap on an empty key, costs nothing. A key a mouse has just left (hidden or tapped)
   stays empty for half a second, so a tap a moment late never lands on a pet, and a tapped
   pet's key stays red, and empty, for 0.6 seconds.
4. *Knock It Off the Table*. The top row is the table, its right-hand key the edge, and Boo
   watches from the row below. A thing slides along the table to the edge, sits there for two
   steps, slides back and comes again. Press any dial (or tap the edge key, or the strip) while
   it is on the edge: knocked off, 10 points, and it falls and crashes. Press while it is not on
   the edge: a miss, and Boo's paw rests for a moment (0.4 seconds). A press while it rests is
   another miss and starts the rest again, so mashing knocks nothing off. A miss says so on the
   strip for a moment (a knock brings the points back sooner): "Too soon!" (before it reaches the
   edge, or on the edge while the paw still rests) or "Too late!" (on its way back, the paw resting
   or not). (A steady press about twice a second still clears the table without looking: §8.) Eight
   things in turn (a vase, a teacup, a teapot, a candle, a picture, a glass, a plant, a cake), a
   little faster after every knock. Knock all eight and you win.
5. *Yarn Catch*. Balls of yarn drop down the keys; Boo's basket sits on the bottom row. Turn any
   dial to slide it left (anticlockwise) or right (clockwise). A ball into the basket: 1 point, a
   gold one 3 (one in ten). Up to two fall at once, faster and more often as the game goes on.

**The numbers at the start** (all starting points):

| Game | At the start | At the fastest | Points |
|---|---|---|---|
| *Boo Chasing Her Tail* | one key every 0.7 s | 0.45 s (0.04 s quicker a fish) | 10 a fish; five fish 20 more, plus 1 for every whole 5 s left |
| *The Lazy Pointer* | Boo a key every 1 s | 0.45 s (0.1 s quicker every 15 s) | 1 for every 2 whole seconds; 20 for lasting to the end |
| *Whack-a-Mouse* | one pops up every 1.2 s, up for 1.6 s (gold 1.2 s); from 5 s in, one in four is a pet | every 0.7 s, up for 1.25 s (gold 1.2 s) | 1; gold 3; a pet nothing, and the third ends the game |
| *Knock It Off the Table* | one key every 0.35 s, two steps on the edge, back twice as fast; a miss rests the paw 0.4 s | 0.2 s (0.02 s quicker a knock) | 10 a knock |
| *Yarn Catch* | down one row every 0.65 s, a new ball every 1.6 s | 0.4 s, a new ball every 1 s | 1; gold 3 |

**The points do not match from game to game yet.** Each game pays on its own scale, so Boo's
winner leans on which games were picked more than on how well they were played. Pretend players
tried each game for two minutes (quick, typical and slow: about a third of a second, six tenths
and nine tenths to see something and press):

- *Boo Chasing Her Tail*: about 90 for anyone.
- *The Lazy Pointer*: about 30, 12 and 8, and more for a player who spins the dials fast.
- *Whack-a-Mouse*: about 113, 106 and 45 for a player who never taps a pet (156, 144 and 57
  before the pets: a quarter of what pops up is a pet now, so there are fewer mice, about 95 mice
  and 30 pets in two minutes for a player who taps every mouse). A player who takes one pet in 20
  for a mouse (Zimothy one in ten) is out in about one game in four, most often in the second
  minute; one in ten (Zimothy one in five), in seven games in ten. How often a guest really does is
  for your try to say.
- *Knock It Off the Table*: 80 at most (eight things, ten each), and a steady press without
  looking gets all eight (§8).
- *Yarn Catch*: about 110, 107 and 94.

Evening them out waits for your try on the real deck: a note from the Game test tab says which
games feel stingy or generous.

---

## 5. A group's visit

1. **Who is playing.** Two or three first names, in the order they will play.
2. **Two tokens each.** Turns go round in that order: first, second, third, first, second,
   third.
3. **Your turn.** The screen and the strip say whose turn it is. Press a game (the same game
   twice is fine). The next screen gives its name and how to play; any key or dial starts it,
   and after 15 seconds it starts on its own. Back returns to the menu with the token still
   unspent. Then a 3, 2, 1, and the token is spent as the count starts.
4. **The game.** Two minutes, or 80 seconds each when three play, unless the round is running
   out (below). Then the points, for five seconds.
5. **The clue moment.** After a player's second game the screen shows their clue, with their
   name. In practice it is the house's square-bracket line, the one a rehearsal night shows:
   [Boo's bag clue about the Ghost appears here], with a dim note under it: "Practice: if the
   arcade goes on the night, your own clue about the Ghost shows here." After three seconds a
   press goes on (any key, a dial pressed in, or a tap on the strip; turning a dial does not).
   After a minute it goes on by itself.
6. **A trio's third player** gets no clue. After their second game Boo says, in your words,
   "Didn't I give you enough? Now be off! I'm done playing games." It goes on the way a clue
   does.
7. **The winner.** When every token is spent: the most points over each player's two games,
   just for fun, for ten seconds; after the first three, a press ends it. A tie names everyone
   who tied (a long line of names is set smaller, so it fits). A visit of one player skips it.
8. **Free play until the chime.** Anyone can play anything; nothing counts now.
9. **The chime.** Ten minutes after the visit starts (or at once, with Ring the chime beside the
   round clock), whatever is on stops, the chime plays, and Boo says "Be on your way." for eight
   seconds. If the chime caught anyone short, the screen names them, those still owed a clue
   first and a trio's third player apart: "Out of time before their clue: Margaret and Tom.
   Out of time before Boo's line: Ellie." Then free play starts afresh.

**The timing.** A pair plays four games of two minutes and a trio six of 80 seconds: eight
minutes of play either way, and the picking, the how-to-play screens, the counts, the points and
the clues come on top. So a game that would run into the chime is cut short: it ends 20 seconds
before the chime (five seconds for its points, then 15 kept for the clue), and is never cut
below 30 seconds (so the chime can still stop it). Free play is never cut, before the visit or
after it. The strip's clock shows the
shorter time from the start. A shorter game usually scores fewer points, which counts against
that player for Boo's winner. The two minutes are your words; the cut is the build's, a starting
point like the speeds.

Tried with pretend groups that pick only *Whack-a-Mouse* and *Yarn Catch* (the two games that
run their full time, unless three pets are tapped, so the slowest visits), 100 visits each. An
ordinary pace is 5 to 12 seconds to pick a game, 6 to 14 on how to play and 15 to 30 on a clue;
a slow one is 8 to 20 to pick, the how-to-play screen left to start by itself, and 20 to 60 on a
clue.

- A pair at an ordinary pace gets both clues every time, the second 15 seconds before the
  chime. (Before the cut, it lost the second clue 86 times in 100.)
- A slow pair loses the second clue about once in 25 visits. With the 30-second floor, its last
  clue can come only a few seconds before the chime.
- A trio at an ordinary pace gets both clues every time; a slow trio loses one about once in 20.
- A trio's third player met the chime before Boo's line in every one of these visits: Boo's line
  needs a brisk group, or games that end early.
- With only those two games, the chime also came before Boo's winner in every visit at an
  ordinary or a slow pace. With games picked at random (some end early), the winner came first
  in 38 visits of 40 for a pair and 33 of 40 for a trio.
- The practice clock starts when you press Start the visit. On the night the round's clock would
  start in the Parlour, so the walk to the Entryway would come off it. After a 45-second walk an
  ordinary pair or trio still gets both clues, but a slow pair loses the second about 4 times in
  5, and a slow trio loses one about half the time.

A game that ends early (a bite, five fish, a catch, all eight knocked off, three pets tapped) gives
its time back.

---

## 6. The sounds

Every sound is made in the browser from simple tones: no files. A coin when a game is picked, a tick
for each count and a go, a blip for a point (three notes for gold), a low two-note miss (a knock too
soon or too late, or a pet tapped), a knock (a swish and a thud), a bite, a short rising tune for a
win and a falling one for a loss (the third pet tapped plays only the falling one), three rising
notes when a clue appears, a tap for Back, and at the end the chime: the same four quick notes as
the brain's stand-in chime today. Boo makes no cat sounds: her words are on the screen. When a game
ends on a bite, the bite plays first and the falling tune straight after it; the last fish or the
last knock plays before the rising one.

They play from the Mac's sound output the moment they happen, so set it to the Mac's own
speakers: through a HomePod they come about two seconds late.

---

## 7. Rule 1 check

- Nothing in the arcade is sealed. The games are made up on the spot and mean nothing.
- On its own the page never signs in, never reads a night and never writes anything. The clue in
  practice is the square-bracket line, the same one a rehearsal night shows. You can play every
  part of it.
- Boo's lines in the arcade are in her own voice and carry no numbers, scores or rules, and
  nothing about the case: no motive, family, room, bag item, sense or clue word. They never echo her
  hint lines, her Parlour Game lines or her Catwalk verdicts. The plain words say what to do.
- The practice visit shows the PRACTICE band, so a square-bracket line is never mistaken for a
  clue.
- The pets in *Whack-a-Mouse* are only faces on the keys: no names and no words.

---

## 8. Not decided yet

- *entrywayGame*: does the Entryway play the arcade in Act 4, or keep *Boo's Catwalk*? Default:
  the Catwalk, as built. Only you answer it, on the board.
- *Boo's lost motive cross-off.* The Catwalk pays a wrong motive crossed off as well as Boo's bag
  clue about the Ghost; the arcade pays clues only. The card's note gives the second answer
  needed: "In Duplicate crosses off two, or accept that foggy nights (dial 1 and 2) end on one
  motive about 8 in 10 times."
- *The sounds on the night: the Mac's own speakers, or over AirPlay?* In Act 4 Susan's MacBook
  Pro plays Boo's music on the Parlour HomePod over AirPlay, which arrives about two seconds late
  (the wall starts the music two seconds early to make up for it). A game's blips cannot start
  early: over AirPlay they would land two seconds after the press, so they would need the Mac's
  own speakers.
- *A player the chime catches before their clue.* What they get on the night is not decided; it
  comes with *entrywayGame*. (Every other Act 4 room pays its reward at the chime anyway.) In
  practice the chime's screen names them.
- *The fish in Boo Chasing Her Tail.* Her treat is a fish (the game's key on the menu is a
  black cat since 29 October), and "fish-shaped" is one of the open bag clue words. On the night a
  guest might take the fish for a hint. Worth a look if the arcade goes on the night: another treat
  would do. (On the board: The arcade on the night, if entrywayGame picks it.)
- *Knock It Off the Table without looking.* The paw's rest stops mashing, but a steady press
  about twice a second, without looking, still knocks all eight off and scores the full 80. If
  that spoils it once you have tried it, a miss could cost a point or two. (On the same card.)
- *The pets in Whack-a-Mouse* (29 October). About one in four of what pops up is a pet, from
  five seconds in, and the third tapped ends the game. How often a guest really takes one for a
  mouse is for your try to say: Zimothy is the one to watch. If it feels too hard or too easy,
  how often they come, when they start and how long a tapped one stays red are quick changes;
  the three is your rule.

---

## 9. Trying it before the night

The Game test tab, section *Miss Boo LaRue's Arcade*: free play and the practice visit (each with
a square code), and three samples (a player's clue, a trio's third player, the chime). It works,
and a note to Claude Code, as for every game.

What is checked: the tests G54, G55, G56 and L09 (`docs/test-plan.md`), on the games, the
visit, the pictures and the sounds, without a screen or a Stream Deck. Nothing has been tried on
the real Stream Deck + XL yet: its keys, dials and strip in Chrome, and how fast each game feels.
That is your first try.

---

## For Claude Code (technical)

**Not on the night.** Built standalone on 28 Oct 2026. Do not wire it into Act 4 before Jon
answers *entrywayGame* (and its second answer on Boo's cross-off). Boo's Catwalk stays on the
night and on its own Game test section, untouched.

**The route.** `play/src/main.jsx` sends `?kiosk=boo&play=1` to `BooArcade`
(`play/src/screens/Arcade.jsx`) before `Practising` and the kiosks, keeping the substring
`Practising ? <Practising /> : kiosk ? <Kiosk which={kiosk} />` that `play/test/gametest.test.mjs`
pins. It never goes through `Kiosk.jsx`: no anonymous sign-in, no presence row, no night reads, no
Bell. `?kiosk=boo` alone is still Boo's wall, and `?kiosk=boo&practice=1` the Catwalk's practice
show. `&visit=1` opens the practice visit's setup form; `names=Jon,Susan[,Ellie]` starts a visit
straight away.

**The files.**
- `play/src/lib/arcade.js`: pure (no React, no DOM, no Firebase), node-tested. The constants
  (`COLS` 9, `ROWS` 4, `KEY_COUNT` 36, `DIALS` 6, `LEFT_DIALS` [0, 1, 2] left and right,
  `RIGHT_DIALS` [3, 4, 5] up and down, `MENU_KEYS` [11..15], `BACK_KEY` 27, `TOKENS` 2,
  `ROUND_MS` 600000, `FREE_GAME_MS` 120000, `GAME_MS` 120000 and `TRIO_GAME_MS` 80000 through
  `gameLengthMs(players)`, and for the cut near the chime `CLUE_KEEP_MS` 15000 and `CUT_MIN_MS`
  30000), the seeded random (`nextRand`, mulberry32), the five engines (`newGame`, `stepGame`,
  `inputGame`, `gameFaces`), the visit machine (`newArcade`, `arcadeStep`, `arcadeInput`,
  `arcadeChime`), the view (`arcadeView`: 36 face ids, the strip, the screen words, a `sig`;
  on the menu and the winner's screen the top row is `marquee()`, `paw` and `paw-lit` by
  `(|col - 4| + step) % 3 === 0` with step `floor((now - stageAt) / MARQUEE_STEP_MS)`, 250, so
  the sig changes four times a second there and the deck writes about five keys a step), the
  samples (`arcadeSample`), `FACE_IDS`, `STAND_IN_CLUE`, `CLUE_NOTE`, `THIRD_LINE`,
  `FAREWELL_LINE`. *Whack-a-Mouse*'s pets (29 Oct): `PETS` (boo, granola, irwin, salem, zimmy),
  `MICE_PETS_FROM_MS` 5000, `MICE_PET_ONE_IN` 4, `MICE_PETS_OUT` 3, `MICE_OOPS_MS` 600; the game
  keeps `pets`, `oops` and `petTaps`, its faces are `pet:<id>` and `oops:<id>`, and while it
  plays the strip's left field and the view's `screen.tally` say "Pets tapped: N of 3"
  (`tallyOf`); the third ends it with 'lose' (`LOSE_WORDS.mice`, and `BOO_LINES.pets` through
  `LOSE_LINES`). `MICE_REST_MS` 500: a mouse that hides or is tapped leaves its key in `rests`,
  busy for a spawn like `bonks` and `oops` (a pet that hides leaves none). The strike words (29
  Oct): a game's `said` (`{ words, until }`, null from `newGame`) is set for `STRIKE_WORDS_MS` 1500
  by a pet tapped ("Strike N! That's a pet.") and by a knock miss ('Too late!' while the phase is
  'left', otherwise 'Too soon!'), and cleared only by a knock (a mouse tapped leaves them up: the
  screen shows the points); the strip's centre in play is `saidOf(g, now) ?? pointsOf(score)`, so
  the view's `sig` repaints it. `GAMES` entries may carry `rule` (only *Whack-a-Mouse*'s), the
  strip's right field on ready and the count (`ruleOf`). The result's strip is
  `{ left: name, centre: outcomeOf(g), right: points }`; `outcomeOf` (`WIN_WORDS`, `LOSE_WORDS`,
  else "Time's up.") also opens `resultLine`. Every call returns a new, JSON-safe object; `events`
  lists the sounds that call made; `now` is one monotonic clock (`performance.now()` on the page).
  `lengthFor(s, t)` is the one rule for a game's length: `FREE_GAME_MS` in free play (a visit's
  too), otherwise
  `min(gameLengthMs, max(CUT_MIN_MS, roundEndsAt - t - RESULT_MS - CLUE_KEEP_MS))`. `gameAt`
  builds both the ready screen's board and the game with it, and before play the view's
  `timeLeftMs` is the length the game gets if it starts now. At the chime `ring()` sets
  `thirdPending` by place (`players[2]` of three, never by name), and the farewell's `plain` is
  two sentences: "Out of time before their clue: ..." and "Out of time before Boo's line: ...".
- `play/src/lib/arcadeArt.js`: browser. Draws every face and the strip on a canvas in the house
  look (`station/keys/make.html`'s ground, rim and serif text, scaled by size / 72), colour
  emoji for the pictures, the five face pictures (`PET_FILES`, `play/public/household/faces/`:
  Boo's for her own keys, all five for the pets); caches RGBA buffers for the deck and data URLs
  for the screen. `ART_FACES` is made from its own drawing tables (`FACES`, the count's 3, 2, 1,
  `MENU`, `SCENES`, `PETS_DRAWN`), so it never names a face with no drawing. Each face picture
  waits for its load event, never `decode()` (which waits for a drawn frame, and a tab opened
  behind another draws none), for at most six seconds; one that comes later is never used, so
  its keys keep their stand-in until a reload (the drawn cat for Boo, 🐕 for Sir Irwin, a whole
  dog because a dog's face looks too like the mouse's, 🐱 for the other cats) and the keys
  always match. Boo's face loads with `fetchPriority` 'high', the other four 'low', and the
  page asks for Boo's screen pictures only once `loadArt()` is done, so nothing holds up the
  faces. A pet is fitted by its sticker's box in its picture (`PET_BOXES`, measured 29 Oct where
  the picture's alpha is over 100, so faint whiskers do not count), so the five look the same
  size. G54 reads each face picture's box from its PNG the same way, so a new face picture fails
  until `PET_BOXES` is measured again (`play/public/household/README.md` tells Jon).
  `MENU.tail` is `['cat', 'Tail']` (`PICTURE.cat` 🐈‍⬛, drawn once in a faint parchment glow,
  0.35 and a blur of 2 units, Jon's "less noticeable"); the fish stays the game's treat.
  `MENU.knock` is `['swipe', 'Knock']` (🐾, no glow: a glow blurs its grey prints); the vase
  stays on the table. The top row's faces are `paw` (flat dim brass) and `paw-lit` (bright
  brass in a warm glow), both `pawPrint` (four toes over a pad); the star face is gone (`star()`
  stays for the coin). The page's `artReady` is a count, one more each time `loadArt()`
  settles, so the screen draws its faces again: a Vite hot update makes a new art module with no
  pictures, Fast Refresh runs the effect again, and with a plain true nothing re-rendered, so
  Boo's key kept the drawn cat (Jon's tab on 29 Oct).
- `play/src/lib/arcadeDeck.js`: browser. WebHID through `@elgato-stream-deck/webhid` 7.8.0
  (exact pin in `play/package.json`), loaded with `await import()` so it is its own chunk.
  `deckSupported`, `reopenDeck`, `chooseDeck`, `deckEvents`, `deckPainter`, `watchPlugs`, and
  `deckProblem` (tab, busy, gone or other, for the page's words). One arcade tab holds the deck
  at a time: a Web Lock named `arcade-deck`, claimed once inside the shared open (`openFirst`, so
  StrictMode's second run shares it) and held while the deck is open. The page's open on load
  (`reopenDeck({ steal: true })`) and Connect (`chooseDeck({ steal: true })`) take it from
  another tab; a replug (`reopenDeck()`) asks only if it is free (`ifAvailable`), and gives null
  with `deckProblem()` 'tab' when another tab has it. The tab it is taken from lets go without
  blanking it (its painter stops, `close()` never clears) and tells the page once, which shows
  "The Stream Deck went to another arcade tab. Press Connect to bring it back here." `letGo`
  releases the lock after `deck.close()` and waits for it, so the tab's next open is never
  refused by its own lock. With no `navigator.locks` it opens as before; `locks` is injectable
  like `hid` and `load`. Its own tests, with no Stream Deck, are `play/test/arcadeDeck.test.mjs`
  (the events, the painter, reopening, the plugs, and the tab lock: two copies of the module
  sharing a fake `navigator.locks`).
- `play/src/lib/arcadeSound.js`: browser. `sfx(ctx, name)` on the context from `wakeAudio()`
  (`Kiosk.jsx`); never a second AudioContext. A win or a loss starts when the sound still playing
  ends (a WeakMap of end times per context), so a bite plays before the lose tune and the last
  fish or knock before the win tune; every other sound starts at once.
- `play/src/screens/Arcade.jsx`: the page (default export `BooArcade({ sample })`): one 50 ms
  loop in a ref, the deck, the on-screen deck, the screen, the sounds, the setup form, `<Wake />`,
  and `<RehearsalBand on label="PRACTICE" />` in a visit. Beside the points, *Whack-a-Mouse*'s
  pets tapped (`.arcade-tally`, on a line of its own). A replug that cannot open the deck says
  why on the bottom line (`deckProblem()`, or the line it had). A winner's names line over 28
  characters gets the class `long` (smaller names, a smaller Boo), and the winner and clue
  moments scroll rather than clip in a small window.
- `play/src/Preview.jsx`: `?preview=kiosk-arcade` (free play's menu), `kiosk-arcade-play` (a
  game running), `kiosk-arcade-clue`, `kiosk-arcade-third` and `kiosk-arcade-farewell`, each
  `<BooArcade sample="..." />`: a frozen snapshot, with no loop, input, deck or sound. The Game
  test section links the last three.
- `play/src/styles.css`: the `.arcade-*` rules at the end. `play/test/arcade.test.mjs`: the
  checks below.
- The workshop: `app/src/lib/gameTest.js` section `arcade` after `boo` (moment `act4.entryway`,
  devices `deck` and `projector`, its tries never `night`), and `app/src/lib/devices.js` Spares
  `arcadeplay` (kiosk `boo`, query `play=1`, so `byKiosk('boo')` stays Susan's MacBook Pro all
  night). `app/src/pages/Status.jsx` lists it as built, and not tried on the real deck.

**The Stream Deck + XL** (checked in `@elgato-stream-deck/core` 7.8.0). USB vendor 0x0fd9,
product 0x00c6, model `plus-xl`; only that model is kept. Keys 0 to 35, `row * 9 + column`, row 0
on top, 112 x 112 px. The strip is one LCD segment, 1200 x 100; a tap is `lcdShortPress` with
`{ x, y }` (long press and swipe ignored). Six encoders, index 0 to 5: `rotate` with a signed
amount per report (a fast spin sends more than 1), and `down` with `control.type 'encoder'` for a
press, so a key's `down` is told apart by `control.type 'button'`. The library rotates and flips
the XL's images itself: hand it upright ones. A HID report is not a user gesture, so sound
unlocks only on a click. WebHID needs a secure context: the https site or `http://localhost`,
never the dev server's Wi-Fi address. The Elgato app must be quit. The study station never opens
the + XL (it opens only a fifteen-key deck, `isStudyDeck` in `station/lib/streamdeck.js`), so
the two decks can share a Mac.

**The paint budget.** Paint only the keys whose face changed, coalesced, through one write
queue; prepared buffers cached per key and face; the black `off` face through `fillKeyColor`; the
strip only when its picture changes, at most four times a second (the time bar in whole seconds).
Any write error stops painting and falls back to the screen, with Connect offered again.

**The stand-in.** `STAND_IN_CLUE` is `bagStandIn('boo', 4)` from `functions/lib/bagclues.js`,
copied as text (that file is Node) and kept equal by G56.

**The checks** (in `npm test`, not in `npm run checks`). `play/test/arcade.test.mjs`:
- G54: the menu on the second row, two blank keys each side; each of the five games seeded,
  ending at its time, and playing and scoring by its rules: the tail's fish rules over 300 seeds
  (never under her, right in front of her or under Back, and she eats a planted one), a gold
  mouse always up for less time than a plain one, and the knock's rest (a press while the paw
  rests is another miss and starts the rest again, the rest is under the cake's time on the
  edge, a press a little early then one on the edge still knocks it off, and a press every
  150 ms through a whole pass knocks nothing off), and the pets (none before five seconds,
  about one in four, all five, up as long as a plain mouse, at most one or two things up and one
  to a key; a tap scores nothing, plays the miss and shows `oops:` for `MICE_OOPS_MS`, nothing
  popping up on that key meanwhile; the third ends it with 'lose' and the points kept; the tally
  on the strip and the screen in this game only). Fairness, on a board with every key but one
  busy: a key a mouse left (hidden or tapped) takes nothing for `MICE_REST_MS`, a tapped pet's
  key stays `oops:` and empty for `MICE_OOPS_MS`, a key a pet left is free at once, and a pet
  is up within 10 ms of a plain mouse's time at that moment. The strike words: "Strike 1!" and
  "Strike 2! That's a pet." on the strip for `STRIKE_WORDS_MS` and then the points, a mouse
  tapped meanwhile leaving them up; "Too soon!" on the way to the edge and on the edge while the
  paw rests (its own words, not the press before), "Too late!" on the way back and again while
  the paw rests there, a knock bringing the points back at once and a press while it falls
  saying nothing; the rule on the ready and count strips of *Whack-a-Mouse* only; the result's
  strip for the third pet, tapped while the second's words still show, and "Time's up." when the
  time runs out while a miss's words show. Every state after a pet tapped is plain JSON. Every
  face a game shows is in `FACE_IDS`, always 36. The top row: the first four steps exactly, the
  two sides mirrored, round again every third step, Boo always in the middle, each paw lit one
  step in three, nothing else on the menu moving, a visit's menu starting its lights when it
  opens, and the winner's nine paws.
- G55: the visit: turns round the group, two tokens each, the clue after a player's second game
  for the first two and `THIRD_LINE` for a trio's third, the winner and ties, free play after the
  visit recording nothing, the chime ending everything from any moment, then free play. The cut
  near the chime: the rule to the second, the 30-second floor, free play never cut; a pair and a
  trio at an ordinary pace (`pacedVisit`) get their clues before the chime, a slow pair's last
  game gets the floor, and before play the screen's `timeLeftMs` is the length the game gets.
  The farewell's two sentences, told apart by place (two guests named Sam).
- G56: Boo's words and Jon's two lines: `STAND_IN_CLUE` against `bagclues.js`, `THIRD_LINE` and
  `FAREWELL_LINE` word for word, every word the arcade can show (the two farewell sentences, the
  strike words and the rule included) passing the phone's F09 check, the strike words and the
  rule found among what the views showed (not the word lists), the result's strip for every way
  a game ends, no em dash in the arcade's files.
- L09: the arcade reads no night and shows nothing sealed: `arcade.js`, `arcadeArt.js` and
  `arcadeSound.js` import nothing and `arcadeDeck.js` only `@elgato-stream-deck/webhid`, in its
  one `import(`; the page imports only its own files and three small things of the house's, holds
  no square-bracket line of its own, runs one loop at `TICK_MS` 50, and keeps a sample frozen
  (`const live = !sample`); the only clue is the stand-in (G56).

`play/test/arcadeMedia.test.mjs` (G54, in node with a fake canvas, picture and AudioContext):
every face drawn with none falling back to the art's "?", every sound played and reaching the
speakers, a win or lose tune starting once the bite, last fish or last knock has faded out, and
Boo's face picture on every Boo key in time (even with no frame drawn) and never used when late,
and each pet's picture on its keys, up and tapped, in time, while one that comes late (each of
the four in turn) keeps its stand-in all session (🐕 for Sir Irwin, 🐱 for the cats); Boo's face
asked for first (`fetchPriority`) and her screen pictures only inside `loadArt().then`; each
pet's `PET_BOXES` against the box read from its PNG (within 0.002); the Tail key on the menu
is the black cat, drawn once in a faint parchment glow (0.35 at most), over its name with no
glow, no fish, while the game's fish is still a fish; the Knock key is the paws with no glow
and no vase, the same paws as the game's swipe, while the vase is still on the table; the top
row's paws are drawn with no words, the lit one in a glow and the unlit one flat; and the page
counts each settle of `loadArt()` (`setArtReady(n => n + 1)`).
`play/test/arcadeDeck.test.mjs` (no ID) is the deck's code, above.

**What the night would need** (not built; after *entrywayGame*). `functions/lib/act4.js` (the
Entryway's room, `REWARD_LINES.entryway`, `payRoom`), a real Ghost bag clue for each player at
their own Boo affection (each guest or group gets one true word, so two can never be crossed to
pin a bag: `bagclues.js` and G46; the clues of one group's players should share the group's
word), and a road for it to the Mac's screen that is not a public doc (public docs
never carry a clue word; `docs/cat-info.md` puts a cat's words on phones, never a room screen,
which Jon's "We can do the clue of SKMBP" changes for this room). Then the phones, the checks that
lean on Boo's cross-off (G32, G48, G51), the fake night, and the Entryway's names: the five-name
pin in `functions/test/game-names.test.mjs` (`seed/game-names.json`), `ACT4_ROOMS` in
`app/src/lib/timeline.js` and `act4.rooms.entryway` in `seed/night.json`.
